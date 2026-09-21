# Spec: UI: Vorhaben per Knopf abschließen — deterministisch, ohne Sitzung

> **Intent:** `intent.md` (INT-2026-024, Version 1.0.0)
> **Status:** freigegeben
> **Erstellt:** 2026-09-21 · **Freigabe:** Product Owner (Michael Sindlinger), 2026-09-21
> **Gelesene Projekt-Docs:** `docs/product-brief.md`, `docs/architecture.md`, `docs/security.md`, `docs/design.md` (Stand: Commit d831f6d)

<!-- Die Spec ist FACHLICH. Sie beschreibt, was Nutzer erleben und was fachlich gelten muss.
     Nicht hinein gehören: Dateien, Komponenten, Datenbanktabellen, Bibliotheken, Architekturentscheidungen. Das ist plan.md.
     Die Projekt-Docs werden gelesen und dürfen hier nur BEDENKEN markieren (Abschnitt 7). Sie entscheiden nichts.
     Jede Anforderung verweist auf ein Ziel oder Abnahmekriterium der intent.md. Keine Anforderung ohne Herkunft. -->

## 1. Zusammenfassung

<!-- leser: mensch -->

Nach dem Umbau schließt Michael ein fertiges Vorhaben auf seiner Vorhaben-Seite mit dem Knopf „Abschließen" ab: Die UI nennt vorher, was sie tut, und schreibt nach der Bestätigung ohne Sprachmodell immer dieselben drei Kopffelder und dieselbe Protokollzeile in die Absichtsdatei, bringt das als einen Commit auf einem eigenen Zweig ins Repo und eröffnet den Pull Request, den Michael wie heute merged (Z-01, Z-02, Z-04; AK-01 bis AK-05). Die Zeile steht sofort danach unter „Umgesetzt" mit dem Hinweis auf den Abschluss-PR; „Abschluss zurücknehmen" holt sie zurück, solange die Datei im Hauptcheckout noch nicht `umgesetzt` trägt (Z-03; AK-06, AK-11). Scheitert ein Schritt, nennt die UI den Grund und hinterlässt nichts Halbes (AK-09). Unabhängig vom Knopf lernt die Übersicht zwei Regeln: Trägt die Absicht im Hauptcheckout `umgesetzt`, gewinnt diese Fassung gegen ältere Arbeitskopien, und eine bloß wartende Sitzung hält ein umgesetztes Vorhaben nicht mehr in „Wartet auf dich" (AK-07, AK-08). Der Bau-Workflow verweist am Ende auf den Knopf statt den Abschluss selbst zu schreiben (RB-08).

## 2. Nutzer und Abläufe

<!-- leser: mensch -->

<!-- Je Ablauf: wer, Auslöser, Schritte aus Nutzersicht, Ergebnis. Jeder Ablauf deckt mindestens ein AK ab. -->

### Ablauf A: Ein gemergtes Vorhaben abschließen (AK-01, AK-02, AK-03, AK-04, AK-05, AK-06)

<!-- leser: mensch -->

1. Michael hat den Bau-PR eines Vorhabens gemergt. In der Übersicht steht die Zeile unter „Läuft" mit Phase „PR" und „ruht · Sitzung beendet". Er öffnet die Vorhaben-Seite.
2. In der Aktionen-Zeile der Seite steht neben den bekannten Knöpfen der Knopf „Abschließen". Er steht dort in jeder Phase außer „Absicht" und „Umgesetzt".
3. Michael klickt „Abschließen". Ein Bestätigungsdialog nennt, was gleich passiert: Kennung und Titel des Vorhabens; die Absichtsdatei im Ordner des Vorhabens; den Stand, den die UI ändern wird (Version und Status der Absicht, wie sie auf dem entfernten Hauptzweig steht); die neue Version; die Protokollzeile im Wortlaut; den Zweig, der entsteht; dass ein Pull Request gegen den Hauptzweig eröffnet wird. Der Dialog sagt auch, was nicht passiert: kein Merge, `spec.md` und `plan.md` bleiben, die Sitzung und ihre Arbeitskopie bleiben, die Board-Karte ist ein eigener Schritt.
4. Michael bestätigt. Der Knopf ist gesperrt und zeigt „Abschluss läuft …"; die Seite bleibt bedienbar.
5. Das System prüft zuerst alles, was es braucht (Repository mit entferntem Hauptzweig, Vorhaben liegt dort, Kopf der Absicht lesbar, Zweigname frei, Weg zu GitHub offen), und ändert erst dann etwas: Es setzt in einer eigenen, kurzlebigen Arbeitskopie ab dem entfernten Hauptzweig `status: umgesetzt`, die nächste PATCH-Version, das heutige Datum und hängt die Protokollzeile an. Es committet, pusht den Zweig und eröffnet den Pull Request. Michaels Hauptcheckout bleibt unberührt — kein Zweigwechsel, keine geänderte Datei.
6. Ein Toast meldet „Abschluss-PR #n eröffnet". Auf der Seite steht jetzt statt „Abschließen" der Knopf „Abschluss zurücknehmen" und darüber der Hinweis „Abschluss angestoßen · PR #n ↗ — nach dem Merge den Hauptcheckout aktualisieren". Die Knöpfe „Nächster Schritt" und „Freigeben" sind weg, weil das Vorhaben als umgesetzt gilt.
7. In der Übersicht steht die Zeile binnen 5 s unter „Umgesetzt" mit Phase „Umgesetzt" und dem Zusatz „Abschluss-PR #n".
8. Ergebnis: ein Commit auf `chore/INT-JJJJ-NNN-abschluss`, ein offener PR, keine Sitzung gestartet, keine Datei im Hauptcheckout angefasst.

### Ablauf B: Betrieb — Abschluss-PR mergen und nachziehen (AK-06, AK-07)

<!-- leser: mensch -->

1. Michael merged den Abschluss-PR auf GitHub (RB-01). Die UI merkt davon nichts und muss es nicht.
2. Er aktualisiert den Hauptcheckout des Projekts (wie nach jedem Merge). Die Absichtsdatei dort trägt jetzt `umgesetzt`.
3. Beim nächsten Lesen der Vorhaben (spätestens 5 s später) erkennt die UI das: Die Marke „Abschluss angestoßen" verfällt von selbst, der Hinweis auf den PR verschwindet, „Abschluss zurücknehmen" ist weg. Die Zeile steht weiter unter „Umgesetzt" — jetzt aus der Datei heraus.
4. Trägt eine Arbeitskopie des Projekts (etwa die der alten Bau-Sitzung) noch eine ältere Fassung der Absicht, ändert das nichts: Die umgesetzte Fassung im Hauptcheckout gewinnt.
5. Ergebnis: kein Rückstand im Nutzerzustand, die Datei ist die Wahrheit.

### Ablauf C: Abschluss zurücknehmen (AK-11)

<!-- leser: mensch -->

