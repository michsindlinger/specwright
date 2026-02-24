# Code Review Report - Spec Assignment for External Bot

**Datum:** 2026-02-24
**Branch:** feature/spec-assignment
**Reviewer:** Claude (Opus 4.6)

## Review Summary

**Gepruefte Commits:** 6
**Gepruefte Dateien:** 13
**Gefundene Issues:** 3

| Schweregrad | Anzahl |
|-------------|--------|
| Critical | 0 |
| Major | 1 |
| Minor | 2 |

## Gepruefte Dateien

| Datei | Status | Ergebnis |
|-------|--------|----------|
| specwright/scripts/mcp/kanban-mcp-server.ts | Modified | OK |
| ui/src/server/specs-reader.ts | Modified | OK |
| ui/src/server/websocket.ts | Modified | OK |
| ui/frontend/src/components/kanban-board.ts | Modified | Issue #1 (Major) |
| ui/frontend/src/components/spec-card.ts | Modified | Issue #1 (Major) |
| ui/frontend/src/styles/theme.css | Modified | OK |
| ui/frontend/src/views/dashboard-view.ts | Modified | Issue #3 (Minor) |
| .claude/commands/specwright/assign-spec.md | Added | OK |
| specwright/specs/.../integration-context.md | Added | OK |
| specwright/specs/.../kanban.json | Modified | OK |
| specwright/specs/.../story-001-*.md | Modified | OK |
| specwright/specs/.../story-002-*.md | Modified | OK |
| specwright/specs/.../story-003-*.md | Modified | OK |
| specwright/specs/.../story-004-*.md | Modified | OK |

## Quality Checks

| Check | Ergebnis |
|-------|----------|
| TypeScript Backend (tsc --noEmit) | PASSED |
| TypeScript Frontend (tsc --noEmit) | PASSED |
| ESLint Backend | PASSED |
| ESLint Frontend | PASSED |
| Vitest Tests | 26 failures (ALL pre-existing, none introduced by this feature) |

## Issues

### Critical Issues

Keine gefunden.

### Major Issues

#### Issue #1: Unassignment-Button disabled bei laufender Execution

**Dateien:**
- `ui/frontend/src/components/spec-card.ts:106`
- `ui/frontend/src/components/kanban-board.ts:1797-1802`

**Beschreibung:**
Das Frontend deaktiviert den Assignment-Toggle wenn `isReady=false`. Sobald eine Story von "ready" nach "in_progress" oder "done" wechselt, wird `isReady=false` (weil nicht mehr alle Stories "ready" sind). Der Toggle wird dann disabled, obwohl das Backend in `toggleBotAssignment()` das Unassignment korrekt erlaubt (Ready-Check nur beim Assignen, nicht beim Un-Assignen).

**Auswirkung:**
Sobald ein Bot mit der Execution beginnt, kann der User die Spec nicht mehr ueber die UI un-assignen.

**Empfehlung:**
`disabled`-Bedingung aendern von `!isReady` zu `!isReady && !assignedToBot`. So bleibt der Toggle aktiv wenn die Spec assigned ist (zum Un-Assignen), wird aber weiterhin disabled wenn die Spec weder ready noch assigned ist.

### Minor Issues

#### Issue #2: Dupliziertes Interface KanbanJsonAssignedToBot

**Dateien:**
- `specwright/scripts/mcp/kanban-mcp-server.ts:136`
- `ui/src/server/specs-reader.ts:202`

**Beschreibung:**
Das Interface `KanbanJsonAssignedToBot` ist identisch in beiden Dateien definiert. Bei aendern eines Interfaces muss das andere manuell nachgezogen werden.

**Empfehlung:**
Akzeptabel fuer jetzt - die Dateien gehoeren zu verschiedenen Systemen (MCP-Server vs Express-Server) und teilen bewusst keinen Code. Langfristig koennte ein shared-types Package helfen.

#### Issue #3: Duplizierte Event-Handler in dashboard-view.ts

**Dateien:**
- `ui/frontend/src/views/dashboard-view.ts`

**Beschreibung:**
`handleSpecAssign()` und `handleSpecAssignToggle()` haben identische Implementierungen (beide senden `gateway.send({ type: 'specs.assign', specId })`). Zwei separate Methoden fuer die gleiche Aktion (eine von spec-card, eine von kanban-board).

**Empfehlung:**
Koennte zu einer Methode konsolidiert werden. Allerdings: Separate Methoden machen die Herkunft des Events klar und ermoeglichen spaeter unterschiedliches Verhalten. Akzeptabel als-is.

## Fix Status

| # | Schweregrad | Issue | Status | Fix-Details |
|---|-------------|-------|--------|-------------|
| 1 | Major | Unassignment-Button disabled bei laufender Execution | fixed | disabled-Bedingung in spec-card.ts und kanban-board.ts geaendert: `!isReady` zu `!isReady && !assignedToBot` |
| 2 | Minor | Dupliziertes Interface | skipped | Bewusste Entscheidung: verschiedene Systeme |
| 3 | Minor | Duplizierte Event-Handler | skipped | Akzeptabel: Klarheit > DRY fuer 2 Zeilen |

## Re-Review

**Datum:** 2026-02-24
**Gepruefte Dateien:** 2 (nur geaenderte)
**Neue Issues:** 0
**Auto-Fix Ergebnis:** 1/1 gefixt, 0 als Bug-Tickets erstellt
**Ergebnis:** Review bestanden

## Empfehlungen

1. **Test fuer Toggle-Logik** - Ein Unit-Test fuer die disabled/enabled-Logik des Assignment-Toggles waere hilfreich
2. **Keyboard Accessibility** - Die Assign-Buttons haben korrekte aria-labels, gut gemacht

## Fazit

Review passed (after fixes). Alle Issues behoben oder bewusst akzeptiert. Code ist merge-ready.
