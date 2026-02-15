# Shared Services

> Zentrale Dokumentation für Backend Services, Hooks und Utilities
> Last Updated: 2026-02-13

## Overview

Tabelle aller Shared Services im Projekt:

| Name | Pfad | Props/Signature | Quelle Spec | Datum |
|------|------|-----------------|-------------|-------|
| SpecsReader.getSpecContext | agent-os-ui/src/server/specs-reader.ts | `(projectPath: string, specId: string): Promise<string>` | Chat with the Spec | 2026-02-04 |
| ClaudeHandler.handleChatSend | agent-os-ui/src/server/claude-handler.ts | `(client: WebSocket, content: string, projectPath: string, specId?: string): Promise<void>` | Chat with the Spec | 2026-02-04 |
| CloudTerminalManager | agent-os-ui/src/server/services/cloud-terminal-manager.ts | `class CloudTerminalManager` | Cloud Code Terminal | 2026-02-05 |
| CloudTerminalService | agent-os-ui/ui/src/services/cloud-terminal.service.ts | `class CloudTerminalService` | Cloud Code Terminal | 2026-02-05 |
| CloudTerminalProtocol | agent-os-ui/src/shared/types/cloud-terminal.protocol.ts | `CloudTerminalMessageType` | Cloud Code Terminal | 2026-02-05 |
| GitService | agent-os-ui/src/server/services/git.service.ts | `class GitService` | Git Integration UI | 2026-02-11 |
| GitHandler | agent-os-ui/src/server/handlers/git.handler.ts | `class GitHandler` | Git Integration UI | 2026-02-11 |
| GitProtocol | agent-os-ui/src/shared/types/git.protocol.ts | `GitMessageType` | Git Integration UI | 2026-02-11 |
| Gateway Git Methods | agent-os-ui/ui/src/gateway.ts | `requestGitStatus(), requestGitPull(), requestGitPush(), sendGitCommit(), sendGitCheckout(), sendGitRevert(), sendGitDeleteUntracked(), requestGitPrInfo()` | Git Integration UI + Erweitert | 2026-02-11 |
| SpecsReader.listSpecFiles | agent-os-ui/src/server/specs-reader.ts | `(projectPath: string, specId: string): Promise<SpecFileGroup[]>` | Spec Docs Viewer Extension | 2026-02-12 |
| specs.files WebSocket Handler | agent-os-ui/src/server/websocket.ts | `handleSpecsFiles(client, message, projectPath)` | Spec Docs Viewer Extension | 2026-02-12 |
| Gateway requestSpecFiles | agent-os-ui/ui/src/gateway.ts | `requestSpecFiles(specId: string)` | Spec Docs Viewer Extension | 2026-02-12 |
| Checkbox-Renderer (marked Extension) | agent-os-ui/ui/src/components/docs/aos-docs-viewer.ts | `marked.use({ renderer: { checkbox } })` | Spec Docs Viewer Extension | 2026-02-12 |
| kanban_approve_story MCP Tool | ~/.agent-os/scripts/mcp/kanban-mcp-server.ts | `handleKanbanApproveStory(specPath, { storyId })` | Kanban In Review Column | 2026-02-13 |
| RouterService | agent-os-ui/ui/src/services/router.service.ts | `class RouterService` (Singleton: `routerService`) | Deep Link Navigation | 2026-02-13 |
| RouteTypes | agent-os-ui/ui/src/types/route.types.ts | `ParsedRoute`, `ViewType`, `RouteParams` | Deep Link Navigation | 2026-02-13 |
| SetupService | agent-os-ui/src/server/services/setup.service.ts | `class SetupService extends EventEmitter` (Singleton: `setupService`) | AgentOS Extended Setup Wizard | 2026-02-13 |
| image-upload.utils | agent-os-ui/ui/src/utils/image-upload.utils.ts | `validateImageFile()`, `readFileAsDataUrl()`, `createStagedImage()` | Quick-To-Do | 2026-02-13 |
| BacklogItemStorageService | agent-os-ui/src/server/backlog-item-storage.ts | `class BacklogItemStorageService` | Quick-To-Do | 2026-02-13 |
| Quick-Todo API | agent-os-ui/src/server/routes/quick-todo.routes.ts | `POST /api/backlog/:projectPath/quick-todo` | Quick-To-Do | 2026-02-13 |
| copy-path.ts | agent-os-ui/ui/src/utils/copy-path.ts | `buildSpecFilePath()`, `copyPathToClipboard()` | Copy File Path | 2026-02-13 |

---

## Detail-Dokumentation

### SpecsReader.getSpecContext

**Pfad:** `agent-os-ui/src/server/specs-reader.ts`

**Beschreibung:** Aggregiert den Inhalt einer Spec (spec.md, spec-lite.md, kanban.json) in einen einzelnen String für die Verwendung als LLM-Kontext.

**Usage:**
```typescript
const context = await specsReader.getSpecContext(projectPath, specId);
```

**Source Spec:** Chat with the Spec (2026-02-04)

---

### ClaudeHandler.handleChatSend

**Pfad:** `agent-os-ui/src/server/claude-handler.ts`

**Beschreibung:** Behandelt eingehende Chat-Nachrichten, injiziert optionalen Spec-Kontext und streamt die Antwort von der Anthropic API via WebSocket an den Client.

**Usage:**
```typescript
await claudeHandler.handleChatSend(ws, message.content, projectPath, message.specId);
```

**Source Spec:** Chat with the Spec (2026-02-04)

---

### CloudTerminalManager

**Pfad:** `agent-os-ui/src/server/services/cloud-terminal-manager.ts`

**Beschreibung:** Backend-Service für Multi-Session PTY Management. Verwaltet den Lifecycle von Cloud Terminal Sessions (erstellen, pausieren, fortsetzen, schliessen). Begrenzt auf max 5 gleichzeitige Sessions.

**Usage:**
```typescript
// Session erstellen
const session = await cloudTerminalManager.createSession(projectPath, model);

// Session schliessen
await cloudTerminalManager.closeSession(sessionId);
```

**Source Spec:** Cloud Code Terminal (CCT-001, 2026-02-05)

**Integration Notes:**
- Nutzt bestehenden TerminalManager für PTY-Operationen
- Session-State-Machine: creating -> active -> paused -> closed
- WebSocket Handler in websocket.ts für cloud-terminal Messages

---

### CloudTerminalService

**Pfad:** `agent-os-ui/ui/src/services/cloud-terminal.service.ts`

**Beschreibung:** Frontend-Service für Session-State-Management und Persistenz. Speichert Session-Metadaten in IndexedDB. Handhabt Projektwechsel, Session-Wiederherstellung und Provider-Konfiguration.

**Usage:**
```typescript
// Sessions laden
const sessions = await cloudTerminalService.loadSessions(projectPath);

// Session speichern
await cloudTerminalService.saveSessions(sessions);
```

**Source Spec:** Cloud Code Terminal (CCT-004, 2026-02-05)

**Integration Notes:**
- IndexedDB für Persistenz (nur Metadaten, kein Terminal-Buffer)
- Session-States: active | paused | reconnecting | closed
- MAX_SESSIONS = 5 (konfigurierbar)
- INACTIVITY_TIMEOUT = 30 Minuten

---

### CloudTerminalProtocol

**Pfad:** `agent-os-ui/src/shared/types/cloud-terminal.protocol.ts`

**Beschreibung:** Shared Types für die Cloud Terminal WebSocket-Kommunikation. Definiert Message Types und Interfaces für Frontend-Backend Interaktion.

**Usage:**
```typescript
import { CloudTerminalMessageType } from '../shared/types/cloud-terminal.protocol';
```

**Source Spec:** Cloud Code Terminal (CCT-001, 2026-02-05)

**Integration Notes:**
- Shared zwischen Frontend und Backend
- Message Types: create, close, input, output, created, closed, list, error

---

### GitService

**Pfad:** `agent-os-ui/src/server/services/git.service.ts`

**Beschreibung:** Backend-Service fuer alle Git-Operationen. Nutzt `child_process.execFile` (nicht `exec`) fuer Sicherheit. Alle Operationen haben ein 10-Sekunden-Timeout.

**Usage:**
```typescript
import { gitService } from '../services/git.service.js';

const status = await gitService.getStatus(projectPath);
const branches = await gitService.getBranches(projectPath);
await gitService.checkout(projectPath, branchName);
await gitService.commit(projectPath, files, message);
await gitService.pull(projectPath, { rebase: true });
await gitService.push(projectPath);
// Erweitert (GITE-001):
const result = await gitService.revertFiles(projectPath, files);
await gitService.deleteUntrackedFile(projectPath, filePath);
const prInfo = await gitService.getPrInfo(projectPath);
```

**Source Spec:** Git Integration UI (GIT-001, 2026-02-11), Git Integration Erweitert (GITE-001, 2026-02-11)

**Integration Notes:**
- Singleton-Export als `gitService`
- Alle Methoden sind async und werfen `GitError` bei Fehlern
- Strukturierte Return-Types fuer jeden Befehl
- `revertFiles()`: Batch-Revert mit partiellem Erfolg, handled staged + unstaged
- `deleteUntrackedFile()`: Loescht untracked Dateien via `fs.unlink`, prueft tracked-Status
- `getPrInfo()`: Via `gh pr view --json`, In-Memory Cache mit 60s TTL, graceful null bei Fehler

---

### GitHandler

**Pfad:** `agent-os-ui/src/server/handlers/git.handler.ts`

**Beschreibung:** WebSocket Message Handler fuer Git-Operationen. Delegiert an GitService und sendet strukturierte Responses zurueck.

**Usage:**
```typescript
import { gitHandler } from './handlers/git.handler.js';

// In websocket.ts message switch:
case 'git:status':
  gitHandler.handleStatus(ws, message, projectPath);
  break;
```

**Source Spec:** Git Integration UI (GIT-001, 2026-02-11)

**Integration Notes:**
- Folgt dem Handler Extraction Pattern (wie queue.handler.ts)
- Empfaengt WebSocket Client und Message
- Error Handling mit strukturierten Fehlercodes (GIT_ERROR_CODES)

---

### GitProtocol

**Pfad:** `agent-os-ui/src/shared/types/git.protocol.ts`

**Beschreibung:** Shared Types fuer die Git WebSocket-Kommunikation. Definiert Message Types und Interfaces fuer alle Git-Operationen.

**Usage:**
```typescript
import type { GitStatusData, GitBranchEntry } from '../../shared/types/git.protocol.js';
import { GIT_CONFIG, GIT_ERROR_CODES } from '../../shared/types/git.protocol.js';
```

**Message Types:**
- `git:status` / `git:status:response` - Status abfragen
- `git:branches` / `git:branches:response` - Branches auflisten
- `git:commit` / `git:commit:response` - Commit ausfuehren
- `git:pull` / `git:pull:response` - Pull ausfuehren
- `git:push` / `git:push:response` - Push ausfuehren
- `git:checkout` / `git:checkout:response` - Branch wechseln
- `git:revert` / `git:revert:response` - Dateien reverten (GITE-001)
- `git:delete-untracked` / `git:delete-untracked:response` - Untracked Datei loeschen (GITE-001)
- `git:pr-info` / `git:pr-info:response` - PR-Info abrufen (GITE-001)

**Source Spec:** Git Integration UI (GIT-001, 2026-02-11), Git Integration Erweitert (GITE-001, 2026-02-11)

**Integration Notes:**
- Shared zwischen Frontend und Backend
- Folgt exakt dem Pattern von cloud-terminal.protocol.ts
- Enthaelt auch Config-Konstanten (GIT_CONFIG) und Error-Codes (GIT_ERROR_CODES)
- Neue Interfaces: `GitPrInfo`, `GitRevertResult` (GITE-001)

---

### Gateway Git Methods

**Pfad:** `agent-os-ui/ui/src/gateway.ts`

**Beschreibung:** Frontend Gateway-Erweiterungen fuer Git-Operationen. Bietet typisierte Methoden zum Senden von Git-Messages ueber WebSocket.

**Usage:**
```typescript
// In app.ts
gateway.requestGitStatus();
gateway.requestGitPull(rebase);
gateway.requestGitPush();
gateway.sendGitCommit(files, message);
gateway.sendGitCheckout(branch);
// Erweitert (GITE-001/002/003):
gateway.sendGitRevert(files);
gateway.sendGitDeleteUntracked(file);
gateway.requestGitPrInfo();
```

