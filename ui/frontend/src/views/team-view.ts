import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('aos-team-view')
export class AosTeamView extends LitElement {
  override render() {
    return html`
      <div class="team-view">
        <p style="color: var(--color-text-secondary);">Team view loading...</p>
      </div>
    `;
  }

  protected override createRenderRoot() {
    return this;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-team-view': AosTeamView;
  }
}
