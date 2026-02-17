# Specwright-Erkennung beim Projekt-Hinzufuegen

> Story ID: IW-001
> Spec: Installation Wizard
> Created: 2026-02-16
> Last Updated: 2026-02-17 (install.sh Synergy Update)

**Priority**: High
**Type**: Backend
**Estimated Effort**: S
**Dependencies**: None

---

## Feature

```gherkin
Feature: Specwright-Erkennung beim Projekt-Hinzufuegen
  Als Benutzer der Specwright Web UI
  moechte ich dass das System automatisch erkennt ob Specwright in einem Projekt installiert ist
  und ob eine Projektplanung (Product Brief) vorliegt,
  damit ich bei fehlender Installation oder fehlender Planung durch einen Wizard gefuehrt werde.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Projekt ohne Specwright wird erkannt

```gherkin
Scenario: Projekt ohne specwright-Ordner wird als nicht-installiert erkannt
  Given ich fuege ein Projekt mit Pfad "/home/user/my-new-project" hinzu
  And das Projekt enthaelt keinen "specwright/"-Ordner
  When das System den Projektpfad validiert
  Then erhaelt das Frontend die Information "hasSpecwright: false"
  And erhaelt das Frontend die Information "hasProductBrief: false"
  And das Frontend erhaelt die Anzahl der Dateien im Projekt
```

### Szenario 2: Projekt mit Specwright und Product Brief wird normal behandelt

```gherkin
Scenario: Projekt mit specwright-Ordner und Product Brief wird als vollstaendig erkannt
  Given ich fuege ein Projekt mit Pfad "/home/user/my-existing-project" hinzu
  And das Projekt enthaelt einen "specwright/"-Ordner
  And das Projekt enthaelt einen Product Brief unter "specwright/product/product-brief.md"
  When das System den Projektpfad validiert
  Then erhaelt das Frontend die Information "hasSpecwright: true"
  And erhaelt das Frontend die Information "hasProductBrief: true"
  And der Wizard wird nicht ausgeloest
```

### Szenario 3: Projekt mit Specwright aber ohne Product Brief (install.sh-Szenario)

```gherkin
Scenario: Projekt mit specwright-Ordner aber ohne Product Brief wird als teilweise installiert erkannt
  Given ich fuege ein Projekt hinzu das einen "specwright/"-Ordner hat
  And der Ordner wurde via install.sh erstellt (enthaelt Workflows und Standards)
  And es existiert KEIN "specwright/product/product-brief.md"
  When das System den Projektpfad validiert
  Then erhaelt das Frontend die Information "hasSpecwright: true"
  And erhaelt das Frontend die Information "hasProductBrief: false"
  And der Wizard wird ausgeloest (fuer Planning-Schritt)
```

### Szenario 4: Bestandsprojekt-Erkennung via Dateianzahl

```gherkin
Scenario: Bestandsprojekt wird anhand der Dateianzahl erkannt
  Given ich fuege ein Projekt hinzu das keinen "specwright/"-Ordner hat
  And das Projekt enthaelt mehr als 10 sichtbare Dateien und Ordner
  When das System den Projektpfad validiert
  Then erhaelt das Frontend eine hohe Dateianzahl
  And das Frontend kann daraus ableiten dass es sich um ein Bestandsprojekt handelt
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Ungueltiger Projektpfad wird abgelehnt
  Given ich fuege einen Projektpfad hinzu der nicht existiert
  When das System den Pfad validiert
  Then erhaelt das Frontend eine Fehlermeldung
  And der Wizard wird nicht angezeigt

Scenario: Unvollstaendiger specwright-Ordner zaehlt als installiert
  Given ich fuege ein Projekt hinzu das einen "specwright/"-Ordner hat
  And der Ordner enthaelt nur wenige Dateien
  When das System den Projektpfad validiert
  Then erhaelt das Frontend die Information "hasSpecwright: true"
  And hasProductBrief wird separat geprueft

Scenario: Product Brief unter .agent-os/ statt specwright/
  Given ich fuege ein Projekt hinzu das einen ".agent-os/"-Ordner hat
  And das Projekt enthaelt ".agent-os/product/product-brief.md"
  When das System den Projektpfad validiert
  Then erhaelt das Frontend die Information "hasSpecwright: true"
  And erhaelt das Frontend die Information "hasProductBrief: true"
