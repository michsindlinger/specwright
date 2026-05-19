# Implementation Plan: Specwright UI Cloud Deployment (geteilter Projekt-Root mit Kompass)

> **Status:** PENDING_USER_REVIEW
> **Spec:** specwright/specs/2026-05-08-specwright-ui-cloud-deploy/
> **Erstellt:** 2026-05-08
> **Basiert auf:** requirements-clarification.md
> **Mode:** V2 Lean (Plan IS the spec)

---

## Executive Summary

Specwright-UI wird als zweite App auf dem bestehenden Kompass-DigitalOcean-Droplet deployed und nutzt ein geteiltes Cloud-Volume als gemeinsamen Projekt-Root. Damit sind Spec-Erstellungen und Kanban-Updates aus Kompass-Cloud-Agents ohne Git-Pull-Tanz sofort in der Specwright-UI sichtbar — vom Mac, vom zweiten Laptop und unterwegs erreichbar.

---

## Architektur-Entscheidungen

### A1. Auth-Wahl — **Empfehlung: Cloudflare Tunnel + Cloudflare Access (Google IdP)**

**Trade-off-Analyse:**
- Google OAuth (Kompass-Reuse, passport-google-oauth20): hohe Code-Reuse aus `compass/backend/src/server/routes/auth-routes.ts`, aber bedingt eigene Express-Session-Infrastruktur in Specwright-UI (aktuell sessionless), öffentlichen DNS-Endpoint, TLS-Cert-Management.
- Cloudflare Tunnel + Access: kein eigener Auth-Code in Specwright-UI nötig, Auth wird vor dem App-Layer terminiert; Google-IdP via Cloudflare-Access-Policy (1 User-Email als Allowlist); kein öffentlicher DNS/TLS-Aufwand; SPOF wird auf Cloudflare verlagert (akzeptabel).

**Empfehlung:** Cloudflare Tunnel + Access. Begründung: minimal-invasiv (kein Code-Patch in `ui/src/server/index.ts` außer Trust-Proxy + optionalem Header-Read für identity), schnellster Time-to-V1, keine Session-Layer-Einführung. Trade-off: Cloudflare als Dependency hinzu (Kompass nutzt es bereits laut Brainstorming — keine neue Plattform).

**Offene Implementierungs-Frage (User-Review):** Ob der vorhandene Kompass-Reverse-Proxy schon Cloudflare-fronted ist; falls Kompass eigene Domain mit Let's Encrypt fährt, könnte aus Konsistenz-Gründen Google OAuth via Reuse präferiert sein. Plan-Default = Cloudflare; User-Override möglich.

### A2. Mount-Technologie — **Default-Empfehlung: Mutagen-Sync (kein Live-Mount), Spike pflicht**

**Trade-off-Analyse:**
- SSHFS: einfach, aber langsam für `node_modules` (Zehntausende Dateien, FUSE-Overhead) — R2 hochgradig real.
- S3FS: nicht geeignet (Object-Storage-Semantik, keine POSIX, kein Locking).
- NFS über Tailscale/WireGuard: schneller als SSHFS bei sequenziellem I/O, aber Indexer-Performance bei vielen kleinen Dateien immer noch fragwürdig.
- Tailscale-Share (Taildrive): zu neu, unklare Performance unter Indexer-Last.
- **Mutagen-Sync** (bidirektional, lokaler Cache): kein Live-Mount → Cursor liest lokale SSD-Geschwindigkeit, Sync läuft im Hintergrund. Trade-off: nicht „echter Mount", aber R2 wird strukturell gelöst statt hinhoffend.

**Empfehlung:** Spike R2 bewertet **(a) SSHFS** und **(b) Mutagen-Sync** an einem realistischen Projekt mit `node_modules` (eines der 5–10 Live-Projekte). Metriken: Cursor-Indexer-Time (Cold-Open), File-Watch-Latenz für Specwright-UI-Refresh (Edge-Case "Kompass schreibt während User Spec offen hat").

