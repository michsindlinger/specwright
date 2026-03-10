# MCP-Tools: Document Preview Open & Close

> Story ID: DPP-001
> Spec: Document Preview Panel
> Created: 2026-03-09
> Last Updated: 2026-03-09

**Priority**: High
**Type**: Backend
**Estimated Effort**: S
**Dependencies**: None

---

## Feature

```gherkin
Feature: MCP-Tools fuer Document Preview
  Als Claude Code Agent
  moechte ich waehrend eines Workflows ein Dokument zur Anzeige setzen koennen,
  damit der User das generierte Dokument sofort sehen und reviewen kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Dokument zur Anzeige setzen

```gherkin
Scenario: Claude Code oeffnet ein Dokument im Preview-Panel
  Given ein Specwright-Projekt ist aktiv
  And die Datei "specwright/specs/2026-03-09-example/requirements-clarification.md" existiert
  When Claude Code das MCP-Tool "document_preview_open" mit dem Dateipfad aufruft
  Then wird ein Preview-Request als JSON-Datei in /tmp/ erstellt
  And der Request enthaelt den Dateipfad und den Projektpfad
```

### Szenario 2: Preview-Panel programmatisch schliessen

```gherkin
Scenario: Claude Code schliesst das Preview-Panel
  Given das Preview-Panel zeigt ein Dokument an
  When Claude Code das MCP-Tool "document_preview_close" aufruft
  Then wird ein Close-Request als JSON-Datei in /tmp/ erstellt
```

### Szenario 3: Neues Dokument ersetzt vorheriges

```gherkin
Scenario: Claude Code setzt ein neues Dokument waehrend Panel offen ist
  Given das Preview-Panel zeigt "requirements-clarification.md" an
  When Claude Code "document_preview_open" mit "implementation-plan.md" aufruft
  Then wird ein neuer Preview-Request mit dem neuen Dateipfad erstellt
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Dokument existiert nicht
  Given ein Specwright-Projekt ist aktiv
  When Claude Code "document_preview_open" mit einem nicht-existierenden Pfad aufruft
  Then erhaelt Claude Code eine Fehlermeldung "File not found"
  And kein Preview-Request wird erstellt
