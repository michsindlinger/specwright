# Plan: UI: Nächster Schritt startet in der fertigen Sitzung — /clear, dann Befehl

> **Intent:** `intent.md` (INT-2026-018) · **Spec:** entfällt (bypass: Größe S, eine Freigabe-Regel im Backend, ein Startweg über den vorhandenen gesicherten Schreibpfad, Hinweistext im Kasten; kein neues Datenobjekt)
> **Status:** umgesetzt — Merge PR #82 (`289f831`), 2026-09-18
> **Erstellt:** 2026-09-18 im Plan Mode · **Freigabe:** Product Owner (Michael Sindlinger), 2026-09-18 — im Chat: „freigabe, O1 wie vorgeschlagen"
> **Pflichtinput gelesen:** `docs/architecture.md` (Stand `d26e26e`), `CLAUDE.md`, `docs/security.md`

<!-- Der Plan ist TECHNISCH und die EINHEIT DER AUSFÜHRUNG. Eine Sitzung setzt ihn ganz um.
     Maßstab: Ein neues Teammitglied könnte allein anhand dieses Dokuments umsetzen.
     Jede Änderung verweist auf ein AK (intent.md). Keine Änderung ohne Herkunft.
     Zwei Leser: „In einfachen Worten" liest die Person, die freigibt; „Details" liest der Agent, der baut. Die erste Zeile unter jeder
     Überschrift sagt, für wen der Abschnitt ist (R1, specwright/workflows/meta/leser-und-rueckfragen.md). Marker übernehmen, keinen entfernen. -->

## In einfachen Worten

<!-- leser: mensch -->

**Worum geht es?** Auf der Vorhaben-Seite steht unten der Kasten „Nächster Schritt" mit Modellwahl, Arbeitskopie und dem Knopf, der die nächste Phase startet (zum Beispiel „Plan erstellen"). Heute ist dieser Knopf ausgegraut, solange irgendeine Sitzung des Vorhabens lebt — auch wenn diese Sitzung ihre Arbeit längst erledigt hat und nur noch die leere Eingabezeile zeigt. Du musst die Sitzung erst schließen oder im Terminal von Hand `/clear` und den Befehl tippen. Genau das zeigten deine beiden Screenshots vom 17.09.: die Absicht-Sitzung meldet „done", und der Kasten sagt trotzdem „Sitzung arbeitet oder wartet". Das ist bei jedem Phasenwechsel im Weg.

