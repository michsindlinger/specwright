# Git Integration UI - Lite Summary

> Created: 2026-02-11
> Full Spec: agent-os/specs/2026-02-11-git-integration-ui/spec.md

Git-Informationsleiste unterhalb der Projekt-Tabs mit Branch-Anzeige, Ahead/Behind-Status und geaenderten Dateien. Ermoeglicht Branch-Wechsel, Commits mit Dateiauswahl, Pull (normal + rebase) und Push direkt aus der Web UI.

## Key Points

- Git-Status-Leiste mit Branch, Ahead/Behind, Changed Files und Action Buttons
- Branch-Wechsel per Dropdown (lokale Branches, Schutz bei uncommitted Changes)
- Commit-Dialog (Modal) mit Checkboxen fuer Einzeldatei-Auswahl
- Pull (normal + rebase) und Push (kein Force)
- WebSocket-basierte API (konsistent mit bestehendem Architektur-Pattern)

## Quick Reference

- **Status**: Planning
- **Stories**: 5 regulaer + 3 System
- **Dependencies**: Keine externen (nutzt bestehende Infrastruktur)
- **Pattern**: Cloud Terminal Pattern (Protocol -> Service -> Handler -> Gateway -> Components)

## Context Links

- Full Specification: agent-os/specs/2026-02-11-git-integration-ui/spec.md
- Stories: agent-os/specs/2026-02-11-git-integration-ui/stories/
- Implementation Plan: agent-os/specs/2026-02-11-git-integration-ui/implementation-plan.md
