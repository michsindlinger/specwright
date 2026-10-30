# Spec: Sitzungswechsel per Handoff in einem Schritt

> **Intent:** `intent.md` (INT-2026-038, Version 1.0.0)
> **Status:** freigegeben
> **Erstellt:** 2026-10-29 · **Freigabe:** Michael (Product Owner), 2026-10-29
> **Gelesene Projekt-Docs:** `docs/product-brief.md`, `docs/architecture.md`, `docs/security.md`, `docs/design.md` (Stand: Commit b20dfa6)
> **Format:** 2.3

## 1. Zusammenfassung

<!-- leser: mensch -->

Im Cloud-Terminal der Web-UI startet Michael den Wechsel in eine frische Sitzung künftig mit einem Auslöser: dem Handoff-Knopf in der Terminal-Leiste oder dem Befehl `/handoff-weiter` (Z-01, AK-01, AK-02). Die Sitzung schreibt das Handoff, wird erst danach geleert und liest in der geleerten Sitzung genau dieses Handoff ein, zeigt eine Kurzfassung und wartet (Z-02, AK-03). Fehlt das Handoff, ist die Sitzung beschäftigt oder wird das Leeren nicht bestätigt, bleibt die alte Sitzung unangetastet und Michael sieht den Grund (Z-03, AK-04 bis AK-06). Die Skills `session-handoff`, `start-from-handoff` und der neue Befehl kommen mit Specwright in jedes Projekt und auf den Cloud-Host (Z-04, AK-07, AK-08).

## 2. Nutzer und Abläufe

<!-- leser: mensch -->

Nutzer ist Michael, am Mac und am Cloud-Host, jeweils im Cloud-Terminal der Web-UI. Alle drei Abläufe enden in derselben Folge „Handoff schreiben → prüfen → leeren → einlesen"; Knopf und Befehl unterscheiden sich nur im Auslöser.

### Ablauf A: Wechsel per Knopf (AK-01, AK-03, AK-05, AK-09)

<!-- leser: mensch -->

1. Michael arbeitet in einer Claude-Sitzung des Cloud-Terminals; die Sitzung wartet auf Eingabe, die Eingabezeile ist leer.
2. Michael drückt den Handoff-Knopf in der Terminal-Leiste.
3. Das System prüft am Bildschirm, dass die Sitzung wartet, kein Dialog offen ist und die Eingabezeile leer ist; dann gibt es den Handoff-Befehl in die Sitzung ein. Ab hier wie Ablauf B, Schritt 2.
4. Ist die Sitzung nicht bereit (arbeitet, zeigt einen Dialog, Text in der Eingabezeile), schreibt das System nichts und zeigt den Grund am Terminal, etwa „Nicht gestartet: Sitzung arbeitet noch — warte, bis sie fertig ist".

### Ablauf B: Wechsel per Befehl (AK-02, AK-03, AK-04, AK-06, AK-07)

<!-- leser: mensch -->

1. Michael tippt `/handoff-weiter` in eine Claude-Sitzung des Cloud-Terminals.
2. Die Sitzung schreibt ein Handoff im gewohnten Format an den gewohnten Ort (wie `/session-handoff`) und meldet am Ende den Dateinamen.
3. Das System merkt sich, dass für diese Sitzung ein Wechsel läuft, und wartet auf das Ende dieser Runde.
4. Nach dem Ende der Runde prüft das System, ob seit dem Auslösen eine neue Handoff-Datei entstanden ist.
5. Liegt sie vor, leert das System die Sitzung und wartet auf die Bestätigung, dass eine neue Unterhaltung begonnen hat.
6. Nach der Bestätigung gibt das System den Einlese-Befehl für genau diese Datei ein, im Lesemodus.
7. Ergebnis: Die geleerte Sitzung zeigt einen Satz Kontext, die offenen Aufgaben und den nächsten Schritt und wartet auf Michael. Sie ändert keine Dateien und beginnt nichts.

### Ablauf C: Wechsel scheitert unterwegs (AK-04, AK-05, AK-06)

<!-- leser: mensch -->

1. Bricht die Runde ab, schreibt sie kein Handoff oder steht danach Text in der Eingabezeile, leert das System nicht; die alte Sitzung bleibt mit ihrem ganzen Verlauf erhalten.
2. Wird das Leeren nicht bestätigt, gibt das System den Einlese-Befehl nicht ein.
3. In jedem Fall zeigt das System am Terminal eine Zeile „Nicht gewechselt: Ursache — nächster Schritt", z. B. „Nicht gewechselt: kein neues Handoff gefunden — `/session-handoff` von Hand ausführen".
4. Ein Handoff, das geschrieben wurde, bleibt liegen; Michael kann es jederzeit mit `/start-from-handoff` von Hand einlesen.

### Ablauf D: Einzelbefehle wie bisher (AK-08, NZ-03)

<!-- leser: mensch -->

1. Michael tippt `/session-handoff` oder `/start-from-handoff` in einer beliebigen Claude-Code-Sitzung, mit oder ohne Web-UI.
2. Beide verhalten sich wie heute: Handoff als Datei mit kurzer Bestätigung; Einlesen der neuesten Datei mit anschließendem Beginn des nächsten Schritts, außer Michael hängt „nur lesen" an.
3. `/handoff-weiter` außerhalb der Web-UI schreibt das Handoff und sagt, dass `/clear` und `/start-from-handoff` von Hand folgen; es leert nichts.

## 3. Fachliche Anforderungen

<!-- leser: mensch -->

| ID | Anforderung | Herkunft | Prüfung |
|---|---|---|---|
| FA-01 | Das System MUSS in jeder Claude-Sitzung des Cloud-Terminals einen Handoff-Knopf in der Terminal-Leiste anbieten; in Sitzungen ohne Claude (fremde Agenten-CLIs, Shell) DARF es ihn NICHT anbieten. | AK-09, NZ-06 | Test |
| FA-02 | Wenn Michael den Knopf drückt und die Sitzung bereit ist (wartet, kein Dialog, Eingabezeile leer), MUSS das System den Befehl `/handoff-weiter` in die Sitzung eingeben, als hätte Michael ihn getippt. | AK-01 | Test |
| FA-03 | Wenn Michael den Knopf drückt und die Sitzung nicht bereit ist, DARF das System NICHTS in die Sitzung schreiben und MUSS den Grund am Terminal anzeigen. | AK-05 | Test |
| FA-04 | Wenn in einer Claude-Sitzung des Cloud-Terminals `/handoff-weiter` eingegeben wird (getippt oder per Knopf), MUSS das System diese Sitzung als „Wechsel läuft" führen, bis der Wechsel gelungen oder abgebrochen ist. | AK-01, AK-02 | Test |
| FA-05 | Der Befehl `/handoff-weiter` MUSS ein Handoff in demselben Format und an demselben Ort schreiben wie `/session-handoff`. | AK-07, NZ-02 | Review |
| FA-06 | Nach dem Ende der Handoff-Runde MUSS das System prüfen, ob seit dem Auslösen eine Handoff-Datei neu entstanden oder geändert worden ist; nur dann DARF es weitermachen. | AK-04, Z-03 | Test |
| FA-07 | Liegt nach dem Ende der Runde keine neue Handoff-Datei vor, DARF das System die Sitzung NICHT leeren und MUSS den Grund am Terminal anzeigen. | AK-04 | Test |
| FA-08 | Vor dem Leeren MUSS das System am Bildschirm erneut prüfen, dass die Sitzung wartet, kein Dialog offen ist und die Eingabezeile leer ist; sonst MUSS es abbrechen und den Grund anzeigen. | AK-05 | Test |
| FA-09 | Nach dem Leeren MUSS das System auf die Bestätigung einer neuen Unterhaltung warten; bleibt sie aus, DARF es den Einlese-Befehl NICHT eingeben und MUSS „Leeren nicht bestätigt" anzeigen. | AK-06 | Test |
| FA-10 | Der Einlese-Befehl MUSS genau die Handoff-Datei nennen, die in diesem Wechsel entstanden ist, nicht „die neueste" im Ordner. | AK-01, Z-03 | Test |
| FA-11 | Nach dem Einlesen MUSS die neue Sitzung eine Kurzfassung (ein Satz Kontext, offene Aufgaben, nächster Schritt) zeigen und auf Michael warten; sie DARF dabei keine Dateien ändern und den nächsten Schritt NICHT beginnen. | AK-03, Z-02 | Stichprobe |
| FA-12 | Für dieselbe Sitzung DARF höchstens ein Wechsel gleichzeitig laufen; ein zweiter Auslöser während eines laufenden Wechsels MUSS mit „Wechsel läuft bereits" abgewiesen werden. | neu (Doppelklick, Z-03) | Test |
| FA-13 | Ein laufender Wechsel MUSS abbrechen, ohne zu leeren, wenn die Handoff-Runde nicht binnen einer festen Frist endet oder die Sitzung vorher endet; das System MUSS den Grund anzeigen. | neu (hängende Runde, Z-03) | Test |
| FA-14 | Das System DARF NICHT von sich aus einen Wechsel auslösen; nur Knopf oder eingegebener Befehl starten ihn. | NZ-01 | Review |
| FA-15 | Bleibt eine Sitzung nach dem Wechsel einem Vorhaben zugeordnet, MUSS die Zuordnung erhalten bleiben (wie beim Leeren im Phasenwechsel). | neu (bestehendes Verhalten, Z-01) | Test |
| FA-16 | Der Lieferumfang MUSS `session-handoff`, `start-from-handoff` und `/handoff-weiter` enthalten, sodass ein Projekt nach Installation oder Update alle drei hat. | AK-08, Z-04 | Test (Manifest-Guard, Installer-Test) |
| FA-17 | Die ausgelieferten Fassungen von `session-handoff` und `start-from-handoff` MÜSSEN inhaltlich den heutigen Fassungen entsprechen und einzeln wie bisher funktionieren. | AK-08, OF-02 | Review |
| FA-18 | Auf dem Cloud-Host MUSS die Fassung von `session-handoff` gelten, die das Handoff als Datei schreibt; eine ältere Fassung (Ausgabe zum Kopieren) DARF dort NICHT wirksam bleiben. | AK-08, OF-03 | Test + Stichprobe |
| FA-19 | `/handoff-weiter` außerhalb der Web-UI MUSS das Handoff schreiben und auf die zwei Folgeschritte von Hand hinweisen; es DARF dort NICHT leeren. | NZ-03, AK-08 | Stichprobe |
| FA-20 | Ausgelieferte Skills und Befehl DÜRFEN keine Hostnamen, Pfade oder Nutzer des Cloud-Hosts enthalten. | RB-03 | Review |

## 4. Fehler- und Randfälle

<!-- leser: mensch -->

| Fall | Erwartetes Verhalten | Herkunft |
|---|---|---|
| Michael bricht die Handoff-Runde mit Esc ab | kein neues Handoff → nicht geleert, Meldung „kein neues Handoff gefunden" | AK-04 / FA-07 |
| Die Handoff-Runde fragt um Erlaubnis (Datei schreiben, Ordner anlegen) | der Wechsel wartet, bis Michael antwortet und die Runde endet; die Frist aus FA-13 läuft weiter | FA-13 |
| Michael tippt nach dem Handoff, bevor geleert wird | Text in der Eingabezeile → nicht geleert, Meldung | AK-05 / FA-08 |
| Doppelklick auf den Knopf | zweiter Klick abgewiesen „Wechsel läuft bereits" | FA-12 |
| Zwei Sitzungen im selben Arbeitsordner schreiben fast gleichzeitig ein Handoff | jede liest ihr eigenes Handoff ein, nicht das der anderen | FA-10 |
| Ein älteres Handoff derselben Minute wird überschrieben (Dateiname auf die Minute genau) | gilt als neu entstanden, weil es seit dem Auslösen geändert wurde; eingelesen wird diese Datei | FA-06, FA-10 |
| Leeren wird nicht binnen der Frist bestätigt | kein Einlese-Befehl, Meldung „Leeren nicht bestätigt"; die Sitzung ist evtl. schon leer, das Handoff liegt vor und lässt sich von Hand einlesen | AK-06 / FA-09 |
| Sitzung endet während des Wechsels (Tab geschlossen, Absturz) | Wechsel abgebrochen, nichts weiter eingegeben | FA-13 |
| Backend startet während des Wechsels neu | der Wechsel gilt als abgebrochen; nichts wird nach dem Neustart nachgeholt | FA-13, Z-03 |
| Knopf in einer Codex- oder Shell-Sitzung | Knopf nicht vorhanden | AK-09 / FA-01 |
| `/handoff-weiter` im nackten Terminal ohne Web-UI | Handoff wird geschrieben, Hinweis auf `/clear` und `/start-from-handoff` | NZ-03 / FA-19 |
| Cloud-Host trägt noch die alte `session-handoff`-Fassung | nach der Einrichtung gilt die Datei-Fassung | FA-18 |
| Michael ruft `/start-from-handoff` ohne Zusatz auf | wie heute: Kurzfassung, dann direkt der nächste Schritt | FA-17 |

## 5. Daten, fachlich

<!-- leser: agent -->

| Information | Entsteht / ändert sich / verschwindet | Wer sieht sie | Datenklasse |
|---|---|---|---|
| Handoff-Datei (Zusammenfassung der Sitzung) | entsteht bei jedem Wechsel im Projekt unter dem gewohnten Ablageort; wird nie automatisch gelöscht (NZ-04) | Michael, die neue Sitzung | intern (Projektinhalt des jeweiligen Projekts; nicht versioniert) |
| Merker „Wechsel läuft" je Sitzung, mit Auslösezeitpunkt | entsteht beim Auslösen; verschwindet bei Erfolg, Abbruch, Sitzungsende oder Neustart | nur das System | intern (kein Projektinhalt) |
| Meldung zum Ausgang des Wechsels (Grund bei Abbruch) | entsteht bei Abbruch; flüchtig am Terminal | Michael | intern |
| Skills `session-handoff`, `start-from-handoff`, Befehl `/handoff-weiter` | neu im Lieferumfang; die alte Cloud-Fassung von `session-handoff` wird ersetzt oder entfällt | jeder (Repo öffentlich) | öffentlich |

## 6. Was der Nutzer sieht

<!-- leser: mensch -->

- **Terminal-Leiste einer Claude-Sitzung:** ein neuer, zweitrangiger Knopf „Handoff" mit Tooltip „Handoff schreiben, Sitzung leeren, Handoff einlesen". In Sitzungen ohne Claude fehlt er.
- **Während des Wechsels:** der Knopf ist gesperrt und zeigt „Wechsel läuft …"; im Terminal sieht Michael die Handoff-Runde, dann das Leeren, dann das Einlesen, wie bei eigener Eingabe.
- **Bei Abbruch:** eine Zeile „Nicht gewechselt: Ursache — nächster Schritt" am Terminal, nach dem Muster „Fehler nach Aktion" (`design.md` §4). Gründe: Sitzung arbeitet, Dialog offen, Text in der Eingabezeile, kein neues Handoff, Leeren nicht bestätigt, Frist abgelaufen, Wechsel läuft bereits.
- **Am Handy:** kein eigener Knopf in der Tastenleiste (NZ-05); der Befehl funktioniert.
- **Mock:** nötig, weil ein neuer Ablauf entsteht (`design.md` §6). Ablage `intent/INT-2026-038-handoff-ein-befehl/design/`, ein Bild der Terminal-Leiste mit dem Knopf in den Zuständen bereit, „Wechsel läuft …" und Abbruch-Zeile; entsteht im Plan vor dem Bau (AN-S04).

## 7. Bedenken aus den Projekt-Docs

<!-- leser: agent -->

| Quelle | Bedenken | Betrifft | Geklärt? (wer, wann, wie) |
|---|---|---|---|
| architecture.md §4 AR-08 | Die UI schreibt zweimal ohne Michaels unmittelbare Eingabe (Leeren, Einlesen) und beim Knopf ein drittes Mal (Befehl). Jede Eingabe braucht vorher eine frische Bildschirmprüfung, die Zahl der Eingaben je Wechsel ist fest (höchstens drei), bei unpassendem Bildschirm Abbruch. Ein Bildschirm, den die UI nicht selbst ausgelöst hat, gilt nicht als Bestätigung. | FA-02, FA-08, FA-09 | offen — an den Plan delegiert, nicht blockierend; Vorschlag bestätigt von Michael, 2026-10-29. Vorschlag: bestehenden Ablauf „Leeren, auf neue Gesprächskennung warten, Befehl einfügen" aus dem Phasenwechsel (`ui/src/server/services/vorhaben-service.ts:1098-1145`) wiederverwenden; er erfüllt AR-08 schon. |
| architecture.md §2 (Web-UI Backend, Hook-Route) | Erkennen von `/handoff-weiter`, wenn Michael ihn tippt: bisher erkennt die UI getippte Phasen-Befehle über den Hook beim Absenden einer Eingabe (`ui/src/server/services/vorhaben-service.ts:284`). Der neue Befehl braucht dieselbe Quelle; das Ende der Runde kommt aus dem Stop-Hook. | FA-04, FA-06 | offen — an den Plan delegiert, nicht blockierend; Vorschlag bestätigt von Michael, 2026-10-29. Vorschlag: gleiche Hook-Quelle wie Phasen-Befehle; kein Transkript lesen (ADR-0004). |
| architecture.md §3 Datenbesitz, AR-05 | Der Merker „Wechsel läuft" ist Laufzeitzustand des Backends; muss er in den Nutzerzustand (überlebt Neustart)? | FA-12, FA-13 | offen — an den Plan delegiert, nicht blockierend; Vorschlag bestätigt von Michael, 2026-10-29. Vorschlag: nur Arbeitsspeicher, Neustart bricht ab (Randfall in §4); dann keine neue Zeile in §3 nötig, da flüchtig. |
| architecture.md §3, security.md §6 | Prüfung „neue Handoff-Datei" liest einen Ordner im Arbeitsverzeichnis der Sitzung. Der Ordner kommt nicht vom Client, aber der Dateiname kommt aus der Sitzung zurück. | FA-06, FA-10 | offen — an den Plan delegiert, nicht blockierend; Vorschlag bestätigt von Michael, 2026-10-29. Vorschlag: Datei nicht aus der Ausgabe der Sitzung übernehmen, sondern das System sucht im Handoff-Ordner des Arbeitsverzeichnisses selbst; Pfad per `realpath` unter diesem Ordner prüfen. |
| architecture.md §4 AR-01, security.md §6 | Drei neue ausgelieferte Dateien brauchen Manifest-Zeilen; die alte Cloud-Kopie liegt außerhalb des Manifests (eigene Liste in der Cloud-Einrichtung). | FA-16, FA-18 | offen — an den Plan delegiert, nicht blockierend; Vorschlag bestätigt von Michael, 2026-10-29. Vorschlag: eine Quelle im Repo, Manifest liefert aus; Cloud-Kopie `cloud-deploy/claude-user-skills/session-handoff/` entfällt (Zeile in `removed.tsv` nur, falls sie je ausgeliefert wurde — sie stand nie im Manifest). |
| Claude-Code-Ladereihenfolge (kein Projekt-Doc; OF-02/OF-03) | [Likely] Bei gleichnamigen Skills gewinnt die persönliche Ebene (`~/.claude/skills/`) vor der Projekt-Ebene (Claude-Code-Doku „Skills": enterprise > personal > project). OF-02 nimmt „Projektfassung geht vor" an — das trifft dann nicht zu. Am Mac harmlos, solange die globalen Kopien gleich sind; auf dem Cloud-Host würde die alte persönliche Fassung die ausgelieferte verdecken. | FA-17, FA-18 | geklärt: AN-S02 bestätigt von Michael, 2026-10-29; Plan prüft die Reihenfolge mit einer Probe (zwei gleichnamige Skills, welcher antwortet). |
| architecture.md §2 Web-UI Backend (fremde Agenten-CLIs ohne Hooks) | Knopf und Befehl funktionieren nur mit Hooks; Codex-Sitzungen haben keine. | FA-01 | geklärt durch NZ-06 (Michael, 2026-10-29): kein Knopf außerhalb von Claude. |
| architecture.md §10 Terminal-Layout in `localStorage` | Die Abweichung darf nicht wachsen: der Sperrzustand des Knopfs gehört nicht in den Browser-Speicher. | FA-12, §6 | offen — an den Plan delegiert, nicht blockierend; Vorschlag bestätigt von Michael, 2026-10-29. Vorschlag: Zustand „Wechsel läuft" kommt aus dem Backend über den Sitzungsstand. |
| security.md §1, §5 | Handoff-Dateien enthalten Projektinhalte und Notizen; die Skill-Regel trägt `.claude/handoffs/` in `.gitignore` ein, wenn `.claude/` versioniert ist. In Specwright selbst (öffentliches Repo) darf kein Handoff committet werden. | §5, FA-05 | offen — an den Plan delegiert, nicht blockierend; Vorschlag bestätigt von Michael, 2026-10-29. Vorschlag: Plan prüft die `.gitignore` von Specwright auf `.claude/handoffs/`. |
| security.md §5 | Ausgelieferte Skills nennen keine Hosts, Pfade, Nutzer. | FA-20 | geklärt durch RB-03 (intent.md). |
| design.md §1 Prinzip 1, §4 „Fehler nach Aktion" | Neuer Knopf in der Terminal-Leiste: genau ein Knopf, Fehler inline mit Ursache und nächstem Schritt. | §6 | geklärt in §6 (ein Knopf, Muster „Fehler nach Aktion"). |
| design.md §6 Mock-Pflicht | Neuer Ablauf → Mock nötig. | §6 | geklärt: AN-S04 bestätigt von Michael, 2026-10-29; Mock entsteht im Plan. |
| product-brief.md §7 Nicht-Ziele | Keins berührt. | — | geprüft, keine Reibung. |

## 8. Nicht im Umfang

<!-- leser: mensch -->

- NZ-01: kein automatisches Auslösen (z. B. bei vollem Kontext).
- NZ-02: Format und Ablageort der Handoff-Datei bleiben.
- NZ-03: kein Ein-Schritt-Ablauf im nackten Claude-Code-Terminal außerhalb der Web-UI.
- NZ-04: kein Aufräumen alter Handoff-Dateien.
- NZ-05: kein eigener Knopf in der mobilen Tastenleiste.
- NZ-06: keine fremden Agenten-CLIs ohne Hooks.
- Kein Weiterführen eines abgebrochenen Wechsels nach einem Neustart des Backends.
- Keine Änderung an den globalen Skill-Kopien am Mac (OF-02).
- Kein neues Format für „nur lesen": der Lesemodus nutzt den heutigen Zusatz „nur lesen" von `/start-from-handoff`.

## 9. Annahmen

<!-- leser: mensch -->

- **AN-S01:** Der Knopf gibt `/handoff-weiter` ein, statt einen eigenen Ablauf zu haben; damit gibt es nur eine Folge und eine Prüfstrecke. — bestätigt am 2026-10-29 von Michael (Product Owner)
- **AN-S02:** Weil die persönliche Skill-Ebene vor der Projekt-Ebene gilt [Likely], wird die alte Cloud-Kopie von `session-handoff` nicht ersetzt, sondern entfällt; die Cloud-Einrichtung entfernt sie beim nächsten Lauf aus dem Nutzerordner des Dienstes, damit die ausgelieferte Projektfassung wirkt. Am Mac bleiben die globalen Kopien und gewinnen; sie sind inhaltsgleich. — bestätigt am 2026-10-29 von Michael (Product Owner)
- **AN-S03:** Die Frist für die Handoff-Runde (FA-13) liegt bei 10 Minuten; danach Abbruch ohne Leeren. — bestätigt am 2026-10-29 von Michael (Product Owner)
- **AN-S04:** Mock entsteht im Plan vor dem Bau, ein Bild mit drei Zuständen (bereit, läuft, Abbruch). — bestätigt am 2026-10-29 von Michael (Product Owner)
- **AN-S05:** „Neue Handoff-Datei" heißt: im Handoff-Ordner des Arbeitsverzeichnisses der Sitzung gibt es eine Datei, deren Änderungszeit nach dem Auslösen liegt; gibt es mehrere, gilt die jüngste. — bestätigt am 2026-10-29 von Michael (Product Owner)

## 10. Freigabe

<!-- leser: agent -->

- [x] Jede FA hat Herkunft und Prüfung.
- [x] Jedes AK der intent.md ist von mindestens einer FA abgedeckt: AK-01 → FA-02, FA-04, FA-10 · AK-02 → FA-04 · AK-03 → FA-11 · AK-04 → FA-06, FA-07 · AK-05 → FA-03, FA-08 · AK-06 → FA-09 · AK-07 → FA-05 · AK-08 → FA-16, FA-17, FA-18, FA-19 · AK-09 → FA-01.
- [x] Abschnitt 7 vollständig geklärt oder begründet offen.
- [x] Keine Technik, keine Architektur, keine Dateinamen in diesem Dokument (außer Herkunft in §7).
- [x] Bei risikoklasse hoch: Tech Lead hat gelesen. (entfällt, niedrig)
- [x] Abgleich Mensch/Agent: Mensch-Teil gegen Agenten-Teil geprüft (2026-10-29), Befund: keiner (§6 Sperrzustand ↔ §7 Backend-Zustand, §2 Lesemodus ↔ §8 „nur lesen“, §9 AN-S02 ↔ §7 Ladereihenfolge stimmen überein)
- **Freigegeben:** Michael (Product Owner), 2026-10-29, Commit siehe `spec(INT-2026-038): fachliche Spec freigegeben`
