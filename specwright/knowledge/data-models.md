# Data Models

> Verfügbare Datenmodelle, Schemas und Types im Projekt.
> Zuletzt aktualisiert: 2026-03-14 (Backlog Item Comments)

## Modelle-Übersicht

| Modell/Type | Pfad | Typ | Erstellt in Spec |
|-------------|------|-----|------------------|
| file.protocol.ts | ui/src/shared/types/file.protocol.ts | Shared Types | File Editor (2026-02-16) |
| SkillSummary | ui/src/shared/types/team.protocol.ts | Interface | Dev-Team Visualization (2026-02-26) |
| SkillDetail | ui/src/shared/types/team.protocol.ts | Interface | Dev-Team Visualization (2026-02-26) |
| McpServerSummary | ui/src/shared/types/team.protocol.ts | Interface | MCP Tools Management (2026-02-27) |
| voice.protocol.ts | ui/src/shared/types/voice.protocol.ts | Shared Types | Voice Call Conversational Flow (2026-03-01) |
| comment.protocol.ts | ui/src/shared/types/comment.protocol.ts | Shared Types | Backlog Item Comments (2026-03-14) |

---

## Domain Models

### file.protocol.ts

**Pfad:** `ui/src/shared/types/file.protocol.ts`
**Typ:** Shared Protocol Types
**Erstellt:** File Editor (2026-02-16)

**Beschreibung:** TypeScript-Interfaces für alle datei-bezogenen WebSocket-Messages zwischen Frontend und Backend.

**Message Types:**
| Message | Direction | Description |
|---------|-----------|-------------|
| files:list | Client → Server | Verzeichnisinhalt anfordern |
| files:list:response | Server → Client | Verzeichnisinhalt |
| files:list:error | Server → Client | Fehler beim Auflisten |
| files:read | Client → Server | Dateiinhalt anfordern |
| files:read:response | Server → Client | Dateiinhalt |
| files:read:error | Server → Client | Fehler beim Lesen |
| files:write | Client → Server | Dateiinhalt speichern |
| files:write:response | Server → Client | Speichererfolg |
| files:write:error | Server → Client | Fehler beim Speichern |
| files:create | Client → Server | Neue Datei erstellen |
| files:mkdir | Client → Server | Neues Verzeichnis erstellen |
| files:rename | Client → Server | Datei/Ordner umbenennen |
| files:delete | Client → Server | Datei/Ordner löschen |

**Key Interfaces:**
```typescript
interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
}

interface FileTab {
  path: string;
  filename: string;
  isModified: boolean;
}
```

---

### team.protocol.ts (SkillSummary, SkillDetail)

**Pfad:** `ui/src/shared/types/team.protocol.ts`
**Typ:** Shared Protocol Types (REST API)
**Erstellt:** Dev-Team Visualization (2026-02-26)

**Beschreibung:** TypeScript-Interfaces für die Skills/Team REST-API. Definiert den Vertrag zwischen Frontend und Backend für das Lesen von Skill-Definitionen.

**Key Interfaces:**
```typescript
interface SkillSummary {
  id: string;              // Skill directory name
  name: string;            // Display name from SKILL.md
  description: string;     // Description from frontmatter
  category: string;        // Inferred from directory name prefix
  learningsCount: number;  // Entries in dos-and-donts.md
  globs: string[];         // Glob patterns from frontmatter
  alwaysApply: boolean;    // Whether skill is always applied
}

interface SkillDetail extends SkillSummary {
  skillContent: string;        // Full SKILL.md content (raw markdown)
  dosAndDontsContent: string;  // Full dos-and-donts.md content
  subDocuments: string[];      // Other .md files in skill directory
}

interface SkillsListResponse {
  success: boolean;
  skills?: SkillSummary[];
  error?: string;
}

interface SkillDetailResponse {
  success: boolean;
  skill?: SkillDetail;
  error?: string;
}
```

---

### McpServerSummary

**Pfad:** `ui/src/shared/types/team.protocol.ts`
**Typ:** Interface
**Erstellt:** MCP Tools Management (2026-02-27)

**Beschreibung:** Interface für MCP-Server-Daten, die vom Backend an das Frontend geliefert werden. Enthält nur nicht-sensitive Informationen.