**Source Spec:** Git Integration UI (GIT-002/003/004/005, 2026-02-11)

**Integration Notes:**
- Methoden auf bestehendem Gateway Singleton hinzugefuegt
- Response Handler im bestehenden onMessage Switch
- Callbacks an app.ts via Property-basiertes Pattern

---

### SpecsReader.listSpecFiles

**Pfad:** `agent-os-ui/src/server/specs-reader.ts`

**Beschreibung:** Rekursive Methode die alle Markdown-Dateien eines Spec-Ordners findet und nach Verzeichnis gruppiert zurueckgibt. Inkl. Path-Traversal-Schutz.

**Usage:**
```typescript
const groups = await specsReader.listSpecFiles(projectPath, specId);
// Returns: [{ folder: 'root', files: [{relativePath, filename}] }, { folder: 'stories', files: [...] }]
```

**Source Spec:** Spec Docs Viewer Extension (SDVE-001, 2026-02-12)

**Integration Notes:**
- Root-Dateien zuerst, dann Unterordner alphabetisch
- Nur `*.md` Dateien
- Path-Validierung: resolve() + relative() Check

---

### specs.files WebSocket Handler

**Pfad:** `agent-os-ui/src/server/websocket.ts`

**Beschreibung:** WebSocket Handler fuer den Message-Typ `specs.files`. Liefert eine gruppierte Liste aller Markdown-Dateien eines Specs.

**Usage:**
```typescript
// Client sendet:
{ type: 'specs.files', specId: '2026-02-12-my-feature' }

// Server antwortet:
{ type: 'specs.files', specId, groups: [{ folder, files: [{relativePath, filename}] }] }
```

**Source Spec:** Spec Docs Viewer Extension (SDVE-001, 2026-02-12)

**Integration Notes:**
- Erweiterung: `specs.read` und `specs.save` akzeptieren nun `relativePath` neben bestehendem `fileType`
- Backward-kompatibel: `fileType: 'spec'` wird intern auf `relativePath: 'spec.md'` gemappt

---

### Gateway requestSpecFiles

**Pfad:** `agent-os-ui/ui/src/gateway.ts`

**Beschreibung:** Frontend Gateway Convenience-Methode zum Abfragen aller Spec-Dateien.

**Usage:**
```typescript
gateway.requestSpecFiles(specId);
```

**Source Spec:** Spec Docs Viewer Extension (SDVE-003, 2026-02-12)

**Integration Notes:**
- Folgt dem Pattern von `requestSpecsList()`
- Response wird im kanban-board.ts `specs.files` Handler verarbeitet

---

### Checkbox-Renderer (marked Extension)

**Pfad:** `agent-os-ui/ui/src/components/docs/aos-docs-viewer.ts`

**Beschreibung:** Custom marked.js Renderer Extension die Checkboxen in Markdown-Dokumenten interaktiv macht. Checkboxen erhalten `data-checkbox-index` Attribute und sind anklickbar. Toggle-Logik aktualisiert Raw-Markdown und ueberspringt dabei Fenced Code Blocks.

**Usage:**
```typescript
// Wird automatisch aktiviert wenn aos-docs-viewer Markdown rendert
// Event Handler in Parent-Komponente:
@checkbox-toggled=${this.handleCheckboxToggled}
```

**Source Spec:** Spec Docs Viewer Extension (SDVE-004, 2026-02-12)

**Integration Notes:**
- Checkboxen in Code-Blocks bleiben nicht-interaktiv
- `checkbox-toggled` Event mit `{ content: string }` (aktualisierter Raw-Markdown)
- Parent (kanban-board.ts) faengt Event und triggert `specs.save`
- Globaler Checkbox-Index-Counter wird pro `renderMarkdown()` Aufruf zurueckgesetzt

---

### kanban_approve_story MCP Tool

**Pfad:** `~/.agent-os/scripts/mcp/kanban-mcp-server.ts`

**Beschreibung:** Neues MCP Tool zum Genehmigen von Stories die sich im Status `in_review` befinden. Setzt Story-Status von `in_review` auf `done`, aktualisiert Timing, Verification, boardStatus und changeLog. Guard: Nur von `in_review` Status aufrufbar.

