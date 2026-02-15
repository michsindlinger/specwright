# Story MSK-001: Model Dropdown Component

## Story Info

| Field | Value |
|-------|-------|
| **ID** | MSK-001 |
| **Title** | Model Dropdown Component |
| **Type** | Frontend |
| **Priority** | High |
| **Effort** | S |
| **Dependencies** | - |
| **Status** | Done |

## User Story

**Als** Entwickler der mit Agent OS arbeitet,
**möchte ich** auf jeder Story-Card ein Dropdown zur Model-Auswahl sehen,
**damit ich** das passende Claude-Modell (Opus, Sonnet, Haiku) für die Story-Implementierung wählen kann.

## Acceptance Criteria (Gherkin)

### AC-1: Dropdown ist sichtbar

```gherkin
Given ich bin auf dem Kanban Board (Spec oder Backlog)
When ich eine Story-Card betrachte
Then sehe ich ein Model-Dropdown direkt auf der Card
And das Dropdown zeigt das aktuell gewählte Modell an
```

### AC-2: Dropdown Optionen

```gherkin
Given ich sehe eine Story-Card mit Model-Dropdown
When ich das Dropdown öffne
Then sehe ich drei Optionen: "Opus", "Sonnet", "Haiku"
And die aktuelle Auswahl ist markiert
```

### AC-3: Default-Wert

```gherkin
Given eine Story ohne gespeicherte Model-Auswahl
When die Story-Card gerendert wird
Then ist "Opus" als Default vorausgewählt
```

### AC-4: Model-Änderung Event

```gherkin
Given ich sehe eine Story-Card mit Model-Dropdown
When ich ein anderes Modell auswähle
Then wird ein "story-model-change" Event emittiert
And das Event enthält storyId und das neue model
```

### AC-5: Deaktivierung bei laufender Story

```gherkin
Given eine Story mit Status "in_progress"
When ich die Story-Card betrachte
Then ist das Model-Dropdown deaktiviert (disabled)
And ein Tooltip erklärt "Model kann während Ausführung nicht geändert werden"
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
- [x] Code folgt Projekt-Coding-Standards (Lit Web Components, TypeScript strict)
- [x] Lint-Errors sind behoben (`npm run lint` erfolgreich)
- [x] Komponente rendert korrekt im Kanban Board
- [x] Event wird korrekt emittiert und im Parent verarbeitet

### WAS (Fachliche Anforderung)

Die `aos-story-card` Komponente wird um ein Model-Dropdown erweitert:
- **Dropdown-Element**: Native `<select>` mit den Optionen "Opus", "Sonnet", "Haiku"
- **Default-Wert**: "opus" wenn kein Model in StoryInfo vorhanden
- **Event**: `story-model-change` CustomEvent mit `{ storyId, model }` Detail
- **Disabled-State**: Bei `status === 'in_progress'` ist das Dropdown deaktiviert
- **Tooltip**: Bei deaktiviertem Dropdown erscheint ein Titel-Attribut mit Erklärung

### WIE (Technischer Ansatz)

1. **StoryInfo Interface erweitern** (`story-card.ts` + `kanban-board.ts`):
   ```typescript
   export type ModelSelection = 'opus' | 'sonnet' | 'haiku';

   export interface StoryInfo {
     // ... existing fields
     model?: ModelSelection;  // Optional, default 'opus'
   }
   ```

2. **Dropdown in render() einfügen** (nach story-dor-status):
   ```typescript
   <div class="story-model-select">
     <select
       class="model-dropdown"
       .value=${this.story.model || 'opus'}
       ?disabled=${this.story.status === 'in_progress'}
       title=${this.story.status === 'in_progress'
         ? 'Model kann während Ausführung nicht geändert werden'
         : ''}
       @change=${this.handleModelChange}
       @click=${(e: Event) => e.stopPropagation()}
     >
       <option value="opus">Opus</option>
       <option value="sonnet">Sonnet</option>
       <option value="haiku">Haiku</option>
     </select>
   </div>
   ```

3. **Event Handler implementieren**:
   ```typescript
   private handleModelChange(e: Event): void {
     e.stopPropagation();  // Prevent card click
     const select = e.target as HTMLSelectElement;
     this.dispatchEvent(
       new CustomEvent('story-model-change', {
         detail: {
           storyId: this.story.id,
           model: select.value as ModelSelection
         },
         bubbles: true,
         composed: true
       })
     );
   }
   ```

4. **CSS-Styling** (theme.css):
   ```css
   .model-dropdown {
     background: var(--bg-secondary);
     color: var(--text-primary);
     border: 1px solid var(--border-color);
     border-radius: 4px;
     padding: 2px 6px;
     font-size: 0.75rem;
     cursor: pointer;
   }

   .model-dropdown:disabled {
     opacity: 0.5;
     cursor: not-allowed;
   }
   ```

### WO (Betroffene Dateien)

| Datei | Änderung |
|-------|----------|
| `agent-os-ui/ui/src/components/story-card.ts` | ModelSelection type, model property in StoryInfo, Dropdown HTML, Event Handler |
| `agent-os-ui/ui/src/components/kanban-board.ts` | StoryInfo Interface synchronisieren, Event Listener für story-model-change |
| `agent-os-ui/ui/src/styles/theme.css` | CSS für .model-dropdown |

### WER (Zuständige Skills)

- `frontend-lit` - Lit Web Component Entwicklung

### Completion Check

```bash
# TypeScript kompiliert ohne Fehler
cd agent-os-ui && npm run build

# Lint erfolgreich
cd agent-os-ui && npm run lint

# Prüfen dass StoryInfo.model existiert
grep -n "model.*ModelSelection" agent-os-ui/ui/src/components/story-card.ts

# Prüfen dass Event emittiert wird
grep -n "story-model-change" agent-os-ui/ui/src/components/story-card.ts

# Prüfen dass CSS existiert
grep -n "model-dropdown" agent-os-ui/ui/src/styles/theme.css
```
