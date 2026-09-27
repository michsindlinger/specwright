# Plan: UI: Agenten rufen an — Warteschlange, Sprechfassung, lokale Sprache

<!-- Ablage: intent/INT-2026-025-agenten-anrufe/plan.md -->

> **Intent:** `intent.md` (INT-2026-025) · **Spec:** `spec.md` (freigegeben 2026-09-27)
> **Status:** umgesetzt
> **Erstellt:** 2026-09-27 im Plan Mode · **Freigabe:** Product Owner (Michael Sindlinger), 2026-09-27 — im Chat „freigabe"; O1–O4 wie vorgeschlagen
> **Pflichtinput gelesen:** `docs/architecture.md` (Stand f14299f), `CLAUDE.md`, `docs/security.md`, `docs/design.md`, `docs/adr/0004-sitzung-zeigen-statt-nachlesen.md`

## In einfachen Worten

<!-- leser: mensch -->

**Worum geht es?** Du arbeitest oft in mehreren Claude-Sitzungen gleichzeitig. Ob eine davon gerade eine Frage an dich hat, einen Plan zur Freigabe vorlegt oder fertig ist, siehst du heute nur, wenn du auf den Bildschirm schaust: Die Glocke oben rechts zählt mit, ein kurzer Ton kündigt an, lesen musst du selbst. Das Vorhaben macht daraus einen „Anruf": Die Web-UI klingelt, du nimmst an, sie liest dir in wenigen Sätzen vor, worum es geht, und du antwortest mit der Stimme. Alles läuft auf deinem Mac, ohne Bezahldienst und ohne dass Sprache den Rechner verlässt.

**Was ändert sich?** In den Einstellungen gibt es einen neuen Schalter „Anrufmodus", Standard aus. Solange er aus ist, ändert sich nichts — weder in der Glocke noch im Terminal. Schaltest du ihn an, passiert Folgendes:

- Stellt eine Sitzung eine Rückfrage, legt einen Plan vor oder wird fertig, erscheint oben rechts ein Kasten mit einem eigenen Klingelton (anders als der Glockenton). Liegt der Browser-Tab im Hintergrund, meldet sich zusätzlich der Mac mit einer Mitteilung.
- Immer nur ein Anruf zur Zeit. Weitere Meldungen warten in einer Reihe; Fragen und Pläne kommen vor Fertig-Meldungen dran. Der Kasten sagt „noch 2 warten".
- Du kannst annehmen, ablehnen (die Meldung bleibt in der Glocke, klingelt aber nicht noch einmal) oder „später" wählen (sie stellt sich hinten an).
- Nach dem Annehmen liest die UI vor: bei „fertig" eine kurze Zusammenfassung, die der Agent selbst ans Ende seiner Antwort schreibt („Sprechfassung", höchstens 80 Wörter, ohne Code und Dateipfade — steht auch im Terminal); bei einer Rückfrage die Frage und die nummerierten Antwortmöglichkeiten; bei einem Plan die Sprechfassung des Plans.
- Du drückst „Sprechen" (oder hältst die Leertaste, solange der Kasten den Fokus hat), sagst deine Antwort, drückst „Fertig". Die UI zeigt, was sie verstanden hat und als was sie es senden würde („Möglichkeit 2 — …" oder „Neue Eingabe an Sitzung …"). Erst nach „Senden" (Knopf oder das gesprochene Wort „senden") geht die Antwort in die Sitzung.
- Einen Plan gibt die UI nur nach einer zweiten, ausdrücklichen Nachfrage frei („Plan wirklich freigeben? Sag ja oder nein."). Alles andere, was du zu einem Plan sagst, geht als Überarbeitungswunsch zurück.
- In der Glocke steht bei Fragen, Plänen und Fertig-Meldungen ein Knopf „Anrufen" — damit holst du auch ältere oder abgelehnte Meldungen per Stimme.
- Berechtigungsfragen („darf ich diesen Befehl ausführen?") klingeln nie; sie bleiben wie heute in der Glocke.

Der Anrufmodus geht nur im Browser am Mac, auf dem auch das UI-Backend läuft (Adresse `http://localhost:3001`). Am Handy, über die Tailscale-Adresse oder auf dem Cloud-Rechner steht „nicht verfügbar" mit Grund; die Glocke arbeitet dort wie gewohnt.

**Wie wird das gemacht?** Fünf Bausteine:

1. **Was vorgelesen wird.** Claude Code schickt der UI bei jedem dieser Ereignisse schon heute eine kleine Meldung („Hook"). Darin steckt der volle Text: die letzte Antwort, alle Fragen mit Möglichkeiten, der Plantext. Die UI schneidet das heute bewusst auf 160 Zeichen ab (Entscheidung von INT-2026-011, dokumentiert als ADR-0004: „die Sitzung wird gezeigt, nicht nachgelesen"). Neu: Nur bei eingeschaltetem Anrufmodus hebt die UI den Inhalt auf — ausschließlich im Arbeitsspeicher, nie auf der Festplatte, und nur, bis die Meldung erledigt ist. Das braucht ein neues ADR (0006), das ADR-0004 für genau diesen Zweck ergänzt.
2. **Wie der Agent die Sprechfassung schreiben lernt.** Claude Code kann vor jeder Eingabe einen kleinen Befehl ausführen und dessen Ausgabe als Zusatzhinweis mitnehmen. Dieser Befehl fragt nicht beim Backend nach (das könnte hängen und jede Eingabe verzögern), sondern schaut nur nach, ob im Laufzeitordner eine Datei mit dem Hinweis liegt — das dauert Millisekunden. Ist der Anrufmodus an, legt das Backend dort den Hinweis ab: „Beende jede Antwort mit einem Absatz ‚Sprechfassung: …' (höchstens 80 Wörter, Alltagssprache, ohne Code, Pfade, Tabellen, Links); beginne einen Plan ebenso". Ist er aus, liegt dort nichts — mit einer Ausnahme: Jede Sitzung, die den Hinweis bekommen haben kann, findet einmal „Anrufmodus aus: keine Sprechfassung mehr". Messe ich im Test eine spürbare Verzögerung (mehr als 20 Millisekunden bei 95 von 100 Eingaben), wird die Funktion abgeschaltet und ich melde mich; ein Abschalter über eine Umgebungsvariable ist eingebaut. Beides habe ich heute an einer echten Sitzung ausprobiert: Der Agent schreibt den Absatz zuverlässig, und ohne den Gegenhinweis schreibt er ihn weiter, weil der Hinweis im Gesprächsverlauf steht. Nichts davon landet in der `CLAUDE.md` eines Projekts.
3. **Spracherkennung auf dem Mac.** Die UI nutzt „whisper.cpp", ein freies Programm, das Sprache lokal in Text umwandelt (auf deinem Mac schon per Homebrew installiert), mit dem Sprachmodell „large-v3-turbo" (574 MB, einmal herunterladen). Gemessen heute mit zehn deutschen Sätzen (Spec, Merge, Pull Request, Freigeben …): im Mittel 0,64 Sekunden vom Satzende bis zum Text, knapp 5 % falsche Wörter, 0,8 GB Arbeitsspeicher. Das Programm läuft nur, solange der Anrufmodus an ist, hört nur auf Anfragen vom eigenen Rechner und bekommt die Aufnahme direkt im Speicher — keine Audiodatei auf der Festplatte. Einschränkung: gesprochen hat die eingebaute Mac-Stimme „Anna", nicht du. Die Messung mit deiner Stimme (20 Sätze) ist ein Schritt vor dem Merge.
4. **Vorlesen.** Der Browser hat eine eingebaute Vorlesefunktion; auf dem Mac nutzt sie die deutschen Mac-Stimmen (Anna u. a.), die lokal installiert sind. Die UI wählt nur Stimmen, die sich selbst als „lokal" ausweisen, und liest Satz für Satz (Chrome bricht lange Texte sonst ab). Keine neue Installation nötig.
5. **Antworten in die Sitzung tippen.** Das ist der aufwendigste Teil, und hier lag die Spec falsch: Sie nahm an, die UI könne schon Rückfragen und Pläne per Tastendruck beantworten. Das kann sie nicht — sie erkennt diese Dialoge nur. Ich habe heute an einer echten Sitzung (Claude Code 2.1.283) ausprobiert, welche Tasten was tun: Eine Ziffer wählt eine Möglichkeit (bei einer einzelnen Frage wird sofort gesendet), die letzte Nummer ist „eigene Antwort" (Text einfügen, Enter), bei Mehrfachauswahl setzt eine Ziffer ein Häkchen und Tab geht zur nächsten Frage, am Ende „1" für „Absenden". Im Plan-Dialog gibt „1" frei, „3" plus Text plus Enter schickt einen Überarbeitungswunsch. Die UI tippt wie bisher nach der Projektregel AR-08: erst den Bildschirm lesen, dann genau eine Taste, dann nachlesen; passt etwas nicht, bricht sie ab statt weiterzutippen. Vor dem Senden prüft sie, dass die Sitzung noch dieselbe Frage zeigt und die Eingabezeile leer ist.

Ein wichtiger Punkt zur Plan-Freigabe per Stimme: Die erste Ja-Möglichkeit im Plan-Dialog heißt bei den UI-Sitzungen „Yes, and switch to BYPASS PERMISSIONS" — danach stellt die Sitzung keine Berechtigungsfragen mehr. Das ist dieselbe Wahl, die du im Terminal mit Enter triffst; die Nachfrage im Kasten zitiert den Wortlaut, den sie gerade auf dem Bildschirm liest. Steht dort etwas Unbekanntes (etwa „clear context"), gibt die UI nicht frei und schickt dich ins Terminal. Läuft für diesen Plan gerade noch das automatische Plan-Review, ist Freigeben per Stimme gesperrt („Plan-Review läuft noch") — überarbeiten per Stimme geht, freigeben dann im Terminal oder nach dem Review. Die zweistufige Nachfrage prüft auch das Backend, nicht nur der Kasten: Eine Freigabe ohne vorherige Nachfrage lehnt es ab.

Drei weitere Regeln aus dem Review:

- Liegt zu einer Meldung kein Inhalt vor (sie stammt aus der Zeit vor dem Einschalten, das Backend wurde neu gestartet, oder die Sitzung kennt den neuen Hinweis noch nicht), sagt der Anruf das. Bei „fertig" kannst du trotzdem per Stimme eine neue Anweisung geben; bei Rückfrage und Plan bietet er nur „Im Terminal öffnen" (wie in der Spec für Meldungen, die nur am Bildschirm erkannt wurden).
- Solange der Anrufmodus an ist, spielt ein Fenster am Mac bei Meldungen, die als Anruf klingeln, nur den Klingelton — nicht zusätzlich den Glockenton. Berechtigungsfragen behalten ihren Glockenton.
- Nur die UI selbst darf den Anrufmodus bedienen: Eine fremde Webseite, die du im selben Browser offen hast, könnte sich sonst mit dem Backend verbinden und mithören. Das Backend prüft deshalb, von welcher Seite die Verbindung kommt.

Aufgeräumt wird nebenbei: die Reste des alten, bezahlten Anruf-Modus (ein Datentyp, ein toter Hinweis in der Team-Ansicht, zwei nicht mehr benutzte Bibliotheken von Deepgram und ElevenLabs).

**Was kann schiefgehen?**

- Claude Code ändert das Aussehen seiner Dialoge. Dann erkennt die UI sie nicht mehr sicher und sendet nichts — sie sagt „bitte im Terminal beantworten". Du merkst es am Anruf; kaputt geht nichts.
- Der Agent vergisst die Sprechfassung. Dann sagt die UI „Keine Sprechfassung" und liest die ersten zwei Sätze der Antwort vor.
- Sitzungen, die schon vor dem Update liefen, kennen den neuen Zusatzhinweis nicht (Claude Code liest seine Hook-Liste nur beim Start). Sie klingeln trotzdem, bringen aber keine Sprechfassung mit, bis sie neu gestartet sind.
- Spracherkennung versteht dich falsch. Deshalb geht nichts ohne „Senden", ein Plan nie ohne zweites „Ja". Bei Stille erfindet das Modell manchmal Sätze wie „Vielen Dank."; die UI prüft vorher, ob überhaupt gesprochen wurde, und kennt die typischen erfundenen Sätze.
- Ob Claude Code den Plantext wirklich in der Meldung mitschickt (und nicht nur den Dateipfad), prüfe ich als ersten Bauschritt an einer echten Sitzung. Kommt nur der Pfad, liest die UI keine Datei, sondern behandelt den Plan wie „ohne Inhalt" — dann meldet sich die Bausitzung bei dir, bevor sie weitermacht.
- Das Spracherkennungs-Programm bleibt nach einem Absturz des Backends liegen und belegt 0,8 GB. Das Backend räumt es beim nächsten Start auf.
- Rückgängig: Schalter aus. Im Notfall `anruf-<port>.json` im Laufzeitordner löschen und das Backend neu starten — der Modus ist dann aus.

**Was musst du entscheiden?**

- **Modelle (ER-02):** whisper.cpp (Homebrew, MIT-Lizenz) mit dem Modell large-v3-turbo q5_0 (574 MB, MIT-Lizenz, Quelle Hugging Face `ggerganov/whisper.cpp`, Prüfsumme fest im Einrichtungsskript) für die Erkennung; für die Stimme die vorhandenen Mac-Stimmen über den Browser. Vorschlag: so freigeben. Das große Modell large-v3 (3,1 GB) war gleich schnell, aber ungenauer und braucht 3,5 GB Speicher.
- **Meldungen, während kein UI-Fenster am Mac offen ist:** Vorschlag: Sie kommen nicht in die Warteschlange, nur in die Glocke; beim Öffnen klingelt nichts nachträglich (Kulanz 30 Sekunden für eine kurz abgerissene Verbindung). Alternative: aufheben und beim Öffnen nacheinander klingeln.
- **Sprechtaste:** Vorschlag: Leertaste halten nur, solange der Anruf-Kasten den Fokus hat, sonst Knopf „Sprechen"/„Fertig" — kein Tastenkürzel, das überall gilt, damit Tippen im Terminal nie einen Anruf auslöst. Ein klingelnder Anruf holt sich den Fokus nicht.
- **Rückfallstufe bei Zeitnot:** Falls nach 8 Tagen nicht alles fertig ist, schlage ich vor, zuerst Rückfragen mit mehreren Fragen oder Mehrfachauswahl per Stimme zu verschieben (sie klingeln und werden vorgelesen, beantwortet wird im Terminal), dann den Knopf „Anrufen" in der Glocke, dann die Systemmitteilung. Entschieden wird das erst, wenn es so weit ist — jetzt nur: einverstanden mit der Reihenfolge?
- **Zur Kenntnis (von mir entschieden, widersprich bei Bedarf):** Glockenton bei Anrufmodus an unterdrückt, wenn der Klingelton spielt; Freigeben per Stimme gesperrt, solange ein Plan-Review läuft; Rückfrage und Plan ohne gespeicherten Inhalt nur „Im Terminal öffnen".
- **Zur Kenntnis:** Die Tastenfolgen für Rückfrage und Plan werden neu gebaut (die Spec nahm an, es gäbe sie). Das macht das Vorhaben größer; geschätzt 7 bis 9 Arbeitstage, das Zeitbudget der Absicht ist 8. Vorschlag: Budget bleibt 8; ist es erschöpft, stoppt die Bausitzung und legt dir den Stand vor (Regel ER-08), statt still weiterzubauen.

## Details

<!-- leser: mensch -->

Confidence-Tags: `[Certain]` harte Belege (Code, Messung heute) · `[Likely]` starke Inferenz · `[Uncertain]` Vermutung.

### 1. Kurzfassung

<!-- leser: mensch -->

Neuer Backend-Dienst `AnrufService` hält Schalter, Warteschlange und die flüchtigen Hook-Inhalte, steuert einen lokalen `whisper-server`-Kindprozess und beantwortet Dialoge über neue, AR-08-konforme Tastenfolgen (`anruf-sender.ts`); die Sprechfassungs-Anweisung kommt über einen neuen synchronen `UserPromptSubmit`-Hook, der nur eine vom Backend geschriebene Datei im Laufzeitordner liest (kein Netzweg auf dem Eingabepfad) und nur bei Anrufmodus an Kontext liefert. Das Frontend bekommt einen Light-DOM-Kasten `aos-anruf` (Klingeln, Vorlesen per `speechSynthesis` mit lokaler Stimme, Aufnahme per `getUserMedia` nur zwischen Sprechen und Fertig), einen Schalter in den Einstellungen und den Knopf „Anrufen" in der Glocke. ADR-0006 ergänzt ADR-0004; `architecture.md`, `security.md`, `design.md`, `product-brief.md` in derselben PR.

### 2. Ausgangslage im Code

<!-- leser: agent -->

| Bereich | Heute (Datei:Zeile) | Bedeutung für dieses Vorhaben |
|---|---|---|
| Hook-Registrierung | `ui/src/server/services/claude-hooks.ts:65-76` (Ereignisse), `:88-102` `renderHookSettings` (ein curl-Einzeiler je Ereignis, `async: true`, stdout verworfen `:24-31`) | neuer **synchroner** Eintrag `UserPromptSubmit` auf eigene Route; bestehende Einträge unverändert [Certain] |
| Hook-Inhalt | `claude-hooks.ts:209-256` `mapHookPayload`; `PREVIEW_MAX_CHARS = 160` `:52`, `summarizePreview` `:147-158`, `firstQuestion` `:199-203` (nur erste Frage), ExitPlanMode fester Text `:239` | Inhalt wird verworfen; neue Funktion `extractAnrufInhalt(body)` daneben, `mapHookPayload` bleibt [Certain] |
| Hook-Route | `ui/src/server/routes/cloud-terminal.routes.ts:43-96` (Token `x-specwright-hook-token`, `tokenMatches` `:26-32`, Sitzungs-ID-Regex `claude-hooks.ts:161`) | Route reicht Body zusätzlich an `anruf.hookInhalt`; keine neue Route [Certain] |
| Settings-Datei der Hooks | `claude-hooks.ts:131-139` `ensureHookSettingsFile` (jeder Boot), `ui/src/server/utils/runtime-paths.ts:80-82`; Spawn `--settings` `cloud-terminal-manager.ts:953-955` | Claude Code liest Hooks beim Start → neue Hook-Zeile wirkt nur in neu gestarteten Sitzungen [Likely: Snapshot beim Start, Doku; nicht selbst gemessen] |
| Statusfluss | `cloud-terminal-manager.ts:458-518` `applyAgentEvent`, Emit `session.agent-event` `:508-514`, Early-Return bei gleichem Status `:468`; `session.closed` `:1328`, `:1699`; Broadcast `websocket.ts:2150-2170` | `AnrufService` abonniert Manager-Ereignisse; Meldung = Übergang nach `blocked` mit `blockKind` `rueckfrage`/`plan` oder `stop` [Certain] |
| Blockart | `ui/src/shared/types/hook-events.protocol.ts:15` `BlockKind = 'rueckfrage' \| 'plan' \| 'berechtigung' \| 'unbekannt'`; Fallback `cloud-terminal-manager.ts:485` | `berechtigung`, `unbekannt`, `StopFailure` klingeln nie (FA-05) [Certain] |
| Auflösung | `ui/src/server/services/agent-status.ts:20-46` (`unblocked`/`prompt-submitted` → working, `stop` → done), Tastatur-Unblock `:63` | „anderweitig erledigt" = Statuswechsel der Sitzung weg vom Meldungszustand (FA-11) [Certain] |
| Bildschirm-Probe | `cloud-terminal-manager.ts:594-655` (`blockedBy: 'probe'`, nur Cue-Zeile, kein Inhalt) | Probe-Blocks ohne Hook-Inhalt → Anruf „nur am Bildschirm erkannt" (AN-S11) [Certain] |
| Dialog-Erkennung | `ui/src/server/services/dialog-driver.ts:23-48` (Cues), `promptZustand` `:102`, `eingabeLeerLautCursor` `:148`, `readStableScreen` `:205`; `ui/src/server/utils/plan-dialog-state.ts:34` `PLAN_DIALOG_CUE`, `parsePlanDialog` `:144`, `sanitizeInjectText` `:186` | wiederverwendet; **keine** Tastenfolgen für Rückfrage/Plan vorhanden (Header `dialog-driver.ts:1-18`, INT-2026-007 Stufe 2 nie gebaut) → neu [Certain] |
| Tastenmuster AR-08 | `ui/src/server/services/plan-review-orchestrator.ts:312-351` (`readDialog`, `focusFeedbackOption`: eine Taste, 100 ms, nachlesen, Obergrenze), `withMachineWrite` `:235` | Vorlage für `anruf-sender.ts` [Certain] |
| Freitext-Zustellung | `ui/src/server/services/vorhaben-service.ts:643-689` `sendToSession` (Protokolleintrag **vor** Paste `:680`, nur Vorhaben-Sitzungen `:631-638`, lehnt `blocked` ab), `pasteLocked` `:710-733`, `screenCheck` `:752-788` (`strict` mit Cursor-Probe), `settleEnter` `:791-799` | Nicht wiederverwendbar wegen Protokoll auf Platte (AK-17) und Vorhaben-Bindung. `pasteLocked` nimmt selbst `withMachineWrite` (verschachtelt → `beschaeftigt`, `cloud-terminal-manager.ts:545-563`); nur der lockfreie `strict`-Zweig wird als `pruefeEingabeWartet` nach `dialog-driver.ts` gezogen [Certain] |
| Route-Reihenfolge | `cloud-terminal.routes.ts:80-86`: `reportHookContext` vor `reportAgentEvent`; Emit synchron | `hookInhalt` zwischen beiden (D1) [Certain] |
| Plan-Review | `plan-review-orchestrator.ts:275-297` fokussiert Freitext-Option und tippt Review ohne Enter; ist der Dialog weg, als Prompt mit Enter | Kollision und laufendes Review in D8 berücksichtigt [Certain] |
| Tastatureingabe | `cloud-terminal-manager.ts:1418-1445` `sendInput(…, {inferUnblock})`, `withMachineWrite` `:545-563`, `readCursorProbe` `:1834` | Sender schreibt mit `inferUnblock: false` unter `withMachineWrite` [Certain] |
| Glocke | `ui/frontend/src/components/terminal/agent-notifications.ts:137-166` `BellRow`/`BellSession`, `buildBellRows` `:201-234`, `ringsForAgentEvent` `:38-43`; `ui/frontend/src/components/rahmen/aos-glocke.ts` (Light DOM `:43-45`, `glocke-open` `:148-157`); `app.ts:535-537`, `:876-919` (Frontend liest `blockKind` nicht) | `blockKind` bis `BellRow` durchreichen; Knopf „Anrufen" [Certain] |
| Ton | `ui/frontend/src/components/terminal/notification-sound.ts:66-87` (Web-Audio-Zweiklang, braucht Nutzergeste) | eigener Klingelton daneben; kein `Notification`-API im Frontend bisher [Certain] |
| App-Rahmen | `ui/frontend/src/app.ts:1831-1912` (Light DOM `:1915-1917`), Toast `:1849` | `<aos-anruf>` als Geschwister nach dem Toast [Certain] |
| Einstellungen | `ui/frontend/src/views/settings-view.ts` (Abschnitt `general`, `:42`, `:129`, `:160`), eingebettet in `aos-projekt-seite.ts:187`; Backend `settings.general.*` pro Projekt `websocket.ts:1427-1460`; `ui/config/*.json` versioniert | Schalter im Abschnitt „Allgemein", eigener Speicher `<runtime>/anruf-<port>.json` (global, nicht versioniert) [Certain] |
| WebSocket | `websocket.ts:211` `on('connection', (ws) => …)` ohne `req`; `WebSocketClient` `:67-71`; `default: ack` `:549-557`; Muster `VorhabenHandler` (`vorhaben-handler.ts:260-275`, `:497-522`) | `req` annehmen, Eigenschaft `lokal` je Verbindung; neuer `AnrufHandler` nach Muster [Certain] |
| Lokal-Erkennung | kein Code nutzt `remoteAddress`/`x-forwarded-for`; Cloudflare-Tunnel und `tailscale serve` kommen als Loopback an (`cloud-terminal.routes.ts:6-9`) | Regel: Loopback **und** Host `localhost`/`127.0.0.1`/`[::1]` **und** kein `x-forwarded-for`/`tailscale-user-login` **und** `process.platform === 'darwin'` [Likely für tailscale-Header] |
| Voice-Reste | `ui/src/shared/types/voice.protocol.ts` (einziger Import `team-view.ts:6`), `team-view.ts:210-230`, `ui/package.json:22-23` (`@deepgram/sdk`, `@elevenlabs/elevenlabs-js`, kein Aufrufer); Test `ui/tests/unit/ui-rahmen-abbau.test.ts:62-87` (fordert Existenz `:74`) | entfernen (ER-01), Testerwartung `:74` auf „weg" drehen [Certain] |
| Guard | `scripts/verify.sh:26` `check-no-voice-config`, `.gitignore:52` | bleibt; neue Datei heißt nicht `voice-config.json` [Certain] |
| Lieferumfang | `specwright/manifest.tsv` ohne `ui/`-Zeilen, `scripts/check-manifest.sh:18` `SHIPPED_DIRS` ohne `ui/` | neue UI-Dateien und `ui/scripts/sprache-einrichten.sh` brauchen keine Manifest-Zeile (AR-01 unberührt) [Certain] |
| Tests | `ui/vitest.config.ts` (node), Lit-Tests mit `// @vitest-environment happy-dom` (Muster `ui/tests/unit/aos-glocke.test.ts`); Fixtures `ui/tests/fixtures/tui/2.1.273…2.1.278/` | neue Fixtures `ui/tests/fixtures/tui/2.1.283/` [Certain] |
| Lokale Werkzeuge (gemessen 27.09.) | `/opt/homebrew/bin/whisper-server` (whisper.cpp 1.9.1), `say -v '?'`: 9 deutsche Stimmen; M4 Max, 128 GB | Grundlage Modellwahl §3 D3 [Certain] |

**Messungen im Plan Mode (27.09., Scratchpad, nicht im Repo):**

- **EK-01/EK-03 (synthetisch):** 10 deutsche Sätze mit `say -v Anna`, 16 kHz mono, `whisper-server -l de --prompt "Spec, Plan, Merge, Pull Request, Commit, Build, CI, Glocke, Absicht, Freigabe"`, warm.
    - large-v3 (3,1 GB, SHA-256 `64d182b4…d1e2`): Median 0,74 s, WER 7,8 % (davon 3 Wörter nur Schreibweise „2", „Frei geben"), RSS 3,5 GB, Ladezeit 2,8–7 s.
    - **large-v3-turbo-q5_0** (574 041 195 Bytes, SHA-256 `394221709cd5ad1f40c46e6031ca61bce88931e6e088c188294c6d5a55ffa7e2`): Median 0,64 s, WER 4,7 % („main"→„mein", „Build"→„Bild", „Zwei"→„2"), RSS 777 MB, Ladezeit 0,6 s.
    - Hugging-Face-Download stockte zweimal (18 MB in 40 min), dritter Versuch mit `curl -C -` in 3 min fertig → Skript braucht Fortsetzen und Abbruch bei Stillstand.
- **Tastenprotokoll Claude Code 2.1.283** (eigener tmux-Server `-L anrufprobe`, Haiku, `bypassPermissions`):
    - Einzelfrage: Ziffer n wählt und **sendet sofort** (`⏺ User answered … → Blau`).
    - Eigene Antwort: Ziffer der Zeile `N+1. Type something.` fokussiert sie; Bracketed Paste ersetzt die Beschriftung durch den Text (`❯ 3. Türkis, aber hell`); Enter sendet.
    - Mehrfachauswahl: Ziffer schaltet `[ ]`↔`[✔]`, Cursor bleibt; Kopfzeile `☐`→`☒`; `Tab` geht zur nächsten Frage.
    - Zweite (Einzel-)Frage: Ziffer wählt und springt zur Prüfseite `Review your answers … Ready to submit your answers? ❯ 1. Submit answers / 2. Cancel`; `1` sendet.
    - Plan-Dialog: `1. Yes, and switch to BYPASS PERMISSIONS (no further prompts) for this session` / `2. Yes, manually approve edits` / `3. Tell Claude what to change`; `1` gibt frei; `3` fokussiert, Paste ersetzt Beschriftung, Enter schickt Überarbeitung, danach neuer Plan-Dialog.
- **Synchroner `UserPromptSubmit`-Hook** mit `{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"…"}}`: Anweisung wirkt ab der nächsten Antwort; nach Wegfall schreibt der Agent weiter „Sprechfassung:" (Gesprächsverlauf); einmaliger Gegenhinweis „Anrufmodus aus: …" beendet es (2 Runden geprüft). [Certain]

### 3. Entwurf

<!-- leser: agent -->

#### Ansatz

<!-- leser: agent -->

**D1 — Inhalt aus den Hooks, flüchtig (ADR-0006).** `extractAnrufInhalt(body)` in `claude-hooks.ts` liefert je Ereignis: `Stop` → `letzteAntwort` (roh, max. 20 000 Zeichen), `PreToolUse`/`PermissionRequest` `AskUserQuestion` → `fragen: { frage, kopf?, optionen: string[], mehrfach }[]` (validiert, max. 4 Fragen × 6 Optionen, je 500 Zeichen), `ExitPlanMode` → `plan` (max. 50 000 Zeichen). Die Route ruft `anruf.hookInhalt(sessionId, body)` **nach** `reportHookContext` (Sitzung aktiv, `cloud-terminal.routes.ts:82`) und **vor** `reportAgentEvent` (`:86`), denn `applyAgentEvent` emittiert `session.agent-event` synchron (`cloud-terminal-manager.ts:508`) — sonst entstünde die Meldung ohne Inhalt (Review F1). Der Dienst verwirft alles, solange der Modus aus ist (FA-02), und hält sonst **eine** Map `sessionId → Inhalt` im Speicher. Kein Transkript-Leser, kein Dateileser, keine Registry, kein Broadcast an alle. **Vorbedingung (Schritt 1):** echte Hook-Payloads von 2.1.283 aufnehmen; enthält `PreToolUse ExitPlanMode` keinen Plantext (nur Pfad), gilt die Plan-Meldung als „ohne Inhalt" und die Bausitzung meldet sich vor dem Weiterbauen (kein Dateileser ohne neue Entscheidung, Review F13).

**D2 — Sprechfassung per synchronem Hook, der nur eine lokale Datei liest (externer Review, Blocker 1).** Der bestehende `UserPromptSubmit`-Hook ist absichtlich `async`, damit kein Netzweg auf dem Tipp-Pfad liegt (`claude-hooks.ts:24-31`). Deshalb ruft der neue synchrone Eintrag **kein** Backend auf, sondern liest nur Dateien, die das Backend vorher schreibt — ein hängendes oder totes Backend kann den Prompt nicht verzögern:

- Eintrag in `renderHookSettings`: `UserPromptSubmit`, `timeout: 1`, ohne `async`, nur auf `darwin` gerendert. Befehl (Bash 3.2, keine Netzwerkaufrufe): `d=<runtime>/anruf-kontext-<port>; [ -n "$SPECWRIGHT_CLOUD_SESSION_ID" ] || exit 0; e="$d/aus-$SPECWRIGHT_CLOUD_SESSION_ID.json"; if [ -f "$e" ]; then cat "$e"; rm -f "$e"; elif [ -f "$d/an.json" ]; then cat "$d/an.json"; fi; exit 0`.
- Backend (`AnrufService`): Modus an → schreibt `an.json` (`{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext": ANRUF_ANWEISUNG_AN}}`) atomar; Ordner `0700`, Dateien `0600`. Modus aus → löscht `an.json` und schreibt für jede Claude-Sitzung, die während der An-Zeit lebte, `aus-<sessionId>.json` mit `ANRUF_ANWEISUNG_AUS` (der Hook löscht sie nach einmaligem Lesen); beim Schließen einer Sitzung und beim Boot räumt das Backend verwaiste `aus-*` auf. Die Dateien enthalten nur die festen Anweisungstexte — keine Projektinhalte, nichts Personenbezogenes (AK-17 unberührt).
- **Harte Schwelle:** Messung im E2E über 100 Prompts: Dauer des Hooks (Claude-Code-Debuglog oder `time` um den Befehl) p95 ≤ 20 ms, Maximum ≤ 100 ms. Verfehlt → Kill-Switch und Rückfrage (wie ER-03). **Kill-Switch:** Umgebungsvariable `SPECWRIGHT_ANRUF=off` rendert weder den Eintrag noch startet sie den Dienst; der Schalter zeigt dann „nicht verfügbar: abgeschaltet".
- Keine neue HTTP-Route (weniger Angriffsfläche als der erste Entwurf). Test: gerenderter Befehl enthält kein `curl`, Laufzeit des Befehls gegen einen Testordner < 100 ms.

Texte als Konstanten in `ui/src/shared/types/anruf.protocol.ts`:

- `ANRUF_ANWEISUNG_AN`: „Anrufmodus ist an. Beende jede Antwort, mit der du deinen Zug abschließt, mit einem eigenen letzten Absatz, der mit ‚Sprechfassung:' beginnt: höchstens 80 Wörter, Alltagssprache, was du getan hast und was du jetzt von Michael brauchst; keine Codeblöcke, Dateipfade, Tabellen oder Links. Legst du einen Plan mit ExitPlanMode vor, beginne den Plantext mit so einem Absatz."
- `ANRUF_ANWEISUNG_AUS`: „Anrufmodus ist aus: ab jetzt keinen Absatz ‚Sprechfassung:' mehr schreiben."

**D3 — Erkennung: `whisper-server` als Kindprozess.** `ui/src/server/services/sprach-erkennung.ts`: Pfade aus `SPECWRIGHT_WHISPER_SERVER` (sonst `which whisper-server`, `/opt/homebrew/bin`, `/usr/local/bin`) und `SPECWRIGHT_WHISPER_MODEL` (sonst `~/.specwright/sprache/ggml-large-v3-turbo-q5_0.bin`). Start beim Einschalten (und beim Boot, wenn an): freier Port auf `127.0.0.1`, Argumente `-m <modell> --host 127.0.0.1 --port <p> -l de -nt --prompt <VOKABELN>`, `stdio: 'ignore'` (keine erkannten Texte in Logs, FA-27), `cwd` und `TMPDIR` auf einen leeren `0700`-Ordner unter dem Laufzeitordner (Nachweis „keine Datei", §8). Bereit, sobald `GET /` antwortet (max. 15 s). `erkenne(pcm: Int16Array)` baut den WAV-Kopf im Speicher und schickt `multipart/form-data` per `fetch` an `http://127.0.0.1:<p>/inference` (`response_format=json`, `temperature=0`); Antwort mit `JSON.parse` tolerant (Steuerzeichen). Absturz → ein Neustart, danach Grund „Spracherkennung abgestürzt". Fällt der Prozess während einer Erkennung aus, schlägt diese Anfrage fehl: der Audiopuffer wird verworfen (nicht wiederholt, AK-17), der Anruf bleibt offen und zeigt „Nicht verstanden — Spracherkennung startet neu, bitte nochmal sprechen"; `anruf:erkennen` während des Neustarts wartet bis zu 5 s auf Bereitschaft, sonst derselbe Grund (ext. Review 4). PID-Datei `<runtime>/whisper-server-<port>.pid` (nur PID, je Backend-Port, damit Branch-Backend 3111 und Live-Backend 3001 sich nicht gegenseitig beenden — ext. Review 6); beim Start wird ein verwaister Prozess beendet, wenn PID und Befehlsname (`ps -p <pid> -o comm=`) passen (Review F16). Stille/Halluzination (Review F14, Spec §4 „Nichts verstanden"): Frontend sendet nur bei ≥ 0,4 s Dauer und RMS über Schwelle; Backend verwirft leeren Text und eine Liste bekannter Whisper-Halluzinationen („Vielen Dank.", „Untertitel im Auftrag des ZDF …", „Untertitelung …") → Grund `nichts_verstanden`. Zusätzlich `response_format=verbose_json`: liefert der Server je Segment `no_speech_prob`, werden Segmente > 0,6 verworfen [Uncertain, ob 1.9.1 das Feld liefert — Schritt 1 prüft; fehlt es, bleibt es bei Schwelle + Liste]. Jeder erkannte Text wird ohnehin angezeigt und erst nach „Senden" gesendet (ext. Review 9). Stop beim Ausschalten und im Shutdown (`SIGTERM`, nach 2 s `SIGKILL`). Verfügbarkeit: `darwin`, Binärdatei ausführbar, Modell vorhanden **und** Größe = 574 041 195 Bytes (volle Prüfsumme nur im Skript, nicht bei jedem Boot).

**D4 — Vorlesen im Browser.** `speechSynthesis`, Stimme = erste mit `lang` `de-*` **und** `localService === true` (bevorzugt „Anna"); keine lokale Stimme → nicht verfügbar mit Grund. Text satzweise als Folge von `SpeechSynthesisUtterance` (Chrome-Abbruch langer Utterances), `cancel()` bei Unterbrechung/„Nochmal"/Auflegen.

**D5 — Warteschlange im Backend (AR-05, AN-S07).** Reine Logik `ui/src/server/services/anruf-warteschlange.ts` (Uhr injizierbar):

- Eintrag `{ id, sessionId, art: 'rueckfrage'|'plan'|'fertig', seit, rang: 0|1|2, nichtVor? }`; Rang 0 = Rückfrage/Plan, 1 = fertig, 2 = „später"; Reihenfolge `(rang, seit)`.
- `neu(meldung)`: ersetzt einen Eintrag derselben Sitzung (FA-08) und hebt deren „abgelehnt"-Marke auf.
- `ablehnen(id)`: raus, Sitzung in `abgelehnt` bis zur nächsten Meldung (FA-09; die Marke wirkt nur auf „Anrufen"-lose Wiederaufnahme — eine neue Meldung ist per Definition neu).
- `spaeter(id)`: Rang 2, `seit = jetzt`; war die Schlange sonst leer, `nichtVor = jetzt + 5 min` (FA-10, AN-S09).
- `erledigt(sessionId)`: raus (FA-11).
- `naechste(jetzt)`: erster Eintrag mit `nichtVor ≤ jetzt`, sonst Zeitpunkt für einen Timer.

**D5a — Was eine Meldung ist (Review F3, F4).** Der Dienst merkt sich je Sitzung den letzten Status.

- **Neu** nur beim Übergang in `blocked` (vorher ≠ `blocked`) mit Blockart `rueckfrage`/`plan`, oder bei `stop`. Die Art bleibt die beim Eintritt.
- Inhalt und Status kommen im **selben** Hook-Aufruf (ein POST je Ereignis), also ohne Wettlauf innerhalb eines Ereignisses; kommt ein Probe-Block vor dem Hook, hängt der spätere Hook-Inhalt an die Meldung an, solange sie klingelt oder wartet — maßgeblich ist der Inhalt beim Annehmen (ext. Review 2).
- Wechselt die Blockart innerhalb von `blocked` zwischen `rueckfrage` und `plan` (z. B. verlorenes `PostToolUse`), gilt das als neue Meldung und ersetzt die alte samt Inhalt (ext. Review 11).
- `blocked → blocked` (Grundwechsel, `review-injected`/`review-failed` des Orchestrators, `Notification` mit Blockart `unbekannt`, Probe-Block → Hook bestätigt) klingelt nicht neu, hebt keine Ablehnung auf und löst nicht auf; hängt nur Inhalt an. Ein Probe-Block (`blockedBy === 'probe'`, `cloud-terminal-manager.ts:487`) wird Meldung „nur am Bildschirm"; bestätigt ein Hook ihn danach, bekommt sie Inhalt.
- **Aufgelöst:** Rückfrage/Plan, sobald `status !== 'blocked'`; fertig, sobald ein Ereignis ohne `doneAt` kommt, außer `idle-timeout`/`idle-prompt` — dieselbe Regel wie die Marke der Glocke (`cloud-terminal-manager.ts:481-483`), also auch `/clear` (`session-start`) und `stop-failure`; jede Meldung bei `session.closed`.

**D6 — Anruf-Zustand im Backend.** `ui/src/server/services/anruf-service.ts`: Zustände `ruhe` → `klingelt(m)` → `laeuft(m, besitzer: clientId)` → [`freigabe_nachfrage(m)`] → `sendet` → `ruhe`. `anruf:senden { art: 'freigeben' }` wird nur angenommen, wenn derselbe Besitzer für dieselbe Meldung vorher `anruf:freigeben.anfragen` geschickt hat und der Zustand `freigabe_nachfrage` ist; sonst `INVALID_MESSAGE` (Review F6). Die Übergänge sind eine reine Funktion `anrufUebergang(zustand, ereignis, jetzt) → { zustand, effekte[] }` in `ui/src/server/services/anruf-zustand.ts` (Effekte: klingeln, broadcast, senden, Timer, Kontext-Dateien); `AnrufService` führt nur Effekte aus. Test: Tabelle aller Zustände × Ereignisse (Meldung neu/erledigt, annehmen/ablehnen/später/auflegen, Client weg, Modus aus, freigeben.anfragen, senden ok/fehler), unerlaubte Paare → unverändert plus Fehlergrund (ext. Review 7). Mehrere Fenster (Review F15): klingeln in allen lokalen; nach Annahme zeigen die anderen „Anruf läuft in einem anderen Fenster" ohne Knöpfe, ohne Vorlesen, ohne Mikrofon; `anruf:erkannt`/`anruf:ergebnis` nur an den Besitzer; Systemmitteilung mit `tag: meldungId`. Fehlender Inhalt (Review F5): fertig → Ansage „Keine Sprechfassung — die Antwort steht nur im Terminal", Sprachantwort als neue Eingabe möglich; Rückfrage/Plan → wie AN-S11 nur „Im Terminal öffnen" (bestehendes Event `glocke-open`, `aos-glocke.ts:148-157`). Genau ein Anruf (FA-06). Erste Reaktion eines lokalen Clients gewinnt (AN-S07); Trennung des Besitzers → Anruf endet ohne Senden, Meldung an ihren Platz zurück (AN-S08). Meldungen nur, solange mindestens ein lokaler, fähiger Client verbunden ist oder vor höchstens 30 s war (O2). Beim Einschalten klingelt nichts Altes (AN-S06). Nach Ende eines Anrufs klingelt die nächste Meldung (FA-07). Glocke „Anrufen" (FA-12): Meldung aus aktuellem Sitzungszustand (Blockart oder Marke `agentDoneAt`) plus gespeichertem Inhalt; klingelt gerade eine andere, geht sie zurück in die Schlange; läuft ein angenommener Anruf → `ANRUF_BESETZT`. Auflösung (FA-11) nach D5a. Klingelt sie → Klingeln endet; läuft sie → Client sagt „In der Sitzung schon beantwortet" und legt auf. Ausnahme: im Zustand `sendet` ist der Wechsel die eigene Bestätigung. Ausschalten (Ablauf A5): laufender Anruf endet ohne Senden, Schlange und Inhalte leer, `whisper-server` beendet. Klingeln dauert, bis jemand reagiert; der Ton wiederholt sich dreimal im Abstand von 4 s, danach stiller Kasten (ER-00, engste Auslegung).

**D7 — Vorlesetext.** `ui/src/shared/anruf-text.ts` (rein, von Backend genutzt):

- `sprechfassungAus(text)`: letzter Absatz, der mit `Sprechfassung:` beginnt (optional `**…**`, optional vorheriges `---`), ohne das Präfix.
- `bereinige(text)`: entfernt Codeblöcke, Inline-Code, URLs, Markdown-Links (Text bleibt), Tabellenzeilen, Überschriften-/Listenzeichen, Tokens mit `/` oder Datei-Endung (`\.[a-z]{1,5}\b` nach Wortzeichen), Emojis/Box-Zeichen.
- `kuerze(text, 80)`: höchstens 80 Wörter, am letzten Satzende davor; sonst harte Grenze; Flag `gekuerzt` (FA-15).
- `ersteZweiSaetze(text)` bereinigt (FA-17, AN-S14).
- `frageVorlesen(frage)`: „Frage: … Eins: … Zwei: … Oder eine eigene Antwort."; überschreitet das 80 Wörter, Möglichkeiten bis zur Grenze plus „und n weitere, auf dem Bildschirm" (FA-16). Beschreibungen werden nie gelesen.
- Ergebnis je Meldung: `{ vorlesen: string, gekuerzt, ohneSprechfassung, anzeige }` — der Client liest `vorlesen`, zeigt `anzeige` (bei Rückfragen alle Möglichkeiten).

**D8 — Senden (AR-08).** `ui/src/server/services/anruf-sender.ts`, jeder Vorgang in **einem** `withMachineWrite`, jede Taste mit `inferUnblock: false`, nach jeder Taste 100 ms und `readStableScreen`; Abbruch (kein Esc!) bei unpassendem Bild; Obergrenzen je Vorgang fest.

- **Vorprüfung (FA-24):** Sitzungsstatus passt zur Meldung (`blocked` mit gleicher Blockart bzw. `done`/`idle`), Bildschirm zeigt denselben Dialog (Fragetext der aktuellen Frage bzw. `PLAN_DIALOG_CUE`) bzw. für „fertig" die leere Eingabezeile über `pruefeEingabeWartet` (siehe unten).
- **Fokus und Vorzustand (Review F7, AR-08):** Rückfrage — Fokus nicht auf „Type something" (sonst würden Ziffern Text), bei mehreren Fragen alle Tabs `☐` und aktiver Tab = erste Frage, bei Mehrfachauswahl keine vorgesetzten Haken (sonst Abbruch „im Terminal begonnen"). Plan — `parsePlanDialog(...).focused` ist nicht die Freitext-Option, Freitext-Nummer aus `parsePlanDialog(...).target` (`plan-dialog-state.ts:132-135`), nicht fest „3".
- **Wortlaut der Ja-Option (Review F8, AN-S10):** Option 1 muss in einer festen Liste stehen (heute: `Yes, and switch to BYPASS PERMISSIONS (no further prompts) for this session`, `Yes, and auto-accept edits`, `Yes, manually approve edits`); der gelesene Wortlaut geht in die Nachfrage („wählt: …"); unbekannt oder mit „clear context" → Abbruch mit Grund `unbekannte_freigabe`.
- **Plan-Review läuft (Review F9):** neue lesende Methode `PlanReviewOrchestrator.isReviewRunning(sessionId)` (aus `SessionState.locked`); läuft ein Review, lehnt `anruf:freigeben.anfragen` mit Grund `plan_review_laeuft` ab, Überarbeiten bleibt möglich.
- **Text vor dem Einfügen:** Zeilenumbrüche → Leerzeichen, dann `sanitizeInjectText` (Review F19).
- **Keine verschachtelten Locks (Review F2):** Der Sender nimmt `withMachineWrite` genau einmal je Vorgang und schreibt Paste + 150 ms + Enter darin selbst (rund 10 Zeilen, wartet das Enter ab). Aus `vorhaben-service.ts:752-788` wird nur der `strict`-Zweig als lockfreie Funktion `pruefeEingabeWartet(source, id)` nach `dialog-driver.ts` gezogen (dort liegen `promptZustand`, `eingabeLeerLautCursor`, `readStableScreen`); `vorhaben-service.ts` ruft sie im `strict`-Fall, `pasteLocked`/`settleEnter` bleiben unverändert.
- **Abbruch nach dem Einfügen** (Bestätigung bleibt aus, Plan-Option-3 nicht übernommen): kein Esc und kein Löschen (AR-08); der Grund sagt ausdrücklich „Dein Text steht noch in der Eingabezeile bzw. im Plan-Dialog — im Terminal prüfen, abschicken oder löschen" und zitiert den Textanfang (ext. Review 12).
- **Zusammensetzen beliebiger Fragen (ext. Review 16):** Der Sender kennt je Frage nur zwei Arten (einzeln/mehrfach) × zwei Antworten (Möglichkeit/eigene) und je Übergang ein gemessenes Primitiv (einzeln: Ziffer springt weiter; mehrfach: `Tab`; eigene Antwort: Enter springt weiter — in Schritt 1 gemessen). Mehrere Fragen (höchstens 4, Grenze von AskUserQuestion) werden aus diesen Primitiven zusammengesetzt, nach jedem Schritt nachgelesen; ein nicht erwartetes Bild bricht ab.
- **Fertig → neue Eingabe:** Paste + Enter im Lock; Bestätigung = `prompt-submitted` der Sitzung binnen 10 s, sonst Grund „nicht bestätigt".
- **Rückfrage:** Parser `ui/src/server/utils/rueckfrage-dialog-state.ts` → `{ tabs: {titel, beantwortet}[] | null, frage, optionen: {nr, text, haken?}[], eigeneNr, fokusNr, pruefseite: boolean }`. Je Frage: Möglichkeit(en) → Ziffer(n) (bei `mehrfach` je Ziffer nachlesen, ob `[✔]` gesetzt; danach `Tab`); eigene Antwort → Ziffer `eigeneNr`, nachlesen (Fokus), Bracketed Paste `sanitizeInjectText(text)`, nachlesen (Zeile trägt Textanfang), `\r`. Nach der letzten Frage: Einzelfrage fertig; mehrere → Prüfseite erwartet, `1`. Obergrenze = Σ(Ziffern + 3) + 2. Bestätigung = `unblocked` (PostToolUse) binnen 10 s oder Dialog-Cue weg.
- **Plan freigeben:** `parsePlanDialog` → Option 1 beginnt mit `Yes`, keine Option trägt fremden Text (Plan-Review-Kollision, Orchestrator-Text in Option 3 → Grund „Im Plan-Dialog steht schon Text") → `1` → Cue weg binnen 3 s.
- **Plan überarbeiten:** `3` → Fokus auf 3 → Paste → Zeile 3 trägt Textanfang → `\r`.
- Gründe als Union `AnrufSendeGrund` (`eingabe_nicht_leer`, `anderer_dialog`, `schon_beantwortet`, `beschaeftigt`, `bildschirm_unpassend`, `nicht_bestaetigt`, `sitzung_weg`), Texte in `anruf.protocol.ts`.

**D9 — Lokal und fähig.** `websocket.ts` nimmt `req` im `connection`-Callback, setzt `client.anrufLokal = istLokalerBrowser(req)` (`ui/src/server/utils/lokal-verbindung.ts`): Loopback-Adresse **und** `Host` = `localhost`/`127.0.0.1`/`[::1]` **und** `Origin` = `http://localhost:<port>` bzw. `http://127.0.0.1:<port>` (Backend-Port; im Dev zusätzlich `:5173`, weil `gateway.ts:25-27` direkt auf 3001 verbindet) **und** kein `x-forwarded-for`/`tailscale-user-login` **und** `darwin`. Die Origin-Prüfung verhindert, dass eine fremde Webseite im selben Browser über `ws://localhost:3001` Inhalte erhält (Review F10). `websocket.ts:560` loggt künftig nur `error.name`/`message` ohne Nachrichteninhalt (Review F19). Client meldet `anruf:faehig { mikrofon: 'ok'|'fehlt'|'verweigert', stimme: boolean }`. `anruf:state` geht nur an lokale Clients; Nachrichten `anruf:*` von nicht lokalen → `anruf:error ANRUF_NICHT_LOKAL`. Nicht lokale Clients bekommen nur `anruf:verfuegbarkeit` (für den Grund im Schalter).

**D10 — Speicher des Schalters.** `<runtime>/anruf-<port>.json` `{ "an": boolean }` (`getAnrufStatePath()` in `runtime-paths.ts`), atomar tmp+rename, `0600`. Intern, kein personenbezogener Inhalt.

**D11 — Frontend.**

- `ui/frontend/src/services/anruf.service.ts`: Abo `anruf:state`, Befehle, `faehig`-Meldung (beim Start und nach Rechteänderung), Aufnahme (`getUserMedia` nur zwischen „Sprechen" und „Fertig", `AudioContext` + `AudioWorklet` aus Blob-URL, Downsampling auf 16 kHz Int16 in `ui/src/shared/anruf-audio.ts`, Obergrenze 30 s, Spuren sofort stoppen, Puffer nach dem Senden verwerfen), Vorlesen (D4), Befehlsdeutung.
- `ui/src/shared/anruf-befehle.ts` (rein): `deuteSprache(text, kontext)` → `senden | verwerfen | nochmal | freigeben | ja | nein | text`; `waehleMoeglichkeit(text, optionen, mehrfach)` → `{ nummern } | { eigene } | { mehrdeutig: nummern }` (Ziffern, „eins…neun", „erste…", „Nummer zwei", Wortlaut normalisiert; „Frei geben" = freigeben).
- `ui/frontend/src/components/anruf/aos-anruf.ts` (Light DOM, Styles `aos-app .anruf*` in `theme.css` — Wirt `aos-app` ist Light DOM, geprüft `app.ts:1915-1917`): Zustände nach Mock; Tastatur: alle Knöpfe fokussierbar mit Beschriftung, Leertaste gedrückt halten bei Fokus im Kasten = sprechen (O3), `keydown`/`keyup` der Leertaste mit `preventDefault`, damit das Loslassen keinen fokussierten Knopf klickt (Review F18); kein Fokusraub beim Klingeln. Mikrofon entzogen oder abgesteckt (`track.onended`, Spec §4): Ansage „Mikrofon nicht verfügbar", Anruf endet ohne Senden, Verfügbarkeit neu melden.
- Glockenton (Review F12): In einem lokal fähigen Fenster mit Anrufmodus an spielt `app.ts:918` den Zweiklang nicht für Ereignisse, die als Anruf klingeln (Übergang in `blocked` mit `rueckfrage`/`plan`, `stop`); Berechtigungen und Modus aus unverändert (FA-02).
- Klingelton `playAnrufKlingeln()` in `notification-sound.ts` (drei Töne, anders als der Zweiklang); `Notification` nur wenn `document.hidden` und Rechte erteilt (Anfrage beim Einschalten).
- Glocke: `BellRow.blockKind` + Knopf „Anrufen" für `rueckfrage`/`plan`/`done`, solange Modus an; gesperrt mit `title` während `laeuft`.
- Einstellungen: Abschnitt „Allgemein" oben ein Schalter „Anrufmodus" mit Satz, Grund und nächstem Schritt; gesperrt, wenn nicht verfügbar (Backend-Grund oder Client-Grund).

**D12 — Einrichtung.** `ui/scripts/sprache-einrichten.sh` (Bash 3.2, `set -euo pipefail`), `npm run sprache:einrichten` in `ui/package.json`:

- `darwin` prüfen; `whisper-server` fehlt → Meldung „brew install whisper-cpp" und Exit 1 (kein Auto-Install).
- Ziel `~/.specwright/sprache/` (`0700`); Modell vorhanden und SHA-256 passt → „ok".
- Sonst `--von <pfad>` (vorhandene Datei prüfen und kopieren) oder Download `curl -fL -C - --speed-limit 10000 --speed-time 120 -o <ziel>.part <URL>`, bis zu 5 Versuche mit Fortsetzen (ein Abbruch kostet nur die Wartezeit, nicht den Fortschritt; ext. Review 14), SHA-256 prüfen, `mv`. Ausgabe: Quelle, Größe, Lizenz, Ergebnis im Protokollstil (`design.md` §1 Prinzip 2).
- Keine Manifest-Zeile (UI außerhalb des Lieferumfangs, `check-manifest.sh:18`).
- Zweites Skript `ui/scripts/sprache-messen.sh` (`npm run sprache:messen`): erzeugt die 10 Messsätze aus §2 mit `say` in einen temporären Ordner, startet `whisper-server` auf freiem Port, misst Median und WER, löscht alles. Lokale Wiederholungsmessung nach Modell- oder whisper.cpp-Update; nicht in CI (Modell 574 MB, nur macOS) (ext. Review 15).

**D13 — Aufräumen (ER-01, NZ-07).** `voice.protocol.ts` löschen; `team-view.ts` `handleCallClick`/`showVoiceNotConfiguredToast` entfernen (Klick auf Anruf-Symbol der Teamkarte tut nichts mehr — Team-Ansicht hat keine Route); `ui-rahmen-abbau.test.ts:74` erwartet „weg"; `npm uninstall @deepgram/sdk @elevenlabs/elevenlabs-js` in `ui/`.

#### Verworfene Alternativen

<!-- leser: agent -->

| Alternative | Warum nicht |
|---|---|
| Web Speech API `SpeechRecognition` im Browser | Chrome schickt Audio an Google → verletzt AK-16/Z-04 |
| `whisper-cli` je Anfrage mit Temp-Datei | Audio auf Platte (AK-17), Modell-Ladezeit bei jedem Satz |
| Whisper im Browser (WASM/transformers.js) | Modell-Download im Browser zur Laufzeit, langsamer, Speicher je Tab |
| macOS `SFSpeechRecognizer` per Swift-Helfer | zu kompilierendes Binärteil, eigene Rechte-Dialoge, kein Lieferweg |
| Sprachausgabe per `say -o` im Backend | Datei auf Platte, Streaming-Aufwand; Browser-Stimmen sind dieselben Mac-Stimmen |
| Piper/andere TTS-Modelle | zusätzlicher Download und Prozess ohne Gewinn gegenüber Mac-Stimmen |
| Anweisung per `--append-system-prompt` beim Start | nicht schaltbar, nur neue Sitzungen, FA-02/AN-S04 verletzt |
| Anweisung in Projekt-`CLAUDE.md` | Spec §7 AR-01/AR-06-Zeile: nichts ins Projekt; wirkt auch ohne UI |
| Drittes Modell kürzt die Antwort | B-04/FA-30: Sprechfassung schreibt der Agent selbst |
| Sprechfassung/Transkript aus der Transkriptdatei lesen | ADR-0004 „kein Transkript-Leser"; Hook-Body reicht |
| Antworten über `vorhaben-service.sendTextToSession` | Protokolleintrag mit Text auf Platte (AK-17), nur Vorhaben-Sitzungen, lehnt `blocked` ab |
| Warteschlange im Browser | AR-05; mehrere Fenster klingeln unabhängig |
| Anrufmodus in `settings.general` | pro Projekt und `ui/config/general-config.json` ist versioniert |
| Schalter zusätzlich in der Glocke | Spec §6 nennt nur Einstellungen; Kopfzeile unverändert (design §1 P5) |
| large-v3 (3,1 GB) | gemessen ungenauer (7,8 % vs. 4,7 %), 4,5× Speicher |

#### Architektur-Auswirkung

<!-- leser: agent -->

- **Ja** — keine AR-Regel ändert sich (AR-01: UI nicht im Manifest; AR-04: keine Projektpfade; AR-05: Schalter und Schlange im Backend; AR-08: neue Tastenfolgen halten die Regel ein), aber:
    - §2 Backend-Zeile: Anruf-Dienst (Schlange, flüchtige Hook-Inhalte nur bei Anrufmodus an, synchroner Kontext-Hook, Kindprozess `whisper-server` auf `127.0.0.1`, Dialog-Tastenfolgen); §2 Frontend-Zeile: `aos-anruf`, Glocke mit „Anrufen".
    - §3 zwei neue Zeilen: „Anrufmodus-Schalter" (`<runtime>/anruf-<port>.json`), „Anruf-Inhalte und Warteschlange" (nur Speicher, bis Erledigung/Ausschalten).
    - §5 neue Zeilen: whisper.cpp (lokaler Prozess, Homebrew) und Hugging Face (nur Einrichtung).
    - §8 ADR-0006; §10 Zeile Team-Ansicht ohne `settings.voice.get`-Rest.
- `docs/architecture.md` wird **in dieser PR** angepasst. **ADR nötig: ja** — `docs/adr/0006-anruf-liest-hook-inhalte-fluechtig.md` (ergänzt ADR-0004: Hook-Inhalt nur bei Anrufmodus an, nur Speicher, kein Transkript-Leser; lokale Sprachverarbeitung).
- Dazu `docs/security.md` (§1 Datenobjekte, §2 Vertrauensannahme, neue WS-Nachrichten, Origin-Prüfung als zusätzliche Schicht (kein vollständiger Schutz gegen Browser-Erweiterungen), Kontext-Dateien im Laufzeitordner, §3 Sprachdienst-Zeile „lokal, keine Zugänge", §4 neue Bedrohung T-08 falsch erkannte Freigabe), `docs/design.md` (§4 Muster „Anruf", Glocke mit „Anrufen"; §1 P5: Anruf-Kasten ist vorübergehend wie ein Dialog, kein Rahmen), `docs/product-brief.md` §5 Zeile Web-UI.

### 4. Änderungen

<!-- leser: agent -->

| # | Datei / Komponente | Art | Was | Herkunft |
|---|---|---|---|---|
| 1 | `ui/src/shared/types/anruf.protocol.ts` | neu | Typen Meldung, Zustand, Nachrichten `anruf:*`, Gründe + Texte, Anweisungstexte, Konstanten (80 Wörter, 5 min, 30 s Audio, 30 s Kulanz) | FA-01…FA-30 |
| 2 | `ui/src/shared/anruf-text.ts` | neu | D7 Sprechfassung, Bereinigen, Kürzen, Frage vorlesen | FA-13, FA-15, FA-16, FA-17 |
| 3 | `ui/src/shared/anruf-befehle.ts` | neu | D11 Befehle und Möglichkeiten deuten | FA-20, FA-21, FA-22, FA-23 |
| 4 | `ui/src/shared/anruf-audio.ts` | neu | Downsampling Float32→16 kHz Int16, Base64, WAV-Kopf | FA-26 |
| 5 | `ui/src/server/services/claude-hooks.ts` | ändern | `extractAnrufInhalt`; synchroner Eintrag `UserPromptSubmit` liest `<runtime>/anruf-kontext-<port>/` (nur `darwin`, ohne `SPECWRIGHT_ANRUF=off`) | FA-13, FA-14, D1, D2 |
| 6 | `ui/src/server/routes/cloud-terminal.routes.ts` | ändern | Body an `anruf.hookInhalt` zwischen `reportHookContext` und `reportAgentEvent` | FA-13 |
| 6a | `ui/src/server/services/cloud-terminal-manager.ts` | ändern | `blockedBy` zusätzlich im Detail von `session.agent-event` (`:508-514`), additiv | D5a (ext. Review 13) |
| 7 | `ui/src/server/services/anruf-warteschlange.ts` | neu | D5 | FA-06…FA-10 |
| 7a | `ui/src/server/services/anruf-zustand.ts` | neu | reine Übergangsfunktion D6 | FA-03, FA-06, FA-11, FA-12, FA-22, FA-25 |
| 8 | `ui/src/server/services/anruf-service.ts` | neu | D6, D1-Speicher, D2-Kontext, D10-Persistenz | FA-01…FA-12, FA-25, FA-27, FA-28 |
| 9 | `ui/src/server/services/sprach-erkennung.ts` | neu | D3 | FA-26, FA-27, FA-28 |
| 10 | `ui/src/server/services/anruf-sender.ts` | neu | D8 | FA-21…FA-25 |
| 11 | `ui/src/server/utils/rueckfrage-dialog-state.ts` | neu | Parser AskUserQuestion (Tabs, Optionen, Haken, eigene Zeile, Prüfseite) | FA-21, FA-24 |
| 12 | `ui/src/server/services/dialog-driver.ts` | ändern | neue lockfreie Funktion `pruefeEingabeWartet(source, id)` = `strict`-Zweig aus `vorhaben-service.ts:769-786` (Review F2) | FA-24; Minimalinvasiv |
| 13 | `ui/src/server/services/vorhaben-service.ts` | ändern | `screenCheck` ruft im `strict`-Fall #12; `pasteLocked`/`settleEnter` unverändert | — (Refactoring) |
| 13a | `ui/src/server/services/plan-review-orchestrator.ts` | ändern | lesende Methode `isReviewRunning(sessionId)` | FA-22 (Review F9) |
| 13b | `ui/tests/fixtures/hooks/2.1.283/*.json` | neu | echte Hook-Payloads (Stop, PreToolUse AskUserQuestion einzeln/mehrfach/multiSelect, PreToolUse ExitPlanMode), anonymisiert | FA-13 (Review F13) |
| 14 | `ui/src/server/utils/lokal-verbindung.ts` | neu | `istLokalerBrowser(req)` | FA-28, AN-S13 |
| 15 | `ui/src/server/utils/runtime-paths.ts` | ändern | `getAnrufStatePath()`, `getSpracheTmpDir()` | FA-01, FA-27 |
| 16 | `ui/src/server/services/anruf-handler.ts` | neu | Validierung `anruf:*` nach Muster `vorhaben-handler.ts:260-275` (Typen, `meldungId`, Base64 ≤ 1,4 MB, Antwort-Union) | security §6 |
| 17 | `ui/src/server/websocket.ts` | ändern | `req` im `connection`-Callback, `anrufLokal`; `AnrufService`/`AnrufHandler` bauen; `case 'anruf:*'`; Close → `anruf.clientWeg`; Parse-Fehler-Log ohne Inhalt (`:560`) | FA-06, FA-27, FA-28 |
| 18 | `ui/src/server/index.ts` (bzw. Shutdown-Stelle von `websocket.ts`) | ändern | `sprachErkennung.stop()` im Shutdown | FA-26 |
| 19 | `ui/frontend/src/services/anruf.service.ts` | neu | D11 | FA-03, FA-04, FA-18…FA-20, FA-26 |
| 20 | `ui/frontend/src/components/anruf/aos-anruf.ts` | neu | Kasten, Zustände nach Mock, Tastatur | FA-03, FA-06, FA-12, FA-13, FA-18, FA-20, FA-22, FA-25, FA-29 |
| 21 | `ui/frontend/src/components/terminal/notification-sound.ts` | ändern | `playAnrufKlingeln()` | FA-03 |
| 22 | `ui/frontend/src/components/terminal/agent-notifications.ts` | ändern | `blockKind` in `BellSession`/`BellRow` | FA-05, FA-12 |
| 23 | `ui/frontend/src/components/rahmen/aos-glocke.ts` | ändern | Knopf „Anrufen", Event `glocke-anrufen` | FA-12 |
| 24 | `ui/frontend/src/app.ts` | ändern | `<aos-anruf>` mounten; `blockKind` aus `agentStatusFields`/Agent-Event in die Sitzung; `glocke-anrufen` → Dienst | FA-12 |
| 25 | `ui/frontend/src/views/settings-view.ts` | ändern | Schalter „Anrufmodus" im Abschnitt „Allgemein" | FA-01, FA-28 |
| 26 | `ui/frontend/src/styles/theme.css` | ändern | `aos-app .anruf*`, Glocken-Knopf, Schalter | §6 Mock |
| 27 | `ui/scripts/sprache-einrichten.sh`, `ui/scripts/sprache-messen.sh` | neu | D12 | Ablauf G, FA-26, EK-01/EK-03 |
| 28 | `ui/package.json`, `ui/package-lock.json` | ändern | Skripte `sprache:einrichten`, `sprache:messen`; Deepgram/ElevenLabs entfernt | D12, D13 |
| 29 | `ui/src/shared/types/voice.protocol.ts` | löschen | Rest | ER-01 |
| 30 | `ui/frontend/src/views/team-view.ts` | ändern | Voice-Toast und `settings.voice.get`-Aufruf weg | ER-01 |
| 31 | `ui/tests/fixtures/tui/2.1.283/*.txt` | neu | aufgenommene Bildschirme (Einzelfrage, eigene Antwort vor/nach Paste, Mehrfach mit Haken, zweite Frage, Prüfseite, Plan-Dialog, Plan Option 3 mit Text) | FA-21, FA-22 |
| 32 | Tests (siehe §8) | neu/ändern | | alle |
| 33 | `docs/adr/0006-anruf-liest-hook-inhalte-fluechtig.md` | neu | D1–D3 | §3 |
| 34 | `docs/architecture.md`, `docs/security.md`, `docs/design.md`, `docs/product-brief.md` | ändern | §3 Architektur-Auswirkung | §3 |
| 35 | `intent/INT-2026-025-agenten-anrufe/design/anruf-mock.png` (+ `.html` Quelle) | neu, **vor der Freigabe** (Schritt 9a) | Mock | design §6 |

**Nicht betroffen (ausdrücklich):** `specwright/` (Framework, Manifest, Installer), `setup-ui.sh` (Einrichtung ist eigener Schritt), `pasteLocked`/`settleEnter` in `vorhaben-service.ts`, Disk-Registry `cloud-session-registry.ts` (Inhalte nie dort), `vorhaben-state.ts`/Protokoll (Sprachantworten ohne Eintrag), `mapHookPayload` (Status unverändert), `ringsForAgentEvent` selbst (die Unterdrückung des Zweiklangs sitzt in `app.ts`, nur bei Modus an; FA-02), Cloud-Host-Deploy.

### 5. Verbindungen

<!-- leser: agent -->

| Von | Nach | Art | Schnittstelle | Nachweis (Befehl) | Teil |
|---|---|---|---|---|---|
| Claude Code (Hook) | Kontext-Dateien | Datei lesen, synchron | `<runtime>/anruf-kontext-<port>/an.json`, `aus-<id>.json` | `grep -n "anruf-kontext" ui/src/server/services/claude-hooks.ts ui/src/server/services/anruf-service.ts`; Test `claude-hooks.test.ts`, `anruf-kontext.test.ts` | — |
| Route `agent-event` | `AnrufService.hookInhalt` | Methodenaufruf | `anruf?.hookInhalt(sessionId, body)` | `grep -n "hookInhalt" ui/src/server/routes/cloud-terminal.routes.ts`; Test `cloud-terminal-routes.test.ts` | — |
| `CloudTerminalManager` | `AnrufService` | Event | `session.agent-event`, `session.closed` | `grep -n "session.agent-event\|session.closed" ui/src/server/services/anruf-service.ts`; Test `anruf-service.test.ts` | — |
| `AnrufService` | `AnrufWarteschlange` | Import | `new AnrufWarteschlange(uhr)` | `grep -n "AnrufWarteschlange" ui/src/server/services/anruf-service.ts` | — |
| `AnrufService` | `SprachErkennung` | Import | `start()`, `stop()`, `erkenne(pcm)`, `verfuegbarkeit()` | `grep -n "SprachErkennung" ui/src/server/services/anruf-service.ts` | — |
| `SprachErkennung` | `whisper-server` | Kindprozess + HTTP `127.0.0.1` | `spawn`, `POST /inference` | Test `sprach-erkennung.test.ts` (Fake-Binärdatei, prüft Host `127.0.0.1`) | — |
| `AnrufService` | `AnrufSender` | Import | `sende(meldung, antwort)` | `grep -n "AnrufSender" ui/src/server/services/anruf-service.ts` | — |
| `AnrufSender` | Manager | Methoden | `withMachineWrite`, `sendInput(…,{inferUnblock:false})`, `readScreen`, `readCursorProbe` | Test `anruf-sender.test.ts` (Fake-Quelle, Tastenprotokoll) | — |
| `AnrufSender`, `VorhabenService` | `dialog-driver.ts` | Import | `pruefeEingabeWartet` | `grep -rn "pruefeEingabeWartet" ui/src/server`; bestehende `vorhaben-service*.test.ts` grün | — |
| `AnrufSender` | `PlanReviewOrchestrator` | Methodenaufruf (lesend) | `isReviewRunning(id)` | `grep -n "isReviewRunning" ui/src/server/services/anruf-sender.ts ui/src/server/services/plan-review-orchestrator.ts` | — |
| `websocket.ts` | `AnrufHandler`/`AnrufService` | Import, `case 'anruf:*'` | `anruf:modus.set`, `anruf:faehig`, `anruf:annehmen`, `anruf:ablehnen`, `anruf:spaeter`, `anruf:auflegen`, `anruf:anrufen`, `anruf:erkennen`, `anruf:senden` | `grep -n "anruf:" ui/src/server/websocket.ts`; Test `anruf-handler.test.ts` | — |
| `AnrufService` | Frontend | WS-Push (nur lokal) | `anruf:state`, `anruf:verfuegbarkeit`, `anruf:erkannt`, `anruf:ergebnis`, `anruf:error` | Test `anruf-service.test.ts` (Broadcast-Filter) | — |
| `anruf.service.ts` | `gateway` | Import | `send`/`on` | `grep -n "anruf:" ui/frontend/src/services/anruf.service.ts` | — |
| `app.ts` | `aos-anruf` | Template | `<aos-anruf>` | `grep -n "aos-anruf" ui/frontend/src/app.ts` | — |
| `aos-glocke` | `app.ts` → `anruf.service` | Event | `glocke-anrufen` | `grep -n "glocke-anrufen" ui/frontend/src/components/rahmen/aos-glocke.ts ui/frontend/src/app.ts`; Test `aos-glocke.test.ts` | — |
| `settings-view.ts` | `anruf.service` | Import | `setModus`, Verfügbarkeit | `grep -n "anruf" ui/frontend/src/views/settings-view.ts` | — |
| `npm run sprache:einrichten` | `ui/scripts/sprache-einrichten.sh` | Skript | — | `grep -n "sprache:einrichten" ui/package.json` | — |

- [x] Jede neue Komponente hat mindestens eine Verbindung.
- [x] Jeder Nachweis ist ein ausführbarer Befehl.

### 6. Reihenfolge der Arbeit

<!-- leser: agent -->

0. **Lesende Vorprüfung:** Aufrufer von `renderHookSettings`, `mapHookPayload`, `pasteLocked`/`screenCheck` und Importeure von `voice.protocol.ts` auflisten (`grep -rn`); `bash scripts/verify.sh --fast` auf unverändertem Stand; Claude-Code-Version prüfen (`claude --version`), bei ≠ 2.1.283 Tastenprotokoll aus §2 neu aufnehmen → prüfbar: Liste im PR, `verify: OK`.
1. Fixtures aufnehmen (#31, #13b) mit eigenem tmux-Server `-L anrufprobe` im Scratch-Ordner (Verfahren §2), zusätzlich die noch nicht gemessenen Fälle: Mehrfachauswahl als einzige Frage (wie abschicken?), eigene Antwort in Frage 1 von 2 (weiter oder abschicken?), Mehrfachauswahl mit eigener Antwort; Hook-Payloads per Test-Hook `cat > <scratch>/<event>.json`. **Stopp-Punkt:** enthält `ExitPlanMode` keinen Plantext → Rückfrage an Michael (D1). Fälle ohne Fixture meldet der Parser als „bitte im Terminal" → prüfbar: Dateien unter `ui/tests/fixtures/tui/2.1.283/` und `ui/tests/fixtures/hooks/2.1.283/`.
2. Reine Module #1–#4, #7, #11, #14 mit Tests → prüfbar: `npx vitest run tests/unit/anruf-*.test.ts tests/unit/rueckfrage-dialog-state.test.ts tests/unit/lokal-verbindung.test.ts` grün.
3. Refactoring #12/#13 (`pruefeEingabeWartet`) und #13a → prüfbar: alle `vorhaben-service*.test.ts` und `plan-review-orchestrator.test.ts` unverändert grün.
4. Hooks #5/#6 → prüfbar: `claude-hooks.test.ts`, `cloud-terminal-routes.test.ts`, neuer Routentest grün.
5. `SprachErkennung` #9, `AnrufSender` #10, `AnrufService` #8, Handler #16, Verdrahtung #15/#17/#18 → prüfbar: Service-, Sender-, Handler-Tests grün; Backend startet (`npm run dev:backend`), `anruf:state` im Browser-Log.
6. Einrichtungsskript #27/#28 → prüfbar: `bash ui/scripts/sprache-einrichten.sh --von <scratch-datei>` meldet „ok", zweiter Lauf „ok" ohne Download; `bash -n` und Bash-3.2-Stichprobe (`/bin/bash --version` 3.2).
7. Frontend #19–#26 → prüfbar: Lit-Tests grün, `npm run build` in `ui/frontend`.
8. Aufräumen #29/#30/#28 → prüfbar: `grep -rn "voice.protocol\|deepgram\|elevenlabs" ui/src ui/frontend/src ui/package.json` leer, `ui-rahmen-abbau.test.ts` grün.
9. Docs #33/#34/#35 → prüfbar: Leser-Marker-Guard grün, Links in ADR gültig.
10. Verbindungen nachweisen (§5), `bash scripts/verify.sh` → `verify: OK`; E2E §8.

### 7. Zerlegung

<!-- leser: agent -->

#### Variante A — nicht zerlegbar, eine Sitzung

<!-- leser: agent -->

Backend-Dienst, Protokoll, Frontend-Kasten und Sender greifen über eine gemeinsame Zustandsmaschine und 15 Verbindungen (§5) ineinander; ein Schnitt Backend/Frontend spart wenig, weil das Protokoll (#1) erst beim Bauen des Senders und des Kastens fertig wird. Umsetzung in einer Sitzung, Meilensteine als Commits (§11), eine PR.

### 8. Tests und Nachweis

<!-- leser: agent -->

| AK / FA | Test | Datei | Art |
|---|---|---|---|
| FA-01, AK-01 | Schalter Standard aus, übersteht Neustart (Datei), Umschalten broadcastet | `ui/tests/unit/anruf-service.test.ts` | Unit |
| FA-02 | Modus aus: `hookInhalt` speichert nichts, keine `an.json`, keine Meldung, `ringsForAgentEvent` unverändert | `anruf-service.test.ts`, `agent-notifications.test.ts` (bestehend) | Unit |
| FA-03, AK-02 | `blocked`/`stop` → `anruf:state` klingelt binnen 5 s (Fake-Uhr, sofort); Kasten zeigt Sitzung, Projekt, Art; Klingelton ≠ Glockenton | `anruf-service.test.ts`, `ui/tests/unit/aos-anruf.test.ts` | Unit |
| FA-04 | Hintergrund → `Notification` (Fake); ohne lokalen Client keine Meldung (30 s Kulanz) | `aos-anruf.test.ts`, `anruf-service.test.ts` | Unit |
| FA-05, AK-15 | `berechtigung`, `unbekannt`, `StopFailure`, Probe `trust` → kein Anruf; Glocke ohne „Anrufen" | `anruf-service.test.ts`, `aos-glocke.test.ts` | Unit |
| FA-06…FA-10, AK-03…AK-06 | Reihenfolge, Ersetzen je Sitzung, Ablehnen, Später (5 min nur allein) | `ui/tests/unit/anruf-warteschlange.test.ts` | Unit |
| FA-11, AK-07 | Statuswechsel/Schließen entfernt aus Schlange, stoppt Klingeln, beendet laufenden Anruf mit Grund; `idle-timeout` nicht | `anruf-service.test.ts` | Unit |
| FA-12, AK-08 | „Anrufen": Knopf nur bei Modus an und passender Art; klingelnde geht zurück; `ANRUF_BESETZT` | `anruf-service.test.ts`, `aos-glocke.test.ts` | Unit |
| FA-13, FA-16, AK-09 | Vorlesetext je Art; Möglichkeiten nummeriert ohne Beschreibung; „und n weitere" | `ui/tests/unit/anruf-text.test.ts` | Unit |
| FA-14, AK-09 | Kontext-Hook: an → `an.json`; aus → `an.json` weg, `aus-<id>.json` je Sitzung, nach einmaligem Lesen weg (Befehl real in `bash` gegen Testordner ausgeführt); kein `curl` im Befehl; Laufzeit < 100 ms; Kill-Switch | `claude-hooks.test.ts`, `ui/tests/unit/anruf-kontext.test.ts` | Unit/Integration |
| FA-15, FA-17, AK-10, AK-11 | Bereinigung (Code, Pfade, Tabellen, Links), 80 Wörter am Satzende, „gekürzt"; ohne Sprechfassung zwei Sätze + Ansage | `anruf-text.test.ts` | Unit |
| FA-18 | „Nochmal" bricht ab und liest neu (Fake-`speechSynthesis`) | `aos-anruf.test.ts` | Unit |
| FA-19 | Mikrofon nur zwischen Sprechen und Fertig; Spuren gestoppt; 30-s-Grenze | `ui/tests/unit/anruf-frontend-service.test.ts` | Unit (Fakes) |
| FA-20, AK-12 | Anzeige „Wird gesendet als"; Senden/Verwerfen/Nochmal per Knopf, Taste, Wort | `aos-anruf.test.ts`, `ui/tests/unit/anruf-befehle.test.ts` | Unit |
| FA-21, AK-13 | Nummer/Wortlaut/Zahlwort → Möglichkeit; mehrdeutig; mehrfach; mehrere Fragen erst nach letzter senden; Tastenprotokoll gegen Fixtures 2.1.283 | `anruf-befehle.test.ts`, `ui/tests/unit/rueckfrage-dialog-state.test.ts`, `ui/tests/unit/anruf-sender.test.ts` | Unit |
| FA-22, FA-23, AK-14 | „freigeben" → Nachfrage; nur „ja"/Klick → Taste `1`; sonst zurück; anderer Text → Option 3 + Paste; Kollision mit Plan-Review-Text → Abbruch | `anruf-sender.test.ts`, `aos-anruf.test.ts` | Unit |
| FA-24 | falscher Status, andere Frage, Eingabezeile voll (Cursor-Probe), `beschaeftigt` → kein Senden, Grund | `anruf-sender.test.ts` | Unit |
| D6 (ext. Review 7) | Übergangstabelle aller Zustände × Ereignisse | `ui/tests/unit/anruf-zustand.test.ts` | Unit |
| FA-25 | „Gesendet" + Auflegen; Auflegen ohne Senden lässt Glocke unverändert | `anruf-service.test.ts` | Unit |
| FA-26, AK-16 | `SprachErkennung` verbindet nur `127.0.0.1`; Stimme nur `localService`; **Netz getrennt** Anruf komplett | `ui/tests/unit/sprach-erkennung.test.ts`, `aos-anruf.test.ts`; manuell §10 | Unit + Messung |
| FA-27, AK-17 | Kein Schreibaufruf (`fs`-Spy) in Service/Sender/Erkennung; `stdio: 'ignore'`; `whisper-server`-`cwd`/`TMPDIR` nach 10 Anfragen leer; kein Protokolleintrag | `sprach-erkennung.test.ts`, `anruf-service.test.ts`; Messung beim E2E | Unit + Review |
| FA-28, AK-18 | `istLokalerBrowser` (Loopback+Host, XFF, Tailscale-Header, Tunnel); Gründe Modell/Binärdatei/Plattform/Mikrofon/Stimme; Glocke unverändert | `ui/tests/unit/lokal-verbindung.test.ts`, `sprach-erkennung.test.ts`, `ui/tests/unit/settings-anruf.test.ts` | Unit |
| FA-29 | alle Knöpfe fokussierbar mit Beschriftung; Leertaste halten bei Fokus | `aos-anruf.test.ts` | Unit |
| FA-30 | Review: kein Modellaufruf außer `whisper-server`; `anruf-text` kürzt nur | Review im PR | Review |
| Refactoring #12 | Verhalten `vorhaben-service` unverändert | bestehende `vorhaben-service*.test.ts` | Unit |
| D1 (Review F1) | Aufruf-Reihenfolge `reportHookContext` → `hookInhalt` → `reportAgentEvent`; Meldung hat Inhalt | `cloud-terminal-routes.test.ts` | Unit |
| D1 (Review F13) | `extractAnrufInhalt` gegen echte Payloads 2.1.283 | `claude-hooks.test.ts` | Unit |
| D5a (Review F3, F4) | `blocked→blocked` (Grund, `review-injected`, `unbekannt`) klingelt nicht, hebt Ablehnung nicht auf; Probe → Hook hängt Inhalt an; fertig aufgelöst bei `session-start`/`stop-failure`, nicht bei `idle-*` | `anruf-service.test.ts` | Unit |
| D6 (Review F6) | `anruf:senden freigeben` ohne vorherige Nachfrage bzw. von Nicht-Besitzer → `INVALID_MESSAGE` | `anruf-handler.test.ts`, `anruf-service.test.ts` | Unit |
| D6 (Review F15) | zweites Fenster: nach Annahme „läuft in anderem Fenster", `anruf:erkannt` nur an Besitzer | `anruf-service.test.ts` | Unit |
| D8 (Review F7, F8, F9) | Fokus auf Freitext/„Type something" → Abbruch ohne Taste; vorgesetzte Haken → Abbruch; unbekannte Ja-Beschriftung → `unbekannte_freigabe`; Review läuft → `plan_review_laeuft`; Freitext-Nummer aus `target` | `anruf-sender.test.ts` | Unit |
| D3 (Review F14, F16) | leer/Halluzinationsliste → `nichts_verstanden`; verwaiste PID wird beendet (Fake) | `sprach-erkennung.test.ts` | Unit |
| D2 (Review F11) | Kontext-Hook nur auf `darwin` gerendert, mit Guards; beide `UserPromptSubmit`-Einträge vorhanden | `claude-hooks.test.ts` | Unit |
| D9 (Review F10) | Origin fremd → nicht lokal; Tailscale-Serve (`x-forwarded-*`, fremder Host) → nicht lokal | `lokal-verbindung.test.ts` | Unit |
| D11 (Review F12, F18, Spec §4) | Zweiklang unterdrückt nur bei Modus an und Anruf-Ereignis; Leertaste-Loslassen klickt keinen Knopf; `track.onended` → Anruf endet ohne Senden | `aos-anruf.test.ts`, `ui/tests/unit/app-anruf-ton.test.ts` | Unit |
| Spec §4 „ja, aber …" | Befehlswörter nur als ganzer Text | `anruf-befehle.test.ts` | Unit |
| EK-01, EK-03 | 20 Sätze Michael, Median ≤ 3 s, WER ≤ 15 % | §10 Schritt 4 | Messung |
| EK-02 | 10 Anrufe, Annahme → erstes Wort ≤ 2 s | E2E-Protokoll | Messung |
| EK-04 | 10 echte Fertig-Meldungen ≤ 80 Wörter (Rohtext des Agenten, vor Kürzung) | E2E-Protokoll | Messung |

- **Verify-Befehl:** `bash scripts/verify.sh` — muss `verify: OK` enden, Ausgabe im PR. **CI ist die Wahrheit.** `ui/tests/known-failures.txt` wird nicht angefasst. Im Worktree nach `npm ci`: `chmod +x ui/node_modules/node-pty/prebuilds/*/spawn-helper`, zweites `npm ci` in `ui/frontend`.
- **Angeschlossen (E2E-Pfad):** Branch-Backend auf Port 3111 mit Scratch-Projekt (`reference_cloud_terminal_e2e_playwright`), Browser am Mac auf `http://localhost:3111`: Modus an → neue Claude-Sitzung (Haiku) → Rückfrage mit 3 Möglichkeiten → Klingeln → Annehmen → Vorlesen → Sprechen (echte Stimme oder `say`-Wiedergabe in das Mikrofon) → „zwei" → Senden → Sitzung zeigt „→ Möglichkeit 2" → Fertig-Meldung klingelt → Sprechfassung vorgelesen → Plan-Vorlage → „freigeben" → „ja" → Sitzung arbeitet. Protokoll mit Zeiten (EK-02) und Screenshots je Zustand neben den Mock im PR. Dabei `ls -A <sprache-tmp>` leer (FA-27).
- **Manuelle Checkliste im PR-Protokoll (Review F20):** Rückfrage mit 2 Fragen und Mehrfachauswahl · eigene Antwort · Plan überarbeiten · Plan mit laufendem Plan-Review · im Terminal antworten, während es klingelt (≤ 5 s weg, AK-07) · Text in der Eingabezeile · zwei Fenster · Neuladen während des Anrufs · Stille/Rauschen · Mikrofon abziehen · Backend-Neustart bei Modus an (Schalter bleibt, `whisper-server` startet, nichts klingelt nach) · Sitzung von vor dem Update (Rückfall ohne Sprechfassung) · Latenz des Kontext-Hooks p95.
- **Bugfix:** entfällt (Neubau).
- **UI:** Ergebnis entspricht `design/anruf-mock.png` — Screenshots per Playwright (Branch-Backend, Scratch-Projekt) im PR.

### 9. Risiken

<!-- leser: mensch -->

| Risiko | Wahrscheinlichkeit | Wirkung | Gegenmaßnahme | Wer merkt es |
|---|---|---|---|---|
| R1 Claude Code ändert Dialog-Darstellung oder Tasten | mittel | mittel | Parser scheitern geschlossen (nichts gesendet, „bitte im Terminal beantworten"); Fixtures je Version; Schritt 0 prüft Version | Michael beim Anruf |
| R2 Plan-Freigabe per Stimme schaltet Bypass-Modus (Option 1) | sicher (so gebaut) | mittel | zweistufige Bestätigung; Nachfrage nennt Bypass ausdrücklich (AN-S10); T-08 in `security.md` | Michael |
| R3 Agent schreibt keine oder zu lange Sprechfassung | mittel | niedrig | Rückfall zwei Sätze (FA-17), Kürzung mit „gekürzt"; EK-04-Stichprobe | Michael beim Zuhören |
| R4 Sitzungen von vor dem Update haben den Kontext-Hook nicht | hoch (einmalig) | niedrig | Rückfall FA-17; Hinweis im PR: laufende Sitzungen neu starten | Michael |
| R5 Synchroner Hook verzögert Eingaben | niedrig (nur Dateilesen) | mittel | kein Netzweg, Schwelle p95 ≤ 20 ms / max ≤ 100 ms, Kill-Switch `SPECWRIGHT_ANRUF=off` | Build-Sitzung (Messung), Michael |
| R6 `whisper-server` schreibt doch Temp-Dateien oder loggt Text | niedrig | mittel (AK-17) | `stdio: 'ignore'`, eigener leerer `cwd`/`TMPDIR`, Nachweis im E2E; Abweichung → ER-03-artig stoppen | Build-Sitzung (Messung) |
| R7 Erkennung mit Michaels Stimme schlechter als synthetisch | mittel | mittel | Messung vor Merge (§10); Vokabel-Prompt; Wechsel auf large-v3 als Rückfall (ER-03) | Michael bei der Messung |
| R8 Tailscale- oder LAN-Aufruf am Mac gilt als „nicht lokal" | mittel | niedrig | Grund nennt `http://localhost:3001` | Michael in den Einstellungen |
| R9 Chrome: Klingelton im Hintergrund-Tab stumm (AudioContext ohne Geste) | mittel | niedrig | Systemmitteilung zusätzlich; Einschalten ist eine Geste | Michael |
| R10 Falsch erkanntes Wort löst etwas aus | niedrig | mittel | nichts ohne „Senden"; Plan nur nach zweitem „Ja"; Mehrdeutiges → eigene Antwort mit Hinweis | Michael |
| R11 Herausziehen von `pruefeEingabeWartet` ändert Verhalten „Nächster Schritt" | niedrig | mittel | nur der lockfreie `strict`-Zweig wandert, `pasteLocked` bleibt; bestehende Tests unverändert grün | CI |
| R14 Hook liefert Plan nur als Pfad | niedrig | mittel | Stopp-Punkt in Schritt 1, Rückfrage vor Weiterbau; bis dahin Plan „ohne Inhalt" | Build-Sitzung |
| R15 Fremde Webseite im selben Browser verbindet sich mit dem Backend | niedrig | mittel | Origin-Prüfung für alle `anruf:*` und `anruf:state` | Review, Test |
| R12 Hugging Face stockt beim Download | mittel | niedrig | `-C -`, Stillstands-Abbruch, 3 Versuche, `--von` | Michael beim Einrichten |
| R13 Zeitbudget 8 Tage knapp (Tastenfolgen neu) | mittel | mittel | Meilensteine §11; bei Tag 8 Stopp (ER-08) | Build-Sitzung, Michael |

### 10. Manuelle Schritte

<!-- leser: mensch -->

| Schritt | Wer | Wann | Erledigt |
|---|---|---|---|
| Mock ansehen: `intent/INT-2026-025-agenten-anrufe/design/anruf-mock.png` (liegt mit dem Plan-Entwurf im Intent-Ordner) — mit dieser Plan-Freigabe | Michael | vor Umsetzung | [x] 2026-09-27 |
| Modellwahl freigeben (ER-02): whisper.cpp (Homebrew, MIT) + `ggml-large-v3-turbo-q5_0.bin` (574 MB, MIT, `huggingface.co/ggerganov/whisper.cpp`, SHA-256 `394221709cd5…ffa7e2`); Stimme = Mac-Stimmen im Browser — mit dieser Plan-Freigabe | Michael | vor Umsetzung | [x] 2026-09-27 |
| O2 (Meldungen ohne offenes Fenster) und O3 (Sprechtaste) entscheiden — mit dieser Plan-Freigabe | Michael | vor Umsetzung | [x] 2026-09-27 |
| whisper.cpp vorhanden: `whisper-server --help` (heute 1.9.1 installiert); sonst `brew install whisper-cpp` | Michael | vor Umsetzung | [x] 2026-09-27 (1.9.1, `/opt/homebrew/bin`) |
| Modell einrichten: `cd ui && npm run sprache:einrichten` (Weg: `ui/scripts/sprache-einrichten.sh`) | Michael (oder Build-Sitzung mit `--von` aus Scratch) | vor E2E | [x] 2026-09-27 Build-Sitzung mit `--von`, Prüfsumme ok, zweiter Lauf ohne Kopie |
| EK-01/EK-03 mit eigener Stimme: 20 vorgegebene Sätze (Liste im PR) im E2E-Branch per Anruf sprechen; Build-Sitzung wertet Median und WER aus; verfehlt → ER-03 | Michael + Build-Sitzung | vor Merge | [ ] |
| AK-16: WLAN aus, Anruf annehmen, sprechen, senden; Ergebnis ins PR-Protokoll | Michael | vor Merge | [ ] |
| Merge der PR (löst Auto-Deploy aus; Cloud-Host zeigt „nicht verfügbar", keine Aktion nötig) | Michael | nach PR-Checks grün | [ ] |
| Nach Merge: lokales Backend (Port 3001, main-Checkout) neu starten; laufende Claude-Sitzungen bei Bedarf neu starten (R4) | Michael | nach Merge | [ ] |

### 11. Schätzung

<!-- leser: mensch -->

7–9 Arbeitstage (nach Review +1 Tag: Payload-Aufnahme, Fokus-/Vorzustandsprüfung, Backend-Nachfrage, Origin, Checkliste). Budget laut Absicht 8 Tage; bei Erschöpfung Stopp nach ER-08. Unsicherheit: Tastenfolgen und Parser für Rückfragen (neu, TUI-abhängig), Browser-Audio (AudioWorklet, Rechte, Hintergrund-Tab), E2E mit echter Stimme. Meilensteine (je ein Commit):

- **M1 (Tag 1–2):** Fixtures, reine Module, Warteschlange, Text/Befehle, Refactoring `session-paste`.
- **M2 (Tag 3–4):** Hooks, `SprachErkennung`, `AnrufSender`, `AnrufService`, Handler, Verdrahtung.
- **M3 (Tag 5–6):** Frontend (Kasten, Dienst, Glocke, Einstellungen), Einrichtungsskript, Aufräumen.
- **M4 (Tag 7–8):** Docs/ADR, E2E, Messungen, Screenshots, verify, PR.

**Vorab vereinbarte Rückfallstufe (ext. Review 5), nur mit Michaels Zustimmung bei ER-08:** Reihenfolge der Meilensteine ist so gewählt, dass nach M3 ein nutzbarer Stand steht. Reicht das Budget nicht, entfallen in dieser Reihenfolge und gehen als eigene Karte weiter: (1) Rückfragen mit mehreren Fragen oder Mehrfachauswahl per Stimme — der Anruf liest sie vor und bietet „Im Terminal öffnen"; (2) Knopf „Anrufen" in der Glocke; (3) Systemmitteilung im Hintergrund-Tab. Nicht verhandelbar: Schalter, Warteschlange, Klingeln, Vorlesen, Antwort auf „fertig", Einzelfrage, Plan freigeben/überarbeiten mit Nachfrage, AK-16/AK-17. Das wäre eine Spec-Änderung (AK-08, AK-13 teilweise) und braucht deine Freigabe.

### 12. Review des Plans

<!-- leser: mensch -->

| Finding | Quelle | Entscheidung | Änderung am Plan |
|---|---|---|---|
| S1, Mikrofon wird während des Anrufs entzogen (Spec §4) fehlte | Self | angenommen: `track.onended` beendet ohne Senden | D11, §8 |
| F1, Meldung entsteht vor dem Hook-Inhalt, weil `applyAgentEvent` synchron emittiert (Blocker) | Reviewer (Plan-Agent mit Codezugriff) | angenommen, am Code bestätigt (`cloud-terminal.routes.ts:82-86`): `hookInhalt` zwischen Kontext und Status; Probe-Erkennung über `blockedBy` | D1, D5a, §8 |
| F2, herausgezogenes `pasteLocked` nimmt selbst den Maschinen-Lock → verschachtelt immer `beschaeftigt` (Blocker) | Reviewer | angenommen, am Code bestätigt: nur lockfreies `pruefeEingabeWartet` nach `dialog-driver.ts`; Sender schreibt Paste+Enter in seinem einen Lock | D8, §4 #12/#13, R11 |
| F3, `blocked→blocked` (Grundwechsel, Review-Injektion, `unbekannt`) würde neu klingeln und Ablehnung aufheben | Reviewer | angenommen: Meldung nur beim Übergang in `blocked` oder bei `stop` | D5a |
| F4, Auflösung von „fertig" enger als die Glocke | Reviewer | angenommen: dieselbe Regel wie `agentDoneAt` | D5a |
| F5, „Anrufen" ohne gespeicherten Inhalt nicht geregelt | Reviewer | angenommen, entschieden nach AN-S11: fertig → Sprachantwort möglich, Rückfrage/Plan → nur „Im Terminal öffnen"; Vorlesen vom Bildschirm verworfen (würde Parser-Umfang und Fehlerquellen vergrößern) | D6, Mensch-Teil |
| F6, zweistufige Freigabe nur im Frontend | Reviewer | angenommen: Zustand `freigabe_nachfrage` im Backend, sonst `INVALID_MESSAGE` | D6, §8 |
| F7, Fokus und Vorzustand vor der ersten Taste nicht geprüft; drei Tastenfälle ungemessen | Reviewer | angenommen: Vorprüfung, Freitext-Nummer aus `target`, drei Fälle in Schritt 1 aufnehmen | D8, §6 |
| F8, „Option 1 beginnt mit Yes" zu schwach | Reviewer | angenommen: feste Liste, Wortlaut in der Nachfrage | D8, Mensch-Teil |
| F9, laufendes Plan-Review und Freigabe per Stimme | Reviewer | angenommen: `isReviewRunning`, Freigeben gesperrt, Überarbeiten erlaubt | D8, §4 #13a, Mensch-Teil |
| F10, Host/Loopback reicht nicht gegen fremde Webseiten im selben Browser | Reviewer | angenommen: Origin-Prüfung | D9, R15 |
| F11, synchroner Hook ohne Guards auf dem Tipp-Pfad, auch auf dem Cloud-Host | Reviewer | angenommen: Guards wie Bestand, nur `darwin`, Latenz messen | D2 |
| F12, Glockenton und Klingelton doppelt | Reviewer | angenommen, von mir entschieden: Zweiklang bei Anruf-Ereignissen unterdrückt, nur Modus an | D11, Mensch-Teil |
| F13, Hook-Payloads nicht belegt (Plan als Text oder Pfad?) | Reviewer | angenommen: Payload-Fixtures in Schritt 1, Stopp-Punkt | D1, §6, R14 |
| F14, Whisper-Halluzination bei Stille; „ja, aber" | Reviewer | angenommen | D3, §8 |
| F15, mehrere Fenster nicht vollständig geregelt | Reviewer | angenommen | D6 |
| F16, verwaister `whisper-server` | Reviewer | angenommen: PID-Datei | D3 |
| F17, Mock fehlt vor der Freigabe | Reviewer | angenommen: Mock liegt mit dem Entwurf im Intent-Ordner (Schritt 9a), §10 erste Zeile | §10, #35 |
| F18, Leertaste-Loslassen klickt fokussierten Knopf | Reviewer | angenommen | D11 |
| F19, Parse-Fehler-Log und Zeilenumbrüche im eingefügten Text | Reviewer | angenommen | D8, D9, #17 |
| F20, Testlücken und nur glücklicher E2E-Pfad | Reviewer | angenommen: Tests und manuelle Checkliste | §8 |
| E1, synchroner Hook auf dem Eingabeweg ohne harte Schwelle (Blocker, 3/3) | extern (opus, sonnet, glm) | angenommen, grundsätzlich gelöst: Hook liest nur lokale Dateien, kein HTTP, keine neue Route; Schwelle p95 ≤ 20 ms / max ≤ 100 ms, Kill-Switch `SPECWRIGHT_ANRUF=off` | D2, §4 #5/#6, §5, §8, R5, Mensch-Teil |
| E2, Wettlauf Hook-Inhalt gegen Statusereignis (2/3) | extern | teilweise: Inhalt und Status kommen im selben POST, dort kein Wettlauf (Route liest beides aus einem Body, `cloud-terminal.routes.ts:67-86`); echter Fall Probe vor Hook → Inhalt hängt bis zum Annehmen an | D5a |
| E3, Lock-Freiheit von `pruefeEingabeWartet` unbelegt (2/3) | extern | geprüft, unbegründet: `readScreen` (`cloud-terminal-manager.ts:1814`) und `readCursorProbe` (`:1834`) nehmen keinen Lock, `withMachineWrite` hat nur die Definition `:553` | — |
| E4, laufende Erkennung beim Absturz von `whisper-server` (2/3) | extern | angenommen: Anfrage scheitert, Puffer verworfen, Anruf bleibt offen, „bitte nochmal sprechen"; Warten bis 5 s auf Neustart | D3 |
| E5, keine vorab vereinbarte Rückfallstufe bei Budgetende (2/3) | extern | angenommen: Reihenfolge des Weglassens festgelegt, Freigabe erst bei ER-08 | §11, Mensch-Teil |
| E6, PID-Datei ohne Port kollidiert zwischen Backends 3001/3111 (Minderheit) | extern (glm) | angenommen, zutreffend für den eigenen E2E-Aufbau: `whisper-server-<port>.pid` | D3 |
| E7, Zustandsmaschine ohne Teststrategie (Minderheit) | extern (opus) | angenommen: reine Übergangsfunktion `anruf-zustand.ts`, Tabellentest | D6, §4 #7a, §8 |
| E8, Origin-Prüfung nur Verteidigung in der Tiefe (Minderheit) | extern (opus) | angenommen als Doku: `security.md` §2 nennt die Grenze (Browser-Erweiterungen) | §3 Architektur-Auswirkung |
| E9, Halluzinationsliste brüchig (Minderheit) | extern (sonnet) | teilweise: `no_speech_prob` zusätzlich, falls 1.9.1 es liefert; eigentlicher Schutz bleibt Anzeige + „Senden" | D3 |
| E10, feste Liste der Ja-Beschriftungen bricht bei neuem Wortlaut (Minderheit) | extern (opus) | abgelehnt: gewollt fail-closed (AR-08, AN-S10); neuer Wortlaut = neue Fixture und bewusste Aufnahme, bis dahin „im Terminal freigeben" | — |
| E11, alter Inhalt, wenn sich die Blockart innerhalb `blocked` ändert (Minderheit) | extern (glm) | angenommen: Wechsel `rueckfrage`↔`plan` = neue Meldung | D5a |
| E12, nach gescheitertem Senden steht Text in der Eingabe ohne Hinweis (Minderheit) | extern (glm) | angenommen: Grund nennt und zitiert den stehengebliebenen Text; kein Esc (AR-08) | D8 |
| E13, `blockedBy` fehlt im emittierten Ereignis (Minderheit) | extern (glm) | angenommen, am Code bestätigt (`cloud-terminal-manager.ts:508-514`): additiv ins Detail | §4 #6a |
| E14, Download-Schwelle zu streng (Minderheit) | extern (sonnet) | angenommen: 10 KB/s über 120 s, 5 Versuche mit Fortsetzen | D12 |
| E15, keine automatische Erkennung von Genauigkeitsverlust (Minderheit) | extern (opus) | teilweise: lokales Messskript `sprache:messen` mit synthetischen Sätzen; CI abgelehnt (574-MB-Modell, nur macOS) | D12, §4 #27 |
| E16, beliebige Fragekombinationen (Minderheit) | extern (opus) | angenommen: Zusammensetzen aus gemessenen Primitiven, höchstens 4 Fragen, Abbruch bei unerwartetem Bild | D8 |

**Minimalinvasiv geprüft:** wiederverwendet — Hook-Route und Token (`cloud-terminal.routes.ts`), Statusfluss des Managers statt eigener Erkennung, `dialog-driver.ts` (Cues, `promptZustand`, Cursor-Probe, `readStableScreen`), `parsePlanDialog`/`sanitizeInjectText`, `withMachineWrite`, Tastenmuster des Plan-Review-Orchestrators, Glocken-Event `glocke-open` für „Im Terminal öffnen", Mac-Stimmen statt TTS-Modell, vorhandenes whisper.cpp statt eigenem Build. Gestrichen/verworfen — eigene Paste-Kopie im `vorhaben-service` (nur ein Prüfbaustein wird geteilt), Vorlesen vom Bildschirm bei fehlendem Inhalt, Schalter in der Glocke, Änderung an `setup-ui.sh`. Feature-Preservation: FA-01…FA-30 bleiben vollständig abgedeckt (§8).

**Abgleich Mensch/Agent:** „In einfachen Worten", §9, §10, §12 gegen §2–§8 gelesen am 2026-09-27: Befund: §1 Kurzfassung nannte den Kontext-Hook ohne den Dateiweg aus D2 (nach externem Review geändert) — nachgezogen; sonst deckungsgleich (Rückfallstufe §11 = Mensch-Teil, Schwelle D2 = Mensch-Teil Punkt 2, Entscheidungen F5/F9/F12 in beiden Teilen).

### 13. Definition of Done

<!-- leser: agent -->

- [x] Jede FA/AK aus Abschnitt 8 hat einen grünen Test (EK-01/EK-03/AK-16 als Messung in §10 offen).
- [x] Alle Nachweise aus Abschnitt 5 ausgeführt und im PR zitiert (PR #95).
- [x] E2E-Pfad läuft (Abschnitt 8), Protokoll mit EK-02/EK-04 und FA-27-Nachweis im PR (`e2e-protokoll.md`).
- [ ] `verify` grün, Ausgabe im PR — und PR-Checks grün (CI ist die Wahrheit).
- [x] `docs/architecture.md`, `security.md`, `design.md`, `product-brief.md`, ADR-0006 angepasst.
- [x] Manuelle Schritte (Abschnitt 10) erledigt oder im PR als offen markiert.
- [x] Abweichungen von diesem Plan in Abschnitt 14 eingetragen.
- [x] 2x-Regel-Check: kein wiederholter Fehler, kein Vorschlag.
- [ ] Abschlussbericht nach R3, endet mit dem Block „Für das Board" (Karte, Spalte, PR-Link, Stand, Verweis auf `intent/INT-2026-025-agenten-anrufe/`); Nachziehen in eigener Sitzung.

### 14. Abweichungen bei der Umsetzung

<!-- leser: mensch -->

| Datum | Abweichung | Grund | Auswirkung auf Abschnitt |
|---|---|---|---|
| 2026-09-27 | Schritt 1 gemessen (2.1.283): Mehrfachauswahl mit eigener Antwort — Ziffer der Zeile „Type something" setzt nur den Haken, fokussiert **nicht**; Fokus per `Down` bis zur Zeile, dann Paste. Danach springt `Tab` auf die Zeile „Submit" der Frage (nicht zur nächsten Frage); `Enter` dort geht weiter (Prüfseite). Ohne eigene Antwort springt `Tab` direkt weiter. Eigene Antwort in einer Einzelfrage: `Enter` springt zur nächsten Frage. | D8 nahm „eigene Antwort → Ziffer fokussiert" für alle Fragen an | D8: Primitive je Art; Sender liest nach jeder Taste nach |
| 2026-09-27 | Umsetzung der Bausteine mit vollständiger Vorgabe im Plan (reine Module, Parser, Skripte, Aufräumen; danach Erkennung, Sender, Dienst, Frontend, Docs) durch parallele Subagenten im selben Worktree auf getrennten Dateien; Schnittstellen, Integration, Nachweise und Commits in der Hauptsitzung | Kontextdeckel ~200k: der Plan (8 Tage) passt nicht in eine Hauptsitzung | §7 bleibt Variante A (ein Branch, eine PR); nur die Ausführung ist verteilt |
| 2026-09-27 | `renderHookSettings(port, secret, opts)`: der Kontext-Hook wird nur mit `anrufKontextDir` gerendert (`anrufHookOptionen()`: darwin, ohne `SPECWRIGHT_ANRUF=off`); ohne Option bleibt die Datei byte-gleich | bestehende Tests und Cloud-Host unverändert | D2 |
| 2026-09-27 | `vorhaben-service-stage4.test.ts` lokal 3–5 rot, auch auf dem unveränderten Stand (vor dem Refactoring gemessen) — zeitabhängig, nicht in `known-failures.txt` | lokal nicht deterministisch | CI entscheidet (Schritt 3) |
| 2026-09-27 | `no_speech_prob` liefert whisper-server 1.9.1 bei `verbose_json`, aber 1 s Stille ergab „Vielen Dank." mit 4,3e-12 — als Stille-Schutz wirkungslos; Schutz bleiben Halluzinationsliste, RMS-/Dauer-Schwelle im Browser und Anzeige vor „Senden" | Messung | D3 |
| 2026-09-27 | Sender-Obergrenze Σ(Ziffern + 3 + Navigation) + 2; Navigation = Zahl der Möglichkeiten + 1, nur bei Mehrfachauswahl mit eigener Antwort (`Down` bis zur eigenen Zeile) | Messung Schritt 1 | D8 |
| 2026-09-27 | Zwischenbilder „Fokus auf Submit" und „nach Down" sind im Sender-Test nachgebaut, nicht als Fixture aufgenommen; Platzhalter `[Pasted text` gilt als angekommen (nicht gemessen); Fragen werden über den Fragetext zugeordnet (Kürzung mit „…" → Abbruch `anderer_dialog`, fail-closed) | Parser erkennt den aktiven Tab nur per Farbe | D8, R1 |
| 2026-09-27 | `check:adr` existiert im Repo nicht (nur in `build.md` genannt, Befund wie INT-2026-011/-020); ADR-0006 nach Aufbau von 0004/0005 geprüft | Werkzeug fehlt | §13 |
| 2026-09-27 | Auflegen ohne Senden: Meldung verlässt die Schlange (klingelt nicht erneut), bleibt in der Glocke, per „Anrufen" holbar | Spec FA-25 sagt nur „bleibt in der Glocke"; erneutes Klingeln derselben Meldung wäre lästig | D6 |
| 2026-09-27 | „nein"/„ja, aber …" in der Freigabe-Nachfrage bleibt clientseitig (Nachfrage wiederholen, AN-S10/Spec §4); der Backend-Zustand bleibt `freigabe_nachfrage`, Freigabe weiterhin nur nach eigener Anfrage desselben Besitzers für dieselbe Meldung (F6 erfüllt); keine Abbruch-Nachricht | minimales Protokoll | D6 |
| 2026-09-27 | Gespeicherter Hook-Inhalt verfällt, sobald er zu keinem wartenden Zustand passt (Rückfrage/Plan: nicht mehr blocked; fertig: Ereignis ohne `doneAt` außer `idle-*`); „fähig" = lokaler Client mit `mikrofon: ok` und `stimme: true`; beim Klingeln gehen nur Kopfdaten an alle Fenster, Text/Fragen erst an den Besitzer | Datensparsamkeit (FA-27), F15 | D1, D6, D9 |
| 2026-09-27 | Beim Einschalten öffnet der Browser das Mikrofon einmal kurz zur Rechte-Abfrage (nur wenn noch nie gefragt) und stoppt es sofort | Spec Ablauf A verlangt die Rechte-Abfrage beim Einschalten | D11, FA-19 |
| 2026-09-27 | Zusätzliche Dateien `ui/frontend/src/components/anruf/aos-anruf-schalter.ts` (Schalter als eigene Light-DOM-Komponente, testbar), `…/anruf/anruf-ton.ts` (reine Ton-Unterdrückung), `ui/tests/unit/anruf-fakes.ts`; Durchreichen von `blockKind` zusätzlich in `session-naming.ts`, `aos-cloud-terminal-sidebar.ts`, `aos-kopfzeile.ts` | Testbarkeit, bestehender Datenfluss | §4 #22–#25 |
| 2026-09-27 | Über den Mock hinaus: Knopf „Freigeben …" im Plan-Vorlesen (ohne Stimme), „Auflegen" auch in „bestätigen"/„erkennen", „Weiter" statt „Senden" vor der letzten Frage; Klingelton folgt nicht dem Stummschalter der Glocke (eigener Schalter) | Tastatur-Bedienbarkeit FA-29, AN-S12 | §8 UI-Abgleich mit Mock im E2E |
| 2026-09-27 | `PreToolUse ExitPlanMode` trägt den Plantext (`tool_input.plan`) → Stopp-Punkt D1 entfällt. Nach „Tell Claude what to change" kommt **kein** `PostToolUse`; der nächste `PreToolUse ExitPlanMode` folgt direkt | Messung | D5a (Wechsel innerhalb `blocked` ersetzt Inhalt) |
| 2026-09-27 | §5-Nachweise: `SprachErkennung` und `AnrufSender` erreichen `AnrufService` über Ports (`AnrufErkennungPort`, `AnrufSenderPort`), gebaut in `websocket.ts:160-166` — der grep auf die Klassennamen in `anruf-service.ts` ist leer, der Nachweis liegt in `websocket.ts`; `anruf-kontext` steht in `runtime-paths.ts:103` (`getAnrufKontextDir`), nicht in `claude-hooks.ts`; eine eigene `anruf-kontext.test.ts` gibt es nicht, die Fälle stehen in `claude-hooks.test.ts` und `anruf-service.test.ts` | Abhängigkeiten injiziert (testbar) | §5 |
| 2026-09-27 | E2E-Befund: Plan-Freigabe scheiterte bei 55 Spalten, weil Option 1 umbricht und nur die erste Zeile gelesen wurde (`unbekannte_freigabe`). Neu `planOptionVoll()` in `plan-dialog-state.ts` (additiv, `parsePlanDialog` unverändert), Sender nutzt sie für den Ja-Wortlaut; Fixture `plan-dialog-schmal.txt`, Tests in `anruf-sender.test.ts` und `plan-dialog-state.test.ts` | fail-closed griff zu Unrecht | D8, §4 #10/#31 |
| 2026-09-27 | E2E-Befund: Frage-Block zeigte Leerzeilen (`white-space: pre-line` + Template-Umbrüche) → Klasse `anruf-frage` mit `white-space: normal`; Nachfrage-Text nennt bei BYPASS PERMISSIONS die Folge wie im Mock | Mock-Abgleich | D11, §4 #20/#26 |
| 2026-09-27 | E2E mit Mac-Stimme `Anna` aus `say` statt echter Stimme (Mikrofon im Browser durch Tonstrom ersetzt); die Stimme `Flo` wurde auch direkt am `whisper-server` falsch erkannt und ist ungeeignet. EK-01/EK-03 mit Michaels Stimme bleibt §10 | kein Mensch in der Bausitzung | §8, §10 |
| 2026-09-27 | EK-04: Hinweis kam in jeder Runde an; Haiku schrieb die Sprechfassung in einem Lauf 10 von 12, im zweiten 1 von 11 (Caveman-Plugin aktiv), Opus 3 von 3 mit Ergebnis im Satz. Haiku-Sprechfassungen nennen oft nur die Tätigkeit („Primzahl genannt. Fertig.") | Anweisung sagt „was du getan hast" | R3; offene Frage im PR |
| 2026-09-27 | EK-02 in Headless-Chrome: `speak()` stets ≤ 184 ms nach Annahme, start-Ereignis in 2 von 8 Anrufen nicht gemeldet | Headless ohne Audioausgabe | §8, §10 |
| 2026-09-27 | `ANRUF_ANWEISUNG_AN` geschärft (Entscheidung Michael nach PR #95, „O1 ja"): Pflicht auch bei sehr kurzen Antworten und wenn die Eingabe eine knappe Antwort verlangt; zuerst das Ergebnis in einem ganzen Satz, dann was getan wurde, dann was gebraucht wird; Zahlen als Wörter. Messung Haiku danach: 14 von 14 mit Sprechfassung, 7–17 Wörter, Ergebnis vorn, auch bei „antworte nur mit …" (vorher 10/12 bzw. 1/11) | EK-04, R3 | D2 (Text in §3 bleibt als Stand der Freigabe) |
