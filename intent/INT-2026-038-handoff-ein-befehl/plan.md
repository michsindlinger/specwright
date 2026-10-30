# Plan: Sitzungswechsel per Handoff in einem Schritt

> **Intent:** `intent.md` (INT-2026-038) · **Spec:** `spec.md`
> **Status:** freigegeben
> **Erstellt:** 2026-10-29 im Plan Mode · **Freigabe:** Michael (Product Owner), 2026-10-30
> **Pflichtinput gelesen:** `docs/architecture.md` (Stand 9b8d8c8), `CLAUDE.md`, `docs/security.md`
> **Format:** 2.3

## In einfachen Worten

<!-- leser: mensch -->

**Worum geht es?** Wenn eine Claude-Sitzung im Terminal der Web-UI zu voll wird, schreibst du heute ein Übergabe-Protokoll (das „Handoff"), leerst die Sitzung und lässt das Protokoll in der leeren Sitzung wieder einlesen. Das sind drei Eingaben nacheinander, und zwischen ihnen musst du jeweils warten. Künftig reicht ein Knopf in der Kopfleiste des Terminals oder der Befehl `/handoff-weiter`.

**Was ändert sich?** Neben dem bekannten „In VS Code öffnen"-Symbol erscheint in Claude-Sitzungen ein Handoff-Knopf. Ein Druck darauf (oder `/handoff-weiter` getippt) lässt Claude das Handoff schreiben. Sobald Claude damit fertig ist, prüft die Web-UI, ob wirklich eine neue Handoff-Datei entstanden ist. Nur dann leert sie die Sitzung und gibt den Einlese-Befehl für genau diese Datei ein, mit dem Zusatz „nur lesen". Die neue Sitzung zeigt eine Kurzfassung und wartet auf dich. Geht unterwegs etwas schief, bleibt die alte Sitzung mit ihrem ganzen Verlauf stehen, und über dem Terminal erscheint eine Zeile „Nicht gewechselt: Ursache — nächster Schritt". Während der Wechsel läuft, ist der Knopf gesperrt und zeigt das an. In Shell- und Codex-Sitzungen gibt es den Knopf nicht. Außerdem kommen die drei Handoff-Befehle mit Specwright in jedes Projekt und auf den Cloud-Host.

**Wie wird das gemacht?** Die Web-UI kann das Wichtigste schon: Beim „Nächsten Schritt" eines Vorhabens leert sie eine Sitzung, wartet auf das Signal, dass Claude wirklich eine neue Unterhaltung begonnen hat, und tippt erst dann den nächsten Befehl. Vor jedem Tippen schaut sie auf den Bildschirm, ob die Sitzung wartet, kein Dialog offen ist und die Eingabezeile leer ist. Genau diesen Ablauf nutzt der Handoff-Wechsel wieder, nur mit einem anderen Befehl am Ende (`ui/src/server/services/vorhaben-service.ts:1098-1145`).

Neu ist ein kleiner Merkzettel im Server: „In Sitzung X läuft gerade ein Wechsel, ausgelöst um 14:03". Er entsteht, sobald du `/handoff-weiter` abschickst (getippt oder per Knopf; Claude meldet jede abgeschickte Eingabe an die Web-UI). Wenn Claude meldet „Runde fertig", schaut der Server im Ordner `.claude/handoffs/` der Sitzung nach einer Datei, die nach 14:03 geschrieben wurde. Den Dateinamen nimmt er nicht aus Claudes Antwort, sondern sucht selbst, damit niemand ihm einen fremden Pfad unterschieben kann. Der Merkzettel liegt nur im Arbeitsspeicher; startet der Server neu, ist der Wechsel abgebrochen und es passiert nichts mehr. Nach 10 Minuten ohne fertige Runde bricht der Wechsel ebenfalls ab.

Der Knopf selbst tippt nur `/handoff-weiter` ein, so als hättest du es getippt. Es gibt also nur einen Ablauf, der getestet werden muss.

`/handoff-weiter` ist ein neuer kleiner Skill: „Schreib ein Handoff wie `/session-handoff`, dann melde: in der Web-UI geht es automatisch weiter, sonst bitte `/clear` und `/start-from-handoff` von Hand." Außerhalb der Web-UI leert also nichts. Die beiden bekannten Skills `session-handoff` und `start-from-handoff` kommen unverändert ins Repo und werden über die Lieferliste (das Manifest) in Projekte installiert. Auf dem Cloud-Host kopiert die Einrichtung alle drei aus dieser einen Quelle in den Nutzerordner des Dienstes; die alte, veraltete Cloud-Kopie (sie gab das Handoff nur zum Abschreiben aus) wird gelöscht. So entschieden von dir am 2026-10-29.

**Was kann schiefgehen?** Erstens: Claude Code bevorzugt bei gleichnamigen Skills die Kopie im persönlichen Ordner vor der im Projekt. Am Mac liegen deine eigenen, inhaltsgleichen Kopien, das schadet nicht. Ein Probelauf im Bau prüft die Reihenfolge. Zweitens: Der unveränderte `start-from-handoff` sagt „nimm die neueste Datei"; der Einlese-Befehl nennt aber eine bestimmte Datei. Claude folgt dem genannten Namen sehr wahrscheinlich, so wie heute schon dem Zusatz „nur lesen". Eine Stichprobe prüft das. Fast immer ist die genannte Datei ohnehin die neueste. Drittens: Brichst du die Handoff-Runde mit Esc ab, meldet Claude vielleicht kein „Runde fertig". Dann endet der Wechsel, sobald du etwas anderes eingibst, spätestens nach 10 Minuten; geleert wird in keinem Fall. Zurückdrehen geht über das Zurücknehmen der PR; Daten werden nicht verändert.

**Was musst du entscheiden?** Nichts mehr, Freigabe reicht. Die Frage zur Cloud-Kopie hast du schon beantwortet: aus der Repo-Quelle kopieren.

## Details

<!-- leser: mensch -->

### 1. Kurzfassung

<!-- leser: mensch -->

Ein Merker je Sitzung in `VorhabenService` (nur Arbeitsspeicher) verknüpft drei vorhandene Signale: `session.prompt-text` (Auslöser `/handoff-weiter`), `stop` (Runde fertig) und den bestehenden `clearAndPaste` (Leeren mit Bestätigung über die neue Gesprächskennung, dann Einlese-Befehl). Neu sind eine kleine Dateisuche, ein Knopf `aos-handoff-knopf` neben `aos-vscode-knopf`, eine WS-Nachricht `vorhaben:handoff.start`, drei Skills im Manifest und die Umstellung der Cloud-Einrichtung auf die Repo-Quelle.

### 2. Ausgangslage im Code

<!-- leser: agent -->

| Bereich | Heute (Datei:Zeile) | Bedeutung für dieses Vorhaben |
|---|---|---|
| Leeren + Befehl | `ui/src/server/services/vorhaben-service.ts:1098-1145` `clearAndPaste` (Maschinen-Lock, `screenCheck('strict')` vor jedem Paste, `waitForNewConversation` mit `CLEAR_WAIT_MS`) | wiederverwenden 1:1, erfüllt AR-08 [Certain] |
| Getippte Befehle | `vorhaben-service.ts:1310` `onPromptText` (aus `UserPromptSubmit`-Hook, `session.prompt-text`), `V4_COMMAND_RE` :271 | gleiche Quelle für `/handoff-weiter` [Certain] |
| Rundenende | `vorhaben-service.ts:1260` `onAgentEvent('stop'/'stop-failure')`; Vorbild `deliverFirstInput` :1596 | Anschluss des Merkers [Certain] |
| Sitzungsende | `vorhaben-service.ts:1290` `onSessionClosed` | Merker löschen |
| Neue Gesprächskennung | `vorhaben-service.ts:1197` `onHookContext` → `clearWaiters`, `setSessionContext` | Zuordnung bleibt, nur Kennung aktualisiert (FA-15) [Likely, Test] |
| Fehlertexte | `vorhaben-service.ts:1147` `grundText`, `SEND_REASON_TEXT` :304, `eingabeNichtLeerText` | wiederverwenden |
| Zustand an Clients | `vorhaben-service.ts:427` `getState`, `ui/src/shared/types/vorhaben.protocol.ts:454` `VorhabenState` | Feld `handoffWechsel` ergänzen (AR-05) |
| WS-Anfragen | `ui/src/server/services/vorhaben-handler.ts:61,277` (Muster `vorhaben:session.resume`), Client `ui/frontend/src/services/vorhaben.service.ts:224` | Muster für `vorhaben:handoff.start` |
| Hinweis am Terminal | `cloud-terminal-manager.ts:1216` emit `session.notice` → `websocket.ts:2249` → `aos-terminal-session.ts:480` `notices` | Abbruchzeile „Nicht gewechselt: …" ohne neues Frontend-Element [Certain] |
| Knopf-Vorbild | `ui/frontend/src/components/terminal/aos-vscode-knopf.ts` (eigener Shadow-Root, `static styles`); eingebaut in `aos-terminal-session.ts:811` (Kopf, Einzelansicht) und `aos-cloud-terminal-sidebar.ts:1817` (Pane-Kopf); Kopf im `compact`-Modus (Handy) ausgeblendet `aos-terminal-session.ts:331` | gleiches Muster; NZ-05 automatisch erfüllt. Falle: theme.css erreicht Shadow-Roots nicht (CLAUDE.md) → `static styles` |
| Claude-Erkennung | Frontend kennt den Provider nicht; Hooks gibt es nur in Claude-Sitzungen (architecture.md §2) | Knopf nur bei `terminalType !== 'shell'` und `agentStatus` bekannt (≠ `unknown`); Backend: nur mit `claudeSessionId` [Likely] |
| Skills | nur `~/.claude/skills/{session-handoff,start-from-handoff}/SKILL.md` (Mac, global); Cloud: `cloud-deploy/claude-user-skills/session-handoff/SKILL.md` (alte Fassung), Kopierschleife `setup-ui-cloud.sh:236-253` | Repo-Quelle `.claude/skills/…`, Manifest-Muster `specwright/manifest.tsv:100` (`skill project`) |
| Guards | `scripts/check-manifest.sh:18` (`.claude/skills` ist Lieferverzeichnis; `cloud-deploy/` nicht → kein `removed.tsv`-Eintrag), `scripts/test-installers.sh:48` (T1 Skills) | T1 um drei Skills erweitern |
| `.gitignore` | keine Zeile `.claude/handoffs/` [Certain] | ergänzen (security.md §5, öffentliches Repo) |
| Tests | `ui/tests/unit/vorhaben-service-naechster-schritt.test.ts` (Fakes für Lock, Bildschirm, Hook-Kontext), `vscode-knopf-einbau.test.ts`, `aos-vscode-knopf.test.ts` | Fakes wiederverwenden |
| Software Factory | `SPECWRIGHT_FACTORY_DIR` gesetzt, keine `~/.factory/*/factory.yaml` mit `michsindlinger/specwright` | kein Schnitt [Certain] |

### 3. Entwurf

<!-- leser: agent -->

#### Ansatz

<!-- leser: agent -->

**Merker** in `VorhabenService`: `private readonly handoffWechsel = new Map<string, { seit: number; phase: 'runde' | 'wechsel'; frist: NodeJS.Timeout }>()`.

- **Auslöser getippt** (`onPromptText`): `HANDOFF_COMMAND_RE = /^\s*\/handoff-weiter\b/` trifft, Sitzung live, `claudeSessionId` gesetzt, kein Merker → Merker `phase: 'runde'`, `seit = now()`, Frist `HANDOFF_FRIST_MS = 10 * 60_000` (AN-S03), `broadcastState`. Merker schon da (Knopf) → nichts. Anderer Prompt bei `phase: 'runde'` → Abbruch „neue Eingabe" (fängt Esc ohne Stop ab).
- **Auslöser Knopf** (`public async starteHandoff(sessionId)`): Sitzung live, `claudeSessionId` gesetzt (sonst `SESSION_NOT_CLAUDE`), kein Merker (sonst `HANDOFF_LAEUFT` „Wechsel läuft bereits", FA-12). Unter `withMachineWrite`: `screenCheck('strict')`, Status-Recheck synchron, Merker setzen, Paste `/handoff-weiter`, `settleEnter`. Bei Ablehnung: Notice „Nicht gestartet: Grund" (FA-03) und `VorhabenError`. Merker vor dem Paste → Doppelklick sofort abgewiesen.
- **Rundenende** (`onAgentEvent` `stop`/`stop-failure`, `phase === 'runde'`): `phase = 'wechsel'`, Frist löschen, `void this.handoffAbschliessen(id)`.
- **`handoffAbschliessen`**: `findeNeuesHandoff(live.effectiveCwd, seit)` → keine Datei: Abbruch „kein neues Handoff gefunden — `/session-handoff` von Hand ausführen" (FA-07). Sonst `clearAndPaste(sessions, id, '/start-from-handoff .claude/handoffs/<name> nur lesen', () => this.handoffWechsel.get(id)?.phase === 'wechsel', befund)`; `true` → Merker weg; sonst Abbruch mit `grundText(...)` bzw. „Leeren nicht bestätigt — Handoff mit `/start-from-handoff` von Hand einlesen" (FA-08, FA-09). Höchstens drei Eingaben je Wechsel (Knopf-Befehl, `/clear`, Einlese-Befehl), jede nach frischer Bildschirmprüfung (AR-08).
- **Abbruch** (eine Funktion): Merker + Frist löschen, `sessions.notice?.(id, 'warn', 'Nicht gewechselt: …')`, `broadcastState`. `onSessionClosed`: Merker still löschen.
- **Dateisuche** `ui/src/server/services/handoff-datei.ts` (rein, `fs/promises`): `findeNeuesHandoff(cwd, seitMs): Promise<string | undefined>` — `readdir(<cwd>/.claude/handoffs)`, Name `^handoff-[0-9A-Za-z_-]+\.md$`, `lstat().isFile()`, `mtimeMs >= seitMs`, jüngste; `realpath` muss unter `realpath(dir)` liegen (Spec §7). Name aus fester Regex → sicher im Paste.
- **Zustand**: `VorhabenState.handoffWechsel: string[]` (Sitzungskennungen) aus `getState`.
- **Notice-Weg**: `VorhabenSessionSource.notice?(sessionId, level, text)`; `CloudTerminalManager.notice()` = `this.emit('session.notice', …)` (gleicher Event wie :1216).
- **Knopf** `aos-handoff-knopf.ts`: Shadow DOM, `static styles` wie `aos-vscode-knopf`; Eigenschaft `session` (`id`, `terminalType`, `agentStatus`, `status`); sichtbar nur bei `status === 'active'`, `terminalType !== 'shell'`, `agentStatus` ≠ `unknown`/leer (FA-01); `disabled` + Titel „Wechsel läuft …" wenn `vorhabenClientService.state?.handoffWechsel` die Kennung enthält; Klick → `vorhabenService.handoffStarten(id)`; Fehlermeldung kommt als Notice vom Server, Client loggt nur. Einbau neben `aos-vscode-knopf` in `aos-terminal-session.ts:811` und `aos-cloud-terminal-sidebar.ts:1817` (nicht im Tab; ein Knopf je sichtbarem Kopf).
- **Skills**: `.claude/skills/session-handoff/SKILL.md` und `.claude/skills/start-from-handoff/SKILL.md` = Inhalt der Mac-Fassungen unverändert (FA-17); `.claude/skills/handoff-weiter/SKILL.md` neu: Skill `session-handoff` ausführen (Datei-Fassung), Ausgabe Pfad plus „In der Web-UI leert das System die Sitzung und liest das Handoff ein. Ohne Web-UI: `/clear`, dann `/start-from-handoff nur lesen`." (FA-05, FA-19). Keine Hosts, Pfade, Nutzer (FA-20).
- **Cloud** (Entscheidung Michael 2026-10-29, ersetzt AN-S02): `cloud-deploy/claude-user-skills/session-handoff/` löschen; `setup-ui-cloud.sh` kopiert zusätzlich `$SPECWRIGHT_UI_HOME/.claude/skills/{session-handoff,start-from-handoff,handoff-weiter}` mit derselben `rm -rf`+`cp -R`-Logik in `$SKILLS_DEST` (überschreibt die alte Kopie, FA-18).

#### Verworfene Alternativen

<!-- leser: agent -->

| Alternative | Warum nicht |
|---|---|
| Eigener Dienst `HandoffService` mit eigenem Clear-Ablauf | `clearAndPaste`, `screenCheck`, `waitForNewConversation`, `clearWaiters` sind privat in `VorhabenService` und hängen am selben Hook-Kontext; eine Kopie wäre ein zweiter AR-08-Pfad. Merker passt in ~120 Zeilen dort hinein. |
| Dateiname aus Claudes Antwort (Stop-`preview`) übernehmen | Spec §7: Pfad käme aus der Sitzung; Server sucht selbst. |
| Einlesen als Freitext („Lies Datei X, beginne nichts") statt `/start-from-handoff … nur lesen` | Spec §8: kein neues Format für „nur lesen". |
| `start-from-handoff` um ein Datei-Argument erweitern | FA-17/OF-02: Inhalt unverändert; am Mac gilt ohnehin die globale Kopie. Argument wird wie „nur lesen" vom Modell befolgt (Risiko R2, Stichprobe). |
| Wechsel-Zustand im Store (überlebt Neustart) | Spec §4: Neustart bricht ab; flüchtig reicht, keine Zeile in §3 architecture.md. |
| Knopf mit eigenem Ablauf statt Befehl | AN-S01: eine Folge, eine Prüfstrecke. |
| Cloud-Kopie nur löschen (AN-S02) | `/session-handoff` fiele in nicht aktualisierten Projekten auf dem Cloud-Host weg (AK-08 „wie bisher"); Michael, 2026-10-29. |

#### Architektur-Auswirkung

<!-- leser: agent -->

- **Ja, nur Beschreibung** — `docs/architecture.md` §2 Backend (Handoff-Wechsel: Merker im Speicher, Auslöser `UserPromptSubmit` `/handoff-weiter`, Ende über Stop, `clearAndPaste` wiederverwendet, Notice bei Abbruch, `vorhaben:handoff.start`) und §2 Frontend (`aos-handoff-knopf`) plus Zeile im Änderungsprotokoll, **in dieser PR**. Keine AR-Änderung: AR-01 (Manifest), AR-05 (Zustand im Backend-Broadcast), AR-06 (Skills funktionieren ohne UI, FA-19), AR-08 (feste Zahl Eingaben, je Bildschirmprüfung) eingehalten; ADR-0004 (kein Transkript) unverändert. ADR: nein (keine Datenhaltung, kein Installer-Bruch, kein MCP-Startmodell).
- security.md §6: neuer WS-Endpunkt (nur `sessionId`, gegen Live-Sitzungen geprüft, gleiche Auth wie übrige `vorhaben:*`); Dateizugriff nur lesend unter `<cwd>/.claude/handoffs`, `realpath`-geprüft; keine personenbezogenen Daten neu; kein externes System.

### 4. Änderungen

<!-- leser: agent -->

| # | Datei / Komponente | Art | Was | Herkunft |
|---|---|---|---|---|
| 1 | `ui/src/server/services/handoff-datei.ts` | neu | `findeNeuesHandoff`, `HANDOFF_COMMAND_RE`, `einleseBefehl(name)` | FA-06, FA-10, AN-S05 |
| 2 | `ui/src/server/services/vorhaben-service.ts` | ändern | Merker, `starteHandoff`, `handoffAbschliessen`, Abbruch, Anschluss in `onPromptText`/`onAgentEvent`/`onSessionClosed`, `getState.handoffWechsel`, `VorhabenSessionSource.notice?` | FA-02–FA-04, FA-06–FA-15 |
| 3 | `ui/src/server/services/cloud-terminal-manager.ts` | ändern | `notice(sessionId, level, text)` emittiert `session.notice` | FA-03, FA-07 |
| 4 | `ui/src/server/services/vorhaben-handler.ts` | ändern | `vorhaben:handoff.start` → `starteHandoff`, Antwort `vorhaben:handoff-started` / `vorhaben:error` | FA-02 |
| 5 | `ui/src/shared/types/vorhaben.protocol.ts` | ändern | `VorhabenState.handoffWechsel`, Nachrichtentypen, Fehlercodes `HANDOFF_LAEUFT`, `SESSION_NOT_CLAUDE` (falls nicht vorhanden) | FA-12 |
| 6 | `ui/frontend/src/services/vorhaben.service.ts` | ändern | `handoffStarten(sessionId)` | FA-02 |
| 7 | `ui/frontend/src/components/terminal/aos-handoff-knopf.ts` | neu | Knopf (sichtbar/gesperrt/Klick) | FA-01, §6 Spec |
| 8 | `aos-terminal-session.ts`, `aos-cloud-terminal-sidebar.ts` | ändern | Knopf neben `aos-vscode-knopf` | FA-01 |
| 9 | `.claude/skills/{session-handoff,start-from-handoff,handoff-weiter}/SKILL.md` | neu | Skills (zwei unverändert kopiert, einer neu) | FA-05, FA-16, FA-17, FA-19, FA-20 |
| 10 | `specwright/manifest.tsv` | ändern | drei Zeilen `skill	project	…` | FA-16, AR-01 |
| 11 | `scripts/test-installers.sh` | ändern | T1 prüft die drei Skills | FA-16 |
| 12 | `setup-ui-cloud.sh`, `cloud-deploy/claude-user-skills/session-handoff/` | ändern / löschen | Kopie aus Repo-Quelle, alte Kopie weg | FA-18 |
| 13 | `.gitignore` | ändern | `.claude/handoffs/` | security.md §5 |
| 14 | `docs/architecture.md` | ändern | §2, Änderungsprotokoll | §3 |
| 15 | `VERSION`, `install.sh` `FRAMEWORK_VERSION`, `CHANGELOG.md` | ändern | 4.8.0 (neue Lieferdateien, kein Formatwechsel) | Memory „Version bei jeder Liefer-PR" |
| 16 | `intent/INT-2026-038-handoff-ein-befehl/design/handoff-knopf.svg` | neu (mit dem Plan, AN-S04) | Mock: Kopfleiste mit Knopf bereit / „Wechsel läuft …" / Abbruchzeile | Spec §6 |
| 17 | Tests (§8) | neu | | |

**Nicht betroffen (ausdrücklich):** `aos-terminal-tabs.ts` (kein Knopf im Tab), mobile Tastenleiste (NZ-05), `claude-hooks.ts` (Mapping unverändert), `vorhaben-state.ts`/Store (nichts persistiert), globale Skills unter `~/.claude/skills/` am Mac, Handoff-Format (NZ-02), Kanban-MCP.

### 5. Verbindungen

<!-- leser: agent -->

| Von | Nach | Art | Schnittstelle | Nachweis (Befehl) | Teil |
|---|---|---|---|---|---|
| `aos-handoff-knopf` | `vorhaben.service.ts` | Aufruf | `handoffStarten(id)` | `grep -n "handoffStarten" ui/frontend/src/components/terminal/aos-handoff-knopf.ts` | — |
| `vorhaben.service.ts` | `vorhaben-handler.ts` | WS | `vorhaben:handoff.start` | `grep -rn "vorhaben:handoff.start" ui/src ui/frontend/src` | — |
| `vorhaben-handler.ts` | `VorhabenService.starteHandoff` | Aufruf | | Test `vorhaben-service-handoff.test.ts` | — |
| `onPromptText` / `onAgentEvent` | Merker → `clearAndPaste` | intern | `/handoff-weiter`, `stop` | Test (E2E-Fall im Service-Test) | — |
| `VorhabenService` | `handoff-datei.ts` | Import | `findeNeuesHandoff` | `grep -n "handoff-datei" ui/src/server/services/vorhaben-service.ts` | — |
| `VorhabenService` | `CloudTerminalManager.notice` → `session.notice` → `aos-terminal-session` | Event | `notice?` | `grep -n "notice(" ui/src/server/services/cloud-terminal-manager.ts`; Test | — |
| `getState` | `aos-handoff-knopf` | Broadcast | `handoffWechsel` | Knopf-Test „gesperrt" | — |
| `aos-terminal-session`, Sidebar | `aos-handoff-knopf` | Einbau | `<aos-handoff-knopf>` | `grep -n "aos-handoff-knopf" ui/frontend/src/components/terminal/*.ts` | — |
| Manifest | Installer | Lieferung | 3 Zeilen | `bash scripts/check-manifest.sh`, `bash scripts/test-installers.sh` | — |
| `setup-ui-cloud.sh` | `.claude/skills/*handoff*` | Kopie | Pfade | `bash -n setup-ui-cloud.sh`; `grep -n "handoff" setup-ui-cloud.sh` | — |

- [x] Jede neue Komponente hat mindestens eine Verbindung.
- [x] Jeder Nachweis ist ein ausführbarer Befehl.

### 6. Reihenfolge der Arbeit

<!-- leser: agent -->

0. Lesende Vorprüfung: Konsumenten von `VorhabenState` (`grep -rn "VorhabenState" ui/`; Test-Fixtures mit vollständigem Objekt brechen bei Pflichtfeld → Feld optional oder Fixtures nachziehen); `VorhabenSessionSource`-Fakes (neues Feld optional); Probe Skill-Reihenfolge: Projekt-Skill gleichen Namens mit Markertext neben globalem, `claude -p "/session-handoff"` im Probe-Ordner → welche Fassung antwortet (Ergebnis in §14); `UserPromptSubmit`-`prompt` bei Skill-Slash-Befehl ist der getippte Text (Hook-Log einer Probesitzung) → prüfbar durch Notiz in §14.
1. Erste Scheibe: Skill `handoff-weiter` (+ zwei kopierte Skills) → getippter `/handoff-weiter` → Merker → Stop → Datei gefunden → `clearAndPaste` mit Einlese-Befehl; Abbruch-Notice. Durch Skill, Backend-Dienst und Terminal (Notice). Vorführbar: Service-Test „getippt → Stop → /clear → Einlese-Befehl" grün und manuell im Branch-Backend (Port 3111).
2. Verbreitern: Abbruchfälle (kein Handoff, Text in Zeile, Leeren nicht bestätigt, Frist, neue Eingabe, Sitzung zu, Doppelauslöser), `handoffWechsel` im State.
3. Knopf: WS-Nachricht, Client-Methode, `aos-handoff-knopf`, Einbau, Mock-Abgleich.
4. Lieferung: Manifest, test-installers, setup-ui-cloud.sh, alte Cloud-Kopie weg, `.gitignore`, VERSION/CHANGELOG, architecture.md.
5. Verbindungen nachweisen (§5), `bash scripts/verify.sh`, E2E (§8).

### 7. Zerlegung

<!-- leser: agent -->

#### Variante A — nicht zerlegbar, eine Sitzung

<!-- leser: agent -->

Knopf, WS-Nachricht, Merker und Skill greifen ineinander (§5, 8 Verbindungen); Kontext ~90k unter der Grenze.

#### Karten für die Factory

<!-- leser: mensch -->

Kein Schnitt: keine Betriebsdatei für dieses Projekt.

### 8. Tests und Nachweis

<!-- leser: agent -->

Nahtstelle: öffentliche Methoden und Ereignisse von `VorhabenService` mit Fake-Sitzungsquelle (wie `vorhaben-service-naechster-schritt.test.ts`): `session.prompt-text`, `session.agent-event`, `session.hook-context`, `session.closed`, `starteHandoff`; Dateisystem echt (tmp-Ordner), Zeit per Fake-Timer. Eine Nahtstelle für alle Backend-FA.

| AK / FA | Nahtstelle (warum diese) | Test | Datei | Art |
|---|---|---|---|---|
| AK-02, FA-04, FA-06, FA-10, FA-15 | Service-Ereignisse (bestehend) | getippt → Stop mit neuer Datei → Pastes genau `/clear` und `/start-from-handoff .claude/handoffs/handoff-2026-10-29_14-03.md nur lesen`; Zuordnung des Vorhabens danach unverändert, Kennung neu | `ui/tests/unit/vorhaben-service-handoff.test.ts` | Integration |
| AK-01, FA-02 | `starteHandoff` | bereite Sitzung → Paste `/handoff-weiter`, Merker gesetzt, `handoffWechsel` im State | dto. | Integration |
| AK-05, FA-03 | `starteHandoff` | Bildschirm arbeitet / Dialog / Text → kein Paste, Notice „Nicht gestartet: …" | dto. | Integration |
| AK-04, FA-07 | Ereignisse | Stop ohne Datei / nur alte Datei → kein `/clear`, Notice „kein neues Handoff gefunden" | dto. | Integration |
| FA-08 | Ereignisse | nach Stop Text in Eingabezeile → kein `/clear`, Notice | dto. | Integration |
| AK-06, FA-09 | Ereignisse | keine neue Kennung binnen `CLEAR_WAIT_MS` → kein Einlese-Paste, Notice „Leeren nicht bestätigt" | dto. | Integration |
| FA-12 | `starteHandoff` zweimal | zweiter → `HANDOFF_LAEUFT`, ein Paste | dto. | Integration |
| FA-13 | Fake-Timer, `session.closed` | 10 min ohne Stop → Abbruch-Notice, kein `/clear`; Sitzung zu → still weg | dto. | Integration |
| FA-14 | Ereignisse | Stop ohne Merker / andere Prompts → kein Paste | dto. | Integration |
| AK-09, FA-01 | Knopf-Element | shell / `agentStatus` unknown → `hidden`; Claude aktiv → sichtbar; im State → `disabled` „Wechsel läuft …"; Klick ruft Client | `ui/tests/unit/aos-handoff-knopf.test.ts` | Unit (happy-dom) |
| FA-01 Einbau | Quelltext-Einbau wie `vscode-knopf-einbau.test.ts` | Kopf Einzelansicht + Pane-Kopf | `ui/tests/unit/handoff-knopf-einbau.test.ts` | Unit |
| FA-06/AN-S05, Sicherheit | `findeNeuesHandoff` | jüngste nach `seit`; Symlink nach außen ignoriert; fremder Name ignoriert; Ordner fehlt → undefined | `ui/tests/unit/handoff-datei.test.ts` | Unit |
| AK-08, FA-16 | Installer | Manifest-Guard + T1 | `scripts/check-manifest.sh`, `scripts/test-installers.sh` | Test |
| FA-17 | Diff | `diff ~/.claude/skills/session-handoff/SKILL.md .claude/skills/session-handoff/SKILL.md` leer, ebenso start-from-handoff | — | Review |
| FA-18 | Skript | `bash -n setup-ui-cloud.sh`; Lauf auf dem Host (§10) | — | Test + Stichprobe |
| AK-03, FA-11, FA-19, FA-05/AK-07 | echte Sitzung | E2E unten; nacktes Terminal `/handoff-weiter` | — | Stichprobe |
| FA-20 | grep | `grep -rniE "droplet|/var/lib|specwright@|cloud\.specwright" .claude/skills/*handoff*` leer | — | Review |

- **Verify-Befehl:** `bash scripts/verify.sh` → `verify: OK`, Ausgabe im PR. CI ist die Wahrheit; Bezugsliste nie kürzen.
- **Angeschlossen (E2E-Pfad):** Branch-Backend Port 3111 + Scratch-Projekt (Memory „Cloud-Terminal E2E via Playwright"); Claude-Sitzung (Trust-Dialog: erst Pfeil runter, dann Enter), etwas Kontext erzeugen, Knopf klicken → Handoff-Datei entsteht, `/clear`, Einlese-Befehl, Kurzfassung, Sitzung wartet, `git status` unverändert. Zweiter Lauf getippt `/handoff-weiter`. Ein Abbruch (Text in die Zeile tippen, bevor Stop) → Notice. Protokoll und Screenshots im PR.
- **UI:** Screenshot der Kopfleiste neben `design/handoff-knopf.svg`.

### 9. Risiken

<!-- leser: mensch -->

| Risiko | Wahrscheinlichkeit | Wirkung | Gegenmaßnahme | Wer merkt es |
|---|---|---|---|---|
| R1 Persönliche Skill-Kopie verdeckt Projektfassung | hoch (am Mac) | niedrig (inhaltsgleich) | Probe in Schritt 0; Cloud kopiert aus derselben Quelle | Michael, wenn er globale Kopie ändert |
| R2 `start-from-handoff` liest „neueste" statt genannter Datei | niedrig | niedrig (fast immer dieselbe) | Argument nennt Datei; Stichprobe | Michael in der Kurzfassung |
| R3 Esc löst keinen Stop aus → Wechsel hängt | mittel | niedrig (geleert wird nie) | neue Eingabe bricht ab, Frist 10 min | Michael (Knopf gesperrt bis dahin) |
| R4 Claude schreibt Handoff an anderen Ort (Unterordner als cwd) | niedrig | niedrig | Abbruch „kein neues Handoff" statt Leeren | Michael über Notice |
| R5 Merge löst Auto-Deploy aus, laufende Sitzungen auf dem Host werden neu gestartet | sicher bei Merge | mittel | Deploy-Gate besteht; Merge ist Michaels Schritt | Michael |

### 10. Manuelle Schritte

<!-- leser: mensch -->

| Schritt | Wer | Wann | Erledigt |
|---|---|---|---|
| PR mergen (löst Auto-Deploy der UI aus) | Michael | nach grünem CI | [ ] |
| Cloud-Einrichtung neu laufen lassen, damit die Skills im Nutzerordner landen: `sudo bash setup-ui-cloud.sh` im UI-Checkout des Hosts (Kopierschleife `setup-ui-cloud.sh:236-253`) | Michael | nach Deploy | [ ] |
| Stichprobe Cloud-Host: `/session-handoff` schreibt Datei, Knopf-Wechsel einmal durch | Michael | nach Einrichtung | [ ] |
| Projekte aktualisieren (`update-specwright.sh`), wenn die Skills dort projektweit gewünscht sind | Michael | bei Bedarf | [ ] |

### 11. Schätzung

<!-- leser: mensch -->

6–9 h. Unsicher: Verhalten von Esc/Stop und Skill-Reihenfolge (Probe), E2E mit echter Sitzung.

**Kontext für den Bau:** ~90k Tokens — Plan ~12k, zu lesende Dateien ~35k (vorhaben-service-Ausschnitte, Test-Fakes, Knopf, Handler), Änderungen ~25k, Prüfausgaben ~18k. Unter ~120k.

### 12. Review des Plans

<!-- leser: mensch -->

| Finding | Quelle | Entscheidung | Änderung am Plan |
|---|---|---|---|
| S1 Eigener Clear-Ablauf wäre zweiter AR-08-Pfad | Self | angenommen: `clearAndPaste` wiederverwenden | §3 |
| S2 Doppelklick zwischen Paste und Hook nicht abgedeckt | Self | angenommen: Knopf setzt Merker vor dem Paste | §3 |
| S3 Esc ohne Stop-Hook lässt Merker hängen | Self | angenommen: andere Eingabe bricht ab, Frist | §3, R3 |
| S4 Frontend kann Claude/Codex nicht unterscheiden | Self | angenommen: Hook-Signal (`agentStatus`/`claudeSessionId`) statt Provider-Regel | §2, §3 |
| S5 Neues Abbruch-Element im Frontend nötig? | Self | abgelehnt: bestehende `session.notice`-Zeile (`aos-terminal-session.ts:480`) reicht | §3 |
| S6 AN-S02 nimmt `/session-handoff` auf dem Cloud-Host in alten Projekten weg | Self | angenommen nach Rückfrage (Michael, 2026-10-29): Cloud kopiert aus Repo-Quelle | §3, In einfachen Worten |
| S7 `start-from-handoff` um Datei-Argument erweitern | Self | abgelehnt: FA-17 (Inhalt unverändert) | R2 |

**Minimalinvasiv geprüft:** wiederverwendet `clearAndPaste`, `screenCheck`, `waitForNewConversation`, `grundText`, Hook-Ereignisse, `session.notice`-Anzeige, Knopf-Muster von `aos-vscode-knopf`, Manifest-Muster, Cloud-Kopierschleife. Gestrichen: eigener Dienst, Persistenz, Knopf im Tab, eigene Fehleranzeige, Änderung an `start-from-handoff`.

**Abgleich Mensch/Agent:** „In einfachen Worten", §9, §10, §12 gegen §2–§8 gelesen am 2026-10-30: ohne Befund (Knopf nur im Kopf, Merker flüchtig, Cloud-Kopie aus Repo-Quelle, drei Eingaben je Wechsel stimmen überein)

### 13. Definition of Done

<!-- leser: agent -->

- [ ] Jede FA/AK aus Abschnitt 8 hat einen grünen Test.
- [ ] Alle Nachweise aus Abschnitt 5 ausgeführt und im PR zitiert.
- [ ] E2E-Pfad läuft (Abschnitt 8).
- [ ] `verify` grün, Ausgabe im PR — und PR-Checks grün.
- [ ] `docs/architecture.md` angepasst (§2, Änderungsprotokoll).
- [ ] Manuelle Schritte (Abschnitt 10) erledigt oder im PR als offen markiert.
- [ ] Abweichungen in Abschnitt 14.
- [ ] 2x-Regel-Check.
- [ ] Abschlussbericht nach R3, Block „Für das Board".

### 14. Abweichungen bei der Umsetzung

<!-- leser: mensch -->

| Datum | Abweichung | Grund | Auswirkung auf Abschnitt |
|---|---|---|---|
| — | — | — | — |
