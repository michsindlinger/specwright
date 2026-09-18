# Plan: UI: Text in der Eingabezeile meldet nicht mehr „Sitzung arbeitet"

> **Intent:** `intent.md` (INT-2026-021) · **Spec:** entfällt (bypass: Bugfix unter einem Tag)
> **Status:** in Umsetzung
> **Erstellt:** 2026-09-18 im Plan Mode · **Freigabe:** PO (Michael Sindlinger), 2026-09-18 — nach externem Multi-Reviewer-Konsens, Antworten in §12
> **Pflichtinput gelesen:** `docs/architecture.md`, `CLAUDE.md`, `docs/security.md`

## In einfachen Worten

<!-- leser: mensch -->

**Worum geht es?** Im Kasten „Nächster Schritt" steht ein Knopf, der die laufende Claude-Sitzung übernimmt: Er schickt `/clear` hinein und danach den Phasenbefehl. Bei dir scheitert das mit der roten Zeile „Sitzung arbeitet — warten", obwohl die Sitzung ruhig dasteht. Die Meldung ist falsch. Der wahre Grund: In der Eingabezeile der Sitzung steht noch angefangener, nie abgeschickter Text. Gemessen an deinen zehn laufenden Sitzungen betraf das drei von vier wartenden — `❯ npm run verify`, `❯ ja, leg den Entwurf an`, `❯ streich die zwei Zusagen bei Michael F`.

**Was ändert sich?** Die Meldung sagt künftig, was wirklich los ist, und nennt den Text, der im Weg steht. Dazu kommt ein zurückhaltender zweiter Knopf „Eingabezeile leeren und starten", der dir den Wechsel ins Terminal erspart. Er löscht nur auf Klick und zeigt vorher, was verloren geht — denn das Eingabefeld von Claude Code hat kein Rückgängig.

**Wie wird das gemacht?** Die Prüfung, die heute nur „wartet" oder „alles andere" kennt, bekommt vier Antworten: wartet, arbeitet, Dialog offen, Eingabezeile nicht leer. Die vierte ist neu und bekommt einen eigenen Satz. Nebenbei wird ein zweiter Fehler derselben Prüfung repariert: Sie suchte bisher nach *irgendeiner* leeren Eingabezeile im Bild — auch deine früheren Eingaben im Verlauf stehen dort mit demselben Zeichen. Künftig zählt nur die unterste Zeile, also die echte Eingabebox.

**Was kann schiefgehen?** Der Lösch-Knopf wirft Tipparbeit weg; deshalb zeigt er sie vorher an und löst nur auf Klick aus. Ob die Löschtaste in Claude Codes Oberfläche überhaupt wirkt, ist nicht belegt — deshalb steht eine Messung davor, und ohne belegte Wirkung wird der Knopf nicht gebaut. Und falls du tippst, während geräumt wird: Nach jeder Taste wird nachgelesen und im Zweifel abgebrochen, statt zu schreiben.

**Was musst du entscheiden?** Nichts — Freigabe liegt vor. Ob der Knopf kommt, entscheidet die Messung; ihr Ergebnis steht danach in §14.

## Details

<!-- leser: agent -->

### 1. Kurzfassung

<!-- leser: agent -->

Die strenge Bildschirmprüfung vor dem maschinellen Schreiben meldet jeden Nicht-Idle-Zustand als `arbeitet`. Eine gefüllte Eingabezeile ist aber weder „arbeitet" noch behebbar durch Warten. Der Plan gibt der Prüfung vier benannte Zustände, reicht den neuen Grund als eigenen Fehlercode durch und bietet in Stufe 2 ein Räumen auf Klick an — messungsgebunden.

### 2. Ausgangslage im Code

<!-- leser: agent -->

