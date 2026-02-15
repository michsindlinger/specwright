# Root README & Documentation

> Story ID: OSR-003
> Spec: Open Source Ready
> Created: 2026-02-11
> Last Updated: 2026-02-11

**Priority**: High
**Type**: Docs
**Estimated Effort**: 3 SP
**Dependencies**: OSR-002

---

## Feature

```gherkin
Feature: Root README & Documentation
  Als neuer Besucher des Repositories
  möchte ich eine umfassende README im Root-Verzeichnis sehen,
  damit ich sofort verstehe was das Projekt macht, wie ich es installiere und wie die Architektur aufgebaut ist.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: README enthält Projektbeschreibung

```gherkin
Scenario: Besucher versteht sofort was das Projekt macht
  Given ich bin ein Entwickler der das Repository zum ersten Mal besucht
  When ich die README.md im Root öffne
  Then sehe ich eine klare Projektbeschreibung im Header
  And ich verstehe dass es ein Web UI für Agent OS / Claude Code ist
  And ich sehe eine Feature-Übersicht (Dashboard, Chat, Workflows, Cloud Terminal, Git Integration)
```

### Szenario 2: README enthält Quick Start

```gherkin
Scenario: Neuer Nutzer kann das Projekt schnell einrichten
  Given ich möchte das Projekt lokal aufsetzen
  When ich die README.md lese
  Then sehe ich die Prerequisites (Node.js >= 20, npm >= 9, agent-os-extended)
  And ich sehe eine Quick Start Section mit Verweis auf setup.sh
  And ich sehe auch eine manuelle Installations-Anleitung
```

### Szenario 3: README enthält Architecture Section

```gherkin
Scenario: Entwickler versteht die Architektur
  Given ich möchte zum Projekt beitragen
  When ich die Architecture Section der README lese
  Then sehe ich die 3-Tier-Architektur (Express + Lit + WebSocket)
  And ich sehe Development-Informationen (Ports, npm run Befehle)
```

### Szenario 4: README verlinkt alle wichtigen Dateien

```gherkin
Scenario: README verlinkt Community und Legal Dateien
  Given ich suche Informationen zur Lizenz oder zum Beitragen
  When ich die README.md lese
  Then finde ich Links zu LICENSE, CONTRIBUTING.md und SECURITY.md
  And ich finde einen Verweis auf setup.sh
```

### Edge Case: Bestehende agent-os-ui README

```gherkin
Scenario: agent-os-ui README verweist auf Root-README
  Given ich bin im agent-os-ui Unterverzeichnis
  When ich die dortige README.md öffne
  Then sehe ich einen Hinweis auf die Root-README für die vollständige Dokumentation
```

---

## Technische Verifikation (Automated Checks)

- [ ] FILE_EXISTS: `README.md`
- [ ] CONTAINS: `README.md` enthält "LICENSE"
- [ ] CONTAINS: `README.md` enthält "CONTRIBUTING"
- [ ] CONTAINS: `README.md` enthält "SECURITY"
- [ ] CONTAINS: `README.md` enthält "setup.sh"
- [ ] CONTAINS: `README.md` enthält "Node.js"
- [ ] CONTAINS: `README.md` enthält "Architecture" oder "Architektur"

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
- [x] Fachliche requirements klar definiert - Root README mit Projektbeschreibung, Quick Start, Architecture, Links
- [x] Akzeptanzkriterien sind spezifisch und prüfbar - 5 Gherkin-Szenarien mit konkreten Inhalten und Verlinkungen
- [x] Business Value verstanden - Erste Anlaufstelle fuer neue Besucher und Contributors

#### Technische Vorbereitung
- [x] Technischer Ansatz definiert (WAS/WIE/WO) - siehe unten
- [x] Abhängigkeiten identifiziert - OSR-002 (LICENSE muss existieren fuer Referenz)
- [x] Betroffene Komponenten bekannt - README.md (Root, neu), agent-os-ui/README.md (Update)
- [x] Erforderliche MCP Tools dokumentiert (falls zutreffend) - Keine MCP Tools noetig
- [x] Story ist angemessen geschätzt (max 5 Dateien, 400 LOC) - 2 Dateien, ca. 200 LOC

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
| Docs | `README.md` (Root, Neu) | Umfassende Projekt-README mit allen Sektionen |
| Docs | `agent-os-ui/README.md` | Hinweis auf Root-README hinzufuegen |

---

### Technical Details

**WAS:**
1. `README.md` im Repository-Root erstellen mit Sektionen: Projektbeschreibung, Features, Prerequisites, Quick Start (setup.sh + manuell), Architecture (3-Tier), Development, Configuration, Contributing/License/Security Links
2. `agent-os-ui/README.md` um einen Hinweis am Anfang erweitern, der auf die Root-README verweist

**WIE (Architektur-Guidance ONLY):**
- Root `README.md`: Bestehende `agent-os-ui/README.md` als Referenz fuer Struktur und Inhalte nutzen. Erweitern um: Repository-weite Perspektive (nicht nur agent-os-ui Unterverzeichnis), Prerequisites inkl. `agent-os-extended`, Verweis auf `setup.sh`, Links zu `LICENSE`, `CONTRIBUTING.md`, `SECURITY.md`. Architecture-Sektion soll die 3-Tier-Architektur (Express Backend + Lit Frontend + WebSocket) beschreiben. Feature-Liste aus bestehender README uebernehmen und erweitern (Dashboard, Chat, Workflows, Cloud Terminal, Git Integration, Kanban Boards).
- `agent-os-ui/README.md`: Minimale Aenderung - Nur einen Hinweisblock am Anfang der Datei einfuegen (z.B. "> For the full project documentation, see the [root README](../README.md)"). Bestehenden Inhalt nicht veraendern.

**WO:**
- `/README.md` (Neu erstellen)
- `/agent-os-ui/README.md` (Erweitern - nur Hinweisblock am Anfang)

**Abhängigkeiten:** OSR-002

**Geschätzte Komplexität:** S

---

### Creates Reusable Artifacts

**Creates Reusable:** no

---

### Completion Check

```bash
# Verify Root README.md exists with required content
test -f README.md && \
grep -q "LICENSE" README.md && \
grep -q "CONTRIBUTING" README.md && \
grep -q "SECURITY" README.md && \
grep -q "setup.sh" README.md && \
grep -q "Node.js" README.md && \
grep -qi "Architecture\|Architektur" README.md && \
echo "PASS: README.md" || { echo "FAIL: README.md"; exit 1; }

# Verify agent-os-ui/README.md references root README
grep -qi "root.*README\|../README" agent-os-ui/README.md && \
echo "PASS: agent-os-ui/README.md" || { echo "FAIL: agent-os-ui/README.md"; exit 1; }
```
