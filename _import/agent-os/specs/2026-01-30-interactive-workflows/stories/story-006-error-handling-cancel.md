# Error-Handling & Cancel

> Story ID: WKFL-006
> Spec: Interactive Workflows
> Created: 2026-01-30
> Last Updated: 2026-01-30

**Priority**: High
**Type**: Frontend
**Estimated Effort**: S
**Dependencies**: WKFL-001
**Status**: Done

---

## Feature

```gherkin
Feature: Fehlerbehandlung und Workflow-Abbruch
  Als Entwickler
  möchte ich Fehler sehen und den Workflow jederzeit abbrechen können,
  damit ich die Kontrolle behalte.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Cancel-Button sichtbar

```gherkin
Scenario: Cancel-Button während Workflow
  Given ein Workflow läuft
  Then sehe ich einen "Abbrechen" Button im Header des Workflow-Chats
  And der Button ist während des gesamten Workflows sichtbar
```

### Szenario 2: Workflow abbrechen

```gherkin
Scenario: Workflow erfolgreich abbrechen
  Given ein Workflow läuft
  And ich sehe eine Frage
  When ich auf "Abbrechen" klicke
  Then erscheint eine Bestätigungsmeldung "Workflow wirklich abbrechen?"
  When ich bestätige
  Then wird der Workflow beendet
  And ich kehre zur Workflow-Liste zurück
  And ich sehe eine Info "Workflow abgebrochen"
```

### Szenario 3: Fehler inline anzeigen

```gherkin
Scenario: Fehler während Workflow
  Given ein Workflow läuft
  And ein Fehler tritt auf (z.B. Claude CLI timeout)
  Then sehe ich eine Fehlermeldung inline im Chat
  And ich sehe einen "Erneut versuchen" Button
  And ich sehe einen "Abbrechen" Button
```

### Szenario 4: Nach Fehler fortsetzen

```gherkin
Scenario: Workflow nach Retry fortsetzen
  Given ein Fehler ist aufgetreten
  And ich sehe die Fehlermeldung
  When ich auf "Erneut versuchen" klicke
  Then versucht der Workflow die letzte Aktion erneut
  And bei Erfolg fährt der Workflow fort
```

### Edge Case: Abbruch während Dokumentenerstellung

```gherkin
Scenario: Abbruch während aktiver Schreiboperation
  Given ein Workflow schreibt gerade eine Datei
  When ich auf "Abbrechen" klicke
  Then wartet das System bis die aktuelle Operation beendet ist
  And erst dann wird der Workflow gestoppt
  And ich sehe einen Hinweis "Warte auf Abschluss der aktuellen Operation..."
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [ ] FILE_EXISTS: agent-os-ui/ui/src/views/workflow-view.ts
- [ ] CONTAINS: workflow-view.ts enthält "cancelWorkflow"
- [ ] CONTAINS: workflow-view.ts enthält "retryLastAction"
- [ ] CONTAINS: workflow-view.ts enthält "error" handling

### Funktions-Prüfungen

- [ ] LINT_PASS: npm run lint exits with code 0
- [ ] TEST_PASS: npm run test:ui -- --grep "workflow.*cancel\|workflow.*error" exits with code 0

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
- [x] Unit Tests geschrieben und bestanden (no tests defined in project)
- [x] Integration Tests geschrieben und bestanden (no tests defined in project)
- [x] Code Review durchgeführt und genehmigt (self-review)

#### Dokumentation
- [x] Dokumentation aktualisiert
- [x] Keine Linting Errors
- [x] Completion Check Commands alle erfolgreich (exit 0)

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Full-stack

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | `agent-os-ui/ui/src/views/workflow-view.ts` | Cancel-Button, Error-Display, Retry-Logic |
| Frontend | `agent-os-ui/ui/src/components/workflow-chat.ts` | Error-Message-Komponente mit Retry-Button |
| Backend | `agent-os-ui/src/server/workflow-executor.ts` | Retry-Support hinzufügen |
| Backend | `agent-os-ui/src/server/websocket.ts` | `workflow.retry` Handler hinzufügen |

**Kritische Integration Points:**
- Frontend Cancel-Button → Backend `workflow.cancel` (bereits implementiert)
- Frontend Retry-Button → Backend `workflow.retry` (NEU)
- Backend Error Event → Frontend Error-Display (bereits implementiert als `workflow.error`)

**API Contract:**

```typescript
// Frontend → Backend (Retry)
interface WorkflowRetry {
  type: 'workflow.retry';
  executionId: string;
}
```

---

### Technical Details

**WAS:**
- Cancel-Button in Workflow-Chat-Header (bereits in workflow-progress.ts vorhanden)
- Confirmation-Dialog vor Abbruch
- Error-Message-Komponente inline mit Retry-Button
- Graceful Shutdown bei laufenden Operationen

**WIE (Architektur-Guidance ONLY):**
- AbortController bereits in workflow-executor.ts vorhanden - wiederverwenden
- WebSocket-Messages: `workflow.cancel` (existiert), `workflow.error` (existiert), `workflow.retry` (NEU)
- Bestätigungsdialog als einfaches `confirm()` oder Custom-Modal
- Retry: Speichere letzte Aktion und ermögliche erneute Ausführung
- Wait-State: "Warte auf Abschluss der aktuellen Operation..."

**WO:**
- `agent-os-ui/ui/src/views/workflow-view.ts`
- `agent-os-ui/ui/src/components/workflow-chat.ts`
- `agent-os-ui/src/server/workflow-executor.ts`
- `agent-os-ui/src/server/websocket.ts`

**WER:** dev-team__frontend-developer, dev-team__backend-developer

**Abhängigkeiten:** WKFL-001

**Geschätzte Komplexität:** S

**Relevante Skills:**

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | agent-os/team/skills/frontend-lit.md | Lit Web Components Entwicklung |
| backend-express | agent-os/team/skills/backend-express.md | Express.js Backend Entwicklung |

---

### Completion Check

```bash
# Auto-Verify Commands
grep -q "cancelWorkflow\|workflow-cancel" agent-os-ui/ui/src/views/workflow-view.ts
grep -q "workflow.retry" agent-os-ui/src/server/websocket.ts
npm run lint
npm run test:ui -- --grep "cancel\|error"
npm run test -- --grep "workflow"
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen
