# Test-Szenarien: Unified Kanban Board

> Generiert am 2026-02-13 nach Abschluss der Implementierung
> Spec: agent-os/specs/2026-02-13-unified-kanban-board/

## Zweck

Dieses Dokument beschreibt Test-Szenarien zum manuellen Testen der Unified Kanban Board Implementierung. Es deckt alle 6 Implementierungs-Stories und deren Integration ab.

---

## Voraussetzungen

### Systemvoraussetzungen
- [ ] Anwendung läuft lokal (npm run dev)
- [ ] Backend-Server läuft
- [ ] Mindestens ein Spec mit Stories vorhanden
- [ ] Backlog mit Items in backlog/backlog-index.json

### Test-Accounts / Daten
| Typ | Wert | Beschreibung |
|-----|------|--------------|
| Backlog Items | 3+ Items in backlog-index.json | Verschiedene Status (ready, in_progress) |
| Spec Stories | 1+ Spec mit Stories | Zum Testen des Spec-Mode |

---

## Test-Szenarien

### Szenario 1: UKB-001 - StoryInfo Interface vereinheitlichen

**Beschreibung:** Prüft dass Backlog-Items und Spec-Stories das gleiche Interface nutzen und in aos-story-card gerendert werden.

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Dashboard öffnen | Dashboard wird angezeigt |
| 2 | Backlog Tab anklicken | Backlog Kanban Board mit aos-story-card Komponenten wird angezeigt |
| 3 | Eine Backlog-Story-Card inspizieren | Card zeigt ID, Titel, Typ-Icon, Priority-Badge |
| 4 | Status "in_review" prüfen | Gelbes Status-Badge mit "In Review" Text |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Unbekannter Status | Story mit unbekanntem Status-Wert | Neutrales Status-Badge statt Fehler |
| Leere Dependencies | Backlog-Item mit leerem Array | Wird korrekt angezeigt, Dependencies-Sektion bleibt leer |

#### Fehlerfälle

| Fehlerfall | Auslöser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| Kein Backlog vorhanden | Keine backlog-index.json | Leeres Board oder informative Meldung |

---

### Szenario 2: UKB-002 - Kanban Board Properties und Conditional Rendering

**Beschreibung:** Prüft dass das Kanban Board mode-abhängig Features ein-/ausblendet.

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Backlog Tab öffnen | Board zeigt "Backlog" als Titel |
| 2 | Spec-Kanban öffnen | Board zeigt Spec-Namen als Titel |
| 3 | Spec-Mode Features prüfen | Spec Chat Button und Spec Docs Button sichtbar |
| 4 | Backlog-Mode Features prüfen | Keine Spec-spezifischen Buttons sichtbar |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Mode nicht gesetzt | mode Property fehlt | Fallback auf "spec" Mode |
| showChat=false | Feature Flag deaktiviert | Spec Chat Button wird nicht angezeigt |

---

### Szenario 3: UKB-003 - Backend Backlog-Datenmodell erweitern

**Beschreibung:** Prüft dass das Backend alle benötigten Felder für StoryInfo liefert.

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Backend API /api/backlog/kanban aufrufen | Response enthält dorComplete und dependencies Felder |
| 2 | Status-Update auf "in_review" senden | Backend akzeptiert den Status |
| 3 | Status in backlog-index.json prüfen | Neuer Status ist gespeichert |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Blocked Status | Item auf "blocked" setzen | Status wird akzeptiert und gespeichert |
| Leere Dependencies | Neues Item ohne Dependencies | Leeres Array [] wird zurückgegeben |

---

### Szenario 4: UKB-004 - Dashboard Backlog-Rendering durch aos-kanban-board ersetzen

**Beschreibung:** Prüft dass das Backlog das generische Kanban Board nutzt.

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Backlog Tab öffnen | 5-Spalten Kanban Board wird angezeigt |
| 2 | Spalten prüfen | Spalten heißen "Backlog", "Blocked", "In Progress", "In Review", "Done" |
| 3 | Story Cards prüfen | Cards nutzen aos-story-card Komponente |
| 4 | Drag & Drop testen | Cards können zwischen Spalten verschoben werden |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Sehr viele Items | 20+ Backlog-Items | Board bleibt performant, Scrollbar erscheint |
| Leere Spalten | Alle Items in Done | Andere Spalten zeigen "Keine Stories" Nachricht |

---

### Szenario 5: UKB-005 - Event-Routing und Auto-Mode Integration

**Beschreibung:** Prüft dass Backlog-Events korrekt geroutet werden und Auto-Mode funktioniert.

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Backlog Item zu "In Progress" ziehen | backlog.story.start Event wird gesendet |
| 2 | Spec Story zu "In Progress" ziehen | workflow.story.start Event wird gesendet |
| 3 | Auto-Mode aktivieren | Toggle zeigt aktiven Status |
| 4 | Story abschließen mit Auto-Mode | Nächstes verfügbares Item wird automatisch gestartet |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Kein verfügbares Item | Alle Items blocked/in_progress | Auto-Mode wartet, nichts passiert |
| Auto-Mode während Item läuft | Toggle deaktivieren | Laufendes Item wird fertig ausgeführt |

---

### Szenario 6: UKB-006 - CSS Cleanup

**Beschreibung:** Prüft dass obsolete Backlog-CSS-Styles entfernt wurden.

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | theme.css prüfen | Keine .backlog-backlog, .backlog-in_progress Column-Styles |
| 2 | Backlog Board visuell prüfen | Konsistentes Design mit Spec-Kanban |
| 3 | Spec-Kanban visuell prüfen | Unverändertes Aussehen |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Shared Styles | CSS-Klassen von beiden Kontexten genutzt | Werden beibehalten |

---

## Regressions-Checkliste

Bestehende Funktionalität, die nach der Implementierung noch funktionieren muss:

- [ ] Spec-Kanban Board lädt und zeigt alle Stories - Spec Tab öffnen und prüfen
- [ ] Drag & Drop für Spec-Stories funktioniert - Story zwischen Spalten ziehen
- [ ] Story-Execution via Workflow funktioniert - "Start" Button klicken
- [ ] WebSocket Updates werden empfangen - Status-Änderungen werden live angezeigt
- [ ] Spec Chat Button funktioniert - Chat-Panel öffnet sich
- [ ] Spec Docs Button funktioniert - Docs-Panel öffnet sich
- [ ] Profile Switching funktioniert - Profile in Sidebar wechseln
- [ ] Projects View funktioniert - Projects Tab öffnen

---

## Automatisierungs-Hinweise

Falls diese Szenarien automatisiert werden sollen:

### Selektoren / Identifikatoren
```
Kanban Board: aos-kanban-board
Story Card: aos-story-card
Status Badge: .status-badge
Spec Chat Button: [data-testid="spec-chat-btn"]
Spec Docs Button: [data-testid="spec-docs-btn"]
Auto-Mode Toggle: [data-testid="auto-mode-toggle"]
```

### API-Endpunkte
| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| /api/backlog/kanban | GET | Backlog Kanban Daten laden |
| /api/backlog/:id/status | PUT | Backlog Item Status updaten |
| /api/specs/:specId/kanban | GET | Spec Kanban Daten laden |
| /api/specs/:specId/stories/:storyId/status | PUT | Spec Story Status updaten |

### Mock-Daten
```json
{
  "backlogItem": {
    "id": "TEST-001",
    "title": "Test Backlog Item",
    "type": "feature",
    "priority": "high",
    "status": "ready",
    "dorComplete": true,
    "dependencies": []
  },
  "specStory": {
    "id": "SPEC-001",
    "title": "Test Spec Story",
    "type": "frontend",
    "priority": "high",
    "status": "ready",
    "dorComplete": true,
    "dependencies": []
  }
}
```

---

## Notizen

- Diese Implementierung konsolidiert das Kanban-Rendering für Spec und Backlog
- Das generische aos-kanban-board nutzt ein mode-Property für kontextabhängiges Verhalten
- Backlog-spezifische Events (backlog.story.start) werden vom Board automatisch gesendet
- Die Auto-Mode Integration ermöglicht automatisches Batch-Processing von Backlog-Items
