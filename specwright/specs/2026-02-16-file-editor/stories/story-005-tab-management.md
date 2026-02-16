# Tab Management

> Story ID: FE-005
> Spec: File Editor
> Created: 2026-02-16
> Last Updated: 2026-02-16

**Priority**: High
**Type**: Frontend
**Estimated Effort**: S
**Dependencies**: FE-004

---

## Feature

```gherkin
Feature: Tab Management
  Als Entwickler
  möchte ich mehrere Dateien gleichzeitig in Tabs geöffnet haben,
  damit ich schnell zwischen verschiedenen Dateien wechseln kann und den Überblick behalte.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Mehrere Dateien in Tabs öffnen

```gherkin
Scenario: Zweite Datei öffnet neuen Tab
  Given die Datei "app.ts" ist im Editor in einem Tab geöffnet
  When ich die Datei "config.json" im Dateibaum anklicke
  Then erscheint ein zweiter Tab "config.json" in der Tab-Leiste
  And "config.json" wird zum aktiven Tab
  And der Tab "app.ts" bleibt bestehen
```

### Szenario 2: Zwischen Tabs wechseln

```gherkin
Scenario: Tab-Wechsel zeigt korrekte Datei
  Given ich habe die Tabs "app.ts" und "config.json" offen
  And "config.json" ist der aktive Tab
  When ich auf den Tab "app.ts" klicke
  Then wird "app.ts" zum aktiven Tab
  And der Editor zeigt den Inhalt von "app.ts"
```

### Szenario 3: Unsaved-Changes-Indikator

```gherkin
Scenario: Ungespeicherte Änderungen werden visuell angezeigt
  Given die Datei "app.ts" ist im Editor geöffnet
  When ich den Inhalt der Datei ändere ohne zu speichern
  Then zeigt der Tab "app.ts" einen visuellen Indikator für ungespeicherte Änderungen
```

### Szenario 4: Tab schließen mit ungespeicherten Änderungen

```gherkin
Scenario: Warnung beim Schließen eines Tabs mit ungespeicherten Änderungen
  Given der Tab "app.ts" hat ungespeicherte Änderungen
  When ich versuche den Tab "app.ts" zu schließen
  Then sehe ich eine Warnung "Ungespeicherte Änderungen. Trotzdem schließen?"
  And ich kann zwischen "Speichern", "Verwerfen" und "Abbrechen" wählen
```

### Szenario 5: Tab schließen ohne Änderungen

```gherkin
Scenario: Tab ohne ungespeicherte Änderungen wird direkt geschlossen
  Given der Tab "config.json" hat keine ungespeicherten Änderungen
  When ich auf das Schließen-Icon des Tabs klicke
  Then wird der Tab geschlossen
  And der nächste Tab wird automatisch aktiv
```

### Szenario 6: Bereits offene Datei erneut auswählen

```gherkin
Scenario: Bereits geöffnete Datei wechselt zum bestehenden Tab
  Given die Datei "app.ts" ist bereits in einem Tab geöffnet
  When ich "app.ts" erneut im Dateibaum anklicke
  Then wird kein neuer Tab erstellt
  And der bestehende Tab "app.ts" wird zum aktiven Tab
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Letzten Tab schließen
  Given nur noch ein Tab "app.ts" ist geöffnet
  When ich den Tab schließe
  Then wird das Editor-Panel leer
  And ich sehe einen Hinweis "Keine Datei geöffnet"

Scenario: Warnung beim Verlassen mit ungespeicherten Änderungen
  Given mehrere Tabs haben ungespeicherte Änderungen
  When ich den Editor-Bereich verlasse oder die Sidebar schließe
  Then werde ich gewarnt dass ungespeicherte Änderungen verloren gehen können
