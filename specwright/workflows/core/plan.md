---
description: Technischer Plan im Plan Mode — Einheit der Ausführung, mit Zerlegung und Verbindungsnachweisen
globs:
alwaysApply: false
version: 1.5
encoding: UTF-8
---

# Plan Workflow

## Overview

Dritter Schritt des AI-native SDLC (Specwright v4). Erarbeitet lesend den technischen Plan und committet ihn als `plan.md`, bevor Code entsteht. **Der Plan ist die Einheit der Ausführung**: eine Sitzung setzt ihn ganz um, solange er ins Größenmaß passt (~120k Kontext für den Bau, Step 5). Zerlegung nur mit Beweis der Unabhängigkeit und immer mit einer Integrationsaufgabe in der Hauptsitzung.

**Grundsätze (aus dem Pilot INT-2026-001):**
- Ausgangslage im Code mit `Datei:Zeile` ist die halbe Arbeit. Erst lesen, dann entwerfen. (Pilot: Der bestehende `window.location.reload()` machte den Filterwechsel zu einer Zwei-Zeilen-Änderung.)
- Vier Schreiber eines Felds sind vier Änderungen plus eine gemeinsame Funktion — nicht vier Sonderfälle.
- Verworfene Alternativen aufschreiben, mit Grund. Das erspart die Diskussion im Review.
- Produktionsdaten anfassen = manueller Schritt mit Freigabe je Umgebung, nie Teil der automatischen Umsetzung.
- Datenhaltungs-Entscheidungen brauchen ein ADR, auch wenn die Änderung klein ist.
- Hat das Zielprojekt eine Software Factory, schneidet der Plan die Arbeit in Karten für die Factory und Handschritte für Menschen (Step 9c). Was eine Karte „factory ready“ macht, sagt allein die Eingangsprüfung der Factory; Specwright schreibt keine ihrer Regeln ab (ADR-0008).

<pre_flight_check>
  EXECUTE: specwright/workflows/meta/pre-flight.md
  EXECUTE: specwright/workflows/meta/leser-und-rueckfragen.md
</pre_flight_check>

<process_flow>

<step number="1" name="eingang">

### Step 1: Eingang prüfen

REQUIRE `INT-JJJJ-NNN`. READ `intent.md` (`status: angenommen`) und `spec.md` (`Status: freigegeben`) — oder `bypass: ja` in `intent.md` (dann gilt nur `intent.md`).
LOAD Pflichtinput: `docs/architecture.md` (Soll, Regeln AR-nn, bekannte Abweichungen), `CLAUDE.md` (Verify-Befehl, Konventionen, Hooks), `docs/security.md` (Verbotsliste, Pflichtprüfungen).
LOAD Vorlage `specwright/templates/sdlc/vorhaben/plan-template.md` (hybrid).
ENTER Plan Mode (lesend) — bis einschließlich Schritt 7. Kein Edit, kein Write.
NOTE: Claude Code lässt im Plan Mode nur `~/.claude/plans/<slug>.md` zu; `intent/…/plan.md` wird dort nicht angenommen. Die Datei entsteht deshalb erst in Schritt 9a, nach dem Verlassen des Plan Mode.
CLARIFY Software Factory des Zielprojekts (für Step 4 und 9c):
  - Umgebungsvariable `SPECWRIGHT_FACTORY_DIR` gesetzt, und `package.json` in diesem Ordner hat das Skript `ready-check`? Sonst: kein Schnitt.
  - Betriebsdatei der Factory für dieses Projekt: nennt die Person. Vorschlag: die Datei unter `~/.factory/*/factory.yaml`, deren `github.repo` zum `origin` des Projekts passt; die Person bestätigt. Keine passende Datei: kein Schnitt.
  - Kein Schnitt heißt: der Unterabschnitt „Karten für die Factory“ in §7 enthält nur den Satz „Kein Schnitt: [keine Software Factory eingerichtet | keine Betriebsdatei für dieses Projekt].“ Alles andere läuft wie ohne Factory.
IF Aufruf mit `--karten` und `plan.md` hat `Status: freigegeben` (oder später): Modus „nachträglich schneiden“. Kein Plan Mode, keine Schritte 2–9b; weiter direkt bei Step 9c. Ohne Factory (siehe oben): STOP mit dem Satz „Kein Schnitt: …“.

</step>

<step number="2" name="ausgangslage">

### Step 2: Ausgangslage im Code

FOR EACH betroffener Bereich aus Spec §2 und §7:
  - Wo passiert es heute? `Datei:Zeile`
  - Was ist wiederverwendbar (bestehende Muster, Skripte, Hilfsfunktionen, Tests)?
  - Welche Falle steckt drin (zweite Modulinstanz, gemerkter Zustand, Reload, gemischte Typen)?
  - Wo liegen die Tests zu diesem Bereich?
RECORD als Tabelle §2. Was nicht gefunden wurde: `[Uncertain]` mit Prüfweg.

</step>

<step number="3" name="entwurf">

### Step 3: Entwurf und Alternativen

DECIDE Ansatz; SCHREIBE mindestens zwei verworfene Alternativen mit Grund.
ANSWER §3 Architektur-Auswirkung ausdrücklich: Nein (mit Verweis auf die eingehaltenen Regeln AR-nn) oder Ja (welche Regel/Grenze, `architecture.md`-Änderung in derselben PR, ADR ja/nein).
CHECK `security.md` §6 Pflichtprüfungen: Endpunkt? Datenobjekt? externes System? personenbezogen? → Antworten in §4/§8.

</step>

<step number="4" name="aenderungen_und_verbindungen">

### Step 4: Änderungen, Verbindungen, Reihenfolge

WRITE §4: jede Datei mit Art, Was, Herkunft (FA/AK). „Nicht betroffen (ausdrücklich)" füllen.
WRITE §5: jede neue oder geänderte Verbindung mit Nachweis-Befehl (grep, Test). Jede neue Komponente hat mindestens eine Verbindung.
WRITE §6: Reihenfolge mit prüfbarem Zustand je Schritt; Schritt 0 ist immer eine lesende Vorprüfung auf Konsumenten, die brechen könnten. Schritt 1 ist die Erste Scheibe: dünn, durch alle betroffenen Schichten, allein vorführbar; danach verbreitern. Kein Schichtbau; berührt der Plan nur eine Schicht, steht das mit Grund in Schritt 1 (INT-2026-032).
IF Software Factory geklärt (Step 1): Schnitt-Entwurf festhalten (noch im Plan Mode, Datei entsteht in 9c). Je Kriterium aus Spec (oder `intent.md` bei Bypass): welche Karte oder welcher Handschritt, welche Testebene. Zulässig sind nur Testebenen, die das Zielprojekt eingerichtet hat, oder `verify`. Kriterien mit Prüfart Stichprobe oder Messung werden Handschritte (Grund `manual`). Eine Karte folgt der Reihenfolge aus §6; Abhängigkeiten nur auf Karten desselben Plans oder umgesetzte Vorhaben desselben Repos.

</step>

<step number="5" name="zerlegung">

### Step 5: Größenmaß und Zerlegung — genau eine Variante

ESTIMATE Kontext für den Bau: Plan, zu lesende Dateien, Änderungen, Prüfausgaben, je in k Tokens (Zeile in §11; INT-2026-032).
IF Summe > ~120k: STOP vor Step 6 — Teilung in mehrere Vorhaben vorschlagen (je Vorhaben eine Scheibe, Reihenfolge, was jedes allein liefert), als Rückfrage nach R2; die Person entscheidet. Bei Teilung: `/intent` je Teil, dieser Plan wird auf den ersten Teil geschnitten. Über der Grenze nie Variante B.
DEFAULT Variante A (eine Sitzung) mit Begründung.
Variante B nur wenn: jeder Teil eine Scheibe ist (durchgehender Pfad durch die betroffenen Schichten, allein vorführbar), Schnittstellen vor Start festgelegt (Datei:Zeile oder Typ), und §5 die Teile zuordnet. Gleichzeitig nur bei disjunkten Dateimengen (Befehl zum Beweis); sonst nacheinander, jeder Teil auf dem gemergten Vorgänger. Dann Tabelle Teil/Scheibe/Dateien/Schnittstelle/Worktree/Start plus Zeile „Integration — Hauptsitzung".
RULE: Zerlegung nie aus Gewohnheit. Pilot-Maßstab: „Parallelisierung brächte drei Worktrees für je 20 Minuten Arbeit und eine Integrationsaufgabe obendrauf."

</step>

<step number="6" name="tests_risiken_manuell">

### Step 6: Tests, Risiken, manuelle Schritte, Schätzung

