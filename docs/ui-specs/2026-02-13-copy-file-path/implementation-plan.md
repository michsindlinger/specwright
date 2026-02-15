# Implementation Plan: Copy File Path

## Overview

Adds a copy-to-clipboard icon at three UI locations to copy the project-root-relative file path of spec documents and story files. Enables quick reuse of paths in Chat or Cloud Terminal.

## Komponenten-Uebersicht

### Neue Datei
| Datei | Zweck |
|-------|-------|
| `agent-os-ui/ui/src/utils/copy-path.ts` | Shared Utility: `copyPathToClipboard()` + `buildSpecFilePath()` |

### Geaenderte Dateien
| Datei | Aenderungen |
|-------|-------------|
| `agent-os-ui/src/server/specs-reader.ts` | `file?: string` zu `StoryInfo` Interface + Befuellung in `convertJsonToKanbanBoard` |
| `agent-os-ui/ui/src/components/story-card.ts` | `file?: string` in `StoryInfo`, `specId` Property, Copy-Button im Header |
| `agent-os-ui/ui/src/components/kanban-board.ts` | `specId` an Story-Cards + File-Tabs durchreichen, Copy-Button im Spec-Viewer-Header |
| `agent-os-ui/ui/src/components/specs/aos-spec-file-tabs.ts` | `specId` Property, Copy-Button pro Tab |

## Datenfluss

```
kanban.json (storyFile/file)
  -> specs-reader.ts (StoryInfo.file)
    -> WebSocket
      -> Frontend StoryInfo.file
        -> story-card.ts (Copy-Button)

specViewerRelativePath (already in Frontend)
  -> kanban-board.ts (Copy-Button im Viewer-Header)

SpecFileInfo.relativePath (already in Frontend)
  -> aos-spec-file-tabs.ts (Copy-Button pro Tab)
```

### Pfad-Konstruktion
`buildSpecFilePath(specId, relativePath)` => `agent-os/specs/{specId}/{relativePath}`

## Komponenten-Verbindungen

| Source | Target | Verbindungsart | Story |
|--------|--------|---------------|-------|
| specs-reader.ts | story-card.ts | StoryInfo.file via WebSocket | Story 1 -> Story 2 |
| kanban-board.ts | story-card.ts | `.specId` Property-Binding | Story 3 |
| kanban-board.ts | aos-spec-file-tabs.ts | `spec-id` Attribute-Binding | Story 3 |
| copy-path.ts | story-card.ts | Import utility | Story 2 |
| copy-path.ts | aos-spec-file-tabs.ts | Import utility | Story 4 |
| copy-path.ts | kanban-board.ts | Import utility | Story 3 |

## Implementierungs-Reihenfolge

1. **Story 1 (Backend)**: Utility erstellen + Backend `StoryInfo` erweitern
2. **Story 2 (Frontend)**: Copy-Button auf Story-Karten
3. **Story 3 (Frontend)**: Copy-Button im Spec-Viewer-Header + specId durchreichen
4. **Story 4 (Frontend)**: Copy-Button auf Spec-Doc-Tabs

## Edge Cases

- **Backlog-Modus**: Kein `file`-Feld -> Copy-Button wird nicht gerendert
- **MD-Fallback**: Kein kanban.json -> kein `file` -> kein Copy-Button
- **v1 vs v2 kanban.json**: `file` vs `storyFile` -> beide Formate unterstuetzt
- **Clipboard API**: `navigator.clipboard` nicht verfuegbar in unsicheren Kontexten -> stiller Fehler

## Self-Review

- [x] Datenfluss lueckenlos: kanban.json -> Backend -> WebSocket -> Frontend -> UI
- [x] Alle drei Copy-Stellen abgedeckt
- [x] Visuelles Feedback konsistent (Clipboard -> Checkmark -> Revert)
- [x] Pfad-Format: projekt-root-relativ
- [x] Backlog-Modus behandelt
- [x] Keine unnoetige API-Aenderung
- [x] Minimale Aenderungen