**GO/NO-GO-Kriterium:** Indexer-Cold-Open < 60s und File-Watcher-Lag < 5s = SSHFS-GO. Sonst Mutagen-Sync. Falls Spike inkonklusiv: Default Mutagen-Sync.

**Konsequenz für R6 (Re-Sync):** Mutagen hat eingebaute Konfliktbehandlung; SSHFS hat keine — bei Mutagen ist R6 teilweise gemildert.

**Spike-Ergebnis (2026-05-10) — Mutagen-mit-ignore GO:**
- Initial-Sync: 85 s (1.1 GB lokal, mit `--ignore=node_modules,.git --ignore-vcs`)
- M1 Cold-Open + UI-Responsiveness: subjektiv flüssig (Cursor + `cmd+P` + Search ohne Lag)
- M3 Watcher-Lag (Cloud→Mac): < 1 s
- M4 Edit-Roundtrip (Mac→Cloud): wenige Sekunden
- SSHFS: NO-GO (operativ — macFUSE-Recovery-Reboot blockiert Setup auf Apple Silicon)

**Finale Mutagen-Sync-Konfiguration (MANDATORY — siehe CLOUD-BUG-001 für Hintergrund):**

```bash
mutagen sync create --name=specs-shared \
  --ignore=node_modules,.git --ignore-vcs \
  --default-owner-beta=id:100 \
  --default-group-beta=id:102 \
  --default-file-mode-beta=0660 \
  --default-directory-mode-beta=0770 \
  ~/cloud-mount-mutagen \
  root@<droplet-ip>:/mnt/shared_projects
```

Die Beta-Side-Overrides sind **Pflicht**. Ohne sie schreibt Mutagen-Portable-Mode Files als `root:root 600/700` auf der Droplet, was Compass-Container (compass:compass UID 100/GID 102) den Read-Access verweigert. Setgid (2775) auf Volume-Root reicht nicht — Mutagen überschreibt Group-Inheritance. **Konsequenz für CLOUD-007:** Mac-Mount-Workflow-Doku muss exakt dieses Command enthalten, kein Minimal-Sync.

### A3. Volume-Topologie — **Empfehlung: neues, geteiltes DigitalOcean Block-Volume**

**Trade-off:** Erweiterung des bestehenden Kompass-Volumes spart eine Volume-Charge, koppelt aber Lifecycle (Resize/Snapshot/Detach betrifft beide Apps). Neues Volume = saubere Abgrenzung, klare Pfad-Konvention `/mnt/shared_projects/`, Kompass kann das Volume zusätzlich mounten ohne Eigentumsfrage.

**Empfehlung:** Neues Volume `/mnt/shared_projects/`, Konvention pro Projekt `/mnt/shared_projects/<project-slug>/` (entspricht aktueller Specwright-UI-Konvention "Projekt-Root mit `specwright/` und `.specwright/` Unterordnern").

**Real-World-Update (2026-05-09):** Kompass speichert Projekte aktuell in einem Docker-named-Volume `compass_git-repos` (Container-intern unter `/repos`, Host-Pfad `/var/lib/docker/volumes/compass_git-repos/_data`, 9 Projekte / 4.6 GB). Migration in das neue Shared Volume = Docker-named-volume → Bind-Mount-Wechsel mit Container-Restart und UID-Mapping-Check. **Eigene Task:** `CLOUD-001b` (siehe kanban.json). Trade-off: Kompass-Downtime ~5 min vs. echtes Single-Source-of-Truth. Akzeptiert.

### A4. Repo-/Branch-Strategie — **Empfehlung: gleiches Repo, eigener Build/Deploy-Pfad, kein Branch-Fork**

**Trade-off:** Eigenes Repo isoliert Cloud-Variante, doppelt aber Maintenance (Bug-Fix in `ui/src/server/` muss zweimal gemerged werden). Branch-Fork hat Drift-Risiko. Domain-Fit aus Brainstorming: „Specwright-Framework bleibt unverändert" — bezieht sich auf das *Framework* (workflows/templates/standards), nicht auf den UI-Source-Code.

