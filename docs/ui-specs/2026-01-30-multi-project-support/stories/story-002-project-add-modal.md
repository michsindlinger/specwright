# Project Add Modal

> Story ID: MPRO-002
> Spec: multi-project-support
> Created: 2026-01-30
> Last Updated: 2026-01-30

**Priority**: High
**Type**: Frontend
**Estimated Effort**: S
**Dependencies**: MPRO-001, MPRO-003
**Status**: Done

---

## Feature

```gherkin
Feature: Projekt hinzufügen Dialog
  Als Entwickler
  möchte ich einen Dialog zum Hinzufügen von Projekten haben,
  damit ich neue Projekte öffnen kann - entweder aus der Recently Opened Liste oder per Ordnerauswahl.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Modal öffnet sich

```gherkin
Scenario: Modal-Dialog wird angezeigt
  Given ich sehe die Tab-Leiste
  When ich auf das Plus-Icon klicke
  Then öffnet sich ein Modal-Dialog
  And ich sehe die Überschrift "Projekt hinzufügen"
  And ich sehe die Recently Opened Liste
  And ich sehe einen Button "Ordner auswählen"
```

### Szenario 2: Projekt aus Recently Opened auswählen

```gherkin
Scenario: Projekt aus Liste auswählen
  Given der "Projekt hinzufügen" Dialog ist geöffnet
  And die Recently Opened Liste zeigt "/Users/dev/my-project"
  When ich auf "/Users/dev/my-project" klicke
  Then wird der Dialog geschlossen
  And ein neuer Tab "my-project" wird hinzugefügt
  And das Projekt wird als aktiv markiert
```

### Szenario 3: Ordner auswählen via File-Picker

```gherkin
Scenario: Ordner über File-Picker auswählen
  Given der "Projekt hinzufügen" Dialog ist geöffnet
  When ich auf "Ordner auswählen" klicke
  Then öffnet sich der native Ordner-Auswahl-Dialog
  When ich den Ordner "/Users/dev/new-project" auswähle
  And der Ordner enthält einen "agent-os/" Unterordner
  Then wird der Dialog geschlossen
  And ein neuer Tab "new-project" wird hinzugefügt
```

### Szenario 4: Validierung - Ungültiger Ordner

```gherkin
Scenario: Ordner ohne agent-os/ Unterordner
  Given der "Projekt hinzufügen" Dialog ist geöffnet
  When ich auf "Ordner auswählen" klicke
  And ich einen Ordner ohne "agent-os/" Unterordner auswähle
  Then sehe ich eine Fehlermeldung "Ungültiges Projekt: Ordner muss agent-os/ enthalten"
  And der Dialog bleibt geöffnet
```

### Szenario 5: Duplikat-Prüfung

```gherkin
Scenario: Bereits geöffnetes Projekt kann nicht erneut hinzugefügt werden
  Given ich habe das Projekt "agent-os-web-ui" bereits geöffnet
  And der "Projekt hinzufügen" Dialog ist geöffnet
  When ich versuche "/Users/dev/agent-os-web-ui" erneut hinzuzufügen
  Then sehe ich einen Hinweis "Projekt ist bereits geöffnet"
  And das Projekt wird nicht doppelt hinzugefügt
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Modal schließen ohne Auswahl
  Given der "Projekt hinzufügen" Dialog ist geöffnet
  When ich auf das Schließen-Symbol (X) klicke
  Then wird der Dialog geschlossen
  And keine Änderungen werden vorgenommen
```

```gherkin
Scenario: Leere Recently Opened Liste
  Given ich habe noch nie ein Projekt geöffnet
  When ich den "Projekt hinzufügen" Dialog öffne
  Then sehe ich einen Hinweis "Keine kürzlich geöffneten Projekte"
  And ich sehe den Button "Ordner auswählen"
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [x] FILE_EXISTS: agent-os-ui/ui/src/components/aos-project-add-modal.ts
- [x] FILE_EXISTS: agent-os-ui/ui/src/styles/aos-project-add-modal.css (styles added to theme.css)

### Inhalt-Prüfungen

- [x] CONTAINS: agent-os-ui/ui/src/components/aos-project-add-modal.ts enthält "class AosProjectAddModal extends LitElement"
- [x] CONTAINS: agent-os-ui/ui/src/components/aos-project-add-modal.ts enthält "showDirectoryPicker"

