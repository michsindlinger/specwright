# Multi-Execution State Management

> Story ID: MCE-002
> Spec: Multi-Command Execution
> Created: 2026-01-30
> Last Updated: 2026-01-30

**Priority**: High
**Type**: Frontend
**Estimated Effort**: S
**Dependencies**: MCE-001

---

## Feature

```gherkin
Feature: Multi-Execution State Management
  Als Entwickler
  möchte ich mehrere Workflow-Executions gleichzeitig im State verwalten,
  damit ich zwischen aktiven Commands wechseln kann ohne Datenverlust.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: State für erste Execution erstellen

```gherkin
Scenario: State wird bei Command-Start erstellt
  Given der ExecutionStore ist leer
  When ich einen Command "/create-spec" starte
  Then wird eine neue Execution im Store erstellt
  And die Execution hat eine eindeutige executionId
  And die Execution ist als "activeExecution" markiert
```

### Szenario 2: Mehrere Executions parallel im State

```gherkin
Scenario: Parallele Executions werden unabhängig gespeichert
  Given ich habe bereits Execution A im State
  When ich einen weiteren Command starte
  Then wird Execution B im Store hinzugefügt
  And Execution A bleibt unverändert im Store
  And beide Executions haben separate Output-Arrays
```

### Szenario 3: Aktive Execution wechseln

```gherkin
Scenario: Aktive Execution kann gewechselt werden
  Given ich habe Execution A und B im State
  And Execution A ist die aktive Execution
  When ich auf Tab B klicke
  Then wird Execution B zur aktiven Execution
  And die Output-Anzeige zeigt Execution B's Output
  And Execution A's Output bleibt gespeichert
```

### Szenario 4: Execution entfernen bei Tab-Schließen

```gherkin
Scenario: Execution wird aus State entfernt
  Given ich habe Execution A und B im State
  When ich Tab A schließe
  Then wird Execution A aus dem Store entfernt
  And Execution B bleibt erhalten
  And Execution B wird automatisch zur aktiven Execution
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Letzte Execution schließen
  Given ich habe nur eine Execution im State
  When ich den Tab schließe
  Then wird der Store geleert
  And keine aktive Execution ist gesetzt
  And die Workflow-View zeigt den leeren Zustand
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [x] FILE_EXISTS: agent-os-ui/ui/src/stores/execution-store.ts

### Inhalt-Prüfungen

- [x] CONTAINS: agent-os-ui/ui/src/stores/execution-store.ts enthält "class ExecutionStore"
- [x] CONTAINS: agent-os-ui/ui/src/stores/execution-store.ts enthält "executions: Map"
- [x] CONTAINS: agent-os-ui/ui/src/stores/execution-store.ts enthält "activeExecutionId"

### Funktions-Prüfungen

- [x] LINT_PASS: cd agent-os-ui && npm run lint exits with code 0
- [x] TEST_PASS: cd agent-os-ui && npm run test tests/unit/execution-store.test.ts exits with code 0

---

## Required MCP Tools

| Tool | Purpose | Blocking |
|------|---------|----------|
| None | - | - |

---

## Technisches Refinement (vom Architect)

> **HINWEIS:** Technisches Refinement abgeschlossen am 2026-01-30

### DoR (Definition of Ready) - Vom Architect

#### Fachliche Anforderungen
- [x] Fachliche requirements klar definiert
- [x] Akzeptanzkriterien sind spezifisch und prüfbar
- [x] Business Value verstanden

#### Technische Vorbereitung
- [x] Technischer Ansatz definiert (WAS/WIE/WO)
- [x] Abhängigkeiten identifiziert
- [x] Betroffene Komponenten bekannt
- [x] Erforderliche MCP Tools dokumentiert (falls zutreffend)
- [x] Story ist angemessen geschätzt (max 5 Dateien, 400 LOC)

#### Full-Stack Konsistenz
- [x] Alle betroffenen Layer identifiziert
- [x] Integration Type bestimmt
- [x] Kritische Integration Points dokumentiert (wenn Full-stack)
- [x] Handover-Dokumente definiert (bei Multi-Layer)

**Story ist READY wenn alle Checkboxen angehakt sind.** ✓ READY

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [x] Code implementiert und folgt Style Guide
- [x] Architektur-Vorgaben eingehalten (WIE section)
- [x] Security/Performance Anforderungen erfüllt

#### Qualitätssicherung
- [x] Alle Akzeptanzkriterien erfüllt (via Completion Check verifiziert)
- [x] Unit Tests geschrieben und bestanden (@open-wc/testing)
- [x] Store-Methoden getestet (addExecution, removeExecution, setActiveExecution)

#### Dokumentation
- [x] Code ist selbstdokumentierend (klare Benennung)
- [x] Keine Linting Errors
- [x] Completion Check Commands alle erfolgreich (exit 0)

**Story ist DONE wenn alle Checkboxen angehakt sind.** ✓ DONE

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | stores/execution-store.ts | Neue Store-Klasse erstellen |
| Frontend | types/execution.ts | Type Definitions für ExecutionState |
| Frontend | views/workflow-view.ts | Store Integration statt lokaler State |

**Kritische Integration Points:**
- N/A (Frontend-only)

---

### Technical Details

**WAS:**
- Neue `ExecutionStore` Klasse mit Map-basiertem State
- Neues `ExecutionState` Interface mit executionId, commandId, status, messages, etc.
- Refactoring von workflow-view.ts um Store zu nutzen

**WIE (Architektur-Guidance ONLY):**
- Singleton Pattern für Store (export const executionStore = new ExecutionStore())
- Map<string, ExecutionState> für O(1) Zugriff nach executionId
- EventTarget-basierte Updates (dispatchEvent) wie in gateway.ts
- Methoden: addExecution(), removeExecution(), setActiveExecution(), getExecution()
- TypeScript strict: keine `any` Types

**WO:**
- agent-os-ui/ui/src/stores/execution-store.ts (NEU)
- agent-os-ui/ui/src/types/execution.ts (NEU oder erweitern)
- agent-os-ui/ui/src/views/workflow-view.ts (Anpassung)

**WER:** dev-team__frontend-developer

**Abhängigkeiten:** MCE-001 (Tab UI muss existieren für Integration)

**Geschätzte Komplexität:** S (3 Dateien, ~250 LOC)

---

### Completion Check

```bash
# Auto-Verify Commands - alle müssen mit 0 exiten
test -f agent-os-ui/ui/src/stores/execution-store.ts && echo "PASS: execution-store.ts exists" || exit 1
test -f agent-os-ui/ui/src/types/execution.ts && echo "PASS: execution.ts types exists" || exit 1
grep -q "class ExecutionStore" agent-os-ui/ui/src/stores/execution-store.ts && echo "PASS: ExecutionStore class" || exit 1
grep -q "executions" agent-os-ui/ui/src/stores/execution-store.ts && echo "PASS: executions Map" || exit 1
grep -q "activeExecutionId" agent-os-ui/ui/src/stores/execution-store.ts && echo "PASS: activeExecutionId" || exit 1
cd agent-os-ui && npm run lint
cd agent-os-ui && npm run build
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen
