# Implementierungsplan: Auto-Plan-Review

> **Status:** PENDING_USER_REVIEW (Review v2 — nach kritischem Review-Agent-Feedback überarbeitet)
> **Spec:** `specwright/specs/2026-04-30-auto-plan-review/`
> **Erstellt:** 2026-04-30
> **Basiert auf:** requirements-clarification.md
> **Review-Antworten:** Anhang am Ende

---

## Executive Summary

Auto-Plan-Review schaltet im Cloud-Terminal pro Tab einen optionalen, parallelen Cross-Model-Review-Loop frei: nach jedem Plan-Mode-Exit der laufenden Claude-Code-Session werden 1..n in `model-config.ts` registrierte Reviewer-Modelle (DeepSeek, GLM, Kimi, Gemini) parallel via Claude-Agent-SDK mit identischem Prompt befeuert, ihre Ergebnisse aggregiert und als User-Message ins Original-Tab injiziert. Eliminiert ~5–10 min Handarbeit pro Plan und nutzt die bestehende `CLAUDE_CONFIG_DIR`-Multi-Provider-Infrastruktur. Zwei Trigger-Pfade: **Auto-Detection** (TUI-Pattern, best-effort) **+ manueller Trigger-Button** (zuverlässiger Fallback).

---

## Architektur-Entscheidungen

### Gewählter Ansatz

**Hybrid-Architektur: PTY-Text-Detection für Plan-Exit + SDK-Headless-Spawns für Reviewer.**

- **Original-Session** ist und bleibt ein `node-pty`-getriebener Claude-Code-CLI-Prozess (TUI), gemanagt vom existierenden `CloudTerminalManager`. Plan-Mode-Exit ist im PTY-Kontext **kein** strukturierter Stream-Event, sondern sichtbarer Text. Detection erfolgt deshalb über ein **TUI-Box-Pattern** auf `terminal.data`-Chunks — analog zum etablierten `PROMPT_PATTERN` / `BLOCKER_PATTERN` in `cloud-terminal-manager.ts`. **Detection ist explizit best-effort:** wenn Pattern nicht matched, springt der manuelle Trigger ein.
- **Reviewer-Sessions** sind dagegen **headless one-shot SDK-Calls** über `@anthropic-ai/claude-agent-sdk`. Pro Reviewer ein eigener `query()`-Call mit `cwd: projectPath` und `options.env: { ...process.env, CLAUDE_CONFIG_DIR: '~/.claude-{provider}' }` — die SDK-Options unterstützen `env` explizit (siehe `node_modules/@anthropic-ai/claude-agent-sdk/entrypoints/sdk/runtimeTypes.d.ts:296`). Die env-var lädt die jeweilige `settings.json` mit `ANTHROPIC_BASE_URL` + `ANTHROPIC_AUTH_TOKEN` und routet Anfragen transparent zum Drittanbieter.
- **Orchestrator** (`PlanReviewOrchestrator`) hängt sich als zusätzlicher EventEmitter-Listener an `cloudTerminalManager` (neuer Event `session.plan-detected`), feuert via `Promise.allSettled` n parallele Reviewer-Calls über den `ExternalReviewer`-Service, aggregiert die Ergebnisse und ruft `cloudTerminalManager.sendInput()` für den Inject zurück.
- **UI-State** ist **single source of truth im Backend** (Orchestrator-In-Memory-Map). Frontend rendert nur. Bei `cloud-terminal:created` und `cloud-terminal:resumed` pusht Backend `plan-review:config.snapshot` zum Client.
- **Review-Block-UI lebt außerhalb des xterm-Canvas:** Als eigener DOM-Bereich unterhalb des Terminal-Panels in `aos-terminal-session`, nicht inline im xterm-Stream (xterm rendert Canvas/DOM-via-DOM-Renderer und akzeptiert keine Lit-Component-Inline-Injection).

### Begründung

- **PTY-Text-Detection statt SDK-Stream:** Original-Session ist User-facing TUI. Auf SDK-Streams umzusteigen würde gesamte Terminal-Erlebnis (Slash-Commands, Plan-Mode, Bash-Bestätigung) neu bauen → massiv invasiv. Text-Detection wiederverwendet bewährtes Pattern.
- **SDK-Headless für Reviewer:** Reviewer brauchen kein TUI, kein interaktives Verhalten, keinen Buffer — sie liefern Block Text. SDK ist hier minimaler, schneller, kostet kein PTY-Slot, nutzt `Promise.allSettled` nativ.
- **CLAUDE_CONFIG_DIR via SDK Options.env:** Mechanismus existiert in SDK-API. Phase 1 verifiziert in einem Smoke-Test: spawn against `~/.claude-deepseek` → erwartet Text-Output. Wenn Smoke-Test fehlschlägt, wird Architektur revisited (z.B. fallback auf direkten HTTP-Call gegen `ANTHROPIC_BASE_URL` aus settings.json).
- **Volatile Tab-State + Backend-SoT:** Requirement 11 fordert volatil. Backend hält Tab-State in In-Memory-Map (volatil pro Server-Restart). Frontend ist State-Renderer ohne Owner-Rolle — verhindert Sync-Drift.
- **Zwei Trigger-Pfade (Auto + Manuell):** Auto-Detection im PTY-Layer ist heuristisch (Plan-Mode-Exit hat keinen garantierten Text-Marker). Manueller Button ist Backup. User-Requirement "vollautomatisch" gilt für Erfolgsfall der Auto-Detection; manueller Trigger für Edge-Fälle ist klares Plus statt nichts.

