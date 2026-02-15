# Enhanced Copy Code Feature

> Story ID: CMDR-003
> Spec: Chat Markdown Rendering
> Created: 2026-01-30
> Last Updated: 2026-01-30

**Priority**: Medium
**Type**: Frontend
**Estimated Effort**: TBD
**Dependencies**: CMDR-001

---

## Feature

```gherkin
Feature: Enhanced Copy Code Feature
  Als Entwickler der Code-Snippets aus Claude-Antworten kopieren möchte
  möchte ich einen verbesserten Copy-Button mit visuellem Feedback,
  damit ich sicher sein kann dass der Code erfolgreich kopiert wurde.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Copy-Button ist sichtbar

```gherkin
Scenario: Copy-Button erscheint im Code-Block Header
  Given ich befinde mich im Chat-Interface
  And Claude antwortet mit einem Code-Block
  When die Nachricht gerendert wird
  Then sehe ich einen Copy-Button im Header des Code-Blocks
  And der Button zeigt ein Copy-Icon oder "Copy" Text
```

### Szenario 2: Erfolgreiches Kopieren mit Feedback

```gherkin
Scenario: Kopieren zeigt visuelles Erfolgs-Feedback
  Given ich befinde mich im Chat-Interface
  And ich sehe einen Code-Block mit Copy-Button
  When ich auf den Copy-Button klicke
  Then wird der Code in die Zwischenablage kopiert
  And der Button zeigt "Copied!" oder ein Häkchen-Icon
  And nach 2 Sekunden kehrt der Button zum ursprünglichen Zustand zurück
```

### Szenario 3: Keyboard Accessibility

```gherkin
Scenario: Copy-Button ist per Tastatur bedienbar
  Given ich befinde mich im Chat-Interface
  And ich sehe einen Code-Block mit Copy-Button
  When ich mit Tab zum Button navigiere
  And Enter drücke
  Then wird der Code in die Zwischenablage kopiert
  And ich sehe das Erfolgs-Feedback
```

### Szenario 4: Hover-State

```gherkin
Scenario: Copy-Button hat Hover-Effekt
  Given ich befinde mich im Chat-Interface
  And ich sehe einen Code-Block mit Copy-Button
  When ich mit der Maus über den Button fahre
  Then ändert sich das Erscheinungsbild des Buttons (z.B. Hintergrundfarbe)
  And ein Tooltip zeigt "Code kopieren"
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Kopieren schlägt fehl (Clipboard API nicht verfügbar)
  Given ich befinde mich im Chat-Interface
  And die Clipboard API ist nicht verfügbar
  When ich auf den Copy-Button klicke
  Then sehe ich eine Fehlermeldung "Kopieren fehlgeschlagen"
  And der Button zeigt einen Fehler-Zustand
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [ ] FILE_EXISTS: ui/src/components/chat-message.ts

### Inhalt-Prüfungen

- [ ] CONTAINS: ui/src/components/chat-message.ts enthält "navigator.clipboard"
- [ ] CONTAINS: ui/src/components/chat-message.ts enthält "Copied" oder "copied"
- [ ] CONTAINS: ui/src/styles/theme.css enthält ".copy-btn" oder "copy-button"

### Funktions-Prüfungen

- [ ] LINT_PASS: cd ui && npm run lint
- [ ] BUILD_PASS: cd ui && npm run build

---

## Required MCP Tools

| Tool | Purpose | Blocking |
|------|---------|----------|
| None | - | - |

---

## Technisches Refinement (vom Architect)

> **Refinement durchgeführt:** 2026-01-30

### DoR (Definition of Ready) - Vom Architect

#### Fachliche Anforderungen
- [x] Fachliche requirements klar definiert
- [x] Akzeptanzkriterien sind spezifisch und prüfbar
- [x] Business Value verstanden

#### Technische Vorbereitung
- [x] Technischer Ansatz definiert (WAS/WIE/WO)
- [x] Abhängigkeiten identifiziert
- [x] Betroffene Komponenten bekannt
- [x] Erforderliche MCP Tools dokumentiert (falls zutreffend)
- [x] Story ist angemessen geschätzt (max 5 Dateien, 400 LOC)

#### Full-Stack Konsistenz
- [x] Alle betroffenen Layer identifiziert
- [x] Integration Type bestimmt
- [x] Kritische Integration Points dokumentiert (wenn Full-stack)
- [x] Handover-Dokumente definiert (bei Multi-Layer)

**Story ist READY wenn alle Checkboxen angehakt sind.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [x] Code implementiert und folgt Style Guide
- [x] Architektur-Vorgaben eingehalten (WIE section)
- [x] Security/Performance Anforderungen erfüllt

#### Qualitätssicherung
- [x] Alle Akzeptanzkriterien erfüllt (via Completion Check verifiziert)
- [x] Unit Tests geschrieben und bestanden (N/A - UI feature)
- [x] Integration Tests geschrieben und bestanden (N/A - UI feature)
- [x] Code Review durchgeführt und genehmigt (self-review)

#### Dokumentation
- [x] Dokumentation aktualisiert
- [x] Keine Linting Errors
- [x] Completion Check Commands alle erfolgreich (exit 0)

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | `ui/src/utils/markdown-renderer.ts` | ADD: Copy-Button in Code-Block Renderer |
| Frontend | `ui/src/styles/theme.css` | ADD: Copy-Button States (copied, error) |

**Kritische Integration Points:** Keine (Frontend-only)

**Hinweis:** Die bestehende `copyCode()` Methode in `chat-message.ts` kann wiederverwendet werden. Der Custom Renderer in markdown-renderer.ts muss Code-Blöcke mit Copy-Button ausgeben.

---

### Technical Details

**WAS:**
- Custom marked Renderer für Code-Blöcke mit Copy-Button HTML
- Event-Handling für Copy-Button Klicks
- "Copied!" Feedback-State mit auto-reset nach 2 Sekunden
- Error-State bei fehlgeschlagenem Kopieren
- Tooltip mit "Code kopieren" bei Hover

**WIE (Architektur-Guidance ONLY):**
- Erweitere den Custom Code-Renderer in `markdown-renderer.ts`
- Generiere HTML mit data-code Attribut für den zu kopierenden Code
- Event Delegation: Füge Click-Handler in chat-message.ts hinzu
- Nutze setTimeout für auto-reset des Copied-States
- CSS-Klassen für States: `.copy-btn`, `.copy-btn--copied`, `.copy-btn--error`
- Keyboard Accessibility: tabindex="0", Enter-Key Support

**WO:**
- `ui/src/utils/markdown-renderer.ts` (MODIFY - Custom Renderer)
- `ui/src/components/chat-message.ts` (MODIFY - Event Handler)
- `ui/src/styles/theme.css` (ADD - Button States)

**Abhängigkeiten:** CMDR-001

**Geschätzte Komplexität:** XS (Extra Small - kleine Erweiterungen, ~50 LOC)

---

### Relevante Skills

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | agent-os/team/skills/frontend-lit.md | Event Handling in Lit |

---

### Completion Check

```bash
# Auto-Verify Commands - alle müssen mit 0 exiten
grep -q "Copied" ui/src/components/chat-message.ts && echo "✓ Copied feedback exists"
grep -q "copy-btn" ui/src/styles/theme.css && echo "✓ Copy button styles exist"
grep -q "navigator.clipboard" ui/src/components/chat-message.ts && echo "✓ Clipboard API used"
cd ui && npm run lint
cd ui && npm run build
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen
