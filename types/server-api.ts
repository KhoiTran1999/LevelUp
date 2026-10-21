/**
 * LevelUp RPG - Typed Server Route Handlers & Legacy Adapter Contract
 */

export interface ServerSentEventBroadcaster {
  send(event: string, data: unknown): void;
  end(event?: string, data?: unknown): void;
}

export interface LegacyApiRequest<TBody = Record<string, unknown>> {
  method: string;
  url: string;
  originalUrl: string;
  path: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  body: TBody;
  ip: string;
  socket: { remoteAddress: string };
}

export interface LegacyApiResponse {
  statusCode: number;
  headersSent: boolean;
  sse?: ServerSentEventBroadcaster;
  status(code: number): this;
  setHeader(name: string, value: string): this;
  getHeader(name: string): string | null | undefined;
  json(data: unknown): this;
  send(data: unknown): this;
  end(): this;
}

export type LegacyApiHandler<TBody = Record<string, unknown>> = (
  req: LegacyApiRequest<TBody>,
  res: LegacyApiResponse
) => Promise<void> | void;

export interface AiRequestBody {
  action?: string;
  payload?: {
    message?: string;
    history?: Array<{ role: string; content: string }>;
    stream?: boolean;
    title?: string;
    description?: string;
    type?: string;
    rank?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface SyncRequestBody {
  action?: string;
  payload?: Record<string, unknown>;
  [key: string]: unknown;
}
