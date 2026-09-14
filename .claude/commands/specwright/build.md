# Build

Einen freigegebenen Plan in **einer Sitzung** umsetzen: Branch, Reihenfolge laut Plan, Tests, Verify, Verbindungsnachweise, Definition of Done, PR.

Refer to the instructions located in specwright/workflows/core/build.md

**Ablauf (Main Agent):**
- Aufruf: `/build INT-JJJJ-NNN`; braucht `plan.md` mit `status: freigegeben`
- Branch `feat/INT-JJJJ-NNN-kurzname`; bei Bugfix Marker `.claude/fix-mode` (Hook `protect-tests`), Test zuerst
- Zerlegung §7: Variante A → alles hier; Variante B → je Teil ein Worktree, **Integration immer in dieser Sitzung**
- Reihenfolge §6 Schritt für Schritt; jede Abweichung sofort in §14
- Verify-Befehl aus `CLAUDE.md`, Nachweise aus §5 ausführen und zitieren, E2E-Pfad aus §8
- 2x-Regel-Check → Vorschlag für `CLAUDE.md` im PR; Auto-Memory für projektübergreifende Lehren
- PR über Skill/Agent `git-workflow`; Board-Karte nachziehen; `plan.md` auf `umgesetzt`, `intent.md` auf `umgesetzt` nach Merge

**Nächster Schritt:** Review und Merge durch den Menschen; manuelle Schritte aus §10