### Patterns & Technologien

- **Pattern:** EventEmitter-Hook (analog `session.prompt-detected`), Orchestrator-Pattern (analog `AutoModeCloudSession`), `Promise.allSettled` für resiliente Parallelität.
- **Technologie:** `@anthropic-ai/claude-agent-sdk` (bereits Dependency, `voice-call.service.ts` zeigt SDK-Headless-Aufruf-Pattern; CLAUDE_CONFIG_DIR-Erweiterung ist neue Anwendung der bestehenden `Options.env`-API), Lit Web Components (Light DOM, Convention bestehender Terminal-Komponenten), Erweiterung der existierenden `general-config.ts` um Field `reviewPrompt` (kein eigener Service).
- **Begründung:** Kein neues Framework, keine neue Dependency.

---

## Komponenten-Übersicht

### Neue Komponenten

| Komponente | Typ | Verantwortlichkeit |
|------------|-----|-------------------|
| `PlanReviewOrchestrator` | Backend-Service | Koordiniert Plan-Detection (Auto + Manuell) → parallele Reviewer-Spawns → Aggregation → Inject; hält volatilen Per-Tab-State (Toggle, Reviewer-Liste); sendet `config.snapshot` an Clients bei Tab-Connect/Resume; per-session Lock gegen rapid re-runs. |
| `ExternalReviewer` | Backend-Service | Spawnt einzelne Claude-Agent-SDK-Session via `query()` mit `options.env.CLAUDE_CONFIG_DIR={path}`, mit `withTimeout(60s, AbortController)` Helper; sammelt Text-Output. Stateless. |
| `PlanBufferExtractor` | Backend-Util | Extrahiert Plan-Content aus PTY-Buffer-Tail: 1) ANSI-strip via Regex `/\x1b\[[0-9;]*[a-zA-Z]/g`, 2) Letzte TUI-Box `╭...╰` finden und Inhalt zurückgeben, 3) Fallback: letzte 8KB roh wenn keine Box gefunden. Wirft bei leerem Result. |
| `plan-review.protocol.ts` | Shared Type | WebSocket-Message-Typen: `plan-review:config.snapshot` (Push), `plan-review:config.update` (Client→Server), `plan-review:trigger.manual` (Client→Server), `plan-review:started`, `plan-review:reviewer.result`, `plan-review:aggregated`, `plan-review:injected`, `plan-review:error`, `plan-review:prompt.get`, `plan-review:prompt.update`. |
| `aos-auto-review-toggle` | Lit Component | Tab-Header dumb-Component: Toggle + Multi-Select-Dropdown + manueller "Review last plan"-Button. **Sendet keine WS direkt** — emittiert DOM-CustomEvents `auto-review-config-changed` und `auto-review-trigger-manual`. |
| `aos-plan-review-block` | Lit Component | Container-Komponente unterhalb Terminal-Panel; rendert Sub-Blöcke pro Reviewer (eingeklappt by default), Status-States (running/done/failed). |
| `aos-review-prompt-editor` | Lit Component | Settings-View-Element: Textarea für globalen Default-Review-Prompt + Save-Button + Validierung gegen Empty-String. |

### Zu ändernde Komponenten

| Komponente | Änderungsart | Grund |
|------------|--------------|-------|
| `cloud-terminal-manager.ts` | Erweitern | Neuer Event `session.plan-detected` + `PLAN_BOX_PATTERN` (matcht TUI-Box mit "Ready to code?"-Marker oder ähnlich) + Pro-Session-Flag `planReviewEnabled` (analog `autoModeActive`); `lastDataAt`-Tracking + neue Method `waitForIdle(sessionId, ms)` für Inject-Synchronisation. |
| `general-config.ts` | Field-Add | Neues Feld `reviewPrompt: string` im `GeneralConfig`-Interface. Default = sinnvoller Review-Prompt-Text. Migration-Path: Bestandskonfigs ohne Feld bekommen Default beim Load. |
| `websocket.ts` | Erweitern | Neue case-Branches für `plan-review:*` Messages; Listener-Verdrahtung zwischen `PlanReviewOrchestrator`-Events und WS-Client-Broadcast; Snapshot-Push bei `cloud-terminal:created`/`:resumed`. |
| `aos-cloud-terminal-sidebar.ts` | Erweitern | Reviewer-Models-Liste einmal beim Mount via `model.providers.list` fetchen; an Toggle-Instanzen via Lit-Property reichen (kein per-Instance-Refetch). Reagiert nicht direkt auf `plan-review:*` — delegiert an Session. |
| `aos-terminal-tabs.ts` | Erweitern | Tab-Header rendert `<aos-auto-review-toggle>` neben Tab-Title; reicht config + providers via Properties; lauscht DOM-Events und propagiert nach oben. |
| `aos-terminal-session.ts` | Erweitern | Empfängt `plan-review:*` Messages über gateway; rendert `<aos-plan-review-block>` als separater Bereich unterhalb des xterm-Panels; lauscht DOM-Events vom Toggle (`auto-review-config-changed`, `auto-review-trigger-manual`) und sendet via WS. |
| `settings-view.ts` | Erweitern | Neuer Settings-Tab/Abschnitt bindet `<aos-review-prompt-editor>` ein. |

### Nicht betroffen (explizit)

