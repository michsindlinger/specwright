# Commit-Dialog

> Story ID: GIT-004
> Spec: Git Integration UI
> Created: 2026-02-11
> Last Updated: 2026-02-11

**Priority**: High
**Type**: Frontend
**Estimated Effort**: 3 SP
**Dependencies**: GIT-002

---

## Feature

```gherkin
Feature: Commit-Dialog
  Als Entwickler
  moechte ich ueber einen Dialog gezielt einzelne Dateien committen koennen,
  damit ich saubere, fokussierte Commits erstellen kann ohne alle Aenderungen auf einmal committen zu muessen.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Commit-Dialog oeffnen

```gherkin
Scenario: Commit-Dialog oeffnet sich bei Klick auf Commit-Button
  Given ich habe 5 geaenderte Dateien im Projekt
  When ich auf den Commit-Button in der Status-Leiste klicke
  Then oeffnet sich ein Modal-Dialog
  And ich sehe eine Liste aller 5 geaenderten Dateien mit Checkboxen
  And ich sehe ein Commit-Message-Feld
```

### Szenario 2: Dateien mit Status anzeigen

```gherkin
Scenario: Dateiliste zeigt Aenderungsstatus
  Given der Commit-Dialog ist geoeffnet
  And die Dateien haben verschiedene Status
  When ich die Dateiliste betrachte
  Then sehe ich "src/app.ts" mit Status "modified"
  And ich sehe "src/new-file.ts" mit Status "added"
  And ich sehe "src/old-file.ts" mit Status "deleted"
  And ich sehe "config.json" mit Status "untracked"
```

### Szenario 3: Einzelne Dateien auswaehlen

```gherkin
Scenario: Nur bestimmte Dateien zum Commit auswaehlen
  Given der Commit-Dialog zeigt 5 Dateien
  And keine Datei ist ausgewaehlt
  When ich die Checkboxen von "src/app.ts" und "src/utils.ts" aktiviere
  Then sind genau 2 Dateien ausgewaehlt
  And der Commit-Button ist aktiviert
```

### Szenario 4: Commit erfolgreich ausfuehren

```gherkin
Scenario: Commit mit ausgewaehlten Dateien und Message
  Given ich habe 2 Dateien ausgewaehlt
  And ich habe die Commit-Message "fix: update routing" eingegeben
  When ich auf den Commit-Button klicke
  Then wird der Commit ausgefuehrt
  And der Dialog schliesst sich
  And die Status-Leiste wird aktualisiert
  And die Anzahl geaenderter Dateien sinkt um 2
```

### Szenario 5: Commit-Button deaktiviert ohne Auswahl

```gherkin
Scenario: Commit-Button ist deaktiviert ohne Datei-Auswahl
  Given der Commit-Dialog ist geoeffnet
  And keine Datei ist ausgewaehlt
  When ich die Commit-Message "some change" eingebe
  Then bleibt der Commit-Button deaktiviert
```

### Szenario 6: Commit-Button deaktiviert ohne Message

```gherkin
Scenario: Commit-Button ist deaktiviert ohne Commit-Message
  Given der Commit-Dialog ist geoeffnet
  And ich habe 2 Dateien ausgewaehlt
  When das Commit-Message-Feld leer ist
  Then ist der Commit-Button deaktiviert
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Dialog schliessen ohne Commit
  Given der Commit-Dialog ist geoeffnet
  And ich habe Dateien ausgewaehlt und eine Message eingegeben
  When ich auf "Abbrechen" klicke
  Then schliesst sich der Dialog
  And es wird kein Commit ausgefuehrt
```

```gherkin
Scenario: Sehr viele geaenderte Dateien
  Given es gibt 50 geaenderte Dateien
  When der Commit-Dialog geoeffnet wird
  Then ist die Dateiliste scrollbar
  And alle 50 Dateien sind sichtbar per Scrollen
```

```gherkin
Scenario: Commit schlaegt fehl
  Given ich habe Dateien und Message eingegeben
  When der Commit aus einem technischen Grund fehlschlaegt
  Then sehe ich eine Fehlermeldung im Dialog
  And der Dialog bleibt offen
  And ich kann es erneut versuchen
```

---

## Technische Verifikation (Automated Checks)

- [x] **FILE_EXISTS:** `agent-os-ui/ui/src/components/git/aos-git-commit-dialog.ts`
- [x] **CONTAINS:** `agent-os-ui/ui/src/components/git/aos-git-commit-dialog.ts` enthaelt `class AosGitCommitDialog`
- [x] **CONTAINS:** `agent-os-ui/ui/src/components/git/aos-git-commit-dialog.ts` enthaelt `createRenderRoot`
- [x] **CONTAINS:** `agent-os-ui/ui/src/gateway.ts` enthaelt `sendGitCommit`
- [x] **CONTAINS:** `agent-os-ui/ui/src/app.ts` enthaelt `aos-git-commit-dialog`
- [x] **CONTAINS:** `agent-os-ui/ui/src/components/git/aos-git-commit-dialog.ts` enthaelt `checkbox` oder `checked`
- [x] **CONTAINS:** `agent-os-ui/ui/src/components/git/aos-git-commit-dialog.ts` enthaelt `textarea` oder `commit-message`
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
- [x] Architecture requirements met (Light DOM Lit Component, Modal Pattern)
- [x] All acceptance criteria met (Dateiliste mit Checkboxen, Status-Badges, Commit-Message, Button-Deaktivierung)
- [x] No linting errors (`cd agent-os-ui && npm run lint`)
- [x] Modal oeffnet sich bei Klick auf Commit-Button in Status-Leiste
- [x] Dateiliste zeigt Status-Badges (modified, added, deleted, untracked)
- [x] Commit-Button ist deaktiviert wenn keine Datei oder keine Message
- [x] Commit-Erfolg schliesst Dialog und aktualisiert Status-Leiste
- [x] Commit-Fehler zeigt Fehlermeldung im Dialog
- [x] Dateiliste ist scrollbar bei vielen Dateien
- [x] CSS nutzt Custom Properties aus theme.css
- [x] Completion Check commands successful

---

### Betroffene Layer & Komponenten

- **Integration Type:** Frontend-only (neue Component + Gateway + app.ts Erweiterung)

| Layer | Komponenten | Aenderung |
|-------|-------------|-----------|
| Presentation | `aos-git-commit-dialog.ts` | **NEU** - Modal-Dialog mit Dateiliste, Checkboxen, Commit-Message-Feld |
| Presentation | `app.ts` | **ERWEITERN** - Commit-Dialog Template, State Property fuer Dialog-Visibility, Event Handler |
| Service Layer | `gateway.ts` | **ERWEITERN** - Neue Methode `sendGitCommit(files, message)` und Response Handler |

**Kritische Integration Points:**
- `aos-git-status-bar` dispatcht `open-commit-dialog` Event -> `app.ts` setzt Dialog-Visibility -> `aos-git-commit-dialog` wird sichtbar
- `aos-git-commit-dialog` dispatcht `git-commit` Event mit Dateien + Message -> `app.ts` ruft `gateway.sendGitCommit()` auf
- Nach erfolgreichem Commit: `app.ts` schliesst Dialog und ruft `gateway.requestGitStatus()` zum Status-Refresh auf

---

### Technical Details

- **WAS:**
  - Neue Lit Web Component `aos-git-commit-dialog` als Modal mit scrollbarer Dateiliste (Checkboxen + Status-Badges), Commit-Message-Textarea, Commit/Abbrechen Buttons
  - Erweiterung `app.ts` um Dialog-Visibility-State, Template-Integration, Event-Handler fuer Dialog-Oeffnung und Commit-Ausfuehrung
  - Erweiterung `gateway.ts` um `sendGitCommit(files, message)` Methode und Response-Handler

- **WIE:**
  - **Light DOM Pattern:** `aos-git-commit-dialog` nutzt `createRenderRoot() { return this; }` wie alle bestehenden Components
  - **Modal Pattern:** Dialog als overlay mit Backdrop; Visibility gesteuert ueber Property von `app.ts` (nicht intern im Dialog)
  - **Dateiliste:** Properties `files` (Array der geaenderten Dateien aus Git-Status) und `selectedFiles` (interner State). Jede Datei mit Checkbox und Status-Badge
  - **Status-Badges:** CSS-Klassen basierend auf Datei-Status: `modified`, `added`, `deleted`, `untracked` - Farben ueber CSS Custom Properties
  - **Button-Deaktivierung:** Commit-Button `disabled` wenn `selectedFiles.length === 0 || commitMessage.trim() === ''`
  - **Event Flow:** Commit-Button -> Custom Event `git-commit` mit `{ files: string[], message: string }` -> `app.ts` -> Gateway -> WebSocket
  - **Error Handling:** Commit-Fehler wird als Property an Dialog zurueckgegeben, Dialog bleibt offen, Fehlermeldung wird angezeigt

- **WO:**
  - `agent-os-ui/ui/src/components/git/aos-git-commit-dialog.ts` (NEU)
  - `agent-os-ui/ui/src/app.ts` (ERWEITERN)
  - `agent-os-ui/ui/src/gateway.ts` (ERWEITERN)

- **WER:** dev-team__frontend-developer

- **Abhaengigkeiten:** GIT-002 (Status-Leiste mit Commit-Button muss existieren; Dateiliste benoetigt Git-Status-Daten)

- **Geschaetzte Komplexitaet:** M

### Relevante Skills

| Skill | Pfad | Grund |
|-------|------|-------|
| Light DOM Lit Components | Referenz: alle `aos-*` Components in `ui/src/components/` | Pattern fuer neue Modal Component |
| Gateway Singleton Pattern | Referenz: `ui/src/gateway.ts` | Pattern fuer sendGitCommit Methode |
| Modal/Dialog Pattern | Referenz: `ui/src/components/git-strategy-dialog.ts` | Bestehendes Modal-Pattern als Vorlage |

---

### Creates Reusable Artifacts

**Ja**

| Artifact | Typ | Wiederverwendbar fuer |
|----------|-----|----------------------|
| `aos-git-commit-dialog` | UI Component | Zukuenftige Erweiterungen (z.B. Amend-Commit, Commit-Templates) |

---

### Completion Check

```bash
# Verify new component file exists
test -f agent-os-ui/ui/src/components/git/aos-git-commit-dialog.ts && echo "PASS: commit dialog component exists" || echo "FAIL"

# Verify Light DOM pattern
grep -q "createRenderRoot" agent-os-ui/ui/src/components/git/aos-git-commit-dialog.ts && echo "PASS: Light DOM pattern" || echo "FAIL"

# Verify file checkboxes
grep -q "checkbox\|checked" agent-os-ui/ui/src/components/git/aos-git-commit-dialog.ts && echo "PASS: file checkboxes" || echo "FAIL"

# Verify commit message field
grep -q "textarea\|commit-message" agent-os-ui/ui/src/components/git/aos-git-commit-dialog.ts && echo "PASS: commit message field" || echo "FAIL"

# Verify gateway commit method
grep -q "sendGitCommit" agent-os-ui/ui/src/gateway.ts && echo "PASS: gateway sendGitCommit" || echo "FAIL"

# Verify app.ts integration
grep -q "aos-git-commit-dialog" agent-os-ui/ui/src/app.ts && echo "PASS: app.ts commit dialog" || echo "FAIL"

# Build check
cd agent-os-ui && npm run build && echo "PASS: build successful" || echo "FAIL: build failed"
```
