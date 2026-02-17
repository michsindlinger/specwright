import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import { gateway, WebSocketMessage } from '../gateway.js';
import './story-card.js';
import './chat/aos-spec-chat.js';
import './git-strategy-dialog.js';
import './auto-mode-error-modal.js';
import './docs/aos-docs-viewer.js';
import './specs/aos-spec-file-tabs.js';
import './attachments/aos-attachment-panel.js';
import { buildSpecFilePath, copyPathToClipboard } from '../utils/copy-path.js';
import { markdownStyles } from '../styles/markdown-styles.js';
import type { SpecFileGroup } from './specs/aos-spec-file-tabs.js';
import type { GitStrategy, GitStrategySelection } from './git-strategy-dialog.js';
import type { AutoModeError } from './auto-mode-error-modal.js';
import type { ModelSelection, ProviderInfo, StoryInfo } from './story-card.js';
import type { ChatMessageData } from './chat-message.js';

// Re-export StoryInfo for consumers that import from kanban-board
export type { StoryInfo } from './story-card.js';

export type WorkflowStatus = 'idle' | 'working' | 'success' | 'error';

// KAE-003: Auto-mode progress tracking interface
export interface AutoModeProgress {
  storyId: string;
  storyTitle: string;
  currentPhase: number;
  totalPhases: number;
}

export interface KanbanBoard {
  specId: string;
  stories: StoryInfo[];
  hasKanbanFile: boolean;
}

export type KanbanStatus = 'backlog' | 'in_progress' | 'in_review' | 'done' | 'blocked';

export interface MoveValidation {
  valid: boolean;
  reason?: string;
}

/**
 * Validates whether a story can be moved to "in_progress" status.
 * Checks: DoR completion and dependencies.
 */
export function canMoveToInProgress(story: StoryInfo, allStories: StoryInfo[], fromInReview = false): MoveValidation {
  // Skip DoR and dependency checks when story is being rejected from in_review
  if (fromInReview) {
    return { valid: true };
  }

  // Check if DoR is complete
  if (!story.dorComplete) {
    return {
      valid: false,
      reason: 'Story kann nicht gestartet werden: DoR nicht vollständig'
    };
  }

  // Check if all dependencies are done or in_review (batch-review workflow)
  if (story.dependencies && story.dependencies.length > 0) {
    const pendingDependencies = story.dependencies.filter(depId => {
      const depStory = allStories.find(s => s.id === depId);
      return !depStory || (depStory.status !== 'done' && depStory.status !== 'in_review');
    });

    if (pendingDependencies.length > 0) {
      return {
        valid: false,
        reason: `Abhängige Stories noch nicht abgeschlossen: ${pendingDependencies.join(', ')}`
      };
    }
  }

  return { valid: true };
}

export interface WorkflowState {
  status: WorkflowStatus;
  error?: string;
}

// Default fallback providers (used until backend responds)
const DEFAULT_PROVIDERS: ProviderInfo[] = [
  {
    id: 'anthropic',
    name: 'Anthropic',
    models: [
      { id: 'opus', name: 'Opus 4.5', providerId: 'anthropic' },
      { id: 'sonnet', name: 'Sonnet 4', providerId: 'anthropic' },
      { id: 'haiku', name: 'Haiku 3.5', providerId: 'anthropic' },
    ],
  },
  {
    id: 'glm',
    name: 'GLM',
    models: [
      { id: 'glm-5', name: 'GLM 5', providerId: 'glm' },
    ],
  },
  {
    id: 'gemini',
    name: 'Gemini',
    models: [
      { id: 'google/gemini-3-flash-preview', name: 'Gemini 3 Flash', providerId: 'gemini' },
      { id: 'google/gemini-3-pro-preview', name: 'Gemini 3 Pro', providerId: 'gemini' },
    ],
  },
  {
    id: 'kimi-kw',
    name: 'KIMI K2',
    models: [
      { id: 'kimi-k2.5', name: 'Kimi K2.5', providerId: 'kimi-kw' },
    ],
  },
];

// UKB-002: Kanban board mode type
export type KanbanMode = 'spec' | 'backlog';

@customElement('aos-kanban-board')
export class AosKanbanBoard extends LitElement {
  @property({ type: Object }) kanban!: KanbanBoard;
  @property({ type: String }) specName = '';
  // UKB-002: Mode property for spec/backlog differentiation
  @property({ type: String }) mode: KanbanMode = 'spec';
  // UKB-002: Feature flags for conditional rendering
  @property({ type: Boolean }) showChat = true;
  @property({ type: Boolean }) showSpecViewer = true;
  @property({ type: Boolean }) showGitStrategy = true;
  @property({ type: Boolean }) showAutoMode = true;
  @state() private draggedStoryId: string | null = null;
  @state() private dropZoneActive: KanbanStatus | null = null;
  @state() private dropValidation: MoveValidation = { valid: true };
  @state() private workflowStates: Map<string, WorkflowState> = new Map();
  @state() private showGitStrategyDialog = false;
  @state() private pendingStoryId: string | null = null;
  @state() private currentGitStrategy: GitStrategy | null = null;
  @property({ type: Boolean }) autoModeEnabled = false;
  // KAE-003: Auto-mode progress state
  @state() private autoModeProgress: AutoModeProgress | null = null;
  // KAE-004: Auto-mode error modal state
  @state() private showErrorModal = false;
  @state() private autoModeError: AutoModeError | null = null;
  // KAE-005: Auto-mode waiting for git strategy selection
  @state() private autoModePendingGitStrategy = false;
  // MSK: Model providers for story cards
  @state() private providers: ProviderInfo[] = DEFAULT_PROVIDERS;
  @state() private selectedModel = { providerId: 'anthropic', modelId: 'opus' };
  // SCA-004: Attachment panel state
  @state() private activeAttachmentStoryId: string | null = null;
  @state() private isChatOpen = false;
  @state() private chatMessages: ChatMessageData[] = [];
  @state() private isChatLoading = false;
  @state() private sidebarWidth = 350;
  @state() private isResizing = false;
  private readonly minSidebarWidth = 300;
  private readonly maxSidebarWidth = 800;
  // Spec viewer state
  @state() private isSpecViewerOpen = false;
  @state() private specViewerContent = '';
  @state() private specViewerFilename = '';
  @state() private specViewerRelativePath = '';
  @state() private specViewerFiles: SpecFileGroup[] = [];
  @state() private specViewerLoading = false;
  @state() private specViewerError = '';
  @state() private specViewerSaving = false;
  @state() private specViewerCopySuccess = false;

  static override styles = [markdownStyles, css`
    :host {
      display: block;
      height: 100%;
    }

    .kanban-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      transition: margin-right 0.3s ease;
    }

    .kanban-container.chat-open {
      margin-right: var(--sidebar-width, 350px);
    }

    .chat-sidebar {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      width: var(--sidebar-width, 350px);
      background: var(--bg-color-secondary, #1e1e1e);
      border-left: 1px solid var(--border-color, #404040);
      z-index: 100;
      display: flex;
      flex-direction: column;
      box-shadow: -5px 0 15px rgba(0, 0, 0, 0.3);
    }

    .sidebar-resizer {
      position: fixed;
      top: 0;
      bottom: 0;
      width: 6px;
      cursor: col-resize;
      z-index: 101;
      background: transparent;
      transition: background 0.2s;
    }

    .sidebar-resizer:hover,
    .sidebar-resizer[data-resizing="true"] {
      background: var(--primary-color, #3b82f6);
    }

    .kanban-header-actions {
      display: flex;
      gap: 1rem;
      align-items: center;
      margin-left: auto;
      margin-right: 1rem;
    }

    .chat-toggle-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--bg-color-tertiary, #2d2d2d);
      border: 1px solid var(--border-color, #404040);
      color: var(--text-color, #e5e5e5);
      padding: 0.5rem 1rem;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .chat-toggle-btn:hover {
      background: var(--bg-color-hover, #3d3d3d);
    }

    .chat-toggle-btn.active {
      background: var(--primary-color, #3b82f6);
      border-color: var(--primary-color, #3b82f6);
      color: white;
    }

    .kanban-header {
      display: flex;
      align-items: center;
      padding: 1rem;
      border-bottom: 1px solid var(--border-color, #404040);
      background: var(--bg-color-secondary, #1e1e1e);
      gap: 1rem;
    }

    .kanban-title {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--text-color, #e5e5e5);
    }

    .back-btn {
      background: transparent;
      border: 1px solid var(--border-color, #404040);
      color: var(--text-color-secondary, #a3a3a3);
      padding: 0.5rem 1rem;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .back-btn:hover {
      background: var(--bg-color-hover, #2d2d2d);
      color: var(--text-color, #e5e5e5);
    }

    .kanban-columns {
      display: flex;
      flex: 1;
      overflow-x: auto;
      padding: 1rem;
      padding-left: 0;
      gap: 1rem;

    }

    .kanban-column {
      flex: 1 1 0;
      min-width: 0;
      background: var(--bg-color-secondary, #1e1e1e);
      border-radius: 6px;
      display: flex;
      flex-direction: column;
      border: 1px solid var(--border-color, #404040);
    }

    .kanban-column.drop-zone-active {
      border: 2px dashed var(--primary-color, #3b82f6);
      background: var(--bg-color-hover, #2d2d2d);
    }

    .kanban-column.drop-zone-valid {
      border-color: var(--success-color, #22c55e);
    }

    .kanban-column.drop-zone-blocked {
      border-color: var(--error-color, #ef4444);
      cursor: not-allowed;
    }

    .column-header {
      padding: 1rem;
      border-bottom: 1px solid var(--border-color, #404040);
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 600;
      color: var(--text-color, #e5e5e5);
    }

    .column-count {
      background: var(--bg-color-tertiary, #2d2d2d);
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.875rem;
      color: var(--text-color-secondary, #a3a3a3);
    }

    .column-content {
      flex: 1;
      overflow-y: auto;
      padding: 0.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .empty-column {
      padding: 2rem;
      text-align: center;
      color: var(--text-color-muted, #737373);
      font-style: italic;
    }

    /* Column Specific Border Colors */
    .kanban-column.backlog {
      border-top: 3px solid var(--text-color-secondary, #a3a3a3);
    }

    .kanban-column.in-progress {
      border-top: 3px solid var(--primary-color, #3b82f6);
    }

    .kanban-column.done {
      border-top: 3px solid var(--success-color, #22c55e);
    }

    .kanban-column.blocked {
      border-top: 3px solid var(--error-color, #ef4444);
    }

    .kanban-column.in-review {
      border-top: 3px solid var(--warning-color, #f59e0b);
    }

    /* Auto Mode Toggle */
    .auto-mode-toggle-container {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      transition: background-color 0.3s ease;
    }

    .auto-mode-toggle-container.auto-mode-active {
      background-color: rgba(59, 130, 246, 0.1); /* Primary color low opacity */
    }

    .auto-mode-toggle-container.auto-mode-disabled {
      opacity: 0.4;
      pointer-events: none;
    }

    .auto-mode-toggle {
      position: relative;
      display: inline-flex;
      align-items: center;
      cursor: pointer;
      font-size: 0.9rem;
      color: var(--text-color-secondary, #a3a3a3);
      gap: 0.5rem;
    }

    .auto-mode-toggle input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .toggle-slider {
      position: relative;
      width: 36px;
      height: 20px;
      background-color: var(--bg-color-tertiary, #4a4a4a);
      border-radius: 20px;
      transition: .4s;
    }

    .toggle-slider:before {
      position: absolute;
      content: "";
      height: 16px;
      width: 16px;
      left: 2px;
      bottom: 2px;
      background-color: white;
      border-radius: 50%;
      transition: .4s;
    }

    input:checked + .toggle-slider {
      background-color: var(--primary-color, #3b82f6);
    }

    input:focus + .toggle-slider {
      box-shadow: 0 0 1px var(--primary-color, #3b82f6);
    }

    input:checked + .toggle-slider:before {
      transform: translateX(16px);
    }

    .toggle-label {
      font-weight: 500;
    }

    .auto-mode-badge {
      font-size: 0.75rem;
      background-color: var(--primary-color, #3b82f6);
      color: white;
      padding: 0.1rem 0.4rem;
      border-radius: 4px;
      font-weight: 600;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.7; }
      100% { opacity: 1; }
    }

    /* Auto Mode Progress */
    .auto-mode-progress {
      display: flex;
      align-items: center;
      gap: 1rem;
      background: var(--bg-color-tertiary, #2d2d2d);
      padding: 0.5rem 1rem;
      border-radius: 4px;
      border: 1px solid var(--border-color, #404040);
      margin-left: 1rem;
    }

    .progress-story-id {
      font-weight: 700;
      color: var(--primary-color, #3b82f6);
      font-family: monospace;
    }

    .progress-story-title {
      font-size: 0.9rem;
      color: var(--text-color, #e5e5e5);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 200px;
    }

    .progress-phase {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.85rem;
      color: var(--text-color-secondary, #a3a3a3);
      padding-left: 0.5rem;
      border-left: 1px solid var(--border-color, #404040);
    }

    .progress-phase-label {
      text-transform: uppercase;
      font-size: 0.7rem;
      letter-spacing: 0.05em;
    }

    .progress-phase-current {
      color: var(--text-color, #e5e5e5);
      font-weight: 600;
    }

    .auto-mode-pending-git {
      background-color: rgba(234, 179, 8, 0.1); /* Yellow/Warning tint */
      border-color: rgba(234, 179, 8, 0.3);
    }

    .progress-waiting-text {
      color: var(--warning-color, #eab308);
      font-size: 0.9rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .progress-waiting-text::before {
      content: "";
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: var(--warning-color, #eab308);
      animation: blink 1s infinite;
    }

    @keyframes blink {
      0% { opacity: 1; }
      50% { opacity: 0.4; }
      100% { opacity: 1; }
    }

    .kanban-warning {
      color: var(--warning-color, #f59e0b);
      font-size: 0.9rem;
      margin-left: auto;
    }

    /* Spec Viewer Styles */
    .spec-viewer-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      z-index: 200;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .spec-viewer-modal {
      background: var(--bg-color-secondary, #1e1e1e);
      border: 1px solid var(--border-color, #404040);
      border-radius: 8px;
      width: 90%;
      max-width: 1000px;
      height: 80%;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
    }

    .spec-viewer-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--border-color, #404040);
      background: var(--bg-color-tertiary, #2d2d2d);
    }

    .spec-viewer-title {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--text-color, #e5e5e5);
    }

    .spec-viewer-close {
      background: transparent;
      border: none;
      color: var(--text-color-secondary, #a3a3a3);
      font-size: 1.5rem;
      cursor: pointer;
      padding: 0.25rem;
      line-height: 1;
      transition: color 0.2s;
    }

    .spec-viewer-close:hover {
      color: var(--text-color, #e5e5e5);
    }

    .spec-viewer-header-left {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      min-width: 0;
    }

    .spec-viewer-copy-btn {
      background: transparent;
      border: none;
      color: var(--text-color-secondary, #a3a3a3);
      cursor: pointer;
      padding: 0.25rem;
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: color 0.2s, background-color 0.2s;
      flex-shrink: 0;
    }

    .spec-viewer-copy-btn:hover {
      color: var(--text-color, #e5e5e5);
      background-color: var(--bg-color-hover, #3d3d3d);
    }

    .spec-viewer-copy-btn.copy-path--copied {
      color: var(--success-color, #22c55e);
    }

    .spec-viewer-content {
      flex: 1;
      overflow: auto;
      padding: 1.5rem;
    }

    /* SCA-004: Attachment Panel Overlay */
    .attachment-panel-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 150;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .attachment-panel-container {
      position: relative;
      width: 400px;
      max-width: 90vw;
      max-height: 80vh;
      overflow: visible;
    }

    .attachment-panel-close {
      position: absolute;
      top: -10px;
      right: -10px;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: var(--bg-color-tertiary, #2d2d2d);
      border: 1px solid var(--border-color, #404040);
      color: var(--text-color-secondary, #a3a3a3);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      z-index: 10;
      transition: all 0.2s;
    }

    .attachment-panel-close:hover {
      background: var(--primary-color, #3b82f6);
      color: white;
    }

  `];

