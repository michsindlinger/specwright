import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('aos-not-found-view')
export class AosNotFoundView extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }

    .not-found {
      background-color: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: var(--spacing-2xl);
      text-align: center;
    }

    h3 {
      color: var(--color-text-primary);
      font-size: var(--font-size-3xl);
      margin-bottom: var(--spacing-md);
    }

    p {
      color: var(--color-text-secondary);
      margin-bottom: var(--spacing-lg);
    }

    .back-link {
      display: inline-block;
      padding: var(--spacing-sm) var(--spacing-lg);
      background-color: var(--color-accent-primary);
      color: var(--color-bg-primary);
      border-radius: var(--radius-md);
      text-decoration: none;
      font-weight: var(--font-weight-medium);
      transition: opacity var(--transition-fast);
    }

    .back-link:hover {
      opacity: 0.9;
      color: var(--color-bg-primary);
    }
  `;

  override render() {
    return html`
      <div class="not-found">
        <h3>404</h3>
        <p>The page you're looking for doesn't exist.</p>
        <a href="#/dashboard" class="back-link">Back to Dashboard</a>
      </div>
    `;
  }

  protected override createRenderRoot() {
    return this;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-not-found-view': AosNotFoundView;
  }
}
