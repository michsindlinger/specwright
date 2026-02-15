# Test-Szenarien: 2026-02-02-chat-model-selection

> Generiert am 2026-02-02 nach Abschluss der Implementierung
> Spec: agent-os/specs/2026-02-02-chat-model-selection/

## Zweck

Dieses Dokument beschreibt Test-Szenarien zum manuellen Testen oder zur Weitergabe an eine KI für automatisierte E2E-Tests.

---

## Voraussetzungen

### Systemvoraussetzungen
- [ ] Anwendung läuft lokal (`npm run dev` in agent-os-ui)
- [ ] WebSocket-Server ist gestartet (Port 3000)
- [ ] Browser mit Developer Tools verfügbar

### Test-Accounts / Daten
| Typ | Wert | Beschreibung |
|-----|------|--------------|
| Keine Auth | - | Lokale Entwicklungsumgebung ohne Authentifizierung |

---

## Test-Szenarien

### Szenario 1: MODSEL-001 - Model Selector UI Component

**Beschreibung:** Test der Model-Selector Dropdown-Komponente im Chat-Header

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Chat-Seite im Browser öffnen (http://localhost:3001) | Chat-View wird geladen |
| 2 | Header-Bereich inspizieren | Model-Selector ist neben Project-Selector sichtbar |
| 3 | Aktuelle Auswahl prüfen | "Opus 4.5" wird als Standard angezeigt |
| 4 | Auf Model-Selector klicken | Dropdown-Menü öffnet sich |
| 5 | Dropdown-Inhalt prüfen | Anthropic-Modelle (Opus 4.5, Sonnet 4.5, Haiku 4.5) und GLM-Modelle (GLM 4.7, GLM 4.5 Air) sind gruppiert sichtbar |
| 6 | "Sonnet 4.5" auswählen | Dropdown schließt, Selector zeigt "Sonnet 4.5" |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| First Load | Erster Besuch der Chat-Seite | "Opus 4.5" ist vorausgewählt |
| Click Outside | Klick außerhalb des geöffneten Dropdowns | Dropdown schließt sich automatisch |
| Keyboard Escape | ESC-Taste bei geöffnetem Dropdown | Dropdown schließt sich |

#### Fehlerfälle

| Fehlerfall | Auslöser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| - | Keine bekannten Fehlerfälle für UI-Komponente | - |

---

### Szenario 2: MODSEL-002 - Provider Configuration

**Beschreibung:** Test der Provider-Konfiguration im Backend

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Server starten (`npm run dev`) | Server startet ohne Fehler |
| 2 | Config-Datei prüfen (`cat config/model-config.json`) | JSON enthält "anthropic" und "glm" Provider |
| 3 | Anthropic-Config prüfen | cliCommand ist "claude-anthropic-simple" |
| 4 | GLM-Config prüfen | cliCommand ist "claude" |
| 5 | Models prüfen | Anthropic hat opus/sonnet/haiku, GLM hat glm-5/glm-4.5-air |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Missing Config | model-config.json existiert nicht | Server verwendet hardcoded Defaults |
| Invalid JSON | model-config.json enthält ungültiges JSON | Server loggt Warnung, verwendet Defaults |

#### Fehlerfälle

| Fehlerfall | Auslöser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| - | Keine kritischen Fehlerfälle (Fallback vorhanden) | - |

---

### Szenario 3: MODSEL-003 - Backend Model Routing

**Beschreibung:** Test der WebSocket-basierten Model-Routing-Logik

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Browser Developer Tools öffnen → Network → WS | WebSocket-Verbindung sichtbar |
| 2 | Model auf "Sonnet 4.5" wechseln | "chat.settings.update" Nachricht wird gesendet |
| 3 | Server-Antwort prüfen | "chat.settings.response" mit Bestätigung empfangen |
| 4 | Nachricht im Chat senden | CLI-Befehl nutzt korrektes Model (in Server-Logs sichtbar) |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| New Session | Neue WebSocket-Verbindung | Default-Model "opus" (Anthropic) wird verwendet |
| Provider Switch | Wechsel von Anthropic zu GLM | CLI-Befehl wechselt von "claude-anthropic-simple" zu "claude" |

#### Fehlerfälle

| Fehlerfall | Auslöser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| Invalid Model | Nicht existierendes Model-ID senden | "chat.error" mit "Model nicht verfügbar" |
| CLI Spawn Error | CLI-Befehl nicht installiert | "chat.error" mit ENOENT oder spawn-Fehler |

---

### Szenario 4: MODSEL-004 - Session State Integration

**Beschreibung:** Test der Frontend-Backend-Synchronisation der Model-Auswahl

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Chat-Seite öffnen | Model-Selector zeigt "Opus 4.5" |
| 2 | Model auf "GLM 4.7" wechseln | UI aktualisiert sofort ohne Seitenneuladen |
| 3 | Nachricht senden | Nachricht enthält `model: { providerId: 'glm', modelId: 'glm-5' }` |
| 4 | Backend-Antwort prüfen | Antwort nutzt glm-5 Model |
| 5 | Weiteres Model wechseln (Haiku 4.5) | Nächste Nachricht verwendet Haiku |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Reconnect | WebSocket-Verbindung kurz unterbrochen | Nach Reconnect ist gleiches Model noch ausgewählt |
| Multiple Rapid Changes | Schnelle aufeinanderfolgende Model-Wechsel | Letztes ausgewähltes Model wird verwendet |

#### Fehlerfälle

| Fehlerfall | Auslöser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| WebSocket Disconnected | Verbindungsabbruch während Model-Wechsel | UI zeigt Reconnection-Status, Model bleibt lokal erhalten |

---

## Regressions-Checkliste

Bestehende Funktionalität, die nach der Implementierung noch funktionieren muss:

- [ ] **Chat-Funktionalität** - Nachrichten senden/empfangen funktioniert noch
- [ ] **Project-Selector** - Projektwechsel funktioniert weiterhin
- [ ] **Terminal-Integration** - Terminal-Sessions werden nicht beeinträchtigt
- [ ] **Workflow-Execution** - Workflows können gestartet werden
- [ ] **Session-Management** - Mehrere Chat-Sessions funktionieren parallel

---

## Automatisierungs-Hinweise

Falls diese Szenarien automatisiert werden sollen:

### Selektoren / Identifikatoren
```
Model-Selector Trigger: aos-model-selector .model-selector-trigger
Model-Dropdown: aos-model-selector .model-dropdown
Model-Option: aos-model-selector .model-option[data-model-id="{modelId}"]
Provider-Group: aos-model-selector .provider-group[data-provider="{providerId}"]
```

### API-Endpunkte
| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| WebSocket /ws | WS | Chat-WebSocket mit Model-Settings |
| chat.settings.update | WS Message | Model-Änderung an Backend |
| chat.settings.response | WS Message | Backend-Bestätigung |
| chat.send | WS Message | Chat-Nachricht mit Model-Info |

### Mock-Daten
```json
{
  "modelSelection": {
    "providerId": "anthropic",
    "modelId": "opus"
  },
  "settingsUpdate": {
    "type": "chat.settings.update",
    "settings": {
      "model": {
        "providerId": "anthropic",
        "modelId": "sonnet"
      }
    }
  }
}
```

---

## Notizen

- Die PTY/Terminal-Tests im Projekt haben bekannte Infrastruktur-Probleme (posix_spawnp failed) die unabhängig von diesem Feature sind
- Browser-basierte E2E-Tests werden empfohlen, da die WebSocket-Kommunikation am besten im echten Browser getestet werden kann
- Model-Auswahl wird aktuell nicht persistent gespeichert (nur Session-basiert)
