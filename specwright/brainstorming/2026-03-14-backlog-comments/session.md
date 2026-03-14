# Brainstorming Session: Backlog Item Comments

> Session ID: 2026-03-14-backlog-comments
> Started: 2026-03-14 10:00
> Type: feature
> Status: Transferred

## Topic

Möglichkeit schaffen, Kommentare zu Backlog Items hinzuzufügen. Aktuell gibt es keine Kommentarfunktion für Backlog Items - nur Attachments (Dateien/Bilder) können angehängt werden.

## Kontext (Bestandsanalyse)

### Aktuelle Backlog-Architektur
- **Datenstruktur:** `BacklogStoryInfo` mit id, title, type, priority, effort, status, model, dorComplete, dependencies, file, attachmentCount, assignedToBot
- **Speicherung:** Dual-Format (JSON in `backlog-index.json` + individuelle Markdown-Dateien in `backlog/items/`)
- **Attachments:** Eigenes System mit WebSocket-Protokoll, Storage Service, Handler und Frontend-Panel

### Vorhandene Infrastruktur (wiederverwendbar)
- **Attachment-System:** WebSocket-basiert mit Protocol-Types, Handler, Storage Service (Pattern-Vorlage)
- **Chat-Infrastruktur:** `aos-spec-chat`, `chat-message` Komponenten mit Markdown-Rendering
- **Story Card:** `story-card.ts` - Darstellung einzelner Backlog Items
- **Kanban Board:** `kanban-board.ts` - Board-Ansicht
- **Detail-Ansicht:** `dashboard-view.ts:2109-2136` - `renderBacklogStoryDetail()` mit docs-viewer

### Was fehlt
- Keine Comment-Types im shared-Verzeichnis
- Kein Comment-Handler auf dem Server
- Keine Comment-Komponente im Frontend
- Kein Comment-Count in BacklogStoryInfo

## Discussion Thread

### Initial Thoughts
**User:** Ich möchte eine Möglichkeit schaffen, dass man Backlog Items Kommentare hinzufügen kann.

**Assistant:** Die Analyse zeigt, dass die Infrastruktur gut vorbereitet ist. Das Attachment-System bietet ein bewährtes Pattern (WebSocket-Protokoll, Handler, Storage Service), das für Comments adaptiert werden kann.

### Runde 2: Anforderungsklärung
**User-Antworten:**
1. **Wer kommentiert?** Nutzer selbst oder externer Bot
2. **Wo?** Über Story Card + Detail-Ansicht
3. **Was kann ein Kommentar?** Text + Bilder
4. **Speicherung:** Entscheidung an Assistant delegiert → JSON pro Item
5. **Vorbild:** Trello-Style (leichtgewichtig)

### Runde 3: Detail-Entscheidungen
**User-Antworten:**
1. **Markdown** in Kommentaren (nicht Plain Text)
2. **Bild-Upload:** Drag & Drop ins Textfeld UND separater Upload-Button
3. **Reihenfolge:** Neueste unten (chronologisch) mit Datum und Uhrzeit

---

## Ideas Explored

### Speicherung: JSON pro Item
```
.agent-os/backlog/attachments/ITEM-ID/
├── comments.json          ← Kommentar-Daten
└── cmt-img-001.png        ← Bilder in Kommentaren
```

**Begründung:** Strukturierte Daten mappen natürlich auf JSON, Comment-Count ohne Parsing ableitbar, Bilder nutzen bestehenden Attachment-Storage, konsistent mit `backlog-index.json` Pattern.

### Datenstruktur
```typescript
interface Comment {
  id: string;              // z.B. "cmt-1710412800000"
  author: 'user' | string; // 'user' oder Bot-Name
  text: string;            // Markdown-Text
  images?: string[];       // Dateinamen im Attachment-Ordner
  createdAt: string;       // ISO timestamp
  editedAt?: string;       // Falls bearbeitet
}
```

### Architektur
```
Shared Types → comment.protocol.ts (Comment + WebSocket messages)
Server       → comment.handler.ts (WebSocket handler, CRUD)
Frontend     → aos-comment-thread.ts (Liste + Eingabe + Bilder)
Storage      → .agent-os/backlog/attachments/ITEM-ID/comments.json
Story Card   → commentCount Badge (analog attachmentCount)
```

### UX-Flow (Trello-Style)
1. Story Card → zeigt Comment-Count Badge
2. Klick auf Card → Detail-Ansicht
3. Detail-Ansicht → unter docs-viewer: chronologische Comment-Liste + Eingabefeld
4. Eingabe → Markdown-Textfeld + Bild-Upload (Button + Drag&Drop), Enter/Button zum Senden
5. Jeder Kommentar zeigt Datum + Uhrzeit
6. Hover über eigenen Kommentar → Edit/Delete Icons

## Key Decisions

1. **Speicherformat:** JSON (`comments.json` pro Item im Attachment-Ordner)
2. **Markdown:** Kommentare unterstützen Markdown-Formatierung
3. **Bilder:** Drag & Drop + Upload-Button, gespeichert im Attachment-Ordner
4. **Reihenfolge:** Chronologisch (neueste unten) mit Datum/Uhrzeit-Anzeige
5. **CRUD:** Erstellen, Lesen, Bearbeiten, Löschen möglich
6. **Bot-Kommentare:** Architektur vorbereitet (author-Feld), aber nicht im initialen Scope

## Action Items

- [ ] Spec erstellen via `/transfer-and-create-spec`
- [ ] Comment Protocol Types definieren
- [ ] Comment Handler implementieren (Server)
- [ ] `aos-comment-thread` Komponente bauen (Frontend)
- [ ] Comment-Count Badge in Story Card integrieren
- [ ] Detail-Ansicht um Comment-Sektion erweitern

## Questions & Unknowns

Alle Fragen geklärt - bereit für Spec-Erstellung.

---

## Session Summary

**Duration:** 2026-03-14
**Ideas Generated:** 6
**Key Decisions:** 6
**Next Actions:** Spec erstellen

### Main Outcome
Vollständiges Konzept für Trello-Style Kommentare auf Backlog Items. Architektur folgt dem bewährten Attachment-System-Pattern (WebSocket-Protokoll, Handler, Storage Service). Markdown-Support, Bild-Upload (Drag&Drop + Button), chronologische Darstellung mit Timestamps, Edit/Delete für eigene Kommentare.

### Ready for Transfer
- [x] Feature Spec (use: transfer-and-create-spec)
- [ ] Bug Report
- [ ] Needs more brainstorming

### Session Notes
- Attachment-System als Architektur-Vorlage nutzen
- Integrationspunkt: `dashboard-view.ts:renderBacklogStoryDetail()` unter dem `aos-docs-viewer`
- `commentCount` analog zu `attachmentCount` in `StoryInfo` Interface

---

## Transfer Complete

**Transferred to Spec:** 2026-03-14
**Spec Location:** @specwright/specs/2026-03-14-backlog-comments/spec.md
**Additional Information Gathered:** No (Brainstorming war vollständig)
**Status:** Transferred

### Information Added During Transfer
Keine zusätzlichen Informationen nötig - alle Fragen wurden im Brainstorming geklärt.

### Notes
- 6 Feature Stories + 3 System Stories generiert
- Implementation Plan mit Self-Review und Minimalinvasiv-Analyse erstellt
- Nächster Schritt: Technical Refinement (Step 3)
