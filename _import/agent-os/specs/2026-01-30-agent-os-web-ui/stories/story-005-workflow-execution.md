# Workflow Execution

> Story ID: AOSUI-005
> Spec: Agent OS Web UI
> Created: 2026-01-30
> Last Updated: 2026-01-30
> Status: Done

**Priority**: High
**Type**: Full-stack
**Estimated Effort**: M
**Dependencies**: AOSUI-001, AOSUI-002, AOSUI-003, AOSUI-004

---

## Feature

```gherkin
Feature: Workflow Execution mit Progress
  Als Benutzer
  möchte ich Agent OS Workflows über die UI starten können,
  damit ich /create-spec, /execute-tasks etc. ohne Terminal nutzen kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Workflow-Liste anzeigen

```gherkin
Scenario: Verfügbare Workflows werden angezeigt
  Given ich bin im Workflow-View
  When die Seite geladen ist
  Then sehe ich eine Liste der verfügbaren Slash-Commands
  And jeder Command hat einen kurzen Beschreibungstext
```

### Szenario 2: Workflow starten

```gherkin
Scenario: /create-spec Workflow starten
  Given ich bin im Workflow-View
  When ich auf "/create-spec" klicke
  Then öffnet sich ein Dialog für Parameter
  And ich kann den Workflow mit "Start" ausführen
```

### Szenario 3: Progress-Anzeige für lange Tasks

```gherkin
Scenario: Langer Workflow zeigt Fortschritt
  Given ich habe einen Workflow gestartet der länger als 30 Sekunden dauert
  When der Workflow läuft
  Then sehe ich einen Progress-Indicator
  And ich sehe wie lange der Task schon läuft
  And der Output wird live gestreamt
```

### Szenario 4: Workflow abbrechen

```gherkin
Scenario: Laufenden Workflow abbrechen
  Given ein Workflow läuft seit 2 Minuten
  When ich auf "Abbrechen" klicke
  Then wird der Workflow gestoppt
  And ich sehe eine Bestätigung "Workflow abgebrochen"
  And der bisherige Output bleibt sichtbar
```

### Szenario 5: Background Execution

```gherkin
Scenario: Workflow im Hintergrund ausführen
  Given ich habe einen Workflow gestartet
  When ich auf "Im Hintergrund weiter" klicke
  Then kann ich zu anderen Views navigieren
  And ein Badge zeigt "1 Workflow läuft"
  And ich kann jederzeit zum laufenden Workflow zurückkehren
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Workflow schlägt fehl
  Given ich habe /execute-tasks gestartet
  When ein Fehler während der Ausführung auftritt
  Then sehe ich die Fehlermeldung im Output
  And der Status wechselt zu "Fehlgeschlagen"
  And ich kann den Fehler-Log kopieren
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [x] FILE_EXISTS: agent-os-ui/ui/src/views/workflow-view.ts
- [x] FILE_EXISTS: agent-os-ui/ui/src/components/workflow-card.ts
- [x] FILE_EXISTS: agent-os-ui/ui/src/components/workflow-progress.ts
- [x] FILE_EXISTS: agent-os-ui/src/server/workflow-executor.ts

### Inhalt-Prüfungen

- [x] CONTAINS: workflow-view.ts enthält "cancel"
- [x] CONTAINS: workflow-executor.ts enthält "query" (Agent SDK)
- [x] CONTAINS: workflow-progress.ts enthält "elapsed"

### Funktions-Prüfungen

- [x] BUILD_PASS: cd agent-os-ui && npm run build
- [x] LINT_PASS: cd agent-os-ui && npm run lint

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
- [x] Unit Tests geschrieben und bestanden
- [x] Code Review durchgeführt

#### Dokumentation
- [x] Keine Linting Errors
- [x] Completion Check Commands erfolgreich

---

### Betroffene Layer & Komponenten

**Integration Type:** Full-stack

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Backend | src/server/workflow-executor.ts | Workflow-Management mit AbortController |
| Backend | src/server/claude-handler.ts | UPDATE: Skill/Command Execution |
| Frontend | ui/src/views/workflow-view.ts | Workflow Listing und Execution UI |
| Frontend | ui/src/components/workflow-card.ts | Workflow Command Card |
| Frontend | ui/src/components/workflow-progress.ts | Progress mit Timer |

**Kritische Integration Points:**
- WebSocket Event: `workflow.list` → Verfügbare Slash-Commands
- WebSocket Event: `workflow.start` → Startet Workflow
- WebSocket Event: `workflow.progress` → Progress Updates
- WebSocket Event: `workflow.cancel` → Abbruch-Signal
- WebSocket Event: `workflow.complete` → Workflow fertig/fehlgeschlagen

---

### Technical Details

**WAS:**
- Workflow Executor mit AbortController Support
- Workflow Liste aus .claude/commands/ Verzeichnis
- Workflow Card mit Name, Beschreibung, Start-Button
- Progress Component mit Elapsed Timer
- Cancel Button während Ausführung
- Background Execution Badge im Header
- Error Log Copy-Funktion

**WIE:**
- Liest .claude/commands/agent-os/*.md für Workflow-Liste
- Agent SDK query() mit AbortSignal
- setInterval() für Elapsed Timer
- Global State für laufende Background-Workflows
- WebSocket Events für alle Status-Änderungen
- Error State mit vollständigem Log

**WO:**
```
agent-os-ui/
├── src/
│   └── server/
│       ├── workflow-executor.ts    # NEU: Workflow Management
│       └── claude-handler.ts       # UPDATE: Abort Support
└── ui/
    └── src/
        ├── views/
        │   └── workflow-view.ts    # UPDATE: Full Implementation
        └── components/
            ├── workflow-card.ts    # NEU: Command Card
            └── workflow-progress.ts # NEU: Progress + Timer
```

**WER:** dev-team__fullstack-developer

**Abhängigkeiten:** AOSUI-001, AOSUI-002, AOSUI-003, AOSUI-004

**Geschätzte Komplexität:** M

---

### Completion Check

```bash
# Verify files exist
test -f agent-os-ui/src/server/workflow-executor.ts && echo "OK: workflow-executor.ts exists"
test -f agent-os-ui/ui/src/views/workflow-view.ts && echo "OK: workflow-view.ts exists"
test -f agent-os-ui/ui/src/components/workflow-card.ts && echo "OK: workflow-card.ts exists"
test -f agent-os-ui/ui/src/components/workflow-progress.ts && echo "OK: workflow-progress.ts exists"

# Verify cancel support
grep -q "cancel" agent-os-ui/ui/src/views/workflow-view.ts && echo "OK: Cancel support"

# Verify elapsed timer
grep -q "elapsed" agent-os-ui/ui/src/components/workflow-progress.ts && echo "OK: Elapsed timer"

# Verify Agent SDK usage
grep -q "query" agent-os-ui/src/server/workflow-executor.ts && echo "OK: Uses Agent SDK"

# Build check
cd agent-os-ui && npm run build && echo "OK: Full build passes"
```