- `model-config.ts` — wird nur **gelesen** (`getProvider`, `getAllProviders`), keine Schema- oder Logik-Änderung.
- `~/.claude-{provider}/settings.json` — Provider-Configs bleiben unangetastet.
- `terminal-manager.ts` — PTY-Layer ist nicht betroffen.
- `claude-handler.ts` — Chat-Pfad (NICHT Cloud-Terminal) nicht betroffen.
- `auto-mode-cloud-session.ts` — Auto-Mode orthogonal zum Plan-Review.
- `voice-call.service.ts` — wird nur als Pattern-Referenz gelesen, nicht geändert.

---

## Umsetzungsphasen

### Phase 1: Backend Foundation (Detection-POC + Buffer-Extraction + Prompt-Field)
**Ziel:** Plan-Exit-Detection-Pattern verifiziert; Buffer-Extraction liefert sauberen Text; Reviewer-SDK-Smoke-Test gegen DeepSeek bestätigt CLAUDE_CONFIG_DIR-Mechanismus.

**Komponenten:** `cloud-terminal-manager.ts` (Pattern + Event + waitForIdle), `PlanBufferExtractor`, `plan-review.protocol.ts` (Type-Skeleton), `general-config.ts` (Field `reviewPrompt`), Settings-WS-Handler `plan-review:prompt.get|update`, **Reviewer-SDK-Smoke-Test-Skript**.

**Abhängig von:** Nichts (Startphase).

**Akzeptanz:**
- Bei manuellem Plan-Exit in Cloud-Terminal-Tab loggt Backend `session.plan-detected` (oder bei Pattern-Miss: `plan-detected-failed-no-pattern-match`, dokumentiert)
- `PlanBufferExtractor` liefert für ein typisches Plan-Mode-Output sauberen Text ohne ANSI
- `reviewPrompt` kann via WS gelesen/gespeichert werden, persistiert in `config/general-config.json`
- **Smoke-Test:** Standalone-Skript spawnt `query()` mit `env.CLAUDE_CONFIG_DIR='~/.claude-deepseek'` und User-Prompt "Say hello in 3 words" → erhält sinnvolle Antwort von DeepSeek-Modell (statt Anthropic-Modell). Validierung: Antwort enthält Text + finishes ohne Error.
- Wenn Smoke-Test failed: STOPP. Architektur muss überarbeitet werden (z.B. Direct-HTTP-Fallback gegen ANTHROPIC_BASE_URL).

### Phase 2: Orchestrator + External Reviewer (mit Timeout)
**Ziel:** Reviewer-Spawn parallel funktioniert; Aggregation + Inject-Logik mit PTY-Idle-Sync steht.

**Komponenten:** `ExternalReviewer` (SDK-Wrapper + `withTimeout` Helper), `PlanReviewOrchestrator` (State + `Promise.allSettled` + Aggregator + Lock + Snapshot-Push).

**Abhängig von:** Phase 1.

**Akzeptanz:**
- Unit-Test: Orchestrator gegen Mock-`ExternalReviewer` mit mixed fulfilled/rejected Results → Aggregat enthält fulfilled-Outputs mit Modell-Labels, rejected werden als "Failed"-Notes vermerkt
- Integration-Test: Orchestrator + echter `ExternalReviewer` gegen `~/.claude-deepseek` → liefert sinnvolles Review für einen Test-Plan
- `withTimeout(60s)` greift bei künstlich blockiertem Reviewer
- `cloudTerminalManager.sendInput()` mit Inject-Template-Text wird nach `waitForIdle(500ms)` aufgerufen, Original-Session sieht den Text als User-Eingabe
- Per-Session-Lock verhindert zweiten Trigger während aktivem Review

### Phase 3: Frontend (Toggle + Review-Block + Prompt-Editor)
**Ziel:** UI nutzbar, Tab-State sync via Snapshot, Toggle ohne eigene WS.

**Komponenten:** `aos-auto-review-toggle` (DOM-Events), `aos-plan-review-block`, `aos-review-prompt-editor`, Erweiterungen in `aos-terminal-tabs`, `aos-cloud-terminal-sidebar`, `aos-terminal-session`, `settings-view`.

**Abhängig von:** Phase 2 (WS-Protokoll steht für Mock-Tests).

**Akzeptanz:**
- Toggle + Multi-Select sichtbar im Tab-Header
- "Review last plan"-Button im Toggle-Bereich, klickbar
- Settings-View zeigt editierbares Prompt-Feld
- Review-Block rendert collapsibel mit Sub-Blöcken in eigenem Bereich unterhalb des Terminals
- `aos-terminal-session` empfängt Snapshot bei Tab-Resume, zeigt korrekten Toggle-State
- Toggle-Änderungen werden ohne Debounce sofort an WS weitergegeben

### Phase 4: Integration & Validation
**Ziel:** End-to-End-Flow geschlossen.

**Komponenten:** Alle Verbindungen aktiv; WS-Listener verdrahtet; Edge-Cases (Toggle aus, kein Reviewer, Tab-Wechsel, alle Reviewer fehlgeschlagen, Auto-Detection-Miss + manueller Trigger) verifiziert.

**Abhängig von:** Phase 1–3.

**Akzeptanz:** Real-World-Test:
- Tab anlegen → Toggle aktivieren → 2 Reviewer wählen → Plan via "/plan"-Slash-Command → Auto-Detection greift → Review-Block erscheint mit beiden Sub-Blöcken → aggregiertes Inject erscheint als User-Message → überarbeiteter Plan wird gestreamt
- Auto-Detection-Miss-Path: Plan ohne erkennbares Pattern → manueller "Review last plan"-Button → identischer Review-Flow
- Tab-Wechsel-Path: Mid-Review zu anderem Tab wechseln → zurück → Review-Block-State korrekt

