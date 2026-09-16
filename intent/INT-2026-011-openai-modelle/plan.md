# Plan: OpenAI-Modelle (GPT-6 Astra, Codex) in der Web-UI

> **Intent:** `intent.md` (INT-2026-011) · **Spec:** entfällt (bypass: Größe S — zwei Provider-Einträge, eine Sperre in der Prüfer-Auswahl mit Test, eine Doc-Zeile; Rest ist Einrichtung außerhalb des Repos)
> **Status:** in_umsetzung
> **Erstellt:** 2026-09-16 im Plan Mode · **Freigabe:** Product Owner (Michael Sindlinger), 2026-09-16 — „Alle vier ok, Freigabe" (D1–D4 wie vorgeschlagen)
> **Pflichtinput gelesen:** `docs/architecture.md` (Stand `d0d8b8c`), `CLAUDE.md`, `docs/security.md`

<!-- Der Plan ist TECHNISCH und die EINHEIT DER AUSFÜHRUNG. Eine Sitzung setzt ihn ganz um.
     Maßstab: Ein neues Teammitglied könnte allein anhand dieses Dokuments umsetzen.
     Jede Änderung verweist auf eine FA (spec.md) oder ein AK (intent.md). Keine Änderung ohne Herkunft.
     Zwei Leser: „In einfachen Worten" liest die Person, die freigibt; „Details" liest der Agent, der baut. Die erste Zeile unter jeder
     Überschrift sagt, für wen der Abschnitt ist (R1, specwright/workflows/meta/leser-und-rueckfragen.md). Marker übernehmen, keinen entfernen. -->

## In einfachen Worten

<!-- leser: mensch -->

**Worum geht es?** Die Web-UI kennt acht Anbieter von KI-Modellen (Anthropic, GLM, DeepSeek, Grok und andere), aber keinen von OpenAI. Du willst GPT-6 Astra und die beiden GPT-5.6-Modelle Sol und Luna im Alltag vergleichen, und zwar auf zwei Wegen: erstens wie jeden anderen Fremdanbieter, also als Claude-Code-Sitzung, die im Hintergrund über einen Übersetzer (den „Proxy") mit deinem ChatGPT-Konto spricht; zweitens die Codex-CLI von OpenAI selbst, so wie du sie im Terminal starten würdest — nur eben aus dem Dropdown der UI heraus.

**Was ändert sich?** Im Modell-Dropdown eines Terminals stehen danach zwei neue Einträge. „OpenAI" mit drei Modellen verhält sich wie eine Anthropic-Sitzung: Status-Punkt, Glocke, Gespräch und Prüfer-Auswahl funktionieren, weil unter der Haube weiter Claude Code läuft. „Codex (nativ)" mit denselben drei Modellen startet dagegen das Programm von OpenAI; die UI zeigt dafür ehrlich keinen Status-Punkt, keine Glocke und kein Gespräch, weil Codex der UI nichts meldet. Der Prüfer-Dialog (die Häkchenliste, mit der du mehrere Modelle einen Plan gegenlesen lässt) bietet OpenAI an, Codex (nativ) aber nicht — Codex kann diese Prüf-Aufgabe nicht ausführen. Aus demselben Grund taucht Codex (nativ) auch nicht in der Modellwahl auf der Vorhaben-Seite („Nächster Schritt") und nicht in den Standard-Modellen je Schritt in den Einstellungen auf: Dort wird eine Sitzung mit einem Specwright-Befehl wie `/plan INT-…` gestartet, den Codex nicht kennt. Auf dem Cloud-Server ändert sich nichts — wenn du dort OpenAI wählst, kommt eine sichtbare Fehlermeldung („Programm nicht gefunden"), kein stilles Ausweichen.

**Wie wird das gemacht?** Der größte Teil ist Einrichtung auf deinem Mac, außerhalb des Repos, so wie damals bei Grok: Der Proxy bekommt ein Update (die installierte Fassung kennt GPT-6 Astra noch nicht), wird einmal mit deinem ChatGPT-Konto angemeldet und neu gestartet. Dann entsteht ein kleines Startprogramm `~/bin/claude-codex`, das Claude Code mit den richtigen Einstellungen für den Proxy startet — und vorher prüft, ob der Proxy läuft und angemeldet ist. Falls nicht, sagt es das im Terminal und bricht ab, statt dass du minutenlang auf eine Antwort wartest. Der alte Ordner `~/.claude-codex` vom Januar (ein toter Versuch mit einem anderen Proxy) wird gesichert und neu aufgesetzt. Die Codex-CLI selbst wird neu installiert (die vorhandene Fassung ist kaputt: das eigentliche Programm fehlt) und mit dem ChatGPT-Konto angemeldet.

Im Repo sind es ein Dutzend kleine Stellen. Die Anbieterliste `ui/config/model-config.json` bekommt die zwei Einträge. Eine neue, winzige Hilfsfunktion beantwortet die Frage „ist dieser Anbieter eine Claude-Code-Sitzung oder ein fremdes Programm?" — und zwar mit derselben Regel, nach der die UI heute schon entscheidet, ob sie einer Sitzung ihre Status-Meldungen anhängt (`ui/src/server/services/cloud-terminal-manager.ts:850-854`: der Programmname beginnt mit `claude`). Diese eine Regel benutzen dann fünf Stellen: die Status-Anbindung (wie bisher), die Prüfer-Liste, die Modellwahl auf der Vorhaben-Seite, die Standard-Modelle in den Einstellungen und der Start eines Schritts im Backend. So gibt es keine zweite Regel, die irgendwann von der ersten abweicht. Weil die Regel eine Namenskonvention ist (alle zehn Startprogramme heißen heute `claude-…`), wacht ein Test darüber: Jeder Anbieter in der Liste muss entweder `claude…` heißen oder ausdrücklich als fremd geführt sein — ein neuer Eintrag, der aus der Reihe tanzt, macht den Test rot, statt still den Status zu verlieren. Beim Start schreibt das Backend außerdem eine Zeile ins Log, welche Anbieter als fremd gelten. Die Fehlermeldung, wenn ein Startprogramm auf einem Rechner fehlt (heute: „bitte Claude Code installieren"), nennt künftig den fehlenden Anbieter — auf dem Cloud-Server wäre das sonst das Erste, was du bei OpenAI siehst. Dazu kommen zwei Doc-Korrekturen: `docs/security.md` führt die Anbieterliste noch als „nie committen", obwohl sie seit Monaten versioniert ist (du hast das am 16.09. entschieden: Namen ins Repo, Zugänge bleiben draußen); `docs/architecture.md` bekommt einen Halbsatz, dass das Cloud-Terminal auch fremde Programme startet.

Eine Falle habe ich beim Lesen gefunden: Der Commit-Wächter `no-secrets` (der Hook, der Commits mit Zugangsdaten blockiert) sperrt pauschal jede Datei unter einem Ordner namens `config`, deren Name auf `.json` endet — also auch die Anbieterliste. Der Bau würde beim Commit hängenbleiben. Zwei Auswege: Der Wächter bekommt eine kleine Erweiterung — er liest, falls vorhanden, eine Ausnahmeliste `.claude/no-secrets-allow.txt` im jeweiligen Projekt; Specwright trägt dort seine drei versionierten UI-Konfigurationsdateien ein (Modelle, allgemeine Einstellungen, Prompt-Vorlagen). Ohne diese Datei bleibt der Wächter überall so streng wie heute; die Ausnahme ist sichtbar, versioniert und wird im Review gelesen. Das ist eine Änderung an der Vorlage, die alle Projekte bekommen, mit Versionssprung auf 4.1.1. Oder der Wächter bleibt unverändert, und du committest die Anbieterliste selbst in deinem Terminal, jetzt und bei jeder späteren Änderung an dieser Datei. Ich empfehle den ersten Weg; der externe Review hielt eine allgemeine Lockerung (Dateinamen nur bei neuen Dateien prüfen) für zu weit — deshalb jetzt die ausdrückliche Ausnahmeliste statt der Lockerung.

**Was kann schiefgehen?** Der Proxy-Neustart unterbricht laufende Grok-Sitzungen — das merkst du sofort; wir legen den Zeitpunkt gemeinsam fest. Die Codex-CLI könnte die drei Modelle unter anderen Namen führen als der Proxy; das prüfen wir nach der Neuinstallation, und dann werden nur die Namen im Codex-(nativ)-Eintrag angepasst. Die Regel „Programmname beginnt mit `claude`" ist eine Konvention, keine Garantie: Ein künftiges Startprogramm ohne dieses Präfix würde als fremd gelten und keinen Status-Punkt bekommen — das fällt sofort auf, und die Konvention steht im Code. Rückgängig ist alles mit einem Revert des Commits; die Einrichtung am Mac lässt sich mit dem gesicherten Ordner zurückdrehen.

**Was musst du entscheiden?** Vier Dinge, alle mit Vorschlag — *entschieden 2026-09-16 (Product Owner): alle vier wie vorgeschlagen.*

1. Codex (nativ) auch aus der Modellwahl der Vorhaben-Seite und aus den Standard-Modellen je Schritt heraushalten (über die Sperre in der Prüfer-Auswahl hinaus)? Vorschlag: ja — dort startet die UI Specwright-Befehle, die Codex nicht kennt; das Vorhaben verspricht „nirgends angeboten, wo es nicht funktioniert".
2. Commit-Wächter um eine projekteigene Ausnahmeliste erweitern (Version 4.1.1) oder die Anbieterliste selbst committen? Vorschlag: Ausnahmeliste.
3. Codex (nativ) ohne Rückfragen und ohne Sandbox starten (Schalter `--dangerously-bypass-approvals-and-sandbox`), so wie Claude-Sitzungen in der UI mit `--dangerously-skip-permissions` laufen? Vorschlag: ja, gleiche Vertrauensstufe; der Schalter steht in der Anbieterliste und ist jederzeit änderbar.
4. Welches OpenAI-Modell übernimmt die kleinen Hintergrundaufrufe, die Claude Code neben dem Hauptmodell macht? Vorschlag: Luna für die kleinen, Sol für die mittleren, Astra für die großen — Annahme: Luna ist das kleinste der drei. Falls du es anders weißt, sag es; das ist eine Zeile in der Einrichtung.

## Details

<!-- leser: mensch -->

<!-- Volle technische Tiefe: Dateien, Funktionen, Datenmodell, Tradeoffs, Testplan. Geht an Reviewer und in die Bausitzung, muss für sich stehen.
     Confidence-Tags in beiden Teilen: [Certain] harte Belege · [Likely] starke Inferenz · [Uncertain] Vermutung. -->

### 1. Kurzfassung

<!-- leser: mensch -->

Zwei Provider-Einträge in `ui/config/model-config.json` (`codex` = Claude Code über `claude-codex`-Wrapper und `claude-code-proxy`; `codex-cli` = native Codex-CLI), eine gemeinsame Regel `isClaudeCli(cliCommand)` in `ui/src/shared/provider-cli.ts`, die die bestehende Hook-Heuristik (`cloud-terminal-manager.ts:852`) übernimmt und zusätzlich `extraCliArgs`, Prüfer-Liste, Vorhaben-Modellwahl, Schritt-Standards (Lesen und Schreiben) und Schritt-Start filtert; Konvention durch Vertragstest und Start-Log sichtbar. Einrichtung (Proxy-Upgrade 0.1.34 → 0.1.40, Codex-OAuth, Wrapper, `~/.claude-codex`, Codex-CLI 0.154.0) läuft manuell am Mac (§10). Docs: `security.md` §1/§3, `architecture.md` §2. Entscheidungsbedarf D1–D4 (§12); externer Review E1–E17 eingearbeitet.

### 2. Ausgangslage im Code

<!-- leser: agent -->

| Bereich | Heute (Datei:Zeile) | Bedeutung für dieses Vorhaben |
|---|---|---|
| Provider-Liste | `ui/config/model-config.json:1-215` — 8 Provider, git-getrackt (`git ls-files ui/config/`), zuletzt `ec8de89` | [Certain] Ort der beiden neuen Einträge. Grok-Eintrag (`:194-214`) ist die Vorlage: `cliCommand: "claude-grok"`, `cliFlags: ["--model","{modelId}"]` |
| Typ `ModelProvider` | `ui/src/server/model-config.ts:12-18` (`id`, `name`, `cliCommand`, `cliFlags`, `models`) | [Certain] Kein neues Feld nötig; Sitzungsart wird aus `cliCommand` abgeleitet |
| Kommando aus Provider | `model-config.ts:201-221` `getProviderCommand()` — ersetzt `{modelId}` als eigenes Array-Element; `:598-620` `getCliCommandForModel()` Fallback auf `claude` | [Certain] Wiederverwendbar unverändert; `codex --model gpt-6-astra` entsteht daraus |
| Prüfer-Standard | `model-config.ts:242-247` `DEFAULT_REVIEWER_IDS` (Opus, GLM 5.2, MiniMax M3, DeepSeek Pro) | [Certain] Bleibt (NZ-04) |
| Schritt-Standards | `model-config.ts:529-565` `getStepDefault()`, `setStepDefault()` prüft nur `getModel()` | [Certain] Muss fremde Provider ablehnen (D1) |
| Provider-Cache | `model-config.ts:103-129` `cachedConfig` | [Certain] Falle: laufendes Backend liest JSON-Änderung nicht nach → Neustart (§10 Schritt 8); Settings-Save schreibt sonst den alten Stand zurück |
| Terminal-Spawn | `ui/src/server/services/cloud-terminal-manager.ts:836-866` — `getProviderCommand` → `shellCommand`/`shellArgs`; `:852` `path.basename(shellCommand).startsWith('claude')` entscheidet über `--settings` (Hooks); `:869-873` `checkCliAvailability` = `which` | [Certain] Regel für „Claude-CLI" existiert genau hier, inline. Wird in die gemeinsame Funktion gezogen. Fehlertext bei fehlender CLI nennt `npm install -g @anthropic-ai/claude-code` (für Codex irreführend, aber sichtbar) |
| Agent-Status | `cloud-terminal-manager.ts:668` `agentStatus: 'unknown'` beim Anlegen; Übergänge nur über `reportAgentEvent` (`:372-386`, Hook-Route) und `user-input` bei `blocked` (`:1330`); Reducer `agent-status.ts:20-46` | [Certain] Ohne `--settings` feuert kein Hook → Status bleibt `unknown` (AK-06 heute schon erfüllt, nur ungetestet für die Zusicherung) |
| Status in der UI | `ui/frontend/src/components/terminal/agent-status.ts:27,44-46` — `unknown` = kein Punkt, kein Label | [Certain] „ehrlich ohne Statusmeldung" ist das bestehende Verhalten |
| Prüfer-Liste (Backend) | `ui/src/server/websocket.ts:966-985` `handleModelProvidersList()` → alle Provider | [Certain] Muss auf Claude-CLIs filtern (AK-07) |
| Modell-Liste (Backend) | `websocket.ts:938-964` `handleModelList()` → `id`, `name`, `models[]`, `stepDefaults` | [Certain] Bekommt `cliKind` je Provider; Konsumenten: Terminal-Dropdown (`aos-model-dropdown.ts:282-292`), Vorhaben-Seite (`vorhaben.service.ts:165-178`), `model-selector.ts` |
| Prüfer-Liste (Frontend) | `ui/frontend/src/components/terminal/aos-auto-review-toggle.ts:352-395` rendert `availableProviders`; Quelle `aos-cloud-terminal-sidebar.ts:2852-2856` aus `model.providers.list` | [Certain] Keine Frontend-Änderung nötig, wenn das Backend filtert |
| Prüfer-Konfig | `websocket.ts:2757-2774` `handlePlanReviewConfigUpdate` → `plan-review-orchestrator.ts:161-172` `setTabConfig` (nur im Speicher, je Sitzung) | [Certain] Keine Persistenz alter Prüfer-Auswahlen → Filter der Liste reicht |
| SDK-Pfad der Prüfer | `ui/src/server/utils/provider-env.ts:29-39` `buildProviderEnv(id)` → `CLAUDE_CONFIG_DIR=~/.claude-<id>`; `external-reviewer.ts:33-61` `claudeQuery({ model: modelId })` | [Certain] Provider-ID `codex` → `~/.claude-codex/settings.json` (Proxy-URL, Modell-Mapping) — wie Grok heute |
| Vorhaben „Nächster Schritt" | `ui/frontend/src/components/vorhaben/aos-naechster-schritt.ts:155-160` `preselect()` prüft gegen `this.models.providers`; `:211-217` `<aos-model-selector .externalProviders>` | [Certain] Filter auf `cliKind !== 'foreign'` an beiden Stellen (D1) |
| Start-Schritt (Backend) | `ui/src/server/services/vorhaben-service.ts:231` `resolveModel = !!getModel(...)` (injizierbar); `:617` Fehler `Modell nicht konfiguriert`; `:625-635` `createSession(..., 'claude-code', ..., command)` | [Certain] Default-`resolveModel` bekommt die Claude-CLI-Prüfung (D1) |
| Schritt-Standards (Frontend) | `ui/frontend/src/views/settings-view.ts:18-24` eigener Typ `ModelProvider` mit `cliCommand`; `:1058` `flatMap` über alle Provider | [Certain] Filter über `isClaudeCli(provider.cliCommand)` (D1) |
| Gespräch-Allowlist | `ui/src/server/services/gespraech-service.ts:114-118` `defaultConfigDirs(providerIds)` → `~/.claude-<id>` | [Certain] `~/.claude-codex` automatisch erlaubt, sobald Provider `codex` existiert (AK-03 Gespräch) |
| Shared-Module | `ui/src/shared/worktree-name.ts` (Backend + Frontend importieren, kein Node-Import) | [Certain] Muster für `provider-cli.ts` |
| Tests, Provider-Ebene | `ui/tests/unit/model-config-step-defaults.test.ts:1-33` `fresh()`-Muster mit `vi.mock('fs')`; `model-config.test.ts` steht in `ui/tests/known-failures.txt` | [Certain] Neue Tests in eigene Dateien, nie in `model-config.test.ts` |
| Tests, Hook-Anbindung | `ui/tests/unit/cloud-terminal-agent-event.test.ts:181-190` „a non-claude CLI does not receive --settings" (`/usr/local/bin/codex`), `:270` `mgr.getSession(id)?.agentStatus` | [Certain] AK-06-Test hängt sich hier an; die Datei mockt `model-config.js` komplett (`:11-15`) → Hilfsfunktion darf nicht in `model-config.ts` liegen |
| Tests, Vorhaben-Seite | `ui/tests/unit/aos-vorhaben-stage2.test.ts:17-24` `modelList`-Mock, `:240-276` `aos-naechster-schritt` | [Certain] D1-Test hängt sich hier an |
| Commit-Wächter | `.claude/hooks/no-secrets.sh:10` `SECRET_FILES='…|(^\|/)configs?/.*\.json$|…'`, `:26` `--diff-filter=ACMR` — identisch mit `specwright/templates/sdlc/hooks/no-secrets.sh` (Manifest `:184`) | [Certain] **Falle:** `ui/config/model-config.json` passt auf das Muster → `git commit` aus Claude wird blockiert (D2) |
| `security.md` | `docs/security.md:12` führt `ui/config/model-config.json` als „intern … nie committen"; `:44` Vorfall `voice-config.json` | [Certain] OF-01: berichtigen (Namen öffentlich, Zugänge vertraulich) |
| `architecture.md` | `docs/architecture.md` §1 „UI → Claude-Sitzungen tmux", §2 Backend-Zeile „Cloud-Terminal (tmux)" | [Certain] Keine AR-Regel berührt; Halbsatz „fremde Agenten-CLIs ohne Hooks" für Ehrlichkeit |
| Proxy | `claude-code-proxy 0.1.34` (brew `/opt/homebrew/bin`, Formel stable 0.1.40); `claude-code-proxy models` kennt `gpt-5.6-sol`, `gpt-5.6-luna`, **nicht** `gpt-6-astra`; `codex auth status` → „Not authenticated"; `GET /v1/models` → 200 (Health); Log `~/.local/state/claude-code-proxy/proxy.log` mit `request_completed {model, provider}` | [Certain] RB-04: Upgrade nötig; Health-Endpoint für den Wrapper; Log für die AK-09-Messung |
| Proxy-Startskript | `~/Entwicklung/claude-code-proxy/start-proxy.sh` — `--restart`, `--status` (prüft `/v1/models`); `resolve_bin` fällt auf PATH (brew) zurück, kein Fork-Binary mehr | [Certain] RB-03: Neustart unterbricht Grok |
| Grok-Vorlage | `~/bin/claude-grok` (Wrapper: `CLAUDE_CONFIG_DIR`, `unset ANTHROPIC_API_KEY`, `exec claude --dangerously-skip-permissions`); `~/.claude-grok/settings.json` `env` (`ANTHROPIC_BASE_URL` localhost:18765, `ANTHROPIC_DEFAULT_{OPUS,SONNET,HAIKU}_MODEL`, `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`), Symlinks `agents/commands/plugins/CLAUDE.md` → `~/.claude` | [Certain] Muster für `claude-codex` und `~/.claude-codex` |
| Alter Codex-Stand | `~/.claude-codex/settings.json` → `ANTHROPIC_BASE_URL http://127.0.0.1:4000` (LiteLLM, Jan 2026), Modelle `claude-sonnet-4-20250514`; kein `~/bin/claude-codex` | [Certain] OF-04: sichern, neu aufsetzen |
| Codex-CLI | `@openai/codex` 0.93.0 global (nvm v22.12.0), `vendor/aarch64-apple-darwin/codex/` leer → ENOENT; aktuell 0.154.0; `~/.codex/auth.json` mit `auth_mode` + `OPENAI_API_KEY` (API-Key-Modus); `~/.codex/config.toml` nur `projects.*.trust_level` | [Certain] Neuinstallation + `codex login` (ChatGPT) nötig |
| Codex-CLI-Flags | `codex [OPTIONS] [PROMPT]`, `-m/--model`, `-s/--sandbox`, `--dangerously-bypass-approvals-and-sandbox` (alias `--yolo`), `-C/--cd`; `codex login`, `codex login status` (exit 1 wenn nicht angemeldet) | [Likely] aus Context7 `/openai/codex` (`codex-rs/utils/cli/src/shared_options.rs`, `cli/src/login.rs`), Stand main; Bau prüft nach Neuinstallation mit `codex --help` |

### 3. Entwurf

<!-- leser: agent -->

#### Ansatz

<!-- leser: agent -->

1. **Datenebene:** zwei Provider in `model-config.json`, Modell-IDs identisch mit der Proxy-Registry (`gpt-6-astra`, `gpt-5.6-sol`, `gpt-5.6-luna`, OF-03). `codex` → `cliCommand: "claude-codex"` (Wrapper, Claude Code über Proxy). `codex-cli` → `cliCommand: "codex"`, `cliFlags: ["--dangerously-bypass-approvals-and-sandbox", "--model", "{modelId}"]` (D3).
2. **Eine Regel für die Sitzungsart:** `ui/src/shared/provider-cli.ts` mit `providerCliKind(cliCommand): 'claude' | 'foreign'` und `isClaudeCli(cliCommand)` — Basisname (letztes Segment nach `/` **oder** `\`, E1) beginnt mit `claude`. Exakt die Regel aus `cloud-terminal-manager.ts:852`, dorthin zurückgeführt (kein zweiter Schreiber). Kein `path`-Import (Shared-Modul läuft auch im Browser). **Konvention sichtbar gemacht (E3):** Vertragstest gegen die echte `model-config.json` — jeder Provider ist `claude…` oder steht in der Liste `KNOWN_FOREIGN_PROVIDERS = ['codex-cli']` des Tests; `loadModelConfig()` loggt einmalig je fremdem Provider `[ModelConfig] provider <id> runs a foreign CLI (<cmd>): no hooks, status, reviewer, step start`.
3. **Konsumenten der Regel:** (a) `cloud-terminal-manager.ts:847-854` — `--settings` **und** `extraCliArgs` (Claude-spezifische Flags wie `--mcp-config`; heute setzt kein Aufrufer sie, `grep -rn extraCliArgs ui/src/server`, E5) nur für Claude-CLIs; (b) `model-config.ts` `getReviewerProviders()` → `handleModelProvidersList` (AK-07); (c) `model-config.ts` `providersForModelList()` (reine Funktion, liefert die `model.list`-Form mit `cliKind`, E14) → `handleModelList` → `aos-naechster-schritt` filtert `cliKind === 'foreign'` (D1); (d) `setStepDefault`, `getStepDefault` (gespeicherter fremder Standard wird ignoriert, E11) und `vorhaben-service.resolveModel` (Default `isClaudeSessionModel`) lehnen `foreign` ab, `settings-view` blendet sie aus (D1). Zwei Transportwege, eine Funktion: `model.list` trägt kein `cliCommand` (deshalb das abgeleitete Feld `cliKind`), die Settings-Antwort (`websocket.ts:1442`, `loadModelConfig()` roh) trägt `cliCommand` (deshalb dort `isClaudeCli` direkt; ein abgeleitetes Feld in der Roh-Config würde über `updateProvider` zurück in die JSON geschrieben) — E4.
4. **Kein Umbau der Provider-Mechanik (NZ-05):** keine neue WS-Nachricht, kein neues Config-Feld, keine neue Komponente. Terminal-Dropdown (`aos-model-dropdown.ts:282`, Quelle `model.list`) zeigt weiter alle Provider (AK-05). Fehlertext bei fehlender CLI (`cloud-terminal-manager.ts:870`) nennt den Provider statt pauschal `@anthropic-ai/claude-code` (E17). Arbeitsverzeichnis: die PTY startet mit `cwd: effectiveCwd` (`:887`, `:895`, tmux-Run-Script `cwd`); Codex nutzt das Prozess-cwd, kein `--cd` nötig (E7).
5. **Einrichtung außerhalb des Repos (RB-01, §10):** Proxy 0.1.40, `codex auth login`, Neustart; `~/.claude-codex` neu (Vorlage unten); Wrapper `~/bin/claude-codex` mit Vorprüfung (AK-08): `curl -sf -m 5 http://127.0.0.1:18765/v1/models` (E10: lokaler Prozess, Antwort aus dem Speicher; 5 s statt 2 s, kein Retry) und `claude-code-proxy codex auth status` — belegtes Negativmuster `Not authenticated` (E2: nur das Negativ ist gemessen; passt es nicht, startet Claude Code und der Proxy antwortet mit 401 samt Text, sichtbar im Terminal). Bei Fehlschlag Meldung auf stderr, `exit 1`; sonst `exec claude --dangerously-skip-permissions "$@"`. Codex-CLI 0.154.0 + `codex login`.
6. **Docs:** `security.md` §1/§3 (OF-01, Pflichtprüfung „externes System": Zugang + Ausfallverhalten), `architecture.md` §2 Halbsatz.
7. **Commit-Wächter (D2, empfohlen A''):** `no-secrets.sh` liest, falls vorhanden, `$PROJECT/.claude/no-secrets-allow.txt` (eine erweiterte Regex je Zeile, `#`-Kommentare) und nimmt passende Pfade aus `BAD_FILES`; `SECRET_CONTENT` prüft weiter jede hinzugefügte Zeile jeder Datei. Ohne Datei verhält sich der Hook wie heute (kein globales Lockern, E13). Specwright legt `.claude/no-secrets-allow.txt` an mit `^ui/config/(model-config|general-config|prompt-templates)\.json$`. Beide Hook-Kopien (`.claude/hooks/`, `specwright/templates/sdlc/hooks/`), README-Zeile, `VERSION` + `install.sh:FRAMEWORK_VERSION` → 4.1.1, CHANGELOG. Reihenfolge: Hook-Commit **vor** dem Commit der Config (§6 Schritt 1 vor 6, E15). Alternative B: Hook bleibt, Michael committet `ui/config/model-config.json` selbst (§10 Schritt 9).

Vorlage `~/.claude-codex/settings.json` (keine Geheimnisse; der Proxy ignoriert den Token-Wert):

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "http://localhost:18765",
    "ANTHROPIC_AUTH_TOKEN": "anything",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "gpt-6-astra",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "gpt-5.6-sol",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "gpt-5.6-luna",
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1",
    "CLAUDE_CODE_DISABLE_NONSTREAMING_FALLBACK": "1"
  },
  "skipDangerousModePermissionPrompt": true
}
```

Dazu `enabledPlugins` + `extraKnownMarketplaces` aus `~/.claude/settings.json` kopieren und die Symlinks `skills`, `agents`, `commands`, `CLAUDE.md`, `plugins` → `~/.claude/…` wie in `~/.claude-grok` (Memory `reference_ui_model_provider_mechanism`). D4: das Mapping Opus→Astra, Sonnet→Sol, Haiku→Luna ist eine Annahme über die Größenordnung [Uncertain]; ohne Mapping landen Hintergrundaufrufe (`claude-haiku-4-5-*`) trotzdem beim Codex-Provider, weil die Proxy-Registry diese Aliasse führt (`claude-code-proxy models`, [Certain]) — das Mapping bestimmt nur *welches* OpenAI-Modell.

Vorlage `~/bin/claude-codex`:

```bash
#!/bin/bash
# Claude Code über claude-code-proxy (Codex/ChatGPT-Konto). Vorprüfung: Proxy erreichbar, Konto angemeldet (INT-2026-011, AK-08).
export CLAUDE_CONFIG_DIR="$HOME/.claude-codex"
unset ANTHROPIC_API_KEY
PROXY="${CCP_URL:-http://127.0.0.1:18765}"
if ! curl -sf -m 5 "$PROXY/v1/models" >/dev/null; then
  echo "claude-codex: claude-code-proxy antwortet nicht unter $PROXY — starten: ~/Entwicklung/claude-code-proxy/start-proxy.sh" >&2
  exit 1
fi
# Nur das belegte Negativmuster prüfen (Ausgabe 2026-09-16: "Not authenticated"). Unbekanntes Format → starten,
# der Proxy antwortet dann mit 401 und Text im Terminal (kein stilles Ausweichen: ANTHROPIC_BASE_URL zeigt fest auf den Proxy).
if claude-code-proxy codex auth status 2>&1 | grep -qi 'not authenticated'; then
  echo "claude-codex: ChatGPT-Konto im Proxy nicht angemeldet — claude-code-proxy codex auth login" >&2
  exit 1
