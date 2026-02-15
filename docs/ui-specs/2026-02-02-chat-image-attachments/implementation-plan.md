# Implementierungsplan: Chat Image Attachments

> **Status:** DRAFT
> **Spec:** agent-os/specs/2026-02-02-chat-image-attachments/
> **Erstellt:** 2026-02-02
> **Basiert auf:** requirements-clarification.md

---

## Executive Summary

Erweiterung des Chat Interfaces um die Möglichkeit, Bilder an Nachrichten anzuhängen. User können Bilder per Drag & Drop, Dateiauswahl oder Clipboard-Paste einfügen. Bilder werden persistent im Projekt gespeichert und an Claude Code (Vision API) weitergeleitet.

---

## Architektur-Entscheidungen

### Gewählter Ansatz

**Hybrid-Strategie: Base64 für kleine + File-Reference für große Bilder**

- Bilder < 100KB: Als Base64 direkt im WebSocket-Payload (sofortige Übertragung)
- Bilder >= 100KB: Erst HTTP Upload, dann File-Reference im WebSocket-Payload
- Claude CLI: Bilder werden als `--image` Flag mit lokalen Pfaden übergeben

### Begründung

- **Warum nicht alles Base64?** WebSocket hat praktische Limits (~16MB), große Bilder würden die Übertragung blockieren
- **Warum nicht alles HTTP Upload?** Kleine Bilder profitieren von der Sofortigkeit des WebSocket
- **Warum nicht REST API?** Bestehende Chat-Logik nutzt WebSocket, Konsistenz ist wichtiger als neue API

### Patterns & Technologien

- **Pattern:** Observer (Event-basierte Bildverarbeitung)
- **Speicherung:** Filesystem (`<project>/.agent-os/chat-images/`)
- **Frontend:** FileReader API für Base64, Fetch API für HTTP Upload
- **Backend:** Express Route für HTTP Upload, ws für WebSocket
- **Claude Integration:** `--image <path>` CLI Flag für Vision API

---

## Komponenten-Übersicht

### Neue Komponenten

| Komponente | Typ | Verantwortlichkeit |
|------------|-----|-------------------|
| `aos-image-staging-area` | UI Component | Thumbnail-Vorschau der ausgewählten Bilder vor dem Senden |
| `aos-image-lightbox` | UI Component | Großansicht bei Klick auf Thumbnails |
| `image-storage.ts` | Backend Service | Speichern und Laden von Bildern im Projekt-Ordner |
| `image-upload.routes.ts` | Backend Route | HTTP Endpoint für große Bilder (>100KB) |

### Zu ändernde Komponenten

| Komponente | Änderungsart | Grund |
|------------|--------------|-------|
| `chat-view.ts` | Erweitern | Drag & Drop, Dateiauswahl, Clipboard-Paste, Staging Area |
| `chat-message.ts` | Erweitern | Bild-Anzeige in gesendeten/empfangenen Nachrichten |
| `gateway.ts` | Erweitern | Neue Message-Typen für Bilder |
| `websocket.ts` | Erweitern | Handler für `chat.send.with-images`, Bild-Validierung |
| `claude-handler.ts` | Erweitern | Bilder an Claude CLI weiterleiten (`--image` Flag) |
| `theme.css` | Erweitern | Styles für neue Komponenten |

### Nicht betroffen (explizit)

- Dashboard View (`dashboard-view.ts`) - keine Bildunterstützung nötig
- Workflow View (`workflow-view.ts`) - keine Bildunterstützung nötig
- Specs Reader (`specs-reader.ts`) - unabhängig vom Chat
- Project Manager (`projects.ts`) - keine Änderungen nötig

---

## Komponenten-Verbindungen

| Source | Target | Verbindungsart | Zuständige Story |
|--------|--------|----------------|------------------|
| `chat-view.ts` | `aos-image-staging-area` | Import & Render | CIMG-001 |
| `chat-view.ts` | `gateway.ts` | `chat.send.with-images` | CIMG-004 |
| `chat-message.ts` | `aos-image-lightbox` | Event-basiert (Klick) | CIMG-006 |
| `gateway.ts` | `websocket.ts` | WebSocket Message | CIMG-004 |
| `websocket.ts` | `image-storage.ts` | Service Call | CIMG-003 |
| `websocket.ts` | `claude-handler.ts` | handleChatSendWithImages | CIMG-007 |
| `claude-handler.ts` | Claude CLI | `--image` Flag | CIMG-007 |

---

## Umsetzungsphasen

### Phase 1: Backend Foundation
**Ziel:** Bild-Speicherung und HTTP Upload bereitstellen
**Komponenten:** `image-storage.ts`, `image-upload.routes.ts`
**Abhängig von:** Nichts (Startphase)

- Image Storage Service erstellen
- HTTP Upload Route für große Bilder
- Validierung (Format, Größe)
- Speicherort: `<project>/.agent-os/chat-images/<timestamp>-<name>.<ext>`

### Phase 2: Frontend Upload UI
**Ziel:** User kann Bilder auswählen und Vorschau sehen
**Komponenten:** `aos-image-staging-area`, `chat-view.ts` (erweitern)
**Abhängig von:** Phase 1 (für HTTP Upload)

- Drag & Drop Zone in Chat-View
- Datei-Auswahl Button
- Clipboard Paste (Cmd+V / Strg+V)
- Staging Area mit Thumbnails und Entfernen-Button
- Validierung client-seitig (Format, Größe, Anzahl)

### Phase 3: WebSocket Protocol
**Ziel:** Bilder können mit Nachrichten gesendet werden
**Komponenten:** `gateway.ts`, `websocket.ts`, `claude-handler.ts`
**Abhängig von:** Phase 1, Phase 2

- Neuer Message-Typ `chat.send.with-images`
- Backend-Handler für Bilder (Base64 speichern, Referenzen verarbeiten)
- Claude CLI mit `--image` Flags aufrufen
- Chat-Historie mit Bild-Referenzen

### Phase 4: Anzeige in Chat
**Ziel:** Bilder werden in der Chat-Historie angezeigt
**Komponenten:** `chat-message.ts`, `aos-image-lightbox`
**Abhängig von:** Phase 3

- ChatMessageData erweitern um `images` Array
- Thumbnail-Rendering in Nachrichten
- Lightbox-Komponente für Großansicht
- Lazy Loading für Performance

### Phase 5: Integration & Polish
**Ziel:** Alles zusammenführen, Fehlerbehandlung, Tests
**Komponenten:** Alle (Integrationspunkte)
**Abhängig von:** Alle vorherigen Phasen

- Error States (ungültiges Format, zu groß, etc.)
- Loading States während Upload
- CSS Polish (Dark Theme konsistent)
- Edge Cases (Disconnect während Upload, etc.)

---

## Abhängigkeiten

### Interne Abhängigkeiten
```
[chat-view.ts] ──renders──> [aos-image-staging-area]
[aos-image-staging-area] ──emits events──> [chat-view.ts]
[chat-view.ts] ──calls──> [gateway.send]
[gateway.ts] ──ws message──> [websocket.ts]
[websocket.ts] ──uses──> [image-storage.ts]
[websocket.ts] ──calls──> [claude-handler.ts]
[claude-handler.ts] ──spawns──> [Claude CLI with --image]
[chat-message.ts] ──opens──> [aos-image-lightbox]
```

### Externe Abhängigkeiten
- **Claude Code CLI:** Muss `--image` Flag unterstützen (Version prüfen)
- **FileReader API:** Browser-native, keine externe Lib nötig
- **multer:** Für HTTP File Upload (bereits in Express verfügbar)

---

## Risiken & Mitigationen

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|--------|------------|
| Claude CLI unterstützt `--image` nicht | Low | High | Fallback: Base64 im Prompt-Text oder Fehler anzeigen |
| WebSocket Message Size Limit | Medium | Medium | Hybrid-Strategie: HTTP Upload für große Bilder |
| Browser-Kompatibilität FileReader | Low | Low | Alle modernen Browser unterstützen es |
| Performance bei vielen Bildern | Medium | Medium | Lazy Loading, Thumbnail-Verkleinerung client-seitig |
| Speicherplatz bei vielen Bildern | Low | Low | User-Verantwortung, Bilder im Projekt-Ordner (gitignore) |

---

## Self-Review Ergebnisse

### Validiert
- WebSocket-Architektur passt gut zur bestehenden Struktur
- Claude CLI `--image` Flag existiert und funktioniert
- File-basierte Speicherung konsistent mit local-first Architektur
- Keine Konflikte mit bestehenden Chat-Funktionen

### Identifizierte Probleme & Lösungen

| Problem | Ursprünglicher Plan | Verbesserung |
|---------|---------------------|--------------|
| Alle Bilder als Base64 im WebSocket | Einfacher, aber Größenlimit | Hybrid: <100KB Base64, >=100KB HTTP Upload |
| Neue REST API für Chat-Bilder | Inkonsistent mit WebSocket-Architektur | WebSocket erweitern, nur HTTP für Upload |
| Bilder in temp-Ordner | Verloren nach Neustart | Persistent in Projekt-Ordner |

### Offene Fragen
- Keine - alle Fragen in Requirements-Phase geklärt

---

## Minimalinvasiv-Optimierungen

### Wiederverwendbare Elemente gefunden

| Element | Gefunden in | Nutzbar für |
|---------|-------------|-------------|
| WebSocket Message Pattern | `websocket.ts` | Neuer `chat.send.with-images` Handler |
| ChatMessageData Interface | `chat-message.ts` | Erweitern um `images` Array |
| Dark Theme CSS Variables | `theme.css` | Styling für neue Komponenten |
| Thumbnail Pattern | `workflow-view.ts` (Stories) | Bild-Thumbnails in Staging Area |
| Modal Pattern | (nicht vorhanden) | Lightbox muss neu erstellt werden |

### Optimierungen

| Ursprünglich | Optimiert zu | Ersparnis |
|--------------|--------------|-----------|
| Eigener Upload-Service | Express-Route mit multer | Weniger Code, bekanntes Pattern |
| Bild-Komprimierung serverseitig | Client-seitige Thumbnail-Erstellung | Server-Last reduziert |
| Eigene Lightbox-Library | Einfache Modal-Komponente | Keine externe Dependency |

### Feature-Preservation bestätigt
- [x] Alle Requirements aus Clarification sind abgedeckt
- [x] Kein Feature wurde geopfert
- [x] Alle Akzeptanzkriterien bleiben erfüllbar

---

## Nächste Schritte

Nach Genehmigung dieses Plans:
1. Step 2.6: User Stories aus diesem Plan ableiten
2. Step 3: Architect fügt technische Details hinzu
3. Step 4: Spec ready for execution
