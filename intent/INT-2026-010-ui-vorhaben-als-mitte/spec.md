# Spec: UI: Vorhaben als Mitte — Rahmen ohne Seitenleiste, Glocke immer sichtbar, Dokumente klappbar

> **Intent:** `intent.md` (INT-2026-010, Version 1.0.0)
> **Status:** entwurf
> **Erstellt:** 2026-09-16 · **Freigabe:** — (Entwurf aus der E2E-Sitzung INT-2026-009; Rückfragen offen)
> **Gelesene Projekt-Docs:** `docs/product-brief.md`, `docs/architecture.md`, `docs/security.md`, `docs/design.md` (Stand: Commit 238f876)

<!-- Die Spec ist FACHLICH. Sie beschreibt, was Nutzer erleben und was fachlich gelten muss.
     Nicht hinein gehören: Dateien, Komponenten, Datenbanktabellen, Bibliotheken, Architekturentscheidungen. Das ist plan.md.
     Die Projekt-Docs werden gelesen und dürfen hier nur BEDENKEN markieren (Abschnitt 7). Sie entscheiden nichts.
     Jede Anforderung verweist auf ein Ziel oder Abnahmekriterium der intent.md. Keine Anforderung ohne Herkunft. -->

## 1. Zusammenfassung

<!-- leser: mensch -->

Nach dem Umbau öffnet die Web-UI mit der Liste der Vorhaben und sagt auf einen Blick, wo Michael gebraucht wird und was läuft (Z-01). Der Rahmen jeder Seite besteht nur noch aus einer Kopfzeile mit Glocke und Projekt-Symbol, auf dem Handy dazu ein Terminal-Symbol (Z-02, Z-03). Die Vorhaben-Seite zeigt Gespräch und Dokument nebeneinander; das Dokument öffnet zuerst den Mensch-Teil, die Technik ist zugeklappt, Codes im Gespräch springen zum Absatz (Z-04). Chat und Anruf-Ansicht sind weg, Team bleibt ohne Weg dorthin im Code (Z-05). Betroffen: Michael am Mac und am Handy (AK-01 bis AK-17).

## 2. Nutzer und Abläufe

<!-- leser: mensch -->

<!-- Je Ablauf: wer, Auslöser, Schritte aus Nutzersicht, Ergebnis. Jeder Ablauf deckt mindestens ein AK ab. -->

### Ablauf A: UI öffnen und sehen, wo ich gebraucht werde (AK-01, AK-02, AK-05)

<!-- leser: mensch -->

