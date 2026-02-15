# Backend - Spec-Dateien auflisten und generisch lesen/speichern

> Story ID: SDVE-001
> Spec: Spec Docs Viewer Extension
> Created: 2026-02-12
> Last Updated: 2026-02-12

**Priority**: High
**Type**: Backend
**Estimated Effort**: S (2 SP)
**Dependencies**: None

---

## Feature

```gherkin
Feature: Spec-Dateien auflisten und generisch lesen/speichern
  Als Entwickler
  möchte ich alle Markdown-Dateien eines Specs über die API abrufen und bearbeiten können,
  damit ich nicht nur spec.md und spec-lite.md, sondern alle Dokumentation im Viewer sehen kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Alle Markdown-Dateien eines Specs auflisten

```gherkin
Scenario: Vollständige Dateiliste eines Specs abrufen
  Given ein Spec-Ordner "2026-02-12-my-feature" existiert mit 8 Markdown-Dateien
  And der Ordner enthält spec.md, spec-lite.md, implementation-plan.md im Hauptordner
  And der Unterordner stories/ enthält story-001-feature.md und story-002-bugfix.md
  When ich die Dateiliste für diesen Spec anfordere
  Then erhalte ich alle 8 Dateien gruppiert nach Ordner
  And die Gruppe "root" enthält die Hauptordner-Dateien
  And die Gruppe "stories" enthält die Story-Dateien
```

### Szenario 2: Beliebige Markdown-Datei lesen

```gherkin
Scenario: Implementation Plan lesen
  Given der Spec "2026-02-12-my-feature" enthält eine implementation-plan.md
  When ich die Datei "implementation-plan.md" anfordere
  Then erhalte ich den vollständigen Markdown-Inhalt der Datei
  And den Dateinamen "implementation-plan.md"
```

### Szenario 3: Beliebige Markdown-Datei speichern

```gherkin
Scenario: Story-Datei bearbeiten und speichern
  Given ich habe den Inhalt von "stories/story-001-feature.md" geladen
  When ich den Inhalt ändere und speichere
  Then wird die Datei auf dem Dateisystem aktualisiert
  And ich erhalte eine Bestätigung des erfolgreichen Speicherns
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Zugriff auf nicht-existierende Datei
  Given der Spec "2026-02-12-my-feature" existiert
  When ich eine nicht-existierende Datei "missing.md" anfordere
  Then erhalte ich eine Fehlermeldung "Datei nicht gefunden"
```

```gherkin
Scenario: Path-Traversal-Versuch wird blockiert
  Given ein Angreifer versucht auf "../../secrets.md" zuzugreifen
  When die Anfrage beim Backend ankommt
  Then wird der Zugriff verweigert
  And eine Fehlermeldung wird zurückgegeben
```

```gherkin
Scenario: Backward-Kompatibilität mit altem fileType-Parameter
  Given ein bestehender Client sendet fileType "spec" statt relativePath
  When die Anfrage beim Backend ankommt
  Then wird die Anfrage korrekt auf "spec.md" gemappt
  And der Inhalt wird wie bisher zurückgegeben
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [x] FILE_EXISTS: `agent-os-ui/src/server/specs-reader.ts` (erweitert um `listSpecFiles`)
- [x] FILE_EXISTS: `agent-os-ui/src/server/websocket.ts` (erweitert um `specs.files` Handler)

### Inhalt-Prüfungen

- [x] CONTAINS: `agent-os-ui/src/server/specs-reader.ts` enthält `listSpecFiles`
- [x] CONTAINS: `agent-os-ui/src/server/websocket.ts` enthält `specs.files`
- [x] CONTAINS: `agent-os-ui/src/server/websocket.ts` enthält `relativePath`

### Funktions-Prüfungen

- [x] LINT_PASS: `cd agent-os-ui && npx tsc --noEmit`
- [x] BUILD_PASS: `cd agent-os-ui && npx tsc --noEmit`

---

## Required MCP Tools

_No MCP tools required for this story._

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
- [x] **Alle betroffenen Layer identifiziert** - Backend-only (Node.js/Express WebSocket)
- [x] **Integration Type bestimmt** - Backend-only
- [x] **Kritische Integration Points dokumentiert** - Neuer `specs.files` Message-Typ, generalisierter `relativePath` Parameter für `specs.read`/`specs.save`
- [x] **Handover-Dokumente definiert** - Response-Format-Definition als API Contract für SDVE-002/003: `{ groups: [{ folder: string, files: [{ relativePath: string, filename: string }] }] }`

**Story ist READY wenn alle Checkboxen angehakt sind.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [x] Code implementiert und folgt Style Guide
- [x] Architektur-Vorgaben eingehalten (WIE section)
- [x] Security/Performance Anforderungen erfüllt (Path-Traversal-Schutz)

#### Qualitätssicherung
- [x] Alle Akzeptanzkriterien erfüllt (via Completion Check verifiziert)
- [x] TypeScript kompiliert fehlerfrei (`npx tsc --noEmit`)
- [x] Backward-Kompatibilität: `fileType` Parameter funktioniert weiterhin in `specs.read`/`specs.save`
- [x] Code Review durchgeführt und genehmigt

