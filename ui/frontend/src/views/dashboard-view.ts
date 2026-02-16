import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { gateway, WebSocketMessage } from '../gateway.js';
import { routerService } from '../services/router.service.js';
import type { ParsedRoute } from '../types/route.types.js';
import '../components/spec-card.js';
import '../components/kanban-board.js';
import '../components/docs/aos-docs-panel.js';
import '../components/aos-create-spec-modal.js';
import type { SpecInfo } from '../components/spec-card.js';
import type { KanbanBoard, StoryInfo, AutoModeProgress, KanbanStatus } from '../components/kanban-board.js';
import type { ProviderInfo } from '../components/story-card.js';
import { AosKanbanBoard } from '../components/kanban-board.js';
import type { AosDocsPanel } from '../components/docs/aos-docs-panel.js';
import { projectContext, type ProjectContextValue } from '../context/project-context.js';

interface StoryDetail {
  id: string;
  title: string;
  type: string;
  priority: string;
  effort: string;
  status: string;
  dependencies: string[];
  content: string; // Raw markdown content
  feature: string;
  acceptanceCriteria: string[];
  dorChecklist: string[];
  dodChecklist: string[];
}

// UKB-004: BacklogStoryInfo now imported from server types
// Local interface kept for frontend-specific extensions if needed
interface BacklogStoryInfo {
  id: string;
  title: string;
  type: 'user-story' | 'bug';
  priority: string;
  effort: string;
  status: 'backlog' | 'in_progress' | 'in_review' | 'done' | 'blocked';
  model?: 'opus' | 'sonnet' | 'haiku' | 'glm-5';
  dorComplete?: boolean;
  dependencies?: string[];
  attachmentCount?: number;
}

interface BacklogKanbanBoard {
  stories: BacklogStoryInfo[];
  hasKanbanFile: boolean;
}

type ViewMode = 'specs' | 'kanban' | 'story' | 'backlog' | 'docs' | 'backlog-story';
type SpecsViewMode = 'grid' | 'list';

const STORAGE_KEY = 'aos-dashboard-view-mode';

function isValidSpecsViewMode(value: unknown): value is SpecsViewMode {
  return value === 'grid' || value === 'list';
}

function loadSpecsViewMode(): SpecsViewMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && isValidSpecsViewMode(stored)) {
      return stored;
    }
  } catch {
    // localStorage unavailable (privacy mode), use default
  }
  return 'grid';
}

function saveSpecsViewMode(mode: SpecsViewMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // localStorage unavailable (privacy mode), silently fail
  }
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

@customElement('aos-dashboard-view')
export class AosDashboardView extends LitElement {
  @consume({ context: projectContext, subscribe: true })
  private projectCtx!: ProjectContextValue;

  @state() private specs: SpecInfo[] = [];
  @state() private loading = true;
  @state() private error = '';
  @state() private viewMode: ViewMode = 'specs';
  @state() private selectedSpec: SpecInfo | null = null;
  @state() private kanban: KanbanBoard | null = null;
  @state() private selectedStory: StoryDetail | null = null;
  @state() private autoModeEnabled = false;
  @state() private wsConnected = true; // Optimistic: assume connecting on init
  @state() private specsViewMode: SpecsViewMode = loadSpecsViewMode();
  private lastActiveProjectId: string | null = null;
  @state() private showOnlyActive = true;
  @state() private backlogLoading = false;
  @state() private backlogError = '';
  @state() private backlogKanban: BacklogKanbanBoard | null = null;
  @state() private backlogStoryId: string | null = null;
  @state() private backlogStoryContent: string = '';
  @state() private backlogStoryTitle: string = '';
  @state() private providers: ProviderInfo[] = DEFAULT_PROVIDERS;
  @state() private createSpecModalOpen = false;
  // UKB-005: Backlog Auto-Mode state
  @state() private _backlogAutoModeEnabled = false;
  @state() private _backlogAutoModePaused = false;
  private _backlogAutoExecutionTimer: number | null = null;

  // KAE-002: Auto-execution state
  private autoExecutionTimer: number | null = null;
  private static readonly AUTO_EXECUTION_DELAY = 2000; // 2 seconds between stories
  // UKB-005: Backlog auto-execution delay constant
  private static readonly BACKLOG_AUTO_EXECUTION_DELAY = 2000; // 2 seconds between stories
  // KAE-003: Current progress state
  private currentAutoModeProgress: AutoModeProgress | null = null;
  // KAE-004: Auto-mode paused due to error
  @state() private autoModePaused = false;
  // UKB-005: Backlog auto-mode progress tracking
  private _backlogAutoModeProgress: AutoModeProgress | null = null;
  // FIX: Race condition - track workflow completion waiting for status ACK
  private completedWorkflowStoryId: string | null = null;
  private autoExecutionFallbackTimer: number | null = null;
  private static readonly AUTO_EXECUTION_ACK_TIMEOUT = 5000; // 5 second fallback

  // UKB-004: Adapter getter that converts BacklogKanbanBoard to KanbanBoard format
  // Maps BacklogStoryInfo to StoryInfo for use with aos-kanban-board component
  private get backlogKanbanAsStandard(): KanbanBoard | null {
    if (!this.backlogKanban) return null;

    // Map BacklogStoryInfo to StoryInfo (fields are compatible after UKB-003)
    const mappedStories: StoryInfo[] = this.backlogKanban.stories.map(story => ({
      id: story.id,
      title: story.title,
      type: story.type,
      priority: story.priority,
      effort: story.effort,
      status: story.status as KanbanStatus,
      model: story.model,
      dependencies: story.dependencies || [],
      dorComplete: story.dorComplete ?? true, // Default to true for legacy items
      attachmentCount: story.attachmentCount,
    }));

    return {
      specId: 'backlog', // Sentinel value for backlog mode
      stories: mappedStories,
      hasKanbanFile: this.backlogKanban.hasKanbanFile,
    };
  }

  private boundHandlers: Map<string, (msg: WebSocketMessage) => void> = new Map();
  private boundRouteChangeHandler = (route: ParsedRoute) => this.onRouteChanged(route);

  override connectedCallback() {
    super.connectedCallback();
    this.setupHandlers();
    routerService.on('route-changed', this.boundRouteChangeHandler);
    this.checkConnection();
    this.restoreRouteState();
  }

  override updated(changedProperties: Map<string, unknown>) {
    super.updated(changedProperties);

    // React to project context changes
    if (this.projectCtx) {
      const currentActiveId = this.projectCtx.activeProject?.id ?? null;
      if (currentActiveId !== this.lastActiveProjectId) {
        this.handleProjectChange();
        this.lastActiveProjectId = currentActiveId;
      }
    }
  }

  private handleProjectChange(): void {
    // Reset view state when project changes
    this.selectedSpec = null;
    this.kanban = null;
    this.selectedStory = null;
    this.specs = [];
    this.error = '';

    // Restore pending dashboard tab from deep link, default to specs
    if (this.pendingDashboardTab) {
      this.viewMode = this.pendingDashboardTab;
      const tab = this.pendingDashboardTab;
      this.pendingDashboardTab = null;
      if (this.projectCtx?.activeProject && (this.wsConnected || gateway.isConnecting())) {
        if (tab === 'backlog') {
          this.loadBacklog();
        }
        // docs tab doesn't need a data load here
      } else {
        this.loading = false;
      }
      return;
    }

    this.viewMode = 'specs';

    // Reload specs for the new project
    // Check connected OR connecting to handle race condition with Context Provider
    if (this.projectCtx?.activeProject && (this.wsConnected || gateway.isConnecting())) {
      this.loadSpecs();
    } else {
      this.loading = false;
    }
  }

  /**
   * DLN-002: Restore state from current URL on initial load.
   * Reads route params from routerService and restores spec/tab if present.
   */
  private restoreRouteState(): void {
    const route = routerService.getCurrentRoute();
    if (!route || route.view !== 'dashboard') return;

    // Parse segments: ['backlog'] or ['docs'] or ['spec', specId, ...]
    if (route.segments[0] === 'backlog') {
      this.pendingDashboardTab = 'backlog';
      return;
    }
    if (route.segments[0] === 'docs') {
      this.pendingDashboardTab = 'docs';
      return;
    }
    if (route.segments.length >= 2 && route.segments[0] === 'spec') {
      this.pendingSpecId = route.segments[1];
    }
  }

  /**
   * DLN-002: Pending deep-link state to restore after specs load.
   * Set by restoreRouteState(), consumed by onSpecsList().
   */
  private pendingSpecId: string | null = null;
  private pendingDashboardTab: 'backlog' | 'docs' | null = null;

  /**
   * DLN-002: Handle route changes from browser back/forward or external navigation.
   * Only reacts when the current view is dashboard.
   */
  private onRouteChanged(route: ParsedRoute): void {
    if (route.view !== 'dashboard') return;

    // No segments = specs list
    if (route.segments.length === 0) {
      if (this.viewMode !== 'specs') {
        this.viewMode = 'specs';
        this.selectedSpec = null;
        this.kanban = null;
        this.selectedStory = null;
        this.autoModeEnabled = false;
        this.loadSpecs();
      }
      return;
    }

    // Segments: ['backlog'] → backlog tab
    if (route.segments[0] === 'backlog') {
      if (this.viewMode !== 'backlog') {
        this.viewMode = 'backlog';
        this.loadBacklog();
      }
      return;
    }

    // Segments: ['docs'] → docs tab
    if (route.segments[0] === 'docs') {
      if (this.viewMode !== 'docs') {
        this.viewMode = 'docs';
      }
      return;
    }

    // Segments: ['spec', specId] or ['spec', specId, tab]
    if (route.segments[0] === 'spec' && route.segments.length >= 2) {
      const specId = route.segments[1];

      // If we're already viewing this spec, no action needed
      if (this.selectedSpec?.id === specId && this.viewMode === 'kanban') {
        return;
      }

      // Find spec in loaded list and navigate to it
      const spec = this.specs.find(s => s.id === specId);
      if (spec) {
        this.selectedSpec = spec;
        this.loading = true;
        gateway.send({ type: 'specs.kanban', specId });
      } else if (this.specs.length > 0) {
        // DLN-006: Spec not found in loaded list - show toast and correct URL
        this.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: { message: 'Spec nicht gefunden', type: 'warning' },
            bubbles: true,
            composed: true
          })
        );
        routerService.navigate('dashboard');
      }
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.removeHandlers();
    routerService.off('route-changed', this.boundRouteChangeHandler);
    this.clearAutoExecutionTimer();
  }

  // KAE-002: Clear auto-execution timer
  private clearAutoExecutionTimer(): void {
    if (this.autoExecutionTimer !== null) {
      window.clearTimeout(this.autoExecutionTimer);
      this.autoExecutionTimer = null;
    }
    // UKB-005: Clear backlog auto-execution timer
    if (this._backlogAutoExecutionTimer !== null) {
      window.clearTimeout(this._backlogAutoExecutionTimer);
      this._backlogAutoExecutionTimer = null;
    }
    // FIX: Also clear fallback timer and completion tracking
    if (this.autoExecutionFallbackTimer !== null) {
      window.clearTimeout(this.autoExecutionFallbackTimer);
      this.autoExecutionFallbackTimer = null;
    }
    this.completedWorkflowStoryId = null;
  }

  private setupHandlers(): void {
    const handlers: [string, (msg: WebSocketMessage) => void][] = [
      ['gateway.connected', () => this.onGatewayConnected()],
      ['gateway.disconnected', () => this.onGatewayDisconnected()],
      ['project.current', (msg) => this.onProjectCurrent(msg)],
      ['project.selected', () => this.onProjectSelected()],
      ['specs.list', (msg) => this.onSpecsList(msg)],
      ['specs.delete', (msg) => this.onSpecDeleteResponse(msg)],
      ['specs.kanban', (msg) => this.onSpecsKanban(msg)],
      ['specs.story', (msg) => this.onSpecsStory(msg)],
      ['specs.error', (msg) => this.onSpecsError(msg)],
      ['specs.story.updateStatus.ack', (msg) => this.onStoryStatusUpdateAck(msg)],
      ['specs.story.save', (msg) => this.onSpecStorySaveSuccess(msg)],
      ['specs.story.save.error', (msg) => this.onSpecStorySaveError(msg)],
      ['backlog.error', (msg) => this.onBacklogError(msg)],
      ['backlog.kanban', (msg) => this.onBacklogKanban(msg)],
      ['backlog.story-detail', (msg) => this.onBacklogStoryDetail(msg)],
      ['backlog.story.start.ack', (msg) => this.onBacklogStoryStartAck(msg)],
      ['backlog.story.start.error', (msg) => this.onBacklogStoryStartError(msg)],
      ['backlog.story.git.warning', (msg) => this.onBacklogStoryGitWarning(msg)],
      ['backlog.story.complete', (msg) => this.onBacklogStoryComplete(msg)],
      ['backlog.story.save', (msg) => this.onBacklogStorySaveSuccess(msg)],
      ['backlog.story.save.error', (msg) => this.onBacklogStorySaveError(msg)],
      ['model.providers.list', (msg) => this.onModelProvidersList(msg)],
      // KAE-002: Auto-execution event handlers
      ['workflow.interactive.complete', (msg) => this.onWorkflowComplete(msg)],
      // KAE-003: Phase update handler
      ['workflow.interactive.message', (msg) => this.onWorkflowMessage(msg)],
      ['workflow.story.start.ack', (msg) => this.onWorkflowStartAck(msg)]
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

  private checkConnection(): void {
    const isConnected = gateway.getConnectionStatus();
    const isConnecting = gateway.isConnecting();

    // Optimistic: Show as connected if actually connected OR still connecting
    this.wsConnected = isConnected || isConnecting;

    if (isConnected) {
      // Only send if truly connected (not just connecting)
      gateway.send({ type: 'project.current' });
    }
    // If still connecting: onGatewayConnected() will send project.current when ready
  }

  private onGatewayConnected(): void {
    this.wsConnected = true;
    gateway.send({ type: 'project.current' });
  }

  private onGatewayDisconnected(): void {
    this.wsConnected = false;
    this.loading = false;
  }

  private onProjectCurrent(_msg: WebSocketMessage): void {
    // Project context is now managed by projectContext from app.ts
    // We still receive this message but react to context changes instead
    if (this.projectCtx?.activeProject) {
      this.loadSpecs();
    } else {
      this.loading = false;
    }
  }

  private onProjectSelected(): void {
    // Project context is now managed by projectContext from app.ts
    // This is kept for backward compatibility but context changes
    // are now handled via the updated() lifecycle method
    if (this.projectCtx?.activeProject) {
      this.handleProjectChange();
    }
    // hasProject is now managed by projectContext
    this.viewMode = 'specs';
    this.selectedSpec = null;
    this.kanban = null;
    this.selectedStory = null;
    this.autoModeEnabled = false;
    this.loadSpecs();
  }

  private loadSpecs(): void {
    this.loading = true;
    this.error = '';
    gateway.send({ type: 'specs.list' });
    // Load model providers (needed for create-spec-modal)
    gateway.send({ type: 'model.providers.list' });
  }

  private loadBacklog(): void {
    this.backlogLoading = true;
    this.backlogError = '';
    this.backlogKanban = null;
    gateway.send({ type: 'backlog.kanban' });
    // Load model providers
    gateway.send({ type: 'model.providers.list' });
  }

  private onSpecsList(msg: WebSocketMessage): void {
    this.specs = (msg.specs as SpecInfo[]) || [];
    this.loading = false;

    // DLN-002: Restore deep-link state after specs are loaded
    if (this.pendingSpecId) {
      const spec = this.specs.find(s => s.id === this.pendingSpecId);
      if (spec) {
        this.selectedSpec = spec;
        this.loading = true;
        gateway.send({ type: 'specs.kanban', specId: spec.id });
      } else {
        // DLN-006: Spec from URL not found - show toast and correct URL
        this.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: { message: 'Spec nicht gefunden', type: 'warning' },
            bubbles: true,
            composed: true
          })
        );
        routerService.navigate('dashboard');
      }
      this.pendingSpecId = null;
    }
  }

  private onSpecDeleteResponse(msg: WebSocketMessage): void {
    if (msg.success) {
      this.dispatchEvent(
        new CustomEvent('show-toast', {
          detail: {
            message: `Spec erfolgreich gelöscht`,
            type: 'success'
          },
          bubbles: true,
          composed: true
        })
      );
      this.loadSpecs(); // Refresh the list
    } else {
      this.dispatchEvent(
        new CustomEvent('show-toast', {
          detail: {
            message: `Fehler beim Löschen: ${msg.error}`,
            type: 'error'
          },
          bubbles: true,
          composed: true
        })
      );
    }
  }

  private onSpecsKanban(msg: WebSocketMessage): void {
    const kanban = msg.kanban as KanbanBoard;

    // Check if user expects to see the kanban view (clicked on a spec)
    // If selectedSpec is set and matches this kanban, show it
    if (this.selectedSpec && this.selectedSpec.id === kanban.specId) {
      // Only reset auto-mode if we're loading a new spec (not if already in kanban view)
      // This prevents auto-mode from being reset when the kanban is refreshed during execution
      const isNewSpecView = this.viewMode !== 'kanban';
      this.kanban = kanban;
      this.loading = false;
      this.viewMode = 'kanban';
      if (isNewSpecView) {
        this.autoModeEnabled = false;
      }
      return;
    }

    // If we're already viewing this kanban, update it
    if (this.viewMode === 'kanban' && this.kanban?.specId === kanban.specId) {
      this.kanban = kanban;
    }

    // Otherwise, this is a background update for queue progress - already handled above
  }

  private onSpecsStory(msg: WebSocketMessage): void {
    this.selectedStory = msg.story as StoryDetail;
    this.loading = false;
    this.viewMode = 'story';
  }

  private onSpecsError(msg: WebSocketMessage): void {
    const errorMessage = (msg.error as string) || 'An error occurred';
    // DLN-006: If we were loading a spec via deep link, show toast and fall back to spec list
    if (this.selectedSpec) {
      this.dispatchEvent(
        new CustomEvent('show-toast', {
          detail: { message: 'Spec nicht gefunden', type: 'warning' },
          bubbles: true,
          composed: true
        })
      );
      this.selectedSpec = null;
      this.kanban = null;
      this.viewMode = 'specs';
      this.loading = false;
      routerService.navigate('dashboard');
      return;
    }
    this.error = errorMessage;
    this.loading = false;
  }

  private onBacklogError(msg: WebSocketMessage): void {
    this.backlogError = (msg.error as string) || 'An error occurred';
    this.backlogLoading = false;
  }

  private onBacklogKanban(msg: WebSocketMessage): void {
    this.backlogKanban = msg.kanban as BacklogKanbanBoard;
    this.backlogLoading = false;
  }

  private onModelProvidersList(msg: WebSocketMessage): void {
    const providers = msg.providers as ProviderInfo[] | undefined;
    if (providers && providers.length > 0) {
      this.providers = providers;
      console.log('[Dashboard] Model providers loaded:', providers.length);
    }
  }

  private onBacklogStoryDetail(msg: WebSocketMessage): void {
    const backlogStory = msg.story as {
      id: string;
      title: string;
      content: string;
    };

    this.backlogStoryId = backlogStory.id;
    this.backlogStoryTitle = backlogStory.title;
    this.backlogStoryContent = backlogStory.content;
    this.loading = false;
    this.viewMode = 'backlog-story';
  }

  private onBacklogStorySaveSuccess(msg: WebSocketMessage): void {
    const content = msg.content as string;
    if (content) {
      this.backlogStoryContent = content;
    }
    this.dispatchEvent(
      new CustomEvent('show-toast', {
        detail: { message: 'Story saved successfully', type: 'success' },
        bubbles: true,
        composed: true
      })
    );
    // Exit edit mode in the viewer
    const viewer = this.querySelector('.backlog-story-viewer aos-docs-viewer') as HTMLElement & { exitEditMode?: () => void } | null;
    if (viewer?.exitEditMode) {
      viewer.exitEditMode();
    }
  }

  private onBacklogStorySaveError(msg: WebSocketMessage): void {
    this.dispatchEvent(
      new CustomEvent('show-toast', {
        detail: { message: msg.error as string, type: 'error' },
        bubbles: true,
        composed: true
      })
    );
  }

  private onSpecStorySaveSuccess(msg: WebSocketMessage): void {
    const content = msg.content as string;
    if (content && this.selectedStory) {
      this.selectedStory = { ...this.selectedStory, content };
    }
    this.dispatchEvent(
      new CustomEvent('show-toast', {
        detail: { message: 'Story saved successfully', type: 'success' },
        bubbles: true,
        composed: true
      })
    );
    // Exit edit mode in the viewer
    const viewer = this.querySelector('.spec-story-viewer aos-docs-viewer') as HTMLElement & { exitEditMode?: () => void } | null;
    if (viewer?.exitEditMode) {
      viewer.exitEditMode();
    }
  }

  private onSpecStorySaveError(msg: WebSocketMessage): void {
    this.dispatchEvent(
      new CustomEvent('show-toast', {
        detail: { message: msg.error as string, type: 'error' },
        bubbles: true,
        composed: true
      })
    );
  }

  /**
   * BKE-001: Handle backlog story start acknowledgment.
   * Shows toast notification when story execution starts.
   */
  private onBacklogStoryStartAck(msg: WebSocketMessage): void {
    const storyId = msg.storyId as string;
    console.log(`[Dashboard] Backlog story execution started: ${storyId}`);

    // Show toast notification
    this.dispatchEvent(
      new CustomEvent('show-toast', {
        detail: {
          message: `Story ${storyId} gestartet`,
          type: 'info'
        },
        bubbles: true,
        composed: true
      })
    );
  }

  /**
   * BPS-003: Handle backlog story start error.
   * Shows error toast and triggers auto-continue to skip failed story.
   * Szenario 4: Branch-Erstellung fehlschlägt - Story wird übersprungen.
   */
  private onBacklogStoryStartError(msg: WebSocketMessage): void {
    const storyId = msg.storyId as string | undefined;
    const error = (msg.error as string) || 'Unbekannter Fehler';
    console.error(`[Dashboard] Backlog story start error: ${storyId}`, error);

    // Clear auto-mode progress
    this._backlogAutoModeProgress = null;
    this.updateBacklogKanbanProgress(null);

    // Show error toast
    this.dispatchEvent(
      new CustomEvent('show-toast', {
        detail: {
          message: `Story ${storyId || 'Unbekannt'} konnte nicht gestartet werden: ${error}`,
          type: 'error'
        },
        bubbles: true,
        composed: true
      })
    );

    // Szenario 4: Try next story if auto-mode is enabled
    if (this._backlogAutoModeEnabled && !this._backlogAutoModePaused) {
      console.log(`[Dashboard] Auto-mode enabled, trying next backlog story after error`);
      this._scheduleNextBacklogAutoExecution();
    }
  }

  /**
   * BPS-003: Handle non-critical Git operation warnings during backlog story execution.
   * Shows warning toast but does NOT interrupt auto-mode.
   * Szenario 5: PR-Erstellung fehlschlägt - nicht-kritisch.
   */
  private onBacklogStoryGitWarning(msg: WebSocketMessage): void {
    const storyId = msg.storyId as string | undefined;
    const warning = (msg.warning as string) || 'Git-Operation fehlgeschlagen';
    const canContinue = msg.canContinue !== false; // Default to true

    console.warn(`[Dashboard] Backlog story git warning: ${storyId}`, warning);

    // Show warning toast (type: 'warning' for non-critical errors)
    this.dispatchEvent(
      new CustomEvent('show-toast', {
        detail: {
          message: `⚠️ ${storyId || 'Story'}: ${warning}`,
          type: 'warning'
        },
        bubbles: true,
        composed: true
      })
    );

    // Note: Auto-mode is NOT interrupted - the workflow continues
    // This matches Szenario 5: "PR-Erstellung fehlschlägt - nicht-kritisch"
    if (!canContinue) {
      console.error(`[Dashboard] Git warning indicates cannot continue, but this should not happen in current implementation`);
    }
  }

  /**
   * BKE-002: Handle backlog story completion event.
   * BPS-003: Added error handling for PR creation failures (non-critical warnings).
   * When auto-mode is enabled, schedules the next story execution.
   */
  private onBacklogStoryComplete(msg: WebSocketMessage): void {
    const storyId = msg.storyId as string;
    const prWarning = msg.prWarning as string | undefined;
    const prUrl = msg.prUrl as string | undefined;
    console.log(`[Dashboard] Backlog story completed: ${storyId}`, { prWarning, prUrl });

    // UKB-005: Clear backlog auto-mode progress
    this._backlogAutoModeProgress = null;
    this.updateBacklogKanbanProgress(null);

    // Update local state
    if (this.backlogKanban) {
      const updatedStories = this.backlogKanban.stories.map(story =>
        story.id === storyId ? { ...story, status: 'done' as const } : story
      );
      this.backlogKanban = { ...this.backlogKanban, stories: updatedStories };
    }

    // BPS-003: Show warning if PR creation failed (non-critical)
    if (prWarning) {
      console.warn(`[Dashboard] PR creation warning for ${storyId}:`, prWarning);
      this.dispatchEvent(
        new CustomEvent('show-toast', {
          detail: {
            message: `PR-Erstellung für ${storyId} fehlgeschlagen: ${prWarning}`,
            type: 'warning'
          },
          bubbles: true,
          composed: true
        })
      );
    } else if (prUrl) {
      // Success: Show PR URL
      this.dispatchEvent(
        new CustomEvent('show-toast', {
          detail: {
            message: `PR erstellt: ${prUrl}`,
            type: 'success'
          },
          bubbles: true,
          composed: true
        })
      );
    }

    // UKB-005: If auto-mode is enabled, schedule next story execution
    if (this._backlogAutoModeEnabled && !this._backlogAutoModePaused) {
      console.log(`[Dashboard] Scheduling next backlog auto-execution after ${storyId}`);
      this._scheduleNextBacklogAutoExecution();
    }
  }

  private onStoryStatusUpdateAck(msg: WebSocketMessage): void {
    // Refresh the specs list to get updated counts
    this.loadSpecs();

    // Also refresh the kanban board if we're viewing it to reflect the status change
    if (this.viewMode === 'kanban' && this.selectedSpec) {
      gateway.send({ type: 'specs.kanban', specId: this.selectedSpec.id });
    }

    // FIX: Race condition - check if we're waiting for this ACK to start next auto-execution
    const storyId = msg.storyId as string;
    if (this.completedWorkflowStoryId === storyId && this.autoModeEnabled && !this.autoModePaused) {
      console.log(`[Dashboard] Received status ACK for ${storyId}, proceeding with auto-execution`);
      // Clear fallback timer since we got the ACK
      if (this.autoExecutionFallbackTimer !== null) {
        window.clearTimeout(this.autoExecutionFallbackTimer);
        this.autoExecutionFallbackTimer = null;
      }
      this.completedWorkflowStoryId = null;
      this.scheduleNextAutoExecution();
    }
  }

  /**
   * KAE-002: Handle workflow completion event.
   * When a story workflow completes and auto-mode is enabled,
   * wait for status update ACK before scheduling next story execution.
   * FIX: Race condition - don't schedule immediately, wait for backend to confirm status update.
   * SKQ-005: Also handles queue mode when no spec is selected.
   */
  private onWorkflowComplete(msg: WebSocketMessage): void {
    const specId = msg.specId as string;
    const storyId = msg.storyId as string;

    console.log('[Dashboard] onWorkflowComplete called:', { specId, storyId, selectedSpecId: this.selectedSpec?.id });

    // Only process UI updates if this is for the currently selected spec
    if (!this.selectedSpec || this.selectedSpec.id !== specId) {
      console.log('[Dashboard] Spec mismatch or no selected spec, ignoring:', { selectedSpecId: this.selectedSpec?.id, specId });
      return;
    }

    // KAE-003: Clear progress display
    this.currentAutoModeProgress = null;
    this.updateKanbanProgress(null);

    // Update the completed story's status in local state
    if (this.kanban) {
      const updatedStories = this.kanban.stories.map((story: StoryInfo) =>
        story.id === storyId ? { ...story, status: 'done' as const } : story
      );
      this.kanban = { ...this.kanban, stories: updatedStories };
    }

    // FIX: Race condition - If auto-mode is enabled, wait for status update ACK before scheduling
    // This ensures the backend has finished writing the kanban file before we try to start the next story
    if (this.autoModeEnabled && !this.autoModePaused) {
      console.log(`[Dashboard] Workflow completed for ${storyId}, waiting for status ACK before next auto-execution`);
      this.completedWorkflowStoryId = storyId;

      // Fallback: if ACK doesn't arrive within timeout, proceed anyway
      // This prevents getting stuck if ACK is lost
      this.autoExecutionFallbackTimer = window.setTimeout(() => {
        if (this.completedWorkflowStoryId === storyId) {
          console.warn(`[Dashboard] Status ACK timeout for ${storyId}, proceeding with auto-execution`);
          this.completedWorkflowStoryId = null;
          this.scheduleNextAutoExecution();
        }
      }, AosDashboardView.AUTO_EXECUTION_ACK_TIMEOUT);
    }
  }

  /**
   * KAE-003: Handle workflow start acknowledgment.
   * Initialize progress display when a story starts execution.
   */
  private onWorkflowStartAck(msg: WebSocketMessage): void {
    const specId = msg.specId as string;
    const storyId = msg.storyId as string;

    // Only process if this is for the currently selected spec
    if (!this.selectedSpec || this.selectedSpec.id !== specId) {
      return;
    }

    // Refresh kanban to show the story moved to 'in_progress'
    // This is needed for auto-continuation where backend starts the next story
    gateway.send({ type: 'specs.kanban', specId });

    // Find the story to get its title
    const story = this.kanban?.stories.find((s: StoryInfo) => s.id === storyId);
    if (!story) return;

    // Initialize progress at phase 1
    this.currentAutoModeProgress = {
      storyId,
      storyTitle: story.title,
      currentPhase: 1,
      totalPhases: 5
    };
    this.updateKanbanProgress(this.currentAutoModeProgress);
  }

  /**
   * KAE-003: Handle workflow message events.
   * Parse phase information from message content.
   */
  private onWorkflowMessage(msg: WebSocketMessage): void {
    const specId = msg.specId as string;

    // Only process if this is for the currently selected spec
    if (!this.selectedSpec || this.selectedSpec.id !== specId) {
      return;
    }

    // Only process if we have current progress
    if (!this.currentAutoModeProgress) return;

    // Extract message content
    const content = (msg.content as string) || (msg.message as string) || '';

    // Try to detect phase from content
    const phase = this.extractPhaseFromMessage(content);
    if (phase !== null && phase !== this.currentAutoModeProgress.currentPhase) {
      this.currentAutoModeProgress = {
        ...this.currentAutoModeProgress,
        currentPhase: phase
      };
      this.updateKanbanProgress(this.currentAutoModeProgress);
    }
  }

  /**
   * KAE-003: Extract phase number from workflow message content.
   * Looks for patterns like "Phase 3", "spec-phase-3", "phase-3"
   */
  private extractPhaseFromMessage(content: string): number | null {
    // Pattern 1: "Phase X" or "phase X" (case insensitive)
    const phaseMatch = content.match(/phase\s*(\d)/i);
    if (phaseMatch) {
      const phase = parseInt(phaseMatch[1], 10);
      if (phase >= 1 && phase <= 5) return phase;
    }

    // Pattern 2: "spec-phase-X" or "spec-phase-X.md"
    const specPhaseMatch = content.match(/spec-phase-(\d)/i);
    if (specPhaseMatch) {
      const phase = parseInt(specPhaseMatch[1], 10);
      if (phase >= 1 && phase <= 5) return phase;
    }

    // Pattern 3: "backlog-phase-X"
    const backlogPhaseMatch = content.match(/backlog-phase-(\d)/i);
    if (backlogPhaseMatch) {
      const phase = parseInt(backlogPhaseMatch[1], 10);
      if (phase >= 1 && phase <= 3) return phase;
    }

    return null;
  }

  /**
   * KAE-003: Update the kanban board's progress display.
   */
  private updateKanbanProgress(progress: AutoModeProgress | null): void {
    const kanbanBoard = this.querySelector('aos-kanban-board') as AosKanbanBoard | null;
    if (kanbanBoard) {
      kanbanBoard.updateAutoModeProgress(progress);
    }
  }

  /**
   * KAE-002: Schedule next story execution with delay.
   */
  private scheduleNextAutoExecution(): void {
    this.clearAutoExecutionTimer();

    this.autoExecutionTimer = window.setTimeout(() => {
      this.autoExecutionTimer = null;
      this.processAutoExecution();
    }, AosDashboardView.AUTO_EXECUTION_DELAY);
  }

  /**
   * KAE-002: Process auto-execution by finding and starting the next ready story.
   */
  private processAutoExecution(): void {
    // KAE-004: Don't process if auto-mode is paused due to error
    if (!this.autoModeEnabled || !this.kanban || this.autoModePaused) {
      return;
    }

    // Get reference to kanban board component
    const kanbanBoard = this.querySelector('aos-kanban-board') as AosKanbanBoard | null;
    if (!kanbanBoard) {
      return;
    }

    // Get next ready story
    const nextStory = kanbanBoard.getNextReadyStory();
    if (!nextStory) {
      // No more ready stories - check if all done
      const allDone = this.kanban.stories.every((s: StoryInfo) => s.status === 'done');
      if (allDone) {
        // Deactivate auto-mode and show notification
        this.autoModeEnabled = false;
        this.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: {
              message: 'Alle Stories abgeschlossen',
              type: 'success'
            },
            bubbles: true,
            composed: true
          })
        );
      }
      return;
    }

    // Start the next story
    kanbanBoard.startStoryAutoExecution(nextStory.id);
  }

  private handleSpecSelect(e: CustomEvent): void {
    const specId = e.detail.specId as string;
    this.selectedSpec = this.specs.find(s => s.id === specId) || null;
    this.loading = true;
    gateway.send({ type: 'specs.kanban', specId });
    // DLN-002: Update URL to reflect selected spec
    routerService.navigate('dashboard', ['spec', specId]);
  }

  private handleSpecDelete(e: CustomEvent): void {
    const { specId, specName } = e.detail;
    if (window.confirm(`Möchtest du das Spec "${specName}" wirklich löschen?`)) {
      gateway.send({
        type: 'specs.delete',
        specId,
        timestamp: new Date().toISOString()
      });
      // Optimistically hide the spec or show loading
      this.dispatchEvent(
        new CustomEvent('show-toast', {
          detail: {
            message: `Spec ${specId} wird gelöscht...`,
            type: 'info'
          },
          bubbles: true,
          composed: true
        })
      );
    }
  }

  private handleKanbanBack(): void {
    this.viewMode = 'specs';
    this.selectedSpec = null;
    this.kanban = null;
    this.autoModeEnabled = false;
    // Refresh specs list to get updated counts
    this.loadSpecs();
    // DLN-002: Update URL back to dashboard root
    routerService.navigate('dashboard');
  }

  private handleStorySelect(e: CustomEvent): void {
    const storyId = e.detail.storyId as string;
    if (!this.selectedSpec) return;

    this.loading = true;
    gateway.send({
      type: 'specs.story',
      specId: this.selectedSpec.id,
      storyId
    });
  }

  /**
   * Handle story status change from kanban drag & drop.
   * Updates local state immediately and sends update to backend.
   */
  private handleStoryMove(e: CustomEvent): void {
    const { storyId, fromStatus, toStatus } = e.detail as {
      storyId: string;
      fromStatus: string;
      toStatus: 'backlog' | 'in_progress' | 'in_review' | 'done' | 'blocked';
    };

    console.log('[Dashboard] handleStoryMove called:', { storyId, fromStatus, toStatus });

    if (!this.selectedSpec || !this.kanban) {
      console.log('[Dashboard] handleStoryMove: missing selectedSpec or kanban');
      return;
    }

    // Update local state immediately for responsive UI
    const updatedStories = this.kanban.stories.map(story =>
      story.id === storyId ? { ...story, status: toStatus } : story
    );
    this.kanban = { ...this.kanban, stories: updatedStories };

    // Send update to backend for persistence
    gateway.send({
      type: 'specs.story.updateStatus',
      specId: this.selectedSpec.id,
      storyId,
      status: toStatus
    });
  }

  /**
   * KAE-002: Handle auto-mode toggle from kanban board.
   * When enabled, immediately start processing if no story is in progress.
   * When disabled, clear any pending auto-execution timer.
   */
  private handleAutoModeToggle(e: CustomEvent): void {
    const { enabled } = e.detail as { enabled: boolean };
    this.autoModeEnabled = enabled;

    if (enabled) {
      // KAE-004: Reset paused state when enabling auto-mode
      this.autoModePaused = false;

      // FIX: Eagerly push autoModeEnabled to kanban-board BEFORE calling processAutoExecution.
      // Lit's property binding (.autoModeEnabled=${this.autoModeEnabled}) only updates after
      // the current microtask, so kanban-board would still see autoModeEnabled=false when
      // triggerWorkflowStart reads it synchronously.
      const kanbanBoard = this.querySelector('aos-kanban-board') as HTMLElement & { autoModeEnabled: boolean } | null;
      if (kanbanBoard) {
        kanbanBoard.autoModeEnabled = true;
      }

      // Check if any story is currently in progress
      const hasInProgress = this.kanban?.stories.some((s: StoryInfo) => s.status === 'in_progress');
      if (!hasInProgress) {
        // No story in progress - start auto-execution immediately
        this.processAutoExecution();
      }
      // If a story is in progress, auto-execution will trigger after it completes
    } else {
      // Auto-mode disabled - clear pending timer and progress display
      this.clearAutoExecutionTimer();
      // KAE-003: Clear progress display
      this.currentAutoModeProgress = null;
      this.updateKanbanProgress(null);
      // KAE-004: Reset paused state
      this.autoModePaused = false;
    }
  }

  /**
   * KAE-004: Handle auto-mode error event from kanban board.
   * Pauses auto-execution when an error occurs.
   */
  private handleAutoModeError(): void {
    this.autoModePaused = true;
    this.clearAutoExecutionTimer();
  }

  /**
   * KAE-004: Handle auto-mode resume event from error modal.
   * Resumes auto-execution by scheduling the next story.
   */
  private handleAutoModeResume(): void {
    this.autoModePaused = false;
    // Resume auto-execution - schedule next story
    if (this.autoModeEnabled) {
      this.scheduleNextAutoExecution();
    }
  }

  /**
   * KAE-005: Handle git strategy selection during auto-mode.
   * The story has already been started, so no additional action needed here.
   * The workflow will trigger onWorkflowComplete when done.
   */
  private handleAutoModeGitStrategySelected(): void {
    // Story execution was already triggered by kanban-board after git strategy selection.
    // No additional action needed - auto-execution will continue after workflow completes.
  }

  private handleStoryModelChange(e: CustomEvent<{ storyId: string; model: string }>): void {
    console.log('[Dashboard] handleStoryModelChange called', e.detail);

    if (!this.selectedSpec || !this.kanban) {
      console.log('[Dashboard] No selectedSpec or kanban, aborting');
      return;
    }

    const { storyId, model } = e.detail;
    console.log(`[Dashboard] Updating model: specId=${this.selectedSpec.id}, storyId=${storyId}, model=${model}`);

    // Update local state immediately for responsive UI
    const updatedStories = this.kanban.stories.map(story =>
      story.id === storyId ? { ...story, model: model as 'opus' | 'sonnet' | 'haiku' } : story
    );
    this.kanban = { ...this.kanban, stories: updatedStories };

    // Send update to backend for persistence
    const message = {
      type: 'specs.story.updateModel',
      specId: this.selectedSpec.id,
      storyId,
      model
    };
    console.log('[Dashboard] Sending to gateway:', message);
    gateway.send(message);
  }

  private handleStoryBack(): void {
    this.viewMode = 'kanban';
    this.selectedStory = null;
  }

  // Backlog story handlers
  // UKB-004: handleBacklogStoryClick removed - story navigation now handled via aos-kanban-board @story-select event
  // UKB-004: handleBacklogStoryDragStart, handleBacklogStoryDragEnd, handleBacklogDragOver, handleBacklogDrop removed
  // - Drag & Drop now handled by aos-kanban-board component
  // UKB-004: handleBacklogModelChange removed - model changes now handled via aos-kanban-board @story-model-change event
  // UKB-004: startBacklogStoryExecution removed - logic moved inline to @story-move handler in renderBacklogView

  // UKB-005: Backlog Auto-Mode Handlers
  /**
   * UKB-005: Handle auto-mode toggle from backlog kanban board.
   * When enabled, immediately start processing if no story is in progress.
   */
  private handleBacklogAutoModeToggle(e: CustomEvent): void {
    const { enabled } = e.detail as { enabled: boolean };
    this._backlogAutoModeEnabled = enabled;

    if (enabled) {
      // Reset paused state when enabling auto-mode
      this._backlogAutoModePaused = false;

      // Eagerly push autoModeEnabled to kanban-board BEFORE calling processAutoExecution
      const kanbanBoard = this.querySelector('aos-kanban-board') as HTMLElement & { autoModeEnabled: boolean } | null;
      if (kanbanBoard) {
        kanbanBoard.autoModeEnabled = true;
      }

      // Check if any story is currently in progress
      const hasInProgress = this.backlogKanban?.stories.some(s => s.status === 'in_progress');
      if (!hasInProgress) {
        // No story in progress - start auto-execution immediately
        this._processBacklogAutoExecution();
      }
    } else {
      // Auto-mode disabled - clear pending timer and progress display
      if (this._backlogAutoExecutionTimer !== null) {
        window.clearTimeout(this._backlogAutoExecutionTimer);
        this._backlogAutoExecutionTimer = null;
      }
      this._backlogAutoModeProgress = null;
      this.updateBacklogKanbanProgress(null);
      this._backlogAutoModePaused = false;
    }
  }

  /**
   * UKB-005: Handle auto-mode error event from backlog kanban board.
   * Pauses auto-execution when an error occurs.
   */
  private handleBacklogAutoModeError(): void {
    this._backlogAutoModePaused = true;
    if (this._backlogAutoExecutionTimer !== null) {
      window.clearTimeout(this._backlogAutoExecutionTimer);
      this._backlogAutoExecutionTimer = null;
    }
  }

  /**
   * UKB-005: Handle auto-mode resume event from error modal.
   * Resumes auto-execution by scheduling the next story.
   */
  private handleBacklogAutoModeResume(): void {
    this._backlogAutoModePaused = false;
    // Resume auto-execution - schedule next story
    if (this._backlogAutoModeEnabled) {
      this._scheduleNextBacklogAutoExecution();
    }
  }

  /**
   * UKB-005: Schedule next backlog story execution with delay.
   */
  private _scheduleNextBacklogAutoExecution(): void {
    if (this._backlogAutoExecutionTimer !== null) {
      window.clearTimeout(this._backlogAutoExecutionTimer);
    }

    this._backlogAutoExecutionTimer = window.setTimeout(() => {
      this._backlogAutoExecutionTimer = null;
      this._processBacklogAutoExecution();
    }, AosDashboardView.BACKLOG_AUTO_EXECUTION_DELAY);
  }

  /**
   * UKB-005: Process backlog auto-execution by finding and starting the next ready story.
   */
  private _processBacklogAutoExecution(): void {
    // Don't process if auto-mode is paused due to error
    if (!this._backlogAutoModeEnabled || !this.backlogKanban || this._backlogAutoModePaused) {
      return;
    }

    // Get reference to kanban board component
    const kanbanBoard = this.querySelector('aos-kanban-board') as AosKanbanBoard | null;
    if (!kanbanBoard) {
      return;
    }

    // Get next ready story
    const nextStory = kanbanBoard.getNextReadyStory();
    if (!nextStory) {
      // No more ready stories - check if all done
      const allDone = this.backlogKanban.stories.every(s => s.status === 'done');
      if (allDone) {
        // Deactivate auto-mode and show notification
        this._backlogAutoModeEnabled = false;
        this.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: {
              message: 'Alle Backlog-Items abgeschlossen',
              type: 'success'
            },
            bubbles: true,
            composed: true
          })
        );
      }
      return;
    }

    // Start the next story via backlog.story.start
    const model = nextStory.model || 'opus';
    gateway.send({
      type: 'backlog.story.start',
      storyId: nextStory.id,
      model
    });

    // Update progress display
    this._backlogAutoModeProgress = {
      storyId: nextStory.id,
      storyTitle: nextStory.title,
      currentPhase: 1,
      totalPhases: 3  // Backlog has 3 phases
    };
    this.updateBacklogKanbanProgress(this._backlogAutoModeProgress);
  }

  /**
   * UKB-005: Update the backlog kanban board's progress display.
   */
  private updateBacklogKanbanProgress(progress: AutoModeProgress | null): void {
    const kanbanBoard = this.querySelector('aos-kanban-board') as AosKanbanBoard | null;
    if (kanbanBoard) {
      kanbanBoard.updateAutoModeProgress(progress);
    }
  }

  private handleOpenCreateSpecModal(): void {
    this.createSpecModalOpen = true;
  }

  private handleCreateSpecModalClose(): void {
    this.createSpecModalOpen = false;
  }

  private handleCreateSpecStart(e: CustomEvent): void {
    this.createSpecModalOpen = false;
    // Navigate to workflows view and pass the event details
    // The workflow-start-interactive event will be handled by workflow-view
    const { commandId, argument } = e.detail;

    // Store the workflow start details in sessionStorage for the workflow view to pick up
    sessionStorage.setItem('pendingWorkflow', JSON.stringify({ commandId, argument }));

    // Navigate to workflows
    routerService.navigate('workflows');
  }

  override render() {
    if (!this.wsConnected) {
      return this.renderConnectionError();
    }

    // Use project context to determine if a project is active
    const hasActiveProject = !!this.projectCtx?.activeProject;
    if (!hasActiveProject) {
      return this.renderNoProject();
    }

    if (this.viewMode === 'docs') {
      return this.renderDocsView();
    }

    if (this.viewMode === 'backlog') {
      return this.renderBacklogView();
    }

    if (this.viewMode === 'backlog-story') {
      return this.renderBacklogStoryDetail();
    }

    if (this.loading) {
      return this.renderLoading();
    }

    if (this.error) {
      return this.renderError();
    }

    switch (this.viewMode) {
      case 'kanban':
        return this.renderKanban();
      case 'story':
        return this.renderStoryDetail();
      default:
        return this.renderSpecsList();
    }
  }

  private renderConnectionError() {
    return html`
      <div class="connection-error">
        <span>⚠️</span>
        <span>Disconnected from server</span>
        <button class="reconnect-btn" @click=${() => gateway.connect()}>Reconnect</button>
      </div>
    `;
  }

  private renderNoProject() {
    return html`
      <div class="no-project-banner">
        <span>📁</span>
        <span>Select a project from the header to view specs</span>
      </div>
    `;
  }

  private renderLoading() {
    return html`
      <div class="loading-state">
        <div class="loading-spinner"></div>
        <p>Loading specs...</p>
      </div>
    `;
  }

  private renderError() {
    return html`
      <div class="error-state">
        <span class="error-icon">❌</span>
        <h3>Error loading specs</h3>
        <p>${this.error}</p>
        <button class="retry-btn" @click=${() => this.loadSpecs()}>Retry</button>
      </div>
    `;
  }

  private renderSpecsList() {
    if (this.specs.length === 0) {
      return html`
        <div class="dashboard-container">
          ${this.renderDashboardTabs()}
          <div class="dashboard-content">
            <div class="empty-state">
              <span class="empty-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg></span>
              <h3>No Specs Found</h3>
              <p>This project doesn't have any specs in specwright/specs/</p>
              <button class="primary-btn" @click=${this.handleOpenCreateSpecModal}>
                Create First Spec
              </button>
            </div>
          </div>
          ${this.renderCreateSpecModal()}
        </div>
      `;
    }

    const sortedSpecs = this.getSortedSpecs();
    return html`
      <div class="dashboard-container">
        ${this.renderDashboardTabs()}
        <div class="dashboard-header">
          <h2>Project Feature Specs</h2>
          <span class="spec-count">${sortedSpecs.length} spec${sortedSpecs.length !== 1 ? 's' : ''}</span>
          <label class="active-toggle">
            <input
              type="checkbox"
              .checked=${this.showOnlyActive}
              @change=${this.handleActiveToggleChange}
            />
            <span>Nur aktive</span>
          </label>
          <button class="new-spec-btn" @click=${this.handleOpenCreateSpecModal}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="6" y1="1" x2="6" y2="11"/><line x1="1" y1="6" x2="11" y2="6"/></svg>
            Neues Spec
          </button>
        </div>

        <div class="dashboard-content">
          ${this.specsViewMode === 'grid' ? this.renderSpecsGridView() : this.renderSpecsListView()}
        </div>
        ${this.renderCreateSpecModal()}
      </div>
    `;
  }

  private renderCreateSpecModal() {
    return html`
      <aos-create-spec-modal
        .open=${this.createSpecModalOpen}
        .providers=${this.providers}
        @modal-close=${this.handleCreateSpecModalClose}
        @workflow-start-interactive=${this.handleCreateSpecStart}
      ></aos-create-spec-modal>
    `;
  }

  private renderSpecsGridView() {
    const sortedSpecs = this.getSortedSpecs();
    return html`
      <div class="spec-grid">
        ${sortedSpecs.map(
          spec => html`
            <aos-spec-card
              .spec=${spec}
              @spec-select=${this.handleSpecSelect}
              @spec-delete=${this.handleSpecDelete}
            ></aos-spec-card>
          `
        )}
      </div>
    `;
  }

  private renderSpecsListView() {
    const sortedSpecs = this.getSortedSpecs();
    return html`
      <div class="spec-list">
        <div class="spec-list-header">
          <div class="spec-list-header-name">Name</div>
          <div class="spec-list-header-date">Date</div>
          <div class="spec-list-header-progress">Progress</div>
          <div class="spec-list-header-actions"></div>
        </div>
        ${sortedSpecs.map(
          spec => html`
            <div
              class="spec-list-row"
              @click=${() => this.handleSpecSelect(new CustomEvent('spec-select', { detail: { specId: spec.id } }))}
              title="${spec.name}"
            >
              <div class="spec-list-row-name">${spec.name}</div>
              <div class="spec-list-row-date">${this.formatSpecDate(spec.createdDate)}</div>
              <div class="spec-list-row-progress">
                <span class="progress-text">${this.getSpecProgress(spec)}%</span>
              </div>
              <div class="spec-list-row-actions">
                <button
                  class="spec-delete-btn-list"
                  @click=${(e: Event) => {
                    e.stopPropagation();
                    this.handleSpecDelete(new CustomEvent('spec-delete', { detail: { specId: spec.id, specName: spec.name } }));
                  }}
                  aria-label="Spec löschen"
                  title="Spec löschen"
                >
                  🗑
                </button>
              </div>
            </div>
          `
        )}
      </div>
    `;
  }

  private getSpecProgress(spec: SpecInfo): number {
    if (spec.storyCount === 0) return 0;
    return Math.round((spec.completedCount / spec.storyCount) * 100);
  }

  private getSortedSpecs(): SpecInfo[] {
    const notStarted: SpecInfo[] = [];
    const inProgress: SpecInfo[] = [];
    const done: SpecInfo[] = [];

    for (const spec of this.specs) {
      if (!spec.hasKanban) {
        notStarted.push(spec);
      } else if (spec.completedCount === spec.storyCount) {
        done.push(spec);
      } else {
        inProgress.push(spec);
      }
    }

    if (this.showOnlyActive) {
      return [...notStarted, ...inProgress];
    }
    return [...notStarted, ...inProgress, ...done];
  }

  private formatSpecDate(dateStr: string): string {
    if (!dateStr) return 'Unknown date';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  }

  private renderDashboardTabs() {
    const isSpecsActive = this.viewMode === 'specs' || this.viewMode === 'kanban' || this.viewMode === 'story';
    return html`
      <div class="dashboard-tabs">
        <div class="tabs-left">
          <button
            class="dashboard-tab ${isSpecsActive ? 'active' : ''}"
            @click=${() => this.handleTabChange('specs')}
          >
            Specs
          </button>
          <button
            class="dashboard-tab ${this.viewMode === 'backlog' ? 'active' : ''}"
            @click=${() => this.handleTabChange('backlog')}
          >
            Backlog
          </button>
          <button
            class="dashboard-tab ${this.viewMode === 'docs' ? 'active' : ''}"
            @click=${() => this.handleTabChange('docs')}
          >
            Docs
          </button>
        </div>
        ${isSpecsActive ? this.renderViewToggle() : ''}
      </div>
    `;
  }

  private renderViewToggle() {
    return html`
      <div class="view-toggle-container">
        <button
          class="view-toggle-btn ${this.specsViewMode === 'grid' ? 'active' : ''}"
          @click=${() => this.handleViewModeChange('grid')}
          aria-label="Grid view"
          title="Card view"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <rect x="0" y="0" width="7" height="7" rx="1"/>
            <rect x="9" y="0" width="7" height="7" rx="1"/>
            <rect x="0" y="9" width="7" height="7" rx="1"/>
            <rect x="9" y="9" width="7" height="7" rx="1"/>
          </svg>
        </button>
        <button
          class="view-toggle-btn ${this.specsViewMode === 'list' ? 'active' : ''}"
          @click=${() => this.handleViewModeChange('list')}
          aria-label="List view"
          title="List view"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <rect x="0" y="2" width="16" height="2" rx="1"/>
            <rect x="0" y="7" width="16" height="2" rx="1"/>
            <rect x="0" y="12" width="16" height="2" rx="1"/>
          </svg>
        </button>
      </div>
    `;
  }

  private handleViewModeChange(mode: SpecsViewMode): void {
    this.specsViewMode = mode;
    saveSpecsViewMode(mode);
  }

  private handleActiveToggleChange(e: Event): void {
    const target = e.target as HTMLInputElement;
    this.showOnlyActive = target.checked;
  }

  private handleTabChange(tab: 'specs' | 'backlog' | 'docs'): void {
    if (tab === this.viewMode) return;

    if (this.viewMode === 'docs') {
      const docsPanel = this.querySelector('aos-docs-panel') as AosDocsPanel | null;
      if (docsPanel && docsPanel.checkUnsavedChanges()) {
        const choice = window.confirm(
          'Sie haben ungespeicherte Änderungen. Möchten Sie fortfahren und die Änderungen verwerfen?'
        );
        if (!choice) return;
        docsPanel.confirmTabChange('discard');
      }
    }

    if (tab === 'specs') {
      this.viewMode = 'specs';
      this.selectedSpec = null;
      this.kanban = null;
      this.selectedStory = null;
      this.loadSpecs();
      // DLN-002: Update URL back to dashboard root
      routerService.navigate('dashboard');
    } else if (tab === 'backlog') {
      this.viewMode = 'backlog';
      this.loadBacklog();
      routerService.navigate('dashboard', ['backlog']);
    } else {
      this.viewMode = 'docs';
      routerService.navigate('dashboard', ['docs']);
    }
  }

  private renderDocsView() {
    return html`
      <div class="dashboard-container">
        ${this.renderDashboardTabs()}
        <aos-docs-panel .active=${true}></aos-docs-panel>
      </div>
    `;
  }

  private renderBacklogView() {
    if (this.backlogLoading) {
      return html`
        <div class="dashboard-container">
          ${this.renderDashboardTabs()}
          <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>Loading backlog...</p>
          </div>
        </div>
      `;
    }

    if (this.backlogError) {
      return html`
        <div class="dashboard-container">
          ${this.renderDashboardTabs()}
          <div class="error-state">
            <span class="error-icon">❌</span>
            <h3>Error loading backlog</h3>
            <p>${this.backlogError}</p>
            <button class="retry-btn" @click=${() => this.loadBacklog()}>Retry</button>
          </div>
        </div>
      `;
    }

    if (!this.backlogKanban || this.backlogKanban.stories.length === 0) {
      return html`
        <div class="dashboard-container">
          ${this.renderDashboardTabs()}
          <div class="empty-state">
            <span class="empty-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M9 14l2 2 4-4"/></svg></span>
            <h3>No backlog entries</h3>
            <p>No tasks found in specwright/backlog/</p>
            <p class="empty-hint">Use <code>/add-todo</code> or <code>/add-bug</code> to create new tasks</p>
          </div>
        </div>
      `;
    }

    // UKB-004: Use aos-kanban-board with backlog mode instead of inline rendering
    const kanban = this.backlogKanbanAsStandard;
    if (!kanban) {
      return this.renderLoading();
    }

    return html`
      <aos-kanban-board
        .kanban=${kanban}
        mode="backlog"
        .showChat=${false}
        .showSpecViewer=${false}
        .showGitStrategy=${false}
        .showAutoMode=${true}
        .autoModeEnabled=${this._backlogAutoModeEnabled}
        @kanban-back=${() => this.handleTabChange('specs')}
        @auto-mode-toggle=${this.handleBacklogAutoModeToggle}
        @auto-mode-error=${this.handleBacklogAutoModeError}
        @auto-mode-resume=${this.handleBacklogAutoModeResume}
        @story-select=${(e: CustomEvent) => {
          // Navigate to backlog story detail when a story is clicked
          const storyId = e.detail.storyId as string;
          gateway.send({ type: 'backlog.story-detail', storyId });
        }}
        @story-move=${(e: CustomEvent) => {
          // Handle story status changes via backend
          const { storyId, toStatus } = e.detail;
          gateway.send({
            type: 'backlog.story-status',
            storyId,
            status: toStatus
          });
          // BKE-001: If moving to in_progress, start story execution
          if (toStatus === 'in_progress') {
            const story = this.backlogKanban?.stories.find(s => s.id === storyId);
            const model = story?.model || 'opus';
            gateway.send({
              type: 'backlog.story.start',
              storyId,
              model
            });
          }
        }}
        @story-model-change=${(e: CustomEvent) => {
          // Handle model changes via backend
          const { storyId, model } = e.detail;
          gateway.send({
            type: 'backlog.story.model',
            storyId,
            model
          });
        }}
      ></aos-kanban-board>
    `;
  }

  private renderKanban() {
    if (!this.kanban || !this.selectedSpec) {
      return this.renderLoading();
    }

    return html`
      <aos-kanban-board
        .kanban=${this.kanban}
        .specName=${this.selectedSpec.name}
        .autoModeEnabled=${this.autoModeEnabled}
        @kanban-back=${this.handleKanbanBack}
        @auto-mode-toggle=${this.handleAutoModeToggle}
        @auto-mode-error=${this.handleAutoModeError}
        @auto-mode-resume=${this.handleAutoModeResume}
        @auto-mode-git-strategy-selected=${this.handleAutoModeGitStrategySelected}
        @story-select=${this.handleStorySelect}
        @story-move=${this.handleStoryMove}
        @story-model-change=${this.handleStoryModelChange}
      ></aos-kanban-board>
    `;
  }

  private renderStoryDetail() {
    if (!this.selectedStory) {
      return this.renderLoading();
    }

    const story = this.selectedStory;

    return html`
      <div class="story-detail-container">
        <div class="story-detail-header">
          <button class="back-btn" @click=${this.handleStoryBack}>
            ← Back to Kanban
          </button>
          <div class="story-title-row">
            <span class="story-id">${story.id}</span>
            <h2>${story.title}</h2>
          </div>
        </div>

        <div class="story-detail-content spec-story-viewer">
          <aos-docs-viewer
            .content=${story.content}
            .filename=${story.id}
            .embedded=${true}
            .editable=${true}
            @save-requested=${this.handleSpecStorySave}
          ></aos-docs-viewer>
        </div>
      </div>
    `;
  }

  private renderBacklogStoryDetail() {
    return html`
      <div class="dashboard-container">
        ${this.renderDashboardTabs()}
        <div class="story-detail-container">
          <div class="story-detail-header">
            <button class="back-btn" @click=${this.handleBacklogStoryBack}>
              ← Back to Backlog
            </button>
            <div class="story-title-row">
              <span class="story-id">${this.backlogStoryId || ''}</span>
              <h2>${this.backlogStoryTitle || ''}</h2>
            </div>
          </div>

          <div class="story-detail-content backlog-story-viewer">
            <aos-docs-viewer
              .content=${this.backlogStoryContent}
              .filename=${this.backlogStoryId || ''}
              .embedded=${true}
              .editable=${true}
              @save-requested=${this.handleBacklogStorySave}
            ></aos-docs-viewer>
          </div>
        </div>
      </div>
    `;
  }

  private handleBacklogStoryBack(): void {
    this.viewMode = 'backlog';
    this.backlogStoryId = null;
    this.backlogStoryContent = '';
    this.backlogStoryTitle = '';
  }

  private handleBacklogStorySave(e: CustomEvent): void {
    const newContent = e.detail.content as string;
    if (!this.backlogStoryId) return;

    gateway.send({
      type: 'backlog.story.save',
      storyId: this.backlogStoryId,
      content: newContent
    });
  }

  private handleSpecStorySave(e: CustomEvent): void {
    const newContent = e.detail.content as string;
    if (!this.selectedStory) return;

    gateway.send({
      type: 'specs.story.save',
      specId: this.selectedSpec?.id,
      storyId: this.selectedStory.id,
      content: newContent
    });
  }

  // UKB-004: formatStatus removed - was only used by inline backlog rendering

  protected override createRenderRoot() {
    return this;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-dashboard-view': AosDashboardView;
  }
}
