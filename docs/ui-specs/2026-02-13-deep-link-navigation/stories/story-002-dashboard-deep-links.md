# Dashboard Deep Links

> Story ID: DLN-002
> Spec: Deep Link Navigation
> Created: 2026-02-13
> Last Updated: 2026-02-13

**Priority**: High
**Type**: Frontend
**Estimated Effort**: S
**Dependencies**: DLN-001

**Integration:** router.service → dashboard-view (Route-Parameter lesen/schreiben)

---

## Feature

```gherkin
Feature: Dashboard Deep Links
  Als Entwickler
  möchte ich dass die ausgewählte Spec und der aktive Tab in der URL abgebildet werden,
  damit ich nach einem Page Reload direkt bei meiner Arbeit weitermachen kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Spec-Auswahl aktualisiert URL

```gherkin
Scenario: URL wird bei Spec-Auswahl aktualisiert
  Given ich bin auf der Dashboard-Übersicht
  When ich die Spec "2026-02-10-my-feature" auswähle
  Then ändert sich die URL zu "#/dashboard/spec/2026-02-10-my-feature"
  And ich sehe die Kanban-Ansicht der Spec
```

### Szenario 2: Tab-Wechsel aktualisiert URL

```gherkin
Scenario: URL wird bei Tab-Wechsel aktualisiert
  Given ich sehe die Spec "2026-02-10-my-feature" im Dashboard
  And der Kanban-Tab ist aktiv
  When ich zum "stories"-Tab wechsle
  Then ändert sich die URL zu "#/dashboard/spec/2026-02-10-my-feature/stories"
```

### Szenario 3: Page Reload behält Zustand

```gherkin
Scenario: Spec und Tab bleiben nach Reload erhalten
  Given die URL ist "#/dashboard/spec/2026-02-10-my-feature/kanban"
  When ich die Seite neu lade
  Then sehe ich die Spec "2026-02-10-my-feature"
  And der Kanban-Tab ist aktiv
```

### Szenario 4: Zurück zur Spec-Liste

```gherkin
Scenario: Zurück-Navigation zur Spec-Liste
  Given ich sehe die Spec "2026-02-10-my-feature" im Dashboard
  When ich zur Spec-Liste zurück navigiere
  Then ändert sich die URL zu "#/dashboard"
  And ich sehe die Dashboard-Übersicht mit allen Specs
```

### Szenario 5: Deep Link öffnen

```gherkin
Scenario: Deep Link zu Spec mit Tab öffnen
  Given ein Kollege hat mir die URL "#/dashboard/spec/2026-02-10-my-feature/stories" geschickt
  When ich diese URL in einem neuen Browser-Tab öffne
  Then sehe ich direkt die Spec "2026-02-10-my-feature"
  And der Stories-Tab ist aktiv
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Browser-Zurück von Spec-Detail zur Liste
  Given ich war auf der Dashboard-Übersicht
  And ich habe die Spec "2026-02-10-my-feature" ausgewählt
  When ich den Zurück-Button im Browser drücke
  Then kehre ich zur Dashboard-Übersicht zurück
  And die URL zeigt "#/dashboard"
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [ ] FILE_EXISTS: `agent-os-ui/ui/src/views/dashboard-view.ts` (MODIFY)

### Inhalt-Prüfungen

- [ ] CONTAINS: `dashboard-view.ts` importiert `routerService` aus `../services/router.service.js`
- [ ] CONTAINS: `dashboard-view.ts` ruft `routerService.navigate()` bei Spec-Auswahl auf
- [ ] CONTAINS: `dashboard-view.ts` ruft `routerService.navigate()` bei Tab-Wechsel auf
- [ ] CONTAINS: `dashboard-view.ts` subscribed auf Route-Changes in `connectedCallback`
- [ ] CONTAINS: `dashboard-view.ts` unsubscribed in `disconnectedCallback`

### Funktions-Prüfungen

