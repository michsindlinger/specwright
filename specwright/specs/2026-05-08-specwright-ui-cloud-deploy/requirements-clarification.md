# Requirements Clarification - Specwright UI Cloud Deployment (geteilter Projekt-Root mit Kompass)

**Created:** 2026-05-08
**Status:** Pending User Approval

## Feature Overview
Specwright-UI wird auf demselben DigitalOcean-Droplet wie die bestehende Kompass-Anwendung deployed und greift via geteiltem Cloud-Volumen auf dieselben Projekt-Files zu wie Kompass-Agents. Damit sind Spec-Erstellungen und Kanban-Updates aus Kompass-Agent-Aufrufen ohne Git-Pull-Tanz sofort in der Specwright-UI sichtbar — und vom Mac, vom zweiten Laptop oder unterwegs erreichbar.

## Target Users
Single-User: Michael Sindlinger. V1 ist explizit nicht team- oder multi-user-fähig. Auch keine Mobile-/Tablet-Bedienung in V1.

## Business Value
- **Suppressed-Demand-Entfesselung:** Aktuell delegiert der User wenig Spec-Arbeit an Kompass-Cloud-Agents, weil der manuelle Sync-Zyklus (push → pull → Konfliktrisiko → review) auf der Empfangsseite Aufwand verursacht. Erwartete Häufigkeit nach Fix: 20–30 Spec-Zyklen/Tag (statt aktuell wenigen).
- **Game-Changer-Signal:** Ein konstant gut gefülltes Backlog-Dashboard mit umsetzungsbereiten Specs aus Cloud-Agent-Arbeit. Brainstorming + Spec-Erstellung wandern primär in Telegram-Konversationen mit Kompass-CEO-Agents.
- **Mobility:** Specwright-UI von überall via Browser bedienen, nicht mehr Mac-gebunden.

## Functional Requirements
- Cloud-Specwright-UI mit **Vollparität** zur lokalen UI: Chat mit Claude, Kanban-Drag, Spec-Editing, Execute-Tasks.
- Cloud-Specwright-UI ist **Default-Zugang** auch vom Mac (Browser → Cloud-UI). Lokale UI nur Fallback bei Cloud-Down/offline.
- **Geteiltes Cloud-Volumen** zwischen Specwright-UI und Kompass im selben Droplet. Beide Apps lesen/schreiben dieselben Projekt-Roots.
- **Mac-Mount** des Cloud-Volumens, sodass Cursor (lokale IDE) dieselben Projekt-Files öffnen kann (für tiefes File-Editieren).
- **Git-Operationen ausschließlich cloud-side** (Specwright-UI cloud + Kompass-Agents). Mac via Cursor *editiert* nur, committet nicht.
- **Browser-Auth** für Cloud-Specwright-UI: Single-User via Google OAuth (Reuse aus Kompass) ODER Cloudflare Tunnel — finale Wahl in Spec-Phase.
- **Claude-SDK-Auth** in der Cloud via Token-Rotator-Pattern, wiederverwendet aus Kompass `backend/src/server/services/token-rotator.ts`.
- Specwright-UI-Cloud-Instanz unterstützt 5–10 Projekte à ~300–400 MB auf dem geteilten Volumen.

## Affected Areas & Dependencies
- **Specwright-UI Backend** (`ui/src/server/`) — Pfad-Konfiguration auf Cloud-Volumen-Root umstellen, Auth-Layer ergänzen, Deploy-Skript erweitern.
- **Specwright-UI Frontend** (`ui/frontend/`) — keine bzw. minimale Änderung; Cloud-Origin/Tunnel-Routing in Vite-Build berücksichtigen.
- **Specwright-MCP-Server** — bleibt Subprocess der Specwright-UI; läuft im Droplet mit derselben Single-Machine-Lock-Semantik (`withKanbanLock`, `withMainProjectLock`).
- **Kompass-Cloud-Anwendung** (eigenes Projekt, eigenes Repo) — keine Änderungen, aber Pfad-Konvention zum geteilten Volumen muss mit Specwright-UI-Konfig matchen.
- **Kompass `token-rotator.ts`** — Pattern-Referenz; ggf. Code-Reuse oder Adaption.
- **DigitalOcean-Infrastruktur** — Droplet-Skalierung optional, neues Volume oder Erweiterung des bestehenden, Reverse-Proxy-Eintrag.
- **Telegram-Adapter** (Kompass) — eigener Kanal, bleibt unberührt.
- **Cursor / lokale IDE auf Mac** — Mount-Workflow neu (Technologie noch offen: SSHFS / S3FS / NFS / Tailscale-Share).
- **Lokale Specwright-UI-Installation** — bleibt installierbar als Fallback; signalisiert ggf. Read-Only oder „Cloud läuft"-Modus (ggf. später).

