# Story MQP-002: Backend Batch Detection & Sending

> **ID:** MQP-002
> **Type:** Backend
> **Complexity:** S
> **Status:** Done

## User Story

```gherkin
Feature: Backend Batch Detection & Sending
  Als Workflow-System
  möchte ich erkennen wann Claude pausiert und alle Fragen gesammelt sind,
  damit ich sie als Batch an das Frontend senden kann.
```

## Akzeptanzkriterien (Gherkin)

```gherkin
Scenario: Batch wird bei Process-Close gesendet
  Given ein Workflow hat 3 Fragen in pendingQuestions[]
  When der Claude-Prozess mit Code 0 endet (wartet auf Antwort)
  Then wird ein questionBatch Event an das Frontend gesendet
  And das Event enthält alle 3 Fragen
  And execution.status wird auf "waiting_for_answer" gesetzt

Scenario: Batch enthält korrekte Struktur
  Given Fragen wurden gesammelt und Batch wird gesendet
  When das Frontend das Event empfängt
  Then hat das Event type "workflow.interactive.questionBatch"
  And hat eine eindeutige batchId
  And enthält das questions Array mit allen Fragen
  And enthält einen timestamp

Scenario: Leerer Batch wird nicht gesendet
  Given ein Workflow hat 0 Fragen in pendingQuestions[]
  When der Claude-Prozess endet
  Then wird kein questionBatch Event gesendet

Scenario: Antwort-Batch wird korrekt verarbeitet
  Given das Frontend sendet ein answerBatch Event
  When das Backend die Antworten empfängt
  Then werden alle Antworten den Fragen zugeordnet
  And der Claude-Prozess wird mit --resume fortgesetzt
  And pendingQuestions[] wird geleert
```

## Business Value

Die Batch-Detection ermöglicht das Senden aller Fragen zusammen zum richtigen Zeitpunkt. Ohne korrekte Detection würden Fragen zu früh oder gar nicht gesendet.

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

### Betroffene Layer & Komponenten

- **Integration Type:** Backend-only

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Backend | workflow-executor.ts | sendQuestionBatch Methode, Batch-Detection Logic, Answer-Handling |

### Technische Details

**WAS:**
- sendQuestionBatch() Methode implementieren
- Batch-Detection bei Process-Close (code 0) mit pending questions
- questionBatchId und questionBatchComplete Felder zu WorkflowExecution
- submitAnswerBatch() Methode für eingehende Antworten

**WIE (Architecture Guidance):**
- Nutze bestehendes sendToClient Pattern für Events
- Event-Type: "workflow.interactive.questionBatch"
- Batch-Detection im handleClaudeEvent bei 'result' oder 'close'
- Resume mit existierendem --resume Mechanismus

**WO:**
- `agent-os-ui/src/server/workflow-executor.ts`

**WER:** dev-team__backend-developer

**Abhängigkeiten:** MQP-001

**Geschätzte Komplexität:** S

### Relevante Skills

| Skill | Pfad | Grund |
|-------|------|-------|
| backend-express | .claude/skills/backend-express.md | Express/TypeScript Backend Pattern |

### Completion Check

```bash
# TypeScript Compilation Check
cd agent-os-ui && npx tsc --noEmit

# Lint Check
cd agent-os-ui && npm run lint

# Test Check
cd agent-os-ui && npm test
```

### Technische Verifikation

- FILE_EXISTS: agent-os-ui/src/server/workflow-executor.ts
- CONTAINS: "sendQuestionBatch" in workflow-executor.ts
- CONTAINS: "workflow.interactive.questionBatch" in workflow-executor.ts
- CONTAINS: "questionBatchId" in workflow-executor.ts
- LINT_PASS: npm run lint
- TEST_PASS: npm test

### Story ist DONE wenn:

1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen

---

*Created with Agent OS /create-spec v2.7*
