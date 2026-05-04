# Changelog

## 3.27.0 - 2026-05-04

### Behoben
- Auto-Mode Worktree-Strategie: Spec-Worktree-Symlinks ersetzt durch echte Datei-Kopie + `chore:`-Seed-Commit auf Feature-Branch. Symlinks haben `git status --porcelain` dauerhaft als dirty gezeigt → `isWorktreeClean()` blockierte `finalizeSpecExecution` → kein `git push`, kein `gh pr create`. Nach Fix entsteht der PR automatisch am Ende der Story-Ausführung.
- Symlink-Pollution-Folgefehler (`fatal: pathspec ... is beyond a symbolic link`) bei Claude-`git add` im Worktree fällt weg.
- Backlog-Auto-Mode analog migriert.

### Geändert
- MCP `kanban-mcp-server.ts` resolved Projektpfad jetzt über `SPECWRIGHT_MAIN_PROJECT_PATH` env-var (vom UI-Server gesetzt, wenn Claude im Worktree läuft). Schreib- und Lese-Operationen landen im Hauptprojekt → UI sieht Live-Fortschritt ohne Symlink.
- `.mcp.json` wird ins Worktree kopiert statt verlinkt.
- Alte Worktrees mit Legacy-Symlinks werden beim nächsten Auto-Mode-Run automatisch migriert (Symlink → Real-Seed).

## 3.19.3 - 2026-04-16

### Behoben
- UI `_initializeKanbanBoard` legte ein Legacy `kanban-board.md` an, obwohl `kanban.json` (v4.0) vom Workflow erstellt werden sollte — Folge: UI-Fallback hat die JSON-Version verschattet, wenn /create-spec Step 8.2 (MCP `kanban_create`) nicht ausgeführt wurde. Die Methode prüft jetzt zuerst auf `kanban.json` und bricht ab, bevor ein MD-Fallback geschrieben wird.

## 3.1.0 - 2026-02-18

### Neu
- Update-Benachrichtigung fuer CLI und UI
- `check-update.sh` Script fuer Versionspruefung
- `/check-update` Slash Command
- `VERSION` Datei als Single Source of Truth
- Update-Banner in der Getting Started Seite

### Geaendert
- `install.sh` schreibt jetzt `.installed-version` pro Projekt und `.version` global
- create-spec v3.6: Phase Detection und Resume Support

## 3.0.0 - 2026-01-15

Initiales Open Source Release.
