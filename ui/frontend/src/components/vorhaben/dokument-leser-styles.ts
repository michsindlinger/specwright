/**
 * Styles of aos-dokument-leser (shadow DOM). The shared markdownStyles are
 * adopted alongside; these add the frontmatter table, the reload hint, the
 * design/ gallery, Mermaid containers, code blocks and the FA-18 rule (no
 * horizontal page scroll on phones — wide tables/code scroll in their box).
 */

import { css } from 'lit';

export const dokumentLeserStyles = css`
  :host {
    display: block;
    position: relative;
    min-width: 0;
  }
  .leser-reload {
    position: sticky;
    top: 0;
    z-index: 2;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-xs) var(--spacing-md);
    margin-bottom: var(--spacing-sm);
    border: 1px solid var(--color-accent-warning);
    border-radius: var(--radius-md);
    background: var(--color-bg-secondary);
    font-size: var(--font-size-sm);
  }
  .leser-reload-btn {
    padding: 4px 10px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-border);
    background: var(--color-bg-tertiary);
    color: var(--color-text-primary);
    font: inherit;
    font-size: var(--font-size-sm);
    cursor: pointer;
  }
  .leser-status {
    color: var(--color-text-secondary);
    padding: var(--spacing-md);
  }
  .leser-error {
    color: var(--color-accent-error);
  }
  .markdown-body {
    max-width: 900px;
  }
  .markdown-body .kopffelder {
    width: auto;
    margin: 0 0 var(--spacing-lg);
    font-family: var(--font-family-mono);
    font-size: var(--font-size-sm);
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
  }
  .markdown-body .kopffelder th {
    text-align: left;
    color: var(--color-text-muted);
    font-weight: normal;
    padding-right: var(--spacing-lg);
    white-space: nowrap;
  }
  .markdown-body .kopffelder td {
    word-break: break-word;
  }
  /* FA-18: no horizontal page scroll on phones — wide tables and code scroll in their own box */
  .markdown-body table {
    display: block;
    width: max-content;
    max-width: 100%;
    overflow-x: auto;
  }
  .markdown-body pre {
    overflow-x: auto;
  }
  .markdown-body img {
    max-width: 100%;
    height: auto;
  }
  .markdown-body .mermaid-container {
    margin: var(--spacing-md) 0;
    background-color: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }
  .markdown-body .mermaid-diagram {
    padding: var(--spacing-md);
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100px;
    overflow-x: auto;
  }
  .markdown-body .mermaid-diagram svg {
    max-width: 100%;
    height: auto;
  }
  .markdown-body .mermaid-fallback {
    padding: var(--spacing-md);
  }
  .markdown-body .mermaid-fallback pre {
    margin: 0;
    padding: var(--spacing-sm);
    background-color: var(--color-bg-tertiary);
    border-radius: var(--radius-md);
    overflow-x: auto;
  }
  .markdown-body .mermaid-error {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-md);
    margin-bottom: var(--spacing-sm);
    background-color: rgba(var(--color-accent-error-rgb), 0.1);
    border-radius: var(--radius-md);
    color: var(--color-danger);
    font-size: var(--font-size-sm);
  }
  .leser-design {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
  }
  .leser-figure {
    margin: 0;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    overflow: hidden;
    background: var(--color-bg-secondary);
  }
  .leser-figure img {
    display: block;
    max-width: 100%;
    height: auto;
  }
  .leser-figure figcaption,
  .leser-file {
    padding: var(--spacing-xs) var(--spacing-md);
    font-family: var(--font-family-mono);
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }
  .leser-file {
    border: 1px dashed var(--color-border);
    border-radius: var(--radius-md);
  }

  /* Code blocks as emitted by markdown-renderer.ts (mirrors theme.css .code-block) */
  .code-block {
    margin: var(--spacing-md) 0;
    background-color: var(--color-bg-primary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    overflow: hidden;
  }
  .code-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-xs) var(--spacing-sm);
    background-color: var(--color-bg-tertiary);
    border-bottom: 1px solid var(--color-border);
  }
  .code-language {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    text-transform: uppercase;
  }
  .copy-btn {
    font-size: var(--font-size-xs);
    padding: var(--spacing-xs) var(--spacing-sm);
    background-color: var(--color-bg-elevated);
    color: var(--color-text-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    cursor: pointer;
  }
  .copy-btn:hover {
    background-color: var(--color-accent-primary);
    color: var(--color-bg-primary);
    border-color: var(--color-accent-primary);
  }
  .code-block pre {
    margin: 0;
    padding: var(--spacing-md);
    overflow-x: auto;
    border: none;
    background: transparent;
  }
`;
