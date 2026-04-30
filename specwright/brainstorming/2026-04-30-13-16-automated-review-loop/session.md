# Brainstorming Session: Automatisierter Review-Loop (Opus ↔ Sonnet)

> Session ID: 2026-04-30-13-16-automated-review-loop
> Started: 2026-04-30 13:16:59
> Type: feature
> Status: Active

## Topic

Automatisierung des manuellen Review-Workflows zwischen zwei Cloud-Terminals:
- **Aktuell:** Opus erstellt Plan im Plan-Modus → User öffnet zweites Cloud-Terminal mit Sonnet 4 → User kopiert Plan als Referenz für Review → User kopiert Feedback zurück zu Opus → Opus bewertet und übernimmt sinnvolle Punkte.
- **Ziel:** Ganzes Hin-und-Her in einem Schritt automatisiert.

## Discussion Thread

### Initial Thoughts

**User:** Manueller Copy-Paste-Loop zwischen Opus (Planer) und Sonnet (Reviewer) ist repetitiv. Will Automatisierung in einem Schritt.

**Assistant:** Ansatz erkannt = "Multi-Model Plan Review Loop". Kernfrage: Soll das ein neuer Specwright-Workflow/Command werden (z.B. `/review-plan`) oder eine UI-Feature im Cloud-Terminal? Mehrere mögliche Architekturen — siehe Fragen unten.

---

## Ideas Explored

### Option A: Specwright Slash-Command `/review-plan`
- Main Agent (Opus) erstellt Plan im Plan-Modus
- Command spawnt Sub-Agent mit Sonnet-4-Override für Review
- Review-Output wird direkt zurück in Main Agent injected
- Main Agent bewertet & integriert

### Option B: UI-Feature "Auto-Review Tab"
- Cloud-Terminal-UI: Button "Send to Reviewer"
- Backend orchestriert zweite Claude-SDK-Session mit anderem Modell
- Review streamt zurück in Original-Tab als kollabiertes Block

### Option C: Hook-basiert
- ExitPlanMode Hook triggert Review automatisch
- Reviewer-Agent läuft im Hintergrund
- Resultat erscheint vor User-Approval

### Option D: Skill-basierter Loop
- `/review-implementation-plan` Skill existiert bereits → erweitern um Multi-Model-Variante
- Skill orchestriert lokal beide Modelle via Agent-Tool

## Key Decisions

1. **Scope:** Specwright UI Cloud-Terminal (nicht lokales Claude Code)
2. **Reviewer-Modell:** DeepSeek 4 (anderer Provider, nicht Anthropic)
3. **Trigger:** Auto, sobald Plan-Agent (Opus) Plan fertigstellt
4. **Flow:** Plan erstellt → Review → Feedback zurück → Plan aktualisiert. Vollautomatisch, **keine User-Gates**

## Implikationen

- Specwright UI = Express + WebSocket + Claude SDK (`ui/src/server/`)
- Multi-Provider Setup nötig: DeepSeek API SDK zusätzlich zu Anthropic SDK
- Plan-Agent = bestehende Plan-Tool-Integration im Cloud-Terminal
- Hook-Punkt: ExitPlanMode-Event im Backend abfangen
- Auto-Loop: Plan ausgeben → DeepSeek-Call mit Plan + Review-Prompt → Output an Opus zurück → Opus Update-Run → fertiger Plan an User

## Klärungen Runde 2

1. **API-Key:** Schon vorhanden in `~/.claude-deepseek/settings.json` (ANTHROPIC_BASE_URL=api.deepseek.com/anthropic). Nichts neu zu konfigurieren.
2. **Multi-Provider via CLAUDE_CONFIG_DIR:** Specwright UI nutzt bereits `claude-deepseek` als cliCommand (`ui/src/server/model-config.ts`). DeepSeek läuft per Claude-Code-SDK, nur mit anderem Config-Dir.
3. **Iterationen:** fix 1 Runde
4. **Failure-Mode:** keiner — wenn DeepSeek scheitert, Plan ohne Review weitergeben (oder Fail OK, kein Recovery)
5. **Sichtbarkeit:** Review-Output sichtbar im UI
6. **Token-Budget:** kein Cap

## Konkrete Architektur (final)

```
Cloud-Terminal Tab (Opus)
     ↓ Stream-Event: ExitPlanMode mit plan-Payload
ReviewOrchestrator.run(plan)
     ↓ spawn child Claude-SDK Session
     │  env: CLAUDE_CONFIG_DIR=~/.claude-deepseek
     │  Prompt: "Review this implementation plan: <plan>"
     ↓ collect review output (streamed)
     ↓ inject back to Opus session as user message:
     "External review from DeepSeek: <review>
      Update your plan accordingly."
     ↓ Opus emits new ExitPlanMode (final)
UI: zeigt Review-Block (collapsed) + Final-Plan
```

## Komponenten konkret

| Datei | Zweck |
|------|------|
| `ui/src/server/services/plan-review-orchestrator.ts` (neu) | Hook + Spawn + Inject |
| `ui/src/server/services/cloud-terminal-manager.ts` (mod) | Stream-Events filtern für ExitPlanMode |
| `ui/src/server/services/deepseek-reviewer.ts` (neu) | Wrapper um Claude-SDK mit DeepSeek-ConfigDir |
| `ui/src/shared/types/plan-review.protocol.ts` (neu) | WebSocket-Messages für Review-Block |
| `ui/frontend/src/components/terminal/aos-plan-review-block.ts` (neu) | Collapsed Review-Block UI |
| `model-config.ts` | bereits da, DeepSeek schon registriert |

## Action Items

