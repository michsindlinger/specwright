# User-Todos: Cloud Code Terminal

> Generiert am 2026-02-05
> Spec: agent-os/specs/2026-02-05-cloud-code-terminal/

## Zweck

Diese Checkliste enthaelt Aufgaben, die **manuell vom Benutzer** erledigt werden muessen, damit das Feature vollstaendig funktioniert. Diese Aufgaben konnten waehrend der Implementierung nicht automatisch durchgefuehrt werden.

---

## Kritisch (vor Nutzung erforderlich)

Diese Aufgaben muessen erledigt werden, **bevor** das Feature verwendet werden kann:

- [ ] **Mindestens einen Provider konfigurieren**
  - Beschreibung: In den Settings muss mindestens ein LLM-Provider (z.B. Anthropic, OpenRouter) mit gueltigem API-Key konfiguriert sein
  - Grund: Cloud Terminal Sessions benoetigen einen Provider fuer die Claude Code CLI
  - Hinweis: Settings > Provider > API Key eintragen
  - Story: CCT-005

---

## Wichtig (fuer Produktion erforderlich)

Diese Aufgaben sollten vor dem Produktiv-Deployment erledigt werden:

- [ ] **MAX_SESSIONS Limit pruefen und anpassen**
  - Beschreibung: Das Standard-Limit ist 5 gleichzeitige Sessions. Je nach Server-Ressourcen anpassen
  - Grund: Zu viele parallele PTY-Sessions koennen den Server ueberlasten
  - Hinweis: Konfigurierbar im CloudTerminalManager (default: 5)
  - Story: CCT-006

- [ ] **Server-Ressourcen fuer PTY-Sessions sicherstellen**
  - Beschreibung: Jede Cloud Terminal Session startet einen PTY-Prozess auf dem Server. Sicherstellen, dass genuegend Ressourcen vorhanden sind
  - Grund: PTY-Prozesse verbrauchen RAM und CPU
  - Hinweis: Bei 5 gleichzeitigen Sessions ca. 500MB RAM zusaetzlich einplanen
  - Story: CCT-001

---

## Optional (Empfohlen)

Diese Aufgaben sind empfohlen, aber nicht zwingend erforderlich:

- [ ] **Erste Terminal-Session testen**
  - Beschreibung: Nach Deployment eine Test-Session starten und grundlegende Befehle ausfuehren
  - Grund: Validierung dass PTY, WebSocket und Frontend korrekt zusammenspielen
  - Hinweis: Terminal-Button im Header > Modell auswaehlen > Session starten
  - Story: CCT-003

- [ ] **Multi-Session Tabs testen**
  - Beschreibung: Mehrere Sessions gleichzeitig starten und zwischen Tabs wechseln
  - Grund: Sicherstellen dass Tab-Wechsel und parallele Sessions korrekt funktionieren
  - Hinweis: Bis zu 5 Sessions gleichzeitig moeglich
  - Story: CCT-003

- [ ] **Session-Persistenz testen (Page Reload)**
  - Beschreibung: Session starten, Seite neu laden, pruefen ob Session wiederhergestellt wird
  - Grund: Validierung der IndexedDB-Persistenz
  - Hinweis: Terminal-Buffer wird nicht persistiert, nur Metadaten (Session-ID, Name, Modell)
  - Story: CCT-004

---

## Bekannte Limitationen

- Maximale 5 gleichzeitige Sessions (konfigurierbar)
- Terminal-Buffer wird nicht persistiert (nur Metadaten)
- Inaktivitaets-Timeout nach 30 Minuten (Session wird pausiert)
- Browser-Tab im Hintergrund > 10 Minuten: Session wird pausiert

---

## Erledigte Aufgaben

Hier zur Nachverfolgung bereits erledigte Aufgaben:

(Noch keine)

---

## Notizen

- Das Cloud Terminal Feature nutzt WebSocket fuer die Kommunikation zwischen Frontend und Backend
- Jede Session laeuft in einem eigenen PTY-Prozess auf dem Server
- Die Session-Metadaten werden in IndexedDB im Browser gespeichert
- Bei Projektwechsel werden Sessions des vorherigen Projekts pausiert
