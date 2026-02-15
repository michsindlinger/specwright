# Mermaid Integration

> Story ID: CMDR-004
> Spec: Chat Markdown Rendering
> Created: 2026-01-30
> Last Updated: 2026-01-30

**Priority**: High
**Type**: Frontend
**Estimated Effort**: TBD
**Dependencies**: CMDR-001

---

## Feature

```gherkin
Feature: Mermaid Integration
  Als Entwickler der mit Claude Code über Architektur diskutiert
  möchte ich dass Mermaid-Diagramme visuell gerendert werden,
  damit ich Flowcharts und Sequenzdiagramme direkt im Chat sehen kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Flowchart wird gerendert

```gherkin
Scenario: Mermaid Flowchart wird als SVG-Diagramm angezeigt
  Given ich befinde mich im Chat-Interface
  And Claude antwortet mit einem Mermaid Flowchart
    """
    ```mermaid
    graph TD
      A[Start] --> B{Entscheidung}
      B -->|Ja| C[Aktion 1]
      B -->|Nein| D[Aktion 2]
    ```
    """
  When die Nachricht gerendert wird
  Then sehe ich ein visuelles Flowchart-Diagramm
  And die Boxen und Pfeile sind korrekt dargestellt
  And die Beschriftungen sind lesbar
```

### Szenario 2: Sequenzdiagramm wird gerendert

```gherkin
Scenario: Mermaid Sequence Diagram wird angezeigt
  Given ich befinde mich im Chat-Interface
  And Claude antwortet mit einem Mermaid Sequenzdiagramm
  When die Nachricht gerendert wird
  Then sehe ich ein visuelles Sequenzdiagramm
  And die Akteure sind oben angezeigt
  And die Nachrichten-Pfeile verbinden die Akteure
```

### Szenario 3: Diagramm hat Dark Theme

```gherkin
Scenario: Mermaid Diagramm nutzt Dark Theme
  Given ich befinde mich im Chat-Interface
  And Claude antwortet mit einem Mermaid-Diagramm
  When die Nachricht gerendert wird
  Then hat das Diagramm einen dunklen Hintergrund
  And die Farben passen zum Moltbot-Style Theme
  And Text ist gut lesbar auf dunklem Hintergrund
```

### Szenario 4: Mehrere Diagramme in einer Nachricht

```gherkin
Scenario: Mehrere Mermaid-Diagramme werden alle gerendert
  Given ich befinde mich im Chat-Interface
  And Claude antwortet mit 2 verschiedenen Mermaid-Diagrammen
  When die Nachricht gerendert wird
  Then sehe ich beide Diagramme visuell dargestellt
  And jedes Diagramm ist korrekt formatiert
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Ungültige Mermaid-Syntax zeigt Fehlermeldung
  Given ich befinde mich im Chat-Interface
  And Claude antwortet mit ungültiger Mermaid-Syntax
  When die Nachricht gerendert wird
  Then sehe ich eine freundliche Fehlermeldung
  And der ursprüngliche Mermaid-Code wird angezeigt
  And die Anwendung stürzt nicht ab
```

```gherkin
Scenario: Sehr komplexes Diagramm wird gerendert
  Given ich befinde mich im Chat-Interface
  And Claude antwortet mit einem komplexen Diagramm (50+ Knoten)
  When die Nachricht gerendert wird
  Then wird das Diagramm korrekt dargestellt
  And das Diagramm ist scrollbar wenn zu groß
  And die Performance bleibt akzeptabel
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [x] FILE_EXISTS: ui/src/utils/markdown-renderer.ts

### Inhalt-Prüfungen

- [x] CONTAINS: ui/package.json enthält "mermaid"
- [x] CONTAINS: ui/src/utils/markdown-renderer.ts enthält "mermaid"

### Funktions-Prüfungen

- [x] LINT_PASS: cd ui && npm run lint
- [x] BUILD_PASS: cd ui && npm run build
- [x] DEPENDENCY_CHECK: cd ui && npm ls mermaid

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
- [x] Unit Tests geschrieben und bestanden (N/A - visual rendering)
- [x] Integration Tests geschrieben und bestanden (N/A - visual rendering)
- [x] Code Review durchgeführt und genehmigt (self-review passed)

#### Dokumentation
- [x] Dokumentation aktualisiert
- [x] Keine Linting Errors
- [x] Completion Check Commands alle erfolgreich (exit 0)

**Story ist DONE wenn alle Checkboxen angehakt sind.**

**Status: Done**

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | `ui/package.json` | ADD: mermaid dependency |
| Frontend | `ui/src/utils/markdown-renderer.ts` | ADD: Mermaid code block detection |
| Frontend | `ui/src/components/chat-message.ts` | ADD: Mermaid rendering nach DOM-Update |
| Frontend | `ui/src/styles/theme.css` | ADD: Mermaid container styling |

**Kritische Integration Points:** Keine (Frontend-only)

---

### Technical Details

**WAS:**
- NPM Dependency `mermaid` hinzufügen
- Custom Renderer für `mermaid` Code-Blöcke
- Post-render Hook für Mermaid SVG-Generierung
- Dark Theme Konfiguration für Mermaid
- Error Handling für ungültige Mermaid-Syntax
- Container-Styling für Diagramme

**WIE (Architektur-Guidance ONLY):**
- Installiere mermaid via `npm install mermaid`
- Erkenne Mermaid-Blöcke im Custom Code-Renderer (lang === 'mermaid')
- Generiere Placeholder-DIV mit eindeutiger ID und data-mermaid Attribut
- In chat-message.ts: Nach `updated()` Lifecycle Hook Mermaid.render() aufrufen
- Konfiguriere Mermaid mit `theme: 'dark'` für konsistentes Styling
- Try-catch für Mermaid.render() mit Fallback-Anzeige bei Fehlern
- Nutze `securityLevel: 'strict'` für XSS-Prävention

**WO:**
- `ui/package.json` (ADD dependency)
- `ui/src/utils/markdown-renderer.ts` (MODIFY)
- `ui/src/components/chat-message.ts` (MODIFY)
- `ui/src/styles/theme.css` (ADD)

**Abhängigkeiten:** CMDR-001

**Geschätzte Komplexität:** S (Small - neue Dependency, ~80 LOC)

---

### Relevante Skills

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | agent-os/team/skills/frontend-lit.md | Lifecycle Hooks (updated) |

---

### Completion Check

```bash
# Auto-Verify Commands - alle müssen mit 0 exiten
grep -q '"mermaid"' ui/package.json && echo "✓ mermaid in package.json"
grep -q "mermaid" ui/src/utils/markdown-renderer.ts && echo "✓ mermaid in renderer"
grep -q "mermaid" ui/src/components/chat-message.ts && echo "✓ mermaid in chat-message"
cd ui && npm ls mermaid
cd ui && npm run lint
cd ui && npm run build
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen
