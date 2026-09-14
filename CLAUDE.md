# CLAUDE.md — Specwright

> Stand: 2026-09-14 · Firma: SBS · Unter einer Seite halten. Wird jede Sitzung ganz gelesen.

## Projekt in drei Zeilen

Specwright ist das Framework für den AI-native SDLC: Befehle, Workflows, Vorlagen und Hooks, die Installer in Projekte kopieren, plus eine optionale Web-UI. Nutzer ist Michael allein; das Repo ist öffentlich und soll den Ablauf selbst vorleben. Schwerpunkt jetzt: v4 (Vorhaben-Flow) ausrollen, Web-UI später neu denken (Phase 5).

## Befehle

| Zweck | Befehl | Gesunde Ausgabe endet mit |
|---|---|---|
| Alles prüfen (vor jeder Fertigmeldung) | `bash scripts/verify.sh` | `verify: OK` |
| Schnell (ohne UI-Tests) | `bash scripts/verify.sh --fast` | `verify: OK` |
| Lieferumfang gegen Manifest | `bash scripts/check-manifest.sh` | `✅ Manifest: …` |
| Installer gegen lokalen Stand | `bash scripts/test-installers.sh` | `✅ Installer-Test: T1–T5 grün` |
| UI-Tests gegen Bezugsliste | `cd ui && npx vitest run --reporter=json --outputFile=../vitest-results.json; cd .. && node scripts/check-vitest-baseline.mjs vitest-results.json` | `✅ Keine neue rote Testdatei.` |
| UI lokal | `cd ui && npm run dev:backend` (3001) · `cd ui/frontend && npm run dev` (5173) | — |

`verify` = Installer-Syntax, Guards (Manifest, MCP-Launcher), Installer-Test, `CLAUDE.md` ≤ 90 Zeilen, UI-Lint, UI-Builds, Vitest gegen `ui/tests/known-failures.txt`. Dauer ~2 min lokal. CI: `.github/workflows/verify.yml`.

## Verzeichniskarte

- `specwright/` — Werkzeug: `workflows/`, `templates/` (v4: `templates/sdlc/`), `standards/`, `mcp-profiles/`, `scripts/mcp/` (Kanban-MCP), `scripts/install-lib.sh`, **`manifest.tsv`** (Lieferumfang), `removed.tsv` (Entferntes mit Prüfsummen)
- `.claude/commands/specwright/` (23 Befehle) · `.claude/agents/` · `.claude/skills/` · `.claude/hooks/`
- `ui/` — Web-UI: `src/server/` (Express, WS, Auto-Mode), `frontend/src/` (Lit, `aos-*`), `tests/`
- `intent/` — Vorhaben (`intent.md`, `spec.md`, `plan.md`) · `docs/` — Projekt-Docs · `docs/adr/` — ADRs
- Installer im Root: `install.sh`, `setup.sh`, `setup-claude-code.sh`, `setup-devteam-global.sh`, `update-specwright.sh`, `check-update.sh`, `setup-mcp.sh`, `setup-ui.sh`

## Projekt-Docs (lesen, wenn die Aufgabe sie berührt)

- `docs/product-brief.md` — für wen, welches Problem, Domänenbegriffe (Vorhaben, Manifest, Bezugsliste)
- `docs/architecture.md` — **Pflicht im Plan Mode.** Komponenten, Datenbesitz, Regeln AR-01…AR-07, bekannte Abweichungen
- `docs/security.md` — Datenklassen (Repo ist öffentlich!), Geheimnisse, Verbotsliste
- `docs/design.md` — Terminal- und UI-Muster, was „entspricht dem Mock" heißt

## Arbeitsweise

- **Code ist die Wahrheit.** Memory, Docs und diese Datei sind Hinweise; vor jeder Aussage die Datei lesen. **Ideen kritisch prüfen**, Alternativen und Risiken nennen, nicht reflexartig zustimmen.
- Vorhaben laufen als `intent/INT-JJJJ-NNN-kurzname/`: `/intent` → `/spec` → `/plan` → `/build` → PR. Vorlagen: `specwright/templates/sdlc/`. **Bypass:** Bugfix oder unter 1 Tag → `intent.md` (Kern) direkt zu `plan.md`.
- `plan.md` entsteht im Plan Mode und wird vor dem ersten Code committet. Eine Sitzung setzt den ganzen Plan um; Zerlegung nur laut Plan §7, Integration in der Hauptsitzung.
- Verschiebt ein Plan eine Architekturgrenze (AR-nn): `docs/architecture.md` in derselben PR.
- Board `25-Sindlinger-Business-Solutions/Projekte/Specwright/Specwright — Backlog Board.md` (Vault): Karte verweist auf den `intent/`-Ordner; Stand dort nachziehen (Skill `obsidian-po-board`).
- Der lokale Checkout `main` gehört Michael (kann ungestaged sein): Vorhaben in Worktrees unter `../specwright-worktrees/`, Merge nur per PR.

## Konventionen

- **Lieferumfang:** neue Datei → Zeile in `specwright/manifest.tsv` (Art, Geltung, Quelle, Ziel); entfernte Datei → Zeile in `removed.tsv` mit Prüfsumme(n) der letzten Fassung. Kein Installer bekommt eine eigene Liste (AR-01). Bruch nur mit Update-Weg und Versionssprung (`VERSION` = `FRAMEWORK_VERSION` in `install.sh`).
- **Installer:** Bash 3.2-tauglich (kein `mapfile`, keine assoziativen Arrays); Downloads nur über `install-lib.sh` (`curl -f`, `file://` für Tests).
- **Workflows:** Hauptagent führt aus; Utility-Agenten nur für kontextfreie Handgriffe. Vorlagen mit Hybrid-Lookup (Projekt → `~/.specwright`). Platzhalter `[…]`, nie `<…>`.
- **UI:** TypeScript strict, kein `any`; Präfix `aos-`; `projectDir()` statt harter Pfade (AR-04); Lock-Hierarchie `withMainProjectLock` außen, `withKanbanLock` innen (AR-03); Workspace-Zustand im Backend (AR-05); MCP direkt starten, nie `npx` (AR-02).
- **Commits:** Conventional Commits, deutsch erlaubt, Bezug `INT-JJJJ-NNN`. **Docs:** Deutsch, echte Umlaute, MacDown-tauglich (Leerzeile vor Listen, Frontmatter-Zeilen mit zwei Leerzeichen).
- ADR-Pflicht bei: Datenhaltung, Lieferkette (Installer/Manifest), Auth der UI, MCP-Startmodell.

## Definition of Done

`verify: OK` und Ausgabe im PR · PR-Check grün (CI ist die Wahrheit; Bezugsliste nie nach lokalem Lauf kürzen) · jedes AK/FA hat einen Test · Verbindungen aus `plan.md` §5 nachgewiesen · E2E-Pfad läuft · bei UI: Screenshot neben Mock · `architecture.md` aktuell · Abweichungen in `plan.md` §14 · 2x-Regel geprüft · Board nachgezogen.
Schlägt ein Test fehl: Code reparieren, nicht den Test, nicht die Bezugsliste.

## Fehler, die Claude hier schon zweimal gemacht hat

- Installer-Liste ergänzt, aber nicht in allen Skripten (je ein Befehl am 2026-02-27 und am 2026-09-14) → seit 4.0.0 Manifest + Guard; neue Datei ohne Manifest-Zeile bricht `verify`.
- Lokal grün für CI-grün gehalten (Pilot INT-2026-001; Worktree-node-pty) → Bezugsliste nur nach CI-Lauf ändern; im Worktree `chmod +x ui/node_modules/node-pty/prebuilds/*/spawn-helper` nach `npm ci`.

## Hooks aktiv (`.claude/settings.json`)

`protect-tests` (Testdateien im Fix-Modus, `ui/tests/known-failures.txt` immer gesperrt) · `no-secrets` (Commit mit Secret-Muster blockiert) · `production-gate` (Befehle mit `deploy`+`prod` nur mit `RELEASE_APPROVAL`)

## Nie

- Update-Läufe auf `main` eines fremden Projekts oder auf dem Cloud-Host ohne Freigabe; Merge nach `main` löst den Auto-Deploy der UI aus — Merge ist Michaels Schritt.
- Tests löschen, Bezugsliste kürzen, Auth lockern, damit etwas grün wird.
- Hostnamen, Pfade, Nutzer, Ports des Cloud-Hosts oder Tokens ins Repo (öffentlich).
- Dateien im Repo-Root anlegen außer den in der Verzeichniskarte genannten.
