# Story MSK-002: Kanban Markdown Model Column

## Story Info

| Field | Value |
|-------|-------|
| **ID** | MSK-002 |
| **Title** | Kanban Markdown Model Column |
| **Type** | Backend |
| **Priority** | High |
| **Effort** | S |
| **Dependencies** | - |
| **Status** | Done |

## User Story

**Als** System,
**möchte ich** die Model-Auswahl im Kanban-Board Markdown speichern und lesen können,
**damit** die Auswahl persistent ist und nach Page-Reload wiederhergestellt wird.

## Acceptance Criteria (Gherkin)

### AC-1: Model-Spalte parsen (Specs)

```gherkin
Given ein Kanban-Board Markdown mit Model-Spalte
When das Board geladen wird
Then enthält jede StoryInfo das Feld "model"
And der Wert entspricht dem Wert aus der Model-Spalte
```

### AC-2: Model-Spalte parsen (Backlog)

```gherkin
Given ein Backlog-Kanban Markdown mit Model-Spalte
When das Board geladen wird
Then enthält jede BacklogStoryInfo das Feld "model"
And der Wert entspricht dem Wert aus der Model-Spalte
```

### AC-3: Default bei fehlender Spalte

```gherkin
Given ein Kanban-Board Markdown ohne Model-Spalte (Legacy)
When das Board geladen wird
Then erhalten alle Stories den Default-Wert "opus"
```

### AC-4: Model-Update persistieren

```gherkin
Given ein WebSocket Message "specs.story.updateModel"
When der Message enthält specId, storyId und model
Then wird die Model-Spalte im Kanban Markdown aktualisiert
And die Änderung wird sofort gespeichert
```

### AC-5: Valide Model-Werte

```gherkin
Given ein Model-Update Request
When der Model-Wert nicht "opus", "sonnet" oder "haiku" ist
Then wird der Request abgelehnt
And eine Fehlermeldung wird zurückgegeben
```

---

## Technical Sections (Architect fills)

### Definition of Ready (DoR)

- [x] User Story ist klar formuliert
- [x] Acceptance Criteria sind vollständig
- [x] Dependencies sind identifiziert
- [x] Technische Approach ist definiert
- [x] Betroffene Dateien sind identifiziert

### Definition of Done (DoD)

- [x] Code implementiert alle Acceptance Criteria
- [x] Code folgt Projekt-Coding-Standards (TypeScript strict, Node.js patterns)
- [x] Lint-Errors sind behoben (`npm run lint` erfolgreich)
- [x] Parser liest Model-Spalte korrekt aus Kanban Markdown
- [x] WebSocket Handler persistiert Model-Updates korrekt

### WAS (Fachliche Anforderung)

Die Backend-Reader werden erweitert um die Model-Spalte zu verarbeiten:
- **Parsen**: Neue "Model" Spalte in Kanban-Board Tabellen lesen
- **Default**: "opus" als Fallback wenn Spalte fehlt (Legacy-Support)
- **Persistieren**: WebSocket Message `specs.story.updateModel` zum Speichern
- **Validierung**: Nur "opus", "sonnet", "haiku" als gültige Werte akzeptieren

Kanban-Board Markdown Format (Backlog Tabelle):
```markdown
| Story ID | Title | Type | Priority | Effort | Dependencies | Status | Model |
|----------|-------|------|----------|--------|--------------|--------|-------|
| MSK-001  | ...   | ...  | ...      | ...    | ...          | Ready  | opus  |
```

### WIE (Technischer Ansatz)

1. **StoryInfo Interface erweitern** (`specs-reader.ts`):
   ```typescript
   export type ModelSelection = 'opus' | 'sonnet' | 'haiku';

   export interface StoryInfo {
     // ... existing fields
     model: ModelSelection;  // Required, default 'opus'
   }
   ```

2. **parseKanbanStatuses erweitern** um Model-Spalte:
   ```typescript
   private parseKanbanStatuses(kanbanContent: string): Map<string, {
     status: 'backlog' | 'in_progress' | 'done';
     model: ModelSelection;
   }> {
     // Parse table rows and extract Model column (8th column if present)
     // Pattern: | StoryID | Title | Type | Priority | Effort | Deps | Status | Model |
     const rowPattern = /\|\s*([A-Z0-9]+-\d+)\s*\|[^|]*\|[^|]*\|[^|]*\|[^|]*\|[^|]*\|[^|]*\|([^|]*)\|/g;
     // Extract model value, default to 'opus'
   }
   ```

3. **generateKanbanBoardMarkdown erweitern**:
   - Model-Spalte in Header hinzufügen
   - Default "opus" für neue Stories

4. **WebSocket Handler** (`websocket.ts`):
   ```typescript
   case 'specs.story.updateModel':
     this.handleSpecsStoryUpdateModel(client, message);
     break;

   private async handleSpecsStoryUpdateModel(
     client: WebSocketClient,
     message: WebSocketMessage
   ): Promise<void> {
     const model = message.model as string;

     // Validierung
     const validModels = ['opus', 'sonnet', 'haiku'];
     if (!validModels.includes(model)) {
       // Send error response
       return;
     }

     await this.specsReader.updateStoryModel(
       currentProject.path, specId, storyId, model
     );
   }
   ```

5. **updateStoryModel Methode** (`specs-reader.ts`):
   ```typescript
   async updateStoryModel(
     projectPath: string,
     specId: string,
     storyId: string,
     model: ModelSelection
   ): Promise<void> {
     // Read kanban, find story row, update Model column, write back
   }
   ```

6. **BacklogReader anpassen** (`backlog-reader.ts`):
   - BacklogStoryInfo Interface um `model` erweitern
   - parseKanbanStatuses analog erweitern

### WO (Betroffene Dateien)

| Datei | Änderung |
|-------|----------|
| `agent-os-ui/src/server/specs-reader.ts` | ModelSelection type, StoryInfo.model, parseKanbanStatuses, generateKanbanBoardMarkdown, updateStoryModel |
| `agent-os-ui/src/server/backlog-reader.ts` | BacklogStoryInfo.model, parseKanbanStatuses erweitern |
| `agent-os-ui/src/server/websocket.ts` | handleSpecsStoryUpdateModel Handler |

### WER (Zuständige Skills)

- `backend-express` - Node.js/Express Backend Entwicklung

### Completion Check

```bash
# TypeScript kompiliert ohne Fehler
cd agent-os-ui && npm run build

# Lint erfolgreich
cd agent-os-ui && npm run lint

# Prüfen dass StoryInfo.model existiert
grep -n "model.*ModelSelection" agent-os-ui/src/server/specs-reader.ts

# Prüfen dass WebSocket Handler existiert
grep -n "specs.story.updateModel" agent-os-ui/src/server/websocket.ts

# Prüfen dass updateStoryModel existiert
grep -n "updateStoryModel" agent-os-ui/src/server/specs-reader.ts

# Prüfen dass BacklogStoryInfo.model existiert
grep -n "model" agent-os-ui/src/server/backlog-reader.ts
```
