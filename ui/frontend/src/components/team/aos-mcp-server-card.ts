import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { McpServerSummary } from '../../../../src/shared/types/team.protocol.js';

@customElement('aos-mcp-server-card')
export class AosMcpServerCard extends LitElement {
  @property({ type: Object }) server!: McpServerSummary;

  override render() {
    return html`
      <div class="mcp-server-card">
        <div class="mcp-server-card__header">
          <h3 class="mcp-server-card__name">${this.server.name}</h3>
          <span class="mcp-server-card__type-badge">${this.server.type}</span>
        </div>
        <div class="mcp-server-card__info">
          <span class="mcp-server-card__command">${this.server.command}</span>
          ${this.server.args.length > 0 ? html`
            <span class="mcp-server-card__args">${this.server.args.join(' ')}</span>
          ` : ''}
        </div>
      </div>
    `;
  }

  protected override createRenderRoot() {
    return this;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-mcp-server-card': AosMcpServerCard;
  }
}
