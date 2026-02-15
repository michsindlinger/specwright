# Fresh Repository Preparation

> Story ID: OSR-008
> Spec: Open Source Ready
> Created: 2026-02-11
> Last Updated: 2026-02-11

**Priority**: Medium
**Type**: DevOps
**Estimated Effort**: 2 SP
**Dependencies**: OSR-001, OSR-002, OSR-003, OSR-004, OSR-005, OSR-006, OSR-007

---

## Feature

```gherkin
Feature: Fresh Repository Preparation
  Als Repository-Maintainer
  möchte ich ein Script und eine Anleitung zum Erstellen eines frischen Repositories ohne belastete Git-History haben,
  damit das veröffentlichte Repository keine API Keys oder Secrets in der Commit-History enthält.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Fresh-Repo Script erstellt saubere Kopie

```gherkin
Scenario: Maintainer erstellt ein frisches Repository
  Given alle vorherigen Open-Source Stories sind abgeschlossen
  When ich "scripts/prepare-fresh-repo.sh" ausführe
  Then wird eine saubere Kopie des Repos erstellt (ohne .git/, node_modules/, .mcp.json, config.json)
  And ein neues Git-Repository wird initialisiert
  And ein Initial Commit wird erstellt
  And ich sehe Hinweise für Remote-Setup und Push
```

### Szenario 2: Script mit benutzerdefiniertem Zielverzeichnis

```gherkin
Scenario: Maintainer gibt ein eigenes Zielverzeichnis an
  Given ich möchte das frische Repo an einem bestimmten Ort erstellen
  When ich "scripts/prepare-fresh-repo.sh /tmp/my-release" ausführe
  Then wird die saubere Kopie unter "/tmp/my-release" erstellt
```

### Szenario 3: Anleitung für manuelle Alternative

```gherkin
Scenario: Maintainer bevorzugt manuellen Prozess
  Given ich möchte den Prozess manuell durchführen
  When ich die docs/FRESH_REPO_GUIDE.md öffne
  Then sehe ich eine Schritt-für-Schritt Anleitung
  And ich sehe warum ein frisches Repo nötig ist (History enthält Secrets)
  And ich sehe eine Post-Push Checkliste (API Key rotieren, etc.)
```

### Edge Case: Zielverzeichnis existiert bereits

```gherkin
Scenario: Zielverzeichnis existiert bereits
  Given das Zielverzeichnis "../agent-os-web-ui-release" existiert bereits
  When ich "scripts/prepare-fresh-repo.sh" ausführe
  Then sehe ich eine Warnung dass das Verzeichnis bereits existiert
  And das Script fragt ob ich fortfahren möchte