1. Verifizieren: existiert ExitPlanMode-Event im Claude-SDK-Stream? (Recherche)
2. Prototyp DeepSeek-Reviewer als Standalone-Skript (Plan rein, Review raus)
3. Orchestrator + WebSocket-Message-Schema entwerfen
4. Lit-Component für Review-Block
5. Toggle "Auto-Review" pro Tab in Settings
6. Specwright UI Spec dokumentieren in `docs/ui-specs/auto-plan-review.md`

## Klärungen Runde 3 (final)

1. **Aktivierung:** Opt-in pro Tab (Toggle "Auto-Review" im Tab-Header oder Tab-Settings)
2. **Reviewer-Modell:** Dropdown — Auswahl aus registrierten Multi-Providern (DeepSeek, GLM, Kimi, Gemini, OpenRouter etc.)
3. **Review-Prompt:** Editierbar (Default-Prompt + User-Override pro Projekt oder global UI-Settings)

## Action Plan

### Objective
Auto-Review-Loop in Specwright UI: nach Plan-Erstellung in Cloud-Terminal Tab automatisch externes Modell als Reviewer aufrufen, Feedback einbauen, finalen Plan ausgeben — ohne manuelles Tab-Hopping.

### Scope

**In Scope:**
- Opt-in Toggle pro Cloud-Terminal Tab
- Reviewer-Modell-Dropdown (alle in `model-config.ts` registrierten Provider)
- Editierbarer Review-Prompt (Default + Override)
- Plan-Detection via ExitPlanMode-Stream-Event
- Spawn Reviewer-Session mit `CLAUDE_CONFIG_DIR`
- Inject Review-Output zurück in Original-Session
- Sichtbarer collapsed Review-Block im UI
- 1 Iteration fix

**Out of Scope:**
- Multi-Iteration-Loops
- Failure-Recovery / Retries
- Token-Budget-Caps
- Cross-Provider-Cost-Tracking

### Komponenten

| Datei | Status | Zweck |
|------|------|------|
| `ui/src/server/services/plan-review-orchestrator.ts` | NEU | Hook + Spawn + Inject |
| `ui/src/server/services/external-reviewer.ts` | NEU | Spawn Claude-SDK mit Provider-ConfigDir |
| `ui/src/server/services/cloud-terminal-manager.ts` | MOD | ExitPlanMode-Event-Detection + Auto-Review-Branch |
| `ui/src/shared/types/plan-review.protocol.ts` | NEU | WebSocket-Messages |
| `ui/src/server/services/review-prompt-store.ts` | NEU | Default + Override-Prompts persistieren |
| `ui/frontend/src/components/terminal/aos-plan-review-block.ts` | NEU | Collapsed Review-Block UI |
| `ui/frontend/src/components/terminal/aos-auto-review-toggle.ts` | NEU | Toggle + Modell-Dropdown im Tab-Header |
| `ui/frontend/src/components/settings/aos-review-prompt-editor.ts` | NEU | Prompt-Editor in Settings |
| `model-config.ts` | bereits da | Provider-Registry wiederverwenden |

### Implementation Strategy

1. **Phase 1 — Backend Foundation**
   - `external-reviewer.ts`: Standalone Spawn-Wrapper, getestet mit DeepSeek
   - `review-prompt-store.ts`: Default-Prompt + JSON-File-Persistenz
   - WebSocket-Protokoll definieren

2. **Phase 2 — Orchestrator**
   - `plan-review-orchestrator.ts` hooked in `cloud-terminal-manager.ts`
   - ExitPlanMode-Detection
   - Inject-Logic: Review-Output als User-Message in Original-Session
   - Stream Review-Block zu UI

3. **Phase 3 — UI**
   - Toggle + Dropdown im Tab-Header
   - Review-Block collapsible
   - Settings-Editor für Prompt

4. **Phase 4 — Polish**
   - Settings-Persistenz pro Tab
   - Per-Project-Override für Prompt

### Success Metrics

- User aktiviert Auto-Review → bei nächstem Plan-Output triggert Review automatisch
- Wahl von DeepSeek/GLM/Kimi etc. funktioniert via einfache Modell-Auswahl
- Review-Prompt anpassbar in UI Settings
- Review-Block sichtbar, einklappbar im Plan-Output

### Required Information for Spec
- [x] Problem statement defined
- [x] User impact clarified
- [x] Technical approach outlined
- [x] Dependencies identified (Claude-SDK Multi-Config, WebSocket, model-config)
- [ ] Testing strategy noch offen
- [x] Scope locked

## Session Summary

**Duration:** 13:16 - laufend
**Ideas Generated:** 4 Architektur-Optionen (A-D), final = Variante A+B Hybrid (UI-Feature mit SDK-Spawn)
**Key Decisions:** 6
**Next Actions:** Transfer zu Spec via `/transfer-and-create-spec`

### Main Outcome
Klare Feature-Definition für **Auto-Plan-Review** in Specwright UI. Multi-Provider via bestehender `CLAUDE_CONFIG_DIR`-Infrastruktur. Opt-in pro Tab, Modell-Dropdown, editierbarer Prompt. 9 neue Dateien, 1 Mod.

### Ready for Transfer
- [x] Feature Spec (use: `/transfer-and-create-spec`)
- [ ] Bug Report
- [ ] Needs more brainstorming

### Session Notes
- DeepSeek-Provider bereits in `~/.claude-deepseek/settings.json` konfiguriert (Anthropic-kompatible API via `api.deepseek.com/anthropic`)
- `ui/src/server/model-config.ts` führt bereits `claude-deepseek`, `claude-glm`, `claude-gem`, `claude-kimi-api` als Multi-Provider
- Kein zusätzlicher SDK-Client nötig — alle laufen via Claude-Code-SDK + ConfigDir-Switch
