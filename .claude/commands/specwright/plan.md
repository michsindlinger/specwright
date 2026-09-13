# Plan

Den technischen Plan zu einem Vorhaben im Plan Mode erarbeiten und als `plan.md` committen — bevor Code entsteht. Der Plan ist die Einheit der Ausführung.

Refer to the instructions located in specwright/workflows/core/plan.md

**Ablauf (Main Agent, lesend bis zur Freigabe):**
- Aufruf: `/plan INT-JJJJ-NNN`; braucht `intent.md` (angenommen) und `spec.md` (freigegeben) oder `bypass: ja`
- Pflichtinput: `docs/architecture.md` (Soll), `CLAUDE.md`, `docs/security.md`; Ausgangslage im Code mit `Datei:Zeile`
- Vorlage `templates/sdlc/vorhaben/plan-template.md`, oben zusätzlich `## In einfachen Worten` (globale Plan-Regel)
- Pflichtabschnitte: §3 Architektur-Auswirkung (Ja → `architecture.md` in derselben PR, ADR?), §5 Verbindungen mit Nachweis-Befehlen, §7 Zerlegung (Variante A eine Sitzung, oder B mit Beweis + Integrationsaufgabe), §10 manuelle Schritte
- Self-Review nach Skill `review-implementation-plan`; externe Reviewer optional, jedes Finding entscheiden
- Freigabe → `status: freigegeben`, `intent.bezuege.plan` setzen, Commit

**Nächster Schritt:** `/build INT-JJJJ-NNN`
