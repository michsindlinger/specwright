# KSE-004: Working Indicator

**Story ID:** KSE-004
**Title:** Working Indicator
**Type:** Frontend
**Priority:** Medium
**Effort:** S
**Status:** Done

## User Story

```gherkin
Feature: Visuelles Feedback während Workflow-Ausführung
  Als Entwickler
  möchte ich sehen welche Story gerade bearbeitet wird,
  damit ich den Fortschritt visuell verfolgen kann.
```

## Akzeptanzkriterien (Gherkin)

```gherkin
Scenario: Working Indicator erscheint nach Workflow-Start
  Given ich habe eine Story nach In Progress gezogen
  And der Workflow wurde gestartet
  When die Story in der In Progress Spalte angezeigt wird
  Then zeigt die Story einen animierten "Working" Indikator
  And der Indikator ist deutlich sichtbar (z.B. pulsierende Animation)

Scenario: Working Indicator bei Workflow-Erfolg
  Given eine Story zeigt den Working Indikator
  When der Workflow erfolgreich abgeschlossen wird
  Then verschwindet der Working Indikator
  And die Story kann nach Done gezogen werden

Scenario: Error Indicator bei Workflow-Fehler
  Given eine Story zeigt den Working Indikator
  When der Workflow mit einem Fehler endet
  Then wird der Working Indikator durch einen Error Indikator ersetzt
  And die Story bleibt in In Progress
  And ein Tooltip zeigt den Fehler an

Scenario: Indikator überlebt Page Refresh
  Given eine Story hat einen laufenden Workflow
  When ich die Seite neu lade
  Then zeigt die Story weiterhin den Working Indikator
  And der Indikator-Status kommt vom Backend
```

## Business Value
Gibt dem Entwickler klares Feedback über den Workflow-Status ohne den Kanban-View verlassen zu müssen.

---

## Technisches Refinement (vom Architect)

### DoR (Definition of Ready)
- [x] Fachliche Anforderungen klar
- [x] Technischer Ansatz definiert
- [x] Abhängigkeiten identifiziert
- [x] Betroffene Komponenten bekannt
- [x] Story ist angemessen dimensioniert (max 5 Dateien, 400 LOC)
- [x] Full-Stack Konsistenz geprüft

### DoD (Definition of Done)
- [x] Code implementiert und folgt Style Guide
- [x] Architektur-Anforderungen erfüllt
- [x] Alle Akzeptanzkriterien erfüllt
- [x] Tests geschrieben und bestanden
- [x] Keine Linting-Fehler
- [x] Completion Check Commands erfolgreich

### Betroffene Layer & Komponenten

- **Integration Type:** Full-Stack

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | story-card.ts | Working/Error Indicator Rendering |
| Frontend | story-status-badge.ts | Neuer "working" Status |
| Frontend | kanban-board.ts | Workflow Status Tracking |
| Frontend | theme.css | Animationen, Error Styles |
| Backend | specs-reader.ts | Workflow Status in Kanban |

**Kritische Integration Points:**
- WebSocket workflow.* Events → Frontend Story Status Update
- Backend Workflow Status → Kanban Board State

### Technische Details

**WAS:**
1. **StoryInfo Interface erweitern:** Neues Feld `workflowStatus?: 'idle' | 'working' | 'success' | 'error'`
2. **Story-Card:** Working Indicator UI (pulsierender Kreis/Spinner)
3. **Story-Status-Badge:** Neuer Status "working" mit Animation
4. **Kanban-Board:** State-Tracking für aktive Workflow-Executions pro Story
5. **WebSocket Events lauschen:** `workflow.started`, `workflow.complete`, `workflow.error` Events verarbeiten
6. **Tooltip bei Error:** Error-Message im Tooltip anzeigen

**WIE (Architecture Guidance):**
- **CSS Animation:** `@keyframes pulse` für Working-Indikator (wie bestehende Loading-States)
- **Story-Status-Badge erweitern:** Neue Klasse `status-working` mit Animation
- **State in kanban-board.ts:** Map<storyId, workflowStatus> für Tracking
- **Gateway Events:** Auf `workflow.interactive.complete`, `workflow.interactive.error` lauschen
- **Bestehende Pattern:** story-status-badge.ts hat bereits `getStatusConfig()` - erweitern um 'working' Status
- **Tooltip Pattern:** title-Attribut für Error-Message nutzen

**WO:**
- `agent-os-ui/ui/src/components/story-card.ts` - Working Indicator Rendering
- `agent-os-ui/ui/src/components/story-status-badge.ts` - Neuer "working" Status + Animation
- `agent-os-ui/ui/src/components/kanban-board.ts` - Workflow Status Tracking State
- `agent-os-ui/ui/src/styles/theme.css` - Pulse Animation + Working/Error Styles

**WER:** dev-team__frontend-developer

**Abhängigkeiten:** KSE-003

**Geschätzte Komplexität:** S

**Relevante Skills:**
| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | .claude/skills/frontend-lit/SKILL.md | Lit Component Patterns |
| frontend-lit/state-management | .claude/skills/frontend-lit/state-management.md | Component State Management |
| domain-agent-os-web-ui/workflow-execution | .claude/skills/domain-agent-os-web-ui/workflow-execution.md | Workflow Events |

### Technische Verifikation

| Check | Type | Details |
|-------|------|---------|
| FILE_EXISTS | agent-os-ui/ui/src/components/story-status-badge.ts | Modified with working status |
| FILE_EXISTS | agent-os-ui/ui/src/components/story-card.ts | Modified with indicator |
| FILE_EXISTS | agent-os-ui/ui/src/components/kanban-board.ts | Modified with workflow tracking |
| CONTAINS | story-status-badge.ts | `status-working` |
| CONTAINS | story-status-badge.ts | `working` case in getStatusConfig |
| CONTAINS | theme.css | `@keyframes pulse` oder `animation:` |
| CONTAINS | theme.css | `.status-working` |
| CONTAINS | kanban-board.ts | `workflow` event handling |
| LINT_PASS | Frontend | npm run lint (no errors) |

### Completion Check
```bash
# Check working status in story-status-badge
grep -q "status-working" agent-os-ui/ui/src/components/story-status-badge.ts && echo "PASS: status-working class" || echo "FAIL: status-working class missing"

# Check working case in getStatusConfig
grep -q "working" agent-os-ui/ui/src/components/story-status-badge.ts && echo "PASS: working status" || echo "FAIL: working status missing"

# Check pulse animation in CSS
grep -qE "(pulse|@keyframes.*working)" agent-os-ui/ui/src/styles/theme.css && echo "PASS: animation" || echo "FAIL: animation missing"

# Check status-working CSS class
grep -q ".status-working" agent-os-ui/ui/src/styles/theme.css && echo "PASS: status-working CSS" || echo "FAIL: status-working CSS missing"

# Check workflow event handling in kanban-board
grep -qE "workflow\.(complete|interactive|started)" agent-os-ui/ui/src/components/kanban-board.ts && echo "PASS: workflow events" || echo "FAIL: workflow events missing"

# Lint check
cd agent-os-ui && npm run lint && echo "PASS: Lint" || echo "FAIL: Lint errors"
```

### Story ist DONE wenn:
1. Alle Gherkin-Szenarien bestanden
2. Alle technischen Verifikationen bestanden
3. Completion Check Commands exit 0