**Interface:**
```typescript
interface McpServerSummary {
  name: string;      // Server-Name (key aus .mcp.json)
  type: string;      // Server-Typ ("stdio", "sse", etc.)
  command: string;    // Ausführbarer Befehl
  args: string[];     // Kommandozeilen-Argumente
}

interface McpConfigResponse {
  success: boolean;
  servers?: McpServerSummary[];
  message?: string;
  error?: string;
}
```

**Notes:**
- env-Feld wird bewusst NICHT included (Security)
- Wird von McpConfigReaderService erzeugt
- Wird von aos-mcp-server-card und team-view.ts konsumiert
- mcpTools in SkillSummary/SkillDetail referenziert Server-Namen

---

### voice.protocol.ts

**Pfad:** `ui/src/shared/types/voice.protocol.ts`
**Typ:** Shared Protocol Types (WebSocket)
**Erstellt:** Voice Call Conversational Flow (2026-03-01)

**Beschreibung:** TypeScript-Interfaces fuer alle voice:* WebSocket-Messages zwischen Frontend und Backend. Definiert den Vertrag fuer Voice Call Kommunikation.

**Message Types:**
| Message | Direction | Description |
|---------|-----------|-------------|
| voice:call:start | Client -> Server | Voice Call starten |
| voice:call:end | Client -> Server | Voice Call beenden |
| voice:audio:chunk | Client -> Server | Audio-Chunk senden |
| voice:stt:interim | Server -> Client | Zwischenergebnis STT |
| voice:stt:final | Server -> Client | Endergebnis STT |
| voice:tts:chunk | Server -> Client | TTS Audio-Chunk |
| voice:tts:end | Server -> Client | TTS-Ausgabe beendet |
| voice:agent:action | Server -> Client | Agent-Aktion (Tool-Call) |
| voice:text:input | Client -> Server | Text-Input (Fallback-Modus) |

**Notes:**
- Folgt dem gleichen Pattern wie file.protocol.ts und team.protocol.ts
- Responses folgen dem Pattern `voice:{category}:{action}`
- Shared zwischen Frontend und Backend (ui/src/shared/types/)

---

### comment.protocol.ts

**Pfad:** `ui/src/shared/types/comment.protocol.ts`
**Typ:** Shared Protocol Types (WebSocket)
**Erstellt:** Backlog Item Comments (2026-03-14)

**Beschreibung:** TypeScript-Interfaces und -Types für alle comment:* WebSocket-Messages zwischen Frontend und Backend. Definiert den Vertrag für Comment CRUD-Operationen auf Backlog-Items inkl. Bild-Upload.

**Message Types:**
| Message | Direction | Description |
|---------|-----------|-------------|
| comment:create | Client → Server | Neuen Kommentar erstellen |
| comment:list | Client → Server | Alle Kommentare eines Items laden |
| comment:update | Client → Server | Kommentar bearbeiten |
| comment:delete | Client → Server | Kommentar löschen |
| comment:upload-image | Client → Server | Bild hochladen (Base64) |
| comment:create:response | Server → Client | Erstellter Kommentar + count |
| comment:list:response | Server → Client | Alle Kommentare + count |
| comment:update:response | Server → Client | Aktualisierter Kommentar |
| comment:delete:response | Server → Client | Gelöschte commentId + count |
| comment:upload-image:response | Server → Client | Filename, path, size, mimeType |
| comment:error | Server → Client | Fehler-Response mit code + operation |

**Key Interfaces:**
```typescript
interface Comment {
  id: string;           // cmt-{timestamp}
  author: string;
  text: string;         // Markdown supported
  createdAt: string;    // ISO 8601
  editedAt?: string;    // Set when updated
  imageFilename?: string;
}

// Error codes
const COMMENT_ERROR_CODES = {
  ITEM_NOT_FOUND, COMMENT_NOT_FOUND, PATH_TRAVERSAL,
  STORAGE_ERROR, FILE_TOO_LARGE, INVALID_FILE_TYPE, OPERATION_FAILED
}

// Config
const COMMENT_CONFIG = {
  MAX_IMAGE_SIZE_BYTES: 5 * 1024 * 1024,  // 5 MB
  ALLOWED_IMAGE_TYPES: Set<string>         // png, jpeg, jpg, gif, webp
}
```

**Notes:**
- Folgt dem gleichen Pattern wie `file.protocol.ts` und `voice.protocol.ts`
- Union-Types: `CommentClientMessage`, `CommentServerMessage`, `CommentMessage`
- Shared zwischen Frontend und Backend (ui/src/shared/types/)

---

*Template Version: 1.0*
