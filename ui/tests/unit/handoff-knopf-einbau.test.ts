/**
 * INT-2026-038 (FA-01): the handoff button sits next to „In VS Code öffnen"
 * in the session header of the single view and in the split-pane header —
 * not in the tab (aos-terminal-tabs).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const quelltext = (datei: string): string => readFileSync(resolve(__dirname, '../../frontend/src/components/terminal', datei), 'utf8');

describe('aos-handoff-knopf einbau', () => {
  it('aos-terminal-session: in .session-header, right before aos-vscode-knopf', () => {
    const src = quelltext('aos-terminal-session.ts');
    expect(src).toContain("import './aos-handoff-knopf.js';");
    const header = src.slice(src.indexOf('<div class="session-header">'), src.indexOf('${showModelOverlay'));
    expect(header).toMatch(/<aos-handoff-knopf \.session=\$\{this\.session\}><\/aos-handoff-knopf>\s*<aos-vscode-knopf/);
  });

  it('aos-cloud-terminal-sidebar: in .pane-header-row for the active session, before aos-vscode-knopf', () => {
    const src = quelltext('aos-cloud-terminal-sidebar.ts');
    expect(src).toContain("import './aos-handoff-knopf.js';");
    const row = src.slice(src.indexOf('<div class="pane-header-row">'), src.indexOf('<div class="pane-header-tabs">'));
    expect(row).toContain('<aos-handoff-knopf .session=${activeSession}></aos-handoff-knopf><aos-vscode-knopf');
  });

  it('not in the tab', () => {
    expect(quelltext('aos-terminal-tabs.ts')).not.toContain('aos-handoff-knopf');
  });
});
