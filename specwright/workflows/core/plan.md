---
description: Technischer Plan im Plan Mode — Einheit der Ausführung, mit Zerlegung und Verbindungsnachweisen
globs:
alwaysApply: false
version: 1.0
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
</pre_flight_check>

<process_flow>

<step number="1" name="eingang">

### Step 1: Eingang prüfen

REQUIRE `INT-JJJJ-NNN`. READ `intent.md` (`status: angenommen`) und `spec.md` (`Status: freigegeben`) — oder `bypass: ja` in `intent.md` (dann gilt nur `intent.md`).
LOAD Pflichtinput: `docs/architecture.md` (Soll, Regeln AR-nn, bekannte Abweichungen), `CLAUDE.md` (Verify-Befehl, Konventionen, Hooks), `docs/security.md` (Verbotsliste, Pflichtprüfungen).
LOAD Vorlage `specwright/templates/sdlc/vorhaben/plan-template.md` (hybrid).
ENTER Plan Mode (lesend). Kein Edit, kein Write außer `plan.md` am Ende.

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

</step>

<step number="8" name="schreiben_und_freigabe">

### Step 8: plan.md schreiben, vorlegen, Freigabe

WRITE `intent/INT-JJJJ-NNN-*/plan.md`:
  - oben `## In einfachen Worten` (globale Plan-Regel: Worum geht es, was ändert sich, wie, was kann schiefgehen, was entscheiden)
  - danach die Vorlagen-Abschnitte 1–14
PRESENT Teil „In einfachen Worten" im Chat, Details als Kurzliste mit Verweis auf die Datei. Unsicherheiten benennen.
WAIT for Freigabe.
ON Freigabe: `Status: freigegeben`, Freigabe Rolle + Datum, `intent.md` `bezuege.plan: "plan.md"`, COMMIT `plan(INT-JJJJ-NNN): Plan freigegeben`.
EXIT Plan Mode.

NEXT: `/build INT-JJJJ-NNN`

</step>

</process_flow>
