import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { gateway, type WebSocketMessage } from '../../gateway.js';

type ReviewerStatus = 'running' | 'fulfilled' | 'rejected';

interface ReviewerBlock {
  reviewerId: string;
  status: ReviewerStatus;
  output?: string;
  error?: string;
}

type ReviewState = 'idle' | 'running' | 'done' | 'error';

/** Human-readable labels for the aggregator fallback reasons (see FallbackReason
 *  in plan-review.protocol.ts). Kept local — the frontend/backend type boundary
 *  is duplicated by convention in this codebase (cf. ReviewerConfig). */
const FALLBACK_LABELS: Record<string, string> = {
  'single-reviewer': 'only one reviewer succeeded',
  'llm-error': 'aggregator model call failed',
  'empty-output': 'aggregator returned nothing',
  'parse-error': 'model returned invalid JSON',
  'schema-invalid': "model output didn't match the expected structure",
};

@customElement('aos-plan-review-block')
export class AosPlanReviewBlock extends LitElement {
  @property({ type: String }) sessionId = '';

  @state() private reviewState: ReviewState = 'idle';
  @state() private reviewers: Map<string, ReviewerBlock> = new Map();
  @state() private injected = false;
  /** From plan-review:injected — false: typed without reading the screen back (prompt, or a dialog without a tmux screen). */
  @state() private injectVerified: boolean | null = null;
  @state() private errorMessage = '';
  @state() private source: 'auto' | 'manual' = 'auto';
  @state() private expanded = true;
  @state() private expandedReviewers: Set<string> = new Set();
  @state() private clusteringFallback: string | null = null;

  private boundHandlers: Map<string, (msg: WebSocketMessage) => void> = new Map();

  static override styles = css`
    :host {
      display: block;
      font-size: 12px;
      font-family: var(--font-family-mono, monospace);
    }

    .review-block {
      border-top: 1px solid var(--border-color, #404040);
      background: var(--bg-color-tertiary, #1a1a2e);
    }

    .review-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      cursor: pointer;
      user-select: none;
      color: var(--text-color-secondary, #a0a0a0);
    }

    .review-header:hover {
      background: rgba(255, 255, 255, 0.04);
    }

    .chevron {
      width: 12px;
      height: 12px;
      flex-shrink: 0;
      transition: transform 0.15s ease;
    }

    .chevron.open {
      transform: rotate(90deg);
    }

    .review-title {
      flex: 1;
      color: var(--text-color-primary, #e0e0e0);
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 1px 6px;
      border-radius: 10px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .badge-running {
      background: rgba(255, 152, 0, 0.2);
      color: #ff9800;
    }

    .badge-done {
      background: rgba(76, 175, 80, 0.2);
      color: #4caf50;
    }

    .badge-error {
      background: rgba(244, 67, 54, 0.2);
      color: #f44336;
    }

    .status-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: currentColor;
    }

    .badge-running .status-dot {
      animation: pulse 1s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }

    .inject-label {
      font-size: 10px;
      color: #4caf50;
    }

    .review-body {
      padding: 0 12px 8px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .error-line {
      padding: 4px 0;
      color: #f44336;
      font-size: 11px;
    }

    .fallback-line {
      padding: 4px 0;
      color: var(--text-color-secondary, #a0a0a0);
      font-size: 11px;
      font-style: italic;
    }

    .reviewer-block {
      border: 1px solid var(--border-color, #404040);
      border-radius: 4px;
      overflow: hidden;
    }

    .reviewer-header {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      cursor: pointer;
      background: rgba(255, 255, 255, 0.03);
      user-select: none;
    }

    .reviewer-header:hover {
      background: rgba(255, 255, 255, 0.06);
    }

    .reviewer-id {
      flex: 1;
      font-size: 11px;
      color: var(--text-color-secondary, #a0a0a0);
    }

    .reviewer-output {
      padding: 6px 8px;
      color: var(--text-color-primary, #e0e0e0);
      font-size: 11px;
      white-space: pre-wrap;
      word-break: break-word;
      border-top: 1px solid var(--border-color, #404040);
      max-height: 200px;
      overflow-y: auto;
      background: rgba(0, 0, 0, 0.2);
    }

    .reviewer-output.error-text {
      color: #f44336;
    }
  `;

  override connectedCallback(): void {
    super.connectedCallback();
    this.setupHandlers();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeHandlers();
  }

  private setupHandlers(): void {
    const handlers: Array<[string, (msg: WebSocketMessage) => void]> = [
      ['plan-review:started', (msg) => this.onStarted(msg)],
      ['plan-review:reviewer.result', (msg) => this.onReviewerResult(msg)],
      ['plan-review:aggregated', (msg) => this.onAggregated(msg)],
      ['plan-review:injected', (msg) => this.onInjected(msg)],
      ['plan-review:error', (msg) => this.onError(msg)],
    ];
    for (const [type, handler] of handlers) {
      this.boundHandlers.set(type, handler);
      gateway.on(type, handler);
    }
  }

  private removeHandlers(): void {
    for (const [type, handler] of this.boundHandlers) {
      gateway.off(type, handler);
    }
    this.boundHandlers.clear();
  }

  private matchesSession(msg: WebSocketMessage): boolean {
    return !this.sessionId || msg.sessionId === this.sessionId;
  }

  private onStarted(msg: WebSocketMessage): void {
    if (!this.matchesSession(msg)) return;
    this.reviewers = new Map();
    this.injected = false;
    this.injectVerified = null;
    this.errorMessage = '';
    this.source = (msg.source as 'auto' | 'manual') ?? 'auto';
    this.reviewState = 'running';
    this.expanded = true;
    this.expandedReviewers = new Set();
    this.clusteringFallback = null;
  }

  private onAggregated(msg: WebSocketMessage): void {
    if (!this.matchesSession(msg)) return;
    this.clusteringFallback = (msg.fallbackReason as string | undefined) ?? null;
  }

  private onReviewerResult(msg: WebSocketMessage): void {
    if (!this.matchesSession(msg)) return;
    const reviewerId = msg.reviewerId as string;
    const updated = new Map(this.reviewers);
    updated.set(reviewerId, {
      reviewerId,
      status: msg.status as ReviewerStatus,
      output: msg.output as string | undefined,
      error: msg.error as string | undefined,
    });
    this.reviewers = updated;
  }

  private onInjected(msg: WebSocketMessage): void {
    if (!this.matchesSession(msg)) return;
    this.injected = true;
    this.injectVerified = typeof msg.verified === 'boolean' ? msg.verified : null;
    this.reviewState = 'done';
  }

  private onError(msg: WebSocketMessage): void {
    if (!this.matchesSession(msg)) return;
    this.errorMessage = (msg.message as string) ?? 'Review failed';
    this.reviewState = 'error';
  }

  private toggleExpanded(): void {
    this.expanded = !this.expanded;
  }

  private toggleReviewer(reviewerId: string): void {
    const updated = new Set(this.expandedReviewers);
    if (updated.has(reviewerId)) {
      updated.delete(reviewerId);
    } else {
      updated.add(reviewerId);
    }
    this.expandedReviewers = updated;
  }

  private renderStatusBadge() {
    switch (this.reviewState) {
      case 'running':
        return html`<span class="badge badge-running"><span class="status-dot"></span>Running</span>`;
      case 'done':
        return html`<span class="badge badge-done"><span class="status-dot"></span>Done</span>`;
      case 'error':
        return html`<span class="badge badge-error"><span class="status-dot"></span>Error</span>`;
      default:
        return nothing;
    }
  }

  private renderReviewerBadge(status: ReviewerStatus) {
    switch (status) {
      case 'running':
        return html`<span class="badge badge-running"><span class="status-dot"></span></span>`;
      case 'fulfilled':
        return html`<span class="badge badge-done"><span class="status-dot"></span></span>`;
      case 'rejected':
        return html`<span class="badge badge-error"><span class="status-dot"></span></span>`;
    }
  }

  private renderReviewerBlock(block: ReviewerBlock) {
    const isOpen = this.expandedReviewers.has(block.reviewerId);
    const showOutput = isOpen && block.status === 'fulfilled' && block.output;
    const showError = isOpen && block.status === 'rejected' && block.error;

    return html`
      <div class="reviewer-block">
        <div class="reviewer-header" @click=${() => this.toggleReviewer(block.reviewerId)}>
          <svg class="chevron ${isOpen ? 'open' : ''}" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3,2 9,6 3,10"></polyline>
          </svg>
          <span class="reviewer-id">${block.reviewerId}</span>
          ${this.renderReviewerBadge(block.status)}
        </div>
        ${showOutput
          ? html`<div class="reviewer-output">${block.output}</div>`
          : nothing}
        ${showError
          ? html`<div class="reviewer-output error-text">${block.error}</div>`
          : nothing}
      </div>
    `;
  }

  override render() {
    if (this.reviewState === 'idle') {
      return nothing;
    }

    return html`
      <div class="review-block">
        <div class="review-header" @click=${this.toggleExpanded}>
          <svg class="chevron ${this.expanded ? 'open' : ''}" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3,2 9,6 3,10"></polyline>
          </svg>
          <span class="review-title">Plan Review${this.source === 'manual' ? ' (manual)' : ''}</span>
          ${this.renderStatusBadge()}
          ${this.injected ? html`<span class="inject-label">✓ injected</span>` : nothing}
        </div>
        ${this.expanded ? html`
          <div class="review-body">
            ${this.errorMessage
              ? html`<div class="error-line">${this.errorMessage}</div>`
              : nothing}
            ${this.clusteringFallback
              ? html`<div class="fallback-line">Consensus clustering unavailable (${FALLBACK_LABELS[this.clusteringFallback] ?? this.clusteringFallback}) — showing individual reviews</div>`
              : nothing}
            ${this.injected && this.injectVerified === false
              ? html`<div class="fallback-line">Inserted without a check — the screen could not be read back</div>`
              : nothing}
            ${[...this.reviewers.values()].map((b) => this.renderReviewerBlock(b))}
          </div>
        ` : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-plan-review-block': AosPlanReviewBlock;
  }
}
