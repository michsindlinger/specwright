# Plan: Neue Sitzung von außen starten (Eingang für hey)

> **Intent:** `intent.md` (INT-2026-030, Version 1.1.0) · **Spec:** `spec.md` (freigegeben 2026-10-02)
> **Status:** umgesetzt
> **Erstellt:** 2026-10-02 im Plan Mode · **Freigabe:** Product Owner (Michael Sindlinger), 2026-10-02
> **Pflichtinput gelesen:** `docs/architecture.md` (Stand 5990730), `CLAUDE.md`, `docs/security.md`

## In einfachen Worten

<!-- leser: mensch -->

**Worum geht es?** Dein Sprachhelfer hey soll einen Satz wie „Kreis Lippe, schau dir die fehlschlagenden Tests an" an die Specwright-Oberfläche auf deinem Mac weitergeben können. Die Oberfläche startet daraufhin eine frische Claude-Sitzung im richtigen Projekt, und der Satz ist das Erste, was Claude zu lesen bekommt. Heute geht das nur, wenn du selbst in der Oberfläche auf „Neue Sitzung" klickst und tippst. Laufende Sitzungen bleiben dabei unberührt: Jeder Auftrag von außen bekommt seine eigene, neue Sitzung.

**Was ändert sich?** Für dich: In jedem offenen Browserfenster mit der Oberfläche taucht beim Projekt ein neuer Reiter auf, beschriftet mit den ersten Wörtern des Satzes (oder dem Titel, den hey mitschickt). Du wirst nicht aus dem gerissen, was du gerade tust: Kein Reiter springt um, kein Eingabefeld verliert den Cursor. War das Projekt nicht offen, steht es danach in deiner Projektleiste, ohne dass die Oberfläche dorthin wechselt. Für hey: Es bekommt sofort eine Zusage mit einer Sitzungsnummer („angelegt, startet") oder eine Absage mit Grund, und kann danach nachfragen, ob der Satz in der Sitzung wirklich angekommen ist. Der ganze Eingang ist ausgeschaltet, bis du ihn mit einer Einstellung beim Start der Oberfläche einschaltest.

**Wie wird das gemacht?** Man kann sich den Eingang wie einen Briefschlitz in der Haustür vorstellen, der nur nach innen offen ist und nur Briefe mit dem richtigen Siegel annimmt. Fünf Prüfungen laufen der Reihe nach: Ist der Eingang eingeschaltet und läuft die Oberfläche auf dem Mac? Kommt die Anfrage von diesem Mac selbst und nicht über einen Umweg wie Tailscale oder einen Tunnel (solche Umwege hinterlassen Spuren in der Anfrage, die wir erkennen)? Spricht die Anfrage die Oberfläche unter ihrem lokalen Namen an? Kommt sie nicht aus einem Browser (ein Browser schickt immer eine Absenderseite mit, ein Programm wie hey nicht)? Und stimmt das Geheimnis, ein langer Zufallscode, den die Oberfläche beim ersten Start in eine Datei schreibt, die nur dein Benutzer lesen darf? Fehlt eine dieser Bedingungen, lautet die Antwort immer gleich „nicht berechtigt" — so verrät sie nicht, welche Prüfung gescheitert ist.

Danach prüft die Oberfläche den Inhalt: Der Satz wird von Steuerzeichen gereinigt (Zeilenumbrüche werden Leerzeichen), darf nicht leer, nicht länger als 500 Zeichen sein und nicht mit „/" beginnen (sonst wäre es ein Claude-Befehl wie „/clear"). Das Projekt muss eines sein, das die Oberfläche kennt — offen oder unter „zuletzt geöffnet". Und es dürfen nicht schon drei Sitzungen von außen offen sein oder in der letzten Minute fünf gestartet worden sein. Außerdem muss der Rückmeldeweg der Sitzungen bereit sein; kurz nach dem Start der Oberfläche ist er das manchmal noch nicht, dann sagt sie sofort ab, statt hey eine Minute warten zu lassen.

Dann legt die Oberfläche eine eigene Arbeitskopie des Projekts an (eine zweite Ordnerkopie mit eigenem Zweig, genau so wie heute beim Start einer neuen Absicht) und startet darin Claude mit dem Modell Opus und denselben Einstellungen wie ein Start aus der Oberfläche — also auch mit Vollzugriff, wie du es entschieden hast. Der Satz wird so übergeben, dass Claude ihn nie als Startschalter missversteht, selbst wenn er mit einem Bindestrich beginnt.

Ob der Satz angekommen ist, erfährt die Oberfläche über dieselbe Rückmeldung, mit der Claude heute schon jeden eingereichten Prompt meldet. Stimmt der gemeldete Text Zeichen für Zeichen mit dem Satz überein, heißt der Zustand „aktiv". Kommt nach 60 Sekunden nichts, ein anderer Text oder endet die Sitzung vorher, heißt er „Fehler" mit Grund. Diesen Zustand merkt sich die Oberfläche 24 Stunden lang in einer kleinen Datei, damit er auch einen Neustart übersteht. Den Satz selbst speichert sie dort nicht, nur einen Fingerabdruck davon zum Vergleichen.

Jede Anfrage, auch jede abgewiesene, landet in einem Protokoll mit Zeit, Projekt, Absenderadresse und Ergebnis. Den Satz schreibt sie nur bei berechtigten Anfragen hinein. Das Protokoll ist nur für dich lesbar, Einträge älter als 30 Tage verschwinden beim nächsten Start, und es wächst nie über 10 MB.

Im Browser ändert sich fast nichts, weil die Oberfläche Sitzungen, die woanders entstanden sind, schon heute ohne Fokuswechsel als Reiter übernimmt. Eine einzige Stelle korrigieren wir: Ein Browserfenster, in dem gerade gar kein Projekt offen ist, würde das neu geöffnete Projekt bisher automatisch zum aktiven machen. Das verbietet die Spec; künftig bleibt es dort offen, aber nicht aktiv.

**Was kann schiefgehen?** Erstens, das größte bewusst angenommene Risiko: Ein falsch erkannter Satz wird von Claude mit Vollzugriff ausgeführt, ohne Rückfrage. Abgefedert ist das durch die eigene Arbeitskopie (dein Hauptordner bleibt unberührt), das Geheimnis und die Obergrenzen. Zweitens: Der Probelauf am 2026-10-02 hat gezeigt, dass Claude den Satz hinter dem Trennzeichen in allen sieben Fällen Zeichen für Zeichen zurückmeldet — auch mit Bindestrich am Anfang, mit „--model haiku" im Satz, mit Anführungszeichen, Shell-Zeichen, Umlauten, Emoji und 500 Zeichen. Claude lief jedes Mal mit Opus, die Rückmeldung kam nach rund 2 Sekunden. Drittens, neu gefunden: Claude fragt „Vertraust du diesem Ordner?", wenn das Projekt selbst noch nie in Claude als vertraut bestätigt wurde. Die Arbeitskopie erbt das Vertrauen vom Projekt. Bei allen 114 bisherigen Arbeitskopien deiner Projekte war das so, und im Probelauf erschien der Dialog genau so lange, bis das Testprojekt einmal bestätigt war. Für ein ganz neues, nie mit Claude geöffnetes Projekt bleibt die Sitzung also am Dialog stehen. Dann meldet die Oberfläche hey nach 60 Sekunden „Fehler: Vertrauensdialog offen" statt nur „Zeitüberschreitung". Der Reiter bleibt; du bestätigst einmal mit Pfeil runter und Enter (Enter allein beendet die Sitzung). Wenn etwas schiefläuft: Einstellung entfernen und Oberfläche neu starten, dann ist der Eingang zu. Den Code zurückzunehmen ist ein normaler Revert.

**Was musst du entscheiden?** Deine drei Zusagen vom 2026-10-02 sind eingetragen: kein automatisches Aktivieren in einem leeren Fenster, der Probelauf, die drei Auslegungen. Neu ist nur der genauere Fehlergrund beim Vertrauensdialog (siehe oben). Vorschlag: so übernehmen; die Oberfläche liest dafür nur den Bildschirm und tippt nichts. Sonst reicht die Freigabe.

## Details

<!-- leser: mensch -->

### 1. Kurzfassung

<!-- leser: mensch -->

Neuer HTTP-Eingang `POST /api/eingang/sitzung` und `GET /api/eingang/sitzung/:sessionId` im UI-Backend, abgesichert durch Abschalter, Lokal-Prüfung für Programme (Loopback, Host, keine Weiterleitungs-Header, kein `Origin`, macOS) und ein Geheimnis aus `<runtime>/eingang-<port>.token`. Ein neuer `EingangService` prüft Satz, Projekt, Opus und Obergrenzen, legt über den bestehenden Startpfad (`createSession` mit `new-worktree`, explizit) eine Sitzung in eigener Arbeitskopie an, öffnet das Projekt im gemeinsamen Arbeitsbereich, setzt den Tab-Namen und verfolgt Stufe 2 über das bestehende Event `session.prompt-text`; Zustand in `<runtime>/eingang-<port>.json`, Protokoll in `<runtime>/eingang-<port>.jsonl`. Im Frontend nur ein Fix der Auto-Aktivierung; dazu ADR-0007 und Nachträge in `security.md`, `architecture.md`, `product-brief.md`.

