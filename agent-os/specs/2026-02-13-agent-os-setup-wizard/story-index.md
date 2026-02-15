# Story Index: AgentOS Extended Setup Wizard

> Spec: 2026-02-13-agent-os-setup-wizard
> Prefix: SETUP
> Created: 2026-02-13

## Stories

| ID | Title | Type | Priority | Effort | Status | Dependencies |
|----|-------|------|----------|--------|--------|-------------|
| SETUP-001 | [Backend Setup Service: Status Check](stories/story-001-backend-setup-service-status-check.md) | Backend | Critical | S | Ready | - |
| SETUP-002 | [Backend Setup Service: Shell Execution](stories/story-002-backend-setup-service-shell-execution.md) | Backend | Critical | M | Ready | - |
| SETUP-003 | [Backend WebSocket Handler: Setup Messages](stories/story-003-backend-websocket-handler.md) | Backend | Critical | M | Blocked | SETUP-001, SETUP-002 |
| SETUP-004 | [Frontend Setup Wizard Komponente](stories/story-004-frontend-setup-wizard-component.md) | Frontend | Critical | L | Blocked | SETUP-003 |
| SETUP-005 | [Settings View: Setup Tab Integration](stories/story-005-settings-view-integration.md) | Frontend | High | S | Blocked | SETUP-004 |
| SETUP-997 | [Code Review](stories/story-997-code-review.md) | System | High | S | Blocked | SETUP-005 |
| SETUP-998 | [Integration Validation](stories/story-998-integration-validation.md) | System | High | S | Blocked | SETUP-997 |
| SETUP-999 | [Finalize PR](stories/story-999-finalize-pr.md) | System | High | S | Blocked | SETUP-998 |

## Dependency Graph

```
SETUP-001 (Backend Status-Check) ──┐
                                    ├──> SETUP-003 (WS Handler) ──> SETUP-004 (Frontend Wizard) ──> SETUP-005 (Settings Integration)
SETUP-002 (Backend Shell-Exec) ────┘                                                                        │
                                                                                                             v
                                                                                              SETUP-997 (Code Review)
                                                                                                             │
                                                                                                             v
                                                                                              SETUP-998 (Integration Validation)
                                                                                                             │
                                                                                                             v
                                                                                              SETUP-999 (Finalize PR)
```

## Effort Summary

| Type | Count | Total Effort |
|------|-------|-------------|
| Backend | 3 | S + M + M = ~8 SP |
| Frontend | 2 | L + S = ~6 SP |
| System | 3 | S + S + S = ~3 SP |
| **Total** | **8** | **~17 SP** |
