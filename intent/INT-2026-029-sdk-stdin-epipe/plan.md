# Plan: Backend überlebt einen früh beendeten Claude-Helfer

> **Intent:** `intent.md` (INT-2026-029) · **Spec:** entfällt (bypass: Bugfix unter 1 Tag)
> **Status:** freigegeben
> **Erstellt:** 2026-10-01 · **Freigabe:** Michael, 2026-10-01 (Chat: „ja mach A1 und A2 als bugfix")
> **Pflichtinput gelesen:** `docs/architecture.md` (Stand d230230), `CLAUDE.md`, `docs/security.md`

## In einfachen Worten

<!-- leser: mensch -->

**Worum geht es?** Bei einer Plan-Review startet das Backend im Hintergrund kleine Claude-Helfer. Einer davon fasst die Befunde mehrerer Reviewer zusammen. Das Backend gibt ihm seine Aufgabe über eine Art Rohrleitung. Wenn der Helfer stirbt, bevor die Aufgabe ganz durch die Leitung ist, meldet das Betriebssystem „Leitung kaputt". Die Bibliothek, die den Helfer startet, hört auf diese Meldung nicht. Node behandelt eine Meldung, auf die niemand hört, als schweren Fehler und beendet das ganze Backend. Damit sind alle offenen Terminals und Sitzungen weg. Das ist dir heute zweimal passiert.

**Was ändert sich?** Das Backend fängt die Meldung „Leitung kaputt" ab und läuft weiter. Die Review greift dann auf ihren vorhandenen Rückfall zurück: Statt einer Zusammenfassung siehst du die Befunde der einzelnen Reviewer. Außerdem schreibt das Backend ins Log, was der Helfer vor seinem Ende ausgegeben hat. Beim nächsten Mal sehen wir also, warum er stirbt.

**Wie wird das gemacht?** Die Bibliothek erlaubt, den Helfer mit einer eigenen Startfunktion zu starten. Diese Funktion schreiben wir einmal. Sie macht dasselbe wie die Bibliothek und hängt zusätzlich einen Zuhörer an die Leitung. Alle drei Stellen, die solche Helfer starten, benutzen sie: die Zusammenfassung, der externe Reviewer und die Vorlagen-Extraktion aus Bildern. Die Startfunktion fängt auch die Fehlerausgabe des Helfers auf und reicht sie an den Aufrufer weiter.

**Was kann schiefgehen?** Wenn die eigene Startfunktion den Helfer anders startet als die Bibliothek, schlagen Reviews fehl. Das würdest du an Reviews merken, die nur noch auf den Rückfall gehen. Rückgängig machen heißt: die Startfunktion aus den Optionen nehmen. Die Ursache für das frühe Ende des Helfers bleibt bestehen. Neu ist nur, dass sie das Backend nicht mehr umreißt und im Log sichtbar wird.

**Was musst du entscheiden?** Nichts, die Freigabe reicht.

## Details

<!-- leser: mensch -->

### 1. Kurzfassung

<!-- leser: mensch -->

Neuer Helfer `createSdkSpawner(onStderr?)` in `ui/src/server/utils/sdk-spawn.ts`. Er wird als SDK-Option `spawnClaudeCodeProcess` an alle drei `query()`-Aufrufer gegeben (Reviewer und Aggregator über `buildSdkCallOptions`, den Extraktor direkt). Er spiegelt `spawnLocalProcess` des SDK und hängt einen `error`-Listener an `child.stdin`. Der Aggregator sammelt stderr und loggt sie bei einem Fehler. [Certain]

### 2. Ausgangslage im Code

<!-- leser: agent -->

| Bereich | Heute (Datei:Zeile) | Bedeutung für dieses Vorhaben |
|---|---|---|
| SDK-Spawn | `ui/node_modules/@anthropic-ai/claude-agent-sdk/sdk.mjs:7603–7636` (`spawnLocalProcess`), `:7798–7809` | Kein `stdin.on('error')` → unbehandeltes EPIPE beendet den Prozess. Mit `spawnClaudeCodeProcess` wird die eigene Funktion benutzt. Dann verdrahtet das SDK seine `stderr`-Option nicht mehr (das geschieht nur in `spawnLocalProcess`). |
| SDK-Typen | `.../entrypoints/sdk/runtimeTypes.d.ts:559`, `.../transport/processTransportTypes.d.ts` | `spawnClaudeCodeProcess?: (options: SpawnOptions) => SpawnedProcess` ist typisiert. `ChildProcess` erfüllt `SpawnedProcess` laut Doku, wenn stdin und stdout Pipes sind. |
| Gemeinsame Optionen | `ui/src/server/utils/sdk-call-options.ts` | Einzige Quelle für die Werkzeug- und MCP-Regel von Reviewer und Aggregator. Hier kommt der Spawner hinein. |
| Aggregator | `ui/src/server/services/finding-aggregator.ts:184–225` | Keine stderr. Ein Fehler endet in `llm-error` mit nur `err.message`. |
| Reviewer | `ui/src/server/services/external-reviewer.ts:40–60, 96–108` | Sammelt stderr über die SDK-Option `stderr`. Die ginge mit eigenem Spawner verloren und muss über `onStderr` laufen. |
| Extraktor | `ui/src/server/services/prompt-template-extractor.ts:133–150` | Eigene Optionen ohne `buildSdkCallOptions`. Bekommt nur den Spawner, ohne stderr. |
| Globale Fehler | `grep -rn uncaughtException ui/src/server` → leer | Bleibt so (NZ-02). |

### 3. Entwurf

<!-- leser: agent -->

#### Ansatz

<!-- leser: agent -->

`sdk-spawn.ts` exportiert `createSdkSpawner(onStderr?: (chunk: string) => void)` mit dem Typ `NonNullable<Options['spawnClaudeCodeProcess']>`:

- `spawn(command, args, { cwd, env, signal, stdio: ['pipe', 'pipe', onStderr ? 'pipe' : 'ignore'], windowsHide: true })`, wie im SDK.
- `child.stdin.on('error', …)` loggt einmal `console.warn('[sdk-spawn] …')` und schluckt den Fehler. Das SDK meldet das Ende des Kinds über seinen `exit`-Handler als `Claude Code process exited with code N`, der `for await` wirft, und die Aufrufer fallen in ihre vorhandenen catch-Pfade.
- Mit `onStderr`: `child.stderr.on('data', d => onStderr(d.toString()))`.

`buildSdkCallOptions(providerId, tools, onStderr?)` liefert zusätzlich `spawnClaudeCodeProcess`. Reviewer: `stderr:`-Option entfällt, der Puffer läuft über `onStderr`. Aggregator: Puffer je Aufruf. Bei einem Stream-Fehler wirft er `${message} — stderr: ${head 800}`, sodass der vorhandene `fallback triggered … claudeQuery failed — …`-Log ihn zeigt. Bei leerem Ergebnis mit stderr gibt es ein zusätzliches `console.warn`. Der Extraktor bekommt `spawnClaudeCodeProcess: createSdkSpawner()`.

#### Verworfene Alternativen

<!-- leser: agent -->

| Alternative | Warum nicht |
|---|---|
| Globaler `uncaughtException`-Handler, der EPIPE filtert | Nicht gewünscht (A3 abgewählt). Er wirkt prozessweit und verdeckt andere Fehler. |
| SDK auf 0.3.286 heben | Großer Versionssprung. Ob 0.3.x stdin-Fehler behandelt, ist ungeprüft (NZ-01). |
| Patch in `node_modules` (patch-package) | Neue Abhängigkeit (ER-02) und geht beim Upgrade verloren. |

#### Architektur-Auswirkung

<!-- leser: agent -->

- **Nein:** bleibt innerhalb von architecture.md §2 (Backend, Claude Code SDK). Keine AR-Regel berührt.

### 4. Änderungen

<!-- leser: agent -->

| # | Datei / Komponente | Art | Was | Herkunft |
|---|---|---|---|---|
| 1 | `ui/src/server/utils/sdk-spawn.ts` | neu | `createSdkSpawner(onStderr?)` | AK-01 |
| 2 | `ui/src/server/utils/sdk-call-options.ts` | ändern | `onStderr`-Parameter, `spawnClaudeCodeProcess` in der Rückgabe | AK-01, AK-04 |
| 3 | `ui/src/server/services/finding-aggregator.ts` | ändern | stderr-Puffer, stderr in Fehler und Warnung | AK-02, AK-03 |
| 4 | `ui/src/server/services/external-reviewer.ts` | ändern | `stderr:` → `onStderr` über `buildSdkCallOptions` | AK-01, AK-04 |
| 5 | `ui/src/server/services/prompt-template-extractor.ts` | ändern | `spawnClaudeCodeProcess: createSdkSpawner()` | AK-01 |
| 6 | `ui/tests/unit/sdk-spawn.test.ts` | neu | echter Kindprozess: frühes Ende beim Schreiben, stderr-Weitergabe | AK-01 |
| 7 | `ui/tests/unit/finding-aggregator.test.ts` | ändern | Fall: Spawner aus den Optionen startet ein sterbendes Kind → `llm-error`, Log enthält stderr | AK-02, AK-03 |
| 8 | `ui/tests/unit/sdk-call-options.test.ts` | ändern | `spawnClaudeCodeProcess` ist gesetzt | AK-01 |
| 9 | `ui/tests/unit/external-reviewer.test.ts` | ändern | Optionen tragen `spawnClaudeCodeProcess`, kein `stderr`; stderr erscheint in der Fehlermeldung | AK-04 |

**Nicht betroffen (ausdrücklich):** `specwright/manifest.tsv` (`ui/` wird nicht installiert), `docs/architecture.md`, die Rückfall-Logik der Plan-Review, das Cloud-Terminal.

### 5. Verbindungen

<!-- leser: agent -->

| Von | Nach | Art | Schnittstelle | Nachweis (Befehl) | Teil |
|---|---|---|---|---|---|
| `sdk-call-options.ts` | `sdk-spawn.ts` | Import | `createSdkSpawner` | `grep -n "createSdkSpawner" ui/src/server/utils/sdk-call-options.ts` | — |
| `prompt-template-extractor.ts` | `sdk-spawn.ts` | Import | `createSdkSpawner` | `grep -n "createSdkSpawner" ui/src/server/services/prompt-template-extractor.ts` | — |
| Aggregator, Reviewer | SDK `query()` | Option | `spawnClaudeCodeProcess` | Tests #7, #9 | — |

- [x] Jede neue Komponente hat mindestens eine Verbindung.
- [x] Jeder Nachweis ist ein ausführbarer Befehl.

### 6. Reihenfolge der Arbeit

<!-- leser: agent -->

0. Lesende Vorprüfung: weitere `claudeQuery`-Aufrufer → `grep -rn "claude-agent-sdk" ui/src/server` (erwartet: 3 Dateien).
1. Tests #6–#9 schreiben, Fehlschlag bestätigen (`npx vitest run` auf die vier Dateien).
2. Änderungen #1–#5 → dieselben Tests grün, `npx tsc --noEmit`.
3. Verbindungen nachweisen (Abschnitt 5).
4. `bash scripts/verify.sh` grün.

### 7. Zerlegung

<!-- leser: agent -->

#### Variante A — nicht zerlegbar, eine Sitzung

<!-- leser: agent -->

5 kleine, ineinandergreifende Änderungen an einer gemeinsamen Schnittstelle.

### 8. Tests und Nachweis

<!-- leser: agent -->

| AK / FA | Test | Datei | Art |
|---|---|---|---|
| AK-01 | Kind endet sofort, 1 MB wird in stdin geschrieben → kein unbehandelter Fehler, `exit` kommt | `ui/tests/unit/sdk-spawn.test.ts` | Unit (echter Prozess) |
| AK-01 | `buildSdkCallOptions` liefert `spawnClaudeCodeProcess` | `ui/tests/unit/sdk-call-options.test.ts` | Unit |
| AK-02, AK-03 | gemocktes `query()` startet über den übergebenen Spawner ein Kind, das auf stderr schreibt und mit 1 endet → `fallbackReason: 'llm-error'`, Warnung enthält den stderr-Text | `ui/tests/unit/finding-aggregator.test.ts` | Unit (echter Prozess) |
| AK-04 | Reviewer-Optionen ohne `stderr`, mit Spawner; stderr aus dem Spawner landet in der Fehlermeldung | `ui/tests/unit/external-reviewer.test.ts` | Unit |

- **Verify-Befehl:** `bash scripts/verify.sh`. Die Ausgabe wird im PR zitiert. CI ist die Wahrheit.
- **Angeschlossen (E2E-Pfad):** Plan-Review mit mindestens 2 Reviewern im Branch-Backend (Port 3111), Aggregator läuft durch, `cluster call success` im Log. Der Absturzpfad selbst ist nur im Unit-Test mit echtem Kindprozess reproduzierbar, weil der Auslöser (warum das Kind stirbt) unbekannt ist.
- **Bugfix:** Test zuerst, Fehlschlag bestätigt, dann Fix.

### 9. Risiken

<!-- leser: mensch -->

| Risiko | Wahrscheinlichkeit | Wirkung | Gegenmaßnahme | Wer merkt es |
|---|---|---|---|---|
| Eigener Spawner weicht vom SDK ab (env, cwd, signal) | niedrig | mittel | Spiegelt `spawnLocalProcess` 1:1; E2E-Review im Branch-Backend | Michael: Reviews nur noch im Rückfall |
| Prüfung des Programmpfads entfällt: Mit eigenem Spawner prüft das SDK nicht mehr, ob die `cli.js` existiert (`sdk.mjs:7802–7807`) | niedrig | niedrig | Bei fehlender Datei kommt ein Spawn-`error` statt einer klaren Meldung. Der catch-Pfad bleibt gleich. | Log |
| stderr enthält Geheimnisse (z. B. Token in einer Fehlermeldung) | niedrig | mittel | Nur auf die Konsole des eigenen Backends, auf 800 Zeichen gekürzt, wie heute beim Reviewer | — |

### 10. Manuelle Schritte

<!-- leser: mensch -->

| Schritt | Wer | Wann | Erledigt |
|---|---|---|---|
| Nach dem Merge das lokale Backend neu starten (`cd ui && npm run dev:backend`); beim nächsten Aggregator-Fehler die `stderr:`-Zeile im Log ansehen | Michael | nach Merge | [ ] |

### 11. Schätzung

<!-- leser: mensch -->

1–2 h. Unsicher ist nur das Zeitverhalten des echten Kindprozesses im Test, der auf jedem Rechner deterministisch laufen muss.

### 12. Review des Plans

<!-- leser: mensch -->

| Finding | Quelle | Entscheidung | Änderung am Plan |
|---|---|---|---|
| Mit eigenem Spawner fällt die SDK-`stderr`-Option des Reviewers still weg | Self | angenommen: stderr läuft über `onStderr`, AK-04 sichert das | §3, #4, #9 |
| Extraktor hat dasselbe Absturzrisiko | Self | angenommen: Spawner auch dort | #5 |

**Minimalinvasiv geprüft:** Kein globaler Handler, kein Upgrade. Die Rückfall-Logik bleibt. Die einzige neue Datei ist der Spawner.

**Abgleich Mensch/Agent:** „In einfachen Worten", §9, §10, §12 gegen §2–§8 gelesen am 2026-10-01: ohne Befund.

### 13. Definition of Done

<!-- leser: agent -->

- [ ] Jede AK aus Abschnitt 8 hat einen grünen Test.
- [ ] Alle Nachweise aus Abschnitt 5 ausgeführt und im PR zitiert.
- [ ] E2E-Pfad läuft (Abschnitt 8).
- [ ] `verify` grün, Ausgabe im PR, und PR-Checks grün.
- [ ] Abweichungen in Abschnitt 14 eingetragen.
- [ ] 2x-Regel-Check.
- [ ] Abschlussbericht endet mit „Für das Board".

### 14. Abweichungen bei der Umsetzung

<!-- leser: mensch -->

| Datum | Abweichung | Grund | Auswirkung auf Abschnitt |
|---|---|---|---|
| — | — | — | — |
