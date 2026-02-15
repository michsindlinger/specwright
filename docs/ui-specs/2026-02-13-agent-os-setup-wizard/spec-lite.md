# AgentOS Extended Setup Wizard (Lite)

> Spec ID: 2026-02-13-agent-os-setup-wizard
> Created: 2026-02-13
> Status: Ready

## Summary

Step-by-Step Setup Wizard im Settings-Bereich der Agent OS Web UI. Ermoeglicht die komplette Installation von AgentOS Extended (3 Curl-Commands) und das Erstellen eines Entwicklungsteams (Cloud Terminal) direkt aus der UI. Automatische Status-Erkennung pro Schritt, Live-Output Streaming und Fehlerbehandlung mit Retry.

## Stories (8)

| ID | Title | Type | Priority | Effort | Status |
|----|-------|------|----------|--------|--------|
| SETUP-001 | Backend Setup Service: Status Check | Backend | Critical | S | Ready |
| SETUP-002 | Backend Setup Service: Shell Execution | Backend | Critical | M | Ready |
| SETUP-003 | Backend WebSocket Handler: Setup Messages | Backend | Critical | M | Blocked |
| SETUP-004 | Frontend Setup Wizard Komponente | Frontend | Critical | L | Blocked |
| SETUP-005 | Settings View: Setup Tab Integration | Frontend | High | S | Blocked |
| SETUP-997 | Code Review | System | High | S | Blocked |
| SETUP-998 | Integration Validation | System | High | S | Blocked |
| SETUP-999 | Finalize PR | System | High | S | Blocked |

## Key Decisions

- Eigene Komponente `aos-setup-wizard` (Settings-View bleibt schlank)
- Shell Execution via `child_process.spawn()` (Streaming Output)
- Hardcoded Curl-URLs im Backend (Sicherheit)
- Cloud Terminal fuer DevTeam-Setup (bestehendes Feature)
- WebSocket Messages: `setup:*` (Doppelpunkt-Syntax)
