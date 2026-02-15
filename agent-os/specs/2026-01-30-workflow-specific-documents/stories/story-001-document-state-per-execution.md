# WSD-001: Document State per Execution

> Status: Done
> Complexity: S (Small)
> Layer: Frontend
> Skill: `frontend-lit`

## User Story

**Als** User mit mehreren parallelen Workflows
**Möchte ich** dass jeder Workflow seinen eigenen Dokument-Container hat
**Damit** ich die generierten Dokumente eines spezifischen Workflows sehen kann ohne Vermischung mit anderen Workflows

## Akzeptanzkriterien (Gherkin)

```gherkin
Feature: Document State per Execution

  Scenario: Dokumente werden execution-spezifisch gespeichert
    Given Workflow A läuft und generiert "doc-a.md"
    And Workflow B läuft und generiert "doc-b.md"
    When ich auf Tab von Workflow A klicke
    Then sehe ich nur "doc-a.md" im Dokument-Container
    And nicht "doc-b.md"

  Scenario: Neuer Workflow startet mit leerem Dokument-Container
    Given kein Workflow läuft
    When ich einen neuen Workflow starte
    Then ist der Dokument-Container initial leer
    And zeigt keine Dokumente von vorherigen Workflows

  Scenario: Dokumente bleiben beim Tab-Wechsel erhalten
    Given Workflow A hat 3 Dokumente generiert
    And ich wechsle zu Workflow B
    When ich zurück zu Workflow A wechsle
    Then sehe ich wieder alle 3 Dokumente von Workflow A
```

---

## Technische Details

### WAS (Scope)
- `ExecutionState` Interface erweitern um `generatedDocs: GeneratedDoc[]`
- `ExecutionStore` erweitern um Methoden für Dokument-Management
- `GeneratedDoc` Interface in `execution.ts` definieren

### WIE (Implementierung)

**1. Types erweitern (`execution.ts`):**
```typescript
export interface GeneratedDoc {
  path: string;
  content: string;
  timestamp: string;
}

export interface ExecutionState {
  // ... existing fields
  generatedDocs: GeneratedDoc[];
  selectedDocIndex: number;
  docsContainerWidth: number;  // für Story-004 Persistenz
}
```

**2. ExecutionStore erweitern (`execution-store.ts`):**
```typescript
addDocument(executionId: string, doc: GeneratedDoc): void
updateDocument(executionId: string, path: string, content: string): void
setSelectedDocIndex(executionId: string, index: number): void
getDocuments(executionId: string): GeneratedDoc[]
```

**3. workflow-view.ts anpassen:**
- `generatedDocs` und `selectedDocIndex` aus Component-State entfernen
- Stattdessen aus `executionStore.getActiveExecution()` lesen
- `handleWorkflowTool` aktualisieren um Dokumente im Store zu speichern

### WO (Betroffene Dateien)

| Datei | Änderung |
|-------|----------|
| `agent-os-ui/ui/src/types/execution.ts` | `GeneratedDoc` Interface, `ExecutionState` erweitern |
| `agent-os-ui/ui/src/stores/execution-store.ts` | Dokument-Management Methoden |
| `agent-os-ui/ui/src/views/workflow-view.ts` | State-Migration zu Store |

### WER (Abhängigkeiten)
- Keine externen Abhängigkeiten
- Basis für Story-002, Story-003, Story-004

---

## Definition of Ready (DoR)

- [x] User Story klar formuliert
- [x] Akzeptanzkriterien vollständig (Gherkin)
- [x] Technische Details dokumentiert (WAS/WIE/WO/WER)
- [x] Betroffene Dateien identifiziert
- [x] Keine offenen Fragen
- [x] Story-Größe validiert (≤5 Dateien, ≤400 LOC)

## Definition of Done (DoD)

- [x] Code implementiert gemäß technischer Spezifikation
- [x] TypeScript strict mode - keine Fehler
- [x] Lint-Fehler behoben
- [x] Manuelle Tests durchgeführt (alle Gherkin-Szenarien)
- [x] Code-Review (selbst oder Pair)

---

## Completion Check

```bash
# Nach Implementierung ausführen:
cd agent-os-ui/ui && npm run lint
cd agent-os-ui/ui && npm run build
```
