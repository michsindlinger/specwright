# PR-Anzeige in Status-Leiste

> Story ID: GITE-003
> Spec: Git Integration Erweitert
> Created: 2026-02-11
> Last Updated: 2026-02-11

**Priority**: High
**Type**: Frontend
**Estimated Effort**: 2 SP
**Dependencies**: GITE-001

---

## Feature

```gherkin
Feature: PR-Anzeige in Status-Leiste
  Als Developer
  moechte ich sehen ob ein Pull Request fuer meinen Branch existiert,
  damit ich den PR-Status im Blick habe und schnell darauf zugreifen kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: PR-Badge wird angezeigt

```gherkin
Scenario: PR-Badge erscheint wenn PR existiert
  Given der aktuelle Branch hat einen offenen Pull Request #42
  When die Git-Status-Leiste geladen wird
  Then sehe ich einen PR-Badge "#42 OPEN" in der Status-Leiste
  And der Badge hat eine gruene Hintergrundfarbe
```

### Szenario 2: PR-Badge ist klickbar

```gherkin
Scenario: Klick auf PR-Badge oeffnet GitHub im Browser
  Given der PR-Badge "#42 OPEN" ist sichtbar
  When ich auf den PR-Badge klicke
  Then oeffnet sich die GitHub-PR-Seite in einem neuen Browser-Tab
```

### Szenario 3: Kein PR vorhanden

```gherkin
Scenario: Kein Badge wenn kein PR existiert
  Given der aktuelle Branch hat keinen Pull Request
  When die Git-Status-Leiste geladen wird
  Then wird kein PR-Badge angezeigt
  And die Status-Leiste sieht normal aus (kein leerer Platzhalter)
```

### Szenario 4: PR-Status Farben

```gherkin
Scenario Outline: PR-Badge Farbe entspricht dem PR-Status
  Given der aktuelle Branch hat einen PR mit Status "<status>"
  When die Git-Status-Leiste geladen wird
  Then hat der PR-Badge die Farbe "<farbe>"

  Examples:
    | status | farbe  |
    | OPEN   | gruen  |
    | MERGED | lila   |
    | CLOSED | rot    |
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: PR-Info wird bei Branch-Wechsel aktualisiert
  Given der aktuelle Branch "feature-a" hat PR #42
  When ich zu Branch "feature-b" wechsle der keinen PR hat
  Then verschwindet der PR-Badge

Scenario: gh CLI nicht verfuegbar
  Given das gh CLI Tool ist nicht installiert
  When die Git-Status-Leiste geladen wird
  Then wird kein PR-Badge angezeigt
  And es erscheint keine Fehlermeldung
```

---

## Technische Verifikation (Automated Checks)

- [ ] FILE_EXISTS: agent-os-ui/ui/src/components/git/aos-git-status-bar.ts
- [ ] CONTAINS: aos-git-status-bar.ts enthaelt "prInfo"
- [ ] CONTAINS: aos-git-status-bar.ts enthaelt "pr-badge"
- [ ] CONTAINS: gateway.ts enthaelt "requestGitPrInfo"
- [ ] CONTAINS: app.ts enthaelt "git:pr-info:response"
- [ ] CONTAINS: app.ts enthaelt "gitPrInfo"
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
- [ ] Code implementiert und folgt Style Guide
- [ ] Architektur-Vorgaben eingehalten (WIE section)
- [ ] Security/Performance Anforderungen erfuellt

#### Qualitaetssicherung
- [ ] Alle Akzeptanzkriterien erfuellt
- [ ] Code Review durchgefuehrt
- [ ] Keine Linting Errors
- [ ] Completion Check Commands alle erfolgreich (exit 0)

#### Integration
- [ ] **Integration hergestellt: app.ts -> gateway.requestGitPrInfo()**
- [ ] **Integration hergestellt: Backend git:pr-info:response -> app.ts State**
- [ ] **Integration hergestellt: app.ts .prInfo -> aos-git-status-bar**

#### Dokumentation
- [ ] Dokumentation aktualisiert

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only (nutzt Backend aus GITE-001)

| Layer | Komponenten | Aenderung |
|-------|-------------|----------|
| Frontend | aos-git-status-bar.ts | PR-Badge Rendering mit Status-Farben, Klick-Handler |
| Frontend | gateway.ts | requestGitPrInfo() Methode |
| Frontend | app.ts | gitPrInfo State, Response-Handler, PR-Info bei Status-Load anfragen |
| Frontend | theme.css | CSS fuer PR-Badge (open/merged/closed Farben) |

**Kritische Integration Points:**
- app.ts -> gateway.ts: requestGitPrInfo() Aufruf bei _loadGitStatus()
- Backend git:pr-info:response -> app.ts: gitPrInfo State Update
- app.ts -> aos-git-status-bar: .prInfo Property Binding

---

### Technical Details

**WAS:**
- requestGitPrInfo() Methode in gateway.ts
- gitPrInfo State und Response-Handler in app.ts
- PR-Info Anfrage bei jedem _loadGitStatus() Aufruf
- PR-Badge Rendering in aos-git-status-bar mit Status-Farben
- Klick oeffnet PR-URL in neuem Tab

**WIE (Architektur-Guidance):**
- Gateway-Methode folgt bestehendem Pattern: this.send({ type: 'git:pr-info', timestamp })
- app.ts: gitPrInfo als @state() Property, Handler registriert auf 'git:pr-info:response'
- PR-Info parallel zu gitStatus und gitBranches anfragen (in _loadGitStatus)
- Status-Bar: prInfo als @property(), bedingte Anzeige mit ternary operator
- Badge als <a> Element mit target="_blank" rel="noopener"
- CSS-Klassen mit BEM: git-status-bar__pr-badge, --open, --merged, --closed

**WO:**
- `agent-os-ui/ui/src/components/git/aos-git-status-bar.ts`
- `agent-os-ui/ui/src/gateway.ts`
- `agent-os-ui/ui/src/app.ts`
- `agent-os-ui/ui/src/styles/theme.css`

**WER:** dev-team__frontend-developer

**Abhaengigkeiten:** GITE-001

**Geschaetzte Komplexitaet:** XS

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
# Status-Bar hat PR-Badge
grep -q "prInfo" agent-os-ui/ui/src/components/git/aos-git-status-bar.ts
grep -q "pr-badge" agent-os-ui/ui/src/components/git/aos-git-status-bar.ts
# Gateway hat PR-Info Methode
grep -q "requestGitPrInfo" agent-os-ui/ui/src/gateway.ts
# app.ts hat PR-Info Handler
grep -q "git:pr-info:response" agent-os-ui/ui/src/app.ts
grep -q "gitPrInfo" agent-os-ui/ui/src/app.ts
# TypeScript kompiliert
cd agent-os-ui/ui && npx tsc --noEmit
```
