---
description: Technischer Plan im Plan Mode — Einheit der Ausführung, mit Zerlegung und Verbindungsnachweisen
globs:
alwaysApply: false
version: 1.2
encoding: UTF-8
---

# Plan Workflow

## Overview

Dritter Schritt des AI-native SDLC (Specwright v4). Erarbeitet lesend den technischen Plan und committet ihn als `plan.md`, bevor Code entsteht. **Der Plan ist die Einheit der Ausführung**: eine Sitzung setzt ihn ganz um. Zerlegung nur mit Beweis der Unabhängigkeit und immer mit einer Integrationsaufgabe in der Hauptsitzung.

**Grundsätze (aus dem Pilot INT-2026-001):**
- Ausgangslage im Code mit `Datei:Zeile` ist die halbe Arbeit. Erst lesen, dann entwerfen. (Pilot: Der bestehende `window.location.reload()` machte den Filterwechsel zu einer Zwei-Zeilen-Änderung.)
- Vier Schreiber eines Felds sind vier Änderungen plus eine gemeinsame Funktion — nicht vier Sonderfälle.
- Verworfene Alternativen aufschreiben, mit Grund. Das erspart die Diskussion im Review.
- Produktionsdaten anfassen = manueller Schritt mit Freigabe je Umgebung, nie Teil der automatischen Umsetzung.
- Datenhaltungs-Entscheidungen brauchen ein ADR, auch wenn die Änderung klein ist.

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
WRITE §6: Reihenfolge mit prüfbarem Zustand je Schritt; Schritt 0 ist immer eine lesende Vorprüfung auf Konsumenten, die brechen könnten.

</step>

<step number="5" name="zerlegung">

### Step 5: Zerlegung — genau eine Variante

DEFAULT Variante A (eine Sitzung) mit Begründung.
Variante B nur wenn: Dateimengen disjunkt (Befehl zum Beweis), Schnittstellen vor Start festgelegt (Datei:Zeile oder Typ), und §5 die Teile zuordnet. Dann Tabelle Teil/Dateien/Schnittstelle/Worktree plus Zeile „Integration — Hauptsitzung".
RULE: Zerlegung nie aus Gewohnheit. Pilot-Maßstab: „Parallelisierung brächte drei Worktrees für je 20 Minuten Arbeit und eine Integrationsaufgabe obendrauf."

</step>

<step number="6" name="tests_risiken_manuell">

### Step 6: Tests, Risiken, manuelle Schritte, Schätzung

WRITE §8: je AK/FA ein Test mit Datei und Art; Verify-Befehl; E2E-Pfad, der die Verbindungen aus §5 durchläuft; Bugfix-Anteil → Test zuerst; UI → Mock/Screenshot.
WRITE §9 Risiken mit „Wer merkt es".
WRITE §10 manuelle Schritte: Freigaben, Deploys, Datenläufe je Umgebung, Hook `production-gate`.
RULE: Jeder Schritt in §10 nennt den Weg belegt (Skript, Workflow-Datei, Befehl mit Pfad). `[Uncertain]` in §10 ist nicht freigabefähig — im Code nachsehen (`scripts/`, `.github/workflows/`, `package.json`-Skripte) oder „Weg klären“ als eigenen Schritt mit Wer und Wann eintragen. Pilot: Functions-Deploy stand als `[Uncertain]` im freigegebenen Plan und wurde erst am Deploy-Tag gefunden.
RULE: Bestandsdaten anfassen → §10 enthält die Kette Lesemodus → Bericht → Freigabe je Umgebung → Schreiben mit Backup/Rückweg → Nachmessung = 0; §8 führt die Nachmessung als Nachweis „Messung".
WRITE §11 Schätzung mit Spanne und Grund der Unsicherheit.

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
  - Inhalt 1:1 aus Schritt 2–7; nichts nachträglich umformulieren, was im Plan Mode entschieden wurde.
NO COMMIT. Kein weiterer Edit außer dieser Datei.
PRESENT nach R3 (`specwright/workflows/meta/leser-und-rueckfragen.md`): „In einfachen Worten", §9 Risiken, §10 manuelle Schritte, §12 Review-Entscheidungen im Chat; §2–§8 und §13 nur als Verweis auf die Datei (`intent/INT-JJJJ-NNN-*/plan.md`). Unsicherheiten benennen.

### Step 9b: Freigabe

RULE: Vor dem WAIT Abgleich nach R4 (`specwright/workflows/meta/leser-und-rueckfragen.md`): „In einfachen Worten", §9, §10, §12 gegen §2–§8 lesen; Abweichung als Rückfrage; Ergebnis in §12 als Zeile „**Abgleich Mensch/Agent:** … gelesen am (Datum): ohne Befund | Befund: …" eintragen.
WAIT for Freigabe. Die Person liest `plan.md` im Intent-Ordner; externe Reviewer bekommen denselben Pfad.
ON Änderungswunsch: `plan.md` anpassen, erneut vorlegen. Bleibt `Status: entwurf`.
ON Freigabe: `Status: freigegeben`, Freigabe Rolle + Datum, `intent.md` `bezuege.plan: "plan.md"`, COMMIT `plan(INT-JJJJ-NNN): Plan freigegeben`.

NEXT: `/build INT-JJJJ-NNN`

</step>

</process_flow>
