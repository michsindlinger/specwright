# Plan: Review für Absicht und Plan aus dem Vorhaben-Ordner, automatisch und ausfallsicher

> **Intent:** `intent.md` (INT-2026-037) · **Spec:** `spec.md`
> **Status:** freigegeben
> **Erstellt:** 2026-10-27 im Plan Mode · **Freigabe:** Product Owner, 2026-10-27
> **Pflichtinput gelesen:** `docs/architecture.md` (Stand 9afa032), `CLAUDE.md`, `docs/security.md`
> **Format:** 2.2

## In einfachen Worten

<!-- leser: mensch -->

**Worum geht es?** Die Web-UI kann heute einen fertigen Plan an mehrere fremde KI-Modelle schicken, die ihn unabhängig voneinander prüfen („externes Review“). Das hat vier Lücken. Erstens wird nur der Plan geprüft, nie die Absicht – dabei lag die teuerste Fehlentscheidung der letzten Monate genau dort: eine Gesprächsansicht mit rund 2.250 Zeilen, die ein späteres Vorhaben wieder abbauen musste. Zweitens liest das Review eine Arbeitskopie des Plans statt der Datei, die am Ende im Repo landet. Drittens hält ein überlasteter Anbieter das ganze Review bis zu fünf Minuten auf, und wer ausfällt, wird nicht ersetzt. Viertens darf der Agent, der die Befunde bekommt, sie heute mit einem bloßen Gegenargument wegwischen.

**Was ändert sich?** Für dich: Sobald in einer UI-Sitzung eine neue Absicht als Entwurf geschrieben ist und die Sitzung auf dich wartet, startet das Review einmal von selbst. Die Prüfer bekommen einen eigenen Auftrag, der fragt: „Gibt es das schon? Was ist die kleinste Lösung? Was kann man streichen?“ Im Terminal-Tab siehst du je Prüfer, ob er bereit war, ausfiel (und warum) oder für wen er einsprang, und auf wie vielen Prüfern das Ergebnis beruht. Der Knopf im Tab heißt künftig „Absicht prüfen“ oder „Plan prüfen“ und funktioniert immer, nicht nur bei eingeschaltetem Auto-Review. In den Einstellungen kommen drei Dinge dazu: der Text des Absicht-Auftrags, die Ersatzreihe der Prüfer und ein Schalter „Absicht automatisch prüfen“. Für den Agenten: Er darf einen Befund nur noch mit einer Fundstelle ablehnen, sonst fragt er dich; Streich-Empfehlungen zur Absicht landen immer bei dir.

**Wie wird das gemacht?** Das Ganze baut auf dem bestehenden Plan-Review auf; es kommt kein neuer Dienst dazu.

- *Wann startet das Absicht-Review?* Die UI merkt heute schon, wenn eine Sitzung anhält, und liest danach die Vorhaben-Ordner neu ein. An dieser Stelle prüft sie künftig: Gehört die Sitzung zu einem Vorhaben, steht dessen Absicht auf „entwurf“, wurde die Datei nach dem Start der Sitzung geändert, ist der Schalter an und wurde diese Absicht noch nie automatisch geprüft? Nur dann startet das Review, und die Absicht bekommt sofort eine dauerhafte Marke „automatisch geprüft“ – wie ein Stempel, der auch einen Neustart überlebt.
- *Welcher Text wird geprüft?* Immer die Datei im Vorhaben-Ordner, so wie sie beim Start dort liegt. Beim Plan nur dann die Plan-Mode-Arbeitskopie, wenn im Ordner noch kein Plan liegt (das ist während `/plan` der Normalfall).
- *Ausfälle:* Vor dem Review bekommt jeder Prüfer eine Mini-Frage („antworte mit ok“, höchstens 15 Sekunden). Gleichzeitig werden auch die Ersatzprüfer gefragt, damit niemand zweimal warten muss. Wer nicht antwortet, wird durch den ersten bereiten Ersatz ersetzt, bevorzugt von einem Anbieter, der noch fehlt – wie ein Trainer, der vor dem Anpfiff schaut, wer fit ist, und von der Bank nachbesetzt. Das Ergebnis der Mini-Frage gilt fünf Minuten, damit nicht jedes Review neu fragt.
- *Übergabe in die Sitzung:* Das Ergebnis wird nur in eine leere Eingabezeile getippt, nachdem die UI den Bildschirm gelesen hat. Tippst du gerade, wartet es bis zum nächsten Halt. Die Prüfung dafür gibt es schon beim Knopf „Nächster Schritt“; sie wird wiederverwendet.
- *Regeln für den Agenten:* Sie stehen im Text, den er mit den Befunden bekommt, und zusätzlich in den Workflows `intent` und `plan`, damit sie auch ohne UI gelten. Die Absicht-Vorlage bekommt einen festen Abschnitt „Review-Entscheidungen“.
- *Standard-Prüfer:* Sonnet, Opus, MiniMax-M3, GLM-5.2. DeepSeek fliegt raus (kein Abo mehr). Ersatzreihe: Fable, MiniMax-M2.5, Haiku.

**Was kann schiefgehen?**

- Das automatische Review startet zu früh, etwa wenn du beim Schreiben der Absicht Esc drückst. Dann wird der halbe Text geprüft, und ein zweites automatisches gibt es nicht; du startest es per Knopf neu. Das ist so gewollt (Spec §4).
- Ein Anbieter meldet einen Fehler so, dass die UI ihn nicht einordnen kann. Dann steht nur „Fehler“ mit seiner Meldung in der Anzeige. Bei MiniMax lässt sich ein falscher Modellname gar nicht erkennen, weil MiniMax trotzdem „ok“ antwortet (gemessen am 27.10.).
- Die Mini-Fragen kosten ein paar zusätzliche Anfragen (bis zu sieben je fünf Minuten). Bei GLM zählen sie gegen das Anfrage-Limit.
- Stört der Automatismus, schaltest du ihn in den Einstellungen ab. Der Knopf bleibt. Das ist auch der Rückweg, wenn der Versuch nach drei Vorhaben nichts gebracht hat.

**Was musst du entscheiden?** Drei Auslegungen der Spec. Alle drei haben einen Vorschlag; Freigabe des Plans heißt Zustimmung.

1. *Auslöser ohne neuen Hook.* Die Absicht sah vor, Claude Code jede Dateiänderung an die UI melden zu lassen. Der Plan kommt ohne diese Meldung aus: Die UI erkennt am Änderungsdatum der Absicht, dass sie während der Sitzung geschrieben wurde. Das spart je Dateiänderung einen Netzaufruf, und die Messung nach FA-25 ergibt null Zusatzlast. Vorschlag: so machen.
2. *Beschriftung des Knopfs.* Die Spec sagt „Plan prüfen, sobald die Sitzung einen Plan-Mode-Plan gezeigt hat“. Das kann die UI vor dem Klick nicht wissen, weil die Erkennung der Plan-Box seit dem Claude-Code-Update nicht mehr funktioniert. Vorschlag: „Plan prüfen“, sobald ein Plan im Ordner liegt oder die Sitzung im Schritt Plan oder Build ist; sonst „Absicht prüfen“. Sitzungen ohne Vorhaben prüfen wie heute den Plan-Mode-Plan.
3. *„Gescheitert am Tab“.* Ein gescheitertes Review steht in der Review-Anzeige des Tabs. Den orangen Tab-Punkt setzt die UI wie heute nur, wenn die Sitzung gerade auf eine Entscheidung wartet; sonst gäbe es nichts zu entscheiden. Vorschlag: so lassen.

## Details

<!-- leser: mensch -->

### 1. Kurzfassung

<!-- leser: mensch -->

Der bestehende `PlanReviewOrchestrator` wird zum Review-Orchestrator für zwei Arten (`intent`, `plan`) mit einem neuen Einstieg `startReview(sessionId, ziel, source)`: Er liest den Text aus der Datei im Vorhaben-Ordner, wählt den passenden Auftrag, probt die Prüfer und die Ersatzreihe parallel (15 s, Cache 5 min), füllt auf drei auf, startet die Reviews und übergibt das Ergebnis nur nach strenger Bildschirmprüfung (`pruefeEingabeWartet`), sonst beim nächsten `stop`. Den automatischen Start löst der `VorhabenService` nach dem Rescan eines `stop` aus (Absicht `entwurf`, `mtimeMs` > Sitzungsstart, Schalter an, Marke fehlt); die Marke liegt im Nutzerzustand (ADR-0002). Workflows `intent`/`plan` und die Absicht-Vorlage bekommen die Beleg-Regeln, Vorlagen-Format 2.3, Release 4.7.0.

### 2. Ausgangslage im Code

<!-- leser: agent -->