### Funktions-Prüfungen

- [x] LINT_PASS: npm run lint exits with code 0
- [x] TEST_PASS: npm run test -- aos-project-add-modal exits with code 0

---

## Required MCP Tools

| Tool | Purpose | Blocking |
|------|---------|----------|
| None | - | - |

---

## Technisches Refinement (vom Architect)

> **Ausgefüllt:** 2026-01-30

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
- [x] **Alle betroffenen Layer identifiziert**
- [x] **Integration Type bestimmt**
- [x] **Kritische Integration Points dokumentiert** (wenn Full-stack)
- [x] **Handover-Dokumente definiert** (bei Multi-Layer)

**Story ist READY wenn alle Checkboxen angehakt sind.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [x] Code implementiert und folgt Style Guide
- [x] Architektur-Vorgaben eingehalten (WIE section)
- [x] Security/Performance Anforderungen erfüllt

#### Qualitätssicherung
- [x] Alle Akzeptanzkriterien erfüllt (via Completion Check verifiziert)
- [x] Unit Tests geschrieben und bestanden
- [x] Integration Tests geschrieben und bestanden
- [x] Code Review durchgeführt und genehmigt

#### Dokumentation
- [x] Dokumentation aktualisiert
- [x] Keine Linting Errors
- [x] Completion Check Commands alle erfolgreich (exit 0)

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | aos-project-add-modal | Neu erstellen |
| Frontend | recently-opened.service | Konsumieren (aus MPRO-003) |
| Frontend | aos-project-tabs | Event-Listener (aus MPRO-001) |

**Kritische Integration Points:**
- Verwendet `recentlyOpenedService.getRecentlyOpened()` aus MPRO-003
- Feuert `project-selected` Event das von MPRO-006 verarbeitet wird
- Nutzt File System Access API (`showDirectoryPicker`)

---

### Technical Details

**WAS:**
- Neue Modal-Komponente `aos-project-add-modal`
- Recently Opened Liste mit klickbaren Einträgen
- "Ordner auswählen" Button mit File System Access API
- Validierung: Prüfung auf `agent-os/` Unterordner
- Duplikat-Prüfung gegen bereits geöffnete Projekte
- Fehlermeldungs-Anzeige für ungültige Ordner

**WIE (Architektur-Guidance ONLY):**
- Lit Web Component mit `@customElement('aos-project-add-modal')`
- Nutze `showDirectoryPicker()` für native Ordnerauswahl (File System Access API)
- Modal-Pattern: Overlay mit Escape-Key zum Schließen
- Injiziere `recentlyOpenedService` für Liste der kürzlich geöffneten Projekte
- Validiere Ordner via Fetch zu Backend-Endpoint oder lokal via File System API
- CustomEvents: `project-selected` mit `{path, name}` Detail
- Focus-Trap innerhalb des Modals für Accessibility
- CSS Custom Properties für konsistentes Modal-Styling

**WO:**
- `agent-os-ui/ui/src/components/aos-project-add-modal.ts` (Neu)
- `agent-os-ui/ui/src/styles/aos-project-add-modal.css` (Neu, optional)

**WER:** dev-team__frontend-developer

**Abhängigkeiten:** MPRO-001, MPRO-003

**Geschätzte Komplexität:** M

**Relevante Skills:**
- `frontend-lit` - Modal-Patterns und Event-Handling
- `quality-gates` - Accessibility (Focus-Trap, Keyboard-Navigation)

**Creates Reusable:** yes

| Artefakt | Typ | Pfad | Beschreibung |
|----------|-----|------|--------------|
| `aos-project-add-modal` | UI Component | `agent-os-ui/ui/src/components/aos-project-add-modal.ts` | Modal-Dialog für Projekt-Auswahl mit File-Picker |

---

### Completion Check

```bash
# Auto-Verify Commands - alle müssen mit 0 exiten
test -f agent-os-ui/ui/src/components/aos-project-add-modal.ts && echo "Component exists"
grep -q "class AosProjectAddModal extends LitElement" agent-os-ui/ui/src/components/aos-project-add-modal.ts
grep -q "showDirectoryPicker" agent-os-ui/ui/src/components/aos-project-add-modal.ts
cd agent-os-ui && npm run lint
cd agent-os-ui && npm run test -- --filter="aos-project-add-modal"
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen
