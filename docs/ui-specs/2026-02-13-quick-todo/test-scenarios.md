# Test-Szenarien: Quick-To-Do

> Generiert am 2026-02-13 nach Abschluss der Implementierung
> Spec: agent-os/specs/2026-02-13-quick-todo

## Zweck

Dieses Dokument beschreibt Test-Szenarien zum manuellen Testen oder zur Weitergabe an eine KI für automatisierte E2E-Tests.

---

## Voraussetzungen

### Systemvoraussetzungen
- [ ] Agent OS Web UI läuft lokal (`npm run dev`)
- [ ] Backend-Server läuft (Express auf Standard-Port)
- [ ] Ein Projekt ist in der UI geöffnet

### Test-Accounts / Daten
| Typ | Wert | Beschreibung |
|-----|------|--------------|
| Lokales Projekt | Beliebiger Projektpfad | Projekt mit agent-os/ Ordner |

---

## Test-Szenarien

### Szenario 1: QTD-001 - Kontextmenü-Integration + Modal-Shell

**Beschreibung:** Quick-To-Do über Kontextmenü öffnen und Modal-Grundfunktion testen

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Rechtsklick in der Agent OS Web UI | Kontextmenü erscheint |
| 2 | Eintrag "Quick-To-Do" im Kontextmenü suchen | Eintrag mit Blitz-Icon ist sichtbar |
| 3 | Auf "Quick-To-Do" klicken | Modal-Dialog öffnet sich |
| 4 | Modal-Inhalt prüfen | Titel-Eingabefeld, optionales Beschreibungsfeld, Priorität-Dropdown (Vorauswahl "Medium"), "Speichern"- und "Abbrechen"-Buttons vorhanden |
| 5 | Escape-Taste drücken | Modal wird geschlossen, keine Daten gespeichert |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Modal bereits offen | Rechtsklick bei geöffnetem Quick-To-Do Modal | Kein Kontextmenü erscheint |
| Save-Button ohne Titel | Save-Button klicken ohne Titel einzugeben | Button ist disabled |

#### Fehlerfälle

| Fehlerfall | Auslöser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| Kein Fehlerfall | Modal ist reine UI-Shell | - |

---

### Szenario 2: QTD-002 - Bild-Upload im Quick-To-Do Modal

**Beschreibung:** Bilder per Copy & Paste und Drag & Drop in das Quick-To-Do Modal einfügen

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Quick-To-Do Modal öffnen | Modal ist geöffnet |
| 2 | Screenshot machen und Ctrl+V im Modal drücken | Thumbnail des Bildes erscheint im Modal |
| 3 | PNG-Datei per Drag & Drop ins Modal ziehen | Visueller Drop-Bereich wird hervorgehoben, nach Loslassen erscheint Thumbnail |
| 4 | 3 Bilder nacheinander per Paste einfügen | 3 Thumbnails sichtbar, Anzeige "3/5" |
| 5 | Entfernen-Button am ersten Bild klicken | Erstes Bild wird entfernt, 2 Bilder übrig, Anzeige "2/5" |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Maximum erreicht | 5 Bilder bereits eingefügt, weiteres per Paste | Bild wird nicht hinzugefügt, Meldung "Maximal 5 Bilder erlaubt" |
| Ungültiges Format | PDF-Datei per Drag & Drop | Datei wird nicht hinzugefügt, Meldung mit erlaubten Formaten |
| Zu große Datei | 10MB Bild per Paste | Bild wird nicht hinzugefügt, Meldung "Maximale Dateigröße: 5MB" |

#### Fehlerfälle

| Fehlerfall | Auslöser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| Ungültiges Dateiformat | PDF/SVG-Datei per D&D | Fehlermeldung mit erlaubten Formaten (PNG, JPEG, GIF, WebP) |
| Datei zu groß | Bild > 5MB | "Maximale Dateigröße: 5MB" |

---

### Szenario 3: QTD-003 - Backend REST-API + Storage Service

**Beschreibung:** Backend-Endpoint für Quick-To-Do-Erstellung testen

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | POST `/api/backlog/:projectPath/quick-todo` mit `{ title: "Neue Idee", priority: "medium" }` | 200 OK, Eintrag in backlog-index.json erstellt |
| 2 | Markdown-Datei in `agent-os/backlog/items/` prüfen | Datei existiert mit korrektem Inhalt |
| 3 | POST mit Titel und 2 Base64-Bildern senden | Eintrag erstellt, Bilder in `items/attachments/ITEM-XXX/` gespeichert |
| 4 | Erster Request in neuem Projekt (kein backlog/ Ordner) | Ordnerstruktur wird automatisch angelegt, backlog-index.json initialisiert |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Erster Item | Kein backlog/ Ordner vorhanden | Ordnerstruktur wird automatisch erstellt |
| Nur Titel | POST nur mit Titel, keine Beschreibung/Bilder | Item wird erfolgreich erstellt |

#### Fehlerfälle

| Fehlerfall | Auslöser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| Kein Titel | POST ohne `title` im Body | 400: "Title is required" |

---

### Szenario 4: QTD-004 - End-to-End Integration + UX-Polish

**Beschreibung:** Vollständiger Flow: Modal ausfüllen, speichern, Feedback erhalten

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Quick-To-Do Modal öffnen | Modal ist geöffnet |
| 2 | Titel "Neue Dashboard-Idee" eingeben, Priorität "high" wählen | Felder korrekt ausgefüllt |
| 3 | Auf "Speichern" klicken | Modal schließt sich, Toast-Notification "Quick-To-Do erstellt" erscheint |
| 4 | Backlog prüfen | Item existiert im Backlog |
| 5 | Neues Modal öffnen, Titel + 2 Bilder einfügen, speichern | Loading-Indikator auf Save-Button, nach Speichern Modal geschlossen, Toast zeigt Item-ID |
| 6 | Titel eingeben und Enter drücken (Fokus auf Titel-Feld) | Quick-To-Do wird gespeichert, Modal schließt sich |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Enter in Textarea | Fokus im Beschreibungsfeld, Enter drücken | Zeilenumbruch wird erstellt, KEIN Speichern |

#### Fehlerfälle

| Fehlerfall | Auslöser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| Backend nicht erreichbar | Server stoppen, dann speichern versuchen | Inline-Fehlermeldung im Modal, Modal bleibt offen, erneuter Versuch möglich |

---

## Regressions-Checkliste

Bestehende Funktionalität, die nach der Implementierung noch funktionieren muss:

- [ ] Kontextmenü - Alle bestehenden Einträge funktionieren weiterhin (Spec erstellen, Bug erstellen, TODO erstellen, Workflow starten)
- [ ] Chat-Funktionalität - Bild-Upload im Chat funktioniert weiterhin (shared image-upload.utils.ts)
- [ ] Kontextmenü Positionierung - Menü erscheint korrekt positioniert auch am Rand des Bildschirms
- [ ] Toast-Notifications - Bestehende Toast-Funktionalität unverändert

---

## Automatisierungs-Hinweise

Falls diese Szenarien automatisiert werden sollen:

### Selektoren / Identifikatoren
```
Quick-To-Do Modal: aos-quick-todo-modal
Kontextmenü: aos-context-menu
Titel-Eingabefeld: .quick-todo-input (im Modal)
Beschreibungsfeld: .quick-todo-textarea (im Modal)
Priorität-Dropdown: .quick-todo-select (im Modal)
Save-Button: .quick-todo-btn-primary (im Modal)
Cancel-Button: .quick-todo-btn-secondary (im Modal)
Image-Staging: aos-image-staging-area (im Modal)
```

### API-Endpunkte
| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/backlog/:projectPath/quick-todo` | POST | Quick-To-Do Item erstellen |

### Mock-Daten
```json
{
  "quickTodo": {
    "title": "Test Quick-To-Do",
    "description": "Optionale Beschreibung",
    "priority": "medium",
    "images": []
  }
}
```

---

## Notizen

- Das Modal nutzt Light DOM (`createRenderRoot() { return this; }`), CSS-Selektoren greifen direkt
- Bild-Validierung: Nur PNG, JPEG, GIF, WebP erlaubt; max. 5MB pro Bild; max. 5 Bilder
- Backend-Body-Limit für die Route: 30MB (für Base64-kodierte Bilder)
- Die `image-upload.utils.ts` wird auch von `chat-view.ts` genutzt - Regressionstest wichtig
