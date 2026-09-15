# Intent

Ein neues Vorhaben als `intent/INT-JJJJ-NNN-kurzname/intent.md` festhalten: was und warum, in den Worten der Person mit der Idee, fachlich, mit Belegen aus dem Code.

Refer to the instructions located in specwright/workflows/core/intent.md

**Ablauf (Main Agent, keine Sub-Agenten):**
- Kurzes Gespräch: Problem, Anlass, Betroffene, Ziele, Nicht-Ziele — höchstens fünf Rückfragen
- Ursachen im Code belegen (`[Q: Datei:Zeile]`), nicht vermuten
- Vorlage `templates/sdlc/vorhaben/intent-template.md`; Vertragsschicht nur ab Risikoklasse mittel
- Größe S oder Bugfix → `bypass: ja` möglich (direkt zu `/plan`), sonst `/spec`
- Definition of Ready prüfen, Freigabe einholen, dann `status: angenommen`, Version 1.0.0, Commit
- Board-Karte verweist auf den Ordner; Nachziehen nicht hier, sondern in eigener kurzer Sitzung — Abschlussbericht endet mit dem Block „Für das Board"

**Nächster Schritt:** `/spec INT-JJJJ-NNN` oder bei Bypass `/plan INT-JJJJ-NNN`
