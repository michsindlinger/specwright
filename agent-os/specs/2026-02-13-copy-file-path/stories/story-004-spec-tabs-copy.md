# CFP-004: Copy-Button auf Spec-Doc-Tabs

## Story
Als Entwickler moechte ich auf jedem Spec-Doc-Tab ein Copy-Icon sehen, damit ich den Dateipfad des jeweiligen Dokuments schnell kopieren kann, ohne es erst oeffnen zu muessen.

## Typ
Frontend

## Prioritaet
High

## Effort
2 SP

## Akzeptanzkriterien (Gherkin)

### Szenario: Copy-Icon erscheint beim Hover ueber Tab
```gherkin
Given die Spec-Doc-Tabs sind sichtbar mit mehreren Dateien
When ich mit der Maus ueber einen Tab hovere
Then wird ein Clipboard-Icon rechts neben dem Dateinamen sichtbar
```

### Szenario: Pfad wird kopiert
```gherkin
Given ein Tab fuer "spec.md" in Spec "2026-02-13-copy-file-path"
When ich auf das Copy-Icon im Tab klicke
Then wird "agent-os/specs/2026-02-13-copy-file-path/spec.md" in die Zwischenablage kopiert
And das Icon wechselt zu einem Checkmark
And nach 2 Sekunden wechselt es zurueck
```

### Szenario: Tab-Klick wird nicht ausgeloest
```gherkin
Given ein Tab mit Copy-Icon
When ich auf das Copy-Icon klicke
Then wird NUR der Pfad kopiert
And die Datei wird NICHT gewechselt (kein file-selected Event)
```

## Technische Verifikation
- [x] RENDER: Copy-Icon in jedem Tab-Button
- [x] PROPERTY: `specId` Property auf `aos-spec-file-tabs`
- [x] BINDING: `kanban-board.ts` uebergibt `spec-id` an File-Tabs
- [x] EVENT_STOP: Click auf Copy-Icon loest NICHT `file-selected` aus
- [x] TSC_PASS: Keine neuen TypeScript-Fehler

## Betroffene Layer & Komponenten
- **Frontend**: `agent-os-ui/ui/src/components/specs/aos-spec-file-tabs.ts` - Copy-Button + CSS
- **Frontend**: `agent-os-ui/ui/src/components/kanban-board.ts` - spec-id Binding

## WAS (Fachlich)
- Copy-Icon rechts neben dem Dateinamen in jedem Tab
- Erscheint nur beim Hover ueber den Tab
- Klick kopiert den vollen Pfad ohne die Datei zu wechseln

## WIE (Technisch)
- Neue Property `specId` auf `aos-spec-file-tabs`
- Import `copy-path.ts` Utility
- State `copiedPath` trackt welcher Tab gerade kopiert wurde
- Inline SVG Icons (12x12): Clipboard + Checkmark
- CSS: opacity 0 -> 1 on tab hover
- `e.stopPropagation()` um Tab-Click zu verhindern

## WO (Dateien)
- AENDERN: `agent-os-ui/ui/src/components/specs/aos-spec-file-tabs.ts`
- AENDERN: `agent-os-ui/ui/src/components/kanban-board.ts` (spec-id Binding)

## WER (Ausfuehrung)
- Frontend-Entwickler

## Definition of Ready
- [x] Akzeptanzkriterien definiert (Gherkin)
- [x] Betroffene Dateien identifiziert
- [x] Technischer Ansatz klar
- [x] Dependencies: CFP-001

## Definition of Done
- [x] Copy-Button rendert korrekt auf allen Tabs
- [x] Pfad wird korrekt in Zwischenablage kopiert
- [x] Visuelles Feedback funktioniert
- [x] Tab-Click wird nicht ausgeloest beim Copy
- [x] specId wird korrekt durchgereicht
- [x] TypeScript kompiliert ohne neue Fehler

## Dependencies
- CFP-001 (Utility)

## Integration DoD
- [x] `spec-id` wird von `kanban-board.ts` korrekt an `aos-spec-file-tabs` uebergeben
