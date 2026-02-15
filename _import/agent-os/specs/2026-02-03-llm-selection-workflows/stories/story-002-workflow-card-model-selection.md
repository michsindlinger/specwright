# Story LLM-002: Workflow Card Model Selection

**Spec:** LLM (LLM Model Selection for Workflows)  
**Created:** 2026-02-03  
**Status:** Done  
**Complexity:** Medium  
**Phase:** 2  
**Dependencies:** LLM-001  

---

## User Story (Fachlich)

**Als** Benutzer  
**möchte ich** auf der Workflow-Card im Workflows Dashboard ein Dropdown zur Modellauswahl sehen  
**damit** ich vor dem Starten des Workflows das gewünschte LLM-Modell auswählen kann (z.B. Haiku für schnellere/ billigere Ausführung).

---

## Gherkin Szenarien

### Szenario 1: Modell auswählen und Workflow starten
```gherkin
Given der Benutzer ist auf der Workflows Dashboard Seite
And die Workflow-Card zeigt das Model-Dropdown an
When der Benutzer "Sonnet" im Dropdown auswählt
And der Benutzer "Start Workflow" klickt
Then wird ein "workflow-start-interactive" Event mit model="sonnet" gefeuert
And das Dropdown wird disabled während der Ausführung
```

### Szenario 2: Standardmodell ist Opus
```gherkin
Given der Benutzer eine Workflow-Card betrachtet
When der Benutzer noch kein Modell ausgewählt hat
Then ist "Opus" als Standardmodell ausgewählt
```

### Szenario 3: Dropdown ist disabled während Ausführung
```gherkin
Given ein Workflow läuft bereits (status: "in_progress")
When der Benutzer die Workflow-Card betrachtet
Then ist das Model-Dropdown disabled
And der Benutzer kann das Modell nicht ändern
```

### Szenario 4: Provider-Gruppierung im Dropdown
```gherkin
Given das Model-Dropdown ist geladen
When der Benutzer das Dropdown öffnet
Then werden Modelle nach Provider gruppiert angezeigt
And "Anthropic" Gruppe enthält Opus, Sonnet, Haiku
And "GLM" Gruppe enthält 4.7, 4.5 Air
```

---

## Definition of Ready (DoR)

- [ ] LLM-001 (Backend Integration) ist completed
- [ ] `aos-workflow-card` Komponente existiert und ist verstanden
- [ ] `aos-story-card` Referenz-Implementation ist analysiert (Zeilen 201-219)
- [ ] `workflow-card.ts` Event-Handling ist verstanden
- [ ] Story ist in Bezug auf Technical Details vom Architekten verifiziert

---

## Definition of Done (DoD)

- [x] `aos-workflow-card` hat `providers` property
- [x] `aos-workflow-card` hat `selectedModel` state
- [x] Native `<select>` Element ist gerendert (mit Provider-Gruppierung)
- [x] Model-Auswahl ist in `workflow-start-interactive` Event integriert
- [x] Dropdown ist disabled wenn `disabled` prop gesetzt (parent-controlled)
- [x] Default-Modell ist 'opus'
- [x] TypeScript Compile: Keine Errors
- [x] Linting: Keine Errors
- [x] Styling: Dark Theme mit CSS Custom Properties (uses existing .model-dropdown styles)

---

## Technical Details

### WAS (Was wird implementiert?)
Model-Selection Dropdown auf Workflow-Cards im Workflows Dashboard.

### WIE (Wie wird es implementiert?)

**Pattern: Native `<select>` (wie `aos-story-card` Zeilen 201-219)**

**Datei: `agent-os-ui/ui/src/components/aos-workflow-card.ts`**

1. Properties und State:
```typescript
@property({ type: Array })
providers!: Provider[];

@state()
selectedModel: string = 'opus';
```

2. Render Model-Select:
```typescript
private renderModelSelect() {
  return html`
    <div class="workflow-model-select">
      <select 
        class="model-dropdown" 
        .value=${this.selectedModel}
        ?disabled=${this.workflow?.status === 'in_progress'}
        @change=${this.handleModelChange}
      >
        ${this.providers.map(provider => html`
          <optgroup label="${provider.name}">
            ${provider.models.map(model => html`
              <option value="${model.id}" ?selected=${this.selectedModel === model.id}>
                ${model.name}
              </option>
            `)}
          </optgroup>
        `)}
      </select>
    </div>
  `;
}
```

3. Event Handler:
```typescript
private handleModelChange(e: Event) {
  const select = e.target as HTMLSelectElement;
  this.selectedModel = select.value;
}

private handleStartWithArgument(e: Event) {
  e.stopPropagation();
  const value = this.initialArgument || this.argumentValue;
  this.startInteractiveWorkflow(value, this.selectedModel);  // NEU: Model übergeben
}

private startInteractiveWorkflow(argument?: string, model?: string): void {  // NEU: Model Parameter
  this.dispatchEvent(
    new CustomEvent('workflow-start-interactive', {
      detail: {
        commandId: this.command.id,
        argument: argument?.trim() || undefined,
        model: model || 'opus'  // NEU: Model Parameter
      },
      bubbles: true,
      composed: true
    })
  );

  // Reset state
  this.showArgumentInput = false;
  this.argumentValue = '';
}
```

**Datei: `agent-os-ui/ui/src/views/workflow-view.ts`**

1. `handleStartInteractiveWorkflow()` erweitern:
```typescript
private handleStartInteractiveWorkflow(e: CustomEvent): void {
  // ... bestehende Checks ...

  const { commandId, argument, model } = e.detail;  // NEU: model extrahieren
  gateway.send({
    type: 'workflow.interactive.start',
    commandId,
    argument,
    model  // NEU: Model an Backend senden
  });
}
```

### WO (Wo wird es implementiert?)
- `agent-os-ui/ui/src/components/workflow-card.ts` - Model Dropdown UI (CustomElement: aos-workflow-card)
- `agent-os-ui/ui/src/views/workflow-view.ts` - Event Handler (model Parameter an Gateway senden)

### WER (Wer macht was?)
- Frontend-Entwickler (Lit) implementiert die UI-Komponente
- Styling mit CSS Custom Properties für Dark Theme

### Dependencies
- LLM-001 muss completed sein (Backend muss model Parameter akzeptieren)
- `story-card.ts` als Referenz (Zeilen 201-219 für native select Pattern)
- Provider-Loading via Gateway (bestehend)

### Aufwandsschätzung
- 2 Dateien zu ändern (workflow-card.ts, workflow-view.ts)
- ~30-40 Zeilen Code
- Medium Complexity (State Management, Event Handling)

---

## Notes

**UX-Pattern:**
- Native `<select>` ist lightweight und accessible
- Provider-Gruppierung mit `<optgroup>`
- Disabled während Ausführung (wie bei Story Cards)

**Referenz-Implementation:**
- `aos-story-card.ts` Zeilen 201-219 zeigt exakt das gleiche Pattern

**Styling:**
- CSS Custom Properties für Dark Theme
- Consistent mit Story Card Styling

**Nächste Story:** LLM-003 (Create Spec Modal Model Selection)
