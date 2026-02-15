# Drag-Drop Integration für Queue

> Story ID: SKQ-002
> Spec: 2026-02-03-spec-kanban-queue
> Created: 2026-02-03
> Last Updated: 2026-02-03

**Priority**: Critical
**Type**: Frontend
**Estimated Effort**: S
**Dependencies**: SKQ-001
**Status**: Done

---

## Feature

```gherkin
Feature: Drag-Drop zur Queue
  Als Entwickler
  möchte ich Specs per Drag-Drop in die Queue ziehen können,
  damit ich schnell eine Ausführungsreihenfolge festlegen kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Spec-Card ist draggable

```gherkin
Scenario: Spec-Card kann gezogen werden
  Given ich bin im Dashboard-View
  When ich eine Spec-Card anklicke und ziehe
  Then wird die Card visuell als "wird gezogen" dargestellt
  And ich kann sie zur Queue-Sidebar ziehen
```

### Szenario 2: Drop auf Queue fügt Spec hinzu

```gherkin
Scenario: Spec wird zur Queue hinzugefügt beim Drop
  Given ich ziehe eine Spec-Card
  When ich sie auf die Queue-Sidebar fallen lasse
  Then wird der Spec zur Queue hinzugefügt
  And der Spec erscheint als letztes Item in der Queue
```

### Szenario 3: Queue-Items können umsortiert werden

```gherkin
Scenario: Queue-Reihenfolge per Drag-Drop ändern
  Given die Queue enthält 3 Specs: "Feature-A", "Feature-B", "Feature-C"
  When ich "Feature-C" an die erste Position ziehe
  Then ist die Reihenfolge: "Feature-C", "Feature-A", "Feature-B"
```

### Szenario 4: Spec kann aus Queue entfernt werden

```gherkin
Scenario: Spec aus Queue entfernen
  Given die Queue enthält den Spec "Feature-A"
  And "Feature-A" hat Status "pending"
  When ich auf das Entfernen-Icon bei "Feature-A" klicke
  Then wird "Feature-A" aus der Queue entfernt
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Laufender Spec kann nicht entfernt werden
  Given die Queue enthält den Spec "Feature-A" mit Status "running"
  When ich das Entfernen-Icon betrachte
  Then ist das Icon deaktiviert
  And ein Tooltip zeigt "Laufende Specs können nicht entfernt werden"
```

```gherkin
Scenario: Gleicher Spec kann nicht doppelt hinzugefügt werden
  Given die Queue enthält bereits den Spec "Feature-A"
  When ich "Feature-A" erneut in die Queue ziehe
  Then wird eine Toast-Nachricht angezeigt: "Spec bereits in Queue"
  And der Spec wird nicht doppelt hinzugefügt
```

---

## Technische Verifikation (Automated Checks)

### Inhalt-Prüfungen

- [x] CONTAINS: spec-card.ts enthält "draggable"
- [x] CONTAINS: aos-queue-sidebar.ts enthält "handleDrop"
- [x] CONTAINS: aos-queue-sidebar.ts enthält "handleDragOver"
- [x] CONTAINS: aos-queue-sidebar.ts enthält "draggable" (für Queue-Items, im Wrapper)

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
- [ ] Unit Tests geschrieben und bestanden
- [x] Code Review durchgeführt und genehmigt

#### Dokumentation
- [x] Keine Linting Errors
- [x] Completion Check Commands alle erfolgreich (exit 0)

**Status: Done**

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | `spec-card.ts` | draggable hinzufügen |
| Frontend | `aos-queue-sidebar.ts` | Drop-Handler |
| Frontend | `aos-queue-item.ts` | draggable für Umsortierung |

**Kritische Integration Points:**
- `spec-card.ts` → `aos-queue-sidebar.ts`: Drag-Drop Event

---

### Technical Details

**WAS:**
- Spec-Card draggable machen mit HTML5 Drag-Drop API
- Queue-Sidebar als Drop-Zone konfigurieren
- Queue-Items untereinander sortierbar machen
- Entfernen-Button für Queue-Items (disabled wenn running)

**WIE (Architektur-Guidance ONLY):**
- Nutze exakt das Drag-Drop-Pattern aus `kanban-board.ts` (Zeilen 273-409)
- `handleDragStart`, `handleDragOver`, `handleDragLeave`, `handleDrop`
- Speichere Spec-ID im dataTransfer: `e.dataTransfer.setData('text/plain', specId)`
- Validiere Drops (keine Duplikate, nicht während running)
- Zeige Toast bei Validierungsfehlern

**WO:**
- `agent-os-ui/ui/src/components/spec-card.ts` (erweitern)
- `agent-os-ui/ui/src/components/queue/aos-queue-sidebar.ts` (erweitern)
- `agent-os-ui/ui/src/components/queue/aos-queue-item.ts` (erweitern)

**Abhängigkeiten:** SKQ-001

**Geschätzte Komplexität:** S

**WER:** dev-team__frontend-developer

---

### Relevante Skills

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | agent-os/skills/frontend-lit.md | Lit Web Components Entwicklung |

---

### Creates Reusable Artifacts

**Creates Reusable:** no

---

### Completion Check

```bash
# Auto-Verify Commands - alle müssen mit 0 exiten
grep -q "draggable" agent-os-ui/ui/src/components/spec-card.ts && echo "✓ Spec-card is draggable"
grep -q "handleDrop" agent-os-ui/ui/src/components/queue/aos-queue-sidebar.ts && echo "✓ Drop handler exists"
grep -q "handleDragOver" agent-os-ui/ui/src/components/queue/aos-queue-sidebar.ts && echo "✓ DragOver handler exists"
cd agent-os-ui && npm run lint
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen
