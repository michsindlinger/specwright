// @vitest-environment happy-dom
/**
 * INT-2026-010 (FA-17): the project page hosts everything that used to hang
 * in the frame — seven named sections; project switch and close go through
 * the Lit context; „Projekt hinzufügen" bubbles `add-project` to app.ts;
 * „Dateibaum öffnen" bubbles `file-tree-toggle`; „Neues Vorhaben" is gone.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ProjectContextValue } from '../../frontend/src/context/project-context.js';

vi.mock('../../frontend/src/gateway.js', () => ({
  gateway: { send: vi.fn(), on: vi.fn(), off: vi.fn(), getConnectionStatus: () => false, isConnecting: () => false, getProjectPath: vi.fn(), requestGitStatus: vi.fn(), requestGitBranches: vi.fn(), requestGitPrInfo: vi.fn() },
}));
vi.mock('../../frontend/src/services/vorhaben.service.js', () => ({
  vorhabenService: { listProjectDocs: vi.fn(async () => [{ key: 'product-brief', label: 'Product Brief', file: 'docs/product-brief.md', exists: true, dirty: false, mtimeMs: 1000 }]), subscribe: vi.fn(() => () => undefined) },
  VorhabenRequestError: class extends Error {},
}));
vi.mock('../../frontend/src/utils/mermaid-render.js', () => ({ renderMermaidDiagrams: vi.fn(async () => undefined) }));

const switchProject = vi.fn();
const closeProject = vi.fn();
const addProject = vi.fn();

const ctxValue = (): ProjectContextValue => ({
  activeProject: { id: 'a', name: 'Alpha', path: '/a' },
  openProjects: [
    { id: 'a', name: 'Alpha', path: '/a' },
    { id: 'b', name: 'Beta', path: '/b' },
  ],
  switchProject,
  addProject,
  closeProject,
  recentProjects: [
    { path: '/a', name: 'Alpha', lastOpened: 1 },
    { path: '/c', name: 'Gamma', lastOpened: 2 },
  ],
});

const settle = async (el: HTMLElement & { updateComplete: Promise<boolean> }): Promise<void> => {
  for (let i = 0; i < 4; i++) {
    await el.updateComplete;
    await new Promise((r) => setTimeout(r, 2));
  }
};

async function mount(withProject = true) {
  await import('../../frontend/src/components/vorhaben/aos-projekt-seite.js');
  const host = document.createElement('div');
  document.body.appendChild(host);
  const seite = document.createElement('aos-projekt-seite');
  // The context value is what the app's ContextProvider would hand in (no provider in the test tree).
  (seite as unknown as { projectCtx: ProjectContextValue }).projectCtx = ctxValue();
  host.appendChild(seite);
  if (withProject) seite.project = { id: 'a', path: '/a', name: 'Alpha', arbeitskopie: 'main', worktrees: [], hasIntentDir: true };
  await settle(seite);
  return { host, seite };
}

describe('aos-projekt-seite (INT-2026-010, FA-17)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    switchProject.mockClear();
    closeProject.mockClear();
    addProject.mockClear();
  });

  it('renders the seven sections in Light DOM, no „Neues Vorhaben"', async () => {
    const { seite } = await mount();
    expect(seite.shadowRoot).toBeNull();
    const ids = [...seite.querySelectorAll('section.abschnitt')].map((s) => s.getAttribute('data-section'));
    expect(ids).toEqual(['projekt', 'docs', 'git', 'dateien', 'start', 'einstellungen', 'vorlagen']);
    expect(seite.querySelector('aos-naechster-schritt')).toBeNull();
    expect(seite.textContent).not.toContain('Neues Vorhaben');
    expect(seite.querySelector('aos-projekt-git')).not.toBeNull();
    expect(seite.querySelector('aos-settings-view')?.hasAttribute('embedded')).toBe(true);
    expect(seite.querySelector('aos-prompt-templates-view')).not.toBeNull();
    expect(seite.querySelector('aos-getting-started-view')?.projectPath).toBe('/a');
    expect(seite.querySelector('h1')?.textContent).toBe('Alpha');
  });

  it('project section: open projects with the active mark, switch and close via the context, recents without the open ones', async () => {
    const { seite } = await mount();
    const entries = [...seite.querySelectorAll('.projekt-eintrag')];
    expect(entries.map((e) => e.querySelector('.name')?.textContent)).toEqual(['Alpha', 'Beta']);
    expect(entries[0].classList.contains('aktiv')).toBe(true);
    expect(entries[0].querySelector('.marke')?.textContent).toBe('aktiv');
    (entries[1].querySelector('.wahl') as HTMLButtonElement).click();
    expect(switchProject).toHaveBeenCalledWith('b');
    (entries[1].querySelector('.schliessen') as HTMLButtonElement).click();
    expect(closeProject).toHaveBeenCalledWith('b');
    const recents = [...seite.querySelectorAll('.eintrag.recent')].map((e) => e.querySelector('.name')?.textContent);
    expect(recents).toEqual(['Gamma']);
    (seite.querySelector('.eintrag.recent') as HTMLButtonElement).click();
    expect(addProject).toHaveBeenCalledWith({ id: '/c', name: 'Gamma', path: '/c' });
  });

  it('„Projekt hinzufügen" and „Dateibaum öffnen" bubble composed events to the app', async () => {
    const { host, seite } = await mount();
    const seen: string[] = [];
    host.addEventListener('add-project', () => seen.push('add-project'));
    host.addEventListener('file-tree-toggle', () => seen.push('file-tree-toggle'));
    (seite.querySelector('.btn.hinzufuegen') as HTMLButtonElement).click();
    (seite.querySelector('.abschnitt-dateien .btn') as HTMLButtonElement).click();
    expect(seen).toEqual(['add-project', 'file-tree-toggle']);
  });

  it('without a project: hint „unten hinzufügen", only the project and settings sections', async () => {
    const { seite } = await mount(false);
    expect(seite.textContent).toContain('Kein Projekt geöffnet — unten hinzufügen.');
    const ids = [...seite.querySelectorAll('section.abschnitt')].map((s) => s.getAttribute('data-section'));
    expect(ids).toEqual(['projekt', 'einstellungen']);
    expect(seite.querySelector('.btn.hinzufuegen')).not.toBeNull();
  });
});
