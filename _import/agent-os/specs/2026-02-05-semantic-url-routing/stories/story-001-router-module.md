# SUR-001: Router Module erstellen

## User Story
**Als** Entwickler
**möchte ich** einen leichtgewichtigen Custom Router mit History API und Pattern Matching,
**damit** die Anwendung sprechende URLs unterstützen kann.

## Akzeptanzkriterien (Gherkin)

```gherkin
Feature: Custom Router Module

  Scenario: Route Pattern Matching
    Given eine Route "/specs/:specId/kanban" ist registriert
    When die URL "/specs/2026-01-30-feature/kanban" aufgerufen wird
    Then wird die Route "spec-kanban" gematcht
    And der Parameter specId ist "2026-01-30-feature"

  Scenario: Navigation mit History API
    Given der Router ist initialisiert
    When router.navigate("/specs/abc/kanban") aufgerufen wird
    Then ändert sich window.location.pathname auf "/specs/abc/kanban"
    And history.pushState wird aufgerufen
    And alle Route-Change Listener werden benachrichtigt

  Scenario: Browser Back/Forward
    Given der User hat von /specs nach /specs/abc/kanban navigiert
    When der User den Browser-Back-Button klickt
    Then wird das popstate Event gefangen
    And die Route ändert sich zu "specs"

  Scenario: URL Generation
    Given eine Route "spec-kanban" mit Pattern "/specs/:specId/kanban"
    When router.buildPath("spec-kanban", { specId: "abc" }) aufgerufen wird
    Then wird "/specs/abc/kanban" zurückgegeben

  Scenario: Legacy Hash Redirect
    Given die aktuelle URL ist "http://localhost:5173/#/dashboard"
    When router.start() aufgerufen wird
    Then wird die URL zu "/specs" umgeleitet via replaceState
```

## Technische Details

### WAS (Scope)
- Neues File `ui/src/router.ts` mit Router-Klasse
- 14 Route-Definitionen mit Pattern Matching
- History API Integration (pushState, replaceState, popstate)
- Event-System für Route-Change Subscriptions
- Singleton-Export

### WIE (Implementierung)
- Route-Patterns werden bei Registrierung zu RegExp compiliert
- `:paramName` Segments → `(?<paramName>[^/]+)` Named Capture Groups
- `navigate()` → `history.pushState()` + Listener-Benachrichtigung
- `popstate` Event Listener für Back/Forward
- Legacy Hash-Redirect in `start()`

### WO (Dateien)
| Datei | Aktion | Beschreibung |
|-------|--------|-------------|
| `ui/src/router.ts` | CREATE | Router-Modul (~150-200 LOC) |

### WER (Layer)
- **Layer**: Shared/Infrastructure
- **Skill**: frontend-lit

## Definition of Ready
- [x] User Story klar formuliert
- [x] Akzeptanzkriterien definiert
- [x] Technische Details (WAS/WIE/WO/WER) vollständig
- [x] Keine offenen Abhängigkeiten
- [x] Aufwand geschätzt: S

## Definition of Done
- [ ] Router-Modul implementiert mit allen 14 Routes
- [ ] Pattern Matching funktioniert mit Named Parameters
- [ ] History API Navigation (pushState/replaceState)
- [ ] popstate Handler für Back/Forward
- [ ] Legacy Hash Redirect implementiert
- [ ] Query Parameter Support (URLSearchParams)
- [ ] TypeScript Types exportiert (RouteMatch, RouteDefinition)
- [ ] Keine TypeScript Errors
