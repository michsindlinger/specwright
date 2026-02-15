# Frontend Sidebar Container

> Story ID: CCT-002
> Spec: Cloud Code Terminal
> Created: 2026-02-05
> Last Updated: 2026-02-05

**Priority**: Critical
**Type**: Frontend
**Estimated Effort**: 3 SP
**Dependencies**: CCT-001

---

## Feature

```gherkin
Feature: Frontend Sidebar Container
  Als Entwickler
  möchte ich eine ein-/ausfahrbare Sidebar für das Cloud Terminal,
  damit ich jederzeit Zugriff auf meine Terminal-Sessions habe.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Sidebar öffnen

```gherkin
Scenario: Sidebar wird über Header-Button geöffnet
  Given ich bin im Agent OS Web UI
  And ich habe ein Projekt ausgewählt
  When ich auf den Terminal-Button im Header klicke
  Then öffnet sich die Cloud Terminal Sidebar von rechts
  And die Sidebar zeigt einen "Neue Session" Button
  And die Sidebar zeigt eine Tab-Leiste (initial leer)
```

### Szenario 2: Sidebar schließen

```gherkin
Scenario: Sidebar wird geschlossen aber Session bleibt aktiv
  Given die Cloud Terminal Sidebar ist geöffnet
  And ich habe eine aktive Session
  When ich auf den Schließen-Button der Sidebar klicke
  Then fährt die Sidebar nach rechts aus dem Bildschirm
  And die Session wird pausiert (nicht beendet)
  And der Terminal-Button im Header zeigt an, dass Sessions aktiv sind
```

### Szenario 3: Sidebar wieder öffnen

```gherkin
Scenario: Sidebar wird wieder geöffnet
  Given ich habe eine pausierte Session
  And die Sidebar ist geschlossen
  When ich auf den Terminal-Button im Header klicke
  Then öffnet sich die Sidebar wieder
  And meine pausierte Session wird angezeigt
  And ich kann mit der Session fortfahren
```

### Szenario 4: Header-Button Integration

```gherkin
Scenario: Terminal-Button im Header
  Given ich bin auf einer beliebigen Seite des Web UI
  Then sehe ich den Terminal-Button neben dem Projekt-Selektor
  And der Button zeigt ein Terminal-Icon
  And der Button zeigt eine Badge mit der Anzahl aktiver Sessions (wenn > 0)
```

### Edge Case: Keine aktiven Sessions

```gherkin
Scenario: Sidebar öffnen ohne aktive Sessions
  Given ich habe keine aktiven Cloud Terminal Sessions
  When ich auf den Terminal-Button klicke
  Then öffnet sich die Sidebar
  And es wird ein Empty-State angezeigt: "Keine aktiven Sessions"
  And ein "Neue Session starten" Button ist sichtbar
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [ ] FILE_EXISTS: agent-os-ui/ui/src/components/terminal/aos-cloud-terminal-sidebar.ts
- [ ] FILE_EXISTS: agent-os-ui/ui/src/components/terminal/aos-terminal-tabs.ts

### Inhalt-Prüfungen

- [ ] CONTAINS: agent-os-ui/ui/src/app.ts enthält "aos-cloud-terminal-sidebar"
- [ ] CONTAINS: agent-os-ui/ui/src/components/terminal/aos-cloud-terminal-sidebar.ts enthält "class AosCloudTerminalSidebar"
- [ ] CONTAINS: agent-os-ui/ui/src/components/terminal/aos-terminal-tabs.ts enthält "class AosTerminalTabs"

### Funktions-Prüfungen

- [ ] LINT_PASS: cd agent-os-ui && npm run lint
- [ ] BUILD_PASS: cd agent-os-ui && npm run build

---

## Required MCP Tools

| Tool | Purpose | Blocking |
|------|---------|----------|
| None | - | No |

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

#### Full-Stack Konsistenz (NEU)
- [x] **Alle betroffenen Layer identifiziert** (Frontend/Backend/Database/DevOps)
- [x] **Integration Type bestimmt** (Backend-only/Frontend-only/Full-stack)
- [x] **Kritische Integration Points dokumentiert** (wenn Full-stack)
- [x] **Handover-Dokumente definiert** (bei Multi-Layer: API Contracts, Data Structures)

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [ ] Code implementiert und folgt Style Guide
- [ ] Architektur-Vorgaben eingehalten (WIE section)
- [ ] Security/Performance Anforderungen erfüllt

#### Qualitätssicherung
- [ ] Alle Akzeptanzkriterien erfüllt (via Completion Check verifiziert)
- [ ] Unit Tests geschrieben und bestanden
- [ ] Integration Tests geschrieben und bestanden
- [ ] Code Review durchgeführt und genehmigt

#### Dokumentation
- [ ] Dokumentation aktualisiert
- [ ] Keine Linting Errors
- [ ] Completion Check Commands alle erfolgreich (exit 0)

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | aos-cloud-terminal-sidebar (NEW) | Sidebar container component |
| Frontend | aos-terminal-tabs (NEW) | Tab bar component |
| Frontend | app.ts (MODIFY) | Add terminal button to header |

**Kritische Integration Points:**
- app.ts → aos-cloud-terminal-sidebar: Component rendering
- aos-cloud-terminal-sidebar → aos-terminal-tabs: Tab management

---

### Technical Details

**WAS:**
- aos-cloud-terminal-sidebar Component (Sliding sidebar container)
- aos-terminal-tabs Component (Tab bar for sessions)
- Terminal button in app.ts header
- Integration with CloudTerminalService for session count badge

**WIE (Architektur-Guidance ONLY):**
- Kopiere Sidebar-Pattern von spec-chat sidebar in kanban-board.ts
- Nutze CSS transitions für smooth slide-in/out
- Fixed positioning mit z-index (siehe knowledge-index: context-menu 1000, modal 1001)
- Light DOM Pattern (createRenderRoot = this) für Styling-Kompatibilität
- Event dispatch für sidebar-open/close events

**WO:**
- agent-os-ui/ui/src/components/terminal/aos-cloud-terminal-sidebar.ts (NEW)
- agent-os-ui/ui/src/components/terminal/aos-terminal-tabs.ts (NEW)
- agent-os-ui/ui/src/app.ts (MODIFY)

**WER:** dev-team__frontend-developer

**Abhängigkeiten:** CCT-001

**Geschätzte Komplexität:** M

**Relevante Skills:**

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-ui-component-architecture | agent-os/skills/frontend-ui-component-architecture.md | Lit Web Components for sidebar |
| frontend-state-management | agent-os/skills/frontend-state-management.md | Sidebar state and tab management |

---

### Creates Reusable Artifacts

**Creates Reusable:** yes

**Reusable Artifacts:**

| Artefakt | Typ | Pfad | Beschreibung |
|----------|-----|------|--------------|
| aos-cloud-terminal-sidebar | UI Component | ui/src/components/terminal/aos-cloud-terminal-sidebar.ts | Sliding sidebar container für Cloud Terminal |
| aos-terminal-tabs | UI Component | ui/src/components/terminal/aos-terminal-tabs.ts | Tab bar für Terminal Sessions |

---

### Completion Check

```bash
# Auto-Verify Commands - alle müssen mit 0 exiten
grep -q "aos-cloud-terminal-sidebar" agent-os-ui/ui/src/app.ts
grep -q "class AosCloudTerminalSidebar" agent-os-ui/ui/src/components/terminal/aos-cloud-terminal-sidebar.ts
grep -q "class AosTerminalTabs" agent-os-ui/ui/src/components/terminal/aos-terminal-tabs.ts
cd agent-os-ui && npm run lint
cd agent-os-ui && npm run build
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen
