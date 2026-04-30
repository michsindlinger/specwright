/**
 * tab-title helper tests
 *
 * Validates display-title derivation for terminal tabs.
 * Custom rename (customNameSet) must override auto-derivation for both
 * regular and workflow tabs.
 */

import { describe, it, expect } from 'vitest';
import { getTabTitle } from '../../frontend/src/components/terminal/tab-title';

describe('getTabTitle', () => {
  it('returns session.name for regular tab without custom rename', () => {
    expect(
      getTabTitle({
        name: 'Claude Session 1',
        customNameSet: false,
      })
    ).toBe('Claude Session 1');
  });

  it('returns session.name when user has renamed (customNameSet=true)', () => {
    expect(
      getTabTitle({
        name: 'Frontend Hot-Fix',
        customNameSet: true,
      })
    ).toBe('Frontend Hot-Fix');
  });

  it('derives workflowName for workflow tab without context', () => {
    expect(
      getTabTitle({
        name: 'execute-tasks',
        customNameSet: false,
        isWorkflow: true,
        workflowName: 'execute-tasks',
      })
    ).toBe('execute-tasks');
  });

  it('derives "workflowName: context" for workflow tab with context', () => {
    expect(
      getTabTitle({
        name: 'execute-tasks: FE-001',
        customNameSet: false,
        isWorkflow: true,
        workflowName: 'execute-tasks',
        workflowContext: 'FE-001',
      })
    ).toBe('execute-tasks: FE-001');
  });

  it('user rename wins over workflow auto-derivation', () => {
    expect(
      getTabTitle({
        name: 'My Renamed Workflow',
        customNameSet: true,
        isWorkflow: true,
        workflowName: 'execute-tasks',
        workflowContext: 'FE-001',
      })
    ).toBe('My Renamed Workflow');
  });
});
