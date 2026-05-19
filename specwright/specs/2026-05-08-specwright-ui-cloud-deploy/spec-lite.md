# Specwright UI Cloud Deployment - Lite Summary

> Created: 2026-05-08
> Full Spec: @specwright/specs/2026-05-08-specwright-ui-cloud-deploy/spec.md

Specwright-UI wird auf demselben DigitalOcean-Droplet wie Kompass deployed und greift via geteiltem Cloud-Volume auf dieselben Projekt-Files zu wie Kompass-Agents. Damit sind Spec-Anlagen aus Telegram-Konversationen sofort im Backlog-Dashboard sichtbar, ohne Git-Pull-Tanz; Browser-Zugang von überall.

## Key Points

- Cloud-UI als Default-Zugang vom Mac und unterwegs (Vollparität zur lokalen UI)
- Geteiltes DigitalOcean-Block-Volume `/mnt/shared_projects/` für 5–10 Projekte
- Auth via Cloudflare Tunnel + Access (kein Express-Session-Layer in UI)
- Mount-Tech-Spike (R2): SSHFS vs. Mutagen-Sync; Default Mutagen falls SSHFS-Indexer schlecht
- Pfad-Config via Env-Var `SPECWRIGHT_PROJECTS_ROOT` (kein Refactor von `project-dirs.ts`)
- Claude-SDK-Auth via Token-Rotator-Pattern aus Kompass
- Selbes Repo, kein Branch-Fork; Cloud-Aspekte isoliert in Setup-Skript + Env-Layer

## Quick Reference

- **Status**: Planning (V2 Lean)
- **Timeline**: ASAP, kein Hard-Date
- **Dependencies**: Kompass-Droplet, Cloudflare-Account, Token-Rotator-Pattern (`compass/backend/src/server/services/token-rotator.ts`)
- **Team Members**: Single-User (Michael)

## Context Links

- Full Specification: @specwright/specs/2026-05-08-specwright-ui-cloud-deploy/spec.md
- Implementation Plan: @specwright/specs/2026-05-08-specwright-ui-cloud-deploy/implementation-plan.md
- Requirements Clarification: @specwright/specs/2026-05-08-specwright-ui-cloud-deploy/requirements-clarification.md
- Kanban (V2 Lean): @specwright/specs/2026-05-08-specwright-ui-cloud-deploy/kanban.json
