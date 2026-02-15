import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  output?: string;
  status: 'pending' | 'running' | 'complete' | 'error';
}

@customElement('aos-tool-call-badge')
export class AosToolCallBadge extends LitElement {
  @property({ type: Object }) toolCall!: ToolCall;
  @state() private expanded = false;

  override render() {
    const statusClass = `tool-badge ${this.toolCall.status}`;

    return html`
      <div class="tool-call-container">
        <button
          class="${statusClass}"
          @click=${this.toggleExpanded}
          aria-expanded="${this.expanded}"
        >
          <span class="tool-icon">${this.getToolIcon()}</span>
          <span class="tool-name">${this.toolCall.name}</span>
          <span class="tool-input">${this.getToolInputSummary()}</span>
          <span class="tool-status">${this.getStatusIcon()}</span>
          <span class="expand-icon">${this.expanded ? '▼' : '▶'}</span>
        </button>

        ${this.expanded
          ? html`
              <div class="tool-details">
                <div class="tool-section">
                  <div class="section-label">Input</div>
                  <pre class="tool-json">${JSON.stringify(this.toolCall.input, null, 2)}</pre>
                </div>

                ${this.toolCall.output
                  ? html`
                      <div class="tool-section">
                        <div class="section-label">Output</div>
                        <pre class="tool-output">${this.toolCall.output}</pre>
                      </div>
                    `
                  : ''}
              </div>
            `
          : ''}
      </div>
    `;
  }

  private toggleExpanded(): void {
    this.expanded = !this.expanded;
  }

  private getToolIcon(): string {
    const icons: Record<string, string> = {
      Read: '📄',
      Write: '✏️',
      Edit: '🔧',
      Bash: '💻',
      Glob: '🔍',
      Grep: '🔎',
      WebFetch: '🌐',
      WebSearch: '🔍',
      default: '🔧'
    };
    return icons[this.toolCall.name] || icons.default;
  }

  private getToolInputSummary(): string {
    const input = this.toolCall.input;

    // Common patterns for tool inputs
    if (input.file_path) {
      return String(input.file_path);
    }
    if (input.command) {
      const cmd = String(input.command);
      return cmd.length > 50 ? cmd.substring(0, 47) + '...' : cmd;
    }
    if (input.pattern) {
      return String(input.pattern);
    }
    if (input.url) {
      return String(input.url);
    }
    if (input.query) {
      return String(input.query);
    }

    // Fallback to first key's value
    const firstKey = Object.keys(input)[0];
    if (firstKey) {
      const value = String(input[firstKey]);
      return value.length > 50 ? value.substring(0, 47) + '...' : value;
    }

    return '';
  }

  private getStatusIcon(): string {
    switch (this.toolCall.status) {
      case 'pending':
        return '⏳';
      case 'running':
        return '⚙️';
      case 'complete':
        return '✓';
      case 'error':
        return '✗';
      default:
        return '';
    }
  }

  protected override createRenderRoot() {
    return this;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-tool-call-badge': AosToolCallBadge;
  }
}
