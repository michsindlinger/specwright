export interface FocusSpecInfo {
  id: string;
  name: string;
  assignedToBot?: boolean;
}

export interface FocusBacklogStory {
  id: string;
  title: string;
  type: 'user-story' | 'bug';
  status: 'backlog' | 'in_progress' | 'in_review' | 'done' | 'blocked';
}

export interface FocusBacklogBoard {
  stories: FocusBacklogStory[];
}

export interface FocusIncident {
  type: string;
  message: string;
  storyId?: string;
  timestamp: string;
}

export interface FocusAutoModeSnapshot {
  enabled: boolean;
  paused: boolean;
  incidents?: FocusIncident[];
}

export type FocusItemType = 'blocked-story' | 'paused-auto-mode' | 'incident';
export type FocusAccent = 'warning' | 'error' | 'info';

export interface FocusItem {
  type: FocusItemType;
  title: string;
  subtitle: string;
  accent: FocusAccent;
  targetRoute: string;
}

/**
 * Derives focus-strip items from specs, backlog, and auto-mode state.
 * Pure function — no side effects, no imports with DOM/Lit dependencies.
 *
 * Sources:
 *   (a) Blocked stories in backlog
 *   (b) Specs assigned to bot while auto-mode is paused
 *   (c) Unread auto-mode incidents
 */
export function deriveFocusItems(
  specs: FocusSpecInfo[],
  backlog: FocusBacklogBoard | null,
  autoMode: FocusAutoModeSnapshot | null
): FocusItem[] {
  const items: FocusItem[] = [];

  if (backlog) {
    for (const story of backlog.stories) {
      if (story.status === 'blocked') {
        items.push({
          type: 'blocked-story',
          title: story.title,
          subtitle: `${story.type === 'bug' ? 'Bug' : 'Story'} · ${story.id}`,
          accent: 'warning',
          targetRoute: `backlog/${story.id}`,
        });
      }
    }
  }

  if (autoMode?.paused) {
    for (const spec of specs) {
      if (spec.assignedToBot) {
        items.push({
          type: 'paused-auto-mode',
          title: spec.name,
          subtitle: 'Auto-Mode pausiert',
          accent: 'warning',
          targetRoute: `specs/${spec.id}`,
        });
      }
    }
  }

  if (autoMode?.incidents) {
    for (const incident of autoMode.incidents) {
      items.push({
        type: 'incident',
        title: incident.storyId ?? 'Auto-Mode',
        subtitle: incident.message,
        accent: 'error',
        targetRoute: incident.storyId ? `specs/${incident.storyId}` : 'specs',
      });
    }
  }

  return items;
}
