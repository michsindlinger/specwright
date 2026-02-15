# Test-Szenarien: Context Menu

> Generiert am 2026-02-03 nach Abschluss der Implementierung
> Spec: agent-os/specs/2026-02-03-context-menu

## Zweck

Dieses Dokument beschreibt Test-Szenarien zum manuellen Testen oder zur Weitergabe an eine KI für automatisierte E2E-Tests.

---

## Voraussetzungen

### Systemvoraussetzungen
- [ ] Anwendung läuft lokal (`npm run dev` in agent-os-ui)
- [ ] Agent OS Backend ist verbunden
- [ ] Mindestens ein Projekt ist verfügbar
- [ ] Specs existieren für "Add Story" Flow

### Test-Accounts / Daten
| Typ | Wert | Beschreibung |
|-----|------|--------------|
| Project | Beliebiges verfügbares Projekt | Für Context Menu Test |
| Specs | Mindestens 1 vorhandene Spec | Für Add Story Flow Test |

---

## Test-Szenarien

### Szenario 1: CTX-001 - Context Menu Component

**Beschreibung:** Testet die Basisfunktionalität des Context Menu Components

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Anwendung starten: `cd agent-os-ui && npm run dev` | Anwendung läuft auf localhost |
| 2 | Projekt auswählen | Dashboard ist sichtbar |
| 3 | Rechtsklick irgendwo im UI | Context Menu erscheint an Mausposition |
| 4 | Menüpunkte betrachten | 4 Einträge sind sichtbar: "Neue Spec erstellen", "Bug erstellen", "TODO erstellen", "Story zu Spec hinzufügen" |
| 5 | Außenhalb des Menus klicken | Context Menu schließt sich |
| 6 | Wieder rechtsklicken und ESC drücken | Context Menu schließt sich |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Viewport Boundary | Rechtsklick am rechten Rand des Fensters | Menu bleibt vollständig im sichtbaren Bereich |
| Viewport Boundary | Rechtsklick am unteren Rand des Fensters | Menu wird nach oben verschoben |
| Doppelklick | Zweimal rechtsklicken | Kein zweites Menu erscheint |

#### Fehlerfälle

| Fehlerfall | Auslöser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| - | Keine Fehlerfälle für diese Story | - |

---

### Szenario 2: CTX-002 - Global Event Handler

**Beschreibung:** Testet die Integration des Context Menu in die globale App

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Auf verschiedenen UI-Seiten sein (Dashboard, Teams, Settings) | Context Menu erscheint überall |
| 2 | Rechtsklick bei x=200, y=300 | Menu erscheint genau an dieser Position |
| 3 | "Neue Spec erstellen" auswählen | Context Menu schließt, create-spec Modal öffnet |
| 4 | Modal schließen, Rechtsklick | Context Menu erscheint wieder |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Modal offen | Workflow-Modal ist geöffnet, Rechtsklick | KEIN neues Context Menu erscheint |
| Overlay offen | Confirm Dialog ist sichtbar, Rechtsklick | KEIN Context Menu erscheint |

#### Fehlerfälle

| Fehlerfall | Auslöser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| - | Keine Fehlerfälle für diese Story | - |

---

### Szenario 3: CTX-003 - Generic Workflow Modal

**Beschreibung:** Testet das Workflow Modal mit allen Workflow-Typen

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Rechtsklick → "Bug erstellen" | Modal öffnet mit add-bug Workflow-Karte |
| 2 | Text eingeben: "Fix login issue" | Text erscheint im Argument-Feld |
| 3 | Start-Button klicken | Modal schließt, Workflow wird gestartet |
| 4 | Rechtsklick → "TODO erstellen" | Modal öffnet mit add-todo Workflow-Karte |
| 5 | ESC drücken (ohne Eingabe) | Modal schließt sofort |
| 6 | Rechtsklick → "Neue Spec erstellen" | Modal öffnet mit create-spec Workflow-Karte |
| 7 | Text eingeben, dann ESC drücken | Confirm Dialog erscheint |
| 8 | "Abbrechen" klicken | Dialog schließt, Modal bleibt offen mit Text |
| 9 | Noch ESC drücken, "Verwerfen" klicken | Dialog und Modal schließen |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Dirty State | Eingaben gemacht, außerhalb klicken | Confirm Dialog erscheint |
| Dirty State Cancel | Im Confirm Dialog "Abbrechen" klicken | Dialog schließt, Modal bleibt offen, Eingaben erhalten |
| Focus Trap | Modal ist offen, Tab drücken | Fokus bleibt im Modal |

#### Fehlerfälle

| Fehlerfall | Auslöser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| - | Keine Fehlerfälle für diese Story | - |

---

### Szenario 4: CTX-004 - Spec Selector Component

**Beschreibung:** Testet die Spec-Auswahl für Add Story Flow

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Rechtsklick → "Story zu Spec hinzufügen" | Spec-Liste wird angezeigt |
| 2 | Liste betrachten | Alle verfügbaren Specs sind sichtbar |
| 3 | "menu" in Suchfeld eingeben | Liste zeigt nur "Context Menu" Spec |
| 4 | Suchfeld leeren | Alle Specs sind wieder sichtbar |
| 5 | Auf eine Spec klicken | Spec wird ausgewählt, add-story Workflow öffnet sich |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Keine Specs | Keine Specs im System | "Keine Specs vorhanden" mit Hinweis "Erstelle zuerst eine Spec" |
| Keine Suchergebnisse | "xyz123" in Suchfeld eingeben | "Keine Specs gefunden" Nachricht |
| Loading State | Specs werden vom Server geladen | Loading-Indikator (Spinner) ist sichtbar |
| Enter-Taste | Im Suchfeld Enter drücken | Erstes Ergebnis wird ausgewählt |