```

---

## Technische Verifikation (Automated Checks)

- [ ] FILE_EXISTS: `scripts/prepare-fresh-repo.sh`
- [ ] FILE_EXISTS: `docs/FRESH_REPO_GUIDE.md`
- [ ] CONTAINS: `scripts/prepare-fresh-repo.sh` enthält "git init"
- [ ] CONTAINS: `scripts/prepare-fresh-repo.sh` enthält "FRESH_REPO_GUIDE"
- [ ] CONTAINS: `docs/FRESH_REPO_GUIDE.md` enthält "API Key" oder "Secrets"
- [ ] CONTAINS: `docs/FRESH_REPO_GUIDE.md` enthält "Post-Push" oder "Checkliste"

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
- [x] Fachliche requirements klar definiert - Script und Anleitung fuer frisches Repository ohne History-Secrets
- [x] Akzeptanzkriterien sind spezifisch und prüfbar - 4 Gherkin-Szenarien mit konkreten Script-Optionen und Dokumentations-Inhalten
- [x] Business Value verstanden - Sichere Veroeffentlichung ohne API Keys in Git-History

#### Technische Vorbereitung
- [x] Technischer Ansatz definiert (WAS/WIE/WO) - siehe unten
- [x] Abhängigkeiten identifiziert - Alle vorherigen Stories (OSR-001 bis OSR-007)
- [x] Betroffene Komponenten bekannt - 1 Script, 1 Dokumentation
- [x] Erforderliche MCP Tools dokumentiert (falls zutreffend) - Keine MCP Tools noetig
- [x] Story ist angemessen geschätzt (max 5 Dateien, 400 LOC) - 2 Dateien, ca. 150 LOC

#### Full-Stack Konsistenz (NEU)
- [x] **Alle betroffenen Layer identifiziert** - Nur DevOps/Docs Layer
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
| DevOps | `scripts/prepare-fresh-repo.sh` (Neu) | Script zum Erstellen eines sauberen Repos ohne History |
| Docs | `docs/FRESH_REPO_GUIDE.md` (Neu) | Anleitung fuer manuellen und automatisierten Prozess |

---

### Technical Details

**WAS:**
1. `scripts/prepare-fresh-repo.sh` erstellen: Script das eine saubere Kopie des Repos erstellt, sensitive Dateien ausschliesst, `git init` + Initial Commit durchfuehrt
2. `docs/FRESH_REPO_GUIDE.md` erstellen: Schritt-fuer-Schritt Anleitung warum und wie ein frisches Repo erstellt wird, plus Post-Push Checkliste

**WIE (Architektur-Guidance ONLY):**
- `scripts/prepare-fresh-repo.sh`: Bash-Script mit `#!/bin/bash` und `set -e`. Akzeptiert optionales Argument fuer Zielverzeichnis (Default: `../agent-os-web-ui-release`). Prueft ob Zielverzeichnis existiert und fragt Benutzer (interaktiv). Verwendet `rsync` oder `cp -r` zum Kopieren und schliesst aus: `.git/`, `node_modules/`, `.mcp.json`, `agent-os-ui/config.json`, `scratchpad/`, `temp_specs_backup/`, `.claude/settings.local.json`. Im Zielverzeichnis: `git init`, `git add .`, `git commit -m "Initial commit: Agent OS Web UI"`. Gibt Hinweise fuer Remote-Setup (`git remote add origin ...` und `git push`). Referenziert `docs/FRESH_REPO_GUIDE.md` fuer Details. Script muss executable sein.
- `docs/FRESH_REPO_GUIDE.md`: Erklaert warum ein frisches Repo noetig ist (API Keys in History). Automatisierter Weg (Verweis auf Script). Manueller Weg (Schritt-fuer-Schritt). Post-Push Checkliste: API Key rotieren, Repository-Settings pruefen, Branch Protection einrichten, Collaborators einladen.
- Verzeichnisse `scripts/` und `docs/` muessen ggf. erstellt werden.

**WO:**
- `/scripts/prepare-fresh-repo.sh` (Neu erstellen)
- `/docs/FRESH_REPO_GUIDE.md` (Neu erstellen)

**Abhängigkeiten:** OSR-001, OSR-002, OSR-003, OSR-004, OSR-005, OSR-006, OSR-007

**Geschätzte Komplexität:** S

---

### Creates Reusable Artifacts

**Creates Reusable:** no

---

### Completion Check

```bash
# Verify scripts/prepare-fresh-repo.sh exists and is executable
test -f scripts/prepare-fresh-repo.sh && \
test -x scripts/prepare-fresh-repo.sh && \
echo "PASS: prepare-fresh-repo.sh exists and executable" || { echo "FAIL: prepare-fresh-repo.sh"; exit 1; }

# Verify script contains required operations
grep -q "git init" scripts/prepare-fresh-repo.sh && \
grep -q "FRESH_REPO_GUIDE" scripts/prepare-fresh-repo.sh && \
echo "PASS: prepare-fresh-repo.sh content" || { echo "FAIL: prepare-fresh-repo.sh content"; exit 1; }

# Verify docs/FRESH_REPO_GUIDE.md exists with required content
test -f docs/FRESH_REPO_GUIDE.md && \
grep -qi "API Key\|Secrets\|secrets" docs/FRESH_REPO_GUIDE.md && \
grep -qi "Post-Push\|Checkliste\|checklist" docs/FRESH_REPO_GUIDE.md && \
echo "PASS: FRESH_REPO_GUIDE.md" || { echo "FAIL: FRESH_REPO_GUIDE.md"; exit 1; }
```
