# Settings Deep Links

> Story ID: DLN-005
> Spec: Deep Link Navigation
> Created: 2026-02-13
> Last Updated: 2026-02-13

**Priority**: Medium
**Type**: Frontend
**Estimated Effort**: XS
**Dependencies**: DLN-001

**Integration:** router.service → settings-view (Route-Parameter lesen/schreiben)

---

## Feature

```gherkin
Feature: Settings Deep Links
  Als Entwickler
  möchte ich dass der aktive Settings-Tab in der URL abgebildet wird,
  damit ich nach einem Reload direkt im richtigen Settings-Bereich lande.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Tab-Wechsel aktualisiert URL

```gherkin
Scenario: URL wird bei Tab-Wechsel in Settings aktualisiert
  Given ich bin in den Settings
  And der Tab "Models" ist aktiv
  When ich zum Tab "General" wechsle
  Then ändert sich die URL zu "#/settings/general"
```

### Szenario 2: Page Reload behält Tab-Auswahl

```gherkin
Scenario: Settings-Tab bleibt nach Reload erhalten
  Given die URL ist "#/settings/general"
  When ich die Seite neu lade
  Then sehe ich die Settings-Ansicht
  And der Tab "General" ist aktiv
```

### Szenario 3: Default-Tab ohne Segment

```gherkin
Scenario: Settings ohne Tab-Segment zeigt Default-Tab
  Given die URL ist "#/settings"
  When die Seite geladen wird
  Then wird der Standard-Tab angezeigt
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Ungültiger Tab-Name in URL
  Given die URL enthält "#/settings/nicht-existierender-tab"
  When die Seite geladen wird
  Then wird der Standard-Tab angezeigt
  And die URL wird korrigiert zu "#/settings"
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [ ] FILE_EXISTS: `agent-os-ui/ui/src/views/settings-view.ts` (MODIFY)

### Inhalt-Prüfungen

- [ ] CONTAINS: `settings-view.ts` importiert `routerService` aus `../services/router.service.js`
- [ ] CONTAINS: `settings-view.ts` ruft `routerService.navigate()` bei Tab-Wechsel auf
- [ ] CONTAINS: `settings-view.ts` liest `tab`-Parameter aus Route in `connectedCallback`

### Funktions-Prüfungen

- [ ] LINT_PASS: `cd agent-os-ui/ui && npx eslint src/views/settings-view.ts`
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
| Frontend | `settings-view.ts` (MODIFY) | Tab-Segment aus Route lesen bei Mount, URL bei Tab-Wechsel updaten, Route-Change-Subscription |

---

### Technical Details

**WAS:**
- Bei `connectedCallback`: Route-Params aus `routerService` lesen. Wenn `tab`-Parameter vorhanden und gueltig (`'models'` | `'general'` | `'appearance'`), `activeSection` entsprechend setzen
- Bei `handleSectionChange()`: URL mit `routerService.navigate('settings', { tab: section })` updaten
- Route-Change-Subscription fuer Browser Back/Forward
- Bei ungueltigem Tab-Segment: Silent-Correction auf Default-Tab (`'models'`)

**WIE (Architektur-Guidance ONLY):**
- `routerService.on('route-changed', handler)` Pattern verwenden
- Bestehende `SettingsSection` Type (`'models' | 'general' | 'appearance'`) fuer Tab-Validierung nutzen
- `handleSectionChange()` Methode erweitern (nicht ersetzen): nach `this.activeSection = section` zusaetzlich `routerService.navigate()` aufrufen
- Bei Route-Change: nur reagieren wenn view === 'settings', dann tab-Param lesen und `activeSection` setzen
- Default-Tab ist `'models'` (bestehender Default-Wert der `activeSection` State-Property)

**WO:**
- `agent-os-ui/ui/src/views/settings-view.ts` (MODIFY - ~10 Zeilen hinzugefuegt)

**WER:** codebase-analyzer

**Abhängigkeiten:** DLN-001

**Geschätzte Komplexität:** XS

**Relevante Skills:** Keine projektspezifischen Skills vorhanden. Orientierung an bestehenden Patterns: `settings-view.ts` `setupHandlers()`/`removeHandlers()` Methoden, `handleSectionChange()`.

---

### Creates Reusable Artifacts

**Creates Reusable:** Nein - Aenderungen sind spezifisch fuer settings-view.

---

### Completion Check

```bash
# Pruefen ob routerService in settings-view importiert wird
grep -q "routerService" agent-os-ui/ui/src/views/settings-view.ts && echo "OK: routerService imported" || echo "FAIL: routerService not found"

# Pruefen ob navigate() bei Tab-Wechsel aufgerufen wird
grep -q "routerService.navigate" agent-os-ui/ui/src/views/settings-view.ts && echo "OK: navigate() used" || echo "FAIL: navigate() not found"

# TypeScript Check
cd agent-os-ui/ui && npx tsc --noEmit && echo "OK: TypeScript compiles" || echo "FAIL: TypeScript errors"
```
