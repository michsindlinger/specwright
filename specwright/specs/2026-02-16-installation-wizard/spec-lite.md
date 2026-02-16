# Installation Wizard - Lite Summary

> Created: 2026-02-16
> Full Spec: @specwright/specs/2026-02-16-installation-wizard/spec.md

Wenn ein Benutzer in der Specwright Web UI ein neues Projekt ohne `specwright/`-Ordner hinzufuegt, erscheint ein modaler Installations-Wizard mit eingebettetem Claude Code Terminal. Nach Abschluss leitet er auf eine Getting-Started-Seite weiter, die die naechsten Schritte zeigt.

## Key Points

- Erkennung ueber `specwright/`-Ordner-Existenz beim Projekt-Hinzufuegen
- Modal mit vier Setup-Optionen: plan-product, plan-platform, analyze-product, analyze-platform
- Claude Code Terminal direkt im Modal eingebettet
- Nach Abschluss automatische Weiterleitung auf /getting-started
- Getting-Started-Seite zeigt create-spec, add-todo, add-bug

## Quick Reference

- **Status**: Planning
- **Timeline**: 6 Stories + 3 System Stories
- **Dependencies**: Bestehende Cloud Terminal Infrastruktur, Router, Modal-Pattern
- **Team Members**: Main Agent (Lit + Express)

## Context Links

- Full Specification: @specwright/specs/2026-02-16-installation-wizard/spec.md
- Story Index: @specwright/specs/2026-02-16-installation-wizard/story-index.md
- Implementation Plan: @specwright/specs/2026-02-16-installation-wizard/implementation-plan.md
