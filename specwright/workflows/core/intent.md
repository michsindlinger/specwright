---
description: Vorhaben als intent.md festhalten — fachlich, belegt, freigegeben
globs:
alwaysApply: false
version: 1.1
encoding: UTF-8
---

# Intent Workflow

## Overview

Erster Schritt des AI-native SDLC (Specwright v4). Erzeugt `intent/INT-JJJJ-NNN-kurzname/intent.md` aus dem Gespräch mit der Person, die die Idee hat. Die Datei ist fachlich, nennt Belege aus dem Code und endet mit einer Freigabe, die als Commit dokumentiert ist.

**Grundsätze (aus dem Pilot INT-2026-001, 13.09.2026):**
- Symptome der Person und Ursachen im Code sind zwei verschiedene Dinge. Beide gehören in Abschnitt 1, die Ursache mit `[Q: Datei:Zeile]`.
- Eine Rückfrage kann den Zuschnitt drehen (Pilot: „Sortierung ändern" wurde zu „Filter springt um" plus „Datentyp vereinheitlichen"). Deshalb erst fragen, dann schreiben; Versionen 0.1 → 0.2 → 1.0 sind normal.
- Kein Mechanismus in Abnahmekriterien. „Das System MUSS …" beschreibt Verhalten, nicht Code.
- Größe und Risikoklasse können sich während des Gesprächs ändern. Vertragsschicht erst ab Risikoklasse mittel.

<pre_flight_check>
  EXECUTE: specwright/workflows/meta/pre-flight.md
</pre_flight_check>

<process_flow>

<step number="1" name="vorlage_und_kontext">

### Step 1: Vorlage und Projektkontext laden

LOAD (hybrid, Projekt vor global):
  - `specwright/templates/sdlc/vorhaben/intent-template.md` → sonst `~/.specwright/templates/sdlc/vorhaben/intent-template.md`
  - `docs/product-brief.md` (Nutzer, Nicht-Ziele des Produkts, Domänenbegriffe)
  - `CLAUDE.md` (Arbeitsweise, Bypass-Regel, Verify-Befehl)

DETERMINE next id:
  - Ordner `intent/` anlegen, falls fehlt
  - höchste vorhandene `INT-JJJJ-NNN` des laufenden Jahres + 1, sonst `INT-JJJJ-001`

IF Argument fehlt: ASK „Beschreibe das Vorhaben in zwei bis drei Sätzen: Was stört, wen, seit wann?"

</step>

<step number="2" name="gespraech">

### Step 2: Gespräch — höchstens fünf Rückfragen

ASK nur, was die Vorlage braucht und die Person nicht gesagt hat, in dieser Priorität:
  1. Anlass: Warum jetzt? Woran merkt man es? (Screenshot, Beispiel)
  2. Betroffene: Wer merkt die Änderung, wer nicht?
  3. Ziel als beobachtbarer Endzustand, nicht als Lösung
  4. Nicht-Ziele: naheliegende Erweiterungen ausschließen
  5. Risiko: Produktionsdaten, personenbezogene Daten, mehrere Mandanten, externe Systeme?

RULE: Vorschläge der Person hinterfragen, nicht reflexartig übernehmen (Projekt-CLAUDE.md). Wenn die Antwort den Zuschnitt ändert, das sagen und Version hochzählen.

</step>

<step number="3" name="ursache_im_code">

### Step 3: Ursache im Code belegen (lesend)

SEARCH gezielt (Grep/Read), keine Änderungen:
  - Wo entsteht das Symptom? (Sortierung, Filter, Schreibpfade, Anzeige)
  - Gibt es mehrere Schreiber desselben Felds? Mehrere Datentypen? (Pilot-Lehre)
  - Bestehende Tests, ADRs, Board-Karten zum Thema

RECORD jede Aussage in Abschnitt 1 als `[Q: pfad/datei.ts:42]` oder `[Q: Person, Datum]`. Vermutungen als `[Uncertain]`.

IF die Ursache größer ist als das Symptom: Risikoklasse und Größe anheben, Person informieren, weiter.

</step>

<step number="4" name="schreiben">

### Step 4: intent.md schreiben

WRITE `intent/INT-JJJJ-NNN-kurzname/intent.md` nach Vorlage:
  - Frontmatter: jede Zeile mit zwei Leerzeichen abschließen, Leerzeile vor dem schließenden `---` (MacDown)
  - `status: entwurf`, `version: 0.1.0`, `bypass` nach Regel: `ja` nur bei Bugfix oder Größe S, mit Grund
  - Kern: drei Sätze, Problem und Anlass, Betroffene, Ziele, Nicht-Ziele, Abnahmekriterien (EARS, ein Modalverb, Ziel, Prüfart), Randbedingungen mit Herkunft (Projekt-Docs zitieren), offene Fragen mit Übergangsregel
  - Ab Risikoklasse mittel: Begriffe, Erfolgskennzahlen, Auslieferung/Betrieb/Zeitbudget, Entscheidungsrechte (ER-00…ER-08), Annahmen mit Prüfweg
  - Änderungsprotokoll: Zeile 0.1.0

CHECK Definition of Ready (Kommentar am Ende der Vorlage). Fehlt etwas → zurück zu Step 2.

</step>

<step number="5" name="vorlegen">

### Step 5: Vorlegen

PRESENT in Alltagssprache:
  - Was die Absicht sagt (Zweck, Kernaufgaben, Endzustand)
  - Was im Code gefunden wurde und ob es den Zuschnitt ändert
  - Offene Fragen mit Übergangsregel — die Person antwortet per ID
  - Nebenwirkungen (Pilot: „Wer vorher einen aktiven Filter hatte, setzt ihn danach selbst wieder")

WAIT for Freigabe oder Änderungen. Änderungen → Version hochzählen (MINOR bei neuem Kriterium, MAJOR bei geändertem Ziel), Änderungsprotokoll pflegen, erneut vorlegen.

</step>

<step number="6" name="freigabe">

### Step 6: Freigabe dokumentieren

ON Freigabe:
  - `status: angenommen`, `version: 1.0.0`, `freigabe.von`, `freigabe.am`, `geaendert`
  - Entschiedene OF-Zeilen als „*entschieden Datum (Rolle)*: …" mit Verweis auf AK/NZ
  - Änderungsprotokoll: Zeile 1.0.0 mit Freigabe
  - COMMIT: `intent(INT-JJJJ-NNN): <Titel> — angenommen` mit Kurzfassung der Entscheidungen
  - Board: `bezuege.board_karte` eintragen, falls eine Karte existiert. Karte anlegen oder nachziehen **nicht hier**: Der Abschlussbericht endet mit dem Block „Für das Board" (Projekt, Karte, Spalte, Beleg, Stand, Verweis auf den Intent-Ordner); das Nachziehen läuft in einer eigenen kurzen Sitzung nach `/clear` (Skill `obsidian-po-board`).

NEXT: `/spec INT-JJJJ-NNN` — oder bei `bypass: ja`: `/plan INT-JJJJ-NNN`

</step>

</process_flow>