## Edge Cases & Error Scenarios
- **R2 — Mount-Performance Mac↔Cloud:** Cursor öffnet ein Projekt mit `node_modules` (Zehntausende Files) über das gemountete Cloud-Volumen. Risiko: IDE-Indexer kriecht, evtl. unbenutzbar. **Erwartete Behandlung:** Spike zur Mount-Technologie (SSHFS / S3FS / NFS / Tailscale) bewertet Latenz + Indexer-Performance vor Festlegung.
- **R5 — Single Point of Failure (Droplet down):** Cloud-UI weg, Files weg, Cursor-Mount weg. **Erwartete Behandlung:** lokaler Specwright-UI-Fallback existiert; manueller Recovery-Workflow akzeptabel für V1.
- **R6 — Re-Sync nach lokal-Fallback:** User arbeitet offline am lokalen Checkout, Cloud kommt zurück online. **Erwartete Behandlung:** manueller Reconciliation-Workflow (Git-Diff-basiert), kein Auto-Merge in V1.
- **R1 — Cross-Machine-Konkurrenz auf `kanban.json` und Git-Index:** Drei mögliche Schreiber (Cloud-Specwright-UI, Kompass-Agent, lokaler Cursor übers Mount) können seltene Race-Conditions erzeugen, da `withKanbanLock`/`withMainProjectLock` nur same-machine halten. **V1-Entscheidung:** Restrisiko bewusst akzeptiert; in der Praxis selten (User bedient nicht parallel von zwei Stellen). V2 löst sauber (z.B. Lease-basiertes Locking via Redis oder Cloud-only-Schreibrecht für `kanban.json`).
- **Auth-Bypass-Versuch:** Cloud-UI ist im Internet erreichbar; ohne Auth-Layer könnte jemand Code ausführen. **Erwartete Behandlung:** Auth (Google OAuth oder Cloudflare Tunnel) ist Pflicht-Gating, kein Public-Mode.
- **Kompass-Agent schreibt Spec während User Spec öffnet:** Specwright-UI muss File-Watcher/Refresh-Logik haben, sonst sieht User stale Inhalt. **Erwartete Behandlung:** bestehende UI-Refresh-Mechanik nutzen / verifizieren.

## Security & Permissions
- **Single-User**, keine Multi-Tenant-Anforderung.
- Browser-Zugang zur Cloud-Specwright-UI ist Pflicht-authentifiziert: **Google OAuth (Kompass-Reuse) ODER Cloudflare Tunnel** — finale Wahl in der Spec-Phase.
- **Agent-Zugang zur Codebase erfolgt nicht via HTTP-API** der Specwright-UI, sondern direkt aufs geteilte Volumen (Filesystem). Daher kein zusätzlicher HTTP-Auth-Layer für Agents nötig.
- **Telegram-Adapter** ist eigener Kanal mit Bot-Token-Auth (Kompass-bestehend, unverändert).
- Claude-SDK-Auth via Token-Rotator-Pattern — Tokens nicht client-exposed, server-side rotation.

## Performance Considerations
- **Latenz Mac↔Cloud (R7):** Erstmal unwichtig laut User. Server in europäischer DigitalOcean-Region erwartet, Hotel-WiFi-Edge-Cases akzeptabel.
- **Mount-Performance (R2):** kritisch (siehe Edge Cases). Spike entscheidet über Mount-Technologie.
- **Droplet-Sizing:** Specwright-UI spawnt Claude-Code-SDK-Prozesse, kann CPU/RAM hungrig sein. Same-Droplet-Sharing mit Kompass akzeptiert; Skalierung bei Bedarf OK.
- Keine harten Latenz-/Throughput-Anforderungen für V1.

## Scope Boundaries
**IN SCOPE:**
- Specwright-UI-Deployment auf bestehendem Kompass-DigitalOcean-Droplet (Vollparität zur lokalen UI)
- Geteiltes Cloud-Volumen für Projekt-Files (5–10 Projekte, ~300–400 MB pro Projekt)
- Mac-Mount des Cloud-Volumens für Cursor-IDE (inkl. Mount-Technologie-Spike)
- Browser-Auth-Layer (Google OAuth oder Cloudflare Tunnel)
- Claude-SDK-Auth via Token-Rotator-Pattern aus Kompass
- Cloud-UI als Default-Zugang vom Mac und vom zweiten Laptop
- Git-Operationen-Policy: ausschließlich cloud-side
- Single-User, Desktop-Browser

