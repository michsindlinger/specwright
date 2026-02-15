# Backend Cloud Terminal Infrastructure

> Story ID: CCT-001
> Spec: Cloud Code Terminal
> Created: 2026-02-05
> Last Updated: 2026-02-05

**Priority**: Critical
**Type**: Backend
**Estimated Effort**: 3 SP
**Dependencies**: None
**Status**: Done

---

## Feature

```gherkin
Feature: Backend Cloud Terminal Infrastructure
  Als Entwickler
  möchte ich ein Backend-System für Cloud Terminal Sessions,
  damit ich mehrere Claude Code CLI-Sessions verwalten kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Cloud Terminal Session erstellen

```gherkin
Scenario: Neue Cloud Terminal Session wird erfolgreich erstellt
  Given das Backend läuft und WebSocket ist verbunden
  When ich eine "cloud-terminal:create" Nachricht mit Projekt-Pfad und Modell sende
  Then wird eine neue PTY-Session gestartet
  And ich erhalte eine "cloud-terminal:created" Bestätigung mit Session-ID
  And die Session ist mit dem angegebenen Projekt verknüpft
```

### Szenario 2: Mehrere Sessions verwalten

```gherkin
Scenario: Mehrere Terminal-Sessions gleichzeitig laufen
  Given ich habe bereits 2 aktive Cloud Terminal Sessions
  When ich eine 3. Session erstelle
  Then läuft die neue Session parallel zu den bestehenden
  And jede Session hat eine eindeutige ID
  And alle Sessions sind unabhängig voneinander
```

### Szenario 3: Session schließen

```gherkin
Scenario: Cloud Terminal Session wird beendet
  Given ich habe eine aktive Cloud Terminal Session
  When ich eine "cloud-terminal:close" Nachricht mit der Session-ID sende
  Then wird die PTY-Session beendet
  And alle Ressourcen werden freigegeben
  And ich erhalte eine "cloud-terminal:closed" Bestätigung
```

### Szenario 4: Session Pausieren und Fortsetzen

```gherkin
Scenario: Session wird pausiert und später fortgesetzt
  Given ich habe eine aktive Cloud Terminal Session
  When ich das Projekt wechsle
  Then wird die Session pausiert (PTY läuft weiter, aber Output wird gepuffert)
  When ich zurück zum ursprünglichen Projekt wechsle
  Then wird die Session fortgesetzt
  And der gepufferte Output wird an den Client gesendet
```

### Edge Case: Maximale Sessions erreicht

```gherkin
Scenario: Fehler bei Überschreitung der maximalen Sessions
  Given das Limit von 5 gleichzeitigen Sessions ist erreicht
  When ich versuche eine 6. Session zu erstellen
  Then erhalte ich eine Fehlermeldung "Maximale Anzahl Sessions (5) erreicht"
  And die Session wird nicht erstellt
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [x] FILE_EXISTS: agent-os-ui/src/server/services/cloud-terminal-manager.ts
- [x] FILE_EXISTS: agent-os-ui/src/shared/types/cloud-terminal.protocol.ts

### Inhalt-Prüfungen

- [x] CONTAINS: agent-os-ui/src/server/services/cloud-terminal-manager.ts enthält "class CloudTerminalManager"
- [x] CONTAINS: agent-os-ui/src/shared/types/cloud-terminal.protocol.ts enthält "CloudTerminalMessageType"
- [x] CONTAINS: agent-os-ui/src/server/websocket.ts enthält "cloud-terminal"

### Funktions-Prüfungen

- [x] LINT_PASS: cd agent-os-ui && npm run lint
- [x] BUILD_PASS: cd agent-os-ui && npm run build

---

## Required MCP Tools

| Tool | Purpose | Blocking |
|------|---------|----------|
| None | - | No |

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

#### Full-Stack Konsistenz (NEU)
- [x] **Alle betroffenen Layer identifiziert** (Frontend/Backend/Database/DevOps)
- [x] **Integration Type bestimmt** (Backend-only/Frontend-only/Full-stack)
- [x] **Kritische Integration Points dokumentiert** (wenn Full-stack)
- [x] **Handover-Dokumente definiert** (bei Multi-Layer: API Contracts, Data Structures)

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

---

### Betroffene Layer & Komponenten

**Integration Type:** Backend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Backend | CloudTerminalManager (NEW) | Multi-session PTY management |
| Backend | terminal.protocol.ts (EXTEND) | Neue Message Types |
| Backend | websocket.ts (MODIFY) | Neue Handler |
| Backend | TerminalManager (EXTEND) | Persistent session support |

**Kritische Integration Points:**
- CloudTerminalManager → TerminalManager: PTY lifecycle delegation
- WebSocket → CloudTerminalManager: Message routing

---

### Technical Details

**WAS:**
- CloudTerminalManager Service für Multi-Session Management
- Cloud Terminal Protocol Types für WebSocket Messages
- WebSocket Handler für cloud-terminal Messages
- TerminalManager Erweiterung für persistente Sessions

**WIE (Architektur-Guidance ONLY):**
- Nutze bestehenden TerminalManager für PTY-Operationen
- Implementiere Session-State-Machine: creating → active → paused → closed
- Speichere Session-Metadaten im Memory (nicht persistieren - das macht Frontend)
- Verwende EventEmitter für Session-Status-Updates
- Max 5 Sessions pro User (konfigurierbar)

**WO:**
- agent-os-ui/src/server/services/cloud-terminal-manager.ts (NEW)
- agent-os-ui/src/shared/types/cloud-terminal.protocol.ts (EXTEND)
- agent-os-ui/src/server/websocket.ts (MODIFY)
- agent-os-ui/src/server/services/terminal-manager.ts (MODIFY)

**WER:** dev-team__backend-developer

**Abhängigkeiten:** None

**Geschätzte Komplexität:** M

**Relevante Skills:**

| Skill | Pfad | Grund |
|-------|------|-------|
| backend-logic-implementing | agent-os/skills/backend-logic-implementing.md | PTY management and session lifecycle |
| backend-integration-adapter | agent-os/skills/backend-integration-adapter.md | WebSocket message handling |

---

### Creates Reusable Artifacts

**Creates Reusable:** yes

**Reusable Artifacts:**

| Artefakt | Typ | Pfad | Beschreibung |
|----------|-----|------|--------------|
| CloudTerminalManager | Service | src/server/services/cloud-terminal-manager.ts | Multi-session PTY management für Cloud Terminals |
| CloudTerminalProtocol | Types | src/shared/types/cloud-terminal.protocol.ts | Message types für Cloud Terminal Kommunikation |

---

### Completion Check

```bash
# Auto-Verify Commands - alle müssen mit 0 exiten
grep -q "class CloudTerminalManager" agent-os-ui/src/server/services/cloud-terminal-manager.ts
grep -q "CloudTerminalMessageType" agent-os-ui/src/shared/types/cloud-terminal.protocol.ts
grep -q "cloud-terminal" agent-os-ui/src/server/websocket.ts
cd agent-os-ui && npm run lint
cd agent-os-ui && npm run build:server
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen
