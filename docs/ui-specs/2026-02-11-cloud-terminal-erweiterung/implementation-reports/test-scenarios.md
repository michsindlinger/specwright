# Test-Szenarien: Cloud Terminal Erweiterung

> Generiert am 2026-02-11 nach Abschluss der Implementierung
> Spec: agent-os/specs/2026-02-11-cloud-terminal-erweiterung/

## Zweck

Dieses Dokument beschreibt Test-Szenarien zum manuellen Testen oder zur Weitergabe an eine KI für automatisierte E2E-Tests.

---

## Voraussetzungen

### Systemvoraussetzungen
- [ ] Anwendung läuft lokal (`npm run dev` im `agent-os-ui` Verzeichnis)
- [ ] Backend-Server ist gestartet und WebSocket-Verbindung steht
- [ ] Mindestens ein Projekt ist im System vorhanden

### Test-Accounts / Daten
| Typ | Wert | Beschreibung |
|-----|------|--------------|
| Lokales Projekt | Beliebiges Verzeichnis mit `.git` | Projektpfad für Terminal-Sessions |
| LLM-Provider (optional) | Anthropic/OpenRouter API Key | Nur für Claude Code Session Tests benötigt |

---

## Test-Szenarien

### Szenario 1: CTE-001 - Terminal-Typ im Datenmodell & Protokoll

**Beschreibung:** Verifiziert, dass das Protokoll zwischen Shell- und Claude-Code-Terminals unterscheidet

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Shell-Terminal über UI erstellen | `cloud-terminal:create` Message enthält `terminalType: 'shell'` |
| 2 | Claude Code Session über UI erstellen | `cloud-terminal:create` Message enthält `terminalType: 'claude-code'` und `modelConfig` |
| 3 | Session-Metadaten prüfen | `terminalType` ist in der Session gespeichert |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Bestehende Session ohne Typ | Session aus altem Format (vor Feature) laden | Wird automatisch als `claude-code` behandelt |
| modelConfig bei Shell | Shell-Terminal mit modelConfig erstellen | modelConfig wird ignoriert, Shell startet normal |

#### Fehlerfälle

| Fehlerfall | Auslöser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| Ungültiger Terminal-Typ | Manuell ungültigen Typ senden | Fehler wird zurückgegeben, keine Session erstellt |

---

### Szenario 2: CTE-002 - Backend Plain Terminal Support

**Beschreibung:** Verifiziert, dass das Backend Shell-Terminals korrekt startet und verwaltet

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Shell-Terminal erstellen über WebSocket | Shell-Prozess wird im Projektpfad gestartet |
| 2 | Befehl im Shell-Terminal eingeben (z.B. `ls`) | Ausgabe des Befehls wird im Terminal angezeigt |
| 3 | Shell-Terminal schließen | Shell-Prozess wird beendet, Session entfernt |
| 4 | Claude Code Session erstellen | Claude Code wird mit Provider/Model gestartet wie bisher |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Ohne Model-Konfiguration | Shell-Session ohne modelConfig senden | Session wird erfolgreich erstellt |
| Mehrere Shell-Terminals | 3+ Shell-Terminals gleichzeitig öffnen | Alle funktionieren unabhängig |

#### Fehlerfälle

| Fehlerfall | Auslöser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| Fehlender Projektpfad | Shell-Session für nicht-existierendes Verzeichnis | Verständliche Fehlermeldung, keine Session erstellt |

---

### Szenario 3: CTE-003 - Frontend Session-Erstellungs-UI

**Beschreibung:** Verifiziert, dass die Terminal-Option im Dropdown erscheint und korrekt funktioniert

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Cloud Terminal Sidebar öffnen | Sidebar wird angezeigt |
| 2 | Auf "Neue Session" klicken | Dropdown öffnet sich |
| 3 | "Terminal" als erste Option im Dropdown prüfen | "Terminal" erscheint oben, getrennt durch Separator |
| 4 | "Terminal" auswählen | Shell-Terminal wird sofort gestartet (kein Provider/Model-Dialog) |
| 5 | Provider (z.B. Anthropic) auswählen | Model-Auswahl erscheint wie gewohnt |
| 6 | Model auswählen | Claude Code Session wird gestartet |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Keine Provider konfiguriert | Kein LLM-Provider vorhanden | "Terminal" Option ist trotzdem sichtbar und nutzbar |
| Schnelles Doppelklick | Doppelklick auf "Terminal" | Nur ein Terminal wird erstellt |

