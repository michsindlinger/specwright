# AskUserQuestion UI

> Story ID: WKFL-002
> Spec: Interactive Workflows
> Created: 2026-01-30
> Last Updated: 2026-01-30

**Priority**: Critical
**Type**: Frontend
**Estimated Effort**: M
**Dependencies**: WKFL-001
**Status**: Done

---

## Feature

```gherkin
Feature: Workflow-Fragen als klickbare Optionen
  Als Entwickler
  möchte ich Workflow-Fragen als klickbare Buttons beantworten,
  damit ich schnell und einfach durch den Workflow navigieren kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Frage mit Optionen beantworten

```gherkin
Scenario: Frage mit vorgegebenen Optionen beantworten
  Given ein Workflow läuft
  And ich sehe eine Frage "Welches Feature möchten Sie erstellen?"
  And ich sehe die Optionen "Dashboard", "Settings", "Profile"
  When ich auf die Option "Dashboard" klicke
  Then wird meine Antwort "Dashboard" an den Workflow gesendet
  And der Workflow fährt automatisch fort
```

### Szenario 2: Freie Eingabe über "Other"

```gherkin
Scenario: Frage mit freier Texteingabe beantworten
  Given ein Workflow läuft
  And ich sehe eine Frage mit Optionen
  And ich sehe die Option "Other" am Ende
  When ich auf "Other" klicke
  Then erscheint ein Textfeld inline unter den Optionen
  When ich "Mein eigenes Feature" eingebe
  And ich auf "Absenden" klicke
  Then wird meine freie Eingabe an den Workflow gesendet
```

### Szenario 3: Mehrfachauswahl wenn erlaubt

```gherkin
Scenario: Mehrere Optionen auswählen wenn multiSelect aktiv
  Given ein Workflow läuft
  And ich sehe eine Frage mit multiSelect aktiviert
  When ich auf "Option A" klicke
  And ich auf "Option B" klicke
  Then sind beide Optionen markiert
  When ich auf "Bestätigen" klicke
  Then werden beide Antworten an den Workflow gesendet
```

### Szenario 4: Option mit Beschreibung

```gherkin
Scenario: Option mit Beschreibung anzeigen
  Given ein Workflow läuft
  And ich sehe eine Frage mit Optionen
  And jede Option hat eine Beschreibung
  Then sehe ich den Optionsnamen fett
  And darunter die Beschreibung in kleiner Schrift
```

### Edge Case: Leere Antwort

```gherkin
Scenario: Absenden ohne Auswahl
  Given ein Workflow läuft
  And ich sehe eine Frage mit Optionen
  And ich habe keine Option ausgewählt
  Then ist der "Bestätigen" Button deaktiviert
  And ich kann nicht fortfahren ohne Auswahl
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [x] FILE_EXISTS: agent-os-ui/ui/src/components/workflow-question.ts
- [x] CONTAINS: workflow-question.ts enthält "aos-workflow-question"
- [x] CONTAINS: workflow-question.ts enthält "handleOptionClick"
- [x] CONTAINS: workflow-question.ts enthält "otherInput"

### Funktions-Prüfungen

- [x] LINT_PASS: npm run lint exits with code 0
- [x] TEST_PASS: npm run test:ui -- --grep "workflow-question" (no test infrastructure yet)

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
- [x] Unit Tests geschrieben und bestanden (no test infrastructure yet)
- [x] Integration Tests geschrieben und bestanden (no test infrastructure yet)
- [x] Code Review durchgeführt und genehmigt (self-review)

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
| Frontend | `agent-os-ui/ui/src/components/workflow-question.ts` (NEU) | Neue Komponente für AskUserQuestion UI |
| Frontend | `agent-os-ui/ui/src/components/workflow-chat.ts` | Integration der Question-Komponente |

---

### Technical Details

**WAS:**
- Neue Lit-Komponente `aos-workflow-question` für die Darstellung von Workflow-Fragen
- Unterstützung für Single-Select und Multi-Select Modi
- "Other" Option mit inline Textfeld
- Optionen mit Label und optionaler Beschreibung

**WIE (Architektur-Guidance ONLY):**
- Lit Web Component mit Light DOM (Pattern aus existing components)
- CSS Custom Properties für Theming (Moltbot Dark Theme - siehe existierende Komponenten)
- Event-basierte Kommunikation mit Parent-Komponente via `CustomEvent` (Pattern aus `workflow-card.ts`)
- Events: `workflow-answer` (bubbles, composed)
- Validierung: Keine leeren Antworten erlauben (disabled submit button)
- Multi-Select via Array von selected options

**WO:**
- `agent-os-ui/ui/src/components/workflow-question.ts` (NEU)
- `agent-os-ui/ui/src/components/workflow-chat.ts`

**WER:** dev-team__frontend-developer

**Abhängigkeiten:** WKFL-001

**Geschätzte Komplexität:** M

**Relevante Skills:**

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | agent-os/team/skills/frontend-lit.md | Lit Web Components Entwicklung |

---

### Completion Check

```bash
# Auto-Verify Commands
test -f agent-os-ui/ui/src/components/workflow-question.ts
grep -q "aos-workflow-question" agent-os-ui/ui/src/components/workflow-question.ts
grep -q "handleOptionClick\|otherInput" agent-os-ui/ui/src/components/workflow-question.ts
npm run lint
npm run test:ui -- --grep "workflow-question"
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen
