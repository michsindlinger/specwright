# Spec: Plan-PR, Karten anlegen und Handschritte nach dem Factory-Schnitt

> **Intent:** `intent.md` (INT-2026-035, Version 1.1.0)
> **Status:** freigegeben
> **Erstellt:** 2026-10-24 · **Freigabe:** Michael (Produktverantwortung), 2026-10-24
> **Gelesene Projekt-Docs:** `docs/product-brief.md`, `docs/architecture.md`, `docs/security.md`, `docs/design.md` (Stand: Commit 81eacf4)
> **Format:** 2.1

<!-- Die Spec ist FACHLICH. Sie beschreibt, was Nutzer erleben und was fachlich gelten muss.
     Nicht hinein gehören: Dateien, Komponenten, Datenbanktabellen, Bibliotheken, Architekturentscheidungen. Das ist plan.md.
     Die Projekt-Docs werden gelesen und dürfen hier nur BEDENKEN markieren (Abschnitt 7). Sie entscheiden nichts.
     Jede Anforderung verweist auf ein Ziel oder Abnahmekriterium der intent.md. Keine Anforderung ohne Herkunft. -->

## 1. Zusammenfassung

<!-- leser: mensch -->

Nach diesem Vorhaben bringt `/plan` einen geschnittenen Plan in vier bestätigten Schritten (hochladen, PR anlegen, mergen, Karten anlegen) bis an das Board der Factory, ohne dass Michael Git-Befehle tippt (Z-01, AK-01 bis AK-05). `/build` baut bei einem geschnittenen Plan nur noch Handschritte, jeden auf einem eigenen Zweig mit eigenem PR, der zugleich „erledigt" einträgt, und schließt das Vorhaben am Ende per PR auf dem Factory-Zweig ab (Z-02 bis Z-04, AK-06 bis AK-11). Ohne Factory-Schnitt ändert sich nichts (AK-12).

## 2. Nutzer und Abläufe

<!-- leser: mensch -->

Nutzer ist Michael, der in einer Claude-Sitzung plant und baut. Der Factory-Zweig ist immer der entfernte Stand (B-01); jeder Ablauf holt ihn frisch, bevor er ihn liest oder darauf aufsetzt.

### Ablauf A: Plan zur Factory bringen (AK-01, AK-02, AK-05)

<!-- leser: mensch -->

Auslöser: Michael gibt in `/plan` einen geschnittenen Plan frei, oder schneidet einen freigegebenen Plan nachträglich.

1. `/plan` committet den Plan wie heute und sagt: „Der Plan ist geschnitten. Damit die Factory ihn sieht, muss er auf den Factory-Zweig [Name]."
2. `/plan` zeigt die Dateien, die in den Plan-PR gehen (nur der eigene Vorhaben-Ordner), und fragt: „Hochladen?" Nach „ja" lädt es einen Zweig hoch, der auf dem aktuellen Factory-Zweig aufsetzt und nur diese Dateien ändert.
3. `/plan` fragt: „PR gegen [Factory-Zweig] anlegen?" Nach „ja" legt es den PR an und zeigt den Link.
4. `/plan` zeigt den Zustand des PR (Prüfungen, Konflikte) und fragt: „Mergen?" Nach „ja" merged es genau diesen PR.
5. Weiter mit Ablauf B.

Lehnt Michael einen Schritt ab, endet der Lauf: `/plan` sagt, welcher Schritt offen ist und wie er später fortgesetzt wird. Ergebnis: Der Plan liegt auf dem Factory-Zweig; der Planungs-Zweig ist danach kein Arbeitsort mehr (B-03).

### Ablauf B: Karten anlegen (AK-03, AK-04)

<!-- leser: mensch -->

Auslöser: Der Plan-PR ist gemergt (Ende von Ablauf A), oder ein Handschritt, der vor einer Karte steht, ist erledigt (Ablauf D).

