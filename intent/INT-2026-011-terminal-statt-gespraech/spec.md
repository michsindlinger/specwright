# Spec: UI: Terminal statt Gespräch — die Sitzung selbst neben dem Dokument

> **Intent:** `intent.md` (INT-2026-011, Version 1.0.0)
> **Status:** freigegeben
> **Erstellt:** 2026-09-16 · **Freigabe:** Product Owner (Michael Sindlinger), 2026-09-16
> **Gelesene Projekt-Docs:** `docs/product-brief.md`, `docs/architecture.md`, `docs/security.md`, `docs/design.md` (Stand: Commit 2d811e2)

<!-- Die Spec ist FACHLICH. Sie beschreibt, was Nutzer erleben und was fachlich gelten muss.
     Nicht hinein gehören: Dateien, Komponenten, Datenbanktabellen, Bibliotheken, Architekturentscheidungen. Das ist plan.md.
     Die Projekt-Docs werden gelesen und dürfen hier nur BEDENKEN markieren (Abschnitt 7). Sie entscheiden nichts.
     Jede Anforderung verweist auf ein Ziel oder Abnahmekriterium der intent.md. Keine Anforderung ohne Herkunft. -->

## 1. Zusammenfassung

<!-- leser: mensch -->

Nach dem Umbau zeigt die Vorhaben-Seite am Mac rechts neben dem Dokument die Sitzung selbst: das Terminal, in dem Claude Code läuft, angedockt statt schwebend, mit dem Tab der Vorhaben-Sitzung gewählt (Z-01, AK-01, AK-02). Was Michael auf der Dokumentseite tut, sieht er dort passieren: ein Schritt startet eine neue Sitzung, deren Tab erscheint; Freigabe und Anmerkungen erscheinen als Eingabe in der laufenden Sitzung (Z-02, AK-03 bis AK-05). Kennungen, die Claude im Terminal nennt, führen zum Absatz im Dokument (Z-03, AK-06, AK-07). Die Gesprächsansicht aus INT-2026-007 ist danach weg — nicht versteckt (Z-04, AK-11, AK-12). Handy und alle anderen Seiten bleiben, wie sie sind (AK-13).

## 2. Nutzer und Abläufe

<!-- leser: mensch -->

<!-- Je Ablauf: wer, Auslöser, Schritte aus Nutzersicht, Ergebnis. Jeder Ablauf deckt mindestens ein AK ab. -->

### Ablauf A: Ein Vorhaben mit laufender Sitzung öffnen (AK-01, AK-02)

<!-- leser: mensch -->

1. Michael öffnet am Mac ein Vorhaben aus der Liste oder springt über die Glocke hin; die Sitzung des Vorhabens lebt (arbeitet oder wartet).
2. Die Seite zeigt links Kennung, Titel, Phasen-Chips, Zustandszeile, Protokoll und das Dokument der gewählten Phase — wie heute. Rechts, gleich breit, steht das Terminal: derselbe Kopf wie das schwebende Terminal (Neue Session, Layout, Vollbild, Schließen), darunter die Tabs, der Tab der Vorhaben-Sitzung ist gewählt, darunter der Verlauf mit Claudes letzter Frage und der Eingabezeile.
3. Michael liest die Frage im Terminal, klickt hinein und antwortet dort — Enter schickt ab, wie in jedem Terminal. Claude arbeitet weiter; der Zustand links wechselt auf „arbeitet".
4. Ein schwebendes Terminal gibt es auf dieser Seite nicht zusätzlich; Cmd/Ctrl+D klappt das angedockte weg und zurück (Ablauf E).
5. Ergebnis: eine Sitzung, eine Ansicht. Michael sieht, was Claude tut, und antwortet an der Stelle, wo die Frage steht.

### Ablauf B: Den nächsten Schritt starten (AK-03)

<!-- leser: mensch -->

