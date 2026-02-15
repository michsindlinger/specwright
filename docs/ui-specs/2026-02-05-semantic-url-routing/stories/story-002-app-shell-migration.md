# SUR-002: App Shell auf Router migrieren

## User Story
**Als** User
**möchte ich** über sprechende URLs zwischen den Hauptansichten (Specs, Chat, Workflows, Settings) navigieren,
**damit** ich die Anwendung über Bookmarks und Direktlinks erreichen kann.

## Akzeptanzkriterien (Gherkin)

```gherkin
Feature: App Shell Router Integration

  Scenario: Top-Level Navigation
    Given die Anwendung ist geladen
    When der User auf "Specs" in der Sidebar klickt
    Then ändert sich die URL zu "/specs"
    And die Specs-Übersicht wird angezeigt

  Scenario: Sidebar Active State
    Given die URL ist "/specs/abc/kanban"
    Then ist der "Dashboard" Nav-Link in der Sidebar als aktiv markiert

  Scenario: Page Title Update
    Given die URL ändert sich zu "/chat"
    Then enthält der Seitentitel "Chat"

  Scenario: Direct URL Access
    Given der User gibt "/settings" direkt in die Browser-Adressleiste ein
    When die Seite lädt
    Then wird die Settings-View angezeigt

  Scenario: Unknown URL
    Given der User gibt "/nonexistent" in die Browser-Adressleiste ein
    When die Seite lädt
    Then wird die Not-Found-View angezeigt

  Scenario: Root Redirect
    Given der User gibt "/" in die Browser-Adressleiste ein
    When die Seite lädt
    Then wird die URL zu "/specs" umgeleitet
```

## Technische Details

### WAS (Scope)
- Hash-basiertes Routing aus `app.ts` entfernen
- Router-Singleton importieren und integrieren
- `renderView()` auf Route-basiertes Switching umstellen
- Sidebar-Navigation mit Path-basierter Active-Detection
- `RouteMatch` als Property an View-Komponenten weiterreichen
- Delegated Link Click Handler für `<a>`-Tags

### WIE (Implementierung)
- `handleHashChange()` und `navigateTo()` entfernen
- Router-Subscription in `connectedCallback()`: `router.onRouteChange()`
- `renderView()` switched auf `route.name` statt `currentRoute` String
- Views erhalten `.route=${route}` Property
- Nav-Items: `matchPaths` Array für Active-Detection (z.B. `/specs`, `/backlog`, `/docs` alle unter "Dashboard")
- Link Interception: `addEventListener('click', ...)` auf App-Ebene fängt lokale `<a href>`-Klicks ab

### WO (Dateien)
| Datei | Aktion | Beschreibung |
|-------|--------|-------------|
| `ui/src/app.ts` | MODIFY | Routing-Logik ersetzen, Router integrieren |
| `ui/src/views/not-found-view.ts` | MODIFY | `href="#/dashboard"` → `href="/specs"` |

### WER (Layer)
- **Layer**: Presentation
- **Skill**: frontend-lit

## Dependencies
- SUR-001 (Router Module)

## Definition of Ready
- [x] User Story klar formuliert
- [x] Akzeptanzkriterien definiert
- [x] Technische Details vollständig
- [x] Abhängigkeit auf SUR-001 definiert
- [x] Aufwand geschätzt: M

## Definition of Done
- [ ] Hash-basiertes Routing komplett entfernt aus app.ts
- [ ] Router-Subscription aktiv in connectedCallback/disconnectedCallback
- [ ] renderView() nutzt route.name für View-Switching
- [ ] Alle Views erhalten .route Property
- [ ] Sidebar Active-State funktioniert mit verschachtelten Routes
- [ ] Link Click Handler fängt lokale Navigation ab
- [ ] not-found-view.ts Link aktualisiert
- [ ] Top-Level Navigation (/specs, /chat, /workflows, /settings) funktioniert
- [ ] Keine TypeScript Errors
