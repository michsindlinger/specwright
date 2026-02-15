# Background Notifications

> Story ID: MCE-006
> Spec: Multi-Command Execution
> Created: 2026-01-30
> Last Updated: 2026-01-30

**Priority**: Medium
**Type**: Frontend
**Estimated Effort**: XS
**Dependencies**: MCE-002, MCE-003
**Status**: Done

---

## Feature

```gherkin
Feature: Background Notifications
  Als Entwickler
  möchte ich benachrichtigt werden wenn in Hintergrund-Tabs etwas passiert,
  damit ich wichtige Ereignisse nicht verpasse während ich an einem anderen Tab arbeite.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Frage in Hintergrund-Tab

```gherkin
Scenario: Notification bei wartender Frage
  Given ich arbeite an Tab A
  And Tab B läuft im Hintergrund
  When Tab B eine Frage stellt
  Then zeigt Tab B ein Badge mit Aufmerksamkeits-Farbe
  And das Badge zeigt die Anzahl der Fragen
```

### Szenario 2: Execution abgeschlossen im Hintergrund

```gherkin
Scenario: Notification bei abgeschlossener Execution
  Given ich arbeite an Tab A
  And Tab B läuft im Hintergrund
  When Tab B erfolgreich abschließt
  Then wechselt Tab B's Status-Indikator zu "completed"
  And ein kurzer visueller Hinweis erscheint
```

### Szenario 3: Fehler in Hintergrund-Tab

```gherkin
Scenario: Notification bei Fehler
  Given ich arbeite an Tab A
  And Tab B läuft im Hintergrund
  When Tab B mit einem Fehler abbricht
  Then zeigt Tab B ein Error-Icon
  And der Tab blinkt kurz oder pulsiert
```

### Szenario 4: Notification verschwindet bei Tab-Wechsel

```gherkin
Scenario: Notification wird quittiert
  Given Tab B hat eine wartende Frage (Badge sichtbar)
  When ich auf Tab B klicke und die Fragen sehe
  Then verschwindet das Notification-Badge
  And der Status zeigt weiterhin "waiting" an
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Mehrere Fragen sammeln sich an
  Given Tab B hat bereits 2 wartende Fragen
  When eine dritte Frage hinzukommt
  Then zeigt das Badge "3" an
  And die Zahl aktualisiert sich automatisch
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [ ] FILE_EXISTS: agent-os-ui/ui/src/components/execution-tab.ts

### Inhalt-Prüfungen

- [ ] CONTAINS: agent-os-ui/ui/src/components/execution-tab.ts enthält "notification\|badge\|attention"
- [ ] CONTAINS: agent-os-ui/ui/src/stores/execution-store.ts enthält "pendingQuestions\|questionCount"

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
- [x] Badge erscheint bei Hintergrund-Fragen
- [x] Badge verschwindet bei Tab-Aktivierung

#### Dokumentation
- [x] Code ist selbstdokumentierend (klare Benennung)
- [x] Keine Linting Errors
- [x] Completion Check Commands alle erfolgreich (exit 0)

**Story ist DONE wenn alle Checkboxen angehakt sind.** ✓ DONE

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | components/execution-tab.ts | Badge property und Rendering |
| Frontend | stores/execution-store.ts | pendingQuestionCount und hasUnseenChanges |
| Frontend | types/execution.ts | ExecutionState Interface erweitern |

**Kritische Integration Points:**
- N/A (Frontend-only, nutzt bestehende WebSocket Events)

---

### Technical Details

**WAS:**
- Badge-Rendering in execution-tab.ts bei pendingQuestionCount > 0
- pendingQuestionCount und hasUnseenChanges Properties im ExecutionState
- CSS Pulse-Animation für Attention

**WIE (Architektur-Guidance ONLY):**
- Badge als span mit absoluter Positionierung (top-right des Tab)
- pendingQuestionCount: Wird bei questionBatch Event erhöht, bei Antwort verringert
- hasUnseenChanges: true wenn Änderung in Hintergrund-Tab, false bei Tab-Aktivierung
- CSS @keyframes `pulse` für Aufmerksamkeits-Animation
- Badge nur anzeigen wenn Tab nicht aktiv UND (pendingQuestionCount > 0 ODER hasUnseenChanges)

**WO:**
- agent-os-ui/ui/src/components/execution-tab.ts (Badge Rendering)
- agent-os-ui/ui/src/stores/execution-store.ts (pendingQuestionCount, hasUnseenChanges)
- agent-os-ui/ui/src/types/execution.ts (Interface erweitern)

**WER:** dev-team__frontend-developer

**Abhängigkeiten:** MCE-002 (Store), MCE-003 (Status Indicators)

**Geschätzte Komplexität:** XS (3 Dateien, ~80 LOC)

---

### Completion Check

```bash
# Auto-Verify Commands - alle müssen mit 0 exiten
grep -qE "badge|notification|pendingQuestion|unseen" agent-os-ui/ui/src/components/execution-tab.ts && echo "PASS: badge in tab" || exit 1
grep -qE "pendingQuestion|hasUnseen" agent-os-ui/ui/src/stores/execution-store.ts && echo "PASS: tracking in store" || exit 1
cd agent-os-ui && npm run lint
cd agent-os-ui && npm run build
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen
