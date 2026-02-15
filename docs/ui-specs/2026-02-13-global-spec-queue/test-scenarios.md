# Test-Szenarien: Global Spec Queue

> Generiert am 2026-02-13 nach Abschluss der Implementierung
> Spec: agent-os/specs/2026-02-13-global-spec-queue/

## Zweck

Dieses Dokument beschreibt Test-Szenarien zum manuellen Testen oder zur Weitergabe an eine KI für automatisierte E2E-Tests.

---

## Voraussetzungen

### Systemvoraussetzungen
- [ ] Anwendung läuft lokal (`npm run dev` im `agent-os-ui/` Verzeichnis)
- [ ] Mindestens 2 Projekte mit Specs im Dateisystem vorhanden
- [ ] WebSocket-Verbindung zum Backend aktiv

### Test-Accounts / Daten
| Typ | Wert | Beschreibung |
|-----|------|--------------|
| Projekt A | Beliebiges Projekt mit `agent-os/specs/` | Primäres Testprojekt |
| Projekt B | Zweites Projekt mit `agent-os/specs/` | Für Multi-Projekt-Tests |

---

## Test-Szenarien

### Szenario 1: GSQ-001 - Backend Queue-Service auf Global umstellen

**Beschreibung:** Globale Queue verwaltet Specs aus verschiedenen Projekten in einer einzigen Queue.

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Spec aus Projekt A zur Queue hinzufügen | Item erscheint in der Queue mit korrektem projectPath und projectName |
| 2 | Spec aus Projekt B zur Queue hinzufügen | Zweites Item erscheint in derselben globalen Queue |
| 3 | Queue starten | Specs werden sequenziell ausgeführt, unabhängig vom Projekt |
| 4 | Erster Spec abgeschlossen | Nächster pending Spec wird automatisch mit korrektem projectPath gestartet |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Leere Queue starten | Start-Button bei leerer Queue drücken | Kein Fehler, Queue bleibt idle |
| Gleiches Spec doppelt adden | Denselben Spec zweimal hinzufügen | Wird verhindert oder als separate Items geführt |

#### Fehlerfälle

| Fehlerfall | Auslöser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| Ungültiger projectPath | Spec mit gelöschtem Projekt hinzufügen | Fehler-Eintrag im Execution Log |

---

### Szenario 2: GSQ-002 - Multi-Project Spec-Loading

**Beschreibung:** Specs aus allen geöffneten Projekten werden korrekt geladen und gruppiert angezeigt.

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Bottom Panel öffnen | Specs-Section (rechts) zeigt alle Specs gruppiert nach Projekt |
| 2 | Projekt-Header prüfen | Jedes Projekt hat einen Projekt-Namen und Spec-Count |
| 3 | Spec-Card prüfen | Jede SpecInfo enthält projectPath und projectName |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Projekt ohne Specs | Projekt ohne `agent-os/specs/` Ordner | Projekt erscheint mit leerer Spec-Liste oder wird ausgeblendet |
| Einzelnes Projekt | Nur ein Projekt geöffnet | Specs werden ohne Gruppierung angezeigt |

#### Fehlerfälle

| Fehlerfall | Auslöser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| Specs-Ordner nicht lesbar | Berechtigungsproblem im Dateisystem | Graceful Handling, andere Projekte werden trotzdem geladen |

---

### Szenario 3: GSQ-003 - Execution Log Service

**Beschreibung:** Execution Log streamt Einträge bei Queue-Ausführung in Echtzeit.

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Queue starten | Log-Einträge für Spec-Start erscheinen |
| 2 | Story wird gestartet | Log-Eintrag mit Story-Info wird gestreamt |
| 3 | Story wird abgeschlossen | Log-Eintrag mit Completion-Info erscheint |
| 4 | Client neu verbinden | `queue.log.state` liefert alle bisherigen Einträge |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| 500+ Log-Einträge | Sehr lange Queue-Ausführung | FIFO-Rotation: älteste Einträge werden entfernt |
| Mehrere Clients verbunden | Zweiten Browser-Tab öffnen | Beide Clients erhalten Log-Einträge per Broadcast |

#### Fehlerfälle

| Fehlerfall | Auslöser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| Queue-Fehler während Ausführung | Spec-Execution schlägt fehl | Error-LogEntry mit type `error` wird erstellt |

---

### Szenario 4: GSQ-004 - Bottom Panel Grundstruktur

**Beschreibung:** Ausklappbares Bottom Panel mit Tabs, Resize und Persistenz.

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Panel öffnen | Panel erscheint am unteren Rand mit Slide-up Animation |
| 2 | Tab "Queue & Specs" prüfen | Tab ist sichtbar und aktiv |
| 3 | Tab "Log" klicken | Log-Tab wird angezeigt |
| 4 | Resize-Handle nach oben ziehen | Panel-Höhe vergrößert sich (max 60vh) |
| 5 | Resize-Handle nach unten ziehen | Panel-Höhe verkleinert sich (min 200px) |
| 6 | Seite neu laden | Gespeicherte Höhe und aktiver Tab werden wiederhergestellt |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Minimale Höhe | Panel auf unter 200px ziehen | Höhe bleibt bei 200px (Minimum) |
| Maximale Höhe | Panel auf über 60vh ziehen | Höhe bleibt bei 60vh (Maximum) |
| localStorage gelöscht | localStorage leeren, Panel öffnen | Standardhöhe und Standard-Tab werden verwendet |

#### Fehlerfälle

| Fehlerfall | Auslöser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| Panel überlappt Content | Sehr kleine Viewport-Höhe | Panel passt sich an, Content scrollbar |

---

### Szenario 5: GSQ-005 - App Shell Integration

**Beschreibung:** Bottom Panel über Sidebar-Icon und Keyboard Shortcut steuerbar.

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Queue-Icon in Sidebar klicken | Bottom Panel öffnet sich |
| 2 | Queue-Icon erneut klicken | Bottom Panel schließt sich |
| 3 | Cmd/Ctrl+Shift+Q drücken | Bottom Panel togglet |
| 4 | Queue starten | Queue-Icon in Sidebar zeigt Badge/Indikator |
| 5 | Panel öffnen | main-content hat passendes padding-bottom |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Shortcut in Input-Feld | Cmd/Ctrl+Shift+Q in einem Text-Input | Panel togglet trotzdem (globaler Shortcut) |
| Panel offen + View wechseln | Von Dashboard zu anderer View navigieren | Panel bleibt offen |

#### Fehlerfälle

| Fehlerfall | Auslöser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| WebSocket getrennt | Netzwerk-Unterbrechung | Panel bleibt offen, zeigt Verbindungsstatus |

---

### Szenario 6: GSQ-006 - Queue Section (Split-View links)

**Beschreibung:** Queue-Management im linken Bereich des Bottom Panels.

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Queue & Specs Tab öffnen | Links ist die Queue-Section mit Start/Stop Controls sichtbar |
| 2 | Spec von rechts in Queue ziehen (Drag & Drop) | Spec wird zur Queue hinzugefügt |
| 3 | Item per Drag & Drop verschieben | Reihenfolge ändert sich |
| 4 | Queue starten | Items zeigen Fortschritt (x/y Stories) und Projektnamen |
| 5 | Queue stoppen | Queue wird gestoppt, laufender Spec wird abgeschlossen |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Drag über ungültigen Bereich | Spec außerhalb der Queue-Zone droppen | Kein Effekt, Item bleibt im Ursprung |
| Queue mit einem Item | Reorder bei einzelnem Item | Kein Effekt möglich |
| Laufende Queue umordnen | Items verschieben während Queue läuft | Pending Items können umgeordnet werden, laufendes Item bleibt |

#### Fehlerfälle

| Fehlerfall | Auslöser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| Drop ohne Git-Strategy | Spec ohne Git-Strategy in Queue ziehen | Git-Strategy Dialog öffnet sich |

---

### Szenario 7: GSQ-007 - Specs Section (Split-View rechts)

**Beschreibung:** Alle Specs aus allen Projekten im rechten Bereich des Bottom Panels.

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Queue & Specs Tab öffnen | Rechts alle Specs gruppiert nach Projekt sichtbar |
| 2 | Projekt-Header klicken | Sektion klappt auf/zu |
| 3 | Spec-Card in Queue ziehen | Spec wird zur Queue hinzugefügt |
| 4 | [+Q] Button auf Spec-Card klicken | Spec wird zur Queue hinzugefügt |
| 5 | Neues Projekt öffnen | Specs-Section aktualisiert sich automatisch |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Projekt schließen | Ein Projekt wird geschlossen | Projekt-Sektion verschwindet aus Specs-Section |
| Spec ohne Stories | Spec hat keine Story-Dateien | Spec-Card zeigt 0/0 Progress |
| Viele Projekte | 10+ Projekte mit jeweils 5+ Specs | Scrollbare Liste, Performance bleibt gut |

#### Fehlerfälle

| Fehlerfall | Auslöser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| Specs-Loading fehlgeschlagen | Backend nicht erreichbar | Fehlermeldung in der Specs-Section |

---

### Szenario 8: GSQ-008 - Execution Log Tab

**Beschreibung:** Echtzeit-Log der Queue-Ausführung mit Auto-Scroll und Farbcodierung.

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Log-Tab öffnen | Bisherige Log-Einträge werden angezeigt |
| 2 | Queue starten | Neue Einträge erscheinen in Echtzeit |
| 3 | Auto-Scroll prüfen | Log scrollt automatisch nach unten bei neuen Einträgen |
| 4 | Farbcodierung prüfen | Start=blau, Complete=grün, Error=rot, Queue-Complete=gold |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Manuell hochscrollen | User scrollt im Log nach oben | Auto-Scroll wird deaktiviert (Scroll-Lock) |
| Zurück nach unten scrollen | User scrollt ganz nach unten | Auto-Scroll wird re-aktiviert |
| Leeres Log | Log-Tab bei leerer Queue öffnen | Leere Anzeige oder Platzhalter-Text |

