/**
 * AI Tools & Negotiation Engine
 * Includes schemas, handlers, deterministic debate engines, and single-turn deliberation agent.
 */

import { isDbConfigured } from '@/src/db/index.js';
import { getUserById } from '@/src/db/repositories/userRepository.js';
import { getBankPoolState as getDbBankPoolState } from '@/src/db/repositories/bankRepository.js';
import { getUserCloudData } from '@/lib/server/user-state';
import { getGlobalBankState } from '@/lib/server/bank-service';
import { signQuest, signReward, signLoanOffer } from '@/lib/server/crypto';
import { calculateCreditLimit } from '@/lib/server/bank-math';
import {
  analyzeMacroTelemetry,
  sanitizeEvaluatedQuest,
  sanitizeEvaluatedReward,
  parseDebateOptionsFromText
} from './appraisal';
import { callAI, normalizeDebateOptions } from './client';
import type { OpenAITool, DebateOption } from './types';

export const TOOL_GET_MY_USER_DATA: OpenAITool = {
  type: 'function',
  function: {
    name: 'get_my_user_data',
    description: 'Tra cứu thông tin hồ sơ của người chơi hiện tại đang thương lượng (chỉ đọc dữ liệu của chính người chơi này). Giúp AI nắm số Vàng, chuỗi chăm chỉ, cấp độ, danh sách việc hoặc nợ để thương lượng hợp lý.',
    parameters: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['all', 'profile', 'quests', 'shop_items', 'bank_and_debt', 'ledger'],
          description: 'Nhóm dữ liệu cần xem: profile (cấp, vàng, chuỗi), quests (danh sách việc), shop_items (quà), bank_and_debt (tiết kiệm, nợ), ledger (lịch sử), all (tất cả)'
        }
      },
      required: ['category']
    }
  }
};

export const TOOL_GET_BANK_MARKET_STATUS: OpenAITool = {
  type: 'function',
  function: {
    name: 'get_bank_market_status',
    description: 'Tra cứu trạng thái kho bạc ngân hàng (lãi suất sàn bảo vệ, lãi suất thị trường chuẩn, tình trạng thanh khoản dồi dào hay thắt chặt).',
    parameters: {
      type: 'object',
      properties: {}
    }
  }
};

export const TOOL_UPDATE_QUEST_PARAMETERS: OpenAITool = {
  type: 'function',
  function: {
    name: 'update_quest_parameters',
    description: 'Thực hiện hành động cập nhật và chốt thông số nhiệm vụ sau khi đạt thỏa thuận với người dùng. Tự động tính chữ ký số bảo mật HMAC.',
    parameters: {
      type: 'object',
      properties: {
        accepted: { type: 'boolean', description: 'true nếu đồng ý thỏa thuận, false nếu từ chối' },
        reply: { type: 'string', description: 'Lời phản hồi thân thiện, ấm áp, giải thích bằng tiếng Việt đời thường, tuyệt đối không dùng thuật ngữ kỹ thuật' },
        newRewardCoins: { type: 'number', description: 'Số Vàng thưởng sau thỏa thuận' },
        newTargetMinutes: { type: 'number', description: 'Số phút đếm giờ: 0 cho việc không cần bấm giờ, 15, 25, 50 cho việc hẹn giờ tập trung' },
        newType: { type: 'string', enum: ['focus', 'bounty'], description: 'focus: việc hẹn giờ tập trung; bounty: việc không cần bấm giờ' },
        newTitle: { type: 'string', description: 'Tên nhiệm vụ mới nếu có điều chỉnh' },
        newDescription: { type: 'string', description: 'Mô tả nhiệm vụ' },
        newRequiresProof: { type: 'boolean', description: 'true nếu yêu cầu bằng chứng (ảnh hoặc chữ), false nếu miễn hoàn toàn bằng chứng' },
        newProofType: { type: 'string', enum: ['photo', 'text', 'both'], description: 'Hình thức xác thực: "photo" (chụp ảnh), "text" (báo cáo nội dung văn bản), "both" (kết hợp cả ảnh và báo cáo). BẮT BUỘC TRUYỀN khi người dùng đề xuất hoặc thỏa thuận về hình thức nộp bằng chứng' },
        newProofGuidance: { type: 'string', description: 'Hướng dẫn nộp bằng chứng nếu có yêu cầu (đặc biệt khi chọn "both" hoặc "text")' },
        newIsRepeatable: { type: 'boolean', description: 'Tần suất thực hiện: true nếu lặp lại nhiều lần/hằng ngày, false nếu làm một lần' },
        newCategory: { type: 'string', enum: ['study', 'work', 'fitness', 'chore', 'habit', 'trivial'] }
      },
      required: ['accepted', 'reply']
    }
  }
};

export const TOOL_UPDATE_REWARD_PARAMETERS: OpenAITool = {
  type: 'function',
  function: {
    name: 'update_reward_parameters',
    description: 'Thực hiện hành động cập nhật và chốt giá Vàng cùng thời gian của phần thưởng Cửa Hàng sau khi thương lượng.',
    parameters: {
      type: 'object',
      properties: {
        accepted: { type: 'boolean', description: 'true nếu đồng ý điều chỉnh, false nếu từ chối giữ nguyên' },
        reply: { type: 'string', description: 'Lời phản hồi ân cần, giải thích giá trị món quà, khích lệ người chơi' },
        newPrice: { type: 'number', description: 'Mức giá Vàng sau khi chốt' },
        newTargetMinutes: { type: 'number', description: 'Thời gian tận hưởng (phút), 0 nếu nhận ngay không cần đếm giờ' },
        newTier: { type: 'string', enum: ['common', 'rare', 'epic', 'legendary'] },
        newName: { type: 'string', description: 'Tên phần thưởng mới nếu có đổi' },
        newDescription: { type: 'string', description: 'Mô tả phần thưởng' },
        newCategory: { type: 'string', enum: ['entertainment', 'treat', 'item', 'milestone', 'harmful'] }
      },
      required: ['accepted', 'reply']
    }
  }
};

export const TOOL_UPDATE_LOAN_TERMS: OpenAITool = {
  type: 'function',
  function: {
    name: 'update_loan_terms',
    description: 'Thực hiện hành động phê duyệt hoặc điều chỉnh gói vay vốn ngân hàng cho người dùng.',
    parameters: {
      type: 'object',
      properties: {
        accepted: { type: 'boolean', description: 'true nếu chấp thuận ưu đãi, false nếu giữ nguyên hoặc từ chối' },
        reply: { type: 'string', description: 'Lời phản hồi tâm lý, khen ngợi tinh thần làm việc, giải thích ân cần' },
        newAmount: { type: 'number', description: 'Số Vàng vay được duyệt' },
        newBorrowRate: { type: 'number', description: 'Lãi suất ngày dạng số thập phân, ví dụ 0.03 cho 3%/ngày' },
        newAutoDeductPercent: { type: 'number', description: 'Tỷ lệ trích nợ dạng thập phân, ví dụ 0.50 cho 50%, 0.60 cho 60%' },
        newCreditLimit: { type: 'number', description: 'Hạn mức tín dụng được cấp' }
      },
      required: ['accepted', 'reply']
    }
  }
};

export const TOOL_SUGGEST_NEGOTIATION_OPTIONS: OpenAITool = {
  type: 'function',
  function: {
    name: 'suggest_negotiation_options',
    description: 'Tạo danh sách 2-3 nút bấm phương án lựa chọn khi người chơi cần phương án thay thế hoặc chưa thống nhất được.',
    parameters: {
      type: 'object',
      properties: {
        domain: { type: 'string', enum: ['quest', 'reward', 'loan'] },
        reply: { type: 'string', description: 'Lời dẫn giải thích các phương án cho bạn ấy' },
        options: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              label: { type: 'string', description: 'Tên phương án hiển thị trên nút bấm (kèm Vàng / thời gian / lãi)' },
              argument: { type: 'string', description: 'Câu chốt khi bấm nút' },
              newRewardCoins: { type: 'number' },
              newTargetMinutes: { type: 'number' },
              newType: { type: 'string', enum: ['focus', 'bounty'] },
              newRequiresProof: { type: 'boolean' },
              newPrice: { type: 'number' },
              newTier: { type: 'string' },
              newAmount: { type: 'number' },
              newBorrowRate: { type: 'number' },
              newAutoDeductPercent: { type: 'number' },
              newCreditLimit: { type: 'number' }
            },
            required: ['id', 'label', 'argument']
          }
        }
      },
      required: ['domain', 'reply', 'options']
    }
  }
};

