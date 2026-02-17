# TODO-003: Shift+Enter im Cloud Terminal aktivieren

**Type:** Todo
**Priority:** medium
**Estimated Effort:** 1
**Created:** 2026-02-17T08:05:25.069Z
**Source:** /add-todo command
**Related Spec:** N/A

## Description

Shift+Enter funktioniert nicht im Cloud Terminal. Es soll als Zeilenumbruch funktionieren, damit der Nutzer mehrzeilige Eingaben bequem machen kann. Technisch: attachCustomKeyEventHandler in xterm.js verwenden, Shift+Enter abfangen und als Newline an PTY senden. Nur 1 Datei betroffen: aos-terminal.ts




## Acceptance Criteria

- [ ] Task completed
- [ ] Verified working

## Notes

[Additional notes]
