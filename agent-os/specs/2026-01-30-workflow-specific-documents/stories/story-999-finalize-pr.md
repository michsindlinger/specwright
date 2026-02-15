# WSD-999: Finalize PR

> Status: Done
> Complexity: S (Small)
> Type: System/Finalization
> Layer: DevOps
> Skill: `git-workflow`

## User Story

**Als** Developer
**Möchte ich** dass nach erfolgreicher Validierung automatisch ein PR erstellt wird
**Damit** das Feature bereit für das Merge in den main Branch ist

## Akzeptanzkriterien (Gherkin)

```gherkin
Feature: Finalize PR

  Scenario: Test-Szenarien werden dokumentiert
    Given Code Review und Integration Validation sind bestanden
    When Finalize PR startet
    Then werden alle Test-Szenarien in einer Checkliste dokumentiert
    And die Checkliste enthält Gherkin-Szenarien aus allen Stories

  Scenario: User-Todos werden erstellt
    Given es gibt offene Punkte für den User
    When der PR erstellt wird
    Then werden User-Todos klar aufgelistet
    And jedes Todo hat eine Beschreibung und erwartetes Ergebnis

  Scenario: PR wird erstellt
    Given alle Validierungen sind bestanden
    And alle Commits sind gepusht
    When der PR erstellt wird
    Then hat der PR einen aussagekräftigen Titel
    And der PR-Body enthält:
      - Feature-Zusammenfassung
      - Geänderte Dateien
      - Test-Szenarien Checkliste
      - Screenshots (falls relevant)

  Scenario: Worktree Cleanup (optional)
    Given das Feature wurde in einem Worktree entwickelt
    When der User bestätigt
    Then wird der Worktree aufgeräumt
    And der Feature-Branch bleibt für den PR erhalten
```

---

## Technische Details

### WAS (Scope)
- Test-Szenarien aus allen Stories sammeln
- User-Todos erstellen
- PR via `gh pr create` erstellen
- Optional: Worktree Cleanup

### WIE (Implementierung)

**1. Test-Szenarien sammeln:**
- Alle Gherkin-Szenarien aus WSD-001 bis WSD-004 extrahieren
- Als Markdown-Checkliste formatieren

**2. PR erstellen:**
```bash
gh pr create \
  --title "feat(workflow): Workflow-Specific Documents" \
  --body "$(cat <<'EOF'
## Summary
- Dokumente werden pro Execution im ExecutionStore gespeichert
- Tab-Wechsel synchronisiert automatisch die Dokument-Ansicht
- Container ist resizable (200px - 60%)
- Größe wird pro Workflow persistent gespeichert

## Changed Files
- `execution.ts` - GeneratedDoc Interface, ExecutionState erweitert
- `execution-store.ts` - Dokument-Management Methoden
- `workflow-view.ts` - State-Migration, Resize-Handler
- `theme.css` - Resize-Styles

## Test Scenarios
- [ ] Workflow A + B mit separaten Dokumenten → isolierte Anzeige
- [ ] Tab-Wechsel → korrekte Dokumente angezeigt
- [ ] Resize → Panel vergrößern/verkleinern funktioniert
- [ ] Page Reload → Größe bleibt erhalten

## Screenshots
[Screenshots hier einfügen]

🤖 Generated with Agent OS
EOF
)"
```

**3. Worktree Cleanup (optional):**
```bash
# Falls in Worktree:
cd .. && git worktree remove <worktree-path>
```

### WO (Betroffene Dateien)

| Datei | Änderung |
|-------|----------|
| `agent-os/specs/[spec-name]/implementation-reports/finalization-report.md` | Erstellt |
| GitHub PR | Erstellt |

### WER (Ausführender)
- **Agent:** Orchestrator / git-workflow
- **User:** Bestätigt PR-Erstellung, führt optional Worktree-Cleanup durch

### Abhängigkeiten
- **Benötigt:** WSD-998 (Integration Validation bestanden)
- **Blockiert:** Nichts (letzter Schritt)

---

## Definition of Ready (DoR)

- [x] User Story klar formuliert
- [x] Akzeptanzkriterien vollständig (Gherkin)
- [x] PR-Template definiert
- [x] Abhängigkeiten dokumentiert

## Definition of Done (DoD)

- [x] Test-Szenarien dokumentiert
- [x] User-Todos erstellt (falls vorhanden) - None required
- [x] PR erfolgreich erstellt
- [x] PR-URL dem User mitgeteilt
- [x] Optional: Worktree aufgeräumt - N/A (branch strategy used)

---

## Completion Check

```bash
# PR-Status prüfen:
gh pr list --head $(git branch --show-current) && echo "✓ PR existiert"
```

---

## PR-Template

```markdown
## Summary
Dieses Feature macht den Dokument-Container in der Workflow-Ausführungsansicht
workflow-spezifisch. Dokumente werden pro Execution isoliert und der Container
ist resizable.

## Changes
- **ExecutionState erweitert** - generatedDocs, selectedDocIndex, docsContainerWidth
- **ExecutionStore erweitert** - Dokument-Management Methoden
- **workflow-view.ts** - State-Migration zu Store, Resize-Handler
- **theme.css** - CSS Variables und Resize-Styles

## Test Checklist
- [ ] Dokumente sind pro Workflow isoliert
- [ ] Tab-Wechsel zeigt korrekte Dokumente
- [ ] Resize funktioniert (200px - 60% Viewport)
- [ ] Größe bleibt nach Page Reload erhalten
- [ ] Terminal-Integration funktioniert weiterhin

## Screenshots
<!-- Screenshots hier einfügen -->

---
🤖 Generated with Agent OS /execute-tasks
```
