# Spec Requirements Document

> Spec: Git Integration Erweitert
> Created: 2026-02-11
> Status: Planning

## Overview

Erweiterung der bestehenden Git Integration UI um Datei-Management (Revert/Delete), PR-Anzeige und einen kombinierten "Commit & Push"-Workflow. Alle Features werden minimalinvasiv durch Erweiterung der bestehenden 9 Dateien umgesetzt, ohne neue Dateien zu erstellen.

## User Stories

Siehe: stories/ Verzeichnis

1. GITE-001: Git Backend Erweiterung (Revert, Delete, PR-Info)
2. GITE-002: Datei-Aktionen im Commit-Dialog
3. GITE-003: PR-Anzeige in Status-Leiste
4. GITE-004: Commit & Push Workflow

## Spec Scope

- Einzelne Dateien reverten (modified + staged) im Commit-Dialog
- "Alle reverten" Button im Commit-Dialog
- Einzelne untracked Dateien loeschen mit Bestaetigungsdialog
- PR-Badge in der Status-Leiste (Nummer + Status + Link)
- "Commit & Push" Button mit Auto-Push nach Commit
- Fortschrittsanzeige waehrend Commit & Push

## Out of Scope

- Partial Revert (einzelne Hunks/Zeilen)
- PR erstellen aus der UI
- PR-Reviews anzeigen oder kommentieren
- Merge-Konflikt-Resolution UI
- Interaktives Rebase
- Stash-Funktionalitaet

## Expected Deliverable

- Erweiterte Backend-Services fuer Revert, Delete Untracked und PR-Info
- Commit-Dialog mit Revert/Delete Action-Buttons pro Datei
- PR-Badge in der Git Status-Leiste
- "Commit & Push" Button mit sequentiellem Workflow
- TypeScript-kompilierbarer Code ohne Linting-Errors

## Integration Requirements

**Integration Type:** Full-stack

- [ ] **Integration Test 1:** Revert via WebSocket
   - Command: `grep -q "git:revert" agent-os-ui/src/shared/types/git.protocol.ts && grep -q "handleRevert" agent-os-ui/src/server/handlers/git.handler.ts`
   - Validates: Backend Revert-Endpoint existiert
   - Requires MCP: no

- [ ] **Integration Test 2:** Delete Untracked via WebSocket
   - Command: `grep -q "git:delete-untracked" agent-os-ui/src/shared/types/git.protocol.ts && grep -q "handleDeleteUntracked" agent-os-ui/src/server/handlers/git.handler.ts`
   - Validates: Backend Delete-Endpoint existiert
   - Requires MCP: no

- [ ] **Integration Test 3:** PR Info via WebSocket
   - Command: `grep -q "git:pr-info" agent-os-ui/src/shared/types/git.protocol.ts && grep -q "handlePrInfo" agent-os-ui/src/server/handlers/git.handler.ts`
   - Validates: Backend PR-Info-Endpoint existiert
   - Requires MCP: no

- [ ] **Integration Test 4:** Frontend Components integriert
   - Command: `grep -q "revert-file\|revert-all" agent-os-ui/ui/src/components/git/aos-git-commit-dialog.ts && grep -q "prInfo" agent-os-ui/ui/src/components/git/aos-git-status-bar.ts`
   - Validates: Frontend-Erweiterungen existieren
   - Requires MCP: no

- [ ] **Integration Test 5:** Build passes
   - Command: `cd agent-os-ui && npm run build`
   - Validates: Gesamtes Projekt kompiliert fehlerfrei
   - Requires MCP: no

**Integration Scenarios:**
- [ ] Scenario 1: User revertiert eine Datei im Commit-Dialog und sieht die aktualisierte Dateiliste
- [ ] Scenario 2: User loescht eine untracked Datei nach Bestaetigung
- [ ] Scenario 3: User sieht PR-Badge und klickt darauf um den PR im Browser zu oeffnen
- [ ] Scenario 4: User klickt "Commit & Push", gibt Message ein, und beide Operationen werden sequentiell ausgefuehrt

## Spec Documentation

- Requirements: agent-os/specs/2026-02-11-git-integration-erweitert/requirements-clarification.md
- Implementation Plan: agent-os/specs/2026-02-11-git-integration-erweitert/implementation-plan.md
- Story Index: agent-os/specs/2026-02-11-git-integration-erweitert/story-index.md
