# License & Legal Files

> Story ID: OSR-002
> Spec: Open Source Ready
> Created: 2026-02-11
> Last Updated: 2026-02-11

**Priority**: High
**Type**: DevOps
**Estimated Effort**: 1 SP
**Dependencies**: None

---

## Feature

```gherkin
Feature: License & Legal Files
  Als Open-Source-Nutzer
  möchte ich eine klare MIT-Lizenz im Repository vorfinden,
  damit ich weiß unter welchen Bedingungen ich die Software nutzen, modifizieren und verteilen darf.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: MIT LICENSE Datei vorhanden

```gherkin
Scenario: Repository enthält eine MIT LICENSE Datei
  Given ich besuche das Repository zum ersten Mal
  When ich die LICENSE Datei im Root-Verzeichnis öffne
  Then sehe ich den vollständigen MIT-Lizenztext
  And das Copyright Jahr ist "2026"
  And der Copyright-Holder ist "Agent OS Contributors"
```

### Szenario 2: Package.json enthält License-Feld

```gherkin
Scenario: Backend package.json enthält Lizenz-Informationen
  Given ich öffne die agent-os-ui/package.json
  When ich nach dem License-Feld schaue
  Then sehe ich "license": "MIT"
  And ich sehe ein "repository" Feld mit der GitHub-URL
```

### Szenario 3: Frontend package.json enthält License-Feld

```gherkin
Scenario: Frontend package.json enthält Lizenz-Information
  Given ich öffne die agent-os-ui/ui/package.json
  When ich nach dem License-Feld schaue
  Then sehe ich "license": "MIT"
```

---

## Technische Verifikation (Automated Checks)

- [ ] FILE_EXISTS: `LICENSE`
- [ ] CONTAINS: `LICENSE` enthält "MIT License"
- [ ] CONTAINS: `LICENSE` enthält "2026"
- [ ] CONTAINS: `LICENSE` enthält "Agent OS Contributors"
- [ ] CONTAINS: `agent-os-ui/package.json` enthält `"license": "MIT"`
- [ ] CONTAINS: `agent-os-ui/package.json` enthält `"repository"`
- [ ] CONTAINS: `agent-os-ui/ui/package.json` enthält `"license": "MIT"`

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
- [x] Fachliche requirements klar definiert - MIT LICENSE erstellen, package.json Felder ergaenzen
- [x] Akzeptanzkriterien sind spezifisch und prüfbar - 3 Gherkin-Szenarien mit konkreten Feldnamen und Werten
- [x] Business Value verstanden - Rechtliche Grundlage fuer Open-Source-Nutzung

#### Technische Vorbereitung
- [x] Technischer Ansatz definiert (WAS/WIE/WO) - siehe unten
- [x] Abhängigkeiten identifiziert - Keine
- [x] Betroffene Komponenten bekannt - LICENSE (neu), 2x package.json
- [x] Erforderliche MCP Tools dokumentiert (falls zutreffend) - Keine MCP Tools noetig
- [x] Story ist angemessen geschätzt (max 5 Dateien, 400 LOC) - 3 Dateien, ca. 30 LOC

#### Full-Stack Konsistenz (NEU)
- [x] **Alle betroffenen Layer identifiziert** - Nur DevOps/Legal Layer
- [x] **Integration Type bestimmt** - DevOps-only
- [x] **Kritische Integration Points dokumentiert** (wenn Full-stack) - Nicht zutreffend (kein App-Code)
- [x] **Handover-Dokumente definiert** (bei Multi-Layer) - Nicht zutreffend (Single-Layer)

**Story ist READY wenn alle Checkboxen angehakt sind.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [ ] Code implementiert und folgt Style Guide
- [ ] Architektur-Vorgaben eingehalten (WIE section)
- [ ] Security/Performance Anforderungen erfüllt

#### Qualitätssicherung
- [ ] Alle Akzeptanzkriterien erfüllt (via Completion Check verifiziert)
- [ ] Code Review durchgeführt und genehmigt

#### Dokumentation
- [ ] Dokumentation aktualisiert
- [ ] Keine Linting Errors
- [ ] Completion Check Commands alle erfolgreich (exit 0)

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** DevOps-only

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Legal | `LICENSE` (Neu) | MIT Lizenz-Datei im Repository-Root |
| Config | `agent-os-ui/package.json` | Felder `license`, `repository`, `homepage`, `bugs` hinzufuegen |
| Config | `agent-os-ui/ui/package.json` | Feld `license` hinzufuegen |

---

### Technical Details

**WAS:**
1. `LICENSE` Datei im Repository-Root mit vollstaendigem MIT-Lizenztext erstellen
2. `agent-os-ui/package.json` um Metadata-Felder erweitern: `license`, `repository`, `homepage`, `bugs`
3. `agent-os-ui/ui/package.json` um `license` Feld erweitern

**WIE (Architektur-Guidance ONLY):**
- `LICENSE`: Standard MIT License Template verwenden. Copyright Year: 2026. Copyright Holder: "Agent OS Contributors". Vollstaendiger MIT-Text (Permission notice + Warranty disclaimer).
- `agent-os-ui/package.json`: Neue Felder nach dem bestehenden `engines` Block einfuegen. `repository` Feld als Objekt mit `type: "git"` und `url`. `homepage` und `bugs` als GitHub-URLs. GitHub-URL Platzhalter verwenden, da das finale Repository noch nicht existiert (z.B. `https://github.com/agent-os-contributors/agent-os-web-ui`).
- `agent-os-ui/ui/package.json`: Nur `"license": "MIT"` nach dem `engines` Block einfuegen. Minimale Aenderung.

**WO:**
- `/LICENSE` (Neu erstellen)
- `/agent-os-ui/package.json` (Erweitern)
- `/agent-os-ui/ui/package.json` (Erweitern)

**Abhängigkeiten:** None

**Geschätzte Komplexität:** XS

---

### Creates Reusable Artifacts

**Creates Reusable:** no

---

### Completion Check

```bash
# Verify LICENSE exists with correct content
test -f LICENSE && \
grep -q "MIT License" LICENSE && \
grep -q "2026" LICENSE && \
grep -q "Agent OS Contributors" LICENSE && \
echo "PASS: LICENSE" || { echo "FAIL: LICENSE"; exit 1; }

# Verify agent-os-ui/package.json has license and repository fields
grep -q '"license"' agent-os-ui/package.json && \
grep -q '"repository"' agent-os-ui/package.json && \
echo "PASS: agent-os-ui/package.json" || { echo "FAIL: agent-os-ui/package.json"; exit 1; }

# Verify agent-os-ui/ui/package.json has license field
grep -q '"license"' agent-os-ui/ui/package.json && \
echo "PASS: agent-os-ui/ui/package.json" || { echo "FAIL: agent-os-ui/ui/package.json"; exit 1; }
```
