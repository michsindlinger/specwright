# Spec-Lite: Spec-Auto-Mode Mid-Run Cancel Fix

Frontend-Toggle auf Spec-Kanban schickt im Disable-Branch (`dashboard-view.ts:1591-1601`) keine `workflow.auto-mode.cancel`-Message — Backend-Orchestrator läuft trotz Toggle-aus weiter. Single-Line-Fix: `gateway.send({ type: 'workflow.auto-mode.cancel', specId })` im `handleAutoModeToggle` else-Branch ergänzen, parität zum bereits funktionierenden Backlog-Cancel (`handleBacklogAutoModeToggle:1843`). Backend-Pfad existiert komplett, nur Send fehlt.
