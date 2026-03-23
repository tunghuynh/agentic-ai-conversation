// --- Markdown Parser ---
// Converts markdown text to styled HTML with support for:
// code blocks, math (KaTeX), bold, italic, strikethrough, headers,
// blockquotes, links, lists, tables, horizontal rules.

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function parseMarkdown(text) {
  if (!text) return '';
  const blocks = [];

  // --- Phase 1: Extract protected blocks (code, math) before escaping ---

  // Fenced code blocks
  let html = text.replace(/```([\w]*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const i = blocks.length;
    const trimmed = code.trim();
    const highlighted = Highlighter.highlight(trimmed, lang);
    const langLabel = escHtml(lang || 'code');
    blocks.push(
      `<div class="code-block my-2 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">` +
      `<div class="flex items-center justify-between px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 select-none">` +
      `<span class="text-[10px] font-mono text-gray-500 dark:text-gray-400">${langLabel}</span>` +
      `<button class="copy-btn text-[10px] text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer">Copy</button>` +
      `</div>` +
      `<pre class="bg-gray-50 dark:bg-gray-900 p-3 text-xs font-mono overflow-x-auto leading-relaxed whitespace-pre"><code>${highlighted}</code></pre>` +
      `</div>`
    );
    return `\x00BLOCK${i}\x00`;
  });

  // --- Phase 2: Escape HTML ---
  html = escHtml(html);

  // --- Phase 3: Markdown transformations ---
  html = html.replace(/`([^`\n]+)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs font-mono">$1</code>');
  html = html.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
  html = html.replace(/~~([^~\n]+)~~/g, '<del>$1</del>');
  html = html.replace(/^#{1,3} (.+)$/gm, '<div class="font-semibold mt-1.5 mb-0.5">$1</div>');
  html = html.replace(/^---+$/gm, '<hr class="border-gray-200 dark:border-gray-700 my-2">');
  html = html.replace(/^&gt; (.+)$/gm, '<div class="border-l-2 border-gray-300 dark:border-gray-600 pl-2 ml-1 text-gray-600 dark:text-gray-400 italic">$1</div>');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="text-indigo-500 hover:underline">$1</a>');
  html = html.replace(/^[*\-•] (.+)$/gm, '<div class="flex gap-1.5 ml-2"><span>•</span><span>$1</span></div>');
  html = html.replace(/^(\d+)\. (.+)$/gm, '<div class="flex gap-1.5 ml-2"><span>$1.</span><span>$2</span></div>');

  // --- Phase 4: Tables ---
  html = _parseMarkdownTables(html);

  // Newlines → line breaks
  html = html.replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>');

  // Restore protected blocks
  blocks.forEach((b, i) => { html = html.replace(`\x00BLOCK${i}\x00`, b); });

  // Sanitize final HTML to strip any dangerous tags from AI responses
  return SanitizeHTML.sanitize(html);
}

// Parse markdown tables within already-escaped HTML
function _parseMarkdownTables(html) {
  const lines = html.split('\n');
  const result = [];
  let i = 0;

  while (i < lines.length) {
    if (i + 1 < lines.length && lines[i].includes('|') && /^\|?\s*[-:]+[-|\s:]*$/.test(lines[i + 1])) {
      const headerCells = lines[i].split('|').map(c => c.trim()).filter(Boolean);
      const sepCells = lines[i + 1].split('|').map(c => c.trim()).filter(Boolean);
      const aligns = sepCells.map(c => {
        if (c.startsWith(':') && c.endsWith(':')) return 'center';
        if (c.endsWith(':')) return 'right';
        return 'left';
      });
      i += 2;

      const bodyRows = [];
      while (i < lines.length && lines[i].includes('|')) {
        bodyRows.push(lines[i].split('|').map(c => c.trim()).filter(Boolean));
        i++;
      }

      let table = '<div class="overflow-x-auto my-2"><table class="text-xs border-collapse w-full">';
      table += '<thead><tr>';
      headerCells.forEach((cell, ci) => {
        table += `<th class="border border-gray-200 dark:border-gray-700 px-2 py-1 bg-gray-50 dark:bg-gray-800 font-semibold" style="text-align:${aligns[ci] || 'left'}">${cell}</th>`;
      });
      table += '</tr></thead><tbody>';
      bodyRows.forEach(row => {
        table += '<tr>';
        row.forEach((cell, ci) => {
          table += `<td class="border border-gray-200 dark:border-gray-700 px-2 py-1" style="text-align:${aligns[ci] || 'left'}">${cell}</td>`;
        });
        table += '</tr>';
      });
      table += '</tbody></table></div>';
      result.push(table);
    } else {
      result.push(lines[i]);
      i++;
    }
  }

  return result.join('\n');
}
