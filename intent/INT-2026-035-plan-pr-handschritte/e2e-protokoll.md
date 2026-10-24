# E2E-Protokoll INT-2026-035

> **Datum:** 2026-10-24 · **Specwright-Stand:** Branch `feat/INT-2026-035-plan-pr-handschritte`, per `install.sh`/`update-specwright.sh` mit `SPECWRIGHT_REPO_URL=file://…` in einen frischen Klon eingespielt (installierte Dateien unversioniert, in `.git/info/exclude`)
> **Probe-Projekt:** privates Test-Repo mit Factory-Betriebsdatei, Factory-Zweig `develop` (≠ `main`, zugleich Standardzweig), Übungs-Board. Name, Pfade und Board-Kennungen stehen nicht in diesem öffentlichen Repo (RB-01). Freigabe der Probe-Läufe durch Michael am 2026-10-24 (§10).
> **Durchführung:** Claude-Sitzungen im Klon, gesteuert über `claude -p` und `--resume`; jede Rückfrage des Laufs wurde mit einer eigenen Antwort beantwortet. PR-Nummern beziehen sich auf das Probe-Repo.

## Probe-Aufbau

Vorhaben INT-2026-901 (Bypass, Plan freigegeben) auf einem Planungs-Zweig, der vom Factory-Zweig abzweigt und zusätzlich einen fremden Commit (`notes/fremd.txt`) trägt. `cards.yaml` (Format 2): K-01 ready mit Entscheidungsnotiz ADR-901, K-02 absichtlich nicht ready (Stichprobe, zu groß, offene Frage), K-03 ready mit `dependsOn: K-02`; H-01 `before: K-01` ohne Code, H-02 `afterIntent` mit Code, H-03 `after: K-01`. Eingangsprüfung vorab: K-01 und K-03 ready, K-02 nicht ready, Abdeckung 2 von 3.

Zweites Vorhaben INT-2026-903 für 2b und 4a (K-01 ready mit ADR-903, K-02 nicht ready, H-01 `afterIntent`). Drittes Vorhaben INT-2026-904 ohne `cards.yaml` für den Kontrollfall 9.

