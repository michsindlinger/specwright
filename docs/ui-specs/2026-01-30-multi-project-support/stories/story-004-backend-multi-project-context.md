# Backend Multi-Project Context

> Story ID: MPRO-004
> Spec: multi-project-support
> Created: 2026-01-30
> Last Updated: 2026-01-30

**Priority**: High
**Type**: Backend
**Estimated Effort**: S
**Dependencies**: None

---

## Feature

```gherkin
Feature: Backend Projekt-Kontext-Management
  Als System
  möchte ich mehrere Projekt-Kontexte gleichzeitig verwalten können,
  damit Nutzer zwischen Projekten wechseln können ohne Daten zu verlieren.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Projekt-Kontext wechseln

```gherkin
Scenario: Backend wechselt auf neuen Projekt-Kontext
  Given der Server läuft
  And kein Projekt-Kontext ist aktiv
  When ich einen POST Request an "/api/project/switch" mit Pfad "/Users/dev/my-project" sende
  Then erhalte ich HTTP Status 200
  And die Response enthält den Projekt-Namen "my-project"
  And der Kontext ist für diesen Pfad initialisiert
```

### Szenario 2: Specs für Projekt laden

```gherkin
Scenario: Specs werden aus Projekt-spezifischem Ordner geladen
  Given der Projekt-Kontext ist auf "/Users/dev/my-project" gesetzt
  When ich einen GET Request an "/api/specs" sende
  Then werden die Specs aus "/Users/dev/my-project/agent-os/specs/" geladen
  And nicht aus einem anderen Projekt-Ordner
```

### Szenario 3: Mehrere Projekte parallel

```gherkin
Scenario: Mehrere Projekt-Kontexte gleichzeitig aktiv
  Given Nutzer A hat Projekt-Kontext "project-a" aktiv
  And Nutzer B hat Projekt-Kontext "project-b" aktiv
  When Nutzer A die Specs lädt
  Then erhält Nutzer A die Specs von "project-a"
  And Nutzer B erhält weiterhin die Specs von "project-b"
```

### Szenario 4: Projekt-Validierung

```gherkin
Scenario: Ungültiger Projekt-Pfad wird abgelehnt
  Given der Server läuft
  When ich einen POST Request an "/api/project/switch" mit Pfad "/Users/dev/invalid-folder" sende
  And der Ordner keinen "agent-os/" Unterordner enthält
  Then erhalte ich HTTP Status 400
  And die Response enthält "Invalid project: missing agent-os/ directory"
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Projekt-Pfad existiert nicht
  Given der Server läuft
  When ich einen POST Request an "/api/project/switch" mit Pfad "/non/existent/path" sende
  Then erhalte ich HTTP Status 404
  And die Response enthält "Project path does not exist"
```

```gherkin
Scenario: Aktuelles Projekt abrufen
  Given der Projekt-Kontext ist auf "/Users/dev/my-project" gesetzt
  When ich einen GET Request an "/api/project/current" sende
  Then erhalte ich HTTP Status 200
  And die Response enthält den Pfad "/Users/dev/my-project"
  And die Response enthält den Namen "my-project"
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [x] FILE_EXISTS: agent-os-ui/src/server/project-context.service.ts
- [x] FILE_EXISTS: agent-os-ui/src/server/project.routes.ts

### Inhalt-Prüfungen

- [x] CONTAINS: agent-os-ui/src/server/project-context.service.ts enthält "class ProjectContextService"
- [x] CONTAINS: agent-os-ui/src/server/project.routes.ts enthält "/api/project/switch"
- [x] CONTAINS: agent-os-ui/src/server/project.routes.ts enthält "/api/project/current"

### Funktions-Prüfungen

- [x] LINT_PASS: npm run lint exits with code 0
- [x] TEST_PASS: npm run test project-context exits with code 0

---

## Required MCP Tools

| Tool | Purpose | Blocking |
|------|---------|----------|
| None | - | - |

---

## Technisches Refinement (vom Architect)

