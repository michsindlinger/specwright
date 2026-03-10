# Frontend: Document Preview Panel Komponente

> Story ID: DPP-003
> Spec: Document Preview Panel
> Created: 2026-03-09
> Last Updated: 2026-03-09

**Priority**: High
**Type**: Frontend
**Estimated Effort**: M
**Dependencies**: DPP-002

---

## Feature

```gherkin
Feature: Document Preview Panel
  Als Specwright UI User
  moechte ich generierte Dokumente in einem Overlay Side-Panel sehen und editieren koennen,
  damit ich waehrend eines Workflows nicht zwischen Terminal und File-Navigation wechseln muss.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Panel oeffnet sich automatisch

```gherkin
Scenario: Panel oeffnet sich wenn Claude Code ein Dokument setzt
  Given ich bin in der Chat-Ansicht der Specwright UI
  And Claude Code fuehrt einen Workflow aus
  When Claude Code ein Dokument zur Anzeige setzt
  Then faehrt ein Panel von links ueber den Chat-Bereich ein
  And das Dokument wird im Panel als Markdown angezeigt
  And der Dateiname wird im Panel-Header angezeigt
```

### Szenario 2: Dokument editieren und speichern

```gherkin
Scenario: User editiert ein Dokument im Panel und speichert
  Given das Preview-Panel zeigt "requirements-clarification.md" an
  When ich in den Edit-Modus wechsle
  And ich den Text aendere
  And ich auf Speichern klicke
  Then wird die Datei auf dem Filesystem aktualisiert
  And ich sehe eine Bestaetigung dass gespeichert wurde
```

### Szenario 3: Panel manuell schliessen

```gherkin
Scenario: User schliesst das Panel manuell
  Given das Preview-Panel ist geoeffnet mit einem Dokument
  When ich auf den Schliessen-Button klicke
  Then faehrt das Panel nach links heraus
  And der Chat-Bereich ist wieder vollstaendig sichtbar
```

### Szenario 4: Neues Dokument ersetzt Inhalt

```gherkin
Scenario: Claude Code setzt neues Dokument waehrend Panel offen ist
  Given das Preview-Panel zeigt "requirements-clarification.md" an
  When Claude Code "implementation-plan.md" zur Anzeige setzt
  Then wird der Inhalt im Panel mit dem neuen Dokument ersetzt
  And der Dateiname im Header aktualisiert sich
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Warnung bei ungespeicherten Aenderungen
  Given das Preview-Panel zeigt ein Dokument an
  And ich habe Aenderungen vorgenommen aber nicht gespeichert
  When Claude Code ein neues Dokument setzt
  Then sehe ich eine Warnung "Ungespeicherte Aenderungen verwerfen?"
  And ich kann waehlen ob ich verwerfen oder zurueckkehren moechte
```

```gherkin
Scenario: Fehler beim Laden eines Dokuments
  Given das Preview-Panel soll ein Dokument anzeigen
  When die Datei nicht gelesen werden kann
  Then sehe ich eine Fehlermeldung im Panel
  And das Panel bleibt offen
```

---

## Technische Verifikation (Automated Checks)

> Wird vom Architect ausgefuellt.

### Datei-Pruefungen
- [ ] FILE_EXISTS: ui/frontend/src/components/document-preview/aos-document-preview-panel.ts

### Inhalt-Pruefungen
- [ ] CONTAINS: `aos-document-preview-panel` in ui/frontend/src/components/document-preview/aos-document-preview-panel.ts
- [ ] CONTAINS: `@customElement` Decorator in der Komponente
- [ ] CONTAINS: `isOpen` Property (Boolean) fuer Open/Close-State
- [ ] CONTAINS: `content` Property (String) fuer Dateiinhalt
- [ ] CONTAINS: `filePath` Property (String) fuer Dateipfad
- [ ] CONTAINS: Unsaved-Changes-Warning Logik (confirm/dirty-State)

### Funktions-Pruefungen
- [ ] BUILD_PASS: `cd ui/frontend && npm run build`
- [ ] LINT_PASS: `cd ui && npm run lint`

---

## Required MCP Tools

Keine externen MCP-Tools erforderlich.

---

## Technisches Refinement (vom Architect)

> **WICHTIG:** Dieser Abschnitt wird vom Architect ausgefuellt

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
- [x] **Alle betroffenen Layer identifiziert**
- [x] **Integration Type bestimmt**
- [x] **Kritische Integration Points dokumentiert**
- [x] **Handover-Dokumente definiert**

**Story ist READY wenn alle Checkboxen angehakt sind.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [ ] Code implementiert und folgt Style Guide
- [ ] Architektur-Vorgaben eingehalten (WIE section)
- [ ] Security/Performance Anforderungen erfuellt

#### Qualitaetssicherung
- [ ] Alle Akzeptanzkriterien erfuellt (via Completion Check verifiziert)
- [ ] Unit Tests geschrieben und bestanden
- [ ] Integration Tests geschrieben und bestanden
- [ ] Code Review durchgefuehrt und genehmigt

#### Dokumentation
- [ ] Dokumentation aktualisiert
- [ ] Keine Linting Errors
- [ ] Completion Check Commands alle erfolgreich (exit 0)

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Aenderung |
|-------|-------------|----------|
| Frontend | aos-document-preview-panel (neu) | Overlay Side-Panel Komponente |

**Kritische Integration Points:**
- Gateway Event Handler → Panel State (document-preview.open/close Messages)
- Panel Save → Backend files:write (bestehender WebSocket-Kanal)

---

### Technical Details

**WAS:**
- Neue Lit-Komponente `aos-document-preview-panel`: Overlay Side-Panel von links
- Zwei Modi: Markdown-Rendering (default, via `aos-docs-viewer`) und Edit-Modus (via `aos-file-editor`)
- Toggle-Button zwischen View/Edit-Modus im Panel-Header
- Save-Funktionalitaet: Sendet `document-preview.save` via Gateway
- Unsaved-Changes-Warning: Confirm-Dialog bei Inhaltswechsel wenn dirty
- Close-Button im Panel-Header
- Dateiname-Anzeige im Panel-Header

**WIE (Architektur-Guidance ONLY):**
- Folge `aos-file-tree-sidebar` Pattern fuer Overlay-Mechanik: `position: fixed`, `transform: translateX(-100%)`, `transition: 0.3s ease`, `z-index: 1000`
- Nutze Light DOM Rendering (`createRenderRoot() { return this; }` + `ensureStyles()`) wie bestehende Sidebar-Komponenten
- Nutze bestehende `aos-docs-viewer` Komponente fuer Markdown-Rendering (Property: `content`, `filename`, `embedded=true`)
- Nutze bestehende `aos-file-editor` Komponente fuer Edit-Modus (Property: `content`, `filename`)
- Save via `gateway.send({ type: 'document-preview.save', path: filePath, content: editedContent })`
- Dirty-State tracken via `hasUnsavedChanges` State-Property
- Bei neuem Content (Property-Aenderung): Pruefen ob dirty → Confirm-Dialog → Content ersetzen oder abbrechen
- Panel-Breite: Default 400px, kein Resize in v1 (Out of Scope)
- Events nach aussen: `close` Event wenn User X-Button klickt (app.ts reagiert darauf)

**WO:**
- `ui/frontend/src/components/document-preview/aos-document-preview-panel.ts` (NEU) - Hauptkomponente

**Abhaengigkeiten:** DPP-002

**Geschaetzte Komplexitaet:** M

**Relevante Skills:**

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | .claude/skills/frontend-lit/SKILL.md | Lit Component Patterns, Light DOM, State Management |
| domain-specwright-ui | .claude/skills/domain-specwright-ui/SKILL.md | Bestehende Sidebar-Patterns und Komponenten-Konventionen |

---

### Integration DoD (Verbindung: Gateway → Panel + Panel → Backend Save)

- [ ] **Integration hergestellt: Gateway Events → Panel State**
  - [ ] Panel reagiert auf Property-Aenderungen (isOpen, content, filePath)
  - [ ] Verbindung ist funktional (nicht nur Stub)
  - [ ] Validierung: Panel oeffnet sich bei `isOpen=true` mit Content

- [ ] **Integration hergestellt: Panel → Backend (Save)**
  - [ ] `gateway.send({ type: 'document-preview.save' })` wird aufgerufen
  - [ ] Verbindung ist funktional (Datei wird auf Disk geschrieben)
  - [ ] Validierung: Edit → Save → File auf Disk hat neuen Inhalt

---

### Creates Reusable Artifacts

**Creates Reusable:** yes

**Reusable Artifacts:**

| Artefakt | Typ | Pfad | Beschreibung |
|----------|-----|------|--------------|
| aos-document-preview-panel | UI Component | ui/frontend/src/components/document-preview/aos-document-preview-panel.ts | Overlay Side-Panel mit Markdown Viewer/Editor |

---

### Completion Check

```bash
# Auto-Verify Commands - alle muessen mit 0 exiten
test -f ui/frontend/src/components/document-preview/aos-document-preview-panel.ts && echo "OK: Component exists"
grep -q "aos-document-preview-panel" ui/frontend/src/components/document-preview/aos-document-preview-panel.ts && echo "OK: Component defined"
grep -q "isOpen" ui/frontend/src/components/document-preview/aos-document-preview-panel.ts && echo "OK: isOpen property"
grep -q "document-preview.save" ui/frontend/src/components/document-preview/aos-document-preview-panel.ts && echo "OK: Save integration"
cd ui/frontend && npm run build && echo "OK: Frontend compiles"
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Aenderungen
