# Workflow-Start über Karten

> Story ID: WKFL-001
> Spec: Interactive Workflows
> Created: 2026-01-30
> Last Updated: 2026-01-30

**Priority**: Critical
**Type**: Frontend
**Estimated Effort**: S
**Dependencies**: None
**Status**: Done

---

## Feature

```gherkin
Feature: Workflow über Karten starten
  Als Entwickler
  möchte ich einen Workflow über eine Workflow-Karte starten,
  damit ich interaktiv durch den Workflow geführt werde.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Workflow starten ohne Argumente

```gherkin
Scenario: Workflow starten ohne Argumente
  Given ich bin in der Workflow-View
  And ich sehe die Workflow-Karte "create-spec"
  When ich auf die Karte "create-spec" klicke
  Then öffnet sich ein Chat-Bereich inline in der Workflow-View
  And ich sehe eine Willkommensnachricht vom Workflow
  And der Workflow beginnt automatisch
```

### Szenario 2: Workflow starten mit Argumenten

```gherkin
Scenario: Workflow starten mit optionalen Argumenten
  Given ich bin in der Workflow-View
  And ich sehe die Workflow-Karte "create-spec"
  When ich auf das Optionen-Icon der Karte klicke
  Then öffnet sich ein Eingabefeld für Argumente
  When ich "Neues Feature für Authentifizierung" eingebe
  And ich auf "Starten" klicke
  Then startet der Workflow mit meinem Argument als Kontext
```

### Szenario 3: Nur ein Workflow gleichzeitig

```gherkin
Scenario: Zweiter Workflow während aktivem Workflow
  Given ein Workflow "create-spec" läuft bereits
  When ich versuche einen weiteren Workflow zu starten
  Then sehe ich einen Hinweis "Ein Workflow läuft bereits"
  And der bestehende Workflow bleibt aktiv
```

### Edge Case: Workflow nicht verfügbar

```gherkin
Scenario: Workflow-Start wenn Claude CLI nicht erreichbar
  Given ich bin in der Workflow-View
  When ich auf die Karte "create-spec" klicke
  And Claude CLI ist nicht erreichbar
  Then sehe ich eine Fehlermeldung "Claude CLI nicht verfügbar"
  And ich sehe einen "Erneut versuchen" Button
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [ ] FILE_EXISTS: agent-os-ui/ui/src/views/workflow-view.ts
- [ ] CONTAINS: workflow-view.ts enthält "startInteractiveWorkflow"
- [ ] CONTAINS: workflow-view.ts enthält "aos-workflow-chat"

### Funktions-Prüfungen

- [ ] LINT_PASS: npm run lint exits with code 0
- [ ] TEST_PASS: npm run test:ui -- --grep "workflow-start" exits with code 0

---

## Required MCP Tools

| Tool | Purpose | Blocking |
|------|---------|----------|
| None | N/A | No |

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

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | `agent-os-ui/ui/src/views/workflow-view.ts` | Erweitern um inline Chat-Bereich für aktiven Workflow |
| Frontend | `agent-os-ui/ui/src/components/workflow-card.ts` | Optionen-Icon und Argument-Eingabe hinzufügen |
| Frontend | `agent-os-ui/ui/src/components/workflow-chat.ts` (NEU) | Neue Komponente für interaktiven Workflow-Chat |

**Kritische Integration Points:**
- N/A (Frontend-only)

---

### Technical Details

**WAS:**
- Workflow-View erweitern um einen inline Chat-Bereich der erscheint wenn ein Workflow gestartet wird
- Workflow-Karten erweitern um Optionen-Icon für Argument-Eingabe
- State-Management für aktiven Workflow (nur einer gleichzeitig)
- Workflow-Chat-Komponente erstellen für die Darstellung von Workflow-Messages

**WIE (Architektur-Guidance ONLY):**
- Nutze bestehendes Lit-Component-Pattern aus `workflow-view.ts` (Light DOM, `@state()` decorators)
- Existing `activeExecution` state kann erweitert werden für Chat-Modus
- Workflow-Start triggert bereits existierende WebSocket-Nachricht `workflow.start`
- Prüfung auf aktiven Workflow über `this.activeExecution !== null`
- Neues Flag `@state() private interactiveMode = false` für Chat-Ansicht

**WO:**
- `agent-os-ui/ui/src/views/workflow-view.ts`
- `agent-os-ui/ui/src/components/workflow-card.ts`
- `agent-os-ui/ui/src/components/workflow-chat.ts` (NEU)

**WER:** dev-team__frontend-developer

**Abhängigkeiten:** None

**Geschätzte Komplexität:** S

**Relevante Skills:**

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | agent-os/team/skills/frontend-lit.md | Lit Web Components Entwicklung |

---

### Completion Check

```bash
# Auto-Verify Commands - alle müssen mit 0 exiten
grep -q "startInteractiveWorkflow\|interactiveMode" agent-os-ui/ui/src/views/workflow-view.ts
test -f agent-os-ui/ui/src/components/workflow-chat.ts
npm run lint
npm run test:ui -- --grep "workflow"
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen
