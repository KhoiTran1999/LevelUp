/**
 * Utility functions for Quest Proof Verification & AI Deliberation
 */

export interface DebateOption {
  id: string | number;
  title?: string;
  text?: string;
  label: string;
  argument: string;
  payload?: {
    newRewardCoins?: number;
    newTargetMinutes?: number;
    newType?: 'focus' | 'bounty';
    newRequiresProof?: boolean;
    newTitle?: string;
    newPrice?: number;
    newTier?: 'common' | 'rare' | 'epic' | 'legendary';
    newName?: string;
    newAmount?: number;
    newBorrowRate?: number;
    newAutoDeductPercent?: number;
    newCreditLimit?: number;
  };
  newRewardCoins?: number;
  newTargetMinutes?: number;
  newType?: 'focus' | 'bounty' | string;
  newRequiresProof?: boolean;
  newProofType?: 'photo' | 'text' | 'both';
  newTitle?: string;
  newPrice?: number;
  newTier?: 'common' | 'rare' | 'epic' | 'legendary' | string;
  newName?: string;
  newAmount?: number;
  newBorrowRate?: number;
  newAutoDeductPercent?: number;
  newCreditLimit?: number;
}

/**
 * Strict real-mobile detector. Blocks desktop browsers and DevTools mobile emulation (anti-cheat).
 */
export function isMobilePhone(): boolean {
  if (typeof navigator === 'undefined') return false;

  const nav = navigator as unknown as {
    userAgent?: string;
    vendor?: string;
    userAgentData?: { mobile?: boolean; platform?: string };
    platform?: string;
    maxTouchPoints?: number;
  };

  const ua = nav.userAgent || nav.vendor || '';
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua);
  const isMobileClientHint = Boolean(nav.userAgentData?.mobile);
  // iPadOS 13+ (Safari & Chrome trên iPad gửi UA Macintosh)
  const isIPadOS = (nav.platform === 'MacIntel' || /Macintosh/i.test(ua)) && ((nav.maxTouchPoints || 0) > 1);

  // 1. Must match a mobile UA or client hint or iPadOS
  if (!isMobileUA && !isMobileClientHint && !isIPadOS) return false;

  // --- ANTI-CHEAT DEVTOOLS & DESKTOP SPOOFING GUARDS ---
  // 2. Desktop OS check: Host platform on Windows/Mac/Linux (DevTools keeps host platform)
  const platform = nav.platform || '';
  if (/Win32|Win64|Windows|Linux x86_64/i.test(platform)) {
    return false;
  }
  // MacIntel host check: on desktop Mac running DevTools iPhone mode, platform is MacIntel but touchPoints <= 1
  if (/MacIntel/i.test(platform)) {
    const tp = nav.maxTouchPoints || 0;
    if (tp <= 1) {
      return false;
    }
  }

  // 3. UserAgentData host OS check (Chrome DevTools often leaks host OS)
  const clientPlatform = nav.userAgentData?.platform || '';
  if (/Windows|macOS|Linux/i.test(clientPlatform)) {
    return false;
  }

  // 4. Pointer / Hover hardware check: PC/Laptop mouse is active even in DevTools
  // (Miễn trừ khi là iPad thực thụ có gắn bàn phím/trackpad Magic Keyboard)
  if (!isIPadOS && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    if (window.matchMedia('(any-pointer: fine)').matches && window.matchMedia('(any-hover: hover)').matches) {
      return false;
    }
  }

  // 5. DevTools touch emulation check: Chrome DevTools sets maxTouchPoints = 1
  const touchPoints = nav.maxTouchPoints || 0;
  if (touchPoints === 1) {
    return false;
  }

  // 6. DevTools viewport emulation check: Desktop browser window is much larger than emulated viewport.
  if (typeof window !== 'undefined' && window.outerWidth && window.innerWidth) {
    const dpr = window.devicePixelRatio || 1;
    const normalizedOuterWidth =
      window.outerWidth > window.innerWidth * 1.5 && dpr > 1
        ? window.outerWidth / dpr
        : window.outerWidth;
    if (touchPoints <= 1 && normalizedOuterWidth - window.innerWidth > 120) {
      return false;
    }
  }

  return true;
}

/**
 * Client-side lightweight image compressor via HTML5 Canvas
 */
export function compressImage(file: File, maxWidth = 800, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return reject(new Error('compressImage chỉ hoạt động trong môi trường trình duyệt.'));
    }
    if (!file || !file.type.startsWith('image/')) {
      return reject(new Error('Tệp tải lên không phải là hình ảnh hợp lệ.'));
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không thể đọc tệp hình ảnh.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Không thể phân tích dữ liệu ảnh.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Không thể khởi tạo Canvas 2D context.'));
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Extract target minutes from text
 */
export function extractDurationFromText(text: string): number {
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

/**
 * Parse debate options from AI response text
 */
export function parseDebateOptionsFromText(
  text: string,
  type: 'quest' | 'reward' | 'loan' = 'quest'
): DebateOption[] {
  if (!text || typeof text !== 'string') return [];
  const lines = text.split('\n');
  const rawOptions: Array<{ id: string; title: string; text: string }> = [];
  let current: { id: string; title: string; text: string } | null = null;

  const keywordRegex =
    /^\s*(?:[-*•]|\d+[.)])?\s*(Phương\s*án|Phương\s*thức|Cách|Gợi\s*ý|Lựa\s*chọn|Giải\s*pháp|Hướng|Option|Opt|PA)\s*([1-9]|A|B|C|Một|Hai|Ba)[:.-]?\s*(.*)$/i;
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
        text: rest,
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
    const isBounty = /(?:không\s*(?:cần\s*)?bấm\s*giờ|hoàn\s*thành\s*ngay|bounty)/i.test(opt.text);
    const mentionsProofReq = /(?:cần|yêu\s*cầu|chụp)\s*ảnh/i.test(opt.text);
    const mentionsProofWaive = /(?:miễn|không\s*cần|bỏ)\s*ảnh/i.test(opt.text);

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

    let gold: number | undefined;
    let loanRate: number | undefined;
    let loanDeduct: number | undefined;
    let loanLimit: number | undefined;

    if (type === 'loan') {
      const loanGoldMatch =
        opt.text.match(/(?:vay|mức\s*vay|khoản\s*vay|số\s*vàng(?:\s*vay)?|còn)[:\s]*(\d+)\s*vàng/i) ||
        opt.text.match(/(\d+)\s*vàng/i);
      if (loanGoldMatch) gold = parseInt(loanGoldMatch[1], 10);

      const rateMatch =
        opt.text.match(/(?:lãi\s*suất|lãi|phí)[:\s]*(\d+(?:[.,]\d+)?)\s*%/i) ||
        opt.text.match(/(\d+(?:[.,]\d+)?)\s*%(?:\/ngày)?/i);
      if (rateMatch) loanRate = parseFloat(rateMatch[1].replace(',', '.')) / 100;

      const deductMatch = opt.text.match(/(?:trích|trích\s*nợ|tỷ\s*lệ)[:\s]*(\d+)\s*%/i);
      if (deductMatch) loanDeduct = parseInt(deductMatch[1], 10) / 100;

      const limitMatch = opt.text.match(/(?:hạn\s*mức(?:\s*(?:lên|mới))?|cấp\s*hạn\s*mức)[:\s]*(\d+)\s*vàng/i);
      if (limitMatch) loanLimit = parseInt(limitMatch[1], 10);
    } else {
      const explicitPriceMatch = opt.text.match(
        /(?:mức\s*giá|giá(?:\s*vàng)?|giảm\s*(?:còn|xuống)|đổi\s*(?:ngay\s*)?(?:với\s*)?(?:mức\s*)?giá)[:\s]*(\d+)\s*vàng/i
      );
      if (explicitPriceMatch) {
        gold = parseInt(explicitPriceMatch[1], 10);
      } else if (type === 'quest') {
        const questCoinMatch =
          opt.text.match(/(?:thưởng|mức\s*thưởng|nâng\s*lên|tăng\s*lên|giảm\s*xuống)[:\s]*(\d+)\s*vàng/i) ||
          opt.text.match(/(\d+)\s*vàng/i);
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
      if (
        candidate.length >= 3 &&
        !/^\s*\d+\s*(?:vàng|phút|tiếng|giờ|min|p)\s*$/i.test(candidate) &&
        !/^\s*mức\s*giá/i.test(candidate)
      ) {
        newName = candidate;
      }
    }

    let label = opt.title;
    const details: string[] = [];
    if (type === 'loan') {
      if (gold !== undefined) details.push(`Vay ${gold} Vàng`);
      if (loanRate !== undefined) details.push(`Lãi ${(loanRate * 100).toFixed(1)}%/ngày`);
      if (loanDeduct !== undefined) details.push(`Trích ${(loanDeduct * 100).toFixed(0)}%`);
      if (loanLimit !== undefined) details.push(`Hạn mức ${loanLimit} Vàng`);
    } else {
      if (mins > 0) {
        details.push(`${mins} phút`);
      } else if (isBounty) {
        details.push('Không cần bấm giờ');
      }
      if (gold !== undefined) details.push(`${gold} Vàng`);
      if (type === 'quest') {
        if (mentionsProofReq) details.push('Cần ảnh');
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

    const payload: DebateOption['payload'] = {};
    if (type === 'loan') {
      if (gold !== undefined) payload.newAmount = gold;
      if (loanRate !== undefined) payload.newBorrowRate = loanRate;
      if (loanDeduct !== undefined) payload.newAutoDeductPercent = loanDeduct;
      if (loanLimit !== undefined) payload.newCreditLimit = loanLimit;
    } else if (type === 'reward') {
      if (gold !== undefined) payload.newPrice = gold;
      if (mins > 0) payload.newTargetMinutes = mins;
      else if (isBounty) payload.newTargetMinutes = 0;
      if (gold !== undefined && gold < 30) payload.newTier = 'common';
      if (newName) payload.newName = newName;
    } else {
      if (gold !== undefined) payload.newRewardCoins = gold;
      if (mins > 0) {
        payload.newTargetMinutes = mins;
        payload.newType = 'focus';
      } else if (isBounty) {
        payload.newTargetMinutes = 0;
        payload.newType = 'bounty';
      }
      if (mentionsProofReq) payload.newRequiresProof = true;
      else if (mentionsProofWaive) payload.newRequiresProof = false;
      if (newName) payload.newTitle = newName;
    }

    return {
      id: opt.id,
      title: opt.title,
      text: opt.text,
      label,
      argument,
      payload,
    };
  });
}

/**
 * Server-Sent Events (SSE) stream reader for real-time AI deliberation
 */
export async function fetchDebateStream<T = unknown>(
  url: string,
  options: RequestInit,
  onStep?: (step: { step?: string; text?: string; description?: string }) => void
): Promise<T> {
  const fetchOptions: RequestInit = {
    credentials: 'include',
    ...options,
  };
  const res = await fetch(url, fetchOptions);
  if (!res.ok) {
    let errJson: { error?: string } | null = null;
    try {
      errJson = await res.json();
    } catch {
      // ignore
    }
    throw new Error(errJson?.error || `HTTP ${res.status}`);
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('text/event-stream')) {
    return (await res.json()) as T;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error('ReadableStream không được hỗ trợ trên môi trường này.');
  }

  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let finalResult: T | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() || '';

    for (const part of parts) {
      if (!part.trim()) continue;
      const lines = part.split('\n');
      let event = 'message';
      let dataStr = '';
      for (const line of lines) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) dataStr += line.slice(5).trim();
      }
      if (dataStr) {
        try {
          const parsed = JSON.parse(dataStr);
          if (event === 'step') {
            if (typeof onStep === 'function') onStep(parsed);
          } else if (event === 'result') {
            finalResult = parsed;
          } else if (event === 'error') {
            throw new Error(parsed?.error || 'Lỗi xử lý luồng AI');
          }
        } catch (e) {
          if (event === 'error') throw e;
        }
      }
    }
  }

  // ponytail: Flush trailing buffer if stream closes without trailing \n\n. Upgrade path: standard EventSource.
  if (buffer.trim()) {
    const lines = buffer.split('\n');
    let event = 'message';
    let dataStr = '';
    for (const line of lines) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) dataStr += line.slice(5).trim();
    }
    if (dataStr) {
      try {
        const parsed = JSON.parse(dataStr);
        if (event === 'step') {
          if (typeof onStep === 'function') onStep(parsed);
        } else if (event === 'result') {
          finalResult = parsed;
        } else if (event === 'error') {
          throw new Error(parsed?.error || 'Lỗi xử lý luồng AI');
        }
      } catch (e) {
        if (event === 'error') throw e;
      }
    }
  }

  if (!finalResult) {
    throw new Error('Không nhận được dữ liệu kết quả từ luồng streaming.');
  }
  return finalResult;
}
