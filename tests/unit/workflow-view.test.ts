/**
 * Unit Tests for Workflow View Terminal Integration (PTY-004)
 *
 * Tests view switching logic between chat and terminal modes
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fixture, html } from '@open-wc/testing';
import { executionStore } from '../../ui/src/stores/execution-store.js';
import type { AosWorkflowView } from '../../ui/src/views/workflow-view.js';
import '../../ui/src/views/workflow-view.js';

describe('Workflow View - Terminal Integration (PTY-004)', () => {
  let element: AosWorkflowView;

  beforeEach(async () => {
    // Clear execution store before each test
    executionStore.clear();

    // Create fixture
    element = await fixture<AosWorkflowView>(
      html`<aos-workflow-view></aos-workflow-view>`
    );
  });

  describe('Conditional Rendering', () => {
    it('should render chat view by default (no terminal active)', async () => {
      // Add execution without terminal mode
      executionStore.addExecution('exec-1', 'cmd-1', 'Test Workflow');
      executionStore.updateStatus('exec-1', 'running');
      executionStore.addMessage('exec-1', {
        id: 'msg-1',
        role: 'assistant',
        content: 'Hello from chat',
        timestamp: new Date().toISOString()
      });

      await element.updateComplete;

      // Chat should be visible
      const chat = element.querySelector('aos-workflow-chat');
      expect(chat).to.exist;

      // Terminal should not be rendered
      const terminal = element.querySelector('aos-terminal');
      expect(terminal).to.not.exist;
    });

    it('should render terminal when terminalActive is true', async () => {
      // Add execution with terminal mode
      executionStore.addExecution('exec-1', 'cmd-1', 'Terminal Workflow');
      executionStore.enableTerminal('exec-1', 'exec-1'); // terminalSessionId = executionId

      await element.updateComplete;

      // Terminal should be visible
      const terminal = element.querySelector('aos-terminal');
      expect(terminal).to.exist;
      expect(terminal?.getAttribute('terminalSessionId')).to.equal('exec-1');

      // Chat should not be rendered
      const chat = element.querySelector('aos-workflow-chat');
      expect(chat).to.not.exist;
    });

    it('should bind terminalSessionId property correctly', async () => {
      const sessionId = 'terminal-session-123';

      executionStore.addExecution('exec-1', 'cmd-1', 'Test');
      executionStore.enableTerminal('exec-1', sessionId);

      await element.updateComplete;

      const terminal = element.querySelector('aos-terminal');
      expect(terminal?.getAttribute('terminalSessionId')).to.equal(sessionId);
    });
  });

  describe('Back to Dashboard Button', () => {
    it('should show back button when exitCode is set', async () => {
      executionStore.addExecution('exec-1', 'cmd-1', 'Test');
      executionStore.enableTerminal('exec-1', 'exec-1');
      executionStore.setTerminalExitCode('exec-1', 0);

      await element.updateComplete;

      const backButton = element.querySelector('.back-to-dashboard-btn');
      expect(backButton).to.exist;
      expect(backButton?.textContent).to.include('Back to Dashboard');
    });

    it('should not show back button when workflow is still running (exitCode = null)', async () => {
      executionStore.addExecution('exec-1', 'cmd-1', 'Test');
      executionStore.enableTerminal('exec-1', 'exec-1');
      // Don't set exitCode - still running

      await element.updateComplete;

      const backButton = element.querySelector('.back-to-dashboard-btn');
      expect(backButton).to.not.exist;
    });

    it('should display exit code badge with success styling (exit code 0)', async () => {
      executionStore.addExecution('exec-1', 'cmd-1', 'Test');
      executionStore.enableTerminal('exec-1', 'exec-1');
      executionStore.setTerminalExitCode('exec-1', 0);

      await element.updateComplete;

      const badge = element.querySelector('.exit-code-badge');
      expect(badge).to.exist;
      expect(badge?.textContent).to.include('Process exited with code 0');
      expect(badge?.classList.contains('exit-success')).to.be.true;
    });

    it('should display exit code badge with error styling (exit code > 0)', async () => {
      executionStore.addExecution('exec-1', 'cmd-1', 'Test');
      executionStore.enableTerminal('exec-1', 'exec-1');
      executionStore.setTerminalExitCode('exec-1', 1);

      await element.updateComplete;

      const badge = element.querySelector('.exit-code-badge');
      expect(badge).to.exist;
      expect(badge?.textContent).to.include('Process exited with code 1');
      expect(badge?.classList.contains('exit-error')).to.be.true;
    });

    it('should clean up terminal state when clicking back button', async () => {
      executionStore.addExecution('exec-1', 'cmd-1', 'Test');
      executionStore.enableTerminal('exec-1', 'exec-1');
      executionStore.setTerminalExitCode('exec-1', 0);

      await element.updateComplete;

      const backButton = element.querySelector('.back-to-dashboard-btn') as HTMLButtonElement;
      expect(backButton).to.exist;

      // Click back button
      backButton.click();
      await element.updateComplete;

      // Execution should be removed
      expect(executionStore.getExecution('exec-1')).to.be.undefined;
    });
  });

  describe('Multi-Workflow Terminal Isolation', () => {
    it('should render terminal for active execution only', async () => {
      // Add two executions with terminals
      executionStore.addExecution('exec-1', 'cmd-1', 'Workflow A');
      executionStore.enableTerminal('exec-1', 'terminal-a');

      executionStore.addExecution('exec-2', 'cmd-2', 'Workflow B');
      executionStore.enableTerminal('exec-2', 'terminal-b');

      // Set exec-1 as active
      executionStore.setActiveExecution('exec-1');

      await element.updateComplete;

      // Should render terminal with session ID from exec-1
      const terminal = element.querySelector('aos-terminal');
      expect(terminal).to.exist;
      expect(terminal?.getAttribute('terminalSessionId')).to.equal('terminal-a');
    });

    it('should switch terminal when switching active execution', async () => {
      executionStore.addExecution('exec-1', 'cmd-1', 'Workflow A');
      executionStore.enableTerminal('exec-1', 'terminal-a');

      executionStore.addExecution('exec-2', 'cmd-2', 'Workflow B');
      executionStore.enableTerminal('exec-2', 'terminal-b');

      executionStore.setActiveExecution('exec-1');
      await element.updateComplete;

      let terminal = element.querySelector('aos-terminal');
      expect(terminal?.getAttribute('terminalSessionId')).to.equal('terminal-a');

      // Switch to exec-2
      executionStore.setActiveExecution('exec-2');
      await element.updateComplete;

      terminal = element.querySelector('aos-terminal');
      expect(terminal?.getAttribute('terminalSessionId')).to.equal('terminal-b');
    });
  });

  describe('Execution Store Integration', () => {
    it('should have terminalSessionId in ExecutionState interface', () => {
      executionStore.addExecution('exec-1', 'cmd-1', 'Test');
      executionStore.enableTerminal('exec-1', 'session-123');

      const execution = executionStore.getExecution('exec-1');
      expect(execution?.terminalSessionId).to.equal('session-123');
      expect(execution?.terminalActive).to.be.true;
      expect(execution?.exitCode).to.be.null;
    });

    it('should update exitCode in ExecutionState', () => {
      executionStore.addExecution('exec-1', 'cmd-1', 'Test');
      executionStore.enableTerminal('exec-1', 'session-123');
      executionStore.setTerminalExitCode('exec-1', 0);

      const execution = executionStore.getExecution('exec-1');
      expect(execution?.exitCode).to.equal(0);
    });

    it('should disable terminal mode when calling disableTerminal', () => {
      executionStore.addExecution('exec-1', 'cmd-1', 'Test');
      executionStore.enableTerminal('exec-1', 'session-123');

      let execution = executionStore.getExecution('exec-1');
      expect(execution?.terminalActive).to.be.true;

      executionStore.disableTerminal('exec-1');
      execution = executionStore.getExecution('exec-1');

      expect(execution?.terminalActive).to.be.false;
      expect(execution?.terminalSessionId).to.be.undefined;
      expect(execution?.exitCode).to.be.undefined;
    });
  });
});
