# Spec Requirements Document

> Spec: Open Source Ready
> Created: 2026-02-11
> Status: Planning

## Overview

Das Agent OS Web UI Projekt wird vollständig für eine Open-Source-Veröffentlichung vorbereitet. Alle Secrets und hardcodierten Pfade werden entfernt, Standard-Open-Source-Dateien (LICENSE, CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md) erstellt, ein automatisiertes Setup-Script bereitgestellt, GitHub Templates und CI/CD eingerichtet, und ein Script zur Erstellung eines frischen Repositories ohne belastete Git-History bereitgestellt.

## User Stories

See: stories/ directory for individual story files

| ID | Title | Priority | Effort |
|----|-------|----------|--------|
| OSR-001 | Security Cleanup | Critical | 2 SP |
| OSR-002 | License & Legal Files | High | 1 SP |
| OSR-003 | Root README & Documentation | High | 3 SP |
| OSR-004 | Community Files | High | 2 SP |
| OSR-005 | Setup Script | High | 2 SP |
| OSR-006 | .gitignore & Repo Cleanup | Medium | 1 SP |
| OSR-007 | GitHub Templates & CI/CD | Medium | 2 SP |
| OSR-008 | Fresh Repository Preparation | Medium | 2 SP |

## Spec Scope

- Agent OS Web UI Repository (agent-os-web-ui) bereinigen und open-source-fähig machen
- LICENSE, CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md erstellen
- Setup-Script erstellen
- .gitignore aktualisieren
- Secrets/hardcodierte Pfade entfernen (.mcp.json.example, config.json.example)
- GitHub Issue/PR Templates und CI/CD Pipeline erstellen
- Root-Level README.md erstellen
- package.json Metadata aktualisieren
- Frisches Repository ohne History-Secrets vorbereiten (Script + Anleitung)

## Out of Scope

- Agent-os-extended Repository (wird separat behandelt)
- Neue Features für die Web UI
- Deployment/Hosting Setup
- GitHub Organisation erstellen
- Marketing/Promotion
- Perplexity API Key rotieren (manuell durch User)
- Tatsächliches GitHub Repo-Publishing (nur Vorbereitung)

## Expected Deliverable

Ein vollständig open-source-fähiges Repository mit:
- Keinen API Keys oder Secrets in Dateien
- Vollständiger Dokumentation (README, CONTRIBUTING, SECURITY, CODE_OF_CONDUCT)
- MIT LICENSE
- Automatisiertem Setup-Script
- GitHub Templates und CI/CD Pipeline
- Script zur Erstellung eines frischen Repos ohne belastete History

## Integration Requirements

> Diese Integration Tests werden nach Abschluss aller Stories automatisch ausgeführt.

**Integration Type:** DevOps-only

- [ ] **Integration Test 1:** Keine API Keys im Repository
  - Command: `! grep -r "pplx-" --include="*.json" --include="*.md" --include="*.ts" --include="*.js" . 2>/dev/null | grep -v node_modules | grep -v .example`
  - Validates: Keine Perplexity API Keys in tracked files
  - Requires MCP: no

- [ ] **Integration Test 2:** Alle Open-Source-Dateien vorhanden
  - Command: `test -f LICENSE && test -f README.md && test -f CONTRIBUTING.md && test -f CODE_OF_CONDUCT.md && test -f SECURITY.md && test -f setup.sh && test -f .mcp.json.example`
  - Validates: Alle erforderlichen Dateien existieren
  - Requires MCP: no

- [ ] **Integration Test 3:** Setup-Script ist executable
  - Command: `test -x setup.sh`
  - Validates: setup.sh hat execute-Permission
  - Requires MCP: no

- [ ] **Integration Test 4:** .gitignore schützt sensitive Dateien
  - Command: `grep -q ".mcp.json" .gitignore && grep -q "config.json" .gitignore`
  - Validates: Sensitive Dateien sind git-ignored
  - Requires MCP: no

- [ ] **Integration Test 5:** CI Workflow Syntax valid
  - Command: `test -f .github/workflows/ci.yml && python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))" 2>/dev/null || echo "yaml check skipped"`
  - Validates: CI Workflow ist syntaktisch korrekt
  - Requires MCP: no

**Integration Scenarios:**
- [ ] Scenario 1: Neuer Entwickler klont Repo, führt setup.sh aus, startet Dev Server
- [ ] Scenario 2: Contributor erstellt Issue mit Template, erstellt PR mit Template

## Spec Documentation

- Implementation Plan: agent-os/specs/2026-02-11-open-source-ready/implementation-plan.md
- Requirements: agent-os/specs/2026-02-11-open-source-ready/requirements-clarification.md
- Story Index: agent-os/specs/2026-02-11-open-source-ready/story-index.md
