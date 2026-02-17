# BUG-001: Xterm Terminal rerendert nicht korrekt nach Visibility-Change

**Type:** Bug
**Priority:** high
**Estimated Effort:** 2
**Created:** 2026-02-17T05:48:35.158Z
**Source:** /add-bug command
**Related Spec:** N/A

## Description

Das Xterm Terminal rendert nicht korrekt, wenn die Sidebar geschlossen und wieder geoeffnet wird oder wenn zwischen Projekten gewechselt wird.

Root Cause: Kombination aus (1) refreshTerminal() nutzt nur ein einzelnes requestAnimationFrame - reicht nicht nach display:none -> display:block fuer korrektes Layout-Reflow, und (2) initializeTerminal() prueft nicht ob Container sichtbar ist und oeffnet xterm moeglicherweise in Container mit 0-Dimensionen.

Severity: High
Fix Type: Frontend-only
Complexity: S

## Reproduction Steps

1. Cloud Terminal Sidebar oeffnen und Terminal-Session starten
2. Sidebar schliessen (X-Button oder Toggle)
3. Sidebar wieder oeffnen
4. Terminal zeigt Inhalt nicht korrekt an (falsche Dimensionen, leerer Canvas, verzerrte Darstellung)

## Severity

high


## Acceptance Criteria

- [ ] Task completed
- [ ] Verified working

## Notes

[Additional notes]