| Bereich | Heute (Datei:Zeile) | Bedeutung für dieses Vorhaben |
|---|---|---|
| Review-Start | `ui/src/server/services/plan-review-orchestrator.ts:406-576` `handlePlanDetected` — nur über Event `session.plan-detected`, Gate `state.config.enabled` (`:413`) | wird zu `runReview`; Gate gilt nur noch für den (toten) Auto-Plan-Pfad. [Certain] |
| Plan-Quelle | `:437` `session.lastDetectedPlanPath`; Text kommt aus `PlanBufferExtractor` über `ui/src/server/services/cloud-terminal-manager.ts:1779-1792` (`triggerManualReview`); ohne Plan im Puffer **still** `return` (`:1785-1787`) | FA-02/FA-03: Ordner zuerst, Puffer nur als Rückfall, Fehlschlag sichtbar. [Certain] |
| Auto-Plan-Erkennung | `cloud-terminal-manager.ts:191` `PLAN_BOX_PATTERN`, `:1856-1873` `detectPlanBox` | tot seit Claude Code ohne Box (Memory `reference_claude_plan_dialog_hooks`); Spec §8 lässt ihn unrepariert. Nicht anfassen. [Likely] |
| Prompt + Budget | `ui/src/server/general-config.ts:28-35` `DEFAULT_REVIEW_PROMPT` (enthält „preserve all features“, Budget 6); gespeicherter Prompt in `ui/config/general-config.json` (Michaels Fassung, Budget 6) | Budget ist heute **Prompttext**, nicht Code; Absicht-Prompt als eigenes Feld mit Budget 15 (AN-S01). Plan-Prompt bleibt (Spec §8). [Certain] |
| Einstellungs-Speicher | `general-config.ts:126-160` `updateGeneralConfig`, Merge mit `DEFAULT_CONFIG` (`:93-99`) | neue Felder bekommen Standard ohne JSON-Änderung. [Certain] |
| Reviewer-Aufruf | `ui/src/server/services/external-reviewer.ts:32-114`, Timeout 300 s (`:113`), Fehlertext enthält stderr bis 800 Zeichen (`:108`) | Probe als zweite Methode daneben; Rohtext nur in die Anzeige (AN-S11). [Certain] |
| SDK-Optionen | `ui/src/server/utils/sdk-call-options.ts` `buildSdkCallOptions(providerId, tools)` | Probe mit `[]` Werkzeugen. [Likely] (Signatur aus `external-reviewer.ts:53`) |
| Standard-Prüfer | `ui/src/server/model-config.ts:300-334` `DEFAULT_REVIEWER_IDS` (opus, glm-5.2, MiniMax-M3, deepseek/opus), Code-Konstante wegen RB-03 | auf sonnet, opus, MiniMax-M3, glm-5.2. Alle in `ui/config/model-config.json` vorhanden, ebenso fable, MiniMax-M2.5, haiku (AN-04 geprüft 27.10.). [Certain] |
| Inject-Text | `plan-review-orchestrator.ts:77-89` `buildInjectText` („argue for it“, `:84`); `ui/src/server/services/finding-aggregator.ts:338-380` `formatInject` (Fußzeile `:376-377`) | beide Wege bekommen denselben Kopf (Art, Quelle, Basis, Ausfälle, Ersatz) und dieselben Regeln (FA-17, FA-19). [Certain] |
| Übergabe ohne Dialog | `plan-review-orchestrator.ts:309-314` `submitAtPrompt` tippt ungeprüft + Enter; auch im Rohpuffer-Zweig `:273` | Widerspruch zu AR-08 (Spec §7). Ersetzen durch strenge Prüfung. [Certain] |
| Strenge Prüfung | `ui/src/server/services/dialog-driver.ts:180-192` `pruefeEingabeWartet`, `:226` `readStableScreen`, `:37` `findDialogCue`; Nutzung in `vorhaben-service.ts:765-797` `screenCheck` | wiederverwenden, gleiche Reihenfolge wie `screenCheck(..., 'strict')`. [Certain] |
| Reviewer-Kennung | `plan-review-orchestrator.ts:504-525` emittiert `reviewer.providerId` als `reviewerId`; Frontend-Map nach `reviewerId` (`ui/frontend/src/components/terminal/aos-plan-review-block.ts`, `reviewers: Map`) | **Falle:** Sonnet und Opus sind beide `anthropic` → kollidieren in der Anzeige. Kennung wird `provider:model`. [Certain] |
| Stop-Ereignis | `ui/src/server/services/vorhaben-service.ts:1187-1214` `onAgentEvent` — bei `stop` Rescan, wenn Sitzung zugeordnet; Muster „erste Eingabe beim ersten Stop“ (`:1195`, `:1515-1565`) | Einhängepunkt für den Auto-Start; Muster für „beim nächsten Halt übergeben“. [Certain] |
| Zeilen eines Vorhabens | `ui/src/shared/types/vorhaben.protocol.ts:60-71` `VorhabenDocInfo` (`mtimeMs`, `status`), `:187-240` `VorhabenRow` (`cwd`, `dirName`, `step`, `session`, `docs`) | liefert alles für Auslöser und Ziel; kein neuer Leser. [Certain] |
| Sitzungsstart | `cloud-terminal-manager.ts:760` `createdAt: new Date()`; nach Wiederherstellung `:2023` aus der Registry | Vergleich `intent.mtimeMs > createdAt`. [Certain] |
| Nutzerzustand | `ui/src/server/services/vorhaben-state.ts:79-98` `VorhabenStateData`, Muster `abschluesse` (`:393-430`) + `prune` (`:439`) | neue optionale Map `autoReviews` wie `abschluesse` (Spec §7, O2). [Certain] |
| Verdrahtung | `ui/src/server/websocket.ts:144` Orchestrator, `:150-162` `VorhabenService`-Deps, `:2278-2335` Event→Broadcast, `:2357-2372` manueller Trigger | Callback + Resolver hier verdrahten. [Certain] |
| Hook-Matcher | `ui/src/server/services/claude-hooks.ts:71-81` `HOOK_EVENTS` | bleibt unverändert (Entscheidung 1). [Certain] |
| Frontend-Knopf | `ui/frontend/src/components/terminal/aos-auto-review-toggle.ts:437-446` (`title="Review last plan manually"`, `disabled` ohne AR) | Beschriftung nach Ziel, immer bedienbar (AN-S04). [Certain] |
| Frontend-Vorhabenstand | `ui/frontend/src/services/vorhaben.service.ts:51` `VorhabenClientService`, Listener-Muster; Frontend importiert `src/shared` bereits (`ui/frontend/src/app.ts:31`) | Knopf leitet Ziel aus der Zeile ab, gleiche reine Funktion wie das Backend. [Certain] |
| Einstellungen-UI | `ui/frontend/src/components/settings/aos-review-prompt-editor.ts` (118 Zeilen), WS `plan-review:prompt.get/.update` (`websocket.ts:619-624`, `:1709-1730`) | um drei Felder erweitern. Shadow-Root-Wirt prüfen (CLAUDE.md-Fehler 3). [Likely] |
| Framework | `specwright/workflows/core/intent.md:101-115` Step 5 (v1.4), `plan.md` Step 7 (v1.6); `specwright/templates/sdlc/vorhaben/intent-template.md:180-188`; `specwright/templates/sdlc/README.md:44-56` Formatregel | Regeln + neuer optionaler Abschnitt → Nebennummer 2.3, alle drei Vorlagen. [Certain] |
| Tests | `ui/tests/unit/plan-review-orchestrator.test.ts` (706 Z.), `external-reviewer.test.ts`, `model-config.test.ts`, `vorhaben-service*.test.ts`, `claude-hooks.test.ts`, `dialog-driver.test.ts` | Erweitern statt neu, außer zwei neue Dateien (§8). [Certain] |
| Software Factory | `SPECWRIGHT_FACTORY_DIR` gesetzt, `ready-check` vorhanden; **keine** `~/.factory/*/factory.yaml` mit `michsindlinger/specwright` | kein Schnitt (§7). [Certain] |

### 3. Entwurf

<!-- leser: agent -->

#### Ansatz

<!-- leser: agent -->

**Ziel-Auflösung (eine reine Funktion für Backend und Frontend).** Neu `ui/src/shared/review-ziel.ts`:

- `reviewZielArt(row?: { step?: VorhabenStep; docs: { key }[] }): 'intent' | 'plan'` — `plan`, wenn kein Vorhaben, ein `plan`-Dokument da ist oder `step ∈ {plan, build}`; sonst `intent`, wenn ein `intent`-Dokument da ist; sonst `plan`.
- Backend `VorhabenService.reviewZiel(sessionId)` → `{ art, quelle: 'intent-ordner' | 'plan-ordner' | 'plan-mode', text, pfad?, projectId?, intentId? } | { fehler: string }`: Zeile über die Zuordnung (`allAssignments`, nicht `ended`, wie `firstInputTarget` `vorhaben-service.ts:1568`). Datei = `join(row.cwd, 'intent', row.dirName, 'intent.md' | 'plan.md')`, gelesen mit `fs.promises.readFile`. Plan ohne Datei → Rückfall Plan-Mode-Puffer über neue CTM-Methode `extractPlanFromBuffer(sessionId): { planText, planPath } | null` (gleicher Code wie `triggerManualReview`, setzt `lastDetectedPlanPath`; `null` bei unbekannter Sitzung oder ohne Plan im Puffer — der Puffer liegt im Speicher, einen Lesefehler gibt es nicht). Nichts gefunden → `fehler` (FA-03): „Kein Plan im Vorhaben-Ordner und kein Plan-Mode-Plan in der Sitzung.“ bzw. „Keine Absicht im Vorhaben-Ordner.“

**Orchestrator.** `plan-review-orchestrator.ts`:

- `startReview(sessionId, ziel, source: 'auto' | 'manual')` — neuer Kern, enthält den heutigen Rumpf ab `:417` (Lock-Prüfung, `pendingInject`-Wiederverwendung, Reviewer-Lauf). Heute ist `handlePlanDetected` der **einzige** Einstieg, auch für den Knopf (`websocket.ts:2371` → `orchestrator.triggerManualReview` → `cloud-terminal-manager.ts:1791` emittiert `plan-detected` mit `manual`). Danach: `handlePlanDetected` bleibt nur für Ereignisse mit `source === 'auto'` (Plan-Box, heute praktisch tot) und ruft `startReview` mit `quelle: 'plan-mode'`, Gate `enabled` bleibt dort; `CloudTerminalManager.triggerManualReview` entfällt zugunsten von `extractPlanFromBuffer`, damit der Knopf nicht doppelt startet.
- Knopf: `websocket.ts` `handlePlanReviewTriggerManual` holt `await vorhabenService.reviewZiel(sessionId)`; bei `fehler` → `plan-review:error` an den Client; sonst `orchestrator.startReview(sessionId, ziel, 'manual')` ohne `enabled`-Gate (AN-S04). Beide Richtungen (Auto-Start, Knopf) werden nur in `websocket.ts` verdrahtet; Orchestrator und `VorhabenService` kennen einander nicht.
- Gleichzeitigkeit: der bestehende Lock `state.locked` (`:417-434`) gilt für jeden Start. Läuft ein Review, lehnt ein zweiter Start (Knopf oder Auto) mit „Review already in progress“ ab; der Knopf darf nur einen veralteten Lock (> 3 min, `STALE_LOCK_MS`) übernehmen. Ein abgelehnter Auto-Start meldet `beschaeftigt` und bekommt keine Marke (siehe Auto-Start).
- Prüfer-Kennung: eine Hilfsfunktion `pruefKennung(r) = \`${r.providerId}:${r.modelId ?? r.providerId}\`` in `review-auswahl.ts` (gleicher Rückfall wie `:541`). Sie ist Schlüssel des Probe-Caches, `reviewerId` in `plan-review:probe` **und** `plan-review:reviewer.result` (heute `reviewer.providerId`, `:507`, `:522`) und Überschrift im Inject-Text. Das Frontend schlüsselt seine Map danach.
- Prüferwahl: `state.config.reviewers`, ohne State `getDefaultReviewers()` (wie Snapshot `:193`). Bestehende Tabs behalten ihre gespeicherte Auswahl (`cloud-terminal-manager.ts:573`), auch mit DeepSeek; AK-09 gilt für neue Sitzungen, und ein ausgefallener DeepSeek wird über die Ersatzreihe ersetzt.
- Prompt: `art === 'intent'` → `getIntentReviewPrompt(projectPath)`, sonst `getReviewPrompt(projectPath)`; Rest wie `:487`.
- Probe + Auswahl vor `Promise.allSettled`: `const probe = await this.probeAll([...gewählt, ...ersatz])` (parallel, Cache), dann `waehlePruefer()` (reine Funktion, neue Datei `ui/src/server/services/review-auswahl.ts`).
- Event `plan-review:started` bekommt `art`, `quelle`; neues Event `plan-review:probe` mit Liste `{ reviewerId, zustand: 'bereit' | 'ausgefallen' | 'fehlt', grund?, meldung?, ersatzFuer? }`. `reviewerId` überall `provider:model`.
- Inject-Text: `autorKopf(art, quelle, basis)` + Körper (`buildInjectText`-Abschnitte ohne „argue for it“ bzw. `formatInject`) + `autorRegeln(art)`. Ausfälle nur mit Kategorie (AN-S11).
- 0 Erfolge: `plan-review:error` mit „Review gescheitert: <Kennung>: <Kategorie>, …“, kein Inject (FA-22); `reportReviewStatus` wie heute (Entscheidung 3).
- Übergabe ohne Dialog: `submitAtPrompt` ersetzt durch `submitWennLeer`. Es läuft wie heute `submitAtPrompt` innerhalb von `injectUnlocked`, also unter dem einen `withMachineWrite` aus `inject()` (`:244`): Lesen, Prüfen, Tippen und Enter sind ein Vorgang, eine zweite Maschinen-Eingabe wird abgelehnt. Tippt Michael selbst zwischen Prüfung und Senden, bleibt ein Fenster von Millisekunden; das gilt genauso für „Nächster Schritt“ und ist durch AR-08 gedeckt (lesen direkt vor dem Tippen). `screen.live` nötig; `findDialogCue` → warten; `pruefeEingabeWartet(ctm, sessionId, screen.text)` muss `wartet` sein → `sendInput(text)`, kurze Pause, `sendInput('\r')` (wie `settleEnter` `vorhaben-service.ts:799`); sonst `pendingInject` + `wartetAufStop = true`. Rohpuffer ohne Dialog → ebenfalls warten (AR-08). Der Dialog-Zweig (`:284-302`: Fokus auf die Freitext-Option, Tippen ohne Enter, Nachlesen) bleibt unverändert; `submitWennLeer` ersetzt nur den Zweig „kein Dialog“ (`:273`, `:305`). Listener auf `session.agent-event` `stop`: wartende Übergabe erneut versuchen, jeder Versuch nimmt den Lock neu und liest den Bildschirm neu. Höchstens 3 Versuche (wie `FIRST_INPUT_MAX_VERSUCHE`); eine Ablehnung `beschaeftigt` von `withMachineWrite` zählt nicht als Versuch. Das gilt auch, wenn beim selben `stop` die „erste Eingabe“ des `VorhabenService` (`:1195`) den Lock zuerst nimmt: die erste Eingabe startet eine neue Runde, deren `stop` das Review übergibt. Nach 3 Versuchen `plan-review:error` „Review nicht übergeben – ‚Absicht prüfen‘ bzw. ‚Plan prüfen‘ fügt es ein“.
- Wartendes Ergebnis und Knopf: `pendingInject` trägt `art` und `pfad` (Datei im Ordner bzw. Plan-Mode-Pfad) statt nur `planPath`. Drückt Michael den Knopf und das aufgelöste Ziel hat denselben `pfad`, wird das wartende Ergebnis eingefügt, ohne neues Review (wie heute `:448-463`). Ausschalten des Tab-Schalters (`setTabConfig`, `:168`) verwirft nur ein wartendes Ergebnis mit `quelle: 'plan-mode'` aus dem Auto-Weg; ein Absicht- oder Knopf-Ergebnis bleibt. Die Unterdrückung gleicher Pläne (`lastInjectedPlanPath`, `:441`) gilt weiter nur für `source === 'auto'` mit `quelle: 'plan-mode'`.
- FA-24: Die Übergabe prüft den Status der Absicht nicht – es gibt keine Bedingung, die eine freigegebene Absicht ausschließt.

**Probe.** `external-reviewer.ts`: `probe(providerId, modelId): Promise<ProbeErgebnis>` — `claudeQuery({ prompt: 'Reply with: ok', options: { ...buildSdkCallOptions(providerId, []), maxTurns: 1, ... } })` unter `withTimeout(…, 15_000)`. Nicht leere Antwort → `bereit`. Sonst `ordneProbeFehler(meldung)`: `/timeout/` → `zeitueberschreitung`; `/529|overload/i` → `ueberlastet`; `/401|403|auth|login|api key|unauthori/i` → `anmeldung`; `/model.*(not found|unknown|does not exist|invalid)|404/i` → `unbekanntes_modell`; sonst `fehler` (AN-S07). Cache im Orchestrator: `Map<'provider:model', { ergebnis, at }>`, gültig 5 min (FA-12).

**Auswahl** (`review-auswahl.ts`, rein): `waehlePruefer(gewählt, ersatz, probe, imConfig)`:

1. Gewählte, die nicht in der Config sind → `fehlt` (FA-18).
2. Bereit = gewählte mit `bereit`.
3. Solange `bereit < 3` und Ersatz übrig: Ersatz-Kandidaten = Reihe ohne schon Gewählte (FA-13 keine Doppelten), nur `bereit`; zuerst der erste, dessen Provider unter den Bereiten fehlt, sonst der erste. `ersatzFuer` = nächster ausgefallener Gewählter in Reihenfolge, sonst leer („füllt auf“).
4. Ergebnis: `laufen`, `zeilen` für das Probe-Event.

**Auto-Start.** `vorhaben-service.ts`:

- `onAgentEvent` merkt `stop`-Sitzungen in `stopSeit: Set<string>`; am Ende von `runScan` → `pruefeAutoReview()`: je Sitzung in `stopSeit` die Zeile mit `row.session?.id === sessionId`; Bedingungen: `deps.intentAutoReview?.() === true`, `intent`-Dokument `status === 'entwurf'`, `mtimeMs > deps.sessionStartedAt(sessionId)`, `!store.getAutoReview(projectId, intentId)`. Dann `const r = deps.startIntentReview(sessionId, ziel)`; `startIntentReview` prüft den Lock **synchron** zu Beginn und gibt `'gestartet' | 'beschaeftigt'` zurück. Bei `gestartet` setzt der Dienst sofort die Marke (FA-08: sie bleibt, auch wenn das Review danach scheitert, AN-S03). Bei `beschaeftigt` (z. B. ein Plan-Review per Knopf läuft) keine Marke, die Sitzung bleibt in `stopSeit` und wird beim nächsten Scan erneut geprüft.
- `stopSeit`-Regeln: Eintrag entsteht bei `stop`/`stop-failure` einer zugeordneten **oder anhängigen** Sitzung (`isAssigned`/`isPending`). Eine neue `/intent`-Sitzung wird erst zugeordnet, wenn der Ordner-Wächter `dir-added` meldet (`vorhaben-service.ts:382`, `:1489-1503`); das kann nach dem Scan des Stops liegen. Deshalb bleibt ein Eintrag stehen, solange die Sitzung nur anhängig ist, und wird bei jedem späteren Scan geprüft (`dir-added` löst über `changed` einen Rescan aus). Entfernt wird er, sobald eine Zeile mit dieser Sitzung geprüft wurde (gleich mit welchem Ergebnis außer `beschaeftigt`) oder die Sitzung schließt (`onSessionClosed`). Damit ist die Menge auf laufende Sitzungen begrenzt.
- Prüfen und Setzen der Marke laufen synchron in einem Durchgang nach `this.rows = rows` (`:1787`); `runScan` läuft nur einmal gleichzeitig (`rescan` mit `scanning`/`scanDirty`, `:467-480`). Ein `stop` während eines laufenden Scans landet über `scanDirty` im nächsten Durchgang. Zwei schnelle `stop` ergeben deshalb genau einen Start.
- Jeder übersprungene Fall schreibt eine Zeile `[vorhaben] Absicht-Review <id>: übersprungen (<Grund>)` ins Log (Status, Datei älter als Sitzung, Marke da, Schalter aus, beschäftigt).
- Wirft das Lesen der Datei im Orchestrator, meldet er `plan-review:error` im Block; Neustart per Knopf. Risikoklasse wird nicht gelesen (OF-03).
- Neue Deps (optional, Tests ohne sie unverändert): `intentAutoReview: () => boolean`, `startIntentReview: (sessionId, ziel) => void`, `sessionStartedAt: (sessionId) => number | undefined`.

