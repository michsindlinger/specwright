# Community Files

> Story ID: OSR-004
> Spec: Open Source Ready
> Created: 2026-02-11
> Last Updated: 2026-02-11

**Priority**: High
**Type**: Docs
**Estimated Effort**: 2 SP
**Dependencies**: None

---

## Feature

```gherkin
Feature: Community Files
  Als potenzieller Contributor
  möchte ich klare Richtlinien für Beiträge, Verhaltensregeln und Sicherheitsmeldungen finden,
  damit ich weiß wie ich zum Projekt beitragen kann und was erwartet wird.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: CONTRIBUTING.md mit Development Setup

```gherkin
Scenario: Contributor findet klare Anleitung zum Beitragen
  Given ich möchte zum Agent OS Web UI Projekt beitragen
  When ich die CONTRIBUTING.md öffne
  Then sehe ich ein Development Setup (Prerequisites, Fork & Clone, npm install)
  And ich sehe Code Style Guidelines (TypeScript strict, ESLint, aos- Prefix)
  And ich sehe den PR Process (Fork, Branch, Implement, Test, PR)
```

### Szenario 2: CONTRIBUTING.md verlinkt Code of Conduct

```gherkin
Scenario: CONTRIBUTING.md verweist auf Verhaltensregeln
  Given ich lese die CONTRIBUTING.md
  When ich nach Community-Standards suche
  Then finde ich einen Link zur CODE_OF_CONDUCT.md
```

### Szenario 3: CODE_OF_CONDUCT.md existiert

```gherkin
Scenario: Repository hat einen Code of Conduct
  Given ich möchte die Community-Standards verstehen
  When ich die CODE_OF_CONDUCT.md öffne
  Then sehe ich den Contributor Covenant v2.1
  And ich finde Kontaktinformationen für Enforcement
```

### Szenario 4: SECURITY.md mit Vulnerability Reporting

```gherkin
Scenario: Sicherheitsforscher findet Vulnerability Reporting Prozess
  Given ich habe eine Sicherheitslücke gefunden
  When ich die SECURITY.md öffne
  Then sehe ich dass ich die Lücke NICHT als öffentliches Issue melden soll
  And ich finde einen privaten Melde-Prozess (Email)
  And ich sehe die erwartete Response-Zeit
```

---

## Technische Verifikation (Automated Checks)

- [ ] FILE_EXISTS: `CONTRIBUTING.md`
- [ ] FILE_EXISTS: `CODE_OF_CONDUCT.md`
- [ ] FILE_EXISTS: `SECURITY.md`
- [ ] CONTAINS: `CONTRIBUTING.md` enthält "CODE_OF_CONDUCT"
- [ ] CONTAINS: `CONTRIBUTING.md` enthält "Development Setup" oder "Getting Started"
- [ ] CONTAINS: `CONTRIBUTING.md` enthält "Pull Request"
- [ ] CONTAINS: `CODE_OF_CONDUCT.md` enthält "Contributor Covenant"
- [ ] CONTAINS: `SECURITY.md` enthält "Vulnerability" oder "vulnerability"

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
- [x] Fachliche requirements klar definiert - CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md erstellen
- [x] Akzeptanzkriterien sind spezifisch und prüfbar - 4 Gherkin-Szenarien mit konkreten Inhalten und Verlinkungen
- [x] Business Value verstanden - Community-Standards ermoeglichen professionelle Open-Source-Zusammenarbeit

#### Technische Vorbereitung
- [x] Technischer Ansatz definiert (WAS/WIE/WO) - siehe unten
- [x] Abhängigkeiten identifiziert - Keine
- [x] Betroffene Komponenten bekannt - 3 neue Markdown-Dateien im Root
- [x] Erforderliche MCP Tools dokumentiert (falls zutreffend) - Keine MCP Tools noetig
- [x] Story ist angemessen geschätzt (max 5 Dateien, 400 LOC) - 3 Dateien, ca. 250 LOC

#### Full-Stack Konsistenz (NEU)
- [x] **Alle betroffenen Layer identifiziert** - Nur Docs Layer
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
| Docs | `CONTRIBUTING.md` (Neu) | Contribution Guidelines mit Development Setup, Code Style, PR Process |
| Docs | `CODE_OF_CONDUCT.md` (Neu) | Contributor Covenant v2.1 |
| Docs | `SECURITY.md` (Neu) | Vulnerability Reporting Prozess |

---

### Technical Details

**WAS:**
1. `CONTRIBUTING.md` erstellen: Development Setup, Code Style Guidelines (TypeScript strict, ESLint, aos- Prefix), PR Process (Fork, Branch, Implement, Test, PR), Link zu CODE_OF_CONDUCT.md
2. `CODE_OF_CONDUCT.md` erstellen: Contributor Covenant Version 2.1 mit Kontaktinformationen
3. `SECURITY.md` erstellen: Vulnerability Reporting Prozess mit privatem Meldeweg und Response-Zeiten

**WIE (Architektur-Guidance ONLY):**
- `CONTRIBUTING.md`: Standard Open-Source Contribution Guide Struktur. Development Setup soll auf `setup.sh` verweisen und manuellen Prozess beschreiben. Code Style Sektion soll auf bestehende ESLint-Konfiguration und `aos-` Component Prefix verweisen. PR Process soll Fork-basiert sein (Standard fuer Open Source). Link zu `CODE_OF_CONDUCT.md` einbinden.
- `CODE_OF_CONDUCT.md`: Contributor Covenant v2.1 verwenden (https://www.contributor-covenant.org/version/2/1/code_of_conduct/). Enforcement-Kontakt als Platzhalter-Email (z.B. `conduct@agent-os.dev` oder aehnlich).
- `SECURITY.md`: Klare Anweisung, Sicherheitsluecken NICHT als oeffentliche Issues zu melden. Privaten Meldeweg definieren (z.B. Email an `security@agent-os.dev` oder GitHub Security Advisories). Erwartete Response-Zeit dokumentieren (z.B. 48 Stunden Erstantwort).

**WO:**
- `/CONTRIBUTING.md` (Neu erstellen)
- `/CODE_OF_CONDUCT.md` (Neu erstellen)
- `/SECURITY.md` (Neu erstellen)

**Abhängigkeiten:** None

**Geschätzte Komplexität:** S

---

### Creates Reusable Artifacts

**Creates Reusable:** no

---

### Completion Check

```bash
# Verify CONTRIBUTING.md exists with required content
test -f CONTRIBUTING.md && \
grep -q "CODE_OF_CONDUCT" CONTRIBUTING.md && \
grep -qi "Development Setup\|Getting Started" CONTRIBUTING.md && \
grep -qi "Pull Request" CONTRIBUTING.md && \
echo "PASS: CONTRIBUTING.md" || { echo "FAIL: CONTRIBUTING.md"; exit 1; }

# Verify CODE_OF_CONDUCT.md exists with Contributor Covenant
test -f CODE_OF_CONDUCT.md && \
grep -q "Contributor Covenant" CODE_OF_CONDUCT.md && \
echo "PASS: CODE_OF_CONDUCT.md" || { echo "FAIL: CODE_OF_CONDUCT.md"; exit 1; }

# Verify SECURITY.md exists with vulnerability reporting
test -f SECURITY.md && \
grep -qi "vulnerability\|Vulnerability" SECURITY.md && \
echo "PASS: SECURITY.md" || { echo "FAIL: SECURITY.md"; exit 1; }
```
