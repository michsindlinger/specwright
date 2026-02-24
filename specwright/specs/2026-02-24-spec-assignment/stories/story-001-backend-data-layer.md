# Backend Data Layer - kanban.json Schema + SpecsReader

> Story ID: ASGN-001
> Spec: Spec Assignment for External Bot
> Created: 2026-02-24
> Last Updated: 2026-02-24

**Priority**: High
**Type**: Backend
**Estimated Effort**: 3 SP
**Dependencies**: None

---

## Feature

```gherkin
Feature: Assignment-Datenmodell in kanban.json
  Als Specwright-System
  möchte ich das assignedToBot-Feld in kanban.json speichern und lesen können,
  damit der Assignment-Status persistent und für OpenClaw lesbar ist.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Erfolgreiche Assignment-Speicherung

```gherkin
Scenario: Spec wird erfolgreich assigned
  Given eine Spec mit allen Stories im Status "ready"
  And die kanban.json enthält kein assignedToBot-Feld
  When das Assignment für diese Spec aktiviert wird
  Then enthält die kanban.json ein assignedToBot-Objekt mit "assigned: true"
  And der Zeitstempel "assignedAt" ist gesetzt
  And der Eintrag "assignedBy: user" ist vorhanden
```

### Szenario 2: Erfolgreiche Un-Assignment

```gherkin
Scenario: Spec wird erfolgreich un-assigned
  Given eine Spec die bereits assigned ist
  When das Assignment für diese Spec deaktiviert wird
  Then enthält die kanban.json assignedToBot mit "assigned: false"
```

### Szenario 3: Assignment nur bei Ready-Status

```gherkin
Scenario: Assignment wird abgelehnt bei nicht-ready Spec
  Given eine Spec mit mindestens einer Story im Status "blocked" oder "in_progress"
  When versucht wird die Spec zu assignen
  Then wird das Assignment abgelehnt
  And eine Fehlermeldung "Spec muss Status 'ready' haben" wird zurückgegeben
```

### Edge Case: Backward Compatibility

```gherkin
Scenario: Bestehende kanban.json ohne assignedToBot-Feld
  Given eine kanban.json die vor dem Feature erstellt wurde
  And kein assignedToBot-Feld vorhanden ist
  When der Assignment-Status abgefragt wird
  Then wird "nicht assigned" zurückgegeben
  And es tritt kein Fehler auf
