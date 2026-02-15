# CFP-002: Copy-Button auf Story-Karten

## Story
Als Entwickler moechte ich auf jeder Story-Karte im Kanban-Board ein Copy-Icon sehen, damit ich den Dateipfad der Story schnell in die Zwischenablage kopieren kann.

## Typ
Frontend

## Prioritaet
High

## Effort
2 SP

## Akzeptanzkriterien (Gherkin)

### Szenario: Copy-Icon erscheint beim Hover
```gherkin
Given eine Story-Karte mit file-Feld im Kanban-Board
When ich mit der Maus ueber die Karte hovere
Then wird ein Clipboard-Icon im Story-Header sichtbar
```

### Szenario: Pfad wird kopiert
```gherkin
Given eine Story-Karte mit ID "CFP-001" und file "stories/story-001.md" in Spec "2026-02-13-copy-file-path"
When ich auf das Copy-Icon klicke
Then wird "agent-os/specs/2026-02-13-copy-file-path/stories/story-001.md" in die Zwischenablage kopiert
And das Icon wechselt zu einem Checkmark
And nach 2 Sekunden wechselt es zurueck zum Clipboard-Icon
```

### Szenario: Kein Copy-Icon ohne file-Feld
```gherkin
Given eine Story-Karte ohne file-Feld (z.B. Backlog-Story)
When die Karte gerendert wird
Then wird kein Copy-Icon angezeigt
```

## Technische Verifikation
- [x] RENDER: Copy-Button im `.story-header` wenn `story.file` vorhanden
- [x] NOT_RENDER: Kein Copy-Button wenn `story.file` undefined
- [x] PROPERTY: `specId` Property auf `aos-story-card`
- [x] BINDING: `kanban-board.ts` uebergibt `.specId` an Story-Cards
- [x] EVENT_STOP: Click auf Copy-Button loest NICHT `story-select` aus
- [x] TSC_PASS: Keine neuen TypeScript-Fehler

## Betroffene Layer & Komponenten
- **Frontend**: `agent-os-ui/ui/src/components/story-card.ts` - Copy-Button + CSS
- **Frontend**: `agent-os-ui/ui/src/components/kanban-board.ts` - specId Property-Binding

## WAS (Fachlich)
- Copy-Icon im Story-Header neben der Story-ID
- Erscheint nur beim Hover (dezent, nicht dominant)
- Klick kopiert den vollen Pfad und zeigt Checkmark-Feedback
- Kein Icon wenn kein file-Feld vorhanden

## WIE (Technisch)
- `StoryInfo` Interface in `story-card.ts` erweitern: `file?: string`
- Neue Property `specId` auf `aos-story-card`
- Import `copy-path.ts` Utility
- Inline SVG Icons (14x14): Clipboard + Checkmark
- CSS: opacity 0 -> 1 on hover, Farbe via Custom Properties
- `e.stopPropagation()` um Card-Click zu verhindern

## WO (Dateien)
- AENDERN: `agent-os-ui/ui/src/components/story-card.ts`
- AENDERN: `agent-os-ui/ui/src/components/kanban-board.ts` (specId Binding)

## WER (Ausfuehrung)
- Frontend-Entwickler

## Definition of Ready
- [x] Akzeptanzkriterien definiert (Gherkin)
- [x] Betroffene Dateien identifiziert
- [x] Technischer Ansatz klar
- [x] Dependencies: CFP-001

## Definition of Done
- [x] Copy-Button rendert korrekt auf Story-Karten
- [x] Pfad wird korrekt in Zwischenablage kopiert
- [x] Visuelles Feedback (Icon-Wechsel) funktioniert
- [x] Kein Copy-Button fuer Stories ohne file-Feld
- [x] Event-Propagation gestoppt
- [x] TypeScript kompiliert ohne neue Fehler

## Dependencies
- CFP-001 (Utility + Backend)

## Integration DoD
- [x] `specId` wird von `kanban-board.ts` korrekt an `story-card` uebergeben
- [x] `StoryInfo.file` wird vom Backend korrekt befuellt
