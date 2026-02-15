# Dynamische Queue-Bearbeitung

> Story ID: SKQ-006
> Spec: 2026-02-03-spec-kanban-queue
> Created: 2026-02-03
> Last Updated: 2026-02-03
> Status: Done

**Priority**: Medium
**Type**: Full-stack
**Estimated Effort**: S
**Dependencies**: SKQ-005

---

## Feature

```gherkin
Feature: Dynamische Queue-Bearbeitung
  Als Entwickler
  möchte ich die Queue während der Ausführung bearbeiten können,
  damit ich flexibel auf neue Anforderungen reagieren kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Spec zur laufenden Queue hinzufügen

```gherkin
Scenario: Spec während Ausführung hinzufügen
  Given die Queue läuft mit 2 Specs
  When ich einen neuen Spec in die Queue ziehe
  Then wird der neue Spec am Ende der Queue hinzugefügt
  And er hat den Status "pending"
  And die Queue läuft ohne Unterbrechung weiter
```

### Szenario 2: Pending Spec aus laufender Queue entfernen

```gherkin
Scenario: Pending Spec entfernen während Queue läuft
  Given die Queue läuft
  And es gibt einen Spec mit Status "pending"
  When ich diesen Spec entferne
  Then wird er aus der Queue entfernt
  And die Queue läuft ohne Unterbrechung weiter
```

### Szenario 3: Queue-Reihenfolge während Lauf ändern

```gherkin
Scenario: Ausstehende Specs umsortieren
  Given die Queue läuft
  And es gibt 3 pending Specs: "A", "B", "C"
  When ich "C" vor "A" ziehe
  Then ist die neue Reihenfolge: "C", "A", "B"
  And die Queue läuft ohne Unterbrechung weiter
```

### Szenario 4: Running oder Done Specs können nicht bearbeitet werden

```gherkin
Scenario: Running Specs sind geschützt
  Given die Queue läuft
  And ein Spec hat Status "running"
  When ich versuche diesen Spec zu entfernen oder zu verschieben
  Then wird die Aktion blockiert
  And ein Tooltip erklärt: "Laufende Specs können nicht bearbeitet werden"
```

---

## Technische Verifikation (Automated Checks)

### Inhalt-Prüfungen

- [x] CONTAINS: queue.service.ts enthält "addToRunningQueue"
- [x] CONTAINS: queue.service.ts enthält "removeFromRunningQueue"
- [x] CONTAINS: queue.service.ts enthält "reorderRunningQueue"
- [x] CONTAINS: queue.handler.ts enthält "queue.add"
- [x] CONTAINS: queue.handler.ts enthält "queue.remove"
- [x] CONTAINS: queue.handler.ts enthält "queue.reorder"

### Funktions-Prüfungen

- [x] LINT_PASS: cd agent-os-ui && npm run lint exits with code 0

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
- [x] Unit Tests geschrieben und bestanden
- [x] Code Review durchgeführt und genehmigt

#### Dokumentation
- [x] Keine Linting Errors
- [x] Completion Check Commands alle erfolgreich (exit 0)

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Full-stack

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Backend | `queue.service.ts` | Dynamische Operationen |
| Backend | `queue.handler.ts` | Validierungslogik |
| Frontend | `aos-queue-item.ts` | Disable-State für running/done |
| Frontend | `aos-queue-sidebar.ts` | Validierung bei Drop/Remove |

**Kritische Integration Points:**
- Frontend Validation → Backend Validation: Konsistente Regeln

---

### Technical Details

**WAS:**
- Dynamisches Hinzufügen während Queue-Lauf
- Entfernen von pending Specs während Lauf
- Umsortieren von pending Specs während Lauf
- Schutz für running/done Specs

**WIE (Architektur-Guidance ONLY):**
- Validiere im Backend ob Operationen erlaubt sind
- Prüfe Status vor jeder Mutation: nur "pending" darf bearbeitet werden
- Frontend zeigt visuell an welche Items bearbeitbar sind (opacity, cursor)
- Sende Fehler-Response wenn ungültige Operation versucht wird

**WO:**
- `agent-os-ui/src/server/services/queue.service.ts` (erweitern)
- `agent-os-ui/src/server/handlers/queue.handler.ts` (erweitern)
- `agent-os-ui/ui/src/components/queue/aos-queue-item.ts` (erweitern)
- `agent-os-ui/ui/src/components/queue/aos-queue-sidebar.ts` (erweitern)

**Abhängigkeiten:** SKQ-005

**Geschätzte Komplexität:** S

**WER:** dev-team__backend-developer

---

### Relevante Skills

| Skill | Pfad | Grund |
|-------|------|-------|
| backend-express | agent-os/skills/backend-express.md | Backend Express + TypeScript |
| frontend-lit | agent-os/skills/frontend-lit.md | Lit Web Components Entwicklung |

---

### Creates Reusable Artifacts

**Creates Reusable:** no

---

### Completion Check

```bash
# Auto-Verify Commands - alle müssen mit 0 exiten
grep -q "addToRunningQueue\|canAdd" agent-os-ui/src/server/services/queue.service.ts && echo "✓ Dynamic add support"
grep -q "removeFromRunningQueue\|canRemove" agent-os-ui/src/server/services/queue.service.ts && echo "✓ Dynamic remove support"
grep -q "reorderRunningQueue\|canReorder" agent-os-ui/src/server/services/queue.service.ts && echo "✓ Dynamic reorder support"
cd agent-os-ui && npm run lint
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen
