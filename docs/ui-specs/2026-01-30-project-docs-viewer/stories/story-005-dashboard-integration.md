# Dashboard Integration

> Story ID: PDOC-005
> Spec: Project Docs Viewer/Editor
> Created: 2026-01-30
> Last Updated: 2026-01-30

**Priority**: High
**Type**: Frontend
**Estimated Effort**: S
**Dependencies**: PDOC-002, PDOC-003, PDOC-004
**Status**: Done

---

## Feature

```gherkin
Feature: Docs-Tab im Dashboard integrieren
  Als Benutzer
  möchte ich die Projekt-Dokumentation direkt im Dashboard als Tab sehen,
  damit ich ohne Kontextwechsel zwischen Kanban, Stories und Dokumentation navigieren kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Docs-Tab ist sichtbar

```gherkin
Scenario: Neuer "Docs" Tab im Dashboard
  Given ich das Dashboard für ein Projekt geöffnet habe
  When ich die Tab-Leiste betrachte
  Then sehe ich einen "Docs" Tab neben den bestehenden Tabs
```

### Szenario 2: Tab-Wechsel zu Docs

```gherkin
Scenario: Öffnen des Docs-Bereichs
  Given ich im Dashboard auf dem Kanban-Tab bin
  When ich auf den "Docs" Tab klicke
  Then sehe ich links die Docs-Sidebar mit Dateiliste
  And rechts den Docs-Viewer/Editor Bereich
```

### Szenario 3: Warnung bei ungespeicherten Änderungen

```gherkin
Scenario: Tab-Wechsel mit ungespeicherten Änderungen
  Given ich im Docs-Tab ein Dokument bearbeite
  And ich habe ungespeicherte Änderungen
  When ich auf einen anderen Tab klicke
  Then erscheint ein Bestätigungsdialog
  And ich kann wählen: "Speichern", "Verwerfen" oder "Abbrechen"
```

### Szenario 4: Layout-Integration

```gherkin
Scenario: Konsistentes Layout mit anderen Tabs
  Given ich zwischen verschiedenen Dashboard-Tabs wechsle
  When ich den Docs-Tab öffne
  Then hat er das gleiche Dark-Theme wie der Rest
  And die Abstände und Proportionen passen zum Design-System
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Projekt ohne Dokumente
  Given das ausgewählte Projekt keinen agent-os/product/ Ordner hat
  When ich den Docs-Tab öffne
  Then sehe ich den Hinweis "Keine Projekt-Dokumente gefunden"
  And keine Sidebar wird angezeigt
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [x] FILE_EXISTS: ui/src/components/docs/aos-docs-panel.ts
- [x] FILE_EXISTS: ui/src/views/dashboard-view.ts (erweitert)

### Inhalt-Prüfungen

- [x] CONTAINS: ui/src/views/dashboard-view.ts enthält "aos-docs-panel"
- [x] CONTAINS: ui/src/components/docs/aos-docs-panel.ts enthält "aos-docs-sidebar"
- [x] CONTAINS: ui/src/components/docs/aos-docs-panel.ts enthält "aos-docs-viewer"
- [x] CONTAINS: ui/src/components/docs/aos-docs-panel.ts enthält "aos-docs-editor"

### Funktions-Prüfungen

- [x] LINT_PASS: npm run lint exits with code 0
- [x] BUILD_PASS: npm run build exits with code 0

---

## Required MCP Tools

Keine MCP Tools erforderlich für diese Frontend-Story.

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

**Story ist READY wenn alle Checkboxen angehakt sind.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [x] Code implementiert und folgt Style Guide
- [x] Architektur-Vorgaben eingehalten (WIE section)
- [x] Security/Performance Anforderungen erfüllt

#### Qualitätssicherung
- [x] Alle Akzeptanzkriterien erfüllt
- [x] Unit Tests geschrieben und bestanden
- [x] Integration Tests geschrieben und bestanden
- [x] Code Review durchgeführt und genehmigt

#### Dokumentation
- [x] Dokumentation aktualisiert
- [x] Keine Linting Errors
- [x] Completion Check Commands alle erfolgreich

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | aos-docs-panel.ts | Neue Container-Komponente |
| Frontend | dashboard-view.ts | Tab hinzufügen, ViewMode erweitern |

**Kritische Integration Points:**
- dashboard-view Tab-State -> aos-docs-panel
- aos-docs-panel -> aos-docs-sidebar, aos-docs-viewer, aos-docs-editor (Orchestrierung)
- Unsaved Changes Warning bei Tab-Wechsel

---

### Technical Details

**WAS:**
- Neue `AosDocsPanel` Container-Komponente erstellen
- Properties: keine (lädt Daten selbst via Gateway)
- State: `docs: DocFile[]`, `selectedDoc: string | null`, `docContent: string`, `isEditing: boolean`, `hasUnsavedChanges: boolean`, `loading: boolean`, `error: string`
- Orchestriert: aos-docs-sidebar, aos-docs-viewer, aos-docs-editor
- dashboard-view.ts erweitern: neuer Tab "Docs", ViewMode erweitern um 'docs'

**WIE (Architecture Guidance):**
- **aos-docs-panel.ts:**
  - Folge dem Pattern von `dashboard-view.ts` für Gateway-Integration
  - Registriere Handler für `docs.list`, `docs.content`, `docs.saved`, `docs.error`
  - Layout: Sidebar links (fixed width ~250px), Viewer/Editor rechts (flex: 1)
  - State Machine: Loading -> (Docs List) -> (Doc Selected -> Viewing -> Editing)
  - Handle Events von Child-Komponenten:
    - `doc-selected` von Sidebar -> Load doc content
    - `edit-requested` von Viewer -> Switch to Editor
    - `doc-saved` von Editor -> Switch to Viewer, refresh
    - `edit-cancelled` von Editor -> Switch to Viewer
  - Warnung bei Dokument-Wechsel mit unsaved changes

- **dashboard-view.ts:**
  - Erweitere `ViewMode` um `'docs'`
  - Füge Tab-Button hinzu (neben Specs/Kanban)
  - Importiere und rendere `aos-docs-panel` wenn viewMode === 'docs'
  - Track `hasUnsavedChanges` State für Tab-Wechsel-Warnung
  - Bei Tab-Wechsel mit unsaved changes: Bestätigungsdialog

**WO:**
- ERSTELLEN: `agent-os-ui/ui/src/components/docs/aos-docs-panel.ts`
- ÄNDERN: `agent-os-ui/ui/src/views/dashboard-view.ts` (Tab und ViewMode hinzufügen)

**WER:** dev-team__frontend-developer

**Abhängigkeiten:**
- PDOC-002 (aos-docs-sidebar)
- PDOC-003 (aos-docs-viewer)
- PDOC-004 (aos-docs-editor)

**Geschätzte Komplexität:** S

---

### Completion Check

```bash
# Auto-Verify Commands
cd /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui/ui && npm run lint
cd /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui/ui && npm run build
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen
