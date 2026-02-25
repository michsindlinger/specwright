# Dev-Team Visualization - Lite Summary

> Created: 2026-02-25
> Full Spec: specwright/specs/2026-02-25-dev-team-visualization/spec.md

Neue "/team" Seite in der Specwright Web UI, die alle Skills eines Projekts als Karten-Grid visualisiert. Zeigt Skill-Name, Rolle, Beschreibung und Lernfortschritt. Detail-Modal mit vollständigem SKILL.md-Inhalt und Dos-and-Donts-Liste.

## Key Points

- REST-API liest Skills aus `.claude/skills/[name]/` Dateisystem
- Karten-Grid mit responsivem Layout (Light DOM Lit Components)
- Detail-Modal mit SKILL.md-Inhalt und Learnings
- Empty State bei fehlendem Skills-Verzeichnis
- Keine neuen Dependencies, nutzt bestehende Patterns

## Quick Reference

- **Status**: Planning
- **Stories**: 5 reguläre + 3 System Stories
- **Dependencies**: Keine externen
- **Integration Type**: Full-stack (Backend + Frontend)

## Context Links

- Full Specification: specwright/specs/2026-02-25-dev-team-visualization/spec.md
- Implementation Plan: specwright/specs/2026-02-25-dev-team-visualization/implementation-plan.md
- Stories: specwright/specs/2026-02-25-dev-team-visualization/stories/