**Usage:**
```typescript
// MCP Tool Call:
{
  "tool": "kanban_approve_story",
  "arguments": {
    "specId": "2026-02-12-my-feature",
    "storyId": "FEAT-001"
  }
}
// Returns: { success: true, story: { id, title, status: "done" }, remaining: N }
```

**Props/API:**
| Parameter | Typ | Beschreibung |
|-----------|-----|--------------|
| specId | string | Spec ID (Pflicht) |
| storyId | string | Story ID die genehmigt werden soll (Pflicht) |

**Source Spec:** Kanban In Review Column (KIRC-002, 2026-02-13)

**Integration Notes:**
- Nur Stories mit `status === 'in_review'` koennen genehmigt werden (sonst Error)
- Wird vom `/execute-tasks` Workflow genutzt und vom Frontend via Drag&Drop (in_review -> done)
- Companion zu `kanban_complete_story` (setzt auf `in_review`) im In Review Workflow

---

### RouterService

**Pfad:** `agent-os-ui/ui/src/services/router.service.ts`

**Beschreibung:** Singleton Router-Service fuer Hash-basierte URL-Navigation. Parst `#/view/param1/param2` URLs, emittiert `route-changed` Events, bietet programmatische `navigate()` Methode. Verhindert Infinite Loops durch Pending-Navigation-Flag.

**Usage:**
```typescript
import { routerService } from '../services/router.service.js';

// Navigation
routerService.navigate('dashboard', { specId: '2026-02-10-my-feature', tab: 'kanban' });

// Route lesen
const route = routerService.getCurrentRoute();
// { view: 'dashboard', params: { specId: '...', tab: 'kanban' }, segments: ['dashboard', 'spec', '...', 'kanban'] }

// Events subscriben
const handler = (route: ParsedRoute) => { /* ... */ };
routerService.on('route-changed', handler);
routerService.off('route-changed', handler);
```

**Props/API:**
| Methode | Signatur | Beschreibung |
|---------|----------|--------------|
| navigate | `(view: string, params?: Record<string, string>)` | Programmatische Navigation mit URL-Update |
| getCurrentRoute | `(): ParsedRoute` | Gibt aktuelle geparste Route zurueck |
| on | `(event: string, handler: Function)` | Event-Subscription (route-changed) |
| off | `(event: string, handler: Function)` | Event-Unsubscription |

**Source Spec:** Deep Link Navigation (DLN-001, 2026-02-13)

**Integration Notes:**
- Singleton-Export als `routerService` (folgt `projectStateService` Pattern)
- Event-Pattern folgt `gateway.on()`/`gateway.off()` mit `Map<string, Set<Handler>>`
- `window.addEventListener('hashchange', ...)` wird im Service registriert
- URL-Parsing ist synchron, keine async Operationen
- Leere Segmente werden gefiltert (`#/dashboard///` → `['dashboard']`)
- Alle Views (dashboard, chat, workflows, settings) nutzen diesen Service

---

### RouteTypes

**Pfad:** `agent-os-ui/ui/src/types/route.types.ts`

**Beschreibung:** Shared Type-Definitionen fuer das Routing-System. Definiert `ParsedRoute` Interface, `ViewType` Union und Route-Konstanten.

**Usage:**
```typescript
import type { ParsedRoute, ViewType } from '../types/route.types.js';
```

**Props/API:**
| Type | Definition | Beschreibung |
|------|-----------|--------------|
| ViewType | `'dashboard' \| 'chat' \| 'workflows' \| 'settings' \| 'not-found'` | Union Type fuer alle Views |
| ParsedRoute | `{ view: ViewType, params: Record<string, string>, segments: string[] }` | Geparste Route mit View, Params und rohen Segmenten |

**Source Spec:** Deep Link Navigation (DLN-001, 2026-02-13)

**Integration Notes:**
- Shared zwischen RouterService und allen Views
- `params` enthaelt view-spezifische Parameter (z.B. `specId`, `tab`, `workflowId`)
- `segments` enthaelt die rohen URL-Segmente fuer Custom-Parsing

---

### SetupService

**Pfad:** `agent-os-ui/src/server/services/setup.service.ts`

