# Story MSK-004: Integration Testing

## Story Info

| Field | Value |
|-------|-------|
| **ID** | MSK-004 |
| **Title** | Integration Testing |
| **Type** | Full-stack |
| **Priority** | Medium |
| **Effort** | XS |
| **Dependencies** | MSK-001, MSK-002, MSK-003 |

## User Story

**Als** Entwickler,
**möchte ich** sicherstellen dass die Model-Auswahl End-to-End funktioniert,
**damit** ich confident bin dass das Feature in Produktion korrekt arbeitet.

## Acceptance Criteria (Gherkin)

### AC-1: E2E Flow - Spec Story

```gherkin
Given ich bin auf einem Spec Kanban Board
When ich das Model einer Story auf "haiku" ändere
And die Seite neu lade
Then ist "haiku" immer noch ausgewählt
And das Kanban Markdown enthält "haiku" in der Model-Spalte
```

### AC-2: E2E Flow - Backlog Story

```gherkin
Given ich bin auf dem Backlog Kanban Board
When ich das Model einer Story auf "sonnet" ändere
And die Seite neu lade
Then ist "sonnet" immer noch ausgewählt
And das Backlog Kanban Markdown enthält "sonnet" in der Model-Spalte
```

### AC-3: Workflow mit gewähltem Model

```gherkin
Given eine Story mit model="haiku"
When ich die Story nach "In Progress" ziehe
And der Workflow startet
Then enthält der Claude Code Aufruf "--model haiku"
```

### AC-4: Disabled State während Ausführung

```gherkin
Given eine Story in Status "in_progress"
When ich versuche das Model-Dropdown zu öffnen
Then ist das Dropdown deaktiviert
And ich kann das Model nicht ändern
```

---

## Technical Sections (Architect fills)

### Definition of Ready (DoR)

- [x] User Story ist klar formuliert
- [x] Acceptance Criteria sind vollständig
- [x] Dependencies sind identifiziert (MSK-001, MSK-002, MSK-003)
- [x] Technische Approach ist definiert
- [x] Betroffene Dateien sind identifiziert

### Definition of Done (DoD)

- [x] Manuelle Tests aller 4 Acceptance Criteria durchgeführt
- [x] Test-Protokoll in implementation-reports/ dokumentiert
- [x] Keine kritischen Bugs gefunden (oder dokumentiert und gefixt)
- [x] Kanban Markdown wird korrekt aktualisiert bei Model-Änderung

### WAS (Fachliche Anforderung)

Manuelle Integration-Tests zur Verifizierung des gesamten Model-Selection Features:

1. **E2E Flow Spec Story**: Model ändern -> Page Reload -> Model bleibt erhalten
2. **E2E Flow Backlog Story**: Analog für Backlog Kanban
3. **Workflow mit Model**: Story starten -> --model Flag im Log sichtbar
4. **Disabled State**: Story in Progress -> Dropdown deaktiviert

### WIE (Technischer Ansatz)

**Test-Protokoll Vorlage** (zu erstellen in `implementation-reports/`):

```markdown
# MSK-004 Integration Test Protocol

## Test Environment
- Date: YYYY-MM-DD
- Tester: [Name]
- Browser: [Browser/Version]
- Backend Running: [Yes/No]

## Test Results

### AC-1: E2E Flow - Spec Story
| Step | Action | Expected | Actual | Pass/Fail |
|------|--------|----------|--------|-----------|
| 1 | Open Spec Kanban Board | Board loads | | |
| 2 | Locate Story Card with Dropdown | Dropdown visible, shows "Opus" | | |
| 3 | Change Model to "Haiku" | Dropdown updates | | |
| 4 | Reload Page (F5) | | | |
| 5 | Check Story Card | "Haiku" still selected | | |
| 6 | Check kanban-board.md | Model column shows "haiku" | | |

### AC-2: E2E Flow - Backlog Story
| Step | Action | Expected | Actual | Pass/Fail |
|------|--------|----------|--------|-----------|
| 1 | Navigate to Backlog | Backlog Kanban loads | | |
| 2 | Locate Story Card | Dropdown visible | | |
| 3 | Change Model to "Sonnet" | Dropdown updates | | |
| 4 | Reload Page | | | |
| 5 | Check Story Card | "Sonnet" still selected | | |
| 6 | Check kanban markdown | Model column shows "sonnet" | | |

### AC-3: Workflow with Model
| Step | Action | Expected | Actual | Pass/Fail |
|------|--------|----------|--------|-----------|
| 1 | Set Story Model to "Haiku" | Model saved | | |
| 2 | Drag Story to In Progress | Workflow starts | | |
| 3 | Check Server Console | Log shows "--model haiku" | | |
| 4 | Check workflow.story.start.ack | Contains model: "haiku" | | |

### AC-4: Disabled State during Execution
| Step | Action | Expected | Actual | Pass/Fail |
|------|--------|----------|--------|-----------|
| 1 | Start Story Execution | Story in "In Progress" | | |
| 2 | Hover over Model Dropdown | Tooltip appears | | |
| 3 | Click Model Dropdown | Dropdown does NOT open | | |
| 4 | Inspect Dropdown | disabled attribute present | | |

## Issues Found
| Issue | Severity | Status |
|-------|----------|--------|
| - | - | - |

## Overall Result
[ ] PASS - All tests passed
[ ] FAIL - Critical issues found (list above)
```

**Manuelle Test-Schritte**:

1. **Server starten**: `cd agent-os-ui && npm run dev`
2. **UI öffnen**: `http://localhost:3000`
3. **Projekt wählen**: Agent OS Web UI Projekt
4. **Tests durchführen**: Gemäss Protokoll oben
5. **Ergebnisse dokumentieren**: In `implementation-reports/msk-004-test-protocol.md`

### WO (Betroffene Dateien)

| Datei | Änderung |
|-------|----------|
| `agent-os/specs/2026-02-01-model-selection-kanban/implementation-reports/msk-004-test-protocol.md` | Neues Test-Protokoll erstellen |

### WER (Zuständige Skills)

- `frontend-lit` - UI Testing
- `backend-express` - Backend Log Verifikation

### Completion Check

```bash
# Prüfen dass Test-Protokoll existiert
ls -la agent-os/specs/2026-02-01-model-selection-kanban/implementation-reports/

# Prüfen dass alle Tests dokumentiert sind
grep -c "Pass/Fail" agent-os/specs/2026-02-01-model-selection-kanban/implementation-reports/msk-004-test-protocol.md

# Prüfen dass Overall Result ausgefüllt ist
grep "Overall Result" agent-os/specs/2026-02-01-model-selection-kanban/implementation-reports/msk-004-test-protocol.md
```
