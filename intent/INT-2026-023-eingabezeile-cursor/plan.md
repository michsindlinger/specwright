# Plan: Der Knopf „Nächster Schritt" darf am Autovorschlag der Sitzung nicht scheitern

> **Intent:** `intent.md` (INT-2026-023) · **Spec:** entfällt (bypass: Bugfix unter einem Tag)
> **Status:** umgesetzt
> **Erstellt:** 2026-09-19 im Plan Mode · **Freigabe:** Product Owner (Michael Sindlinger), 2026-09-19
> **Pflichtinput gelesen:** `docs/architecture.md` (Stand d735810), `CLAUDE.md`, `docs/security.md`

## In einfachen Worten

<!-- leser: mensch -->

**Worum geht es?** In der Vorhaben-Ansicht gibt es einen Kasten „Nächster Schritt" mit einem Knopf. Ein Klick darauf schreibt in die laufende Claude-Sitzung erst `/clear` (Gespräch leeren) und dann den Befehl der nächsten Phase, zum Beispiel `/specwright:plan INT-2026-023`. Damit dieser Klick nichts kaputt macht, schaut die Oberfläche vorher auf den Bildschirm der Sitzung: Arbeitet sie gerade? Steht ein Dialog offen? Und seit dem letzten Vorhaben auch: Steht in der Eingabezeile noch etwas, das jemand getippt und nicht abgeschickt hat? Wenn ja, wird nicht geschrieben — sonst würde der Befehl hinten an den fremden Text angeklebt.

Genau diese letzte Prüfung schlägt zu oft an. Claude Code malt nämlich nach jeder abgeschlossenen Runde einen grauen Vorschlag in die leere Eingabezeile: den zuletzt getippten Befehl, als Gedächtnisstütze. Der Vorschlag ist kein Text, er ist nur ein Bild. Wer eine Taste drückt, tippt trotzdem in eine leere Zeile. Die Bildschirmprüfung sieht aber nur das Bild und hält den Vorschlag für Eingabe — und lehnt ab. Ich habe das heute an allen zwölf laufenden Sitzungen nachgemessen: In drei von ihnen stand so ein Vorschlag, die Zeile war in Wahrheit leer. Praktisch trifft es jede Sitzung, in der schon einmal etwas gelaufen ist, also fast alle. Der Knopf ist damit unbenutzbar, und Michael muss die Phase von Hand im Terminal starten.

**Was ändert sich?** Der Knopf funktioniert wieder in Sitzungen, die nur einen Vorschlag zeigen. Wo wirklich getippter Text steht, lehnt er weiterhin ab und sagt wie bisher, welcher Text im Weg steht. Wer nur den Knopf benutzt, merkt: es geht wieder. Sonst ändert sich nichts — keine neue Schaltfläche, keine neue Meldung, keine Änderung am Terminal selbst.

**Wie wird das gemacht?** Die Oberfläche bekommt ein zweites Signal, das der Bildschirmtext nicht fälschen kann: die Position der Schreibmarke (des Cursors). Das Bild in der Zeile lügt, der Cursor nicht. Ein Vergleich: Ein Formularfeld zeigt hellgrau „Vorname eingeben". Wer nur auf das Feld schaut, meint, da stehe schon etwas. Wer schaut, wo der Schreibbalken blinkt — nämlich ganz links, direkt am Anfang —, weiß, dass das Feld leer ist. Genau das macht die Prüfung jetzt: Sie fragt das Terminalprogramm, das die Sitzung hält (tmux), wo der Cursor steht, und schaut sich an, was links von ihm in derselben Zeile steht. Ist dort nichts außer dem Eingabezeichen `❯` und dem Abstand dahinter, ist die Zeile leer — egal was rechts vom Cursor gemalt ist. Steht links etwas anderes, hat jemand getippt, und es bleibt bei der Ablehnung von heute.

Wichtig dabei: Es wird nicht nachgerechnet, in welcher Spalte der Cursor „eigentlich" stehen müsste. Solche Rechnungen gehen schief, sobald Claude Code die Zeile anders zeichnet. Stattdessen wird direkt hingeschaut, was zwischen dem Eingabezeichen und dem Cursor steht. Das kommt ohne Annahmen über das Layout aus.

Die Messung von heute bestätigt die Grundidee: In jeder der neun leeren Sitzungen — auch in den dreien mit sichtbarem Vorschlag — stand der Cursor direkt hinter dem Eingabezeichen. In der einen Sitzung, in der ich testweise einen Schrägstrich getippt hatte, stand er eine Stelle weiter rechts.

Dazu kommen zwei Absicherungen. Erstens: Wenn jemand eine lange, mehrzeilige Eingabe tippt, rutscht der Cursor in eine Folgezeile. Deshalb wird geprüft, dass der Cursor überhaupt in der Zeile mit dem Eingabezeichen steht; ist er woanders, gilt die Zeile als nicht leer. Zweitens: Zwischen dem ersten Blick auf den Bildschirm und dem Blick auf den Cursor vergehen Millisekunden — genug, dass jemand seinen Text in dieser Zeitspanne abschicken könnte. Dann liefe die Sitzung plötzlich, und ein hineingeschriebenes `/clear` würde sich in die laufende Runde einreihen und erst Minuten später greifen. Deshalb holt die Oberfläche Cursor **und** Bildschirm in einem einzigen Blick und prüft daran noch einmal mit, ob inzwischen eine Runde angelaufen ist oder ein Dialog aufgegangen ist. Ist das der Fall, wird nicht geschrieben.

Dieser Blick kostet einen zusätzlichen Aufruf, und zwar nur dann, wenn der Bildschirmtext nach Eingabe aussieht. Solange die Zeile ohnehin leer gemalt ist, passiert gar nichts Zusätzliches. Der Knopf wird also nicht langsamer.

**Was kann schiefgehen?** Vier Dinge, alle mit begrenzter Reichweite:

Erstens: Antwortet tmux nicht oder liefert keine Cursorposition, bleibt alles wie heute — der gemalte Text blockiert. Das ist die vorsichtige Richtung: im Zweifel lieber nicht schreiben. Michael merkt es daran, dass der Knopf wie bisher ablehnt.

Zweitens: Wer Text tippt und dann mit Ctrl-A oder der Pos1-Taste an den Zeilenanfang springt und die Zeile so stehen lässt, sieht für den Cursor aus wie eine leere Zeile — links vom Cursor steht ja nichts. Dann würde der Befehl doch an den Text angehängt und das Ergebnis wäre Unsinn — sichtbar im Terminal, mit einem `/clear` behoben. Das lässt sich aus der Cursorposition grundsätzlich nicht unterscheiden; es ist eine sehr ungewöhnliche Lage (tippen, an den Anfang springen, liegen lassen) und wird im Code als bekannte Grenze vermerkt.

Drittens: Es muss stimmen, dass ein eingefügter Befehl den grauen Vorschlag wirklich ersetzt und nicht mit ihm verschmilzt. Das ist heute schon so — der Vorschlag ist nur ein Bild —, wird aber vor der Freigabe der Umsetzung einmal echt ausprobiert (das ist AK-05 aus der Absicht).

Viertens: Ändert Claude Code eines Tages, wie die Eingabezeile gezeichnet wird, kann der Blick links vom Cursor etwas Unerwartetes finden. Dann lehnt der Knopf wieder ab wie heute — unangenehm, aber ungefährlich.

Rückgängig machen ist einfach: Die Änderung besteht aus einer zusätzlichen Abfrage. Fällt sie weg, ist das Verhalten exakt das von heute.

**Was musst du entscheiden?** Nichts, Freigabe reicht. Die beiden offenen Fragen der Absicht (OF-01, OF-02) sind entschieden und im Plan so umgesetzt.

## Details

<!-- leser: mensch -->

### 1. Kurzfassung

<!-- leser: mensch -->

