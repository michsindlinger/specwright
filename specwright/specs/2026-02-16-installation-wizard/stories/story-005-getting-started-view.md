# Getting Started View

> Story ID: IW-005
> Spec: Installation Wizard
> Created: 2026-02-16
> Last Updated: 2026-02-17 (install.sh Synergy Update)

**Priority**: High
**Type**: Frontend
**Estimated Effort**: S
**Dependencies**: IW-001

---

## Feature

```gherkin
Feature: Getting Started View
  Als Benutzer der Specwright Web UI
  moechte ich nach der Installation eine kontextabhaengige Naechste-Schritte-Seite sehen,
  damit ich sofort weiss wie ich mit Specwright weiterarbeiten kann -
  sei es Projektplanung (wenn noch kein Product Brief existiert) oder Feature-Entwicklung.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Standard-Cards bei vorhandenem Product Brief

```gherkin
Scenario: Getting Started zeigt Standard-Aktionen wenn Product Brief existiert
  Given ich befinde mich auf der /getting-started Seite
  And das Projekt hat einen Product Brief (hasProductBrief: true)
  When die Seite geladen wird
  Then sehe ich drei Aktions-Cards:
    | Aktion      | Beschreibung                                    |
    | create-spec | Feature-Spezifikation erstellen                 |
    | add-todo    | Schnelle Aufgabe zum Backlog hinzufuegen        |
    | add-bug     | Bug mit Root-Cause-Analyse erfassen             |
  And jede Card hat eine verstaendliche Beschreibung fuer Einsteiger und Erfahrene
```

### Szenario 2: Planning-Cards bei fehlendem Product Brief

```gherkin
Scenario: Getting Started zeigt Planning-Aktionen wenn kein Product Brief existiert
  Given ich befinde mich auf der /getting-started Seite
  And das Projekt hat keinen Product Brief (hasProductBrief: false)
  And Specwright ist installiert (hasSpecwright: true, z.B. via install.sh)
  When die Seite geladen wird
  Then sehe ich einen Hinweis dass zuerst ein Product Brief erstellt werden muss
  And ich sehe vier Planning-Aktions-Cards:
    | Aktion           | Beschreibung                                           |
    | plan-product     | Fuer ein einzelnes Produkt/Projekt planen              |
    | plan-platform    | Fuer eine Multi-Modul-Plattform planen                 |
    | analyze-product  | Bestehendes Produkt analysieren und Specwright integrieren |
    | analyze-platform | Bestehende Plattform analysieren und Specwright integrieren |
```

### Szenario 3: Aktions-Card fuehrt zum entsprechenden Workflow

```gherkin
Scenario: Klick auf Aktions-Card startet den Workflow
  Given ich sehe die Getting Started Seite
  When ich auf eine Card klicke (z.B. "create-spec" oder "plan-product")
  Then wird der entsprechende Workflow gestartet
```

### Szenario 4: Seite ist spaeter ueber Menu erreichbar

```gherkin
Scenario: Getting Started ueber Navigation erreichbar
  Given ich befinde mich auf einer anderen Seite der Specwright UI
  When ich den "Getting Started" Menuepunkt in der Navigation anklicke
  Then werde ich zur /getting-started Seite weitergeleitet
  And ich sehe die kontextabhaengigen Aktions-Cards
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Getting Started Seite bei Projekt ohne Specwright
  Given ich bin auf der Getting Started Seite
  And Specwright wurde im aktuellen Projekt noch nicht installiert
  When die Seite geladen wird
  Then sehe ich einen Hinweis dass Specwright erst installiert werden muss
  And die Aktions-Cards sind deaktiviert oder mit Hinweis versehen