- [ ] LINT_PASS: `cd agent-os-ui/ui && npx eslint src/views/dashboard-view.ts`
- [ ] BUILD_PASS: `cd agent-os-ui/ui && npx tsc --noEmit`

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

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | `dashboard-view.ts` (MODIFY) | Route-Parameter lesen bei Mount, URL updaten bei Spec-Auswahl/Tab-Wechsel/Zurueck-Navigation, Route-Change-Subscription fuer Browser Back/Forward |

---

### Technical Details

**WAS:**
- Bei `connectedCallback` Route-Params aus `routerService` lesen: wenn `specId` vorhanden, Spec direkt laden und anzeigen; wenn `tab` vorhanden, entsprechenden ViewMode setzen
- Bei `handleSpecSelect()`: nach Spec-Auswahl `routerService.navigate('dashboard', { specId })` aufrufen
- Bei Tab-Wechsel (kanban/stories/docs/backlog): URL mit `routerService.navigate('dashboard', { specId, tab })` updaten
- Bei `handleKanbanBack()`: URL zurueck auf `routerService.navigate('dashboard')` setzen (ohne params)
- Route-Change-Subscription einrichten fuer Browser Back/Forward: wenn Route sich aendert und View=dashboard, params lesen und State entsprechend updaten
- Bestehende `handleCreateSpecStart()` Methode: `window.location.hash = '#/workflows'` durch `routerService.navigate('workflows')` ersetzen

**WIE (Architektur-Guidance ONLY):**
- `routerService.on('route-changed', handler)` in `connectedCallback` subscriben, in `disconnectedCallback` unsubscriben (analog zu gateway.on/off Pattern in den bestehenden Views)
- Beim Lesen der Route-Parameter getCurrentRoute() vom routerService verwenden
- ViewMode-Mapping: URL-Tab-Segment auf bestehende `ViewMode`-Type mappen (`'kanban'` | `'stories'` | `'docs'` | `'backlog'`)
- Guard-Pattern: Nach async Daten-Laden (specs.kanban Response) pruefen ob aktuelle Route noch matcht, bevor State gesetzt wird
- Kein neues State-Management: bestehende `@state()` Properties (`viewMode`, `selectedSpec`, `kanban`) weiterverwenden
- Lazy Validation: Ungueltige specId wird erst erkannt wenn specs.kanban Response kommt (Story 006 behandelt Fehler-Feedback)

**WO:**
- `agent-os-ui/ui/src/views/dashboard-view.ts` (MODIFY - ~40-50 Zeilen hinzugefuegt)

**WER:** codebase-analyzer

**Abhängigkeiten:** DLN-001

**Geschätzte Komplexität:** S

**Relevante Skills:** Keine projektspezifischen Skills vorhanden. Orientierung an bestehenden Patterns: `dashboard-view.ts` WebSocket-Handler-Setup in `setupHandlers()`, bestehende `handleSpecSelect()` und `handleKanbanBack()` Methoden.

---

### Creates Reusable Artifacts

**Creates Reusable:** Nein - Aenderungen sind spezifisch fuer dashboard-view.

---

### Completion Check

```bash
# Pruefen ob routerService in dashboard-view importiert wird
grep -q "routerService" agent-os-ui/ui/src/views/dashboard-view.ts && echo "OK: routerService imported" || echo "FAIL: routerService not found"

# Pruefen ob keine direkten window.location.hash Zuweisungen in dashboard-view
HASH_COUNT=$(grep -c "window.location.hash\s*=" agent-os-ui/ui/src/views/dashboard-view.ts || true)
test "$HASH_COUNT" -eq 0 && echo "OK: No direct hash assignments" || echo "FAIL: $HASH_COUNT direct hash assignments"

# TypeScript Check
cd agent-os-ui/ui && npx tsc --noEmit && echo "OK: TypeScript compiles" || echo "FAIL: TypeScript errors"
```
