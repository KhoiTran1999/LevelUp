import { NextRequest, NextResponse } from 'next/server';

/**
 * Adapter allowing Express / Node.js style (req, res) handlers to run smoothly
 * inside Next.js 16 App Router Route Handlers (supporting both JSON and SSE Streaming).
 */
export async function adaptNodeHandler(
  request: Request | NextRequest,
  handler: (req: any, res: any) => Promise<any> | any
): Promise<Response> {
  const url = new URL(request.url);
  const headersObj: Record<string, string> = {};
  request.headers.forEach((val, key) => {
    headersObj[key.toLowerCase()] = val;
  });

  // Parse Query parameters
  const queryObj: Record<string, string> = {};
  url.searchParams.forEach((val, key) => {
    queryObj[key] = val;
  });

  // Parse Body
  let body: any = null;
  const contentType = headersObj['content-type'] || '';
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method.toUpperCase())) {
    try {
      if (contentType.includes('application/json')) {
        body = await request.json();
      } else {
        const text = await request.text();
        if (text) {
          try {
            body = JSON.parse(text);
          } catch {
            body = text;
          }
        }
      }
    } catch {
      body = {};
    }
  }

  const clientIp =
    headersObj['x-forwarded-for']?.split(',')[0]?.trim() ||
    headersObj['x-real-ip'] ||
    '127.0.0.1';

  // Construct mock Node Request
  const mockReq: any = {
    method: request.method,
    url: url.pathname + url.search,
    originalUrl: url.pathname + url.search,
    path: url.pathname,
    headers: headersObj,
    query: queryObj,
    body: body || {},
    ip: clientIp,
    socket: {
      remoteAddress: clientIp
    }
  };

  return new Promise<Response>(async (resolve, reject) => {
    let statusCode = 200;
    const responseHeaders = new Headers();
    let isStream = false;
    let streamController: ReadableStreamDefaultController | null = null;
    let streamClosed = false;

    // Helper to initialize stream if streaming is triggered (SSE or chunked transfer)
    const initStream = () => {
      if (isStream) return;
      isStream = true;
      const stream = new ReadableStream({
        start(controller) {
          streamController = controller;
        },
        cancel() {
          streamClosed = true;
        }
      });

      // Default stream headers if not set
      if (!responseHeaders.has('content-type')) {
        responseHeaders.set('content-type', 'text/event-stream; charset=utf-8');
      }
      responseHeaders.set('cache-control', 'no-cache, no-transform');
      responseHeaders.set('connection', 'keep-alive');

      resolve(
        new Response(stream, {
          status: statusCode,
          headers: responseHeaders
        })
      );
    };

    // Construct mock Node Response
    const mockRes: any = {
      statusCode: 200,
      headersSent: false,
      status(code: number) {
        statusCode = code;
        this.statusCode = code;
        return this;
      },
      setHeader(name: string, value: string | string[]) {
        if (Array.isArray(value)) {
          responseHeaders.delete(name);
          value.forEach(v => responseHeaders.append(name, v));
        } else {
          responseHeaders.set(name, String(value));
        }
        return this;
      },
      getHeader(name: string) {
        return responseHeaders.get(name);
      },
      removeHeader(name: string) {
        responseHeaders.delete(name);
        return this;
      },
      hasHeader(name: string) {
        return responseHeaders.has(name);
      },
      write(chunk: any) {
        this.headersSent = true;
        initStream();
        if (!streamClosed && streamController) {
          const encoder = new TextEncoder();
          const data = typeof chunk === 'string' ? chunk : String(chunk);
          streamController.enqueue(encoder.encode(data));
        }
        return true;
      },
      flush() {
        // No-op for web streams
      },
      end(chunk?: any) {
        this.headersSent = true;
        if (isStream) {
          if (chunk && !streamClosed && streamController) {
            const encoder = new TextEncoder();
            const data = typeof chunk === 'string' ? chunk : String(chunk);
            streamController.enqueue(encoder.encode(data));
          }
          if (!streamClosed && streamController) {
            streamController.close();
            streamClosed = true;
          }
          return this;
        }

        // Non-streaming response
        let finalBody: BodyInit = '';
        if (chunk !== undefined && chunk !== null) {
          finalBody = typeof chunk === 'string' ? chunk : JSON.stringify(chunk);
        }
        resolve(
          new Response(finalBody, {
            status: statusCode,
            headers: responseHeaders
          })
        );
        return this;
      },
      json(data: any) {
        this.headersSent = true;
        if (!responseHeaders.has('content-type')) {
          responseHeaders.set('content-type', 'application/json; charset=utf-8');
        }
        resolve(
          new Response(JSON.stringify(data), {
            status: statusCode,
            headers: responseHeaders
          })
        );
        return this;
      },
      send(data: any) {
        this.headersSent = true;
        let bodyPayload: BodyInit = '';
        if (typeof data === 'object' && data !== null && !Buffer.isBuffer(data)) {
          if (!responseHeaders.has('content-type')) {
            responseHeaders.set('content-type', 'application/json; charset=utf-8');
          }
          bodyPayload = JSON.stringify(data);
        } else {
          bodyPayload = data ?? '';
        }
        resolve(
          new Response(bodyPayload, {
            status: statusCode,
            headers: responseHeaders
          })
        );
        return this;
      }
    };

    try {
      await handler(mockReq, mockRes);
    } catch (err: any) {
      if (!mockRes.headersSent) {
        console.error('[Next.js Adapter Error]', err);
        resolve(
          NextResponse.json(
            { error: err?.message || 'Internal Server Error' },
            { status: 500 }
          )
        );
      } else if (isStream && streamController && !streamClosed) {
        streamController.error(err);
        streamClosed = true;
      }
    }
  });
}
