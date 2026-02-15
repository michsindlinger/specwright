# Spec Requirements Document

> Spec: Cloud Terminal Erweiterung
> Created: 2026-02-11
> Status: Planning

## Overview

Die Cloud Terminal Sidebar wird erweitert, um neben Claude Code Sessions auch reguläre Shell-Terminals im Projektpfad zu öffnen. Beim Starten einer neuen Session wählt der User zwischen einem normalen Terminal (sofort, ohne LLM) und einer Cloud Code Session (mit Provider/Model-Auswahl). Ein neues Feld `terminalType: 'shell' | 'claude-code'` durchzieht das gesamte System als Discriminator.

## User Stories

See: stories/ directory

1. CTE-001: Terminal-Typ im Datenmodell & Protokoll
2. CTE-002: Backend Plain Terminal Support
3. CTE-003: Frontend Session-Erstellungs-UI
4. CTE-004: Integration & Tab-Management

## Spec Scope

- Terminal-Typ-Auswahl (Terminal vs. Cloud Code) im Session-Erstellungs-Flow
- "Terminal" als eigene Gruppe oben im Dropdown, mit Separator zu Providern
- Backend-Unterstützung für Plain-Shell PTY (ohne Claude Code)
- Tab-Management für gemischte Terminal-Typen
- Anpassung des Session-Datenmodells um Terminal-Typ zu tracken
- Backward Compatibility: Bestehende Sessions ohne `terminalType` erhalten Default `'claude-code'`

## Out of Scope

- Umbenennung der Sidebar (bleibt "Cloud Terminal")
- Visuelle Unterscheidung zwischen Terminal-Typen in Tabs
- Terminal-spezifische Features (z.B. Split-View, Profiles)
- Custom Shell-Auswahl (immer Default-Shell des Systems)

## Expected Deliverable

- Funktionierendes Shell-Terminal in der Cloud Terminal Sidebar
- Gemischte Tabs (Shell + Claude Code) in derselben Sidebar
- "Terminal"-Option als erste Gruppe im Dropdown mit Separator
- Alle bestehenden Cloud Code Features bleiben unverändert
- TypeScript-Types korrekt erweitert mit `terminalType`-Discriminator

## Integration Requirements

> Diese Integration Tests werden automatisch nach Abschluss aller Stories ausgeführt.

**Integration Type:** Full-stack

- [ ] **Integration Test 1:** Shell-Terminal kann gestartet werden
   - Command: `grep -r "terminalType.*shell" agent-os-ui/src/shared/types/cloud-terminal.protocol.ts && echo "Type exists"`
   - Validates: `terminalType 'shell' ist im Protocol definiert`
   - Requires MCP: no

- [ ] **Integration Test 2:** Backend akzeptiert Shell-Terminal-Requests
   - Command: `grep -r "terminalType" agent-os-ui/src/server/services/cloud-terminal-manager.ts && echo "Backend handles terminalType"`
   - Validates: `CloudTerminalManager verarbeitet terminalType`
   - Requires MCP: no

- [ ] **Integration Test 3:** Dropdown zeigt Terminal-Option
   - Command: `grep -r "Terminal" agent-os-ui/ui/src/components/terminal/aos-model-dropdown.ts | grep -v "CloudTerminal\|template" && echo "Terminal option exists"`
   - Validates: `Terminal-Gruppe existiert im Dropdown`
   - Requires MCP: no

**Integration Scenarios:**
- [ ] Scenario 1: User öffnet Cloud Terminal Sidebar, klickt "Neue Session", sieht "Terminal" als erste Option, wählt sie aus, ein Shell-Terminal startet im Projektpfad
- [ ] Scenario 2: User hat ein Shell-Terminal und ein Claude Code Terminal gleichzeitig als Tabs und kann zwischen beiden wechseln

## Spec Documentation

- Implementation Plan: agent-os/specs/2026-02-11-cloud-terminal-erweiterung/implementation-plan.md
- Requirements: agent-os/specs/2026-02-11-cloud-terminal-erweiterung/requirements-clarification.md
- Story Index: agent-os/specs/2026-02-11-cloud-terminal-erweiterung/story-index.md
