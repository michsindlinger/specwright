# Spec Requirements Document

> Spec: Specwright UI Cloud Deployment (geteilter Projekt-Root mit Kompass)
> Created: 2026-05-08
> Status: Planning
> Mode: V2 Lean
> Tier: L

## Overview

Specwright-UI wird als zweite App auf dem bestehenden Kompass-DigitalOcean-Droplet deployed und nutzt ein geteiltes Cloud-Volume `/mnt/shared-projects/` als gemeinsamen Projekt-Root. Damit sehen Specwright-UI und Kompass-Cloud-Agents dieselben Files ohne Git-Pull-Tanz; vom Mac, vom zweiten Laptop und unterwegs erreichbar.

Browser-Auth via Cloudflare Tunnel + Access (Plan-A). Claude-SDK-Auth in der Cloud via Token-Rotator-Pattern aus Kompass. Mac mounted dasselbe Volume für Cursor-IDE-Zugriff (Mount-Tech via R2-Spike entschieden — Default Mutagen-Sync).

## Tasks

Tasks sind in `kanban.json` (V2 Lean, mode="lean"); Detail-Kontext lädt `/execute-tasks` on-the-fly aus `implementation-plan.md` über `planSection`.

- **CLOUD-001** — DigitalOcean Volume provisionieren + Droplet-Mount
- **CLOUD-002** — Env-Var-Path-Config (`SPECWRIGHT_PROJECTS_ROOT`) im Config-Loader
- **CLOUD-003** — Mount-Tech-Spike (R2: SSHFS vs. Mutagen) mit GO/NO-GO-Doku
- **CLOUD-004** — Cloud-Deploy-Skeleton (setup-ui-cloud.sh + systemd-Unit + Frontend-WS-URL)
- **CLOUD-005** — Cloudflare-Tunnel + Access Auth-Layer
- **CLOUD-006** — Token-Rotator-Adapter + Claude-SDK-Spawn `HOME`-Override
- **CLOUD-007** — Mac-Mount-Workflow Setup + Doku (basierend auf Spike-Ergebnis)
- **CLOUD-008** — Cutover-Smoke-Test (5 Projekte, Spec-Anlage, Kanban-Drag, Execute-Tasks)
- **CLOUD-997** — Code Review (System)
- **CLOUD-998** — Integration Validation (System, Full-stack)
- **CLOUD-999** — Finalize PR (System)

## User-Action Tasks

(Nach User-Bestätigung in Step 6.5 ausgefüllt — siehe `kanban.json` `requiresUserAction`-Felder.)

## Spec Scope

- Specwright-UI als systemd-Service auf Kompass-DigitalOcean-Droplet (Vollparität: Chat, Kanban-Drag, Spec-Editing, Execute-Tasks)
- Geteiltes DigitalOcean-Block-Volume `/mnt/shared-projects/` für 5–10 Projekte (~300–400 MB pro Projekt)
- `SPECWRIGHT_PROJECTS_ROOT`-Env-Var-Prefix im Config-Loader (kein Refactor von `project-dirs.ts`)
- Mount-Tech-Spike R2: SSHFS vs. Mutagen-Sync, GO/NO-GO via Indexer-Cold-Open + File-Watcher-Lag
- Mac-Mount des Volumes für Cursor-IDE
- Cloudflare-Tunnel mit Access-Policy auf 1 User-Email (kein eigener Express-Session-Layer)
- Subdomain `specwright.<kompass-hostname>` via Cloudflare-Tunnel; kein öffentlicher DigitalOcean-Inbound
- Token-Rotator-Adapter (Reuse aus `compass/backend/src/server/services/token-rotator.ts`); `HOME`-Override an Claude-SDK-Spawn-Stellen
- Setup-Skript `setup-ui-cloud.sh` (additiv neben `setup-ui.sh`); selbes Repo, kein Branch-Fork
- Frontend-WS-URL relativ statt `localhost:3001` für Cloudflare-Tunnel-Hostname
- Cutover: Cloud-UI als Default-Zugang vom Mac via Browser

## Out of Scope

- Multi-User / Team-Fähigkeit
- Mobile-Responsive UI (Phone/Tablet)
- Tiefere Kompass-Integration (Telegram-Conversations innerhalb Specwright-UI, Agent-Aktivitätsanzeige)
- Migration / Onboarding-Magic (manuelles `git clone` der Projekte ins Volume akzeptiert)
- Backup / Disaster-Recovery / Monitoring (deferred)
- Cross-Machine-Lock-Hardening für `kanban.json` / Git-Index (R1 als Restrisiko V1 akzeptiert; V2 löst via Redis-Lease oder Cloud-only-Schreibrecht)
- Lokale Specwright-UI Auto-Re-Sync nach Fallback (manueller Git-Diff-Workflow akzeptiert)
- Framework-Cloud-Variante für andere Specwright-Nutzer (dein-spezifisches Setup)
- Eigenes Repo / Branch-Fork (Domain-Fit: Framework unverändert, UI-Codepfad bleibt einer)

## Expected Deliverable

- Cloud-Specwright-UI erreichbar an `https://specwright.<kompass-hostname>` mit Cloudflare-Access-Gate (nur User-Email)
- 5–10 Live-Projekte aus dem geteilten Volume sichtbar in Cloud-UI
- Kompass-Agent legt Spec via Telegram an → Spec taucht ohne Git-Pull in Cloud-UI auf
- Mac-Cursor mountet Volume und kann Spec-Files editieren ohne Indexer-Crash
- Claude-Chat in Cloud-UI antwortet (Token-Rotator-Auth funktioniert)
- Mount-Tech-Spike-Ergebnis dokumentiert mit Wahl + Begründung
- Lokale Specwright-UI bleibt als Fallback installierbar und voll funktional (keine Code-Brüche)

## Integration Requirements

> ⚠️ **IMPORTANT:** These integration tests will be executed automatically after all tasks complete.
> They ensure that the complete system works end-to-end, not just individual tasks.

**Integration Type:** Full-stack

- [ ] **Integration Test 1:** systemd-Service läuft auf Droplet
   - Command: `ssh kompass-droplet 'systemctl is-active specwright-ui'`
   - Validates: Cloud-Specwright-UI-Prozess up
   - Requires MCP: no

- [ ] **Integration Test 2:** Cloudflare-Access-Gate vor Backend
   - Command: `curl -sI https://specwright.<kompass-hostname>/ | grep -E 'cf-access|Set-Cookie'`
   - Validates: ungeauthter Browser kriegt Cloudflare-Login-Page (kein Direkt-Zugriff aufs Backend)
   - Requires MCP: no

- [ ] **Integration Test 3:** Geteiltes Volume sichtbar für beide Apps
   - Command: `ssh kompass-droplet 'ls /mnt/shared-projects/ && stat -c "%U %G %a" /mnt/shared-projects/'`
   - Validates: Volume gemountet, Permissions erlauben Read/Write für Specwright-UI- und Kompass-User
   - Requires MCP: no

- [ ] **Integration Test 4:** Browser-Login + Projekt-Liste rendern
   - Command: Playwright-Test (login via Cloudflare-Access, Projekt-Liste sichtbar, ein Projekt öffnet)
   - Validates: End-to-End Auth + UI funktional
   - Requires MCP: yes (Playwright)

- [ ] **Integration Test 5:** Claude-SDK-Auth in Cloud
   - Command: Playwright-Test (Cloud-UI starten, Chat öffnen, Frage senden, Antwort empfangen)
   - Validates: Token-Rotator setzt `HOME` korrekt für Claude-SDK-Subprocess
   - Requires MCP: yes (Playwright)

**Integration Scenarios:**
- [ ] Scenario 1: Kompass-Agent legt Spec an (über Telegram-Konversation) → Specwright-UI im Browser zeigt sie ohne `/clear` und ohne Reload (File-Watcher)
- [ ] Scenario 2: Mac-Cursor öffnet Projekt vom Mount, editiert eine Datei, Specwright-UI in Cloud sieht Änderung beim Refresh
- [ ] Scenario 3: User komplettiert Spec-Erstellung in Cloud-UI (vom zweiten Laptop unterwegs)

**Notes:**
- Tests marked with "Requires MCP: yes" are optional (skip if MCP tool not available)
- Integration validation runs via System Task 998 during execute-tasks
- If integration tests fail, they will be fixed before proceeding

## Spec Documentation

- Implementation Plan: @specwright/specs/2026-05-08-specwright-ui-cloud-deploy/implementation-plan.md
- Requirements Clarification: @specwright/specs/2026-05-08-specwright-ui-cloud-deploy/requirements-clarification.md
- Brainstorming Origin: @specwright/brainstorming/2026-05-08-14-32-specwright-ui-cloud-deploy/session.md
- Kanban (V2 Lean): @specwright/specs/2026-05-08-specwright-ui-cloud-deploy/kanban.json
