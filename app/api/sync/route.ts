import { adaptNodeHandler } from '@/lib/next-adapter';
// @ts-ignore
import syncHandler from '@/api/sync.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return adaptNodeHandler(request, syncHandler);
}

export async function POST(request: Request) {
  return adaptNodeHandler(request, syncHandler);
}

export async function OPTIONS(request: Request) {
  return adaptNodeHandler(request, syncHandler);
}
