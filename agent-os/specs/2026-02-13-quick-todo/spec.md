# Spec Requirements Document

> Spec: Quick-To-Do
> Created: 2026-02-13
> Status: Planning

## Overview

Quick-To-Do ermöglicht das sofortige Erfassen von spontanen Ideen und Aufgaben direkt über das Kontextmenü der Agent OS Web UI. Ein schlankes, eigenständiges Modal mit Titel, optionaler Beschreibung, Prioritätswahl und Bild-Upload (Copy & Paste / Drag & Drop) speichert den Eintrag direkt im Backlog - ohne einen vollständigen Workflow oder Claude Code Session zu starten.

## User Stories

See: stories/ directory
- QTD-001: Kontextmenü-Integration + Modal-Shell
- QTD-002: Bild-Upload im Quick-To-Do Modal
- QTD-003: Backend REST-API + Storage Service
- QTD-004: End-to-End Integration + UX-Polish

## Spec Scope

- Neuer Kontextmenü-Eintrag "Quick-To-Do"
- Eigenständiges Quick-Modal mit Titel, Beschreibung, Priorität, Bilder
- Copy & Paste und Drag & Drop für Bilder (max 5, max 5MB, PNG/JPEG/GIF/WebP)
- Speicherung in backlog-index.json + Markdown-Datei + Bild-Dateien
- Toast-Feedback nach Speichern
- Backend REST-Endpoint für Item-Erstellung mit Bild-Upload

## Out of Scope

- Bearbeiten/Editieren von bestehenden Quick-To-Dos
- Anzeige im Dashboard (nutzt bestehendes Backlog-Board)
- Tagging oder Kategorisierung
- Verknüpfung mit Specs
- Audio- oder Video-Uploads
- Offline-Support / Queuing

## Expected Deliverable

Ein vollständiges Quick-To-Do Feature mit:
- Funktionierender Kontextmenü-Eintrag der das Quick-Modal öffnet
- Modal mit Titel, Beschreibung, Priorität und Bild-Upload
- Backend-API die Items mit Bildern im Backlog speichert
- Toast-Benachrichtigung nach erfolgreichem Speichern
- TypeScript strict mode, keine Linting-Fehler

## Integration Requirements

**Integration Type:** Full-stack

- [ ] **Integration Test 1:** Quick-To-Do erstellen via REST-API
  - Command: `curl -s -X POST http://localhost:3000/api/backlog/test-project/quick-todo -H 'Content-Type: application/json' -d '{"title":"Test","priority":"medium"}' | grep -q '"success":true'`
  - Validates: Backend-Endpoint erstellt Backlog-Item korrekt
  - Requires MCP: no

- [ ] **Integration Test 2:** Quick-To-Do Modal öffnet sich über Kontextmenü
  - Command: `grep -q "quick-todo" agent-os-ui/ui/src/components/aos-context-menu.ts && grep -q "showQuickTodoModal" agent-os-ui/ui/src/app.ts`
  - Validates: Frontend-Integration Kontextmenü → Modal
  - Requires MCP: no

**Integration Scenarios:**
- [ ] Scenario 1: User rechtsklickt → wählt "Quick-To-Do" → gibt Titel ein → speichert → sieht Toast-Notification → Item erscheint im Backlog
- [ ] Scenario 2: User fügt Bild per Paste ein → sieht Thumbnail → speichert → Bild ist als Datei im attachments-Ordner gespeichert
