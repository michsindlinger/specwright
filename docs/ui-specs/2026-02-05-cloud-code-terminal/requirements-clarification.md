# Requirements Clarification - Cloud Code Terminal

**Created:** 2026-02-05
**Status:** Pending User Approval

---

## Feature Overview

Ein integriertes Cloud Code Terminal als Sliding Sidebar im Agent OS Web UI. Entwickler können mehrere Claude Code CLI-Sessions direkt aus der Web UI starten, mit Modell-Auswahl aus allen konfigurierten Providern. Das Terminal ist als ein-/ausfahrbare Sidebar implementiert, die Sessions werden über Projektwechsel und Page-Reloads hinweg erhalten.

---

## Target Users

**Als Entwickler** möchte ich schnell Claude Code Befehle im Projekt ausführen können, ohne die Anwendung zu verlassen - für schnelle Code-Generierung, Refactoring oder Analyse direkt aus der Web UI.

---

## Business Value

- **Produktivitätssteigerung:** Schneller Zugriff auf Claude Code ohne Kontextwechsel
- **Parallele Arbeit:** Mehrere Sessions für verschiedene Aufgaben gleichzeitig
- **Kontinuität:** Sessions bleiben über Projektwechsel und Reloads erhalten
- **Flexibilität:** Vollständige Claude Code CLI mit allen Features verfügbar

---

## Functional Requirements

### Core Features

1. **Terminal-Start im Header**
   - Start-Button neben dem Projekt-Selektor
   - Beim Klick: Modell-Auswahl aus allen konfigurierten Provider-Modellen
   - Terminal startet im aktuell ausgewählten Projekt

2. **Sliding Sidebar**
   - Von rechts ein-/ausfahrbare Sidebar
   - Zustand: Offen/Geschlossen (nicht beendet)
   - Breite verstellbar (optional)

3. **Multi-Session Support**
   - Mehrere Terminal-Sessions als Tabs in der Sidebar
   - Jede Session hat eigenen Tab mit Namen/ID
   - Tabs können geschlossen werden (Session beenden)

4. **Vollständige Claude Code CLI**
   - Alle Befehle und Features der Claude Code CLI (Xterm integration wiederverwenden)
   - /commands Unterstützung
   - Tool-Use und Streaming
   - Message History sichtbar

5. **Session Management**
   - Sessions werden beim Schließen der Sidebar pausiert
   - Sessions bleiben über Page-Reloads erhalten
   - Sessions bleiben über Projektwechsel erhalten (pausiert)
   - Sessions können explizit beendet werden

6. **Projekt-Kontext**
   - Sessions sind an das Projekt gebunden, in dem sie gestartet wurden
   - Beim Projektwechsel: Sessions des alten Projekts pausieren
   - Sessions werden im Projekt-Kontext wieder aufgenommen

---

## Affected Areas & Dependencies

| Component | Impact |
|-----------|--------|
| **Header Component** | Neuer Terminal-Start-Button, Modell-Auswahl-Dropdown |
| **Shell/Layout** | Sliding Sidebar Container, Zustandsmanagement |
| **Backend API** | Neue Endpoints für Terminal-Sessions, Claude Code CLI Integration |
| **WebSocket** | Streaming für Terminal-Ausgaben |
| **Project Service** | Projekt-Kontext für Sessions, Projektwechsel-Handling |
| **Session Storage** | Persistenz über Reloads, Session-State Management |
| **Config Service** | Laden der konfigurierten Provider-Modelle |

---

## Edge Cases & Error Scenarios

| Scenario | Expected Behavior |
|----------|-------------------|
| Keine Provider konfiguriert | Fehlermeldung: "Bitte konfigurieren Sie mindestens einen Provider" |
| Session startet nicht | Fehleranzeige im Terminal mit Retry-Option |
| Projektwechsel während aktiver Session | Session pausieren, Status speichern |
| Browser-Reload | Sessions aus Storage wiederherstellen |
| Session Timeout | Automatisches Pausieren, Benutzer informieren |
| Maximale Sessions erreicht | Limit konfigurierbar (z.B. max 5), Fehlermeldung |
| Ungültiges Modell ausgewählt | Validierung vor Start, Fehlermeldung |

---

## Security & Permissions

- Sessions laufen mit den Rechten des aktuellen Benutzers
- Keine zusätzlichen Auth-Checks nötig (bereits im Web UI authentifiziert)
- Projekt-Zugriff über bestehende Projekt-Selektor-Logik

---

## Performance Considerations

- Sessions im Hintergrund pausieren (nicht dauerhaft laufen lassen)
- Lazy Loading der Terminal-Komponente
- WebSocket-Verbindung nur bei geöffneter Sidebar aktiv
- Session-State im LocalStorage/IndexedDB für Persistenz

---

## Scope Boundaries

### IN SCOPE:
- Terminal-Start-Button im Header
- Modell-Auswahl aus allen konfigurierten Providern
- Sliding Sidebar mit Multi-Tab Support
- Vollständige Claude Code CLI Integration
- Session-Persistenz über Reloads
- Session-Verwaltung über Projektwechsel
- Session explizit beenden

### OUT OF SCOPE:
- Keyboard Shortcuts (Ctrl+T) - Optional für später
- Resizable Sidebar - Optional für später
- Session History Export - Optional für später
- Session-Sharing zwischen Benutzern
- Terminal-Themes/Customization
- Mobile-Ansicht des Terminals

---

## Open Questions

- Maximale Anzahl gleichzeitiger Sessions? (Vorschlag: 5)
- Session-Timeout nach Inaktivität? (Vorschlag: 30min)
- Speicherort für Session-State? (Vorschlag: IndexedDB)

---

## Proposed User Stories (High Level)

1. **Terminal-Start mit Modell-Auswahl** - Button im Header öffnet Modell-Dropdown, Terminal startet
2. **Sliding Sidebar Container** - Sidebar ein-/ausfahrbar, behält Zustand bei
3. **Multi-Session Tabs** - Mehrere Sessions als Tabs, Tabs schließbar
4. **Claude Code CLI Integration** - Vollständige CLI in Terminal mit Streaming
5. **Session Persistenz** - Sessions bleiben über Reloads erhalten
6. **Projekt-Kontext Management** - Sessions pausieren/beibehalten bei Projektwechsel
7. **Session explizit beenden** - Button zum Beenden einzelner Sessions

---

*Review this document carefully. Once approved, detailed user stories will be generated.*