### 2. Ausgangslage im Code

<!-- leser: agent -->

| Bereich | Heute (Datei:Zeile) | Bedeutung für dieses Vorhaben |
|---|---|---|
| Sitzungsstart | `ui/src/server/services/cloud-terminal-manager.ts:707-717` `createSession(projectPath, type, modelConfig, cols, rows, initialPrompt, extraCliArgs, extraEnv, options)`; wartet auf `restoreReady` (:720) | wiederverwendbar; einziger Startpfad (RB-05) |
| Argumente | `cloud-terminal-manager.ts:933-971`: Provider-Flags aus `model-config.json`, dann `extraCliArgs`, dann `--settings <hooks>`, dann `initialPrompt` als **letztes Argument ohne `--`** | **Falle** F1: Satz mit „-" vorn würde als Schalter gelesen (FA-20) → neue Option `promptNachTrenner` |
| Quoting | tmux-Pfad: Run-Script mit `sq()` je Token (`tmux-session-backend.ts:66-95`); Direktpfad: argv-Array | Satz ist shell-sicher, kein eigenes Quoting nötig [Certain] |
| Rechte | `--dangerously-skip-permissions` nur aus `cliFlags` des Providers `anthropic` (`ui/config/model-config.json`), substituiert in `getProviderCommand` (`ui/src/server/model-config.ts:217-236`) | Start mit `{ provider: 'anthropic', model: 'opus' }` = UI-Start mit Auswahl Opus (FA-02) |
| Falle Modell | `getCliCommandForModel` (`model-config.ts:667-689`) fällt bei unbekanntem Modell auf `claude --model <id>` ohne Provider-Flags zurück | nie diesen Pfad nehmen; vorher `getModel('anthropic','opus')` (`model-config.ts:152`) prüfen → FA-23 |
| UI-Start | `ui/src/server/websocket.ts:2349-2432` `handleCloudTerminalCreate`: `createSession(projectPath, type, modelConfig, cols, rows, undefined, undefined, undefined, { sessionTarget })`, keine Zusatzschalter | Referenz für den Gleichheitstest AK-06 |
| Absicht-Start, 3 Schichten | `ui/src/server/services/vorhaben-handler.ts:241-249` (Form) · `vorhaben-service.ts:857-875` (Voraussetzung: `worktreesOf`, `worktreeEnabled(resolveMainPath(...))` → `WORKTREE_UNAVAILABLE`) · `cloud-terminal-manager.ts:802-869` (letzte Sperre) · Mapping `START_FAILED` „Keine Arbeitskopie möglich: …" (`vorhaben-service.ts:899-902`) | Voraussetzungsprüfung als öffentliche Methode herauslösen, damit FA-13-Texte gleich sind (Spec §7) |
| Arbeitskopie | `ui/src/server/utils/cloud-session-worktree.ts:221-284` unter `withMainProjectLock`, Rückbau bei Fehler; Name `session-<sessionId>`, Zweig `session/<sessionId>` | AR-03/RB-06 erfüllt ohne eigenen Lock [Certain] |
| Aufräumen beim Schließen | `cloud-terminal-manager.ts:1178-1231` `disposeSessionWorktree` → sauber entfernen, schmutzig behalten | Ablauf E / FA-22 ohne Änderung [Certain] |
| Rückbau nach Spawn-Fehler | `cloud-terminal-manager.ts:1049-1075`: `catch` räumt tmux-Reste, Registry-Eintrag und die in diesem Aufruf angelegte Arbeitskopie (`session.worktreeCleanup`) ab, übergibt nur an eine schon angehängte Nachfolge-Sitzung | F2 geklärt [Certain]: FA-13 „halb angelegte Kopie entfernen" ohne neuen Code; Test mit Fake-Manager prüft nur, dass der Service den Fehler als Absage meldet |
| Hook bereit | `cloud-terminal-manager.ts:345-346,371,414,957-958`: `getHookSecret()` ist genau dann gesetzt, wenn `hookSettingsPath` gesetzt ist, und nur dann geht `--settings` an die Sitzung | Bereitschaftsprüfung D7 nutzt dieselbe Bedingung wie der Start [Certain] |
| Prompt-Rückmeldung | `ui/src/server/routes/cloud-terminal.routes.ts:104-106` → `manager.reportPromptText` → Event `session.prompt-text (sessionId, prompt)` (`cloud-terminal-manager.ts:445-450`); kein Log, kein Broadcast | Stufe 2 hängt sich als zweiter Listener an (wie `vorhaben-service.ts:1096`) |
| Sitzungsende | einziges Signal `session.closed (sessionId, exitCode?, closedBy?)` (`cloud-terminal-manager.ts:1332`, `:1703`); während Stillstand nur `guards.sessionEnded` beim Boot-Reap | nach Restore: Abgleich gegen `getSession(id)` |
| Restore | `cloud-terminal-manager.ts:390-392` öffentlicher Zugriff auf `restoreReady` | Zustandsabgleich erst danach |
| Lokal-Prüfung | `ui/src/server/utils/lokal-verbindung.ts:49-69` `istLokalerBrowser` (macOS, Loopback, keine Weiterleitungs-Header, Host, **Origin Pflicht**) | Schritte 1–4 herauslösen als `istLokaleVerbindung`; Programm-Prüfung = diese plus „kein `Origin`" |
| Geheimnis-Vergleich | `cloud-terminal.routes.ts:30-37` `tokenMatches` (timingSafeEqual, feste Länge) | wiederverwenden; Länge ist fest (64 Hex) |
| 0600-Dateien | `ui/src/server/services/claude-hooks.ts:168-169` (Hook-Secret: `mkdirSync 0700`, `writeFileSync 0600`) | Muster für Token-Datei |
| Laufzeitordner | `ui/src/server/utils/runtime-paths.ts:29-36` `getRuntimeDir()`, `backendPort()`; gitignored (`ui/.gitignore:30`) | Ablage für Token, Zustand, Protokoll |
| Aufräumen beim Start | `ui/src/server/utils/paste-image.ts:100-125` `pruneOldImages`, Aufruf `websocket.ts:207` | Muster für 30-Tage-Protokoll |
| Body-Parser | `ui/src/server/index.ts:32` global `express.json({ limit: '30mb' })` vor allen Routen | Eingang **vor** Zeile 32 mit eigenem `express.json({ limit: '8kb' })` montieren |
| Router-Muster | `index.ts:40` lazy Factory (`() => wsHandler?.…`) | gleiches Muster für `createEingangRouter` |
| Kein CORS | `index.ts` ohne `cors` [Certain] | Browser-POST mit JSON braucht Preflight, der scheitert; zusätzliche Schicht |
| Arbeitsbereich | `ui/src/server/services/workspace-state.ts:121-130` `openProject(path, name)` (idempotent, aktiviert nicht — es gibt serverseitig kein aktives Projekt); Broadcast nur über `workspace-handler.ts:40,54-79`; `setSessionName` `workspace-handler.ts:133-137` | neue Methode `WorkspaceHandler.openProjectFromBackend` (Store + Broadcast); Rescan wie `websocket.ts:413-415` |
| Bekannte Projekte | `workspaceStore.getState().openProjects` / `.recentProjects` (`workspace.protocol.ts:16-43`), `pathKey` | Liste für B-02/AN-S07 |
| Frontend: fremde Sitzung | `ui/frontend/src/app.ts:1698-1715` übernimmt `cloud-terminal:created` nur bei offenem Projekt, ändert nie `activeProjectId`, wählt den Tab nur, wenn keiner gewählt ist | FA-08/FA-09 schon erfüllt [Certain]; exakter Pfadvergleich → Sitzung muss mit dem gespeicherten `path` des Projekts starten |
| Frontend: späte Clients | `app.ts:1475-1480` `cloud-terminal:list` je neuem Projektpfad; `websocket.ts:2143-2160` generischer `created`-Broadcast für nicht-WS-Sitzungen | FA-08 „später verbinden" ohne Änderung [Certain] |
| Frontend: Auto-Aktivierung | `app.ts:1441-1445`: ohne aktives Projekt fällt die Wahl auf `projects[0]` und `activateProject` läuft | **Falle** F3: verletzt FA-10 in einem Client ohne offenes Projekt → Fix |
| Frontend: Hinzufügen | `app.ts:1129-1140` `_handleWorkspaceAck` aktiviert selbst | Fix in F3 bricht das manuelle Hinzufügen nicht [Likely] |
| Tests | Route-Muster ohne supertest: `ui/tests/unit/cloud-terminal-routes.test.ts:11-35` (`fakeReq`, `fakeRes`, `router.stack`); `lokal-verbindung.test.ts`, `workspace-handler.test.ts`, `app-terminal-dock.test.ts:281` | Vorlagen für neue Tests; `cloud-terminal-routes.test.ts` steht in `ui/tests/known-failures.txt` → neue Tests in eigene Dateien |
| Rate-Limit, Datei-Log | nichts vorhanden [Certain] | neu, klein, im Service |
| Vertrauensdialog | nur Erkennung `dialog-driver.ts:34,42` (`TRUST_CUE`), kein Vorab-Eintrag; `readScreen` öffentlich (`cloud-terminal-manager.ts:1818`) | F4 [Certain] aus Probelauf A1 und `~/.claude.json` (nur Pfade gelesen): Eine Arbeitskopie erbt das Vertrauen vom Hauptrepo — 114/114 Sitzungs-Kopien ohne eigenes Vertrauen, Hauptrepo jeweils vertraut; Scratch-Kopie zeigte den Dialog, nach Bestätigung des Hauptrepos nicht mehr. AN-02 gilt nur für vertraute Projekte → D12 |
| Probelauf A1 (2026-10-02, Claude Code 2.1.287) | Scratch-Repo, je Fall frische `git worktree add`-Kopie, Start wie Run-Script mit `--`, Hook schreibt `.prompt` | P1–P7: kein Dialog, byte-gleich (`cmp`), Opus, 1,6–2,2 s — AN-01 bestätigt, `--` trägt (P2, P3) [Certain] |

