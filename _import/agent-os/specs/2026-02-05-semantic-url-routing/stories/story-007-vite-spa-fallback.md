# SUR-007: Vite SPA Fallback & Production Server Config

## User Story
**Als** Entwickler
**möchte ich** dass der Vite Dev Server und der Production Server alle verschachtelten URLs korrekt auf index.html fallen lassen,
**damit** Deep-Links auch bei direktem Browser-Aufruf funktionieren.

## Akzeptanzkriterien (Gherkin)

```gherkin
Feature: SPA Fallback Configuration

  Scenario: Vite Dev Server Nested Routes
    Given der Vite Dev Server läuft
    When der Browser direkt "/specs/abc/kanban" aufruft
    Then wird index.html zurückgegeben
    And die SPA-Anwendung übernimmt das Routing

  Scenario: API Proxy nicht betroffen
    Given der Vite Dev Server läuft
    When eine Anfrage an "/api/..." oder "/ws" gesendet wird
    Then wird der Request an den Backend-Server weitergeleitet
    And der SPA Fallback greift NICHT
```

## Technische Details

### WAS (Scope)
- Vite Dev Server SPA Fallback verifizieren/konfigurieren
- Express Server SPA Catch-All für Production hinzufügen

### WIE (Implementierung)
- Vite: `appType: 'spa'` ist Default → verifizieren dass nested routes funktionieren
- Express: `express.static()` + catch-all `app.get('*', ...)` nach API-Routes

### WO (Dateien)
| Datei | Aktion | Beschreibung |
|-------|--------|-------------|
| `ui/vite.config.ts` | VERIFY/MODIFY | SPA Fallback für nested routes sicherstellen |
| `src/server/index.ts` | MODIFY | Static file serving + SPA catch-all route |

### WER (Layer)
- **Layer**: Infrastructure
- **Skill**: backend-express

## Dependencies
- Keine (kann parallel zu SUR-001 implementiert werden)

## Definition of Ready
- [x] User Story klar formuliert
- [x] Akzeptanzkriterien definiert
- [x] Aufwand geschätzt: S

## Definition of Done
- [ ] Vite Dev Server liefert index.html für alle nested routes
- [ ] API/WS Proxy funktioniert weiterhin
- [ ] Express Production Server hat SPA catch-all
- [ ] Manueller Test: Direkte Browser-Eingabe von /specs/abc/kanban funktioniert