**OUT OF SCOPE:**
- Multi-User / Team-Fähigkeit
- Mobile-Responsive UI (Phone/Tablet)
- Tiefere Kompass-Integration (z.B. Telegram-Conversations innerhalb Specwright-UI, Kompass-Agent-Aktivitätsanzeige)
- Migration / Onboarding-Magic (Auto-Provisionierung von Kompass-Projekten in Cloud-Specwright-UI)
- Backup / Disaster-Recovery / Monitoring (deferred, später)
- Cross-Machine-Lock-Hardening für `kanban.json` / Git-Index (deferred, V2)
- Lokale Specwright-UI als „echte" Fallback-Strategie inkl. automatischem Re-Sync-Workflow (deferred)
- Framework-Erweiterung für andere Specwright-Nutzer (Cloud-Variante ist dein-spezifisches Setup)

## Open Questions (if any)
- **Auth-Wahl:** Google OAuth (Kompass-Reuse) oder Cloudflare Tunnel — finale Entscheidung im Architektur-Plan.
- **Mount-Technologie:** SSHFS, S3FS, NFS, Tailscale-Share oder andere — abhängig von R2-Spike-Ergebnis.
- **Repo-/Branch-Strategie:** Eigenes Repo für Cloud-Variante, oder Branch im Specwright-Repo? (Domain-Fit sagt „separat", konkrete Form offen.)
- **Volumen-Topologie:** Erweiterung des bestehenden Kompass-Volumens, oder neues geteiltes Volume? Beeinflusst Pfad-Konvention.
- **Reverse-Proxy / Public-URL-Form:** Subdomain unterhalb Kompass-Hostname, eigene Domain, oder nur via Cloudflare-Tunnel (kein Public-DNS)?

## Proposed User Stories (High Level)
1. **Specwright-UI auf Kompass-Droplet deployen** — Deploy-Skript provisioniert Specwright-UI als zweite App auf demselben DigitalOcean-Droplet wie Kompass; Service-Definition, Port, Reverse-Proxy.
2. **Geteiltes Cloud-Volumen für Projekt-Files** — DigitalOcean Volume zwischen Cloud-Specwright-UI und Kompass; Projekt-Root-Konvention; Pfad-Konfiguration in beiden Apps angepasst.
3. **Mac-Mount des Cloud-Volumens für Cursor** — Lokaler Mount-Workflow inkl. Technologie-Spike (SSHFS / S3FS / NFS / Tailscale) gegen R2 (node_modules-Indexer-Performance).
4. **Browser-Auth für Cloud-Specwright-UI** — Single-User-Auth via Google OAuth (Kompass-Reuse) ODER Cloudflare Tunnel; finale Wahl in Story.
5. **Claude-SDK-Auth in Cloud via Token-Rotator-Pattern** — Reuse der Kompass-Logik (`backend/src/server/services/token-rotator.ts`) für Specwright-UI-Cloud-Instanz.

---
*Review this document carefully. Once approved, detailed user stories will be generated.*

## Origin

> **Transferred from Brainstorming Session:** 2026-05-08-14-32-specwright-ui-cloud-deploy
> **Original Discussion:** @specwright/brainstorming/2026-05-08-14-32-specwright-ui-cloud-deploy/session.md
> **Transfer Date:** 2026-05-08
> **Mode:** V2 Lean

### Information Added During Transfer
- Proposed User Stories (Sektion 11) — über interaktiven Fragebogen ergänzt; 5 Stories vorgeschlagen und vom User unverändert übernommen.

### Notes
- **Auth-Wahl** und **Mount-Technologie** absichtlich als Open Questions an den Plan-Agent weitergereicht — beides Architektur-Entscheidungen mit Trade-offs (Reuse vs. Einfachheit; Performance vs. Latenz vs. Setup-Komplexität).
- **R1 (Cross-Machine-Lock-Hardening)** wurde im Brainstorming als bewusst akzeptiertes Restrisiko für V1 markiert; V2 löst sauber. Bitte nicht in V1-Implementierung erzwingen.
- **Repo-/Branch-Strategie** offen: Domain-Fit-Entscheidung war „separates Setup, Specwright-Framework bleibt unverändert" — konkrete Repo-Form (eigenes Repo vs. Branch) im Plan zu klären.
- **Backup/DR/Monitoring** absichtlich deferred — User wollte V1 schmal halten.
