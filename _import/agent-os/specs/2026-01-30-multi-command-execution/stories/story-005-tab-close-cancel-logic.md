# Tab Close & Cancel Logic

> Story ID: MCE-005
> Spec: Multi-Command Execution
> Created: 2026-01-30
> Last Updated: 2026-01-30

**Priority**: Medium
**Type**: Frontend
**Estimated Effort**: XS
**Dependencies**: MCE-001, MCE-002

---

## Feature

```gherkin
Feature: Tab Close & Cancel Logic
  Als Entwickler
  möchte ich Tabs schließen und laufende Executions abbrechen können,
  damit ich nicht benötigte Prozesse beenden und Ressourcen freigeben kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Abgeschlossene Execution schließen

```gherkin
Scenario: Tab mit abgeschlossener Execution schließen
  Given eine Execution hat den Status "completed"
  When ich auf das "X" im Tab klicke
  Then wird der Tab geschlossen
  And die Execution wird aus dem Store entfernt
  And kein Bestätigungs-Dialog erscheint
```

### Szenario 2: Laufende Execution abbrechen mit Bestätigung

```gherkin
Scenario: Tab mit laufender Execution schließen
  Given eine Execution hat den Status "running"
  When ich auf das "X" im Tab klicke
  Then erscheint ein Bestätigungs-Dialog
  And der Dialog fragt "Laufende Execution abbrechen?"
```

### Szenario 3: Abbruch bestätigen

```gherkin
Scenario: Execution abbrechen bestätigen
  Given der Bestätigungs-Dialog ist geöffnet
  When ich auf "Abbrechen bestätigen" klicke
  Then wird die Execution beendet (Prozess wird gekillt)
  And der Tab wird geschlossen
  And die Execution wird aus dem Store entfernt
```

### Szenario 4: Abbruch verwerfen

```gherkin
Scenario: Abbruch verwerfen
  Given der Bestätigungs-Dialog ist geöffnet
  When ich auf "Weiter ausführen" klicke
  Then bleibt die Execution aktiv
  And der Dialog schließt sich
  And der Tab bleibt geöffnet
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Letzten Tab schließen
  Given nur eine Execution ist offen
  When ich den Tab schließe
  Then wird die Workflow-View geleert
  And die Tab-Leiste zeigt nur den Plus-Button
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [ ] FILE_EXISTS: agent-os-ui/ui/src/components/execution-tab.ts

### Inhalt-Prüfungen

- [ ] CONTAINS: agent-os-ui/ui/src/components/execution-tab.ts enthält "close-button\|closeTab"
- [ ] CONTAINS: agent-os-ui/ui/src/components/execution-tabs.ts enthält "confirm\|dialog\|modal"

### Funktions-Prüfungen

- [ ] LINT_PASS: cd agent-os-ui && npm run lint exits with code 0

---

## Required MCP Tools

| Tool | Purpose | Blocking |
|------|---------|----------|
| None | - | - |

---

## Technisches Refinement (vom Architect)

> **HINWEIS:** Technisches Refinement abgeschlossen am 2026-01-30

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
- [x] Kritische Integration Points dokumentiert (wenn Full-stack)
- [x] Handover-Dokumente definiert (bei Multi-Layer)

**Story ist READY wenn alle Checkboxen angehakt sind.** ✓ READY

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [x] Code implementiert und folgt Style Guide
- [x] Architektur-Vorgaben eingehalten (WIE section)
- [x] Security/Performance Anforderungen erfüllt

#### Qualitätssicherung
- [x] Alle Akzeptanzkriterien erfüllt (via Completion Check verifiziert)
- [x] Bestätigungs-Dialog bei laufender Execution getestet
- [x] Cancel-Message an Backend korrekt gesendet

#### Dokumentation
- [x] Code ist selbstdokumentierend (klare Benennung)
- [x] Keine Linting Errors
- [x] Completion Check Commands alle erfolgreich (exit 0)

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Full-stack (Frontend + Backend cancel)

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | components/execution-tab.ts | Close-Button hinzufügen |
| Frontend | components/execution-tabs.ts | Dialog-Logic und Cancel-Handling |
| Frontend | stores/execution-store.ts | removeExecution() Methode |
| Backend | websocket.ts | Bereits vorhanden: workflow.interactive.cancel |

**Kritische Integration Points:**
- Frontend `tab-close` Event → execution-tabs prüft Status → Dialog wenn running → gateway.send('workflow.interactive.cancel')

---

### Technical Details

**WAS:**
- Close-Button (X) in execution-tab.ts Komponente
- Bestätigungs-Dialog in execution-tabs.ts (inline Modal)
- removeExecution() Methode in execution-store.ts

**WIE (Architektur-Guidance ONLY):**
- Close-Button dispatcht `tab-close` custom event mit executionId
- execution-tabs.ts: Prüft status - wenn 'running'/'waiting' → zeige Dialog
- Dialog Pattern wie in workflow-chat.ts (cancel-confirm-overlay)
- Bei Bestätigung: gateway.send({ type: 'workflow.interactive.cancel', executionId })
- Nach cancel.ack: executionStore.removeExecution(executionId)
- ARIA role="alertdialog" für Bestätigungs-Dialog

**WO:**
- agent-os-ui/ui/src/components/execution-tab.ts (Close-Button hinzufügen)
- agent-os-ui/ui/src/components/execution-tabs.ts (Dialog + Cancel-Logic)
- agent-os-ui/ui/src/stores/execution-store.ts (removeExecution)

**WER:** dev-team__frontend-developer

**Abhängigkeiten:** MCE-001 (Tab), MCE-002 (Store)

**Geschätzte Komplexität:** XS (3 Dateien, ~100 LOC)

---

### Completion Check

```bash
# Auto-Verify Commands - alle müssen mit 0 exiten
grep -q "close" agent-os-ui/ui/src/components/execution-tab.ts && echo "PASS: close button" || exit 1
grep -q "tab-close" agent-os-ui/ui/src/components/execution-tab.ts && echo "PASS: tab-close event" || exit 1
grep -q "removeExecution" agent-os-ui/ui/src/stores/execution-store.ts && echo "PASS: removeExecution method" || exit 1
cd agent-os-ui && npm run lint
cd agent-os-ui && npm run build
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen
