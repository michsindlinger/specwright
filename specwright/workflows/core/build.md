---
description: Freigegebenen Plan in einer Sitzung umsetzen — Verify, Nachweise, DoD, PR
globs:
alwaysApply: false
version: 1.4
encoding: UTF-8
---

# Build Workflow

## Overview

Vierter Schritt des AI-native SDLC (Specwright v4). Setzt `plan.md` in **einer Sitzung** um. Kein Story-Schnitt, keine frischen Sitzungen je Aufgabe: Der Kontext des Plans bleibt bis zum PR erhalten. „Eine Sitzung" ist ein Arbeitszusammenhang, kein Chatfenster ohne Ende: Läuft der Kontext auf ~200k, wird der Stand in `plan.md` §14 und `build-stand.md` gesichert und in einer neuen Sitzung mit `/build` fortgesetzt (Step 1, Step 3). Board und Fahrplan gehören nicht in diese Sitzung (Step 6). Bei Zerlegung (Plan §7 Variante B) laufen Teile in Worktrees, die Integration läuft **hier**. Ist der Plan für eine Software Factory geschnitten (`cards.yaml` im Vorhaben-Ordner), baut `/build` nicht den Plan, sondern führt durch die Handschritte (Step 1b–1g, INT-2026-035).

**Grundsätze:**
- Reihenfolge §6 ist verbindlich; jeder Schritt endet mit dem dort genannten prüfbaren Zustand.
- Abweichung vom Plan → sofort §14, nicht am Ende aus dem Gedächtnis.
- Schlägt ein Test fehl: Code reparieren, nicht den Test, nicht die Bezugsliste (Hook `protect-tests`).
- Fertig heißt: Definition of Done §13 komplett, nicht „Code geschrieben".
- Karten baut die Factory. Bei geschnittenem Plan baut `/build` weder den Plan als Ganzes noch die Arbeit einer Karte; eine Bitte darum wird mit „Karten baut die Factory“ abgelehnt.
- Kosten = Runden × Kontext. Jede Runde zahlt den ganzen bisherigen Kontext. Deshalb: Kontextdeckel (Step 3) und keine Tracker-, Board-, Fahrplan- oder Vault-Pflege am Ende der Bausitzung (Step 6). Gemessen 15.09.2026: 30–35 % der Tokens eines Builds gingen in Board-Runden auf vollem Kontext.

<pre_flight_check>
  EXECUTE: specwright/workflows/meta/pre-flight.md
  EXECUTE: specwright/workflows/meta/leser-und-rueckfragen.md
</pre_flight_check>

<process_flow>

<step number="1" name="eingang_und_branch">

### Step 1: Eingang und Branch

