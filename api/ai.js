import dotenv from 'dotenv';
import {
  extractToken,
  getRedis,
  authenticateCaller,
  getAdminConfig,
  checkRateLimit,
  signQuest,
  signReward
} from './sync.js';
dotenv.config();

const BASE_URL = (process.env.CUSTOM_AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
const API_KEY = process.env.CUSTOM_AI_API_KEY || '';
const MODEL = process.env.CUSTOM_AI_MODEL || process.env.MODEL_WORKER || 'gpt-4o-mini';

// Helper to call OpenAI-compatible completion with JSON output
async function callAI(systemPrompt, userPrompt, temperature = 0.3, imageBase64 = null) {
  if (!API_KEY) {
    throw new Error('CUSTOM_AI_API_KEY is not configured');
  }

  const userContent = imageBase64 ? [
    { type: 'text', text: userPrompt },
    { type: 'image_url', image_url: { url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}` } }
  ] : userPrompt;

  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      temperature,
      stream: false
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`AI Gateway Error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content || '';

  // Extract JSON if model wraps it in markdown codeblocks
  let cleaned = rawContent.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```\s*$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/i, '').replace(/```\s*$/, '');
  }

  // Normalize strings recursively to Unicode NFC (precomposed)
  function normalizeNFC(val) {
    if (typeof val === 'string') return val.normalize('NFC');
    if (Array.isArray(val)) return val.map(normalizeNFC);
    if (val !== null && typeof val === 'object') {
      const res = {};
      for (const [k, v] of Object.entries(val)) {
        res[k] = normalizeNFC(v);
      }
      return res;
    }
    return val;
  }

  try {
    const parsed = JSON.parse(cleaned);
    return normalizeNFC(parsed);
  } catch (e) {
    // If parsing fails, attempt regex extraction of JSON object
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      return normalizeNFC(JSON.parse(match[0]));
    }
    throw new Error(`Invalid JSON from AI: ${rawContent}`);
  }
}

// Helper to calculate rank matching appState
export function calculateRank(coins) {
  if (coins >= 40) return 'S';
  if (coins >= 25) return 'A';
  if (coins >= 18) return 'B';
  if (coins >= 12) return 'C';
  if (coins >= 6) return 'D';
  return 'E';
}

// ponytail: clamp input strings to prevent prompt stuffing / token drain DoS
function clampStr(str, max = 500) {
  return typeof str === 'string' ? str.trim().slice(0, max) : '';
}

// ponytail: native stdlib accent stripper for robust regex matching across dialects and accentless inputs
function stripDiacritics(str) {
  if (!str) return '';
  return str.normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, d => d === 'đ' ? 'd' : 'D')
    .toLowerCase();
}

// Robust boolean parser for AI responses (handles booleans, strings "true"/"false", numbers)
export function parseBool(val, defaultVal = false) {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') {
    const s = val.trim().toLowerCase();
    if (s === 'true' || s === '1' || s === 'yes') return true;
    if (s === 'false' || s === '0' || s === 'no') return false;
  }
  if (typeof val === 'number') return val !== 0;
  return defaultVal;
}

// Fallback categorizer for unit test mock payloads lacking LLM semantic category
// ponytail: fallback heuristic only; live AI responses supply result.category directly from LLM
function resolveCategory(origTitle, title, origDesc, desc) {
  const raw = `${origTitle} ${title} ${origDesc} ${desc}`.toLowerCase();
  const text = `${raw} ${stripDiacritics(raw)}`;
  if (/(đánh|danh)\s*(răng|rang)|(rửa|rua)\s*(mặt|mat)|đi\s*tắm|di\s*tam|tắm\s*rửa|tam\s*rua|tắm\s*gội|tam\s*goi|\btắm\b|(uống|uong)\s*(nước|nuoc)|hít\s*thở|hit\s*tho|(gấp|gap)\s*(chăn|chan)|(mặc|mac)\s*(quần\s*áo|quan\s*ao)|ve\s*sinh\s*ca\s*nhan/i.test(text)) return 'trivial';
  if (/(rửa|rua)\s*(bát|bat|chén|chen|đĩa|dia)|(quét|quet)\s*(nhà|nha)|(đổ|do)\s*(rác|rac)|(lau|dọn|don)\s*(bàn|ban|nhà|nha|sàn|san|phòng|phong|dẹp|dep)/i.test(text)) return 'chore';
  if (/học|hoc|đọc|doc|sách|sach|chương|chuong|ôn\s*thi|on\s*thi|bài\s*tập|bai\s*tap|nghiên\s*cứu|nghien\s*cuu|code|lập\s*trình|lap\s*trinh|kinh\s*tế|kinh\s*te/i.test(text)) return 'study';
  return 'general';
}

// Programmatic Arbiter Sanitizer: Enforces chunking on overloaded tasks even if LLM has title inertia
export function sanitizeEvaluatedQuest(result, originalTitle = '', originalDesc = '') {
  if (!result || typeof result !== 'object') return result;

  const normOrig = (originalTitle || '').trim();
  let title = (result.title || normOrig || '').trim();
  let description = (result.description || originalDesc || '').trim();
  let targetMinutes = parseInt(result.targetMinutes, 10);
  if (isNaN(targetMinutes) || targetMinutes < 0) targetMinutes = result.type === 'focus' ? 25 : 0;
  let rewardCoins = parseInt(result.rewardCoins, 10);
  if (isNaN(rewardCoins) || rewardCoins <= 0) rewardCoins = 10;
  let type = result.type === 'bounty' ? 'bounty' : 'focus';
  let isModified = Boolean(result.isModified) || Boolean(result.isOverloaded);
  let modificationReason = (result.modificationReason || '').trim();
  let verdict = (result.verdict || '').trim();

  // Composite search text for multi-chapter / workload context
  const fullMatchRaw = `${normOrig} ${title} ${originalDesc} ${description}`.toLowerCase();
  const fullMatchText = `${fullMatchRaw} ${stripDiacritics(fullMatchRaw)}`;

  // Semantic category classification (AI-first, deterministic clamping in code)
  const category = (result.category || '').toLowerCase() || resolveCategory(normOrig, title, originalDesc, description);
  const isStudyOrWork = category === 'study' || category === 'work';
  const isTrivialTask = category === 'trivial';
  const isQuickChore = category === 'chore';

  // 1. Trivial personal habits: capped at 2 coins, 0 minutes
  if (isTrivialTask) {
    targetMinutes = 0;
    rewardCoins = Math.min(rewardCoins, 2);
    type = 'bounty';
    isModified = true;
    modificationReason = 'Thói quen sinh hoạt cơ bản, AI áp dụng mức thưởng tượng trưng 1-2 Vàng.';
    verdict = 'Thói quen sinh hoạt cơ bản hàng ngày, áp dụng mức thưởng tượng trưng 1-2 Vàng.';
  }

  // 2. Quick household chores: capped at 5 coins, 0 minutes
  if (isQuickChore && (targetMinutes > 15 || rewardCoins > 5 || type === 'focus')) {
    targetMinutes = 0;
    rewardCoins = Math.min(rewardCoins, 5);
    type = 'bounty';
    isModified = true;
    modificationReason = 'Việc dọn dẹp thường ngày là việc nhanh gọn, AI chuyển sang việc Hoàn thành ngay với mức thưởng 3-5 Vàng chuẩn.';
    verdict = 'Việc dọn dẹp nhanh gọn, chuyển sang Hoàn thành ngay với mức thưởng 3-5 Vàng chuẩn.';
  }

  // Pattern detection for overloaded multi-chapter or crammed requests (strictly for study/work)
  const hasMultiChapterInOrig = isStudyOrWork && /(\b([2-9]|\d{2,})\s*(chương|chuong|chap|bài|bai|đề|de)\b|(toàn\s*bộ|toan\s*bo|hết|het|tất\s*cả|tat\s*ca|cả\s*cuốn|ca\s*cuon|nguyên\s*cuốn)\s*(sách|sach|chương|chuong|giáo\s*trình|giao\s*trinh|đề\s*cương|de\s*cuong))/i.test(fullMatchText);
  const hasMultiChapterInTitle = isStudyOrWork && /(\b([2-9]|\d{2,})\s*(chương|chuong|chap|bài|bai|đề|de)\b|(toàn\s*bộ|toan\s*bo|hết|het|tất\s*cả|tat\s*ca|cả\s*cuốn|ca\s*cuon|nguyên\s*cuốn)\s*(sách|sach|chương|chuong|giáo\s*trình|giao\s*trinh|đề\s*cương|de\s*cuong))/i.test(`${title} ${stripDiacritics(title)}`);
  const mentionsOverload = isStudyOrWork && /nhồi nhét|nhoi nhet|ảo tưởng|ao tuong|chia nhỏ|chia nho|quá tải|qua tai|lạm phát|lam phat|tẩu hỏa|tau hoa|phi thực tế|phi thuc te|bất khả thi|bat kha thi|không thể xong|khong the xong|quá nhiều|qua nhieu/i.test(
    `${verdict} ${modificationReason} ${result.chunkingPlan || ''} ${stripDiacritics(verdict + ' ' + modificationReason)}`
  );
  // ponytail: only chunk into Chapter 1 if input is actually a multi-chapter study task; upgrade if supporting other curriculum formats
  const isCrammedStudy = isStudyOrWork && (hasMultiChapterInOrig || hasMultiChapterInTitle || Boolean(result.isOverloaded) || mentionsOverload);

  if (isCrammedStudy) {
    // If title still has multi-chapter wording or is identical to original crammed title
    if (hasMultiChapterInTitle || title.toLowerCase() === normOrig.toLowerCase()) {
      isModified = true;
      let subject = normOrig
        .replace(/đọc\s+(hết\s+)?(toàn\s+bộ\s+)?([2-9]|\d{2,})\s*chương\s*(môn\s*|sách\s*|giáo trình\s*)?/i, '')
        .replace(/học\s+(hết\s+)?(toàn\s+bộ\s+)?([2-9]|\d{2,})\s*chương\s*(môn\s*|sách\s*|giáo trình\s*)?/i, '')
        .replace(/^môn\s+/i, '')
        .replace(/\s*(để\s+)?(chuẩn\s+bị\s+cho\s+k[ìi]\s+thi|ôn\s+thi).*$/i, '')
        .trim();
      if (!subject) subject = 'môn học';

      title = `Đọc kỹ & tóm tắt Chương 1 môn ${subject}`.replace(/\s+/g, ' ').trim();
      description = `Tập trung đọc sâu nội dung trọng tâm của Chương 1, ghi chú định nghĩa cốt lõi và tóm tắt kiến thức bằng sơ đồ tư duy.`;
      if (!modificationReason) {
        modificationReason = 'Khối lượng nhiều chương trong một lần là quá tải; AI đã chia nhỏ thành phiên học Chương 1 chất lượng cao.';
      }
      if (/tự chia nhỏ/i.test(verdict) || /giáng xuống.*90 phút/i.test(verdict)) {
        verdict = 'Nhiệm vụ nhiều chương đã được chia nhỏ thành phiên học Chương 1 (50 phút, 25 Vàng).';
      }
    }

    type = 'focus';
    targetMinutes = targetMinutes > 0 ? Math.min(50, Math.max(25, targetMinutes)) : 50;
    rewardCoins = rewardCoins > 0 ? Math.min(25, Math.max(15, rewardCoins)) : 20;
  }

  // Double check isModified flag
  if (!isModified && title.toLowerCase() !== normOrig.toLowerCase()) {
    isModified = true;
    if (!modificationReason) {
      modificationReason = 'AI đã điều chỉnh tên và mô tả để mục tiêu rõ ràng và khả thi hơn.';
    }
  }

  // ponytail: enforce hard economic boundaries against prompt injection / jailbreak
  if (type === 'bounty') {
    targetMinutes = 0;
    rewardCoins = Math.min(rewardCoins, 10);
  } else {
    targetMinutes = Math.max(15, Math.min(180, targetMinutes));
    const maxCoinsByTime = targetMinutes <= 25 ? 15 : (targetMinutes <= 50 ? 25 : 40);
    rewardCoins = Math.max(1, Math.min(maxCoinsByTime, rewardCoins));
  }

  let requiresProof = parseBool(result.requiresProof, false);
  let proofGuidance = typeof result.proofGuidance === 'string' ? result.proofGuidance.trim() : '';

  const isIntangible = /\b(đi\s*ngủ|di\s*ngu|ngủ\s*đủ|ngu\s*du|thiền|thien\s*dinh|nghe\s*podcast|nghe\s*nhạc|nghe\s*nhac|nhịn\s*ăn|nhin\s*an)\b/i.test(fullMatchText);

  // Programmatic Arbiter: High-value tasks (>= 15 coins / Rank B, A, S) or deep focus sessions (>= 25m) with tangible physical output MUST require proof unless specifically negotiated or intangible
  const isHighValueOrDeepWork = rewardCoins >= 15 || (type === 'focus' && targetMinutes >= 25);
  if (!isTrivialTask && !isIntangible && (isHighValueOrDeepWork || isCrammedStudy)) {
    if (!result.isNegotiated) {
      requiresProof = true;
    }
    if (requiresProof && !proofGuidance) {
      if (isStudyOrWork || isCrammedStudy) {
        proofGuidance = 'Chụp ảnh trang vở ghi chép, sách hoặc sơ đồ tóm tắt kiến thức.';
      } else {
        proofGuidance = 'Chụp ảnh kết quả thực tế sau khi bạn hoàn thành nhiệm vụ.';
      }
    }
  }

  if (isTrivialTask) {
    requiresProof = false;
    proofGuidance = '';
  }

  if (requiresProof && !proofGuidance) {
    proofGuidance = 'Chụp ảnh kết quả thực tế sau khi bạn hoàn thành nhiệm vụ.';
  }
  if (!requiresProof) {
    proofGuidance = '';
  }

  return {
    ...result,
    title,
    description,
    category,
    type,
    targetMinutes,
    rewardCoins,
    rank: calculateRank(rewardCoins),
    requiresProof,
    proofGuidance,
    verdict,
    isModified,
    modificationReason
  };
}

// ponytail: extract duration in minutes from text expressions like "30 phút", "1 tiếng", "45p", "2h", "nửa tiếng"
export function extractDurationFromText(text) {
  if (!text || typeof text !== 'string') return 0;
  const t = text.toLowerCase();
  if (/\b(nửa\s*tiếng|nửa\s*giờ)\b/i.test(t)) return 30;
  const compoundMatch = t.match(/(\d+)\s*(?:tiếng|giờ|h)\s*(\d+)\s*(?:phút|p)?\b/i);
  if (compoundMatch) return parseInt(compoundMatch[1], 10) * 60 + parseInt(compoundMatch[2], 10);
  const halfHourMatch = t.match(/(\d+)\s*(?:tiếng|giờ)\s*rưỡi\b/i);
  if (halfHourMatch) return parseInt(halfHourMatch[1], 10) * 60 + 30;
  const hourMatch = t.match(/(\d+)\s*(tiếng|giờ|hour|h)\b/i);
  if (hourMatch) return parseInt(hourMatch[1], 10) * 60;
  const minMatch = t.match(/(\d+)\s*(phút|min|p)\b/i);
  if (minMatch) return parseInt(minMatch[1], 10);
  return 0;
}

// ponytail: parse alternative options from text like "- Phương án 1: ...", "- Cách 2: ..." for interactive buttons
export function parseDebateOptionsFromText(text, type = 'reward') {
  if (!text || typeof text !== 'string') return [];
  const lines = text.split('\n');
  const rawOptions = [];
  let current = null;

  const keywordRegex = /^\s*(?:[-*•]|\d+[.)])?\s*(Phương\s*án|Phương\s*thức|Cách|Gợi\s*ý|Lựa\s*chọn|Giải\s*pháp|Hướng|Option|Opt|PA)\s*([1-9]|A|B|C|Một|Hai|Ba)[:.-]?\s*(.*)$/i;
  const numberRegex = /^\s*[-*•]?\s*([1-9])[:.)]\s+(.*)$/i;

  for (const line of lines) {
    const kwMatch = line.match(keywordRegex);
    const numMatch = !kwMatch ? line.match(numberRegex) : null;
    const match = kwMatch || numMatch;

    if (match) {
      if (current) rawOptions.push(current);
      const prefix = kwMatch ? kwMatch[1].trim() : 'Phương án';
      const id = kwMatch ? kwMatch[2] : numMatch[1];
      const rest = (kwMatch ? kwMatch[3] : numMatch[2]).trim();
      current = {
        id,
        title: `${prefix} ${id}`,
        text: rest
      };
    } else if (!line.trim()) {
      if (current) {
        rawOptions.push(current);
        current = null;
      }
    } else if (current && !line.match(/^\s*[-*•]/)) {
      current.text += ' ' + line.trim();
    } else if (current && line.match(/^\s*[-*•]/)) {
      rawOptions.push(current);
      current = null;
    }
  }
  if (current) rawOptions.push(current);

  return rawOptions.map(opt => {
    let mins = 0;
    if (type === 'reward' && /(?:nhiệm\s*vụ|làm\s*(?:thêm|nốt)).*?\d+\s*phút/i.test(opt.text)) {
      const rewardDurMatch = opt.text.match(/(?:đổi|thời\s*(?:lượng|gian)|xem|chơi|thành).*?(\d+)\s*phút/i);
      if (rewardDurMatch) {
        mins = parseInt(rewardDurMatch[1], 10);
      } else if (/nửa\s*(?:tiếng|giờ)/i.test(opt.text)) {
        mins = 30;
      }
    } else {
      mins = extractDurationFromText(opt.text);
    }

    let gold = undefined;
    const explicitPriceMatch = opt.text.match(/(?:mức\s*giá|giá(?:\s*vàng)?|giảm\s*(?:còn|xuống)|đổi\s*(?:ngay\s*)?(?:với\s*)?(?:mức\s*)?giá)[:\s]*(\d+)\s*vàng/i);
    if (explicitPriceMatch) {
      gold = parseInt(explicitPriceMatch[1], 10);
    } else if (type === 'quest') {
      const questCoinMatch = opt.text.match(/(?:thưởng|mức\s*thưởng|nâng\s*lên|tăng\s*lên|giảm\s*xuống)[:\s]*(\d+)\s*vàng/i) || opt.text.match(/(\d+)\s*vàng/i);
      if (questCoinMatch) gold = parseInt(questCoinMatch[1], 10);
    } else if (!/(?:tích\s*lũy|có\s*sẵn|thêm\s*\d+\s*vàng|làm\s*nốt|làm\s*thêm)/i.test(opt.text)) {
      const genericGoldMatch = opt.text.match(/(\d+)\s*vàng/i);
      if (genericGoldMatch) gold = parseInt(genericGoldMatch[1], 10);
    }

    let newName = undefined;
    const nameMatch = opt.text.match(/(?:thành|tên\s*(?:mới\s*)?(?:là)?)\s*["“]?([^"”\n,.]+?)["”]?\s*(?:nha|nhé|nè|\.|$)/i);
    if (nameMatch) {
      const candidate = nameMatch[1].trim();
      if (candidate.length >= 3 && !/^\s*\d+\s*(?:vàng|phút|tiếng|giờ|min|p)\s*$/i.test(candidate) && !/^\s*mức\s*giá/i.test(candidate)) {
        newName = candidate;
      }
    }

    let label = opt.title;
    const details = [];
    if (mins > 0) details.push(`${mins} phút`);
    if (gold !== undefined) details.push(`${gold} Vàng`);
    if (details.length > 0) {
      label += ` (${details.join(' • ')})`;
    } else if (opt.text.length < 40) {
      label += `: ${opt.text}`;
    }

    let argument = `Chốt ${opt.title.toLowerCase()}`;
    if (details.length > 0) {
      argument += `: ${details.join(', ')}`;
    }

    const payload = {};
    if (type === 'reward') {
      if (gold !== undefined) payload.newPrice = gold;
      if (mins > 0) payload.newTargetMinutes = mins;
      if (gold !== undefined && gold < 30) payload.newTier = 'common';
      if (newName) payload.newName = newName;
    } else {
      if (gold !== undefined) payload.newRewardCoins = gold;
      if (mins > 0) payload.newTargetMinutes = mins;
      if (newName) payload.newTitle = newName;
    }

    return {
      id: opt.id,
      label,
      argument,
      text: opt.text,
      ...payload
    };
  });
}

