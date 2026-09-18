# Plan: UI: Bild aus der Zwischenablage in „Neue Absicht" einfügen wie im Terminal

> **Intent:** `intent.md` (INT-2026-020) · **Spec:** entfällt (bypass: Größe S, ein Textfeld bekommt den Einfüge-Weg des Terminals)
> **Status:** umgesetzt (PR #79, Merge steht aus)
> **Erstellt:** 2026-09-18 im Plan Mode · **Freigabe:** PO (Michael Sindlinger), 2026-09-18 — im Chat „Freigabe: plan.md (Stand 2026-09-18 06:05)"; D1 ohne Einspruch = ADR-0005 ja
> **Pflichtinput gelesen:** `docs/architecture.md` (Stand `960c22e`), `CLAUDE.md`, `docs/security.md`

<!-- Der Plan ist TECHNISCH und die EINHEIT DER AUSFÜHRUNG. Eine Sitzung setzt ihn ganz um.
     Maßstab: Ein neues Teammitglied könnte allein anhand dieses Dokuments umsetzen.
     Jede Änderung verweist auf ein AK (intent.md). Keine Änderung ohne Herkunft.
     Zwei Leser: „In einfachen Worten" liest die Person, die freigibt; „Details" liest der Agent, der baut. Die erste Zeile unter jeder
     Überschrift sagt, für wen der Abschnitt ist (R1, specwright/workflows/meta/leser-und-rueckfragen.md). Marker übernehmen, keinen entfernen. -->

## In einfachen Worten

<!-- leser: mensch -->

**Worum geht es?** Wenn du auf „Neue Absicht" ein Vorhaben beschreibst, hast du oft einen Screenshot dazu — etwa von der Stelle in der Oberfläche, die dich stört. Heute kann das Textfeld mit einem Bild in der Zwischenablage nichts anfangen: Cmd+V tut einfach nichts, weil Browser Bilddaten in Textfeldern wegwerfen. Du musst also erst „Starten" drücken, warten, bis die Sitzung läuft, und das Bild dann im Terminal nachreichen. Im Terminal funktioniert das Einfügen seit dem Cloud-Terminal: Das Bild wird zum Backend geschickt, dort als Datei abgelegt, und in der Sitzung erscheint der Dateipfad — Claude liest die Datei als Bild. Genau dieser Handgriff soll jetzt auch im Textfeld von „Neue Absicht" gehen.

**Was ändert sich?** Drückst du künftig auf „Neue Absicht" Cmd+V (am Handy: Einfügen) und in der Zwischenablage liegt ein Bild, dann steht unter dem Textfeld kurz „Screenshot wird hochgeladen…", und danach steht an der Stelle, wo dein Cursor war, der Pfad der abgelegten Bilddatei — mit einem Leerzeichen davor und danach, genau wie im Terminal. Darunter steht „Screenshot eingefügt". Du schreibst weiter, drückst „Starten", und die Sitzung bekommt deinen Text samt Pfad als erste Eingabe; Claude sieht das Bild von Anfang an. Fügst du Text ein, passiert das, was heute passiert — nichts ändert sich. Ist das Bild zu groß (mehr als 10 MB) oder hat es eine Art, die das Terminal auch nicht nimmt, dann sagt die Zeile unter dem Feld den Grund, und dein Text bleibt unverändert. Solange ein Bild hochlädt, ist „Starten" gesperrt (auch Cmd+Enter), damit der Pfad nicht fehlt, wenn der Text losgeht. Das Terminal-Einfügen selbst bleibt, wie es ist.

**Wie wird das gemacht?** Das Bild-Einfügen des Terminals besteht aus drei Teilen: (1) der Browser fängt Cmd+V ab und prüft, ob ein Bild dabei ist; (2) das Bild geht über die bestehende Verbindung zum Backend, das es prüft (Art, Größe, nicht leer), unter dem Laufzeitordner der UI ablegt und den Pfad zurückgibt; (3) der Pfad landet als Text in der Sitzung. Für „Neue Absicht" wird Teil 1 und 2 wiederverwendet — die Erkennung im Browser und die Prüf- und Ablagelogik im Backend werden aus dem Terminal-Code in je eine kleine gemeinsame Funktion herausgezogen, die beide Stellen aufrufen. So gibt es weiterhin nur eine Liste erlaubter Bildarten und eine Größengrenze. Teil 3 ist anders: Beim Terminal gibt es eine laufende Sitzung, in die das Backend den Pfad direkt tippt; auf „Neue Absicht" gibt es die Sitzung noch nicht. Deshalb schickt das Backend den Pfad an den Browser zurück, und der Browser schreibt ihn ins Textfeld. Der Text mit Pfad geht dann den heute schon bestehenden Weg als erste Eingabe in die Sitzung.

Weil die Bilder noch zu keiner Sitzung gehören, brauchen sie einen eigenen Ablageort: einen eigenen Ordner neben den Terminal-Bildern, ebenfalls unter dem Laufzeitordner der UI (nicht im Repo, nicht unter `/tmp` — auf dem Cloud-Host sieht Claude das `/tmp` der UI nicht). Das Terminal löscht beim Ende einer Sitzung ihren Bilder-Ordner; der neue Ordner liegt daneben und wird davon nie berührt. Damit sich dort nichts ansammelt, räumt das Backend bei jedem Start auf: Bilder, die älter als sieben Tage sind, werden gelöscht (deine Entscheidung OF-01/OF-02 aus der Absicht).

**Was kann schiefgehen?** Drei Dinge. Erstens: Das Backend schreibt das Bild, aber die Antwort erreicht den Browser nicht (etwa langsames Handy-Netz) — dann steht unter dem Feld „Screenshot-Paste fehlgeschlagen: Keine Antwort vom Backend", der Pfad fehlt im Text, und du fügst noch einmal ein; die verwaiste Datei räumt der Sieben-Tage-Lauf weg. Damit das selten passiert, bekommt dieses eine Anfrage-Ereignis 60 Sekunden Geduld statt der üblichen 15. Zweitens: Der Terminal-Code wird an zwei kleinen Stellen umgebaut (Erkennung, Umwandlung des Bilds für den Versand); das Verhalten bleibt gleich, die vorhandenen Backend-Tests des Terminal-Einfügens laufen weiter und beweisen das. Drittens: Ob Claude Code einen Bildpfad in der *ersten* Eingabe genauso als Bild liest wie beim Tippen im Terminal, ist eine Annahme (AN-01); die Abnahme mit einem echten Screenshot am Mac prüft sie. Rückgängig ist alles per Revert der einen PR; es werden keine Bestandsdaten angefasst.

**Was musst du entscheiden?** Eine Sache: Die Ablage der Bilder ist eine Datenhaltungs-Entscheidung, und die Regeln des Repos verlangen dafür ein kurzes ADR. Ich schlage vor, ADR-0005 (Ablage im Laufzeitordner, Löschfrist sieben Tage, Grund gegen die Alternativen) mitzuliefern — etwa 30 Zeilen. Wenn dir das zu viel Papier ist, sag es; dann bleibt nur die neue Zeile in `docs/architecture.md` §3 und `docs/security.md` §1. Sonst: Freigabe reicht.

## Details

<!-- leser: mensch -->

<!-- Volle technische Tiefe: Dateien, Funktionen, Datenmodell, Tradeoffs, Testplan. Geht an Reviewer und in die Bausitzung, muss für sich stehen.
     Confidence-Tags in beiden Teilen: [Certain] harte Belege · [Likely] starke Inferenz · [Uncertain] Vermutung. -->

### 1. Kurzfassung

<!-- leser: mensch -->

Das Textfeld von `aos-neue-absicht` bekommt einen `paste`-Lauscher; erkennt er ein Bild, schickt er es über eine neue WebSocket-Anfrage `vorhaben:absicht-bild` an das Backend, das mit der aus dem Terminal herausgezogenen Prüf- und Ablagefunktion die Datei unter `<runtime>/intent-paste/` schreibt und den absoluten Pfad zurückgibt; der Browser fügt ` <pfad> ` an der Cursorstelle ein, und der Text geht wie heute als `firstInput` in die Sitzung. Beim Backend-Start löscht ein Aufräumlauf Dateien dort, die älter als sieben Tage sind. Am Ende gibt es zwei gemeinsame Hilfsmodule (Browser: Bild-Erkennung und Base64; Backend: Validierung, Schreiben, Aufräumen), die Terminal und „Neue Absicht" beide benutzen — keine zweite MIME-Liste, keine zweite Größengrenze (RB-04).

### 2. Ausgangslage im Code

<!-- leser: agent -->

| Bereich | Heute (Datei:Zeile) | Bedeutung für dieses Vorhaben |
|---|---|---|
| Textfeld „Neue Absicht" | `ui/frontend/src/components/vorhaben/aos-neue-absicht.ts:205-213` (`<textarea>` mit `@input`, `@keydown`), `:164-178` (`onInput`, `onKeydown`, `bereit`), `:180-196` (`start()` → `vorhabenService.startStep(…, { firstInput: text })`), `:225` (`.fehler`-Zeile) | [Certain] muss geändert werden: `@paste`, Upload-Zustand, Hinweiszeile, `bereit` um `!uploading`; `start()` bleibt |
| Terminal-Einfügen, Browser | `ui/frontend/src/components/aos-terminal.ts:449-455` (Capture-`paste`-Listener), `:811-838` (`_handleCloudPasteEvent`: `files` zuerst, dann `items`, MIME gegen `ALLOWED_PASTE_IMAGE_MIME`), `:841-880` (`_uploadClipboardImageBlob`: Größe, `_pasteInFlight`, Statusmeldungen, `gateway.send`), `:882-894` (`_blobToBase64`), `:620-636` (Saved-/Error-Handler), `:1130-1136` (`_showPasteStatus` → `show-toast`) | [Certain] wiederverwendbar: Erkennung und Base64 werden in `utils/clipboard-image.ts` herausgezogen; die Meldungstexte werden übernommen (AK-03). Falle: `_uploadClipboardImageBlob` ist an `terminalSessionId` und Gateway-Events gebunden — nicht wiederverwendbar, nur die zwei reinen Teile |
| Terminal-Einfügen, Backend | `ui/src/server/services/cloud-terminal-manager.ts:76-83` (`PASTE_MIME_TO_EXT`), `:86-91` (`PasteImageError`), `:1402-1451` (`savePastedImage`: Session aktiv?, MIME, leer, Größe, `mkdir 0700`, `img-<uuid>.<ext>` mit `0600`, Pfad in die PTY), `:1263-1268` (`closeSession` löscht `paste/<sessionId>`) | [Certain] wiederverwendbar nach Extraktion: MIME→Ext, Fehlerklasse, Dekodieren/Prüfen/Schreiben wandern nach `utils/paste-image.ts`; `savePastedImage` behält Session-Prüfung und PTY-Schreiben. Falle: die Session-Löschung räumt nur `paste/<sessionId>` — der neue Ordner darf nicht darunter liegen (AK-07) |
| WS-Handler Terminal-Paste | `ui/src/server/websocket.ts:489-491` (Dispatch), `:2683-2727` (`handleCloudTerminalPasteImage`: Pflichtfelder, `savePastedImage`, `paste-image-saved` / `cloud-terminal:error` mit `code`) | [Certain] Muster für Fehlercodes; bleibt unverändert (NZ-05) |
| Protokoll Terminal | `ui/src/shared/types/cloud-terminal.protocol.ts:708-712` (`MAX_PASTE_IMAGE_BYTES` 10 MB, `ALLOWED_PASTE_IMAGE_MIME` png/jpeg/gif/webp/heic/heif), `:778-783` (`PASTE_IMAGE_FAILED/TOO_LARGE/UNSUPPORTED_TYPE`) | [Certain] einzige Quelle für Bildarten und Grenze (RB-04); wird nur importiert |
| Laufzeitpfade | `ui/src/server/utils/runtime-paths.ts:35-37` (`getRuntimeDir`), `:52-54` (`getPasteImageRoot` = `<runtime>/cloud-terminal/paste`), Kommentar `:44-51` (warum nicht `/tmp`) | [Certain] neue Funktion `getIntentPasteImageRoot()` = `<runtime>/intent-paste` daneben (RB-03) |
| Vorhaben-WS-Dispatch | `ui/src/server/websocket.ts:354-370` (Liste der `vorhaben:*`-Typen → `vorhabenHandler.handle`), `ui/src/server/services/vorhaben-handler.ts:44-59` (`VORHABEN_MESSAGE_TYPES`), `:97-103` (Konstruktor), `:199-228` (`start-step` mit `firstInput`-Validierung: `cleanText`, 1…8000), `:373-385` (`project()` = Projekt muss offen sein), `:387-396` (`fromError`/`error`) | [Certain] neue Nachricht wird hier eingehängt: Projekt offen (Zugriffsbegrenzung), Felder geprüft, Fehlercode aus `PasteImageError` |
| Vorhaben-Protokoll | `ui/src/shared/types/vorhaben.protocol.ts:257` (`FREITEXT_MAX_CHARS` 8000), `:441-465` (`VorhabenStartStepMessage`), `:584-604` (`VorhabenErrorCode`-Union), `:608-614` (`VorhabenErrorMessage`) | [Certain] zwei neue Nachrichten, drei neue Codes; kein Konsument mappt die Union erschöpfend (`grep -rn "Record<VorhabenErrorCode"` leer) |
| Frontend-Service | `ui/frontend/src/services/vorhaben.service.ts:156-173` (`startStep`), `:229-232` (`request`), `:240-267` (`gatewayRequest`, fester Timeout `REQUEST_TIMEOUT_MS` = 15 s, `:42`) | [Certain] neue Methode `pasteAbsichtBild`; Falle: 15 s reichen für 10 MB über Handy-Netz nicht sicher → optionaler `timeoutMs` |
| Erste Eingabe | `ui/src/server/services/vorhaben-service.ts:695` (`setFirstInput`), `:897-903` (`deliverFirstInput` → `sendToSession`), `:517-560` (`sendToSession`: Text unverändert als Bracketed Paste), `:164-167` (`cleanText`: Zeilenenden, Steuerzeichen, Endleerzeichen) | [Certain] der Pfad passiert unverändert (keine Steuerzeichen, Leerzeichen innen bleiben); nichts zu ändern (NZ-05, AK-05) |
| Backend-Start | `ui/src/server/websocket.ts:116-126` (Service-Verdrahtung), `:139-160` (`bootWorkspace`: `whenReady` → Stores laden → `pruneSessionNames` → `vorhabenService.start()`) | [Certain] Aufräumlauf AK-08 hängt sich hier ein, nach demselben Muster wie `pruneSessionNames` (Zähler ins Log) |
| Tests | `ui/tests/unit/aos-neue-absicht.test.ts` (happy-dom, `vorhabenService` gemockt, `settle()`-Helfer), `ui/tests/unit/cloud-terminal-paste-image.test.ts` (`savePastedImage`: Codes, Datei, PTY-Schreiben), `ui/tests/unit/vorhaben-service-stage4.test.ts:82-127` (echter `VorhabenHandler` mit `FakeManager`, `:231` Handler-Aufruf `start-step`), `ui/tests/known-failures.txt` (`aos-terminal.test.ts` bekannt rot) | [Certain] Muster vorhanden. happy-dom 20.4 hat `ClipboardEvent`, `DataTransfer.items.add(File)`, `FileReader` (`ui/node_modules/happy-dom/lib/event/events/ClipboardEvent.d.ts`, `lib/event/DataTransferItemList.d.ts`, `lib/file/FileReader.d.ts` im Hauptcheckout) — [Likely] `readAsDataURL` liefert dort Base64; sonst `blobToBase64` im Test mocken |
| Worktree | `ui/node_modules` fehlt im Worktree (Memory: `npm ci` in `ui/` und `ui/frontend/`, `chmod +x ui/node_modules/node-pty/prebuilds/*/spawn-helper`) | [Certain] Vorbereitung der Bausitzung (§10) |
| Laufzeitordner gitignored | `ui/.gitignore:29-30` (`runtime/`) | [Certain] RB-02 erfüllt ohne Änderung |
| Board | Vault-Board `Specwright — Backlog Board.md` (Stand 17.09.): keine Karte zu INT-2026-020 | [Certain] Karte „neu" im Block „Für das Board" nach dem Build |

### 3. Entwurf

<!-- leser: agent -->

#### Ansatz

<!-- leser: agent -->

**Browser.** `aos-neue-absicht.ts` bekommt `@paste=${this.onPaste}` am `<textarea>`. `onPaste` ruft `findClipboardImage(e.clipboardData, CLOUD_TERMINAL_CONFIG.ALLOWED_PASTE_IMAGE_MIME)` (neues `utils/clipboard-image.ts`, Logik 1:1 aus `aos-terminal.ts:816-830`, Rückgabe `{ file, allowed } | null` — bevorzugt die erste erlaubte Datei, sonst die erste `image/*`-Datei). Kein Bild → nichts tun, der Browser fügt Text ein (AK-02). Bild → `e.preventDefault()`; nicht erlaubte Art → Hinweis `Bildart nicht unterstützt: <mime>` (AK-04); zu groß (`MAX_PASTE_IMAGE_BYTES`) → Hinweis `Screenshot ist zu groß (x MB, Limit 10 MB)` wie `aos-terminal.ts:851-854` (AK-04). Sonst `uploading = true`, Hinweis `Screenshot wird hochgeladen…`, Cursorposition (`selectionStart/End`) merken, `blobToBase64(file)` (aus dem Util), `vorhabenService.pasteAbsichtBild(projectId, base64, file.type)`; bei Erfolg ` ${absolutePath} ` an der gemerkten Stelle in `this.text` einsetzen (Positionen auf die aktuelle Textlänge geklemmt), nach `updateComplete` Caret hinter das Token, Hinweis `Screenshot eingefügt` (AK-01, AK-03). Fehler: `Screenshot konnte nicht gelesen werden: …` (FileReader) bzw. `Screenshot-Paste fehlgeschlagen: <message>` (Backend/Timeout), Text unverändert (AK-03, AK-04). `finally uploading = false`. `bereit` wird `… && !this.uploading` — damit sind Knopf und Cmd+Enter gesperrt (AK-06; `onKeydown` ruft `start()`, das `bereit` prüft, `:169-181`). Die Hinweiszeile ist ein `<div class="hinweis" data-art="info|success|error" role="status|alert">` unter dem Feld; `onInput` löscht sie (nur Anzeige, kein Zustand im Backend — AR-05 betrifft Nutzerzustand, eine Statusmeldung ist keiner).

**Frontend-Service.** `vorhaben.service.ts`: `pasteAbsichtBild(projectId, base64, mimeType): Promise<{ absolutePath: string }>` über `request('vorhaben:absicht-bild-saved', { type: 'vorhaben:absicht-bild', projectId, base64, mimeType }, 'vorhaben:error', 60_000)`. `request`/`gatewayRequest` bekommen einen optionalen `timeoutMs` (Standard bleibt `REQUEST_TIMEOUT_MS`).

**Protokoll.** `vorhaben.protocol.ts`: `VorhabenAbsichtBildMessage { type: 'vorhaben:absicht-bild'; requestId?; projectId; base64; mimeType }`, `VorhabenAbsichtBildSavedMessage { type: 'vorhaben:absicht-bild-saved'; requestId?; absolutePath }`; `VorhabenErrorCode` um `'PASTE_IMAGE_FAILED' | 'PASTE_IMAGE_TOO_LARGE' | 'PASTE_IMAGE_UNSUPPORTED_TYPE'` (dieselben Strings wie `CLOUD_TERMINAL_ERROR_CODES`, damit die Meldungen gleich bleiben, Z-02).

**Backend, gemeinsames Modul.** Neues `ui/src/server/utils/paste-image.ts`: `PASTE_MIME_TO_EXT` (aus `cloud-terminal-manager.ts:76-83`), `PasteImageError` (aus `:86-91`, exportiert), `persistPastedImage(dir, base64, mimeType): Promise<string>` (MIME→Ext sonst `PASTE_IMAGE_UNSUPPORTED_TYPE`; `Buffer.from(base64,'base64')`; leer → `PASTE_IMAGE_FAILED`; `> MAX_PASTE_IMAGE_BYTES` → `PASTE_IMAGE_TOO_LARGE`; `mkdir {recursive, mode 0o700}`; `img-<uuid>.<ext>` mit `0o600`; gibt den absoluten Pfad zurück — Reihenfolge und Texte 1:1 aus `:1420-1447`), `INTENT_PASTE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000`, `pruneOldImages(dir, maxAgeMs, now = Date.now()): Promise<number>` (nur reguläre Dateien direkt im Ordner, `mtimeMs < now - maxAgeMs` → `rm`; `ENOENT` des Ordners → 0; Fehler je Datei loggen, weiterlaufen). `cloud-terminal-manager.ts` importiert diese drei und `savePastedImage` wird: Session-Prüfungen (`:1408-1419`) → `const absolutePath = await persistPastedImage(path.join(getPasteImageRoot(), sessionId), base64, mimeType)` → PTY-Schreiben (`:1449-1450`) → `lastActivity`. Codes und Meldungen unverändert; `cloud-terminal-paste-image.test.ts` bleibt grün (Nachweis NZ-05).

**Backend, Pfad.** `runtime-paths.ts`: `getIntentPasteImageRoot(): string` = `join(getRuntimeDir(), 'intent-paste')` — bewusst *nicht* unter `getPasteImageRoot()`, weil `closeSession` (`cloud-terminal-manager.ts:1263-1268`) dort `paste/<sessionId>` löscht (AK-07).

**Backend, Handler.** `vorhaben-handler.ts`: Typ `'vorhaben:absicht-bild'` in `VORHABEN_MESSAGE_TYPES`; neuer `case`: `project(message, reply, requestId)` (Projekt muss offen sein → `UNKNOWN_PROJECT`, sonst Zugriffsbegrenzung RB-01), `base64`/`mimeType` müssen Strings sein (`INVALID_MESSAGE`); `persistPastedImage(this.bildRoot, base64, mimeType)` → `reply({ type: 'vorhaben:absicht-bild-saved', requestId, absolutePath })`; `catch`: `PasteImageError` → `this.error(err.code as VorhabenErrorCode, err.message, requestId)`, sonst `fromError`. Konstruktor bekommt ein fünftes, optionales Argument `opts: { bildRoot?: string } = {}` → `this.bildRoot = opts.bildRoot ?? getIntentPasteImageRoot()`; `websocket.ts:126` übergibt `{ bildRoot: getIntentPasteImageRoot() }` (Muster: `getVorhabenStatePath()` wird in `:115` ebenfalls von außen gegeben). `websocket.ts:354-370` bekommt den neuen `case`.

**Backend, Aufräumen.** `websocket.ts` `bootWorkspace()` nach `vorhabenStore.load()`: `const n = await pruneOldImages(getIntentPasteImageRoot(), INTENT_PASTE_MAX_AGE_MS); if (n > 0) console.log(`[WebSocket] intent-paste: pruned ${n} image(s) older than 7 days`)` — im selben `try`/`catch`-Rahmen wie die Store-Ladungen, ein Fehler dort bricht den Start nicht ab (AK-08).

**Sicherheit (security.md §6, RB-01).** Neuer Eingang ist eine WebSocket-Nachricht, kein HTTP-Endpunkt (NZ-04). Zugriffsbegrenzung: Netzebene wie die ganze UI (§2) plus `projectId` muss ein offenes Projekt sein. Eingabevalidierung: `mimeType` gegen die Allowlist → Dateiendung kommt aus der Map, nie vom Client; kein Dateiname vom Client; Base64 dekodiert, leer und > 10 MB abgelehnt; Ablageort fest unter `<runtime>`. Datenklasse der Antwort: `absolutePath` ist ein Host-Pfad unter dem Laufzeitordner → intern, geht nur über dieselbe netzbegrenzte Verbindung wie heute `cloud-terminal:paste-image-saved`. Datenklasse der Datei: intern (RB-02), `0600`, Löschfrist 7 Tage. Kein externes System, keine personenbezogenen Daten über das hinaus, was ein Screenshot zeigt (Projektinhalte, `security.md` §1 „personenbezogen").

#### Verworfene Alternativen

<!-- leser: agent -->

| Alternative | Warum nicht |
|---|---|
| Sitzung sofort beim Einfügen starten und den Terminal-Weg (`cloud-terminal:paste-image`) nutzen | Kehrt den Ablauf um: die Sitzung liefe, bevor der Text fertig ist; das Modell wäre schon gewählt; „Starten" verlöre seinen Sinn (FA-10/FA-11 der Seite). Außerdem trifft der Pfad dann den Startbildschirm (INT-2026-010 Plan §3 „Erste Eingabe" — genau deshalb wartet der Text auf den ersten Stop). |
| Bild als Base64 im `firstInput` mitschicken, Backend legt es beim Start ab | `firstInput` ist auf 8000 Zeichen begrenzt (RB-05) und ein Text; 13 MB Base64 im Nutzerzustand (`vorhaben-<port>.json`, ADR-0002) wären eine neue Datenart dort. Der Pfad ist zudem die Darstellung, die der Nutzer im Feld sieht (NZ-02). |
| Ablage unter `getPasteImageRoot()/<projectId>` oder `/absicht` | `closeSession` löscht `paste/<sessionId>` — ein Nachbarordner wäre heute sicher, aber die Regel „alles unter `paste/` gehört einer Sitzung" bräche; AK-07 verlangt einen Ort, den kein Sitzungsende berührt. |
| Bild nach der Zustellung sofort löschen | PO-Entscheidung OF-02: bleibt bis zur Frist; Claude liest die Datei erst, wenn der Turn läuft, und ein Re-Send (`FIRST_INPUT_MAX_VERSUCHE`) braucht sie noch. |
| Aufräumen per Timer im laufenden Betrieb | AK-08 sagt „beim Backend-Start"; der Cloud-Host startet bei jedem Merge neu, der Mac täglich — reicht, kein Timer-Zustand. |
| HTTP-Upload (`POST /api/…`) | NZ-04; `/api/images` wurde am 16.09. bewusst entfernt (`security.md` Änderungsprotokoll). |
| Erkennung und Base64 im Terminal lassen und in `aos-neue-absicht` duplizieren | 25 Zeilen doppelt, zwei Stellen für dieselbe Regel — gegen „vier Schreiber = eine Funktion" (`plan.md`-Grundsätze). |

#### Architektur-Auswirkung

<!-- leser: agent -->

- **AR-Regeln: Nein** — AR-04 (kein Projektpfad hart kodiert; der Ablageort ist ein Laufzeitpfad über `runtime-paths.ts`), AR-05 (kein Nutzerzustand im Browser; die Hinweiszeile ist flüchtige Anzeige), AR-06 (nur UI), AR-07 (nichts im Repo-Root). ADR-0004 unberührt (kein Transkript-Leser).
- **§3 Datenbesitz: Ja, neue Zeile** — Datenobjekt „Bilder aus „Neue Absicht"" · Besitzer UI-Backend · Speicher `<runtime>/intent-paste/img-<uuid>.<ext>` (`0600`) · andere lesen über den absoluten Pfad in der ersten Eingabe der Sitzung · pro Backend-Instanz/Host · Löschfrist 7 Tage beim Start. `docs/architecture.md` §3 und Änderungsprotokoll **in dieser PR**; `docs/security.md` §1 (Tabelle Datenobjekt/Klasse/Speicherort/Löschfrist) ebenfalls.
- **ADR: ja, kurz** — `docs/adr/0005-bilder-aus-neue-absicht-im-laufzeitverzeichnis.md` (Datenhaltung → ADR-Pflicht laut `CLAUDE.md` und Plan-Grundsätzen): Kontext (Bild ohne Sitzung), Entscheidung (eigener Ordner unter `<runtime>`, 7 Tage, Aufräumen beim Start, gemeinsame Ablagefunktion mit dem Terminal), Alternativen aus der Tabelle oben, Belege. D1 entschieden mit der Freigabe (18.09.): ADR-0005 wird geschrieben.

### 4. Änderungen

<!-- leser: agent -->

| # | Datei / Komponente | Art | Was | Herkunft |
|---|---|---|---|---|
| 1 | `ui/src/server/utils/paste-image.ts` | neu | `PASTE_MIME_TO_EXT`, `PasteImageError`, `persistPastedImage(dir, base64, mimeType)`, `INTENT_PASTE_MAX_AGE_MS`, `pruneOldImages(dir, maxAgeMs, now?)` | AK-01, AK-04, AK-08, RB-04 |
| 2 | `ui/src/server/services/cloud-terminal-manager.ts` | ändern | `:76-91` entfernen, aus #1 importieren; `savePastedImage` (`:1420-1447`) ruft `persistPastedImage`; Session-Prüfung und PTY-Schreiben bleiben | RB-04, NZ-05 |
| 3 | `ui/src/server/utils/runtime-paths.ts` | ändern | `getIntentPasteImageRoot()` = `<runtime>/intent-paste` mit Kommentar (nicht unter `paste/`, Löschfrist) | AK-07, RB-03 |
| 4 | `ui/src/shared/types/vorhaben.protocol.ts` | ändern | `VorhabenAbsichtBildMessage`, `VorhabenAbsichtBildSavedMessage`; `VorhabenErrorCode` + 3 Codes | AK-01, AK-04 |
| 5 | `ui/src/server/services/vorhaben-handler.ts` | ändern | Typ in `VORHABEN_MESSAGE_TYPES`; `case 'vorhaben:absicht-bild'`; Konstruktor-Option `bildRoot` | AK-01, AK-04, RB-01 |
| 6 | `ui/src/server/websocket.ts` | ändern | `case 'vorhaben:absicht-bild'` in der Vorhaben-Liste (`:354-370`); `bildRoot` an den Handler (`:126`); `pruneOldImages` in `bootWorkspace` (`:139-160`) | AK-01, AK-08 |
| 7 | `ui/frontend/src/utils/clipboard-image.ts` | neu | `findClipboardImage(dt, allowed)`, `blobToBase64(blob)` | AK-01, AK-02, RB-04 |
| 8 | `ui/frontend/src/components/aos-terminal.ts` | ändern | `_handleCloudPasteEvent` (`:816-830`) nutzt `findClipboardImage` (bei `!allowed` weiter wie heute: kein `preventDefault`), `_blobToBase64` (`:882-894`) durch Import ersetzt; Verhalten unverändert | RB-04, NZ-05 |
| 9 | `ui/frontend/src/services/vorhaben.service.ts` | ändern | `pasteAbsichtBild(projectId, base64, mimeType)` mit 60 s; `request`/`gatewayRequest` optionaler `timeoutMs` | AK-01, AK-03 |
| 10 | `ui/frontend/src/components/vorhaben/aos-neue-absicht.ts` | ändern | `@paste`, `onPaste`, `bildEinfuegen`, `uploading`, `hinweis`, `bereit`, Hinweiszeile + CSS | AK-01…AK-06 |
| 11 | `ui/tests/unit/vorhaben-absicht-bild.test.ts` | neu | Handler (Ablage, Codes, Projektprüfung, Pfad nicht unter `paste/`), `pruneOldImages` | AK-01, AK-04, AK-07, AK-08, RB-01 |
| 12 | `ui/tests/unit/vorhaben-service-stage4.test.ts` | ändern (ergänzen) | ein `it`: `firstInput` mit Bildpfad kommt beim ersten Stop unverändert an | AK-05 |
| 13 | `ui/tests/unit/aos-neue-absicht.test.ts` | ändern (ergänzen) | `describe('INT-2026-020 Bild einfügen')`: AK-01…AK-06 | AK-01…AK-06 |
| 14 | `docs/architecture.md` | ändern | §3 neue Zeile, Änderungsprotokoll | §3 |
| 15 | `docs/security.md` | ändern | §1 Tabelle Datenobjekt (intern, `<runtime>/intent-paste/`, 7 Tage), Änderungsprotokoll | RB-01, RB-02 |
| 16 | `docs/adr/0005-bilder-aus-neue-absicht-im-laufzeitverzeichnis.md` | neu | kurzes ADR (D1) | §3 |
| 17 | `intent/INT-2026-020-bild-in-neue-absicht/design/` | neu | `e2e-protokoll.txt`, `ist/*.png` (Hinweiszeile, Pfad im Feld) | §8 |
| 18 | `intent/INT-2026-020-bild-in-neue-absicht/intent.md` | ändern | `bezuege.plan`, `bezuege.adr`, Status nach Build | Workflow |

**Nicht betroffen (ausdrücklich):** `cloud-terminal.protocol.ts` (Konfiguration wird nur gelesen), `handleCloudTerminalPasteImage` in `websocket.ts:2683-2727`, `vorhaben-service.ts` (`setFirstInput`, `deliverFirstInput`, `sendToSession` — NZ-05), `vorhaben-state.ts` (kein neuer Zustand, ADR-0002 unverändert), `aos-naechster-schritt.ts`, Anmerkungs-Editor (NZ-01), `specwright/manifest.tsv` (keine Lieferumfangs-Datei; `ui/` ist nicht im Manifest — [Certain]: `grep -c "^ui/" specwright/manifest.tsv` = 0 prüfen in Schritt 0), Installer, Hooks.

### 5. Verbindungen

<!-- leser: agent -->

| Von | Nach | Art | Schnittstelle | Nachweis (Befehl) | Teil |
|---|---|---|---|---|---|
| `aos-neue-absicht.ts` | `utils/clipboard-image.ts` | Import | `findClipboardImage`, `blobToBase64` | `grep -n "clipboard-image" ui/frontend/src/components/vorhaben/aos-neue-absicht.ts ui/frontend/src/components/aos-terminal.ts` (2 Treffer) | — |
| `aos-neue-absicht.ts` | `vorhaben.service.ts` | Aufruf | `vorhabenService.pasteAbsichtBild(projectId, base64, mimeType)` | `grep -n "pasteAbsichtBild" ui/frontend/src -r` (Definition + Aufruf) | — |
| `vorhaben.service.ts` | Backend | WS-Anfrage/Antwort | `vorhaben:absicht-bild` → `vorhaben:absicht-bild-saved` / `vorhaben:error` | `grep -rn "vorhaben:absicht-bild" ui/src ui/frontend/src` (Protokoll, Service, Handler, websocket.ts) | — |
| `websocket.ts` | `vorhaben-handler.ts` | Dispatch | `case 'vorhaben:absicht-bild'` → `vorhabenHandler.handle` | `grep -n "vorhaben:absicht-bild" ui/src/server/websocket.ts ui/src/server/services/vorhaben-handler.ts` | — |
| `vorhaben-handler.ts` | `utils/paste-image.ts` | Import | `persistPastedImage`, `PasteImageError` | `grep -n "paste-image" ui/src/server/services/vorhaben-handler.ts` | — |
| `cloud-terminal-manager.ts` | `utils/paste-image.ts` | Import | `persistPastedImage`, `PasteImageError`, `PASTE_MIME_TO_EXT` | `grep -n "paste-image" ui/src/server/services/cloud-terminal-manager.ts` und `grep -c "PASTE_MIME_TO_EXT = " ui/src/server/services/cloud-terminal-manager.ts` = 0 | — |
| `websocket.ts` (`bootWorkspace`) | `utils/paste-image.ts` | Aufruf | `pruneOldImages(getIntentPasteImageRoot(), INTENT_PASTE_MAX_AGE_MS)` | `grep -n "pruneOldImages" ui/src/server/websocket.ts` | — |
| `websocket.ts` / `vorhaben-handler.ts` | `runtime-paths.ts` | Import | `getIntentPasteImageRoot()` | `grep -rn "getIntentPasteImageRoot" ui/src` (Definition + 2 Aufrufer) | — |
| Textfeld | Sitzung | bestehend | `firstInput` → `setFirstInput` → `deliverFirstInput` → Bracketed Paste | Test #12 (`vorhaben-service-stage4.test.ts`), E2E §8 | — |

- [x] Jede neue Komponente hat mindestens eine Verbindung (`paste-image.ts`: 3 Aufrufer; `clipboard-image.ts`: 2).
- [x] Jeder Nachweis ist ein ausführbarer Befehl.

### 6. Reihenfolge der Arbeit

<!-- leser: agent -->

0. Lesende Vorprüfung: `grep -rn "PASTE_MIME_TO_EXT\|PasteImageError\|_blobToBase64\|_handleCloudPasteEvent" ui/src ui/frontend/src ui/tests` → nur `cloud-terminal-manager.ts`, `aos-terminal.ts` (heute [Certain]); `grep -rn "Record<VorhabenErrorCode" ui/` leer; `grep -c "^ui/" specwright/manifest.tsv` = 0; Worktree vorbereiten (`npm ci` in `ui/` und `ui/frontend/`, `chmod +x ui/node_modules/node-pty/prebuilds/*/spawn-helper`) → `bash scripts/verify.sh --fast` grün als Ausgangsstand.
1. #1 `paste-image.ts` + #3 `getIntentPasteImageRoot` → `npx tsc --noEmit -p ui` grün.
2. #2 Manager auf das Modul umstellen → `npx vitest run tests/unit/cloud-terminal-paste-image.test.ts` grün (unverändert, NZ-05-Beweis).
3. #4 Protokoll, #5 Handler, #6 websocket.ts (Dispatch, `bildRoot`, Prune) → #11 Tests schreiben, rot → grün; #12 ergänzen → grün.
4. #7 `clipboard-image.ts`, #8 Terminal umstellen → `cd ui/frontend && npx tsc --noEmit` grün; `aos-terminal.test.ts` nicht schlechter als Bezugsliste.
5. #9 Service, #10 Komponente → #13 Tests rot → grün.
6. #14 architecture, #15 security, #16 ADR-0005 (falls D1 = ja), #18 intent-Bezüge.
7. Verbindungen nachweisen (Abschnitt 5) → Ausgabe in den PR.
8. `bash scripts/verify.sh` grün, E2E-Pfad (Abschnitt 8) mit Protokoll und Screenshots (#17).

### 7. Zerlegung

<!-- leser: agent -->

#### Variante A — nicht zerlegbar, eine Sitzung

<!-- leser: agent -->

Eine Sitzung: Backend-Modul, Handler und Frontend hängen über zwei neue Nachrichten und ein gemeinsames Modul zusammen (Abschnitt 5, 8 Verbindungen); Umfang 3–5 h — Worktrees brächten drei Vorbereitungen à `npm ci` für je 30 Minuten Arbeit.

#### Variante B — parallel in Worktrees

<!-- leser: agent -->

Entfällt.

### 8. Tests und Nachweis

<!-- leser: agent -->

| AK / FA | Test | Datei | Art |
|---|---|---|---|
| AK-01 | Paste mit PNG-`File` (Text „Vorher Nachher", Caret nach „Vorher") → Feld enthält ` /rt/intent-paste/img-1.png ` an der Stelle, `pasteAbsichtBild('p', <base64>, 'image/png')` aufgerufen, `defaultPrevented` | `ui/tests/unit/aos-neue-absicht.test.ts` | Unit (happy-dom) |
| AK-01 | Handler `vorhaben:absicht-bild` mit PNG-Base64 → `vorhaben:absicht-bild-saved` mit `absolutePath` unter `bildRoot`, Datei existiert, Inhalt gleich, Endung `.png`, Modus `0600` | `ui/tests/unit/vorhaben-absicht-bild.test.ts` | Unit |
| AK-02 | Paste nur mit Text (`setData('text/plain')`) → `defaultPrevented` false, Service nicht aufgerufen, Feld unverändert | `aos-neue-absicht.test.ts` | Unit |
| AK-03 | Während des Uploads (Promise offen) Hinweis „Screenshot wird hochgeladen…"; nach Erfolg „Screenshot eingefügt"; Backend-Fehler (`VorhabenRequestError('PASTE_IMAGE_TOO_LARGE','Image too large: …')`) → „Screenshot-Paste fehlgeschlagen: Image too large: …", Text unverändert | `aos-neue-absicht.test.ts` | Unit |
| AK-04 | `image/tiff` → „Bildart nicht unterstützt: image/tiff", kein Aufruf, Text unverändert; `File` mit `size` > 10 MB (per `Object.defineProperty`) → „Screenshot ist zu groß (…)", kein Aufruf | `aos-neue-absicht.test.ts` | Unit |
| AK-04 | Handler: `application/octet-stream` → `PASTE_IMAGE_UNSUPPORTED_TYPE`; 10 MB + 1 → `PASTE_IMAGE_TOO_LARGE`; leer → `PASTE_IMAGE_FAILED`; jeweils keine Datei im Ordner | `vorhaben-absicht-bild.test.ts` | Unit |
| AK-05 | Nach Paste „Starten" → `startStep` mit `firstInput`, das den Pfad enthält | `aos-neue-absicht.test.ts` | Unit |
| AK-05 | `start-step intent` mit `firstInput: 'Bitte ansehen: /rt/intent-paste/img-1.png danke'` → beim ersten Stop Bracketed Paste mit genau diesem Text | `ui/tests/unit/vorhaben-service-stage4.test.ts` | Unit |
| AK-06 | Während des Uploads: `button.start.disabled` true, Klick und Cmd+Enter rufen `startStep` nicht; nach Auflösung wieder frei | `aos-neue-absicht.test.ts` | Unit |
| AK-07 | `absolutePath` beginnt mit `getIntentPasteImageRoot()` und nicht mit `getPasteImageRoot()`; `rmSync(join(getPasteImageRoot(), 'irgendeine-session'), {recursive, force})` lässt die Datei stehen | `vorhaben-absicht-bild.test.ts` | Unit |
| AK-08 | `pruneOldImages`: Datei mit `utimes` 8 Tage alt gelöscht, 6 Tage alt bleibt, Unterordner bleibt, fehlender Ordner → 0 | `vorhaben-absicht-bild.test.ts` | Unit |
| AK-08 | Verdrahtung beim Start | `grep -n "pruneOldImages" ui/src/server/websocket.ts` (Abschnitt 5) | Nachweis |
| RB-01 | Handler: unbekanntes Projekt → `UNKNOWN_PROJECT`; fehlendes `base64`/`mimeType` → `INVALID_MESSAGE` | `vorhaben-absicht-bild.test.ts` | Unit |
| NZ-05 | Terminal-Ablage unverändert | `ui/tests/unit/cloud-terminal-paste-image.test.ts` (bestehend, unverändert grün) | Unit |

- **Verify-Befehl:** `bash scripts/verify.sh` — muss mit `verify: OK` enden, Ausgabe wird im PR zitiert. **CI ist die Wahrheit:** lokal grün zählt erst, wenn die PR-Checks grün sind. `ui/tests/known-failures.txt` wird nicht angefasst (`aos-terminal.test.ts` bleibt gelistet; `terminal-io.test.ts` auf dem Mac rot — CI entscheidet).
- **Datenkorrektur:** keine Bestandsdaten. Der Aufräumlauf löscht ausschließlich reguläre Dateien direkt in `<runtime>/intent-paste/`, die älter als 7 Tage sind — ein Ordner, der vor dieser PR nicht existiert.
- **Angeschlossen (E2E-Pfad):** Branch-Backend auf Port 3111 mit Scratch-Projekt (Memory `reference_cloud_terminal_e2e_playwright`), Playwright: `#/neu/<projekt>` öffnen → Text tippen, Caret setzen → per `page.evaluate` ein `ClipboardEvent('paste')` mit `DataTransfer` + PNG-`File` auf das `textarea` im Shadow-Root dispatchen → Hinweis „Screenshot wird hochgeladen…" dann „Screenshot eingefügt" → Feld enthält ` <runtime>/intent-paste/img-….png ` → Datei existiert auf Platte → „Starten" → Sitzung startet, beim ersten Stop erscheint der Text mit Pfad im Terminal (`el.terminal.buffer` prüfen) → Claude antwortet und beschreibt das Bild (AN-01; Screenshot des Terminals). Protokoll `intent/INT-2026-020-bild-in-neue-absicht/design/e2e-protokoll.txt`, Screenshots `design/ist/` (Hinweis unter dem Feld, Pfad im Feld, Terminal mit Antwort). Zusätzlich manuell: echter Cmd+V mit macOS-Screenshot (Abnahme, §10).
- **Bugfix:** entfällt (Feature).
- **UI:** kein Mock nötig (`docs/design.md` §6: keine neue Seite, kein neuer Ablauf, keine Navigation — eine Hinweiszeile unter einem bestehenden Feld, Muster „Fehler nach Aktion: inline mit Ursache" §4); Screenshot der drei Zustände (laden, Erfolg, Fehler) im PR.

### 9. Risiken

<!-- leser: mensch -->

| Risiko | Wahrscheinlichkeit | Wirkung | Gegenmaßnahme | Wer merkt es |
|---|---|---|---|---|
| R1 — Claude Code liest den Pfad in der **ersten Eingabe** (Bracketed Paste beim ersten Stop) nicht als Bild, obwohl es ihn beim Tippen im Terminal liest (AN-01) | niedrig [Likely: derselbe Paste-Weg wie eine Freitext-Antwort, und der Pfad steht als eigenes Token] | mittel: Feature wirkt, Bild kommt aber nicht an | E2E prüft die Antwort der Sitzung; Abnahme mit echtem Screenshot; falls rot: Rückfrage, nicht raten | Michael bei der Abnahme |
| R2 — Antwort erreicht den Browser nicht rechtzeitig (10 MB über Handy-Netz) → „Keine Antwort vom Backend", Datei liegt trotzdem | niedrig | niedrig: erneut einfügen; Datei wird nach 7 Tagen geräumt | eigener Timeout 60 s für diese Anfrage statt 15 s | Michael am Handy |
| R3 — Umbau von `aos-terminal.ts` (Erkennung, Base64) ändert das Terminal-Einfügen doch | niedrig | mittel: Screenshot-Paste im Terminal kaputt | reine Extraktion ohne Logikänderung; Backend-Test des Terminal-Pastes bleibt unverändert grün; manuelle Gegenprobe im Terminal (§10) | Michael beim nächsten Terminal-Paste |
| R4 — happy-dom liefert `FileReader.readAsDataURL` nicht wie der Browser → Frontend-Tests hängen | mittel [Uncertain] | niedrig: nur Testtechnik | im Test `blobToBase64` per `vi.mock` ersetzen; Erkennung bleibt echt getestet | Bausitzung |
| R5 — iPhone-Safari liefert beim Einfügen aus Fotos kein `File` im `paste`-Ereignis (AN-03) | mittel | niedrig: am Handy bleibt der Terminal-Weg | Abnahme am iPhone; Terminal nutzt denselben Mechanismus — funktioniert es dort, funktioniert es hier | Michael am Handy |
| R6 — Aufräumlauf löscht Falsches | sehr niedrig | hoch, falls Root falsch | nur reguläre Dateien direkt im festen Ordner `<runtime>/intent-paste/`, nie rekursiv, Test mit Unterordner; Pfad kommt aus `runtime-paths.ts`, nie aus einer Nachricht | Test AK-08 |

### 10. Manuelle Schritte

<!-- leser: mensch -->

| Schritt | Wer | Wann | Erledigt |
|---|---|---|---|
| Worktree vorbereiten: `cd ui && npm ci && cd frontend && npm ci`, dann `chmod +x ui/node_modules/node-pty/prebuilds/*/spawn-helper` (Memory `project_ui_test_baseline_worktree`) — Weg belegt: `CLAUDE.md` „Fehler, die Claude hier schon zweimal gemacht hat" | Agent (Bausitzung) | vor Umsetzung | [x] 18.09., `verify --fast` grün als Ausgangsstand |
| D1 entscheiden: ADR-0005 mitliefern (Vorschlag ja) oder nur Docs-Zeilen — entschieden: ja (Freigabe ohne Einspruch, 18.09.) | PO | mit der Freigabe | [x] |
| Abnahme am Mac: echter macOS-Screenshot (Cmd+Ctrl+Shift+4) → Cmd+V auf „Neue Absicht" → Starten → Claude beschreibt das Bild (AN-01) | Michael | vor Merge | [ ] |
| Abnahme am iPhone: Foto in Fotos kopieren → Einfügen im Feld (AN-03); Ergebnis in `plan.md` §14 eintragen (auch wenn es nicht geht — dann bleibt der Terminal-Weg, NZ ergänzen) | Michael | vor Merge | [ ] |
| Gegenprobe Terminal-Paste (R3): Screenshot in einer laufenden Sitzung einfügen, Pfad erscheint, „Screenshot eingefügt" | Michael | vor Merge | [ ] |
| PR #79 (https://github.com/michsindlinger/specwright/pull/79) — Merge nach `main` → Auto-Deploy der UI auf dem Cloud-Host (Weg: `.github/workflows/verify.yml` als Tor, Deploy-Timer außerhalb des Repos, `docs/architecture.md` §5); Hook `production-gate` nicht betroffen (kein `deploy`+`prod`-Befehl) | Michael | Merge | [ ] |
| Board: Karte „neu" anlegen und nach Build nach „✅ Erledigt" (Block „Für das Board" im Abschlussbericht, eigene Sitzung mit `obsidian-po-board`) | Agent (eigene Sitzung) | nach Merge | [ ] |

Keine Secrets, keine Migration, keine Bestandsdaten.

### 11. Schätzung

<!-- leser: mensch -->

3–5 h in einer Sitzung: Backend-Modul + Manager-Umbau + Handler + Tests ≈ 1,5 h; Frontend-Util + Terminal-Umbau + Komponente + Tests ≈ 1,5 h; Docs/ADR ≈ 0,5 h; E2E mit Branch-Backend, Screenshots, Protokoll ≈ 1 h. Unsicherheit: happy-dom-Verhalten bei `FileReader` (R4, bis 30 min) und ob die erste Eingabe das Bild erreicht (R1 — wenn nicht, Stopp und Rückfrage statt Nachbesserung).

### 12. Review des Plans

<!-- leser: mensch -->

| Finding | Quelle | Entscheidung | Änderung am Plan |
|---|---|---|---|
| Finding 1, Timeout: die Vorhaben-Anfragen haben fest 15 s (`vorhaben.service.ts:42`), ein 10-MB-Upload über Tailscale vom Handy kann länger dauern — der Nutzer sähe einen Fehler, obwohl das Backend die Datei schreibt | Self | angenommen: optionaler `timeoutMs` in `request`/`gatewayRequest`, 60 s für diese eine Anfrage | §3 Ansatz, §4 #9, §9 R2 |
| Finding 2, nicht erlaubte Bildart: das Terminal lässt eine `image/tiff`-Datei stumm durchfallen (`aos-terminal.ts:832`), AK-04 verlangt aber eine Ablehnung mit Grund | Self | angenommen: `findClipboardImage` liefert `{ file, allowed }`; „Neue Absicht" meldet den Grund, das Terminal verhält sich weiter wie heute (NZ-05) | §3 Ansatz, §8 AK-04 |
| Finding 3, Ablageort unter `paste/`: ein Nachbarordner von `paste/<sessionId>` wäre heute sicher, aber die Sitzungs-Löschregel würde eine Ausnahme bekommen | Self | angenommen: eigener Root `<runtime>/intent-paste` (AK-07 wörtlich: kein Sitzungsende berührt ihn) | §3, §4 #3 |
| Finding 4, `VorhabenErrorCode`-Union erweitern könnte einen erschöpfenden `switch` oder ein `Record<VorhabenErrorCode, …>` brechen | Self | geprüft, kein Befund: `grep -rn "Record<VorhabenErrorCode" ui/` leer, Konsumenten nutzen nur `code`/`message` | §2, §6 Schritt 0 |
| Finding 5, AK-08 „beim Backend-Start" ist in `websocket.ts` nicht unit-testbar | Self | angenommen mit Teilung: Funktion `pruneOldImages` unit-getestet (alt/jung/Unterordner/fehlend), Verdrahtung per grep-Nachweis in §5 | §5, §8 |
| Finding 6, Feature-Preservation: `aos-terminal.ts` wird angefasst, obwohl NZ-05 „keine Änderung am Terminal-Einfügen" sagt | Self | angenommen mit Begründung: NZ-05 meint das Verhalten; die Extraktion ändert keine Regel; Beweis = unveränderter Backend-Test + manuelle Gegenprobe (§10) | §4 #8, §9 R3 |
| Finding 7, ADR-Pflicht bei Datenhaltung vs. „Größe S" | Self | D1 entschieden: ADR-0005 (kurz) — Freigabe 18.09. ohne Einspruch gegen den Vorschlag | §3, §10 |
| Finding 8, Kennung: `INT-2026-017` war beim Freigabe-Commit schon an „Projektname im Kopf" vergeben (`feat/INT-2026-017-projektname-im-kopf`, 17.09. 21:03, auf `origin`); 018/019 auf weiteren Branches | Self (vor dem Commit, `git for-each-ref` + `ls-tree intent/`) | angenommen: Vorhaben heißt `INT-2026-020`, Ordner umbenannt, Inhalt unverändert; Lehre für `/intent`: Kennung gegen alle Branches prüfen, nicht nur gegen `main` | Kopf, §4 #17/#18, §8, §13 |

**Minimalinvasiv geprüft:** Wiederverwendet: Bildarten und Größengrenze aus `cloud-terminal.protocol.ts` (keine zweite Liste), Erkennungslogik und Base64 aus `aos-terminal.ts` (extrahiert, nicht kopiert), Validierung/Ablage aus `savePastedImage` (extrahiert), Request/Reply-Muster `gatewayRequest`, Handler-Muster mit `project()` und `error()`, Startmuster `bootWorkspace` mit `pruneSessionNames`, die bestehende Zustellung der ersten Eingabe (unverändert), happy-dom-Testmuster aus `aos-neue-absicht.test.ts`. Gestrichen: kein Vorschaubild, keine Bildliste, kein Drag-and-drop (NZ-02/NZ-03), kein Timer für das Aufräumen, kein neuer Zustand in `vorhaben-<port>.json`, kein HTTP-Endpunkt, kein Mock (design.md §6).

**Abgleich Mensch/Agent:** „In einfachen Worten", §9, §10, §12 gegen §2–§8 gelesen am 2026-09-18: ohne Befund — die fünf Aussagen des Mensch-Teils (Einfügen an der Cursorstelle, Sperre von „Starten", eigener Ordner + 7 Tage, Terminal unverändert, 60 s Geduld) haben je eine Zeile in §4 und einen Test in §8; D1 steht in beiden Teilen (R4).

### 13. Definition of Done

<!-- leser: agent -->

- [x] Jedes AK aus Abschnitt 8 hat einen grünen Test (AK-01…AK-08, RB-01): `vorhaben-absicht-bild.test.ts` (7), `aos-neue-absicht.test.ts` Block INT-2026-020 (6), `vorhaben-service-stage4.test.ts` AK-05 (1); NZ-05 `cloud-terminal-paste-image.test.ts` unverändert grün (6).
- [x] Alle Nachweise aus Abschnitt 5 ausgeführt und im PR zitiert (18.09.).
- [x] E2E-Pfad läuft (Abschnitt 8): `design/e2e-protokoll.txt`, `design/ist/01-laden.png`, `02-eingefuegt.png`, `03-fehler-bildart.png`, `04-sitzung-terminal.png`, `design/e2e-terminal-pane.txt` (AN-01: „Read 1 file", Bild beschrieben).
- [x] `verify` grün (lokal 41 s nach Rebase, Ausgabe im PR) und PR-Check grün (CI `verify` pass, 1m49s, Run 35307132076); `known-failures.txt` unverändert.
- [x] `docs/architecture.md` §3/§8 und `docs/security.md` §1 angepasst; ADR-0005 angelegt (D1 = ja).
- [x] Manuelle Schritte (Abschnitt 10): Worktree erledigt; Abnahmen Mac/iPhone/Terminal-Gegenprobe und Merge im PR als offen markiert.
- [x] Abweichungen von diesem Plan in Abschnitt 14 eingetragen.
- [x] 2x-Regel-Check: ein Fehler zum zweiten Mal (E2E-Deep-Walk-Selektor über eine Shadow-Grenze, siehe §14) → Vorschlag für `CLAUDE.md` im PR.
- [ ] Abschlussbericht nach R3 (nur Mensch-Abschnitte im Chat), endet mit dem Block „Für das Board" (Karte neu, Spalte, PR-Link, Stand, Verweis auf `intent/INT-2026-020-bild-in-neue-absicht/`); Nachziehen in eigener Sitzung.

### 14. Abweichungen bei der Umsetzung

<!-- leser: mensch -->

| Datum | Abweichung | Grund | Auswirkung auf Abschnitt |
|---|---|---|---|
| 2026-09-18 | R4 trat nicht ein: happy-dom 20.4 liefert `FileReader.readAsDataURL` mit Base64; `blobToBase64` läuft in den Komponententests echt, kein `vi.mock` nötig | Test bewiesen (`aos-neue-absicht.test.ts` AK-01 vergleicht die Base64 des PNG) | §8, §9 R4 (entfällt) |
| 2026-09-18 | `onPaste` ignoriert einen zweiten Bild-Paste, solange ein Upload läuft (Hinweis „wird hochgeladen…" bleibt stehen) — Gegenstück zu `_pasteInFlight` im Terminal, im Plan nicht genannt | ohne Sperre könnten zwei Pfade in falscher Reihenfolge landen | §3 Ansatz (Ergänzung) |
| 2026-09-18 | `findClipboardImage` liefert bei leerem `file.type` den Hinweis „Bildart nicht unterstützt: unbekannt" statt eines leeren Strings | Lesbarkeit der Meldung | §3 Ansatz (Ergänzung) |
| 2026-09-18 | `randomUUID`-Import aus `cloud-terminal-manager.ts` entfernt (nach der Extraktion ungenutzt, `noUnusedLocals`) | Folge von §4 #2 | §4 #2 |
| 2026-09-18 | `design/` enthält zusätzlich `e2e-testbild.png` (das eingefügte Bild) und `e2e-terminal-pane.txt` (tmux-Pane mit Claudes Antwort, Beleg AN-01); Scratchpad-Pfad in den Textdateien zu `<scratchpad>` gekürzt | Beleg für AN-01 ohne Screenshot-Lesen | §4 #17, §8 |
| 2026-09-18 | E2E: Ladezustand (Screenshot `01-laden.png`) durch `SIGSTOP` des Branch-Backends eingefangen, sonst zu schnell (lokal < 50 ms); Trust-Dialog des frischen Scratch-Ordners per tmux (Down, Enter) beantwortet | Testtechnik | §8 (Protokoll) |
| 2026-09-18 | **2x-Fehler (Bausitzung, nicht Produkt):** Deep-Walk-Selektor `'aos-neue-absicht .hinweis'` im E2E-Skript trifft nichts — der Host steht außerhalb seines Shadow-Roots (Memory INT-2026-012: „use the inner class alone"); der Fehlversuch ließ das Backend im `SIGSTOP` zurück (per `kill -CONT` behoben) und hinterließ ein verwaistes Bild unter `intent-paste/` — genau der Fall, den der 7-Tage-Lauf abräumt | zweites Vorkommen → Vorschlag `CLAUDE.md` im PR | §13 (2x-Regel) |
| 2026-09-18 | Build-Workflow nennt `check:adr`; ein solcher Guard existiert im Repo nicht (`grep -rn adr scripts/verify.sh` leer) — ADR-0005 nach dem Muster von ADR-0004 geschrieben, ohne Guard | Repo-Stand | — (Hinweis für den Workflow) |