```

---

## Technische Verifikation (Automated Checks)

### Datei-Pruefungen

- [ ] FILE_EXISTS: ui/frontend/src/components/file-editor/aos-file-tabs.ts
- [ ] FILE_EXISTS: ui/frontend/src/components/file-editor/aos-file-editor-panel.ts

### Inhalt-Pruefungen

- [ ] CONTAINS: ui/frontend/src/components/file-editor/aos-file-tabs.ts enthält "@customElement('aos-file-tabs')"
- [ ] CONTAINS: ui/frontend/src/components/file-editor/aos-file-editor-panel.ts enthält "@customElement('aos-file-editor-panel')"
- [ ] CONTAINS: ui/frontend/src/components/file-editor/aos-file-editor-panel.ts enthält "files:read"

### Funktions-Pruefungen

- [ ] BUILD_PASS: `cd ui/frontend && npm run build` exits with code 0
- [ ] LINT_PASS: `cd ui && npm run lint` exits with code 0

---

## Required MCP Tools

| Tool | Purpose | Blocking |
|------|---------|----------|
| Playwright | Tab-Wechsel und Unsaved-Indicator testen | No |

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
- [ ] Code implementiert und folgt Style Guide
- [ ] Multi-Tab-Switching funktioniert
- [ ] Unsaved-Changes-Indikator (Punkt am Tab) funktioniert
- [ ] Close-mit-Warnung funktioniert
- [ ] Duplikat-Tab-Erkennung funktioniert

#### Qualitätssicherung
- [ ] Alle Akzeptanzkriterien erfüllt
- [ ] Code Review durchgeführt und genehmigt

#### Integration
- [ ] **Integration hergestellt: aos-file-editor-panel → aos-file-editor + aos-file-tabs**
  - [ ] Panel rendert Tabs und Editor korrekt
  - [ ] Gateway-Kommunikation für files:read/write funktioniert

#### Dokumentation
- [ ] Keine Linting Errors
- [ ] Completion Check Commands alle erfolgreich (exit 0)

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | `aos-file-tabs.ts` (NEU) | Tab-Bar mit Unsaved-Indikator, Close-Button |
| Frontend | `aos-file-editor-panel.ts` (NEU) | Orchestrator: kombiniert Tabs + Editor, verwaltet Open-Files-State |

**Kritische Integration Points:**
- aos-file-editor-panel → aos-file-tabs (Property Binding: open files, active tab)
- aos-file-editor-panel → aos-file-editor (Property Binding: content, language, filename)
- aos-file-editor-panel → gateway.ts (files:read zum Laden, files:write zum Speichern)
- aos-file-tabs → aos-file-editor-panel (Events: `@tab-select`, `@tab-close`)
- aos-file-editor → aos-file-editor-panel (Events: `@content-changed`, `@save-requested`)

---

### Technical Details

**WAS:**
- Neue `aos-file-tabs` Komponente: Tab-Bar mit aktiver Tab-Markierung, Unsaved-Punkt, Close-Button
- Neue `aos-file-editor-panel` Orchestrator-Komponente: Verwaltet offene Dateien, aktiven Tab, Gateway-Kommunikation

**WIE (Architektur-Guidance ONLY):**
- `aos-file-editor-panel` ist der zentrale State-Manager für offene Dateien
- Datenstruktur: Array von `{ path, filename, content, originalContent, language, isModified }` als `@state()`
- `activeTabPath` als `@state()` für den aktuellen Tab
- Folge Gateway-Event-Subscription-Pattern (wie `AosDocsPanel`): `setupHandlers`, `boundHandlers`, `removeHandlers`
- Bei `file-open` Event: Prüfe ob Tab bereits offen → wenn ja, aktiviere; wenn nein, lade via `files:read` und erstelle Tab
- Bei `save-requested` Event: Sende `files:write` via Gateway, aktualisiere `originalContent` nach Erfolg
- `aos-file-tabs`: Reine Präsentations-Komponente, empfängt Tabs als Property, dispatcht Events
- Unsaved-Indikator: `content !== originalContent` → Punkt-Symbol im Tab
- Close-Warnung: `window.confirm()` wie in bestehenden Patterns (z.B. `aos-docs-sidebar`)
- Tab-Limit: Max 15 Tabs, bei Überschreitung LRU-Tab schließen (mit Unsaved-Check)
- Light DOM Pattern

**WO:**
- `ui/frontend/src/components/file-editor/aos-file-tabs.ts` (NEU)
- `ui/frontend/src/components/file-editor/aos-file-editor-panel.ts` (NEU)

**Abhängigkeiten:** FE-004 (Code Editor Component muss existieren)

**Geschätzte Komplexität:** S

---

### Relevante Skills

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | .claude/skills/frontend-lit/SKILL.md | Lit Component Patterns, State Management, Custom Events |
| domain-specwright-ui | .claude/skills/domain-specwright-ui/SKILL.md | Gateway-Pattern, bestehende Panel-Patterns |

---

### Creates Reusable Artifacts

**Creates Reusable:** yes

| Artefakt | Typ | Pfad | Beschreibung |
|----------|-----|------|--------------|
| aos-file-tabs | UI Component | ui/frontend/src/components/file-editor/aos-file-tabs.ts | Tab-Bar Komponente mit Unsaved-Indikator |
| aos-file-editor-panel | UI Component | ui/frontend/src/components/file-editor/aos-file-editor-panel.ts | Orchestrator für Multi-Tab File Editing |

---

### Completion Check

```bash
# Auto-Verify Commands
test -f ui/frontend/src/components/file-editor/aos-file-tabs.ts && echo "Tabs exists"
test -f ui/frontend/src/components/file-editor/aos-file-editor-panel.ts && echo "Panel exists"
grep -q "aos-file-editor-panel" ui/frontend/src/components/file-editor/aos-file-editor-panel.ts && echo "Panel registered"
cd ui/frontend && npm run build
cd ui && npm run lint
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen
