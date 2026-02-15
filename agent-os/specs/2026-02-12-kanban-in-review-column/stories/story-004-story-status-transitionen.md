# Story-Status-Transitionen für In Review

> Story ID: KIRC-004
> Spec: Kanban In Review Column
> Created: 2026-02-12
> Last Updated: 2026-02-12

**Priority**: High
**Type**: Frontend
**Estimated Effort**: S
**Dependencies**: KIRC-003

---

## Feature

```gherkin
Feature: Status-Transitionen für In Review
  Als Benutzer
  möchte ich Stories per Drag&Drop von "In Review" auf "Done" (Genehmigung) oder zurück auf "In Progress" (Rückweisung) schieben können,
  damit ich die Kontrolle über die endgültige Abnahme jeder Story habe.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Story von In Review auf Done genehmigen

```gherkin
Scenario: Benutzer genehmigt eine Story
  Given eine Story befindet sich in der "In Review"-Spalte
  When ich die Story-Card per Drag&Drop auf "Done" ziehe
  Then wird die Story in der "Done"-Spalte angezeigt
  And der Story-Status im Backend ist "done"
```

### Szenario 2: Story von In Review zurück auf In Progress

```gherkin
Scenario: Benutzer weist eine Story zurück
  Given eine Story befindet sich in der "In Review"-Spalte
  When ich die Story-Card per Drag&Drop auf "In Progress" ziehe
  Then wird die Story in der "In Progress"-Spalte angezeigt
  And die Story kann erneut über /execute-tasks bearbeitet werden
```

### Szenario 3: Rückweisung ohne DoR-Check

```gherkin
Scenario: Rückgewiesene Story benötigt keinen DoR-Check
  Given eine Story wurde von "In Review" zurück auf "In Progress" geschoben
  When /execute-tasks die Story erneut aufnimmt
  Then wird kein erneuter DoR-Check durchgeführt
  And die Story startet direkt mit der Ausführung
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Unerlaubte Transition wird verhindert
  Given eine Story befindet sich in der "In Review"-Spalte
  When ich die Story-Card auf "Backlog" ziehe
  Then wird die Aktion abgelehnt
  And die Story bleibt in "In Review"
