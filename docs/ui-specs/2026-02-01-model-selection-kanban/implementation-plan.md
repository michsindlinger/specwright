# Implementation Plan: Model Selection for Kanban Board

**Spec:** 2026-02-01-model-selection-kanban
**Created:** 2026-02-01
**Updated:** 2026-02-02
**Status:** APPROVED (nach Review)

---

## Executive Summary

Ermöglicht Model-Auswahl (Opus/Sonnet/Haiku) pro Story im Kanban Board mit Persistierung im Markdown und Integration in den Workflow-Executor.

**WICHTIG:** Durch die bereits implementierte `2026-02-02-chat-model-selection` Spec können signifikante Komponenten wiederverwendet werden.

---

## Wiederverwendung aus Chat-Model-Selection

Die Chat-Spec hat folgende Komponenten implementiert, die für diese Spec relevant sind:

| Komponente | Pfad | Wiederverwendbar für |
|------------|------|---------------------|
| `aos-model-selector` | `ui/src/components/model-selector.ts` | **Teilweise** - UI-Konzept, aber andere Integration nötig |
| `model-config.ts` | `src/server/model-config.ts` | **Ja** - Provider/Model-Liste |
| `model-config.json` | `config/model-config.json` | **Ja** - Model-Definitionen |
| Gateway Events | `ui/src/gateway.ts` | **Nein** - Chat-spezifisch |
| CLI-Routing | `src/server/claude-handler.ts` | **Teilweise** - Logik wiederverwendbar |

### Impact auf Stories

| Story | Original Scope | Nach Wiederverwendung |
|-------|---------------|----------------------|
| MSK-001 | Neues Dropdown bauen | **Reduziert:** Einfaches `<select>` in Story-Card, kein separates Component |
| MSK-002 | Model-Spalte parsen | **Unverändert:** Kanban-spezifisch |
| MSK-003 | Workflow-Executor | **Reduziert:** Kann `getModelCliFlag()` aus model-config.ts nutzen |
| MSK-004 | Integration Test | **Unverändert:** Test-Protokoll |

---

## Architektur-Entscheidungen

### 1. Inline Dropdown vs. Separate Component

**Entscheidung:** Inline `<select>` in `story-card.ts` statt separater Komponente

**Begründung:**
- `aos-model-selector` ist für Chat optimiert (Header-Integration, Session-State)
- Story-Card braucht einfaches Dropdown ohne Provider-Gruppierung
- Weniger Overhead, direktere Integration
- Model-Liste kann aus `model-config.ts` kommen

### 2. Model-Persistenz

**Entscheidung:** Model als Spalte in Kanban-Board Markdown

**Format:**
```markdown
| Story ID | Title | ... | Model |
|----------|-------|-----|-------|
| MSK-001  | ...   | ... | opus  |
```

### 3. CLI-Integration

**Entscheidung:** Wiederverwendung der CLI-Logik aus Chat-Spec

```typescript
// Aus model-config.ts importieren
import { getProviderCommand, getModelCliFlag } from './model-config';

// Im workflow-executor.ts nutzen
const cliFlag = getModelCliFlag(model); // z.B. '--model opus'
```

---

## Komponenten-Übersicht

### Neue Komponenten

| Komponente | Typ | Story |
|------------|-----|-------|
| Keine neuen Komponenten - nur Erweiterungen | - | - |

### Zu ändernde Komponenten

| Komponente | Pfad | Änderung | Story |
|------------|------|----------|-------|
| StoryCard | `ui/src/components/story-card.ts` | Model-Dropdown hinzufügen | MSK-001 |
| SpecsReader | `src/server/specs-reader.ts` | Model-Spalte parsen/schreiben | MSK-002 |
| BacklogReader | `src/server/backlog-reader.ts` | Model-Spalte parsen | MSK-002 |
| WebSocket | `src/server/websocket.ts` | updateModel Handler | MSK-002 |
| WorkflowExecutor | `src/server/workflow-executor.ts` | --model Flag übergeben | MSK-003 |

---

## Komponenten-Verbindungen

| Source | Target | Verbindungsart | Zuständige Story |
|--------|--------|----------------|------------------|
| story-card.ts | kanban-board.ts | Event: `story-model-change` | MSK-001 |
| kanban-board.ts | websocket.ts | WebSocket: `specs.story.updateModel` | MSK-001 |
| websocket.ts | specs-reader.ts | Method: `updateStoryModel()` | MSK-002 |
| workflow-executor.ts | model-config.ts | Import: `getModelCliFlag()` | MSK-003 |
| workflow-executor.ts | specs-reader.ts | Method: `getKanbanBoard()` | MSK-003 |

**Verbindungs-Validierung:**
```bash
# MSK-001: Event Emission
grep -q "story-model-change" ui/src/components/story-card.ts

# MSK-001→002: WebSocket Message
grep -q "specs.story.updateModel" src/server/websocket.ts

# MSK-002: Persistence Method
grep -q "updateStoryModel" src/server/specs-reader.ts

# MSK-003: Model Config Import
grep -q "getModelCliFlag\|model-config" src/server/workflow-executor.ts
```

---

## Umsetzungsphasen

### Phase 1: Frontend (MSK-001)
- Story-Card um Model-Dropdown erweitern
- Event-Emission an Kanban-Board
- Kann parallel zu Phase 2

### Phase 2: Backend Persistenz (MSK-002)
- Kanban Markdown Parser erweitern
- WebSocket Handler für Model-Update
- Kann parallel zu Phase 1

### Phase 3: Workflow Integration (MSK-003)
- **Abhängig von Phase 2**
- Model aus Kanban lesen
- CLI-Flag an Claude Code übergeben
- Wiederverwendung von `model-config.ts`

### Phase 4: Validierung (MSK-004 + System Stories)
- Manuelle Integration Tests
- Automatisierte Validation

---

## Risiken & Mitigationen

| Risiko | Impact | Mitigation |
|--------|--------|------------|
| model-config.ts hat andere Struktur als erwartet | Medium | Prüfen in MSK-003, ggf. Adapter |
| Legacy Kanban ohne Model-Spalte | Low | Default 'opus' implementiert |
| Concurrent Model-Updates | Low | Letzer Write gewinnt (OK für Use-Case) |

---

## Self-Review Ergebnisse

### Vollständigkeit
✅ Alle Anforderungen aus requirements-clarification.md abgedeckt
✅ Wiederverwendungs-Potenzial analysiert
✅ Alle Stories haben klare Abgrenzung

### Konsistenz
✅ Architektur-Entscheidungen passen zusammen
✅ Inline-Dropdown statt Komponente ist konsistent mit Simplizität

### Komponenten-Verbindungen
✅ Jede Komponente hat mindestens eine Verbindung
✅ Alle Verbindungen haben zuständige Story
✅ Validierungsbefehle definiert

### Alternativen bewertet
- ❌ `aos-model-selector` wiederverwenden → Zu Chat-spezifisch
- ✅ Inline-Dropdown → Simpler, passender

---

## Minimalinvasiv-Optimierungen

### Durchgeführte Optimierungen

| Optimierung | Begründung | Feature preserved? |
|-------------|------------|-------------------|
| Inline statt Component | Weniger Code, schneller | ✅ Ja |
| model-config.ts Import | Code-Wiederverwendung | ✅ Ja |
| Kein neuer Gateway-Event | WebSocket direkt nutzen | ✅ Ja |

### Feature-Preservation Checkliste
- [x] Alle Requirements aus Clarification sind abgedeckt
- [x] Kein Feature wurde geopfert
- [x] Alle Akzeptanzkriterien bleiben erfüllbar

---

*Erstellt mit Agent OS /create-spec v3.1*