#### Fehlerfälle

| Fehlerfall | Auslöser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| Log-Streaming unterbrochen | WebSocket-Trennung | Einträge gehen verloren, Reconnect lädt State |

---

### Szenario 9: GSQ-009 - Dashboard Queue-Sidebar entfernen

**Beschreibung:** Alte Queue-Sidebar wurde entfernt, Dashboard nutzt volle Breite.

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Dashboard öffnen | Keine Queue-Sidebar mehr sichtbar |
| 2 | Layout prüfen | Spec-/Kanban-Ansicht nutzt die volle Breite |
| 3 | Spec-Card draggen | Cards sind weiterhin draggable (für Drop in Bottom Panel) |
| 4 | Code prüfen | Keine toten Referenzen zur alten aos-queue-sidebar |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Alte Bookmarks | URL mit Queue-Parameter aufrufen | Dashboard zeigt normales Layout |
| Window Resize | Browser-Fenster verkleinern/vergrößern | Dashboard füllt verfügbare Breite |

#### Fehlerfälle

| Fehlerfall | Auslöser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| Referenz auf gelöschte Komponente | Alter Code importiert aos-queue-sidebar | Build-Fehler (sollte nicht vorkommen) |

---

## Regressions-Checkliste

Bestehende Funktionalität, die nach der Implementierung noch funktionieren muss:

- [ ] Dashboard Spec-Cards - Anzeige und Interaktion funktioniert
- [ ] Sidebar Navigation - Alle bestehenden Links funktionieren
- [ ] Cloud Terminal - Öffnen und Schließen funktioniert weiterhin
- [ ] Projekt-Wechsel - Routing zwischen Projekten funktioniert
- [ ] WebSocket-Verbindung - Reconnect nach Unterbrechung
- [ ] Chat-View - Nachrichten senden und empfangen
- [ ] Kanban-Board - Anzeige und Story-Status-Updates
- [ ] TypeScript Kompilierung - `npx tsc --noEmit` ohne neue Fehler
- [ ] Build - `npm run build` erfolgreich

---

## Automatisierungs-Hinweise

Falls diese Szenarien automatisiert werden sollen:

### Selektoren / Identifikatoren
```
Bottom Panel: aos-global-queue-panel
Queue Section: aos-queue-section
Specs Section: aos-specs-section
Execution Log: aos-execution-log-tab
Sidebar Queue Icon: nav-item[data-view="queue"]
Spec Cards: .spec-card[draggable="true"]
Queue Items: .queue-item
```

### API-Endpunkte (WebSocket Messages)
| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `queue.state` | WS Request | Aktuellen Queue-State abfragen |
| `queue.add` | WS Message | Spec zur Queue hinzufügen |
| `queue.remove` | WS Message | Spec aus Queue entfernen |
| `queue.reorder` | WS Message | Queue-Reihenfolge ändern |
| `queue.start` | WS Message | Queue-Ausführung starten |
| `queue.stop` | WS Message | Queue-Ausführung stoppen |
| `specs.list-all` | WS Request | Alle Specs aus allen Projekten laden |
| `queue.log.state` | WS Request | Alle Log-Einträge abrufen |
| `queue.log.entry` | WS Broadcast | Neuer Log-Eintrag (Echtzeit) |

### Mock-Daten
```json
{
  "queueItem": {
    "specId": "2026-02-13-example-spec",
    "specName": "Example Spec",
    "projectPath": "/path/to/project",
    "projectName": "example-project",
    "gitStrategy": "branch",
    "gitBranch": "feature/example",
    "status": "pending"
  },
  "logEntry": {
    "id": "log-001",
    "timestamp": "2026-02-13T20:00:00Z",
    "type": "spec-start",
    "projectPath": "/path/to/project",
    "projectName": "example-project",
    "specId": "2026-02-13-example-spec",
    "specName": "Example Spec",
    "message": "Starting spec execution"
  }
}
```

---

## Notizen

- Das Bottom Panel nutzt Light DOM (`createRenderRoot() { return this; }`) - CSS-Selektoren in Tests funktionieren direkt
- Drag & Drop Tests benötigen `dataTransfer`-Simulation mit korrekten MIME-Types
- WebSocket-Messages verwenden das Format `type: 'message.subtype'`
- localStorage Keys: `global-queue-panel-height`, `global-queue-panel-tab`
- Keyboard Shortcut: `Cmd/Ctrl+Shift+Q` für Panel-Toggle