export async function handleGetMyUserData(category: string = 'all', callerSub?: string | null, redis?: any, draftContext: any = {}): Promise<any> {
  if (!callerSub) {
    return { error: 'Không xác định được danh tính người chơi.' };
  }

  let cloud: any = null;
  if (isDbConfigured() && callerSub) {
    try {
      cloud = await getUserById(callerSub);
    } catch (_) {}
  }
  if (!cloud && redis && callerSub) {
    cloud = await getUserCloudData(redis, callerSub);
  }

  const profile = cloud?.profile || draftContext.profile || {};
  const quests = (cloud?.quests && cloud.quests.length > 0) ? cloud.quests : (draftContext.quests || []);
  const shopItems = (cloud?.shopItems && cloud.shopItems.length > 0) ? cloud.shopItems : (draftContext.shopItems || []);
  const bank = profile.bank || cloud?.bank || draftContext.bank || { deposited: 0, depositInterest: 0, loan: null };
  const ledger = (cloud?.ledger && cloud.ledger.length > 0) ? cloud.ledger.slice(0, 8) : [];

  switch (category) {
    case 'profile':
      return {
        level: profile.level || 1,
        coins: profile.coins || 0,
        streak: profile.streak || 0,
        title: profile.title || 'Tập Sự',
        nickname: profile.nickname || 'Hiệp Sĩ'
      };
    case 'quests':
      return {
        activeQuests: quests.filter((q: any) => q.status === 'active' || !q.completed).slice(0, 6).map((q: any) => ({
          title: q.title,
          type: q.type,
          targetMinutes: q.targetMinutes,
          rewardCoins: q.rewardCoins,
          requiresProof: Boolean(q.requiresProof)
        })),
        totalQuests: quests.length
      };
    case 'shop_items':
      return {
        shopItems: shopItems.slice(0, 6).map((s: any) => ({
          name: s.name,
          price: s.price,
          tier: s.tier,
          targetMinutes: s.targetMinutes || 0
        }))
      };
    case 'bank_and_debt':
      return {
        coins: profile.coins || 0,
        deposited: bank.deposited || 0,
        depositInterest: bank.depositInterest || 0,
        loan: bank.loan ? {
          amount: bank.loan.amount || bank.loan.principal || bank.loan.debt || 0,
          principal: bank.loan.principal || bank.loan.amount || 0,
          debt: bank.loan.debt || bank.loan.amount || 0,
          borrowRate: bank.loan.borrowRate,
          autoDeductPercent: bank.loan.autoDeductPercent,
          isOverdue: Boolean(bank.loan.isOverdue)
        } : null,
        isFrozen: Boolean(bank.isFrozen)
      };
    case 'ledger':
      return {
        recentTransactions: ledger.map((l: any) => ({
          type: l.type,
          amount: l.amount,
          category: l.category || l.description,
          title: l.title
        }))
      };
    case 'all':
    default:
      return {
        profile: {
          level: profile.level || 1,
          coins: profile.coins || 0,
          streak: profile.streak || 0,
          title: profile.title || 'Tập Sự'
        },
        currentQuestsCount: quests.length,
        currentShopCount: shopItems.length,
        hasActiveLoan: Boolean(bank.loan),
        coins: profile.coins || 0
      };
  }
}

export async function handleGetBankMarketStatus(redis?: any, callerSub?: string | null, draftProfile: any = {}): Promise<any> {
  let poolState: any = null;
  if (isDbConfigured()) {
    try {
      poolState = await getDbBankPoolState();
    } catch (_) {}
  }
  if (!poolState && redis) {
    poolState = await getGlobalBankState(redis);
  }
  poolState = poolState || {};
  const macro = analyzeMacroTelemetry(poolState);
  let creditLimit = 50;
  if (callerSub) {
    let cloud: any = null;
    if (isDbConfigured()) {
      try {
        cloud = await getUserById(callerSub);
      } catch (_) {}
    }
    if (!cloud && redis) {
      cloud = await getUserCloudData(redis, callerSub);
    }
    const profile = cloud?.profile || draftProfile || {};
    creditLimit = calculateCreditLimit(profile, 0.5);
  }
  return {
    depositFloor: macro.depositFloor,
    standardBorrowRate: macro.borrowRate,
    liquidityStatus: macro.liquidityStatus,
    userCreditLimit: creditLimit
  };
}

export function handleUpdateQuestParameters(params: any = {}, quest: any = {}, userArgument: string = ''): any {
  const accepted = Boolean(params.accepted);
  let cleanReward = quest.rewardCoins;
  let cleanMinutes = quest.targetMinutes;
  let cleanType = quest.type;
  let cleanProof = quest.requiresProof;
  let cleanProofType = quest.proofType || 'photo';
  let cleanTitle = params.newTitle || quest.title || 'Nhiệm vụ mới';
  let cleanDesc = params.newDescription !== undefined ? params.newDescription : (quest.description || '');

  const combinedText = `${userArgument || ''} ${params.reply || ''}`;
  const wantsBoth = /(?:kết\s*hợp|cả\s*hai|cả\s*ảnh[\s\S]{1,60}(?:báo\s*cáo|tóm\s*tắt|viết)|vừa\s*(?:chụp\s*)?ảnh[\s\S]{1,60}vừa\s*(?:báo\s*cáo|tóm\s*tắt|viết)|vừa\s*chụp[\s\S]{1,60}vừa\s*(?:viết|báo|tóm)|ảnh\s*(?:kèm|\+|và)\s*(?:báo\s*cáo|tóm\s*tắt|viết)|(?:báo\s*cáo|tóm\s*tắt|viết)\s*(?:kèm|\+)\s*ảnh)/i.test(combinedText);
  const wantsPhoto = !wantsBoth && /(?:đổi\s*sang|chuyển\s*sang|chỉ\s*(?:cần\s*)?|thay\s*bằng|muốn|xin)\s*(?:chụp\s*ảnh(?:\s*thực\s*tế)?|bằng\s*chứng\s*ảnh)|(?:chụp\s*ảnh(?:\s*thực\s*tế)?|bằng\s*chứng\s*ảnh)\s*(?:thôi|được\s*không|thay\s*vì)/i.test(combinedText) && !/(?:không\s*cần|miễn)\s*(?:chụp\s*ảnh|bằng\s*chứng)/i.test(combinedText);
  const wantsText = !wantsBoth && /(?:đổi\s*sang|chuyển\s*sang|chỉ\s*(?:cần\s*)?|thay\s*bằng|muốn|xin)\s*(?:nộp\s*)?(?:báo\s*cáo(?:\s*nội\s*dung)?|viết\s*(?:báo\s*cáo|tóm\s*tắt)|tóm\s*tắt(?:\s*nội\s*dung)?)|(?:báo\s*cáo(?:\s*nội\s*dung)?|viết\s*(?:báo\s*cáo|tóm\s*tắt))\s*(?:thôi|được\s*không|thay\s*vì)/i.test(combinedText) && !/(?:không\s*cần|miễn)\s*(?:báo\s*cáo|bằng\s*chứng)/i.test(combinedText);
  const wantsWaive = /(?:miễn|không\s*cần|bỏ)\s*(?:chụp\s*ảnh|bằng\s*chứng|xác\s*thực)/i.test(combinedText);

  if (accepted) {
    if (params.newRewardCoins !== undefined) cleanReward = parseInt(params.newRewardCoins, 10) || cleanReward;
    if (params.newTargetMinutes !== undefined) cleanMinutes = parseInt(params.newTargetMinutes, 10);
    if (params.newType) cleanType = params.newType;
    else if (cleanMinutes !== undefined) cleanType = cleanMinutes > 0 ? 'focus' : 'bounty';
    if (params.newRequiresProof !== undefined) cleanProof = Boolean(params.newRequiresProof);
    if (params.newProofType) {
      cleanProofType = params.newProofType;
      cleanProof = true;
    } else if (params.newRequiresProof !== undefined) {
      cleanProof = Boolean(params.newRequiresProof);
    } else if (wantsBoth) {
      cleanProofType = 'both';
      cleanProof = true;
    } else if (wantsPhoto) {
      cleanProofType = 'photo';
      cleanProof = true;
    } else if (wantsText) {
      cleanProofType = 'text';
      cleanProof = true;
    } else if (wantsWaive) {
      cleanProof = false;
    }
  }

  let cleanGuidance = params.newProofGuidance !== undefined ? params.newProofGuidance : (quest.proofGuidance || '');
  if (cleanProof) {
    if (!cleanGuidance || (cleanProofType === 'both' && (!cleanGuidance.includes('ảnh') || (!cleanGuidance.includes('báo cáo') && !cleanGuidance.includes('tóm tắt'))))) {
      if (cleanProofType === 'both') {
        cleanGuidance = 'Chụp ảnh kết quả thực tế và viết tóm tắt ngắn gọn nội dung đã hoàn thành.';
      } else if (cleanProofType === 'text') {
        cleanGuidance = 'Ghi lại các ý chính hoặc kết quả nội dung đã hoàn thành.';
      } else {
        cleanGuidance = 'Chụp ảnh kết quả thực tế khi hoàn thành nhiệm vụ.';
      }
    }
  }

  const rawDebate = {
    title: cleanTitle,
    description: cleanDesc,
    category: params.newCategory || quest.category,
    type: cleanType || (cleanMinutes > 0 ? 'focus' : 'bounty'),
    targetMinutes: cleanMinutes !== undefined ? cleanMinutes : (quest.targetMinutes || 0),
    rewardCoins: cleanReward !== undefined ? cleanReward : 10,
    rank: params.newRank,
    requiresProof: cleanProof,
    proofType: cleanProofType,
    proofGuidance: cleanGuidance,
    icon: quest.icon,
    isNegotiated: true
  };

  const clean = sanitizeEvaluatedQuest(rawDebate, quest.title, quest.description);
  const isRepeatable = Boolean(params.newIsRepeatable !== undefined ? params.newIsRepeatable : quest.isRepeatable);
  const signature = accepted
    ? signQuest(clean.title, clean.type, clean.targetMinutes, clean.rewardCoins, clean.requiresProof, isRepeatable)
    : undefined;

  return {
    accepted,
    reply: params.reply || 'Mình đã ghi nhận ý kiến của bạn.',
    newTitle: clean.title,
    newDescription: clean.description,
    newType: clean.type,
    newTargetMinutes: clean.targetMinutes,
    newRewardCoins: clean.rewardCoins,
    newRank: clean.rank,
    newRequiresProof: clean.requiresProof,
    newProofType: clean.proofType || cleanProofType,
    newProofGuidance: clean.proofGuidance,
    newIcon: clean.icon || quest.icon,
    isRepeatable,
    signature
  };
}

