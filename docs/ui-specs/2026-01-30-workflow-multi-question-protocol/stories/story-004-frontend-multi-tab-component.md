# Story MQP-004: Frontend Multi-Tab Question Component

> **ID:** MQP-004
> **Type:** Frontend
> **Complexity:** M
> **Status:** Done

## User Story

```gherkin
Feature: Frontend Multi-Tab Question Component
  Als User
  möchte ich mehrere Workflow-Fragen in einer Tab-basierten UI sehen,
  damit ich alle Fragen überblicken und bequem beantworten kann.
```

## Akzeptanzkriterien (Gherkin)

```gherkin
Scenario: Tab-Navigation wird angezeigt
  Given ein questionBatch mit 3 Fragen kommt an
  When die workflow-question-batch Komponente rendert
  Then sehe ich 3 Tabs mit den Frage-Headern
  And der erste Tab ist aktiv

Scenario: Zwischen Tabs navigieren
  Given ich sehe die Multi-Tab UI mit 3 Fragen
  When ich auf Tab 2 klicke
  Then wird Frage 2 angezeigt
  And Tab 2 ist als aktiv markiert

Scenario: Zurück/Weiter Navigation
  Given ich bin bei Frage 2 von 3
  When ich auf "Weiter" klicke
  Then sehe ich Frage 3
  When ich auf "Zurück" klicke
  Then sehe ich Frage 2

Scenario: Option auswählen
  Given ich sehe eine Frage mit 3 Optionen
  When ich Option 2 auswähle
  Then ist Option 2 markiert
  And meine Auswahl wird gespeichert

Scenario: Other/Custom Antwort
  Given ich sehe eine Frage mit Optionen
  When ich "Other" auswähle
  Then erscheint ein Textfeld für meine eigene Antwort
  And ich kann meinen Text eingeben

Scenario: Submit Button
  Given ich habe alle 3 Fragen beantwortet
  When ich auf "Submit" klicke
  Then wird ein answerBatch Event gesendet
  And alle meine Antworten sind enthalten
```

## Business Value

Die Multi-Tab UI ist das zentrale UX-Element des Features. Sie ermöglicht dem User eine übersichtliche Ansicht aller Fragen mit einfacher Navigation.

---

## Technisches Refinement (vom Architect)

### DoR (Definition of Ready)

- [x] Fachliche Requirements klar (User Story + Akzeptanzkriterien)
- [x] Technischer Ansatz definiert
- [x] Abhängigkeiten identifiziert
- [x] Betroffene Komponenten bekannt
- [x] Story ist angemessen dimensioniert (max 5 Dateien, 400 LOC)
- [x] Alle betroffenen Layer identifiziert
- [x] Integration Type bestimmt
- [x] Kritische Integration Points dokumentiert (wenn Full-stack)
- [x] WO deckt ALLE Layer ab (wenn Full-stack)

### DoD (Definition of Done)

- [x] Code implementiert und folgt Style Guide
- [x] Architektur-Anforderungen erfüllt
- [x] Alle Akzeptanzkriterien erfüllt
- [x] Tests geschrieben und bestanden
- [x] Keine Linting-Fehler
- [x] Completion Check Commands erfolgreich
- [x] Keyboard Navigation funktioniert
- [x] ARIA Labels vorhanden

### Betroffene Layer & Komponenten

- **Integration Type:** Frontend-only

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | workflow-question-batch.ts | NEUE Komponente |
| Frontend | styles | CSS für Tabs, Navigation, Options |

### Technische Details

**WAS:**
- Neue Lit Web Component: workflow-question-batch.ts
- Tab-Navigation mit Headern
- Frage-Anzeige mit Options (Radio-Buttons)
- Other/Custom Text-Input
- Zurück/Weiter Buttons
- Submit Button
- Lokaler State für Antworten

**WIE (Architecture Guidance):**
- Nutze bestehendes Lit Component Pattern (aos- prefix)
- CSS Custom Properties für Theming
- Event-basierte Kommunikation (CustomEvent)
- Accessibility: ARIA roles, keyboard navigation
- Folge Pattern von workflow-question.ts

**WO:**
- `agent-os-ui/ui/src/components/workflow-question-batch.ts` (NEU)

**WER:** dev-team__frontend-developer

**Abhängigkeiten:** None

**Geschätzte Komplexität:** M

### Relevante Skills

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | .claude/skills/frontend-lit.md | Lit Web Components Pattern |

### Completion Check

```bash
# Frontend Build
cd agent-os-ui/ui && npm run build

# Frontend Lint
cd agent-os-ui/ui && npm run lint

# Frontend Tests (wenn vorhanden)
cd agent-os-ui/ui && npm test || true
```

### Technische Verifikation

- FILE_EXISTS: agent-os-ui/ui/src/components/workflow-question-batch.ts
- CONTAINS: "class WorkflowQuestionBatch extends LitElement" in workflow-question-batch.ts
- CONTAINS: "aos-workflow-question-batch" in workflow-question-batch.ts
- CONTAINS: "answerBatch" in workflow-question-batch.ts
- LINT_PASS: cd agent-os-ui/ui && npm run lint

### Story ist DONE wenn:

1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen

---

*Created with Agent OS /create-spec v2.7*
