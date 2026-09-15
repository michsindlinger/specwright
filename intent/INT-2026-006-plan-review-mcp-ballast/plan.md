# Plan: Plan-Review ohne MCP-Ballast — Reviewer und Aggregator laufen ohne die MCP-Server des Nutzers

> **Intent:** `intent.md` (INT-2026-006, Version 1.0.0 — umnummeriert von INT-2026-005, siehe §6 Schritt 0) · **Spec:** entfällt (bypass: Bugfix im Review-Kanal der UI, Größe S; Verhalten durch `specwright/specs/2026-04-30-auto-plan-review` festgelegt)
> **Status:** umgesetzt (PR #51, Merge steht aus)
> **Erstellt:** 2026-09-15 im Plan Mode · **Freigabe:** Product Owner (Michael Sindlinger), 2026-09-15
> **Pflichtinput gelesen:** `docs/architecture.md` (Stand `77c635a`: §2 Backend, AR-02, AR-04, §5 Claude Code SDK), `CLAUDE.md` (Verify, Konventionen UI, Hooks, „Nie"), `docs/security.md` (§1 `~/.claude.json` vertraulich, §5 Verbotsliste, §6 Pflichtprüfungen)

<!-- Ablage: intent/INT-2026-006-plan-review-mcp-ballast/plan.md -->

## In einfachen Worten

**Worum geht es?** Wenn du in der Web-UI ein Plan-Review auslöst, startet das Backend für jeden Reviewer (zum Beispiel Anthropic Opus, GLM, DeepSeek) einen eigenen kleinen Claude-Code-Prozess, der den Plan liest und ein Review schreibt. Haben mindestens zwei Reviewer geliefert, startet noch ein Prozess, der „Aggregator", der die Reviews zu einer Konsens-Fassung zusammenführt. Seit dem 15.09. scheitern der Anthropic-Reviewer und der Aggregator mit einem Fehler der Anthropic-Schnittstelle, und du bekommst nur das GLM-Einzelreview plus die Meldung „Consensus clustering unavailable".

Die Ursache: Jeder dieser Prozesse lädt ungefragt alle Zusatzwerkzeuge, die du global in deiner Claude-Konfiguration eingerichtet hast — die sogenannten MCP-Server für Obsidian, WhatsApp, Perplexity, Higgsfield und so weiter, zurzeit 12 Stück mit rund 184 Werkzeugen. Eins davon (ein 3D-Werkzeug von Higgsfield) hat eine Beschreibung, die die Anthropic-Schnittstelle in der Form nicht annimmt. Die Schnittstelle lehnt dann die gesamte Anfrage ab, nicht nur das eine Werkzeug. Der Reviewer benutzt dieses Werkzeug nie und scheitert trotzdem daran, dass es mitgeschickt wird. Die anderen Reviewer (GLM, DeepSeek) laufen mit einer eigenen, fast leeren Konfiguration und sind deshalb nicht betroffen.

Zwei Nebeneffekte derselben Ursache: Erstens zahlst du bei jedem Reviewer- und Aggregator-Aufruf rund 142.000 Tokens allein für die Beschreibungen dieser 184 Werkzeuge — bei drei Reviewern je Plan ist das der größte Kostenblock des ganzen Reviews. Zweitens laufen die Reviewer ohne Rückfrage-Dialog und hätten damit Zugriff auf alle geladenen Werkzeuge, auch „WhatsApp-Nachricht senden" und „in Obsidian schreiben". Ein Reviewer soll lesen, nichts senden.

**Was ändert sich?** Reviewer und Aggregator bekommen nur noch die Werkzeuge, die ihre Aufgabe braucht: der Reviewer die drei Lesewerkzeuge (Datei lesen, im Code suchen, Dateien finden), der Aggregator gar keins. MCP-Server aus deiner Konfiguration werden für diese Prozesse ausdrücklich nicht geladen — weder die globalen noch die aus der Projektdatei `.mcp.json`. Für dich sichtbar: Der Anthropic-Reviewer liefert wieder, bei zwei oder mehr Reviewern erscheint die Konsens-Fassung, und die Reviews kosten deutlich weniger (Ziel: unter 20.000 statt rund 142.000 Prompt-Tokens je Aggregator-Aufruf). Deine Claude-Sitzungen im Cloud-Terminal bleiben unberührt; die sollen ihre MCP-Server weiterhin haben.

**Wie wird das gemacht?** Claude Code hat dafür einen fertigen Schalter: die Kommandozeilenoption `--strict-mcp-config` bedeutet „benutze nur die MCP-Server, die ich dir ausdrücklich mitgebe — und ich gebe dir keine". Das Agent-SDK, über das das Backend die Prozesse startet, reicht diese Option durch, wenn man `strictMcpConfig: true` setzt. Das habe ich am 15.09. bereits ausprobiert: mit dem Schalter 9.220 Tokens statt 138.579, kein Fehler.

Damit die beiden Aufrufer (Reviewer und Aggregator) nicht wieder auseinanderlaufen — das ist hier schon einmal passiert, als der Anthropic-Reviewer auf ein falsches Konfigurationsverzeichnis zeigte —, kommt die Einstellung nicht zweimal in den Code, sondern einmal in eine kleine gemeinsame Funktion `buildSdkCallOptions`. Sie liefert das Bündel „Umgebung für diesen Provider + erlaubte Werkzeuge + keine MCP-Server + kein Rückfrage-Dialog" in einem Stück. Beide Aufrufer holen sich ihr Bündel dort. Der Rückfrage-Dialog bleibt aus, aber genau deshalb ist die Werkzeugliste auf Lesen beschränkt; die Funktion koppelt beides bewusst.

Drei Nachweise sichern das ab: (1) Automatische Tests prüfen, dass Reviewer und Aggregator die Option `strictMcpConfig: true` und die richtige Werkzeugliste übergeben. Diese Tests schreibe ich zuerst und lasse sie einmal fehlschlagen, bevor ich den Code ändere — so ist belegt, dass sie den Fehler wirklich erkennen. (2) Ein kleines Prüfprogramm `ui/scripts/smoke-test-sdk-isolation.ts` startet zwei echte, billige Haiku-Aufrufe mit genau den Einstellungen der beiden Aufrufer und zählt nach: Wie viele Werkzeuge sah das Modell (Soll: 3 und 0), wie viele MCP-Server (Soll: 0), wie viele Prompt-Tokens (Soll: unter 20.000)? Die Ausgabe kommt in den Pull Request. (3) Du löst auf dem Mac einmal ein echtes Plan-Review mit Anthropic plus GLM aus und siehst die Konsens-Fassung statt der Fehlermeldung.

**Was kann schiefgehen?** Die automatischen Tests prüfen nur, was an das SDK übergeben wird, nicht das Verhalten der Anthropic-Schnittstelle — deshalb die zwei zusätzlichen Nachweise mit echten Aufrufen. Das Prüfprogramm braucht deinen Anthropic-Login und kostet ein paar Cent; es läuft auf dem Mac, nie in der CI. Zwei weitere Stellen im Backend starten ebenfalls Claude-Prozesse mit deiner vollen MCP-Konfiguration (die Funktion „Prompt aus Screenshot lesen" und der Sprachanruf) und haben denselben Fehler; sie sind vom Vorhaben ausdrücklich nicht abgedeckt und werden als Karte fürs Board notiert, weil die gemeinsame Funktion für sie bereitliegt. Rückgängig ist die Änderung jederzeit: drei Quelldateien, ein Revert.

Zwei Dinge sind mir beim Nachsehen aufgefallen, die nicht im Intent stehen: Erstens ist die Nummer INT-2026-005 auf `main` inzwischen an ein anderes Vorhaben vergeben („Nächster Schritt aus der Web-UI", PR #49). Dieses Vorhaben wird deshalb beim Freigabe-Commit zu INT-2026-006 umbenannt (Ordner, `intent_id`, Verweise). Zweitens liegt dieser Arbeitszweig 6 Commits hinter `main`; die drei betroffenen Dateien wurden dort nicht angefasst, ein Rebase vor dem Bau reicht.

**Was musst du entscheiden?** Nichts, Freigabe reicht. Die zwei Entscheidungen, die ich getroffen habe (Umnummerierung auf 006; die beiden anderen Aufrufer als Folgekarte statt in diesem Vorhaben), stehen in §12 und lassen sich mit einem Wort umdrehen.

## 1. Kurzfassung

Beide SDK-Aufrufer des Plan-Reviews (`external-reviewer.ts`, `finding-aggregator.ts`) beziehen ihre Optionen künftig aus einer gemeinsamen Funktion `buildSdkCallOptions(providerId, tools)` in `ui/src/server/utils/sdk-call-options.ts`, die neben der Provider-Umgebung (`buildProviderEnv`) die Werkzeugliste, `strictMcpConfig: true` und den Permission-Modus setzt. Das SDK übersetzt `strictMcpConfig` in `--strict-mcp-config`, womit der Claude-Code-Prozess weder `~/.claude.json` noch `.mcp.json` des Projekts liest. Drei Unit-Tests halten die übergebenen Optionen fest, ein Smoke-Skript misst `init.tools`, `init.mcp_servers` und `usage` gegen die Schwellen aus AK-03/AK-04. Am Ende sind drei Quelldateien geändert oder neu, drei Testdateien und ein Skript.

## 2. Ausgangslage im Code

| Bereich | Heute (Datei:Zeile) | Bedeutung für dieses Vorhaben |
|---|---|---|
| Reviewer-Aufruf | `ui/src/server/services/external-reviewer.ts:4` `REVIEWER_TOOLS = ['Read','Grep','Glob']` (nicht exportiert); `:51-68` `claudeQuery({ options: { maxTurns: 40, tools, allowedTools, permissionMode: 'bypassPermissions', allowDangerouslySkipPermissions: true, cwd, abortController, env: buildProviderEnv(providerId), settingSources: ['user'], stderr, model? } })` — kein `strictMcpConfig`, kein `mcpServers` | muss geändert werden: Optionen aus der gemeinsamen Funktion; `REVIEWER_TOOLS` exportieren (Test und Smoke-Skript prüfen gegen dieselbe Konstante) |
| Reviewer-Fehlerpfad | `external-reviewer.ts:99-116` — kein `result` oder `is_error` → `Reviewer <ref> failed — …` | unverändert; das ist der Text aus dem Screenshot |
| Aggregator-Aufruf | `ui/src/server/services/finding-aggregator.ts:184-229` `callAggregatorLLM`; `:190-204` Optionen `maxTurns: 1, tools: [], allowedTools: [], permissionMode: 'bypassPermissions', allowDangerouslySkipPermissions: true, cwd, abortController, env: buildProviderEnv('anthropic'), settingSources: ['user'], model: 'haiku'`; Konstanten `:5-6` (`AGGREGATOR_PROVIDER_ID`, `AGGREGATOR_MODEL_ID`) | muss geändert werden: Optionen aus der gemeinsamen Funktion; `AGGREGATOR_MODEL_ID` und `buildAggregatorPrompt` (`:73`, heute nicht exportiert) exportieren, damit das Smoke-Skript den echten Aggregator-Prompt misst (AK-04) |
| Aggregator-Rückfall | `finding-aggregator.ts:251-260` (`llm-error`), `:262-266` (`empty-output`), `:272-295` (Retry, `parse-error`/`schema-invalid`) | unverändert (NZ-03) |
| Provider-Umgebung | `ui/src/server/utils/provider-env.ts:29-39` `buildProviderEnv(providerId)`: strippt `ANTHROPIC_*`, setzt für Nicht-Anthropic `CLAUDE_CONFIG_DIR=~/.claude-<id>`; Kommentar `:13-18` nennt Reviewer und Aggregator als Aufrufer und die Regressionsklasse `28965af` | wiederverwendbar, bleibt unverändert; die neue Funktion importiert sie (RB-02: eine Stelle) |
| SDK → CLI-Argumente | `ui/node_modules/@anthropic-ai/claude-agent-sdk/sdk.mjs:7715-7734` (0.1.77): `tools: []` → `--tools ""`; `mcpServers` → `--mcp-config` **nur wenn nicht leer**; `settingSources` → `--setting-sources`; `strictMcpConfig` → `--strict-mcp-config` | `strictMcpConfig: true` ist der einzige nötige Schalter; `mcpServers: {}` hätte keine Wirkung (Falle) |
| Bedeutung von `--strict-mcp-config` | SDK-Typ `entrypoints/sdk/runtimeTypes.d.ts:513-517` beschreibt „Enforce strict validation of MCP server configurations" — **irreführend**. Gebündeltes `cli.js` 2.0.77 und globales `claude --help` sagen beide: „Only use MCP servers from --mcp-config, ignoring all other MCP configurations" | [Certain] die CLI-Bedeutung gilt; Reproduktion aus dem Intent (9.220 statt 138.579 Tokens) bestätigt sie. Im Code-Kommentar der neuen Funktion festhalten, damit niemand den Schalter wegen des SDK-Kommentars entfernt |
| `settingSources: ['user']` | `external-reviewer.ts:62`, `finding-aggregator.ts:201`; eingeführt in `6bc3aac` ohne Begründung im Commit. SDK-Doku `runtimeTypes.d.ts:498-507`: lädt `~/.claude/settings.json` bzw. `$CLAUDE_CONFIG_DIR/settings.json`; ohne Angabe „SDK isolation mode" | [Likely] nötig, weil Drittanbieter-Provider ihren `env`-Block (`ANTHROPIC_BASE_URL`, Token) in `~/.claude-<id>/settings.json` halten (Ansatz A in `ui/scripts/smoke-test-sdk-config-dir.ts:4-8`). MCP-Server kommen aus `~/.claude.json`, nicht aus `settings.json` — `settingSources` hat mit dem Fehler nichts zu tun. **Bleibt gesetzt** (Falle: wer es entfernt, bricht GLM/DeepSeek) |
| Projekt-MCP | `.mcp.json` im Repo-Root: 5 Server (mermaid, context7, playwright, kanban, digitalocean); Reviewer laufen mit `cwd = reviewCwd` (`plan-review-orchestrator.ts:456-458`) | `--strict-mcp-config` ignoriert auch diese Datei; Reviewer bekommen den Kanban-MCP nicht mehr — gewollt (NZ-05) |
| Weitere SDK-Aufrufer | `ui/src/server/services/prompt-template-extractor.ts:133-150` (`tools: ['Read']`, `settingSources: ['user']`, ohne `strictMcpConfig`); `ui/src/server/services/voice-call.service.ts:594-600` (Standardwerkzeuge, ohne Beschränkung); beide aus `websocket.ts` aufgerufen, ohne Tests | gleiche Ursache, gleicher 400 mit Michaels `~/.claude.json` — **nicht** in diesem Vorhaben (Intent §2 nennt nur Reviewer und Aggregator; keine AK-Herkunft). Folgekarte, siehe §10 |
| Orchestrator | `plan-review-orchestrator.ts:141` `new ExternalReviewer()`, `:468` `reviewPlan(fullPrompt, providerId, modelId, reviewCwd)`, `:527` `aggregateFindings(...)` | unverändert; Signaturen bleiben |
| Tests Reviewer | `ui/tests/unit/external-reviewer.test.ts` — nur `isSubstanceLessReview`, kein SDK-Mock | erweitern: `vi.mock('@anthropic-ai/claude-agent-sdk')`, `reviewPlan` gegen `mockedQuery.mock.calls[0][0].options` |
| Tests Aggregator | `ui/tests/unit/finding-aggregator.test.ts:3-17` — `vi.mock` des SDK, `mockedQuery`, Hilfsgeneratoren `makeSuccessSession`; `:183` prüft Rückfall bei Throw; **keine** Prüfung der Optionen | Muster wiederverwenden; eine Prüfung der Optionen ergänzen |
| Tests Provider-Env | `ui/tests/unit/provider-env.test.ts` — Env-Verhalten je Provider | unverändert; neuer Test für die neue Funktion in eigener Datei |
| Smoke-Präzedenz | `ui/scripts/smoke-test-sdk-config-dir.ts` (APR-003): `npx tsx scripts/…`, echte SDK-Aufrufe, Exit 0/1; `ui/tsconfig.json` `include: ['src/**/*']`, `eslint src` — Skripte weder gebaut noch gelintet | Muster für das Mess-Skript; trotzdem strict und ohne `any` schreiben |
| Lieferumfang | `scripts/check-manifest.sh:18` `SHIPPED_DIRS` enthält kein `ui/` | keine Manifest-Zeile für die neuen Dateien nötig |
| Bezugsliste | `ui/tests/known-failures.txt` — keine der drei betroffenen Testdateien | neue rote Datei würde `verify` brechen; gut so |
| Worktree | `session/reviewer-fix`, 6 Commits hinter `origin/main` (bis `16b07f9`), 1 voraus (`fb16b42` Intent); `git log HEAD..origin/main -- <3 Dateien>` leer; kein `ui/node_modules` | Schritt 0: Rebase, `npm ci`, `chmod +x ui/node_modules/node-pty/prebuilds/*/spawn-helper` (CLAUDE.md „Fehler, die Claude hier schon zweimal gemacht hat") |
| Vorhaben-Nummer | `origin/main` hat `intent/INT-2026-005-schritt-start` (PR #49, gemergt); dieser Zweig hat `intent/INT-2026-005-plan-review-mcp-ballast` | [Certain] Kollision; nächste freie Nummer ist INT-2026-006 |

## 3. Entwurf

### Ansatz

Eine neue Datei `ui/src/server/utils/sdk-call-options.ts`:

```ts
import type { Options } from '@anthropic-ai/claude-agent-sdk';
import { buildProviderEnv } from './provider-env.js';

export type SdkCallOptions = Pick<
  Options,
  | 'env' | 'tools' | 'allowedTools' | 'strictMcpConfig' | 'settingSources'
  | 'permissionMode' | 'allowDangerouslySkipPermissions'
>;

/**
 * Options for a backend-spawned helper process (plan reviewer, finding
 * aggregator): provider auth from buildProviderEnv, exactly the given tools,
 * no MCP servers, no permission prompts.
 *
 * `strictMcpConfig: true` becomes `--strict-mcp-config` — in the CLI that means
 * "only use MCP servers from --mcp-config, ignoring all other MCP
 * configurations" (the SDK typing's "strict validation" wording is misleading).
 * With no `mcpServers` passed, the process loads neither ~/.claude.json nor
 * the project's .mcp.json. That is what keeps a broken third-party tool schema
 * (INT-2026-006) and ~140k tokens of tool descriptions out of every call.
 *
 * `permissionMode: 'bypassPermissions'` is only acceptable because the tool set
 * is read-only (RB-01); callers must not widen `tools` beyond that.
 *
 * `settingSources: ['user']` stays: third-party providers keep their env block
 * in ~/.claude-<id>/settings.json. It does not affect MCP loading.
 */
export function buildSdkCallOptions(providerId: string, tools: readonly string[]): SdkCallOptions {
  return {
    env: buildProviderEnv(providerId),
    tools: [...tools],
    allowedTools: [...tools],
    strictMcpConfig: true,
    settingSources: ['user'],
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
  };
}
```

Beide Aufrufer ersetzen ihre sieben Einzelzeilen durch `...buildSdkCallOptions(providerId, REVIEWER_TOOLS)` bzw. `...buildSdkCallOptions(AGGREGATOR_PROVIDER_ID, [])` und behalten ihre eigenen Optionen (`maxTurns`, `cwd`, `abortController`, `stderr`, `model`). Der direkte Import von `buildProviderEnv` fällt in beiden Dateien weg. `REVIEWER_TOOLS`, `AGGREGATOR_MODEL_ID` und `buildAggregatorPrompt` werden exportiert (reine Sichtbarkeit, kein Verhalten).

Das Mess-Skript `ui/scripts/smoke-test-sdk-isolation.ts` startet zwei Aufrufe mit `model: 'haiku'`, `maxTurns: 1`, `cwd: process.cwd()`:

1. Reviewer-Konfiguration: `buildSdkCallOptions('anthropic', REVIEWER_TOOLS)`, Prompt `Reply with OK.` — Soll `init.tools.length === 3`, `init.mcp_servers.length === 0`.
2. Aggregator-Konfiguration: `buildSdkCallOptions('anthropic', [])`, Prompt `buildAggregatorPrompt([{anthropic/opus, output: ''}, {glm/glm-5.1, output: ''}])`, `model: AGGREGATOR_MODEL_ID` — Soll `init.tools.length === 0`, `init.mcp_servers.length === 0`, `usage.input_tokens + cache_creation_input_tokens + cache_read_input_tokens < 20000`.

Es druckt eine Tabelle (Ist/Soll je Messwert) und endet mit Exit 0 nur, wenn alle Sollwerte erfüllt sind. Aufruf: `cd ui && npx tsx scripts/smoke-test-sdk-isolation.ts`.

### Verworfene Alternativen

| Alternative | Warum nicht |
|---|---|
| `strictMcpConfig: true` direkt in beide `claudeQuery`-Aufrufe schreiben | Funktioniert, aber zwei Stellen mit identischer Sicherheitslogik — genau die Drift, die RB-02 verbietet und die bei `28965af` schon einmal passiert ist. Die gemeinsame Funktion kostet 30 Zeilen und einen Test. |
| `disallowedTools: ['mcp__*']` | Die 12 MCP-Server würden weiterhin gestartet (Prozesse, RAM, Startzeit je Aufruf); ob Wildcards in `disallowedTools` greifen und ob abgewiesene Werkzeuge aus der API-Anfrage fallen, ist unbelegt. Löst das Kostenproblem nicht sicher. |
| `settingSources: []` (SDK-Isolationsmodus) | MCP-Server kommen aus `~/.claude.json`, nicht aus `settings.json` — kein Effekt auf den Fehler; bricht zusätzlich die Drittanbieter-Provider (env-Block). |
| `CLAUDE_CONFIG_DIR` für Anthropic auf ein leeres Verzeichnis zeigen lassen | Verliert den OAuth-Login aus `~/.claude` — das war die Regression `28965af` („Invalid API key"). |
| SDK auf eine Version heben, deren gebündeltes Claude Code das `allOf` glättet (wie das globale 2.1.273) | NZ-01; außerdem blieben 142.000 Tokens je Aufruf und der Zugriff auf `mcp__whatsapp__send_message`. Der Versionsabstand bleibt eigene Karte (OF-02). |
| `mcpServers: {}` übergeben | Das SDK setzt `--mcp-config` nur bei nicht-leerem Objekt (`sdk.mjs:7726`) — wirkungslos. |
| `buildProviderEnv` um die Optionen erweitern statt neue Datei | Der Name würde lügen (Env ≠ Werkzeugpolitik), und `provider-env.test.ts` müsste umgebaut werden. Die neue Funktion importiert `buildProviderEnv` und lässt Datei und Test unangetastet. |

### Architektur-Auswirkung

- **Nein** — bleibt innerhalb von `architecture.md` §2 (Web-UI Backend: Claude Code SDK) und §5 (Claude Code SDK / CLI, Zugang über `security.md` §3, unverändert). AR-02 (MCP-Server der Sitzungen direkt starten) ist nicht berührt: die Sitzungen im Cloud-Terminal behalten ihre MCP-Server (NZ-04); Reviewer- und Aggregator-Prozesse starten künftig gar keine. AR-04 unverändert (`cwd` kommt weiter aus dem Orchestrator). ADR: **nein** — keine Datenhaltung, kein Lieferumfang, keine UI-Auth, kein Wechsel des MCP-Startmodells; die Entscheidung „Reviewer ohne MCP-Werkzeuge" steht als NZ-05 im Intent.

### security.md §6 Pflichtprüfungen

- Endpunkt der UI: nein, keiner angelegt oder geändert.
- Lieferumfang: nein, `ui/` ist kein Lieferverzeichnis (`check-manifest.sh:18`).
- Installer: nein.
- Externes System: Anthropic-API über das SDK — bereits angebunden; Zugang unverändert (`security.md` §3: OAuth in `~/.claude`, Provider-Wrapper); Ausfallverhalten unverändert (Reviewer-Fehlertext `external-reviewer.ts:99-116`, Aggregator-Rückfall `finding-aggregator.ts:251-260`). Neu ist nur, dass weniger Werkzeuge übergeben werden.
- Projekt-Docs/Intents: keine Host-Details; das Mess-Skript druckt Zählwerte, keine Pfade aus `~/.claude.json`.
- RB-01: `bypassPermissions` bleibt, aber die Funktion koppelt es an die übergebene Leseliste; der Aggregator hat keine Werkzeuge. `~/.claude.json` wird nicht gelesen, nicht kopiert, nicht committet.

## 4. Änderungen

| # | Datei / Komponente | Art | Was | Herkunft |
|---|---|---|---|---|
| 1 | `ui/src/server/utils/sdk-call-options.ts` | neu | `buildSdkCallOptions(providerId, tools)` und Typ `SdkCallOptions` (§3) | AK-01, AK-02, AK-03, RB-01, RB-02 |
| 2 | `ui/src/server/services/external-reviewer.ts` | ändern | `REVIEWER_TOOLS` exportieren; `:53-67` sieben Optionszeilen durch `...buildSdkCallOptions(providerId, REVIEWER_TOOLS)` ersetzen; Import `buildProviderEnv` → `buildSdkCallOptions`; Kommentar `:46-48` anpassen | AK-01, AK-03 |
| 3 | `ui/src/server/services/finding-aggregator.ts` | ändern | `:192-203` analog `...buildSdkCallOptions(AGGREGATOR_PROVIDER_ID, [])`; `AGGREGATOR_MODEL_ID` und `buildAggregatorPrompt` exportieren; Import tauschen | AK-02, AK-03, AK-04 |
| 4 | `ui/tests/unit/sdk-call-options.test.ts` | neu | Form der Rückgabe: `strictMcpConfig === true`, `tools`/`allowedTools` gleich Eingabe (Kopie, nicht Referenz), kein Schlüssel `mcpServers`, `settingSources` `['user']`, `permissionMode` `bypassPermissions`; `env` für `anthropic` ohne `CLAUDE_CONFIG_DIR`, für `glm` mit `~/.claude-glm` (Env-Sicherung wie `provider-env.test.ts:14-29`) | AK-03, RB-02 |
| 5 | `ui/tests/unit/external-reviewer.test.ts` | ändern | `vi.mock('@anthropic-ai/claude-agent-sdk')` wie `finding-aggregator.test.ts:3-17`; neuer `describe('reviewPlan')`: (a) Erfolgssitzung → Rückgabetext; Optionen enthalten `strictMcpConfig: true`, `tools`/`allowedTools` `['Read','Grep','Glob']`, kein `mcpServers`, `settingSources` `['user']`, `cwd` gleich Argument, `model` gesetzt/ungesetzt je Argument; (b) Fehlersitzung (`is_error`) → wirft `Reviewer anthropic:opus failed …` | AK-01, AK-03 |
| 6 | `ui/tests/unit/finding-aggregator.test.ts` | ändern | im `aggregateFindings`-Block ein Test: bei zwei Reviewern werden Optionen mit `strictMcpConfig: true`, `tools: []`, `allowedTools: []`, `maxTurns: 1`, `model: 'haiku'`, kein `mcpServers` übergeben | AK-02, AK-03 |
| 7 | `ui/scripts/smoke-test-sdk-isolation.ts` | neu | Mess-Skript (§3); zwei Haiku-Aufrufe; Tabelle Ist/Soll; Exit 0/1 | AK-03, AK-04 (Messung) |
| 8 | `intent/INT-2026-005-plan-review-mcp-ballast/` → `intent/INT-2026-006-plan-review-mcp-ballast/` | ändern | `git mv`; `intent_id: "INT-2026-006"`, Ablage-Kommentar, Plan-Header; Schlagworte unverändert | Kollision mit `origin/main` (§2) |

**Nicht betroffen (ausdrücklich):** `ui/src/server/utils/provider-env.ts` und `provider-env.test.ts` (nur importiert) · `plan-review-orchestrator.ts` (Signaturen bleiben) · `prompt-template-extractor.ts`, `voice-call.service.ts` (gleiche Ursache, keine AK-Herkunft — Folgekarte §10) · Frontend (`aos-*`) · Aggregator-Rückfalllogik (NZ-03) · SDK-Version in `ui/package.json` (NZ-01) · Cloud-Terminal-Sitzungen und ihre MCP-Server (NZ-04) · `docs/architecture.md`, `docs/security.md` · `specwright/manifest.tsv` · `ui/tests/known-failures.txt` · `.mcp.json` des Repos.

## 5. Verbindungen

| Von | Nach | Art | Schnittstelle | Nachweis (Befehl) | Teil |
|---|---|---|---|---|---|
| `external-reviewer.ts` | `sdk-call-options.ts` | Import + Spread | `...buildSdkCallOptions(providerId, REVIEWER_TOOLS)` | `grep -n "buildSdkCallOptions" ui/src/server/services/external-reviewer.ts` (2 Treffer: Import, Aufruf) | — |
| `finding-aggregator.ts` | `sdk-call-options.ts` | Import + Spread | `...buildSdkCallOptions(AGGREGATOR_PROVIDER_ID, [])` | `grep -n "buildSdkCallOptions" ui/src/server/services/finding-aggregator.ts` (2 Treffer) | — |
| `sdk-call-options.ts` | `provider-env.ts` | Import | `buildProviderEnv(providerId)` | `grep -n "buildProviderEnv" ui/src/server/utils/sdk-call-options.ts` (2 Treffer); `grep -rn "buildProviderEnv" ui/src/server/services/` (0 Treffer — beide Aufrufer gehen über die neue Funktion, RB-02) | — |
| `sdk-call-options.ts` | Claude-Code-CLI | Prozessargument | `strictMcpConfig: true` → `--strict-mcp-config` | `grep -n "strict-mcp-config" ui/node_modules/@anthropic-ai/claude-agent-sdk/sdk.mjs` (Treffer bei der Argumentbildung) + Test #4 | — |
| `smoke-test-sdk-isolation.ts` | `sdk-call-options.ts`, `external-reviewer.ts`, `finding-aggregator.ts` | Import | `buildSdkCallOptions`, `REVIEWER_TOOLS`, `buildAggregatorPrompt`, `AGGREGATOR_MODEL_ID` | `grep -n "^import" ui/scripts/smoke-test-sdk-isolation.ts` (3 Projekt-Imports) | — |
| Tests #4–#6 | Module #1–#3 | Import + Mock | `vi.mock('@anthropic-ai/claude-agent-sdk')`, `mockedQuery.mock.calls[0][0].options` | `cd ui && npx vitest run tests/unit/sdk-call-options.test.ts tests/unit/external-reviewer.test.ts tests/unit/finding-aggregator.test.ts` | — |

- [x] Jede neue Komponente hat mindestens eine Verbindung (#1: zwei Aufrufer, ein Test, ein Skript; #7: drei Imports).
- [x] Jeder Nachweis ist ein ausführbarer Befehl.

## 6. Reihenfolge der Arbeit

0. **Lesende Vorprüfung und Arbeitsplatz.** (a) `grep -rn "buildProviderEnv\|REVIEWER_TOOLS\|buildAggregatorPrompt\|AGGREGATOR_MODEL_ID" ui/src ui/tests ui/scripts` — Konsumenten der Symbole, die exportiert oder umverdrahtet werden (erwartet: nur die in §4 genannten Dateien). (b) `git fetch origin main && git log --oneline HEAD..origin/main -- ui/src/server/services/external-reviewer.ts ui/src/server/services/finding-aggregator.ts ui/src/server/utils/provider-env.ts` — muss leer sein (Stand 15.09.: leer). (c) `git rebase origin/main`. (d) `cd ui && npm ci && chmod +x node_modules/node-pty/prebuilds/*/spawn-helper`. (e) Umnummerierung (#8) ist beim Freigabe-Commit bereits erledigt; prüfen: `ls intent/ | grep 006`. → prüfbar durch leere Ausgabe in (b), `git status` sauber nach (c), `ls ui/node_modules/@anthropic-ai/claude-agent-sdk/sdk.mjs` nach (d).
1. **Tests zuerst** (#4, #5, #6) → `cd ui && npx vitest run tests/unit/sdk-call-options.test.ts tests/unit/external-reviewer.test.ts tests/unit/finding-aggregator.test.ts` — **rot**: Modul `sdk-call-options` fehlt, `strictMcpConfig` ist `undefined`. Fehlschlag im Terminal-Protokoll festhalten (Bugfix-Regel §8).
2. **Gemeinsame Funktion** (#1) → `sdk-call-options.test.ts` grün; die anderen beiden noch rot.
3. **Aufrufer umstellen** (#2, #3) → alle drei Testdateien grün; `cd ui && npm run lint:backend && npm run build:backend` grün.
4. **Mess-Skript** (#7) schreiben und auf dem Mac ausführen: `cd ui && npx tsx scripts/smoke-test-sdk-isolation.ts` → Exit 0, Tabelle mit `tools 3/0`, `mcp_servers 0/0`, Prompt-Tokens < 20.000. Ausgabe für den PR sichern.
5. **Verbindungen nachweisen** (§5, alle sechs Befehle) → Ausgaben für den PR sichern.
6. `bash scripts/verify.sh` → `verify: OK`; PR mit Ausgabe von 1 (rot), 3 (grün), 4 (Messung), 5 (Nachweise), 6 (`verify`); CI-Check grün abwarten (AP-03).
7. **Stichprobe** (Michael, §10): Plan-Review in der UI mit Anthropic + GLM → Konsens-Fassung sichtbar; Screenshot in den PR. Danach Merge (Michael).

## 7. Zerlegung

### Variante A — nicht zerlegbar, eine Sitzung

Drei Quelldateien und drei Testdateien hängen an einer gemeinsamen Funktion (§5, sechs Verbindungen); die Tests müssen vor dem Fix rot sein und danach grün — das ist eine Sequenz, keine Parallelität. Gesamtaufwand rund 2 Stunden; eine Zerlegung würde mehr Integrationsarbeit kosten als sie spart.

## 8. Tests und Nachweis

| AK / RB | Test | Datei | Art |
|---|---|---|---|
| AK-01 | `reviewPlan` übergibt `strictMcpConfig: true`, `tools`/`allowedTools` `['Read','Grep','Glob']`, kein `mcpServers`; Erfolgssitzung liefert den Text; Fehlersitzung wirft `Reviewer … failed` | `ui/tests/unit/external-reviewer.test.ts` | Unit |
| AK-01 | Manuelles Plan-Review auf dem Mac mit Michaels `~/.claude.json` (enthält den higgsfield-Server): Anthropic-Reviewer liefert ein Review | Protokoll + Screenshot im PR | Stichprobe (manuell, Michael) |
| AK-02 | `aggregateFindings` mit zwei Reviewern übergibt `strictMcpConfig: true`, `tools: []`, `allowedTools: []`, `maxTurns: 1`, `model: 'haiku'`, kein `mcpServers` | `ui/tests/unit/finding-aggregator.test.ts` | Unit |
| AK-02 | Dieselbe Stichprobe: UI zeigt die Konsens-Fassung statt „Consensus clustering unavailable" | Screenshot im PR | Stichprobe (manuell, Michael) |
| AK-03 | `buildSdkCallOptions` liefert genau die übergebene Werkzeugliste, `strictMcpConfig: true`, keinen Schlüssel `mcpServers`; beide Aufrufer nutzen sie (Nachweis §5, `grep -rn "buildProviderEnv" ui/src/server/services/` = 0) | `ui/tests/unit/sdk-call-options.test.ts` + §5 | Unit + Nachweis |
| AK-03 | `init.tools.length` = 3 (Reviewer-Konfiguration) bzw. 0 (Aggregator-Konfiguration), `init.mcp_servers.length` = 0 in beiden | `ui/scripts/smoke-test-sdk-isolation.ts`, Ausgabe im PR | Messung |
| AK-04 | Aggregator-Konfiguration mit echtem Aggregator-Prompt und zwei leeren Reviewer-Ausgaben: `input_tokens + cache_creation_input_tokens + cache_read_input_tokens` < 20.000 | `ui/scripts/smoke-test-sdk-isolation.ts`, Ausgabe im PR | Messung |
| RB-01 | `permissionMode` `bypassPermissions` nur zusammen mit der übergebenen Leseliste; Aggregator ohne Werkzeuge | `sdk-call-options.test.ts` | Unit |
| RB-03 | Unit-Tests laufen ohne SDK-Prozess (`vi.mock`), unabhängig von `~/.claude.json` des Rechners; Mess-Skript ist nicht Teil von `verify` | Testdateien, `scripts/verify.sh` unverändert | Nachweis |

- **Verify-Befehl:** `bash scripts/verify.sh` — muss mit `verify: OK` enden, Ausgabe wird im PR zitiert. **CI ist die Wahrheit:** lokal grün zählt erst, wenn die PR-Checks grün sind. `ui/tests/known-failures.txt` wird nicht angefasst.
- **Datenkorrektur:** entfällt, keine Bestandsdaten.
- **Angeschlossen (E2E-Pfad):** UI löst Plan-Review aus → `plan-review-orchestrator.ts:468` `reviewPlan` → `external-reviewer.ts` → `buildSdkCallOptions` → SDK `query()` → `cli.js … --tools Read,Grep,Glob --strict-mcp-config` → Anthropic-API → `result` → Orchestrator sammelt ≥ 2 Reviews → `:527` `aggregateFindings` → `callAggregatorLLM` → `buildSdkCallOptions('anthropic', [])` → `--tools "" --strict-mcp-config` → Konsens-JSON → UI zeigt Konsens-Fassung. Geprüft: manuell mit Protokoll und Screenshot (Michael, §10); die beiden SDK-Abschnitte des Pfads zusätzlich durch das Mess-Skript.
- **Bugfix:** Test zuerst (Schritt 1), Fehlschlag im Protokoll, dann Fix ohne Änderung am Test. Hook `protect-tests` aktiv; Marker `.claude/fix-mode` erst nach Schritt 1 setzen, falls die Sitzung ihn nutzt.
- **UI:** keine UI-Änderung; die Konsens-Ansicht existiert (INT-2026-004). Screenshot der Stichprobe als Beleg, kein Mock nötig.

## 9. Risiken

| Risiko | Wahrscheinlichkeit | Wirkung | Gegenmaßnahme | Wer merkt es |
|---|---|---|---|---|
| Unit-Tests belegen nur die übergebene Option, nicht das Verhalten der API | — (Konstruktion) | mittel | Zweites Standbein: Mess-Skript mit echten Aufrufen (AK-03/AK-04) und Stichprobe in der UI (AK-01/AK-02) | Michael bei der Stichprobe |
| Eine spätere Claude-Code-Version ändert die Bedeutung von `--strict-mcp-config` (z. B. Enterprise-MCP-Konfiguration bleibt) | niedrig | mittel | Mess-Skript nach jedem SDK-Update ausführen (Karte OF-02 nennt es als Prüfschritt) | Reviewer-Fehler in der UI |
| Drittanbieter-Reviewer (GLM, DeepSeek) verlieren den einen MCP-Server aus `~/.claude-glm/.claude.json` | sicher | keine | gewollt (NZ-05); kein Prompt benutzt ihn | niemand |
| `prompt-template-extractor.ts` und `voice-call.service.ts` scheitern weiter am selben 400 | hoch (solange higgsfield in `~/.claude.json`) | mittel (zwei Nebenfunktionen) | außerhalb des Vorhabens; Folgekarte mit Verweis auf `buildSdkCallOptions` (§10) | Michael bei „Prompt aus Screenshot" oder Sprachanruf |
| Worktree-`npm ci` bricht node-pty (bekannt) | mittel | niedrig | `chmod +x ui/node_modules/node-pty/prebuilds/*/spawn-helper` (Schritt 0d, CLAUDE.md) | `verify` lokal rot bei `terminal-manager` — steht in der Bezugsliste, CI entscheidet |
| Mess-Skript kostet echte API-Aufrufe und braucht OAuth | sicher | niedrig (2 Haiku-Aufrufe, Cent-Betrag) | nur manuell auf dem Mac, nicht in `verify`, nicht in CI | — |
| Umnummerierung bricht Verweise (Commit `fb16b42` nennt 005; Board-Karte) | niedrig | niedrig | Board-Karte verweist auf den Ordnerpfad (Block „Für das Board"); Git-Historie bleibt, PR-Beschreibung nennt beide Nummern | Wer `INT-2026-005` sucht, findet auf `main` das andere Vorhaben — PR-Text erklärt es |
| `vi.mock` in `external-reviewer.test.ts` verändert das Modul-Laden für die bestehenden `isSubstanceLessReview`-Tests | niedrig | niedrig | Mock liefert nur `query`; reine Funktion bleibt unberührt; Lauf in Schritt 1 zeigt es | Testlauf |

## 10. Manuelle Schritte

| Schritt | Wer | Wann | Erledigt |
|---|---|---|---|
| Umnummerierung INT-2026-005 → INT-2026-006: `git mv intent/INT-2026-005-plan-review-mcp-ballast intent/INT-2026-006-plan-review-mcp-ballast`, `intent_id`, Ablage-Kommentar, Plan-Header; im Freigabe-Commit `plan(INT-2026-006): Plan freigegeben` (Workflow `specwright/workflows/core/plan.md` Schritt 9b) | Claude, diese Sitzung | bei Freigabe, vor `/build` | [x] Commit der Freigabe |
| Zweig umbenennen: `git branch -m session/reviewer-fix fix/INT-2026-006-plan-review-mcp-ballast` (Konvention der bisherigen PRs: `feat/INT-…`, `fix/INT-…`) | Claude, Build-Sitzung | vor dem ersten Build-Commit | [x] 2026-09-15 |
| Arbeitsplatz: `git rebase origin/main`; `cd ui && npm ci && chmod +x node_modules/node-pty/prebuilds/*/spawn-helper` (CLAUDE.md „Fehler, die Claude hier schon zweimal gemacht hat") | Claude, Build-Sitzung | vor Umsetzung | [x] 2026-09-15, plus `cd ui/frontend && npm ci` (§14) |
| Mess-Lauf auf dem Mac: `cd ui && npx tsx scripts/smoke-test-sdk-isolation.ts` mit Michaels `~/.claude.json` (OAuth in `~/.claude`; 2 Haiku-Aufrufe); Ausgabe in den PR | Claude, Build-Sitzung (Mac) | vor PR | [x] 2026-09-15: Reviewer tools 3, mcp_servers 0, 6.964 Prompt-Tokens; Aggregator tools 0, mcp_servers 0, 5.035 Prompt-Tokens; Exit 0 |
| Stichprobe in der UI: Backend lokal (`cd ui && npm run dev:backend`, Port 3001, CLAUDE.md „Befehle"), Plan-Review mit Anthropic + GLM auslösen, Konsens-Fassung sichtbar; Screenshot in den PR | Michael | vor Merge | [ ] |
| Merge nach `main` → Auto-Deploy der UI auf den Cloud-Host (`architecture.md` §5; Merge ist Michaels Schritt, `production-gate` nicht berührt) | Michael | Merge | [ ] |
| Board nachziehen in eigener Sitzung (`obsidian-po-board`): Karte dieses Vorhabens → `✅ Erledigt` mit PR; Karte „SDK-gebündeltes Claude Code 2.0.77 vs. global 2.1.273" → Needs Discovery (OF-02; Prüfschritt: Mess-Skript nach Update); Karte „`prompt-template-extractor` und `voice-call` auf `buildSdkCallOptions` umstellen" (gleiche Ursache) | Claude, Board-Sitzung nach `/clear` | nach Merge | [ ] |

## 11. Schätzung

2–3 h in einer Sitzung: Arbeitsplatz 10–20 min (`npm ci`, Rebase), Tests 40 min, Funktion und Aufrufer 20 min, Mess-Skript 30 min plus Lauf, Nachweise und `verify` 15 min, PR 15 min. Unsicherheit: der Worktree hat noch nie `npm ci` gesehen (node-pty, bekanntes Muster); das Mess-Skript hängt an einem funktionierenden OAuth-Login auf dem Mac. Für beides ist die Ursache bekannt, die Dauer der Behebung nicht.

## 12. Review des Plans

| Finding | Quelle | Entscheidung | Änderung am Plan |
|---|---|---|---|
| Intent nennt zwei SDK-Aufrufer, im Backend gibt es vier (`prompt-template-extractor.ts`, `voice-call.service.ts` mit derselben Ursache) | Self (Vollständigkeit) | abgelehnt für dieses Vorhaben: keine AK-Herkunft, keine Tests dort, Intent §2 begrenzt die Betroffenen; die gemeinsame Funktion ist für sie gebaut | §4 „Nicht betroffen", §9, §10 Folgekarte |
| SDK-Typkommentar zu `strictMcpConfig` („strict validation") widerspricht der CLI-Bedeutung — Gefahr, dass jemand den Schalter als irrelevant entfernt | Self (Risiken) | angenommen | §2 Zeile „Bedeutung", Kommentar im Code (§3) |
| AK-04 verlangt den Aggregator-Aufruf „mit leerem Reviewer-Inhalt"; ein `Reply with OK`-Prompt wäre ein anderer Messgegenstand | Self (Konsistenz) | angenommen: `buildAggregatorPrompt` und `AGGREGATOR_MODEL_ID` exportieren, Skript misst den echten Prompt mit zwei leeren Ausgaben | §3, §4 #3, §8 |
| Unit-Tests prüfen Optionen, nicht API-Verhalten | Self (Risiken) | angenommen: Messung + Stichprobe als zweites und drittes Standbein, wie AK-01–AK-04 es vorsehen | §8, §9 |
| Vorhaben-Nummer 005 auf `main` bereits vergeben (PR #49) | Self (Vorprüfung `origin/main`) | angenommen: 006, Umbenennung beim Freigabe-Commit | Header, §4 #8, §10 |
| Worktree 6 Commits hinter `main`, kein `node_modules` | Self (Vorprüfung) | angenommen: Schritt 0 | §6, §10 |
| `settingSources: ['user']` könnte als Teil des Problems missverstanden und entfernt werden | Self (Konsistenz) | angenommen: bleibt, Begründung im Code-Kommentar und §2 | §2, §3 |
| Mess-Skript im Repo statt Einmal-Skript im Scratchpad | Self (Alternativen) | angenommen: Präzedenz `smoke-test-sdk-config-dir.ts`; reproduzierbar nach SDK-Updates (OF-02) | §4 #7 |
| `disallowedTools: ['mcp__*']` als leichtere Lösung | Self (Alternativen) | abgelehnt: Server würden weiter gestartet, Wirkung auf die API-Anfrage unbelegt | §3 Alternativen |

**Minimalinvasiv geprüft:** Wiederverwendet: `buildProviderEnv` (unverändert), das Mock-Muster aus `finding-aggregator.test.ts:3-17`, die Env-Sicherung aus `provider-env.test.ts:14-29`, das Smoke-Skript-Muster aus `ui/scripts/smoke-test-sdk-config-dir.ts`, der vorhandene CLI-Schalter `--strict-mcp-config`. Gestrichen: `mcpServers: {}` (wirkungslos), ADR und Änderung an `architecture.md` (keine Grenze verschoben), Änderungen an `provider-env.ts`, an der Rückfalllogik des Aggregators, an der SDK-Version, an den zwei anderen SDK-Aufrufern, an Frontend und Orchestrator. Externe Reviewer: keine beauftragt (Bypass, Größe S); löst Michael das Plan-Review in der UI aus, kommen die Findings in diese Tabelle.

## 13. Definition of Done

- [x] Jede AK aus Abschnitt 8 hat einen grünen Test bzw. eine dokumentierte Messung (AK-01–AK-04 Unit + Mess-Skript); Stichprobe in der UI (AK-01/AK-02 manuell) steht aus — Michael, §10.
- [x] Alle sechs Nachweise aus Abschnitt 5 ausgeführt und im PR zitiert.
- [ ] E2E-Pfad läuft (Abschnitt 8): Stichprobe mit Screenshot — offen, Michael vor Merge (§10). Die beiden SDK-Abschnitte des Pfads sind durch das Mess-Skript belegt.
- [x] `verify` grün (lokal `verify: OK`, Ausgabe im PR) — PR-Check `verify` grün (Run 35027280608, 1m33s).
- [x] `docs/architecture.md` unverändert (Abschnitt 3 „Nein").
- [x] Manuelle Schritte (Abschnitt 10) erledigt oder im PR als offen markiert (offen: Stichprobe, Merge, Board).
- [x] Abweichungen von diesem Plan in Abschnitt 14 eingetragen (3 Zeilen).
- [x] 2x-Regel-Check: Regressionsklasse „SDK-Aufrufer laufen auseinander" (`28965af`, jetzt MCP) → Vorschlag für `CLAUDE.md` im PR: „Neue SDK-Aufrufer gehen über `buildSdkCallOptions`."
- [x] Abschlussbericht endet mit dem Block „Für das Board" (Karte, Spalte, PR-Link, Stand, Verweis auf `intent/INT-2026-006-plan-review-mcp-ballast/`, zwei Folgekarten); Nachziehen in eigener Sitzung.

## 14. Abweichungen bei der Umsetzung

| Datum | Abweichung | Grund | Auswirkung auf Abschnitt |
|---|---|---|---|
| 2026-09-15 | Arbeitsplatz brauchte zusätzlich `cd ui/frontend && npm ci` | Schritt 0(d) nannte nur `cd ui && npm ci`; `verify` Schritt 4 (`build:ui`) und die Vitest-Bezugsliste lesen `ui/frontend/node_modules` — ohne sie 21 TS2307-Fehler und 6 „neue" rote Testdateien, alle umgebungsbedingt. Nach `npm ci` im Frontend `verify: OK` | §6 Schritt 0, §10 Arbeitsplatz; Vorschlag für `CLAUDE.md` im PR (2x-Regel-Nachbar: Worktree-node_modules) |
| 2026-09-15 | Nachweis `grep -n "buildSdkCallOptions" external-reviewer.ts` liefert 3 Treffer statt 2 | Der angepasste Kommentar `:47` nennt die Funktion beim Namen | §5 (Import, Kommentar, Aufruf — Verbindung wie geplant) |
| 2026-09-15 | Mess-Skript prüft zusätzlich `result = success` je Aufruf (2 Zeilen mehr in der Tabelle) | Ohne erfolgreiches `result` wären `tools`/`mcp_servers` ohne Aussage; kein neuer Messgegenstand | §3, §8 (Messwerte unverändert: 3/0, 0/0, 5.035 < 20.000) |
