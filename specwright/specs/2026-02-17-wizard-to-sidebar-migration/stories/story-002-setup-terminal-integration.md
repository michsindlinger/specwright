# Setup-Terminal in Sidebar

> Story ID: WSM-002
> Spec: Wizard-to-Sidebar Migration
> Created: 2026-02-17
> Last Updated: 2026-02-17

**Priority**: High
**Type**: Frontend
**Estimated Effort**: S
**Dependencies**: WSM-001
**Status**: Done

---

## Feature

```gherkin
Feature: Installation/Migration ueber Sidebar-Terminal
  Als Entwickler
  moechte ich bei Klick auf "Installation/Migration starten" ein Terminal in der Sidebar sehen,
  damit der Setup-Befehl direkt ausgefuehrt wird ohne modales Fenster.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Installations-Terminal oeffnet sich

```gherkin
Scenario: Klick auf Installation oeffnet Sidebar-Terminal
  Given ich bin auf der Getting Started Seite eines Projekts ohne Specwright
  When ich auf "Installation starten" klicke
  Then oeffnet sich das Cloud Terminal in der rechten Sidebar
  And eine neue Shell-Session mit dem Namen "Installation" wird erstellt
  And der curl-Installationsbefehl wird automatisch ausgefuehrt
```

### Szenario 2: Migrations-Terminal oeffnet sich

```gherkin
Scenario: Klick auf Migration oeffnet Sidebar-Terminal
  Given ich bin auf der Getting Started Seite eines Projekts mit agent-os/
  When ich auf "Migration starten" klicke
  Then oeffnet sich das Cloud Terminal in der rechten Sidebar
  And eine neue Shell-Session mit dem Namen "Migration" wird erstellt
  And der curl-Migrationsbefehl wird automatisch ausgefuehrt
```

### Szenario 3: Auto-Detection nach erfolgreicher Installation

```gherkin
Scenario: Projektzustand aktualisiert sich nach Installation
  Given das Installations-Terminal laeuft in der Sidebar
  When der Installationsprozess erfolgreich abschliesst (exit code 0)
  Then wird der Projektzustand automatisch neu validiert
  And die Getting Started Seite zeigt die Planning-Kacheln
  And ich muss die Seite nicht manuell neu laden
```

### Edge Case: Doppelklick-Schutz

```gherkin
Scenario: Kein zweites Setup-Terminal bei Doppelklick
  Given ein Setup-Terminal laeuft bereits in der Sidebar
  When ich erneut auf "Installation starten" klicke
  Then wird kein zweites Terminal geoeffnet
  And ich werde auf das bestehende Terminal hingewiesen
```

### Edge Case: Installation schlaegt fehl

```gherkin
Scenario: Fehlgeschlagene Installation loest keine Aktualisierung aus
  Given das Installations-Terminal laeuft in der Sidebar
  When der Installationsprozess fehlschlaegt (exit code != 0)
  Then bleibt die Getting Started Seite unveraendert
  And das Terminal zeigt die Fehlerausgabe
