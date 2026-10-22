/**
 * AI Heuristics, Sanitizers, Parsers & Knowledge Base
 * Strongly typed in TypeScript for Next.js 16 server logic
 */

export function calculateRank(coins: number): string {
  if (coins >= 40) return 'S';
  if (coins >= 25) return 'A';
  if (coins >= 18) return 'B';
  if (coins >= 12) return 'C';
  if (coins >= 6) return 'D';
  return 'E';
}

export function clampStr(str?: string | null, max: number = 500): string {
  return typeof str === 'string' ? str.trim().slice(0, max) : '';
}

export function stripDiacritics(str?: string | null): string {
  if (!str) return '';
  return str.normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, d => d === 'đ' ? 'd' : 'D')
    .toLowerCase();
}

export function parseBool(val: any, defaultVal: boolean = false): boolean {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') {
    const s = val.trim().toLowerCase();
    if (s === 'true' || s === '1' || s === 'yes') return true;
    if (s === 'false' || s === '0' || s === 'no') return false;
  }
  if (typeof val === 'number') return val !== 0;
  return defaultVal;
}

export function resolveCategory(origTitle: string, title: string, origDesc: string, desc: string): string {
  const raw = `${origTitle} ${title} ${origDesc} ${desc}`.toLowerCase();
  const text = `${raw} ${stripDiacritics(raw)}`;
  if (/(đánh|danh)\s*(răng|rang)|(rửa|rua)\s*(mặt|mat)|đi\s*tắm|di\s*tam|tắm\s*rửa|tam\s*rua|tắm\s*gội|tam\s*goi|\btắm\b|(uống|uong)\s*(nước|nuoc)|hít\s*thở|hit\s*tho|(gấp|gap)\s*(chăn|chan)|(mặc|mac)\s*(quần\s*áo|quan\s*ao)|ve\s*sinh\s*ca\s*nhan/i.test(text)) return 'trivial';
  if (/(rửa|rua)\s*(bát|bat|chén|chen|đĩa|dia)|(quét|quet)\s*(nhà|nha)|(đổ|do)\s*(rác|rac)|(lau|dọn|don)\s*(bàn|ban|nhà|nha|sàn|san|phòng|phong|dẹp|dep)/i.test(text)) return 'chore';
  if (/học|hoc|đọc|doc|sách|sach|chương|chuong|ôn\s*thi|on\s*thi|bài\s*tập|bai\s*tap|nghiên\s*cứu|nghien\s*cuu|code|lập\s*trình|lap\s*trinh|kinh\s*tế|kinh\s*te/i.test(text)) return 'study';
  return 'general';
}

export function resolveRewardCategory(origName: string, name: string, origDesc: string, desc: string): string {
  const raw = `${origName} ${name} ${origDesc} ${desc}`.toLowerCase();
  const text = `${raw} ${stripDiacritics(raw)}`;
  if (/(say\s*x[ỉi]n|u[ốo]ng.*(bia|r[ượ]u)|h[úu]t\s*thu[ốo]c|th[âa]u\s*[đd][êe]m|c[ờo]\s*b[ạa]c|c[áa]\s*[đd][ộo]|nh[ậa]u|\d+\s*(lon|chai)\s*(bia|r[ượ]u))/i.test(text)) return 'harmful';
  if (/(ch[ơo]i\s*game|l[ướ][ớo]t\s*(tiktok|facebook|fb|reels|shorts|m[ạa]ng|web)|xem\s*(phim|youtube|video|clip|anime|truy[eề]n)|netflix)/i.test(text)) return 'entertainment';
  return 'general';
}

export function evaluateTextProofHeuristics(title?: string | null, workContent?: string | null): { approved: boolean; feedback: string } | null {
  const normContent = (workContent || '').trim().toLowerCase();

  // 1. Quá ngắn (dưới 10 ký tự)
  if (normContent.length < 10) {
    return {
      approved: false,
      feedback: 'Nội dung báo cáo quá ngắn gọn (yêu cầu tối thiểu 10 ký tự), chưa đủ chi tiết để AI thẩm định kết quả công việc.'
    };
  }

  // 2. Không biết mình đã làm gì / chống chế / vô nghĩa
  const unknownPatterns = /\b(tôi\s*không\s*biết|em\s*không\s*biết|mình\s*không\s*biết|không\s*biết|chẳng\s*biết|chả\s*biết|chua\s*lam|chưa\s*làm|quên\s*rồi|quen\s*roi|không\s*nhớ|khong\s*nho|chịu\s*luôn|chịu|làm\s*gì\s*đó|bla\s*bla)\b/i;
  const lazyDonePatterns = /^(xong|đã\s*xong|xong\s*rồi|ok|done|hoàn\s*thành|rồi\s*nha|test|123456|asdfgh|qwerty)/i;
  const keyboardSmashPatterns = /\b(asdfgh|qwerty|zxcvbn|12345678|aaaaaa|bbbbbb)\b/i;

  if (unknownPatterns.test(normContent) || lazyDonePatterns.test(normContent) || keyboardSmashPatterns.test(normContent)) {
    return {
      approved: false,
      feedback: 'Bạn chưa nêu rõ công việc cụ thể đã làm hoặc nội dung chưa có ý nghĩa thực tế. Vui lòng ghi lại các hành động hoặc kết quả thực tế để được duyệt nhé!'
    };
  }

  return null; // Chuyển cho AI thẩm định chuyên sâu
}

export function extractDurationFromText(text?: string | null): number {
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

export interface DebateOption {
  id: string | number;
  label?: string;
  title?: string;
  text?: string;
  argument?: string;
  newRewardCoins?: number;
  newTargetMinutes?: number;
  newType?: string;
  newTitle?: string;
  newRequiresProof?: boolean;
  newProofType?: string;
  newPrice?: number;
  newTier?: string;
  newName?: string;
  newAmount?: number;
  newBorrowRate?: number;
  newAutoDeductPercent?: number;
  newCreditLimit?: number;
}

export function parseDebateOptionsFromText(text?: string | null, type: string = 'reward'): DebateOption[] {
  if (!text || typeof text !== 'string') return [];
  const lines = text.split('\n');
  const rawOptions: any[] = [];
  let current: any = null;

  const keywordRegex = /^\s*(?:[-*•]|\d+[.)])?\s*(Phương\s*án|Phương\s*thức|Cách|Gợi\s*ý|Lựa\s*chọn|Giải\s*pháp|Hướng|Option|Opt|PA)\s*([1-9]|A|B|C|Một|Hai|Ba)[:.-]?\s*(.*)$/i;
  const numberRegex = /^\s*[-*•]?\s*([1-9])[:.)]\s+(.*)$/i;

  for (const line of lines) {
    const kwMatch = line.match(keywordRegex);
    const numMatch = !kwMatch ? line.match(numberRegex) : null;
    const match = kwMatch || numMatch;

    if (match) {
      if (current) rawOptions.push(current);
      const prefix = kwMatch ? kwMatch[1].trim() : 'Phương án';
      const id = kwMatch ? kwMatch[2] : numMatch![1];
      const rest = (kwMatch ? kwMatch[3] : numMatch![2]).trim();
      current = {
        id,
        title: `${prefix} ${id}`,
        text: rest
      };
    } else if (current && line.trim()) {
      current.text += ` ${line.trim()}`;
    }
  }
  if (current) rawOptions.push(current);

  return rawOptions.map(opt => {
    const fullText = `${opt.title || ''}: ${opt.text || ''}`;
    const duration = extractDurationFromText(fullText);
    const goldMatch = fullText.match(/(\d+)\s*(?:vàng|gold|coins?|xu)\b/i);
    const gold = goldMatch ? parseInt(goldMatch[1], 10) : 0;

    const optResult: DebateOption = {
      id: opt.id,
      label: opt.title,
      argument: opt.text
    };

    if (type === 'quest') {
      if (gold > 0) optResult.newRewardCoins = gold;
      if (duration > 0) optResult.newTargetMinutes = duration;
      if (/bounty|nhanh|không\s*hẹn\s*giờ/i.test(fullText)) optResult.newType = 'bounty';
      else if (/focus|tập\s*trung|hẹn\s*giờ/i.test(fullText)) optResult.newType = 'focus';
      if (/bằng\s*chứng|chụp\s*ảnh|báo\s*cáo/i.test(fullText)) optResult.newRequiresProof = true;
    } else if (type === 'reward') {
      if (gold > 0) optResult.newPrice = gold;
      if (duration > 0) optResult.newTargetMinutes = duration;
    } else if (type === 'loan') {
      if (gold > 0) optResult.newAmount = gold;
      const rateMatch = fullText.match(/(\d+(?:\.\d+)?)\s*%/);
      if (rateMatch) optResult.newBorrowRate = parseFloat(rateMatch[1]) / 100;
    }
    return optResult;
  });
}

export function normalizeDebateOptions(rawOptions: any[], _domain: string = 'quest'): DebateOption[] {
  if (!Array.isArray(rawOptions) || rawOptions.length === 0) return [];
  return rawOptions.map((opt, idx) => ({
    id: opt.id || idx + 1,
    label: opt.label || `Phương án ${idx + 1}`,
    argument: opt.argument || `Chốt phương án ${idx + 1}: ${opt.label || ''}`,
    ...(opt.newRewardCoins !== undefined ? { newRewardCoins: parseInt(opt.newRewardCoins, 10) } : {}),
    ...(opt.newTargetMinutes !== undefined ? { newTargetMinutes: parseInt(opt.newTargetMinutes, 10) } : {}),
    ...(opt.newType ? { newType: opt.newType } : {}),
    ...(opt.newTitle ? { newTitle: opt.newTitle } : {}),
    ...(opt.newRequiresProof !== undefined ? { newRequiresProof: Boolean(opt.newRequiresProof) } : {}),
    ...(opt.newProofType ? { newProofType: opt.newProofType } : {}),
    ...(opt.newPrice !== undefined ? { newPrice: parseInt(opt.newPrice, 10) } : {}),
    ...(opt.newTier ? { newTier: opt.newTier } : {}),
    ...(opt.newName ? { newName: opt.newName } : {}),
    ...(opt.newAmount !== undefined ? { newAmount: parseInt(opt.newAmount, 10) } : {}),
    ...(opt.newBorrowRate !== undefined ? { newBorrowRate: Number(opt.newBorrowRate) } : {}),
    ...(opt.newAutoDeductPercent !== undefined ? { newAutoDeductPercent: Number(opt.newAutoDeductPercent) } : {}),
    ...(opt.newCreditLimit !== undefined ? { newCreditLimit: parseInt(opt.newCreditLimit, 10) } : {})
  }));
}

export function parseAIJsonContent(rawContent: string): any {
  if (!rawContent || typeof rawContent !== 'string') return null;
  const clean = rawContent.trim().replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  try {
    return JSON.parse(clean);
  } catch (_) {
    const match = clean.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (__) {}
    }
  }
  return null;
}

export function sanitizeEvaluatedQuest(
  result: any,
  originalTitle: string = '',
  originalDesc: string = '',
  userRequestedMinutes: number = 0
): any {
  if (!result || typeof result !== 'object') return result;

  const normOrig = (originalTitle || '').trim();
  let title = (result.title || normOrig || '').trim();
  let description = (result.description || originalDesc || '').trim();
  let targetMinutes = parseInt(result.targetMinutes, 10);
  if (isNaN(targetMinutes) || targetMinutes < 0) targetMinutes = result.type === 'bounty' ? 0 : 25;
  let rewardCoins = parseInt(result.rewardCoins, 10);
  if (isNaN(rewardCoins) || rewardCoins <= 0) rewardCoins = 10;
  let type = result.type === 'bounty' ? 'bounty' : 'focus';
  let isModified = Boolean(result.isModified) || Boolean(result.isOverloaded);
  let modificationReason = (result.modificationReason || '').trim();
  let verdict = (result.verdict || '').trim();

  // Semantic category classification (AI-first, deterministic clamping in code)
  const category = (result.category || '').toLowerCase() || resolveCategory(normOrig, title, originalDesc, description);

  // If result came directly from AI model structured output, trust AI decision and enforce safety bounds
  if (result.fromAI) {
    targetMinutes = Math.max(0, Math.min(180, isNaN(targetMinutes) ? 0 : targetMinutes));
    if (type === 'bounty') targetMinutes = 0;
    rewardCoins = Math.max(1, Math.min(60, isNaN(rewardCoins) ? 5 : rewardCoins));
    const requiresProof = Boolean(result.requiresProof);
    const proofType = result.proofType === 'text' ? 'text' : (result.proofType === 'both' ? 'both' : 'photo');
    const proofGuidance = typeof result.proofGuidance === 'string' ? result.proofGuidance.trim() : (requiresProof ? 'Chụp ảnh hoặc viết báo cáo kết quả thực tế.' : '');
    const icon = (result.icon || (type === 'focus' ? '🎯' : '⚔️')).replace(/<[^>]*>/g, '').trim().slice(0, 10);
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
      proofType,
      proofGuidance,
      icon,
      verdict: result.verdict || result.reasoning || 'Nhiệm vụ đã được AI thẩm định thành công.',
      isModified,
      modificationReason
    };
  }

  // Composite search text for multi-chapter / workload context
  const fullMatchRaw = `${normOrig} ${title} ${originalDesc} ${description}`.toLowerCase();
  const fullMatchText = `${fullMatchRaw} ${stripDiacritics(fullMatchRaw)}`;

  const isStudyOrWork = category === 'study' || category === 'work';
  const isTrivialTask = category === 'trivial';
  const isQuickChore = category === 'chore';

  // 1. Trivial personal habits: capped at 2 coins, 0 minutes (unless negotiated)
  if (!result.isNegotiated && isTrivialTask) {
    targetMinutes = 0;
    rewardCoins = Math.min(rewardCoins, 2);
    type = 'bounty';
    isModified = true;
    modificationReason = 'Thói quen sinh hoạt cơ bản, AI áp dụng mức thưởng tượng trưng 1-2 Vàng.';
    verdict = 'Thói quen sinh hoạt cơ bản hàng ngày, áp dụng mức thưởng tượng trưng 1-2 Vàng.';
  }

  // 2. Quick household chores: capped at 5 coins, 0 minutes (unless negotiated)
  if (!result.isNegotiated && isQuickChore && (targetMinutes > 15 || rewardCoins > 5 || type === 'focus')) {
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
  const isCrammedStudy = !result.isNegotiated && isStudyOrWork && (hasMultiChapterInOrig || hasMultiChapterInTitle || Boolean(result.isOverloaded) || mentionsOverload);

  if (isCrammedStudy) {
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

  const textMins = extractDurationFromText(`${normOrig} ${originalDesc}`);
  const explicitReqMins = userRequestedMinutes > 0 ? userRequestedMinutes : textMins;
  const hasValidUserDuration = explicitReqMins >= 10 && explicitReqMins <= 180 && !isTrivialTask && !isCrammedStudy;

  if (hasValidUserDuration && !result.isNegotiated) {
    targetMinutes = explicitReqMins;
    type = 'focus';
    const minCoinsByTime = Math.max(3, Math.round(targetMinutes * 0.28));
    const maxCoinsByTime = Math.max(5, Math.round(targetMinutes * 0.45));
    if (rewardCoins < minCoinsByTime) {
      rewardCoins = Math.max(minCoinsByTime, Math.round(targetMinutes * 0.35));
    } else if (rewardCoins > maxCoinsByTime) {
      rewardCoins = maxCoinsByTime;
    }
  }

  if (!isModified && title.toLowerCase() !== normOrig.toLowerCase()) {
    isModified = true;
    if (!modificationReason) {
      modificationReason = 'AI đã điều chỉnh tên và mô tả để mục tiêu rõ ràng và khả thi hơn.';
    }
  }

  if (type === 'bounty') {
    targetMinutes = 0;
    rewardCoins = Math.min(rewardCoins, result.isNegotiated ? 25 : 10);
  } else {
    targetMinutes = Math.max(result.isNegotiated ? 5 : 10, Math.min(180, targetMinutes));
    const maxCoinsByTime = result.isNegotiated
      ? (targetMinutes <= 25 ? 35 : (targetMinutes <= 50 ? 50 : 60))
      : (targetMinutes <= 25 ? 15 : (targetMinutes <= 50 ? 25 : Math.min(45, Math.round(targetMinutes * 0.45))));
    rewardCoins = Math.max(1, Math.min(maxCoinsByTime, rewardCoins));
  }

  let requiresProof = parseBool(result.requiresProof, false);
  let proofType = result.proofType === 'text' ? 'text' : (result.proofType === 'both' ? 'both' : (result.proofType === 'photo' ? 'photo' : null));
  let proofGuidance = typeof result.proofGuidance === 'string' ? result.proofGuidance.trim() : '';

  const isIntangible = /\b(đi\s*ngủ|di\s*ngu|ngủ\s*đủ|ngu\s*du|thiền|thien\s*dinh|nghe\s*podcast|nghe\s*nhạc|nghe\s*nhac|nhịn\s*ăn|nhin\s*an)\b/i.test(fullMatchText);

  const isHighValueOrDeepWork = rewardCoins >= 15 || (type === 'focus' && targetMinutes >= 25);
  if (!isTrivialTask && !isIntangible && (isHighValueOrDeepWork || isCrammedStudy)) {
    if (!result.isNegotiated) {
      requiresProof = true;
    }
  }

  if (isTrivialTask) {
    requiresProof = false;
    proofGuidance = '';
    proofType = 'photo';
  }

  const isBothProofTask = /\b(bài tập|bai tap|đề thi|de thi|toán|toan|vật lý|vat ly|hóa học|hoa hoc|thí nghiệm|thi nghiem|nấu ăn|nau an|công thức|cong thuc|lắp ráp|lap rap|sửa chữa|sua chua|chế tạo|che tao|mô hình|mo hinh|diy|vẽ tranh|ve tranh|thiết kế|thiet ke)\b/i.test(fullMatchText) && rewardCoins >= 15;

  if (!result.isNegotiated && rewardCoins < 15 && proofType === 'both') {
    proofType = (isStudyOrWork || isCrammedStudy) ? 'text' : 'photo';
  }

  if (requiresProof) {
    if (!proofType) {
      if (isBothProofTask) {
        proofType = 'both';
      } else if (isStudyOrWork || isCrammedStudy) {
        proofType = 'text';
      } else {
        proofType = 'photo';
      }
    }
    if (!proofGuidance) {
      if (proofType === 'both') {
        proofGuidance = 'Chụp ảnh thành phẩm/bài làm thực tế kèm viết tóm tắt các bước hoặc nội dung đã hoàn thành.';
      } else if (proofType === 'text') {
        proofGuidance = 'Ghi lại 2-3 ý cốt lõi, kết quả hoặc bài học rút ra từ phiên làm việc.';
      } else {
        proofGuidance = 'Chụp ảnh kết quả thực tế sau khi bạn hoàn thành nhiệm vụ.';
      }
    }
  } else {
    proofGuidance = '';
    if (!proofType) proofType = 'photo';
  }

  const icon = (result.icon || (type === 'focus' ? '🎯' : '🧹')).replace(/<[^>]*>/g, '').trim().slice(0, 10);

  return {
    ...result,
    title,
    description,
    category,
    type,
    targetMinutes,
    rewardCoins,
    requiresProof: Boolean(result.requiresProof),
    proofType: result.proofType || 'photo',
    icon,
    verdict: verdict || 'Nhiệm vụ đã sẵn sàng.',
    isModified,
    modificationReason
  };
}

export function sanitizeEvaluatedReward(
  result: any,
  originalName: string = '',
  originalDesc: string = '',
  userRequestedDuration: number = 0
): any {
  if (!result || typeof result !== 'object') return result;

  const normOrig = (originalName || '').trim();
  let name = (result.name || normOrig || '').trim();
  let description = (result.description || originalDesc || '').trim();
  let price = parseInt(result.price, 10);
  if (isNaN(price) || price <= 0) price = 25;
  let isModified = Boolean(result.isModified);
  let modificationReason = (result.modificationReason || '').trim();
  let verdict = (result.verdict || '').trim();

  // Semantic category classification (AI-first, deterministic clamping in code)
  const category = (result.category || '').toLowerCase() || resolveRewardCategory(normOrig, name, originalDesc, description);

  // If result came directly from AI model structured output, trust AI decision and enforce safety bounds
  if (result.fromAI) {
    price = Math.max(1, Math.min(500, isNaN(price) ? 25 : price));
    const targetMinutes = Math.max(0, Math.min(360, isNaN(parseInt(result.targetMinutes, 10)) ? 0 : parseInt(result.targetMinutes, 10)));
    const tier = ['common', 'rare', 'epic', 'legendary'].includes(result.tier) ? result.tier : 'common';
    return {
      ...result,
      name,
      description,
      category,
      price,
      targetMinutes,
      tier,
      icon: (result.icon || '🎁').replace(/<[^>]*>/g, '').trim().slice(0, 10),
      verdict: result.verdict || result.reasoning || 'Phần thưởng đã được AI thẩm định thành công.',
      isModified,
      modificationReason
    };
  }

  const isHarmful = category === 'harmful';
  if (isHarmful && (name.toLowerCase() === normOrig.toLowerCase() || /(say\s*x[ỉi]n|\d+\s*(lon|chai)\s*(bia|r[ượ]u))/i.test(name + ' ' + stripDiacritics(name)))) {
    name = 'Thưởng thức 1 ly đồ uống thư giãn cùng bạn bè';
    description = 'Tự thưởng thức đồ uống có chừng mực sau thời gian tập trung làm việc.';
    isModified = true;
    verdict = 'Phần thưởng được tinh chỉnh thành đồ uống lành mạnh để bảo vệ sức khỏe.';
    if (!modificationReason) {
      modificationReason = 'AI đã điều chỉnh phần thưởng để bảo vệ sức khỏe và duy trì năng lượng tích cực.';
    }
  }

  const textDuration = extractDurationFromText(`${normOrig} ${name} ${originalDesc} ${description}`);
  const explicitDuration = userRequestedDuration > 0 ? userRequestedDuration : textDuration;
  let targetMinutes = parseInt(result.targetMinutes, 10);
  if (isNaN(targetMinutes) || targetMinutes < 0) {
    targetMinutes = explicitDuration > 0 ? explicitDuration : 0;
  }

  const icon = (result.icon || '🎁').replace(/<[^>]*>/g, '').trim().slice(0, 10);
  const tier = ['common', 'rare', 'epic', 'legendary'].includes(result.tier) ? result.tier : 'common';

  return {
    ...result,
    name,
    description,
    category,
    price,
    targetMinutes,
    tier,
    icon,
    verdict: verdict || 'Phần thưởng đã được định giá thành công.',
    isModified,
    modificationReason
  };
}

export function sanitizeQuestSuggestions(suggestions: any[], existingQuests: any[] = []): any[] {
  if (!Array.isArray(suggestions)) return [];
  const existingTitles = (existingQuests || []).map(q => (q.title || '').toLowerCase().trim());
  const clean: any[] = [];

  for (const s of suggestions) {
    if (!s || typeof s !== 'object') continue;
    const title = clampStr(s.title || s.name || '', 120);
    if (!title) continue;
    const norm = title.toLowerCase();
    if (existingTitles.includes(norm)) continue;

    const type = (s.type === 'bounty' || s.targetMinutes === 0) ? 'bounty' : 'focus';
    let targetMinutes = parseInt(s.targetMinutes, 10);
    if (isNaN(targetMinutes) || targetMinutes < 0) targetMinutes = (type === 'focus' ? 25 : 0);
    if (type === 'bounty') targetMinutes = 0;
    if (targetMinutes > 180) targetMinutes = 180;

    let rewardCoins = parseInt(s.rewardCoins, 10);
    if (isNaN(rewardCoins) || rewardCoins <= 0) {
      rewardCoins = (type === 'focus') ? Math.max(5, Math.round(targetMinutes * 0.38)) : 4;
    }
    rewardCoins = Math.min(100, Math.max(1, rewardCoins));

    clean.push({
      title,
      description: clampStr(s.description || '', 300),
      type,
      targetMinutes,
      rewardCoins,
      isRepeatable: Boolean(s.isRepeatable),
      icon: clampStr(s.icon || (type === 'focus' ? '🎯' : '🧹'), 10),
      reason: clampStr(s.reason || 'Gợi ý phù hợp với nhịp độ làm việc của bạn.', 250)
    });

    if (clean.length >= 4) break;
  }

  return clean;
}

export function sanitizeRewardSuggestions(suggestions: any[], existingRewards: any[] = []): any[] {
  if (!Array.isArray(suggestions)) return [];
  const existingNames = (existingRewards || []).map(r => (r.name || '').toLowerCase().trim());
  const clean: any[] = [];

  for (const s of suggestions) {
    if (!s || typeof s !== 'object') continue;
    const name = clampStr(s.name || s.title || '', 120);
    if (!name) continue;
    const norm = name.toLowerCase();
    if (existingNames.includes(norm)) continue;

    let price = parseInt(s.price, 10);
    if (isNaN(price) || price <= 0) price = 30;
    price = Math.min(300, Math.max(5, price));

    let targetMinutes = parseInt(s.targetMinutes, 10);
    if (isNaN(targetMinutes) || targetMinutes < 0) targetMinutes = 0;
    if (targetMinutes > 240) targetMinutes = 240;

    let tier = s.tier;
    if (!['common', 'rare', 'epic'].includes(tier)) {
      tier = price < 30 ? 'common' : (price < 60 ? 'rare' : 'epic');
    }

    clean.push({
      name,
      description: clampStr(s.description || '', 300),
      price,
      targetMinutes,
      tier,
      icon: clampStr(s.icon || '🎁', 10),
      reason: clampStr(s.reason || 'Tự thưởng lành mạnh để tái tạo năng lượng.', 250)
    });

    if (clean.length >= 4) break;
  }

  return clean;
}

export const PROJECT_KNOWLEDGE_BASE = {
  name: 'LevelUp - Gamified Productivity & Habit RPG',
  philosophy: 'Biến công việc và thói quen hàng ngày thành chuyến phiêu lưu RPG. Giữ vững tính kỷ luật, công bằng, chống dopamine rẻ tiền và bảo vệ giá trị nỗ lực thực chất.',
  sections: {
    quests: {
      title: 'Hệ Thống Nhiệm Vụ (Quests)',
      content: `1. Nhiệm vụ Tập trung (type: 'focus'):
- Dành cho việc học tập, làm việc sâu, đọc sách, nghiên cứu, viết code, rèn luyện thể lực.
- Có đồng hồ đếm ngược (thường là 15, 20, 25, 45, 50, 60 phút).
- Tỷ lệ thưởng chuẩn: ~0.35 - 0.40 Vàng/phút tập trung (25p ~ 8-10 Vàng, 50p ~ 18-20 Vàng).
- Nhiệm vụ từ 15 Vàng trở lên hoặc phiên tập trung dài bắt buộc phải có bằng chứng hoàn thành (requiresProof: true).

2. Nhiệm vụ Nhanh / Việc nhà (type: 'bounty'):
- Dành cho việc sinh hoạt thường nhật, việc nhà (rửa chén, quét nhà, đổ rác, lau dọn), việc vặt 5-15 phút.
- KHÔNG HẸN GIỜ (targetMinutes = 0). Người dùng làm xong thì bấm nút "Hoàn thành" nhận ngay.
- Thưởng chuẩn: 3 - 5 Vàng. Tối đa cho việc nhà là 5 Vàng.

3. Các hình thức nộp bằng chứng (Proof Types):
- 📸 Chụp ảnh thực tế (photo): Chỉ chụp trực tiếp từ camera điện thoại.
- ✍️ Báo cáo nội dung (text): Nhập chi tiết công việc cụ thể đã làm (tối thiểu 10 ký tự). Có bộ lọc Heuristic chặn đứng spam.
- 📸+✍️ Kết hợp cả hai (both): Vừa chụp ảnh thực tế vừa viết báo cáo giải trình chi tiết.`
    },
    rewards: {
      title: 'Hệ Thống Cửa Hàng & Phần Thưởng (Shop & Rewards)',
      content: `1. Nguyên tắc Kinh tế RPG 3:1 hoặc 4:1 (Bảo vệ giá trị thực):
- Để tận hưởng 1 giờ giải trí xứng đáng, người chơi cần tích lũy 3 - 4 giờ làm việc nghiêm túc.
- Bảng quy đổi chuẩn:
  * Lướt mạng xã hội 30 phút: 25 - 35 Vàng.
  * Chơi game / Xem phim 1 - 2 tiếng: 60 - 90 Vàng.
  * Cốc cà phê / Trà sữa: 40 - 55 Vàng.`
    }
  }
};
