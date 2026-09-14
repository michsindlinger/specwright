# Spec: Command-Schnitt 45 → 23, ein Installer-Manifest, Specwright lebt den v4-Flow selbst

> **Intent:** `intent.md` (INT-2026-002, Version 1.0.0)
> **Status:** freigegeben
> **Erstellt:** 2026-09-14 · **Freigabe:** Product Owner (Michael Sindlinger), 2026-09-14
> **Gelesene Projekt-Docs:** keine vorhanden — `docs/product-brief.md`, `docs/architecture.md`, `docs/security.md`, `docs/design.md` entstehen erst in diesem Vorhaben (AK-07). Ersatzweise gelesen: `CLAUDE.md`, `README.md`, `~/Documents/AI-native-SDLC-Plan-2026-09-13.md` (Stand: Commit `5ffd6b0`). Siehe Abschnitt 7, Zeile 1.

<!-- Die Spec ist FACHLICH. Sie beschreibt, was Nutzer erleben und was fachlich gelten muss.
     Nicht hinein gehören: Dateien, Komponenten, Datenbanktabellen, Bibliotheken, Architekturentscheidungen. Das ist plan.md.
     Pfade nur als Herkunftsangabe in Abschnitt 7. -->

## 1. Zusammenfassung

Wer Specwright neu installiert, bekommt danach 23 Befehle statt 45, aus jedem Installer dieselben (Z-01, AK-01, AK-02). Wer ein Projekt mit altem Stand aktualisiert, bekommt die 22 entfernten Befehle samt Zubehör aktiv weggeräumt, jede Löschung wird genannt, selbst Geändertes wird nie stumm angefasst (Z-03, AK-04, AK-05). Eine einzige Liste im Specwright-Repo hält fest, was dazugehört; eine Prüfung schlägt an, sobald ein Installer davon abweicht (Z-02, AK-03). Specwright selbst hat danach, was es von jedem Projekt verlangt: ein Vorhaben unter `intent/`, vier Projekt-Docs, eine einseitige `CLAUDE.md`, einen Verify-Befehl und eine CI, die dasselbe prüft (Z-04, AK-07 bis AK-10). Die Web-UI merkt von alledem nichts (NZ-01, AK-06). Version 4.0.0 (AK-11).

## 2. Nutzer und Abläufe

### Ablauf A: Frische Installation in ein neues Projekt (AK-01, AK-02)

1. Michael führt in einem leeren Projektordner den Installer aus (interaktiv oder nicht-interaktiv, wie heute).
2. Der Installer zeigt vorab, was er anlegen wird; die Zahl der Befehle ist 23.
3. Nach dem Lauf liegen im Projekt genau die 23 Befehle aus B-01, zu jedem der Workflow, dazu die Vorlagen, Agenten, Skills und MCP-Profile, die diese 23 brauchen — und nichts, was nur ein entfernter Befehl brauchte.
4. Der Abschlussbericht des Installers nennt die vier v4-Befehle zuerst und keinen entfernten Befehl mehr.

### Ablauf B: Update eines Projekts mit Stand 3.x (AK-04, AK-05)

1. Michael führt in einem Projekt mit altem Stand (z. B. Applai, 45 Befehle) das Update aus.
2. Das Update aktualisiert bleibende Dateien wie heute: unveränderte werden ersetzt, wenn die Repo-Fassung neuer ist; abweichende bekommen vorher eine Sicherungskopie und werden ersetzt, mit Meldung.
3. Das Update löscht jede Datei aus der Liste „in 4.0.0 entfernt" (B-02, B-03), die im Projekt liegt und **unverändert** gegenüber ihrer letzten Repo-Fassung ist, und nennt jede gelöschte Datei einzeln.
4. Solange eine zu entfernende Datei im Projekt **verändert** wurde, lässt das Update sie liegen und meldet: „nicht gelöscht, lokal geändert — bitte selbst entscheiden".
5. Am Ende steht eine Zusammenfassung: Anzahl aktualisiert, hinzugefügt, gelöscht, übersprungen (lokal geändert).
6. Ergebnis: Das Projekt hat dieselben 23 Befehle wie nach Ablauf A; alles außerhalb der Liste (eigene Specs, ADRs, `intent/`, `docs/`, Archiv, `CLAUDE.md`) ist unverändert.

### Ablauf C: Ein Befehl kommt hinzu oder fällt weg (AK-03)

1. Wer Specwright weiterentwickelt, trägt die neue Datei (oder die Streichung) an genau einer Stelle ein: in der Liste (B-04).
2. Alle Installer bedienen sich aus dieser Liste; keiner führt eine eigene.
3. Der Verify-Befehl (und die CI auf jedem PR) prüft: Jede Datei der Liste existiert im Repo, jede Datei der einschlägigen Verzeichnisse steht in der Liste, jeder Installer liefert die Liste vollständig. Bei Abweichung: rot mit Dateiname und Ort.
4. Beim Wegfall wird die Datei außerdem in die Liste „entfernt seit Version x" aufgenommen, damit Ablauf B sie in Projekten findet.

### Ablauf D: Specwright prüft sich selbst (AK-07 bis AK-10)

1. Vor jeder Fertigmeldung läuft im Specwright-Repo ein Verify-Befehl (B-08): Installer-Syntax, beide Guards, Manifest-Prüfung, `CLAUDE.md`-Länge, UI-Lint, UI-Backend-Build, UI-Frontend-Build, UI-Tests gegen die Bezugsliste.
2. Er endet mit `verify: OK` oder nennt, was rot ist. Bekannte rote UI-Suiten stehen in der Bezugsliste (B-06) und brechen den Lauf nicht; jede neue rote Suite bricht ihn.
3. Derselbe Lauf passiert in der CI bei jedem PR; grün dort ist die Wahrheit, lokal grün ist Vorprüfung (Pilot-Lehre).
4. Das Repo enthält `intent/INT-2026-002-command-schnitt/` mit `intent.md`, `spec.md`, `plan.md` und die vier Projekt-Docs; `CLAUDE.md` verweist darauf und bleibt unter 90 Zeilen.

### Ablauf E: Marktvalidierungs-Vorlagen sichern (AK-12) — Betriebsvorgang mit Freigabe

1. Vor dem Löschen kopiert Claude die 7 Vorlagen der Marktvalidierung an einen Ort außerhalb des Repos, den Michael nennt (Vorschlag: Vault `AI/Rohmaterial/Specwright-Marktvalidierung-2026-09/`).
2. Michael sichtet die Kopie und sagt „behalten" oder „verwerfen". Bis dahin bleibt die Kopie; das Löschen im Repo geht weiter, weil Git das Archiv ist (RB-06).
3. Der PR nennt den Ablageort.

### Ablauf F: Veröffentlichung 4.0.0 (AK-11) — Betriebsvorgang mit Freigabe

1. Alles liegt auf einem Branch; der Nachweis für Ablauf B wurde im Applai-Checkout auf einem Branch gefahren, nicht auf dessen `main` (ER-04).
2. Michael reviewt den PR und merged. Ab dann liefern alle Installer 4.0.0; die UI auf dem Droplet wird neu deployt, obwohl kein UI-Code geändert wurde (RB-01).
3. Rückzug: Revert des Merges, Version zurück auf 3.33.x (Abschnitt 10 der Absicht).

## 3. Fachliche Anforderungen

| ID | Anforderung | Herkunft | Prüfung |
|---|---|---|---|
| FA-01 | Nach einer frischen Installation MUSS das Projekt genau die 23 Befehle aus B-01 enthalten. | AK-01 | Test |
| FA-02 | Zu jedem bleibenden Befehl MUSS der zugehörige Workflow und alles, was dieser Befehl benutzt, mitinstalliert sein. | AK-02 | Test |
| FA-03 | Nichts, was ausschließlich ein entfernter Befehl benutzt hat (B-03), DARF nach Installation oder Update im Projekt oder im Repo verbleiben. | AK-02 | Test (Referenzsuche) |
| FA-04 | Es MUSS genau eine Liste geben, aus der alle fünf Installer die zu liefernden Dateien beziehen; eine zweite, abweichende Liste in einem Installer DARF NICHT existieren. | AK-03, Z-02 | Review, Test |
| FA-05 | Wenn Liste, Repo-Verzeichnisse oder ein Installer voneinander abweichen, MUSS die Prüfung mit Fehlercode enden und Dateiname sowie Fundort nennen. | AK-03 | Test |
| FA-06 | Die Prüfung MUSS Teil des Verify-Befehls und der CI sein. | AK-03, AK-09, AK-10 | Test |
| FA-07 | Beim Update MUSS jede Datei aus der Liste „entfernt seit 4.0.0", die unverändert im Projekt liegt, gelöscht und im Lauf einzeln genannt werden. | AK-04 | Test |
| FA-08 | Beim Update DARF eine lokal veränderte Datei NICHT gelöscht und NICHT stumm überschrieben werden; sie MUSS im Lauf mit Grund genannt werden. | AK-05 | Test |
| FA-09 | Beim Update DARF NICHTS außerhalb der Listen (bleibend, entfernt) angefasst werden — insbesondere nicht `intent/`, `docs/`, eigene Specs, ADRs, Archiv, `CLAUDE.md` des Projekts. | AK-04, Z-03 | Test (`git status` nach Lauf) |
| FA-10 | Das Update MUSS am Ende zählen: aktualisiert, hinzugefügt, gelöscht, übersprungen. | AK-04 | Stichprobe |
| FA-11 | Die Web-UI MUSS nach dem Umbau Auto-Mode, Kanban und die von ihr aufgerufenen Befehle (`execute-tasks`, `create-spec`, `add-bug`) unverändert vorfinden. | AK-06, NZ-01 | Test (UI-Tests gegen Bezugsliste), Stichprobe |
| FA-12 | Das Specwright-Repo MUSS `intent/` mit diesem Vorhaben und die vier Projekt-Docs nach den v4-Vorlagen enthalten; `security.md` und `design.md` DÜRFEN kurz sein, DÜRFEN aber nicht nur aus Platzhaltern bestehen. | AK-07 | Review |
| FA-13 | `CLAUDE.md` des Specwright-Repos MUSS höchstens 90 Zeilen haben und auf die Projekt-Docs verweisen; die Prüfung der Länge MUSS Teil des Verify-Befehls sein. | AK-08 | Test |
| FA-14 | Der Verify-Befehl MUSS mit `verify: OK` enden, wenn alles grün ist, und sonst nennen, was rot ist. | AK-09 | Test |
| FA-15 | Bekannte rote UI-Testsuiten MÜSSEN in einer Bezugsliste stehen; nur neue rote Suiten DÜRFEN den Verify-Befehl brechen; die Bezugsliste DARF nur nach einem CI-Lauf gekürzt werden. | AK-09, AK-10, ER-06 | Test, Review |
| FA-16 | Derselbe Verify-Lauf MUSS in der CI auf jedem PR laufen. | AK-10 | Test (grüner PR-Check) |
| FA-17 | `VERSION` und die im Installer eingebettete Version MÜSSEN übereinstimmen und `4.0.0` lauten; der Verify-Befehl MUSS die Übereinstimmung prüfen. | AK-11 | Test |
| FA-18 | `README.md` und `CLAUDE.md` DÜRFEN keinen entfernten Befehl mehr nennen. | AK-11 | Test (Suche), Review |
| FA-19 | Vor dem Löschen der Marktvalidierungs-Vorlagen MÜSSEN sie außerhalb des Repos liegen und der Ort MUSS im PR stehen. | AK-12 | Stichprobe |
| FA-20 | Sicherungskopien, die das Update anlegt, DÜRFEN NICHT als lose Dateien neben den Projektdateien liegen bleiben; sie MÜSSEN an einem Ort liegen, den ein Mensch gesammelt löschen kann. | neu (Grund: Board-Backup-Erfahrung — 657 Kopien neben der Datei, 13.09.) | Stichprobe |
| FA-21 | Ein entfernter Befehl, den Michael in einem Projekt trotzdem behalten will, MUSS behaltbar sein, ohne dass jedes Update ihn erneut löschen will. | neu (Grund: Randfall 4) | Test |

## 4. Fehler- und Randfälle