Die strenge Bildschirmprüfung (`screenCheck`, Modus `strict`) bekommt ein zweites Signal: Meldet der gemalte Text `eingabe_nicht_leer`, holt sie in **einem** tmux-Aufruf den ungefalteten Pane-Inhalt **und** die Cursorposition und entscheidet daran. Ist alles links vom Cursor in seiner Zeile nur das Eingabezeichen und Leerraum — und zeigt dieselbe Aufnahme weder Spinner noch Dialog —, gilt die Eingabezeile als leer und der Klick läuft durch. Es wird keine Spalte berechnet, sondern der Zeileninhalt links vom Cursor angesehen. Liefert die Sitzung keine Position, bleibt es bei heute (fail closed, AR-08). Vier Dateien in `ui/src/server/`, kein neuer Protokollwert, kein neuer Fehlercode, keine Frontend-Änderung.

### 2. Ausgangslage im Code

<!-- leser: agent -->

| Bereich | Heute (Datei:Zeile) | Bedeutung für dieses Vorhaben |
|---|---|---|
| Strenge Prüfung vor `/clear` und Phasenbefehl | `ui/src/server/services/vorhaben-service.ts:707-735` | **Muss geändert werden** — der `switch` über `promptZustand` (`:724-734`) ist der einzige Ort, an dem `eingabe_nicht_leer` entsteht. Zweig `case 'eingabe_nicht_leer'` bekommt die Cursor-Rückfrage. [Certain] |
| Aufrufer der strengen Prüfung | `ui/src/server/services/vorhaben-service.ts:953` (vor `/clear`), `:972` (nach `/clear`) | Wiederverwendbar, unverändert. Nach `/clear` ist die Box neu und leer — der Cursor-Zweig läuft dort praktisch nie. [Certain] |
| Fehlerweg für getippten Text | `ui/src/server/services/vorhaben-service.ts:924` → `VorhabenError('PROMPT_NOT_EMPTY', eingabeNichtLeerText(befund.eingabe))` | Unverändert. Nur der Weg dorthin wird seltener. `befund.eingabe` wird **erst im Ablehnungszweig** gesetzt, nach der Cursor-Probe — es kann also kein Text zitiert werden, für den die Probe „leer" gesagt hat. [Certain] |
| Schnittstelle zum Terminal-Manager | `ui/src/server/services/vorhaben-service.ts:100-131`, `readScreen?` auf `:111` | **Muss erweitert werden** — optionale Methode nach demselben Muster wie `readScreen?`/`waitForIdle?`, damit die Test-Fakes der vier anderen Testdateien weiter übersetzen. [Certain] |
| Zustand der Eingabezeile (rein, textbasiert) | `ui/src/server/services/dialog-driver.ts:97-104` (`promptZustand`), `:60` (`PROMPT_LINE_RE = /^\s*❯/`), `:67` (`BUSY_CUE`), `:37-46` (`findDialogCue`), `:111-116` (`eingabeText`) | `PROMPT_LINE_RE`, `BUSY_CUE` und `findDialogCue` sind **wiederverwendbar** für die Cursor-Regel und ihre Nachprüfung. `promptZustand` bleibt rein und textbasiert. [Certain] |
| Stabile Bildschirmprobe | `ui/src/server/services/dialog-driver.ts:150-161` (`readStableScreen`, bis zu 4 Lesungen) | Unverändert. Die Cursor-Aufnahme läuft **danach** und ist damit die jüngere Quelle; deshalb wird Spinner und Dialog auf ihr noch einmal geprüft (§3 c, §9 R5). [Certain] |
| Bildschirm lesen | `ui/src/server/services/cloud-terminal-manager.ts:1807-1818` (`readScreen`, `tmuxSessionName` auf `:1813`) | **Vorlage** für die neue Methode: gleiche Struktur (Session nachschlagen → tmux fragen → sonst `null`). [Certain] |
| tmux-Aufruf | `ui/src/server/services/tmux-session-backend.ts:363-371` (`captureScreen`, `-p -J`), `:174-189` (`private tmux()`, execFile mit argv-Array, kein Shell) | **Wiederverwendbar.** Neue Methode nutzt denselben `tmux()`-Helfer und dasselbe Ziel-Muster `` `=${name}:` ``. `-J` faltet weiche Umbrüche — die Cursor-Aufnahme lässt `-J` weg, damit Zeilenindex und `cursor_y` zusammenpassen. [Certain] |
| Verdrahtung | `ui/src/server/websocket.ts:137` (`sessions: this.cloudTerminalManager`) | Strukturelle Typisierung: `tsc` beweist, dass der Manager die neue optionale Methode erfüllt. Kein Code-Eingriff. [Certain] |
| Tests der reinen Funktionen | `ui/tests/unit/dialog-driver.test.ts:87-136` | Muster für die neuen Fälle; Fixture-Lader `read(version, file)` auf `:15` wiederverwendbar. [Certain] |
| Tests des Knopfes | `ui/tests/unit/vorhaben-service-naechster-schritt.test.ts:45-128` (`FakeManager`), `:475-499` (Tests (10), (10b) zu INT-2026-021) | **Wiederverwendbar.** Weil der Fake die neue Methode nicht hat, beweisen (10)/(10b) unverändert AK-03 (ohne Cursor bleibt alles wie heute). Neue Tests setzen eine `cursor`-Eigenschaft am Fake. [Certain] |
| Test gegen echtes tmux | `ui/tests/unit/tmux-capture-screen.test.ts:24-94` (`SocketBackend`, `describe.skipIf(!tmuxAvailable)`) | **Muster wiederverwendbar** für den Beweis, dass der kombinierte Aufruf gegen einen echten tmux-Server funktioniert. [Certain] |
| Aufzeichnungen | `ui/tests/fixtures/tui/2.1.277/prompt-eingabe-text.txt` (Zeile 37: `❯` + U+00A0 + `npm run verify`) | Zeigt: Eingabezeichen auf Spalte 0, Trenner ist ein geschütztes Leerzeichen. Neue Aufnahmen kommen daneben. [Certain] |
| Messung vom 19.09.2026 | eigene Probe über `tmux -S <socket> list-sessions -F '#{cursor_x},#{cursor_y}'` und `capture-pane -p` je Sitzung | Zwölf laufende Sitzungen: neun mit `❯`-Zeile und `cursor_x = 2` (drei davon mit sichtbarem Vorschlag: `npm run verify`, `ja, leg den Entwurf an`, `prüf mal ob outlook die pac geholt hat`), eine mit getipptem `/` und `cursor_x = 3`, eine Shell-Sitzung ohne `❯`. Bestätigt AN-01 unabhängig von der Messung in `intent.md`. [Certain] |
| Manifest | `specwright/manifest.tsv`, Guard `scripts/check-manifest.sh:18` (`SHIPPED_DIRS` ohne `ui/`) | **Keine Manifest-Zeile nötig** — der Guard prüft `ui/` nicht. [Certain] |

**Falle, die in der Probe steckt:** `capture-pane -p` ohne `-J` liefert genau eine Zeile je Terminalzeile, inklusive leerer Zeilen — der Index passt zu `cursor_y` (geprüft: Pane mit `pane_height=40` → 40 Zeilen + eine Zeile aus `display-message`). Mit `-J` (wie `captureScreen`) würde dieser Bezug brechen. Zweite Falle: `cursor_x` zählt **Terminalzellen**, ein JavaScript-String zählt UTF-16-Einheiten. Die Regel in §3 (c) vergleicht deshalb keine Längen, sondern schneidet den Zeileninhalt links vom Cursor heraus und prüft ihn — bei breiten Zeichen (CJK) schneidet sie dadurch zu weit nach rechts und meldet „nicht leer", also in die sichere Richtung. [Certain]

### 3. Entwurf

<!-- leser: agent -->

#### Ansatz

<!-- leser: agent -->

Vier Bausteine, von unten nach oben:

**(a) `tmux-session-backend.ts` — eine Aufnahme, ein Zeitpunkt.** Neue Methode `captureCursorProbe(name)` setzt beide tmux-Befehle in **einen** Prozessaufruf, getrennt durch ein eigenes argv-Element `';'`:

```
tmux -S <socket> capture-pane -p -t '=<name>:' ';' display-message -p -t '=<name>:' '#{cursor_x} #{cursor_y}'
```

Die Ausgabe ist der ungefaltete Pane-Inhalt, gefolgt von einer Zeile `"<x> <y>"`. Beides stammt aus demselben tmux-Durchlauf, kann also nicht auseinanderdriften — das ist der Grund für den kombinierten Aufruf und zugleich die Basis der Nachprüfung in (c). Am 19.09.2026 gegen tmux auf dem Mac verifiziert. [Certain]

Das Zerlegen der Ausgabe kommt in eine **exportierte reine Funktion** `parseCursorProbe(stdout)` (Muster wie die `kanban-*`-Helfer: rein, damit vitest sie ohne tmux prüfen kann):

```ts
/** INT-2026-023: der ungefaltete Pane-Inhalt und die Cursorposition aus einem kombinierten tmux-Aufruf. */
export interface CursorProbe { zeilen: string[]; x: number; y: number }

export function parseCursorProbe(stdout: string): CursorProbe | null {
  const zeilen = stdout.split('\n');
  while (zeilen.length > 0 && zeilen[zeilen.length - 1] === '') zeilen.pop(); // tmux schließt mit \n
  const letzte = zeilen.pop();
  const m = /^(\d+) (\d+)$/.exec(letzte ?? '');
  if (m === null) return null;
  return { zeilen, x: Number(m[1]), y: Number(m[2]) };
}
```

`captureCursorProbe` gibt `null` zurück, wenn `res.ok` falsch ist (unbekannte Sitzung, toter Server, Zeitüberschreitung) — wie `captureScreen` heute.

**(b) `cloud-terminal-manager.ts` — `readCursorProbe(sessionId)`** nach dem Vorbild von `readScreen` (`:1807-1818`): Sitzung unbekannt oder ohne `tmuxSessionName` → `null`, sonst durchreichen. Kein Rückfall auf den PTY-Puffer: aus dem Puffer ist keine Cursorposition ableitbar.

**(c) `dialog-driver.ts` — die Regel als reine Funktion über die ganze Aufnahme.** Sie bekommt die Probe und sagt, ob geschrieben werden darf. Sie rechnet **keine erwartete Spalte aus** (Layout-Annahme), sondern sieht nach, was links vom Cursor steht:

```ts
/**
 * INT-2026-023 (AK-01 bis AK-04): Claude Code malt nach jeder Runde den letzten
 * Befehl als Vorschlag RECHTS vom Cursor in die leere Box — der gemalte Text
 * kann deshalb nicht entscheiden, der Cursor schon.
 *
 * Entschieden wird auf EINER Aufnahme (Pane + Cursor aus einem tmux-Aufruf),
 * die jünger ist als die stabile Bildschirmprobe des Aufrufers:
 * 1. Dialog oder Spinner auf dieser Aufnahme → nein. Damit fällt auch der Fall
 *    weg, dass zwischen den beiden Lesungen abgeschickt wurde und ein `/clear`
 *    in eine laufende Runde geriete (INT-2026-018 §9 R10).
 * 2. Der Cursor muss in einer Zeile mit dem Eingabezeichen stehen — bei
 *    mehrzeiliger Eingabe steht er auf einer Folgezeile (AN-02).
 * 3. Zwischen Eingabezeichen und Cursor darf nur Leerraum stehen. Keine
 *    Spaltenrechnung: `cursor_x` zählt Zellen, ein String UTF-16-Einheiten.
 *    Bei breiten Zeichen schneidet der Ausschnitt zu weit nach rechts und
 *    meldet „nicht leer" — die sichere Richtung.
 *
 * Bekannte Grenze: Wer Text tippt und dann mit Ctrl-A/Pos1 an den Zeilenanfang
 * springt, hat links vom Cursor ebenfalls nichts stehen und sieht für diese
 * Regel aus wie eine leere Zeile (§9 R2). Aus der Cursorposition allein ist das
 * nicht unterscheidbar.
 */
export function eingabeLeerLautCursor(probe: CursorProbe): boolean {
  const { zeilen, x, y } = probe;
  if (findDialogCue(zeilen.join('\n')) !== null) return false;
  if (zeilen.some((l) => BUSY_CUE.test(l))) return false;
  const zeile = zeilen[y];
  if (zeile === undefined) return false;
  const m = PROMPT_LINE_RE.exec(zeile);
  if (m === null) return false;
  const zeichen = [...zeile];            // Codepoints statt UTF-16-Einheiten
  if (x > zeichen.length) return false;  // Cursor rechts vom aufgenommenen Inhalt
  return zeichen.slice([...m[0]].length, x).join('').trim() === '';
}
```

`CursorProbe` wird in `dialog-driver.ts` deklariert und von `tmux-session-backend.ts` importiert — die Abhängigkeitsrichtung Backend → Treiber existiert heute schon nicht, ist aber zyklenfrei (`dialog-driver` importiert nur aus `utils/` und `shared/`). `promptZustand` und `isIdlePrompt` bleiben unverändert rein und textbasiert; ihr Doc-Kommentar bekommt einen Verweis auf die neue Funktion, damit ein künftiger Aufrufer die zweite Hälfte der Regel nicht übersieht.

**(d) `vorhaben-service.ts` — die Rückfrage im `strict`-Zweig.** In `screenCheck` (`:724-734`):

```ts
case 'eingabe_nicht_leer': {
  // INT-2026-023: der gemalte Text kann Claude Codes Vorschlag sein; nur der
  // Cursor unterscheidet ihn von getippter Eingabe. Ohne Probe bleibt es bei
  // der Ablehnung von heute (AK-03, fail closed).
  const probe = (await sessions.readCursorProbe?.(sessionId)) ?? null;
  if (probe !== null && eingabeLeerLautCursor(probe)) return true;
  if (befund) befund.eingabe = eingabeText(screen.text);
  return 'eingabe_nicht_leer';
}
```

Die Abfrage ist **faul**: Zeigt der Bildschirm eine leere Box (`wartet`), einen Spinner (`arbeitet`) oder einen Dialog, wird sie nicht gestellt. Damit bleibt AK-04 durch die Reihenfolge im Code erfüllt und RB-03 gewahrt (kein zusätzlicher Aufruf auf dem guten Pfad). `befund.eingabe` wird erst danach gesetzt, also nie für einen Fall, den die Probe als leer erkannt hat.

Die Schnittstelle `VorhabenSessionSource` (`:100-131`) bekommt die Methode optional:

```ts
/** INT-2026-023: ungefalteter Pane-Inhalt samt Cursorposition aus einem tmux-Aufruf; `null` ohne tmux oder bei Fehler. */
readCursorProbe?(sessionId: string): Promise<CursorProbe | null>;
```

#### Verworfene Alternativen

<!-- leser: agent -->

| Alternative | Warum nicht |
|---|---|
| Erwartete Cursorspalte aus der Prompt-Zeile berechnen (`Länge des Präfix + 1 für den Trenner`) | **Nach externem Review verworfen.** Die Rechnung unterstellt genau ein Trennzeichen und vergleicht Zellen mit UTF-16-Einheiten; ändert Claude Code das Layout, bricht sie still. Der Ausschnitt links vom Cursor kommt ohne diese Annahme aus und ist bei breiten Zeichen konservativ. |
| Dimmung des Vorschlags auswerten (`capture-pane -e`, SGR-Codes lesen) | NZ-02 der Absicht. Die heutige Bildschirmprobe verwirft SGR bewusst (`captureScreen` nutzt `-p -J` ohne `-e`); Farbcodes sind versionsabhängig, und der Bildschirmleser müsste für alle Prüfungen umgebaut werden. Großer Umbau für ein schwächeres Signal. |
| Eingabezeile vor dem Paste räumen (Ctrl-U, Esc) | NZ-04. In INT-2026-021 Stufe 2 gemessen und verworfen: Tasten räumen die Box über den PTY-Pfad nicht verlässlich, Esc öffnet auf leerer Zeile den Rewind-Wähler (Commit `44652e8`, AR-08). |
| Cursorposition bei **jeder** Bildschirmlesung mitliefern (`readScreen` erweitern) | Teurer (bis zu vier Lesungen je `readStableScreen`) und nutzlos: `captureScreen` faltet mit `-J`, danach passt `cursor_y` nicht mehr zum Zeilenindex. Man bräuchte trotzdem eine zweite, ungefaltete Aufnahme. |
| Zwei getrennte tmux-Aufrufe (erst Cursor, dann Pane) | Die beiden Auskünfte könnten aus verschiedenen Augenblicken stammen; genau darauf stützt sich die Nachprüfung auf Spinner und Dialog in (c). |
| Gemalten Text gegen die letzte `❯`-Zeile im Verlauf vergleichen (Vorschlag = vorige Eingabe) | Reine Heuristik: Wer denselben Befehl erneut tippt, würde fälschlich durchgelassen; wer den Verlauf gescrollt hat, fälschlich blockiert. Kein hartes Signal, verstößt gegen den Sinn von Z-03. |
| Cursor-Regel in `promptZustand` hineinziehen (fünfter Zustand oder optionaler Parameter) | Würde die reine, synchrone Funktion an eine asynchrone Quelle binden oder die Probe bei **jeder** strengen Prüfung holen. Die Trennung „Text sagt, was gemalt ist / Aufnahme sagt, was gilt" bleibt so einzeln prüfbar. |

