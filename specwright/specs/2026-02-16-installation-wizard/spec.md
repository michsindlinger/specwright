# Spec Requirements Document

> Spec: Installation Wizard
> Created: 2026-02-16
> Status: Planning

## Overview

Wenn ein Benutzer in der Specwright Web UI ein neues Projekt hinzufuegt (Plus-Button), in dem Specwright noch nicht installiert ist (kein `specwright/`-Ordner), erscheint ein modaler Installations-Wizard. Dieser fuehrt den Benutzer durch den initialen Setup-Prozess mittels eines eingebetteten Claude Code Terminals und zeigt anschliessend eine "Naechste Schritte"-Seite mit den wichtigsten Aktionen.

Der Wizard bietet vier Setup-Optionen (plan-product, plan-platform, analyze-product, analyze-platform) und erkennt anhand der Dateianzahl ob es sich um ein Bestandsprojekt handelt, um passende Empfehlungen zu geben.

## User Stories

- IW-001: Specwright-Erkennung beim Projekt-Hinzufuegen
- IW-002: Installation Wizard Modal
- IW-003: Terminal-Integration im Wizard
- IW-004: Wizard Abbruch-Handling
- IW-005: Getting Started View
- IW-006: Router & Navigation Integration

Siehe: stories/ Verzeichnis fuer vollstaendige Story-Dateien.

## Spec Scope

- Erkennung ob Specwright installiert ist (`specwright/`-Ordner Check) beim Projekt-Hinzufuegen
- Wizard-Modal mit Command-Auswahl und Beschreibungen
- Bestandsprojekt-Erkennung via Dateianzahl mit Hinweis auf analyze-*-Commands
- Claude Code Terminal im Modal fuer Command-Ausfuehrung
- Abbruch-Handling mit Wiedererscheinen beim naechsten Oeffnen
- `/getting-started`-Route mit drei Naechste-Schritte-Optionen (create-spec, add-todo, add-bug)
- Menu-Eintrag fuer `/getting-started`

## Out of Scope

- CLI-Integration (nur Web UI)
- Automatische Erkennung des Tech Stacks
- Wizard fuer Updates/Upgrades bestehender Specwright-Installationen
- Erweiterte Onboarding-Tutorials oder Video-Integration
- Anpassbare Wizard-Schritte

## Expected Deliverable

Ein funktionierendes Installations-Wizard-Feature mit:
- Backend-Erkennung: `specwright/`-Ordner-Check und Dateianzahl bei Projekt-Validierung
- Wizard-Modal: Command-Auswahl-UI mit eingebettetem Claude Code Terminal
- Abbruch-Flow: Meldung bei Abbruch, Wizard erscheint beim naechsten Mal erneut
- Getting-Started-View: Eigene Route `/getting-started` mit drei Aktions-Cards
- Navigation: Menu-Eintrag und automatische Weiterleitung nach Wizard-Abschluss

## Integration Requirements

> **IMPORTANT:** These integration tests will be executed automatically after all stories complete.

**Integration Type:** Full-stack

- [ ] **Integration Test 1:** Backend-Erkennung liefert korrekte Flags
   - Command: `cd ui && npx vitest run --reporter=verbose tests/project-context.test.ts`
   - Validates: `validateProjectForWizard() gibt hasSpecwright und fileCount zurueck`
   - Requires MCP: no

- [ ] **Integration Test 2:** Frontend Build kompiliert fehlerfrei
   - Command: `cd ui/frontend && npm run build`
   - Validates: `Alle neuen Komponenten kompilieren`
   - Requires MCP: no

- [ ] **Integration Test 3:** Backend Build kompiliert fehlerfrei
   - Command: `cd ui && npm run build:backend`
   - Validates: `Backend mit erweiterten Types kompiliert`
   - Requires MCP: no

- [ ] **Integration Test 4:** Wizard Modal oeffnet bei Projekt ohne specwright/
   - Command: `(Playwright Browser-Test)`
   - Validates: `Modal erscheint wenn Projekt ohne specwright/ hinzugefuegt wird`
   - Requires MCP: yes

**Integration Scenarios:**
- [ ] Scenario 1: Benutzer fuegt neues Projekt ohne specwright/ hinzu -> Wizard erscheint -> waehlt plan-product -> Terminal zeigt Command-Ausfuehrung -> Nach Abschluss Weiterleitung zu /getting-started
- [ ] Scenario 2: Benutzer fuegt Projekt MIT specwright/ hinzu -> Wizard erscheint NICHT -> normaler Flow

**Notes:**
- Tests marked with "Requires MCP: yes" are optional (skip if MCP tool not available)
- Integration validation runs via System Story 998 during execute-tasks
- If integration tests fail, they will be fixed before proceeding

## Spec Documentation

- Tasks: @specwright/specs/2026-02-16-installation-wizard/story-index.md
- Implementation Plan: @specwright/specs/2026-02-16-installation-wizard/implementation-plan.md
- Requirements: @specwright/specs/2026-02-16-installation-wizard/requirements-clarification.md
