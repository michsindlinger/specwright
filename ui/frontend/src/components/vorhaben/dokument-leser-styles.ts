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
  /* No max-width on .markdown-body (INT-2026-013, AK-02): the text takes the column. */
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

  /* ---- stage 2: anchors, marks, tap bar (FA-23/FA-24) ---- */
  .leser-werkzeuge {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-sm);
    font-size: var(--font-size-sm);
  }
  .leser-gesamt-btn {
    padding: 4px 10px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-border);
    background: var(--color-bg-tertiary);
    color: var(--color-text-primary);
    font: inherit;
    font-size: var(--font-size-sm);
    cursor: pointer;
  }
  .leser-tipp {
    color: var(--color-text-muted);
    font-size: var(--font-size-xs);
  }
  /* Stage 3 (FA-13): switch above a marked document, technik sections as closed boxes */
  .leser-technik {
    display: flex;
    justify-content: flex-end;
    margin-bottom: var(--spacing-sm);
  }
  .leser-technik-btn {
    padding: 4px 10px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-border);
    background: var(--color-bg-tertiary);
    color: var(--color-text-secondary);
    font: inherit;
    font-size: var(--font-size-sm);
    cursor: pointer;
  }
  .leser-technik-btn[aria-pressed='true'] {
    color: var(--color-text-primary);
    border-color: var(--color-primary);
  }
  .markdown-body details.technik {
    margin: var(--spacing-md) 0;
    padding: 0 0 0 var(--spacing-md);
    border-left: 3px solid var(--color-border);
  }
  .markdown-body details.technik > summary {
    cursor: pointer;
    list-style: none;
    color: var(--color-text-secondary);
  }
  .markdown-body details.technik > summary::-webkit-details-marker {
    display: none;
  }
  .markdown-body details.technik > summary::before {
    content: '▸';
    display: inline-block;
    width: 1em;
    color: var(--color-text-muted);
  }
  .markdown-body details.technik[open] > summary::before {
    content: '▾';
  }
  .markdown-body details.technik > summary > h2,
  .markdown-body details.technik > summary > h3,
  .markdown-body details.technik > summary > h4 {
    display: inline;
    margin: 0;
    padding: 0;
    border: 0;
    font-size: 1em;
    font-weight: 600;
  }
  .markdown-body details.technik:not([open]) > summary::after {
    content: ' · Technik';
    color: var(--color-text-muted);
    font-size: var(--font-size-xs);
  }
  .markdown-body details.technik[open] > summary {
    margin-bottom: var(--spacing-sm);
  }
  .markdown-body.annotierbar {
    padding-left: 32px;
  }
  .markdown-body.annotierbar.mobil {
    padding-left: 0;
  }
  .markdown-body.annotierbar [data-ordinal] {
    position: relative;
    border-radius: var(--radius-sm);
    outline: none;
  }
  /* Mac: the mark in the left gutter — on hover/focus, permanent with an Anmerkung */
  .markdown-body.annotierbar:not(.mobil) [data-ordinal]::before {
    content: '+';
    position: absolute;
    left: -30px;
    top: 0.15em;
    width: 20px;
    height: 20px;
    line-height: 20px;
    text-align: center;
    border-radius: 50%;
    border: 1px solid var(--color-border);
    background: var(--color-bg-secondary);
    color: var(--color-text-secondary);
    font-size: 12px;
    font-family: var(--font-family-mono);
    opacity: 0;
    cursor: pointer;
    transition: opacity 0.12s;
  }
  .markdown-body.annotierbar:not(.mobil) [data-ordinal]:hover::before,
  .markdown-body.annotierbar:not(.mobil) [data-ordinal]:focus-visible::before {
    opacity: 1;
  }
  .markdown-body.annotierbar [data-ordinal][data-anmerkung]::before {
    content: attr(data-anmerkung);
    opacity: 1;
    background: var(--color-accent-primary);
    border-color: var(--color-accent-primary);
    color: var(--color-bg-primary);
    font-weight: 600;
  }
  .markdown-body.annotierbar.mobil [data-ordinal][data-anmerkung]::before {
    content: attr(data-anmerkung);
    position: static;
    display: inline-block;
    width: 18px;
    height: 18px;
    line-height: 18px;
    margin-right: 6px;
    border-radius: 50%;
    text-align: center;
    background: var(--color-accent-primary);
    color: var(--color-bg-primary);
    font-size: 11px;
    font-weight: 600;
    font-family: var(--font-family-mono);
  }
  .markdown-body.annotierbar [data-ordinal][data-anmerkung] {
    box-shadow: inset 3px 0 0 var(--color-accent-primary);
    padding-left: 6px;
  }
  .markdown-body.annotierbar tr[data-anmerkung] {
    box-shadow: inset 3px 0 0 var(--color-accent-primary);
  }
  .markdown-body.annotierbar:not(.mobil) [data-ordinal]:focus-visible {
    box-shadow: 0 0 0 2px var(--color-accent-primary);
  }
  .markdown-body .leser-aktiv,
  .markdown-body .leser-getippt {
    background: rgba(var(--color-accent-primary-rgb, 0, 212, 255), 0.08);
    box-shadow: 0 0 0 1px var(--color-accent-primary);
  }
  /* INT-2026-011 (FA-13): the block a Kennung link in the terminal jumped to — two seconds, then gone (mock 11a). */
  .markdown-body .kennung-hit {
    background: rgba(var(--color-accent-primary-rgb, 0, 212, 255), 0.12);
    box-shadow: 0 0 0 1px var(--color-accent-primary);
    animation: kennung-hit-fade 2s ease-out forwards;
  }
  @keyframes kennung-hit-fade {
    0%, 60% {
      background: rgba(var(--color-accent-primary-rgb, 0, 212, 255), 0.12);
      box-shadow: 0 0 0 1px var(--color-accent-primary);
    }
    100% {
      background: transparent;
      box-shadow: none;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .markdown-body .kennung-hit {
      animation: none;
    }
  }
  .leser-tapbar {
    display: flex;
    gap: var(--spacing-xs);
    margin: var(--spacing-xs) 0 var(--spacing-sm);
  }
  .leser-tapbar-btn {
    padding: 6px 12px;
    border-radius: 999px;
    border: 1px solid var(--color-border);
    background: var(--color-bg-secondary);
    color: var(--color-text-primary);
    font: inherit;
    font-size: var(--font-size-sm);
    cursor: pointer;
  }
  .leser-tapbar-btn.primary {
    background: var(--color-accent-primary);
    border-color: var(--color-accent-primary);
    color: var(--color-bg-primary);
    font-weight: 600;
  }
  .markdown-body aos-anmerkung-editor {
    display: block;
  }
`;
