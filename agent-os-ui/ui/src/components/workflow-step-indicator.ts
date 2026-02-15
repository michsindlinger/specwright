import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

export type StepIndicatorStatus = 'running' | 'completed' | 'error' | 'processing';

@customElement('aos-workflow-step-indicator')
export class AosWorkflowStepIndicator extends LitElement {
  @property({ type: Number })
  currentStep = 0;

  @property({ type: Number })
  totalSteps = 0;

  @property({ type: String })
  stepName = '';

  @property({ type: String })
  status: StepIndicatorStatus = 'processing';

  private getStatusIcon(): string {
    switch (this.status) {
      case 'running':
        return '⚡';
      case 'completed':
        return '✓';
      case 'error':
        return '✕';
      case 'processing':
      default:
        return '•';
    }
  }

  override render() {
    const hasStepInfo = this.currentStep > 0 && this.totalSteps > 0;

    return html`
      <div class="step-indicator">
        <span class="step-indicator-icon">${this.getStatusIcon()}</span>
        ${hasStepInfo
          ? html`
              <span class="step-indicator-progress">
                Step ${this.currentStep}/${this.totalSteps}${this.stepName ? ':' : ''}
              </span>
              ${this.stepName
                ? html`<span class="step-indicator-name">${this.stepName}</span>`
                : ''}
            `
          : html`
              <span class="step-indicator-processing">
                ${this.status === 'completed' ? 'Completed' : 'Processing...'}
              </span>
            `}
        ${this.status === 'processing' && !hasStepInfo
          ? html`<span class="step-indicator-spinner"></span>`
          : ''}
        ${this.status === 'completed'
          ? html`<span class="step-indicator-success">✓</span>`
          : ''}
      </div>
    `;
  }

  protected override createRenderRoot() {
    return this;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-workflow-step-indicator': AosWorkflowStepIndicator;
  }
}
