# CLOUD-003 Mount-Tech-Spike (R2) — FINAL RESULTS

> **Status:** DONE (2026-05-10), Mutagen-mit-ignore + Beta-Overrides gewählt
> **Test-Projekt:** `danke-shop` (888 MB, 2088 node_modules-Dirs, 756 MB node_modules)
> **Droplet:** `root@64.227.115.197`
> **Cloud-Pfad:** `/mnt/shared_projects/danke-shop`

---

## Ergebnis-Tabelle

| Metrik | A) SSHFS | B) Mutagen mit `--ignore=node_modules,.git` |
|--------|----------|---------------------------------------------|
| Setup-Aufwand | **NO-GO** (macFUSE-Recovery-Reboot auf Apple Silicon nötig — Mac aus, Power-Button halten, Sicherheitsrichtlinie senken, 2x Reboot) | < 5 min (brew install + sync create) |
| Initial-Sync | n/a | **85 s** |
| Lokale Disk | n/a | **1.1 GB** (5453 dirs, 24964 files) |
| M1 Cold-Open + Subjektiv | nicht gemessen — operativ blockiert | **flüssig** — Cursor file-open, `cmd+P`, Tree-Expand alle responsiv |
| M3 Watcher-Lag (Cloud→Mac) | n/a | **< 1 s** (besser als 10s-Polling, weil Mac-Side File-System-Events auf Mutagen-Local-Cache feuern) |
| M4 Edit-Roundtrip (Mac→Cloud) | n/a | **wenige Sekunden** |
| Scan-Probleme | n/a | 2 (2 dangling/absolute Symlinks — harmlos, in CLOUD-007 dokumentieren) |

---

## GO/NO-GO

| Tech | Status | Begründung |
|------|--------|------------|
| SSHFS | **NO-GO (operativ)** | macFUSE Apple-Silicon-Kernel-Extension-Allow erfordert Recovery-Mode-Boot + Sicherheitsrichtlinie senken. Cost > Benefit für reines Spec-Editing. |
| Mutagen mit ignore | **GO** | Alle Mess-Dimensionen erfüllt. Native lokale Performance via Cache; Cross-Sync-Lag akzeptabel. |
| Mutagen ohne ignore | nicht getestet | Aus Spike-Phase-3 ausgelassen (Use-Case = nur Cursor-Edit, nicht lokales `npm run dev`; 4.6 GB Disk-Bloat unnötig). |

---

## Entscheidung

**Gewählt:** Mutagen-Sync mit `--ignore=node_modules,.git --ignore-vcs` und **Beta-Side-Permissions-Overrides** (kritisch — siehe `## Lessons Learned`).

**Finales Setup-Command (für CLOUD-007 Mac-Mount-Workflow-Doku):**

```bash
mutagen sync create --name=specs-shared \
  --ignore=node_modules,.git \
  --ignore-vcs \
  --default-owner-beta=id:100 \
  --default-group-beta=id:102 \
  --default-file-mode-beta=0660 \
  --default-directory-mode-beta=0770 \
  ~/cloud-mount-mutagen \
  root@<droplet-ip>:/mnt/shared_projects
```

**Konsequenz für CLOUD-007:**
- Setup-Doku enthält exakt dieses Command (Minimal-Variante explizit verboten).
- Mutagen-Install-Schritt: `brew install mutagen-io/mutagen/mutagen && mutagen daemon start`.
- SSHFS-Alternative wird als "deprecated für Apple Silicon" dokumentiert.

**Konsequenz für R6 (Re-Sync-Workflow):**
- Mutagen hat eingebaute Conflict-Detection — bei Lokal-Edit+Cloud-Edit auf gleiches File macht Mutagen "safe-mode" und meldet Conflict statt blind zu überschreiben. Manueller Resolve via `mutagen sync resolve` oder direkt File-Edit.
- R6 strukturell teil-gemildert; manuelle Reconciliation bleibt akzeptiert (V1-Scope).

---

## Lessons Learned (CLOUD-BUG-001)

Während des Spike-Setups (CLOUD-003) wurde Mutagen mit Default-Permissions konfiguriert — `File mode 0600 / Directory mode 0700 / Owner=SSH-User=root`. Konsequenz: alle Mac-Edits via Cursor landeten auf der Droplet als `root:root 600/700`. Compass-Container (compass:compass UID 100/GID 102) hatte keinen Read-Access → 288+ Files in `dein-rueckhalt.de` + `applai-nextjs` unlesbar für Cloud-Agent.

**Mandatory-Lehre:** Beta-Side Owner/Group/File-Mode/Directory-Mode-Overrides sind Pflicht. Setgid (2775) auf Volume-Root reicht nicht — Mutagen-Portable-Mode setzt File-Modes explizit beim Schreiben und überschreibt Group-Inheritance.

**Repair-Pattern (für CLOUD-007 Recovery-Section):**
```bash
ssh root@<droplet> '
find /mnt/shared_projects -mindepth 1 -not -path "*/lost+found*" \! \( -uid 100 -gid 102 \) -print0 | xargs -0r chown 100:102
find /mnt/shared_projects -mindepth 1 -not -path "*/lost+found*" -not -type l -print0 | xargs -0r chmod g+rwX,o-rwx
'
```

**Numerische UIDs in Mutagen:** CLI verlangt `id:` Prefix bei numerischen IDs → `--default-owner-beta=id:100`. Direkt `100` wirft `unknown user 100`. Klartext-Namen (`dhcpcd:syslog` auf Host) wären auch erlaubt, `id:`-Form ist portabler.

---

## Cleanup-Status nach Spike

| Item | Status |
|------|--------|
| Test-Datei `SPIKE-WATCHER-TEST.md` auf Droplet | ✅ entfernt |
| Sync `spike-ignore` | ✅ terminiert (ersetzt durch `specs-shared`) |
| Mountpoint `~/cloud-mount-mutagen` | ✅ behalten (= productive Mount-Point für CLOUD-007) |
| Productive Sync `specs-shared` | ✅ aktiv mit Beta-Overrides |