#### Fehlerfälle

| Fehlerfall | Auslöser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| Backend nicht erreichbar | Server ist offline | Connection-Error wird angezeigt |

---

### Szenario 4: CTE-004 - Integration & Tab-Management

**Beschreibung:** Verifiziert gemischte Tabs, Persistenz und Session-Management

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Shell-Terminal erstellen | Tab "Terminal 1" erscheint |
| 2 | Claude Code Session erstellen | Tab "Claude Session 1" erscheint |
| 3 | Zwischen Tabs wechseln | Jeweils korrekter Terminal-Inhalt wird angezeigt |
| 4 | Seite neu laden | Beide Sessions werden wiederhergestellt mit korrektem Typ |
| 5 | Shell-Terminal Tab schließen | Shell-Prozess wird beendet, Tab verschwindet |
| 6 | Weiteres Shell-Terminal erstellen | Tab "Terminal 2" erscheint (fortlaufende Nummerierung) |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Alle Tabs schließen | Alle Sessions beenden | Leerer Zustand, neue Session kann gestartet werden |
| Session-Persistenz ohne Typ | Alte Session ohne terminalType aus IndexedDB | Wird als `claude-code` behandelt |
| Viele gemischte Tabs | 5+ Shell + 5+ Claude Code Tabs | Alle koexistieren korrekt, Tab-Leiste scrollbar |

#### Fehlerfälle

| Fehlerfall | Auslöser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| IndexedDB nicht verfügbar | Browser-Einschränkungen | Sessions funktionieren, aber ohne Persistenz |

---

## Regressions-Checkliste

Bestehende Funktionalität, die nach der Implementierung noch funktionieren muss:

- [ ] Claude Code Session erstellen - Provider wählen, Model wählen, Session startet
- [ ] Claude Code Session Input/Output - Befehle eingeben, Antworten erhalten
- [ ] Tab-Wechsel - Zwischen bestehenden Claude Code Sessions wechseln
- [ ] Session schließen - Claude Code Session per Tab-Close beenden
- [ ] Session-Persistenz - Claude Code Sessions überleben Seite-Neuladen
- [ ] WebSocket-Reconnect - Nach Verbindungsabbruch reconnecten

---

## Automatisierungs-Hinweise

Falls diese Szenarien automatisiert werden sollen:

### Selektoren / Identifikatoren
```
Session-Dropdown: aos-model-dropdown
Terminal-Option: .provider-group (erste Gruppe im Dropdown)
Tab-Leiste: aos-terminal-tabs
Einzelner Tab: aos-terminal-tab
Terminal-Session: aos-terminal-session
Sidebar: aos-cloud-terminal-sidebar
```

### API-Endpunkte
| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| WebSocket `cloud-terminal:create` | WS Message | Neue Terminal-Session erstellen |
| WebSocket `cloud-terminal:input` | WS Message | Eingabe an Terminal senden |
| WebSocket `cloud-terminal:close` | WS Message | Terminal-Session schließen |
| WebSocket `cloud-terminal:resize` | WS Message | Terminal-Größe ändern |

### Mock-Daten
```json
{
  "shellSession": {
    "terminalType": "shell",
    "projectPath": "/projects/test-project"
  },
  "claudeCodeSession": {
    "terminalType": "claude-code",
    "projectPath": "/projects/test-project",
    "modelConfig": {
      "model": "sonnet",
      "provider": "anthropic"
    }
  }
}
```

---

## Notizen

- Shell-Terminals nutzen immer die System-Default-Shell (`$SHELL` oder Fallback auf `bash`)
- Es gibt aktuell keine Möglichkeit, eine Custom-Shell auszuwählen
- Die Terminal-Typ-Unterscheidung ist rein auf Protokoll-Ebene - das xterm.js Frontend verhält sich identisch