---

## Komponenten-Verbindungen (KRITISCH)

### Verbindungs-Matrix

| Source | Target | Verbindungsart | Zuständige Story | Validierung |
|--------|--------|----------------|------------------|-------------|
| `cloud-terminal-manager.ts` | `PlanReviewOrchestrator` | EventEmitter-Subscribe (`session.plan-detected`) | STORY-BE-1 | `grep -n "session.plan-detected" ui/src/server/services/plan-review-orchestrator.ts` |
| `cloud-terminal-manager.ts` | `PlanBufferExtractor` | Direct method call zur Plan-Text-Gewinnung | STORY-BE-1 | grep `extractPlan` in `cloud-terminal-manager.ts` |
| `PlanReviewOrchestrator` | `ExternalReviewer` | Direct method call (`reviewPlan(...)`), n-fach via `Promise.allSettled` | STORY-BE-2 | `grep -n "Promise.allSettled" ui/src/server/services/plan-review-orchestrator.ts` |
| `ExternalReviewer` | `@anthropic-ai/claude-agent-sdk` | `claudeQuery({ prompt, options: { cwd, env: { ...process.env, CLAUDE_CONFIG_DIR } } })` mit `withTimeout(60s, abortController)` | STORY-BE-2 | `grep -n "CLAUDE_CONFIG_DIR" ui/src/server/services/external-reviewer.ts` |
| `PlanReviewOrchestrator` | `general-config.ts.getReviewPrompt()` | Direct getter-Call pro Detection | STORY-BE-3 | `grep -n "getReviewPrompt" ui/src/server/services/plan-review-orchestrator.ts` |
| `PlanReviewOrchestrator` | `cloud-terminal-manager.ts` | `waitForIdle(sessionId, 500)` → `sendInput(sessionId, injectText)` | STORY-BE-2 | `grep -n "waitForIdle\|sendInput" ui/src/server/services/plan-review-orchestrator.ts` |
| `PlanReviewOrchestrator` | `websocket.ts` | EventEmitter (`plan-review:reviewer.result`, `:aggregated`, `:injected`, `:error`, `:config.snapshot`, `:started`) | STORY-BE-4 | `grep -n "plan-review:" ui/src/server/websocket.ts` |
| `websocket.ts` | `aos-terminal-session` | WS-Push-Messages → `gateway.on('plan-review:*')` Handlers | STORY-FE-2 | `grep -n "plan-review:" ui/frontend/src/components/terminal/aos-terminal-session.ts` |
| `aos-terminal-session` | `aos-plan-review-block` | Property-Binding (Lit) — State propagiert von Session-Komponente | STORY-FE-2 | grep `aos-plan-review-block` in `aos-terminal-session.ts` |
| `aos-auto-review-toggle` | `aos-terminal-tabs` | DOM-CustomEvent `auto-review-config-changed`, `auto-review-trigger-manual` | STORY-FE-1 | grep `auto-review-config-changed` in `aos-auto-review-toggle.ts` |
| `aos-terminal-tabs` | `aos-terminal-session` | Event-Bubbling oder Property-Callback | STORY-FE-1 | grep `auto-review` in `aos-terminal-tabs.ts` |
| `aos-terminal-session` | `gateway` (WS) | Send `plan-review:config.update`, `plan-review:trigger.manual` | STORY-FE-1 | `grep -n "plan-review:config.update" ui/frontend/src/components/terminal/aos-terminal-session.ts` |
| `websocket.ts` | `PlanReviewOrchestrator` | Method calls: `setTabConfig(sessionId, config)`, `triggerManualReview(sessionId)`, `sendSnapshot(sessionId, ws)` | STORY-FE-1 + BE-4 | grep `setTabConfig\|triggerManualReview\|sendSnapshot` in `websocket.ts` |
| `aos-cloud-terminal-sidebar` | `model.providers.list` | Single fetch beim Mount, gecacht in Property `availableProviders` | STORY-FE-1 | grep `model.providers.list` in `aos-cloud-terminal-sidebar.ts` |
| `aos-cloud-terminal-sidebar` | `aos-terminal-tabs` | Property-Reach-Down `availableProviders` | STORY-FE-1 | grep `.availableProviders` in `aos-cloud-terminal-sidebar.ts` |
| `aos-review-prompt-editor` | `gateway` (WS) | WS-Send `plan-review:prompt.get|update` | STORY-FE-3 | `grep -n "plan-review:prompt" ui/frontend/src/components/settings/` |
| `settings-view.ts` | `aos-review-prompt-editor` | Lit-Template-Einbindung | STORY-FE-3 | `grep -n "aos-review-prompt-editor" ui/frontend/src/views/settings-view.ts` |

### Verbindungs-Details (geänderte/neue)

**VERBINDUNG-1 (überarbeitet): `cloud-terminal-manager.ts` → `PlanReviewOrchestrator`**
- **Art:** EventEmitter-Subscribe; nur emittieren wenn `planReviewEnabled === true`.
- **Schnittstelle:** Event `session.plan-detected`, Payload `(sessionId, planText, source: 'auto'|'manual')`.
- **Detection-Pfad (auto):** `terminal.data`-Listener checkt aktuellen 32KB-Buffer-Tail gegen `PLAN_BOX_PATTERN` (TUI-Box mit Confirmation-Marker). Match → `PlanBufferExtractor.extract(buffer)` → emit Event mit extracted Text.
- **Detection-Pfad (manuell):** `triggerManualReview(sessionId)`-Methode → liest 32KB-Tail → `PlanBufferExtractor.extract(buffer)` → emit Event mit `source='manual'`.
- **Story:** STORY-BE-1.

**VERBINDUNG-3 (überarbeitet): `ExternalReviewer` → SDK mit env-var**
- **Art:** SDK-`query()` mit dokumentierter `Options.env`.
- **Schnittstelle:** `query({ prompt, options: { cwd: projectPath, model: undefined, maxTurns: 1, env: { ...process.env, CLAUDE_CONFIG_DIR: expandTilde(`~/.claude-${providerId}`) }, abortController: timeoutController }})`.
- **Timeout-Helper:** `withTimeout<T>(fn: () => Promise<T>, ms: number): Promise<T>` der `setTimeout(() => abortController.abort(), ms)` setzt und Abort als `Error('Reviewer timeout')` rauft.
- **Smoke-Test in Phase 1 verifiziert die Annahme.**
- **Story:** STORY-BE-2.

**VERBINDUNG-4 (überarbeitet): Inject mit Template + Idle-Wait**
- **Art:** `cloudTerminalManager.waitForIdle(sessionId, 500)` → wenn Idle: `sendInput(sessionId, injectText)`.
- **Inject-Template:**
  ```
  Please review your previous plan against the following external review feedback and update your plan accordingly. Focus on legitimate concerns; ignore feedback that conflicts with the original requirements.

  ===== External Review =====
  ## Reviewer: <providerId>:<modelId>
  <reviewer output>

  ## Reviewer: <providerId>:<modelId>
  <reviewer output>
  ===========================
  ```
- **Send-Strategy:** Text in einer großen `sendInput()`-Call senden mit `\n` am Ende (kein extra Enter — die CLI ist im REPL-Modus, ein Newline triggert Submit).
- **Edge:** Wenn Inject-Text > N Bytes → in Chunks zerlegen mit kleinem Delay zwischen Chunks; bisher unbekanntes Limit, in Phase 2 messen.
- **Story:** STORY-BE-2.

**VERBINDUNG-5 (überarbeitet): Toggle → DOM-Events**
- **Art:** `aos-auto-review-toggle` ist dumb — emittiert nur DOM-CustomEvents, kein WS-Zugriff.
- **Events:**
  - `auto-review-config-changed` — `detail: { sessionId, enabled, reviewers: [{providerId, modelId}] }` — feuern OHNE Debounce bei Toggle/Multi-Select-Change.
  - `auto-review-trigger-manual` — `detail: { sessionId }` — feuern bei Button-Click.
- **Bubbling:** Events bubbeln durch `aos-terminal-tabs` zu `aos-terminal-session`, dort werden sie zu WS-Sends gewandelt.
- **Story:** STORY-FE-1.

**VERBINDUNG-6 (überarbeitet): Backend → Frontend Stream + Snapshot**
- **WS-Push-Messages:**
  - `plan-review:config.snapshot` — bei Tab-Connect/Resume Push; `{ sessionId, enabled, reviewers, prompt }` — Frontend übernimmt blind.
  - `plan-review:started` — Backend erkannt Plan, fängt Reviewer-Call an; `{ sessionId, source: 'auto'|'manual', reviewerCount }`.
  - `plan-review:reviewer.result` — Pro Reviewer 1 Message (Result-only, kein Token-Stream); `{ sessionId, reviewerId, status: 'fulfilled'|'rejected', output, error? }`.
  - `plan-review:aggregated` — Aggregat fertig vor Inject; `{ sessionId, aggregatedText }`.
  - `plan-review:injected` — Inject erfolgreich; `{ sessionId }`.
  - `plan-review:error` — Allgemeiner Fehler (z.B. PlanBufferExtractor wirft); `{ sessionId, message }`.
- **Frontend-Mapping:** `aos-terminal-session` hält `currentReview: ReviewState` Property, propagiert an `<aos-plan-review-block>`.
- **Story:** STORY-BE-4 + STORY-FE-2.

**VERBINDUNG-9 (überarbeitet): Prompt-Storage = bestehender general-config**
- **Art:** Field-Add `reviewPrompt` in `GeneralConfig`.
- **Default-Prompt:**
  ```
  You are an external reviewer for an implementation plan. Read the plan carefully and provide concrete, actionable feedback focused on:
  - Architectural risks
  - Missing edge cases
  - Inconsistencies between requirements and implementation
  - Simpler alternatives that preserve all features

  Be specific and reference parts of the plan. Be concise.
  ```
- **Validierung:** Empty-String wird in `aos-review-prompt-editor` blockiert; Backend zusätzlich.
- **Migration:** Bestand-Configs ohne Field bekommen Default beim Load (existiert in `general-config.ts` bereits Migration-Logic für Flat→Nested).
- **Story:** STORY-BE-3.

### Verbindungs-Checkliste
- [x] Jede neue Komponente hat mindestens eine Verbindung definiert
- [x] Jede Verbindung ist einer Story zugeordnet
- [x] Validierungsbefehle sind ausführbar
- [x] Bidirektionaler State-Sync via Snapshot-Push (review-feedback addressed)
- [x] Toggle-Component hat keine direkte WS-Abhängigkeit (review-feedback addressed)

---

## Abhängigkeiten

### Interne Abhängigkeiten

