/**
 * Markdown Utilities for LevelUp Notes Workspace
 * Provides high-performance Markdown parsing, sanitization, and live preview rendering.
 */

export function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .toString()
    .normalize('NFC')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function isMarkdownText(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  const mdPatterns = [
    /\*\*[^*]+?\*\*/, // **bold**
    /__[^_]+?__/, // __bold__
    /~~[^~]+?~~/, // ~~strikethrough~~
    /(?:^|\n)\s*#{1,6}\s+\S/, // # Heading
    /(?:^|\n)\s*[-*+]\s+\[[ xX]\]\s+/, // - [ ] Checklist
    /(?:^|\n)\s*[-*+]\s+\S/, // * List item or - List item
    /(?:^|\n)\s*\d+\.\s+\S/, // 1. Numbered item
    /(?:^|\n)\s*>\s+\S/, // > Blockquote
    /```[\s\S]*?```/, // ```code block```
    /`[^`\n]+`/, // `inline code`
    /\[.+?\]\((?:https?:\/\/|\/|\.?\/)[^\s)]+\)/, // [link](url)
    /(?:^|\n)\s*(?:---|\*\*\*|___)\s*(?:\n|$)/, // Horizontal rule
  ];
  return mdPatterns.some(pattern => pattern.test(text));
}

export function parseInlineMarkdown(text: string): string {
  if (!text) return '';
  let res = escapeHtml(text);

  // 1. Code inline: `code`
  const inlineCodes: string[] = [];
  res = res.replace(/`([^`\n]+)`/g, (_m, code) => {
    const idx = inlineCodes.length;
    inlineCodes.push(`<code>${code}</code>`);
    return `@@INLINECODE${idx}@@`;
  });

  // 2. Markdown Links: [text](url)
  const links: string[] = [];
  res = res.replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/|\.?\/)[^\s)]+)\)/g, (_m, linkText, url) => {
    const idx = links.length;
    links.push(`<a href="${url}" target="_blank" rel="noopener noreferrer">${linkText}</a>`);
    return `@@MDLINK${idx}@@`;
  });

  // 3. Bold + Italic: ***text*** or ___text___
  res = res.replace(/\*\*\*([^*]+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  res = res.replace(/___([^_]+?)___/g, '<strong><em>$1</em></strong>');

  // 4. Bold: **text** or __text__
  res = res.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
  res = res.replace(/__([^_]+?)__/g, '<strong>$1</strong>');

  // 5. Italic: *text* or _text_
  res = res.replace(/(^|[^*])\*([^*]+?)\*(?!\*)/g, '$1<em>$2</em>');
  res = res.replace(/(^|[^_])_([^_]+?)_(?!_)/g, '$1<em>$2</em>');

  // 6. Strikethrough: ~~text~~
  res = res.replace(/~~([^~]+?)~~/g, '<del>$1</del>');

  // 7. Auto-link bare URLs
  res = res.replace(
    /(^|[\s(])(https?:\/\/[^\s<)]+)(?=[)\s]|$)/g,
    '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>'
  );

  // 8. Restore Links & Inline Code
  res = res.replace(/@@MDLINK(\d+)@@/g, (_m, idx) => links[Number(idx)] || '');
  res = res.replace(/@@INLINECODE(\d+)@@/g, (_m, idx) => inlineCodes[Number(idx)] || '');

  return res;
}

