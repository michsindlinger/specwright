# Progress Summary Display

> Story ID: KAE-003
> Spec: kanban-auto-execution
> Created: 2026-01-31
> Last Updated: 2026-01-31

**Priority**: Medium
**Type**: Frontend
**Estimated Effort**: S
**Dependencies**: KAE-001, KAE-002
**Status**: Done

---

## Feature

```gherkin
Feature: Progress Summary Anzeige im Kanban Header
  Als Entwickler
  möchte ich während des Auto-Mode den aktuellen Fortschritt sehen,
  damit ich weiß welche Story gerade ausgeführt wird und in welcher Phase.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Progress Summary wird angezeigt

```gherkin
Scenario: Progress Summary erscheint bei aktivem Auto-Mode
  Given der Auto-Mode ist aktiviert
  And eine Story wird gerade ausgeführt
  When ich das Kanban Board betrachte
  Then sehe ich eine Progress Summary im Header
  And die Summary zeigt die aktuelle Story-ID und Titel
  And die Summary zeigt die aktuelle Phase (1-5)
```

### Szenario 2: Phase-Anzeige aktualisiert sich

```gherkin
Scenario: Phase-Indikator aktualisiert sich in Echtzeit
  Given der Auto-Mode ist aktiviert
  And Story "KAE-001" wird in Phase 2 ausgeführt
  When die Phase 2 abgeschlossen wird und Phase 3 startet
  Then aktualisiert sich die Phase-Anzeige auf "Phase 3"
  And die Anzeige zeigt "3/5" als Fortschritt
```

### Szenario 3: Story-Information in Summary

```gherkin
Scenario: Story-Details in der Summary
  Given der Auto-Mode ist aktiviert
  And Story "KAE-001: Auto-Mode Toggle Component" wird ausgeführt
  When ich die Progress Summary betrachte
  Then sehe ich "KAE-001" als Story-ID
  And ich sehe "Auto-Mode Toggle Component" als Titel (gekürzt wenn nötig)
```

### Szenario 4: Summary versteckt sich bei Inaktivität

```gherkin
Scenario: Progress Summary bei deaktiviertem Auto-Mode
  Given der Auto-Mode ist deaktiviert
  When ich das Kanban Board betrachte
  Then ist die Progress Summary NICHT sichtbar
  And nur der Toggle ist im Header sichtbar
```

### Szenario 5: Completion State

```gherkin
Scenario: Progress Summary zeigt Completion
  Given der Auto-Mode ist aktiviert
  And alle Stories sind abgeschlossen
  When die letzte Story abgeschlossen wird
  Then zeigt die Summary kurz "✓ Alle Stories abgeschlossen"
  And nach 3 Sekunden verschwindet die Summary
  And der Auto-Mode Toggle wird deaktiviert
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Langer Story-Titel
  Given eine Story hat einen Titel mit mehr als 40 Zeichen
  When die Story in der Progress Summary angezeigt wird
  Then wird der Titel nach 37 Zeichen mit "..." abgeschnitten
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [ ] FILE_EXISTS: agent-os-ui/ui/src/components/kanban-board.ts enthält Progress Summary

### Inhalt-Prüfungen

- [ ] CONTAINS: kanban-board.ts enthält "progressSummary" oder "autoModeProgress"
- [ ] CONTAINS: kanban-board.ts enthält "currentPhase" als State oder Property
- [ ] CONTAINS: kanban-board.ts enthält "currentStoryId" als State oder Property

### Funktions-Prüfungen

- [ ] LINT_PASS: npm run lint exits with code 0
- [ ] BUILD_PASS: npm run build exits with code 0

---

## Required MCP Tools

| Tool | Purpose | Blocking |
|------|---------|----------|
| None | - | - |

---

## Technisches Refinement (vom Architect)

> **Ausgefüllt:** 2026-01-31

### DoR (Definition of Ready) - Vom Architect

#### Fachliche Anforderungen
- [x] Fachliche requirements klar definiert
- [x] Akzeptanzkriterien sind spezifisch und prüfbar
- [x] Business Value verstanden

#### Technische Vorbereitung
- [x] Technischer Ansatz definiert (WAS/WIE/WO)
- [x] Abhängigkeiten identifiziert
- [x] Betroffene Komponenten bekannt
- [x] Erforderliche MCP Tools dokumentiert (falls zutreffend)
- [x] Story ist angemessen geschätzt (max 5 Dateien, 400 LOC)

#### Full-Stack Konsistenz
- [x] **Alle betroffenen Layer identifiziert**
- [x] **Integration Type bestimmt**
- [x] **Kritische Integration Points dokumentiert** (wenn Full-stack)
- [x] **Handover-Dokumente definiert** (bei Multi-Layer)

**Story ist READY wenn alle Checkboxen angehakt sind.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [x] Code implementiert und folgt Style Guide
- [x] Architektur-Vorgaben eingehalten (WIE section)
- [x] Security/Performance Anforderungen erfüllt

#### Qualitätssicherung
- [x] Alle Akzeptanzkriterien erfüllt (via Completion Check verifiziert)
- [x] Unit Tests geschrieben und bestanden
- [x] Integration Tests geschrieben und bestanden
- [x] Code Review durchgeführt und genehmigt

#### Dokumentation
- [x] Dokumentation aktualisiert
- [x] Keine Linting Errors
- [x] Completion Check Commands alle erfolgreich (exit 0)

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | kanban-board.ts | Progress Summary im Header |
| Frontend | gateway.ts | Listener für Phase-Updates |

**Kritische Integration Points:**
- Muss WebSocket Events `workflow.interactive.message` für Phase-Updates empfangen
- Phase-Information aus Backend-Events extrahieren

---

### Technical Details

**WAS:**
- Interface `AutoModeProgress { storyId: string; storyTitle: string; currentPhase: number; totalPhases: 5 }`
- @state() `autoModeProgress: AutoModeProgress | null`
- HTML-Element im kanban-header (nach Toggle, vor Warning)
- Bedingte Anzeige: nur wenn autoModeEnabled && autoModeProgress

**WIE (Architektur-Guidance ONLY):**
- Progress Summary als `<div class="auto-mode-progress">` im Header
- Phase-Anzeige mit Progress-Dots oder Zahlen (1/5, 2/5, etc.)
- Story-Titel mit CSS `text-overflow: ellipsis; max-width: 200px`
- Phase-Updates aus `workflow.interactive.message` Events parsen
- Phase-Pattern: "Phase X" oder "spec-phase-X" im Message-Content suchen
- Bei `workflow.interactive.complete`: Progress auf null setzen

**WO:**
- `agent-os-ui/ui/src/components/kanban-board.ts` (Anpassen)
- `agent-os-ui/ui/src/gateway.ts` (Anpassen - Phase-Event Listener)

**WER:** dev-team__frontend-developer

**Abhängigkeiten:** KAE-001 (Toggle), KAE-002 (Engine)

**Geschätzte Komplexität:** S (ca. 80-100 LOC)

**Relevante Skills:**
- `frontend-lit` - Conditional Rendering, State Management
- `quality-gates` - UI Testing

---

### Completion Check

```bash
# Auto-Verify Commands - alle müssen mit 0 exiten
grep -q "autoModeProgress\|progressSummary" agent-os-ui/ui/src/components/kanban-board.ts
grep -q "currentPhase\|currentStoryId" agent-os-ui/ui/src/components/kanban-board.ts
cd agent-os-ui && npm run lint
cd agent-os-ui && npm run build
```

**Story ist DONE wenn:**
1. Alle CONTAINS checks bestanden
2. Progress Summary erscheint bei aktivem Auto-Mode (manueller Test)
3. Phase-Nummer aktualisiert sich
4. Story-Titel wird angezeigt (mit Ellipsis wenn nötig)
