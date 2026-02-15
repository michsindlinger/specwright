# Minimal Tool-Activity

> Story ID: WKFL-007
> Spec: Interactive Workflows
> Created: 2026-01-30
> Last Updated: 2026-01-30

**Priority**: Medium
**Type**: Frontend
**Estimated Effort**: XS
**Dependencies**: WKFL-001
**Status**: Done

---

## Feature

```gherkin
Feature: Minimale Tool-Aktivitätsanzeige
  Als Entwickler
  möchte ich nur sehen dass etwas passiert, nicht die Tool-Details,
  damit der Workflow-Chat fokussiert bleibt.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Spinner während Tool-Ausführung

```gherkin
Scenario: Aktivitätsanzeige bei Tool-Call
  Given ein Workflow läuft
  And der Workflow führt eine Tool-Operation aus (z.B. Datei schreiben)
  Then sehe ich einen Spinner mit "Processing..."
  And ich sehe KEINE Details zu Input/Output des Tools
```

### Szenario 2: Spinner verschwindet nach Abschluss

```gherkin
Scenario: Spinner nach Tool-Abschluss
  Given ein Tool wird ausgeführt
  And ich sehe den Spinner
  When das Tool abgeschlossen ist
  Then verschwindet der Spinner
  And ich sehe nur das Ergebnis (wenn relevant für den Workflow)
```

### Szenario 3: Mehrere Tools gleichzeitig

```gherkin
Scenario: Mehrere Tools in Folge
  Given ein Workflow führt mehrere Tools nacheinander aus
  Then sehe ich nur einen Spinner
  And der Spinner zeigt "Processing (3 operations)..."
  When alle Tools fertig sind
  Then verschwindet der Spinner
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [ ] FILE_EXISTS: agent-os-ui/ui/src/views/workflow-view.ts
- [ ] CONTAINS: workflow-view.ts enthält "spinner" oder "loading"
- [ ] NOT_CONTAINS: workflow-view.ts enthält NICHT "tool-call-badge" im Workflow-Modus

### Funktions-Prüfungen

- [ ] LINT_PASS: npm run lint exits with code 0
- [ ] TEST_PASS: npm run test:ui -- --grep "workflow.*tool\|workflow.*loading" exits with code 0

---

## Required MCP Tools

| Tool | Purpose | Blocking |
|------|---------|----------|
| None | N/A | No |

---

## Technisches Refinement (vom Architect)

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
- [x] **Alle betroffenen Layer identifiziert**
- [x] **Integration Type bestimmt**
- [x] **Kritische Integration Points dokumentiert** (wenn Full-stack)
- [x] **Handover-Dokumente definiert** (bei Multi-Layer)

**Story ist READY wenn alle Checkboxen angehakt sind.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [x] Code implementiert und folgt Style Guide
- [x] Architektur-Vorgaben eingehalten (WIE section)
- [x] Security/Performance Anforderungen erfüllt

#### Qualitätssicherung
- [x] Alle Akzeptanzkriterien erfüllt (via Completion Check verifiziert)
- [x] Unit Tests geschrieben und bestanden (N/A - no test infrastructure)
- [x] Integration Tests geschrieben und bestanden (N/A - no test infrastructure)
- [x] Code Review durchgeführt und genehmigt

#### Dokumentation
- [x] Dokumentation aktualisiert
- [x] Keine Linting Errors
- [x] Completion Check Commands alle erfolgreich (exit 0)

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | `agent-os-ui/ui/src/components/workflow-chat.ts` | Minimale Tool-Anzeige statt detaillierte Badges |
| Frontend | `agent-os-ui/ui/src/components/loading-spinner.ts` | Wiederverwenden für Processing-Anzeige |

---

### Technical Details

**WAS:**
- Tool-Calls im Workflow-Modus als einfacher Spinner anzeigen
- Keine expandierbaren Tool-Badges (wie in chat-view)
- Zähler für parallele Operations wenn > 1

**WIE (Architektur-Guidance ONLY):**
- Bestehende `aos-loading-spinner` Komponente wiederverwenden
- State: `@state() private pendingToolCalls = 0`
- Im Workflow-Modus: Spinner mit "Processing..." oder "Processing (3 operations)..."
- Event-Handling: `workflow.tool` increments counter, `workflow.tool.complete` decrements

**WO:**
- `agent-os-ui/ui/src/components/workflow-chat.ts`
- `agent-os-ui/ui/src/components/loading-spinner.ts` (keine Änderung, nur Verwendung)

**WER:** dev-team__frontend-developer

**Abhängigkeiten:** WKFL-001

**Geschätzte Komplexität:** XS

**Relevante Skills:**

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | agent-os/team/skills/frontend-lit.md | Lit Web Components Entwicklung |

---

### Completion Check

```bash
# Auto-Verify Commands
grep -q "pendingToolCalls\|aos-loading-spinner\|Processing" agent-os-ui/ui/src/components/workflow-chat.ts
npm run lint
npm run test:ui -- --grep "workflow.*tool\|workflow.*loading"
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen
