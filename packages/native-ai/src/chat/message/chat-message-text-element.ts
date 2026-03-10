import { NativeElement, signal } from '@nonoun/native-ui';

/**
 * Rich text message renderer with lightweight markdown support.
 *
 * Renders a markdown subset (paragraphs, headings, lists, code fences,
 * inline code, bold, italic, links, blockquotes) to sanitized HTML.
 *
 * ```html
 * <n-chat-message-text format="markdown">
 *   Hello **world**!
 * </n-chat-message-text>
 * ```
 *
 * Or set content via property:
 * ```js
 * el.content = '# Title\nSome **bold** text';
 * ```
 *
 * @attr {string} format - `markdown` (default) | `plain`
 */
export class NChatMessageText extends NativeElement {
  static observedAttributes = ['format'];

  #format = signal<'markdown' | 'plain'>('markdown');
  #content = signal('');
  #outputEl: HTMLDivElement | null = null;
  #renderTimer = 0;

  // ── Public API ──

  get content(): string { return this.#content.value; }
  set content(val: string) {
    this.#content.value = val;
  }

  get format(): 'markdown' | 'plain' { return this.#format.value; }
  set format(val: 'markdown' | 'plain') {
    this.#format.value = val;
    this.setAttribute('format', val);
  }

  // ── Attribute sync ──

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (old === val) return;
    if (name === 'format') {
      this.#format.value = val === 'plain' ? 'plain' : 'markdown';
    }
    super.attributeChangedCallback(name, old, val);
  }

  // ── Lifecycle ──

  setup(): void {
    super.setup();

    // If element has text content on setup and no content was set via property,
    // use the text content as the source
    this.deferChildren(() => {
      if (!this.#content.value && this.textContent?.trim()) {
        this.#content.value = this.textContent.trim();
      }

      // Create output container
      this.#outputEl = document.createElement('div');
      this.#outputEl.className = 'n-chat-prose';
      this.textContent = '';
      this.appendChild(this.#outputEl);

      this.addEffect(() => {
        const raw = this.#content.value;
        const fmt = this.#format.value;
        if (!this.#outputEl) return;

        if (fmt === 'plain') {
          this.#outputEl.textContent = raw;
        } else {
          // Debounce markdown renders during rapid streaming updates
          cancelAnimationFrame(this.#renderTimer);
          this.#renderTimer = requestAnimationFrame(() => {
            if (this.#outputEl) {
              this.#outputEl.innerHTML = sanitizeHtml(renderMarkdown(raw));
            }
          });
        }
      });
    });
  }

  teardown(): void {
    cancelAnimationFrame(this.#renderTimer);
    this.#outputEl = null;
    super.teardown();
  }
}

// ═══════════════════════════════════════════════════════
// Lightweight markdown → HTML renderer
// Subset: paragraphs, headings, lists, code fences,
//         inline code, bold, italic, links, blockquotes
// ═══════════════════════════════════════════════════════

const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'em', 'code', 'pre', 'a',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'blockquote', 'hr',
]);

function escapeHtml(str: string): string {
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderInline(text: string): string {
  let out = escapeHtml(text);

  // Inline code: `code`
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Bold: **text** or __text__
  out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/__(.+?)__/g, '<strong>$1</strong>');

  // Italic: *text* or _text_
  out = out.replace(/\*(.+?)\*/g, '<em>$1</em>');
  out = out.replace(/(?<!\w)_(.+?)_(?!\w)/g, '<em>$1</em>');

  // Links: [text](url) — only http/https
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
    '<a href="$2" rel="noopener noreferrer" target="_blank">$1</a>');

  return out;
}

function renderMarkdown(src: string): string {
  if (!src) return '';

  const lines = src.split('\n');
  const html: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code fence
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i += 1;
      }
      i += 1; // skip closing ```
      const langAttr = lang ? ` data-lang="${escapeHtml(lang)}"` : '';
      html.push(`<pre${langAttr}><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
      continue;
    }

    // Heading: # ... ######
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      html.push(`<h${level}>${renderInline(headingMatch[2])}</h${level}>`);
      i += 1;
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim()) || /^\*\*\*+$/.test(line.trim())) {
      html.push('<hr>');
      i += 1;
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        quoteLines.push(lines[i].slice(2));
        i += 1;
      }
      html.push(`<blockquote>${renderMarkdown(quoteLines.join('\n'))}</blockquote>`);
      continue;
    }

    // Unordered list — allow blank lines between items
    if (/^[-*+]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length) {
        if (/^[-*+]\s/.test(lines[i])) {
          items.push(lines[i].replace(/^[-*+]\s/, ''));
          i += 1;
        } else if (!lines[i].trim() && i + 1 < lines.length && /^[-*+]\s/.test(lines[i + 1])) {
          i += 1;
        } else {
          break;
        }
      }
      html.push('<ul>' + items.map(item => `<li>${renderInline(item)}</li>`).join('') + '</ul>');
      continue;
    }

    // Ordered list — allow blank lines between items (LLMs often insert them)
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length) {
        if (/^\d+\.\s/.test(lines[i])) {
          items.push(lines[i].replace(/^\d+\.\s/, ''));
          i += 1;
        } else if (!lines[i].trim() && i + 1 < lines.length && /^\d+\.\s/.test(lines[i + 1])) {
          // Skip blank line between numbered items
          i += 1;
        } else {
          break;
        }
      }
      html.push('<ol>' + items.map(item => `<li>${renderInline(item)}</li>`).join('') + '</ol>');
      continue;
    }

    // Empty line
    if (!line.trim()) {
      i += 1;
      continue;
    }

    // Paragraph: collect contiguous non-empty lines
    const pLines: string[] = [];
    while (i < lines.length && lines[i].trim() && !lines[i].startsWith('#') && !lines[i].startsWith('```') && !lines[i].startsWith('> ') && !/^[-*+]\s/.test(lines[i]) && !/^\d+\.\s/.test(lines[i]) && !/^---+$/.test(lines[i].trim())) {
      pLines.push(lines[i]);
      i += 1;
    }
    if (pLines.length > 0) {
      html.push(`<p>${renderInline(pLines.join('\n'))}</p>`);
    }
  }

  return html.join('');
}

/** Sanitize rendered HTML — strip any tags not in allowlist. */
export function sanitizeHtml(html: string): string {
  // Replace tags not in allowlist with their text content
  return html.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g, (match, tag) => {
    const lower = tag.toLowerCase();
    if (ALLOWED_TAGS.has(lower)) return match;
    return '';
  });
}

export { renderMarkdown, renderInline };
