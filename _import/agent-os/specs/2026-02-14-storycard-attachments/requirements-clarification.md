# Requirements Clarification - Storycard Attachments

**Created:** 2026-02-14
**Status:** Pending User Approval

## Feature Overview
Bilder und Dateien an Storycards in Spec-Kanban-Boards und im Backlog anhängen. Aktuell ist das Anhängen von Dateien nur beim Anlegen eines Quick-ToDos möglich. Dieses Feature erweitert die Attachment-Funktionalität auf alle bestehenden Storycards, sodass nachträglich zusätzliche Informationen (Screenshots, Mockups, Referenz-Dateien) hinzugefügt werden können, die der Agent bei der Ausführung einlesen kann.

## Target Users
- Product Owner / Entwickler, die Agent OS Web UI nutzen, um Specs und Backlogs zu verwalten
- Der AI-Agent (Claude Code), der Attachments bei der Story-Ausführung automatisch einliest

## Business Value
- Zusätzliche Kontextinformationen (Screenshots, Mockups, PDFs, Referenzdateien) können direkt an Stories angehängt werden
- Der Agent kann diese Informationen bei der Ausführung einlesen und berücksichtigen
- Reduziert Informationsverlust zwischen Planung und Ausführung
- Eliminiert die Notwendigkeit, Dateien manuell in Ordner zu kopieren und Pfade zu dokumentieren

## Functional Requirements

### Anhängen von Dateien
- Auf jeder Storycard (Spec-Kanban + Backlog) soll ein Attachment-Icon/Button sichtbar sein
- Unterstützte Upload-Methoden: Datei-Auswahl (File Picker), Drag & Drop, Paste aus Clipboard
- Unterstützte Dateitypen: Bilder (PNG, JPG, GIF, WebP, etc.), PDF, TXT, JSON, MD
- Maximale Dateigröße: 5 MB pro Datei
- Keine maximale Anzahl von Attachments pro Story
- Mehrere Dateien können an eine Story angehängt werden

### Anzeige auf Storycard
- Büroklammer-Icon mit Anzahl der Attachments auf jeder Karte (wenn vorhanden)
- Angehängte Dateien können direkt in der UI angesehen/previewt werden
- Bilder: Thumbnail-/Vollbild-Preview
- PDFs: Inline-Preview oder Download
- Text-Dateien (TXT, JSON, MD): Inline-Anzeige

### Löschen von Attachments
- Einzelne Attachments können wieder gelöscht werden
- Bestätigung vor dem Löschen (um versehentliches Löschen zu verhindern)

### Duplikat-Handling
- Bei gleichem Dateinamen wird die neue Datei automatisch umbenannt (z.B. `screenshot-1.png`, `screenshot-2.png`)

### Agent-Integration
- Pfade zu Attachments werden relativ zum Projekt-Root in der Storycard referenziert
- Der Agent kann bei der Story-Ausführung die Attachments über diese Pfade einlesen

## Affected Areas & Dependencies
- **Storycard-UI (Spec-Kanban):** `aos-queue-item` / relevante Kanban-Storycard-Komponente - Attachment-Button und Anzeige hinzufügen
- **Storycard-UI (Backlog):** Backlog-Item-Karten - gleiche Attachment-Funktionalität
- **Backend (Attachment-Service):** Neuer oder erweiterter Service für Datei-Upload und -Verwaltung
- **Backend (WebSocket/API):** Neue Message-Types für Attachment CRUD-Operationen
- **Dateisystem:** Attachments werden im jeweiligen Spec-Ordner bzw. Backlog-Item-Ordner gespeichert
- **Bestehende Utils:** `image-upload.utils` kann wiederverwendet/erweitert werden
- **Story-Dateien (Markdown):** Attachment-Pfade werden in die Story-MD-Dateien geschrieben

## Edge Cases & Error Scenarios
- Datei > 5 MB: Fehlermeldung mit Hinweis auf maximale Dateigröße
- Ungültiger Dateityp: Fehlermeldung mit Liste der erlaubten Typen
- Duplikater Dateiname: Automatische Umbenennung (Suffix `-1`, `-2`, etc.)
- Upload-Fehler (Disk voll, Berechtigungen): Fehlermeldung mit Details
- Story-Ordner existiert nicht mehr (gelöscht): Fehlermeldung
- Gleichzeitiger Upload mehrerer Dateien: Sequenziell oder parallel verarbeiten
- Attachment löschen während Agent läuft: Warnung/Verhinderung

## Security & Permissions
- Keine speziellen Berechtigungen nötig (lokale Anwendung)
- Dateityp-Validierung sowohl im Frontend als auch im Backend
- Dateigrößen-Validierung vor Upload

## Performance Considerations
- Thumbnail-Generierung für Bilder-Preview (nicht für jedes Mal neu laden)
- Lazy Loading für Attachment-Previews
- Keine Einschränkung bei Attachment-Anzahl, aber große Mengen sollten performant gelistet werden

## Scope Boundaries
**IN SCOPE:**
- Attachment-Upload (Bilder, PDF, TXT, JSON, MD) an Storycards in Spec-Kanbans
- Attachment-Upload an Storycards im Backlog
- Anzeige/Preview der Attachments in der UI
- Löschen einzelner Attachments
- Duplikat-Handling (automatische Umbenennung)
- Pfad-Referenzierung in Story-Markdown für Agent-Zugriff
- Wiederverwendung bestehender `image-upload.utils`

**OUT OF SCOPE:**
- Attachment-Upload beim Erstellen neuer Stories (nur nachträglich)
- Versionierung von Attachments
- Attachment-Suche/Filterung
- Cloud-Speicherung (alles lokal)
- Drag & Drop von Dateien direkt auf Kanban-Karten (nur über geöffneten Dialog/Bereich)

## Open Questions (if any)
- Keine offenen Fragen

## Proposed User Stories (High Level)
1. **Attachment-Upload-Komponente** - Wiederverwendbare UI-Komponente für Datei-Upload mit Preview, Drag & Drop und Paste-Unterstützung
2. **Backend Attachment-Service** - Service für Datei-Upload, -Speicherung, -Löschung und -Listing mit WebSocket-API
3. **Storycard-Integration (Spec-Kanban)** - Attachment-Button und Büroklammer-Anzeige auf Spec-Kanban-Storycards
4. **Storycard-Integration (Backlog)** - Attachment-Button und Büroklammer-Anzeige auf Backlog-Storycards
5. **Attachment-Preview & Verwaltung** - Inline-Preview für verschiedene Dateitypen und Lösch-Funktionalität
6. **Story-Markdown Pfad-Referenzierung** - Automatisches Schreiben der Attachment-Pfade in Story-Markdown-Dateien

---
*Review this document carefully. Once approved, detailed user stories will be generated.*
