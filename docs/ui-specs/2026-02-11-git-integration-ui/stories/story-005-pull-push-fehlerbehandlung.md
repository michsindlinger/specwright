# Pull, Push und Fehlerbehandlung

> Story ID: GIT-005
> Spec: Git Integration UI
> Created: 2026-02-11
> Last Updated: 2026-02-11

**Priority**: High
**Type**: Frontend
**Estimated Effort**: 3 SP
**Dependencies**: GIT-002

---

## Feature

```gherkin
Feature: Pull, Push und Fehlerbehandlung
  Als Entwickler
  moechte ich Pull und Push direkt aus der Web UI ausfuehren koennen,
  damit ich meinen Code mit dem Remote-Repository synchronisieren kann ohne ins Terminal zu wechseln.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Normaler Pull

```gherkin
Scenario: Erfolgreicher Git Pull
  Given ich bin auf dem Branch "main"
  And es gibt 3 neue Commits auf dem Remote
  When ich auf den Pull-Button klicke
  Then wird ein "git pull" ausgefuehrt
  And die Status-Leiste zeigt "0 behind" an
  And ich sehe eine Erfolgsmeldung "Pull erfolgreich: 3 Commits"
```

### Szenario 2: Pull mit Rebase

```gherkin
Scenario: Git Pull mit Rebase-Option
  Given ich bin auf dem Branch "feature/login"
  And ich habe lokale Commits und Remote hat neue Commits
  When ich die Rebase-Option am Pull-Button waehle
  Then wird ein "git pull --rebase" ausgefuehrt
  And die Status-Leiste wird aktualisiert
```

### Szenario 3: Erfolgreicher Push

```gherkin
Scenario: Erfolgreicher Git Push
  Given ich bin auf dem Branch "main"
  And ich habe 2 lokale Commits die nicht gepusht sind
  When ich auf den Push-Button klicke
  Then wird ein "git push" ausgefuehrt
  And die Status-Leiste zeigt "0 ahead" an
  And ich sehe eine Erfolgsmeldung "Push erfolgreich: 2 Commits"
```

### Szenario 4: Loading-State waehrend Operation

```gherkin
Scenario: Buttons deaktiviert waehrend laufender Operation
  Given ich habe auf den Pull-Button geklickt
  When die Pull-Operation laeuft
  Then sind alle Git-Buttons (Pull, Push, Commit, Refresh) deaktiviert
  And ich sehe einen Loading-Indikator
  And nach Abschluss werden die Buttons wieder aktiviert
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Merge-Konflikt bei Pull
  Given es gibt Aenderungen auf dem Remote die mit meinen lokalen Aenderungen kollidieren
  When ich einen Pull ausfuehre
  Then sehe ich eine Fehlermeldung "Merge-Konflikte erkannt"
  And der Hinweis "Bitte Konflikte ausserhalb der Anwendung loesen" wird angezeigt
  And die Status-Leiste zeigt den Konflikt-Zustand
```

```gherkin
Scenario: Push ohne Remote-Repository
  Given mein Projekt hat kein Remote-Repository konfiguriert
  When ich auf Push klicke
  Then sehe ich eine Fehlermeldung "Kein Remote-Repository konfiguriert"
```

```gherkin
Scenario: Netzwerk nicht erreichbar
  Given das Remote-Repository ist nicht erreichbar
  When ich Pull oder Push ausfuehre
  Then sehe ich nach einem Timeout eine Fehlermeldung "Remote nicht erreichbar"
  And die Buttons werden wieder aktiviert
```

```gherkin
Scenario: Nichts zum Pushen
  Given ich habe 0 lokale Commits die nicht gepusht sind
  When ich auf Push klicke
  Then sehe ich eine Info-Meldung "Nichts zum Pushen - alles aktuell"
```

```gherkin
Scenario: Nichts zum Pullen
  Given es gibt keine neuen Commits auf dem Remote
  When ich auf Pull klicke
  Then sehe ich eine Info-Meldung "Bereits aktuell"
