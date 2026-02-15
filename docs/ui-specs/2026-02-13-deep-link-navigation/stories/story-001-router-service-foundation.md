# Router Service Foundation

> Story ID: DLN-001
> Spec: Deep Link Navigation
> Created: 2026-02-13
> Last Updated: 2026-02-13

**Priority**: Critical
**Type**: Frontend
**Estimated Effort**: S
**Dependencies**: None

---

## Feature

```gherkin
Feature: Router Service Foundation
  Als Entwickler der Agent OS Web UI
  möchte ich einen zentralen Router-Service der Hash-Segment-URLs parst und verwaltet,
  damit alle Views einheitlich Deep Links unterstützen können.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Einfache View-Navigation über URL

```gherkin
Scenario: Navigation zur Dashboard-View über URL
  Given die Anwendung ist gestartet
  When die URL "#/dashboard" im Browser aufgerufen wird
  Then wird die Dashboard-Ansicht angezeigt
  And die Sidebar markiert "Dashboard" als aktiv
```

### Szenario 2: Segment-basierte URL wird korrekt geparst

```gherkin
Scenario: URL mit Segmenten wird korrekt interpretiert
  Given die Anwendung ist gestartet
  When die URL "#/dashboard/spec/2026-02-10-my-feature/kanban" aufgerufen wird
  Then wird die Dashboard-Ansicht geladen
  And die Spec "2026-02-10-my-feature" wird als Parameter erkannt
  And der Tab "kanban" wird als Parameter erkannt
```

### Szenario 3: Programmatische Navigation aktualisiert URL

```gherkin
Scenario: Navigation per Code aktualisiert die Browser-URL
  Given ich bin auf der Dashboard-Ansicht
  When eine programmatische Navigation zu Settings ausgelöst wird
  Then ändert sich die Browser-URL zu "#/settings"
  And die Settings-Ansicht wird angezeigt
```

### Szenario 4: Browser-History funktioniert

```gherkin
Scenario: Zurück-Button navigiert zur vorherigen Ansicht
  Given ich war auf der Dashboard-Ansicht
  And ich bin danach zur Settings-Ansicht navigiert
  When ich den Zurück-Button im Browser drücke
  Then kehre ich zur Dashboard-Ansicht zurück
  And die URL zeigt wieder "#/dashboard"
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Leerer Hash wird zum Default aufgelöst
  Given die Anwendung wird ohne Hash in der URL gestartet
  When die Seite geladen wird
  Then wird automatisch zu "#/dashboard" navigiert
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

<<<<<<< HEAD
- [ ] FILE_EXISTS: `agent-os-ui/ui/src/services/router.service.ts`
- [ ] FILE_EXISTS: `agent-os-ui/ui/src/types/route.types.ts`

### Inhalt-Prüfungen

- [ ] CONTAINS: `router.service.ts` exportiert `routerService` Singleton-Instanz
- [ ] CONTAINS: `route.types.ts` definiert `ParsedRoute` Interface und Route-Konstanten
- [ ] CONTAINS: `router.service.ts` enthält `on()`/`off()` Event-Subscription-Methoden
- [ ] CONTAINS: `router.service.ts` enthält `navigate()` Methode
- [ ] CONTAINS: `app.ts` importiert `routerService` und subscribed auf Route-Events
- [ ] CONTAINS: `app.ts` ruft nicht mehr direkt `window.location.hash` in `handleHashChange` auf

### Funktions-Prüfungen

- [ ] LINT_PASS: `cd agent-os-ui/ui && npx eslint src/services/router.service.ts src/types/route.types.ts`
- [ ] BUILD_PASS: `cd agent-os-ui/ui && npx tsc --noEmit`
=======
- [x] FILE_EXISTS: `agent-os-ui/ui/src/services/router.service.ts`
- [x] FILE_EXISTS: `agent-os-ui/ui/src/types/route.types.ts`

### Inhalt-Prüfungen

- [x] CONTAINS: `router.service.ts` exportiert `routerService` Singleton-Instanz
- [x] CONTAINS: `route.types.ts` definiert `ParsedRoute` Interface und Route-Konstanten
- [x] CONTAINS: `router.service.ts` enthält `on()`/`off()` Event-Subscription-Methoden
- [x] CONTAINS: `router.service.ts` enthält `navigate()` Methode
- [x] CONTAINS: `app.ts` importiert `routerService` und subscribed auf Route-Events
- [x] CONTAINS: `app.ts` ruft nicht mehr direkt `window.location.hash` in `handleHashChange` auf

### Funktions-Prüfungen

- [x] LINT_PASS: `cd agent-os-ui/ui && npx eslint src/services/router.service.ts src/types/route.types.ts`
- [x] BUILD_PASS: `cd agent-os-ui/ui && npx tsc --noEmit`
>>>>>>> 40e0947e98a8772e353d077cd90b75981a13b604

---

## Required MCP Tools

Keine MCP Tools erforderlich.

---

## Technisches Refinement (vom Architect)

> **WICHTIG:** Dieser Abschnitt wird vom Architect ausgefüllt

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
| Frontend | `router.service.ts` (NEU) | Neuer Singleton-Service: URL-Parsing, Route-Matching, Event-Emission, Navigation |
| Frontend | `route.types.ts` (NEU) | Typ-Definitionen: ParsedRoute, RouteParams, Route-Konstanten |
| Frontend | `app.ts` (MODIFY) | Hash-Handler durch Router-Service ersetzen, Route-Subscription |

---

### Technical Details

**WAS:**
- Neuen `RouterService` als Singleton erstellen mit: URL-Parsing (`#/view/param1/param2`), Route-Matching, programmatischer Navigation (`navigate()`), Event-Emission bei Route-Changes
- Neue Typ-Definitionen für Routes erstellen (ParsedRoute-Interface, ViewType-Union, RouteParams)
- In `app.ts` den bestehenden `handleHashChange()`-Mechanismus und `navigateTo()` durch den Router-Service ersetzen
- Alle drei direkten `window.location.hash`-Zuweisungen im Codebase durch `routerService.navigate()` ersetzen (app.ts Zeile 438, 635 und dashboard-view.ts Zeile 1217)

**WIE (Architektur-Guidance ONLY):**
- Singleton-Pattern von `projectStateService` folgen: Klasse definieren, am Ende `export const routerService = new RouterService()` exportieren
- Event-Pattern von `gateway.on()`/`gateway.off()` folgen: `Map<string, Set<Handler>>` intern, public `on(type, handler)` und `off(type, handler)` Methoden
- `window.addEventListener('hashchange', ...)` im Service selbst registrieren (nicht in app.ts)
- Pending-Navigation-Flag verwenden um Infinite-Loop-Prevention zu garantieren (wenn neuer Hash = aktueller State, Processing ueberspringen)
- URL-Parsing ist synchron, keine async Operationen im Router
- Route-Type Union: `'dashboard' | 'chat' | 'workflows' | 'settings' | 'not-found'` (bestehende Route-Definition aus app.ts uebernehmen)
- ParsedRoute muss `view`, `params` (Record<string, string>) und optional `segments` (string[]) enthalten

**WO:**
- `agent-os-ui/ui/src/services/router.service.ts` (NEU)
- `agent-os-ui/ui/src/types/route.types.ts` (NEU)
- `agent-os-ui/ui/src/app.ts` (MODIFY - ~30 Zeilen: Hash-Handler entfernen, Router-Import, Route-Subscription)

**WER:** codebase-analyzer

**Abhängigkeiten:** None

**Geschätzte Komplexität:** S

**Relevante Skills:** Keine projektspezifischen Skills vorhanden. Orientierung an bestehenden Patterns: `project-state.service.ts` (Singleton), `gateway.ts` (Event-Pattern).

---

### Creates Reusable Artifacts

**Creates Reusable:** Ja - `router.service.ts` ist ein wiederverwendbarer Singleton-Service, der von allen Views importiert wird. `route.types.ts` definiert geteilte Typ-Definitionen.

---

### Completion Check

```bash
# Pruefen ob neue Dateien existieren
test -f agent-os-ui/ui/src/services/router.service.ts && echo "OK: router.service.ts exists" || echo "FAIL: router.service.ts missing"
test -f agent-os-ui/ui/src/types/route.types.ts && echo "OK: route.types.ts exists" || echo "FAIL: route.types.ts missing"

# Pruefen ob Router-Service in app.ts importiert wird
grep -q "routerService" agent-os-ui/ui/src/app.ts && echo "OK: routerService imported in app.ts" || echo "FAIL: routerService not found in app.ts"

# Pruefen ob keine direkten window.location.hash Zuweisungen mehr existieren (ausser im Router-Service selbst)
HASH_ASSIGNMENTS=$(grep -rn "window.location.hash\s*=" agent-os-ui/ui/src/ --include="*.ts" | grep -v "router.service.ts" | wc -l)
test "$HASH_ASSIGNMENTS" -eq 0 && echo "OK: No direct hash assignments outside router" || echo "FAIL: $HASH_ASSIGNMENTS direct hash assignments found"

# TypeScript Check
cd agent-os-ui/ui && npx tsc --noEmit && echo "OK: TypeScript compiles" || echo "FAIL: TypeScript errors"
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Aenderungen