```

---

## Technische Verifikation (Automated Checks)

### Datei-Pruefungen

- [ ] FILE_EXISTS: ui/src/server/services/project-context.service.ts
- [ ] CONTAINS: project-context.service.ts enthaelt "hasSpecwright"
- [ ] CONTAINS: project-context.service.ts enthaelt "hasProductBrief"
- [ ] CONTAINS: project-context.service.ts enthaelt "fileCount"

### Funktions-Pruefungen

- [ ] BUILD_PASS: `cd ui && npm run build:backend` exits with code 0
- [ ] LINT_PASS: `cd ui && npm run lint` exits with code 0
- [ ] TEST_PASS: `cd ui && npx vitest run` exits with code 0

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
- [ ] Security/Performance Anforderungen erfuellt

#### Qualitaetssicherung
- [ ] Alle Akzeptanzkriterien erfuellt (via Completion Check verifiziert)
- [ ] Unit Tests geschrieben und bestanden
- [ ] Code Review durchgefuehrt und genehmigt

#### Dokumentation
- [ ] Keine Linting Errors
- [ ] Completion Check Commands alle erfolgreich (exit 0)

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Backend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Aenderung |
|-------|-------------|----------|
| Backend | `project-context.service.ts` | `validateProject()` erweitern: Response um `hasSpecwright`, `hasProductBrief` und `fileCount` ergaenzen. Projekte ohne specwright/ als valid akzeptieren |
| Backend | `project.routes.ts` | `/api/project/validate` Response-Shape erweitern |
| Shared Types | `ui/src/shared/types/` | ValidateResult Interface erweitern um `hasSpecwright: boolean`, `hasProductBrief: boolean` und `fileCount: number` |

**Kritische Integration Points:**
- Backend `/api/project/validate` Response -> Frontend `projectStateService.validateProject()` (Handover zu IW-002)

**Handover-Dokumente:**
- API Contract: `POST /api/project/validate` gibt `{ valid: boolean, hasSpecwright: boolean, hasProductBrief: boolean, fileCount: number, name?: string, error?: string }` zurueck

---

### Technical Details

**WAS:**
- `validateProject()` in `project-context.service.ts` erweitern: Projekte ohne specwright/ nicht mehr als invalid ablehnen, sondern `hasSpecwright: false` zurueckgeben
- Neue Erkennung: `hasProductBrief` prueft ob `product/product-brief.md` im Projekt-Verzeichnis (specwright/ oder .agent-os/) existiert
- Neue Methode oder Erweiterung: Dateianzahl (Top-Level, ohne versteckte Dirs) ermitteln
- `/api/project/validate` Endpoint Response erweitern
- Shared Types fuer das erweiterte ValidateResult

**WIE (Architektur-Guidance ONLY):**
- Bestehende `validateProject()` Logik so anpassen, dass Pfad-Existenz, specwright/-Erkennung und Product-Brief-Erkennung getrennt sind
- `resolveProjectDir()` aus `project-dirs.ts` weiterhin nutzen fuer specwright/-Erkennung (unterstuetzt sowohl `specwright/` als auch `.agent-os/`)
- Product-Brief-Erkennung: `fs.access()` auf `{projectDir}/product/product-brief.md` pruefen, wobei `projectDir` der aufgeloeste specwright/.agent-os Pfad ist
- Dateianzahl via `fs.readdir()` mit Filterung von versteckten Directories (`.git`, `node_modules` etc.)
- Abwaertskompatibilitaet sicherstellen: Bestehende Aufrufer von validateProject muessen weiterhin funktionieren
- Kein rekursiver Scan - nur Top-Level-Eintraege zaehlen

**WO:**
- `ui/src/server/services/project-context.service.ts` (validateProject erweitern)
- `ui/src/server/routes/project.routes.ts` (Response Shape erweitern)
- `ui/src/shared/types/` (ValidateResult Interface erweitern, ggf. neue Datei oder bestehende erweitern)

**Abhaengigkeiten:** None

**Geschaetzte Komplexitaet:** S

---

### Relevante Skills

| Skill | Pfad | Grund |
|-------|------|-------|
| backend-express | .claude/skills/backend-express/SKILL.md | Express Route Handler und Service Layer Patterns |
| quality-gates | .claude/skills/quality-gates/SKILL.md | Qualitaetsstandards fuer Backend-Code |

---

### Creates Reusable Artifacts

**Creates Reusable:** no

---

### Completion Check

```bash
# Backend compiles
cd ui && npm run build:backend

# Lint passes
cd ui && npm run lint

# Tests pass
cd ui && npx vitest run

# ValidateResult contains hasSpecwright
grep -q "hasSpecwright" ui/src/server/services/project-context.service.ts && echo "hasSpecwright found"

# ValidateResult contains hasProductBrief
grep -q "hasProductBrief" ui/src/server/services/project-context.service.ts && echo "hasProductBrief found"

# ValidateResult contains fileCount
grep -q "fileCount" ui/src/server/services/project-context.service.ts && echo "fileCount found"
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Aenderungen
