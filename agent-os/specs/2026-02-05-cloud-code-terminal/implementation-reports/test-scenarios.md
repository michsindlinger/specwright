# Test-Szenarien: Cloud Code Terminal

> Generiert am 2026-02-05 nach Abschluss der Implementierung
> Spec: agent-os/specs/2026-02-05-cloud-code-terminal/

## Zweck

Dieses Dokument beschreibt Test-Szenarien zum manuellen Testen oder zur Weitergabe an eine KI für automatisierte E2E-Tests.

---

## Voraussetzungen

### Systemvoraussetzungen
- [ ] Anwendung läuft lokal (`npm run dev` in agent-os-ui)
- [ ] Mindestens ein Provider ist konfiguriert (z.B. Anthropic, OpenRouter)
- [ ] WebSocket-Verbindung ist aktiv (Backend + Frontend)
- [ ] Ein Projekt ist ausgewählt

### Test-Accounts / Daten
| Typ | Wert | Beschreibung |
|-----|------|--------------|
| Provider | Anthropic / OpenRouter | Mindestens ein konfigurierter LLM-Provider |
| Projekt | Beliebiges lokales Projekt | Projektverzeichnis mit gueltigem Pfad |

---

## Test-Szenarien

### Szenario 1: CCT-001 - Backend Cloud Terminal Infrastructure

**Beschreibung:** Backend-System fuer Cloud Terminal Sessions (PTY Management, WebSocket Handler)

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | WebSocket-Verbindung oeffnen | Verbindung wird erfolgreich hergestellt |
| 2 | "cloud-terminal:create" Nachricht mit Projekt-Pfad und Modell senden | Neue PTY-Session wird gestartet |
| 3 | "cloud-terminal:created" Bestaetigung pruefen | Session-ID wird zurueckgegeben |
| 4 | Zweite Session erstellen | Zweite Session laeuft parallel, eigene ID |
| 5 | "cloud-terminal:close" Nachricht senden | Session wird beendet, Ressourcen freigegeben |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Max Sessions | 6. Session erstellen bei Limit 5 | Fehlermeldung "Maximale Anzahl Sessions (5) erreicht" |
| Session pausieren | Projekt wechseln | Session wird pausiert, Output gepuffert |
| Session fortsetzen | Zurueck zum Projekt wechseln | Gepufferter Output wird gesendet |

#### Fehlerfaelle

| Fehlerfall | Ausloeser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| PTY nicht verfuegbar | System-Ressourcen erschoepft | "Session konnte nicht gestartet werden" |
| Ungueltige Session-ID | close mit falscher ID | Graceful error handling |

---

### Szenario 2: CCT-002 - Frontend Sidebar Container

**Beschreibung:** Ein-/ausfahrbare Sidebar fuer das Cloud Terminal

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Terminal-Button im Header klicken | Sidebar faehrt von rechts ein |
| 2 | "Neue Session" Button pruefen | Button ist sichtbar |
| 3 | Tab-Leiste pruefen | Initial leer |
| 4 | Schliessen-Button klicken | Sidebar faehrt nach rechts aus |
| 5 | Terminal-Button erneut klicken | Sidebar oeffnet sich wieder |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Keine Sessions | Sidebar oeffnen ohne aktive Sessions | Empty-State: "Keine aktiven Sessions" + "Neue Session starten" Button |
| Session aktiv, Sidebar geschlossen | Sidebar schliessen bei aktiver Session | Session wird pausiert, Button zeigt Badge |
| Badge-Anzeige | Mehrere Sessions aktiv | Badge zeigt Anzahl aktiver Sessions |

#### Fehlerfaelle

| Fehlerfall | Ausloeser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| Kein Projekt ausgewaehlt | Terminal-Button ohne Projekt | Sidebar zeigt Hinweis: Projekt auswaehlen |

---

### Szenario 3: CCT-003 - Terminal Session Component

