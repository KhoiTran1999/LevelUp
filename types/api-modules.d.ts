declare module '@/lib/server/sync-handler' {
  import type { LegacyApiHandler, SyncRequestBody } from '@/types/server-api';
  const syncHandler: LegacyApiHandler<SyncRequestBody>;
  export default syncHandler;
  export function setRedisClientForTesting(client: unknown): void;
  export function setGoogleTokenVerifierForTesting(verifier: unknown): void;
}

declare module '*/api/ai.js' {
  import type { LegacyApiHandler, AiRequestBody } from '@/types/server-api';
  const aiHandler: LegacyApiHandler<AiRequestBody>;
  export default aiHandler;
  export function handleGetMyUserData(req: unknown, res: unknown): Promise<unknown>;
  export function handleGetBankMarketStatus(req: unknown, res: unknown): Promise<unknown>;
  export function verifyGoogleToken(token: string): Promise<unknown>;
  export function getRedisClient(): unknown;
  export function setApiKeyForTesting(key: string): void;
}

declare module '*/api/sync.js' {
  import type { LegacyApiHandler, SyncRequestBody } from '@/types/server-api';
  const syncHandler: LegacyApiHandler<SyncRequestBody>;
  export default syncHandler;
  export function setRedisClientForTesting(client: unknown): void;
  export function setGoogleTokenVerifierForTesting(verifier: unknown): void;
}
