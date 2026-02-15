# Project Context Switching

> Story ID: MPRO-006
> Spec: multi-project-support
> Created: 2026-01-30
> Last Updated: 2026-01-30

**Priority**: High
**Type**: Frontend
**Estimated Effort**: S
**Dependencies**: MPRO-001, MPRO-004, MPRO-005
**Status**: Done

---

## Feature

```gherkin
Feature: Projekt-Kontext-Wechsel
  Als Entwickler
  möchte ich dass beim Projekt-Wechsel alle UI-Bereiche aktualisiert werden,
  damit ich immer den korrekten Kontext des aktiven Projekts sehe.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Specs werden aktualisiert

```gherkin
Scenario: Specs-View zeigt Projekt-spezifische Specs
  Given ich habe Projekt "project-a" aktiv
  And "project-a" hat 3 Specs
  When ich zu Projekt "project-b" wechsle
  And "project-b" hat 5 Specs
  Then zeigt die Specs-View die 5 Specs von "project-b"
  And nicht mehr die Specs von "project-a"
```

### Szenario 2: Chat wird zurückgesetzt

```gherkin
Scenario: Chat-Historie wird beim Projekt-Wechsel zurückgesetzt
  Given ich habe Projekt "project-a" aktiv
  And ich habe Chat-Nachrichten in "project-a" geschrieben
  When ich zu Projekt "project-b" wechsle
  Then ist der Chat leer
  And ich sehe den Chat-Startbildschirm
```

### Szenario 3: Docs-View zeigt korrekte Dokumente

```gherkin
Scenario: Docs-View lädt Projekt-spezifische Dokumentation
  Given ich habe Projekt "project-a" aktiv
  When ich zu Projekt "project-b" wechsle
  And ich die Docs-View öffne
  Then werden die Dokumente aus "project-b/agent-os/docs/" geladen
```

### Szenario 4: Browser-Refresh stellt Zustand wieder her

```gherkin
Scenario: Geöffnete Tabs werden nach Refresh wiederhergestellt
  Given ich habe die Projekte "project-a" und "project-b" geöffnet
  And "project-b" ist der aktive Tab
  When ich die Seite neu lade
  Then sehe ich beide Tabs
  And "project-b" ist weiterhin der aktive Tab
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Projekt-Pfad nicht mehr verfügbar nach Refresh
  Given ich habe das Projekt "deleted-project" geöffnet
  And der Ordner wurde gelöscht
  When ich die Seite neu lade
  Then wird der Tab "deleted-project" nicht wiederhergestellt
  And ich sehe eine kurze Benachrichtigung "Projekt nicht gefunden"
```

```gherkin
Scenario: Schnelles Wechseln zwischen Projekten
  Given ich habe 3 Projekte geöffnet
  When ich schnell hintereinander zwischen den Tabs wechsle
  Then werden keine Race-Conditions verursacht
  And der angezeigte Kontext entspricht immer dem aktiven Tab
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [ ] FILE_EXISTS: agent-os-ui/ui/src/context/project-context.ts
- [ ] FILE_EXISTS: agent-os-ui/ui/src/services/project-state.service.ts

### Inhalt-Prüfungen

- [ ] CONTAINS: agent-os-ui/ui/src/context/project-context.ts enthält "createContext"
- [ ] CONTAINS: agent-os-ui/ui/src/services/project-state.service.ts enthält "switchProject"

### Funktions-Prüfungen

- [ ] LINT_PASS: npm run lint exits with code 0
- [ ] TEST_PASS: npm run test -- --filter="project-context" exits with code 0

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

**Integration Type:** Full-stack

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | project-context.ts | Neu erstellen (Lit Context) |
| Frontend | project-state.service.ts | Neu erstellen |
| Frontend | gateway.ts | Anpassen (Project-ID) |
| Frontend | app.ts | Integration Context Provider |
| Frontend | dashboard-view.ts | Anpassen (Context Consumer) |

**Kritische Integration Points:**
- Frontend Lit Context -> Backend POST /api/project/switch
- Frontend WebSocket-Client -> Backend WebSocket mit projectId
- Alle Views konsumieren Project Context

---

### Technical Details

**WAS:**
- Neuer Lit Context `ProjectContext` mit aktivem Projekt und geöffneten Projekten
- Neuer Service `ProjectStateService` für Projekt-Wechsel-Logik
- Session-Persistenz via sessionStorage (geöffnete Tabs, aktiver Tab)
- Automatische Wiederherstellung nach Browser-Refresh
- Synchronisation mit Backend bei Projekt-Wechsel

**WIE (Architektur-Guidance ONLY):**
- Lit Context API (`createContext`, `ContextProvider`, `ContextConsumer`)
- Context-Interface: `{ activeProject: Project | null, openProjects: Project[], switchProject: (id) => void }`
- sessionStorage Key: `agent-os-open-projects` für Tab-Persistenz
- Bei switchProject: 1) Update Context, 2) Call Backend API, 3) Reconnect WebSocket
- Race-Condition Prevention: Debounce schnelles Tab-Wechseln
- Error Handling: Bei Backend-Fehler Context nicht aktualisieren
- Views nutzen `@consume({ context: projectContext })` Decorator

**WO:**
- `agent-os-ui/ui/src/context/project-context.ts` (Neu)
- `agent-os-ui/ui/src/services/project-state.service.ts` (Neu)
- `agent-os-ui/ui/src/gateway.ts` (Anpassen)
- `agent-os-ui/ui/src/app.ts` (Anpassen)
- `agent-os-ui/ui/src/views/dashboard-view.ts` (Anpassen)

**WER:** dev-team__frontend-developer

**Abhängigkeiten:** MPRO-001, MPRO-004, MPRO-005

**Geschätzte Komplexität:** M

**Relevante Skills:**
- `frontend-lit` - Context API, State-Management
- `domain-agent-os-web-ui` - Project-Management Domain

**Creates Reusable:** yes

| Artefakt | Typ | Pfad | Beschreibung |
|----------|-----|------|--------------|
| `ProjectContext` | Context | `agent-os-ui/ui/src/context/project-context.ts` | Lit Context für aktives Projekt und offene Projekte |
| `ProjectStateService` | Service | `agent-os-ui/ui/src/services/project-state.service.ts` | Projekt-Wechsel-Logik und sessionStorage-Persistenz |

---

### Completion Check

```bash
# Auto-Verify Commands - alle müssen mit 0 exiten
test -f agent-os-ui/ui/src/context/project-context.ts && echo "Context exists"
test -f agent-os-ui/ui/src/services/project-state.service.ts && echo "Service exists"
grep -q "createContext" agent-os-ui/ui/src/context/project-context.ts
grep -q "switchProject" agent-os-ui/ui/src/services/project-state.service.ts
cd agent-os-ui && npm run lint
cd agent-os-ui && npm run test -- --filter="project-context"
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen
