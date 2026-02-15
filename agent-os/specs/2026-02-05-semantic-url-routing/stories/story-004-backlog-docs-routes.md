# SUR-004: Backlog & Docs als eigenständige Routes

## User Story
**Als** User
**möchte ich** Backlog und Dokumentation über eigene Top-Level URLs (/backlog, /docs) erreichen,
**damit** ich direkt zu diesen Ansichten navigieren kann, ohne über das Dashboard gehen zu müssen.

## Akzeptanzkriterien (Gherkin)

```gherkin
Feature: Backlog & Docs Routes

  Scenario: Direct Access to Backlog
    Given der User gibt "/backlog" in die Adressleiste ein
    When die Seite lädt
    Then wird die Backlog-Ansicht angezeigt

  Scenario: Backlog Story Deep-Link
    Given der User gibt "/backlog/BUG-001" in die Adressleiste ein
    When die Seite lädt
    Then wird die Backlog-Story-Detail-Ansicht für "BUG-001" angezeigt

  Scenario: Direct Access to Docs
    Given der User gibt "/docs" in die Adressleiste ein
    When die Seite lädt
    Then wird die Dokumentations-Ansicht angezeigt

  Scenario: Sidebar Active State for Backlog
    Given die URL ist "/backlog"
    Then ist der "Dashboard" Nav-Link in der Sidebar als aktiv markiert
```

## Technische Details

### WAS (Scope)
- `/backlog` und `/backlog/:storyId` Routes in Dashboard-View handleRouteChange() mappen
- `/docs` Route in Dashboard-View mappen
- Sidebar Active-State: /backlog und /docs unter "Dashboard" Nav-Item einordnen

### WIE (Implementierung)
- In `handleRouteChange()`:
  - `backlog` → `this.viewMode = 'backlog'` + `loadBacklog()`
  - `backlog-story` → `this.viewMode = 'backlog-story'` + load story via gateway
  - `docs` → `this.viewMode = 'docs'`
- Sidebar matchPaths für Dashboard enthält `/specs`, `/backlog`, `/docs`

### WO (Dateien)
| Datei | Aktion | Beschreibung |
|-------|--------|-------------|
| `ui/src/views/dashboard-view.ts` | MODIFY | Backlog/Docs Route-Handling hinzufügen |

### WER (Layer)
- **Layer**: Presentation
- **Skill**: frontend-lit

## Dependencies
- SUR-003 (Dashboard Deep-Linking - handleRouteChange Infrastruktur)

## Definition of Ready
- [x] User Story klar formuliert
- [x] Akzeptanzkriterien definiert
- [x] Technische Details vollständig
- [x] Abhängigkeit definiert
- [x] Aufwand geschätzt: S

## Definition of Done
- [ ] /backlog lädt Backlog-Ansicht korrekt
- [ ] /backlog/{storyId} lädt Story-Detail korrekt
- [ ] /docs lädt Dokumentations-Ansicht korrekt
- [ ] Sidebar Active-State korrekt für /backlog und /docs
- [ ] Page Reload auf /backlog und /docs funktioniert
- [ ] Keine TypeScript Errors
