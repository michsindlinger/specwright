# Session State Integration

> Story ID: MODSEL-004
> Spec: chat-model-selection
> Created: 2026-02-02
> Last Updated: 2026-02-02

**Priority**: High
**Type**: Full-stack
**Estimated Effort**: S (2 SP)
**Dependencies**: MODSEL-001, MODSEL-003

---

## Feature

```gherkin
Feature: Model-Auswahl in Chat-Session integrieren
  Als Entwickler
  möchte ich dass meine Model-Auswahl für die gesamte Chat-Session gilt,
  damit ich nicht bei jeder Nachricht das Model neu wählen muss.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Model-Auswahl wird bei Nachricht übertragen

```gherkin
Scenario: Chat-Send enthält ausgewähltes Model
  Given ich habe "Sonnet 4.5" im Model-Selector ausgewählt
  When ich eine Nachricht sende
  Then enthält die WebSocket-Nachricht das Feld "model": "sonnet"
```

### Szenario 2: Model-Änderung aktualisiert Session

```gherkin
Scenario: Model-Wechsel wird an Backend übertragen
  Given ich bin im Chat mit "Opus 4.5" aktiv
  When ich das Model auf "Haiku 4.5" wechsle
  Then erhält das Backend eine "chat.settings.update" Nachricht
  And die Session verwendet ab sofort "haiku"
```

### Szenario 3: Chat-View reagiert auf Model-Änderung

```gherkin
Scenario: Chat-View zeigt aktuelles Model an
  Given der Model-Selector ist im Header sichtbar
  When ich das Model ändere
  Then wird die Anzeige sofort aktualisiert
  And keine Seiten-Neuladung ist erforderlich
```

### Szenario 4: Gateway Events synchronisieren State

```gherkin
Scenario: Gateway Events halten Frontend und Backend synchron
  Given das Frontend sendet eine Model-Änderung
  When das Backend die Änderung bestätigt
  Then erhält das Frontend eine "chat.settings.response" Nachricht
  And der lokale State wird aktualisiert
```

### Edge Case: Verbindungsabbruch während Model-Wechsel

```gherkin
Scenario: Model bleibt nach Reconnect erhalten
  Given ich habe "Sonnet 4.5" ausgewählt
  And die WebSocket-Verbindung bricht ab
  When die Verbindung wiederhergestellt wird
  Then ist "Sonnet 4.5" weiterhin ausgewählt
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [x] FILE_EXISTS: agent-os-ui/ui/src/views/chat-view.ts (modified)
- [x] FILE_EXISTS: agent-os-ui/ui/src/gateway.ts (modified)

### Inhalt-Prüfungen

- [x] CONTAINS: agent-os-ui/ui/src/views/chat-view.ts enthält "model-changed"
- [x] CONTAINS: agent-os-ui/ui/src/views/chat-view.ts enthält "selectedModel"
- [x] CONTAINS: agent-os-ui/ui/src/gateway.ts enthält "chat.settings"

### Funktions-Prüfungen

- [x] LINT_PASS: cd agent-os-ui && npm run lint
- [x] BUILD_PASS: cd agent-os-ui && npm run build

---

## Required MCP Tools

| Tool | Purpose | Blocking |
|------|---------|----------|
| None | - | - |

---

## Technisches Refinement (vom Architect)

> **⚠️ WICHTIG:** Dieser Abschnitt wird vom Architect ausgefüllt

### DoR (Definition of Ready) - Vom Architect

#### Fachliche Anforderungen
- [x] Fachliche requirements klar definiert
- [x] Akzeptanzkriterien sind spezifisch und prüfbar
- [x] Business Value verstanden

#### Technische Vorbereitung
- [x] Technischer Ansatz definiert (WAS/WIE/WO)
- [x] Abhängigkeiten identifiziert (MODSEL-001, MODSEL-003)
- [x] Betroffene Komponenten bekannt
- [x] Erforderliche MCP Tools dokumentiert (falls zutreffend)
- [x] Story ist angemessen geschätzt (max 5 Dateien, 400 LOC)