> **Ausgefüllt:** 2026-01-30

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
- [x] **Alle betroffenen Layer identifiziert**
- [x] **Integration Type bestimmt**
- [x] **Kritische Integration Points dokumentiert** (wenn Full-stack)
- [x] **Handover-Dokumente definiert** (bei Multi-Layer)

**Story ist READY wenn alle Checkboxen angehakt sind.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [x] Code implementiert und folgt Style Guide
- [x] Architektur-Vorgaben eingehalten (WIE section)
- [x] Security/Performance Anforderungen erfüllt

#### Qualitätssicherung
- [x] Alle Akzeptanzkriterien erfüllt (via Completion Check verifiziert)
- [x] Unit Tests geschrieben und bestanden
- [x] Integration Tests geschrieben und bestanden
- [x] Code Review durchgeführt und genehmigt

#### Dokumentation
- [x] Dokumentation aktualisiert
- [x] Keine Linting Errors
- [x] Completion Check Commands alle erfolgreich (exit 0)

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Backend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Backend | project-context.service.ts | Neu erstellen |
| Backend | project.routes.ts | Neu erstellen |
| Backend | index.ts | Route-Registrierung |
| Backend | specs-reader.ts | Anpassen (projektabhängig) |

**Kritische Integration Points:**
- specs-reader.ts muss den aktiven Projekt-Pfad aus project-context.service beziehen
- Wird von Frontend via REST API aufgerufen
- Wird von MPRO-005 (WebSocket) für Projekt-Zuordnung verwendet

---

### Technical Details

**WAS:**
- Neuer Service `ProjectContextService` für Multi-Projekt-Verwaltung
- REST-Endpoints: `POST /api/project/switch`, `GET /api/project/current`, `POST /api/project/validate`
- Projekt-Kontext pro Client-Session (via Session-ID oder Connection-ID)
- Validierung: Prüfung auf `agent-os/` Unterordner

**WIE (Architektur-Guidance ONLY):**
- Service Layer Pattern gemäß DEC-001 (3-Tier Architecture)
- `Map<string, ProjectContext>` für Session-zu-Projekt Mapping
- Express Router für REST-Endpoints
- Zod-Validierung für Request-Bodies
- Fehlerbehandlung via AppError-Klasse aus error.middleware
- Path-Traversal Prevention: Validiere dass Pfad existiert und `agent-os/` enthält
- Extrahiere Projekt-Name aus Ordner-Pfad (basename)

**WO:**
- `agent-os-ui/src/server/project-context.service.ts` (Neu)
- `agent-os-ui/src/server/project.routes.ts` (Neu)
- `agent-os-ui/src/server/index.ts` (Anpassen)
- `agent-os-ui/src/server/specs-reader.ts` (Anpassen)

**WER:** dev-team__backend-developer

**Abhängigkeiten:** None

**Geschätzte Komplexität:** S

**Relevante Skills:**
- `backend-express` - Service-Pattern und Route-Handler
- `quality-gates` - Security (Path-Traversal Prevention)

**Creates Reusable:** yes

| Artefakt | Typ | Pfad | Beschreibung |
|----------|-----|------|--------------|
| `ProjectContextService` | Service | `agent-os-ui/src/server/project-context.service.ts` | Backend Multi-Projekt-Context-Management |
| `/api/project/*` | API | `agent-os-ui/src/server/project.routes.ts` | REST-Endpoints für Projekt-Wechsel |

---

### Completion Check

```bash
# Auto-Verify Commands - alle müssen mit 0 exiten
test -f agent-os-ui/src/server/project-context.service.ts && echo "Service exists"
test -f agent-os-ui/src/server/project.routes.ts && echo "Routes exist"
grep -q "class ProjectContextService" agent-os-ui/src/server/project-context.service.ts
grep -q "/api/project/switch" agent-os-ui/src/server/project.routes.ts
grep -q "/api/project/current" agent-os-ui/src/server/project.routes.ts
cd agent-os-ui && npm run lint
cd agent-os-ui && npm run test -- --filter="project-context"
# API Test
curl -s -X POST http://localhost:3000/api/project/validate -H "Content-Type: application/json" -d '{"path": "."}' | grep -q "valid"
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen
