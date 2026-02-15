import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

export type StoryStatus = 'backlog' | 'blocked' | 'in-progress' | 'in-review' | 'done' | 'working' | 'error' | 'unknown';

/**
 * Story Status Badge Component
 *
 * Visual indicators for story status:
 * - Green (Ready): All DoR checkboxes marked
 * - Red (Blocked): Some DoR checkboxes unchecked
 * - Blue (In Progress): Story is being actively worked on
 * - Gray (Done): Story completed
 * - Gray (Unknown): Status cannot be determined
 */
@customElement('aos-story-status-badge')
export class AosStoryStatusBadge extends LitElement {
  @property({ type: String })
  status: StoryStatus = 'unknown';

  @property({ type: Boolean })
  dorComplete: boolean = true;

  @property({ type: String })
  errorMessage: string = '';

  private getStatusConfig(): { text: string; className: string; tooltip: string } {
    // Priority: workflow status (working, error) > in-review > in-progress > done > DoR status (ready, blocked)
    if (this.status === 'working') {
      return { text: 'Working', className: 'status-working', tooltip: 'Workflow executing...' };
    }
    if (this.status === 'error') {
      return { text: 'Error', className: 'status-error', tooltip: this.errorMessage || 'Workflow failed' };
    }
    if (this.status === 'in-review') {
      return { text: 'In Review', className: 'status-in-review', tooltip: 'Story pending review approval' };
    }
    if (this.status === 'done') {
      return { text: 'Done', className: 'status-done', tooltip: 'Story completed' };
    }
    if (this.status === 'in-progress') {
      return { text: 'In Progress', className: 'status-in-progress', tooltip: 'Story is being worked on' };
    }
    if (this.status === 'blocked') {
      return { text: 'Blocked', className: 'status-blocked', tooltip: 'Blocked - waiting for resolution' };
    }
    if (this.status === 'backlog') {
      // For backlog items, show DoR status
      if (this.dorComplete) {
        return { text: 'Ready', className: 'status-ready', tooltip: 'Ready for execution - all DoR met' };
      }
      return { text: 'Blocked', className: 'status-blocked', tooltip: 'Blocked - incomplete DoR' };
    }
    // Unknown status
    return { text: 'Unknown', className: 'status-unknown', tooltip: 'Status unknown' };
  }

  private getIcon(): string {
    const config = this.getStatusConfig();
    switch (config.className) {
      case 'status-ready':
        return '●';
      case 'status-blocked':
        return '●';
      case 'status-in-progress':
        return '●';
      case 'status-in-review':
        return '◐'; // Half-filled circle for review state
      case 'status-working':
        return '◐'; // Half-filled circle for working state
      case 'status-error':
        return '✕';
      case 'status-done':
        return '✓';
      default:
        return '○';
    }
  }

  override render() {
    const config = this.getStatusConfig();
    const icon = this.getIcon();

    return html`
      <span
        class="story-status-badge ${config.className}"
        title="${config.tooltip}"
      >
        <span class="status-indicator">${icon}</span>
        <span class="status-text">${config.text}</span>
      </span>
    `;
  }

  protected override createRenderRoot() {
    return this;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-story-status-badge': AosStoryStatusBadge;
  }
}
