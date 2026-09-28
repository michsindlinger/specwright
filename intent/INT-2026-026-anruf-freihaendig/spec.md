# Spec: UI: Anruf freihändig — Mikrofon nach dem Vorlesen, Senden per Schlusswort

> **Intent:** `intent.md` (INT-2026-026, Version 1.0.0)
> **Status:** freigegeben
> **Erstellt:** 2026-09-28 · **Freigabe:** Product Owner (Michael Sindlinger), 2026-09-28
> **Gelesene Projekt-Docs:** `docs/product-brief.md`, `docs/architecture.md`, `docs/security.md`, `docs/design.md` (Stand: Commit c56ac0c)

<!-- Die Spec ist FACHLICH. Sie beschreibt, was Nutzer erleben und was fachlich gelten muss.
     Nicht hinein gehören: Dateien, Komponenten, Datenbanktabellen, Bibliotheken, Architekturentscheidungen. Das ist plan.md.
     Die Projekt-Docs werden gelesen und dürfen hier nur BEDENKEN markieren (Abschnitt 7). Sie entscheiden nichts.
     Jede Anforderung verweist auf ein Ziel oder Abnahmekriterium der intent.md. Keine Anforderung ohne Herkunft. -->

## 1. Zusammenfassung

<!-- leser: mensch -->

Nach der Annahme eines Anrufs braucht Michael keine Hand mehr: Die UI liest vor, öffnet danach von selbst das Mikrofon und hört zu, bis er mit „Antwort senden" oder „Antwort absenden" abschließt; dann geht die Antwort sofort und ohne Rückfrage an die Sitzung (Z-01, AK-01, AK-03). Nichts geht ohne dieses Schlusswort am Ende raus; 20 Sekunden Stille legen auf, ohne zu senden (Z-02, AK-04, AK-05). Ein Plan wird mit „freigeben" und einem zweiten „ja" freigegeben, weiterhin nur mit Nachfrage (Z-03, AK-06).

Das ändert aus INT-2026-025: Mikrofon nur auf Knopfdruck (FA-19 dort), Senden nur nach Vorlesen und Bestätigung (FA-20, AK-12 dort), Sprechtaste (O3 dort). Alles andere am Anruf bleibt wie in INT-2026-025.

## 2. Nutzer und Abläufe

<!-- leser: mensch -->

Nutzer ist Michael am Mac mit eingeschaltetem Anrufmodus. Klingeln, Annehmen, Ablehnen, „Später", Warteschlange und Glocke bleiben wie in INT-2026-025.

### Ablauf A: Fertig-Meldung freihändig beantworten (AK-01, AK-03, AK-08)

<!-- leser: mensch -->

1. Michael nimmt einen Anruf an. Die UI liest die Sprechfassung vor.
2. Nach dem letzten vorgelesenen Wort öffnet sich das Mikrofon. Der Kasten zeigt „Ich höre zu" und den Hinweis „Zum Senden: ‚Antwort senden'".
3. Michael spricht: „Mach bitte noch die Tests für den Randfall mit leerem Namen." Pause. „Und dann den PR aufmachen. Antwort senden."
4. Nach jeder Sprechpause steht der bisher verstandene Text im Kasten, darunter, als was er gesendet wird („Neue Eingabe an Sitzung …").
5. Nach dem Schlusswort und der folgenden Pause bekommt die Sitzung „Mach bitte noch die Tests für den Randfall mit leerem Namen. Und dann den PR aufmachen." — ohne „Antwort senden". Die UI sagt „Gesendet" und legt auf; der Eintrag verlässt die Glocke.

### Ablauf B: Rückfrage beantworten (AK-07)

<!-- leser: mensch -->

1. Die UI liest die Frage und ihre Möglichkeiten vor, dann öffnet sich das Mikrofon.
2. Michael sagt „Die zweite. Antwort senden." → Die Sitzung erhält genau Möglichkeit 2.
3. Hat die Rückfrage mehrere Fragen, führt das Schlusswort zur nächsten Frage: Die UI liest sie vor, das Mikrofon öffnet wieder. Gesendet wird alles zusammen nach der letzten Frage.
4. Passt der Wortlaut auf keine Möglichkeit, geht er als eigene Antwort. Passt er auf zwei, sendet die UI nichts, sagt „Passt auf 1 und 3 — Nummer sagen", und das Mikrofon öffnet wieder.

### Ablauf C: Plan freigeben oder überarbeiten lassen (AK-06)

<!-- leser: mensch -->

1. Die UI liest den Kern des Plans vor, dann öffnet sich das Mikrofon.
2. Michael sagt nur „freigeben". Die UI fragt „Plan für Sitzung … wirklich freigeben? Sag ja oder nein." — mit dem Hinweis aus INT-2026-025, was die gewählte Option bedeutet. Danach öffnet sich das Mikrofon.
3. „Ja" → Freigabe, „Gesendet", auflegen. „Nein" → „Nicht freigegeben", das Mikrofon öffnet wieder. Alles andere → nicht freigegeben, Nachfrage wiederholt.
4. Statt „freigeben" kann Michael einen Wunsch sprechen: „Nimm das kleinere Modell. Antwort senden." → geht als Überarbeitungswunsch, der Plan bleibt unfreigegeben.

### Ablauf D: Nicht antworten (AK-05)

<!-- leser: mensch -->

1. Das Mikrofon ist offen, Michael sagt nichts — oder hört mitten in der Antwort auf.
2. 20 Sekunden nach dem letzten gesprochenen Wort (oder nach dem Öffnen des Mikrofons) sagt die UI „Keine Antwort, aufgelegt" und legt auf. Nichts wird gesendet, auch kein angefangener Text. Die Meldung bleibt in der Glocke.
3. Alternativ sagt Michael „auflegen" — sofort aufgelegt, ohne Senden.

### Ablauf E: Korrigieren (AK-04, AK-09)

<!-- leser: mensch -->

1. Michael merkt mitten im Diktat, dass er sich verrannt hat, und sagt „Antwort verwerfen". Das bisher Gesprochene ist gelöscht, die UI sagt „Verworfen", das Mikrofon öffnet wieder.
2. Oder er greift zur Maus: „Senden" schickt den angezeigten Text, „Verwerfen" löscht ihn, „Nochmal" liest erneut vor, „Auflegen" legt auf.

## 3. Fachliche Anforderungen

<!-- leser: mensch -->

| ID | Anforderung | Herkunft | Prüfung |
|---|---|---|---|
| FA-01 | Wenn die UI in einem angenommenen Anruf ihr Vorlesen beendet hat — Sprechfassung, Frage oder Folgefrage, Plan-Nachfrage oder Hinweis (etwa „Nicht verstanden", „Nicht freigegeben", „Verworfen", „Nicht gesendet: …") —, MUSS sie das Mikrofon ohne Klick und ohne Taste öffnen. | AK-01 | Test |
| FA-02 | Solange die UI spricht, DARF das Mikrofon NICHT hören; „Nochmal" (Knopf oder Wort) schließt es, liest erneut vor und öffnet es danach wieder. | AK-02 | Test |
| FA-03 | Das Mikrofon DARF nur offen sein, während ein angenommener Anruf im eigenen Fenster auf Antwort wartet — nicht beim Klingeln, nicht nach dem Auflegen, nicht in einem zweiten Fenster, nicht bei Anrufmodus aus. | NZ-01 | Test |
| FA-04 | Die UI MUSS das Gesprochene über Sprechpausen hinweg zu einem Text zusammensetzen, nach jeder Sprechpause den bisher verstandenen Text anzeigen und dabei Weitergesprochenes nicht verlieren. | AK-08, B-02 | Test |
| FA-05 | Wenn das Gesprochene vor einer Sprechpause mit „Antwort senden" oder „Antwort absenden" endet (Groß- und Kleinschreibung, Satzzeichen egal), MUSS die Sitzung den Text ohne dieses Schlusswort erhalten, ohne dass die UI den Text vorher vorliest oder eine Frist abwartet. | AK-03, B-01 | Test |
| FA-06 | Steht das Schlusswort nicht am Ende, DARF das System NICHT senden und MUSS weiter zuhören; endet das Gesprochene später mit dem Schlusswort, geht der ganze Text einschließlich des früheren „Antwort senden" in der Mitte. | AK-04 | Test |
| FA-07 | Endet das Gesprochene auf „senden" oder „absenden" ohne „Antwort" davor, DARF das System NICHT senden und MUSS den Hinweis „Zum Senden: ‚Antwort senden'" anzeigen, ohne ihn vorzulesen. | neu (Z-02; in INT-2026-025 reichte „senden" allein) | Test |
| FA-08 | Besteht das Gesprochene nur aus dem Schlusswort, DARF das System NICHT senden, außer ein gehaltener Text nach FA-17 oder FA-12 wartet. | AK-04, Z-02 | Test |
| FA-09 | Wenn 20 s lang nicht gesprochen wird, gezählt ab Öffnen des Mikrofons und neu ab jedem gesprochenen Wort, MUSS die UI „Keine Antwort, aufgelegt" sagen und ohne Senden auflegen; die Meldung bleibt in der Glocke und klingelt nicht erneut, bis die Sitzung eine neue Meldung schickt. | AK-05, B-05 | Test |
| FA-10 | Geräusche ohne Sprache (Lüfter, Tastatur, leise Musik) DÜRFEN die 20 s NICHT zurücksetzen. | AK-05, B-03 | Test (Geräusch) |
| FA-11 | Erreicht das Gesprochene zu einer Frage 2 Minuten, MUSS die UI „Antwort zu lang" sagen und nichts senden; der Text bleibt sichtbar und wird wie ein gehaltener Text nach FA-17 behandelt. | B-06 | Test |
| FA-12 | Endet das Gesprochene mit „Antwort verwerfen", MUSS die UI den bisherigen Text löschen, „Verworfen" sagen und wieder zuhören; nichts wird gesendet. | B-07 | Test |
| FA-13 | „freigeben", „ja", „nein", „nochmal" und „auflegen" MÜSSEN ohne Schlusswort wirken, wenn das Gesprochene seit dem Öffnen des Mikrofons genau dieses Wort ist; sonst sind sie Teil des Texts. „Auflegen" beendet den Anruf sofort ohne Senden. | B-04 | Test |
| FA-14 | Wenn Michael bei einer Plan-Freigabe „freigeben" sagt, MUSS die UI einmal nachfragen und nur nach „ja" oder Klick auf „Freigeben" freigeben; „nein" und jede andere Antwort geben nicht frei, 20 s Stille in der Nachfrage legen ohne Freigabe auf. | AK-06, Z-03 | Test |
| FA-15 | Jeder andere Text mit Schlusswort bei einer Plan-Freigabe MUSS als Überarbeitungswunsch an den Agenten gehen; der Plan bleibt unfreigegeben. | AK-03, Z-03 | Test |
| FA-16 | Bei einer Rückfrage MUSS die Sitzung bei Nummer oder Wortlaut einer Möglichkeit mit Schlusswort genau diese erhalten, bei Mehrfachauswahl alle genannten, sonst den Text als eigene Antwort; bei mehreren Fragen MUSS das Schlusswort zur nächsten Frage führen und erst nach der letzten gesendet werden; passt der Wortlaut auf mehrere Möglichkeiten, DARF NICHT gesendet werden, und die UI MUSS die passenden Nummern nennen. | AK-07 | Test |
| FA-17 | Scheitert das Senden (Sitzung nicht mehr im Zustand der Meldung, Text in der Eingabezeile), MUSS die UI „Nicht gesendet" mit Grund sagen, den Text halten und wieder zuhören; „Antwort senden" allein sendet den gehaltenen Text erneut, „Antwort verwerfen" löscht ihn, „auflegen" legt auf. Wurde die Meldung anderswo erledigt, gilt INT-2026-025: „In der Sitzung schon beantwortet", auflegen. | AK-01, Z-02 | Test |
| FA-18 | Nach erfolgreichem Senden MUSS die UI „Gesendet" sagen und auflegen, ohne das Mikrofon erneut zu öffnen; der Eintrag verlässt die Glocke wie bei einer Antwort im Terminal. *Geändert durch INT-2026-027: statt aufzulegen bleibt die Leitung 2 Minuten offen, das Mikrofon bleibt zu.* | AK-03, B-05 | Test |
| FA-19 | Solange das Mikrofon offen ist, MUSS der Kasten „Ich höre zu", den bisher verstandenen Text, als was er gesendet wird, und den Hinweis auf das Schlusswort zeigen. | AK-08 | Test |
| FA-20 | Jeder Schritt MUSS per Knopf und Tastatur möglich bleiben: annehmen, ablehnen, später, senden (schickt den angezeigten Text), verwerfen (löscht ihn, Zuhören geht weiter), nochmal, freigeben mit Nachfrage, im Terminal öffnen, auflegen; jeder Knopf beschriftet, Fokus sichtbar, ein klingelnder Anruf holt sich den Fokus nicht. | AK-09, `design.md` §5 | Test |
| FA-21 | Falls das Mikrofon sich nicht öffnen lässt oder während des Zuhörens verschwindet, dann MUSS die UI den Grund ansagen und anzeigen, ohne Senden; der Anruf bleibt per Knopf bedienbar, samt einem Knopf „Zuhören", der das Mikrofon erneut öffnet. | AK-10 | Test |
| FA-22 | Das System DARF Audio und erkannten Text nur im Arbeitsspeicher und nur bis zum Ende des Anrufs halten, auch bei bis zu 2 Minuten Zuhören je Frage. | RB-02 | Review |
| FA-23 | Antworten in Rückfrage- und Plan-Dialoge DÜRFEN nur in einen gerade gelesenen Zustand der Sitzung gehen, wie in INT-2026-025. | RB-03 | Test |
| FA-24 | Bei Anrufmodus aus MUSS alles unverändert bleiben; es gibt keinen eigenen Schalter „freihändig". | B-08 | Test |

## 4. Fehler- und Randfälle

<!-- leser: mensch -->

| Fall | Erwartetes Verhalten | Herkunft |
|---|---|---|
| „Das kannst du jetzt senden, und danach noch die Doku" | nichts gesendet, Zuhören geht weiter | FA-06 |
| „Soll ich die Antwort senden?" — als Frage gemeint, am Ende | gilt als Schlusswort, Text „Soll ich die" geht raus; bewusst hingenommen (Michael sagt „Antwort senden" nur als Abschluss) | FA-05, intent AN-05 |
| Erkennung macht aus dem Schlusswort „Antworten senden" | zählt als Schlusswort | B-01, intent AN-01 |
| Michael spricht weiter, während die UI den ersten Teil erkennt | nichts geht verloren, der Text wächst | FA-04 |
| Michael sagt nach einem Satz „auflegen" | „auflegen" wird Teil des Texts; aufgelegt wird nach 20 s Stille oder per „Antwort verwerfen", dann „auflegen" | FA-13 |
| Stille-Halluzination der Erkennung („Vielen Dank.") | verworfen wie in INT-2026-025; zählt nicht als Sprechen | FA-10 |
| Fremde Stimme im Raum hält das Mikrofon offen | kein Senden ohne Schlusswort; nach 2 Minuten „Antwort zu lang" | FA-06, FA-11 |
| Text in der Eingabezeile der Sitzung beim Senden | „Nicht gesendet: In der Eingabezeile steht noch Text", Text gehalten, Zuhören geht weiter | FA-17 |
| Im Terminal beantwortet, während die UI zuhört | „In der Sitzung schon beantwortet", aufgelegt | FA-17 |
| Mikrofon wird während des Zuhörens abgezogen | Ansage mit Grund, nichts gesendet, Knopf „Zuhören" | FA-21 |
| Anrufmodus wird während des Zuhörens ausgeschaltet | Anruf endet ohne Senden (wie INT-2026-025) | FA-03 |
| UI-Tab im Hintergrund | Vorlesen, Zuhören und Senden laufen wie im Vordergrund | FA-01, intent AN-02 |
| Nach „nein" in der Plan-Nachfrage folgt Stille | nach 20 s „Keine Antwort, aufgelegt", Plan unfreigegeben | FA-09, FA-14 |
| Rückfrage mit zwei Fragen, nach der ersten 20 s Stille | aufgelegt, nichts gesendet, Meldung in der Glocke | FA-09, FA-16 |

## 5. Daten, fachlich

<!-- leser: agent -->

| Information | Entsteht / ändert sich / verschwindet | Wer sieht sie | Datenklasse |
|---|---|---|---|
| Audio vom Mikrofon | entsteht ab Öffnen des Mikrofons, bis zu 2 Minuten je Frage; verschwindet nach der Erkennung jedes Abschnitts, spätestens bei Anrufende | niemand; nur die lokale Erkennung | intern (Stimme, personenbezogen) |
| Bisher verstandener Text | wächst nach jeder Sprechpause; verschwindet bei Senden, Verwerfen, Auflegen, Anrufende | Michael im Fenster, das den Anruf angenommen hat | intern (personenbezogen möglich) |
| Gehaltener Text nach gescheitertem Senden oder „zu lang" | bleibt bis Senden, Verwerfen oder Anrufende | wie oben | intern |
| Gesendete Antwort | wird Teil der Sitzung wie eine getippte Eingabe | wer die Sitzung sieht | intern (Projektinhalt) |

Kein neues gespeichertes Datum; kein Protokolleintrag.

## 6. Was der Nutzer sieht

<!-- leser: mensch -->

- **Anruf-Kasten, Zustand „läuft":** statt „Sprechen", „Fertig", „Senden"-Bestätigung ein Zuhör-Zustand: „Ich höre zu", der bisher verstandene Text mit „Wird gesendet als: …", der Hinweis „Zum Senden: ‚Antwort senden'"; Knöpfe „Senden", „Verwerfen", „Nochmal", bei Plan „Freigeben …", „Auflegen". Während die UI spricht, statt „Ich höre zu" der vorgelesene Text zum Mitlesen.
- **Mikrofon zu (Fehler, zu lang):** Grund und Knopf „Zuhören".
- **Plan-Nachfrage:** wie INT-2026-025, danach Zuhören.
- **Ende:** „Gesendet" bzw. „Keine Antwort, aufgelegt" kurz im Kasten, dann schließt er.
- Leertaste halten und die Knöpfe „Sprechen"/„Fertig" entfallen (AN-S04).
- Mock: Pflicht nach `design.md` §6 (geänderter Ablauf im Anruf-Kasten); entsteht im Plan Mode als `design/anruf-freihaendig-mock.png` neben dem Mock von INT-2026-025 (§7).

## 7. Bedenken aus den Projekt-Docs

<!-- leser: agent -->

| Quelle | Bedenken | Betrifft | Geklärt? (wer, wann, wie) |
|---|---|---|---|
| security.md §4 T-08 | Gegenmaßnahme „nichts ohne Anzeige und ‚Senden'" fällt weg; eine falsch erkannte, abgeschlossene Antwort geht ungeprüft raus. Plan-Freigabe bleibt mit Nachfrage. | FA-05, FA-14 | Risiko vom PO bewusst angenommen (intent AN-05, Freigabe 28.09.). T-08 im Plan neu fassen: Schlusswort am Ende, Einzelwort-Befehle nur als ganzer Text, Nachfrage bei Plan unverändert — offen, an den Plan delegiert, nicht blockierend |
| security.md §1 Zeile „Audio" | „nur zwischen ‚Sprechen' und ‚Fertig', höchstens 30 s" stimmt nicht mehr: automatisch geöffnet, bis 2 Minuten je Frage, abschnittsweise erkannt. | FA-01, FA-11, FA-22 | offen — an den Plan delegiert, nicht blockierend. Vorschlag: Zeile auf „nur während ein angenommener Anruf auf Antwort wartet, bis 2 min je Frage, nur Speicher" ändern |
| security.md §2 „Nachrichten des Anrufs" | Obergrenze Audio 30 s je Nachricht; Erkennung nach jeder Pause bedeutet mehr und andere Nachrichten; Validierung und Obergrenzen müssen neu stimmen. | FA-04, FA-11 | offen — an den Plan delegiert, nicht blockierend. Vorschlag: Obergrenze je Nachricht bleibt klein (Abschnitt), Gesamtdeckel 2 min je Frage im Backend durchgesetzt |
| architecture.md §2 Frontend-Zeile | „Aufnahme nur zwischen ‚Sprechen' und ‚Fertig'" wird falsch. | FA-01, FA-03 | offen — an den Plan delegiert: Zeile in derselben PR nachziehen; keine AR-Änderung erwartet |
| architecture.md §3 Zeile „Anruf-Inhalte" | Längeres Halten von Audio und Text im Speicher (gehaltener Text, 2 min); Datenbesitz unverändert Backend-Speicher. | FA-17, FA-22 | offen — an den Plan delegiert, nicht blockierend; kein neues Datenobjekt |
| architecture.md AR-08 | Senden ohne Bestätigung ändert nichts am Tipp-Pfad; Prüfung des Sitzungszustands vor jedem Senden bleibt. | FA-23 | geklärt: unverändert übernommen (Agent, 28.09.) |
| architecture.md §5 whisper.cpp | Häufigere Anfragen an die lokale Erkennung (je Pause); Ausfallverhalten wie bisher. | FA-04 | offen — an den Plan delegiert: Messung EK-01 im Plan Mode (intent AN-04) |
| design.md §4 Muster „Anruf" | Zustände „läuft" und Tastatur (Leertaste halten) ändern sich. | §6 | offen — an den Plan delegiert: Muster in derselben PR nachziehen |
| design.md §6 | Geänderter Ablauf → Mock Pflicht. | §6 | offen — an den Plan delegiert: Mock im Plan Mode vor Plan-Freigabe |
| design.md §5 Mindeststandard | Tastatur, Labels, Fokus auch für „Zuhören", „Verwerfen". | FA-20 | in FA-20 aufgenommen (Agent, 28.09.) |
| product-brief.md §5 Web-UI-Zeile | „nimmt die Antwort per Stimme entgegen" bleibt wahr; freihändig ergänzen. | Z-01 | offen — an den Plan delegiert, nicht blockierend |
| intent INT-2026-025 (spec.md FA-19, FA-20; plan.md O3; intent AK-12, NZ-03) | Dokumente sind `umgesetzt`/`angenommen` und dürfen nicht umgeschrieben werden. | alle | offen — an den Plan delegiert. Vorschlag: nur ein Verweis „geändert durch INT-2026-026" an den betroffenen Zeilen (ER-01) |

## 8. Nicht im Umfang

<!-- leser: mensch -->

- NZ-01: Weckwort, Mikrofon außerhalb eines angenommenen Anrufs.
- NZ-02: Dazwischenreden während des Vorlesens.
- NZ-03: Berechtigungsfragen per Stimme.
- NZ-04: anderes Erkennungsmodell oder Fremddienst.
- NZ-05: Mitschrift Wort für Wort während des Sprechens.
- Änderungen an Klingeln, Warteschlange, Sprechfassung und Glocke aus INT-2026-025.
- Einstellbare Stille-Dauer oder eigene Schlusswörter.

## 9. Annahmen

<!-- leser: mensch -->

- **AN-S01:** Eine Sprechpause, nach der erkannt und auf das Schlusswort geprüft wird, dauert etwa eine Sekunde; der genaue Wert fällt im Plan innerhalb von EK-01 und EK-04. — bestätigt am 2026-09-28 von Product Owner (Michael Sindlinger), im Chat „Freigabe: spec.md (Stand 2026-09-28 10:12)"
- **AN-S02:** Nach „Antwort zu lang" (2 Minuten) wird nichts mehr angehängt; der gehaltene Text lässt sich nur noch mit „Antwort senden" allein schicken, mit „Antwort verwerfen" löschen oder per Knopf bedienen. — bestätigt am 2026-09-28 von Product Owner (Michael Sindlinger), im Chat „Freigabe: spec.md (Stand 2026-09-28 10:12)"
- **AN-S03:** Einzelwort-Befehle („auflegen", „nochmal" …) gelten nur, wenn sie das ganze Gesprochene seit dem Öffnen des Mikrofons sind; mitten in einer Antwort sind sie Text. — bestätigt am 2026-09-28 von Product Owner (Michael Sindlinger), im Chat „Freigabe: spec.md (Stand 2026-09-28 10:12)"
- **AN-S04:** Leertaste halten und die Knöpfe „Sprechen"/„Fertig" entfallen; stattdessen gibt es „Zuhören" nur, wenn das Mikrofon zu ist. — bestätigt am 2026-09-28 von Product Owner (Michael Sindlinger), im Chat „Freigabe: spec.md (Stand 2026-09-28 10:12)"
- **AN-S05:** Nach gescheitertem Senden schickt „Antwort senden" allein den gehaltenen Text erneut. — bestätigt am 2026-09-28 von Product Owner (Michael Sindlinger), im Chat „Freigabe: spec.md (Stand 2026-09-28 10:12)"
- **AN-S06:** Der Hinweis bei „senden" ohne „Antwort" wird nur angezeigt, nicht vorgelesen, damit das Zuhören nicht unterbrochen wird. — bestätigt am 2026-09-28 von Product Owner (Michael Sindlinger), im Chat „Freigabe: spec.md (Stand 2026-09-28 10:12)"
- **AN-S07:** Nach Auflegen wegen Stille klingelt die Meldung nicht erneut, bis die Sitzung eine neue schickt (wie Auflegen ohne Senden heute). — bestätigt am 2026-09-28 von Product Owner (Michael Sindlinger), im Chat „Freigabe: spec.md (Stand 2026-09-28 10:12)"

## 10. Freigabe

<!-- leser: agent -->

- [x] Jede FA hat Herkunft und Prüfung.
- [x] Jedes AK der intent.md ist von mindestens einer FA abgedeckt: AK-01 → FA-01, FA-17 · AK-02 → FA-02 · AK-03 → FA-05, FA-15, FA-18 · AK-04 → FA-06, FA-08 · AK-05 → FA-09, FA-10 · AK-06 → FA-14 · AK-07 → FA-16 · AK-08 → FA-04, FA-19 · AK-09 → FA-20 · AK-10 → FA-21.
- [x] Abschnitt 7 vollständig geklärt oder begründet offen.
- [x] Keine Technik, keine Architektur, keine Dateinamen in diesem Dokument (außer Herkunft in §7 und Mock-Pfad in §6).
- [ ] Bei risikoklasse hoch: Tech Lead hat gelesen. — entfällt (mittel)
- [x] Abgleich Mensch/Agent: Mensch-Teil gegen Agenten-Teil geprüft (2026-09-28), Befund: keiner — §1/§2/§6 decken sich mit §5 (Datenlebensdauer bis Anrufende, 2 min) und §7 (T-08-Risiko ist in §4 Randfall „Soll ich die Antwort senden?" und intent AN-05 sichtbar)
- **Freigegeben:** Product Owner (Michael Sindlinger), 2026-09-28, Commit dieses Freigabe-Commits
