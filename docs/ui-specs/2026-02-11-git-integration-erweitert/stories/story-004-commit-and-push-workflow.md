# Commit & Push Workflow

> Story ID: GITE-004
> Spec: Git Integration Erweitert
> Created: 2026-02-11
> Last Updated: 2026-02-11

**Priority**: High
**Type**: Frontend
**Estimated Effort**: 2 SP
**Dependencies**: GITE-002

---

## Feature

```gherkin
Feature: Commit & Push Workflow
  Als Developer
  moechte ich mit einem Klick alle Aenderungen committen und pushen koennen,
  damit ich den haeufigsten Git-Workflow schnell ausfuehren kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Commit & Push Button in Status-Leiste

```gherkin
Scenario: "Commit & Push" Button ist sichtbar
  Given geaenderte Dateien existieren im Working Directory
  When ich die Git-Status-Leiste sehe
  Then gibt es einen "Commit & Push" Button neben den anderen Aktions-Buttons
```

### Szenario 2: Commit & Push oeffnet Dialog mit allen Dateien

```gherkin
Scenario: Klick auf "Commit & Push" oeffnet Commit-Dialog
  Given 5 Dateien sind geaendert
  When ich den "Commit & Push" Button klicke
  Then oeffnet sich der Commit-Dialog
  And alle 5 Dateien sind vorausgewaehlt
  And der Commit-Button zeigt "Commit & Push (5)"
```

### Szenario 3: Erfolgreicher Commit & Push

```gherkin
Scenario: Commit und Push werden sequentiell ausgefuehrt
  Given der Commit-Dialog ist im "Commit & Push" Modus geoeffnet
  And ich habe eine Commit-Message "feat: update UI" eingegeben
  When ich den "Commit & Push" Button klicke
  Then zeigt der Button zuerst "Committing..."
  And nach erfolgreichem Commit zeigt er "Pushing..."
  And nach erfolgreichem Push schliesst sich der Dialog
  And eine Erfolgsmeldung erscheint
```

### Szenario 4: Push schlaegt fehl nach Commit

```gherkin
Scenario: Push-Fehler nach erfolgreichem Commit
  Given der Commit war erfolgreich
  And der automatische Push schlaegt fehl (z.B. Netzwerkfehler)
  Then schliesst sich der Dialog
  And eine Fehlermeldung erscheint "Commit erfolgreich, Push fehlgeschlagen"
  And die Status-Leiste zeigt den aktualisierten ahead-Counter
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: "Commit & Push" Button deaktiviert wenn keine Aenderungen
  Given es gibt keine geaenderten Dateien
  Then ist der "Commit & Push" Button deaktiviert

Scenario: "Commit & Push" Button deaktiviert waehrend Operation
  Given eine Git-Operation laeuft gerade
  Then ist der "Commit & Push" Button deaktiviert

Scenario: Dialog kann waehrend Push nicht geschlossen werden
  Given der automatische Push laeuft nach dem Commit
  Then ist der "Schliessen" Button des Dialogs deaktiviert
  And der "Abbrechen" Button ist deaktiviert
```

---

## Technische Verifikation (Automated Checks)

- [ ] CONTAINS: aos-git-status-bar.ts enthaelt "commit-push" oder "commitPush" oder "Commit & Push"
- [ ] CONTAINS: app.ts enthaelt "autoPush" oder "commitAndPush"
- [ ] CONTAINS: app.ts enthaelt "pushing" oder "commitAndPushPhase"
- [ ] CONTAINS: aos-git-commit-dialog.ts enthaelt "autoPush"
- [ ] LINT_PASS: cd agent-os-ui/ui && npx tsc --noEmit exits with code 0

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

#### Full-Stack Konsistenz
- [x] Alle betroffenen Layer identifiziert
- [x] Integration Type bestimmt
- [x] Kritische Integration Points dokumentiert
- [x] Handover-Dokumente definiert

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [x] Code implementiert und folgt Style Guide
- [x] Architektur-Vorgaben eingehalten (WIE section)
- [x] Security/Performance Anforderungen erfuellt

#### Qualitaetssicherung
- [x] Alle Akzeptanzkriterien erfuellt
- [x] Code Review durchgefuehrt
- [x] Keine Linting Errors
- [x] Completion Check Commands alle erfolgreich (exit 0)

#### Integration
- [x] **Integration hergestellt: aos-git-status-bar -> app.ts** (open-commit-dialog mit autoPush)
- [x] **Integration hergestellt: app.ts Orchestrierung** (commit -> push Sequenz)
- [x] **Integration hergestellt: app.ts -> aos-git-commit-dialog** (progressPhase Property)

#### Dokumentation
- [x] Dokumentation aktualisiert

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

| Layer | Komponenten | Aenderung |
|-------|-------------|----------|
| Frontend | aos-git-status-bar.ts | "Commit & Push" Button |
| Frontend | app.ts | Commit & Push Orchestrierung (commit -> push Sequenz), State Management |
| Frontend | aos-git-commit-dialog.ts | progressPhase Property, Button-Text Aenderung, Dialog-Sperre waehrend Push |
| Frontend | theme.css | CSS fuer Commit & Push Button und Progress-States |

**Kritische Integration Points:**
- aos-git-status-bar -> app.ts: @open-commit-dialog Event mit { autoPush: true }
- app.ts -> aos-git-commit-dialog: .autoPush und .progressPhase Properties
- app.ts Orchestrierung: Nach Commit-Success -> gateway.requestGitPush()
- app.ts Push-Response: Fehlerbehandlung + Dialog schliessen

---

### Technical Details

**WAS:**
- "Commit & Push" Button in der Status-Leiste
- commitAndPushPhase State in app.ts ('idle' | 'committing' | 'pushing')
- Orchestrierung: commit -> wait -> push -> wait -> done
- progressPhase Property im Commit-Dialog fuer Button-Text
- Dialog-Sperre waehrend Push-Phase
- Fehlerbehandlung: "Commit erfolgreich, Push fehlgeschlagen"

**WIE (Architektur-Guidance):**
- Status-Bar: Neuer Button neben bestehendem Commit-Button
- Event-Detail fuer open-commit-dialog erweitern um { autoPush: true }
- app.ts: _pendingAutoPush Flag, nach Commit-Response pruefen
- Nach erfolgreichem Commit: gateway.requestGitPush() aufrufen (kein neues Backend-Endpoint!)
- Bestehenden boundGitPushHandler erweitern fuer Auto-Push Szenario
- Dialog: autoPush Property aendert Button-Text, progressPhase zeigt Fortschritt
- Fehlerfall: Commit war erfolgreich (irreversibel), nur Push-Fehler melden

**WO:**
- `agent-os-ui/ui/src/components/git/aos-git-status-bar.ts`
- `agent-os-ui/ui/src/app.ts`
- `agent-os-ui/ui/src/components/git/aos-git-commit-dialog.ts`
- `agent-os-ui/ui/src/styles/theme.css`

**WER:** dev-team__frontend-developer

**Abhaengigkeiten:** GITE-002

**Geschaetzte Komplexitaet:** S

---

### Relevante Skills

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | .claude/skills/frontend-lit/SKILL.md | Lit Web Components Development Patterns |

---

### Creates Reusable Artifacts

**Creates Reusable:** no

---

### Completion Check

```bash
# Status-Bar hat Commit & Push Button
grep -qE "commit.*push|commitPush|Commit & Push" agent-os-ui/ui/src/components/git/aos-git-status-bar.ts
# app.ts hat Orchestrierung
grep -qE "autoPush|commitAndPush" agent-os-ui/ui/src/app.ts
# Commit-Dialog hat autoPush Property
grep -q "autoPush" agent-os-ui/ui/src/components/git/aos-git-commit-dialog.ts
# TypeScript kompiliert
cd agent-os-ui/ui && npx tsc --noEmit
```
