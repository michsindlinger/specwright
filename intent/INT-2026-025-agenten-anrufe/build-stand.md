# Build-Stand INT-2026-025

> Branch `feat/INT-2026-025-agenten-anrufe` · Worktree `specwright-worktrees/session-cloud-1790512842467-10` · Stand 2026-09-27

## Erledigt (Plan §6)

- Schritt 0: Vorprüfung — `verify --fast` OK auf unverändertem Stand; Claude Code 2.1.283; Aufrufer: `renderHookSettings` nur in `claude-hooks.ts`, `mapHookPayload` nur Route, `pasteLocked`/`screenCheck` nur `vorhaben-service.ts`, `voice.protocol.ts` nur `team-view.ts` + `ui-rahmen-abbau.test.ts`.
- Schritt 1: Fixtures `ui/tests/fixtures/tui/2.1.283/`, `ui/tests/fixtures/hooks/2.1.283/` (Commit 5e2310f). ExitPlanMode trägt Plantext → kein Stopp.
- Schritt 2–4: Protokoll, reine Module, Parser, Warteschlange, Lokal-Erkennung, `pruefeEingabeWartet`, `isReviewRunning`, `extractAnrufInhalt`, Kontext-Hook, Route, `blockedBy` im Event, Skripte, Voice-Reste entfernt (Commit 1d50c67, M1).

- Schritt 5–9: Erkennung, Sender, Zustand/Dienst/Handler, WebSocket- und Routen-Verdrahtung, Frontend (Kasten, Dienst, Glocke, Schalter, Ton), Docs + ADR-0006 (Commit 8901aa6, M2/M3). 21 Anruf-Testdateien, 477 Tests grün; Lint ui/ui-frontend 0 Fehler; `npm run build` grün.
- `bash scripts/verify.sh`: 1. Lauf ROT (Stufe 5: `tests/integration/terminal-io|multi|reconnect.test.ts`, einzeln grün — bekannte Mac-Flakiness), 2. Lauf `verify: OK`.

## Offen

- Schritt 10: §5-Nachweise ausführen und für den PR sichern (grep-Befehle aus der Tabelle §5).
- E2E §8: Modell einrichten (`cd ui && npm run sprache:einrichten -- --von <pfad>`; Modell liegt unter `/private/tmp/claude-502/*/scratchpad/stt/ggml-large-v3-turbo-q5_0.bin` einer früheren Sitzung, `find /private/tmp/claude-502 -name ggml-large-v3-turbo-q5_0.bin -size +500M`), Branch-Backend 3111 mit Scratch-Projekt (Memory `reference_cloud_terminal_e2e_playwright`), Rückfrage → Klingeln → Annehmen → Antworten; Playwright-Screenshots je Zustand neben `design/anruf-mock.png`; `ls -A <runtime>/sprache-tmp-3111` leer; Kontext-Hook-Latenz p95 über 100 Prompts (Schwelle p95 ≤ 20 ms, max ≤ 100 ms); manuelle Checkliste §8.
- §10 manuell (Michael): EK-01/EK-03 mit eigener Stimme, AK-16 WLAN aus.
- PR über `git-workflow` (Body: §1, verify-Ausgabe, §5, E2E, §14, §10 offen); danach `plan.md` → `umgesetzt`, T-08 in `security.md` auf „umgesetzt", PR-Nummer in ADR-0006 und Änderungsprotokollen, diese Datei löschen.

## Offene Abweichungen

Siehe `plan.md` §14 (Messungen Schritt 1, Subagenten-Ausführung, Hook-Option, stage4-Test lokal zeitabhängig).

## Fortsetzen

In neuer Sitzung: `/build INT-2026-025`
