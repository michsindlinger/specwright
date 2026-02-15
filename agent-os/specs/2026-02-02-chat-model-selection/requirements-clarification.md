# Requirements Clarification - Chat Model Selection

**Created:** 2026-02-02
**Status:** Pending User Approval

## Feature Overview

Ermöglicht Benutzern die Auswahl des LLM-Modells direkt im Chat-Interface. Unterstützt werden Anthropic-Modelle (Opus, Sonnet, Haiku) sowie alternative Provider wie GLM 4.7 über konfigurierbare API-Endpoints.

## Target Users

- **Primär:** Entwickler, die Agent OS Web UI lokal nutzen
- **Sekundär:** Teams mit verschiedenen API-Konfigurationen (Anthropic, GLM, etc.)

## Business Value

- **Flexibilität:** Nutzer können je nach Aufgabe das passende Model wählen (Opus für komplexe Tasks, Haiku für schnelle Antworten)
- **Kostenkontrolle:** Günstigere Modelle für einfache Aufgaben
- **Multi-Provider:** Unterstützung alternativer LLM-Provider (GLM, OpenAI-kompatible APIs)
- **Nahtlose Erfahrung:** Model-Wechsel ohne Unterbrechung des Workflows

## Functional Requirements

### FR1: Model-Auswahl im Chat-Header
- Dropdown/Selector permanent sichtbar im Chat-Header
- Zeigt aktuell ausgewähltes Model an
- Gruppierung nach Provider (Anthropic, GLM, etc.)

### FR2: Unterstützte Modelle
**Anthropic Provider:**
- Opus 4.5 - Most capable for complex work (default/recommended)
- Sonnet 4.5 - Best for everyday tasks
- Sonnet 4.5 (1M context) - Extended context, uses rate limits faster
- Haiku 4.5 - Fastest for quick answers

**GLM Provider:**
- GLM 4.7 (glm-5)
- GLM 4.5 Air (glm-4.5-air)

### FR3: Session-basierte Persistenz
- Ausgewähltes Model gilt für die gesamte Chat-Session
- Model-Wechsel jederzeit möglich (wirkt ab nächster Nachricht)
- Kein globaler Default in Settings (Session-Default = Anthropic Opus)

### FR4: API-Konfiguration
- Provider-spezifische Konfiguration über Settings-View
- Felder pro Provider: Base URL, API Key/Token, verfügbare Modelle
- GLM-Konfiguration: `ANTHROPIC_BASE_URL`, `ANTHROPIC_AUTH_TOKEN`

### FR5: CLI-Integration (PFLICHT)
- Backend nutzt **konfigurierbare CLI-Befehle pro Provider**
- Konfiguration erfolgt über Settings-View (Teil von FR4)
- Default-Konfiguration:
  - Anthropic: `claude-anthropic-simple --model <opus|sonnet|haiku>`
  - GLM: `claude --model <glm-5|glm-4.5-air>` (nutzt default settings.json mit z.ai Konfiguration)
- User kann CLI-Befehle pro Provider anpassen (z.B. eigener Alias, andere Flags)
- Beispiel-Konfiguration:
  ```json
  {
    "anthropic": {
      "command": "claude-anthropic-simple",
      "args": ["--model", "{model}"]
    },
    "glm": {
      "command": "claude",
      "args": ["--model", "{model}"]
    }
  }
  ```

## Affected Areas & Dependencies

| Komponente | Impact |
|------------|--------|
| **Frontend: Chat-View** | Neuer Model-Selector im Header |
| **Frontend: Settings-View** | Provider-Konfiguration (API Keys, Base URLs) |
| **Backend: claude-handler.ts** | Model-Parameter bei CLI-Spawn, Provider-Routing |
| **Backend: websocket.ts** | Neue Message-Types für Model-Selection |
| **Shared: Types** | ModelProvider, ModelConfig, ChatSession-Erweiterung |

## Edge Cases & Error Scenarios

| Szenario | Erwartetes Verhalten |
|----------|---------------------|
| Provider nicht erreichbar (API down) | Fehlermeldung: "Model nicht verfügbar", Option zum Wechseln |
| Ungültiger API-Key | Fehlermeldung mit Hinweis auf Settings |
| Model-Wechsel während Stream | Aktuelle Antwort fertigstellen, neues Model ab nächster Nachricht |
| Kein Provider konfiguriert | Default auf Anthropic ohne API-Key Warnung (CLI verwendet env vars) |
| GLM ohne z.ai Konfiguration | Hinweis: "Provider nicht konfiguriert" |

## Security & Permissions

- API-Keys werden nur im Backend gespeichert/verwendet
- Frontend sendet nur Provider + Model-Name
- Keys werden NICHT über WebSocket übertragen
- Settings-Storage: Lokale Konfigurationsdatei (project-level)

## Performance Considerations

- Model-Auswahl hat keine Performance-Auswirkung auf laufende Streams
- CLI-Start pro Provider identisch (~1-2s Cold Start)
- Keine zusätzlichen API-Calls für Model-Verfügbarkeitsprüfung

## Scope Boundaries

**IN SCOPE:**
- Model-Selector UI im Chat-Header
- Provider-Konfiguration in Settings
- Backend-Routing zu verschiedenen CLI-Befehlen
- Session-basierte Model-Persistenz
- Fehlerbehandlung bei Provider-Problemen

**OUT OF SCOPE:**
- Model-Auswahl für Workflows (bleibt bei Opus)
- Automatischer Fallback auf anderen Provider
- Model-Preisvergleich/Kostentracking
- Custom Model-Endpoints (nur vordefinierte Provider)
- Chat-History Model-Tagging (welches Model pro Nachricht)

## Open Questions

*Keine offenen Fragen - alle Requirements geklärt.*

## Proposed User Stories (High Level)

1. **Model Selector Component** - UI-Komponente für Model-Auswahl im Chat-Header
2. **Provider Configuration** - Settings-Bereich für API-Konfiguration pro Provider
3. **Backend Model Routing** - CLI-Auswahl basierend auf Provider + Model
4. **Session State Integration** - Model-Auswahl in Chat-Session speichern
5. **Integration & Validation** - End-to-End Test der Model-Auswahl

---

*Review this document carefully. Once approved, detailed user stories will be generated.*