1. Michael öffnet die UI am Mac.
2. Die UI zeigt die Vorhaben-Liste: oben Projekt-Chips („Alle", dann je offenes Projekt) als Filter, darunter die Gruppe „Wartet auf dich" und die Gruppe „Läuft", je Zeile Projekt, Kennung, Titel, Phase und Agent-Zustand; unten in einer festen Leiste der Knopf „Neue Absicht", der auch bei langer Liste sichtbar bleibt.
3. Über der Liste steht nur die Kopfzeile: Glocke mit Zahl, Projekt-Symbol. Keine Seitenleiste, keine Projekt-Tabs, keine Git-Leiste, keine Versions- oder Auslastungsanzeige.
4. Michael tippt einen Projekt-Chip: Die Liste zeigt nur Vorhaben dieses Projekts; die Gruppen bleiben.
5. Ergebnis: Michael weiß nach einem Blick, welches Vorhaben auf ihn wartet, und tippt die Zeile → Ablauf D.

### Ablauf B: Ein Agent wird fertig, während eine andere Seite offen ist (AK-02, AK-03, AK-04)

<!-- leser: mensch -->

1. Michael liest auf der Projekt-Seite oder in einem Vorhaben; das Terminal ist geschlossen.
2. In einem anderen Vorhaben wird ein Agent fertig oder bleibt mit einer Rückfrage stehen.
3. Binnen 2 s zeigt die Glocke in der Kopfzeile eine um eins höhere Zahl; auf Wunsch der Hinweiston wie heute.
4. Michael tippt die Glocke: Eine Liste der wartenden und fertigen Sitzungen erscheint, je Eintrag Vorhaben (oder „Sitzung ohne Vorhaben"), Zustand, Zeit.
5. Michael tippt einen Eintrag: Die UI wechselt zur Vorhaben-Seite dieses Vorhabens; bei einer Sitzung ohne Vorhaben öffnet sich das Terminal mit dieser Sitzung.
6. Ergebnis: Zwei Berührungen vom Ereignis bis zur Antwort (EK-01).

### Ablauf C: Neue Absicht starten (AK-08, AK-09)

<!-- leser: mensch -->

1. Michael tippt in der Liste „Neue Absicht".
2. Die UI zeigt eine Seite mit genau drei Elementen: ein Textfeld („Was stört, wen, seit wann?"), die Modellwahl, der Knopf „Starten".
3. Michael schreibt zwei Sätze, wählt das Modell, tippt „Starten".
4. Die UI zeigt das Gespräch der neuen Sitzung wie in INT-2026-008 (Interview ab Sitzungsstart); der Text aus dem Feld ist die erste Eingabe; sobald der Agent den Vorhaben-Ordner anlegt, folgt die Seite dem Vorhaben.
5. Ergebnis: Das Vorhaben erscheint in der Liste unter „Läuft" oder „Wartet auf dich".

### Ablauf D: Ein Vorhaben lesen, entscheiden, weitergehen (AK-10, AK-11, AK-12, AK-13)

<!-- leser: mensch -->

1. Michael öffnet ein Vorhaben aus der Liste oder aus der Glocke.
2. Die Seite zeigt oben Kennung und Titel, darunter die Phasen-Chips intent · spec · plan · build (die erreichte Phase ist hervorgehoben), links das Gespräch, rechts das Dokument der gewählten Phase, unter dem Dokument einen Knopf für den nächsten Schritt („spec starten", „plan starten", „build starten"; immer sichtbar, ausgegraut, solange eine Sitzung des Vorhabens arbeitet oder wartet) und, wenn das Dokument auf Freigabe wartet, daneben den Knopf „Freigeben".
3. Das Dokument zeigt die Mensch-Abschnitte offen; Abschnitte, die als „Agent" gekennzeichnet sind, erscheinen zugeklappt mit ihrer Überschrift. Ein Schalter „Technik zeigen" oben am Dokument öffnet alle zugeklappten Abschnitte dieses Dokuments; erneutes Tippen klappt sie wieder zu.
4. Ein Dokument ohne Kennzeichnung (alle Vorhaben vor INT-2026-009) erscheint vollständig offen, ohne Schalter.
5. Im Gespräch fragt der Agent „OF-03, Was hängt an Chat und Anruf: Vorschlag …". Der Code OF-03 ist ein Verweis: Hover zeigt den Absatz aus dem Dokument, Klick springt dorthin; liegt der Absatz in einem zugeklappten Abschnitt, geht dieser auf.
6. Michael antwortet im Gespräch (Review-Kanal wie heute), tippt „Freigeben" (die Freigabe geht an die wartende Sitzung, die Status, Änderungsprotokoll und Commit setzt; das Dokument zeigt danach „angenommen" bzw. „freigegeben") oder tippt den Knopf für den nächsten Schritt; der startet die Sitzung der nächsten Phase mit dem passenden Befehl.
7. Ergebnis: Michael entscheidet aus dem Mensch-Teil heraus, ohne die Technik lesen zu müssen; er kann sie jederzeit aufklappen.

### Ablauf E: Projektdinge erledigen (AK-14)

<!-- leser: mensch -->

1. Michael tippt das Projekt-Symbol in der Kopfzeile.
2. Die Projekt-Seite zeigt: Projektwechsel (offene Projekte, zuletzt genutzte), Docs-Editor für die vier Projekt-Docs, Git-Status mit den heutigen Aktionen, Einstellungen mit Prompt-Vorlagen, Getting Started, Modellwahl, Update-Hinweis und Auslastungsanzeige.
3. Michael wechselt das Projekt oder ändert etwas und geht über die Kopfzeile zurück zur Liste.
4. Ergebnis: Alles, was nicht zu einem Vorhaben gehört, liegt an einem Ort und stört sonst nicht.

### Ablauf F: Dasselbe am Handy (AK-07, AK-17)

<!-- leser: mensch -->

1. Michael öffnet die UI auf dem Handy (400 px Breite).
2. Kopfzeile wie am Mac plus Terminal-Symbol; keine Leiste am unteren Rand.
3. Liste, „Neue Absicht" und Projekt-Seite verhalten sich wie am Mac, untereinander statt nebeneinander.
4. Die Vorhaben-Seite zeigt Kennung, Titel, Phasen-Chips und das Dokument; statt des Gesprächs einen Terminal-Knopf, der die Sitzung des Vorhabens im Terminal öffnet (NZ-07).
5. Ergebnis: Michael kann unterwegs lesen, antworten (im Terminal) und eine neue Absicht anstoßen.

### Ablauf G: Terminal am Mac (AK-06)

<!-- leser: mensch -->

1. Michael drückt Cmd/Ctrl+D auf einer beliebigen Seite.
2. Das Terminal öffnet sich wie heute (Sitzungen, Tabs, Glocke im Terminal-Kopf entfällt, die Glocke der Kopfzeile bleibt sichtbar).
3. Cmd/Ctrl+D schließt es wieder.

## 3. Fachliche Anforderungen

<!-- leser: mensch -->

<!-- Eine Zeile = eine prüfbare Aussage. Modalverben groß. Herkunft = AK/Z/NZ aus intent.md oder „neu (Grund)". -->

| ID | Anforderung | Herkunft | Prüfung |
|---|---|---|---|
| FA-01 | Nach dem Öffnen der UI MUSS die Vorhaben-Liste die erste Seite sein. | AK-01 | Test |
| FA-02 | Die Liste MUSS Projekt-Chips als Filter, die Gruppen „Wartet auf dich" und „Läuft" und je Zeile Projekt, Kennung, Titel, Phase und Agent-Zustand zeigen; unten den Knopf „Neue Absicht" in einer festen Leiste, die beim Scrollen sichtbar bleibt (AN-S02). | AK-01 | Test + Playwright |
| FA-03 | Wenn ein Projekt-Chip gewählt ist, DARF die Liste nur Vorhaben dieses Projekts zeigen; „Alle" hebt den Filter auf. | AK-01 | Test |
| FA-04 | Auf jeder Seite MUSS die Kopfzeile die Glocke mit der Zahl der Sitzungen zeigen, die auf Michael warten oder fertig sind; bei null bleibt das Symbol ohne Zahl. | AK-02 | Test + Playwright |
| FA-05 | Wenn ein Agent fertig wird oder blockiert, MUSS die Glocke das binnen 2 s ab Ereignis anzeigen, auch bei geschlossenem Terminal. | AK-03 | Messung |
| FA-06 | Wenn ein Eintrag der Glocke gewählt wird, MUSS die UI zur Vorhaben-Seite dieses Vorhabens wechseln; bei einer Sitzung ohne Vorhaben zum Terminal mit dieser Sitzung. | AK-04 | Test |
| FA-07 | Außerhalb der Projekt-Seite DARF der Rahmen nur Glocke, Projekt-Symbol und auf dem Handy das Terminal-Symbol enthalten; keine Seitenleiste, Projekt-Tabs, Git-Leiste, Versions- oder Auslastungsanzeige. | AK-05, EK-02 | Review + Screenshot |
| FA-08 | Am Mac MUSS Cmd/Ctrl+D das Terminal öffnen und schließen; das Terminal selbst bleibt wie heute. | AK-06, NZ-02 | Test |
| FA-09 | Auf dem Handy MUSS das Terminal-Symbol der Kopfzeile das Terminal öffnen. | AK-07 | Playwright |
| FA-10 | Die Seite „Neue Absicht" MUSS genau drei Elemente zeigen: Textfeld, Modellwahl, Knopf „Starten". | AK-08 | Test |
| FA-11 | Wenn „Starten" gedrückt wird, MUSS die UI das Gespräch der Sitzung zeigen und dem Vorhaben-Ordner folgen; der Text des Feldes MUSS die erste Eingabe sein. | AK-09 | Test + Playwright |
| FA-12 | Die Vorhaben-Seite MUSS Kennung, Titel, Phasen-Chips (intent, spec, plan, build), links das Gespräch, rechts das Dokument der gewählten Phase und einen Knopf für den nächsten Schritt zeigen. | AK-10 | Playwright + Screenshot |
| FA-13 | Wenn ein Dokument Abschnitte als „Agent" kennzeichnet, MUSS der Leser sie zugeklappt zeigen (Überschrift sichtbar) und je Dokument einen Schalter „Technik zeigen" anbieten. | AK-11 | Test |
| FA-14 | Ein Dokument ohne Kennzeichnung MUSS vollständig offen erscheinen, ohne Schalter. | AK-12, NZ-06 | Test |
| FA-15 | Wenn im Gespräch ein Code steht, der im Dokument der gewählten Phase vorkommt, MUSS er als Verweis erscheinen: Hover zeigt den Absatz, Klick springt hin, ein zugeklappter Abschnitt geht dabei auf. | AK-13 | Test |
| FA-16 | Ein Code, der im Dokument der gewählten Phase nicht vorkommt, MUSS als Text stehen bleiben. | AK-13 (Umkehrschluss) | Test |
| FA-17 | Das Projekt-Symbol MUSS die Projekt-Seite öffnen mit Projektwechsel, Docs-Editor, Git-Status und -Aktionen, Einstellungen einschließlich Prompt-Vorlagen, Getting Started, Modellwahl, Update-Hinweis und Auslastungsanzeige. | AK-14, OF-02 | Playwright |
| FA-18 | Die Routen `chat`, `call` und `team` DÜRFEN NICHT erreichbar sein, auch nicht über eine eingegebene Adresse; die UI MUSS dann zur Liste führen. | AK-15, EK-03 | Test |
| FA-19 | Die Ansichten Chat und Anruf MÜSSEN entfernt sein; der Team-Code bleibt erhalten, ohne Route und Link. | AK-16, NZ-03 | Review |
| FA-20 | Auf dem Handy MUSS derselbe Rahmen gelten wie am Mac; Liste, Neue Absicht, Vorhaben-Seite (Dokument, Terminal-Knopf statt Gespräch) und Projekt-Seite MÜSSEN bei 400 px Breite bedienbar sein. | AK-17, NZ-07 | Playwright |
| FA-21 | Der Knopf für den nächsten Schritt MUSS immer sichtbar sein, die Sitzung der nächsten Phase mit dem passenden Befehl starten und MUSS ausgegraut sein, solange eine Sitzung des Vorhabens arbeitet oder wartet. | AK-10 (AN-S04, PO 16.09.) | Test |
| FA-22 | Wenn das Dokument der gewählten Phase auf Freigabe wartet (intent entwurf/in_klaerung, spec oder plan entwurf), MUSS die Vorhaben-Seite einen Knopf „Freigeben" zeigen; die Freigabe MUSS über die Sitzung des Agenten laufen, die Status, Änderungsprotokoll und Commit setzt, und das Dokument MUSS danach den neuen Status zeigen. | neu (PO, Chat 16.09.: „Freigabe eines Dokuments muss auch per Knopf gemacht werden können") | Test + Playwright |

## 4. Fehler- und Randfälle

<!-- leser: mensch -->

| Fall | Erwartetes Verhalten | Herkunft |
|---|---|---|
| Liste länger als der Bildschirm | Die Liste scrollt, Kopfzeile und die Leiste mit „Neue Absicht" bleiben stehen | FA-02, AN-S02 |
| Keine Vorhaben in den offenen Projekten | Liste zeigt einen Satz („Noch kein Vorhaben") und den Knopf „Neue Absicht" | AK-01, design.md §4 Leerzustand |
| Glocke ohne Einträge | Symbol ohne Zahl; Tippen zeigt „Nichts wartet" | FA-04 |
| Verbindung zum Backend weg | Der heutige Verbindungs-Hinweis erscheint; Glocke friert auf dem letzten Stand ein und wird nach Wiederverbindung nachgeladen | AK-03, intent §10 Betrieb |
| Dokument teilweise gekennzeichnet (nur manche Abschnitte tragen eine Kennzeichnung) | Wie ohne Kennzeichnung: alles offen, kein Schalter (AN-S03) | AK-12 |
| Dokument der gewählten Phase existiert noch nicht (z. B. spec bei Bypass) | Rechts steht „Kein Dokument in dieser Phase" und der Knopf für den nächsten Schritt | AK-10 |
| Code im Gespräch, dessen Absatz in einem anderen Phasen-Dokument liegt | Kein Verweis (FA-16); Michael wechselt den Phasen-Chip | AK-13 |
| Adresse `chat`, `call` oder `team` eingegeben | Liste öffnet sich | FA-18 |
| Handy: Vorhaben-Seite eines Vorhabens mit laufender Sitzung | Terminal-Knopf öffnet das Terminal mit genau dieser Sitzung; ohne Sitzung öffnet er das Terminal mit dem Startbefehl der nächsten Phase | AK-17, NZ-07 |
| „Freigeben" getippt, aber keine Sitzung des Vorhabens wartet | Die UI startet die Sitzung der laufenden Phase mit der Freigabe als erster Eingabe (AN-S06); der Knopf ist ausgegraut, bis die Sitzung den Status gesetzt hat | FA-22 |
| „Freigeben" getippt, Abgleich Mensch/Agent (R4, INT-2026-009) fehlt im Dokument | Die Sitzung holt den Abgleich nach und fragt zurück; die UI setzt nichts selbst | FA-22 |
| Auf der Projekt-Seite wird das Projekt gewechselt | Zurück auf der Liste gilt der Chip des neuen Projekts als gewählt | AK-14 |

## 5. Daten, fachlich

<!-- leser: agent -->

<!-- Welche fachlichen Informationen sichtbar werden, entstehen, sich ändern oder verschwinden. Ohne Tabellen- oder Feldnamen. Datenklasse laut security.md nennen. -->

| Information | Entsteht / ändert sich / verschwindet | Wer sieht sie | Datenklasse |
|---|---|---|---|
| Liste wartender und fertiger Sitzungen (Glocke) | entsteht aus den heutigen Agent-Ereignissen; ändert sich mit jedem Ereignis; wird beim Antworten abgeräumt | Michael, auf jeder Seite | intern |
| Gewählter Projekt-Chip | ändert sich beim Tippen; gilt auf jedem Gerät gleich | Michael | intern |
| Gewählte Phase auf der Vorhaben-Seite | ändert sich beim Tippen eines Chips; Standard ist die erreichte Phase | Michael | intern |
| Schalter „Technik zeigen" je Dokument | ändert sich beim Tippen; gilt für das offene Dokument (Speicherdauer: Bedenken §7, an den Plan) | Michael | intern |
| Kennzeichnung Mensch/Agent je Abschnitt | wird aus dem Dokument gelesen (INT-2026-009); die UI schreibt sie nie | Michael (nur als Zustand offen/zu) | öffentlich (Repo) |
| Text der neuen Absicht | entsteht im Textfeld; wird zur ersten Eingabe der Sitzung; verschwindet aus der UI nach dem Start | Michael | Projektinhalt (security.md des Projekts) |
| Chat-Verläufe und Anruf-Zustände | verschwinden mit den Ansichten; nichts wird migriert | — | — |

## 6. Was der Nutzer sieht

<!-- leser: mensch -->

<!-- Nur bei UI-Änderung. Beschreibung in Worten; Mock unter `design/` (Pfad nennen), sonst „kein Mock nötig, weil …". -->

- Kopfzeile (jede Seite): links nichts oder der Seitentitel in Grau, rechts Glocke mit Zahl, Projekt-Symbol, auf dem Handy dazu Terminal-Symbol. Eine Akzentfarbe: die Glocke mit Einträgen.
- Vorhaben-Liste: Titel „Vorhaben", Chip-Reihe, zwei Gruppen mit Überschrift und Zähler, Zeilen wie heute; unten eine feste Leiste mit „Neue Absicht" mittig (Skizze 1 „Static bar").
- Neue Absicht: Titel, großes Textfeld, rechts unten daran die Modellwahl, darunter „Starten".
- Vorhaben-Seite: Kennung groß, Titel darunter, rechts oben Phasen-Chips; darunter zwei Spalten, links Gespräch (Beiträge als Karten, Eingabe unten), rechts Dokument mit Schalter „Technik zeigen" und zugeklappten Agent-Abschnitten; rechts unten „spec starten" o. ä. und, wenn das Dokument auf Freigabe wartet, daneben „Freigeben".
- Projekt-Seite: Abschnitte untereinander (Projekt, Docs, Git, Einstellungen), keine Tabs.
- Mock: `design/skizze-01.jpg` (vier Skizzen: Liste, Neue Absicht, Vorhaben-Seite, Rahmen mit Glocke). Für die Projekt-Seite und das Handy gibt es keine Skizze; Screenshot im PR ersetzt sie (Bedenken §7).

## 7. Bedenken aus den Projekt-Docs

<!-- leser: agent -->

<!-- PFLICHT. Beim Schreiben wurden product-brief, architecture, security, design gelesen. Alles, was dort reibt, steht hier — markiert, nicht entschieden.
     „Geklärt" heißt: die zuständige Rolle hat entschieden; Entscheidung steht in der Spalte. Vor der Freigabe muss jede Zeile geklärt oder als „offen, blockiert nicht, weil …" begründet sein.
     Gibt es nichts: „Keine — geprüft gegen Stand [sha]." -->

| Quelle | Bedenken | Betrifft | Geklärt? (wer, wann, wie) |
|---|---|---|---|
| architecture.md §4 AR-05 | Nutzerzustand lebt im Backend, nie im Browser. Gewählter Projekt-Chip, gewählte Phase und der Schalter „Technik zeigen" sind Nutzerzustand — oder flüchtig? Wenn Backend: Broadcast an alle Geräte, auch für einen Klapp-Schalter. | FA-03, FA-12, FA-13 | geklärt (PO, Chat 16.09.): Chip und Phase ins Backend (gleiche Sicht, AR-05), Schalter „Technik zeigen" flüchtig je Seitenaufruf (kein Nutzerzustand, nur Ansicht). |
| architecture.md §3 „Nutzerzustand", intent AN-01 | Die Glocke braucht die Ereignisse fertig/blockiert je Sitzung auch ohne offenes Terminal; ob das Backend sie heute an alle Clients schickt oder nur an das Terminal, ist fachlich nicht sichtbar. | FA-04, FA-05 | offen — an den Plan delegiert (Prüfweg steht in AN-01), nicht blockierend |
| architecture.md §10 Abweichungen | Der Abbau von Chat und Anruf könnte Backend-Handler ohne Aufrufer hinterlassen (wie nach INT-2026-004 Stufe 3); NZ-01 verbietet neue Backend-Funktionen, sagt aber nichts zum Abbau toter Handler. | FA-19 | geklärt (PO, Chat 16.09.): Handler ohne Aufrufer im Plan §2 nennen, Abbau nur wenn ohne Risiko, sonst neue Zeile in architecture.md §10 |
| security.md §5, RB-04 | Screenshots je Seite gehen ins öffentliche Repo; Projekt-Chips und Vorhaben-Titel echter Kundenprojekte (Kreis Lippe, Applai) wären sichtbar. | FA-07, FA-12, Abschnitt 6 | geklärt (PO, Chat 16.09.): Screenshots aus dem Scratch-Projekt (wie INT-2026-008), keine Kundenprojekte im Bild |
| security.md §4 T-06 | Web-UI ohne Nutzerverwaltung bleibt; der Umbau ändert daran nichts, vergrößert die Fläche aber nicht (weniger Routen). | — | geklärt: keine Änderung, Lücke bleibt in §7 offen (eigenes Vorhaben) |
| design.md §5 | Breakpoint Handy ist < 768 px, ein Pane; AK-17 verlangt 400 px. Kein Widerspruch, aber die Vorhaben-Seite braucht zwischen 768 px und etwa 1100 px eine Regel (zwei Spalten oder untereinander?). | FA-12, FA-20 | geklärt (PO, Chat 16.09.): unter 1024 px Dokument über dem Gespräch, Phasen-Chips bleiben oben |
| design.md §6 | Mock-Pflicht bei neuer Seite und geänderter Navigation: Skizze deckt Liste, Neue Absicht, Vorhaben-Seite und Rahmen; Projekt-Seite und Handy haben keine Skizze. Ablage verlangt `.png` oder Link; hier `.jpg`. | Abschnitt 6 | offen, blockiert nicht: Skizze gilt als Mock; Projekt-Seite und Handy werden im Plan als Beschreibung festgelegt und per Screenshot geprüft; `.jpg` bleibt (Format ist Nebensache) |
| design.md §1 Prinzip 4, RB-03 | Bestehende Bausteine zuerst: Liste, Zeile, Gespräch, Dokument-Leser, Terminal existieren; nur Rahmen, Glocke-im-Rahmen, Klappen und Code-Verweise sind neu. | alle | geklärt: Spec verlangt nichts, was einen Neubau bestehender Bausteine bräuchte |
| architecture.md §2 Workflows, §3 Vorhaben (Besitzer: Projekt-Repo) | FA-22 Freigabe per Knopf: Status, Änderungsprotokoll und Commit setzen heute die Workflows intent Step 6, spec Step 5, plan Step 9b in der Sitzung. Schreibt die UI das Dokument selbst, gibt es zwei Schreiber; NZ-05 verbietet Workflow-Änderungen. | FA-22 | offen — an den Plan delegiert, nicht blockierend: Vorschlag Knopf = Nachricht „freigabe" an die wartende Sitzung (Review-Kanal), sonst Sitzung starten (AN-S06); die UI schreibt kein Dokument |
| product-brief.md §5 | Kernfunktion „Web-UI" nennt Gespräch (Mac) und Projekt-Seite; Chat und Anruf stehen dort nicht — der Abbau widerspricht dem Brief nicht. Voice-Nachrichten im Gespräch (INT-2026-007) müssen bleiben (AN-02). | FA-19 | geklärt gegen Stand 238f876; AN-02 prüft der Plan |

## 8. Nicht im Umfang

<!-- leser: mensch -->

<!-- Aus NZ der intent.md plus alles, was beim Schreiben ausgeschlossen wurde. -->

- NZ-01: keine neuen Backend-Funktionen für den Vorhaben-Flow; Backend nur dort, wo Glocke oder Liste Daten brauchen.
- NZ-02: kein Umbau des Terminals (xterm, Tabs, Sitzungen).
- NZ-03: Team bleibt im Code, ohne Route und Link.
- NZ-04: kein Abbau des Kanban-MCP.
- NZ-05: keine Änderung an Vorlagen oder Workflows (das war INT-2026-009).
- NZ-06: keine Nachmarkierung alter Dokumente.
- NZ-07: kein Gespräch auf dem Handy.
- Zusätzlich: keine Suche oder Sortierung in der Liste über die heutige Gruppierung hinaus; keine Mehrfachauswahl von Projekt-Chips; kein Bearbeiten von Dokumenten auf der Vorhaben-Seite (Docs-Editor bleibt Projekt-Seite); keine Tastenkürzel außer Cmd/Ctrl+D.

## 9. Annahmen

<!-- leser: mensch -->

<!-- Vorläufige Auslegungen nach ER-00 der intent.md. Werden bei der Freigabe gesammelt bestätigt. -->

- **AN-S01:** Die heutige dritte Gruppe „Wartet" (Sitzung wartet auf Berechtigung oder Plan-Freigabe) geht in „Wartet auf dich" auf, weil Michael dort handeln muss; „Läuft" enthält nur arbeitende Sitzungen; Vorhaben ohne Sitzung stehen unter „Läuft" mit Zustand „ruht". — bestätigt am 2026-09-16 von PO (Chat)
- **AN-S02:** Die Linie in Skizze 1 heißt „Static bar": Der Knopf „Neue Absicht" sitzt in einer festen Leiste am unteren Rand und bleibt beim Scrollen einer langen Liste sichtbar. Keine Statusanzeige; AK-05 verbietet Versions- und Auslastungsanzeige dort. — bestätigt am 2026-09-16 von PO (Chat: „Static bar, der Button ist immer im Sichtbereich")
- **AN-S03:** Ein teilweise gekennzeichnetes Dokument gilt für den Leser wie ein Dokument ohne Kennzeichnung (alles offen), weil AK-12 die engste Auslegung ist und der Guard aus INT-2026-009 solche Dokumente ohnehin ablehnt. — bestätigt am 2026-09-16 von PO (Chat)
- **AN-S04:** Der Knopf für den nächsten Schritt zeigt den nächsten Phasen-Befehl (nach intent angenommen: „spec starten"; bei Bypass: „plan starten"; nach plan freigegeben: „build starten"), ist immer sichtbar und ausgegraut, solange eine Sitzung des Vorhabens arbeitet oder wartet. — bestätigt am 2026-09-16 von PO (Chat: „genau, wir brauchen immer den Knopf"; ausgegraut bestätigt)
- **AN-S05:** Die Glocke im Kopf des Terminals entfällt, weil die Glocke der Kopfzeile auf jeder Seite sichtbar ist (B-06); der Hinweiston bleibt wie heute schaltbar. — bestätigt am 2026-09-16 von PO (Chat)
- **AN-S06:** „Freigeben" schreibt kein Dokument: Der Knopf schickt „freigabe" an die wartende Sitzung des Vorhabens; wartet keine, startet er die Sitzung der laufenden Phase mit der Freigabe als erster Eingabe. Der Agent setzt Status, Abgleich (R4) und Commit wie in den Workflows. — offen

## 10. Freigabe

<!-- leser: agent -->

- [ ] Jede FA hat Herkunft und Prüfung.
- [ ] Jedes AK der intent.md ist von mindestens einer FA abgedeckt: AK-01 → FA-01/02/03 · AK-02 → FA-04 · AK-03 → FA-05 · AK-04 → FA-06 · AK-05 → FA-07 · AK-06 → FA-08 · AK-07 → FA-09 · AK-08 → FA-10 · AK-09 → FA-11 · AK-10 → FA-12/21 · neu → FA-22 · AK-11 → FA-13 · AK-12 → FA-14 · AK-13 → FA-15/16 · AK-14 → FA-17 · AK-15 → FA-18 · AK-16 → FA-19 · AK-17 → FA-20.
- [ ] Abschnitt 7 vollständig geklärt oder begründet offen.
- [ ] Keine Technik, keine Architektur, keine Dateinamen in diesem Dokument.
- [ ] Bei risikoklasse hoch: Tech Lead hat gelesen. (Risikoklasse mittel — entfällt.)
- [x] Abgleich Mensch/Agent: Mensch-Teil gegen Agenten-Teil geprüft (2026-09-16), Befund: keiner — §5 und §7 versprechen nichts, was §1–§4 nicht nennen; die vier offenen Bedenken aus §7 stehen als Vorschläge in der Vorlage und werden mit den Annahmen zusammen gestellt.
- **Freigegeben:** — (Entwurf)
