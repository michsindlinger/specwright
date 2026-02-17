# Installation Wizard Modal

> Story ID: IW-002
> Spec: Installation Wizard
> Created: 2026-02-16
> Last Updated: 2026-02-17 (install.sh Synergy Update)

**Priority**: High
**Type**: Frontend
**Estimated Effort**: M (erhoet wegen zweistufiger Wizard-Logik mit install.sh-Integration)
**Dependencies**: IW-001

---

## Feature

```gherkin
Feature: Installation Wizard Modal
  Als Benutzer der Specwright Web UI
  moechte ich bei einem neuen Projekt ohne Specwright oder ohne Projektplanung einen uebersichtlichen Wizard sehen,
  damit ich durch Installation und/oder Planning gefuehrt werde.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Wizard zeigt Installations-Schritt bei fehlendem Framework

```gherkin
Scenario: Wizard zeigt Framework-Installation bei Projekt ohne specwright/
  Given ich habe ein neues Projekt ohne specwright/ hinzugefuegt
  And hasSpecwright ist false
  When der Wizard Modal erscheint
  Then sehe ich zuerst einen Installations-Hinweis
  And ein "Framework installieren"-Button startet install.sh im Terminal
  And nach erfolgreicher Installation wechselt der Wizard zum Planning-Schritt
```

### Szenario 2: Wizard zeigt direkt Planning-Commands bei vorhandenem Framework

```gherkin
Scenario: Wizard zeigt direkt Planning-Commands bei Projekt mit specwright/ aber ohne Product Brief
  Given ich habe ein Projekt hinzugefuegt das einen specwright/-Ordner hat
  And hasSpecwright ist true
  And hasProductBrief ist false (z.B. nach install.sh via CLI)
  When der Wizard Modal erscheint
  Then ueberspringt der Wizard den Installations-Schritt
  And ich sehe direkt vier Planning-Auswahl-Cards:
    | Command          | Beschreibung                                           |
    | plan-product     | Fuer ein einzelnes Produkt/Projekt planen              |
    | plan-platform    | Fuer eine Multi-Modul-Plattform planen                 |
    | analyze-product  | Bestehendes Produkt analysieren und Specwright integrieren |
    | analyze-platform | Bestehende Plattform analysieren und Specwright integrieren |
  And jede Card hat eine verstaendliche Beschreibung
```

### Szenario 3: Hinweis bei Bestandsprojekt

```gherkin
Scenario: Bestandsprojekt-Hinweis bei vielen Dateien
  Given ich habe ein Projekt mit vielen bestehenden Dateien hinzugefuegt
  And das Projekt hat keinen Product Brief
  When der Wizard den Planning-Schritt zeigt
  Then sehe ich einen Hinweis dass "analyze-product" oder "analyze-platform" fuer Bestandsprojekte empfohlen wird
  And ich kann trotzdem jede der vier Optionen frei waehlen
```

### Szenario 4: Modal erscheint als Overlay

```gherkin
Scenario: Wizard erscheint als modales Overlay
  Given ich befinde mich in der Specwright Web UI
  When ich ein Projekt ohne specwright/ oder ohne Product Brief hinzufuege
  Then erscheint der Wizard als Modal-Overlay ueber der Hauptansicht
  And der Hintergrund ist abgedunkelt
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Wizard erscheint nicht bei Projekt mit specwright/ und Product Brief
  Given ich fuege ein Projekt hinzu das einen specwright/-Ordner und einen Product Brief enthaelt
  When das Projekt hinzugefuegt wird
  Then erscheint kein Wizard Modal
  And ich sehe die normale Projektansicht

Scenario: Wizard erscheint bei Projekt mit specwright/ aber ohne Product Brief
  Given ich fuege ein Projekt hinzu das einen specwright/-Ordner enthaelt (via install.sh)
  And das Projekt hat keinen Product Brief
  When das Projekt hinzugefuegt wird
  Then erscheint der Wizard Modal direkt im Planning-Schritt
