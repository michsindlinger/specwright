# Requirements Clarification - Chat Image Attachments

**Created:** 2026-02-02
**Status:** Pending User Approval

## Feature Overview

Erweiterung des Chat Interfaces um die Möglichkeit, Bilder und andere Dateien an Nachrichten anzuhängen. Der User kann Bilder per Drag & Drop, Dateiauswahl oder Zwischenablage einfügen und diese zusammen mit Text-Nachrichten an Claude senden.

## Target Users

- Entwickler, die mit dem Agent OS Web UI arbeiten
- User, die Screenshots von Bugs, UI-Designs oder Code teilen möchten
- Teams, die visuelle Kontexte für Claude-Anfragen benötigen

## Business Value

- **Verbesserte Kommunikation:** Screenshots können direkt geteilt werden ohne externe Upload-Dienste
- **Effizientere Fehlerbeschreibungen:** Bug-Screenshots direkt an Claude senden
- **Bessere Code-Reviews:** UI-Screenshots für visuelle Verifikation
- **Vollständiger Feature-Parity:** Modernes Chat-Interface wie bei anderen AI-Assistenten

## Functional Requirements

### Bild-Upload
- **Unterstützte Formate:** PNG, JPG, GIF, WebP, PDF, SVG
- **Maximale Dateigröße:** 5 MB pro Datei
- **Maximale Anzahl:** 5 Bilder pro Nachricht

### Upload-Methoden
1. **Datei-Auswähler:** Button zum Öffnen des Datei-Dialogs
2. **Drag & Drop:** Bilder direkt in den Chat-Bereich ziehen
3. **Clipboard Paste:** Screenshots via Strg+V / Cmd+V einfügen

### Bild-Vorschau (Staging Area)
- Thumbnails der ausgewählten Bilder vor dem Senden anzeigen
- Jedes Thumbnail hat einen "Entfernen"-Button (X)
- Staging Area wird zwischen Input und Message-Liste angezeigt

### Bild-Anzeige in Chat
- **User-Nachrichten:** Thumbnails der angehängten Bilder
- **Lightbox:** Klick auf Thumbnail öffnet Großansicht
- **Historie:** Bilder bleiben in der Chat-Historie sichtbar

### Speicherung
- Bilder werden persistent im Projekt-Ordner gespeichert
- Speicherort: `<project>/.agent-os/chat-images/`
- Dateiname: `<timestamp>-<original-name>.<ext>`
- Chat-Historie referenziert gespeicherte Bilder

## Affected Areas & Dependencies

### Frontend (agent-os-ui/ui/src/)
- `views/chat-view.ts` - Upload-UI, Staging Area, Bildanzeige
- `components/chat-message.ts` - Bild-Rendering in Nachrichten
- `gateway.ts` - WebSocket-Nachrichten mit Bild-Payload
- `styles/theme.css` - Styles für neue Komponenten (Lightbox, Thumbnails)

### Backend (agent-os-ui/src/server/)
- `websocket.ts` - Neuer Message-Typ `chat.send.with-images`
- `claude-handler.ts` - Bilder an Claude API weiterleiten
- Neuer Service: `image-storage.ts` - Bild-Speicherung und -Abruf

### Integration Points
- Claude Code CLI muss Bilder unterstützen (Vision API)
- WebSocket Message Size Limit beachten (Bilder als Base64 oder File-Reference)

## Edge Cases & Error Scenarios

| Edge Case | Expected Behavior |
|-----------|-------------------|
| Unsupportetes Format | Fehlermeldung: "Format nicht unterstützt. Erlaubt: PNG, JPG, GIF, WebP, PDF, SVG" |
| Datei > 5 MB | Fehlermeldung: "Datei ist zu groß (max. 5 MB)" |
| > 5 Bilder | Fehlermeldung: "Maximal 5 Bilder pro Nachricht" |
| Upload während Streaming | Upload möglich, Senden disabled bis Streaming endet |
| Kein Projekt ausgewählt | Upload-Button disabled, Hinweis wie bei Text-Input |
| Bild-Pfad ungültig (Historie) | Placeholder-Bild mit "Bild nicht gefunden" Text |
| WebSocket disconnected | Fehlermeldung, Bilder bleiben in Staging Area |

## Security & Permissions

- Keine serverseitige Validierung für Bildinhalt (Malware-Scan) in v1
- Bilder werden nur im lokalen Projekt-Ordner gespeichert (keine Cloud)
- Nur Bilder aus dem aktuellen Projekt sichtbar (Session-Isolation)
- Keine automatische Umbenennung bei Duplikaten (Timestamp macht eindeutig)

## Performance Considerations

- **Thumbnails:** Clientseitige Verkleinerung für Vorschau (max 200px)
- **Lazy Loading:** Bilder in Historie erst laden wenn sichtbar
- **Base64 vs File:** Kleine Bilder (<100KB) als Base64, größere als File-Reference
- **Caching:** Browser-Cache für bereits geladene Bilder nutzen

## Scope Boundaries

**IN SCOPE:**
- Bild-Upload (Drag & Drop, Datei-Auswahl, Clipboard)
- Staging Area mit Thumbnails und Entfernen-Button
- Lightbox für Großansicht
- Persistente Speicherung im Projekt-Ordner
- Fehlerbehandlung für ungültige Formate/Größen
- Integration mit Claude Code CLI (Vision)

**OUT OF SCOPE:**
- Video-Upload
- Audio-Upload
- Bild-Bearbeitung (Cropping, Annotation)
- Cloud-Speicherung
- Bild-Komprimierung serverseitig
- OCR/Text-Extraktion aus Bildern (Claude macht das)
- Multi-User Sharing

## Open Questions

*Keine offenen Fragen - alle Anforderungen wurden geklärt.*

## Proposed User Stories (High Level)

1. **CIMG-001: Bild-Upload UI** - Drag & Drop Zone, Datei-Button, Clipboard-Paste im Chat
2. **CIMG-002: Staging Area** - Thumbnail-Vorschau mit Entfernen-Funktion vor dem Senden
3. **CIMG-003: Backend Image Storage** - Service zum Speichern und Laden von Bildern
4. **CIMG-004: WebSocket Image Protocol** - Erweiterung des Chat-Protokolls für Bilder
5. **CIMG-005: Chat Message Image Display** - Bilder in gesendeten/empfangenen Nachrichten anzeigen
6. **CIMG-006: Lightbox Component** - Großansicht bei Klick auf Thumbnails
7. **CIMG-007: Claude Vision Integration** - Bilder an Claude API weiterleiten

---

*Review this document carefully. Once approved, detailed user stories will be generated.*
