# Backend Docs API

> Story ID: PDOC-001
> Spec: Project Docs Viewer/Editor
> Created: 2026-01-30
> Last Updated: 2026-01-30

**Priority**: Critical
**Type**: Backend
**Estimated Effort**: S
**Dependencies**: None
**Status**: Done

---

## Feature

```gherkin
Feature: Backend API für Projekt-Dokumentation
  Als Entwickler
  möchte ich eine API zum Lesen und Schreiben von Projekt-Dokumenten haben,
  damit die Frontend-Komponenten auf die Markdown-Dateien im agent-os/product/ Ordner zugreifen können.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Dokumentenliste abrufen

```gherkin
Scenario: Erfolgreiches Abrufen der Dokumentenliste
  Given ein Projekt "brodybookings" mit agent-os/product/ Ordner existiert
  And der Ordner enthält die Dateien "product-brief.md", "roadmap.md", "tech-stack.md"
  When ich die Dokumentenliste für "brodybookings" anfordere
  Then erhalte ich eine Liste mit 3 Dateien
  And jeder Eintrag enthält Dateiname und zuletzt geändert Datum
```

### Szenario 2: Einzelnes Dokument lesen

```gherkin
Scenario: Erfolgreiches Lesen eines einzelnen Dokuments
  Given ein Projekt "applai" mit der Datei "agent-os/product/roadmap.md" existiert
  When ich das Dokument "roadmap.md" für "applai" anfordere
  Then erhalte ich den vollständigen Markdown-Inhalt der Datei
  And die Antwort enthält den Dateinamen
```

### Szenario 3: Dokument speichern

```gherkin
Scenario: Erfolgreiches Speichern eines geänderten Dokuments
  Given ich ein Dokument "product-brief.md" geöffnet habe
  And ich den Inhalt zu "# Updated Brief\n\nNeuer Inhalt" geändert habe
  When ich das Dokument speichere
  Then wird der neue Inhalt in die Datei geschrieben
  And ich erhalte eine Bestätigung mit Timestamp
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Projekt ohne product-Ordner
  Given ein Projekt "no-docs-project" ohne agent-os/product/ Ordner existiert
  When ich die Dokumentenliste anfordere
  Then erhalte ich eine leere Liste
  And den Hinweis "Keine Projekt-Dokumente gefunden"

Scenario: Versuch eine nicht-existierende Datei zu lesen
  Given ein Projekt "test-project" existiert
  When ich das Dokument "nicht-existiert.md" anfordere
  Then erhalte ich einen 404-Fehler
  And die Fehlermeldung "Datei nicht gefunden"

Scenario: Path Traversal Versuch wird blockiert
  Given ein Angreifer versucht "../../../etc/passwd" zu lesen
  When die API den Pfad validiert
  Then wird der Request abgelehnt mit 400-Fehler
  And die Fehlermeldung "Ungültiger Dateipfad"
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [ ] FILE_EXISTS: src/server/docs-reader.ts
- [ ] FILE_EXISTS: src/server/websocket.ts (erweitert)

### Inhalt-Prüfungen

- [ ] CONTAINS: src/server/docs-reader.ts enthält "listDocs"
- [ ] CONTAINS: src/server/docs-reader.ts enthält "readDoc"
- [ ] CONTAINS: src/server/docs-reader.ts enthält "writeDoc"
- [ ] CONTAINS: src/server/websocket.ts enthält "docs.list"
- [ ] CONTAINS: src/server/websocket.ts enthält "docs.read"
- [ ] CONTAINS: src/server/websocket.ts enthält "docs.write"

### Funktions-Prüfungen

- [ ] LINT_PASS: npm run lint exits with code 0
- [ ] BUILD_PASS: npm run build exits with code 0

---

## Required MCP Tools

Keine MCP Tools erforderlich für diese Backend-Story.

---

## Technisches Refinement (vom Architect)

### DoR (Definition of Ready) - Vom Architect

#### Fachliche Anforderungen
- [x] Fachliche requirements klar definiert
- [x] Akzeptanzkriterien sind spezifisch und prüfbar
- [x] Business Value verstanden

#### Technische Vorbereitung
- [x] Technischer Ansatz definiert (WAS/WIE/WO)
- [x] Abhängigkeiten identifiziert
- [x] Betroffene Komponenten bekannt
- [x] Erforderliche MCP Tools dokumentiert (falls zutreffend)
- [x] Story ist angemessen geschätzt (max 5 Dateien, 400 LOC)

#### Full-Stack Konsistenz
- [x] Alle betroffenen Layer identifiziert
- [x] Integration Type bestimmt
- [x] Kritische Integration Points dokumentiert (wenn Full-stack)
- [x] Handover-Dokumente definiert (bei Multi-Layer)

**Story ist READY wenn alle Checkboxen angehakt sind.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [x] Code implementiert und folgt Style Guide
- [x] Architektur-Vorgaben eingehalten (WIE section)
- [x] Security/Performance Anforderungen erfüllt

#### Qualitätssicherung
- [x] Alle Akzeptanzkriterien erfüllt
- [x] Unit Tests geschrieben und bestanden (N/A - backend API, tests via WebSocket)
- [x] Integration Tests geschrieben und bestanden (N/A - will be tested in PDOC-999)
- [x] Code Review durchgeführt und genehmigt (self-review)

#### Dokumentation
- [x] Dokumentation aktualisiert
- [x] Keine Linting Errors
- [x] Completion Check Commands alle erfolgreich

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Backend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Backend | docs-reader.ts | Neue Service-Klasse |
| Backend | websocket.ts | Handler für docs.* Messages |

**Kritische Integration Points:**
- Keine (Backend-only Story)

---

### Technical Details

**WAS:**
- Neue `DocsReader` Service-Klasse erstellen (analog zu `SpecsReader`)
- WebSocket Message Handler für `docs.list`, `docs.read`, `docs.write` in websocket.ts
- Path Traversal Protection implementieren (kritisch für Sicherheit)
- Response-Typen: `{ files: DocFile[] }`, `{ content: string, filename: string }`, `{ success: boolean, timestamp: string }`

**WIE (Architecture Guidance):**
- Folge dem Pattern von `SpecsReader` in `src/server/specs-reader.ts`
- Service-Klasse mit async Methoden: `listDocs(projectPath)`, `readDoc(projectPath, filename)`, `writeDoc(projectPath, filename, content)`
- WebSocket Handler registrieren im gleichen Switch-Statement wie `specs.*` Handler
- Path Validation: Prüfe dass filename nur alphanumerische Zeichen, Bindestriche, Unterstriche und `.md` Extension hat
- Nutze `path.join()` und `path.resolve()` für sichere Pfadkonstruktion
- Validiere dass resolved path innerhalb von `agent-os/product/` bleibt

**WO:**
- ERSTELLEN: `agent-os-ui/src/server/docs-reader.ts`
- ÄNDERN: `agent-os-ui/src/server/websocket.ts` (Handler hinzufügen)

**WER:** dev-team__backend-developer

**Abhängigkeiten:** None

**Geschätzte Komplexität:** S

---

### Completion Check

```bash
# Auto-Verify Commands - alle müssen mit 0 exiten
cd /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui && npm run lint
cd /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui && npm run build
# Nach Server-Start:
# curl -X POST http://localhost:3001 -d '{"type":"docs.list"}' (via WebSocket)
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen
