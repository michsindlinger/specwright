# Auto Commit Message Button im Commit Modal

> Story ID: 2026-02-26-001
> Spec: Backlog Todo
> Created: 2026-02-26
> Last Updated: 2026-02-26

**Priority**: Medium
**Type**: Full-Stack
**Estimated Effort**: 3 SP
**Dependencies**: None

---

## Feature

```gherkin
Feature: Automatische Commit Message Generierung
  Als Entwickler
  moechte ich per Button eine Commit Message automatisch generieren lassen,
  damit ich schneller committen kann ohne die Message manuell schreiben zu muessen.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Automatische Message generieren

```gherkin
Scenario: Commit Message wird automatisch aus staged Changes generiert
  Given ich habe Dateien im Commit Modal ausgewaehlt
  And das Commit Message Feld ist leer
  When ich auf den "Auto Message" Button klicke
  Then wird eine passende Commit Message basierend auf dem git diff generiert
  And die generierte Message erscheint im Textfeld
```

### Szenario 2: Ladeindikator waehrend Generierung

```gherkin
Scenario: Ladezustand waehrend der Message-Generierung
  Given ich habe Dateien ausgewaehlt
  When ich auf den "Auto Message" Button klicke
  Then sehe ich einen Ladeindikator am Button
  And der Button ist waehrend der Generierung deaktiviert
  And nach erfolgreicher Generierung verschwindet der Ladeindikator
```

### Szenario 3: Keine Dateien ausgewaehlt

```gherkin
Scenario: Button ist deaktiviert ohne ausgewaehlte Dateien
  Given ich habe keine Dateien im Commit Modal ausgewaehlt
  Then ist der "Auto Message" Button deaktiviert
```

---

## Technische Verifikation (Automated Checks)

### Datei-Pruefungen

- [ ] FILE_EXISTS: ui/frontend/src/components/git/aos-git-commit-dialog.ts
- [ ] FILE_EXISTS: ui/src/server/handlers/git.handler.ts
- [ ] FILE_EXISTS: ui/src/server/services/git.service.ts
- [ ] FILE_EXISTS: ui/frontend/src/gateway.ts

### Inhalt-Pruefungen

- [ ] CONTAINS: ui/frontend/src/components/git/aos-git-commit-dialog.ts enthaelt "auto-message" oder "generate-message"
- [ ] CONTAINS: ui/src/server/handlers/git.handler.ts enthaelt "generateCommitMessage" oder "generate-commit-message"
- [ ] CONTAINS: ui/src/server/services/git.service.ts enthaelt "generateCommitMessage" oder "getDiff"

### Funktions-Pruefungen

- [ ] LINT_PASS: cd ui && npm run lint exits with code 0
- [ ] BUILD_PASS: cd ui && npm run build:backend exits with code 0
- [ ] BUILD_PASS: cd ui/frontend && npm run build exits with code 0

---

## Required MCP Tools

| Tool | Purpose | Blocking |
|------|---------|----------|
| N/A | Keine speziellen MCP Tools erforderlich | No |

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
- [x] **Alle betroffenen Layer identifiziert** (Frontend/Backend)
- [x] **Integration Type bestimmt** (Full-stack)
- [x] **Kritische Integration Points dokumentiert**
- [x] **Handover-Dokumente definiert** (WebSocket Message Contract)

**Story ist READY - alle Checkboxen angehakt.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [ ] Code implementiert und folgt Style Guide
- [ ] Architektur-Vorgaben eingehalten (WIE section)
- [ ] Security/Performance Anforderungen erfuellt

#### Qualitaetssicherung
- [ ] Alle Akzeptanzkriterien erfuellt (via Completion Check verifiziert)
- [ ] Code Review durchgefuehrt und genehmigt
- [ ] Keine Linting Errors

#### Dokumentation
- [ ] Keine Linting Errors
- [ ] Completion Check Commands alle erfolgreich (exit 0)

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Full-stack

**Betroffene Komponenten:**

| Layer | Komponenten | Aenderung |
|-------|-------------|-----------|
| Frontend | aos-git-commit-dialog.ts | Button "Auto Message" hinzufuegen, Loading State, Event Handler |
| Frontend | gateway.ts | Neue Methode requestGenerateCommitMessage() + Response Handler |
| Backend | git.handler.ts | Neuer Handler handleGenerateCommitMessage() |
| Backend | git.service.ts | Neue Methode generateCommitMessage() mit git diff |

**Kritische Integration Points:**
- Frontend Button Click -> Gateway WebSocket -> Backend Handler -> Git Service -> git diff -> Message zurueck an Frontend
- WebSocket Message: `git:generate-commit-message` (Request) -> `git:generate-commit-message:response` (Response)

**Handover-Dokumente:**
- WebSocket Message Contract:
  - Request: `{ type: "git:generate-commit-message", files: string[] }`
  - Response: `{ type: "git:generate-commit-message:response", data: { message: string } }`
  - Error: `{ type: "git:error", code: "OPERATION_FAILED", operation: "generate-commit-message" }`

---

### Technical Details

**WAS:**
- Frontend: Button "Auto Message" im Commit Dialog neben/ueber dem Textarea
- Frontend: Loading State am Button waehrend Generierung
- Frontend: Gateway-Methode fuer WebSocket-Kommunikation
- Backend: Handler fuer `git:generate-commit-message` Message
- Backend: Service-Methode die `git diff --cached` ausfuehrt und eine sinnvolle Commit Message generiert

**WIE (Architektur-Guidance ONLY):**
- Folge bestehendem WebSocket Message Pattern (siehe git:commit als Referenz)
- Button im Commit Dialog im message-section Bereich platzieren
- Git diff via `execGit(['diff', '--cached', '--stat'], projectPath)` fuer Uebersicht
- Commit Message Generierung: Analyse der geaenderten Dateien und Aenderungstypen aus dem diff
- Einfache heuristische Message-Generierung (kein LLM noetig): Dateitypen + Aenderungsart analysieren
- Loading State ueber bestehende @state() Pattern im Lit Component
- Button disabled wenn keine Dateien ausgewaehlt (gleiche Logik wie canCommit)

**WO:**
- ui/frontend/src/components/git/aos-git-commit-dialog.ts (modifizieren)
- ui/frontend/src/gateway.ts (modifizieren)
- ui/src/server/handlers/git.handler.ts (modifizieren)
- ui/src/server/services/git.service.ts (modifizieren)

**Domain:** git-operations

**Abhaengigkeiten:** None

**Geschaetzte Komplexitaet:** S

---

### Creates Reusable Artifacts

**Creates Reusable:** no

---

### Completion Check

```bash
# Frontend baut
cd ui/frontend && npm run build

# Backend baut
cd ui && npm run build:backend

# Lint passt
cd ui && npm run lint
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Aenderungen
