# Workflow Executor Model Integration

> Story ID: MSK-003
> Spec: Model Selection for Kanban Board
> Created: 2026-02-01
> Last Updated: 2026-02-02

**Priority**: High
**Type**: Backend
**Estimated Effort**: S
**Dependencies**: MSK-002

---

## Feature

```gherkin
Feature: Model an Workflow-Executor übergeben
  Als Workflow-System,
  möchte ich das gewählte Model beim Start einer Story-Implementierung verwenden,
  damit Claude Code mit dem korrekten Model (Opus, Sonnet, Haiku) ausgeführt wird.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Model aus Kanban lesen

```gherkin
Scenario: Model bei Workflow-Start lesen
  Given eine Story wird zur Ausführung gestartet
  When der Workflow-Executor die Story-Daten lädt
  Then liest er das "model" Feld aus den Story-Informationen
```

### Szenario 2: Model an Claude Code übergeben

```gherkin
Scenario: --model Flag an CLI übergeben
  Given eine Story mit model="sonnet"
  When der Claude Code Prozess gestartet wird
  Then enthält der Aufruf das Flag "--model sonnet"
```

### Szenario 3: Default-Model

```gherkin
Scenario: Opus als Default verwenden
  Given eine Story ohne model-Wert (undefined)
  When der Workflow-Executor startet
  Then wird "opus" als Default verwendet
  And der Aufruf enthält "--model opus"
```

### Szenario 4: Model-Mapping

```gherkin
Scenario: Korrekte Model-Werte mappen
  Given die verfügbaren Model-Werte
  When der Workflow-Executor das Model mappt
  Then werden folgende Werte unterstützt:
    | UI Value | CLI Flag         |
    | opus     | --model opus     |
    | sonnet   | --model sonnet   |
    | haiku    | --model haiku    |
```

### Szenario 5: Workflow-Start Message erweitert

```gherkin
Scenario: Model in ACK-Response enthalten
  Given ein "workflow.story.start" WebSocket Message
  When das Message verarbeitet wird
  Then enthält die ACK-Response das model-Feld
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [x] FILE_EXISTS: `agent-os-ui/src/server/workflow-executor.ts`
- [x] CONTAINS: `workflow-executor.ts` enthält `--model`

### Funktions-Prüfungen

- [x] LINT_PASS: `cd agent-os-ui && npm run lint:backend`
- [x] BUILD_PASS: `cd agent-os-ui && npm run build:backend`

---

## Required MCP Tools

| Tool | Purpose | Blocking |
|------|---------|----------|
| - | Keine MCP Tools erforderlich | - |

---

## Technisches Refinement (vom Architect)

> **Refined:** 2026-02-02

### DoR (Definition of Ready) - Vom Architect

#### Fachliche Anforderungen
- [x] Fachliche requirements klar definiert
- [x] Akzeptanzkriterien sind spezifisch und prüfbar
- [x] Business Value verstanden

#### Technische Vorbereitung
- [x] Technischer Ansatz definiert (WAS/WIE/WO)
- [x] Abhängigkeiten identifiziert (MSK-002)
- [x] Betroffene Komponenten bekannt
- [x] Erforderliche MCP Tools dokumentiert (falls zutreffend)
- [x] Story ist angemessen geschätzt (max 5 Dateien, 400 LOC)

#### Full-Stack Konsistenz
- [x] Alle betroffenen Layer identifiziert
- [x] Integration Type bestimmt
- [x] Kritische Integration Points dokumentiert (wenn Full-stack)
- [x] Handover-Dokumente definiert (bei Multi-Layer)

**Story ist READY wenn alle Checkboxen angehakt sind.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [x] Code implementiert und folgt Style Guide
- [x] Architektur-Vorgaben eingehalten
- [x] --model Flag wird korrekt an Claude Code übergeben

#### Qualitätssicherung
- [x] Alle Akzeptanzkriterien erfüllt
- [x] Logging zeigt verwendetes Model bei Workflow-Start
- [x] Lint-Errors sind behoben

#### Dokumentation
- [x] Dokumentation aktualisiert
- [x] Keine Linting Errors
- [x] Completion Check Commands alle erfolgreich

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Backend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Backend | `workflow-executor.ts` | Model lesen, --model Flag |
| Backend | `websocket.ts` | workflow.story.start.ack erweitern |

**Kritische Integration Points:** N/A (Backend-only)

---

### Wiederverwendung aus Chat-Model-Selection

> ⚠️ **WICHTIG:** Diese Story nutzt existierende Komponenten:

| Komponente | Pfad | Nutzen |
|------------|------|--------|
| `model-config.ts` | `src/server/model-config.ts` | `getModelCliFlag()` importieren |

**Anstatt CLI-Logik neu zu implementieren:**
```typescript
import { getModelCliFlag } from './model-config';
// Dann: args.push(...getModelCliFlag(model));
```

---

### Technical Details

**WAS:**
- Workflow-Executor erweitern um das gewählte Model zu verwenden
- Model lesen: Aus Kanban-Board via SpecsReader beim Story-Start
- Model übergeben: `--model` Flag an Claude Code CLI
- Default: "opus" wenn kein Model gesetzt
- Logging: Model-Auswahl im Console-Log dokumentieren

**WIE:**
- WorkflowExecution Interface um `model?: ModelSelection` erweitern
- In startStoryExecution Model aus Kanban lesen
- In runClaudeCommand `--model` Flag hinzufügen
- Nutze existierende `model-config.ts` wenn möglich

**WO:**
- `agent-os-ui/src/server/workflow-executor.ts` (ERWEITERN)
- `agent-os-ui/src/server/websocket.ts` (ACK erweitern)

**WER:** dev-team__backend-developer

**Abhängigkeiten:** MSK-002 (Model aus Kanban lesen)

**Geschätzte Komplexität:** S (~50-80 LOC)

---

### Relevante Skills

- `backend-express` (Express/Node.js Patterns)

---

### Creates Reusable

**Creates Reusable:** no
- Workflow-Integration ist Feature-spezifisch
- CLI-Logik wird aus model-config.ts wiederverwendet

---

### Completion Check

```bash
# Build Check
cd agent-os-ui && npm run build

# Lint Check
cd agent-os-ui && npm run lint

# Prüfen dass --model Flag hinzugefügt wird
grep -n "\-\-model" agent-os-ui/src/server/workflow-executor.ts

# Prüfen dass Model aus Kanban gelesen wird
grep -n "\.model" agent-os-ui/src/server/workflow-executor.ts

# Prüfen dass Logging vorhanden ist
grep -n "model" agent-os-ui/src/server/workflow-executor.ts
```