// Fallback categorizer for reward unit test mock payloads lacking LLM semantic category
// ponytail: fallback heuristic only; live AI responses supply result.category directly from LLM
function resolveRewardCategory(origName, name, origDesc, desc) {
  const raw = `${origName} ${name} ${origDesc} ${desc}`.toLowerCase();
  const text = `${raw} ${stripDiacritics(raw)}`;
  if (/(say\s*x[ỉi]n|u[ốo]ng.*(bia|r[ượ]u)|h[úu]t\s*thu[ốo]c|th[âa]u\s*[đd][êe]m|c[ờo]\s*b[ạa]c|c[áa]\s*[đd][ộo]|nh[ậa]u|\d+\s*(lon|chai)\s*(bia|r[ượ]u))/i.test(text)) return 'harmful';
  if (/(ch[ơo]i\s*game|l[ướ][ớo]t\s*(tiktok|facebook|fb|reels|shorts|m[ạa]ng|web)|xem\s*(phim|youtube|video|clip|anime|truy[eề]n)|netflix)/i.test(text)) return 'entertainment';
  return 'general';
}

// Programmatic Arbiter Sanitizer for Rewards
export function sanitizeEvaluatedReward(result, originalName = '', originalDesc = '') {
  if (!result || typeof result !== 'object') return result;

  const normOrig = (originalName || '').trim();
  let name = (result.name || normOrig || '').trim();
  let description = (result.description || originalDesc || '').trim();
  let price = parseInt(result.price, 10);
  if (isNaN(price) || price <= 0) price = 25;
  let isModified = Boolean(result.isModified);
  let modificationReason = (result.modificationReason || '').trim();
  let verdict = (result.verdict || '').trim();
  const isNegotiated = Boolean(result.isNegotiated);

  // Semantic category classification (AI-first, deterministic clamping in code)
  const category = (result.category || '').toLowerCase() || resolveRewardCategory(normOrig, name, originalDesc, description);
  const isHarmful = category === 'harmful';
  const isEntertainment = category === 'entertainment';

  if (isHarmful && (name.toLowerCase() === normOrig.toLowerCase() || /(say\s*x[ỉi]n|\d+\s*(lon|chai)\s*(bia|r[ượ]u))/i.test(name + ' ' + stripDiacritics(name)))) {
    name = 'Thưởng thức 1 ly đồ uống thư giãn cùng bạn bè';
    description = 'Tự thưởng thức đồ uống có chừng mực sau thời gian tập trung làm việc.';
    isModified = true;
    verdict = 'Phần thưởng được tinh chỉnh thành đồ uống lành mạnh để bảo vệ sức khỏe.';
    if (!modificationReason) {
      modificationReason = 'AI đã điều chỉnh phần thưởng để bảo vệ sức khỏe và duy trì năng lượng tích cực.';
    }
  }

  // Only clamp to 35 for entertainment during initial appraisal, NOT during debate negotiation
  if (isEntertainment && price < 35 && !isNegotiated) {
    price = 35;
    isModified = true;
    verdict = 'Định giá 35 Vàng cho hoạt động giải trí để đảm bảo nỗ lực tương xứng.';
    if (!modificationReason) {
      modificationReason = 'AI đã nâng giá món quà giải trí lên mức 35 Vàng để tương xứng với công sức bạn bỏ ra.';
    }
  }

  if (!isModified && name.toLowerCase() !== normOrig.toLowerCase()) {
    isModified = true;
    if (!modificationReason) {
      modificationReason = 'AI đã tối ưu lại phần thưởng để lành mạnh và công bằng hơn.';
    }
  }

  // Sanitize target enjoyment duration in minutes (0 means instant/no countdown, up to 360 mins)
  const textDuration = extractDurationFromText(`${normOrig} ${name} ${originalDesc} ${description}`);
  let targetMinutes = parseInt(result.targetMinutes, 10);
  if (isNaN(targetMinutes) || targetMinutes < 0) {
    targetMinutes = 0;
  }
  // If user mentioned duration in title/desc but AI returned 0 or didn't parse, prioritize text duration unless negotiated
  if (textDuration > 0 && (targetMinutes === 0 || !isNegotiated)) {
    targetMinutes = textDuration;
  } else if (targetMinutes === 0 && isEntertainment && !isNegotiated) {
    targetMinutes = 30; // default for entertainment activity without explicit duration
  }
  targetMinutes = Math.max(0, Math.min(360, targetMinutes));

  // Determine tier and enforce minimum price
  const validTiers = ['common', 'rare', 'epic', 'legendary'];
  let tier = validTiers.includes((result.tier || '').toLowerCase()) ? result.tier.toLowerCase() : 'common';

  // If negotiated, auto-calibrate tier to match price so tier floor doesn't override agreement
  if (isNegotiated) {
    if (price < 30) {
      tier = 'common';
    } else if (price < 70) {
      tier = 'rare';
    } else if (price < 250) {
      tier = 'epic';
    } else {
      tier = 'legendary';
    }
  }

  const tierMin = { common: 15, rare: 30, epic: 70, legendary: 250 };
  price = Math.max(tierMin[tier] || 15, Math.min(5000, price));

  // ponytail: strip HTML tags from icon to prevent stored XSS via AI output
  const icon = (result.icon || '🎁').replace(/<[^>]*>/g, '').trim().slice(0, 10) || '🎁';

  return {
    ...result,
    name,
    description,
    category,
    price,
    tier,
    targetMinutes,
    icon,
    isModified,
    modificationReason
  };
}

export default async function handler(req, res) {
  // Enable CORS
  if (typeof res?.setHeader === 'function') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const redis = getRedis();
  const token = extractToken(req);
  const adminConfig = getAdminConfig();

  // Xác thực tài khoản trước khi cho phép gọi AI Gateway
  const caller = await authenticateCaller(token, redis, adminConfig);
  if (!caller) {
    return res.status(401).json({ error: 'Cần đăng nhập tài khoản để sử dụng Trợ Lý AI.' });
  }

  // Giới hạn tần suất gọi AI (20 lượt / phút)
  const clientIp = req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  const rateLimitId = caller.sub ? `ai:user:${caller.sub}` : `ai:ip:${clientIp}`;
  const allowed = await checkRateLimit(redis, rateLimitId, 20, 60);
  if (!allowed) {
    return res.status(429).json({ error: 'Bạn đang gọi AI quá nhanh. Vui lòng chờ 1 phút trước khi tiếp tục.' });
  }

  try {
    const { action, payload } = req.body || {};

    if (!action) {
      return res.status(400).json({ error: 'Missing "action" in request body.' });
    }

    switch (action) {
      // ==========================================
      // 1. EVALUATE QUEST (Định giá nhiệm vụ)
      // ==========================================
      case 'evaluate_quest': {
        const title = clampStr(payload?.title, 150);
        const description = clampStr(payload?.description, 1000);
        const userEstimateCoins = parseInt(payload?.userEstimateCoins, 10) || 0;
        const currentRewards = Array.isArray(payload?.currentRewards) ? payload.currentRewards.slice(0, 5) : [];
        const userCoins = parseInt(payload?.userCoins, 10) || 0;
        if (!title) {
          return res.status(400).json({ error: 'Quest title is required.' });
        }

        const systemPrompt = `Bạn là Trọng Tài Năng Suất & Trợ Lý Giám Định của LevelUp.
Mục tiêu: Đảm bảo tính kỷ luật và công bằng cho hệ sinh thái RPG, ngăn chặn lạm phát điểm thưởng, ngăn chặn việc "farm" Vàng từ các việc vặt vãnh và hỗ trợ người dùng xây dựng thói quen tốt.
Văn phong: Khách quan, công tâm, CỰC KỲ SÚC TÍCH VÀ ĐI THẲNG VÀO TRỌNG TÂM. Không chào hỏi xã giao, không triết lý lê thê.

QUY TẮC THẨM ĐỊNH & PHÂN LOẠI KỶ LUẬT:
1. TRỪNG PHẠT VIỆC HIỂN NHIÊN / SINH HOẠT CÁ NHÂN (ANTI-TRIVIAL):
   - Tuyệt đối KHÔNG trả thưởng cao cho các hành vi sinh hoạt bình thường hiển nhiên (thở, uống nước, đánh răng, rửa mặt, thức dậy, gấp chăn, ăn cơm, mở máy tính...).
   - BẮT BUỘC: Ép về type = 'bounty', targetMinutes = 0, rewardCoins = 1 hoặc 2 Vàng tượng trưng, rank 'E'.
2. CHỐNG KHỐNG THỜI GIAN & VIỆC DỌN DẸP NHANH (ANTI-PADDING):
   - Việc nhà đơn giản (rửa bát/chén, quét nhà, đổ rác, lau bàn) chỉ mất 5-10 phút: BẮT BUỘC chọn type = 'bounty' (thưởng 3 - 5 Vàng, targetMinutes = 0). Giữ đúng tên việc nhà (tuyệt đối không biến thành việc học tập).
   - TUYỆT ĐỐI NGHIÊM CẤM duyệt 30-50 phút cho việc vặt dọn dẹp.
3. TIÊU CHUẨN TẬP TRUNG SÂU (DEEP WORK) CHO HỌC TẬP & KỸ NĂNG:
   - CHỈ các việc đòi hỏi tư duy trí óc cao độ (học tập, ôn thi, đọc sách chuyên ngành, lập trình, làm dự án) mới được cấp type = 'focus'.
   - Khung chuẩn chống lạm phát:
     * 25 phút Pomodoro = 8 - 10 Vàng.
     * 50 phút Pomodoro = 18 - 20 Vàng.
     * Tối đa 25 Vàng cho một phiên học tập chia nhỏ; tối đa 40 Vàng cho mục tiêu nghiên cứu lớn.
4. QUY TẮC BẮT BUỘC CHIA NHỎ NHIỆM VỤ QUÁ TẢI (NGHIÊM CẤM BẢO USER TỰ CHIA):
   - Đánh giá khả thi trong 1 phiên: Một người chỉ có thể tập trung học sâu 1 đơn vị công việc vừa sức (ví dụ: Đọc kỹ & tóm tắt 1 chương sách, làm 3-5 bài tập toán, học 15-20 từ vựng).
   - NHỒI NHÉT / QUÁ TẢI: Nếu người dùng ghi đọc nhiều chương (như "10 chương", "5 chương", "toàn bộ cuốn sách"), học hàng trăm từ, làm toàn bộ đề cương ôn thi:
     -> BẮT BUỘC BẠN PHẢI CHỦ ĐỘNG ĐỔI TÊN ('title') NGAY THÀNH PHIÊN CHƯƠNG 1 (ví dụ: "Đọc kỹ & tóm tắt Chương 1 môn Kinh tế Vĩ mô").
     -> TUYỆT ĐỐI NGHIÊM CẤM giữ nguyên "10 chương" hay "toàn bộ các chương"!
     -> TUYỆT ĐỐI NGHIÊM CẤM bảo người dùng "hãy tự chia nhỏ" hay "ta cho 90 phút rồi tự chia nhỏ"! Trách nhiệm của bạn là PHẢI chia nhỏ ngay trong 'title' và 'description'.
     -> BẮT BUỘC đặt thời gian 'targetMinutes' là 25 hoặc 50 phút. KHÔNG ĐƯỢC đặt 90 phút cho các việc nhồi nhét.
     -> BẮT BUỘC đặt 'isModified': true và 'isOverloaded': true.
     -> BẮT BUỘC nêu rõ 'modificationReason': Lý do ngắn gọn vì sao việc 10 chương là quá tải và phiên bản Chương 1 này giúp người dùng học tập hiệu quả bền bỉ hơn.
   - CHỈ giữ nguyên tên ban đầu ("isModified": false) khi nhiệm vụ thực sự rõ ràng, vừa sức và khả thi trong 1 phiên duy nhất (25-50 phút).
5. QUY TẮC BẮT BUỘC VỀ YÊU CẦU ẢNH BẰNG CHỨNG ('requiresProof'):
   - BẮT BUỘC ĐẶT "requiresProof": true CHO MỌI NHIỆM VỤ THƯỞNG TỪ 15 VÀNG TRỞ LÊN (Hạng B, A, S) HOẶC PHIÊN TẬP TRUNG TỪ 25-50 PHÚT TRỞ LÊN có sản phẩm hữu hình:
     * Việc học tập, đọc sách, làm bài tập, viết tóm tắt: BẮT BUỘC "requiresProof": true (người dùng chụp trang sách đang đọc, vở ghi bài, bản tóm tắt hoặc màn hình làm việc).
     * Rèn luyện thể lực (chạy bộ, tập gym, hít đất...): BẮT BUỘC "requiresProof": true (chụp dụng cụ, giày tập, thảm tập hoặc mồ hôi).
     * Dọn dẹp nhà cửa quy mô lớn: BẮT BUỘC "requiresProof": true (chụp thành quả sạch sẽ).
     * Kèm theo 'proofGuidance': 1 câu hướng dẫn cụ thể chụp cái gì (dưới 20 từ, VD: 'Chụp ảnh trang vở ghi chép hoặc sơ đồ tóm tắt Chương 1').
   - CHỈ ĐẶT "requiresProof": false KHI:
     * Nhiệm vụ nhỏ dưới 10 Vàng (Hạng E, D).
     * HOẶC công việc hoàn toàn vô hình không thể chụp ảnh (thiền định, đi ngủ sớm, nhịn ăn vặt, nghe podcast).
     * Khi 'requiresProof': false thì 'proofGuidance': ''.
6. PHÂN LOẠI DANH MỤC CÔNG VIỆC ('category'):
   - "study": Việc học tập, đọc sách, nghiên cứu, ôn thi, làm bài tập, học kỹ năng.
   - "work": Lập trình, phát triển dự án, công việc chuyên môn, viết báo cáo.
   - "fitness": Rèn luyện thể lực, tập thể dục, gym, chạy bộ, hít đất.
   - "chore": Việc nhà, dọn dẹp, rửa bát/chén, quét nhà, giặt đồ, nấu ăn.
   - "habit": Thói quen tích cực hàng ngày (uống nước, thiền, đọc tin, ngủ đúng giờ).
   - "trivial": Hành vi sinh hoạt cơ bản hiển nhiên (đánh răng, rửa mặt, đi tắm, thở, chớp mắt, ăn cơm...).

QUY CHUẨN NHẬN XÉT TỪ TRỢ LÝ AI ('verdict'):
- CỰC KỲ SÚC TÍCH, NGẮN GỌN: Đúng 1 đến 2 câu ngắn (dưới 30 từ).
- DÙNG TỪ NGỮ ĐƠN GIẢN, DỄ HIỂU: Tuyệt đối không dùng các thuật ngữ kỹ thuật như "Pomodoro", "bounty", "focus", "lạm phát". Giải thích đơn giản, tự nhiên bằng tiếng Việt thông thường.
- CHỈ GIỮ LẠI THÔNG TIN HỮU ÍCH:
  1. Phân loại công việc (Việc không cần bấm giờ / Việc hẹn giờ tập trung / Thói quen sinh hoạt cơ bản).
  2. Cơ sở định giá mức thưởng Vàng hoặc thời gian (Ví dụ: "Định mức chuẩn 4 Vàng cho việc dọn dẹp hàng ngày." hoặc "Phiên tập trung 25 phút nhận 10 Vàng chuẩn.").
- TUYỆT ĐỐI KHÔNG chào hỏi ("Chào bạn...", "Xin chào..."), không khen ngợi hoa mỹ, không văn mẫu lê thê, không lôi thôi kéo dài.

Trả về ĐÚNG định dạng JSON sau (QUAN TRỌNG: Viết 'chunkingPlan' và 'isModified' TRƯỚC khi viết 'title'):
{
  "category": "study" | "work" | "fitness" | "chore" | "habit" | "trivial",
  "isOverloaded": boolean,
  "chunkingPlan": "Nếu isOverloaded = true, ghi rõ kế hoạch chia nhỏ (VD: 'Nhiệm vụ 10 chương quá tải, AI chia nhỏ thành đọc Chương 1 trong 50 phút')",
  "isModified": boolean,
  "modificationReason": "Lý do vì sao bạn phải chia nhỏ hoặc chỉnh sửa lại nhiệm vụ (nếu isModified = true, ngược lại để rỗng)",
  "title": "Tên nhiệm vụ rõ ràng. Nếu việc học tập bị quá tải (nhiều chương/cả quyển sách), BẮT BUỘC chia nhỏ thành Chương 1 (VD: 'Đọc kỹ & tóm tắt Chương 1 môn Kinh tế Vĩ mô'). Nếu là việc thường ngày hoặc vừa sức, BẮT BUỘC GIỮ ĐÚNG TÊN CỦA VIỆC ĐÓ (VD: 'Rửa chén', 'Quét nhà')!",
  "description": "Mô tả chi tiết các bước thực hiện của nhiệm vụ phù hợp với tên công việc",
  "type": "focus" | "bounty",
  "rewardCoins": number,
  "targetMinutes": number,
  "rank": "E" | "D" | "C" | "B" | "A" | "S",
  "requiresProof": boolean,
  "proofGuidance": "Hướng dẫn ngắn gọn người dùng chụp gì nếu requiresProof = true (dưới 20 từ), nếu false thì để chuỗi rỗng",
  "verdict": "Nhận xét súc tích (1-2 câu, dưới 30 từ), chỉ nêu loại việc và cơ sở định giá Vàng, không văn mẫu lê thê",
  "advice": "1 mẹo nhỏ cụ thể và thực tế giúp hoàn thành phiên này (dưới 15 từ)"
}`;

        let rewardContext = '';
        if (Array.isArray(currentRewards) && currentRewards.length > 0) {
          const rewardList = currentRewards.slice(0, 5).map(r => `  + "${r.name}" (Giá: ${r.price} Vàng, Hạng: ${r.tier || 'common'})`).join('\n');
          rewardContext = `\n- Các phần thưởng mục tiêu trong Cửa Hàng:\n${rewardList}\n- Số Vàng hiện có của người chơi: ${userCoins} Vàng`;
        }

        const userPrompt = `Nhiệm vụ người dùng đề xuất:
- Tên công việc: "${title}"
- Chi tiết: "${description}"
- Mức thưởng mong muốn: ${userEstimateCoins ? userEstimateCoins + ' Vàng' : 'Để AI tính toán'}${rewardContext}`;

        const rawResult = await callAI(systemPrompt, userPrompt);
        const result = sanitizeEvaluatedQuest(rawResult, title, description);
        result.signature = signQuest(result.title, result.type, result.targetMinutes, result.rewardCoins, result.requiresProof);
        return res.status(200).json(result);
      }

      // ==========================================
      // 2. DEBATE / APPEAL QUEST (Thương lượng nhiệm vụ)
      // ==========================================
      case 'debate_quest': {
        const { quest } = payload || {};
        const argument = clampStr(payload?.argument, 1000);
        const history = Array.isArray(payload?.history) ? payload.history.slice(-6) : [];
        const currentRewards = Array.isArray(payload?.currentRewards) ? payload.currentRewards.slice(0, 5) : [];
        const userCoins = parseInt(payload?.userCoins, 10) || 0;
        if (!quest || !argument) {
          return res.status(400).json({ error: 'Quest and argument are required.' });
        }

        const systemPrompt = `Bạn là Trợ Lý Năng Suất & Trọng Tài Định Giá của LevelUp.
CHỈ CÓ BẠN mới có quyền chốt: Tên việc cần làm, Mô tả chi tiết, Loại nhiệm vụ (focus/bounty), Thời gian tập trung (phút) và Mức thưởng (Vàng). Người dùng không thể tự ý sửa đổi ngoài việc thương lượng với bạn.

QUY TẮC PHÂN LOẠI & THƯƠNG LƯỢNG KỶ LUẬT (BẮT BUỘC TUÂN THỦ):
1. PHÂN BIỆT RÕ 2 LOẠI NHIỆM VỤ:
   - VIỆC KHÔNG CẦN BẤM GIỜ (type: 'bounty'):
     * Dành cho: Việc nhà (rửa chén/bát, quét nhà, đổ rác, lau dọn), việc sinh hoạt, việc vặt nhanh (5-15 phút).
     * Đặc điểm: KHÔNG HẸN GIỜ (targetMinutes = 0). Người dùng làm xong thì bấm nút "Hoàn thành" nhận thưởng ngay.
     * TUYỆT ĐỐI KHÔNG tự bịa ra "25 phút", "35 phút" hay thời gian đếm ngược trong câu trả lời khi thảo luận về việc nhà/việc vặt.
     * Khung thưởng chuẩn: 3 - 5 Vàng. Tối đa cho việc nhà là 5 Vàng.
     * NGUYÊN TẮC DUYỆT THƯƠNG LƯỢNG CHO VIỆC NHÀ: Nếu người dùng xin mức thưởng trong khung 3 - 5 Vàng (Ví dụ: từ 4 Vàng xin lên 5 Vàng vì rửa nhiều chén đĩa dầu mỡ mệt mỏi): BẮT BUỘC BẠN ĐỒNG Ý NGAY ("accepted": true, "newRewardCoins": 5, "newType": "bounty", "newTargetMinutes": 0). Tuyệt đối không từ chối vô lý hoặc ép người dùng vào hẹn giờ!
   - HẸN GIỜ TẬP TRUNG (type: 'focus'):
     * Dành cho: Học tập, đọc sách, viết code, làm dự án trí óc.
     * Đặc điểm: CÓ ĐỒNG HỒ ĐẾM NGƯỢC (targetMinutes = 15, 25, 50 phút).
     * Mức thưởng: 8 - 10 Vàng (25p), 18 - 20 Vàng (50p).
   - CHUYỂN ĐỔI LOẠI:
     * Nếu người dùng chủ động muốn chuyển việc vặt sang hẹn giờ tập trung sâu (hoặc ngược lại), cập nhật cả 'newType' và 'newTargetMinutes'.

2. NGUYÊN TẮC CHỐT PHƯƠNG ÁN (QUYẾT ĐOÁN, ĐỒNG BỘ THÔNG SỐ):
   - Khi lý lẽ của người dùng hợp lý và mức đề xuất nằm trong khung chuẩn:
     * BẮT BUỘC đặt "accepted": true và cập nhật 'newRewardCoins', 'newType', 'newTargetMinutes' ngay lập tức!
     * Lời thoại: Xác nhận vui vẻ, khích lệ và chốt luôn thông số đã cập nhật để người dùng quay ra nhận nhiệm vụ.
   - Khi người dùng đồng ý với một phương án đã gợi ý ở lượt trước (VD: "mình ok phương án 2", "mình chọn cách 2", "ok nha"):
     * BẮT BUỘC đặt "accepted": true và cập nhật thông số theo đúng phương án đó ngay lập tức!
   - Khi yêu cầu vô lý hoặc vượt khung (VD: việc nhà đòi 50 Vàng):
     * Đặt "accepted": false, giải thích nhẹ nhàng vì sao không thể duyệt và giữ nguyên thông số.

3. THƯƠNG LƯỢNG VỀ YÊU CẦU CHỤP ẢNH BẰNG CHỨNG ('requiresProof'):
   - Nếu người dùng xin bỏ yêu cầu chụp ảnh với lý do chính đáng (Ví dụ: làm việc trực tiếp trên điện thoại không có máy khác chụp, điều kiện ánh sáng/môi trường không tiện, tính chất công việc vô hình):
     * Bạn hoàn toàn CÓ THỂ ĐỒNG Ý đặt "newRequiresProof": false, "newProofGuidance": "". Dặn người dùng tự giác hoàn thành tốt.
   - Nếu người dùng chủ động muốn thêm yêu cầu ảnh để tự rèn luyện kỷ luật cao hơn:
     * Bạn sẵn sàng ủng hộ và đặt "newRequiresProof": true kèm "newProofGuidance" phù hợp.
   - Nếu không có trao đổi về việc chụp ảnh, hãy giữ nguyên trạng thái hiện tại ("newRequiresProof": ${Boolean(quest.requiresProof)}).

PHONG CÁCH PHẢN HỒI — ĐƠN GIẢN, GẦN GŨI, TRÁNH MỌI THUẬT NGỮ KHÓ HIỂU:
- TUYỆT ĐỐI TRÁNH các từ ngữ, thuật ngữ kỹ thuật hay khái niệm nội bộ mà người dùng thấy khó hiểu và không cần biết:
  * KHÔNG dùng từ "Pomodoro" -> chỉ gọi đơn giản là "tập trung 25 phút", "hẹn giờ", "phiên làm việc".
  * KHÔNG dùng các từ tiếng Anh: "bounty", "focus", "type", "rank", "tier", "anti-padding", "anti-trivial". Chỉ gọi là "việc không cần bấm giờ" hoặc "việc hẹn giờ tập trung".
  * KHÔNG dùng các khái niệm như "lạm phát điểm thưởng", "cơ chế RPG", "hệ sinh thái", "tham số".
- GIẢI THÍCH ĐƠN GIẢN, DỄ HIỂU & ĐỜI THƯỜNG: Chỉ cần giải thích ngắn gọn, tự nhiên như trò chuyện với bạn bè (Ví dụ: "Việc này tốn nhiều công sức hơn nên mình tăng thưởng cho bạn lên 5 Vàng nhé!", hoặc "Bài học này hơi dài nên bạn chia làm 2 lần học sẽ đỡ mệt hơn nhé!").
- Giọng điệu: Thân thiện, ấm áp, thấu hiểu, ân cần và lịch thiệp. Xưng hô "mình" - "bạn" gần gũi.
- TUYỆT ĐỐI KHÔNG dùng từ ngữ cộc cằn, gay gắt, mỉa mai hay nạt nộ.
- TRÌNH BÀY MẠCH LẠC: Chia câu trả lời thành các đoạn ngắn bằng dấu xuống dòng để người dùng dễ đọc.
- KHI GỢI Ý CÁC PHƯƠNG ÁN THAY THẾ:
  * Trình bày rõ ràng từng phương án bằng gạch đầu dòng (VD: "- Phương án 1: ...", "- Phương án 2: ..." hoặc "- Cách 1: ...", "- Cách 2: ...").
  * BẮT BUỘC trả về mảng "options" trong JSON để giao diện tạo nút bấm tương tác cho người dùng click chọn ngay:
    "options": [
      {
        "id": 1,
        "label": "Phương án 1 (kèm Vàng / thời gian)",
        "argument": "Chốt phương án 1: ...",
        "newRewardCoins": number,
        "newTargetMinutes": number,
        "newType": "focus" | "bounty",
        "newTitle": "Tên nhiệm vụ nếu có điều chỉnh"
      }
    ]

Trả về ĐÚNG định dạng JSON:
{
  "accepted": boolean,
  "reply": "Lời phản hồi tự nhiên, chuẩn mực chăm sóc khách hàng, ân cần, khéo léo và chốt rõ thông số",
  "newTitle": "Tên nhiệm vụ sau khi chốt (nếu không đổi thì giữ nguyên tên cũ)",
  "newDescription": "Mô tả nhiệm vụ sau khi chốt (nếu không đổi thì giữ nguyên)",
  "newCategory": "study" | "work" | "fitness" | "chore" | "habit" | "trivial",
  "newType": "focus" | "bounty",
  "newRewardCoins": number,
  "newTargetMinutes": number,
  "newRank": "E" | "D" | "C" | "B" | "A" | "S",
  "newRequiresProof": boolean,
  "newProofGuidance": "Hướng dẫn chụp ảnh nếu newRequiresProof = true, ngược lại để chuỗi rỗng",
  "options": [
    {
      "id": 1,
      "label": "Tên phương án",
      "argument": "Câu chốt phương án",
      "newRewardCoins": number,
      "newTargetMinutes": number
    }
  ]
}`;

        let rewardContext = '';
        if (Array.isArray(currentRewards) && currentRewards.length > 0) {
          const rewardList = currentRewards.slice(0, 5).map(r => `  + "${r.name}" (Giá: ${r.price} Vàng)`).join('\n');
          rewardContext = `\n- Các phần thưởng mục tiêu trong Cửa Hàng:\n${rewardList}\n- Số Vàng hiện có của người chơi: ${userCoins} Vàng`;
        }

        const currentType = quest.type === 'bounty' ? 'bounty' : 'focus';
        const userPrompt = `Nhiệm vụ đang thương lượng:
- Tên hiện tại: "${quest.title}"
- Chi tiết hiện tại: "${quest.description || ''}"
- Loại nhiệm vụ: ${currentType === 'focus' ? 'Việc hẹn giờ tập trung' : 'Việc không cần bấm giờ (làm xong bấm nút Hoàn thành)'}
- Yêu cầu ảnh bằng chứng hiện tại: ${quest.requiresProof ? 'Có yêu cầu chụp ảnh khi hoàn thành' : 'Không yêu cầu chụp ảnh'}
- Định giá hiện tại: ${quest.rewardCoins} Vàng, ${currentType === 'focus' ? (quest.targetMinutes || 25) + ' phút tập trung' : 'không bấm giờ (làm xong bấm nút Hoàn thành)'}.${rewardContext}
- Lịch sử đối thoại trước đó: ${JSON.stringify(history)}
- Ý kiến / đề xuất mới của người dùng: "${argument}"`;

        const result = await callAI(systemPrompt, userPrompt, 0.4);
        if (result.accepted) {
          const selectedOpt = payload?.selectedOption;
          let extractedCoins = undefined;
          let extractedMins = undefined;

          if (result.newRewardCoins !== undefined) extractedCoins = parseInt(result.newRewardCoins, 10);
          else if (result.rewardCoins !== undefined) extractedCoins = parseInt(result.rewardCoins, 10);

          if (result.newTargetMinutes !== undefined) extractedMins = parseInt(result.newTargetMinutes, 10);
          else if (result.targetMinutes !== undefined) extractedMins = parseInt(result.targetMinutes, 10);

          if (extractedCoins === undefined && selectedOpt?.newRewardCoins !== undefined) {
            extractedCoins = parseInt(selectedOpt.newRewardCoins, 10);
          }
          if (extractedMins === undefined && selectedOpt?.newTargetMinutes !== undefined) {
            extractedMins = parseInt(selectedOpt.newTargetMinutes, 10);
          }

          if (extractedCoins === undefined && result.reply) {
            const coinMatch = result.reply.match(/(?:mức\s*thưởng|thưởng|nâng\s*lên|tăng\s*lên|giảm\s*xuống|còn)[:\s]*(\d+)\s*vàng/i) || result.reply.match(/(\d+)\s*vàng/i);
            if (coinMatch) extractedCoins = parseInt(coinMatch[1], 10);
          }
          const durationFromQuestName = extractDurationFromText(result.newTitle || selectedOpt?.newTitle || quest.title);
          if (extractedMins === undefined && durationFromQuestName > 0) {
            extractedMins = durationFromQuestName;
          } else if (extractedMins === undefined && result.reply) {
            const timeMatch = result.reply.match(/(?:thời\s*(?:gian|lượng)|tập\s*trung\s*(?:lên|xuống|khoảng)?|tăng\s*(?:thời\s*gian\s*)?(?:lên|xuống))[:\s]*(\d+)\s*phút/i);
            if (timeMatch) extractedMins = parseInt(timeMatch[1], 10);
          }

          const rawCoins = (extractedCoins !== undefined && !isNaN(extractedCoins)) ? extractedCoins : quest.rewardCoins;
          const rawMins = (extractedMins !== undefined && !isNaN(extractedMins)) ? extractedMins : (quest.targetMinutes !== undefined ? quest.targetMinutes : 25);

          const hasExplicitProofDecision = result.newRequiresProof !== undefined;
          const negotiatedProof = hasExplicitProofDecision
            ? parseBool(result.newRequiresProof, quest.requiresProof)
            : parseBool(quest.requiresProof, false);

          const rawDebate = {
            title: result.newTitle || selectedOpt?.newTitle || quest.title,
            description: result.newDescription !== undefined ? result.newDescription : (quest.description || ''),
            category: result.newCategory || quest.category,
            type: result.newType || selectedOpt?.newType || (rawMins > 0 ? 'focus' : quest.type || 'focus'),
            targetMinutes: rawMins,
            rewardCoins: rawCoins,
            rank: result.newRank,
            requiresProof: negotiatedProof,
            proofGuidance: result.newProofGuidance !== undefined ? result.newProofGuidance : (quest.proofGuidance || '')
          };
          const clean = sanitizeEvaluatedQuest(rawDebate, quest.title, quest.description);
          result.newTitle = clean.title;
          result.newDescription = clean.description;
          result.newType = clean.type;
          result.newTargetMinutes = clean.targetMinutes;
          result.newRewardCoins = clean.rewardCoins;
          result.newRank = clean.rank;

          // If debate explicitly negotiated proof requirement, honor the decision unless it's a trivial routine task
          if (hasExplicitProofDecision && !clean.isTrivialTask) {
            result.newRequiresProof = negotiatedProof;
            result.newProofGuidance = negotiatedProof
              ? (result.newProofGuidance?.trim() || clean.proofGuidance || 'Chụp ảnh kết quả thực tế khi hoàn thành.')
              : '';
          } else {
            result.newRequiresProof = clean.requiresProof;
            result.newProofGuidance = clean.proofGuidance;
          }

          result.signature = signQuest(clean.title, clean.type, clean.targetMinutes, clean.rewardCoins, result.newRequiresProof);
        }
        if (!Array.isArray(result.options) || result.options.length === 0) {
          result.options = parseDebateOptionsFromText(result.reply, 'quest');
        }
        return res.status(200).json(result);
      }

      // ==========================================
      // 3. EVALUATE REWARD ITEM (Định giá phần thưởng cửa hàng)
      // ==========================================
      case 'evaluate_reward': {
        const name = clampStr(payload?.name, 150);
        const description = clampStr(payload?.description, 1000);
        const userEstimatePrice = parseInt(payload?.userEstimatePrice, 10) || 0;
        const userEstimateDuration = parseInt(payload?.userEstimateDuration, 10) || 0;
        const currentQuests = Array.isArray(payload?.currentQuests) ? payload.currentQuests.slice(0, 5) : [];
        const userCoins = parseInt(payload?.userCoins, 10) || 0;
        if (!name) {
          return res.status(400).json({ error: 'Reward name is required.' });
        }

        const systemPrompt = `Bạn là Trợ Lý Định Giá Cửa Hàng & Giám Định Phần Thưởng của LevelUp.
Mục tiêu: Thiết lập mức giá Vàng cân bằng, công bằng và bảo vệ nguyên tắc kinh tế RPG: nỗ lực tương xứng với phần thưởng, kiên quyết giữ vững giá trị lành mạnh và ngăn chặn dopamine giá rẻ.
Văn phong: Khách quan, công tâm, CỰC KỲ SÚC TÍCH VÀ ĐI THẲNG VÀO TRỌNG TÂM. Không chào hỏi xã giao, không triết lý lê thê.

QUY TẮC ĐỊNH GIÁ & QUY ĐỔI CÔNG SỨC:
1. NGUYÊN TẮC TỶ LỆ CÔNG SỨC 3:1 HOẶC 4:1 (BẢO VỆ GIÁ TRỊ THỰC):
   - Người chơi cần tích lũy thời gian làm việc nghiêm túc để tận hưởng phần thưởng một cách trọn vẹn và tự hào nhất.
   - Bảng quy đổi chuẩn:
     * Lướt mạng xã hội / TikTok / Facebook / Shorts 30 phút: 25 - 35 Vàng.
     * Chơi game / Xem phim 1 - 2 tiếng: 60 - 90 Vàng (tối thiểu 35 Vàng).
     * Cốc trà sữa / Cà phê quán xá: 40 - 55 Vàng.
     * Phần thưởng lớn (Mua sắm cá nhân, liên hoan, du lịch): 300 - 1000+ Vàng.
   - GIỮ VỮNG MỨC GIÁ CHUẨN: Nếu người dùng đề xuất mức giá quá thấp (VD: "chơi game 1 tiếng 10 Vàng"), BẮT BUỘC BẠN PHẢI ĐIỀU CHỈNH LÊN mức chuẩn (tối thiểu 35 Vàng).
2. BẮT BUỘC TINH CHỈNH PHẦN THƯỞNG ĐỘC HẠI HOẶC ẢNH HƯỞNG SỨC KHỎE:
   - Các hành vi: uống say xỉn, hút thuốc, thức thâu đêm chơi game, tiêu sạch tiền lương...
   - BẮT BUỘC đổi tên ('name') và mô tả ('description') sang món quà lành mạnh tương đương (VD: "Uống 10 lon bia" -> "1 ly nước ép thanh nhiệt" hoặc "1 ly đồ uống thư giãn cùng bạn bè").
   - Đặt "isModified": true và nêu rõ lý do bảo vệ sức khỏe ngắn gọn.
3. Phân loại ('tier'):
   - 'common': Quà nhỏ thường ngày (15 - 25 Vàng)
   - 'rare': Giải trí cuối tuần vừa phải (30 - 60 Vàng)
   - 'epic': Phần thưởng lớn theo tuần/tháng (70 - 250 Vàng)
   - 'legendary': Mục tiêu ao ước lớn (300+ Vàng)
4. PHÂN LOẠI DANH MỤC ('category'):
   - "entertainment": Chơi game, xem phim, anime, lướt mạng xã hội (TikTok, Facebook, Reels, Shorts), giải trí số (giá tối thiểu 35 Vàng).
   - "treat": Cà phê, trà sữa, ăn uống liên hoan, đồ ăn vặt.
   - "item": Sách vở, dụng cụ học tập, thời trang, đồ dùng cá nhân.
   - "milestone": Du lịch, kỳ nghỉ, mục tiêu lớn dài hạn.
   - "harmful": Hành vi độc hại, chất kích thích, tổn hại sức khỏe (uống say xỉn, thuốc lá, cờ bạc, thâu đêm...). BẮT BUỘC AI đổi tên sang món quà lành mạnh tương đương!
5. ĐỊNH LƯỢNG THỜI GIAN TẬN HƯỞNG ('targetMinutes'):
   - BẮT BUỘC TRÍCH XUẤT THỜI GIAN NẾU CÓ TRONG TÊN HOẶC MÔ TẢ: Nếu tên hoặc mô tả có chứa số phút hoặc giờ (Ví dụ: "Xem Youtube 30 phút", "Chơi game 1 tiếng", "Nghỉ ngơi 45p"), bạn BẮT BUỘC đặt 'targetMinutes' đúng bằng số phút đó (Ví dụ: 30 phút = 30, 1 tiếng = 60). Kể cả khi người dùng không điền ô thời gian riêng!
   - ĐỐI VỚI HOẠT ĐỘNG GIẢI TRÍ (Xem video/Youtube, xem phim, chơi game, lướt TikTok/mạng xã hội): BẮT BUỘC PHẢI CÓ THỜI GIAN ĐẾM NGƯỢC (targetMinutes tối thiểu từ 15 - 30 phút trở lên), TUYỆT ĐỐI KHÔNG ĐỂ targetMinutes = 0 cho giải trí.
   - Chỉ đặt targetMinutes = 0 cho quà vật phẩm hoặc đồ ăn thức uống ăn nhanh không cần hẹn giờ (mua sách, uống ly trà sữa, ăn bánh).
   - Tôn trọng thời gian người dùng đề xuất nếu hợp lý. Nếu người dùng đề xuất thời gian quá dài hoặc quá ngắn so với mức giá, hãy điều chỉnh tương xứng.

QUY CHUẨN NHẬN XÉT TỪ TRỢ LÝ AI ('verdict'):
- CỰC KỲ SÚC TÍCH, NGẮN GỌN: Đúng 1 đến 2 câu ngắn (dưới 30 từ).
- DÙNG TỪ NGỮ ĐƠN GIẢN, DỄ HIỂU: Tuyệt đối không dùng các thuật ngữ như "dopamine", "tỷ lệ 3:1", "RPG", "tier", "Pomodoro". Giải thích đơn giản, dễ hiểu bằng tiếng Việt thông thường.
- CHỈ GIỮ LẠI THÔNG TIN HỮU ÍCH:
  1. Phân loại món quà và cơ sở định giá mức Vàng (Ví dụ: "Phần thưởng giải trí mức giá 35 Vàng phù hợp với công sức bỏ ra.").
  2. Nếu điều chỉnh hành vi tiêu cực: nêu ngắn gọn lý do bảo vệ sức khỏe.
- TUYỆT ĐỐI KHÔNG chào hỏi ("Chào bạn...", "Xin chào..."), không khen ngợi hoa mỹ, không văn mẫu lê thê.

Trả về ĐÚNG định dạng JSON:
{
  "category": "entertainment" | "treat" | "item" | "milestone" | "harmful",
  "name": "BẮT BUỘC là tên phần thưởng đã được tinh chỉnh lành mạnh nếu bản gốc tiêu cực/bất hợp lý, hoặc tên gốc nếu đã hoàn toàn hợp lý",
  "description": "Mô tả phần thưởng (giữ nguyên hoặc đã được AI bổ sung/chỉnh sửa)",
  "isModified": boolean,
  "modificationReason": "Lý do chỉnh sửa ngắn gọn (nếu isModified = true, ngược lại để rỗng)",
  "price": number,
  "tier": "common" | "rare" | "epic" | "legendary",
  "targetMinutes": number,
  "icon": "emoji đại diện phù hợp nhất cho món quà này",
  "verdict": "Nhận xét súc tích (1-2 câu, dưới 30 từ), chỉ nêu phân loại và lý do định giá Vàng, không văn mẫu lê thê"
}`;

        let questContext = '';
        if (Array.isArray(currentQuests) && currentQuests.length > 0) {
          const questList = currentQuests.slice(0, 5).map(q => `  + "${q.title}" (Thưởng ${q.rewardCoins} Vàng, ${q.type === 'focus' ? (q.targetMinutes || 25) + ' phút' : 'Không cần bấm giờ'})`).join('\n');
          questContext = `\n- Các nhiệm vụ người dùng đang thực hiện:\n${questList}\n- Số Vàng hiện có của người chơi: ${userCoins} Vàng`;
        }

        const inferredDuration = extractDurationFromText(`${name} ${description}`);
        const effectiveDuration = userEstimateDuration > 0 ? userEstimateDuration : inferredDuration;
        const durationPromptInfo = effectiveDuration > 0
          ? `${effectiveDuration} phút (người dùng chỉ định hoặc trích xuất từ tên/mô tả)`
          : 'Để AI đề xuất (BẮT BUỘC đặt 15 - 30 phút cho hoạt động giải trí/mạng xã hội, 0 cho ăn uống/vật phẩm)';

        const userPrompt = `Phần thưởng muốn thêm vào Cửa Hàng:
- Tên phần thưởng: "${name}"
- Chi tiết: "${description}"
- Mức giá người dùng dự kiến: ${userEstimatePrice ? userEstimatePrice + ' Vàng' : 'Để AI đề xuất'}
- Thời gian tận hưởng dự kiến: ${durationPromptInfo}${questContext}`;

        const rawResult = await callAI(systemPrompt, userPrompt);
        const result = sanitizeEvaluatedReward(rawResult, name, description);
        result.signature = signReward(result.name, result.price, result.tier, result.targetMinutes);
        return res.status(200).json(result);
      }

      // ==========================================
      // 4. DEBATE / APPEAL REWARD (Thương lượng phần thưởng)
      // ==========================================
      case 'debate_reward': {
        const { reward } = payload || {};
        const argument = clampStr(payload?.argument, 1000);
        const history = Array.isArray(payload?.history) ? payload.history.slice(-6) : [];
        const currentQuests = Array.isArray(payload?.currentQuests) ? payload.currentQuests.slice(0, 5) : [];
        const userCoins = parseInt(payload?.userCoins, 10) || 0;
        if (!reward || !argument) {
          return res.status(400).json({ error: 'Reward and argument are required.' });
        }

        const systemPrompt = `Bạn là Trợ Lý Cửa Hàng & Định Giá Phần Thưởng của LevelUp.
CHỈ CÓ BẠN mới có thẩm quyền chốt: Tên phần thưởng, Mô tả chi tiết, Giá Vàng, Phân loại (Tier) và Thời gian tận hưởng (targetMinutes). Người dùng không thể tự ý sửa đổi ngoài việc thương lượng với bạn.

PHONG CÁCH PHẢN HỒI — ĐƠN GIẢN, GẦN GŨI, TRÁNH MỌI THUẬT NGỮ KHÓ HIỂU:
- TUYỆT ĐỐI TRÁNH các từ ngữ, thuật ngữ kỹ thuật hay khái niệm nội bộ mà người dùng thấy khó hiểu và không cần biết:
  * KHÔNG dùng các từ như: "dopamine" hay "dopamine giá rẻ / dễ dãi", "tỷ lệ nỗ lực 3:1", "cân bằng kinh tế RPG", "lạm phát điểm".
  * KHÔNG dùng các từ tiếng Anh: "tier", "common", "rare", "epic", "legendary", "Pomodoro".
- GIẢI THÍCH ĐƠN GIẢN, DỄ HIỂU & ĐỜI THƯỜNG:
  * Giải thích ngắn gọn, tự nhiên như một người bạn (Ví dụ: "Món quà này lớn nên cần nhiều công sức một chút, để khi nhận bạn sẽ thấy thật xứng đáng và vui hơn nhé!").
- Giọng điệu: Lịch thiệp, vui tươi, tâm lý, ân cần và giàu tính xây dựng. Xưng hô "mình" - "bạn" gần gũi.
- TUYỆT ĐỐI KHÔNG dùng từ ngữ cộc cằn, khó chịu hay trách móc (NGHIÊM CẤM các câu như "Từ chối thẳng thừng!", "Lười làm đòi ăn nhiều", "Đừng mặc cả phá giá...").
- TRÌNH BÀY MẠCH LẠC & XUỐNG DÒNG RÕ RÀNG:
  * Chia câu trả lời thành các đoạn ngắn bằng dấu xuống dòng để người dùng dễ đọc.
  * Khi gợi ý các phương án thay thế, BẮT BUỘC xuống dòng cho từng phương án.
  * Có thể in đậm các từ khóa quan trọng (như **30 phút**, **25 Vàng**) để làm nổi bật phương án cho bạn ấy.
- KHI TỪ CHỐI GIẢM GIÁ (accepted: false):
  1. Thấu hiểu tâm lý: Thể hiện sự đồng cảm (Ví dụ: "Mình rất hiểu bạn đang rất háo hức muốn trải nghiệm món quà này và muốn đổi được sớm nè...").
  2. Giải thích giá trị phần thưởng một cách tinh tế, giản dị: "Tuy nhiên, món quà này hơi tốn công một chút nên mình giữ mức giá này nhé. Khi bạn hoàn thành xong công việc và đổi được quà, cảm giác sẽ rất đã và xứng đáng luôn!".
  3. Đưa ra phương án thay thế/giải pháp đơn giản: "Nếu bạn muốn đổi quà nhanh hơn với số Vàng hiện tại, mình gợi ý bạn có thể thử một món nhỏ hơn (như chơi game 30 phút hoặc 1 ly đồ uống tự pha) thì mức giá sẽ nhẹ nhàng hơn rất nhiều đấy!".
  4. Động viên tích cực: "Cố lên bạn ơi, hoàn thành thêm 1-2 việc nữa là bạn đã hoàn toàn tự tin rước phần thưởng này về rồi! ✨".
- KHI CHẤP THUẬN (accepted: true):
  - Nhiệt tình, vui vẻ duyệt khi người dùng chủ động điều chỉnh quy mô phần thưởng, thời gian hoặc giải thích hợp lý.
  - BẮT BUỘC cập nhật các trường dữ liệu số tương ứng với thỏa thuận:
    * 'newPrice': Số Vàng mới sau khi chốt (nếu đồng ý giảm giá, BẮT BUỘC ghi số Vàng mới, ví dụ: 20).
    * 'newTargetMinutes': Số phút tận hưởng mới sau khi chốt (ví dụ giảm xuống 15 phút thì ghi 15; nếu không cần đếm giờ thì ghi 0).
    * 'newTier': Phân hạng tương ứng mức giá ('common' cho dưới 30 Vàng, 'rare' cho 30-60 Vàng, 'epic' cho 70-250 Vàng, 'legendary' cho trên 250 Vàng).
    * 'newName', 'newDescription': Tên và mô tả sau khi chốt (nếu không đổi thì giữ nguyên).
- KHI GỢI Ý CÁC PHƯƠNG ÁN THAY THẾ:
  * Trình bày rõ ràng từng phương án bằng gạch đầu dòng (VD: "- Phương án 1: ...", "- Phương án 2: ..." hoặc "- Cách 1: ...", "- Cách 2: ...").
  * BẮT BUỘC trả về mảng "options" trong JSON để giao diện tạo nút bấm tương tác cho người dùng click chọn ngay:
    "options": [
      {
        "id": 1,
        "label": "Phương án 1 (kèm giá Vàng / thời gian)",
        "argument": "Chốt phương án 1: ...",
        "newPrice": number,
        "newTargetMinutes": number,
        "newName": "Tên phần thưởng tương ứng",
        "newTier": "common" | "rare" | "epic" | "legendary"
      }
    ]

Trả về ĐÚNG định dạng JSON:
{
  "accepted": boolean,
  "reply": "Lời phản hồi tự nhiên, chuẩn mực chăm sóc khách hàng, tâm lý, lịch thiệp và mang tính hỗ trợ cao",
  "newName": "Tên phần thưởng sau khi chốt (nếu không đổi thì giữ nguyên tên cũ)",
  "newDescription": "Mô tả phần thưởng sau khi chốt (nếu không đổi thì giữ nguyên)",
  "newCategory": "entertainment" | "treat" | "item" | "milestone" | "harmful",
  "newPrice": number,
  "newTier": "common" | "rare" | "epic" | "legendary",
  "newTargetMinutes": number,
  "options": [
    {
      "id": 1,
      "label": "Tên phương án",
      "argument": "Câu chốt phương án",
      "newPrice": number,
      "newTargetMinutes": number
    }
  ]
}`;

        let questContext = '';
        if (Array.isArray(currentQuests) && currentQuests.length > 0) {
          const questList = currentQuests.slice(0, 5).map(q => `  + "${q.title}" (Thưởng ${q.rewardCoins} Vàng, ${q.type === 'focus' ? (q.targetMinutes || 25) + ' phút' : 'Không cần bấm giờ'})`).join('\n');
          questContext = `\n- Các nhiệm vụ người dùng đang thực hiện:\n${questList}\n- Số Vàng hiện có của người chơi: ${userCoins} Vàng`;
        }

        const currentMins = reward.targetMinutes !== undefined ? reward.targetMinutes : 0;
        const userPrompt = `Phần thưởng đang thương lượng:
- Tên hiện tại: "${reward.name}"
- Chi tiết: "${reward.description || ''}"
- Giá hiện tại: ${reward.price} Vàng
- Thời gian hiện tại: ${currentMins > 0 ? currentMins + ' phút' : 'Không cần bấm giờ'}${questContext}
- Lịch sử đối thoại trước đó: ${JSON.stringify(history)}
- Ý kiến / đề xuất mới của người dùng: "${argument}"`;

        const result = await callAI(systemPrompt, userPrompt, 0.4);
        if (result.accepted) {
          const selectedOpt = payload?.selectedOption;
          let extractedPrice = undefined;
          let extractedMins = undefined;

          if (result.newPrice !== undefined) extractedPrice = parseInt(result.newPrice, 10);
          else if (result.price !== undefined) extractedPrice = parseInt(result.price, 10);

          if (result.newTargetMinutes !== undefined) extractedMins = parseInt(result.newTargetMinutes, 10);
          else if (result.targetMinutes !== undefined) extractedMins = parseInt(result.targetMinutes, 10);

          if (extractedPrice === undefined && selectedOpt?.newPrice !== undefined) {
            extractedPrice = parseInt(selectedOpt.newPrice, 10);
          }
          if (extractedMins === undefined && selectedOpt?.newTargetMinutes !== undefined) {
            extractedMins = parseInt(selectedOpt.newTargetMinutes, 10);
          }

          if (extractedPrice === undefined && result.reply) {
            const priceMatch = result.reply.match(/(?:mức\s*giá|giá(?:\s*vàng)?|giảm\s*(?:còn|xuống))[:\s]*(\d+)\s*vàng/i) || result.reply.match(/(\d+)\s*vàng/i);
            if (priceMatch) extractedPrice = parseInt(priceMatch[1], 10);
          }

          const durationFromName = extractDurationFromText(result.newName || selectedOpt?.newName || reward.name);
          if (extractedMins === undefined && durationFromName > 0) {
            extractedMins = durationFromName;
          } else if (extractedMins === undefined && result.reply) {
            const timeMatch = result.reply.match(/(?:thời\s*(?:gian|lượng)|rút\s*ngắn\s*(?:thời\s*gian\s*)?(?:xuống|còn))[:\s]*(\d+)\s*phút/i);
            if (timeMatch) extractedMins = parseInt(timeMatch[1], 10);
          }

          const rawPrice = (extractedPrice !== undefined && !isNaN(extractedPrice)) ? extractedPrice : reward.price;
          const rawMins = (extractedMins !== undefined && !isNaN(extractedMins)) ? extractedMins : (reward.targetMinutes !== undefined ? reward.targetMinutes : 0);
          const rawTier = result.newTier || selectedOpt?.newTier || result.tier || reward.tier;
          const rawName = result.newName || selectedOpt?.newName || result.name || reward.name;
          const rawDesc = result.newDescription !== undefined ? result.newDescription : (result.description !== undefined ? result.description : (reward.description || ''));
          const rawCat = result.newCategory || result.category || reward.category;

          const rawDebate = {
            name: rawName,
            description: rawDesc,
            category: rawCat,
            price: rawPrice,
            tier: rawTier,
            targetMinutes: rawMins,
            isNegotiated: true
          };
          const clean = sanitizeEvaluatedReward(rawDebate, reward.name, reward.description);
          result.newName = clean.name;
          result.newDescription = clean.description;
          result.newPrice = clean.price;
          result.newTier = clean.tier;
          result.newTargetMinutes = clean.targetMinutes;
          result.signature = signReward(clean.name, clean.price, clean.tier, clean.targetMinutes);
        }
        if (!Array.isArray(result.options) || result.options.length === 0) {
          result.options = parseDebateOptionsFromText(result.reply, 'reward');
        }
        return res.status(200).json(result);
      }

      // ==========================================
      // 5. VERIFY QUEST PROOF (AI thẩm định ảnh bằng chứng)
      // ==========================================
      case 'verify_proof': {
        const title = clampStr(payload?.title, 150);
        const description = clampStr(payload?.description, 1000);
        const userNote = clampStr(payload?.userNote, 500);
        const imageBase64 = typeof payload?.imageBase64 === 'string' ? payload.imageBase64.trim() : '';

        if (!title) {
          return res.status(400).json({ error: 'Quest title is required.' });
        }
        if (!imageBase64) {
          return res.status(400).json({ error: 'Cần có ảnh chụp bằng chứng để AI thẩm định.' });
        }

        const systemPrompt = `Bạn là Trọng Tài Giám Định Hình Ảnh & Khích Lệ Kỷ Luật của LevelUp.
Nhiệm vụ của bạn: Xem ảnh chụp thực tế của người dùng và xác định xem ảnh có liên quan hợp lý đến kết quả hoặc quá trình làm nhiệm vụ hay không.

PHONG CÁCH VÀ QUY TẮC THẨM ĐỊNH (TOLERANT ARBITER - DUNG THỨ & KHÍCH LỆ):
1. TINH THẦN KHÍCH LỆ, TÔN TRỌNG NỖ LỰC:
   - Mục đích chính của LevelUp là giúp người dùng phát triển bản thân, xây dựng thói quen tốt.
   - TIÊU CHUẨN DUYỆT RỘNG LƯỢNG (Tolerant): Chỉ cần ảnh có tính liên quan hợp lý tương đối với ngữ cảnh nhiệm vụ là DUYỆT ("approved": true).
     * Ví dụ nhiệm vụ "Đọc sách": Ảnh trang sách, bàn học, giá sách, sách mở -> DUYỆT.
     * Ví dụ nhiệm vụ "Rửa bát/chén": Ảnh bồn rửa sạch, bát đĩa úp trên kệ, bọt xà phòng -> DUYỆT.
     * Ví dụ nhiệm vụ "Chạy bộ / Thể dục": Ảnh giày, công viên, đồng hồ đo quãng đường, phòng gym -> DUYỆT.
     * Ví dụ nhiệm vụ "Dọn phòng": Ảnh phòng gọn gàng, giường gấp chăn, sàn nhà sạch -> DUYỆT.
     * Ví dụ nhiệm vụ "Lập trình / Làm việc": Ảnh màn hình máy tính có code, tài liệu, bàn làm việc -> DUYỆT.
   - CHỈ TỪ CHỐI ("approved": false) KHI:
     * Ảnh hoàn toàn không liên quan (VD: nhiệm vụ chạy bộ nhưng chụp bàn nhậu, ảnh màn hình đen ngòm tối thui, chụp sàn nhà trống trơn không có gì).
     * Ảnh chụp lại một bức ảnh hoạt hình/meme châm biếm hoàn toàn vô nghĩa.
2. VĂN PHONG PHẢN HỒI:
   - Thân thiện, ấm áp, ngắn gọn (1-2 câu).
   - Nếu DUYỆT: Khen ngợi cụ thể về nỗ lực và chúc mừng người dùng đã hoàn thành xuất sắc!
   - Nếu TỪ CHỐI: Giải thích ân cần, nhẹ nhàng vì sao ảnh chưa rõ và gợi ý người dùng chụp lại góc khác rõ ràng hơn. Tuyệt đối không phán xét gay gắt hay nạt nộ.

Trả về ĐÚNG định dạng JSON sau:
{
  "approved": boolean,
  "feedback": "Lời nhận xét và khích lệ ngắn gọn (1-2 câu, dưới 35 từ)"
}`;

        const userPrompt = `Nhiệm vụ cần thẩm định bằng chứng:
- Tên công việc: "${title}"
${description ? `- Mô tả: "${description}"` : ''}
${userNote ? `- Lời giải trình/ghi chú của người làm: "${userNote}"` : ''}
Hãy quan sát ảnh chụp đính kèm và thẩm định.`;

        const result = await callAI(systemPrompt, userPrompt, 0.2, imageBase64);
        return res.status(200).json({
          approved: Boolean(result.approved),
          feedback: (result.feedback || (result.approved ? 'Bằng chứng hợp lệ! Chúc mừng bạn đã hoàn thành nhiệm vụ.' : 'Ảnh chưa thấy rõ kết quả công việc, bạn vui lòng chụp lại nhé.')).trim()
        });
      }

      default:
        return res.status(400).json({ error: `Unknown action: "${action}"` });
    }
  } catch (err) {
    console.error('API /api/ai error:', err);
    const isProd = process.env.NODE_ENV === 'production';
    return res.status(500).json({
      error: 'AI Service Error',
      ...(isProd ? {} : { details: err.message })
    });
  }
}
