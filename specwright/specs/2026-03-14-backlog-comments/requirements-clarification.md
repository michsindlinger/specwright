# Requirements Clarification - Backlog Item Comments

**Created:** 2026-03-14
**Status:** Pending User Approval
**Origin:** Transferred from Brainstorming Session: 2026-03-14-backlog-comments

## Feature Overview

Trello-Style Kommentarfunktion für Backlog Items, die es Nutzern ermöglicht, Kommentare mit Markdown-Text und Bildern zu Backlog Items hinzuzufügen, zu bearbeiten und zu löschen.

## Target Users

- Specwright Web UI Nutzer, die Backlog Items verwalten und kommentieren wollen
- Externe Bots (architektonisch vorbereitet, aber nicht im initialen Scope)

## Business Value

Aktuell können Backlog Items nur Attachments (Dateien/Bilder) angehängt werden, aber es gibt keine Möglichkeit, Diskussionen, Notizen oder Fortschrittsupdates direkt am Item festzuhalten. Kommentare ermöglichen:
- Kontext und Entscheidungen direkt am Item dokumentieren
- Fortschritt und Erkenntnisse festhalten
- Gedanken und Ideen an Items anheften, ohne den Markdown-Content des Items selbst zu ändern

## Functional Requirements

1. **Kommentar erstellen:** Nutzer kann Text (Markdown) + optionale Bilder zu einem Backlog Item hinzufügen
2. **Kommentare anzeigen:** Chronologische Liste (neueste unten) mit Datum und Uhrzeit pro Kommentar
3. **Kommentar bearbeiten:** Eigene Kommentare können nachträglich bearbeitet werden (editedAt-Timestamp)
4. **Kommentar löschen:** Eigene Kommentare können gelöscht werden
5. **Bild-Upload:** Bilder können per Drag & Drop ins Textfeld oder über einen separaten Upload-Button hinzugefügt werden
6. **Markdown-Rendering:** Kommentartext wird als Markdown gerendert (wie bei bestehenden Chat-Messages)
7. **Comment-Count Badge:** Story Card zeigt Anzahl der Kommentare als Badge an (analog zu `attachmentCount`)

## Affected Areas & Dependencies

- **Story Card** (`ui/frontend/src/components/story-card.ts`) - Neues Comment-Count Badge
- **Dashboard View** (`ui/frontend/src/views/dashboard-view.ts`) - Integration der Comment-Sektion in `renderBacklogStoryDetail()`
- **Shared Types** (`ui/src/shared/types/`) - Neues `comment.protocol.ts`
- **Server Handlers** (`ui/src/server/handlers/`) - Neuer `comment.handler.ts`
- **WebSocket** (`ui/src/server/websocket.ts`) - Registration des Comment Handlers
- **Backlog Reader** (`ui/src/server/backlog-reader.ts`) - Comment-Count Berechnung
- **Attachment Storage** (`ui/src/server/services/attachment-storage.service.ts`) - Wiederverwendung für Kommentar-Bilder

### Wiederverwendbare Projekt-Artefakte

Folgende bestehende Artefakte können wiederverwendet werden:
- **Attachment Protocol Pattern** (`attachment.protocol.ts`) - WebSocket Message-Struktur als Vorlage
- **Attachment Handler Pattern** (`attachment.handler.ts`) - Handler-Registrierung als Vorlage
- **Attachment Storage** - Bild-Speicherung im bestehenden Attachment-Verzeichnis
- **Chat Message Rendering** - Markdown-Rendering aus `chat-message.ts`

## Edge Cases & Error Scenarios

- **Leerer Kommentar:** Absenden ohne Text/Bild verhindern (Frontend-Validierung)
- **Großes Bild:** Maximale Dateigröße wie bei Attachments (5MB)
- **Concurrent Edits:** JSON-Datei-Locking bei gleichzeitigem Zugriff (analog zu bestehenden Patterns)
- **Item gelöscht:** Kommentare werden mit dem Item gelöscht (kein separates Cleanup nötig, da im Attachment-Ordner)
- **Kommentar-Bilder verwaist:** Wenn Kommentar gelöscht wird, zugehörige Bilder ebenfalls löschen

## Security & Permissions

- Keine spezielle Authentifizierung nötig (lokale Anwendung, Single-User)
- Path-Traversal-Schutz bei Dateioperationen (wie bei Attachments)
- Bilder-Upload nur erlaubte MIME-Types (wie `ATTACHMENT_CONFIG`)

## Performance Considerations

- Keine besonderen Performance-Anforderungen (lokale Anwendung)
- JSON-Datei pro Item hält Dateigrößen klein
- Bilder werden nicht im JSON gespeichert, sondern als separate Dateien referenziert

## Scope Boundaries

**IN SCOPE:**
- Comment CRUD (Create, Read, Update, Delete)
- Markdown-Text in Kommentaren
- Bild-Upload (Drag & Drop + Button)
- Comment-Count Badge auf Story Card
- Chronologische Darstellung mit Datum/Uhrzeit
- Speicherung als `comments.json` im Attachment-Ordner
- WebSocket-basierte Kommunikation

**OUT OF SCOPE:**
- Bot-Kommentare (Architektur vorbereitet via `author`-Feld, aber kein Bot-Integration)
- Benachrichtigungen / Unread-Indicator
- @-Mentions
- Kommentar-Reaktionen (Emojis)
- Kommentare auf Spec Stories (nur Backlog Items)
- Threaded/nested Kommentare (flache Liste)

## Open Questions

Keine - alle Fragen wurden im Brainstorming geklärt.

## Proposed User Stories (High Level)

1. **Comment Protocol & Storage** - Shared Types definieren + Server-seitige Speicherung (JSON CRUD)
2. **Comment Handler** - WebSocket Handler für Comment-Operationen registrieren
3. **Comment Thread Component** - Frontend Lit-Komponente für Kommentar-Darstellung + Eingabe
4. **Image Upload in Comments** - Bild-Upload per Drag & Drop und Button in Kommentaren
5. **Comment Count Badge** - Comment-Count auf Story Card + in Backlog Reader
6. **Detail View Integration** - Comment-Sektion in Backlog Story Detail-Ansicht einbinden

---
*Review this document carefully. Once approved, detailed user stories will be generated.*
