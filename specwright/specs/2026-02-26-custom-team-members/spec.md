# Spec Requirements Document

> Spec: Custom Team Members
> Created: 2026-02-26
> Status: Planning

## Overview

Erweiterung der Specwright Team-Seite um benutzerdefinierte Teammitglieder (Einzelpersonen und Teams). Nutzer können über einen interaktiven `/add-team-member` Slash-Command eigene Skills erstellen, diese in einem Markdown-Editor bearbeiten und per REST DELETE Endpoint löschen. Die Team-Seite zeigt Skills gruppiert nach DevTeam, Custom Teams und Einzelpersonen an.

## User Stories

- CTM-001: Backend Foundation - Shared Types, Service und API Endpoints
- CTM-002: Workflow & Command - Interaktiver `/add-team-member` Dialog
- CTM-003: Frontend Gruppierte Darstellung - Team-Seite mit Sektionen
- CTM-004: Edit-Funktionalität - Markdown-Editor Modal
- CTM-005: Delete-Funktionalität - REST DELETE mit Confirmation Dialog
- CTM-006: Integration & Workflow-Trigger - Button-Trigger und Auto-Refresh

## Spec Scope

- Neuer `/add-team-member` Workflow + Command
- Interaktiver Dialog zur Skill-Erstellung mit erweiterten Frontmatter-Feldern (teamType, teamName)
- Gruppierte Darstellung auf der Team-Seite (DevTeam / Teams / Einzelpersonen)
- Edit-Funktionalität (Markdown-Editor Modal mit CodeMirror)
- Delete-Funktionalität (REST DELETE Endpoint + Confirmation Dialog)
- Dokumenten-Templates als Teil des Skills
- Standalone-Terminal-Nutzung und UI-Integration

## Out of Scope

- Migration bestehender Skills (Rückwärtskompatibel)
- Team-übergreifende Kommunikation zwischen Skills
- Rollen-basierte Zugriffsrechte
- Import/Export von Skills
- Vorgefertigte Skill-Templates

## Expected Deliverable

- Funktionierender `/add-team-member` Workflow im Terminal
- Backend-API mit teamType/teamName Parsing, PUT und DELETE Endpoints
- Team-Seite mit gruppierter Darstellung
- Edit-Modal mit CodeMirror-Editor
- Delete-Funktionalität mit Confirmation Dialog
- Vollständige Rückwärtskompatibilität mit bestehenden Skills

## Integration Requirements

> These integration tests will be executed automatically after all stories complete.

**Integration Type:** Full-stack

- [ ] **Integration Test 1:** Backend liefert teamType/teamName in API Response
   - Command: `cd ui && npx vitest run --reporter=verbose 2>&1 | grep -E "team|skill"`
   - Validates: Backend parst und liefert erweiterte Frontmatter-Felder
   - Requires MCP: no

- [ ] **Integration Test 2:** Frontend Build kompiliert ohne Fehler
   - Command: `cd ui/frontend && npm run build`
   - Validates: Alle neuen Lit-Komponenten kompilieren korrekt
   - Requires MCP: no

- [ ] **Integration Test 3:** Backend Build kompiliert ohne Fehler
   - Command: `cd ui && npm run build:backend`
   - Validates: Neue Endpoints und Service-Methoden kompilieren
   - Requires MCP: no

- [ ] **Integration Test 4:** Lint-Check ohne Fehler
   - Command: `cd ui && npm run lint`
   - Validates: Code-Style-Konformität
   - Requires MCP: no

**Integration Scenarios:**
- [ ] Scenario 1: Nutzer erstellt Custom-Skill per Workflow, Team-Seite zeigt ihn in der richtigen Sektion
- [ ] Scenario 2: Nutzer bearbeitet SKILL.md über Edit-Modal, Änderungen werden gespeichert und angezeigt
- [ ] Scenario 3: Nutzer löscht Custom-Skill, Skill verschwindet aus Team-Seite

**Notes:**
- Tests marked with "Requires MCP: yes" are optional
- Integration validation runs via System Story 998
