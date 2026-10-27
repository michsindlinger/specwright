# Build-Stand INT-2026-037

> Stand: 2026-10-27 · Branch `feat/INT-2026-037-review-absicht-und-plan` · Worktree `../specwright-worktrees/review-absicht`

## Erledigt (plan.md §6)

- Schritt 0 Vorprüfung: Konsumenten von `reviewerId`, `plan-review:started/prompt`, `DEFAULT_REVIEWER_IDS`, `submitAtPrompt`, `triggerManualReview` gelesen; `aos-plan-review-block` ist Shadow-Root (`static styles`), `aos-review-prompt-editor` und `aos-auto-review-toggle` Light-DOM.
- Schritte 1–7: Code, Tests, Framework (Workflows intent 1.5 / plan 1.7, Vorlagen 2.3, Release 4.7.0), Docs (architecture §2/§3/§5, ADR-0002, product-brief §8).
- Schritt 8 teilweise: alle Nachweis-Befehle aus §5 treffen; FA-25 gemessen; Echttest der Probe gegen die Anbieter (§14).

## Letzter prüfbarer Zustand

- Neue und geänderte Tests grün: `plan-review-orchestrator` (45), `vorhaben-service-auto-review` (11), `review-auswahl`, `review-ziel`, `model-config-reviewer`, `external-reviewer`.
- `bash scripts/verify.sh`: Stufen 1–4 grün; Stufe 5 lokal rot nur mit `sprach-erkennung.test.ts` und `vorhaben-abschluss-git.test.ts` (Zeitlimits unter Last, einzeln grün, nicht im Diff).

## Offen

1. E2E nach §8: Branch-Backend auf Port 3111 mit Scratch-Projekt (Memory `reference_cloud_terminal_e2e_playwright`; Trust-Dialog erst Pfeil runter, dann Enter), Absicht schreiben lassen → Auto-Review, zweiter Halt ohne zweites Review, Knopf „Absicht prüfen“, Ausfall und Ersatz sichtbar. Screenshots von Review-Block und Einstellungen. Live-Backend 3001 nicht anfassen.
2. `verify` erneut, dann PR über `git-workflow` (Body: §1, Verify-Ausgabe, §5-Nachweise, E2E-Protokoll, §14, §10, 2x-Regel).
3. `plan.md` → `Status: umgesetzt`, diese Datei löschen.

## Offene Entscheidung

- O1: `anthropic/fable` als erste Ersatzposition fällt mit 404 aus (Modell-ID `fable` in `ui/config/model-config.json`). Ersatzreihe ändern oder Modell-ID in der Config korrigieren?

## Fortsetzen

`/build INT-2026-037`
