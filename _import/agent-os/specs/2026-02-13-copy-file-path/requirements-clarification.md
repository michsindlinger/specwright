# Requirements Clarification: Copy File Path

## Feature Summary
Ein Copy-Icon an drei Stellen in der UI, das den relativen Dateipfad (vom Projekt-Root) in die Zwischenablage kopiert. Damit kann der User den Pfad direkt im Chat oder Cloud Terminal wiederverwenden.

## User Need
Als Entwickler arbeite ich mit Claude Code im Chat oder Terminal und brauche haeufig Dateipfade aus der aktuellen Spec. Aktuell muss ich diese manuell zusammenbauen oder aus der URL ableiten. Ein Copy-Icon spart Zeit und verhindert Tippfehler.

## Scope

### IN Scope
1. **Story-Karten im Kanban** - Copy-Icon pro Story-Karte, kopiert den Pfad zur Story-Datei
2. **Spec-Doc-Tabs** - Copy-Icon pro Tab, kopiert den Pfad zur angezeigten Datei
3. **Spec-Viewer-Header** - Copy-Icon neben dem Dateinamen, kopiert den Pfad der aktuell angezeigten Datei

### OUT of Scope
- Keyboard Shortcut zum Kopieren
- Kontextmenue (Rechtsklick)
- Copy-Funktion fuer andere Entitaeten (Spec-ID, Story-ID etc.)
- Aenderungen am Backend/API

## Detailed Requirements

### Pfad-Format
- **Relativ zum Projekt-Root**: z.B. `agent-os/specs/2026-02-13-feature/stories/story-001.md`
- Konstruktion: `agent-os/specs/{specId}/{relativePath}`
- Fuer Story-Karten: `agent-os/specs/{specId}/{storyFile}` (aus kanban.json)

### Visuelles Feedback
- **Icon-Wechsel**: Copy-Icon wird nach Klick kurz zum Checkmark-Icon (wie VS Code)
- Dauer: 2 Sekunden, dann zurueck zum Copy-Icon
- Bei Fehler: Icon bleibt unveraendert (stiller Fehler)

### Datenfluss-Aenderung
- **Story-Karten**: Das Frontend benoetigt den `storyFile`-Pfad aus kanban.json. Aktuell wird dieser NICHT im `StoryInfo`-Interface uebertragen. Das Interface muss um `file?: string` erweitert werden.
- **Spec-Doc-Tabs**: `relativePath` ist bereits im `SpecFileInfo`-Interface vorhanden.
- **Spec-Viewer-Header**: `specViewerRelativePath` ist bereits als State in `kanban-board.ts` vorhanden.

### Icon-Design
- Inline SVG mit `stroke="currentColor"` (bestehender Pattern)
- Kleine Groesse, dezent platziert (nicht dominant)
- Hover-Effekt: Farbaenderung via CSS Custom Properties

## Technical Constraints
- Kein externer Icon-Library (Projekt nutzt Inline-SVG + Emoji)
- `navigator.clipboard.writeText()` API (bereits im Projekt genutzt)
- Lit Web Components mit CSS Custom Properties
- Bestehender Copy-Pattern in `chat-message.ts` als Referenz

## User Approval
- [x] Pfad relativ zum Projekt-Root
- [x] Alle drei Stellen (Story-Karten + Tabs + Viewer-Header)
- [x] Icon-Wechsel als Feedback (Copy -> Checkmark)