export function handleUpdateRewardParameters(params: any = {}, reward: any = {}): any {
  const accepted = Boolean(params.accepted);
  let cleanPrice = reward.price !== undefined ? reward.price : 30;
  let cleanMinutes = reward.targetMinutes || 0;
  let cleanTier = reward.tier || 'rare';
  let cleanName = params.newName || reward.name || 'Phần thưởng';
  let cleanDesc = params.newDescription !== undefined ? params.newDescription : (reward.description || '');

  if (accepted) {
    if (params.newPrice !== undefined) cleanPrice = parseInt(params.newPrice, 10) || cleanPrice;
    if (params.newTargetMinutes !== undefined) cleanMinutes = parseInt(params.newTargetMinutes, 10);
    if (params.newTier) cleanTier = params.newTier;
  }

  const rawDebate = {
    name: cleanName,
    description: cleanDesc,
    category: params.newCategory || reward.category,
    price: cleanPrice,
    tier: cleanTier,
    targetMinutes: cleanMinutes,
    isNegotiated: true
  };

  const clean = sanitizeEvaluatedReward(rawDebate, reward.name, reward.description);
  const signature = accepted
    ? signReward(clean.name, clean.price, clean.tier, clean.targetMinutes)
    : undefined;

  return {
    accepted,
    reply: params.reply || 'Mình đã ghi nhận ý kiến của bạn.',
    newName: clean.name,
    newDescription: clean.description,
    newPrice: clean.price,
    newTier: clean.tier,
    newTargetMinutes: clean.targetMinutes,
    signature
  };
}

export function handleUpdateLoanTerms(params: any = {}, loan: any = {}, callerId: string = 'guest', macro: any = {}): any {
  const accepted = Boolean(params.accepted);
  let cleanAmount = parseInt(params.newAmount ?? (loan.amount || loan.principal || loan.debt), 10) || 30;
  let cleanRate = Number(params.newBorrowRate ?? loan.borrowRate ?? macro.borrowRate ?? 0.05);
  if (cleanRate > 0.30) cleanRate = cleanRate / 100;
  const floor = macro.depositFloor || 0.015;
  cleanRate = Math.min(0.20, Math.max(floor, Number(cleanRate.toFixed(4))));

  let cleanDeduct = Number(params.newAutoDeductPercent ?? loan.autoDeductPercent ?? 0.50);
  if (cleanDeduct > 1.0) cleanDeduct = cleanDeduct / 100;
  cleanDeduct = Math.min(0.80, Math.max(0.20, Number(cleanDeduct.toFixed(2))));

  let cleanLimit = parseInt(params.newCreditLimit ?? loan.creditLimit, 10) || 50;
  cleanLimit = Math.max(cleanAmount, cleanLimit);

  const signature = accepted
    ? signLoanOffer(callerId, cleanAmount, cleanRate, cleanDeduct, cleanLimit)
    : undefined;

  return {
    accepted,
    reply: params.reply || 'Mình đã ghi nhận ý kiến thương lượng khoản vay của bạn.',
    newAmount: cleanAmount,
    newBorrowRate: cleanRate,
    newAutoDeductPercent: cleanDeduct,
    newCreditLimit: cleanLimit,
    signature
  };
}

export function handleSuggestNegotiationOptions(params: any = {}): any {
  const rawOptions = Array.isArray(params.options) ? params.options : [];
  const options = rawOptions.map((opt: any, idx: number) => ({
    id: opt.id || idx + 1,
    label: opt.label || `Phương án ${idx + 1}`,
    argument: opt.argument || `Chốt phương án ${idx + 1}`,
    ...(opt.newRewardCoins !== undefined ? { newRewardCoins: parseInt(opt.newRewardCoins, 10) } : {}),
    ...(opt.newTargetMinutes !== undefined ? { newTargetMinutes: parseInt(opt.newTargetMinutes, 10) } : {}),
    ...(opt.newType ? { newType: opt.newType } : {}),
    ...(opt.newRequiresProof !== undefined ? { newRequiresProof: Boolean(opt.newRequiresProof) } : {}),
    ...(opt.newPrice !== undefined ? { newPrice: parseInt(opt.newPrice, 10) } : {}),
    ...(opt.newTier ? { newTier: opt.newTier } : {}),
    ...(opt.newAmount !== undefined ? { newAmount: parseInt(opt.newAmount, 10) } : {}),
    ...(opt.newBorrowRate !== undefined ? { newBorrowRate: Number(opt.newBorrowRate) } : {}),
    ...(opt.newAutoDeductPercent !== undefined ? { newAutoDeductPercent: Number(opt.newAutoDeductPercent) } : {}),
    ...(opt.newCreditLimit !== undefined ? { newCreditLimit: parseInt(opt.newCreditLimit, 10) } : {})
  }));

  return {
    accepted: false,
    reply: params.reply || 'Dưới đây là một số phương án gợi ý cho bạn nè:',
    options
  };
}

