/**
 * LevelUp RPG Guild — AI Gateway Output Schemas & Resilient JSON Recovery
 * Powered by Valibot (Ultra-lightweight ~1KB)
 */
import * as v from 'valibot';

/**
 * 1. Resilient JSON String Repair Utility
 * Sửa chữa các lỗi cú pháp định dạng phổ biến của LLMs trước khi JSON.parse
 */
export function repairJsonString(raw) {
  if (!raw || typeof raw !== 'string') return '';

  let cleaned = raw.trim();

  // Gỡ bỏ markdown code block (kể cả khi bị cụt mất dấu đóng ```)
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```\s*$/i, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/i, '').replace(/```\s*$/i, '');
  }

  // Nếu vẫn còn markdown codeblock dở dang ở cuối
  cleaned = cleaned.replace(/```\s*$/i, '').trim();

  // Trích xuất đối tượng JSON { ... } hoặc mảng [ ... ] nếu bị kẹp giữa văn bản dẫn giải
  if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
    const objMatch = cleaned.match(/\{[\s\S]*\}/);
    const arrMatch = cleaned.match(/\[[\s\S]*\]/);
    if (objMatch && arrMatch) {
      cleaned = objMatch.index <= arrMatch.index ? objMatch[0] : arrMatch[0];
    } else if (objMatch) {
      cleaned = objMatch[0];
    } else if (arrMatch) {
      cleaned = arrMatch[0];
    }
  }

  // Xóa bỏ trailing commas (dấu phẩy thừa trước ngoặc đóng `}` hoặc `]`)
  // Ví dụ: {"a": 1, "b": 2, } -> {"a": 1, "b": 2 }
  cleaned = cleaned.replace(/,\s*([\}\]])/g, '$1');

  // Chuẩn hóa Unicode NFC
  return cleaned.normalize('NFC');
}

/**
 * 2. Quest Appraisal Output Schema (Thẩm định nhiệm vụ)
 */
export const QuestAppraisalOutputSchema = v.looseObject({
  title: v.optional(v.string()),
  description: v.optional(v.string()),
  type: v.optional(v.picklist(['focus', 'bounty']), 'focus'),
  targetMinutes: v.optional(v.pipe(v.number(), v.minValue(0)), 0),
  rewardCoins: v.optional(v.pipe(v.number(), v.minValue(1)), 1),
  rank: v.optional(v.string(), 'D'),
  category: v.optional(v.string(), 'other'),
  reasoning: v.optional(v.string(), ''),
  requiresProof: v.optional(v.boolean(), false),
  proofGuidance: v.optional(v.string(), '')
});

/**
 * 3. Reward Appraisal Output Schema (Thẩm định phần thưởng)
 */
export const RewardAppraisalOutputSchema = v.looseObject({
  name: v.optional(v.string()),
  description: v.optional(v.string()),
  price: v.optional(v.pipe(v.number(), v.minValue(1)), 1),
  tier: v.optional(v.picklist(['common', 'rare', 'epic', 'legendary']), 'common'),
  reasoning: v.optional(v.string(), '')
});

/**
 * 4. Debate Output Schema (Tranh biện đàm phán)
 */
export const DebateOutputSchema = v.looseObject({
  accepted: v.optional(v.boolean(), false),
  reply: v.optional(v.string(), ''),
  options: v.optional(v.array(v.any()), []),
  newRewardCoins: v.optional(v.number()),
  newTargetMinutes: v.optional(v.number()),
  newTitle: v.optional(v.string()),
  newDescription: v.optional(v.string()),
  newType: v.optional(v.picklist(['focus', 'bounty'])),
  newRank: v.optional(v.string()),
  newRequiresProof: v.optional(v.boolean())
});

/**
 * 5. Assistant Output Schema (Trợ lý Phù Thủy AI)
 */
export const AssistantOutputSchema = v.looseObject({
  thought: v.optional(v.string(), ''),
  reply: v.optional(v.string(), ''),
  options: v.optional(v.array(v.any()), []),
  suggestedActions: v.optional(v.array(v.any()), [])
});

/**
 * Helper Validation Functions
 */
export function validateQuestAppraisalOutput(raw) {
  const result = v.safeParse(QuestAppraisalOutputSchema, raw);
  return { success: result.success, data: result.success ? result.output : null };
}

export function validateRewardAppraisalOutput(raw) {
  const result = v.safeParse(RewardAppraisalOutputSchema, raw);
  return { success: result.success, data: result.success ? result.output : null };
}

export function validateDebateOutput(raw) {
  const result = v.safeParse(DebateOutputSchema, raw);
  return { success: result.success, data: result.success ? result.output : null };
}

export function validateAssistantOutput(raw) {
  const result = v.safeParse(AssistantOutputSchema, raw);
  return { success: result.success, data: result.success ? result.output : null };
}
