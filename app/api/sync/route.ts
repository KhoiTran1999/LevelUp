import { NextRequest, NextResponse } from 'next/server.js';
// @ts-ignore
import syncHandler from '../../../api/sync.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS
  });
}

export async function GET(request?: NextRequest | Request): Promise<Response> {
  const reqUrl = request?.url || 'http://localhost:3000/api/sync';
  const url = new URL(reqUrl);
  const headersObj: Record<string, string> = {};
  if (request?.headers) {
    request.headers.forEach((val, key) => {
      headersObj[key.toLowerCase()] = val;
    });
  }

  const queryObj: Record<string, string> = {};
  url.searchParams.forEach((val, key) => {
    queryObj[key] = val;
  });

  const clientIp =
    headersObj['x-forwarded-for']?.split(',')[0]?.trim() ||
    headersObj['x-real-ip'] ||
    '127.0.0.1';

  const mockReq: any = {
    method: 'GET',
    url: url.pathname + url.search,
    originalUrl: url.pathname + url.search,
    path: url.pathname,
    headers: headersObj,
    query: queryObj,
    body: {},
    ip: clientIp,
    socket: { remoteAddress: clientIp }
  };

  const responseHeaders = new Headers(CORS_HEADERS);
  responseHeaders.set('Content-Type', 'application/json; charset=utf-8');
  responseHeaders.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');

  let finalStatusCode = 200;
  let finalData: any = null;

  const mockRes: any = {
    statusCode: 200,
    headersSent: false,
    status(code: number) {
      finalStatusCode = code;
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
    json(data: any) {
      finalData = data;
      this.headersSent = true;
      return this;
    },
    send(data: any) {
      finalData = data;
      this.headersSent = true;
      return this;
    },
    end() {
      this.headersSent = true;
      return this;
    }
  };

  try {
    await syncHandler(mockReq, mockRes);
    return new Response(JSON.stringify(finalData ?? {}), {
      status: finalStatusCode,
      headers: responseHeaders
    });
  } catch (err: any) {
    console.error('[Native Sync GET API Error]', err);
    return NextResponse.json(
      { error: err?.message || 'Lỗi máy chủ Sync' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function POST(request?: NextRequest | Request): Promise<Response> {
  const reqUrl = request?.url || 'http://localhost:3000/api/sync';
  const url = new URL(reqUrl);
  const headersObj: Record<string, string> = {};
  if (request?.headers) {
    request.headers.forEach((val, key) => {
      headersObj[key.toLowerCase()] = val;
    });
  }

  const queryObj: Record<string, string> = {};
  url.searchParams.forEach((val, key) => {
    queryObj[key] = val;
  });

  let body: any = {};
  try {
    const text = request?.text ? await request.text() : '';
    if (text) {
      body = JSON.parse(text);
    }
  } catch {
    body = {};
  }

  const clientIp =
    headersObj['x-forwarded-for']?.split(',')[0]?.trim() ||
    headersObj['x-real-ip'] ||
    '127.0.0.1';

  const mockReq: any = {
    method: 'POST',
    url: url.pathname + url.search,
    originalUrl: url.pathname + url.search,
    path: url.pathname,
    headers: headersObj,
    query: queryObj,
    body,
    ip: clientIp,
    socket: { remoteAddress: clientIp }
  };

  const responseHeaders = new Headers(CORS_HEADERS);
  responseHeaders.set('Content-Type', 'application/json; charset=utf-8');
  responseHeaders.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');

  let finalStatusCode = 200;
  let finalData: any = null;

  const mockRes: any = {
    statusCode: 200,
    headersSent: false,
    status(code: number) {
      finalStatusCode = code;
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
    json(data: any) {
      finalData = data;
      this.headersSent = true;
      return this;
    },
    send(data: any) {
      finalData = data;
      this.headersSent = true;
      return this;
    },
    end() {
      this.headersSent = true;
      return this;
    }
  };

  try {
    await syncHandler(mockReq, mockRes);
    return new Response(JSON.stringify(finalData ?? {}), {
      status: finalStatusCode,
      headers: responseHeaders
    });
  } catch (err: any) {
    console.error('[Native Sync POST API Error]', err);
    return NextResponse.json(
      { error: err?.message || 'Lỗi máy chủ Sync' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
