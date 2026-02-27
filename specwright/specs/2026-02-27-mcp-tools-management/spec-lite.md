# MCP Tools Management - Lite Summary

> Created: 2026-02-27
> Full Spec: specwright/specs/2026-02-27-mcp-tools-management/spec.md

MCP Tools Management erweitert den Team-Bereich der Specwright UI um eine read-only Uebersicht aller MCP-Server aus der Projekt-`.mcp.json` und ermoeglicht die Zuweisung von MCP-Tools zu Skills ueber ein neues Frontmatter-Feld.

## Key Points

- Read-only MCP-Server-Karten in der Team-View (Name, Typ, Command)
- Neues `mcpTools` Frontmatter-Feld in SKILL.md
- Checkbox-basierte Zuweisung im Team-Edit-Modal
- MCP-Badges in Team-Cards und Detail-Modal
- Warnungen bei verwaisten MCP-Tool-Referenzen
- Sicherheit: `env`-Feld wird nie ans Frontend gesendet

## Quick Reference

- **Status**: Planning
- **Stories**: 5 regulaere + 3 System-Stories
- **Dependencies**: Bestehende Team-View, SkillsReaderService
- **Integration Type**: Full-stack (Backend + Frontend)

## Context Links

- Full Specification: specwright/specs/2026-02-27-mcp-tools-management/spec.md
- Stories: specwright/specs/2026-02-27-mcp-tools-management/story-index.md
- Implementation Plan: specwright/specs/2026-02-27-mcp-tools-management/implementation-plan.md
- Requirements: specwright/specs/2026-02-27-mcp-tools-management/requirements-clarification.md
