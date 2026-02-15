# Spec Requirements Document

> Spec: Git Integration UI
> Created: 2026-02-11
> Status: Planning

## Overview

Eine Git-Informationsleiste direkt unterhalb der Projekt-Tabs, die Entwicklern den aktuellen Branch, Ahead/Behind-Status und geaenderte Dateien anzeigt. Nutzer koennen Branches wechseln, Commits erstellen (mit Datei-Auswahl), sowie Pull und Push direkt aus der Web UI ausfuehren.

Das Feature folgt dem bestehenden WebSocket-basierten Kommunikationsmuster und repliziert das Cloud Terminal Pattern (Protocol Types -> Backend Service -> WebSocket Handler -> Gateway -> Lit Components).

## User Stories

See: stories/ directory

| ID | Title |
|----|-------|
| GIT-001 | Git Backend API |
| GIT-002 | Git Status-Leiste |
| GIT-003 | Branch-Wechsel |
| GIT-004 | Commit-Dialog |
| GIT-005 | Pull, Push und Fehlerbehandlung |
| GIT-997 | Code Review |
| GIT-998 | Integration Validation |
| GIT-999 | Finalize PR |

## Spec Scope

- Git-Status-Leiste mit Branch-Name, Ahead/Behind, Changed Files Count, Action Buttons
- Branch-Wechsel per Dropdown (nur lokale Branches)
- Commit-Dialog (Modal) mit Dateiliste, Checkboxen, Commit-Message-Feld
- Pull (normal + rebase) und Push (kein Force)
- Manueller Refresh (kein automatisches Polling)
- Erkennung ob Git-Repository vorhanden ist
- Error-Handling fuer Merge-Konflikte, Netzwerkfehler, laufende Operationen
- Backend Git Service mit WebSocket-basierter API
- Shared Protocol Types fuer Git Messages

## Out of Scope

- Neue Branches erstellen
- Remote-Branches auschecken
- Force-Push
- Diff-Ansicht (Datei-Inhalte vergleichen)
- Merge-Konflikt-Loesung in der UI
- Automatisches Polling / Auto-Refresh
- Git-Log / Commit-Historie anzeigen
- Stash-Funktionalitaet
- Git-Blame / File-History
- Cherry-Pick, Revert, Reset

## Expected Deliverable

Ein funktionales Git-Integration-Feature mit:
- Sichtbare Status-Leiste unter Projekt-Tabs mit Echtzeit-Git-Informationen
- Branch-Wechsel per Dropdown mit Uncommitted-Changes-Schutz
- Commit-Dialog mit Datei-Auswahl und Message-Feld
- Pull (normal + rebase) und Push Buttons
- Vollstaendiges Error-Handling
- Integration in bestehendes WebSocket-Kommunikationsmuster

## Integration Requirements

> Diese Integration Tests werden automatisch nach Abschluss aller Stories ausgefuehrt.

**Integration Type:** Full-stack

- [x] **Integration Test 1:** Git Status via WebSocket
   - Command: `grep -q "git.status" agent-os-ui/src/server/handlers/git.handler.ts && grep -q "git.status" agent-os-ui/src/shared/types/git.protocol.ts`
   - Validates: Backend Git Handler und Protocol Types sind verbunden
   - Requires MCP: no

- [x] **Integration Test 2:** Frontend Git Components
   - Command: `grep -q "aos-git-status-bar" agent-os-ui/ui/src/app.ts && grep -q "aos-git-commit-dialog" agent-os-ui/ui/src/app.ts`
   - Validates: Git-Komponenten sind in app.ts integriert
   - Requires MCP: no

- [x] **Integration Test 3:** Gateway Git Methods
   - Command: `grep -q "requestGitStatus" agent-os-ui/ui/src/gateway.ts && grep -q "sendGitCommit" agent-os-ui/ui/src/gateway.ts`
   - Validates: Gateway hat Git-Methoden
   - Requires MCP: no

- [x] **Integration Test 4:** Build passes
   - Command: `cd agent-os-ui && npm run build`
   - Validates: Gesamtprojekt baut fehlerfrei
   - Requires MCP: no

- [ ] **Integration Test 5:** Visual Integration (SKIPPED - requires running server)
   - Command: `MCP_PLAYWRIGHT: http://localhost:3000 - Git status bar sichtbar unter Projekt-Tabs`
   - Validates: UI zeigt Git-Status-Leiste korrekt an
   - Requires MCP: yes

**Integration Scenarios:**
- [ ] Scenario 1: Nutzer oeffnet Projekt mit Git-Repo, sieht Branch/Status, wechselt Branch, commitet Dateien, pusht
- [ ] Scenario 2: Nutzer oeffnet Projekt ohne Git-Repo, sieht Info-Meldung, keine Git-Buttons

## Spec Documentation

- Implementation Plan: agent-os/specs/2026-02-11-git-integration-ui/implementation-plan.md
- Requirements: agent-os/specs/2026-02-11-git-integration-ui/requirements-clarification.md
- Stories: agent-os/specs/2026-02-11-git-integration-ui/stories/
