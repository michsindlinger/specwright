import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

interface ActionCard {
  command: string;
  title: string;
  description: string;
  icon: ReturnType<typeof html>;
}

@customElement('aos-getting-started-view')
export class AosGettingStartedView extends LitElement {
  @property({ type: Boolean }) hasProductBrief = false;
  @property({ type: Boolean }) hasSpecwright = true;

  private get standardCards(): ActionCard[] {
    return [
      {
        command: 'create-spec',
        title: 'Create Spec',
        description: 'Erstelle eine Feature-Spezifikation mit Stories, Akzeptanzkriterien und technischem Refinement.',
        icon: html`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>`,
      },
      {
        command: 'add-todo',
        title: 'Add Todo',
        description: 'Fuege eine schnelle Aufgabe zum Backlog hinzu - ideal fuer kleine Tasks und Verbesserungen.',
        icon: html`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M9 14l2 2 4-4"/></svg>`,
      },
      {
        command: 'add-bug',
        title: 'Add Bug',
        description: 'Erfasse einen Bug mit automatischer Root-Cause-Analyse und Reproduktionsschritten.',
        icon: html`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="6" width="8" height="14" rx="4"/><path d="M19 10h-2"/><path d="M7 10H5"/><path d="M19 14h-2"/><path d="M7 14H5"/><path d="M10 2l1 4"/><path d="M14 2l-1 4"/><path d="M19 18h-2"/><path d="M7 18H5"/></svg>`,
      },
    ];
  }

  private get planningCards(): ActionCard[] {
    return [
      {
        command: 'plan-product',
        title: 'Plan Product',
        description: 'Plane ein einzelnes Produkt oder Projekt von der Vision bis zum Backlog.',
        icon: html`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
      },
      {
        command: 'plan-platform',
        title: 'Plan Platform',
        description: 'Plane eine Multi-Modul-Plattform mit mehreren Services und Komponenten.',
        icon: html`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="8" height="8" rx="2"/><rect x="14" y="2" width="8" height="8" rx="2"/><rect x="2" y="14" width="8" height="8" rx="2"/><rect x="14" y="14" width="8" height="8" rx="2"/></svg>`,
      },
      {
        command: 'analyze-product',
        title: 'Analyze Product',
        description: 'Analysiere ein bestehendes Produkt und integriere Specwright in den Workflow.',
        icon: html`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>`,
      },
      {
        command: 'analyze-platform',
        title: 'Analyze Platform',
        description: 'Analysiere eine bestehende Plattform und erstelle einen Specwright-Integrationsplan.',
        icon: html`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
      },
    ];
  }

  private handleCardClick(command: string): void {
    this.dispatchEvent(
      new CustomEvent('workflow-start-interactive', {
        detail: { commandId: command },
        bubbles: true,
        composed: true,
      })
    );
  }

  override render() {
    return html`
      <div class="getting-started-container">
        <div class="getting-started-header">
          <h2 class="getting-started-title">Getting Started</h2>
          <p class="getting-started-subtitle">
            ${!this.hasSpecwright
              ? 'Specwright muss zuerst installiert werden, bevor du beginnen kannst.'
              : this.hasProductBrief
                ? 'Waehle eine Aktion um mit der Entwicklung zu beginnen.'
                : 'Dein Projekt hat noch keinen Product Brief. Starte mit der Planung.'}
          </p>
        </div>

        ${!this.hasSpecwright
          ? this.renderNotInstalledState()
          : this.hasProductBrief
            ? this.renderStandardCards()
            : this.renderPlanningCards()}
      </div>
    `;
  }

  private renderNotInstalledState() {
    return html`
      <div class="getting-started-hint">
        <div class="getting-started-hint__icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
        <div class="getting-started-hint__content">
          <p class="getting-started-hint__title">Specwright nicht installiert</p>
          <p class="getting-started-hint__description">
            Dieses Projekt hat noch kein Specwright-Setup. Fuege das Projekt ueber die Sidebar hinzu,
            um den Installations-Wizard zu starten.
          </p>
        </div>
      </div>

      <div class="getting-started-cards getting-started-cards--disabled">
        ${this.standardCards.map(card => this.renderCard(card, true))}
      </div>
    `;
  }

  private renderPlanningCards() {
    return html`
      <div class="getting-started-hint getting-started-hint--info">
        <div class="getting-started-hint__icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        </div>
        <div class="getting-started-hint__content">
          <p class="getting-started-hint__title">Product Brief fehlt</p>
          <p class="getting-started-hint__description">
            Erstelle zuerst einen Product Brief, um die Produktvision und den Scope zu definieren.
            Danach kannst du Features planen und umsetzen.
          </p>
        </div>
      </div>

      <div class="getting-started-cards">
        ${this.planningCards.map(card => this.renderCard(card, false))}
      </div>
    `;
  }

  private renderStandardCards() {
    return html`
      <div class="getting-started-cards">
        ${this.standardCards.map(card => this.renderCard(card, false))}
      </div>
    `;
  }

  private renderCard(card: ActionCard, disabled: boolean) {
    return html`
      <button
        class="getting-started-card ${disabled ? 'getting-started-card--disabled' : ''}"
        ?disabled=${disabled}
        @click=${() => !disabled && this.handleCardClick(card.command)}
      >
        <div class="getting-started-card__icon">
          ${card.icon}
        </div>
        <h3 class="getting-started-card__title">${card.title}</h3>
        <p class="getting-started-card__description">${card.description}</p>
      </button>
    `;
  }

  protected override createRenderRoot() {
    return this;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-getting-started-view': AosGettingStartedView;
  }
}
