# Story MQP-003: Backend Text Suppression

> **ID:** MQP-003
> **Type:** Backend
> **Complexity:** XS
> **Status:** Done

## User Story

```gherkin
Feature: Backend Text Suppression
  Als Workflow-System
  möchte ich Text-Nachrichten unterdrücken die Fragen duplizieren,
  damit der User keine doppelten Fragen sieht.
```

## Akzeptanzkriterien (Gherkin)

```gherkin
Scenario: Text wird unterdrückt wenn Fragen gesammelt werden
  Given ein Workflow hat Fragen in pendingQuestions[]
  When Claude eine Text-Nachricht sendet die wie eine Frage aussieht
  Then wird die Text-Nachricht nicht an das Frontend gesendet
  And die Nachricht wird nur im Output-Log gespeichert

Scenario: Normaler Text wird nicht unterdrückt
  Given ein Workflow hat keine Fragen in pendingQuestions[]
  When Claude eine normale Text-Nachricht sendet
  Then wird die Text-Nachricht an das Frontend gesendet

Scenario: Fragen-Muster wird erkannt
  Given das System prüft ob Text fragen-ähnlich ist
  When der Text "Ich stelle dir einige Fragen" enthält
  Or der Text mit Aufzählung "1." oder "- " beginnt und "?" enthält
  Then wird der Text als fragen-ähnlich klassifiziert
```

## Business Value

Text Suppression verhindert das doppelte Anzeigen von Fragen (einmal als Text, einmal als UI). Dies verbessert die UX erheblich.

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
| Backend | workflow-executor.ts | looksLikeQuestionText Helper, Text-Suppression Logic |

### Technische Details

**WAS:**
- looksLikeQuestionText() Helper-Funktion implementieren
- Text-Suppression Logic in handleClaudeEvent bei 'assistant' Events

**WIE (Architecture Guidance):**
- Simple Pattern-Matching mit Regex oder String-Includes
- Patterns: "Frage", "?", nummerierte Listen, Aufzählungen
- Wenn pendingQuestions.length > 0 ODER Text fragen-ähnlich: supprimieren
- Log supprimierte Nachrichten für Debugging

**WO:**
- `agent-os-ui/src/server/workflow-executor.ts`

**WER:** dev-team__backend-developer

**Abhängigkeiten:** MQP-001

**Geschätzte Komplexität:** XS

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
- CONTAINS: "looksLikeQuestionText" in workflow-executor.ts
- CONTAINS: "Suppressing" in workflow-executor.ts
- LINT_PASS: npm run lint
- TEST_PASS: npm test

### Story ist DONE wenn:

1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen

---

*Created with Agent OS /create-spec v2.7*