  override connectedCallback(): void {
    super.connectedCallback();
    console.log('[KanbanBoard] Component connected, specId:', this.kanban?.specId);
    this.setupWorkflowEventListeners();
    this.setupModelListHandler();
    this.requestModelList();
    // UKB-002: Only setup chat handlers if showChat is enabled
    if (this.showChat) {
      this.setupChatHandlers();
    }
    // UKB-002: Only setup spec viewer handlers if showSpecViewer is enabled
    if (this.showSpecViewer) {
      this.setupSpecViewerHandlers();
    }
    // SCA-004: Register attachment handlers
    this.setupAttachmentHandlers();
    this._loadSidebarWidth();
  }

  private _loadSidebarWidth(): void {
    const savedWidth = localStorage.getItem('spec-chat-sidebar-width');
    if (savedWidth) {
      const width = parseInt(savedWidth, 10);
      if (!isNaN(width) && width >= this.minSidebarWidth && width <= this.maxSidebarWidth) {
        this.sidebarWidth = width;
      }
    }
  }

  private setupChatHandlers(): void {
    gateway.on('chat.message', this.handleChatMessage);
    gateway.on('chat.stream', this.handleChatStream);
    gateway.on('chat.stream.start', this.handleChatStreamStart);
    gateway.on('chat.complete', this.handleChatComplete);
    gateway.on('chat.error', this.handleChatError);
    gateway.on('chat.history', this.handleChatHistory);
    document.addEventListener('model-changed', this.handleGlobalModelChange);
  }

  private handleGlobalModelChange = (e: Event): void => {
    const customEvent = e as CustomEvent<{ providerId: string; modelId: string }>;
    this.selectedModel = {
      providerId: customEvent.detail.providerId,
      modelId: customEvent.detail.modelId
    };
  };

  private handleChatMessage = (message: WebSocketMessage): void => {
    if (message.message) {
      this.chatMessages = [...this.chatMessages, message.message as ChatMessageData];
    }
  };

  private handleChatStreamStart = (message: WebSocketMessage): void => {
    const newMessage: ChatMessageData = {
      id: message.messageId as string,
      role: 'assistant' as const,
      content: '',
      timestamp: (message.timestamp as string) || new Date().toISOString()
    };
    this.chatMessages = [...this.chatMessages, newMessage];
    this.isChatLoading = true;
  };

  private handleChatStream = (message: WebSocketMessage): void => {
    const index = this.chatMessages.findIndex(m => m.id === message.messageId);
    if (index !== -1) {
      const updatedMessages = [...this.chatMessages];
      updatedMessages[index] = {
        ...updatedMessages[index],
        content: updatedMessages[index].content + (message.delta as string)
      };
      this.chatMessages = updatedMessages;
    }
  };

  private handleChatComplete = (message: WebSocketMessage): void => {
    this.isChatLoading = false;
    // Update local message history with final content if needed
    const index = this.chatMessages.findIndex(m => m.id === message.messageId);
    if (index !== -1 && message.message) {
      const updatedMessages = [...this.chatMessages];
      updatedMessages[index] = message.message as ChatMessageData;
      this.chatMessages = updatedMessages;
    }
  };

  private handleChatError = (message: WebSocketMessage): void => {
    this.isChatLoading = false;
    this.dispatchEvent(new CustomEvent('show-toast', {
      detail: { message: message.error as string, type: 'error' },
      bubbles: true, composed: true
    }));
  };

  private handleChatHistory = (message: WebSocketMessage): void => {
    if (Array.isArray(message.messages)) {
      this.chatMessages = message.messages as ChatMessageData[];
    }
  };

  private setupSpecViewerHandlers(): void {
    gateway.on('specs.files', this.handleSpecsFiles);
    gateway.on('specs.read', this.handleSpecsRead);
    gateway.on('specs.read.error', this.handleSpecsReadError);
    gateway.on('specs.save', this.handleSpecsSave);
    gateway.on('specs.save.error', this.handleSpecsSaveError);
  }

  // SCA-004: Setup attachment handlers
  private setupAttachmentHandlers(): void {
    gateway.on('attachment:list:response', this.handleAttachmentListResponse);
  }

  private handleSpecsFiles = (message: WebSocketMessage): void => {
    const groups = message.groups as SpecFileGroup[];
    if (groups) {
      this.specViewerFiles = groups;
      // Auto-load first file if none selected
      if (!this.specViewerRelativePath && groups.length > 0 && groups[0].files.length > 0) {
        this.requestSpecFile(groups[0].files[0].relativePath);
      }
    }
  };

  private handleSpecsRead = (message: WebSocketMessage): void => {
    this.specViewerContent = message.content as string;
    this.specViewerFilename = message.filename as string;
    if (message.relativePath) {
      this.specViewerRelativePath = message.relativePath as string;
    }
    this.specViewerLoading = false;
    this.specViewerError = '';
    this.specViewerSaving = false;
    this.isSpecViewerOpen = true;
  };

