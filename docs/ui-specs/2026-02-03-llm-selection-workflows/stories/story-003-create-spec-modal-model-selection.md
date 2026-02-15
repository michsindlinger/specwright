# Story LLM-003: Create Spec Modal Model Selection

**Spec:** LLM (LLM Model Selection for Workflows)  
**Created:** 2026-02-03  
**Status:** Done  
**Complexity:** Medium  
**Phase:** 3  
**Dependencies:** LLM-001  

---

## User Story (Fachlich)

**Als** Benutzer  
**möchte ich** im "Create Spec" Modal ein Model-Selection Komponente sehen  
**damit** ich beim Erstellen einer neuen Spec das gewünschte LLM-Modell auswählen kann.

---

## Gherkin Szenarien

### Szenario 1: Neue Spec erstellen mit Modellauswahl
```gherkin
Given der Benutzer ist auf der Specs Dashboard Seite
When der Benutzer "+ Neues Spec" klickt
Then öffnet sich das "Create Spec" Modal
And das Modal zeigt die Model-Selection Komponente an
When der Benutzer "Sonnet" auswählt
And die Spec-Daten ausfüllt
And "Create Spec" klickt
Then wird der Workflow mit model="sonnet" gestartet
```

### Szenario 2: Standardmodell ist Opus
```gherkin
Given das "Create Spec" Modal öffnet sich
When der Benutzer noch kein Modell ausgewählt hat
Then ist "Opus" als Standardmodell ausgewählt
```

### Szenario 3: Model-Selection während Ausführung disabled
```gherkin
Given der "Create Spec" Workflow läuft bereits
When der Benutzer das Modal betrachtet
Then ist die Model-Selection Komponente disabled
```

---

## Definition of Ready (DoR)

- [x] LLM-001 (Backend Integration) ist completed
- [x] `aos-create-spec-modal` Komponente existiert und ist verstanden
- [x] `aos-model-selector` Komponente ist verfügbar und verstanden
- [x] Story ist in Bezug auf Technical Details vom Architekten verifiziert

---

## Definition of Done (DoD)

- [x] `aos-create-spec-modal` hat `selectedModel` state
- [x] `aos-model-selector` Komponente ist in das Modal integriert (native select with optgroup)
- [x] Model-Selection ist in `handleStart()` integriert
- [x] Model-Selection ist disabled wenn workflow läuft
- [x] Default-Modell ist 'opus'
- [x] TypeScript Compile: Keine Errors
- [x] Linting: Keine Errors
- [x] Styling: Consistent mit Chat-UX (via theme.css)

---

## Technical Details

### WAS (Was wird implementiert?)
Model-Selector im "Create Spec" Modal für Model-Selection.

### WIE (Wie wird es implementiert?)

**Pattern: `aos-model-selector` Komponente (Custom Dropdown)**

**Datei: `agent-os-ui/ui/src/components/aos-create-spec-modal.ts`**

1. State und Component Import:
```typescript
import '../model-selector.js';

@state()
selectedModel: string = 'opus';
```

2. Render Model-Selector:
```typescript
private renderModelSelector() {
  return html`
    <div class="form-field">
      <label>LLM Model</label>
      <aos-model-selector
        .selectedModel=${this.selectedModel}
        ?disabled=${this.isWorkflowRunning}
        @model-selected=${(e: CustomEvent) => this.selectedModel = e.detail.model}
      ></aos-model-selector>
    </div>
  `;
}
```

3. In `handleStart()` integrieren:
```typescript
private handleStart() {
  // ... bestehende Argument-Logik ...

  this.dispatchEvent(
    new CustomEvent('workflow-start-interactive', {
      detail: {
        commandId: cmd.id,
        argument,
        model: this.selectedModel  // NEU: Model Parameter
      },
      bubbles: true,
      composed: true
    })
  );
  this.open = false;
}
```

**Datei: `agent-os-ui/ui/src/views/dashboard-view.ts`**

Model-Parameter wird automatisch durch das Event-Bubbling an workflow-view.ts weitergeleitet (siehe LLM-002 für Details).

### WO (Wo wird es implementiert?)
- `agent-os-ui/ui/src/components/aos-create-spec-modal.ts` - Model Selector UI und Event-Integration
- `agent-os-ui/ui/src/views/workflow-view.ts` - Gateway Message (via handleStartInteractiveWorkflow aus LLM-002)

### WER (Wer macht was?)
- Frontend-Entwickler (Lit) implementiert die Integration

### Dependencies
- LLM-001 muss completed sein
- `aos-model-selector` Komponente muss importiert werden
- Gateway Message Format mit model Parameter

### Aufwandsschätzung
- 2 Dateien zu ändern
- ~20-30 Zeilen Code
- Medium Complexity (Komponenten-Integration)

---

## Notes

**UX-Pattern:**
- `aos-model-selector` ist eine voll-featured Custom Component
- Gleiche UX wie im Chat
- Provider-Gruppierung, Loading States, Fallback

**Referenz-Implementation:**
- Chat Interface verwendet bereits `aos-model-selector`

**Integration:**
- Event-basierte Kommunikation mit `@model-selected` Event
- Disabled State während Workflow-Ausführung

**Nächste Story:** LLM-004 (Context Menu Model Selection)
