# Git Status-Leiste

> Story ID: GIT-002
> Spec: Git Integration UI
> Created: 2026-02-11
> Last Updated: 2026-02-11

**Priority**: Critical
**Type**: Frontend
**Estimated Effort**: 3 SP
**Dependencies**: GIT-001

---

## Feature

```gherkin
Feature: Git Status-Leiste
  Als Entwickler
  moechte ich den Git-Status meines Projekts jederzeit sehen,
  damit ich immer weiss in welchem Branch ich bin und ob es ungespeicherte Aenderungen gibt.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Status-Leiste zeigt Branch-Name

```gherkin
Scenario: Aktuellen Branch-Namen anzeigen
  Given ich habe ein Projekt mit Git-Repository geoeffnet
  And der aktuelle Branch ist "feature/login"
  When die Seite geladen wird
  Then sehe ich unterhalb der Projekt-Tabs eine Status-Leiste
  And der Branch-Name "feature/login" wird angezeigt
```

### Szenario 2: Ahead/Behind-Anzeige

```gherkin
Scenario: Ahead und Behind Zaehler anzeigen
  Given ich bin auf dem Branch "main"
  And ich habe 2 lokale Commits die nicht gepusht sind
  And es gibt 3 neue Commits auf dem Remote
  When ich die Status-Leiste betrachte
  Then sehe ich "2" mit einem Pfeil-nach-oben-Symbol
  And ich sehe "3" mit einem Pfeil-nach-unten-Symbol
```

### Szenario 3: Geaenderte Dateien Zaehler

```gherkin
Scenario: Anzahl geaenderter Dateien anzeigen
  Given ich habe 5 Dateien im Projekt geaendert
  When ich die Status-Leiste betrachte
  Then sehe ich "5 changed" in der Status-Leiste
```

### Szenario 4: Action Buttons sichtbar

```gherkin
Scenario: Action Buttons werden angezeigt
  Given ich habe ein Projekt mit Git-Repository geoeffnet
  When ich die Status-Leiste betrachte
  Then sehe ich Buttons fuer "Pull", "Push", "Commit" und "Refresh"
```

### Szenario 5: Manueller Refresh

```gherkin
Scenario: Git-Status manuell aktualisieren
  Given ich habe die Status-Leiste vor mir
  And seit dem letzten Laden hat sich der Status geaendert
  When ich auf den Refresh-Button klicke
  Then wird der Git-Status neu geladen
  And die Anzeige wird aktualisiert
```

### Szenario 6: Projektwechsel aktualisiert Status

```gherkin
Scenario: Status-Leiste aktualisiert sich bei Projektwechsel
  Given ich habe Projekt A geoeffnet auf Branch "main"
  When ich zu Projekt B wechsle das auf Branch "develop" ist
  Then zeigt die Status-Leiste den Branch "develop" an
  And die Ahead/Behind und Changed Files Zaehler von Projekt B werden angezeigt
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Kein Git-Repository erkannt
  Given ich habe ein Projekt ohne Git-Repository geoeffnet
  When die Seite geladen wird
  Then wird keine Git-Status-Leiste angezeigt
  And ich sehe eine dezente Info-Meldung "Kein Git-Repository erkannt"
```

```gherkin
Scenario: Loading-State waehrend Git-Abfrage
  Given ich habe auf Refresh geklickt
  When die Git-Abfrage laeuft
  Then zeigt die Status-Leiste einen Loading-Zustand an
  And die Action Buttons sind deaktiviert
```

---

## Technische Verifikation (Automated Checks)

- [x] **FILE_EXISTS:** `agent-os-ui/ui/src/components/git/aos-git-status-bar.ts`
- [x] **CONTAINS:** `agent-os-ui/ui/src/gateway.ts` enthaelt `requestGitStatus`
- [x] **CONTAINS:** `agent-os-ui/ui/src/gateway.ts` enthaelt `requestGitBranches`
- [x] **CONTAINS:** `agent-os-ui/ui/src/app.ts` enthaelt `aos-git-status-bar`
- [x] **CONTAINS:** `agent-os-ui/ui/src/components/git/aos-git-status-bar.ts` enthaelt `class AosGitStatusBar`
- [x] **CONTAINS:** `agent-os-ui/ui/src/components/git/aos-git-status-bar.ts` enthaelt `createRenderRoot`
- [x] **CONTAINS:** `agent-os-ui/ui/src/styles/theme.css` enthaelt `git-status-bar`
- [x] **BUILD_PASS:** `cd agent-os-ui && npm run build`

---

## Required MCP Tools

Keine MCP Tools erforderlich.

---

## Technisches Refinement (vom Architect)

### DoR (Definition of Ready) - Vom Architect

#### Fachliche Anforderungen
- [x] Fachliche requirements klar definiert
- [x] Akzeptanzkriterien sind spezifisch und pruefbar
- [x] Business Value verstanden

#### Technische Vorbereitung
- [x] Technischer Ansatz definiert (WAS/WIE/WO)
- [x] Abhaengigkeiten identifiziert
- [x] Betroffene Komponenten bekannt
- [x] Erforderliche MCP Tools dokumentiert (falls zutreffend)
- [x] Story ist angemessen geschaetzt (max 5 Dateien, 400 LOC)

#### Full-Stack Konsistenz (NEU)
- [x] Alle betroffenen Layer identifiziert
- [x] Integration Type bestimmt
- [x] Kritische Integration Points dokumentiert (wenn Full-stack)
- [x] Handover-Dokumente definiert (bei Multi-Layer)

---

### DoD (Definition of Done) - Vom Architect

- [x] Code implemented and follows Style Guide
- [x] Architecture requirements met (Light DOM Lit Component, Gateway Singleton Pattern)
- [x] All acceptance criteria met (Branch-Name, Ahead/Behind, Changed Files, Action Buttons, Refresh, Projektwechsel)
- [x] No linting errors (`cd agent-os-ui && npm run lint`)
- [x] Status bar renders below project tabs in `app.ts`
- [x] Git status data flows: Gateway WebSocket -> app.ts state -> aos-git-status-bar properties
- [x] Loading state shown during git queries
- [x] "Kein Git-Repository" message shown for non-git projects
- [x] Buttons disabled during loading
- [x] CSS uses Custom Properties from theme.css
- [x] Completion Check commands successful

---

### Betroffene Layer & Komponenten

- **Integration Type:** Full-stack (Frontend Components + Gateway + Backend via GIT-001)

| Layer | Komponenten | Aenderung |
|-------|-------------|-----------|
| Presentation | `aos-git-status-bar.ts` | **NEU** - Lit Web Component fuer Git Status Anzeige |
| Presentation | `app.ts` | **ERWEITERN** - Git-Status-Bar Template, State Properties, Event Handler |
| Presentation | `theme.css` | **ERWEITERN** - CSS Custom Properties fuer Git Status-Leiste |
| Service Layer | `gateway.ts` | **ERWEITERN** - Neue Methoden `requestGitStatus()`, `requestGitBranches()` und Message Handler |

**Kritische Integration Points:**
- `app.ts` muss auf Projektwechsel-Events reagieren und Git-Status neu laden
- `gateway.ts` muss `git:status:response` und `git:branches:response` Messages an die korrekte Callback-Funktion weiterleiten
- `aos-git-status-bar` empfaengt Daten ausschliesslich ueber Properties von `app.ts` (kein direkter Gateway-Zugriff)

---

### Technical Details

- **WAS:**
  - Neue Lit Web Component `aos-git-status-bar` mit Branch-Anzeige, Ahead/Behind-Zaehler, Changed Files Count, und Action Buttons (Pull, Push, Commit, Refresh)
  - Erweiterung `gateway.ts` um `requestGitStatus()` und `requestGitBranches()` Methoden plus Response-Handler
  - Erweiterung `app.ts` um Git-State-Properties, Template-Integration der Status-Leiste, Event-Handler fuer Git-Aktionen
  - Erweiterung `theme.css` um CSS-Klassen fuer `.git-status-bar` und zugehoerige Elemente

- **WIE:**
  - **Light DOM Pattern:** `aos-git-status-bar` nutzt `createRenderRoot() { return this; }` wie alle bestehenden `aos-*` Components
  - **Gateway Singleton Pattern:** Git-Methoden als neue Methoden der bestehenden Gateway-Klasse hinzufuegen; Message-Handler im bestehenden `onMessage` Switch ergaenzen
  - **State in app.ts:** Git-Status-Daten als reactive Properties in `app.ts` halten, per Property Binding an `aos-git-status-bar` weiterreichen
  - **Event Flow:** Status-Bar dispatcht Custom Events (`refresh-git`, `open-commit-dialog`, `pull-git`, `push-git`), `app.ts` faengt diese ab und ruft Gateway-Methoden auf
  - **CSS Custom Properties:** Styling ueber `theme.css` Variablen (`--git-status-*`), Konsistenz mit bestehendem Dark Theme
  - **Projektwechsel:** Listener auf bestehendes `project-changed` Event, laedt Git-Status beim Wechsel neu

- **WO:**
  - `agent-os-ui/ui/src/components/git/aos-git-status-bar.ts` (NEU)
  - `agent-os-ui/ui/src/gateway.ts` (ERWEITERN)
  - `agent-os-ui/ui/src/app.ts` (ERWEITERN)
  - `agent-os-ui/ui/src/styles/theme.css` (ERWEITERN)

- **WER:** dev-team__frontend-developer

- **Abhaengigkeiten:** GIT-001 (Backend API muss vorhanden sein, damit WebSocket-Nachrichten beantwortet werden)

- **Geschaetzte Komplexitaet:** M

### Relevante Skills

| Skill | Pfad | Grund |
|-------|------|-------|
| Light DOM Lit Components | Referenz: alle `aos-*` Components in `ui/src/components/` | Pattern fuer neue Component-Erstellung |
| Gateway Singleton Pattern | Referenz: `ui/src/gateway.ts` | Pattern fuer neue WebSocket-Methoden |
| CSS Custom Properties | Referenz: `ui/src/styles/theme.css` | Konsistentes Dark Theme Styling |

---

### Creates Reusable Artifacts

**Ja**

| Artifact | Typ | Wiederverwendbar fuer |
|----------|-----|----------------------|
| `aos-git-status-bar` | UI Component | Wird von GIT-003 (Branch-Dropdown) und GIT-005 (Pull/Push Buttons) erweitert |
| Gateway Git Methods | Gateway Extension | Wird von GIT-003, GIT-004, GIT-005 fuer weitere Git-Operationen genutzt |

---

### Completion Check

```bash
# Verify new component file exists
test -f agent-os-ui/ui/src/components/git/aos-git-status-bar.ts && echo "PASS: status-bar component exists" || echo "FAIL"

# Verify Light DOM pattern
grep -q "createRenderRoot" agent-os-ui/ui/src/components/git/aos-git-status-bar.ts && echo "PASS: Light DOM pattern" || echo "FAIL"

# Verify gateway extensions
grep -q "requestGitStatus" agent-os-ui/ui/src/gateway.ts && echo "PASS: gateway requestGitStatus" || echo "FAIL"
grep -q "requestGitBranches" agent-os-ui/ui/src/gateway.ts && echo "PASS: gateway requestGitBranches" || echo "FAIL"

# Verify app.ts integration
grep -q "aos-git-status-bar" agent-os-ui/ui/src/app.ts && echo "PASS: app.ts integration" || echo "FAIL"

# Verify theme.css extensions
grep -q "git-status-bar" agent-os-ui/ui/src/styles/theme.css && echo "PASS: theme.css git styles" || echo "FAIL"

# Build check
cd agent-os-ui && npm run build && echo "PASS: build successful" || echo "FAIL: build failed"
```
