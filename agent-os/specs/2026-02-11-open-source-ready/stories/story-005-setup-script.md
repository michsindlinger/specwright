# Setup Script

> Story ID: OSR-005
> Spec: Open Source Ready
> Created: 2026-02-11
> Last Updated: 2026-02-11

**Priority**: High
**Type**: DevOps
**Estimated Effort**: 2 SP
**Dependencies**: OSR-001

---

## Feature

```gherkin
Feature: Setup Script
  Als neuer Entwickler
  möchte ich ein automatisiertes Setup-Script ausführen können,
  damit ich das Projekt schnell und fehlerfrei einrichten kann ohne die gesamte Dokumentation lesen zu müssen.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Erfolgreicher Setup-Durchlauf

```gherkin
Scenario: Neuer Entwickler richtet Projekt erfolgreich ein
  Given ich habe Node.js 20+ und npm installiert
  And ich habe das Repository geklont
  When ich "./setup.sh" ausführe
  Then werden alle npm Dependencies installiert (Backend und Frontend)
  And .mcp.json wird aus .mcp.json.example kopiert (wenn nicht vorhanden)
  And config.json wird aus config.json.example kopiert (wenn nicht vorhanden)
  And ich sehe Quick-Start Hinweise zum Starten des Dev Servers
```

### Szenario 2: Node.js Version zu alt

```gherkin
Scenario: Setup-Script erkennt veraltete Node.js Version
  Given meine Node.js Version ist älter als 20
  When ich "./setup.sh" ausführe
  Then sehe ich eine klare Fehlermeldung "Node.js 20+ required"
  And das Script bricht ab ohne Änderungen vorzunehmen
```

### Szenario 3: agent-os-extended nicht installiert

```gherkin
Scenario: Setup-Script warnt bei fehlendem agent-os-extended
  Given ich habe agent-os-extended nicht installiert
  When ich "./setup.sh" ausführe
  Then sehe ich einen Hinweis dass agent-os-extended benötigt wird
  And ich sehe einen Link zur Installation
  And die restliche Installation läuft trotzdem durch
```

### Szenario 4: Bestehende Config wird nicht überschrieben

```gherkin
Scenario: Setup überschreibt keine bestehende Konfiguration
  Given ich habe bereits eine .mcp.json mit meinen API Keys konfiguriert
  When ich "./setup.sh" erneut ausführe
  Then bleibt meine bestehende .mcp.json unverändert
  And ich sehe einen Hinweis "Config already exists, skipping"
```

---

## Technische Verifikation (Automated Checks)

- [ ] FILE_EXISTS: `setup.sh`
- [ ] CONTAINS: `setup.sh` enthält "mcp.json.example"
- [ ] CONTAINS: `setup.sh` enthält "config.json.example"
- [ ] CONTAINS: `setup.sh` enthält "node -v" oder "node --version"
- [ ] CONTAINS: `setup.sh` enthält "npm install"

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
- [x] Fachliche requirements klar definiert - Setup Script fuer automatisierte Projekteinrichtung
- [x] Akzeptanzkriterien sind spezifisch und prüfbar - 4 Gherkin-Szenarien mit konkreten Pruefungen und Ausgaben
- [x] Business Value verstanden - Niedrige Einstiegshuerde fuer neue Entwickler

#### Technische Vorbereitung
- [x] Technischer Ansatz definiert (WAS/WIE/WO) - siehe unten
- [x] Abhängigkeiten identifiziert - OSR-001 (Example-Dateien muessen existieren)
- [x] Betroffene Komponenten bekannt - 1 neues Shell-Script
- [x] Erforderliche MCP Tools dokumentiert (falls zutreffend) - Keine MCP Tools noetig
- [x] Story ist angemessen geschätzt (max 5 Dateien, 400 LOC) - 1 Datei, ca. 120 LOC

#### Full-Stack Konsistenz (NEU)
- [x] **Alle betroffenen Layer identifiziert** - Nur DevOps Layer
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
| DevOps | `setup.sh` (Neu) | Automatisiertes Setup-Script im Repository-Root |

---

### Technical Details

**WAS:**
1. `setup.sh` im Repository-Root erstellen: Automatisiertes Setup-Script das Prerequisites prueft, Dependencies installiert und Example-Dateien kopiert

**WIE (Architektur-Guidance ONLY):**
- `setup.sh`: Bash-Script mit `#!/bin/bash` und `set -e`. Fehlerbehandlung nach dem Muster der bestehenden `setup-devteam-global.sh` (farbige Ausgabe, klare Fehlermeldungen). Script-Struktur in dieser Reihenfolge:
  1. Node.js Version pruefen (>= 20, via `node -v` parsen)
  2. npm Verfuegbarkeit pruefen
  3. `~/.agent-os/` Verzeichnis pruefen (agent-os-extended); bei Fehlen: Warnung + Link ausgeben, aber NICHT abbrechen
  4. `npm install` im `agent-os-ui/` Verzeichnis ausfuehren
  5. `npm install` im `agent-os-ui/ui/` Verzeichnis ausfuehren
  6. `.mcp.json.example` nach `.mcp.json` kopieren (nur wenn `.mcp.json` nicht existiert, sonst "Config already exists, skipping")
  7. `agent-os-ui/config.json.example` nach `agent-os-ui/config.json` kopieren (nur wenn `config.json` nicht existiert)
  8. Quick-Start Hinweise ausgeben (Backend- und Frontend-Startbefehle)
- Script muss executable sein (`chmod +x setup.sh`)
- Alle Pfade relativ zum Script-Verzeichnis (via `cd "$(dirname "$0")"`)

**WO:**
- `/setup.sh` (Neu erstellen)

**Abhängigkeiten:** OSR-001

**Geschätzte Komplexität:** S

---

### Creates Reusable Artifacts

**Creates Reusable:** no

---

### Completion Check

```bash
# Verify setup.sh exists and is executable
test -f setup.sh && \
test -x setup.sh && \
echo "PASS: setup.sh exists and executable" || { echo "FAIL: setup.sh missing or not executable"; exit 1; }

# Verify setup.sh references example files and contains key operations
grep -q "mcp.json.example" setup.sh && \
grep -q "config.json.example" setup.sh && \
grep -q "npm install" setup.sh && \
grep -q "node" setup.sh && \
echo "PASS: setup.sh content" || { echo "FAIL: setup.sh content"; exit 1; }
```