REQUIRE `INT-JJJJ-NNN`; `plan.md` mit `Status: freigegeben` → sonst STOP „Erst /plan abschließen."
READ `plan.md` vollständig, `CLAUDE.md` (Verify-Befehl, Konventionen, Hooks, „Nie").
IF `intent/INT-JJJJ-NNN-*/cards.yaml` existiert und `plan.md` §7 „Karten für die Factory“ enthält nicht „Kein Schnitt“: geschnittener Plan → weiter mit Step 1b; GIT, Status `in_umsetzung` und Steps 2–6 entfallen. Sonst wie folgt.
GIT: von der aktuellen Basis `git checkout -b feat/INT-JJJJ-NNN-kurzname` (oder Worktree laut Projektkonvention).
IF Plan §8 nennt einen Bugfix-Anteil: `touch .claude/fix-mode` — Testdateien sind ab jetzt gesperrt; fehlschlagender Test kommt VOR dem Marker.
SET `plan.md` `Status: in_umsetzung`.

IF `plan.md` steht bereits auf `Status: in_umsetzung` (Wiederaufnahme nach Kontextdeckel oder Abbruch):
  - READ `intent/INT-JJJJ-NNN-*/build-stand.md` und `plan.md` §14; `git checkout feat/INT-JJJJ-NNN-kurzname` (kein zweiter Branch)
  - weiter beim ersten offenen Schritt in §6; `build-stand.md` bleibt bis zum PR liegen und wird bei jedem Stopp fortgeschrieben

</step>

<step number="1b" name="handschritte">

### Step 1b: Geschnittener Plan — Überblick der Handschritte

EXECUTE: specwright/workflows/meta/factory-pr.md — Bausteine FZ-Klären und FZ-Holen; Factory-Zweig `[b]`. Fortsetzungsbefehl in allen offen-Sätzen: `/build INT-JJJJ-NNN`.

1. `git cat-file -e origin/[b]:intent/INT-JJJJ-NNN-[kurzname]/cards.yaml` schlägt fehl → „Plan liegt noch nicht auf [b]; fortsetzen mit `/plan INT-JJJJ-NNN`.“ Ende.
2. Gültig ist nur der Stand auf dem Factory-Zweig: `git show origin/[b]:intent/INT-JJJJ-NNN-[kurzname]/cards.yaml` lesen (nie die lokale Datei).
3. Je Handschritt eine Zeile `H-nn · was · wer · Stand`:
   - `done` gesetzt → „erledigt am [done]“
   - `when: { before: K-nn }` oder `afterIntent` → „frei“
   - `when: { after: K-nn }` → „wartet auf K-nn“
4. Alle erledigt → weiter mit Step 1g. Sonst ist jeder offene Handschritt wählbar, auch ein wartender: seine Freigabe läuft über Schritt 7 (PR-Nummer der Karte). Die Wahl in Schritt 5 wird also immer angeboten, solange einer offen ist.
5. WAIT „Welchen Handschritt jetzt, und mit Code (Dateien ändern) oder ohne Code (nur als erledigt melden)?“
6. Gewählt ist unbekannt oder schon erledigt → Abbruch mit Grund, nichts ändern.
7. Gewählt wartet auf K-nn → WAIT „K-nn, Voraussetzung für H-nn: Welcher PR hat K-nn umgesetzt? (Nummer steht an der Karte am Board)“
   RUN `gh pr view [n] --json state,baseRefName,mergedAt,title,url`; Titel und Link zur Kontrolle zeigen. `state` ≠ `MERGED` oder `baseRefName` ≠ `[b]` → Abbruch mit Grund, nichts ändern. Sonst gilt der Handschritt als frei; die Nummer kommt in die Commit-Nachricht (`K-nn: PR #[n]`).
8. Bitte, eine Karte zu bauen → „Karten baut die Factory.“ Kein Bau.

### Step 1c: Arbeitskopie

Zweigfamilie `hand/INT-JJJJ-NNN-H-nn` auf `origin/[b]`.

1. FZ-Fortsetzen (`factory-pr.md`) für Präfix `hand/INT-JJJJ-NNN-H-nn`: erledigt → weiter mit Step 1f; offen → FZ-PR ab Schritt 4; hochgeladen → FZ-PR ab Schritt 2; verworfen oder neu → Zweig `[zweig]` = `hand/INT-JJJJ-NNN-H-nn` bei neu, sonst der nächste freie Zweig; weiter mit 2.
2. Läuft die Sitzung schon in einer eigenen Arbeitskopie (`git rev-parse --git-dir` ≠ `git rev-parse --git-common-dir`): `git status --porcelain` muss leer sein, sonst Abbruch mit Grund, nichts ändern. Dann `git switch -c [zweig] origin/[b]`; keine zweite Arbeitskopie.
3. Sonst FZ-Arbeitskopie (`factory-pr.md`) mit Name `INT-JJJJ-NNN-H-nn` und Zweig `[zweig]`. Der Hauptcheckout bleibt unberührt.

### Step 1d: Handschritt mit Code

1. Arbeit nach `what` umsetzen, in der Arbeitskopie. Verify-Befehl aus `CLAUDE.md` des Projekts → grün.
2. In `intent/INT-JJJJ-NNN-[kurzname]/cards.yaml` beim Handschritt `done: JJJJ-MM-TT` (Tagesdatum) setzen; sonst nichts an der Datei ändern.
3. COMMIT(s) `feat|chore(INT-JJJJ-NNN): H-nn [was]`, bei 1b Schritt 7 mit Zeile `K-nn: PR #[n]`.
4. FZ-PR (PR-Art „Handschritt H-nn“, Titel wie der Commit). Weiter mit Step 1f.

### Step 1e: Handschritt ohne Code

1. Nachweis (`proof`) nicht genannt → WAIT „H-nn, [was]: Was ist der Nachweis ([proof])?“
2. Nur `done: JJJJ-MM-TT` beim Handschritt setzen.
3. COMMIT `chore(INT-JJJJ-NNN): H-nn erledigt` mit Zeile `Nachweis: [Nachweis]` (bei 1b Schritt 7 dazu `K-nn: PR #[n]`).
4. FZ-PR (PR-Art „Handschritt H-nn“). Weiter mit Step 1f.

### Step 1f: Nach dem Merge

1. Nicht gemergt → Ende (offen-Satz aus FZ-PR).
2. Stand `when: { before: K-nn }` → WAIT „H-nn erledigt, K-nn wartete darauf: Karten jetzt anlegen (`/plan` Step 10b)?“ Ja → `plan` Step 10b ausführen (`specwright/workflows/core/plan.md`), Betriebsdatei und Factory-Zweig von hier.
3. Pfad der Arbeitskopie und Befehl `git worktree remove [pfad]` nennen; Aufräumen macht der Lauf nicht.
4. Weiter mit Step 1g.

### Step 1g: Abschluss

1. FZ-Holen. `origin/[b]:intent/INT-JJJJ-NNN-[kurzname]/intent.md` trägt schon `status: "umgesetzt"` → „Vorhaben ist schon umgesetzt.“ Ende.
2. Nicht alle Handschritte auf `origin/[b]` erledigt → Überblick aus 1b zeigen; Ende.
3. Je Karte aus `cards.yaml`: PR-Nummer erfragen und prüfen wie 1b Schritt 7. Einer nicht gemergt → Abbruch mit Grund.
4. WAIT „Alle Karten gemergt (#…), alle Handschritte erledigt. Ist das Vorhaben INT-JJJJ-NNN umgesetzt?“ Nein → nichts ändern, Ende.
5. Ja → FZ-Fortsetzen für Präfix `abschluss/INT-JJJJ-NNN` (gleiche Verzweigung wie 1c; ein Konflikt am Abschluss-PR führt so zu `abschluss/INT-JJJJ-NNN-r1`), dann Arbeitskopie wie 1c Schritte 2–3 mit Name `INT-JJJJ-NNN-abschluss` und dem zurückgegebenen Zweig. Darin: `intent.md`-Kopf `status: "umgesetzt"`, nächste PATCH-Version, `geaendert` = Tagesdatum, eine Zeile im Änderungsprotokoll nach Vorlage; `plan.md` `Status: umgesetzt`. COMMIT `chore(INT-JJJJ-NNN): Vorhaben umgesetzt` mit den Zeilen `K-nn: PR #[n]`.
6. FZ-PR (PR-Art „Abschluss-PR“).

</step>

<step number="2" name="zerlegung_ausfuehren">

### Step 2: Zerlegung anwenden

IF §7 Variante A: weiter mit Step 3 in dieser Sitzung.
IF §7 Variante B:
  - je Teil (Scheibe) `git worktree add ../<projekt>-worktrees/INT-JJJJ-NNN-t<n> -b feat/INT-JJJJ-NNN-t<n>`; Teile mit Start „nach Tn" (überlappende Dateien) erst, wenn Tn gemergt ist, und von diesem Stand aus
  - Teile getrennt umsetzen (eigene Sitzungen erlaubt), jeder Teil liefert seine Scheibe vorführbar und die Schnittstelle aus §7
  - **Integration in dieser Sitzung:** Teile mergen, Verbindungen §5 nachweisen, Verify, E2E — nie in einem Teil-Worktree

</step>

<step number="3" name="umsetzen">

### Step 3: Umsetzen in Plan-Reihenfolge

FOR EACH Schritt in §6:
  - Schritt 0 (lesende Vorprüfung) zuerst; Treffer → §14 und ggf. Plananpassung vor dem ersten Edit
  - umsetzen, prüfbaren Zustand herstellen (Test grün, grep-Treffer, Ausgabe)
  - Imports automatisiert einfügen: bei mehrzeiligen Import-Blöcken ans Blockende, nie in den Block (Pilot-Lehre)
  - Abweichung → §14 mit Datum, Grund, betroffenem Abschnitt
RULE Erste Scheibe zuerst: §6 Schritt 1 bis zum vorführbaren Zustand bringen, erst dann verbreitern (INT-2026-032).
RULE Tests an den Nahtstellen aus §8; Mocks nur an Systemgrenzen (externe Dienste, Zeit, Zufall); kein Erwartungswert, der so berechnet wird wie im Code. Passt eine Nahtstelle nicht → Abweichung §14, nicht stillschweigend tiefer testen.
RULE: Rückfragen und Abweichungen nach R2 (`specwright/workflows/meta/leser-und-rueckfragen.md`): „AK-nn / Schritt n, Gegenstand in einem Satz: Vorschlag. Ok?" — die Person antwortet aus dem Chat, ohne den Plan aufzuschlagen.
RULE: Nichts anfassen, was in §4 „Nicht betroffen" steht. Neue Dateien nur in den Ablageorten laut `CLAUDE.md`.
RULE: `security.md` §5 Verbotsliste gilt; Produktionsdaten nur nach §10-Freigabe.
RULE Kontextdeckel: Zeigt die Statuszeile mehr als ~200k Kontext oder kündigt Claude Code eine Komprimierung an → laufenden Schritt zum prüfbaren Zustand bringen, §14 nachziehen, `intent/INT-JJJJ-NNN-*/build-stand.md` schreiben (erledigte und offene Schritte aus §6, letzter prüfbarer Zustand, offene Nachweise, offene Abweichungen, Befehl zum Fortsetzen), WIP-Commit `wip(INT-JJJJ-NNN): Stand nach Schritt n`, dann STOP mit der Zeile „Fortsetzen in neuer Sitzung: `/build INT-JJJJ-NNN`". Nicht komprimieren lassen, nicht weiterarbeiten: Ein Build mit 640k Kontext hat am 15.09.2026 das Sitzungslimit gerissen.

</step>

<step number="4" name="nachweise">

### Step 4: Verify und Nachweise

RUN Verify-Befehl aus `CLAUDE.md` → muss grün sein; Ausgabe für den PR sichern.
RUN jeden Nachweis-Befehl aus §5; Ergebnisse sichern.
RUN E2E-Pfad aus §8; bei UI Screenshot neben Mock; bei manuellem Pfad Protokoll mit Schritten und Ergebnis.
IF etwas rot: zurück zu Step 3. Kein Überspringen, keine Änderung an Tests/Baselines, keine Schwellen.
RULE: CI ist die Wahrheit. Ein lokal grüner Lauf rechtfertigt nie, eine Bezugsliste bekannter roter Tests zu kürzen — erst der grüne PR-Check. Lokale und CI-Umgebung weichen ab (Pilot: lokal grün, CI rot wegen verschachteltem ESM-Paket).
AFTER PR: PR-Checks abwarten; rot → Ursache im CI-Log, nicht lokal nachstellen und für erledigt erklären.

</step>

<step number="5" name="dod_und_lehren">

### Step 5: Definition of Done und 2x-Regel

CHECK §13 Punkt für Punkt; offene Punkte bleiben sichtbar offen (kein Abhaken ohne Nachweis).
IF `architecture.md`-Änderung laut §3: in dieser PR enthalten; ADR angelegt, `check:adr` grün.
2x-REGEL: Ist in dieser Umsetzung ein Fehler passiert, der schon einmal vorkam (Memory, `CLAUDE.md` „Fehler zweimal", PR-Historie)? → Vorschlag im PR-Text, in dieser Reihenfolge (INT-2026-032):
  1. Mechanisch prüfbar → automatische Prüfung (Hook, Lint, Test, Guard in `verify`).
  2. Urteilsfrage → nummerierte Regel in `docs/architecture.md` (AR-nn mit Spalte „Prüfung" oder AP-nn), auf die ein Review verweisen kann.
  3. `CLAUDE.md`-Zeile nur, wenn der Punkt nicht aus dem Code ablesbar ist **und** für jede Aufgabe gilt; `CLAUDE.md` lädt in jede Sitzung.
MEMORY: projektübergreifende Lehre → Claude-Code-Auto-Memory (nicht `CLAUDE.md`).
REMOVE `.claude/fix-mode`, falls gesetzt.

</step>

<step number="6" name="pr_und_status">

### Step 6: PR und Status

COMMIT(s) mit Conventional Commits, Bezug `INT-JJJJ-NNN`.
PR über Agent `git-workflow`: Titel mit Intent-ID; Body: Kurzfassung aus `plan.md` §1, Verify-Ausgabe, Nachweise §5, E2E-Protokoll/Screenshots, §14 Abweichungen, offene manuelle Schritte §10, Vorschlag aus der 2x-Regel (Prüfung, Architekturregel oder `CLAUDE.md`).
SET `plan.md` `Status: umgesetzt` (Merge steht aus); `intent.md` bleibt `angenommen`. Der Abschluss nach dem Merge ist ein Klick auf „Abschließen" auf der Vorhaben-Seite der Web-UI (INT-2026-024) — die Sitzung schreibt ihn nicht. Ohne Web-UI: Kopf von Hand — `status: "umgesetzt"`, nächste PATCH-Version, `geaendert` = Tagesdatum, eine Zeile im Änderungsprotokoll nach Vorlage; kein Skript, kein Befehl (NZ-01).
REMOVE `build-stand.md`, falls vorhanden (der PR ist jetzt der Stand).
RULE: Abschlussbericht nach R3 (`specwright/workflows/meta/leser-und-rueckfragen.md`): plan §1 Kurzfassung, offene §10, §14 Abweichungen, Nachweise als Verweis auf PR und Dateien; Verify-Ausgabe und Nachweis-Befehle stehen im PR, nicht im Chat.
TRACKER, BOARD und FAHRPLAN: **nicht in dieser Sitzung.** Technischer Arbeitsstand gehört in den Tracker des Projekts (Zeile `Tracker:` in der Projekt-`CLAUDE.md`: GitHub Issues oder Trello); das Obsidian-Board trägt nur Internes. Bei geschnittenem Plan stehen die Karten schon im Tracker (angelegt in `plan` Step 10b über `create-cards`); der Block verweist darauf. Der Abschlussbericht endet mit dem Block „Für das Board" in dieser Reihenfolge: Projekt · Tracker-Eintrag (`repo#nr` oder Trello-Karte, oder „neu") · Zielstatus · Beleg (PR, Commit, `datei:zeile`) · Stand-Zeile · Verweis auf `intent/INT-JJJJ-NNN-*/` · nur wenn es Internes gibt: Board-Karte und Spalte · bei Kreis Lippe: Vorhaben-Karte und Fahrplan-Station. Das Nachziehen läuft danach in einer eigenen kurzen Sitzung nach `/clear` mit diesem Block als Input: Tracker zuerst; Skill `obsidian-po-board` nur für Internes und die grobe Vorhaben-Karte; bei Kreis Lippe danach `fahrplan-sync`.

NEXT: Review und Merge durch den Menschen; manuelle Schritte §10 mit Freigaben; danach Betrieb (Befunde werden neue `intent.md`).

</step>

</process_flow>
