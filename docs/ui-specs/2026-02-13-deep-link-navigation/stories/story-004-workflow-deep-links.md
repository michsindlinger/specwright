# Workflow Deep Links

> Story ID: DLN-004
> Spec: Deep Link Navigation
> Created: 2026-02-13
> Last Updated: 2026-02-13

**Priority**: Medium
**Type**: Frontend
**Estimated Effort**: XS
**Dependencies**: DLN-001

**Integration:** router.service → workflow-view (Route-Parameter lesen/schreiben)

---

## Feature

```gherkin
Feature: Workflow Deep Links
  Als Entwickler
  möchte ich dass der ausgewählte Workflow in der URL abgebildet wird,
  damit ich nach einem Reload zum gleichen Workflow zurückkehre.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Workflow-Auswahl aktualisiert URL

```gherkin
Scenario: URL wird bei Workflow-Auswahl aktualisiert
  Given ich bin auf der Workflow-Übersicht
  When ich einen laufenden Workflow "exec-123" auswähle
  Then ändert sich die URL zu "#/workflows/exec-123"
  And ich sehe die Details des Workflows
```

### Szenario 2: Workflow-View URL bleibt stabil

```gherkin
Scenario: Workflow-Ansicht hat eine stabile URL
  Given ich bin auf der Workflow-Ansicht
  When ich die Seite neu lade
  Then lande ich wieder auf der Workflow-Ansicht
  And die URL zeigt "#/workflows"
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Stale Workflow-ID nach Reload
  Given die URL enthält "#/workflows/abgelaufene-id"
  And dieser Workflow existiert nicht mehr
  When die Seite geladen wird
  Then wird die Workflow-Übersicht angezeigt
  And ich erhalte einen Hinweis dass der Workflow nicht gefunden wurde
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

<<<<<<< HEAD
- [ ] FILE_EXISTS: `agent-os-ui/ui/src/views/workflow-view.ts` (MODIFY)

### Inhalt-Prüfungen

- [ ] CONTAINS: `workflow-view.ts` importiert `routerService` aus `../services/router.service.js`
- [ ] CONTAINS: `workflow-view.ts` ruft `routerService.navigate()` bei Execution-Auswahl auf
- [ ] CONTAINS: `workflow-view.ts` subscribed auf Route-Changes in `connectedCallback`

### Funktions-Prüfungen

- [ ] LINT_PASS: `cd agent-os-ui/ui && npx eslint src/views/workflow-view.ts`
- [ ] BUILD_PASS: `cd agent-os-ui/ui && npx tsc --noEmit`
=======
- [x] FILE_EXISTS: `agent-os-ui/ui/src/views/workflow-view.ts` (MODIFY)

### Inhalt-Prüfungen

- [x] CONTAINS: `workflow-view.ts` importiert `routerService` aus `../services/router.service.js`
- [x] CONTAINS: `workflow-view.ts` ruft `routerService.navigate()` bei Execution-Auswahl auf
- [x] CONTAINS: `workflow-view.ts` subscribed auf Route-Changes in `connectedCallback`

### Funktions-Prüfungen

- [x] LINT_PASS: `cd agent-os-ui/ui && npx eslint src/views/workflow-view.ts`
- [x] BUILD_PASS: `cd agent-os-ui/ui && npx tsc --noEmit`
>>>>>>> 40e0947e98a8772e353d077cd90b75981a13b604

---

## Required MCP Tools

Keine MCP Tools erforderlich.

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

#### Full-Stack Konsistenz (NEU)
- [x] **Alle betroffenen Layer identifiziert**
- [x] **Integration Type bestimmt**
- [x] **Kritische Integration Points dokumentiert** (wenn Full-stack)
- [x] **Handover-Dokumente definiert** (bei Multi-Layer)

**Story ist READY wenn alle Checkboxen angehakt sind.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
<<<<<<< HEAD
- [ ] Code implementiert und folgt Style Guide
- [ ] Architektur-Vorgaben eingehalten (WIE section)
- [ ] Security/Performance Anforderungen erfüllt

