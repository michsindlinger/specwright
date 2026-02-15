# AgentOS Extended Setup Wizard - Specification

> Spec ID: 2026-02-13-agent-os-setup-wizard
> Created: 2026-02-13
> Status: Ready
> Prefix: SETUP

## 1. Overview

Step-by-Step Setup Wizard im Settings-Bereich der Agent OS Web UI fuer die komplette Installation von AgentOS Extended und das Erstellen eines Entwicklungsteams.

### Problem

- Benutzer muessen manuell 3 Curl-Commands in einem Terminal ausfuehren
- Kein visuelles Feedback zum Installationsstatus
- Neue Benutzer kennen die noetige Reihenfolge nicht
- DevTeam-Setup erfordert Kenntnis interner Commands

### Loesung

Gefuehrter 4-Schritt Wizard mit:
- Automatischer Status-Erkennung (Dateisystem-Checks)
- Shell Execution mit Live-Output Streaming
- Cloud Terminal Integration fuer DevTeam-Setup
- Fehlerbehandlung mit Retry-Moeglichkeit

## 2. Installations-Schritte

| Schritt | Name | Command | Ausfuehrung |
|---------|------|---------|-------------|
| 1 | Base Installation | `curl -sSL .../setup.sh \| bash` | Shell (spawn) |
| 2 | Claude Code Setup | `curl -sSL .../setup-claude-code.sh \| bash` | Shell (spawn) |
| 3 | DevTeam Global | `curl -sSL .../setup-devteam-global.sh \| bash` | Shell (spawn) |
| 4 | Build Development Team | `/agent-os:build-development-team` | Cloud Terminal |

## 3. Architecture

### Frontend
- Neue Komponente: `aos-setup-wizard` (Lit, Light DOM)
- Integration: Settings-View Tab "Setup" (`#/settings/setup`)

### Backend
- Neuer Service: `SetupService` (Status-Check + Shell Execution)
- WebSocket Handler: `setup:*` Messages in `websocket.ts`

### Communication
- `setup:check-status` → `setup:status`
- `setup:run-step` → `setup:step-output` (streaming) → `setup:step-complete`
- `setup:start-devteam` → `cloud-terminal:created`

## 4. Status-Erkennung

| Schritt | Check |
|---------|-------|
| 1 (Base) | `<project>/.agent-os/` mit workflows/ oder standards/ |
| 2 (Claude Code) | `<project>/CLAUDE.md` + `<project>/.claude/` |
| 3 (DevTeam Global) | `~/.agent-os/templates/` |
| 4 (DevTeam) | `<project>/agent-os/team/` nicht leer |

## 5. Betroffene Dateien

### Neue Dateien
- `agent-os-ui/src/server/services/setup.service.ts`
- `agent-os-ui/ui/src/components/setup/aos-setup-wizard.ts`

### Geaenderte Dateien
- `agent-os-ui/src/server/websocket.ts` (+80 LOC)
- `agent-os-ui/ui/src/views/settings-view.ts` (+20 LOC)

## 6. Stories

Siehe `kanban.json` fuer die vollstaendige Story-Liste und Abhaengigkeiten.

## 7. Out of Scope

- Automatische Erkennung beim Projektwechsel
- Deinstallation von AgentOS Extended
- Versionspruefung / Update-Mechanismus
- Konfigurierbare Curl-URLs
