# Chat Interface

> Story ID: AOSUI-004
> Spec: Agent OS Web UI
> Created: 2026-01-30
> Last Updated: 2026-01-30

**Priority**: High
**Type**: Full-stack
**Estimated Effort**: M
**Dependencies**: AOSUI-001, AOSUI-002, AOSUI-003
**Status**: Done

---

## Feature

```gherkin
Feature: Chat Interface für Claude Code
  Als Benutzer
  möchte ich eine Chat-Oberfläche haben,
  damit ich direkt mit Claude Code kommunizieren kann wie im Terminal.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Nachricht senden

```gherkin
Scenario: Benutzer sendet eine Nachricht
  Given ich bin im Chat-View
  And ein Projekt ist ausgewählt
  When ich "Zeige mir die README" eingebe
  And ich auf Senden klicke (oder Enter drücke)
  Then erscheint meine Nachricht im Chat-Verlauf
  And ich sehe einen Loading-Indicator
```

### Szenario 2: Streaming Response

```gherkin
Scenario: Antwort wird gestreamt
  Given ich habe eine Nachricht gesendet
  When Claude Code antwortet
  Then sehe ich die Antwort Wort für Wort erscheinen
  And der Text scrollt automatisch mit
  And ich kann die volle Antwort lesen sobald sie fertig ist
```

### Szenario 3: Tool-Calls visualisieren

```gherkin
Scenario: Tool-Nutzung wird angezeigt
  Given ich habe "Lies die package.json" gesendet
  When Claude Code das Read-Tool aufruft
  Then sehe ich einen Badge "Read" mit dem Dateipfad
  And das Tool-Ergebnis wird eingeklappt angezeigt
  And ich kann es ausklappen um den Inhalt zu sehen
```

### Szenario 4: Code-Highlighting

```gherkin
Scenario: Code wird formatiert dargestellt
  Given Claude Code antwortet mit einem Code-Block
  Then wird der Code mit Syntax-Highlighting angezeigt
  And es gibt einen "Kopieren" Button
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Verbindung verloren während Streaming
  Given eine Antwort wird gerade gestreamt
  When die WebSocket-Verbindung abbricht
  Then sehe ich eine Fehlermeldung "Verbindung verloren"
  And es gibt einen "Erneut verbinden" Button
  And die bisherige Antwort bleibt sichtbar
```

```gherkin
Scenario: Sehr lange Antwort
  Given Claude Code antwortet mit über 10.000 Zeichen
  Then wird die Antwort vollständig angezeigt
  And das Scrollen bleibt flüssig
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [ ] FILE_EXISTS: agent-os-ui/ui/src/views/chat-view.ts
- [ ] FILE_EXISTS: agent-os-ui/ui/src/components/chat-message.ts
- [ ] FILE_EXISTS: agent-os-ui/ui/src/components/tool-call-badge.ts
- [ ] FILE_EXISTS: agent-os-ui/src/server/claude-handler.ts

### Inhalt-Prüfungen

- [ ] CONTAINS: chat-view.ts enthält "@customElement"
- [ ] CONTAINS: claude-handler.ts enthält "query" (Agent SDK)
- [ ] CONTAINS: chat-message.ts enthält "streaming"

### Funktions-Prüfungen

- [ ] BUILD_PASS: cd agent-os-ui && npm run build
- [ ] LINT_PASS: cd agent-os-ui && npm run lint

---

## Required MCP Tools

Keine MCP Tools erforderlich.

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
- [x] Code Review durchgeführt

#### Dokumentation
- [x] Keine Linting Errors
- [x] Completion Check Commands erfolgreich

---

### Betroffene Layer & Komponenten

**Integration Type:** Full-stack

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Backend | src/server/claude-handler.ts | Agent SDK Integration |
| Backend | src/server/websocket.ts | Chat Message Routing |
| Frontend | ui/src/views/chat-view.ts | Chat View Container |
| Frontend | ui/src/components/chat-message.ts | Message Bubble Component |
| Frontend | ui/src/components/tool-call-badge.ts | Tool Call Visualisierung |

**Kritische Integration Points:**
- WebSocket Event: `chat.send` → User Nachricht an Claude
- WebSocket Event: `chat.stream` → Token-by-Token Response
- WebSocket Event: `chat.tool` → Tool Call Notification
- WebSocket Event: `chat.complete` → Response fertig

---

### Technical Details

**WAS:**
- Claude Handler mit @anthropic-ai/claude-agent-sdk
- Streaming Response via WebSocket Events
- Chat View mit Message History
- Chat Message Component (User/Assistant)
- Tool Call Badge mit aufklappbarem Ergebnis
- Markdown Rendering für Code-Blocks
- Auto-Scroll bei neuen Nachrichten

**WIE:**
- Agent SDK `query()` mit Streaming Callback
- WebSocket sendet Events für jeden Token
- Lit `repeat()` Directive für Message-Liste
- CSS scroll-behavior: smooth
- marked.js oder eigener Markdown-Parser
- Tool Calls als collapsible Cards (Moltbot-Pattern)

**WO:**
```
agent-os-ui/
├── src/
│   └── server/
│       ├── claude-handler.ts       # NEU: Agent SDK Wrapper
│       └── websocket.ts            # UPDATE: Chat Event Handler
└── ui/
    └── src/
        ├── views/
        │   └── chat-view.ts        # UPDATE: Full Chat Implementation
        └── components/
            ├── chat-message.ts     # NEU: Message Bubble
            └── tool-call-badge.ts  # NEU: Tool Visualisierung
```

**WER:** dev-team__fullstack-developer

**Abhängigkeiten:** AOSUI-001, AOSUI-002, AOSUI-003

**Geschätzte Komplexität:** M

---

### Completion Check

```bash
# Verify files exist
test -f agent-os-ui/src/server/claude-handler.ts && echo "OK: claude-handler.ts exists"
test -f agent-os-ui/ui/src/views/chat-view.ts && echo "OK: chat-view.ts exists"
test -f agent-os-ui/ui/src/components/chat-message.ts && echo "OK: chat-message.ts exists"
test -f agent-os-ui/ui/src/components/tool-call-badge.ts && echo "OK: tool-call-badge.ts exists"

# Verify Agent SDK usage
grep -q "query" agent-os-ui/src/server/claude-handler.ts && echo "OK: Uses Agent SDK query"

# Verify streaming support
grep -q "stream" agent-os-ui/ui/src/components/chat-message.ts && echo "OK: Streaming support"

# Verify Lit component
grep -q "@customElement" agent-os-ui/ui/src/views/chat-view.ts && echo "OK: Lit component"

# Build check
cd agent-os-ui && npm run build && echo "OK: Full build passes"
```
