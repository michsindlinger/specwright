# GitHub Templates & CI/CD

> Story ID: OSR-007
> Spec: Open Source Ready
> Created: 2026-02-11
> Last Updated: 2026-02-11

**Priority**: Medium
**Type**: DevOps
**Estimated Effort**: 2 SP
**Dependencies**: OSR-002, OSR-006

---

## Feature

```gherkin
Feature: GitHub Templates & CI/CD
  Als Open-Source-Maintainer
  möchte ich standardisierte Issue/PR Templates und eine CI/CD Pipeline haben,
  damit Contributions einheitlich formatiert sind und automatisch auf Qualität geprüft werden.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Bug Report Template

```gherkin
Scenario: Contributor erstellt einen strukturierten Bug Report
  Given ich möchte einen Bug im Projekt melden
  When ich auf GitHub ein neues Issue erstelle
  Then sehe ich ein "Bug Report" Template
  And das Template enthält Sections für "Describe the bug", "To Reproduce", "Expected behavior" und "Environment"
```

### Szenario 2: Feature Request Template

```gherkin
Scenario: Nutzer schlägt ein neues Feature vor
  Given ich habe eine Idee für ein neues Feature
  When ich auf GitHub ein neues Issue erstelle
  Then sehe ich ein "Feature Request" Template
  And das Template enthält Sections für "Problem", "Proposed solution" und "Alternatives considered"
```

### Szenario 3: Pull Request Template

```gherkin
Scenario: Contributor erstellt einen strukturierten Pull Request
  Given ich habe Code-Änderungen vorbereitet
  When ich einen neuen Pull Request erstelle
  Then sehe ich ein PR Template mit Description, Type of change und Checklist
  And die Checklist enthält Items für Tests, Lint und Dokumentation
```

### Szenario 4: CI/CD Pipeline

```gherkin
Scenario: Code-Qualität wird automatisch geprüft
  Given ein Contributor erstellt einen Pull Request gegen main
  When die CI Pipeline startet
  Then werden Lint, Build und Tests für Node.js 20 und 22 ausgeführt
  And native Dependencies wie node-pty werden korrekt gebaut
