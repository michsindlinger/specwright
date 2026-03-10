# App-Integration des Document Preview Panels

> Story ID: DPP-004
> Spec: Document Preview Panel
> Created: 2026-03-09
> Last Updated: 2026-03-09

**Priority**: High
**Type**: Frontend
**Estimated Effort**: S
**Dependencies**: DPP-003
**Status**: Done

**Integration:** Gateway Events → app.ts State → aos-document-preview-panel

---

## Feature

```gherkin
Feature: App-Integration des Document Preview Panels
  Als Specwright UI
  moechte ich das Document Preview Panel in die Hauptanwendung integrieren,
  damit es auf WebSocket-Events reagiert und korrekt im Layout angezeigt wird.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Panel reagiert auf WebSocket Open-Event

```gherkin
Scenario: App oeffnet Panel bei document-preview.open Message
  Given die Specwright UI ist geladen
  And ein Projekt ist ausgewaehlt
  When eine WebSocket-Message "document-preview.open" eintrifft
  Then setzt die App den Panel-State auf offen
  And uebergibt Dateiinhalt und Dateipfad an das Panel
  And das Panel wird sichtbar
```

### Szenario 2: Panel reagiert auf WebSocket Close-Event

```gherkin
Scenario: App schliesst Panel bei document-preview.close Message
  Given das Preview-Panel ist offen mit einem Dokument
  When eine WebSocket-Message "document-preview.close" eintrifft
  Then setzt die App den Panel-State auf geschlossen
  And das Panel faehrt heraus
```

### Szenario 3: Panel schliesst bei Seitenwechsel

```gherkin
Scenario: Panel schliesst sich bei Navigation weg von Chat
  Given das Preview-Panel ist offen
  When ich zu Dashboard oder Settings navigiere
  Then schliesst sich das Panel automatisch
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Panel-State wird zurueckgesetzt bei Projektwechsel
  Given das Preview-Panel zeigt ein Dokument von Projekt A an
  When ich zu Projekt B wechsle
  Then schliesst sich das Panel
  And der Panel-State wird zurueckgesetzt
```

---

## Technische Verifikation (Automated Checks)

> Wird vom Architect ausgefuellt.

### Datei-Pruefungen
- [ ] FILE_EXISTS: ui/frontend/src/components/document-preview/aos-document-preview-panel.ts (aus DPP-003)

### Inhalt-Pruefungen
- [ ] CONTAINS: `document-preview.open` Handler in ui/frontend/src/app.ts
- [ ] CONTAINS: `document-preview.close` Handler in ui/frontend/src/app.ts
- [ ] CONTAINS: `aos-document-preview-panel` Tag in ui/frontend/src/app.ts render()
- [ ] CONTAINS: `isDocumentPreviewOpen` State-Property in ui/frontend/src/app.ts

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
- [x] Code implementiert und folgt Style Guide
- [x] Architektur-Vorgaben eingehalten (WIE section)
- [x] Security/Performance Anforderungen erfuellt

#### Qualitaetssicherung
- [x] Alle Akzeptanzkriterien erfuellt (via Completion Check verifiziert)
- [x] Unit Tests geschrieben und bestanden
- [x] Integration Tests geschrieben und bestanden
- [x] Code Review durchgefuehrt und genehmigt

#### Dokumentation
- [x] Dokumentation aktualisiert
- [x] Keine Linting Errors
- [x] Completion Check Commands alle erfolgreich (exit 0)

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Aenderung |
|-------|-------------|----------|
| Frontend | app.ts | State-Management, Gateway-Handler, Render-Integration |

**Kritische Integration Points:**
- Gateway Events (document-preview.open/close) → app.ts State
- app.ts State → aos-document-preview-panel Property Binding

---

### Technical Details

**WAS:**
- 3 neue State-Properties in app.ts: `isDocumentPreviewOpen`, `documentPreviewContent`, `documentPreviewFilePath`
- 2 neue Gateway-Handler: `document-preview.open` und `document-preview.close`
- `aos-document-preview-panel` im render() einbinden mit Property-Bindings
- Close-Event-Handler vom Panel (User klickt X)
- Panel-State zuruecksetzen bei Projektwechsel und Seitenwechsel (Navigation weg von Chat)
- Import der neuen Komponente

**WIE (Architektur-Guidance ONLY):**
- Folge bestehendes `isFileTreeOpen` Pattern fuer State-Management: `@state()` Decorator
- Folge bestehendes Handler-Pattern: `private boundXxxHandler: MessageHandler = (msg) => {...}`
- Handler registrieren in `connectedCallback` via `gateway.on()`, deregistrieren in `disconnectedCallback` via `gateway.off()`
- Open-Handler: Setzt `isDocumentPreviewOpen=true`, `documentPreviewContent=msg.content`, `documentPreviewFilePath=msg.filePath`
- Close-Handler: Setzt `isDocumentPreviewOpen=false`, raeumt Content/Path auf
- Panel im render() neben bestehenden Sidebar-Komponenten platzieren (vor Chat, nach File-Tree)
- Bei Projektwechsel (`project.switch` Handler): Panel-State zuruecksetzen
- Bei Route-Wechsel (Navigation): Panel schliessen wenn Route !== 'chat'/'workflow'

**WO:**
- `ui/frontend/src/app.ts` - State, Handlers, Render, Import

**Abhaengigkeiten:** DPP-003

**Geschaetzte Komplexitaet:** S

**Relevante Skills:**

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | .claude/skills/frontend-lit/SKILL.md | Lit State Management und Event-Handler Patterns |
| domain-specwright-ui | .claude/skills/domain-specwright-ui/SKILL.md | app.ts Struktur und Gateway-Integration |

---

### Integration DoD (Verbindung: Gateway Events → app.ts State → Panel)

- [x] **Integration hergestellt: Gateway → app.ts → aos-document-preview-panel**
  - [x] `gateway.on('document-preview.open', handler)` registriert
  - [x] `gateway.on('document-preview.close', handler)` registriert
  - [x] Panel rendert mit Property-Bindings (isOpen, content, filePath)
  - [x] Verbindung ist funktional (nicht nur Stub)
  - [x] Validierung: WS Message `document-preview.open` → Panel wird sichtbar

---

### Creates Reusable Artifacts

**Creates Reusable:** no

---

### Completion Check

```bash
# Auto-Verify Commands - alle muessen mit 0 exiten
grep -q "document-preview.open" ui/frontend/src/app.ts && echo "OK: Open handler registered"
grep -q "document-preview.close" ui/frontend/src/app.ts && echo "OK: Close handler registered"
grep -q "aos-document-preview-panel" ui/frontend/src/app.ts && echo "OK: Panel in render"
grep -q "isDocumentPreviewOpen" ui/frontend/src/app.ts && echo "OK: State property"
cd ui/frontend && npm run build && echo "OK: Frontend compiles"
cd ui && npm run lint && echo "OK: Lint passes"
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Aenderungen
