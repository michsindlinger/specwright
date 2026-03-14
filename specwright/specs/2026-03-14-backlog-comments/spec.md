# Spec Requirements Document

> Spec: Backlog Item Comments
> Created: 2026-03-14
> Status: Planning

## Overview

Trello-Style Kommentarfunktion für Backlog Items in der Specwright Web UI. Nutzer können Kommentare mit Markdown-Text und Bildern an Backlog Items anheften, bearbeiten und löschen. Die Architektur folgt dem bewährten Attachment-System-Pattern (WebSocket-Protokoll, Handler, Frontend-Komponente) und integriert sich in die bestehende Backlog Detail-Ansicht.

## User Stories

See: stories/ directory (6 Feature Stories + 3 System Stories)

## Spec Scope

- Comment CRUD (Create, Read, Update, Delete) via WebSocket
- Markdown-Text in Kommentaren mit Rendering
- Bild-Upload per Drag & Drop und Upload-Button
- Comment-Count Badge auf Story Card (analog attachmentCount)
- Chronologische Darstellung (neueste unten) mit Datum/Uhrzeit
- Speicherung als `comments.json` im bestehenden Attachment-Ordner
- Bearbeiten und Löschen eigener Kommentare

## Out of Scope

- Bot-Kommentare (Architektur vorbereitet via author-Feld)
- Benachrichtigungen / Unread-Indicator
- @-Mentions
- Kommentar-Reaktionen (Emojis)
- Kommentare auf Spec Stories (nur Backlog Items)
- Threaded/nested Kommentare (flache Liste)

## Expected Deliverable

- Vollständige Comment-Funktionalität für Backlog Items
- Comment Protocol Types (shared)
- Comment WebSocket Handler (server)
- Comment Thread Lit-Komponente (frontend)
- Comment-Count Badge auf Story Cards
- Integration in Backlog Detail-Ansicht
- Unit Tests für Comment Handler
- Build und Lint fehlerfrei

## Integration Requirements

> **IMPORTANT:** These integration tests will be executed automatically after all stories complete.

**Integration Type:** Full-stack

- [ ] **Integration Test 1:** Comment Handler Server Tests
  - Command: `cd ui && npx vitest run tests/unit/comment.handler.test.ts`
  - Validates: CRUD operations, locking, edge cases
  - Requires MCP: no

- [ ] **Integration Test 2:** Backend Build
  - Command: `cd ui && npm run build:backend`
  - Validates: TypeScript compilation, no type errors
  - Requires MCP: no

- [ ] **Integration Test 3:** Frontend Build
  - Command: `cd ui/frontend && npm run build`
  - Validates: Lit components compile, no import errors
  - Requires MCP: no

- [ ] **Integration Test 4:** Lint
  - Command: `cd ui && npm run lint`
  - Validates: Code style compliance
  - Requires MCP: no

**Integration Scenarios:**
- [ ] Scenario 1: Nutzer öffnet Backlog Item Detail, sieht leere Kommentar-Sektion, schreibt Kommentar, sieht ihn in der Liste
- [ ] Scenario 2: Nutzer bearbeitet bestehenden Kommentar, sieht "bearbeitet" Timestamp
- [ ] Scenario 3: Nutzer fügt Bild per Drag & Drop in Kommentar ein, sieht Bild nach Absenden
- [ ] Scenario 4: Story Card zeigt Comment-Count Badge nach erstem Kommentar

## Spec Documentation

- Requirements Clarification: @specwright/specs/2026-03-14-backlog-comments/requirements-clarification.md
- Implementation Plan: @specwright/specs/2026-03-14-backlog-comments/implementation-plan.md

## Origin

> Transferred from Brainstorming Session: 2026-03-14-backlog-comments
> Original Discussion: @specwright/brainstorming/2026-03-14-backlog-comments/session.md
> Transfer Date: 2026-03-14
