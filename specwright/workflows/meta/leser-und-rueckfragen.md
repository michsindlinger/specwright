---
description: Zwei Leser je Dokument (Mensch, Agent), Rückfragen mit Kontext, Vorlegen und Abgleich — gemeinsame Regeln R1–R4 für intent, spec, plan, build
globs:
alwaysApply: false
version: 1.0
encoding: UTF-8
---

# Leser und Rückfragen (R1–R4)

## Overview

Die drei Vorhaben-Dokumente (`intent.md`, `spec.md`, `plan.md`) haben zwei Leser: den Menschen, der entscheidet, und den Agenten, der baut. Diese Datei hält die vier Regeln, die dafür in allen vier Kern-Workflows gelten (INT-2026-009). Die Workflows laden sie im `pre_flight_check` und verweisen an jeder Frage-, Vorlege- und Freigabestelle darauf. Es gibt keinen Laufzeit-Mechanismus dahinter: Der Agent liest und befolgt die Regeln; ein Guard (`scripts/check-leser-marker.sh`) prüft nur Vorlagen und Dokumente.

## R1 — Leser-Marker

- **Syntax:** genau eine Zeile `<!-- leser: mensch -->` oder `<!-- leser: agent -->`. Ein HTML-Kommentar, in MacDown, GitHub und der Web-UI unsichtbar.
- **Platz:** erste nicht-leere Zeile nach einer Überschrift der Ebenen `##`, `###`, `####` (höchstens eine Leerzeile dazwischen). Nichts anderes darf dazwischenstehen, auch kein Hinweis-Kommentar und keine Tabelle. Ein Marker an anderer Stelle ist ein Fehler. Die H1 trägt keinen Marker.
- **Geltung:** vom Marker bis zur nächsten Überschrift gleicher oder höherer Ebene.
- **Vorlagen:** jede Überschrift `##`–`####` trägt einen Marker, kein Erben. Welche Überschrift welchen Wert bekommt, steht als Soll-Tabelle allein im Guard `scripts/check-leser-marker.sh`; README und Pläne zitieren sie.
- **Dokumente:** entweder kein Marker im ganzen Dokument (dann gilt alles als `mensch`; so bleiben alle Dokumente vor INT-2026-009 gültig), oder jede `##`- und `###`-Überschrift trägt einen; `####` und tiefer dürfen vom nächsten markierten Vorfahren erben. Teilweise markierte Dokumente sind ein Fehler.
- **Beim Schreiben:** die Marker der Vorlage übernehmen, keinen entfernen. Jede neue `##`- oder `###`-Überschrift bekommt einen Marker: `mensch`, wenn der Abschnitt eine Entscheidung trägt (Ziele, Kriterien, offene Fragen, Annahmen, Risiken, Review-Entscheidungen, manuelle Schritte, Abweichungen); `agent`, wenn er Dateien, Verbindungen, Reihenfolgen, Tests oder Checklisten enthält.

## R2 — Rückfragen mit Kontext

Jede Rückfrage, jeder Vorschlag zur Bestätigung, jede Review-Entscheidung und jede Abweichung, die sich auf eine Kennung bezieht, nennt die Kennung **und** in einem Satz, worum es geht, mit Vorschlag:

`KENNUNG, Gegenstand in einem Satz: Vorschlag. Frage?`

Beispiel: „OF-03, Sprache je Projekt sperrbar: Vorschlag Ja, Standard aus. Ok?"

- **Kennungen** sind die Familien der Dokumente (AK, FA, RB, B, NZ, Z, EK, ER, AN, OF, D, T, AR, AP, V), die Reference Points F/R/D/O/A und Finding-Nummern eines Reviews.
- Die Person muss aus dem Chat heraus antworten können, ohne im Dokument zurückzuscrollen.
- **Ausnahme:** Interviewfragen, bevor ein Dokument existiert (intent Step 2), haben keine Kennung; sie nennen ihren Gegenstand ohnehin und liefern, wo möglich, einen Vorschlag mit.

## R3 — Vorlegen und Berichten

Wird ein Dokument vorgelegt oder eine Bausitzung berichtet, gibt der Chat-Text **nur die Mensch-Abschnitte** wieder und verweist für die Agenten-Abschnitte auf die Datei mit Pfad:

| Anlass | Im Chat | Nur als Verweis auf die Datei |
|---|---|---|
| intent vorlegen | drei Sätze, §1 Problem, §3 Ziele, §4 Nicht-Ziele, §7 offene Fragen, §12 Annahmen | Kopf-Tabelle, §11 Entscheidungsrechte, Änderungsprotokoll |
| spec vorlegen | §1 Zusammenfassung, §2 Abläufe, §6 Was der Nutzer sieht, §8 Nicht im Umfang, §9 Annahmen | §5 Daten, §7 Bedenken (nur die offenen als Rückfrage nach R2), §10 Checkliste |
| plan vorlegen | „In einfachen Worten", §9 Risiken, §10 manuelle Schritte, §12 Review-Entscheidungen | §2–§8, §13 |
| build-Abschlussbericht | plan §1 Kurzfassung, offene §10, §14 Abweichungen, Nachweise als Verweis (PR, Datei) | Verify-Ausgabe, Nachweis-Befehle, Protokolle |

Kein Zitat aus einem Agenten-Abschnitt im Chat. Offene Punkte aus Agenten-Abschnitten werden als Rückfrage nach R2 gestellt, nicht als Tabelle wiedergegeben.

## R4 — Abgleich vor Freigabe

Bevor die Person freigibt, liest der Agent die Mensch-Abschnitte gegen die Agenten-Abschnitte: Verspricht der Mensch-Teil etwas, das der Agenten-Teil nicht einlöst, oder umgekehrt? Jede Abweichung wird als Rückfrage nach R2 gestellt. Das Ergebnis steht **sichtbar** im Dokument:

- `intent.md`: Änderungsprotokoll-Zeile der Freigabe-Version: „Abgleich Mensch/Agent: ohne Befund" oder „Abgleich Mensch/Agent, Befund: …".
- `spec.md`: §10 Checklisten-Punkt „Abgleich Mensch/Agent … (Datum), Befund: …".
- `plan.md`: §12 Zeile „**Abgleich Mensch/Agent:** … gelesen am (Datum): ohne Befund | Befund: …".

Ohne diesen Eintrag ist ein Dokument nicht freigabefähig.