  private handleSpecsReadError = (message: WebSocketMessage): void => {
    this.specViewerLoading = false;
    this.specViewerError = message.error as string;
    this.dispatchEvent(new CustomEvent('show-toast', {
      detail: { message: this.specViewerError, type: 'error' },
      bubbles: true, composed: true
    }));
  };

  private handleSpecsSave = (message: WebSocketMessage): void => {
    this.specViewerSaving = false;
    if (message.content) {
      this.specViewerContent = message.content as string;
    }
    this.dispatchEvent(new CustomEvent('show-toast', {
      detail: { message: 'Spec file saved successfully', type: 'success' },
      bubbles: true, composed: true
    }));
    // Exit edit mode in the viewer
    const viewer = this.querySelector('aos-docs-viewer') as HTMLElement & { exitEditMode?: () => void } | null;
    if (viewer?.exitEditMode) {
      viewer.exitEditMode();
    }
    this.requestUpdate();
  };

  private handleSpecsSaveError = (message: WebSocketMessage): void => {
    this.specViewerSaving = false;
    this.dispatchEvent(new CustomEvent('show-toast', {
      detail: { message: message.error as string, type: 'error' },
      bubbles: true, composed: true
    }));
    this.requestUpdate();
  };

  private handleSpecSaveRequested = (e: CustomEvent<{ content: string }>): void => {
    e.stopPropagation();
    this.specViewerSaving = true;
    gateway.send({
      type: 'specs.save',
      specId: this.kanban.specId,
      relativePath: this.specViewerRelativePath,
      content: e.detail.content
    });
  };

  private requestSpecFile(relativePath: string): void {
    this.specViewerLoading = true;
    this.specViewerError = '';
    gateway.send({
      type: 'specs.read',
      specId: this.kanban.specId,
      relativePath
    });
  }

  private openSpecViewer(): void {
    gateway.requestSpecFiles(this.kanban.specId);
    this.isSpecViewerOpen = true;
  }

  private handleFileSelected = (e: CustomEvent<{ relativePath: string; filename: string }>): void => {
    this.requestSpecFile(e.detail.relativePath);
  };

  private handleCheckboxToggled = (e: CustomEvent<{ content: string }>): void => {
    e.stopPropagation();
    const previousContent = this.specViewerContent;
    this.specViewerContent = e.detail.content;
    gateway.send({
      type: 'specs.save',
      specId: this.kanban.specId,
      relativePath: this.specViewerRelativePath,
      content: e.detail.content
    });
    // Listen for save error to revert
    const revertHandler = (): void => {
      this.specViewerContent = previousContent;
      gateway.off('specs.save.error', revertHandler);
    };
    gateway.once('specs.save', () => {
      gateway.off('specs.save.error', revertHandler);
    });
    gateway.on('specs.save.error', revertHandler);
  };

  private closeSpecViewer(): void {
    this.isSpecViewerOpen = false;
    this.specViewerContent = '';
    this.specViewerFilename = '';
    this.specViewerRelativePath = '';
    this.specViewerFiles = [];
  }

  private async handleCopySpecViewerPath(e: Event): Promise<void> {
    e.stopPropagation();
    const path = buildSpecFilePath(this.kanban.specId, this.specViewerRelativePath);
    const button = (e.currentTarget as HTMLElement);
    this.specViewerCopySuccess = true;
    await copyPathToClipboard(path, button);
    setTimeout(() => {
      this.specViewerCopySuccess = false;
    }, 2000);
  }

  private requestModelList(): void {
    gateway.send({ type: 'model.list' });
  }

  private setupModelListHandler(): void {
    gateway.on('model.list', this.handleModelList);
  }

