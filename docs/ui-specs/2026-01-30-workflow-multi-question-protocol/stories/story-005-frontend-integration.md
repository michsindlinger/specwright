# Story MQP-005: Frontend Integration

> **ID:** MQP-005
> **Type:** Frontend
> **Complexity:** S
> **Status:** Done

## User Story

```gherkin
Feature: Frontend Integration
  Als Workflow-Chat Komponente
  möchte ich questionBatch Events vom Backend empfangen und verarbeiten,
  damit die Multi-Tab UI korrekt angezeigt wird.
```

## Akzeptanzkriterien (Gherkin)

```gherkin
Scenario: questionBatch Event wird empfangen
  Given workflow-chat.ts ist aktiv und verbunden
  When das Backend ein "workflow.interactive.questionBatch" Event sendet
  Then wird das Event korrekt verarbeitet
  And die workflow-question-batch Komponente wird gerendert

Scenario: Einzelne Frage Fallback
  Given das Backend sendet eine einzelne Frage (altes Format)
  When workflow-chat.ts das Event empfängt
  Then wird die bestehende workflow-question Komponente verwendet
  And Backward-Compatibility ist gewährleistet

Scenario: answerBatch wird gesendet
  Given der User hat alle Fragen in der Multi-Tab UI beantwortet
  When der User auf "Submit" klickt
  Then wird ein answerBatch Event über WebSocket gesendet
  And das Event enthält executionId, batchId und alle answers

Scenario: UI wird nach Submit entfernt
  Given die workflow-question-batch Komponente ist sichtbar
  When der User submitted und das Backend bestätigt
  Then wird die Multi-Tab UI entfernt
  And der Workflow läuft weiter
```

## Business Value

Die Integration verbindet Backend und Frontend und ermöglicht den vollständigen Flow. Ohne korrekte Integration funktioniert das Multi-Question Protocol nicht end-to-end.

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

- **Integration Type:** Frontend-only

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | workflow-chat.ts | Event-Handler für questionBatch, Integration mit workflow-question-batch |

### Technische Details

**WAS:**
- Event-Handler für "workflow.interactive.questionBatch" in workflow-chat.ts
- Import und Rendering von workflow-question-batch Komponente
- answerBatch Event Sending via WebSocket
- Backward-Compatibility Check für einzelne Fragen

**WIE (Architecture Guidance):**
- Nutze bestehendes Message-Handling Pattern in workflow-chat.ts
- Prüfe Event-Type und route zu korrekter Komponente
- Nutze bestehende WebSocket-Infrastruktur für answerBatch
- Behalte workflow-question.ts für Single-Question Fallback

**WO:**
- `agent-os-ui/ui/src/components/workflow-chat.ts`

**WER:** dev-team__frontend-developer

**Abhängigkeiten:** MQP-004

**Geschätzte Komplexität:** S

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

- FILE_EXISTS: agent-os-ui/ui/src/components/workflow-chat.ts
- CONTAINS: "workflow.interactive.questionBatch" in workflow-chat.ts
- CONTAINS: "workflow-question-batch" in workflow-chat.ts
- CONTAINS: "answerBatch" in workflow-chat.ts
- LINT_PASS: cd agent-os-ui/ui && npm run lint

### Story ist DONE wenn:

1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen

---

*Created with Agent OS /create-spec v2.7*
