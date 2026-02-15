# Queue-Sidebar Component erstellen

> Story ID: SKQ-001
> Spec: 2026-02-03-spec-kanban-queue
> Created: 2026-02-03
> Last Updated: 2026-02-03

**Priority**: Critical
**Type**: Frontend
**Status**: Done
**Estimated Effort**: S
**Dependencies**: None

---

## Feature

```gherkin
Feature: Queue-Sidebar
  Als Entwickler
  möchte ich eine Queue-Sidebar im Dashboard sehen,
  damit ich sehe welche Specs zur automatischen Verarbeitung anstehen.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Queue-Sidebar wird im Dashboard angezeigt

```gherkin
Scenario: Queue-Sidebar ist sichtbar im Dashboard
  Given ich bin im Dashboard-View
  When das Dashboard geladen ist
  Then sehe ich eine Queue-Sidebar rechts neben der Spec-Liste
  And die Sidebar zeigt die Überschrift "Queue"
```

### Szenario 2: Leere Queue zeigt Hinweis

```gherkin
Scenario: Leere Queue zeigt hilfreichen Hinweis
  Given ich bin im Dashboard-View
  And die Queue ist leer
  When ich die Queue-Sidebar betrachte
  Then sehe ich den Hinweis "Ziehe Specs hierher um sie zur Queue hinzuzufügen"
```

### Szenario 3: Queue-Items werden angezeigt

```gherkin
Scenario: Queue zeigt eingereihte Specs
  Given die Queue enthält 3 Specs
  When ich die Queue-Sidebar betrachte
  Then sehe ich 3 Queue-Items in der Reihenfolge
  And jedes Item zeigt den Spec-Namen
  And jedes Item zeigt den Status (pending/running/done/failed)
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Queue ist als Drop-Zone erkennbar beim Draggen
  Given ich ziehe einen Spec-Card
  When ich über die Queue-Sidebar hovere
  Then wird die Queue-Sidebar visuell als Drop-Zone hervorgehoben
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [ ] FILE_EXISTS: agent-os-ui/ui/src/components/queue/aos-queue-sidebar.ts
- [ ] FILE_EXISTS: agent-os-ui/ui/src/components/queue/aos-queue-item.ts

### Inhalt-Prüfungen

- [ ] CONTAINS: aos-queue-sidebar.ts enthält "class AosQueueSidebar extends LitElement"
- [ ] CONTAINS: aos-queue-sidebar.ts enthält "@customElement('aos-queue-sidebar')"
- [ ] CONTAINS: aos-queue-item.ts enthält "class AosQueueItem extends LitElement"
- [ ] CONTAINS: aos-queue-item.ts enthält "@customElement('aos-queue-item')"

### Funktions-Prüfungen

- [ ] LINT_PASS: cd agent-os-ui && npm run lint exits with code 0

---

## Required MCP Tools

Keine MCP Tools erforderlich.

---

## Technisches Refinement (vom Architect)

> **⚠️ WICHTIG:** Dieser Abschnitt wird vom Architect ausgefüllt

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
- [x] **Kritische Integration Points dokumentiert**
- [x] **Handover-Dokumente definiert**

**Story ist READY wenn alle Checkboxen angehakt sind.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [x] Code implementiert und folgt Style Guide
- [x] Architektur-Vorgaben eingehalten (WIE section)
- [x] Security/Performance Anforderungen erfüllt

#### Qualitätssicherung
- [x] Alle Akzeptanzkriterien erfüllt
- [ ] Unit Tests geschrieben und bestanden
- [ ] Code Review durchgeführt und genehmigt

#### Dokumentation
- [x] Keine Linting Errors
- [x] Completion Check Commands alle erfolgreich (exit 0)

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | `aos-queue-sidebar.ts`, `aos-queue-item.ts` | Neu erstellen |
| Frontend | `dashboard-view.ts` | Queue-Sidebar einbinden |

**Kritische Integration Points:**
- `aos-queue-sidebar.ts` → `dashboard-view.ts`: Custom Events für Queue-Aktionen

---

### Technical Details

**WAS:**
- Neue Lit-Komponente `aos-queue-sidebar` erstellen
- Neue Lit-Komponente `aos-queue-item` für einzelne Queue-Einträge
- Dashboard-View um Sidebar-Integration erweitern

**WIE (Architektur-Guidance ONLY):**
- Folge dem Muster aus `kanban-board.ts` für Struktur
- Verwende CSS Custom Properties für Dark Theme
- Nutze Custom Events für Kommunikation mit Parent (bubbles, composed)
- Drop-Zone Styling wie in `kanban-board.ts` (`.drop-zone-active`)

**WO:**
- `agent-os-ui/ui/src/components/queue/aos-queue-sidebar.ts` (neu)
- `agent-os-ui/ui/src/components/queue/aos-queue-item.ts` (neu)
- `agent-os-ui/ui/src/views/dashboard-view.ts` (erweitern)

**Abhängigkeiten:** None

**Geschätzte Komplexität:** S

**WER:** dev-team__frontend-developer

---

### Relevante Skills

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | agent-os/skills/frontend-lit.md | Lit Web Components Entwicklung |

---

### Creates Reusable Artifacts

**Creates Reusable:** yes

| Artefakt | Typ | Pfad | Beschreibung |
|----------|-----|------|--------------|
| aos-queue-sidebar | UI Component | agent-os-ui/ui/src/components/queue/aos-queue-sidebar.ts | Wiederverwendbare Queue-Sidebar |
| aos-queue-item | UI Component | agent-os-ui/ui/src/components/queue/aos-queue-item.ts | Queue-Item für jede Queue-Sidebar |

---

### Completion Check

```bash
# Auto-Verify Commands - alle müssen mit 0 exiten
test -f agent-os-ui/ui/src/components/queue/aos-queue-sidebar.ts && echo "✓ Queue-Sidebar exists"
test -f agent-os-ui/ui/src/components/queue/aos-queue-item.ts && echo "✓ Queue-Item exists"
grep -q "aos-queue-sidebar" agent-os-ui/ui/src/views/dashboard-view.ts && echo "✓ Integrated in dashboard"
cd agent-os-ui && npm run lint
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen
