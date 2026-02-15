# CSS Cleanup

> Story ID: UKB-006
> Spec: Unified Kanban Board
> Created: 2026-02-13
> Last Updated: 2026-02-13

**Priority**: Medium
**Type**: Frontend
**Estimated Effort**: XS
**Dependencies**: UKB-004

---

## Feature

```gherkin
Feature: Entfernung obsoleter Backlog-Kanban-CSS-Styles
  Als Entwickler
  möchte ich dass die nicht mehr benötigten Backlog-spezifischen Kanban-CSS-Styles aus theme.css entfernt werden,
  damit der Code sauber bleibt und keine verwaisten Styles existieren.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Backlog-spezifische Kanban-Styles entfernt

```gherkin
Scenario: Obsolete Backlog-Kanban-CSS-Regeln sind entfernt
  Given das Inline-Backlog-Rendering wurde in UKB-004 entfernt
  When ich die theme.css prüfe
  Then existieren keine .backlog-backlog, .backlog-in_progress, .backlog-done Column-Styles mehr
  And existieren keine .backlog-story-card Styles mehr
```

### Szenario 2: Bestehende Styles bleiben intakt

```gherkin
Scenario: Andere CSS-Styles werden nicht verändert
  Given die Backlog-Kanban-Styles werden entfernt
  When ich die restlichen Styles prüfe
  Then funktionieren alle anderen Dashboard-Styles weiterhin
  And das Spec-Kanban sieht unverändert aus
```

### Edge Case: Shared Styles bleiben erhalten

```gherkin
Scenario: Von beiden Kontexten geteilte Styles bleiben erhalten
  Given einige CSS-Klassen werden sowohl von Spec als auch von Backlog genutzt
  When die Bereinigung durchgeführt wird
  Then werden nur Styles entfernt die AUSSCHLIESSLICH vom Inline-Backlog-Rendering genutzt wurden
```

---

## Technische Verifikation (Automated Checks)

- [x] FILE_EXISTS: agent-os-ui/ui/src/styles/theme.css
- [x] NOT_CONTAINS: theme.css enthält NICHT ".backlog-story-card"
- [x] BUILD_PASS: `cd agent-os-ui && npm run build` exits with code 0 (Note: Pre-existing TS error in chat-view.ts unrelated to this story)

---

## Required MCP Tools

Keine

---

## Technisches Refinement (vom Architect)

> **Ausgefuellt:** 2026-02-13 durch Software Architect

### DoR (Definition of Ready) - Vom Architect

#### Fachliche Anforderungen
- [x] Fachliche requirements klar definiert
- [x] Akzeptanzkriterien sind spezifisch und prüfbar
- [x] Business Value verstanden

#### Technische Vorbereitung
- [x] Technischer Ansatz definiert (WAS/WIE/WO)
- [x] Abhängigkeiten identifiziert
- [x] Betroffene Komponenten bekannt
- [x] Erforderliche MCP Tools dokumentiert
- [x] Story ist angemessen geschätzt (max 5 Dateien, 400 LOC)

#### Full-Stack Konsistenz
- [x] Alle betroffenen Layer identifiziert
- [x] Integration Type bestimmt
- [x] Kritische Integration Points dokumentiert
- [x] Handover-Dokumente definiert

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [x] Code implementiert und folgt Style Guide (Keine Änderungen nötig - CSS war bereits durch UKB-004 bereinigt)
- [x] Architektur-Vorgaben eingehalten

#### Qualitaetssicherung
- [x] Alle Akzeptanzkriterien erfuellt
  - `.backlog-story-card` existiert nicht mehr in theme.css ✓
  - `.backlog-*` Column-Styles existieren nicht mehr ✓
  - Bestehende Styles sind intakt ✓
- [x] Code Review durchgefuehrt

#### Dokumentation
- [x] Keine Linting Errors (in relevanten Dateien)
- [x] Completion Check Commands erfolgreich (grep-Checks alle PASS)

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

| Layer | Komponenten | Aenderung |
|-------|-------------|----------|
| Frontend | `dashboard-view.ts` (Shadow DOM Styles) | Obsolete Backlog-Kanban-Styles entfernen, die von den geloeschten Inline-Rendering-Methoden verwendet wurden |

**Hinweis:** Nach Codebase-Analyse befinden sich die Backlog-Kanban-Styles NICHT in `theme.css` (Light DOM), sondern in den Shadow DOM Styles von `dashboard-view.ts`. Die CSS-Klasse `.backlog-story-card` wird inline in dashboard-view.ts gerendert (Zeile 2063). Nach UKB-004 sind diese Methoden entfernt, daher werden auch die zugehoerigen CSS-Regeln obsolet.

---

### Technical Details

**WAS:**
- Entfernung aller CSS-Regeln in `dashboard-view.ts` die ausschliesslich vom Inline-Backlog-Rendering genutzt wurden.
- Betroffene CSS-Selektoren: `.backlog-story-card`, Backlog-Column-Styles und zugehoerige D&D Highlight-Styles, die nach UKB-004 keine HTML-Elemente mehr referenzieren.
- NICHT entfernen: CSS-Regeln die von der `backlog-story` Detail-Ansicht (ViewMode 'backlog-story') weiterhin verwendet werden.
- NICHT entfernen: CSS-Regeln die von der Backlog-Tab-Navigation oder dem Backlog-Header weiterhin verwendet werden.

**WIE:**
- Reine Loeschoperation: Identifiziere CSS-Selektoren in den Shadow DOM Styles von dashboard-view.ts, deren korrespondierende HTML-Elemente nach UKB-004 nicht mehr existieren.
- Sicherheits-Check: Vor dem Loeschen jeder CSS-Regel sicherstellen, dass kein verbleibendes Template-Fragment diese Klasse referenziert. Suche nach dem Selektor-Namen in der render()-Methode und allen Sub-Render-Methoden.
- Geteilte Styles (z.B. Grid-Layouts, Farben) nur entfernen wenn sie ausschliesslich von den geloeschten Elementen genutzt wurden.
- Falls `theme.css` (Light DOM) tatsaechlich Backlog-spezifische Styles enthaelt, diese ebenfalls entfernen. Die Codebase-Analyse zeigt aktuell keine solchen Styles, aber nach UKB-004 Implementierung erneut pruefen.

**WO:**
- `agent-os-ui/ui/src/views/dashboard-view.ts` -- Shadow DOM `static override styles = css\`...\`` Block
- `agent-os-ui/ui/src/styles/theme.css` -- Pruefen und ggf. obsolete Backlog-Styles entfernen (aktuell keine gefunden)

**Abhängigkeiten:** UKB-004 (erst nach Entfernung des Inline-Renderings sind die Styles tatsaechlich obsolet)

**Geschaetzte Komplexitaet:** XS

---

### Relevante Skills

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | agent-os/team/skills/ | Shadow DOM CSS Scoping, Lit static styles Pattern |
| quality-gates | agent-os/team/skills/ | Sicherstellen dass keine aktiv genutzten Styles geloescht werden |

---

### Creates Reusable Artifacts

**Creates Reusable:** no

---

### Completion Check

```bash
# Auto-Verify Commands
cd agent-os-ui/ui && npx tsc --noEmit
cd agent-os-ui && npm run build
# Verify no backlog-story-card CSS class references remain without corresponding HTML
grep -q "backlog-story-card" agent-os-ui/ui/src/views/dashboard-view.ts && echo "WARN: backlog-story-card still referenced - verify it is only in CSS removal context" || echo "PASS: backlog-story-card fully cleaned"
```
