# Implementierungsplan: Open Source Ready

> **Status:** PENDING_USER_REVIEW
> **Spec:** agent-os/specs/2026-02-11-open-source-ready/
> **Erstellt:** 2026-02-11
> **Basiert auf:** requirements-clarification.md

---

## Executive Summary

Das Agent OS Web UI Projekt wird vollständig für eine Open-Source-Veröffentlichung vorbereitet. Die Arbeit umfasst 8 Stories in 5 Umsetzungsphasen, geordnet nach Abhängigkeiten (sicherheitskritische Arbeit zuerst, dann Legal, Dokumentation, Tooling, und schließlich Vorbereitung des frischen Repositories). Die Kernherausforderung ist das Entfernen des Perplexity API Keys aus `.mcp.json`, das Ersetzen hardcodierter absoluter Pfade, und das Erstellen aller Standard-Open-Source-Community-Dateien (LICENSE, CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md, Root-README.md, GitHub Templates, CI/CD).

---

## Architektur-Entscheidungen

### Gewählter Ansatz

Minimalinvasiver Ansatz: Nur neue Dateien hinzufügen und bestehende Konfigurationen schützen. Keine Änderungen an bestehendem Applikations-Code. Bestehende `config.json` und `.mcp.json` werden durch `.example`-Dateien ergänzt und per `.gitignore` geschützt.

### Begründung

Der gesamte bestehende Code funktioniert korrekt. Die Änderungen betreffen ausschließlich Repository-Metadaten, Dokumentation und Konfigurationsschutz. Kein Feature wird modifiziert oder entfernt.

### Patterns & Technologien

| Entscheidung | Wahl | Begründung |
|-------------|------|------------|
| Lizenz | MIT | Bereits in `agent-os-ui/README.md` referenziert; einfachste permissive Lizenz |
| Config-Ansatz | `config.json.example` + `.gitignore` | `config.json` ist user-spezifisch (Projektpfade); `ProjectManager` in `projects.ts` liest sie bereits |
| `.mcp.json`-Ansatz | `.mcp.json.example` + `.gitignore` | Enthält API Key und user-spezifische Pfade |
| Setup-Script | `setup.sh` im Repository-Root | Konvention; ähnlich zu bestehendem `setup-devteam-global.sh` |
| CI/CD | GitHub Actions | Standard für Open Source |
| `agent-os/` Verzeichnis | Komplett behalten | Enthält Specs, Product-Docs und Workflow-Definitionen die das Agent OS Methodology demonstrieren |
| Frisches Repo | `scripts/prepare-fresh-repo.sh` + Dokumentation | Sicher; User entscheidet wann frisches Repo erstellt wird |

---

## Komponenten-Übersicht

### Neue Komponenten

| Komponente | Typ | Verantwortlichkeit |
|------------|-----|-------------------|
| `LICENSE` | Legal | MIT Lizenz-Datei im Repository-Root |
| `README.md` (Root) | Dokumentation | Umfassende Projekt-README mit Architecture, Setup, Prerequisites |
| `CONTRIBUTING.md` | Dokumentation | Contribution Guidelines für Open Source |
| `CODE_OF_CONDUCT.md` | Dokumentation | Contributor Covenant Code of Conduct |
| `SECURITY.md` | Dokumentation | Vulnerability Reporting Prozess |
| `.mcp.json.example` | Konfiguration | Template MCP-Config ohne echte API Keys |
| `agent-os-ui/config.json.example` | Konfiguration | Template Projekt-Config mit Platzhalter-Pfaden |
| `setup.sh` | Script | Automatisiertes Setup-Script für neue User |
| `.github/ISSUE_TEMPLATE/bug_report.md` | GitHub | Bug Report Issue Template |
| `.github/ISSUE_TEMPLATE/feature_request.md` | GitHub | Feature Request Issue Template |
| `.github/PULL_REQUEST_TEMPLATE.md` | GitHub | PR Template |
| `.github/workflows/ci.yml` | CI/CD | GitHub Actions Pipeline (Lint, Build, Test) |
| `scripts/prepare-fresh-repo.sh` | Script | Script zum Erstellen eines sauberen Repos ohne History-Secrets |
| `docs/FRESH_REPO_GUIDE.md` | Dokumentation | Anleitung für frisches Repository |

### Zu ändernde Komponenten

| Komponente | Änderungsart | Grund |
|------------|--------------|-------|
| `.gitignore` (Root) | Erweitern | `.mcp.json`, `.claude/settings.local.json`, `config.json`, `scratchpad/`, `temp_specs_backup/` hinzufügen |
| `agent-os-ui/package.json` | Erweitern | `license`, `repository`, `homepage`, `bugs` Felder hinzufügen |
| `agent-os-ui/ui/package.json` | Erweitern | `license` Feld hinzufügen |
| `agent-os-ui/README.md` | Erweitern | Referenz auf Root-README hinzufügen |

