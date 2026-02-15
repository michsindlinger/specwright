# Backend Setup

> Story ID: AOSUI-001
> Spec: Agent OS Web UI
> Created: 2026-01-30
> Last Updated: 2026-01-30

**Priority**: Critical
**Type**: Backend
**Estimated Effort**: S
**Dependencies**: None

---

## Feature

```gherkin
Feature: Backend Server Setup
  Als Entwickler
  möchte ich einen Backend-Server starten können,
  damit die Web-UI mit Claude Code kommunizieren kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Server startet erfolgreich

```gherkin
Scenario: Backend Server startet auf localhost
  Given ich bin im agent-os-ui Projektordner
  When ich "npm run start:backend" ausführe
  Then läuft der Server auf Port 3001
  And ich sehe "Server running on http://localhost:3001" in der Konsole
```

### Szenario 2: Health Check Endpoint

```gherkin
Scenario: Health Check bestätigt Server-Status
  Given der Backend-Server läuft
  When ich GET /health aufrufe
  Then erhalte ich Status 200
  And die Antwort enthält "ok"
```

### Szenario 3: WebSocket Verbindung

```gherkin
Scenario: WebSocket akzeptiert Verbindungen
  Given der Backend-Server läuft
  When ein Client sich per WebSocket verbindet
  Then wird die Verbindung akzeptiert
  And der Client erhält eine Bestätigungsnachricht
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Port bereits belegt
  Given Port 3001 ist bereits von einem anderen Prozess belegt
  When ich "npm run start:backend" ausführe
  Then sehe ich eine klare Fehlermeldung "Port 3001 already in use"
  And der Prozess beendet sich mit Exit Code 1
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [ ] FILE_EXISTS: agent-os-ui/package.json
- [ ] FILE_EXISTS: agent-os-ui/src/server/index.ts
- [ ] FILE_EXISTS: agent-os-ui/src/server/websocket.ts

### Inhalt-Prüfungen

- [ ] CONTAINS: package.json enthält "@anthropic-ai/claude-agent-sdk"
- [ ] CONTAINS: package.json enthält "express"
- [ ] CONTAINS: package.json enthält "ws"

### Funktions-Prüfungen

- [ ] BUILD_PASS: cd agent-os-ui && npm run build:backend
- [ ] LINT_PASS: cd agent-os-ui && npm run lint

---

## Required MCP Tools

Keine MCP Tools erforderlich.

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

#### Implementierung
- [x] Code implementiert und folgt Style Guide
- [x] Architektur-Vorgaben eingehalten
- [x] Security/Performance Anforderungen erfüllt

#### Qualitätssicherung
- [x] Alle Akzeptanzkriterien erfüllt
- [x] Unit Tests geschrieben und bestanden (N/A - setup story)
- [x] Code Review durchgeführt (self-review)

#### Dokumentation
- [x] Keine Linting Errors
- [x] Completion Check Commands erfolgreich

---

### Betroffene Layer & Komponenten

**Integration Type:** Backend-only

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Backend | src/server/index.ts | Express Server Entry Point |
| Backend | src/server/websocket.ts | WebSocket Server mit ws |
| Config | package.json | Dependencies und Scripts |
| Config | tsconfig.json | TypeScript Konfiguration |

---

### Technical Details

**WAS:**
- Express HTTP Server auf Port 3001
- WebSocket Server auf gleichem Port (ws upgrade)
- Health Check Endpoint GET /health
- Grundlegende TypeScript-Projektstruktur
- NPM Scripts: start:backend, build:backend, lint

**WIE:**
- Express 4.x mit TypeScript
- ws-Paket für WebSocket (wie Moltbot Pattern)
- JSON Response Format: `{ status: "ok", timestamp: ... }`
- WebSocket sendet `{ type: "connected", clientId: "..." }` bei Verbindung
- Graceful Shutdown bei SIGINT/SIGTERM
- Port-Conflict Detection mit klarer Fehlermeldung

**WO:**
```
agent-os-ui/
├── package.json                    # NEU: Workspace root package.json
├── tsconfig.json                   # NEU: TypeScript config
├── src/
│   └── server/
│       ├── index.ts                # NEU: Express + Server Entry
│       └── websocket.ts            # NEU: WebSocket Handler
```

**WER:** dev-team__fullstack-developer

**Abhängigkeiten:** None

**Geschätzte Komplexität:** S

---

### Completion Check

```bash
# Verify project structure exists
test -f agent-os-ui/package.json && echo "OK: package.json exists"
test -f agent-os-ui/src/server/index.ts && echo "OK: index.ts exists"
test -f agent-os-ui/src/server/websocket.ts && echo "OK: websocket.ts exists"

# Verify dependencies in package.json
grep -q "express" agent-os-ui/package.json && echo "OK: express dependency"
grep -q "ws" agent-os-ui/package.json && echo "OK: ws dependency"
grep -q "@anthropic-ai/claude-agent-sdk" agent-os-ui/package.json && echo "OK: agent-sdk dependency"

# Build check
cd agent-os-ui && npm run build:backend && echo "OK: Backend builds"
```
