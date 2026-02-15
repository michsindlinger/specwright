# Implementation Plan - Context Menu Feature

**Status:** PENDING_USER_REVIEW
**Created:** 2026-02-03

---

## Executive Summary

Ein globales Context Menu (Rechtsklick-Menü) für die Agent OS Web UI, das Schnellzugriff auf häufig genutzte Workflows bietet: Neue Spec, Bug, TODO und Story zu Spec hinzufügen. Das Feature nutzt bestehende workflow-card und modal Patterns, um Code-Änderungen zu minimieren und eine konsistente UX zu gewährleisten.

---

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| **Reuse `aos-workflow-card` in modals** | Die bestehende workflow-card Komponente behandelt bereits Argument-Input, Start-Events und Workflow-Trigger. Einbettung im Modal reduziert Code-Duplikation. |
| **Single Context Menu Component** | Eine `aos-context-menu` Komponente für alle vier Menüpunkte, dispatcht Custom Events für das entsprechende Modal. |
| **Generalized Workflow Modal** | Ein generisches `aos-workflow-modal` das jede workflow-card anzeigen kann. Kann später `aos-create-spec-modal` ersetzen. |
| **Spec Selector as Separate Component** | Die Spec-Auswahl für "Story zu Spec hinzufügen" benötigt eigene Komponente (`aos-spec-selector`) mit Suchfunktion, wiederverwendbar. |
| **Light DOM (createRenderRoot = this)** | Folgt bestehenden Patterns, alle Komponenten nutzen Light DOM für konsistentes Styling via theme.css. |
| **Event-Driven Architecture** | Context Menu triggert Custom Events die zu `app.ts` bubblen, welches Modal-Opening orchestriert - entspricht bestehenden Patterns. |

---

## Component Overview

| Name | Type | Description |
|------|------|-------------|
| `aos-context-menu` | New Component | Rendert das Rechtsklick-Menü mit 4 Items, positioniert bei Mauskoordinaten, behandelt Outside-Click/ESC zum Schließen |
| `aos-workflow-modal` | New Component | Generischer Modal-Wrapper der eine workflow-card für jeden Workflow anzeigt. Trackt Dirty-State für Bestätigungsdialoge |
| `aos-spec-selector` | New Component | Dropdown/Liste mit Such-Input zur Spec-Auswahl. Lädt Specs-Liste vom Backend, cached Ergebnisse |
| `aos-confirm-dialog` | New Component | Leichtgewichtiger Bestätigungsdialog für "Änderungen verwerfen?" Prompts. Wiederverwendbar in der Anwendung |
| `app.ts` | Modified | Globaler contextmenu Event-Listener, State für Context Menu Visibility/Position, Modal State Management |
| `gateway.ts` | No changes | `specs.list` Message-Type existiert bereits |
| `theme.css` | Modified | Styles für context-menu, workflow-modal, spec-selector, confirm-dialog |

---

## Component Connections

| Source | Target | Integration Method | Responsible Story |
|--------|--------|-------------------|-------------------|
| `app.ts` | `aos-context-menu` | Rendert Komponente, übergibt Position-Props, lauscht auf `menu-item-select` Event | Story 2 |
| `aos-context-menu` | `app.ts` | Feuert `menu-item-select` Custom Event mit Action-Type | Story 1 |
| `app.ts` | `aos-workflow-modal` | Rendert Komponente, übergibt Workflow-Command, lauscht auf `workflow-start-interactive` und `modal-close` Events | Story 3 |
| `aos-workflow-modal` | `aos-workflow-card` | Rendert workflow-card als Child, übergibt Command-Object | Story 3 |
| `aos-workflow-modal` | `aos-confirm-dialog` | Rendert Confirm-Dialog bedingt beim Schließen mit ungespeicherten Änderungen | Story 3 |
| `aos-workflow-modal` | `aos-spec-selector` | Rendert spec-selector als ersten Schritt für "add-story" Workflow | Story 4 |
| `aos-spec-selector` | `gateway` | Sendet `specs.list` Message, empfängt Spec-Liste | Story 4 |
| `aos-spec-selector` | `aos-workflow-modal` | Feuert `spec-selected` Event mit ausgewählter Spec | Story 4 |

---

## Implementation Phases

### Phase 1: Foundation (Stories 1-2)
1. **Story 1: Context Menu Component** - Erstelle `aos-context-menu` mit vier Menüpunkten, Positionierungs-Logik, Keyboard-Support (ESC), Outside-Click Handling
2. **Story 2: Global Event Handler** - Füge contextmenu Event-Listener in `app.ts` hinzu, manage Context Menu State, verhindere Default Browser Context Menu

### Phase 2: Modal Infrastructure (Story 3)
3. **Story 3: Generic Workflow Modal** - Erstelle `aos-workflow-modal` mit eingebetteter workflow-card, Dirty-State Tracking, Bestätigungsdialog für ungespeicherte Änderungen

### Phase 3: Spec Selection (Stories 4-5)
4. **Story 4: Spec Selector Component** - Erstelle `aos-spec-selector` mit Suche, Loading-States, Empty-States, Spec-Liste Caching
5. **Story 5: Add Story Flow Integration** - Verbinde den Zwei-Schritt-Flow: Spec-Auswahl -> add-story Workflow Modal

### Phase 4: Integration & Polish (Story 6)
6. **Story 6: Integration & Styling** - Füge alle CSS-Styles in theme.css hinzu, End-to-End Testing, Edge-Case Handling

---

## Dependencies

```
Story 2 depends on Story 1 (Context Menu muss existieren bevor Global Handler)
Story 3 has no dependencies (kann parallel zu Phase 1 entwickelt werden)
Story 4 has no dependencies (kann parallel zu Phase 1 entwickelt werden)
Story 5 depends on Stories 3 and 4 (benötigt Modal und Selector)
Story 6 depends on all previous stories
```

**Parallel Development Opportunities:**
- Stories 1 & 3 können gleichzeitig entwickelt werden
- Stories 1 & 4 können gleichzeitig entwickelt werden
- Story 2 sollte nach Story 1 folgen

---

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Context Menu konfligiert mit Browser Context Menu | Medium | Low | `e.preventDefault()` auf contextmenu Event; Fallback für Accessibility |
| Modal z-index Stacking Issues | Low | Medium | Konsistente z-index Werte (context-menu: 1000, modal: 1001, confirm: 1002) |
| Workflow Command IDs matchen nicht | High | Low | Verifiziere Command IDs (`agent-os:add-bug`, `agent-os:add-todo`, `agent-os:add-story`) existieren |
| Race Condition: Spec-Liste nicht geladen | Medium | Medium | Loading-Spinner in spec-selector; Cache Specs nach erstem Load |
| Context Menu erscheint an unerwarteter Position | Low | Medium | `getBoundingClientRect` und Viewport-Checks für Menu innerhalb Viewport |

---

## Self-Review Results

### Strengths
- Nutzt bestehende Patterns (workflow-card, Modal-Struktur, Light DOM)
- Minimale Änderungen an bestehendem Code (nur app.ts Modifikationen)
- Generisches Workflow Modal kann aos-create-spec-modal in Zukunft ersetzen
- Event-driven Architecture entspricht bestehenden Codebase-Konventionen

### Potential Issues
- aos-confirm-dialog könnte später aus workflow-modal extrahiert werden falls anderswo benötigt
- Spec-Caching Strategie sollte Cache-Invalidierung bei Spec-Erstellung/Löschung berücksichtigen

### Questions Resolved
1. Confirm Dialog wird als separate Komponente implementiert (wiederverwendbar)
2. Context Menu nutzt fade-in Animation (konsistent mit anderen Overlays)
3. Specs werden lazy-loaded beim ersten "Story zu Spec hinzufügen" Click

---

## Minimal-Invasive Optimizations

| Optimization | Impact |
|--------------|--------|
| Reuse existing `specs.list` WebSocket Message | Keine Backend-Änderungen nötig |
| Embed workflow-card statt Logik zu duplizieren | Reduziert Code um ~50 Zeilen pro Workflow-Action |
| Use CSS Custom Properties from theme.css | Konsistentes Styling ohne neue Variablen |
| Use existing Event Patterns (`workflow-start-interactive`) | Keine Änderungen an workflow-view oder Backend Handlers |
| Light DOM Approach | Alle Styles in einer theme.css Datei |

---

## Feature-Preservation Checklist

- [x] Alle Requirements aus Clarification sind abgedeckt
- [x] Kein Feature wurde geopfert
- [x] Alle Akzeptanzkriterien bleiben erreichbar
- [x] Bestätigungsdialog nur bei Eingaben
- [x] Spec-Auswahl mit Suche
- [x] Alle 4 Menüpunkte implementiert

---

*Status: PENDING_USER_REVIEW*