**Einstellungen.** `general-config.ts`: `intentReviewPrompt` (Standard `DEFAULT_INTENT_REVIEW_PROMPT`), `reviewErsatz: string[]` (`provider/model`, Standard `['anthropic/fable', 'minimax/MiniMax-M2.5', 'anthropic/haiku']`), `intentAutoReview: boolean` (Standard `true`). Validierung wie `reviewPrompt` (`general-config.ts:136-140`): leerer Absicht-Auftrag wird abgelehnt (kein stiller Rückfall), gilt global und je Projekt über denselben Merge; Ersatz höchstens 10 Einträge, Form `^[a-z0-9-]+/[A-Za-z0-9._:/\[\]-]+$`; Schalter boolean. WS: `plan-review:prompt` liefert zusätzlich `intentPrompt`, `ersatz`, `intentAuto`; `plan-review:prompt.update` nimmt sie optional an. `aos-review-prompt-editor.ts`: zweites Textfeld, Textfeld „Ersatzreihe (eine Zeile je `provider/model`, Reihenfolge zählt)“, Checkbox.

**Standard-Absicht-Auftrag** (Englisch wie der Plan-Auftrag; erfüllt FA-04/FA-05):

> You are an external reviewer for an INTENT document (problem, goals, acceptance criteria) — written before any spec or plan. Search the codebase first (Read, Grep, Glob). Hard tool-call budget: at most 15 tool calls total, then stop reading and write the review. Answer: (1) EXISTS — what in the codebase already solves this or part of it, with file:line. (2) SMALLEST FIX — the smallest change that removes the root cause. (3) DROP — goals, criteria or parts that can be dropped because they already exist or are not needed; mark each line "DROP:". (4) OBSERVABLE — for each acceptance criterion: can it be observed from outside, or does it describe a mechanism? Mark severity BLOCKER / LIKELY / MINOR. Be specific, reference IDs (Z-, AK-, RB-). Be concise. Do not emit raw tool-call XML.

**Regeln an den Autor** (`autorRegeln`, Deutsch, endet den Inject-Text):

> Regeln: Lehne einen Befund nur mit lesbarem Beleg ab (`datei:zeile` oder Abschnitt in Absicht/Spec). Ohne Beleg frag Michael nach R2 („Befund n, Gegenstand: Vorschlag. Ok?“). Übernimm die Schweregrade, wie die Prüfer sie gesetzt haben. [nur Absicht:] Blocker, LIKELY-Befunde und jede DROP-Empfehlung – auch von nur einem Prüfer – gehen immer an Michael. Jede Entscheidung kommt ins Dokument: Absicht → Abschnitt „Review-Entscheidungen“, Plan → §12.

**Framework.** `intent.md` Step 5 neue RULE „Review-Ergebnis bearbeiten“ (Text = Regeln oben, unabhängig von der Quelle des Ergebnisses, AR-06/RB-04); `plan.md` Step 7 dieselbe RULE für Plan (§12). `intent-template.md`: neuer optionaler Abschnitt `## Review-Entscheidungen` vor dem Änderungsprotokoll (Leser-Marker `mensch`, Tabelle Befund | Prüfer | Schweregrad | Entscheidung | Beleg oder „Michael, Datum“). Formatversion 2.3 in allen drei Vorlagen, README-Verlauf, CHANGELOG `### Format`. Workflow-Versionen intent 1.5, plan 1.7. Release 4.7.0 (`VERSION`, `install.sh` `FRAMEWORK_VERSION`, CHANGELOG).

#### Verworfene Alternativen

<!-- leser: agent -->

| Alternative | Warum nicht |
|---|---|
| Hook-Matcher `PostToolUse` um `Write\|Edit` erweitern, Pfad aus `tool_input.file_path` (Vorschlag der Absicht, OF-02) | Ein `curl` je Dateiänderung in jeder UI-Sitzung, Umbau von `mapHookPayload` (`claude-hooks.ts:150-159` lehnt fremde Werkzeuge heute ab) und eine Messung (FA-25). Die Zeile kennt schon Status und `mtimeMs`; Sitzungsstart vergleichen reicht für „in dieser Sitzung geschrieben“. Rest-Unschärfe: Änderung durch den Docs-Editor der UI während der Sitzung zählt mit — harmlos, weil höchstens einmal je Absicht. |
| Eigener Review-Dienst neben dem Orchestrator | Doppelte Lock-, Inject- und Event-Logik; der Orchestrator hat schon Lock, Übergabe, Wiederholung. |
| Übergabe der Absicht über `VorhabenService.sendToSession` (Review-Kanal) | Schreibt Protokolleinträge und nutzt `screenCheck('waiting')` (locker); FA-23 braucht `strict`. Der Orchestrator braucht ohnehin seine eigene Dialog-Übergabe für den Plan. |
| Ersatz erst nach der ersten Probe proben | Verlängert bis zu 15 s (Spec §7, EK-03); AN-S08 bestätigt paralleles Proben. |
| Budget als `maxTurns` erzwingen | `maxTurns` zählt Runden, nicht Werkzeugaufrufe; heute steht das Budget im Prompt, Michaels gespeicherter Plan-Prompt sagt 6. Gleiche Mechanik für die Absicht. |
| Marke „automatisch geprüft“ in `general-config.json` oder im Vorhaben-Ordner | Versioniert bzw. im Repo (öffentlich); ADR-0002 sagt Nutzerzustand gehört in die Laufzeitdatei. |

#### Architektur-Auswirkung

<!-- leser: agent -->

- **Nein** bei den Regeln: AR-02 (kein `npx`), AR-04 (Pfade nur aus `row.cwd`, das der Scan aus `projectDir`-Logik gebaut hat), AR-05 (Marke und Einstellungen im Backend), AR-06 (Framework-Regeln ohne UI), AR-07, AR-08 (wird jetzt **eingehalten**: `submitAtPrompt` tippte ungelesen) bleiben.
- **Ja, Beschreibung:** `docs/architecture.md` §2 Backend-Zeile (Review-Kanal: Absicht-Review, Probe + Ersatzreihe, Übergabe nur nach strenger Prüfung, Auto-Start nach Stop-Rescan), §3 Nutzerzustand (Marke `autoReviews` je Vorhaben) und Einstellungszeile (`general-config.json`: Absicht-Auftrag, Ersatzreihe, Schalter), §5 Modellanbieter (Probe-Aufruf, Ausfallverhalten) — **in dieser PR**. ADR: kein neues; Vermerk in ADR-0002 (optionales Feld wie INT-2026-019/024). `docs/product-brief.md` §8: Begriffe Absicht-Review, Probe, Ersatzreihe.

### 4. Änderungen

<!-- leser: agent -->

| # | Datei / Komponente | Art | Was | Herkunft |
|---|---|---|---|---|
| 1 | `ui/src/shared/review-ziel.ts` | neu | `reviewZielArt(row)` | FA-02, FA-10 |
| 2 | `ui/src/server/services/review-auswahl.ts` | neu | `waehlePruefer`, Typen `ProbeZustand`, `ProbeGrund` | FA-13, FA-16, FA-18 |
| 3 | `ui/src/server/services/external-reviewer.ts` | ändern | `probe()`, `ordneProbeFehler()` | FA-11 |
| 4 | `ui/src/server/services/plan-review-orchestrator.ts` | ändern | `startReview`, Resolver, Probe-Cache, Auswahl, Prompt nach Art, `autorKopf`/`autorRegeln`, `submitWennLeer`, Übergabe bei `stop`, `reviewerId` = `provider:model`, „argue for it“ raus | FA-01–06, 11–13, 15–17, 19, 22–24 |
| 5 | `ui/src/server/services/finding-aggregator.ts` | ändern | Fußzeile von `formatInject` entfällt (Regeln kommen aus `autorRegeln`) | FA-19 |
| 6 | `ui/src/server/services/cloud-terminal-manager.ts` | ändern | `extractPlanFromBuffer(sessionId)` statt `triggerManualReview` (entfällt; einziger Aufrufer `plan-review-orchestrator.ts:184`) | FA-02, FA-03 |
| 7 | `ui/src/server/general-config.ts` | ändern | 3 Felder, Standards, Validierung, Getter | FA-04, 05, 09, 14 |
| 8 | `ui/src/server/model-config.ts` | ändern | `DEFAULT_REVIEWER_IDS` → sonnet, opus, MiniMax-M3, glm-5.2; `getReviewErsatz()` (aus Einstellungen, gegen Config geprüft) | FA-14, FA-18 |
| 9 | `ui/src/server/services/vorhaben-state.ts` | ändern | `autoReviews` laden/speichern, `getAutoReview`/`setAutoReview`, `prune` | FA-08 |
| 10 | `ui/src/server/services/vorhaben-service.ts` | ändern | `stopSeit`, `pruefeAutoReview`, `reviewZiel()`, 3 optionale Deps | FA-01, 07, 08, 09 |
| 11 | `ui/src/server/websocket.ts` | ändern | Deps verdrahten, Knopf über `reviewZiel` → `startReview`, Event `plan-review:probe` broadcasten, Prompt-Nachrichten um 3 Felder | FA-09, 10, 14, 16 |
| 12 | `ui/src/shared/types/plan-review.protocol.ts` | ändern | `art`, `quelle` an `started`; `PlanReviewProbe`; Felder an Prompt-Nachrichten | FA-16 |
| 13 | `ui/frontend/src/components/terminal/aos-plan-review-block.ts` | ändern | Kopf „Absicht-Review“/„Plan-Review“ + Quelle; Zeilen je Prüfer mit Probe-Zustand, Grund, „springt ein für“; „Ergebnis aus n von m Prüfern“; „Review gescheitert“ mit Gründen; Styles in der Komponente | FA-16, FA-22 |
| 14 | `ui/frontend/src/components/terminal/aos-auto-review-toggle.ts` + `aos-terminal-tabs.ts` | ändern | Knopf-Titel aus `reviewZielArt(row)` (Zeile aus `vorhabenService`), `disabled` nur noch ohne Sitzung | FA-10 |
| 15 | `ui/frontend/src/components/settings/aos-review-prompt-editor.ts` | ändern | 3 Felder | FA-09, FA-14 |
| 16 | `specwright/workflows/core/intent.md`, `plan.md` | ändern | RULE Review-Ergebnis; Version 1.5 / 1.7 | FA-20 |
| 17 | `specwright/templates/sdlc/vorhaben/intent-template.md` (+ Format in `spec-`, `plan-template.md`), `specwright/templates/sdlc/README.md` | ändern | Abschnitt „Review-Entscheidungen“, Format 2.3 | FA-21 |
| 18 | `VERSION`, `install.sh`, `CHANGELOG.md` | ändern | 4.7.0, `### Format` 2.3 | RB-05 |
| 19 | `docs/architecture.md`, `docs/adr/0002-…md`, `docs/product-brief.md` | ändern | §3 oben | Spec §7 |
| 20 | Tests (siehe §8) | neu/ändern | — | alle |

**Nicht betroffen (ausdrücklich):** `claude-hooks.ts` (Matcher, `mapHookPayload`), `PLAN_BOX_PATTERN`/`detectPlanBox`, Michaels gespeicherter Plan-Prompt in `ui/config/general-config.json`, `ui/config/model-config.json`, `finding-aggregator.ts` außer der Fußzeile, Skill `review-implementation-plan` (NZ-01), `specwright/manifest.tsv` (keine neue Lieferdatei; die zwei neuen Dateien liegen unter `ui/`), `ui/tests/known-failures.txt`.

### 5. Verbindungen

<!-- leser: agent -->

| Von | Nach | Art | Schnittstelle | Nachweis (Befehl) | Teil |
|---|---|---|---|---|---|
| `VorhabenService` | `PlanReviewOrchestrator` | Callback (Dep) | `startIntentReview(sessionId, ziel)` | `grep -n "startIntentReview" ui/src/server/websocket.ts ui/src/server/services/vorhaben-service.ts` + Test „Stop löst einmal aus“ | — |
| `websocket.ts` (Knopf) | `VorhabenService` → `PlanReviewOrchestrator` | Aufruf | `reviewZiel(sessionId)` → `startReview(sessionId, ziel, 'manual')` | `grep -n "reviewZiel\|startReview" ui/src/server/websocket.ts` + Test „Knopf nimmt plan.md“ | — |
| `PlanReviewOrchestrator` | CTM | Aufruf | `extractPlanFromBuffer(sessionId)`; `grep -rn "triggerManualReview" ui/src/server/services/cloud-terminal-manager.ts` leer | Test „ohne plan.md Puffer“ | — |
| Orchestrator | `ExternalReviewer.probe` | Aufruf | `probe(providerId, modelId)` | `grep -n "\.probe(" ui/src/server/services/plan-review-orchestrator.ts` | — |
| Orchestrator | `review-auswahl.ts` | Import | `waehlePruefer` | `grep -n "waehlePruefer" ui/src/server/services/plan-review-orchestrator.ts` | — |
| Orchestrator | `dialog-driver.ts` | Import | `pruefeEingabeWartet`, `findDialogCue` | `grep -n "pruefeEingabeWartet" ui/src/server/services/plan-review-orchestrator.ts` | — |
| Orchestrator | CTM | Event | `session.agent-event` `stop` | Test „wartende Übergabe beim nächsten Stop“ | — |
| Orchestrator | `general-config.ts` | Import | `getIntentReviewPrompt` | `grep -n "getIntentReviewPrompt" ui/src/server/services/plan-review-orchestrator.ts` | — |
| `websocket.ts` | Frontend | WS-Event | `plan-review:probe` | `grep -n "plan-review:probe" ui/src/server/websocket.ts ui/frontend/src/components/terminal/aos-plan-review-block.ts` | — |
| `aos-auto-review-toggle` | `review-ziel.ts` | Import | `reviewZielArt` | `grep -rn "reviewZielArt" ui/frontend/src ui/src/server` (je ≥ 1 Treffer) | — |
| Einstellungs-Editor | `websocket.ts` | WS | `plan-review:prompt.update` mit `intentPrompt`, `ersatz`, `intentAuto` | Test in `general-config`-Test + `grep -n "intentAuto" ui/frontend/src/components/settings/aos-review-prompt-editor.ts` | — |
| Workflows | Regeln | Text | RULE in `intent.md`/`plan.md` | `grep -n "lesbarem Beleg" specwright/workflows/core/intent.md specwright/workflows/core/plan.md` | — |

- [x] Jede neue Komponente hat mindestens eine Verbindung.
- [x] Jeder Nachweis ist ein ausführbarer Befehl.

### 6. Reihenfolge der Arbeit

<!-- leser: agent -->

0. Lesende Vorprüfung: Konsumenten von `reviewerId`, `plan-review:started`, `plan-review:prompt`, `DEFAULT_REVIEWER_IDS`, `submitAtPrompt` (`grep -rn` in `ui/src ui/frontend/src ui/tests`), Shadow-Root von `aos-review-prompt-editor` und `aos-plan-review-block` (`createRenderRoot`?), `ui/tests/known-failures.txt` lesen → Liste im Arbeitsprotokoll.
1. **Erste Scheibe — Knopf prüft die Absicht aus dem Ordner:** `review-ziel.ts`, `VorhabenService.reviewZiel`, Knopf-Handler in `websocket.ts`, `startReview` mit Absicht-Prompt (ohne Probe, gewählte Prüfer), Kopf „Absicht-Review · Absicht im Ordner“ im Block, Knopf „Absicht prüfen“ → vorführbar: in einer Scratch-Sitzung mit `intent.md` Knopf drücken, Review läuft gegen die Datei. Orchestrator-Test „Absicht aus Datei, Prompt ohne preserve“ grün.
2. Übergabe nur nach strenger Prüfung + Wiederholung beim `stop` (`submitWennLeer`) → Tests FA-23/FA-24 grün.
3. Probe, Cache, Auswahl, Ersatzreihe, Probe-Event + Anzeige, `reviewerId` → Tests FA-11–FA-16, FA-22 grün.
4. Auto-Start (`stopSeit`, Marke, Schalter) → Tests FA-07–FA-09 grün.
5. Einstellungen (3 Felder Backend + UI), Standard-Prüfer → Tests FA-14, FA-18 grün.
6. Inject-Kopf und Regeln, Fußzeile raus; Framework-Regeln, Vorlage 2.3, Version 4.7.0 → `bash scripts/check-vorlagen-format.sh`, `check-manifest.sh` grün.
7. Docs (`architecture.md`, ADR-0002, product-brief).
8. Verbindungen nachweisen (§5), `bash scripts/verify.sh`, E2E (§8).

### 7. Zerlegung

<!-- leser: agent -->

**Variante A — eine Sitzung.** Alle Teile hängen am Orchestrator; die Framework-Änderung ist klein (2 Workflows, 3 Vorlagen-Kopfzeilen, 1 Abschnitt) und würde als eigener Teil eine Integrationsaufgabe für 20 Minuten Arbeit erzeugen. Kontext ~105k liegt unter der Grenze (§11).

#### Karten für die Factory

<!-- leser: agent -->

Kein Schnitt: keine Betriebsdatei für dieses Projekt.

### 8. Tests und Nachweis

<!-- leser: agent -->

