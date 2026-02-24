# Backend WebSocket Handler for Assignment

> Story ID: ASGN-002
> Spec: Spec Assignment for External Bot
> Created: 2026-02-24
> Last Updated: 2026-02-24

**Priority**: High
**Type**: Backend
**Estimated Effort**: 2 SP
**Dependencies**: ASGN-001

---

## Feature

```gherkin
Feature: WebSocket-API für Spec-Assignment
  Als Specwright Web UI
  möchte ich über WebSocket eine Spec assignen und un-assignen können,
  damit alle verbundenen Clients den Assignment-Status in Echtzeit sehen.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Erfolgreiche Assignment-Nachricht

```gherkin
Scenario: Assignment via WebSocket erfolgreich
  Given ich bin als Client mit dem WebSocket verbunden
  And die Spec "2026-02-24-spec-assignment" hat alle Stories im Status "ready"
  When ich die Nachricht "specs.assign" mit specId sende
  Then erhalte ich eine "specs.assign.ack" Antwort
  And die Antwort enthält "assigned: true" und einen Zeitstempel
```

### Szenario 2: Multi-Client Broadcast

```gherkin
Scenario: Alle verbundenen Clients werden über Assignment informiert
  Given zwei Clients sind mit dem WebSocket verbunden
  And beide schauen dasselbe Projekt an
  When Client 1 eine Spec assigned
  Then erhält Client 2 ebenfalls die "specs.assign.ack" Nachricht
  And beide Clients zeigen denselben Assignment-Status
```

### Szenario 3: Fehler bei nicht-ready Spec

```gherkin
Scenario: Assignment-Fehler via WebSocket
  Given ich bin als Client mit dem WebSocket verbunden
  And die Spec hat Stories im Status "blocked"
  When ich die Nachricht "specs.assign" sende
  Then erhalte ich eine "specs.assign.error" Antwort
  And die Antwort enthält den Grund "Spec muss Status 'ready' haben"
```

### Szenario 4: Toggle-Verhalten

```gherkin
Scenario: Assignment-Toggle via WebSocket
  Given eine Spec ist bereits assigned
  When ich erneut "specs.assign" für dieselbe Spec sende
  Then erhalte ich "specs.assign.ack" mit "assigned: false"
  And die Spec ist nicht mehr assigned
```

---

## Technische Verifikation (Automated Checks)

- [ ] FILE_EXISTS: ui/src/server/websocket.ts
- [ ] CONTAINS: ui/src/server/websocket.ts enthält "specs.assign"
- [ ] CONTAINS: ui/src/server/websocket.ts enthält "handleSpecsAssign"
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
- [ ] `specs.assign` Case im Message-Router-Switch hinzugefügt
- [ ] `handleSpecsAssign()` Handler-Methode implementiert
- [ ] Success: `specs.assign.ack` Response mit `{ specId, assigned, timestamp }`
- [ ] Error: `specs.assign.error` Response mit Fehlergrund
- [ ] Broadcast an alle Clients im selben Projekt nach erfolgreichem Toggle
- [ ] Backend Build kompiliert: `cd ui && npm run build:backend`
- [ ] Lint fehlerfrei: `cd ui && npm run lint`
- [ ] Keine `any` Types verwendet
- [ ] Completion Check commands erfolgreich

### Integration DoD (v2.9)

- [ ] **Integration hergestellt: websocket.ts → specs-reader.ts**
  - [ ] Import/Aufruf von `toggleBotAssignment()` existiert in websocket.ts
  - [ ] Verbindung ist funktional (nicht nur Stub)
  - [ ] Validierung: `grep -q "toggleBotAssignment" ui/src/server/websocket.ts`

---

### Betroffene Layer & Komponenten

- **Integration Type:** Backend-only

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Backend (Service) | `websocket.ts` | Neuer `specs.assign` Case + `handleSpecsAssign()` Handler |

- **Kritische Integration Points:**
  - `websocket.ts` → `specs-reader.ts` (Methodenaufruf `toggleBotAssignment()`)
  - `websocket.ts` → Alle WS Clients (Broadcast `specs.assign.ack`)

---

### Technical Details

**WAS:**
- Neuer `specs.assign` Case im Message-Router-Switch (ca. Zeile 154ff)
- Neue private Handler-Methode `handleSpecsAssign(client, message)` analog zu `handleSpecsStoryUpdateStatus`
- Response-Message `specs.assign.ack` mit `{ specId, assigned, timestamp }`
- Error-Message `specs.assign.error` mit `{ specId, error: string }`
- Broadcast der `specs.assign.ack` an alle Clients des Projekts

**WIE:**
- Bestehendes Handler-Pattern der `handleSpecs*` Methoden folgen (z.B. `handleSpecsStoryUpdateStatus`)
- `specId` aus Message extrahieren
- `getClientProjectPath(client)` für Projekt-Pfad-Auflösung
- `specsReader.toggleBotAssignment(projectPath, specId)` aufrufen
- Bei Erfolg: Ack an anfragenden Client + Broadcast an alle Projekt-Clients via `webSocketManager.sendToProject()`
- Bei Fehler (z.B. Spec nicht ready): Error nur an anfragenden Client
- Try-Catch Pattern wie bei bestehenden Handlern

**WO:**
- `ui/src/server/websocket.ts` (Switch-Case + Handler-Methode)

**Abhängigkeiten:** ASGN-001 (benötigt `toggleBotAssignment()` Methode aus specs-reader.ts)

**Geschätzte Komplexität:** XS

---

### Relevante Skills

| Skill | Pfad | Grund |
|-------|------|-------|
| backend-express | .claude/skills/backend-express/SKILL.md | WebSocket Handler Pattern und Backend Service Integration |

---

### Creates Reusable Artifacts

Creates Reusable: no

---

### Completion Check

```bash
# Auto-Verify Commands - alle müssen mit 0 exiten
grep -q "specs.assign" ui/src/server/websocket.ts && echo "OK: specs.assign case"
grep -q "handleSpecsAssign" ui/src/server/websocket.ts && echo "OK: handleSpecsAssign handler"
grep -q "specs.assign.ack" ui/src/server/websocket.ts && echo "OK: ack response"
grep -q "specs.assign.error" ui/src/server/websocket.ts && echo "OK: error response"
grep -q "toggleBotAssignment" ui/src/server/websocket.ts && echo "OK: integration with specs-reader"
cd ui && npm run build:backend 2>&1 | tail -1
cd ui && npm run lint 2>&1 | tail -1
```

### Story ist DONE wenn:
1. Alle CONTAINS checks bestanden
2. Alle BUILD_PASS/LINT_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen in websocket.ts
