import { NextRequest, NextResponse } from 'next/server.js';
// @ts-ignore
import aiHandler from '../../../api/ai.js';

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

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.' },
    { status: 405, headers: CORS_HEADERS }
  );
}

export async function POST(request: NextRequest | Request): Promise<Response> {
  const url = new URL(request.url);
  const headersObj: Record<string, string> = {};
  request.headers.forEach((val, key) => {
    headersObj[key.toLowerCase()] = val;
  });

  const queryObj: Record<string, string> = {};
  url.searchParams.forEach((val, key) => {
    queryObj[key] = val;
  });

  let body: any = {};
  try {
    const text = await request.text();
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

  const isStream =
    Boolean(body?.payload?.stream) ||
    headersObj['accept'] === 'text/event-stream';

  if (isStream) {
    let controller: ReadableStreamDefaultController<Uint8Array>;
    const encoder = new TextEncoder();
    let isClosed = false;

    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        controller = c;
      },
      cancel() {
        isClosed = true;
      }
    });

    const sse = {
      send(event: string, data: any) {
        if (isClosed) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          isClosed = true;
        }
      },
      end(event?: string, data?: any) {
        if (isClosed) return;
        try {
          if (event && data !== undefined) {
            this.send(event, data);
          }
          controller.close();
        } catch (_) {}
        isClosed = true;
      }
    };

    const mockRes: any = {
      statusCode: 200,
      headersSent: false,
      sse,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      setHeader() {
        return this;
      },
      json(data: any) {
        this.headersSent = true;
        sse.end('result', data);
        return this;
      },
      send(data: any) {
        this.headersSent = true;
        sse.end('result', data);
        return this;
      },
      end() {
        this.headersSent = true;
        sse.end();
        return this;
      }
    };

    // Execute AI pipeline in background feeding directly to Web Stream
    (async () => {
      try {
        await aiHandler(mockReq, mockRes);
      } catch (err: any) {
        console.error('[Native AI Stream Error]', err);
        sse.end('error', { error: err?.message || 'Lỗi xử lý trợ lý AI' });
      }
    })();

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
        ...CORS_HEADERS
      }
    });
  }

  // Non-streaming response
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
    setHeader() {
      return this;
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
    await aiHandler(mockReq, mockRes);
    return NextResponse.json(finalData ?? {}, {
      status: finalStatusCode,
      headers: CORS_HEADERS
    });
  } catch (err: any) {
    console.error('[Native AI API Error]', err);
    return NextResponse.json(
      { error: err?.message || 'Internal Server Error' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
