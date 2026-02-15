# Backend Schema: In Review Status Mapping

> Story ID: KIRC-001
> Spec: Kanban In Review Column
> Created: 2026-02-12
> Last Updated: 2026-02-12

**Priority**: Critical
**Type**: Backend
**Estimated Effort**: S
**Status**: Done
**Dependencies**: None

---

## Feature

```gherkin
Feature: In Review Status im Backend
  Als Entwickler
  möchte ich dass der Backend-Server den Status "in_review" korrekt zwischen JSON und Frontend mappt,
  damit Stories im Kanban-Board in einer eigenen "In Review"-Spalte angezeigt werden.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: In Review Status wird korrekt an Frontend gemappt

```gherkin
Scenario: Story mit Status "in_review" im kanban.json wird korrekt ans Frontend geliefert
  Given eine Story hat den Status "in_review" im kanban.json
  When das Frontend die Story-Daten vom Backend abruft
  Then erhält das Frontend den Status "in_review" als eigenständigen Status
  And die Story wird NICHT als "in_progress" angezeigt
```

### Szenario 2: Frontend kann In Review Status an Backend senden

```gherkin
Scenario: Frontend sendet Status-Update "in_review" an Backend
  Given eine Story befindet sich im Status "in_progress"
  When das Frontend eine Status-Änderung auf "in_review" sendet
  Then wird der Status in kanban.json als "in_review" gespeichert
  And die boardStatus-Statistik wird korrekt aktualisiert
```

### Szenario 3: Rückweisung von In Review nach In Progress

```gherkin
Scenario: Story wird von "in_review" zurück auf "in_progress" gesetzt
  Given eine Story hat den Status "in_review"
  When das Frontend eine Status-Änderung auf "in_progress" sendet
  Then wird der Status in kanban.json als "in_progress" gespeichert
  And die Story kann erneut via /execute-tasks bearbeitet werden
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Backward Compatibility - Bestehende Specs ohne In Review
  Given eine bestehende Spec hat keine Stories mit Status "in_review"
  When das Kanban-Board geladen wird
  Then werden alle Stories wie gewohnt angezeigt
  And die "In Review"-Spalte ist leer aber sichtbar
```

---

## Technische Verifikation (Automated Checks)

> **Hinweis:** Diese technischen Prüfungen werden automatisch ausgeführt.
> Sie ergänzen die fachlichen Gherkin-Szenarien mit maschinell prüfbaren Kriterien.

### Inhalt-Prüfungen

- [x] CONTAINS: `specs-reader.ts` enthält eigenständiges Mapping für `in_review`
- [x] CONTAINS: `specs-reader.ts` enthält `in_review` in `mapFrontendStatusToJson`

### Funktions-Prüfungen

- [x] BUILD_PASS: `cd agent-os-ui && npx tsc --noEmit` exits with code 0

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

**Integration Type:** Backend-only (with shared type definitions consumed by Frontend)

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Backend | `agent-os-ui/src/server/specs-reader.ts` | `mapJsonStatusToFrontend`: eigenständiges `'in_review'` Mapping statt `'in_progress'`; `mapFrontendStatusToJson`: `'in_review' -> 'in_review'` hinzufügen; `updateStoryStatus`: `'in_review'` als gültigen `newStatus`-Parameter akzeptieren; `StoryInfo.status` Type-Union erweitern |
| Backend | `agent-os-ui/src/server/websocket.ts` | `handleSpecsStoryUpdateStatus`: `'in_review'` in erlaubten Status-Werten akzeptieren |

**Handover an nachfolgende Stories:**
- KIRC-003 (Frontend) nutzt den erweiterten `StoryInfo.status` Type (importiert aus `kanban-board.ts`, das dieselbe Union definiert)
- KIRC-004 (Transitionen) nutzt die `updateStoryStatus` Funktion mit `'in_review'` Parameter

---

### Technical Details

**WAS:** Backend-seitige Unterstützung fuer `in_review` als eigenstaendigen Frontend-Status herstellen. Der Status existiert bereits im `KanbanJsonStatus` Type und in der `updateBoardStatus()` Logik. Die Aenderung liegt im Frontend-Mapping und der WebSocket-Akzeptanz.

**WIE (Architektur-Guidance ONLY):**
- Bestehendes switch-case Pattern in `mapJsonStatusToFrontend` folgen - `'in_review'` Case aus dem `'in_progress'` Fallthrough herausnehmen und als eigenen Return-Wert definieren
- `mapFrontendStatusToJson` um `'in_review' -> 'in_review'` Case erweitern (identisches Mapping)
- `StoryInfo.status` Type-Union um `'in_review'` erweitern (Zeile 33 in specs-reader.ts)
- `updateStoryStatus` Methode: Parameter-Type `newStatus` um `'in_review'` erweitern
- Innerhalb `updateStoryStatus`: Phase-Zuordnung fuer `'in_review'` hinzufuegen (Phase: `'in_progress'` beibehalten, da Story noch nicht endgueltig fertig)
- `handleSpecsStoryUpdateStatus` in websocket.ts: Status-Type um `'in_review'` erweitern
- Alle betroffenen Type-Union-Deklarationen konsistent aendern
- NICHT aendern: `updateBoardStatus()`, `KanbanJsonStatus`, `KanbanJsonBoardStatus` - diese unterstuetzen `in_review` bereits
- Parallele Typ-Definitionen im Frontend (`kanban-board.ts` Zeile 47: `KanbanStatus`) werden in KIRC-003 angepasst

**WO:**
- `agent-os-ui/src/server/specs-reader.ts` (Zeilen 33, 254-267, 272-283, 1478-1483)
- `agent-os-ui/src/server/websocket.ts` (Zeile 1372)

**WER:** dev-team__backend-developer

**Abhängigkeiten:** Keine - dies ist die Startphase

**Geschätzte Komplexität:** S (ca. 2 Dateien, ~30 LOC Aenderungen)

---

### Creates Reusable Artifacts

**Creates Reusable:** no

---

### Relevante Skills

| Skill | Pfad | Relevanz |
|-------|------|----------|
| backend-express/services | `.claude/skills/backend-express/services.md` | Service-Layer Patterns fuer SpecsReader |
| backend-express/websocket | `.claude/skills/backend-express/websocket.md` | WebSocket Handler Patterns |
| domain-agent-os-web-ui/task-tracking | `.claude/skills/domain-agent-os-web-ui/task-tracking.md` | Kanban/Story Status Domain Knowledge |

---

### Completion Check

```bash
# Auto-Verify Commands - alle muessen mit 0 exiten

# 1. Backend TypeScript kompiliert fehlerfrei
cd /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui && npx tsc --noEmit

# 2. mapJsonStatusToFrontend hat eigenstaendiges in_review Mapping (nicht mehr in_progress Fallthrough)
grep -q "'in_review'" /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui/src/server/specs-reader.ts

# 3. mapFrontendStatusToJson hat in_review Case
grep -c "in_review" /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui/src/server/specs-reader.ts | grep -q "[3-9]\|[1-9][0-9]"

# 4. WebSocket Handler akzeptiert in_review
grep -q "in_review" /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui/src/server/websocket.ts
```

**Story ist DONE wenn:**
1. Alle CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur Aenderungen in `specs-reader.ts` und `websocket.ts`