- `ui/src/server/services/dialog-driver.ts:50-72` — `IDLE_PROMPT_RE = /^\s*❯\s*$/`, `BUSY_CUE`, `isIdlePrompt` mit `lines.some(…)`.
- `ui/src/server/services/vorhaben-service.ts:697-714` — `screenCheck(mode)`; `:712` bildet jeden Nicht-Idle-Fall auf `'arbeitet'` ab.
- `ui/src/server/services/vorhaben-service.ts:919-949` — `clearAndPaste`: s1-Prüfung, synchroner Schlussblock (kein `await` bis zum Paste), `/clear`, s2-Prüfung, Befehl.
- `ui/src/shared/types/vorhaben.protocol.ts:298,307` — `FreitextGrund`, `FREITEXT_GRUND_TEXT.arbeitet = 'Sitzung arbeitet — warten'`.
- `ui/frontend/src/components/vorhaben/aos-naechster-schritt.ts:236-256,293` — Klick, Fehleranzeige in `.fehler`.
- `ui/frontend/src/services/vorhaben.service.ts:290-291` — `gatewayRequest` verwirft mit `new VorhabenRequestError(err.code, err.message)`; der Fehlercode erreicht das Frontend bereits heute.
- `ui/src/server/services/plan-review-orchestrator.ts:63-64,337-349` — einziges Muster für Tastendrücke: Taste, Settle-Pause, Bildschirm neu lesen, prüfen. Gesendet werden heute ausschließlich `\x1b[B`, `\x1b[A` und `\r`.

**Messung 18.09.2026** (`tmux capture-pane -p` über zehn Sitzungen): vier wartend, davon drei mit gefüllter Eingabezeile; zwei mit Spinner; eine Shell; eine im Dialog. Alt gegen neu über dreizehn Fixtures und die zehn Panes: keine Abweichung im booleschen Ergebnis von `isIdlePrompt`. Einmalige Messung, nicht wiederholbar in CI — der Riegel dagegen ist der Äquivalenztest in §8.

### 3. Entwurf

<!-- leser: agent -->

`promptZustand(screen)` als reine Funktion mit vier Werten (`wartet`, `arbeitet`, `eingabe_nicht_leer`, `dialog`), Prüfreihenfolge Dialog → Spinner → Eingabezeile. Die Reihenfolge Dialog vor Spinner bildet ab, was `screenCheck:711` heute schon tut. `isIdlePrompt` bleibt als dünner Wrapper (`=== 'wartet'`), damit alle Aufrufer und bestehenden Tests unverändert bleiben. `eingabeText(screen)` liefert den Zeileninhalt für die Meldung.

Maßgeblich ist die **letzte** `❯`-Zeile (AN-01): Der Verlauf trägt frühere Eingaben mit demselben Zeichen; nur die unterste Zeile ist die Eingabebox.

`screenCheck` behält die Zweige `waiting`/`working` unverändert und ersetzt allein den `strict`-Zweig durch einen `switch` ohne `default` (Vollständigkeit per Compiler).

Der neue Grund reist als eigener Fehlercode `PROMPT_NOT_EMPTY`; der gekürzte Zeileninhalt steht in `message`. Kein neues Protokollfeld.

### 4. Änderungen

<!-- leser: agent -->

**Stufe 1**

1. `ui/src/shared/types/vorhaben.protocol.ts:298` — `FreitextGrund` um `'eingabe_nicht_leer'`.
2. `ui/src/shared/types/vorhaben.protocol.ts:321` — `FREITEXT_GRUND_TEXT.eingabe_nicht_leer`, Satzschablone mit Platz für den Zeileninhalt (80 Zeichen, Umbrüche zu Leerzeichen).
3. `ui/src/shared/types/vorhaben.protocol.ts:691` — `VorhabenErrorCode` um `'PROMPT_NOT_EMPTY'`.
4. `ui/src/server/services/dialog-driver.ts:50-72` — `PROMPT_LINE_RE`, `PromptZustand`, `promptZustand`, `eingabeText`, Wrapper `isIdlePrompt`.
5. `ui/src/server/services/vorhaben-service.ts:76` — Import.
6. `ui/src/server/services/vorhaben-service.ts:711-713` — Riegel `if (mode !== 'strict') return true;` plus `switch`.
7. `ui/src/server/services/vorhaben-service.ts:~901` — bei `'eingabe_nicht_leer'` `VorhabenError('PROMPT_NOT_EMPTY', …)`; sonst unverändert `SESSION_WRITE_FAILED`.
8. `ui/src/server/services/vorhaben-service.ts:943` — `console.warn` am s2-Pfad.

Frontend: keine Zeile (die Meldung erscheint über den bestehenden `.fehler`-Pfad).

**Stufe 2 (messungsgebunden, §6 Schritt 7)**

9. `vorhaben.protocol.ts:486-504` — `eingabeLeeren?: boolean` an `VorhabenStartStepMessage`.
10. `vorhaben-handler.ts:210-239`, `vorhaben-service.ts:763`, `ui/frontend/src/services/vorhaben.service.ts:159` — durchreichen.
11. `vorhaben-service.ts` — private `leereEingabe()` innerhalb `clearAndPaste`, Einordnung nach §3 RB-01.
12. `aos-naechster-schritt.ts` — sekundärer Knopf bei `code === 'PROMPT_NOT_EMPTY'`, `title` = Meldung.
13. `docs/architecture.md` — AR-08 nachtragen, ausdrücklich auf Aufräum-Tasten außerhalb von Dialogen erstreckt.

### 5. Verbindungen

<!-- leser: agent -->

| AK | Änderung | Nachweis |
|---|---|---|
| AK-01 | 1, 2, 3, 6, 7 | Test (10) in `vorhaben-service-naechster-schritt.test.ts` |
| AK-02 | 6, 7 | Test (10): `writes(id)` leer |
| AK-03 | 4 | Test „letzte `❯`-Zeile entscheidet" |
| AK-04 | 4 | Tests „Dialog schlägt Spinner", „Spinner → arbeitet" |
| AK-05 | 6 (Riegel) | Test (10c) |
| AK-06 | 9–12 | Komponententest + E2E-Schritt 4 |
| AK-07 | 11 | Test (10e) |
| AK-08 | §6 Schritt 7 | Fixtures `key-*.txt`, Befund in §14 |

### 6. Reihenfolge der Arbeit

<!-- leser: agent -->

1. `intent.md` + `plan.md` committen (vor dem ersten Code).
2. Fixture `prompt-eingabe-text.txt` aufnehmen, NBSP per `od -c` prüfen.
3. `dialog-driver.ts` umbauen; `npx vitest run tests/unit/dialog-driver.test.ts` muss **ohne neue Tests** grün sein (Beweis der Verhaltensgleichheit).
4. Protokoll (Union, Text, Fehlercode).
5. `vorhaben-service.ts` (Riegel, `switch`, Fehlerwurf, `console.warn`).
6. Tests Stufe 1.
7. **Messung der Tastenwirkung** in einer Wegwerf-Sitzung → Entscheidung über Stufe 2, Befund in §14.
8. Bei grünem Licht Stufe 2.
9. Doku, `bash scripts/verify.sh`, E2E, PR.

### 7. Zerlegung

<!-- leser: agent -->

Keine. Eine Sitzung setzt den Plan ganz um; Stufe 2 ist ein Entscheidungspunkt, keine eigene Sitzung.

### 8. Tests und Nachweis

<!-- leser: agent -->

