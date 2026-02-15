# Backend WebSocket Handler: Setup Messages

> Story ID: SETUP-003
> Spec: AgentOS Extended Setup Wizard
> Created: 2026-02-13
> Last Updated: 2026-02-13

**Priority**: Critical
**Type**: Backend
**Estimated Effort**: M
**Status**: Done
**Dependencies**: SETUP-001, SETUP-002

---

## Feature

```gherkin
Feature: WebSocket-Routing fuer Setup-Messages
  Als Frontend-Entwickler
  moechte ich Setup-Aktionen per WebSocket an das Backend senden,
  damit der Setup Wizard ueber die bestehende Gateway-Infrastruktur kommuniziert.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Status abfragen

```gherkin
Scenario: Frontend fragt Installationsstatus ab
  Given das Frontend sendet eine "setup:check-status" Message
  When der Server den Status aller 4 Schritte prueft
  Then antwortet der Server mit "setup:status" und dem Status-Array
```

### Szenario 2: Schritt ausfuehren

```gherkin
Scenario: Frontend startet einen Installations-Schritt
  Given das Frontend sendet "setup:run-step" mit step=2
  When der Server den Curl-Command ausfuehrt
  Then streamt der Server "setup:step-output" Messages mit dem Live-Output
  And sendet abschliessend "setup:step-complete" mit dem Ergebnis
```

### Szenario 3: DevTeam Cloud Terminal starten

```gherkin
Scenario: Frontend startet DevTeam-Setup via Cloud Terminal
  Given das Frontend sendet "setup:start-devteam"
  When der Server eine Cloud Terminal Session erstellt
  Then sendet der Server den initialen Prompt "/agent-os:build-development-team"
  And der Client erhaelt eine "cloud-terminal:created" Message mit der Session-ID
```

### Szenario 4: Fehlerfall - Kein Projekt ausgewaehlt

```gherkin
Scenario: Setup ohne aktives Projekt
  Given kein Projekt ist ausgewaehlt
  When das Frontend eine "setup:run-step" Message sendet
  Then antwortet der Server mit "setup:error" und Code "NO_PROJECT"
```

---

## Technische Verifikation (Automated Checks)

### Inhalt-Pruefungen

- [x] CONTAINS: `websocket.ts` enthaelt `setup:check-status` Case
- [x] CONTAINS: `websocket.ts` enthaelt `setup:run-step` Case
- [x] CONTAINS: `websocket.ts` enthaelt `setup:start-devteam` Case

### Funktions-Pruefungen

- [x] BUILD_PASS: `cd agent-os-ui && npx tsc --noEmit` exits with code 0

---

## Required MCP Tools

Keine MCP Tools erforderlich.

---

## Technisches Refinement (vom Architect)

### DoR (Definition of Ready) - Vom Architect

#### Fachliche Anforderungen
- [x] Fachliche requirements klar definiert
- [x] Akzeptanzkriterien sind spezifisch und pruefbar
- [x] Business Value verstanden

#### Technische Vorbereitung
- [x] Technischer Ansatz definiert (WAS/WIE/WO)
- [x] Abhaengigkeiten identifiziert
- [x] Betroffene Komponenten bekannt
- [x] Erforderliche MCP Tools dokumentiert (falls zutreffend)
- [x] Story ist angemessen geschaetzt (max 5 Dateien, 400 LOC)

#### Full-Stack Konsistenz
- [x] **Alle betroffenen Layer identifiziert** (Backend + Cloud Terminal Integration)
- [x] **Integration Type bestimmt** (Backend mit Frontend-Message-Contract)
- [x] **Kritische Integration Points dokumentiert** (WebSocket Message-Types)
- [x] **Handover-Dokumente definiert** (Message-Types fuer Story 4)

**Story ist READY wenn alle Checkboxen angehakt sind.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [x] Code implementiert und folgt Style Guide
- [x] Architektur-Vorgaben eingehalten (WIE section)
- [x] Security/Performance Anforderungen erfuellt

#### Qualitaetssicherung
- [x] Alle Akzeptanzkriterien erfuellt (via Completion Check verifiziert)
- [x] Code Review durchgefuehrt und genehmigt
- [x] Keine Linting Errors
- [x] Completion Check Commands alle erfolgreich (exit 0)

#### Dokumentation
- [x] Dokumentation aktualisiert

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Backend (WebSocket Handler + Service Integration)

**Betroffene Komponenten:**

| Layer | Komponenten | Aenderung |
|-------|-------------|----------|
| Backend | `agent-os-ui/src/server/websocket.ts` | 3 neue Cases im `handleMessage()` Switch + 3 Handler-Methoden + SetupService Event-Listener Setup |

**Handover an nachfolgende Stories:**
- SETUP-004 (Frontend) nutzt die Message-Types: `setup:check-status`, `setup:status`, `setup:run-step`, `setup:step-output`, `setup:step-complete`, `setup:start-devteam`, `setup:error`

---

### Technical Details

**WAS:** WebSocket Message-Routing im bestehenden Handler fuer alle Setup-relevanten Messages.

**WIE (Architektur-Guidance ONLY):**

1. **SetupService importieren und instanziieren:**
   - `import { setupService } from './services/setup.service.js'` im WebSocket Handler
   - Event-Listener in einer `setupSetupListeners()` Methode einrichten (im Constructor aufrufen)

2. **Neue Cases im `handleMessage()` Switch:**
   ```
   case 'setup:check-status': this.handleSetupCheckStatus(client); break;
   case 'setup:run-step': this.handleSetupRunStep(client, message); break;
   case 'setup:start-devteam': this.handleSetupStartDevteam(client, message); break;
   ```

3. **Handler: `handleSetupCheckStatus(client)`:**
   - `projectPath = this.getClientProjectPath(client)` - Fehler wenn null
   - `const steps = await setupService.checkStatus(projectPath)`
   - Response: `{ type: 'setup:status', steps, timestamp }`

4. **Handler: `handleSetupRunStep(client, message)`:**
   - `step = message.step as number` validieren (1-3)
   - `projectPath = this.getClientProjectPath(client)` - Fehler wenn null
   - `setupService.runStep(step, projectPath)` aufrufen (try/catch fuer Guard-Error)
   - Events werden via Listener weitergeleitet (siehe Punkt 5)

5. **Event-Listener Setup (`setupSetupListeners`):**
   - `setupService.on('step-output', (data) => this.broadcast({ type: 'setup:step-output', ...data }))`
   - `setupService.on('step-complete', (data) => this.broadcast({ type: 'setup:step-complete', ...data }))`

6. **Handler: `handleSetupStartDevteam(client, message)`:**
   - Nutzt bestehenden `cloudTerminalManager.createSession()` mit `terminalType: 'claude-code'`
   - Nach Session-Erstellung: `session.write('/agent-os:build-development-team\n')` als initialen Input
   - Sendet `cloud-terminal:created` Response (bestehendes Pattern)
   - Zusaetzlich `{ type: 'setup:devteam-started', sessionId }` an Client

**WO:**
- `agent-os-ui/src/server/websocket.ts`

**WER:** dev-team__backend-developer

**Abhaengigkeiten:** SETUP-001 (checkStatus), SETUP-002 (runStep)

**Geschaetzte Komplexitaet:** M (1 Datei, ~80 LOC, Pattern bereits bekannt)

---

### Creates Reusable Artifacts

**Creates Reusable:** no

---

### Relevante Skills

| Skill | Pfad | Relevanz |
|-------|------|----------|
| backend-express/websocket | `.claude/skills/backend-express/websocket.md` | WebSocket Handler Patterns |

---

### Completion Check

```bash
# Auto-Verify Commands

# 1. Alle 3 Cases vorhanden
grep -q "setup:check-status" /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui/src/server/websocket.ts
grep -q "setup:run-step" /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui/src/server/websocket.ts
grep -q "setup:start-devteam" /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui/src/server/websocket.ts

# 2. SetupService Import vorhanden
grep -q "setup.service" /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui/src/server/websocket.ts

# 3. TypeScript kompiliert
cd /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui && npx tsc --noEmit
```
