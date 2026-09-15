/**
 * Mermaid rendering shared by the chat messages and the Vorhaben document
 * reader (INT-2026-004). Extracted from chat-message.ts unchanged: theme
 * initialisation follows the app theme, diagrams are rendered into the
 * `.mermaid-container` markup that markdown-renderer.ts emits, and a failing
 * diagram falls back to its source with a notice.
 */

import mermaid from 'mermaid';
import { themeService, type ResolvedTheme } from '../services/theme.service.js';

export function initializeMermaidTheme(theme: ResolvedTheme): void {
  if (theme === 'dark') {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'strict',
      fontFamily: 'var(--font-family-mono)',
      themeVariables: {
        primaryColor: '#00D4FF',
        primaryTextColor: '#B8C9DB',
        primaryBorderColor: '#2A4A6A',
        lineColor: '#7A92A9',
        secondaryColor: '#1E3A5F',
        tertiaryColor: '#0F1F33',
        background: '#142840',
        mainBkg: '#1E3A5F',
        nodeBorder: '#2A4A6A',
        clusterBkg: '#142840',
        clusterBorder: '#2A4A6A',
        titleColor: '#ffffff',
        edgeLabelBackground: '#1E3A5F',
      }
    });
  } else if (theme === 'black') {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'strict',
      fontFamily: 'var(--font-family-mono)',
      themeVariables: {
        primaryColor: '#3b82f6',
        primaryTextColor: '#e5e5e5',
        primaryBorderColor: '#404040',
        lineColor: '#737373',
        secondaryColor: '#262626',
        tertiaryColor: '#171717',
        background: '#1a1a1a',
        mainBkg: '#262626',
        nodeBorder: '#525252',
        clusterBkg: '#1a1a1a',
        clusterBorder: '#404040',
        titleColor: '#e5e5e5',
        edgeLabelBackground: '#262626',
      }
    });
  } else {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'strict',
      fontFamily: 'var(--font-family-mono)',
      themeVariables: {
        primaryColor: '#1E3A5F',
        primaryTextColor: '#1e293b',
        primaryBorderColor: '#E8E0D8',
        lineColor: '#64748b',
        secondaryColor: '#FFF8F3',
        tertiaryColor: '#FFFBF7',
        background: '#FFFFFF',
        mainBkg: '#FFF8F3',
        nodeBorder: '#E8E0D8',
        clusterBkg: '#FFFFFF',
        clusterBorder: '#E8E0D8',
        titleColor: '#1e293b',
        edgeLabelBackground: '#FFFFFF',
      }
    });
  }
}

// Initialize with current theme, follow theme changes.
initializeMermaidTheme(themeService.getResolvedTheme());
themeService.onChange((theme) => initializeMermaidTheme(theme));

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/** Renders every not-yet-rendered `.mermaid-container` below `root`. */
export async function renderMermaidDiagrams(root: ParentNode): Promise<void> {
  const containers = root.querySelectorAll('.mermaid-container[data-mermaid]');

  for (const container of containers) {
    const diagramDiv = container.querySelector('.mermaid-diagram') as HTMLElement | null;
    const fallbackDiv = container.querySelector('.mermaid-fallback') as HTMLElement | null;

    // Skip if already rendered (has SVG child)
    if (diagramDiv?.querySelector('svg')) {
      continue;
    }

    const mermaidCode = container.getAttribute('data-mermaid');
    const mermaidId = container.getAttribute('data-mermaid-id');

    if (!mermaidCode || !diagramDiv || !mermaidId) {
      continue;
    }

    try {
      // Render the mermaid diagram
      const { svg } = await mermaid.render(mermaidId, mermaidCode);
      diagramDiv.innerHTML = svg;

      // Hide fallback on success
      if (fallbackDiv) {
        fallbackDiv.style.display = 'none';
      }
    } catch (error) {
      console.error('Mermaid rendering error:', error);

      // Show fallback with error message
      if (fallbackDiv) {
        const errorMessage = error instanceof Error ? error.message : 'Invalid mermaid syntax';
        fallbackDiv.innerHTML = `
          <div class="mermaid-error">
            <span class="mermaid-error-icon">⚠️</span>
            <span class="mermaid-error-text">Diagram rendering failed: ${escapeHtml(errorMessage)}</span>
          </div>
          <pre><code class="language-mermaid">${escapeHtml(mermaidCode)}</code></pre>
        `;
        fallbackDiv.style.display = 'block';
      }

      // Hide the diagram container
      diagramDiv.style.display = 'none';
    }
  }
}