- `ui/tests/fixtures/tui/2.1.277/prompt-eingabe-text.txt` (neu, echte Aufnahme aus `/private/tmp/scratch-int021`), dazu aus der Messung `key-ctrl-u-mitte.txt` und `key-esc-hinweis.txt`.
- `ui/tests/unit/dialog-driver.test.ts`: ein Test je Rückgabewert; NBSP allein = leer, NBSP + Text = nicht leer; letzte `❯`-Zeile entscheidet; Dialog schlägt Spinner; kein Prompt sichtbar → `arbeitet`; `eingabeText` ohne `❯`/NBSP. **Äquivalenzwächter** über alle Fixtures: `isIdlePrompt(s) === (promptZustand(s) === 'wartet')`.
- `ui/tests/unit/vorhaben-service-naechster-schritt.test.ts`: (10) Text in der Zeile → `PROMPT_NOT_EMPTY`, Meldung enthält den Inhalt, keine Writes. (10b) Text erst nach `/clear` → derselbe Code, `writes === [CLEAR, '\r']`. (10c) `send` bleibt durchlässig. Stufe 2: (10d) Räumen führt zum Start, (10e) zweimal erfolglos → Abbruch ohne Paste.
- `ui/tests/known-failures.txt` bleibt unverändert; keine neue rote Testdatei.

### 9. Risiken

<!-- leser: agent -->

| Risiko | Bewertung | Gegenmaßnahme |
|---|---|---|
| Tastenwirkung im Ink-Editor unbelegt | hoch, blockierend für Stufe 2 | Messung vor dem Code; ohne Beleg entfällt Stufe 2 |
| Der Knopf löscht Tipparbeit unwiederbringlich | mittel, trifft nur Michael | `title` zeigt den Text, nur auf Klick, kein Automatismus |
| Rennen zwischen Lesen und Taste | mittel | Nachlesen nach jeder Taste, höchstens zwei, danach Abbruch; Schlussprüfung bleibt das Letzte vor dem Paste |
| „letzte `❯`-Zeile" bei künftiger Claude-Version falsch | niedrig | Äquivalenzwächter über alle Fixtures; neue Version bekommt eigenen Fixture-Ordner |
| Union-Erweiterung bricht eine `Record`-Abbildung | niedrig | `build:backend` **und** `build:ui` laufen (Frontend importiert `shared/types`) |

### 10. Manuelle Schritte

<!-- leser: agent -->

Gegen die laufende lokale UI (Backend 3001):

1. Vorhaben mit ruhig wartender Sitzung wählen; der Kasten muss „startet in der laufenden Sitzung ‚…'" zeigen.
2. Im angedockten Terminal `test test test` tippen, kein Enter. Gegenprobe `tmux capture-pane -p -t <sitzung> | tail -6`.
3. Knopf drücken → neue Meldung mit Zeileninhalt, keine Writes.
4. Stufe 2: „Eingabezeile leeren und starten" → Zeile leer, `/clear`, Befehl, Toast.
5. s2-Pfad: während `/clear` tippen → derselbe Satz, Warnzeile im Log, Befehl blieb draußen.
6. Screenshot des Kastens für den PR.

### 11. Schätzung

<!-- leser: agent -->

Stufe 1 ~2 h inkl. Tests. Messung ~20 min. Stufe 2 ~3 h inkl. Tests und Doku.

### 12. Review des Plans

<!-- leser: agent -->

Externer Multi-Reviewer-Konsens (3 von 4 Reviewern erfolgreich), 18.09.2026. Angenommen und eingearbeitet: Tastenwirkung unbelegt (→ Messung als Sperre); Rennfenster und E13/E15-Invariante (→ Räumen vor die vollständige Neubewertung, Schlussblock bleibt letzter Schritt); Vorrang Dialog vor Spinner (→ `findDialogCue` zuerst); `waiting`/`working` nicht mitreißen (→ expliziter Riegel, Test 10c); „letzte `❯`-Zeile" als dokumentierte Annahme (AN-01, AN-02); Strg-U löscht nur vor dem Cursor (→ Messung Schritt 3, Esc als Rückfall); Fehlertransport (→ `PROMPT_NOT_EMPTY`, Code erreicht das Frontend bereits über `VorhabenRequestError`); Äquivalenz braucht einen automatischen Riegel (→ Wächter in §8).