```

---

## Technische Verifikation (Automated Checks)

### Datei-Pruefungen

- [x] FILE_EXISTS: ui/frontend/src/app.ts
- [x] FILE_EXISTS: ui/frontend/src/components/terminal/aos-cloud-terminal-sidebar.ts

### Inhalt-Pruefungen

- [x] CONTAINS: app.ts enthaelt "_openSetupTerminalTab"
- [x] CONTAINS: app.ts enthaelt "_handleStartSetupTerminal"
- [x] CONTAINS: app.ts enthaelt "start-setup-terminal"
- [x] CONTAINS: app.ts enthaelt "isSetupSession"
- [x] CONTAINS: aos-cloud-terminal-sidebar.ts enthaelt "isSetupSession"
- [x] CONTAINS: aos-cloud-terminal-sidebar.ts enthaelt "setupType"

### Funktions-Pruefungen

- [x] BUILD_PASS: cd ui/frontend && npm run build exits with code 0

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
- [x] Abhaengigkeiten identifiziert (WSM-001)
- [x] Betroffene Komponenten bekannt
- [x] Erforderliche MCP Tools dokumentiert (keine)
- [x] Story ist angemessen geschaetzt (2 Dateien, ~100 LOC)

#### Full-Stack Konsistenz
- [x] Alle betroffenen Layer identifiziert (Frontend only)
- [x] Integration Type bestimmt (Frontend-only)
- [x] Kritische Integration Points dokumentiert
- [x] Handover-Dokumente definiert (keine noetig)

**Story ist READY wenn alle Checkboxen angehakt sind.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [x] Code implementiert und folgt Style Guide
- [x] Architektur-Vorgaben eingehalten (WIE section)
- [x] Security/Performance Anforderungen erfuellt

#### Qualitaetssicherung
- [x] Alle Akzeptanzkriterien erfuellt (via Completion Check verifiziert)
- [x] Kein separater Unit-Test noetig (Integration-Logik, wird durch Build + System Stories verifiziert)
- [ ] Code Review durchgefuehrt und genehmigt

#### Dokumentation
- [x] Keine Linting Errors
- [x] Completion Check Commands alle erfolgreich (exit 0)

#### Integration DoD
- [x] **Integration hergestellt: aos-getting-started-view -> app.ts -> Gateway**
  - [x] Event-Handler `@start-setup-terminal` in renderView() registriert
  - [x] Gateway-Listener fuer `cloud-terminal:closed` registriert und deregistriert
  - [x] Validierung: Build kompiliert ohne Fehler

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Aenderung |
|-------|-------------|----------|
| Frontend | aos-cloud-terminal-sidebar.ts | TerminalSession Interface: isSetupSession und setupType hinzufuegen |
| Frontend | app.ts | Neue Methoden: _openSetupTerminalTab(), _handleStartSetupTerminal(). Gateway-Listener fuer cloud-terminal:closed (Setup-Sessions). One-Shot Listener fuer auto-execute. renderView() Event-Handler aendern. |

**Kritische Integration Points:**
- aos-getting-started-view (Event) -> app.ts (_handleStartSetupTerminal)
- app.ts (_openSetupTerminalTab) -> Gateway (cloud-terminal:create + cloud-terminal:input)
- Gateway (cloud-terminal:closed) -> app.ts (Re-Validierung)

---

### Technical Details

**WAS:** TerminalSession Interface erweitern. Neue Methode _openSetupTerminalTab() fuer Shell-Session mit Auto-Execute. Event-Handler fuer start-setup-terminal. Gateway-Listener fuer cloud-terminal:closed zur Auto-Detection.

**WIE (Architektur-Guidance ONLY):**
- TerminalSession Interface: Nur 2 optionale Felder hinzufuegen (non-breaking)
- _openSetupTerminalTab(): Folge dem Pattern aus dem Wizard (startTerminal method lines 328-385)
- One-Shot Gateway Listener: Registrieren VOR dem Send, nach Empfang sofort deregistrieren. 500ms Delay fuer TERMINAL_READY_DELAY.
- cloud-terminal:closed Listener: In connectedCallback() registrieren, in disconnectedCallback() deregistrieren. Session-Match via terminalSessionId, isSetupSession pruefen, exitCode pruefen.
- Guard: Vor Erstellen eines Setup-Terminals pruefen ob bereits eines in terminalSessions existiert (isSetupSession === true && status !== 'disconnected')
- renderView(): Event-Handler von @start-wizard auf @start-setup-terminal aendern

**WO:**
- ui/frontend/src/components/terminal/aos-cloud-terminal-sidebar.ts (Interface-Erweiterung)
- ui/frontend/src/app.ts (Neue Methoden, Event-Handler, Gateway-Listener)

**Abhaengigkeiten:** WSM-001

**Geschaetzte Komplexitaet:** S

---

### Relevante Skills

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | .claude/skills/frontend-lit/SKILL.md | Lit Component Patterns, Event-Handling |
| backend-express | .claude/skills/backend-express/SKILL.md | Gateway/WebSocket Integration Patterns |
| domain-specwright-ui | .claude/skills/domain-specwright-ui/SKILL.md | Cloud Terminal Domain Knowledge |

---

### Creates Reusable Artifacts

**Creates Reusable:** no

---

### Completion Check

```bash
# Verify build passes
cd ui/frontend && npm run build

# Verify new method exists
grep -q "_openSetupTerminalTab" ui/frontend/src/app.ts

# Verify event handler exists
grep -q "_handleStartSetupTerminal" ui/frontend/src/app.ts

# Verify interface extension
grep -q "isSetupSession" ui/frontend/src/components/terminal/aos-cloud-terminal-sidebar.ts
grep -q "setupType" ui/frontend/src/components/terminal/aos-cloud-terminal-sidebar.ts
```

**Story ist DONE wenn:**
1. Alle CONTAINS checks bestanden
2. Build passes
3. Git diff zeigt nur erwartete Aenderungen
