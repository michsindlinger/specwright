# Backend Preview-Watcher und WebSocket-Integration

> Story ID: DPP-002
> Spec: Document Preview Panel
> Created: 2026-03-09
> Last Updated: 2026-03-09

**Priority**: High
**Type**: Backend
**Estimated Effort**: S
**Dependencies**: DPP-001

---

## Feature

```gherkin
Feature: Backend Preview-Watcher Service
  Als Specwright UI Backend
  moechte ich Preview-Requests aus dem Filesystem erkennen und an verbundene Clients weiterleiten,
  damit das Frontend automatisch auf MCP-Tool-Aufrufe reagieren kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Preview-Request wird erkannt und weitergeleitet

```gherkin
Scenario: Backend erkennt Open-Request und broadcastet an Frontend
  Given das Specwright UI Backend laeuft
  And ein Frontend-Client ist per WebSocket verbunden mit Projekt "/home/user/my-project"
  When eine JSON-Datei "/tmp/specwright-preview-<hash>.json" mit action "open" erstellt wird
  Then liest das Backend den Inhalt der referenzierten Markdown-Datei
  And sendet eine WebSocket-Message "document-preview.open" mit Dateiinhalt an alle Clients des Projekts
  And loescht die JSON-Datei aus /tmp/
```

### Szenario 2: Close-Request wird erkannt und weitergeleitet

```gherkin
Scenario: Backend erkennt Close-Request und broadcastet an Frontend
  Given das Specwright UI Backend laeuft
  And ein Frontend-Client ist per WebSocket verbunden
  When eine JSON-Datei mit action "close" erstellt wird
  Then sendet das Backend eine WebSocket-Message "document-preview.close" an alle Clients des Projekts
  And loescht die JSON-Datei aus /tmp/
```

### Szenario 3: Datei speichern ueber WebSocket

```gherkin
Scenario: Frontend sendet Save-Request fuer editiertes Dokument
  Given das Preview-Panel zeigt ein editiertes Dokument an
  When der User das Dokument speichert
  Then empfaengt das Backend eine "document-preview.save" Message
  And schreibt den aktualisierten Inhalt in die Datei auf dem Filesystem
  And sendet eine Bestaetigung zurueck
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Referenzierte Datei existiert nicht
  Given das Backend beobachtet /tmp/ auf Preview-Requests
  When ein Preview-Request fuer eine nicht-existierende Datei eintrifft
  Then sendet das Backend eine Fehlermeldung "document-preview.error" an die Clients
  And loescht die JSON-Datei aus /tmp/
```

```gherkin
Scenario: Cleanup beim Backend-Start
  Given alte Preview-Request-Dateien liegen in /tmp/ von einem vorherigen Crash
  When das Backend startet
  Then werden alle bestehenden "specwright-preview-*" Dateien in /tmp/ geloescht