```

---

## Technische Verifikation (Automated Checks)

- [ ] FILE_EXISTS: `.github/ISSUE_TEMPLATE/bug_report.md`
- [ ] FILE_EXISTS: `.github/ISSUE_TEMPLATE/feature_request.md`
- [ ] FILE_EXISTS: `.github/PULL_REQUEST_TEMPLATE.md`
- [ ] FILE_EXISTS: `.github/workflows/ci.yml`
- [ ] CONTAINS: `.github/ISSUE_TEMPLATE/bug_report.md` enthält "name:"
- [ ] CONTAINS: `.github/ISSUE_TEMPLATE/feature_request.md` enthält "name:"
- [ ] CONTAINS: `.github/workflows/ci.yml` enthält "npm run lint"
- [ ] CONTAINS: `.github/workflows/ci.yml` enthält "npm run build"

---

## Required MCP Tools

Keine MCP Tools erforderlich.

---

## Technisches Refinement (vom Architect)

> **Ausgefüllt vom Architect am 2026-02-11**

**WER:** Claude Code Agent

**Relevante Skills:** N/A - no skill-index.md available

### DoR (Definition of Ready) - Vom Architect

#### Fachliche Anforderungen
- [x] Fachliche requirements klar definiert - Issue/PR Templates und GitHub Actions CI/CD Pipeline erstellen
- [x] Akzeptanzkriterien sind spezifisch und prüfbar - 4 Gherkin-Szenarien mit konkreten Template-Sections und CI-Steps
- [x] Business Value verstanden - Einheitliche Contributions und automatische Qualitaetssicherung

#### Technische Vorbereitung
- [x] Technischer Ansatz definiert (WAS/WIE/WO) - siehe unten
- [x] Abhängigkeiten identifiziert - OSR-002 (License fuer CI), OSR-006 (.gitignore muss fertig sein)
- [x] Betroffene Komponenten bekannt - 4 neue Dateien im .github/ Verzeichnis
- [x] Erforderliche MCP Tools dokumentiert (falls zutreffend) - Keine MCP Tools noetig
- [x] Story ist angemessen geschätzt (max 5 Dateien, 400 LOC) - 4 Dateien, ca. 200 LOC

#### Full-Stack Konsistenz (NEU)
- [x] **Alle betroffenen Layer identifiziert** - Nur DevOps/GitHub Layer
- [x] **Integration Type bestimmt** - DevOps-only
- [x] **Kritische Integration Points dokumentiert** (wenn Full-stack) - Nicht zutreffend (kein App-Code)
- [x] **Handover-Dokumente definiert** (bei Multi-Layer) - Nicht zutreffend (Single-Layer)

**Story ist READY wenn alle Checkboxen angehakt sind.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [ ] Code implementiert und folgt Style Guide
- [ ] Architektur-Vorgaben eingehalten (WIE section)

#### Qualitätssicherung
- [ ] Alle Akzeptanzkriterien erfüllt (via Completion Check verifiziert)
- [ ] Code Review durchgeführt und genehmigt

#### Dokumentation
- [ ] Dokumentation aktualisiert
- [ ] Completion Check Commands alle erfolgreich (exit 0)

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** DevOps-only

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| GitHub | `.github/ISSUE_TEMPLATE/bug_report.md` (Neu) | Bug Report Issue Template mit YAML Frontmatter |
| GitHub | `.github/ISSUE_TEMPLATE/feature_request.md` (Neu) | Feature Request Issue Template mit YAML Frontmatter |
| GitHub | `.github/PULL_REQUEST_TEMPLATE.md` (Neu) | PR Template mit Checklist |
| DevOps | `.github/workflows/ci.yml` (Neu) | GitHub Actions CI Pipeline |

---

### Technical Details

**WAS:**
1. `.github/ISSUE_TEMPLATE/bug_report.md` erstellen: Strukturiertes Bug Report Template
2. `.github/ISSUE_TEMPLATE/feature_request.md` erstellen: Feature Request Template
3. `.github/PULL_REQUEST_TEMPLATE.md` erstellen: PR Template mit Description, Type of Change, Checklist
4. `.github/workflows/ci.yml` erstellen: CI Pipeline die Lint, Build und Test ausfuehrt

**WIE (Architektur-Guidance ONLY):**
- Issue Templates: YAML Frontmatter mit `name:`, `about:`, `labels:` verwenden (GitHub Standard). Bug Report: Sektionen "Describe the bug", "To Reproduce", "Expected behavior", "Environment". Feature Request: Sektionen "Problem", "Proposed solution", "Alternatives considered".
- PR Template: Markdown mit Description-Bereich, Type-of-Change Checkboxen (Bug fix, New feature, Breaking change, Documentation), Checklist (Tests, Lint, Documentation). Keine YAML Frontmatter (PR Templates verwenden kein Frontmatter).
- CI Workflow: GitHub Actions mit `on: [push, pull_request]` fuer `main` Branch. Matrix-Strategie fuer Node.js 20 und 22. Steps: Checkout, Node.js Setup, `npm install` (im `agent-os-ui/` Verzeichnis), `npm install` (im `agent-os-ui/ui/` Verzeichnis), `npm run lint`, `npm run build:ui`, `npm test`. WICHTIG: `node-pty` benoetigt native Build-Tools auf Ubuntu - `python3` und `build-essential` muessen installiert werden (via `apt-get`). Working directory fuer npm-Befehle ist `agent-os-ui/`.
- Bestehende npm Scripts nutzen: `lint`, `build:ui`, `test` (siehe `agent-os-ui/package.json`)

**WO:**
- `/.github/ISSUE_TEMPLATE/bug_report.md` (Neu erstellen)
- `/.github/ISSUE_TEMPLATE/feature_request.md` (Neu erstellen)
- `/.github/PULL_REQUEST_TEMPLATE.md` (Neu erstellen)
- `/.github/workflows/ci.yml` (Neu erstellen)

**Abhängigkeiten:** OSR-002, OSR-006

**Geschätzte Komplexität:** S

---

### Creates Reusable Artifacts

**Creates Reusable:** no

---

### Completion Check

```bash
# Verify all GitHub template files exist
test -f .github/ISSUE_TEMPLATE/bug_report.md && \
test -f .github/ISSUE_TEMPLATE/feature_request.md && \
test -f .github/PULL_REQUEST_TEMPLATE.md && \
test -f .github/workflows/ci.yml && \
echo "PASS: All GitHub files exist" || { echo "FAIL: Missing GitHub files"; exit 1; }

# Verify issue templates have frontmatter
grep -q "name:" .github/ISSUE_TEMPLATE/bug_report.md && \
grep -q "name:" .github/ISSUE_TEMPLATE/feature_request.md && \
echo "PASS: Issue templates have frontmatter" || { echo "FAIL: Issue template frontmatter"; exit 1; }

# Verify CI workflow has required steps
grep -q "npm run lint" .github/workflows/ci.yml && \
grep -q "npm run build" .github/workflows/ci.yml && \
echo "PASS: CI workflow steps" || { echo "FAIL: CI workflow steps"; exit 1; }
```