### Nicht betroffen (explizit)

- Alle Applikations-Dateien (`src/server/`, `ui/src/`)
- WebSocket-Protokolle und Handler
- Lit-Komponenten
- Express-Routes und Services
- Git-Integration
- Cloud Terminal
- `agent-os/` Verzeichnis-Inhalte (Specs, Knowledge, Templates)
- `.claude/agents/`, `.claude/skills/`
- `config/model-config.json`
- Vite-Konfiguration
- ESLint-Konfiguration
- Test-Setup

---

## Umsetzungsphasen

### Phase 1: Security Cleanup
**Ziel:** Alle Secrets und hardcodierten Pfade entfernen/schützen
**Komponenten:** `.mcp.json.example`, `config.json.example`, `.gitignore`
**Abhängig von:** Nichts (Startphase, HÖCHSTE PRIORITÄT)

Aufgaben:
1. `.mcp.json.example` erstellen (API Key durch Platzhalter ersetzen, Pfade anpassen)
2. `agent-os-ui/config.json.example` erstellen (Pfade durch Platzhalter ersetzen)
3. `.gitignore` erweitern (`.mcp.json`, `config.json`, `.claude/settings.local.json`, `scratchpad/`, `temp_specs_backup/`)

### Phase 2: License & Legal
**Ziel:** Rechtliche Grundlage für Open Source schaffen
**Komponenten:** `LICENSE`, package.json Updates
**Abhängig von:** Nichts (kann parallel zu Phase 1 laufen)

Aufgaben:
1. MIT `LICENSE` Datei im Root erstellen
2. `agent-os-ui/package.json` um `license`, `repository`, `homepage`, `bugs` erweitern
3. `agent-os-ui/ui/package.json` um `license` erweitern

### Phase 3: Dokumentation
**Ziel:** Umfassende Dokumentation für neue User und Contributors
**Komponenten:** Root README.md, CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md
**Abhängig von:** Phase 2 (LICENSE muss existieren damit README darauf verweisen kann)

Aufgaben:
1. Root `README.md` erstellen mit: Projektbeschreibung, Prerequisites, Quick Start, Architecture, Features, Configuration, Development, Contributing, License
2. `CONTRIBUTING.md` erstellen mit: Development Setup, Code Style, PR Process, Issue Reporting
3. `CODE_OF_CONDUCT.md` erstellen (Contributor Covenant v2.1)
4. `SECURITY.md` erstellen (Vulnerability Reporting)
5. `agent-os-ui/README.md` aktualisieren (Referenz auf Root-README)

### Phase 4: Setup Script & Repo Cleanup
**Ziel:** Einfache Installation und sauberes Repository
**Komponenten:** `setup.sh`, Dateibereinigung
**Abhängig von:** Phase 1 (Example-Dateien müssen existieren damit setup.sh sie kopieren kann)

Aufgaben:
1. `setup.sh` erstellen: Prerequisites prüfen, npm install, Example-Dateien kopieren, Quick-Start Hinweise
2. `scratchpad/` Verzeichnis entfernen
3. `temp_specs_backup/` Verzeichnis entfernen

### Phase 5: GitHub Templates, CI/CD & Fresh Repo
**Ziel:** Professionelle GitHub-Präsenz und sichere Veröffentlichung
**Komponenten:** Issue/PR Templates, GitHub Actions, Fresh Repo Script
**Abhängig von:** Alle vorherigen Phasen (Fresh Repo Script verpackt den vollständig vorbereiteten Code)

Aufgaben:
1. `.github/ISSUE_TEMPLATE/bug_report.md` erstellen
2. `.github/ISSUE_TEMPLATE/feature_request.md` erstellen
3. `.github/PULL_REQUEST_TEMPLATE.md` erstellen
4. `.github/workflows/ci.yml` erstellen (Lint, Build, Test mit Node.js 20+22)
5. `scripts/prepare-fresh-repo.sh` erstellen (Clean Copy ohne Git-History)
6. `docs/FRESH_REPO_GUIDE.md` erstellen (Anleitung)

---

## Komponenten-Verbindungen (KRITISCH)

> **Zweck:** Explizit definieren WIE Komponenten miteinander verbunden werden.
> Jede Verbindung MUSS einer Story zugeordnet sein.

### Verbindungs-Matrix

| Source | Target | Verbindungsart | Zuständige Story | Validierung |
|--------|--------|----------------|------------------|-------------|
| `setup.sh` | `.mcp.json.example` | File Copy | Story 5 | `grep -q "mcp.json.example" setup.sh` |
| `setup.sh` | `config.json.example` | File Copy | Story 5 | `grep -q "config.json.example" setup.sh` |
| Root `README.md` | `LICENSE` | Markdown Link | Story 3 | `grep -q "LICENSE" README.md` |
| Root `README.md` | `CONTRIBUTING.md` | Markdown Link | Story 3 | `grep -q "CONTRIBUTING" README.md` |
| Root `README.md` | `SECURITY.md` | Markdown Link | Story 3 | `grep -q "SECURITY" README.md` |
| Root `README.md` | `setup.sh` | Referenz | Story 3 | `grep -q "setup.sh" README.md` |
| `CONTRIBUTING.md` | `CODE_OF_CONDUCT.md` | Markdown Link | Story 4 | `grep -q "CODE_OF_CONDUCT" CONTRIBUTING.md` |
| `.gitignore` | `.mcp.json` | Ignore Rule | Story 1 | `grep -q ".mcp.json" .gitignore` |
| `.gitignore` | `config.json` | Ignore Rule | Story 6 | `grep -q "config.json" .gitignore` |
| `package.json` | `LICENSE` | License Field | Story 2 | `grep -q '"license"' agent-os-ui/package.json` |
| `.github/workflows/ci.yml` | `agent-os-ui/package.json` | npm Scripts | Story 7 | `grep -q "npm run lint" .github/workflows/ci.yml` |
| `scripts/prepare-fresh-repo.sh` | `docs/FRESH_REPO_GUIDE.md` | Referenz | Story 8 | `grep -q "FRESH_REPO_GUIDE" scripts/prepare-fresh-repo.sh` |

### Verbindungs-Details

**setup.sh → .mcp.json.example:**
- **Art:** File Copy Operation
- **Schnittstelle:** `cp .mcp.json.example .mcp.json` (wenn .mcp.json nicht existiert)
- **Datenfluss:** Template-Konfiguration wird zur User-Konfiguration
- **Story:** Story 5
- **Validierung:** `grep -q "mcp.json.example" setup.sh`

**Root README.md → LICENSE, CONTRIBUTING.md, SECURITY.md:**
- **Art:** Markdown Link References
- **Schnittstelle:** `[License](LICENSE)`, `[Contributing](CONTRIBUTING.md)`, etc.
- **Datenfluss:** Navigation zwischen Dokumenten
- **Story:** Story 3
- **Validierung:** `grep -q "LICENSE\|CONTRIBUTING\|SECURITY" README.md`

**.github/workflows/ci.yml → agent-os-ui/package.json:**
- **Art:** npm Script Ausführung
- **Schnittstelle:** `npm run lint`, `npm run build`, `npm test`
- **Datenfluss:** CI Pipeline führt definierte Scripts aus
- **Story:** Story 7
- **Validierung:** `grep -q "npm run" .github/workflows/ci.yml`

### Verbindungs-Checkliste
- [x] Jede neue Komponente hat mindestens eine Verbindung definiert
- [x] Jede Verbindung ist einer Story zugeordnet
- [x] Validierungsbefehle sind ausführbar

---

## Abhängigkeiten

### Interne Abhängigkeiten

```
Phase 1 (Security) ──┐
                      ├──> Phase 4 (Setup + Cleanup)
Phase 2 (License) ───┤
                      ├──> Phase 3 (Documentation)
                      │
                      └──> Phase 5 (GitHub + Fresh Repo)
```

Phase 1 und Phase 2 können parallel laufen. Phase 3 hängt von Phase 2 ab (LICENSE muss existieren). Phase 4 hängt von Phase 1 ab (Example-Dateien müssen existieren). Phase 5 hängt von allen vorherigen Phasen ab.

### Externe Abhängigkeiten

| Abhängigkeit | Benötigt für |
|-------------|-------------|
| `agent-os-extended` Repo | Prerequisite-Dokumentation in README |
| Node.js >= 20 | Engines-Feld in package.json |
| `node-pty` native Modul | Kann spezielle Build-Steps in CI benötigen |
| GitHub Repository | Für Issue/PR Templates und GitHub Actions |

---

## Risiken & Mitigationen

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|--------|------------|
| API Key in Git-History | Hoch (existiert bereits) | Kritisch | Story 8: Frisches Repo ohne History; Story 1: `.mcp.json` in `.gitignore`; User rotiert API Key manuell |
| `node-pty` CI Build-Fehler | Mittel | Mittel | CI Workflow installiert `python3` und `build-essential` auf Ubuntu Runners |
| User hat `agent-os-extended` nicht | Mittel | Mittel | `setup.sh` prüft `~/.agent-os/` und gibt klare Fehlermeldung mit Installationslink |
| Hardcodierte Pfade in Spec-History | Niedrig | Niedrig | Spec-Dateien in `agent-os/specs/` enthalten historische absolute Pfade; sind Dokumentations-Artefakte, kein Runtime-Code |
| `.claude/settings.local.json` | Niedrig | Niedrig | Enthält nur MCP Server Enable-Flags, keine Secrets; wird per `.gitignore` geschützt |

