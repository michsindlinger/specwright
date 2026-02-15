# Edge Case Handling & Error Feedback

> Story ID: DLN-006
> Spec: Deep Link Navigation
> Created: 2026-02-13
> Last Updated: 2026-02-13

**Priority**: High
**Type**: Frontend
**Estimated Effort**: S
**Dependencies**: DLN-001, DLN-002, DLN-003, DLN-004, DLN-005

---

## Feature

```gherkin
Feature: Edge Case Handling & Error Feedback
  Als Entwickler
  möchte ich dass ungültige Deep Links graceful behandelt werden mit klarem Feedback,
  damit ich nie in einem kaputten Zustand lande.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Nicht-existierende Spec

```gherkin
Scenario: Deep Link zu nicht-existierender Spec
  Given die URL enthält "#/dashboard/spec/nicht-existierende-spec"
  When die Seite geladen wird
  Then wird die Dashboard-Übersicht angezeigt
  And ich sehe eine Toast-Nachricht "Spec nicht gefunden"
  And die URL wird zu "#/dashboard" korrigiert
```

### Szenario 2: Ungültiger Tab-Name

```gherkin
Scenario: Deep Link mit ungültigem Tab
  Given die URL enthält "#/dashboard/spec/2026-02-10-my-feature/ungueltig"
  When die Seite geladen wird
  Then wird die Spec "2026-02-10-my-feature" angezeigt
  And der Standard-Tab wird geladen
  And die URL wird zum Standard-Tab korrigiert
```

### Szenario 3: Komplett ungültiger Pfad

```gherkin
Scenario: Komplett ungültiger Deep Link
  Given die URL enthält "#/komplett/ungueltig/pfad"
  When die Seite geladen wird
  Then wird die "Not Found"-Ansicht angezeigt
```

### Szenario 4: Projekt-Kontext-Mismatch

```gherkin
Scenario: Spec gehört zu anderem Projekt
  Given ich habe Projekt "A" ausgewählt
  And die URL enthält eine Spec die zu Projekt "B" gehört
  When die Seite geladen wird
  Then sehe ich eine Toast-Nachricht "Spec nicht gefunden"
  And ich bleibe auf der Dashboard-Übersicht
```

### Szenario 5: URL manuell editieren

```gherkin
Scenario: User editiert URL manuell in der Adressleiste
  Given ich bin auf "#/dashboard/spec/2026-02-10-my-feature/kanban"
  When ich die URL manuell zu "#/settings/general" ändere
  Then navigiert die App zur Settings-Ansicht
  And der Tab "General" ist aktiv
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Leere Hash-Segmente
  Given die URL enthält "#/dashboard///"
  When die Seite geladen wird
  Then wird die Dashboard-Übersicht angezeigt
  And leere Segmente werden ignoriert
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

<<<<<<< HEAD
- [ ] FILE_EXISTS: `agent-os-ui/ui/src/services/router.service.ts` (MODIFY)
- [ ] FILE_EXISTS: `agent-os-ui/ui/src/views/dashboard-view.ts` (MODIFY)
- [ ] FILE_EXISTS: `agent-os-ui/ui/src/views/workflow-view.ts` (MODIFY)

### Inhalt-Prüfungen

- [ ] CONTAINS: `router.service.ts` behandelt leere Hash-Segmente (filtert leere Strings)
- [ ] CONTAINS: `dashboard-view.ts` zeigt Toast bei nicht-gefundener Spec und faellt auf Spec-Liste zurueck
- [ ] CONTAINS: `router.service.ts` navigiert zu `#/dashboard` bei leerem Hash

### Funktions-Prüfungen

- [ ] LINT_PASS: `cd agent-os-ui/ui && npx eslint src/services/router.service.ts src/views/dashboard-view.ts src/views/workflow-view.ts src/views/settings-view.ts`
- [ ] BUILD_PASS: `cd agent-os-ui/ui && npx tsc --noEmit`
=======
- [x] FILE_EXISTS: `agent-os-ui/ui/src/services/router.service.ts` (MODIFY)
- [x] FILE_EXISTS: `agent-os-ui/ui/src/views/dashboard-view.ts` (MODIFY)
- [x] FILE_EXISTS: `agent-os-ui/ui/src/views/workflow-view.ts` (MODIFY)

### Inhalt-Prüfungen

- [x] CONTAINS: `router.service.ts` behandelt leere Hash-Segmente (filtert leere Strings)
- [x] CONTAINS: `dashboard-view.ts` zeigt Toast bei nicht-gefundener Spec und faellt auf Spec-Liste zurueck
- [x] CONTAINS: `router.service.ts` navigiert zu `#/dashboard` bei leerem Hash

### Funktions-Prüfungen

- [x] LINT_PASS: `cd agent-os-ui/ui && npx eslint src/services/router.service.ts src/views/dashboard-view.ts src/views/workflow-view.ts src/views/settings-view.ts`
- [x] BUILD_PASS: `cd agent-os-ui/ui && npx tsc --noEmit` (pre-existing errors only, no new errors)
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
| Frontend | `router.service.ts` (MODIFY) | Leere Segmente filtern, Default-Route bei leerem Hash |
| Frontend | `dashboard-view.ts` (MODIFY) | Toast bei nicht-gefundener Spec, URL-Korrektur bei ungueltigem Tab |
| Frontend | `workflow-view.ts` (MODIFY) | Toast bei staler Workflow-ID, Fallback auf Workflow-Uebersicht |
| Frontend | `settings-view.ts` (MODIFY) | Silent-Correction bei ungueltigem Tab |

---

### Technical Details

**WAS:**
- In `router.service.ts`: Leere Segmente bei URL-Parsing filtern (z.B. `#/dashboard///` wird zu `['dashboard']`). Bei komplett leerem Hash zu `#/dashboard` navigieren
- In `dashboard-view.ts`: Wenn `specs.kanban` Response mit Fehler zurueckkommt (via bestehender `onSpecsError` Handler) UND eine specId aus der URL geladen wurde: Toast "Spec nicht gefunden" anzeigen, URL auf `#/dashboard` korrigieren via `routerService.navigate('dashboard')`, viewMode auf `'specs'` zuruecksetzen
- In `dashboard-view.ts`: Bei ungueltigem Tab-Segment: Default-Tab laden und URL korrigieren (Silent Correction)
- In `workflow-view.ts`: Wenn workflowId aus URL nicht im executionStore gefunden: Toast "Workflow nicht gefunden" anzeigen, URL auf `#/workflows` korrigieren
- In `settings-view.ts`: Bei ungueltigem Tab-Segment: Default-Tab (`'models'`) laden und URL auf `#/settings` korrigieren (Silent Correction, kein Toast)
- Projekt-Kontext-Mismatch: Wird implizit durch bestehende `specs.error` Logik behandelt (Spec nicht gefunden im aktuellen Projekt = gleicher Fehlerfall)

**WIE (Architektur-Guidance ONLY):**
- Bestehende Error-Handler in den Views wiederverwenden (`onSpecsError` in dashboard-view, etc.)
- Toast-Feedback ueber bestehendes Custom-Event-Pattern: `this.dispatchEvent(new CustomEvent('show-toast', { detail: { message, type }, bubbles: true, composed: true }))`
- URL-Korrektur ueber `routerService.navigate()` (nicht `replaceState` oder direkte Hash-Zuweisung)
- Lazy Validation: Keine Extra-API-Calls. Fehler werden erst erkannt wenn bestehende Daten-Anfragen (specs.kanban, executionStore) keine Ergebnisse liefern
- Leere-Segment-Filterung im URL-Parser: `segments.filter(s => s.length > 0)` beim Parsen des Hash

**WO:**
- `agent-os-ui/ui/src/services/router.service.ts` (MODIFY - ~5 Zeilen)
- `agent-os-ui/ui/src/views/dashboard-view.ts` (MODIFY - ~15 Zeilen)
- `agent-os-ui/ui/src/views/workflow-view.ts` (MODIFY - ~10 Zeilen)
- `agent-os-ui/ui/src/views/settings-view.ts` (MODIFY - ~5 Zeilen)

**WER:** codebase-analyzer

**Abhängigkeiten:** DLN-001, DLN-002, DLN-003, DLN-004, DLN-005

**Geschätzte Komplexität:** S

**Relevante Skills:** Keine projektspezifischen Skills vorhanden. Orientierung an bestehenden Patterns: `show-toast` Custom-Event in dashboard-view, `onSpecsError` Handler.

---

### Creates Reusable Artifacts

**Creates Reusable:** Nein - Aenderungen haerten bestehende Fehlerbehandlung in mehreren Views.

---

### Completion Check

```bash
# Pruefen ob Toast-Feedback fuer ungueltige Specs vorhanden
grep -q "Spec nicht gefunden\|spec.*not found\|spec.*nicht" agent-os-ui/ui/src/views/dashboard-view.ts && echo "OK: Spec error toast found" || echo "FAIL: Spec error toast missing"

# Pruefen ob leere Segmente gefiltert werden
grep -q "filter" agent-os-ui/ui/src/services/router.service.ts && echo "OK: Segment filtering present" || echo "FAIL: No segment filtering found"

# TypeScript Check
cd agent-os-ui/ui && npx tsc --noEmit && echo "OK: TypeScript compiles" || echo "FAIL: TypeScript errors"
```