#### Dokumentation
- [x] Keine Linting Errors
- [x] Completion Check Commands alle erfolgreich (exit 0)

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Backend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Backend | `specs-reader.ts` (`SpecsReader` Klasse) | Neue Methode `listSpecFiles(projectPath, specId)` fuer rekursive `*.md` Datei-Erkennung mit Ordner-Gruppierung |
| Backend | `websocket.ts` (`handleSpecsRead`) | Erweitern um `relativePath` Parameter neben bestehendem `fileType`, Pfad-Validierung |
| Backend | `websocket.ts` (`handleSpecsSave`) | Erweitern um `relativePath` Parameter neben bestehendem `fileType`, Pfad-Validierung |
| Backend | `websocket.ts` (Message Router) | Neuer `specs.files` case im message switch, neuer `handleSpecsFiles` Handler |

**Kritische Integration Points:**
- Response-Format von `specs.files` ist der API Contract fuer SDVE-002 und SDVE-003
- `relativePath` Parameter in `specs.read`/`specs.save` muss backward-kompatibel mit bestehendem `fileType` sein
- Path-Traversal-Schutz: `relativePath` darf nicht ausserhalb des Spec-Ordners aufloesen

---

### Technical Details

**WAS:**
- Neue Methode `listSpecFiles()` in der bestehenden `SpecsReader` Klasse die rekursiv alle `*.md` Dateien in einem Spec-Ordner findet und nach Verzeichnis gruppiert zurueckgibt
- Neuer WebSocket Handler `handleSpecsFiles` fuer den Message-Typ `specs.files`
- Erweiterung von `handleSpecsRead` und `handleSpecsSave` um den optionalen `relativePath` Parameter (neben bestehendem `fileType`)
- Path-Traversal-Validierung in allen Handlern die `relativePath` akzeptieren

**WIE (Architektur-Guidance ONLY):**
- `listSpecFiles()` folgt dem Pattern aus `docs-reader.ts` (`listDocs`) und dem bestehenden `readdir` Pattern in `specs-reader.ts` (Zeile 384, 476), aber mit rekursiver Traversierung der Unterordner
- Path-Validierung folgt dem Pattern aus `docs-reader.ts` (`getValidatedDocPath`, Zeile 51-66): `resolve()` + `relative()` Check dass der Pfad innerhalb des Spec-Ordners bleibt, plus `..` und absolute Pfad Ablehnung
- `handleSpecsFiles` folgt dem gleichen Handler-Pattern wie `handleSpecsList` (Zeile 1204): Client-ProjectPath holen, Service aufrufen, Response senden
- `handleSpecsRead`/`handleSpecsSave` erhalten zusaetzlich `relativePath` Parameter; wenn `fileType` gesendet wird, intern auf `relativePath` mappen (`'spec'` -> `'spec.md'`, `'spec-lite'` -> `'spec-lite.md'`)
- Nur `*.md` Dateien erlaubt, Validierung der Extension vor Dateizugriff
- Response-Struktur: `{ type: 'specs.files', specId, groups: [{ folder: string, files: [{ relativePath: string, filename: string }] }] }`
- Sortierung: Root-Dateien zuerst, dann Unterordner alphabetisch; Dateien innerhalb jeder Gruppe alphabetisch

**WO:**
- `agent-os-ui/src/server/specs-reader.ts` - neue `listSpecFiles()` Methode + private Hilfsmethode fuer Path-Validierung
- `agent-os-ui/src/server/websocket.ts` - neuer `specs.files` case (ca. Zeile 235), neuer `handleSpecsFiles` Handler, Erweiterung `handleSpecsRead` (Zeile 1577) und `handleSpecsSave` (Zeile 1630)

**WER:** codebase-analyzer

**Abhängigkeiten:** None

**Geschätzte Komplexität:** S

---

### Creates Reusable Artifacts

**Creates Reusable:** yes

| Artifact | Typ | Genutzt von |
|----------|-----|-------------|
| `SpecsReader.listSpecFiles()` | Service Methode | SDVE-003 (via `specs.files` Handler) |
| `specs.files` WebSocket Message-Typ | API Contract | SDVE-003 (Gateway Convenience-Methode) |
| Path-Validierung fuer `relativePath` | Pattern | `handleSpecsRead`, `handleSpecsSave`, `handleSpecsFiles` |

---

### Relevante Skills

- logic-implementing (Backend-Service-Methode in bestehender Klasse)
- persistence-adapter (Dateisystem-Zugriff mit Validierung)

---

### Completion Check

```bash
# 1. TypeScript Backend compilation
cd agent-os-ui && npx tsc --noEmit

# 2. Verify listSpecFiles method exists
grep -n "listSpecFiles" agent-os-ui/src/server/specs-reader.ts

# 3. Verify specs.files handler exists
grep -n "specs.files" agent-os-ui/src/server/websocket.ts

# 4. Verify relativePath in handleSpecsRead
grep -n "relativePath" agent-os-ui/src/server/websocket.ts

# 5. Verify path traversal protection
grep -n "resolve\|relative\|\.\./" agent-os-ui/src/server/specs-reader.ts | head -10
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen in `specs-reader.ts` und `websocket.ts`
