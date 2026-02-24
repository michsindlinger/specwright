# Frontend Assignment in Kanban Detail View

> Story ID: ASGN-004
> Spec: Spec Assignment for External Bot
> Created: 2026-02-24
> Last Updated: 2026-02-24

**Priority**: Medium
**Type**: Frontend
**Estimated Effort**: 2 SP
**Dependencies**: ASGN-002

---

## Feature

```gherkin
Feature: Assignment-Toggle in der Kanban-Detailansicht
  Als Specwright-Nutzer
  möchte ich innerhalb der Kanban-Ansicht einer Spec den Assignment-Status steuern können,
  damit ich auch im Detail-Kontext schnell assignen und un-assignen kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Assignment-Toggle im Kanban-Header

```gherkin
Scenario: Toggle-Button im Kanban-Header sichtbar
  Given ich bin in der Kanban-Ansicht einer Spec
  And die Spec hat alle Stories im Status "ready"
  When ich den Kanban-Header betrachte
  Then sehe ich einen Assignment-Toggle-Button
  And der Button zeigt den aktuellen Assignment-Status
```

### Szenario 2: Spec assignen aus Kanban-View

```gherkin
Scenario: Spec aus der Kanban-Ansicht assignen
  Given ich bin in der Kanban-Ansicht einer Spec
  And die Spec ist noch nicht assigned
  When ich den Assignment-Toggle aktiviere
  Then zeigt der Toggle "assigned" an
  And ein visuelles Feedback bestätigt die Änderung
```

### Szenario 3: Toggle deaktiviert bei nicht-ready Spec

```gherkin
Scenario: Assignment-Toggle deaktiviert bei nicht-ready Spec
  Given ich bin in der Kanban-Ansicht einer Spec
  And mindestens eine Story hat den Status "blocked"
  When ich den Assignment-Toggle betrachte
  Then ist der Toggle deaktiviert
  And ein Tooltip erklärt warum (z.B. "Spec muss 'ready' sein")
```

### Szenario 4: Assignment-Status synchronisiert mit Übersicht

```gherkin
Scenario: Assignment-Status konsistent zwischen Views
  Given ich habe eine Spec in der Kanban-Ansicht assigned
  When ich zur Spec-Übersicht zurückkehre
  Then zeigt die Spec-Karte das Assignment-Badge an
```

---

## Technische Verifikation (Automated Checks)

- [x] FILE_EXISTS: ui/frontend/src/components/kanban-board.ts
- [x] CONTAINS: ui/frontend/src/components/kanban-board.ts enthält "assignedToBot"
- [x] CONTAINS: ui/frontend/src/components/kanban-board.ts enthält "spec-assign-toggle"
- [x] BUILD_PASS: `cd ui/frontend && npm run build` exits with code 0

---

## Required MCP Tools

Keine MCP-Tools erforderlich.

---

## Technisches Refinement (vom Architect)

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
- [x] Alle betroffenen Layer identifiziert
- [x] Integration Type bestimmt
- [x] Kritische Integration Points dokumentiert (wenn Full-stack)
- [x] Handover-Dokumente definiert (bei Multi-Layer)

---

### DoD (Definition of Done) - Vom Architect

- [x] Code implementiert und folgt Style Guide
- [x] Frontend `KanbanBoard` Interface um `assignedToBot?: boolean` und `isReady?: boolean` erweitert
- [x] `assignedToBot` Property in `kanban-board.ts` Komponente hinzugefügt
- [x] `isReady` Property in `kanban-board.ts` Komponente hinzugefügt
- [x] Toggle-Button im Kanban-Header gerendert (neben Auto-Mode-Toggle)
- [x] Toggle zeigt aktuellen Assignment-Status (assigned/not assigned)
- [x] Toggle deaktiviert wenn `isReady` falsy mit Tooltip
- [x] Custom Event `spec-assign-toggle` wird dispatcht mit `{ specId }`
- [x] dashboard-view: `assignedToBot` und `isReady` Properties an kanban-board durchgereicht
- [x] dashboard-view: Event-Handler für `spec-assign-toggle` → sendet `specs.assign` WS Message
- [x] dashboard-view: Kanban `assignedToBot` wird nach `specs.assign.ack` aktualisiert
- [x] Frontend Build kompiliert: `cd ui/frontend && npm run build`
- [x] Keine `any` Types verwendet
- [x] Completion Check commands erfolgreich

### Integration DoD (v2.9)

- [x] **Integration hergestellt: dashboard-view.ts → kanban-board.ts**
  - [x] Property Binding `.assignedToBot` und `.isReady` existiert
  - [x] Validierung: `grep -q "assignedToBot" ui/frontend/src/components/kanban-board.ts`
- [x] **Integration hergestellt: kanban-board.ts → dashboard-view.ts**
  - [x] Custom Event `spec-assign-toggle` wird dispatcht und gehandled
  - [x] Validierung: `grep -q "spec-assign-toggle" ui/frontend/src/components/kanban-board.ts`

---

### Betroffene Layer & Komponenten

- **Integration Type:** Frontend-only

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend (Presentation) | `kanban-board.ts` | `KanbanBoard` Interface erweitern; `assignedToBot`/`isReady` Properties; Toggle-Button im Header; `spec-assign-toggle` Event |
| Frontend (Presentation) | `dashboard-view.ts` | Property Binding an kanban-board; Event-Handler für `spec-assign-toggle`; Kanban-State-Update nach Ack |

- **Kritische Integration Points:**
  - `dashboard-view.ts` → `kanban-board.ts` (Property Binding `.assignedToBot`, `.isReady`)
  - `kanban-board.ts` → `dashboard-view.ts` (Custom Event `spec-assign-toggle`)

- **Handover-Dokumente:**
  - Nutzt `KanbanBoard.assignedToBot` und `KanbanBoard.isReady` aus ASGN-001
  - Nutzt `specs.assign` WS Message aus ASGN-002
  - Teilt `specs.assign.ack` / `specs.assign.error` WS Listener mit ASGN-003 in dashboard-view

---

### Technical Details

**WAS:**
- Frontend `KanbanBoard` Interface erweitern um `assignedToBot?: boolean` und `isReady?: boolean`
- Neue Properties `assignedToBot` und `isReady` in `kanban-board.ts`
- Toggle-Button im Kanban-Header (ähnlich Auto-Mode-Toggle-Slider)
- Toggle disabled wenn `isReady` falsy, mit Tooltip "Spec muss 'ready' sein"
- Custom Event `spec-assign-toggle` dispatchen mit `{ specId }` (bubble + composed)
- In `dashboard-view.ts`: `assignedToBot` und `isReady` an `kanban-board` Komponente binden
- In `dashboard-view.ts`: `@spec-assign-toggle` Event-Handler → `gateway.send({ type: 'specs.assign', specId })`
- In `dashboard-view.ts`: Kanban-State nach `specs.assign.ack` aktualisieren (auch `this.kanban`)

**WIE:**
- Bestehendes Auto-Mode-Toggle-Pattern im Kanban-Header folgen (CSS Toggle-Slider)
- Bestehendes Property-Binding-Pattern von dashboard-view → kanban-board folgen
- Bestehendes Custom-Event-Pattern folgen (bubble + composed)
- WS-Listener für `specs.assign.ack`/`specs.assign.error` werden in ASGN-003 in dashboard-view hinzugefügt - hier nur den Kanban-State (`this.kanban`) zusätzlich updaten
- Bot-Icon (Lucide `bot`) für den Toggle verwenden
- Toggle-Status visuell hervorheben (accent Farbe wenn assigned)

**WO:**
- `ui/frontend/src/components/kanban-board.ts` (KanbanBoard Interface + Properties + Toggle + Event)
- `ui/frontend/src/views/dashboard-view.ts` (Property Binding + Event-Handler + Kanban-State-Update)

**Integration:** specs-reader.ts (KanbanBoard) → kanban-board.ts (Toggle)

**Abhängigkeiten:** ASGN-002 (benötigt `specs.assign` WS Message-Handler)

**Geschätzte Komplexität:** S

---

### Relevante Skills

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | .claude/skills/frontend-lit/SKILL.md | Lit Web Component Patterns, Properties, Header-Rendering |

---

### Creates Reusable Artifacts

Creates Reusable: no

---

### Completion Check

```bash
# Auto-Verify Commands - alle müssen mit 0 exiten
grep -q "assignedToBot" ui/frontend/src/components/kanban-board.ts && echo "OK: assignedToBot in kanban-board"
grep -q "isReady" ui/frontend/src/components/kanban-board.ts && echo "OK: isReady in kanban-board"
grep -q "spec-assign-toggle" ui/frontend/src/components/kanban-board.ts && echo "OK: spec-assign-toggle event"
grep -q "spec-assign-toggle" ui/frontend/src/views/dashboard-view.ts && echo "OK: event handler in dashboard"
cd ui/frontend && npm run build 2>&1 | tail -1
```

### Story ist DONE wenn:
1. Alle CONTAINS checks bestanden
2. Frontend Build kompiliert ohne Fehler
3. Git diff zeigt nur erwartete Änderungen in kanban-board.ts und dashboard-view.ts