### 3. Entwurf

<!-- leser: agent -->

#### Ansatz

<!-- leser: agent -->

**D1 — Schnittstelle (OF-01/AN-S01).** HTTP auf dem Backend-Port, montiert vor dem globalen Body-Parser:

- Router-Aufbau: zuerst die Berechtigung (D2) als Middleware, **danach** `express.json({ limit: '8kb' })` je Route; Parser-Fehler (413, kaputtes JSON) fängt ein Fehler-Handler des Routers → `400 'Anfrage ungültig'` mit Protokollzeile. So werden Unberechtigte nie geparst und auch Parser-Fehler protokolliert (FA-17).
- `POST /api/eingang/sitzung`, Header `x-specwright-eingang-token`, Body JSON `{ projekt: string, satz: string, titel?: string }`, Body-Limit 8 KB, nur `application/json`. Antworten: `201 { zustand: 'startet', sessionId, projekt: <Name> }`; `403 { fehler: 'nicht berechtigt' }` (aus, unberechtigt — immer derselbe Text); `400` Satz/Titel ungültig mit Grund; `404 'Projekt unbekannt'`; `409 'Keine Arbeitskopie möglich: …'` und `'Modell Opus nicht verfügbar'`; `429 'schon 3 offene Sitzungen von außen'` bzw. `'zu viele Anfragen (5 je Minute)'`; `503 'Backend startet noch'`, solange der Service nicht steht.
- `GET /api/eingang/sitzung/:sessionId`, gleicher Header und gleiche Prüfungen (FA-07); `200 { zustand: 'startet'|'aktiv'|'fehler'|'unbekannt', grund? }`. Ungültige ID-Form → `unbekannt`.
- Antwortklasse intern; nie ein Host-Pfad, nur Projektname (security §6 Zeile 1).

**D2 — Berechtigung (B-01, FA-12, FA-19).** Reihenfolge, jede Verletzung → 403 gleicher Text, Protokoll ohne Satz:
1. `process.env.SPECWRIGHT_EINGANG === 'on'` und `process.platform === 'darwin'` (AN-S11).
2. `istLokaleVerbindung(req, { port })` — neu herausgelöst aus `istLokalerBrowser`: Loopback-Adresse, keine Weiterleitungs-Header, `Host` = Loopback-Host mit Port.
3. Kein `Origin`-Header (zusätzliche Schicht, strenger als B-01, ER-09 verbietet nur Lockern): Browser senden bei Cross-Origin-POST immer `Origin`.
4. `tokenMatches(header, token)`; Token fehlt im Speicher → 403.

`istLokalerBrowser` ruft danach `istLokaleVerbindung` plus Origin-Prüfung; Verhalten unverändert (bestehender Test bleibt grün).

**D3 — Geheimnis (OF-02/AN-S02).** Beim Bau des Service, nur wenn D2-Schritt 1 erfüllt: `<runtime>/eingang-<port>.token` lesen; fehlt oder leer → `randomBytes(32).toString('hex')` schreiben (Ordner 0700, Datei 0600, Muster `claude-hooks.ts:168`). Pfad (nicht Inhalt) einmal ins Startlog. Nie in Antwort, Log, Broadcast.

**D4 — Satz und Titel (B-03, B-09, AN-S05, AN-S06, AN-S12).** Reine Funktionen in `ui/src/server/services/eingang-regeln.ts`:
- `bereinigeSatz(raw)`: ANSI-/OSC-/sonstige ESC-Sequenzen entfernen; `\r\n`, `\r`, `\n`, `\t` → ein Leerzeichen; übrige C0/C1/DEL entfernen; trimmen. Ungültig, wenn leer, > 500 Codepoints oder beginnt mit `/`.
- `bildeTitel(satz, titel?)`: mit Titel → gleich bereinigt, 1–40 Codepoints sonst ungültig; ohne → Wörter des Satzes bis höchstens 39 Codepoints an Wortgrenze + „…", wenn gekürzt (Gesamt ≤ 40); ein einzelnes Wort > 39 wird hart geschnitten + „…".
- `satzHash(satz)`: SHA-256 hex.

**D5 — Projekt (B-02, AN-S07).** `realpath` des Antragspfads (Fehler → unbekannt), abschließende Schrägstriche weg. Kandidaten = `openProjects` ∪ `recentProjects`, je `realpath`; Treffer nur, wenn `resolveMainWorktreePath(real) === real` (Pfad einer Arbeitskopie → unbekannt). Die Sitzung startet mit dem **gespeicherten** `path` des Projekts (exakter Pfadvergleich im Frontend, `app.ts:1704`). Nur in Recents → `WorkspaceHandler.openProjectFromBackend(path, name)` (Store `openProject` + `workspace:state`-Broadcast) und `vorhabenService.scheduleRescan()`.

**D6 — Obergrenzen (B-08, AK-09).** Im Speicher des Service, synchron vor dem ersten `await` reserviert (Node ist einthreadig, kein Lock nötig): offen = Einträge ohne `closedAt` + laufende Reservierungen; ≥ 3 → 429. Fenster = Zeitstempel der letzten 60 s + Reservierungen; ≥ 5 → 429. Bei Erfolg wird die Reservierung zum Eintrag und Zeitstempel; bei Fehler freigegeben. Das Fenster überlebt keinen Neustart (dokumentiert; Schaden höchstens 5 weitere Starts, offene Grenze bleibt).

**D7 — Start (FA-01, FA-02, FA-18, FA-20, FA-23).** Reihenfolge nach D2: Satz/Titel (D4) → Projekt (D5) → `getModel('anthropic','opus')` (FA-23) → Hook-Rückmeldung bereit (`manager.getHookSecret()` gesetzt, sonst `503 'Rückmeldung der Sitzungen nicht bereit'` — ohne Hook könnte Stufe 2 nie eintreten) → Obergrenzen (D6) → `vorhabenService.pruefeArbeitskopieMoeglich(projectPath)` (herausgelöst aus `vorhaben-service.ts:857-875`, nimmt einen **Pfad** statt eines offenen Projekts, damit ein Projekt aus den Recents erst nach bestandener Prüfung geöffnet wird; gleiche Texte) → ggf. Projekt öffnen → `manager.createSession(path, 'claude-code', { provider: 'anthropic', model: 'opus' }, undefined, undefined, satz, undefined, undefined, { sessionTarget: { target: { kind: 'new-worktree' }, explicit: true }, promptNachTrenner: true })` → Manager-Fehler → 409 „Keine Arbeitskopie möglich: …" → **synchron direkt nach dem `await`**: Eintrag (D8) anlegen, damit kein `session.prompt-text`/`session.closed` vor dem Eintrag verloren geht → `workspaceHandler.setSessionName(id, titel)` → Protokoll → 201.

**D11 — Annahmen des Plans (ER-00, bei Freigabe zu bestätigen).**
- **AN-P1 (bestätigt PO 2026-10-02):** `--` vor dem Prompt ist kein Startschalter im Sinne von AK-06/FA-02; es beendet nur die Schalterliste. Die Schalter (Provider-Flags, `--settings`) bleiben gleich dem UI-Start mit Opus.
- **AN-P2 (bestätigt PO 2026-10-02):** FA-09 „aktiven Tab nicht ändern": Hat ein Client im aktiven Projekt **keinen** gewählten Tab, darf der neue Tab gewählt werden (bestehendes Verhalten `app.ts:1706-1710`, gilt für jede fremd erzeugte Sitzung); ein gewählter Tab bleibt immer gewählt.
- **AN-P3 (bestätigt PO 2026-10-02):** Im Protokoll steht der **bereinigte** Satz; ist er länger als 500 Zeichen (abgewiesen), stehen die ersten 500 mit Vermerk `gekuerzt: true`. Kein Schreiben in andere Sitzungen, kein Schreiben im Hauptcheckout außer den Git-Metadaten der neuen Kopie (wie jeder UI-Start).

**D8 — Zustand und Stufe 2 (FA-04…FA-06, FA-16, AN-S03).** `<runtime>/eingang-<port>.json` (0600, atomar tmp+rename), `{ version: 1, eintraege: [{ sessionId, projektName, stufe1At, zustand: 'startet'|'aktiv'|'fehler', grund?, satzHash, closedAt? }] }`. Satz nie in dieser Datei, nur der Hash (RB-04).
- **Quelle der Wahrheit ist der Arbeitsspeicher**; die Datei wird nur beim Bau gelesen. Jede Änderung schreibt den ganzen Stand über eine serialisierte Schreibkette (`writeChain`, Muster `workspace-state.ts:271-293`) — kein Lesen-Ändern-Schreiben aus der Datei, also kein Rennen zwischen gleichzeitigen Anfragen (ein Prozess, einthreadig).
- **Dauerhaftigkeit vor der Zusage:** die 201-Antwort geht erst raus, wenn der Schreibvorgang des neuen Eintrags abgeschlossen ist; scheitert er, `console.warn` ohne Inhalt, Eintrag bleibt im Speicher, Antwort trotzdem 201 (die Sitzung läuft schon).
- **Listener einmal beim Bau**, nicht je Sitzung; `dispose()` beim Herunterfahren nimmt sie ab (Aufruf neben den übrigen Diensten in `websocket.ts`).
- **Frühe Ereignisse:** Ereignisse (`session.prompt-text`, `session.closed`) für eine Sitzungs-ID ohne Eintrag gehen in einen Puffer `frueh: Map<sessionId, { ersterPrompt?, geschlossen? }>` mit höchstens 20 Einträgen und 120 s Lebensdauer; beim Anlegen des Eintrags wird der Puffer der ID sofort angewendet. Dazu wird der Eintrag synchron nach dem `await createSession` angelegt (D7). Damit geht kein Ereignis verloren, auch wenn Claude sehr schnell ist.
- Listener `session.prompt-text`: nur für Einträge mit `zustand: 'startet'`, nur der **erste** Text zählt: Hash gleich → `aktiv`, sonst `fehler` „anderer Text angekommen".
- Timer 60 s ab `stufe1At` → `fehler` „Zeitüberschreitung"; beim Laden mit Restfrist neu gesetzt, abgelaufen → sofort.
- Listener `session.closed` → `closedAt`; war `startet` → `fehler` „Sitzung beendet".
- Nach `restoreReady`: Einträge ohne `closedAt`, deren Sitzung der Manager nicht kennt oder `closed` ist → wie `session.closed`. (Spec §4 Neustart-Randfall: keine eigene „Neustart"-Meldung; der Zustand folgt den drei Regeln.)
- Einträge älter 24 h ab `stufe1At` → gelöscht beim Laden und vor jeder Abfrage → `unbekannt`. Fremde Sitzungen → `unbekannt`.
- Endzustände ändern sich nie mehr (FA-05 Satz 2).

**D12 — Grund bei Vertrauensdialog (F4, AK-04).** Läuft die 60-s-Frist ab, liest der Service einmal `manager.readScreen(sessionId)`; trifft `TRUST_CUE` (`dialog-driver.ts:34`) → `fehler` „Vertrauensdialog offen — Projekt einmal in Claude bestätigen", sonst „Zeitüberschreitung". Nur lesen, nie tippen (AR-08); Lesefehler → „Zeitüberschreitung". Kein Vorab-Eintrag in `~/.claude.json` (vertraulich, gehört Claude Code).

**D9 — Protokoll (FA-17, AN-S08).** `<runtime>/eingang-<port>.jsonl` (0600), eine Zeile je Anfrage/Abfrage: `{ zeit, art: 'start'|'status', projekt?, absender: remoteAddress, ergebnis, grund?, satz?, sessionId? }`; `satz` nur bei bestandener Berechtigung. Beim Start: Zeilen > 30 Tage verwerfen (Datei neu schreiben). Vor jedem Anhängen: > 10 MB → nach `.1` rotieren (altes `.1` weg). Schreibfehler → `console.warn` ohne Inhalt, Anfrage läuft weiter.

**D10 — Frontend (FA-10).** In `_handleWorkspaceState` (`app.ts:1441-1445`) wird die dritte Stufe der Kette `?? (projects[0]?.id ?? null)` an eine Bedingung gebunden: Sie gilt nur, wenn `firstState` wahr ist **oder** `this.activeProjectId` vor dem Aufruf nicht `null` war (das aktive Projekt wurde anderswo geschlossen). Diff-Absicht in einer Zeile: `const darfErstesNehmen = firstState || this.activeProjectId !== null;` und die dritte Stufe wird `(darfErstesNehmen ? (projects[0]?.id ?? null) : null)`. Unverändert: Stufe 1 (aktuelles behalten), Stufe 2 (gemerktes aus `loadActiveProjectId`), `activateProject`, `_handleWorkspaceAck` (`app.ts:1129-1140`) — das manuelle Hinzufügen aktiviert dort weiter selbst. Folge: Ein Fenster ohne aktives Projekt bleibt ohne, wenn später ein Projekt dazukommt (O1).

#### Verworfene Alternativen

<!-- leser: agent -->

| Alternative | Warum nicht |
|---|---|
| Herkunft als Feld `origin` in der tmux-Registry (`cloud-session-registry.ts:33-79`) | vier Stellen im Manager, gilt nur für tmux-Sitzungen, und der Zustand für die Statusabfrage braucht ohnehin eine eigene Datei; eine Datei für alles ist kleiner |
| Satz wie beim Absicht-Start erst beim ersten Stop einfügen (`deliverFirstInput`, Bracketed Paste) | tippt in eine laufende TUI (AR-08-Aufwand), Stufe 2 später; Startargument ist der bestehende, einfachere Weg (intent §1) |
| WebSocket statt HTTP | hey müsste eine dauerhafte Verbindung halten; HTTP ist für ein Programm einfacher (AN-S01) |
| `istLokalerBrowser` direkt nutzen | verlangt `Origin`, das ein Programm nicht schickt (Spec §7) |
| `--` immer vor jedem `initialPrompt` setzen | ändert alle bestehenden Aufrufer (Workflow-Sitzungen, Absicht-Start) ohne Not; Opt-in hält die Wirkung auf den Eingang begrenzt |
| Satz im Zustand speichern statt Hash | RB-04: Satz nur im Protokoll und in der Sitzung |
| Statusabfrage über das Protokoll beantworten | Protokoll ist Anhängedatei mit 30 Tagen; Abfrage braucht schnellen, kleinen Zustand mit 24 h |

#### Architektur-Auswirkung

<!-- leser: agent -->

- **Ja** — neue Schnittstelle der UI nach außen mit eigener Absicherung (erstmals ein Geheimnis für einen Eingang und ein HTTP-Endpunkt, der Sitzungen startet). Keine AR-Regel ändert sich: AR-03 (Lock nur über den bestehenden Worktree-Pfad), AR-04 (keine Projektpfade hart kodiert), AR-05 (Herkunft, Titel, Projektöffnung aus dem Backend; Tab-Name in `sessionNames`), AR-08 (der Eingang tippt nichts) bleiben eingehalten. `docs/architecture.md` wird **in dieser PR** angepasst: §2 Backend-Zeile (Eingang), §3 neue Zeile „Eingang von außen", §5 Zeile „hey (lokal)", §8 ADR-0007, Änderungsprotokoll. **ADR nötig: ja** — ADR-0007 „Eingang von außen: lokales Programm mit Geheimnis" (RB-08).

### 4. Änderungen

<!-- leser: agent -->

| # | Datei / Komponente | Art | Was | Herkunft |
|---|---|---|---|---|
| 1 | `ui/src/server/utils/lokal-verbindung.ts` | ändern | `istLokaleVerbindung` (Plattform, Loopback, Weiterleitung, Host) exportieren; `istLokalerBrowser` = diese + Origin | FA-12, B-01 |
| 2 | `ui/src/server/services/eingang-regeln.ts` | neu | `bereinigeSatz`, `bildeTitel`, `satzHash`, `istBerechtigt(req, opts)` (D2), Grund-Texte als Konstanten | FA-12, FA-14, FA-11, FA-20 |
| 3 | `ui/src/server/services/eingang-service.ts` | neu | `EingangService`: Token (D3), Projekt (D5), Grenzen (D6), Start (D7), Zustand + Listener (D8), Protokoll (D9); Abhängigkeiten per Konstruktor (Manager, Workspace-Handler, Vorhaben-Prüfung, Rescan, Uhr, Pfade, Plattform, env) für Tests | FA-01…FA-06, FA-13, FA-15…FA-18, FA-22, FA-23 |
| 4 | `ui/src/server/routes/eingang.routes.ts` | neu | `createEingangRouter(getService)`: POST/GET, Berechtigung zuerst, Antwort-Mapping D1, Protokoll für jede Anfrage | FA-03, FA-07, FA-12, FA-17 |
| 5 | `ui/src/server/index.ts` | ändern | vor Zeile 32: `app.use('/api/eingang', express.json({ limit: '8kb' }), createEingangRouter(() => wsHandler?.getEingangService()))` | FA-03 |
| 6 | `ui/src/server/websocket.ts` | ändern | `EingangService` bauen (nach Manager, Workspace-Handler, Vorhaben-Service), `getEingangService()`; Start-Aufräumen Protokoll; `dispose()` im Herunterfahren | FA-01, FA-16 |
| 7 | `ui/src/server/services/workspace-handler.ts` | ändern | `openProjectFromBackend(path, name)`: Store `openProject` + Broadcast `workspace:state` | FA-10 |
| 8 | `ui/src/server/services/vorhaben-service.ts` | ändern | `pruefeArbeitskopieMoeglich(projectPath)` öffentlich aus `:857-875` herauslösen; `startStep` ruft sie | FA-13, RB-05 |
| 9 | `ui/src/server/services/cloud-terminal-manager.ts` | ändern | Option `promptNachTrenner?: boolean` in `options`; dann `shellArgs.push('--', initialPrompt)` | FA-20 |
| 10 | `ui/src/server/utils/runtime-paths.ts` | ändern | `getEingangTokenPath()`, `getEingangStatePath()`, `getEingangLogPath()` (je `-<port>`) | D3, D8, D9 |
| 11 | `ui/frontend/src/app.ts` | ändern | D10: Rückfall auf `projects[0]` nur bei `firstState` oder vorher gesetztem aktiven Projekt | FA-10, FA-09 |
| 12 | `ui/tests/unit/eingang-regeln.test.ts` | neu | D4, D2 | FA-11, FA-12, FA-14, FA-19, FA-20 |
| 13 | `ui/tests/unit/eingang-service.test.ts` | neu | D5–D9 mit Fake-Manager | FA-01…FA-06, FA-13, FA-15…FA-18, FA-22, FA-23 |
| 14 | `ui/tests/unit/eingang-routes.test.ts` | neu | Router mit `fakeReq`/`fakeRes`-Muster | FA-03, FA-07, FA-12, FA-17, FA-19 |
| 15 | `ui/tests/unit/lokal-verbindung.test.ts` | ändern (nur ergänzen) | Fälle für `istLokaleVerbindung` | B-01 |
| 16 | `ui/tests/unit/workspace-handler.test.ts` | ändern (nur ergänzen) | `openProjectFromBackend` broadcastet, aktiviert nichts | FA-10 |
| 17 | `ui/tests/unit/cloud-terminal-trenner.test.ts` | neu | `promptNachTrenner` setzt `--` vor den Prompt, sonst unverändert; Gleichheit der Schalter mit UI-Start | FA-02, FA-20, AK-06 |
| 18 | `ui/tests/unit/app-terminal-dock.test.ts` | ändern (nur ergänzen) | Client ohne Projekt bekommt Projekt + Tab, aktives Projekt bleibt leer; Client mit aktivem Projekt behält es | FA-08…FA-10 |
| 19 | `docs/adr/0007-eingang-von-aussen.md` | neu | Entscheidung, Alternativen, Folgen | RB-08 |
| 20 | `docs/security.md` | ändern | §1 drei Datenobjekte (Token vertraulich, Zustand intern, Protokoll intern), §2 Absatz „Eingang von außen", §3 Zeile Geheimnis, §4 T-09, Änderungsprotokoll | RB-01, RB-03, Spec §7 |
| 21 | `docs/architecture.md` | ändern | siehe §3 Architektur-Auswirkung | Spec §7 |
| 22 | `docs/product-brief.md` | ändern | §8 Begriff „Sitzung von außen / Eingang" | Spec §7 |
| 23 | `intent/INT-2026-030-sitzung-von-aussen/e2e/` | neu | E2E-Skript (Scratch-Projekt, 20 Anfragen, Kontrollfälle EK-03) und Screenshot | EK-01…EK-03, AN-S10 |

**Nicht betroffen (ausdrücklich):** `specwright/manifest.tsv` (UI-Dateien und Docs stehen nicht im Lieferumfang); Installer; `claude-hooks.ts` und die Hook-Route (nur ein weiterer Listener am bestehenden Event); `cloud-session-registry.ts`; `vorhaben-state.ts`; Frontend-Komponenten außer `app.ts`; Einstellungen-Seite; Glocke; Anruf; Cloud-Host-Deployment.

### 5. Verbindungen

<!-- leser: agent -->

| Von | Nach | Art | Schnittstelle | Nachweis (Befehl) | Teil |
|---|---|---|---|---|---|
| `index.ts` | `eingang.routes.ts` | Import + Mount | `app.use('/api/eingang', …)` vor `express.json` global | `grep -n "api/eingang" ui/src/server/index.ts` (Zeile < Zeile von `express.json({ limit: '30mb' })`) | — |
| `eingang.routes.ts` | `EingangService` | Lazy-Getter | `wsHandler?.getEingangService()` | `grep -n "getEingangService" ui/src/server/index.ts ui/src/server/websocket.ts` | — |
| `eingang.routes.ts` | `eingang-regeln.ts` | Import | `istBerechtigt` | `grep -n "istBerechtigt" ui/src/server/routes/eingang.routes.ts`; Test `eingang-routes.test.ts` | — |
| `eingang-regeln.ts` | `lokal-verbindung.ts` | Import | `istLokaleVerbindung` | `grep -n "istLokaleVerbindung" ui/src/server/services/eingang-regeln.ts` | — |
| `eingang-regeln.ts` | `cloud-terminal.routes.ts` | Import | `tokenMatches` | `grep -n "tokenMatches" ui/src/server/services/eingang-regeln.ts` | — |
| `EingangService` | `CloudTerminalManager` | Methode | `createSession(…, { sessionTarget, promptNachTrenner: true })` | Test `eingang-service.test.ts` „startet mit Opus, neuer Kopie, Trenner"; `grep -rn "promptNachTrenner: true" ui/src/` liefert genau einen Treffer in `eingang-service.ts` | — |
| `EingangService` | `CloudTerminalManager` | Event | `on('session.prompt-text')`, `on('session.closed')` | `grep -n "session.prompt-text\|session.closed" ui/src/server/services/eingang-service.ts`; Tests Stufe 2/Fehler | — |
| `EingangService` | `WorkspaceHandler` | Methode | `openProjectFromBackend`, `setSessionName` | Tests Recents/Titel; `grep -n "openProjectFromBackend\|setSessionName" ui/src/server/services/eingang-service.ts` | — |
| `EingangService` | `VorhabenService` | Methode | `pruefeArbeitskopieMoeglich`, `scheduleRescan` | `grep -n "pruefeArbeitskopieMoeglich" ui/src/server/services/*.ts` (Treffer in `vorhaben-service.ts` und Verdrahtung) | — |
| `EingangService` | `model-config.ts` | Import | `getModel('anthropic','opus')` | Test FA-23 | — |
| `websocket.ts` | `EingangService` | Konstruktion | `new EingangService({…})` | `grep -n "new EingangService" ui/src/server/websocket.ts` | — |
| Backend | Frontend | WS (bestehend) | `workspace:state`, `cloud-terminal:created` (generischer Broadcast `websocket.ts:2143-2160`), `cloud-terminal:list` | E2E: Tab erscheint in zwei Browsern; Test `app-terminal-dock.test.ts` | — |
| hey (extern, lokal) | Eingang | HTTP | `POST/GET /api/eingang/sitzung` + Header | E2E-Skript `intent/…/e2e/` mit `curl` | — |

- [x] Jede neue Komponente hat mindestens eine Verbindung.
- [x] Jeder Nachweis ist ein ausführbarer Befehl.

### 6. Reihenfolge der Arbeit

<!-- leser: agent -->

0. Lesende Vorprüfung: (a) alle Aufrufer von `istLokalerBrowser` und `createSession` (`grep -rn`), damit Nr. 1 und Nr. 9 nichts brechen; (b) F2 ist im Plan Mode geklärt (`cloud-terminal-manager.ts:1049-1075`); nur nachsehen, dass die Stelle unverändert ist; (c) Restore-Getter `cloud-terminal-manager.ts:390-392` Name bestätigen → prüfbar durch Notiz in §14, falls abweichend.
1. Nr. 1, 2, 10 + Tests 12, 15 → `npx vitest run tests/unit/eingang-regeln.test.ts tests/unit/lokal-verbindung.test.ts` grün.
2. Nr. 9 + Test 17 → grün; bestehende Manager-Tests unverändert grün.
3. Nr. 7, 8 + Test 16 → grün; `vorhaben-*`-Tests unverändert grün.
4. Nr. 3 + Test 13 → grün.
5. Nr. 4, 5, 6 + Test 14 → grün; Backend startet mit und ohne `SPECWRIGHT_EINGANG=on`.
6. Nr. 11 + Test 18 → grün.
7. Verbindungen nachweisen (§5).
8. E2E (§8) gegen Branch-Backend auf eigenem Port mit Scratch-Projekt; Screenshot.
9. Docs Nr. 19–22.
10. `bash scripts/verify.sh` → `verify: OK`; PR; CI grün.

### 7. Zerlegung

<!-- leser: agent -->

#### Variante A — nicht zerlegbar, eine Sitzung

<!-- leser: agent -->

Der Service hängt an Manager-Option, Workspace-Methode, Vorhaben-Prüfung und Lokal-Prüfung zugleich (§5, 10 Verbindungen); das Frontend-Stück ist eine Zeile. Parallelisierung brächte mehrere Worktrees für kleine Teile und eine Integrationsaufgabe obendrauf.

#### Variante B — parallel in Worktrees

<!-- leser: agent -->

entfällt.

### 8. Tests und Nachweis

<!-- leser: agent -->

| AK / FA | Test | Datei | Art |
|---|---|---|---|
| AK-01 / FA-01 | berechtigt + gültig → `createSession` mit gespeichertem Projektpfad, `new-worktree` explizit, Satz als Prompt | `eingang-service.test.ts` | Unit |
| AK-01, AK-06 / FA-02 | Modell `{anthropic, opus}` unabhängig von `defaultModel`; argv von Eingang und UI-Start mit Opus gleich bis auf `--` + Prompt | `eingang-service.test.ts`, `cloud-terminal-trenner.test.ts` | Unit |
| FA-23 | `getModel` liefert nichts → 409 „Modell Opus nicht verfügbar", kein `createSession` | `eingang-service.test.ts` | Unit |
| AK-02 / FA-03 | 201 mit `zustand: 'startet'`, `sessionId`, Name statt Pfad | `eingang-routes.test.ts` | Unit |
| AK-03 / FA-04 | erster `session.prompt-text` = Satz → `aktiv` | `eingang-service.test.ts` | Unit |
| AK-04 / FA-05 | anderer Text → `fehler`; `session.closed` vor Stufe 2 → `fehler`; 60 s (Fake-Uhr) → `fehler`; späterer Satz ändert nichts; D12: Bildschirm mit `TRUST_CUE` → Grund „Vertrauensdialog offen", ohne → „Zeitüberschreitung", `readScreen` wirft → „Zeitüberschreitung"; nie ein Schreibaufruf | `eingang-service.test.ts` | Unit |
| FA-06 | vier Zustände; ID einer UI-Sitzung → `unbekannt`; 24 h → `unbekannt`; geschlossene Sitzung < 24 h → letzter Zustand | `eingang-service.test.ts` | Unit |
| AK-07 / FA-07, FA-12 | je Kontrollfall (aus, Linux, Fremdadresse, je Weiterleitungs-Header, fremder Host, `Origin`, falsches/fehlendes Token) → 403 gleicher Text, kein Start, keine Kopie; GET ebenso | `eingang-routes.test.ts`, `eingang-regeln.test.ts` | Unit |
| AK-08 / FA-13 | unbekannt, Arbeitskopie-Pfad, kein Git, Isolation aus, Manager-Fehler → Absage mit Grund, kein Eintrag | `eingang-service.test.ts` | Unit |
| FA-14 | leer, 501 Zeichen, `/clear`, Titel 41 Zeichen → 400, nichts gekürzt | `eingang-regeln.test.ts` | Unit |
| AK-09 / FA-15 | 4. offene → 429; 6. in 60 s → 429; zwei gleichzeitige als 3./4. → genau eine angenommen | `eingang-service.test.ts` | Unit |
| FA-16 | Zustand neu geladen nach „Neustart" (neuer Service, gleiche Datei) behält Einträge, zählt offene, setzt Restfrist | `eingang-service.test.ts` | Unit |
| AK-10 / FA-17 | Protokollzeilen je Fall; unberechtigt ohne `satz`; 30-Tage-Aufräumen; Rotation > 10 MB | `eingang-service.test.ts` | Unit |
| AK-11 / FA-18 | während Start keine Schreib-/Schließaufrufe an andere Sitzungen (Fake-Manager zählt) | `eingang-service.test.ts` | Unit |
| AK-12 / FA-19 | Variable fehlt/`off`/`ON` → 403, kein Token-File erzeugt | `eingang-routes.test.ts` | Unit |
| FA-20 | Satz `-p foo` und mit Anführungszeichen landet als ein argv-Element hinter `--` | `cloud-terminal-trenner.test.ts` | Unit |
| FA-21 | Satz nicht in Zustandsdatei, nicht in `console.*` (Spy), nicht in Broadcast außer Titel | `eingang-service.test.ts` | Unit, Review |
| FA-22 | `session.closed` → nicht mehr gezählt; Kopie-Behandlung = bestehender Pfad | `eingang-service.test.ts` | Unit |
| AK-05 / FA-08…FA-11 | Titel nach B-09; Projekt aus Recents geöffnet ohne Aktivierung; Client ohne Projekt bleibt ohne aktives; Tab erscheint ohne Tab-/Projektwechsel | `eingang-regeln.test.ts`, `workspace-handler.test.ts`, `app-terminal-dock.test.ts` | Unit |
| EK-01, EK-02 | 20 Anfragen gegen Scratch-Projekt, ≥ 95 % `aktiv`, Median ≤ 15 s | `intent/…/e2e/eingang-e2e.sh` | E2E, Messung |
| EK-03 | ohne Token, mit `x-forwarded-for`, fremder Host, mit `Origin`, über Tailscale-URL → 0 Starts | dasselbe Skript + manuell Tailscale | E2E |

- **Verify-Befehl:** `bash scripts/verify.sh` → `verify: OK`, Ausgabe im PR. CI ist die Wahrheit; `ui/tests/known-failures.txt` wird nicht angefasst.
- **Angeschlossen (E2E-Pfad):** Branch-Backend auf Port 3111 mit `SPECWRIGHT_EINGANG=on` und eigenem `SPECWRIGHT_RUNTIME_DIR`, Scratch-Git-Projekt in Recents; zwei Browser (Playwright) offen, einer auf einem anderen Projekt mit fokussiertem Eingabefeld; `curl` POST mit Token → 201 → Tab erscheint in beiden, Fokus und aktives Projekt unverändert → GET bis `aktiv` → Tab schließen → Kopie weg, Zähler frei. Screenshot neben bestehendem aktiven Tab (AN-S10).
- **Bugfix-Anteil:** keiner.
- **UI:** kein Mock (AN-S10); Screenshot im PR.

### 9. Risiken

<!-- leser: mensch -->

| Risiko | Wahrscheinlichkeit | Wirkung | Gegenmaßnahme | Wer merkt es |
|---|---|---|---|---|
| R1: Falsch erkannter Satz läuft mit Vollzugriff (B-07, bewusst angenommen) | mittel | hoch | eigene Arbeitskopie, Geheimnis, Grenzen 3/5, Satz ohne „/"; Abschalter | Michael im Tab bzw. im Protokoll |
| R2: Claude nimmt `--` vor dem Prompt nicht an oder meldet den Text anders zurück (AN-01) | sehr niedrig (Probelauf P1–P7 bestanden) | hoch (Stufe 2 nie) | erledigt durch Probelauf; künftige CLI-Version könnte es ändern → EK-01 im Betrieb zeigt es | Protokoll, hey |
| R3: Vertrauensdialog fängt den Satz ab, wenn das Projekt in Claude noch nie als vertraut bestätigt wurde (F4) | niedrig (alle bisherigen Projekte vertraut) | mittel | D12: Fehlergrund „Vertrauensdialog offen" nach 60 s; Michael bestätigt einmal mit Pfeil runter + Enter | hey (Grund), Michael im Tab |
| R4: Fix D10 ändert das Verhalten, wenn ein anderes Gerät ein Projekt hinzufügt (Fenster ohne Projekt aktiviert es nicht mehr) | mittel | niedrig | ein Klick auf das Projekt; vom PO am 2026-10-02 angenommen | Michael in einem leeren Fenster |
| R5: Geheimnis-Datei von anderem Programm desselben Nutzers lesbar | niedrig | hoch | gilt als vertrauenswürdig (Ein-Nutzer-Annahme, AN-03); ADR benennt es | — |
| R6: Unberechtigte Flut füllt Protokoll | niedrig | niedrig | Rotation bei 10 MB, 30 Tage | Plattenplatz, Protokoll |
| R7: Neustart zwischen Stufe 1 und 2 → „Zeitüberschreitung", obwohl Satz ankam (Hook während Stillstand verloren) | niedrig | niedrig | dokumentiert; hey meldet „nicht sicher angekommen", Michael schaut in den Tab | hey/Michael |
| R8: Anfragefenster 5/60 s überlebt keinen Neustart | niedrig | niedrig | offene Grenze 3 bleibt dauerhaft; dokumentiert in ADR | — |
| R9: Absturz zwischen Sitzungsstart und Schreiben des Eintrags → Sitzung ohne Herkunft (zählt nicht für die Grenze, Status „unbekannt") | sehr niedrig | niedrig | Zusage erst nach dem Schreiben (D8); Restfenster Millisekunden | hey (Status „unbekannt"), Michael sieht den Tab |
| R10: Geheimnis abgeflossen | niedrig | hoch | Rotation: Datei löschen, Backend neu starten (Spec Ablauf D); steht in `security.md` §3 und ADR-0007; Abschalter sofort | Michael |

### 10. Manuelle Schritte

<!-- leser: mensch -->

| Schritt | Wer | Wann | Erledigt |
|---|---|---|---|
| Probelauf AN-01/AN-02/`--` nach dem Probe-Protokoll unten; Ergebnis je Fall in §2 und §12 eintragen | Agent (Zustimmung PO 2026-10-02) | nach Plan Mode, vor Freigabe | [x] 2026-10-02: P1–P7 bestanden (§2); Befund F4 Vertrauensdialog → D12 |
| Eingang einschalten: `SPECWRIGHT_EINGANG=on` in `ui/.env` (oder in der Startumgebung) des Mac-Backends (Michaels Startweg `cd ui && npm run start:backend`, `ui/package.json`), Backend neu starten; Token-Pfad aus dem Startlog an hey geben | Michael | nach Merge | [ ] |
| hey anbinden (Phase 2b, hey-Repo, NZ-03) | Michael | nach Merge | [ ] |
| EK-01/EK-02 im Betrieb: Protokoll nach 2 Wochen sichten; AN-04 (ungenutzte Arbeitskopien zählen) | Michael | 2026-10-16 | [ ] |
| Merge nach `main` (Auto-Deploy Cloud-Host; dort bleibt der Eingang aus, weil Linux) | Michael | nach CI grün | [ ] |

**Probe-Protokoll (Abnahme für R2/R3).** Aufbau: Scratch-Git-Repo unter dem Scratchpad, je Fall eine frische Kopie per `git worktree add` (nie vorher von Claude geöffnet), Hook-Datei mit `UserPromptSubmit`, das `.prompt` aus stdin per `jq -r` in eine Datei schreibt, Start in tmux wie das Run-Script: `claude --dangerously-skip-permissions --model opus --settings <hook.json> -- '<Satz>'`. Fälle: P1 `Probe eins`; P2 `-x Probe mit Bindestrich`; P3 `--model haiku bitte nicht als Schalter`; P4 `Sag "Hallo" und 'Tschüss'`; P5 `$(echo boom) und \`id\``; P6 `Grüße mit Umlauten äöü ß und Emoji 👋`; P7 ein Satz mit genau 500 Zeichen. **Bestanden** heißt je Fall: (a) kein Vertrauensdialog auf dem Bildschirm (`tmux capture-pane`), (b) Hook-Datei enthält den Satz byte-gleich (`cmp`), (c) Statuszeile zeigt Opus, kein anderes Modell, (d) binnen 15 s. **Ausgang:** alle bestanden → Plan bleibt; P2/P3 scheitern → Plan B als Rückfrage an den PO (Sätze mit „-" vorn abweisen, Änderung FA-20) vor der Freigabe; (a) scheitert → Regel für den Dialog nötig, Rückfrage an den PO; (b) scheitert bei P4–P7 → Befund, Plan anpassen vor Freigabe. Kosten: 7 kurze Opus-Sitzungen, jede nach dem Prüfen per `/exit` beendet.

### 11. Schätzung

<!-- leser: mensch -->

18–24 h (knapp 3 Arbeitstage, am Rand des Budgets von 3 Tagen; intent §10). Aufteilung: Probelauf 1–2 h, Code 6–8 h, Unit-Tests 5–6 h, E2E mit zwei Browsern und Messung EK-01…EK-03 3–4 h, ADR und drei Docs 2–3 h, `verify` und CI 1 h. Unsicherheit: Probelauf (R2/R3 können eine PO-Rückfrage auslösen) und E2E-Stabilität (Trust-Dialog-Falle der Fehlerliste, Playwright). Abbruch nach intent §10, wenn B-01 EK-03 nicht hält.

### 12. Review des Plans

<!-- leser: mensch -->

| Finding | Quelle | Entscheidung | Änderung am Plan |
|---|---|---|---|
| S1, Body-Parser vor der Berechtigung: Unberechtigte würden bis 8 KB geparst, Parser-Fehler (413) blieben unprotokolliert (FA-17) — angenommen | Self | angenommen | §3 D1 Router-Aufbau |
| S2, Prüfung der Arbeitskopie brauchte ein offenes Projekt: ein Projekt aus den Recents würde vor einer Absage schon geöffnet — angenommen, Prüfung nimmt einen Pfad | Self | angenommen | §3 D7, §4 Nr. 8 |
| S3, Rennen zwischen Sitzungsstart und Eintrag: ein frühes Ende- oder Prompt-Ereignis könnte ohne Eintrag verloren gehen — angenommen, Eintrag synchron nach dem `await` | Self | angenommen | §3 D7 |
| S4, Hooks nicht bereit: ohne Hook-Geheimnis tritt Stufe 2 nie ein und hey bekäme erst nach 60 s eine Absage — angenommen, sofortige Absage 503 | Self | angenommen | §3 D7 |
| S5, `--` und AK-06 („keine anderen Startschalter"): Wortlaut könnte `--` als Abweichung lesen — als Annahme AN-P1 zur Bestätigung | Self | angenommen als Annahme | §3 D11 |
| S6, FA-09 bei Client ohne gewählten Tab: bestehendes Verhalten wählt den neuen Tab — als Annahme AN-P2, kein Code-Eingriff, weil es jede fremd erzeugte Sitzung betrifft | Self | angenommen als Annahme | §3 D11 |
| S7, Anfragefenster im Speicher statt in der Datei — abgelehnt, weil die dauerhafte Grenze (3 offene) den Neustartfall abdeckt und das Fenster 60 s lebt | Self | abgelehnt | §9 R8 |
| S8, `--` global für alle Aufrufer einführen statt Opt-in — abgelehnt, weil es Workflow- und Absicht-Starts ohne Bedarf ändert | Self | abgelehnt | §3 Verworfene Alternativen |
| X1, Rennen Start/Listener: frühe `prompt-text`-/`closed`-Ereignisse vor dem Eintrag gehen verloren — angenommen: Listener einmal beim Bau, Puffer für unbekannte IDs (20 Einträge, 120 s), Eintrag synchron nach dem `await`, `dispose()` beim Herunterfahren | extern, Mehrheit | angenommen | §3 D7, D8 |
| X2, Zustandsdatei bei gleichzeitigen Anfragen: Lesen-Ändern-Schreiben könnte Einträge überschreiben — angenommen als Klarstellung: Speicher ist Quelle, Datei nur beim Bau gelesen, serialisierte Schreibkette mit tmp+rename | extern, Mehrheit | angenommen | §3 D8 |
| X3, Arbeitskopie bei Startfehler nicht belegt: könnte liegen bleiben — angenommen und geklärt: Rückbau existiert in `cloud-terminal-manager.ts:1049-1075`; F2 von [Uncertain] auf [Certain] | extern, Mehrheit | angenommen | §2, §6 Schritt 0 |
| X4, Probelauf zu dünn: nur ein Beispiel, kein Abnahmekriterium — angenommen: sieben Fälle P1–P7, vier Kriterien, Ausgang je Fall | extern, Mehrheit | angenommen | §10 Probe-Protokoll |
| X5, Pfadnormalisierung beim Projektvergleich — angenommen als bereits erfüllt: D5 löst beide Seiten per `realpath` auf und startet mit dem gespeicherten Pfad | extern, Minderheit | angenommen (keine Änderung) | §3 D5 |
| X6, Anfragefenster nur im Speicher: Ungleichgewicht nach Neustart — abgelehnt: nach einem Neustart bekommt ein berechtigter Absender eher weniger Absagen, nicht mehr; die Grenze von 3 offenen Sitzungen bleibt dauerhaft (R8) | extern, Minderheit | abgelehnt | — |
| X7, Hook-Bereitschaft über `getHookSecret()` zu schwach — abgelehnt: das Geheimnis ist genau dann gesetzt, wenn `--settings` an die Sitzung geht (`cloud-terminal-manager.ts:346,957`); ob die CLI die Hooks lädt, prüft der Probelauf (b) | extern, Minderheit | abgelehnt | §2 Zeile „Hook bereit" |
| X8, Kopplung durch herausgelöste `pruefeArbeitskopieMoeglich` — abgelehnt: gemeinsame Prüfung ist gewollt (Spec §7: gleiche Absage-Gründe wie der Absicht-Start); zwei Kopien würden auseinanderlaufen | extern, Minderheit | abgelehnt | — |
| X9, verstecktes Flag `promptNachTrenner` könnte anderswo eingeschaltet werden — teilweise angenommen: §5-Nachweis verlangt, dass `promptNachTrenner: true` nur in `eingang-service.ts` steht; Test AK-06 hält die Schaltergleichheit fest | extern, Minderheit | angenommen | §5 |
| X10, keine Rotation des Geheimnisses — angenommen als Doku: Weg steht in Spec Ablauf D; in `security.md` §3 (Spalte Rotation) und ADR-0007, neu R10 | extern, Minderheit | angenommen | §4 Nr. 19–20, §9 R10 |
| X11, Absturz vor dem Schreiben des Eintrags — angenommen: Zusage erst nach abgeschlossenem Schreiben, Restrisiko R9 | extern, Minderheit | angenommen | §3 D8, §9 R9 |
| X12, doppelter Zustand Speicher/Datei verwirrend — abgelehnt: klare Trennung, Einträge dauerhaft, Anfragefenster flüchtig; in D6/D8 benannt | extern, Minderheit | abgelehnt | — |
| X13, Fehlertexte bei doppelter Projekterkennung brauchen gemeinsames Mapping — abgelehnt: der Plan erkennt keine doppelten Projekte; `activateProject` erzeugt keine Absagetexte; Befund trifft keinen Teil des Plans | extern, Minderheit | abgelehnt | — |
| X14, Frontend-Fix D10 zu vage — angenommen: Diff-Absicht als Zeile und die unveränderten Teile benannt | extern, Minderheit | angenommen | §3 D10 |
| X15, Widerspruch bei der Sicherheit von F2 — angenommen, durch X3 aufgelöst | extern, Minderheit | angenommen | §2 |
| X16, Schätzung ohne Probelauf, E2E, Docs — angenommen: 18–24 h mit Aufteilung | extern, Minderheit | angenommen | §11 |
| P-A1, Probelauf: P1–P7 bestanden, aber in einer Kopie eines nie vertrauten Projekts erscheint der Vertrauensdialog (F4) — angenommen: genauer Fehlergrund durch einmaliges Lesen des Bildschirms nach 60 s (D12), kein Eingriff in `~/.claude.json` | Probelauf | angenommen | §2, §3 D12, §8, §9 R2/R3 |

**PO-Entscheidungen 2026-10-02:** Fenster ohne aktives Projekt aktiviert nicht automatisch (D10, R4) — ja; Probelauf A1 — ja; AN-P1 bis AN-P3 — bestätigt.

**Minimalinvasiv geprüft:** Wiederverwendet: Startpfad `createSession` samt Arbeitskopie, Lock und Aufräumen; Voraussetzungsprüfung des Absicht-Starts (nur herausgelöst); `tokenMatches`; Lokal-Prüfung (zerlegt statt kopiert); Event `session.prompt-text`; Tab-Name über `sessionNames`; die bestehende Übernahme fremder Sitzungen im Frontend samt `cloud-terminal:list` für späte Clients; 0600-Muster und Aufräum-Muster. Gestrichen: Registry-Feld für die Herkunft, eigener Lock, neue WebSocket-Nachricht, eigene Typdatei unter `shared/`, Frontend-Markierung. Feature-Preservation: alle 23 FA und 12 AK in §8 belegt, keine gestrichen.

**Abgleich Mensch/Agent:** „In einfachen Worten", §9, §10, §12 gegen §2–§8 gelesen am 2026-10-02 (zweimal: vor und nach dem Probelauf): Befund — erster Durchgang: Absage bei nicht bereiten Hooks fehlte in „In einfachen Worten", ergänzt; zweiter Durchgang: Vertrauensdialog (F4/D12) in Mensch-Teil, §2, §3, §8, §9, §10, §12 gleich beschrieben, ohne weiteren Befund.

### 13. Definition of Done

<!-- leser: agent -->

- [x] Jede FA/AK aus Abschnitt 8 hat einen grünen Test (`eingang-regeln`, `eingang-service`, `eingang-routes`, `cloud-terminal-trenner`, Ergänzungen in `lokal-verbindung`, `workspace-handler`, `app-terminal-dock`; 2026-10-02).
- [x] Alle Nachweise aus Abschnitt 5 ausgeführt und im PR zitiert.
- [x] E2E-Pfad läuft (Abschnitt 8), EK-01…EK-03 gemessen: 20/20 aktiv, Median 2,25 s, Kontrollfälle 8/8 mit 403 (`e2e/protokoll.md`).
- [ ] `verify` grün, Ausgabe im PR — und PR-Checks grün. Lokal `verify: OK` (2026-10-02); PR-Check steht aus.
- [x] `docs/architecture.md`, `docs/security.md`, `docs/product-brief.md`, ADR-0007 in dieser PR.
- [x] Manuelle Schritte (Abschnitt 10) erledigt oder im PR als offen markiert.
- [x] Abweichungen in Abschnitt 14.
- [x] 2x-Regel-Check: kein Fehler aus der Liste „zweimal" wiederholt; Vertrauensdialog mit Pfeil runter + Enter bedient.
- [x] Abschlussbericht nach R3 mit Block „Für das Board".

### 14. Abweichungen bei der Umsetzung

<!-- leser: mensch -->

| Datum | Abweichung | Grund | Auswirkung auf Abschnitt |
|---|---|---|---|
| 2026-10-02 | Schritt 0: Der öffentliche Restore-Zugriff heißt `whenReady()` (`cloud-terminal-manager.ts:390`), nicht `restoreReady`. | Name im Plan ungenau | §2 Zeile „Restore", §3 D8 — Dienst nutzt `whenReady()` |
| 2026-10-02 | D1/§4 Nr. 5: `index.ts` montiert nur den Router (`app.use('/api/eingang', createEingangRouter(…))`) ohne vorgeschalteten `express.json`; der 8-KB-Parser steht im Router hinter der Berechtigung. Dazu prüft der Router `application/json` ausdrücklich (sonst 400 „Anfrage ungültig" statt fälschlich „Satz fehlt"). | D1 verlangt Berechtigung vor dem Parsen; §4 Nr. 5 widersprach dem | §3 D1, §4 Nr. 5 |
| 2026-10-02 | D2/§5: `istBerechtigt` ruft der Dienst (`EingangService.berechtigt(req)`, kennt Geheimnis, Schalter, Port), der Router ruft `svc.berechtigt`. Der §5-Nachweis „`istBerechtigt` in `eingang.routes.ts`" trifft deshalb `eingang-service.ts`. | Geheimnis lebt im Dienst; so verlässt es ihn nie | §5 Zeile Router → Regeln |
| 2026-10-02 | D8: Einträge älter als 24 h werden nur entfernt, wenn ihre Sitzung geschlossen ist; ein offener Eintrag zählt weiter für die Obergrenze, die Abfrage antwortet nach 24 h trotzdem `unbekannt`. | D8 hätte eine über 24 h offene Sitzung aus der Grenze fallen lassen (FA-16, FA-22) | §3 D8, ADR-0007 |
| 2026-10-02 | D8: Der Puffer für frühe Ereignisse nimmt nur Ereignisse auf, solange ein Start reserviert ist; sonst gehören sie UI-Sitzungen und werden nicht gemerkt. Gespeichert wird nur der Hash des Prompts. | weniger Speicher, kein Satztext fremder Sitzungen im Dienst (RB-04) | §3 D8 |
| 2026-10-02 | Dienst vor `start()` (Workspace-Load, Restore-Abgleich) antwortet 503 „Backend startet noch"; ist der Dienst noch nicht gebaut, antwortet der Router bei Schalter aus 403, bei an 503. Zustand und Protokoll werden auch bei Schalter aus geschrieben (Abweisungen gehören ins Protokoll, FA-17); ein Geheimnis entsteht nur bei an. | Lücken in D1 | §3 D1, D3 |
| 2026-10-02 | Router-Tests über einen echten HTTP-Server auf `127.0.0.1` statt `fakeReq`/`fakeRes`, damit `Host`, `Origin` und Weiterleitungs-Header wie im Betrieb ankommen. | `fakeReq` hätte Socket-Adresse und Header nachgebaut | §4 Nr. 14 |
| 2026-10-02 | E2E: Kontrollfall „über Tailscale-URL" nicht über das echte Tailnet gefahren, sondern über die Header, die `tailscale serve` setzt (`tailscale-user-login`, `x-forwarded-for`, fremder `Host`) — alle 403. Der Probe-Lauf zum Vertrauensdialog (D12) lief zusätzlich echt: Projekt ohne Vertrauen → nach 60 s „Vertrauensdialog offen". | das Branch-Backend auf 3111 hängt nicht am Tailnet; Michaels Live-Backend nicht anfassen | §8 EK-03 |
| 2026-10-02 | Nachtrag nach Merge (PR #101): Das Backend lädt `ui/.env` beim Start (`ui/src/server/utils/env-datei.ts`, erster Import in `index.ts`, `process.loadEnvFile`), damit `SPECWRIGHT_EINGANG=on` nicht bei jedem Start mitgegeben werden muss. Fehlt die Datei, passiert nichts; Variablen der Umgebung gewinnen; `ui/.env` ist gitignored (security §1, vertraulich). | Wunsch PO nach dem Merge; §10 Schritt „Eingang einschalten" nennt jetzt `ui/.env` | §10, `ui/src/server/index.ts` |
