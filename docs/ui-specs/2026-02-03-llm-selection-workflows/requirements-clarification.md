# Requirements Clarification - LLM-Selection for Workflows

**Created:** 2026-02-03
**Status:** Pending User Approval

## Feature Overview

Ermöglicht die Auswahl des LLM-Modells beim Starten von Workflows über verschiedene Trigger-Points (Workflows Dashboard, Kontextmenü, Specs Dashboard). Aktuell ist Opus hardcodet.

## Target Users

- Entwickler die Workflows mit unterschiedlichen LLMs ausführen wollen
- User die Kosten sparen wollen (billigere Modelle für einfache Tasks)
- User die Geschwindigkeit bevorzugen (schnellere Modelle für bestimmte Workflows)

## Business Value

- **Kosteneffizienz:** Verwendung kostengünstigerer Modelle (Haiku, Sonnet) für weniger komplexe Workflows
- **Flexibilität:** Wahl des passenden Modells je nach Anforderung
- **Konsistenz:** Gleiche UX wie bei Story-Ausführung und Chat

## Functional Requirements

### 1. Model-Selection bei Workflows Dashboard
- Jede Workflow-Card zeigt ein Model-Dropdown
- Dropdown ist disabled während Workflow-Ausführung
- Standard-Auswahl: Opus (wie bisher)

### 2. Model-Selection bei Kontextmenü-Actions
- Alle Actions ("Neue Spec erstellen", "Bug erstellen", "TODO erstellen", "Story zu Spec hinzufügen") haben Model-Selection
- Model-Selection erscheint im Modal nach Action-Auswahl

### 3. Model-Selection bei Specs Dashboard
- "+ Neues Spec" Button öffnet Modal mit Model-Selection
- Model-Dropdown ist Teil des `aos-create-spec-modal`

### 4. Model-Liste
- Modelle werden vom Backend geladen (gleicher Endpoint wie Chat/Storys)
- Provider-Gruppierung (Anthropic: Opus, Sonnet, Haiku; GLM: 4.7, 4.5 Air)
- Fallback auf Default-Modelle wenn Backend nicht erreichbar

### 5. Backend-Integration
- `workflow.interactive.start` Message erhält `model` Parameter
- `workflow-executor.ts` verwendet Model-Parameter statt hardcodetem Opus
- Model-Format: `opus`, `sonnet`, `haiku`, `glm-5`, etc. (gleiches Format wie Stories)

## Affected Areas & Dependencies

### Frontend Components
| Component | Änderung |
|-----------|----------|
| `aos-workflow-card.ts` | Model-Dropdown hinzufügen (ähnlich `aos-story-card.ts`) |
| `aos-create-spec-modal.ts` | Model-Selector in Modal integrieren |
| `aos-context-menu.ts` | Actions feuern Events mit Model-Parameter |
| `aos-model-selector.ts` | Wiederverwenden (existiert bereits) |

### Backend Components
| Component | Änderung |
|-----------|----------|
| `workflow-executor.ts` | Model-Parameter auslesen und an CLI durchreichen |
| `runExecution()` | Hardcodetes `--model opus` durch dynamischen Parameter ersetzen (Zeile 492) |

### Dependencies
- `gateway.send()` mit `model` Parameter
- `WebSocketMessage` Typ um `model?: string` erweitern

## Edge Cases & Error Scenarios

| Szenario | Verhalten |
|----------|-----------|
| Backend nicht erreichbar | Fallback auf Default-Modelle (in Frontend) |
| Kein Model gewählt | Default: Opus (Fallback) |
| Model während Ausführung | Dropdown disabled (keine Änderung möglich) |

## Security & Permissions

- Keine besonderen Sicherheitsanforderungen
- Model-Selection ist rein UI-Funktionalität
- Backend validiert Model-Parameter

## Performance Considerations

- Model-Liste wird beim Komponenten-Load geladen (cached)
- Keine Performance-Auswirkungen erwartet

## Scope Boundaries

**IN SCOPE:**
- Model-Selection bei Workflows Dashboard (Workflow-Card)
- Model-Selection bei Kontextmenü-Actions (alle 4 Actions)
- Model-Selection bei Specs Dashboard ("+ Neues Spec" Button)
- Backend-Integration für Model-Parameter
- Wiederverwendung von `aos-model-selector` Komponente

**OUT OF SCOPE:**
- Chat Interface (hat bereits Model-Selection)
- Story-Ausführung (hat bereits Model-Selection in `aos-story-card.ts`)
- Persistenz der Model-Auswahl (optional für zukünftiges Feature)
- Model-Selection in Terminal/Execution-Tabs

## Open Questions

- **Frage 1:** Soll das gewählte Model pro Workflow persistiert werden? (erstes Mal: Opus, danach: zuletzt gewähltes)
- **Frage 2:** Soll es eine globale Model-Preference geben die für alle Workflows gilt?

## Proposed User Stories (High Level)

1. **Workflow-Card Model Selection** - Model-Dropdown auf jeder Workflow-Card im Workflows Dashboard
2. **Create Spec Modal Model Selection** - Model-Selector im `aos-create-spec-modal` integrieren
3. **Context Menu Model Selection** - Model-Selection für alle Kontextmenü-Actions
4. **Backend Integration** - Model-Parameter durchreichen an CLI

---

*Review this document carefully. Once approved, detailed user stories will be generated.*