export function convertMarkdownToEditorHtml(md: string): string {
  if (!md || typeof md !== 'string') return '<p></p>';

  const normalized = md.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const codeBlocks: string[] = [];
  const text = normalized.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (_m, lang, code) => {
    const idx = codeBlocks.length;
    codeBlocks.push(
      `<pre class="note-code-block" data-lang="${escapeHtml(lang)}"><code>${escapeHtml(code.trim())}</code></pre>`
    );
    return `@@CODEBLOCK${idx}@@`;
  });

  const lines = text.split('\n');
  const out: string[] = [];

  let inUl = false;
  let inOl = false;
  let inQuote = false;
  let quoteLines: string[] = [];

  function closeLists() {
    if (inUl) {
      out.push('</ul>');
      inUl = false;
    }
    if (inOl) {
      out.push('</ol>');
      inOl = false;
    }
  }

  function flushQuote() {
    if (inQuote) {
      out.push(`<blockquote>${quoteLines.join('<br>')}</blockquote>`);
      inQuote = false;
      quoteLines = [];
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      closeLists();
      flushQuote();
      continue;
    }

    const cbMatch = trimmed.match(/^@@CODEBLOCK(\d+)@@$/);
    if (cbMatch) {
      closeLists();
      flushQuote();
      out.push(codeBlocks[Number(cbMatch[1])]);
      continue;
    }

    if (/^(?:[-*_]\s*){3,}$/.test(trimmed)) {
      closeLists();
      flushQuote();
      out.push('<hr>');
      continue;
    }

    const quoteMatch = line.match(/^\s*>\s?(.*)$/);
    if (quoteMatch) {
      closeLists();
      inQuote = true;
      quoteLines.push(parseInlineMarkdown(quoteMatch[1]));
      continue;
    } else {
      flushQuote();
    }

    const hMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (hMatch) {
      closeLists();
      const level = Math.min(hMatch[1].length, 3);
      out.push(`<h${level}>${parseInlineMarkdown(hMatch[2])}</h${level}>`);
      continue;
    }

    const todoMatch = line.match(/^\s*[-*+]\s+\[([ xX])\]\s+(.*)$/);
    if (todoMatch) {
      closeLists();
      const isDone = todoMatch[1].toLowerCase() === 'x';
      const checkedAttr = isDone ? ' checked="checked"' : '';
      const doneClass = isDone ? ' is-done' : '';
      out.push(
        `<div class="note-todo-item${doneClass}"><input type="checkbox" class="note-checkbox" contenteditable="false"${checkedAttr}><span class="note-todo-text">${parseInlineMarkdown(
          todoMatch[2]
        )}</span></div>`
      );
      continue;
    }

    const ulMatch = line.match(/^\s*[-*+]\s+(.*)$/);
    if (ulMatch) {
      if (inOl) {
        out.push('</ol>');
        inOl = false;
      }
      if (!inUl) {
        out.push('<ul>');
        inUl = true;
      }
      out.push(`<li>${parseInlineMarkdown(ulMatch[1])}</li>`);
      continue;
    }

    const olMatch = line.match(/^\s*(\d+)\.\s+(.*)$/);
    if (olMatch) {
      if (inUl) {
        out.push('</ul>');
        inUl = false;
      }
      if (!inOl) {
        out.push('<ol>');
        inOl = true;
      }
      out.push(`<li>${parseInlineMarkdown(olMatch[2])}</li>`);
      continue;
    }

    closeLists();
    out.push(`<p>${parseInlineMarkdown(trimmed)}</p>`);
  }

  closeLists();
  flushQuote();

  return out.join('') || '<p></p>';
}

export function extractPlainTextPreview(html: string, maxLen: number = 70): string {
  if (!html) return 'Chưa có nội dung...';
  const stripped = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
  if (!stripped) return 'Chưa có nội dung...';
  return stripped.length > maxLen ? stripped.slice(0, maxLen) + '...' : stripped;
}

export function convertHtmlToMarkdown(html: string): string {
  if (!html) return '';
  let md = html;

  // Code blocks
  md = md.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, (_m, code) => {
    return `\n\`\`\`\n${code}\n\`\`\`\n`;
  });

  // Checklist
  md = md.replace(/<div class="note-todo-item(?:\s+is-done)?"[^>]*><input[^>]*checked[^>]*>(?:<span[^>]*>)?([\s\S]*?)(?:<\/span>)?<\/div>/gi, '- [x] $1\n');
  md = md.replace(/<div class="note-todo-item"[^>]*><input[^>]*>(?:<span[^>]*>)?([\s\S]*?)(?:<\/span>)?<\/div>/gi, '- [ ] $1\n');

  // Headings
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');

  // Inline formatting
  md = md.replace(/<strong[^>]*><em>(.*?)<\/em><\/strong>/gi, '***$1***');
  md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
  md = md.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
  md = md.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
  md = md.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
  md = md.replace(/<del[^>]*>(.*?)<\/del>/gi, '~~$1~~');
  md = md.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');

  // Links
  md = md.replace(/<a[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');

  // Lists
  md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
  md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, '$1\n');
  md = md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, '$1\n');

  // Blockquotes & HR
  md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, '> $1\n\n');
  md = md.replace(/<hr[^>]*>/gi, '\n---\n\n');

  // Paragraphs & line breaks
  md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');
  md = md.replace(/<br\s*[\/]?>/gi, '\n');

  // Strip remaining tags
  md = md.replace(/<[^>]+>/g, '');

  // Unescape common HTML entities
  md = md
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ');

  return md.trim();
}
