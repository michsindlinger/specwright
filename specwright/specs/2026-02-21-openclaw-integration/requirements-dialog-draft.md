# Requirements Dialog Draft - OpenClaw Integration

**Erstellt:** 2026-02-21
**Status:** Work in Progress (Dialog noch nicht abgeschlossen)

---

## Feature Overview

Specwright soll als Tool/Skill innerhalb von OpenClaw-Bots laufen. Nutzer sollen Specwright-Workflows (create-spec, execute-tasks, etc.) direkt aus Messaging-Plattformen (Telegram, Signal, WhatsApp, Discord) heraus steuern - per natuerlicher Sprache.

OpenClaw ist ein Open-Source autonomer AI-Agent (ehem. Clawdbot/Moltbot) von Peter Steinberger, der lokal laeuft und sich ueber Messaging-Plattformen als Interface nutzen laesst. Er integriert sich mit LLMs wie Claude, DeepSeek oder GPT.

---

## Bisherige Antworten des Users

### 1. Was ist das Feature?

Specwright laeuft **innerhalb** von OpenClaw als Tool/Skill. Der User interagiert mit seinem OpenClaw-Bot ueber Messaging und kann Specwright-Workflows ausloesen.

Beispiele:
- "Erstelle eine neue Spec fuer Projekt XY" -> OpenClaw startet `create-spec` im Projektordner
- "Starte die Umsetzung des Features XY in Projekt Z" -> OpenClaw startet `execute-tasks`

### 2. Wer braucht das?

- **Entwickler, die bereits OpenClaw nutzen** und Specwright's strukturierte Workflows wollen
- **Bestehende Specwright-User**, die Workflows per Messaging (Signal, Telegram, WhatsApp) ausloesen wollen

### 3. Warum ist es wertvoll?

- **Run Specwright from anywhere** - Strukturierte Workflows von ueberall starten
- Kein Terminal/IDE noetig - nur ein Messenger

### 4. Konkreter Use Case (vom User beschrieben)

Der Agent hat Kenntnisse ueber die GitHub-Repos des Nutzers und kann diese bei Bedarf auschecken/aktualisieren.

**Flow Beispiel 1: "Neues Feature erstellen"**
1. User sagt via Telegram: "Ich moechte ein neues Feature fuer Projekt XY erstellen"
2. Agent prueft: Ist das Projekt ausgecheckt? (falls nein: klonen in definierten Ordner)
3. Agent startet `specwright:create-spec` im Projektordner
4. AskUserQuestion-Prompts von Claude Code werden an den User via Telegram gespiegelt (Buttons oder Text Frage/Antwort)
5. User antwortet im Chat
6. Agent wartet bis Prozess abgeschlossen ist
7. Agent gibt dem User Feedback

**Flow Beispiel 2: "Feature umsetzen"**
1. User sagt via Telegram: "Starte die Umsetzung des Features XY in Projekt Z"
2. Agent startet Claude Code im Projektordner mit `specwright:execute-tasks`
3. Interaktiver Prozess laeuft ueber Messaging
4. Feedback bei Abschluss

---

## Offene Fragen (noch zu klaeren)

### Technische Klaerung
- [ ] Soll der OpenClaw-Agent Claude Code als **CLI-Prozess** starten (z.B. `claude -p "..."`) oder ueber die **Claude Code SDK** (programmatisch)?
- [ ] Authentifizierung: Eigener Anthropic API Key des Bots oder Key des Nutzers?

### Interaktions-Details
- [ ] Laufende Prozesse (create-spec dauert 15-30 Min): Kann der User zwischendurch andere Dinge mit dem Bot machen, oder ist der Bot "blockiert"?
- [ ] Was passiert bei Abbruch mittendrin (z.B. Telegram geschlossen)?

### Scope
- [ ] Soll die Spec den **kompletten Flow** abdecken (GitHub-Integration + Claude Code Bridge + Messaging Bridge) oder nur einen Teil?
- [ ] Ist das ein **Specwright-seitiges Feature** (neuer MCP Server), ein **OpenClaw Plugin/Skill**, oder beides?
- [ ] Ist die Web UI Anbindung (z.B. Link zum Kanban Board) in scope oder out of scope?

---

## Kontext: Was ist OpenClaw?

- **Name:** OpenClaw (ehem. Clawdbot, Moltbot)
- **Ersteller:** Peter Steinberger (oesterreichischer Entwickler, seit Feb 2026 bei OpenAI)
- **Typ:** Open-Source autonomer AI-Agent
- **Laeuft:** Lokal
- **Interface:** Messaging-Plattformen (Signal, Telegram, Discord, WhatsApp)
- **LLM-Integration:** Claude, DeepSeek, GPT
- **Tool-Integration:** MCP Server
- **GitHub:** github.com/openclaw/openclaw
- **Website:** openclaw.ai

---

*Dieser Draft wird nach Abschluss des Requirements-Dialogs in eine vollstaendige requirements-clarification.md ueberfuehrt.*