1. `/plan` holt den Factory-Zweig frisch und lässt die Factory ohne Schreiben zeigen, was sie täte. Es gibt die Liste der Factory unverändert wieder: welche Karten angelegt würden, welche schon bestehen, welche ausgelassen würden, und je ausgelassener Karte die Gründe.
2. `/plan` fragt: „Diese n Karten anlegen?" Nach „ja" lässt es die Factory anlegen und zeigt ihr Ergebnis.
3. Je ausgelassener Karte, die die Factory als nicht ready einstuft, bietet `/plan` zwei Wege an: „neu schneiden (neuer Plan-PR)" oder „als Handschritt". Beide ändern die Kartendatei und laufen danach wieder durch Ablauf A und B. Nach zwei Runden Neuschnitt im Plan bleibt nur „als Handschritt".
4. Wartet eine ausgelassene Karte auf einen Handschritt oder eine Vorgänger-Karte, zeigt `/plan` den Grund und sagt, dass sie mit einem späteren Anlegen kommt; keine Wahl.

Ergebnis: Die ready Karten stehen am Board der Factory (Z-01).

### Ablauf C: Handschritte im Überblick (AK-06, AK-09)

<!-- leser: mensch -->

Auslöser: Michael ruft `/build INT-…` für einen geschnittenen Plan auf.

1. `/build` erkennt den Schnitt und baut nicht den Plan. Es holt den Factory-Zweig frisch und zeigt je Handschritt eine Zeile: Kennung, was, wer, Stand („erledigt am …", „frei" oder „wartet auf K-nn").
2. `/build` fragt, welchen freien Handschritt Michael jetzt erledigen will, und ob er Code braucht (Ablauf D) oder ohne Code erledigt ist (Ablauf E).
3. Ist der gewählte Handschritt nicht frei, oder ist die Arbeitskopie, in der gebaut würde, nicht sauber, bricht `/build` mit Grund ab und ändert nichts.
4. Gibt es keinen freien Handschritt, sagt `/build` das, nennt die Karten, auf die gewartet wird, und endet.

### Ablauf D: Handschritt mit Code (AK-07, AK-10, AK-05)

<!-- leser: mensch -->

1. Läuft die Sitzung schon in einer eigenen Arbeitskopie, arbeitet `/build` dort. Sonst legt es eine eigene Arbeitskopie für den Handschritt an; der Hauptcheckout bleibt unberührt.
2. `/build` legt einen eigenen Zweig für den Handschritt an, der auf dem frisch geholten Factory-Zweig aufsetzt.
3. `/build` setzt den Handschritt um, mit Verify, und trägt im selben Zweig sein Erledigt-Datum in die Kartendatei ein.
4. `/build` fragt vor dem Hochladen, vor der PR-Anlage gegen den Factory-Zweig und vor dem Merge je einmal.
5. Steht der Handschritt vor einer Karte, bietet `/build` nach dem Merge Ablauf B an.

Ergebnis: Arbeit und „erledigt" liegen in einem PR auf dem Factory-Zweig; erledigt ist der Handschritt genau dann, wenn dieser PR gemergt ist (Z-02, B-05).

### Ablauf E: Handschritt ohne Code als erledigt melden (AK-08, AK-05)

<!-- leser: mensch -->

1. Michael meldet „H-nn ist erledigt" und nennt den Nachweis (z. B. „Stichprobe am Probe-Projekt bestanden"); fehlt der Nachweis, fragt `/build` danach.
2. `/build` legt Arbeitskopie und Zweig an wie in Ablauf D, trägt nur das Erledigt-Datum ein und nennt den Nachweis in der Commit-Nachricht.
3. Hochladen, PR und Merge je mit Bestätigung wie in Ablauf D; danach gegebenenfalls Ablauf B.

### Ablauf F: Vorhaben abschließen (AK-11, AK-05)

<!-- leser: mensch -->

Auslöser: `/build` stellt beim Start oder nach einem Merge fest, dass alle Karten gemergt und alle Handschritte erledigt sind.

1. `/build` fragt: „Alle Karten gemergt, alle Handschritte erledigt. Ist das Vorhaben umgesetzt?"
2. Nach „ja": Zweig auf dem frisch geholten Factory-Zweig, Absicht auf `umgesetzt` nach Vorlage (nächste PATCH-Version, Tagesdatum, Zeile im Änderungsprotokoll), Plan auf `umgesetzt`; Hochladen, PR und Merge je mit Bestätigung.
3. Nach „nein": nichts ändern, Lauf endet.

Ergebnis: Die Factory liest das Vorhaben als umgesetzt; abhängige Vorhaben kommen weiter (Z-04).

### Ablauf G: Kontrollfall ohne Schnitt (AK-12)

<!-- leser: mensch -->

Ein Plan ohne Kartendatei oder mit dem Satz „Kein Schnitt: …" läuft in `/plan` und `/build` genau wie vor diesem Vorhaben: lokaler Commit, `NEXT: /build`, Bau des ganzen Plans auf einem Zweig von der aktuellen Basis.

## 3. Fachliche Anforderungen

<!-- leser: mensch -->

| ID | Anforderung | Herkunft | Prüfung |
|---|---|---|---|
| FA-01 | Wenn ein geschnittener Plan freigegeben oder nachträglich geschnitten ist, MUSS `/plan` Hochladen, PR-Anlage, Merge und Anlegen der Karten als getrennte Schritte anbieten und vor jedem eine eigene Bestätigung einholen. | AK-01 | Stichprobe (E2E) |
| FA-02 | Lehnt die Person einen Schritt ab, MUSS der Lauf ohne weitere Änderung enden und nennen, welcher Schritt offen ist und wie er fortgesetzt wird. | AK-01, AK-05 | Stichprobe (Kontrollfall) |
| FA-03 | Der Plan-PR DARF nur Dateien des eigenen Vorhaben-Ordners ändern, dazu die neuen Entscheidungsnotizen des Vorhabens, die eine Karte nennt (AN-S01), MUSS auf den Factory-Zweig zielen und MUSS auf dessen frisch geholtem entfernten Stand aufsetzen, auch wenn die Planung von einer anderen Basis aus lief. | AK-02, RB-02 | Stichprobe (E2E) |
| FA-04 | Vor dem Hochladen MUSS `/plan` die Dateien zeigen, die der Plan-PR ändert. | AK-02 | Stichprobe (E2E) |
| FA-05 | Ein PR DARF nur nach ausdrücklicher Bestätigung im Lauf gemergt werden; eine Bestätigung gilt für genau einen PR. | AK-05, NZ-04 | Review |
| FA-06 | Ist ein PR nicht mergebar (Konflikt, rote Prüfung, Schutzregel des Zweigs), DARF nicht gemergt werden; der Lauf MUSS den Grund zeigen und enden. | AK-05 | Stichprobe (Kontrollfall) |
| FA-07 | Nach dem Merge des Plan-PR MUSS `/plan` den Factory-Zweig frisch holen und zuerst die Vorschau der Factory zeigen (anzulegen, bestehen schon, ausgelassen mit Gründen), ohne etwas anzulegen. | AK-03 | Stichprobe (E2E) |
| FA-08 | Erst nach Bestätigung der Vorschau MUSS `/plan` die Factory anlegen lassen und ihr Ergebnis zeigen. | AK-03, NZ-06 | Stichprobe (E2E) |
| FA-09 | Je ausgelassener Karte MUSS `/plan` die Gründe der Factory unverändert zeigen. | AK-04, NZ-01 | Stichprobe (Kontrollfall) |
| FA-10 | Ist eine ausgelassene Karte nicht ready, MUSS `/plan` die Wahl „neu schneiden (neuer Plan-PR)" oder „als Handschritt" anbieten; beide führen über einen neuen Plan-PR (FA-01 bis FA-08). Nach zwei Runden Neuschnitt im Plan DARF nur noch „als Handschritt" angeboten werden. | AK-04 | Stichprobe (Kontrollfall) |
| FA-11 | Wartet eine ausgelassene Karte auf einen Handschritt oder eine Vorgänger-Karte, MUSS `/plan` den Grund zeigen und sagen, dass sie mit einem späteren Anlegen kommt; es DARF keine Wahl nach FA-10 anbieten. | AK-04 (AN-S02) | Stichprobe (Kontrollfall) |
| FA-12 | Meldet die Factory, dass Eingabe oder Board nicht nutzbar sind, MUSS `/plan` ihre Meldung zeigen und nichts weiter tun. | AK-03 | Stichprobe (Kontrollfall) |
| FA-13 | Wenn `/build` für einen geschnittenen Plan startet, MUSS es je Handschritt Kennung, was, wer und Stand („erledigt am …", „frei", „wartet auf K-nn") zeigen, gelesen vom frisch geholten Factory-Zweig. | AK-06, B-04, B-05 | Stichprobe (E2E) |
| FA-14 | Bei einem geschnittenen Plan DARF `/build` weder den Plan als Ganzes noch die Arbeit einer Karte bauen. | AK-06, Z-03 | Stichprobe (E2E) + Review |
| FA-15 | Wählt die Person einen freien Handschritt mit Code, MUSS die Arbeit auf einem eigenen Zweig nach dem Schema aus OF-02 entstehen, der auf dem frisch geholten Factory-Zweig aufsetzt, und in einem PR gegen den Factory-Zweig liegen, der zugleich das Erledigt-Datum des Handschritts setzt. | AK-07 | Stichprobe (E2E) |
| FA-16 | Meldet die Person einen Handschritt ohne Code als erledigt, MUSS ein PR entstehen, der nur sein Erledigt-Datum setzt und den Nachweis in der Commit-Nachricht nennt; ohne genannten Nachweis MUSS `/build` danach fragen. | AK-08 | Stichprobe (E2E) |
| FA-17 | Ist der gewählte Handschritt nicht frei, unbekannt oder schon erledigt, oder ist die Arbeitskopie, in der gebaut würde, nicht sauber, MUSS `/build` mit Grund abbrechen und DARF nichts ändern. | AK-09 | Stichprobe (Kontrollfall) |
| FA-18 | Läuft die Sitzung in einer eigenen Arbeitskopie, DARF `/build` keine zweite anlegen; sonst MUSS es eine eigene Arbeitskopie nach dem Schema aus OF-02 anlegen. Der Hauptcheckout DARF NICHT verändert werden. | AK-10 | Review |
| FA-19 | Vor Hochladen, PR-Anlage und Merge eines Handschritt- oder Abschluss-PR MUSS `/build` je eine Bestätigung einholen. | AK-05, AK-07, AK-08 | Stichprobe (E2E) |
| FA-20 | Ist nach einem Merge ein Handschritt erledigt, der vor einer Karte steht, MUSS `/build` anbieten, Ablauf B zu starten. | neu (Z-01: die zurückgehaltene Karte käme sonst nie ans Board; AN-S02) | Stichprobe (E2E) |
| FA-21 | Sind alle Karten gemergt und alle Handschritte erledigt, MUSS `/build` fragen, ob das Vorhaben umgesetzt ist; nach „ja" MUSS es Absicht und Plan per PR auf dem Factory-Zweig auf `umgesetzt` setzen (Kopf nach Vorlage); nach „nein" DARF es nichts ändern. | AK-11, RB-04 | Stichprobe (E2E) |
| FA-22 | Ist der Factory-Zweig der Hauptzweig des Specwright-Repos selbst, DARF kein Lauf mergen; er MUSS beim PR-Link enden und den Merge der Person überlassen. | NZ-04, RB-03 | Review |
| FA-23 | Ohne Factory-Schnitt MÜSSEN `/plan` und `/build` wie vor diesem Vorhaben laufen; `verify` MUSS grün sein. | AK-12 | Stichprobe (Kontrollfall) + Test |
| FA-24 | Ob eine Karte ready ist, warum sie ausgelassen wird und was angelegt wird, DARF nur die Factory entscheiden; Specwright DARF keine ihrer Regeln nachbilden. | NZ-01 | Review |
| FA-25 | Was ins öffentliche Specwright-Repo geht (Workflow-Texte, Beispiele), DARF keine Pfade, Hosts oder Projektnamen der Factory enthalten, nur Aufruf und Format. | RB-01 | Review |

## 4. Fehler- und Randfälle

<!-- leser: mensch -->

| Fall | Erwartetes Verhalten | Herkunft |
|---|---|---|
| Planungs-Zweig stammt von `main`, Factory-Zweig ist ein anderer | Plan-PR setzt auf dem Factory-Zweig auf und enthält trotzdem nur den Vorhaben-Ordner; keine fremden Commits im PR | FA-03 |
| Factory-Zweig lokal veraltet | jeder Ablauf holt ihn vor dem Lesen und vor dem Aufsetzen frisch; die Factory selbst holt nicht | FA-03, FA-07, FA-13 |
| Person lehnt „Mergen?" ab | PR bleibt offen, Lauf endet mit Link und Satz, wie fortgesetzt wird | FA-02 |
| PR hat Konflikt oder rote Prüfung | kein Merge, Grund gezeigt, Lauf endet | FA-06 |
| Vorschau zeigt nur „bestehen schon" | Anlegen nicht nötig, Satz „alle Karten stehen am Board", keine Bestätigung abgefragt | FA-07 |
| Factory meldet „Liste oder Label fehlt am Board" | Meldung unverändert, nichts angelegt, Lauf endet | FA-12 |
| Karte bestand am Board schon (zweiter Lauf) | Factory legt sie nicht doppelt an; `/plan` zeigt „besteht schon" | FA-07 |
| Dritte Runde Neuschnitt gewünscht | nur „als Handschritt" angeboten | FA-10 |
| Handschritt `before: K-03` erledigt | nach Merge Angebot Ablauf B; K-03 wird angelegt | FA-20 |
| Handschritt `after: K-02`, K-02 noch offen | Stand „wartet auf K-02"; Wahl wird mit Grund abgelehnt | FA-13, FA-17 |
| Handschritt `afterIntent` | gilt als frei ohne Wartebedingung (B-04) | FA-13 |
| Arbeitskopie hat ungesicherte Änderungen | Abbruch mit Grund, nichts geändert | FA-17 |
| Sitzung läuft im Hauptcheckout | neue Arbeitskopie für den Handschritt; Hauptcheckout unverändert | FA-18 |
| Handschritt-PR und Factory-Entwurf ändern dieselbe Datei | normaler Merge-Konflikt, FA-06 greift | intent AN-02 |
| Person bittet `/build`, eine Karte selbst zu bauen | Absage mit Grund: Karten baut die Factory | FA-14 |
| Plan geschnitten, aber noch nicht auf dem Factory-Zweig | `/build` sagt das und verweist auf das Fortsetzen von Ablauf A | FA-13, AN-S04 |
| Factory-Zweig = `main` von Specwright | kein Merge durch den Lauf | FA-22 |
| Person sagt bei Ablauf F „nein" | nichts geändert | FA-21 |

## 5. Daten, fachlich

<!-- leser: agent -->

| Information | Entsteht / ändert sich / verschwindet | Wer sieht sie | Datenklasse |
|---|---|---|---|
| Plan und Kartendatei des Vorhabens | gelangen per Plan-PR auf den Factory-Zweig; ändern sich bei Neuschnitt oder „als Handschritt" per weiterem Plan-PR | Michael, Factory | wie das Zielprojekt (dessen `security.md`); im Specwright-Repo öffentlich |
| Erledigt-Datum je Handschritt | entsteht mit dem Merge des Handschritt-PR auf dem Factory-Zweig | Michael, Factory | wie das Zielprojekt |
| Nachweis eines Handschritts ohne Code | steht in der Commit-Nachricht des Handschritt-PR | Michael, Leser des Zielrepos | wie das Zielprojekt |
| Vorschau und Ergebnis der Factory beim Anlegen (Kartentitel, Gründe, Zähler) | nur Ausgabe im Lauf, nicht gespeichert | Michael | wie das Zielprojekt; nie in Specwright-Dateien |
| Karten am Board der Factory | entstehen durch die Factory nach Bestätigung | Michael, Factory | Sache der Factory |
| Status `umgesetzt` von Absicht und Plan | entsteht per Abschluss-PR auf dem Factory-Zweig | Michael, Factory, abhängige Vorhaben | wie das Zielprojekt |
| Zweige und Arbeitskopien der Handschritte | entstehen je Handschritt; Aufräumen nicht im Umfang | Michael | intern (Arbeitskopie-Pfad nie ins Repo) |

## 6. Was der Nutzer sieht

<!-- leser: mensch -->

- Terminal, `/plan` nach der Freigabe eines geschnittenen Plans: Dateiliste des Plan-PR, dann vier Fragen nacheinander (hochladen, PR, mergen, anlegen), dazwischen PR-Link, PR-Zustand und die Vorschau der Factory im Wortlaut; je ausgelassener nicht ready Karte die Wahl zwischen zwei Wegen.
- Terminal, `/build` bei geschnittenem Plan: eine Zeile je Handschritt mit Stand, dann die Frage nach dem Handschritt und „mit Code" oder „ohne Code"; am Ende die Frage nach `umgesetzt`.
- Jede Zeile nennt Gegenstand und Ergebnis, wie `design.md` §1 Prinzip 2 es für Terminal-Ausgaben verlangt.
- Mock: kein Mock nötig, weil nur Terminal-Ausgaben und keine Web-UI betroffen sind (`design.md` §6; NZ-03); Beispieltext steht im Plan.

## 7. Bedenken aus den Projekt-Docs

<!-- leser: agent -->

| Quelle | Bedenken | Betrifft | Geklärt? (wer, wann, wie) |
|---|---|---|---|
| `docs/adr/0008-plan-ruft-eingangspruefung.md` „Entscheidung"; `docs/architecture.md` §5 Zeile Software Factory | ADR-0008 koppelt „nur über einen Befehl, nur lesend, ohne Netz und Zugangsdaten". `create-cards` ist ein zweiter Befehl und schreibt mit Bestätigung ans Board, mit Netz und den Zugängen der Factory. Die Kopplung wächst. | FA-07, FA-08 | offen — an den Plan delegiert, nicht blockierend. Vorschlag: Nachtrag zu ADR-0008 (zweiter Befehl, schreibend nur mit Bestätigung, Zugänge bleiben bei der Factory) und §5-Zeile in derselben PR |
| Factory `create-cards` (Lesen der Kartendatei vom Factory-Zweig) und `readiness` (Regel EP-07) | Nennt eine Karte eine neue Entscheidungsnotiz des Vorhabens, die nur im Planungs-Zweig liegt, findet die Factory sie auf dem Factory-Zweig nicht und lässt die Karte aus. Mit AK-02 im engen Wortlaut wäre jede solche Karte ausgelassen. | FA-03 | geklärt 2026-10-24 (Michael): AN-S01 bestätigt, AK-02 in intent 1.1.0 erweitert |
| Factory `create-cards` (Lesen ohne Holen) | Die Factory holt den entfernten Stand nicht selbst; ein veralteter lokaler Stand führt zu „keine Kartendatei" oder alter Einstufung. | FA-07, FA-13 | geklärt in der Spec: jeder Ablauf holt frisch (FA-03, FA-07, FA-13); wie, entscheidet der Plan |
| Factory `card-creation` (Arten ausgelassener Karten) | Die Factory lässt aus drei Gründen aus: nicht ready, wartet auf Handschritt, Vorgänger fehlt am Board. Die Wahl aus AK-04 passt nur zum ersten. | FA-10, FA-11 | geklärt 2026-10-24 (Michael): AN-S02 bestätigt, FA-11 und FA-20 |
| intent AN-01 | Prüfung: Exit 0/1/2 und lesbare Gründe je ausgelassener Karte | FA-09, FA-12 | geklärt 2026-10-24 durch Lesen des Factory-Codes: 0 nichts ausgelassen, 1 mindestens eine ausgelassen, 2 Eingabe/Board nicht nutzbar oder Schreibfehler; je Karte ein Satz je Grund; ohne `--apply` nur Vorschau |
| Factory ADR-054 Nachtrag 5 (Handschritte, „erledigt") | „Karte gemergt" (B-04, AK-06, AK-11) ist im Factory-Format nicht als Feld vorhanden; woran Specwright erkennt, dass die Arbeit einer Karte auf dem Factory-Zweig liegt (Board-Spalte, PR, Vermerk), ist offen. | FA-13, FA-21 | offen — an den Plan delegiert, nicht blockierend. Vorschlag: aus dem, was Factory oder Git ohne neue Regel liefern; keine eigene Regel (NZ-01) |
| `CLAUDE.md` „Konventionen" (ADR-Pflicht), `docs/architecture.md` AR-01 | Workflows `plan` und `build` ändern sich; neue Datei im Lieferumfang nur mit Manifest-Zeile | FA-23 | offen — an den Plan delegiert, nicht blockierend. Vorschlag: keine neue Datei, nur bestehende Workflows; sonst Manifest-Zeile (RB-05) |
| `docs/architecture.md` AR-06 | Framework darf nicht von der UI abhängen | alle FA | geklärt: Abläufe laufen im Terminal ohne UI |
| `docs/product-brief.md` §5 und `docs/design.md` §4 „Vorhaben abschließen"; `specwright/workflows/core/build.md` Step 6 | Abschluss gilt heute als UI-Klick gegen den Hauptzweig, die Bausitzung schreibt ihn nicht. FA-21 schreibt ihn bei geschnittenen Plänen. Ist der Factory-Zweig nicht der Hauptzweig, zeigt die UI-Übersicht das Vorhaben weiter als offen. | FA-21 | geklärt durch RB-04 und NZ-03/OF-01 (Michael, 2026-10-24); UI-Abgleich ist ein eigenes Vorhaben |
| `docs/security.md` §1, §5 (Repo öffentlich, keine Host-Details) | Workflow-Texte dürfen keine Factory-Pfade, Hosts, Projektnamen enthalten; Ausgaben der Factory (Kartentitel, Board) bleiben im Lauf | FA-25 | geklärt in der Spec (FA-25, §5) |
| `docs/security.md` §3 (GitHub-Token), §6 „externes System" | Hochladen, PR und Merge nutzen den GitHub-Zugang des Rechners; Anlegen nutzt die Zugänge der Factory. Specwright hält keine Zugänge. | FA-01, FA-08 | offen — an den Plan delegiert, nicht blockierend. Vorschlag: Zugang und Ausfallverhalten je Schritt in Plan §4/§8 nennen, wie §6 verlangt |
| `docs/security.md` §5 „Produktions-Deploy ohne Freigabe"; `CLAUDE.md` „Nie" | Merge auf `main` von Specwright löst Auto-Deploy der UI aus | FA-22 | geklärt in der Spec (FA-22) |
| `specwright/workflows/core/build.md` Step 2 (Schema Teil-Arbeitskopien) gegen OF-02 | Schema `hand/INT-…-H-nn` und `…-worktrees/INT-…-H-nn` passt zur Form `…-worktrees/INT-JJJJ-NNN-t<n>` und kollidiert nicht mit `feat/…` | FA-15, FA-18 | geklärt 2026-10-24 durch Vergleich (intent OF-02) |
| `docs/design.md` §1 Prinzip 2, §6 | Terminal-Ausgaben als Protokoll; kein Mock nötig | Abschnitt 6 | geklärt in der Spec (§6) |
| `docs/product-brief.md` §7 (kein eigenes Ticket-System) | Das Board der Factory ist nicht das Obsidian-Board; Specwright führt kein eigenes. | NZ-02 | geklärt: keine Handschritte am Board, Karten führt die Factory |

## 8. Nicht im Umfang

<!-- leser: mensch -->

- NZ-01: keine Prüfregel der Factory in Specwright.
- NZ-02: keine Handschritte am Board.
- NZ-03: keine Änderung an der Web-UI; der UI-Abschluss gegen den Factory-Zweig ist ein eigenes Vorhaben (OF-01).
- NZ-04: kein Merge ohne Bestätigung im Lauf; kein Merge nach `main` von Specwright durch den Lauf.
- NZ-05: keine Änderung am Code der Factory; der Nachtrag zu ADR-054 läuft im Factory-Repo.
- NZ-06: kein Anlegen der Karten durch die Factory-Engine selbst.
- Aufräumen der Zweige und Arbeitskopien der Handschritte nach dem Merge.
- Bauen der Arbeit von Karten durch `/build`, auch auf Wunsch.
- Erkennen, ob ein Handschritt ohne Code wirklich erledigt ist; es zählt die Meldung der Person mit Nachweis.

## 9. Annahmen

<!-- leser: mensch -->

- **AN-S01:** Der Plan-PR darf neben dem Vorhaben-Ordner auch die neuen Entscheidungsnotizen des Vorhabens enthalten, die eine Karte nennt; sonst lässt die Factory diese Karten aus. Weitet AK-02 aus; `intent.md` Fassung 1.1.0 mit geändertem AK-02. — bestätigt am 2026-10-24 von Michael (Produktverantwortung)
- **AN-S02:** Die Wahl aus AK-04 gilt nur für Karten, die nicht ready sind. Wartet eine Karte auf einen Handschritt oder eine Vorgänger-Karte, zeigt `/plan` nur den Grund; nach dem Merge des Handschritts bietet `/build` das Anlegen erneut an (FA-20). — bestätigt am 2026-10-24 von Michael (Produktverantwortung)
- **AN-S03:** „Höchstens zwei Runden Neuschnitt je Plan" (ADR-0008) zählt die Runden aus dem Planen mit. — bestätigt am 2026-10-24 von Michael (Produktverantwortung)
- **AN-S04:** Ein abgebrochener Ablauf A oder B wird fortgesetzt, indem `/plan INT-…` erneut für den freigegebenen, geschnittenen Plan aufgerufen wird; es plant nicht neu, sondern beginnt beim ersten offenen Schritt. — bestätigt am 2026-10-24 von Michael (Produktverantwortung)
- **AN-S05:** „Arbeitskopie nicht sauber" (AK-09) meint die Arbeitskopie, in der der Handschritt gebaut würde; eine frisch angelegte Arbeitskopie ist sauber. — bestätigt am 2026-10-24 von Michael (Produktverantwortung)
- **AN-S06:** Das Erledigt-Datum ist das Tagesdatum beim Anlegen des Handschritt-PR. — bestätigt am 2026-10-24 von Michael (Produktverantwortung)
- **AN-S07:** Bei einem geschnittenen Plan bleibt der Status des Plans bis zum Abschluss unverändert; der Abschluss-PR setzt Absicht und Plan zusammen auf `umgesetzt`. — bestätigt am 2026-10-24 von Michael (Produktverantwortung)
- **AN-S08:** Ablauf A und B gelten auch nach einem nachträglichen Schnitt (`/plan --karten`). — bestätigt am 2026-10-24 von Michael (Produktverantwortung)

## 10. Freigabe

<!-- leser: agent -->

- [x] Jede FA hat Herkunft und Prüfung.
- [x] Jedes AK der intent.md ist von mindestens einer FA abgedeckt: AK-01 → FA-01, FA-02 · AK-02 → FA-03, FA-04 · AK-03 → FA-07, FA-08, FA-12 · AK-04 → FA-09, FA-10, FA-11 · AK-05 → FA-02, FA-05, FA-06, FA-19 · AK-06 → FA-13, FA-14 · AK-07 → FA-15, FA-19 · AK-08 → FA-16, FA-19 · AK-09 → FA-17 · AK-10 → FA-18 · AK-11 → FA-21 · AK-12 → FA-23.
- [x] Abschnitt 7 vollständig geklärt oder begründet offen.
- [x] Keine Technik, keine Architektur, keine Dateinamen in diesem Dokument (Pfade nur als Herkunft in §7).
- [x] Bei risikoklasse hoch: Tech Lead hat gelesen. (entfällt: mittel)
- [x] Abgleich Mensch/Agent: Mensch-Teil gegen Agenten-Teil geprüft (2026-10-24), Befund (beide als Rückfrage gestellt und mit der Freigabe entschieden): §2 und §3 versprechen „Karte gemergt" als Stand, §7 lässt offen, woran das erkannt wird (an den Plan delegiert); §1 „ohne Git-Befehle" hängt an AN-S01, weil sonst Karten mit neuer Entscheidungsnotiz ausgelassen würden.
- **Freigegeben:** Michael (Produktverantwortung), 2026-10-24, Commit siehe `spec(INT-2026-035): fachliche Spec freigegeben`
