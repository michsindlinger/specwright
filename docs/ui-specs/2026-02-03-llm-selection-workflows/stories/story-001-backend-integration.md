# Story LLM-001: Backend Integration

**Spec:** LLM (LLM Model Selection for Workflows)  
**Created:** 2026-02-03  
**Status:** Done  
**Complexity:** Low  
**Phase:** 1  

---

## User Story (Fachlich)

**Als** Entwickler  
**möchte ich** dass das Backend einen optionalen `model` Parameter beim Starten von Workflows akzeptiert  
**damit** workflows mit dynamischen Modellen (Opus, Sonnet, Haiku, GLM) anstelle von hardcodetem Opus ausgeführt werden können.

---

## Gherkin Szenarien

### Szenario 1: Workflow mit ausgewähltem Modell starten
```gherkin
Given ein Benutzer wählt "Sonnet" im Frontend aus
When der Benutzer den Workflow startet
Then sendet das Frontend eine "workflow.interactive.start" Message mit model="sonnet"
And der Backend extrahiert den model Parameter aus der Message
And der Backend verwendet getCliCommandForModel("sonnet") für den CLI Befehl
And die CLI führt den Workflow mit Sonnet aus
```

### Szenario 2: Workflow ohne Modellauswahl starten (Default)
```gherkin
Given ein Benutzer wählt kein Modell im Frontend aus
When der Benutzer den Workflow startet
Then sendet das Frontend eine "workflow.interactive.start" Message ohne model Parameter
And der Backend verwendet den Standardwert "opus"
And die CLI führt den Workflow mit Opus aus
```

### Szenario 3: Workflow mit ungültigem Modell
```gherkin
Given ein Frontend sendet eine Message mit model="ungueltiges_modell"
When der Backend die Message verarbeitet
Then validiert der Backend das Modell
Or verwendet den Standardwert "opus" bei ungültigen Werten
```

---

## Definition of Ready (DoR)

- [ ] WebSocketMessage Interface hat `model?: string` Feld
- [ ] `getCliCommandForModel()` Funktion existiert und ist getestet
- [ ] Alle Dependencies sind klar definiert
- [ ] Story ist in Bezug auf Technical Details vom Architekten verifiziert

---

## Definition of Done (DoD)

- [x] WebSocketMessage Interface um `model?: string` erweitert
- [x] `startInteractiveWorkflow()` extrahiert model aus message.data
- [x] `WorkflowExecution` Interface hat `model?: string` Feld
- [x] `runExecution()` verwendet `getCliCommandForModel(model ?? 'opus')`
- [x] Hardcodetes `--model opus` auf Zeile 492 ist entfernt
- [x] TypeScript Compile: Keine Errors
- [x] Linting: Keine Errors
- [x] Bestehende Tests: Grün

---

## Technical Details

### WAS (Was wird implementiert?)
Erweiterung des Backend um Model-Parameter Support für Workflow-Execution.

### WIE (Wie wird es implementiert?)

**Datei: `agent-os-ui/src/server/types.ts`**
```typescript
export interface WebSocketMessage {
  type: string;
  data?: any;
  model?: string;  // NEU: Optionaler Model-Parameter
}
```

**Datei: `agent-os-ui/src/server/websocket.ts`**

1. `handleWorkflowInteractiveStart()` erweitern um Model-Parameter Extraktion:
```typescript
private handleWorkflowInteractiveStart(client: WebSocketClient, message: WebSocketMessage): void {
  const commandId = message.commandId as string;
  const argument = message.argument as string | undefined;
  const model = message.model as string | undefined;  // NEU: Model-Parameter aus Message

  // ... validation code ...

  const executionId = await this.workflowExecutor.startExecution(
    client,
    commandId,
    projectPath,
    argument ? { argument } : undefined,
    model  // NEU: Model-Parameter an startExecution übergeben
  );
}
```

**Datei: `agent-os-ui/src/server/workflow-executor.ts`**

1. `startExecution()` Signatur erweitern:
```typescript
async startExecution(
  client: WebSocketClient,
  commandId: string,
  projectPath: string,
  options?: { argument?: string; model?: string }  // NEU: model option
): Promise<string> {
  // ...
  const execution: WorkflowExecution = {
    id: executionId,
    commandId,
    status: 'starting',
    model: options?.model || 'opus',  // NEU: Model in Execution speichern
    // ...
  };
}
```

2. `WorkflowExecution` Interface erweitern:
```typescript
interface WorkflowExecution {
  id: string;
  commandId: string;
  status: string;
  model?: string;  // NEU
  // ...
}
```

3. Zeile 492 in `startExecution()` ersetzen:
```typescript
// ALT (entfernen):
const claudeCommand = `claude-anthropic-simple --model opus --dangerously-skip-permissions "${fullCommand}"\n`;

// NEU:
const cliConfig = getCliCommandForModel(execution.model || 'opus');
const claudeCommand = `${cliConfig.command} ${cliConfig.args.join(' ')} --dangerously-skip-permissions "${fullCommand}"\n`;
```

### WO (Wo wird es implementiert?)
- `agent-os-ui/src/server/types.ts` - WebSocketMessage Interface um `model?: string` erweitern
- `agent-os-ui/src/server/websocket.ts` - `handleWorkflowInteractiveStart()` um Model-Extraction erweitern
- `agent-os-ui/src/server/workflow-executor.ts` - `startExecution()`, WorkflowExecution Interface, Zeile 492 ersetzen

### WER (Wer macht was?)
- Backend-Entwickler implementiert die Änderungen
- Test-Runner verifiziert Bestehende Tests bleiben grün

### Dependencies
- `getCliCommandForModel()` Funktion existiert bereits in `model-config.ts` (Zeile 268)
- `runClaudeCommand()` zeigt das Pattern für die CLI-Konstruktion (Zeilen 721-737)

### Aufwandsschätzung
- 3 Dateien zu ändern (types.ts, websocket.ts, workflow-executor.ts)
- ~20-30 Zeilen Code
- Low Complexity (Pattern-Application von bestehendem runClaudeCommand Code)

---

## Notes

**Referenz-Implementation:**
- `runClaudeCommand()` Zeilen 721-737 in workflow-executor.ts zeigt bereits die getCliCommandForModel()-Verwendung
- Das gleiche Pattern wird in `startExecution()` für Workflows angewendet (Zeile 492)

**Backward Compatibility:**
- `model` Parameter ist optional (`model?: string`)
- Default Wert ist 'opus' (behält bestehendes Verhalten bei)

**Nächste Story:** LLM-002 (Workflow Card Model Selection)
