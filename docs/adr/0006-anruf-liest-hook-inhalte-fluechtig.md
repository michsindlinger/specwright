# ADR-0006: Der Anruf liest Hook-Inhalte, nur im Speicher und nur bei Anrufmodus an

> Status: Angenommen — ergänzt ADR-0004
> Datum: 2026-09-27
> Betrifft: Web-UI (`ui/src/server/services/claude-hooks.ts`, `anruf-service.ts`, `anruf-zustand.ts`, `anruf-warteschlange.ts`, `anruf-sender.ts`, `sprach-erkennung.ts`, `ui/src/server/routes/cloud-terminal.routes.ts`, `ui/src/server/utils/lokal-verbindung.ts`, `ui/src/shared/types/anruf.protocol.ts`, `ui/frontend/src/components/anruf/aos-anruf.ts`), Vorhaben INT-2026-025
> Umgesetzt in: Branch `feat/INT-2026-025-agenten-anrufe` (PR offen)

---

## Kontext

ADR-0004 (INT-2026-011) hat entschieden, dass die UI die Claude-Sitzung zeigt und nicht nachliest: Die Hook-Route liefert nur Status, Blockart und Kontext, der Hook-Text wird auf eine Vorschau von 160 Zeichen gekürzt (`PREVIEW_MAX_CHARS`), von einer Rückfrage bleibt nur die erste Frage, von einer Plan-Vorlage ein fester Text. Einen Transkript-Leser gibt es nicht.

INT-2026-025 führt einen Anrufmodus ein: Stellt eine Sitzung eine Rückfrage, legt einen Plan vor oder wird fertig, klingelt die UI, liest nach dem Annehmen eine kurze Fassung vor und nimmt eine gesprochene Antwort entgegen. Dafür braucht die UI genau den Inhalt, den ADR-0004 verwirft: die letzte Antwort des Agenten mit ihrem Absatz „Sprechfassung:", alle Fragen einer Rückfrage mit ihren Möglichkeiten und den Plantext. Claude Code schickt diesen Inhalt mit den Hooks bereits mit. Die Aufnahme echter Payloads von Claude Code 2.1.283 zeigt, dass `PreToolUse ExitPlanMode` den Plantext enthält (`tool_input.plan`) und nicht nur einen Pfad (`plan.md` §14).

Zwei weitere Punkte sind neu: Der Agent muss lernen, die Sprechfassung zu schreiben, und Sprache wird erkannt und vorgelesen. Die Absicht verlangt, dass dabei nichts den Mac verlässt und weder Audio noch erkannter Text auf der Platte landet (AK-16, AK-17). Datenhaltung verlangt hier ein ADR (`CLAUDE.md`, ADR-Pflicht bei Datenhaltung).

---

## Entscheidung

**Hook-Inhalt nur bei Anrufmodus an, nur im Speicher.** `extractAnrufInhalt(body)` in `claude-hooks.ts` liest je Ereignis: `Stop` die letzte Antwort (höchstens 20 000 Zeichen), `AskUserQuestion` alle Fragen mit Möglichkeiten (höchstens 4 Fragen mit je 6 Möglichkeiten, je 500 Zeichen), `ExitPlanMode` den Plantext (höchstens 50 000 Zeichen). `mapHookPayload` und die Vorschau von 160 Zeichen bleiben unverändert. Die Route reicht den Body an `anruf.hookInhalt` weiter, und zwar nach `reportHookContext` und vor `reportAgentEvent`, weil `applyAgentEvent` die Meldung synchron auslöst. Ist der Anrufmodus aus, verwirft der Dienst den Inhalt sofort. Ist er an, hält `AnrufService` genau eine Map `sessionId → Inhalt` im Arbeitsspeicher, bis die Meldung erledigt ist (Antwort in der Sitzung, Sitzung geschlossen) oder der Modus ausgeschaltet wird. Der Inhalt geht nicht in die Registry, nicht in `vorhaben-<port>.json`, nicht in ein Protokoll und nicht per Broadcast an alle Clients; `anruf:state` geht nur an lokale Clients (siehe unten). Nach einem Backend-Neustart ist der Inhalt weg, der Anruf sagt dann „keine Sprechfassung".

**Kein Transkript-Leser, kein Dateileser.** Die Regel aus ADR-0004 gilt weiter. Der Anruf liest ausschließlich den Body des Hooks, den Claude Code ohnehin an die Route schickt; der Transkriptpfad bleibt gespeichert und ungelesen.