```

---

## Technische Verifikation (Automated Checks)

- [ ] FILE_EXISTS: ui/src/server/specs-reader.ts
- [ ] CONTAINS: ui/src/server/specs-reader.ts enthält "assignedToBot"
- [ ] CONTAINS: ui/src/server/specs-reader.ts enthält "toggleBotAssignment"
- [ ] CONTAINS: ui/src/server/specs-reader.ts enthält "isSpecReady"
- [ ] BUILD_PASS: `cd ui && npm run build:backend` exits with code 0
- [ ] LINT_PASS: `cd ui && npm run lint` exits with code 0

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

- [ ] Code implementiert und folgt Style Guide
- [ ] `KanbanJsonV1` Interface um `assignedToBot?` erweitert
- [ ] `SpecInfo` Interface um `assignedToBot?: boolean` und `isReady?: boolean` erweitert
- [ ] `KanbanBoard` Interface um `assignedToBot?: boolean` und `isReady?: boolean` erweitert
- [ ] `isSpecReady()` Methode implementiert und korrekt
- [ ] `toggleBotAssignment()` Methode implementiert mit Lock-Pattern
- [ ] `getSpecInfo()` liest `assignedToBot` und berechnet `isReady`
- [ ] `convertJsonToKanbanBoard()` gibt `assignedToBot` und `isReady` weiter
- [ ] Backward Compatibility: fehlendes Feld = nicht assigned, kein Fehler
- [ ] Backend Build kompiliert: `cd ui && npm run build:backend`
- [ ] Lint fehlerfrei: `cd ui && npm run lint`
- [ ] Keine `any` Types verwendet
- [ ] Completion Check commands erfolgreich

---

### Betroffene Layer & Komponenten

- **Integration Type:** Backend-only

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Backend (Service) | `specs-reader.ts` | `SpecInfo`, `KanbanBoard` Interfaces erweitern; `isSpecReady()`, `toggleBotAssignment()` neue Methoden; `getSpecInfo()`, `convertJsonToKanbanBoard()` anpassen |
| Backend (Integration) | `kanban-mcp-server.ts` | `KanbanJsonV1` Interface um `assignedToBot?` Typ erweitern (nur Interface, kein neues Tool) |

- **Kritische Integration Points:** Keine (Backend-only, liefert Daten für nachfolgende Stories)

- **Handover-Dokumente:**
  - `SpecInfo.assignedToBot?: boolean` - Wird von ASGN-003 im Frontend genutzt
  - `SpecInfo.isReady?: boolean` - Wird von ASGN-003/004 für Toggle-Enablement genutzt
  - `KanbanBoard.assignedToBot?: boolean` - Wird von ASGN-004 im Kanban-View genutzt
  - `KanbanBoard.isReady?: boolean` - Wird von ASGN-004 für Toggle-Enablement genutzt
  - `toggleBotAssignment()` - Wird von ASGN-002 (WebSocket Handler) aufgerufen

---

### Technical Details

**WAS:**
- `KanbanJsonV1` Interface erweitern um optionales `assignedToBot?`-Feld (Struktur: `{ assigned: boolean, assignedAt: string, assignedBy: string }`)
- `SpecInfo` Interface erweitern um `assignedToBot?: boolean` und `isReady?: boolean`
- `KanbanBoard` Interface erweitern um `assignedToBot?: boolean` und `isReady?: boolean`
- Neue Methode `isSpecReady(kanban)`: Prüft ob alle Stories "ready" sind
- Neue Methode `toggleBotAssignment(projectPath, specId)`: Atomares Toggle mit Lock
- `getSpecInfo()` anpassen: `assignedToBot.assigned` aus kanban.json lesen, `isReady` berechnen
- `convertJsonToKanbanBoard()` anpassen: `assignedToBot` und `isReady` durchreichen

**WIE:**
- Bestehenden `withKanbanLock()` Pattern für atomares Read-Modify-Write nutzen
- `readKanbanJsonUnlocked()` / `writeKanbanJsonUnlocked()` innerhalb des Lock-Callbacks
- `isSpecReady`: `boardStatus.ready === boardStatus.total && boardStatus.total > 0`
- `toggleBotAssignment`: Lock → Read → Validate ready → Toggle assigned boolean → Changelog-Eintrag → Write
- Backward Compatible: Fehlendes `assignedToBot`-Feld = `assigned: false` (optionales Feld mit `?`)
- Changelog-Eintrag bei Toggle: `{ action: "bot-assignment-toggled", details: "assigned: true/false" }`

**WO:**
- `ui/src/server/specs-reader.ts` (Interfaces + Methoden + getSpecInfo + convertJsonToKanbanBoard)
- `specwright/scripts/mcp/kanban-mcp-server.ts` (KanbanJsonV1 Interface Type-Update)

**Abhängigkeiten:** None

**Geschätzte Komplexität:** S

---

### Relevante Skills

| Skill | Pfad | Grund |
|-------|------|-------|
| backend-express | .claude/skills/backend-express/SKILL.md | Backend Service-Methoden und TypeScript Interface Patterns |

---

### Creates Reusable Artifacts

Creates Reusable: yes

| Artefakt | Typ | Pfad | Beschreibung |
|----------|-----|------|--------------|
| `isSpecReady()` | Service | `ui/src/server/specs-reader.ts` | Wiederverwendbare Methode zur Ready-Prüfung einer Spec |
| `toggleBotAssignment()` | Service | `ui/src/server/specs-reader.ts` | Atomares Toggle-Pattern für kanban.json Felder |

---

### Completion Check

```bash
# Auto-Verify Commands - alle müssen mit 0 exiten
grep -q "assignedToBot" ui/src/server/specs-reader.ts && echo "OK: assignedToBot in specs-reader"
grep -q "toggleBotAssignment" ui/src/server/specs-reader.ts && echo "OK: toggleBotAssignment method"
grep -q "isSpecReady" ui/src/server/specs-reader.ts && echo "OK: isSpecReady method"
grep -q "isReady" ui/src/server/specs-reader.ts && echo "OK: isReady in SpecInfo"
grep -q "assignedToBot" specwright/scripts/mcp/kanban-mcp-server.ts && echo "OK: assignedToBot in MCP types"
cd ui && npm run build:backend 2>&1 | tail -1
cd ui && npm run lint 2>&1 | tail -1
```

### Story ist DONE wenn:
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle BUILD_PASS/LINT_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen in specs-reader.ts und kanban-mcp-server.ts