1. Michael hat abgeschlossen, aber der Abschluss-PR soll nicht gelten — er schließt ihn auf GitHub ohne Merge, oder er hat das falsche Vorhaben erwischt.
2. Auf der Vorhaben-Seite steht an der Stelle von „Abschließen" der Knopf „Abschluss zurücknehmen", solange die Absicht im Hauptcheckout noch nicht `umgesetzt` trägt.
3. Klick → kurzer Dialog: „Die Zeile steht wieder in ihrer Phase. Zweig und Pull Request #n bleiben bestehen — den PR auf GitHub schließen, wenn er nicht gelten soll." Bestätigen.
4. Die Marke ist weg; die Zeile steht in der Übersicht binnen 5 s wieder in der Gruppe und Phase, die sich aus Datei und Sitzung ergibt (etwa „Läuft · PR"). Auf der Seite steht wieder „Abschließen"; „Nächster Schritt" und „Freigeben" sind wieder da, falls die Phase sie kennt.
5. Ergebnis: Rücknahme ist ein Anzeige-Vorgang; im Repo verändert sie nichts (NZ-03).

### Ablauf D: Abschluss scheitert (AK-09)

<!-- leser: mensch -->

1. Michael bestätigt den Abschluss, aber etwas fehlt: kein Git-Repository, kein entfernter Hauptzweig, das Vorhaben liegt noch nicht auf dem Hauptzweig (Bau-PR nicht gemergt), der Kopf der Absicht ist nicht lesbar, der Zweig `chore/INT-…-abschluss` existiert schon, `gh` fehlt oder ist nicht angemeldet, kein Netz.
2. Die Vorprüfung fängt fast alles davon ab, bevor etwas geschrieben wird. Die UI zeigt unter dem Knopf den Grund mit nächstem Schritt, zum Beispiel: „Nicht abgeschlossen: das Vorhaben liegt noch nicht auf dem Hauptzweig — erst den Bau-PR mergen." oder „Nicht abgeschlossen: der Zweig chore/INT-2026-012-abschluss existiert schon — den offenen PR mergen oder den Zweig löschen, dann erneut." oder „Nicht abgeschlossen: gh ist auf diesem Rechner nicht angemeldet — im Terminal gh auth login ausführen."
3. Scheitert ein Schritt erst nach der ersten Änderung (etwa der Push oder das Eröffnen des PR), baut das System zurück: Der Zweig wird lokal und, falls schon gepusht, entfernt gelöscht, die kurzlebige Arbeitskopie entfernt. Konnte etwas nicht zurückgebaut werden, nennt die Meldung genau das („Zweig … ist auf GitHub stehen geblieben — von Hand löschen").
4. Keine Marke wird gesetzt; die Zeile bleibt, wo sie war. Der Knopf „Abschließen" ist wieder frei. Der Grund bleibt auf der Seite stehen, bis Michael es erneut versucht.
5. Ergebnis: entweder ganz (Commit, Zweig, PR, Marke) oder gar nichts.

### Ablauf E: Übersicht ohne Knopfdruck — Hauptcheckout gewinnt, wartende Sitzung hält nicht fest (AK-07, AK-08)

<!-- leser: mensch -->

1. Ein Vorhaben ist umgesetzt: Die Absicht im Hauptcheckout trägt `umgesetzt` (etwa nach einem Abschluss aus einer Sitzung vor diesem Vorhaben). Seine Bau-Sitzung ist noch offen und wartet ruhig; ihre Arbeitskopie trägt eine ältere Fassung der Absicht (`angenommen` oder ein falsches Wort wie `abgeschlossen`).
2. Michael öffnet die Übersicht. Heute stünde die Zeile unter „Wartet auf dich" oder mit Phase „unbekannt" unter „Läuft".
3. Nach dem Umbau steht sie unter „Umgesetzt": Die Zeile zeigt die Fassung des Hauptcheckouts, weil sie `umgesetzt` trägt — nicht die Kopie der Sitzung. Die wartende Sitzung ist an der Zeile weiter sichtbar („wartet"), aber sie entscheidet die Gruppe nicht mehr.
4. Arbeitet die Sitzung gerade oder zeigt sie einen Dialog (Rückfrage, Plan-Entscheidung, Berechtigung), gilt weiter die alte Regel: Die Zeile steht in „Läuft" beziehungsweise „Wartet auf dich" — jemand tut dort noch etwas.
5. Ergebnis: Diese Regel wirkt sofort für alle offenen Projekte, ohne dass Michael etwas klickt.

### Ablauf F: Vorhaben mit falschem Statuswort abschließen (AK-01, NZ-04)

<!-- leser: mensch -->

1. Ein Vorhaben trägt in der Absicht ein Wort, das die Übersicht nicht kennt (`in Umsetzung`, `abgeschlossen`, `in Arbeit`). Die Zeile hängt mit Phase „unbekannt" unter „Läuft".
2. Michael öffnet die Vorhaben-Seite. „Abschließen" ist da — Phase „unbekannt" gehört dazu.
3. Der Bestätigungsdialog nennt den gefundenen Stand ehrlich: „Auf dem Hauptzweig steht die Absicht auf ‚in Umsetzung' (Version 1.0.0)". Michael bestätigt; das Wort wird durch `umgesetzt` ersetzt, sonst wie Ablauf A.
4. Ergebnis: Das falsche Wort verschwindet mit dem Abschluss-PR; die Übersicht lernt keine Synonyme (NZ-04).

### Ablauf G: Bau-Sitzung endet — der Workflow verweist auf den Knopf (RB-08)

<!-- leser: mensch -->

1. Eine `/build`-Sitzung erreicht Schritt 6 (PR und Status). Sie setzt wie heute den Plan auf `umgesetzt` und eröffnet den Bau-PR.
2. Statt zu sagen „nach Merge `intent.md` auf `umgesetzt`", endet der Schritt mit dem Hinweis: Der Abschluss ist nach dem Merge ein Klick auf „Abschließen" auf der Vorhaben-Seite. Für Projekte, die die Web-UI nicht nutzen, bleibt ein Satz, wie der Kopf von Hand aussieht (Status, PATCH-Version, Datum, Protokollzeile) — kein Skript, kein Befehl (NZ-01).
3. Ergebnis: Keine Sitzung schreibt den Abschluss mehr von sich aus; das Statuswort entsteht nur noch aus der UI oder von Hand nach Vorlage.

### Ablauf H: Dasselbe am Handy und auf dem Droplet (AK-10)

<!-- leser: mensch -->

1. Michael öffnet die Vorhaben-Seite am Handy. „Abschließen" steht in der Aktionen-Zeile wie am Mac; Dialog und Hinweise sind dieselben, untereinander statt nebeneinander.
2. Auf dem Cloud-Droplet läuft derselbe Ablauf: Push über den dort hinterlegten GitHub-Zugang, PR über `gh`. Fehlt dort etwas, nennt die Meldung es wie in Ablauf D (Stichprobe AK-10, siehe AN-S14).
3. Ergebnis: gleiche Sicht und gleiches Verhalten auf jedem Gerät; die Marke ist auf Mac und Handy dieselbe, weil sie im Backend liegt (RB-05).

## 3. Fachliche Anforderungen

<!-- leser: mensch -->

<!-- Eine Zeile = eine prüfbare Aussage. Modalverben groß. Herkunft = AK/Z/NZ aus intent.md oder „neu (Grund)". -->

| ID | Anforderung | Herkunft | Prüfung |
|---|---|---|---|
| FA-01 | Wenn die Vorhaben-Seite ein Vorhaben mit Ordner zeigt, dessen Phase Spec, Plan, Bau, PR oder unbekannt ist, MUSS sie in der Aktionen-Zeile den Knopf „Abschließen" anbieten; in Phase „Absicht" (Status `entwurf`, `in_klaerung`) und bei `umgesetzt` DARF er NICHT erscheinen. | AK-01 | Test |
| FA-02 | Wenn „Abschließen" gedrückt wird, MUSS vor jeder Änderung ein Dialog nennen: Kennung und Titel, die Absichtsdatei im Ordner des Vorhabens, Status und Version der Absicht auf dem entfernten Hauptzweig, die neue Version, die Protokollzeile im Wortlaut, den Zweignamen, den Ziel-Zweig des Pull Requests, die Bau-PR-Nummer(n) falls bekannt — und was nicht passiert (kein Merge, Spec und Plan unverändert, Sitzung und Arbeitskopie bleiben, Board-Karte separat). Ohne Bestätigung DARF nichts geschehen. | AK-02 | Test |
| FA-03 | Wenn bestätigt wird, MUSS die Absichtsdatei danach im Kopf `status` auf `umgesetzt`, `version` auf die nächste PATCH-Version und `geaendert` auf das heutige Datum tragen — in derselben Schreibweise wie vorgefunden (Anführungszeichen, Zeilenende) — und alle übrigen Zeilen der Datei MÜSSEN unverändert bleiben. | AK-03 | Test |
| FA-04 | Wenn bestätigt wird, MUSS am Ende der Tabelle „Änderungsprotokoll" genau eine Zeile angehängt werden, deren Text lautet: „Umgesetzt: abgeschlossen aus der UI durch Michael Sindlinger; Belege in `plan.md` §13" — ergänzt um „; Bau-PR #n" (mehrere: „#n, #m") falls die Statuszeile des Plans PR-Nummern nennt. | AK-03, OF-05 | Test |
| FA-05 | Die Protokollzeile MUSS so viele Zellen haben wie die Kopfzeile der Tabelle; die Zellen MÜSSEN nach dem Namen der Spalte gefüllt werden (Version, Datum, Änderung, Autor, IDs, Freigabe), unbekannte Spalten bleiben leer. | AK-03, neu (zwei Tabellenformen im Bestand, siehe AN-S04) | Test |
| FA-06 | Als Grundlage für Kopf und Protokollzeile MUSS die Fassung der Absichtsdatei auf dem entfernten Hauptzweig des Projekts dienen (konfigurierte Basis, Standard `main`, nach dem Nachholen der entfernten Verweise) — nicht die Fassung einer Arbeitskopie oder des Hauptcheckouts. | AK-04, AK-05 | Test |
| FA-07 | Wenn bestätigt wird, MUSS das Ergebnis genau ein Commit auf dem Zweig `chore/INT-JJJJ-NNN-abschluss` ab dem entfernten Hauptzweig sein, gepusht, mit offenem Pull Request gegen den Hauptzweig; Commit-Text und PR-Titel MÜSSEN festen Wortlauts sein („chore(INT-JJJJ-NNN): intent.md auf umgesetzt", plus „nach Merge von PR #n" falls bekannt). | AK-04, Z-02 | Test + Stichprobe |
| FA-08 | Der Abschluss DARF den Hauptcheckout des Projekts NICHT verändern: kein Zweigwechsel, keine geänderte oder neue Datei, kein Nachholen, das dort etwas bewegt. Was er zum Schreiben braucht, MUSS er in einer eigenen, kurzlebigen Arbeitskopie tun und diese danach entfernen. | AK-05 | Test |
| FA-09 | Kein Sprachmodell DARF am Abschluss beteiligt sein; zwei Abschlüsse desselben Standes MÜSSEN bis auf Datum und Versionsnummer dieselben Änderungen ergeben. | Z-02 | Test |
| FA-10 | Sobald der Pull Request eröffnet ist, MUSS das Backend für das Vorhaben eine Marke „Abschluss angestoßen" mit PR-Nummer, PR-Link, Zweigname und Zeitpunkt halten; sie MUSS Neuladen, Gerätewechsel und Neustart des Backends überleben und DARF NICHT im Browser liegen. | AK-06, OF-02, RB-05 | Test |
| FA-11 | Solange die Marke steht, MUSS die Übersicht die Zeile unter „Umgesetzt" mit Phase „Umgesetzt" und dem Zusatz „Abschluss-PR #n" zeigen — binnen 5 s nach dem Setzen der Marke — und die Vorhaben-Seite MUSS den Hinweis „Abschluss angestoßen · PR #n ↗ — nach dem Merge den Hauptcheckout aktualisieren" zeigen; „Nächster Schritt" und „Freigeben" DÜRFEN dann NICHT angeboten werden. | AK-06 | Test |
| FA-12 | Wenn die Absichtsdatei im Hauptcheckout `umgesetzt` trägt, MUSS die Marke von selbst verfallen (binnen 5 s nach dem Lesen), ohne Rückstand im Nutzerzustand. | AK-06, OF-02 | Test |
| FA-13 | Wenn die Absichtsdatei im Hauptcheckout `umgesetzt` trägt, MUSS die Zeile diese Fassung zeigen und unter „Umgesetzt" stehen, auch wenn die Kopie der zugeordneten Sitzung oder eine jüngere Kopie eine andere Fassung trägt. | AK-07, RB-07 | Test |
| FA-14 | Wenn ein Vorhaben umgesetzt ist (Datei oder Marke) und seine zugeordnete Sitzung nur wartet (fertig, ruhig, ohne Dialog) oder beendet ist, MUSS die Zeile unter „Umgesetzt" stehen; arbeitet die Sitzung oder zeigt sie einen Dialog (Rückfrage, Plan-Entscheidung, Berechtigung), MUSS die heutige Regel gelten (Sitzungszustand vor Phase). | AK-08, RB-07 | Test |
| FA-15 | Solange die Marke steht und die Datei im Hauptcheckout noch nicht `umgesetzt` trägt, MUSS die Vorhaben-Seite an der Stelle von „Abschließen" den Knopf „Abschluss zurücknehmen" anbieten; nach Bestätigung MUSS die Marke weg sein und die Zeile binnen 5 s wieder in Gruppe und Phase aus Datei und Sitzung stehen. Zweig und PR DÜRFEN dabei NICHT verändert werden; der Dialog MUSS das sagen. | AK-11, OF-03 | Test |
| FA-16 | Vor der ersten Änderung MUSS das System prüfen: Projekt ist ein Git-Repository mit entferntem Hauptzweig; das Vorhaben liegt dort mit lesbarem Kopf (Status, Version in SemVer, Änderungsdatum) und einer Tabelle „Änderungsprotokoll"; der Zweigname ist lokal und entfernt frei; `gh` ist vorhanden und angemeldet. Schlägt eine Prüfung fehl, DARF nichts geschrieben, kein Zweig angelegt und keine Marke gesetzt werden. | AK-09 | Test |
| FA-17 | Scheitert ein Schritt nach der ersten Änderung, MUSS das System zurückbauen (Zweig lokal und entfernt löschen, kurzlebige Arbeitskopie entfernen) und DARF keine Marke setzen; was nicht zurückgebaut werden konnte, MUSS die Meldung beim Namen nennen. | AK-09 | Test |
| FA-18 | Jede Fehlermeldung MUSS Ursache und nächsten Schritt nennen, unter dem Knopf stehen bleiben, bis Michael es erneut versucht, und DARF NIE Zugangsdaten oder Host-Pfade enthalten (Zweig- und Dateinamen sind erlaubt). | AK-09, RB-04 | Test |
| FA-19 | Während ein Abschluss läuft, MUSS der Knopf gesperrt sein und „Abschluss läuft …" zeigen; ein zweiter Auslöser für dasselbe Vorhaben (anderes Gerät) MUSS mit „Abschluss läuft schon" abgewiesen werden; spätestens nach 60 s MUSS ein Ergebnis (Erfolg oder Grund) vorliegen. | AK-09, RB-05, neu (zwei Geräte) | Test |
| FA-20 | Der Abschluss MUSS am Mac und auf dem Cloud-Droplet mit demselben Ablauf und denselben Meldungen laufen; Push über den auf dem Host hinterlegten GitHub-Zugang, PR über `gh`. | AK-10 | Stichprobe |
| FA-21 | `spec.md`, `plan.md`, der Ordner `design/` und alle anderen Dateien des Vorhabens DÜRFEN vom Abschluss NICHT verändert werden. | NZ-08 | Test |
| FA-22 | Der Bau-Workflow MUSS in Schritt 6 den Abschluss als Klick auf „Abschließen" in der UI nach dem Merge nennen und DARF die Sitzung nicht mehr anweisen, `intent.md` auf `umgesetzt` zu setzen; für Projekte ohne Web-UI MUSS ein Satz beschreiben, wie der Kopf von Hand aussieht — ohne Skript oder Befehl. | RB-08, NZ-01, AN-S13 | Review |
| FA-23 | Nach dem Umbau MÜSSEN die Projekt-Docs den Abschluss aus der UI, die Marke und die zwei neuen Übersichtsregeln beschreiben; INT-2026-016 AK-01 und INT-2026-004 FA-06 gelten für umgesetzte Vorhaben als eingeschränkt. | RB-07, neu (Docs sind das Soll) | Review |

## 4. Fehler- und Randfälle

<!-- leser: mensch -->

| Fall | Erwartetes Verhalten | Herkunft |
|---|---|---|
| Vorhaben liegt nur in einer Arbeitskopie, nicht auf dem entfernten Hauptzweig (Bau-PR nicht gemergt) | Vorprüfung bricht ab: „das Vorhaben liegt noch nicht auf dem Hauptzweig — erst den Bau-PR mergen"; nichts geschrieben | FA-16 |
| Absicht auf dem Hauptzweig älter als in der gezeigten Kopie (Sitzung hat sie nach der Freigabe noch geändert, nicht gemergt) | Dialog nennt Status und Version vom Hauptzweig; Michael entscheidet; spätere Merges der Kopie müssen den Kopf von Hand zusammenführen (NZ-02) | FA-02, FA-06 |
| Absicht auf dem Hauptzweig trägt schon `umgesetzt`, Hauptcheckout hinkt hinterher | Vorprüfung bricht ab: „auf dem Hauptzweig ist die Absicht schon umgesetzt — den Hauptcheckout aktualisieren"; keine Marke | FA-16 |
| Absicht auf dem Hauptzweig steht auf `entwurf` oder `in_klaerung`, die gezeigte Kopie auf `angenommen` | Knopf ist da (Phase der Zeile zählt); Dialog nennt den Stand vom Hauptzweig; Michaels Bestätigung ist die Entscheidung | FA-01, FA-02 |
| Status ist ein unbekanntes Wort (`in Arbeit`, `abgeschlossen`, `in Umsetzung`) | Knopf da (Phase unbekannt); Dialog nennt das Wort; es wird durch `umgesetzt` ersetzt | FA-01, FA-03 |
| Version ist kein SemVer („1.0", ohne Anführungszeichen ist erlaubt, „v1" nicht) | Vorprüfung bricht ab: „Version der Absicht nicht lesbar: … — von Hand auf JJ.MM.PP setzen" | FA-16 |
| Kopffeld `geaendert` fehlt | Vorprüfung bricht ab mit dem Feldnamen; Michael ergänzt es von Hand | FA-16 |
| Tabelle „Änderungsprotokoll" fehlt | Vorprüfung bricht ab: „Änderungsprotokoll fehlt — Tabelle nach Vorlage ergänzen" (AN-S04) | FA-16 |
| Tabelle hat vier Spalten (Version, Datum, Autor, Änderung) statt fünf | Zeile mit vier Zellen; Autor = „Michael Sindlinger (UI)" | FA-05 |
| Tabelle hat unbekannte Spalten | Zellen leer; bekannte nach Namen gefüllt | FA-05 |
| Statuszeile des Plans nennt keinen PR oder `plan.md` fehlt | Protokollzeile ohne Bau-PR-Zusatz; kein Fehler | FA-04 |
| Statuszeile des Plans nennt mehrere PRs (Stufen) | alle Nummern in Reihenfolge des Auftretens („Bau-PR #57, #58, #63") | FA-04, AN-S05 |
| Zweig `chore/INT-…-abschluss` existiert schon lokal oder entfernt (früherer Versuch, alte Sitzung) | Vorprüfung bricht ab und nennt den Zweig: „offenen PR mergen oder Zweig löschen, dann erneut"; kein Wiederverwenden | FA-16, AN-S02 |
| `gh` fehlt auf dem Host | Vorprüfung bricht ab: „gh ist nicht installiert"; heute liefert der PR-Weg hier einen Erfolg mit Warnung — das gilt für den Abschluss nicht (siehe Bedenken) | FA-16 |
| `gh` nicht angemeldet | Vorprüfung bricht ab mit „gh auth login" als nächstem Schritt | FA-16 |
| Kein Netz / Push scheitert | Zweig lokal angelegt → Rückbau; Meldung „Push fehlgeschlagen: …" ohne Zugangsdaten | FA-17, FA-18 |
| Push gelingt, PR-Eröffnung scheitert | Rückbau: entfernter und lokaler Zweig gelöscht; Meldung nennt Grund; gelingt das Löschen entfernt nicht, sagt die Meldung „Zweig … auf GitHub stehen geblieben — von Hand löschen" | FA-17 |
| PR eröffnet, aber die Antwort nennt keine PR-Nummer | gilt als Fehler nach der ersten Änderung: Rückbau ist nicht mehr sinnvoll (PR existiert) — Meldung „PR eröffnet, Nummer unbekannt — auf GitHub prüfen und danach ‚Abschließen' nicht erneut drücken"; keine Marke (AN-S06) | FA-17 |
| Backend stürzt mitten im Abschluss ab | Beim nächsten Start liegt höchstens ein Zweig ohne PR oder eine kurzlebige Arbeitskopie herum; der nächste Versuch nennt den belegten Zweig (Vorprüfung); die Arbeitskopie wird beim Start aufgeräumt wie andere Reste | FA-16, FA-17 |
| Zwei Geräte drücken „Abschließen" für dasselbe Vorhaben | zweiter Auslöser: „Abschluss läuft schon"; danach sehen beide dieselbe Marke | FA-19 |
| „Abschließen" für zwei verschiedene Vorhaben kurz nacheinander | beide laufen nacheinander (Hauptrepo-Lock, RB-03); jedes eigener Zweig, eigener PR | FA-07 |
| Michael merged den Abschluss-PR, aktualisiert den Hauptcheckout aber tagelang nicht | Marke bleibt, Zeile steht unter „Umgesetzt" mit „Abschluss-PR #n"; der Hinweis auf der Seite nennt das Nachziehen; kein Fehler | FA-11, FA-12 |
| Michael schließt den Abschluss-PR ohne Merge und drückt „Abschluss zurücknehmen" | Marke weg, Zeile zurück in ihrer Phase; der Zweig existiert weiter → ein erneutes „Abschließen" nennt ihn (Zweig löschen) | FA-15, FA-16 |
| Michael drückt „Abschluss zurücknehmen", ohne den PR zu schließen, und merged ihn später doch | nach dem Aktualisieren des Hauptcheckouts steht die Zeile aus der Datei heraus unter „Umgesetzt" (Ablauf B ab Schritt 2) | FA-13 |
| Hauptcheckout trägt `umgesetzt`, die zugeordnete Sitzung zeigt einen Dialog | Zeile unter „Wartet auf dich" (Sitzung tut etwas); Phase „Umgesetzt" sichtbar | FA-14 |
| Hauptcheckout trägt `umgesetzt`, Sitzung arbeitet | Zeile unter „Läuft" | FA-14 |
| Hauptcheckout trägt `umgesetzt`, Sitzung ist fertig und in der Glocke als „fertig, unbeantwortet" | Zeile unter „Umgesetzt"; Glocke unverändert (Eintrag bleibt bis zur Antwort oder zum Schließen des Tabs) | FA-14, §8 |
| Hauptcheckout trägt `umgesetzt`, aber Ordner fehlt im Hauptcheckout ganz (Vorhaben nur in Kopien) | keine Hauptfassung → heutige Regel (Kopie der Sitzung, sonst jüngste) | FA-13 |
| Zwei Arbeitskopien tragen `umgesetzt`, der Hauptcheckout `angenommen` | heutige Regel; die Marke ist unabhängig davon | FA-13 |
| Vorhaben ist eine begonnene Absicht ohne Ordner | kein Knopf (kein Ordner, keine Absichtsdatei) | FA-01 |
| Vorhaben-Seite ist offen, während die Marke von einem anderen Gerät gesetzt oder zurückgenommen wird | Seite wechselt Knopf und Hinweis binnen 5 s ohne Neuladen | FA-10, FA-11 |
| Projekt nutzt `master` oder eine konfigurierte Basis statt `main` | Zweig ab dieser Basis, PR gegen diese Basis; Dialog nennt sie | FA-06, FA-07 |
| Datum auf dem Droplet (andere Zeitzone) | Datum nach der Uhr des Backends, das den Abschluss ausführt (AN-S15) | FA-03 |
| Absichtsdatei nutzt Windows-Zeilenenden oder keine zwei Leerzeichen am Zeilenende | Schreibweise wird übernommen wie vorgefunden; nichts wird „repariert" | FA-03 |
| Vorhaben in einem Projekt, dessen Repo Michael nicht pushen darf | Push scheitert → Rückbau, Meldung ohne Zugangsdaten | FA-17, FA-18 |

## 5. Daten, fachlich

<!-- leser: agent -->

<!-- Welche fachlichen Informationen sichtbar werden, entstehen, sich ändern oder verschwinden. Ohne Tabellen- oder Feldnamen. Datenklasse laut security.md nennen. -->

| Information | Entsteht / ändert sich / verschwindet | Wer sieht sie | Datenklasse |
|---|---|---|---|
| Kopf der Absicht (Status, Version, Änderungsdatum) | ändert sich genau einmal durch den Abschluss, auf einem eigenen Zweig; im Hauptzweig erst nach Merge | Michael, spätere Leser des Repos | öffentlich (Repo-Inhalt des jeweiligen Projekts; bei fremden Projekten gilt deren `security.md`) |
| Protokollzeile „Umgesetzt: abgeschlossen aus der UI durch Michael Sindlinger …" | entsteht mit dem Abschluss; nennt Namen und Bau-PR-Nummer(n) | wie oben | öffentlich; der Name steht heute schon in jeder Absicht |
| Abschluss-Zweig und Pull Request (Titel, fester Text: was geändert, Bau-PR) | entstehen mit dem Abschluss; verschwinden nur durch Michael (Merge, Löschen); bei Fehlschlag durch Rückbau | Michael, GitHub | öffentlich (Repo); PR-Text ohne Host-Pfade |
| Marke „Abschluss angestoßen" (PR-Nummer, PR-Link, Zweig, Zeitpunkt) je Vorhaben und Projekt | entsteht nach PR-Eröffnung; verschwindet, sobald der Hauptcheckout `umgesetzt` trägt, oder durch „Abschluss zurücknehmen" | Michael (Übersicht, Vorhaben-Seite, alle Geräte) | intern (Nutzerzustand der UI, wie Zuordnung und Protokoll) |
| Zustand „Abschluss läuft" je Vorhaben | entsteht mit der Bestätigung; verschwindet mit Ergebnis oder nach 60 s | Michael (Knopf gesperrt) | intern, flüchtig |
| Letzter Fehlgrund eines Abschlusses | entsteht bei Fehlschlag; verschwindet mit dem nächsten Versuch | Michael (unter dem Knopf) | intern; ohne Zugangsdaten und Host-Pfade |
| Kurzlebige Arbeitskopie für den Abschluss | entsteht ab dem entfernten Hauptzweig; verschwindet nach Erfolg oder Rückbau, Reste beim Backend-Start | niemand (nicht in der UI gelistet) | intern (Host-Pfad nie in der UI) |
| Fassung, die eine Zeile zeigt (Hauptcheckout bevorzugt bei `umgesetzt`) | Ableitung beim Lesen; nichts gespeichert | Michael | — (flüchtig) |
| Gruppe der Zeile (wartende Sitzung hält Umgesetztes nicht fest) | Ableitung; nichts gespeichert | Michael | — (flüchtig) |
| Screenshots neben den Skizzen | entstehen im Repo | öffentlich | öffentlich — Scratch-Projekt, keine Kundenprojekte, keine Host-Pfade |

## 6. Was der Nutzer sieht

<!-- leser: mensch -->

<!-- Nur bei UI-Änderung. Beschreibung in Worten; Mock unter `design/` (Pfad nennen), sonst „kein Mock nötig, weil …". -->

- **Vorhaben-Seite, Aktionen-Zeile:** neben „Nächster Schritt" und (falls vorhanden) „Freigeben" ein zweitrangiger Knopf „Abschließen" — sichtbar in Spec, Plan, Bau, PR und unbekannt. Am Handy untereinander. Während des Abschlusses gesperrt mit „Abschluss läuft …". Nach Fehlschlag steht darunter eine Zeile „Nicht abgeschlossen: Grund — nächster Schritt" (Muster „Fehler nach Aktion").
- **Bestätigungsdialog „Vorhaben abschließen":** wie der Freigabe-Dialog aufgebaut (Titel, Kasten mit dem Was, zwei Knöpfe). Inhalt: Kennung · Titel · „Absichtsdatei `intent.md` im Ordner des Vorhabens" · „Auf dem Hauptzweig: Status angenommen, Version 1.0.0 → 1.0.1" · die Protokollzeile im Wortlaut · „Zweig chore/INT-…-abschluss, Pull Request gegen main" · ein grauer Satz „Nicht: mergen, `spec.md`/`plan.md` ändern, Sitzung oder Arbeitskopie beenden, Board-Karte anlegen". Knöpfe „Abbrechen" und „Abschließen und PR eröffnen".
- **Vorhaben-Seite nach dem Abschluss:** Hinweis-Zeile oben (wie „Wiederaufnahme nicht möglich"-Zeile, nur neutral): „Abschluss angestoßen · PR #n ↗ — nach dem Merge den Hauptcheckout aktualisieren". Aktionen-Zeile: nur „Abschluss zurücknehmen" (und am Handy „Im Terminal öffnen", falls eine Sitzung lebt). Kein „Nächster Schritt", kein „Freigeben".
- **Dialog „Abschluss zurücknehmen":** ein Satz zur Wirkung, ein Satz zu Zweig und PR (bleiben; auf GitHub schließen), Knöpfe „Abbrechen" und „Zurücknehmen".
- **Übersicht:** Zeile in der Gruppe „Umgesetzt" mit Phase „Umgesetzt" und Zusatz „Abschluss-PR #n" neben dem Phasen-Badge, solange die Marke steht; danach ohne Zusatz. Zeilen, die durch die neuen Leseregeln wandern (Ablauf E), sehen aus wie jede umgesetzte Zeile — mit ihrem Sitzungszustand („wartet") in der Zustandsspalte.
- **Toasts:** „Abschluss-PR #n eröffnet" · „Abschluss zurückgenommen".
- **Skizze (Mac, Vorhaben-Seite, Phase PR):**

```
‹ Vorhaben
kreis-lippe-audit
INT-2026-012
Titel des Vorhabens
[intent] [spec] [plan] [design/]
● ruht · Sitzung beendet · geändert vor 3 Tagen

[ Dokument … ]

Nächster Schritt  [ … ]                 [Abschließen]
```

- **Skizze (Dialog):**

```
Vorhaben abschließen

INT-2026-012 · Titel des Vorhabens
Absichtsdatei: intent.md im Ordner des Vorhabens
Auf dem Hauptzweig: Status angenommen, Version 1.0.0 → 1.0.1
Protokollzeile: 1.0.1 · 2026-09-21 · Umgesetzt: abgeschlossen aus der UI
  durch Michael Sindlinger; Belege in plan.md §13; Bau-PR #14
Zweig chore/INT-2026-012-abschluss · Pull Request gegen main

Nicht: mergen · spec.md/plan.md ändern · Sitzung oder Arbeitskopie
beenden · Board-Karte anlegen

                         [Abbrechen]  [Abschließen und PR eröffnen]
```

- **Skizze (Seite nach dem Abschluss):**

```
Abschluss angestoßen · PR #15 ↗ — nach dem Merge den Hauptcheckout aktualisieren
● ruht · Sitzung beendet

[ Dokument … ]

                                        [Abschluss zurücknehmen]
```

- **Skizze (Übersicht, Gruppe „Umgesetzt"):**

```
Umgesetzt · 19
INT-2026-012   Titel des Vorhabens          Umgesetzt · Abschluss-PR #15   ruht · Sitzung beendet
INT-2026-011   Terminal statt Gespräch      Umgesetzt                      wartet
```

- **Mock:** Pflicht nach `design.md` §6 (neuer Ablauf). Vorschlag wie INT-2026-022: die Textskizzen genügen für die Freigabe; Screenshots aus dem E2E-Lauf liegen im PR neben den Skizzen unter `design/ist/` (AN-S12).

## 7. Bedenken aus den Projekt-Docs

<!-- leser: agent -->

<!-- PFLICHT. Beim Schreiben wurden product-brief, architecture, security, design gelesen. Alles, was dort reibt, steht hier — markiert, nicht entschieden.
     „Geklärt" heißt: die zuständige Rolle hat entschieden; Entscheidung steht in der Spalte. Vor der Freigabe muss jede Zeile geklärt oder als „offen, blockiert nicht, weil …" begründet sein.
     Gibt es nichts: „Keine — geprüft gegen Stand [sha]." -->

| Quelle | Bedenken | Betrifft | Geklärt? (wer, wann, wie) |
|---|---|---|---|
| architecture.md §3 Nutzerzustand der UI, ADR-0002 | Die Marke „Abschluss angestoßen" ist eine neue Information im Nutzerzustand (PR-Nummer, Link, Zweig, Zeitpunkt); §3 zählt jede Erweiterung auf | FA-10, §5 Zeile „Marke" | offen — an den Plan delegiert, nicht blockierend; Vorschlag vom PO bestätigt, 21.09.: optionales Feld je Vorhaben wie INT-2026-019/022 (Erweiterung von ADR-0002, kein neues ADR), §3-Zeile ergänzen |
| architecture.md AR-03 („ihr Hauptrepo-Lock sichert nur noch das Anlegen von Session-Worktrees") | Der Abschluss legt eine kurzlebige Arbeitskopie an, committet, pusht und eröffnet einen PR — mehr als „Anlegen"; zwei Abschlüsse und ein Session-Start dürfen sich nicht kreuzen | FA-07, FA-08, Randfall „zwei Vorhaben nacheinander" | offen — an den Plan delegiert, nicht blockierend; Vorschlag vom PO bestätigt, 21.09.: derselbe Lock, AR-03-Text um „und den Abschluss eines Vorhabens" erweitern; keine neue Lock-Ebene |
| architecture.md AR-05 (Nutzerzustand nie im Browser) | Marke, Zustand „läuft" und letzter Fehlgrund müssen im Backend liegen und als Ganzes gebroadcastet werden | FA-10, FA-18, FA-19 | geklärt durch FA-10 und RB-05 (Intent, PO 21.09.) |
| architecture.md AR-06 (Framework nie von der UI abhängig; Installer-Test läuft ohne `ui/`) | RB-08 lässt `build.md` Schritt 6 auf den UI-Knopf verweisen; ein Projekt ohne Web-UI hätte dann keinen beschriebenen Abschlussweg mehr — NZ-01 verbietet zugleich Skript und Befehl | FA-22 | geklärt: PO 21.09. mit der Freigabe (AN-S13) — Knopf als Regelweg, dazu ein Satz „ohne UI: Kopf von Hand — `status: umgesetzt`, PATCH-Version, Datum, Protokollzeile nach Vorlage"; kein Skript, kein Befehl |
| architecture.md §5 Externe Systeme | GitHub als PR-Ziel (`gh`, Push mit Host-Zugang) fehlt in der Tabelle; `security.md` §6 verlangt bei Anbindung Zugang und Ausfallverhalten | FA-07, FA-16, FA-17, FA-20 | offen — an den Plan delegiert, nicht blockierend; Vorschlag vom PO bestätigt, 21.09.: Zeile „GitHub (Push, PR über `gh`)" mit Ausfall „Abschluss verweigert oder zurückgebaut, Meldung ohne Token" ergänzen |
| architecture.md §2 Backend (Vorhaben-Handler ohne Abschluss-Nachricht) und security.md §6 Zeile 1 (von außen erreichbarer Eingang: Zugriffsbegrenzung, Validierung, Datenklasse) | Zwei neue Eingänge (abschließen, zurücknehmen) über den bestehenden Kanal; kein HTTP-Endpunkt | FA-02, FA-15 | offen — an den Plan delegiert, nicht blockierend; Vorschlag vom PO bestätigt, 21.09.: Validierung wie `vorhaben:session.assign` (Projekt offen, Kennung in Form `INT-JJJJ-NNN`, Ordner bekannt), Antwortklasse intern, Änderungsprotokoll-Zeile in `security.md` — Herkunft `ui/src/server/services/vorhaben-handler.ts:49-59` |
| architecture.md §10 (bekannte Abweichungen nicht vergrößern) | Der heutige PR-Weg meldet bei fehlendem oder nicht angemeldetem `gh` „Erfolg mit Warnung" statt Fehler; der Abschluss braucht harte Fehler (AK-09) — Herkunft `ui/src/server/services/git.service.ts:1251-1272` | FA-16, FA-17, Randfälle `gh` | offen — an den Plan delegiert, nicht blockierend; Vorschlag vom PO bestätigt, 21.09.: Vorprüfung (`gh` vorhanden, angemeldet) vor der ersten Änderung und Ergebnis des PR-Wegs streng auswerten (Warnung = Fehler); keine neue §10-Zeile |
| architecture.md §2 Backend (Aufräumer-Schutzregel `keepWorktree`, INT-2026-019) | Die kurzlebige Abschluss-Kopie darf nicht als Sitzungs-Kopie gelten und muss beim Backend-Start als Rest erkannt und entfernt werden | FA-08, FA-17, Randfall „Backend stürzt ab" | offen — an den Plan delegiert, nicht blockierend; Vorschlag vom PO bestätigt, 21.09.: eigener Namensraum neben den Sitzungs-Kopien, Aufräumen beim Start — Herkunft `ui/src/server/utils/cloud-session-worktree.ts:127-135` |
| security.md §3 (GitHub-Token) und §5 (Token nie in Fehlermeldung) | `gh`- und Push-Ausgaben können Zugangsdaten enthalten; Fehlermeldungen wandern in den Nutzerzustand und auf den Bildschirm | FA-18 | geklärt durch FA-18; Herkunft: Push-Fehler werden heute schon bereinigt (`redactGithubTokens` in `git.service.ts`), Vorschlag an den Plan: dieselbe Bereinigung für `gh`-Ausgaben |
| security.md §5 Verbotsliste („Update-Läufe auf `main` eines fremden Projekts, Läufe auf dem Cloud-Host ohne Freigabe") | Der Abschluss pusht vom Droplet aus Zweige in fremde Projekt-Repos (Kreis Lippe, Applai …) | FA-07, FA-20 | geklärt: Michaels Bestätigung im Dialog ist die Freigabe (AK-02, ER-04); nie `main`, immer eigener Zweig (NZ-03); Stichprobe AK-10 an einem Vorhaben, das ohnehin abzuschließen ist (AN-S14) |
| security.md §1 öffentlich (Repo-Inhalt) | Commit-Text, PR-Text und Protokollzeile landen im öffentlichen Repo | FA-04, FA-07 | geklärt: fester Wortlaut ohne Host-Pfade, Name steht heute in jeder Absicht; Screenshots aus dem Scratch-Projekt |
| design.md §1 Prinzip 1 (eine Aktion pro Bildschirm zuerst) | Die Aktionen-Zeile trägt dann bis zu drei Knöpfe („Nächster Schritt", „Freigeben", „Abschließen") | §6 | geklärt durch §6: „Abschließen" zweitrangig (nicht primär), in Phase Bau/PR ohne „Freigeben" ohnehin nur zwei; PO 21.09. mit der Freigabe |
| design.md §4 Muster „Fehler nach Aktion" (Ursache + nächster Schritt) | Jede Verweigerung braucht beides | FA-18, Ablauf D | geklärt durch FA-18 und die Texte in Ablauf D |
| design.md §4 Muster „Übersicht gruppiert nach Sitzungszustand vor Phase" (INT-2026-016) und §5 | AK-08 schränkt die Regel für umgesetzte Vorhaben ein; das Muster im Doc muss folgen | FA-14, FA-23 | geklärt durch RB-07 (Intent) und FA-23; Doc-Zeile im Plan |
| design.md §6 Mock-Pflicht (neuer Ablauf) | Bild-Mocks liegen nicht vor | §6 | geklärt: PO 21.09. (AN-S12) — Textskizzen + Screenshots neben den Skizzen (wie INT-2026-022) |
| product-brief.md §5 Kernfunktionen (Web-UI-Zeile) | Zeile nennt den Abschluss nicht | FA-23 | geklärt durch FA-23 |
| product-brief.md §6 Erfolgsmaß („`plan.md` Status `umgesetzt`") | Der Abschluss ändert `plan.md` nicht (NZ-08) — das Maß bleibt gültig, weil die Bausitzung den Plan setzt | FA-21 | keine Reibung |
| product-brief.md §7 Nicht-Ziele (kein Ticket-System) | Die Marke ist ein Anzeige-Zustand bis zum Merge, kein zweiter Lebenszyklus | FA-10, FA-12 | keine Reibung — verfällt von selbst (FA-12) |
| Intent-Vorlage „Ab status `umgesetzt` nicht mehr ändern" | Die UI darf nur einmal schreiben | FA-01, FA-16 | geklärt durch FA-01 (kein Knopf bei `umgesetzt`) und FA-16 (Hauptzweig schon `umgesetzt` → Abbruch) |

## 8. Nicht im Umfang

<!-- leser: mensch -->

<!-- Aus NZ der intent.md plus alles, was beim Schreiben ausgeschlossen wurde. -->

- NZ-01: Kein Terminal-Befehl, kein Skript; `build.md` verweist nur (der Ausweichsatz für Projekte ohne UI ist Prosa, siehe AN-S13).
- NZ-02: Kein Abgleich mit GitHub, ob der Bau-PR gemergt ist; kein automatischer Abschluss.
- NZ-03: Kein Merge des Abschluss-PR, kein Push auf `main`; „Abschluss zurücknehmen" schließt den PR nicht und löscht keinen Zweig.
- NZ-04: Falsche Statuswörter werden nicht repariert und nicht als Synonyme gelesen.
- NZ-05: Kein Knopf für `verworfen` oder `abgeloest`; eine nie angenommene Absicht (Phase „Absicht") hat keinen Knopf.
- NZ-06: Keine Board-Karte.
- NZ-07: Sitzung und Arbeitskopie bleiben unberührt.
- NZ-08: `spec.md`, `plan.md`, `design/` unverändert.
- Zusätzlich: Die Glocke bleibt unverändert (ein „fertig, unbeantwortet" an einer umgesetzten Zeile bleibt, bis geantwortet oder der Tab geschlossen wird).
- Zusätzlich: Kein Nachziehen des Hauptcheckouts durch die UI (kein Pull); das bleibt Michaels Schritt nach dem Merge.
- Zusätzlich: Keine Prüfung, ob der Abschluss-PR auf GitHub noch offen ist; die Marke lebt allein von der Datei im Hauptcheckout und von „Zurücknehmen".
- Zusätzlich: Kein Wiederverwenden eines bestehenden Abschluss-Zweigs; ein belegter Zweig ist ein Abbruchgrund.
- Zusätzlich: Kein Abschluss aus der Übersichtszeile (OF-01).
- Zusätzlich: Keine Protokollzeile aus freiem Text; der Wortlaut ist fest (OF-05).

## 9. Annahmen

<!-- leser: mensch -->

<!-- Vorläufige Auslegungen nach ER-00 der intent.md. Werden bei der Freigabe gesammelt bestätigt. -->

- **AN-S01:** Grundlage des Abschlusses ist die Absichtsdatei auf dem entfernten Hauptzweig (konfigurierte Basis, Standard `main`, nach Nachholen der Verweise). Liegt das Vorhaben dort nicht, bricht der Abschluss ab („erst den Bau-PR mergen"). — bestätigt am 2026-09-21 von Product Owner
- **AN-S02:** Zweigname `chore/INT-JJJJ-NNN-abschluss` wie heute; existiert er lokal oder entfernt, bricht der Abschluss ab und nennt den nächsten Schritt (PR mergen oder Zweig löschen). Kein Wiederverwenden. — bestätigt am 2026-09-21 von Product Owner
- **AN-S03:** Commit-Text und PR-Titel „chore(INT-JJJJ-NNN): intent.md auf umgesetzt", plus „nach Merge von PR #n" falls bekannt; PR-Text fester Wortlaut (was geändert, Bau-PR); Urheber ist die Git-Identität des Hosts; kein „Co-Authored-By", weil kein Modell beteiligt ist. — bestätigt am 2026-09-21 von Product Owner
- **AN-S04:** Die Protokollzeile passt sich an die Spalten der vorhandenen Tabelle an (Version, Datum, Änderung, Autor = „Michael Sindlinger (UI)", IDs = „—", Freigabe = „Product Owner (Klick in der UI)"; unbekannte Spalten leer). Fehlt die Tabelle, bricht der Abschluss ab, statt eine anzulegen. — bestätigt am 2026-09-21 von Product Owner
- **AN-S05:** Bau-PR-Nummern = alle „PR #n" in der Statuszeile des Plans, in Reihenfolge des Auftretens; keine → kein Zusatz. — bestätigt am 2026-09-21 von Product Owner
- **AN-S06:** Ganz oder gar nicht: Vorprüfung vor der ersten Änderung; scheitert danach ein Schritt, wird zurückgebaut (Zweig lokal und entfernt, Arbeitskopie). Einzige Ausnahme: PR eröffnet, aber Nummer unbekannt → keine Marke, Meldung mit Hinweis auf GitHub. — bestätigt am 2026-09-21 von Product Owner
- **AN-S07:** Die Marke trägt PR-Nummer, PR-Link, Zweig und Zeitpunkt, lebt im Backend-Nutzerzustand je Projekt und Vorhaben, ist auf allen Geräten dieselbe und verfällt allein durch die Datei im Hauptcheckout oder durch „Zurücknehmen". — bestätigt am 2026-09-21 von Product Owner
- **AN-S08:** „Abschluss zurücknehmen" löscht nur die Marke; Zweig und PR bleiben, der Dialog sagt das. — bestätigt am 2026-09-21 von Product Owner
- **AN-S09:** Trägt die Absicht im Hauptcheckout `umgesetzt`, zeigt die Zeile die ganze Hauptfassung (Phase, Dokumente, Zeitstempel), nicht nur den Status; die Sitzung bleibt zugeordnet und sichtbar. — bestätigt am 2026-09-21 von Product Owner
- **AN-S10:** „Nur wartet" (AK-08) heißt: Sitzung fertig oder ruhig ohne Dialog, ruht, oder beendet. „Arbeitet" und jeder Dialog (Rückfrage, Plan-Entscheidung, Berechtigung) halten die heutige Regel. — bestätigt am 2026-09-21 von Product Owner
- **AN-S11:** Die 5 s aus AK-06 zählen ab dem Setzen der Marke (PR eröffnet), nicht ab dem Klick; der Abschluss selbst darf bis zu 60 s dauern und zeigt solange „Abschluss läuft …". — bestätigt am 2026-09-21 von Product Owner
- **AN-S12:** Für die Freigabe genügen die Textskizzen in §6; Screenshots aus dem E2E-Lauf liegen im PR neben den Skizzen unter `design/ist/` (wie INT-2026-022). — bestätigt am 2026-09-21 von Product Owner
- **AN-S13:** `build.md` Schritt 6 nennt den Knopf als Regelweg und behält für Projekte ohne Web-UI einen Satz zur Handarbeit (Status, PATCH-Version, Datum, Protokollzeile nach Vorlage) — kein Skript, kein Befehl (AR-06 gegen NZ-01). — bestätigt am 2026-09-21 von Product Owner
- **AN-S14:** Die Stichprobe für AK-10 läuft auf dem Droplet an einem echten, ohnehin abzuschließenden Vorhaben eines Projekts, das dort offen ist; sie gilt erst, wenn `gh` dort vorhanden und angemeldet ist (Intent AN-01). — bestätigt am 2026-09-21 von Product Owner
- **AN-S15:** Das Änderungsdatum ist das Tagesdatum nach der Uhr des Backends, das den Abschluss ausführt. — bestätigt am 2026-09-21 von Product Owner
- **AN-S16:** Der Fehlgrund eines gescheiterten Abschlusses bleibt im Backend, bis der nächste Versuch für dasselbe Vorhaben beginnt; er überlebt Neuladen. — bestätigt am 2026-09-21 von Product Owner

## 10. Freigabe

<!-- leser: agent -->

- [x] Jede FA hat Herkunft und Prüfung.
- [x] Jedes AK der intent.md ist von mindestens einer FA abgedeckt: AK-01 → FA-01 · AK-02 → FA-02 · AK-03 → FA-03, FA-04, FA-05 · AK-04 → FA-06, FA-07 · AK-05 → FA-06, FA-08 · AK-06 → FA-10, FA-11, FA-12 · AK-07 → FA-13 · AK-08 → FA-14 · AK-09 → FA-16, FA-17, FA-18, FA-19 · AK-10 → FA-20 · AK-11 → FA-15 · Z-02 → FA-09 · NZ-01/RB-08 → FA-22 · NZ-08 → FA-21 · RB-04 → FA-18 · RB-05 → FA-10, FA-19 · RB-07 → FA-13, FA-14, FA-23.
- [x] Abschnitt 7 vollständig geklärt oder begründet offen (sechs Zeilen an den Plan delegiert, Vorschlag vom PO am 21.09. bestätigt: Marke im Nutzerzustand, AR-03-Text, §5 GitHub, Eingänge validieren, strenger PR-Weg, Abschluss-Kopie und Aufräumer; Token-Bereinigung geklärt durch FA-18 mit Vorschlag an den Plan; AR-06 geklärt durch PO-Entscheidung AN-S13, 21.09.).
- [x] Keine Technik, keine Architektur, keine Dateinamen in diesem Dokument (Pfade nur als Herkunft in Abschnitt 7; `intent.md`, `spec.md`, `plan.md`, `build.md` und Zweignamen sind Domänenbegriffe und das, was der Nutzer im Dialog liest).
- [x] Bei risikoklasse hoch: Tech Lead hat gelesen — entfällt (niedrig).
- [x] Abgleich Mensch/Agent: Mensch-Teil gegen Agenten-Teil geprüft (2026-09-21, vor dem Vorlegen), Befund: keiner — Abläufe A–E und AN-S06/S07/S16 decken sich mit den §5-Zeilen Marke, Zustand „läuft", Fehlgrund und Abschluss-Kopie; die einzige nicht vom Plan klärbare §7-Zeile (AR-06) steht als AN-S13 im Mensch-Teil
- **Freigegeben:** Product Owner (Michael Sindlinger), 2026-09-21 („Freigabe: spec.md (Stand 2026-09-21 23:23)", Chat), Commit „spec(INT-2026-024): fachliche Spec freigegeben" (Sha in der Historie)