```

---

## Technische Verifikation (Automated Checks)

### Inhalt-Prüfungen

- [x] CONTAINS: `kanban-board.ts` enthält Drag&Drop-Regeln für `in_review`
- [x] CONTAINS: `dashboard-view.ts` enthält `in_review` in handleStoryMove

### Funktions-Prüfungen

- [x] BUILD_PASS: `cd agent-os-ui/ui && npx tsc --noEmit` exits with code 0

---

## Required MCP Tools

Keine MCP Tools erforderlich.

---

## Technisches Refinement (vom Architect)

> **Dieser Abschnitt wird vom Architect ausgefüllt**

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

#### Full-Stack Konsistenz (NEU)
- [x] **Alle betroffenen Layer identifiziert** (Frontend/Backend/Database/DevOps)
- [x] **Integration Type bestimmt** (Backend-only/Frontend-only/Full-stack)
- [x] **Kritische Integration Points dokumentiert** (wenn Full-stack)
- [x] **Handover-Dokumente definiert** (bei Multi-Layer: API Contracts, Data Structures)

**Story ist READY wenn alle Checkboxen angehakt sind.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [x] Code implementiert und folgt Style Guide
- [x] Architektur-Vorgaben eingehalten (WIE section)
- [x] Security/Performance Anforderungen erfüllt

#### Qualitätssicherung
- [x] Alle Akzeptanzkriterien erfüllt (via Completion Check verifiziert)
- [x] Code Review durchgeführt und genehmigt
- [x] Keine Linting Errors
- [x] Completion Check Commands alle erfolgreich (exit 0)

#### Dokumentation
- [x] Dokumentation aktualisiert

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only (mit Backend-Kommunikation via bestehendem WebSocket)

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | `agent-os-ui/ui/src/components/kanban-board.ts` | `handleDrop()`: Transition-Validation fuer `in_review`; `handleDragOver()`: Validation fuer `in_review` Drag-Ziele; `isFirstStoryExecution()`: `in_review` als aktiven Status zaehlen; `canMoveToInProgress()`: Sonderbehandlung fuer Rueckweisung von `in_review` |
| Frontend | `agent-os-ui/ui/src/views/dashboard-view.ts` | `handleStoryMove()`: `toStatus` Type um `'in_review'` erweitern; `BacklogStoryInfo`/lokaler State Type-Erweiterung |

**Integration Points:**
- `handleStoryMove` in `dashboard-view.ts` sendet `specs.story.updateStatus` an Backend mit dem neuen `'in_review'` Status
- Backend (KIRC-001) akzeptiert `'in_review'` als gueltigen Status-Wert

---

### Technical Details

**WAS:** Drag&Drop Status-Transitionen fuer In Review implementieren: `in_review -> done` (Genehmigung) und `in_review -> in_progress` (Rueckweisung). Unerlaubte Transitionen verhindern.

**WIE (Architektur-Guidance ONLY):**

**kanban-board.ts:**
- `handleDrop()` (Zeile 1032): Transition-Regeln erweitern. Wenn Story in `in_review`: nur `done` und `in_progress` als Ziel erlaubt. Bei `in_review -> backlog` oder `in_review -> blocked`: Toast-Fehlermeldung anzeigen (bestehendes `show-toast` Event Pattern)
- `handleDragOver()` (Zeile 988): Validation erweitern - wenn `story.status === 'in_review'` und Ziel nicht `done`/`in_progress`: `dropValidation = { valid: false, reason: 'Nur Genehmigung (Done) oder Rueckweisung (In Progress) moeglich' }`
- `handleDrop()`: Wenn `story.status === 'in_review'` und `targetStatus === 'in_progress'`: KEINEN Workflow starten (keine `triggerWorkflowStart`), nur Status-Move. Kein Git-Strategy-Dialog, kein DoR-Check
- `canMoveToInProgress()` (Zeile 58): Sonderfall hinzufuegen - wenn Story aus `in_review` kommt, DoR und Dependency Check ueberspringen (Story war ja schon aktiv)
- `isFirstStoryExecution()` (Zeile 1119): `in_review` als aktiven Status zaehlen: `s.status === 'in_progress' || s.status === 'done' || s.status === 'in_review'`

**dashboard-view.ts:**
- `handleStoryMove()` (Zeile 837): `toStatus` Type-Union um `'in_review'` erweitern
- Die bestehende `gateway.send({ type: 'specs.story.updateStatus' })` Logik bleibt gleich, da das Backend (KIRC-001) `'in_review'` bereits akzeptiert

**WO:**
- `agent-os-ui/ui/src/components/kanban-board.ts` (~50 LOC)
- `agent-os-ui/ui/src/views/dashboard-view.ts` (~5 LOC Type-Erweiterung)

**WER:** dev-team__frontend-developer

**Abhängigkeiten:** KIRC-003 (Frontend In Review Spalte muss gerendert werden; KanbanStatus Type muss `in_review` enthalten)

**Geschätzte Komplexität:** S (2 Dateien, ~55 LOC)

---

### Creates Reusable Artifacts

**Creates Reusable:** no

---

### Relevante Skills

| Skill | Pfad | Relevanz |
|-------|------|----------|
| frontend-lit/components | `.claude/skills/frontend-lit/components.md` | Lit Event Handling (CustomEvent Pattern) |
| frontend-lit/state-management | `.claude/skills/frontend-lit/state-management.md` | State Updates mit requestUpdate() |
| frontend-lit/api-integration | `.claude/skills/frontend-lit/api-integration.md` | Gateway/WebSocket Kommunikation |
| domain-agent-os-web-ui/task-tracking | `.claude/skills/domain-agent-os-web-ui/task-tracking.md` | Kanban Drag&Drop Domain Knowledge |

---

### Completion Check

```bash
# Auto-Verify Commands - alle muessen mit 0 exiten

# 1. Frontend TypeScript kompiliert fehlerfrei
cd /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui/ui && npx tsc --noEmit

# 2. kanban-board.ts hat Drag&Drop Regeln fuer in_review
grep -q "in_review" /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui/ui/src/components/kanban-board.ts

# 3. dashboard-view.ts akzeptiert in_review Status
grep -q "in_review" /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui/ui/src/views/dashboard-view.ts

# 4. isFirstStoryExecution zaehlt in_review
grep -q "in_review" /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui/ui/src/components/kanban-board.ts
```

**Story ist DONE wenn:**
1. Alle CONTAINS checks bestanden
2. Frontend TSC kompiliert fehlerfrei
3. Git diff zeigt nur Aenderungen in `kanban-board.ts` und `dashboard-view.ts`
4. Drag `in_review -> done` und `in_review -> in_progress` funktionieren
5. Drag `in_review -> backlog` und `in_review -> blocked` werden abgelehnt
