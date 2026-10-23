# Plan

Den technischen Plan zu einem Vorhaben im Plan Mode erarbeiten und als `plan.md` committen — bevor Code entsteht. Der Plan ist die Einheit der Ausführung.

Refer to the instructions located in specwright/workflows/core/plan.md

**Ablauf (Main Agent, Plan Mode bis zum Review, dann Entwurf in den Intent-Ordner):**
- Aufruf: `/plan INT-JJJJ-NNN`; braucht `intent.md` (angenommen) und `spec.md` (freigegeben) oder `bypass: ja`
- Pflichtinput: `docs/architecture.md` (Soll), `CLAUDE.md`, `docs/security.md`; Ausgangslage im Code mit `Datei:Zeile`
- Vorlage `templates/sdlc/vorhaben/plan-template.md`, oben zusätzlich `## In einfachen Worten` (globale Plan-Regel)
- Pflichtabschnitte: §3 Architektur-Auswirkung (Ja → `architecture.md` in derselben PR, ADR?), §5 Verbindungen mit Nachweis-Befehlen, §6 Schritt 1 Erste Scheibe, §7 Zerlegung (Variante A eine Sitzung, oder B in Scheiben mit Beweis + Integrationsaufgabe), §8 Nahtstelle je AK, §10 manuelle Schritte, §11 Kontext für den Bau (> ~120k → Teilung in mehrere Vorhaben)
- Self-Review nach Skill `review-implementation-plan`; externe Reviewer optional, jedes Finding entscheiden
- Plan Mode verlassen (Dialog = Vorprüfung, nicht Freigabe), dann `intent/INT-JJJJ-NNN-*/plan.md` mit `Status: entwurf` schreiben, ohne Commit — Plan Mode erlaubt nur `~/.claude/plans/`
- Mit Software Factory im Zielprojekt (`SPECWRIGHT_FACTORY_DIR` und Betriebsdatei): nach dem Entwurf `cards.yaml` (Format 2) schreiben, jede Karte über `ready-check --json` der Factory prüfen, höchstens zwei Runden Neuschnitt, Rest als Handschritte; Ergebnis und Abdeckung in §7 „Karten für die Factory“. Ohne Factory ein Satz, kein Schnitt
- `/plan INT-JJJJ-NNN --karten`: einen freigegebenen Plan nachträglich schneiden, ohne neu zu planen
- Freigabe gegen die Datei im Intent-Ordner → `Status: freigegeben`, `intent.bezuege.plan` setzen, Commit
- Geschnitten (`cards.yaml`): danach Plan-PR auf den Factory-Zweig und Karten anlegen, vier Bestätigungen (hochladen, PR, mergen, Karten anlegen), Vorschau der Factory vor dem Anlegen; nicht ready ausgelassene Karten → neu schneiden oder Handschritt. Erneutes `/plan INT-JJJJ-NNN` setzt dort fort

**Nächster Schritt:** `/build INT-JJJJ-NNN` (geschnitten: Handschritte; Karten baut die Factory)
