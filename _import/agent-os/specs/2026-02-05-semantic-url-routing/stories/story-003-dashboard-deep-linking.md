# SUR-003: Dashboard Deep-Linking (Specs, Kanban, Story)

## User Story
**Als** User
**möchte ich** direkt auf ein Kanban-Board oder eine Story-Detail-Ansicht per URL zugreifen können,
**damit** ich bei einem Page-Reload nicht den Kontext verliere und Kanban-Links bookmarken kann.

## Akzeptanzkriterien (Gherkin)

```gherkin
Feature: Dashboard Deep-Linking

  Scenario: Deep-Link zu Kanban-Board
    Given der User gibt "/specs/2026-01-30-feature/kanban" in die Adressleiste ein
    When die Seite lädt
    Then wird das Kanban-Board für den Spec "2026-01-30-feature" angezeigt
    And der Spec wird aus der Spec-Liste aufgelöst
    And die Kanban-Daten werden via WebSocket geladen

  Scenario: Deep-Link zu Story-Detail
    Given der User gibt "/specs/2026-01-30-feature/stories/US-001" in die Adressleiste ein
    When die Seite lädt
    Then wird die Story-Detail-Ansicht für "US-001" angezeigt
    And der zugehörige Spec wird aufgelöst

  Scenario: Navigation Spec → Kanban
    Given der User ist auf "/specs"
    When der User auf einen Spec klickt
    Then ändert sich die URL zu "/specs/{spec-id}/kanban"
    And das Kanban-Board wird angezeigt

  Scenario: Navigation Kanban → Story
    Given der User ist auf "/specs/abc/kanban"
    When der User auf eine Story-Karte klickt
    Then ändert sich die URL zu "/specs/abc/stories/{story-id}"

  Scenario: Navigation Story → Kanban (Back)
    Given der User ist auf "/specs/abc/stories/US-001"
    When der User auf "Zurück" klickt
    Then ändert sich die URL zu "/specs/abc/kanban"

  Scenario: Navigation Kanban → Specs (Back)
    Given der User ist auf "/specs/abc/kanban"
    When der User auf "Zurück" klickt
    Then ändert sich die URL zu "/specs"
    And die Spec-Liste wird angezeigt

  Scenario: Page Reload im Kanban
    Given der User ist auf "/specs/abc/kanban"
    When die Seite neu geladen wird
    Then wird das Kanban-Board für "abc" wieder angezeigt
    And der State ist vollständig wiederhergestellt

  Scenario: Browser Back nach Kanban-Navigation
    Given der User hat von /specs nach /specs/abc/kanban navigiert
    When der User den Browser-Back-Button klickt
    Then ändert sich die URL zu "/specs"
    And die Spec-Liste wird angezeigt
```

## Technische Details

### WAS (Scope)
- Dashboard-View akzeptiert `route` Property statt internes viewMode-Management
- Route-to-ViewMode Mapping in `updated()` Lifecycle
- State Restoration: specId/storyId aus URL → WebSocket-Request
- Alle internen Navigations-Calls durch `router.navigate()` ersetzen

### WIE (Implementierung)
- `@property() route: RouteMatch` hinzufügen
- `handleRouteChange()` in `updated()`: Map route.name → viewMode
  - `spec-kanban` → load kanban via gateway.send({ type: 'specs.kanban', specId })
  - `spec-story` → load story via gateway.send({ type: 'specs.story', specId, storyId })
  - `specs` → reset state (selectedSpec = null, kanban = null)
- In `onSpecsList()`: Resolve pending specId from URL when specs loaded
- Guard: In data handlers, check route.params match before applying data
- Guard: WebSocket connection + project context check before sending

### WO (Dateien)
| Datei | Aktion | Beschreibung |
|-------|--------|-------------|
| `ui/src/views/dashboard-view.ts` | MODIFY | Route-basiertes viewMode, Deep-Link State Restoration |

### WER (Layer)
- **Layer**: Presentation
- **Skill**: frontend-lit

## Dependencies
- SUR-001 (Router Module)
- SUR-002 (App Shell Migration)

## Definition of Ready
- [x] User Story klar formuliert
- [x] Akzeptanzkriterien definiert (8 Szenarien)
- [x] Technische Details vollständig
- [x] Abhängigkeiten definiert
- [x] Aufwand geschätzt: L

## Definition of Done
- [ ] Dashboard-View empfängt und reagiert auf route Property
- [ ] Deep-Link /specs/{id}/kanban lädt Kanban nach Reload
- [ ] Deep-Link /specs/{id}/stories/{storyId} lädt Story nach Reload
- [ ] Alle internen navigateTo-Calls durch router.navigate() ersetzt
- [ ] Browser Back/Forward funktioniert zwischen Specs ↔ Kanban ↔ Story
- [ ] Race Conditions abgesichert (Route vs WebSocket, Route vs Spec-Liste)
- [ ] Keine TypeScript Errors
