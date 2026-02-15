# Branch-Wechsel

> Story ID: GIT-003
> Spec: Git Integration UI
> Created: 2026-02-11
> Last Updated: 2026-02-11

**Priority**: High
**Type**: Frontend
**Estimated Effort**: 2 SP
**Dependencies**: GIT-002

---

## Feature

```gherkin
Feature: Branch-Wechsel
  Als Entwickler
  moechte ich direkt in der Web UI den Git-Branch wechseln koennen,
  damit ich nicht ins Terminal wechseln muss um an einem anderen Branch zu arbeiten.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Branch-Dropdown oeffnen

```gherkin
Scenario: Branch-Dropdown zeigt lokale Branches
  Given ich habe ein Projekt mit den lokalen Branches "main", "develop", "feature/login"
  And ich bin auf dem Branch "main"
  When ich auf den Branch-Namen in der Status-Leiste klicke
  Then oeffnet sich ein Dropdown mit allen 3 Branches
  And der aktuelle Branch "main" ist visuell hervorgehoben
```

### Szenario 2: Branch wechseln

```gherkin
Scenario: Erfolgreicher Branch-Wechsel
  Given ich bin auf dem Branch "main"
  And ich habe keine uncommitted Changes
  When ich im Dropdown den Branch "develop" auswaehle
  Then wechselt der Branch zu "develop"
  And die Status-Leiste zeigt "develop" als aktuellen Branch
  And die Ahead/Behind und Changed Files Zaehler werden aktualisiert
```

### Szenario 3: Branch-Wechsel mit Uncommitted Changes blockiert

```gherkin
Scenario: Branch-Wechsel bei uncommitted Changes blockiert
  Given ich bin auf dem Branch "main"
  And ich habe 3 uncommitted Changes
  When ich im Dropdown den Branch "develop" auswaehle
  Then wird der Branch-Wechsel blockiert
  And ich sehe eine Warnung "Bitte lokale Aenderungen erst committen oder verwerfen"
  And ich bleibe auf dem Branch "main"
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Nur ein Branch vorhanden
  Given es gibt nur den Branch "main"
  When ich auf den Branch-Namen klicke
  Then oeffnet sich das Dropdown mit nur einem Eintrag "main"
  And der Eintrag ist nicht klickbar (da bereits aktiv)
```

```gherkin
Scenario: Branch-Wechsel schlaegt fehl
  Given ich habe keine uncommitted Changes
  When ich den Branch wechsle und Git einen Fehler meldet
  Then sehe ich eine Fehlermeldung mit dem Git-Fehler
  And ich bleibe auf dem aktuellen Branch
```

---

## Technische Verifikation (Automated Checks)

- [x] **CONTAINS:** `agent-os-ui/ui/src/components/git/aos-git-status-bar.ts` enthaelt Branch-Dropdown Logik (z.B. `branch-dropdown` oder `branch-list`)
- [x] **CONTAINS:** `agent-os-ui/ui/src/gateway.ts` enthaelt `sendGitCheckout`
- [x] **CONTAINS:** `agent-os-ui/ui/src/components/git/aos-git-status-bar.ts` enthaelt `aos-confirm-dialog` oder `confirm-dialog`
- [x] **BUILD_PASS:** `cd agent-os-ui && npm run build`

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
- [x] Alle betroffenen Layer identifiziert
- [x] Integration Type bestimmt
- [x] Kritische Integration Points dokumentiert (wenn Full-stack)
- [x] Handover-Dokumente definiert (bei Multi-Layer)

---

### DoD (Definition of Done) - Vom Architect

- [x] Code implemented and follows Style Guide
- [x] Architecture requirements met (Light DOM, Event-based communication)
- [x] All acceptance criteria met (Dropdown mit Branches, Branch-Wechsel, Uncommitted-Changes-Warnung)
- [x] No linting errors (`cd agent-os-ui && npm run lint`)
- [x] Branch-Dropdown oeffnet sich bei Klick auf Branch-Name
- [x] Aktueller Branch ist im Dropdown visuell hervorgehoben
- [x] Bei uncommitted changes wird `aos-confirm-dialog` wiederverwendet
- [x] Branch-Wechsel laedt Git-Status automatisch neu
- [x] Completion Check commands successful

---

### Betroffene Layer & Komponenten

- **Integration Type:** Frontend-only (erweitert bestehende Component + Gateway)

| Layer | Komponenten | Aenderung |
|-------|-------------|-----------|
| Presentation | `aos-git-status-bar.ts` | **ERWEITERN** - Branch-Dropdown Logik, Branch-Liste Rendering, Click Handler |
| Service Layer | `gateway.ts` | **ERWEITERN** - Neue Methode `sendGitCheckout()` und Response Handler |

---

### Technical Details

- **WAS:**
  - Erweiterung `aos-git-status-bar` um klickbaren Branch-Namen der ein Dropdown mit allen lokalen Branches oeffnet
  - Erweiterung `gateway.ts` um `sendGitCheckout(branch)` Methode
  - Wiederverwendung von `aos-confirm-dialog` fuer Uncommitted-Changes-Warnung

- **WIE:**
  - **Dropdown Pattern:** Branch-Name in der Status-Leiste wird klickbar; Klick toggled ein absolut positioniertes Dropdown-Element mit der Branch-Liste
  - **Branch-Liste:** Branches werden als Properties von `app.ts` uebergeben (bereits in GIT-002 ueber `requestGitBranches()` geladen)
  - **Uncommitted-Changes-Check:** Vor dem Branch-Wechsel pruefen ob `changedFilesCount > 0`; wenn ja, `aos-confirm-dialog` dispatchen (bestehendes Komponenten-Pattern)
  - **Event Flow:** Dropdown-Klick -> pruefen auf uncommitted changes -> ggf. Confirm Dialog -> Custom Event `checkout-branch` -> app.ts -> Gateway `sendGitCheckout()` -> WebSocket -> Backend
  - **CSS:** Dropdown-Styles als CSS Custom Properties in bestehende `.git-status-bar` Styles integrieren

- **WO:**
  - `agent-os-ui/ui/src/components/git/aos-git-status-bar.ts` (ERWEITERN)
  - `agent-os-ui/ui/src/gateway.ts` (ERWEITERN)

- **WER:** dev-team__frontend-developer

- **Abhaengigkeiten:** GIT-002 (Status-Leiste muss existieren mit Branch-Anzeige und branches-Daten)

- **Geschaetzte Komplexitaet:** S

### Relevante Skills

| Skill | Pfad | Grund |
|-------|------|-------|
| Light DOM Lit Components | Referenz: alle `aos-*` Components in `ui/src/components/` | Erweitert bestehende Component |
| Confirm Dialog Pattern | Referenz: `ui/src/components/aos-confirm-dialog.ts` | Wiederverwendung fuer Warndialog |

---

### Creates Reusable Artifacts

**Nein** - Erweitert nur bestehende Komponenten.

---

### Completion Check

```bash
# Verify branch dropdown logic in status bar
grep -q "branch" agent-os-ui/ui/src/components/git/aos-git-status-bar.ts && echo "PASS: branch logic in status bar" || echo "FAIL"

# Verify gateway checkout method
grep -q "sendGitCheckout" agent-os-ui/ui/src/gateway.ts && echo "PASS: gateway sendGitCheckout" || echo "FAIL"

# Verify confirm dialog reuse for uncommitted changes warning
grep -q "confirm" agent-os-ui/ui/src/components/git/aos-git-status-bar.ts && echo "PASS: confirm dialog reuse" || echo "FAIL"

# Build check
cd agent-os-ui && npm run build && echo "PASS: build successful" || echo "FAIL: build failed"
```
