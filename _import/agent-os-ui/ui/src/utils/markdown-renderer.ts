/**
 * Centralized Markdown Rendering Utility
 *
 * Provides configured marked instance with:
 * - highlight.js syntax highlighting
 * - Mermaid diagram support
 * - GFM (GitHub Flavored Markdown) support
 * - XSS prevention via escaping
 * - Custom code block renderer with language headers
 */

import { marked, type Tokens } from 'marked';
import hljs from 'highlight.js';

// Counter for generating unique mermaid diagram IDs
let mermaidIdCounter = 0;

/**
 * Custom renderer for code blocks with:
 * - Syntax highlighting via highlight.js
 * - Mermaid diagram support
 * - Language header display
 * - Copy button integration support
 */
const renderer = {
  code({ text, lang }: Tokens.Code): string {
    // Handle Mermaid diagrams separately
    if (lang === 'mermaid') {
      const id = `mermaid-${++mermaidIdCounter}`;
      // Store the raw mermaid code for rendering after DOM update
      // Escape the code for safe storage in data attribute
      return `<div class="mermaid-container" data-mermaid="${escapeHtml(text)}" data-mermaid-id="${id}">
        <div class="mermaid-diagram" id="${id}"></div>
        <div class="mermaid-fallback" style="display: none;">
          <pre><code class="language-mermaid">${escapeHtml(text)}</code></pre>
        </div>
      </div>`;
    }

    const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
    const displayLang = lang || 'text';
    const highlighted = lang && hljs.getLanguage(lang)
      ? hljs.highlight(text, { language }).value
      : hljs.highlightAuto(text).value;

    // Wrap in code-block structure for styling and copy functionality
    // Note: Copy handling is done via event delegation in chat-message.ts
    return `<div class="code-block">
      <div class="code-header">
        <span class="code-language">${escapeHtml(displayLang)}</span>
        <button class="copy-btn" data-code="${escapeHtml(text)}" tabindex="0" title="Code kopieren" aria-label="Code kopieren">
          <span class="copy-btn-text">Copy</span>
        </button>
      </div>
      <pre><code class="hljs language-${language}">${highlighted}</code></pre>
    </div>`;
  }
};

/**
 * Configure marked for chat context:
 * - gfm: true - Tables, strikethrough, autolinks
 * - breaks: true - Convert \n to <br> (important for chat)
 */
marked.use({ renderer, gfm: true, breaks: true });

/**
 * Escape HTML entities to prevent XSS
 */
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Render markdown string to HTML
 *
 * @param content - Raw markdown string
 * @returns Rendered HTML string (safe for unsafeHTML directive)
 */
export function renderMarkdown(content: string): string {
  if (!content) {
    return '';
  }

  try {
    return marked.parse(content) as string;
  } catch (error) {
    console.error('Markdown parsing error:', error);
    // Return escaped content as fallback
    return `<p>${escapeHtml(content)}</p>`;
  }
}

/**
 * Render markdown synchronously for streaming content
 * Same as renderMarkdown but explicit about sync nature
 *
 * @param content - Raw markdown string
 * @returns Rendered HTML string
 */
export function renderMarkdownSync(content: string): string {
  return renderMarkdown(content);
}

/**
 * Check if content has incomplete markdown structures
 * Used for streaming to decide whether to render markdown or show plaintext
 *
 * @param content - Raw markdown string
 * @returns Object with flags for different incomplete structures
 */
export function hasIncompleteStructures(content: string): {
  incompleteCodeBlock: boolean;
  incompleteTable: boolean;
  incomplete: boolean;
} {
  // Check for incomplete code blocks (odd number of ```)
  const codeBlockMatches = content.match(/```/g);
  const incompleteCodeBlock = codeBlockMatches ? codeBlockMatches.length % 2 !== 0 : false;

  // Check for incomplete tables
  // A table is incomplete if it starts with | but doesn't have a complete structure
  const lines = content.split('\n');
  let incompleteTable = false;
  let inTable = false;
  let hasHeaderSeparator = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|') && line.endsWith('|')) {
      inTable = true;
      // Check if next line is header separator (|---|---|)
      if (i + 1 < lines.length && /^\|[\s-:|]+\|$/.test(lines[i + 1].trim())) {
        hasHeaderSeparator = true;
      }
    } else if (inTable && line === '') {
      // Empty line ends table
      inTable = false;
      hasHeaderSeparator = false;
    }
  }

  // Table is incomplete if we're in a table but haven't seen the header separator yet
  if (inTable && !hasHeaderSeparator && lines.filter(l => l.trim().startsWith('|')).length === 1) {
    incompleteTable = true;
  }

  return {
    incompleteCodeBlock,
    incompleteTable,
    incomplete: incompleteCodeBlock || incompleteTable
  };
}

/**
 * Render markdown for streaming content
 * Handles incomplete structures gracefully by rendering completed portions
 * and showing incomplete portions as plaintext
 *
 * @param content - Raw markdown string (possibly incomplete)
 * @returns Rendered HTML string with incomplete portions escaped
 */
export function renderMarkdownStreaming(content: string): string {
  if (!content) {
    return '';
  }

  const { incompleteCodeBlock } = hasIncompleteStructures(content);

  if (incompleteCodeBlock) {
    // Find the last unclosed code block and render everything before it
    const lastCodeBlockStart = content.lastIndexOf('```');
    const beforeBlock = content.substring(0, lastCodeBlockStart);
    const incompleteBlock = content.substring(lastCodeBlockStart);

    // Check if the part before also has issues
    const beforeHasIssues = hasIncompleteStructures(beforeBlock).incomplete;

    if (beforeHasIssues || lastCodeBlockStart === 0) {
      // Just escape the whole thing
      return `<p>${escapeHtml(content)}</p>`;
    }

    // Render completed portion + show incomplete as pre
    const completedHtml = renderMarkdown(beforeBlock);
    const incompleteHtml = `<pre class="streaming-incomplete"><code>${escapeHtml(incompleteBlock)}</code></pre>`;
    return completedHtml + incompleteHtml;
  }

  // No incomplete structures, render normally
  return renderMarkdown(content);
}