#### Qualitätssicherung
- [ ] Alle Akzeptanzkriterien erfüllt (via Completion Check verifiziert)
- [ ] Unit Tests geschrieben und bestanden
- [ ] Integration Tests geschrieben und bestanden
- [ ] Code Review durchgeführt und genehmigt

#### Dokumentation
- [ ] Dokumentation aktualisiert
- [ ] Keine Linting Errors
- [ ] Completion Check Commands alle erfolgreich (exit 0)
=======
- [x] Code implementiert und folgt Style Guide
- [x] Architektur-Vorgaben eingehalten (WIE section)
- [x] Security/Performance Anforderungen erfüllt

#### Qualitätssicherung
- [x] Alle Akzeptanzkriterien erfüllt (via Completion Check verifiziert)
- [x] Unit Tests geschrieben und bestanden
- [x] Integration Tests geschrieben und bestanden
- [x] Code Review durchgeführt und genehmigt

#### Dokumentation
- [x] Dokumentation aktualisiert
- [x] Keine Linting Errors
- [x] Completion Check Commands alle erfolgreich (exit 0)
>>>>>>> 40e0947e98a8772e353d077cd90b75981a13b604

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | `workflow-view.ts` (MODIFY) | Execution-ID aus Route lesen bei Mount, URL updaten bei Execution-Auswahl, Fallback bei Stale-IDs |

---

### Technical Details

**WAS:**
- Bei `connectedCallback`: Route-Params aus `routerService` lesen. Wenn `workflowId` (executionId) vorhanden, versuchen die entsprechende Execution im `executionStore` zu finden und als `activeExecution` setzen
- Bei Workflow-Start/Auswahl: URL mit `routerService.navigate('workflows', { workflowId: executionId })` updaten
- Bei Workflow-Ende oder Zurueck-Navigation: URL auf `routerService.navigate('workflows')` zuruecksetzen
- Route-Change-Subscription fuer Browser Back/Forward
- Graceful Fallback: Wenn workflowId aus URL nicht im executionStore gefunden wird, auf `#/workflows` zurueckfallen (Stale IDs sind erwartet, da Executions ephemeral sind)

**WIE (Architektur-Guidance ONLY):**
- `routerService.on('route-changed', handler)` Pattern verwenden (analog zu dashboard-view Integration)
- `executionStore` als Quelle fuer Execution-Validierung nutzen (kein API-Call)
- Bei `checkPendingWorkflow()`: bestehende sessionStorage-Logik beibehalten, da diese orthogonal zum URL-Routing ist (Workflow wird gestartet, dann URL aktualisiert)
- Subscription in `connectedCallback` / Unsubscription in `disconnectedCallback` analog zum bestehenden `boundHandlers` Pattern
- Beachten: `activeExecution` State-Property wird von executionStore-Subscription UND von Route-Params gesetzt - executionStore hat Prioritaet bei Konflikten

**WO:**
- `agent-os-ui/ui/src/views/workflow-view.ts` (MODIFY - ~20-30 Zeilen hinzugefuegt)

**WER:** codebase-analyzer

**Abhängigkeiten:** DLN-001

**Geschätzte Komplexität:** XS

**Relevante Skills:** Keine projektspezifischen Skills vorhanden. Orientierung an bestehenden Patterns: `workflow-view.ts` `setupStoreSubscription()`, `executionStore` fuer State-Management.

---

### Creates Reusable Artifacts

**Creates Reusable:** Nein - Aenderungen sind spezifisch fuer workflow-view.

---

### Completion Check

```bash
# Pruefen ob routerService in workflow-view importiert wird
grep -q "routerService" agent-os-ui/ui/src/views/workflow-view.ts && echo "OK: routerService imported" || echo "FAIL: routerService not found"

# Pruefen ob navigate() aufgerufen wird
grep -q "routerService.navigate" agent-os-ui/ui/src/views/workflow-view.ts && echo "OK: navigate() used" || echo "FAIL: navigate() not found"

# TypeScript Check
cd agent-os-ui/ui && npx tsc --noEmit && echo "OK: TypeScript compiles" || echo "FAIL: TypeScript errors"
```
