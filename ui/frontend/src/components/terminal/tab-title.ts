import type { TerminalSession } from './aos-cloud-terminal-sidebar.js';

/**
 * Derive the display title for a terminal tab.
 *
 * Precedence:
 * 1. User-set custom name (`customNameSet === true`) wins.
 * 2. Workflow tabs derive from `workflowName` (+ optional `workflowContext`).
 * 3. Fallback to `session.name`.
 */
export function getTabTitle(session: Pick<TerminalSession, 'name' | 'customNameSet' | 'isWorkflow' | 'workflowName' | 'workflowContext'>): string {
  if (session.customNameSet) return session.name;
  if (session.isWorkflow && session.workflowName) {
    return session.workflowContext
      ? `${session.workflowName}: ${session.workflowContext}`
      : session.workflowName;
  }
  return session.name;
}