**Beschreibung:** Terminal-Session-Komponente mit Claude Code CLI im Browser

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | "Neue Session" klicken | Modell-Auswahl-Dialog oeffnet sich |
| 2 | Modell auswaehlen | Modell wird selektiert |
| 3 | Session starten | Neuer Tab wird erstellt, Terminal zeigt Claude Code Prompt |
| 4 | Befehl eingeben (z.B. "help") | Befehl wird an Backend gesendet |
| 5 | Enter druecken | Antwort wird im Terminal angezeigt, Streaming-Output live |
| 6 | Zweite Session starten | Zweiter Tab erscheint |
| 7 | Zwischen Tabs wechseln | Aktiver Tab wechselt, anderer bleibt aktiv |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Tab schliessen | X-Icon eines Tabs klicken | Bestaetigung: "Session beenden?" |
| Bestaetigte Schliessung | Session beenden bestaetigen | Tab geschlossen, PTY terminiert |
| Verbindung verloren | WebSocket unterbrochen | "Verbindung verloren" + "Wiederverbinden" Button |

#### Fehlerfaelle

| Fehlerfall | Ausloeser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| WebSocket-Disconnect | Netzwerk-Unterbrechung | "Verbindung verloren" mit Retry-Option |
| Session-Start fehlgeschlagen | Backend-Fehler | "Session konnte nicht gestartet werden" |

---

### Szenario 4: CCT-004 - Session Persistence

**Beschreibung:** Sessions ueberleben Page-Reloads und Projektwechsel

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | 2 Terminal-Sessions starten | Beide Sessions aktiv |
| 2 | Seite neu laden (F5) | Sessions werden aus IndexedDB wiederhergestellt |
| 3 | Sidebar pruefen | Alle vorherigen Sessions werden angezeigt |
| 4 | Session-Status pruefen | Status "Pausiert" oder "Wiederverbinden" |
| 5 | Auf Session klicken | Session wird wiederhergestellt |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Projektwechsel | Von Projekt A zu Projekt B wechseln | Sessions von A pausiert, B-Sessions angezeigt |
| Zurueck wechseln | Von Projekt B zu A zurueckwechseln | A-Sessions werden wiederhergestellt |
| Metadaten pruefen | Session-Metadaten in IndexedDB | Session-ID, Name, Modell, Projekt-Pfad gespeichert |
| Buffer nicht persistiert | Page Reload | Terminal-Buffer leer (nur Metadaten wiederhergestellt) |

#### Fehlerfaelle

| Fehlerfall | Ausloeser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| Backend-Session beendet | Server-Neustart nach Persistierung | "Session nicht mehr verfuegbar", Session aus IDB entfernt |

---

### Szenario 5: CCT-005 - Model Selection Integration

**Beschreibung:** Modell-Auswahl aus allen konfigurierten Providern

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | "Neue Session" klicken | Modell-Auswahl-Dialog oeffnet sich |
| 2 | Provider-Modelle pruefen | Alle konfigurierten Provider-Modelle sichtbar, gruppiert nach Provider |
| 3 | Modell auswaehlen (z.B. "Claude Sonnet") | Modell selektiert |
| 4 | "Session starten" klicken | Session mit ausgewaehltem Modell gestartet, Dialog schliesst sich |
| 5 | Neue Session starten | Letztes Modell ist vorausgewaehlt |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Keine Provider | Keine Provider konfiguriert | Empty-State: "Keine Provider konfiguriert" + Link zur Konfiguration |
| Standard-Modell | Letztes verwendetes Modell | Vorauswahl des zuletzt verwendeten Modells |

#### Fehlerfaelle

| Fehlerfall | Ausloeser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| Provider-Fetch fehlgeschlagen | Backend nicht erreichbar | Fehlermeldung beim Laden der Provider |

---

### Szenario 6: CCT-006 - Polish & Edge Cases

