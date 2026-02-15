# Cloud Terminal Erweiterung - Lite Summary

> Created: 2026-02-11
> Full Spec: agent-os/specs/2026-02-11-cloud-terminal-erweiterung/spec.md

Die Cloud Terminal Sidebar wird um reguläre Shell-Terminals erweitert. User können neben Claude Code Sessions auch normale Terminals im Projektpfad öffnen - ohne Provider/LLM-Auswahl. Ein `terminalType`-Discriminator (`'shell' | 'claude-code'`) durchzieht das gesamte System von Shared Types über Backend bis Frontend.

## Key Points

- "Terminal" als erste Option im Session-Dropdown (eigene Gruppe mit Separator)
- Plain-Shell PTY ohne Claude Code im Backend
- Gemischte Tabs (Shell + Claude Code) in derselben Sidebar
- Bestehende Funktionalität bleibt vollständig erhalten
- Keine neuen externen Abhängigkeiten

## Quick Reference

- **Status**: Planning
- **Stories**: 4 + 3 System Stories
- **Dependencies**: Bestehende Cloud Terminal Komponenten
- **Prefix**: CTE
