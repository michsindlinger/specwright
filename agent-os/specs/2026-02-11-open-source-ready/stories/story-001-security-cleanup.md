# Security Cleanup

> Story ID: OSR-001
> Spec: Open Source Ready
> Created: 2026-02-11
> Last Updated: 2026-02-11

**Priority**: Critical
**Type**: DevOps
**Estimated Effort**: 2 SP
**Dependencies**: None

---

## Feature

```gherkin
Feature: Security Cleanup
  Als Repository-Maintainer
  möchte ich alle Secrets, API Keys und hardcodierten Pfade aus dem Repository entfernen,
  damit das Repository sicher veröffentlicht werden kann ohne sensible Daten preiszugeben.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: MCP Config Template ohne echte API Keys

```gherkin
Scenario: .mcp.json.example enthält keine echten API Keys
  Given das Repository enthält eine .mcp.json mit einem Perplexity API Key
  When ich die .mcp.json.example Datei öffne
  Then sehe ich den Platzhalter "YOUR_PERPLEXITY_API_KEY" statt des echten Keys
  And alle absoluten User-Pfade sind durch generische Platzhalter ersetzt
```

### Szenario 2: Projekt-Config Template ohne absolute Pfade

```gherkin
Scenario: config.json.example enthält keine absoluten User-Pfade
  Given die agent-os-ui/config.json enthält absolute Pfade wie "/Users/michaelsindlinger/..."
  When ich die agent-os-ui/config.json.example Datei öffne
  Then sehe ich "/path/to/your/project" als Platzhalter
  And keine User-spezifischen Pfade sind enthalten
```

### Szenario 3: Sensitive Dateien sind git-ignored

```gherkin
Scenario: .gitignore schützt sensitive Konfigurationsdateien
  Given ich bin ein neuer Contributor der das Repository klont
  When ich eine .mcp.json mit meinen API Keys erstelle
  Then wird diese Datei nicht von Git getrackt
  And auch .claude/settings.local.json wird nicht getrackt
```

### Edge Case: Versehentliches Committen von Secrets

```gherkin
Scenario: .mcp.json.example enthält Warnung gegen echte Keys
  Given ich öffne die .mcp.json.example Datei
  When ich die Datei lese
  Then sehe ich einen Kommentar der warnt keine echten API Keys einzutragen
```

---

## Technische Verifikation (Automated Checks)

- [ ] FILE_EXISTS: `.mcp.json.example`
- [ ] FILE_EXISTS: `agent-os-ui/config.json.example`
- [ ] NOT_CONTAINS: `.mcp.json.example` enthält NICHT "pplx-"
- [ ] NOT_CONTAINS: `agent-os-ui/config.json.example` enthält NICHT "/Users/michaelsindlinger"
- [ ] CONTAINS: `.mcp.json.example` enthält "YOUR_PERPLEXITY_API_KEY"
- [ ] CONTAINS: `.gitignore` enthält ".mcp.json"
- [ ] CONTAINS: `.gitignore` enthält ".claude/settings.local.json"

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
- [x] Fachliche requirements klar definiert - Secrets entfernen, Example-Dateien erstellen, .gitignore erweitern
- [x] Akzeptanzkriterien sind spezifisch und prüfbar - 4 Gherkin-Szenarien mit konkreten Platzhalter-Werten
- [x] Business Value verstanden - Sicherheit ist Voraussetzung fuer Open-Source-Veroeffentlichung

#### Technische Vorbereitung
- [x] Technischer Ansatz definiert (WAS/WIE/WO) - siehe unten
- [x] Abhängigkeiten identifiziert - Keine (Startphase)
- [x] Betroffene Komponenten bekannt - .mcp.json, config.json, .gitignore
- [x] Erforderliche MCP Tools dokumentiert (falls zutreffend) - Keine MCP Tools noetig
- [x] Story ist angemessen geschätzt (max 5 Dateien, 400 LOC) - 3 Dateien, ca. 60 LOC

#### Full-Stack Konsistenz (NEU)
- [x] **Alle betroffenen Layer identifiziert** - Nur DevOps/Config Layer
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
| Config | `.mcp.json` (Quelle) | Wird als Vorlage fuer Example-Datei genutzt |
| Config | `.mcp.json.example` (Neu) | Neue Template-Datei ohne echte Secrets |
| Config | `agent-os-ui/config.json` (Quelle) | Wird als Vorlage fuer Example-Datei genutzt |
| Config | `agent-os-ui/config.json.example` (Neu) | Neue Template-Datei mit Platzhalter-Pfaden |
| DevOps | `.gitignore` (Root) | Erweitert um .mcp.json und .claude/settings.local.json |

**Kritische Integration Points:**
- `.mcp.json.example` muss dieselbe JSON-Struktur wie `.mcp.json` haben (5 MCP Server: mermaid, context7, perplexity, playwright, kanban)
- `config.json.example` muss dieselbe JSON-Struktur wie `config.json` haben (projects Array)
- `.gitignore`-Eintraege muessen so formuliert sein, dass die echten Dateien ignoriert werden, aber die `.example`-Dateien weiterhin getrackt werden

---

### Technical Details

**WAS:**
1. `.mcp.json.example` erstellen: Kopie der bestehenden `.mcp.json`-Struktur mit Platzhaltern statt echten Werten
2. `agent-os-ui/config.json.example` erstellen: Kopie der bestehenden `config.json`-Struktur mit generischen Pfaden
3. `.gitignore` erweitern: Eintraege fuer `.mcp.json` und `.claude/settings.local.json` hinzufuegen

**WIE (Architektur-Guidance ONLY):**
- `.mcp.json.example`: Bestehende `.mcp.json` als Vorlage verwenden. API Key `pplx-...` durch `YOUR_PERPLEXITY_API_KEY` ersetzen. Absoluten Pfad `/Users/michaelsindlinger/.agent-os/scripts/mcp/kanban-mcp-server.ts` durch `$HOME/.agent-os/scripts/mcp/kanban-mcp-server.ts` ersetzen. JSON-Kommentar ist nicht moeglich, daher einen Platzhalter-Hinweis als separaten Key oder im README dokumentieren.
- `config.json.example`: Bestehende `config.json` als Vorlage. Pfad `/Users/michaelsindlinger/Entwicklung/agent-os-web-ui` durch `/path/to/your/project` ersetzen.
- `.gitignore`: Neue Eintraege am Ende der Datei unter einem neuen Kommentar-Block `# Sensitive configuration` hinzufuegen. Bestehende Patterns nicht duplizieren.

**WO:**
- `/.mcp.json.example` (Neu erstellen)
- `/agent-os-ui/config.json.example` (Neu erstellen)
- `/.gitignore` (Erweitern)

**Abhängigkeiten:** None

**Geschätzte Komplexität:** XS

---

### Creates Reusable Artifacts

**Creates Reusable:** no

---

### Completion Check

```bash
# Verify .mcp.json.example exists and has correct content
test -f .mcp.json.example && \
! grep -q "pplx-" .mcp.json.example && \
grep -q "YOUR_PERPLEXITY_API_KEY" .mcp.json.example && \
! grep -q "/Users/michaelsindlinger" .mcp.json.example && \
echo "PASS: .mcp.json.example" || { echo "FAIL: .mcp.json.example"; exit 1; }

# Verify config.json.example exists and has correct content
test -f agent-os-ui/config.json.example && \
! grep -q "/Users/michaelsindlinger" agent-os-ui/config.json.example && \
grep -q "/path/to/your/project" agent-os-ui/config.json.example && \
echo "PASS: config.json.example" || { echo "FAIL: config.json.example"; exit 1; }

# Verify .gitignore contains new entries
grep -q "\.mcp\.json" .gitignore && \
grep -q "\.claude/settings\.local\.json" .gitignore && \
echo "PASS: .gitignore" || { echo "FAIL: .gitignore"; exit 1; }
```
