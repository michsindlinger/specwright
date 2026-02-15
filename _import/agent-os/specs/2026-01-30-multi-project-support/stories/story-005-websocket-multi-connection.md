# WebSocket Multi-Connection

> Story ID: MPRO-005
> Spec: multi-project-support
> Created: 2026-01-30
> Last Updated: 2026-01-30

**Priority**: High
**Type**: Backend
**Estimated Effort**: S
**Dependencies**: MPRO-004

---

## Feature

```gherkin
Feature: WebSocket Multi-Connection
  Als Entwickler
  möchte ich dass jedes geöffnete Projekt eine eigene WebSocket-Verbindung hat,
  damit Workflows in verschiedenen Projekten unabhängig voneinander laufen können.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Separate WebSocket-Verbindung pro Projekt

```gherkin
Scenario: Projekt erhält eigene WebSocket-Verbindung
  Given ich habe das Projekt "project-a" geöffnet
  When ich das Projekt "project-b" zusätzlich öffne
  Then existieren zwei WebSocket-Verbindungen
  And Verbindung 1 ist "project-a" zugeordnet
  And Verbindung 2 ist "project-b" zugeordnet
```

### Szenario 2: Nachrichten werden korrekt zugestellt

```gherkin
Scenario: Workflow-Updates gehen an das richtige Projekt
  Given ich habe Projekt "project-a" und "project-b" geöffnet
  And in "project-a" läuft ein Workflow
  When der Workflow in "project-a" eine Nachricht sendet
  Then erhält nur die WebSocket-Verbindung von "project-a" die Nachricht
  And "project-b" erhält keine Nachricht
```

### Szenario 3: Verbindung wird bei Projekt-Schließen getrennt

```gherkin
Scenario: WebSocket-Verbindung wird geschlossen
  Given ich habe das Projekt "project-a" mit aktiver WebSocket-Verbindung geöffnet
  When ich den Tab für "project-a" schließe
  Then wird die WebSocket-Verbindung für "project-a" geschlossen
```

### Szenario 4: Workflow läuft bei Projekt-Wechsel weiter

```gherkin
Scenario: Hintergrund-Workflow während Projekt-Wechsel
  Given ich habe Projekt "project-a" aktiv
  And ein Workflow läuft in "project-a"
  When ich zu Projekt "project-b" wechsle
  Then läuft der Workflow in "project-a" im Hintergrund weiter
  And ich kann den Workflow-Status sehen wenn ich zurückwechsle
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: WebSocket-Reconnect bei Verbindungsverlust
  Given ich habe Projekt "project-a" mit aktiver WebSocket-Verbindung
  When die Verbindung unerwartet abbricht
  Then wird automatisch eine neue Verbindung hergestellt
  And der Workflow-Status wird synchronisiert
```

```gherkin
Scenario: Maximale Verbindungen pro Session
  Given ich habe 10 Projekte geöffnet
  When nur 3 Projekte aktive Workflows haben
  Then existieren nur 3 aktive WebSocket-Verbindungen
  And inaktive Projekte haben keine permanente Verbindung
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [ ] FILE_EXISTS: agent-os-ui/server/src/services/websocket-manager.service.ts

### Inhalt-Prüfungen

- [ ] CONTAINS: agent-os-ui/server/src/services/websocket-manager.service.ts enthält "projectId"
- [ ] CONTAINS: agent-os-ui/server/src/services/websocket-manager.service.ts enthält "Map"

### Funktions-Prüfungen

- [ ] LINT_PASS: npm run lint exits with code 0
- [ ] TEST_PASS: npm run test -- --filter="websocket-manager" exits with code 0

---

## Required MCP Tools

| Tool | Purpose | Blocking |
|------|---------|----------|
| None | - | - |

---

## Technisches Refinement (vom Architect)

> **Ausgefüllt:** 2026-01-30

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

**Status: Done** (2026-02-02)

---

### Betroffene Layer & Komponenten

**Integration Type:** Backend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Backend | websocket-manager.service.ts | Neu erstellen |
| Backend | websocket.ts | Anpassen (Multi-Project) |
| Backend | workflow-executor.ts | Anpassen (Project-ID) |

**Kritische Integration Points:**
- Bezieht Project-Context aus project-context.service (MPRO-004)
- WebSocket-Nachrichten enthalten `projectId` für Routing
- Frontend muss projectId bei Verbindungsaufbau senden

---

### Technical Details

**WAS:**
- Neuer Service `WebSocketManagerService` für Multi-Connection-Management
- Mapping: `projectId` -> `WebSocket[]` für Nachrichten-Routing
- Erweitertes WebSocket-Protokoll mit `projectId` in allen Nachrichten
- Automatisches Cleanup bei Connection-Close
- Workflow-Output wird nur an zugehöriges Projekt gesendet

**WIE (Architektur-Guidance ONLY):**
- `Map<string, Set<WebSocket>>` für Project-zu-Connections Mapping
- Erweitere WebSocket-Message Interface um `projectId: string`
- Bei Connection-Setup: Parse `projectId` aus Query-Parameter oder Initial-Message
- Broadcast-Methode: `sendToProject(projectId, message)` statt globales Broadcast
- Memory-Leak Prevention: Cleanup in `ws.on('close')` Handler
- Integration mit bestehender websocket.ts - erweitern, nicht ersetzen
- Lazy Connection: Verbindung nur wenn Workflow gestartet wird

**WO:**
- `agent-os-ui/src/server/websocket-manager.service.ts` (Neu)
- `agent-os-ui/src/server/websocket.ts` (Anpassen)
- `agent-os-ui/src/server/workflow-executor.ts` (Anpassen)

**WER:** dev-team__backend-developer

**Abhängigkeiten:** MPRO-004

**Geschätzte Komplexität:** M

**Relevante Skills:**
- `backend-express` - WebSocket-Patterns
- `quality-gates` - Memory-Leak Prevention, Connection-Cleanup

**Creates Reusable:** yes

| Artefakt | Typ | Pfad | Beschreibung |
|----------|-----|------|--------------|
| `WebSocketManagerService` | Service | `agent-os-ui/src/server/websocket-manager.service.ts` | Multi-Connection WebSocket-Routing nach projectId |

---

### Completion Check

```bash
# Auto-Verify Commands - alle müssen mit 0 exiten
test -f agent-os-ui/src/server/websocket-manager.service.ts && echo "Service exists"
grep -q "projectId" agent-os-ui/src/server/websocket-manager.service.ts
grep -q "Map" agent-os-ui/src/server/websocket-manager.service.ts
grep -q "projectId" agent-os-ui/src/server/websocket.ts
cd agent-os-ui && npm run lint
cd agent-os-ui && npm run test -- --filter="websocket-manager"
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen
