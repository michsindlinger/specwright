# Queue-Execution & Auto-Skip

> Story ID: SKQ-005
> Spec: 2026-02-03-spec-kanban-queue
> Created: 2026-02-03
> Last Updated: 2026-02-03

**Status**: Done
**Priority**: Critical
**Type**: Full-stack
**Estimated Effort**: M
**Dependencies**: SKQ-004

---

## Feature

```gherkin
Feature: Queue-Ausführung
  Als Entwickler
  möchte ich die Queue starten und automatisch alle Specs abarbeiten lassen,
  damit mehrere Features nacheinander ohne manuelles Eingreifen implementiert werden.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Queue starten

```gherkin
Scenario: Queue-Ausführung starten
  Given die Queue enthält 3 Specs
  When ich auf "Queue starten" klicke
  Then wird der erste Spec gestartet
  And dessen Status wechselt auf "running"
  And die anderen Specs bleiben "pending"
```

### Szenario 2: Automatischer Wechsel zum nächsten Spec

```gherkin
Scenario: Nach Spec-Abschluss folgt der nächste
  Given die Queue läuft
  And der aktuelle Spec "Feature-A" wird gerade ausgeführt
  When alle Stories von "Feature-A" abgeschlossen sind
  Then wechselt der Status von "Feature-A" auf "done"
  And der nächste Spec "Feature-B" startet automatisch
```

### Szenario 3: Fehlerhafte Specs werden übersprungen

```gherkin
Scenario: Auto-Skip bei Spec-Fehler
  Given die Queue läuft
  And der aktuelle Spec schlägt fehl
  When der Fehler erkannt wird
  Then wechselt der Status auf "failed"
  And der nächste Spec in der Queue startet automatisch
```

### Szenario 4: Queue stoppt nach letztem Spec

```gherkin
Scenario: Queue endet nach Abarbeitung aller Specs
  Given die Queue enthält nur noch einen Spec
  And dieser Spec wird gerade ausgeführt
  When alle Stories des Specs abgeschlossen sind
  Then wird eine Erfolgs-Nachricht angezeigt: "Queue abgeschlossen"
  And die Queue zeigt alle Specs mit ihrem Endstatus
```

### Szenario 5: Queue im Hintergrund bei View-Wechsel

```gherkin
Scenario: Queue läuft im Hintergrund weiter
  Given die Queue läuft mit 3 Specs
  When ich zum Chat-View wechsle
  Then läuft die Queue im Hintergrund weiter
  And wenn ich zum Dashboard zurückkehre, sehe ich den aktuellen Fortschritt
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Leere Queue kann nicht gestartet werden
  Given die Queue ist leer
  When ich versuche die Queue zu starten
  Then erscheint eine Toast-Nachricht: "Queue ist leer - füge Specs hinzu"
  And der Start-Button bleibt inaktiv
```

---

## Technische Verifikation (Automated Checks)

### Inhalt-Prüfungen

- [x] CONTAINS: queue.service.ts enthält "startQueue"
- [x] CONTAINS: queue.service.ts enthält "startNextSpec"
- [x] CONTAINS: queue.service.ts enthält "handleSpecComplete"
- [x] CONTAINS: queue.handler.ts enthält "queue.start"
- [x] CONTAINS: queue.handler.ts enthält "queue.stop"
- [x] CONTAINS: aos-queue-sidebar.ts enthält "handleQueueStart"
- [x] CONTAINS: aos-queue-sidebar.ts enthält "handleQueueStop"

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
- [ ] Code Review durchgeführt und genehmigt

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
| Backend | `queue.service.ts` | Execution-Logic hinzufügen |
| Backend | `queue.handler.ts` | Start/Stop-Handler |
| Backend | `websocket.ts` | Completion-Events abfangen |
| Frontend | `aos-queue-sidebar.ts` | Start/Stop-Buttons |
| Frontend | `dashboard-view.ts` | Queue-Events verarbeiten |

**Kritische Integration Points:**
- `queue.service.ts` → Existing Auto-Mode: Execution Trigger
- `websocket.ts` → `queue.service.ts`: Completion Callback

---

### Technical Details

**WAS:**
- Queue-Start-Button und Stop-Button in Sidebar
- Backend-Logik für sequentielle Spec-Ausführung
- Integration mit bestehendem Auto-Mode pro Spec
- Auto-Skip bei Fehler
- Hintergrund-Ausführung

**WIE (Architektur-Guidance ONLY):**
- Nutze bestehenden Auto-Mode für die Ausführung jedes einzelnen Specs
- Queue-Service orchestriert nur die Reihenfolge der Specs
- Höre auf `workflow.interactive.complete` Events um Spec-Abschluss zu erkennen
- Bei Fehler: Markiere Spec als "failed", starte nächsten
- Speichere Queue-Running-State um Hintergrund-Ausführung zu ermöglichen

**WO:**
- `agent-os-ui/src/server/services/queue.service.ts` (erweitern)
- `agent-os-ui/src/server/handlers/queue.handler.ts` (erweitern)
- `agent-os-ui/src/server/websocket.ts` (Event-Listener)
- `agent-os-ui/ui/src/components/queue/aos-queue-sidebar.ts` (erweitern)
- `agent-os-ui/ui/src/views/dashboard-view.ts` (erweitern)

**Abhängigkeiten:** SKQ-004

**Geschätzte Komplexität:** M

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
grep -q "startQueue" agent-os-ui/src/server/services/queue.service.ts && echo "✓ startQueue method"
grep -q "startNextSpec" agent-os-ui/src/server/services/queue.service.ts && echo "✓ startNextSpec method"
grep -q "queue.start" agent-os-ui/src/server/handlers/queue.handler.ts && echo "✓ Start handler"
grep -q "handleQueueStart" agent-os-ui/ui/src/components/queue/aos-queue-sidebar.ts && echo "✓ Start button handler"
cd agent-os-ui && npm run lint
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen
