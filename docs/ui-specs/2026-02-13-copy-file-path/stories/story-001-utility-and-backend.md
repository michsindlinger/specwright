# CFP-001: Copy-Path Utility & Backend StoryInfo Erweiterung

## Story
Als Entwickler moechte ich, dass die Story-Dateipfade vom Backend an das Frontend uebertragen werden, damit die Copy-Funktion den korrekten Pfad kennt.

## Typ
Backend + Utility

## Prioritaet
High

## Effort
2 SP

## Akzeptanzkriterien (Gherkin)

### Szenario: Pfad-Utility erstellt korrekten Pfad
```gherkin
Given eine specId "2026-02-13-feature" und ein relativePath "stories/story-001.md"
When buildSpecFilePath aufgerufen wird
Then wird "agent-os/specs/2026-02-13-feature/stories/story-001.md" zurueckgegeben
```

### Szenario: Backend uebertraegt file-Feld
```gherkin
Given ein Kanban mit Story die storyFile "stories/story-001.md" hat
When das Kanban-Board geladen wird
Then enthaelt StoryInfo ein file-Feld mit Wert "stories/story-001.md"
```

### Szenario: Clipboard-Utility kopiert Text
```gherkin
Given ein Pfad-String "agent-os/specs/test/spec.md"
When copyPathToClipboard aufgerufen wird
Then wird der Text in die Zwischenablage kopiert
And das Button-Element erhaelt die Klasse "copy-path--copied"
And nach 2 Sekunden wird die Klasse entfernt
```

## Technische Verifikation
- [x] FILE_EXISTS: `agent-os-ui/ui/src/utils/copy-path.ts`
- [x] FUNCTION_EXISTS: `buildSpecFilePath(specId, relativePath)`
- [x] FUNCTION_EXISTS: `copyPathToClipboard(path, button)`
- [x] INTERFACE_FIELD: `StoryInfo.file?: string` in `specs-reader.ts`
- [x] MAPPING: `convertJsonToKanbanBoard` befuellt `file` aus `storyFile || file`
- [x] TSC_PASS: `cd agent-os-ui/ui && npx tsc --noEmit` (keine neuen Fehler)

## Betroffene Layer & Komponenten
- **Backend**: `agent-os-ui/src/server/specs-reader.ts` - StoryInfo Interface + Mapping
- **Frontend Utility**: `agent-os-ui/ui/src/utils/copy-path.ts` - Neue Datei

## WAS (Fachlich)
- Shared Utility mit `buildSpecFilePath()` und `copyPathToClipboard()` erstellen
- Backend `StoryInfo` Interface um optionales `file`-Feld erweitern
- In `convertJsonToKanbanBoard` das `file`-Feld aus kanban.json befuellen

## WIE (Technisch)
- Neue Datei `copy-path.ts` mit zwei exportierten Funktionen
- `StoryInfo` in `specs-reader.ts` erweitern: `file?: string`
- Mapping: `(s as { storyFile?: string }).storyFile || s.file || undefined`
- Beide kanban.json Formate (v1: `file`, v2: `storyFile`) unterstuetzen

## WO (Dateien)
- NEU: `agent-os-ui/ui/src/utils/copy-path.ts`
- AENDERN: `agent-os-ui/src/server/specs-reader.ts`

## WER (Ausfuehrung)
- Backend-Entwickler

## Definition of Ready
- [x] Akzeptanzkriterien definiert (Gherkin)
- [x] Betroffene Dateien identifiziert
- [x] Technischer Ansatz klar
- [x] Dependencies: keine

## Definition of Done
- [x] Utility-Funktionen implementiert und exportiert
- [x] Backend StoryInfo.file befuellt
- [x] TypeScript kompiliert ohne neue Fehler
- [x] Bestehende Funktionalitaet nicht beeintraechtigt

## Dependencies
Keine

## Creates Reusable
- `copy-path.ts` Utility (wiederverwendbar fuer zukuenftige Copy-Features)