---

## Self-Review Ergebnisse

### Validiert

1. **VOLLSTÄNDIGKEIT** - Alle 8 Requirement-Bereiche sind durch Stories abgedeckt:
   - [x] Security Cleanup (Story 1 / Phase 1)
   - [x] License & Legal (Story 2 / Phase 2)
   - [x] Root README & Documentation (Story 3 / Phase 3)
   - [x] Community Files (Story 4 / Phase 3)
   - [x] Setup Script (Story 5 / Phase 4)
   - [x] .gitignore & Repo Cleanup (Story 6 / Phase 4)
   - [x] GitHub Templates & CI/CD (Story 7 / Phase 5)
   - [x] Fresh Repository Preparation (Story 8 / Phase 5)

2. **KONSISTENZ** - Keine Widersprüche:
   - `config.json` ist sowohl git-ignored ALS AUCH hat eine Example-Datei
   - `.mcp.json` ist sowohl git-ignored ALS AUCH hat eine Example-Datei
   - `setup.sh` kopiert Example-Dateien die in Phase 1 erstellt werden
   - Root README referenziert Dateien die in Phasen 2-4 erstellt werden

3. **KOMPONENTEN-VERBINDUNGEN** - Jede neue Komponente hat mindestens eine Verbindung

### Identifizierte Probleme & Lösungen

| Problem | Ursprünglicher Plan | Verbesserung |
|---------|--------------------|--------------|
| `config.json` enthält absolute Pfade | Pfade in config.json ersetzen | `config.json.example` erstellen + `config.json` git-ignoren. `ProjectManager` liest bereits graceful wenn Datei fehlt |
| Kanban-MCP-Server Pfad in `.mcp.json` | Pfad hardcoded lassen | In `.mcp.json.example` durch `$HOME/.agent-os/...` Platzhalter ersetzen |

### Offene Fragen
- Keine

---

## Minimalinvasiv-Optimierungen

### Wiederverwendbare Elemente gefunden

| Element | Gefunden in | Nutzbar für |
|---------|-------------|-------------|
| `.gitignore` Patterns | `agent-os-ui/.gitignore` | Root `.gitignore` erweitert ohne zu duplizieren |
| `download_file()` Muster | `setup-devteam-global.sh` | `setup.sh` folgt ähnlichem Error-Handling Pattern |
| ESLint Strict-Mode Config | `eslint.config.js` | CI Workflow nutzt einfach `npm run lint` |
| `ProjectManager` graceful fallback | `projects.ts` (Zeile 44-47) | Kein Code-Change nötig für config.json Approach |
| README-Struktur | `agent-os-ui/README.md` | Root README erweitert diese Struktur |

### Optimierungen

| Ursprünglich | Optimiert zu | Ersparnis |
|--------------|--------------|-----------|
| Config.json Code ändern | Example-Datei + .gitignore | Kein Applikations-Code betroffen |
| Eigene `.mcp.json` Validierung | `.gitignore` + Example | Kein Custom-Code nötig |
| Neue Test-Infrastruktur für CI | Bestehende npm Scripts nutzen | CI nutzt `npm run lint/build/test` |

### Feature-Preservation bestätigt
- [x] Alle Requirements aus Clarification sind abgedeckt
- [x] Kein Feature wurde geopfert
- [x] Alle Akzeptanzkriterien bleiben erfüllbar

**Feature-Preservation Details:**

| Feature | Status | Verifikation |
|---------|--------|-------------|
| Express Backend Server | ERHALTEN | `index.ts` wird nicht modifiziert |
| WebSocket Kommunikation | ERHALTEN | Keine Protokoll-Änderungen |
| Lit Frontend Komponenten | ERHALTEN | Keine Komponenten-Änderungen |
| Projekt-Management (config.json) | ERHALTEN | `ProjectManager` liest config.json vom gleichen Pfad |
| Chat mit Claude | ERHALTEN | Keine Änderungen an `claude-handler.ts` |
| Workflow Execution | ERHALTEN | Keine Änderungen an `workflow-executor.ts` |
| Cloud Terminal | ERHALTEN | Keine Änderungen an Terminal-Komponenten |
| Git Integration | ERHALTEN | Keine Änderungen an Git Service/Protocol |
| Kanban Boards | ERHALTEN | Keine Änderungen an specs-reader |
| Agent OS Specs/Knowledge | ERHALTEN | `agent-os/` Verzeichnis bleibt intakt |

---

## Nächste Schritte

Nach Genehmigung dieses Plans:
1. Step 2.6: User Stories aus diesem Plan ableiten
2. Step 3: Architect fügt technische Details hinzu
3. Step 4: Spec ready for execution
