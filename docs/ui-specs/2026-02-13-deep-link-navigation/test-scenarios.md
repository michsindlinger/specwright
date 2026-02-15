# Test-Szenarien: Deep Link Navigation

> Generiert am 2026-02-13 nach Abschluss der Implementierung
> Spec: agent-os/specs/2026-02-13-deep-link-navigation

## Zweck

Dieses Dokument beschreibt Test-Szenarien zum manuellen Testen oder zur Weitergabe an eine KI für automatisierte E2E-Tests.

---

## Voraussetzungen

### Systemvoraussetzungen
- [ ] Anwendung läuft lokal (`npm run dev` im `agent-os-ui/ui` Ordner)
- [ ] Backend-Server läuft (Express Server)
- [ ] Mindestens ein Projekt mit Specs ist vorhanden

### Test-Accounts / Daten
| Typ | Wert | Beschreibung |
|-----|------|--------------|
| Projekt | Beliebiges Projekt mit Specs | Zum Testen der Dashboard Deep Links |
| Spec-ID | z.B. `2026-02-10-my-feature` | Eine existierende Spec im Projekt |

---

## Test-Szenarien

### Szenario 1: DLN-001 - Router Service Foundation

**Beschreibung:** Zentraler Router-Service parst Hash-Segment-URLs und verwaltet Navigation

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | URL `#/dashboard` im Browser aufrufen | Dashboard-Ansicht wird angezeigt, Sidebar markiert "Dashboard" als aktiv |
| 2 | URL `#/dashboard/spec/2026-02-10-my-feature/kanban` aufrufen | Dashboard-Ansicht geladen, Spec erkannt, Tab "kanban" aktiv |
| 3 | Programmatische Navigation zu Settings auslösen (z.B. Sidebar-Klick) | URL ändert sich zu `#/settings`, Settings-Ansicht wird angezeigt |
| 4 | Von Dashboard zu Settings navigieren, dann Browser-Zurück drücken | Dashboard-Ansicht wird wieder angezeigt, URL zeigt `#/dashboard` |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Leerer Hash | Anwendung wird ohne Hash in der URL gestartet | Automatische Navigation zu `#/dashboard` |
| Leere Segmente | URL enthält `#/dashboard///` | Leere Segmente werden ignoriert, Dashboard-Übersicht wird angezeigt |

#### Fehlerfälle

| Fehlerfall | Auslöser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| Unbekannte View | URL `#/komplett/ungueltig/pfad` aufrufen | "Not Found"-Ansicht wird angezeigt |

---

### Szenario 2: DLN-002 - Dashboard Deep Links

**Beschreibung:** Spec-Auswahl und Tab-Wechsel werden in URL abgebildet und nach Reload wiederhergestellt

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Auf Dashboard-Übersicht eine Spec auswählen | URL ändert sich zu `#/dashboard/spec/{spec-id}`, Kanban-Ansicht der Spec wird angezeigt |
| 2 | Zum "stories"-Tab wechseln | URL ändert sich zu `#/dashboard/spec/{spec-id}/stories` |
| 3 | Seite neu laden mit URL `#/dashboard/spec/{spec-id}/kanban` | Spec wird angezeigt, Kanban-Tab ist aktiv |
| 4 | Zur Spec-Liste zurück navigieren | URL ändert sich zu `#/dashboard`, Dashboard-Übersicht mit allen Specs |
| 5 | Deep Link `#/dashboard/spec/{spec-id}/stories` in neuem Tab öffnen | Spec wird direkt angezeigt, Stories-Tab ist aktiv |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Browser-Zurück | Von Spec-Detail den Zurück-Button drücken | Rückkehr zur Dashboard-Übersicht, URL zeigt `#/dashboard` |
| Ungültiger Tab | URL `#/dashboard/spec/{spec-id}/ungueltig` | Spec wird angezeigt, Standard-Tab wird geladen, URL wird korrigiert |

#### Fehlerfälle

| Fehlerfall | Auslöser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| Nicht-existierende Spec | URL `#/dashboard/spec/nicht-existierende-spec` | Toast "Spec nicht gefunden", Fallback auf Dashboard-Übersicht, URL wird zu `#/dashboard` korrigiert |
| Projekt-Kontext-Mismatch | Spec gehört zu anderem Projekt | Toast "Spec nicht gefunden", Dashboard-Übersicht wird angezeigt |

---

### Szenario 3: DLN-003 - Chat Deep Links

**Beschreibung:** Chat-View URL bleibt stabil nach Reload

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Zur Chat-Ansicht navigieren | URL zeigt `#/chat` |
| 2 | Seite neu laden | Chat-Ansicht wird wieder angezeigt, URL zeigt `#/chat` |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Session-Konzept (Zukunft) | URL `#/chat/{session-id}` aufrufen | Session-ID wird für zukünftige Nutzung vorbereitet |

#### Fehlerfälle

| Fehlerfall | Auslöser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| Ungültige Session-ID | URL `#/chat/nicht-existierende-session` | Chat-Übersicht wird angezeigt, Hinweis dass Session nicht gefunden |

---

### Szenario 4: DLN-004 - Workflow Deep Links

**Beschreibung:** Ausgewählter Workflow wird in URL abgebildet und nach Reload wiederhergestellt

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Auf Workflow-Übersicht einen laufenden Workflow auswählen | URL ändert sich zu `#/workflows/{exec-id}`, Workflow-Details werden angezeigt |
| 2 | Seite neu laden auf Workflow-Ansicht | URL zeigt `#/workflows`, Workflow-Ansicht wird angezeigt |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Ephemere Executions | Workflow-Execution beendet, URL enthält noch ID | Graceful Fallback auf Workflow-Übersicht |

#### Fehlerfälle

| Fehlerfall | Auslöser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| Stale Workflow-ID | URL `#/workflows/abgelaufene-id` | Toast "Workflow nicht gefunden", Fallback auf Workflow-Übersicht, URL wird zu `#/workflows` korrigiert |

---

### Szenario 5: DLN-005 - Settings Deep Links

**Beschreibung:** Aktiver Settings-Tab wird in URL abgebildet und nach Reload wiederhergestellt

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | In Settings zum Tab "General" wechseln | URL ändert sich zu `#/settings/general` |
| 2 | Seite neu laden mit URL `#/settings/general` | Settings-Ansicht, Tab "General" ist aktiv |
| 3 | URL `#/settings` ohne Tab-Segment aufrufen | Standard-Tab (Models) wird angezeigt |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Ungültiger Tab-Name | URL `#/settings/nicht-existierender-tab` | Standard-Tab wird angezeigt, URL wird zu `#/settings` korrigiert (Silent Correction) |

#### Fehlerfälle

| Fehlerfall | Auslöser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| - | Keine Fehlerfälle (Silent Correction) | - |

---

### Szenario 6: DLN-006 - Edge Case Handling & Error Feedback

**Beschreibung:** Ungültige Deep Links werden graceful behandelt mit klarem Feedback

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | URL manuell zu `#/settings/general` ändern (von beliebiger Ansicht) | App navigiert zur Settings-Ansicht, Tab "General" ist aktiv |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Leere Hash-Segmente | URL `#/dashboard///` aufrufen | Dashboard-Übersicht wird angezeigt, leere Segmente ignoriert |
| Manuelle URL-Änderung | URL von `#/dashboard/spec/...` zu `#/settings/general` ändern | Korrekte Navigation ohne Fehler |

#### Fehlerfälle

| Fehlerfall | Auslöser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| Nicht-existierende Spec | `#/dashboard/spec/nicht-existierende-spec` | Toast "Spec nicht gefunden", URL-Korrektur zu `#/dashboard` |
| Ungültiger Tab (Dashboard) | `#/dashboard/spec/{id}/ungueltig` | Standard-Tab wird geladen, URL wird korrigiert |
| Komplett ungültiger Pfad | `#/komplett/ungueltig/pfad` | "Not Found"-Ansicht wird angezeigt |

---

## Regressions-Checkliste

Bestehende Funktionalität, die nach der Implementierung noch funktionieren muss:

- [ ] Sidebar-Navigation funktioniert weiterhin (Dashboard, Chat, Workflows, Settings)
- [ ] WebSocket-Verbindung zum Backend bleibt stabil nach URL-Changes
- [ ] Spec-Kanban laden und anzeigen funktioniert
- [ ] Chat-Messages senden und empfangen funktioniert
- [ ] Workflow starten und monitoring funktioniert
- [ ] Settings ändern und speichern funktioniert
- [ ] Browser Back/Forward zwischen Views navigiert korrekt

---

## Automatisierungs-Hinweise

Falls diese Szenarien automatisiert werden sollen:

### Selektoren / Identifikatoren
```
Dashboard-View: aos-dashboard-view
Chat-View: aos-chat-view
Workflow-View: aos-workflow-view
Settings-View: aos-settings-view
Sidebar: aos-sidebar
Toast-Messages: Custom Event 'show-toast'
```

### API-Endpunkte
| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| WebSocket `specs.kanban` | WS | Lädt Kanban-Daten einer Spec |
| WebSocket `specs.list` | WS | Lädt Spec-Liste des Projekts |

### Mock-Daten
```json
{
  "spec": {
    "id": "2026-02-10-test-feature",
    "name": "Test Feature"
  },
  "tabs": ["kanban", "stories", "docs", "backlog"],
  "settingsTabs": ["models", "general", "appearance"]
}
```

---

## Notizen

- Die Chat-View hat aktuell kein Session-Management, daher ist nur `#/chat` als Basis-Route unterstützt
- Workflow-Executions sind ephemer - Stale IDs nach Reload sind erwartetes Verhalten
- Settings verwendet Silent Correction (kein Toast) bei ungültigen Tab-Namen
- Dashboard zeigt Toast-Feedback bei nicht-gefundenen Specs
