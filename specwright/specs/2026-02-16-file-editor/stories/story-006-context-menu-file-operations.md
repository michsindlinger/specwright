# Context Menu & File Operations

> Story ID: FE-006
> Spec: File Editor
> Created: 2026-02-16
> Last Updated: 2026-02-16

**Priority**: High
**Type**: Frontend
**Estimated Effort**: S
**Dependencies**: FE-002, FE-001

---

## Feature

```gherkin
Feature: Context Menu & File Operations
  Als Entwickler
  möchte ich per Rechtsklick im Dateibaum Dateien und Ordner erstellen, umbenennen und löschen können,
  damit ich Datei-Operationen direkt in der Specwright UI durchführen kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Kontextmenü öffnen

```gherkin
Scenario: Rechtsklick auf Datei zeigt Kontextmenü
  Given ich sehe den Dateibaum mit der Datei "app.ts"
  When ich mit der rechten Maustaste auf "app.ts" klicke
  Then erscheint ein Kontextmenü mit den Optionen:
    | Option        |
    | Neue Datei    |
    | Neuer Ordner  |
    | Umbenennen    |
    | Löschen       |
```

### Szenario 2: Neue Datei erstellen

```gherkin
Scenario: Neue Datei über Kontextmenü erstellen
  Given das Kontextmenü ist geöffnet für den Ordner "src"
  When ich "Neue Datei" auswähle
  And ich den Namen "new-component.ts" eingebe
  And ich bestätige
  Then wird die Datei "src/new-component.ts" erstellt
  And die neue Datei erscheint im Dateibaum unter "src"
```

### Szenario 3: Neuen Ordner erstellen

```gherkin
Scenario: Neuer Ordner über Kontextmenü erstellen
  Given das Kontextmenü ist geöffnet für den Ordner "src"
  When ich "Neuer Ordner" auswähle
  And ich den Namen "utils" eingebe
  And ich bestätige
  Then wird der Ordner "src/utils" erstellt
  And der neue Ordner erscheint im Dateibaum unter "src"
```

### Szenario 4: Datei umbenennen

```gherkin
Scenario: Datei über Kontextmenü umbenennen
  Given das Kontextmenü ist geöffnet für die Datei "old-name.ts"
  When ich "Umbenennen" auswähle
  And ich den neuen Namen "new-name.ts" eingebe
  And ich bestätige
  Then wird die Datei in "new-name.ts" umbenannt
  And der Dateibaum zeigt den neuen Namen
```

### Szenario 5: Datei löschen mit Bestätigung

```gherkin
Scenario: Datei wird nach Bestätigung gelöscht
  Given das Kontextmenü ist geöffnet für die Datei "temp-file.ts"
  When ich "Löschen" auswähle
  Then sehe ich eine Bestätigungsabfrage "Möchten Sie 'temp-file.ts' wirklich löschen?"
  When ich die Löschung bestätige
  Then wird die Datei gelöscht
  And die Datei verschwindet aus dem Dateibaum
```

### Szenario 6: Löschen abbrechen

```gherkin
Scenario: Löschvorgang wird abgebrochen
  Given die Bestätigungsabfrage für das Löschen von "important.ts" wird angezeigt
  When ich "Abbrechen" wähle
  Then bleibt die Datei "important.ts" bestehen
  And der Dateibaum bleibt unverändert
```

### Szenario 7: Kontextmenü auf Ordner

```gherkin
Scenario: Rechtsklick auf Ordner zeigt Kontextmenü mit gleichen Optionen
  Given ich sehe den Dateibaum mit dem Ordner "src"
  When ich mit der rechten Maustaste auf "src" klicke
  Then erscheint das Kontextmenü
  And ich kann "Neue Datei" wählen um eine Datei IN "src" zu erstellen
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Umbenennen zu existierendem Namen
  Given ich versuche die Datei "a.ts" in "b.ts" umzubenennen
  And die Datei "b.ts" existiert bereits
  Then sehe ich eine Fehlermeldung "Eine Datei mit diesem Namen existiert bereits"
  And die Datei "a.ts" bleibt unverändert

Scenario: Offenen Tab nach Umbenennen aktualisieren
  Given die Datei "old.ts" ist in einem Tab geöffnet
  When ich "old.ts" im Dateibaum in "new.ts" umbenenne
  Then wird der Tab-Name zu "new.ts" aktualisiert
  And der Dateiinhalt bleibt erhalten
