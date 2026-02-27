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

## Root-Cause-Analyse

### Hypothesen (vor Analyse)

| # | Hypothese | Wahrscheinlichkeit | Quelle | Pruefmethode |
|---|-----------|-------------------|--------|-------------|
| 1 | Kein Reset/Refresh des File Trees bei Projektwechsel in app.ts | 85% | Agent | Code-Analyse der switchProject-Handler |
| 2 | Backend sendet files:list mit altem Projekt-Pfad | 10% | Agent | Backend Gateway-Code pruefen |
| 3 | aos-file-tree hat keinen Listener fuer Projekt-Aenderungen | 5% | Agent | Komponentencode analysieren |

### Root Cause

**Ursache:** Bei Projektwechsel (handleProjectTabSelect, handleProjectSelected) wird der File-Tree nicht zurueckgesetzt. Die aos-file-tree Komponente cached alle Verzeichnisinhalte in einer entries Map und bekommt kein Signal wenn sich das Projekt aendert.

**Beweis:**
- app.ts:667-708 (handleProjectTabSelect): Kein File-Tree-Reset
- app.ts:911-945 (handleProjectSelected): Kein File-Tree-Reset
- aos-file-tree.ts:42: entries Map wird nie bei Projektwechsel geleert
- aos-file-tree.ts:162-168: reload() greift nur bei initialLoading || error

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

### Szenario 1: Korrektes Verhalten

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
```

---

## Technisches Refinement

### Betroffene Layer & Komponenten (Fix-Impact)

**Fix Type:** Frontend-only

| Layer | Komponenten | Impact | Aenderung |
|-------|-------------|--------|----------|
| Frontend | aos-file-tree | Direct | reset() Methode hinzufuegen |
| Frontend | aos-file-tree-sidebar | Direct | reset() Methode hinzufuegen |
| Frontend | app.ts | Direct | Nach Projektwechsel reset() aufrufen |

### Technical Details

**WAS:**
1. reset() Methode in aos-file-tree erstellen: entries Map leeren, expandedDirs Set leeren, initialLoading auf true setzen, loadDirectory(rootPath) aufrufen
2. reset() Methode in aos-file-tree-sidebar erstellen: Delegiert an aos-file-tree.reset(), setzt filterText zurueck
3. In app.ts nach Projektwechsel: reset() auf aos-file-tree-sidebar Element aufrufen

**WIE:**
- Bestehendes Pattern folgen: reload() als Vorbild
- Direkter DOM-Zugriff via querySelector

**WO:**
- ui/frontend/src/components/file-editor/aos-file-tree.ts
- ui/frontend/src/components/file-editor/aos-file-tree-sidebar.ts
- ui/frontend/src/app.ts

**Geschaetzte Komplexitaet:** XS