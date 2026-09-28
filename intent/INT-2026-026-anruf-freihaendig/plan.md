# Plan: UI: Anruf freihändig — Mikrofon nach dem Vorlesen, Senden per Schlusswort

<!-- Ablage: intent/INT-2026-026-anruf-freihaendig/plan.md -->

> **Intent:** `intent.md` (INT-2026-026) · **Spec:** `spec.md` (freigegeben 2026-09-28)
> **Status:** in_umsetzung
> **Erstellt:** 2026-09-28 im Plan Mode · **Freigabe:** Product Owner (Michael Sindlinger), 2026-09-28 — im Chat „freigabe“; D6–D9 wie vorgeschlagen
> **Pflichtinput gelesen:** `docs/architecture.md` (Stand c56ac0c), `CLAUDE.md`, `docs/security.md`, `docs/design.md`, `docs/adr/0006-anruf-liest-hook-inhalte-fluechtig.md`, `intent/INT-2026-025-agenten-anrufe/plan.md`

## In einfachen Worten

<!-- leser: mensch -->

**Worum geht es?** Seit gestern rufen dich deine Claude-Sitzungen an: Die Web-UI klingelt, liest dir vor, was die Sitzung fertig hat oder wissen will, und nimmt deine Antwort per Stimme an. Nur brauchst du dafür heute drei Klicks: „Sprechen", dann „Fertig", dann noch „Senden", nachdem die UI dir deinen eigenen Satz vorgelesen hat. Wer dafür zur Maus greift, kann auch gleich auf den Bildschirm schauen. Der Anruf soll ohne Hände gehen.

**Was ändert sich?** Sobald du einen Anruf angenommen hast, brauchst du keine Taste mehr:

- Die UI liest vor. Direkt nach dem letzten Wort geht das Mikrofon von selbst an. Der Kasten zeigt „Ich höre zu" und den Hinweis „Zum Senden: ‚Antwort senden'".
- Du sprichst, so lange du willst, auch mit Denkpausen. Nach jeder Pause steht im Kasten, was die UI bisher verstanden hat, und darunter, als was es gesendet würde.
- Sagst du am Ende „Antwort senden" (oder „Antwort absenden"), geht der Text sofort an die Sitzung, ohne das Schlusswort und ohne dass die UI ihn dir vorher noch einmal vorliest. Sie sagt kurz „Gesendet" und legt auf.
- Fällt „Antwort senden" mitten im Satz, passiert nichts; die UI hört weiter zu. Ein „senden" allein (ohne „Antwort") schickt auch nichts ab, der Kasten zeigt dann nur den Hinweis auf das richtige Schlusswort.
- Sagst du 20 Sekunden lang nichts, sagt die UI „Keine Antwort, aufgelegt" und legt auf. Nichts wird gesendet, die Meldung bleibt in der Glocke.
- „Antwort verwerfen" löscht das bisher Gesagte, die UI hört weiter zu. „Auflegen" als einziges Wort legt sofort auf.
- Einen Plan gibst du mit „freigeben" frei; die UI fragt wie bisher „wirklich freigeben?", du sagst „ja". Alles andere gibt nicht frei. Einen Änderungswunsch zum Plan sprichst du einfach und schließt mit „Antwort senden" ab.
- Bei einer Rückfrage sagst du „die zweite, Antwort senden"; hat sie mehrere Fragen, führt das Schlusswort zur nächsten, gesendet wird nach der letzten.
- Nach zwei Minuten Sprechen zu einer Frage sagt die UI „Antwort zu lang", sendet nichts und hört auf; der Text bleibt stehen.
- Die Knöpfe bleiben alle da (Senden, Verwerfen, Nochmal, Freigeben, Auflegen, Im Terminal öffnen), falls du doch zur Maus greifst. Die Knöpfe „Sprechen" und „Fertig" und das Halten der Leertaste fallen weg. Neu ist ein Knopf „Zuhören", der nur erscheint, wenn das Mikrofon zu ist (etwa nach einem Fehler).
- Ist der Anrufmodus aus, ändert sich nichts. Einen eigenen Schalter „freihändig" gibt es nicht.

**Wie wird das gemacht?** Drei Dinge fehlen heute im Code, und die baut dieses Vorhaben:

1. **Merken, wann die UI fertig vorgelesen hat.** Heute gibt die UI ihre Sätze an die Vorlesefunktion des Browsers und kümmert sich nicht mehr darum. Künftig wartet sie auf die Meldung „letzter Satz fertig". Weil diese Meldung im Chrome nicht immer zuverlässig kommt, schaut sie zusätzlich alle halbe Sekunde nach, ob der Browser noch spricht. Erst danach geht das Mikrofon an. Während die UI spricht, ist das Mikrofon wirklich aus (nicht nur stummgeschaltet), damit sie sich nicht selbst hört.

2. **Sprechpausen erkennen.** Die UI misst laufend, wie laut es am Mikrofon ist, in Stücken von 30 Millisekunden. Sie lernt in den ersten Momenten, wie laut der Raum ohne Sprache ist (Lüfter, leise Musik), und zählt nur deutlich Lauteres als Sprechen. Eine Sekunde Ruhe nach dem Sprechen ist eine Sprechpause. Dann schickt sie genau dieses gesprochene Stück (nicht alles von Anfang an) an die Spracherkennung auf deinem Mac und hängt den erkannten Text an das bisher Verstandene an. Das hält jede Erkennung kurz: gestern gemessen 0,64 Sekunden für einen Satz von zehn Sekunden. Vom Ende des Schlussworts bis die Sitzung die Antwort hat, rechne ich mit gut zwei Sekunden (eine Sekunde Pause abwarten, knapp eine Sekunde erkennen, dann tippen); Ziel ist höchstens drei.

3. **Das Schlusswort am Ende finden.** Nach jeder Pause prüft die UI, ob der bisher verstandene Text auf „Antwort senden" oder „Antwort absenden" endet (auch „Antworten senden", egal ob mit Punkt oder großgeschrieben). Nur dann schneidet sie das Schlusswort ab und sendet den Rest. Einzelwörter wie „freigeben", „ja", „nein", „nochmal", „auflegen" wirken nur, wenn sie das Einzige sind, was du seit dem Öffnen des Mikrofons gesagt hast.

Die 20 Sekunden Stille zählen ab dem Öffnen des Mikrofons und neu ab jedem Stück, in dem die Erkennung tatsächlich Worte gefunden hat. Geräusche, die kurz lauter sind, aber keine Worte ergeben (Tastatur, Husten, die bekannten erfundenen Sätze des Erkenners wie „Vielen Dank."), setzen die Uhr nicht zurück.

Am Backend ändert sich wenig: Jedes Audiostück bekommt eine laufende Nummer, damit die Texte in der richtigen Reihenfolge zusammengesetzt werden, auch wenn die Erkennung zwei Stücke gleichzeitig bearbeitet. Und das Backend deckelt die Audiomenge je Anruf bei zehn Minuten, als Schutz gegen ein Fenster, das aus einem Fehler heraus endlos Audio schickt. Die Grenze von 30 Sekunden je Stück bleibt.

Dazu wird ein neues Bild des Anruf-Kastens gezeichnet (Mock, Pflicht bei geändertem Ablauf), und die Projekt-Dokumente (Sicherheit, Architektur, Design, Produktbeschreibung) werden an den Stellen nachgezogen, an denen noch „Sprechen" und „Fertig" steht. In den Dokumenten von INT-2026-025 kommt an den betroffenen Stellen nur ein Hinweis „geändert durch INT-2026-026" dazu.

**Was kann schiefgehen?**

- **Falsch verstandene Antwort geht raus.** Das ist die bewusste Folge des Vorhabens: Wer „Antwort senden" sagt, sendet, ohne dass die UI zurückliest. Du hast das bei der Freigabe der Absicht angenommen. Eine Plan-Freigabe bleibt mit Nachfrage geschützt. Die Sicherheitsbeschreibung (Bedrohung T-08) wird entsprechend neu gefasst.
- **Die UI hört nicht auf zuzuhören**, weil ein Geräusch im Raum dauernd als Sprechen zählt. Dann legt sie trotzdem auf: Ein Stück wird spätestens nach 30 Sekunden abgeschnitten und erkannt; ergibt es keine Worte, läuft die 20-Sekunden-Uhr weiter. Schlimmstenfalls dauert das Auflegen bei Dauerlärm also bis zu 50 Sekunden statt 20. Du merkst es, wenn der Kasten zu lange „Ich höre zu" zeigt.
- **Die UI schneidet dich in einer Denkpause ab.** Das passiert nicht: Eine Pause erzeugt nur ein Zwischenergebnis, gesendet wird nur mit dem Schlusswort. Aufgelegt wird erst nach 20 Sekunden ohne Worte.
- **Das Mikrofon geht nach dem Vorlesen nicht auf**, weil der Browser das Ende des Vorlesens nicht meldet. Dagegen hilft das halbsekündliche Nachsehen. Zusätzlich rechnet die UI aus der Textlänge aus, wie lange das Vorlesen höchstens dauern darf. Chrome hält das Vorlesen in einem Tab im Hintergrund manchmal einfach an; ist die Frist dann vorbei, bricht die UI das Vorlesen ab und öffnet das Mikrofon trotzdem. Der Rest steht im Kasten, „Nochmal" liest ihn erneut. Das prüfst du bei der Messung am Mac auch mit Tab im Hintergrund.
- **Du sprichst direkt nach dem Schlusswort weiter.** Dann wartet die UI, bis auch dieses Stück erkannt ist. Steht „Antwort senden" danach nicht mehr am Ende, geht nichts raus.
- **Die Erkennung antwortet nicht** (Absturz, Verbindung weg). Nach 15 Sekunden gilt das Stück als „nicht verstanden", die 20-Sekunden-Uhr läuft weiter. Reißt die Verbindung zum Backend ab, hört die UI auf zuzuhören und sendet nichts.
- **Die Erkennung erfindet „Antwort senden"** aus einem Geräusch. Das ist unwahrscheinlich, weil nur Stücke mit deutlichem Pegel erkannt werden und die UI die typischen erfundenen Sätze kennt. Ganz ausschließen lässt es sich ohne Rückfrage nicht; die Messung prüft es.
- **Das Schlusswort wird schlecht erkannt.** Dann hilft nur ein anderes Schlusswort. Die Messung vor dem Merge (20 Antworten mit deiner Stimme) zeigt das; verfehlt sie das Ziel, halte ich an und frage dich.
- **Rückweg:** Anrufmodus ausschalten. Dann verhält sich die UI wie ohne Anruf. Ein Zurück zum Klick-Ablauf von gestern gibt es nur über das Zurücknehmen der PR.

**Was musst du entscheiden?**

Nichts, Freigabe reicht. Vier kleine Auslegungen habe ich selbst getroffen (Details §3, D6–D9); widersprich, wenn eine nicht passt:

- Nach einem gescheiterten Senden bleibt der Text fest stehen. Weiteres Sprechen hängt nichts an; es zählen nur „Antwort senden" (erneut senden), „Antwort verwerfen" und „auflegen". So wie nach „Antwort zu lang".
- Der Knopf „Nochmal" liest erneut vor und behält das bisher Gesprochene.
- Fällt das Mikrofon während des Anrufs weg oder wird es verweigert, legt die UI nicht mehr auf (so war es gestern), sondern sagt den Grund an und zeigt den Knopf „Zuhören"; senden, freigeben und auflegen gehen weiter per Knopf. Das verlangt die Spec (FA-21). Damit das Backend den Anruf nicht nach 30 Sekunden selbst beendet, meldet die UI ihm das fehlende Mikrofon erst nach dem Auflegen.
- Hinweise wie „Verworfen", „Nicht gesendet: …" oder „Passt auf 1 und 3 — Nummer sagen" liest die UI vor und öffnet danach wieder das Mikrofon. Nur der Hinweis auf das richtige Schlusswort (nach „senden" ohne „Antwort") steht bloß im Kasten, damit das Zuhören nicht unterbrochen wird.

Die Messungen mit deiner Stimme (Schlusswort 20-mal, „senden" mitten im Satz 20-mal, Pausen 10-mal, Zeit bis zur Sitzung 10-mal) brauchen vor dem Merge etwa 20 Minuten von dir am Mac (§10).

## Details

<!-- leser: mensch -->

### 1. Kurzfassung

<!-- leser: mensch -->

Der Browser-Dienst `AnrufClientService` bekommt eine Zuhör-Schleife: Nach dem Ende des Vorlesens (neues Ende-Signal der Sprachausgabe, D4) öffnet er das Mikrofon, erkennt Sprechpausen per adaptivem Pegel über Probenzeit (neues reines Modul `anruf-sprechpausen.ts`, D2), schickt jedes Sprechstück nummeriert an die bestehende Erkennung (`anruf:erkennen` + `abschnitt`, D5), setzt die Texte in Reihenfolge zusammen und prüft nach jedem Stück auf Schlusswort und Einzelwort-Befehle (neue reine Funktionen in `anruf-befehle.ts`, D1). Die Bestätigungsphase und die Sprechtaste entfallen; das Backend bleibt bis auf die Abschnittsnummer und einen Audio-Deckel je Anruf unverändert (AR-08-Sendeweg unberührt).

### 2. Ausgangslage im Code

<!-- leser: agent -->

| Bereich | Heute (Datei:Zeile) | Bedeutung für dieses Vorhaben |
|---|---|---|
| Sprachausgabe | `ui/frontend/src/services/anruf.service.ts:54-60` (`AnrufSprachausgabe.speak` ohne Rückmeldung), `:733-739` `sprich()` satzweise, `:1043-1051` Browser-Impl ohne `onend` | **ändern**: `speak` meldet Ende/Abbruch; `sprich()` liefert ein Versprechen `'fertig' | 'abgebrochen'` [Certain] |
| Aufnahme | `anruf.service.ts:759-843` `sprechenStart`/`sprechenEnde`: ein Stück bis „Fertig" oder 30 s (`:806`), Prüfung Dauer/Pegel (`:831`), dann `anruf:erkennen` | **ersetzen** durch Zuhör-Schleife; `stromAus()`/`starteAufnahme` (`:993-1027`, AudioWorklet) **wiederverwenden** [Certain] |
| Mikrofon weg | `anruf.service.ts:846-861` `mikrofonWeg`: legt auf; ruft `sprich()` **vor** `beendeEigen()`, das `sprache.cancel()` ruft (`:957`) — die Ansage wird sofort abgebrochen | **ändern** (FA-21: nicht auflegen, „Zuhören"); Falle: Reihenfolge sprich/cancel [Certain] |
| Deutung Text | `anruf.service.ts:875-927` `verarbeiteText`: Kontexte `antwort`/`bestaetigen`/`nachfrage`, Kandidat + „Senden oder verwerfen?" | **ersetzen**: ohne Bestätigung; `kandidatAus()` (`:929-951`) **wiederverwenden** für „Wird gesendet als" [Certain] |
| Mehrere Fragen | `anruf.service.ts:648-669` `absenden()`: sammelt `antworten`, nächste Frage | Logik **wiederverwenden**, ausgelöst durch Schlusswort statt Knopf [Certain] |
| Plan-Nachfrage | `anruf.service.ts:448-452` (Wechsel nach `freigabe_nachfrage` → `sprich(nachfrageText)`), `:699-729` `freigebenAnfragen`/`freigeben`/`nein` | **wiederverwenden**; nach dem Vorlesen öffnet sich das Mikrofon im Kontext `nachfrage` [Certain] |
| Befehle | `ui/src/shared/anruf-befehle.ts:26-46` `deuteSprache`: nur ganzer Text; `senden`, `absenden`, `verwerfen`, `nochmal`, `freigeben`, `ja`, `nein`; kein `auflegen` | **erweitern**: `auflegen`; neue Funktion `pruefeSchluss()`; `senden`/`verwerfen` als Einzelwort entfallen (FA-07/B-01) [Certain] |
| Audio-Helfer | `ui/src/shared/anruf-audio.ts:19,45,94,105` `downsampleAuf16k`, `int16ZuBase64`, `rms`, `dauerSekunden` | **wiederverwenden** je Stück [Certain] |
| Protokoll | `ui/src/shared/types/anruf.protocol.ts:118` `AnrufErkennenMessage` ohne Nummer; `:177-179` `AnrufErkanntMessage`; `:202-204` `ANRUF_AUDIO_MAX_S`=30, `ANRUF_AUDIO_MAX_BASE64` | **erweitern** um `abschnitt?: number`; Grenze je Stück bleibt [Certain] |
| Backend Erkennen | `ui/src/server/services/anruf-handler.ts:102-112` `pruefeAudio`, `:202-209`; `anruf-service.ts:398-421` `erkennen()` — nur Besitzer, laufender Anruf, Ergebnis verfällt nach Auflegen | **erweitern**: Nummer durchreichen, Deckel je Anruf [Certain] |
| Erkennung | `ui/src/server/services/sprach-erkennung.ts:292-322` `erkenne()` — je Aufruf ein `fetch` an `/inference`; Halluzinationsliste `:62-135` | unverändert; parallele Aufrufe laufen im `whisper-server` nacheinander [Likely: whisper-server serialisiert per Mutex] → Nummer ordnet |
| Auflegen | `ui/src/server/services/anruf-zustand.ts:207-214` — ohne Senden, Meldung bleibt in der Glocke, klingelt nicht erneut (FA-25 alt) | **wiederverwenden** für 20-s-Stille (FA-09, AN-S07) [Certain] |
| Fähigkeit | `anruf-service.ts:283-296` `faehig()`: Client nicht fähig → Kulanz 30 s → `niemand_da` | Falle: Frontend meldet bei Mikrofonfehler `mikrofon≠ok`; nach 30 s endet der Anruf im Backend. FA-21 verlangt Weiterführung per Knopf → Meldung nur bei `verweigert`, nicht bei vorübergehendem Stückfehler (D9) [Certain] |
| Kasten | `ui/frontend/src/components/anruf/aos-anruf.ts:124-190` Phasen `vorlesen`/`hoeren`/`erkennen`/`bestaetigen`/`nachfrage`/`sendet`; `:253-271` Leertaste | **ändern**: neue Phase `zuhoeren`, `mikrofon_zu`; Leertaste weg (AN-S04). Light DOM, Styles `aos-app .anruf*` in `theme.css:6483-6500` [Certain] |
| Tests | `ui/tests/unit/anruf-frontend-service.test.ts` (386 Z.), `aos-anruf.test.ts` (310), `anruf-befehle.test.ts` (72), `anruf-handler.test.ts`, `anruf-service.test.ts`; Fakes `ui/tests/unit/anruf-fakes.ts:39-135` (`FakeSprache`, `FakeStrom.liefere()`) | **ändern/erweitern**; Fakes um Ende-Signal und Stille ergänzen |
| Konsumenten der entfallenden API | `sprechenStart`, `sprechenEnde`, `nochmalSprechen`, `absenden`: nur `aos-anruf.ts` und `anruf-frontend-service.test.ts` (grep) | kein weiterer Konsument [Certain] |
| Mock | `intent/INT-2026-025-agenten-anrufe/design/anruf-mock.html` (+ `.png`) | **Vorlage** für `intent/INT-2026-026-anruf-freihaendig/design/anruf-freihaendig-mock.html/.png` |

### 3. Entwurf

<!-- leser: agent -->

#### Ansatz

<!-- leser: agent -->

**D1 — Schlusswort und Einzelwort (rein, `ui/src/shared/anruf-befehle.ts`).**

- `pruefeSchluss(text): { art: 'senden'; rest: string } | { art: 'verwerfen' } | { art: 'nur_senden' } | { art: 'offen' }`.
    - Regex auf dem Original (Flags `iu`): `(^|[\s\p{P}])antwort(en)?[\s\p{P}]*(ab)?senden[\s\p{P}]*$` → `senden` (`\p{P}` deckt alle Satzzeichen samt aller Strich-Varianten, Finding 11), `rest` = Text davor, rechts von Leerraum/Kommas/Gedankenstrichen befreit (Satzpunkt am Ende des Rests bleibt).
    - `antwort(en)? verwerfen` am Ende → `verwerfen`.
    - Endet auf `(ab)?senden` ohne `antwort` davor → `nur_senden` (FA-07).
    - sonst `offen`.
- `deuteSprache(text, kontext)`: Tabelle `antwort` = `nochmal`, `nochmals`, `freigeben`, `auflegen`; `nachfrage` = `ja`, `nein`, `auflegen`, `nochmal`. `senden`/`absenden`/`verwerfen`/`nochmalsprechen` als Einzelwort **entfallen** (B-01: nur Schlusswort sendet; „Antwort senden" allein erfasst `pruefeSchluss` als `senden` mit leerem Rest).

**D2 — Sprechpausen über Probenzeit (rein, neu `ui/frontend/src/services/anruf-sprechpausen.ts`).** Klasse `Sprechpausen` bekommt Float32-Stücke mit Rate, rechnet intern in 16 kHz (`downsampleAuf16k` je Stück) und in Rahmen zu 30 ms:

- Pegel je Rahmen `rms`. Grundrauschen: beim ersten Öffnen eines Anrufs das 20.-Perzentil der Rahmen der ersten 300 ms (spricht Michael sofort los, bleiben die leisen Rahmen zwischen Silben maßgeblich, Finding 5); danach gleitendes Mittel nur über Rahmen unter der Schwelle; der gelernte Wert wird an die nächste Instanz desselben Anrufs weitergegeben (`new Sprechpausen({ grundrauschen })`), sodass nur das erste Öffnen kalt startet. Schwelle = `min(0,05, max(ANRUF_RMS_SCHWELLE, 3 × Grundrauschen))` (Obergrenze gegen verdorbenes Grundrauschen, R3).
- `pegelSeit(sek)`: ob seit Probenzeit `sek` ein Rahmen über der Schwelle lag (auch unterhalb der 3-Rahmen-Startgrenze). `onRuhe()`: nach Pegelaktivität, die **kein** Stück ergab (zu kurz), 1000 ms Ruhe (Finding 1). Sprache beginnt nach 3 Rahmen (90 ms) über der Schwelle; 300 ms Vorlauf werden mitgenommen (Silbenanfang).
- Pause = `ANRUF_PAUSE_MS` = 1000 ms unter der Schwelle nach Sprache (AN-S01). Dann `onStueck(pcm16k, startSek, endeSek)`. Stücke < `ANRUF_MIN_DAUER_S` (0,4 s) oder mit Pegel < Schwelle werden verworfen.
- Zwangsschnitt nach `ANRUF_AUDIO_MAX_S` (30 s) Dauerpegel → Stück abgeben, Zustand „spricht" bleibt.
- Liefert `jetztSek` (Probenzeit seit Öffnen) und `sprichtGerade`. Keine Uhr, kein Browser-API → deterministisch testbar.

**D3 — Zuhör-Schleife (`anruf.service.ts`).**

- **Diktat als eigene reine Klasse** (neu `ui/frontend/src/services/anruf-diktat.ts`, Finding 16): `Diktat` hält Stücke nach Nummer, gibt nur den lückenlosen Text heraus (`text`, `offen: number`), summiert Sekunden, merkt `letzteSpracheSek` und `gehalten`/`gesperrt`; Methoden `neuesStueck(dauer, endeSek) → nr`, `ergebnis(nr, text | null)`, `leeren()`, `halten()`. Eigene Tests. Der Dienst hält davon genau eine Instanz im `EigenerAnruf` und bleibt Ablaufsteuerung. Speicher: höchstens 120 s / 0,4 s = 300 kurze Strings je Frage, geleert je Frage (Finding 7 abgelehnt, siehe §12).
- `vorleseDannHoere(text, kontext)`: Mikrofon zu (`stoppeZuhoeren`), `await sprich(text)`; bei `'fertig'` und unverändertem Vorlese-Zähler → `hoereZu(kontext)`.
- `hoereZu()`: `mikrofon.oeffne()` → `starteAufnahme(chunk → sprechpausen.fuettere(chunk))`; `onStueck` → `anruf:erkennen { meldungId, audio, abschnitt: nr }`, `diktat.sekunden += dauer`; bei jedem Stück-Ende und jedem Rahmen: Stille-Prüfung `jetztSek − letzteSpracheSek ≥ 20` und nicht `sprichtGerade` und keine Erkennung offen → `stilleAuflegen()`.
- `onErkannt` mit `abschnitt`: Text (oder `null` bei `nichts_verstanden`) eintragen; der Reihe nach auswerten, solange lückenlos. Text ≠ leer → `letzteSpracheSek = endeSek` des Stücks (Reset, FA-09/FA-10), an `diktat.text` anhängen (Leerzeichen), dann `werteAus()`.
    - `erkennung_neustart`/`erkennung_fehlt`: Mikrofon zu, Hinweis vorlesen, danach wieder zuhören bzw. bei `erkennung_fehlt` Phase `mikrofon_zu` mit „Im Terminal öffnen".
- `werteAus()` (Reihenfolge):
    1. Kontext `nachfrage`: ganzer Text `ja` → `freigeben()`; `nein` → `vorleseDannHoere('Nicht freigegeben.', 'antwort')`; `auflegen` → auflegen; sonst → „Nicht freigegeben. Sag ja oder nein." und erneut `nachfrage` (FA-14).
    2. Ganzer Text Einzelwort (`deuteSprache`): `auflegen` → auflegen; `nochmal` → erneut vorlesen; `freigeben` bei Plan → `freigebenAnfragen()` (FA-13).
    3. `pruefeSchluss(text)`:
        - `senden` mit Rest leer → gehaltener Text vorhanden? erneut senden : Hinweis „Noch keine Antwort — erst sprechen." vorlesen, zuhören (FA-08).
        - `senden` mit Rest → Kandidat aus `kandidatAus(m, frageIndex, rest)`; mehrdeutig → „Passt auf 1 und 3 — Nummer sagen" vorlesen, Diktat leeren, zuhören (FA-16); Rückfrage nicht letzte Frage → `antworten` sammeln, nächste Frage vorlesen; sonst `senden()` (Mikrofon zu, Phase `sendet`) (FA-05, FA-15, FA-16).
        - `verwerfen` → Diktat und gehaltenen Text leeren, „Verworfen" vorlesen, zuhören (FA-12).
        - `nur_senden` → `hinweis` = „Zum Senden: ‚Antwort senden'" (nicht vorlesen), weiter zuhören (FA-07).
        - `offen` → weiter zuhören; `gesperrt` (gehalten) → Text wird nicht angehängt, Hinweis „Gehaltener Text: ‚Antwort senden' oder ‚Antwort verwerfen'" (D6).
    4. `diktat.sekunden ≥ 120` → „Antwort zu lang" vorlesen, `gehalten = gesperrt = true`, **Mikrofon aus**, Phase `mikrofon_zu` mit „Zuhören" (FA-11, AN-S02). Nach „Zuhören" gelten nur Schlusswort allein, „Antwort verwerfen", „auflegen".
- Ergebnis `anruf:ergebnis` ok → „Gesendet." (nach `beendeEigen`, D10), kein Mikrofon (FA-18). Fehler → „Nicht gesendet. …" vorlesen, `gehalten = gesperrt = true`, zuhören (FA-17); `schon_beantwortet` → auflegen wie heute (Backend beendet ohnehin).
- **Wann ausgewertet wird (R6, Finding 1):** `werteAus()` läuft nur, wenn alle bisher abgegebenen Stücke ein Ergebnis haben **und** seit dem Ende des letzten Stücks kein Rahmen über der Schwelle lag (`pegelSeit(endeSek)` falsch — schärfer als `sprichtGerade`, das erst nach 90 ms Pegel kippt). Sonst wartet sie auf das nächste Stück oder auf `onRuhe()` und prüft dann neu. Steht das Schlusswort dann nicht mehr am Ende, wird nicht gesendet (FA-06). Während `sendet` ist das Mikrofon zu.
- **Einzelwort-Zeitpunkt (Finding 12):** „ganzer Text" = der lückenlose Diktat-Text im Moment der Auswertung nach einer Sprechpause, unter denselben Bedingungen wie oben; „auflegen", Pause, weiterreden → wirkt schon nach der Pause.
- **Ausbleibende Erkennung (Finding 9):** je Stück eine Frist von 15 s (Wanduhr); läuft sie ab, gilt das Stück als `null` (nichts verstanden), Hinweis „Nicht verstanden" nur angezeigt; die 20-s-Uhr läuft weiter. Ein verspätetes Ergebnis zu einer schon abgelaufenen Nummer wird verworfen.
- **Verbindung weg (Finding 21):** `gateway.disconnected` (`ui/frontend/src/gateway.ts:132`) → Zuhören stoppen, Sprache abbrechen, Diktat leeren, Ergebnis „Verbindung unterbrochen — nichts gesendet"; das Backend beendet den Anruf ohnehin über `client.weg` (`anruf-zustand.ts:216`).
- **Deckel erreicht (Finding 13):** `anruf:error` während `zuhoeren` → Zuhören stoppen, Phase `mikrofon_zu` mit Grund; Ergebnisse schon abgeschickter Nummern werden noch eingetragen (angezeigt), aber nicht mehr ausgewertet — gesendet wird nur per Knopf oder nach „Zuhören" mit Schlusswort allein (gehaltener Text, D6).
- **Anzeige zwischen Abschicken und Ergebnis (Finding 8):** `text` = nur der lückenlose Teil; `erkenntNoch` = `offen > 0` → Kasten zeigt hinter dem Text „…" und „wird erkannt"; „Wird gesendet als" bezieht sich immer auf `text` ohne Schlusswort.
- **Kontext Nachfrage:** der bestehende Zweig `onState` → `freigabe_nachfrage` (`anruf.service.ts:448-452`) und `freigebenAnfragen()` bei schon laufender Nachfrage (`:706-707`) rufen `vorleseDannHoere(nachfrageText, 'nachfrage')` statt `sprich()`.
- **Ohne Inhalt (`nurTerminal`, `anruf.service.ts:228-233`):** nach dem Vorlesen öffnet das Mikrofon **nicht**; Kasten wie heute nur „Im Terminal öffnen", „Auflegen" (Spec: Sprachantwort nur mit Inhalt).
- **Je Öffnen neu:** eine `Sprechpausen`-Instanz je `hoereZu()` (Grundrauschen neu gelernt, Probenzeit und 20-s-Uhr ab Öffnen, FA-09). Das Diktat überlebt das Schließen für Hinweise und „Nochmal"; geleert wird es bei Senden, Weiter zur nächsten Frage, „Antwort verwerfen", Mehrdeutigkeit, Auflegen.
- `stilleAuflegen()`: `auflegen()`, dann `sprich('Keine Antwort, aufgelegt.')`, Ergebnis `{ ok:false, text:'Keine Antwort, aufgelegt' }` (FA-09, B-05).
- Knöpfe: `senden()` schickt den angezeigten Text (Diktat oder gehalten, ohne Schlusswort) über denselben Weg wie das Schlusswort; ohne Text ist der Knopf gesperrt (`disabled`, Mock b/e). `verwerfen()` leert, Zuhören läuft weiter. `nochmal()` Mikrofon zu, erneut vorlesen, danach zuhören, Diktat bleibt (D7). `zuhoeren()` öffnet erneut (FA-21). `freigebenAnfragen()`, `freigeben()`, `nein()`, `auflegen()`, `annehmen()` … unverändert.
- Mikrofon nur in Phase `zuhoeren` eines eigenen, laufenden Anrufs (FA-03): `beendeEigen()`, `onState` ohne eigenen Anruf, Modus aus → `stoppeZuhoeren()`.

**D4 — Ende des Vorlesens.** `AnrufSprachausgabe.speak(text, stimme, beiEnde?: (ok: boolean) => void)`. Browser: `u.onend = () => beiEnde(true)`, `u.onerror = (e) => beiEnde(e.error !== 'interrupted' && e.error !== 'canceled')`. `sprich()` hängt `beiEnde` nur an den letzten Satz, zählt einen Vorlese-Zähler hoch (jedes neue `sprich`/`cancel` macht alte Versprechen zu `'abgebrochen'`) und löst sein Versprechen **genau einmal** auf (erstes Signal gewinnt, alle weiteren sind wirkungslos; `hoereZu()` ist zusätzlich idempotent, solange ein Strom offen ist oder geöffnet wird — Finding 1). Rückfälle für ausbleibendes `onend` (AN-02, Finding 2):

1. alle 500 ms `aktiv()` (neu im Interface = `speechSynthesis.speaking || speechSynthesis.pending`, damit die Lücke zwischen zwei Sätzen nicht als Ende zählt): zweimal hintereinander `false` → `'fertig'`;
2. harte Frist aus der Textlänge: `3 s + Zeichen × 90 ms` (≈ 11 Zeichen/s, Anna spricht ~14) — läuft sie ab, obwohl `aktiv()` noch `true` meldet (Chrome pausiert die Sprachausgabe im Hintergrund-Tab, `speaking` bleibt dann `true`), wird `cancel()` gerufen und als `'fertig'` behandelt: das Mikrofon öffnet, der Rest des Vorlesens fehlt, der Text steht im Kasten; „Nochmal" liest erneut.

Gedrosselte Timer im Hintergrund (1 s statt 500 ms) verzögern das Öffnen um höchstens ~2 s; das ist hingenommen und wird in §10 im Hintergrund-Tab gemessen. `speechSynthesis` nutzt im Frontend nur dieser Dienst (grep, §5), die globale Abfrage stört also nichts (Finding 15). Keine Stimme → sofort `'fertig'`.

**Aufrufstellen von `sprich()` heute (Finding 17)** und was daraus wird:

| Stelle | Heute | Neu |
|---|---|---|
| `anruf.service.ts:451`, `:707` | Nachfrage vorlesen | `vorleseDannHoere(…, 'nachfrage')` |
| `:460` | `endeGrund` nach Anrufende | bleibt `sprich` (kein Anruf mehr) |
| `:475` | Erkennungsfehler | `vorleseDannHoere(hinweis, kontext)` |
| `:489` | „Gesendet." | bleibt `sprich`, nach `beendeEigen` (FA-18) |
| `:494` | „Nicht gesendet. …" | `vorleseDannHoere(…, kontext)` mit gehaltenem Text (FA-17) |
| `:727` | „Nicht freigegeben." | `vorleseDannHoere(…, 'antwort')` |
| `:745` | Vorlesen der Meldung/Frage | `vorleseDannHoere(…, 'antwort')`, bei `nurTerminal` nur `sprich` |
| `:834` | „Nichts verstanden" (Aufnahme zu leise) | entfällt (Pausenmodul verwirft stumme Stücke) |
| `:849` | „Mikrofon nicht verfügbar" | `sprich` nach Stopp, Phase `mikrofon_zu` (D9, D10) |
| `:887` | „Nicht freigegeben. Sag ja oder nein." | `vorleseDannHoere(…, 'nachfrage')` |
| `:920`, `:926` | Befehl ohne Antwort / Kandidat vorlesen | `:920` → `vorleseDannHoere`; `:926` entfällt (kein Vorlesen vor dem Senden, AK-03) |
| neu | „Verworfen", Mehrdeutigkeit, „Antwort zu lang", „Keine Antwort, aufgelegt" | wie in D3/D8 |

**D5 — Protokoll und Backend.** `AnrufErkennenMessage.abschnitt?: number` (ganze Zahl 0…100 000, Handler prüft), in `AnrufErkanntMessage` zurückgegeben. `AnrufService.erkennen()` zählt `pcm.length / 16000` je laufendem Anruf (ein Feld `{ meldungId, sekunden }`, beim Wechsel der Meldung zurückgesetzt); über `ANRUF_AUDIO_MAX_JE_ANRUF_S` = 600 → `anruf:error INVALID_MESSAGE` „Zu viel Audio in diesem Anruf." ohne Erkennung. Grenze je Nachricht bleibt 30 s.

**D6 — Gehaltener Text** (Auslegung FA-17/AN-S02, ER-00): nach gescheitertem Senden und nach „zu lang" wird nichts angehängt; nur Schlusswort allein, „Antwort verwerfen", „auflegen" und Knöpfe wirken.

**D7 — Knopf „Nochmal"** behält das Diktat (Einzelwort „nochmal" hat per Definition kein Diktat).

**D8 — Ansagen:** vorgelesen werden „Verworfen", „Nicht gesendet: …", „Nicht freigegeben.", Mehrdeutigkeit, „Noch keine Antwort — erst sprechen.", Erkennungsfehler, „Antwort zu lang", „Mikrofon nicht verfügbar: …"; danach öffnet das Mikrofon wieder (FA-01). Nur angezeigt: Hinweis nach `nur_senden` und nach Sprache bei gehaltenem Text (AN-S06).

**D9 — Mikrofonfehler (FA-21, Finding 4):** `oeffne()` wirft oder Spur endet → Zuhören stoppen, Grund ansagen und anzeigen (`NotAllowedError`/`SecurityError`: „Mikrofon nicht freigegeben"; sonst „Mikrofon nicht verfügbar"), Phase `mikrofon_zu` mit „Zuhören", **kein** Auflegen. Während eines eigenen laufenden Anrufs wird **kein** geänderter Fähigkeitswert an das Backend gemeldet (sonst beendet dessen Kulanz von 30 s den Anruf, `anruf-service.ts:283-296`, und FA-21 „per Knopf weiterführbar" wäre gebrochen). `setzeFaehig`/`meldeFaehig` merken sich den neuen Wert und melden ihn erst beim Anrufende (`beendeEigen`); `onErlaubnisAenderung` während des Anrufs ebenso. Senden, Freigeben, Auflegen per Knopf gehen ohne Mikrofon.

**D10 — Ansage nach Auflegen:** `sprich()` immer **nach** `beendeEigen()` (behebt die Reihenfolge in `anruf.service.ts:849-852`).

**Konstanten** (neu in `anruf.protocol.ts`, Frontend und Backend nutzen sie): `ANRUF_PAUSE_MS = 1000`, `ANRUF_STILLE_S = 20`, `ANRUF_ANTWORT_MAX_S = 120`, `ANRUF_AUDIO_MAX_JE_ANRUF_S = 600`. Schwellen im Pausen-Modul (`RAHMEN_MS = 30`, `VORLAUF_MS = 300`, `START_RAHMEN = 3`, `RAUSCH_FAKTOR = 3`) — ER-01, Anpassung innerhalb EK-01/EK-04 erlaubt, jede Änderung in §14.

**Ansicht (`AnrufAnsicht`):** Phasen `ruhe | klingelt | fremd | vorlesen | zuhoeren | mikrofon_zu | nachfrage | sendet | ergebnis` (`hoeren`, `erkennen`, `bestaetigen` entfallen). Neue Felder: `text` (bisher verstanden), `als` (aus `kandidatAus`), `erkenntNoch: boolean`, `gehalten: boolean`, `hoertInNachfrage: boolean`. `nachfrage` bleibt Phase, solange die UI die Nachfrage vorliest; hört sie danach zu, Phase `zuhoeren` mit `hoertInNachfrage`.

#### Verworfene Alternativen

<!-- leser: agent -->

| Alternative | Warum nicht |
|---|---|
| Nach jeder Pause das **ganze** bisherige Audio neu erkennen | Erkennung wächst mit der Antwortlänge (bis 2 min → mehrere Sekunden), bricht EK-01 und die 30-s-Grenze je Nachricht; Mehrgewinn (Kontext über Pausen) klein, da Pausen Satzgrenzen sind |
| Fertige Sprechpausen-Erkennung (z. B. `@ricky0123/vad-web`, Silero-VAD per ONNX) | neue externe Abhängigkeit (ER-02: fragen), Modell-Download, WASM im Worklet; Pegelmessung mit gelerntem Grundrauschen reicht für einen Raum mit einem Sprecher, Messung EK-04 entscheidet |
| Web Speech API `SpeechRecognition` für Pausen und Zwischentext | Chrome schickt Audio an Google (NZ-04, RB-01, ADR-0006) |
| Mikrofon den ganzen Anruf offen lassen, Stücke während des Vorlesens verwerfen | FA-02/AK-02 „DARF NICHT hören" und FA-03 „nur offen, während … auf Antwort wartet"; die Mikrofonanzeige des Mac wäre dauernd an. Kosten des Wiederöffnens ~0,1–0,3 s [Likely] sind tragbar |
| 20-s-Uhr nach Wanduhr (`setTimeout`) statt Probenzeit | Hintergrund-Tabs drosseln Timer; Probenzeit aus dem Worklet ist genau und in Tests deterministisch; Wanduhr bleibt nur für die Vorlese-Rückfallprüfung (D4) |
| Pegel allein setzt die 20 s zurück | Lüfter/Musik hielte den Anruf offen (FA-10); deshalb zählt nur ein Stück mit erkanntem Text |
| Gesamtdeckel 2 min je Frage im Backend (Vorschlag Spec §7) | Backend kennt die Frage nicht; Deckel je Anruf (10 min) schützt gegen Dauerversand, die 2 min je Frage ist UX-Regel im Frontend |

#### Architektur-Auswirkung

<!-- leser: agent -->

- **Nein** — keine Grenze verschoben. AR-05 (Anrufzustand im Backend) bleibt: das Diktat ist flüchtiger Browser-Zustand wie heute Kandidat und Aufnahme; AR-08 (Senden nur in gerade gelesenen Zustand, `anruf-sender.ts`) unverändert; kein neuer Endpunkt, kein neues Datenobjekt, keine neue Abhängigkeit. `docs/architecture.md` §2 Frontend-Zeile („Aufnahme nur zwischen ‚Sprechen' und ‚Fertig'") und §3 Zeile „Anruf-Inhalte" werden textlich nachgezogen, Änderungsprotokoll-Zeile. ADR: nein — ADR-0006 (nur Speicher, lokal) gilt unverändert; ein Satz „Abschnittsweise Erkennung seit INT-2026-026" im Abschnitt Konsequenzen.

### 4. Änderungen

<!-- leser: agent -->

| # | Datei / Komponente | Art | Was | Herkunft |
|---|---|---|---|---|
| 1 | `ui/src/shared/anruf-befehle.ts` | ändern | `pruefeSchluss()`; `deuteSprache` Tabellen neu (+`auflegen`, −`senden`/`verwerfen` als Einzelwort) | FA-05–FA-08, FA-12, FA-13 |
| 2 | `ui/src/shared/types/anruf.protocol.ts` | ändern | `abschnitt?` in Erkennen/Erkannt; Konstanten D5/Konstanten; Kommentar Audio | FA-04, FA-09, FA-11, FA-22 |
| 3 | `ui/frontend/src/services/anruf-sprechpausen.ts` | neu | Klasse `Sprechpausen` (D2) | FA-04, FA-10 |
| 3a | `ui/frontend/src/services/anruf-diktat.ts` | neu | Klasse `Diktat` (D3) | FA-04, FA-11, FA-17 |
| 3b | `ui/tests/unit/anruf-diktat.test.ts` | neu | Reihenfolge, Lücken, verspätete/abgelaufene Nummern, Sekunden, Halten/Sperren, Leeren | FA-04, FA-11, FA-17, FA-22 |
| 4 | `ui/frontend/src/services/anruf.service.ts` | ändern | D3, D4, D6–D10; Ansicht; Entfernen `sprechenStart`, `sprechenEnde`, `nochmalSprechen`, `absenden`, `nimmtAuf`, `LaufendeAufnahme`; `speak`-Ende, `speaking()` in Browser-Deps | FA-01–FA-21, FA-24 |
| 5 | `ui/frontend/src/components/anruf/aos-anruf.ts` | ändern | Phasen `zuhoeren` („Ich höre zu", Text, „Wird gesendet als", Schlusswort-Hinweis, „wird erkannt …"; Knöpfe „Senden", „Verwerfen", „Nochmal", bei Plan „Freigeben …", „Im Terminal öffnen", „Auflegen"; in der Nachfrage „Freigeben", „Nein", „Auflegen"), `mikrofon_zu` (Grund + „Zuhören" + dieselben Knöpfe), Knöpfe nach FA-20; Leertaste und `onKeydown`/`onKeyup` entfernen | FA-19, FA-20, FA-21, AN-S04 |
| 6 | `ui/frontend/src/styles/theme.css` | ändern | `aos-app .anruf-diktat`, `.anruf-schluss-hinweis`, Punkt-Animation nur in `zuhoeren`; tote Klassen `anruf-erkannt`/`anruf-tipp` prüfen | §6 Spec |
| 7 | `ui/src/server/services/anruf-handler.ts` | ändern | `abschnitt` prüfen und durchreichen | FA-04 |
| 8 | `ui/src/server/services/anruf-service.ts` | ändern | `erkennen(clientId, meldungId, pcm, abschnitt?)`: Nummer zurück, Deckel 600 s je Anruf | FA-04, FA-22, security §2 |
| 9 | `ui/tests/unit/anruf-befehle.test.ts` | ändern | Schlusswort-Fälle (Tabelle §8) | FA-05–FA-08, FA-12, FA-13 |
| 10 | `ui/tests/unit/anruf-sprechpausen.test.ts` | neu | synthetische Signale: Sprache/Pause/Rauschen/Zwangsschnitt/Vorlauf | FA-04, FA-10 |
| 11 | `ui/tests/unit/anruf-fakes.ts` | ändern | `FakeSprache`: `speak(…, beiEnde)`, `speaking()`, `fertig()`, `abbrechen()`; `FakeStrom.stille(sek)`, `rauschen(sek, amp)`; Hilfe `erkannt(nr, text)` | Tests |
| 12 | `ui/tests/unit/anruf-frontend-service.test.ts` | ändern | Blöcke „recording" und „answers" ersetzt durch „zuhören", „schlusswort", „stille", „plan", „rückfrage", „fehler" | FA-01–FA-24 |
| 13 | `ui/tests/unit/aos-anruf.test.ts` | ändern | neue Zustände, Knöpfe, keine Leertaste, Fokus | FA-19–FA-21 |
| 14 | `ui/tests/unit/anruf-handler.test.ts`, `anruf-service.test.ts` | ändern | `abschnitt` gültig/ungültig, Rückgabe, Deckel | FA-04, FA-22 |
| 15 | `intent/INT-2026-026-anruf-freihaendig/design/anruf-freihaendig-mock.html` + `.png` | neu | Zustände Vorlesen, Zuhören (mit Text, Hinweis), Mikrofon zu, Nachfrage-Zuhören, Ende „Keine Antwort, aufgelegt" | Spec §6, design.md §6 |
| 16 | `docs/security.md` | ändern | §1 Zeile Audio; §2 Nachrichten (`abschnitt`, Deckel); §4 T-08 neu fassen; Änderungsprotokoll | Spec §7 |
| 17 | `docs/architecture.md` | ändern | §2 Frontend-Zeile, §3 Anruf-Inhalte (Diktat bis 2 min je Frage, gehaltener Text), Änderungsprotokoll | Spec §7 |
| 18 | `docs/design.md` | ändern | §4 Muster „Anruf": Zustand läuft/zuhören, keine Leertaste; Änderungsprotokoll | Spec §7 |
| 19 | `docs/product-brief.md` | ändern | §5 Web-UI-Zeile: „freihändig mit Schlusswort" | Spec §7 |
| 20 | `docs/adr/0006-anruf-liest-hook-inhalte-fluechtig.md` | ändern | ein Satz in Konsequenzen (abschnittsweise Erkennung, weiterhin nur Speicher) | Spec §7 |
| 21 | `intent/INT-2026-025-agenten-anrufe/{intent,spec,plan}.md` | ändern | nur Verweis „geändert durch INT-2026-026" an AK-12, NZ-03, FA-19, FA-20, O3 | ER-01 |

**Nicht betroffen (ausdrücklich):** `anruf-sender.ts` und `dialog-driver.ts` (Tastenfolgen, AR-08), `anruf-zustand.ts` (Zustandstabelle; Auflegen/Senden unverändert), `sprach-erkennung.ts` (Halluzinationsliste, whisper-Aufruf), `anruf-warteschlange.ts`, `claude-hooks.ts`, `anruf-text.ts`, Glocke `aos-glocke.ts`, Schalter `aos-anruf-schalter.ts`, Kontext-Hook, Installer und `specwright/manifest.tsv` (UI-Dateien sind nicht im Manifest).

### 5. Verbindungen

<!-- leser: agent -->

| Von | Nach | Art | Schnittstelle | Nachweis (Befehl) | Teil |
|---|---|---|---|---|---|
| `anruf.service.ts` | `anruf-sprechpausen.ts` | Import | `import { Sprechpausen } from './anruf-sprechpausen.js'` | `grep -n "Sprechpausen" ui/frontend/src/services/anruf.service.ts` | — |
| `anruf.service.ts` | `anruf-befehle.ts` | Import | `pruefeSchluss`, `deuteSprache`, `waehleMoeglichkeit` | `grep -n "pruefeSchluss" ui/frontend/src/services/anruf.service.ts` | — |
| `anruf.service.ts` | Backend | WebSocket | `anruf:erkennen { meldungId, audio, abschnitt }` | Test „zwei Stücke, Antworten vertauscht → Text in Reihenfolge" in `anruf-frontend-service.test.ts` | — |
| `anruf-handler.ts` | `anruf-service.ts` | Aufruf | `erkennen(clientId, id, pcm, abschnitt)` | `grep -n "erkennen(clientId, id, pcm" ui/src/server/services/anruf-handler.ts`; Test in `anruf-handler.test.ts` | — |
| `anruf-service.ts` | Frontend | WebSocket | `anruf:erkannt { meldungId, abschnitt, text | grund }` | Test in `anruf-service.test.ts` | — |
| `anruf.service.ts` | `anruf-diktat.ts` | Import | `import { Diktat } from './anruf-diktat.js'` | `grep -n "new Diktat" ui/frontend/src/services/anruf.service.ts` | — |
| `anruf.service.ts` | `speechSynthesis` | Browser-API | `u.onend`/`u.onerror`, `speaking`, `pending` | `grep -n "onend\|\.pending" ui/frontend/src/services/anruf.service.ts`; einziger Nutzer: `grep -rln speechSynthesis ui/frontend/src` → nur `anruf.service.ts` | — |
| `anruf.service.ts` | `gateway.ts` | Event | `gateway.disconnected` | `grep -n "gateway.disconnected" ui/frontend/src/services/anruf.service.ts`; Test „Verbindung weg beim Zuhören" | — |
| `anruf.service.ts` | Backend | WebSocket (unverändert) | `anruf:senden`, `anruf:auflegen`, `anruf:freigeben.anfragen` | bestehende Tests + neue Schlusswort-Tests | — |
| `aos-anruf.ts` | `anruf.service.ts` | Methoden | `senden()`, `verwerfen()`, `zuhoeren()`, `nochmal()`, `freigebenAnfragen()`, `freigeben()`, `nein()`, `auflegen()` | `grep -n "dienst\.\(senden\|verwerfen\|zuhoeren\)" ui/frontend/src/components/anruf/aos-anruf.ts` | — |
| — | entfernte API | — | kein Aufrufer von `sprechenStart`/`sprechenEnde`/`nochmalSprechen`/`absenden` | nach dem Bau (Schritt 7): `grep -rn "sprechenStart\|sprechenEnde\|nochmalSprechen\|\.absenden()" ui/src ui/frontend/src ui/tests` → leer | — |

- [x] Jede neue Komponente hat mindestens eine Verbindung.
- [x] Jeder Nachweis ist ein ausführbarer Befehl.

### 6. Reihenfolge der Arbeit

<!-- leser: agent -->

0. **Lesende Vorprüfung:** Konsumenten der entfallenden API und Phasen (`grep -rn "sprechenStart\|'bestaetigen'\|'hoeren'\|'erkennen'\|anruf-tipp\|anruf-erkannt" ui/`) → nur `aos-anruf.ts`, Test, `theme.css`; `git fetch && git log HEAD..origin/main` leer; Worktree `npm ci` in `ui/` und `ui/frontend`, `chmod +x ui/node_modules/node-pty/prebuilds/*/spawn-helper` → `bash scripts/verify.sh --fast` grün als Ausgangslage.
1. **Mock** (`design/anruf-freihaendig-mock.html` aus INT-2026-025-Mock abgeleitet, PNG per Playwright) → Datei vorhanden, vor Plan-Freigabe gezeigt (Plan-Schritt 9a).
2. **Rein:** `pruefeSchluss`/`deuteSprache` + Tests; `Sprechpausen` + Tests; `Diktat` + Tests → `npx vitest run tests/unit/anruf-befehle.test.ts tests/unit/anruf-sprechpausen.test.ts tests/unit/anruf-diktat.test.ts` grün.
3. **Protokoll + Backend:** `abschnitt`, Deckel + Tests → `npx vitest run tests/unit/anruf-handler.test.ts tests/unit/anruf-service.test.ts` grün.
4. **Frontend-Dienst:** Fakes erweitern, D3/D4/D6–D10, Tests zuerst für neue Abläufe → `npx vitest run tests/unit/anruf-frontend-service.test.ts` grün.
5. **Kasten + CSS** + Tests → `npx vitest run tests/unit/aos-anruf.test.ts` grün; Lint.
6. **Docs** (#16–#21).
7. **Verbindungen** §5 ausführen, Ausgabe notieren.
8. **E2E** §8 (Branch-Backend Port 3111), Screenshots neben Mock, Messprotokoll-Vorlage `e2e-protokoll.md`.
9. `bash scripts/verify.sh` → `verify: OK`; PR; CI grün.
10. Messungen mit Michaels Stimme (§10) → Protokoll; verfehlt → ER-03 (fragen).

### 7. Zerlegung

<!-- leser: agent -->

#### Variante A — nicht zerlegbar, eine Sitzung

<!-- leser: agent -->

Dienst, Kasten, Fakes und Tests greifen über die Ansicht und die Phasen ineinander (§5: 6 von 9 Verbindungen laufen durch `anruf.service.ts`); die unabhängigen Teile (reine Funktionen, Backend-Nummer) sind zusammen unter einem halben Tag und lohnen keinen Worktree plus Integration.

### 8. Tests und Nachweis

<!-- leser: agent -->

| AK / FA | Test | Datei | Art |
|---|---|---|---|
| AK-01, FA-01 | nach `fertig()` des letzten Satzes öffnet das Mikrofon (Sprechfassung, Frage, Folgefrage, Nachfrage, Hinweis); `abbrechen()` öffnet nicht; Rückfall `aktiv()=false` zweimal → öffnet; `aktiv()` bleibt `true` (pausiert) → nach harter Frist `cancel` + öffnet; `onend` **und** Rückfall feuern → genau ein `oeffne`; zwischen zwei Sätzen `pending=true` → kein Öffnen; `nurTerminal` → kein Öffnen | `anruf-frontend-service.test.ts` | Unit |
| Finding 1, 12 | Schlusswort-Stück fertig, aber Pegel kurz danach (unter 90 ms) → kein Senden bis nächstes Stück oder `onRuhe`; „auflegen" nach Hinweis-Vorlesen wirkt als Einzelwort | dto. | Unit |
| Finding 5 | Sprache ab dem ersten Rahmen → Grundrauschen aus 20.-Perzentil, Schwelle ≤ 0,05, folgende Sprache erkannt; zweites Öffnen übernimmt Grundrauschen | `anruf-sprechpausen.test.ts` | Unit |
| Finding 9, 13, 21 | Erkennung antwortet nicht → nach 15 s Stück `null`, Uhr läuft weiter, spätes Ergebnis verworfen; `anruf:error` (Deckel) → `mikrofon_zu`; `gateway.disconnected` → Zuhören aus, nichts gesendet | `anruf-frontend-service.test.ts` | Unit |
| Finding 10, R10 | Sätze mit Nomen „die Antwort senden wir morgen" in der Mitte → nichts; Stück mit Halluzination „Vielen Dank." zählt nicht (Bestand `sprach-erkennung.test.ts`) | `anruf-befehle.test.ts` | Unit |
| AK-02, FA-02 | während `sprich` kein offener Strom (`oeffnungen`, `gestoppt`); „Nochmal" schließt, liest, öffnet | dto. | Unit |
| FA-03, FA-24 | kein Mikrofon bei `klingelt`, `fremd`, nach Auflegen, bei Modus aus während Zuhören | dto. | Unit |
| AK-08, FA-04, FA-19 | zwei Stücke, Antworten in vertauschter Reihenfolge → Text in Reihenfolge; Ansicht `text`, `als`, `erkenntNoch`; Kasten zeigt „Ich höre zu", Text, Hinweis | dto., `aos-anruf.test.ts` | Unit |
| AK-03, FA-05 | „Mach die Tests. Antwort senden." → `anruf:senden {art:'text', text:'Mach die Tests.'}` ohne vorheriges `speak`; Varianten „Antworten senden", „antwort absenden!", über zwei Stücke verteilt | `anruf-befehle.test.ts`, service-Test | Unit |
| AK-04, FA-06 | „Antwort senden und dann die Doku" → nichts gesendet; später „… Antwort senden" → ganzer Text inkl. innerem „Antwort senden" | dto. | Unit |
| FA-07 | „… senden" / „… absenden" ohne „Antwort" → nichts, Hinweis angezeigt, nicht gesprochen | dto. | Unit |
| FA-08 | nur „Antwort senden" → nichts; mit gehaltenem Text → erneut gesendet | dto. | Unit |
| AK-05, FA-09 | 20 s Stille (Probenzeit) → `anruf:auflegen`, „Keine Antwort, aufgelegt" gesprochen **nach** cancel, kein `anruf:senden`; Reset durch Stück mit Text; kein Auflegen während `sprichtGerade` oder offener Erkennung; nach 10 s Text, 19 s Stille → offen | dto. | Unit |
| FA-10 | Rauschen 0,02 konstant → keine Sprache (Grundrauschen); Stück mit `nichts_verstanden` setzt nicht zurück; Dauerpegel → Zwangsschnitt 30 s | `anruf-sprechpausen.test.ts`, service-Test | Unit |
| FA-11 | Stücke summiert 120 s → „Antwort zu lang", Mikrofon zu, Text sichtbar, nichts gesendet; danach nur Schlusswort allein wirkt | service-Test | Unit |
| FA-12 | „… Antwort verwerfen" → Text leer, „Verworfen" gesprochen, danach zuhören | dto. | Unit |
| FA-13 | Einzelwörter nur als ganzer Text; „Das war's. Auflegen" → Text | `anruf-befehle.test.ts`, service-Test | Unit |
| AK-06, FA-14 | „freigeben" → `anruf:freigeben.anfragen`; State `freigabe_nachfrage` → Nachfrage vorgelesen → zuhören; „ja" → `anruf:senden {art:'freigeben'}`; „nein" → „Nicht freigegeben", kein Senden; „ja aber" → Nachfrage wiederholt; 20 s Stille → Auflegen ohne Freigabe | service-Test | Unit |
| FA-15 | Plan + „Nimm das kleinere Modell. Antwort senden." → `ueberarbeiten` | dto. | Unit |
| AK-07, FA-16 | „Die zweite. Antwort senden." → Möglichkeit 2; zwei Fragen → nach Frage 1 Vorlesen Frage 2, Senden nach Frage 2; mehrdeutig → „Passt auf 1 und 3 — Nummer sagen", nichts gesendet; Mehrfachauswahl | dto. | Unit |
| FA-17 | `anruf:ergebnis ok:false eingabe_nicht_leer` → „Nicht gesendet …" gesprochen, Text gehalten, zuhören; „Antwort senden" → erneut; weitere Sprache hängt nicht an | dto. | Unit |
| FA-18 | `ok:true` → „Gesendet." gesprochen, kein weiteres `oeffne` | dto. | Unit |
| AK-09, FA-20 | Knöpfe je Phase, beschriftet; „Senden" schickt angezeigten Text; „Verwerfen" leert, Zuhören läuft; kein Leertasten-Handler; Klingeln ohne Fokus | `aos-anruf.test.ts` | Unit |
| AK-10, FA-21 | `oeffne` wirft `NotFoundError` oder `NotAllowedError` → Grund gesprochen/angezeigt, Phase `mikrofon_zu`, Knopf „Zuhören", **kein** `anruf:auflegen`, **kein** `anruf:faehig` während des Anrufs; nach Auflegen wird `anruf:faehig verweigert` nachgemeldet; Spur endet beim Zuhören → dto.; „Senden" per Knopf geht ohne Mikrofon | service-Test, `aos-anruf.test.ts` | Unit |
| FA-22 | Diktat, Stücke, gehaltener Text nach Auflegen/Senden leer; kein `localStorage`/`console` im Dienst (grep); Backend-Deckel 600 s → Fehler ohne Erkennung | service-Tests, `grep -n "localStorage\|console\." ui/frontend/src/services/anruf*.ts` leer | Unit + Review |
| FA-23 | Senden weiter über `anruf:senden` → `anruf-sender.ts` (unverändert, bestehende Tests) | `anruf-sender.test.ts` | Unit (Bestand) |
| EK-01–EK-04 | Messprotokoll mit Michaels Stimme | `intent/INT-2026-026-anruf-freihaendig/e2e-protokoll.md` | Messung |

- **Verify-Befehl:** `bash scripts/verify.sh` — muss mit `verify: OK` enden, Ausgabe im PR. **CI ist die Wahrheit.** `ui/tests/known-failures.txt` wird nicht angefasst.
- **Datenkorrektur:** entfällt (keine Bestandsdaten).
- **Angeschlossen (E2E-Pfad):** Branch-Backend auf Port 3111 mit Scratch-Projekt (Muster `reference_cloud_terminal_e2e_playwright`), Chrome am Mac auf `http://localhost:3111`, Anrufmodus an. (a) Automatisch vorab: Playwright mit Chromium-Flags `--use-fake-ui-for-media-stream --use-fake-device-for-media-stream --use-file-for-fake-audio-capture=<wav>` und einer per `say -v Anna` + `afconvert` erzeugten WAV („Mach bitte die Tests. [2 s Pause] Und den PR. Antwort senden.") — Fertig-Meldung klingelt → Annehmen → Vorlesen → Mikrofon öffnet → Diktat wächst → Sitzung erhält den Text ohne Schlusswort. [Uncertain: ob Playwright-Chromium lokale Stimmen hat; ohne Stimme ist der Modus gesperrt → dann Stufe (b) allein, Abweichung in §14.] (b) Manuell mit Michaels Stimme: Fertig → Diktat mit Pause → „Antwort senden"; Rückfrage mit 3 Möglichkeiten → „die zweite, Antwort senden"; Plan → „freigeben" → „ja"; Stille 20 s → aufgelegt, Glocke behält Eintrag. Zeiten und Screenshots je Zustand ins Protokoll.
- **Bugfix-Anteil:** D10 (Ansage nach Auflegen abgebrochen) — Test zuerst, Fehlschlag bestätigen.
- **UI:** Ergebnis entspricht `design/anruf-freihaendig-mock.png` — Screenshots per Playwright (Branch-Backend) im PR neben dem Mock.

### 9. Risiken

<!-- leser: mensch -->

| Risiko | Wahrscheinlichkeit | Wirkung | Gegenmaßnahme | Wer merkt es |
|---|---|---|---|---|
| R1 Falsch erkannte, mit Schlusswort abgeschlossene Antwort geht ungeprüft an die Sitzung | mittel | niedrig (umkehrbar im nächsten Satz) | vom PO angenommen (intent AN-05); Plan-Freigabe bleibt mit Nachfrage; T-08 neu gefasst | Michael in der Sitzung |
| R2 `onend` bleibt aus (Chrome-Fehler, Hintergrund-Tab) → Mikrofon öffnet nicht | mittel | mittel | Rückfall `speaking()`-Prüfung alle 500 ms; sonst Knopf „Zuhören"; Messung im Hintergrund-Tab (§10) | Michael (Kasten bleibt bei „liest vor") |
| R3 Grundrauschen falsch gelernt (Michael spricht in den ersten 300 ms) → Schwelle zu hoch | niedrig | mittel | Grundrauschen nur aus Rahmen unter Schwelle nachführen; Obergrenze der Schwelle `0,05`; Test | Messung EK-02 |
| R4 Dauerlärm hält Stücke offen → Auflegen erst nach bis zu 50 s | niedrig | niedrig | Zwangsschnitt 30 s, 20-s-Uhr nur durch Text zurückgesetzt | Michael |
| R5 Parallele Erkennungsaufrufe überholen sich | mittel | mittel (falsche Reihenfolge) | Abschnittsnummer, Auswertung nur lückenlos | Unit-Test |
| R6 Schlusswort mitten in längerer Rede als Satzende erkannt, weil Whisper eine Pause als Satzende setzt und Michael weiterredet | niedrig | mittel | gesendet wird erst, wenn das Schlusswort am Ende **aller** bisher erkannten Stücke steht und keine Erkennung offen ist; spricht Michael schon weiter (Stück läuft), wird bis zu dessen Ergebnis gewartet | Messung EK-03 |
| R7 whisper erkennt „Antwort senden" als „Antwort Senden." / „Antworten senden" / „Antwort, senden" | mittel | niedrig | Regex toleriert Satzzeichen und „Antworten"; Messung EK-02; weitere Varianten nur nach Messung (ER-03) | Messung |
| R8 Wiederöffnen des Mikrofons schneidet den ersten Silben ab, wenn Michael sofort nach dem Vorlesen spricht | mittel | niedrig | „Ich höre zu" erst nach `starteAufnahme`; Messung EK-02 | Michael |
| R9 Mikrofon verweigert → Backend beendet Anruf nach 30 s Kulanz trotz „per Knopf weiterführbar" | niedrig | mittel | Fähigkeitsmeldung während des eigenen Anrufs zurückgehalten, beim Anrufende nachgemeldet (D9) | Unit-Test |
| R10 Whisper erfindet „Antwort senden" aus einem Geräusch und sendet ein angefangenes Diktat | niedrig | mittel | Stücke nur bei Pegel über Schwelle; Halluzinationsliste; „Antwort senden" steht nicht im Vokabel-Hinweis `SPRACH_VOKABELN` (`sprach-erkennung.ts:54`), der sonst diese Phrase begünstigen würde; Messung EK-03 | Michael, Messung |
| R11 Sprachausgabe im Hintergrund-Tab pausiert → harte Frist bricht Vorlesen ab, Rest fehlt | mittel | niedrig | Text steht im Kasten, „Nochmal"; Messung im Hintergrund-Tab (§10) | Michael |

### 10. Manuelle Schritte

<!-- leser: mensch -->

| Schritt | Wer | Wann | Erledigt |
|---|---|---|---|
| Mock ansehen: `intent/INT-2026-026-anruf-freihaendig/design/anruf-freihaendig-mock.png` (entsteht nach dem Plan Mode zusammen mit `plan.md`, Weg: Playwright-Screenshot des HTML-Mocks wie INT-2026-025) | Michael | vor Plan-Freigabe | [ ] |
| Messung EK-01–EK-04 mit eigener Stimme am Mac, Branch-Backend `http://localhost:3111` (Start: `cd ui && PORT=3111 npm run start:backend` im Worktree, Weg wie INT-2026-025 E2E): 20 Antworten mit Schlusswort, 20 Sätze mit „senden"/„Antwort senden" in der Mitte (+ Kontrollfall am Ende), 10 Antworten mit Pausen 3–5 s, 10 Zeiten Schlusswort→Eingabe; zusätzlich einmal mit Tab im Hintergrund (AN-02) und einmal mit Lüfter/leiser Musik (AN-03). Satzliste und Auswertung liefert die Build-Sitzung in `e2e-protokoll.md` | Michael + Build-Sitzung | vor Merge | [ ] |
| Verfehlte Kennzahl → Entscheidung nach ER-03 (Schwellen anpassen innerhalb ER-01 oder Rückfrage) | Michael | vor Merge | [ ] |
| Merge der PR (löst Auto-Deploy der UI aus; ER-07) | Michael | nach CI grün | [ ] |

### 11. Schätzung

<!-- leser: mensch -->

3–4 Arbeitstage (Budget laut Absicht 4, ER-08; nach dem Review +0,5 T für Diktat-Klasse, Fristen, Verbindungsabbruch und die zusätzlichen Tests — damit liegt die obere Spanne am Budget, bei Überschreitung Stopp und Neubewertung). Aufteilung: reine Module (Befehle, Sprechpausen, Diktat) + Backend 0,75 T; Dienst 1–1,5 T (Zustandsmaschine, viele Randfälle); Kasten/CSS/Mock 0,5 T; Docs 0,25 T; E2E + Messung 0,5–0,75 T. Unsicherheit: Verhalten von `speechSynthesis`-Ereignissen im echten Chrome, Güte der Pegel-Pausenerkennung mit Michaels Mikrofon, Umbau der 386-Zeilen-Testdatei.

### 12. Review des Plans

<!-- leser: mensch -->

| Finding | Quelle | Entscheidung | Änderung am Plan |
|---|---|---|---|
| S1 — Knopf „Im Terminal öffnen" fehlte im Zuhör-Zustand, FA-20 verlangt ihn in jedem Schritt | Self | angenommen, weil FA-20 ihn ausdrücklich nennt | §4 #5 |
| S2 — Meldungen ohne Inhalt (`nurTerminal`) hätten nach dem Vorlesen das Mikrofon geöffnet, obwohl es nichts zu beantworten gibt | Self | angenommen, weil INT-2026-025 dort nur „Im Terminal öffnen" anbietet und die Spec daran nichts ändert | §3 D3 |
| S3 — Schlusswort-Prüfung, während Michael schon weiterspricht, hätte zu früh gesendet (FA-06) | Self | angenommen: Auswertung erst ohne offene Erkennung und ohne laufendes Stück | §3 D3, §9 R6 |
| S4 — Plan-Nachfrage wurde über `sprich()` vorgelesen, ohne danach zuzuhören (AK-06 wäre nur per Knopf erfüllbar) | Self | angenommen, beide Aufrufstellen auf `vorleseDannHoere` | §3 D3 |
| S5 — Unklar, wann Diktat und 20-s-Uhr zurückgesetzt werden | Self | angenommen: Uhr je Öffnen, Diktat-Lebensdauer als Liste | §3 D3 |
| S6 — Audio-Deckel je Anruf im Backend ist nicht von einer FA verlangt, nur von Spec §7 vorgeschlagen; streichen? | Self (Minimalinvasiv) | abgelehnt: ~10 Zeilen, und `security.md` §2 muss eine wahre Obergrenze nennen, seit ein Anruf viele Stücke schicken darf | — |
| S7 — Eigene Pausenerkennung statt Bibliothek bringt Tuning-Risiko | Self (Alternativen) | abgelehnt, weil eine Bibliothek ER-02 (fragen) auslöst und Modell/WASM mitbringt; Pegelmessung wird durch EK-02/EK-04 geprüft, Schwellen sind ER-01 | §3 Verworfene Alternativen |
| S8 — Ansage „Mikrofon nicht verfügbar" wird heute sofort abgebrochen (`sprich` vor `cancel`) | Self (Code-Lesen) | angenommen als Bugfix-Anteil D10 mit Test zuerst | §3 D10, §8 |
| Finding 1 (3/4) — Wettlauf Ende-Signal/Mikrofon und Schlusswort, während Michael schon weiterspricht | Opus, Sonnet, MiniMax | angenommen: Versprechen löst genau einmal, `hoereZu` idempotent, `aktiv()` = `speaking‖pending` gegen Satzlücken, Auswertung erst ohne Pegel seit Stückende (`pegelSeit`) plus `onRuhe` | §3 D2, D3, D4; §8 |
| Finding 2 (3/4) — Rückfall über `speaking` greift nicht, wenn Chrome im Hintergrund pausiert | Opus, Sonnet, GLM | angenommen: harte Frist aus Textlänge mit `cancel`; Drosselung auf 1 s hingenommen und gemessen. Teil „Safari/Worklet-Ausfall" abgelehnt, weil der Anrufmodus nur im Browser am Mac läuft und ein Worklet-Fehler heute schon als Mikrofonfehler endet (`anruf.service.ts:791-800`), künftig `mikrofon_zu` | §3 D4, §9 R11 |
| Finding 3 (2/4) — 20-s-Uhr mehrdeutig, vorzeitiges Auflegen bei laufender Erkennung | Sonnet, MiniMax | angenommen für die Klarstellung (nie Auflegen bei laufendem Stück oder offener Erkennung; Rücksetzen nur durch Text laut FA-10); Teil „Nutzertext warnt nicht vor 50 s" abgelehnt, weil „Was kann schiefgehen" das schon sagt | §3 D3 |
| Finding 4 (2/4) — `NotAllowedError` meldete `verweigert` und beendete über die Backend-Kulanz den Anruf, gegen FA-21 | Opus, MiniMax | angenommen: Fähigkeitsmeldung bis Anrufende zurückhalten. Teil „FA-17 braucht Änderung am Sender" abgelehnt, weil erneutes Senden dieselbe Nachricht `anruf:senden` nutzt und `anruf-sender.ts` den Zustand ohnehin neu liest | §3 D9, §8, §9 R9 |
| Finding 5 (1/4, als LIKELY geführt) — Grundrauschen beim Kaltstart verdorben, wenn sofort gesprochen wird | MiniMax | angenommen: 20.-Perzentil, Obergrenze 0,05, Übernahme ins nächste Öffnen | §3 D2, §8 |
| Finding 6 (2/4) — Zitate nicht prüfbar, Dateien im Review nicht vorhanden | GLM, MiniMax | abgelehnt, weil alle Stellen im Plan Mode im Worktree `specwright-worktrees/anruf-freihaendig` (Stand `cb3f9a1`) gelesen wurden; die Reviewer hatten keinen Zugriff auf diesen Worktree — das ist ein Mangel des Review-Aufbaus, nicht des Plans | — |
| Finding 7 — Speicher des Diktats wächst unbegrenzt | Opus | abgelehnt, weil je Frage höchstens 300 kurze Strings (120 s / 0,4 s) entstehen und das Diktat je Frage geleert wird; Audio wird nach dem Abschicken nicht gehalten | §3 D3 |
| Finding 8 — Anzeige zwischen Abschicken und Ergebnis unklar | MiniMax | angenommen: nur lückenloser Text, „…"/„wird erkannt" bei offenen Stücken | §3 D3 |
| Finding 9 — keine Frist für ausbleibende Erkennung | GLM | angenommen: 15 s je Stück, dann `null`, spätes Ergebnis verworfen | §3 D3, §8 |
| Finding 10 — Whisper erfindet das Schlusswort | MiniMax | angenommen als Risiko R10 mit bestehenden Gegenmaßnahmen und Test; kein weiterer Mechanismus, weil ein zweites Bestätigen genau das wäre, was die Absicht abschafft | §9 R10, §8 |
| Finding 11 — Strich-Varianten im Regex | Opus | angenommen: `\p{P}` mit Flag `u` | §3 D1 |
| Finding 12 — „ganzer Text" bei Einzelwörtern unklar | Opus | angenommen: Zeitpunkt = Auswertung nach Sprechpause | §3 D3 |
| Finding 13 — verwaiste Ergebnisse nach dem Deckel | Opus | angenommen: eintragen, nicht mehr auswerten, `mikrofon_zu` | §3 D3 |
| Finding 14 — AudioWorklet im Hintergrund-Tab | Opus | angenommen als Messpunkt: Audio läuft in Chrome auf dem Audio-Thread [Likely], §10 misst im Hintergrund-Tab; kein Code | §10 |
| Finding 15 — `speaking` ist global | GLM | abgelehnt mit Beleg: `speechSynthesis` nutzt im Frontend nur der Anruf-Dienst (grep), Nachweis in §5 | §5 |
| Finding 16 — Diktat-Zustand zu verflochten | GLM | angenommen: eigene reine Klasse `Diktat` mit eigenen Tests | §3 D3, §4 #3a/#3b |
| Finding 17 — Aufrufstellen von `sprich()` nicht aufgezählt | MiniMax | angenommen: Tabelle aller 14 Stellen | §3 D4 |
| Finding 18 — Tests für Schwellen-Obergrenze, Nomen-Fehlauslösung, hängende Erkennung, Einzelwort nach Hinweis | GLM | angenommen | §8 |
| Finding 19 — erst Spike fester Schwelle gegen adaptive | GLM | abgelehnt, weil FA-10 (Lüfter, leise Musik) eine feste Schwelle bei 0,01 wahrscheinlich bricht und die adaptive Fassung ~15 Zeilen mehr ist; Messung EK-02/EK-04 und ER-01 (Schwellen anpassen) decken die Unsicherheit | — |
| Finding 20 — Mutex von `whisper-server` unbelegt | GLM | abgelehnt als nicht tragend: zwei Stücke überlappen nur, wenn Michael nach ≥ 1 s Pause binnen ~0,6 s ein neues Stück ≥ 0,4 s beendet; dann wartet das zweite höchstens eine Erkennung, EK-01 misst es | §2 |
| Finding 21 — Verbindungsabbruch beim Zuhören | GLM | angenommen: `gateway.disconnected` stoppt Zuhören, Backend beendet über `client.weg` | §3 D3, §5, §8 |
| Finding 22 — grep auf `console`/`localStorage` ist brüchig | Opus | abgelehnt, weil der grep ein Review-Nachweis für diesen PR ist, keine Dauerregel; eine Lint-Regel ist ein eigenes Vorhaben | — |
| Finding 23 — Negativ-greps erst nach dem Bau | Opus | angenommen: in §5 als „nach dem Bau (Schritt 7)" markiert | §5 |

**Minimalinvasiv geprüft:** Wiederverwendet: `stromAus`/`starteAufnahme` (AudioWorklet), `downsampleAuf16k`/`int16ZuBase64`/`rms`/`dauerSekunden`, `kandidatAus`/`waehleMoeglichkeit` (Anzeige „Wird gesendet als" und Möglichkeiten), Fragen-Sammeln aus `absenden()`, Plan-Nachfrage-Logik, Backend-Auflegen (Glocke bleibt, klingelt nicht erneut), gesamter Sendeweg `anruf-sender.ts`, Halluzinationsliste, Konstanten `ANRUF_RMS_SCHWELLE`, `ANRUF_MIN_DAUER_S`, `ANRUF_AUDIO_MAX_S`. Nicht gebaut: neue WebSocket-Nachricht (nur ein optionales Feld), Backend-Zustand für Zuhören (Frontend-flüchtig reicht, AR-05 bleibt), eigener Schalter (B-08), Wanduhr-Timer für Stille. Feature-Preservation: alle AK-01–AK-10 und FA-01–FA-24 haben in §8 einen Test; entfallen sind nur die von der Spec ausdrücklich gestrichenen Bedienwege (Sprechtaste, „Sprechen"/„Fertig", Bestätigungsschritt, Einzelwort „senden"/„verwerfen").

**Abgleich Mensch/Agent:** „In einfachen Worten", §9, §10, §12 gegen §2–§8 gelesen am 2026-09-28: Befund: (1) „Senden" ohne Text — §3 sagte Hinweis, Mock zeigt gesperrten Knopf; §3 an den Mock angeglichen. (2) Mensch-Teil nannte nach dem externen Review die Fristen (15 s Erkennung, harte Vorlese-Frist) und den zurückgehaltenen Mikrofon-Befund noch nicht; ergänzt. Sonst ohne Befund.

### 13. Definition of Done

<!-- leser: agent -->

- [ ] Jede FA/AK aus Abschnitt 8 hat einen grünen Test.
- [ ] Alle Nachweise aus Abschnitt 5 ausgeführt und im PR zitiert.
- [ ] E2E-Pfad läuft (Abschnitt 8), Messprotokoll EK-01–EK-04.
- [ ] `verify` grün, Ausgabe im PR — und PR-Checks grün (CI ist die Wahrheit).
- [ ] `docs/architecture.md`, `security.md`, `design.md`, `product-brief.md`, ADR-0006 nachgezogen (Abschnitt 4 #16–#20).
- [ ] Manuelle Schritte (Abschnitt 10) erledigt oder im PR als offen markiert.
- [ ] Abweichungen von diesem Plan in Abschnitt 14 eingetragen.
- [ ] 2x-Regel-Check: Fehler, der zum zweiten Mal vorkam → Vorschlag für `CLAUDE.md` im PR.
- [ ] Abschlussbericht nach R3, endet mit dem Block „Für das Board" (Karte, Spalte, PR-Link, Stand, Verweis auf `intent/INT-2026-026-anruf-freihaendig/`); Nachziehen in eigener Sitzung.

### 14. Abweichungen bei der Umsetzung

<!-- leser: mensch -->

| Datum | Abweichung | Grund | Auswirkung auf Abschnitt |
|---|---|---|---|
| — | — | — | — |
