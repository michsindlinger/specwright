# Specification: Chat Model Selection

> **Spec ID:** chat-model-selection
> **Created:** 2026-02-02
> **Last Updated:** 2026-02-02
> **Status:** Ready for Technical Refinement

---

## Overview

Ermöglicht Benutzern die Auswahl des LLM-Modells direkt im Chat-Interface. Unterstützt werden Anthropic-Modelle (Opus 4.5, Sonnet 4.5, Haiku 4.5) sowie alternative Provider wie GLM 4.7 über konfigurierbare CLI-Befehle.

---

## User Stories

| ID | Story | Type | Priority | Dependencies |
|----|-------|------|----------|--------------|
| MODSEL-001 | Model Selector UI Component | Frontend | High | None |
| MODSEL-002 | Provider Configuration | Backend | High | None |
| MODSEL-003 | Backend Model Routing | Backend | Critical | MODSEL-002 |
| MODSEL-004 | Session State Integration | Full-stack | High | MODSEL-001, MODSEL-003 |
| MODSEL-999 | Integration & Validation | Test | High | All |

---

## Spec Scope

### Included

- Model-Selector UI-Komponente im Chat-Header
- Provider-Konfiguration mit CLI-Templates (Anthropic, GLM)
- Backend-Routing zu verschiedenen CLI-Befehlen
- Session-basierte Model-Persistenz
- Fehlerbehandlung bei Provider-Problemen

### Out of Scope

- Model-Auswahl für Workflows (bleibt bei Opus)
- Automatischer Fallback auf anderen Provider
- Model-Preisvergleich/Kostentracking
- Custom Model-Endpoints (nur vordefinierte Provider)
- Chat-History Model-Tagging

---

## Expected Deliverables

### Components

1. `aos-model-selector` - Neue Lit Web Component für Model-Auswahl
2. `model-config.ts` - Backend Service für Provider-Konfiguration
3. `model-config.json` - Konfigurationsdatei mit Provider-Definitionen

### Modifications

1. `app.ts` - Model-Selector in Header integriert
2. `chat-view.ts` - Model bei Nachricht-Senden übergeben
3. `claude-handler.ts` - Session um selectedModel erweitert, CLI-Routing
4. `websocket.ts` - Neue Message-Handler für chat.settings
5. `gateway.ts` - Settings-Event Handler
6. `theme.css` - Styling für Model-Selector

### Testable Outcomes

- [ ] Model-Selector ist sichtbar im Chat-Header
- [ ] Dropdown zeigt alle konfigurierten Models gruppiert nach Provider
- [ ] Model-Auswahl ändert das aktive Model für die Session
- [ ] Anthropic nutzt `claude-anthropic-simple --model <model>`
- [ ] GLM nutzt `claude --model <model>`
- [ ] Fehler bei nicht-erreichbarem Provider werden angezeigt

---

## Integration Requirements

### Integration Type

**Full-stack** - Frontend UI + Backend CLI-Routing + WebSocket Communication

### Integration Test Commands

```bash
# Build & Lint Check
cd agent-os-ui && npm run lint && npm run build

# Component Existence
test -f agent-os-ui/ui/src/components/model-selector.ts

# Integration Points
grep -q "<aos-model-selector>" agent-os-ui/ui/src/app.ts
grep -q "chat.settings" agent-os-ui/src/server/websocket.ts
grep -q "getProviderCommand" agent-os-ui/src/server/claude-handler.ts
```

### End-to-End Scenarios

1. **Anthropic Model Selection:**
   - User wählt Opus 4.5 → sendet Nachricht → erhält Antwort

2. **GLM Model Selection:**
   - User wählt GLM 4.7 → sendet Nachricht → erhält Antwort

3. **Model Switch:**
   - User wechselt von Opus zu Haiku mitten im Chat → neue Nachricht nutzt Haiku

---

## Technical Notes

- Nutzt bestehendes Project-Selector Pattern (Light DOM, Gateway Events)
- CLI-Befehle sind pro Provider konfigurierbar
- Kein neues npm Package erforderlich
- Workflows bleiben unverändert (nutzen weiterhin Opus)