Nahtstellen: (a) `PlanReviewOrchestrator` öffentlich (`startReview`, `triggerManualReview`) mit Fake-CTM wie im bestehenden Test — höchste Stelle, an der Quelle, Prompt, Auswahl, Inject-Text und Übergabe beobachtbar sind; Mock nur am SDK (`ExternalReviewer` ist die Systemgrenze zu den Anbietern) und an der Zeit (fake timers). (b) `VorhabenService` mit echtem Temp-Ordner und Fake-Sitzungsquelle wie `vorhaben-service-stage2.test.ts` für den Auslöser. (c) Reine Funktionen nur, wo die Kombinatorik in (a) unübersichtlich würde (Auswahl, Fehlerkategorien).

| AK / FA | Nahtstelle (warum diese) | Test | Datei | Art |
|---|---|---|---|---|
| FA-01, AK-01 | (a) | `startReview` intent: Prompt enthält Text der Datei im Temp-Ordner; Datei danach ändern → laufendes Review unverändert | `ui/tests/unit/plan-review-orchestrator.test.ts` | Unit |
| FA-02, FA-03 | (a)+Resolver aus (b) | Knopf: `plan.md` im Ordner schlägt Puffer-Plan; ohne `plan.md` Puffer; ohne beides `plan-review:error` mit Text, kein Reviewer-Aufruf; Quelle im `started`-Event | dto. + `vorhaben-service-review-ziel.test.ts` (neu) | Unit |
| FA-04, FA-05, FA-06 | (a) | Absicht-Prompt enthält „file:line“, „DROP“, „15 tool calls“, nicht „preserve all features“; Plan-Prompt-Standard enthält „6“ | `plan-review-orchestrator.test.ts` | Unit |
| FA-07, FA-08, FA-09, OF-03 | (b) | Stop + `entwurf` + neuere Datei → genau ein Aufruf; zwei Stops vor Ende des Scans → genau ein Aufruf; zweiter Stop → keiner; anhängige `/intent`-Sitzung stoppt **vor** `dir-added` → Aufruf beim Scan nach der Zuordnung; Lock belegt (`beschaeftigt`) → keine Marke, Aufruf beim nächsten Scan; Sitzung schließt → `stopSeit` leer; neuer Store aus derselben Datei → keiner; `angenommen` → keiner; Schalter aus → keiner; `risikoklasse: niedrig` → einer; Datei älter als Sitzungsstart → keiner | `ui/tests/unit/vorhaben-service-auto-review.test.ts` (neu) | Unit |
| FA-10 | `reviewZielArt` + Stichprobe | Tabelle: kein Vorhaben → plan; nur intent → intent; plan-Dok → plan; step plan ohne Dok → plan | `ui/tests/unit/review-ziel.test.ts` (neu); Stichprobe im E2E | Unit + Stichprobe |
| FA-11 | `ordneProbeFehler` | feste Meldungen: „Reviewer timeout“, „529 overloaded“, „401 Unauthorized“, „model not found“, „exited with code 1“ → 5 Kategorien; leere Antwort → fehler | `ui/tests/unit/external-reviewer.test.ts` | Unit |
| FA-12 | (a), fake timers | zweites Review nach 4 min probt nicht, nach 6 min schon | `plan-review-orchestrator.test.ts` | Unit |
| FA-13, AK-07, AN-S06 | `waehlePruefer` | 4 gewählt, GLM-5.2 und MiniMax-M3 aus, alle Ersatz bereit → genau MiniMax-M2.5 springt ein (Provider minimax fehlt unter den bereiten Sonnet/Opus, schlägt das vordere Fable), `ersatzFuer` = glm:glm-5.2; 1 gewählt → auf 3; 0 gewählt → 3 Ersatz; Ersatz schon gewählt → nicht doppelt; alles aus → leer | `ui/tests/unit/review-auswahl.test.ts` (neu) | Unit |
| FA-14 | `updateGeneralConfig` | Standard-Ersatz = 3 feste Werte; ungültige Form → Fehler; 11 Einträge → Fehler | `ui/tests/unit/general-config.test.ts` (neu) | Unit |
| FA-15, EK-03 | (a), fake timers | Prüfer A Probe hängt; B/C/D bereit in 1 s, Reviews 5 s → Inject bei ≤ 20 s simulierter Zeit | `plan-review-orchestrator.test.ts` | Unit |
| FA-16 | (a) | `plan-review:probe`-Event mit `ausgefallen`/`ueberlastet`, `ersatzFuer`, `fehlt`; `reviewerId` in `probe` **und** `reviewer.result` `anthropic:sonnet` ≠ `anthropic:opus` | dto. | Unit |
| FA-17, AN-S11 | (a) | Inject-Text enthält „2 von 4“, „glm:glm-5.2: überlastet“, „anthropic:fable für …“, **nicht** den stderr-Rohtext (fester Pfad-String im Fehler) | dto. | Unit |
| FA-18, AK-09 | `getDefaultReviewers` | Ergebnis exakt sonnet, opus, MiniMax-M3, glm-5.2; kein deepseek; fehlendes Modell → `fehlt`-Zeile im Probe-Event | `ui/tests/unit/model-config.test.ts`, orchestrator-Test | Unit |
| FA-19 | (a) + Review | Test prüft den Inject-Text beider Wege (ein Prüfer, Aggregation): enthält „lesbarem Beleg“, „R2“, bei Absicht „DROP … immer an Michael“; enthält **nicht** „argue for it“ und nicht „briefly justify“ | orchestrator-Test + Review | Unit + Review |
| FA-20, FA-21 | Review | `grep -n "lesbarem Beleg" specwright/workflows/core/{intent,plan}.md`; Abschnitt in `intent-template.md` | — | Review |
| FA-22, AK-11 | (a) | alle Probe/Review aus → `plan-review:error` „Review gescheitert“ mit Gründen, `sendInput` nie gerufen | dto. | Unit |
| FA-23 | (a) | Bildschirm mit Text in der Eingabezeile (Cursor-Probe nicht leer) → kein `sendInput`; danach `stop` + leere Zeile → Text + `\r`; Dialog-Cue → warten | dto. | Unit |
| FA-23 (Knopf) | (a) | Übergabe dreimal abgelehnt → Meldung; danach Knopf mit gleichem Ziel → wartendes Ergebnis wird eingefügt, kein Reviewer-Aufruf; `beschaeftigt` zählt nicht als Versuch | dto. | Unit |
| FA-24, OF-01 | (a) | Absicht-Datei steht bei Übergabe auf `angenommen` → wird trotzdem übergeben | dto. | Unit |
| FA-25, OF-02 | Messung | kein neuer Hook: `git diff origin/main -- ui/src/server/services/claude-hooks.ts` leer → 0 zusätzliche Aufrufe je Dateiänderung; Ergebnis in §14 | — | Messung |

- **Verify-Befehl:** `bash scripts/verify.sh` — muss mit `verify: OK` enden, Ausgabe im PR. CI ist die Wahrheit; Bezugsliste nie kürzen. Im Worktree nach `npm ci`: `chmod +x ui/node_modules/node-pty/prebuilds/*/spawn-helper` und zweites `npm ci` in `ui/frontend` (Memory `project_ui_test_baseline_worktree`).
- **Datenkorrektur:** keine (neue Felder sind optional, Marke entsteht erst neu).
- **Angeschlossen (E2E-Pfad):** Branch-Backend auf Port 3111 mit Scratch-Projekt (Memory `reference_cloud_terminal_e2e_playwright`, Trust-Dialog: erst Pfeil runter, dann Enter). Claude-Sitzung zum Vorhaben starten, Agent schreibt `intent/INT-…/intent.md` mit `status: entwurf`, Sitzung hält → Block zeigt „Absicht-Review · Absicht im Ordner“, Probe-Zeilen, Ergebnis landet in der leeren Eingabezeile (prüft AN-03); zweiter Halt → kein zweites Review; Knopf zeigt „Absicht prüfen“ und startet erneut; ein Prüfer mit absichtlich falschem GLM-Modell → „ausgefallen: Fehler“ und Ersatz springt ein. Screenshots des Blocks und der Einstellungen in den PR. Live-Backend 3001 nicht anfassen (Memory `feedback_no_broad_pkill_on_backends`).
- **Bugfix-Anteil:** `submitAtPrompt` (ungelesenes Tippen): Test FA-23 zuerst schreiben, Fehlschlag gegen alten Code bestätigen.
- **UI:** kein Mock (AN-S09); Screenshot im PR.

### 9. Risiken

<!-- leser: mensch -->

| Risiko | Wahrscheinlichkeit | Wirkung | Gegenmaßnahme | Wer merkt es |
|---|---|---|---|---|
| R1: Änderungsdatum der Absicht ist nach einem Neustart oder Git-Checkout jünger als der Sitzungsstart, ohne dass die Sitzung schrieb | niedrig | niedrig (höchstens ein frühes Review je Absicht) | Marke verhindert Wiederholung; Schalter | Michael (unerwartetes Review) |
| R2: Probe hält einen Prüfer für bereit, der danach scheitert (MiniMax mit falschem Modell) | mittel | niedrig | Ergebnis beruht auf weniger Prüfern, Anzeige sagt es (AN-S05) | Michael in der Anzeige |
| R3: Strenge Prüfung lehnt dauernd ab (Claude malt Vorschlag in die Zeile), Ergebnis kommt nie an | niedrig | mittel | dieselbe Cursor-Probe wie „Nächster Schritt“ (INT-2026-023); nach 3 Versuchen Meldung, Knopf fügt ein | Michael (Meldung im Block) |
| R4: Tippen in die Eingabezeile, während Michael gleichzeitig tippt | niedrig | mittel | Übergabe unter `withMachineWrite` und nur nach gelesenem leeren Zustand (AR-08) | Michael |
| R5: Absichtstext eines Kundenprojekts geht an externe Anbieter | mittel | mittel | gleiche Regel wie Plan (RB-06); Schalter je Installation | Michael |
| R6: Zusätzliche Probe-Anfragen gegen GLM-Limit | niedrig | niedrig | Cache 5 min (AN-02); Stichprobe in den ersten 3 Vorhaben | Michael (GLM-Fehler „Limit“) |
| R7: Kontext der Bausitzung reicht knapp (~105k) | mittel | mittel | Reihenfolge §6 legt Framework-Teil spät; Testausgaben mit `--reporter=dot` kurz halten | Bau-Agent |

