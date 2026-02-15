# Test-Szenarien: Chat with the Spec

> Generiert am 2026-02-04 nach Abschluss der Implementierung
> Spec: agent-os/specs/2026-02-04-chat-with-spec/spec.md

## Zweck

Dieses Dokument beschreibt Test-Szenarien zum manuellen Testen oder zur Weitergabe an eine KI für automatisierte E2E-Tests.

---

## Voraussetzungen

### Systemvoraussetzungen
- [ ] Anwendung läuft lokal / auf Staging
- [ ] Testdaten sind vorhanden (Spec-Verzeichnis `specs/2026-02-04-chat-with-spec` existiert)
- [ ] Claude API Key ist konfiguriert

---

## Test-Szenarien

### Szenario 1: CHAT-001 - Backend Spec Context Loading

**Beschreibung:** Überprüfung, ob das Backend den Kontext einer Spec (spec.md, kanban.json) korrekt lädt.

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Backend ruft `getSpecContext` für eine valide Spec ID auf | Kontext-String wird zurückgegeben |
| 2 | Prüfe Inhalt des Kontext-Strings | Enthält Marker für `spec.md` und `kanban.json` |

#### Fehlerfälle

| Fehlerfall | Auslöser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| Invalide Spec ID | Aufruf mit `non-existent-id` | Leerer Kontext oder Warnung (kein Crash) |

---

### Szenario 2: CHAT-002 - UI Chat Component Basics

**Beschreibung:** Überprüfung der Basisfunktionalität der `aos-spec-chat` Komponente.

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Komponente im Browser anzeigen | Nachrichten-Fenster und Eingabezeile sind sichtbar |
| 2 | Text eingeben und Senden klicken | Event `send-message` wird gefeuert, Feld geleert |

---

### Szenario 3: CHAT-003 - Integriertes Kanban Chat Panel

**Beschreibung:** End-to-End Test der Chat-Integration im Kanban-Board.

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Kanban Board öffnen | "Spec Chat" Button im Header sichtbar |
| 2 | "Spec Chat" Button klicken | Sidebar mit Chat öffnet sich |
| 3 | Nachricht senden (z.B. "Was ist die nächste Story?") | Antwort von Claude erscheint im Chat (gestreamt) |

---

## Regressions-Checkliste

Bestehende Funktionalität, die nach der Implementierung noch funktionieren muss:

- [ ] Kanban Board Rendering - Board muss weiterhin korrekt angezeigt werden
- [ ] WebSocket Verbindung - Andere WebSocket Events dürfen nicht beeinträchtigt sein

---

## Automatisierungs-Hinweise

### Selektoren / Identifikatoren
```
Chat-Button: [data-testid="spec-chat-toggle"]
Chat-Panel: aos-spec-chat
```

---

## Notizen

Der Chat erfordert eine aktive Internetverbindung zur Anthropic API.
