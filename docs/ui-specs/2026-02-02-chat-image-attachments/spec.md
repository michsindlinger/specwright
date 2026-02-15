# Specification: Chat Image Attachments

> Version: 1.0.0
> Created: 2026-02-02
> Status: Draft

## Overview

Erweiterung des Chat Interfaces um die Möglichkeit, Bilder und andere Dateien (PNG, JPG, GIF, WebP, PDF, SVG) an Nachrichten anzuhängen. User können Bilder per Drag & Drop, Dateiauswahl oder Clipboard-Paste einfügen und diese zusammen mit Text-Nachrichten an Claude senden.

## User Stories

| ID | Story | Type | Priority |
|----|-------|------|----------|
| CIMG-001 | Image Upload UI | Frontend | High |
| CIMG-002 | Image Staging Area | Frontend | High |
| CIMG-003 | Backend Image Storage | Backend | High |
| CIMG-004 | WebSocket Image Protocol | Full-stack | High |
| CIMG-005 | Chat Message Image Display | Frontend | High |
| CIMG-006 | Image Lightbox | Frontend | Medium |
| CIMG-007 | Claude Vision Integration | Backend | High |

## Spec Scope

### In Scope

- Bild-Upload via Drag & Drop, Dateiauswahl und Clipboard-Paste
- Unterstützte Formate: PNG, JPG, GIF, WebP, PDF, SVG
- Maximale Dateigröße: 5 MB pro Bild
- Maximale Anzahl: 5 Bilder pro Nachricht
- Staging Area mit Thumbnail-Vorschau und Entfernen-Button
- Thumbnail-Anzeige in Chat-Nachrichten
- Lightbox für Großansicht
- Persistente Speicherung im Projekt-Ordner
- Fehlerbehandlung für ungültige Formate/Größen
- Integration mit Claude Code CLI (Vision API)

### Out of Scope

- Video-Upload
- Audio-Upload
- Bild-Bearbeitung (Cropping, Annotation)
- Cloud-Speicherung
- Serverseitige Bild-Komprimierung
- OCR/Text-Extraktion (Claude macht das)
- Multi-User Sharing

## Expected Deliverables

### Testbare Outcomes

1. **Bild-Upload funktioniert:**
   - Drag & Drop: Bild in Chat-Bereich ziehen zeigt Upload-Indikator
   - Datei-Button: Klick öffnet Dateiauswahl-Dialog
   - Clipboard: Strg+V/Cmd+V fügt Screenshot ein

2. **Validierung funktioniert:**
   - Unsupportetes Format zeigt Fehlermeldung
   - Datei > 5 MB zeigt Fehlermeldung
   - Mehr als 5 Bilder zeigt Fehlermeldung

3. **Staging Area funktioniert:**
   - Thumbnails werden vor dem Senden angezeigt
   - X-Button entfernt Bild aus Staging
   - Bilder werden mit nächster Nachricht gesendet

4. **Chat-Anzeige funktioniert:**
   - User-Nachrichten zeigen angehängte Bilder als Thumbnails
   - Klick auf Thumbnail öffnet Lightbox
   - Lightbox zeigt Bild in Großansicht

5. **Claude Integration funktioniert:**
   - Bilder werden an Claude CLI übergeben
   - Claude kann Bilder "sehen" und beschreiben

## Integration Requirements

**Integration Type:** Full-stack

### Integration Test Commands

```bash
# Test 1: Backend Image Storage Service exists
test -f agent-os-ui/src/server/image-storage.ts && echo "PASS: image-storage.ts exists"

# Test 2: Frontend Upload Component exists
test -f agent-os-ui/ui/src/components/aos-image-staging-area.ts && echo "PASS: staging-area component exists"

# Test 3: Frontend Lightbox Component exists
test -f agent-os-ui/ui/src/components/aos-image-lightbox.ts && echo "PASS: lightbox component exists"

# Test 4: Build passes
cd agent-os-ui && npm run build && echo "PASS: Build successful"

# Test 5: Lint passes
cd agent-os-ui && npm run lint && echo "PASS: Lint successful"
```

### End-to-End Scenarios

| Scenario | Steps | Requires MCP |
|----------|-------|--------------|
| Upload via Drag & Drop | 1. Open chat, 2. Drag image into chat area, 3. Verify staging area shows thumbnail | Yes (Playwright) |
| Send message with image | 1. Add image to staging, 2. Type message, 3. Send, 4. Verify image in chat history | Yes (Playwright) |
| Lightbox opens | 1. Have message with image, 2. Click thumbnail, 3. Verify lightbox with full image | Yes (Playwright) |
| Error on oversized file | 1. Try to add 10MB file, 2. Verify error message shown | Yes (Playwright) |

---

*This specification is ready for /execute-tasks after all stories have been technically refined.*
