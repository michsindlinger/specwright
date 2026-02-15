# Requirements Clarification - Open Source Ready

**Created:** 2026-02-11
**Status:** Pending User Approval

## Feature Overview
Das Agent OS Web UI Projekt soll vollständig open-source-fähig gemacht werden: Secrets entfernen, Dokumentation erstellen, LICENSE und Community-Dateien hinzufügen, Setup-Script für einfache Installation, .gitignore aktualisieren, und das Repo als frisches Repository ohne History-Secrets veröffentlichen.

## Target Users
- Open-Source-Entwickler, die eine Web UI für Claude Code / Agent OS suchen
- Bestehende Agent OS Extended Nutzer, die eine visuelle Oberfläche wollen
- Entwickler, die an AI-gestützten Development-Workflows interessiert sind

## Business Value
- Erhöhte Sichtbarkeit und Community-Wachstum für Agent OS
- Community-Beiträge und Feedback
- Vertrauen durch Transparenz
- Breitere Nutzerbasis für das Agent OS Ökosystem

## Functional Requirements

### 1. Security & Secrets Cleanup
- `.mcp.json` aus Git entfernen und durch `.mcp.json.example` ersetzen (ohne echte API Keys)
- `.mcp.json` in `.gitignore` aufnehmen
- Alle hardcodierten Pfade (z.B. `/Users/michaelsindlinger/...`) durch relative Pfade oder Konfiguration ersetzen
- `config.json` mit absoluten Pfaden bereinigen
- `.claude/settings.local.json` prüfen und ggf. entfernen
- Perplexity API Key rotieren (manuell durch User)

### 2. LICENSE & Legal
- MIT LICENSE Datei im Root-Verzeichnis erstellen
- `license` Feld in allen `package.json` Dateien hinzufügen/aktualisieren
- Copyright-Holder festlegen

### 3. Dokumentation
- README.md im Repository-Root erstellen (aktuell nur in agent-os-ui/)
  - Projektbeschreibung mit Screenshots/Demo
  - Prerequisites (Node.js, agent-os-extended)
  - Quick Start Guide
  - Architektur-Übersicht
  - Link zu agent-os-extended als Prerequisite
- CONTRIBUTING.md erstellen (Contribution Guidelines)
- CODE_OF_CONDUCT.md erstellen
- SECURITY.md erstellen (Vulnerability Reporting)

### 4. Setup & Installation
- Automatisiertes `setup.sh` Script erstellen:
  - Prerequisites prüfen (Node.js Version, npm)
  - agent-os-extended Installation prüfen
  - `npm install` für Backend und Frontend
  - `.mcp.json` aus Example kopieren (falls nicht vorhanden)
  - Environment-Variablen Setup
  - Quick-Start Hinweise ausgeben

### 5. .gitignore Aktualisierung
- `.mcp.json` hinzufügen
- Prüfen ob `.claude/settings.local.json` ignoriert werden soll
- `scratchpad/` hinzufügen
- `temp_specs_backup/` hinzufügen
- Sicherstellen dass `.env*` bereits ignoriert wird

### 6. Code-Cleanup
- Hardcodierte absolute Pfade in `config.json` durch relative Pfade ersetzen
- `setup-devteam-global.sh` auf absolute Pfade prüfen
- Temporäre Verzeichnisse bereinigen (`temp_specs_backup/`, `scratchpad/`)

### 7. GitHub Community Files
- Issue Templates erstellen (Bug Report, Feature Request)
- Pull Request Template erstellen
- GitHub Actions CI/CD Pipeline (Lint + Build + Test)

### 8. Neues Repository
- Frisches Git-Repository ohne belastete History erstellen
- Initial Commit mit bereinigtem Code
- Remote auf GitHub konfigurieren
- Dokumentation für Repo-Migration

## Affected Areas & Dependencies
- Repository Root - Neue Dateien (LICENSE, CONTRIBUTING, etc.)
- `.mcp.json` - Muss bereinigt werden (enthält API Key)
- `.gitignore` - Muss erweitert werden
- `agent-os-ui/config.json` - Hardcodierte Pfade
- `agent-os-ui/package.json` - License Feld
- `agent-os-ui/ui/package.json` - License Feld
- `agent-os-ui/README.md` - Muss aktualisiert/erweitert werden
- `.github/` Verzeichnis - Neu erstellen (Templates, Workflows)
- `setup.sh` - Neues Script im Root

## Edge Cases & Error Scenarios
- User hat agent-os-extended nicht installiert → Setup-Script gibt klare Fehlermeldung
- Node.js Version zu alt → Setup-Script prüft Mindestversion
- npm install schlägt fehl → Klare Fehlermeldungen und Troubleshooting
- `.mcp.json.example` wird versehentlich mit echten Keys committed → .gitignore-Schutz + Hinweis in Datei
- User forkt Repo ohne README zu lesen → README muss self-explanatory sein

## Security & Permissions
- Keine API Keys im Repository (weder in Dateien noch in Git-History)
- `.mcp.json` ist git-ignored
- Keine persönlichen Pfade oder Konfigurationen im Code
- SECURITY.md dokumentiert Vulnerability-Reporting-Prozess

## Performance Considerations
- Keine Performance-Anforderungen für dieses Feature (es ist ein Dokumentations-/Cleanup-Feature)

## Scope Boundaries
**IN SCOPE:**
- Agent OS Web UI Repository (agent-os-web-ui) bereinigen und open-source-fähig machen
- LICENSE, CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md erstellen
- Setup-Script erstellen
- .gitignore aktualisieren
- Secrets/hardcodierte Pfade entfernen
- GitHub Templates und CI/CD erstellen
- Root-Level README.md erstellen
- package.json Metadata aktualisieren
- Frisches Repository ohne History-Secrets vorbereiten

**OUT OF SCOPE:**
- Agent-os-extended Repository (wird separat behandelt)
- Neue Features für die Web UI
- Deployment/Hosting Setup
- GitHub Organisation erstellen
- Marketing/Promotion
- Perplexity API Key rotieren (manuell durch User)
- tatsächliches GitHub Repo-Publishing (nur Vorbereitung)

## Open Questions
- Keine offenen Fragen

## Proposed User Stories (High Level)
1. **Security Cleanup** - Secrets, API Keys und hardcodierte Pfade entfernen; .mcp.json.example erstellen
2. **License & Legal Files** - MIT LICENSE, package.json Metadata aktualisieren
3. **Root README & Documentation** - Umfassende README.md im Repository-Root mit Quick Start, Architecture, Prerequisites
4. **Community Files** - CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md erstellen
5. **Setup Script** - Automatisiertes setup.sh für einfache Installation
6. **.gitignore & Repo Cleanup** - .gitignore erweitern, temporäre Dateien entfernen, Code bereinigen
7. **GitHub Templates & CI/CD** - Issue/PR Templates, GitHub Actions Workflow
8. **Fresh Repository Preparation** - Anleitung und Script für frisches Repo ohne belastete History

---
*Review this document carefully. Once approved, detailed user stories will be generated.*
