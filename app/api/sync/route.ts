import { NextRequest, NextResponse } from 'next/server';
import syncHandler from '../../../api/sync.js';
import type {
  LegacyApiRequest,
  LegacyApiResponse,
  SyncRequestBody,
} from '@/types/server-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS(_request?: NextRequest): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

function createMockResponse(
  responseHeaders: Headers,
  onDone: (data: unknown, statusCode: number) => void
): LegacyApiResponse {
  let statusCode = 200;
  let finalData: unknown = null;

  return {
    statusCode: 200,
    headersSent: false,
    status(code: number) {
      statusCode = code;
      this.statusCode = code;
      return this;
    },
    setHeader(name: string, value: string) {
      if (name.toLowerCase() === 'set-cookie') {
        responseHeaders.append(name, value);
      } else {
        responseHeaders.set(name, value);
      }
      return this;
    },
    getHeader(name: string) {
      return responseHeaders.get(name);
    },
    json(data: unknown) {
      finalData = data;
      this.headersSent = true;
      onDone(finalData, statusCode);
      return this;
    },
    send(data: unknown) {
      finalData = data;
      this.headersSent = true;
      onDone(finalData, statusCode);
      return this;
    },
    end() {
      this.headersSent = true;
      onDone(finalData, statusCode);
      return this;
    },
  };
}

export async function GET(request: NextRequest): Promise<Response> {
  const reqUrl = request.url;
  const url = new URL(reqUrl);
  const headersObj: Record<string, string> = {};
  request.headers.forEach((val, key) => {
    headersObj[key.toLowerCase()] = val;
  });

  const queryObj: Record<string, string> = {};
  url.searchParams.forEach((val, key) => {
    queryObj[key] = val;
  });

  const clientIp =
    headersObj['x-forwarded-for']?.split(',')[0]?.trim() ||
    headersObj['x-real-ip'] ||
    '127.0.0.1';

  const mockReq: LegacyApiRequest<Record<string, unknown>> = {
    method: 'GET',
    url: url.pathname + url.search,
    originalUrl: url.pathname + url.search,
    path: url.pathname,
    headers: headersObj,
    query: queryObj,
    body: {},
    ip: clientIp,
    socket: { remoteAddress: clientIp },
  };

  const responseHeaders = new Headers(CORS_HEADERS);
  responseHeaders.set('Content-Type', 'application/json; charset=utf-8');
  responseHeaders.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');

  let finalStatusCode = 200;
  let finalData: unknown = null;

  const mockRes = createMockResponse(responseHeaders, (data, code) => {
    finalData = data;
    finalStatusCode = code;
  });

  try {
    await syncHandler(mockReq, mockRes);
    return new Response(JSON.stringify(finalData ?? {}), {
      status: finalStatusCode,
      headers: responseHeaders,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Lỗi máy chủ Sync';
    console.error('[Native Sync GET API Error]', err);
    return NextResponse.json(
      { error: errorMsg },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  const reqUrl = request.url;
  const url = new URL(reqUrl);
  const headersObj: Record<string, string> = {};
  request.headers.forEach((val, key) => {
    headersObj[key.toLowerCase()] = val;
  });

  const queryObj: Record<string, string> = {};
  url.searchParams.forEach((val, key) => {
    queryObj[key] = val;
  });

  let body: SyncRequestBody = {};
  try {
    body = (await request.json()) as SyncRequestBody;
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON request body.' },
      {
        status: 400,
        headers: {
          ...CORS_HEADERS,
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        },
      }
    );
  }

  const clientIp =
    headersObj['x-forwarded-for']?.split(',')[0]?.trim() ||
    headersObj['x-real-ip'] ||
    '127.0.0.1';

  const mockReq: LegacyApiRequest<SyncRequestBody> = {
    method: 'POST',
    url: url.pathname + url.search,
    originalUrl: url.pathname + url.search,
    path: url.pathname,
    headers: headersObj,
    query: queryObj,
    body,
    ip: clientIp,
    socket: { remoteAddress: clientIp },
  };

  const responseHeaders = new Headers(CORS_HEADERS);
  responseHeaders.set('Content-Type', 'application/json; charset=utf-8');
  responseHeaders.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');

  let finalStatusCode = 200;
  let finalData: unknown = null;

  const mockRes = createMockResponse(responseHeaders, (data, code) => {
    finalData = data;
    finalStatusCode = code;
  });

  try {
    await syncHandler(mockReq, mockRes);
    return new Response(JSON.stringify(finalData ?? {}), {
      status: finalStatusCode,
      headers: responseHeaders,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Lỗi máy chủ Sync';
    console.error('[Native Sync POST API Error]', err);
    return NextResponse.json(
      { error: errorMsg },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