**Empfehlung:** Selbes Repo, **kein** neuer Branch. Cloud-spezifische Aspekte als **Konfig-/Env-Layer** (siehe A6) und neue Setup-Skript-Datei `setup-ui-cloud.sh`. Code-Diff zwischen lokal und cloud bleibt minimal: Path-Resolver + Auth-Middleware-Hook + Service-Unit. Begründung: ein UI-Codepfad, keine Backward-Compat-Risiken (User selbst hat Cloud nicht aktiv) — und Bug-Fixes laufen für beide Modi gleichzeitig durch.

### A5. Reverse-Proxy / Public URL — **Empfehlung: Subdomain unter Kompass-Hostname, via Cloudflare-Tunnel**

**Empfehlung:** `specwright.<kompass-hostname>` als Cloudflare-Tunnel-Hostname (kein öffentlicher DigitalOcean-Inbound für UI nötig). Cloudflare Access Policy = 1 User-Email. Specwright-UI hört auf Loopback-Port (z.B. 3001), nur Cloudflare-Daemon spricht den Port an.

### A6. Pfad-Konfig-Strategie — **Empfehlung: Env-Var-Override `SPECWRIGHT_PROJECTS_ROOT`, optional config.json-Feld als Fallback**

**Status quo:** `ui/src/server/utils/project-dirs.ts` arbeitet mit absoluten Projekt-Pfaden, die aus `ui/config.json` (Liste der Projekte) stammen. `projectDir()` und `projectDotDir()` nehmen diesen absoluten Pfad als Argument.

