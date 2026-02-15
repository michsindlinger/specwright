# Agent OS Web UI - Specification

> Spec ID: AOSUI
> Created: 2026-01-30
> Status: Ready for Execution

## Overview

Lokale Web-UI zur Steuerung von Claude Code mit drei Haupt-Views: Dashboard (Kanban), Chat Interface und Workflow Execution - basierend auf TypeScript Agent SDK und Lit Web Components.

## User Stories

| ID | Title | Type | Priority |
|----|-------|------|----------|
| AOSUI-001 | Backend Setup | Backend | Critical |
| AOSUI-002 | Frontend Scaffold | Frontend | Critical |
| AOSUI-003 | Projekt-Verwaltung | Full-stack | High |
| AOSUI-004 | Chat Interface | Full-stack | High |
| AOSUI-005 | Workflow Execution | Full-stack | High |
| AOSUI-006 | Dashboard View | Full-stack | High |
| AOSUI-007 | Integration & Polish | Full-stack | Medium |

## Spec Scope

**Included:**
- Node.js Backend mit TypeScript Agent SDK
- Lit-basierte Web UI
- WebSocket Streaming für Live-Output
- Projekt-Auswahl aus Config
- Kanban-Board für Stories
- Chat Interface für freie Konversation
- Workflow Execution mit Progress-Anzeige
- Moltbot-ähnliches Dark Theme Design

**Excluded:**
- Multi-User / Authentication
- Cloud Deployment
- Session-Persistenz
- Mobile App
- Plugin-System

## Expected Deliverables

1. **Funktionierendes Repo:** `agent-os-ui/` mit npm start
2. **Backend:** Express + WebSocket + Claude Agent SDK
3. **Frontend:** Lit Components mit 3 Views
4. **Config:** Projekt-Liste in config.json
5. **Design:** Dark Theme basierend auf Moltbot

## Integration Requirements

**Integration Type:** Full-stack

**Integration Test Commands:**
```bash
# Backend starts successfully
cd agent-os-ui && npm run start:backend &
sleep 3 && curl -s http://localhost:3001/health | grep -q "ok"

# Frontend builds without errors
cd agent-os-ui && npm run build

# WebSocket connection works
# (Requires manual verification or playwright)
```

**End-to-End Scenarios:**
1. User selects project → Dashboard shows specs
2. User opens chat → Can send message → Gets streaming response
3. User triggers workflow → Sees progress → Can cancel

**MCP Requirements:**
- Playwright MCP: Optional for E2E browser tests
