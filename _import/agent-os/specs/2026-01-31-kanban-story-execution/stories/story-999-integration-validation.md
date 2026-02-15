# KSE-999: Integration & End-to-End Validation

**Story ID:** KSE-999
**Title:** Integration & End-to-End Validation
**Type:** Test/Integration
**Priority:** Medium
**Effort:** S
**Status:** Done

## User Story

```gherkin
Feature: End-to-End Validierung des Kanban Story Execution Features
  Als Systemadministrator
  möchte ich dass alle Komponenten dieser Spec zusammenwirken,
  damit das Feature vollständig funktioniert.
```

## Akzeptanzkriterien (Gherkin)

```gherkin
Scenario: Vollständiger Happy Path
  Given ich bin im Kanban Board der Spec "2026-01-31-kanban-story-execution"
  And Story "KSE-001" ist im Backlog mit dorComplete = true
  And Story "KSE-001" hat keine offenen Dependencies
  When ich "KSE-001" von Backlog nach In Progress ziehe
  Then wird die Story in In Progress angezeigt
  And die Story zeigt einen Working Indikator
  And der Workflow "/execute-tasks" wurde gestartet
  And die kanban-board.md wurde aktualisiert

Scenario: Validierung bei fehlendem DoR
  Given eine Story hat dorComplete = false
  When ich versuche sie nach In Progress zu ziehen
  Then wird der Drop blockiert
  And eine Fehlermeldung erscheint

Scenario: Validierung bei offenen Dependencies
  Given Story "KSE-003" hängt von "KSE-001" ab
  And "KSE-001" ist nicht done
  When ich versuche "KSE-003" nach In Progress zu ziehen
  Then wird der Drop blockiert
  And die Fehlermeldung zeigt "KSE-001" als Blocker

Scenario: WebSocket Reconnect während Workflow
  Given eine Story zeigt Working Indikator
  And die WebSocket-Verbindung wird unterbrochen
  When die Verbindung wiederhergestellt wird
  Then zeigt die Story weiterhin den korrekten Status
```

## Business Value
Stellt sicher dass alle einzelnen Komponenten korrekt zusammenarbeiten und das Feature end-to-end funktioniert.

---

## Technisches Refinement (vom Architect)

### DoR (Definition of Ready)
- [x] Fachliche Anforderungen klar
- [x] Technischer Ansatz definiert
- [x] Abhängigkeiten identifiziert
- [x] Betroffene Komponenten bekannt
- [x] Story ist angemessen dimensioniert
- [ ] Alle vorherigen Stories sind done

### DoD (Definition of Done)
- [ ] Alle Integration Tests bestanden
- [ ] End-to-End Szenarien manuell verifiziert
- [ ] Build und Lint erfolgreich
- [ ] Keine Regressions in anderen Features

### Betroffene Layer & Komponenten

- **Integration Type:** Test/Integration

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Test | Integration Tests | E2E Validation |
| Frontend | Alle KSE Komponenten | Zusammenspiel prüfen |
| Backend | Alle KSE Handler | Zusammenspiel prüfen |

### Technische Details

**WAS:**
1. End-to-End Validierung des kompletten Drag & Drop Flows
2. Validierung der Pre-Drag Checks (DoR, Dependencies)
3. Validierung des Workflow-Triggers bei Backlog -> In Progress
4. Validierung der Working Indicator Anzeige
5. WebSocket Reconnect Szenario testen
6. Build, Lint und Unit Tests ausführen

**WIE (Architecture Guidance):**
- **Manuelle E2E Tests:** Alle Gherkin-Szenarien dieser Spec durchspielen
- **Automatisierte Checks:** Build, Lint, Unit Tests müssen bestehen
- **WebSocket Reconnect:** Browser DevTools Network Tab nutzen um Verbindung zu unterbrechen
- **Keine neuen Dateien:** Nur Validierung der implementierten Features

**WO:**
- Keine neuen Dateien - nur Validierung
- Testumgebung: Lokaler Dev-Server (`npm run dev`)
- Browser: Chrome DevTools für WebSocket Testing

**WER:** dev-team__frontend-developer (Selbst-Validierung nach Implementation)

**Abhängigkeiten:** KSE-001, KSE-002, KSE-003, KSE-004

**Geschätzte Komplexität:** S

**Relevante Skills:**
| Skill | Pfad | Grund |
|-------|------|-------|
| quality-gates | .claude/skills/quality-gates/SKILL.md | Quality Validation |
| frontend-lit | .claude/skills/frontend-lit/SKILL.md | Frontend Testing |
| backend-express/testing | .claude/skills/backend-express/testing.md | Backend Testing |

### Technische Verifikation

| Check | Type | Details |
|-------|------|---------|
| LINT_PASS | Frontend + Backend | Keine Lint-Fehler |
| BUILD_PASS | Full Build | npm run build erfolgreich |
| TESTS_PASS | Unit Tests | npm test erfolgreich |
| E2E | Happy Path | Story von Backlog nach In Progress ziehen |
| E2E | Blocked DoR | Story mit offenem DoR kann nicht gestartet werden |
| E2E | Blocked Deps | Story mit offenen Dependencies wird blockiert |
| E2E | Working Indicator | Pulsierender Indikator erscheint bei Workflow |
| E2E | WebSocket Reconnect | Status bleibt nach Reconnect erhalten |

### Completion Check
```bash
# Build and Lint
cd agent-os-ui && npm run build && echo "PASS: Build" || echo "FAIL: Build"
cd agent-os-ui && npm run lint && echo "PASS: Lint" || echo "FAIL: Lint"

# Unit Tests
cd agent-os-ui && npm test && echo "PASS: Tests" || echo "FAIL: Tests"

# Check all KSE stories are implemented
echo "=== KSE-001 Checks ==="
grep -q 'draggable="true"' agent-os-ui/ui/src/components/story-card.ts && echo "PASS: Draggable" || echo "FAIL"
grep -q "@drop=" agent-os-ui/ui/src/components/kanban-board.ts && echo "PASS: Drop handler" || echo "FAIL"

echo "=== KSE-002 Checks ==="
grep -q "dorComplete" agent-os-ui/ui/src/components/kanban-board.ts && echo "PASS: DoR check" || echo "FAIL"
grep -q ".drop-zone-blocked" agent-os-ui/ui/src/styles/theme.css && echo "PASS: Blocked CSS" || echo "FAIL"

echo "=== KSE-003 Checks ==="
grep -q "workflow.story.start" agent-os-ui/ui/src/components/kanban-board.ts && echo "PASS: Workflow trigger" || echo "FAIL"
grep -q "workflow.story.start" agent-os-ui/src/server/websocket.ts && echo "PASS: Backend handler" || echo "FAIL"

echo "=== KSE-004 Checks ==="
grep -q "status-working" agent-os-ui/ui/src/components/story-status-badge.ts && echo "PASS: Working status" || echo "FAIL"
grep -q ".status-working" agent-os-ui/ui/src/styles/theme.css && echo "PASS: Working CSS" || echo "FAIL"

echo ""
echo "Manual E2E validation required - see Gherkin scenarios in each story file"
```

### Story ist DONE wenn:
1. Alle vorherigen Stories sind done
2. Build und Lint erfolgreich
3. Unit Tests bestanden
4. Manuelle E2E Szenarien bestanden
