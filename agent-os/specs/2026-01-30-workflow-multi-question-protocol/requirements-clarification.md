# Requirements Clarification - Workflow Multi-Question Protocol

**Created:** 2026-01-30
**Status:** Approved

## Feature Overview

Implementierung eines Multi-Question-Protokolls für die Workflow-Kommunikation, das mehrere Fragen von Claude in einer gebatchten Tab-UI darstellt und alle Antworten gesammelt zurücksendet.

## Target Users

- Developer die Agent OS Web UI nutzen
- Power User die Workflows wie `/create-spec` ausführen

## Business Value

- **Verbesserte UX:** Keine doppelten Fragen mehr (Text + Tool-Call)
- **Effizienz:** Alle Fragen auf einen Blick beantworten
- **Konsistenz:** Gleiches Verhalten wie Claude Code Terminal
- **Navigation:** Zwischen Fragen vor- und zurückspringen

## Functional Requirements

1. **Question Collection:** Backend sammelt alle `AskUserQuestion` Tool-Calls in einem Array
2. **Batch Detection:** Erkennung wann Claude pausiert und alle Fragen gesammelt sind
3. **Text Suppression:** Unterdrückung von Text-Nachrichten die Fragen duplizieren
4. **Multi-Tab UI:** Frontend zeigt alle Fragen in einer Tab-Navigation
5. **Batch Submit:** Alle Antworten werden zusammen gesendet
6. **Resume Flow:** Claude erhält alle Antworten und setzt Workflow fort

## Affected Areas & Dependencies

- **Backend (workflow-executor.ts)** - Question Collection, Batch Logic, Answer Handling
- **Frontend (workflow-chat.ts)** - Event-Handling für Question-Batches
- **Frontend (workflow-question-batch.ts)** - NEUE Komponente für Multi-Tab UI
- **Shared Types** - Neue Interfaces für Batch-Events

## Edge Cases & Error Scenarios

- **Einzelne Frage:** Fallback auf existierendes Single-Question-Verhalten
- **Timeout:** Wenn Claude zu lange braucht, Batch trotzdem senden
- **Abbruch:** User kann Workflow abbrechen während Fragen offen sind
- **Leere Antworten:** Validierung dass alle Fragen beantwortet sind

## Security & Permissions

- Keine zusätzlichen Sicherheitsanforderungen
- Nutzt bestehende WebSocket-Infrastruktur

## Performance Considerations

- Batch-Detection sollte schnell sein (<100ms)
- Keine Verzögerung beim Sammeln von Fragen

## Scope Boundaries

**IN SCOPE:**
- Backend Question Collection & Batching
- Frontend Multi-Tab Question UI
- Text Suppression für Fragen-Duplikate
- Batch Submit Flow
- Backward Compatibility für Single Questions

**OUT OF SCOPE:**
- Persistierung von Fragen/Antworten
- Offline-Unterstützung
- Änderung des Claude Tool-Call Formats

## Open Questions

- Keine offenen Fragen

## Proposed User Stories (High Level)

1. **MQP-001: Backend Question Collection** - WorkflowExecution um pendingQuestions Array erweitern
2. **MQP-002: Backend Batch Detection & Sending** - Erkennung wann Batch komplett und Senden an Frontend
3. **MQP-003: Backend Text Suppression** - Unterdrückung von Fragen-Text-Nachrichten
4. **MQP-004: Frontend Multi-Tab Question Component** - Neue Komponente workflow-question-batch.ts
5. **MQP-005: Frontend Integration** - workflow-chat.ts um Batch-Event-Handling erweitern
6. **MQP-999: Integration & Validation** - End-to-End Test des kompletten Flows

---
*Review this document carefully. Once approved, detailed user stories will be generated.*
