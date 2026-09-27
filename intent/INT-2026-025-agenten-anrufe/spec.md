# Spec: UI: Agenten rufen an — Warteschlange, Sprechfassung, lokale Sprache

> **Intent:** `intent.md` (INT-2026-025, Version 1.0.0)
> **Status:** freigegeben
> **Erstellt:** 2026-09-27 · **Freigabe:** Product Owner (Michael Sindlinger), 2026-09-27
> **Gelesene Projekt-Docs:** `docs/product-brief.md`, `docs/architecture.md`, `docs/security.md`, `docs/design.md` (Stand: Commit 0464c47)

<!-- Die Spec ist FACHLICH. Sie beschreibt, was Nutzer erleben und was fachlich gelten muss.
     Nicht hinein gehören: Dateien, Komponenten, Datenbanktabellen, Bibliotheken, Architekturentscheidungen. Das ist plan.md.
     Die Projekt-Docs werden gelesen und dürfen hier nur BEDENKEN markieren (Abschnitt 7). Sie entscheiden nichts.
     Jede Anforderung verweist auf ein Ziel oder Abnahmekriterium der intent.md. Keine Anforderung ohne Herkunft. -->

## 1. Zusammenfassung

<!-- leser: mensch -->

Nach dem Umbau kann Michael in der Web-UI am Mac einen Anrufmodus einschalten. Ist er an, klingelt die UI, sobald eine Sitzung eine Rückfrage stellt, eine Plan-Freigabe braucht oder fertig ist — immer nur eine Meldung zur Zeit, Rückfragen und Pläne vor Fertig-Meldungen, der Rest wartet in einer Warteschlange (Z-01; AK-01 bis AK-08, AK-15). Nimmt er an, liest die UI eine kurze Sprechfassung vor, die der Agent selbst geschrieben hat, höchstens 80 Wörter ohne Code und Pfade (Z-02; AK-09 bis AK-11). Er antwortet per Stimme; die UI zeigt den erkannten Text und schickt ihn erst nach „senden" in die Sitzung, eine Plan-Freigabe erst nach einer zweiten, ausdrücklichen Bestätigung (Z-03; AK-12 bis AK-14). Erkennung und Stimme laufen auf dem Mac ohne Fremddienst, Audio und erkannter Text leben nur während des Anrufs im Speicher; fehlt etwas, sagt die UI warum, und die Glocke arbeitet wie heute (Z-04; AK-16 bis AK-18). Ausgeschaltet ändert sich nichts gegenüber heute (AK-01).

## 2. Nutzer und Abläufe

<!-- leser: mensch -->

<!-- Je Ablauf: wer, Auslöser, Schritte aus Nutzersicht, Ergebnis. Jeder Ablauf deckt mindestens ein AK ab. -->

Nutzer ist Michael am Mac, mit der Web-UI im Browser auf demselben Rechner, auf dem das UI-Backend läuft. Die Sitzungen sind die Claude-Sitzungen, die er in der UI geöffnet hat.

### Ablauf A: Anrufmodus einschalten und ausschalten (AK-01, AK-18)

<!-- leser: mensch -->

1. Michael öffnet die Einstellungen und findet den Schalter „Anrufmodus" (Standard: aus).
2. Die UI prüft vor dem Einschalten, ob die Sprachmodelle eingerichtet sind und ob der Browser das Mikrofon freigibt. Beim ersten Einschalten fragt der Browser einmal nach dem Mikrofon.
3. Fehlt etwas, bleibt der Schalter aus und die UI nennt den Grund mit dem nächsten Schritt, zum Beispiel „Anrufmodus nicht verfügbar: Sprachmodelle fehlen — einmal die Einrichtung ausführen" oder „Mikrofon nicht freigegeben — in den Browser-Einstellungen erlauben". Die Glocke und ihr Ton arbeiten weiter wie heute.
4. Ist alles da, geht der Schalter an. Ab jetzt schreiben die Agenten der UI-Sitzungen zu jeder Antwort eine kurze Sprechfassung (Ablauf B, Schritt 1), und neue Meldungen klingeln.
5. Schaltet Michael den Modus aus, endet ein laufender Anruf ohne Senden, die Warteschlange leert sich, alle Meldungen stehen weiter in der Glocke. Die Agenten schreiben keine Sprechfassung mehr.
6. Ergebnis: ausgeschaltet sieht und hört Michael dasselbe wie vor dem Vorhaben.

### Ablauf B: Anruf bei einer Fertig-Meldung (AK-02, AK-09, AK-10, AK-11, AK-12)

<!-- leser: mensch -->