**Sprechfassung über einen synchronen `UserPromptSubmit`-Hook, der nur lokale Dateien liest.** Der bestehende `UserPromptSubmit`-Hook ist `async`, damit kein Netzweg auf dem Tipp-Pfad liegt. Der neue, synchrone Eintrag (`timeout: 1`) ruft deshalb kein Backend auf. Er liest nur Dateien, die das Backend vorher unter `<runtime>/anruf-kontext-<port>/` schreibt (Ordner `0700`, Dateien `0600`): `an.json` mit der festen Anweisung `ANRUF_ANWEISUNG_AN`, solange der Modus an ist, und je Sitzung einmalig `aus-<sessionId>.json` mit `ANRUF_ANWEISUNG_AUS` nach dem Ausschalten, die der Hook nach dem Lesen löscht. Die Dateien enthalten nur diese festen Texte, keine Projektinhalte. Der Eintrag wird nur auf macOS gerendert. Die Umgebungsvariable `SPECWRIGHT_ANRUF=off` schaltet ab: dann wird weder der Eintrag gerendert noch der Dienst gestartet, der Schalter zeigt „nicht verfügbar: abgeschaltet". Die Schwelle für den Hook liegt bei p95 ≤ 20 ms und höchstens 100 ms über 100 Eingaben; wird sie verfehlt, wird abgeschaltet und nachgefragt. In die `CLAUDE.md` eines Projekts schreibt die UI nichts.

**Spracherkennung lokal mit whisper.cpp.** Das Backend startet `whisper-server` (whisper.cpp, Homebrew, MIT-Lizenz) als Kindprozess, solange der Anrufmodus an ist: nur auf `127.0.0.1` an einem freien Port, mit dem Modell `ggml-large-v3-turbo-q5_0.bin` (574 041 195 Bytes, MIT-Lizenz, Quelle Hugging Face `ggerganov/whisper.cpp`, SHA-256 fest im Einrichtungsskript `ui/scripts/sprache-einrichten.sh`), abgelegt unter `~/.specwright/sprache/`, außerhalb des Repos. Der Prozess läuft mit `stdio: 'ignore'` und mit `cwd` und `TMPDIR` in einem leeren `0700`-Ordner unter dem Laufzeitordner. Die Aufnahme kommt als PCM im Speicher an, das Backend baut den WAV-Kopf im Speicher und schickt ihn per `fetch` an den lokalen Server; es entsteht keine Audiodatei. Eine PID-Datei `<runtime>/whisper-server-<port>.pid` erlaubt, einen nach einem Absturz liegengebliebenen Prozess beim nächsten Start zu beenden.

