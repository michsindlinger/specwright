# Test-Szenarien: Copy File Path

> Generiert am 2026-02-13 nach Abschluss der Implementierung
> Spec: agent-os/specs/2026-02-13-copy-file-path

## Zweck

Dieses Dokument beschreibt Test-Szenarien zum manuellen Testen oder zur Weitergabe an eine KI fuer automatisierte E2E-Tests.

---

## Voraussetzungen

### Systemvoraussetzungen
- [ ] Anwendung laeuft lokal (`npm run dev` im `agent-os-ui` Verzeichnis)
- [ ] Mindestens eine Spec mit kanban.json vorhanden (z.B. `2026-02-13-copy-file-path`)
- [ ] Browser mit Clipboard API Unterstuetzung (Chrome, Firefox, Safari)

### Test-Accounts / Daten
| Typ | Wert | Beschreibung |
|-----|------|--------------|
| Spec | 2026-02-13-copy-file-path | Spec mit Stories und kanban.json |
| Story | CFP-001 | Story mit `file`-Feld in kanban.json |

---

## Test-Szenarien

### Szenario 1: CFP-001 - Copy-Path Utility & Backend StoryInfo Erweiterung

**Beschreibung:** Backend uebertraegt das `file`-Feld korrekt an das Frontend und die Utility-Funktionen arbeiten korrekt.

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Anwendung starten und eine Spec mit Kanban oeffnen | Kanban-Board wird angezeigt |
| 2 | Story-Karten inspizieren (Browser DevTools) | Jede Story-Karte hat ein `file`-Attribut mit relativem Pfad (z.B. `stories/story-001-utility-and-backend.md`) |
| 3 | `buildSpecFilePath('2026-02-13-copy-file-path', 'stories/story-001.md')` in Konsole aufrufen | Gibt `agent-os/specs/2026-02-13-copy-file-path/stories/story-001.md` zurueck |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Leerer relativePath | `buildSpecFilePath('spec-id', '')` | Gibt `agent-os/specs/spec-id/` zurueck |
| Kanban v1 Format | Story hat `file` statt `storyFile` Feld | Wird korrekt gemappt |
| Kanban v2 Format | Story hat `storyFile` Feld | Wird bevorzugt verwendet |

#### Fehlerfaelle

| Fehlerfall | Ausloeser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| Clipboard nicht verfuegbar | HTTP statt HTTPS (kein Secure Context) | Clipboard API nicht verfuegbar, kein Fehler in UI |

---

### Szenario 2: CFP-002 - Copy-Button auf Story-Karten

**Beschreibung:** Copy-Icon auf Story-Karten erscheint beim Hover und kopiert den Dateipfad.

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Mit der Maus ueber eine Story-Karte hovern | Clipboard-Icon wird im Story-Header sichtbar |
| 2 | Auf das Clipboard-Icon klicken | Pfad wird in Zwischenablage kopiert (z.B. `agent-os/specs/2026-02-13-copy-file-path/stories/story-001-utility-and-backend.md`) |
| 3 | Icon-Feedback beobachten | Icon wechselt zu Checkmark |
| 4 | 2 Sekunden warten | Icon wechselt zurueck zum Clipboard-Icon |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Story ohne file-Feld | Backlog-Story oder alte Story ohne file | Kein Copy-Icon wird angezeigt |
| Schnelles Doppelklicken | Zweimal schnell auf Copy klicken | Kein Fehler, Timer wird zurueckgesetzt |
| Story-Karte klicken | Neben das Copy-Icon auf die Karte klicken | Story wird normal selektiert (story-select Event) |

#### Fehlerfaelle

| Fehlerfall | Ausloeser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| Event-Propagation | Klick auf Copy-Icon | Darf NICHT die Story selektieren (kein story-select Event) |

---

### Szenario 3: CFP-003 - Copy-Button im Spec-Viewer-Header

