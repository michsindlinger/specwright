# Bug: Git Commit Dialog zeigt veraltete Dateien

> Bug ID: 2026-02-27-002
> Created: 2026-02-27
> Severity: Medium
> Status: Ready

**Priority**: Medium
**Type**: Bug - Frontend
**Affected Component**: aos-git-status-bar / aos-git-commit-dialog

---

## Bug Description

### Symptom
Beim Klick auf "Commit" in der Git-Leiste werden die geaenderten Dateien nicht aktuell angezeigt. Der Commit-Dialog zeigt veraltete Daten (letzter gecachter Git-Status).

### Reproduktion
1. Projekt in Specwright UI oeffnen
2. Dateien im Editor oder extern aendern
3. Auf "Commit" in der Git-Leiste klicken
4. Commit-Dialog zeigt keine oder veraltete geaenderte Dateien

### Expected vs. Actual
- **Expected:** Beim Oeffnen des Commit-Dialogs werden die geaenderten Dateien automatisch aktualisiert (spätestens bei Klick auf Commit)
- **Actual:** Dialog zeigt zuletzt gecachten Git-Status, Reload der Seite ist noetig

---

## User-Input (aus Step 2.5)

> Dokumentation des Benutzer-Wissens vor der RCA

**Hat User Vermutungen geteilt:** Nein

---

## Root-Cause-Analyse

### Hypothesen (vor Analyse)

| # | Hypothese | Wahrscheinlichkeit | Quelle | Pruefmethode |
|---|-----------|-------------------|--------|-------------|
| 1 | Kein `requestGitStatus()` beim Oeffnen des Commit-Dialogs | 60% | Agent | `_handleOpenCommitDialog()` pruefen |
| 2 | Kein periodisches Polling/File-Watching fuer Git Status | 25% | Agent | Nach Polling/Interval-Logik suchen |
| 3 | WebSocket-Nachricht wird nicht korrekt verarbeitet | 15% | Agent | Handler-Registrierung pruefen |

### Pruefung

**Hypothese 1 pruefen:** Kein `requestGitStatus()` beim Oeffnen des Commit-Dialogs
- Aktion: `_handleOpenCommitDialog()` in app.ts:1462-1467 analysiert
- Befund: Methode setzt nur `showCommitDialog = true`, `commitError = ''`, und `pendingAutoPush`. Kein Aufruf von `gateway.requestGitStatus()`. Dialog bekommt `this.gitStatus?.files ?? []` (Zeile 1946) - die zuletzt gecachten Daten.
- Ergebnis: BESTAETIGT
- Begruendung: Wenn User Dateien aendert und auf "Commit" klickt, zeigt Dialog alte Daten.

**Hypothese 2 (ergaenzend):** Kein periodisches Polling
- Aktion: Nach `setInterval`, `polling`, `watch` in app.ts gesucht
- Befund: Kein Polling implementiert. Git-Status wird nur geladen bei: Projekt-Wechsel, nach Git-Operationen, manuellem Refresh-Klick.
- Ergebnis: BESTAETIGT (verstaerkt das Problem)

### Root Cause

**Ursache:** `_handleOpenCommitDialog()` in `app.ts:1462` ruft keinen Git-Status-Refresh auf. Der Commit-Dialog zeigt die zuletzt gecachten `gitStatus.files` an.

**Beweis:** `_handleOpenCommitDialog()` (Zeile 1462-1467) enthaelt keinen Aufruf von `gateway.requestGitStatus()`. Die Daten fliessen ueber `this.gitStatus?.files ?? []` (Zeile 1946) rein-reaktiv, werden aber nie vor dem Dialog-Oeffnen aktualisiert.

**Betroffene Dateien:**
- `ui/frontend/src/app.ts`: `_handleOpenCommitDialog()` fehlt der Refresh-Call

---

## Feature (Bug-Fix)

```gherkin
Feature: Git Commit Dialog zeigt veraltete Dateien beheben
  Als Entwickler
  moechte ich dass der Commit-Dialog beim Oeffnen automatisch die geaenderten Dateien aktualisiert,
  damit ich immer die aktuelle Dateiliste sehe und nicht erst einen Reload machen muss.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Korrektes Verhalten (was vorher fehlschlug)

```gherkin
Scenario: Commit-Dialog zeigt aktuelle Dateien nach externen Aenderungen
  Given ich habe Dateien im Projekt extern geaendert
  And der letzte Git-Status-Fetch ist veraltet
  When ich auf "Commit" in der Git-Leiste klicke
  Then wird ein Git-Status-Refresh automatisch ausgeloest
  And der Commit-Dialog zeigt die aktuell geaenderten Dateien
```

### Szenario 2: Regression-Schutz

```gherkin
Scenario: Commit-Dialog funktioniert weiterhin nach erfolgreichen Git-Operationen
  Given ich habe gerade einen Commit durchgefuehrt
  And der Git-Status wurde nach dem Commit aktualisiert
  When ich erneut auf "Commit" klicke
  Then zeigt der Dialog die korrekte (leere oder neue) Dateiliste
```

---

## Technische Verifikation

- [ ] BUG_FIXED: `_handleOpenCommitDialog()` ruft `gateway.requestGitStatus()` auf
- [ ] TEST_PASS: Regression test added and passing
- [ ] LINT_PASS: No linting errors
- [ ] MANUAL: Bug no longer reproducible with original steps

---

## Technisches Refinement

### DoR (Definition of Ready)

#### Bug-Analyse
- [x] Bug reproduzierbar
- [x] Root Cause identifiziert
- [x] Betroffene Dateien bekannt

#### Technische Vorbereitung
- [x] Fix-Ansatz definiert (WAS/WIE/WO)
- [x] Abhaengigkeiten identifiziert
- [x] Risiken bewertet

**Bug ist READY wenn alle Checkboxen angehakt sind.**

---

### DoD (Definition of Done)

- [ ] Bug behoben gemaess Root Cause
- [ ] Regression Test hinzugefuegt
- [ ] Keine neuen Bugs eingefuehrt
- [ ] Code Review durchgefuehrt
- [ ] Original Reproduktionsschritte fuehren nicht mehr zum Bug

**Bug ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten (Fix-Impact)

**Fix Type:** Frontend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Impact | Aenderung |
|-------|-------------|--------|----------|
| Frontend | `app.ts` - `_handleOpenCommitDialog()` | Direct | `gateway.requestGitStatus()` aufrufen |

**Kritische Integration Points:**
- Keine (rein-reaktive Datenbindung, Dialog aktualisiert sich automatisch via Lit property)

---

### Technical Details

**WAS:** `gateway.requestGitStatus()` in `_handleOpenCommitDialog()` aufrufen, um beim Oeffnen des Commit-Dialogs automatisch den aktuellen Git-Status zu laden.

**WIE (Architektur-Guidance ONLY):**
- `gateway.requestGitStatus()` am Anfang von `_handleOpenCommitDialog()` aufrufen
- Lit-Reaktivitaet stellt sicher, dass `gitStatus.files` automatisch aktualisiert wird
- Dialog zeigt initial gecachte Daten, aktualisiert sich bei Response automatisch

**WO:**
- `ui/frontend/src/app.ts`: `_handleOpenCommitDialog()` (Zeile 1462)

**Abhaengigkeiten:** None

**Geschaetzte Komplexitaet:** XS (1 Zeile Code)

---

### Completion Check

```bash
cd ui && npm run lint
cd ui/frontend && npm run build
```

**Bug ist DONE wenn:**
1. Original Reproduktionsschritte funktionieren korrekt
2. Commit-Dialog zeigt nach Oeffnen aktuelle Dateien
3. Keine verwandten Fehler auftreten