export function runDeterministicQuestDebate(quest: any, argument: string = '', selectedOpt: any = null): any {
  if (selectedOpt) {
    return handleUpdateQuestParameters({
      accepted: true,
      reply: `Mình hoàn toàn nhất trí chốt theo ${selectedOpt.label || 'phương án bạn chọn'} nhé! Thông số nhiệm vụ đã được cập nhật chuẩn xác. Chúc bạn hoàn thành thật tốt! ✨`,
      newRewardCoins: selectedOpt.newRewardCoins,
      newTargetMinutes: selectedOpt.newTargetMinutes,
      newType: selectedOpt.newType,
      newRequiresProof: selectedOpt.newRequiresProof,
      newProofType: selectedOpt.newProofType,
      newTitle: selectedOpt.newTitle
    }, quest);
  }

  const curMins = quest.targetMinutes !== undefined ? quest.targetMinutes : (quest.type === 'focus' ? 25 : 0);
  const curCoins = quest.rewardCoins || 10;
  const isChore = /(?:rửa|dọn|quét|giặt|đổ\s*rác|lau|nấu)/i.test((quest.title || '') + ' ' + (argument || ''));

  const isQuestion = /\b(?:được\s*(?:không|ko|chăng)|có\s*được\s*không)\b|\?/i.test(argument);
  const userAgreed = !isQuestion && (/\b(chốt|đồng\s*ý|dong\s*y|nhất\s*trí|nhat\s*tri|ok|oke|chấp\s*thuận|chap\s*thuan|thống\s*nhất|thong\s*nhat)\b/i.test(argument) || /^(?:được|duoc|ok|oke)[\s.!]*$/i.test(argument.trim()));

  const explicitMinsMatch = argument.match(/(\d+)\s*(?:phút|min|p\b)/i);
  const isNoTimerMatch = /(?:không\s*(?:cần\s*)?bấm\s*giờ|bỏ\s*(?:hẹn\s*)?giờ|hoàn\s*thành\s*ngay|bounty)/i.test(argument);
  const requestedMins = isNoTimerMatch ? 0 : (explicitMinsMatch ? parseInt(explicitMinsMatch[1], 10) : null);
  const explicitCoinsMatch = argument.match(/(\d+)\s*vàng/i);
  const requestedCoins = explicitCoinsMatch ? parseInt(explicitCoinsMatch[1], 10) : null;

  const wantsBoth = /(?:kết\s*hợp|cả\s*hai|cả\s*ảnh[\s\S]{1,60}(?:báo\s*cáo|tóm\s*tắt|viết)|vừa\s*(?:chụp\s*)?ảnh[\s\S]{1,60}vừa\s*(?:báo\s*cáo|tóm\s*tắt|viết)|vừa\s*chụp[\s\S]{1,60}vừa\s*(?:viết|báo|tóm)|ảnh\s*(?:kèm|\+|và)\s*(?:báo\s*cáo|tóm\s*tắt|viết)|(?:báo\s*cáo|tóm\s*tắt|viết)\s*(?:kèm|\+)\s*ảnh)/i.test(argument);
  const wantsPhoto = !wantsBoth && /(?:đổi\s*sang|chuyển\s*sang|chỉ\s*(?:cần\s*)?|thay\s*bằng|muốn|xin)\s*(?:chụp\s*ảnh(?:\s*thực\s*tế)?|bằng\s*chứng\s*ảnh)|(?:chụp\s*ảnh(?:\s*thực\s*tế)?|bằng\s*chứng\s*ảnh)\s*(?:thôi|được\s*không|thay\s*vì)/i.test(argument) && !/(?:không\s*cần|miễn)\s*(?:chụp\s*ảnh|bằng\s*chứng)/i.test(argument);
  const wantsTextExplicit = !wantsBoth && /(?:đổi\s*sang|chuyển\s*sang|chỉ\s*(?:cần\s*)?|thay\s*bằng|muốn|xin)\s*(?:nộp\s*)?(?:báo\s*cáo(?:\s*nội\s*dung)?|viết\s*(?:báo\s*cáo|tóm\s*tắt)|tóm\s*tắt(?:\s*nội\s*dung)?)|(?:báo\s*cáo(?:\s*nội\s*dung)?|viết\s*(?:báo\s*cáo|tóm\s*tắt))\s*(?:thôi|được\s*không|thay\s*vì)/i.test(argument);

  const wantsMoreCoins = /(?:tăng|thêm|nâng).*(?:thưởng|vàng)|xin.*(?:thưởng|vàng)/i.test(argument);
  const wantsLessTime = /(?:giảm|rút\s*ngắn).*(?:thời\s*gian|phút)/i.test(argument);

  if (wantsBoth) {
    const bonusCoins = (curCoins < 30) ? Math.min(30, curCoins + 2) : curCoins;
    return handleUpdateQuestParameters({
      accepted: true,
      reply: `Rất tuyệt vời! Tinh thần tự giác nâng cao kỷ luật kết hợp cả ảnh thực tế lẫn báo cáo tóm tắt rất đáng khen ngợi. Mình đã cập nhật sang hình thức kết hợp cả hai và tặng thêm 2 Vàng khích lệ nhé! 📸+✍️`,
      newRewardCoins: bonusCoins,
      newRequiresProof: true,
      newProofType: 'both',
      newProofGuidance: 'Chụp ảnh kết quả thực tế và viết tóm tắt ngắn gọn nội dung đã hoàn thành.'
    }, quest, argument);
  }

  const wantsText = !wantsBoth && (wantsTextExplicit || /(?:báo\s*cáo|viết\s*(?:báo\s*cáo|chữ|nội\s*dung)|chỉ\s*viết|nộp\s*báo\s*cáo|báo\s*cáo\s*nội\s*dung)/i.test(argument));
  if (wantsText) {
    const fullTaskText = `${quest.title} ${quest.description || ''}`.toLowerCase();
    const isPhysicalTask = /(?:rửa|dọn|quét|giặt|đổ\s*rác|lau|chạy\s*bộ|tập\s*gym|plank|squat|thể\s*dục|nấu\s*ăn)/i.test(fullTaskText);
    if (isPhysicalTask) {
      return {
        accepted: false,
        reply: `Với công việc mang tính chất thực hành thể chất hoặc dọn dẹp như "${quest.title}", Trọng Tài AI nhận thấy bắt buộc cần có ảnh chụp thực tế để đảm bảo tính kỷ luật và trung thực, không thể chỉ viết báo cáo chữ. Bạn hãy giữ chụp ảnh nhé! 📸`,
        options: [
          { id: 1, label: 'Giữ chụp ảnh', argument: 'Mình đồng ý giữ chụp ảnh thực tế' },
          { id: 2, label: 'Kết hợp cả ảnh & báo cáo', argument: 'Mình muốn kết hợp cả ảnh và báo cáo để kỷ luật hơn' }
        ]
      };
    }
    return handleUpdateQuestParameters({
      accepted: true,
      reply: `Hoàn toàn hợp lý! Với công việc học tập hoặc thao tác trí tuệ như "${quest.title}", việc viết báo cáo tóm tắt kết quả sẽ giúp bạn tổng kết kiến thức hiệu quả nhất. Mình đã chuyển sang nộp báo cáo nội dung nhé! ✍️`,
      newRequiresProof: true,
      newProofType: 'text',
      newProofGuidance: 'Ghi lại 2-3 kiến thức cốt lõi hoặc kết quả cụ thể bạn đã hoàn thành.'
    }, quest, argument);
  }

  if (wantsPhoto) {
    return handleUpdateQuestParameters({
      accepted: true,
      reply: `Lý do của bạn rất hợp lý! Với công việc này, việc chụp ảnh kết quả thực tế sẽ giúp ghi nhận nỗ lực trực quan và trung thực nhất. Mình đã chuyển sang yêu cầu chụp ảnh nhé! 📸`,
      newRequiresProof: true,
      newProofType: 'photo',
      newProofGuidance: 'Chụp ảnh kết quả thực tế khi hoàn thành nhiệm vụ.'
    }, quest, argument);
  }

  const wantsExemptProof = /(?:miễn|không\s*cần|bỏ).*(?:ảnh|báo\s*cáo|bằng\s*chứng)/i.test(argument);
  if (wantsExemptProof) {
    if ((quest.rewardCoins || 0) >= 15 || (quest.type === 'focus' && (quest.targetMinutes || 0) >= 25)) {
      return {
        accepted: false,
        reply: `Nhiệm vụ này có mức thưởng cao (${quest.rewardCoins} Vàng) hoặc phiên tập trung dài, nên để giữ vững tính công bằng và kỷ luật, AI không thể miễn hoàn toàn bằng chứng. Tuy nhiên, nếu không tiện chụp ảnh, bạn có thể chuyển sang viết báo cáo nội dung nhé! ⚖️`,
        options: [
          { id: 1, label: 'Đổi sang báo cáo chữ', argument: 'Công việc này mình xin đổi sang nộp báo cáo nội dung' },
          { id: 2, label: 'Giữ chụp ảnh', argument: 'Mình đồng ý giữ chụp ảnh thực tế' }
        ]
      };
    }
    return handleUpdateQuestParameters({
      accepted: true,
      reply: `Được rồi, đây là nhiệm vụ nhẹ nhàng nên mình đồng ý miễn yêu cầu bằng chứng cho bạn lần này nhé! Chúc bạn hoàn thành tốt! ⚡`,
      newRequiresProof: false,
      newProofGuidance: ''
    }, quest, argument);
  }

  const wantsRepeat = /(?:đổi|chuyển|sang|bật).*(?:lặp\s*lại|hằng\s*ngày|mỗi\s*ngày)/i.test(argument);
  if (wantsRepeat) {
    return handleUpdateQuestParameters({
      accepted: true,
      reply: `Tuyệt vời! Thiết lập nhiệm vụ này thành thói quen lặp lại hằng ngày sẽ giúp bạn rèn luyện sự bền bỉ. Mình đã chuyển sang Lặp Lại nhé! 🔄`,
      newIsRepeatable: true
    }, quest, argument);
  }

  const wantsOnce = /(?:đổi|chuyển|sang).*(?:làm\s*một\s*lần|1\s*lần|không\s*lặp\s*lại)/i.test(argument);
  if (wantsOnce) {
    return handleUpdateQuestParameters({
      accepted: true,
      reply: `Mình đã chuyển nhiệm vụ sang trạng thái Làm Một Lần theo yêu cầu của bạn nhé! 🎯`,
      newIsRepeatable: false
    }, quest, argument);
  }

  if (isChore) {
    if (requestedCoins !== null && requestedCoins > 5) {
      return {
        ...handleUpdateQuestParameters({ accepted: false, reply: `Các công việc nhà hoặc sinh hoạt nhanh chỉ có khung thưởng chuẩn từ 3 đến 5 Vàng để giữ cân bằng bạn nhé. Yêu cầu ${requestedCoins} Vàng là quá cao cho việc này nè!` }, quest),
        options: [
          { id: 1, label: 'Mức chuẩn 5 Vàng (Không bấm giờ)', argument: 'Chốt 5 Vàng không cần bấm giờ theo chuẩn việc nhà', newTargetMinutes: 0, newRewardCoins: 5, newType: 'bounty' },
          { id: 2, label: 'Tổng vệ sinh 25 phút (10 Vàng)', argument: 'Mình chuyển sang tổng vệ sinh tập trung 25 phút để nhận 10 Vàng', newTargetMinutes: 25, newRewardCoins: 10, newType: 'focus' }
        ]
      };
    }
    const choreCoins = Math.min(5, Math.max(quest.rewardCoins || 3, requestedCoins || 5));
    return handleUpdateQuestParameters({
      accepted: true,
      reply: `Việc này là việc nhà nhanh gọn, mình đồng ý để bạn hoàn thành ngay không cần bấm giờ với mức thưởng ${choreCoins} Vàng nhé! ✨`,
      newType: 'bounty',
      newTargetMinutes: 0,
      newRewardCoins: choreCoins
    }, quest, argument);
  }

  if (userAgreed) {
    return handleUpdateQuestParameters({
      accepted: true,
      reply: `Tuyệt vời, tụi mình đã thống nhất thông số nhiệm vụ này nhé! Bạn có thể nhận việc và bắt đầu ngay. ✨`,
      newRewardCoins: quest.rewardCoins,
      newTargetMinutes: quest.targetMinutes,
      newType: quest.type
    }, quest, argument);
  }

  const isAskingMoreCoins = (requestedCoins !== null && requestedCoins > curCoins) || wantsMoreCoins;
  const isAskingLessTime = (requestedMins !== null && requestedMins < curMins) || wantsLessTime;

  if (isNoTimerMatch && curMins > 0) {
    return {
      ...handleUpdateQuestParameters({ accepted: false, reply: `Công việc này cần có sự tập trung thực sự để đạt hiệu quả cao, nên Trọng Tài AI không thể bỏ hoàn toàn đồng hồ bấm giờ với mức thưởng này bạn nhé.` }, quest),
      options: [
        { id: 1, label: `Phiên ngắn 15 phút (${Math.max(4, Math.floor(curCoins * 0.6))} Vàng)`, argument: `Rút ngắn còn 15 phút và nhận ${Math.max(4, Math.floor(curCoins * 0.6))} Vàng`, newTargetMinutes: 15, newRewardCoins: Math.max(4, Math.floor(curCoins * 0.6)), newType: 'focus' },
        { id: 2, label: `Giữ ${curMins} phút (${curCoins} Vàng)`, argument: `Giữ nguyên ${curMins} phút và nhận trọn ${curCoins} Vàng`, newTargetMinutes: curMins, newRewardCoins: curCoins, newType: 'focus' }
      ]
    };
  }

  if (isAskingMoreCoins && (requestedMins === null || requestedMins <= curMins)) {
    const higherMins = (curMins || 25) + 15;
    const higherCoins = curCoins + 4;
    return {
      ...handleUpdateQuestParameters({
        accepted: false,
        reply: `Để giữ vững tính kỷ luật và công bằng, mức thưởng Vàng luôn phải đi liền với thời gian và nỗ lực bỏ ra bạn nhé. Bạn muốn nhận thêm Vàng thì hãy cam kết thêm thời gian tập trung hoặc nâng cấp bằng chứng nè:`
      }, quest),
      options: [
        { id: 1, label: `Tăng lên ${higherMins} phút (${higherCoins} Vàng)`, argument: `Mình cam kết tập trung ${higherMins} phút để nhận ${higherCoins} Vàng`, newTargetMinutes: higherMins, newRewardCoins: higherCoins, newType: 'focus' },
        { id: 2, label: `Kỷ luật kép 📸+✍️ (+2 Vàng)`, argument: `Mình cam kết nộp bằng chứng kép cả ảnh và tóm tắt để nhận thêm 2 Vàng`, newRequiresProof: true, newProofType: 'both', newRewardCoins: curCoins + 2 }
      ]
    };
  }

  if (isAskingLessTime && requestedCoins !== null && requestedCoins >= curCoins) {
    const reducedMins = requestedMins !== null ? requestedMins : Math.max(10, Math.floor(curMins * 0.7));
    const fairCoins = Math.max(3, Math.floor(reducedMins * 0.35));
    return {
      ...handleUpdateQuestParameters({
        accepted: false,
        reply: `Nếu rút ngắn thời gian tập trung xuống còn ${reducedMins} phút thì mức thưởng cũng cần điều chỉnh giảm tương ứng để công bằng với các nhiệm vụ khác bạn nhé.`
      }, quest),
      options: [
        { id: 1, label: `${reducedMins} phút (${fairCoins} Vàng)`, argument: `Đồng ý ${reducedMins} phút với mức thưởng ${fairCoins} Vàng`, newTargetMinutes: reducedMins, newRewardCoins: fairCoins, newType: 'focus' },
        { id: 2, label: `Giữ nguyên ${curMins} phút (${curCoins} Vàng)`, argument: `Giữ nguyên ${curMins} phút để nhận trọn vẹn ${curCoins} Vàng`, newTargetMinutes: curMins, newRewardCoins: curCoins, newType: 'focus' }
      ]
    };
  }

  if (requestedMins !== null && requestedMins > curMins) {
    const finalMins = Math.min(180, requestedMins);
    const finalCoins = requestedCoins !== null ? Math.min(40, requestedCoins) : Math.min(40, curCoins + Math.floor((finalMins - curMins) * 0.3));
    return handleUpdateQuestParameters({
      accepted: true,
      reply: `Mình hoàn toàn đồng ý điều chỉnh thời gian thành ${finalMins} phút và mức thưởng ${finalCoins} Vàng theo đề xuất tăng nỗ lực rất đáng khen ngợi của bạn nhé! ✨`,
      newTargetMinutes: finalMins,
      newRewardCoins: finalCoins,
      newType: 'focus'
    }, quest, argument);
  }

  if (isAskingLessTime && (requestedCoins === null || requestedCoins < curCoins)) {
    const finalMins = requestedMins !== null ? requestedMins : Math.max(10, Math.floor(curMins * 0.7));
    const finalCoins = requestedCoins !== null ? requestedCoins : Math.max(3, Math.floor(curCoins * 0.7));
    return handleUpdateQuestParameters({
      accepted: true,
      reply: `Mình đồng ý điều chỉnh thời gian tập trung xuống ${finalMins} phút và mức thưởng ${finalCoins} Vàng để bạn bắt đầu dễ dàng hơn nhé! ✨`,
      newTargetMinutes: finalMins,
      newRewardCoins: finalCoins,
      newType: 'focus'
    }, quest, argument);
  }

  const optRes = handleSuggestNegotiationOptions({
    domain: 'quest',
    reply: `Mình rất hiểu mong muốn của bạn! Tuy nhiên để cân bằng nỗ lực, tụi mình giữ mức này nhé. Dưới đây là các phương án khả thi hơn nè:\n- Phương án 1: Giữ nguyên mức thưởng ${quest.rewardCoins} Vàng và rút ngắn còn 20 phút.\n- Phương án 2: Hoàn thành ngay không cần bấm giờ với mức thưởng 5 Vàng.`,
    options: [
      { id: 1, label: `Phương án 1 (20 phút • ${quest.rewardCoins} Vàng)`, argument: `Chốt phương án 1: 20 phút, ${quest.rewardCoins} Vàng`, newTargetMinutes: 20, newRewardCoins: quest.rewardCoins, newType: 'focus' },
      { id: 2, label: `Phương án 2 (Không cần bấm giờ • 5 Vàng)`, argument: `Chốt phương án 2: Không cần bấm giờ, 5 Vàng`, newTargetMinutes: 0, newRewardCoins: 5, newType: 'bounty' }
    ]
  });
  return {
    ...handleUpdateQuestParameters({ accepted: false, reply: optRes.reply }, quest),
    options: optRes.options
  };
}

export function runDeterministicRewardDebate(reward: any, argument: string = '', selectedOpt: any = null): any {
  if (selectedOpt) {
    return handleUpdateRewardParameters({
      accepted: true,
      reply: `Mình rất vui được chốt theo ${selectedOpt.label || 'phương án bạn chọn'} nhé! Phần thưởng đã được cập nhật giá và thời lượng mới. ✨`,
      newPrice: selectedOpt.newPrice,
      newTargetMinutes: selectedOpt.newTargetMinutes,
      newTier: selectedOpt.newTier,
      newName: selectedOpt.newName
    }, reward);
  }

  const curPrice = reward.price || 20;
  const curMins = reward.targetMinutes || 0;

  const isQuestion = /\b(?:được\s*(?:không|ko|chăng)|có\s*được\s*không)\b|\?/i.test(argument);
  const userAgreed = !isQuestion && (/\b(chốt|đồng\s*ý|dong\s*y|nhất\s*trí|nhat\s*tri|ok|oke|chấp\s*thuận|chap\s*thuan|thống\s*nhất|thong\s*nhat)\b/i.test(argument) || /^(?:được|duoc|ok|oke)[\s.!]*$/i.test(argument.trim()));

  const explicitCoinsMatch = argument.match(/(\d+)\s*vàng/i);
  const explicitMinsMatch = argument.match(/(\d+)\s*(?:phút|min|p\b)/i);
  const requestedCoins = explicitCoinsMatch ? parseInt(explicitCoinsMatch[1], 10) : null;
  const requestedMins = explicitMinsMatch ? parseInt(explicitMinsMatch[1], 10) : null;

  const isLowerPriceReq = /(?:giảm|hạ|bớt|rẻ).*(?:giá|vàng)/i.test(argument);
  const isLowerTimeReq = /(?:giảm|rút\s*ngắn).*(?:thời\s*gian|phút)/i.test(argument);
  const isNoTimerReq = /(?:không\s*(?:cần\s*)?bấm\s*giờ|bỏ\s*(?:hẹn\s*)?giờ)/i.test(argument);

  if (userAgreed) {
    return handleUpdateRewardParameters({
      accepted: true,
      reply: `Tuyệt vời, tụi mình đã chốt xong phần thưởng này nhé! ✨`,
      newPrice: curPrice,
      newTargetMinutes: curMins,
      newTier: reward.tier
    }, reward);
  }

  if (isNoTimerReq) {
    if (curMins > 0) {
      return {
        ...handleUpdateRewardParameters({
          accepted: false,
          reply: `Phần thưởng như "${reward.name || 'này'}" cần có mốc thời gian rõ ràng để tránh bị cuốn vào giải trí quá lâu ảnh hưởng đến công việc tiếp theo bạn nhé.`
        }, reward),
        options: [
          { id: 1, label: `Giữ ${curMins} phút (${curPrice} Vàng)`, argument: `Giữ nguyên ${curMins} phút hẹn giờ để yên tâm giải trí`, newPrice: curPrice, newTargetMinutes: curMins },
          { id: 2, label: `Giải lao nhanh 15 phút (${Math.max(5, Math.floor(curPrice * 0.4))} Vàng)`, argument: `Rút ngắn còn 15 phút với giá ${Math.max(5, Math.floor(curPrice * 0.4))} Vàng`, newPrice: Math.max(5, Math.floor(curPrice * 0.4)), newTargetMinutes: 15 }
        ]
      };
    }
    return handleUpdateRewardParameters({
      accepted: true,
      reply: `Được chứ! Mình chuyển phần thưởng này sang dạng đổi quà nhận ngay không cần bấm giờ nhé. ✨`,
      newPrice: curPrice,
      newTargetMinutes: 0,
      newTier: reward.tier
    }, reward);
  }

  const isAskingLowerPrice = (requestedCoins !== null && requestedCoins < curPrice) || isLowerPriceReq;
  const isReducingDuration = (requestedMins !== null && requestedMins < curMins) || isLowerTimeReq;

  if (isAskingLowerPrice && isReducingDuration) {
    const finalPrice = requestedCoins !== null ? Math.max(5, requestedCoins) : Math.max(10, Math.floor(curPrice * 0.7));
    const finalMins = requestedMins !== null ? Math.max(5, requestedMins) : Math.max(10, Math.floor(curMins * 0.7));
    return handleUpdateRewardParameters({
      accepted: true,
      reply: `Phương án này rất hợp lý! Mình đồng ý giảm giá xuống ${finalPrice} Vàng tương ứng với ${finalMins} phút tận hưởng nhé! ✨`,
      newPrice: finalPrice,
      newTargetMinutes: finalMins,
      newTier: finalPrice < 30 ? 'common' : (finalPrice < 70 ? 'rare' : reward.tier)
    }, reward);
  }

  if (isAskingLowerPrice) {
    const opt1Price = Math.max(5, Math.floor(curPrice * 0.6));
    const opt1Mins = Math.max(15, Math.floor(curMins * 0.6));
    const optRes = handleSuggestNegotiationOptions({
      domain: 'reward',
      reply: `Món quà này rất giá trị nên mình giữ mức giá ${curPrice} Vàng nhé! Nếu muốn đổi nhanh hơn, bạn có thể tham khảo phương án này nè:\n- Phương án 1: Giảm còn ${opt1Price} Vàng nhưng rút ngắn thời lượng còn ${opt1Mins > 0 ? opt1Mins : 20} phút.\n- Phương án 2: Giữ nguyên giá và bạn làm thêm 1 nhiệm vụ nữa là đủ Vàng nè!`,
      options: [
        { id: 1, label: `Phương án 1 (${opt1Mins > 0 ? opt1Mins + ' phút • ' : ''}${opt1Price} Vàng)`, argument: `Chốt phương án 1: ${opt1Mins > 0 ? opt1Mins + ' phút, ' : ''}${opt1Price} Vàng`, newPrice: opt1Price, newTargetMinutes: opt1Mins > 0 ? opt1Mins : 20, newTier: opt1Price < 30 ? 'common' : 'rare' },
        { id: 2, label: `Phương án 2 (Giữ nguyên ${curPrice} Vàng)`, argument: `Giữ nguyên giá ${curPrice} Vàng`, newPrice: curPrice, newTargetMinutes: curMins, newTier: reward.tier }
      ]
    });
    return {
      ...handleUpdateRewardParameters({ accepted: false, reply: optRes.reply }, reward),
      options: optRes.options
    };
  }

  if (requestedMins !== null && requestedMins < curMins) {
    const newPrice = Math.max(5, Math.floor(curPrice * (requestedMins / curMins)));
    return handleUpdateRewardParameters({
      accepted: true,
      reply: `Bạn chủ động rút ngắn thời gian còn ${requestedMins} phút, mình đồng ý giảm giá tương ứng còn ${newPrice} Vàng nhé! ✨`,
      newPrice,
      newTargetMinutes: requestedMins,
      newTier: newPrice < 30 ? 'common' : reward.tier
    }, reward);
  }

  if (requestedCoins !== null || requestedMins !== null) {
    const finalPrice = requestedCoins !== null ? Math.max(5, requestedCoins) : curPrice;
    const finalMins = requestedMins !== null ? Math.max(0, requestedMins) : curMins;
    return handleUpdateRewardParameters({
      accepted: true,
      reply: `Mình nhất trí điều chỉnh phần thưởng thành giá ${finalPrice} Vàng${finalMins > 0 ? ` và thời gian ${finalMins} phút` : ''} theo đề xuất của bạn nhé! ✨`,
      newPrice: finalPrice,
      newTargetMinutes: finalMins,
      newTier: finalPrice < 30 ? 'common' : (finalPrice < 70 ? 'rare' : reward.tier)
    }, reward);
  }

  const optRes = handleSuggestNegotiationOptions({
    domain: 'reward',
    reply: `Món quà này rất giá trị nên mình giữ mức giá ${curPrice} Vàng nhé! Nếu muốn đổi nhanh hơn, bạn có thể tham khảo phương án này nè:\n- Phương án 1: Giảm còn ${Math.floor(curPrice * 0.6)} Vàng nhưng rút ngắn thời lượng còn 20 phút.\n- Phương án 2: Giữ nguyên giá và bạn làm thêm 1 nhiệm vụ nữa là đủ Vàng nè!`,
    options: [
      { id: 1, label: `Phương án 1 (20 phút • ${Math.floor(curPrice * 0.6)} Vàng)`, argument: `Chốt phương án 1: 20 phút, ${Math.floor(curPrice * 0.6)} Vàng`, newTargetMinutes: 20, newPrice: Math.floor(curPrice * 0.6), newTier: 'common' },
      { id: 2, label: `Phương án 2 (Giữ nguyên ${curPrice} Vàng)`, argument: `Giữ nguyên giá ${curPrice} Vàng`, newPrice: curPrice, newTargetMinutes: curMins, newTier: reward.tier }
    ]
  });
  return {
    ...handleUpdateRewardParameters({ accepted: false, reply: optRes.reply }, reward),
    options: optRes.options
  };
}

export function runDeterministicLoanDebate(loan: any, argument: string, callerSub?: string | null, macro: any = {}, selectedOption?: any, profile: any = {}): any {
  const currentAmount = Math.max(10, parseInt(loan?.amount, 10) || 30);
  const currentRate = Number(loan?.borrowRate) || macro.borrowRate || 0.05;
  const currentDeduct = Math.min(0.80, Math.max(0.20, Number(loan?.autoDeductPercent) || 0.50));
  const currentLimit = Math.max(20, parseInt(loan?.creditLimit, 10) || calculateCreditLimit(profile, currentDeduct));
  const streak = Math.max(0, parseInt(profile?.streak, 10) || 0);
  const level = Math.max(1, parseInt(profile?.level, 10) || 1);

  if (selectedOption) {
    return handleUpdateLoanTerms({
      accepted: true,
      reply: `Mình rất vui được chốt theo ${selectedOption.label || 'phương án bạn chọn'} nhé! Thông số khoản vay đã được cập nhật ưu đãi. ✨`,
      newAmount: selectedOption.newAmount,
      newBorrowRate: selectedOption.newBorrowRate,
      newAutoDeductPercent: selectedOption.newAutoDeductPercent,
      newCreditLimit: selectedOption.newCreditLimit
    }, loan, callerSub || 'guest', macro);
  }

  const explicitAmountMatch = argument.match(/(?:vay|mượn)\s*(\d+)\s*(?:vàng)?/i) || argument.match(/(\d+)\s*vàng/i);
  const requestedAmount = explicitAmountMatch ? parseInt(explicitAmountMatch[1], 10) : null;
  if (requestedAmount !== null && requestedAmount > 0) {
    const safeAmount = Math.min(currentLimit, Math.max(10, requestedAmount));
    return handleUpdateLoanTerms({
      accepted: true,
      reply: `Mình đồng ý duyệt cho bạn vay ${safeAmount} Vàng theo đúng đề xuất nhé! Hãy hoàn thành nhiệm vụ để trả nợ đúng hạn nha! ✨`,
      newAmount: safeAmount,
      newBorrowRate: currentRate,
      newCreditLimit: currentLimit,
      newAutoDeductPercent: currentDeduct
    }, loan, callerSub || 'guest', macro);
  }

  const isRateNegotiate = /giảm\s*(?:lãi|phí)|lãi\s*suất\s*thấp/i.test(argument);
  const isLimitNegotiate = /nâng\s*hạn\s*mức|tăng\s*hạn\s*mức|hạn\s*mức\s*cao/i.test(argument);
  const isQuestion = /\b(?:được\s*(?:không|ko|chăng)|có\s*được\s*không)\b|\?/i.test(argument);
  const userAgreed = !isQuestion && (/\b(chốt|đồng\s*ý|dong\s*y|nhất\s*trí|nhat\s*tri|ok|oke|chấp\s*thuận|chap\s*thuan|thống\s*nhất|thong\s*nhat)\b/i.test(argument) || /^(?:được|duoc|ok|oke)[\s.!]*$/i.test(argument.trim()));

  if (isRateNegotiate && (streak >= 2 || level >= 2)) {
    const floor = macro.depositFloor || 0.015;
    const discountedRate = Math.max(floor, Number((currentRate - 0.02).toFixed(4)));
    const suggestDeduct = macro.liquidityStatus === 'tight' ? Math.max(0.60, currentDeduct) : currentDeduct;
    const tightNote = macro.liquidityStatus === 'tight' && suggestDeduct > currentDeduct
      ? ' Vì ngân hàng đang hỗ trợ cho nhiều hiệp sĩ khác, bạn hãy trích ' + Math.round(suggestDeduct * 100) + '% tiền thưởng để trả nhanh giúp kho nhé!'
      : '';
    return handleUpdateLoanTerms({
      accepted: true,
      reply: `Bạn có chuỗi chăm chỉ ${streak} ngày rất ấn tượng! Mình đồng ý giảm lãi suất ngày từ ${(currentRate * 100).toFixed(1)}%/ngày xuống chỉ còn ${(discountedRate * 100).toFixed(1)}%/ngày nhé.${tightNote} Chúc bạn hoàn thành nhiệm vụ thật vui vẻ! ✨`,
      newAmount: currentAmount,
      newBorrowRate: discountedRate,
      newCreditLimit: currentLimit,
      newAutoDeductPercent: suggestDeduct
    }, loan, callerSub || 'guest', macro);
  }

  if (isLimitNegotiate) {
    const bonusLimit = currentLimit + (macro.liquidityStatus === 'tight' ? 15 : 25);
    return handleUpdateLoanTerms({
      accepted: true,
      reply: `Thấy bạn có tinh thần làm việc tích cực, mình sẵn sàng nâng hạn mức vay cho bạn từ ${currentLimit} Vàng lên ${bonusLimit} Vàng nè! Hãy cân nhắc vay mức vừa sức để dễ trả nợ nhé. ✨`,
      newAmount: Math.min(bonusLimit, currentAmount + 15),
      newBorrowRate: currentRate,
      newCreditLimit: bonusLimit,
      newAutoDeductPercent: currentDeduct
    }, loan, callerSub || 'guest', macro);
  }

  if (userAgreed) {
    return handleUpdateLoanTerms({
      accepted: true,
      reply: `Tuyệt vời, tụi mình đã thống nhất thông số khoản vay này nhé! ✨`,
      newAmount: currentAmount,
      newBorrowRate: currentRate,
      newCreditLimit: currentLimit,
      newAutoDeductPercent: currentDeduct
    }, loan, callerSub || 'guest', macro);
  }

  const floor = macro.depositFloor || 0.015;
  const optRes = handleSuggestNegotiationOptions({
    domain: 'loan',
    reply: `Mình rất hiểu mong muốn của bạn! Tuy nhiên để đảm bảo an toàn quỹ chung và bạn không bị áp lực trả nợ, tụi mình giữ mức này nhé. Dưới đây là 2 phương án hỗ trợ:\n- Phương án 1: Vay ${currentAmount} Vàng với lãi suất ${(Math.max(floor, currentRate - 0.01) * 100).toFixed(1)}%/ngày, trích 60% tiền thưởng để trả nhanh.\n- Phương án 2: Cấp hạn mức ${currentLimit + 15} Vàng, cho bạn vay ${currentAmount} Vàng với lãi ${(currentRate * 100).toFixed(1)}%/ngày.`,
    options: [
      { id: 1, label: `Phương án 1 (${currentAmount} Vàng • ${(Math.max(floor, currentRate - 0.01) * 100).toFixed(1)}%/ngày • Trích 60%)`, argument: `Chốt phương án 1: Vay ${currentAmount} Vàng, trích 60%`, newAmount: currentAmount, newBorrowRate: Math.max(floor, currentRate - 0.01), newAutoDeductPercent: 0.60, newCreditLimit: currentLimit },
      { id: 2, label: `Phương án 2 (Hạn mức ${currentLimit + 15} Vàng • ${(currentRate * 100).toFixed(1)}%/ngày)`, argument: `Chốt phương án 2: Hạn mức ${currentLimit + 15} Vàng`, newAmount: currentAmount, newBorrowRate: currentRate, newAutoDeductPercent: currentDeduct, newCreditLimit: currentLimit + 15 }
    ]
  });

  return {
    ...handleUpdateLoanTerms({ accepted: false, reply: optRes.reply }, loan, callerSub || 'guest', macro),
    options: optRes.options
  };
}

// ponytail: Minimal deterministic fallback options to guarantee interactive 1-tap buttons for users.
export function getFallbackNegotiationOptions(domain: string, target: any = {}): DebateOption[] {
  if (domain === 'reward') {
    const curPrice = parseInt(target?.price, 10) || 20;
    const curMins = parseInt(target?.targetMinutes, 10) || 0;
    const optPrice = Math.max(5, Math.floor(curPrice * 0.7));
    return [
      { id: 1, label: `Phương án 1 (${optPrice} Vàng • 15 phút)`, argument: `Chốt phương án 1: ${optPrice} Vàng, 15 phút`, newPrice: optPrice, newTargetMinutes: 15, newTier: optPrice < 30 ? 'common' : 'rare' },
      { id: 2, label: `Phương án 2 (Giữ nguyên ${curPrice} Vàng)`, argument: `Giữ nguyên giá ${curPrice} Vàng`, newPrice: curPrice, newTargetMinutes: curMins, newTier: target?.tier || 'common' }
    ];
  }
  if (domain === 'loan') {
    const curAmt = parseInt(target?.amount || target?.principal || 30, 10);
    const curRate = Number(target?.borrowRate) || 0.05;
    const curLimit = parseInt(target?.creditLimit, 10) || 50;
    const lowRate = Math.max(0.015, Number((curRate * 0.8).toFixed(4)));
    return [
      { id: 1, label: `Gói an toàn: Vay ${curAmt} Vàng (Trích 50%)`, argument: `Chốt gói an toàn: Vay ${curAmt} Vàng, trích 50%`, newAmount: curAmt, newBorrowRate: curRate, newAutoDeductPercent: 0.50, newCreditLimit: curLimit },
      { id: 2, label: `Gói ưu đãi: Lãi ${(lowRate * 100).toFixed(1)}%/ngày (Trích 60%)`, argument: `Chốt gói ưu đãi: Vay ${curAmt} Vàng, lãi ${(lowRate * 100).toFixed(1)}%/ngày`, newAmount: curAmt, newBorrowRate: lowRate, newAutoDeductPercent: 0.60, newCreditLimit: curLimit }
    ];
  }
  const curMins = target?.targetMinutes !== undefined ? parseInt(target.targetMinutes, 10) : 25;
  const curCoins = parseInt(target?.rewardCoins, 10) || 10;
  return [
    { id: 1, label: `Phương án 1 (${Math.max(15, curMins - 10)} phút • ${curCoins} Vàng)`, argument: `Chốt phương án 1: ${Math.max(15, curMins - 10)} phút, ${curCoins} Vàng`, newTargetMinutes: Math.max(15, curMins - 10), newRewardCoins: curCoins, newType: 'focus' },
    { id: 2, label: `Phương án 2 (Không cần bấm giờ • 5 Vàng)`, argument: `Chốt phương án 2: Không cần bấm giờ, 5 Vàng`, newTargetMinutes: 0, newRewardCoins: 5, newType: 'bounty' }
  ];
}

export async function runNegotiationAgent({
  domain,
  caller,
  redis,
  systemPrompt,
  userPrompt,
  targetEntity,
  selectedOption,
  userArgument,
  onEvent
}: {
  domain: string;
  caller?: any;
  redis?: any;
  systemPrompt?: string;
  userPrompt?: string;
  targetEntity?: any;
  selectedOption?: any;
  userArgument?: string;
  tools?: any[];
  onEvent?: (event: string, data: any) => void;
}): Promise<any> {
  const notify = (step: number, icon: string, text: string, pct: number) => {
    if (typeof onEvent === 'function') {
      try { onEvent('step', { step, totalSteps: 5, icon, text, pct }); } catch (_) {}
    }
  };

  const finalArg = (userArgument || userPrompt || '').trim();
  notify(1, '🔍', 'Đang tra cứu hồ sơ cá nhân & dữ liệu hiệp sĩ của bạn...', 20);

  const toolsExecuted: string[] = [];
  const callerSub = caller?.sub || 'guest';
  const poolState = redis ? await getGlobalBankState(redis) : {};
  const macro = analyzeMacroTelemetry(poolState);

  // If user explicitly picked an interactive option, honor it directly with Action Tool
  if (selectedOption) {
    notify(4, '⚡', 'Đang kích hoạt công cụ áp dụng phương án bạn chọn...', 80);
    toolsExecuted.push(`apply_selected_option:${domain}`);
    if (domain === 'quest') {
      const res = handleUpdateQuestParameters({
        accepted: true,
        reply: `Mình hoàn toàn nhất trí chốt theo ${selectedOption.label || 'phương án bạn chọn'} nhé! Thông số đã được cập nhật chuẩn xác. Chúc bạn làm việc thật hiệu quả! ✨`,
        newRewardCoins: selectedOption.newRewardCoins,
        newTargetMinutes: selectedOption.newTargetMinutes,
        newType: selectedOption.newType,
        newRequiresProof: selectedOption.newRequiresProof,
        newProofType: selectedOption.newProofType,
        newTitle: selectedOption.newTitle
      }, targetEntity);
      notify(5, '🛡️', 'Đang đóng dấu chữ ký bảo mật HMAC SHA-256...', 95);
      return { ...res, options: [], toolsExecuted };
    }
    if (domain === 'reward') {
      const res = handleUpdateRewardParameters({
        accepted: true,
        reply: `Mình rất vui được chốt theo ${selectedOption.label || 'phương án bạn chọn'} nhé! Phần thưởng đã được cập nhật giá và thời lượng mới. ✨`,
        newPrice: selectedOption.newPrice,
        newTargetMinutes: selectedOption.newTargetMinutes,
        newTier: selectedOption.newTier,
        newName: selectedOption.newName
      }, targetEntity);
      notify(5, '🛡️', 'Đang đóng dấu chữ ký bảo mật HMAC SHA-256...', 95);
      return { ...res, options: [], toolsExecuted };
    }
    if (domain === 'loan') {
      const res = handleUpdateLoanTerms({
        accepted: true,
        reply: `Mình rất vui được chốt theo ${selectedOption.label || 'phương án bạn chọn'} nhé! Thông số khoản vay đã được cập nhật ưu đãi. ✨`,
        newAmount: selectedOption.newAmount,
        newBorrowRate: selectedOption.newBorrowRate,
        newAutoDeductPercent: selectedOption.newAutoDeductPercent,
        newCreditLimit: selectedOption.newCreditLimit
      }, targetEntity, callerSub, macro);
      notify(5, '🛡️', 'Đang đóng dấu chữ ký bảo mật HMAC SHA-256...', 95);
      return { ...res, options: [], toolsExecuted };
    }
  }

  // Try calling AI in Single-Turn if configured
  try {
    let userContext = '';
    try {
      const userProfile = await handleGetMyUserData('profile', callerSub, redis, { targetEntity });
      if (userProfile) {
        userContext = `\n[Hồ sơ hiệp sĩ]: Level ${userProfile.level || 1}, Ví ${userProfile.coins || 0} Vàng, Chuỗi ${userProfile.streak || 0} ngày.`;
      }
    } catch (_) {}

    let bankContext = '';
    if (domain === 'loan') {
      try {
        const market = await handleGetBankMarketStatus(redis, callerSub);
        bankContext = `\n[Thị trường kho bạc]: Thanh khoản ${market.liquidityStatus || 'normal'}, Trần lãi vay ${(market.standardBorrowRate * 100).toFixed(1)}%/ngày, Sàn bảo vệ ${(market.depositFloor * 100).toFixed(1)}%/ngày, Hạn mức vay tối đa ${market.userCreditLimit} Vàng.`;
      } catch (_) {}
    }

    notify(3, '🧠', 'Model Brain đang suy luận & đàm phán trong 1 lượt duy nhất...', 60);

    const targetDesc = targetEntity ? `\n[Thông tin đối tượng đang đàm phán (${domain})]: ${JSON.stringify(targetEntity)}` : '';
    const debateSystemPrompt = `${systemPrompt || ''}
BẠN LÀ TRỌNG TÀI AI ĐÀM PHÁN CÔNG BẰNG VÀ THÂN THIỆN TRONG LEVELUP RPG.
ĐÀM PHÁN TRONG 1 LƯỢT DUY NHẤT (SINGLE-TURN).

QUY TẮC PHẢN HỒI BẮT BUỘC:
1. Độ dài: CỰC KỲ NGẮN GỌN (tối đa 2-3 câu, dưới 40 từ), xưng hô "mình" - "bạn" thân thiện, vui vẻ.
2. Từ ngữ: Đời thường, mộc mạc. TUYỆT ĐỐI KHÔNG dùng thuật ngữ kỹ thuật (không nhắc pomodoro, zen mode, tier, amm, đòn bẩy, thanh khoản).
3. NẾU CHƯA ĐỒNG Ý / CẦN THƯƠNG LƯỢNG THÊM (accepted: false): BẮT BUỘC trả về 2-3 phương án đề xuất trong mảng "options". NẾU ĐÃ ĐỒNG Ý / CHỐT XONG (accepted: true): "options" BẮT BUỘC PHẢI LÀ MẢNG RỖNG [] để không hiện thêm lựa chọn thừa.
- Nếu là quest: các option gồm id, label (ngắn gọn), argument, newTargetMinutes, newRewardCoins.
- Nếu là reward: các option gồm id, label (ngắn gọn), argument, newPrice, newTargetMinutes.
- Nếu là loan: các option gồm id, label (ngắn gọn), argument, newAmount, newBorrowRate, newAutoDeductPercent.

Trả về JSON:
{
  "accepted": boolean,
  "reply": "string (tối đa 2 câu ngắn, dưới 40 từ, thân thiện)",
  "options": [
    { "id": 1, "label": "Phương án 1...", "argument": "Chốt phương án 1...", ... }
  ]
}`;

    const parsedJson = await callAI(
      debateSystemPrompt,
      `${finalArg}${targetDesc}${userContext}${bankContext}`,
      { role: 'brain', thinking: false, temperature: 0.3 }
    );

    const reply = (parsedJson && typeof parsedJson.reply === 'string')
      ? parsedJson.reply
      : (typeof parsedJson === 'string' ? parsedJson : '');
    const isQuestion = /\b(?:được\s*(?:không|ko|chăng)|có\s*được\s*không)\b|\?/i.test(finalArg);
    const userAgreed = !isQuestion && (
      /\b(chốt\s*(?:phương\s*án|kèo|deal)?|đồng\s*ý|dong\s*y|nhất\s*trí|nhat\s*tri|chấp\s*thuận|chap\s*thuan|thống\s*nhất|thong\s*nhat)\b/i.test(finalArg) ||
      /^(?:chốt|ok|oke|được|duoc|nhất trí|đồng ý)[\s.!]*$/i.test(finalArg.trim())
    );
    const aiAgreed = !/\b(?:để|hãy|bạn)\s*(?:cùng\s*)?chốt\b/i.test(reply) && /\b(đồng\s*ý|nhất\s*trí|thống\s*nhất|mình duyệt|mình chấp thuận|sẵn sàng)\b/i.test(reply);
    const accepted = (parsedJson && parsedJson.accepted !== undefined)
      ? Boolean(parsedJson.accepted)
      : (userAgreed && aiAgreed);

    let options = (parsedJson && Array.isArray(parsedJson.options) && parsedJson.options.length > 0)
      ? normalizeDebateOptions(parsedJson.options, domain)
      : parseDebateOptionsFromText(reply, domain);

    if (accepted || selectedOption) {
      options = [];
    } else if (!Array.isArray(options) || options.length === 0) {
      options = getFallbackNegotiationOptions(domain, targetEntity);
    }

    notify(5, '🛡️', 'Đang hoàn tất phản hồi & đóng dấu xác thực...', 95);
    const params = {
      ...(parsedJson && typeof parsedJson === 'object' ? parsedJson : {}),
      accepted,
      reply,
      fromAI: true
    };

    toolsExecuted.push('single_turn_brain_deliberation');

    if (domain === 'quest') {
      const res = handleUpdateQuestParameters(params, targetEntity, finalArg);
      return { ...res, options, toolsExecuted, fromAI: true };
    }
    if (domain === 'reward') {
      const res = handleUpdateRewardParameters(params, targetEntity);
      return { ...res, options, toolsExecuted, fromAI: true };
    }
    if (domain === 'loan') {
      const res = handleUpdateLoanTerms(params, targetEntity, callerSub, macro);
      return { ...res, options, toolsExecuted, fromAI: true };
    }
  } catch (err: any) {
    // Fall back to deterministic dispatcher
  }

  // Deterministic Fallback Dispatcher
  notify(4, '⚙️', 'AI kích hoạt bộ quy tắc phân xử nội bộ để phản hồi...', 75);
  toolsExecuted.push(`deterministic_fallback:${domain}`);
  let fallbackRes: any = null;
  if (domain === 'quest') {
    fallbackRes = { ...runDeterministicQuestDebate(targetEntity, finalArg, selectedOption), toolsExecuted };
  } else if (domain === 'reward') {
    fallbackRes = { ...runDeterministicRewardDebate(targetEntity, finalArg, selectedOption), toolsExecuted };
  } else if (domain === 'loan') {
    fallbackRes = { ...runDeterministicLoanDebate(targetEntity, finalArg, callerSub, macro, selectedOption), toolsExecuted };
  }
  if (!Array.isArray(fallbackRes?.options) || fallbackRes.options.length === 0) {
    if (fallbackRes) fallbackRes.options = getFallbackNegotiationOptions(domain, targetEntity);
  }
  notify(5, '🛡️', 'Đang đóng dấu chữ ký bảo mật HMAC SHA-256...', 95);
  return fallbackRes;
}