#### Full-Stack Konsistenz
- [x] Alle betroffenen Layer identifiziert
- [x] Integration Type bestimmt
- [x] Kritische Integration Points dokumentiert (wenn Full-stack)
- [x] Handover-Dokumente definiert (bei Multi-Layer)

**Story ist READY wenn alle Checkboxen angehakt sind.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [x] Code implementiert und folgt Style Guide
- [x] Architektur-Vorgaben eingehalten (WIE section)
- [x] Security/Performance Anforderungen erfüllt

#### Qualitätssicherung
- [x] Alle Akzeptanzkriterien erfüllt (via Completion Check verifiziert)
- [x] Unit Tests geschrieben und bestanden
- [x] Integration Tests geschrieben und bestanden
- [x] Code Review durchgeführt und genehmigt

#### Dokumentation
- [x] Dokumentation aktualisiert
- [x] Keine Linting Errors
- [x] Completion Check Commands alle erfolgreich (exit 0)

#### Integration DoD (Story stellt Verbindung her)
- [x] **Integration hergestellt: chat-view.ts → aos-model-selector**
  - [x] Event-Listener für model-changed Event
  - [x] Validierung: `grep -q "model-changed" agent-os-ui/ui/src/views/chat-view.ts`
- [x] **Integration hergestellt: chat-view.ts → gateway.ts**
  - [x] Model wird bei chat.send mitgesendet
  - [x] Validierung: `grep -q "selectedModel" agent-os-ui/ui/src/views/chat-view.ts`

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Full-stack (Frontend-Heavy)

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | chat-view.ts | Model-Event Listener, Model bei Send |
| Frontend | gateway.ts | Settings-Event Handler |

**Kritische Integration Points:**
- chat-view.ts → aos-model-selector (model-changed Event)
- chat-view.ts → gateway.ts (chat.send mit Model)
- gateway.ts → websocket.ts (chat.settings Messages)

---

### Technical Details

**WAS:**
- Chat-View auf `model-changed` Events lauschen (CustomEvent von aos-model-selector)
- Selected Model bei `chat.send` Nachrichten mitgeben
- Gateway um Settings-Event-Handler erweitern

**WIE (Architektur-Guidance ONLY):**
- In chat-view.ts:
  - Neue `@state() private selectedModel = { providerId: 'anthropic', modelId: 'opus' };`
  - Event-Listener in `connectedCallback()` oder via `@query` auf aos-model-selector
  - chat.send anpassen: `gateway.send({ type: 'chat.send', content, model: this.selectedModel })`
- In gateway.ts:
  - Neue Methode `sendModelSettings(providerId: string, modelId: string)`
  - Handler-Registration Pattern wie terminal methods
- Event-Pattern wie in project-selector.ts verwendet

**WO:**
- `agent-os-ui/ui/src/views/chat-view.ts` (MODIFY, +25 LOC)
- `agent-os-ui/ui/src/gateway.ts` (MODIFY, +20 LOC)

**WER:** dev-team__frontend-developer

**Abhängigkeiten:** MODSEL-001, MODSEL-003

**Geschätzte Komplexität:** S

---

### Relevante Skills

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | agent-os/skills/frontend-lit.md | State management, event handling |
| domain-agent-os-web-ui | agent-os/skills/domain-agent-os-web-ui.md | Chat interaction patterns |

---

### Completion Check

```bash
# Auto-Verify Commands - alle müssen mit 0 exiten
grep -q "model-changed" agent-os-ui/ui/src/views/chat-view.ts && echo "✓ Model event listener"
grep -q "selectedModel" agent-os-ui/ui/src/views/chat-view.ts && echo "✓ selectedModel state"
grep -q "chat.settings" agent-os-ui/ui/src/gateway.ts && echo "✓ Gateway settings handler"
cd agent-os-ui && npm run lint && echo "✓ Lint passed"
cd agent-os-ui && npm run build && echo "✓ Build passed"
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen
