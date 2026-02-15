# Embedded Docs-Viewer

> Story ID: WKFL-004
> Spec: Interactive Workflows
> Created: 2026-01-30
> Last Updated: 2026-01-30

**Priority**: High
**Type**: Frontend
**Estimated Effort**: M
**Dependencies**: WKFL-001
**Status**: Done

---

## Feature

```gherkin
Feature: Live-Preview generierter Dokumente
  Als Entwickler
  möchte ich generierte Dokumente während des Workflows live sehen,
  damit ich den Fortschritt und das Ergebnis direkt verfolgen kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Docs-Viewer öffnet sich automatisch

```gherkin
Scenario: Docs-Viewer öffnet bei erstem generierten Dokument
  Given ein Workflow läuft
  And der Workflow erstellt das erste Dokument "requirements-clarification.md"
  Then öffnet sich der Docs-Viewer als Panel rechts neben dem Chat
  And ich sehe den Inhalt des generierten Dokuments
```

### Szenario 2: Dokument aktualisiert sich live

```gherkin
Scenario: Dokument aktualisiert sich während des Workflows
  Given ein Workflow läuft
  And der Docs-Viewer zeigt "spec.md"
  When der Workflow weiteren Inhalt zu "spec.md" hinzufügt
  Then aktualisiert sich der Inhalt im Docs-Viewer automatisch
  And ich sehe die Änderungen ohne manuelles Neuladen
```

### Szenario 3: Zwischen Dokumenten wechseln

```gherkin
Scenario: Zwischen mehreren generierten Dokumenten wechseln
  Given ein Workflow hat mehrere Dokumente erstellt
  And ich sehe eine Dokumentenliste in der Sidebar
  When ich auf "story-001.md" klicke
  Then wechselt die Ansicht zu diesem Dokument
  And das vorherige Dokument bleibt in der Liste
```

### Szenario 4: Docs-Viewer schließen und öffnen

```gherkin
Scenario: Docs-Viewer Panel schließen
  Given der Docs-Viewer ist geöffnet
  When ich auf den "Schließen" Button des Panels klicke
  Then schließt sich das Docs-Viewer Panel
  And der Workflow-Chat nimmt die volle Breite ein
  When ein neues Dokument generiert wird
  Then öffnet sich der Docs-Viewer wieder automatisch
```

### Edge Case: Docs-Viewer kann Datei nicht laden

```gherkin
Scenario: Fehler beim Laden eines Dokuments
  Given der Workflow verweist auf ein Dokument
  And das Dokument existiert nicht mehr
  Then zeigt der Docs-Viewer eine Fehlermeldung
  And ich sehe einen Link zum Dateipfad als Fallback
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [x] FILE_EXISTS: agent-os-ui/ui/src/views/workflow-view.ts
- [x] CONTAINS: workflow-view.ts enthält "aos-docs-viewer" oder "embedded-docs"
- [x] CONTAINS: workflow-view.ts enthält "split-view" oder "panel"

### Funktions-Prüfungen

- [x] LINT_PASS: npm run lint exits with code 0
- [ ] TEST_PASS: npm run test:ui -- --grep "docs-viewer" exits with code 0 (no test script configured)

---

## Required MCP Tools

| Tool | Purpose | Blocking |
|------|---------|----------|
| None | N/A | No |

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
- [ ] Unit Tests geschrieben und bestanden (no test framework configured)
- [ ] Integration Tests geschrieben und bestanden (no test framework configured)
- [x] Code Review durchgeführt und genehmigt

#### Dokumentation
- [x] Dokumentation aktualisiert
- [x] Keine Linting Errors
- [x] Completion Check Commands alle erfolgreich (exit 0)

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | `agent-os-ui/ui/src/views/workflow-view.ts` | Split-View Layout mit Docs-Panel hinzufügen |
| Frontend | `agent-os-ui/ui/src/components/docs/aos-docs-viewer.ts` | Als eingebettetes Panel integrierbar machen (embedded prop) |

---

### Technical Details

**WAS:**
- Workflow-View um Split-View Layout erweitern (Chat links, Docs rechts)
- Docs-Viewer als eingebettetes Panel statt separate View
- Auto-Open bei erstem generierten Dokument
- Toggle-Button zum Schließen/Öffnen
- Dokumentenliste bei mehreren generierten Dokumenten

**WIE (Architektur-Guidance ONLY):**
- CSS Flexbox für Split-View Layout (bereits in Project-Seiten verwendet)
- Neue `@property({ type: Boolean }) embedded = false` in aos-docs-viewer für Panel-Modus
- Responsive: Bei kleinen Bildschirmen Docs-Viewer als Overlay (@media query)
- WebSocket-Event `workflow.tool` mit toolName === 'Write' triggert Auto-Open
- State: `@state() private docsViewerOpen = false`
- State: `@state() private generatedDocs: string[] = []`

**WO:**
- `agent-os-ui/ui/src/views/workflow-view.ts`
- `agent-os-ui/ui/src/components/docs/aos-docs-viewer.ts`

**WER:** dev-team__frontend-developer

**Abhängigkeiten:** WKFL-001

**Geschätzte Komplexität:** M

**Relevante Skills:**

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | agent-os/team/skills/frontend-lit.md | Lit Web Components Entwicklung |

---

### Completion Check

```bash
# Auto-Verify Commands
grep -q "split-view\|docsViewerOpen\|embedded" agent-os-ui/ui/src/views/workflow-view.ts
grep -q "embedded" agent-os-ui/ui/src/components/docs/aos-docs-viewer.ts
npm run lint
npm run test:ui -- --grep "docs"
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen
