---
description: Fachliche Spec aus intent.md — Abläufe, Anforderungen, Bedenken aus den Projekt-Docs
globs:
alwaysApply: false
version: 1.0
encoding: UTF-8
---

# Spec Workflow

## Overview

Zweiter Schritt des AI-native SDLC (Specwright v4). Übersetzt eine angenommene `intent.md` in eine fachliche `spec.md`: Was genau soll passieren, in welchen Abläufen, mit welchen Randfällen. Die vier Projekt-Docs werden gelesen und dürfen **Bedenken markieren**, nichts entscheiden. Keine Technik, keine Dateien, keine Architektur.

**Grundsätze (aus dem Pilot INT-2026-001):**
- Jede fachliche Anforderung (FA) hat eine Herkunft (AK, Z, NZ) und eine Prüfart. Jedes AK ist von mindestens einer FA abgedeckt — die Zuordnung steht in der Freigabe-Checkliste.
- Betriebsabläufe (z. B. Datenkorrektur) sind Abläufe wie Nutzerabläufe: Schritte, Freigaben, Nachmessung.
- Bedenken, die die Spec nicht klären kann, werden „an den Plan delegiert, nicht blockierend" — mit Vorschlag.
- Annahmen nach ER-00 sammeln, bei der Freigabe gesammelt bestätigen lassen.

<pre_flight_check>
  EXECUTE: specwright/workflows/meta/pre-flight.md
</pre_flight_check>

<process_flow>

<step number="1" name="eingang">

### Step 1: Eingang prüfen

REQUIRE Argument `INT-JJJJ-NNN`; ordner `intent/INT-JJJJ-NNN-*/` muss existieren.
READ `intent.md`:
  - `status` muss `angenommen` sein → sonst STOP „Erst /intent abschließen."
  - `bypass: ja` → STOP „Bypass gesetzt (Grund: …). Direkt `/plan INT-…`."
LOAD Vorlage `specwright/templates/sdlc/vorhaben/spec-template.md` (hybrid).
LOAD Projekt-Docs: `docs/product-brief.md`, `docs/architecture.md`, `docs/security.md`, `docs/design.md`; Commit-Stand notieren (Kopf der Spec).

</step>

<step number="2" name="ergaenzende_recherche">

### Step 2: Ergänzende Recherche (lesend, nur fachlich relevant)

SEARCH nur, was die Abläufe braucht: weitere Entstehungswege, weitere Leser eines Felds, bestehende Verhaltensweisen, die „wie heute" bleiben sollen.
RECORD Funde als Herkunft in Tabellen oder als Bedenken (Step 4). Keine Lösungsentscheidung.

</step>

<step number="3" name="schreiben">

### Step 3: spec.md schreiben

WRITE `intent/INT-JJJJ-NNN-*/spec.md` nach Vorlage:
  1. Zusammenfassung mit Z-/AK-Verweisen
  2. Abläufe je Nutzergruppe und je Betriebsvorgang, jeder mit AK-Verweis
  3. Fachliche Anforderungen FA-nn (Modalverben groß, Herkunft, Prüfung)
  4. Fehler- und Randfälle mit Herkunft
  5. Daten fachlich: Information, Entsteht/ändert/verschwindet, wer sieht sie, Datenklasse laut `security.md`
  6. Was der Nutzer sieht; Mock-Entscheidung nach `design.md` §6
  7. Bedenken aus den Projekt-Docs (Step 4)
  8. Nicht im Umfang (NZ + Zusätzliches)
  9. Annahmen AN-Snn (ER-00)
  10. Freigabe-Checkliste mit AK→FA-Zuordnung

RULE: Pfade nur als Herkunftsangabe in Abschnitt 7, nirgends sonst.

</step>

<step number="4" name="bedenken">

### Step 4: Bedenken aus den Projekt-Docs — Pflicht

FOR EACH Doc: Abschnitte durchgehen, die das Vorhaben berührt:
  - `architecture.md`: Datenbesitz (§3), Regeln AR-nn (§4), bekannte Abweichungen (§10 — nicht vergrößern), externe Systeme (§5)
  - `security.md`: Datenklassen (§1), Zugriffsmodell (§2), Geheimnisse (§3), Verbotsliste (§5), Pflichtprüfungen (§6)
  - `design.md`: Prinzipien (§1), Muster (§4), Mock-Pflicht (§6)
  - `product-brief.md`: Nicht-Ziele (§7), Domänenbegriffe (§8), Mandanten (§9)

RECORD als Tabellenzeile: Quelle, Bedenken, betroffene FA, „Geklärt? (wer, wann, wie)".
  - geklärt durch Entscheidung der Person → eintragen
  - nicht klärbar ohne Technik → „offen — an den Plan delegiert, nicht blockierend" + Vorschlag
IF nichts reibt: „Keine — geprüft gegen Stand <sha>."

</step>

<step number="5" name="vorlegen_und_freigabe">

### Step 5: Vorlegen und Freigabe

PRESENT: Aufbau in einem Absatz, die Bedenken, die offen bleiben, die Annahmen zum Bestätigen, ein bis zwei Randfälle, die die Person prüfen sollte.
WAIT for Freigabe.
ON Freigabe:
  - Kopf: `Status: freigegeben`, Freigabe Rolle + Datum
  - Annahmen: „bestätigt am … von …"
  - Checkliste abhaken, `Freigegeben:` setzen
  - `intent.md`: `bezuege.spec: "spec.md"`
  - COMMIT: `spec(INT-JJJJ-NNN): fachliche Spec freigegeben`

NEXT: `/plan INT-JJJJ-NNN`

</step>

</process_flow>
