# WebSocket Image Protocol

> Story ID: CIMG-004
> Spec: Chat Image Attachments
> Created: 2026-02-02
> Last Updated: 2026-02-02

**Priority**: High
**Type**: Full-stack
**Estimated Effort**: M (5 SP)
**Dependencies**: CIMG-001, CIMG-003

---

## Feature

```gherkin
Feature: WebSocket Bild-Protokoll
  Als System
  möchte ich Bilder zusammen mit Chat-Nachrichten über WebSocket senden können,
  damit Bilder und Text in einer atomaren Nachricht an Claude übermittelt werden.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Nachricht mit Bildern senden

```gherkin
Scenario: Chat-Nachricht mit angehängten Bildern senden
  Given ich habe 2 Bilder in der Staging Area
  And ich habe "Beschreibe diese Bilder" eingegeben
  When ich die Nachricht sende
  Then wird eine WebSocket-Nachricht vom Typ "chat.send.with-images" gesendet
  And die Nachricht enthält den Text und die Bild-Referenzen
```

### Szenario 2: Kleine Bilder als Base64

```gherkin
Scenario: Kleine Bilder werden als Base64 übertragen
  Given ich habe ein 50KB großes PNG-Bild ausgewählt
  When die Nachricht gesendet wird
  Then ist das Bild als Base64-String in der WebSocket-Nachricht enthalten
  And kein separater HTTP-Upload wird durchgeführt
```

### Szenario 3: Große Bilder per HTTP Upload

```gherkin
Scenario: Große Bilder werden erst hochgeladen
  Given ich habe ein 2MB großes JPEG-Bild ausgewählt
  When die Nachricht gesendet wird
  Then wird das Bild erst per HTTP an /api/images hochgeladen
  And die WebSocket-Nachricht enthält nur den Pfad-Referenz zum Bild
```

### Szenario 4: Backend empfängt Bilder

```gherkin
Scenario: Backend verarbeitet Nachricht mit Bildern
  Given eine "chat.send.with-images" Nachricht wird empfangen
  When der WebSocket-Handler die Nachricht verarbeitet
  Then werden Base64-Bilder vom Image-Storage gespeichert
  And alle Bild-Pfade werden für Claude vorbereitet
```

### Szenario 5: Chat-Historie enthält Bild-Referenzen

```gherkin
Scenario: Chat-Historie speichert Bild-Informationen
  Given eine Nachricht mit Bildern wurde gesendet
  When ich die Chat-Historie abrufe
  Then enthält die User-Nachricht ein "images" Array
  And jedes Bild hat einen Pfad, Dateinamen und MIME-Type
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Nachricht ohne Text nur mit Bildern
  Given ich habe 1 Bild in der Staging Area
  And ich habe keinen Text eingegeben
  When ich die Nachricht sende
  Then wird die Nachricht gesendet
  And Claude erhält nur die Bilder ohne Text
```

```gherkin
Scenario: WebSocket-Fehler während Übertragung
  Given ich habe eine Nachricht mit Bildern vorbereitet
  And die WebSocket-Verbindung bricht während des Sendens ab
  Then sehe ich eine Fehlermeldung "Verbindung unterbrochen"
  And die Bilder bleiben in der Staging Area
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [x] FILE_EXISTS: agent-os-ui/src/server/websocket.ts (wird erweitert)
- [x] FILE_EXISTS: agent-os-ui/ui/src/gateway.ts (wird erweitert)

### Inhalt-Prüfungen

- [x] CONTAINS: websocket.ts enthält "chat.send.with-images"
- [x] CONTAINS: gateway.ts enthält "sendChatWithImages"
- [x] CONTAINS: claude-handler.ts enthält "images"

### Funktions-Prüfungen

- [x] LINT_PASS: `cd agent-os-ui && npm run lint` exits with code 0
- [x] BUILD_PASS: `cd agent-os-ui && npm run build` exits with code 0

---

## Required MCP Tools

| Tool | Purpose | Blocking |
|------|---------|----------|
| None | - | - |

---

## Technisches Refinement (vom Architect)

### DoR (Definition of Ready) - Vom Architect

#### Fachliche Anforderungen
- [x] Fachliche requirements klar definiert
- [x] Akzeptanzkriterien sind spezifisch und prüfbar
- [x] Business Value verstanden

#### Technische Vorbereitung
- [x] Technischer Ansatz definiert (WAS/WIE/WO)
- [x] Abhängigkeiten identifiziert
- [x] Betroffene Komponenten bekannt
- [x] Erforderliche MCP Tools dokumentiert (falls zutreffend)
- [x] Story ist angemessen geschätzt (max 5 Dateien, 400 LOC)

#### Full-Stack Konsistenz
- [x] Alle betroffenen Layer identifiziert
- [x] Integration Type bestimmt
- [x] Kritische Integration Points dokumentiert (wenn Full-stack)
- [x] Handover-Dokumente definiert (bei Multi-Layer)

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [x] Code implementiert und folgt Style Guide
- [x] Architektur-Vorgaben eingehalten
- [x] Security/Performance Anforderungen erfüllt

#### Qualitätssicherung
- [x] Alle Akzeptanzkriterien erfüllt
- [ ] Unit Tests geschrieben und bestanden
- [ ] Code Review durchgeführt und genehmigt

#### Dokumentation
- [x] Dokumentation aktualisiert
- [x] Keine Linting Errors
- [x] Completion Check Commands alle erfolgreich

---

### Betroffene Layer & Komponenten

**Integration Type:** Full-stack

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | `gateway.ts` | Neue Methode `sendChatWithImages()` |
| Frontend | `chat-view.ts` | `sendMessage()` erweitern fuer Bilder |
| Backend | `websocket.ts` | Handler `handleChatSendWithImages()` |
| Backend | `claude-handler.ts` | Erweitern um `images` Parameter |

**Kritische Integration Points:**
- Frontend gateway.ts -> Backend websocket.ts (WebSocket Message `chat.send.with-images`)
- Backend websocket.ts -> Backend image-storage.ts (Base64 Bilder speichern)
- Backend websocket.ts -> Backend claude-handler.ts (Bilder an Claude weiterleiten)

---

### Technical Details

**WAS:**
- **Frontend Gateway:**
  - Neue Methode `sendChatWithImages(content: string, images: ImagePayload[])`
  - Interface `ImagePayload { data: string, mimeType: string, filename: string, isBase64: boolean }`
  - Hybrid-Logik: Bilder <100KB als Base64 inline, >=100KB erst HTTP Upload dann Referenz
- **Frontend chat-view.ts:**
  - `sendMessage()` pruefen ob `stagedImages.length > 0`
  - Wenn ja: `gateway.sendChatWithImages()` statt `gateway.send({ type: 'chat.send' })`
  - Nach erfolgreichem Senden: `stagedImages = []` leeren
- **Backend websocket.ts:**
  - Neuer Message Handler fuer `chat.send.with-images`
  - Base64-Bilder via ImageStorageService speichern
  - Bild-Pfade sammeln und an ClaudeHandler weitergeben
- **Backend claude-handler.ts:**
  - `handleChatSend()` erweitern um optionalen `images: string[]` Parameter
  - ChatMessage Interface erweitern: `images?: { path: string, mimeType: string }[]`
  - Bilder in Chat-Historie speichern

**WIE (Architecture Guidance):**
- Pattern: Message-Handler Pattern wie bestehende handlers in websocket.ts (z.B. `handleChatSend`)
- Referenz: Gateway send/on Pattern aus gateway.ts
- Referenz: WebSocketMessage Interface aus websocket.ts
- Constraint: WebSocket Message Limit beachten (praktisch ~16MB), daher Hybrid-Strategie
- Constraint: Keine blocking I/O im Message Handler, immer async
- Error Handling: Bei Upload-Fehler `chat.send.with-images.error` Message zurueck senden

**WO:**
- Modify: `agent-os-ui/ui/src/gateway.ts`
- Modify: `agent-os-ui/ui/src/views/chat-view.ts`
- Modify: `agent-os-ui/src/server/websocket.ts`
- Modify: `agent-os-ui/src/server/claude-handler.ts`

**WER:** dev-team__frontend-developer (Gateway + chat-view), dev-team__backend-developer (websocket + claude-handler)

**Abhängigkeiten:** CIMG-001, CIMG-003

**Geschätzte Komplexität:** M

**Relevante Skills:** N/A

**Creates Reusable:** no

**Handover-Dokument:** Frontend liefert Message-Format Dokumentation fuer Backend Integration

---

### Completion Check

```bash
# Frontend checks
grep -q "sendChatWithImages" agent-os-ui/ui/src/gateway.ts && echo "OK: gateway method" || exit 1
grep -q "chat.send.with-images" agent-os-ui/ui/src/gateway.ts && echo "OK: message type in gateway" || exit 1

# Backend checks
grep -q "chat.send.with-images" agent-os-ui/src/server/websocket.ts && echo "OK: handler in websocket" || exit 1
grep -q "images" agent-os-ui/src/server/claude-handler.ts && echo "OK: images in claude-handler" || exit 1

# Lint check
cd agent-os-ui && npm run lint

# Build check
cd agent-os-ui && npm run build
```
