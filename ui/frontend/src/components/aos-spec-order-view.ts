import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { SpecInfo } from './spec-card.js';

const CIRCLED = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳';

function circled(n: number): string {
  if (n >= 1 && n <= 20) return CIRCLED[n - 1];
  return `#${n}`;
}

/**
 * SPD-006: Topological order view — third view mode alongside grid/list.
 * Shows active specs numbered by recommended execution order, with
 * "wartet auf"/"ermöglicht" dependency hints and a cycle warning banner.
 */
@customElement('aos-spec-order-view')
export class AosSpecOrderView extends LitElement {
  @property({ type: Array }) specs: SpecInfo[] = [];

  private handleSpecClick(specId: string): void {
    this.dispatchEvent(new CustomEvent('spec-select', {
      detail: { specId },
      bubbles: true,
      composed: true,
    }));
  }

  override render() {
    const idToSpec = new Map(this.specs.map(s => [s.id, s]));

    const orderedSpecs = [...this.specs]
      .filter(s => s.orderIndex != null)
      .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

    // Active specs without orderIndex are cyclic (computeRecommendedOrder excludes them)
    const cyclicSpecs = this.specs.filter(s => s.orderIndex == null);

    return html`
      <div class="spec-order-view">
        ${cyclicSpecs.length > 0 ? html`
          <div class="spec-order-view__cycle-banner" role="alert">
            <span class="spec-order-view__cycle-icon">⚠</span>
            <span>Zyklus erkannt — ${cyclicSpecs.length} Spec${cyclicSpecs.length !== 1 ? 's' : ''} können nicht eingeordnet werden. Bitte Abhängigkeiten prüfen.</span>
          </div>
        ` : ''}

        <div class="spec-order-list">
          ${orderedSpecs.length === 0 ? html`
            <p class="spec-order-empty">
              Keine Reihenfolge verfügbar. Füge Abhängigkeiten hinzu, um eine empfohlene Abarbeitungsreihenfolge zu generieren.
            </p>
          ` : orderedSpecs.map(spec => this._renderOrderRow(spec, orderedSpecs, idToSpec))}
        </div>

        ${cyclicSpecs.length > 0 ? html`
          <div class="spec-order-unordered">
            <h4 class="spec-order-unordered__title">⚠ noch nicht eingeordnet</h4>
            <div class="spec-order-unordered__list">
              ${cyclicSpecs.map(spec => html`
                <div
                  class="spec-order-unordered__item"
                  @click=${() => this.handleSpecClick(spec.id)}
                  title="${spec.name}"
                >
                  <span class="spec-order-unordered__name">${spec.name}</span>
                  <span class="spec-order-unordered__reason">Zyklus</span>
                </div>
              `)}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  private _renderOrderRow(
    spec: SpecInfo,
    orderedSpecs: SpecInfo[],
    idToSpec: Map<string, SpecInfo>
  ) {
    const index = spec.orderIndex!;
    const isBlocked = spec.dependencyStatus === 'blocked';

    // "wartet auf" = blockedBy specs that have an orderIndex (active, non-cyclic)
    const blockedBySpecs = (spec.blockedBy ?? [])
      .map(id => idToSpec.get(id))
      .filter((s): s is SpecInfo => s != null && s.orderIndex != null);

    // "ermöglicht" = ordered specs that list this spec in their blockedBy
    const enablesSpecs = orderedSpecs.filter(s =>
      s.id !== spec.id && (s.blockedBy ?? []).includes(spec.id)
    );

    const hasRelations = blockedBySpecs.length > 0 || enablesSpecs.length > 0;

    return html`
      <div
        class="order-row${isBlocked ? ' order-row--blocked' : ''}"
        @click=${() => this.handleSpecClick(spec.id)}
        title="Spec öffnen: ${spec.name}"
      >
        <span class="order-row__index" aria-label="Position ${index}">${circled(index)}</span>
        <div class="order-row__body">
          <div class="order-row__head">
            <span class="order-row__name">${spec.name}</span>
            <span class="order-row__badges">
              ${spec.priority != null ? html`
                <span class="order-row__priority order-row__priority--${spec.priority.toLowerCase()}">${spec.priority}</span>
              ` : ''}
              ${isBlocked ? html`<span class="order-row__blocked-pill" title="Blockiert durch offene Vorgänger">🔒</span>` : ''}
            </span>
          </div>
          ${hasRelations ? html`
            <div class="order-row__relations">
              ${blockedBySpecs.length > 0 ? html`
                <span class="order-relation order-relation--waits">
                  wartet auf
                  ${blockedBySpecs.map(s => html`<span class="order-relation__ref">${circled(s.orderIndex!)}</span>`)}
                </span>
              ` : ''}
              ${enablesSpecs.length > 0 ? html`
                <span class="order-relation order-relation--enables">
                  ermöglicht
                  ${enablesSpecs.map(s => html`<span class="order-relation__ref">${circled(s.orderIndex!)}</span>`)}
                </span>
              ` : ''}
            </div>
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
    'aos-spec-order-view': AosSpecOrderView;
  }
}
