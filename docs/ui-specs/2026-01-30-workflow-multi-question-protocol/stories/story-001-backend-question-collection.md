# Story MQP-001: Backend Question Collection

> **ID:** MQP-001
> **Type:** Backend
> **Complexity:** S
> **Status:** Done

## User Story

```gherkin
Feature: Backend Question Collection
  Als Workflow-System
  möchte ich mehrere AskUserQuestion Tool-Calls in einem Array sammeln,
  damit sie später gebatched an das Frontend gesendet werden können.
```

## Akzeptanzkriterien (Gherkin)

```gherkin
Scenario: Erste Frage wird gesammelt
  Given ein Workflow läuft und Claude sendet Nachrichten
  When Claude einen AskUserQuestion Tool-Call sendet
  Then wird die Frage zu pendingQuestions[] hinzugefügt
  And pendingQuestions.length ist 1

Scenario: Mehrere Fragen werden gesammelt
  Given ein Workflow läuft mit einer Frage in pendingQuestions[]
  When Claude zwei weitere AskUserQuestion Tool-Calls sendet
  Then werden beide Fragen zu pendingQuestions[] hinzugefügt
  And pendingQuestions.length ist 3
  And die Reihenfolge entspricht der Sendereihenfolge

Scenario: Fragen haben korrekte Struktur
  Given ein Workflow sammelt Fragen
  When eine Frage mit Header, Question und Options ankommt
  Then wird die Frage mit allen Feldern gespeichert
  And die Frage hat eine eindeutige ID (Tool-Use-ID)
  And answer ist initial undefined
```

## Business Value

Das Question Collection Feature ist die Grundlage für das Multi-Question Protocol. Ohne korrektes Sammeln können Fragen nicht gebatched werden und werden weiterhin überschrieben.

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
| Backend | workflow-executor.ts | WorkflowExecution Interface erweitern, handleAskUserQuestion modifizieren |

### Technische Details

**WAS:**
- WorkflowExecution Interface um `pendingQuestions: WorkflowQuestion[]` erweitern
- WorkflowQuestion Interface definieren/erweitern
- handleAskUserQuestion Methode modifizieren: Fragen sammeln statt überschreiben

**WIE (Architecture Guidance):**
- Nutze bestehendes WorkflowExecution Interface Pattern
- pendingQuestions als Array initialisieren bei Workflow-Start
- Keine Breaking Changes an bestehender API
- TypeScript strict mode beachten

**WO:**
- `agent-os-ui/src/server/workflow-executor.ts`

**WER:** dev-team__backend-developer

**Abhängigkeiten:** None

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
- CONTAINS: "pendingQuestions: WorkflowQuestion[]" in workflow-executor.ts
- CONTAINS: "execution.pendingQuestions.push" in workflow-executor.ts
- LINT_PASS: npm run lint
- TEST_PASS: npm test

### Story ist DONE wenn:

1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen

---

*Created with Agent OS /create-spec v2.7*
