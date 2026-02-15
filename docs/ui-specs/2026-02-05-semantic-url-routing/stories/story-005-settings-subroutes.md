# SUR-005: Settings Sub-Routes

## User Story
**Als** User
**möchte ich** die verschiedenen Settings-Sektionen (Models, General, Appearance) über eigene URLs erreichen,
**damit** ich direkt zur gewünschten Einstellungsseite navigieren kann.

## Akzeptanzkriterien (Gherkin)

```gherkin
Feature: Settings Sub-Routes

  Scenario: Direct Access to Model Settings
    Given der User gibt "/settings/models" in die Adressleiste ein
    When die Seite lädt
    Then wird die Model-Konfigurationsseite angezeigt

  Scenario: Direct Access to General Settings
    Given der User gibt "/settings/general" in die Adressleiste ein
    When die Seite lädt
    Then wird die General-Einstellungsseite angezeigt

  Scenario: Settings Default
    Given der User gibt "/settings" in die Adressleiste ein
    When die Seite lädt
    Then wird die Model-Konfigurationsseite angezeigt (Default)

  Scenario: Section Navigation Updates URL
    Given der User ist auf "/settings/models"
    When der User auf "General" in der Settings-Navigation klickt
    Then ändert sich die URL zu "/settings/general"
```

## Technische Details

### WAS (Scope)
- Settings-View akzeptiert `route` Property
- `activeSection` wird aus Route abgeleitet
- Settings-interne Navigation nutzt `router.navigate()`

### WIE (Implementierung)
- `@property() route: RouteMatch` hinzufügen
- In `updated()`: Route → activeSection Mapping
  - `settings` / `settings-models` → 'models'
  - `settings-general` → 'general'
  - `settings-appearance` → 'appearance'
- `handleSectionChange()` ruft `router.navigate('/settings/{section}')` auf

### WO (Dateien)
| Datei | Aktion | Beschreibung |
|-------|--------|-------------|
| `ui/src/views/settings-view.ts` | MODIFY | Route-basierte Section-Steuerung |

### WER (Layer)
- **Layer**: Presentation
- **Skill**: frontend-lit

## Dependencies
- SUR-002 (App Shell Migration - route Property Weiterreichung)

## Definition of Ready
- [x] User Story klar formuliert
- [x] Akzeptanzkriterien definiert
- [x] Technische Details vollständig
- [x] Aufwand geschätzt: S

## Definition of Done
- [ ] /settings/models, /settings/general, /settings/appearance funktionieren
- [ ] /settings Default leitet zu Models-Sektion
- [ ] Settings-interne Navigation aktualisiert URL
- [ ] Page Reload auf Settings Sub-Routes funktioniert
- [ ] Keine TypeScript Errors