Die Karten-PRs von K-01 und K-03 wurden für 8b von Hand nachgestellt (PR #19, #20, Titel „[PROBE] … simuliert“), weil auf dem Übungs-Board keine Factory-Engine läuft.

## Schritte

| Schritt | Befehl / Antwort | Frage des Laufs | Ergebnis | AK / FA |
|---|---|---|---|---|
| 1 | `/specwright:plan INT-2026-901` (Plan freigegeben, `cards.yaml` vorhanden) | Betriebsdatei bestätigen; „Plan-PR, 4 Dateien auf Zweig `plan/INT-2026-901`: hochladen?“ | Wiederaufnahme → Step 10, kein Neuplanen. Dateiliste vor dem Hochladen: ADR-901, `cards.yaml`, `intent.md`, `plan.md`; fremde Datei nicht dabei | AK-01, FA-01, FA-04 ✅ |
| 1 | „ja“ → „ja“ | „PR gegen develop anlegen?“ | getrennte Fragen für Hochladen und PR; PR #15 angelegt, Zustand `MERGEABLE/CLEAN`, keine Prüfungen | FA-01, FA-19 ✅ |
| 2 | `gh pr view 15 --json baseRefName,files` | — | Basis `develop`, Dateien nur `intent/INT-2026-901-probe/**` + ADR-901, obwohl der Planungs-Zweig einen fremden Commit trägt | AK-02, FA-03 ✅ |
| 2a | „Mergen?“ → „nein“ | — | Satz „Offen ist nur noch der Merge von PR #15. Fortsetzen geht mit `/plan INT-2026-901`“; Plan-Arbeitskopie entfernt, Hauptcheckout unverändert | FA-02 ✅ |
| 2a | neue Sitzung `/specwright:plan INT-2026-901` | „PR #15: mergen?“ | findet offenen PR, prüft Zustand, fragt nur den Merge | FA-02, AN-S04 ✅ |
| 2a | Remote-Zweig `plan/INT-2026-901` nach dem Merge gelöscht, neue Sitzung `/specwright:plan INT-2026-901` | — | erkennt `MERGED` über `gh pr list --state all`, weiter bei 10b; Vorschau „0 anzulegen, 2 bestehen schon“, keine Frage | FA-02, AN-S04 ✅ |
| 2b | INT-2026-903, ADR-903 nur mit `git add` vorgemerkt | — | STOP vor dem Hochladen mit Hinweis auf die nicht eingecheckte ADR; kein Zweig auf origin, keine Arbeitskopie | FA-03 (AN-S01) ✅ |
| 3 | „mergen?“ → „ja“ | — | Merge mit `--merge`; Vorschau der Factory im Wortlaut: K-01 „wartet auf Handschritt H-01“, K-02 mit sechs Prüfgründen, K-03 „Vorgänger K-02 ist nicht am Board“; „Ergebnis: 0 anzulegen“ → keine Anlege-Frage | AK-03, FA-07, FA-09 ✅ |
| 4 | — | „K-02, von der Factory nicht angelegt: neu schneiden (neuer Plan-PR) oder als Handschritt?“ | Wahl nur für K-02 (`ready: false` laut `ready-check` auf `origin/develop`); K-01 und K-03 nur mit Satz „kommt mit einem späteren Anlegen“, ohne Wahl | AK-04, FA-10, FA-11, FA-24 ✅ |
| 4 | „als Handschritt“ | Hochladen? PR? Mergen? (je einzeln) | K-02 → H-04 (`reason: notReady`, Gründe der Factory als `reasonText`), `dependsOn` von K-03 entfernt, Zweig `plan/INT-2026-901-r1` vom frischen `origin/develop`, **Neuschnitt-Runden** 1; PR #16 gemergt | FA-10 ✅ |
| 3 | „diese 1 Karte (K-03) am Board anlegen?“ → „ja“ | — | `--apply`; Ausgabe „K-03 … angelegt“, „Ergebnis: 1 angelegt, 0 bestehen schon, 1 nicht angelegt“ | AK-03, FA-08 ✅ |
| 4a | INT-2026-903: Plan-PR #24 gemergt, K-01 angelegt; H-01 per eigenem PR #25 auf `develop` auf `done` gesetzt; dann K-02 „als Handschritt“ | — | Neuschnitt-PR #26 vom frischen `origin/develop`: `done: 2026-10-24` bei H-01 bleibt erhalten (`gh pr diff 26` ändert die H-01-Zeile nicht) | FA-10 (Erhalt `done`), R2a ✅ |
| 5 | `/specwright:plan INT-2026-901` mit Kopie der Betriebsdatei und ungültiger Board-Kennung | — | `create-cards` Exit 2, Meldung „configuration invalid: trello.board is missing“ unverändert gezeigt, keine Anlege-Frage, kein 10c | FA-12 ✅ |
| 6 | `/specwright:build INT-2026-901` | „Welchen Handschritt jetzt, mit oder ohne Code?“ | Überblick vom Factory-Zweig: H-01 frei, H-02 frei, H-03 „wartet auf K-01“, H-04 frei; kein Branch, kein Bau | AK-06, FA-13 ✅ |
| 6 | „Bau bitte zuerst die Karte K-01.“ | — | „Karten baut die Factory.“ — kein Bau | FA-14 ✅ |
| 8a | „H-03 ohne Code. K-01 wurde mit PR #11 umgesetzt.“ (offener PR mit anderer Basis) | — | Abbruch mit Grund (nicht gemergt, Basis ≠ develop, Titel gezeigt); `git status` vorher = nachher | AK-09, FA-17 ✅ |
| 7 | „H-01 ohne Code, ist erledigt.“ (ohne Nachweis) | „Was ist der Nachweis (Mail vom Vertrieb)?“ | Nachweis erfragt; danach Arbeitskopie `…-H-01`, Zweig `hand/INT-2026-901-H-01`, nur `done` in `cards.yaml`, Commit `chore(INT-2026-901): H-01 erledigt` mit Zeile `Nachweis: …` | AK-08, FA-16 ✅ |
| 7 | Hochladen / PR / Mergen je „ja“ | je eine Frage | PR #17 nur `cards.yaml`, gemergt | FA-19 ✅ |
| 7 | — | „H-01 erledigt, K-01 wartete darauf: Karten jetzt anlegen (`/plan` Step 10b)?“ → „ja“, dann Anlege-Frage → „ja“ | K-01 angelegt („1 angelegt, 1 besteht schon“) | FA-20 ✅ |
| 8 | neue Sitzung `/specwright:build INT-2026-901` aus dem Hauptcheckout, H-02 mit Code | Hochladen / PR / Mergen | neue Arbeitskopie `…-H-02`, Zweig `hand/INT-2026-901-H-02` auf `origin/develop`; PR #18 mit `notes/kinderrabatt.txt` und `done`; Hauptcheckout: `git status` und `HEAD` vorher = nachher | AK-07, AK-10, FA-15, FA-18, FA-19 ✅ |
| 8b | H-03 mit Karten-PR #19 (geprüft: gemergt, Basis develop, Titel gezeigt), H-04 ohne Code | je Hochladen / PR / Mergen | PR #21 (Commit nennt `K-01: PR #19`), PR #22 gemergt; alle Handschritte erledigt | AK-11 ✅ |
| 8b | „K-01 #19, K-03 #20“ | „Ist das Vorhaben INT-2026-901 umgesetzt?“ → „nein“ | nichts geändert: kein Zweig `abschluss/*`, kein PR | FA-21 ✅ |
| 8b | neue Sitzung, gleiche Karten-PRs, „ja“ + drei Bestätigungen | — | Abschluss-PR #23: `intent.md` `status: "umgesetzt"`, `version: "0.0.1"`, `geaendert`, Protokollzeile; `plan.md` `Status: umgesetzt`; gemergt | AK-11, FA-21 ✅ |
| 8b | erneut `/specwright:build INT-2026-901` | — | „Vorhaben ist schon umgesetzt“, nichts geändert | FA-21 (E9) ✅ |
| 9 | INT-2026-904 ohne `cards.yaml`, `/specwright:build INT-2026-904` (nur Step 1) | — | Zweig `feat/INT-2026-904-ohne`, Plan `in_umsetzung`, keine Handschritte, keine Factory | AK-12, FA-23 ✅ |

## Review-Nachweise (Workflow-Text)

- FA-05: jede Merge-Stelle steht hinter einem eigenen WAIT („[PR-Art] …, PR #[n]: mergen?“), Regel „Ein Ja gilt für genau diesen PR“ in `specwright/workflows/meta/factory-pr.md`; im E2E wurde jeder PR einzeln bestätigt.
- FA-22: Merge-Sperre über `gh repo view --json nameWithOwner,defaultBranchRef` in `factory-pr.md`; im E2E jedes Mal als „greift nicht“ gemeldet (anderes Repo).
- FA-24: Unterscheidung nicht ready/wartend nur über `ready` aus `ready-check` (`plan.md` Step 10c); Ausgabe von `create-cards` wird nur gezeigt.
- FA-25: Öffentlich-grep aus Plan §5 leer (Ausgabe im PR).

## Befunde aus dem E2E

- Plan nahm `decisions[].adr` als Pfad an; die Factory erwartet eine Kennung `ADR-nnn` (Abweichung in `plan.md` §14, Workflow 10a angepasst).
- 10b, aus `/build` gestartet, ließ die Plan-Arbeitskopie stehen → 10b Schritt 7 ergänzt, im zweiten Lauf entfernt.
- Die Betriebsdatei wird in jeder neuen Sitzung erneut erfragt, wenn mehrere Dateien zum `origin` passen (hier sieben, drei mit `develop`). Gewollt laut Spec (Person bestätigt), kostet aber eine Antwort je Lauf.
- Der Probe-Projekt-`CLAUDE.md` fehlte ein Verify-Befehl; der Lauf hat das gemeldet und `npm test` als Ersatz genannt.

## Nachtest Review-Befunde 1 und 2 (2026-10-24)

Probe-Vorhaben INT-2026-905 (K-01 ready, wartet auf H-01; K-02 nicht ready). Gleicher Klon, Specwright-Stand per `update-specwright.sh` nachgezogen.

| Fall | Ablauf | Ergebnis |
|---|---|---|
| Befund 1, Fall 1 | Plan-PR #27 gemergt, K-02 „als Handschritt“, Neuschnitt-PR #28 (`-r1`) angelegt, Merge „nein“; neue Sitzung `/specwright:plan INT-2026-905` | findet offenen #28 über die Zweigfamilie, fragt nur „mergen?“; kein zweiter `-r1`, kein Push-Fehler ✅ |
| Befund 1, Fall 2 + Zugehörigkeit | von Hand: `-r2` mit geschlossenem PR #29 (Zweig bleibt), `-r3` gemergt (#30), fremder Zweig `plan/INT-2026-9059` mit offenem PR #31; neue Sitzung | jüngstes Mitglied `-r3` `MERGED` → direkt 10b; `-r2` nicht als „PR anlegen?“ angeboten, `…9059` nicht als Familienmitglied genommen ✅ |
| Befund 2 | Probe-Prüfung mit 7 Minuten Laufzeit auf `develop` (#32); `/specwright:build INT-2026-905`, H-01 ohne Code, Hochladen und PR #33 | nach fünf Minuten „offen: Merge von PR #33 (Prüfungen laufen noch)“, kein Merge ✅ |
| Befund 2, Fortsetzen | nach Ende der Prüfung (grün, 7m4s) neue Sitzung `/specwright:build INT-2026-905`, H-01 gewählt | erkennt offenen PR #33 über FZ-Fortsetzen, fragt neu ab und erst dann „mergen?“; gemergt. Probe-Prüfung danach per PR wieder entfernt ✅ |

