// Markdown renderer for LogicG8's reading view.
// It renders a practical subset of GitHub-flavoured Markdown to HTML without
// any third-party dependency, and it never passes raw HTML through — every
// piece of the source is escaped before it reaches the DOM.
(() => {
  'use strict';

  const TEXT_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };
  const PLACEHOLDER = /\u0000(\d+)\u0000/g;

  const FENCE_RE = /^ {0,3}(`{3,}|~{3,})[ \t]*([^\s`]*)[ \t]*$/;
  const HEADING_RE = /^ {0,3}(#{1,6})[ \t]+(.*?)[ \t]*#*[ \t]*$/;
  const HR_RE = /^ {0,3}(?:(?:\*[ \t]*){3,}|(?:-[ \t]*){3,}|(?:_[ \t]*){3,})$/;
  const QUOTE_RE = /^ {0,3}>[ \t]?(.*)$/;
  const ITEM_RE = /^( {0,3})([-*+]|\d{1,9}[.)])([ \t]+)(.*)$/;
  const SETEXT_RE = /^ {0,3}(=+|-+)[ \t]*$/;
  const INDENTED_RE = /^(?: {4}|\t)/;
  const TABLE_DELIMITER_RE = /^ {0,3}\|?[ \t]*:?-+:?[ \t]*(\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$/;

  function escapeHtml(value) {
    return String(value).replace(/[&<>]/g, (char) => TEXT_ESCAPES[char]);
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function slugify(value) {
    const slug = String(value)
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/`[^`]*`/g, ' ')
      .replace(/[*_~[\]()>!]/g, '')
      .replace(/<[^>]*>/g, '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .trim()
      .replace(/\s+/g, '-');
    return slug.slice(0, 64) || 'section';
  }

  function uniqueId(base, context) {
    let id = base;
    let suffix = 2;
    while (context.ids.has(id)) {
      id = `${base}-${suffix}`;
      suffix += 1;
    }
    context.ids.add(id);
    return id;
  }

  function safeUrl(value) {
    const url = String(value == null ? '' : value).trim();
    if (!url) {
      return '';
    }
    const schemeMatch = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(url);
    if (!schemeMatch) {
      // Relative path or in-page anchor.
      return url.replace(/\s/g, '%20');
    }
    const scheme = schemeMatch[1].toLowerCase();
    if (scheme === 'http' || scheme === 'https' || scheme === 'mailto') {
      return url;
    }
    if (scheme === 'data' && /^data:image\//i.test(url)) {
      return url;
    }
    return '';
  }

  // Resolve relative image sources against the file being read, so that local
  // images next to the document show up in the preview.
  function absoluteUrl(url, baseUrl) {
    if (!baseUrl) {
      return url;
    }
    const value = String(url);
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value) || value.startsWith('#')) {
      return value;
    }
    if (value.startsWith('//')) {
      return `https:${value}`;
    }
    if (/^[a-zA-Z]:[\\/]/.test(value)) {
      return `file:///${value.replace(/\\/g, '/')}`;
    }
    try {
      return new URL(value, baseUrl).href;
    } catch {
      return value;
    }
  }

  function leadingWidth(line) {
    const match = /^[ \t]*/.exec(line);
    let width = 0;
    for (const char of match[0]) {
      width += char === '\t' ? 4 : 1;
    }
    return width;
  }

  function stripIndent(line, width) {
    let remaining = width;
    let index = 0;
    while (index < line.length && remaining > 0) {
      if (line[index] === ' ') {
        remaining -= 1;
        index += 1;
      } else if (line[index] === '\t') {
        remaining -= 4;
        index += 1;
      } else {
        break;
      }
    }
    return line.slice(index);
  }

  function isBlockStart(line) {
    return FENCE_RE.test(line)
      || HEADING_RE.test(line)
      || HR_RE.test(line)
      || QUOTE_RE.test(line)
      || ITEM_RE.test(line)
      || INDENTED_RE.test(line);
  }

  function renderInline(raw, context, depth) {
    const level = depth || 0;
    const tokens = [];
    const stash = (html) => {
      tokens.push(html);
      return `\u0000${tokens.length - 1}\u0000`;
    };

    let text = String(raw == null ? '' : raw);

    // Hard breaks (two trailing spaces) and soft line wrapping.
    text = text.replace(/ {2,}\n/g, () => stash('<br>'));
    text = text.replace(/\n/g, ' ');

    // Backslash escapes.
    text = text.replace(/\\([\\`*_{}[\]()#+\-.!>~|])/g, (_match, char) => stash(escapeHtml(char)));

    // Inline code.
    text = text.replace(/(`+)([\s\S]*?)\1(?!`)/g, (_match, ticks, code) => {
      const value = code.length > 1 && code.startsWith(' ') && code.endsWith(' ')
        ? code.slice(1, -1)
        : code;
      return stash(`<code>${escapeHtml(value.replace(/\n/g, ' '))}</code>`);
    });

    if (level < 4) {
      // Images before links, since their syntax differs by one leading "!".
      text = text.replace(/!\[([^\]]*)\]\(\s*<?([^\s<>)]*)>?(?:\s+["']([^"']*)["'])?\s*\)/g, (match, alt, src, title) => {
        const url = safeUrl(src);
        if (!url) {
          return stash(escapeHtml(match));
        }
        const source = absoluteUrl(url, context.baseUrl);
        const titleAttr = title ? ` title="${escapeAttr(title)}"` : '';
        return stash(`<img src="${escapeAttr(source)}" alt="${escapeAttr(alt)}"${titleAttr} loading="lazy" referrerpolicy="no-referrer">`);
      });

      text = text.replace(/\[([^\]]*)\]\(\s*<?([^\s<>)]*)>?(?:\s+["']([^"']*)["'])?\s*\)/g, (match, label, href, title) => {
        const url = safeUrl(href);
        if (!url) {
          return stash(escapeHtml(match));
        }
        const titleAttr = title ? ` title="${escapeAttr(title)}"` : '';
        const inner = label.trim() ? renderInline(label, context, level + 1) : escapeHtml(url);
        if (url.startsWith('#')) {
          return stash(`<a href="${escapeAttr(url)}"${titleAttr} data-link="anchor">${inner}</a>`);
        }
        if (/^(https?:|mailto:)/i.test(url)) {
          return stash(`<a href="${escapeAttr(url)}"${titleAttr} data-link="external" rel="noreferrer">${inner}</a>`);
        }
        return stash(`<a href="${escapeAttr(url)}"${titleAttr} data-link="local">${inner}</a>`);
      });
    }

    // Angle-bracket autolinks.
    text = text.replace(/<((?:https?:\/\/|mailto:)[^>\s]+)>/g, (match, url) => {
      const safe = safeUrl(url);
      if (!safe) {
        return escapeHtml(match);
      }
      return stash(`<a href="${escapeAttr(safe)}" data-link="external" rel="noreferrer">${escapeHtml(url)}</a>`);
    });

    // Bare URLs.
    text = text.replace(/\bhttps?:\/\/[^\s<>"'`]+/g, (match) => {
      const trimmed = match.replace(/[.,;:!?]+$/, '');
      const tail = match.slice(trimmed.length);
      const safe = safeUrl(trimmed);
      if (!safe) {
        return match;
      }
      return `${stash(`<a href="${escapeAttr(safe)}" data-link="external" rel="noreferrer">${escapeHtml(trimmed)}</a>`)}${tail}`;
    });

    text = escapeHtml(text);

    // Emphasis, in an order that keeps nested pairs intact.
    text = text.replace(/\*\*\*(?=\S)([\s\S]*?\S)\*\*\*/g, '<strong><em>$1</em></strong>');
    text = text.replace(/(^|[^\p{L}\p{N}_])___(?=\S)([\s\S]*?\S)___(?![\p{L}\p{N}_])/gu, '$1<strong><em>$2</em></strong>');
    text = text.replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/(^|[^\p{L}\p{N}_])__(?=\S)([\s\S]*?\S)__(?![\p{L}\p{N}_])/gu, '$1<strong>$2</strong>');
    text = text.replace(/(^|[^\p{L}\p{N}*])\*(?=\S)([^*]*?\S)\*(?!\*)/gu, '$1<em>$2</em>');
    text = text.replace(/(^|[^\p{L}\p{N}_])_(?=\S)([^_]*?\S)_(?![\p{L}\p{N}_])/gu, '$1<em>$2</em>');
    text = text.replace(/~~(?=\S)([\s\S]*?\S)~~/g, '<del>$1</del>');

    return text.replace(PLACEHOLDER, (_match, index) => tokens[Number(index)] || '');
  }

  function splitRow(line) {
    let value = line.trim();
    if (value.startsWith('|')) {
      value = value.slice(1);
    }
    if (value.endsWith('|')) {
      value = value.slice(0, -1);
    }
    return value.split('|').map((cell) => cell.trim());
  }

  function parseTable(lines, startIndex, context) {
    const header = splitRow(lines[startIndex]);
    const delimiters = splitRow(lines[startIndex + 1]);
    const alignments = header.map((_cell, column) => {
      const spec = (delimiters[column] || '').trim();
      const left = spec.startsWith(':');
      const right = spec.endsWith(':');
      if (left && right) {
        return 'center';
      }
      if (right) {
        return 'right';
      }
      if (left) {
        return 'left';
      }
      return '';
    });

    const alignAttr = (column) => (alignments[column]
      ? ` style="text-align:${alignments[column]}"`
      : '');

    let index = startIndex + 2;
    const rows = [];
    while (index < lines.length && lines[index].trim() && lines[index].includes('|')) {
      rows.push(splitRow(lines[index]));
      index += 1;
    }

    const headHtml = header.map((cell, column) => `<th${alignAttr(column)}>${renderInline(cell, context)}</th>`).join('');
    const bodyHtml = rows.map((row) => {
      const cells = header.map((_cell, column) => {
        const value = row[column] == null ? '' : row[column];
        return `<td${alignAttr(column)}>${renderInline(value, context)}</td>`;
      });
      return `<tr>${cells.join('')}</tr>`;
    }).join('\n');

    return {
      index,
      block: {
        type: 'table',
        html: `<div class="md-table-wrap"><table class="md-table"><thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></div>`
      }
    };
  }

  function parseList(lines, startIndex, context) {
    const first = ITEM_RE.exec(lines[startIndex]);
    const ordered = /^\d/.test(first[2]);
    const baseIndent = first[1].length;
    const startNumber = ordered ? Number.parseInt(first[2], 10) : 1;
    const items = [];
    let index = startIndex;

    while (index < lines.length) {
      const match = ITEM_RE.exec(lines[index]);
      if (!match) {
        break;
      }
      if (match[1].length !== baseIndent || /^\d/.test(match[2]) !== ordered) {
        break;
      }

      const contentIndent = match[1].length + match[2].length + match[3].length;
      const itemLines = [match[4]];
      let task = false;
      let checked = false;

      const taskMatch = /^\[([ xX])\][ \t]+(.*)$/.exec(itemLines[0]);
      if (taskMatch) {
        task = true;
        checked = taskMatch[1].toLowerCase() === 'x';
        itemLines[0] = taskMatch[2];
      }

      index += 1;

      while (index < lines.length) {
        const next = lines[index];

        if (!next.trim()) {
          let lookahead = index + 1;
          while (lookahead < lines.length && !lines[lookahead].trim()) {
            lookahead += 1;
          }
          if (lookahead < lines.length && leadingWidth(lines[lookahead]) >= contentIndent) {
            itemLines.push('');
            index += 1;
            continue;
          }
          break;
        }

        if (leadingWidth(next) >= contentIndent) {
          itemLines.push(stripIndent(next, contentIndent));
          index += 1;
          continue;
        }

        const sibling = ITEM_RE.exec(next);
        if (sibling && sibling[1].length === baseIndent) {
          break;
        }
        if (isBlockStart(next)) {
          break;
        }

        // Lazy paragraph continuation.
        itemLines.push(next.trim());
        index += 1;
      }

      items.push({ lines: itemLines, task, checked });
    }

    const itemsHtml = items.map((item) => {
      const blocks = parseBlocks(item.lines, context);
      const parts = blocks.map((block, blockIndex) => (
        block.type === 'paragraph' && blockIndex === 0 ? block.inline : block.html
      ));
      const box = item.task
        ? `<input type="checkbox" disabled${item.checked ? ' checked' : ''} aria-label="${item.checked ? 'Done' : 'Not done'}"> `
        : '';
      return `<li${item.task ? ' class="md-task-item"' : ''}>${box}${parts.join('')}</li>`;
    }).join('\n');

    const hasTasks = items.some((item) => item.task);
    const tag = ordered ? 'ol' : 'ul';
    const startAttr = ordered && startNumber !== 1 ? ` start="${startNumber}"` : '';
    const classAttr = hasTasks ? ' class="md-list md-task-list"' : ' class="md-list"';

    return {
      index,
      block: {
        type: 'list',
        html: `<${tag}${classAttr}${startAttr}>${itemsHtml}</${tag}>`
      }
    };
  }

  function parseBlocks(lines, context) {
    const blocks = [];
    let index = 0;
    let guard = 0;

    while (index < lines.length && guard <= lines.length * 4 + 8) {
      guard += 1;
      const line = lines[index];

      if (!line.trim()) {
        index += 1;
        continue;
      }

      const fence = FENCE_RE.exec(line);
      if (fence) {
        const marker = fence[1];
        const closing = new RegExp(`^ {0,3}${marker[0] === '`' ? '`' : '~'}{${marker.length},}[ \\t]*$`);
        const language = (fence[2] || '').replace(/^\{\.?|\}$/g, '');
        const body = [];
        index += 1;
        while (index < lines.length) {
          if (closing.test(lines[index])) {
            index += 1;
            break;
          }
          body.push(lines[index]);
          index += 1;
        }
        const classAttr = language ? ` class="language-${escapeAttr(language)}"` : '';
        blocks.push({
          type: 'code',
          html: `<pre class="md-code"><code${classAttr}>${escapeHtml(body.join('\n'))}</code></pre>`
        });
        continue;
      }

      const heading = HEADING_RE.exec(line);
      if (heading) {
        const level = heading[1].length;
        const id = uniqueId(slugify(heading[2]), context);
        blocks.push({
          type: 'heading',
          html: `<h${level} id="${id}">${renderInline(heading[2], context)}</h${level}>`
        });
        index += 1;
        continue;
      }

      if (HR_RE.test(line)) {
        blocks.push({ type: 'hr', html: '<hr>' });
        index += 1;
        continue;
      }

      if (QUOTE_RE.test(line)) {
        const quoted = [];
        while (index < lines.length) {
          const quote = QUOTE_RE.exec(lines[index]);
          if (!quote) {
            break;
          }
          quoted.push(quote[1]);
          index += 1;
        }
        blocks.push({
          type: 'quote',
          html: `<blockquote>${parseBlocks(quoted, context).map((block) => block.html).join('')}</blockquote>`
        });
        continue;
      }

      if (ITEM_RE.test(line)) {
        const list = parseList(lines, index, context);
        index = list.index;
        blocks.push(list.block);
        continue;
      }

      if (
        line.includes('|')
        && index + 1 < lines.length
        && lines[index + 1].includes('|')
        && TABLE_DELIMITER_RE.test(lines[index + 1])
      ) {
        const table = parseTable(lines, index, context);
        index = table.index;
        blocks.push(table.block);
        continue;
      }

      if (INDENTED_RE.test(line)) {
        const body = [];
        while (index < lines.length) {
          if (INDENTED_RE.test(lines[index])) {
            body.push(lines[index].replace(/^(?: {4}|\t)/, ''));
            index += 1;
          } else if (!lines[index].trim() && index + 1 < lines.length && INDENTED_RE.test(lines[index + 1])) {
            body.push('');
            index += 1;
          } else {
            break;
          }
        }
        blocks.push({
          type: 'code',
          html: `<pre class="md-code"><code>${escapeHtml(body.join('\n'))}</code></pre>`
        });
        continue;
      }

      // Paragraph, possibly turned into a setext heading by the next line.
      const paragraphLines = [];
      let setextLevel = 0;
      while (index < lines.length) {
        const current = lines[index];
        if (!current.trim()) {
          break;
        }
        if (paragraphLines.length) {
          const setext = SETEXT_RE.exec(current);
          if (setext) {
            setextLevel = setext[1][0] === '=' ? 1 : 2;
            index += 1;
            break;
          }
          if (isBlockStart(current)) {
            break;
          }
        }
        paragraphLines.push(current);
        index += 1;
      }

      if (paragraphLines.length === 0) {
        // Safety net: never leave the cursor on the same line.
        index += 1;
        continue;
      }

      const inlineHtml = renderInline(paragraphLines.join('\n'), context);
      if (setextLevel) {
        const id = uniqueId(slugify(paragraphLines.join(' ')), context);
        blocks.push({
          type: 'heading',
          html: `<h${setextLevel} id="${id}">${inlineHtml}</h${setextLevel}>`
        });
      } else {
        blocks.push({ type: 'paragraph', inline: inlineHtml, html: `<p>${inlineHtml}</p>` });
      }
    }

    return blocks;
  }

  function splitFrontMatter(text) {
    if (!text.startsWith('---\n')) {
      return { frontMatter: '', body: text };
    }
    const lines = text.split('\n');
    const limit = Math.min(lines.length, 64);
    for (let index = 1; index < limit; index += 1) {
      if (/^(?:---|\.\.\.)[ \t]*$/.test(lines[index])) {
        return {
          frontMatter: lines.slice(0, index + 1).join('\n'),
          body: lines.slice(index + 1).join('\n')
        };
      }
    }
    return { frontMatter: '', body: text };
  }

  function render(source, options) {
    const settings = options || {};
    const normalized = String(source == null ? '' : source)
      .replace(/^\uFEFF/, '')
      .replace(/\r\n?/g, '\n');
    const context = {
      ids: new Set(),
      baseUrl: typeof settings.baseUrl === 'string' ? settings.baseUrl : ''
    };
    const { frontMatter, body } = splitFrontMatter(normalized);
    const blocks = parseBlocks(body.split('\n'), context);
    if (frontMatter) {
      blocks.unshift({
        type: 'frontmatter',
        html: `<pre class="md-frontmatter"><code>${escapeHtml(frontMatter)}</code></pre>`
      });
    }
    const content = blocks.map((block) => block.html).join('\n');
    if (!content.trim()) {
      return '<div class="md-document"><p class="md-empty">This file is empty.</p></div>';
    }
    return `<div class="md-document">${content}</div>`;
  }

  window.__MARKDOWN__ = { render };
})();
