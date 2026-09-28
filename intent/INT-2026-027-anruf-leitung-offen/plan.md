# Plan: UI: Anruf — Leitung bleibt nach dem Senden offen

> **Intent:** `intent.md` (INT-2026-027) · **Spec:** entfällt (bypass: Größe S)
> **Status:** umgesetzt
> **Erstellt:** 2026-09-28 im Plan Mode · **Freigabe:** Product Owner (Michael Sindlinger), 2026-09-28 — „Freigabe: plan.md (Stand 2026-09-28 17:27)"
> **Pflichtinput gelesen:** `docs/architecture.md` (Stand 5ab5bc9), `CLAUDE.md`, `docs/security.md`

## In einfachen Worten

<!-- leser: mensch -->

**Worum geht es?** Wenn eine Sitzung dich anruft und du antwortest, legt die UI heute direkt nach „Gesendet" auf. Braucht die Sitzung danach nur ein paar Sekunden und meldet sich wieder („fertig" oder eine Rückfrage), klingelt es neu. Du musst wieder annehmen, obwohl ihr eigentlich noch im Gespräch seid. Außerdem kann in genau diesem Moment eine ganz andere Sitzung klingeln, weil die UI nach dem Auflegen sofort die nächste wartende Meldung durchstellt.

**Was ändert sich?** Nach „Gesendet" bleibt der Anruf-Kasten stehen und zeigt „Leitung offen — wartet auf [Name der Sitzung] …" mit einem Knopf „Auflegen". Das Mikrofon ist in dieser Zeit aus, die UI hört also nicht mit. Meldet sich dieselbe Sitzung innerhalb von 2 Minuten, hörst du einen kurzen Ton, dann liest die UI die neue Meldung vor und hört danach zu, genau wie nach einem Annehmen. Antwortest du wieder, beginnen die 2 Minuten von vorn. Andere Sitzungen klingeln in der Zeit nicht, auch nicht über mehrere Runden hinweg; ihre Meldungen stehen in der Glocke und klingeln erst, wenn die Leitung zu ist. Kommt 2 Minuten lang nichts, sagt die UI „Leitung geschlossen" und legt auf. Drückst du selbst „Auflegen", sagt sie nichts. Ohne Anrufmodus ändert sich nichts.

**Wie wird das gemacht?** Das Backend führt eine Art Schaltplan für den Anruf: in Ruhe, klingelt, läuft, wird gesendet. Diesen Plan gibt es als eine Datei, die für jedes Ereignis sagt, in welchen Zustand es weitergeht (`ui/src/server/services/anruf-zustand.ts`). Er bekommt einen neuen Zustand „Leitung offen". Man kann ihn sich wie einen Telefonhörer vorstellen, der nach dem Gespräch nicht aufgelegt, sondern nur stummgeschaltet neben dem Telefon liegt: Ruft dieselbe Person zurück, ist sie sofort dran; alle anderen hören „besetzt" und landen auf der Mailbox, hier der Glocke. Im Zustand merkt sich das Backend, für welche Sitzung die Leitung offen ist, welches Browserfenster sie hält und bis wann. Ein Wecker im Backend legt nach 2 Minuten auf. Das Backend hält den Zustand, nicht der Browser; so ist es bei allen Anruf-Zuständen und so verlangt es die Architekturregel AR-05. Der Browser zeigt nur an, was das Backend sagt: den neuen Kasten, den kurzen Ton und die Ansage beim Ende durch die Frist.

Ein Sonderfall ist eingebaut: Die Sitzung ist manchmal so schnell, dass ihre neue Meldung schon da ist, während die Antwort noch getippt wird. Heute wird sie dann in die Warteschlange gestellt und klingelt danach. Künftig schaut das Backend beim „Gesendet" nach, ob dieselbe Sitzung schon wieder wartet, und stellt sie direkt durch.

**Was kann schiefgehen?** Erstens: Andere Sitzungen warten, solange das Gespräch läuft. Weil jede neue Antwort die 2 Minuten neu startet (so hast du es mit OF-01 entschieden), hat diese Wartezeit keine Obergrenze: Ein Gespräch über zehn Runden hält alle anderen zehn Runden lang zurück. Das ist gewollt; in der Glocke stehen sie sofort, und mit „Auflegen" gibst du die Leitung jederzeit frei. Zweitens: Braucht eine Sitzung für ihre Antwort länger als 2 Minuten, klingelt es wie heute. Das hast du mit OF-04 so entschieden. Drittens: Die Ansage „Gesendet" und das Vorlesen einer sehr schnellen Folgemeldung können sich überschneiden; dann schneidet das Vorlesen das Wort „Gesendet" ab. Das stört nicht, weil die neue Meldung wichtiger ist. Viertens: Ein Fehler im neuen Zustand könnte die Warteschlange blockieren, sodass gar nichts mehr klingelt. Dagegen stehen Tests für jedes Ereignis im neuen Zustand, und der Wecker hängt direkt an der einen Stelle, an der das Backend seinen Zustand wechselt, sodass er nicht vergessen werden kann. Startet das Backend neu, beginnt es ohnehin in Ruhe, eine offene Leitung überlebt keinen Neustart. Zurück kommst du immer, indem du den Anrufmodus aus- und wieder einschaltest. Fünftens: In einem zweiten Browserfenster steht während der offenen Leitung nur „Leitung offen in einem anderen Fenster", ohne Knöpfe, wie heute bei einem laufenden Anruf.

**Was musst du entscheiden?** Nichts, Freigabe reicht. Eine Auslegung habe ich selbst entschieden, du kannst widersprechen: In AK-07 steht „die älteste wartende Meldung klingelt, wie heute". Heute klingeln Rückfragen und Pläne vor „fertig"-Meldungen, erst innerhalb dieser Gruppen die älteste zuerst. Ich bleibe bei der heutigen Reihenfolge, weil das Kriterium selbst „wie heute" sagt und eine Rückfrage wichtiger ist als eine Fertig-Meldung.

## Details

<!-- leser: mensch -->

### 1. Kurzfassung

<!-- leser: mensch -->

