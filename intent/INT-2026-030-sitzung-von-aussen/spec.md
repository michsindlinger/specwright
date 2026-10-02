# Spec: Neue Sitzung von außen starten (Eingang für hey)

> **Intent:** `intent.md` (INT-2026-030, Version 1.1.0)
> **Status:** freigegeben
> **Erstellt:** 2026-10-02 · **Freigabe:** Product Owner (Michael Sindlinger), 2026-10-02
> **Gelesene Projekt-Docs:** `docs/product-brief.md`, `docs/architecture.md`, `docs/security.md`, `docs/design.md` (Stand: Commit e5d8812)

<!-- Die Spec ist FACHLICH. Sie beschreibt, was Nutzer erleben und was fachlich gelten muss.
     Nicht hinein gehören: Dateien, Komponenten, Datenbanktabellen, Bibliotheken, Architekturentscheidungen. Das ist plan.md.
     Die Projekt-Docs werden gelesen und dürfen hier nur BEDENKEN markieren (Abschnitt 7). Sie entscheiden nichts.
     Jede Anforderung verweist auf ein Ziel oder Abnahmekriterium der intent.md. Keine Anforderung ohne Herkunft. -->

## 1. Zusammenfassung

<!-- leser: mensch -->

Ein berechtigtes Programm auf Michaels Mac, zuerst hey, kann einen Satz und ein Projekt an die Web-UI schicken; die UI startet daraufhin eine neue Claude-Code-Sitzung in einer eigenen Arbeitskopie dieses Projekts, mit dem Satz als erstem Prompt, immer mit Claude Opus und mit denselben Rechten wie eine Sitzung aus der UI (Z-01, AK-01, AK-06, B-10). Der Absender bekommt sofort eine Sitzungs-ID („angelegt, startet") und kann danach abfragen, ob der Satz in der Sitzung angekommen ist oder warum nicht (Z-02, AK-02 bis AK-04). Die Sitzung erscheint ohne Klick als Tab mit lesbarem Titel im Cloud-Terminal beim Projekt (Z-03, AK-05). Jede Anfrage, die nicht vom Mac selbst mit dem richtigen Geheimnis kommt, die ungültig ist oder eine Obergrenze überschreitet, endet ohne Sitzung, und jede Anfrage steht im Protokoll (Z-04, AK-07 bis AK-12). Der Eingang ist standardmäßig aus.

## 2. Nutzer und Abläufe

<!-- leser: mensch -->

<!-- Je Ablauf: wer, Auslöser, Schritte aus Nutzersicht, Ergebnis. Jeder Ablauf deckt mindestens ein AK ab. -->

### Ablauf A: hey startet eine Sitzung (AK-01, AK-02, AK-03, AK-05, AK-06, AK-10, AK-11)

<!-- leser: mensch -->

1. Michael sagt hey „Kreis Lippe, schau dir die fehlschlagenden Tests an". hey ermittelt das Projekt und schickt an die UI auf demselben Mac: Projektordner, Satz, optional einen Titel, dazu das Geheimnis aus der lokalen Datei.
2. Die UI prüft der Reihe nach: Eingang eingeschaltet, Anfrage berechtigt, Satz gültig, Projekt bekannt, Obergrenzen frei. Alles erfüllt: Sie legt eine neue Arbeitskopie des Projekts an und startet darin eine Claude-Code-Sitzung mit Claude Opus und den Einstellungen, die ein Start aus der UI mit der Auswahl Opus hätte, egal welches Modell die UI gerade als Standard vorschlägt. Der Satz ist der erste Prompt.
3. hey bekommt sofort die Antwort „angelegt, startet" (Stufe 1) mit der Sitzungs-ID.
4. In jedem offenen Browser mit der UI erscheint im Cloud-Terminal beim Projekt ein neuer Tab, Titel etwa „schau dir die fehlschlagenden Tests…" oder der Titel, den hey mitgeschickt hat. Michael bleibt, wo er gerade ist: Kein Tab wechselt, kein Eingabefeld verliert den Fokus.
5. Die Sitzung reicht den Satz ein. Sobald die UI das über die Rückmeldung der Sitzung sieht und der Text genau dem Satz entspricht, steht die Sitzung auf „aktiv, Satz angenommen" (Stufe 2).
6. hey fragt mit der Sitzungs-ID nach und erfährt Stufe 2. Ergebnis: Claude arbeitet am Auftrag, Michael kann den Tab jederzeit öffnen, weiterschreiben oder schließen. Laufende Sitzungen hat niemand angefasst.

### Ablauf B: Anfrage wird abgewiesen (AK-07, AK-08, AK-09, AK-10, AK-12)

<!-- leser: mensch -->

1. Eine Anfrage kommt an, aber eine Bedingung fehlt: Eingang aus, falsche Herkunft, falsches oder fehlendes Geheimnis, ungültiger Satz, unbekanntes Projekt, Projekt ohne Git, Arbeitskopie scheitert, Obergrenze erreicht.
2. Die UI legt keine Sitzung und keine Arbeitskopie an und antwortet sofort mit einer Absage. Fehlt die Berechtigung oder ist der Eingang aus, lautet der Grund immer gleich allgemein („nicht berechtigt"), ohne zu verraten, welche Bedingung fehlte. In allen anderen Fällen nennt sie den Grund („Projekt unbekannt", „Satz zu lang", „schon 3 offene Sitzungen von außen" …).
3. Die Anfrage steht im Protokoll mit Zeit, Projekt, Absenderadresse, Satz (nur bei berechtigten Anfragen) und Ergebnis.
4. Ergebnis: Nichts ist gestartet; hey kann den Grund an Michael weitergeben.

### Ablauf C: Satz kommt nicht an (AK-04)

<!-- leser: mensch -->

1. Nach Stufe 1 passiert eines davon: Die Sitzung endet, bevor der Satz angekommen ist; die Sitzung meldet einen anderen Text als ersten Prompt; nach 60 Sekunden ist Stufe 2 noch nicht erreicht.
2. Die Statusabfrage liefert dann einen Fehlerzustand mit Grund („Sitzung beendet", „anderer Text angekommen", „Zeitüberschreitung") statt Stufe 2.
3. Die Sitzung bleibt, wie sie ist: Ein offener Tab bleibt offen, Michael entscheidet (NZ-06). Ergebnis: hey kann Michael sagen, dass der Auftrag nicht sicher angekommen ist.

### Ablauf D: Michael schaltet den Eingang ein und aus (AK-12)

<!-- leser: mensch -->

1. Michael setzt die Umgebungsvariable des Eingangs auf „an" und startet das Backend neu. Ohne diese Einstellung weist die UI jede Anfrage ab.
2. Beim ersten Start mit eingeschaltetem Eingang legt die UI das Geheimnis als Datei im Laufzeitordner an, lesbar nur für Michaels Benutzer. hey liest es von dort.
3. Ausschalten: Variable entfernen oder auf einen anderen Wert setzen, Backend neu starten. Neues Geheimnis: Datei löschen, Backend neu starten.
4. Ergebnis: Der Eingang ist nur aktiv, wenn Michael ihn ausdrücklich will; auf dem Cloud-Host bleibt er auch dann aus.

### Ablauf E: Michael schließt eine Sitzung von außen (AK-09)

<!-- leser: mensch -->

1. Michael schließt den Tab wie jeden anderen.
2. Die Sitzung zählt nicht mehr für die Obergrenze von 3 offenen Sitzungen.
3. Die Arbeitskopie wird behandelt wie jede Arbeitskopie einer UI-Sitzung: ohne Änderungen wird sie entfernt, mit ungesicherten Änderungen bleibt sie liegen.
4. Ergebnis: Reine Fragen hinterlassen keine Arbeitskopie; Arbeit geht nicht verloren.

## 3. Fachliche Anforderungen

<!-- leser: mensch -->

<!-- Eine Zeile = eine prüfbare Aussage. Modalverben groß. Herkunft = AK/Z/NZ aus intent.md oder „neu (Grund)". -->

| ID | Anforderung | Herkunft | Prüfung |
|---|---|---|---|
| FA-01 | Wenn eine Anfrage berechtigt (B-01) ist, der Eingang eingeschaltet ist, der Satz gültig (B-03) ist, das Projekt bekannt (B-02) ist und die Obergrenzen (B-08) frei sind, MUSS das System eine neue Arbeitskopie des Projekts anlegen und darin eine neue Claude-Code-Sitzung starten, deren erster Prompt der bereinigte Satz ist. | AK-01, Z-01 | Test |
| FA-02 | Die Sitzung MUSS mit Claude Opus beim Anbieter Anthropic starten, mit den Einstellungen und Startschaltern, die ein Start aus der UI für dieses Projekt mit der Auswahl Opus hätte, unabhängig von der Standardwahl der UI; der Absender DARF NICHT Modell, Schalter, Arbeitsverzeichnis oder Befehl wählen können. | AK-01, AK-06, NZ-01, B-07, B-10 | Test |
| FA-23 | Falls Claude Opus in der Modellliste der UI nicht verfügbar ist, dann MUSS das System ohne Sitzung absagen und den Grund nennen („Modell Opus nicht verfügbar"); es DARF NICHT auf ein anderes Modell ausweichen. | AK-01, B-10 | Test |
| FA-03 | Das System MUSS in der Antwort auf eine angenommene Anfrage Stufe 1 und die Sitzungs-ID melden. | AK-02, B-04 | Test |
| FA-04 | Wenn der erste eingereichte Prompt, den die neue Sitzung meldet, mit dem bereinigten Satz zeichengleich ist, MUSS das System für diese Sitzungs-ID Stufe 2 festhalten. | AK-03, B-04 | Test |
| FA-05 | Falls die Sitzung vor Stufe 2 endet, ihr erster gemeldeter Prompt vom bereinigten Satz abweicht oder Stufe 2 nicht binnen 60 Sekunden ab Stufe 1 eintritt, dann MUSS das System für diese Sitzungs-ID einen Fehlerzustand mit Grund festhalten; ein späteres Eintreffen des Satzes ändert den Fehlerzustand nicht. | AK-04 | Test |
| FA-06 | Die Statusabfrage mit einer Sitzungs-ID MUSS genau einen Zustand liefern: „startet" (Stufe 1), „aktiv" (Stufe 2), „Fehler" mit Grund oder „unbekannt"; „unbekannt" gilt für jede ID, die keine von außen gestartete Sitzung der letzten 24 Stunden ist. | AK-02, AK-03, AK-04, OF-03 | Test |
| FA-07 | Die Statusabfrage MUSS dieselbe Berechtigung (B-01) und denselben Abschalter verlangen wie die Anfrage; sonst MUSS sie wie AK-07 mit dem allgemeinen Grund absagen. | AK-07, AK-12, Z-04 | Test |
| FA-08 | Wenn eine Sitzung nach FA-01 angelegt ist, MUSS sie in jedem verbundenen UI-Client ohne Klick und ohne Neuladen als Tab im Cloud-Terminal beim Projekt erscheinen; ein Client, der sich später verbindet, MUSS sie ebenfalls als Tab zeigen. | AK-05, Z-03 | Test, Stichprobe |
| FA-09 | Das Erscheinen des Tabs DARF NICHT den aktiven Tab, das aktive Projekt, die Seite oder den Fokus eines Eingabefelds in irgendeinem Client ändern. | AK-05 | Test, Stichprobe |
| FA-10 | Falls das Projekt in der UI nicht offen ist, MUSS das System es mit dem neuen Tab öffnen, ohne es zum aktiven Projekt zu machen. | AK-05, OF-05 | Test |
| FA-11 | Der Tab-Titel MUSS B-09 folgen: mitgeschickter Titel, bereinigt wie der Satz, 1 bis 40 Zeichen; ohne Titel die ersten Wörter des bereinigten Satzes, an einer Wortgrenze auf höchstens 40 Zeichen gekürzt, bei Kürzung mit „…" am Ende. Michael MUSS ihn umbenennen können wie jeden Tab. | AK-05, B-09 | Test |
| FA-12 | Falls eine Anfrage nicht berechtigt ist oder der Eingang aus ist, dann MUSS das System sie ohne Sitzung und ohne Arbeitskopie abweisen, mit einem Grund, der für jede fehlende Bedingung gleich lautet. | AK-07, AK-12 | Test |
| FA-13 | Falls das Projekt unbekannt ist, kein Git-Repository ist oder keine Arbeitskopie angelegt werden kann, dann MUSS das System ohne Sitzung absagen und den Grund nennen; eine halb angelegte Arbeitskopie MUSS es wieder entfernen. | AK-08 | Test |
| FA-14 | Falls der Satz oder der mitgeschickte Titel nach B-03/B-09 ungültig ist (leer, zu lang, nach AN-S06 verboten), dann MUSS das System ohne Sitzung absagen und den Grund nennen; es DARF NICHT kürzen. | AK-01, B-03, B-09 | Test |
| FA-15 | Falls bereits 3 von außen gestartete Sitzungen offen sind oder in den letzten 60 Sekunden 5 Anfragen Stufe 1 erhalten haben, dann MUSS das System ohne Sitzung absagen und den Grund nennen. | AK-09, B-08 | Test |
| FA-16 | Die Herkunft „von außen" einer Sitzung MUSS vom System selbst festgehalten werden, nie aus Angaben eines Browsers, und MUSS einen Neustart des Backends überdauern, solange die Sitzung offen ist. | AK-09, B-05, B-08, RB-07 | Test |
| FA-17 | Das System MUSS jede Anfrage und jede Statusabfrage protokollieren: Zeitpunkt, Art, Projekt, Absenderadresse, Ergebnis mit Grund; bei berechtigten Anfragen zusätzlich den Satz und die Sitzungs-ID, bei unberechtigten keinen Satz. | AK-10 | Test |
| FA-18 | Solange eine Sitzung nach FA-01 gestartet wird, DARF das System NICHT in eine andere Sitzung schreiben, keine andere Sitzung schließen und den Hauptcheckout des Projekts nicht verändern. | AK-11, B-06, RB-05 | Test |
| FA-19 | Wenn die Umgebungsvariable des Eingangs nicht genau auf den Einschaltwert gesetzt ist oder das Backend nicht auf macOS läuft, MUSS das System jede Anfrage und Statusabfrage nach FA-12 abweisen. | AK-12, B-01 (a), NZ-04 | Test |
| FA-20 | Der bereinigte Satz MUSS als ein einziger Prompt übergeben werden; er DARF NIE als Startschalter, als Tastenfolge oder als Teil eines anderen Befehls gelesen werden, auch nicht, wenn er mit „-" beginnt oder Anführungszeichen enthält. | B-03, AK-06 | Test |
| FA-21 | Der Satztext DARF NUR im Eingangsprotokoll und in der Sitzung selbst stehen; einzige Ausnahme ist der aus ihm gebildete Tab-Titel (siehe AN-S09). | RB-04 | Test, Review |
| FA-22 | Wenn eine von außen gestartete Sitzung geschlossen wird, MUSS das System ihre Arbeitskopie behandeln wie die jeder UI-Sitzung (ohne Änderungen entfernen, mit ungesicherten Änderungen behalten) und sie nicht mehr für B-08 zählen. | B-06, B-08, AK-09 | Test |

## 4. Fehler- und Randfälle

<!-- leser: mensch -->

| Fall | Erwartetes Verhalten | Herkunft |
|---|---|---|
| Kein Browser mit der UI offen | Sitzung startet trotzdem; der Tab erscheint, sobald ein Client sich verbindet. Stufe 2 hängt nicht vom Browser ab. | FA-08 |
| Anfrage über Tailscale, Cloudflare-Tunnel oder LAN (kommt als 127.0.0.1 an, trägt aber Weiterleitungs-Header) | Abgewiesen mit „nicht berechtigt"; protokolliert ohne Satz. | AK-07, B-01 (d), EK-03 |
| Anfrage mit fremdem `Host`-Kopf (etwa aus einer Webseite im Browser) | Abgewiesen mit „nicht berechtigt". | AK-07, B-01 (c), EK-03 |
| Geheimnis-Datei fehlt oder ist leer, obwohl der Eingang an ist | Backend legt beim Start ein neues an; bis dahin jede Anfrage „nicht berechtigt". | FA-12, AN-S02 |
| Satz enthält Zeilenumbrüche | Sie werden zu einem Leerzeichen; der Satz wird eine Zeile (AN-S05). Stufe 2 vergleicht mit diesem Ergebnis. | B-03, AK-03 |
| Satz beginnt mit „/" (etwa „/clear") | Abgewiesen mit Grund „Satz darf nicht mit / beginnen" (AN-S06). | NZ-01, FA-14 |
| Satz beginnt mit „-" | Wird als Prompt übergeben, nie als Schalter. | FA-20 |
| Satz länger als 500 Zeichen nach Bereinigung | Abgewiesen mit „Satz zu lang (max. 500)"; nichts gekürzt. | B-03, FA-14 |
| Projekt als Pfad einer Arbeitskopie statt des Hauptordners | „Projekt unbekannt" (AN-S07). | B-02, AK-08 |
| Projekt ist bekannt, aber kein Git-Repository oder Arbeitskopien sind für das Projekt abgeschaltet | Absage mit Grund „Keine Arbeitskopie möglich: …"; kein Start im Hauptcheckout. | AK-08, B-06 |
| Zwei Anfragen fast gleichzeitig, eine davon wäre die vierte offene Sitzung | Genau eine wird angenommen, die andere sagt „Obergrenze erreicht" ab; nie 4 offene. | AK-09, B-08 |
| Sechste Anfrage binnen 60 s, obwohl Sitzungen schon geschlossen wurden | Absage „zu viele Anfragen"; gezählt werden Anfragen mit Stufe 1, nicht offene Sitzungen. | AK-09, B-08 |
| Claude Code zeigt beim Start einen Vertrauensdialog für den neuen Ordner | Der Satz kommt dann nicht als erster Prompt an; nach 60 s Fehlerzustand „Zeitüberschreitung". Ob das eintritt, prüft der Plan (intent AN-02). | AK-04, intent AN-02 |
| Backend startet neu zwischen Stufe 1 und Stufe 2 | Sitzung läuft im Hintergrund weiter; Herkunft bleibt (FA-16). Statusabfrage liefert danach einen Zustand nach FA-06, nie stillschweigend „unbekannt" für eine offene Sitzung der letzten 24 h (Plan entscheidet, ob „aktiv" nachgeholt oder „Fehler: Neustart" gemeldet wird). | AK-04, FA-06, FA-16 |
| Michael tippt im neuen Tab, bevor der Satz angekommen ist | Erster gemeldeter Prompt weicht ab → Fehlerzustand „anderer Text angekommen"; die Sitzung bleibt. | AK-04 |
| Statusabfrage mit ID einer Sitzung, die Michael in der UI gestartet hat | „unbekannt"; der Eingang verrät nichts über andere Sitzungen. | FA-06, Z-04 |
| Protokoll wächst durch viele unberechtigte Anfragen | Protokoll bleibt begrenzt (Plan legt Größe oder Frist fest); keine Sitzung, kein Absturz. | AK-10, Bedenken §7 |
| Opus fehlt in der Modellliste der UI (etwa umbenannt oder entfernt) | Absage „Modell Opus nicht verfügbar"; kein Ausweichen auf die Standardwahl. | FA-23, B-10 |
| Backend läuft auf dem Cloud-Host mit gesetzter Variable | Jede Anfrage „nicht berechtigt". | NZ-04, B-01 (a), FA-19 |

## 5. Daten, fachlich

<!-- leser: agent -->

<!-- Welche fachlichen Informationen sichtbar werden, entstehen, sich ändern oder verschwinden. Ohne Tabellen- oder Feldnamen. Datenklasse laut security.md nennen. -->

| Information | Entsteht / ändert sich / verschwindet | Wer sieht sie | Datenklasse |
|---|---|---|---|
| Geheimnis des Eingangs | entsteht beim ersten Backend-Start mit eingeschaltetem Eingang, falls nicht vorhanden; ändert sich nur durch Löschen und Neustart; verschwindet nie von selbst | Backend, hey (liest die Datei), Michael | vertraulich (Zugang); nie Repo, nie Log, nie Antwort, nie Broadcast |
| Satz (bereinigt) | entsteht mit der Anfrage; steht als erster Prompt in der Sitzung und im Eingangsprotokoll | Michael (Sitzung, Protokoll), Absender (eigene Eingabe) | intern (Projektinhalt) |
| Tab-Titel | entsteht mit der Sitzung (mitgeschickt oder aus dem Satz gebildet); ändert sich, wenn Michael umbenennt; verschwindet mit dem Tab | alle verbundenen UI-Clients | intern (Teil des Satzes, siehe AN-S09) |
| Herkunft „von außen" einer Sitzung | entsteht mit der Sitzung; überdauert Neustart; verschwindet beim Schließen | nur Backend (für Obergrenzen und Statusabfrage); keine Anzeige | intern |
| Zustand der Rückmeldung (startet, aktiv, Fehler mit Grund) je Sitzungs-ID | entsteht mit Stufe 1; ändert sich einmal zu aktiv oder Fehler; verschwindet 24 h nach Stufe 1, unabhängig davon, ob die Sitzung noch offen ist (AN-S03) | Absender über die Statusabfrage, Michael über das Protokoll | intern |
| Anfragezähler für die gleitenden 60 s | entsteht mit jeder Stufe 1; verschwindet nach 60 s | nur Backend | intern |
| Eingangsprotokoll (Zeit, Art, Projekt, Absenderadresse, Satz bei berechtigten Anfragen, Ergebnis, Sitzungs-ID) | wächst mit jeder Anfrage und Statusabfrage; Aufbewahrung 30 Tage, Aufräumen beim Backend-Start (AN-S08) | Michael | intern; Datei nur für Michaels Benutzer lesbar |
| Arbeitskopie der Sitzung | entsteht vor dem Start; verschwindet beim Schließen, wenn ohne Änderungen; sonst bleibt sie | Michael, die Sitzung | wie das Projekt |
| Ordnerpfad des Projekts in der Anfrage | nur zur Prüfung gegen bekannte Projekte; in Antworten erscheint nie ein Host-Pfad, nur Projektname und Zweig-Label | Backend, Protokoll | intern |

## 6. Was der Nutzer sieht

<!-- leser: mensch -->

<!-- Nur bei UI-Änderung. Beschreibung in Worten; Mock unter `design/` (Pfad nennen), sonst „kein Mock nötig, weil …". -->

- **Cloud-Terminal:** ein neuer Tab beim Projekt, aussehend wie jeder andere Claude-Tab mit Titel nach B-09. Keine eigene Markierung „von außen", kein Übernahme-Knopf (B-05). Kein Fokuswechsel; ein geschlossenes Terminal bleibt geschlossen, der Tab liegt beim nächsten Öffnen bereit.
- **Projektliste:** Ist das Projekt nicht offen, steht es danach in den offenen Projekten; das aktive Projekt bleibt dasselbe.
- **Glocke:** Die Sitzung meldet „fertig" oder „wartet" wie jede andere Claude-Sitzung; keine neue Glocken-Art.
- **Einstellungen:** keine Änderung. Das Geheimnis wird in der UI nicht angezeigt (AN-S02).
- **hey (außerhalb der UI):** Zusage mit Sitzungs-ID oder Absage mit Grund; Statusabfrage mit „startet", „aktiv", „Fehler: Grund" oder „unbekannt". Die Texte an hey sind kurze deutsche Sätze.
- **Mock:** kein Mock nötig, weil keine neue Seite, kein neues Bedienelement und keine geänderte Navigation entsteht — der Tab ist ein bestehendes Element (`design.md` §6). Nachweis im PR: Screenshot des Cloud-Terminals mit neuem Tab neben einem bestehenden, aktiven Tab (AN-S10).

## 7. Bedenken aus den Projekt-Docs

<!-- leser: agent -->

<!-- PFLICHT. Beim Schreiben wurden product-brief, architecture, security, design gelesen. Alles, was dort reibt, steht hier — markiert, nicht entschieden.
     „Geklärt" heißt: die zuständige Rolle hat entschieden; Entscheidung steht in der Spalte. Vor der Freigabe muss jede Zeile geklärt oder als „offen, blockiert nicht, weil …" begründet sein.
     Gibt es nichts: „Keine — geprüft gegen Stand [sha]." -->

| Quelle | Bedenken | Betrifft | Geklärt? (wer, wann, wie) |
|---|---|---|---|
| security.md §2 Zugriffsmodell | Bisher gilt „Zugriff nur netzseitig begrenzt, keine Anmeldung"; der Eingang ist die erste Schnittstelle der UI mit eigenem Geheimnis und die erste, die ein Programm statt eines Browsers bedient. Die vorhandene Lokal-Prüfung des Anrufs verlangt einen Browser-`Origin` (`ui/src/server/utils/lokal-verbindung.ts:49-70`) und passt nicht. security.md §2 braucht einen eigenen Absatz „Eingang von außen" mit allen Schichten aus B-01. | FA-07, FA-12, FA-19 | offen — an den Plan delegiert, nicht blockierend: Vorschlag eigene Prüfung für Programme (Herkunft, `Host`, Weiterleitungs-Header, Geheimnis, macOS) neben der Browser-Prüfung, gemeinsame Teile wiederverwenden; ADR nach RB-08 |
| security.md §6 Zeile 1 | Von außen erreichbarer Endpunkt: Zugriffsbegrenzung, Eingabevalidierung, Datenklasse der Antwort nennen. Antworten enthalten Sitzungs-ID, Zustand, Grund — intern; nie Host-Pfade. | FA-03, FA-06, FA-12 | offen — an den Plan delegiert, nicht blockierend: Plan nennt alle drei je Endpunkt |
| security.md §3 Geheimnisse | Neues Geheimnis (Eingang) fehlt in der Tabelle: Wofür, Liegt in, Kommt über, Rotation. Vergleich mit dem Geheimnis darf die Länge oder Übereinstimmung nicht über die Antwortzeit verraten. | FA-12, §5 | offen — an den Plan delegiert, nicht blockierend: Zeile in §3 in derselben PR; Vergleich in konstanter Zeit |
| security.md §4 T-06 | „Web-UI führt beliebige Befehle über Cloud-Terminal aus" ist offen; der Eingang erweitert die Angriffsfläche um einen Weg ohne Browser, und Sitzungen laufen mit Vollzugriff (B-07). | FA-01, FA-02 | geklärt — PO, 2026-10-02, intent B-07: Risiko bewusst angenommen, abgefedert durch B-01, B-06, B-08; Plan ergänzt eine Bedrohungszeile in §4 |
| security.md §1 Datenklassen | Neue Datenobjekte: Geheimnis (vertraulich), Eingangsprotokoll mit Satztext (intern), Zustand der Rückmeldung (intern), Herkunftsmerkmal (intern) — mit Speicherort und Löschfrist eintragen. | §5, FA-16, FA-17 | offen — an den Plan delegiert, nicht blockierend: Zeilen in §1 in derselben PR |
| security.md §1 / RB-04 gegen B-09 | Der Tab-Titel wird bei fehlendem Titel aus dem Satz gebildet und als Tab-Name an alle Clients verteilt; RB-04 verbietet Satztext in Broadcasts. Wortlaut widerspricht sich (ER-05). | FA-11, FA-21 | geklärt — PO, 2026-10-02, AN-S09: Titel ist die einzige Ausnahme von RB-04, wie der Arbeitstitel in INT-2026-022 |
| architecture.md §3 Datenbesitz | Neue Daten im UI-Backend: Herkunftsmerkmal je Sitzung (muss Neustart überleben, FA-16), Zustand der Rückmeldung, Zähler, Protokoll, Geheimnis. Zeilen in §3 nötig; Herkunft gehört zur Sitzung (Registry), nicht in den Browser. | FA-16, FA-06 | offen — an den Plan delegiert, nicht blockierend: Plan wählt Speicherort und ergänzt §3 |
| architecture.md §2 / RB-05 | Arbeitskopie „wie beim Absicht-Start" (INT-2026-022): drei Schichten mit eigenem Fehlercode (Form, Voraussetzung, letzte Sperre). Der Eingang muss dieselbe Voraussetzungsprüfung nutzen, damit die Absage-Gründe aus FA-13 dieselben sind wie in der UI. | FA-13 | offen — an den Plan delegiert, nicht blockierend: denselben Prüfweg wiederverwenden |
| architecture.md AR-03 | Arbeitskopien nur unter dem Hauptrepo-Lock anlegen (RB-06); gleichzeitige Anfragen (Randfall „zwei Anfragen fast gleichzeitig") dürfen die Obergrenze nicht überholen. | FA-01, FA-15 | offen — an den Plan delegiert, nicht blockierend: Zählung und Reservierung vor dem Anlegen, atomar |
| architecture.md AR-05 | Tab-Titel, das Öffnen des Projekts und der Anstoß, den Tab zu zeigen, kommen aus dem Backend (RB-07). Heute übernimmt ein Client einen fremd erzeugten Tab nur, wenn das Projekt bei ihm schon offen ist (`ui/frontend/src/app.ts:1704`); FA-10 verlangt das Öffnen. Offene Projekte sind gemeinsamer Zustand im Backend. | FA-08, FA-10 | offen — an den Plan delegiert, nicht blockierend: Backend öffnet das Projekt im gemeinsamen Arbeitsbereich und verteilt Tab und Titel; Client setzt bei fremd erzeugten Tabs nie den Fokus |
| architecture.md §10 (Terminal-Layout in `localStorage`) | Bekannte Abweichung: Pane-Layout liegt im Browser. Der neue Tab darf diese Abweichung nicht vergrößern (kein neues Layout-Merkmal im Browser). | FA-08, FA-09 | offen — an den Plan delegiert, nicht blockierend: Tab nur in die Tab-Liste, kein Eingriff ins Layout |
| architecture.md §5 Externe Systeme | hey ist ein neuer Aufrufer der UI (lokal, kein Fremddienst). Ausfallverhalten: fällt die UI aus, bekommt hey keine Antwort. | Z-02 | offen — an den Plan delegiert, nicht blockierend: Zeile in §5 („hey, lokal") oder bewusst weglassen mit Begründung |
| architecture.md §2 / intent B-02 | Der Beleg in B-02 (`cloud-terminal:targets`, `ui/src/server/websocket.ts:589`) listet die Arbeitskopien **eines** Projekts, nicht die bekannten Projekte. Die bekannten Projekte stehen im gemeinsamen Arbeitsbereich (offene und zuletzt geöffnete, `ui/src/server/services/workspace-state.ts:54`). | FA-01, FA-13 | geklärt — PO, 2026-10-02, AN-S07: Hauptordner offener oder zuletzt geöffneter Projekte; Plan nutzt den Arbeitsbereich als Liste |
| CLAUDE.md, ADR-Pflicht / RB-08 | Neue Schnittstelle mit eigener Absicherung = Auth der UI → ADR. | ganzes Vorhaben | offen — an den Plan delegiert, nicht blockierend: ADR-0007 im Plan |
| CLAUDE.md, Fehlerliste (Trust-Dialog) / intent AN-02 | Neue Arbeitskopie kann den Vertrauensdialog auslösen; Enter steht dort auf „No, exit". Der Eingang tippt nichts (FA-20), also endet die Sitzung nicht, aber Stufe 2 bliebe aus. | FA-04, FA-05 | offen — an den Plan delegiert, nicht blockierend: E2E-Lauf vor `/build` (intent AN-01, AN-02); ggf. Ordner vorab als vertraut eintragen wie bei bestehenden UI-Arbeitskopien |
| design.md §1 Prinzip 3, §4 Glocke | Gleiche Sicht auf jedem Gerät: der Tab muss auch am Handy erscheinen; Glocke wie bei jeder Sitzung. | FA-08, §6 | geklärt — durch FA-08 abgedeckt, keine neue Glocken-Art |
| design.md §6 Mock-Pflicht | Neuer Ablauf mit UI-Wirkung? Nur ein bestehendes Element (Tab) erscheint. | §6 | geklärt — PO, 2026-10-02, AN-S10: kein Mock, Screenshot im PR |
| product-brief.md §7 Nicht-Ziele | „Kein Werkzeug für Teams": der Eingang ist für Programme desselben Nutzers auf demselben Mac, kein Mehrnutzerzugang. | Z-04 | geklärt — kein Widerspruch, B-01 begrenzt auf denselben Mac |
| product-brief.md §8 Domänenbegriffe | Neuer Begriff „Sitzung von außen" / „Eingang" fehlt; Abgrenzung zu „Begonnene Absicht" (hat einen Arbeitstitel in der Übersicht, eine Sitzung von außen nicht). | §2 | offen — an den Plan delegiert, nicht blockierend: Zeile in §8 |
| product-brief.md §9 Umgebungen | Cloud-Droplet bekommt keinen Eingang (NZ-04). | FA-19 | geklärt — durch B-01 (a) und FA-19 |

## 8. Nicht im Umfang

<!-- leser: mensch -->

<!-- Aus NZ der intent.md plus alles, was beim Schreiben ausgeschlossen wurde. -->

- NZ-01: Keine Befehlsauswahl durch den Absender; der Satz geht als Prompt hinein, Claude entscheidet.
- NZ-02: Keine Zustellung in laufende oder wartende Sitzungen, keine Warteschlange.
- NZ-03: Keine Änderung an hey.
- NZ-04: Kein Eingang auf dem Cloud-Host, über Tailscale, LAN oder Handy.
- NZ-05: Keine Änderung der Rechte von Sitzungen, die Michael in der UI startet.
- NZ-06: Kein automatisches Schließen ungeöffneter Sitzungen, auch nicht nach Fehlerzustand.
- Keine Zuordnung zu einem Vorhaben beim Start und kein Eintrag „Absicht · entsteht" in der Übersicht. Tippt Claude in der Sitzung einen Phasen-Befehl, gilt die bestehende Zuordnungsregel wie für jede andere Sitzung.
- Keine Anzeige oder Neuerzeugung des Geheimnisses in der UI.
- Keine Benachrichtigung an hey, wenn Stufe 2 eintritt; hey fragt ab.
- Keine Änderung an der Glocke, am Anrufmodus oder an „Neue Absicht".

## 9. Annahmen

<!-- leser: mensch -->

<!-- Vorläufige Auslegungen nach ER-00 der intent.md. Werden bei der Freigabe gesammelt bestätigt. -->

- **AN-S01:** OF-01 Schnittstelle: Anfrage und Statusabfrage über HTTP auf dem Backend-Port (Anfrage schickt, Statusabfrage liest), wie im Intent vorgeschlagen; die genaue Form legt der Plan fest. — bestätigt am 2026-10-02 von Product Owner
- **AN-S02:** OF-02 Geheimnis: Datei im Laufzeitordner, nur für Michaels Benutzer lesbar, beim ersten Backend-Start mit eingeschaltetem Eingang erzeugt; keine Anzeige in der UI; neues Geheimnis = Datei löschen und Backend neu starten. hey liest die Datei selbst (intent AN-03). — bestätigt am 2026-10-02 von Product Owner
- **AN-S03:** OF-03 Aufbewahrung des Zustands: abrufbar 24 Stunden ab Stufe 1, auch wenn die Sitzung vorher geschlossen wurde; danach „unbekannt". Engste Lesart von „solange offen, höchstens 24 h" würde den Fehlergrund „Sitzung beendet" sofort unabrufbar machen und AK-04 unterlaufen. — bestätigt am 2026-10-02 von Product Owner
- **AN-S04:** OF-04 Arbeitskopie: Ausgangsstand und Namensschema wie beim Absicht-Start (INT-2026-022); Aufräumen beim Schließen wie bei jeder UI-Arbeitskopie (Ablauf E). Damit hinterlassen reine Fragen keine Arbeitskopie (intent AN-04). — bestätigt am 2026-10-02 von Product Owner
- **AN-S05:** B-03 Bereinigung: Zeilenumbrüche und Tabulatoren werden zu einem Leerzeichen, mehrere Leerzeichen bleiben, alle anderen Steuerzeichen und Escape-Sequenzen werden entfernt. Wörtliches „Entfernen" würde Wörter über Zeilengrenzen zusammenkleben. — bestätigt am 2026-10-02 von Product Owner
- **AN-S06:** Satz, der nach Bereinigung mit „/" beginnt, wird abgewiesen. Claude Code liest ihn sonst als Slash-Befehl (etwa „/clear", „/logout"); das wäre eine Befehlsauswahl durch den Absender (NZ-01). — bestätigt am 2026-10-02 von Product Owner
- **AN-S07:** B-02 Bekanntes Projekt: Hauptordner eines Projekts, das in der UI offen oder unter „zuletzt geöffnet" steht. Der Pfad einer Arbeitskopie gilt als unbekannt. Der Beleg im Intent (`cloud-terminal:targets`) listet Arbeitskopien, nicht Projekte. — bestätigt am 2026-10-02 von Product Owner
- **AN-S08:** Eingangsprotokoll: 30 Tage aufbewahrt, Aufräumen beim Backend-Start, nur für Michaels Benutzer lesbar; Statusabfragen werden mitprotokolliert (ohne Satz). — bestätigt am 2026-10-02 von Product Owner
- **AN-S09:** Tab-Titel aus dem Satz (B-09) ist die einzige Ausnahme von RB-04 „Satztext nie in Broadcasts", wie der Arbeitstitel in INT-2026-022. Wortlaut von B-09 und RB-04 widerspricht sich (ER-05), daher Entscheidung durch den PO. — bestätigt am 2026-10-02 von Product Owner
- **AN-S10:** Kein Mock, Screenshot im PR genügt (Begründung §6). — bestätigt am 2026-10-02 von Product Owner
- **AN-S11:** Name und Wert des Abschalters: `SPECWRIGHT_EINGANG=on`; jeder andere Wert und das Fehlen der Variable bedeuten aus. — bestätigt am 2026-10-02 von Product Owner
- **AN-S12:** Ein mitgeschickter Titel über 40 Zeichen wird abgewiesen, nicht gekürzt, analog zu B-03 (FA-14). — bestätigt am 2026-10-02 von Product Owner

## 10. Freigabe

<!-- leser: agent -->

AK→FA-Zuordnung: AK-01 → FA-01, FA-02, FA-14, FA-23 · AK-02 → FA-03, FA-06 · AK-03 → FA-04, FA-06 · AK-04 → FA-05, FA-06 · AK-05 → FA-08, FA-09, FA-10, FA-11 · AK-06 → FA-02, FA-20 · AK-07 → FA-07, FA-12 · AK-08 → FA-13 · AK-09 → FA-15, FA-16, FA-22 · AK-10 → FA-17 · AK-11 → FA-18 · AK-12 → FA-07, FA-12, FA-19.

- [x] Jede FA hat Herkunft und Prüfung.
- [x] Jedes AK der intent.md ist von mindestens einer FA abgedeckt.
- [x] Abschnitt 7 vollständig geklärt oder begründet offen (offene Zeilen an den Plan delegiert, nicht blockierend).
- [x] Keine Technik, keine Architektur, keine Dateinamen in diesem Dokument (Pfade nur als Herkunft in Abschnitt 7; Umgebungsvariable nach intent §10 hier benannt).
- [x] Bei risikoklasse hoch: Tech Lead hat gelesen (Michael Sindlinger, 2026-10-02).
- [x] Abgleich Mensch/Agent: Mensch-Teil gegen Agenten-Teil geprüft (2026-10-02), Befund: §5 Aufbewahrung des Zustands widersprach AN-S03, §6 versprach ein nicht belegtes Zweig-Label am Tab — beide vor der Vorlage behoben; Änderung PO (Modell Opus, intent 1.1.0) in §1, §2, FA-02, FA-23, §4 nachgezogen.
- **Freigegeben:** Product Owner (Michael Sindlinger), 2026-10-02, Commit siehe `spec(INT-2026-030)` in der Git-Historie
