# Spec Requirements Document

> Spec: Dev-Team Visualization
> Created: 2026-02-25
> Status: Planning

## Overview

Das Feature "Dev-Team Visualization" fügt eine neue "/team" Seite zur Specwright Web UI hinzu, die alle Skills (`.claude/skills/[name]/`) eines Projekts als Karten-Grid visualisiert. Jede Karte zeigt Skill-Name, Rolle, Beschreibung und Lernfortschritt. Ein Klick öffnet ein Detail-Modal mit vollständigem SKILL.md-Inhalt und Dos-and-Donts.

Das Feature nutzt eine REST-API (Express), die Skills aus dem Dateisystem liest, und folgt den bestehenden Patterns der Codebase (Light DOM Lit Components, Hash-Based Routing).

## User Stories

See: stories/ directory

1. TEAM-001: Backend Skills-API-Endpunkt
2. TEAM-002: Navigation & Routing
3. TEAM-003: Team View + Team Card Komponenten
4. TEAM-004: Team Detail Modal
5. TEAM-005: Integration und Testing

## Spec Scope

- Team-Übersichtsseite ("/team") mit Grid-Layout
- Team-Mitglieder-Karten mit Name, Rolle/Kategorie, Beschreibung, Lernfortschritt
- Detail-Modal mit vollständigem SKILL.md-Inhalt und Dos-and-Donts-Liste
- Backend REST-Endpunkt zum Lesen/Parsen der Skills aus `.claude/skills/`
- Empty State für Projekte ohne Skills
- Navigation-Eintrag "Team" in Seitenleiste

## Out of Scope

- Skills erstellen/bearbeiten/löschen über die UI
- Drag & Drop Sortierung
- Skill-Zuordnung zu Stories/Specs
- Filterung/Suche
- Skill-Konfiguration (Einstellungen ändern)

## Expected Deliverable

- Funktionale Team-Seite mit responsivem Karten-Grid
- REST-API die Skills korrekt aus dem Dateisystem liest und parst
- Detail-Modal mit SKILL.md-Inhalt und Learnings-Übersicht
- Informativer Empty State bei fehlendem Skills-Verzeichnis
- Alle bestehenden Tests weiterhin grün
- Build (Backend + Frontend) kompiliert fehlerfrei

## Integration Requirements

> Diese Integration Tests werden automatisch nach Abschluss aller Stories ausgeführt.

**Integration Type:** Full-stack

- [ ] **Integration Test 1:** Backend Skills-API liefert gültige Daten
   - Command: `cd ui && npx vitest run --reporter=verbose tests/team 2>/dev/null || echo "No team tests yet"`
   - Validates: Skills-Reader Service und Routes funktionieren korrekt
   - Requires MCP: no

- [ ] **Integration Test 2:** Backend kompiliert fehlerfrei
   - Command: `cd ui && npm run build:backend`
   - Validates: TypeScript-Kompilierung ohne Fehler
   - Requires MCP: no

- [ ] **Integration Test 3:** Frontend kompiliert fehlerfrei
   - Command: `cd ui/frontend && npm run build`
   - Validates: Vite-Build ohne Fehler
   - Requires MCP: no

- [ ] **Integration Test 4:** Team-Seite lädt im Browser
   - Command: `# Playwright: Navigate to /#team and verify aos-team-view renders`
   - Validates: Team-Seite wird korrekt gerendert
   - Requires MCP: yes (Playwright)

**Integration Scenarios:**
- [ ] Szenario 1: Nutzer navigiert zu /team, sieht Skills als Karten, klickt auf eine Karte, sieht Detail-Modal
- [ ] Szenario 2: Nutzer navigiert zu /team in einem Projekt ohne Skills, sieht Empty State mit Hinweis

**Notes:**
- Tests marked with "Requires MCP: yes" are optional (skip if MCP tool not available)
- Integration validation runs via System Story 998 during execute-tasks

## Spec Documentation

- Implementation Plan: specwright/specs/2026-02-25-dev-team-visualization/implementation-plan.md
- Requirements: specwright/specs/2026-02-25-dev-team-visualization/requirements-clarification.md
- Stories: specwright/specs/2026-02-25-dev-team-visualization/stories/