Abgelehnt mit Begründung: eigenes AR-09 für Aufräum-Tasten (AR-08 deckt es inhaltlich; Regelinflation vermeiden, stattdessen Wortlaut erweitern). Freitext-Pfad mitziehen (dort läuft `strict` gar nicht, die falsche Meldung kann nicht entstehen; die Verkettungsgefahr ist real, aber eine Produktentscheidung → eigene Karte, NZ-01). Strukturierter Logger (gemessen: 214 `console.*` in `ui/src/server`, null Treffer für `logger`/`pino`/`winston` — `console.warn` ist die Konvention). Teilkorruption trotz Nachlesen (als Risiko anerkannt; mehr ist ohne Zustandszugriff auf das Eingabefeld nicht erreichbar). NBSP ungetestet (erledigt: gemessen `/\s/.test(' ') === true`, Test in §8).

### 13. Definition of Done

<!-- leser: agent -->

`verify: OK` mit Ausgabe im PR · CI-Check grün · jedes AK hat einen Test · Verbindungen aus §5 nachgewiesen · E2E-Pfad gelaufen · Screenshot im PR · `architecture.md` aktuell · Abweichungen in §14 · Board nachgezogen.

### 14. Abweichungen bei der Umsetzung

<!-- leser: agent -->

**Messung der Tastenwirkung (Schritt 7, Sperre für Stufe 2) — durchgeführt am 18.09.2026, Claude Code 2.1.277, Wegwerf-Sitzung `/private/tmp/scratch-int021`:**

- Strg-U mit Cursor am Zeilenende: leert die Box vollständig (`❯ npm run verify` → `❯`).
- Strg-U mit Cursor in der Mitte: löscht nur vor dem Cursor, `abcdefghij` minus drei Schritte zurück → `hij` bleibt stehen. Der Review-Befund 15 ist damit belegt, nicht nur vermutet (Fixture `key-ctrl-u-mitte.txt`).
- **Einmal Esc leert nicht**, sondern blendet den Hinweis „Esc again to clear" ein (Fixture `key-esc-hinweis.txt`) — die Planannahme „ein Esc leert" war falsch.
- Zweimal Esc kurz hintereinander leert die Box vollständig. Eine Verlaufs- oder Rewind-Auswahl ging dabei **nicht** auf; das im Plan §9 genannte Risiko trat auf 2.1.277 nicht ein.

**Daraus geänderte Tastenfolge gegenüber §3:** erst Strg-U (harmlos, falls doch eine Runde läuft), nachlesen; steht noch Text, **Esc Esc** als zweiter und letzter Anlauf, nachlesen. Also zwei Anläufe, nicht zwei Tasten — die Obergrenze aus AK-07 bleibt der Sache nach erhalten (feste Zahl, Nachlesen nach jedem Anlauf, sonst Abbruch).

**Fixture-Version:** Die Aufnahmen liegen unter `2.1.277/`, nicht wie im Plan geschrieben unter `2.1.276/` — der Mac läuft auf 2.1.277. Nebenbefund der Aufnahme: die **lebende** Eingabebox trennt `❯` vom Text mit U+00A0, die Verlaufszeilen mit einem normalen Leerzeichen. Die Regel nutzt das nicht (zu fragil), aber der Test hält beides fest.

**Von den Bestandstests gefangen:** Der Kasten band den Startknopf als `@click=${this.start}`; mit dem neuen Parameter `eingabeLeeren` landete das Klick-Ereignis von Lit in diesem Parameter und machte ihn wahr — jeder normale Klick hätte die Eingabezeile geleert. Drei bestehende Komponententests wurden dadurch rot (`aos-naechster-schritt-sitzung`, `aos-neue-absicht`, `aos-vorhaben-stage2`). Behoben durch `@click=${() => void this.start()}`; die Tests blieben unverändert.

**AR-08:** wie in §12 entschieden als Erweiterung nachgetragen, kein eigenes AR-09. `CLAUDE.md` nennt jetzt AR-01…AR-08.