### 10. Manuelle Schritte

<!-- leser: mensch -->

| Schritt | Wer | Wann | Erledigt |
|---|---|---|---|
| Merge der PR nach `main` (löst Auto-Deploy der UI aus, CLAUDE.md „Nie“) | Michael | nach grünem PR-Check | [ ] |
| UI-Backend auf dem Mac neu starten, damit Defaults und Code greifen (`cd ui && npm run dev:backend` bzw. bestehender Start `start:backend`) | Michael | nach Merge | [ ] |
| Nach drei Vorhaben ab Risiko mittel EK-01 auswerten; bei null Treffern Schalter „Absicht automatisch prüfen“ ausschalten (Einstellungen, Bereich Review) | Michael | nach 3 Vorhaben | [ ] |

### 11. Schätzung

<!-- leser: mensch -->

10–16 h (nach externem Review von 8–12 h angehoben). Unsicherheit: Frontend-Anzeige (Shadow-Root-Styles) und die E2E-Runde mit echten Anbietern (Ausfall nachstellen).

**Kontext für den Bau:** ~105k Tokens — Plan ~14k, zu lesende Dateien ~50k (Orchestrator 8k, Orchestrator-Test 10k, `vorhaben-service` Auszüge 10k, Frontend-Block + Knopf 11k, Rest 11k), Änderungen ~25k, Prüfausgaben ~16k. Grenze ~120k: eingehalten.

### 12. Review des Plans

<!-- leser: mensch -->

