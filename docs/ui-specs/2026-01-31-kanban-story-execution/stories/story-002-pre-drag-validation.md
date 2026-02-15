# KSE-002: Pre-Drag Validation

**Story ID:** KSE-002
**Title:** Pre-Drag Validation
**Type:** Frontend
**Priority:** High
**Effort:** S
**Status:** Done

## User Story

```gherkin
Feature: Validierung vor dem Drop
  Als Entwickler
  möchte ich dass Stories ohne DoR oder mit offenen Dependencies nicht gestartet werden können,
  damit ich keine fehlerhaften Workflows starte.
```

## Akzeptanzkriterien (Gherkin)

```gherkin
Scenario: Story ohne vollständige DoR wird blockiert
  Given ich bin im Kanban Board
  And eine Story hat dorComplete = false
  When ich diese Story zur "In Progress" Spalte ziehe
  Then wird die Drop-Zone rot/blockiert angezeigt
  And beim Drop erscheint eine Fehlermeldung "Story kann nicht gestartet werden: DoR nicht vollständig"
  And die Story bleibt in der Backlog-Spalte

Scenario: Story mit offenen Dependencies wird blockiert
  Given ich bin im Kanban Board
  And Story "KSE-003" hängt von "KSE-001" ab
  And "KSE-001" ist noch nicht "done"
  When ich "KSE-003" zur "In Progress" Spalte ziehe
  Then wird die Drop-Zone blockiert angezeigt
  And beim Drop erscheint eine Fehlermeldung "Abhängige Stories noch nicht abgeschlossen: KSE-001"
  And die Story bleibt in der Backlog-Spalte

Scenario: Story mit erfüllten Voraussetzungen ist erlaubt
  Given ich bin im Kanban Board
  And eine Story hat dorComplete = true
  And alle Dependencies sind "done"
  When ich diese Story zur "In Progress" Spalte ziehe
  Then wird die Drop-Zone grün/akzeptierend angezeigt
  And der Drop wird akzeptiert

Scenario: Toast Notification bei Blockierung
  Given ein Drop wurde blockiert
  Then erscheint ein Toast mit der Fehlermeldung
  And der Toast verschwindet nach 5 Sekunden automatisch
```

## Business Value
Verhindert dass Entwickler versehentlich Stories starten, die nicht bereit sind. Spart Zeit durch frühe Fehlererkennung.

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
| Frontend | kanban-board.ts | Validation Logic im Drop Handler |
| Frontend | toast-notification.ts | Error Messages |
| Frontend | theme.css | Blocked Drop Zone Styles |

### Technische Details

**WAS:**
1. Validation-Logic im Drop-Handler prüft dorComplete und Dependencies
2. Visuelle Unterscheidung: Grüne Drop-Zone (erlaubt) vs. Rote Drop-Zone (blockiert)
3. Toast-Notification bei blockiertem Drop mit spezifischer Fehlermeldung
4. Dependencies-Check: Prüfen ob alle abhängigen Stories Status "done" haben
5. Prevention: e.preventDefault() nur bei validen Drops ausführen

**WIE (Architecture Guidance):**
- **Validation-Funktion erstellen:** `canMoveToInProgress(story: StoryInfo, allStories: StoryInfo[]): { valid: boolean; reason?: string }`
- **Im dragover Event:** Validation durchführen, CSS-Klasse basierend auf Ergebnis setzen
- **Toast-Pattern verwenden:** Existierende `aos-toast-notification` Komponente nutzen
- **Dependencies-Resolution:** Stories-Array iterieren, um Status der abhängigen Stories zu prüfen
- **Bestehende StoryInfo Interface nutzen:** `dorComplete: boolean` und `dependencies: string[]` bereits vorhanden

**WO:**
- `agent-os-ui/ui/src/components/kanban-board.ts` - Validation Logic + Conditional Drop Prevention
- `agent-os-ui/ui/src/styles/theme.css` - .drop-zone-blocked Styles (rot), .drop-zone-valid Styles (grün)
- `agent-os-ui/ui/src/views/dashboard-view.ts` - Toast-Notification Integration (falls noch nicht vorhanden)

**WER:** dev-team__frontend-developer

**Abhängigkeiten:** KSE-001

**Geschätzte Komplexität:** S

**Relevante Skills:**
| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | .claude/skills/frontend-lit/SKILL.md | Lit Web Components Patterns |
| frontend-lit/state-management | .claude/skills/frontend-lit/state-management.md | State Management for Stories |
| domain-agent-os-web-ui | .claude/skills/domain-agent-os-web-ui/SKILL.md | Story/Kanban Domain Knowledge |

### Technische Verifikation

| Check | Type | Details |
|-------|------|---------|
| FILE_EXISTS | agent-os-ui/ui/src/components/kanban-board.ts | Modified with validation |
| CONTAINS | kanban-board.ts | `canMoveToInProgress` oder validation function |
| CONTAINS | kanban-board.ts | `dorComplete` check |
| CONTAINS | kanban-board.ts | `dependencies` check |
| CONTAINS | theme.css | `.drop-zone-blocked` |
| CONTAINS | theme.css | `.drop-zone-valid` |
| CONTAINS | kanban-board.ts | Toast oder error message dispatch |
| LINT_PASS | Frontend | npm run lint (no errors) |

### Completion Check
```bash
# Check validation logic exists
grep -q "dorComplete" agent-os-ui/ui/src/components/kanban-board.ts && echo "PASS: dorComplete check" || echo "FAIL: dorComplete check missing"

# Check dependencies validation
grep -q "dependencies" agent-os-ui/ui/src/components/kanban-board.ts && echo "PASS: dependencies check" || echo "FAIL: dependencies check missing"

# Check blocked drop zone CSS
grep -q ".drop-zone-blocked" agent-os-ui/ui/src/styles/theme.css && echo "PASS: blocked CSS" || echo "FAIL: blocked CSS missing"

# Check valid drop zone CSS
grep -q ".drop-zone-valid" agent-os-ui/ui/src/styles/theme.css && echo "PASS: valid CSS" || echo "FAIL: valid CSS missing"

# Check for toast/error handling
grep -qE "(toast|error|CustomEvent.*error)" agent-os-ui/ui/src/components/kanban-board.ts && echo "PASS: error handling" || echo "FAIL: error handling missing"

# Lint check
cd agent-os-ui && npm run lint && echo "PASS: Lint" || echo "FAIL: Lint errors"
```

### Story ist DONE wenn:
1. Alle Gherkin-Szenarien bestanden
2. Alle technischen Verifikationen bestanden
3. Completion Check Commands exit 0