```

---

## Technische Verifikation (Automated Checks)

### Datei-Pruefungen

- [x] FILE_EXISTS: ui/frontend/src/components/setup/aos-installation-wizard-modal.ts

### Inhalt-Pruefungen

- [x] CONTAINS: aos-installation-wizard-modal.ts enthaelt "plan-product"
- [x] CONTAINS: aos-installation-wizard-modal.ts enthaelt "plan-platform"
- [x] CONTAINS: aos-installation-wizard-modal.ts enthaelt "analyze-product"
- [x] CONTAINS: aos-installation-wizard-modal.ts enthaelt "analyze-platform"
- [x] CONTAINS: aos-installation-wizard-modal.ts enthaelt "hasProductBrief"
- [x] CONTAINS: aos-installation-wizard-modal.ts enthaelt "install" (fuer install.sh Schritt)

### Funktions-Pruefungen

- [x] BUILD_PASS: `cd ui/frontend && npm run build` exits with code 0

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
- [x] Security/Performance Anforderungen erfuellt

#### Qualitaetssicherung
- [x] Alle Akzeptanzkriterien erfuellt (via Completion Check verifiziert)
- [x] Code Review durchgefuehrt und genehmigt

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
| Frontend | `aos-installation-wizard-modal.ts` (NEU) | Neue Lit-Komponente: Modal mit Command-Auswahl-Cards, Bestandsprojekt-Hinweis, Multi-Step-UI |

**Kritische Integration Points:**
- Erhaelt `hasSpecwright`, `hasProductBrief`, `fileCount`, `projectPath` als Properties von `app.ts` (Verbindung in IW-006)
- Emittiert `command-selected`, `wizard-cancel`, `modal-close` Events
- Nutzt `hasSpecwright` um zu entscheiden ob Installations-Schritt (install.sh) noetig ist
- Nutzt `hasProductBrief` um zu entscheiden ob Planning-Schritt noetig ist

---

### Technical Details

**WAS:**
- Neue Lit-Komponente `aos-installation-wizard-modal` im `setup/`-Verzeichnis
- **Zweistufige Wizard-Logik:**
  - Wenn `hasSpecwright === false`: Zeigt Installations-Schritt -> Terminal mit `install.sh --yes --all` -> nach Erfolg weiter zu Planning-Schritt
  - Wenn `hasSpecwright === true && hasProductBrief === false`: Ueberspringt Installations-Schritt, zeigt direkt Planning-Schritt
- Multi-Step-UI: [Installations-Schritt (optional)] -> Planning-Auswahl -> Terminal (IW-003) -> Abschluss
- Vier Planning-Command-Cards mit Titel, Icon und Beschreibung
- Bestandsprojekt-Hinweis wenn `fileCount` ueber Threshold

**WIE (Architektur-Guidance ONLY):**
- Modal-Pattern von `aos-project-add-modal.ts` folgen: Light DOM, overlay-click close, ESC close, focus trap
- CSS Custom Properties fuer Theming verwenden (bestehende Theme-Variablen)
- Lucide Icons fuer Card-Icons verwenden (bereits im Projekt)
- Stepper-State als reactive property (`currentStep: 'install' | 'selection' | 'terminal' | 'complete'`)
- Initialer Step basiert auf Properties: `hasSpecwright ? 'selection' : 'install'`
- Command-Cards als einfache clickable-div-Elemente, kein eigenes Component noetig

**WO:**
- `ui/frontend/src/components/setup/aos-installation-wizard-modal.ts` (NEU)

**Abhaengigkeiten:** IW-001 (braucht hasSpecwright/hasProductBrief/fileCount aus Backend)

**Geschaetzte Komplexitaet:** S

---

### Relevante Skills

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | .claude/skills/frontend-lit/SKILL.md | Lit Component Patterns, Light DOM, Events |
| domain-specwright-ui | .claude/skills/domain-specwright-ui/SKILL.md | Bestehende UI-Patterns und Konventionen |

---

### Creates Reusable Artifacts

**Creates Reusable:** yes

**Reusable Artifacts:**

| Artefakt | Typ | Pfad | Beschreibung |
|----------|-----|------|--------------|
| aos-installation-wizard-modal | UI Component | ui/frontend/src/components/setup/aos-installation-wizard-modal.ts | Modaler Wizard fuer Specwright-Installation mit Command-Auswahl und Terminal-Einbettung |

---

### Completion Check

```bash
# Frontend compiles
cd ui/frontend && npm run build

# Component file exists
test -f ui/frontend/src/components/setup/aos-installation-wizard-modal.ts && echo "Component exists"

# Contains all four commands
grep -q "plan-product" ui/frontend/src/components/setup/aos-installation-wizard-modal.ts && echo "plan-product found"
grep -q "analyze-product" ui/frontend/src/components/setup/aos-installation-wizard-modal.ts && echo "analyze-product found"
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Aenderungen
