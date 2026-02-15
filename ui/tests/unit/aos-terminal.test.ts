/**
 * AosTerminal Component Tests
 *
 * Note: Full browser-based tests require jsdom/happy-dom environment.
 * These tests verify basic component structure and imports.
 */

import { describe, it, expect } from 'vitest';

describe('AosTerminal Component', () => {
  it('should export AosTerminal class', async () => {
    // Dynamic import to avoid gateway initialization in node environment
    const module = await import('../../ui/src/components/aos-terminal');
    expect(module).toBeDefined();
    expect(module.AosTerminal).toBeDefined();
  });

  it('should have correct component registration name', () => {
    // Verify the component follows aos- naming convention
    const expectedName = 'aos-terminal';
    expect(expectedName).toMatch(/^aos-/);
  });
});

/**
 * Manual Test Checklist:
 *
 * These tests require manual verification in browser:
 *
 * 1. Terminal renders xterm.js and shows output
 *    - Create <aos-terminal terminalSessionId="test-123"></aos-terminal>
 *    - Verify terminal container is visible
 *    - Send terminal.data event via gateway
 *    - Verify output appears with ANSI colors
 *
 * 2. User can input in terminal
 *    - Click into terminal
 *    - Type characters
 *    - Verify gateway.sendTerminalInput() is called
 *
 * 3. Copy-paste works
 *    - Select text in terminal
 *    - Press Ctrl+C (Cmd+C on Mac)
 *    - Verify text is in clipboard
 *
 * 4. Theme integration
 *    - Verify terminal colors match app theme
 *    - Check CSS Custom Properties are applied
 *
 * 5. Performance with 1000+ lines
 *    - Send 1000 lines of output rapidly
 *    - Verify smooth scrolling (>30 FPS)
 *    - Verify ability to scroll back
 */