**Beschreibung:** Robuste Fehlerbehandlung, Limits und Loading States

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Neue Session starten | Loading-Spinner + "Session wird gestartet..." |
| 2 | Session wird bereit | Spinner verschwindet, Terminal wird angezeigt |
| 3 | 5 Sessions starten | Alle 5 Sessions laufen |
| 4 | 6. Session versuchen | Fehlermeldung: "Maximale Anzahl Sessions (5) erreicht" |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Inaktivitaets-Timeout | 30 Minuten keine Eingabe | Session automatisch pausiert + Hinweis |
| Browser-Tab Hintergrund | Tab >10 Minuten im Hintergrund | Session pausiert, Ressourcen freigegeben |
| Tab zurueckkehren | Zurueck zum Tab wechseln | Session wird fortgesetzt |
| Session-Limit erreicht | 5 aktive Sessions | "Bitte schliessen Sie eine bestehende Session" |

#### Fehlerfaelle

| Fehlerfall | Ausloeser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| Session-Start Fehler | PTY nicht verfuegbar | "Session konnte nicht gestartet werden" + "Erneut versuchen" |
| Fehler-Status im Tab | Backend-Fehler | Fehler-Status wird im Tab angezeigt |

---

## Regressions-Checkliste

Bestehende Funktionalitaet, die nach der Implementierung noch funktionieren muss:

- [ ] Bestehende Terminal-Funktionalitaet (aos-terminal) - Terminal im Chat-Bereich funktioniert weiterhin
- [ ] Projekt-Selektor - Projektauswahl funktioniert weiterhin korrekt
- [ ] Header-Layout - Header-Elemente sind korrekt positioniert nach Hinzufuegen des Terminal-Buttons
- [ ] WebSocket-Verbindung - Bestehende WebSocket-Nachrichten (Chat, etc.) werden nicht beeinflusst
- [ ] Sidebar-Interaktionen - Andere Sidebars (z.B. Spec-Chat) funktionieren weiterhin

---

## Automatisierungs-Hinweise

Falls diese Szenarien automatisiert werden sollen:

### Selektoren / Identifikatoren
```
Terminal-Button im Header: aos-app header button (Terminal-Icon)
Sidebar: aos-cloud-terminal-sidebar
Tab-Leiste: aos-terminal-tabs
Terminal-Session: aos-terminal-session
Modell-Dropdown: aos-model-dropdown
```

### API-Endpunkte
| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| WebSocket: cloud-terminal:create | WS Message | Neue Session erstellen |
| WebSocket: cloud-terminal:close | WS Message | Session schliessen |
| WebSocket: cloud-terminal:input | WS Message | Input an Session senden |
| WebSocket: cloud-terminal:output | WS Message | Output von Session empfangen |
| WebSocket: cloud-terminal:created | WS Response | Session erfolgreich erstellt |
| WebSocket: cloud-terminal:closed | WS Response | Session geschlossen |
| WebSocket: cloud-terminal:list | WS Message | Aktive Sessions auflisten |

### Mock-Daten
```json
{
  "session": {
    "id": "test-session-001",
    "name": "Test Session",
    "model": "claude-sonnet-4-5-20250929",
    "projectPath": "/Users/dev/test-project",
    "status": "active"
  },
  "provider": {
    "name": "Anthropic",
    "models": [
      {"id": "claude-opus-4-5-20251101", "name": "Claude Opus 4.5"},
      {"id": "claude-sonnet-4-5-20250929", "name": "Claude Sonnet 4.5"}
    ]
  }
}
```

---

## Notizen

- Terminal-Buffer wird NICHT persistiert, nur Metadaten (Session-ID, Name, Modell, Projekt)
- Maximale Sessions: 5 (konfigurierbar)
- Inaktivitaets-Timeout: 30 Minuten
- Background-Tab-Detection nutzt Page Visibility API
- Alle Terminal-Sessions nutzen PTY im Backend via CloudTerminalManager