```

---

## Technische Verifikation (Automated Checks)

> Wird vom Architect ausgefuellt.

### Datei-Pruefungen
- [x] FILE_EXISTS: specwright/scripts/mcp/kanban-mcp-server.ts

### Inhalt-Pruefungen
- [x] CONTAINS: `document_preview_open` in specwright/scripts/mcp/kanban-mcp-server.ts
- [x] CONTAINS: `document_preview_close` in specwright/scripts/mcp/kanban-mcp-server.ts
- [x] CONTAINS: `inputSchema` fuer beide Tools mit `filePath` Property

### Funktions-Pruefungen
- [x] BUILD_PASS: `cd ui && npx tsc --noEmit` (TypeScript compiles)

---

## Required MCP Tools

Keine externen MCP-Tools erforderlich.

---

## Technisches Refinement (vom Architect)

> **WICHTIG:** Dieser Abschnitt wird vom Architect ausgefuellt

### DoR (Definition of Ready) - Vom Architect

#### Fachliche Anforderungen
- [x] Fachliche requirements klar definiert
- [x] Akzeptanzkriterien sind spezifisch und pruefbar
- [x] Business Value verstanden

#### Technische Vorbereitung
- [x] Technischer Ansatz definiert (WAS/WIE/WO)
- [x] Abhaengigkeiten identifiziert
- [x] Betroffene Komponenten bekannt
- [x] Erforderliche MCP Tools dokumentiert (falls zutreffend)
- [x] Story ist angemessen geschaetzt (max 5 Dateien, 400 LOC)

#### Full-Stack Konsistenz (NEU)
- [x] **Alle betroffenen Layer identifiziert**
- [x] **Integration Type bestimmt**
- [x] **Kritische Integration Points dokumentiert**
- [x] **Handover-Dokumente definiert**

**Story ist READY wenn alle Checkboxen angehakt sind.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [x] Code implementiert und folgt Style Guide
- [x] Architektur-Vorgaben eingehalten (WIE section)
- [x] Security/Performance Anforderungen erfuellt

#### Qualitaetssicherung
- [x] Alle Akzeptanzkriterien erfuellt (via Completion Check verifiziert)
- [x] Unit Tests geschrieben und bestanden
- [x] Integration Tests geschrieben und bestanden
- [x] Code Review durchgefuehrt und genehmigt

#### Dokumentation
- [x] Dokumentation aktualisiert
- [x] Keine Linting Errors
- [x] Completion Check Commands alle erfolgreich (exit 0)

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Backend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Aenderung |
|-------|-------------|----------|
| Backend | kanban-mcp-server.ts | 2 neue Tool-Definitionen + Handler |

**Kritische Integration Points:**
- MCP-Tool → JSON-Datei in /tmp/ (Filesystem IPC)

---

### Technical Details

**WAS:**
- 2 neue MCP-Tool-Definitionen im bestehenden TOOLS-Array: `document_preview_open` und `document_preview_close`
- 2 neue Handler-Cases im bestehenden switch-Statement des Request-Handlers
- JSON-Datei-Schreiben nach `/tmp/specwright-preview-<projectHash>.json`
- File-Existenz-Validierung fuer den uebergebenen Dateipfad

**WIE (Architektur-Guidance ONLY):**
- Folge dem bestehenden Tool-Definitions-Pattern: `{ name, description, inputSchema }` Objekte im TOOLS-Array
- Folge dem bestehenden Handler-Pattern: switch-case mit `request.params.name`, Return `{ content: [{ type: 'text', text }] }`
- Nutze `existsSync()` fuer File-Validierung (wie bei bestehenden spec-bezogenen Tools)
- Nutze bestehenden `cwd` Kontext fuer Pfad-Resolution und Project-Hash-Berechnung
- JSON-Datei-Format: `{ action: 'open'|'close', filePath: string, projectPath: string, timestamp: string }`
- Atomisches Schreiben: `writeFileSync` mit vollstaendigem Inhalt (kein Streaming noetig, kleine Dateien)
- Project-Hash: Nutze bestehende Hash-Funktion oder `createHash('md5').update(cwd).digest('hex').slice(0,8)` fuer eindeutige Dateinamen

**WO:**
- `specwright/scripts/mcp/kanban-mcp-server.ts` - TOOLS-Array erweitern + switch-Cases ergaenzen

**Abhaengigkeiten:** None

**Geschaetzte Komplexitaet:** S

**Relevante Skills:**

| Skill | Pfad | Grund |
|-------|------|-------|
| domain-specwright-ui | .claude/skills/domain-specwright-ui/SKILL.md | MCP-Server-Kontext und bestehende Tool-Patterns |

---

### Creates Reusable Artifacts

**Creates Reusable:** yes

**Reusable Artifacts:**

| Artefakt | Typ | Pfad | Beschreibung |
|----------|-----|------|--------------|
| document_preview_open | MCP Tool | specwright/scripts/mcp/kanban-mcp-server.ts | MCP-Tool zum Oeffnen des Document Preview Panels |
| document_preview_close | MCP Tool | specwright/scripts/mcp/kanban-mcp-server.ts | MCP-Tool zum Schliessen des Document Preview Panels |

---

### Completion Check

```bash
# Auto-Verify Commands - alle muessen mit 0 exiten
grep -q "document_preview_open" specwright/scripts/mcp/kanban-mcp-server.ts && echo "OK: open tool defined"
grep -q "document_preview_close" specwright/scripts/mcp/kanban-mcp-server.ts && echo "OK: close tool defined"
grep -q "specwright-preview-" specwright/scripts/mcp/kanban-mcp-server.ts && echo "OK: preview file pattern"
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Aenderungen