```
aos-auto-review-toggle ─DOM-event─> aos-terminal-tabs ─DOM-event─> aos-terminal-session ─WS─> websocket.ts
aos-plan-review-block ─renders-in─> aos-terminal-session (BELOW xterm panel)
aos-review-prompt-editor ─renders-in─> settings-view

websocket.ts ─owns/wires─> PlanReviewOrchestrator
websocket.ts ─snapshot-push─> aos-terminal-session

PlanReviewOrchestrator ─subscribes-to─> CloudTerminalManager (Event)
PlanReviewOrchestrator ─uses─> ExternalReviewer
PlanReviewOrchestrator ─uses─> PlanBufferExtractor
PlanReviewOrchestrator ─reads─> general-config.getReviewPrompt
PlanReviewOrchestrator ─reads─> ModelConfig (getProvider/getAllProviders)
PlanReviewOrchestrator ─calls─> CloudTerminalManager.waitForIdle + sendInput

ExternalReviewer ─uses─> @anthropic-ai/claude-agent-sdk (Options.env.CLAUDE_CONFIG_DIR)
ExternalReviewer ─uses─> withTimeout helper
```

### Externe Abhängigkeiten

- `@anthropic-ai/claude-agent-sdk` v0.1.x — bereits installiert; nutzt dokumentierte `Options.env`-API (`runtimeTypes.d.ts:296`).
- `~/.claude-{provider}/settings.json` — Existenz pro gewähltem Provider; Fehlen → einzelner Reviewer-Fail (Best-Effort, Skip).
- `node-pty` (transitiv) — unverändert.

---

## Risiken & Mitigationen

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|--------|------------|
| **`PLAN_BOX_PATTERN` matcht nicht zuverlässig** (verschiedene Plan-Mode-Renderings, abhängig von Claude-Code-Version) | **High** | Med | **Manueller Trigger-Button** als Backup. Auto-Detection ist Convenience, nicht Pflicht. UI signalisiert, wenn Auto nichts gefunden hat (z.B. dezenter Hint nach 30s seit letzter Plan-Aktivität). Pattern wird in Phase 1 gegen reale Plan-Mode-Outputs kalibriert. |
| **PTY-Buffer-Plan-Extraction schlägt fehl** (TUI-Box-Format ändert sich) | Med | Med | `PlanBufferExtractor` wirft bei Empty-Result → WS-`plan-review:error` → UI zeigt "Could not extract plan content. Try manual trigger."; Reviewer-Call passiert nicht. |
| **SDK `Options.env.CLAUDE_CONFIG_DIR` funktioniert nicht wie erwartet** (SDK lädt vielleicht User-Default-Config trotz env-var) | Med | High | **Phase 1 Smoke-Test ist GO/NO-GO**. Wenn Smoke-Test failed: Architektur-Pivot zu Direct-HTTP-Call gegen `ANTHROPIC_BASE_URL` aus settings.json (read JSON, post chat completions, parse). Mehr Code aber portabel. |
| Reviewer-Modell-Context-Limit bei großen Plänen | Med | Med | Kein Truncate (Requirement). Best-Effort: einzelner Fail via `allSettled.rejected`, andere laufen. UI markiert Sub-Block als "Failed: Provider rejected request". |
| Race Conditions bei rapid plan-re-runs | Low | High | Per-Session-Lock im Orchestrator. Re-Trigger während Lock → ignoriert + WS-Warning. |
| WS Back-Pressure bei n parallelen Reviewer-Streams | Low | Med | **Result-only-Push** (1 Message/Reviewer bei Done) — keine Token-Streams. Token-Streams optional in v2. |
| `~/.claude-{provider}` fehlt | High | Low | Reviewer wirft → `allSettled.rejected` → UI-Sub-Block "Provider config missing". Kein Gesamt-Abbruch. |
| Inject-Text kollidiert mit aktivem Plan-Mode-UI | Med | High | **`waitForIdle(500)` vor Inject** (neue Method in cloud-terminal-manager via `lastDataAt`-Check). Wenn nach 5s noch nicht idle → Send anyway + WS-Warning. |
| `claude-agent-sdk` blockt/hängt bei kaputtem Provider | Low | Med | **`withTimeout(60s, AbortController)` Helper** im ExternalReviewer. Standard JS-Pattern. |
| Tab-Wechsel während Review läuft | High | Low | Backend tab-agnostisch — läuft weiter. Frontend rendert bei Tab-Rückkehr aus dem `aos-terminal-session`-State (der Live-Updates erhält auch ohne Sichtbarkeit). |
| Stale Provider-Liste in Toggle | Low | Low | Sidebar fetched **einmal beim Mount**, propagated als Property. Kein Per-Toggle-Refetch. Bei Provider-Config-Änderung im Backend: Neuer Sidebar-Mount via Page-Reload (akzeptabel). |
| Toggle-Change vs. Plan-Trigger Race | Med | Med | **Kein Debounce** auf Toggle-Events. WS-Send sofort. Multi-Select-Change innerhalb 1 Frame coalesced (kein User-spürbarer Verzug). |
| **xterm-Canvas-Rendering** — kein Inline-Block | (Architektur-Korrektur) | — | Block lebt außerhalb xterm, in eigenem DOM-Bereich unter dem Terminal-Panel. UX-Layout: Terminal oben, Review-Block unten, Splitter dazwischen optional. |

---

## Self-Review Ergebnisse

### Validiert (nach Review-Agent-Feedback überarbeitet)

- **Vollständigkeit:** Alle 11 funktionalen Requirements aus `requirements-clarification.md` haben mindestens eine Komponente + Story zugeordnet (Mapping siehe Feature-Preservation-Checkliste).
- **Konsistenz:** Reviewer-Pfad nutzt SDK Options.env (dokumentiert), Original-Session-Pfad bleibt PTY. Kein Hybrid-Bruch.
- **Komponenten-Verbindungen:** Jede neue Komponente (3 Backend-Services + 1 Util, 1 Protocol, 3 Lit-Components) hat eingehende und ausgehende Verbindungen; alle Story-zugeordnet.
- **State-Ownership:** Klar geregelt — Backend = Source of Truth, Frontend rendert nur. Snapshot-Push schließt Sync-Gap.
- **WS-Trennung:** Toggle ist dumb (DOM-Events), Session ist gateway-aware (WS-Sends).
- **Patterns wiederverwendet:** EventEmitter (CloudTerminalManager), JSON-Store (existing general-config.ts mit field-add), WS-Handler-Switch (websocket.ts), Lit Light-DOM Components.

### Identifizierte Probleme & Lösungen (vollständig nach Review-Agent-Feedback)

| Problem | Ursprünglicher Plan | Verbesserung |
|---------|---------------------|--------------|
| Review-Block "inline im xterm" | DOM-Injection in xterm-Canvas | Block als separater DOM-Bereich unterhalb des Terminal-Panels. |
| State-Sync nur unidirektional | FE-→BE-Update only | Backend = SoT, push `config.snapshot` bei Connect/Resume. |
| voice-call als CLAUDE_CONFIG_DIR-Vorlage falsch | Falsche Pattern-Referenz | SDK Options.env explizit referenziert (`runtimeTypes.d.ts:296`). Phase 1 Smoke-Test als GO/NO-GO. |
| Timeout-Pattern nicht im Codebase | Unbegründete Behauptung | Konkrete `withTimeout(fn, ms)`-Helper-Implementation, ~10 LOC. |
| Toggle ohne WS-Access | Implizit erwartet | Toggle = dumb DOM-Events. Session relayed. Lit-Pattern. |
| PTY-Plan-Text-Extraktion glossed over | Implizit | Eigener `PlanBufferExtractor`-Util mit ANSI-Strip + TUI-Box-Parsing. Wirft bei Failure. |
| PTY-Idle-Detection fehlt | Behauptung ohne Mechanismus | Konkrete `lastDataAt`-Tracking + `waitForIdle(ms)`-Method. |
| Inject-Text under-specified | `text + '\n'` | Explizites Inject-Template mit User-Anweisung. |
| ReviewPromptStore over-engineered | Eigener Service für 1 String | Field-Add in bestehendem `general-config.ts`. |
| Pattern fragil | Ein Regex | TUI-Box-Pattern + **manueller Trigger-Button** als Backup. |
| Multi-Listener-Race auf model.providers.list | Per-Toggle-Refetch | Sidebar fetched einmal, propagiert via Property. |
| Debounce-Race | 200ms Debounce | Kein Debounce auf Toggle. |

### Offene Fragen

- **Plan-Mode-UI-Pattern-Kalibration:** In Phase 1 muss reales Claude-Code-CLI-Plan-Mode-Output-Sample gegen `PLAN_BOX_PATTERN` getestet werden. Pattern könnte sich pro CLI-Version unterscheiden — Versions-Kompatibilität ist v1-Risiko.
- **SDK Options.env CLAUDE_CONFIG_DIR Verhalten:** In Phase 1 verifizieren. Wenn SDK env-var ignoriert (z.B. Worker-Spawn übergibt nicht alle envs), Pivot nötig.

---

## Minimalinvasiv-Optimierungen

### Wiederverwendbare Elemente gefunden

| Element | Gefunden in | Nutzbar für |
|---------|-------------|-------------|
| `PROMPT_PATTERN` + Dedup-Logik | `cloud-terminal-manager.ts:68` | Vorlage für `PLAN_BOX_PATTERN` (1:1 Pattern-Mechanik, neuer Regex) |
| EventEmitter `session.*`-Convention | `cloud-terminal-manager.ts:91` | Neuer Event `session.plan-detected` ohne neuen Mechanismus |
| `claudeQuery` SDK-Headless-Pattern | `voice-call.service.ts:594` | `ExternalReviewer` strukturell identisch (CLAUDE_CONFIG_DIR neu via Options.env, Pattern unverändert) |
| `setAutoModeActive` Pattern | `cloud-terminal-manager.ts:560` | `setPlanReviewEnabled` 1:1 |
| `general-config.ts` JSON-Store | `general-config.ts` | Field-Add statt eigener Service |
| Settings-WS-Handler-Pattern | `websocket.ts` (`settings.general.*`) | `plan-review:prompt.*` analog |
| `Promise.allSettled` | Standard JS | Eigener Use-Case — kein Custom-Orchestrator |
| Lit Light-DOM-Convention | `aos-terminal-tabs.ts` | 3 neue Components folgen identischem Pattern |
| `model.providers.list` WS-Endpoint | `websocket.ts:944-949` | Toggle-Provider-Liste ohne Erweiterung |
| `gateway` Singleton | `frontend/src/gateway.ts` | `aos-terminal-session` ist gateway-aware, Toggle nicht |

### Optimierungen (nach Review-Feedback erweitert)