| Fall | Erwartetes Verhalten | Herkunft |
|---|---|---|
| Update in einem Projekt ohne Specwright-Befehle (z. B. nur Workflows installiert) | Update legt nichts Ungefragtes an, löscht nichts, meldet „keine Befehle gefunden, übersprungen". | FA-09 |
| Zu entfernende Datei ist lokal verändert | Bleibt liegen, wird gemeldet mit Grund und Hinweis, wie man sie behält oder löscht. | FA-08 |
| Zu entfernende Datei ist lokal verändert **und** Michael hat sie bewusst behalten (Randfall wiederholt sich bei jedem Update) | Es gibt eine Möglichkeit, sie als „bewusst behalten" zu markieren; danach schweigt das Update dazu. | FA-21 |
| Bleibende Datei ist lokal verändert | Wie heute: Sicherungskopie, dann ersetzen, mit Meldung — aber Kopie nicht neben der Datei (FA-20). | FA-08, FA-20 |
| Update mit „erzwingen"-Option | Bleibende Dateien werden auch bei Gleichheit ersetzt; für zu entfernende Dateien gilt trotzdem FA-08 — „erzwingen" löscht nichts Verändertes. | FA-08 |
| Installer läuft, während der Download scheitert (Netz, GitHub-Limit) | Wie heute in `install.sh`: Datei zählt als fehlgeschlagen, Lauf endet mit Zahl der Fehlschläge, nichts Halbes wird geschrieben. Für die anderen Installer gilt dasselbe Ziel (Bedenken 5). | FA-01 |
| Projekt referenziert in seiner eigenen `CLAUDE.md` einen entfernten Befehl | Update fasst die Projekt-`CLAUDE.md` nicht an (FA-09); der Lauf weist am Ende darauf hin, dass die gelöschten Befehle dort ggf. noch genannt sind. | FA-09, FA-10 |
| Frische Installation in ein Projekt, das schon Dateien hat | Wie heute: vorhandene Dateien werden übersprungen, außer mit Überschreiben-Option. Entfernte Dateien werden bei der Installation nicht gelöscht — das ist Sache des Updates (Ablauf B). | FA-01 |
| Die UI-Bezugsliste enthält eine Suite, die inzwischen grün ist | Der Verify-Befehl meldet „repariert, Zeile streichen" — aber nur ein CI-Lauf rechtfertigt das Streichen (FA-15). | FA-15 |
| Manifest nennt eine Datei, die im Repo fehlt (Tippfehler) | Prüfung rot mit Dateiname; kein Installer lädt sie stillschweigend ins Leere. | FA-05 |
| Ein Agent oder eine Vorlage wird von einem bleibenden **und** einem entfernten Befehl benutzt | Bleibt (B-03: nur was ausschließlich Entferntes benutzt, geht). | FA-03 |
| Kanban-MCP-Server oder seine Memory-Werkzeuge | Bleiben unverändert, obwohl die drei Memory-Befehle entfernt werden — die Werkzeuge nutzt auch die UI. | NZ-01, FA-11 |

## 5. Daten, fachlich

| Information | Entsteht / ändert sich / verschwindet | Wer sieht sie | Datenklasse |
|---|---|---|---|
| Liste der zu liefernden Dateien je Art (Befehl, Workflow, Vorlage, Agent, Skill, MCP-Profil) | entsteht, wird bei jeder Änderung am Lieferumfang gepflegt | Entwickler von Specwright, Installer | intern (öffentliches Repo) |
| Liste „entfernt seit 4.0.0" | entsteht | Update-Lauf, Entwickler | intern (öffentlich) |
| Bericht eines Update-Laufs (aktualisiert, hinzugefügt, gelöscht, übersprungen, mit Dateinamen) | entsteht je Lauf, nur auf dem Bildschirm | wer das Update ausführt | intern |
| Sicherungskopien ersetzter Dateien | entstehen je Lauf, an einem gesammelten Ort | Projektinhaber | wie die Originaldatei (im Projekt: intern) |
| Markierung „bewusst behalten" für einen entfernten Befehl | entsteht auf Wunsch | Update-Lauf, Projektinhaber | intern |
| Bezugsliste bekannter roter UI-Suiten | entsteht (gemessen), ändert sich nur nach CI-Lauf | Verify-Befehl, CI, Entwickler | intern (öffentlich) |
| 22 Befehle, ihre Workflows, 9 Agenten, Vorlagen der Marktvalidierung und Plattform-Planung, 1 MCP-Profil, 1 Installer-Skript | verschwinden aus Repo und Projekten | — (Git-Historie bleibt) | intern (öffentlich) |
| Kopie der Marktvalidierungs-Vorlagen | entsteht außerhalb des Repos | Michael | intern |
| Projekt-Docs und `intent/` von Specwright | entstehen | jeder Leser des Repos | intern (öffentlich) — keine Geheimnisse, keine Personendaten |

Keine personenbezogenen Daten, keine Geheimnisse. Alles liegt in einem öffentlichen Repo; die Projekt-Docs von Specwright dürfen deshalb keine Pfade, Hostnamen oder Tokens des Droplets enthalten (Bedenken 4).

## 6. Was der Nutzer sieht

- Terminal: Installer-Vorschau und -Bericht nennen 23 Befehle; Update-Bericht nennt Löschungen einzeln und zählt am Ende.
- Claude Code: Befehlsliste unter `/specwright:` zeigt 23 Einträge, die vier v4-Befehle zuerst in der Dokumentation.
- Web-UI: keine Änderung.
- Mock: kein Mock nötig, weil keine Oberfläche entsteht oder sich ändert; die Terminal-Ausgaben werden im Plan als Beispieltext festgelegt.

## 7. Bedenken aus den Projekt-Docs

| Quelle | Bedenken | Betrifft | Geklärt? (wer, wann, wie) |
|---|---|---|---|
| Projekt-Docs fehlen | Specwright hat keine `docs/product-brief.md`, `architecture.md`, `security.md`, `design.md`; die Spec konnte nur gegen `CLAUDE.md`, `README.md` und den Gesamtplan geprüft werden. | alle FA | geklärt — die vier Docs entstehen in diesem Vorhaben (AK-07, FA-12); der Plan liest sie, sobald sie stehen, und trägt Bedenken nach. Nicht blockierend. |
| `CLAUDE.md` „Production Safety Rules“: „Never break backward compatibility without migration path“, „Never remove templates without deprecation notice“ | Der harte Schnitt widerspricht beiden Regeln wörtlich. | FA-03, FA-07 | geklärt — Michael 13.09. (Gesamtplan D: nur Michael nutzt Specwright, v4-Bruch erlaubt). Migrationspfad ist Ablauf B. Die beiden Regeln werden mit der neuen einseitigen `CLAUDE.md` (FA-13) durch „Bruch nur mit Update-Weg und Versionssprung“ ersetzt. |
| `CLAUDE.md` „Installer-Checkliste“ (Memory) | Drift ist bekannt und zweimal aufgetreten; eine Liste allein hilft nicht, wenn niemand sie prüft. | FA-04 bis FA-06 | geklärt — Prüfung ist Pflichtteil von Verify und CI (FA-06); CI existiert bisher nicht im Repo → entsteht (FA-16). |
| Öffentliches Repo (README: „github.com/michsindlinger/specwright“) | Die neuen Projekt-Docs (`architecture.md`, `security.md`) beschreiben auch den Cloud-Droplet; Hostnamen, Pfade, Nutzer, Ports dürften nicht hinein. | FA-12 | offen — an den Plan delegiert, nicht blockierend. Vorschlag: Droplet-Betrieb nur abstrakt („ein Linux-Host, systemd, Auto-Deploy“), Konkretes bleibt im Memory/Vault. |
| Installer-Verhalten heute: `setup-claude-code.sh` überschreibt bedingungslos, ohne Prüfung und ohne Sicherung; `update-specwright.sh` legt Sicherungen neben die Datei | Widerspricht FA-08 und FA-20. | FA-08, FA-20 | offen — an den Plan delegiert, nicht blockierend. Vorschlag: eine gemeinsame Lade-Routine für alle Installer (Skip / Überschreiben / Sichern an einem Ort), sonst bleibt die Drift im Verhalten, auch wenn die Liste stimmt. |
| `mcp-profile.ts` in der UI liest MCP-Profile | Wenn das Profil der Marktvalidierung verschwindet, darf die UI nicht darauf verweisen. | FA-03, FA-11 | offen — an den Plan delegiert (Schritt 0 Referenzsuche in `ui/src`), nicht blockierend. Bei Treffer: Profil bleibt (B-03-Regel). |
| Unreferenzierte Agenten außerhalb B-03 (`mock-generator`, `project-structure-manager`, `test-runner`, `ux-designer`, `design-extractor`) | Werden von keinem bleibenden Workflow genannt, hängen aber auch nicht an einem entfernten Befehl. | FA-03 | geklärt — bleiben (B-03 wörtlich); eigene Aufräum-Karte im Board, nicht dieses Vorhaben (Abschnitt 8). |

## 8. Nicht im Umfang

- NZ-01: Ausführungsmodell der Web-UI (`execute-tasks`, Kanban-MCP, `kanban.json`, Auto-Mode) — unverändert bis Phase 5.
- NZ-02: Umbau der 19 bleibenden Alt-Befehle auf v4-Semantik.
- NZ-03: Änderungen an `ui/`.
- NZ-04: Neue Funktionen in `/intent` `/spec` `/plan` `/build`.
- NZ-05: Rollout in andere Projekte (nur Nachweis des Update-Wegs an Applai auf einem Branch).
- Zusätzlich: Aufräumen unreferenzierter Agenten, Skills-Vorlagen und Vorlagen-Ordner, die nicht ausschließlich an entfernten Befehlen hängen (Board-Karte).
- Zusätzlich: Das Installer-Manifest ersetzt nicht die Installer selbst; die fünf Skripte bleiben (nur ihre Listen werden zentral).
- Zusätzlich: Kein Löschen des Kanban-MCP-Servers oder seiner Memory-Werkzeuge.

## 9. Annahmen

- **AN-S01:** „Lokal verändert" heißt: die Datei weicht von der Repo-Fassung ab, gegen die das Update vergleicht (heutige Logik). Eine Datei, die einer älteren Repo-Fassung entspricht, gilt als unverändert. — bestätigt am 2026-09-14 von Product Owner
- **AN-S02:** Die 6 KEEP-Befehle ohne Pilot-Nutzung (`document-feature`, `update-changelog`, `extract-design`, `check-update`, `add-learning`, `add-skill`) bleiben in B-01 (OF-02 der Absicht). — bestätigt am 2026-09-14 von Product Owner (OF-02 damit entschieden: bleiben)
- **AN-S03:** Vorlagen-Ordner, die kein bleibender Workflow und kein entfernter Befehl nennt (heute: `concept`, `research`, `agents` ohne Treffer), bleiben — sie gehören zur Aufräum-Karte, nicht zu B-03. — bestätigt am 2026-09-14 von Product Owner
- **AN-S04:** Der Nachweis für Ablauf B läuft im Applai-Checkout auf einem Branch von `main`, danach wird der Branch verworfen oder als PR angeboten; kein Lauf auf Applai-`main`. — bestätigt am 2026-09-14 von Product Owner
- **AN-S05:** „Bewusst behalten" (FA-21) wird als Markierung im Projekt abgelegt, nicht in Specwright; Form entscheidet der Plan (ER-01). — bestätigt am 2026-09-14 von Product Owner

## 10. Freigabe

- [x] Jede FA hat Herkunft und Prüfung.
- [x] Jedes AK der intent.md ist von mindestens einer FA abgedeckt: AK-01 → FA-01 · AK-02 → FA-02, FA-03 · AK-03 → FA-04, FA-05, FA-06 · AK-04 → FA-07, FA-09, FA-10 · AK-05 → FA-08 · AK-06 → FA-11 · AK-07 → FA-12 · AK-08 → FA-13 · AK-09 → FA-14, FA-15 · AK-10 → FA-16 · AK-11 → FA-17, FA-18 · AK-12 → FA-19.
- [x] Abschnitt 7 vollständig geklärt oder begründet offen.
- [x] Keine Technik, keine Architektur, keine Dateinamen in diesem Dokument (Ausnahme: Herkunftsangaben in Abschnitt 7 und die Repo-Wahrheiten `intent/`, `docs/`, `CLAUDE.md`, `README.md`, `VERSION`, die Gegenstand des Vorhabens sind).
- [x] Bei risikoklasse hoch: Tech Lead hat gelesen. (nicht zutreffend, mittel)
- **Freigegeben:** Product Owner (Michael Sindlinger), 2026-09-14, Commit siehe `git log -- spec.md`
