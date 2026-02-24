# Spec Assignment for External Bot - Lite Summary

> Created: 2026-02-24
> Full Spec: @specwright/specs/2026-02-24-spec-assignment/spec.md

Ermöglicht das Zuweisen fertiger Specs an den externen Bot OpenClaw via `assignedToBot`-Flag in kanban.json. Das Feature umfasst Backend-Service mit WebSocket-API, Frontend-Integration (Spec-Übersicht + Kanban-View) und einen CLI Slash-Command. Nur "ready" Specs können assigned werden.

## Key Points

- `assignedToBot`-Feld in kanban.json auf Root-Ebene
- WebSocket-basierte API (kein REST) - folgt bestehendem Pattern
- Assignment-Badge + Toggle in Spec-Übersicht und Kanban-View
- Server-seitige Ready-Validierung
- CLI Slash-Command `/assign-spec`

## Quick Reference

- **Status**: Planning
- **Stories**: 5 reguläre + 3 System-Stories
- **Dependencies**: Keine externen
- **Estimated LOC**: ~150-250

## Context Links

- Full Specification: @specwright/specs/2026-02-24-spec-assignment/spec.md
- Implementation Plan: @specwright/specs/2026-02-24-spec-assignment/implementation-plan.md
- Stories: @specwright/specs/2026-02-24-spec-assignment/stories/