#### Architektur-Auswirkung

<!-- leser: agent -->

- **Nein** — bleibt innerhalb von `docs/architecture.md` §2 (Web-UI Backend) und §4.
  - **AR-08** wird eingehalten und gestärkt: Die UI tippt weiterhin nur in einen Zustand, den sie gerade gelesen hat; sie liest jetzt zwei Merkmale **einer** Aufnahme statt eines Merkmals einer älteren. Ohne verlässliches Signal wird nicht geschrieben (RB-02). Der Regeltext selbst bleibt unverändert.
  - **AR-02** unberührt: kein neuer Prozess, kein `npx` — derselbe `tmux`-Aufruf über den vorhandenen `private tmux()`-Helfer, ein Prozess statt zweier durch den kombinierten Befehl.
  - **AR-04**, **AR-05**: kein Pfad, kein neuer Zustand, kein `localStorage`.
- **Trotzdem in derselben PR anzupassen (Beschreibung, keine Regel):**
  - `docs/architecture.md` §2, Zelle „Web-UI Backend": Der Satz zu INT-2026-021 („steht dort noch getippter Text, ist das ein eigener Grund `eingabe_nicht_leer`") beschreibt ab jetzt nur die halbe Regel. Ergänzung: Gemalter Text zählt nur als Eingabe, wenn eine zweite, jüngere tmux-Aufnahme (ungefalteter Pane samt `cursor_x`/`cursor_y`, ein Aufruf) es bestätigt — links vom Cursor nur Leerraum und auf derselben Aufnahme kein Spinner und kein Dialog; ohne Aufnahme bleibt es bei der Ablehnung. Plus Zeile im Änderungsprotokoll.
  - `docs/design.md` §4 (Zeile 51) und Änderungsprotokoll: Die Ablehnung „in der Eingabezeile der Sitzung steht noch Text: …" gilt nur noch für wirklich getippten Text; der graue Vorschlag von Claude Code blockiert nicht mehr.
- **ADR nötig: nein.** Keine Datenhaltung, keine Lieferkette, keine Auth, kein MCP-Startmodell.
- **`docs/security.md` §6 geprüft:** kein neuer Endpunkt (die Änderung hängt am bestehenden `vorhaben:start-step`), kein neues Datenobjekt, kein externes System (tmux ist bereits angebunden), kein personenbezogenes Datum. Der tmux-Sitzungsname stammt aus der eigenen Registry, nie aus Client-Eingabe; der Aufruf läuft über `execFile` mit argv-Array, kein Shell-String. **Eine Pflicht greift:** Neue Test-Aufzeichnungen sind Bildschirminhalte echter Sitzungen — vor dem Commit auf Hostnamen, Pfade, Nutzer und Ports prüfen (§5 Verbotsliste, öffentliches Repo), siehe §6 Schritt 1 und §10.

### 4. Änderungen

<!-- leser: agent -->

| # | Datei / Komponente | Art | Was | Herkunft |
|---|---|---|---|---|
| 1 | `ui/src/server/services/dialog-driver.ts` | ändern | `CursorProbe`-Typ; `eingabeLeerLautCursor(probe)` (rein, nutzt `findDialogCue`, `BUSY_CUE`, `PROMPT_LINE_RE`); Doc-Kommentar von `promptZustand` verweist darauf | AK-01 bis AK-04, AN-02 |
| 2 | `ui/src/server/services/tmux-session-backend.ts` | ändern | `parseCursorProbe()` (exportiert, rein) und `captureCursorProbe(name)` neben `captureScreen` (`:363-371`), über den vorhandenen `tmux()`-Helfer | AK-01, AK-03 |
| 3 | `ui/src/server/services/cloud-terminal-manager.ts` | ändern | `readCursorProbe(sessionId)` neben `readScreen` (`:1807-1818`); ohne tmux-Sitzung `null` | AK-01, AK-03 |
| 4 | `ui/src/server/services/vorhaben-service.ts` | ändern | `VorhabenSessionSource.readCursorProbe?` (`:100-131`); im `strict`-Zweig `case 'eingabe_nicht_leer'` (`:727-729`) die faule Probe | AK-01 bis AK-04 |
| 5 | `ui/tests/unit/dialog-driver.test.ts` | ändern | Fälle für `eingabeLeerLautCursor` (Vorschlag, getippt, Folgezeile ohne `❯`, NBSP, eingerückte Prompt-Zeile, Spinner in der Aufnahme, Dialog in der Aufnahme, breite Zeichen, `y` außerhalb) | AK-01 bis AK-04, AN-02 |
| 6 | `ui/tests/unit/tmux-cursor.test.ts` | neu | `parseCursorProbe` gegen die zwei Aufzeichnungen und gegen Fehlfälle; dazu `captureCursorProbe` gegen einen **echten** tmux-Server (Muster `tmux-capture-screen.test.ts:24-94`, `describe.skipIf(!tmuxAvailable)`) | AK-01, AK-02, AK-03 |
| 7 | `ui/tests/unit/vorhaben-service-naechster-schritt.test.ts` | ändern | `FakeManager` bekommt `cursor: CursorProbe \| null = null`, einen Aufrufzähler und `readCursorProbe()`; neue Tests (10c) Vorschlag → Start, (10d) getippt → `PROMPT_NOT_EMPTY`, (10e) `null` → `PROMPT_NOT_EMPTY`, (10f) Dialog/Spinner → Probe nicht gerufen, (10g) Probe zeigt Spinner → Ablehnung ohne Schreibvorgang | AK-01 bis AK-04 |
| 8 | `ui/tests/fixtures/tui/2.1.277/cursor-vorschlag.txt`, `…/cursor-getippt.txt` | neu | Zwei echte Aufnahmen der kombinierten tmux-Ausgabe (ungefalteter Pane + Cursor-Zeile), eine mit sichtbarem Vorschlag, eine mit getipptem Text | AN-01, AK-01, AK-02 |
| 9 | `docs/architecture.md` | ändern | §2 Zelle „Web-UI Backend" um das zweite Signal; Zeile im Änderungsprotokoll | §3 |
| 10 | `docs/design.md` | ändern | §4 Zeile 51 präzisiert (Vorschlag blockiert nicht); Zeile im Änderungsprotokoll | §3 |
| 11 | `intent/INT-2026-023-eingabezeile-cursor/plan.md` | neu | dieser Plan | — |

**Nicht betroffen (ausdrücklich):**

- `promptZustand`, `isIdlePrompt`, `eingabeText` — Verhalten unverändert; nur ein Doc-Kommentar kommt hinzu. Die Gleichwertigkeits-Prüfung `dialog-driver.test.ts:128-135` bleibt gültig.
- `findDialogCue`, `BUSY_CUE`, `PROMPT_LINE_RE` — werden nur zusätzlich benutzt, nicht geändert.
- `FreitextGrund`, `FREITEXT_GRUND_TEXT`, `eingabeNichtLeerText`, Fehlercode `PROMPT_NOT_EMPTY` (`ui/src/shared/types/vorhaben.protocol.ts:299-338`) — kein neuer Wert, keine neue Meldung.
- Der Freitext-Pfad (`pasteLocked`, Modi `waiting`/`working`, `vorhaben-service.ts:671-694`, `:718-723`) — NZ-03: bleibt so durchlässig wie heute, keine Cursor-Prüfung.
- Die Bildschirmprobe bei Stille (Dialog-Erkennung, `cloud-terminal-manager.ts:640`) — OF-01 entschieden: nein.
- `captureScreen`, `capturePaneHistory`, `readStableScreen` — unverändert.
- Gesamtes Frontend (`ui/frontend/`), Hooks, Installer, `specwright/manifest.tsv`.

