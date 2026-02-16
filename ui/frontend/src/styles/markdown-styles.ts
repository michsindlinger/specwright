import { css } from 'lit';

/**
 * Shared markdown body styles for use in Shadow DOM components.
 * These mirror the .markdown-body styles from theme.css so they
 * can penetrate shadow boundaries when needed.
 */
export const markdownStyles = css`
  .markdown-body {
    color: var(--color-text-primary);
    font-size: var(--font-size-base);
    line-height: var(--line-height-relaxed);
  }

  .markdown-body h1 {
    font-size: var(--font-size-3xl);
    font-weight: var(--font-weight-bold);
    margin: 0 0 var(--spacing-lg) 0;
    padding-bottom: var(--spacing-sm);
    border-bottom: 1px solid var(--color-border);
    color: var(--color-text-primary);
  }

  .markdown-body h2 {
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-semibold);
    margin: var(--spacing-xl) 0 var(--spacing-md) 0;
    color: var(--color-text-primary);
  }

  .markdown-body h3 {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-semibold);
    margin: var(--spacing-lg) 0 var(--spacing-md) 0;
    color: var(--color-text-primary);
  }

  .markdown-body h4 {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
    margin: var(--spacing-md) 0 var(--spacing-sm) 0;
    color: var(--color-text-primary);
  }

  .markdown-body h5,
  .markdown-body h6 {
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-semibold);
    margin: var(--spacing-md) 0 var(--spacing-sm) 0;
    color: var(--color-text-secondary);
  }

  .markdown-body p {
    margin: 0 0 var(--spacing-md) 0;
  }

  .markdown-body ul,
  .markdown-body ol {
    margin: 0 0 var(--spacing-md) 0;
    padding-left: var(--spacing-xl);
  }

  .markdown-body li {
    margin-bottom: var(--spacing-xs);
  }

  .markdown-body li > ul,
  .markdown-body li > ol {
    margin: var(--spacing-xs) 0;
  }

  .markdown-body blockquote {
    margin: 0 0 var(--spacing-md) 0;
    padding: var(--spacing-sm) var(--spacing-md);
    border-left: 4px solid var(--color-accent-primary);
    background-color: var(--color-bg-secondary);
    color: var(--color-text-secondary);
  }

  .markdown-body blockquote > p:last-child {
    margin-bottom: 0;
  }

  .markdown-body hr {
    border: none;
    border-top: 1px solid var(--color-border);
    margin: var(--spacing-xl) 0;
  }

  .markdown-body table {
    width: 100%;
    border-collapse: collapse;
    margin: 0 0 var(--spacing-md) 0;
  }

  .markdown-body th,
  .markdown-body td {
    padding: var(--spacing-sm) var(--spacing-md);
    border: 1px solid var(--color-border);
    text-align: left;
  }

  .markdown-body th {
    background-color: var(--color-bg-secondary);
    font-weight: var(--font-weight-semibold);
  }

  .markdown-body tr:nth-child(even) {
    background-color: var(--color-bg-secondary);
  }

  .markdown-body img {
    max-width: 480px;
    height: auto;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: opacity var(--transition-fast);
  }

  .markdown-body img:hover {
    opacity: 0.85;
  }

  .markdown-body a {
    color: var(--color-accent-secondary);
    text-decoration: underline;
  }

  .markdown-body a:hover {
    color: var(--color-accent-primary);
  }

  .markdown-body code:not(.hljs) {
    font-family: var(--font-family-mono);
    font-size: var(--font-size-sm);
    background-color: var(--color-bg-tertiary);
    padding: 2px var(--spacing-xs);
    border-radius: var(--radius-sm);
    color: var(--color-accent-primary);
  }

  .markdown-body pre {
    margin: 0 0 var(--spacing-md) 0;
    padding: var(--spacing-md);
    background-color: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    overflow-x: auto;
  }

  .markdown-body pre code {
    font-family: var(--font-family-mono);
    font-size: var(--font-size-sm);
    background: none;
    padding: 0;
    color: var(--color-text-primary);
  }

  .markdown-body .markdown-error {
    color: var(--color-accent-error);
    padding: var(--spacing-md);
    background-color: rgba(var(--color-accent-error-rgb), 0.1);
    border: 1px solid var(--color-accent-error);
    border-radius: var(--radius-md);
  }

  /* Highlight.js Theme */
  .hljs {
    color: var(--color-text-primary);
  }

  .hljs-comment,
  .hljs-quote {
    color: var(--color-text-muted);
    font-style: italic;
  }

  .hljs-keyword,
  .hljs-selector-tag,
  .hljs-addition {
    color: #c678dd;
  }

  .hljs-number,
  .hljs-string,
  .hljs-meta .hljs-meta-string,
  .hljs-literal,
  .hljs-doctag,
  .hljs-regexp {
    color: #98c379;
  }

  .hljs-title,
  .hljs-section,
  .hljs-name,
  .hljs-selector-id,
  .hljs-selector-class {
    color: #e6c07b;
  }

  .hljs-attribute,
  .hljs-attr,
  .hljs-variable,
  .hljs-template-variable,
  .hljs-class .hljs-title,
  .hljs-type {
    color: #e06c75;
  }

  .hljs-symbol,
  .hljs-bullet,
  .hljs-subst,
  .hljs-meta,
  .hljs-meta .hljs-keyword,
  .hljs-selector-attr,
  .hljs-selector-pseudo,
  .hljs-link {
    color: #56b6c2;
  }

  .hljs-built_in,
  .hljs-deletion {
    color: #e06c75;
  }

  .hljs-formula {
    background-color: var(--color-bg-tertiary);
  }

  .hljs-emphasis {
    font-style: italic;
  }

  .hljs-strong {
    font-weight: bold;
  }

  /* Docs viewer states */
  .docs-viewer {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .docs-viewer .viewer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--color-border, #404040);
    background: var(--color-bg-tertiary, #2d2d2d);
  }

  .docs-viewer .viewer-title {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--color-text-primary, #e5e5e5);
  }

  .docs-viewer .edit-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
    background: var(--color-accent-primary, #3b82f6);
    color: white;
  }

  .docs-viewer .edit-btn:hover {
    opacity: 0.9;
  }

  .docs-viewer .viewer-content {
    flex: 1;
    overflow: auto;
    padding: 1.5rem;
  }

  .docs-viewer .viewer-loading,
  .docs-viewer .viewer-error,
  .docs-viewer .viewer-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    text-align: center;
    padding: var(--spacing-2xl, 2rem);
    color: var(--color-text-secondary, #a3a3a3);
  }

  .docs-viewer .viewer-loading .loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--color-bg-tertiary, #404040);
    border-top-color: var(--color-accent-primary, #3b82f6);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: var(--spacing-md, 1rem);
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .docs-viewer .viewer-loading p {
    margin: 0;
    color: var(--color-text-muted);
  }

  .docs-viewer .viewer-error .error-icon {
    font-size: 3rem;
    margin-bottom: var(--spacing-md, 1rem);
  }

  .docs-viewer .viewer-error h3 {
    margin: 0 0 var(--spacing-sm) 0;
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
  }

  .docs-viewer .viewer-error .retry-btn {
    margin-top: 1rem;
    padding: 0.5rem 1.5rem;
    background: var(--color-accent-primary, #3b82f6);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .docs-viewer .viewer-empty .empty-icon {
    font-size: 4rem;
    margin-bottom: var(--spacing-md, 1rem);
    opacity: 0.5;
  }

  .docs-viewer .empty-document {
    padding: var(--spacing-xl, 1.5rem);
    text-align: center;
    color: var(--color-text-muted);
    font-style: italic;
  }
`;
