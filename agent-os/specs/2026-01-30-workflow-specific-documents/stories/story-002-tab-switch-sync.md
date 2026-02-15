# WSD-002: Tab-Wechsel synchronisiert Dokumente

> Status: Done
> Complexity: XS (Extra Small)
> Layer: Frontend
> Skill: `frontend-lit`

## User Story

**Als** User der zwischen Workflow-Tabs wechselt
**Möchte ich** dass die Dokument-Ansicht automatisch zum aktiven Workflow wechselt
**Damit** ich immer die relevanten Dokumente des aktuell ausgewählten Workflows sehe

## Akzeptanzkriterien (Gherkin)

```gherkin
Feature: Tab-Wechsel synchronisiert Dokumente

  Scenario: Dokumente wechseln bei Tab-Wechsel
    Given Workflow A ist aktiv mit 2 Dokumenten
    And Workflow B hat 1 Dokument
    When ich auf den Tab von Workflow B klicke
    Then zeigt der Dokument-Container das Dokument von Workflow B
    And nicht die Dokumente von Workflow A

  Scenario: Leerer Container bei Workflow ohne Dokumente
    Given Workflow A ist aktiv mit Dokumenten
    And Workflow B hat keine Dokumente
    When ich auf den Tab von Workflow B klicke
    Then ist der Dokument-Container leer
    And zeigt optional einen Hinweis "Keine Dokumente generiert"

  Scenario: Docs-Panel Status bleibt erhalten
    Given das Docs-Panel ist geöffnet
    And ich wechsle zu einem anderen Tab
    When ich zurück wechsle
    Then ist das Docs-Panel weiterhin geöffnet
```

---

## Technische Details

### WAS (Scope)
- `syncStoreState()` in `workflow-view.ts` erweitern
- Dokument-State aus aktivem Execution lesen
- Docs-Panel reaktiv auf Store-Änderungen

### WIE (Implementierung)

**1. syncStoreState() erweitern (`workflow-view.ts`):**
```typescript
private syncStoreState(): void {
  const activeExec = executionStore.getActiveExecution();
  if (activeExec) {
    // Existing workflow state sync
    this.interactiveWorkflow = { ... };

    // NEW: Sync document state from active execution
    this.generatedDocs = activeExec.generatedDocs || [];
    this.selectedDocIndex = activeExec.selectedDocIndex || 0;

    this.interactiveMode = true;
  } else {
    this.interactiveWorkflow = null;
    this.generatedDocs = [];
    this.selectedDocIndex = 0;
    this.interactiveMode = executionStore.getExecutionCount() > 0;
  }
}
```

**2. Render-Logik anpassen:**
- `renderDocsPanel()` verwendet bereits `this.generatedDocs`
- Keine Änderungen nötig - funktioniert automatisch durch `syncStoreState()`

### WO (Betroffene Dateien)

| Datei | Änderung |
|-------|----------|
| `agent-os-ui/ui/src/views/workflow-view.ts` | `syncStoreState()` erweitern |

### WER (Abhängigkeiten)
- **Benötigt**: WSD-001 (Document State per Execution)

---

## Definition of Ready (DoR)

- [x] User Story klar formuliert
- [x] Akzeptanzkriterien vollständig (Gherkin)
- [x] Technische Details dokumentiert (WAS/WIE/WO/WER)
- [x] Betroffene Dateien identifiziert
- [x] Abhängigkeit zu WSD-001 dokumentiert
- [x] Story-Größe validiert (≤5 Dateien, ≤400 LOC)

## Definition of Done (DoD)

- [x] Code implementiert gemäß technischer Spezifikation
- [x] TypeScript strict mode - keine Fehler
- [x] Lint-Fehler behoben
- [x] Manuelle Tests durchgeführt (alle Gherkin-Szenarien)
- [x] Code-Review (selbst oder Pair)

### Implementation Notes

Die ursprüngliche Spezifikation schlug vor, `this.generatedDocs` und `this.selectedDocIndex` als Component-State hinzuzufügen. Die tatsächliche WSD-001 Implementierung verwendet jedoch einen besseren Ansatz:

**Actual Implementation (direct store reads):**
- `render()` liest `generatedDocs` direkt aus `executionStore.getActiveExecution()` (Zeile 647)
- `renderDocsPanel()` liest ebenfalls direkt aus dem Store (Zeilen 786-788)
- Tab-Wechsel via `handleTabSelect()` → `executionStore.setActiveExecution()` → Re-render

**Vorteile gegenüber Component-State:**
- Single Source of Truth (Store)
- Keine Duplikation von Daten
- Automatische Synchronisation bei allen Store-Änderungen

**Alle Gherkin-Szenarien erfüllt:**
1. ✅ Dokumente wechseln bei Tab-Wechsel - Funktioniert durch direkte Store-Reads
2. ✅ Leerer Container bei Workflow ohne Dokumente - `showSplitView` wird false wenn `generatedDocs.length === 0`
3. ✅ Docs-Panel Status bleibt erhalten - `docsViewerOpen` ist Component-Level State

---

## Completion Check

```bash
# Nach Implementierung ausführen:
cd agent-os-ui/ui && npm run lint
cd agent-os-ui/ui && npm run build
```
