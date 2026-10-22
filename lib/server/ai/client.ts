/**
 * Core AI Client & Gateway Communication Engine
 * Supports OpenAI-compatible endpoints with thinking overrides, timeout guards, and SSE streaming.
 */

import dotenv from 'dotenv';
import { repairJsonString } from '@/src/schemas/ai.js';
import type { ModelConfig, AIModelRole, AICallOptions, OpenAITool, ServerSentEventBroadcaster } from './types';

dotenv.config();

const BASE_URL = (process.env.CUSTOM_AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');

// ponytail: Mock key in test env enables offline/CI test execution without real LLM credentials
let API_KEY = process.env.CUSTOM_AI_API_KEY || (process.env.NODE_ENV === 'test' ? 'test_mock_key' : '');

export function setApiKeyForTesting(key: string): void {
  API_KEY = key;
}

export const MODEL_WORKER = process.env.MODEL_WORKER || process.env.CUSTOM_AI_MODEL || 'gpt-4o-mini';
export const MODEL_BRAIN = process.env.MODEL_BRAIN || process.env.CUSTOM_AI_MODEL || 'gpt-4o-mini';
export const MODEL = MODEL_WORKER; // ponytail: backward compatibility alias

/**
 * ponytail: Thinking disabled across all models for zero reasoning latency and instant responses
 */
export function getModelAndReasoning(role: AIModelRole | string = 'worker', thinkingOverride: boolean | null = null): ModelConfig {
  const isBrain = role === 'brain' || (thinkingOverride !== null && Boolean(thinkingOverride));
  const model = isBrain ? MODEL_BRAIN : MODEL_WORKER;
  return { model, reasoning_effort: 'none', isBrain };
}

/**
 * Calls OpenAI-compatible completion endpoint with JSON output and recursive Unicode NFC normalization.
 */
export async function callAI(
  systemPrompt: string,
  userPrompt: string,
  temperature: number | AICallOptions = 0.3,
  imageBase64: string | null = null,
  opts: AICallOptions = {}
): Promise<any> {
  if (!API_KEY) {
    throw new Error('CUSTOM_AI_API_KEY is not configured');
  }

  let temp = typeof temperature === 'number' ? temperature : 0.3;
  let img = imageBase64;
  let options = opts;

  if (typeof temperature === 'object' && temperature !== null) {
    options = temperature;
    temp = options.temperature ?? 0.3;
    img = (options as any).imageBase64 ?? null;
  }

  const role = options.role || (options.thinking ? 'brain' : 'worker');
  const thinking = options.thinking ?? null;
  const { model, reasoning_effort } = getModelAndReasoning(role, thinking);

  const userContent = img
    ? [
        { type: 'text', text: userPrompt },
        { type: 'image_url', image_url: { url: img.startsWith('data:') ? img : `data:image/jpeg;base64,${img}` } }
      ]
    : userPrompt;

  const payload: Record<string, any> = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent }
    ],
    temperature: temp,
    stream: false,
    response_format: options.response_format || { type: 'json_object' }
  };

  // ponytail: Thinking disabled globally for all AI models to maximize speed
  payload.reasoning_effort = 'none';
  payload.thinking = { type: 'disabled' };

  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    signal: options.abortSignal || AbortSignal.timeout(40000),
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

  // Extract and repair JSON if model wraps it in markdown or has trailing commas
  const cleaned = repairJsonString(rawContent);

  // Normalize strings recursively to Unicode NFC (precomposed)
  function normalizeNFC(val: any): any {
    if (typeof val === 'string') return val.normalize('NFC');
    if (Array.isArray(val)) return val.map(normalizeNFC);
    if (val !== null && typeof val === 'object') {
      const res: Record<string, any> = {};
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
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return normalizeNFC(JSON.parse(repairJsonString(match[0])));
      } catch (_) {}
    }
    throw new Error(`Invalid JSON from AI: ${rawContent}`);
  }
}

/**
 * ponytail: Safe JSON extractor for LLM messages.
 * Prevents raw JSON dumps from leaking into user chat bubbles.
 */
export function parseAIJsonContent(rawContent?: string | null): any {
  if (!rawContent || typeof rawContent !== 'string') return null;
  const cleaned = repairJsonString(rawContent);
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === 'object') return parsed;
  } catch (_) {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        const parsed = JSON.parse(repairJsonString(match[0]));
        if (parsed && typeof parsed === 'object') return parsed;
      } catch (_) {}
    }
  }
  return null;
}

/**
 * ponytail: Normalize structured options from AI JSON responses into UI-ready button payloads.
 */
export function normalizeDebateOptions(rawOptions: any[], _domain: string = 'quest'): any[] {
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

/**
 * OpenAI Tool Calling dispatcher
 */
export async function callAIWithTools(
  messages: any[],
  tools: OpenAITool[] | any[] = [],
  options: AICallOptions | number = {}
): Promise<any> {
  if (!API_KEY) {
    throw new Error('CUSTOM_AI_API_KEY is not configured');
  }

  let temp = 0.3;
  let role: AIModelRole | string = 'worker';
  let thinking: boolean | null = null;

  if (typeof options === 'number') {
    temp = options;
  } else if (typeof options === 'object' && options !== null) {
    temp = options.temperature ?? 0.3;
    role = options.role || (options.thinking ? 'brain' : 'worker');
    thinking = options.thinking ?? null;
  }

  const { model, reasoning_effort } = getModelAndReasoning(role, thinking);

  const payload: Record<string, any> = {
    model,
    messages,
    temperature: temp,
    stream: false
  };

  // ponytail: Thinking disabled globally for all AI models to maximize speed
  payload.reasoning_effort = 'none';
  payload.thinking = { type: 'disabled' };

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

/**
 * Server-Sent Events (SSE) Stream Manager
 */
export function createSSEStream(res: any): ServerSentEventBroadcaster {
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
    send(event: string, data: unknown) {
      if (res?.writableEnded || res?.socket?.destroyed) return;
      if (typeof res?.write === 'function') {
        try {
          res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
          if (typeof res?.flush === 'function') {
            res.flush();
          }
        } catch (_) {}
      }
    },
    end(event?: string, data?: unknown) {
      if (res?.writableEnded || res?.socket?.destroyed) return;
      if (event && data && typeof res?.write === 'function') {
        try {
          res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
          if (typeof res?.flush === 'function') {
            res.flush();
          }
        } catch (_) {}
      }
      if (typeof res?.end === 'function') {
        try {
          res.end();
        } catch (_) {}
      }
    }
  };
}
