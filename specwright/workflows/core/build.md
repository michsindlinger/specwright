---
description: Freigegebenen Plan in einer Sitzung umsetzen — Verify, Nachweise, DoD, PR
globs:
alwaysApply: false
version: 1.1
encoding: UTF-8
---

# Build Workflow

## Overview

Vierter Schritt des AI-native SDLC (Specwright v4). Setzt `plan.md` in **einer Sitzung** um. Kein Story-Schnitt, keine frischen Sitzungen je Aufgabe: Der Kontext des Plans bleibt bis zum PR erhalten. „Eine Sitzung" ist ein Arbeitszusammenhang, kein Chatfenster ohne Ende: Läuft der Kontext auf ~200k, wird der Stand in `plan.md` §14 und `build-stand.md` gesichert und in einer neuen Sitzung mit `/build` fortgesetzt (Step 1, Step 3). Board und Fahrplan gehören nicht in diese Sitzung (Step 6). Bei Zerlegung (Plan §7 Variante B) laufen Teile in Worktrees, die Integration läuft **hier**.

**Grundsätze:**
- Reihenfolge §6 ist verbindlich; jeder Schritt endet mit dem dort genannten prüfbaren Zustand.
- Abweichung vom Plan → sofort §14, nicht am Ende aus dem Gedächtnis.
- Schlägt ein Test fehl: Code reparieren, nicht den Test, nicht die Bezugsliste (Hook `protect-tests`).
- Fertig heißt: Definition of Done §13 komplett, nicht „Code geschrieben".
- Kosten = Runden × Kontext. Jede Runde zahlt den ganzen bisherigen Kontext. Deshalb: Kontextdeckel (Step 3) und keine Board-, Fahrplan- oder Vault-Pflege am Ende der Bausitzung (Step 6). Gemessen 15.09.2026: 30–35 % der Tokens eines Builds gingen in Board-Runden auf vollem Kontext.

<pre_flight_check>
  EXECUTE: specwright/workflows/meta/pre-flight.md
</pre_flight_check>

<process_flow>

<step number="1" name="eingang_und_branch">

### Step 1: Eingang und Branch

REQUIRE `INT-JJJJ-NNN`; `plan.md` mit `Status: freigegeben` → sonst STOP „Erst /plan abschließen."
READ `plan.md` vollständig, `CLAUDE.md` (Verify-Befehl, Konventionen, Hooks, „Nie").
GIT: von der aktuellen Basis `git checkout -b feat/INT-JJJJ-NNN-kurzname` (oder Worktree laut Projektkonvention).
IF Plan §8 nennt einen Bugfix-Anteil: `touch .claude/fix-mode` — Testdateien sind ab jetzt gesperrt; fehlschlagender Test kommt VOR dem Marker.
SET `plan.md` `Status: in_umsetzung`.

IF `plan.md` steht bereits auf `Status: in_umsetzung` (Wiederaufnahme nach Kontextdeckel oder Abbruch):
  - READ `intent/INT-JJJJ-NNN-*/build-stand.md` und `plan.md` §14; `git checkout feat/INT-JJJJ-NNN-kurzname` (kein zweiter Branch)
  - weiter beim ersten offenen Schritt in §6; `build-stand.md` bleibt bis zum PR liegen und wird bei jedem Stopp fortgeschrieben

</step>

<step number="2" name="zerlegung_ausfuehren">

### Step 2: Zerlegung anwenden

IF §7 Variante A: weiter mit Step 3 in dieser Sitzung.
IF §7 Variante B:
  - je Teil `git worktree add ../<projekt>-worktrees/INT-JJJJ-NNN-t<n> -b feat/INT-JJJJ-NNN-t<n>`
  - Teile getrennt umsetzen (eigene Sitzungen erlaubt), jeder Teil liefert nur seine Dateien und die Schnittstelle aus §7
  - **Integration in dieser Sitzung:** Teile mergen, Verbindungen §5 nachweisen, Verify, E2E — nie in einem Teil-Worktree

</step>

<step number="3" name="umsetzen">

### Step 3: Umsetzen in Plan-Reihenfolge

FOR EACH Schritt in §6:
  - Schritt 0 (lesende Vorprüfung) zuerst; Treffer → §14 und ggf. Plananpassung vor dem ersten Edit
  - umsetzen, prüfbaren Zustand herstellen (Test grün, grep-Treffer, Ausgabe)
  - Imports automatisiert einfügen: bei mehrzeiligen Import-Blöcken ans Blockende, nie in den Block (Pilot-Lehre)
  - Abweichung → §14 mit Datum, Grund, betroffenem Abschnitt
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
2x-REGEL: Ist in dieser Umsetzung ein Fehler passiert, der schon einmal vorkam (Memory, `CLAUDE.md` „Fehler zweimal", PR-Historie)? → Vorschlag für eine `CLAUDE.md`-Zeile im PR-Text; prüfen, ob es ein Hook sein müsste.
MEMORY: projektübergreifende Lehre → Claude-Code-Auto-Memory (nicht `CLAUDE.md`).
REMOVE `.claude/fix-mode`, falls gesetzt.

</step>

<step number="6" name="pr_und_status">

### Step 6: PR und Status

COMMIT(s) mit Conventional Commits, Bezug `INT-JJJJ-NNN`.
PR über Agent `git-workflow`: Titel mit Intent-ID; Body: Kurzfassung aus `plan.md` §1, Verify-Ausgabe, Nachweise §5, E2E-Protokoll/Screenshots, §14 Abweichungen, offene manuelle Schritte §10, `CLAUDE.md`-Vorschlag aus der 2x-Regel.
SET `plan.md` `Status: umgesetzt` (Merge steht aus), `intent.md` bleibt `angenommen` bis Merge; nach Merge `umgesetzt`.
REMOVE `build-stand.md`, falls vorhanden (der PR ist jetzt der Stand).
BOARD und FAHRPLAN: **nicht in dieser Sitzung.** Der Abschlussbericht endet mit dem Block „Für das Board": Projekt, Karte (Titel oder „neu"), Zielspalte, Beleg (PR-Link), Stand-Zeile, Verweis auf `intent/INT-JJJJ-NNN-*/`, bei Kreis Lippe die Fahrplan-Station. Das Nachziehen läuft danach in einer eigenen kurzen Sitzung nach `/clear` (Skill `obsidian-po-board`; bei Kreis Lippe danach `fahrplan-sync`) mit diesem Block als Input.

NEXT: Review und Merge durch den Menschen; manuelle Schritte §10 mit Freigaben; danach Betrieb (Befunde werden neue `intent.md`).

</step>

</process_flow>