  private handleModelList = (message: WebSocketMessage): void => {
    const providers = message.providers as ProviderInfo[];
    if (providers && providers.length > 0) {
      this.providers = providers;
      console.log('[KanbanBoard] Model providers loaded:', providers.length);
    }
  };

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeWorkflowEventListeners();
    gateway.off('model.list', this.handleModelList);
    // UKB-002: Only remove chat handlers if showChat is enabled
    if (this.showChat) {
      gateway.off('chat.message', this.handleChatMessage);
      gateway.off('chat.stream', this.handleChatStream);
      gateway.off('chat.stream.start', this.handleChatStreamStart);
      gateway.off('chat.complete', this.handleChatComplete);
      gateway.off('chat.error', this.handleChatError);
      document.removeEventListener('model-changed', this.handleGlobalModelChange);
    }
    // UKB-002: Only remove spec viewer handlers if showSpecViewer is enabled
    if (this.showSpecViewer) {
      gateway.off('specs.files', this.handleSpecsFiles);
      gateway.off('specs.read', this.handleSpecsRead);
      gateway.off('specs.read.error', this.handleSpecsReadError);
      gateway.off('specs.save', this.handleSpecsSave);
      gateway.off('specs.save.error', this.handleSpecsSaveError);
    }
    // SCA-004: Remove attachment handlers
    gateway.off('attachment:list:response', this.handleAttachmentListResponse);
  }

  private handleWorkflowStarted = (message: { type: string; storyId?: string; specId?: string }): void => {
    const storyId = message.storyId as string;
    if (storyId && this.kanban.specId === message.specId) {
      this.workflowStates.set(storyId, { status: 'working' });
      this.requestUpdate();
    }
  };

  private handleWorkflowComplete = (message: { type: string; storyId?: string; specId?: string }): void => {
    const storyId = message.storyId as string;
    const messageSpecId = message.specId as string;
    const kanbanSpecId = this.kanban?.specId;

    console.log('[KanbanBoard] handleWorkflowComplete called:', { storyId, messageSpecId, kanbanSpecId });

    if (!storyId) {
      console.log('[KanbanBoard] No storyId in message, ignoring');
      return;
    }

    if (kanbanSpecId !== messageSpecId) {
      console.log('[KanbanBoard] Spec ID mismatch:', { kanbanSpecId, messageSpecId });
      return;
    }

    // MCP tools handle the full lifecycle (in_progress → in_review → done).
    // Do NOT dispatch story-move here — stale local data would overwrite
    // the server's authoritative status (e.g. reverting 'done' back to 'in_review').
    this.workflowStates.set(storyId, { status: 'success' });
    this.requestUpdate();
  };

  private handleWorkflowError = (message: { type: string; storyId?: string; specId?: string; error?: string }): void => {
    const storyId = message.storyId as string;
    if (storyId && this.kanban.specId === message.specId) {
      const errorMsg = message.error as string || 'Workflow failed';
      this.workflowStates.set(storyId, {
        status: 'error',
        error: errorMsg
      });

      // KAE-004: If auto-mode is enabled, show error modal
      if (this.autoModeEnabled) {
        const story = this.kanban.stories.find(s => s.id === storyId);
        this.autoModeError = {
          message: errorMsg,
          storyId,
          storyTitle: story?.title || 'Unknown Story',
          phase: this.autoModeProgress?.currentPhase || 1
        };
        this.showErrorModal = true;
        // Dispatch event to pause auto-mode
        this.dispatchEvent(
          new CustomEvent('auto-mode-error', {
            detail: { error: this.autoModeError },
            bubbles: true,
            composed: true
          })
        );
      }

      this.requestUpdate();
    }
  };

  private setupWorkflowEventListeners(): void {
    gateway.on('workflow.story.start.ack', this.handleWorkflowStarted);
    gateway.on('workflow.interactive.complete', this.handleWorkflowComplete);
    gateway.on('workflow.interactive.error', this.handleWorkflowError);
  }

  private removeWorkflowEventListeners(): void {
    gateway.off('workflow.story.start.ack', this.handleWorkflowStarted);
    gateway.off('workflow.interactive.complete', this.handleWorkflowComplete);
    gateway.off('workflow.interactive.error', this.handleWorkflowError);
  }

  private getWorkflowStatus(storyId: string): WorkflowState | undefined {
    return this.workflowStates.get(storyId);
  }

  private handleBack(): void {
    this.dispatchEvent(
      new CustomEvent('kanban-back', {
        bubbles: true,
        composed: true
      })
    );
  }

  private handleStorySelect(e: CustomEvent): void {
    this.dispatchEvent(
      new CustomEvent('story-select', {
        detail: e.detail,
        bubbles: true,
        composed: true
      })
    );
  }

  private handleStoryModelChange(e: CustomEvent<{ storyId: string; model: ModelSelection }>): void {
    this.dispatchEvent(
      new CustomEvent('story-model-change', {
        detail: e.detail,
        bubbles: true,
        composed: true
      })
    );
  }

  // SCA-004: Handle attachment-open event from story-card
  private handleAttachmentOpen(e: CustomEvent<{ storyId: string; story: StoryInfo }>): void {
    const { storyId } = e.detail;
    this.activeAttachmentStoryId = storyId;
    // Request attachment list for this story to get counts
    if (this.mode === 'spec') {
      gateway.requestAttachmentList('spec', this.kanban.specId, storyId, undefined);
    } else if (this.mode === 'backlog') {
      gateway.requestAttachmentList('backlog', undefined, undefined, storyId);
    }
  }

  // SCA-004: Close attachment panel
  private closeAttachmentPanel(): void {
    this.activeAttachmentStoryId = null;
  }

  // SCA-004: Handle attachment panel count changed - update story card
  private handleAttachmentListResponse = (message: WebSocketMessage): void => {
    const data = (message as { data?: { attachments?: Array<{ filename: string }>; count?: number } }).data;
    if (data?.attachments && this.activeAttachmentStoryId) {
      const count = data.attachments.length;
      // Update the story's attachment count in the local state
      const storyIndex = this.kanban.stories.findIndex(s => s.id === this.activeAttachmentStoryId);
      if (storyIndex !== -1) {
        const updatedStories = [...this.kanban.stories];
        updatedStories[storyIndex] = {
          ...updatedStories[storyIndex],
          attachmentCount: count
        };
        this.kanban = { ...this.kanban, stories: updatedStories };
      }
    }
  };

  private getStoriesByStatus(status: 'backlog' | 'in_progress' | 'in_review' | 'done' | 'blocked'): StoryInfo[] {
    return this.kanban.stories.filter(s => s.status === status);
  }

  private handleDragStart(e: CustomEvent): void {
    console.log('[KanbanBoard] handleDragStart:', e.detail.storyId);
    this.draggedStoryId = e.detail.storyId;
  }

  private handleDragEnd(): void {
    this.draggedStoryId = null;
    this.dropZoneActive = null;
    this.dropValidation = { valid: true };
  }

  private handleDragOver(e: DragEvent, status: KanbanStatus): void {
    e.preventDefault();

    // Find the story being dragged
    const storyId = this.draggedStoryId;
    const story = storyId ? this.kanban.stories.find(s => s.id === storyId) : null;

    // KIRC-004: Validate transitions from in_review
    if (story && story.status === 'in_review') {
      if (status === 'done' || status === 'in_progress') {
        this.dropValidation = { valid: true };
      } else {
        this.dropValidation = { valid: false, reason: 'Nur Genehmigung (Done) oder Rückweisung (In Progress) möglich' };
      }
    // Validate if moving to in_progress
    } else if (story && status === 'in_progress' && story.status !== 'in_progress') {
      this.dropValidation = canMoveToInProgress(story, this.kanban.stories);
    } else {
      this.dropValidation = { valid: true };
    }

    // Log only once per drag (when entering a new zone)
    if (this.dropZoneActive !== status) {
      console.log('[KanbanBoard] handleDragOver:', {
        status,
        draggedStoryId: storyId,
        storyFound: !!story,
        storyStatus: story?.status,
        dropValidation: this.dropValidation
      });
    }

    if (e.dataTransfer) {
      // Always allow drop - validation happens in handleDrop with user feedback
      e.dataTransfer.dropEffect = 'move';
    }
    this.dropZoneActive = status;
  }

  private handleDragLeave(e: DragEvent, status: KanbanStatus): void {
    const relatedTarget = e.relatedTarget as HTMLElement;
    const currentTarget = e.currentTarget as HTMLElement;

    // Only clear if we're leaving the column entirely
    if (!currentTarget.contains(relatedTarget)) {
      if (this.dropZoneActive === status) {
        this.dropZoneActive = null;
      }
    }
  }

  private handleDrop(e: DragEvent, targetStatus: KanbanStatus): void {
    e.preventDefault();
    this.dropZoneActive = null;

    const storyId = e.dataTransfer?.getData('text/plain');
    console.log('[KanbanBoard] handleDrop:', { storyId, targetStatus });
    if (!storyId) {
      console.log('[KanbanBoard] No storyId in dataTransfer');
      return;
    }

    const story = this.kanban.stories.find(s => s.id === storyId);
    console.log('[KanbanBoard] Found story:', story ? { id: story.id, status: story.status } : 'NOT FOUND');
    if (!story || story.status === targetStatus) {
      console.log('[KanbanBoard] Early return - story not found or already at target status');
      return;
    }

    // KIRC-004: Validate transitions from in_review - only done and in_progress allowed
    if (story.status === 'in_review') {
      if (targetStatus !== 'done' && targetStatus !== 'in_progress') {
        this.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: {
              message: 'Nur Genehmigung (Done) oder Rückweisung (In Progress) möglich',
              type: 'error'
            },
            bubbles: true,
            composed: true
          })
        );
        this.draggedStoryId = null;
        this.dropValidation = { valid: true };
        return;
      }
    }

    // Validate move to in_progress (skip DoR/dependency check for in_review rejection)
    if (targetStatus === 'in_progress' && story.status !== 'in_progress') {
      const fromInReview = story.status === 'in_review';
      const validation = canMoveToInProgress(story, this.kanban.stories, fromInReview);
      if (!validation.valid) {
        // Dispatch error toast event
        this.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: {
              message: validation.reason,
              type: 'error'
            },
            bubbles: true,
            composed: true
          })
        );
        this.draggedStoryId = null;
        this.dropValidation = { valid: true };
        return;
      }
    }

    // KSE-005: Check if this is the first story execution (no git strategy set yet)
    // If no story is in_progress or done, we need to ask for git strategy
    // KIRC-004: Don't show git strategy dialog for in_review rejection
    if (targetStatus === 'in_progress' && (story.status === 'backlog' || story.status === 'blocked')) {
      const needsGitStrategySelection = this.isFirstStoryExecution();

      if (needsGitStrategySelection && !this.currentGitStrategy) {
        // Show dialog instead of triggering workflow directly
        this.pendingStoryId = storyId;
        this.showGitStrategyDialog = true;
        this.draggedStoryId = null;
        this.dropValidation = { valid: true };
        return; // Don't proceed until user selects strategy
      }
    }

    // Dispatch story-move event for local state update
    this.dispatchEvent(
      new CustomEvent('story-move', {
        detail: {
          storyId,
          fromStatus: story.status,
          toStatus: targetStatus
        },
        bubbles: true,
        composed: true
      })
    );

    // KSE-003: Trigger workflow when moving to In Progress
    // KIRC-004: Don't trigger workflow when rejecting from in_review (just status move)
    console.log('[KanbanBoard] Checking workflow trigger:', {
      targetStatus,
      storyStatus: story.status,
      shouldTrigger: targetStatus === 'in_progress' && (story.status === 'backlog' || story.status === 'blocked'),
      currentGitStrategy: this.currentGitStrategy
    });
    if (targetStatus === 'in_progress' && (story.status === 'backlog' || story.status === 'blocked')) {
      console.log('[KanbanBoard] Triggering workflow start for story:', storyId);
      this.triggerWorkflowStart(storyId, this.currentGitStrategy || 'branch');
    }

    this.draggedStoryId = null;
    this.dropValidation = { valid: true };
  }

  /**
   * KSE-005: Check if this is the first story execution for this spec.
   * Returns true if no stories are in_progress or done.
   */
  private isFirstStoryExecution(): boolean {
    const hasActiveOrDoneStories = this.kanban.stories.some(
      s => s.status === 'in_progress' || s.status === 'done' || s.status === 'in_review'
    );
    return !hasActiveOrDoneStories;
  }

  /**
   * KSE-003/KSE-005: Send workflow.story.start event to backend
   * WTT-003: Now dispatches workflow-terminal-request to open in terminal tab
   * This triggers /execute-tasks {specId} {storyId}
   * @param storyId - The story ID to start
   * @param gitStrategy - The git strategy to use ('branch' or 'worktree')
   */
  private triggerWorkflowStart(storyId: string, gitStrategy: GitStrategy = 'branch'): void {
    // MSK-003-FIX: Get model from story BEFORE sending, because updateStatus might run first
    const story = this.kanban.stories.find(s => s.id === storyId);
    const model = story?.model || 'opus';

    console.log('[KanbanBoard] triggerWorkflowStart:', {
      specId: this.kanban.specId,
      storyId,
      gitStrategy,
      model,
      autoMode: this.autoModeEnabled
    });

    // WTT-003: Dispatch workflow-terminal-request event to app.ts
    // This will open a terminal tab and start the workflow there
    const workflowRequestEvent = new CustomEvent('workflow-terminal-request', {
      detail: {
        command: 'execute-tasks',
        argument: `${this.kanban.specId} ${storyId}`,
        model,
        specId: this.kanban.specId,
        storyId,
        gitStrategy,
      },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(workflowRequestEvent);

    // Still send the backend message to update kanban status and track execution
    gateway.send({
      type: 'workflow.story.start',
      specId: this.kanban.specId,
      storyId,
      gitStrategy,
      model,  // MSK-003-FIX: Send model from frontend
      autoMode: this.autoModeEnabled  // Send auto-mode state to control backend auto-continuation
    });
  }

  /**
   * KSE-005/KAE-005: Handle git strategy selection from dialog
   */
  private handleGitStrategySelect(e: CustomEvent<GitStrategySelection>): void {
    const { strategy, storyId } = e.detail;

    // Store the selected strategy for subsequent stories
    this.currentGitStrategy = strategy;
    this.showGitStrategyDialog = false;

    // KAE-005: Check if this was triggered by auto-mode
    const wasAutoModePending = this.autoModePendingGitStrategy;
    this.autoModePendingGitStrategy = false;

    // Validate storyId is present
    if (!storyId) {
      this.pendingStoryId = null;
      return;
    }

    // Find the story to move
    const story = this.kanban.stories.find(s => s.id === storyId);
    if (!story) {
      this.pendingStoryId = null;
      return;
    }

    // Dispatch story-move event for local state update
    this.dispatchEvent(
      new CustomEvent('story-move', {
        detail: {
          storyId,
          fromStatus: story.status,
          toStatus: 'in_progress'
        },
        bubbles: true,
        composed: true
      })
    );

    // Now trigger the workflow with the selected strategy
    this.triggerWorkflowStart(storyId, strategy);
    this.pendingStoryId = null;

    // KAE-005: If auto-mode was waiting, notify that git strategy is now selected
    if (wasAutoModePending) {
      this.dispatchEvent(
        new CustomEvent('auto-mode-git-strategy-selected', {
          bubbles: true,
          composed: true
        })
      );
    }
  }

  /**
   * KSE-005/KAE-005: Handle git strategy dialog cancel
   */
  private handleGitStrategyCancel(): void {
    this.showGitStrategyDialog = false;
    this.pendingStoryId = null;

    // KAE-005: If auto-mode was waiting for git strategy, disable auto-mode
    if (this.autoModePendingGitStrategy) {
      this.autoModePendingGitStrategy = false;
      this.autoModeEnabled = false;
      this.dispatchEvent(
        new CustomEvent('auto-mode-toggle', {
          detail: { enabled: false },
          bubbles: true,
          composed: true
        })
      );
    }
  }

  /**
   * KAE-004: Handle error modal resume action.
   * Dispatches event to continue auto-execution with next story.
   */
  private handleErrorModalResume(): void {
    this.showErrorModal = false;
    this.autoModeError = null;
    this.dispatchEvent(
      new CustomEvent('auto-mode-resume', {
        bubbles: true,
        composed: true
      })
    );
  }

  /**
   * KAE-004: Handle error modal stop action.
   * Disables auto-mode and clears error state.
   */
  private handleErrorModalStop(): void {
    this.showErrorModal = false;
    this.autoModeError = null;
    this.autoModeEnabled = false;
    this.dispatchEvent(
      new CustomEvent('auto-mode-toggle', {
        detail: { enabled: false },
        bubbles: true,
        composed: true
      })
    );
  }

  /**
   * Check if there are any stories left to work on (not done).
   */
  private get hasOpenStories(): boolean {
    return this.kanban?.stories?.some(s => s.status !== 'done') ?? false;
  }

  /**
   * KAE-001: Handle auto-mode toggle change
   * Dispatches event for parent to handle state change.
   * Parent is source of truth and will update autoModeEnabled via property binding.
   */
  private handleAutoModeToggle(): void {
    // Dispatch event with the intended new value (toggled)
    // Parent will update autoModeEnabled via property binding
    this.dispatchEvent(
      new CustomEvent('auto-mode-toggle', {
        detail: { enabled: !this.autoModeEnabled },
        bubbles: true,
        composed: true
      })
    );
  }

  /**
   * KAE-002: Get the next ready story from backlog.
   * A story is "ready" if it passes canMoveToInProgress validation.
   * Returns null if no stories are ready.
   */
  public getNextReadyStory(): StoryInfo | null {
    const backlogStories = this.kanban.stories.filter(s => s.status === 'backlog');

    for (const story of backlogStories) {
      const validation = canMoveToInProgress(story, this.kanban.stories);
      if (validation.valid) {
        return story;
      }
    }

    return null;
  }

  /**
   * KAE-003: Update auto-mode progress display.
   * Called by dashboard-view when phase updates are received.
   */
  public updateAutoModeProgress(progress: AutoModeProgress | null): void {
    this.autoModeProgress = progress;
  }

  /**
   * KAE-003: Clear auto-mode progress display.
   * Called when workflow completes or auto-mode is disabled.
   */
  public clearAutoModeProgress(): void {
    this.autoModeProgress = null;
  }

  /**
   * KAE-005: Check if auto-mode is waiting for git strategy selection.
   */
  public isAutoModePendingGitStrategy(): boolean {
    return this.autoModePendingGitStrategy;
  }

  /**
   * KAE-003: Truncate story title with ellipsis if too long.
   */
  private truncateTitle(title: string, maxLength = 37): string {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength) + '...';
  }

  /**
   * KAE-002/KAE-005: Start a specific story via auto-execution.
   * Called by dashboard-view when auto-mode triggers next story.
   */
  public startStoryAutoExecution(storyId: string): void {
    const story = this.kanban.stories.find(s => s.id === storyId);
    if (!story || story.status !== 'backlog') return;

    // KAE-005: Check if this is first story and needs git strategy
    const needsGitStrategySelection = this.isFirstStoryExecution();
    if (needsGitStrategySelection && !this.currentGitStrategy) {
      // Show git strategy dialog and mark as waiting for selection
      this.pendingStoryId = storyId;
      this.showGitStrategyDialog = true;
      this.autoModePendingGitStrategy = true;
      return;
    }

    // Dispatch story-move event for local state update
    this.dispatchEvent(
      new CustomEvent('story-move', {
        detail: {
          storyId,
          fromStatus: story.status,
          toStatus: 'in_progress'
        },
        bubbles: true,
        composed: true
      })
    );

    // Trigger workflow
    this.triggerWorkflowStart(storyId, this.currentGitStrategy || 'branch');
  }

  private renderColumn(
    status: KanbanStatus,
    title: string,
    stories: StoryInfo[],
    cssClass: string
  ) {
    const isDropZoneActive = this.dropZoneActive === status;
    let dropZoneClasses = `kanban-column ${cssClass}`;

    if (isDropZoneActive) {
      // Show valid/blocked state based on validation
      if (this.dropValidation.valid) {
        dropZoneClasses += ' drop-zone-active drop-zone-valid';
      } else {
        dropZoneClasses += ' drop-zone-active drop-zone-blocked';
      }
    }

    return html`
      <div
        class="${dropZoneClasses}"
        @dragover=${(e: DragEvent) => this.handleDragOver(e, status)}
        @dragleave=${(e: DragEvent) => this.handleDragLeave(e, status)}
        @drop=${(e: DragEvent) => this.handleDrop(e, status)}
      >
        <div class="column-header">
          <h3>${title}</h3>
          <span class="column-count">${stories.length}</span>
        </div>
        <div class="column-content">
          ${stories.length === 0
            ? html`<div class="empty-column">No stories</div>`
            : stories.map(
                story => {
                  const workflowState = this.getWorkflowStatus(story.id);
                  return html`
                    <aos-story-card
                      .story=${story}
                      .specId=${this.kanban.specId}
                      .workflowStatus=${workflowState?.status || 'idle'}
                      .workflowError=${workflowState?.error || ''}
                      .providers=${this.providers}
                      @story-select=${this.handleStorySelect}
                      @story-drag-start=${this.handleDragStart}
                      @story-drag-end=${this.handleDragEnd}
                      @story-model-change=${this.handleStoryModelChange}
                      @attachment-open=${this.handleAttachmentOpen}
                    ></aos-story-card>
                  `;
                }
              )}
        </div>
      </div>
    `;
  }

  private toggleChat = (): void => {
    this.isChatOpen = !this.isChatOpen;
    if (this.isChatOpen && this.chatMessages.length === 0) {
      gateway.send({ type: 'chat.history' });
    }
  };

  private _startResize = (e: MouseEvent): void => {
    this.isResizing = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const startX = e.clientX;
    const startWidth = this.sidebarWidth;

    const handleMouseMove = (e: MouseEvent): void => {
      if (!this.isResizing) return;
      const delta = startX - e.clientX;
      const newWidth = Math.max(
        this.minSidebarWidth,
        Math.min(this.maxSidebarWidth, startWidth + delta)
      );
      this.sidebarWidth = newWidth;
    };

    const handleMouseUp = (): void => {
      this.isResizing = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      localStorage.setItem('spec-chat-sidebar-width', String(this.sidebarWidth));
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  private handleChatSendMessage = (e: CustomEvent<{ text: string }>): void => {
    gateway.send({
      type: 'chat.send',
      content: e.detail.text,
      specId: this.kanban.specId,
      model: this.selectedModel
    });
  };

  override render() {
    const backlog = this.getStoriesByStatus('backlog');
    const blocked = this.getStoriesByStatus('blocked');
    const inProgress = this.getStoriesByStatus('in_progress');
    const inReview = this.getStoriesByStatus('in_review');
    const done = this.getStoriesByStatus('done');
    const sidebarStyle = { '--sidebar-width': `${this.sidebarWidth}px` };
    // UKB-002: Determine header title based on mode
    const headerTitle = this.mode === 'backlog' ? 'Backlog' : this.specName;
    // UKB-002: Determine back button text based on mode
    const backButtonText = this.mode === 'backlog' ? '← Back' : '← Back to Specs';
    return html`
      <div class="kanban-container ${this.isChatOpen ? 'chat-open' : ''}" style="${this.isChatOpen ? styleMap(sidebarStyle) : ''}">
        <div class="kanban-header">
          <button class="back-btn" @click=${this.handleBack}>
            ${backButtonText}
          </button>
          <h2 class="kanban-title">${headerTitle}</h2>

          <!-- UKB-002: Header actions only rendered when feature flags are enabled -->
          ${this.showChat || this.showSpecViewer ? html`
            <div class="kanban-header-actions">
              ${this.showChat ? html`
                <button class="chat-toggle-btn ${this.isChatOpen ? 'active' : ''}" @click=${this.toggleChat}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                  <span>Spec Chat</span>
                </button>
              ` : ''}
              ${this.showSpecViewer ? html`
                <button class="chat-toggle-btn ${this.isSpecViewerOpen ? 'active' : ''}" @click=${this.openSpecViewer}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                  <span>Spec Docs</span>
                </button>
              ` : ''}
            </div>
          ` : ''}

          <!-- UKB-002: Auto-Mode Toggle only rendered when showAutoMode is enabled -->
          ${this.showAutoMode ? html`
            <!-- KAE-001: Auto-Mode Toggle -->
            <div class="auto-mode-toggle-container ${this.autoModeEnabled ? 'auto-mode-active' : ''} ${!this.hasOpenStories ? 'auto-mode-disabled' : ''}">
              <label class="auto-mode-toggle" title="${!this.hasOpenStories ? 'Alle Stories sind erledigt' : ''}">
                <input
                  type="checkbox"
                  .checked=${this.autoModeEnabled}
                  .disabled=${!this.hasOpenStories}
                  @change=${this.handleAutoModeToggle}
                  aria-label="Toggle auto-execution mode"
                />
                <span class="toggle-slider"></span>
                <span class="toggle-label">Auto</span>
              </label>
              ${this.autoModeEnabled
                ? html`<span class="auto-mode-badge">Auto aktiv</span>`
                : ''}
            </div>
          ` : ''}

          <!-- KAE-003/KAE-005: Progress Summary Display -->
          ${this.autoModeEnabled && this.autoModePendingGitStrategy
            ? html`
                <div class="auto-mode-progress auto-mode-pending-git">
                  <span class="progress-waiting-text">Warte auf Git-Strategie Auswahl...</span>
                </div>
              `
            : this.autoModeEnabled && this.autoModeProgress
              ? html`
                  <div class="auto-mode-progress">
                    <span class="progress-story-id">${this.autoModeProgress.storyId}</span>
                    <span class="progress-story-title">${this.truncateTitle(this.autoModeProgress.storyTitle)}</span>
                    <div class="progress-phase">
                      <span class="progress-phase-label">Phase</span>
                      <span class="progress-phase-current">${this.autoModeProgress.currentPhase}</span>
                      <span class="progress-phase-separator">/</span>
                      <span class="progress-phase-total">${this.autoModeProgress.totalPhases}</span>
                    </div>
                  </div>
                `
              : ''}

          ${!this.kanban.hasKanbanFile
            ? html`<span class="kanban-warning">Kanban not initialized - showing all stories as Backlog</span>`
            : ''}
        </div>

        <div class="kanban-columns">
          ${this.renderColumn('backlog', 'Backlog', backlog, 'backlog')}
          ${this.renderColumn('blocked', 'Blocked', blocked, 'blocked')}
          ${this.renderColumn('in_progress', 'In Progress', inProgress, 'in-progress')}
          ${this.renderColumn('in_review', 'In Review', inReview, 'in-review')}
          ${this.renderColumn('done', 'Done', done, 'done')}
        </div>

        <!-- UKB-002: Chat sidebar only rendered when showChat is enabled -->
        ${this.showChat && this.isChatOpen ? html`
          <div class="sidebar-resizer"
               @mousedown=${this._startResize}
               ?data-resizing="${this.isResizing}"
               style="right: ${this.sidebarWidth}px;">
          </div>
          <div class="chat-sidebar" style="width: ${this.sidebarWidth}px;">
            <aos-spec-chat
              .messages=${this.chatMessages}
              .isLoading=${this.isChatLoading}
              @send-message=${this.handleChatSendMessage}
            ></aos-spec-chat>
          </div>
        ` : ''}
      </div>

      <!-- UKB-002: Spec Viewer Modal only rendered when showSpecViewer is enabled -->
      ${this.showSpecViewer && this.isSpecViewerOpen ? html`
        <div class="spec-viewer-overlay" @click=${this.closeSpecViewer}>
          <div class="spec-viewer-modal" @click=${(e: Event) => e.stopPropagation()}>
            <div class="spec-viewer-header">
              <div class="spec-viewer-header-left">
                <h3 class="spec-viewer-title">${this.specViewerFilename || 'Spec Documentation'}</h3>
                ${this.specViewerRelativePath ? html`
                  <button
                    class="spec-viewer-copy-btn ${this.specViewerCopySuccess ? 'copy-path--copied' : ''}"
                    @click=${this.handleCopySpecViewerPath}
                    title="Copy file path"
                  >
                    ${this.specViewerCopySuccess
                      ? html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`
                      : html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`
                    }
                  </button>
                ` : ''}
              </div>
              <button class="spec-viewer-close" @click=${this.closeSpecViewer}>×</button>
            </div>
            <aos-spec-file-tabs
              .files=${this.specViewerFiles}
              active-file=${this.specViewerRelativePath}
              spec-id=${this.kanban.specId}
              @file-selected=${this.handleFileSelected}
            ></aos-spec-file-tabs>
            <div class="spec-viewer-content">
              <aos-docs-viewer
                .content=${this.specViewerContent}
                .filename=${this.specViewerFilename}
                .loading=${this.specViewerLoading}
                .error=${this.specViewerError}
                .embedded=${true}
                .editable=${true}
                .isSaving=${this.specViewerSaving}
                @save-requested=${this.handleSpecSaveRequested}
                @checkbox-toggled=${this.handleCheckboxToggled}
              ></aos-docs-viewer>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- UKB-002: Git Strategy Selection Dialog only rendered when showGitStrategy is enabled -->
      ${this.showGitStrategy ? html`
        <!-- KSE-005: Git Strategy Selection Dialog -->
        <aos-git-strategy-dialog
          .open=${this.showGitStrategyDialog}
          .storyId=${this.pendingStoryId || ''}
          .specId=${this.kanban.specId}
          @git-strategy-select=${this.handleGitStrategySelect}
          @git-strategy-cancel=${this.handleGitStrategyCancel}
        ></aos-git-strategy-dialog>
      ` : ''}

      <!-- KAE-004: Auto-Mode Error Modal -->
      <aos-auto-mode-error-modal
        .open=${this.showErrorModal}
        .error=${this.autoModeError}
        @auto-mode-resume=${this.handleErrorModalResume}
        @auto-mode-stop=${this.handleErrorModalStop}
      ></aos-auto-mode-error-modal>

      <!-- SCA-004: Attachment Panel Overlay -->
      ${this.activeAttachmentStoryId ? html`
        <div class="attachment-panel-overlay" @click=${this.closeAttachmentPanel}>
          <div class="attachment-panel-container" @click=${(e: Event) => e.stopPropagation()}>
            <button class="attachment-panel-close" @click=${this.closeAttachmentPanel}>&times;</button>
            <aos-attachment-panel
              contextType=${this.mode}
              .specId=${this.mode === 'spec' ? this.kanban.specId : ''}
              .storyId=${this.mode === 'spec' ? this.activeAttachmentStoryId : ''}
              .itemId=${this.mode === 'backlog' ? this.activeAttachmentStoryId : ''}
            ></aos-attachment-panel>
          </div>
        </div>
      ` : ''}
    `;
  }

}

declare global {
  interface HTMLElementTagNameMap {
    'aos-kanban-board': AosKanbanBoard;
  }
}
