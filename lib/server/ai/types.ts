/**
 * Core Types & Contracts for LevelUp AI Server Architecture
 */

import type { ServerSentEventBroadcaster, LegacyApiRequest, LegacyApiResponse } from '@/types/server-api';

// ponytail: Re-export core schemas and validation functions from schemas/ai.js
export {
  repairJsonString,
  QuestAppraisalOutputSchema,
  RewardAppraisalOutputSchema,
  DebateOutputSchema,
  AssistantOutputSchema,
  ProofVerificationOutputSchema,
  validateQuestAppraisalOutput,
  validateRewardAppraisalOutput,
  validateDebateOutput,
  validateAssistantOutput,
  validateProofVerificationOutput
} from '@/src/schemas/ai.js';

export type AIModelRole = 'worker' | 'brain';

export interface ModelConfig {
  model: string;
  isBrain: boolean;
  reasoning_effort: 'none' | 'low' | 'medium' | 'high';
}

export interface AICallOptions {
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: string };
  role?: AIModelRole;
  thinking?: boolean;
  abortSignal?: AbortSignal;
  imageBase64?: string | null;
  history?: Array<{ role: string; content: string }>;
}

export interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
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

export interface NegotiationAgentParams {
  domain?: string;
  caller?: any;
  targetEntity?: any;
  selectedOption?: any;
  userPrompt?: string;
  userArgument?: string;
  history?: Array<{ role: string; content: string }>;
  tools?: any[];
  onEvent?: (event: string, data: any) => void;
  maxTurns?: number;
}

export interface AssistantContext {
  userSub?: string;
  caller?: any;
  userCoins?: number;
  userLevel?: number;
  quests?: any[];
  rewards?: any[];
  bankAccount?: any;
  ledger?: any[];
  [key: string]: any;
}

export interface AssistantResult {
  reply: string;
  toolCallsExecuted?: string[];
  modifiedEntities?: any;
  isFinal?: boolean;
}

export type { ServerSentEventBroadcaster, ServerSentEventBroadcaster as SSEBroadcaster, LegacyApiRequest, LegacyApiResponse };