### 5. Verbindungen

<!-- leser: agent -->

| Von | Nach | Art | Schnittstelle | Nachweis (Befehl) | Teil |
|---|---|---|---|---|---|
| `vorhaben-service.screenCheck` | `VorhabenSessionSource.readCursorProbe` | Methodenaufruf (optional) | `readCursorProbe?(sessionId): Promise<CursorProbe \| null>` | `grep -n "readCursorProbe" ui/src/server/services/vorhaben-service.ts` → Deklaration + Aufruf im `strict`-Zweig | — |
| `vorhaben-service.screenCheck` | `dialog-driver.eingabeLeerLautCursor` | Import | `import { eingabeLeerLautCursor, type CursorProbe } from './dialog-driver.js'` | `grep -n "eingabeLeerLautCursor\|CursorProbe" ui/src/server/services/vorhaben-service.ts ui/src/server/services/dialog-driver.ts` | — |
| `CloudTerminalManager.readCursorProbe` | `TmuxSessionBackend.captureCursorProbe` | Methodenaufruf | `captureCursorProbe(name): Promise<CursorProbe \| null>` | `grep -n "captureCursorProbe" ui/src/server/services/cloud-terminal-manager.ts ui/src/server/services/tmux-session-backend.ts` | — |
| `TmuxSessionBackend.captureCursorProbe` | `parseCursorProbe` | Funktionsaufruf im selben Modul | `parseCursorProbe(stdout)` | `grep -n "parseCursorProbe" ui/src/server/services/tmux-session-backend.ts ui/tests/unit/tmux-cursor.test.ts` | — |
| `tmux-session-backend` | `dialog-driver` (Typ `CursorProbe`) | Typ-Import | `import type { CursorProbe } from './dialog-driver.js'` | `cd ui && npx madge --circular src/server/services` bzw. `npx tsc --noEmit` — beweist Zyklenfreiheit und Übersetzbarkeit | — |
| `CloudTerminalManager` (Instanz) | `VorhabenService` (`sessions`) | strukturelle Typisierung | `websocket.ts:137` `sessions: this.cloudTerminalManager` | `cd ui && npx tsc --noEmit -p tsconfig.json` — eine abweichende Signatur bricht die Übersetzung | — |
| `TmuxSessionBackend.captureCursorProbe` | echter tmux-Server | Prozessaufruf | `tmux … capture-pane -p -t '=<name>:' ';' display-message -p -t '=<name>:' '#{cursor_x} #{cursor_y}'` | Test `ui/tests/unit/tmux-cursor.test.ts` gegen eigenen Socket (übersprungen ohne tmux) | — |

- [x] Jede neue Komponente hat mindestens eine Verbindung.
- [x] Jeder Nachweis ist ein ausführbarer Befehl.

> Falls `madge` nicht im Projekt liegt, ersetzt `grep -rn "from './" ui/src/server/services/dialog-driver.ts` den Zyklen-Nachweis: Der Treiber importiert nur aus `utils/` und `shared/`, also kann der Typ-Import aus dem Backend keinen Zyklus schließen.

### 6. Reihenfolge der Arbeit

<!-- leser: agent -->

0. **Lesende Vorprüfung auf Konsumenten:** `grep -rn "promptZustand\|isIdlePrompt\|eingabeText\|readScreen" ui/src ui/frontend/src` — bestätigen, dass außer `screenCheck` kein Produktionsaufrufer von `promptZustand` existiert und `readScreen` nur von `dialog-driver`, `vorhaben-service` und `plan-review-orchestrator` benutzt wird; keiner von ihnen wird verändert. → prüfbar durch die Trefferliste im PR. *(Stand 19.09.: genau so gemessen.)*
1. **Aufzeichnungen erstellen (vor dem Code, AN-01).** Eine eigene Claude-Code-Sitzung in einem Wegwerf-Verzeichnis mit kleinem Pane starten, eine kurze Eingabe abschicken und die Runde abwarten (dann malt Claude Code den Vorschlag), dann die kombinierte tmux-Ausgabe in `cursor-vorschlag.txt` sichern; anschließend ein Zeichen tippen und `cursor-getippt.txt` sichern. Beide Dateien vor dem Commit auf Hostnamen, Pfade, Nutzer, Ports prüfen (`docs/security.md` §5) und nötigenfalls neu mit neutralem Inhalt aufnehmen — nicht nachträglich schwärzen, das verschiebt Spalten. → prüfbar durch `grep -c '' ui/tests/fixtures/tui/2.1.277/cursor-*.txt` und Sichtprüfung.
2. **Test zuerst (Bugfix-Regel).** Die Fälle aus §8 schreiben, Fehlschlag bestätigen (`eingabeLeerLautCursor` existiert noch nicht → rot). → prüfbar durch den roten Lauf im Protokoll.
3. **`dialog-driver.ts`**: `CursorProbe`, `eingabeLeerLautCursor`, Doc-Verweis. → prüfbar: `cd ui && npx vitest run tests/unit/dialog-driver.test.ts` grün.
4. **`tmux-session-backend.ts`**: `parseCursorProbe`, `captureCursorProbe`. → prüfbar: `cd ui && npx vitest run tests/unit/tmux-cursor.test.ts` grün (inkl. echtem tmux).
5. **`cloud-terminal-manager.ts`**: `readCursorProbe`. → prüfbar: `npx tsc --noEmit`.
6. **`vorhaben-service.ts`**: Schnittstelle + `strict`-Zweig. → prüfbar: `cd ui && npx vitest run tests/unit/vorhaben-service-naechster-schritt.test.ts` grün, (10)/(10b) unverändert grün.
7. **Projekt-Docs**: `docs/architecture.md` §2 + Protokoll, `docs/design.md` §4 + Protokoll. → prüfbar durch den Diff.
8. **Verbindungen nachweisen** (§5, alle sieben Befehle) und Ausgaben im PR.
9. **`bash scripts/verify.sh` grün** (endet mit `verify: OK`), PR anlegen, CI abwarten. Bezugsliste `ui/tests/known-failures.txt` bleibt unangetastet.
10. **E2E / Messung AK-05** (§8, §10): Michael klickt in einer Sitzung mit sichtbarem Vorschlag auf „Nächster Schritt".

### 7. Zerlegung

<!-- leser: agent -->

#### Variante A — nicht zerlegbar, eine Sitzung

<!-- leser: agent -->

Vier Produktionsdateien in einer Aufrufkette (§5, sieben Verbindungen), zusammen unter 120 Zeilen; die Testschreibung setzt die Aufzeichnungen aus Schritt 1 voraus. Zwei Worktrees für je zwanzig Minuten Arbeit plus Integrationsaufgabe wären teurer als die Arbeit selbst. Größe S laut `intent.md`.

### 8. Tests und Nachweis

<!-- leser: agent -->

| AK / FA | Test | Datei | Art |
|---|---|---|---|
| AK-01 | Probe mit Zeile `❯ npm run verify`, `x = 2` → `true`; dasselbe mit eingerückter Zeile (`'  ❯ x'`, `x = 4`); echte Aufzeichnung über `parseCursorProbe(cursor-vorschlag.txt)` → `eingabeLeerLautCursor` `true` | `ui/tests/unit/dialog-driver.test.ts`, `ui/tests/unit/tmux-cursor.test.ts` | Unit |
| AK-01 | (10c) Bildschirm zeigt Text, Probe meldet leere Zeile → `/clear` und Phasenbefehl werden geschrieben, Zuordnung wandert | `ui/tests/unit/vorhaben-service-naechster-schritt.test.ts` | Integration (Fake-Manager) |
| AK-02 | Probe mit Zeile `❯ /`, `x = 3` → `false`; echte Aufzeichnung `cursor-getippt.txt` → `false`; breite Zeichen (`❯ 日本`, `x = 6`) → `false` | `ui/tests/unit/dialog-driver.test.ts`, `ui/tests/unit/tmux-cursor.test.ts` | Unit |
| AK-02 | (10d) Probe meldet getippten Text → `PROMPT_NOT_EMPTY` mit zitiertem Text, keine Schreibvorgänge | `ui/tests/unit/vorhaben-service-naechster-schritt.test.ts` | Integration |
| AK-03 | (10e) `readCursorProbe` liefert `null` → `PROMPT_NOT_EMPTY` wie heute; Tests (10)/(10b) bleiben **unverändert** grün (Fake ohne die Methode) | `ui/tests/unit/vorhaben-service-naechster-schritt.test.ts` | Integration |
| AK-03 | `captureCursorProbe` auf unbekannte Sitzung → `null`; `parseCursorProbe` auf leere Ausgabe, auf Ausgabe ohne Zahlenzeile → `null`; `y` jenseits der Aufnahme → `eingabeLeerLautCursor` `false` | `ui/tests/unit/tmux-cursor.test.ts`, `ui/tests/unit/dialog-driver.test.ts` | Unit + echtes tmux |
| AK-04 | (10f) Dialog-Bildschirm und Spinner-Bildschirm → Ablehnung wie heute **und** `readCursorProbe` wurde nicht aufgerufen (Zähler am Fake `=== 0`); Tests (2)/(9) unverändert | `ui/tests/unit/vorhaben-service-naechster-schritt.test.ts` | Integration |
| AK-04 | (10g) Bildschirm zeigt Text, aber die **Probe** trägt eine Spinner-Zeile bzw. einen Dialog-Cue (zwischen beiden Lesungen abgeschickt) → Ablehnung, keine Schreibvorgänge; dazu die reine Entsprechung in `dialog-driver.test.ts` | `ui/tests/unit/vorhaben-service-naechster-schritt.test.ts`, `ui/tests/unit/dialog-driver.test.ts` | Integration + Unit |
| AN-02 | Cursor-Zeile ohne `❯` (Folgezeile einer mehrzeiligen Eingabe) → `false`, auch bei `x = 2` | `ui/tests/unit/dialog-driver.test.ts` | Unit |
| — (Regression) | `isIdlePrompt` bleibt der dünne Aufsatz über `promptZustand` für alle Aufzeichnungen (`dialog-driver.test.ts:128-135`); die neuen `cursor-*.txt` sind keine Bildschirmaufnahmen und dürfen die Fixture-Schleifen nicht stören — Dateinamen-Filter der bestehenden Schleifen prüfen | `ui/tests/unit/dialog-driver.test.ts` | Unit |
| AK-05 | Messung durch Michael (§10) | — | Messung |

- **Verify-Befehl:** `bash scripts/verify.sh` — muss mit `verify: OK` enden, Ausgabe wird im PR zitiert. **CI ist die Wahrheit:** lokal grün zählt erst, wenn die PR-Checks grün sind. `ui/tests/known-failures.txt` wird nicht angefasst (Hook `protect-tests` sperrt die Datei ohnehin). Im Worktree vor dem ersten Lauf: `chmod +x ui/node_modules/node-pty/prebuilds/*/spawn-helper` und ein zweites `npm ci` in `ui/frontend` (bekannte Worktree-Falle).
- **Datenkorrektur:** entfällt — es werden keine Bestandsdaten angefasst.
- **Angeschlossen (E2E-Pfad):** Vorhaben-Seite → Kasten „Nächster Schritt" → Klick → `vorhaben:start-step` → `clearAndPaste` → `screenCheck('strict')` → `readCursorProbe` → `captureCursorProbe` → tmux → Paste von `/clear` und Phasenbefehl in die echte Sitzung. Geprüft als **manueller Lauf mit Protokoll** gegen ein Zweig-Backend auf Port 3111 mit eigener tmux-Socket und einem Wegwerf-Projekt (Muster aus der Notiz „Cloud-Terminal E2E via Playwright"): Sitzung starten, eine Eingabe abschicken, Runde abwarten bis der Vorschlag sichtbar ist, Knopf klicken, im Terminal prüfen, dass genau `/clear` und der Phasenbefehl ankamen und der Vorschlagstext nicht mit hineingeriet. Das Live-Backend auf 3001 wird nicht benutzt und nicht beendet.
- **Bugfix:** Test zuerst (§6 Schritt 2), Fehlschlag bestätigt, dann Fix ohne Änderung am Test. Hook `protect-tests` aktiv.
- **UI:** keine sichtbare Änderung, kein Mock, kein Screenshot nötig.

**E2E-Protokoll (19.09.2026, Zweig-Backend Port 3111, eigene tmux-Socket `specwright-3111.sock`, Wegwerf-Projekt `/private/tmp/e2e-023`):**

1. Projekt mit einer Absicht `INT-2026-900` (Status `angenommen`, `bypass: ja`) angelegt, im Backend geöffnet.
2. Über den Kasten „Nächster Schritt" eine Sitzung mit `/specwright:plan INT-2026-900` gestartet (Modell Haiku); Vertrauensdialog und Rückfrage im Terminal beantwortet, Plan wurde geschrieben und committet.
3. Die Sitzung zeichnete danach den Vorschlag `❯ /build INT-2026-900` in die leere Eingabezeile; `tmux display-message '#{cursor_x} #{cursor_y}'` meldete `2 12` — Cursor direkt hinter dem Eingabezeichen, Zeile also leer.
4. Klick auf „Bau starten". Ergebnis: Toast „Nächster Schritt in der laufenden Sitzung gestartet", Tab umbenannt auf `build INT-2026-900`, Zuordnung auf `build`.
5. Im Terminal kamen **genau zwei** Eingaben an — `❯ /clear` und `❯ /specwright:build INT-2026-900`. Eine Suche im Verlauf nach verschmolzenen Formen (`/build INT-2026-900/clear`, `/clear/build`, `…build INT-2026-900/build`) blieb ohne Treffer. **Damit ist R1 widerlegt:** Der Vorschlag ist nur gezeichnet, das Einfügen ersetzt ihn.
6. **R6 (Laufzeit):** der kombinierte tmux-Aufruf, fünfmal gemessen, jeweils unter 10 ms (`real 0,00`). Der Klick wird davon nicht spürbar langsamer.
7. Danach: Zweig-Backend über seine PIDs aus dem Worktree-Pfad beendet (kein pauschales `pkill`), tmux-Server der Socket 3111 beendet, Wegwerf-Projekt gelöscht; das Backend auf Port 3001 lief durchgehend weiter.

### 9. Risiken

<!-- leser: mensch -->

| Risiko | Wahrscheinlichkeit | Wirkung | Gegenmaßnahme | Wer merkt es |
|---|---|---|---|---|
| **R1** Das Einfügen in eine Box mit sichtbarem Vorschlag verschmilzt doch mit dem Vorschlag, statt ihn zu ersetzen | niedrig (der Vorschlag ist nur gezeichnet, nicht im Puffer) | hoch — verstümmelter Befehl in der Sitzung | AK-05 und der E2E-Lauf prüfen genau das **vor** dem Merge; Rückweg: `/clear` im Terminal | Michael sofort im Terminal |
| **R2** Getippter Text, Cursor per Ctrl-A/Pos1 am Zeilenanfang → links vom Cursor steht nichts, gilt als leer | sehr niedrig (tippen, springen, liegen lassen) | mittel — Befehl wird an den Text angehängt | Aus der Cursorposition nicht unterscheidbar; als bekannte Grenze im Doc-Kommentar der Funktion festgehalten | Michael im Terminal |
| **R3** Claude Code ändert, wie die Eingabezeile gezeichnet wird (Rahmen links, anderer Trenner) | mittel (Versionswechsel sind häufig) | niedrig — findet sich links vom Cursor etwas Unerwartetes, lehnt der Knopf ab wie heute (fail closed) | Keine Spaltenrechnung, nur ein Ausschnitt-Vergleich; Aufzeichnungen tragen die Version im Ordnernamen | Michael beim nächsten Klick |
| **R4** tmux antwortet nicht oder kennt den kombinierten Aufruf nicht | niedrig (gegen die installierte Version verifiziert) | niedrig — `null`, damit Verhalten wie heute | Test gegen echten tmux-Server; `res.ok`-Prüfung wie bei `captureScreen` | Michael beim nächsten Klick |
| **R5** Zwischen stabiler Bildschirmprobe und Cursor-Aufnahme ändert sich die Lage | niedrig | niedrig bis mittel | Drei Richtungen, alle abgedeckt: *getippt* → Cursor rückt nach rechts, Ablehnung; *gelöscht* → Box ist wirklich leer, Schreiben korrekt (und `befund.eingabe` wird nie aus dem alten Bild gesetzt); *abgeschickt* → die Aufnahme trägt Spinner oder Dialog und die Regel lehnt ab, damit `/clear` nicht in eine laufende Runde gerät. Das verbleibende Fenster zwischen Aufnahme und Paste ist dasselbe wie heute (INT-2026-018) | Michael im Terminal |
| **R6** Zusätzlicher tmux-Aufruf macht den Klick spürbar langsamer (RB-03) | niedrig | niedrig | Aufruf nur im Ablehnungs-Zweig, ein Prozess; Laufzeit im E2E-Lauf einmal mitmessen und im PR nennen | Michael beim Klicken |
| **R7** Die zwei neuen Aufzeichnungen enthalten Host- oder Pfadangaben (öffentliches Repo) | mittel, wenn unachtsam aufgenommen | mittel | §6 Schritt 1: Aufnahme in Wegwerf-Verzeichnis, Sichtprüfung vor dem Commit; im Zweifel neu aufnehmen statt schwärzen | Review, Hook `no-secrets` nur für Secrets |
| **R8** Die neuen `cursor-*.txt` laufen in die bestehenden Fixture-Schleifen der Tests und brechen sie | mittel | niedrig — roter Test, sofort sichtbar | §8 letzter Testpunkt: Dateinamen-Filter der Schleifen in `dialog-driver.test.ts` prüfen und nötigenfalls enger fassen | Testlauf |
| **R9** Breite Zeichen (CJK, Emoji) in der Eingabezeile: `cursor_x` zählt Zellen, der String Codepoints | niedrig | niedrig — der Ausschnitt greift zu weit nach rechts, also Ablehnung (sichere Richtung) | Kein Längenvergleich; zusätzlich Abbruch, wenn `x` größer als die Zeichenzahl der Zeile ist; Test mit `日本` in §8 | Michael beim Klicken (lehnt ab) |

### 10. Manuelle Schritte

<!-- leser: mensch -->

| Schritt | Wer | Wann | Erledigt |
|---|---|---|---|
| Zwei Bildschirm-Aufzeichnungen erstellen und vor dem Commit auf Hostnamen, Pfade, Nutzer, Ports sichten (`docs/security.md` §5); Weg: Wegwerf-Verzeichnis + `tmux -S <socket> capture-pane -p -t '=<name>:' ';' display-message -p -t '=<name>:' '#{cursor_x} #{cursor_y}'` | Claude in der Bausitzung, Sichtung durch Michael im PR-Diff | vor Umsetzung (§6 Schritt 1) | [x] erledigt 19.09.: Aufnahme in `/private/tmp/cw-023`, Sitzung danach beendet und Verzeichnis gelöscht; geprüft auf Nutzernamen, `/Users/`-Pfade, Hostnamen, URLs, Ports und Token-Muster — ohne Treffer. Sichtung durch Michael steht im PR-Diff noch aus |
| **AK-05 Messung:** In einer Sitzung mit sichtbarem Vorschlag auf „Nächster Schritt" klicken; die Phase muss starten und im Terminal dürfen nur `/clear` und der Phasenbefehl stehen | Michael | vor Merge | [ ] |
| E2E-Lauf gegen ein Zweig-Backend auf Port 3111 mit eigener tmux-Socket und Wegwerf-Projekt; Weg: `cd ui && PORT=3111 npm run dev:backend` (Live-Backend auf 3001 bleibt unberührt, keine pauschalen `pkill`) | Claude in der Bausitzung | vor Merge | [x] erledigt 19.09., Protokoll in §8 |
| Merge des PR nach `main` (löst den Auto-Deploy der UI aus) | Michael | nach grünem CI | [ ] |

Kein Deploy-Befehl, keine Freigabedatei `RELEASE_APPROVAL`, kein Zugriff auf den Cloud-Host in diesem Vorhaben.

### 11. Schätzung

<!-- leser: mensch -->

2,5–4 h. Unsicherheit steckt in Schritt 1 (die Aufzeichnungen brauchen eine echte Claude-Sitzung, die erst nach einer abgeschlossenen Runde einen Vorschlag zeigt) und im E2E-Lauf mit eigenem Backend; der Code selbst ist unter 120 Zeilen und durch die Messung vom 19.09. abgesichert. Gegenüber dem ersten Entwurf eine halbe Stunde mehr für die Nachprüfung auf Spinner und Dialog samt ihren Tests.

### 12. Review des Plans

<!-- leser: mensch -->

| Finding | Quelle | Entscheidung | Änderung am Plan |
|---|---|---|---|
| **1** Mehrzeilige Eingabe: Der Cursor steht dann auf einer Folgezeile und könnte zufällig auf Spalte 2 stehen — die Cursorspalte allein wäre fail-open (AN-02 der Absicht) | Self | **angenommen** | §3 (a)/(c): Die Probe liefert die **ungefaltete** Aufnahme mit; `eingabeLeerLautCursor` verlangt `❯` in der Cursor-Zeile. Test in §8 (AN-02). |
| **2** Cursorposition bei jeder Bildschirmlesung mitlesen wäre einfacher zu erklären, aber teurer und wegen `-J` nicht tragfähig | Self | **abgelehnt, weil** `captureScreen` weiche Umbrüche faltet und danach `cursor_y` nicht mehr zum Zeilenindex passt — man bräuchte trotzdem eine zweite Aufnahme, bei bis zu vier Lesungen je Prüfung | §3 Verworfene Alternativen |
| **3** Zwei getrennte tmux-Aufrufe (Bildschirm, dann Cursor) könnten auseinanderdriften | Self | **angenommen** | §3 (a): ein Prozessaufruf mit `';'` als eigenem argv-Element, gegen die installierte tmux-Version am 19.09. verifiziert |
| **4** Die Regel in `promptZustand` unterzubringen wäre geschlossener, macht die reine Funktion aber asynchron oder teuer | Self | **abgelehnt, weil** die Trennung „Text sagt, was gemalt ist / Aufnahme sagt, was gilt" beide Hälften einzeln prüfbar hält; Gegenmaßnahme gegen das Übersehen: Doc-Verweis in `promptZustand` | §3 (c), §4 Zeile 1 |
| **5** AK-04 (Spinner und Dialog zuerst) ist durch die Code-Reihenfolge erfüllt, aber nicht bewiesen | Self | **angenommen** | §8: Test (10f) prüft zusätzlich, dass die Probe in diesen Fällen **gar nicht** gerufen wird |
| **6** AK-03 (ohne Cursorposition wie heute) könnte durch Umbau der bestehenden Tests versehentlich verlorengehen | Self | **angenommen** | §4/§8: `readCursorProbe` bleibt **optional**; die Tests (10)/(10b) laufen mit einem Fake ohne die Methode unverändert weiter und sind damit selbst der AK-03-Beweis |
| **7** Ctrl-A/Pos1 bei getipptem Text sieht wie eine leere Zeile aus — echtes Fail-open | Self | **angenommen (als Grenze, nicht behebbar)** | §9 R2 und Doc-Kommentar der Funktion; aus der Cursorposition ist das grundsätzlich nicht unterscheidbar, und jede Textheuristik dafür verstößt gegen Z-03 |
| **8** Neue Fixture-Dateien könnten Host- oder Pfadangaben ins öffentliche Repo tragen | Self | **angenommen** | §3 Sicherheitsprüfung, §6 Schritt 1, §9 R7, §10 erste Zeile |
| **9** Neue Fixture-Dateien könnten von den bestehenden Fixture-Schleifen in `dialog-driver.test.ts` mitgelesen werden und diese brechen | Self | **angenommen** | §8 letzter Testpunkt, §9 R8 |
| **10** Der Freitext-Pfad könnte dieselbe Verbesserung gebrauchen | Self | **abgelehnt, weil** NZ-03 der Absicht ihn ausdrücklich unverändert lässt; er prüft bewusst lockerer und kennt den Zustand `eingabe_nicht_leer` gar nicht | §4 „Nicht betroffen" |
| **11 (Blocker, 3/3)** Spaltenrechnung mit festem `+1`-Versatz ist brüchig: Sie unterstellt genau ein Trennzeichen, bricht bei Layout-Änderungen still und vergleicht Terminalzellen (`cursor_x`) mit UTF-16-Einheiten (`String.length`) | externes Review (anthropic:opus, glm:glm-5.3, minimax:MiniMax-M3) | **angenommen, vollständig** | Die Rechnung ist weg. `eingabeLeerLautCursor` schneidet in §3 (c) den Zeileninhalt zwischen Eingabezeichen und Cursor heraus und prüft ihn auf Leerraum — keine erwartete Spalte, keine Trenner-Annahme. Codepoints statt UTF-16-Einheiten (`[...zeile]`), Abbruch wenn `x` über die Zeichenzahl hinausgeht; breite Zeichen führen in die sichere Richtung. Neu: §2 zweite Falle, §3 erste verworfene Alternative, §8 Test mit `日本`, §9 R9. |
| **12 (Blocker, 3/3)** Zwischen `readStableScreen` und der Cursor-Abfrage liegt ein Fenster, und nicht alle Richtungen sind gleich sicher — insbesondere: Der Nutzer **schickt** den getippten Text in dieser Zeitspanne ab, die Box ist dann leer, und `/clear` geriete in eine laufende Runde (INT-2026-018 §9 R10) | externes Review (anthropic:opus, glm:glm-5.3) | **angenommen, vollständig** | Die Probe liefert jetzt die **ganze** Aufnahme, nicht nur die Cursor-Zeile; `eingabeLeerLautCursor` prüft auf ihr zuerst Dialog-Cue und Spinner und lehnt dann ab. Damit ist die dritte Richtung geschlossen, und das verbleibende Fenster ist dasselbe wie heute. Neu: §3 (a)/(c)/(d), §8 Test (10g), §9 R5 mit allen drei Richtungen. |
| **13 (Teil von Blocker 12)** `befund.eingabe` könnte aus der älteren Lesung stammen, obwohl die Probe „leer" sagt | externes Review (anthropic:opus) | **angenommen — im Entwurf bereits so, jetzt ausdrücklich** | §3 (d) und §2 (Zeile „Fehlerweg"): `befund.eingabe` wird erst **nach** der Probe im Ablehnungszweig gesetzt, nie für einen Fall, den die Probe durchgelassen hat. |

