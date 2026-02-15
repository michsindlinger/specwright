# .gitignore & Repo Cleanup

> Story ID: OSR-006
> Spec: Open Source Ready
> Created: 2026-02-11
> Last Updated: 2026-02-11

**Priority**: Medium
**Type**: DevOps
**Estimated Effort**: 1 SP
**Dependencies**: OSR-001

---

## Feature

```gherkin
Feature: .gitignore & Repo Cleanup
  Als Repository-Maintainer
  möchte ich alle temporären und user-spezifischen Dateien per .gitignore ausschließen und überflüssige Verzeichnisse entfernen,
  damit das Repository sauber und frei von Artefakten ist.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: config.json ist git-ignored

```gherkin
Scenario: User-spezifische Konfiguration wird nicht getrackt
  Given ich habe eine agent-os-ui/config.json mit meinen Projektpfaden
  When ich "git status" ausführe
  Then erscheint config.json nicht als untracked oder modified
```

### Szenario 2: Temporäre Verzeichnisse entfernt

```gherkin
Scenario: Überflüssige Verzeichnisse existieren nicht mehr
  Given das Repository enthielt scratchpad/ und temp_specs_backup/
  When ich das aktuelle Repository überprüfe
  Then existiert kein scratchpad/ Verzeichnis mehr
  And existiert kein temp_specs_backup/ Verzeichnis mehr
```

### Szenario 3: .gitignore enthält alle Schutz-Einträge

```gherkin
Scenario: Alle sensitiven Muster sind in .gitignore
  Given ich öffne die .gitignore Datei
  When ich die Einträge überprüfe
  Then finde ich "agent-os-ui/config.json"
  And finde ich "scratchpad/"
  And finde ich "temp_specs_backup/"
```

---

## Technische Verifikation (Automated Checks)

- [ ] CONTAINS: `.gitignore` enthält "agent-os-ui/config.json"
- [ ] CONTAINS: `.gitignore` enthält "scratchpad/"
- [ ] CONTAINS: `.gitignore` enthält "temp_specs_backup/"
- [ ] FILE_NOT_EXISTS: `scratchpad/` (Verzeichnis soll entfernt sein)
- [ ] FILE_NOT_EXISTS: `temp_specs_backup/` (Verzeichnis soll entfernt sein)

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
- [x] Fachliche requirements klar definiert - .gitignore erweitern, temporaere Verzeichnisse entfernen
- [x] Akzeptanzkriterien sind spezifisch und prüfbar - 3 Gherkin-Szenarien mit konkreten Eintraegen und Verzeichnisnamen
- [x] Business Value verstanden - Sauberes Repository ohne Artefakte und user-spezifische Dateien

#### Technische Vorbereitung
- [x] Technischer Ansatz definiert (WAS/WIE/WO) - siehe unten
- [x] Abhängigkeiten identifiziert - OSR-001 (Security-Eintraege in .gitignore muessen bereits vorhanden sein)
- [x] Betroffene Komponenten bekannt - .gitignore (Erweiterung), 2 Verzeichnisse (Loeschung)
- [x] Erforderliche MCP Tools dokumentiert (falls zutreffend) - Keine MCP Tools noetig
- [x] Story ist angemessen geschätzt (max 5 Dateien, 400 LOC) - 1 Datei + 2 Verzeichnis-Loeschungen, ca. 10 LOC

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
- [ ] Keine Linting Errors
- [ ] Completion Check Commands alle erfolgreich (exit 0)

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** DevOps-only

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| DevOps | `.gitignore` (Root) | Erweitern um config.json, scratchpad/, temp_specs_backup/ |
| DevOps | `scratchpad/` | Verzeichnis entfernen |
| DevOps | `temp_specs_backup/` | Verzeichnis entfernen |

---

### Technical Details

**WAS:**
1. `.gitignore` erweitern um: `agent-os-ui/config.json`, `scratchpad/`, `temp_specs_backup/`
2. `scratchpad/` Verzeichnis aus dem Repository entfernen
3. `temp_specs_backup/` Verzeichnis aus dem Repository entfernen

**WIE (Architektur-Guidance ONLY):**
- `.gitignore`: Neue Eintraege am Ende der Datei unter einem neuen Kommentar-Block `# User-specific configuration` und `# Temporary directories` hinzufuegen. HINWEIS: `.mcp.json` und `.claude/settings.local.json` wurden bereits in OSR-001 hinzugefuegt - NICHT duplizieren. Nur die hier genannten 3 Eintraege hinzufuegen. Bestehende Patterns in der .gitignore pruefen um Duplikate zu vermeiden.
- `scratchpad/`: Verzeichnis per `git rm -r` aus Git-Tracking entfernen und physisch loeschen. Dieses Verzeichnis existiert aktuell noch im Repository.
- `temp_specs_backup/`: Gleich wie scratchpad/ - per `git rm -r` entfernen. Dieses Verzeichnis existiert aktuell noch im Repository.
- WICHTIG: `config.json` muss als `agent-os-ui/config.json` in der .gitignore stehen (relativer Pfad vom Repository-Root).

**WO:**
- `/.gitignore` (Erweitern)
- `/scratchpad/` (Loeschen)
- `/temp_specs_backup/` (Loeschen)

**Abhängigkeiten:** OSR-001

**Geschätzte Komplexität:** XS

---

### Creates Reusable Artifacts

**Creates Reusable:** no

---

### Completion Check

```bash
# Verify .gitignore contains required entries
grep -q "agent-os-ui/config.json" .gitignore && \
grep -q "scratchpad/" .gitignore && \
grep -q "temp_specs_backup/" .gitignore && \
echo "PASS: .gitignore entries" || { echo "FAIL: .gitignore entries"; exit 1; }

# Verify temporary directories are removed
! test -d scratchpad && \
! test -d temp_specs_backup && \
echo "PASS: temp directories removed" || { echo "FAIL: temp directories still exist"; exit 1; }
```
