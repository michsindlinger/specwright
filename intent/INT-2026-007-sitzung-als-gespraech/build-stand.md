# Build-Stand INT-2026-007 — Stufe 1 (PR 1)

> Stand: 2026-09-16, Sitzung 2 (Schritte 5 und 6 erledigt; offen: 7 E2E, 8 Verify/PR). Branch `feat/INT-2026-007-sitzung-als-gespraech`, letzter Commit siehe `git log`.
> Fortsetzen: `/build INT-2026-007` (Step 1 des Workflows liest diese Datei und `plan.md` §14; Branch existiert, kein zweiter).

## Erledigt (Stufe 1, §6)

| Schritt | Stand | Beleg |
|---|---|---|
| PR 0 Hotfix Schlüsseldatei | **PR #52 offen** (`hotfix/voice-config-aus-dem-repo`), in den Bau-Branch gemergt | `git ls-files ui/config/voice-config.json` → leer; Guard `check-no-voice-config` in `scripts/verify.sh` |
| Vorhaben umnummeriert 006 → 007 | erledigt | Commit `32bac7e`, §14 Zeile 1 |
| 0 (a) Konsumenten-Greps | erledigt | §14 |
| 0 (b) Messung Latenz / Payload-Länge | **bestanden** (125 ms Median, 20/20 voll) | §14, `/tmp/sw-3111/messung/report.json` (lokal) |
| 0 (c) Hook-Reihenfolge, Ids, TUI | erledigt | §14 (6 Zeilen), Fixtures `ui/tests/fixtures/tui/2.1.273/` |
| 1 Env, Hooks, Manager, Registry, Route | erledigt, Tests grün | Commit `3caceb9`; `session-env.test.ts`, `claude-hooks.test.ts`, `cloud-terminal-agent-event.test.ts`, `cloud-session-registry.test.ts`, `cloud-terminal-restore.test.ts`, `cloud-terminal-routes.test.ts` |
| 2 Transkript-Leser | erledigt, Tests grün | Commit `abf6117`; `transcript-reader.test.ts`, Fixture `ui/tests/fixtures/transcript/2.1.273/sitzung.jsonl` |
| 3 Gesprächsdienst, Handler, `sendText`, WS-Verdrahtung | erledigt, Tests grün | Commit `ac2209c`; `gespraech-service.test.ts`, `gespraech-handler.test.ts`, `vorhaben-service-stage3.test.ts`, `deploy-readiness-gate.test.ts` |
| 4 Wartezustände je Dialogart | erledigt, Tests grün | Commit `94c6f8b`; `vorhaben-reader.test.ts`, `vorhaben-sort.test.ts`, `aos-vorhaben-stage2.test.ts` |
| 5 Frontend (Gespräch, Split, FA-22) | erledigt, Tests grün, `tsc` beide, `npm run lint` 0 Fehler | Commit `1aa5a0a`; `aos-gespraech.test.ts` (14), `gespraech-client-service.test.ts` (3), `aos-vorhaben-view-split.test.ts` (4) |
| 6 Docs (architecture §2/§3, ADR-0003, security §2/§6, product-brief, INT-2026-004-Nachtrag) | erledigt | Sitzung 2, §14 |

Letzter prüfbarer Zustand: `cd ui && npx tsc --noEmit -p tsconfig.json` (Backend) und `cd ui/frontend && npx tsc --noEmit` ohne Fehler; `npx eslint src` 0 Fehler (4 Warnungen, alle vorher vorhanden in `websocket.ts`); die oben genannten Testdateien grün. **`bash scripts/verify.sh` ist noch nicht gelaufen** (Schritt 8).

## Offen (Stufe 1)

7. **E2E** (Playwright-Skript im Scratchpad, Rezept Memory „Cloud-Terminal E2E via Playwright"; Frontend vorher bauen: `cd ui/frontend && npm run build`): Vorhaben öffnen → Gespräch zeigt Verlauf inkl. Terminal-Eingabe → Freitext senden → im Terminal sichtbar (`capture-pane`) → Einreihen bei arbeitender Sitzung → Hinweiskarte bei Rückfrage + „Im Terminal öffnen" → Backend-Neustart, Verlauf bleibt (FA-08); Messung EK-02 im Protokoll (`design/e2e-protokoll.txt`); Screenshots `design/ist-08*.png` neben `design/08-gespraech-mac.png`; Nachweis `grep -c CLAUDE_CODE_CHILD_SESSION` auf `launch/run-*.sh` → 0.
8. `bash scripts/verify.sh` → `verify: OK`; Nachweise §5 (Stufe 1) ausführen und zitieren, u. a. `grep -rn "sendInput(" ui/src/server --include=*.ts | grep -v withMachineWrite | grep -v test` (erwartete Ausnahmen: `websocket.ts handleCloudTerminalInput`, Bild-Einfügen `cloud-terminal-manager.ts`, Implementierung `sendInput`, Typdeklaration `vorhaben-service.ts`, `dialog-driver`/`pasteLocked` innerhalb des Locks); PR 1 über `git-workflow` (Body: §1 Kurzfassung, Verify-Ausgabe, Nachweise, E2E-Protokoll, §14, offene §10, `CLAUDE.md`-Vorschlag „Nie: `ui/config/*` mit Zugängen committen"); `plan.md` `Status: umgesetzt`; Abschlussbericht mit Block „Für das Board".

## Offene Nachweise (§5, Stufe 1)

- `grep -n sanitizeSessionEnv ui/src/server/services/cloud-terminal-manager.ts ui/src/server/utils/session-env.ts` → je ≥ 1 (Code steht, Grep noch nicht als Nachweis zitiert)
- Lock-Inventar-Grep (siehe Schritt 8)
- `grep -n "reportHookContext\|reportDialog" ui/src/server/routes/cloud-terminal.routes.ts ui/src/server/services/cloud-terminal-manager.ts`
- `grep -n TranscriptTailer ui/src/server/services/gespraech-service.ts`
- `grep -n "GespraechHandler\|gespraech:" ui/src/server/websocket.ts` → ≥ 3
- Frontend-Nachweise (`aos-gespraech` in der View, `open-terminal-session` aus dem Kopf) nach Schritt 5
- E2E-Nachweis Run-Skript ohne `CLAUDE_CODE_CHILD_SESSION`

## Umgebung und Hinweise für die nächste Sitzung

- Worktree `../specwright-worktrees/session-sdlc-ui`, `node_modules` in `ui/` und `ui/frontend/` installiert (16.09.); `ui/config/voice-config.json` liegt lokal (gitignored), Sicherung im Scratchpad dieser Sitzung.
- Mess-/E2E-Backend: `cd ui && env -u SPECWRIGHT_CLOUD_SESSION_ID PORT=3111 SPECWRIGHT_RUNTIME_DIR=/tmp/sw-3111 npm run start:backend` (Env-Strip macht jetzt der Manager selbst). Scratch-Projekt `/tmp/scratch-int007` (git init, `specwright/config.yml`), im Backend als Projekt geöffnet (`workspace-3111.json`). tmux-Socket `$TMPDIR/specwright-tmux/specwright-3111.sock`; Sitzungen `cs-cloud-…`. **Trust-Dialog:** Standard „No, exit" → `Down`, `Enter`. Skripte im Scratchpad der Sitzung 1 (`messung.mjs`, `dialoge.mjs`) — nicht im Repo; für die E2E neu aus dem Memory-Rezept bauen.
- Hotfix-Worktree `../specwright-worktrees/hotfix-voice-config` (PR #52) kann nach Merge entfernt werden.
- Beobachtungen, die Stufe 2 betreffen: Ablehnung/Esc des Plan-Dialogs kommt **nur** über das Transkript (kein `PostToolUse`); Mehrfachauswahl: Space **und** Enter schalten um, Abschicken über `Next` → Reiter `Submit` → `Submit answers`.