fi
exec claude --dangerously-skip-permissions "$@"
```

`Not authenticated` ist die gemessene Ausgabe im abgemeldeten Zustand [Certain]; das Positivformat ist nicht belegt und wird bewusst nicht geprüft (E2). §10 Schritt 2 notiert die Ausgabe nach dem Login; §10 Schritt 5 misst beide Fehlwege.

#### Verworfene Alternativen

<!-- leser: agent -->

| Alternative | Warum nicht |
|---|---|
| Neues Config-Feld `kind: 'claude' \| 'foreign'` je Provider | Zweite Wahrheit neben der Hook-Heuristik in `cloud-terminal-manager.ts:852`; Settings-UI (`settings.provider.add`) müsste das Feld kennen; `addProvider()` validieren. Die Heuristik ist seit `e1e97dd` produktiv, alle Wrapper heißen `claude-<id>` (`ls ~/bin`) |
| Prüfer-Filter im Frontend (`aos-auto-review-toggle.ts`) | Backend ist die einzige Quelle für `model.providers.list`; Filter dort deckt jeden Client (Mac, Handy) und ist ohne DOM testbar |
| Prüfer-Guard zusätzlich in `setTabConfig` / `handlePlanReviewConfigUpdate` | Prüfer-Auswahl lebt nur im Speicher je Sitzung (`plan-review-orchestrator.ts:161`), keine Altbestände; ein zweiter Guard ohne Fall |
| Codex (nativ) auch aus dem Terminal-Dropdown nehmen, nur Proxy-Weg | Widerspricht Z-03/AK-05; Herdr-Stufe 1 ist ausdrücklich gewollt |
| Provider `codex` unter der ID `openai` | `buildProviderEnv(id)` und `defaultConfigDirs` leiten `~/.claude-<id>` ab; Intent (§2, OF-04, RB-01) legt `~/.claude-codex`/`~/bin/claude-codex` fest; Proxy nennt den Provider `codex` |
| LiteLLM-Weg (`~/.claude-codex`, Port 4000) wiederbeleben | NZ-05; toter Stand ohne laufenden Prozess |
| Zweiter Proxy-Prozess nur für Codex | NZ-05; ein `serve` bedient Grok und Codex per Modell-ID (`claude-code-proxy models`) |
| Hook-Ausnahme fest im Template (`ui/config/*.json` in `no-secrets.sh`) | Template gilt für alle Projekte; eine projektspezifische Pfadliste gehört nicht in die Vorlage — deshalb die optionale Datei `.claude/no-secrets-allow.txt` im Projekt |
| Hook-Namensregel nur für neu hinzugefügte Dateien (`--diff-filter=A`, erster Vorschlag A') | Lockert global: eine geänderte, bereits versionierte Datei mit Secret-Namen passierte die Namensregel; Inhaltsregel fängt hex-Schlüssel (Deepgram-Fall) nicht (E13). Ausnahmeliste ist ausdrücklich, versioniert, projektlokal |
| Explizites Feld `cliKind` auch in der Settings-Antwort (statt `isClaudeCli` im Frontend) | Settings-Antwort ist die Roh-Config (`websocket.ts:1442`); `updateProvider` mergt Client-Objekte zurück (`model-config.ts:287-292`) — ein abgeleitetes Feld landete in der JSON (E4) |
| Fail-closed im Frontend (`cliKind === 'claude'`) | Bei fehlendem Feld (älteres Backend) wäre die Vorhaben-Seite ohne ein einziges Modell; Frontend und Backend werden gemeinsam gebaut und deployt (ein `npm run build`, ein Auto-Deploy), Backend-Guard fängt den Rest mit klarem Text (E6) |

#### Architektur-Auswirkung

<!-- leser: agent -->

- **Nein** — bleibt innerhalb von `architecture.md` §2 (Backend startet Kommandos aus der Modell-Config; Hook-Anbindung nur für `claude*`-Kommandos existiert seit `e1e97dd`), §3 (kein neues Datenobjekt; Prüfer-Auswahl bleibt Sitzungsspeicher), AR-04 (keine Projektpfade), AR-05 (kein `localStorage`), AR-06 (Framework unabhängig von der UI; die Hook-Änderung D2 ist ein Template, kein UI-Bezug). Provider sind in §5 unter „Claude Code SDK / CLI … `security.md` §3" subsumiert, wie GLM/DeepSeek/Grok heute. Trotzdem eine Zeile in derselben PR (Self-Review F2): §2 Backend-Zeile ergänzt „startet auch fremde Agenten-CLIs (Codex nativ) aus der Modell-Config, ohne Hooks, Status und Gespräch"; Änderungsprotokoll-Zeile. **ADR nötig: nein** (keine Datenhaltung, keine Lieferkette, keine Auth, kein MCP-Startmodell). Die Hook-Änderung D2 ist Lieferumfang (Manifest-Zeile existiert, Datei geändert, nicht entfernt) → kein `removed.tsv`, Patch-Version.

**Pflichtprüfungen `security.md` §6:** Endpunkt: keiner neu (WS `model.list` bekommt ein Feld, `model.providers.list` wird gefiltert; Datenklasse öffentlich). Datenobjekt: keins neu. Externes System: OpenAI über `claude-code-proxy` (Codex-OAuth `~/.config/claude-code-proxy/codex/`) und die native Codex-CLI (`~/.codex/auth.json`) — Zugang in `security.md` §3 nachgetragen; Ausfall: Proxy weg → Wrapper meldet und bricht ab (AK-08); Proxy läuft, Konto fehlt → Wrapper meldet (Terminal) bzw. Prüfer meldet Fehler im Review-Kanal (SDK-Pfad ohne Wrapper, bestehendes Verhalten `plan-review-orchestrator.ts:505-515`); Codex-CLI ohne Login → Codex fragt im Terminal nach Anmeldung. Personenbezogen: Projektinhalte gehen an OpenAI (RB-02, `security.md` der Projekte gilt). Lieferumfang: nur bei D2 (A') berührt, Datei bleibt im Manifest. Keine Host-Details in Docs (Ports und Pfade betreffen den Mac, nicht den Cloud-Host).

### 4. Änderungen

<!-- leser: agent -->

| # | Datei / Komponente | Art | Was | Herkunft |
|---|---|---|---|---|
| 1 | `ui/config/model-config.json` | ändern | Nach `grok`: Provider `codex` (`name: "OpenAI"`, `cliCommand: "claude-codex"`, `cliFlags: ["--model","{modelId}"]`, Modelle `gpt-6-astra` „GPT-6 Astra", `gpt-5.6-sol` „GPT-5.6 Sol", `gpt-5.6-luna` „GPT-5.6 Luna", `description: "via ChatGPT-Konto (claude-code-proxy)"`) und Provider `codex-cli` (`name: "Codex (nativ)"`, `cliCommand: "codex"`, `cliFlags: ["--dangerously-bypass-approvals-and-sandbox","--model","{modelId}"]`, dieselben drei Modelle, `description: "Codex-CLI von OpenAI; ohne Status, Glocke, Gespräch, Prüfer"`) | AK-01, AK-05, OF-03, D3 |
| 2 | `ui/src/shared/provider-cli.ts` | neu | `export type ProviderCliKind = 'claude' \| 'foreign'`; `providerCliKind(cliCommand)`: Basisname = letztes Segment nach `/` oder `\` (`split(/[\\/]/).pop()`), `startsWith('claude')` → `'claude'`, sonst `'foreign'`; `isClaudeCli(cliCommand)`. Kommentar: Regel = Hook-Anbindung (`cloud-terminal-manager.ts`), Konvention `claude-<id>` für Wrapper, gesichert durch Vertragstest `model-config-openai.test.ts`; fremde CLIs bekommen keine Claude-Flags, keinen Status, keinen Prüfer-Einsatz, keinen Schritt-Start | AK-06, AK-07, RB-05, E1, E3 |
| 3 | `ui/src/server/services/cloud-terminal-manager.ts:845-854, 869-871` | ändern | `const claudeCli = isClaudeCli(shellCommand)`; `extraCliArgs` nur wenn `claudeCli` (sonst `console.warn` „extraCliArgs für fremde CLI verworfen"); `--settings` nur wenn `this.hookSettingsPath && claudeCli`; Import aus `../../shared/provider-cli.js`. Fehlertext `:870`: `CLI '${shellCommand}' nicht im PATH gefunden` + (Kommando `claude` → `Bitte installieren: npm install -g @anthropic-ai/claude-code`; sonst → `Provider '${modelConfig.provider}' braucht dieses Programm auf diesem Host (Wrapper unter ~/bin oder CLI)`) | AK-06, RB-05, E5, E17 |
| 4 | `ui/src/server/model-config.ts` | ändern | `getReviewerProviders(): ModelProvider[]` = `getAllProviders().filter(p => isClaudeCli(p.cliCommand))` mit Kommentar (Prüfer laufen über das Claude Agent SDK mit `~/.claude-<id>`, `provider-env.ts`); `isClaudeSessionModel(providerId, modelId): boolean` (Provider vorhanden, Modell vorhanden, `isClaudeCli`); `setStepDefault()`: `isClaudeSessionModel` statt `getModel`, Fehler `Provider startet keine Claude-Sitzung: ${providerId}` wenn das Modell existiert, aber fremd ist; `getStepDefault()`: `isClaudeSessionModel` statt `getModel` für den gespeicherten Wert (fremder Altbestand → Fallback, kein Wurf beim Laden, E11); `providersForModelList()` = `getAllProviders().map(p => ({ id, name, cliKind: providerCliKind(p.cliCommand), models: [...] mit providerId }))` (reine Funktion, ersetzt die Inline-Transformation in `handleModelList`, E14); `loadModelConfig()`: nach dem Laden einmalig `console.warn` je fremdem Provider (E3) | AK-04, AK-07, D1, E3, E11, E14 |
| 5 | `ui/src/server/websocket.ts:938-985` | ändern | `handleModelList`: `providers: providersForModelList()`; `handleModelProvidersList`: `getReviewerProviders()` statt `getAllProviders()` (Imports anpassen; `:141` `defaultConfigDirs(getAllProviders()…)` bleibt) | AK-04, AK-07, D1 |
| 6 | `ui/src/server/services/vorhaben-service.ts:231, 617` | ändern | Default `resolveModel` → `isClaudeSessionModel(sel.providerId, sel.modelId)` (bleibt `boolean`, Signatur unverändert, 12 Test-Injektionen unberührt); Fehlertext `:617` → `Modell nicht konfiguriert oder keine Claude-Sitzung: ${providerId}/${modelId}` (E6: Schutz gegen Clients ohne `cliKind`, mit nennender Ursache) | D1, Z-04, E6 |
| 7 | `ui/frontend/src/components/model-selector.ts:11-15` | ändern | `cliKind?: ProviderCliKind` in `ModelSelectorProvider` (Import Typ aus `../../../src/shared/provider-cli.js`) | D1 |
| 8 | `ui/frontend/src/components/vorhaben/aos-naechster-schritt.ts:155-160, 211-217` | ändern | `private claudeProviders()` = `this.models.providers.filter(p => p.cliKind !== 'foreign')`; `preselect()` und `.externalProviders` nutzen sie | D1, Z-04 |
| 9 | `ui/frontend/src/views/settings-view.ts:1058` | ändern | `this.config!.providers.filter(p => isClaudeCli(p.cliCommand)).flatMap(...)`; Import aus `../../../src/shared/provider-cli.js`; Satz in `section-description`: „Nur Anbieter, die Claude Code starten." | D1 |
| 10 | `docs/security.md` | ändern | §1 Tabelle: `ui/config/model-config.json` aus „intern" streichen, in „öffentlich" ergänzen („Provider- und Modellnamen der UI; Zugänge nie darin"); „vertraulich" ergänzen um `~/.claude-<id>/settings.json`, `~/.config/claude-code-proxy/<provider>/auth.json`, `~/.codex/auth.json`. §3 neue Zeile „OpenAI/ChatGPT-Zugang (INT-2026-011)": Proxy-OAuth + Codex-CLI-Login, Laufzeit über `claude-code-proxy serve` (localhost) bzw. Codex-Prozess, Rotation Nutzer, Ausfallverhalten wie §3 oben. Änderungsprotokoll | OF-01, RB-01, §6 |
| 11 | `docs/architecture.md` | ändern | §2 Backend-Zeile Halbsatz „startet auch fremde Agenten-CLIs (Codex nativ) aus der Modell-Config — ohne Hooks, Status, Gespräch und Prüfer-Einsatz (INT-2026-011)"; Änderungsprotokoll-Zeile | Self-Review F2 |
| 12 | `.claude/hooks/no-secrets.sh` **und** `specwright/templates/sdlc/hooks/no-secrets.sh` (identisch halten, `diff -q`) | ändern (D2, A'') | Nach `BAD_FILES`: `ALLOW_FILE="$PROJECT/.claude/no-secrets-allow.txt"`; wenn vorhanden, jede Nicht-Kommentar-Zeile als erweiterte Regex gegen `BAD_FILES` anwenden (`grep -Ev -f`), Rest bleibt blockiert; Bash 3.2-tauglich (kein `mapfile`, keine Prozess-Substitution nötig: Muster-Datei per `grep -Ev '^[[:space:]]*(#\|$)' > tmp`); Kommentar „Ausnahmeliste je Projekt: nur die Dateinamen-Regel; die Inhaltsregel prüft weiter jede hinzugefügte Zeile"; README-Tabelle Spalte „Ausnahme" für `no-secrets.sh`: „`.claude/no-secrets-allow.txt` (Regex je Zeile) — nur für versionierte Configs ohne Zugänge" | D2, E13 |
| 13 | `.claude/no-secrets-allow.txt` | neu (D2, A'') | `# no-secrets: versionierte UI-Configs ohne Zugänge (INT-2026-011)` + `^ui/config/(model-config\|general-config\|prompt-templates)\.json$` | D2 |
| 14 | `VERSION`, `install.sh` (`FRAMEWORK_VERSION`), `CHANGELOG.md` | ändern (D2, A'') | 4.1.1; Eintrag „Neu: `no-secrets` liest eine optionale Ausnahmeliste `.claude/no-secrets-allow.txt` für versionierte Configs ohne Zugänge; ohne Datei unverändert streng (INT-2026-011)" | D2 |

**Nicht betroffen (ausdrücklich):** `ui/src/server/utils/provider-env.ts` (Provider `codex` → `~/.claude-codex`, wie jeder Nicht-Anthropic-Provider); `external-reviewer.ts`, `plan-review-orchestrator.ts`, `finding-aggregator.ts` (AK-10 läuft über den bestehenden SDK-Pfad); `aos-auto-review-toggle.ts`, `aos-cloud-terminal-sidebar.ts`, `aos-model-dropdown.ts` (Terminal-Dropdown zeigt alle Provider); `DEFAULT_REVIEWER_IDS` (NZ-04); `DEFAULT_CONFIG` in `model-config.ts:47-101` (Board-Karte DEBT-007, eigenes Thema); `specwright/manifest.tsv`, `removed.tsv` (keine Datei kommt hinzu oder fällt weg); Cloud-Droplet (NZ-01); `ui/tests/known-failures.txt`; `~/.claude-grok`, Grok-Eintrag.

### 5. Verbindungen

<!-- leser: agent -->

| Von | Nach | Art | Schnittstelle | Nachweis (Befehl) | Teil |
|---|---|---|---|---|---|
| `cloud-terminal-manager.ts` | `shared/provider-cli.ts` | Import | `isClaudeCli(shellCommand)` | `grep -n "isClaudeCli" ui/src/server/services/cloud-terminal-manager.ts` → Import + Aufruf bei `--settings`; Test `cloud-terminal-agent-event.test.ts` „claude-* wrappers do receive --settings" grün | — |
| `model-config.ts` | `shared/provider-cli.ts` | Import | `isClaudeCli` in `getReviewerProviders`, `setStepDefault`, `isClaudeSessionModel` | `grep -n "isClaudeCli" ui/src/server/model-config.ts` (≥ 3 Treffer); Test `model-config-provider-kind.test.ts` | — |
| `websocket.ts` `handleModelProvidersList` | `model-config.ts` | Import | `getReviewerProviders()` | `grep -n "getReviewerProviders" ui/src/server/websocket.ts ui/src/server/model-config.ts` (Definition + Aufruf) | — |
| `websocket.ts` `handleModelList` | `model-config.ts` | Import | `providersForModelList()` (liefert `cliKind`) | `grep -n "providersForModelList" ui/src/server/websocket.ts ui/src/server/model-config.ts`; Test `model-config-provider-kind.test.ts` prüft `cliKind` in der Antwortform | — |
| `vorhaben-service.ts` | `model-config.ts` | Import | `isClaudeSessionModel` als Default-`resolveModel` | `grep -n "isClaudeSessionModel" ui/src/server/services/vorhaben-service.ts ui/src/server/model-config.ts` | — |
| `aos-naechster-schritt.ts` | `model.list` (`cliKind`) | WS-Feld → Filter | `ModelSelectorProvider.cliKind` | `grep -n "cliKind" ui/frontend/src/components/vorhaben/aos-naechster-schritt.ts ui/frontend/src/components/model-selector.ts`; Test in `aos-vorhaben-stage2.test.ts` | — |
| `settings-view.ts` | `shared/provider-cli.ts` | Import | `isClaudeCli(provider.cliCommand)` | `grep -n "isClaudeCli" ui/frontend/src/views/settings-view.ts` | — |
| `model-config.json` `codex` | `~/bin/claude-codex` → `claude` → `claude-code-proxy` (18765) → OpenAI | Prozess/HTTP | `cliCommand`, `ANTHROPIC_BASE_URL` in `~/.claude-codex/settings.json` | `which claude-codex`; `claude-codex -p "Antworte nur mit OK"` → `OK`; `proxy.log` letzte `request_completed` mit `"provider":"codex"` | — |
| `model-config.json` `codex-cli` | `codex` (nvm-Global) | Prozess | `cliCommand: "codex"`, `--model` | `which codex && codex --version` → 0.154.0; `codex --help \| grep -E -- '--model\|--dangerously-bypass'` | — |
| Prüfer `codex` | SDK → `~/.claude-codex` | `buildProviderEnv('codex')` | `CLAUDE_CONFIG_DIR` | `provider-env.test.ts` (bestehend, generisch); Stichprobe AK-10 | — |
| `no-secrets.sh` (Repo) | `templates/sdlc/hooks/no-secrets.sh` | Kopie | identischer Inhalt | `diff -q .claude/hooks/no-secrets.sh specwright/templates/sdlc/hooks/no-secrets.sh` (D2) | — |

- [x] Jede neue Komponente hat mindestens eine Verbindung (`provider-cli.ts`: 5 Konsumenten).
- [x] Jeder Nachweis ist ein ausführbarer Befehl.

### 6. Reihenfolge der Arbeit

<!-- leser: agent -->

0. Lesende Vorprüfung: `grep -rn "startsWith('claude')" ui/src` (genau ein Treffer, `:852`); `grep -rn "getAllProviders" ui/src/server` (Konsumenten: `websocket.ts:141,940,967`; `:141` `defaultConfigDirs` bleibt auf allen Providern — `~/.claude-codex-cli` existiert nicht, harmlos); `grep -rn "model.providers.list\|model\.list" ui/frontend/src` (Konsumenten aus §2, keine weiteren); `git diff --stat ui/config/model-config.json` (sauber, keine E2E-Reste) → prüfbar durch Ausgabe im Bauprotokoll.
1. D2 (A''): Hook in beiden Kopien ändern, `.claude/no-secrets-allow.txt` anlegen, README, `VERSION`/`install.sh`/`CHANGELOG` → `bash scripts/check-manifest.sh` grün, `diff -q` leer, Hook-Probe aus §8 (D2) mit Exit-Codes im Protokoll. Eigener Commit **vor** jeder Änderung an `ui/config/model-config.json` (E15): `feat(hooks): no-secrets mit projekteigener Ausnahmeliste (4.1.1, INT-2026-011)`.
2. `ui/src/shared/provider-cli.ts` + `ui/tests/unit/provider-cli.test.ts` → `cd ui && npx vitest run tests/unit/provider-cli.test.ts` grün.
3. `cloud-terminal-manager.ts:852` auf `isClaudeCli`; AK-06-Test in `cloud-terminal-agent-event.test.ts` → Datei grün.
4. `model-config.ts` (`getReviewerProviders`, `isClaudeSessionModel`, `setStepDefault`-Guard) + `ui/tests/unit/model-config-provider-kind.test.ts` → grün.
5. `websocket.ts` (`cliKind`, `getReviewerProviders`), `vorhaben-service.ts:231` → `npm run lint`, `tsc` (Backend-Build) grün; `vorhaben-service`-Tests grün.
6. `model-config.json` zwei Provider + `ui/tests/unit/model-config-openai.test.ts` (Vertrag gegen die echte Datei) → grün.
7. Frontend: `model-selector.ts` Typ, `aos-naechster-schritt.ts` Filter, `settings-view.ts` Filter; Test in `aos-vorhaben-stage2.test.ts` → Frontend-Build + Test grün.
8. Docs: `security.md`, `architecture.md`.
9. Verbindungen nachweisen (§5), Ausgaben ins Bauprotokoll.
10. `bash scripts/verify.sh` → `verify: OK`; Vitest-Bezugsliste unverändert.
11. Manuelle Einrichtung mit Michael (§10 Schritte 1–7), dann Stichproben AK-02/03/05/08/10 und Messung AK-09 (§8) am Branch-Backend (Port 3111, Memory `reference_cloud_terminal_e2e_playwright`) oder nach Merge am Mac-Backend.
12. PR mit `verify`-Ausgabe, Nachweisen, Screenshots (Dropdown, Prüfer-Liste, Codex-Sitzung ohne Punkt), §14 nachgeführt.

### 7. Zerlegung

<!-- leser: agent -->

#### Variante A — nicht zerlegbar, eine Sitzung

<!-- leser: agent -->

Alle Code-Änderungen hängen an `provider-cli.ts` (5 Konsumenten, §5); Gesamtumfang unter einem Tag; Einrichtung ist sequenziell mit Michael. Drei Worktrees für je 20 Minuten Arbeit plus Integration brächten nichts.

#### Variante B — parallel in Worktrees

<!-- leser: agent -->

Entfällt.

### 8. Tests und Nachweis

<!-- leser: agent -->

| AK / FA | Test | Datei | Art |
|---|---|---|---|
| AK-01 | Echte `model-config.json`: Provider `codex`, `cliCommand === 'claude-codex'`, Modell-IDs exakt `['gpt-6-astra','gpt-5.6-sol','gpt-5.6-luna']`, `{modelId}` als eigenes Element in `cliFlags` | `ui/tests/unit/model-config-openai.test.ts` (neu) | Unit (Vertrag) |
| AK-01 | `providerCliKind('claude-codex') === 'claude'`, `('codex') === 'foreign'`, `('/home/me/bin/claude-glm') === 'claude'`, `('C:\\tools\\claude-glm.cmd') === 'claude'` (E1), `('/usr/local/bin/codex') === 'foreign'` | `ui/tests/unit/provider-cli.test.ts` (neu) | Unit |
| AK-01, D1 | `providersForModelList()` mit Config {anthropic, codex, codex-cli}: jede Zeile trägt `cliKind` (`claude`, `claude`, `foreign`), Modelle tragen `providerId`; Form identisch mit der bisherigen Inline-Transformation (E14) | `model-config-provider-kind.test.ts` | Unit |
| E3 | Vertrag: jeder Provider der echten `model-config.json` ist `isClaudeCli` **oder** steht in `KNOWN_FOREIGN_PROVIDERS = ['codex-cli']` — ein neuer Eintrag mit fremdem Kommando ohne Listung macht den Test rot | `model-config-openai.test.ts` | Unit (Vertrag) |
| E5 | `cli.command = '/usr/local/bin/codex'` + `extraCliArgs: ['--mcp-config','x']` → Args enthalten weder `--mcp-config` noch `--settings`; für `claude-glm` bleiben beide | `cloud-terminal-agent-event.test.ts` (erweitert) | Unit |
| E11 | Config mit `stepDefaults.plan = {codex-cli, gpt-6-astra}` lädt ohne Wurf; `getStepDefault('plan')` → `anthropic/opus`; `console.warn` je fremdem Provider genau einmal | `model-config-provider-kind.test.ts` | Unit |
| E17 | `checkCliAvailability` → false für `claude-codex` (Mock): Fehlertext nennt `claude-codex` und den Provider, nicht `@anthropic-ai/claude-code`; für `claude` bleibt der npm-Hinweis | `cloud-terminal-agent-event.test.ts` (erweitert; Mock `checkCliAvailability` parametrisierbar) | Unit |
| AK-02 | Sitzung auf GPT-6 Astra aus der UI; `/status` bzw. `/model` in der Sitzung nennt `gpt-6-astra`; Transkript `~/.claude-codex/projects/<slug>/<id>.jsonl` enthält `"model":"gpt-6-astra"` | Protokoll im PR | Stichprobe |
| AK-03 | Status-Punkt (working/done), Glocke bei `Stop`, Gespräch-Tab zeigt den Verlauf der OpenAI-Sitzung | Protokoll + Screenshot | Stichprobe |
| AK-04 | `getReviewerProviders()` mit Config {anthropic, codex(`claude-codex`), codex-cli(`codex`)} liefert `['anthropic','codex']` — `codex` mit 3 Modellen | `ui/tests/unit/model-config-provider-kind.test.ts` (neu, `fresh()`-Muster) | Unit |
| AK-05 | Echte Config: Provider `codex-cli`, `cliCommand === 'codex'`, gleiche drei IDs, `cliFlags` enthält `--model` und `{modelId}`; `getProviderCommand('codex-cli','gpt-6-astra')` → `{ command: 'codex', args: [..., '--model', 'gpt-6-astra'] }` | `model-config-openai.test.ts` | Unit |
| AK-05 | Dropdown → Codex (nativ)/GPT-6 Astra → Codex-TUI startet im Terminal, zeigt Modell `gpt-6-astra`, antwortet; OF-03: IDs stimmen (sonst §14) | Protokoll + Screenshot | Stichprobe |
| AK-06 | `cli.command = '/usr/local/bin/codex'` → nach `createSession` `agentStatus === 'unknown'`, `--settings` fehlt; nach `sendInput('\r')` weiter `unknown`; `reportAgentEvent` wird nie erreicht (kein Hook) | `ui/tests/unit/cloud-terminal-agent-event.test.ts` (erweitert) | Unit |
| AK-07 | `getReviewerProviders()` enthält `codex-cli` nicht (siehe AK-04-Test); `isClaudeCli('codex') === false` | `model-config-provider-kind.test.ts`, `provider-cli.test.ts` | Unit |
| AK-08 | Proxy gestoppt (`start-proxy.sh --stop`) → OpenAI-Sitzung aus der UI zeigt im Terminal „claude-code-proxy antwortet nicht …", Prozess endet (Tab „Prozess beendet"); `codex auth logout` → „ChatGPT-Konto im Proxy nicht angemeldet …"; danach wieder anmelden/starten | Protokoll | Stichprobe |
| AK-09 | Nach einer OpenAI-Sitzung mit ≥ 3 Prompts: `jq -c 'select(.msg=="request_completed") \| [.t,.fields.provider,.fields.model]' ~/.local/state/claude-code-proxy/proxy.log \| awk -v s="<Startzeit ISO>" '$0 > s'` → jede Zeile `provider == "codex"` und `model` beginnt mit `gpt-`; 0 Zeilen mit `claude-` oder `grok` | Protokoll (Befehl + Ausgabe) | Messung |
| AK-10 | Plan-Review mit Prüfer OpenAI/GPT-6 Astra (AR an, manueller Trigger) → `plan-review:reviewer.result` für `codex:gpt-6-astra` mit Text im Review-Kanal | Protokoll + Screenshot | Stichprobe |
| D1 | `modelList`-Mock mit `codex-cli` (`cliKind:'foreign'`) und `stepDefaults.plan` auf `codex-cli`: `aos-model-selector.externalProviders` enthält `codex-cli` nicht; Vorauswahl fällt auf `defaultSelection` | `ui/tests/unit/aos-vorhaben-stage2.test.ts` (erweitert) | Component |
| D1 | `setStepDefault('plan', {codex-cli, gpt-6-astra})` wirft „Provider startet keine Claude-Sitzung"; `isClaudeSessionModel('codex-cli','gpt-6-astra') === false`, `('codex','gpt-6-astra') === true` | `model-config-provider-kind.test.ts` | Unit |
| D2 | Hook-Probe: `printf '{"tool_input":{"command":"git commit -m x"}}' \| bash .claude/hooks/no-secrets.sh` mit (a) neuer Datei `ui/config/probe.json` staged → exit 2 (nicht in der Ausnahmeliste; danach `git rm --cached`, Datei löschen); (b) geänderter `ui/config/model-config.json` staged → exit 0; (c) geänderte `ui/config/model-config.json` mit einer `sk-ant-…`-Zeile (Attrappe, 24 Zeichen) staged → exit 2 (Inhaltsregel greift trotz Ausnahme), danach zurücksetzen; (d) ohne `.claude/no-secrets-allow.txt` (temporär umbenannt) → (b) liefert exit 2 (Standard bleibt streng) | Protokoll (Befehle + Exit-Codes) | Manuell mit Protokoll |
| RB-05 | Bestehend: „a non-claude CLI does not receive --settings", „claude-* wrappers do receive --settings" bleiben grün nach Umstellung auf `isClaudeCli` | `cloud-terminal-agent-event.test.ts` | Unit |

- **Verify-Befehl:** `bash scripts/verify.sh` → `verify: OK`; Ausgabe wird im PR zitiert. **CI ist die Wahrheit:** lokal grün zählt erst, wenn die PR-Checks grün sind. `ui/tests/known-failures.txt` bleibt unverändert (neue Tests in neuen oder grünen Dateien).
- **Datenkorrektur:** keine Bestandsdaten (Prüfer-Auswahl nur im Speicher; `stepDefaults` in `model-config.json` verweist heute auf keinen fremden Provider — Prüfung in Schritt 0 mit `jq .stepDefaults ui/config/model-config.json`).
- **Angeschlossen (E2E-Pfad):** Terminal-Dropdown → „OpenAI · GPT-6 Astra" → Sitzung startet (`claude-codex --model gpt-6-astra --settings …`) → Prompt → Antwort → Status-Punkt wechselt → Glocke → Gespräch zeigt den Turn → Prüfer-Dropdown listet „OpenAI" (3 Modelle), nicht „Codex (nativ)" → Vorhaben-Seite „Nächster Schritt" bietet OpenAI, nicht Codex (nativ) → Terminal-Dropdown → „Codex (nativ) · GPT-6 Astra" → Codex-TUI ohne Status-Punkt. Geprüft manuell mit Protokoll am Branch-Backend (Port 3111) plus Screenshots; Playwright-Weg nach Memory `reference_cloud_terminal_e2e_playwright` optional.
- **Bugfix:** kein Bugfix-Anteil; Hook `protect-tests` nicht im Fix-Modus.
- **UI:** kein Mock (Datenänderung in bestehenden Listen); Screenshots: Terminal-Dropdown mit beiden Providern, Prüfer-Liste ohne Codex (nativ), Codex-Sitzung ohne Punkt neben einer OpenAI-Sitzung mit Punkt.

### 9. Risiken

<!-- leser: mensch -->

| Risiko | Wahrscheinlichkeit | Wirkung | Gegenmaßnahme | Wer merkt es |
|---|---|---|---|---|
| R1 Proxy-Neustart (Upgrade, Codex-Login) unterbricht laufende Grok-Sitzungen (RB-03) | hoch (jeder Neustart) | niedrig (Sitzung neu starten) | Zeitpunkt mit Michael, keine Grok-Sitzung offen | Michael, sofort im Terminal |
| R2 Modell-IDs der nativen Codex-CLI weichen vom Proxy ab (OF-03) | niedrig | niedrig | Nach Neuinstallation `codex --help`/Probelauf; nur den `codex-cli`-Eintrag anpassen, §14 | Michael beim ersten Start (Codex meldet unbekanntes Modell) |
| R3 Droplet zeigt die neuen Provider, hat aber weder Wrapper noch Codex (NZ-01) | sicher | niedrig | Start scheitert sichtbar mit „CLI 'claude-codex' nicht im PATH gefunden"; kein stiller Fehlweg; Fehlertext nennt zwar `@anthropic-ai/claude-code` (irreführend, abgelehnt F4) | Michael beim Klick auf dem Droplet |
| R4 Regel „Programmname beginnt mit `claude`" ist Konvention: künftiger Wrapper ohne Präfix gilt als fremd (kein Hook, kein Prüfer, kein Schritt-Start) | niedrig (alle 10 Wrapper heißen `claude-*`) | mittel | Kommentar in `provider-cli.ts`, Konvention in `security.md` §3 („Provider-Wrapper unter `~/bin/claude-<id>`" steht dort schon) | Michael: fehlender Status-Punkt und fehlender Prüfer-Eintrag |
| R5 Kontingent des ChatGPT-Kontos (Codex-Rate-Limits, 429) | mittel | niedrig | Sichtbar als API-Fehler im Terminal; kein Ausweichen auf Anthropic (kein Fallback ohne `ANTHROPIC_BASE_URL`-Wechsel) | Michael im Terminal |
| R6 Hook-Änderung D2 (A''): eine Ausnahmeliste kann zu weit gefasst werden (z. B. `ui/config/.*`) und ließe dann eine künftige Secret-Datei durch die Namensregel | niedrig | mittel | Liste nennt drei Dateien exakt (Anker `^…$`); Inhaltsregel greift weiter auf jede hinzugefügte Zeile; `voice-config.json` bleibt gitignored + Guard `check-no-voice-config`; ohne Datei ist der Hook unverändert streng (Probe d) | Review der PR (die Liste ist versioniert); bei Wahl B entfällt das Risiko |
| R11 Wrapper-Vorprüfung: Positivformat von `codex auth status` ist nicht belegt; nur `Not authenticated` ist gemessen | mittel (Format kann sich mit Proxy-Versionen ändern) | niedrig | Wrapper prüft nur das Negativmuster; passt nichts, startet Claude Code und der Proxy antwortet 401 mit Text — sichtbar, kein Ausweichen auf Anthropic (feste `ANTHROPIC_BASE_URL`) | Michael im Terminal (E2) |
| R12 Prüfer-Pfad (SDK) läuft ohne Wrapper: Proxy weg oder abgemeldet → generischer Reviewer-Fehler im Review-Kanal (`plan-review-orchestrator.ts:505-515`), nicht die Wrapper-Meldung | mittel | niedrig | Bestehendes Verhalten aller Proxy-Provider (Grok); Fehlertext des SDK (`fetch failed`/`401`) wird angezeigt; AK-08 gilt für Terminal-Sitzungen | Michael im Review-Kanal (E16) |
| R7 `model-config.json` wird von UI-E2E-Tests beschrieben (Memory) → fremde Diffs im Commit | mittel | niedrig | Schritt 0 und vor jedem Commit `git diff ui/config/model-config.json` lesen; nur die zwei Provider dürfen im Diff stehen | Agent beim Commit |
| R8 Michael schaltet an einer Codex-(nativ)-Sitzung den AR-Schalter ein und löst manuell aus | niedrig | niedrig | Ohne Plan-Pfad passiert nichts; Codex hat kein Plan-Verzeichnis; Hinweis in `description` des Providers | Michael (keine Reaktion) |
| R9 `codex login` ersetzt die vorhandene `~/.codex/auth.json` (API-Key-Modus, Jan 2026) | sicher | niedrig | Vorher `cp ~/.codex/auth.json ~/.codex/auth.json.bak-2026-09-16` | Michael |
| R10 Codex-TUI fragt in jedem neuen Session-Worktree nach Vertrauen für den Ordner (`config.toml` `trust_level`) | mittel [Uncertain] | niedrig | Interaktive Antwort im Terminal; bei Bedarf `trust_level` global setzen — außerhalb dieses Vorhabens | Michael |

### 10. Manuelle Schritte

<!-- leser: mensch -->

| Schritt | Wer | Wann | Erledigt |
|---|---|---|---|
| 1. Proxy-Upgrade: `brew upgrade raine/claude-code-proxy/claude-code-proxy` → 0.1.40 (`brew info` zeigt „stable 0.1.40"); danach `claude-code-proxy models \| grep -c gpt-6-astra` → 1 (RB-04) | Michael | vor den Stichproben | [ ] |
| 2. Codex-Anmeldung im Proxy: `claude-code-proxy codex auth login` (Browser, ChatGPT-Konto, OF-02); `claude-code-proxy codex auth status` → angemeldet; Ausgabezeile notieren (Wrapper-`grep`, §3) | Michael | nach 1 | [ ] |
| 3. Proxy-Neustart (unterbricht Grok, RB-03): `~/Entwicklung/claude-code-proxy/start-proxy.sh --restart`; `--status` → „version: 0.1.40", „health: /v1/models OK" | Michael | nach 2, Zeitpunkt abgestimmt | [ ] |
| 4. Alten Stand sichern (OF-04): `mv ~/.claude-codex ~/.claude-codex.bak-2026-09-16`; `mkdir ~/.claude-codex`; `settings.json` nach Vorlage §3 (D4-Mapping); `enabledPlugins`/`extraKnownMarketplaces` aus `~/.claude/settings.json` übernehmen; Symlinks: `for d in skills agents commands CLAUDE.md plugins; do ln -sfn ~/.claude/$d ~/.claude-codex/$d; done` | Michael (Agent bereitet die Datei vor, Michael legt sie ab — RB-01, außerhalb des Repos) | nach 3 | [ ] |
| 5. Wrapper `~/bin/claude-codex` nach Vorlage §3, `chmod +x`; Probe: `claude-codex -p "Antworte nur mit OK"` → `OK`; Gegenprobe AK-08: `start-proxy.sh --stop` → Meldung und Exit 1; `--start` | Michael | nach 4 | [ ] |
| 6. Codex-CLI: `cp ~/.codex/auth.json ~/.codex/auth.json.bak-2026-09-16`; `npm install -g @openai/codex@latest` → `codex --version` = 0.154.0; `codex login` (ChatGPT); `codex login status` → „Logged in using ChatGPT"; OF-03: `codex --help` (Flags `--model`, `--dangerously-bypass-approvals-and-sandbox`) und Probelauf `codex --model gpt-6-astra` — bei anderen IDs Abweichung in §14, Eintrag `codex-cli` anpassen | Michael | nach 3 | [ ] |
| 7. Backend am Mac neu starten nach Merge/Pull (Config-Cache `model-config.ts:103`; Neustart beendet offene UI-Terminals, Memory `project_cloud_autodeploy_gate`) | Michael | nach Merge | [ ] |
| 8. Merge nach `main` ist Michaels Schritt; löst den Auto-Deploy der UI auf dem Droplet aus (dort unverändert nutzbar, neue Provider scheitern sichtbar, R3). Kein weiterer Deploy-Schritt; Hook `production-gate` nicht betroffen | Michael | — | [ ] |
| 9. Nur bei D2 = B: `git add ui/config/model-config.json && git commit -m "feat(ui): OpenAI-Provider codex und codex-cli (INT-2026-011)"` in Michaels Terminal (Hook gilt nur für Claude); künftig bei jeder Änderung an dieser Datei | Michael | vor PR | [ ] |
| 10. R3/E17-Sichtprobe auf dem Droplet nach dem Auto-Deploy: OpenAI wählen → Fehlertext nennt `claude-codex` und den Provider (kein npm-Hinweis); kein Deploy-Befehl, nur Lesen | Michael | nach Deploy | [ ] |

Alle Wege belegt: brew-Formel (`brew info`), Proxy-CLI (`claude-code-proxy codex auth --help`), `start-proxy.sh` (gelesen), npm-Paket (`npm view @openai/codex version`), Codex-Login (Context7 `codex-rs/cli/src/login.rs`). Kein `[Uncertain]` in dieser Tabelle; die Codex-Flag-Namen (§2, [Likely]) prüft Schritt 6 vor dem ersten Start aus der UI.

### 11. Schätzung

<!-- leser: mensch -->

Code, Tests, Docs: 4–6 h (S; nach E1–E17 eine Stunde mehr für `providersForModelList`, Vertragstest, `extraCliArgs`-Gate, Fehlertext). Mit D2 = A'' plus 45–60 min (Hook in zwei Kopien, Ausnahmeliste, vier Proben, Version). Einrichtung am Mac mit Michael: 1–1,5 h (Proxy-Upgrade, zwei Logins, Codex-Neuinstallation), plus 30 min Stichproben und Messung. Unsicherheit: externe Werkzeuge (brew-Upgrade, `codex login`, Modell-IDs der Codex-CLI) und ob die Sitzung am Branch-Backend (3111) oder erst nach Merge geprüft wird.

### 12. Review des Plans

<!-- leser: mensch -->

| Finding | Quelle | Entscheidung | Änderung am Plan |
|---|---|---|---|
| F1, `no-secrets`-Hook blockiert jeden Commit mit `ui/config/model-config.json` (Muster `configs?/.*\.json`, Zeile 10): der Bau bliebe beim ersten Commit hängen | Self | angenommen als Entscheidung D2 — Vorschlag A'' (projekteigene Ausnahmeliste `.claude/no-secrets-allow.txt`, Template + 4.1.1; ersetzt den ersten Vorschlag A' „Namensregel nur für neue Dateien" nach E13), Alternative B (Michael committet selbst) | §3 Ansatz 7, §4 Nr. 12–14, §6 Schritt 1, §8 D2, §9 R6, §10 Schritt 9 |
| F2, `architecture.md` §1/§2 spricht von „Claude-Sitzungen", das Cloud-Terminal startet künftig auch Codex nativ | Self | angenommen — Halbsatz in §2 Backend-Zeile, keine AR-Änderung, kein ADR | §3 Architektur-Auswirkung, §4 Nr. 11 |
| F3, Codex (nativ) wäre auf der Vorhaben-Seite („Nächster Schritt") und in den Schritt-Standards wählbar, obwohl dort `/spec`/`/plan`/`/build` als Startbefehl gesetzt wird — stiller Fehlweg (Kernaufgabe 3 des Intents: „nirgends angeboten, wo sie nicht funktioniert") | Self | angenommen als Entscheidung D1 — Filter über dieselbe Regel (`cliKind` in `model.list`, Guards in `setStepDefault` und `resolveModel`); geht über AK-07 hinaus, deshalb Freigabe durch Michael | §3 Ansatz 3, §4 Nr. 4–9, §8 D1 |
| F4, `checkCliAvailability`-Fehlertext (`cloud-terminal-manager.ts:870`) empfiehlt bei jeder fehlenden CLI `npm install -g @anthropic-ai/claude-code` — für `codex`/`claude-codex` irreführend | Self, dann E17 (Grok) | zuerst abgelehnt (Kosmetik), nach E17 **angenommen** — auf dem Droplet ist das der erste Klick auf OpenAI (R3) und Teil 1 verspricht eine nennende Meldung; ein Zeilen-Zweig, ein Test | §4 Nr. 3, §8 E17, §9 R3, §10 Schritt 10 |
| F5, `DEFAULT_CONFIG` in `model-config.ts:47-101` kennt die neuen Provider nicht (Board-Karte DEBT-007) | Self | abgelehnt — eigene Karte; Fallback greift nur bei kaputter JSON, und dann fehlen ohnehin drei weitere Provider | — |
| F6, AK-09 braucht eine Messung, keine Stichprobe: welche Quelle? | Self | angenommen — Proxy-Log `request_completed` mit `provider`/`model` je Aufruf (belegt `proxy.log`), Befehl in §8 | §8 AK-09 |
| F7, Wrapper-Vorprüfung verlässt sich auf das Ausgabeformat von `codex auth status` im angemeldeten Zustand (nur der Grok-Fall ist belegt) | Self, verschärft durch E2 | angenommen — Wrapper prüft nur das gemessene Negativmuster `Not authenticated`; unbekanntes Format → Start, Proxy antwortet 401 sichtbar; R11 | §3 Wrapper, §9 R11, §10 Schritt 2 |
| F8, D4-Mapping (Haiku→Luna) ist eine Annahme über die Modellgrößen | Self | angenommen als Entscheidung D4 mit Vorschlag; Fehlmapping ist nur Kostenfrage, kein Fehlweg (alle Aliasse landen bei Codex) | §3 Ansatz, Teil 1 |
| F9, Codex nativ mit `--dangerously-bypass-approvals-and-sandbox`: Vertrauensstufe | Self | angenommen als Entscheidung D3 — Parität mit `--dangerously-skip-permissions`; Flag liegt in `cliFlags`, in der Settings-UI änderbar | §4 Nr. 1 |
| F10, `resolveModelId`-Legacy-Zweig (`<providerId>,<slug>`) könnte `codex,gpt-…` bilden | Self | abgelehnt — greift nur, wenn ein Modell exakt so in der Config steht; die drei IDs enthalten kein Komma und sind eindeutig | — |
| F11, Prüfer-Guard auch im Backend (`setTabConfig`) statt nur Listenfilter? | Self | abgelehnt — Auswahl nur im Sitzungsspeicher, keine Altbestände; Filter der einzigen Quelle reicht (§3 Alternativen) | — |
| F12, Hook-Probe (D2) hätte mit `config/x.json` einen neuen Ordner im Repo-Root angelegt (Verbotsliste `security.md` §5) | Self (Kollegen-Durchgang) | angenommen — Probe unter `ui/config/probe.json`, danach entfernt | §8 D2 |
| F13, `vorhaben-service.resolveModel` mit eigenem Fehlertext für fremde Provider wäre eine zweite Prüfung ohne Nutzen (Frontend filtert bereits) | Self (Minimalinvasiv), revidiert durch E6 | teils — `resolveModel` bleibt `boolean` (Signatur, 12 Test-Injektionen), aber der eine Fehlertext nennt beide Ursachen („nicht konfiguriert oder keine Claude-Sitzung") | §4 Nr. 6 |

**Externer Review (3 von 4 Reviewern: Opus, Grok 4.6, MiniMax M3; Findings E1–E17), jedes entschieden:**

| Finding | Quelle | Entscheidung | Änderung am Plan |
|---|---|---|---|
| E1, Basisname-Ermittlung nur mit `/` — Windows-Pfade (`C:\bin\claude`) gälten als fremd | Opus, Grok (≥ 2) | angenommen — Trennung nach `/` **und** `\`; Test mit Windows-Pfad. Anmerkung: UI läuft auf macOS und Linux, das Shared-Modul soll trotzdem nicht am Trenner hängen | §3 Ansatz 2, §4 Nr. 2, §8 AK-01 |
| E2, Wrapper-`grep 'Authenticated: true'` unbelegt — falsches Muster hieße: jede OpenAI-Sitzung endet mit Exit 1 (Launch-Blocker) | Opus, Grok (≥ 2) | angenommen — nur das gemessene Negativmuster `Not authenticated` prüfen, sonst starten (Proxy meldet 401 sichtbar); R11 neu | §3 Wrapper, §9 R11 |
| E3, Sitzungsart hängt an einer Namenskonvention, die nur ein Kommentar sichert | MiniMax, Grok (≥ 2) | teils angenommen — Konvention bleibt (Gründe in §3 Alternativen: kein zweites Config-Feld, Settings-UI müsste es kennen), aber jetzt **erzwungen**: Vertragstest gegen die echte Config (jeder Provider `claude…` oder in `KNOWN_FOREIGN_PROVIDERS`) plus einmaliges Start-Log je fremdem Provider | §3 Ansatz 2, §4 Nr. 2/4, §8 E3 |
| E4, Filterlogik über drei Muster verstreut (`cliKind` in `model.list`, `isClaudeCli` in Settings, Backend-Filter der Prüfer); Grok: Terminal-Dropdown nutze `model.providers.list` und verlöre Codex (AK-05) | MiniMax, Grok (≥ 2) | teils — Teilbehauptung **widerlegt**: das Terminal-Dropdown lädt `model.list` (`aos-model-dropdown.ts:282`), nur die Prüfer-Liste lädt `model.providers.list` (`aos-cloud-terminal-sidebar.ts:2918`); AK-05 bleibt. Die drei Stellen sind zwei Transportwege für **eine** Funktion (`model.list` trägt kein `cliCommand`; die Settings-Antwort ist die Roh-Config, ein abgeleitetes Feld dort würde über `updateProvider` in die JSON zurückgeschrieben). Begründung jetzt in §3 Ansatz 3 und §3 Alternativen | §3 Ansatz 3/4, Alternativen |
| E5, `extraCliArgs` (`--mcp-config`, …) werden vor der Sitzungsart-Prüfung an jede Claude-Code-Sitzung gehängt — eine fremde CLI bekäme unbekannte Flags | Grok (Minderheit) | angenommen — belegt (`cloud-terminal-manager.ts:845-849`); heute setzt kein Aufrufer `extraCliArgs` (websocket `:2316`, `:2856`, vorhaben-service `:96` alle `undefined`), trotzdem gleiche Regel wie `--settings`, mit `console.warn`; Test | §3 Ansatz 3, §4 Nr. 3, §8 E5 |
| E6, Frontend-Filter `cliKind !== 'foreign'` ist fail-open: fehlt das Feld, bleibt Codex sichtbar und endet im generischen Backend-Fehler | Grok (Minderheit) | teils — fail-open bleibt (fail-closed leerte die Vorhaben-Seite bei jedem älteren Backend; Frontend und Backend werden gemeinsam gebaut und deployt), aber der Backend-Fehlertext nennt die Ursache „oder keine Claude-Sitzung"; revidiert F13 | §3 Alternativen, §4 Nr. 6 |
| E7, Codex bekommt kein Arbeitsverzeichnis (`--cd`) | Opus (Minderheit) | abgelehnt — **widerlegt**: die PTY (direkt und über das tmux-Run-Script) startet mit `cwd: effectiveCwd` (`cloud-terminal-manager.ts:887`, `:895`, `:917`); Codex nutzt das Prozess-cwd wie Claude Code; Beleg in §3 Ansatz 4 | §3 Ansatz 4 |
| E8, `handleModelList` liefert heute kein `cliKind` | Grok (Minderheit) | abgelehnt als Finding — das ist genau Änderung §4 Nr. 4/5 (`providersForModelList()`); kein neuer Befund | — |
| E9, Reihenfolge der Codex-Flags bei `extraCliArgs`-Injektion ungeprüft | Opus (Minderheit) | erledigt durch E5 — fremde CLIs bekommen keine `extraCliArgs`; Reihenfolge `[--dangerously-bypass…, --model, X, prompt]`; clap nimmt Optionen vor dem Positional [Likely], §10 Schritt 6 prüft `codex --help` | §4 Nr. 3 |
| E10, `curl -m 2` zu kurz, kein Retry | Opus (Minderheit) | teils — 5 s statt 2 s; kein Retry: der Proxy ist ein dauerhaft laufender lokaler Prozess, `/v1/models` antwortet aus dem Speicher (gemessen 200 in Millisekunden), einen Kaltstart gibt es nicht | §3 Ansatz 5, Wrapper |
| E11, per Hand gesetzter `stepDefaults`-Eintrag auf `codex-cli` vor den Guards — Wurf beim Laden oder stilles Ignorieren? | Opus (Minderheit) | angenommen — `getStepDefault()` prüft mit `isClaudeSessionModel` und fällt auf `anthropic/opus` zurück; kein Wurf beim Laden (Config wird nicht validiert); Test | §4 Nr. 4, §8 E11 |
| E12, deutsche `description`-Texte in `model-config.json` nicht i18n-fähig | Opus (Minderheit) | abgelehnt — die UI ist durchgehend deutsch (`Nächster Schritt`, Fehlertexte, `design.md`), i18n ist kein Ziel; bestehende Beschreibungen mischen ohnehin Englisch und Deutsch | — |
| E13, D2 A' (Namensregel nur für neue Dateien) lockert einen globalen Sicherheits-Hook und ist außerhalb des Umfangs | Grok (Minderheit) | angenommen im Kern — A' verworfen; neuer Vorschlag A'' (projekteigene, versionierte Ausnahmeliste, Hook ohne Datei unverändert streng). Nicht außerhalb des Umfangs: ohne Lösung kann der Bau die Config nicht committen (F1); Alternative B bleibt Michaels Wahl | Teil 1, §3 Ansatz 7, §4 Nr. 12–14, §8 D2, §9 R6 |
| E14, kein Test, dass `handleModelList` `cliKind` wirklich sendet | Opus (Minderheit) | angenommen — Transformation als reine Funktion `providersForModelList()` in `model-config.ts`, Unit-Test auf die Antwortform; `handleModelList` ruft sie nur auf | §4 Nr. 4/5, §5, §8 |
| E15, Reihenfolge D2 vor Config-Änderung nicht ausdrücklich | MiniMax (Minderheit) | angenommen — stand in §6 (Schritt 1 vor 6), jetzt auch in §3 Ansatz 7 und §6 Schritt 1 wörtlich („eigener Commit vor jeder Änderung an der Config") | §3, §6 |
| E16, Prüfer-Pfad (SDK) ohne Wrapper: Proxy-Ausfall zeigt generischen Reviewer-Fehler statt AK-08-Meldung | Grok (Minderheit) | angenommen als dokumentierte Grenze — R12 neu; AK-08 gilt für Terminal-Sitzungen; SDK-Fehlertext (`fetch failed`/`401`) ist sichtbar, gleiches Verhalten wie Grok heute; kein Wrapper im SDK-Pfad (`buildProviderEnv` setzt nur `CLAUDE_CONFIG_DIR`) | §3 Pflichtprüfungen, §9 R12 |
| E17, erster OpenAI-Klick auf dem Droplet zeigt „Claude Code installieren" statt einer nennenden Meldung — widerspricht Teil 1 | Grok (Minderheit) | angenommen — revidiert F4; Fehlertext nennt Kommando und Provider; Sichtprobe §10 Schritt 10 | §4 Nr. 3, §8 E17, §9 R3, §10 |

**Minimalinvasiv geprüft:** Wiederverwendet: `getProviderCommand` (Flag-Substitution), Hook-Gating `:852` (wird zur gemeinsamen Regel), `buildProviderEnv`/`defaultConfigDirs` (Provider-ID → `~/.claude-codex`), injizierbares `resolveModel`, `fresh()`-Testmuster, Grok-Wrapper und -Settings als Vorlage, `start-proxy.sh`. Gestrichen: neues Config-Feld, Frontend-Filter der Prüfer-Liste, zweiter Prüfer-Guard, Änderungen an `external-reviewer`/Orchestrator/Sidebar, Droplet-Einrichtung, Fehlertext-Kosmetik.

**Entscheidungen des Product Owners (2026-09-16, Chat „Alle vier ok, Freigabe"):** D1 Codex (nativ) auch aus Vorhaben-Modellwahl und Schritt-Standards heraushalten — ja. D2 Commit-Wächter mit projekteigener Ausnahmeliste `.claude/no-secrets-allow.txt` (Variante A'', Template 4.1.1) — ja; §10 Schritt 9 entfällt. D3 Codex nativ mit `--dangerously-bypass-approvals-and-sandbox` — ja. D4 Hintergrund-Mapping Haiku→Luna, Sonnet→Sol, Opus→Astra — ja.

**Abgleich Mensch/Agent:** „In einfachen Worten", §9, §10, §12 gegen §2–§8 gelesen am 2026-09-16 (nach Einarbeitung E1–E17): ohne Befund — Teil 1 verspricht zwei Provider, eine Regel an fünf Stellen mit Vertragstest und Start-Log, den nennenden Fehlertext, zwei Doc-Korrekturen, die Hook-Falle mit Ausnahmeliste oder Handcommit und die Mac-Einrichtung; §4 führt genau das (Nr. 1–15, Nr. 12–14 bedingt durch D2), §10 die Einrichtung, §8 je AK und je angenommenem Finding einen Nachweis. (R4)

### 13. Definition of Done

<!-- leser: agent -->

- [ ] Jede FA/AK aus Abschnitt 8 hat einen grünen Test (AK-01/04/05/06/07, D1 als Unit/Component; AK-02/03/05/08/10 als Stichprobe mit Protokoll; AK-09 als Messung mit Befehl und Ausgabe).
- [ ] Alle Nachweise aus Abschnitt 5 ausgeführt und im PR zitiert.
- [ ] E2E-Pfad läuft (Abschnitt 8), Screenshots im PR.
- [ ] `verify` grün, Ausgabe im PR — und PR-Checks grün (CI ist die Wahrheit).
- [ ] `docs/architecture.md` §2 + Protokoll, `docs/security.md` §1/§3 + Protokoll angepasst.
- [ ] Manuelle Schritte (Abschnitt 10) erledigt oder im PR als offen markiert.
- [ ] Abweichungen von diesem Plan in Abschnitt 14 eingetragen (insbesondere OF-03-Befund).
- [ ] 2x-Regel-Check: Fehler, der zum zweiten Mal vorkam → Vorschlag für `CLAUDE.md` im PR (Kandidat: `no-secrets` vs. versionierte Config — erstes Vorkommen, nur notieren).
- [ ] `intent.md`: `bezuege.plan`, nach Bau `status: umgesetzt`; Memory `reference_ui_model_provider_mechanism` Punkt 7 um Ergebnis ergänzen.
- [ ] Abschlussbericht nach R3 (nur Mensch-Abschnitte im Chat), endet mit dem Block „Für das Board" (Karte „neu: OpenAI-Modelle (GPT-6 Astra, Codex) in der Web-UI", Spalte, PR-Link, Stand, Verweis auf `intent/INT-2026-011-openai-modelle/`); Nachziehen in eigener Sitzung.

### 14. Abweichungen bei der Umsetzung

<!-- leser: mensch -->

| Datum | Abweichung | Grund | Auswirkung auf Abschnitt |
|---|---|---|---|
| 2026-09-16 | Branch von `origin/main` (20 Commits INT-2026-010 seit Planfreigabe) statt von `session/codex-gpt`; Intent- und Plan-Commits per Cherry-Pick. Zeilenangaben in §2/§4 (z. B. `websocket.ts:938-985` → `:667-712`) sind gegen den neuen Stand verschoben, Inhalte unverändert | Plan entstand vor Merge #57–#60 | §2, §4 (nur Zeilennummern) |
| 2026-09-16 | `no-secrets.sh`: Inhaltsregel war auf macOS tot — leere Alternative `(RSA \|EC \|OPENSSH \|)` lässt BSD-`grep -E` abbrechen, Hook wertete den Fehler als „kein Treffer". Probe (c) aus §8 D2 lieferte deshalb exit 0. Behoben mit `(RSA \|EC \|OPENSSH )?` in beiden Kopien; CHANGELOG „Behoben" | Beim Ausführen der Hook-Probe gefunden | §4 Nr. 12, §8 D2, CHANGELOG |
| 2026-09-16 | CHANGELOG hatte keinen Eintrag für 4.1.0 (INT-2026-009 hob nur `VERSION`); 4.1.1-Eintrag steht direkt über 4.0.2 | Vorgefunden | §4 Nr. 14 |
