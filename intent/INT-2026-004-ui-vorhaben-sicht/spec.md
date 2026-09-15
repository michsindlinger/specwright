# Spec: Web-UI zeigt Vorhaben statt Stories: Dokumente lesen, an Review-Punkten antworten

> **Intent:** `intent.md` (INT-2026-004, Version 1.1.0)
> **Status:** freigegeben
> **Erstellt:** 2026-09-15 · **Freigabe:** Product Owner (Michael Sindlinger), 2026-09-15
> **Gelesene Projekt-Docs:** `docs/product-brief.md`, `docs/architecture.md`, `docs/security.md`, `docs/design.md` (Stand: Commit 8351674)

<!-- Die Spec ist FACHLICH. Sie beschreibt, was Nutzer erleben und was fachlich gelten muss.
     Nicht hinein gehören: Dateien, Komponenten, Datenbanktabellen, Bibliotheken, Architekturentscheidungen. Das ist plan.md.
     Die Projekt-Docs werden gelesen und dürfen hier nur BEDENKEN markieren (Abschnitt 7). Sie entscheiden nichts.
     Jede Anforderung verweist auf ein Ziel oder Abnahmekriterium der intent.md. Keine Anforderung ohne Herkunft. -->

## 1. Zusammenfassung

Nach diesem Vorhaben öffnet Michael die Web-UI und sieht als Erstes eine Liste aller Vorhaben seiner offenen Projekte mit Phase und dem Hinweis, welche gerade auf ihn warten (Z-01, AK-01 bis AK-04). Er liest `intent.md`, `spec.md` und `plan.md` in der UI so, wie sie in MacDown aussehen, am Mac und am Handy (Z-02, AK-05, AK-06), schreibt Anmerkungen an der Stelle, an der er gerade liest, und schickt sie gesammelt oder gibt das Dokument frei — die Antwort landet als Eingabe in der wartenden Claude-Sitzung (Z-03, AK-07 bis AK-11, AK-14, AK-15). Den nächsten Schritt eines Vorhabens startet er per Knopf und wählt dabei das Modell der Sitzung, vorbelegt mit einem Standard je Schritt (Z-04, AK-12, AK-16). Kanban, Story-Karten, Backlog und der Auto-Mode je Story sind aus der UI verschwunden; der Rahmen (Sidebar, Projekt-Tabs, Cloud-Terminal, Settings, Team, Mobile-Shell, Notizblock) bleibt (Z-05, AK-13, NZ-01).

## 2. Nutzer und Abläufe

<!-- Je Ablauf: wer, Auslöser, Schritte aus Nutzersicht, Ergebnis. Jeder Ablauf deckt mindestens ein AK ab. -->

Alle Abläufe haben einen Nutzer: Michael. Am Mac und am Handy gelten dieselben Abläufe; Unterschiede stehen beim jeweiligen Schritt.

### Ablauf A: Überblick verschaffen (AK-01, AK-02, AK-03, AK-04)

1. Michael öffnet die Web-UI oder wechselt auf die Übersicht („Vorhaben"). Am Handy ist das der Reiter, der heute „Specs" heißt.
2. Die Übersicht zeigt eine Liste über alle offenen Projekte. Jede Zeile: Projekt, Kennung (`INT-JJJJ-NNN`), Titel, Phase, Zustand, Zeitpunkt der letzten Änderung. Der Zustand ist einer von: **wartet auf dich** (mit Schritt und Review-Dokument, z. B. „Spec · spec.md"), **wartet** (Sitzung hat eine Frage gestellt, kein Review-Dokument), **wartet im Terminal** (Sitzung zeigt einen Dialog), **arbeitet**, **Bau unterbrochen**, **keine Sitzung**, **Sitzung beendet**.
3. Reihenfolge: alle wartenden Vorhaben zuerst (die mit Review-Dokument vor denen mit Frage), darunter die übrigen laufenden nach letzter Änderung absteigend, ganz unten die umgesetzten, eingeklappt.
4. Michael kann die Liste auf ein oder mehrere Projekte einschränken (Filter). Das gerade aktive Projekt ist markiert, aber nicht vorgefiltert.
5. Ändert eine Sitzung ein Dokument oder wechselt ihren Zustand, zieht die Übersicht Phase und Zustand innerhalb von 5 s nach, ohne dass Michael die Seite neu lädt.
6. Hat ein offenes Projekt keinen Vorhaben-Ordner, zeigt die Übersicht für dieses Projekt einen Satz („Noch kein Vorhaben in [Projekt].") und die Aktion „Erstes Vorhaben anlegen" (Ablauf E).
7. Ergebnis: Michael weiß in einem Blick, wo er gebraucht wird, und tippt auf die Zeile, die auf ihn wartet (Ablauf B).

### Ablauf B: Dokumente eines Vorhabens lesen (AK-05, AK-06)

1. Michael öffnet ein Vorhaben aus der Übersicht.
2. Die Vorhaben-Seite zeigt oben Kennung, Titel, Phase und Zustand (wie in der Übersicht) und darunter die vorhandenen Dokumente in fester Reihenfolge: `intent.md`, `spec.md`, `plan.md`, `build-stand.md`, Inhalt von `design/`. Fehlende Dokumente werden nicht als leere Reiter gezeigt.
3. Das Review-Dokument (Abschnitt 3, FA-20) ist vorausgewählt; sonst das zuletzt geänderte.
4. Das Dokument erscheint als gerenderter Text: Überschriften, Absätze, Tabellen, Codeblöcke, Mermaid-Diagramme als Bild, Kopffelder (Frontmatter) als Tabelle, Kennungen (AK-03, FA-07, §6) im Text unverändert lesbar. Bilder aus `design/` erscheinen als Bild; andere Dateien dort werden mit Namen gelistet.
5. Am Handy: ein Bildschirm, kein waagerechtes Scrollen der Seite; breite Tabellen und Codeblöcke scrollen innerhalb ihres eigenen Kastens.
6. Ändert die Sitzung das Dokument, während Michael liest, zeigt die Seite einen Hinweis („Dokument geändert um HH:MM — neu laden") und behält bis zum Neuladen die Leseposition. Beim Neuladen bleibt die Position an derselben Überschrift, wenn sie noch existiert.
7. Ergebnis: Michael hat das Dokument gelesen, wie er es heute in MacDown liest — ohne Wechsel des Werkzeugs.

### Ablauf C: Anmerkungen schreiben und schicken (AK-07, AK-08, AK-10, AK-11, AK-14, AK-15)

1. Michael liest (Ablauf B). An der Stelle, an der er etwas anmerken will, wählt er den Absatz, die Tabellenzeile oder die Überschrift (Mac: Klick auf die Randmarke des Absatzes; Handy: Tippen auf den Absatz, dann „Anmerkung").
2. Unter der Stelle öffnet sich ein Eingabefeld. Der Bezug steht bereits darüber und kommt von der Stelle: die Kennung in der Zeile (z. B. `AK-03`), sonst die Abschnittsnummer (`§6`), sonst die Überschrift, sonst der Anfang des Absatzes. Michael kann den Bezug lesen, aber nicht ändern; passt er nicht, wählt er die richtige Stelle.
3. Michael schreibt den Text und schließt das Feld. Die Anmerkung bleibt als Marke an der Stelle sichtbar. Er kann sie später öffnen, ändern oder löschen.
4. Eine Anmerkung ohne Stelle („Dokument gesamt") beginnt er über die Aktion „Allgemeine Anmerkung" oben am Dokument.
5. Eine Leiste am unteren Rand zählt die Anmerkungen des Dokuments („3 Anmerkungen") und öffnet die Sammelansicht: alle Anmerkungen in Dokumentreihenfolge, jede mit Bezug und Text, änderbar und löschbar.
6. Die Leiste zeigt, an welche Sitzung geschickt würde (Name der Sitzung, Arbeitskopie) und ob sie bereit ist. Wartet die Sitzung, ist „Änderungen schicken" aktiv; sonst nennt die Leiste den Grund (Ablauf C, Schritt 9).
7. Michael wählt „Änderungen schicken". Die UI übergibt an die wartende Sitzung genau eine Eingabe in dieser Form (Wortlaut FA-27):

   `Änderungen zu spec.md (Stand 2026-09-15 16:42):` und darunter eine nummerierte Liste, je Zeile `n. [Bezug] Text`.

8. Innerhalb von 10 s ab Klick steht die Eingabe in der Sitzung. Die UI zeigt am Vorhaben den Eintrag „Änderungen (3) an [Sitzung] — gesendet HH:MM" und, sobald die Sitzung die Eingabe verarbeitet, „angenommen HH:MM". Die gesendeten Anmerkungen verschwinden aus dem Dokument und wandern ins Protokoll (Schritt 8), wo Michael sie nachlesen kann.
9. Kann nicht gesendet werden, bleiben alle Anmerkungen erhalten, und die Leiste nennt den Grund mit nächstem Schritt: „keine Sitzung zu diesem Vorhaben — nächsten Schritt starten", „Sitzung arbeitet — warten", „Sitzung wartet im Terminal (Dialog) — im Terminal antworten", „Sitzung beendet — nächsten Schritt starten". Wird die Sitzung später bereit, ändert sich die Leiste von selbst; die UI schickt nichts von allein.
10. Ergebnis: Die Sitzung hat Michaels Änderungswünsche mit Bezug erhalten und arbeitet weiter; Michael sieht am Vorhaben, was er wann geschickt hat.

### Ablauf D: Dokument freigeben (AK-07, AK-09, AK-11)

1. Voraussetzung: Das Vorhaben ist im Zustand „wartet auf dich" mit Review-Dokument (FA-20); Michael hat es gelesen.
2. Michael wählt „Freigeben". Die UI zeigt zur Bestätigung Dokument, Stand bzw. Version und Zielsitzung („Freigabe: spec.md (Stand 2026-09-15 16:42) an Sitzung ‚spec INT-2026-004'?").
3. Nach Bestätigung übergibt die UI genau diese eine Zeile als Eingabe (Wortlaut FA-28): `Freigabe: intent.md 0.2.0` bzw. `Freigabe: spec.md (Stand 2026-09-15 16:42)` bzw. `Freigabe: plan.md (Stand …)`.
4. Liegen noch ungesendete Anmerkungen am Dokument, weist die UI vor der Bestätigung darauf hin („3 Anmerkungen ungesendet — trotzdem freigeben? Sie bleiben erhalten."). Freigabe und Änderungen werden nie in einer Eingabe gemischt.
5. Hat sich das Dokument seit dem Lesen geändert (Stand der Anzeige ≠ aktueller Stand), lehnt die UI die Freigabe ab und verlangt Neuladen; Änderungen dürfen mit Warnhinweis gesendet werden.
6. Protokoll und Bestätigung wie in Ablauf C, Schritt 8 („Freigabe spec.md — gesendet HH:MM, angenommen HH:MM").
7. Ergebnis: Der Workflow setzt das Dokument auf freigegeben und macht weiter; die Übersicht zeigt die neue Phase (Ablauf A, Schritt 5).

### Ablauf E: Nächsten Schritt starten (AK-12, AK-16)

1. Michael öffnet ein Vorhaben, das keine wartende Sitzung hat (Zustand „keine Sitzung", „Sitzung beendet" oder „Bau unterbrochen"), oder ein Projekt ohne Vorhaben.
2. Die Vorhaben-Seite bietet genau einen nächsten Schritt, abhängig von der Phase (FA-12): Spec → „Spec schreiben" (`/spec INT-…`), Plan → „Plan erstellen" (`/plan INT-…`), Bau → „Bau starten" bzw. „Bau fortsetzen" (`/build INT-…`). In der Übersicht bietet jedes Projekt „Neues Vorhaben" (`/intent`).
3. Neben dem Knopf steht die Modellwahl (wie heute auf der Story-Karte): vorbelegt mit dem zuletzt für dieses Vorhaben und diesen Schritt gewählten Modell, sonst mit dem Standard des Schritts. Michael kann ein anderes der konfigurierten Modelle wählen (Claude Opus, GLM, Grok, …); die Wahl gilt für diesen Start.
4. Michael wählt den Schritt. Die UI startet im Projekt eine Claude-Sitzung wie heute über den Rahmen (Auswahl Arbeitskopie: Projekt oder Worktree, wie bisher) mit dem gewählten Modell und gibt den Befehl als erste Eingabe ein.
5. Die Sitzung ist ab jetzt die Sitzung des Vorhabens (FA-21). Die Übersicht zeigt „arbeitet" und das Modell der Sitzung; sobald die Sitzung am Review-Punkt anhält, „wartet auf dich".
6. Am Mac springt die UI ins Terminal der neuen Sitzung; am Handy bleibt Michael auf der Vorhaben-Seite und sieht den Zustand.
7. Die Standards je Schritt (Absicht, Spec, Plan, Bau) stellt Michael einmal in den Einstellungen unter „Modelle" ein, neben dem heutigen allgemeinen Standardmodell; ohne Einstellung gilt Claude Opus.
8. Ergebnis: Der nächste Schritt läuft mit dem gewünschten Modell, ohne dass Michael den Befehl getippt hat.

### Ablauf F: Bau-Fertigmeldung und PR (AK-07, AK-08, AK-11, AK-12)

1. Die Bau-Sitzung meldet fertig (Plan auf „umgesetzt", PR erstellt) und hält an. Die Übersicht zeigt Phase **PR** und Zustand „wartet auf dich · Bau · plan.md".
2. Michael öffnet das Vorhaben. Die Seite zeigt den PR-Verweis aus der Statuszeile des Plans und `plan.md` mit §14 (Abweichungen) vorausgewählt.
3. Michael kann Anmerkungen schreiben und schicken (Ablauf C) — die Sitzung bessert nach. „Freigeben" gibt es hier nicht: Der Merge ist Michaels Schritt auf GitHub (ER-07), die UI bietet ihn nicht an.
4. Nach dem Merge setzt die Sitzung oder Michael die Absicht auf „umgesetzt"; die Übersicht sortiert das Vorhaben zu den umgesetzten.
5. Ergebnis: Der Bau ist aus der UI heraus nachgebessert worden; der Merge bleibt außerhalb.

### Ablauf G (Betrieb): Auslieferung in drei Stufen, Story-Pfad verschwindet (AK-13, B-10)

1. Nach PR 1 sieht Michael die Übersicht und den Dokumentleser; Kanban und Story-Sichten sind noch erreichbar. Nach PR 2 kann er antworten und Schritte starten. Nach PR 3 gibt es Kanban-, Story-, Backlog- und Spec-Auswahl-Sichten, Story-Karten am Handy und den Auto-Mode je Story nicht mehr — auch nicht über alte Verknüpfungen, Tastenkürzel oder gespeicherte Ansichtseinstellungen.
2. Zähler und Abzeichen im Rahmen, die heute Specs oder Stories zählen, zählen danach Vorhaben, die auf Michael warten.
3. Alte Story-Daten in den Projekten bleiben liegen und werden von der UI nicht mehr gelesen (NZ-07). Der Kanban-MCP-Server bleibt installiert (NZ-02).
4. Jede der drei Stufen ist nach dem Merge sofort für Michael live (ein Nutzer). Rückzug je Stufe: Revert des Merges.
5. Ergebnis: Die UI kennt nur noch den Vorhaben-Flow.

### Ablauf H (Betrieb): Neustart der UI während einer Antwort (RB-01)

1. Ein Merge löst den Neustart der UI auf dem Cloud-Host aus, während Michael gerade „Änderungen schicken" gedrückt hat.
2. Der Neustart wartet, bis die Antwort in der Sitzung bestätigt ist, oder die Antwort wird nach dem Neustart nachgeliefert — aus Michaels Sicht: Sie kommt genau einmal an, nie doppelt, nie verloren. Dauert die Bestätigung länger als 10 s, zeigt das Protokoll „nicht bestätigt — im Terminal prüfen".
3. Nach dem Neustart kennt die UI weiterhin die Zuordnung Sitzung ↔ Vorhaben, das Protokoll und die ungesendeten Anmerkungen (die Sitzungen selbst überleben den Neustart wie heute).
4. Ergebnis: Ein Deploy kostet Michael keine Antwort und keine Anmerkung.

### Ablauf I (Betrieb): Bau nach Kontextdeckel fortsetzen (AK-12)

1. Eine Bau-Sitzung hält wegen Kontextdeckel an und hinterlässt `build-stand.md`. Die Übersicht zeigt Phase **Bau**, Zustand „Bau unterbrochen".
2. Michael öffnet das Vorhaben, liest `build-stand.md` (vorausgewählt) und wählt „Bau fortsetzen" (Ablauf E). Eine neue Sitzung übernimmt.
3. Ergebnis: Die Fortsetzung läuft ohne Terminal-Tippen.

## 3. Fachliche Anforderungen

<!-- Eine Zeile = eine prüfbare Aussage. Modalverben groß. Herkunft = AK/Z/NZ aus intent.md oder „neu (Grund)". -->

### 3.1 Übersicht

| ID | Anforderung | Herkunft | Prüfung |
|---|---|---|---|
| FA-01 | Wenn ein Projekt in der UI geöffnet ist, MUSS die Übersicht jeden Vorhaben-Ordner (`intent/INT-JJJJ-NNN-kurzname/`) des Projekts als Zeile mit Projekt, Kennung, Titel (aus dem Kopf der Absicht), Phase, Zustand und Zeitpunkt der letzten Änderung zeigen; Vorhaben mit Absicht-Status `abgeloest` oder `verworfen` DÜRFEN NICHT erscheinen. | AK-01, B-01 | Test |
| FA-02 | Solange mehrere Projekte geöffnet sind, MUSS die Übersicht eine Liste über alle Projekte zeigen, sortiert: Vorhaben im Zustand „wartet auf dich", dann „wartet", dann die übrigen laufenden nach letzter Änderung absteigend, zuletzt „umgesetzt" (eingeklappt). | AK-02 | Test |
| FA-03 | Die Übersicht MUSS einen Filter nach Projekt bieten; das aktive Projekt wird markiert, aber nicht vorgefiltert. | AK-02; design.md §4 (Liste mit vielen Einträgen) | Test |
| FA-04 | Wenn sich ein Dokument in einem Vorhaben-Ordner ändert oder eine zugeordnete Sitzung ihren Zustand wechselt, MUSS die Übersicht Phase und Zustand innerhalb von 5 s nachziehen, ohne Neuladen der Seite. | AK-03 | Test |
| FA-05 | Falls ein geöffnetes Projekt keinen Vorhaben-Ordner hat, MUSS die Übersicht für dieses Projekt einen Satz und die Aktion „Erstes Vorhaben anlegen" zeigen. | AK-04 | Stichprobe |
| FA-06 | Die Übersicht MUSS Vorhaben auch in Arbeitskopien (Git-Worktrees) des Projekts finden, die die UI kennt; dasselbe Vorhaben (gleiche Kennung) in mehreren Arbeitskopien erscheint einmal, mit dem Stand aus der Arbeitskopie der zugeordneten Sitzung, sonst dem jüngsten Stand; die Zeile nennt die Arbeitskopie. | AK-01; neu (Grund: Vorhaben entstehen in Worktrees, Beispiel INT-2026-004 selbst) | Test |
| FA-07 | Die Übersicht MUSS bei 6 offenen Projekten mit je 20 Vorhaben innerhalb von 2 s ab Öffnen vollständig angezeigt sein. | EK-03 | Messung |
| FA-08 | Die Übersicht DARF NICHT erlauben, Phase oder Zustand von Hand zu setzen, Zeilen zu verschieben oder Spalten zu bilden; sie ist eine Sicht, kein Board. | product-brief.md §7 (kein Ticket-System) | Review |
| FA-09 | Falls die Kopfwerte eines Vorhabens nicht lesbar sind (Absicht fehlt oder Kopf unlesbar), MUSS die Zeile trotzdem erscheinen: Kennung aus dem Ordnernamen, Titel „(Kopf nicht lesbar)", Phase „unbekannt". | AK-01; neu (Grund: Robustheit gegen Handarbeit in Ordnern) | Test |

### 3.2 Phase und Zustand

| ID | Anforderung | Herkunft | Prüfung |
|---|---|---|---|
| FA-10 | Die Phase MUSS allein aus den Kopffeldern der Dokumente abgeleitet werden, nach der Tabelle „Phasenregeln" unten (erste zutreffende Zeile gilt). | B-02, AN-05 | Test (je Zeile ein Fall) |
| FA-11 | Der Status eines Dokuments MUSS so gelesen werden: Absicht aus dem Kopffeld `status` (dazu `version`, `bypass`, `titel`); Spec und Plan aus der Kopfzeile „Status:" — das erste Wort ist der Status, der Rest der Zeile ist eine Notiz, die die UI neben der Phase zeigt (dort steht z. B. der PR-Verweis). | B-02 | Test |
| FA-12 | Je Phase MUSS die UI genau den nächsten Schritt anbieten, den die Tabelle „Phasenregeln" nennt, und nur, wenn keine Sitzung des Vorhabens arbeitet oder wartet. | AK-12 | Test |
| FA-13 | Der Zustand eines Vorhabens MUSS einer von sieben Werten sein: „wartet auf dich" (Sitzung wartet, Review-Dokument vorhanden), „wartet" (Sitzung wartet, kein Review-Dokument), „wartet im Terminal" (Sitzung zeigt einen Dialog: Berechtigung, Auswahlfrage, Plan-Vorprüfung), „arbeitet", „Bau unterbrochen" (Phase Bau und `build-stand.md` vorhanden, keine Sitzung arbeitet), „keine Sitzung", „Sitzung beendet". | AK-07, B-04, B-03 | Test (je Wert ein Fall) |
| FA-14 | „Sitzung wartet" MUSS bedeuten: Die Sitzung hat ihre letzte Antwort abgeschlossen oder eine Frage gestellt, seither wurde nichts eingegeben, und kein Dialog ist offen — unabhängig davon, wie lange das her ist. | B-04, AN-02 | Test |
| FA-15 | Solange ein Vorhaben „wartet auf dich" ist, MUSS die UI in der Übersicht und auf der Vorhaben-Seite den Schritt (Absicht, Spec, Plan, Bau) und das Review-Dokument nennen. | AK-07 | Test |
| FA-16 | Wenn eine Sitzung in den Zustand „wartet" wechselt, MUSS der Bell-Ton wie heute ertönen; die UI DARF NICHT zusätzlich einen zweiten Ton für den Review-Punkt einführen. | OF-04, B-08 | Review |

**Phasenregeln** (erste zutreffende Zeile gilt):

| Phase | Bedingung | Nächster Schritt (FA-12) |
|---|---|---|
| — (nicht gezeigt) | Absicht-Status `abgeloest` oder `verworfen` | — |
| umgesetzt | Absicht-Status `umgesetzt` | keiner |
| PR | Plan-Status `umgesetzt` (Merge steht aus) | keiner; PR-Verweis aus der Statusnotiz anzeigen |
| Bau | Plan-Status `freigegeben` oder `in_umsetzung` | „Bau starten" bzw. „Bau fortsetzen" (`/build INT-…`), Letzteres wenn `build-stand.md` vorhanden |
| Plan | Spec-Status `freigegeben` **oder** (Absicht `angenommen` und `bypass: ja`); Plan fehlt oder Status `entwurf` | „Plan erstellen" (`/plan INT-…`) |
| Spec | Absicht `angenommen`, `bypass: nein`; Spec fehlt oder Status `entwurf`/`in_review` | „Spec schreiben" (`/spec INT-…`) |
| Absicht | Absicht-Status `entwurf` oder `in_klaerung` | keiner (der Entwurf wird in der laufenden Sitzung geführt; Wiederaufnahme im Terminal wie heute) |
| unbekannt | keine Zeile trifft (z. B. Kopf unlesbar) | keiner |

Bei `bypass: ja` zeigt die Phase den Zusatz „Spec entfällt".

### 3.3 Lesen

| ID | Anforderung | Herkunft | Prüfung |
|---|---|---|---|
| FA-17 | Wenn Michael ein Vorhaben öffnet, MUSS die UI die vorhandenen Dokumente in fester Reihenfolge (`intent.md`, `spec.md`, `plan.md`, `build-stand.md`, Inhalt von `design/`) als gerenderten Text zeigen: Überschriften, Absätze, Listen, Tabellen, Codeblöcke, Mermaid-Diagramme als Grafik, Kopffelder als Tabelle; Bilder aus `design/` als Bild, andere Dateien dort nur mit Namen. | AK-05 | Stichprobe (Screenshot neben MacDown) |
| FA-18 | Wenn Michael am Handy (Breite unter 768 px) ein Dokument liest, DARF die Seite NICHT waagerecht scrollen; breite Tabellen und Codeblöcke scrollen in ihrem eigenen Kasten. | AK-06 | Stichprobe (Screenshot) |
| FA-19 | Wenn sich das angezeigte Dokument ändert, MUSS die Seite innerhalb von 5 s einen Hinweis mit Zeitpunkt und der Aktion „neu laden" zeigen, die Leseposition bis dahin behalten und nach dem Neuladen an derselben Überschrift stehen, sofern sie noch existiert. | AK-03, Z-02 | Test |
| FA-20 | Das Review-Dokument eines Vorhabens MUSS nach der Tabelle „Review-Punkte" bestimmt werden und beim Öffnen vorausgewählt sein; gibt es keines, ist das zuletzt geänderte Dokument vorausgewählt. | B-04, B-03 | Test |

**Review-Punkte** (gilt nur, solange die Sitzung des Vorhabens „wartet" nach FA-14):

| Phase | Review-Dokument | Schritt | Antworten aus der UI |
|---|---|---|---|
| Absicht | `intent.md` | Absicht | Änderungen · Freigabe |
| Spec | `spec.md`, falls vorhanden; sonst keines (Zustand „wartet") | Spec | Änderungen · Freigabe (nur mit Dokument) |
| Plan | `plan.md`, falls vorhanden mit Status `entwurf`; sonst keines | Plan | Änderungen · Freigabe (nur mit Dokument) |
| Bau | keines (Zustand „wartet" oder „Bau unterbrochen") | Bau | Änderungen (Antwort auf Rückfragen) |
| PR | `plan.md` (Fertigmeldung) | Bau | Änderungen; **keine Freigabe** (Merge auf GitHub, ER-07) |

### 3.4 Antworten

| ID | Anforderung | Herkunft | Prüfung |
|---|---|---|---|
| FA-21 | Eine Sitzung MUSS dem Vorhaben zugeordnet werden, sobald in ihr ein v4-Befehl mit der Kennung eingegeben wird (`/spec INT-…`, `/plan INT-…`, `/build INT-…`, auch in der langen Form mit Präfix) — gleich, ob per Knopf (FA-12) oder von Hand im Terminal. Eine mit `/intent` gestartete Sitzung gehört dem Vorhaben, dessen Ordner nach dem Start als erster neu entsteht. Die jüngste Zuordnung gewinnt. | B-09 | Test |
| FA-22 | Die Zuordnung Sitzung ↔ Vorhaben MUSS einen Neustart der UI überleben, solange die Sitzung existiert; endet die Sitzung, bleibt die Zuordnung als „Sitzung beendet" sichtbar, bis eine neue Sitzung zugeordnet wird. | AK-10, RB-01 | Test |
| FA-23 | Solange Michael ein Dokument liest, MUSS er an jedem Absatz, jeder Tabellenzeile und jeder Überschrift eine Anmerkung beginnen können, ohne zum Dokumentende zu scrollen; am Handy durch Tippen auf die Stelle. | AK-14 | Test + Stichprobe |
| FA-24 | Der Bezug einer Anmerkung MUSS von der gewählten Stelle übernommen werden, in dieser Rangfolge: Kennung in der Zeile (`AK-03`, `FA-07`, `RB-01`, `B-04`, `NZ-02`, `Z-01`, `EK-03`, `ER-05`, `AN-02`, `OF-01`, `D-…`), sonst Abschnittsnummer (`§6`), sonst Überschriftentext, sonst die ersten Wörter des Absatzes; Michael KANN den Bezug nicht ändern, nur die Stelle neu wählen. Eine Anmerkung ohne Stelle hat den Bezug „Dokument gesamt". | AK-14, B-05 | Test |
| FA-25 | Wenn Michael mehrere Anmerkungen geschrieben hat, MUSS die UI sie in Dokumentreihenfolge gesammelt zeigen, mit Bezug und Text, änderbar und löschbar, bevor er sie schickt. | AK-15 | Test |
| FA-26 | Ungesendete Anmerkungen MÜSSEN erhalten bleiben, bis Michael sie schickt oder löscht — über Seitenwechsel, Neuladen, Gerätewechsel und Neustart der UI hinweg; sie werden nie in das Dokument geschrieben. | AK-10, NZ-03; design.md §1 (gleiche Sicht auf jedem Gerät) | Test |
| FA-27 | Wenn Michael „Änderungen schicken" wählt und die Sitzung wartet, MUSS die UI genau eine Eingabe übergeben: erste Zeile `Änderungen zu [Dokument] ([Version] | Stand JJJJ-MM-TT HH:MM):`, danach je Anmerkung eine Zeile `n. [Bezug] Text` in Dokumentreihenfolge; die Eingabe MUSS innerhalb von 10 s ab Klick in der Sitzung stehen. | AK-08, OF-02, B-05 | Test (Sitzungsprotokoll) |
| FA-28 | Wenn Michael „Freigeben" wählt und bestätigt, MUSS die UI genau eine Zeile übergeben: `Freigabe: intent.md [Version]` (Version aus dem Kopf der Absicht) bzw. `Freigabe: spec.md (Stand JJJJ-MM-TT HH:MM)` bzw. `Freigabe: plan.md (Stand …)`; Stand ist der Zeitpunkt der letzten Änderung des Dokuments, den die UI angezeigt hat. | AK-09, OF-02, B-06 | Test (Sitzungsprotokoll) |
| FA-29 | „Freigeben" DARF NUR angeboten werden, wenn ein Review-Dokument vorliegt (FA-20) und die Phase nicht PR ist; Freigabe und Änderungen DÜRFEN NICHT in einer Eingabe gemischt werden. | AK-09, B-06, ER-07 | Test |
| FA-30 | Falls beim Senden keine wartende Sitzung existiert, MUSS die UI die Anmerkungen behalten und den Grund mit nächstem Schritt nennen: „keine Sitzung", „Sitzung arbeitet", „Sitzung wartet im Terminal (Dialog)", „Sitzung beendet"; sie DARF NICHT von allein nachsenden, wenn die Sitzung später bereit ist. | AK-10 | Test |
| FA-31 | Wenn eine Antwort gesendet wurde, MUSS die UI am Vorhaben ein Protokoll zeigen: Art (Änderungen mit Anzahl, Freigabe), Dokument mit Stand, Zielsitzung, „gesendet HH:MM", „angenommen HH:MM" sobald die Sitzung die Eingabe verarbeitet, sonst nach 10 s „nicht bestätigt — im Terminal prüfen"; der gesendete Text ist im Protokoll nachlesbar. | AK-11, EK-02 | Test |
| FA-32 | Das Protokoll MUSS mindestens 30 Tage und mindestens bis zur Phase „umgesetzt" erhalten bleiben und einen Neustart der UI überleben. | AK-11, EK-01 (Messung über 2 Wochen) | Test |
| FA-33 | Eine gesendete Eingabe DARF in der Sitzung NIEMALS als Befehl oder Shell-Aufruf wirken: Anmerkungstext mit führendem `/`, `!` oder mit Zeilenumbrüchen bleibt Text innerhalb der einen Eingabe. | security.md §5 (T-06), neu (Grund: Text landet im Terminal) | Test |
| FA-34 | Solange eine Antwort gesendet, aber nicht bestätigt ist, DARF ein automatischer Neustart der UI sie NICHT verlieren oder verdoppeln. | RB-01 | Test |
| FA-35 | Wenn Michael den nächsten Schritt wählt, MUSS die UI im Projekt eine Claude-Sitzung über den bestehenden Weg (Auswahl der Arbeitskopie wie heute) mit dem gewählten Modell starten und den Befehl als erste Eingabe übergeben; am Mac wechselt die UI ins Terminal dieser Sitzung, am Handy bleibt sie auf der Vorhaben-Seite. | AK-12, AK-16 | Test |
| FA-40 | Wenn die UI den nächsten Schritt anbietet, MUSS sie daneben die Modellwahl zeigen, vorbelegt mit dem zuletzt für dieses Vorhaben und diesen Schritt gewählten Modell, sonst mit dem Standard des Schritts; wählbar sind alle in den Einstellungen konfigurierten Modelle. | AK-16, B-11 | Test |
| FA-41 | Je Schritt (Absicht, Spec, Plan, Bau) MUSS ein Standardmodell einstellbar sein, in den Einstellungen unter „Modelle" neben dem heutigen allgemeinen Standard; ohne Einstellung gilt Claude Opus; die Einstellung gilt für alle Projekte. | AK-16 | Test |
| FA-42 | Die Übersicht und die Vorhaben-Seite MÜSSEN bei einer zugeordneten Sitzung deren Modell nennen. | AK-16; neu (Grund: Michael soll sehen, welches Modell gerade arbeitet) | Stichprobe |

### 3.5 Abbau

| ID | Anforderung | Herkunft | Prüfung |
|---|---|---|---|
| FA-36 | Nach der dritten Stufe DARF die UI KEINE Kanban-, Story-, Backlog- oder Spec-Auswahl-Sicht, keine Story-Karten am Handy und keinen Auto-Mode je Story mehr anbieten — auch nicht über Adresse, Tastenkürzel oder gespeicherte Ansichtseinstellung. | AK-13, B-07 | Review + Test |
| FA-37 | Zähler und Abzeichen im Rahmen, die Specs oder Stories zählen, MÜSSEN nach der dritten Stufe Vorhaben im Zustand „wartet auf dich" zählen oder entfallen. | AK-13, NZ-01 | Stichprobe |
| FA-38 | Alle Teile des Rahmens (B-08) MÜSSEN nach jeder Stufe unverändert bedienbar sein; die SDK-Chat-Ansicht und der externe Plan-Review bleiben (NZ-06). | NZ-01, NZ-06 | Test (bestehende Tests) |
| FA-39 | Alte Story-Daten in den Projekten DÜRFEN NICHT gelesen, geändert oder gelöscht werden. | NZ-07 | Review (Kennzahl EK-04) |

## 4. Fehler- und Randfälle

| Fall | Erwartetes Verhalten | Herkunft |
|---|---|---|
| Projekt ohne Vorhaben-Ordner | Satz + Aktion „Erstes Vorhaben anlegen" (`/intent`) | AK-04 / FA-05 |
| Vorhaben-Ordner ohne `intent.md` oder mit unlesbarem Kopf | Zeile erscheint mit Kennung aus dem Ordnernamen, Titel „(Kopf nicht lesbar)", Phase „unbekannt", kein nächster Schritt | FA-09 |
| Gleiche Kennung in zwei Projekten (z. B. INT-2026-004 in Specwright und Applai) | zwei Zeilen; Identität ist Projekt + Kennung | FA-01 |
| Dasselbe Vorhaben in Projekt und Worktree, Stände unterschiedlich | eine Zeile; Stand aus der Arbeitskopie der zugeordneten Sitzung, sonst jüngster Stand; Arbeitskopie genannt | FA-06 |
| Zwei Sitzungen für dasselbe Vorhaben (z. B. `/plan` zweimal gestartet) | jüngste Zuordnung gewinnt; die Sendeleiste nennt die Zielsitzung; die andere bleibt im Terminal erreichbar | FA-21 |
| Sitzung wechselt in „arbeitet", während Michael die Sendeleiste offen hat | Knopf wird inaktiv, Grund „Sitzung arbeitet — warten"; Anmerkungen bleiben | FA-30 |
| Sitzung zeigt einen Dialog (Berechtigung, Auswahlfrage, Plan-Vorprüfung) | Zustand „wartet im Terminal"; Senden inaktiv mit Verweis „im Terminal antworten"; Anmerkungen bleiben | FA-13, FA-30 |
| Sitzung wartet in der Absicht-Phase mit einer Rückfrage des Interviews (noch kein Freigabe-Vorschlag) | Zustand „wartet auf dich · Absicht · intent.md"; beide Knöpfe verfügbar; Michael entscheidet — die UI unterscheidet Interview-Frage und Freigabe-Vorlage nicht (hingenommen, Product Owner 15.09.) | FA-13, FA-20 |
| Dokument ändert sich, nachdem Michael Anmerkungen geschrieben hat | Anmerkungen bleiben; deren Bezug ist Text und bleibt gültig; Stellen, die nicht mehr gefunden werden, werden in der Sammelansicht als „Stelle nicht mehr gefunden" markiert, Bezugstext bleibt | FA-19, FA-26 |
| Dokument ändert sich zwischen Lesen und „Freigeben" | Freigabe abgelehnt, Hinweis „Dokument geändert — neu laden"; nach Neuladen erneut möglich | FA-28 |
| Dokument ändert sich zwischen Lesen und „Änderungen schicken" | Warnhinweis mit beiden Ständen; Senden erlaubt; die Eingabe nennt den Stand, den Michael gelesen hat | FA-27 |
| Sitzung bestätigt die Eingabe nicht innerhalb von 10 s | Protokoll „nicht bestätigt — im Terminal prüfen"; Anmerkungen gelten als gesendet und stehen im Protokoll; nichts wird von allein erneut gesendet | FA-31 |
| Michael tippt parallel im Terminal | beides erreicht die Sitzung; im Protokoll steht nur, was die UI gesendet hat | AK-11 |
| Sitzung endet (Prozess beendet, Tab geschlossen) | Zustand „Sitzung beendet"; nächster Schritt laut Phase; Anmerkungen bleiben | FA-22, FA-30 |
| Sitzung im Fehlerzustand | wie „Sitzung beendet", mit Fehlerhinweis der Sitzung | FA-13 |
| Neustart der UI während des Sendens | Antwort kommt genau einmal an oder wird als „nicht bestätigt" gezeigt; Zuordnung, Protokoll und Anmerkungen sind nach dem Neustart da | FA-22, FA-26, FA-34 |
| „Freigeben" bei ungesendeten Anmerkungen | Hinweis mit Anzahl; Freigabe möglich; Anmerkungen bleiben | FA-29 |
| Anmerkungstext beginnt mit `/` oder `!` oder enthält Zeilenumbrüche | bleibt Text innerhalb der einen Eingabe | FA-33 |
| Sehr langes Dokument am Handy (spec.md mit 40 FA) | Tabellen scrollen im Kasten; Anmerkungsleiste bleibt sichtbar; Dokument bleibt lesbar | FA-18, FA-23 |
| Mermaid-Diagramm fehlerhaft | Diagramm-Quelle als Codeblock mit Hinweis „Diagramm nicht darstellbar"; Rest des Dokuments unbeeinträchtigt | FA-17 |
| `design/` enthält Dateien, die keine Bilder sind | nur Name in der Liste, kein Inhalt | FA-17 |
| Phase Bau ohne Sitzung, `build-stand.md` vorhanden | Zustand „Bau unterbrochen", Schritt „Bau fortsetzen" | FA-13, FA-12 |
| Phase Bau, Sitzung wartet mit Rückfrage (kein `build-stand.md`) | Zustand „wartet · Bau", nur „Änderungen schicken" (Antwort auf die Rückfrage) | FA-20 |
| Phase PR, Sitzung wartet | „wartet auf dich · Bau · plan.md"; kein „Freigeben" | FA-20, FA-29 |
| Absicht-Entwurf ohne Sitzung | kein nächster Schritt; Hinweis „Entwurf im Terminal fortsetzen" (bestätigt, Product Owner 15.09.) | FA-12 |
| Alte Adresse einer Kanban- oder Story-Sicht wird aufgerufen | Übersicht wird gezeigt | FA-36 |

## 5. Daten, fachlich

<!-- Welche fachlichen Informationen sichtbar werden, entstehen, sich ändern oder verschwinden. Ohne Tabellen- oder Feldnamen. Datenklasse laut security.md nennen. -->

| Information | Entsteht / ändert sich / verschwindet | Wer sieht sie | Datenklasse |
|---|---|---|---|
| Vorhaben-Liste (Projekt, Kennung, Titel, Phase, Zustand, letzte Änderung, Arbeitskopie) | wird bei jedem Anzeigen aus den Dokumenten der Projekte abgeleitet; nirgends gespeichert | Michael | wie das jeweilige Projekt (bei Specwright öffentlich; bei anderen Projekten deren Klasse) |
| Dokumentinhalte (Absicht, Spec, Plan, Baustand, Design-Bilder) | gelesen aus den Projekten; nie geschrieben (NZ-03) | Michael | wie das jeweilige Projekt |
| Zuordnung Sitzung ↔ Vorhaben (Sitzung, Kennung, Schritt, Modell, Zeitpunkt, Arbeitskopie) | entsteht bei Eingabe eines v4-Befehls; ändert sich mit jeder neuen Zuordnung; bleibt als „beendet" bis zur nächsten Zuordnung | Michael | intern (nur auf dem Host, nie im Repo) |
| Zustand der Sitzung (arbeitet, wartet, Dialog, beendet) | wie heute aus den Sitzungsmeldungen; neu: unbefristet „wartet" | Michael | intern |
| Anmerkungs-Entwürfe (Vorhaben, Dokument, Bezug, Text, Zeitpunkt) | entstehen beim Schreiben; ändern sich beim Bearbeiten; verschwinden beim Senden (wandern ins Protokoll) oder Löschen; auf allen Geräten dieselben | Michael | intern; können Projektinhalt anderer Projekte zitieren — nie in ein Repo, nie in Logs, die das Repo verlassen |
| Protokoll gesendeter Antworten (Art, Dokument, Stand, Zielsitzung, gesendet, angenommen, Text) | entsteht beim Senden; „angenommen" wird nachgetragen; mindestens 30 Tage und bis „umgesetzt" | Michael | intern (wie Entwürfe) |
| Standardmodell je Schritt (vier Werte) | entsteht beim Einstellen; ändert sich beim Umstellen; ohne Einstellung Claude Opus | Michael | intern (UI-Konfiguration wie das heutige Standardmodell) |
| Letzte Modellwahl je Vorhaben und Schritt | entsteht beim Start eines Schritts; wird beim nächsten Start desselben Schritts vorbelegt | Michael | intern |
| Kennzahl EK-01/EK-02 (Anzahl und Dauer der Antworten) | aus dem Protokoll ablesbar | Michael | intern |
| Story-Daten der Projekte (Kanban, Backlog) | verschwinden aus der UI; bleiben als Dateien liegen, unverändert | niemand mehr über die UI | wie bisher |

## 6. Was der Nutzer sieht

<!-- Nur bei UI-Änderung. Beschreibung in Worten; Mock unter `design/` (Pfad nennen), sonst „kein Mock nötig, weil …". -->

- **Übersicht „Vorhaben" (Startseite am Mac, Reiter „Vorhaben" statt „Specs" am Handy):** Liste über alle offenen Projekte, Projektfilter als Chips, je Zeile Projekt · Kennung · Titel · Phase (mit Notiz, z. B. PR-Verweis) · Zustand · letzte Änderung; wartende Zeilen oben und hervorgehoben; umgesetzte eingeklappt; je Projekt die Aktion „Neues Vorhaben". Leerzustand je Projekt (ein Satz + eine Aktion), Ladezustand, Fehlerzustand (Projekt nicht lesbar: Satz mit Ursache und nächstem Schritt). Am Handy: eine Spalte, Zeile als Karte mit denselben Angaben.
- **Vorhaben-Seite:** Kopf mit Kennung, Titel, Phase, Zustand und — falls wartend — dem Review-Hinweis („Sitzung ‚spec INT-2026-004' wartet auf deine Antwort zu spec.md · Schritt Spec"); Dokumentwahl in fester Reihenfolge; Leser mit MacDown-naher Darstellung inklusive Mermaid; Randmarken je Absatz für Anmerkungen (Mac), Tippen auf Absatz (Handy); Anmerkungen als Marken im Text; Sendeleiste unten mit Zähler, Zielsitzung, „Änderungen schicken", „Freigeben" (nur mit Review-Dokument), sonst Grund + nächster Schritt; Protokoll der gesendeten Antworten unter dem Kopf, aufklappbar; nächster Schritt als einziger Hauptknopf mit Modellwahl daneben, wenn keine Sitzung wartet oder arbeitet; bei zugeordneter Sitzung deren Modell im Kopf.
- **Sammelansicht:** alle Anmerkungen des Dokuments in Dokumentreihenfolge, je Bezug + Text, bearbeiten/löschen, dann „Änderungen schicken". Am Handy als Bogen von unten.
- **Bestätigung „Freigeben":** Dokument, Version/Stand, Zielsitzung, Hinweis auf ungesendete Anmerkungen; ein Knopf.
- **Rahmen:** unverändert bis auf zwei Stellen: Zähler/Abzeichen zählen wartende Vorhaben; Einstellungen → Modelle bekommt vier Felder „Standard je Schritt" (Absicht, Spec, Plan, Bau) neben dem heutigen Standardmodell. Story-Reiter und Karten am Handy entfallen (dritte Stufe).
- **Weniger ist mehr:** je Bildschirm eine Hauptaktion — Übersicht: Zeile öffnen; Vorhaben-Seite: Antworten oder nächster Schritt; kein Element ohne Aufgabe.
- **Mocks (Pflicht nach design.md §6: neue Seite, neuer Ablauf, geänderte Navigation):**
    - `design/01-uebersicht-mac.png` — Übersicht mit wartenden, laufenden, umgesetzten Zeilen, Filter, Leerzustand eines Projekts
    - `design/02-uebersicht-handy.png` — dieselbe Übersicht am Handy, Reiter „Vorhaben"
    - `design/03-vorhaben-lesen-mac.png` — Vorhaben-Seite mit Review-Hinweis, Dokument mit Tabelle und Mermaid, Randmarken, Sendeleiste; zweiter Zustand ohne Sitzung: Hauptknopf „nächster Schritt" mit Modellwahl
    - `design/04-vorhaben-anmerkung-handy.png` — Anmerkung am Handy: Tippen auf Absatz, Eingabefeld mit Bezug, Sendeleiste
    - `design/05-sammelansicht.png` — gesammelte Anmerkungen in Dokumentreihenfolge (Mac und Handy)
    - `design/06-zustaende.png` — Laden, Fehler, „nicht bestätigt", Grund-Hinweise der Sendeleiste; Einstellungen → Modelle mit den vier Schritt-Standards
    - Die Mocks entstehen direkt nach der Spec-Freigabe, vor `/plan` (Product Owner, 15.09.); der Plan bezieht sich auf sie.

## 7. Bedenken aus den Projekt-Docs

<!-- PFLICHT. Beim Schreiben wurden product-brief, architecture, security, design gelesen. Alles, was dort reibt, steht hier — markiert, nicht entschieden.
     „Geklärt" heißt: die zuständige Rolle hat entschieden; Entscheidung steht in der Spalte. Vor der Freigabe muss jede Zeile geklärt oder als „offen, blockiert nicht, weil …" begründet sein.
     Gibt es nichts: „Keine — geprüft gegen Stand [sha]." -->

Geprüft gegen Stand 8351674.

| Quelle | Bedenken | Betrifft | Geklärt? (wer, wann, wie) |
|---|---|---|---|
| architecture.md §3 Datenbesitz; CLAUDE.md ADR-Pflicht bei Datenhaltung | Zuordnung Sitzung ↔ Vorhaben, Anmerkungs-Entwürfe und Protokoll sind neue Daten ohne Besitzer-Zeile. Intent AN-05 (keine eigene Datenhaltung) gilt für Phase und Zustand, nicht für diese drei. | FA-21, FA-22, FA-26, FA-31, FA-32 | offen — an den Plan delegiert, nicht blockierend. Vorschlag: Besitzer UI-Backend, Laufzeitdatei je Backend-Instanz wie der Workspace, Zeile in §3, ADR. |
| architecture.md AR-05 (Workspace-Zustand im Backend, gleiche Sicht auf jedem Gerät) | Entwürfe und Protokoll müssen auf Mac und Handy dieselben sein (FA-26). AR-05 nennt nur Workspace-Zustand; die Regel muss auf diese Daten ausgedehnt oder eine eigene Regel ergänzt werden. | FA-26, FA-32 | offen — an den Plan delegiert, nicht blockierend. Vorschlag: AR-05 auf „Nutzerzustand der UI" erweitern, gleiche PR. |
| architecture.md AR-06 (Framework nie von der UI abhängig); intent RB-03, OF-01 | Braucht die UI einen Marker der Workflows, um den Review-Punkt zu erkennen? | FA-13, FA-14, FA-20 | geklärt fachlich, Spec 15.09.: **kein Marker.** Freigabe-Stand kommt aus den Kopffeldern, die die Workflows heute schon schreiben; Wartezustand aus den Sitzungsmeldungen. Einzige Unschärfe: Interview-Rückfrage vs. Freigabe-Vorlage in der Absicht-Phase (Randfall) — hinnehmbar. Workflows bleiben unverändert (NZ-04). Bestätigung: AN-S03. |
| architecture.md AR-07 (Vorhaben im Repo-Root) | Vorhaben entstehen in Worktrees; das registrierte Projektverzeichnis kennt sie nicht (Beispiel: dieses Vorhaben liegt nur im Worktree `session-neue-ui`). | FA-06 | geklärt fachlich, Spec 15.09.: Übersicht liest Projekt und die Worktrees, die die UI kennt; eine Zeile je Kennung. Wie enumeriert wird: Plan. Bestätigung: AN-S04. |
| architecture.md AR-03 (Lock-Reihenfolge UI ↔ Kanban) | Nach der dritten Stufe schreibt die UI keine Story-Daten mehr; AR-03 verliert ihre UI-Seite, ihr Test gehört zu entfernten Komponenten. | FA-36, FA-39 | offen — an den Plan delegiert, nicht blockierend. Vorschlag: AR-03 in der PR der dritten Stufe auf den MCP-Server einschränken oder streichen; Test laut RB-06/ER-09 behandeln. |
| architecture.md §1 (Diagramm UI → MCP), §2 (Backend „Auto-Mode-Orchestrierung"), §3 (Story-Daten „UI über MCP-Werkzeuge und Datei-Watcher"), §10 (Abweichung „Story pro Session") | Vier Stellen beschreiben den Story-Pfad als Soll. | FA-36 | geklärt durch intent RB-07 (Product Owner, 15.09.): gleiche PR. Welche Stellen genau: Plan (dritte Stufe). |
| architecture.md §5 (Cloud-Host, Auto-Deploy bei Push auf `main`); intent RB-01 | Das Deploy-Gate schützt heute nur laufende Auto-Mode-Läufe; nach dem Abbau braucht es ein Kriterium für „Antwort gesendet, nicht bestätigt". | FA-34, FA-22 | offen — an den Plan delegiert, nicht blockierend. Vorschlag: Gate meldet „belegt", solange eine Antwort unbestätigt ist (höchstens 10 s); Zuordnung, Entwürfe, Protokoll liegen auf Platte, bevor gesendet wird. |
| security.md §1 Datenklassen | Anmerkungen und Protokoll zitieren Projektinhalte anderer Projekte (Kreis Lippe, Applai). Sie dürfen nie in ein Repo und nie in ein Log geraten, das das Repo verlässt. | FA-26, FA-31, FA-32 | geklärt fachlich, Spec 15.09.: Datenklasse intern, Ablage nur auf dem Host (Abschnitt 5). Speicherort: Plan, im Laufzeitverzeichnis der UI. |
| security.md §2, T-06 (UI führt Befehle über das Terminal aus); §6 Pflichtprüfung „Endpunkt anlegen oder ändern"; intent RB-05 | Der Sende-Weg ist ein weiterer Weg, Text in ein Terminal zu bringen. Kein neuer offener Endpunkt; Zugriffsmodell bleibt netzseitig. | FA-27, FA-28, FA-35 | offen — an den Plan delegiert, nicht blockierend. Der Plan nennt laut §6: Zugriffsbegrenzung (bestehender Kanal), Eingabevalidierung (Länge, Zeichen), Datenklasse der Antwort. |
| security.md §5 Verbotsliste (Sinn: T-06) | Anmerkungstext darf in der Sitzung nie als Befehl wirken (führendes `/` oder `!`, Zeilenumbruch als Eingabe-Ende). | FA-33 | geklärt fachlich (FA-33); wie: Plan (eine Eingabe, Zeilenumbrüche als Teil des Texts). |
| security.md §5 (Hostnamen, Pfade, Ports des Cloud-Hosts nie im Repo) | Mocks, Screenshots und Protokoll-Beispiele im PR und unter `design/` dürfen keine Host-Details zeigen. | Abschnitt 6 | geklärt durch intent RB-04/RB-05 (Product Owner, 15.09.): Screenshots gegen Branch-Backend lokal mit Scratch-Projekt; Review vor Commit. |
| security.md §7 (Phase 5 sollte T-06/Nutzerverwaltung angehen) | Dieses Vorhaben ist Phase 5, schließt Anmeldung aber aus (NZ-08). Die Lücke bleibt; §7 zeigt auf ein Vorhaben, das sie nicht schließt. | — | geklärt durch intent NZ-08 (Product Owner, 15.09.). Folge: §7 muss auf ein eigenes Vorhaben zeigen — Plan (dritte Stufe) oder Board-Karte. |
| design.md §1 Prinzip 4 (bestehende Komponenten zuerst) | Ein Vorschau-Panel und ein Docs-Leser existieren (ohne Mermaid), ein Kommentar-Thread hängt an Backlog-Items. Ob sie wiederverwendet werden, entscheidet der Plan; fachlich zählt nur FA-17. | FA-17, FA-23 | offen — an den Plan delegiert, nicht blockierend. Vorschlag: Leser wiederverwenden und um Mermaid ergänzen; Kommentar-Thread nicht (anderes Datenmodell). |
| design.md §4 Muster „Liste mit vielen Einträgen: Sortierung, Suche, Recents zuerst" | 6 Projekte × 20 Vorhaben = 120 Zeilen. Sortierung (FA-02) und Projektfilter (FA-03) sind drin; Textsuche nicht. | FA-02, FA-03 | geklärt: Product Owner 15.09. — Textsuche später (AN-S07 bestätigt); Kandidat für ein Folge-Vorhaben. |
| design.md §4 Muster „Fehler nach Aktion: inline mit Ursache und nächstem Schritt"; §4 Leerzustand | Übernommen in FA-05, FA-30, FA-31. | FA-05, FA-30, FA-31 | geklärt fachlich, Spec 15.09. |
| design.md §5 (Handy < 768 px, ein Pane; Tastatur-Bedienbarkeit, Kontrast, Labels) | Anmerkung an der Lesestelle am Handy: kein Hover, Tippen darf nicht mit Scrollen kollidieren; Randmarken am Mac müssen per Tastatur erreichbar sein. | FA-23, Abschnitt 6 | offen — an die Mocks und den Plan delegiert, nicht blockierend. Vorschlag: Tippen auf Absatz öffnet Aktionsleiste („Anmerkung"), kein Long-Press; am Mac Randmarke fokussierbar. |
| design.md §6 (Mocks Pflicht: neue Seite, neuer Ablauf, geänderte Navigation) | Sechs Mocks nötig (Abschnitt 6). Wann entstehen sie? | Abschnitt 6 | geklärt: Product Owner 15.09. — direkt nach der Spec-Freigabe, in dieser Sitzung, vor `/plan`. |
| product-brief.md §7 (kein eigenes Ticket-System; das Board bleibt die Sicht auf offene Arbeit) | Die Übersicht darf kein zweites Board werden. | FA-08 | geklärt fachlich (FA-08): reine Sicht, kein Handstatus, keine Spalten, keine Priorisierung. |
| product-brief.md §5 (Zeile „Web-UI: Projekte, Kanban, Auto-Mode …"), §8 („Web-UI-Pfad … bis Phase 5 unverändert"; „Story … nur noch im Web-UI-Pfad") | Drei Stellen beschreiben den Story-Pfad als Stand. | FA-36 | offen — an den Plan delegiert, nicht blockierend. Vorschlag: in der PR der dritten Stufe nachziehen (analog RB-07). |
| architecture.md §3 Datenbesitz; security.md §1 (UI-Konfiguration intern, ungestaged) | Standardmodell je Schritt und letzte Modellwahl je Vorhaben sind neue Konfigurations- und Zustandsdaten; heute liegt das Standardmodell in der UI-Konfiguration, die Story-Wahl in den Story-Daten (die entfallen). | FA-40, FA-41, FA-42 | offen — an den Plan delegiert, nicht blockierend. Vorschlag: Schritt-Standards neben dem heutigen Standardmodell in der Modell-Konfiguration; letzte Wahl in der Zuordnung (Zeile oben). Keine neue Abhängigkeit (ER-02): Anbieter und Modelle sind konfiguriert. |
| intent NZ-01 (Settings bleiben, wie sie sind) | FA-41 fügt der Modelle-Seite vier Felder hinzu. | FA-41 | geklärt: Michael 15.09. („so wie heute bei den Stories … einstellbar"); kein Neubau, eine Ergänzung im bestehenden Abschnitt. Bestätigung: AN-S15. |
| product-brief.md §2 (Nutzer: Agent, der ein Projekt frisch öffnet) | Unberührt: Der Agent liest weiter Dateien, nicht die UI (AR-06). | — | geklärt: keine Reibung. |

## 8. Nicht im Umfang

<!-- Aus NZ der intent.md plus alles, was beim Schreiben ausgeschlossen wurde. -->

- NZ-01: Kein Neubau des Rahmens (Sidebar, Projekt-Tabs, Cloud-Terminal, Settings, Team, Mobile-Shell, Notizblock).
- NZ-02: Kein Umbau oder Abbau des Kanban-MCP-Servers und des Memory-Stores.
- NZ-03: Kein Editieren der Dokumente in der UI; Anmerkungen gehen nur in die Sitzung.
- NZ-04: Keine Änderung an Workflows und Vorlagen — bestätigt: kein Marker nötig (Abschnitt 7, AR-06).
- NZ-05: Keine Website, keine Vault-Zwischenlösung „Cockpit".
- NZ-06: Kein Umbau des externen Plan-Reviews und der SDK-Chat-Ansicht.
- NZ-07: Keine Migration alter Story-Daten.
- NZ-08: Keine Mehrbenutzer-Funktionen, keine Anmeldung.
- Zusätzlich ausgeschlossen beim Schreiben der Spec:
    - Lesen der Projekt-Docs (`docs/product-brief.md` usw.) in der UI: Das heutige Docs-Panel gehört zur Arbeitsfläche und entfällt mit ihr; ein Leser für Projekt-Docs ist ein Kandidat für ein Folge-Vorhaben (AN-S08).
    - Wiederaufnahme eines Absicht-Entwurfs per Knopf: Der `/intent`-Workflow kennt keine Wiederaufnahme (NZ-04); Phase Absicht hat keinen nächsten Schritt.
    - Merge des PR aus der UI (ER-07).
    - Automatisches Nachsenden von Anmerkungen, sobald eine Sitzung bereit wird (FA-30).
    - Anmerkungen als Datei im Projekt oder als Kommentar im Dokument (NZ-03).
    - Textsuche in der Übersicht (Product Owner 15.09.: später; Folge-Vorhaben).
    - Modellwahl je Projekt oder je Vorhaben als Dauer-Einstellung: Standards gelten global je Schritt, die Wahl beim Start je Lauf (AN-S15).
    - Antworten in einen offenen Terminal-Dialog (Berechtigung, Auswahlfrage, Plan-Vorprüfung) — bleibt Sache des Terminals (B-03).
    - Bearbeiten des Bezugs einer Anmerkung von Hand (FA-24).

## 9. Annahmen

<!-- Vorläufige Auslegungen nach ER-00 der intent.md. Werden bei der Freigabe gesammelt bestätigt. -->

- **AN-S01:** „Wartet auf dich" wird um „wartet" (Sitzung stellt eine Frage, kein Review-Dokument) und „wartet im Terminal" (Dialog) ergänzt; alle drei zählen bei der Sortierung als wartend, nur „wartet auf dich" bietet „Freigeben". Engste Auslegung von B-04 wäre nur „wartet auf dich"; Rückfragen der Sitzung wären dann vom Handy nicht beantwortbar (AK-06). — bestätigt am 2026-09-15 von Product Owner
- **AN-S02:** Der Zustand „wartet" verfällt nicht mit der Zeit (FA-14). Heute verblasst „fertig" nach einiger Zeit zu „untätig"; für Review-Punkte darf das nicht gelten. — bestätigt am 2026-09-15 von Product Owner
- **AN-S03:** Kein Marker in den Workflows (Abschnitt 7, AR-06); die Unschärfe Interview-Rückfrage vs. Freigabe-Vorlage in der Absicht-Phase wird hingenommen. — bestätigt am 2026-09-15 von Product Owner
- **AN-S04:** Die Übersicht liest Vorhaben aus dem Projekt und aus den Worktrees, die die UI kennt; eine Zeile je Projekt + Kennung (FA-06). — bestätigt am 2026-09-15 von Product Owner
- **AN-S05:** Wortlaut der Eingaben (FA-27, FA-28): Freigabe ohne Kennung, wie in OF-02 entschieden; Version bei der Absicht aus dem Kopf, bei Spec und Plan der Stand (Zeitpunkt der letzten Änderung, Minute genau). Die Zielsitzung wird vor dem Senden angezeigt; das ersetzt die Kennung im Text. — bestätigt am 2026-09-15 von Product Owner
- **AN-S06:** In der Phase PR gibt es kein „Freigeben" (Merge auf GitHub, ER-07); die Bau-Fertigmeldung ist ein Review-Punkt für Änderungen (FA-20, FA-29). — bestätigt am 2026-09-15 von Product Owner
- **AN-S07:** Keine Textsuche in der Übersicht; Projektfilter und Sortierung genügen (design.md §4 verlangt „Suche" — bewusst abgewichen, weniger ist mehr). — bestätigt am 2026-09-15 von Product Owner („später reicht")
- **AN-S08:** Das heutige Docs-Panel (liest die v3-Produktdokumente) entfällt mit der Arbeitsfläche; kein Leser für Projekt-Docs in diesem Vorhaben. — bestätigt am 2026-09-15 von Product Owner („brauchen wir erstmal nicht")
- **AN-S09:** Bezug einer Anmerkung ist nicht von Hand änderbar (FA-24); wer den falschen Bezug hat, wählt die Stelle neu. — bestätigt am 2026-09-15 von Product Owner
- **AN-S10:** Entwürfe und Protokoll sind auf allen Geräten dieselben (FA-26, FA-32); Protokoll mindestens 30 Tage. — bestätigt am 2026-09-15 von Product Owner
- **AN-S11:** Zähler und Abzeichen im Rahmen zählen künftig wartende Vorhaben (FA-37). — bestätigt am 2026-09-15 von Product Owner
- **AN-S12:** Alles, was weder Story-Pfad (B-07) noch Rahmen (B-08) ist (Prompt-Vorlagen, SDK-Chat, Plan-Review), bleibt unverändert. — bestätigt am 2026-09-15 von Product Owner
- **AN-S13:** Nach dem Senden verschwinden die Anmerkungen aus dem Dokument und sind nur noch im Protokoll sichtbar (Ablauf C, Schritt 8). Alternative wäre, sie als „gesendet" im Text stehen zu lassen. — bestätigt am 2026-09-15 von Product Owner
- **AN-S14:** Am Mac wechselt „nächster Schritt" ins Terminal der neuen Sitzung, am Handy nicht (FA-35). — bestätigt am 2026-09-15 von Product Owner
- **AN-S15:** Standardmodelle je Schritt gelten für alle Projekte und liegen in den Einstellungen unter „Modelle"; die Wahl beim Start gilt für diesen Start und wird je Vorhaben und Schritt als Vorbelegung gemerkt (FA-40, FA-41). Engere Alternativen (nur globaler Standard ohne Schritt-Unterscheidung; kein Merken je Vorhaben) wären weniger als „wie heute je Story". — bestätigt am 2026-09-15 von Product Owner

## 10. Freigabe

- [x] Jede FA hat Herkunft und Prüfung.
- [x] Jedes AK der intent.md ist von mindestens einer FA abgedeckt (Matrix unten, AK-01 bis AK-16).
- [x] Abschnitt 7 vollständig geklärt oder begründet offen (offene Zeilen: an den Plan delegiert, nicht blockierend).
- [x] Keine Technik, keine Architektur, keine Dateinamen in diesem Dokument (Dokumentnamen der Vorhaben sind Fachbegriffe; Pfade nur in Abschnitt 7 als Herkunft).
- [x] Bei risikoklasse hoch: Tech Lead hat gelesen. (nicht zutreffend, mittel)
- **Freigegeben:** Product Owner (Michael Sindlinger), 2026-09-15, Commit siehe `git log -- spec.md`

**Zuordnung AK → FA:**

| AK | FA |
|---|---|
| AK-01 | FA-01, FA-06, FA-09, FA-10, FA-11 |
| AK-02 | FA-02, FA-03 |
| AK-03 | FA-04, FA-19 |
| AK-04 | FA-05 |
| AK-05 | FA-17 |
| AK-06 | FA-18, FA-23 |
| AK-07 | FA-13, FA-14, FA-15, FA-20 |
| AK-08 | FA-27, FA-21 |
| AK-09 | FA-28, FA-29 |
| AK-10 | FA-22, FA-26, FA-30 |
| AK-11 | FA-31, FA-32 |
| AK-12 | FA-12, FA-35 |
| AK-13 | FA-36, FA-37, FA-38, FA-39 |
| AK-14 | FA-23, FA-24 |
| AK-15 | FA-25 |
| AK-16 | FA-35, FA-40, FA-41, FA-42 |
