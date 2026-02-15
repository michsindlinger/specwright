# Git-Strategie bei Queue-Add

> Story ID: SKQ-003
> Spec: 2026-02-03-spec-kanban-queue
> Created: 2026-02-03
> Last Updated: 2026-02-03

**Priority**: High
**Type**: Frontend
**Estimated Effort**: XS
**Dependencies**: SKQ-002

---

## Feature

```gherkin
Feature: Git-Strategie bei Queue-Hinzufügung
  Als Entwickler
  möchte ich beim Hinzufügen eines Specs zur Queue die Git-Strategie wählen,
  damit ich nicht erst beim Start der ersten Story gefragt werde.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Git-Strategie-Dialog öffnet sich beim Queue-Add

```gherkin
Scenario: Dialog zur Git-Strategie beim Hinzufügen
  Given ich ziehe einen Spec in die Queue
  When ich den Spec auf die Queue fallen lasse
  Then öffnet sich der Git-Strategie-Dialog
  And ich kann zwischen "Branch" und "Worktree" wählen
```

### Szenario 2: Gewählte Strategie wird gespeichert

```gherkin
Scenario: Strategie wird beim Queue-Item gespeichert
  Given ich habe einen Spec in die Queue gezogen
  And der Git-Strategie-Dialog ist offen
  When ich "Worktree" auswähle und bestätige
  Then wird der Spec zur Queue hinzugefügt
  And das Queue-Item zeigt die Strategie "Worktree" an
```

### Szenario 3: Abbruch verhindert Queue-Hinzufügung

```gherkin
Scenario: Dialog-Abbruch fügt Spec nicht hinzu
  Given ich habe einen Spec in die Queue gezogen
  And der Git-Strategie-Dialog ist offen
  When ich auf "Abbrechen" klicke
  Then wird der Spec nicht zur Queue hinzugefügt
  And der Dialog schließt sich
```

---

## Technische Verifikation (Automated Checks)

### Inhalt-Prüfungen

- [x] CONTAINS: git-strategy-dialog.ts enthält "context"
- [x] CONTAINS: aos-queue-sidebar.ts enthält "showGitStrategyDialog"
- [x] CONTAINS: aos-queue-item.ts enthält "gitStrategy"

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
- [x] Code Review durchgeführt und genehmigt

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
| Frontend | `git-strategy-dialog.ts` | context-Parameter hinzufügen |
| Frontend | `aos-queue-sidebar.ts` | Dialog-Integration |
| Frontend | `aos-queue-item.ts` | gitStrategy-Property anzeigen |

**Kritische Integration Points:**
- `git-strategy-dialog.ts` → `aos-queue-sidebar.ts`: Strategy Selection Event

---

### Technical Details

**WAS:**
- Git-Strategy-Dialog um Context-Parameter erweitern (queue vs story-start)
- Queue-Sidebar öffnet Dialog beim Drop
- Queue-Item speichert und zeigt Git-Strategie

**WIE (Architektur-Guidance ONLY):**
- Erweitere `git-strategy-dialog.ts` um optionale `context` Property
- Nutze bestehendes `git-strategy-select` Event
- Speichere Strategie im Queue-Item Datenmodell
- Zeige Strategie dezent im Queue-Item (z.B. kleines Icon oder Label)

**WO:**
- `agent-os-ui/ui/src/components/git-strategy-dialog.ts` (erweitern)
- `agent-os-ui/ui/src/components/queue/aos-queue-sidebar.ts` (erweitern)
- `agent-os-ui/ui/src/components/queue/aos-queue-item.ts` (erweitern)

**Abhängigkeiten:** SKQ-002

**Geschätzte Komplexität:** XS

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
grep -q "context" agent-os-ui/ui/src/components/git-strategy-dialog.ts && echo "✓ Context parameter added"
grep -q "showGitStrategyDialog" agent-os-ui/ui/src/components/queue/aos-queue-sidebar.ts && echo "✓ Dialog integration"
grep -q "gitStrategy" agent-os-ui/ui/src/components/queue/aos-queue-item.ts && echo "✓ Strategy in item"
cd agent-os-ui && npm run lint
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen
