# Quick-To-Do - Lite Summary

> Created: 2026-02-13
> Full Spec: agent-os/specs/2026-02-13-quick-todo/spec.md

Schnelle Ideenerfassung über das Kontextmenü: Titel + optionale Beschreibung + Bilder (Paste/Drag&Drop) → direkt im Backlog gespeichert, ohne Workflow oder Claude-Session. Eigenständiges Modal mit REST-API Backend.

## Key Points

- Neuer Kontextmenü-Eintrag "Quick-To-Do" öffnet schlankes Modal
- Formular: Titel (Pflicht), Beschreibung (Optional), Priorität (Default: medium)
- Bild-Upload via Copy & Paste + Drag & Drop (max 5 Bilder, 5MB)
- Direkte Speicherung: backlog-index.json + Markdown + Bilder als Dateien
- Toast-Notification als Bestätigung

## Quick Reference

- **Status**: Planning
- **Stories**: 4 Feature + 3 System = 7 total
- **Dependencies**: Keine externen Abhängigkeiten
- **Integration Type**: Full-stack (Frontend Modal + Backend REST-API)
