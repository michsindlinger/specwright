# Requirements Clarification - Quick-To-Do

**Created:** 2026-02-13
**Status:** Pending User Approval

## Feature Overview
Quick-To-Do ermöglicht das sofortige Erfassen von spontanen Ideen und Aufgaben direkt über das Kontextmenü - ohne einen vollständigen Workflow zu starten. Ein schlankes Modal mit Titel, optionaler Beschreibung und Bild-Upload speichert den Eintrag direkt im Backlog.

## Target Users
Entwickler, die während der Arbeit spontane Ideen oder Aufgaben schnell festhalten möchten, um sie später auszuarbeiten.

## Business Value
- Reduziert die Hürde, Ideen festzuhalten (kein Workflow-Prozess nötig)
- Verhindert, dass spontane Einfälle verloren gehen
- Ermöglicht visuelles Festhalten durch Bild-Upload (Screenshots, Skizzen)
- Schneller Capture-Flow: Idee → Kontextmenü → Titel + optional Bild → Gespeichert

## Functional Requirements

1. **Neuer Kontextmenü-Eintrag "Quick-To-Do"**
   - Wird zum bestehenden Kontextmenü hinzugefügt (neben Spec, Bug, TODO, Story)
   - Öffnet ein eigenständiges, schlankes Quick-Modal (NICHT den Workflow-Executor)

2. **Quick-To-Do Modal**
   - Titel-Eingabefeld (Pflicht)
   - Beschreibungs-Textarea (Optional)
   - Priorität-Dropdown mit Default "medium" (Optional, vorausgewählt)
   - Bild-Upload-Bereich mit Copy & Paste Support
   - "Speichern" und "Abbrechen" Buttons
   - Keyboard-Support: Enter zum Speichern (wenn Titel ausgefüllt), Escape zum Abbrechen

3. **Bild-Upload**
   - Copy & Paste (Ctrl+V / Cmd+V) ins Modal
   - Drag & Drop ins Modal
   - Mehrere Bilder möglich (max 5, konsistent mit Chat)
   - Unterstützte Formate: PNG, JPEG, GIF, WebP (konsistent mit Chat)
   - Max 5MB pro Bild (konsistent mit Chat)
   - Vorschau-Thumbnails mit Entfernen-Button
   - Bilder werden als Dateien gespeichert (nicht Base64)

4. **Speicherung**
   - Eintrag in `backlog-index.json` (via MCP-Tool `backlog_add_item`)
   - Separate Markdown-Datei in `agent-os/backlog/items/`
   - Bilder in `agent-os/backlog/items/attachments/ITEM-XXX/`
   - Markdown-Datei referenziert Bilder mit relativen Pfaden
   - Typ: "todo", Status: "open", Priorität: gewählter Wert (Default: "medium")

5. **Feedback**
   - Toast-Notification nach erfolgreichem Speichern: "Quick-To-Do gespeichert" mit Item-ID
   - Modal schließt sich automatisch nach Speichern

## Affected Areas & Dependencies

- **aos-context-menu.ts** - Neuer Menüeintrag "Quick-To-Do"
- **app.ts** - Handler für neuen Context-Menu-Action
- **Neues Quick-To-Do Modal** - Eigenständige Lit-Komponente `aos-quick-todo-modal`
- **Backend: Bild-Speicherung** - Neuer API-Endpoint oder Erweiterung für Bild-Upload in Backlog-Ordner
- **Backend: Backlog-Item-Erstellung** - Neuer API-Endpoint zum Erstellen von Backlog-Items mit Bildern
- **MCP Kanban Server** - `backlog_add_item` wird verwendet (bestehend)
- **Toast-System** - Bestehend, wird wiederverwendet

## Edge Cases & Error Scenarios

- **Leerer Titel** - Speichern-Button deaktiviert, Validierungsfehler anzeigen
- **Bild zu groß (>5MB)** - Fehlermeldung, Bild wird nicht hinzugefügt
- **Zu viele Bilder (>5)** - Fehlermeldung, weiteres Einfügen blockiert
- **Ungültiges Bildformat** - Fehlermeldung mit erlaubten Formaten
- **Kein Backlog-Ordner vorhanden** - Backend erstellt Ordner automatisch (mkdir -p)
- **Speicherfehler** - Toast-Fehlermeldung, Modal bleibt offen, User kann erneut versuchen
- **Paste ohne Bild (Text)** - Wird ignoriert / in Beschreibungsfeld eingefügt

## Security & Permissions
- Lokale Anwendung, keine Authentifizierung nötig
- Bild-Dateien werden lokal gespeichert, keine externe Übertragung
- Dateinamen werden sanitized (keine Path-Traversal-Risiken)

## Performance Considerations
- Modal soll sofort erscheinen (<100ms)
- Bild-Thumbnails über Object-URL (kein Base64-Rendering)
- Speichervorgang asynchron, Modal schließt sich sofort nach Absenden

## Scope Boundaries

**IN SCOPE:**
- Neuer Kontextmenü-Eintrag "Quick-To-Do"
- Eigenständiges Quick-Modal mit Titel, Beschreibung, Priorität, Bilder
- Copy & Paste und Drag & Drop für Bilder
- Speicherung in backlog-index.json + Markdown-Datei + Bild-Dateien
- Toast-Feedback nach Speichern
- Backend-Endpoint für Bild-Upload und Item-Erstellung

**OUT OF SCOPE:**
- Bearbeiten/Editieren von bestehenden Quick-To-Dos (kommt später)
- Anzeige von Quick-To-Dos im Dashboard (nutzt bestehendes Backlog-Board)
- Tagging oder Kategorisierung
- Verknüpfung mit Specs
- Audio- oder Video-Uploads
- Offline-Support / Queuing

## Open Questions
- Keine - alle Fragen geklärt.

## Proposed User Stories (High Level)

1. **Quick-To-Do Modal Komponente** - Eigenständiges Lit-Modal mit Formular (Titel, Beschreibung, Priorität)
2. **Bild-Upload im Quick-To-Do** - Copy & Paste, Drag & Drop, Thumbnail-Vorschau mit Entfernen
3. **Backend API für Quick-To-Do** - REST-Endpoint zum Erstellen von Backlog-Items mit Bild-Upload
4. **Kontextmenü-Integration** - Neuer Eintrag + Verbindung zum Quick-Modal in app.ts
5. **Toast-Feedback & UX-Polish** - Erfolgsmeldung, Error-Handling, Keyboard-Support

---
*Review this document carefully. Once approved, detailed user stories will be generated.*