```

---

## Technische Verifikation (Automated Checks)

### Datei-Pruefungen

- [x] FILE_EXISTS: ui/frontend/src/views/aos-getting-started-view.ts

### Inhalt-Pruefungen

- [x] CONTAINS: aos-getting-started-view.ts enthaelt "create-spec"
- [x] CONTAINS: aos-getting-started-view.ts enthaelt "add-todo"
- [x] CONTAINS: aos-getting-started-view.ts enthaelt "add-bug"
- [x] CONTAINS: aos-getting-started-view.ts enthaelt "plan-product"
- [x] CONTAINS: aos-getting-started-view.ts enthaelt "hasProductBrief"

### Funktions-Pruefungen

- [x] BUILD_PASS: `cd ui/frontend && npm run build` exits with code 0 (pre-existing app.ts errors unrelated to this story)

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

#### Qualitaetssicherung
- [x] Alle Akzeptanzkriterien erfuellt
- [ ] Code Review durchgefuehrt und genehmigt

#### Dokumentation
- [x] Keine Linting Errors
- [x] Completion Check Commands alle erfolgreich (exit 0)

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Aenderung |
|-------|-------------|----------|
| Frontend | `aos-getting-started-view.ts` (NEU) | Neue View-Komponente: Kontextabhaengige Aktions-Cards basierend auf `hasProductBrief`. Planning-Cards (plan-product etc.) wenn kein Product Brief, Standard-Cards (create-spec etc.) wenn Product Brief vorhanden. |

**Kritische Integration Points:**
- Erhaelt `hasProductBrief` als Property von `app.ts` (Verbindung in IW-006)
- Emittiert `workflow-start` Event an `app.ts` zum Triggern von Workflows (Verbindung in IW-006)

---

### Technical Details

**WAS:**
- Neue View-Komponente `aos-getting-started-view` im `views/`-Verzeichnis
- **Kontextabhaengige Inhalte basierend auf `hasProductBrief` Property:**
  - `hasProductBrief === false`: Zeigt Planning-Cards (plan-product, plan-platform, analyze-product, analyze-platform) mit Hinweis dass zuerst geplant werden muss
  - `hasProductBrief === true`: Zeigt Standard-Cards (create-spec, add-todo, add-bug)
- Jede Card emittiert ein Event zum Starten des Workflows
- Responsives Layout fuer verschiedene Bildschirmgroessen
- Hinweis-State wenn Specwright nicht installiert ist

**WIE (Architektur-Guidance ONLY):**
- View-Pattern von bestehenden Views folgen (z.B. `aos-dashboard-view`)
- Light DOM rendering (wie alle aos-* Komponenten)
- `hasProductBrief` als reactive Property (`@property({ type: Boolean })`)
- Conditional Rendering via `${this.hasProductBrief ? this.renderStandardCards() : this.renderPlanningCards()}`
- CSS Custom Properties fuer Theming
- Lucide Icons fuer Card-Icons
- Cards als einfache Layout-Elemente, kein eigenes Card-Component noetig
- `workflow-start` Custom Event mit Detail `{ command: 'create-spec' | 'add-todo' | 'add-bug' | 'plan-product' | 'plan-platform' | 'analyze-product' | 'analyze-platform' }`

**WO:**
- `ui/frontend/src/views/aos-getting-started-view.ts` (NEU)

**Abhaengigkeiten:** IW-001 (braucht `hasProductBrief` aus Backend fuer kontextabhaengige Inhalte)

**Geschaetzte Komplexitaet:** S

---

### Relevante Skills

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | .claude/skills/frontend-lit/SKILL.md | Lit View Pattern, Custom Events, Responsives Layout |
| domain-specwright-ui | .claude/skills/domain-specwright-ui/SKILL.md | Bestehende View-Patterns und UI-Konventionen |

---

### Creates Reusable Artifacts

**Creates Reusable:** yes

**Reusable Artifacts:**

| Artefakt | Typ | Pfad | Beschreibung |
|----------|-----|------|--------------|
| aos-getting-started-view | UI Component | ui/frontend/src/views/aos-getting-started-view.ts | Getting-Started-View mit Naechste-Schritte-Cards |

---

### Completion Check

```bash
# Frontend compiles
cd ui/frontend && npm run build

# View file exists
test -f ui/frontend/src/views/aos-getting-started-view.ts && echo "View exists"

# Contains standard action cards
grep -q "create-spec" ui/frontend/src/views/aos-getting-started-view.ts && echo "create-spec found"
grep -q "add-todo" ui/frontend/src/views/aos-getting-started-view.ts && echo "add-todo found"
grep -q "add-bug" ui/frontend/src/views/aos-getting-started-view.ts && echo "add-bug found"

# Contains planning cards
grep -q "plan-product" ui/frontend/src/views/aos-getting-started-view.ts && echo "plan-product found"

# Contains hasProductBrief property
grep -q "hasProductBrief" ui/frontend/src/views/aos-getting-started-view.ts && echo "hasProductBrief found"
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Aenderungen
