# Spec Requirements Document

> Spec: Storycard Attachments
> Created: 2026-02-14
> Status: Planning

## Overview

Bilder und Dateien (PNG, JPG, GIF, WebP, PDF, TXT, JSON, MD) an bestehende Storycards in Spec-Kanban-Boards und im Backlog anhängen. Attachments werden lokal im Dateisystem gespeichert, relativ zum Projekt-Root in der Story-Markdown referenziert und sind vom AI-Agent bei der Story-Ausführung einlesbar.

Das Feature erweitert die bestehende Upload-Funktionalität (aktuell nur bei Quick-ToDo) auf alle Storycards und nutzt die vorhandenen `image-upload.utils` und Upload-Patterns wieder.

## User Stories

- SCA-001: Attachment Protocol & Backend Service
- SCA-002: Frontend Attachment Gateway & Utils
- SCA-003: Attachment Panel Component
- SCA-004: Storycard & Kanban Integration
- SCA-005: Attachment Preview & File Type Support

See: stories/ directory for individual story files.

## Spec Scope

- Attachment-Upload (File Picker, Drag & Drop, Clipboard Paste) an Storycards
- Unterstützte Dateitypen: Bilder (alle Typen), PDF, TXT, JSON, MD
- Maximale Dateigröße: 5 MB pro Datei
- Büroklammer-Icon mit Attachment-Anzahl auf Storycards
- Attachment-Panel als Popover mit Upload-Zone, Dateiliste, Preview und Lösch-Funktion
- Inline-Preview für Bilder, PDFs und Text-Dateien
- Löschen einzelner Attachments mit Bestätigung
- Auto-Umbenennung bei Duplikaten
- Speicherung im Spec-Ordner (Spec-Stories) bzw. Backlog-Item-Ordner (Backlog-Items)
- Pfad-Referenzierung in Story-Markdown für Agent-Zugriff
- Backend Attachment-Service mit WebSocket-API
- Wiederverwendung bestehender `image-upload.utils`

## Out of Scope

- Attachment-Upload beim Erstellen neuer Stories (nur nachträglich)
- Versionierung von Attachments
- Attachment-Suche/Filterung
- Cloud-Speicherung (alles lokal)
- Drag & Drop von Dateien direkt auf Kanban-Karten (nur über geöffneten Panel)
- Thumbnail-Generierung (Browser rendert Bilder nativ)

## Expected Deliverable

- Funktionsfähiges Attachment-System für Storycards in Spec-Kanban und Backlog
- WebSocket-basierte Attachment CRUD-Operationen (Upload, List, Delete)
- Wiederverwendbare `aos-attachment-panel` Komponente
- Büroklammer-Indikator auf Storycards mit Attachment-Anzahl
- Inline-Previews für Bilder, PDFs und Text-Dateien
- Automatische Pfad-Referenzierung in Story-Markdown für Agent-Ausführung
- Keine Linting-Fehler, TypeScript strict mode

## Integration Requirements

> **IMPORTANT:** These integration tests will be executed automatically after all stories complete.

**Integration Type:** Full-stack

- [ ] **Integration Test 1:** TypeScript Frontend kompiliert
   - Command: `cd agent-os-ui/ui && npx tsc --noEmit`
   - Validates: Frontend TypeScript builds without errors
   - Requires MCP: no

- [ ] **Integration Test 2:** TypeScript Backend kompiliert
   - Command: `cd agent-os-ui && npx tsc --noEmit`
   - Validates: Backend TypeScript builds without errors
   - Requires MCP: no

- [ ] **Integration Test 3:** Attachment Protocol Types konsistent
   - Command: `grep -q "attachment:" agent-os-ui/src/shared/types/attachment.protocol.ts && echo "Protocol types exist"`
   - Validates: Shared protocol types are properly defined
   - Requires MCP: no

**Integration Scenarios:**
- [ ] Scenario 1: User öffnet Storycard im Spec-Kanban, klickt Attachment-Button, lädt Bild hoch, sieht Büroklammer-Icon mit Anzahl, öffnet Preview
- [ ] Scenario 2: User öffnet Storycard im Backlog, hängt PDF an, löscht Attachment, Büroklammer-Icon verschwindet
- [ ] Scenario 3: Agent liest Story-Markdown und findet Attachment-Pfade im ## Attachments Abschnitt

**Notes:**
- Tests marked with "Requires MCP: yes" are optional (skip if MCP tool not available)
- Integration validation runs in Phase 4.5 of execute-tasks

## Spec Documentation

- Spec: agent-os/specs/2026-02-14-storycard-attachments/spec.md
- Implementation Plan: agent-os/specs/2026-02-14-storycard-attachments/implementation-plan.md
- Requirements: agent-os/specs/2026-02-14-storycard-attachments/requirements-clarification.md
