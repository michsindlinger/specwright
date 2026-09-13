---
description: Freigegebenen Plan in einer Sitzung umsetzen — Verify, Nachweise, DoD, PR
globs:
alwaysApply: false
version: 1.0
encoding: UTF-8
---

# Build Workflow

## Overview

Vierter Schritt des AI-native SDLC (Specwright v4). Setzt `plan.md` in **einer Sitzung** um. Kein Story-Schnitt, keine frischen Sitzungen je Aufgabe: Der Kontext des Plans bleibt bis zum PR erhalten. Bei Zerlegung (Plan §7 Variante B) laufen Teile in Worktrees, die Integration läuft **hier**.

**Grundsätze:**
- Reihenfolge §6 ist verbindlich; jeder Schritt endet mit dem dort genannten prüfbaren Zustand.
- Abweichung vom Plan → sofort §14, nicht am Ende aus dem Gedächtnis.
- Schlägt ein Test fehl: Code reparieren, nicht den Test, nicht die Bezugsliste (Hook `protect-tests`).
- Fertig heißt: Definition of Done §13 komplett, nicht „Code geschrieben".

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
  - Abweichung → §14 mit Datum, Grund, betroffenem Abschnitt
RULE: Nichts anfassen, was in §4 „Nicht betroffen" steht. Neue Dateien nur in den Ablageorten laut `CLAUDE.md`.
RULE: `security.md` §5 Verbotsliste gilt; Produktionsdaten nur nach §10-Freigabe.

</step>

<step number="4" name="nachweise">

### Step 4: Verify und Nachweise

RUN Verify-Befehl aus `CLAUDE.md` → muss grün sein; Ausgabe für den PR sichern.
RUN jeden Nachweis-Befehl aus §5; Ergebnisse sichern.
RUN E2E-Pfad aus §8; bei UI Screenshot neben Mock; bei manuellem Pfad Protokoll mit Schritten und Ergebnis.
IF etwas rot: zurück zu Step 3. Kein Überspringen, keine Änderung an Tests/Baselines, keine Schwellen.

</step>

<step number="5" name="dod_und_lehren">

### Step 5: Definition of Done und 2x-Regel

CHECK §13 Punkt für Punkt; offene Punkte bleiben sichtbar offen (kein Abhaken ohne Nachweis).
IF `architecture.md`-Änderung laut §3: in dieser PR enthalten; ADR angelegt, `check:adr` grün.
2x-REGEL: Ist in dieser Umsetzung ein Fehler passiert, der schon einmal vorkam (Memory, `CLAUDE.md` „Fehler zweimal", PR-Historie)? → Vorschlag für eine `CLAUDE.md`-Zeile im PR-Text; prüfen, ob es ein Hook sein müsste.
MEMORY: projektübergreifende Lehre → Claude-Code-Auto-Memory (nicht `CLAUDE.md`).
REMOVE `.claude/fix-mode`, falls gesetzt.

</step>

<step number="6" name="pr_und_board">

### Step 6: PR, Board, Status

COMMIT(s) mit Conventional Commits, Bezug `INT-JJJJ-NNN`.
PR über Agent `git-workflow`: Titel mit Intent-ID; Body: Kurzfassung aus `plan.md` §1, Verify-Ausgabe, Nachweise §5, E2E-Protokoll/Screenshots, §14 Abweichungen, offene manuelle Schritte §10, `CLAUDE.md`-Vorschlag aus der 2x-Regel.
SET `plan.md` `Status: umgesetzt` (Merge steht aus), `intent.md` bleibt `angenommen` bis Merge; nach Merge `umgesetzt`.
BOARD: Karte mit Stand, PR-Link, Verweis auf `intent/INT-JJJJ-NNN-*/` (Skill `obsidian-po-board`; bei Kreis Lippe danach `fahrplan-sync`).

NEXT: Review und Merge durch den Menschen; manuelle Schritte §10 mit Freigaben; danach Betrieb (Befunde werden neue `intent.md`).

</step>

</process_flow>
