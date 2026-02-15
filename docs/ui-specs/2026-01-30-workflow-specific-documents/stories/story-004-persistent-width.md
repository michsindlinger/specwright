# WSD-004: Persistente Container-Größe pro Workflow

> Status: Done
> Complexity: S (Small)
> Layer: Frontend
> Skill: `frontend-lit`

## User Story

**Als** User mit individuellen Größen-Präferenzen pro Workflow
**Möchte ich** dass die Größe pro Workflow gespeichert wird
**Damit** ich beim Tab-Wechsel meine bevorzugte Größe wiederfinde und nicht jedes Mal neu anpassen muss

## Akzeptanzkriterien (Gherkin)

```gherkin
Feature: Persistente Container-Größe pro Workflow

  Scenario: Größe wird beim Resize gespeichert
    Given Workflow A ist aktiv
    And der Dokument-Container hat 350px Breite
    When ich den Container auf 500px vergrößere
    Then wird die Größe 500px für Workflow A gespeichert

  Scenario: Größe wird beim Tab-Wechsel wiederhergestellt
    Given Workflow A hat Container-Größe 500px
    And Workflow B hat Container-Größe 300px
    When ich von Workflow A zu Workflow B wechsle
    Then hat der Dokument-Container 300px Breite
    When ich zurück zu Workflow A wechsle
    Then hat der Dokument-Container wieder 500px Breite

  Scenario: Default-Größe für neue Workflows
    Given kein gespeicherter Wert für einen Workflow existiert
    When ich einen neuen Workflow starte
    Then hat der Dokument-Container die Default-Größe (350px)

  Scenario: Größe bleibt nach Page-Reload erhalten
    Given Workflow A hat Container-Größe 450px
    When ich die Seite neu lade
    And Workflow A wieder starte
    Then hat der Dokument-Container wieder 450px Breite
```

---

## Technische Details

### WAS (Scope)
- Container-Breite in `ExecutionState` speichern
- Bei Tab-Wechsel Breite aus Store laden
- LocalStorage für Session-übergreifende Persistenz
- Default-Wert wenn keine Größe gespeichert

### WIE (Implementierung)

**1. ExecutionStore erweitern (`execution-store.ts`):**
```typescript
setDocsContainerWidth(executionId: string, width: number): void {
  const execution = this.executions.get(executionId);
  if (!execution) return;

  const updated: ExecutionState = {
    ...execution,
    docsContainerWidth: width
  };

  this.executions.set(executionId, updated);

  // Persist to localStorage keyed by commandId
  this.persistWidth(execution.commandId, width);

  this.emit({
    type: 'execution-updated',
    executionId,
    execution: updated
  });
}

private persistWidth(commandId: string, width: number): void {
  const key = `aos-docs-width-${commandId}`;
  localStorage.setItem(key, String(width));
}

getPersistedWidth(commandId: string): number | null {
  const key = `aos-docs-width-${commandId}`;
  const stored = localStorage.getItem(key);
  return stored ? parseInt(stored, 10) : null;
}
```

**2. addExecution erweitern (`execution-store.ts`):**
```typescript
addExecution(executionId: string, commandId: string, commandName: string): ExecutionState {
  // Load persisted width or use default
  const persistedWidth = this.getPersistedWidth(commandId);

  const execution: ExecutionState = {
    executionId,
    commandId,
    commandName,
    status: 'starting',
    messages: [],
    startedAt: new Date().toISOString(),
    generatedDocs: [],
    selectedDocIndex: 0,
    docsContainerWidth: persistedWidth || 350  // Default 350px
  };

  // ... rest of method
}
```

**3. syncStoreState() erweitern (`workflow-view.ts`):**
```typescript
private syncStoreState(): void {
  const activeExec = executionStore.getActiveExecution();
  if (activeExec) {
    // ... existing sync

    // Sync docs container width
    this.docsPanelWidth = activeExec.docsContainerWidth || 350;
  }
}
```

**4. Resize-Handler speichern (`workflow-view.ts`):**
```typescript
private handleResizeEnd(): void {
  const activeExecId = executionStore.getActiveExecutionId();
  if (activeExecId) {
    executionStore.setDocsContainerWidth(activeExecId, this.docsPanelWidth);
  }
}
```

### WO (Betroffene Dateien)

| Datei | Änderung |
|-------|----------|
| `agent-os-ui/ui/src/types/execution.ts` | `docsContainerWidth` zu `ExecutionState` |
| `agent-os-ui/ui/src/stores/execution-store.ts` | Persistenz-Methoden, LocalStorage |
| `agent-os-ui/ui/src/views/workflow-view.ts` | Width-Sync, Resize-Handler Update |

### WER (Abhängigkeiten)
- **Benötigt**: WSD-001 (Document State per Execution)
- **Benötigt**: WSD-003 (Resizable Container)

---

## Definition of Ready (DoR)

- [x] User Story klar formuliert
- [x] Akzeptanzkriterien vollständig (Gherkin)
- [x] Technische Details dokumentiert (WAS/WIE/WO/WER)
- [x] Betroffene Dateien identifiziert
- [x] Persistenz-Strategie definiert (LocalStorage by commandId)
- [x] Story-Größe validiert (≤5 Dateien, ≤400 LOC)

## Definition of Done (DoD)

- [x] Code implementiert gemäß technischer Spezifikation
- [x] TypeScript strict mode - keine Fehler
- [x] Lint-Fehler behoben
- [x] Manuelle Tests durchgeführt (alle Gherkin-Szenarien)
- [x] LocalStorage-Persistenz getestet (Page Reload)
- [x] Code-Review (selbst oder Pair)

---

## Completion Check

```bash
# Nach Implementierung ausführen:
cd agent-os-ui/ui && npm run lint
cd agent-os-ui/ui && npm run build
```
