# BUG-002: Workflow Terminal Tabs: Auto-Mode oeffnet Terminal & Command startet nicht

**Type:** Bug
**Priority:** high
**Estimated Effort:** 2
**Created:** 2026-02-17T06:27:43.155Z
**Source:** /add-bug command
**Related Spec:** 2026-02-16-workflow-terminal-tabs

## Description

Zwei zusammenhaengende Bugs aus der Implementierung der Workflow Terminal Tabs (Spec 2026-02-16):

Bug A: Auto-Mode im Kanban-Board oeffnet ein Cloud Terminal Fenster. Soll im Hintergrund laufen.
Bug B: Workflow-Command im Cloud-Terminal wird eingefuegt aber nicht automatisch ausgefuehrt.

Root Cause A: triggerWorkflowStart() in kanban-board.ts dispatched workflow-terminal-request bedingungslos, ohne Auto-Mode-Check.
Root Cause B: createWorkflowSession() in cloud-terminal-manager.ts nutzt fixen 1500ms Delay statt Shell-Readiness-Detection.

Severity: Medium

## Reproduction Steps

Bug A: 1. Kanban-Board oeffnen 2. Auto-Mode aktivieren 3. Story wird gestartet 4. Cloud Terminal oeffnet sich (sollte nicht)

Bug B: 1. Story ueber Kontextmenue starten 2. Terminal oeffnet sich 3. Command sichtbar aber nicht ausgefuehrt

## Severity

medium


## Acceptance Criteria

- [ ] Task completed
- [ ] Verified working

## Notes

[Additional notes]
