# Build-Stand INT-2026-025

> Branch `feat/INT-2026-025-agenten-anrufe` · Worktree `specwright-worktrees/session-cloud-1790512842467-10` · Stand 2026-09-27

## Erledigt (Plan §6)

- Schritt 0: Vorprüfung — `verify --fast` OK auf unverändertem Stand; Claude Code 2.1.283; Aufrufer: `renderHookSettings` nur in `claude-hooks.ts`, `mapHookPayload` nur Route, `pasteLocked`/`screenCheck` nur `vorhaben-service.ts`, `voice.protocol.ts` nur `team-view.ts` + `ui-rahmen-abbau.test.ts`.
- Schritt 1: Fixtures `ui/tests/fixtures/tui/2.1.283/`, `ui/tests/fixtures/hooks/2.1.283/` (Commit 5e2310f). ExitPlanMode trägt Plantext → kein Stopp.
- Schritt 2–4: Protokoll, reine Module, Parser, Warteschlange, Lokal-Erkennung, `pruefeEingabeWartet`, `isReviewRunning`, `extractAnrufInhalt`, Kontext-Hook, Route, `blockedBy` im Event, Skripte, Voice-Reste entfernt (Commit 1d50c67, M1).

## In Arbeit (Subagenten, Stand beim Schreiben)

- `sprach-erkennung.ts` (#9), `anruf-sender.ts` (#10), `anruf-zustand.ts`/`anruf-service.ts`/`anruf-handler.ts`/`websocket.ts`/`index.ts` (#7a, #8, #16–#18), Frontend (#19–#26), Docs/ADR-0006 (#33, #34).

## Offen

- Schritt 5–9 integrieren: Tests aller neuen Dateien, `npm run lint` (ui, ui/frontend), `npm run build` (ui/frontend), Commit M2/M3.
- Schritt 10: §5-Nachweise (grep-Befehle aus der Tabelle), `bash scripts/verify.sh`, E2E §8 (Branch-Backend 3111, Scratch-Projekt, Playwright-Screenshots neben `design/anruf-mock.png`, `ls -A <sprache-tmp>` leer, Hook-Latenz p95).
- §10 manuell: Modell einrichten (`npm run sprache:einrichten --von <pfad>`; Modell liegt in einem früheren Scratchpad unter `/private/tmp/claude-502/…/scratchpad/stt/`), EK-01/EK-03 mit Michaels Stimme, AK-16 WLAN aus.
- PR über `git-workflow`, `plan.md` → `umgesetzt`, diese Datei löschen.

## Offene Abweichungen

Siehe `plan.md` §14 (Messungen Schritt 1, Subagenten-Ausführung, Hook-Option, stage4-Test lokal zeitabhängig).

## Fortsetzen

In neuer Sitzung: `/build INT-2026-025`