| Finding | Quelle | Entscheidung | Änderung am Plan |
|---|---|---|---|
| S1: Sonnet und Opus haben denselben Provider; die Anzeige schlüsselt Prüfer nach Provider und würde sie zusammenwerfen | Self | angenommen, weil FA-16 eine Zeile je Prüfer verlangt | §2, §3, §8 FA-16 (`provider:model`) |
| S2: Der manuelle Knopf scheitert heute still, wenn kein Plan im Puffer steht | Self | angenommen, weil FA-03 eine sichtbare Meldung verlangt | §3 Ziel-Auflösung |
| S3: Neuer Hook für Dateiänderungen ist für AK-04 nicht nötig | Self (Minimalinvasiv) | angenommen; Entscheidung 1 an Michael, weil die Absicht den Hook nannte | §3 Alternativen, §8 FA-25 |
| S4: „Plan-Mode-Plan gezeigt“ ist vor dem Klick nicht erkennbar | Self | angenommen; Ersatzregel Schritt plan/build, Entscheidung 2 an Michael | §3 Ziel-Auflösung |
| S5: Ein eigener Review-Dienst wäre sauberer getrennt | Self | abgelehnt, weil Lock, Übergabe und Wiederholung im Orchestrator schon existieren (`plan-review-orchestrator.ts:235-390`) | — |
| S6: Fußzeile von `formatInject` widerspricht den neuen Regeln („briefly justify“) | Self | angenommen, weil FA-19 nur die Beleg-Regel erlaubt | §4 #5 |
| S7: Übergabe beim nächsten Stop könnte endlos warten | Self | angenommen: höchstens 3 Versuche wie die erste Eingabe (`vorhaben-state.ts` `FIRST_INPUT_MAX_VERSUCHE`) | §3 Orchestrator |
| S8: `ui/config/general-config.json` enthält absolute Nutzerpfade (Projekt-Overrides) im öffentlichen Repo | Self | außerhalb des Umfangs; eigener Tracker-Eintrag (security.md §5), hier nicht angefasst | — |
| E1 (Blocker, 3/3): Bildung der Prüfer-Kennung `provider:model` und Gleichheit mit dem Cache-Schlüssel nicht beschrieben | MiniMax-M3, Sonnet, Opus | angenommen: eine Hilfsfunktion `pruefKennung` (Rückfall wie `plan-review-orchestrator.ts:541`) für Cache, beide Events und Inject-Text | §3 Orchestrator |
| E2 (Likely): Marke vor dem Start bleibt, auch wenn der Start sofort scheitert; Vorschlag Marke erst nach Übergabe bzw. per Inhalts-Hash | Opus, MiniMax-M3 | abgelehnt, weil die Spec genau das verlangt: Marke gilt „auch dann, wenn das erste Review scheiterte“ (spec.md AN-S03, §4 erste Zeile); angenommen nur der Teil „nicht still“: Fehler erscheint im Block | §3 Auto-Start |
| E3 (Likely): MiniMax antwortet auf die Probe auch mit falschem Modell „ok“ | MiniMax-M3, Sonnet | abgelehnt, weil gemessen und entschieden: spec.md §4 Zeile „MiniMax mit falschem Modellnamen“, AN-S05 (kein Nachfüllen im Review), AN-S07; der 0-Erfolg-Fall ist FA-22 | — |
| E4 (Likely): Michael könnte zwischen Bildschirmprüfung und Tippen selbst tippen | Opus | angenommen als Klarstellung: `submitWennLeer` läuft unter dem `withMachineWrite` aus `inject()` (`plan-review-orchestrator.ts:244`); Restfenster wie bei „Nächster Schritt“, gedeckt durch AR-08 | §3 Orchestrator |
| E5 (Likely): Knopf und Auto-Start gleichzeitig nicht geregelt | Opus | angenommen: bestehender Lock `state.locked` (`plan-review-orchestrator.ts:417-434`) gilt für jeden Start; abgelehnter Auto-Start siehe E31 | §3, §8 FA-07 |
| E6 (Likely): `reviewer.result` sendet auch nur `providerId` | MiniMax-M3 | angenommen (Beleg `plan-review-orchestrator.ts:507`, `:522`) | §3, §8 FA-16 |
| E7: Gesamt-Zeitlimit fehlt, „3 × 290 s = 15 min“ | Opus | abgelehnt, weil die Reviews parallel laufen (`Promise.allSettled`, `plan-review-orchestrator.ts:489`): Dauer = langsamster Prüfer, höchstens 300 s (`external-reviewer.ts:113`) | — |
| E8: Zeilenangaben falsch; `handlePlanDetected` ist der einzige Einstieg, nicht tot | MiniMax-M3 | angenommen: `updateGeneralConfig` steht bei `:126`; der Knopf läuft heute über `cloud-terminal-manager.ts:1791` in `handlePlanDetected` — tot ist nur der Auto-Weg; Umbau beschrieben | §2, §3 Orchestrator |
| E9: Gespeicherte Prüferauswahl alter Tabs wird nicht migriert | MiniMax-M3 | abgelehnt, weil AK-09 nur „eine neue Sitzung“ nennt (intent.md AK-09); alte Tabs mit DeepSeek fallen bei der Probe aus und werden ersetzt | §3 Prüferwahl (Satz ergänzt) |
| E10: Cache von 5 min zu lang | Opus | abgelehnt, weil Wert festgelegt: intent.md AK-06, spec.md FA-12 | — |
| E11: Gegenseitige Abhängigkeit Orchestrator ↔ `VorhabenService` | Opus | angenommen: Knopf-Auflösung wandert nach `websocket.ts`, kein `setZielResolver`; beide Dienste kennen einander nicht | §3, §5 |
| E12: Änderungsdatum zu grob auf Netzlaufwerken | Opus | abgelehnt, weil verglichen wird mit dem Sitzungsstart (Minuten Abstand), nicht zwischen zwei Schreibvorgängen; Arbeitskopien liegen lokal (`../specwright-worktrees/`, CLAUDE.md Arbeitsweise) | — |
| E13: Kein Verhalten, wenn alle Prüfer und Ersatz ausfallen | Opus | abgelehnt, weil festgelegt: ab 1 Erfolg läuft das Review (intent.md AK-11), bei 0 „Review gescheitert“ (spec.md FA-22, §4 erste Zeile) | — |
| E14: Schätzung zu knapp | Opus | angenommen: 10–16 h | §11 |
| E15: Regeln fehlen in reinen Terminal-Workflows | Sonnet | abgelehnt, weil sie in `specwright/workflows/core/intent.md` und `plan.md` stehen, die auch ohne UI laufen (Plan §4 #16, FA-20) | — |
| E16: `provider`/`providerId` uneinheitlich | MiniMax-M3 | angenommen über E1: Format ist `providerId:modelId` | §3 |
| E17: Zwei Stops vor Scan-Ende → doppelter Start | Sonnet | abgelehnt mit Beleg: Prüfen und Setzen der Marke synchron, Scan nur einmal gleichzeitig (`vorhaben-service.ts:467-480`); Test ergänzt | §3, §8 |
| E18: Verbraucher der Prüfer-Kennung nur im Frontend geprüft | Opus | abgelehnt, weil Schritt 0 schon `ui/src ui/frontend/src ui/tests` durchsucht (Plan §6 Schritt 0) | — |
| E19: Schalter sollte standardmäßig aus sein (Kundentexte an Anbieter) | MiniMax-M3 | abgelehnt, weil festgelegt: Standard an (spec.md FA-09, AN-S02 vom PO bestätigt); Datenschutz wie beim Plan (intent.md RB-06) | — |
| E20: „argue for it“ nur per grep, nicht als Test | Opus | angenommen: Test prüft beide Inject-Wege | §8 FA-19 |

**Minimalinvasiv geprüft:** Wiederverwendet: Orchestrator (Lock, Dialog-Übergabe, `pendingInject`), `pruefeEingabeWartet`/`readStableScreen`/`findDialogCue`, Stop-Rescan und Zeilen des `VorhabenService` (Status, `mtimeMs`, `cwd`), Store-Muster `abschluesse`, `buildSdkCallOptions`, `withTimeout`, Einstellungs-Merge. Gestrichen: neuer Hook-Matcher, Umbau von `mapHookPayload`, eigener Dienst, Messskript für FA-25, Budget im Code.

| E21 (Likely): `stopSeit` außerhalb des Scan-Locks befüllt → doppelter Start | Sonnet, GLM-5.3 | abgelehnt mit Beleg: Node führt `onAgentEvent` und den Durchgang nach dem Scan nie gleichzeitig aus; ein `stop` während des Scans landet über `scanDirty` (`vorhaben-service.ts:467-480`) im nächsten Durchgang, Prüfen und Setzen der Marke sind ein synchroner Block | — |
| E22 (Likely): `submitWennLeer` unsicher gegen andere Maschinen-Eingaben | MiniMax-M3, Sonnet | abgelehnt mit Beleg: `withMachineWrite` ist der eine Lock je Sitzung für alle Maschinen-Eingaben, auch die des `VorhabenService` (`vorhaben-service.ts:741`, architecture.md §2 „Maschinen-Lock“); jeder Folgeversuch nimmt ihn neu und liest neu | §3 (Satz ergänzt) |
| E23 (Likely): Nach 3 gescheiterten Übergaben startet der Knopf ein neues Review statt das Ergebnis einzufügen | Opus, MiniMax-M3 | angenommen: `pendingInject` mit `art` + `pfad`, Knopf mit gleichem Ziel fügt ein | §3, §8 |
| E24: Zwei Übergabe-Verträge (Dialog ohne Enter, Eingabezeile mit Enter) vermischt | MiniMax-M3 | abgelehnt mit Beleg: die Zweige bleiben getrennt (`plan-review-orchestrator.ts:284-305`), `submitWennLeer` ersetzt nur den Zweig ohne Dialog | §3 (Satz ergänzt) |
| E25: Cache-Kollision, wenn `modelId` fehlt | Sonnet | abgelehnt: ohne `modelId` nimmt das SDK das Standardmodell des Anbieters (`external-reviewer.ts:60`), zwei solche Einträge sind dasselbe Modell, ein gemeinsamer Schlüssel ist richtig | — |
| E26: Neue `/intent`-Sitzung ist beim Stop evtl. noch nicht zugeordnet | GLM-5.3 | angenommen (Beleg `vorhaben-service.ts:382`, `:1489-1503`: Zuordnung erst über `dir-added`): Eintrag bleibt, bis die Zeile zugeordnet ist; Test ergänzt | §3 Auto-Start, §8 |
| E27: `stop` während laufendem Scan wird erst im nächsten Durchgang geprüft | Opus | abgelehnt: das ist gewollt und harmlos (`scanDirty`), Verzögerung ≤ ein Scan | — |
| E28: Cache nach Änderung der Ersatzreihe veraltet | Opus | abgelehnt: Cache ist je Modell, neue Modelle haben keinen Eintrag und werden geprobt | — |
| E29: `pendingInject` von Plan und Absicht im selben Feld | GLM-5.3 | angenommen: Schlüssel `art` + `pfad`, Regeln für Schalter und Unterdrückung festgelegt | §3 |
| E30: Erste Eingabe und Review-Übergabe am selben Stop | GLM-5.3 | angenommen: `beschaeftigt` zählt nicht, Übergabe beim nächsten Stop | §3 |
| E31: Abgelehnter Auto-Start bei laufendem Plan-Review verfällt still | GLM-5.3 | angenommen: `beschaeftigt` setzt keine Marke, Prüfung beim nächsten Scan (ersetzt die Regel „Marke bleibt“ aus E5) | §3, §8 |
| E32: `review-ziel.ts` könnte Node-Abhängigkeiten ins Frontend ziehen | Opus | abgelehnt: die Datei importiert nur Typen; `verify` baut das Frontend (CLAUDE.md Befehle), ein Node-Import bricht dort | — |
| E33: Rohpuffer-Zweig ohne Lock-Angabe | Opus | abgelehnt mit Beleg: läuft in `injectUnlocked` unter demselben Lock (`plan-review-orchestrator.ts:244`), wartet ohne Dialog nach §3 | — |
| E34: `createdAt` einer wiederhergestellten Sitzung ist der ursprüngliche Start | Opus | abgelehnt: richtig so (Beleg `cloud-terminal-manager.ts:2023`) — eine Absicht, die nach dem ursprünglichen Start geschrieben wurde, stammt aus dieser Sitzung; Marke verhindert Wiederholung | — |
| E35: Auswahl bei mehreren Ersatzprüfern desselben Anbieters unklar | Opus | abgelehnt: festgelegt in §3 Auswahl Schritt 3 (Reihenfolge der Liste, fehlender Anbieter zuerst, `ersatzFuer` in Reihenfolge der Ausfälle); Test FA-13 | — |
| E36: Fehlervertrag von `extractPlanFromBuffer` | Sonnet | angenommen als Klarstellung (`null`, kein Lesefehler) | §3 |
| E37: `stopSeit` wächst unbegrenzt | Sonnet | angenommen: Entfernen nach Prüfung und beim Schließen | §3 |
| E38: Übersprungene Auto-Starts nicht protokolliert | Sonnet | angenommen: eine Log-Zeile je Grund | §3 |
| E39: E2E hängt am Trust-Dialog | Opus | abgelehnt: E2E ist ein manuelles Protokoll, die Tastenfolge steht als bekannter Fehler in CLAUDE.md | — |
| E40: Entscheidung 3 widerspricht dem Auto-Weg | MiniMax-M3 | abgelehnt mit Beleg: `reportReviewStatus` setzt `review-failed` nur bei `agentStatus === 'blocked'` (`plan-review-orchestrator.ts:220`); nach dem Stop von `/intent` ist die Sitzung nicht blockiert, also kein oranger Punkt | — |
| E41: Validierung des Absicht-Auftrags unklar | MiniMax-M3 | angenommen: wie `reviewPrompt`, leer wird abgelehnt | §3 Einstellungen |
| E42: Kosten-Nutzen der Probe nicht abgewogen | MiniMax-M3 | abgelehnt: entschieden in spec.md AN-S08 und intent.md AN-02 (Cache), gemessen ~4 s je Probe (spec.md §7) | — |

**Externes Review (Plan Mode, 2026-10-27):** zwei Runden. Runde 1: 3 von 4 Prüfern erfolgreich (MiniMax-M3, Sonnet, Opus). Runde 2: 4 von 4 (Sonnet, Opus, MiniMax-M3, GLM-5.3), E21–E42. Die Befundlisten und ihre Einstufung stammen aus der heutigen Fassung des Reviews (mit „argue for it“); entschieden ist trotzdem schon nach den neuen Regeln: jede Ablehnung mit Beleg, keine Schweregrade herabgestuft.

**Abgleich Mensch/Agent:** „In einfachen Worten“, §9, §10, §12 gegen §2–§8 gelesen am 2026-10-27: ohne Befund.

### 13. Definition of Done

<!-- leser: agent -->

- [ ] Jede FA/AK aus Abschnitt 8 hat einen grünen Test.
- [ ] Alle Nachweise aus Abschnitt 5 ausgeführt und im PR zitiert.
- [ ] E2E-Pfad läuft (Abschnitt 8).
- [ ] `verify` grün, Ausgabe im PR — und PR-Checks grün (CI ist die Wahrheit).
- [ ] `docs/architecture.md` angepasst (Abschnitt 3 „Ja“, Beschreibung), ADR-0002-Vermerk, product-brief §8.
- [ ] Manuelle Schritte (Abschnitt 10) erledigt oder im PR als offen markiert.
- [ ] Abweichungen von diesem Plan in Abschnitt 14 eingetragen.
- [ ] 2x-Regel-Check: Fehler, der zum zweiten Mal vorkam → zuerst automatische Prüfung (Hook, Lint, Test); sonst nummerierte Regel in `docs/architecture.md` (AR/AP); `CLAUDE.md` nur, wenn nicht aus dem Code ablesbar und für jede Aufgabe gültig. Vorschlag im PR.
- [ ] Abschlussbericht nach R3 (nur Mensch-Abschnitte im Chat), endet mit dem Block „Für das Board“ (Projekt, Tracker-Eintrag, Zielstatus, PR-Link, Stand, Verweis auf `intent/INT-2026-037-review-absicht-und-plan/`; Board-Karte nur bei Internem); Tracker nachgezogen, Board nur bei Internem; Nachziehen in eigener Sitzung.

### 14. Abweichungen bei der Umsetzung

<!-- leser: mensch -->

| Datum | Abweichung | Grund | Auswirkung auf Abschnitt |
|---|---|---|---|
| — | — | — | — |
