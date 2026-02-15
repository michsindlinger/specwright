# CFP-003: Copy-Button im Spec-Viewer-Header

## Story
Als Entwickler moechte ich im Spec-Viewer-Header neben dem Dateinamen ein Copy-Icon sehen, damit ich den Pfad der aktuell angezeigten Datei schnell kopieren kann.

## Typ
Frontend

## Prioritaet
High

## Effort
1 SP

## Akzeptanzkriterien (Gherkin)

### Szenario: Copy-Icon im Viewer-Header
```gherkin
Given der Spec-Viewer ist geoeffnet mit Datei "spec.md"
When ich den Viewer-Header sehe
Then ist ein Clipboard-Icon neben dem Dateinamen sichtbar
```

### Szenario: Pfad wird kopiert
```gherkin
Given der Spec-Viewer zeigt "spec.md" der Spec "2026-02-13-copy-file-path"
When ich auf das Copy-Icon im Header klicke
Then wird "agent-os/specs/2026-02-13-copy-file-path/spec.md" in die Zwischenablage kopiert
And das Icon wechselt zu einem Checkmark
And nach 2 Sekunden wechselt es zurueck
```

### Szenario: Kein Copy-Icon ohne Pfad
```gherkin
Given der Spec-Viewer hat keinen relativePath gesetzt
When der Header gerendert wird
Then wird kein Copy-Icon angezeigt
```

## Technische Verifikation
- [x] RENDER: Copy-Button im `.spec-viewer-header` neben dem Titel
- [x] NOT_RENDER: Kein Button wenn `specViewerRelativePath` leer
- [x] IMPORT: `copy-path.ts` Utility importiert
- [x] TSC_PASS: Keine neuen TypeScript-Fehler

## Betroffene Layer & Komponenten
- **Frontend**: `agent-os-ui/ui/src/components/kanban-board.ts` - Spec-Viewer-Header

## WAS (Fachlich)
- Copy-Icon im Spec-Viewer-Header zwischen Dateiname und Close-Button
- Immer sichtbar (nicht nur bei Hover, da Header-Aktion)
- Klick kopiert den vollen Pfad

## WIE (Technisch)
- Import `copy-path.ts` Utility
- Neuer State `specViewerCopySuccess` fuer Feedback
- Handler `handleCopySpecViewerPath()` nutzt `buildSpecFilePath()`
- Inline SVG Icons (16x16): Clipboard + Checkmark
- CSS: Button zwischen Titel und Close-Button

## WO (Dateien)
- AENDERN: `agent-os-ui/ui/src/components/kanban-board.ts`

## WER (Ausfuehrung)
- Frontend-Entwickler

## Definition of Ready
- [x] Akzeptanzkriterien definiert (Gherkin)
- [x] Betroffene Dateien identifiziert
- [x] Technischer Ansatz klar
- [x] Dependencies: CFP-001

## Definition of Done
- [x] Copy-Button rendert korrekt im Spec-Viewer-Header
- [x] Pfad wird korrekt in Zwischenablage kopiert
- [x] Visuelles Feedback funktioniert
- [x] TypeScript kompiliert ohne neue Fehler

## Status
Done

## Dependencies
- CFP-001 (Utility)
