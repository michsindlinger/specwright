# Git Integration Erweitert - Lite Summary

> Created: 2026-02-11
> Full Spec: agent-os/specs/2026-02-11-git-integration-erweitert/spec.md

Erweiterung der bestehenden Git Integration UI um Datei-Revert, Delete Untracked, PR-Badge und einen kombinierten "Commit & Push"-Workflow. Minimalinvasiver Ansatz: nur bestehende Dateien erweitern, keine neuen erstellen.

## Key Points

- Revert einzelner/aller Dateien im Commit-Dialog (modified + staged)
- Loeschen von Untracked Dateien mit Bestaetigungsdialog
- PR-Badge in der Status-Leiste mit Nummer, Status und Link
- "Commit & Push" Button mit Auto-Push nach Commit
- Basiert auf bestehender WebSocket-Architektur (git:<action> Pattern)

## Quick Reference

- **Status**: Planning
- **Dependencies**: Bestehende Git Integration (2026-02-11-git-integration-ui)
- **Stories**: 4 regulaere + 3 System-Stories
