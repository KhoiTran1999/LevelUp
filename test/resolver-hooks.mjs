import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';

export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'next/server') {
    return nextResolve('next/server.js', context);
  }
  if (specifier === 'next/headers') {
    return nextResolve('next/headers.js', context);
  }
  if (specifier.startsWith('@/')) {
    const rel = specifier.slice(2);
    const basePath = path.resolve(process.cwd(), rel);
    for (const ext of ['', '.ts', '.tsx', '.js', '/index.ts', '/index.js']) {
      const fullPath = basePath + ext;
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        return nextResolve(pathToFileURL(fullPath).href, context);
      }
    }
  }
  if (specifier.startsWith('./') || specifier.startsWith('../')) {
    if (context.parentURL && context.parentURL.startsWith('file:')) {
      const parentDir = path.dirname(fileURLToPath(context.parentURL));
      const basePath = path.resolve(parentDir, specifier);
      for (const ext of ['', '.ts', '.tsx', '.js', '/index.ts', '/index.js']) {
        const fullPath = basePath + ext;
        if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
          return nextResolve(pathToFileURL(fullPath).href, context);
        }
      }
    }
  }
  return nextResolve(specifier, context);
}
