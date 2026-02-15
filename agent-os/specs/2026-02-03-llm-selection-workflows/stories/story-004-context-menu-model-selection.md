# Story LLM-004: Context Menu Model Selection

**Spec:** LLM (LLM Model Selection for Workflows)
**Created:** 2026-02-03
**Status:** Done
**Complexity:** Medium
**Phase:** 4
**Dependencies:** LLM-001  

---

## User Story (Fachlich)

**Als** Benutzer  
**möchte ich** im Workflow Modal (ausgelöst via Kontextmenü) ein Model-Selection Komponente sehen  
**damit** ich bei allen Kontextmenü-Actions (Neue Spec, Bug, TODO, Story zu Spec) das gewünschte LLM-Modell auswählen kann.

---

## Gherkin Szenarien

### Szenario 1: "Neue Spec erstellen" mit Modellauswahl
```gherkin
Given der Benutzer右-klickt auf ein Element im Kontextmenü
When der Benutzer "Neue Spec erstellen" auswählt
Then öffnet sich das Workflow Modal
And das Modal zeigt die Model-Selection Komponente an
When der Benutzer "Haiku" auswählt
And die Spec-Daten ausfüllt
And "Start" klickt
Then wird der Workflow mit model="haiku" gestartet
```

### Szenario 2: "Bug erstellen" mit Modellauswahl
```gherkin
Given der Benutzer右-klickt und "Bug erstellen" auswählt
Then öffnet sich das Workflow Modal
And das Modal zeigt die Model-Selection Komponente an
When der Benutzer "Sonnet" auswählt
And "Start" klickt
Then wird der Bug-Workflow mit model="sonnet" gestartet
```

### Szenario 3: "TODO erstellen" mit Modellauswahl
```gherkin
Given der Benutzer右-klickt und "TODO erstellen" auswählt
Then öffnet sich das Workflow Modal
And das Modal zeigt die Model-Selection Komponente an
When der Benutzer ein Modell auswählt
Then wird der TODO-Workflow mit dem gewählten Modell gestartet
```

### Szenario 4: "Story zu Spec hinzufügen" mit Modellauswahl
```gherkin
Given der Benutzer右-klickt und "Story zu Spec hinzufügen" auswählt
Then öffnet sich das Workflow Modal
And das Modal zeigt die Model-Selection Komponente an
When der Benutzer ein Modell auswählt
Then wird der Workflow mit dem gewählten Modell gestartet
```

### Szenario 5: Standardmodell ist Opus
```gherkin
Given das Workflow Modal aus dem Kontextmenü öffnet sich
When der Benutzer noch kein Modell ausgewählt hat
Then ist "Opus" als Standardmodell ausgewählt
```

---

## Definition of Ready (DoR)

- [x] LLM-001 (Backend Integration) ist completed
- [x] `aos-workflow-modal` Komponente existiert und ist verstanden
- [x] `aos-model-selector` Komponente ist verfügbar und verstanden
- [x] Alle 4 Kontextmenü-Actions sind identifiziert
- [x] Story ist in Bezug auf Technical Details vom Architekten verifiziert

---

## Definition of Done (DoD)

- [x] `aos-workflow-modal` hat `selectedModel` state
- [x] `aos-model-selector` Komponente ist in das Modal integriert
- [x] Model-Selection funktioniert für alle 4 Kontextmenü-Actions
- [x] Model-Selection ist disabled wenn workflow läuft
- [x] Default-Modell ist 'opus'
- [x] TypeScript Compile: Keine Errors
- [x] Linting: Keine Errors
- [x] Styling: Consistent mit Create Spec Modal

---

## Technical Details

### WAS (Was wird implementiert?)
Model-Selector im `aos-create-spec-modal` für alle Kontextmenü-Workflow-Actions (Wiederverwendung der bestehenden Komponente).

### WIE (Wie wird es implementiert?)

**Pattern: `aos-model-selector` Komponente (gleich wie LLM-003)**

**Hinweis:** Die `aos-create-spec-modal` Komponente wird bereits für alle Kontextmenü-Workflow-Actions wiederverwendet. Daher muss LLM-003 nur erweitert werden, um alle Modi vollständig zu unterstützen.

**Datei: `agent-os-ui/ui/src/components/aos-create-spec-modal.ts`**

1. State und Component Import (bereits in LLM-003 definiert):
```typescript
import '../model-selector.js';

@state()
selectedModel: string = 'opus';
```

2. Render Model-Selector (bereits in LLM-003 definiert):
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

3. In `handleStart()` integrieren (bereits in LLM-003 definiert - wird automatisch für alle Kontextmenü-Actions angewendet):
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

**Kontextmenü-Actions (4 Stück):**
Alle Actions nutzen bereits die `aos-create-spec-modal` Komponente mit unterschiedlichem `mode` Property:
1. "Neue Spec erstellen" → mode: 'direct', command: 'agent-os:create-spec'
2. "Bug erstellen" → mode: 'direct', command: 'agent-os:create-bug'
3. "TODO erstellen" → mode: 'direct', command: 'agent-os:create-todo'
4. "Story zu Spec hinzufügen" → mode: 'add-story', command: 'agent-os:add-story'

**Datei: `agent-os-ui/ui/src/views/workflow-view.ts`**
- Model Parameter an Backend weiterleiten (bereits in LLM-002 implementiert)

### WO (Wo wird es implementiert?)
- `agent-os-ui/ui/src/components/aos-create-spec-modal.ts` - Model Selector UI (bereits in LLM-003 implementiert)
- `agent-os-ui/ui/src/views/workflow-view.ts` - Gateway Message (bereits in LLM-002 implementiert)

**WICHTIG:** Diese Story ist im Wesentlichen durch LLM-003 abgedeckt, da `aos-create-spec-modal` bereits für alle Kontextmenü-Actions wiederverwendet wird. Die Story dient hauptsächlich als Dokumentation, dass alle 4 Kontextmenü-Actions durch LLM-003 automatisch abgedeckt sind.

### WER (Wer macht was?)
- Frontend-Entwickler (Lit) implementiert die Integration

### Dependencies
- LLM-001 muss completed sein
- LLM-003 muss completed sein (Implementation in `aos-create-spec-modal`)
- `aos-model-selector` Komponente muss importiert werden (bereits in LLM-003)

### Aufwandsschätzung
- 0-1 Dateien zu ändern (wenn Anpassungen nötig sind)
- ~0-10 Zeilen Code
- Low Complexity (Wiederverwendung von LLM-003 Code)

**Hinweis:** Da `aos-create-spec-modal` bereits für alle Kontextmenü-Actions verwendet wird, ist der Aufwand minimal. Die Model-Selection aus LLM-003 funktioniert automatisch für alle 4 Actions.

---

## Notes

**Architektur-WICHTIG:**
- `aos-create-spec-modal` ist bereits die Universal-Komponente für alle Workflow-Modals
- Alle 4 Kontextmenü-Actions nutzen diese Komponente mit unterschiedlichem `mode` Property
- Daher reicht die Implementierung in LLM-003, um alle Kontextmenü-Actions abzudecken
- Diese Story existiert hauptsächlich für Dokumentationszwecke und um sicherzustellen, dass alle 4 Actions getestet werden

**UX-Pattern:**
- Gleiche `aos-model-selector` Komponente wie in LLM-003
- Consistent UX über alle Modals

**Kontextmenü-Actions:**
- Alle 4 Actions nutzen das gleiche `aos-create-spec-modal`
- Model-Selection ist universell für alle Workflow-Typen

**Integration:**
- Event-basierte Kommunikation mit `@model-selected` Event
- Workflow-Type wird über `mode` Property bestimmt ('direct' oder 'add-story')

**Feature Complete:**
- Nach LLM-003 (mit Dokumentation in LLM-004) ist die Feature vollständig implementiert
- Alle 3 Trigger-Points (Workflow Dashboard, Context Menu, Specs Dashboard) haben Model-Selection

---

**Letzte Implementation Story des Specs!** 🎉
