---
name: start-from-handoff
description: "Setzt die Arbeit nach einem /clear aus dem letzten Session-Handoff fort: findet die neueste Handoff-Datei des Projekts (.claude/handoffs/), liest sie ein und startet direkt mit dem dort festgehaltenen nächsten Schritt. Aufruf: /start-from-handoff, 'start from last session handoff', 'mach beim letzten Handoff weiter'. Gegenstück zu /session-handoff."
---

# Start from Handoff

Stelle den Arbeitskontext aus dem letzten Session-Handoff wieder her und arbeite weiter.

## Workflow

1. Finde die neueste Handoff-Datei:
   `ls -t <Projektroot>/.claude/handoffs/handoff-*.md | head -1`
   (Projektroot = aktuelles Arbeitsverzeichnis bzw. Git-Root.)
   - Keine Datei vorhanden → sag das kurz und frag, womit gestartet werden soll. Ende.
2. Lies die Datei vollständig.
3. Verifiziere den Stand gegen die Realität, bevor du loslegst — das Handoff ist ein
   Schnappschuss, kein Beweis:
   - `git log --oneline -5` und `git status --short`: Passt der beschriebene Stand?
     Wurde seit dem Handoff schon weitergearbeitet (neue Commits)?
   - Bei Abweichung: kurz benennen, was sich geändert hat, und die offenen Tasks
     entsprechend anpassen statt blind dem Dokument zu folgen.
4. Gib eine kurze Wiederaufnahme aus (kein Volltext-Dump der Datei):
   - Ein Satz Projekt-Kontext,
   - offene Tasks als Liste,
   - der „Nächste Schritt".
5. Beginne direkt mit dem „Nächsten Schritt" — ohne Rückfrage, außer das Handoff
   markiert dort explizit eine offene Entscheidung.

## Regeln

- Immer die NEUESTE Datei (Zeitstempel im Namen), nicht mehrere mischen.
- Ältere Handoffs nicht löschen — sie sind Historie. Aufräumen nur auf Ansage.
- Deutsch, wenn das Handoff auf Deutsch ist.