Neuer Zustand `offen` in der reinen Übergangsfunktion `anrufUebergang` (Backend). `senden.ok` führt nach `offen` statt nach `ruhe` (oder direkt nach `laeuft`, falls dieselbe Sitzung schon wartet). `meldung.neu` derselben Sitzung führt aus `offen` direkt nach `laeuft` (ohne `klingelt`); andere Sitzungen werden nur eingereiht. Ein Timer im `AnrufService`, der aus dem Zustand abgeleitet wird, löst nach 120 s `leitung.frist` aus. Das Frontend bekommt eine Phase `leitung` mit Kasten und „Auflegen", einen einzelnen Hinweiston vor dem Vorlesen und die Ansage „Leitung geschlossen".

### 2. Ausgangslage im Code

<!-- leser: agent -->

| Bereich | Heute (Datei:Zeile) | Bedeutung für dieses Vorhaben |
|---|---|---|
| Zustandstyp | `ui/src/server/services/anruf-zustand.ts:25-30` (5 Zustände), Hilfen `hatMeldung`/`hatBesitzer` `:106-112`, `MitMeldung = Exclude<…'ruhe'>` `:103` | muss geändert werden: `offen` hat Besitzer, aber **keine** Meldung. `hatMeldung` prüft heute `name !== 'ruhe'` und wäre für `offen` falsch (Falle) |
| `senden.ok` | `anruf-zustand.ts:285-293` → `ruhe` + `verwerfen` + `naechste` | Kern der Änderung |
| `meldung.neu` gleiche Sitzung | `:141-159`: in `sendet` einreihen, sonst ersetzen und klingeln | in `offen` direkt `laeuft`; `sendet`-Einreihung bleibt, wird bei `senden.ok` abgeholt (AK-04) |
| `meldung.neu` andere Sitzung | `:160-163`: einreihen, `naechste` nur in `ruhe` | wiederverwendbar: `offen` ≠ `ruhe` → kein Klingeln (AK-05) ohne Sonderfall |
| `klingeln` | `:166-171`: nur in `ruhe` | wiederverwendbar, `offen` → `ANRUF_BESETZT` |
| `meldung.erledigt` | `:173-185` | Falle: Nach dem Senden arbeitet die Sitzung → `meldung.erledigt` für dieselbe Sitzung (`anruf-service.ts:498-502`). In `offen` darf das die Leitung **nicht** schließen |
| `auflegen` | `:213-220` über `pruefeBesitz` (Meldung-ID + Besitzer) | `offen` braucht eine ID zum Prüfen → `leitungId` (ID der zuletzt gesendeten Meldung) |
| `client.weg`, `modus.aus`, `niemand_da`, `anrufen` | `:222-245`, `:303-319` | `client.weg` in `offen` → `ruhe` + `naechste` (AK-08); `modus.aus` greift schon allgemein; `anrufen` sperrt über `hatBesitzer` (NZ-04) |
| Service: Effekte, Timer | `anruf-service.ts:547-631` (`anwenden`), Timer-Muster `kulanzTimer`/`naechsteTimer` `:193-194, 797-822`, `uhr`-Injektion `:175` | wiederverwendbar: Leitungs-Timer nach demselben Muster, `unref`, in `stoppeTimer` |
| Service: Zustand → Client | `stateFuer` `:684-703` greift bei `name !== 'ruhe'` auf `z.meldung` zu | muss für `offen` angepasst werden: neues Feld `leitung` nur für den Besitzer |
| Service: `artDerSitzung` | `:777-780` greift auf `zustand.meldung` zu | auf `hatMeldung` umstellen |
| Service: `istLaufenderAnruf` | `:782-785` nur `laeuft`/`freigabe_nachfrage` | wiederverwendbar: Audio in `offen` wird abgelehnt (AK-02, Backend-Seite) |
| Service: `endeGrund` | `:552`, `:701`, `:737` — nur wenn `hatBesitzer(vorher)` | wiederverwendbar für „Leitung geschlossen" (AK-10) |
| Protokoll | `ui/src/shared/types/anruf.protocol.ts:59` `AnrufZustandName`, `:156-170` `AnrufStateMessage`, Konstanten `:205-223` | `'offen'`, Feld `leitung?`, Konstante `ANRUF_LEITUNG_OFFEN_MS = 120_000`, Text |
| Frontend-Dienst | `ui/frontend/src/services/anruf.service.ts:339` `LAEUFT`, `:437-449` `phase()`, `:486-545` `onState`, `:574-582` `onErgebnis` (beendet eigen, sagt „Gesendet"), `:723-731` `auflegen()` | Phase `leitung`; neue Meldung nach `offen` → Hinweiston + Vorlesen; Ende aus `offen` mit `endeGrund` → Ansage |
| Frontend-Ton | `ui/frontend/src/components/terminal/notification-sound.ts:101-119` `playAnrufKlingeln`, Dep `klingeln` `anruf.service.ts:113,1334` | Muster für `playAnrufHinweis()` (eine Note) und Dep `hinweiston` |
| Kasten | `ui/frontend/src/components/anruf/aos-anruf.ts:113-180` Switch über Phasen, Light DOM | neuer `case 'leitung'` |
| `app.ts` | `frontend/src/app.ts:1880` `anrufLaeuft` = laeuft/freigabe_nachfrage/sendet | `offen` ergänzen (Glocke sperrt „Anrufen" während offener Leitung, NZ-04) |
| Tests | `ui/tests/unit/anruf-zustand.test.ts` (Matrix Zustand × Ereignis ab `:152`), `anruf-service.test.ts` (Fake-Timer `:152`), `anruf-frontend-service.test.ts` (FA-18 `:667-681`), `aos-anruf.test.ts` | erweitern; FA-18-Test bleibt gültig (Mikrofon öffnet nach „Gesendet" nicht) |

### 3. Entwurf

<!-- leser: agent -->

#### Ansatz

<!-- leser: agent -->

**Zustand (rein, `anruf-zustand.ts`):**

- Neuer Zweig: `{ name: 'offen'; sessionId: string; besitzer: string; leitungId: string; seit: number; bis: number }`. `leitungId` = ID der zuletzt gesendeten Meldung (für `auflegen` und `leitung.frist`).
- Typen: `MitMeldung = Exclude<AnrufZustand, { name: 'ruhe' } | { name: 'offen' }>`; Guards `hatMeldung(z): z is MitMeldung` (prüft `'meldung' in z`, nicht Namenslisten), `hatBesitzer(z)` (prüft `'besitzer' in z`), `istOffen(z)` — **exportiert** aus `anruf-zustand.ts`. Der Service entfernt seine Kopie von `hatBesitzer` (`anruf-service.ts:150-152`) und importiert die Guards; damit gibt es eine Stelle für die Zustands-Prüfungen im Backend. Das Frontend prüft den Namen `'offen'` nur in `phase()` und `onState` (je eine Stelle).
- `senden.ok` bekommt ein optionales Feld `wartend?: ZustandMeldung` (vom Service: Schlangeneintrag derselben Sitzung). Mit `wartend` → `laeuft(wartend, besitzer, seit: jetzt)` mit Effekten `verwerfen(alt)`, `entnehmen(wartend)`, `broadcast` (AK-04). Ohne `wartend` → `offen{ bis: jetzt + ANRUF_LEITUNG_OFFEN_MS }` mit `verwerfen(alt)`, `broadcast`, **kein** `naechste` (AK-01, AK-05, AK-09).
- `meldung.neu` in `offen`, gleiche Sitzung → `laeuft(m, besitzer, jetzt)` mit `entnehmen(m)`, `broadcast` (AK-03). Andere Sitzung → bestehender Zweig (einreihen, kein `naechste`).
- `meldung.erledigt` in `offen` → nur `austragen` + `broadcast`, Zustand bleibt (Falle aus §2).
- `auflegen` in `offen` mit `meldungId === leitungId` und Besitzer → `ruhe`, `naechste`, `broadcast`, kein `endeGrund` (AK-07, AK-10 Teil „Knopf").
- Neues Ereignis `leitung.frist { leitungId }`: in `offen` mit passender ID → `ruhe`, `naechste`, `broadcast`, `endeGrund: ENDE_LEITUNG_FRIST = 'Leitung geschlossen.'` (AK-06, AK-07, AK-10). Sonst unverändert ohne Fehler, weil ein veralteter Timer normal ist.
- `client.weg` Besitzer in `offen` → `ruhe`, `naechste`, `broadcast`, kein `zurueck` (keine Meldung) (AK-08). `modus.aus` unverändert (AK-08). `annehmen`/`ablehnen`/`spaeter`/`senden`/`freigeben.anfragen` in `offen` → `MELDUNG_WEG` über `hatMeldung` bzw. `pruefeBesitz` (prüft Meldung vor Besitzer).
- Kein eigener Effekt für „kam aus der Leitung": das Frontend leitet es aus dem vorigen State ab (§12 S4).

**Service (`anruf-service.ts`):**

- `fuehreSendenAus` → bei `res.ok` `wartend = this.schlange.eintragFuerSitzung(rec.sessionId)` holen und im **selben synchronen Block** direkt `anwenden({ art: 'senden.ok', meldungId, wartend })` aufrufen (kein `await` dazwischen). Node verarbeitet Ereignisse nacheinander; ein `meldung.neu` kommt entweder davor (dann steht es in der Schlange und wird als `wartend` abgeholt) oder danach (dann trifft es auf `offen` und geht nach `laeuft`). Beide Wege enden in AK-03/AK-04.
- `leitungTimer` nach Muster `kulanzTimer`: `synchronisiereLeitungTimer()` wird **in** `anwenden` direkt nach der einzigen Zuweisung `this.zustand = ergebnis.zustand` (`anruf-service.ts:551`) gerufen, nicht von den Aufrufern — kein Pfad kann ihn umgehen (`grep -c "this.zustand ="` = 1 ist Nachweis in §5). Inhalt: Ist der Zustand `offen`, einen Timer auf `bis - uhr()` (neu setzen, wenn `leitungId` oder `bis` sich geändert haben), sonst Timer löschen. Beim Feuern `anwenden({ art: 'leitung.frist', leitungId })`. `stoppeTimer` löscht ihn mit.
- `stateFuer`: für `offen` kein `meldung`; für den Besitzer `leitung: { sessionId, sitzungName, projektName?, bis: ISO }` aus `quelle.getSession` + `sitzungInfo`. Andere lokale Fenster sehen `zustand: 'offen'`, `eigener: false`.
- `artDerSitzung`, `hookInhalt` (`'meldung' in`) auf `hatMeldung` umstellen.

**Protokoll (`anruf.protocol.ts`):** `AnrufZustandName` + `'offen'`; `AnrufStateMessage.leitung?: AnrufLeitung`; `ANRUF_LEITUNG_OFFEN_MS = 120_000`.

**Frontend-Dienst (`anruf.service.ts`):**

- `AnrufPhase` + `'leitung'`; `phase()`: `zustand === 'offen'` → eigener ? `'leitung'` : `'fremd'`. Der Zweig steht vor der `LAEUFT`-Prüfung und braucht keine `meldung`. Der Kasten zeigt in `fremd` bei `offen` den neuen Text `ANRUF_TEXT.leitungAndereFenster = 'Leitung offen in einem anderen Fenster'` ohne Knöpfe (heute: fester Text ohne Meldungsdaten, `aos-anruf.ts:123-124`).
- `onState`: kommt `eigenLaeuft` mit neuer Meldung und war `alt?.zustand === 'offen'` → `this.d.hinweiston()`, dann `vorlesen()` nach `ANRUF_HINWEIS_VORLAUF_MS = 400` (AK-11, AK-03). Ergebnis „Gesendet" wird dabei gelöscht.
- Ende aus `offen`: `alt?.zustand === 'offen' && alt.eigener && neu.zustand !== 'offen'` ohne neue eigene Meldung → hat `neu.endeGrund`, dann `setzeErgebnis` + `sprich` (AK-10). Der heutige Ende-Zweig greift nicht, weil `letzterEigenerId` nach „Gesendet" leer ist; deshalb dieser eigene Zweig.
- `auflegen()` in Phase `leitung` → `anruf:auflegen` mit `leitung`-ID. Dafür bekommt `AnrufLeitung` zusätzlich `leitungId`.
- Mikrofon: in `leitung` wird `hoereZu` nie aufgerufen; der bestehende Guard `e.phase` greift, da `eigen` nach „Gesendet" beendet ist (AK-02).
- Ansicht: `leitung?: { sitzungName, projektName? }` für den Kasten.
- Dep `hinweiston: () => playAnrufHinweis()`.

**Ton (`notification-sound.ts`):** `playAnrufHinweis()`: eine Note (Dreieck, ~0,15 s), gleiche Lautstärke wie der Klingelton.

**Kasten (`aos-anruf.ts`):** `case 'leitung'`: Titel „Leitung offen — wartet auf [Sitzung] …", Projektname klein darunter, Zeile „Mikrofon aus", falls vorhanden das Ergebnis „Gesendet" für 3 s, Knopf „Auflegen" (`<button type="button">`, fokussierbar, beschriftet, Tab-Reihenfolge wie die übrigen Kasten-Knöpfe). Kein Fokusraub, keine neue Tastenkürzel (wie `design.md` §4 „Anruf"). Kein pulsierender Punkt, weil das Mikrofon aus ist.

**`app.ts:1880`:** `offen` zu `anrufLaeuft` (Glocken-Knopf „Anrufen" gesperrt mit bestehendem Tooltip).

#### Verworfene Alternativen

<!-- leser: agent -->

| Alternative | Warum nicht |
|---|---|
| Leitung nur im Browser halten (nach „Gesendet" 2 min lokal warten, neue Meldung automatisch annehmen) | verstößt gegen RB-01/AR-05; das Backend würde in der Zwischenzeit schon `ruhe` melden und eine andere Sitzung klingeln lassen (AK-05 nicht erfüllbar); zwei Fenster wären uneins |
| `laeuft` weiterlaufen lassen (Meldung „leer", Flag `wartet`) statt eigenem Zustand | jede Prüfung auf `laeuft` (Audio, Senden, Freigabe, `istLaufenderAnruf`) bräuchte einen Sonderfall für das Flag; ein eigener Zustand macht unerlaubte Paare in der Tabelle sichtbar und testbar |
| Warteschlange während `offen` pausieren (Flag in `AnrufWarteschlange`) | unnötig: `naechsteKlingeln` wirkt schon nur in `ruhe` (`anruf-service.ts:635`) |
| Frist als Feld prüfen, das bei jedem Ereignis ausgewertet wird, ohne Timer | ohne Ereignis läuft die Frist nie ab; AK-06 verlangt Auflegen ohne Zutun |

#### Architektur-Auswirkung

<!-- leser: agent -->

- **Nein** — bleibt innerhalb von `architecture.md` §2 (Anruf-Dienst hält den Zustand) und §3 (Anruf-Zustand nur im Arbeitsspeicher). AR-05 eingehalten (Zustand im Backend, als Ganzes gebroadcastet), AR-08 unberührt (keine neue Tastenfolge), kein neuer Endpunkt, kein neues Datenobjekt, keine neue Abhängigkeit. `architecture.md` §2 bekommt einen Halbsatz („nach erfolgreichem Senden bleibt die Leitung 2 min für dieselbe Sitzung offen, andere Meldungen warten") und eine Änderungszeile — Dokupflege, keine Grenzverschiebung. ADR: nein.

### 4. Änderungen

<!-- leser: agent -->

| # | Datei / Komponente | Art | Was | Herkunft |
|---|---|---|---|---|
| 1 | `ui/src/shared/types/anruf.protocol.ts` | ändern | `'offen'`, `AnrufLeitung { leitungId, sessionId, sitzungName, projektName?, bis }`, `AnrufStateMessage.leitung?`, `ANRUF_LEITUNG_OFFEN_MS` | AK-01, AK-06 |
| 2 | `ui/src/server/services/anruf-zustand.ts` | ändern | Zustand `offen`, Guards, `senden.ok` mit `wartend`, `meldung.neu`/`meldung.erledigt`/`auflegen`/`client.weg` in `offen`, Ereignis `leitung.frist`, `ENDE_LEITUNG_FRIST`; Kopfkommentar | AK-01, AK-03–AK-10 |
| 3 | `ui/src/server/services/anruf-service.ts` | ändern | `wartend` bei `senden.ok`, `leitungTimer` + `synchronisiereLeitungTimer`, `stateFuer` mit `leitung`, `artDerSitzung`/`hookInhalt` auf `hatMeldung`, lokale `hatBesitzer`-Kopie entfernt (Import aus `anruf-zustand.ts`) | AK-01, AK-04, AK-06, AK-08 |
| 4 | `ui/frontend/src/components/terminal/notification-sound.ts` | ändern | `playAnrufHinweis()` | AK-11 |
| 5 | `ui/frontend/src/services/anruf.service.ts` | ändern | Phase `leitung`, Dep `hinweiston`, Übergang `offen → laeuft` mit Ton + Vorlesen, Ende aus `offen` mit Ansage, `auflegen` mit `leitungId`, Ansicht `leitung` | AK-01–AK-03, AK-10, AK-11 |
| 6 | `ui/frontend/src/components/anruf/aos-anruf.ts` | ändern | `case 'leitung'` | AK-01 |
| 7 | `ui/frontend/src/styles/theme.css` | ändern (falls nötig) | Stil für die Leitungs-Zeile unter `aos-app .anruf*` (Light DOM, Wirt geprüft: `aos-anruf` ohne Shadow-Root) | AK-01, RB-03 |
| 8 | `ui/frontend/src/app.ts` | ändern | `offen` in `anrufLaeuft` | NZ-04 |
| 9 | `ui/tests/unit/anruf-zustand.test.ts` | ändern | Matrix um `offen` und `leitung.frist`; Fälle AK-01, AK-03–AK-09 | Tests |
| 10 | `ui/tests/unit/anruf-service.test.ts` | ändern | Timer (Fake-Timer): 120 s → Ende mit `endeGrund`; neue Runde setzt Frist neu; Meldung während `sendet` direkt durch; andere Sitzung klingelt erst nach Ende; `erkennen` in `offen` abgelehnt | Tests |
| 11 | `ui/tests/unit/anruf-frontend-service.test.ts` | ändern | Phase `leitung`, kein Mikrofon, Hinweiston vor Vorlesen, Ansage bei Frist, keine bei Knopf | Tests |
| 12 | `ui/tests/unit/aos-anruf.test.ts` | ändern | Kasten `leitung`: Text, Knopf „Auflegen" löst `auflegen` aus | Tests |
| 13 | `docs/design.md` | ändern | §4 Muster „Anruf": Zustand **Leitung offen**; Änderungszeile | Doku |
| 14 | `docs/architecture.md` | ändern | §2 Halbsatz Anruf-Dienst, Änderungszeile, Stand | Doku |
| 15 | `intent/INT-2026-026-anruf-freihaendig/spec.md` | ändern | FA-18 Hinweis „geändert durch INT-2026-027 (Leitung bleibt offen)" | Intent `ersetzt` |

**Nicht betroffen (ausdrücklich):** `anruf-warteschlange.ts` (Reihenfolge unverändert), `anruf-sender.ts` (Senden unverändert), `anruf-handler.ts` (keine neue Nachricht; `anruf:auflegen` existiert), `sprach-erkennung.ts`, `anruf-sprechpausen.ts`, `claude-hooks.ts`, `aos-glocke.ts` (Sperre kommt über `app.ts`), Manifest (keine neue Datei), `security.md` (keine neue Datenklasse; Mikrofon aus).

### 5. Verbindungen

<!-- leser: agent -->

| Von | Nach | Art | Schnittstelle | Nachweis (Befehl) | Teil |
|---|---|---|---|---|---|
| `anruf-service.ts` `fuehreSendenAus` | `anruf-zustand.ts` `senden.ok` | Ereignis | `{ art: 'senden.ok', meldungId, wartend? }` | `grep -n "wartend" ui/src/server/services/anruf-service.ts` + Test „Meldung während sendet direkt durch" | — |
| `anruf-service.ts` Leitungs-Timer | `anruf-zustand.ts` `leitung.frist` | Ereignis | `{ art: 'leitung.frist', leitungId }` | `grep -n "leitung.frist" ui/src/server/services/anruf-service.ts` + Service-Test 120 s | — |
| `anruf-service.ts` `stateFuer` | Frontend `onState` | WebSocket `anruf:state` | `zustand: 'offen'`, `leitung` | Service-Test prüft `leitung` nur beim Besitzer; Frontend-Test speist `offen` ein | — |
| `anruf.service.ts` | `notification-sound.ts` | Import/Dep | `hinweiston: () => playAnrufHinweis()` | `grep -n "playAnrufHinweis" ui/frontend/src/services/anruf.service.ts` | — |
| `aos-anruf.ts` | `anruf.service.ts` | Methode | Phase `leitung` → `dienst.auflegen()` | `aos-anruf.test.ts` Knopf-Test | — |
| Frontend `auflegen()` | Backend `auflegen` in `offen` | WebSocket `anruf:auflegen` | `meldungId = leitung.leitungId` | Frontend-Test (gesendete Nachricht) + Zustand-Test `auflegen` in `offen` | — |
| `anruf-service.ts` `anwenden` | `synchronisiereLeitungTimer` | Aufruf | einzige Zustandszuweisung | `grep -c "this.zustand =" ui/src/server/services/anruf-service.ts` → 1; `grep -n "synchronisiereLeitungTimer" ui/src/server/services/anruf-service.ts` | — |
| `anruf-service.ts` | `anruf-zustand.ts` Guards | Import | `hatMeldung`, `hatBesitzer`, `istOffen` | `grep -n "function hatBesitzer" ui/src/server/services/anruf-service.ts` → leer | — |
| `app.ts` | `aos-glocke` | Property | `anrufLaeuft` inkl. `offen` | `grep -n "'offen'" ui/frontend/src/app.ts` | — |

- [x] Jede neue Komponente hat mindestens eine Verbindung.
- [x] Jeder Nachweis ist ein ausführbarer Befehl.

### 6. Reihenfolge der Arbeit

<!-- leser: agent -->

0. Lesende Vorprüfung: alle Nutzer von `AnrufZustandName`, `hatMeldung`, `.meldung` auf dem Zustand → `grep -rn "AnrufZustandName\|zustand.meldung\|'meldung' in" ui/src ui/frontend/src` → Liste deckt sich mit §4.
1. Protokoll (#1) → `cd ui && npx tsc --noEmit -p .` zeigt nur die erwarteten Fehler in den Switches.
2. Zustand (#2) + Zustand-Tests (#9) → `npx vitest run tests/unit/anruf-zustand.test.ts` grün.
3. Service (#3) + Service-Tests (#10) → `npx vitest run tests/unit/anruf-service.test.ts` grün.
4. Ton, Frontend-Dienst, Kasten, `app.ts` (#4–#8) + Tests (#11, #12) → beide Testdateien grün, `cd ui/frontend && npx tsc --noEmit` grün.
5. Verbindungen nachweisen (§5).
6. Docs (#13–#15).
7. `bash scripts/verify.sh` → `verify: OK`; E2E am Mac (§8).

### 7. Zerlegung

<!-- leser: agent -->

#### Variante A — nicht zerlegbar, eine Sitzung

<!-- leser: agent -->

Protokoll, Zustand, Service und Frontend-Dienst hängen über dieselbe Nachricht `anruf:state` zusammen (§5, 7 Verbindungen); der Umfang ist unter einem Tag.

#### Variante B — parallel in Worktrees

<!-- leser: agent -->

Entfällt.

### 8. Tests und Nachweis

<!-- leser: agent -->

| AK / FA | Test | Datei | Art |
|---|---|---|---|
| AK-01 | `senden.ok` → `offen` mit Besitzer, `bis = jetzt + 120 s`, kein `naechste`; Kasten zeigt „Leitung offen — wartet auf …" und „Auflegen" | `anruf-zustand.test.ts`, `aos-anruf.test.ts` | Unit |
| AK-02 | Phase `leitung`: `mikrofon.start` nicht gerufen; Backend `erkennen` in `offen` → `INVALID_MESSAGE` | `anruf-frontend-service.test.ts`, `anruf-service.test.ts` | Unit |
| AK-03 | `offen` + `meldung.neu` gleiche Sitzung → `laeuft` ohne `klingelt`; Frontend liest vor und hört danach zu, kein Klingelton | `anruf-zustand.test.ts`, `anruf-frontend-service.test.ts` | Unit |
| AK-04 | Meldung derselben Sitzung während `sendet` → nach `senden.ok` direkt `laeuft`, Schlange leer | `anruf-service.test.ts` | Integration (Service mit Fakes) |
| AK-05 | `offen` + `meldung.neu` andere Sitzung → Zustand bleibt, eingereiht, `wartend` +1 | `anruf-zustand.test.ts`, `anruf-service.test.ts` | Unit |
| AK-06 | Fake-Timer 119 s → `offen`; 120 s → `ruhe`; `meldung.erledigt` derselben Sitzung dazwischen ändert nichts | `anruf-service.test.ts`, `anruf-zustand.test.ts` | Unit |
| AK-07 | Ende (Frist und `auflegen`) mit wartender anderer Meldung → diese klingelt | `anruf-service.test.ts` | Integration |
| AK-08 | `client.weg` Besitzer und `modus.aus` in `offen` → `ruhe` | `anruf-zustand.test.ts` | Unit |
| AK-09 | zweite Runde: `offen` → `laeuft` → `sendet` → `offen` mit neuem `bis`; Timer der ersten Runde feuert nicht | `anruf-service.test.ts` | Unit |
| AK-10 | Frist → Ansage „Leitung geschlossen."; Knopf „Auflegen" → keine Ansage | `anruf-frontend-service.test.ts` | Unit |
| AK-11 | Übergang `offen → laeuft` → `hinweiston` einmal vor dem ersten `sprich` | `anruf-frontend-service.test.ts` | Unit |
| AK-09 | drei Runden hintereinander (senden → offen → neue Meldung → senden …), Frist jeweils neu, keine andere Sitzung klingelt dazwischen | `anruf-service.test.ts` | Integration |
| AK-06/R6 | `auflegen` nach abgelaufener Frist (veraltete `leitungId`) → Fehler `MELDUNG_WEG`, Zustand unverändert; Frist feuert nach `auflegen` nicht mehr | `anruf-zustand.test.ts`, `anruf-service.test.ts` | Unit |
| AK-05 | zweites lokales Fenster: `anruf:state` mit `zustand: 'offen'`, `eigener: false`, ohne `leitung`; Kasten zeigt „Leitung offen in einem anderen Fenster" ohne Knöpfe | `anruf-service.test.ts`, `aos-anruf.test.ts` | Unit |
| AK-08 | Verbindungsabbruch des Besitzers in `offen` → `client.weg` → `ruhe`, wartende andere Meldung klingelt | `anruf-service.test.ts` | Integration |

- **Verify-Befehl:** `bash scripts/verify.sh` — muss mit `verify: OK` enden, Ausgabe im PR. CI ist die Wahrheit; `ui/tests/known-failures.txt` wird nicht angefasst. Worktree: vorher `npm ci` in `ui/` und `ui/frontend/`, dann `chmod +x ui/node_modules/node-pty/prebuilds/*/spawn-helper`.
- **Datenkorrektur:** entfällt (keine Bestandsdaten).
- **Angeschlossen (E2E-Pfad):** am Mac mit Anrufmodus an, Branch-Backend auf eigenem Port (Muster `reference_cloud_terminal_e2e_playwright`), Scratch-Sitzung: Anruf annehmen → per Schlusswort antworten → Kasten „Leitung offen" (Screenshot) → Sitzung meldet „fertig" binnen 2 min → Ton, Vorlesen ohne Klingeln → zweite Sitzung meldet währenddessen → klingelt nicht, steht in der Glocke → nach Auflegen klingelt sie. Zweiter Lauf: 2 min warten → „Leitung geschlossen". Protokoll mit Zeitstempeln in `intent/INT-2026-027-anruf-leitung-offen/e2e.md`. Das Live-Backend auf Port 3001 nicht anfassen (`feedback_no_broad_pkill_on_backends`).
- **Bugfix:** entfällt.
- **UI:** kein eigener Mock; Kasten folgt dem bestehenden Muster aus `design.md` §4 „Anruf"; Screenshot des Zustands „Leitung offen" im PR.

### 9. Risiken

<!-- leser: mensch -->

| Risiko | Wahrscheinlichkeit | Wirkung | Gegenmaßnahme | Wer merkt es |
|---|---|---|---|---|
| R1: Übergang vergessen → Zustand `offen` hängt, nichts klingelt mehr | niedrig | hoch | Matrix-Test Zustand × Ereignis deckt jedes Ereignis in `offen` ab; Timer wird aus dem Zustand abgeleitet, nicht per Effekt; Rückweg: Anrufmodus aus/an | Michael (keine Anrufe mehr) |
| R2: `meldung.erledigt` nach dem Senden schließt die Leitung sofort | mittel ohne Gegenmaßnahme | mittel | ausdrücklicher Fall in §3 plus Test (AK-06) | Test |
| R3: Andere Sitzungen warten, solange das Gespräch läuft — ohne Obergrenze, weil jede Runde die Frist neu startet (OF-01) | sicher (gewollt) | niedrig | stehen sofort in der Glocke; „Auflegen" gibt die Leitung frei | Michael |
| R7: Neustart des Backends während `offen` | niedrig | niedrig | Zustand nur im Speicher, Neustart beginnt in `ruhe` (`anruf-service.ts:178`); Frontend verliert die Verbindung und beendet den eigenen Anruf (`onDisconnected`, `anruf.service.ts:464`) | niemand |
| R4: Sitzung braucht länger als 2 min → es klingelt wie heute | hoch bei langen Aufgaben | niedrig | so entschieden (OF-04); Ansage „Leitung geschlossen" macht es verständlich | Michael |
| R5: „Gesendet" wird von einer sehr schnellen Folgemeldung abgeschnitten | mittel | niedrig | Hinweiston markiert den Wechsel | Michael |
| R6: Veralteter Timer löst `leitung.frist` für eine alte Runde aus | niedrig | mittel | `leitungId`-Vergleich; Test AK-09 | Test |

### 10. Manuelle Schritte

<!-- leser: mensch -->

| Schritt | Wer | Wann | Erledigt |
|---|---|---|---|
| E2E-Lauf am Mac mit Mikrofon und Stimme (§8), Protokoll prüfen | Agent in der Bausitzung, Michael liest das Protokoll | vor Merge | [ ] Lauf mit Mac-Stimme erledigt 2026-09-28 (`e2e.md`); Protokoll lesen und Messung mit eigener Stimme offen |
| Merge der PR (löst Auto-Deploy der UI aus, `CLAUDE.md` „Nie") | Michael | nach grünem CI | [ ] |
| Lokales UI-Backend (Port 3001, main-Checkout) nach dem Merge neu starten, damit der Anruf den neuen Zustand kennt: laufenden Prozess per PID beenden, dann `cd ui && npm run start:backend` (`ui/package.json:8`, läuft ohne Neuladen) | Michael | nach Merge | [ ] |

### 11. Schätzung

<!-- leser: mensch -->

4–6 h. Unsicher ist der Frontend-Dienst: `onState` hat schon viele Zweige (Ende, Nachfrage, eigene Meldung); der Übergang aus `offen` muss sich dort einfügen, ohne den FA-18-Pfad zu brechen. Der E2E-Lauf mit echter Stimme kostet zusätzlich rund 30 min.

### 12. Review des Plans

<!-- leser: mensch -->

| Finding | Quelle | Entscheidung | Änderung am Plan |
|---|---|---|---|
| S1, `meldung.erledigt` nach dem Senden: die Sitzung arbeitet → Ereignis schließt `offen` sofort | Self | angenommen: eigener Fall, Zustand bleibt | §3, §8 AK-06 |
| S2, `hatMeldung` hielte `offen` für einen Zustand mit Meldung → Zugriff auf `undefined` in `stateFuer`, `artDerSitzung` | Self | angenommen: Guard neu, Vorprüfung Schritt 0 | §2, §3, §6 |
| S3, Frontend-Ende-Zweig greift nach „Gesendet" nicht (`letzterEigenerId` leer) → keine Ansage bei Frist | Self | angenommen: eigener Zweig über `alt.zustand === 'offen'` | §3 |
| S4, eigener Effekt `leitung_neu` für den Ton | Self | abgelehnt: das Frontend sieht den vorigen Zustand ohnehin; weniger Protokoll | §3 |
| S5, Timer per Effekt starten/stoppen | Self | abgelehnt: aus dem Zustand abgeleitet ist robuster gegen vergessene Stopp-Effekte (R1) | §3 |
| S6, AK-07 „älteste" vs. heutige Reihenfolge (Rückfrage/Plan vor „fertig") | Self | entschieden nach ER-00 (engste Auslegung, die den Wortlaut erfüllt): „wie heute" gilt, Reihenfolge der Warteschlange unverändert | „In einfachen Worten", Nicht betroffen |
| E1, Zustands-Prüfungen verstreut, Namenslisten statt Typ-Einengung | extern (2/4) | angenommen: Guards in `anruf-zustand.ts` exportiert und typisiert (`'meldung' in z`, `'besitzer' in z`), Service-Kopie entfernt, Frontend prüft `offen` an je einer Stelle | §3, §5 |
| E2, Timer hängt davon ab, dass jeder Pfad `anwenden` nimmt; Neustart mitten in `offen` | extern (2/4) | angenommen für den ersten Teil: Sync sitzt in `anwenden` an der einzigen Zuweisung, Nachweis per grep. Zweiter Teil abgelehnt: der Zustand lebt nur im Speicher, nach Neustart ist er `ruhe`, es gibt keine hängende Leitung | §3, §5, §9 R7 |
| E3, Wettlauf zwischen `meldung.neu` und `senden.ok` | extern (2/4) | abgelehnt mit Absicherung: Node ist einfädig, Lesen der Schlange und Übergang laufen ohne `await` dazwischen; beide Reihenfolgen landen in AK-03 oder AK-04, je ein Test | §3 |
| E4, AK-07 als offen markiert, §3 nimmt die Antwort vorweg | extern (2/4) | angenommen: als eigene Entscheidung (S6) dokumentiert statt als offene Frage | „In einfachen Worten", §12 S6 |
| E5, Testlücken (mehr als zwei Runden, zweites Fenster, Neustart, `auflegen` gegen Frist) | extern (3/4) | angenommen für drei Runden, zweites Fenster, `auflegen` nach Frist und Verbindungsabbruch; Neustart ohne Test, weil der Konstruktor den Zustand auf `ruhe` setzt (R7) | §8 |
| E6, Wartezeit anderer Sitzungen ist unbegrenzt, nicht „bis zu 2 min" | extern (1/4) | angenommen: R3 und „In einfachen Worten" korrigiert; das Verhalten selbst folgt aus OF-01 und bleibt | §9 R3 |
| E7, verlorene `anruf:state`-Nachricht nimmt Ton und Frist-Ansage mit | extern (1/4) | abgelehnt: ein Verbindungsabbruch beendet die Leitung im Backend (`client.weg`, AK-08), nach dem Wiederverbinden gibt es keinen `offen`-Zustand mehr, den man verpassen könnte; innerhalb einer Verbindung gehen Nachrichten nicht verloren | — |
| E8, zweites Fenster bekommt `offen` ohne Meldung → leerer Kasten | extern (1/4) | angenommen: eigener Text ohne Meldungsdaten, Test | §3, §8 |
| E9, Mikrofon öffnet nach `offen → laeuft` ohne Klick | extern (1/4) | abgelehnt: das ist das gewünschte Verhalten („hört danach zu wie nach einem Annehmen", intent AK-03); die offene Leitung setzt den angenommenen Anruf fort, das Mikrofon öffnet erst nach dem Vorlesen, und 20 s Stille legen auf (INT-2026-026 AK-05) | — |
| E10–E20 | extern | im gelieferten Review-Text abgeschnitten, nicht lesbar; werden entschieden, sobald der Text vorliegt | — |
| E21, keine Messdaten zum neuen Verhalten | extern (1/4) | abgelehnt: die UI hat keine Telemetrie, Nutzer ist Michael allein; die 2 min bewertet er im Gebrauch | — |
| E22, Tastatur und Tab-Reihenfolge von „Auflegen" | extern (1/4) | angenommen ohne neue Kürzel: Knopf als `<button>`, Tab-Reihenfolge wie die übrigen Kasten-Knöpfe, kein Fokusraub (`design.md` §4) | §3 |

**Minimalinvasiv geprüft:** Warteschlange, Sender, Handler und Glocke bleiben unverändert; „andere Sitzungen klingeln nicht" fällt aus der bestehenden Regel „`naechste` nur in `ruhe`" heraus, ohne neuen Code; `anruf:auflegen` wird wiederverwendet statt einer neuen Nachricht; der Timer folgt dem Muster von `kulanzTimer`; `endeGrund` trägt die Ansage wie bei „Anrufmodus ausgeschaltet". Gestrichen: Effekt `leitung_neu`, Pausenflag in der Warteschlange.

**Abgleich Mensch/Agent:** „In einfachen Worten", §9, §10, §12 gegen §2–§8 gelesen am 2026-09-28: ohne Befund (Wecker an einer Stelle ↔ §3/§5; zweites Fenster ↔ §3/§8; unbegrenzte Wartezeit ↔ §9 R3; AK-07-Auslegung ↔ §12 S6)

### 13. Definition of Done

<!-- leser: agent -->

- [x] Jede AK aus Abschnitt 8 hat einen grünen Test.
- [x] Alle Nachweise aus Abschnitt 5 ausgeführt und im PR zitiert.
- [x] E2E-Pfad läuft (Abschnitt 8), Protokoll mit Screenshot (`e2e.md`, `design/ist/`).
- [ ] `verify` grün, Ausgabe im PR — und PR-Checks grün. (lokal `verify: OK`; PR-Check steht aus)
- [x] `docs/architecture.md` und `docs/design.md` nachgezogen (§4 #13, #14).
- [x] Manuelle Schritte (Abschnitt 10) erledigt oder im PR als offen markiert.
- [x] Abweichungen in Abschnitt 14.
- [x] 2x-Regel-Check: keine Wiederholung eines bekannten Fehlers (node-pty-`chmod` und Trust-Dialog nach `CLAUDE.md` erledigt); kein `CLAUDE.md`-Vorschlag.
- [ ] Abschlussbericht nach R3, endet mit „Für das Board".

### 14. Abweichungen bei der Umsetzung

<!-- leser: mensch -->

| Datum | Abweichung | Grund | Auswirkung auf Abschnitt |
|---|---|---|---|
| 2026-09-28 | Bestehender Service-Test „Senden ok → … nächste klingelt" (`anruf-service.test.ts`, FA-25) erwartet jetzt `offen` und das Klingeln der anderen Sitzung erst nach „Auflegen" | Der Test hielt das Verhalten aus INT-2026-026 FA-18 fest, das dieses Vorhaben laut `intent.md` `ersetzt` ablöst; kein Fix-Modus | §8 |
| 2026-09-28 | Hinweiston auch beim Übergang `sendet → laeuft` mit neuer Meldung (AK-04), nicht nur aus `offen` | Für Michael derselbe Fall: eine Folgemeldung kommt ohne Klingeln; ohne Ton begänne die Stimme unangekündigt (Zweck von AK-11, R5) | §3 Frontend-Dienst |
| 2026-09-28 | `AnrufErgebnis.leitung` neu; der Kasten zeigt das Ende aus `offen` ohne Präfix „Nicht gesendet:" | Der bestehende Ergebnis-Kasten hätte „Nicht gesendet: Leitung geschlossen." gezeigt, obwohl nichts ausstand | §3 Kasten |
| 2026-09-28 | Kasten: eigener Zweig `renderLeitung` vor der Meldungsprüfung in `render()`; zusätzlich „noch n warten" in der offenen Leitung | `render()` gab ohne `meldung` nichts aus — `offen` hat keine Meldung, Leitung und zweites Fenster wären unsichtbar geblieben; die Zahl zeigt, dass andere warten (AK-05) | §3 Kasten, §4 #6 |
| 2026-09-28 | `niemand_da` in `offen` lässt die Leitung stehen (wie in `laeuft`) | Plan nannte das Ereignis für `offen` nicht; Matrix-Test hält das Verhalten fest | §3 Zustand |
| 2026-09-28 | E2E: Frist-Probe mit Escape an die Sitzung statt einer Aufgabe über 2 Minuten; AK-04 nicht im E2E | Haiku lehnte `sleep` ab und meldete sich nach 8 s zurück; ein Abbruch per Escape erzeugt keinen Stop-Hook, also keine Meldung — für die Leitung derselbe Fall. AK-04 ist im E2E nicht erzwingbar (Bestätigung nach 0,4 s), abgedeckt durch Service- und Frontend-Test | §8 E2E-Pfad, `e2e.md` |
| 2026-09-28 | `theme.css`: eine Regel `aos-app .anruf-leitung-ergebnis` (Abstand, Schriftgröße); `notification-sound.ts`: Notenschleife als gemeinsame Hilfe für Klingelton und Hinweiston | §4 #7 „falls nötig" trat ein; keine doppelte Oszillator-Schleife | §4 #4, #7 |