1. Ein Agent beendet seine Antwort. Am Ende der Antwort steht, im Terminal sichtbar, ein kurzer, erkennbar abgesetzter Absatz: die Sprechfassung — was er getan hat und was jetzt von Michael gebraucht wird, in Alltagssprache, ohne Code, Pfade, Tabellen oder Links.
2. Binnen 5 s nach der Meldung erscheint in der UI der Anruf: Sitzungsname, Projektname, Art („fertig") und ein eigener Klingelton, der sich vom Glockenton unterscheidet. Liegt der UI-Tab im Hintergrund, kommt zusätzlich eine Systemmitteilung des Macs.
3. Michael nimmt an (Knopf oder Taste). Die UI liest die Sprechfassung vor. Hat die Meldung keine, sagt die UI „Keine Sprechfassung — hier der Anfang der Antwort" und liest höchstens die ersten zwei Sätze der letzten Antwort, bereinigt wie in Schritt 1.
4. Michael hält die Sprechtaste (oder klickt den Knopf „Sprechen" und danach „Fertig") und sagt seine Antwort, etwa „Mach weiter mit dem Plan".
5. Die UI zeigt den erkannten Text und darunter, als was er gesendet wird: „Neue Eingabe an Sitzung …". Michael wählt „senden" (Knopf, Taste oder das gesprochene Wort „senden"), „nochmal sprechen" oder „verwerfen".
6. Nach „senden" prüft die UI, ob die Sitzung noch auf Eingabe wartet, gibt den Text in die Sitzung, sagt „Gesendet" und legt auf. Die nächste Meldung der Warteschlange klingelt.
7. Ergebnis: Die Sitzung arbeitet mit Michaels Antwort weiter; der Eintrag verschwindet aus der Glocke wie heute bei einer Antwort im Terminal. Legt Michael ohne Senden auf, bleibt der Eintrag in der Glocke.

### Ablauf C: Anruf bei einer Rückfrage (AK-02, AK-09, AK-12, AK-13)

<!-- leser: mensch -->

1. Ein Agent stellt eine Rückfrage mit Antwortmöglichkeiten. Die UI klingelt mit Art „Rückfrage".
2. Nach Annahme liest die UI die Frage und die Möglichkeiten mit Nummer vor: „Frage: Welches Modell? Eins: Whisper klein. Zwei: Whisper mittel. Oder eine eigene Antwort." Beschreibungen zu den Möglichkeiten liest sie nicht vor. Sind es mehrere Fragen, liest sie die erste, nimmt die Antwort entgegen und geht dann zur nächsten.
3. Michael sagt „zwei" oder „Whisper mittel". Die UI zeigt „Antwort: Möglichkeit 2 — Whisper mittel". Sagt er etwas, das keiner Möglichkeit entspricht, zeigt sie „Eigene Antwort: …".
4. Michael bestätigt mit „senden". Erst wenn alle Fragen der Rückfrage beantwortet sind, gibt die UI die Antworten in die Sitzung; legt er vorher auf, wird nichts gesendet.
5. Ergebnis: Die Sitzung hat genau die gewählte Möglichkeit bzw. den freien Text erhalten und arbeitet weiter.

### Ablauf D: Anruf bei einer Plan-Freigabe (AK-02, AK-09, AK-12, AK-14)

<!-- leser: mensch -->

1. Ein Agent legt einen Plan zur Freigabe vor. Die UI klingelt mit Art „Plan".
2. Nach Annahme liest die UI die Sprechfassung des Plans vor: worum es geht, was sich ändert, was Michael entscheiden muss.
3. Michael sagt „freigeben". Die UI fragt einmal ausdrücklich nach: „Plan für Sitzung … wirklich freigeben? Sag ja oder nein." Der Text dazu steht auch auf dem Bildschirm.
4. Sagt Michael „ja" (oder klickt „Freigeben"), gibt die UI den Plan frei — mit der ersten Ja-Möglichkeit des Plan-Dialogs, die Michael sonst im Terminal wählen würde. Jede andere Antwort gilt als „nicht freigegeben", die UI kehrt zu Schritt 3 zurück.
5. Sagt Michael statt „freigeben" etwas anderes, etwa „Nimm das kleinere Modell", zeigt die UI „Überarbeitungswunsch: …" und schickt den Text nach „senden" als Wunsch zurück an den Agenten; der Plan bleibt unfreigegeben.
6. Ergebnis: Ein falsch erkanntes Wort gibt keinen Plan frei.

### Ablauf E: Mehrere Meldungen, ablehnen, später, anderweitig erledigt (AK-03, AK-04, AK-05, AK-06, AK-07, AK-15)

<!-- leser: mensch -->

1. Während ein Anruf klingelt oder läuft, melden sich zwei weitere Sitzungen: eine fertig, eine mit Rückfrage. Keine klingelt; beide stellen sich in die Warteschlange, die Rückfrage vor der Fertig-Meldung. Die Anruf-Anzeige nennt „noch 2 warten".
2. Michael lehnt den nächsten Anruf ab. Die Meldung verlässt die Warteschlange, bleibt in der Glocke und klingelt nicht erneut — erst wenn dieselbe Sitzung eine neue Meldung schickt.
3. Beim nächsten Anruf wählt Michael „später". Die Meldung stellt sich hinter alle Meldungen, die in diesem Moment warten. Wartet sonst keine, klingelt sie frühestens nach 5 Minuten wieder.
4. Michael beantwortet eine wartende Rückfrage direkt im Terminal. Binnen 5 s verschwindet sie aus der Warteschlange. Klingelt sie gerade, hört das Klingeln auf; läuft der Anruf schon, sagt die UI „In der Sitzung schon beantwortet" und legt ohne Senden auf. Dasselbe gilt, wenn die Sitzung geschlossen wird.
5. Eine Sitzung fragt nach einer Berechtigung (Befehl ausführen, Datei schreiben). Es klingelt nicht; der Eintrag steht nur in der Glocke, wie heute.
6. Ergebnis: Michael hört immer nur eine Meldung, das Dringende zuerst, und nichts klingelt, was schon erledigt ist.

### Ablauf F: Eine Sitzung selbst anrufen (AK-08)

<!-- leser: mensch -->

1. Michael öffnet die Glocke. Bei jedem Eintrag einer wartenden oder fertigen Sitzung (Rückfrage, Plan, fertig — nicht Berechtigung) steht ein Knopf „Anrufen".
2. Er klickt ihn. Der Anruf beginnt sofort ohne Klingeln mit der Sprechfassung (weiter wie Ablauf B, C oder D).
3. Klingelt gerade eine andere Meldung, geht diese an ihren Platz in der Warteschlange zurück. Läuft schon ein angenommener Anruf, ist der Knopf gesperrt mit dem Hinweis „Erst den laufenden Anruf beenden".
4. Ergebnis: Auch abgelehnte und ältere Meldungen lassen sich per Stimme beantworten.

### Ablauf G: Betrieb — Sprachmodelle einrichten (AK-16, AK-18)

<!-- leser: mensch -->

1. Michael führt einmal die Einrichtung der UI aus (oder einen eigenen Einrichtungsschritt für die Sprache). Die Einrichtung lädt die Modelle für Erkennung und Stimme einmal aus dem Netz auf den Mac und nennt Größe und Quelle.
2. Danach funktionieren Erkennung und Stimme ohne Netz. Probe: Netz trennen, Anruf annehmen, sprechen, senden.
3. Fehlt ein Modell oder ist eine Datei beschädigt, zeigt die UI Ablauf A, Schritt 3.
4. Ergebnis: Keine laufenden Kosten, keine Sprache verlässt den Mac.

## 3. Fachliche Anforderungen

<!-- leser: mensch -->

<!-- Eine Zeile = eine prüfbare Aussage. Modalverben groß. Herkunft = AK/Z/NZ aus intent.md oder „neu (Grund)". -->

| ID | Anforderung | Herkunft | Prüfung |
|---|---|---|---|
| FA-01 | Das System MUSS einen Schalter „Anrufmodus" bieten, Standard aus; die Einstellung MUSS einen Neustart von UI und Backend überstehen. | AK-01 | Test |
| FA-02 | Solange der Anrufmodus aus ist, DARF das System weder klingeln noch vorlesen noch die Agenten um eine Sprechfassung bitten; Glocke, Glockenton und Terminal MÜSSEN sich wie vor dem Vorhaben verhalten. | AK-01 | Test |
| FA-03 | Wenn eine UI-Sitzung eine Rückfrage stellt, eine Plan-Freigabe braucht oder fertig wird und der Anrufmodus an ist, MUSS die UI binnen 5 s einen Anruf mit Sitzungsname, Projektname und Art anzeigen und mit einem Klingelton ankündigen, der sich vom Glockenton unterscheidet. | AK-02 | Test |
| FA-04 | Liegt der UI-Tab im Hintergrund, MUSS ein Anruf zusätzlich eine Systemmitteilung auslösen; ist kein UI-Fenster offen, DARF nichts klingeln, und die Meldungen stehen beim Öffnen in der Glocke. | AK-02, OF-04 | Test |
| FA-05 | Berechtigungsfragen, Fehlerabbrüche einer Sitzung und Blockaden unbekannter Art DÜRFEN KEINEN Anruf auslösen; sie erscheinen in der Glocke wie heute. | AK-15, NZ-04 | Test |
| FA-06 | Solange ein Anruf klingelt oder läuft, MUSS jede weitere Meldung in die Warteschlange, statt zu klingeln; die Anruf-Anzeige MUSS die Zahl der wartenden Meldungen nennen. | AK-03 | Test |
| FA-07 | Die Warteschlange MUSS Rückfragen und Plan-Freigaben vor Fertig-Meldungen reihen, innerhalb einer Art nach Eingangszeit; nach einem Anruf MUSS die erste wartende Meldung klingeln. | AK-04 | Test |
| FA-08 | Schickt dieselbe Sitzung eine neue Meldung, während ihre alte noch wartet, MUSS die neue die alte ersetzen (eine Sitzung, höchstens ein Eintrag in der Warteschlange). | AK-03, AK-04 (Randfall) | Test |
| FA-09 | Wenn Michael ablehnt, MUSS die Meldung die Warteschlange verlassen, in der Glocke bleiben und DARF erst mit einer neuen Meldung derselben Sitzung wieder klingeln. | AK-05 | Test |
| FA-10 | Wenn Michael „später" wählt, MUSS die Meldung hinter alle in diesem Moment wartenden Meldungen; ist sie danach die einzige, DARF sie frühestens nach 5 Minuten erneut klingeln. | AK-06 | Test |
| FA-11 | Wird eine wartende oder klingelnde Meldung auf anderem Weg erledigt (Antwort oder Plan-Entscheidung im Terminal, Sitzung geschlossen oder arbeitet wieder), MUSS sie binnen 5 s die Warteschlange verlassen bzw. das Klingeln enden; in einem laufenden Anruf MUSS die UI das ansagen und ohne Senden auflegen. | AK-07 | Test |
| FA-12 | Die Glocke MUSS bei jedem Eintrag einer Rückfrage, Plan-Freigabe oder Fertig-Meldung einen Knopf „Anrufen" zeigen, solange der Anrufmodus an ist; der Anruf beginnt ohne Klingeln; eine klingelnde Meldung geht an ihren Platz zurück; während eines angenommenen Anrufs ist der Knopf gesperrt mit Grund. | AK-08 | Test |
| FA-13 | Nach Annahme MUSS die UI vorlesen: bei „fertig" die Sprechfassung des Ergebnisses, bei einer Rückfrage die Frage und die Möglichkeiten mit Nummer (ohne deren Beschreibungen), bei einer Plan-Freigabe die Sprechfassung des Plans. | AK-09 | Stichprobe |
| FA-14 | Solange der Anrufmodus an ist, MÜSSEN die Agenten der UI-Sitzungen am Ende jeder Antwort, die sie beenden, und vor jeder Plan-Vorlage eine Sprechfassung als erkennbar abgesetzten Absatz schreiben, der auch im Terminal sichtbar ist. | AK-09, B-04, OF-01 | Stichprobe |
| FA-15 | Was die UI vorliest, MUSS höchstens 80 Wörter umfassen und DARF KEINE Codeblöcke, Dateipfade, Tabellen oder Links enthalten; liefert der Agent mehr, MUSS die UI bereinigen und am letzten Satzende vor der Grenze kürzen und „gekürzt" ansagen. | AK-10 | Test |
| FA-16 | Übersteigen Frage und Möglichkeiten einer Rückfrage 80 Wörter, MUSS die UI die ersten Möglichkeiten bis zur Grenze vorlesen und „und n weitere, auf dem Bildschirm" sagen; alle Möglichkeiten MÜSSEN angezeigt werden. | AK-10 | Test |
| FA-17 | Falls eine Meldung keine Sprechfassung mitbringt, MUSS die UI das ansagen und höchstens die ersten zwei Sätze der letzten Antwort (bei einer Plan-Freigabe: des Plans) vorlesen, bereinigt nach FA-15. | AK-11 | Test |
| FA-18 | Michael SOLL das Vorlesen unterbrechen und wiederholen lassen können („nochmal", Knopf, Taste). | neu (Verständlichkeit, Z-02) | Test |
| FA-19 | Das Mikrofon DARF nur hören, solange Michael die Sprechtaste hält oder zwischen Klick auf „Sprechen" und „Fertig"; es gibt kein Weckwort und kein dauernd offenes Mikrofon. | NZ-03 | Test |
| FA-20 | Wenn Michael spricht, MUSS die UI den erkannten Text anzeigen und darunter, als was er gesendet wird (neue Eingabe, Möglichkeit n, eigene Antwort, Überarbeitungswunsch); erst „senden" (Knopf, Taste oder gesprochenes Wort „senden") gibt ihn in die Sitzung, „verwerfen" und „nochmal sprechen" MÜSSEN möglich sein. | AK-12, OF-02 | Test |
| FA-21 | Bei einer Rückfrage MUSS die Sitzung bei Nummer oder Wortlaut einer Möglichkeit genau diese erhalten, sonst den Text als eigene Antwort; bei Mehrfachauswahl gelten alle genannten Nummern; bei mehreren Fragen MUSS die UI sie nacheinander abfragen und erst nach der letzten senden. | AK-13 | Test |
| FA-22 | Sagt Michael bei einer Plan-Freigabe „freigeben", MUSS die UI einmal ausdrücklich nachfragen und nur nach „ja" oder Klick auf „Freigeben" freigeben — mit der ersten Ja-Möglichkeit des Plan-Dialogs; jede andere Antwort gilt als nicht freigegeben. | AK-14 | Test |
| FA-23 | Jeder andere gesprochene Text bei einer Plan-Freigabe MUSS nach „senden" als Überarbeitungswunsch an den Agenten gehen; der Plan bleibt unfreigegeben. | AK-14, Z-03 | Test |
| FA-24 | Vor dem Senden MUSS die UI prüfen, dass die Sitzung noch im Zustand der Meldung ist (wartet auf Eingabe, zeigt dieselbe Rückfrage oder denselben Plan) und ihre Eingabezeile leer ist; sonst DARF sie nicht senden und MUSS den Grund ansagen und anzeigen. | Z-03 | Test |
| FA-25 | Nach erfolgreichem Senden MUSS die UI „Gesendet" sagen und auflegen; der Eintrag verlässt die Glocke wie bei einer Antwort im Terminal. Legt Michael ohne Senden auf, MUSS der Eintrag in der Glocke bleiben. | Z-01, Z-03 | Test |
| FA-26 | Spracherkennung und Sprachausgabe MÜSSEN ohne Verbindung zu einem Rechner außerhalb des Macs funktionieren; nur die einmalige Einrichtung DARF Modelle herunterladen. | AK-16, B-05, RB-01 | Test (Netz getrennt) |
| FA-27 | Das System DARF Audio und erkannten Text nur im Arbeitsspeicher und nur bis zum Ende des Anrufs halten — weder in Dateien noch im Nutzerzustand, im Protokoll oder in Logs; die an die Sitzung gesendete Antwort ist danach Teil der Sitzung wie eine getippte Eingabe. | AK-17, NZ-05 | Review |
| FA-28 | Falls Sprachmodelle oder Mikrofon fehlen oder die UI nicht in einem Browser am Mac läuft, auf dem auch das Backend läuft, MUSS die UI den Anrufmodus als nicht verfügbar mit Grund und nächstem Schritt anzeigen; Glocke und Glockenton MÜSSEN unverändert arbeiten. | AK-18, NZ-01 | Test |
| FA-29 | Ein Anruf MUSS vollständig per Tastatur bedienbar sein (annehmen, ablehnen, später, sprechen, senden, verwerfen, auflegen), jeder Knopf mit Beschriftung. | neu (`design.md` §5 Mindeststandard) | Test |
| FA-30 | Die Sprechfassung eines Agenten MUSS die Anweisung der Sitzung sein, nicht die Arbeit eines weiteren Modells; die UI kürzt und bereinigt nur (FA-15, FA-17). | B-04, RB-01 | Review |

## 4. Fehler- und Randfälle

<!-- leser: mensch -->

| Fall | Erwartetes Verhalten | Herkunft |
|---|---|---|
| Michael hat getippten Text in der Eingabezeile der Sitzung | nicht senden; Ansage und Anzeige „In der Eingabezeile steht noch Text — im Terminal abschicken oder löschen"; erkannter Text bleibt bis zum Auflegen sichtbar | FA-24 |
| Sitzung arbeitet wieder, bevor Michael „senden" sagt (z. B. im Terminal geantwortet) | nicht senden; Ansage „In der Sitzung schon beantwortet", auflegen | FA-11, FA-24 |
| Erkennung liefert leeren Text oder nur Rauschen | Anzeige „Nichts verstanden — nochmal sprechen"; nichts wird gesendet | FA-20 |
| Michael sagt bei der Plan-Nachfrage „ja, aber …" oder etwas Unklares | gilt als nicht freigegeben; Nachfrage wiederholen | FA-22 |
| Rückfrage mit mehreren Fragen, Michael legt nach der ersten auf | nichts gesendet; Meldung bleibt in der Glocke | FA-21, FA-25 |
| Wortlaut passt auf zwei Möglichkeiten | Anzeige „Eigene Antwort: …" mit Hinweis „passt auf 1 und 3 — Nummer sagen"; Michael kann neu sprechen | FA-20, FA-21 |
| Meldung einer Sitzung, die Michael gerade im angedockten Terminal sieht | klingelt trotzdem (AK-02 kennt keine Ausnahme) — siehe AN-S05 | AK-02 |
| Mehrere UI-Fenster am Mac offen | es klingelt in allen; Annehmen, Ablehnen oder „später" in einem beendet das Klingeln in den anderen | FA-03, AN-S07 |
| Seite wird während eines Anrufs neu geladen oder das Fenster geschlossen | Anruf endet ohne Senden; die Meldung steht wieder an ihrem Platz in der Warteschlange | FA-07, AN-S08 |
| Anrufmodus wird eingeschaltet, während schon Einträge in der Glocke stehen | diese klingeln nicht; nur neue Meldungen klingeln; alte lassen sich per „Anrufen" holen | FA-12, AN-S06 |
| Backend startet neu | Warteschlange ist leer; Einträge der Glocke bleiben wie heute (bis 24 h), klingeln aber nicht erneut | FA-07, AN-S08 |
| Sprechfassung länger als 80 Wörter oder mit Code/Pfad | bereinigt, am Satzende gekürzt, „gekürzt" angesagt | FA-15 |
| Rückfrage oder Plan wurde nur am Bildschirm erkannt (ohne Hook-Inhalt), Frage und Möglichkeiten sind nicht lesbar | Ansage „Rückfrage in Sitzung … — die Frage steht nur im Terminal"; Anruf bietet nur „Im Terminal öffnen" und Auflegen, keine Sprachantwort | FA-13, FA-17, AN-S11 |
| Mikrofon wird während des Anrufs entzogen oder abgesteckt | Ansage „Mikrofon nicht verfügbar"; Anruf endet ohne Senden, Meldung bleibt in der Glocke; Anrufmodus zeigt Grund | FA-28 |
| Sitzung schickt „fertig" direkt nach „Gesendet" (sehr kurze Antwort) | neue Meldung, klingelt normal nach der Warteschlangen-Regel | FA-07 |
| Nicht-Claude-Sitzung (Codex nativ) | meldet sich nicht, klingelt nie | NZ-02 |
| UI am Handy (über das Heimnetz) oder auf dem Cloud-Host | Anrufmodus nicht verfügbar mit Grund; Glocke wie heute | FA-28, NZ-01 |

## 5. Daten, fachlich

<!-- leser: agent -->

<!-- Welche fachlichen Informationen sichtbar werden, entstehen, sich ändern oder verschwinden. Ohne Tabellen- oder Feldnamen. Datenklasse laut security.md nennen. -->

| Information | Entsteht / ändert sich / verschwindet | Wer sieht sie | Datenklasse |
|---|---|---|---|
| Einstellung „Anrufmodus an/aus" | entsteht beim ersten Umschalten; ändert sich per Schalter; überlebt Neustarts | Michael | intern |
| Verfügbarkeit mit Grund (Modelle, Mikrofon, Rechner) | wird bei jedem Öffnen der Einstellungen und vor jedem Anruf neu ermittelt, nicht gespeichert | Michael | intern |
| Sprechfassung einer Meldung | entsteht mit der Antwort des Agenten (steht damit auch im Terminal und im Gesprächsverlauf der Sitzung); die UI hält sie, solange die Meldung wartet oder der Anruf läuft; verschwindet mit Erledigung der Meldung | Michael | intern (Projektinhalte des jeweiligen Projekts) |
| Frage und Möglichkeiten einer Rückfrage, Kern eines Plans | kommen mit der Meldung; Lebensdauer wie Sprechfassung | Michael | intern (Projektinhalte) |
| Warteschlange (welche Sitzung, Art, Eingangszeit, „später"-Zeitpunkt) | ändert sich mit jeder Meldung, jedem Anruf, jeder Erledigung; überlebt keinen Backend-Neustart | Michael | intern |
| Audio vom Mikrofon | nur während Sprechtaste gedrückt bzw. zwischen „Sprechen" und „Fertig"; verschwindet spätestens beim Auflegen; nie auf Platte | niemand außer der Erkennung | intern (Stimme, personenbezogen) |
| Erkannter Text | entsteht nach dem Sprechen; verschwindet bei Senden, Verwerfen oder Auflegen; nie auf Platte, nie im Protokoll | Michael | intern (personenbezogen möglich) |
| Gesendete Antwort | wird Eingabe der Sitzung — ab da wie eine getippte Eingabe Teil des Gesprächsverlaufs von Claude Code (außerhalb der UI) | Michael, Sitzung | intern |
| Sprachmodelle | einmal bei der Einrichtung heruntergeladen, liegen auf dem Mac außerhalb des Repos | — | öffentlich (Fremdmaterial mit Lizenz), nie im Repo |

## 6. Was der Nutzer sieht

<!-- leser: mensch -->

<!-- Nur bei UI-Änderung. Beschreibung in Worten; Mock unter `design/` (Pfad nennen), sonst „kein Mock nötig, weil …". -->

- **Einstellungen:** ein Schalter „Anrufmodus" mit einem Satz Erklärung; ist er nicht verfügbar, darunter der Grund mit nächstem Schritt, der Schalter ist gesperrt.
- **Anruf-Anzeige:** ein Kasten über der Seite, der auf jeder Seite erscheinen kann, ohne die Kopfzeile zu verändern. Inhalt je Zustand:
    - klingelt: Art (Rückfrage, Plan, fertig), Sitzungsname, Projektname, „noch n warten"; Knöpfe „Annehmen", „Später", „Ablehnen"
    - liest vor: der vorgelesene Text zum Mitlesen; Knöpfe „Nochmal", „Sprechen", „Auflegen"; bei einer Rückfrage alle Möglichkeiten mit Nummer
    - hört zu: Hinweis „Ich höre zu", Knopf „Fertig"
    - bestätigen: erkannter Text, darunter „Wird gesendet als: …"; Knöpfe „Senden", „Nochmal sprechen", „Verwerfen"
    - Plan-Nachfrage: „Plan für Sitzung … wirklich freigeben?"; Knöpfe „Freigeben", „Nein"
    - Ergebnis: „Gesendet" oder der Grund, warum nicht (kurz sichtbar, dann schließt der Kasten)
- **Glocke:** bei jedem Eintrag einer Rückfrage, Plan-Freigabe oder Fertig-Meldung ein Knopf „Anrufen", solange der Anrufmodus an ist. Sonst unverändert.
- **Terminal:** am Ende jeder Antwort ein kurzer, abgesetzter Absatz mit der Sprechfassung, solange der Anrufmodus an ist.
- **Systemmitteilung des Macs** bei einem Anruf, wenn der Tab im Hintergrund liegt.
- Mock: Pflicht nach `design.md` §6 (neuer Ablauf). Entsteht im Plan Mode unter `intent/INT-2026-025-agenten-anrufe/design/` vor der Plan-Freigabe (Zustände der Anruf-Anzeige, Einstellung, Glocke mit „Anrufen").

## 7. Bedenken aus den Projekt-Docs

<!-- leser: agent -->

<!-- PFLICHT. Beim Schreiben wurden product-brief, architecture, security, design gelesen. Alles, was dort reibt, steht hier — markiert, nicht entschieden.
     „Geklärt" heißt: die zuständige Rolle hat entschieden; Entscheidung steht in der Spalte. Vor der Freigabe muss jede Zeile geklärt oder als „offen, blockiert nicht, weil …" begründet sein.
     Gibt es nichts: „Keine — geprüft gegen Stand [sha]." -->

| Quelle | Bedenken | Betrifft | Geklärt? (wer, wann, wie) |
|---|---|---|---|
| security.md §2 (Vertrauensannahme), architecture.md §2/§8 (ADR-0004), Code `ui/src/server/services/claude-hooks.ts:147-160` | Seit INT-2026-011 liest die UI keine Dialoginhalte und Turn-Texte mehr aus den Hooks, nur eine Vorschau von 160 Zeichen und die erste Frage. Sprechfassung, alle Möglichkeiten einer Rückfrage und der Plan-Kern verlangen, dass wieder Inhalt aus den Hooks gelesen wird. Das berührt ADR-0004. | FA-13, FA-14, FA-16, FA-17 | offen — an den Plan delegiert, nicht blockierend. Vorschlag: neues ADR, das ADR-0004 für diesen Zweck ergänzt (Inhalt nur flüchtig im Speicher, nur solange Anrufmodus an, kein Transkript-Leser) |
| architecture.md §3 (Terminal-Sitzungen, Disk-Registry mit Marke „fertig" bis 24 h) | Wird die Sprechfassung mit der Marke zusammen gespeichert, landet Projektinhalt auf Platte. AK-17 verbietet das nur für Audio und erkannten Text, FA-27 und §5 sehen die Sprechfassung nur im Speicher. | FA-27, §5 | offen — an den Plan delegiert, nicht blockierend. Vorschlag: Sprechfassung nie in die Registry; nach Neustart gilt FA-17 (Rückfall) |
| architecture.md §3 (Nutzerzustand: Protokoll inkl. Freitext-Einträgen), security.md §1 | Gehen gesprochene Antworten über den bestehenden Review-Kanal, entstehen Protokolleinträge mit dem erkannten Text auf Platte — Widerspruch zu AK-17/NZ-05. | FA-27 | offen — an den Plan delegiert, nicht blockierend. Vorschlag: Sprachantworten ohne Protokolleintrag oder nur mit Eintrag „per Stimme beantwortet" ohne Text |
| architecture.md AR-05 | Einstellung und Warteschlange sind Nutzerzustand und gehören ins Backend; zugleich klingelt nur ein Browser am Mac (FA-28). Gerätelokale Regel darf nicht in `localStorage` wandern. | FA-01, FA-07, FA-28 | offen — an den Plan delegiert, nicht blockierend. Vorschlag: Schalter und Warteschlange im Backend, „darf klingeln" als Eigenschaft der Verbindung, nicht gespeichert |
| architecture.md AR-08 | Antworten in Rückfrage- und Plan-Dialoge sind Tastendruck in einen Dialog: nur in einen gerade gelesenen Zustand, Nachlesen nach jeder Taste, feste Obergrenze. | FA-21, FA-22, FA-24 | offen — an den Plan delegiert, nicht blockierend. Vorschlag: die vorhandenen Tastenfolgen für Rückfrage und Plan-Entscheidung (Dialog-Treiber, Plan-Review) und den Review-Kanal nutzen, keinen zweiten Weg bauen. Wählt die erste Ja-Möglichkeit „ohne Einzelbestätigung", arbeitet der Agent danach ohne weitere Berechtigungsfragen — im Plan offenlegen (AN-S10) |
| architecture.md §5, security.md §6 („externes System anbinden"), intent ER-02 | Modelle sind neue externe Abhängigkeit mit Lizenz und Größe; Download-Quelle ist ein externes System zur Einrichtungszeit. | FA-26, Ablauf G | offen — an den Plan delegiert, nicht blockierend. Vorschlag: Modellwahl nach Messung EK-01 bis EK-03 mit Lizenz, Größe, Quelle und Ausfallverhalten vorlegen (OF-03) |
| security.md §6 Zeile 1 (Endpunkt anlegen oder ändern) | Neue Nachrichten zwischen UI und Backend (Anruf annehmen, senden, Anrufmodus) brauchen Zugriffsbegrenzung, Eingabevalidierung und Datenklasse der Antwort. | FA-12, FA-20 bis FA-24 | offen — an den Plan delegiert, nicht blockierend. Vorschlag: nur WebSocket-Nachrichten mit Validierung wie `session.assign`, kein neuer HTTP-Endpunkt |
| security.md §3 (Sprachdienst-Zeile, Guard `check-no-voice-config`), intent RB-02 | Neue Sprach-Konfiguration darf nicht an den alten, gesperrten Dateinamen stoßen; keine Modellgewichte oder Audiodateien im Repo. | FA-26 | offen — an den Plan delegiert, nicht blockierend. Vorschlag: anderer Name, Modelle außerhalb des Repos; §3-Zeile im Plan nachziehen |
| architecture.md AR-01, AR-06, intent RB-03 | Lädt `setup-ui.sh` Modelle oder liefert der Framework-Teil eine Anweisung für die Sprechfassung aus, gilt Manifest-Pflicht; die Anweisung darf ohne UI nichts bewirken. | FA-14, Ablauf G | offen — an den Plan delegiert, nicht blockierend. Vorschlag: Anweisung nur in UI-Sitzungen und nur bei Anrufmodus an einspielen, nichts in die Projekt-`CLAUDE.md` |
| design.md §1 Prinzip 5 (Rahmen = Kopfzeile, sonst nichts) | Die Anruf-Anzeige ist ein neues Element über jeder Seite. | §6 | offen — an den Plan delegiert, nicht blockierend. Vorschlag: Anruf als vorübergehender Kasten wie ein Dialog, Kopfzeile bleibt unverändert; Mock klärt die Lage |
| design.md §4 (Muster Glocke) | Neuer Knopf „Anrufen" je Eintrag; das Muster sagt, ein Eintrag bleibt bis zur Antwort — gilt auch für Ablehnen und Auflegen (FA-09, FA-25), passt. | FA-12 | offen — an den Plan delegiert, nicht blockierend. Vorschlag: `design.md` §4 um „Anrufen" und Anruf-Muster ergänzen |
| design.md §6 (Mock-Pflicht) | Neuer Ablauf in der Web-UI → Mock Pflicht. | §6 | offen — an den Plan delegiert, nicht blockierend: Mock entsteht im Plan Mode vor Plan-Freigabe |
| design.md §5 (Mindeststandard) | Tastatur, Labels, Fokus sichtbar gelten auch für die Anruf-Anzeige. | FA-29 | in FA-29 aufgenommen (Agent, 27.09.) |
| architecture.md §10 (Team-Ansicht, `settings.voice.get` nur `ack`) | Entfernen der ersetzten Voice-Reste verkleinert die Abweichung; die Team-Ansicht selbst bleibt (NZ-07). | §8 | offen — an den Plan delegiert, nicht blockierend: Zeile §10 im Plan anpassen, nicht vergrößern |
| product-brief.md §5 (Kernfunktionen), §9 (Umgebungen) | Neue Kernfunktion der Web-UI; nur auf dem Mac, nicht auf dem Cloud-Host und am Handy. Widerspricht keinem Nicht-Ziel (§7). | FA-28 | offen — an den Plan delegiert, nicht blockierend: §5-Zeile Web-UI im Plan ergänzen |

## 8. Nicht im Umfang

<!-- leser: mensch -->

<!-- Aus NZ der intent.md plus alles, was beim Schreiben ausgeschlossen wurde. -->

- NZ-01: Handy und Cloud-Host — dort ist der Anrufmodus „nicht verfügbar".
- NZ-02: Sitzungen außerhalb der UI und Sitzungen fremder Agenten-CLIs ohne Hooks (Codex nativ).
- NZ-03: Weckwort, dauernd offenes Mikrofon.
- NZ-04: Berechtigungsfragen per Stimme; sie klingeln nicht.
- NZ-05: Mitschnitt von Audio oder Gesprächsverlauf durch die UI.
- NZ-06: Kostenpflichtige Sprachdienste, die alte Anruf-Ansicht.
- NZ-07: Aufräumen der Team-Ansicht; nur die ersetzten Voice-Reste gehen mit weg.
- Fehlerabbrüche einer Sitzung (API-Fehler) und Blockaden unbekannter Art klingeln nicht (FA-05).
- Englische oder andere Sprachen: Erkennung und Stimme nur Deutsch; englische Fachbegriffe im deutschen Satz müssen erkannt werden (EK-03).
- Kein Vorlesen ganzer Antworten, kein Vorlesen der Beschreibungen von Rückfrage-Möglichkeiten.
- Keine Anrufe an mehrere Menschen, keine Weiterleitung.

## 9. Annahmen

<!-- leser: mensch -->

<!-- Vorläufige Auslegungen nach ER-00 der intent.md. Werden bei der Freigabe gesammelt bestätigt. -->

- **AN-S01 (OF-01):** Die Sprechfassung steht auch im Terminal, als kurzer, abgesetzter Absatz am Ende der Antwort. — bestätigt am 2026-09-27 von Product Owner (Michael Sindlinger), im Chat „Freigabe: spec.md (Stand 2026-09-27 14:54)"
- **AN-S02 (OF-02):** Senden geht per Knopf, per Taste und per gesprochenem Wort „senden"; ebenso „verwerfen". — bestätigt am 2026-09-27 von Product Owner (Michael Sindlinger), im Chat „Freigabe: spec.md (Stand 2026-09-27 14:54)"
- **AN-S03 (OF-04):** Liegt der Tab im Hintergrund, klingelt er mit Ton plus Systemmitteilung; ist kein UI-Fenster offen, klingelt nichts, die Meldungen stehen in der Glocke. — bestätigt am 2026-09-27 von Product Owner (Michael Sindlinger), im Chat „Freigabe: spec.md (Stand 2026-09-27 14:54)"
- **AN-S04:** Die Agenten schreiben die Sprechfassung nur, solange der Anrufmodus an ist; ausgeschaltet sehen Antworten aus wie heute (engste Auslegung von AK-01). — bestätigt am 2026-09-27 von Product Owner (Michael Sindlinger), im Chat „Freigabe: spec.md (Stand 2026-09-27 14:54)"
- **AN-S05:** Auch die Sitzung, die Michael gerade im Terminal sieht, klingelt; AK-02 nennt keine Ausnahme. Alternative: sichtbare Sitzung klingelt nicht, wie sie heute auch nicht in der Glocke steht. — bestätigt am 2026-09-27 von Product Owner (Michael Sindlinger), im Chat „Freigabe: spec.md (Stand 2026-09-27 14:54)"
- **AN-S06:** Beim Einschalten klingeln nur neue Meldungen; was schon in der Glocke steht, holt Michael per „Anrufen". — bestätigt am 2026-09-27 von Product Owner (Michael Sindlinger), im Chat „Freigabe: spec.md (Stand 2026-09-27 14:54)"
- **AN-S07:** Die Warteschlange gibt es einmal für den Mac; sind mehrere UI-Fenster offen, klingeln alle, die erste Reaktion gilt. — bestätigt am 2026-09-27 von Product Owner (Michael Sindlinger), im Chat „Freigabe: spec.md (Stand 2026-09-27 14:54)"
- **AN-S08:** Die Warteschlange lebt nur, solange das Backend läuft; Neuladen der Seite beendet einen Anruf ohne Senden, die Meldung wartet wieder an ihrem Platz. — bestätigt am 2026-09-27 von Product Owner (Michael Sindlinger), im Chat „Freigabe: spec.md (Stand 2026-09-27 14:54)"
- **AN-S09:** „Später" stellt die Meldung hinter alle, die in diesem Moment warten, auch hinter Fertig-Meldungen (AK-06 vor AK-04 für diesen Fall); wartet sonst keine, klingelt sie frühestens nach 5 Minuten wieder. — bestätigt am 2026-09-27 von Product Owner (Michael Sindlinger), im Chat „Freigabe: spec.md (Stand 2026-09-27 14:54)"
- **AN-S10:** Die Plan-Freigabe per Stimme wählt im Plan-Dialog der Sitzung die erste Ja-Möglichkeit, wie Michael sie im Terminal wählen würde; jede andere Sprachantwort auf einen Plan geht als Überarbeitungswunsch zurück. Welche Ja-Möglichkeit das bei der aktuellen Claude-Code-Fassung ist (mit oder ohne Einzelbestätigung der Dateiänderungen), legt der Plan offen. — bestätigt am 2026-09-27 von Product Owner (Michael Sindlinger), im Chat „Freigabe: spec.md (Stand 2026-09-27 14:54)"
- **AN-S11:** Rückfragen und Pläne, die die UI nur am Bildschirm erkannt hat (ohne Inhalt aus der Meldung), klingeln, lassen sich aber nicht per Stimme beantworten; der Anruf nennt die Sitzung und bietet „Im Terminal öffnen". — bestätigt am 2026-09-27 von Product Owner (Michael Sindlinger), im Chat „Freigabe: spec.md (Stand 2026-09-27 14:54)"
- **AN-S12:** Bei einer Rückfrage mit mehreren Fragen fragt die UI sie nacheinander im selben Anruf ab und sendet erst nach der letzten; wer vorher auflegt, sendet nichts. — bestätigt am 2026-09-27 von Product Owner (Michael Sindlinger), im Chat „Freigabe: spec.md (Stand 2026-09-27 14:54)"
- **AN-S13:** „Nicht verfügbar" gilt auch, wenn der Browser nicht auf dem Rechner des Backends läuft (Handy über das Heimnetz, Cloud-Host) — so bleibt NZ-01 sichtbar statt still. — bestätigt am 2026-09-27 von Product Owner (Michael Sindlinger), im Chat „Freigabe: spec.md (Stand 2026-09-27 14:54)"
- **AN-S14:** Die Sprechfassung eines Plans schreibt der Agent vor der Plan-Vorlage; fehlt sie, liest die UI die ersten zwei Sätze des Plans (AK-11 sinngemäß: „letzte Antwort" = Plantext). — bestätigt am 2026-09-27 von Product Owner (Michael Sindlinger), im Chat „Freigabe: spec.md (Stand 2026-09-27 14:54)"

## 10. Freigabe

<!-- leser: agent -->

- [x] Jede FA hat Herkunft und Prüfung.
- [x] Jedes AK der intent.md ist von mindestens einer FA abgedeckt: AK-01 → FA-01, FA-02 · AK-02 → FA-03, FA-04 · AK-03 → FA-06, FA-08 · AK-04 → FA-07, FA-08 · AK-05 → FA-09 · AK-06 → FA-10 · AK-07 → FA-11 · AK-08 → FA-12 · AK-09 → FA-13, FA-14 · AK-10 → FA-15, FA-16 · AK-11 → FA-17 · AK-12 → FA-20 · AK-13 → FA-21 · AK-14 → FA-22, FA-23 · AK-15 → FA-05 · AK-16 → FA-26 · AK-17 → FA-27 · AK-18 → FA-28.
- [x] Abschnitt 7 vollständig geklärt oder begründet offen.
- [x] Keine Technik, keine Architektur, keine Dateinamen in diesem Dokument (Pfade nur als Herkunft in Abschnitt 7 und als Mock-Ablage).
- [x] Bei risikoklasse hoch: Tech Lead hat gelesen. — entfällt (mittel)
- [x] Abgleich Mensch/Agent: Mensch-Teil gegen Agenten-Teil geprüft (2026-09-27), Befund: Ablauf D versprach „dieselbe Freigabe wie der Knopf der Vorhaben-Seite" — der Knopf gibt Dokumente frei, nicht den Plan-Dialog einer Sitzung; korrigiert in Ablauf D, FA-22, AN-S10 und §7 (AR-08-Zeile). Sonst deckungsgleich (§1/§2/§6 gegen §5 Datenlebensdauer und §7 Vorschläge).
- **Freigegeben:** Product Owner (Michael Sindlinger), 2026-09-27, Commit folgt (dieser Freigabe-Commit)