**Was ändert sich?** Nach diesem Vorhaben gilt: Ist die Sitzung des Vorhabens mit ihrer Phase fertig und wartet ruhig — kein Dialog offen, keine Freigabe offen, keine erste Eingabe mehr unterwegs —, dann ist der Knopf frei. Der Kasten sagt dir vor dem Klick, was passieren wird. Solange das Backend noch keine Meldung von einer Sitzung hat (Zustand „unbekannt", zum Beispiel direkt nach einem Neustart), bleibt der Knopf ebenfalls gesperrt und sagt das. Sind Modell und Arbeitskopie im Kasten dieselben wie in der laufenden Sitzung, steht dort „in der laufenden Sitzung ‚intent INT-…': /clear, dann /specwright:plan INT-…". Der Klick leert dann das Gespräch in genau dieser Sitzung und startet darin den Befehl der nächsten Phase — du siehst im angedockten Terminal `/clear` und danach den Befehl, so als hättest du es getippt; der Tab heißt danach nach dem neuen Schritt, und die Seite zeigt dieselbe Sitzung als Sitzung des neuen Schritts. Wählst du im Kasten ein anderes Modell oder eine andere Arbeitskopie, sagt der Kasten „in einer neuen Sitzung — die laufende ‚…' wird geschlossen", und der Klick tut genau das: neue Sitzung mit dem Befehl, die alte verschwindet als Tab. Der Kasten schlägt als Voreinstellung das Modell und die Arbeitskopie der laufenden Sitzung vor, damit der normale Klick der einfache Weg ist (siehe „Was musst du entscheiden?"). Gibt es keine lebende Sitzung, startet der Knopf wie heute eine neue. Eine Sitzung, die noch arbeitet, einen Dialog zeigt oder zur selben Phase gehört wie der nächste Schritt (etwa die Plan-Sitzung, die auf deine Antwort zur `plan.md` wartet), bleibt gesperrt — und der Kasten nennt jetzt den genauen Grund statt des Einheitssatzes. Der Sonderfall „Bau fortsetzen" (unterbrochener Bau mit `build-stand.md`) bleibt wie heute: neue Sitzung, ohne die alte zu schließen.

**Wie wird das gemacht?** Drei Bausteine, alle im vorhandenen Gerüst.

Erstens die Freigabe-Regel. Sie lebt im Backend, weil nur das Backend weiß, für welchen Schritt eine Sitzung gestartet wurde (die Zuordnung Sitzung↔Vorhaben trägt den Schritt). Die Regel geht die Gründe in fester Reihenfolge durch: Sitzung arbeitet? Dialog offen? Erste Eingabe noch unterwegs? Ein Dokument wartet auf deine Freigabe? Sitzung gehört zum selben (oder einem späteren) Schritt? Trifft nichts zu und die Sitzung gehört zu einer früheren Phase, ist der Knopf frei. Das Backend liefert mit jeder Zeile den Grund (oder „frei") mit, und dazu die Sitzung, die der Klick weiterverwenden würde, samt Modell und Arbeitskopie. Der Browser rechnet nichts nach; er zeigt den Text und vergleicht nur deine Auswahl im Kasten mit dem, was das Backend über die Sitzung sagt, um den richtigen Hinweissatz zu wählen.

Zweitens der Startweg „in der Sitzung". Es gibt schon einen gesicherten Weg, Text in eine laufende Sitzung zu schreiben — den benutzt die Freigabe: Bildschirm zweimal stabil lesen, prüfen, dass kein Dialog sichtbar ist, den Text als „Einfügen" schicken, kurz warten, Enter, und das Ganze unter einem Schloss, damit nie zwei Schreiber gleichzeitig tippen. Der neue Weg macht genau das zweimal hintereinander unter einem einzigen Schloss: erst `/clear`, dann der Befehl. Vor dem `/clear` verlangt das Backend außerdem, dass der Bildschirm der Sitzung die leere Eingabezeile zeigt und kein Spinner läuft — nicht nur, dass der gemeldete Status „fertig" heißt. Der Grund: Claude Code puffert Eingaben, die während der Arbeit ankommen, und führt sie nach dem Turn aus; ein `/clear`, das zu früh ankäme, würde Minuten später ein Gespräch löschen, ohne dass unser Befehl folgt. Zwischen beiden wartet das Backend auf ein hartes Signal, dass das Leeren wirklich passiert ist: Claude Code meldet nach `/clear` über seinen Start-Hook eine **neue Gesprächskennung** — dieselbe Meldung, die seit INT-2026-019 für die Wiederaufnahme gespeichert wird. Kommt sie binnen fünf Sekunden nicht, bricht das Backend ab und meldet es im Kasten; der Befehl wird dann nicht blind hinterhergeschickt. Nach dem erfolgreichen Befehl schreibt das Backend die Zuordnung auf den neuen Schritt um, benennt den Tab, merkt sich das Modell für diesen Schritt und stößt die Seite an. Danach kommt ohnehin der Hook, der einen getippten Befehl erkennt (seit INT-2026-016), und bestätigt dasselbe.

Drittens der Startweg „neue Sitzung, alte schließen". Der ist der heutige Start, plus ein Schließen der alten Sitzung danach — und zwar erst, wenn die neue steht (schlägt der Start fehl, bleibt die alte unangetastet). Das Schließen läuft so, als hättest du im Terminal auf das ✕ geklickt: alle Geräte lassen den Tab fallen.

Für den Kasten heißt das: Voreinstellung Modell und Arbeitskopie der laufenden Sitzung, ein Hinweissatz, der zu deiner Auswahl passt, und bei Sperre der genaue Grund. Für die Meldung nach dem Klick gibt es zwei Toasts: „Nächster Schritt in der laufenden Sitzung gestartet" oder „Sitzung gestartet — die vorige wurde geschlossen".

Eine Korrektur am Intent nebenbei: Die Begründung „der Cloud-Host erlaubt höchstens fünf Sitzungen" stimmt nicht mehr — der Deckel wurde am 18.02.2026 entfernt, die Grenze ist unendlich. Das RAM-Argument (jeder Claude-Prozess kostet Speicher auf dem Droplet) bleibt und reicht als Grund gegen eine zweite Sitzung neben einer fertigen.

**Was kann schiefgehen?**

- Ein eingefügtes `/clear` wird von Claude Code vielleicht anders behandelt als ein getipptes (zum Beispiel öffnet sich das Befehlsmenü, und Enter wählt den falschen Eintrag). Das prüft die Bausitzung als erstes in einem Scratch-Projekt, bevor Code entsteht (Schritt 0). Klappt es nicht, wird der Sendeweg angepasst (Tastenfolge statt Einfügen); die Regel und der Rest bleiben.
- Die Meldung „neue Gesprächskennung" bleibt aus (Hook kaputt, Claude Code verhält sich anders): dann meldet der Kasten nach fünf Sekunden „Leeren nicht bestätigt", nichts weiter passiert, und du kannst es erneut versuchen oder `/clear` selbst tippen. Das ist absichtlich der vorsichtige Weg — lieber einmal zu oft stoppen als den Befehl in ein volles Gespräch schicken. Die Meldung läuft nicht übers Netz, sondern auf demselben Rechner von Claude Code zum Backend (gemessen bei früheren Vorhaben: rund 0,2 Sekunden); die fünf Sekunden sind Sicherheitsabstand. Sollte die Probe in Schritt 0 zeigen, dass Claude Code nach `/clear` gar keine neue Kennung vergibt, nimmt die Bausitzung stattdessen die Start-Meldung von Claude Code selbst als Signal (sie sagt „Quelle: clear") — eine kleine Umstellung, der Rest bleibt gleich.
- Während das Backend auf diese Bestätigung wartet (höchstens fünf Sekunden), ist genau diese eine Sitzung für andere automatische Eingaben gesperrt — etwa die Freigabe aus dem Dokument. Die bekommt dann „die UI schreibt gerade in die Sitzung — gleich noch einmal", wie heute schon bei zwei gleichzeitigen Eingaben. Andere Sitzungen sind nicht betroffen.
- Der Kasten belegt immer die Arbeitskopie der laufenden Sitzung vor, auch wenn sie in der Liste zunächst fehlt (zum Beispiel ein Worktree, der erst nach dem Öffnen der Seite angelegt wurde): dann lädt er die Liste neu oder ergänzt den Eintrag. Er springt nie stillschweigend auf „Im Projekt" zurück — sonst würde der Standardklick unbemerkt eine neue Sitzung starten statt weiterzuarbeiten.
- Zwischen `/clear` und dem Befehl taucht ein Dialog auf (unwahrscheinlich, weil die Sitzung ruhig wartete): der Bildschirm wird vor jedem Einfügen gelesen, ein Dialog stoppt den Vorgang, der Kasten meldet es, der Knopf bleibt frei.
- Du klickst zweimal schnell oder von zwei Geräten: das Schloss lässt nur einen Schreiber durch, der zweite bekommt „die UI schreibt gerade in die Sitzung — gleich noch einmal". Nach dem ersten erfolgreichen Klick gehört die Sitzung dem neuen Schritt, und der Knopf ist wieder gesperrt.
- Du wählst eine andere Arbeitskopie: die alte Sitzung wird geschlossen, und wenn sie in einer eigenen Sitzungs-Arbeitskopie lief, räumt das System diese wie heute beim Schließen weg (nur wenn nichts Ungespeichertes drin liegt; der Branch bleibt). Liegen die Vorhaben-Dokumente nur dort, verschwindet die Zeile aus der Liste, bis eine Arbeitskopie für den Branch wieder existiert. Das ist heute beim Schließen von Hand genauso und steht als Karte im Board (Arbeitskopie eines offenen Vorhabens beim regulären Ende behalten). Der Kasten sagt vor dem Klick, dass die laufende Sitzung geschlossen wird.
- Rückgängig: kein Datenformat ändert sich (die Zuordnungsdatei behält ihre Felder), kein neuer Endpunkt, kein Secret. Ein Revert der PR stellt den heutigen Stand her.

**Was musst du entscheiden?**

- O1, Voreinstellung im Kasten bei lebender, freier Sitzung: Vorschlag — Modell und Arbeitskopie der laufenden Sitzung vorbelegen (der normale Klick ist dann „/clear, dann Befehl"), nicht wie heute das zuletzt gewählte Modell des Schritts oder der Schritt-Standard aus den Einstellungen. Grund: der Intent sagt „Modell und Arbeitskopie bleiben"; mit dem Schritt-Standard als Voreinstellung würde der Klick oft stillschweigend eine neue Sitzung starten, nur weil die Einstellungen für „plan" ein anderes Modell nennen. Nach dem Klick wird das benutzte Modell wie heute als „zuletzt gewählt" für den Schritt gemerkt (AK-09). — **Entschieden 2026-09-18 (Product Owner): wie vorgeschlagen.**

Sonst nichts — Freigabe erteilt am 2026-09-18.

## Details

<!-- leser: mensch -->

<!-- Volle technische Tiefe: Dateien, Funktionen, Datenmodell, Tradeoffs, Testplan. Geht an Reviewer und in die Bausitzung, muss für sich stehen.
     Confidence-Tags in beiden Teilen: [Certain] harte Belege · [Likely] starke Inferenz · [Uncertain] Vermutung. -->

### 1. Kurzfassung

<!-- leser: mensch -->

Die Freigabe-Regel des Knopfs wird eine reine Funktion im Reader (`deriveNextStepSperre`), die den Schritt der Zuordnung kennt und je Zeile einen Grund oder „frei" liefert; die Zeile trägt außerdem die wiederverwendbare Sitzung mit Modell und Ziel (`nextStep.sitzung`). `startStep` bekommt drei Wege: in der Sitzung (`/clear` und Befehl als zwei gesicherte Pastes unter einem `withMachineWrite`, dazwischen Warten auf `session.hook-context` mit neuer Gesprächskennung), neue Sitzung plus Schließen der alten (`closeSession(id, { closedBy: 'user' })`), oder wie heute. Der Kasten zeigt den Grund der Sperre, die passende Ankündigung und belegt Modell und Arbeitskopie der Sitzung vor. Am Ende: Reader-Regel mit Tests, Service-Startweg mit Tests, ein optionales Argument am Manager, drei optionale Felder in der Sitzungsreferenz des Protokolls, Kasten und Toast im Frontend, ein Satz in `architecture.md` §2/§3 und `design.md`.

### 2. Ausgangslage im Code

<!-- leser: agent -->

<!-- Was existiert, was wiederverwendet wird, was heute anders läuft als gedacht. Mit Datei:Zeile. Das ist der Teil, der Plan-Mode-Recherche festhält. -->

Alle Zeilen gegen `origin/main` `f2ff8eb` (Branch `session/next-action` am 18.09. darauf rebased — die Zeilen im Intent vom 17.09. stimmen seit INT-2026-019/020 nicht mehr).

| Bereich | Heute (Datei:Zeile) | Bedeutung für dieses Vorhaben |
|---|---|---|
| Sperre des Knopfs | `ui/src/server/services/vorhaben-reader.ts:483` — `sessionBusy = live && (arbeitet \| wartet \| wartet_auf_dich \| Dialog)`; `bau_unterbrochen` zählt nicht (deshalb ist „Bau fortsetzen" heute bei ruhender Sitzung frei) | muss geändert werden: Regel wird eine Funktion mit Schritt-Vergleich; `sessionBusy` bleibt als Feld (`= !!sperre`), damit 32 Fixture-Stellen in 10 Testdateien stehen bleiben [Certain] |
| Zustand aus Sitzung | `vorhaben-reader.ts:206-246` `deriveZustand`; `isWartetImDialog` `:204` | wiederverwendbar: Statuszweige `working`/`blocked`/`done`/`idle` |
| Sitzungsreferenz an den Browser | `ui/src/shared/types/vorhaben.protocol.ts:73-93` `VorhabenSessionRef` (id, name, model, agentStatus, blockKind, ended, firstInputPending, resumed) — **kein** Schritt, kein Provider, kein Ziel | Falle aus dem Intent bestätigt: Reader sieht den Schritt der Zuordnung nicht → drei optionale Felder `step`, `provider`, `target` |
| Referenz bauen | `ui/src/server/services/vorhaben-service.ts:1184-1210` `sessionFor` (liest Zuordnung `a.step`, `a.model`, `a.cwd`, `a.provider`), `sessionRefOf`; Pending-Refs `:837-845`, `:574`, `:1159` | wiederverwendbar; `sessionFor` kennt Projekt und Zuordnung, kann das Ziel (`main` vs `existing-worktree`) mit `safeKey` bestimmen wie `doResume` (12) `:1025` |
| Startweg | `vorhaben-service.ts:699-767` `startStep`: Modell auflösen (`lastModel` → `defaultModel`), `parseSessionTarget`, `createSession(… command …)`, `setSessionName`, `setAssignment`/`setPendingIntent`, `setLastModel`, `setFirstInput` | wiederverwendbar; bekommt die Weiche davor |
| Gesicherter Schreibpfad | `vorhaben-service.ts:645-692` `pasteLocked`: `readStableScreen` (`dialog-driver.ts:82-93`) → `findDialogCue` (`:37-46`) → `PASTE_START+text+PASTE_END` → 150 ms (`PASTE_ENTER_DELAY_MS` `:185`) → `\r`, alles unter `sessions.withMachineWrite` (`cloud-terminal-manager.ts:553-562`, `beschaeftigt` bei zweitem Schreiber) | wiederverwendbar; Falle: `pasteLocked` löst den Aufrufer schon beim Paste auf und hält das Schloss bis Enter — für zwei Pastes unter **einem** Schloss werden Bildschirmprüfung und „Paste, Pause, Enter" als zwei Helfer herausgezogen, `pasteLocked` bleibt semantisch gleich |
| Getippter Phasen-Befehl | `vorhaben-service.ts:889-922` `onPromptText` → `detectV4Command` `:220` → `moveAssignment` (Schritt, Modell, cwd, `sessionContext`) | wiederverwendbar (AN-03 bestätigt): der gepastete Befehl löst denselben Hook; nur Tab-Name und `lastModel` fehlen — die schreibt der neue Weg selbst |
| Signal „Gespräch geleert" | Hooks-Konfiguration `ui/src/server/services/claude-hooks.ts:66` `SessionStart` mit Matcher `startup\|resume\|clear\|fork`; `mapHookPayload` `:250-252` → `session-start`; Route `cloud-terminal.routes.ts:80-89` ruft **zuerst** `reportHookContext` (`cloud-terminal-manager.ts:527-541`, emittiert `session.hook-context` nur bei geänderter `claudeSessionId`), dann `reportAgentEvent`; Service-Listener `vorhaben-service.ts:795`, `:812-816` `onHookContext` → `store.setSessionContext` | wiederverwendbar als hartes Signal: `/clear` bringt eine neue `session_id` [Likely, Claude-Code-Doku „source: clear"; Probe in Schritt 0]. Falle: das Ereignis `session.agent-event` `session-start` ist **kein** verlässliches Signal — `applyAgentEvent` `:466-471` emittiert nicht, wenn der Status schon `idle` war (Verfall nach `AGENT_IDLE_AFTER_MS`, `cloud-terminal.protocol.ts:672`, 10 min) |
| Status nach `/clear` | `agent-status.ts:25-26`: `session-start` → `idle`; danach `prompt-submitted` → `working` (`:27-28`); `agentDoneAt` wird bei `session-start` gelöscht (`cloud-terminal-manager.ts:482-483`) → Glocken-Marke weg | AK-06: `arbeitet` kommt mit dem `UserPromptSubmit`-Hook des Befehls (~100–300 ms nach Enter) [Likely]; zwischen `/clear` und Befehl ist die Zeile durch die neue Zuordnung (`gleiche_phase`) gesperrt |
| Schließen einer Sitzung | `cloud-terminal-manager.ts:1275-1323` `closeSession` (killt PTY/tmux, `disposeSessionWorktree` mit Nachfolger-Übergabe `:1167-1199`, emittiert `session.closed(id, exitCode)`); `websocket.ts:2050-2064` Listener setzt `closedBy: 'user'` nur, wenn die Kennung in `userClosedSessionIds` liegt (`:102`, gesetzt in `handleCloudTerminalClose` `:2584-2587`); Frontend `app.ts:1241` lässt den Tab nur bei `closedBy === 'user'` fallen; `VorhabenSessionSource.closeSession?` `vorhaben-service.ts:122` (Resume-Pfad `:1046`) | muss geändert werden: das Schließen aus dem Service soll wie ein Klick auf ✕ wirken (Z-02) → `closeSession(id, { closedBy?: 'user' })`, Emit mit drittem Argument, Listener liest es; `userClosedSessionIds` entfällt (eine Mechanik statt zwei) |
| Arbeitskopie beim Schließen | `disposeSessionWorktree` → `removeCloudSessionWorktree` (`ui/src/server/utils/cloud-session-worktree.ts:339-396`): nur eigene Sitzungs-Worktrees (`session-…`), nur wenn sauber, `git branch -d` (scheitert harmlos bei unmerged); Nachfolger in derselben Kopie bekommt das Cleanup-Token (`:1181-1198`) | Falle (§9): AK-05 mit anderer Kopie räumt die Sitzungs-Arbeitskopie der alten Sitzung; AK-05 mit gleicher Kopie und anderem Modell: neue Sitzung ist Nachfolger → Kopie bleibt (Token wandert). Reihenfolge im Service: erst neue Sitzung, dann schließen |
| Sitzungsdeckel | `cloud-terminal.protocol.ts:657` `MAX_SESSIONS: Infinity` (seit `1cc2f1a`, 18.02.2026); `cloud-terminal-manager.ts:719` prüft dagegen | Intent §1/RB-03 „höchstens fünf" ist überholt [Certain]; RAM-Argument bleibt (AR-02) |
| Kasten | `ui/frontend/src/components/vorhaben/aos-naechster-schritt.ts`: `gesperrt` (reflektiert, `:42`), fester Sperrtext `:232`, Titel `:214`, Vorauswahl `vorauswahl(models, step, lastModel)` `:168-171` (`model-wahl.ts:36-41`), Ziel `target = 'main'` `:49`, `willUpdate` `:141-144`, `start()` `:184-202` → `vorhabenService.startStep` → Event `vorhaben-session-started` | muss geändert werden: Props `sperre`, `sitzung`; Vorauswahl aus der Sitzung (O1); zwei Hinweissätze; Vorauswahl nur bei Wechsel von Schritt oder Sitzungskennung neu setzen, sonst überschreibt jeder Broadcast die Wahl (Falle: neue Zeilenobjekte je `vorhaben:state`) |
| Seite | `aos-vorhaben-seite.ts:799-814` `renderNextStep` gibt `.gesperrt=${r.sessionBusy}`; `liveSession()` `:447-451`; Freigabe-Pfade `:531-543`, `:583-602` (`startFreigabe` nur ohne lebende Sitzung) | Seite reicht zwei weitere Props durch; Freigabe unverändert (NZ-02) |
| Toast nach Start | `ui/frontend/src/views/aos-vorhaben-view.ts:326-343` `onSessionStarted` (Text nach `firstInput`/`neueAbsicht`; Handy öffnet das Terminal mit der Kennung) | wiederverwendbar; Event-Detail bekommt `modus`, `geschlossen` |
| Handler und Antwort | `vorhaben-handler.ts:211-240` `start-step` → `vorhaben:step-started {sessionId, projectId, intentId, step}` (`vorhaben.protocol.ts:579-586`); Frontend `vorhaben.service.ts:159-175` | Antwort bekommt `modus: 'neu' \| 'in_sitzung'`, `geschlossen?` |
| Fehlercodes | `vorhaben.protocol.ts:649-684` `VorhabenErrorCode` (zuletzt `RESUME_RUNNING`, `PASTE_IMAGE_*`); Texte `FREITEXT_GRUND_TEXT` `:267-284`, `SEND_REASON_TEXT` `vorhaben-service.ts:248` | wiederverwendbar für AK-08-Meldungen; zwei neue Codes `SESSION_BUSY`, `SESSION_WRITE_FAILED` |
| Verdrahtung | `websocket.ts:117-128` Guards, `:133-143` `VorhabenService`-Deps (`sessions: this.cloudTerminalManager`) | keine neue Dep nötig, wenn das Schließen über `sessions.closeSession(id, { closedBy: 'user' })` läuft |
| Tests | Reader `ui/tests/unit/vorhaben-reader.test.ts:246-268` (FA-21, erwartet `done` → busy — bleibt gültig, weil ein Ref ohne `step` als „gleiche Phase" zählt); Service-Fakes `vorhaben-service-resume.test.ts:39-125` (`FakeManager` mit `withMachineWrite`, `readScreen`, `closeSession`, `hook()`); Kasten `aos-neue-absicht.test.ts:164-197`; Seite `aos-vorhaben-seite-chips.test.ts:126-138`; Handler `vorhaben-service-stage2.test.ts:474-501`, `stage4:225-290`; Manager-Close `cloud-terminal-restore.test.ts:519`, `:560` | wiederverwendbar; neue Datei `vorhaben-service-naechster-schritt.test.ts` nach dem `FakeManager`-Muster |
| Hook `protect-tests` | `.claude/hooks/protect-tests.sh:12-31` blockt Testdateien nur bei `.claude/fix-mode` | Spec-Änderung an bestehenden Tests (Sperrtext, `gesperrt`) ist erlaubt; kein Fix-Modus |

Nicht gefunden: eine Stelle, die ein eingefügtes `/clear` schon einmal maschinell gesendet hätte — bisher wurden nur Freitexte und Antworten gepastet, Befehle liefen als `initialPrompt` beim Start oder wurden getippt (INT-2026-016 E2E). `[Uncertain]` bis Schritt 0: ob Claude Code ein per Bracketed Paste eingefügtes `/clear` mit Enter genauso ausführt wie ein getipptes (Befehlsmenü, Exakt-Treffer). Prüfweg in §6 Schritt 0.

### 3. Entwurf

<!-- leser: agent -->

#### Ansatz

<!-- leser: agent -->

**Protokoll (`ui/src/shared/types/vorhaben.protocol.ts`).**

```ts
/** INT-2026-018 (AK-01–AK-03): why „Nächster Schritt" is locked; absent = usable. Checked in this order. */
export type VorhabenNextStepSperre = 'arbeitet' | 'dialog' | 'unbekannt' | 'erste_eingabe' | 'freigabe_offen' | 'gleiche_phase';
export const NEXT_STEP_SPERRE_TEXT: Record<VorhabenNextStepSperre, string> = {
  arbeitet: 'Sitzung arbeitet — erst danach kann der nächste Schritt starten',
  dialog: 'Sitzung zeigt einen Dialog — im Terminal antworten, dann kann der nächste Schritt starten',
  unbekannt: 'Zustand der Sitzung unbekannt — im Terminal nachsehen; sobald sie ruhig wartet, ist der Knopf frei',
  erste_eingabe: 'Sitzung startet — die erste Eingabe wird noch übergeben',
  freigabe_offen: 'ein Dokument wartet auf deine Freigabe — erst freigeben, dann kann der nächste Schritt starten',
  gleiche_phase: 'die Sitzung gehört schon zu diesem Schritt — im Terminal fortsetzen oder freigeben',
};
export interface VorhabenSessionRef {
  …
  /** INT-2026-018: step the assignment was made for (pending `/intent`: `intent`). Absent (old client, fixture) counts as „same phase" — locked. */
  step?: VorhabenStep;
  /** INT-2026-018: provider of `model` (assignments before INT-2026-019: absent → `anthropic`). */
  provider?: string;
  /** INT-2026-018 (AK-04/AK-05): where the session runs, as the picker names it — `main` or `existing-worktree` (safeKey against the project path, like `doResume`). */
  target?: CloudTerminalSessionTarget;
}
export interface VorhabenNextStep {
  step; command; label;
  /** INT-2026-018: why the button is locked; absent = usable. `VorhabenRow.sessionBusy` is `!!sperre`. */
  sperre?: VorhabenNextStepSperre;
  /** INT-2026-018 (AK-04, AK-05, AK-07): the live session the click continues in when model and target match (`/clear`, then the command) — else a new session starts and this one is closed. Absent: a new session starts and a live one stays (none, or „Bau fortsetzen", NZ-04). */
  sitzung?: { id: string; name: string; model: ModelSelection; target: CloudTerminalSessionTarget };
}
export interface VorhabenStepStartedMessage { …; /** INT-2026-018 */ modus: 'neu' | 'in_sitzung'; /** AK-05: id of the closed session */ geschlossen?: string; }
export type VorhabenErrorCode = … | 'SESSION_BUSY' /* rule refused (message = NEXT_STEP_SPERRE_TEXT) */ | 'SESSION_WRITE_FAILED' /* AK-08: /clear or command not written (message = reason) */;
```

`VorhabenRow.sessionBusy` bleibt (Kommentar: „`= !!nextStep?.sperre`, INT-2026-018"). `VorhabenAssignment` (Store, ADR-0002) bleibt unverändert — Schritt, Modell, cwd, Provider und Gesprächskennung stehen schon drin.

**Reader (`vorhaben-reader.ts`) — die Regel als reine Funktion, RB-02.**

```ts
const STEP_ORDER: Record<VorhabenStep, number> = { intent: 0, spec: 1, plan: 2, build: 3 };

/** INT-2026-018 (AK-01–AK-03, AK-10, NZ-04): first reason that locks the next step; undefined = usable. */
export function deriveNextStepSperre(input: {
  session: VorhabenSessionRef | undefined;
  nextStep: VorhabenStep;
  freigabeDoc: VorhabenDocKey | undefined;
  /** phase `bau` with build-stand.md: „Bau fortsetzen" keeps today's rule (no phase check). */
  interrupted: boolean;
}): VorhabenNextStepSperre | undefined {
  const s = input.session;
  if (!s || s.ended) return undefined;                                   // AK-10
  if (s.agentStatus === 'working') return 'arbeitet';                     // AK-02
  if (s.agentStatus === 'blocked') return 'dialog';                       // AK-02
  if (s.agentStatus === 'unknown') return 'unbekannt';                    // Review E14: no hook yet / restored without status — never „ruhig wartend"
  if (s.firstInputPending) return 'erste_eingabe';                        // AK-01 „keine Ersteingabe ausstehend"
  if (input.freigabeDoc) return 'freigabe_offen';                         // AK-01 „keine Freigabe offen" (phase bau never has one, E18)
  if (input.interrupted) return undefined;                                // NZ-04 („Bau fortsetzen" wie heute)
  if (s.step === undefined || STEP_ORDER[s.step] >= STEP_ORDER[input.nextStep]) return 'gleiche_phase'; // AK-03
  return undefined;                                                       // AK-01
}
```

`error`-Status zählt wie heute als beendet (`deriveZustand` → `sitzung_beendet`): `!s.ended` greift nicht, aber `agentStatus === 'error'` ist weder `working` noch `blocked` → Regel läuft durch bis zum Phasenvergleich; das ist falsch. Deshalb erste Zeile: `if (!s || s.ended || s.agentStatus === 'error') return undefined;` — Fehler-Ende = keine Sitzung (AK-10). `unknown` (vor dem ersten Hook, nach einem Restore ohne gespeicherten Status) ist nicht „ruhig wartend" — die Zeile zeigt zwar `wartet`, der Knopf bleibt bis zum ersten Hook oder zur Bildschirm-Probe gesperrt (Review E14); der Freitext-Pfad behandelt `unknown` weiter wie heute.

In `toRow` (`:475-513`):

```ts
const interrupted = phase === 'bau' && c.hasBuildStand;
const nextStepBase = deriveNextStep(phase, c.intentId, c.hasBuildStand);
const sperre = nextStepBase ? deriveNextStepSperre({ session, nextStep: nextStepBase.step, freigabeDoc, interrupted }) : undefined;
// AK-04/AK-05: the click continues in this session — only when usable, live, not „Bau fortsetzen", and the ref names its target.
const sitzung = nextStepBase && !sperre && !interrupted && session && !session.ended && session.agentStatus !== 'error' && session.target
  ? { id: session.id, name: session.name, model: { providerId: session.provider ?? 'anthropic', modelId: session.model }, target: session.target }
  : undefined;
const nextStep = nextStepBase ? { ...nextStepBase, ...(sperre ? { sperre } : {}), ...(sitzung ? { sitzung } : {}) } : undefined;
const sessionBusy = !!sperre;
```

`freigabeDoc` wird dafür vor `nextStep` berechnet (heute steht es zwei Zeilen darunter, `:486`). Der Kommentar an `:482` („a live session in any state blocks") wird durch den Verweis auf `deriveNextStepSperre` ersetzt.

**Service (`vorhaben-service.ts`).**

1. `sessionRefOf(sessionId, name, model, ended?, resumed?, extra?: { step?: VorhabenStep; provider?: string; target?: CloudTerminalSessionTarget })` — neue Felder nur bei lebender Sitzung in die Referenz. `sessionFor` übergibt `{ step: a.step, provider: live?.modelConfig?.provider ?? a.provider, target: this.targetOf(projectId, a.cwd) }`; `targetOf` = `safeKey(cwd) === safeKey(project.path) ? { kind: 'main' } : { kind: 'existing-worktree', path: cwd }` (Logik aus `doResume` (12), `:1025`, wird dorthin ebenfalls eingesetzt — ein Schreiber). Pending-Refs (`:842`, `:574`, `:1159`) bekommen `{ step: 'intent', provider: p.provider }`. Das Modell der Referenz bleibt `live.modelConfig?.model ?? model` (`:1201`).

2. `startStep` — Weiche nach der Modell- und Zielauflösung, vor `createSession` (`:735`):

```ts
const command = stepCommand(step, intentId);
// INT-2026-018: a live session of the row decides the way (AK-04, AK-05, AK-10; NZ-04).
const reuse = intentId ? this.reusableSession(projectId, intentId, step) : undefined;
if (reuse && this.sameModel(reuse, model) && this.sameTarget(reuse, target, project.path)) {
  return this.startInSession(projectId, intentId!, step, model, reuse, command, firstInput);
}
… bestehender createSession-Pfad …
let geschlossen: string | undefined;
if (reuse) {
  // AK-05: the old session goes only once the new one stands; closing as if ✕ was clicked (Z-02).
  if (sessions.closeSession?.(reuse.a.sessionId, { closedBy: 'user' })) geschlossen = reuse.a.sessionId;
  else console.warn(`[vorhaben] ${intentId}: alte Sitzung ${reuse.a.sessionId} ließ sich nicht schließen`);
}
this.scheduleRescan(0);
return { sessionId: created.sessionId, modus: 'neu', ...(geschlossen ? { geschlossen } : {}) };
```

`reusableSession(projectId, intentId, step)`:

```ts
const row = this.requireRow(projectId, intentId);
const a = this.deps.store.getAssignment(projectId, intentId);
if (!a || a.ended) return undefined;
const live = this.deps.sessions?.getSession(a.sessionId);
if (!live || live.status !== 'active') return undefined;                 // ended meanwhile → AK-10 (no error)
const ref = this.sessionFor(projectId, intentId);                        // live status, firstInputPending, step, target
const interrupted = row.phase === 'bau' && row.hasBuildStand;
const sperre = deriveNextStepSperre({ session: ref, nextStep: step, freigabeDoc: row.freigabeDoc, interrupted });
if (sperre) throw new VorhabenError('SESSION_BUSY', NEXT_STEP_SPERRE_TEXT[sperre]);   // two devices, stale page
if (interrupted) return undefined;                                       // NZ-04: new session, old stays
return { a, live };
```

`providerOf(a, live)` = `live?.modelConfig?.provider ?? a.provider ?? 'anthropic'` — **ein** Helfer für alle Vergleichs- und Anzeigepfade (`sessionFor` → `ref.provider`, `sameModel`, `doResume` (8) `:1013`, das heute `a.provider ?? 'anthropic'` inline rechnet) (Review E4). `sameModel`: `providerOf(a, live) === model.providerId && (live.modelConfig?.model ?? a.model) === model.modelId`. `sameTarget(reuse, target: ParsedTarget, projectPath)`: `main` → `safeKey(a.cwd) === safeKey(projectPath)`; `existing-worktree` → `safeKey(target.target.path) === safeKey(a.cwd)`; `new-worktree` → `false`.

3. `startInSession(projectId, intentId, step, model, reuse, command, firstInput)`:

```ts
const id = reuse.a.sessionId;
const istNoch = (): boolean => { const a = this.deps.store.getAssignment(projectId, intentId); return !!a && a.sessionId === id && a.step === reuse.a.step && !a.ended; };
const written = await this.clearAndPaste(sessions, id, command, istNoch);
if (written !== true) throw new VorhabenError('SESSION_WRITE_FAILED', this.grundText(written));   // AK-08
const at = this.now().toISOString();
this.deps.setSessionName?.(id, `${step} ${intentId}`);                                            // AK-06
this.deps.store.setAssignment(projectId, intentId, { sessionId: id, step, model: model.modelId, cwd: reuse.a.cwd, at, provider: model.providerId, ...this.sessionContext(id) }); // new step; `resumed` dropped; claudeSessionId = the new one
this.deps.store.setLastModel(projectId, intentId, step, model);                                  // AK-09
if (firstInput !== undefined) this.deps.store.setFirstInput(id, { text: firstInput, versuche: 0 }); // delivered at the first Stop like today
this.scheduleRescan(0);
return { sessionId: id, modus: 'in_sitzung' };
```

`clearAndPaste(sessions, sessionId, command, istNoch: () => boolean): Promise<true | StartInSessionGrund>` mit `type StartInSessionGrund = FreitextGrund | 'leeren_nicht_bestaetigt'`; `istNoch` kommt aus `startInSession`: `getAssignment(projectId, intentId)` zeigt noch `sessionId === id && step === reuse.a.step && !ended` (Review E15):

```ts
const run = async (): Promise<true | StartInSessionGrund> => {
  const s1 = await this.screenCheck(sessions, sessionId, 'strict');       // helper 1: live + stable + no cue + idle prompt visible (E14/E15)
  if (s1 !== true) return s1;
  // Review E15: the screen read took ~300 ms — a typed command or a hook may have changed the session meanwhile. Synchronous re-check, no await from here to the paste.
  const live = sessions.getSession(sessionId);
  if (!live || live.status !== 'active') return 'beendet';
  if (live.agentStatus === 'working' || live.agentStatus === 'blocked') return 'arbeitet';
  if (!istNoch()) return 'beschaeftigt';                                   // assignment moved (typed command elsewhere, second device)
  // Review E1/E3/E13: the id the hook reported LAST, read live and registered in the same tick — nothing can interleave.
  const vorher = live.claudeSessionId;
  const warten = this.waitForNewConversation(sessionId, vorher, CLEAR_WAIT_MS);   // armed BEFORE the paste — the hook can be faster than the Enter delay
  if (warten === 'beschaeftigt') return 'beschaeftigt';                    // Review E5: a waiter already exists for this session
  if (!sessions.sendInput(sessionId, PASTE_START + '/clear' + PASTE_END, { inferUnblock: false })) return 'senden_fehlgeschlagen';
  await this.settleEnter(sessions, sessionId);                             // helper 2: 150 ms, then '\r'
  if (!(await warten)) {
    console.warn(`[vorhaben] ${sessionId}: Leeren nicht bestätigt — keine neue Gesprächskennung binnen ${CLEAR_WAIT_MS} ms`);   // Review E8
    return 'leeren_nicht_bestaetigt';                                      // AK-08, fail closed
  }
  const s2 = await this.screenCheck(sessions, sessionId, 'strict');       // the cleared screen must show the empty prompt again
  if (s2 !== true) return s2;
  if (!sessions.sendInput(sessionId, PASTE_START + command + PASTE_END, { inferUnblock: false })) return 'senden_fehlgeschlagen';
  await this.settleEnter(sessions, sessionId);
  return true;
};
if (!sessions.withMachineWrite) return run();
const r = await sessions.withMachineWrite(sessionId, run);
return r.ok ? r.value : r.grund === 'beschaeftigt' ? 'beschaeftigt' : 'beendet';
```

Das Schloss (`withMachineWrite`, je Sitzung — nicht global) hält, bis `run` zurückkehrt, also nach dem zweiten Enter; die `await`s auf `screenCheck`, `settleEnter` und `warten` halten `run` am Leben, unabhängig von `unref` (das steuert nur, ob der Timer den Node-Prozess offen hält; Review E10). Im Timeout-Fall ist das Schloss bis zu ~6 s belegt — nur für diese Sitzung, die gerade geleert wird: ein Freitext oder die Zustellung der ersten Eingabe bekommt in der Zeit `beschaeftigt` und wird wie heute beim nächsten Stop erneut versucht (`deliverFirstInput` `:1120-1124`; Review E2). Test: „Schloss erst nach dem zweiten `\r` frei".

`waitForNewConversation(sessionId, vorher, ms): Promise<boolean> | 'beschaeftigt'`: liegt schon ein Resolver für die Sitzung in `clearWaiters`, sofort `'beschaeftigt'` (kein Überschreiben, Review E5); sonst Promise, das `onHookContext` auflöst, sobald für diese Sitzung eine gültige Kennung `!== vorher` gemeldet wird (Map `clearWaiters: sessionId → resolver`, Timer mit `unref`, bei Timeout `false`, Eintrag wird in beiden Fällen entfernt). `onHookContext` ruft den Resolver nach der UUID-Prüfung und vor `setSessionContext`. Kein zweiter Listener am Manager. Warum die Kennung das richtige Signal ist (Review E1): `/clear` legt in Claude Code ein neues Gespräch mit neuer `session_id` und neuer `transcript_path` an, der `SessionStart`-Hook (Matcher `clear`) meldet beide, `reportHookContext` emittiert bei jeder Änderung (`:527-541`); der Hook läuft über Loopback (`claude-hooks.ts:95`, `http://127.0.0.1:<port>/…`), nicht übers Netz — Latenz im Millisekundenbereich (INT-2026-007-Messung: Hook → UI 165 ms), 5 s sind Sicherheitsabstand, kein Arbeitswert. Meldet ein fremder `/clear` (von Hand getippt im selben Moment) die neue Kennung zuerst, ist das Gespräch ebenfalls neu — der Befehl geht dann in ein leeres Gespräch, kein Fehlverhalten. `CLEAR_WAIT_MS = 5_000` (exportiert für Tests; unter dem Client-Timeout 15 s: 2 Bildschirmlesungen ≤ 2 × 450 ms + 2 × 150 ms + 5 s).

**Plan B, falls die Probe in Schritt 0 zeigt, dass `/clear` die Kennung nicht wechselt** [Uncertain bis zur Probe; Review E1]: dann ist die Kennung kein Signal, und die Route liefert eines: `mapHookPayload` gibt für `SessionStart` mit `source === 'clear'` zusätzlich `cleared: true` zurück, die Route ruft `manager.reportCleared(id)` → `emit('session.cleared', sessionId)` (Nutzlast: nur die Sitzungskennung; Review E12), der Service löst den Waiter derselben `clearWaiters`-Map darauf auf — ein Waiter je Sitzung, ein Ereignis ohne Waiter wird ignoriert, ein getipptes und ein gepastetes `/clear` sind nicht zu unterscheiden und müssen es nicht: beide hinterlassen ein leeres Gespräch. Eine Zeile Route, eine Methode Manager, ein Listener Service; der Rest des Plans bleibt. Entscheidung nach der Probe als Zeile in §14.

`screenCheck(sessions, sessionId, mode: 'waiting' | 'working' | 'strict'): Promise<true | FreitextGrund>` — `waiting`/`working` sind die heutigen Zweige aus `pasteLocked` (`:654-668`, Verhalten unverändert). `strict` (nur für `/clear` und den Befehl, Review E14/E15): die Sitzung muss **nachweislich** ruhig sein — Bildschirm `live` und stabil (sonst `kein_bildschirm`), kein Dialog-Cue (`dialog_offen`) und `isIdlePrompt(text)` wahr (sonst `arbeitet`). `isIdlePrompt` ist eine neue reine Funktion in `dialog-driver.ts`: eine Zeile `^\s*❯\s*$` nach `stripScreen` und keine Zeile mit `esc to interrupt` (Spinner) — dieselbe Prüfung, die die E2E-Skripte seit INT-2026-011 als „Idle" benutzen. Fixtures dafür entstehen in Schritt 0 aus `capture-pane`: `ui/tests/fixtures/tui/2.1.273/prompt-idle.txt` und `prompt-working.txt`. Ohne tmux (`SPECWRIGHT_TMUX=off`, `live: false`) ist der Weg „in der Sitzung" damit nicht verfügbar: `kein_bildschirm` mit dem bestehenden Text; Mac und Cloud-Host laufen mit tmux (Kill-Switch nur für Notfälle, INT-2026-019 Memo). Hintergrund: ein `/clear`, das in eine arbeitende Sitzung fällt, wird von Claude Code als Eingabe **gepuffert** und nach dem Turn ausgeführt — Minuten später, ohne unseren Befehl (§9 R10). Deshalb genügt der Status nicht; der Bildschirm muss die leere Eingabezeile zeigen.

`settleEnter(sessions, sessionId)`: 150 ms (`PASTE_ENTER_DELAY_MS`), dann `\r` — aus `:672-678`. `pasteLocked` (`:645-692`) wird auf die beiden Helfer umgestellt; die frühe Auflösung des Aufrufers beim Paste und das Schloss bis Enter bleiben — die `await`-Struktur von `run` ändert sich nicht, nur die Zeilen wandern in Funktionen. Tests `vorhaben-service-stage2/3/4` müssen unverändert grün bleiben und laufen in Schritt 4 vor jedem neuen Feature-Code (Review E20; Schritt 0 prüft, welche Tests `writes` in Reihenfolge lesen).

`grundText(g)`: `SEND_REASON_TEXT[g] ?? FREITEXT_GRUND_TEXT[g] ?? CLEAR_FAILED_TEXT` mit `CLEAR_FAILED_TEXT = 'Leeren der Sitzung nicht bestätigt — erneut versuchen oder /clear im Terminal tippen'` (lokal im Service; `FreitextGrund` bleibt unverändert, weil der Wert nie als `send-rejected` reist).

Reihenfolge der Schreiber nach dem Klick (AK-06): (a) `setSessionName` → Workspace-Broadcast (Tab-Name sofort); (b) `setAssignment` → `scheduleRescan(0)` → `vorhaben:state` mit `session.step = <neu>`, `nextStep.sperre = 'gleiche_phase'`; (c) Hook `UserPromptSubmit` → `prompt-submitted` → `working` → `onAgentEvent` → Rescan → `arbeitet`; (d) `onPromptText` → `moveAssignment` mit denselben Werten (idempotent; die Regel „neueste gewinnt" aus INT-2026-016 bleibt). Kein `await` zwischen (a) und (b).

**Manager (`cloud-terminal-manager.ts`).** `closeSession(sessionId, opts: { closedBy?: 'user' } = {})` → `this.emit('session.closed', sessionId, session.exitCode, opts.closedBy)`. `VorhabenSessionSource.closeSession?(sessionId, opts?)` erweitert (der `FakeManager` mit `closeSession(id)` bleibt zuweisbar). `websocket.ts:2050-2064`: dritter Parameter `closedBy` ersetzt `userClosedSessionIds`; `handleCloudTerminalClose` ruft `closeSession(id, { closedBy: 'user' })`; Feld `:102` und die drei Zeilen `:2584-2587` entfallen. Der Resume-Pfad (`:1046`) schließt weiterhin ohne Option (kein Tab beim Client bekannt — bleibt wie INT-2026-019 E1).

**Handler (`vorhaben-handler.ts:234-237`).** Antwort reicht `modus` und `geschlossen` durch. Validierung unverändert (Schritt, Kennung, Modell, Ziel, `firstInput`).

**Frontend.**

- `aos-naechster-schritt.ts`: Props `sperre: VorhabenNextStepSperre | null` (Text aus `NEXT_STEP_SPERRE_TEXT`; ohne Wert bei `gesperrt` der heutige Satz), `sitzung: VorhabenNextStep['sitzung'] | undefined`. Vorauswahl (O1): `preselect()` nimmt zuerst `sitzung.model`, wenn `modellVorhanden`, sonst die heutige Kette; `target` = `sitzung.target.kind === 'main' ? 'main' : sitzung.target.path` — **immer** das Ziel der Sitzung, nie ein stiller Rückfall auf „Im Projekt" (Review E3). Damit die Option existiert: bei neuer `sitzung` wird `loadTargets()` erneut aufgerufen (die Liste vom Einhängen kennt einen Worktree nicht, den der Sitzungsstart „Neuer Worktree" danach angelegt hat), und fehlt der Pfad danach trotzdem, ergänzt der Kasten eine Option `Worktree <basename(path)>` mit diesem Pfad aus `sitzung.target` (die Sitzung läuft dort, das Verzeichnis existiert). Neu vorbelegt wird nur, wenn sich `${step}|${sitzung?.id ?? ''}` gegenüber dem letzten Vorbelegen ändert (Feld `vorbelegtFuer`), nicht bei jedem Broadcast. Text: `sitzung && gleich` → „startet in der laufenden Sitzung ‚<name>': `/clear`, dann `<cmd>`"; `sitzung && !gleich` → „startet eine neue Sitzung mit `<cmd>` — die laufende ‚<name>' wird geschlossen"; sonst heutiger Satz. `gleich` = Provider und Modell gleich `selected` und Ziel gleich `target`. Event-Detail bekommt `modus`, `geschlossen` aus der Antwort.
- `aos-vorhaben-seite.ts:803-814`: `.sperre=${r.nextStep.sperre ?? null}` `.sitzung=${r.nextStep.sitzung}` zusätzlich; `.gesperrt=${r.sessionBusy}` bleibt.
- `aos-vorhaben-view.ts:326-343`: Toast „Nächster Schritt in der laufenden Sitzung gestartet" bei `modus === 'in_sitzung'`, „Sitzung gestartet — die vorige wurde geschlossen" bei `geschlossen`; Handy-Zweig unverändert (öffnet das Terminal mit der — ggf. gleichen — Kennung).
- `vorhaben.service.ts:159-175`: Rückgabetyp `{ sessionId; modus; geschlossen? }`.

**Docs.** `docs/architecture.md` §2 Backend-Zeile: Satz „Nächster Schritt in der Sitzung (INT-2026-018): die Zeile trägt die Freigabe-Regel des Knopfs (`deriveNextStepSperre`) und die wiederverwendbare Sitzung; der Klick schreibt `/clear` und den Phasen-Befehl als zwei Pastes unter einem `withMachineWrite` und wartet dazwischen auf die neue Gesprächskennung aus dem SessionStart-Hook; anderes Modell oder anderes Ziel → neue Sitzung, alte wird wie per ✕ geschlossen"; §3 Nutzerzustand: „… ein getippter Phasen-Befehl, ein neuer Ordner oder der Klick „Nächster Schritt" in einer ruhig wartenden Sitzung einer früheren Phase verschiebt sie …"; Änderungsprotokoll-Zeile „keine AR-Änderung, AR-05 eingehalten, ADR-0002 unverändert". `docs/design.md:50`: Satz zum Kasten (Grund der Sperre, Ankündigung, Vorbelegung aus der Sitzung, Toasts). `docs/security.md`: keine Änderung (kein Endpunkt, kein Datenobjekt, `/clear` und Befehl entstehen serverseitig aus validiertem `step`/`intentId`).

#### Verworfene Alternativen

<!-- leser: agent -->

| Alternative | Warum nicht |
|---|---|
| Nur die Board-Karte (a): „wartet ohne Review-Dokument zählt wie keine Sitzung" — Knopf frei, Klick startet eine zweite Sitzung | Intent geht bewusst weiter (AK-04, Z-02, RB-03): zweiter Claude-Prozess neben einem fertigen kostet RAM auf dem Droplet und hinterlässt einen toten Tab |
| AK-04 als „alte schließen, neue starten" auch bei gleichem Modell/Ziel (ein Weg statt zwei) | PO-Entscheidung 17.09. („gleich: `/clear`; anders: neue Sitzung"); ein Neustart dauert 5–10 s (Trust-Prüfung, Hooks, Modellwahl) gegenüber < 2 s für `/clear`; die Sitzungs-Arbeitskopie wechselt den Besitzer |
| Warten auf `session.agent-event` `session-start` als Signal für „geleert" | `applyAgentEvent` `:466-471` emittiert nicht, wenn der Status schon `idle` war (nach 10 min Verfall) — das Signal fehlt genau bei lange ruhenden Sitzungen; `session.hook-context` mit neuer Kennung feuert bei jedem `/clear` |
| Nach `/clear` nur auf einen stabilen, veränderten Bildschirm warten (kein Hook) | Ein stabiler Bildschirm ist auch vor dem Ausführen von `/clear` stabil; „verändert" unterscheidet nicht zwischen „geleert" und „Menü offen". Die Kennung ist das eindeutige Signal; der Bildschirm wird zusätzlich vor jedem Paste auf Dialoge geprüft |
| Bei Timeout des Signals den Befehl trotzdem schicken | Verstößt gegen AK-08 (melden, nicht raten); der Befehl liefe in ein volles Gespräch. Fail closed, Klick wiederholbar |
| `/clear` zeichenweise tippen (`sendInput('/clear')`, dann `\r`) statt Bracketed Paste | Tippen öffnet das Befehlsmenü von Claude Code beim ersten `/` und filtert je Zeichen; Enter wählt den markierten Eintrag — schwerer vorherzusagen als ein Exakt-Paste. Bleibt als Rückfall, falls Schritt 0 zeigt, dass ein gepastetes `/clear` nicht ausgeführt wird |
| Regel im Browser rechnen (`row.session.step` mit `nextStep.step` vergleichen) | RB-02 / AR-05: nur das Backend entscheidet; der Browser bekäme sonst eine zweite Kopie der Regel |
| `sessionBusy` aus dem Protokoll entfernen, nur `nextStep.sperre` | 32 Fixture-Stellen in 10 Testdateien; kein fachlicher Gewinn — `sessionBusy = !!sperre` ist dokumentiert und getestet |
| Neue Dep `closeSession` am Service mit `userClosedSessionIds` in `websocket.ts` | Zwei Mechaniken für „als Nutzer geschlossen"; die Option am Manager ist eine Zeile und macht das Set überflüssig |
| `VorhabenSessionRef.cwd` statt `target` | Der Browser müsste Pfade mit Realpath vergleichen (`/tmp` vs `/private/tmp`); das Ziel in Picker-Form (`main` / Pfad) ist direkt vergleichbar, berechnet mit `safeKey` im Service |
| Bestätigungsdialog vor dem Leeren | NZ-03 (PO): der Knopf ist nur frei, wenn die Sitzung ihre Phase hinter sich hat; AN-04 prüft nach einer Woche Gebrauch |
| `/model`-Erkennung, damit ein von Hand gewechseltes Modell den Vergleich AK-04/AK-05 beeinflusst | AN-02: Startmodell gilt; eigenes Vorhaben, falls es stört |

#### Architektur-Auswirkung

<!-- leser: agent -->

- **Nein** — bleibt innerhalb von `architecture.md` §2 (Backend: Review-Kanal, Maschinen-Lock `withMachineWrite` INT-2026-007; Hook-Route als Statusquelle), §3 (Nutzerzustand im Backend, Zuordnung wandert mit Befehl/Ordner — jetzt auch mit dem Klick) und §4: AR-02 (kein zweiter Prozess neben einem fertigen), AR-04 (keine harten Pfade; `safeKey`/`pathKey` wie bisher), AR-05 (Regel und Zuordnung im Backend, Browser rechnet nicht). Kein neues Datenobjekt, `VorhabenAssignment` unverändert → ADR-0002 unverändert, **kein ADR**. ADR-0004 unverändert (kein Transkript-Leser; die Kennung dient nur als Signal und `--resume`-Argument wie in INT-2026-019). `docs/architecture.md` §2/§3 und Änderungsprotokoll werden in dieser PR um die Sätze aus §3 ergänzt (Konvention seit INT-2026-016).

**Pflichtprüfungen `security.md` §6:** kein Endpunkt (die WebSocket-Nachricht `vorhaben:start-step` behält Form und Validierung), kein Datenobjekt, kein externes System, nichts Personenbezogenes; keine von außen gemeldete Datei wird gelesen (die Gesprächskennung wird nur verglichen, nicht als Pfad benutzt — die Existenzprüfung bleibt beim Resume). `/clear` ist eine Konstante, der Befehl kommt aus `stepCommand(step, intentId)` nach der Handler-Validierung (`INTENT_ID_RE`, `isStep`). `closedBy: 'user'` setzt nur Server-Code.

### 4. Änderungen

<!-- leser: agent -->

| # | Datei / Komponente | Art | Was | Herkunft |
|---|---|---|---|---|
| 1 | `ui/src/shared/types/vorhaben.protocol.ts` | ändern | `VorhabenNextStepSperre`, `NEXT_STEP_SPERRE_TEXT`; `VorhabenSessionRef.step/provider/target`; `VorhabenNextStep.sperre/sitzung`; `sessionBusy`-Kommentar; `VorhabenStepStartedMessage.modus/geschlossen`; Codes `SESSION_BUSY`, `SESSION_WRITE_FAILED` | AK-01–AK-03, AK-04, AK-05, AK-07, AK-08 |
| 2 | `ui/src/server/services/vorhaben-reader.ts` | ändern | `STEP_ORDER`, `deriveNextStepSperre`; `toRow` baut `nextStep.sperre/sitzung`, `sessionBusy = !!sperre`, `freigabeDoc` vor `nextStep` | AK-01–AK-03, AK-10, NZ-04 |
| 3 | `ui/src/server/services/vorhaben-service.ts` | ändern | `sessionRefOf`/`sessionFor` mit `step/provider/target` (`targetOf`, auch in `doResume` (12)); `startStep`-Weiche, `reusableSession`, `providerOf` (auch in `doResume` (8)), `sameModel`, `sameTarget`, `startInSession`, `clearAndPaste` (Live-Kennung im Schloss, `console.warn` bei Timeout), `screenCheck`, `settleEnter`, `waitForNewConversation` (+ `clearWaiters` ohne Überschreiben, `onHookContext`-Aufruf), `grundText`, `CLEAR_WAIT_MS`; `pasteLocked` auf die Helfer; Schließen der alten Sitzung; Rückgabe `modus/geschlossen`; `VorhabenSessionSource.closeSession?(id, opts?)` | AK-04, AK-05, AK-06, AK-08, AK-09, AK-10 |
| 3b | `ui/src/server/services/dialog-driver.ts` | ändern | `IDLE_PROMPT_RE`, `BUSY_CUE`, `isIdlePrompt(screen)` (rein) | AK-08, Review E14/E15 |
| 3c | `ui/tests/fixtures/tui/2.1.273/prompt-idle.txt`, `prompt-working.txt` | neu | Bildschirmaufnahmen aus Schritt 0 (`capture-pane`) | Review E14 |
| 4 | `ui/src/server/services/cloud-terminal-manager.ts` | ändern | `closeSession(sessionId, opts = {})`, Emit mit `opts.closedBy`; JSDoc am Ereignis `session.closed` (drittes Argument) | AK-05, Z-02 |
| 5 | `ui/src/server/websocket.ts` | ändern | `session.closed`-Listener liest `closedBy`; `handleCloudTerminalClose` übergibt die Option; `userClosedSessionIds` entfällt | AK-05, Z-02 |
| 6 | `ui/src/server/services/vorhaben-handler.ts` | ändern | Antwort `step-started` mit `modus`, `geschlossen` | AK-04, AK-05 |
| 7 | `ui/frontend/src/services/vorhaben.service.ts` | ändern | Rückgabetyp von `startStep` | AK-04, AK-05 |
| 8 | `ui/frontend/src/components/vorhaben/aos-naechster-schritt.ts` | ändern | Props `sperre`, `sitzung`; Vorbelegung aus der Sitzung (O1), `vorbelegtFuer`, Ziele neu laden und fehlende Worktree-Option ergänzen (E3); zwei Hinweissätze; Sperrgrund; Event-Detail `modus/geschlossen` | AK-02, AK-07, O1 |
| 9 | `ui/frontend/src/components/vorhaben/aos-vorhaben-seite.ts` | ändern | `renderNextStep` reicht `sperre`, `sitzung` durch | AK-02, AK-07 |
| 10 | `ui/frontend/src/views/aos-vorhaben-view.ts` | ändern | Toast nach `modus`/`geschlossen` | AK-04, AK-05 |
| 10b | `ui/tests/unit/dialog-driver.test.ts` | ändern | `isIdlePrompt` gegen die beiden Fixtures und die Dialog-Fixtures (Dialog ≠ idle) | Review E14 |
| 11 | `ui/tests/unit/vorhaben-reader.test.ts` | ändern | Tests zu `deriveNextStepSperre` und `nextStep.sitzung`; FA-21-Test um `step` ergänzt | AK-01–AK-03, AK-10, NZ-04 |
| 12 | `ui/tests/unit/vorhaben-service-naechster-schritt.test.ts` | neu | Service-Tests AK-04–AK-06, AK-08–AK-10, NZ-04, Schloss, Reihenfolge (Fake nach `vorhaben-service-resume.test.ts`) | AK-04–AK-10 |
| 13 | `ui/tests/unit/cloud-terminal-restore.test.ts` (oder `cloud-terminal-agent-event.test.ts`) | ändern | `closeSession(id, { closedBy: 'user' })` → drittes Argument im Event | AK-05 |
| 14 | `ui/tests/unit/vorhaben-service-stage2.test.ts:501`, `stage4.test.ts:234-285` | ändern | Antwort enthält `modus: 'neu'` | AK-10 |
| 15 | `ui/tests/unit/aos-neue-absicht.test.ts:164-197` | ändern | Sperrtext aus `NEXT_STEP_SPERRE_TEXT` (`sperre = 'arbeitet'`), Freigabe bei `null` | AK-02 |
| 16 | `ui/tests/unit/aos-naechster-schritt-sitzung.test.ts` | neu | Vorbelegung, zwei Hinweissätze, Klick mit Sitzungsmodell, keine Neu-Vorbelegung bei gleichem `sitzung.id` | AK-07, O1 |
| 17 | `ui/tests/unit/aos-vorhaben-seite-chips.test.ts:126-138` | ändern | Seite reicht `sperre`/`sitzung` durch | AK-02, AK-07 |
| 18 | `ui/tests/unit/aos-vorhaben-view-terminal.test.ts` (oder `-resume`) | ändern | Toast-Text je `modus` | AK-04, AK-05 |
| 19 | `docs/architecture.md` | ändern | §2 Backend-Zeile, §3 Nutzerzustand, Änderungsprotokoll | Konvention |
| 20 | `docs/design.md:50` | ändern | Satz zum Kasten | AK-07 |
| 21 | `intent/INT-2026-018-naechster-schritt-in-sitzung/plan.md`, `intent.md` | ändern | Status, `bezuege.plan`, Änderungsprotokoll (bei Freigabe / nach Merge) | Workflow |

**Nicht betroffen (ausdrücklich):** `vorhaben-state.ts` (Store, `VorhabenAssignment`, Datei-Version), `agent-status.ts`, `claude-hooks.ts` (Matcher enthält `clear` schon; Plan B nur nach negativer Probe), `cloud-terminal.routes.ts` (dito), `plan-review-orchestrator.ts` (Listener ignoriert das dritte Argument), Freigabe-Weg (`send('freigabe')`, `startFreigabe`, NZ-02), „Neue Absicht" (`aos-neue-absicht.ts`), Übersicht (`aos-vorhaben-zeile`, `aos-vorhaben-uebersicht`), Glocke (`aos-glocke`), Resume-Pfad (`resumeIfLost`/`doResume` außer `targetOf`), Installer, Manifest (keine Lieferumfang-Datei), `security.md`.

### 5. Verbindungen

<!-- leser: agent -->

<!-- KRITISCH. Jede neue oder geänderte Verbindung zwischen Komponenten steht hier, mit prüfbarem Nachweis. Das ist der Schutz gegen „gebaut, aber nicht angeschlossen".
     Spalte „Teil": nur bei Zerlegung (Abschnitt 7), sonst „—". -->

| # | Von | Nach | Art | Schnittstelle | Nachweis (Befehl) | Teil |
|---|---|---|---|---|---|---|
| 1 | `vorhaben-reader.ts` `toRow` | `deriveNextStepSperre` | Aufruf | `deriveNextStepSperre({ session, nextStep, freigabeDoc, interrupted })` | `grep -n "deriveNextStepSperre" ui/src/server/services/vorhaben-reader.ts ui/src/server/services/vorhaben-service.ts` → ≥ 3 Treffer (Definition, `toRow`, `reusableSession`) | — |
| 2 | `vorhaben-service.ts` `sessionFor` | `VorhabenSessionRef.step/provider/target` | Daten | `sessionRefOf(…, { step, provider, target })` | `grep -n "target: this.targetOf\|step: a.step" ui/src/server/services/vorhaben-service.ts`; Reader-Test „`nextStep.sitzung` gesetzt" über den Service-Test (Broadcast enthält `session.step`) | — |
| 3 | `vorhaben-service.ts` `startStep` | `startInSession` / `createSession` + `closeSession` | Aufruf | `reusableSession` → Weiche | `grep -n "startInSession\|reusableSession\|closedBy: 'user'" ui/src/server/services/vorhaben-service.ts` | — |
| 4 | `vorhaben-service.ts` `onHookContext` | `waitForNewConversation` | Event-Resolver | `clearWaiters.get(sessionId)?.(id)` | `grep -n "clearWaiters" ui/src/server/services/vorhaben-service.ts` → Definition, `onHookContext`, `waitForNewConversation` | — |
| 5 | `cloud-terminal-manager.ts` `closeSession` | `websocket.ts` Listener `session.closed` | Event (3. Argument) | `emit('session.closed', id, exitCode, closedBy)` | `grep -n "closedBy" ui/src/server/services/cloud-terminal-manager.ts ui/src/server/websocket.ts`; `grep -c "userClosedSessionIds" ui/src/server/websocket.ts` → 0 | — |
| 6 | `vorhaben-handler.ts` | `vorhaben:step-started` | Nachricht | `{ …, modus, geschlossen? }` | `grep -n "modus" ui/src/server/services/vorhaben-handler.ts ui/src/shared/types/vorhaben.protocol.ts ui/frontend/src/services/vorhaben.service.ts` | — |
| 7 | `aos-vorhaben-seite.ts` | `aos-naechster-schritt` | Props | `.sperre`, `.sitzung` | `grep -n "\.sperre=\|\.sitzung=" ui/frontend/src/components/vorhaben/aos-vorhaben-seite.ts` | — |
| 8 | `aos-naechster-schritt.ts` | `NEXT_STEP_SPERRE_TEXT` | Import | `import { NEXT_STEP_SPERRE_TEXT } from '…/vorhaben.protocol.js'` | `grep -rn "NEXT_STEP_SPERRE_TEXT" ui/frontend/src ui/src` → Protokoll, Kasten, Service | — |
| 9 | `aos-naechster-schritt.ts` Event | `aos-vorhaben-view.ts` `onSessionStarted` | CustomEvent-Detail | `modus`, `geschlossen` | `grep -n "in_sitzung\|geschlossen" ui/frontend/src/views/aos-vorhaben-view.ts ui/frontend/src/components/vorhaben/aos-naechster-schritt.ts` | — |
| 10 | `websocket.ts` `case 'vorhaben:start-step'` | Handler | unverändert (Nachrichtentyp besteht) | — | `grep -n "'vorhaben:start-step'" ui/src/server/websocket.ts ui/src/server/services/vorhaben-handler.ts` (E20-Lehre INT-2026-019: keine neue Nachricht, keine neue Case-Zeile nötig) | — |

- [x] Jede neue Komponente hat mindestens eine Verbindung (neue Funktionen: #1, #3, #4).
- [x] Jeder Nachweis ist ein ausführbarer Befehl.

### 6. Reihenfolge der Arbeit

<!-- leser: agent -->

0. **Lesende Vorprüfung und Probe** — (a) Konsumenten: `grep -rn "closeSession(" ui/src ui/tests` (Signatur-Erweiterung verträglich?), `grep -rn "'session.closed'" ui/src` (3 Listener, drittes Argument harmlos), `grep -n "arguments" ui/src/server/websocket.ts ui/src/server/services/plan-review-orchestrator.ts ui/src/server/services/vorhaben-service.ts` → 0 Treffer in den Listenern (E22), `grep -rn "sessionBusy" ui/src ui/frontend/src` (1 Leser), `grep -rn "step-started" ui/frontend/src ui/tests` (Antworttyp), Tests, die `writes` von `pasteLocked` in Reihenfolge prüfen (`grep -n "writes" ui/tests/unit/vorhaben-service-stage3.test.ts ui/tests/unit/vorhaben-service-stage4.test.ts`) — prüfbar durch die Trefferlisten im Bauprotokoll. (b) **Probe `/clear` per Paste** [Uncertain → Certain]: Port prüfen (`lsof -nP -iTCP:3111 -sTCP:LISTEN` leer, sonst 3112), Branch-Backend `cd ui && env -u SPECWRIGHT_CLOUD_SESSION_ID PORT=3111 HOST=127.0.0.1 SPECWRIGHT_TMUX=on SPECWRIGHT_RUNTIME_DIR=<scratch>/e2e-runtime npx tsx src/server/index.ts` nach `cd frontend && npm run build`; Scratch-Projekt öffnen (ws `workspace:open-project`), Sitzung starten (`vorhaben:start-step` mit `model haiku` oder `cloud-terminal:create`), Trust-Dialog (Down, Enter), eine Frage stellen, auf `done` warten; dann per tmux Bracketed Paste: `tmux -S $TMPDIR/specwright-tmux/specwright-3111.sock set-buffer '/clear' \; paste-buffer -p -t <tmuxSessionName>`, 200 ms, `send-keys -t <name> Enter`; prüfen: Bildschirm geleert (`capture-pane`), `claudeSessionId` in `<runtime>/cloud-terminal/sessions-3111.json` geändert (**Messwert 1: alte → neue Kennung, ja/nein** — Review E1), Latenz Enter → Registry-Änderung per Zeitstempel im Skript (**Messwert 2, erwartet < 500 ms**; Review E8), Backend-Log ohne `agent-event rejected`; dabei `capture-pane -p` einmal bei ruhender Sitzung (leere Eingabezeile) und einmal während Haiku arbeitet (Spinner) als Fixtures `prompt-idle.txt` / `prompt-working.txt` sichern (E14). Danach `/specwright:plan INT-…` genauso pasten → `UserPromptSubmit` kommt (Zuordnung wandert, `vorhaben:state`). Ergebnis als Protokollzeile in §14/PR. Schlägt (b) fehl: Rückfall „Tippen + Menü" (§3 Alternativen) als Abweichung in §14, Regel und Rest unverändert. Wechselt die Kennung nicht (Messwert 1 = nein): Plan B aus §3 (`session.cleared` aus dem `SessionStart`-Hook mit `source: 'clear'`) als Abweichung in §14 vor dem ersten Code.
1. Protokoll (#1) → `cd ui && npx tsc --noEmit -p .` und `cd ui/frontend && npx tsc --noEmit` grün (nur neue optionale Felder).
2. Reader-Regel (#2) mit Tests (#11) → `npx vitest run tests/unit/vorhaben-reader.test.ts` grün, inkl. bestehendem FA-21-Fall.
3. Manager-Option + Listener (#4, #5) mit Test (#13) → `npx vitest run tests/unit/cloud-terminal-restore.test.ts` grün; `grep -c userClosedSessionIds` = 0.
4. Service: Referenz-Felder, `targetOf`, Helfer aus `pasteLocked`, `waitForNewConversation` (#3 erster Teil) → `npx vitest run tests/unit/vorhaben-service*.test.ts` grün (Stage-Tests unverändert).
5. Service: Weiche, `reusableSession`, `startInSession`, `clearAndPaste`, Schließen (#3 zweiter Teil), Handler (#6), Tests (#12, #14) → grün.
6. Frontend (#7–#10) mit Tests (#15–#18) → `npx vitest run tests/unit/aos-naechster-schritt-sitzung.test.ts tests/unit/aos-neue-absicht.test.ts tests/unit/aos-vorhaben-seite-chips.test.ts tests/unit/aos-vorhaben-view-terminal.test.ts` grün; `npm run lint` in `ui/`.
7. Verbindungen nachweisen (Abschnitt 5).
8. Docs (#19, #20).
9. `bash scripts/verify.sh` (lokal: `terminal-io.test.ts` bleibt auf dem Mac rot — CI entscheidet), E2E-Pfad und Screenshots (Abschnitt 8).

### 7. Zerlegung

<!-- leser: agent -->

#### Variante A — nicht zerlegbar, eine Sitzung

<!-- leser: agent -->

Eine Sitzung: Protokollfelder, Reader-Regel, Service-Weiche und Kasten greifen ineinander (Abschnitt 5, Verbindungen #1–#9); die Frontend-Arbeit sind zwei Props und zwei Sätze — eine Zerlegung brächte zwei Worktrees für je 30 Minuten und eine Integrationsaufgabe obendrauf.

#### Variante B — parallel in Worktrees

<!-- leser: agent -->

Entfällt.

### 8. Tests und Nachweis

<!-- leser: agent -->

| AK / FA | Test | Datei | Art |
|---|---|---|---|
| AK-01 | Sitzung `done`/`idle`, `step: 'intent'`, nächster Schritt `plan`, kein `freigabeDoc`, kein `firstInputPending` → `sperre` undefined, `sessionBusy` false, `nextStep.sitzung = { id, name, model {anthropic, …}, target }`; dasselbe mit `step: 'spec'` → `plan`; `spec` → `build` | `vorhaben-reader.test.ts` | Unit |
| AK-02 | `working` → `'arbeitet'`; `blocked` (jede `blockKind`, auch `berechtigung`) → `'dialog'`; `unknown` → `'unbekannt'` (E14); `firstInputPending` → `'erste_eingabe'`; jeweils `sessionBusy` true, kein `sitzung`; Kasten zeigt `NEXT_STEP_SPERRE_TEXT[sperre]` | `vorhaben-reader.test.ts`, `aos-neue-absicht.test.ts` | Unit |
| AK-03 | `step === nextStep` → `'gleiche_phase'`; späterer Schritt (`build` bei `plan`) → `'gleiche_phase'`; `step` fehlt → `'gleiche_phase'` (FA-21-Fall `:259-261` bleibt grün); `freigabeDoc` gesetzt bei früherem Schritt → `'freigabe_offen'` | `vorhaben-reader.test.ts` | Unit |
| AK-04 | Zuordnung `intent`, Sitzung `done`, gleiches Modell/Provider, Ziel `main` = `a.cwd` → `startStep` schreibt in Reihenfolge `[PASTE /clear]`, `\r`, `[PASTE /specwright:plan INT-…]`, `\r`; `withMachineWrite` genau einmal; Fake meldet beim `/clear`-Paste `hook(id, UUID2)`; Antwort `{ sessionId: gleich, modus: 'in_sitzung' }`; keine `createSession`; Zuordnung `step: 'plan'`, `claudeSessionId: UUID2`, `provider`, ohne `resumed`; `setSessionName('plan INT-…')` | `vorhaben-service-naechster-schritt.test.ts` | Unit |
| AK-04 (Ziel Worktree) | `a.cwd = /wt/x`, Ziel `{ kind: 'existing-worktree', path: '/wt/x' }` → in der Sitzung; Ziel `main` → neue Sitzung (AK-05) | ebd. | Unit |
| AK-05 | anderes Modell → `createSession` mit `initialPrompt = command`, danach `closeSession(alt, { closedBy: 'user' })`; Antwort `modus: 'neu'`, `geschlossen: alt`; Zuordnung → neue Sitzung; anderer Provider → dito; `new-worktree` → dito; `createSession` wirft → alte **nicht** geschlossen, `START_FAILED` | ebd. | Unit |
| AK-06 | nach AK-04: nächster `vorhaben:state` trägt `session.step = 'plan'`, `nextStep.sperre = 'gleiche_phase'`; Fake setzt `agentStatus = 'working'` + `session.agent-event prompt-submitted` → Zeile `arbeitet`; `session.prompt-text` mit dem Befehl → `moveAssignment` idempotent (Zuordnung unverändert) | ebd. | Unit |
| AK-07 | Kasten mit `sitzung`: Vorauswahl = Sitzungsmodell und -ziel (O1), Text „in der laufenden Sitzung ‚…': /clear, dann …"; Modell ändern → „neue Sitzung … wird geschlossen"; Ziel ändern → dito; ohne `sitzung` → heutiger Satz; zweiter Broadcast mit gleichem `sitzung.id` überschreibt eine geänderte Wahl nicht; neue `sitzung.id` belegt neu vor und ruft `targets()` erneut; Sitzungs-Worktree fehlt in der `targets()`-Antwort → Option `Worktree <basename>` wird ergänzt und ist gewählt, Text sagt „in der laufenden Sitzung" (E3); Klick ruft `startStep(…, sitzung.model, sitzung.target)` | `aos-naechster-schritt-sitzung.test.ts`; Seite reicht durch: `aos-vorhaben-seite-chips.test.ts` | Unit |
| AK-08 | (1) kein `session.hook-context` binnen `CLEAR_WAIT_MS` (Fake-Timer) → `SESSION_WRITE_FAILED` mit `CLEAR_FAILED_TEXT`, `console.warn` einmal, Writes nur `/clear` + `\r`, Zuordnung unverändert, `clearWaiters` leer, zweiter Aufruf läuft durch; (1b) Hook meldet **dieselbe** Kennung wie vorher → zählt nicht, Timeout wie (1); (1c) Hook meldet die neue Kennung schon vor dem `\r` (Fake löst beim Paste aus) → läuft durch (Waiter vor dem Paste scharf, E1/F7); (2) Plan-Dialog-Cue auf dem Bildschirm → `dialog_offen`-Text, keine Writes; (3) `withMachineWrite` → `beschaeftigt` → Text; (3b) zweiter `clearAndPaste` derselben Sitzung ohne Schloss (Fake ohne `withMachineWrite`) → `beschaeftigt`, erster Waiter bleibt und löst (E5); (4) `sendInput` false → `senden_fehlgeschlagen`; (5) Sitzung nach dem Klick geschlossen (`getSession` closed) → AK-10-Pfad ohne Fehler; (6) Schloss erst nach dem zweiten `\r` frei: Fake-`withMachineWrite` protokolliert Freigabe, sie liegt hinter dem vierten Write (E2/E10); (7) `vorher` wird aus `getSession(id).claudeSessionId` im Schloss gelesen, nicht aus der Zuordnung — Fake ändert die Live-Kennung zwischen Klick und Schloss (E3); (1d) eine fremde neue Kennung trifft nach dem Scharfstellen, vor dem `/clear`-Paste ein (Michael tippt `/clear` im selben Moment) → läuft durch, Befehl wird gepastet (E11/E21); (8) Fake setzt `agentStatus = 'working'` während der ersten Bildschirmlesung → `arbeitet`, keine Writes (E15/E21); (8b) Fake verschiebt die Zuordnung (`moveAssignment` auf `build`) während der Lesung → `beschaeftigt`, keine Writes (E15); (9) Bildschirm ohne leere Eingabezeile (Spinner-Fixture `prompt-working.txt`) → `arbeitet`, keine Writes; `live: false` → `kein_bildschirm` (E14); (10) `isIdlePrompt`: `prompt-idle.txt` wahr, `prompt-working.txt` und alle Dialog-Fixtures falsch | `vorhaben-service-naechster-schritt.test.ts`, `dialog-driver.test.ts`, `aos-naechster-schritt-sitzung.test.ts` | Unit |
| Regel = Fehlertext | für jede Sperre: `startStep` wirft `SESSION_BUSY` mit `message === NEXT_STEP_SPERRE_TEXT[row.nextStep.sperre]` der zuletzt gebroadcasteten Zeile — Reader und Service teilen die Funktion (E6); für jede freie Zeile: `nextStep.sitzung.target` ist genau das Ziel, das `sameTarget` als gleich annimmt (E16) | `vorhaben-service-naechster-schritt.test.ts` | Unit |
| Provider-Fallback | Zuordnung ohne `provider` (vor INT-2026-019), Live-Sitzung ohne `modelConfig.provider` → `ref.provider === 'anthropic'`, `sameModel` mit `{ anthropic, <model> }` wahr; Live-Provider `codex` schlägt `a.provider` (E4) | ebd. | Unit |
| AK-09 | nach AK-04 `getLastModel(projectId, intentId, 'plan')` = Sitzungsmodell; nach AK-05 = gewähltes Modell (heutiger Pfad) | `vorhaben-service-naechster-schritt.test.ts` | Unit |
| AK-10 | keine Zuordnung / `ended` / `error` → `createSession` wie heute, kein `closeSession`, `modus: 'neu'` ohne `geschlossen` (bestehende Stage-2/4-Tests um `modus` ergänzt) | `vorhaben-service-stage2.test.ts`, `stage4.test.ts` | Unit |
| NZ-04 | Phase `bau` + `build-stand.md`, Sitzung `done` mit `step: 'plan'`, gleiches Modell/Ziel → `sperre` undefined, **kein** `sitzung`; `startStep` → neue Sitzung, alte bleibt (kein `closeSession`) | Reader + Service-Test | Unit |
| Regel bei Klick | Sitzung `working` → `startStep` wirft `SESSION_BUSY` (Text `arbeitet`), keine Writes, keine `createSession`; `gleiche_phase`; `freigabe_offen`; `erste_eingabe` | `vorhaben-service-naechster-schritt.test.ts` | Unit |
| erste Eingabe in der Sitzung | `startStep(…, firstInput)` im In-Sitzung-Pfad → `hasFirstInput(id)`; `stop` → `deliverFirstInput` pastet den Text (bestehender Weg) | ebd. | Unit |
| Schließen als Nutzer | `closeSession(id, { closedBy: 'user' })` → Event `(id, code, 'user')`; ohne Option → `undefined` | `cloud-terminal-restore.test.ts` | Unit |
| Referenzfelder | `sessionFor` liefert `step/provider/target` (`main` für `a.cwd = project.path`, `existing-worktree` sonst); Pending-Ref `step: 'intent'` | `vorhaben-service-naechster-schritt.test.ts` | Unit |
| Toast | Event `modus: 'in_sitzung'` → „Nächster Schritt in der laufenden Sitzung gestartet"; `geschlossen` → „… die vorige wurde geschlossen" | `aos-vorhaben-view-terminal.test.ts` | Unit |

- **Verify-Befehl:** `bash scripts/verify.sh` — muss grün sein, Ausgabe wird im PR zitiert (lokal auf dem Mac bleibt `tests/integration/terminal-io.test.ts` rot — bekannt, nicht in der Bezugsliste; PR-Check entscheidet). **CI ist die Wahrheit:** lokal grün zählt erst, wenn die PR-Checks grün sind. Bezugslisten bekannter roter Tests werden nie aufgrund eines lokalen Laufs gekürzt.
- **Datenkorrektur:** entfällt — keine Bestandsdaten werden angefasst (`VorhabenAssignment` unverändert).
- **Angeschlossen (E2E-Pfad):** Branch-Backend 3111 mit `SPECWRIGHT_TMUX=on` und Scratch-Projekt (Rezept aus Schritt 0). (1) Zeile in Phase `spec` (intent `angenommen`, `bypass: nein`, keine `spec.md`), `vorhaben:start-step { step: 'spec', model haiku }` → Sitzung antwortet „unbekannter Befehl" → `done`; Zeile ist `gleiche_phase` (Kasten gesperrt mit Text — Screenshot A). (2) `spec.md` mit `> **Status:** freigegeben` in den Scratch-Ordner schreiben → Phase `plan`, Sitzung `step: 'spec'` → Kasten frei, Vorbelegung Haiku/„Im Projekt", Text „in der laufenden Sitzung" (Screenshot B, 1440 px; Screenshot B' 390 px). (3) Klick → Terminal zeigt `/clear`, dann `/specwright:plan INT-…` (Screenshot C); Messung: Zeit vom `vorhaben:start-step`-Frame bis `vorhaben:state` mit `session.step: 'plan'` und Tab-Name `plan INT-…` (< 2 s, AK-06), Toast „in der laufenden Sitzung"; `sessions-3111.json` zeigt neue `claudeSessionId`; keine zweite Sitzung (`cloud-terminal:list`). (4) Zweite Zeile analog vorbereiten, im Kasten Modell Sonnet wählen → Text „neue Sitzung … wird geschlossen" (Screenshot D), Klick → `cloud-terminal:closed { closedBy: 'user' }` für die alte, `cloud-terminal:created` für die neue, Tabs: nur die neue; Toast „vorige geschlossen". (5) AK-08: in einer dritten Zeile die Hook-Datei der Sitzung vorübergehend unbrauchbar machen (Token in `<runtime>/cloud-terminal/claude-hooks-3111.json` ändern, Backend neu starten, Sitzung reattached) → Klick → nach 5 s Fehler „Leeren der Sitzung nicht bestätigt" im Kasten, Knopf frei; Hook-Datei zurück, zweiter Klick geht durch. Skript `e2e-018.mjs` im Sitzungs-Scratchpad; Protokoll und Screenshots neben dem Mock in der PR.
- **Bugfix:** entfällt (kein Bugfix-Anteil).
- **UI:** kein Mock für diesen Kasten (INT-2026-010 Mock 03b zeigt den Kasten ohne Sperrtext) — Nachweis per Screenshot A–D neben dem heutigen Kasten (Screenshot vom 17.09. aus dem Intent als „vorher").

### 9. Risiken

<!-- leser: mensch -->

| Risiko | Wahrscheinlichkeit | Wirkung | Gegenmaßnahme | Wer merkt es |
|---|---|---|---|---|
| R1 — Ein gepastetes `/clear` wird von Claude Code nicht wie ein getipptes ausgeführt (Befehlsmenü, Enter wählt etwas anderes) | niedrig–mittel | hoch für AK-04 | Probe in Schritt 0 vor jedem Code; Rückfall Tastenfolge; die Regel und AK-05/AK-10 bleiben unabhängig davon | Agent in der Bausitzung (Probe); sonst Michael beim ersten Klick |
| R2 — SessionStart-Hook nach `/clear` meldet keine neue Kennung (Claude-Code-Version, Hook-Datei defekt) → jeder Klick endet nach 5 s mit „Leeren nicht bestätigt" | niedrig | mittel (Funktion unbrauchbar, nichts kaputt) | fail closed; Meldung im Kasten und `console.warn` im Backend-Log; `/clear` von Hand bleibt möglich; Probe in Schritt 0 misst Kennungswechsel (Messwert 1) und Latenz (Messwert 2, Loopback); Plan B `session.cleared`, falls die Kennung nicht wechselt | Michael im Kasten; Agent im Log |
| R2b — Während der 5 s Wartezeit (nur im Fehlerfall) ist das Schloss dieser einen Sitzung belegt: Freigabe oder erste Eingabe bekommen `beschaeftigt` | niedrig | niedrig | Schloss je Sitzung; erste Eingabe wird beim nächsten Stop erneut versucht (heutiger Weg); Freigabe-Klick wiederholbar | Michael (Fehlertext) |
| R3 — Dialog zwischen `/clear` und Befehl (z. B. Claude-Code-Update-Hinweis) | niedrig | niedrig | Bildschirmprüfung vor jedem Paste; Abbruch mit Meldung; Klick wiederholbar | Michael im Kasten und Terminal |
| R4 — Doppelklick / zwei Geräte: zweiter Klick trifft das Schloss oder eine schon umgezogene Zuordnung | mittel | niedrig | `withMachineWrite` (`beschaeftigt`), `SESSION_BUSY` bei umgezogener Zuordnung; Knopf im Kasten während `starting` gesperrt | Michael (Toast/Fehlertext) |
| R5 — AK-05 mit anderer Arbeitskopie schließt die alte Sitzung; ihre Sitzungs-Arbeitskopie wird (wenn sauber) entfernt, die Zeile verschwindet aus der Liste, wenn die Dokumente nur dort liegen | niedrig (Michael wählt bewusst um) | mittel | Kasten sagt vor dem Klick „wird geschlossen"; Branch bleibt (`git branch -d` scheitert bei unmerged); Board-Karte „Arbeitskopie eines offenen Vorhabens beim regulären Ende behalten" (INT-2026-019 O2) — kein Umfang hier | Michael in der Liste |
| R6 — Vorbelegung aus der Sitzung (O1) überrascht, wenn die Einstellungen für den Schritt ein anderes Modell vorsehen | mittel | niedrig | Kasten nennt das Modell; Michael ändert es im Kasten; AN-04-Prüfung nach einer Woche | Michael |
| R7 — Umbau von `pasteLocked` auf zwei Helfer verändert die Reihenfolge der Writes für Freitext | niedrig | mittel | Stage-3/4-Tests bleiben unverändert und müssen grün bleiben (Schritt 4 vor Schritt 5) | CI |
| R8 — Die Seite hält veraltete Zeilen (Scan-Verzögerung): Knopf frei, Backend sagt `SESSION_BUSY` | niedrig | niedrig | Fehlertext im Kasten; nächster Broadcast korrigiert die Seite | Michael |
| R9 — `applyAgentEvent` ohne Emit bei `idle → idle`: kein Rescan nach `/clear`, Zeile zeigt kurz noch die alte Marke | niedrig | niedrig (Sekunden) | der Service stößt nach dem Befehl selbst `scheduleRescan(0)` an; `prompt-submitted` folgt | — |
| R10 — Ein `/clear`, das trotz Prüfung in eine arbeitende Sitzung fällt, wird von Claude Code gepuffert und nach dem Turn ausgeführt — Minuten später, ohne unseren Befehl | sehr niedrig | mittel (Gespräch weg, Dateien unberührt) | vier Riegel: Status-Regel (`working`/`blocked`/`unknown` gesperrt), strenge Bildschirmprüfung (leere Eingabezeile sichtbar, kein Spinner), synchroner Re-Check im Schloss unmittelbar vor dem Paste, Schloss je Sitzung; Restfenster wenige Millisekunden | Michael im Terminal |
| R11 — Ohne tmux (`SPECWRIGHT_TMUX=off`) ist „in der Sitzung" nicht möglich (Bildschirm nicht lesbar) — jeder Klick meldet `kein_bildschirm` | niedrig (Kill-Switch, nicht Betriebszustand) | niedrig | Meldung nennt den Ausweg (Modell oder Arbeitskopie ändern → neue Sitzung); Mac und Cloud laufen mit tmux | Michael im Kasten |

### 10. Manuelle Schritte

<!-- leser: mensch -->

<!-- Alles, was ein Mensch tun muss: Secrets setzen, Flag schalten, Migration freigeben, Deploy autorisieren. Mit Zeitpunkt (vor Umsetzung / vor Merge / vor Deploy). Sonst „Keine."
     Jeder Schritt nennt den Weg belegt (Skript, Workflow-Datei, Befehl mit Pfad). `[Uncertain]` ist hier nicht freigabefähig: entweder im Code belegen oder „Weg klären“ als eigener Schritt mit Wer und Wann.
     Deploy-Schritte laufen nur mit Freigabe (Hook `production-gate`); Freigabe-Datei nach dem Deploy löschen. -->

| Schritt | Wer | Wann | Erledigt |
|---|---|---|---|
| O1 entscheiden (Vorbelegung aus der Sitzung) | Michael | vor Freigabe | [x] 2026-09-18, wie vorgeschlagen |
| Probe Schritt 0 (b): gepastetes `/clear` und neue Gesprächskennung im Scratch — Weg: Branch-Backend `cd ui && env -u SPECWRIGHT_CLOUD_SESSION_ID PORT=3111 HOST=127.0.0.1 SPECWRIGHT_TMUX=on SPECWRIGHT_RUNTIME_DIR=<scratch>/e2e-runtime npx tsx src/server/index.ts` (`PORT` in `ui/src/server/index.ts:12`), tmux-Socket `getTmuxSocketPath()` (`ui/src/server/utils/runtime-paths.ts:126-128`), Registry `<runtime>/cloud-terminal/sessions-3111.json`; Ergebnis als Protokollzeile in §14 | Agent in der Bausitzung | vor dem ersten Code | [x] 2026-09-18, bestanden (§14: Kennung wechselt, 104 ms) |
| Merge des PR nach `main` — löst den Auto-Deploy der UI auf dem Cloud-Host aus (`docs/architecture.md` §5, Gate `GET /api/status/deploy-readiness`); kein weiterer Deploy-Schritt, kein Secret, kein Flag, kein Datenlauf | Michael | nach CI grün | [x] 2026-09-18, PR #82 (`289f831`) |
| Nach dem Deploy: bei der nächsten fertigen Phase den Knopf einmal in der laufenden Sitzung benutzen und prüfen, dass `/clear` und Befehl im Terminal stehen (AN-01/AN-04) | Michael | nach Deploy | [ ] |

Kein Datenlauf auf Bestandsdaten, keine Freigabe je Umgebung: die Zuordnungsdatei behält Felder und Version, die neuen Protokollfelder sind optional, ein alter Browser-Stand ignoriert sie.

### 11. Schätzung

<!-- leser: mensch -->

8–10 h in einer Sitzung (nach zwei Review-Runden um Live-Kennung, Waiter-Sperre, Ziel-Nachladen, strenge Bildschirmprüfung mit Fixtures, Re-Check im Schloss und elf Tests gewachsen; Review E25): Probe Schritt 0 mit Scratch 0,5–1 h, Protokoll und Reader mit Tests 1 h, Manager-Option und Listener 0,5 h, `isIdlePrompt` mit Fixtures 0,5 h, Service (Helfer aus `pasteLocked`, Weiche, In-Sitzung-Pfad, Warten auf die Kennung, Re-Check) mit Tests 3 h, Frontend mit Tests 1,5 h, Docs, E2E und Screenshots 1,5 h. Unsicherheit: die Probe (R1/R2) — scheitert das gepastete `/clear`, kostet der Rückfall auf eine Tastenfolge mit Menü-Prüfung 1–2 h zusätzlich; und die happy-dom-Tests des Kastens (Vorbelegung nach `loadTargets`, das ist asynchron mit `vorhabenService.targets`-Mock).

### 12. Review des Plans

<!-- leser: mensch -->

<!-- Vor der Freigabe. Self-Review oder externe Reviewer (Multi-LLM). Jeder Blocker adressiert, jedes Minority-Finding begründet angenommen oder abgelehnt.
     Jede Entscheidung nennt Finding und Gegenstand in einem Satz (R2), damit die Person aus dem Chat heraus widersprechen kann. -->

| Finding | Quelle | Entscheidung | Änderung am Plan |
|---|---|---|---|
| F1, Intent RB-03 begründet mit „Sitzungsdeckel fünf" (`cloud-terminal-manager.ts:673` alt): der Deckel ist seit `1cc2f1a` (18.02.2026) `Infinity`. | Self (Code) | angenommen als Korrektur: RB-03 stützt sich nur auf das RAM-Argument (AR-02); keine Änderung an AKs | §2, „In einfachen Worten" |
| F2, AN-01 im Intent setzt auf den Bildschirm als einziges Signal für „geleert"; der Bildschirm unterscheidet nicht zwischen „Menü offen" und „geleert". | Self | angenommen: hartes Signal = neue Gesprächskennung aus `session.hook-context` (Emit nur bei Änderung, `:527-541`); Bildschirm bleibt Dialogprüfung; Timeout fail closed | §3 `clearAndPaste`, §3 Alternativen, §9 R2 |
| F3, `session.agent-event session-start` als Signal wäre bei einer 10 min ruhenden Sitzung stumm (`applyAgentEvent` emittiert nicht bei `idle → idle`). | Self (Code) | angenommen: deshalb Kennung statt Statusereignis (siehe F2) | §2, §3 Alternativen |
| F4, „Bau fortsetzen" (Phase `bau` mit `build-stand.md`) ist heute bei ruhender Sitzung frei (`bau_unterbrochen` zählt nicht als busy); die neue Phasenregel würde ihn sperren (`build` = `build`) — Widerspruch zu NZ-04 „wie heute". | Self (Code `:483`) | angenommen: `interrupted` überspringt Phasen- und Freigabeprüfung; Service startet dort wie heute neue Sitzung ohne Schließen; kein `nextStep.sitzung` | §3 Regel, §8 NZ-04 |
| F5, `agentStatus: 'error'` gilt im Reader als beendet, wäre in der Regel aber weder `working` noch `blocked` und liefe bis zum Phasenvergleich. | Self | angenommen: erste Zeile der Regel behandelt `error` wie `ended` (AK-10) | §3 Regel |
| F6, Zwei Pastes unter zwei Schlössern ließen einen Freitext oder zweiten Klick zwischen `/clear` und Befehl. | Self | angenommen: ein `withMachineWrite` um beide Pastes; `pasteLocked` in zwei Helfer zerlegt, Semantik unverändert | §3, §9 R4, R7 |
| F7, Der Resolver für die Kennung muss **vor** dem `/clear`-Paste scharf sein — der Hook kann schneller sein als die 150 ms bis Enter plus Rundreise. | Self | angenommen: `waitForNewConversation` wird vor `sendInput` erzeugt | §3 `clearAndPaste` |
| F8, Schließen aus dem Service über `sessions.closeSession` kommt beim Browser ohne `closedBy: 'user'` an → Tab bleibt mit „Prozess beendet" (Z-02 verletzt). | Self (Code `websocket.ts:2050-2064`, `app.ts:1241`) | angenommen: Option am Manager, Emit mit drittem Argument, `userClosedSessionIds` entfällt (eine Mechanik) | §3 Manager, §4 #4/#5, §8 |
| F9, Reihenfolge AK-05: alte Sitzung vor dem Start schließen würde bei Startfehler die Zeile ohne Sitzung lassen; in derselben Kopie wandert das Cleanup-Token nur, wenn die neue Sitzung schon läuft. | Self (Code `disposeSessionWorktree:1184-1199`) | angenommen: erst `createSession`, dann `closeSession`; Test „Start wirft → alte bleibt" | §3, §8 AK-05 |
| F10, Vorbelegung des Kastens: mit der heutigen Kette (lastModel → Schritt-Standard) wäre der Standardklick oft AK-05, obwohl der Intent „Modell und Arbeitskopie bleiben" sagt. | Self | O1 entschieden 2026-09-18 (Product Owner): wie vorgeschlagen — aus der Sitzung vorbelegen; Plan setzt es in §3 Frontend um | „Was musst du entscheiden?", §3 Frontend, §9 R6 |
| F11, Jeder `vorhaben:state`-Broadcast liefert neue Zeilenobjekte; eine Vorbelegung bei jedem Prop-Wechsel überschriebe die Wahl im Kasten. | Self (Falle aus `willUpdate` `:141-144`) | angenommen: Vorbelegen nur bei Wechsel von `step` oder `sitzung.id` (`vorbelegtFuer`); Test | §3 Frontend, §8 AK-07 |
| F12, Pfadvergleich im Browser (`row.cwd` vs Picker) scheitert an Realpaths (`/tmp` ↔ `/private/tmp`, Memo 16.09.). | Self | angenommen: Backend liefert das Ziel in Picker-Form (`target` mit `safeKey`), Service vergleicht selbst | §3 Protokoll, Alternativen |
| F13, `sessionBusy` entfernen hieße 32 Fixture-Stellen anfassen ohne Nutzen. | Self (Minimalinvasiv) | angenommen: Feld bleibt als `!!sperre`, Test belegt die Gleichheit | §2, §3 Alternativen |
| F14, `freigabe_offen` ist in der Praxis fast immer mit `gleiche_phase` deckungsgleich — nötig? | Self | angenommen als eigener Grund: AK-01 nennt „keine Freigabe offen" ausdrücklich; deckt den Fall „Dokument von einer Sitzung außerhalb der UI geschrieben"; Text nennt die Freigabe als Weg | §3 Regel |
| F15, `startFreigabe` (Freigabe ohne lebende Sitzung) trifft im Backend eine inzwischen lebende, freie Sitzung. | Self | angenommen als Klarstellung: dann `freigabe_offen` → `SESSION_BUSY`, Seite zeigt den Text, beim nächsten Versuch geht die Freigabe in die lebende Sitzung (NZ-02); kein Sonderpfad | §3 (`reusableSession`), §9 R8 |
| F16, Nach `/clear` verliert die Zuordnung die Marke `resumed` und bekommt die neue Kennung — gewollt? | Self | angenommen als Klarstellung: das Gespräch ist neu, eine Wiederaufnahme nach Absturz muss das neue fortsetzen (INT-2026-019 E29 hat den Kennungswechsel schon getestet) | §3 `startInSession` |
| E1 (Blocker, 2/2), Signal „neue Gesprächskennung" sei zeitkritisch: Hook könnte vor dem Paste feuern, Ereignisse könnten gebündelt kommen, eine Sitzung könnte die Kennung wiederverwenden → stiller Fehlschlag oder Timeout bei jedem Klick; dazu: `reusableSession` müsse die **Live**-Kennung lesen, nicht die der Zuordnung. | opus, minimax | angenommen mit Änderung: (a) `vorher` wird im Schloss unmittelbar vor dem Scharfstellen aus `getSession(id).claudeSessionId` gelesen, nie aus der Zuordnung; (b) der Waiter ist vor dem Paste scharf (F7), ein früher Hook geht nicht verloren; (c) „stiller Fehlschlag" gibt es nicht — der Timeout ist fail closed mit Meldung im Kasten und `console.warn`; (d) ein fremdes `/clear` im selben Moment liefert ebenfalls ein leeres Gespräch, kein Fehlverhalten; (e) ob `/clear` die Kennung wechselt, wird in Schritt 0 als Messwert 1 festgehalten — wechselt sie nicht, greift Plan B (`session.cleared` aus `SessionStart` mit `source: 'clear'`, eine Zeile Route, eine Methode Manager) vor dem ersten Code | §3 `clearAndPaste`, Absatz „Warum die Kennung", Plan B; §6 Schritt 0; §8 AK-08 (1b), (1c), (7) |
| E2 (Blocker, 2/2), ein Schloss um beide Pastes plus Wartezeit: bei Timeout 5 s blockiert es andere Maschinen-Schreiber (Freigabe, erste Eingabe); und `pasteLocked` gebe das Schloss angeblich nur wegen des `setTimeout` erst nach Enter frei. | opus, minimax | teilweise angenommen: das Schloss ist **je Sitzung** (`session.machineWriteBusy`, `:553-562`), nicht global — es sperrt genau die Sitzung, die gerade geleert wird, und das soll es (F6); ein Freitext bekommt `beschaeftigt` (heute schon ein Grund in `FREITEXT_GRUND_TEXT`), die erste Eingabe wird beim nächsten Stop erneut versucht (`:1120-1124`); 5 s sind der Fehlerpfad, der Normalfall liegt bei ~200 ms (Loopback-Hook). Die Lesart zu `pasteLocked` ist falsch: `run` gibt das Schloss frei, wenn es zurückkehrt, und es kehrt nach dem `await` auf den Enter-Timer zurück — `unref` spielt keine Rolle. Angenommen als Test „Schloss erst nach dem zweiten `\r` frei" und als Absatz im Plan | §3 Absatz „Das Schloss", §8 AK-08 (6) |
| E3 (Blocker, 2/2), Rückfall des Kastens auf „Im Projekt", wenn der Sitzungs-Worktree nicht in der Zielliste steht, weicht stillschweigend von AK-07 ab; dazu Live-Kennung (siehe E1). | opus, minimax | angenommen: Ziel der Sitzung wird immer vorbelegt; bei neuer `sitzung` lädt der Kasten die Ziele neu (ein nach dem Einhängen angelegter Worktree fehlte sonst), und fehlt der Pfad weiter, ergänzt er die Option aus `sitzung.target` — kein stiller Wechsel auf AK-05; Live-Kennung → E1 (a) | §3 Frontend, §8 AK-07 |
| E4 (1/2), Provider-Rückfall `?? 'anthropic'` uneinheitlich zwischen `sessionRefOf`, `sameModel`, `doResume`. | opus | angenommen: ein Helfer `providerOf(a, live)` für alle drei Stellen (auch `doResume` (8) `:1013`); Test mit Zuordnung ohne `provider` | §3 Service, §8 „Provider-Fallback" |
| E5 (1/2), zweiter Aufruf überschreibt den Resolver in `clearWaiters`, der erste hinge für immer. | opus | angenommen: `waitForNewConversation` gibt `'beschaeftigt'` zurück, wenn schon ein Waiter für die Sitzung liegt (kein Überschreiben); unter `withMachineWrite` kommt der zweite Aufruf ohnehin nicht bis dahin, ohne Schloss (Test-Fakes) greift die Sperre; Test (3b) | §3 `waitForNewConversation`, §8 AK-08 (3b) |
| E6 (1/2), Regel doppelt in Reader und Service; grep-Nachweis in §5 #1 zerfalle bei einem fünften Parameter. | minimax | abgelehnt als Fehler, angenommen als Test: die Regel ist **eine** Funktion (`deriveNextStepSperre`), beide rufen sie; eine Signaturänderung bricht `tsc`, nicht den Nachweis. Ergänzt: Test „`SESSION_BUSY`-Text == `NEXT_STEP_SPERRE_TEXT[row.nextStep.sperre]` der gebroadcasteten Zeile" | §8 „Regel = Fehlertext" |
| E7 (1/2), `/clear` während eines Werkzeug-Freigabedialogs (Tool-Use) werde weder von `dialog` noch `working` erkannt. | opus | abgelehnt mit Beleg: `PermissionRequest` liefert `blocked` mit `blockKind: 'berechtigung'` (`claude-hooks.ts:224-231`) → Regel `'dialog'`; die Bildschirmprüfung kennt `PERMISSION_CUE` (`dialog-driver.ts:33`, „Do you want to proceed/run this command/…"); die Bildschirm-Probe setzt `blocked` auch ohne Hook (INT-2026-016 AK-10); UI-Sitzungen laufen mit `--dangerously-skip-permissions` (Memo 16.09.). AK-02-Test deckt jede `blockKind` | — |
| E8 (1/2), Netzlatenz des Hooks könne die 5 s reißen; keine Beobachtbarkeit, keine Tuning-Angabe. | opus | teilweise angenommen: der Hook läuft über Loopback (`claude-hooks.ts:95`, `127.0.0.1:<port>`), nicht übers Netz — gemessene Hook-Latenz 165 ms (INT-2026-010); Schritt 0 misst die `/clear`-Latenz als Messwert 2. Angenommen: `console.warn` bei Timeout (eine Zeile, greppbar im Backend-Log); kein Metrik-System in dieser UI, ein Zähler wäre eigenes Vorhaben | §3 `clearAndPaste`, §6 Schritt 0, §8 AK-08 (1) |
| E9 (1/2), drittes Positionsargument an `emit('session.closed', …)` sei brüchig; besser ein Options-Objekt. | opus | abgelehnt: ein Options-Objekt als zweites Argument änderte die Form für drei bestehende Listener und ihre Tests (`plan-review-orchestrator.ts:155`, `vorhaben-service.ts:792`, `websocket.ts:2050`); ein optionales drittes Argument ist rückwärtskompatibel und wird im JSDoc des Ereignisses am Manager dokumentiert; ein Listener, der es braucht, liest es ausdrücklich (Test in `cloud-terminal-restore.test.ts`) | §3 Manager |
| E10 (1/2), das Halten des Schlosses während `settleEnter` hänge implizit an `.unref()`. | minimax | abgelehnt mit Erklärung: `unref` entscheidet nur, ob der Timer den Prozess offen hält; das Promise wird in jedem Fall nach 150 ms aufgelöst, `await` in `run` hält das Schloss. Angenommen als Test (6) und Absatz im Plan (siehe E2) | §3 Absatz „Das Schloss", §8 AK-08 (6) |
| E11 (Runde 2, 2/3), Kennungssignal zeitkritisch: Hook könne vor dem Enter feuern; ein kurz vorher getipptes `/clear` könne den Waiter verfehlen, `vorher` sei dann schon gewechselt und der Klick laufe in den Timeout. | opus, minimax | angenommen als Klarstellung und Test: `vorher` wird **im selben Tick** gelesen und der Waiter registriert (kein `await` dazwischen) — ein Hook kann nicht zwischen beide Anweisungen treten; ein vorher eingetroffener Hook steckt schon in `vorher`, unser `/clear` liefert dann eine weitere neue Kennung; trifft eine fremde neue Kennung nach dem Scharfstellen ein, ist das Gespräch ebenfalls leer und der Befehl geht in ein leeres Gespräch (Test (1d)). „Hook vor dem Enter" ist unmöglich — `/clear` läuft erst mit Enter | §3 `clearAndPaste` (Kommentar E13), §8 AK-08 (1d) |
| E12 (Minderheit, Runde 2), Plan B ohne Nutzlast, Unterscheidung getippt/gepastet, Stapeln. | opus | angenommen: Nutzlast = Sitzungskennung; keine Unterscheidung nötig (beide leeren das Gespräch); ein Waiter je Sitzung in derselben Map, Ereignis ohne Waiter wird ignoriert | §3 Plan B |
| E13 (Minderheit, Runde 2), nach dem Registrieren erneut `claudeSessionId !== vorher` prüfen (Early-Exit). | minimax | abgelehnt: Lesen und Registrieren sind synchron im selben Tick, `onHookContext` kann nicht dazwischen laufen — die Prüfung hätte nie ein anderes Ergebnis; als Kommentar-Invariante im Code festgehalten („no await from here to the paste") | §3 `clearAndPaste` |
| E14 (Minderheit, Runde 2), `agentStatus: 'unknown'` einer früheren Phase gilt als frei — genau der Zustand nach Restore oder ohne Hook, in dem Claude mitten im Turn sein kann. | glm | angenommen, zweifach: (a) neuer Sperrgrund `'unbekannt'` in der Regel; (b) der In-Sitzung-Pfad prüft den Bildschirm **streng** (live, stabil, kein Dialog, leere Eingabezeile sichtbar, kein Spinner — `isIdlePrompt`), weil ein `/clear` in eine arbeitende Sitzung gepuffert und Minuten später ausgeführt würde (R10); Fixtures aus Schritt 0 | §3 Regel, `screenCheck 'strict'`, `isIdlePrompt`; §4 #3b/#3c/#10b; §8 AK-02, AK-08 (9), (10); §9 R10, R11 |
| E15 (Minderheit, Runde 2), Sperre wird im Schloss nicht erneut geprüft; ein getippter Befehl oder ein zweites Gerät könne zwischen Prüfung und Paste die Sitzung verändern. | glm | angenommen: die Bildschirmlesung dauert ~300 ms — danach synchroner Re-Check vor dem Paste (`status` nicht `working`/`blocked`, Zuordnung noch dieselbe Sitzung und derselbe Schritt via `istNoch`), sonst `arbeitet`/`beschaeftigt`; Tests (8), (8b). Vor der Lesung gibt es kein Fenster: `withMachineWrite` setzt `machineWriteBusy` synchron und ruft `run` synchron (`:553-562`) | §3 `clearAndPaste`, §8 AK-08 (8), (8b) |
| E16 (Minderheit, Runde 2), Reader setze `sitzung` nur mit `ref.target`, der Service rechne aus `a.cwd` — Ankündigung und Verhalten könnten auseinanderlaufen. | glm | abgelehnt als Lücke: beide kommen aus derselben Zuordnung — `sessionFor` setzt `target` über `targetOf(a.cwd)` für jede lebende Zuordnung (nie `undefined`), `sameTarget` vergleicht dieselben `a.cwd`/`project.path`; nur Fixtures ohne `target` zeigen keine `sitzung`. Angenommen als Test: `nextStep.sitzung.target` == das Ziel, das `sameTarget` als gleich annimmt | §8 „Regel = Fehlertext" |
| E17 (Minderheit, Runde 2), `sameTarget` akzeptiere Pfade, die auf der Platte fehlen → Wiederverwendung gegen eine „tote" Sitzung. | minimax | abgelehnt: die Sitzung lebt (Prozess aktiv, `status === 'active'`), unabhängig davon, ob ihr Verzeichnis noch existiert; der In-Sitzung-Pfad greift nicht auf die Platte zu. Beim Neustart-Pfad prüft der Manager (`TARGET_NOT_FOUND`) wie heute | — |
| E18 (Minderheit, Runde 2), `interrupted` kehre vor der `freigabeDoc`-Prüfung zurück — „Bau fortsetzen" mit offener Freigabe wäre frei. | minimax | abgelehnt als Fehler (Phase `bau` hat nie ein Freigabe-Dokument: `deriveReviewDoc` `:176-190` kennt keinen `bau`-Zweig, `freigabeDoc` ist dort immer `undefined`), angenommen als Reihenfolge: `freigabeDoc` wird trotzdem vor `interrupted` geprüft — kostet nichts, liest sich eindeutig | §3 Regel |
| E19 (Minderheit, Runde 2), `claudeSessionId` sei während des Pastes durch `setAssignment` änderbar, der Plan behaupte Unveränderlichkeit. | minimax | abgelehnt: der Plan behauptet das nicht — der Hook-Listener **soll** die neue Kennung in die Zuordnung schreiben; der Vergleich läuft gegen die Live-Sitzung, `setAssignment` nach dem Befehl übernimmt `sessionContext(id)` (live). Test (7) deckt den Wechsel | — |
| E20 (Minderheit, Runde 2), Stage-3/4-Tests beobachteten genau das, was der Umbau von `pasteLocked` ändere. | minimax | angenommen als Regel: die `await`-Struktur von `run` bleibt, nur Zeilen wandern in Helfer; Stage-2/3/4-Tests bleiben unverändert und laufen in Schritt 4 **vor** jedem Feature-Code (R7) | §3 `settleEnter`-Absatz, §6 Schritt 4 |
| E21 (Minderheit, Runde 2), kein Test für ein von Hand getipptes `/clear` während der Sequenz. | opus | angenommen: Tests (1d) (fremde neue Kennung) und (8) (Status springt auf `working` während der Lesung) | §8 AK-08 |
| E22 (Minderheit, Runde 2), ein Listener könnte `arguments.length` prüfen. | opus | abgelehnt mit Prüfung: die drei Listener (`websocket.ts:2050`, `vorhaben-service.ts:792`, `plan-review-orchestrator.ts:155`) nehmen benannte Parameter; `grep -n "arguments" …` in Schritt 0 (a) belegt es | §6 Schritt 0 |
| E23 (Minderheit, Runde 2), Zielvergleich gehöre auf den Server. | minimax | abgelehnt als Lücke: er **ist** dort (`sameTarget` mit `safeKey` im Service entscheidet); der Browser vergleicht nur für den Hinweissatz (F12) | — |
| E24 (Minderheit, Runde 2), die ergänzte Worktree-Option könne auf ein gelöschtes Verzeichnis zeigen (`ENOENT`). | opus | angenommen als Klarstellung: der In-Sitzung-Pfad braucht das Verzeichnis nicht; wählt Michael dazu ein anderes Modell (Neustart-Pfad), meldet der Manager `TARGET_NOT_FOUND` → `START_FAILED` mit Text im Kasten — heutiger Fehlerweg, keine Sonderbehandlung | §3 Frontend |
| E25 (Minderheit, Runde 2), 6–8 h zu knapp; 10–12 h. | opus | teilweise angenommen: 8–10 h (die zweite Runde hat strenge Bildschirmprüfung, Fixtures, Re-Check und fünf Tests hinzugefügt; E2E-Rezept und Fake existieren) | §11 |

**Minimalinvasiv geprüft:** wiederverwendet werden der gesicherte Schreibpfad (`readStableScreen`, `findDialogCue`, Bracketed Paste, `withMachineWrite`), die Hook-Route samt `session.hook-context` (Signal für `/clear` ohne neuen Listener am Manager), `onPromptText`/`moveAssignment` (bestätigt die Zuordnung nach dem Befehl), `createSession`/`setSessionName`/`setLastModel`/`setFirstInput` (heutiger Startweg), `closeSession` mit Nachfolger-Übergabe des Worktrees, `vorauswahl`/`modellVorhanden`, `FREITEXT_GRUND_TEXT`/`SEND_REASON_TEXT`, der `FakeManager` aus dem Resume-Test, das Request/Reply-Muster. Gestrichen: eine neue Service-Dep fürs Schließen, `sessionBusy`-Entfernung, Regel im Browser, Bildschirm als Signal, Bestätigungsdialog. Kein AK fällt weg; NZ-01–NZ-06 bleiben gewahrt (NZ-04 durch `interrupted`, NZ-02 durch unveränderte Freigabe-Pfade).

**Abgleich Mensch/Agent:** „In einfachen Worten", §9, §10, §12 gegen §2–§8 gelesen am 2026-09-18 (nach Einarbeitung von E1–E25): ohne Befund — die drei Bausteine entsprechen §3 (Regel ↔ `deriveNextStepSperre`, „in der Sitzung" ↔ `startInSession`/`clearAndPaste` mit Live-Kennung und Plan B, „neu, alte schließen" ↔ AK-05-Zweig mit `closedBy: 'user'`); die Fehlerfälle entsprechen §8 AK-08 (1)–(10) und §9 R1–R11 (strenge Bildschirmprüfung und „unbekannt" stehen in beiden Teilen); die Vorbelegung „immer das Ziel der Sitzung" (E3) steht in beiden Teilen; O1 ist in §3 Frontend als Vorschlag umgesetzt; die Korrektur zum Sitzungsdeckel steht in §2 und F1 (R4).

### 13. Definition of Done

<!-- leser: agent -->

- [x] Jedes AK aus Abschnitt 8 hat einen grünen Test (Reader 46, Service 21 neu + 72 bestehend, dialog-driver 18, Frontend 7 neu + bestehende).
- [x] Alle Nachweise aus Abschnitt 5 ausgeführt und im PR zitiert (#1–#10, `userClosedSessionIds` = 0).
- [x] E2E-Pfad läuft (Abschnitt 8): Protokoll und Screenshots A–E (Mac und Handy) unter `design/`.
- [x] `verify: OK` lokal (47 s), Ausgabe im PR #82 — **PR-Check `verify` grün (1m47s)**, CI ist die Wahrheit.
- [x] `docs/architecture.md` §2/§3/Änderungsprotokoll und `docs/design.md` angepasst (kein ADR, Abschnitt 3 „Nein").
- [x] Manuelle Schritte (Abschnitt 10): O1 und Probe erledigt, Merge und Prüfung nach dem Deploy offen; Probe als Zeile in §14.
- [x] Abweichungen von diesem Plan in Abschnitt 14 eingetragen (6 Zeilen).
- [x] 2x-Regel-Check: kein Fehler aus der Liste wiederholt; ein neuer Vorschlag für `CLAUDE.md` steht im PR (Bildschirm-Merkmale je Claude-Code-Version).
- [x] Abschlussbericht nach R3 (nur Mensch-Abschnitte im Chat), endet mit dem Block „Für das Board" (Karte „PO-Entscheidung FA-12 …" → `✅ Erledigt`, PR-Link, Stand, Verweis auf `intent/INT-2026-018-naechster-schritt-in-sitzung/`); Nachziehen in eigener Sitzung.

### 14. Abweichungen bei der Umsetzung

<!-- leser: mensch -->

<!-- Wird während der Umsetzung gepflegt. Der committete Plan muss am Ende zum Diff passen. Jede Zeile nennt Gegenstand und Grund in einem Satz (R2). -->

| Datum | Abweichung | Grund | Auswirkung auf Abschnitt |
|---|---|---|---|
| 2026-09-18 | Probe Schritt 0 (b) bestanden, Plan A bleibt: gepastetes `/clear` (Bracketed Paste über `sendInput`, 150 ms, `\r`) läuft wie getippt — Bildschirm geleert, Messwert 1: Kennung gewechselt (`2d722405…` → `7067d332…`), Messwert 2: Enter → Registry-Änderung **104 ms**; gepastetes `/specwright:plan INT-…` löst `UserPromptSubmit` (Zeile `arbeitet` nach 302 ms, `moveAssignment` ohne Tab-Umbenennung wie erwartet); 0 × `agent-event rejected` | Claude Code 2.1.276, Scratch `/private/tmp/scratch-int018`, Skript `probe-018.mjs` im Sitzungs-Scratchpad | §3 Plan B entfällt; §6 Schritt 0 erledigt |
| 2026-09-18 | `isIdlePrompt`: Spinner-Erkennung über `…\s*\(…\d+s\b` statt `esc to interrupt` | Claude Code 2.1.276 zeigt die leere Eingabezeile `❯` **auch während eines Turns**; die Spinner-Zeile lautet `✻ Enchanting… (4s · ↓ 204 tokens · thinking)`, `⎿  Running… (3s)`, `· Generating… (10s …)` — ohne „esc to interrupt". Die Regel aus §3 („eine Zeile `^\s*❯\s*$` und keine Zeile mit `esc to interrupt`") hätte eine arbeitende Sitzung als ruhig erkannt (erste Probe-Aufnahme). Idle-Nachlauf `✻ Churned for 10s · done 8:38` enthält kein `…(` und zählt nicht als Spinner | §3 `isIdlePrompt`, §4 #3b, §8 AK-08 (9)/(10) |
| 2026-09-18 | Zwei bestehende `toEqual`-Zusicherungen auf die Sitzungsreferenz um die neuen Felder ergänzt (`vorhaben-service-stage2.test.ts:174` → `step/provider/target`, `stage3.test.ts:342` → `step: 'intent'` der anhängigen Absicht) | Die Referenz trägt die drei Felder jetzt gewollt (§3 Protokoll); Stage-Tests prüfen die Referenz mit `toEqual`, nicht `toMatchObject`. Kein Verhalten der Freitext-Pfade geändert (R7: `writes`-Reihenfolge unverändert, 72 Service-Tests grün) | §4 #14 |
| 2026-09-18 | Drei Alt-Tests starteten einen Schritt neben einer **lebenden** Sitzung derselben Zeile und erwarteten eine zweite Sitzung (`vorhaben-service-stage2.test.ts:181` zweiter `startStep` bei Status `unknown`, `:502` Handler-Start bei `freigabe_offen`, `vorhaben-service-resume.test.ts:456` Start nach abgeschlossener Wiederaufnahme bei `working`) — jetzt erwarten sie `SESSION_BUSY` und beenden die Sitzung, bevor der Start wie bisher läuft | Genau das sperrt die neue Regel (AK-02/AK-03, `reusableSession` wirft `SESSION_BUSY`); §4 #14 nannte nur `modus: 'neu'`. Kein Verhalten der Alt-Pfade geändert — die Tests prüfen jetzt Regel + AK-10-Pfad | §4 #14, §8 AK-10 |
| 2026-09-18 | `reusableSession` behandelt `agentStatus: 'error'` wie „keine Sitzung" (AK-10) — der Plan-Entwurf prüfte nur `live.status !== 'active'` | Test AK-10 fand es: eine Sitzung mit Fehler-Ende ist im Manager noch `active`; der Reader zählt sie als keine (F5), der Service hätte `/clear` hineingeschrieben. Eine Zeile, Regel bleibt eine Funktion | §3 `reusableSession` |
| 2026-09-18 | Fixtures unter `ui/tests/fixtures/tui/2.1.276/` statt `2.1.273/` | Aufnahme lief auf Claude Code 2.1.276 (Version im Bildschirmkopf); Fixture-Ordner tragen die aufgenommene Version | §4 #3c |