1. Unter dem Dokument steht wie heute der Knopf für den nächsten Schritt („Spec schreiben", „Plan erstellen", „Bauen") mit Modell- und Arbeitskopie-Wahl; er ist frei, wenn keine Sitzung des Vorhabens arbeitet oder wartet.
2. Michael wählt Modell und Arbeitskopie und drückt den Knopf.
3. Binnen 2 s erscheint im angedockten Terminal ein neuer Tab mit dem Namen der Sitzung (etwa „plan INT-2026-003"); er ist gewählt. Michael sieht Claude Code hochfahren und den Befehl laufen (Mock 11b).
4. Der Knopf ist gesperrt, solange die Sitzung arbeitet oder wartet; die Zustandszeile nennt Sitzung, Modell, Arbeitskopie; das Protokoll trägt „Schritt … gestartet".
5. Ergebnis: Der Schritt startet — wie heute — als eigene Sitzung; neu ist nur, dass Michael sie sofort sieht, ohne das Terminal zu suchen.

### Ablauf C: Freigeben oder Anmerkungen schicken (AK-04, AK-05)

<!-- leser: mensch -->

1. Michael hat im Dokument Anmerkungen gesetzt oder das Dokument wartet auf Freigabe; in der Sende-Leiste stehen „Änderungen schicken" und „Freigeben".
2. Er drückt „Freigeben". Die Sitzung des Vorhabens wartet gerade auf Eingabe.
3. Binnen 2 s erscheint der Freigabetext im Terminal als Eingabe der Sitzung; Claude reagiert darauf. Das Protokoll links zeigt „Freigabe … gesendet", kurz darauf „angenommen".
4. Arbeitet die Sitzung gerade oder zeigt sie einen Dialog, passiert dasselbe wie heute: Der Text wird eingereiht (Protokoll „eingereiht"), er tippt nicht in den Dialog, und Michael sieht ihn im Terminal, sobald die Sitzung wieder Eingabe nimmt.
5. Hat das Vorhaben keine Sitzung, startet „Freigeben" — wie heute — die Sitzung des nächsten Schritts mit der Freigabe als erster Eingabe; ihr Tab erscheint gewählt, und Michael sieht die Zustellung nach Claudes erster Frage.
6. Ergebnis: Freigabe und Anmerkungen gehen denselben Weg wie heute, nur sichtbar.

### Ablauf D: Eine Kennung aus dem Terminal im Dokument nachschlagen (AK-06, AK-07)

<!-- leser: mensch -->

1. Claude schreibt im Terminal: „FA-03 leitet daraus ab, dass der Schalter auf allen Geräten denselben Stand hat …".
2. „FA-03" kommt im Dokument der gewählten Phase vor und erscheint deshalb im Terminal als Verweis (unterstrichen). Michael fährt darüber: Ein Hinweis zeigt den Absatz aus dem Dokument (Mock 11a).
3. Er klickt den Verweis: Das Dokument links springt zu FA-03 und hebt die Zeile hervor. Liegt der Absatz in einem zugeklappten Abschnitt („Technik"), geht der Abschnitt auf.
4. Im Terminal passiert nichts: keine Eingabe, kein Zeichen in der Eingabezeile, die Sitzung läuft unverändert.
5. Wechselt Michael den Phasen-Chip, gelten die Verweise für das neue Dokument; Codes, die dort nicht vorkommen, sind wieder normaler Text.
6. Ergebnis: Claudes Verweise sind anklickbar, wo Claude sie schreibt — im Terminal.

### Ablauf E: Terminal weg- und zurückklappen, Vorhaben ohne Sitzung (AK-08, AK-09, AK-14)

<!-- leser: mensch -->

1. Michael drückt auf der Vorhaben-Seite Cmd/Ctrl+D: Das angedockte Terminal verschwindet, das Dokument und die Sende-Leiste nutzen die volle Breite (Mock 11c). Noch einmal Cmd/Ctrl+D: Das Terminal ist wieder da, angedockt, mit demselben Tab.
2. Ein Vorhaben ohne Sitzung zeigt das Dokument in voller Breite. Drückt Michael dort Cmd/Ctrl+D, erscheint das Terminal ebenfalls angedockt — mit dem zuletzt gewählten Tab oder dem Leerzustand „Keine aktiven Sessions" (OF-01).
3. Ist das Fenster schmaler als 1024 px, gibt es kein Andocken: Das Terminal erscheint schwebend wie auf jeder anderen Seite (OF-02). Wird das Fenster wieder breiter, dockt es an — Verlauf und Tab bleiben.
4. Verlässt Michael die Vorhaben-Seite bei offenem Terminal, ist es auf der Liste oder der Projekt-Seite schwebend wie heute; auf einer Vorhaben-Seite wieder angedockt.
5. Ergebnis: Auf der Vorhaben-Seite gibt es genau einen Terminal-Modus — angedockt; Cmd/Ctrl+D bleibt der eine Schalter.

### Ablauf F: Neue Absicht starten (AK-10)

<!-- leser: mensch -->

1. Michael tippt „Neue Absicht": Textfeld („Was stört, wen, seit wann?"), Modellwahl, „Starten" — unverändert (NZ-07).
2. Er schreibt zwei Sätze, wählt das Modell, drückt „Starten".
3. Links erscheint die Karte „Absicht-Sitzung ‚intent' läuft — Vorhaben entsteht … Dein Text wird nach der ersten Frage übergeben" — wie heute, mit dem Hinweis „Terminal rechts". Rechts steht das angedockte Terminal mit dem Tab der Absicht-Sitzung gewählt (Mock 11d). Michael sieht Claude Code hochfahren (etwa 10 s) und die erste Frage stellen; sein Text erscheint als Antwort darauf.
4. Weitere Rückfragen beantwortet er im Terminal. Sobald Claude den Vorhaben-Ordner anlegt, wechselt die Seite auf das Vorhaben (Ablauf A); der Terminal-Tab bleibt derselbe, der Verlauf bleibt stehen.
5. Ergebnis: Der Einstieg ist wie heute; das Interview läuft sichtbar im Terminal statt im Gespräch.

### Ablauf G: Dasselbe am Handy (AK-13)

<!-- leser: mensch -->

1. Michael öffnet ein Vorhaben auf dem Handy.
2. Die Seite zeigt Kennung, Titel, Chips und Dokument; kein Terminal neben dem Dokument, sondern wie heute der Knopf „Im Terminal öffnen ↗", der die Sitzung als Vollbild-Terminal öffnet.
3. Ergebnis: Am Handy ändert sich nichts.

### Ablauf H: Betrieb — das Gespräch abbauen (AK-11, AK-12)

<!-- leser: mensch -->

1. Voraussetzung: Das angedockte Terminal ist ausgeliefert und geprüft (Abläufe A bis F). Vorher wird nichts abgebaut — kein Stand ohne Sitzungsansicht auf der Vorhaben-Seite.
2. Alles, was allein dem Gespräch diente, wird entfernt: die Gesprächsansicht mit Verlauf und Freitext-Feld, der Dienst, der die Sitzung aus Hook-Ereignissen und dem Transkript zusammensetzte, das Lesen der Transkriptdateien, die Nachrichten dafür, ihre Tests.
3. Alles, was auch anderes trägt, bleibt und wird nachgewiesen: Glocke (Agent fertig oder wartet), Protokoll mit „gesendet/eingereiht/angenommen", Zustellung von Freigabe und Anmerkungen mit Dialog-Prüfung, erste Eingabe von „Neue Absicht" und Freigabe, Ordner-Folge der Absicht-Sitzung.
4. Die Projekt-Docs werden nachgezogen: Architektur ohne Gespräch und ohne Transkript-Leser, mit dem angedockten Terminal; Design ohne „Dokument über Gespräch unter 1024 px"; Sicherheit mit angepasster Transkript-Zeile (der Leser entfällt, der Hook meldet den Pfad weiter); Produkt-Brief mit „Terminal neben dem Dokument" statt „Gespräch"; ADR-0003 als abgelöst gekennzeichnet, die Nachfolge-Entscheidung („die Sitzung wird gezeigt, nicht nachgelesen") als eigene ADR.
5. Nachmessung: kein Gesprächs-Code mehr (EK-01), alle Tests grün, Screenshots neben Mock 11a bis 11d.
6. Ergebnis: Weniger Code, eine Darstellung je Sitzung; die Docs sagen, was gilt.

## 3. Fachliche Anforderungen

<!-- leser: mensch -->

<!-- Eine Zeile = eine prüfbare Aussage. Modalverben groß. Herkunft = AK/Z/NZ aus intent.md oder „neu (Grund)". -->

| ID | Anforderung | Herkunft | Prüfung |
|---|---|---|---|
| FA-01 | Wenn Michael am Mac (Fenster ≥ 1024 px) ein Vorhaben mit lebender Sitzung öffnet, MUSS die Seite links das Dokument der gewählten Phase und rechts das Terminal zeigen, beide gleich breit. | AK-01 | Playwright + Screenshot |
| FA-02 | Beim Öffnen MUSS im Terminal der Tab der Sitzung des Vorhabens gewählt sein; andere Tabs bleiben erreichbar. | AK-01 | Test |
| FA-03 | Solange das Terminal auf der Vorhaben-Seite angedockt ist, DARF NICHT zusätzlich ein schwebendes Terminal erscheinen. | AK-02 | Test |
| FA-04 | Das angedockte Terminal MUSS Verlauf, Eingabe, Tabs und die Knöpfe Neue Session, Layout, Vollbild und Schließen wie das schwebende Terminal bieten; Verlauf und Eingabe sind dieselbe Sitzung. | AK-02 | Test |
| FA-05 | Wenn Michael auf der Vorhaben-Seite Cmd/Ctrl+D drückt, MUSS das angedockte Terminal weichen und Dokument sowie Sende-Leiste die volle Breite nutzen; ein zweites Cmd/Ctrl+D MUSS es angedockt mit demselben Tab zurückholen. | AK-08 | Test |
| FA-06 | Ein Vorhaben ohne Sitzung MUSS das Dokument in voller Breite zeigen; wird das Terminal dort geöffnet, MUSS es angedockt erscheinen, mit dem zuletzt gewählten Tab oder dem Leerzustand. | AK-09 | Test |
| FA-07 | Solange das Fenster schmaler als 1024 px ist, DARF das Terminal auf der Vorhaben-Seite nicht angedockt sein; es MUSS schwebend erscheinen. Wird das Fenster breiter, MUSS es andocken, ohne dass Verlauf oder gewählter Tab verloren gehen. | AK-14 | Test |
| FA-08 | Wenn Michael den Knopf für den nächsten Schritt drückt, MUSS die neue Sitzung binnen 2 s ab Klick als gewählter Tab im angedockten Terminal erscheinen und der Befehl dort sichtbar laufen. | AK-03 | Messung |
| FA-09 | Der Knopf für den nächsten Schritt DARF NICHT in eine bestehende Sitzung tippen; er MUSS wie heute eine neue Sitzung mit dem gewählten Modell und der gewählten Arbeitskopie starten. | NZ-04 | Test |
| FA-10 | Wenn Michael „Freigeben" oder „Änderungen schicken" drückt und die Sitzung wartet, MUSS der Text binnen 2 s ab Klick im Terminal als Eingabe der Sitzung sichtbar sein; das Protokoll MUSS „gesendet" und danach „angenommen" zeigen. | AK-04 | Test + Messung |
| FA-11 | Solange die Sitzung arbeitet oder einen Dialog zeigt, MUSS ein Text aus Freigabe oder Anmerkung eingereiht werden (Protokoll „eingereiht"), DARF NICHT in den Dialog tippen und MUSS im Terminal erscheinen, sobald die Sitzung wieder Eingabe nimmt. | AK-05 | Test |
| FA-12 | Wenn „Freigeben" ohne Sitzung gedrückt wird, MUSS wie heute die Sitzung des nächsten Schritts mit der Freigabe als erster Eingabe starten; ihr Tab MUSS gewählt erscheinen, die Zustellung nach Claudes erster Frage im Terminal sichtbar sein. | AK-04 | Test |
| FA-13 | Wenn im Terminal eine Kennung steht, die im Dokument der gewählten Phase vorkommt, MUSS sie als Verweis erscheinen: Hover zeigt den Absatz, Klick springt im Dokument dorthin und hebt ihn hervor. | AK-06 | Test |
| FA-14 | Liegt der Absatz eines geklickten Verweises in einem zugeklappten Abschnitt, MUSS der Abschnitt aufgehen, bevor gesprungen wird. | AK-06 | Test |
| FA-15 | Ein Klick auf einen Verweis DARF NICHT als Eingabe in der Sitzung landen und DARF die Sitzung nicht verändern. | AK-07 | Test |
| FA-16 | Codes, die nicht im Dokument der gewählten Phase vorkommen, DÜRFEN NICHT als Verweis erscheinen; ohne Dokument („Kein Dokument in dieser Phase") gibt es keine Verweise. | AK-06 | Test |
| FA-17 | Wenn Michael den Phasen-Chip wechselt, MÜSSEN die Verweise im Terminal binnen 1 s dem neuen Dokument folgen. | AK-06 | Test |
| FA-18 | Wenn Michael auf „Neue Absicht" „Starten" drückt, MUSS links die Karte „Absicht-Sitzung läuft" mit dem Hinweis „Terminal rechts" und rechts das angedockte Terminal mit dem Tab der Absicht-Sitzung gewählt erscheinen; Textfeld, Modellwahl und Zustellung des Texts bleiben wie heute. | AK-10, NZ-07 | Test + Playwright |
| FA-19 | Wenn die Absicht-Sitzung den Vorhaben-Ordner anlegt, MUSS die Seite auf das Vorhaben wechseln und das Terminal denselben Tab mit stehendem Verlauf zeigen. | AK-10 | Test |
| FA-20 | Auf dem Handy MUSS die Vorhaben-Seite unverändert bleiben: Dokument, Knopf „Im Terminal öffnen ↗", Vollbild-Terminal. | AK-13 | Playwright |
| FA-21 | Nach dem Umbau DARF es keinen Gesprächs-Code mehr geben: Gesprächsansicht, Dienst, Handler, Transkript-Leser, Nachrichten des Gesprächs und ihre Tests sind entfernt. | AK-11 | Review |
| FA-22 | Glocke, Protokoll, Zustellung von Freigabe und Anmerkungen mit Dialog-Prüfung, erste Eingabe und Ordner-Folge der Absicht-Sitzung MÜSSEN nach dem Abbau unverändert funktionieren. | AK-11, NZ-06 | Test |
| FA-23 | Architektur-, Design-, Sicherheits- und Produkt-Doc DÜRFEN das Gespräch nicht mehr als Bestandteil nennen; ADR-0003 MUSS als abgelöst gekennzeichnet sein, mit Verweis auf eine Nachfolge-ADR. | AK-12 | Review |
| FA-24 | Wenn die Sitzung des Vorhabens endet, während die Seite offen ist, MUSS das Terminal angedockt bleiben und seinen Leerzustand oder die übrigen Tabs zeigen; die Zustandszeile MUSS „Sitzung beendet" nennen und der Knopf für den nächsten Schritt frei werden — wie heute. | Z-01, neu (Randfall) | Test |
| FA-25 | Der Abbau des Gesprächs DARF NICHT vor dem angedockten Terminal ausgeliefert werden. | Z-01, Intent §10 | Review |

## 4. Fehler- und Randfälle

<!-- leser: mensch -->

| Fall | Erwartetes Verhalten | Herkunft |
|---|---|---|
| Sitzung des Vorhabens endet, während die Seite offen ist (Claude beendet, Tab geschlossen, Sitzung von außen beendet) | Terminal bleibt angedockt (Leerzustand oder übrige Tabs); links „Sitzung beendet", Knopf frei; kein Layoutsprung | FA-24 |
| Michael schließt den Tab der Vorhaben-Sitzung mit „×" | wie „Sitzung endet"; das Protokoll trägt das Ende wie heute | FA-24 |
| Sprung aus der Glocke auf ein Vorhaben | wie Ablauf A: angedockt, Tab der Sitzung gewählt | FA-01, FA-02 |
| Sprung aus der Glocke auf eine Sitzung ohne Vorhaben | wie heute: Terminal öffnet sich mit dieser Sitzung — auf der Liste schwebend | FA-03 (gilt nur auf der Vorhaben-Seite) |
| Vorhaben-Sitzung läuft in einer Arbeitskopie (Worktree) | Tab-Name wie heute (Name der Sitzung); Zustandszeile nennt die Arbeitskopie | FA-02 |
| Layout-Modus des Terminals ist Split oder Quad | Modi bleiben verfügbar und verhalten sich wie heute, auch angedockt; der Tab der Vorhaben-Sitzung ist in einem Fenster gewählt | FA-04 |
| Vollbild des Terminals | wie heute: deckt die ganze Seite; Verlassen des Vollbilds führt zurück zum angedockten Zustand | FA-04 |
| Fenster wird bei angedocktem Terminal unter 1024 px verkleinert | Terminal wird schwebend, Verlauf und Tab bleiben; über 1024 px dockt es wieder an | FA-07 |
| Zwei Geräte zeigen dieselbe Sitzung (Mac angedockt, zweiter Mac schwebend) | wie heute bei zwei Geräten: dieselbe Sitzung, die zuletzt gesetzte Fenstergröße gilt; kein neuer Sonderfall | FA-04 |
| Kennung kommt im Terminal vor, aber nicht im Dokument der gewählten Phase (etwa AK-13 einer anderen Absicht) | normaler Text, kein Verweis | FA-16 |
| Kennung steht in Michaels eigener Eingabe oder in einer Befehlszeile | ebenfalls Verweis, sofern im Dokument vorhanden; Klick tippt nichts | FA-13, FA-15 |
| Michael klickt einen Verweis, während die Sitzung arbeitet | Dokument springt; Sitzung unverändert | FA-15 |
| Gewählte Phase hat kein Dokument („Kein Dokument in dieser Phase") | keine Verweise; Aktionsleiste bleibt wie heute | FA-16 |
| Hover über einen Verweis, dessen Absatz zugeklappt ist | Hinweis zeigt den Absatz trotzdem; erst der Klick klappt auf | FA-13, FA-14 |
| Dokument ändert sich, während das Terminal offen ist (Claude schreibt es fort) | Verweise folgen dem neuen Stand des Dokuments, wie der Leser selbst | FA-13, FA-17 |
| Schritt-Start schlägt fehl (Sitzung startet nicht) | Fehler inline unter dem Knopf mit Ursache, wie heute; kein neuer Tab | FA-08 |
| Freigabe gedrückt, Sitzung zeigt einen Dialog | eingereiht (Protokoll), Dialog bleibt unberührt, Text erscheint nach dem Dialog im Terminal | FA-11 |
| Michael tippt selbst ins Terminal, bevor die erste Eingabe von „Neue Absicht" zugestellt ist | wie heute: seine Eingabe geht sofort, die gespeicherte erste Eingabe wird beim ersten Stop trotzdem zugestellt | FA-18 |
| Absicht-Sitzung endet, bevor ein Ordner entsteht | Karte zeigt wie heute „Sitzung beendet" mit Neustart-Möglichkeit; Terminal bleibt angedockt | FA-18, FA-24 |
| Handy (unter 768 px) | kein Andocken, keine Verweise; unverändert | FA-20 |
| Ein Stück Gesprächs-Code wird auch von Glocke, Protokoll oder Dialog-Prüfung genutzt | bleibt; wird im Plan benannt (Intent ER-09) | FA-22 |

## 5. Daten, fachlich

<!-- leser: agent -->

<!-- Welche fachlichen Informationen sichtbar werden, entstehen, sich ändern oder verschwinden. Ohne Tabellen- oder Feldnamen. Datenklasse laut security.md nennen. -->

| Information | Entsteht / ändert sich / verschwindet | Wer sieht sie | Datenklasse |
|---|---|---|---|
| Verlauf einer Claude-Sitzung (Terminal-Ausgabe) | unverändert; wird auf der Vorhaben-Seite angedockt gezeigt statt nur im schwebenden Terminal | Michael (Mac, Handy) | Projektinhalte des jeweiligen Projekts (deren `security.md` gilt); wie heute |
| Gesprächsbeiträge (aus Hooks und Transkript zusammengesetzt) | verschwinden aus der UI; die Transkriptdateien von Claude Code werden nicht mehr gelesen | — | intern (Transkripte liegen weiter auf dem Host, unverändert) |
| Protokoll je Vorhaben (Nachricht, Freigabe, Schritt; gesendet/eingereiht/angenommen) | unverändert | Michael | intern (Nutzerzustand der UI) |
| Erste Eingabe je gestarteter Sitzung (Text von „Neue Absicht" oder Freigabe, bis zur Zustellung) | unverändert | Michael (nur als Hinweis „wird übergeben") | intern |
| Zuordnung Sitzung ↔ Vorhaben, anhängige Absicht-Sitzungen | unverändert | Michael | intern |
| Angedockt oder schwebend | entsteht als Ableitung aus Seite und Fensterbreite; wird nicht gespeichert | Michael, je Fenster | — (flüchtig) |
| Offen oder geschlossen des Terminals, gewählter Tab, Layout-Modus | unverändert (wie heute) | Michael, je Gerät | intern; Bestand, siehe Bedenken |
| Kennungs-Verweise im Terminal | entstehen als Ableitung aus dem Dokument der gewählten Phase; verschwinden mit Phasenwechsel oder Dokument-Ende | Michael | — (flüchtig, öffentlich wie das Dokument) |
| Screenshots neben dem Mock | entstehen im Repo | öffentlich | öffentlich — aus dem Scratch-Projekt, keine Kundenprojekte, keine Host-Details |

## 6. Was der Nutzer sieht

<!-- leser: mensch -->

<!-- Nur bei UI-Änderung. Beschreibung in Worten; Mock unter `design/` (Pfad nennen), sonst „kein Mock nötig, weil …". -->

- **Vorhaben-Seite mit Sitzung (Mac):** links wie heute Kennung, Titel, Chips, Zustandszeile, Protokoll, Anmerkungs-Leiste, Dokument, Aktionsleiste; unten die Sende-Leiste bis zur Terminalkante. Rechts, gleich breit, das Terminal mit Kopf (Cloud Terminal, Neue Session, Layout, Vollbild, Schließen), Tabs (Tab der Vorhaben-Sitzung gewählt) und Verlauf mit Eingabezeile. Kennungen im Verlauf unterstrichen; Hover zeigt einen Hinweis mit Herkunft („FA-03 · spec.md §3"), Absatztext und „Klick springt hin". Mock: `design/11a-terminal-mac.png`.
- **Nach dem nächsten Schritt:** neuer Tab im Terminal, gewählt, Befehl läuft; links Knöpfe gesperrt („gesperrt, Sitzung arbeitet"), Protokoll mit Schritt-Eintrag. Mock: `design/11b-terminal-mac.png`.
- **Cmd/Ctrl+D:** Terminal weg, Dokument und Sende-Leiste volle Breite; Zustandszeile darf „Terminal ⌘D" als Hinweis tragen. Mock: `design/11c-terminal-mac.png`.
- **Neue Absicht nach „Starten":** links Karte mit Hinweis „Terminal rechts" und dem getippten Text; rechts angedocktes Terminal mit der Absicht-Sitzung, erste Frage und zugestellter Text. Mock: `design/11d-terminal-mac.png`.
- **Vorhaben ohne Sitzung, Fenster unter 1024 px, andere Seiten, Handy:** wie heute; kein Mock nötig, weil sich nichts ändert (Handy) bzw. der Zustand dem heutigen schwebenden Terminal entspricht.
- **Leerzustand des angedockten Terminals:** wie der heutige Leerzustand („Keine aktiven Sessions", „Neue Session starten") in der rechten Spalte; kein Mock nötig, weil bestehende Ansicht.
- Quelle der Mocks: `design/11-terminal-mac.html`, `design/mock.css`.

## 7. Bedenken aus den Projekt-Docs

<!-- leser: agent -->

<!-- PFLICHT. Beim Schreiben wurden product-brief, architecture, security, design gelesen. Alles, was dort reibt, steht hier — markiert, nicht entschieden.
     „Geklärt" heißt: die zuständige Rolle hat entschieden; Entscheidung steht in der Spalte. Vor der Freigabe muss jede Zeile geklärt oder als „offen, blockiert nicht, weil …" begründet sein.
     Gibt es nichts: „Keine — geprüft gegen Stand [sha]." -->

| Quelle | Bedenken | Betrifft | Geklärt? (wer, wann, wie) |
|---|---|---|---|
| architecture.md §3 Zeile „Sitzungsverlauf", ADR-0003 | Das Lesen der Transkriptdateien war eine ADR-Entscheidung (Datenhaltung); ihr Ende braucht eine Nachfolge-ADR und den Zeilen-Abbau in §3 | FA-21, FA-23 | geklärt: PO im Intent (RB-06, AK-12, OF-03) — ADR-0003 wird abgelöst, Nachfolge-ADR „Sitzung zeigen statt nachlesen"; Form und Nummer im Plan |
| architecture.md §2 Backend-Zeile (Gespräch, Lock `withMachineWrite`, Dialog-Cue-Prüfung) | Lock und Dialog-Prüfung sichern auch Review-Kanal und Freitext-Zustellung; sie dürfen mit dem Gespräch nicht fallen (NZ-06) | FA-11, FA-22 | offen — an den Plan delegiert, nicht blockierend: Import-Graph zeigt, was allein dem Gespräch gehört (Intent AN-03, AN-04, ER-09); Vorschlag: Zeile in §2 auf „Freitext-Zustellung mit Dialog-Prüfung unter dem Lock" kürzen |
| architecture.md AR-05 (Nutzerzustand nie in `localStorage`) | Offen/geschlossen, Layout-Modus und Fenster des Terminals liegen heute je Gerät im Browser (Bestand); Andocken darf keinen weiteren Browser-Zustand hinzufügen | FA-05, FA-06, §5 Zeile „Offen oder geschlossen" | offen — an den Plan delegiert, nicht blockierend: angedockt/schwebend ist eine Ableitung aus Seite und Breite, nichts wird gespeichert; Bestand als Abweichung in §10 nachtragen, nicht vergrößern (Intent NZ-01) |
| architecture.md §10 (Abweichungen nicht vergrößern) | Der Abbau verkleinert §10 nicht, aber Reste (Nachrichten des Gesprächs im WebSocket-Handler ohne Sender) wären eine neue Abweichung | FA-21 | geklärt durch FA-21: Reste zählen als Gesprächs-Code und gehen mit (EK-01) |
| security.md §6 Zeile „Datei lesen, deren Pfad von außen gemeldet wird (Transkriptpfad)" | Die Pflichtprüfung galt dem Transkript-Leser; nach dem Abbau liest niemand den gemeldeten Pfad — Zeile wird gegenstandslos, aber der Hook meldet den Pfad weiter | FA-21, FA-23 | offen — an den Plan delegiert, nicht blockierend: Vorschlag Zeile als „gilt, sobald wieder ein Leser existiert" belassen oder streichen; §2 Vertrauensannahme bleibt (Hooks tragen Glocke) |
| security.md §5 Verbotsliste (Host-Details), §1 öffentlich | Screenshots des angedockten Terminals zeigen Sitzungsinhalte und Pfade | §6, FA-01 | geklärt: Intent RB-04 — Scratch-Projekt, keine Kundenprojekte, keine Host-Details; Terminal-Kopfzeile ohne Hostnamen |
| design.md §1 Prinzip 4 (bestehende Komponenten zuerst) | Ein zweites Terminal auf der Seite wäre ein Neubau | FA-01, FA-03 | geklärt: Intent RB-07, B-01 — die vorhandene Sidebar wird angedockt |
| design.md §3 Terminal-Zeile (Buffer-Replay nicht anfassen ohne Test) | Andocken darf kein erneutes Einspielen des Verlaufs auslösen | FA-04, FA-05, FA-07 | offen — an den Plan delegiert, nicht blockierend: Spike Wirtwechsel ohne Neuaufbau (Intent AN-01, ER-10); Test gegen Verlaufsverlust bei Andocken/Lösen |
| design.md §5 („Vorhaben-Seite unter 1024 px: Dokument über dem Gespräch") | Regel entfällt; unter 1024 px gilt schwebend (OF-02) | FA-07, FA-23 | geklärt: PO 16.09. (OF-02) — Doc-Zeile im Plan anpassen |
| design.md §6 Mock-Pflicht | Neue Aufteilung, neuer Ablauf (Verweise) → Mock Pflicht; Handy unverändert | §6 | geklärt: Mocks 11a–11d vorhanden; Handy ohne Mock (keine Änderung) |
| product-brief.md §5 Kernfunktionen („Gespräch … live INT-2026-007 Stufe 1") | Zeile beschreibt danach etwas, das es nicht gibt | FA-23 | geklärt durch FA-23: Zeile auf „Terminal neben dem Dokument, Kennungs-Verweise" ändern |
| product-brief.md §7 Nicht-Ziele | keine Reibung: ein Nutzer, kein Team-Werkzeug | — | Keine |

## 8. Nicht im Umfang

<!-- leser: mensch -->

<!-- Aus NZ der intent.md plus alles, was beim Schreiben ausgeschlossen wurde. -->

- NZ-01: Kein Umbau des Terminals selbst (xterm, Tabs, Sitzungen, Buffer-Replay, Layout-Modi) über Andocken und Verweise hinaus.
- NZ-02: Kein Gespräch, keine Sprache (Mikro, Vorlesen); INT-2026-007 Stufe 2 und 3 entfallen.
- NZ-03: Kein Handy-Umbau.
- NZ-04: Kein Tippen des nächsten Schritts in eine laufende Sitzung.
- NZ-05: Keine Änderung an Vorlagen oder Workflows.
- NZ-06: Kein Abbau von Glocke, Protokoll, Freitext-Zustellung, Dialog-Prüfung, Hook-Pfad.
- NZ-07: Kein Umbau der Seite „Neue Absicht" (Textfeld, Modellwahl, Starten bleiben).
- Zusätzlich: Keine Kennungs-Verweise im schwebenden Terminal auf anderen Seiten (Liste, Projekt-Seite) — dort gibt es kein gewähltes Dokument (AN-S01).
- Zusätzlich: Kein automatisches Schließen des Terminals beim Verlassen der Vorhaben-Seite oder beim Ende der Sitzung (AN-S02, AN-S03).
- Zusätzlich: Keine Änderung an der Glocke und ihren Sprüngen; sie landen auf der Vorhaben-Seite, die dann angedockt zeigt.
- Zusätzlich: Keine Änderung an tmux-Persistenz, Sitzungsstart, Modellwahl, Arbeitskopie-Wahl.
- Zusätzlich: Kein Nachmarkieren alter Dokumente; Verweise gelten für jedes Dokument, auch ohne Leser-Marker.

## 9. Annahmen

<!-- leser: mensch -->

<!-- Vorläufige Auslegungen nach ER-00 der intent.md. Werden bei der Freigabe gesammelt bestätigt. -->

- **AN-S01:** Kennungs-Verweise gibt es nur im angedockten Terminal der Vorhaben-Seite, bezogen auf das Dokument der gewählten Phase (B-03). Im schwebenden Terminal auf anderen Seiten sind Codes normaler Text. — bestätigt am 2026-09-16 von Product Owner
- **AN-S02:** Betritt Michael eine Vorhaben-Seite mit lebender Sitzung, öffnet sich das Terminal von selbst angedockt mit dem Tab dieser Sitzung — auch wenn er es zuvor mit Cmd/Ctrl+D geschlossen hatte. Beim Verlassen der Seite schließt es sich nicht; auf Liste und Projekt-Seite ist es schwebend wie heute. — bestätigt am 2026-09-16 von Product Owner
- **AN-S03:** Endet die Sitzung des Vorhabens, bleibt das Terminal angedockt offen (Leerzustand oder übrige Tabs); es klappt nicht von selbst weg (kein Layoutsprung). — bestätigt am 2026-09-16 von Product Owner
- **AN-S04:** Der Schritt-Knopf und „Freigeben ohne Sitzung" wählen den neuen Tab auch dann, wenn Michael gerade einen anderen Tab betrachtet. — bestätigt am 2026-09-16 von Product Owner
- **AN-S05:** Der Hover-Hinweis zeigt den Absatztext auch dann, wenn der Abschnitt zugeklappt ist; erst der Klick klappt auf und springt. — bestätigt am 2026-09-16 von Product Owner
- **AN-S06:** Verweise gelten in allen sichtbaren Terminalzeilen, auch in Michaels eigenen Eingaben und in Befehlszeilen; ein Klick tippt nie. — bestätigt am 2026-09-16 von Product Owner
- **AN-S07:** Layout-Modi (Split, Quad), Vollbild und „Neue Session" bleiben im angedockten Zustand verfügbar und verhalten sich wie heute; Vollbild deckt die ganze Seite und kehrt in den angedockten Zustand zurück. — bestätigt am 2026-09-16 von Product Owner
- **AN-S08:** „Im Terminal öffnen ↗" (Karte „Neue Absicht", Handy) bleibt; am Mac wählt der Knopf den Tab im angedockten Terminal. — bestätigt am 2026-09-16 von Product Owner
- **AN-S09:** Zwei Geräte auf derselben Sitzung verhalten sich wie heute (dieselbe Sitzung, zuletzt gesetzte Fenstergröße gilt); das Andocken ändert daran nichts und löst es nicht. — bestätigt am 2026-09-16 von Product Owner
- **AN-S10:** Die Reihenfolge der Auslieferung ist: erst Andocken, Knöpfe und Verweise, dann Abbau und Docs (Intent §10); ein einzelner PR mit beidem ist erlaubt, wenn der Abbau nicht ohne das Andocken mergen kann. — bestätigt am 2026-09-16 von Product Owner

## 10. Freigabe

<!-- leser: agent -->

- [x] Jede FA hat Herkunft und Prüfung.
- [x] Jedes AK der intent.md ist von mindestens einer FA abgedeckt: AK-01 → FA-01, FA-02 · AK-02 → FA-03, FA-04 · AK-03 → FA-08 (FA-09) · AK-04 → FA-10, FA-12 · AK-05 → FA-11 · AK-06 → FA-13, FA-14, FA-16, FA-17 · AK-07 → FA-15 · AK-08 → FA-05 · AK-09 → FA-06 · AK-10 → FA-18, FA-19 · AK-11 → FA-21, FA-22 · AK-12 → FA-23 · AK-13 → FA-20 · AK-14 → FA-07 · NZ-04 → FA-09 · NZ-06 → FA-22 · NZ-07 → FA-18 · Intent §10 → FA-25 · Randfall → FA-24.
- [x] Abschnitt 7 vollständig geklärt oder begründet offen (vier Zeilen an den Plan delegiert: Lock/Dialog-Prüfung, AR-05-Bestand, security §6 Transkript-Zeile, Buffer-Replay).
- [x] Keine Technik, keine Architektur, keine Dateinamen in diesem Dokument (Pfade nur als Herkunft in Abschnitt 7 und als Mock-Verweise in Abschnitt 6).
- [x] Bei risikoklasse hoch: Tech Lead hat gelesen — entfällt (mittel).
- [x] Abgleich Mensch/Agent: Mensch-Teil gegen Agenten-Teil geprüft (2026-09-16, vor dem Vorlegen), Befund: Ablauf H nannte die Transkript-Zeile der security.md als „entfällt", §7 lässt sie offen (belassen oder streichen) — Ablauf H angeglichen; sonst keiner
- **Freigegeben:** Product Owner (Michael Sindlinger), 2026-09-16 („Alles freigegeben, Annahmen bestätigt", Chat), Commit folgt
