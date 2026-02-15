# Datei-Aktionen im Commit-Dialog

> Story ID: GITE-002
> Spec: Git Integration Erweitert
> Created: 2026-02-11
> Last Updated: 2026-02-11

**Priority**: High
**Type**: Frontend
**Estimated Effort**: 3 SP
**Dependencies**: GITE-001

---

## Feature

```gherkin
Feature: Datei-Aktionen im Commit-Dialog
  Als Developer
  moechte ich einzelne Dateien reverten oder untracked Dateien loeschen koennen,
  damit ich mein Working Directory direkt aus dem Commit-Dialog aufraumen kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Einzelne Datei reverten

```gherkin
Scenario: Revert einer modifizierten Datei per Klick
  Given der Commit-Dialog ist geoeffnet
  And die Dateiliste zeigt "src/app.ts" als "modified"
  When ich den Revert-Button neben "src/app.ts" klicke
  Then wird die Datei revertiert
  And die Dateiliste wird aktualisiert (Datei verschwindet)
```

### Szenario 2: Alle Dateien reverten

```gherkin
Scenario: Alle geaenderten Dateien auf einmal reverten
  Given der Commit-Dialog ist geoeffnet
  And 3 Dateien sind als "modified" gelistet
  When ich den "Alle reverten" Button klicke
  Then werden alle 3 Dateien revertiert
  And die Dateiliste wird aktualisiert (alle Dateien verschwinden)
```

### Szenario 3: Untracked Datei loeschen mit Bestaetigung

```gherkin
Scenario: Loeschen einer untracked Datei nach Bestaetigung
  Given der Commit-Dialog ist geoeffnet
  And die Dateiliste zeigt "src/temp.ts" als "untracked"
  When ich den Loeschen-Button neben "src/temp.ts" klicke
  Then erscheint ein Bestaetigungsdialog "Bist du sicher?"
  When ich die Loeschung bestaetige
  Then wird die Datei geloescht
  And die Dateiliste wird aktualisiert
```

### Szenario 4: Loeschung abbrechen

```gherkin
Scenario: Abbrechen der Loeschung im Bestaetigungsdialog
  Given der Bestaetigungsdialog fuer "src/temp.ts" ist sichtbar
  When ich "Abbrechen" klicke
  Then wird die Datei NICHT geloescht
  And der Bestaetigungsdialog schliesst sich
  And die Dateiliste bleibt unveraendert
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Revert-Button ist nur fuer modifizierte/staged Dateien sichtbar
  Given der Commit-Dialog zeigt modified und untracked Dateien
  Then haben nur die modified/staged Dateien einen Revert-Button
  And die untracked Dateien haben stattdessen einen Loeschen-Button

Scenario: "Alle reverten" Button ist deaktiviert bei leerer Liste
  Given der Commit-Dialog ist geoeffnet
  And es gibt keine modified/staged Dateien
  Then ist der "Alle reverten" Button deaktiviert

Scenario: Revert waehrend einer laufenden Operation
  Given eine Revert-Anfrage laeuft gerade
  Then zeigt der Revert-Button einen Lade-Zustand
  And weitere Revert-Klicks sind blockiert
```

---

## Technische Verifikation (Automated Checks)

- [x] FILE_EXISTS: agent-os-ui/ui/src/components/git/aos-git-commit-dialog.ts
- [x] CONTAINS: aos-git-commit-dialog.ts enthaelt "revert-file"
- [x] CONTAINS: aos-git-commit-dialog.ts enthaelt "revert-all"
- [x] CONTAINS: aos-git-commit-dialog.ts enthaelt "delete-untracked"
- [x] CONTAINS: aos-git-commit-dialog.ts enthaelt "autoPush"
- [x] CONTAINS: gateway.ts enthaelt "sendGitRevert"
- [x] CONTAINS: gateway.ts enthaelt "sendGitDeleteUntracked"
- [x] CONTAINS: app.ts enthaelt "revert-file"
- [x] CONTAINS: app.ts enthaelt "delete-untracked"
- [x] LINT_PASS: cd agent-os-ui/ui && npx tsc --noEmit exits with code 0

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
- [x] **Integration hergestellt: aos-git-commit-dialog -> app.ts** (Events)
- [x] **Integration hergestellt: app.ts -> gateway.ts** (sendGitRevert, sendGitDeleteUntracked)
- [x] **Integration hergestellt: Backend Response -> app.ts -> Dateiliste Refresh**

#### Dokumentation
- [x] Dokumentation aktualisiert

---

### Betroffene Layer & Komponenten

**Integration Type:** Full-stack (Frontend + Gateway + App Orchestrierung)

| Layer | Komponenten | Aenderung |
|-------|-------------|----------|
| Frontend | aos-git-commit-dialog.ts | Revert/Delete Buttons pro Datei, "Alle reverten", Bestaetigungsdialog, autoPush Property |
| Frontend | gateway.ts | sendGitRevert(), sendGitDeleteUntracked() Methoden |
| Frontend | app.ts | Event-Handler fuer revert-file, revert-all, delete-untracked + Response-Handler |
| Frontend | theme.css | CSS fuer Action-Buttons |

**Kritische Integration Points:**
- aos-git-commit-dialog -> app.ts: Custom Events (revert-file, revert-all, delete-untracked)
- app.ts -> gateway.ts: Gateway-Methoden-Aufrufe
- Backend git:revert:response -> app.ts: WebSocket Response-Handler + Dateiliste Refresh

**Handover-Dokumente:**
- Shared Types aus GITE-001: GitRevertResult, GitDeleteUntrackedResult

---

### Technical Details

**WAS:**
- Revert/Delete Action-Buttons in der Dateiliste des Commit-Dialogs
- "Alle reverten" Button im Header der Dateiliste
- Bestaetigungs-Dialog fuer Delete (nutzt bestehenden aos-confirm-dialog)
- autoPush Property fuer spaetere Nutzung durch Story 4
- Gateway-Methoden fuer Revert und Delete
- Event-Handler und Response-Handler in app.ts

**WIE (Architektur-Guidance):**
- Folge dem bestehenden Light-DOM Pattern des Commit-Dialogs
- Action-Buttons als kleine Icon-Buttons (16x16), erscheinen pro Datei-Zeile
- Revert-Button nur fuer modified/staged Dateien, Delete nur fuer untracked
- Bestaetigungs-Dialog: Nutze den bestehenden aos-confirm-dialog
- Gateway-Methoden folgen bestehendem Pattern: this.send({ type, ..., timestamp })
- app.ts Event-Handler: Nach erfolgreicher Response _handleRefreshGit() aufrufen
- Loading-State pro Datei via Set<string> fuer den Revert-Zustand

**WO:**
- `agent-os-ui/ui/src/components/git/aos-git-commit-dialog.ts`
- `agent-os-ui/ui/src/gateway.ts`
- `agent-os-ui/ui/src/app.ts`
- `agent-os-ui/ui/src/styles/theme.css`

**WER:** dev-team__frontend-developer

**Abhaengigkeiten:** GITE-001

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
# Commit-Dialog hat Revert/Delete Aktionen
grep -q "revert-file" agent-os-ui/ui/src/components/git/aos-git-commit-dialog.ts
grep -q "revert-all" agent-os-ui/ui/src/components/git/aos-git-commit-dialog.ts
grep -q "delete-untracked" agent-os-ui/ui/src/components/git/aos-git-commit-dialog.ts
# Gateway hat neue Methoden
grep -q "sendGitRevert" agent-os-ui/ui/src/gateway.ts
grep -q "sendGitDeleteUntracked" agent-os-ui/ui/src/gateway.ts
# app.ts hat Handler
grep -q "revert-file" agent-os-ui/ui/src/app.ts
grep -q "delete-untracked" agent-os-ui/ui/src/app.ts
# TypeScript kompiliert
cd agent-os-ui/ui && npx tsc --noEmit
```
