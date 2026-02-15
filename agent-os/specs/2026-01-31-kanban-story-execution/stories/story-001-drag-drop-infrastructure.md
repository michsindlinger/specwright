# KSE-001: Drag & Drop Infrastruktur

**Story ID:** KSE-001
**Title:** Drag & Drop Infrastruktur
**Type:** Frontend
**Priority:** High
**Effort:** S
**Status:** Done

## User Story

```gherkin
Feature: Drag & Drop im Kanban Board
  Als Entwickler
  möchte ich Stories per Drag & Drop zwischen Kanban-Spalten verschieben können,
  damit ich den Workflow intuitiv steuern kann.
```

## Akzeptanzkriterien (Gherkin)

```gherkin
Scenario: Story Card ist draggable
  Given ich bin im Kanban Board einer Spec
  And ich sehe eine Story Card in der Backlog-Spalte
  When ich die Story Card anklicke und halte
  Then wird ein Drag-Preview angezeigt
  And die Original-Card wird halbtransparent

Scenario: Drop Zone Highlighting
  Given ich ziehe eine Story Card
  When ich über die "In Progress" Spalte hovere
  Then wird die Spalte visuell als Drop-Zone hervorgehoben
  And zeigt an dass ein Drop möglich ist

Scenario: Erfolgreicher Drop
  Given ich ziehe eine Story Card über eine gültige Drop-Zone
  When ich die Maustaste loslasse
  Then wird die Story in die Ziel-Spalte verschoben
  And die UI aktualisiert sich sofort

Scenario: Drop außerhalb gültiger Zone
  Given ich ziehe eine Story Card
  When ich die Maustaste außerhalb einer Spalte loslasse
  Then kehrt die Story zur Ursprungsposition zurück
  And es erfolgt keine Statusänderung
```

## Business Value
Grundlage für alle weiteren Drag & Drop Features. Ermöglicht intuitive Kanban-Bedienung wie in bekannten Tools (Jira, Trello).

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

- **Integration Type:** Frontend-only

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | kanban-board.ts | Drag & Drop Container Logic |
| Frontend | story-card.ts | Draggable Attribute, Drag Events |
| Frontend | theme.css | Drag Preview, Drop Zone Styles |

### Technische Details

**WAS:**
1. Story-Card als draggable Element konfigurieren (draggable="true" Attribut)
2. Drag-Event Handler implementieren (dragstart, dragend)
3. Kanban-Spalten als Drop-Zonen konfigurieren (dragover, drop, dragleave)
4. Visuelles Feedback für Drag-Vorschau und Drop-Zone Highlighting
5. State-Management für aktive Drag-Operation

**WIE (Architecture Guidance):**
- **HTML5 Drag & Drop API verwenden** (native Browser API, keine Library)
- **Lit-Pattern für Events:** `@dragstart`, `@dragover`, `@drop` direkt im Template
- **DataTransfer API:** Story-ID im dataTransfer-Objekt speichern (`e.dataTransfer.setData('text/plain', storyId)`)
- **CSS-Klassen für States:** `.dragging` (auf Story während Drag), `.drop-zone-active` (auf Spalte während Hover)
- **createRenderRoot Pattern beibehalten:** Komponenten nutzen Light DOM (return this;)
- **Bestehende Event-Pattern folgen:** CustomEvent mit bubbles: true, composed: true

**WO:**
- `agent-os-ui/ui/src/components/story-card.ts` - Draggable Attribute + dragstart/dragend Handler
- `agent-os-ui/ui/src/components/kanban-board.ts` - Drop-Zone Logic (dragover, drop, dragleave)
- `agent-os-ui/ui/src/styles/theme.css` - Drag-Preview + Drop-Zone Styles (.dragging, .drop-zone-active, .drop-zone-hover)

**WER:** dev-team__frontend-developer

**Abhängigkeiten:** None

**Geschätzte Komplexität:** S

**Relevante Skills:**
| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | .claude/skills/frontend-lit/SKILL.md | Lit Web Components Patterns |
| frontend-lit/components | .claude/skills/frontend-lit/components.md | Component Event Handling |
| domain-agent-os-web-ui | .claude/skills/domain-agent-os-web-ui/SKILL.md | Kanban Board Context |

### Technische Verifikation

| Check | Type | Details |
|-------|------|---------|
| FILE_EXISTS | agent-os-ui/ui/src/components/story-card.ts | Modified with draggable |
| FILE_EXISTS | agent-os-ui/ui/src/components/kanban-board.ts | Modified with drop handlers |
| CONTAINS | story-card.ts | `draggable="true"` |
| CONTAINS | story-card.ts | `@dragstart=` |
| CONTAINS | story-card.ts | `@dragend=` |
| CONTAINS | kanban-board.ts | `@dragover=` |
| CONTAINS | kanban-board.ts | `@drop=` |
| CONTAINS | theme.css | `.dragging` |
| CONTAINS | theme.css | `.drop-zone-active` |
| LINT_PASS | Frontend | npm run lint (no errors) |

### Completion Check
```bash
# Check dragstart handler exists in story-card.ts
grep -q "@dragstart=" agent-os-ui/ui/src/components/story-card.ts && echo "PASS: dragstart handler" || echo "FAIL: dragstart handler missing"

# Check draggable attribute
grep -q 'draggable="true"' agent-os-ui/ui/src/components/story-card.ts && echo "PASS: draggable attribute" || echo "FAIL: draggable attribute missing"

# Check drop handler in kanban-board.ts
grep -q "@drop=" agent-os-ui/ui/src/components/kanban-board.ts && echo "PASS: drop handler" || echo "FAIL: drop handler missing"

# Check dragover handler
grep -q "@dragover=" agent-os-ui/ui/src/components/kanban-board.ts && echo "PASS: dragover handler" || echo "FAIL: dragover handler missing"

# Check CSS classes exist
grep -q ".dragging" agent-os-ui/ui/src/styles/theme.css && echo "PASS: dragging CSS" || echo "FAIL: dragging CSS missing"
grep -q ".drop-zone-active" agent-os-ui/ui/src/styles/theme.css && echo "PASS: drop-zone-active CSS" || echo "FAIL: drop-zone-active CSS missing"

# Lint check
cd agent-os-ui && npm run lint && echo "PASS: Lint" || echo "FAIL: Lint errors"
```

### Story ist DONE wenn:
1. Alle Gherkin-Szenarien bestanden
2. Alle technischen Verifikationen bestanden
3. Completion Check Commands exit 0
