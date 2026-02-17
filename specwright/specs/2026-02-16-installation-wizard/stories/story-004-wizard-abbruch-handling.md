# Wizard Abbruch-Handling

> Story ID: IW-004
> Spec: Installation Wizard
> Created: 2026-02-16
> Last Updated: 2026-02-17 (install.sh Synergy Update)

**Priority**: Medium
**Type**: Frontend
**Estimated Effort**: XS
**Dependencies**: IW-002

---

## Feature

```gherkin
Feature: Wizard Abbruch-Handling
  Als Benutzer der Specwright Web UI
  moechte ich den Wizard abbrechen koennen und beim naechsten Mal erneut daran erinnert werden,
  damit ich den Installationsprozess zu einem passenden Zeitpunkt abschliessen kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Wizard abbrechen zeigt Hinweismeldung

```gherkin
Scenario: Abbruch-Meldung bei Wizard-Abbruch
  Given ich sehe den Wizard Modal
  When ich den Wizard abbreche
  Then sehe ich eine kontextabhaengige Meldung:
    - Wenn hasSpecwright false: "Specwright muss erst installiert werden damit die UI voll nutzbar ist"
    - Wenn hasProductBrief false: "Ein Product Brief wird empfohlen um Specwright optimal zu nutzen"
  And der Modal schliesst sich nach Bestaetigung
```

### Szenario 2: Wizard erscheint beim naechsten Oeffnen erneut

```gherkin
Scenario: Wizard erscheint erneut nach vorherigem Abbruch
  Given ich habe den Wizard zuvor abgebrochen
  When ich das gleiche Projekt erneut oeffne
  Then erscheint der Wizard Modal wieder
  And ich kann den Installationsprozess fortsetzen
```

### Szenario 3: Abbruch waehrend der Terminal-Ausfuehrung

```gherkin
Scenario: Abbruch waehrend laufendem Command
  Given ein Setup-Command laeuft im Wizard-Terminal
  When ich den Wizard abbreche
  Then wird die Terminal-Session beendet
  And ich sehe die Abbruch-Meldung
  And der Wizard erscheint beim naechsten Oeffnen erneut
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: ESC-Taste schliesst den Wizard mit Abbruch-Meldung
  Given ich sehe den Wizard Modal
  When ich die ESC-Taste druecke
  Then sehe ich die Abbruch-Meldung
  And der Wizard wird als nicht abgeschlossen markiert
```

---

## Technische Verifikation (Automated Checks)

### Inhalt-Pruefungen

- [ ] CONTAINS: aos-installation-wizard-modal.ts enthaelt "wizard-cancel"
- [ ] CONTAINS: aos-installation-wizard-modal.ts enthaelt "sessionStorage" oder "wizardNeeded"

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
| Frontend | `aos-installation-wizard-modal.ts` | Cancel-Button, Abbruch-Meldung, ESC-Handling, `wizard-cancel` Event |
| Frontend | `project-state.service.ts` | Wizard-State pro Projektpfad in sessionStorage persistieren |

---

### Technical Details

**WAS:**
- Cancel-Button und ESC-Key-Handler im Wizard-Modal
- Abbruch-Meldung als Overlay-Content innerhalb des Modals
- Wizard-State-Tracking: pro Projektpfad speichern ob Wizard noetig ist
- `wizard-cancel` Custom Event emittieren

**WIE (Architektur-Guidance ONLY):**
- Bestehenden `projectStateService` erweitern (neuer sessionStorage-Key pro Projektpfad)
- Key-Format: `specwright-wizard-needed-{projectPath}` in sessionStorage
- Bei Wizard-Abschluss: Key entfernen (= Wizard nicht mehr noetig)
- Bei Wizard-Abbruch: Key bleibt bestehen (= Wizard erscheint erneut)
- Kein neuer Service noetig - bestehenden projectStateService nutzen

**WO:**
- `ui/frontend/src/components/setup/aos-installation-wizard-modal.ts` (Cancel-Handling hinzufuegen)
- `ui/frontend/src/services/project-state.service.ts` (Wizard-State-Methoden)

**Abhaengigkeiten:** IW-002

**Geschaetzte Komplexitaet:** XS

---

### Relevante Skills

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | .claude/skills/frontend-lit/SKILL.md | Event-Handling, State Management |

---

### Creates Reusable Artifacts

**Creates Reusable:** no

---

### Completion Check

```bash
# Frontend compiles
cd ui/frontend && npm run build

# Cancel event exists
grep -q "wizard-cancel" ui/frontend/src/components/setup/aos-installation-wizard-modal.ts && echo "Cancel event found"

# Wizard state persistence
grep -q "wizard" ui/frontend/src/services/project-state.service.ts && echo "Wizard state found"
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Aenderungen
