/**
 * AI Appraisal, Heuristics, Sanitizers & Telemetry Engine
 * Strongly typed in TypeScript for Next.js 16 server architecture
 */

import { calculateBankRates } from '@/lib/server/bank-math';
import type { DebateOption } from './types';

export function calculateRank(coins: number, _duration: number = 0): string {
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

    const isBounty = /(?:không\s*(?:cần\s*)?bấm\s*giờ|khong\s*(?:can\s*)?bam\s*gio|hoàn\s*thành\s*ngay|hoan\s*thanh\s*ngay|\bbounty\b)/i.test(opt.text);
    const mentionsBoth = /(?:kết\s*hợp|cả\s*hai|cả\s*ảnh[\s\S]{1,40}(?:báo\s*cáo|tóm\s*tắt|viết)|vừa\s*chụp.*vừa|ảnh\s*(?:kèm|\+|và)\s*(?:báo\s*cáo|tóm\s*tắt|viết))/i.test(opt.text);
    const mentionsText = !mentionsBoth && /(?:báo\s*cáo(?:\s*nội\s*dung)?|viết\s*(?:báo\s*cáo|tóm\s*tắt)|tóm\s*tắt(?:\s*nội\s*dung)?)/i.test(opt.text);
    const mentionsPhoto = !mentionsBoth && /(?:chụp\s*ảnh|bằng\s*chứng\s*ảnh)/i.test(opt.text) && !/(?:miễn|không\s*cần)\s*(?:chụp\s*)?ảnh/i.test(opt.text);
    const mentionsProofWaive = /(?:miễn|không\s*cần|bỏ\s*(?:yêu\s*cầu)?)\s*(?:chụp\s*ảnh|bằng\s*chứng|xác\s*thực)/i.test(opt.text);
    if (isBounty) mins = 0;

    let gold: number | undefined;
    let rate: number | undefined;
    let deduct: number | undefined;
    let limit: number | undefined;

    if (type === 'loan') {
      const loanGoldMatch = opt.text.match(/(?:vay|mức\s*vay|khoản\s*vay|số\s*vàng(?:\s*vay)?|còn)[:\s]*(\d+)\s*vàng/i) || opt.text.match(/(\d+)\s*vàng/i);
      if (loanGoldMatch) gold = parseInt(loanGoldMatch[1], 10);

      const rateMatch = opt.text.match(/(?:lãi\s*suất|lãi|phí)[:\s]*(\d+(?:[.,]\d+)?)\s*%/i) || opt.text.match(/(\d+(?:[.,]\d+)?)\s*%(?:\/ngày)?/i);
      if (rateMatch) rate = parseFloat(rateMatch[1].replace(',', '.')) / 100;

      const deductMatch = opt.text.match(/(?:trích|trích\s*nợ|tỷ\s*lệ)[:\s]*(\d+)\s*%/i);
      if (deductMatch) deduct = parseInt(deductMatch[1], 10) / 100;

      const limitMatch = opt.text.match(/(?:hạn\s*mức(?:\s*(?:lên|mới))?|cấp\s*hạn\s*mức)[:\s]*(\d+)\s*vàng/i);
      if (limitMatch) limit = parseInt(limitMatch[1], 10);
    } else {
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
    }

    let newName: string | undefined;
    const nameMatch = opt.text.match(/(?:thành|tên\s*(?:mới\s*)?(?:là)?)\s*["“]?([^"”\n,.]+?)["”]?\s*(?:nha|nhé|nè|\.|$)/i);
    if (nameMatch) {
      const candidate = nameMatch[1].trim();
      if (candidate.length >= 3 && !/^\s*\d+\s*(?:vàng|phút|tiếng|giờ|min|p)\s*$/i.test(candidate) && !/^\s*mức\s*giá/i.test(candidate)) {
        newName = candidate;
      }
    }

    let label = opt.title;
    const details: string[] = [];
    if (type === 'loan') {
      if (gold !== undefined) details.push(`Vay ${gold} Vàng`);
      if (rate !== undefined) details.push(`Lãi ${(rate * 100).toFixed(1)}%/ngày`);
      if (deduct !== undefined) details.push(`Trích ${Math.round(deduct * 100)}%`);
      if (limit !== undefined) details.push(`Hạn mức ${limit} Vàng`);
    } else {
      if (mins > 0) {
        details.push(`${mins} phút`);
      } else if (isBounty) {
        details.push('Không cần bấm giờ');
      }
      if (gold !== undefined) details.push(`${gold} Vàng`);
      if (type === 'quest') {
        if (mentionsBoth) details.push('Cần ảnh & báo cáo');
        else if (mentionsText) details.push('Báo cáo nội dung');
        else if (mentionsPhoto) details.push('Cần ảnh');
        else if (mentionsProofWaive) details.push('Miễn ảnh');
      }
    }
    if (details.length > 0) {
      label += ` (${details.join(' • ')})`;
    } else if (opt.text.length < 40) {
      label += `: ${opt.text}`;
    }

    let argument = `Chốt ${opt.title.toLowerCase()}`;
    if (details.length > 0) {
      argument += `: ${details.join(', ')}`;
    }

    const payload: Record<string, any> = {};
    if (type === 'reward') {
      if (gold !== undefined) payload.newPrice = gold;
      if (mins > 0) payload.newTargetMinutes = mins;
      else if (isBounty) payload.newTargetMinutes = 0;
      if (gold !== undefined && gold < 30) payload.newTier = 'common';
      if (newName) payload.newName = newName;
    } else if (type === 'loan') {
      if (gold !== undefined) payload.newAmount = gold;
      if (rate !== undefined) payload.newBorrowRate = rate;
      if (deduct !== undefined) payload.newAutoDeductPercent = deduct;
      if (limit !== undefined) payload.newCreditLimit = limit;
    } else {
      if (gold !== undefined) payload.newRewardCoins = gold;
      if (mins > 0) {
        payload.newTargetMinutes = mins;
        payload.newType = 'focus';
      } else if (isBounty) {
        payload.newTargetMinutes = 0;
        payload.newType = 'bounty';
      }
      if (mentionsBoth) {
        payload.newRequiresProof = true;
        payload.newProofType = 'both';
      } else if (mentionsText) {
        payload.newRequiresProof = true;
        payload.newProofType = 'text';
      } else if (mentionsPhoto) {
        payload.newRequiresProof = true;
        payload.newProofType = 'photo';
      } else if (mentionsProofWaive) {
        payload.newRequiresProof = false;
      }
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
  let type = (result.type || 'focus').toLowerCase();
  let targetMinutes = parseInt(result.targetMinutes, 10);
  if (isNaN(targetMinutes) || targetMinutes < 0) targetMinutes = 25;
  let rewardCoins = parseInt(result.rewardCoins, 10);
  if (isNaN(rewardCoins) || rewardCoins < 0) rewardCoins = 10;
  let isModified = Boolean(result.isModified);
  let modificationReason = (result.modificationReason || '').trim();
  let verdict = (result.verdict || '').trim();

  const category = (result.category || '').toLowerCase() || resolveCategory(normOrig, title, originalDesc, description);

  const fullMatchText = `${normOrig} ${title} ${originalDesc} ${description}`;
  const isTrivialTask = category === 'trivial';
  const isChore = category === 'chore';
  const isStudyOrWork = category === 'study';

  if (isTrivialTask && !result.isNegotiated) {
    isModified = true;
    modificationReason = 'Thói quen sinh hoạt cơ bản bị áp chế tài chống lạm phát (loại bỏ cày cuốc vi mô).';
    verdict = 'Thói quen tối thiểu cá nhân không được tính điểm cày cuốc (0 phút, 1-2 Vàng).';
    type = 'bounty';
    targetMinutes = 0;
    rewardCoins = Math.min(2, Math.max(1, rewardCoins));
  } else if (isChore && !result.isNegotiated) {
    if (type === 'focus' || targetMinutes > 0) {
      isModified = true;
      modificationReason = 'Việc nhà thông thường được chuyển thành Nhiệm vụ Nhanh (Bounty) để tránh bơm phồng giờ ảo.';
      verdict = 'Việc nhà ngắn gọn được chuẩn hóa về Nhiệm vụ Nhanh (3-5 Vàng).';
    }
    type = 'bounty';
    targetMinutes = 0;
    rewardCoins = Math.min(5, Math.max(3, rewardCoins));
  }

  const hasMultiChapterInOrig = /([2-9]|\d{2,})\s*(chương|chuong|bài|bai|phần|phan)/i.test(normOrig);
  const hasMultiChapterInTitle = /([2-9]|\d{2,})\s*(chương|chuong|bài|bai|phần|phan)/i.test(title);
  const mentionsOverload = /quá\s*tải|chia\s*nhỏ|nhiều\s*chương|quá\s*nhiều/i.test(`${result.modificationReason || ''} ${result.verdict || ''}`);
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
    requiresProof: Boolean(requiresProof),
    proofType: proofType || 'photo',
    proofGuidance,
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
  const isNegotiated = Boolean(result.isNegotiated);

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

  // Sanitize target enjoyment duration in minutes (0 means instant/no countdown, up to 360 mins)
  const textDuration = extractDurationFromText(`${normOrig} ${name} ${originalDesc} ${description}`);
  const explicitDuration = userRequestedDuration > 0 ? userRequestedDuration : textDuration;
  let targetMinutes = parseInt(result.targetMinutes, 10);
  if (isNaN(targetMinutes) || targetMinutes < 0) {
    targetMinutes = 0;
  }
  // Tôn trọng thời gian người dùng yêu cầu cụ thể nếu hợp lý (10 - 360 phút)
  if (explicitDuration >= 10 && explicitDuration <= 360 && !isNegotiated) {
    targetMinutes = explicitDuration;
  } else if (textDuration > 0 && (targetMinutes === 0 || !isNegotiated)) {
    targetMinutes = textDuration;
  } else if (targetMinutes === 0 && isEntertainment && !isNegotiated) {
    targetMinutes = 30; // default for entertainment activity without explicit duration
  }
  targetMinutes = Math.max(0, Math.min(360, targetMinutes));

  // Tỷ lệ công sức 3:1 hoặc 4:1 cho hoạt động giải trí theo thời gian
  if (isEntertainment && !isNegotiated) {
    let fairMinPrice = 30;
    if (targetMinutes > 0 && targetMinutes <= 20) {
      fairMinPrice = 20;
    } else if (targetMinutes > 20 && targetMinutes <= 35) {
      fairMinPrice = 30;
    } else if (targetMinutes > 35 && targetMinutes <= 60) {
      fairMinPrice = 50;
    } else if (targetMinutes > 60 && targetMinutes <= 90) {
      fairMinPrice = 70;
    } else if (targetMinutes > 90) {
      fairMinPrice = Math.min(300, Math.round(targetMinutes * 0.8));
    }

    if (price < fairMinPrice) {
      price = fairMinPrice;
      isModified = true;
      verdict = `Định giá ${price} Vàng cho ${targetMinutes} phút giải trí để đảm bảo nỗ lực tương xứng.`;
      if (!modificationReason) {
        modificationReason = `AI đã điều chỉnh giá lên ${price} Vàng tương ứng với ${targetMinutes} phút giải trí.`;
      }
    }
  }

  if (!isModified && name.toLowerCase() !== normOrig.toLowerCase()) {
    isModified = true;
    if (!modificationReason) {
      modificationReason = 'AI đã tối ưu lại phần thưởng để lành mạnh và công bằng hơn.';
    }
  }

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
  } else if (isEntertainment && targetMinutes > 0 && targetMinutes <= 20 && tier !== 'legendary' && tier !== 'epic') {
    tier = 'common';
  }

  const tierMin: Record<string, number> = { common: 15, rare: 30, epic: 70, legendary: 250 };
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

/**
 * Macro Telemetry for Internal Bank & AMM
 */
export function analyzeMacroTelemetry(poolState: any = {}): any {
  const rates = calculateBankRates(poolState);
  const p = Math.max(0, parseInt(poolState?.poolGold, 10) || 0);
  const b = Math.max(0, parseInt(poolState?.totalBorrowed, 10) || 0);
  const reserve = Math.max(0, parseInt(poolState?.reserveFund, 10) || 0);
  const bailout = Math.max(0, parseInt(poolState?.bailoutDebt, 10) || 0);
  const totalDep = Math.max(0, parseInt(poolState?.totalDeposited, 10) || 0);

  // Classify internal liquidity stance
  let liquidityStatus = 'normal'; // 'abundant' | 'normal' | 'tight'
  if (bailout > 0 || rates.utilization > 0.75 || reserve < 50) {
    liquidityStatus = 'tight';
  } else if (rates.utilization < 0.40 && p >= 300 && bailout === 0) {
    liquidityStatus = 'abundant';
  }

  const depositFloor = Math.max(0.02, rates.depositRate);

  return {
    ...rates,
    poolGold: p,
    totalBorrowed: b,
    reserveFund: reserve,
    bailoutDebt: bailout,
    totalDeposited: totalDep,
    liquidityStatus,
    depositFloor
  };
}