```

---

## Technische Verifikation (Automated Checks)

### Datei-Pruefungen

- [x] FILE_EXISTS: ui/frontend/src/components/file-editor/aos-file-context-menu.ts

### Inhalt-Pruefungen

- [x] CONTAINS: ui/frontend/src/components/file-editor/aos-file-context-menu.ts enthält "@customElement('aos-file-context-menu')"
- [x] CONTAINS: ui/frontend/src/components/file-editor/aos-file-context-menu.ts enthält "files:create"

### Funktions-Pruefungen

- [x] BUILD_PASS: `cd ui/frontend && npm run build` exits with code 0
- [x] LINT_PASS: `cd ui && npm run lint` exits with code 0

---

## Required MCP Tools

| Tool | Purpose | Blocking |
|------|---------|----------|
| Playwright | Kontextmenü und Dialoge testen | No |

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

#### Full-Stack Konsistenz
- [x] Alle betroffenen Layer identifiziert
- [x] Integration Type bestimmt
- [x] Kritische Integration Points dokumentiert (wenn Full-stack)
- [x] Handover-Dokumente definiert (bei Multi-Layer)

**Story ist READY - alle Checkboxen angehakt.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [x] Code implementiert und folgt Style Guide
- [x] Kontextmenü positioniert sich korrekt (Viewport-Bounds)
- [x] Alle 4 Operationen funktionieren (New File, New Folder, Rename, Delete)
- [x] Bestätigungs-Dialog für Löschen funktioniert

#### Qualitätssicherung
- [x] Alle Akzeptanzkriterien erfüllt
- [x] Code Review durchgeführt und genehmigt

#### Integration
- [x] **Integration hergestellt: aos-file-context-menu → aos-file-tree**
  - [x] Kontextmenü wird durch Rechtsklick im Tree geöffnet
  - [x] Operationen aktualisieren den Tree nach Erfolg
  - [x] Gateway-Messages für CRUD werden gesendet

#### Dokumentation
- [x] Keine Linting Errors
- [x] Completion Check Commands alle erfolgreich (exit 0)

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | `aos-file-context-menu.ts` (NEU) | Kontextmenü mit CRUD-Optionen, Positionierungslogik |
| Frontend | `aos-file-tree.ts` (ÄNDERUNG) | Rechtsklick-Handler, Tree-Refresh nach Operationen |

**Kritische Integration Points:**
- aos-file-tree → aos-file-context-menu (Rechtsklick öffnet Menü mit Kontext)
- aos-file-context-menu → gateway.ts (`files:create`, `files:delete`, `files:rename`, `files:mkdir`)
- aos-file-context-menu → aos-file-tree (Event `@tree-refresh` nach erfolgreicher Operation)

---

### Technical Details

**WAS:**
- Neue `aos-file-context-menu` Komponente für Rechtsklick-Menü im Dateibaum
- Erweiterung von `aos-file-tree` um contextmenu Event-Handler
- Name-Input-Dialoge für New File, New Folder, Rename
- Bestätigungs-Dialog für Delete

**WIE (Architektur-Guidance ONLY):**
- Folge das Positionierungs-Pattern aus `aos-context-menu.ts` (Viewport-Bounds-Adjustment)
- Separates `aos-file-context-menu` (nicht erweitern von `aos-context-menu`, da andere Menü-Items)
- Menü-Items: "Neue Datei", "Neuer Ordner", "Umbenennen", "Löschen"
- Bei "Neue Datei"/"Neuer Ordner": `window.prompt()` oder inline-Input für Namen
- Bei "Umbenennen": `window.prompt()` mit aktuellem Namen als Default
- Bei "Löschen": `window.confirm()` Bestätigung
- Nach jeder erfolgreichen Operation: Event dispatchen damit Tree den betroffenen Ordner refresht
- Gateway-Messages: `files:create`, `files:mkdir`, `files:rename`, `files:delete`
- Kontextmenü schließt sich beim Klick außerhalb (document-click-Listener)
- Light DOM Pattern

**WO:**
- `ui/frontend/src/components/file-editor/aos-file-context-menu.ts` (NEU)
- `ui/frontend/src/components/file-editor/aos-file-tree.ts` (ÄNDERUNG - contextmenu Handler)

**Abhängigkeiten:** FE-002 (File Tree Component), FE-001 (Backend CRUD-Operations)

**Geschätzte Komplexität:** S

---

### Relevante Skills

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | .claude/skills/frontend-lit/SKILL.md | Lit Component Patterns, Event-Handling |
| domain-specwright-ui | .claude/skills/domain-specwright-ui/SKILL.md | Bestehende Context-Menu-Patterns |

---

### Creates Reusable Artifacts

**Creates Reusable:** no

---

### Completion Check

```bash
# Auto-Verify Commands
test -f ui/frontend/src/components/file-editor/aos-file-context-menu.ts && echo "Context menu exists"
grep -q "aos-file-context-menu" ui/frontend/src/components/file-editor/aos-file-context-menu.ts && echo "Component registered"
cd ui/frontend && npm run build
cd ui && npm run lint
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen
