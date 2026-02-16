# Frontend Workflow-Tab-Integration

> Story ID: WTT-002
> Spec: Workflow Terminal Tabs
> Created: 2026-02-16
> Last Updated: 2026-02-16

**Priority**: Critical
**Type**: Frontend
**Estimated Effort**: S
**Dependencies**: WTT-001

---

## Feature

```gherkin
Feature: Workflow-Tabs im Cloud Terminal
  Als Entwickler
  moechte ich Workflow-Ausfuehrungen als Tabs im Cloud Terminal sehen,
  damit ich zwischen laufenden Workflows und dem Rest der UI wechseln kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Workflow-Tab wird angezeigt

```gherkin
Scenario: Workflow-Tab mit korrektem Titel
  Given eine Workflow-Session "execute-tasks" mit Kontext "FE-001" wurde erstellt
  When der Tab in der Terminal-Sidebar erscheint
  Then zeigt der Tab den Titel "execute-tasks: FE-001"
  And der Tab hat ein Workflow-spezifisches Icon
```

### Szenario 2: Auto-Connect ohne Model-Selector

```gherkin
Scenario: Workflow-Session verbindet automatisch ohne Model-Auswahl
  Given ein neuer Workflow-Tab wurde programmatisch erstellt
  When die Terminal-Session initialisiert wird
  Then wird keine Model-Auswahl angezeigt
  And die Session verbindet sich direkt mit dem Backend
```

### Szenario 3: Workflow-Tab programmatisch oeffnen

```gherkin
Scenario: Sidebar oeffnet und erstellt Workflow-Tab
  Given die Terminal-Sidebar ist geschlossen
  When ein Workflow programmatisch gestartet wird
  Then oeffnet sich die Terminal-Sidebar automatisch
  And ein neuer Workflow-Tab ist aktiv
  And der Workflow laeuft im Terminal
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Workflow-Tab bei bereits offener Sidebar
  Given die Terminal-Sidebar ist bereits offen mit einem Shell-Tab
  When ein neuer Workflow gestartet wird
  Then wird ein zusaetzlicher Workflow-Tab hinzugefuegt
  And der neue Workflow-Tab wird automatisch aktiv
  And der bestehende Shell-Tab bleibt erhalten
```

---

## Technische Verifikation (Automated Checks)

### Datei-Pruefungen

- [x] CONTAINS: ui/frontend/src/components/terminal/aos-cloud-terminal-sidebar.ts enthaelt "isWorkflow"
- [x] CONTAINS: ui/frontend/src/components/terminal/aos-terminal-tabs.ts enthaelt "isWorkflow"
- [x] CONTAINS: ui/frontend/src/components/terminal/aos-terminal-session.ts enthaelt "isWorkflow"

### Funktions-Pruefungen

- [x] BUILD_PASS: cd ui/frontend && npm run build

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

**Integration Type:** Frontend-only

| Layer | Komponenten | Aenderung |
|-------|-------------|----------|
| Frontend | aos-cloud-terminal-sidebar.ts | TerminalSession Interface erweitern, openWorkflowTab() Methode |
| Frontend | aos-terminal-tabs.ts | Workflow-Tab-Styling, Icon |
| Frontend | aos-terminal-session.ts | Auto-Connect fuer Workflow-Sessions |
| Frontend | cloud-terminal.service.ts | PersistedTerminalSession erweitern |

**Kritische Integration Points:**
- Backend `cloud-terminal:create-workflow` Response -> Frontend Session-Erstellung

---

### Technical Details

**WAS:**
- `TerminalSession` Interface erweitern um `isWorkflow?`, `workflowName?`, `workflowContext?`, `needsInput?`
- `PersistedTerminalSession` im Cloud Terminal Service um gleiche Felder erweitern
- `aos-terminal-tabs.ts` zeigt Workflow-Tabs mit spezifischem Styling (Workflow-Name als Tab-Titel)
- `aos-terminal-session.ts` ueberspringt Model-Selector wenn `isWorkflow === true` und sendet direkt `cloud-terminal:create-workflow`
- `aos-cloud-terminal-sidebar.ts` bekommt public Methode `openWorkflowTab()` die programmatisch Tab erstellt und Sidebar oeffnet

**WIE (Architektur-Guidance):**
- Folge dem bestehenden Pattern fuer Tab-Erstellung in `aos-cloud-terminal-sidebar.ts`
- `openWorkflowTab()` erstellt ein neues `TerminalSession`-Objekt mit `isWorkflow: true` und fuegt es zu `sessions` hinzu
- Nutze Lit reactive Properties (`@property`, `@state`) fuer Session-State
- Tab-Titel: `session.workflowName + ': ' + session.workflowContext` (Fallback: nur `workflowName`)
- Model-Selector-Skip: In `aos-terminal-session.ts` pruefen ob `session.isWorkflow` bevor Model-UI gerendert wird

**WO:**
- `ui/frontend/src/components/terminal/aos-cloud-terminal-sidebar.ts`
- `ui/frontend/src/components/terminal/aos-terminal-tabs.ts`
- `ui/frontend/src/components/terminal/aos-terminal-session.ts`
- `ui/frontend/src/services/cloud-terminal.service.ts`

**Abhaengigkeiten:** WTT-001

**Geschaetzte Komplexitaet:** S

**Relevante Skills:**

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | .claude/skills/frontend-lit/SKILL.md | Lit Web Component Patterns |

---

### Creates Reusable Artifacts

**Creates Reusable:** no

---

### Completion Check

```bash
# Auto-Verify Commands
grep -q "isWorkflow" ui/frontend/src/components/terminal/aos-cloud-terminal-sidebar.ts && echo "OK sidebar"
grep -q "isWorkflow" ui/frontend/src/components/terminal/aos-terminal-tabs.ts && echo "OK tabs"
grep -q "isWorkflow" ui/frontend/src/components/terminal/aos-terminal-session.ts && echo "OK session"
cd ui/frontend && npm run build
```
