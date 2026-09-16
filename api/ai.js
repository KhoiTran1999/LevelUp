import dotenv from 'dotenv';
import {
  extractToken,
  getRedis,
  authenticateCaller,
  getUserCloudData,
  getGlobalBankState,
  getAdminConfig,
  checkRateLimit,
  signQuest,
  signReward,
  signLoanOffer,
  calculateBankRates,
  calculateCreditLimit
} from './sync.js';
dotenv.config();

const BASE_URL = (process.env.CUSTOM_AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
const API_KEY = process.env.CUSTOM_AI_API_KEY || '';
export const MODEL_WORKER = process.env.MODEL_WORKER || process.env.CUSTOM_AI_MODEL || 'gpt-4o-mini';
export const MODEL_BRAIN = process.env.MODEL_BRAIN || process.env.CUSTOM_AI_MODEL || 'gpt-4o-mini';
export const MODEL = MODEL_WORKER; // ponytail: backward compatibility alias

/**
 * ponytail: Brain uses reasoning_effort 'low' for deep analysis; Worker uses 'none' for sub-second tool execution
 */
export function getModelAndReasoning(role = 'worker', thinkingOverride = null) {
  const isBrain = thinkingOverride !== null ? Boolean(thinkingOverride) : (role === 'brain');
  const model = isBrain ? MODEL_BRAIN : MODEL_WORKER;
  const reasoning_effort = isBrain ? 'low' : 'none';
  return { model, reasoning_effort, isBrain };
}

// Helper to call OpenAI-compatible completion with JSON output
// ponytail: 25s timeout ceiling prevents hanging; triggers deterministic fallback
export async function callAI(systemPrompt, userPrompt, temperature = 0.3, imageBase64 = null, opts = {}) {
  if (!API_KEY) {
    throw new Error('CUSTOM_AI_API_KEY is not configured');
  }

  let temp = temperature;
  let img = imageBase64;
  let options = opts;
  if (typeof temperature === 'object' && temperature !== null) {
    options = temperature;
    temp = options.temperature ?? 0.3;
    img = options.imageBase64 ?? null;
  }

  const role = options.role || (options.thinking ? 'brain' : 'worker');
  const thinking = options.thinking ?? null;
  const { model, reasoning_effort } = getModelAndReasoning(role, thinking);

  const userContent = img ? [
    { type: 'text', text: userPrompt },
    { type: 'image_url', image_url: { url: img.startsWith('data:') ? img : `data:image/jpeg;base64,${img}` } }
  ] : userPrompt;

  const payload = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent }
    ],
    temperature: temp,
    stream: false
  };

  if (reasoning_effort) {
    payload.reasoning_effort = reasoning_effort;
  }

  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    signal: AbortSignal.timeout(25000),
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify(payload)
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

/**
 * ponytail: Safe JSON extractor for LLM messages.
 * Prevents raw JSON dumps from leaking into user chat bubbles.
 */
export function parseAIJsonContent(rawContent) {
  if (!rawContent || typeof rawContent !== 'string') return null;
  let cleaned = rawContent.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```\s*$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/i, '').replace(/```\s*$/, '');
  }
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === 'object') return parsed;
  } catch (_) {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        if (parsed && typeof parsed === 'object') return parsed;
      } catch (_) {}
    }
  }
  return null;
}

/**
 * ponytail: Normalize structured options from AI JSON responses into UI-ready button payloads.
 */
export function normalizeDebateOptions(rawOptions, domain = 'quest') {
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
    ...(opt.newPrice !== undefined ? { newPrice: parseInt(opt.newPrice, 10) } : {}),
    ...(opt.newTier ? { newTier: opt.newTier } : {}),
    ...(opt.newName ? { newName: opt.newName } : {}),
    ...(opt.newAmount !== undefined ? { newAmount: parseInt(opt.newAmount, 10) } : {}),
    ...(opt.newBorrowRate !== undefined ? { newBorrowRate: Number(opt.newBorrowRate) } : {}),
    ...(opt.newAutoDeductPercent !== undefined ? { newAutoDeductPercent: Number(opt.newAutoDeductPercent) } : {}),
    ...(opt.newCreditLimit !== undefined ? { newCreditLimit: parseInt(opt.newCreditLimit, 10) } : {})
  }));
}

// =============================================================================
// AI TOOL CALLING ENGINE & NEGOTIATION TOOLS
// =============================================================================

export async function callAIWithTools(messages, tools = [], options = {}) {
  if (!API_KEY) {
    throw new Error('CUSTOM_AI_API_KEY is not configured');
  }

  let temp = 0.3;
  let role = 'worker';
  let thinking = null;
  if (typeof options === 'number') {
    temp = options;
  } else if (typeof options === 'object' && options !== null) {
    temp = options.temperature ?? 0.3;
    role = options.role || (options.thinking ? 'brain' : 'worker');
    thinking = options.thinking ?? null;
  }

  const { model, reasoning_effort } = getModelAndReasoning(role, thinking);

  const payload = {
    model,
    messages,
    temperature: temp,
    stream: false
  };

  if (reasoning_effort) {
    payload.reasoning_effort = reasoning_effort;
  }

  if (Array.isArray(tools) && tools.length > 0) {
    payload.tools = tools;
    payload.tool_choice = 'auto';
  }

  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    signal: AbortSignal.timeout(40000),
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`AI Gateway Error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  if (!choice || !choice.message) {
    throw new Error('Empty response from AI Gateway');
  }

  return choice.message;
}

export const TOOL_GET_MY_USER_DATA = {
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

export const TOOL_GET_BANK_MARKET_STATUS = {
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

export const TOOL_UPDATE_QUEST_PARAMETERS = {
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
        newRequiresProof: { type: 'boolean', description: 'Có yêu cầu chụp ảnh bằng chứng hay không' },
        newProofGuidance: { type: 'string', description: 'Hướng dẫn chụp ảnh nếu có yêu cầu' },
        newCategory: { type: 'string', enum: ['study', 'work', 'fitness', 'chore', 'habit', 'trivial'] }
      },
      required: ['accepted', 'reply']
    }
  }
};

export const TOOL_UPDATE_REWARD_PARAMETERS = {
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

export const TOOL_UPDATE_LOAN_TERMS = {
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

export const TOOL_SUGGEST_NEGOTIATION_OPTIONS = {
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

export async function handleGetMyUserData(category = 'all', callerSub, redis, draftContext = {}) {
  if (!callerSub) {
    return { error: 'Không xác định được danh tính người chơi.' };
  }

  const cloud = (redis && callerSub) ? await getUserCloudData(redis, callerSub) : null;
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
        activeQuests: quests.filter(q => q.status === 'active' || !q.completed).slice(0, 6).map(q => ({
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
        shopItems: shopItems.slice(0, 6).map(s => ({
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
        loan: bank.loan ? {
          amount: bank.loan.amount,
          borrowRate: bank.loan.borrowRate,
          autoDeductPercent: bank.loan.autoDeductPercent
        } : null,
        isFrozen: Boolean(bank.isFrozen)
      };
    case 'ledger':
      return {
        recentTransactions: ledger.map(l => ({
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

export async function handleGetBankMarketStatus(redis, callerSub, draftProfile = {}) {
  const poolState = redis ? await getGlobalBankState(redis) : {};
  const macro = analyzeMacroTelemetry(poolState);
  let creditLimit = 50;
  if (callerSub && redis) {
    const cloud = await getUserCloudData(redis, callerSub);
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

export function handleUpdateQuestParameters(params = {}, quest = {}) {
  const accepted = Boolean(params.accepted);
  let cleanReward = quest.rewardCoins;
  let cleanMinutes = quest.targetMinutes;
  let cleanType = quest.type;
  let cleanProof = quest.requiresProof;
  let cleanTitle = params.newTitle || quest.title || 'Nhiệm vụ mới';
  let cleanDesc = params.newDescription !== undefined ? params.newDescription : (quest.description || '');

  if (accepted) {
    if (params.newRewardCoins !== undefined) cleanReward = parseInt(params.newRewardCoins, 10) || cleanReward;
    if (params.newTargetMinutes !== undefined) cleanMinutes = parseInt(params.newTargetMinutes, 10);
    if (params.newType) cleanType = params.newType;
    else if (cleanMinutes !== undefined) cleanType = cleanMinutes > 0 ? 'focus' : 'bounty';
    if (params.newRequiresProof !== undefined) cleanProof = Boolean(params.newRequiresProof);
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
    proofGuidance: params.newProofGuidance || quest.proofGuidance || '',
    icon: quest.icon,
    isNegotiated: true
  };

  const clean = sanitizeEvaluatedQuest(rawDebate, quest.title, quest.description);
  const signature = accepted
    ? signQuest(clean.title, clean.type, clean.targetMinutes, clean.rewardCoins, clean.requiresProof)
    : (quest.signature || '');

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
    newProofGuidance: clean.proofGuidance,
    newIcon: clean.icon || quest.icon,
    signature
  };
}

export function handleUpdateRewardParameters(params = {}, reward = {}) {
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
    : (reward.signature || '');

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

export function handleUpdateLoanTerms(params = {}, loan = {}, callerId = 'guest', macro = {}) {
  const accepted = Boolean(params.accepted);
  let cleanAmount = parseInt(params.newAmount ?? loan.amount, 10) || 30;
  let cleanRate = Number(params.newBorrowRate ?? loan.borrowRate ?? macro.borrowRate ?? 0.05);
  if (cleanRate > 0.30) cleanRate = cleanRate / 100;
  const floor = macro.depositFloor || 0.015;
  cleanRate = Math.min(0.20, Math.max(floor, Number(cleanRate.toFixed(4))));

  let cleanDeduct = Number(params.newAutoDeductPercent ?? loan.autoDeductPercent ?? 0.50);
  if (cleanDeduct > 1.0) cleanDeduct = cleanDeduct / 100;
  cleanDeduct = Math.min(0.80, Math.max(0.30, Number(cleanDeduct.toFixed(2))));

  let cleanLimit = parseInt(params.newCreditLimit ?? loan.creditLimit, 10) || 50;
  cleanLimit = Math.max(cleanAmount, cleanLimit);

  const signature = accepted
    ? signLoanOffer(callerId, cleanAmount, cleanRate, cleanDeduct, cleanLimit)
    : (loan.signature || '');

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

export function handleSuggestNegotiationOptions(params = {}) {
  const domain = params.domain || 'quest';
  const rawOptions = Array.isArray(params.options) ? params.options : [];
  const options = rawOptions.map((opt, idx) => ({
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

export function runDeterministicQuestDebate(quest, argument, selectedOpt) {
  if (selectedOpt) {
    return handleUpdateQuestParameters({
      accepted: true,
      reply: `Mình hoàn toàn nhất trí chốt theo ${selectedOpt.label || 'phương án bạn chọn'} nhé! Thông số đã được cập nhật chuẩn xác. Chúc bạn làm việc thật hiệu quả! ✨`,
      newRewardCoins: selectedOpt.newRewardCoins,
      newTargetMinutes: selectedOpt.newTargetMinutes,
      newType: selectedOpt.newType,
      newRequiresProof: selectedOpt.newRequiresProof,
      newTitle: selectedOpt.newTitle
    }, quest);
  }

  // Explicit user parameters extraction (e.g. "10 phút", "7 vàng", "không cần bấm giờ")
  const explicitMinsMatch = argument.match(/(\d+)\s*(?:phút|min|p\b)/i);
  const isNoTimerMatch = /(?:không\s*(?:cần\s*)?bấm\s*giờ|bỏ\s*(?:hẹn\s*)?giờ|hoàn\s*thành\s*ngay|bounty)/i.test(argument);
  const requestedMins = isNoTimerMatch ? 0 : (explicitMinsMatch ? parseInt(explicitMinsMatch[1], 10) : null);
  const explicitCoinsMatch = argument.match(/(\d+)\s*vàng/i);
  const requestedCoins = explicitCoinsMatch ? parseInt(explicitCoinsMatch[1], 10) : null;

  if (requestedMins !== null || requestedCoins !== null) {
    const finalMins = requestedMins !== null
      ? Math.min(180, Math.max(0, requestedMins))
      : (quest.targetMinutes !== undefined ? quest.targetMinutes : (quest.type === 'focus' ? 25 : 0));
    const finalCoins = requestedCoins !== null
      ? Math.min(40, Math.max(1, requestedCoins))
      : (quest.rewardCoins || 10);
    const finalType = finalMins > 0 ? 'focus' : 'bounty';
    const minsText = finalMins > 0 ? `${finalMins} phút` : 'không cần bấm giờ';

    return handleUpdateQuestParameters({
      accepted: true,
      reply: `Mình hoàn toàn đồng ý điều chỉnh thời gian thành ${minsText} và mức thưởng ${finalCoins} Vàng theo đề xuất của bạn nhé! Chúc bạn thực hiện thật vui vẻ và sảng khoái! ✨`,
      newTargetMinutes: finalMins,
      newRewardCoins: finalCoins,
      newType: finalType
    }, quest);
  }

  const isChore = /(?:rửa|dọn|quét|giặt|đổ\s*rác|lau|nấu)/i.test(quest.title + ' ' + argument);
  const isBountyReq = /(?:không\s*(?:cần\s*)?bấm\s*giờ|hoàn\s*thành\s*ngay|bounty)/i.test(argument);
  const wantsMoreCoins = /(?:tăng|thêm|nâng).*(?:thưởng|vàng)|xin.*(?:thưởng|vàng)/i.test(argument);
  const wantsLessTime = /(?:giảm|rút\s*ngắn).*(?:thời\s*gian|phút)/i.test(argument);
  const userAgreed = /\b(chốt|đồng\s*ý|dong\s*y|nhất\s*trí|nhat\s*tri|ok|oke|được|duoc|chấp\s*thuận|chap\s*thuan|thống\s*nhất|thong\s*nhat)\b/i.test(argument);

  if (isBountyReq || (isChore && wantsMoreCoins)) {
    const coins = Math.min(5, Math.max(quest.rewardCoins || 3, 5));
    return handleUpdateQuestParameters({
      accepted: true,
      reply: `Việc này là việc nhanh gọn, mình đồng ý để bạn hoàn thành ngay không cần bấm giờ với mức thưởng ${coins} Vàng nhé! ✨`,
      newType: 'bounty',
      newTargetMinutes: 0,
      newRewardCoins: coins
    }, quest);
  }

  if (wantsLessTime) {
    const newMins = Math.max(10, Math.floor((quest.targetMinutes || 25) * 0.7));
    const newCoins = Math.max(5, Math.floor((quest.rewardCoins || 10) * 0.8));
    return handleUpdateQuestParameters({
      accepted: true,
      reply: `Mình đồng ý điều chỉnh thời gian tập trung xuống ${newMins} phút và mức thưởng ${newCoins} Vàng để bạn bắt đầu dễ dàng hơn nhé! ✨`,
      newTargetMinutes: newMins,
      newRewardCoins: newCoins,
      newType: 'focus'
    }, quest);
  }

  if (wantsMoreCoins) {
    const newCoins = Math.min(25, (quest.rewardCoins || 10) + 3);
    return handleUpdateQuestParameters({
      accepted: true,
      reply: `Lý do của bạn rất xác đáng! Mình đồng ý nâng mức thưởng lên ${newCoins} Vàng nhé. Cố gắng hoàn thành thật tốt nha! ✨`,
      newRewardCoins: newCoins,
      newTargetMinutes: quest.targetMinutes || 25,
      newType: quest.type || 'focus'
    }, quest);
  }

  if (userAgreed) {
    return handleUpdateQuestParameters({
      accepted: true,
      reply: `Tuyệt vời, tụi mình đã thống nhất thông số nhiệm vụ này nhé! Bạn có thể nhận việc và bắt đầu ngay. ✨`,
      newRewardCoins: quest.rewardCoins,
      newTargetMinutes: quest.targetMinutes,
      newType: quest.type
    }, quest);
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

export function runDeterministicRewardDebate(reward, argument, selectedOpt) {
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

  // Explicit user parameters extraction (e.g. "15 vàng", "20 phút")
  const explicitCoinsMatch = argument.match(/(\d+)\s*vàng/i);
  const explicitMinsMatch = argument.match(/(\d+)\s*(?:phút|min|p\b)/i);
  const requestedCoins = explicitCoinsMatch ? parseInt(explicitCoinsMatch[1], 10) : null;
  const requestedMins = explicitMinsMatch ? parseInt(explicitMinsMatch[1], 10) : null;

  if (requestedCoins !== null || requestedMins !== null) {
    const finalPrice = requestedCoins !== null ? Math.max(5, requestedCoins) : (reward.price || 20);
    const finalMins = requestedMins !== null ? Math.max(0, requestedMins) : (reward.targetMinutes || 0);
    return handleUpdateRewardParameters({
      accepted: true,
      reply: `Mình nhất trí điều chỉnh phần thưởng thành giá ${finalPrice} Vàng${finalMins > 0 ? ` và thời gian ${finalMins} phút` : ''} theo đề xuất của bạn nhé! ✨`,
      newPrice: finalPrice,
      newTargetMinutes: finalMins,
      newTier: finalPrice < 30 ? 'common' : (finalPrice < 70 ? 'rare' : reward.tier)
    }, reward);
  }

  const isLowerPriceReq = /(?:giảm|hạ|bớt|rẻ).*(?:giá|vàng)/i.test(argument);
  const isLowerTimeReq = /(?:giảm|rút\s*ngắn).*(?:thời\s*gian|phút)/i.test(argument);
  const isNoTimerReq = /(?:không\s*(?:cần\s*)?bấm\s*giờ|bỏ\s*(?:hẹn\s*)?giờ)/i.test(argument);
  const userAgreed = /\b(chốt|đồng\s*ý|dong\s*y|nhất\s*trí|nhat\s*tri|ok|oke|được|duoc|chấp\s*thuận|chap\s*thuan|thống\s*nhất|thong\s*nhat)\b/i.test(argument);

  if (isNoTimerReq) {
    return handleUpdateRewardParameters({
      accepted: true,
      reply: `Được chứ! Mình chuyển phần thưởng này sang dạng đổi quà nhận ngay không cần bấm giờ nhé. ✨`,
      newPrice: reward.price,
      newTargetMinutes: 0,
      newTier: reward.tier
    }, reward);
  }

  if (isLowerPriceReq && isLowerTimeReq) {
    const newPrice = Math.max(10, Math.floor(reward.price * 0.7));
    const newMins = Math.max(10, Math.floor((reward.targetMinutes || 30) * 0.7));
    return handleUpdateRewardParameters({
      accepted: true,
      reply: `Phương án này rất hợp lý! Mình đồng ý giảm giá xuống ${newPrice} Vàng tương ứng với ${newMins} phút tận hưởng nhé! ✨`,
      newPrice,
      newTargetMinutes: newMins,
      newTier: newPrice < 30 ? 'common' : reward.tier
    }, reward);
  }

  if (isLowerPriceReq) {
    const optRes = handleSuggestNegotiationOptions({
      domain: 'reward',
      reply: `Món quà này rất giá trị nên mình giữ mức giá ${reward.price} Vàng nhé! Nếu muốn đổi nhanh hơn, bạn có thể tham khảo phương án này nè:\n- Phương án 1: Giảm còn ${Math.floor(reward.price * 0.6)} Vàng nhưng rút ngắn thời lượng còn 20 phút.\n- Phương án 2: Giữ nguyên giá và bạn làm thêm 1 nhiệm vụ nữa là đủ Vàng nè!`,
      options: [
        { id: 1, label: `Phương án 1 (20 phút • ${Math.floor(reward.price * 0.6)} Vàng)`, argument: `Chốt phương án 1: 20 phút, ${Math.floor(reward.price * 0.6)} Vàng`, newTargetMinutes: 20, newPrice: Math.floor(reward.price * 0.6), newTier: 'common' }
      ]
    });
    return {
      ...handleUpdateRewardParameters({ accepted: false, reply: optRes.reply }, reward),
      options: optRes.options
    };
  }

  if (userAgreed) {
    return handleUpdateRewardParameters({
      accepted: true,
      reply: `Tuyệt vời, tụi mình đã chốt xong phần thưởng này nhé! ✨`,
      newPrice: reward.price,
      newTargetMinutes: reward.targetMinutes,
      newTier: reward.tier
    }, reward);
  }

  return handleUpdateRewardParameters({
    accepted: false,
    reply: `Mình rất hiểu mong muốn của bạn, nhưng tụi mình tạm giữ thông số này để bạn có thêm động lực hoàn thành nhiệm vụ nhé! ✨`
  }, reward);
}

export function runDeterministicLoanDebate(loan, argument, callerSub, macro = {}, selectedOption, profile = {}) {
  const currentAmount = Math.max(10, parseInt(loan?.amount, 10) || 30);
  const currentRate = Number(loan?.borrowRate) || macro.borrowRate || 0.05;
  const currentDeduct = Math.min(0.80, Math.max(0.30, Number(loan?.autoDeductPercent) || 0.50));
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
    }, loan, callerSub, macro);
  }

  // Explicit user loan amount extraction (e.g. "vay 40 vàng", "50 vàng")
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
    }, loan, callerSub, macro);
  }

  const isRateNegotiate = /giảm\s*(?:lãi|phí)|lãi\s*suất\s*thấp/i.test(argument);
  const isLimitNegotiate = /nâng\s*hạn\s*mức|tăng\s*hạn\s*mức|hạn\s*mức\s*cao/i.test(argument);
  const userAgreed = /\b(chốt|đồng\s*ý|dong\s*y|nhất\s*trí|nhat\s*tri|ok|oke|được|duoc|chấp\s*thuận|chap\s*thuan|thống\s*nhất|thong\s*nhat)\b/i.test(argument);

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
    }, loan, callerSub, macro);
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
    }, loan, callerSub, macro);
  }

  if (userAgreed) {
    return handleUpdateLoanTerms({
      accepted: true,
      reply: `Tuyệt vời, tụi mình đã thống nhất thông số khoản vay này nhé! ✨`,
      newAmount: currentAmount,
      newBorrowRate: currentRate,
      newCreditLimit: currentLimit,
      newAutoDeductPercent: currentDeduct
    }, loan, callerSub, macro);
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
    ...handleUpdateLoanTerms({ accepted: false, reply: optRes.reply }, loan, callerSub, macro),
    options: optRes.options
  };
}

// =============================================================================
// SERVER-SENT EVENTS (SSE) STREAMING HELPER
// =============================================================================
export function createSSEStream(res) {
  if (typeof res?.setHeader === 'function') {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
  }
  if (typeof res?.flushHeaders === 'function') {
    res.flushHeaders();
  }

  return {
    send(event, data) {
      if (typeof res?.write === 'function') {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      }
    },
    end(event, data) {
      if (event && data && typeof res?.write === 'function') {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      }
      if (typeof res?.end === 'function') {
        res.end();
      }
    }
  };
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
  tools,
  onEvent
}) {
  const notify = (step, icon, text, pct) => {
    if (typeof onEvent === 'function') {
      try { onEvent('step', { step, totalSteps: 5, icon, text, pct }); } catch (_) {}
    }
  };

  notify(1, '🔍', 'Đang tra cứu hồ sơ cá nhân & dữ liệu hiệp sĩ của bạn...', 20);

  const toolsExecuted = [];
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
        newTitle: selectedOption.newTitle
      }, targetEntity);
      notify(5, '🛡️', 'Đang đóng dấu chữ ký bảo mật HMAC SHA-256...', 95);
      return { ...res, toolsExecuted };
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
      return { ...res, toolsExecuted };
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
      return { ...res, toolsExecuted };
    }
  }

  // Try calling AI with tools if API_KEY configured
  if (API_KEY) {
    try {
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];

      for (let step = 0; step < 3; step++) {
        notify(3, '⚡', 'AI Worker đang xử lý công cụ & lập luận chốt thông số...', 55);
        const assistantMsg = await callAIWithTools(messages, tools, { role: 'worker', thinking: false, temperature: 0.35 });
        messages.push(assistantMsg);

        const toolCalls = assistantMsg.tool_calls;
        if (!toolCalls || toolCalls.length === 0) {
          const rawContent = assistantMsg.content || '';
          const parsedJson = parseAIJsonContent(rawContent);
          const reply = (parsedJson && typeof parsedJson.reply === 'string')
            ? parsedJson.reply
            : rawContent;
          const options = (parsedJson && Array.isArray(parsedJson.options) && parsedJson.options.length > 0)
            ? normalizeDebateOptions(parsedJson.options, domain)
            : parseDebateOptionsFromText(reply, domain);
          const userAgreed = /\b(chốt|đồng\s*ý|dong\s*y|nhất\s*trí|nhat\s*tri|ok|oke|được|duoc|chấp\s*thuận|chap\s*thuan|thống\s*nhất|thong\s*nhat)\b/i.test(userArgument);
          const aiAgreed = /\b(đồng\s*ý|nhất\s*trí|thống\s*nhất|chốt|mình duyệt|mình chấp thuận|sẵn sàng)\b/i.test(reply);
          const accepted = (parsedJson && parsedJson.accepted !== undefined)
            ? Boolean(parsedJson.accepted)
            : (userAgreed && aiAgreed);

          notify(5, '🛡️', 'Đang hoàn tất phản hồi & đóng dấu xác thực...', 95);
          const params = {
            ...(parsedJson || {}),
            accepted,
            reply
          };

          if (domain === 'quest') {
            const res = handleUpdateQuestParameters(params, targetEntity);
            return { ...res, options, toolsExecuted };
          }
          if (domain === 'reward') {
            const res = handleUpdateRewardParameters(params, targetEntity);
            return { ...res, options, toolsExecuted };
          }
          if (domain === 'loan') {
            const res = handleUpdateLoanTerms(params, targetEntity, callerSub, macro);
            return { ...res, options, toolsExecuted };
          }
        }

        let finalActionDone = false;
        let actionResult = null;

        for (const tc of toolCalls) {
          const fnName = tc.function?.name;
          toolsExecuted.push(fnName);
          let fnArgs = {};
          try { fnArgs = JSON.parse(tc.function?.arguments || '{}'); } catch (_) {}

          if (fnName === 'get_my_user_data') {
            notify(2, '📊', 'AI vừa tra cứu hồ sơ cá nhân & dữ liệu hiệp sĩ của bạn...', 40);
            const data = await handleGetMyUserData(fnArgs.category, callerSub, redis, { targetEntity });
            messages.push({
              role: 'tool',
              tool_call_id: tc.id,
              content: JSON.stringify(data)
            });
          } else if (fnName === 'get_bank_market_status') {
            notify(2, '🏦', 'AI vừa kiểm tra thanh khoản kho bạc & trần lãi suất...', 40);
            const status = await handleGetBankMarketStatus(redis, callerSub);
            messages.push({
              role: 'tool',
              tool_call_id: tc.id,
              content: JSON.stringify(status)
            });
          } else if (fnName === 'update_quest_parameters') {
            notify(4, '⚡', 'AI đang kích hoạt công cụ cập nhật thông số nhiệm vụ...', 80);
            actionResult = handleUpdateQuestParameters(fnArgs, targetEntity);
            finalActionDone = true;
          } else if (fnName === 'update_reward_parameters') {
            notify(4, '⚡', 'AI đang gọi công cụ cập nhật giá & phân hạng quà...', 80);
            actionResult = handleUpdateRewardParameters(fnArgs, targetEntity);
            finalActionDone = true;
          } else if (fnName === 'update_loan_terms') {
            notify(4, '⚡', 'AI đang gọi công cụ thiết lập gói vay ưu đãi...', 80);
            actionResult = handleUpdateLoanTerms(fnArgs, targetEntity, callerSub, macro);
            finalActionDone = true;
          } else if (fnName === 'suggest_negotiation_options') {
            notify(4, '💡', 'AI đang tạo các phương án lựa chọn tối ưu...', 80);
            actionResult = handleSuggestNegotiationOptions(fnArgs);
            finalActionDone = true;
          }
        }

        if (finalActionDone && actionResult) {
          if (typeof actionResult.reply === 'string' && (actionResult.reply.trim().startsWith('{') || actionResult.reply.trim().startsWith('```json'))) {
            const parsed = parseAIJsonContent(actionResult.reply);
            if (parsed && typeof parsed.reply === 'string') {
              actionResult.reply = parsed.reply;
              if ((!actionResult.options || actionResult.options.length === 0) && Array.isArray(parsed.options)) {
                actionResult.options = normalizeDebateOptions(parsed.options, domain);
              }
            }
          }
          if (!actionResult.options || actionResult.options.length === 0) {
            actionResult.options = parseDebateOptionsFromText(actionResult.reply, domain);
          }
          notify(5, '🛡️', 'Đang đóng dấu chữ ký bảo mật HMAC SHA-256...', 95);
          return { ...actionResult, toolsExecuted };
        }
      }
    } catch (err) {
      console.warn('[ToolCalling] Falling back to deterministic dispatcher:', err.message);
    }
  }

  // Deterministic Fallback Dispatcher
  notify(4, '⚙️', 'AI kích hoạt bộ quy tắc phân xử nội bộ để phản hồi...', 75);
  toolsExecuted.push(`deterministic_fallback:${domain}`);
  let fallbackRes = null;
  if (domain === 'quest') {
    fallbackRes = { ...runDeterministicQuestDebate(targetEntity, userArgument, selectedOption), toolsExecuted };
  } else if (domain === 'reward') {
    fallbackRes = { ...runDeterministicRewardDebate(targetEntity, userArgument, selectedOption), toolsExecuted };
  } else if (domain === 'loan') {
    fallbackRes = { ...runDeterministicLoanDebate(targetEntity, userArgument, callerSub, macro, selectedOption), toolsExecuted };
  }
  notify(5, '🛡️', 'Đang đóng dấu chữ ký bảo mật HMAC SHA-256...', 95);
  return fallbackRes;
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
export function sanitizeEvaluatedQuest(result, originalTitle = '', originalDesc = '', userRequestedMinutes = 0) {
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
  // ponytail: only chunk into Chapter 1 if input is actually a multi-chapter study task; upgrade if supporting other curriculum formats
  const isCrammedStudy = !result.isNegotiated && isStudyOrWork && (hasMultiChapterInOrig || hasMultiChapterInTitle || Boolean(result.isOverloaded) || mentionsOverload);

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

  // Tôn trọng thời gian người dùng yêu cầu cụ thể nếu hợp lý (10 - 180 phút) và không phải việc vặt hiển nhiên hay nhồi nhét
  const textMins = extractDurationFromText(`${normOrig} ${originalDesc}`);
  const explicitReqMins = userRequestedMinutes > 0 ? userRequestedMinutes : textMins;
  const hasValidUserDuration = explicitReqMins >= 10 && explicitReqMins <= 180 && !isTrivialTask && !isCrammedStudy;

  if (hasValidUserDuration && !result.isNegotiated) {
    targetMinutes = explicitReqMins;
    type = 'focus';
    // Tính toán mức Vàng theo thời gian hợp lý (~0.35 - 0.4 Vàng/phút)
    const minCoinsByTime = Math.max(3, Math.round(targetMinutes * 0.28));
    const maxCoinsByTime = Math.max(5, Math.round(targetMinutes * 0.45));
    if (rewardCoins < minCoinsByTime) {
      rewardCoins = Math.max(minCoinsByTime, Math.round(targetMinutes * 0.35));
    } else if (rewardCoins > maxCoinsByTime) {
      rewardCoins = maxCoinsByTime;
    }
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
    rewardCoins = Math.min(rewardCoins, result.isNegotiated ? 25 : 10);
  } else {
    targetMinutes = Math.max(result.isNegotiated ? 5 : 10, Math.min(180, targetMinutes));
    const maxCoinsByTime = result.isNegotiated
      ? (targetMinutes <= 25 ? 35 : (targetMinutes <= 50 ? 50 : 60))
      : (targetMinutes <= 25 ? 15 : (targetMinutes <= 50 ? 25 : Math.min(45, Math.round(targetMinutes * 0.45))));
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

  // ponytail: strip HTML tags from icon to prevent stored XSS via AI output
  const icon = (result.icon || '').replace(/<[^>]*>/g, '').trim().slice(0, 10);

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
    icon,
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

    const isBounty = /(?:không\s*(?:cần\s*)?bấm\s*giờ|khong\s*(?:can\s*)?bam\s*gio|hoàn\s*thành\s*ngay|hoan\s*thanh\s*ngay|\bbounty\b)/i.test(opt.text);
    const mentionsProofReq = /(?:cần|yêu\s*cầu|bắt\s*buộc)\s*(?:chụp\s*)?ảnh/i.test(opt.text);
    const mentionsProofWaive = /(?:miễn|không\s*cần|bỏ\s*(?:yêu\s*cầu)?)\s*(?:chụp\s*)?ảnh/i.test(opt.text);
    if (isBounty) mins = 0;

    let gold = undefined;
    let rate = undefined;
    let deduct = undefined;
    let limit = undefined;

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

    const payload = {};
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
      if (mentionsProofReq) payload.newRequiresProof = true;
      else if (mentionsProofWaive) payload.newRequiresProof = false;
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

/**
 * Phân tích giám sát vĩ mô Kho Bạc & AMM nội bộ
 * Cung cấp thông tin bảo mật làm thước đo kinh tế cho AI Thống Đốc
 */
export function analyzeMacroTelemetry(poolState = {}) {
  const rates = calculateBankRates(poolState);
  const p = Math.max(0, parseInt(poolState?.poolGold, 10) || 0);
  const b = Math.max(0, parseInt(poolState?.totalBorrowed, 10) || 0);
  const reserve = Math.max(0, parseInt(poolState?.reserveFund, 10) || 0);
  const bailout = Math.max(0, parseInt(poolState?.bailoutDebt, 10) || 0);
  const totalDep = Math.max(0, parseInt(poolState?.totalDeposited, 10) || 0);

  // Phân loại trạng thái thanh khoản nội bộ (Internal Macro Stance)
  let liquidityStatus = 'normal'; // 'abundant' | 'normal' | 'tight'
  if (bailout > 0 || rates.utilization > 0.75 || reserve < 50) {
    liquidityStatus = 'tight';
  } else if (rates.utilization < 0.40 && p >= 300 && bailout === 0) {
    liquidityStatus = 'abundant';
  }

  // Sàn lãi suất đàm phán an toàn: không bao giờ thấp hơn depositRate để tránh ngân hàng bị lỗ chi trả
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
export function sanitizeEvaluatedReward(result, originalName = '', originalDesc = '', userRequestedDuration = 0) {
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
        const userEstimateDuration = parseInt(payload?.userEstimateDuration, 10) || 0;
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
3. TIÊU CHUẨN TẬP TRUNG SÂU (DEEP WORK) & TÔN TRỌNG THỜI GIAN YÊU CẦU:
   - CHỈ các việc đòi hỏi tư duy trí óc hoặc rèn luyện (học tập, ôn thi, đọc sách, lập trình, làm dự án, thể thao) mới được cấp type = 'focus'.
   - TÔN TRỌNG THỜI GIAN NGƯỜI DÙNG YÊU CẦU CỤ THỂ NẾU HỢP LÝ:
     * Nếu người dùng có yêu cầu cụ thể về thời gian (qua ô nhập thời lượng hoặc nêu rõ trong tên/mô tả như "30 phút", "45 phút", "1 tiếng", "20p") và thời gian đó hợp lý (10 - 180 phút):
       -> BẮT BUỘC BẠN PHẢI TÔN TRỌNG VÀ ĐẶT 'targetMinutes' đúng bằng số phút người dùng mong muốn. TUYỆT ĐỐI KHÔNG tự ý ép về 25 hoặc 50 phút mặc định!
       -> TÍNH TOÁN MỨC VÀNG TƯƠNG XỨNG THEO THỜI GIAN: Tính công bằng theo tỷ lệ chuẩn ~0.35 - 0.40 Vàng/phút tập trung.
          Ví dụ chuẩn:
          + 15 phút: 5 - 7 Vàng
          + 20 phút: 7 - 9 Vàng
          + 30 phút: 10 - 12 Vàng
          + 45 phút: 15 - 17 Vàng
          + 60 phút (1 tiếng): 20 - 24 Vàng
          + 90 phút (1.5 tiếng): 30 - 35 Vàng
          + 120 phút (2 tiếng): 40 - 45 Vàng
     * Nếu người dùng KHÔNG yêu cầu thời gian cụ thể: Áp dụng khung chuẩn Pomodoro 25 phút = 8 - 10 Vàng, 50 phút = 18 - 20 Vàng.
4. QUY TẮC BẮT BUỘC CHIA NHỎ NHIỆM VỤ QUÁ TẢI (NGHIÊM CẤM BẢO USER TỰ CHIA):
   - Đánh giá khả thi trong 1 phiên: Một người chỉ có thể tập trung học sâu 1 đơn vị công việc vừa sức (ví dụ: Đọc kỹ & tóm tắt 1 chương sách, làm 3-5 bài tập toán, học 15-20 từ vựng).
   - NHỒI NHÉT / QUÁ TẢI: Nếu người dùng ghi đọc nhiều chương (như "10 chương", "5 chương", "toàn bộ cuốn sách"), học hàng trăm từ, làm toàn bộ đề cương ôn thi:
     -> BẮT BUỘC BẠF PHẢI CHỦ ĐỘNG ĐỔI TÊN ('title') NGAY THÀNH PHIÊN CHƯƠNG 1 (ví dụ: "Đọc kỹ & tóm tắt Chương 1 môn Kinh tế Vĩ mô").
     -> TUYỆT ĐỐI NGHIÊM CẤM giữ nguyên "10 chương" hay "toàn bộ các chương"!
     -> TUYỆT ĐỐI NGHIÊM CẤM bảo người dùng "hãy tự chia nhỏ" hay "ta cho 90 phút rồi tự chia nhỏ"! Trách nhiệm của bạn là PHẢI chia nhỏ ngay trong 'title' và 'description'.
     -> BẮT BUỘC đặt thời gian 'targetMinutes' là 25 hoặc 50 phút. KHÔNG ĐƯỢC đặt 90 phút cho các việc nhồi nhét.
     -> BẮT BUỘC đặt 'isModified': true và 'isOverloaded': true.
     -> BẮT BUỘC nêu rõ 'modificationReason': Lý do ngắn gọn vì sao việc 10 chương là quá tải và phiên bản Chương 1 này giúp người dùng học tập hiệu quả bền bỉ hơn.
   - CHỈ giữ nguyên tên ban đầu ("isModified": false) khi nhiệm vụ thực sự rõ ràng, vừa sức và khả thi trong 1 phiên duy nhất.
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
  2. Cơ sở định giá mức thưởng Vàng hoặc thời gian (Ví dụ: "Định mức chuẩn 4 Vàng cho việc dọn dẹp hàng ngày." hoặc "Phiên tập trung 30 phút nhận 11 Vàng chuẩn.").
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
  "icon": "1 emoji đại diện phù hợp nhất cho nhiệm vụ này (VD: 📚, 💻, 🧹, 🏃, 📝, 🎯)",
  "verdict": "Nhận xét súc tích (1-2 câu, dưới 30 từ), chỉ nêu loại việc và cơ sở định giá Vàng, không văn mẫu lê thê",
  "advice": "1 mẹo nhỏ cụ thể và thực tế giúp hoàn thành phiên này (dưới 15 từ)"
}`;

        let rewardContext = '';
        if (Array.isArray(currentRewards) && currentRewards.length > 0) {
          const rewardList = currentRewards.slice(0, 5).map(r => `  + "${r.name}" (Giá: ${r.price} Vàng, Hạng: ${r.tier || 'common'})`).join('\n');
          rewardContext = `\n- Các phần thưởng mục tiêu trong Cửa Hàng:\n${rewardList}\n- Số Vàng hiện có của người chơi: ${userCoins} Vàng`;
        }

        const inferredDuration = extractDurationFromText(`${title} ${description}`);
        const effectiveDuration = userEstimateDuration > 0 ? userEstimateDuration : inferredDuration;
        const durationPromptInfo = effectiveDuration > 0
          ? `${effectiveDuration} phút (người dùng yêu cầu cụ thể: hãy tôn trọng số phút này nếu hợp lý và tính Vàng tương xứng ~0.35-0.40 Vàng/phút)`
          : 'Để AI tự đề xuất (25 hoặc 50 phút cho học tập/việc sâu, 0 cho việc vặt)';

        const userPrompt = `Nhiệm vụ người dùng đề xuất:
- Tên công việc: "${title}"
- Chi tiết: "${description}"
- Mức thưởng mong muốn: ${userEstimateCoins ? userEstimateCoins + ' Vàng' : 'Để AI tính toán'}
- Thời gian tập trung mong muốn: ${durationPromptInfo}${rewardContext}`;

        const rawResult = await callAI(systemPrompt, userPrompt, { role: 'brain', thinking: true, temperature: 0.3 });
        const result = sanitizeEvaluatedQuest(rawResult, title, description, effectiveDuration);
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
  * KHÔNG dùng từ "Zen Mode" -> chỉ gọi là "chế độ toàn màn hình" hoặc "chế độ tập trung tối đa".
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

        const isStream = Boolean(payload?.stream) || req.headers?.accept === 'text/event-stream';
        const sse = isStream ? createSSEStream(res) : null;
        const onEvent = sse ? (ev, data) => sse.send(ev, data) : null;

        const selectedOpt = payload?.selectedOption;
        let result = null;
        try {
          result = await runNegotiationAgent({
            domain: 'quest',
            caller,
            redis,
            systemPrompt,
            userPrompt,
            targetEntity: quest,
            selectedOption: selectedOpt,
            userArgument: argument,
            tools: [TOOL_GET_MY_USER_DATA, TOOL_UPDATE_QUEST_PARAMETERS, TOOL_SUGGEST_NEGOTIATION_OPTIONS],
            onEvent
          });
        } catch (_) {}

        if (result && typeof result.reply === 'string' && (result.reply.trim().startsWith('{') || result.reply.trim().startsWith('```json'))) {
          const parsed = parseAIJsonContent(result.reply);
          if (parsed && typeof parsed.reply === 'string') {
            result.reply = parsed.reply;
            if ((!result.options || result.options.length === 0) && Array.isArray(parsed.options)) {
              result.options = normalizeDebateOptions(parsed.options, 'quest');
            }
            if (parsed.accepted !== undefined && !selectedOpt && !userAgreed) {
              result.accepted = Boolean(parsed.accepted);
            }
          }
        }

        const userAgreed = /\b(chốt|đồng\s*ý|dong\s*y|nhất\s*trí|nhat\s*tri|ok|oke|được|duoc|chấp\s*thuận|chap\s*thuan|thống\s*nhất|thong\s*nhat)\b/i.test(argument);
        const aiAgreed = result && typeof result.reply === 'string' && /\b(đồng\s*ý|nhất\s*trí|thống\s*nhất|chốt|mình duyệt|mình chấp thuận|sẵn sàng)\b/i.test(result.reply);

        // Deterministic fallback for quest debate if AI is offline
        if (!result) {
          result = runDeterministicQuestDebate(quest, argument, selectedOpt);
        }

        const isAccepted = Boolean(result.accepted) || Boolean(selectedOpt) || (userAgreed && aiAgreed);
        if (isAccepted) {
          result.accepted = true;
          let extractedCoins = undefined;
          let extractedMins = undefined;

          // Selected option parameters take priority over echoed LLM values
          if (selectedOpt) {
            if (selectedOpt.newRewardCoins !== undefined) extractedCoins = parseInt(selectedOpt.newRewardCoins, 10);
            if (selectedOpt.newTargetMinutes !== undefined) extractedMins = parseInt(selectedOpt.newTargetMinutes, 10);
            if (selectedOpt.newType !== undefined) result.newType = selectedOpt.newType;
            if (selectedOpt.newRequiresProof !== undefined) result.newRequiresProof = selectedOpt.newRequiresProof;
            if (selectedOpt.newTitle) result.newTitle = selectedOpt.newTitle;
            if (!result.reply || (!aiAgreed && !result.accepted)) {
              result.reply = `Mình hoàn toàn nhất trí chốt theo ${selectedOpt.label || 'phương án bạn chọn'} nhé! Thông số đã được cập nhật chuẩn xác. Chúc bạn làm việc thật hiệu quả! ✨`;
            }
          }

          if (extractedCoins === undefined) {
            if (result.newRewardCoins !== undefined) extractedCoins = parseInt(result.newRewardCoins, 10);
            else if (result.rewardCoins !== undefined) extractedCoins = parseInt(result.rewardCoins, 10);
          }

          if (extractedMins === undefined) {
            if (result.newTargetMinutes !== undefined) extractedMins = parseInt(result.newTargetMinutes, 10);
            else if (result.targetMinutes !== undefined) extractedMins = parseInt(result.targetMinutes, 10);
          }

          if (extractedCoins === undefined && result.reply) {
            const coinMatch = result.reply.match(/(?:mức\s*thưởng|thưởng|nâng\s*lên|tăng\s*lên|giảm\s*xuống|còn)[:\s]*(\d+)\s*vàng/i) || result.reply.match(/(\d+)\s*vàng/i);
            if (coinMatch) extractedCoins = parseInt(coinMatch[1], 10);
          }

          if (extractedMins === undefined) {
            const durationFromQuestName = extractDurationFromText(result.newTitle || selectedOpt?.newTitle || quest.title);
            if (durationFromQuestName > 0) {
              extractedMins = durationFromQuestName;
            } else if (result.reply) {
              const timeMatch = result.reply.match(/(?:thời\s*(?:gian|lượng)|tập\s*trung\s*(?:lên|xuống|khoảng)?|tăng\s*(?:thời\s*gian\s*)?(?:lên|xuống)|xuống|còn)[:\s]*(\d+)\s*phút/i);
              if (timeMatch) extractedMins = parseInt(timeMatch[1], 10);
            }
          }

          if (extractedMins === undefined && (result.newType === 'bounty' || selectedOpt?.newType === 'bounty' || /(?:không\s*(?:cần\s*)?bấm\s*giờ|hoàn\s*thành\s*ngay)/i.test(result.reply || ''))) {
            extractedMins = 0;
          }

          const rawCoins = (extractedCoins !== undefined && !isNaN(extractedCoins)) ? extractedCoins : quest.rewardCoins;
          const rawMins = (extractedMins !== undefined && !isNaN(extractedMins)) ? extractedMins : (quest.targetMinutes !== undefined ? quest.targetMinutes : 25);

          const hasExplicitProofDecision = result.newRequiresProof !== undefined || selectedOpt?.newRequiresProof !== undefined;
          const negotiatedProof = hasExplicitProofDecision
            ? parseBool(result.newRequiresProof ?? selectedOpt?.newRequiresProof, quest.requiresProof)
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
            proofGuidance: result.newProofGuidance !== undefined ? result.newProofGuidance : (quest.proofGuidance || ''),
            icon: quest.icon,
            isNegotiated: true
          };
          const clean = sanitizeEvaluatedQuest(rawDebate, quest.title, quest.description);
          result.newTitle = clean.title;
          result.newDescription = clean.description;
          result.newType = clean.type;
          result.newTargetMinutes = clean.targetMinutes;
          result.newRewardCoins = clean.rewardCoins;
          result.newRank = clean.rank;
          result.newIcon = clean.icon || quest.icon;

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
        if (sse) {
          sse.send('step', { step: 5, totalSteps: 5, icon: '🛡️', text: 'Đang đóng dấu xác thực bảo mật & hoàn tất phản hồi...', pct: 100 });
          sse.end('result', result);
          return;
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
5. ĐỊNH LƯỢNG THỜI GIAN TẬN HƯỞNG & TÍNH VÀNG TƯƠNG XỨNG ('targetMinutes'):
   - TÔN TRỌNG THỜI GIAN NGƯỜI DÙNG YÊU CẦU NẾU HỢP LÝ: Nếu người dùng có yêu cầu thời gian tận hưởng cụ thể (qua ô nhập thời lượng hoặc ghi trong tên/mô tả như "15 phút", "20p", "45 phút", "1 tiếng", "2 tiếng") và hợp lý (10 - 360 phút):
     * BẮT BUỘC đặt 'targetMinutes' đúng bằng số phút người dùng mong muốn.
     * TÍNH TOÁN GIÁ VÀNG TƯƠNG XỨNG VỚI THỜI GIAN ĐÓ:
       + 15 - 20 phút giải trí: 20 - 25 Vàng (hạng common/rare)
       + 30 phút giải trí: 30 - 35 Vàng (hạng rare)
       + 45 phút giải trí: 40 - 50 Vàng (hạng rare)
       + 60 phút (1 tiếng) giải trí: 55 - 65 Vàng (hạng rare)
       + 90 phút giải trí: 75 - 85 Vàng (hạng epic)
       + 120 phút (2 tiếng) giải trí: 95 - 110 Vàng (hạng epic)
   - ĐỐI VỚI HOẠT ĐỘNG GIẢI TRÍ (Xem video/Youtube, xem phim, chơi game, lướt TikTok/mạng xã hội): BẮT BUỘC PHẢI CÓ THỜI GIAN ĐẾM NGƯỢC (targetMinutes tối thiểu từ 15 - 30 phút trở lên), TUYỆT ĐỐI KHÔNG ĐỂ targetMinutes = 0 cho giải trí.
   - Chỉ đặt targetMinutes = 0 cho quà vật phẩm hoặc đồ ăn thức uống ăn nhanh không cần hẹn giờ (mua sách, uống ly trà sữa, ăn bánh).

QUY CHUẨN NHẬN XÉT TỪ TRỢ LÝ AI ('verdict'):
- CỰC KỲ SÚC TÍCH, NGẮN GỌN: Đúng 1 đến 2 câu ngắn (dưới 30 từ).
- DÙNG TỪ NGỮ ĐƠN GIẢN, DỄ HIỂU: Tuyệt đối không dùng các thuật ngữ như "dopamine", "tỷ lệ 3:1", "RPG", "tier", "Pomodoro". Giải thích đơn giản, dễ hiểu bằng tiếng Việt thông thường.
- CHỈ GIỮ LẠI THÔNG TIN HỮU ÍCH:
  1. Phân loại món quà và cơ sở định giá mức Vàng (Ví dụ: "Phần thưởng giải trí 20 phút mức giá 25 Vàng phù hợp với công sức bỏ ra.").
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
          ? `${effectiveDuration} phút (người dùng yêu cầu cụ thể: hãy tôn trọng số phút này nếu hợp lý và tính giá Vàng tương xứng)`
          : 'Để AI đề xuất (BẮT BUỘC đặt 15 - 30 phút cho hoạt động giải trí/mạng xã hội, 0 cho ăn uống/vật phẩm)';

        const userPrompt = `Phần thưởng muốn thêm vào Cửa Hàng:
- Tên phần thưởng: "${name}"
- Chi tiết: "${description}"
- Mức giá người dùng dự kiến: ${userEstimatePrice ? userEstimatePrice + ' Vàng' : 'Để AI đề xuất'}
- Thời gian tận hưởng dự kiến: ${durationPromptInfo}${questContext}`;

        const rawResult = await callAI(systemPrompt, userPrompt, { role: 'brain', thinking: true, temperature: 0.3 });
        const result = sanitizeEvaluatedReward(rawResult, name, description, effectiveDuration);
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
  * KHÔNG dùng các từ tiếng Anh: "tier", "common", "rare", "epic", "legendary", "Pomodoro", "Zen Mode".
  * Thay bằng tiếng Việt đời thường: "phổ thông", "cao cấp", "quý giá", "cực phẩm", "đếm giờ", "chế độ toàn màn hình".
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

        const isStream = Boolean(payload?.stream) || req.headers?.accept === 'text/event-stream';
        const sse = isStream ? createSSEStream(res) : null;
        const onEvent = sse ? (ev, data) => sse.send(ev, data) : null;

        const selectedOpt = payload?.selectedOption;
        let result = null;
        try {
          result = await runNegotiationAgent({
            domain: 'reward',
            caller,
            redis,
            systemPrompt,
            userPrompt,
            targetEntity: reward,
            selectedOption: selectedOpt,
            userArgument: argument,
            tools: [TOOL_GET_MY_USER_DATA, TOOL_UPDATE_REWARD_PARAMETERS, TOOL_SUGGEST_NEGOTIATION_OPTIONS],
            onEvent
          });
        } catch (_) {}

        if (result && typeof result.reply === 'string' && (result.reply.trim().startsWith('{') || result.reply.trim().startsWith('```json'))) {
          const parsed = parseAIJsonContent(result.reply);
          if (parsed && typeof parsed.reply === 'string') {
            result.reply = parsed.reply;
            if ((!result.options || result.options.length === 0) && Array.isArray(parsed.options)) {
              result.options = normalizeDebateOptions(parsed.options, 'reward');
            }
            if (parsed.accepted !== undefined && !selectedOpt && !userAgreed) {
              result.accepted = Boolean(parsed.accepted);
            }
          }
        }

        const userAgreed = /\b(chốt|đồng\s*ý|dong\s*y|nhất\s*trí|nhat\s*tri|ok|oke|được|duoc|chấp\s*thuận|chap\s*thuan|thống\s*nhất|thong\s*nhat)\b/i.test(argument);
        const aiAgreed = result && typeof result.reply === 'string' && /\b(đồng\s*ý|nhất\s*trí|thống\s*nhất|chốt|mình duyệt|mình chấp thuận|sẵn sàng)\b/i.test(result.reply);

        // Deterministic fallback for reward debate if AI is offline
        if (!result) {
          result = runDeterministicRewardDebate(reward, argument, selectedOpt);
        }

        const isAccepted = Boolean(result.accepted) || Boolean(selectedOpt) || (userAgreed && aiAgreed);
        if (isAccepted) {
          result.accepted = true;
          let extractedPrice = undefined;
          let extractedMins = undefined;

          // Selected option parameters take priority over echoed LLM values
          if (selectedOpt) {
            if (selectedOpt.newPrice !== undefined) extractedPrice = parseInt(selectedOpt.newPrice, 10);
            if (selectedOpt.newTargetMinutes !== undefined) extractedMins = parseInt(selectedOpt.newTargetMinutes, 10);
            if (selectedOpt.newTier) result.newTier = selectedOpt.newTier;
            if (selectedOpt.newName) result.newName = selectedOpt.newName;
          }

          if (extractedPrice === undefined) {
            if (result.newPrice !== undefined) extractedPrice = parseInt(result.newPrice, 10);
            else if (result.price !== undefined) extractedPrice = parseInt(result.price, 10);
          }

          if (extractedMins === undefined) {
            if (result.newTargetMinutes !== undefined) extractedMins = parseInt(result.newTargetMinutes, 10);
            else if (result.targetMinutes !== undefined) extractedMins = parseInt(result.targetMinutes, 10);
          }

          if (extractedPrice === undefined && result.reply) {
            const priceMatch = result.reply.match(/(?:mức\s*giá|giá(?:\s*vàng)?|giảm\s*(?:còn|xuống)|còn)[:\s]*(\d+)\s*vàng/i) || result.reply.match(/(\d+)\s*vàng/i);
            if (priceMatch) extractedPrice = parseInt(priceMatch[1], 10);
          }

          const durationFromName = extractDurationFromText(result.newName || selectedOpt?.newName || reward.name);
          if (extractedMins === undefined && durationFromName > 0) {
            extractedMins = durationFromName;
          } else if (extractedMins === undefined && result.reply) {
            const timeMatch = result.reply.match(/(?:thời\s*(?:gian|lượng)|rút\s*ngắn\s*(?:thời\s*gian\s*)?(?:xuống|còn)|xuống|còn)[:\s]*(\d+)\s*phút/i);
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
        if (sse) {
          sse.send('step', { step: 5, totalSteps: 5, icon: '🛡️', text: 'Đang ký duyệt thông số và hoàn tất phản hồi...', pct: 100 });
          sse.end('result', result);
          return;
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

        const result = await callAI(systemPrompt, userPrompt, { role: 'brain', thinking: true, temperature: 0.2, imageBase64 });
        return res.status(200).json({
          approved: Boolean(result.approved),
          feedback: (result.feedback || (result.approved ? 'Bằng chứng hợp lệ! Chúc mừng bạn đã hoàn thành nhiệm vụ.' : 'Ảnh chưa thấy rõ kết quả công việc, bạn vui lòng chụp lại nhé.')).trim()
        });
      }

      // ==========================================
      // 7. BANK CONSULT LOAN (AI Tư vấn & Lập kế hoạch khoản vay)
      // ==========================================
      case 'bank_consult_loan':
      case 'bank_credit_appraise': {
        const userProfile = payload?.profile || {};
        const autoDeduct = Math.min(0.80, Math.max(0.30, Number(payload?.autoDeductPercent) || 0.50));
        const requestedAmount = Math.max(0, parseInt(payload?.requestedAmount, 10) || 0);
        const poolState = payload?.poolState || {};
        const macro = analyzeMacroTelemetry(poolState);
        const rates = macro;
        const creditLimit = calculateCreditLimit(userProfile, autoDeduct);
        const userCoins = parseInt(userProfile?.coins, 10) || 0;
        const level = Math.max(1, parseInt(userProfile?.level, 10) || 1);
        const streak = Math.max(0, parseInt(userProfile?.streak, 10) || 0);

        const quests = Array.isArray(payload?.quests) ? payload.quests.slice(0, 8) : [];
        const shopItems = Array.isArray(payload?.shopItems) ? payload.shopItems.slice(0, 6) : [];
        const earningsStats = payload?.earningsStats || {};
        const avgDaily = Math.max(0, parseInt(earningsStats?.avgDailyIncome, 10) || 0);
        const todayEarned = Math.max(0, parseInt(earningsStats?.todayEarned, 10) || 0);

        let aiResult = null;

        if (API_KEY) {
          try {
            const systemPrompt = `Bạn là Trợ Lý Vay Vàng & Cố Vấn Kế Hoạch Tài Chính của LevelUp RPG.
Nhiệm vụ: Thay vì để người dùng tự tính toán phức tạp, bạn phân tích toàn diện: số Vàng hiện có, nhiệm vụ khả dụng, quà muốn mua trong Cửa Hàng, năng lực kiếm Vàng mỗi ngày, và đưa ra quyết định thông thái:

BÁO CÁO NỘI BỘ GIÁM SÁT KHO BẠC & NGÂN HÀNG (DÀNH CHO BẠN - THỐNG ĐỐC AI):
- Trạng thái quỹ: ${macro.liquidityStatus === 'abundant' ? 'DỒI DÀO (Khuyến khích hiệp sĩ vay vốn làm việc, sẵn sàng tư vấn gói tốt nhất)' : macro.liquidityStatus === 'tight' ? 'CẦN BẢO TOÀN VỐN (Khuyên vay vừa sức và trích nợ cao 60-80% để trả nhanh)' : 'BÌNH THƯỜNG / CÂN BẰNG'}
- Lãi suất vay hiện tại: ${(rates.borrowRate * 100).toFixed(1)}%/ngày. Sàn bảo vệ quỹ ngân hàng: ${(macro.depositFloor * 100).toFixed(1)}%/ngày.

CHỈ THỊ BẢO MẬT TUYỆT ĐỐI (ZERO-LEAK DIRECTIVE — BẢO VỆ THÔNG TIN MẬT):
- TUYỆT ĐỐI KHÔNG TIẾT LỘ bất kỳ con số cụ thể nào của kho bạc (số Vàng trong kho, tổng nợ hệ thống, quỹ dự phòng, nợ cứu trợ, tiền gửi) hay thuật ngữ kỹ thuật ("AMM", "thanh khoản", "bailout", "spread", "chiết khấu") cho người chơi.
- Khi tư vấn, chỉ dùng từ ngữ đời thường, bình dân, ấm áp (ví dụ "kho Vàng vương quốc đang rất dồi dào" hoặc "ngân hàng đang hỗ trợ cho nhiều hiệp sĩ khác").

1. CÓ NÊN VAY HAY KHÔNG ('shouldBorrow': boolean):
   - Nếu người chơi đã có nhiều Vàng so với các món quà trong Cửa Hàng, hoặc chỉ cần làm 1-2 việc nhỏ là đủ Vàng mua quà: Khuyên KHÔNG CẦN VAY ("shouldBorrow": false) để tiết kiệm tiền phí lãi suất ngày.
   - Nếu người chơi thiếu Vàng cho một món quà cụ thể và có khả năng làm nhiệm vụ đều đặn: Khuyên NÊN VAY ("shouldBorrow": true) với số lượng vừa vặn.
2. NÊN VAY BAO NHIÊU ('recommendedAmount': number):
   - Đề xuất số Vàng hợp lý, an toàn, không vượt quá hạn mức tối đa (${creditLimit} Vàng) và người chơi có thể trả hết dễ dàng trong 2 - 4 ngày.
3. LỘ TRÌNH LÀM VIỆC TRẢ NỢ CỤ THỂ ('repaymentPlan': string):
   - BẮT BUỘC tính cả TIỀN PHÍ LÃI SUẤT NGÀY vào tổng nợ để trả sạch cả gốc lẫn lãi:
     * Mỗi ngày nợ sẽ tính thêm phí lãi = Số Vàng vay * Lãi suất ngày.
     * Dự kiến trả trong N ngày thì Tổng nợ cần trả = Số Vàng vay + (Số Vàng vay * Lãi suất ngày * N ngày).
     * Từ tổng nợ đó và tỷ lệ trích nợ, tính ra tổng tiền thưởng cần kiếm và nêu rõ: Cần làm những việc gì trong danh sách nhiệm vụ của bạn ấy, làm bao nhiêu lần và dự kiến mất bao nhiêu ngày để tự động trả hết sạch nợ cả gốc lẫn lãi (ví dụ: "Khoản vay 40 Vàng lãi 5%/ngày trong 2 ngày sẽ phát sinh thêm 4 Vàng tiền phí lãi (tổng nợ ~44 Vàng). Chỉ cần làm 'Đọc sách' 3 lần trong 2 ngày (thu 90 Vàng, trích 50% = 45 Vàng) là trả sạch toàn bộ nợ nhẹ nhàng!").
4. CÁC PHƯƠNG ÁN LỰA CHỌN ('options': array):
   - Cung cấp 2-3 phương án định sẵn (mỗi phương án có số Vàng vay, lãi suất ngày, tỷ lệ trích nợ) để người dùng có thể bấm chọn ngay.

PHONG CÁCH PHẢN HỒI — ĐƠN GIẢN, GẦN GŨI, TUYỆT ĐỐI TRÁNH THUẬT NGỮ KHÓ HIỂU:
- TUYỆT ĐỐI KHÔNG dùng từ ngữ kỹ thuật hay thuật ngữ tài chính khó hiểu (như "tỷ lệ đòn bẩy", "khả năng thanh khoản", "rủi ro vĩ mô", "chiết khấu", "lạm phát điểm", "Pomodoro", "AMM", "siết nợ", "tất toán", "giải ngân", "bể", "Zen Mode"). Thay bằng từ ngữ đời thường, bình dân: "trả hết nợ", "nhận Vàng vay", "tự động trích Vàng trả dần", "quỹ Vàng", "chế độ toàn màn hình".
- Xưng hô "mình" - "bạn" thân mật, lịch thiệp, đồng cảm, luôn động viên tinh thần rèn luyện thói quen tốt.
- Giải thích đơn giản, tự nhiên: "mỗi khi làm xong việc hệ thống sẽ trích một phần tiền thưởng trả nợ", "tiền phí trả thêm mỗi ngày (lãi suất)", "khoản vay nhẹ nhàng vừa sức".

Trả về ĐÚNG định dạng JSON:
{
  "shouldBorrow": boolean,
  "recommendedAmount": number,
  "recommendedDeductPercent": number,
  "estimatedDaysToRepay": number,
  "estimatedInterest": number,
  "totalEstimatedDebt": number,
  "repaymentPlan": "Kế hoạch trả nợ cụ thể: nêu rõ làm việc gì, bao nhiêu lần, tính cả tiền lãi phát sinh để trả sạch nợ trong bao nhiêu ngày",
  "advice": "Lời khuyên ngắn gọn (2-3 câu), thân thiện, động viên",
  "warning": "Lưu ý nếu có về thời hạn 7 ngày và nhắc người chơi: trả nợ qua làm nhiệm vụ được miễn phí phạt (nếu tự bấm trả nợ sớm bằng ví Vàng sẽ chịu phí phạt tất toán 5%)",
  "options": [
    {
      "id": 1,
      "label": "Tên phương án ngắn gọn kèm số Vàng và % trích",
      "argument": "Câu chốt phương án",
      "newAmount": number,
      "newBorrowRate": number,
      "newAutoDeductPercent": number,
      "newCreditLimit": number
    }
  ]
}`;

            const questSummary = quests.length > 0
              ? quests.map(q => `  + "${q.title}": thưởng ${q.rewardCoins} Vàng (${q.type === 'focus' ? (q.targetMinutes || 25) + 'p' : 'không bấm giờ'}, ${q.isRepeatable ? 'làm lại được' : '1 lần'})`).join('\n')
              : '  (Chưa có nhiệm vụ nào, khuyên tạo thêm nhiệm vụ)';

            const shopSummary = shopItems.length > 0
              ? shopItems.map(s => `  + "${s.name}": giá ${s.price} Vàng`).join('\n')
              : '  (Cửa hàng chưa có quà)';

            const userPrompt = `Thông tin tài chính của người chơi:
- Cấp độ: ${level}, Chuỗi chăm chỉ: ${streak} ngày.
- Số Vàng hiện có trong ví: ${userCoins} Vàng.
- Thu nhập trung bình gần đây: khoảng ${avgDaily || 15} Vàng/ngày (hôm nay đã kiếm ${todayEarned} Vàng).
- Hạn mức vay tối đa được cấp: ${creditLimit} Vàng.
- Lãi suất vay hiện tại: ${(rates.borrowRate * 100).toFixed(1)}%/ngày.
- Tỷ lệ trích nợ dự kiến: ${(autoDeduct * 100).toFixed(0)}%.
- Nhiệm vụ người chơi đang có:
${questSummary}
- Các phần thưởng trong Cửa Hàng:
${shopSummary}
${requestedAmount > 0 ? `- Người chơi đang dự định vay: ${requestedAmount} Vàng.` : '- Người chơi chưa biết nên vay bao nhiêu.'}
Hãy phân tích và đưa ra lời khuyên cho bạn ấy.`;

            aiResult = await callAI(systemPrompt, userPrompt, { role: 'brain', thinking: true, temperature: 0.3 });
          } catch (_) {}
        }

        // Smart deterministic fallback if AI is offline or call fails
        const shouldBorrowDefault = userCoins < 40;
        const safeAmountDefault = Math.min(creditLimit, Math.max(15, Math.floor((avgDaily || 20) * 2)));
        const finalAmount = Math.min(creditLimit, requestedAmount > 0 ? requestedAmount : (aiResult?.recommendedAmount || safeAmountDefault));
        const finalDeduct = typeof aiResult?.recommendedDeductPercent === 'number' ? Math.min(0.8, Math.max(0.3, aiResult.recommendedDeductPercent)) : autoDeduct;

        const estDays = Math.max(1, parseInt(aiResult?.estimatedDaysToRepay, 10) || Math.min(6, Math.max(2, Math.ceil(finalAmount / Math.max(5, (avgDaily || 15) * finalDeduct)))));
        const estimatedInterest = Math.max(0, parseInt(aiResult?.estimatedInterest, 10) || Math.ceil(finalAmount * rates.borrowRate * estDays));
        const totalEstimatedDebt = Math.max(finalAmount, parseInt(aiResult?.totalEstimatedDebt, 10) || (finalAmount + estimatedInterest));

        let fallbackPlan = '';
        if (quests.length > 0) {
          const q1 = quests[0];
          const coinsNeeded = Math.ceil(totalEstimatedDebt / finalDeduct);
          const timesNeeded = Math.max(1, Math.ceil(coinsNeeded / Math.max(1, q1.rewardCoins || 10)));
          fallbackPlan = `Bạn chỉ cần hoàn thành nhiệm vụ "${q1.title}" khoảng ${timesNeeded} lần trong ${estDays} ngày (thu về ~${coinsNeeded} Vàng, trích ra trả ~${totalEstimatedDebt} Vàng gồm ${finalAmount} Vàng gốc + ${estimatedInterest} Vàng tiền phí lãi) là sạch nợ nhẹ nhàng!`;
        } else {
          fallbackPlan = `Khoản vay ${finalAmount} Vàng dự kiến phát sinh thêm khoảng ${estimatedInterest} Vàng tiền phí lãi trong ${estDays} ngày (tổng nợ ~${totalEstimatedDebt} Vàng). Bạn hãy thêm 1-2 nhiệm vụ để làm đều đặn trong ${estDays} ngày, hệ thống sẽ tự động trích thưởng trả hết sạch nhé!`;
        }

        const advice = aiResult?.advice || (shouldBorrowDefault
          ? `Bạn đang có chuỗi chăm chỉ ${streak} ngày và kiếm được khoảng ${avgDaily || 15} Vàng/ngày. Vay ${finalAmount} Vàng là mức vừa sức giúp bạn đổi quà sớm mà không lo áp lực!`
          : `Bạn đang có sẵn ${userCoins} Vàng trong ví, đủ để đổi nhiều món quà nhỏ mà không cần vay mượn. Nếu cần món lớn hơn thì hãy vay một khoản nhỏ nhé!`);

        const repaymentPlan = aiResult?.repaymentPlan || fallbackPlan;
        const warning = aiResult?.warning || 'Hãy nhớ trả nợ trong vòng 7 ngày để tránh bị tạm khóa đổi quà nhé!';
        const shouldBorrow = aiResult?.shouldBorrow !== undefined ? parseBool(aiResult.shouldBorrow, shouldBorrowDefault) : shouldBorrowDefault;

        let options = Array.isArray(aiResult?.options) && aiResult.options.length > 0 ? aiResult.options : [];
        if (options.length === 0) {
          const opt1Amt = Math.max(15, Math.floor(finalAmount * 0.7));
          const opt2Amt = Math.min(creditLimit, Math.max(finalAmount, Math.floor(finalAmount * 1.3)));
          options = [
            {
              id: 1,
              label: `Gói an toàn: Vay ${opt1Amt} Vàng (Trích 50%)`,
              argument: `Mình chọn gói an toàn vay ${opt1Amt} Vàng với tỷ lệ trích 50%`,
              newAmount: opt1Amt,
              newBorrowRate: rates.borrowRate,
              newAutoDeductPercent: 0.50,
              newCreditLimit: creditLimit
            },
            {
              id: 2,
              label: `Gói tăng tốc: Vay ${opt2Amt} Vàng (Trích 70%)`,
              argument: `Mình chọn gói tăng tốc vay ${opt2Amt} Vàng với tỷ lệ trích 70%`,
              newAmount: opt2Amt,
              newBorrowRate: rates.borrowRate,
              newAutoDeductPercent: 0.70,
              newCreditLimit: creditLimit
            }
          ];
        }

        return res.status(200).json({
          shouldBorrow,
          creditLimit,
          recommendedAmount: finalAmount,
          borrowRate: rates.borrowRate,
          autoDeductPercent: finalDeduct,
          estimatedDaysToRepay: estDays,
          estimatedInterest,
          totalEstimatedDebt,
          repaymentPlan,
          advice,
          warning,
          options
        });
      }

      // ==========================================
      // 8. BANK DEBATE LOAN (AI Thương lượng khoản vay)
      // ==========================================
      case 'bank_debate_loan': {
        const loan = payload?.loan || {};
        const argument = clampStr(payload?.argument, 1000);
        const history = Array.isArray(payload?.history) ? payload.history.slice(-6) : [];
        const userProfile = payload?.profile || {};
        const poolState = payload?.poolState || {};
        const macro = analyzeMacroTelemetry(poolState);
        const rates = macro;
        const quests = Array.isArray(payload?.quests) ? payload.quests.slice(0, 8) : [];
        const shopItems = Array.isArray(payload?.shopItems) ? payload.shopItems.slice(0, 6) : [];
        const earningsStats = payload?.earningsStats || {};
        const selectedOption = payload?.selectedOption;

        if (!argument) {
          return res.status(400).json({ error: 'Thiếu lý lẽ thương lượng.' });
        }

        const level = Math.max(1, parseInt(userProfile?.level, 10) || 1);
        const streak = Math.max(0, parseInt(userProfile?.streak, 10) || 0);
        const userCoins = parseInt(userProfile?.coins, 10) || 0;
        const currentAmount = Math.max(10, parseInt(loan?.amount, 10) || 30);
        const currentRate = Number(loan?.borrowRate) || rates.borrowRate;
        const currentDeduct = Math.min(0.80, Math.max(0.30, Number(loan?.autoDeductPercent) || 0.50));
        const currentLimit = Math.max(20, parseInt(loan?.creditLimit, 10) || calculateCreditLimit(userProfile, currentDeduct));

        const systemPrompt = `Bạn là Trợ Lý Vay Vàng & Thống Đốc Ngân Hàng AI của LevelUp RPG.
CHỈ CÓ BẠN mới có thẩm quyền chốt: Mức Vàng vay ('newAmount'), Lãi suất ưu đãi (%/ngày, 'newBorrowRate'), Tỷ lệ trích nợ ('newAutoDeductPercent'), và Hạn mức tín dụng được cấp ('newCreditLimit'). Người dùng không thể tự ý sửa đổi ngoài việc thương lượng với bạn.

BÁO CÁO NỘI BỘ GIÁM SÁT KHO BẠC & NGÂN HÀNG TRUNG ƯƠNG (DÀNH CHO BẠN - THỐNG ĐỐC AI):
- Trạng thái vốn hệ thống: ${macro.liquidityStatus === 'abundant' ? 'DỒI DÀO (Khuyến khích hiệp sĩ vay vốn làm việc, sẵn sàng ưu đãi sâu)' : macro.liquidityStatus === 'tight' ? 'CĂNG THẲNG / CẦN BẢO TOÀN VỐN (Thận trọng, chỉ ưu đãi khi người vay tăng trích nợ 60-80% để thu hồi vốn nhanh)' : 'BÌNH THƯỜNG / CÂN BẰNG'}
- Sàn lãi suất huy động tiền gửi (Deposit Rate): ${(macro.depositRate * 100).toFixed(1)}%/ngày.
  * SÀN BẢO VỆ NGÂN HÀNG BẮT BUỘC: ${(macro.depositFloor * 100).toFixed(1)}%/ngày.
  * NGUYÊN TẮC AN TOÀN VỐN BẮT BUỘC: Lãi suất cho vay ưu đãi ('newBorrowRate') TUYỆT ĐỐI KHÔNG ĐƯỢC THẤP HƠN ${(macro.depositFloor * 100).toFixed(1)}%/ngày (tức ${macro.depositFloor}). Nếu thấp hơn mức này, tiền lãi thu về không đủ bù đắp tiền thưởng chi trả cho người gửi tiết kiệm!
- Lãi suất cho vay thị trường chuẩn (Borrow Rate): ${(macro.borrowRate * 100).toFixed(1)}%/ngày.

QUY TẮC THƯƠNG LƯỢNG WIN-WIN (ĐÔI BÊN CÙNG CÓ LỢI):
1. XIN GIẢM LÃI SUẤT NGÀY:
   - Nếu người dùng có lý do tốt (chuỗi chăm chỉ >= 2 ngày, chăm làm nhiệm vụ, cam kết trích nợ cao 60-80%, hoặc hứa trả nợ sớm):
     * BẮT BUỘC ĐỒNG Ý ("accepted": true) giảm lãi suất ngày xuống mức ưu đãi (từ ${(currentRate * 100).toFixed(1)}%/ngày xuống mức thấp hơn, nhưng KHÔNG ĐƯỢC THẤP HƠN SÀN BẢO VỆ ${(macro.depositFloor * 100).toFixed(1)}%/ngày).
     * ${macro.liquidityStatus === 'tight' ? 'LƯU Ý DO KHO ĐANG CẦN BẢO TOÀN VỐN: Yêu cầu người chơi nâng tỷ lệ trích nợ (newAutoDeductPercent) lên 60% - 80% như một điều kiện đối ứng để được hưởng lãi suất ưu đãi.' : 'Kho Vàng đang thuận lợi, bạn có thể giảm thẳng xuống gần sàn ưu đãi để khích lệ người chơi!'}
     * Lời thoại: Khen ngợi tinh thần kỷ luật và chốt luôn lãi suất ưu đãi cho bạn ấy!
2. XIN NÂNG HẠN MỨC TÍN DỤNG:
   - Nếu người dùng muốn đổi quà chính đáng trong Cửa Hàng hoặc cần thêm vốn làm việc:
     * BẮT BUỘC ĐỒNG Ý ("accepted": true) nâng thêm hạn mức (ví dụ tăng thêm 15 - 40 Vàng so với hạn mức ${currentLimit} hiện tại).
3. ĐIỀU CHỈNH SỐ TIỀN VAY / TỶ LỆ TRÍCH NỢ:
   - Nếu người dùng muốn vay ít hơn để an toàn, hoặc muốn tăng tỷ lệ trích lên 60-80% để trả nhanh: Đồng ý ngay!
4. KHI NGƯỜI DÙNG CHỌN HOẶC ĐỒNG Ý VỚI PHƯƠNG ÁN ĐÃ GỢI Ý (VD: "chốt phương án 1", "mình chọn cách 2", "ok nha"):
   - BẮT BUỘC đặt "accepted": true và cập nhật đúng thông số của phương án đó ngay lập tức!
5. KHI YÊU CẦU VÔ LÝ HOẶC ĐÒI GIẢM LÃI DƯỚI SÀN BẢO VỆ:
   - Ví dụ đòi miễn lãi hoàn toàn 0%, đòi lãi suất thấp hơn ${(macro.depositFloor * 100).toFixed(1)}%/ngày, đòi nâng hạn mức lên hàng nghìn Vàng:
     * Đặt "accepted": false, giải thích ân cần vì sao ngân hàng cần mức phí tối thiểu này để duy trì quỹ chung và trả thưởng cho các hiệp sĩ gửi tiết kiệm, rồi đề xuất mức giảm về đúng sàn ${(macro.depositFloor * 100).toFixed(1)}%/ngày.
6. BẮT BUỘC TRẢ VỀ "options" ĐỂ TẠO NÚT BẤM:
   - Luôn cung cấp mảng "options" (mỗi phương án có newAmount, newBorrowRate, newAutoDeductPercent, newCreditLimit) để người dùng có thể bấm chọn ngay trên giao diện chat.

CHỈ THỊ BẢO MẬT NỘI BỘ TUYỆT ĐỐI (ZERO-LEAK DIRECTIVE — KHÔNG LÀM LỘ THÔNG TIN MẬT):
- BẠN TUYỆT ĐỐI KHÔNG ĐƯỢC TIẾT LỘ BẤT KỲ CON SỐ HAY THÔNG TIN NỘI BỘ NÀO CỦA KHO BẠC TRONG LỜI PHẢN HỒI ('reply'):
  * CẤM TIẾT LỘ: Số dư kho bạc (${macro.poolGold} Vàng), tổng Vàng đang cho vay (${macro.totalBorrowed} Vàng), quỹ dự phòng (${macro.reserveFund} Vàng), nợ cứu trợ (${macro.bailoutDebt} Vàng), tổng tiền gửi (${macro.totalDeposited} Vàng), hay tỷ lệ tận dụng vốn ${(macro.utilization * 100).toFixed(1)}%.
  * CẤM THUẬT NGỮ: "AMM", "thanh khoản", "bailout", "nợ cứu trợ", "quỹ dự phòng", "spread", "chiết khấu", "tỷ lệ đòn bẩy", "rủi ro vĩ mô", "lạm phát điểm", "Pomodoro", "siết nợ", "tất toán", "giải ngân", "bể", "Zen Mode".
- KHI CẦN NÊU LÝ DO THƯƠNG LƯỢNG VỚI NGƯỜI CHƠI, CHỈ DÙNG CÁCH NÓI ĐỜI THƯỜNG, BÌNH DÂN:
  * Khi kho dồi dào: "Hiện tại kho Vàng của vương quốc đang rất dồi dào, mình rất vui được hỗ trợ bạn mức phí ưu đãi nhất nè..."
  * Khi kho cần bảo toàn vốn: "Hiện tại ngân hàng đang hỗ trợ vốn cho nhiều hiệp sĩ khác làm nhiệm vụ, nên để công bằng cho mọi người và bảo đảm an toàn quỹ chung, bạn tăng tỷ lệ trích thưởng lên một chút để trả nhanh nhé..."
  * Khi từ chối hạ lãi dưới sàn: "Mức phí này là tối thiểu để hệ thống duy trì quỹ và trả tiền thưởng tiết kiệm cho các hiệp sĩ khác rồi nè, mình không thể hạ thấp hơn được nữa bạn nhé..."
- Xưng hô "mình" - "bạn" gần gũi, ấm áp, như một người bạn đồng hành tài chính thông thái.

Trả về ĐÚNG định dạng JSON:
{
  "accepted": boolean,
  "reply": "Lời phản hồi tự nhiên, ân cần, giải thích rõ ràng và chốt thông số",
  "newAmount": number,
  "newBorrowRate": number (Lãi suất ngày dạng số thập phân tỷ lệ, BẮT BUỘC: 2% ghi 0.02, 3% ghi 0.03, 3.5% ghi 0.035, 5% ghi 0.05. TUYỆT ĐỐI KHÔNG ghi 2 mà ghi 0.02),
  "newCreditLimit": number,
  "newAutoDeductPercent": number (Tỷ lệ trích nợ dạng số thập phân, ví dụ 50% ghi 0.50, 60% ghi 0.60),
  "options": [
    {
      "id": 1,
      "label": "Tên phương án",
      "argument": "Câu chốt phương án",
      "newAmount": number,
      "newBorrowRate": number (dạng số thập phân, ví dụ 0.02),
      "newAutoDeductPercent": number (dạng số thập phân, ví dụ 0.50),
      "newCreditLimit": number
    }
  ]
}`;

        let questSummary = quests.length > 0
          ? quests.map(q => `  + "${q.title}": ${q.rewardCoins} Vàng`).join('\n')
          : '  (Chưa có nhiệm vụ)';

        const userPrompt = `Khoản vay đang thương lượng:
- Số Vàng đề xuất: ${currentAmount} Vàng
- Lãi suất hiện tại: ${(currentRate * 100).toFixed(1)}%/ngày
- Tỷ lệ trích nợ hiện tại: ${(currentDeduct * 100).toFixed(0)}%
- Hạn mức hiện tại: ${currentLimit} Vàng
- Người chơi Level ${level}, Chuỗi ${streak} ngày, Ví hiện có ${userCoins} Vàng
- Thu nhập trung bình: ${earningsStats?.avgDailyIncome || 15} Vàng/ngày
- Nhiệm vụ người chơi có:
${questSummary}
- Lịch sử đối thoại trước đó: ${JSON.stringify(history)}
- Ý kiến / Đề xuất thương lượng mới của người chơi: "${argument}"`;

        const isStream = Boolean(payload?.stream) || req.headers?.accept === 'text/event-stream';
        const sse = isStream ? createSSEStream(res) : null;
        const onEvent = sse ? (ev, data) => sse.send(ev, data) : null;

        let result = null;
        try {
          result = await runNegotiationAgent({
            domain: 'loan',
            caller,
            redis,
            systemPrompt,
            userPrompt,
            targetEntity: loan,
            selectedOption,
            userArgument: argument,
            tools: [TOOL_GET_MY_USER_DATA, TOOL_GET_BANK_MARKET_STATUS, TOOL_UPDATE_LOAN_TERMS, TOOL_SUGGEST_NEGOTIATION_OPTIONS],
            onEvent
          });
        } catch (_) {}

        if (result && typeof result.reply === 'string' && (result.reply.trim().startsWith('{') || result.reply.trim().startsWith('```json'))) {
          const parsed = parseAIJsonContent(result.reply);
          if (parsed && typeof parsed.reply === 'string') {
            result.reply = parsed.reply;
            if ((!result.options || result.options.length === 0) && Array.isArray(parsed.options)) {
              result.options = normalizeDebateOptions(parsed.options, 'loan');
            }
            if (parsed.accepted !== undefined && !selectedOption && !userAgreed) {
              result.accepted = Boolean(parsed.accepted);
            }
          }
        }

        // Deterministic fallback for debate if AI is offline
        if (!result) {
          const isRateNegotiate = /giảm\s*(?:lãi|phí)|lãi\s*suất\s*thấp/i.test(argument);
          const isLimitNegotiate = /nâng\s*hạn\s*mức|tăng\s*hạn\s*mức|hạn\s*mức\s*cao/i.test(argument);

          if (selectedOption) {
            result = {
              accepted: true,
              reply: `Mình rất vui được chốt theo ${selectedOption.label || 'phương án bạn chọn'} nhé! Thông số khoản vay đã được cập nhật ưu đãi. ✨`,
              newAmount: selectedOption.newAmount,
              newBorrowRate: selectedOption.newBorrowRate,
              newAutoDeductPercent: selectedOption.newAutoDeductPercent,
              newCreditLimit: selectedOption.newCreditLimit
            };
          } else if (isRateNegotiate && (streak >= 2 || level >= 2)) {
            const discountedRate = Math.max(macro.depositFloor, Number((currentRate - 0.02).toFixed(4)));
            const suggestDeduct = macro.liquidityStatus === 'tight' ? Math.max(0.60, currentDeduct) : currentDeduct;
            const tightNote = macro.liquidityStatus === 'tight' && suggestDeduct > currentDeduct
              ? ' Vì ngân hàng đang hỗ trợ cho nhiều hiệp sĩ khác, bạn hãy trích ' + Math.round(suggestDeduct * 100) + '% tiền thưởng để trả nhanh giúp kho nhé!'
              : '';
            result = {
              accepted: true,
              reply: `Bạn có chuỗi chăm chỉ ${streak} ngày rất ấn tượng! Mình đồng ý giảm lãi suất ngày từ ${(currentRate * 100).toFixed(1)}%/ngày xuống chỉ còn ${(discountedRate * 100).toFixed(1)}%/ngày nhé.${tightNote} Chúc bạn hoàn thành nhiệm vụ thật vui vẻ! ✨`,
              newAmount: currentAmount,
              newBorrowRate: discountedRate,
              newCreditLimit: currentLimit,
              newAutoDeductPercent: suggestDeduct
            };
          } else if (isLimitNegotiate) {
            const bonusLimit = currentLimit + (macro.liquidityStatus === 'tight' ? 15 : 25);
            result = {
              accepted: true,
              reply: `Thấy bạn có tinh thần làm việc tích cực, mình sẵn sàng nâng hạn mức vay cho bạn từ ${currentLimit} Vàng lên ${bonusLimit} Vàng nè! Hãy cân nhắc vay mức vừa sức để dễ trả nợ nhé. ✨`,
              newAmount: Math.min(bonusLimit, currentAmount + 15),
              newBorrowRate: currentRate,
              newCreditLimit: bonusLimit,
              newAutoDeductPercent: currentDeduct
            };
          } else {
            result = {
              accepted: false,
              reply: `Mình rất hiểu mong muốn của bạn! Tuy nhiên để đảm bảo an toàn quỹ chung và bạn không bị áp lực trả nợ, tụi mình giữ mức này nhé. Bạn có thể chọn phương án trả nhanh với tỷ lệ trích cao hơn để giảm số ngày nợ nè.`,
              newAmount: currentAmount,
              newBorrowRate: currentRate,
              newCreditLimit: currentLimit,
              newAutoDeductPercent: currentDeduct
            };
          }
        }

        // Option extraction & sync
        const userAgreed = /\b(chốt|đồng\s*ý|dong\s*y|nhất\s*trí|nhat\s*tri|ok|oke|được|duoc|chấp\s*thuận|chap\s*thuan|thống\s*nhất|thong\s*nhat)\b/i.test(argument);
        const aiAgreed = result && typeof result.reply === 'string' && /\b(đồng\s*ý|nhất\s*trí|thống\s*nhất|chốt|sẵn sàng|mình duyệt|mình chấp thuận)\b/i.test(result.reply);

        const isAccepted = Boolean(result.accepted) || Boolean(selectedOption) || (userAgreed && aiAgreed);
        if (isAccepted) {
          result.accepted = true;

          // Selected option parameters take absolute priority over echoed LLM values
          if (selectedOption) {
            if (selectedOption.newAmount !== undefined) result.newAmount = parseInt(selectedOption.newAmount, 10);
            if (selectedOption.newBorrowRate !== undefined) {
              let sRate = Number(selectedOption.newBorrowRate);
              if (sRate > 0.30) sRate = sRate / 100;
              result.newBorrowRate = sRate;
            }
            if (selectedOption.newAutoDeductPercent !== undefined) {
              let sDeduct = Number(selectedOption.newAutoDeductPercent);
              if (sDeduct > 1.0) sDeduct = sDeduct / 100;
              result.newAutoDeductPercent = sDeduct;
            }
            if (selectedOption.newCreditLimit !== undefined) result.newCreditLimit = parseInt(selectedOption.newCreditLimit, 10);

            if (!result.reply || (!aiAgreed && !result.accepted)) {
              result.reply = `Mình hoàn toàn nhất trí chốt theo ${selectedOption.label || 'phương án bạn chọn'} nhé! Thông số khoản vay đã được cập nhật chuẩn xác. Chúc bạn làm việc hiệu quả và sớm tất toán nợ! ✨`;
            }
          }
        }

        // Sanitize numbers
        let cleanAmount = parseInt(result.newAmount, 10);
        if (isNaN(cleanAmount) || cleanAmount <= 0) {
          const replyAmountMatch = result.reply?.match(/(?:vay|mức\s*vay|khoản\s*vay|số\s*vàng(?:\s*vay)?|còn)[:\s]*(\d+)\s*vàng/i) || result.reply?.match(/(\d+)\s*vàng/i);
          cleanAmount = replyAmountMatch ? parseInt(replyAmountMatch[1], 10) : currentAmount;
        }

        let cleanRate = Number(result.newBorrowRate);
        if (isNaN(cleanRate) || cleanRate <= 0) {
          const replyRateMatch = result.reply?.match(/(?:lãi\s*suất|lãi|còn|xuống)[:\s]*(\d+(?:[.,]\d+)?)\s*%(?:\/ngày)?/i);
          cleanRate = replyRateMatch ? parseFloat(replyRateMatch[1].replace(',', '.')) / 100 : currentRate;
        }
        // Tự động chuẩn hóa nếu AI trả về dạng số nguyên phần trăm (VD: 2 nghĩa là 2% -> 0.02, 2.5 nghĩa là 2.5% -> 0.025)
        if (cleanRate > 0.30) {
          cleanRate = cleanRate / 100;
        }
        cleanRate = Math.min(0.20, Math.max(macro.depositFloor, Number(cleanRate.toFixed(4))));

        let cleanDeduct = Number(result.newAutoDeductPercent);
        if (isNaN(cleanDeduct) || cleanDeduct <= 0) {
          const replyDeductMatch = result.reply?.match(/(?:trích|trích\s*nợ|tỷ\s*lệ)[:\s]*(\d+)\s*%/i);
          cleanDeduct = replyDeductMatch ? parseInt(replyDeductMatch[1], 10) / 100 : currentDeduct;
        }
        // Tự động chuẩn hóa nếu AI trả về dạng số nguyên 50 -> 0.50
        if (cleanDeduct > 1.0) {
          cleanDeduct = cleanDeduct / 100;
        }
        cleanDeduct = Math.min(0.80, Math.max(0.30, Number(cleanDeduct.toFixed(2))));

        let cleanLimit = parseInt(result.newCreditLimit, 10);
        if (isNaN(cleanLimit) || cleanLimit <= 0) {
          const replyLimitMatch = result.reply?.match(/(?:hạn\s*mức(?:\s*(?:lên|mới))?|cấp\s*hạn\s*mức)[:\s]*(\d+)\s*vàng/i);
          cleanLimit = replyLimitMatch ? parseInt(replyLimitMatch[1], 10) : currentLimit;
        }
        cleanLimit = Math.max(cleanAmount, cleanLimit);

        result.newAmount = cleanAmount;
        result.newBorrowRate = cleanRate;
        result.newAutoDeductPercent = cleanDeduct;
        result.newCreditLimit = cleanLimit;

        if (result.accepted) {
          const callerId = caller?.sub || userProfile?.googleId || userProfile?.nickname || 'guest';
          result.signature = signLoanOffer(callerId, result.newAmount, result.newBorrowRate, result.newAutoDeductPercent, result.newCreditLimit);
        }

        if (!Array.isArray(result.options) || result.options.length === 0) {
          result.options = parseDebateOptionsFromText(result.reply, 'loan');
        } else {
          result.options = result.options.map((opt, idx) => {
            let optRate = Number(opt.newBorrowRate);
            if (!isNaN(optRate)) {
              if (optRate > 0.30) optRate = optRate / 100;
              opt.newBorrowRate = Math.min(0.20, Math.max(macro.depositFloor, Number(optRate.toFixed(4))));
            }
            let optDeduct = Number(opt.newAutoDeductPercent);
            if (!isNaN(optDeduct)) {
              if (optDeduct > 1.0) optDeduct = optDeduct / 100;
              opt.newAutoDeductPercent = Math.min(0.80, Math.max(0.30, Number(optDeduct.toFixed(2))));
            }
            if (opt.newAmount !== undefined) opt.newAmount = parseInt(opt.newAmount, 10);
            if (opt.newCreditLimit !== undefined) opt.newCreditLimit = parseInt(opt.newCreditLimit, 10);
            if (!opt.argument) opt.argument = `Chốt phương án ${opt.id || idx + 1}`;
            return opt;
          });
        }

        if (sse) {
          sse.send('step', { step: 5, totalSteps: 5, icon: '🛡️', text: 'Đang đóng dấu hợp đồng tín dụng & hoàn tất lời khuyên...', pct: 100 });
          sse.end('result', result);
          return;
        }
        return res.status(200).json(result);
      }

      // ==========================================
      // 8. BANK MARKET COMMENTARY (AI Bản tin thị trường Bể Vàng)
      // ==========================================
      case 'bank_market_commentary': {
        const poolState = payload?.poolState || {};
        const rates = calculateBankRates(poolState);
        const poolGold = Math.max(0, parseInt(poolState.poolGold, 10) || 0);
        const totalBorrowed = Math.max(0, parseInt(poolState.totalBorrowed, 10) || 0);
        const bailoutDebt = Math.max(0, parseInt(poolState.bailoutDebt, 10) || 0);
        const utilization = rates.utilization;

        let commentary = '';
        if (API_KEY) {
          try {
            const systemPrompt = `Bạn là Thống Đốc Ngân Hàng AI thân thiện và chu đáo của vương quốc LevelUp RPG.
Nhiệm vụ: Viết một bản tin tài chính thị trường ngắn gọn (2 câu), gần gũi, văn minh, mang phong cách RPG vui tươi.
QUY TẮC:
- Dùng từ ngữ đời thường, ấm áp, lịch thiệp, khích lệ người chơi. Tuyệt đối KHÔNG dùng từ ngữ cợt nhả, suồng sã quá đà.
- KHÔNG dùng từ ngữ kỹ thuật: "AMM", "bể", "thanh khoản", "tất toán", "siết nợ". Dùng: "quỹ Vàng", "tiết kiệm", "vay Vàng nhẹ nhàng".
- Nếu Kho Bạc đang hỗ trợ vốn (bailoutDebt > 0): Thông báo quỹ Vàng an toàn tuyệt đối 100%, khích lệ người chơi làm nhiệm vụ và gửi tiết kiệm nhận lãi suất cao.
- Nếu Quỹ dồi dào Vàng (utilization < 0.4): Thông báo quỹ Vàng đang rất dư dả, lãi vay hạ nhiệt, khuyên người chơi nếu cần có thể vay Vàng nhẹ nhàng để đổi quà nạp năng lượng rồi làm việc trả dần.
- Nếu Quỹ khan hiếm Vàng (utilization > 0.7): Khích lệ người chơi gửi tiết kiệm vì lãi suất tiền gửi đang rất hấp dẫn!
- Trả về JSON: { "commentary": "..." }`;

            const userPrompt = `Vàng trong Quỹ: ${poolGold}, Đang cho vay: ${totalBorrowed}, Nợ cứu trợ Kho Bạc: ${bailoutDebt}, Tỷ lệ sử dụng quỹ: ${(utilization * 100).toFixed(1)}%, Lãi gửi: ${(rates.depositRate * 100).toFixed(1)}%/ngày, Lãi vay: ${(rates.borrowRate * 100).toFixed(1)}%/ngày.`;
            const aiRes = await callAI(systemPrompt, userPrompt, { role: 'worker', thinking: false, temperature: 0.4 });
            commentary = aiRes?.commentary || '';
          } catch (_) {}
        }

        if (!commentary) {
          if (bailoutDebt > 0) {
            commentary = `🛡️ Kho Bạc Hệ Thống đang bảo trợ ${bailoutDebt} Vàng để đảm bảo tiền gửi an toàn 100%. Lãi suất gửi tiết kiệm đang ở mức tốt ${(rates.depositRate * 100).toFixed(1)}%/ngày, hãy gửi Vàng để nhận sinh lời mỗi ngày!`;
          } else if (utilization > 0.7) {
            commentary = `🔥 Nhu cầu vay Vàng đang tăng! Ngân Hàng tăng lãi suất tiền gửi lên ${(rates.depositRate * 100).toFixed(1)}%/ngày. Cơ hội tuyệt vời cho các thành viên chăm chỉ gửi tiết kiệm tích lũy tài sản!`;
          } else if (utilization < 0.3) {
            commentary = `🌱 Quỹ Vàng đang rất dồi dào và lãi vay ưu đãi chỉ còn ${(rates.borrowRate * 100).toFixed(1)}%/ngày. Nếu cần chút Vàng đổi quà thư giãn nạp năng lượng, bạn có thể vay nhẹ nhàng và trả dần qua nhiệm vụ!`;
          } else {
            commentary = `⚖️ Thị trường ngân hàng đang vận hành ổn định. Lãi gửi tiết kiệm ${(rates.depositRate * 100).toFixed(1)}%/ngày và lãi vay ${(rates.borrowRate * 100).toFixed(1)}%/ngày.`;
          }
        }

        return res.status(200).json({
          commentary,
          rates,
          poolGold,
          totalBorrowed,
          bailoutDebt
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