WRITE §8: je AK/FA zuerst die Nahtstelle mit Begründung (öffentliche Schnittstelle, an der das Verhalten beobachtet wird; bestehende vor neuer, die höchste mögliche, möglichst eine für alle AK), dann Test, Datei und Art; Mocks nur an Systemgrenzen (externe Dienste, Zeit, Zufall), kein Erwartungswert, der wie im Code berechnet wird; Verify-Befehl; E2E-Pfad, der die Verbindungen aus §5 durchläuft; Bugfix-Anteil → Test zuerst; UI → Mock/Screenshot.
WRITE §9 Risiken mit „Wer merkt es".
WRITE §10 manuelle Schritte: Freigaben, Deploys, Datenläufe je Umgebung, Hook `production-gate`.
RULE: Jeder Schritt in §10 nennt den Weg belegt (Skript, Workflow-Datei, Befehl mit Pfad). `[Uncertain]` in §10 ist nicht freigabefähig — im Code nachsehen (`scripts/`, `.github/workflows/`, `package.json`-Skripte) oder „Weg klären“ als eigenen Schritt mit Wer und Wann eintragen. Pilot: Functions-Deploy stand als `[Uncertain]` im freigegebenen Plan und wurde erst am Deploy-Tag gefunden.
RULE: Bestandsdaten anfassen → §10 enthält die Kette Lesemodus → Bericht → Freigabe je Umgebung → Schreiben mit Backup/Rückweg → Nachmessung = 0; §8 führt die Nachmessung als Nachweis „Messung".
WRITE §11 Schätzung mit Spanne und Grund der Unsicherheit, dazu die Zeile „Kontext für den Bau" aus Step 5.

</step>

<step number="7" name="review">

### Step 7: Review des Plans

SELF-REVIEW nach Skill `review-implementation-plan` (Kollegen-Methode, Minimalinvasiv-Analyse).
OPTIONAL externe Reviewer (Multi-LLM): jedes Finding in §12 entscheiden — angenommen mit Änderung oder abgelehnt mit Grund. Kein Finding unbeantwortet.
WRITE „Minimalinvasiv geprüft": was wiederverwendet, was gestrichen.
RULE: Jede Review-Entscheidung in §12 und jede Rückfrage dazu nach R2 (`specwright/workflows/meta/leser-und-rueckfragen.md`): „Finding n, Gegenstand in einem Satz: angenommen/abgelehnt, weil …". Kein nacktes „Finding 7 abgelehnt".

</step>

<step number="8" name="plan_mode_verlassen">

### Step 8: Plan Mode verlassen

CALL `ExitPlanMode`. Der Dialog „Would you like to proceed?" ist die Vorprüfung, **nicht** die Freigabe des Plans — die Freigabe erfolgt in Schritt 9b gegen die Datei im Intent-Ordner.
RULE: Vor dem Verlassen keine Zusage über den Speicherort machen. `~/.claude/plans/<slug>.md` ist Arbeitskopie, nicht Ablage; sie wird von der nächsten Plan-Mode-Sitzung überschrieben.

</step>

<step number="9" name="schreiben_und_freigabe">

### Step 9a: plan.md als Entwurf schreiben

WRITE `intent/INT-JJJJ-NNN-*/plan.md` mit `Status: entwurf`, Struktur aus der Vorlage:
  - `## In einfachen Worten` (Worum geht es, was ändert sich, wie, was kann schiefgehen, was entscheiden), dann `## Details` mit `### 1.` bis `### 14.`
  - Leser-Marker der Vorlage unter jeder Überschrift übernehmen (R1)
  - Formatangabe der verwendeten Vorlage unverändert übernehmen (Kopfzeile `> **Format:**`, INT-2026-031); nie selbst setzen oder erhöhen. Trägt die verwendete Vorlage (Hybrid-Lookup Projekt → `~/.specwright`) keine Angabe, bleibt die Zeile weg (Datei gilt als vor Format 1). Ändert der Plan eine Vorhaben-Vorlage, entscheidet er die neue Nummer nach der Regel in `specwright/templates/sdlc/README.md`, Abschnitt „Formatversion"
  - Inhalt 1:1 aus Schritt 2–7; nichts nachträglich umformulieren, was im Plan Mode entschieden wurde.
NO COMMIT. Kein weiterer Edit außer dieser Datei und der Kartendatei aus Step 9c.
THEN Step 9c, danach erst vorlegen.
PRESENT (nach Step 9c) nach R3 (`specwright/workflows/meta/leser-und-rueckfragen.md`): „In einfachen Worten", §9 Risiken, §10 manuelle Schritte, §12 Review-Entscheidungen im Chat; §2–§8 und §13 nur als Verweis auf die Datei (`intent/INT-JJJJ-NNN-*/plan.md`). Unsicherheiten benennen.

### Step 9c: Karten für die Factory schneiden

Nur mit geklärter Software Factory (Step 1); sonst steht im Unterabschnitt „Karten für die Factory“ der Satz aus Step 1, weiter mit Step 9b.

1. WRITE `intent/INT-JJJJ-NNN-*/cards.yaml` mit `format: 2` aus dem Schnitt-Entwurf (Step 4; im Modus `--karten` aus §4, §6 und §8 des Plans):
    - Datei: `format: 2`, `intent: INT-JJJJ-NNN`, `cards`, `handSteps`.
    - Je Karte: `id` (`K-nn`), `title`, `type` (`feature` | `bug`), `criteria` (je `id`, `text`, `check`, `level`, optional `source` = Kennung aus Spec oder Intent), `areas` (Pfade oder Globs nur mit `*` und `**`), `size` (`files`, `lines`), `repos` (`owner/name`), `decisions` (je `trigger`, `adr`), `needs`, `dependsOn`, `openQuestions`.
    - Je Handschritt: `id` (`H-nn`), `what`, `who`, `when` (`{ before: K-nn }` | `{ after: K-nn }` | `afterIntent`), `proof`, `reason` (`manual` | `notReady` | `locked` | `external` | `other`), optional `reasonText`, `criteria` (je `id`, `text`, optional `source`; darf leer sein), optional `done` (`JJJJ-MM-TT`, trägt die Person ein, wenn der Schritt erledigt ist).
    - Kriterientexte in Alltagssprache: keine Funktions-, Datei- oder Variablennamen. Pfade stehen nur in `areas`.
2. Neue Entscheidungsnotizen (ADR) des Vorhabens mit `git add` vormerken; die Prüfung liest nur eingecheckte oder vorgemerkte Dateien. Kein Commit.
3. RUN mit absoluten Pfaden (der Befehl läuft im Ordner der Factory):
   `npm --prefix "$SPECWRIGHT_FACTORY_DIR" run --silent ready-check -- "[Betriebsdatei]" "[Worktree]/intent/INT-JJJJ-NNN-[kurzname]/cards.yaml" --repo "[Worktree]" --json`
4. Exit 2: Meldung von stderr in den Unterabschnitt, kein Schnitt, Rückfrage an die Person nach R2. Exit 0 oder 1: JSON von stdout lesen. Feld `format` ungleich `2` → STOP mit „Eingangsprüfung meldet unbekanntes Format [n]“; nicht raten.
5. Je Karte mit `ready: false`: Karte neu schneiden (kleiner, andere Testebene, offene Frage klären), Datei anpassen, Schritt 3 wiederholen. Höchstens zwei Runden Neuschnitt je Plan. Danach wird die Arbeit der Karte ein Handschritt mit `reason: notReady` und den Gründen aus dem JSON als `reasonText`.
6. WRITE Ergebnis in `plan.md`, §7 Unterabschnitt „Karten für die Factory“: Kartentabelle (Reihenfolge, Titel, Kriterien, Einstufung, Gründe, Hinweise aus `hints` und `codeTerms`), Handschritt-Tabelle (Kennung, was, wer, wann, Nachweis, Grund) und die Zeile Abdeckung mit den Zahlen aus `coverage` wörtlich: „[inReadyCards] von [criteria] Kriterien in ready Karten ([percent] %)“.

JSON der Eingangsprüfung (`format: 2`): `cards[]` mit `id`, `title`, `ready`, `reasons[]` (`rule`, optional `criterion`, `text`), `hints[]`, `codeTerms[]`; `handSteps[]` mit `id`, einem von `before`/`after`/`afterIntent` und `done`; `coverage` mit `criteria`, `inReadyCards`, `percent`. Der Exit-Code hängt nur an den Karten.
RULE: Specwright schreibt keine Prüfregel der Factory ab und rechnet nichts nach. Was ready ist und wie hoch die Abdeckung ist, sagt nur das JSON (ADR-0008).
RULE: Ein Handschritt vor einer Karte hält deren Anlegen am Board zurück, bis `done` gesetzt ist; das Board selbst kennt keine Handschritte.

### Step 9b: Freigabe

RULE: Vor dem WAIT Abgleich nach R4 (`specwright/workflows/meta/leser-und-rueckfragen.md`): „In einfachen Worten", §9, §10, §12 gegen §2–§8 lesen; Abweichung als Rückfrage; Ergebnis in §12 als Zeile „**Abgleich Mensch/Agent:** … gelesen am (Datum): ohne Befund | Befund: …" eintragen.
WAIT for Freigabe. Die Person liest `plan.md` im Intent-Ordner; externe Reviewer bekommen denselben Pfad.
ON Änderungswunsch: `plan.md` anpassen, erneut vorlegen. Bleibt `Status: entwurf`.
ON Freigabe: `Status: freigegeben`, Freigabe Rolle + Datum, `intent.md` `bezuege.plan: "plan.md"`, COMMIT `plan(INT-JJJJ-NNN): Plan freigegeben` (mit `cards.yaml`, falls geschnitten).
IF Modus `--karten`: Status des Plans bleibt; nach Bestätigung der Person COMMIT `plan(INT-JJJJ-NNN): Karten geschnitten` mit `plan.md` und `cards.yaml`.

NEXT: `/build INT-JJJJ-NNN`

</step>

</process_flow>
