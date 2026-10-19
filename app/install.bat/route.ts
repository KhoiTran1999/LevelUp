import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const filePath = path.join(process.cwd(), 'public', 'install.bat');
  if (!fs.existsSync(filePath)) {
    return new NextResponse('File not found', { status: 404 });
  }

  const content = fs.readFileSync(filePath);
  return new NextResponse(content, {
    status: 200,
    headers: {
      'Content-Type': 'application/x-bat',
      'Content-Disposition': 'attachment; filename="install.bat"',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
}