#### Fehlerfälle

| Fehlerfall | Auslöser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| - | Keine Fehlerfälle für diese Story | - |

---

### Szenario 5: CTX-005 - Add Story Flow Integration

**Beschreibung:** Testet den vollständigen Zwei-Schritt-Flow für Add Story

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Rechtsklick → "Story zu Spec hinzufügen" | Schritt 1: Spec-Selector ist sichtbar |
| 2 | Spec "Context Menu" auswählen | Schritt 2: add-story Workflow-Karte erscheint |
| 3 | Workflow-Card prüfen | Spec ist bereits als Argument ausgefüllt |
| 4 | Text eingeben: "Add export feature" | Text erscheint im Eingabefeld |
| 5 | "Zurück" klicken (ohne Eingaben zurück) | Zurück zu Schritt 1: Spec-Selector |
| 6 | Andere Spec auswählen | Schritt 2 mit neuer Spec erscheint |
| 7 | Text eingeben, dann "Zurück" klicken | Confirm Dialog erscheint |
| 8 | "Verwerfen" klicken | Zurück zu Schritt 1 |
| 9 | Spec auswählen, Text eingeben, Start klicken | Modal schließt, add-story Workflow wird mit Spec gestartet |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Zurück mit Dirty State | Eingaben gemacht, "Zurück" klicken | Confirm Dialog: "Änderungen verwerfen?" |
| Confirm Cancel | Im Confirm Dialog "Abbrechen" klicken | Modal bleibt auf Workflow-Karte mit Eingaben |
| Confirm Discard | Im Confirm Dialog "Verwerfen" klicken | Zurück zum Spec-Selector |
| Direct vs Add-Story Mode | Andere Context Menu Actions nutzen | Direct Mode: Workflow-Card erscheint sofort ohne Spec-Selector |

#### Fehlerfälle

| Fehlerfall | Auslöser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| - | Keine Fehlerfälle für diese Story | - |

---

### Szenario 6: CTX-006 - Integration & Styling

**Beschreibung:** Testet das visuelle Erscheinungsbild und Integration aller Komponenten

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Context Menu öffnen | Dunkles Theme, konsistente Farben mit Rest der App |
| 2 | Menu Items mit Maus überfahren | Hover-Hintergrundfarbe ist sichtbar |
| 3 | Workflow Modal öffnen | Modal hat korrekten z-Index (über Context Menu) |
| 4 | Confirm Dialog auslösen | Dialog hat korrekten z-Index (über Workflow Modal) |
| 5 | Alle 4 Context Menu Actions testen | Jede öffnet das korrekte Modal |
| 6 | Add Story Flow durchlaufen | Alle Komponenten sind visuell konsistent |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| z-Index Hierarchy | Context Menu → Modal → Dialog öffnen | Jede Ebene hat höheren z-Index als vorherige |
| Theme Consistency | Alle Komponenten prüfen | Alle nutzen CSS Custom Properties aus theme.css |
| Responsive | Fenstergröße ändern | Components passen sich an |

#### Fehlerfälle

| Fehlerfall | Auslöser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| - | Keine Fehlerfälle für diese Story | - |

---

## Regressions-Checkliste

Bestehende Funktionalität, die nach der Implementierung noch funktionieren muss:

- [ ] **Dashboard View** - Projekt-Übersicht wird korrekt angezeigt
- [ ] **Workflow Cards** - Klicken auf Workflow Cards öffnet noch immer Workflow
- [ ] **Create Spec Modal** - Direkter "Neue Spec" Button funktioniert noch
- [ ] **Navigation** - Zwischen Dashboard, Teams, Settings wechseln funktioniert
- [ ] **Theme** - Dunkles Theme wird korrekt angewendet
- [ ] **WebSocket Connection** - Backend-Verbindung bleibt stabil

---

## Automatisierungs-Hinweise

Falls diese Szenarien automatisiert werden sollen:

### Selektoren / Identifikatoren
```
Context Menu: <aos-context-menu>
Workflow Modal: <aos-workflow-modal>
Confirm Dialog: <aos-confirm-dialog>
Spec Selector: <aos-spec-selector>
```

### API-Endpunkte
| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| specs.list | WebSocket | Liste aller verfügbaren Specs |
| workflow-start-interactive | Event | Workflow wird gestartet |

### Mock-Daten
```json
{
  "specs": [
    {"id": "2026-02-03-context-menu", "name": "Context Menu"},
    {"id": "2026-01-15-dashboard", "name": "Dashboard"}
  ],
  "workflows": [
    {"id": "agent-os:create-spec", "name": "Neue Spec erstellen"},
    {"id": "agent-os:add-bug", "name": "Bug erstellen"},
    {"id": "agent-os:add-todo", "name": "TODO erstellen"},
    {"id": "agent-os:add-story", "name": "Story zu Spec hinzufügen"}
  ]
}
```

---

## Notizen

- **z-Index Hierarchy:** context-menu(1000) < workflow-modal(1001) < confirm-dialog(1002)
- **Light DOM Pattern:** Alle neuen Komponenten nutzen `createRenderRoot = this`
- **Event Propagation:** Alle Custom Events nutzen `bubbles: true, composed: true`
- **Theme Variables:** Keine hardcoded Farben - alle nutzen CSS Custom Properties
- **Integration Validation:** Alle Komponenten-Verbindungen wurden in CTX-998 verifiziert

**Implementierte Stories:**
- CTX-001: Context Menu Component
- CTX-002: Global Event Handler
- CTX-003: Generic Workflow Modal
- CTX-004: Spec Selector Component
- CTX-005: Add Story Flow Integration
- CTX-006: Integration & Styling

**System Stories:**
- CTX-997: Code Review (abgeschlossen)
- CTX-998: Integration Validation (abgeschlossen)
