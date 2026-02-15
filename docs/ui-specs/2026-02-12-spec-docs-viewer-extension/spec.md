# Spec Requirements Document

> Spec: Spec Docs Viewer Extension
> Created: 2026-02-12
> Status: Planning

## Overview

Erweiterung des bestehenden Spec Document Viewers im Kanban Board, sodass alle `*.md` Dateien im Spec-Ordner (inkl. Unterordner wie `stories/`, `sub-specs/`) angezeigt, bearbeitet und gespeichert werden können - nicht nur `spec.md` und `spec-lite.md`. Zusätzlich werden Markdown-Checkboxen interaktiv klickbar mit sofortiger Persistierung.

Das Feature umfasst ein neues Backend-API zum Auflisten aller Spec-Dateien, eine dynamische Tab-Bar-Komponente mit Ordner-Gruppierung, die Generalisierung der bestehenden Read/Save-Handler und interaktive Checkbox-Funktionalität im Markdown-Renderer.

## User Stories

Siehe: stories/ Verzeichnis für individuelle Story-Dateien.

- SDVE-001: Backend - Spec-Dateien auflisten und generisch lesen/speichern
- SDVE-002: Frontend - Dynamische Tab-Bar Komponente
- SDVE-003: Frontend - Kanban Board Integration
- SDVE-004: Frontend - Interaktive Checkboxen mit Persistierung

## Spec Scope

- Dynamische Erkennung aller `*.md` Dateien im Spec-Ordner (rekursiv)
- Gruppierte Tab-Darstellung nach Ordnerstruktur (Hauptordner, stories/, sub-specs/, etc.)
- Lesen und Bearbeiten aller `*.md` Dateien über den bestehenden `aos-docs-viewer`
- Neuer `specs.files` WebSocket-Handler zum Auflisten der Dateien
- Generalisierung von `specs.read` und `specs.save` für beliebige `*.md` Dateien
- Interaktive Markdown-Checkboxen (`- [ ]` / `- [x]`) mit sofortiger Datei-Persistierung
- Horizontales Tab-Scrolling bei vielen Dateien
- Path-Traversal-Schutz im Backend

## Out of Scope

- Anzeige von JSON-Dateien (kanban.json)
- Erstellen neuer Dateien über das UI
- Löschen von Dateien über das UI
- Drag-Drop zum Umordnen der Tabs
- Suche innerhalb der Spec-Dokumente
- Diff-Ansicht bei Änderungen

## Expected Deliverable

Ein voll funktionaler erweiterter Spec Document Viewer mit:
- Backend-API das alle `*.md` Dateien eines Specs auflistet und generisch liest/speichert
- Dynamische Tab-Bar mit Ordner-Gruppierung und horizontalem Scrolling
- Bearbeitungsfunktion für alle Dateien
- Interaktive Checkboxen in gerenderten Markdown-Dokumenten mit automatischer Persistierung
- Backward-Kompatibilität mit bestehenden `specs.read`/`specs.save` Calls

## Integration Requirements

> **IMPORTANT:** These integration tests will be executed automatically after all stories complete.
> They ensure that the complete system works end-to-end, not just individual stories.

**Integration Type:** Full-stack

- [x] **Integration Test 1:** Spec Viewer zeigt alle Dateien eines Spec-Ordners
   - Command: `cd agent-os-ui/ui && npx tsc --noEmit`
   - Validates: `TypeScript compilation passes with new components and types`
   - Requires MCP: no
   - Result: PASSED

- [x] **Integration Test 2:** Checkbox-Toggle persistiert in Datei
   - Command: `cd agent-os-ui && npx tsc --noEmit`
   - Validates: `Backend TypeScript compilation passes with extended handlers`
   - Requires MCP: no
   - Result: PASSED

**Integration Scenarios:**
- [x] Scenario 1: User öffnet Spec Viewer → sieht gruppierte Tabs aller .md Dateien → klickt auf eine Story-Datei → sieht gerenderten Markdown → wechselt zu user-todos.md → klickt Checkbox → Checkbox wird gespeichert
- [x] Scenario 2: User öffnet Spec Viewer → editiert implementation-plan.md → speichert → wechselt zu spec.md → Inhalt ist korrekt

**Notes:**
- Tests marked with "Requires MCP: yes" are optional (skip if MCP tool not available)
- Integration validation runs in Phase 4.5 of execute-tasks
- If integration tests fail, an integration-fix story will be created automatically

## Spec Documentation

- Story Index: @agent-os/specs/2026-02-12-spec-docs-viewer-extension/story-index.md
- Implementation Plan: @agent-os/specs/2026-02-12-spec-docs-viewer-extension/implementation-plan.md
- Requirements: @agent-os/specs/2026-02-12-spec-docs-viewer-extension/requirements-clarification.md