**Vorlesen im Browser mit lokaler Mac-Stimme.** Das Frontend nutzt `speechSynthesis` und wählt nur eine deutsche Stimme mit `localService === true` (bevorzugt „Anna"). Gibt es keine, ist der Anrufmodus nicht verfügbar. Das Frontend liest Satz für Satz vor, weil Chrome lange Texte sonst abbricht.

**Nur der lokale Browser am Mac.** Eine Verbindung darf den Anruf nur bedienen, wenn sie von einer Loopback-Adresse kommt, `Host` und `Origin` auf `localhost`, `127.0.0.1` oder `[::1]` mit dem Backend-Port (im Dev zusätzlich Port 5173) zeigen, kein `x-forwarded-for` oder `tailscale-user-login` gesetzt ist und das Backend auf macOS läuft. Die Origin-Prüfung ist eine zusätzliche Schicht gegen fremde Webseiten im selben Browser. Gegen Browser-Erweiterungen schützt sie nicht (`security.md` §2).

**Antworten nach AR-08.** Die Tastenfolgen für Rückfrage und Plan-Dialog entstehen neu in `anruf-sender.ts`: ein `withMachineWrite` je Vorgang, nach jeder Taste nachlesen, feste Obergrenze, Abbruch statt Esc. Eine Plan-Freigabe nimmt das Backend nur an, wenn derselbe Client vorher die Nachfrage angefordert hat (`anruf:freigeben.anfragen`).

---

## Konsequenzen

- ADR-0004 bleibt gültig: kein Transkript-Leser, die Sitzung wird im Terminal gezeigt. Die einzige Ausnahme ist dieser Zweck, begrenzt auf die Zeit mit Anrufmodus an und auf den Arbeitsspeicher.
- Mit Anrufmodus aus verhält sich die UI wie vor INT-2026-025: kein Inhalt im Speicher, keine Kontext-Datei, kein `whisper-server`.
- Sitzungen, die vor dem Update gestartet wurden, kennen den Kontext-Hook nicht, weil Claude Code seine Hooks beim Start liest. Sie klingeln, bringen aber keine Sprechfassung mit, bis sie neu gestartet sind; der Anruf liest dann die ersten zwei Sätze der Antwort vor.
- Der Agent schreibt die Sprechfassung in seine Antwort. Sie steht damit auch im Terminal und im Gesprächsverlauf von Claude Code, also außerhalb der UI; das ist gewollt (FA-30).
- `whisper-server` belegt rund 0,8 GB Arbeitsspeicher, solange der Modus an ist. Auf dem Cloud-Host und am Handy ist der Anrufmodus nicht verfügbar; die Glocke arbeitet dort wie bisher.
- Ein neues Feld mit Inhalt aus Hooks, das auf die Platte soll, braucht ein neues ADR.

---

## Alternativen

| Alternative | Warum nicht |
|---|---|
| Sprechfassung und Fragen aus der Transkriptdatei lesen | ADR-0004 „kein Transkript-Leser"; der Hook-Body enthält den Inhalt bereits |
| Hook-Inhalt immer aufheben, auch bei Anrufmodus aus | Projektinhalte im Speicher ohne Zweck (FA-02) |
| Inhalt in der Registry neben der Marke „fertig" speichern | Projektinhalt auf der Platte (FA-27); nach einem Neustart genügt der Rückfall auf zwei Sätze |
| Synchroner Kontext-Hook ruft das Backend per HTTP | Netzweg auf dem Tipp-Pfad; ein hängendes Backend würde jede Eingabe verzögern (externer Review, Blocker) |
| Anweisung per `--append-system-prompt` beim Start | nicht schaltbar, wirkt nur in neuen Sitzungen (FA-02, AN-S04) |
| Anweisung in der Projekt-`CLAUDE.md` | schreibt ins Projekt und wirkt auch ohne UI (AR-01, AR-06) |
| Ein drittes Modell kürzt die Antwort | die Sprechfassung schreibt der Agent selbst (B-04, FA-30) |
| Web Speech API `SpeechRecognition` im Browser | Chrome schickt das Audio an Google (AK-16) |
| `whisper-cli` je Anfrage mit Temp-Datei | Audio auf der Platte (AK-17), Ladezeit des Modells bei jedem Satz |
| Whisper im Browser (WASM, transformers.js) | Modell-Download im Browser zur Laufzeit, langsamer, Speicher je Tab |
| macOS `SFSpeechRecognizer` über einen Swift-Helfer | Binärteil zum Kompilieren, eigene Rechte-Dialoge, kein Lieferweg |
| Sprachausgabe per `say -o` im Backend | Datei auf der Platte; der Browser nutzt dieselben Mac-Stimmen |
| Piper oder ein anderes TTS-Modell | zusätzlicher Download und Prozess ohne Vorteil gegenüber den Mac-Stimmen |
| Modell large-v3 (3,1 GB) | gemessen ungenauer (7,8 % statt 4,7 % Wortfehler) bei 4,5-fachem Speicher |
| Antworten über `vorhaben-service.sendTextToSession` | legt einen Protokolleintrag mit dem Text auf der Platte an (AK-17), nur für Vorhaben-Sitzungen, lehnt `blocked` ab |
| Warteschlange im Browser | AR-05; mehrere Fenster würden unabhängig klingeln |

---

## Belege

- Absicht `intent/INT-2026-025-agenten-anrufe/intent.md` (AK-16, AK-17, ER-02, RB-02, RB-03).
- Spec `intent/INT-2026-025-agenten-anrufe/spec.md` §5 (Daten, fachlich), §7 (Bedenken zu ADR-0004, Registry, Protokoll, AR-08).
- Plan `intent/INT-2026-025-agenten-anrufe/plan.md` §2 (Messungen 27.09.: Modelle, Tastenprotokoll, synchroner Hook), §3 D1–D3, D9, D10, verworfene Alternativen, §12 (F1, F10, E1, E8), §14 (Plantext im Hook).
- Fixtures: `ui/tests/fixtures/hooks/2.1.283/`, `ui/tests/fixtures/tui/2.1.283/`.
- `docs/architecture.md` §2, §3, §5; `docs/security.md` §1–§4.