**Beschreibung:** Backend-Service fuer den AgentOS Extended Setup Wizard. Prueft den Installationsstatus aller 4 Setup-Schritte via Dateisystem-Checks und fuehrt Installations-Commands als Child-Prozesse aus mit Live-Output-Streaming ueber EventEmitter.

**Usage:**
```typescript
import { setupService } from '../services/setup.service.js';

// Status pruefen
const steps = await setupService.checkStatus(projectPath);
// Returns: SetupStepStatus[] mit { step, name, status, details? }

// Step ausfuehren (Events fuer Streaming)
setupService.runStep(1, projectPath);
setupService.on('step-output', (data) => { /* { step, data } */ });
setupService.on('step-complete', (data) => { /* { step, success, exitCode? } */ });
```

**Props/API:**
| Methode | Signatur | Beschreibung |
|---------|----------|--------------|
| checkStatus | `(projectPath: string): Promise<SetupStepStatus[]>` | Prueft Installationsstatus aller 4 Schritte |
| runStep | `(step: 1\|2\|3, projectPath: string): void` | Fuehrt Installations-Command aus (Guards gegen parallele Ausfuehrung) |

**Events:**
| Event | Payload | Beschreibung |
|-------|---------|--------------|
| step-output | `{ step: number, data: string }` | Live-Output vom Shell-Prozess |
| step-complete | `{ step: number, success: boolean, exitCode?: number }` | Shell-Prozess beendet |

**Source Spec:** AgentOS Extended Setup Wizard (SETUP-001/002, 2026-02-13)

**Integration Notes:**
- Singleton-Export als `setupService`
- Erweitert `EventEmitter` (Node.js `events` Modul)
- Shell-Commands sind hardcoded (kein User-Input → sicher)
- Guard: `runningStep` Property verhindert parallele Ausfuehrung
- Wird von WebSocket Handler in websocket.ts genutzt (setup:check-status, setup:run-step)

---

### image-upload.utils

**Pfad:** `agent-os-ui/ui/src/utils/image-upload.utils.ts`

**Beschreibung:** Wiederverwendbare Bild-Upload-Funktionen fuer Validierung, File-Reading und StagedImage-Erstellung. Extrahiert aus chat-view.ts und wird sowohl vom Chat als auch vom Quick-To-Do Modal genutzt.

**Usage:**
```typescript
import { validateImageFile, createStagedImage, MAX_IMAGES } from '../utils/image-upload.utils.js';
import type { StagedImage } from '../utils/image-upload.utils.js';

// Validierung
const error = validateImageFile(file, currentImages.length);
if (error) { showError(error); return; }

// StagedImage erstellen
const staged = await createStagedImage(file);
```

**Exports:**
| Export | Typ | Beschreibung |
|--------|-----|--------------|
| ALLOWED_MIME_TYPES | string[] | Erlaubte MIME-Types: PNG, JPEG, GIF, WebP |
| MAX_FILE_SIZE | number | 5 * 1024 * 1024 (5MB) |
| MAX_IMAGES | number | 5 |
| validateImageFile | (file: File, currentCount: number) => string \| null | Validiert Format, Groesse, Anzahl |
| readFileAsDataUrl | (file: File) => Promise\<string\> | Liest File als Data-URL |
| createStagedImage | (file: File) => Promise\<StagedImage\> | Erstellt StagedImage mit ID |
| StagedImage | Type (re-export) | { file: File, dataUrl: string, id: string } |

**Source Spec:** Quick-To-Do (QTD-002, 2026-02-13)

**Integration Notes:**
- StagedImage Type wird aus chat-view.ts re-exportiert
- Verwendet von: `aos-quick-todo-modal.ts`, `chat-view.ts`
- Pure Functions ohne Side Effects

---

### BacklogItemStorageService

**Pfad:** `agent-os-ui/src/server/backlog-item-storage.ts`

**Beschreibung:** Backend Service fuer atomische Backlog-Item-Erstellung mit optionalen Bild-Attachments. Erstellt/verwaltet backlog-index.json und individuelle Markdown-Dateien pro Item.

**Usage:**
```typescript
import { BacklogItemStorageService } from '../backlog-item-storage.js';

const storage = new BacklogItemStorageService();
const result = await storage.createItem(projectPath, {
  title: 'Neue Idee',
  description: 'Optionale Beschreibung',
  priority: 'medium',
  images: [{ data: 'base64...', filename: 'screenshot.png', mimeType: 'image/png' }]
});
// Returns: { success: true, itemId: 'ITEM-001', file: 'items/item-001.md' }
```

**API:**
| Methode | Signatur | Beschreibung |
|---------|----------|--------------|
| createItem | `(projectPath: string, request: CreateQuickTodoRequest): Promise<CreateItemResult>` | Erstellt Item atomar (Verzeichnisse, Index, Markdown, Bilder) |

**Types:**
| Type | Beschreibung |
|------|--------------|
| CreateQuickTodoRequest | { title: string, description?: string, priority: string, images?: Array<{ data, filename, mimeType }> } |
| CreateItemResult | { success: boolean, itemId?: string, file?: string, error?: string } |

**Source Spec:** Quick-To-Do (QTD-003, 2026-02-13)

**Integration Notes:**
- Atomische Index-Updates via tmp-file + rename
- Automatische Verzeichniserstellung (mkdir recursive)
- Filename-Sanitization gegen Path-Traversal
- Bilder werden als Dateien in `items/attachments/ITEM-XXX/` gespeichert
- Generiert Markdown mit Frontmatter-aehnlichem Header

---

### Quick-Todo API

**Pfad:** `agent-os-ui/src/server/routes/quick-todo.routes.ts`

**Beschreibung:** Express Router mit POST-Endpoint fuer schnelle Backlog-Eintraege. Validiert Input, delegiert an BacklogItemStorageService.

**Usage:**
```typescript
// Registration in index.ts:
import quickTodoRouter from './routes/quick-todo.routes.js';
app.use('/api/backlog', quickTodoRouter);

// Client-Call:
const res = await fetch(`/api/backlog/${encodeURIComponent(projectPath)}/quick-todo`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ title, description, priority, images })
});
```

**Endpoint:**
| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | /api/backlog/:projectPath/quick-todo | CreateQuickTodoRequest | 201: { success, itemId, file } |

**Validierung:**
- title: required, non-empty string
- priority: required, one of 'low', 'medium', 'high', 'critical'
- Body-Limit: 30MB (fuer Base64-kodierte Bilder)

**Source Spec:** Quick-To-Do (QTD-003, 2026-02-13)

**Integration Notes:**
- Body-Limit auf 30MB erhoet fuer Base64-Bilder
- Nutzt BacklogItemStorageService fuer die eigentliche Speicherung
- URL-dekodiert projectPath Parameter

---

### copy-path.ts

**Pfad:** `agent-os-ui/ui/src/utils/copy-path.ts`

**Beschreibung:** Wiederverwendbare Utility-Funktionen fuer das Kopieren von Spec-Dateipfaden in die Zwischenablage. Baut vollstaendige Pfade aus specId und relativePath zusammen und handhabt das Clipboard-Feedback (Icon-Wechsel mit Timer).

**Usage:**
```typescript
import { buildSpecFilePath, copyPathToClipboard } from '../utils/copy-path.js';

// Pfad bauen
const path = buildSpecFilePath('2026-02-13-feature', 'stories/story-001.md');
// Returns: 'agent-os/specs/2026-02-13-feature/stories/story-001.md'

// In Zwischenablage kopieren mit visuellem Feedback
await copyPathToClipboard(path, buttonElement);
// Button erhaelt 'copy-path--copied' Klasse fuer 2 Sekunden
```

**Exports:**
| Export | Typ | Beschreibung |
|--------|-----|--------------|
| buildSpecFilePath | (specId: string, relativePath: string) => string | Baut vollstaendigen Spec-Dateipfad |
| copyPathToClipboard | (path: string, button: HTMLElement) => Promise\<void\> | Kopiert Pfad und zeigt Feedback |

**Source Spec:** Copy File Path (CFP-001, 2026-02-13)

**Integration Notes:**
- Verwendet von: `story-card.ts`, `kanban-board.ts`, `aos-spec-file-tabs.ts`
- Nutzt `navigator.clipboard.writeText()` (erfordert Secure Context)
- Feedback via CSS-Klasse `copy-path--copied` (2s Timer)
- Pure Functions, kein State