```

---

## Technische Verifikation (Automated Checks)

- [ ] **CONTAINS:** `agent-os-ui/ui/src/gateway.ts` enthaelt `sendGitPull`
- [ ] **CONTAINS:** `agent-os-ui/ui/src/gateway.ts` enthaelt `sendGitPush`
- [ ] **CONTAINS:** `agent-os-ui/ui/src/components/git/aos-git-status-bar.ts` enthaelt `pull` Button-Logik
- [ ] **CONTAINS:** `agent-os-ui/ui/src/components/git/aos-git-status-bar.ts` enthaelt `push` Button-Logik
- [ ] **CONTAINS:** `agent-os-ui/ui/src/components/git/aos-git-status-bar.ts` enthaelt `rebase` Option
- [ ] **CONTAINS:** `agent-os-ui/ui/src/components/git/aos-git-status-bar.ts` enthaelt `disabled` oder `loading` Logik
- [ ] **BUILD_PASS:** `cd agent-os-ui && npm run build`

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

- [ ] Code implemented and follows Style Guide
- [ ] Architecture requirements met (Event-based communication, Toast Notification integration)
- [ ] All acceptance criteria met (Pull normal, Pull rebase, Push, Loading-State, Error Handling)
- [ ] No linting errors (`cd agent-os-ui && npm run lint`)
- [ ] Pull-Button mit Rebase-Option (Klick = normal pull, Dropdown/Option = rebase)
- [ ] Push-Button (kein Force Push)
- [ ] Alle Buttons disabled waehrend laufender Operation (Operation-Lock)
- [ ] Erfolgsmeldungen als Toast Notifications
- [ ] Fehlermeldungen (Merge-Konflikte, kein Remote, Netzwerk) als Toast Notifications mit Error-Level
- [ ] Status-Leiste wird nach Pull/Push automatisch refreshed
- [ ] Completion Check commands successful

---

### Betroffene Layer & Komponenten

- **Integration Type:** Frontend-only (erweitert bestehende Components + Gateway)

| Layer | Komponenten | Aenderung |
|-------|-------------|-----------|
| Presentation | `aos-git-status-bar.ts` | **ERWEITERN** - Pull/Push Button Handler, Rebase-Option, Loading-State, Operation-Lock |
| Presentation | `app.ts` | **ERWEITERN** - Event Handler fuer pull/push Events, Toast Notification Integration |
| Service Layer | `gateway.ts` | **ERWEITERN** - Neue Methoden `sendGitPull(rebase?)`, `sendGitPush()` und Response Handler |

**Kritische Integration Points:**
- Pull/Push Button-Klick in `aos-git-status-bar` -> Custom Events -> `app.ts` -> Gateway -> WebSocket -> Backend
- Backend Response (Erfolg/Fehler) -> Gateway Response Handler -> `app.ts` State Update -> Toast Notification + Status-Leiste Refresh
- Operation-Lock: Waehrend Pull/Push laeuft, muessen ALLE Git-Buttons disabled sein (Pull, Push, Commit, Refresh)
- Toast Notifications: Wiederverwendung der bestehenden `toast-notification.ts` Component

---

### Technical Details

- **WAS:**
  - Erweiterung `aos-git-status-bar` um Pull/Push Button-Handler, Rebase-Option am Pull-Button, Loading-State und Operation-Lock Logik
  - Erweiterung `app.ts` um Event-Handler fuer `pull-git` und `push-git` Events, Toast Notification Dispatch nach Erfolg/Fehler
  - Erweiterung `gateway.ts` um `sendGitPull(rebase?: boolean)` und `sendGitPush()` Methoden plus Response Handler

- **WIE:**
  - **Pull-Button Pattern:** Klick auf Pull-Button fuehrt normales `git pull` aus; kleiner Dropdown-Pfeil neben dem Button ermoeglicht Auswahl von `git pull --rebase`
  - **Push-Button:** Einfacher Button, kein Force Push (explizit ausgeschlossen)
  - **Operation-Lock Pattern:** Reactive Property `isOperationRunning` in `aos-git-status-bar`; wenn `true`, alle Buttons erhalten `disabled` Attribut. Wird von `app.ts` via Property gesetzt.
  - **Loading Indicator:** Waehrend Operation laeuft, zeigt ein Spinner/Animation den Loading-Zustand an
  - **Toast Notification Integration:** `app.ts` dispatcht nach Gateway-Response ein Custom Event fuer die bestehende `toast-notification.ts` Component (success/error/info)
  - **Error Handling Mapping:** Backend-Fehler werden in benutzerfreundliche Meldungen uebersetzt: Merge-Konflikte -> "Bitte Konflikte ausserhalb der Anwendung loesen", kein Remote -> "Kein Remote-Repository konfiguriert", Netzwerk -> "Remote nicht erreichbar"
  - **Auto-Refresh:** Nach Pull/Push Erfolg automatisch `gateway.requestGitStatus()` aufrufen

- **WO:**
  - `agent-os-ui/ui/src/components/git/aos-git-status-bar.ts` (ERWEITERN)
  - `agent-os-ui/ui/src/app.ts` (ERWEITERN)
  - `agent-os-ui/ui/src/gateway.ts` (ERWEITERN)

- **WER:** dev-team__frontend-developer

- **Abhaengigkeiten:** GIT-002 (Status-Leiste mit Pull/Push Buttons muss existieren; Toast Notification Component muss vorhanden sein)

- **Geschaetzte Komplexitaet:** M

### Relevante Skills

| Skill | Pfad | Grund |
|-------|------|-------|
| Light DOM Lit Components | Referenz: alle `aos-*` Components in `ui/src/components/` | Erweitert bestehende Component |
| Gateway Singleton Pattern | Referenz: `ui/src/gateway.ts` | Pattern fuer sendGitPull/Push Methoden |
| Toast Notification Pattern | Referenz: `ui/src/components/toast-notification.ts` | Wiederverwendung fuer Erfolg/Fehler Feedback |

---

### Creates Reusable Artifacts

**Nein** - Erweitert nur bestehende Komponenten. Operation-Lock Pattern kann als Referenz fuer zukuenftige langlaufende Operationen dienen.

---

### Completion Check

```bash
# Verify gateway pull/push methods
grep -q "sendGitPull" agent-os-ui/ui/src/gateway.ts && echo "PASS: gateway sendGitPull" || echo "FAIL"
grep -q "sendGitPush" agent-os-ui/ui/src/gateway.ts && echo "PASS: gateway sendGitPush" || echo "FAIL"

# Verify pull button logic in status bar
grep -q "pull" agent-os-ui/ui/src/components/git/aos-git-status-bar.ts && echo "PASS: pull button logic" || echo "FAIL"

# Verify push button logic in status bar
grep -q "push" agent-os-ui/ui/src/components/git/aos-git-status-bar.ts && echo "PASS: push button logic" || echo "FAIL"

# Verify rebase option
grep -q "rebase" agent-os-ui/ui/src/components/git/aos-git-status-bar.ts && echo "PASS: rebase option" || echo "FAIL"

# Verify loading/disabled state
grep -q "disabled\|loading\|isOperationRunning" agent-os-ui/ui/src/components/git/aos-git-status-bar.ts && echo "PASS: loading state" || echo "FAIL"

# Build check
cd agent-os-ui && npm run build && echo "PASS: build successful" || echo "FAIL: build failed"
```