**Beschreibung:** Copy-Icon im Spec-Viewer-Header kopiert den Pfad der aktuell angezeigten Datei.

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Eine Datei im Spec-Viewer oeffnen (z.B. spec.md) | Spec-Viewer-Header zeigt Dateinamen und Clipboard-Icon |
| 2 | Auf das Clipboard-Icon im Header klicken | Pfad wird kopiert (z.B. `agent-os/specs/2026-02-13-copy-file-path/spec.md`) |
| 3 | Icon-Feedback beobachten | Icon wechselt zu Checkmark |
| 4 | 2 Sekunden warten | Icon wechselt zurueck zum Clipboard-Icon |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Kein relativePath | Viewer ohne gesetzten Pfad | Kein Copy-Icon wird angezeigt |
| Verschiedene Dateitypen | spec.md, spec-lite.md, story-001.md | Jeweils korrekter Pfad wird kopiert |

#### Fehlerfaelle

| Fehlerfall | Ausloeser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| Keine Fehlerfaelle bekannt | - | - |

---

### Szenario 4: CFP-004 - Copy-Button auf Spec-Doc-Tabs

**Beschreibung:** Copy-Icon auf jedem Spec-Doc-Tab kopiert den Pfad des jeweiligen Dokuments.

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Spec mit mehreren Dokumenten oeffnen | Tabs werden angezeigt (spec.md, spec-lite.md, etc.) |
| 2 | Mit der Maus ueber einen Tab hovern | Clipboard-Icon wird rechts neben dem Dateinamen sichtbar |
| 3 | Auf das Clipboard-Icon klicken | Pfad wird kopiert (z.B. `agent-os/specs/2026-02-13-copy-file-path/spec.md`) |
| 4 | Icon-Feedback beobachten | Icon wechselt zu Checkmark |
| 5 | 2 Sekunden warten | Icon wechselt zurueck |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Tab-Klick neben Icon | Neben das Copy-Icon auf den Tab klicken | Datei wird gewechselt (file-selected Event) |
| Mehrere Tabs kopieren | Schnell verschiedene Tabs kopieren | Jeder Tab kopiert seinen eigenen Pfad, Feedback jeweils korrekt |

#### Fehlerfaelle

| Fehlerfall | Ausloeser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| Event-Propagation | Klick auf Copy-Icon im Tab | Darf NICHT die Datei wechseln (kein file-selected Event) |

---

## Regressions-Checkliste

Bestehende Funktionalitaet, die nach der Implementierung noch funktionieren muss:

- [ ] Kanban-Board Story-Karten - Klick auf Karte oeffnet Story-Details
- [ ] Spec-Viewer - Dateien werden korrekt angezeigt und gewechselt
- [ ] Spec-Doc-Tabs - Tab-Klick wechselt die angezeigte Datei
- [ ] Story-Karten Drag & Drop (falls vorhanden) - Funktioniert weiterhin
- [ ] TypeScript kompiliert ohne neue Fehler (`cd agent-os-ui/ui && npx tsc --noEmit`)

---

## Automatisierungs-Hinweise

Falls diese Szenarien automatisiert werden sollen:

### Selektoren / Identifikatoren
```
Story-Card Copy-Button: .copy-path-btn (innerhalb aos-story-card)
Spec-Viewer Copy-Button: .copy-spec-viewer-path (innerhalb kanban-board)
Tab Copy-Button: .copy-tab-path (innerhalb aos-spec-file-tabs)
```

### API-Endpunkte
| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| /api/specs/:specId | GET | Laedt Spec mit Stories und file-Feldern |

### Mock-Daten
```json
{
  "story": {
    "id": "CFP-001",
    "title": "Test Story",
    "file": "stories/story-001.md",
    "status": "done"
  }
}
```

---

## Notizen

- Alle Copy-Buttons nutzen die Clipboard API (`navigator.clipboard.writeText`)
- Visuelles Feedback erfolgt ueber CSS-Klassen und Icon-Wechsel (Clipboard -> Checkmark)
- Feedback-Timer betraegt 2 Sekunden
- Copy-Buttons verhindern Event-Propagation via `e.stopPropagation()`
