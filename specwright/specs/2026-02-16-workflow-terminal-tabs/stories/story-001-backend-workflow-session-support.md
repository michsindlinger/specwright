# Backend Workflow-Session-Support

> Story ID: WTT-001
> Spec: Workflow Terminal Tabs
> Created: 2026-02-16
> Last Updated: 2026-02-16

**Priority**: Critical
**Type**: Backend
**Estimated Effort**: S
**Dependencies**: None

---

## Feature

```gherkin
Feature: Workflow-Session im Cloud Terminal
  Als Entwickler
  moechte ich dass Workflows als Cloud Terminal Sessions gestartet werden,
  damit ich waehrend der Ausfuehrung weiter im UI arbeiten kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Workflow-Session wird erstellt

```gherkin
Scenario: Erfolgreiche Erstellung einer Workflow-Session
  Given der Cloud Terminal Manager ist aktiv
  And ein Projekt-Pfad "/path/to/project" ist konfiguriert
  When ich eine Workflow-Session fuer "/execute-tasks" starte
  Then wird eine neue Claude CLI Terminal-Session erzeugt
  And der Befehl "/execute-tasks" wird automatisch ausgefuehrt
```

### Szenario 2: Workflow-Session mit Argument

```gherkin
Scenario: Workflow-Session mit Story-Kontext
  Given der Cloud Terminal Manager ist aktiv
  When ich eine Workflow-Session fuer "/execute-tasks FE-001" starte
  Then wird der vollstaendige Befehl "/execute-tasks FE-001" im Terminal ausgefuehrt
  And die Session enthaelt Workflow-Metadaten mit Name "execute-tasks" und Kontext "FE-001"
```

### Szenario 3: WebSocket-Message fuer Workflow-Session

```gherkin
Scenario: Frontend sendet Workflow-Session-Request per WebSocket
  Given eine WebSocket-Verbindung besteht
  When das Frontend eine "cloud-terminal:create-workflow" Nachricht sendet
  Then erstellt der Server eine Claude CLI Session mit den angegebenen Parametern
  And antwortet mit "cloud-terminal:created" inklusive Workflow-Metadaten
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Claude CLI ist nicht verfuegbar
  Given der Cloud Terminal Manager ist aktiv
  And die Claude CLI ist nicht im PATH
  When ich eine Workflow-Session starte
  Then erhalte ich eine Fehlermeldung im Terminal
  And die Session wird als fehlgeschlagen markiert
```

---

## Technische Verifikation (Automated Checks)

### Datei-Pruefungen

- [x] FILE_EXISTS: ui/src/shared/types/cloud-terminal.protocol.ts
- [x] CONTAINS: ui/src/shared/types/cloud-terminal.protocol.ts enthaelt "cloud-terminal:create-workflow"
- [x] CONTAINS: ui/src/server/services/cloud-terminal-manager.ts enthaelt "createWorkflowSession"
- [x] CONTAINS: ui/src/server/websocket.ts enthaelt "cloud-terminal:create-workflow"

### Funktions-Pruefungen

- [x] BUILD_PASS: cd ui && npm run build:backend

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
- [x] Alle betroffenen Layer identifiziert
- [x] Integration Type bestimmt
- [x] Kritische Integration Points dokumentiert (wenn Full-stack)
- [x] Handover-Dokumente definiert (bei Multi-Layer)

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [x] Code implementiert und folgt Style Guide
- [x] Architektur-Vorgaben eingehalten
- [x] Security/Performance Anforderungen erfuellt

#### Qualitaetssicherung
- [x] Alle Akzeptanzkriterien erfuellt
- [x] Tests geschrieben und bestanden
- [x] Code Review durchgefuehrt

#### Dokumentation
- [x] Keine Linting Errors
- [x] Completion Check Commands alle erfolgreich

---

### Betroffene Layer & Komponenten

**Integration Type:** Backend-only

| Layer | Komponenten | Aenderung |
|-------|-------------|----------|
| Backend | CloudTerminalManager | Neue Methode createWorkflowSession() |
| Backend | websocket.ts | Neuer Handler cloud-terminal:create-workflow |
| Backend | cloud-terminal.protocol.ts | Neue Typen fuer Workflow-Metadaten |

---

### Technical Details

**WAS:**
- Neuer WebSocket-Message-Typ `cloud-terminal:create-workflow` im Protocol
- Neue Methode `createWorkflowSession()` im CloudTerminalManager die eine Claude-Code-Session erstellt und nach Initialisierung automatisch einen Slash-Command sendet
- Neuer WebSocket-Handler in websocket.ts der die Message verarbeitet

**WIE (Architektur-Guidance):**
- Folge dem existierenden Pattern aus der DevTeam-Setup-Funktion (websocket.ts Z. 3620-3636): `createSession()` + `sendInput()`
- `createWorkflowSession()` ist ein Wrapper um `createSession()` mit zusaetzlichen Workflow-Metadaten
- Nutze `setTimeout()` nach Session-Erstellung (wie im Referenz-Pattern) bevor der Slash-Command gesendet wird
- Protocol-Typen muessen `CloudTerminalWorkflowMetadata` Interface definieren mit: `workflowCommand`, `workflowName`, `workflowContext`, `specId?`, `storyId?`, `gitStrategy?`, `model?`
- Response erweitert bestehende `cloud-terminal:created` Message um `workflowMetadata` Feld

**WO:**
- `ui/src/shared/types/cloud-terminal.protocol.ts` - Neue Typen
- `ui/src/server/services/cloud-terminal-manager.ts` - Neue Methode
- `ui/src/server/websocket.ts` - Neuer Handler

**Abhaengigkeiten:** None

**Geschaetzte Komplexitaet:** S

**Relevante Skills:**

| Skill | Pfad | Grund |
|-------|------|-------|
| backend-express | .claude/skills/backend-express/SKILL.md | Express/WebSocket Backend-Patterns |

---

### Creates Reusable Artifacts

**Creates Reusable:** no

---

### Completion Check

```bash
# Auto-Verify Commands
grep -q "createWorkflowSession" ui/src/server/services/cloud-terminal-manager.ts && echo "OK createWorkflowSession"
grep -q "cloud-terminal:create-workflow" ui/src/server/websocket.ts && echo "OK websocket handler"
grep -q "cloud-terminal:create-workflow" ui/src/shared/types/cloud-terminal.protocol.ts && echo "OK protocol type"
cd ui && npm run build:backend
```
