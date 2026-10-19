import fs from 'node:fs';
import path from 'node:path';

export const dynamic = 'force-dynamic';

export default function LevelUpPage() {
  const htmlFilePath = path.join(process.cwd(), 'public', 'index.html');
  let bodyContent = '';

  try {
    const rawHtml = fs.readFileSync(htmlFilePath, 'utf8');
    const bodyMatch = rawHtml.match(/<body[^>]*>([\s\S]*?)<!-- RPG Confetti VFX/i);
    if (bodyMatch && bodyMatch[1]) {
      bodyContent = bodyMatch[1];
    }
  } catch (err) {
    console.error('Error reading LevelUp public/index.html template:', err);
  }

  return (
    <div
      id="levelup-app"
      className="contents"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: bodyContent }}
    />
  );
}
