# Claude Vision Integration

> Story ID: CIMG-007
> Spec: Chat Image Attachments
> Created: 2026-02-02
> Last Updated: 2026-02-02

**Status**: Done

**Priority**: High
**Type**: Backend
**Estimated Effort**: S (3 SP)
**Dependencies**: CIMG-003, CIMG-004

---

## Feature

```gherkin
Feature: Claude Vision Integration
  Als Entwickler
  möchte ich dass Claude die angehängten Bilder "sehen" kann,
  damit Claude mir Fragen zu Screenshots, Diagrammen und Code-Bildern beantworten kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Bilder an Claude CLI übergeben

```gherkin
Scenario: Bilder werden an Claude CLI als --image Flag übergeben
  Given eine Nachricht mit 2 Bildern wurde empfangen
  And die Bilder wurden unter .agent-os/chat-images/ gespeichert
  When Claude Code aufgerufen wird
  Then enthält der CLI-Aufruf "--image /pfad/zum/bild1.png --image /pfad/zum/bild2.png"
```

### Szenario 2: Claude beschreibt ein Bild

```gherkin
Scenario: Claude antwortet mit Bild-Beschreibung
  Given ich habe ein Screenshot eines Fehlers gesendet
  And ich habe gefragt "Was siehst du auf diesem Screenshot?"
  When Claude antwortet
  Then beschreibt Claude den Inhalt des Screenshots
  And die Antwort referenziert visuelle Elemente
```

### Szenario 3: Mehrere Bilder in einer Anfrage

```gherkin
Scenario: Claude vergleicht mehrere Bilder
  Given ich habe 2 Screenshots gesendet (vorher/nachher)
  And ich habe gefragt "Was ist der Unterschied zwischen diesen Bildern?"
  When Claude antwortet
  Then beschreibt Claude die Unterschiede zwischen beiden Bildern
```

### Szenario 4: Nachricht nur mit Bildern (ohne Text)

```gherkin
Scenario: Claude reagiert auf Bilder ohne Text
  Given ich habe nur ein Bild ohne Text gesendet
  When Claude antwortet
  Then beschreibt Claude was auf dem Bild zu sehen ist
  And fragt ggf. was ich dazu wissen möchte
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Bild-Pfad existiert nicht mehr
  Given ein Bild wurde nach dem Senden gelöscht
  When Claude aufgerufen wird
  Then wird ein Fehler geloggt
  And Claude erhält die Nachricht ohne das fehlende Bild
  And der User erhält eine Warnung "Bild konnte nicht geladen werden"
```

```gherkin
Scenario: Claude CLI unterstützt --image nicht
  Given eine ältere Version von Claude CLI ohne Vision-Support
  When versucht wird Bilder zu übergeben
  Then wird ein Fehler geloggt
  And der User erhält die Meldung "Aktuelle Claude CLI Version unterstützt keine Bilder"
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [x] FILE_EXISTS: agent-os-ui/src/server/claude-handler.ts (wird erweitert)

### Inhalt-Prüfungen

- [x] CONTAINS: claude-handler.ts enthält "--image"
- [x] CONTAINS: claude-handler.ts enthält "images"
- [x] CONTAINS: claude-handler.ts enthält "handleChatSendWithImages"

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
- [x] Unit Tests geschrieben und bestanden
- [x] Code Review durchgeführt und genehmigt

#### Dokumentation
- [x] Dokumentation aktualisiert
- [x] Keine Linting Errors
- [x] Completion Check Commands alle erfolgreich

---

### Betroffene Layer & Komponenten

**Integration Type:** Backend-only

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Backend | `claude-handler.ts` | `--image` Flag bei CLI-Aufruf, handleChatSendWithImages |
| Backend | `websocket.ts` | handleChatSendWithImages aufrufen statt handleChatSend |

**Kritische Integration Points:**
- Backend claude-handler.ts -> Claude CLI (`--image <path>` Flag)
- Pfad-Validierung: Bilder muessen existieren bevor CLI aufgerufen wird

---

### Technical Details

**WAS:**
- **claude-handler.ts erweitern:**
  - Neue Methode `handleChatSendWithImages(client, message, projectPath, imagePaths: string[])`
  - Oder: bestehende `handleChatSend` um optionalen `images` Parameter erweitern
  - CLI-Args bauen: `--image /absoluter/pfad/bild1.png --image /pfad/bild2.jpg`
  - Mehrere `--image` Flags fuer mehrere Bilder
  - Pfad-Validierung: fs.existsSync vor CLI-Aufruf
  - Error Handling: Warnung wenn Bild nicht existiert, aber trotzdem fortfahren
- **websocket.ts:**
  - Im `handleChatSendWithImages` Handler: Bild-Pfade aus ImageStorageService
  - Absolute Pfade konstruieren: `path.join(projectPath, imagePath)`

**WIE (Architecture Guidance):**
- Pattern: CLI Args Array erweitern wie in `streamClaudeCodeResponse`
- Referenz: Bestehendes spawn()-Pattern in claude-handler.ts
- Referenz: cliArgs Array Aufbau: `[...modelArgs, '--print', '--verbose', ...]`
- Constraint: Nur absolute Pfade an Claude CLI, keine relativen
- Constraint: Pfade mit Leerzeichen korrekt behandeln (spawn macht das automatisch)
- Error Handling: Fehlende Bilder loggen aber nicht abbrechen
- Fallback: Wenn Claude CLI `--image` nicht unterstuetzt, Fehler loggen und ohne Bilder fortfahren

**WO:**
- Modify: `agent-os-ui/src/server/claude-handler.ts`
- Modify: `agent-os-ui/src/server/websocket.ts` (handleChatSendWithImages aufrufen)

**WER:** dev-team__backend-developer

**Abhängigkeiten:** CIMG-003, CIMG-004

**Geschätzte Komplexität:** S

**Relevante Skills:** N/A

**Creates Reusable:** no

---

### Completion Check

```bash
# Verify --image flag in claude-handler
grep -q '"\-\-image"' agent-os-ui/src/server/claude-handler.ts && echo "OK: --image flag" || exit 1

# Verify images handling
grep -q "images" agent-os-ui/src/server/claude-handler.ts && echo "OK: images handling" || exit 1

# Verify handleChatSendWithImages exists or images parameter
grep -qE "(handleChatSendWithImages|images.*string\[\])" agent-os-ui/src/server/claude-handler.ts && echo "OK: images method/param" || exit 1

# Lint check
cd agent-os-ui && npm run lint

# Build check
cd agent-os-ui && npm run build
```