**Minimalinvasiv geprüft:** Wiederverwendet werden `PROMPT_LINE_RE`, `BUSY_CUE` und `findDialogCue` (`dialog-driver.ts:37-46`, `:60`, `:67`), der `private tmux()`-Helfer und das Ziel-Muster `` `=${name}:` `` (`tmux-session-backend.ts:174-189`, `:363-371`), die Struktur von `readScreen` (`cloud-terminal-manager.ts:1807-1818`), das optionale Methodenmuster von `VorhabenSessionSource` (`:104-112`), der Fixture-Lader und das Testgerüst `FakeManager` sowie das Real-tmux-Testmuster (`tmux-capture-screen.test.ts:24-94`). Gestrichen wurden: ein fünfter `PromptZustand`, ein neuer `FreitextGrund` samt Meldung, ein Hinweis in der Oberfläche („die Zeile zeigt nur einen Vorschlag"), jede Auswertung der Dimmung und jedes Räumen der Eingabezeile. Kein Abnahmekriterium wurde dabei aufgegeben.

**Abgleich Mensch/Agent:** „In einfachen Worten", §9, §10, §12 gegen §2–§8 gelesen am 2026-09-19: ohne Befund — die fünf Fragen oben nennen dieselben vier Risiken wie §9 (R1–R4) und beschreiben die Nachprüfung auf laufende Runden, die §3 (c) und §8 (10g) einlösen; die beiden manuellen Schritte aus §10 stehen dort als „wird vorher ausprobiert", und die Aussage „Rückgängig machen ist einfach" deckt sich mit §4 (nur additive Änderungen, kein Protokollwert entfällt). (R4)

### 13. Definition of Done

<!-- leser: agent -->

- [x] Jede FA/AK aus Abschnitt 8 hat einen grünen Test (67 Tests in den drei Dateien, darunter 6 gegen einen echten tmux-Server).
- [x] Alle sieben Nachweise aus Abschnitt 5 ausgeführt und im PR zitiert.
- [x] E2E-Pfad läuft (Abschnitt 8, Backend auf 3111) — Protokoll in §8.
- [x] `bash scripts/verify.sh` endet mit `verify: OK`, Ausgabe im PR; **PR-Check grün** (Run 35467348900, Neulauf nach einem Flake in `vorhaben-service-stage4.test.ts`, siehe §14).
- [x] `docs/architecture.md` §2 und `docs/design.md` §4 angepasst (Abschnitt 3: Beschreibung, keine AR-Änderung).
- [x] Manuelle Schritte (Abschnitt 10): Aufzeichnungen und E2E erledigt; **AK-05 (Messung durch Michael) offen bis zum Merge**.
- [x] Abweichungen von diesem Plan in Abschnitt 14 eingetragen.
- [x] 2x-Regel-Check: kein Fehler aus der Liste wiederholt (siehe PR).
- [x] Abschlussbericht nach R3, endet mit dem Block „Für das Board".

### 14. Abweichungen bei der Umsetzung

<!-- leser: mensch -->

| Datum | Abweichung | Grund | Auswirkung auf Abschnitt |
|---|---|---|---|
| 2026-09-19 | Die zwei Aufzeichnungen liegen unter `ui/tests/fixtures/tui/**2.1.278**/`, nicht unter `2.1.277` | Die installierte Fassung ist Claude Code 2.1.278; eine Aufnahme unter einem fremden Versionsordner wäre falsch beschriftet. Der Ordner ist neu und enthält nur die beiden `cursor-*.txt` | §4 Zeile 8, §8 |
| 2026-09-19 | Die Dateinamen-Filter der bestehenden Fixture-Schleifen in `dialog-driver.test.ts` wurden **nicht** enger gefasst (R8 war als „nötigenfalls" geplant) | Geprüft: die drei Präfix-Schleifen (`plan-dialog`, `askuserquestion`, `permission`, `idle`) greifen die neuen Dateien nicht, und die Gleichwertigkeits-Schleife (`isIdlePrompt` == `promptZustand`) hält für sie. Statt eines Filters sichert ein eigener Test diesen Befund ab | §8 letzter Testpunkt, §9 R8 |
| 2026-09-19 | Test (10e) prüft zusätzlich eine Quelle **ohne** die Methode (`delete manager.readCursorProbe`), nicht nur `null` | §12 Finding 6 wollte AK-03 an einem Fake ohne die Methode beweisen; da `FakeManager` sie laut §4 Zeile 7 bekommt, deckt (10e) beide Lagen ab | §8 AK-03 |
| 2026-09-19 | Der erste CI-Lauf (Run 35467348900) war rot: `tests/unit/vorhaben-service-stage4.test.ts` als neue rote Datei. Der Neulauf desselben Commits war grün | Flake auf dem Runner, keine Regression: die Datei fährt `screenCheck` nur mit leerer Eingabezeile (`❯ `) und mit einem Dialog-Bildschirm und erreicht den geänderten Zweig `eingabe_nicht_leer` nie; lokal ist sie im Volllauf grün. `known-failures.txt` wurde **nicht** angefasst — die Datei ist grün, ein `flaky:`-Eintrag würde das Tor schwächen. Für Michael vermerkt, falls es sich wiederholt | §8 Verify-Befehl |
| 2026-09-19 | Im E2E-Lauf war der Autovorschlag nicht auf Zuruf zu bekommen: Er erschien erst, nachdem die Sitzung den Plan-Modus verlassen hatte (`⏵⏵ bypass permissions on`), und zeigte den **nächsten** Befehl (`/build INT-2026-900`), nicht den zuletzt getippten | Befund aus dem Lauf, keine Planänderung. Er stützt den Plan: Der gemalte Text ist nicht einmal Verlauf, sondern ein Vorschlag von Claude Code — genau deshalb darf er nicht als Eingabe zählen | §8 E2E-Pfad, §9 R1 |