| Ursprünglich | Optimiert zu | Ersparnis |
|--------------|--------------|-----------|
| Custom Plan-Detection mit State-Machine | TUI-Box-Pattern + Dedup-Window analog `PROMPT_PATTERN` | ~50 LOC, reuse |
| Reviewer als zweiter PTY | SDK-Headless-`query()` mit Options.env | Kein PTY-Slot, kein TUI-Parsing |
| Per-Tab Backend-Persistence-Store | Pure In-Memory-Map im Orchestrator | Kein File-I/O |
| Eigener `ReviewPromptStore` für 1 String | Field-Add in `general-config.ts` | 1 ganzer Service eliminiert |
| Custom Stream-Multiplexer | Existing WS + 1 Result-Message/Reviewer | Reuse Multi-Plexing |
| Custom Orchestrator-Threading | `Promise.allSettled([...])` | Native, ~5 LOC |
| Pro-Reviewer Prompt-Editor | Single global Default | Eine Component weniger |
| **Toggle mit eigenem WS-Import** | **Dumb-Component + DOM-Events** | Konsistent mit Sidebar-Pattern, keine doppelte gateway-Init |
| **Per-Toggle Provider-List-Refetch** | **Sidebar-Single-Fetch + Property-Propagation** | Kein Multi-Listener-Race |

### Feature-Preservation bestätigt

- [x] R1 Auto-Review-Toggle → `aos-auto-review-toggle`
- [x] R2 Multi-Select Reviewer → `aos-auto-review-toggle` Multi-Select aus `model-config.ts`
- [x] R3 Plan-Detection → `cloud-terminal-manager.ts` (`PLAN_BOX_PATTERN` + Manual Trigger Backup)
- [x] R4 Reviewer-Spawn via `CLAUDE_CONFIG_DIR` → `ExternalReviewer` mit SDK Options.env
- [x] R5 Identischer Prompt für alle → `PlanReviewOrchestrator` lädt einmal pro Detection, broadcastet
- [x] R6 Aggregierte Outputs mit Modell-Labels → `PlanReviewOrchestrator.aggregate()` + Inject-Template
- [x] R7 Inject-Loop → `cloudTerminalManager.waitForIdle(500)` + `sendInput()`
- [x] R8 1 Iteration fix → Orchestrator hat keinen Loop
- [x] R9 Sichtbarer collapsible Block + Sub-Blöcke → `aos-plan-review-block` außerhalb xterm
- [x] R10 Editierbarer Default-Prompt → `aos-review-prompt-editor` + `general-config.reviewPrompt`
- [x] R11 Settings volatil pro Tab → In-Memory-Map im Orchestrator (Backend SoT)
- [x] Edge: Einzel-Fail Skip → `Promise.allSettled` filtered
- [x] Edge: Alle Fails → kein Inject (Branch im Orchestrator)
- [x] Edge: Tab-Wechsel → Backend tab-agnostisch
- [x] Edge: Auto-Detection-Miss → manueller Trigger-Button
- [x] Kein Feature wurde geopfert
- [x] Alle Akzeptanzkriterien bleiben erfüllbar

---

## Critical Files for Implementation

- `ui/src/server/services/cloud-terminal-manager.ts` — Plan-Exit-Detection-Hook + waitForIdle
- `ui/src/server/services/voice-call.service.ts` — Pattern-Referenz für SDK-Headless-Aufruf (Options.env wird neu genutzt)
- `ui/src/server/general-config.ts` — Field-Add `reviewPrompt`
- `ui/src/server/model-config.ts` — Provider-Registry (read-only)
- `ui/src/server/websocket.ts` — Message-Routing + Snapshot-Push + Listener-Verdrahtung
- `ui/node_modules/@anthropic-ai/claude-agent-sdk/entrypoints/sdk/runtimeTypes.d.ts:296` — `Options.env`-API-Definition

---

## Anhang: Antworten auf Review-Agent-Feedback

| # | Finding | Status | Plan-Änderung |
|---|---------|--------|---------------|
| 1 | Review-Block kann nicht inline in xterm rendern | ACCEPTED | Block lebt außerhalb xterm, separater DOM-Bereich unterhalb Terminal-Panel |
| 2 | Config-State-Ownership unklar | ACCEPTED | Backend = SoT, Snapshot-Push bei Connect/Resume |
| 3 | voice-call hat kein CLAUDE_CONFIG_DIR-Beispiel | ACCEPTED | SDK Options.env direkt referenziert (`runtimeTypes.d.ts:296`); Phase 1 Smoke-Test verifiziert |
| 4 | Timeout-Pattern existiert nicht im Codebase | ACCEPTED | `withTimeout`-Helper konkret spezifiziert |
| 5 | Toggle hat keinen WS-Zugriff | ACCEPTED | Toggle = dumb-Component, DOM-Events, Session relayed |
| 6 | PTY-Text-Extraktion glossed over | ACCEPTED | `PlanBufferExtractor`-Util mit ANSI-Strip + TUI-Box-Parsing als eigene Komponente |
| 7 | PTY-Idle-Detection fehlt | ACCEPTED | `lastDataAt` + `waitForIdle()` als neue Method in cloud-terminal-manager |
| 8 | Inject-Text-Format under-specified | ACCEPTED | Explizites Inject-Template mit klarer User-Anweisung |
| 9 | ReviewPromptStore over-engineered | ACCEPTED | Drop separater Service, Field `reviewPrompt` in `general-config.ts` |
| 10 | PLAN_EXIT_PATTERN fragil | ACCEPTED **partially** | TUI-Box-Pattern bleibt (best-effort) + manueller Trigger-Button als Backup; Honest Documentation des Risikos |
| 11 | model.providers.list Multi-Listener | ACCEPTED | Sidebar-Single-Fetch + Property-Propagation |
| 12 | Debounce-Race | ACCEPTED | Kein Debounce auf Toggle, sofortiges WS-Send |
