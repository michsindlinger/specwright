# Bug: File Tree aktualisiert nicht bei Projektwechsel

> Bug ID: 2026-02-27-001
> Created: 2026-02-27
> Severity: Medium
> Status: Ready

**Priority**: Medium
**Type**: Bug - Frontend
**Affected Component**: aos-file-tree, aos-file-tree-sidebar, app.ts

---

## Bug Description

### Symptom
Die Files-Ansicht (Datei-Baum) in der linken Sidebar zeigt nach einem Projektwechsel weiterhin die Dateien des vorherigen Projekts an.

### Reproduktion
1. Projekt A oeffnen
2. File Tree Sidebar oeffnen (linke Sidebar)
3. Dateien von Projekt A werden korrekt angezeigt
4. Zu Projekt B wechseln (ueber Projekt-Tabs)
5. File Tree zeigt weiterhin Dateien von Projekt A

### Expected vs. Actual
- **Expected:** File Tree wird automatisch mit Dateien des neuen Projekts aktualisiert
- **Actual:** File Tree bleibt auf dem alten Stand und zeigt Dateien des vorherigen Projekts

---

## User-Input (aus Step 2.5)

> Dokumentation des Benutzer-Wissens vor der RCA

**Hat User Vermutungen geteilt:** Nein

---

## Root-Cause-Analyse

### Hypothesen (vor Analyse)

| # | Hypothese | Wahrscheinlichkeit | Quelle | Pruefmethode |
|---|-----------|-------------------|--------|-------------|
| 1 | Kein Reset/Refresh des File Trees bei Projektwechsel in app.ts | 85% | Agent | Code-Analyse der switchProject-Handler |
| 2 | Backend sendet files:list mit altem Projekt-Pfad | 10% | Agent | Backend Gateway-Code pruefen |
| 3 | aos-file-tree hat keinen Listener fuer Projekt-Aenderungen | 5% | Agent | Komponentencode analysieren |

### Pruefung

**Hypothese 1 pruefen:** Kein Reset/Refresh bei Projektwechsel
- Aktion: `handleProjectTabSelect` (app.ts:667-708) und `handleProjectSelected` (app.ts:911-945) analysiert
- Befund: Beide Methoden machen Backend-Switch, Git-Status-Reload, Terminal-Update, Context-Provider-Update. Kein einziger Aufruf zum File-Tree-Reset/Refresh.
- Ergebnis: BESTAETIGT
- Begruendung: Die `entries` Map in `aos-file-tree.ts` behaelt die gecachten Dateien des alten Projekts. Die `reload()` Methode (Zeile 162-168) prueft nur `initialLoading || error` - bei erfolgreich geladenem Baum passiert nichts.

### Root Cause

**Ursache:** Bei Projektwechsel (`handleProjectTabSelect`, `handleProjectSelected`) wird der File-Tree nicht zurueckgesetzt. Die `aos-file-tree` Komponente cached alle Verzeichnisinhalte in einer `entries` Map und bekommt kein Signal, wenn sich das Projekt aendert.

**Beweis:**
- `app.ts:667-708` (`handleProjectTabSelect`): Kein File-Tree-Reset
- `app.ts:911-945` (`handleProjectSelected`): Kein File-Tree-Reset
- `aos-file-tree.ts:42`: `entries` Map wird nie bei Projektwechsel geleert
- `aos-file-tree.ts:162-168`: `reload()` greift nur bei `initialLoading || error`

**Betroffene Dateien:**
- `ui/frontend/src/app.ts`
- `ui/frontend/src/components/file-editor/aos-file-tree.ts`
- `ui/frontend/src/components/file-editor/aos-file-tree-sidebar.ts`

---

## Feature (Bug-Fix)

```gherkin
Feature: File Tree aktualisiert nicht bei Projektwechsel beheben
  Als Benutzer
  moechte ich dass der File Tree bei Projektwechsel automatisch aktualisiert wird,
  damit ich immer die Dateien des aktiven Projekts sehe.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Korrektes Verhalten (was vorher fehlschlug)

```gherkin
Scenario: File Tree zeigt Dateien des neuen Projekts nach Wechsel
  Given ich habe Projekt A geoeffnet mit sichtbarem File Tree
  And der File Tree zeigt Dateien von Projekt A
  When ich zu Projekt B wechsle ueber die Projekt-Tabs
  Then zeigt der File Tree die Dateien von Projekt B
  And keine Dateien von Projekt A sind sichtbar
```

### Szenario 2: Regression-Schutz

```gherkin
Scenario: File Tree funktioniert weiterhin normal nach Reset
  Given ich habe zu einem neuen Projekt gewechselt
  And der File Tree wurde zurueckgesetzt
  When ich einen Ordner im File Tree aufklappe
  Then werden die Unterverzeichnisse korrekt geladen
  And die Lazy-Loading Funktionalitaet funktioniert normal
```

### Edge-Case nach Fix

```gherkin
Scenario: File Tree Reset bei geschlossener Sidebar
  Given die File Tree Sidebar ist geschlossen
  When ich das Projekt wechsle
  And danach die Sidebar oeffne
  Then zeigt der File Tree die Dateien des aktuellen Projekts
```

---

## Technische Verifikation

- [ ] BUG_FIXED: File Tree wird bei Projektwechsel zurueckgesetzt und neu geladen
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
| Frontend | aos-file-tree | Direct | `reset()` Methode hinzufuegen (entries + expandedDirs leeren, root neu laden) |
| Frontend | aos-file-tree-sidebar | Direct | `reset()` Methode hinzufuegen (delegiert an aos-file-tree) |
| Frontend | app.ts | Direct | Nach Projektwechsel `reset()` auf File-Tree-Sidebar aufrufen |

**Kritische Integration Points:** Keine (rein Frontend-seitiger State-Reset)

---

### Technical Details

**WAS:**
1. `reset()` Methode in `aos-file-tree` erstellen: `entries` Map leeren, `expandedDirs` Set leeren, `initialLoading` auf true setzen, `loadDirectory(rootPath)` aufrufen
2. `reset()` Methode in `aos-file-tree-sidebar` erstellen: Delegiert an `aos-file-tree.reset()`, setzt `filterText` zurueck
3. In `app.ts` nach Projektwechsel: `reset()` auf `aos-file-tree-sidebar` Element aufrufen

**WIE (Architektur-Guidance ONLY):**
- Bestehendes Pattern folgen: `reload()` als Vorbild, aber ohne `initialLoading`-Guard
- Direkter DOM-Zugriff via `querySelector` (Pattern aus `_handleTreeRefresh`)
- Kein neuer Event-Bus noetig - direkter Methodenaufruf genuegt

**WO:**
- `ui/frontend/src/components/file-editor/aos-file-tree.ts` - `reset()` Methode hinzufuegen
- `ui/frontend/src/components/file-editor/aos-file-tree-sidebar.ts` - `reset()` Methode hinzufuegen
- `ui/frontend/src/app.ts` - `handleProjectTabSelect()` und `handleProjectSelected()` erweitern

**Abhaengigkeiten:** Keine

**Geschaetzte Komplexitaet:** XS

---

### Completion Check

```bash
# Verify frontend compiles
cd ui/frontend && npm run build

# Verify linting passes
cd ui && npm run lint

# Verify tests pass
cd ui && npm test
```

**Bug ist DONE wenn:**
1. Original Reproduktionsschritte funktionieren korrekt
2. Regression Test besteht
3. Keine verwandten Fehler auftreten
