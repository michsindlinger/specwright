# Backend REST-API + Storage Service

> Story ID: QTD-003
> Spec: Quick-To-Do
> Created: 2026-02-13
> Last Updated: 2026-02-13

**Priority**: High
**Type**: Backend
**Estimated Effort**: 3 SP
**Dependencies**: None

---

## Feature

```gherkin
Feature: Quick-To-Do Backend-Speicherung
  Als System
  möchte ich Quick-To-Do Items mit Bildern im Backlog speichern,
  damit die Daten persistent und strukturiert abgelegt werden.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Quick-To-Do ohne Bilder speichern

```gherkin
Scenario: Einfaches Quick-To-Do erstellen
  Given der Backend-Server läuft
  When ein POST-Request mit Titel "Neue Idee" und Priorität "medium" gesendet wird
  Then wird ein Eintrag in backlog-index.json erstellt
  And eine Markdown-Datei in agent-os/backlog/items/ wird erstellt
  And die Antwort enthält die Item-ID
```

### Szenario 2: Quick-To-Do mit Bildern speichern

```gherkin
Scenario: Quick-To-Do mit 2 Bildern erstellen
  Given der Backend-Server läuft
  When ein POST-Request mit Titel "UI Skizze" und 2 Base64-Bildern gesendet wird
  Then wird ein Eintrag in backlog-index.json erstellt
  And eine Markdown-Datei mit Bild-Referenzen wird erstellt
  And die Bilder werden in agent-os/backlog/items/attachments/ITEM-XXX/ gespeichert
```

### Szenario 3: Backlog-Ordner wird automatisch erstellt

```gherkin
Scenario: Erster Quick-To-Do in neuem Projekt
  Given es existiert kein agent-os/backlog/ Ordner
  When ein Quick-To-Do erstellt wird
  Then wird die Ordnerstruktur automatisch angelegt
  And backlog-index.json wird mit leerer Struktur initialisiert
  And das Item wird erfolgreich gespeichert
```

### Edge Case: Ungültiger Request

```gherkin
Scenario: Request ohne Titel wird abgelehnt
  Given der Backend-Server läuft
  When ein POST-Request ohne Titel gesendet wird
  Then wird ein 400-Fehler zurückgegeben
  And die Fehlermeldung enthält "Title is required"
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [x] FILE_EXISTS: agent-os-ui/src/server/backlog-item-storage.ts
- [x] FILE_EXISTS: agent-os-ui/src/server/routes/quick-todo.routes.ts
- [x] CONTAINS: agent-os-ui/src/server/index.ts enthält "quick-todo"

### Funktions-Prüfungen

- [x] LINT_PASS: cd agent-os-ui && npx tsc --noEmit exits with code 0

---

## Required MCP Tools

Keine MCP-Tools erforderlich.

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
- [x] Kritische Integration Points dokumentiert
- [x] Handover-Dokumente definiert

**Story ist READY.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [x] Code implementiert und folgt Style Guide
- [x] Architektur-Vorgaben eingehalten (WIE section)
- [x] Input-Validierung implementiert
- [x] Dateisystem-Operationen sind atomar

#### Qualitätssicherung
- [x] Alle Akzeptanzkriterien erfüllt
- [x] Code Review durchgeführt und genehmigt

#### Dokumentation
- [x] Keine Linting Errors
- [x] Completion Check Commands alle erfolgreich (exit 0)

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Backend-only

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Backend | `backlog-item-storage.ts` | NEU: Service für atomische Item-Erstellung |
| Backend | `quick-todo.routes.ts` | NEU: Express Route für POST-Endpoint |
| Backend | `index.ts` | MODIFY: Neue Route registrieren |

---

### Technical Details

**WAS:**
- Neuer Service `BacklogItemStorageService` für atomische Backlog-Item-Erstellung
- Neuer Express Router mit POST-Endpoint für Quick-To-Do
- Registration der Route im Server-Entry-Point

**WIE (Architektur-Guidance):**
- Folge dem Pattern bestehender Routes (z.B. `image-upload.routes.ts`) für Router-Struktur
- `BacklogItemStorageService`:
  - Liest/initialisiert `backlog-index.json` gracefully (mkdir -p, leere Struktur wenn nicht vorhanden)
  - Generiert Item-ID aus `nextId` Feld (ITEM-001, ITEM-002, ...)
  - Erstellt Markdown-Datei mit Titel, Beschreibung, Priorität, Datum und Bild-Referenzen
  - Speichert Bilder als Dateien in `items/attachments/ITEM-XXX/`
  - Aktualisiert `backlog-index.json` atomar
- Route: `POST /api/backlog/:projectPath/quick-todo`
- Body-Limit: `express.json({ limit: '30mb' })` für diese Route
- Request-Body: `{ title: string, description?: string, priority: string, images?: Array<{ data: string, filename: string, mimeType: string }> }`
- Sanitize Dateinamen für Sicherheit (keine Path-Traversal)
- Validiere required fields serverseitig

**WO:**
- `agent-os-ui/src/server/backlog-item-storage.ts` (NEU)
- `agent-os-ui/src/server/routes/quick-todo.routes.ts` (NEU)
- `agent-os-ui/src/server/index.ts` (MODIFY)

**WER:** dev-team__backend-developer

**Abhängigkeiten:** None (kann parallel zu QTD-001/QTD-002 entwickelt werden)

**Geschätzte Komplexität:** S

---

### Creates Reusable Artifacts

**Creates Reusable:** yes

| Artefakt | Typ | Pfad | Beschreibung |
|----------|-----|------|--------------|
| BacklogItemStorageService | Service | src/server/backlog-item-storage.ts | Wiederverwendbarer Service für Backlog-Item-Erstellung |
| Quick-Todo API | API Endpoint | POST /api/backlog/:projectPath/quick-todo | REST-API für schnelle Backlog-Einträge |

---

### Completion Check

```bash
# Auto-Verify Commands
test -f agent-os-ui/src/server/backlog-item-storage.ts && echo "✓ Storage service exists"
test -f agent-os-ui/src/server/routes/quick-todo.routes.ts && echo "✓ Route file exists"
grep -q "quick-todo" agent-os-ui/src/server/index.ts && echo "✓ Route registered"
grep -q "createQuickTodoItem\|createItem" agent-os-ui/src/server/backlog-item-storage.ts && echo "✓ Service method exists"
cd agent-os-ui && npx tsc --noEmit 2>&1 | grep -c "error TS" | grep -q "^0$" && echo "✓ TypeScript check passed"
```
