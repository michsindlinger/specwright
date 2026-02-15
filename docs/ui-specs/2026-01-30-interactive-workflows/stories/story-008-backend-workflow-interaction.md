# Backend Workflow-Interaction

> Story ID: WKFL-008
> Spec: Interactive Workflows
> Created: 2026-01-30
> Last Updated: 2026-01-30

**Priority**: Critical
**Type**: Backend
**Estimated Effort**: M
**Dependencies**: None
**Status**: Done

---

## Feature

```gherkin
Feature: Bidirektionale Workflow-Kommunikation
  Als System
  muss ich Workflow-Fragen vom Claude CLI empfangen und Nutzer-Antworten zurücksenden,
  damit interaktive Workflows funktionieren.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: AskUserQuestion Event empfangen

```gherkin
Scenario: Workflow-Frage vom Backend empfangen
  Given ein Workflow läuft
  And Claude CLI sendet ein AskUserQuestion Tool-Call Event
  Then extrahiert das Backend die Frage-Daten (Question, Options, Header)
  And sendet eine "workflow.question" WebSocket-Nachricht an das Frontend
```

### Szenario 2: Nutzer-Antwort an Claude CLI senden

```gherkin
Scenario: Antwort vom Frontend an Claude CLI weiterleiten
  Given das Frontend zeigt eine Workflow-Frage
  And der Nutzer wählt eine Antwort
  When das Frontend "workflow.answer" sendet
  Then schreibt das Backend die Antwort an Claude CLI stdin
  And der Workflow fährt mit der Antwort fort
```

### Szenario 3: Multi-Select Antworten

```gherkin
Scenario: Mehrere Antworten übermitteln
  Given eine Frage erlaubt Multi-Select
  And der Nutzer hat 2 Optionen ausgewählt
  When das Frontend "workflow.answer" mit Array sendet
  Then formatiert das Backend die Antwort korrekt für Claude CLI
  And alle ausgewählten Optionen werden übermittelt
```

### Szenario 4: Free-Text Antwort ("Other")

```gherkin
Scenario: Freie Texteingabe übermitteln
  Given der Nutzer hat "Other" gewählt
  And einen eigenen Text eingegeben
  When das Frontend "workflow.answer" sendet
  Then wird der freie Text korrekt an Claude CLI übergeben
```

### Edge Case: Timeout bei Antwort

```gherkin
Scenario: Nutzer antwortet nicht innerhalb Timeout
  Given eine Workflow-Frage wird angezeigt
  And 5 Minuten vergehen ohne Antwort
  Then sendet das Backend ein Timeout-Event
  And der Workflow wird pausiert
  And das Frontend zeigt "Workflow pausiert - Antwort ausstehend"
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [ ] FILE_EXISTS: agent-os-ui/src/server/workflow-executor.ts
- [ ] CONTAINS: workflow-executor.ts enthält "workflow.question"
- [ ] CONTAINS: workflow-executor.ts enthält "workflow.answer"
- [ ] CONTAINS: workflow-executor.ts enthält "AskUserQuestion"

### Funktions-Prüfungen

- [ ] LINT_PASS: npm run lint exits with code 0
- [ ] TEST_PASS: npm run test -- --grep "workflow-executor" exits with code 0

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
- [x] Unit Tests geschrieben und bestanden (N/A - no test infrastructure)
- [x] Integration Tests geschrieben und bestanden (N/A - no test infrastructure)
- [x] Code Review durchgeführt und genehmigt

#### Dokumentation
- [x] Dokumentation aktualisiert
- [x] Keine Linting Errors
- [x] Completion Check Commands alle erfolgreich (exit 0)

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Backend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Backend | `agent-os-ui/src/server/workflow-executor.ts` | Interaktive Kommunikation mit Claude CLI |
| Backend | `agent-os-ui/src/server/websocket.ts` | Neue Message-Types für workflow.question/answer |

**Kritische Integration Points:**
- Claude CLI stdout (stream-json) → Backend parsing (`handleClaudeEvent`) → Frontend WebSocket
- Frontend WebSocket answer → Backend → Claude CLI stdin (NEU - erfordert stdin nicht zu schließen)

---

### Technical Details

**WAS:**
- Claude CLI Stream-JSON Events parsen um AskUserQuestion zu erkennen
- WebSocket-Handler für `workflow.answer` implementieren
- Stdin-Schreiben an laufenden Claude CLI Prozess
- Timeout-Handling für ausstehende Antworten

**WIE (Architektur-Guidance ONLY):**
- Claude CLI AskUserQuestion kommt als tool_use Block mit name "AskUserQuestion" in `handleClaudeEvent`
- **WICHTIG:** `claudeProcess.stdin?.end()` muss entfernt werden - stdin muss offen bleiben
- Input enthält: questions array mit question, header, options, multiSelect
- Antwort via `execution.claudeProcess?.stdin?.write()` an Claude CLI
- Format der Antwort: JSON-String der gewählten Optionen
- Timeout: 5 Minuten Inaktivität → workflow.timeout Event

**API Contract:**

```typescript
// Frontend → Backend
interface WorkflowAnswer {
  type: 'workflow.answer';
  executionId: string;
  questionId: string;
  answers: string[] | string;  // Array für multiSelect, string für single
}

// Backend → Frontend
interface WorkflowQuestion {
  type: 'workflow.question';
  executionId: string;
  questionId: string;
  questions: Array<{
    question: string;
    header: string;
    options: Array<{ label: string; description?: string }>;
    multiSelect: boolean;
  }>;
}
```

**WO:**
- `agent-os-ui/src/server/workflow-executor.ts`
- `agent-os-ui/src/server/websocket.ts`

**WER:** dev-team__backend-developer

**Abhängigkeiten:** None (kann parallel zu WKFL-001 entwickelt werden)

**Geschätzte Komplexität:** M

**Relevante Skills:**

| Skill | Pfad | Grund |
|-------|------|-------|
| backend-express | agent-os/team/skills/backend-express.md | Express.js + WebSocket Backend Entwicklung |

---

### Completion Check

```bash
# Auto-Verify Commands
grep -q "workflow.question" agent-os-ui/src/server/workflow-executor.ts
grep -q "workflow.answer" agent-os-ui/src/server/websocket.ts
grep -q "AskUserQuestion" agent-os-ui/src/server/workflow-executor.ts
npm run lint
npm run test -- --grep "workflow"
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen
