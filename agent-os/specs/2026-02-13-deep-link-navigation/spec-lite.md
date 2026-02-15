# Deep Link Navigation - Lite Summary

> Created: 2026-02-13
> Full Spec: agent-os/specs/2026-02-13-deep-link-navigation/spec.md

Deep Link Navigation erweitert das Hash-basierte Routing um Segment-URLs (`#/dashboard/spec/{id}/{tab}`), damit bei Page Reload der Navigations-Zustand erhalten bleibt und URLs teilbar sind. Ein zentraler Router-Service ersetzt den einfachen Hash-Handler.

## Key Points

- Neuer Router-Service als Singleton (analog projectStateService)
- Hash-Segment-URLs für alle 4 Views (Dashboard, Chat, Workflows, Settings)
- Vollständige Browser-History (Back/Forward) innerhalb und zwischen Views
- Edge-Case-Handling mit Toast-Feedback bei ungültigen Links
- Rein Frontend-seitig, keine Backend-Änderungen

## Quick Reference

- **Status**: Planning
- **Stories**: 6 + 3 System Stories
- **Dependencies**: Keine externen Dependencies
- **Integration Type**: Frontend-only

## Context Links

- Full Specification: agent-os/specs/2026-02-13-deep-link-navigation/spec.md
- Stories: agent-os/specs/2026-02-13-deep-link-navigation/stories/
- Implementation Plan: agent-os/specs/2026-02-13-deep-link-navigation/implementation-plan.md