```

---

## Technische Verifikation (Automated Checks)

> Wird vom Architect ausgefuellt.

### Datei-Pruefungen
- [ ] FILE_EXISTS: ui/src/server/services/preview-watcher.service.ts
- [ ] FILE_EXISTS: ui/src/server/handlers/document-preview.handler.ts

### Inhalt-Pruefungen
- [ ] CONTAINS: `document-preview.open` in ui/src/server/websocket.ts
- [ ] CONTAINS: `document-preview.close` in ui/src/server/websocket.ts
- [ ] CONTAINS: `document-preview.save` in ui/src/server/websocket.ts
- [ ] CONTAINS: `PreviewWatcher` in ui/src/server/services/preview-watcher.service.ts

### Funktions-Pruefungen
- [ ] BUILD_PASS: `cd ui && npm run build:backend`
- [ ] TEST_PASS: `cd ui && npm test`
- [ ] LINT_PASS: `cd ui && npm run lint`

---

## Required MCP Tools

Keine externen MCP-Tools erforderlich.

---

## Technisches Refinement (vom Architect)

> **WICHTIG:** Dieser Abschnitt wird vom Architect ausgefuellt

### DoR (Definition of Ready) - Vom Architect

#### Fachliche Anforderungen
- [x] Fachliche requirements klar definiert
- [x] Akzeptanzkriterien sind spezifisch und pruefbar
- [x] Business Value verstanden

#### Technische Vorbereitung
- [x] Technischer Ansatz definiert (WAS/WIE/WO)
- [x] Abhaengigkeiten identifiziert
- [x] Betroffene Komponenten bekannt
- [x] Erforderliche MCP Tools dokumentiert (falls zutreffend)
- [x] Story ist angemessen geschaetzt (max 5 Dateien, 400 LOC)

#### Full-Stack Konsistenz (NEU)
- [x] **Alle betroffenen Layer identifiziert**
- [x] **Integration Type bestimmt**
- [x] **Kritische Integration Points dokumentiert**
- [x] **Handover-Dokumente definiert**

**Story ist READY wenn alle Checkboxen angehakt sind.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [ ] Code implementiert und folgt Style Guide
- [ ] Architektur-Vorgaben eingehalten (WIE section)
- [ ] Security/Performance Anforderungen erfuellt

#### Qualitaetssicherung
- [ ] Alle Akzeptanzkriterien erfuellt (via Completion Check verifiziert)
- [ ] Unit Tests geschrieben und bestanden
- [ ] Integration Tests geschrieben und bestanden
- [ ] Code Review durchgefuehrt und genehmigt

#### Dokumentation
- [ ] Dokumentation aktualisiert
- [ ] Keine Linting Errors
- [ ] Completion Check Commands alle erfolgreich (exit 0)

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Backend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Aenderung |
|-------|-------------|----------|
| Backend | PreviewWatcher (neu) | Filewatcher Service fuer /tmp/ |
| Backend | websocket.ts | Neue Message-Handler fuer document-preview.* |

**Kritische Integration Points:**
- PreviewWatcher → WebSocket Broadcast (Backend intern)
- WebSocket → Frontend Gateway (document-preview.open/close Messages)

---

### Technical Details

**WAS:**
- Neuer `PreviewWatcher` Service: Beobachtet `/tmp/` auf `specwright-preview-<hash>.json` Dateien via `fs.watch`
- Neuer `DocumentPreviewHandler`: Verarbeitet `document-preview.save` Messages vom Frontend
- Erweiterung `websocket.ts`: 3 neue Message-Types registrieren (`document-preview.open`, `document-preview.close`, `document-preview.save`)
- Cleanup-Logik beim Backend-Start: Bestehende Preview-Dateien in `/tmp/` loeschen

**WIE (Architektur-Guidance ONLY):**
- PreviewWatcher als eigenstaendiger Service (wie bestehende Services in `ui/src/server/services/`)
- Nutze `fs.watch` (Node.js stdlib) fuer Filewatching - kein neues npm-Paket noetig
- Beim Erkennen einer Preview-Datei: JSON parsen → Datei-Inhalt lesen via `fs.readFileSync` → WebSocket-Broadcast via `webSocketManager.sendToProject()` → Preview-Datei loeschen
- Project-Routing: Hash aus Dateiname extrahieren, auf registrierte Projekte im WebSocketManager matchen
- DocumentPreviewHandler folgt bestehendem Handler-Pattern (wie `FileHandler`): Service-Methoden + Response-Pattern
- Save-Handler nutzt bestehenden `FileService.write()` fuer Dateischreiben (nicht duplizieren)
- Error-Handling: Bei nicht-existierender Datei `document-preview.error` Message senden
- Startup-Cleanup: Im Service-Konstruktor oder `init()` Methode alle `/tmp/specwright-preview-*` loeschen

**WO:**
- `ui/src/server/services/preview-watcher.service.ts` (NEU) - Filewatcher Service
- `ui/src/server/handlers/document-preview.handler.ts` (NEU) - Save-Handler
- `ui/src/server/websocket.ts` - Neue Message-Types im switch-Statement + PreviewWatcher Initialisierung

**Abhaengigkeiten:** DPP-001

**Geschaetzte Komplexitaet:** S

**Relevante Skills:**

| Skill | Pfad | Grund |
|-------|------|-------|
| backend-express | .claude/skills/backend-express/SKILL.md | Express/WebSocket Backend-Patterns |
| domain-specwright-ui | .claude/skills/domain-specwright-ui/SKILL.md | WebSocket-Manager und Service-Patterns |

---

### Integration DoD (Verbindung: MCP-Tool → PreviewWatcher → WebSocket)

- [ ] **Integration hergestellt: PreviewWatcher → WebSocket Broadcast**
  - [ ] PreviewWatcher ruft `webSocketManager.sendToProject()` auf
  - [ ] Verbindung ist funktional (nicht nur Stub)
  - [ ] Validierung: Preview-Datei in /tmp/ erstellen → WebSocket-Message wird gesendet

---

### Creates Reusable Artifacts

**Creates Reusable:** yes

**Reusable Artifacts:**

| Artefakt | Typ | Pfad | Beschreibung |
|----------|-----|------|--------------|
| PreviewWatcher | Service | ui/src/server/services/preview-watcher.service.ts | Filewatcher fuer Preview-Requests mit WebSocket-Broadcast |
| DocumentPreviewHandler | Handler | ui/src/server/handlers/document-preview.handler.ts | Handler fuer document-preview.save Messages |

---

### Completion Check

```bash
# Auto-Verify Commands - alle muessen mit 0 exiten
test -f ui/src/server/services/preview-watcher.service.ts && echo "OK: PreviewWatcher exists"
test -f ui/src/server/handlers/document-preview.handler.ts && echo "OK: Handler exists"
grep -q "document-preview" ui/src/server/websocket.ts && echo "OK: WS message types registered"
grep -q "sendToProject" ui/src/server/services/preview-watcher.service.ts && echo "OK: WS broadcast integrated"
cd ui && npm run build:backend && echo "OK: Backend compiles"
cd ui && npm run lint && echo "OK: Lint passes"
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Aenderungen
