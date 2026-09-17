# Build-Stand INT-2026-013

> Geschrieben 2026-09-17 am Ende der Plan-Sitzung (Kontextdeckel, `build.md` Step 3). Der PR ersetzt diese Datei.

## Erledigt

- Plan freigegeben (PO, Chat) und als `plan.md` abgelegt; `intent.md` (Bypass) angenommen; Befund-Screenshots in `design/`.
- Branch `fix/INT-2026-013-terminal-nachbesserung` von `origin/main` 79c0ec6 im Worktree `session-sdlc-ui`.

## Offen (plan.md §6)

- Schritt 0: Vorprüfung (a) Screenshots `neu`/Projekt-Seite 1 728 px, (b) `grep -n "layoutMode" ui/frontend/src/components/terminal/aos-cloud-terminal-sidebar.ts` als Checkliste, (c) Ist-Screenshots der vier Befunde gegen Branch-Backend 3111.
- Schritt 2: Tests rot (§4 #8–#12), dann `touch .claude/fix-mode`.
- Schritte 3–6: B1 (#1, #2), B2 (#3, #4), B3 (#5, #6), B4 (#7).
- Schritt 7: Lint, Build, `bash scripts/verify.sh`.
- Schritt 8: E2E (§8) mit Screenshots `design/ist/`, `e2e-protokoll.txt`; `.claude/fix-mode` entfernen; `docs/design.md` §5; PR.

## Letzter prüfbarer Zustand

- `bash scripts/check-leser-marker.sh --doc intent/INT-2026-013-terminal-nachbesserung/intent.md intent/INT-2026-013-terminal-nachbesserung/plan.md` → grün. Kein Code geändert.

## Fortsetzen

`/build INT-2026-013` (Wiederaufnahme: `plan.md` bleibt `freigegeben`, Step 1 setzt `in_umsetzung`; `.claude/fix-mode` erst nach den roten Tests).
