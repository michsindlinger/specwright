# Specification: Workflow Multi-Question Protocol

> **Spec ID:** MQP
> **Created:** 2026-01-30
> **Status:** Ready for Execution
> **Priority:** High

## Overview

Implementierung eines Multi-Question-Protokolls für Workflows, das mehrere `AskUserQuestion` Tool-Calls sammelt und in einer Tab-basierten UI präsentiert, anstatt sie zu überschreiben.

## User Stories

| ID | Title | Type | Complexity | Status |
|----|-------|------|------------|--------|
| MQP-001 | Backend Question Collection | Backend | S | Ready |
| MQP-002 | Backend Batch Detection & Sending | Backend | S | Ready |
| MQP-003 | Backend Text Suppression | Backend | XS | Ready |
| MQP-004 | Frontend Multi-Tab Question Component | Frontend | M | Ready |
| MQP-005 | Frontend Integration | Frontend | S | Ready |
| MQP-999 | Integration & End-to-End Validation | Test | S | Ready |

## Spec Scope

### Included
- Backend-seitige Question Collection in `pendingQuestions[]` Array
- Batch-Detection basierend auf Process-Close und Result-Events
- Text-Suppression für duplizierende Fragen-Nachrichten
- Multi-Tab UI Komponente mit Navigation und Submit
- Integration in bestehende workflow-chat.ts
- Backward-Compatibility für einzelne Fragen

### Out of Scope
- Persistierung von Fragen/Antworten
- Änderungen am Claude Tool-Call Format
- Offline-Unterstützung
- Mobile-optimierte UI

## Expected Deliverables

1. **Modifizierte Datei:** `agent-os-ui/src/server/workflow-executor.ts`
   - WorkflowExecution mit `pendingQuestions[]`
   - Question Collection Logic
   - Batch Detection und Sending
   - Text Suppression

2. **Neue Datei:** `agent-os-ui/ui/src/components/workflow-question-batch.ts`
   - Tab-basierte Multi-Question UI
   - Navigation (Zurück/Weiter)
   - Batch Submit

3. **Modifizierte Datei:** `agent-os-ui/ui/src/components/workflow-chat.ts`
   - Handler für `questionBatch` Events

## Integration Requirements

**Integration Type:** Full-stack

### Integration Test Commands

```bash
# Backend Build
cd agent-os-ui && npm run build

# Backend Tests
cd agent-os-ui && npm test

# Frontend Build
cd agent-os-ui/ui && npm run build

# Frontend Lint
cd agent-os-ui/ui && npm run lint
```

### End-to-End Scenarios

1. **Multi-Question Flow:** Workflow mit mehreren Fragen ausführen, alle beantworten, Submit
2. **Single-Question Fallback:** Workflow mit einer Frage ausführen, Backward-Compatibility prüfen
3. **Cancel Flow:** Workflow starten, bei Fragen abbrechen

### MCP Tool Requirements

| Test | Requires MCP |
|------|--------------|
| Build Tests | No |
| E2E Multi-Question | Yes (Playwright) - Optional |

---

*Created with Agent OS /create-spec v2.7*
