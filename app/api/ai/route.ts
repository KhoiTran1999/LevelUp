import { adaptNodeHandler } from '@/lib/next-adapter';
// @ts-ignore
import aiHandler from '@/api/ai.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return adaptNodeHandler(request, aiHandler);
}

export async function POST(request: Request) {
  return adaptNodeHandler(request, aiHandler);
}

export async function OPTIONS(request: Request) {
  return adaptNodeHandler(request, aiHandler);
}