**Empfehlung:** Kein Refactor von `project-dirs.ts` nötig. Stattdessen:
- Env-Var `SPECWRIGHT_PROJECTS_ROOT=/mnt/shared_projects` definiert Cloud-Root.
- Bei Projekt-Add (UI „Open Project") wird der Pfad relativ zu diesem Root gespeichert in `config.json`.
- Lokal bleibt `SPECWRIGHT_PROJECTS_ROOT` ungesetzt → existing Verhalten unverändert.
- Trade-off: kleinste Code-Surface, keine Schema-Migration in `config.json`, keine Risiko-Brüche für lokale User.

**Konsequenz:** Setup-Skript für Cloud-Variante setzt die Env-Var in der systemd-Unit; Mac-Cursor öffnet Projekt-Files direkt am Mount-Pfad (Cursor braucht keine Specwright-UI-Config-Awareness).

### A7. Lokales Specwright-UI Fallback-Signaling — **V1: keine Änderung, lokale UI bleibt voll funktional**

**Empfehlung:** Lokale UI bleibt unverändert. Kein Banner, kein Read-Only-Modus, kein Cloud-Reachability-Check. Begründung: V1-Scope schmal halten, R6 (Re-Sync) ist explizit als manueller Workflow akzeptiert. User-Verantwortung, lokal nur bei echtem Cloud-Down zu nutzen.

**V2-Hinweis:** Cloud-Reachability-Probe + UI-Banner „Cloud läuft — lokale Änderungen sind separate Welt" wäre die saubere Erweiterung; nicht in V1.

---

## Komponenten-Übersicht

### Neue Komponenten

| Komponente | Typ | Verantwortlichkeit |
|------------|-----|-------------------|
| `setup-ui-cloud.sh` | Shell-Setup | Provisioniert Specwright-UI als systemd-Service auf Kompass-Droplet, setzt `SPECWRIGHT_PROJECTS_ROOT`, registriert Cloudflare-Tunnel-Route |
| `cloud-deploy/specwright-ui.service` | systemd Unit | Service-Definition mit Restart-Policy, Env-Vars, User-Context |
| `cloud-deploy/cloudflared-config.yml` | Cloudflare-Konfig | Tunnel-Hostname → Loopback-Port-Mapping; Access-Policy via Dashboard |
| Token-Rotator-Adapter (UI-side) | TS-Modul | Dünne Adapter-Schicht über Kompass-`token-rotator.ts`-Pattern; setzt `HOME` für Claude-Code-SDK-Subprocess |
| Mount-Workflow-Doku | Markdown (specwright/docs/) | Schritt-für-Schritt Mac-Mount-Setup (basierend auf Spike-Ergebnis) |
| Cloud-Volume-Konvention | Filesystem-Layout | `/mnt/shared_projects/<project>/` mit `specwright/`, `.specwright/`, `.git/` |

### Zu ändernde Komponenten

| Komponente | Änderungsart | Grund |
|------------|--------------|-------|
| `ui/src/server/index.ts` | Erweitern (minimal) | Trust-Proxy aktivieren falls hinter Cloudflare; optional Health-Probe-Endpoint absichern |
| `ui/config.json`-Lade-Logik | Erweitern | Pfad-Auflösung über `SPECWRIGHT_PROJECTS_ROOT`-Prefix wenn gesetzt |
| Claude-SDK-Spawn-Stelle (in `services/cloud-terminal-manager.ts` und/oder `claude-handler.ts`) | Erweitern | `HOME`-Env aus Token-Rotator setzen, sonst keine SDK-Auth in Cloud |
| `setup-ui.sh` | Erweitern (additiv) | Verweis auf `setup-ui-cloud.sh` für Cloud-Modus, lokal unverändert |
| Frontend Vite-Build (`ui/frontend/`) | Minimal-Anpassung | WebSocket-URL relativ statt hardcoded `localhost:3001`, sodass Cloudflare-Tunnel-Hostname funktioniert |

### Nicht betroffen (explizit)

- Specwright-Framework (workflows/, templates/, standards/) — bleibt unverändert (Domain-Fit-Entscheidung).
- MCP-Server-Subprocess (`specwright/scripts/mcp/`) — läuft im Droplet exakt wie lokal, single-machine-Lock-Semantik bleibt.
- Kompass-Anwendung — keine Änderungen, nur Pfad-Konvention zum Volume muss matchen.
- Lokale Specwright-UI-Installation — Fallback-fähig ohne Code-Änderung.
- Telegram-Adapter (Kompass-eigen).
- `withKanbanLock` / `withMainProjectLock` — strukturell unverändert (R1 als Restrisiko akzeptiert).

---

## Komponenten-Verbindungen (KRITISCH)

| Source | Target | Verbindungsart | Story-Kandidat | Validierung |
|--------|--------|----------------|----------------|-------------|
| `setup-ui-cloud.sh` | systemd-Unit | erzeugt Service-Datei, lädt sie | Story 1: Cloud-Deploy-Skeleton | `systemctl status specwright-ui` |
| systemd-Unit | `ui/src/server/index.ts` (Node-Process) | startet Prozess, übergibt Env-Vars | Story 1 | `journalctl -u specwright-ui` |
| Env-Var `SPECWRIGHT_PROJECTS_ROOT` | config.json-Pfad-Resolver | Prefix-Auflösung pro Projekt-Eintrag | Story 2: Volume + Path-Config | grep für Env-Read in config-Loader |
| `/mnt/shared_projects/` (Volume-Mount) | `projectDir()` / `projectDotDir()` (via konfigurierter Project-Path) | Filesystem-Read/Write | Story 2 | `ls /mnt/shared_projects` auf Droplet, Specwright-UI listet Projekte |
| Kompass-Agent-Filesystem-Schreiber | `/mnt/shared_projects/<project>/specwright/` | direkter FS-Write | Story 2 | Spec aus Kompass-Konversation taucht in Specwright-UI auf, ohne Git-Pull |
| Cloudflare-Tunnel | Loopback `:3001` (Specwright-UI) | TCP-Forward, TLS-Termination außerhalb | Story 1 + Story 4: Auth-Layer | Browser-Login an Subdomain → Specwright-UI |
| Cloudflare-Access-Policy | Browser-Request | Auth-Gate vor Backend | Story 4 | nicht eingeloggter Browser kriegt Cloudflare-Login-Page |
| Token-Rotator-Adapter | Claude-Code-SDK-Subprocess (`cloud-terminal-manager.ts` / `claude-handler.ts`) | setzt `HOME=<token-profile-dir>` vor spawn | Story 5: Claude-SDK-Auth | Funktionstest: Claude-Chat in Cloud-UI antwortet |
| Mac-Mount-Tool (Mutagen oder SSHFS) | Mac-Cursor-Filesystem | präsentiert Cloud-Volume als lokalen Pfad | Story 3 + Spike-R2 | Cursor öffnet `<projekt>` und kann Spec editieren |
| Specwright-UI File-Watcher (existing) | `/mnt/shared_projects/<project>/` | erkennt externe Schreiber | Story 2 | Edge-Case: Kompass schreibt Spec → UI zeigt sofort |

**Verbindungs-Checkliste:**
- [x] Jede neue Komponente hat mindestens eine Verbindung — geprüft, keine Orphans.
- [x] Jede Verbindung ist einem Story-Kandidat zugeordnet.
- [x] Validierungen sind beobachtbar / ausführbar.

---

## Umsetzungsphasen

### Phase 1: Volume + Path-Config-Foundation
**Ziel:** Cloud-Volume provisioniert, Pfad-Resolver versteht Env-Var-Prefix, Kompass-Projekte ins Shared Volume migriert.
**Komponenten:** DigitalOcean-Volume, `/mnt/shared_projects/`, `SPECWRIGHT_PROJECTS_ROOT`-Env-Read in config-Loader, Kompass-`docker-compose.yml`-Bind-Mount.
**Tasks:** CLOUD-001 (Volume + Mount + Perms, ✅ done 2026-05-09), CLOUD-001b (Kompass `compass_git-repos` Docker-volume → Bind-Mount-Migration), CLOUD-002 (Specwright-UI Path-Config).
**Abhängig von:** Nichts.

### Phase 2: Mount-Tech-Spike (R2)
**Ziel:** Empirische Entscheidung SSHFS vs. Mutagen-Sync.
**Komponenten:** Test-Setup mit einem realistischen Projekt inkl. `node_modules`.
**Abhängig von:** Phase 1 (Volume existiert).
**Exit-Kriterium:** GO/NO-GO laut A2-Kriterium dokumentiert; Default Mutagen-Sync wenn unklar.

### Phase 3: Cloud-Deploy-Skeleton
**Ziel:** Specwright-UI läuft als systemd-Service auf Droplet, hört auf Loopback-Port, liest aus Volume.
**Komponenten:** `setup-ui-cloud.sh`, `specwright-ui.service`, Build-Pipeline angepasst.
**Abhängig von:** Phase 1.

### Phase 4: Auth-Layer (Cloudflare-Tunnel + Access)
**Ziel:** Browser-Auth-Gate vor Specwright-UI; nur User-Email darf rein.
**Komponenten:** `cloudflared`-Daemon-Config, Cloudflare-Access-Policy via Dashboard, optional Trust-Proxy in Express.
**Abhängig von:** Phase 3.

### Phase 5: Claude-SDK-Token-Rotator-Integration
**Ziel:** Claude-Code-SDK-Calls aus Cloud-Specwright-UI authentifizieren via Token-Rotator-Pattern.
**Komponenten:** Token-Rotator-Adapter (Reuse aus Kompass), Spawn-Stellen in UI für `HOME`-Override.
**Abhängig von:** Phase 3.

### Phase 6: Mac-Mount-Workflow + Cursor-Verifikation
**Ziel:** Mac-User mountet Cloud-Volume per gewählter Tech, öffnet Projekt in Cursor, editiert.
**Komponenten:** Mount-Setup-Doku, Cursor-Test mit Live-Projekt.
**Abhängig von:** Phase 2 (Tech-Wahl), Phase 1 (Volume).

### Phase 7: Cutover (Cloud als Default)
**Ziel:** User wechselt täglichen Workflow auf Cloud-UI; lokale UI nur Fallback.
**Komponenten:** Smoke-Test (5 Projekte, Spec-Anlage, Kanban-Drag, Execute-Tasks).
**Abhängig von:** Phasen 1–6.

---

## Abhängigkeiten

```
Phase 1 (Volume + Path) ──> Phase 2 (Mount-Spike) ──> Phase 6 (Mac-Mount)
       │                                                       ▲
       └─> Phase 3 (Deploy-Skeleton) ──> Phase 4 (Auth) ──┐    │
                                       └─> Phase 5 (SDK-Auth) ─┴──> Phase 7 (Cutover)
```

**Kritisch:** Phase 6 darf NICHT vor Phase 2 starten — Tech-Wahl ist Voraussetzung.

**Externe Abhängigkeiten:**
- Cloudflare-Account (existiert bei Kompass).
- DigitalOcean-Volume-Quota.
- `cloudflared` als Droplet-Binary.
- (bei Spike-GO) Mutagen-Binary lokal+remote.

---

## Risiken & Mitigationen

| Risiko | W'keit | Impact | Mitigation |
|--------|--------|--------|------------|
| **R1** Cross-Machine-Race auf `kanban.json`/Git-Index (Cloud-UI, Kompass-Agent, Mac-via-Mount) | Niedrig (Single-User, selten parallel) | Mittel (Datenkorruption möglich) | **V1 akzeptiert** (Brainstorming-Entscheidung). Doku-Hinweis im Mount-Workflow: „Mac-Cursor schreibt nur, wenn Cloud-UI nicht aktiv editiert dieselbe Datei". Restrisiko-Eintrag im Plan. **V2:** Redis-Lease oder Cloud-only-Schreibrecht für `kanban.json`. |
| **R2** Mount-Performance (Cursor + node_modules) | Mittel-Hoch | Hoch (Workflow unbenutzbar) | **MITIGATED (2026-05-10):** Spike CLOUD-003 ergab Mutagen-mit-ignore GO (M1 flüssig, M3 < 1 s, 1.1 GB lokal). SSHFS NO-GO (macFUSE-Recovery-Reboot blockiert). |
| **R9** Cross-Machine-Ownership-Drift via Sync-Tool (CLOUD-BUG-001) | Hoch (default), Niedrig (mit Mitigation) | Hoch (Cloud-Agents blind, 30%+ Codebasis nicht lesbar) | **Pflicht:** Mutagen-Sync mit `--default-owner-beta=id:100 --default-group-beta=id:102 --default-file-mode-beta=0660 --default-directory-mode-beta=0770`. Setgid-2775 auf Volume-Root reicht nicht (Mutagen-Portable überschreibt). Beta-Overrides in CLOUD-007 Mac-Mount-Workflow-Doku mandatory dokumentiert. |
| **R10** Git-State-Divergence Mac↔Droplet (CLOUD-BUG-002) | Hoch (default), 0 (mit Mitigation) | Mittel-Hoch (Cloud-Agents arbeiten auf altem Stand, reproduzierbares Branch/HEAD-Chaos) | **Policy: Cloud-`.git` ist Source-of-Truth.** Mutagen ignoriert `.git/` (richtig, Lock-Korruption-Schutz). Mac-`.git` wird komplett entfernt — Cursor edits Files via Mutagen-Mount, alle Git-Ops (commit/pull/push/checkout) ausschließlich Cloud-side via Compass-Container oder SSH. Pilot dein-rueckhalt.de done 2026-05-14; andere 8 Projekte folgen. Salvage-Check-One-Liner Pflicht vor jedem `.git`-Delete. |
| **R5** SPOF Droplet-Down | Niedrig | Hoch (alles weg) | Lokale Specwright-UI-Installation bleibt installierbar (A7). Manueller Recovery: User clont aus Git, arbeitet lokal weiter. **Doku** des Recovery-Workflows als Story-Acceptance. **Backup/DR/Monitoring deferred** (V1-Scope). |
| **R6** Re-Sync nach Lokal-Fallback | Mittel | Niedrig-Mittel | Manueller Git-Diff-basierter Reconciliation-Workflow. Bei Mutagen-Wahl strukturell gemildert. **V1 akzeptiert manuell.** |
| **Auth-Bypass** | Niedrig (mit Cloudflare-Access) | Hoch (Code-Execution) | Cloudflare-Access-Policy Pflicht-Gating, kein Public-Mode. Als Story-Acceptance: nicht eingeloggter Browser kriegt 403 vor jedem Request. |
| **Stale-Content-Edge-Case** (Kompass schreibt Spec während User offen hat) | Mittel | Niedrig (UX-Verwirrung) | Existierende UI-Refresh-Mechanik (File-Watcher) verifizieren in Phase 7-Smoke-Test. Falls Mount-Tech File-Events nicht propagiert: Polling-Fallback im UI-Watcher (V2). |
| **Token-Rotator-Mismatch UI vs. Kompass** | Niedrig | Mittel | Phase 5 dediziert; bei Adaption statt 1:1-Reuse: Diff zur Kompass-Variante dokumentieren. |
| **Cloudflare als neue Dependency** | Niedrig | Mittel | Falls User Google-OAuth präferiert (siehe A1 offene Frage): Plan-B passport-google-oauth20 ist isoliert auf Phase 4 erweiterbar (Express-Session + Routes), Code-Aufwand +1 Tag. |

---

## Self-Review Ergebnisse

### Validiert
- Alle 5 Open Questions aus Clarification adressiert (A1–A5).
- Pfad-Resolver-Strategie (A6) ist minimal-invasiv: kein Refactor an `project-dirs.ts`.
- R1 wird nicht erzwungen (entspricht Brainstorming-Entscheidung).
- Mount-Spike ist konkret messbar (Indexer-Time, Watcher-Lag).
- Token-Rotator-Reuse ist klar als „Adapter über Kompass-Pattern" definiert.

### Identifizierte Probleme & Lösungen
| Problem | Ursprünglicher Plan | Verbesserung |
|---------|---------------------|--------------|
| Existing UI hat keine Express-Session — Google-OAuth-Reuse hätte invasive Session-Layer-Einführung erfordert | OAuth via Reuse | Cloudflare-Tunnel + Access verlagert Auth aus dem App-Layer; OAuth bleibt als Plan-B |
| `project-dirs.ts` als Single-Point-of-Refactor | Patch des Resolvers | Stattdessen Env-Var-Prefix beim config-Load; Resolver bleibt unverändert |
| Mount-Tech als „eine offene Frage" | Stelle einen Plan | Spike mit konkretem GO/NO-GO + Default — keine Hängepartie |
| Frontend WebSocket-URL hardcoded | unklar ob Problem | Aktiv prüfen in Phase 3 (Cloudflare-Tunnel-Hostname statt localhost) |

### Offene Fragen (für User-Review)
- **A1:** Ist der Kompass-Reverse-Proxy bereits Cloudflare-fronted? (Beeinflusst Default-Auth-Wahl marginal.)
- **A2:** Akzeptiert User „nicht-Live-Mount" (Mutagen-Sync) als Default falls Spike SSHFS disqualifiziert? (Implizite Annahme im Plan.)
- **R5:** Ist „manueller Git-Recovery" ohne automatisches Backup für die V1-Risiko-Toleranz wirklich OK? (Brainstorming sagt ja — bestätigen.)

### Kollegen-Review-Check (no-orphan, requirement-coverage)
- [x] Alle 5 vorgeschlagenen User Stories aus Clarification haben mindestens eine Komponenten-Verbindung.
- [x] Alle Functional Requirements (Vollparität, Default-Cloud-Zugang, Volume-Sharing, Mac-Mount, Git-only-cloud, Browser-Auth, SDK-Auth, 5–10 Projekte) sind in Phasen abgedeckt.
- [x] Alle deferred Items bleiben deferred (Multi-User, Mobile, Kompass-Deeptie, Migration-Magic, Backup/DR, Cross-Machine-Lock-Hardening, Auto-Re-Sync, Framework-Cloud-Variante).
- [x] Keine orphan Komponenten (jede neue Komponente hat ≥1 Verbindung).

---

## Minimalinvasiv-Optimierungen

### Wiederverwendbare Elemente gefunden

| Element | Gefunden in | Nutzbar für |
|---------|-------------|-------------|
| Token-Rotator-Pattern (Health-Tracking, Pause-Until, Multi-Profile) | `compass/backend/src/server/services/token-rotator.ts` | Story 5 — Adapter statt Neuentwicklung |
| `withKanbanLock` (mkdir-atomic, cross-process) | `ui/src/server/utils/kanban-lock.ts` | Single-Machine-Schutz auf Droplet bleibt aktiv (Cloud-UI ↔ MCP-Subprocess) |
| `withMainProjectLock` (intra-process) | `ui/src/server/utils/main-project-mutex.ts` | Cloud-Specwright-UI verwendet weiterhin; same-machine-Schutz |
| `ui/src/server/services/preview-watcher.service.ts` | UI File-Watcher | Stale-Content-Edge-Case für Kompass-Schreiber |
| Setup-Skript-Pattern | `setup-ui.sh` | Template für `setup-ui-cloud.sh` |
| Cloudflare-Tunnel-Pattern (vermutlich) | Kompass-Infra | Identisches Pattern, nur zweiter Tunnel-Hostname |
| Passport-Google-OAuth | `compass/backend/src/server/auth/passport-config.js` + `routes/auth-routes.ts` | Plan-B falls Cloudflare-Access nicht gewählt |

### Optimierungen

| Ursprünglich | Optimiert zu | Ersparnis |
|--------------|--------------|-----------|
| Eigenes Repo / Branch-Fork | Selbes Repo + Env-Layer + dediziertes Setup-Skript | 50% weniger Maintenance, kein Drift |
| Refactor `project-dirs.ts` für Cloud-Pfad-Logik | Env-Var-Prefix beim config-Load | Null Code-Änderung im Resolver |
| Express-Session + Passport-Google für Auth | Cloudflare-Tunnel + Access | Keine Session-Layer-Einführung in UI |
| Live-Mount via SSHFS verpflichtend | Spike + Mutagen-Sync als Default | R2 strukturell statt hinhoffend gelöst |
| Cross-Machine-Lock implementieren | Restrisiko V1 akzeptieren (Brainstorming) | Spart V1-Engineering-Aufwand komplett |

### Feature-Preservation bestätigt
- [x] Vollparität (Chat, Kanban-Drag, Spec-Editing, Execute-Tasks): Cloud-UI ist derselbe Code → automatisch Parität.
- [x] Cloud als Default-Zugang vom Mac: Browser → Cloudflare-Tunnel-URL → erfüllt.
- [x] Geteiltes Volume: Phase 1 + 2.
- [x] Mac-Mount für Cursor: Phase 6 + Spike-Ergebnis.
- [x] Git-only-cloud-Policy: Doku im Mount-Workflow + R1-Hinweis.
- [x] Browser-Auth Pflicht: Phase 4 (Cloudflare-Access).
- [x] Claude-SDK via Token-Rotator: Phase 5.
- [x] 5–10 Projekte: Volume-Sizing in Phase 1.
- [x] Single-User: Cloudflare-Access-Policy auf 1 Email.

---

## Nächste Schritte

Nach Genehmigung dieses Plans (V2 Lean):
1. Step 2.6-lean: Tasks direkt in `kanban.json` generieren mit `planSection`-Referenzen auf diese Phasen/Architektur-Entscheidungen.
2. Step 4: Spec ready for `/execute-tasks`.
