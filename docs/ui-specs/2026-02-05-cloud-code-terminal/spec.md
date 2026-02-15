# Specification: Cloud Code Terminal

**Created:** 2026-02-05
**Status:** Ready for Execution
**Prefix:** CCT

---

## Overview

Ein integriertes Cloud Code Terminal als Sliding Sidebar im Agent OS Web UI. Entwickler können mehrere Claude Code CLI-Sessions direkt aus der Web UI starten, mit Modell-Auswahl aus allen konfigurierten Providern. Das Terminal ist als ein-/ausfahrbare Sidebar implementiert, die Sessions werden über Projektwechsel und Page-Reloads hinweg erhalten.

---

## Goal

Entwicklern ermöglichen, schnell Claude Code Befehle im Projekt auszuführen, ohne das Terminal zu verlassen - für schnelle Code-Generierung, Refactoring oder Analyse direkt aus der Web UI.

---

## User Stories

| ID | Title | Type | Priority | Dependencies |
|----|-------|------|----------|--------------|
| CCT-001 | Backend Cloud Terminal Infrastructure | Backend | Critical | None |
| CCT-002 | Frontend Sidebar Container | Frontend | Critical | CCT-001 |
| CCT-003 | Terminal Session Component | Frontend | High | CCT-002 |
| CCT-004 | Session Persistence | Frontend | High | CCT-003 |
| CCT-005 | Model Selection Integration | Frontend | Medium | CCT-002 |
| CCT-006 | Polish & Edge Cases | Frontend/Backend | Medium | CCT-004, CCT-005 |
| CCT-997 | Code Review | System/Review | Critical | CCT-006 |
| CCT-998 | Integration Validation | System/Integration | Critical | CCT-997 |
| CCT-999 | Finalize PR | System/Finalization | Critical | CCT-998 |

---

## Spec Scope

### IN SCOPE:
- Terminal-Start-Button im Header neben Projekt-Selektor
- Modell-Auswahl aus allen konfigurierten Providern
- Sliding Sidebar von rechts mit Multi-Tab Support
- Vollständige Claude Code CLI Integration mit Streaming
- Session-Persistenz über Page-Reloads (IndexedDB)
- Session-Verwaltung über Projektwechsel (pausieren/fortsetzen)
- Session explizit beenden
- Maximale Sessions Limit (5)
- Session Timeout nach Inaktivität (30min)

### OUT OF SCOPE:
- Keyboard Shortcuts (Ctrl+T) - Optional für später
- Resizable Sidebar - Optional für später
- Session History Export - Optional für später
- Session-Sharing zwischen Benutzern
- Terminal-Themes/Customization
- Mobile-Ansicht des Terminals

---

## Expected Deliverable

Ein funktionierendes Cloud Code Terminal als Sliding Sidebar, das:
1. Über den Header-Button geöffnet wird
2. Mehrere Claude Code CLI-Sessions als Tabs unterstützt
3. Modell-Auswahl aus allen konfigurierten Providern bietet
4. Sessions über Page-Reloads und Projektwechsel hinweg erhält
5. Mit Limits und Fehlerbehandlung robust ist

---

## Integration Requirements

**Integration Type:** Full-stack

### Integration Test Commands

```bash
# Test 1: Backend Health
curl http://localhost:3000/api/health

# Test 2: WebSocket Connection
# (Requires Playwright for browser testing)

# Test 3: Session Creation
curl -X POST http://localhost:3000/api/cloud-terminal/create \
  -H "Content-Type: application/json" \
  -d '{"projectPath":"/test","model":"claude-sonnet"}'

# Test 4: Build
cd agent-os-ui && npm run build
```

### End-to-End Scenarios

1. **Terminal Start Flow:**
   - Klicke Terminal-Button → Modell-Auswahl → Session startet → Terminal sichtbar

2. **Multi-Session Flow:**
   - Starte Session 1 → Starte Session 2 → Wechsle zwischen Tabs

3. **Persistenz Flow:**
   - Starte Session → Reload Page → Session wiederhergestellt

4. **Projektwechsel Flow:**
   - Session in Projekt A → Wechsle zu B → Session pausiert → Zurück zu A → Session fortgesetzt

---

## References

- Requirements Clarification: `requirements-clarification.md`
- Implementation Plan: `implementation-plan.md`
- Story Index: `story-index.md`
- Kanban: `kanban.json`
