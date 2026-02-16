# Getting Started View

> Story ID: IW-005
> Spec: Installation Wizard
> Created: 2026-02-16
> Last Updated: 2026-02-16

**Priority**: High
**Type**: Frontend
**Estimated Effort**: S
**Dependencies**: None

---

## Feature

```gherkin
Feature: Getting Started View
  Als Benutzer der Specwright Web UI
  moechte ich nach der Installation eine uebersichtliche Naechste-Schritte-Seite sehen,
  damit ich sofort weiss wie ich mit Specwright weiterarbeiten kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Drei Aktions-Cards werden angezeigt

```gherkin
Scenario: Getting Started zeigt drei naechste Aktionen
  Given ich befinde mich auf der /getting-started Seite
  When die Seite geladen wird
  Then sehe ich drei Aktions-Cards:
    | Aktion      | Beschreibung                                    |
    | create-spec | Feature-Spezifikation erstellen                 |
    | add-todo    | Schnelle Aufgabe zum Backlog hinzufuegen        |
    | add-bug     | Bug mit Root-Cause-Analyse erfassen             |
  And jede Card hat eine verstaendliche Beschreibung fuer Einsteiger und Erfahrene
```

### Szenario 2: Aktions-Card fuehrt zum entsprechenden Workflow

```gherkin
Scenario: Klick auf Aktions-Card startet den Workflow
  Given ich sehe die Getting Started Seite
  When ich auf die "create-spec" Card klicke
  Then wird der create-spec Workflow gestartet
```

### Szenario 3: Seite ist spaeter ueber Menu erreichbar

```gherkin
Scenario: Getting Started ueber Navigation erreichbar
  Given ich befinde mich auf einer anderen Seite der Specwright UI
  When ich den "Getting Started" Menuepunkt in der Navigation anklicke
  Then werde ich zur /getting-started Seite weitergeleitet
  And ich sehe die drei Aktions-Cards
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

- [ ] FILE_EXISTS: ui/frontend/src/views/aos-getting-started-view.ts

### Inhalt-Pruefungen

- [ ] CONTAINS: aos-getting-started-view.ts enthaelt "create-spec"
- [ ] CONTAINS: aos-getting-started-view.ts enthaelt "add-todo"
- [ ] CONTAINS: aos-getting-started-view.ts enthaelt "add-bug"

### Funktions-Pruefungen

- [ ] BUILD_PASS: `cd ui/frontend && npm run build` exits with code 0

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
- [ ] Code implementiert und folgt Style Guide
- [ ] Architektur-Vorgaben eingehalten (WIE section)

#### Qualitaetssicherung
- [ ] Alle Akzeptanzkriterien erfuellt
- [ ] Code Review durchgefuehrt und genehmigt

#### Dokumentation
- [ ] Keine Linting Errors
- [ ] Completion Check Commands alle erfolgreich (exit 0)

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Aenderung |
|-------|-------------|----------|
| Frontend | `aos-getting-started-view.ts` (NEU) | Neue View-Komponente: Drei Aktions-Cards fuer create-spec, add-todo, add-bug mit Beschreibungen |

**Kritische Integration Points:**
- Emittiert `workflow-start` Event an `app.ts` zum Triggern von Workflows (Verbindung in IW-006)

---

### Technical Details

**WAS:**
- Neue View-Komponente `aos-getting-started-view` im `views/`-Verzeichnis
- Drei Aktions-Cards mit Icon, Titel und Beschreibung
- Jede Card emittiert ein Event zum Starten des Workflows
- Responsives Layout fuer verschiedene Bildschirmgroessen
- Hinweis-State wenn Specwright nicht installiert ist

**WIE (Architektur-Guidance ONLY):**
- View-Pattern von bestehenden Views folgen (z.B. `aos-dashboard-view`)
- Light DOM rendering (wie alle aos-* Komponenten)
- CSS Custom Properties fuer Theming
- Lucide Icons fuer Card-Icons
- Cards als einfache Layout-Elemente, kein eigenes Card-Component noetig
- `workflow-start` Custom Event mit Detail `{ command: 'create-spec' | 'add-todo' | 'add-bug' }`

**WO:**
- `ui/frontend/src/views/aos-getting-started-view.ts` (NEU)

**Abhaengigkeiten:** None (kann parallel gebaut werden)

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

# Contains all three actions
grep -q "create-spec" ui/frontend/src/views/aos-getting-started-view.ts && echo "create-spec found"
grep -q "add-todo" ui/frontend/src/views/aos-getting-started-view.ts && echo "add-todo found"
grep -q "add-bug" ui/frontend/src/views/aos-getting-started-view.ts && echo "add-bug found"
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Aenderungen
