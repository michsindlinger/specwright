# Git Strategy Integration

> Story ID: KAE-005
> Spec: kanban-auto-execution
> Created: 2026-01-31
> Last Updated: 2026-01-31

**Priority**: High
**Type**: Frontend
**Estimated Effort**: S
**Dependencies**: KAE-001, KAE-002
**Status**: Done

---

## Feature

```gherkin
Feature: Git Strategy Integration für Auto-Mode
  Als Entwickler
  möchte ich dass der Auto-Mode bei der ersten Story nach der Git Strategy fragt,
  damit ich die gewählte Strategie für alle Stories der Spec nutzen kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Git Strategy Dialog bei erster Story

```gherkin
Scenario: Git Strategy Dialog erscheint bei erster Story im Auto-Mode
  Given der Auto-Mode wird aktiviert
  And keine Story wurde in dieser Spec bisher ausgeführt
  When die erste Story gestartet werden soll
  Then erscheint der Git Strategy Dialog (bestehende Komponente)
  And der Auto-Mode pausiert während der Dialog offen ist
```

### Szenario 2: Auto-Mode wartet auf Auswahl

```gherkin
Scenario: Auto-Mode wartet auf Git Strategy Auswahl
  Given der Git Strategy Dialog ist geöffnet
  And der Auto-Mode ist aktiviert
  When ich noch keine Strategie gewählt habe
  Then bleibt der Auto-Mode pausiert
  And keine Story wird gestartet
  And der Progress Summary zeigt "Warte auf Git-Strategie Auswahl..."
```

### Szenario 3: Strategie gewählt - Auto-Mode fährt fort

```gherkin
Scenario: Auto-Mode fährt nach Strategie-Auswahl fort
  Given der Git Strategy Dialog ist geöffnet
  And der Auto-Mode ist aktiviert
  When ich "Branch" als Strategie wähle
  Then schließt sich der Dialog
  And die gewählte Strategie wird gespeichert
  And die erste Story wird automatisch gestartet
  And der Auto-Mode läuft weiter
```

### Szenario 4: Keine erneute Abfrage bei Folge-Stories

```gherkin
Scenario: Keine Git Strategy Abfrage bei Folge-Stories
  Given die Git Strategie wurde bereits gewählt ("Branch")
  And der Auto-Mode ist aktiviert
  When die zweite Story gestartet wird
  Then erscheint KEIN Git Strategy Dialog
  And die Story wird mit der gespeicherten Strategie gestartet
```

### Szenario 5: Dialog abbrechen deaktiviert Auto-Mode

```gherkin
Scenario: Auto-Mode wird bei Dialog-Abbruch deaktiviert
  Given der Git Strategy Dialog ist geöffnet
  And der Auto-Mode ist aktiviert
  When ich den Dialog abbreche (X oder Escape)
  Then wird der Auto-Mode deaktiviert
  And keine Story wird gestartet
  And der Toggle zeigt "aus"
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Bereits laufende Execution in anderer Session
  Given eine Story dieser Spec läuft bereits (aus Terminal-Script)
  And ich aktiviere den Auto-Mode im UI
  When das System prüft ob Git Strategy benötigt wird
  Then erkennt es die bestehende Execution
  And nutzt die bereits gesetzte Git Strategy
  And kein Dialog erscheint
```

```gherkin
Scenario: Browser Refresh während Dialog offen
  Given der Git Strategy Dialog ist geöffnet
  When ich die Seite neu lade
  Then ist der Auto-Mode deaktiviert
  And der Dialog ist geschlossen
  And ich muss den Auto-Mode erneut aktivieren
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [ ] FILE_EXISTS: agent-os-ui/ui/src/components/kanban-board.ts enthält Git Strategy Integration
- [ ] FILE_EXISTS: agent-os-ui/ui/src/components/git-strategy-dialog.ts (besteht bereits)

### Inhalt-Prüfungen

- [ ] CONTAINS: kanban-board.ts enthält "checkGitStrategyRequired" oder ähnlich
- [ ] CONTAINS: kanban-board.ts enthält "currentGitStrategy" Property/State
- [ ] CONTAINS: kanban-board.ts enthält Integration mit "aos-git-strategy-dialog" für Auto-Mode

### Funktions-Prüfungen

- [ ] LINT_PASS: npm run lint exits with code 0
- [ ] BUILD_PASS: npm run build exits with code 0

---

## Required MCP Tools

| Tool | Purpose | Blocking |
|------|---------|----------|
| None | - | - |

---

## Technisches Refinement (vom Architect)

> **Ausgefüllt:** 2026-01-31

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

**Integration Type:** Frontend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | kanban-board.ts | Auto-Mode Git Strategy Integration |
| Frontend | dashboard-view.ts | Git Strategy State Management |

**Kritische Integration Points:**
- Bestehende `git-strategy-dialog.ts` wird wiederverwendet
- Bestehende `currentGitStrategy` State in kanban-board.ts nutzen
- Auto-Mode muss mit `isFirstStoryExecution()` Logik integrieren

---

### Technical Details

**WAS:**
- Neue Methode `handleAutoModeStart()`: Prüft ob Git Strategy Dialog nötig
- Anpassung von `processAutoExecution()`: Wartet auf Git Strategy wenn nötig
- @state() `autoModePendingGitStrategy: boolean = false`
- Integration: Bei Toggle-Aktivierung prüfen ob `isFirstStoryExecution()`

**WIE (Architektur-Guidance ONLY):**

**Ablauf bei Auto-Mode Aktivierung:**
1. Toggle wird aktiviert → `handleAutoModeToggle()`
2. Prüfen: `isFirstStoryExecution()` (bereits vorhanden)
3. Wenn true UND `!currentGitStrategy`: Dialog öffnen, `autoModePendingGitStrategy = true`
4. Wenn false ODER Strategie gesetzt: Direkt `processAutoExecution()` aufrufen

**Dialog-Event Handling:**
- `git-strategy-select` Event: `autoModePendingGitStrategy = false`, dann `processAutoExecution()`
- `git-strategy-cancel` Event: Auto-Mode deaktivieren

**Bestehenden Code nutzen:**
- `showGitStrategyDialog` State ist bereits vorhanden
- `currentGitStrategy` State ist bereits vorhanden
- `handleGitStrategySelect()` und `handleGitStrategyCancel()` erweitern

**WO:**
- `agent-os-ui/ui/src/components/kanban-board.ts` (Anpassen)
- `agent-os-ui/ui/src/views/dashboard-view.ts` (Optional - State Management)

**WER:** dev-team__frontend-developer

**Abhängigkeiten:** KAE-001 (Toggle), KAE-002 (Engine)

**Geschätzte Komplexität:** S (ca. 50-80 LOC, viel Wiederverwendung)

**Relevante Skills:**
- `frontend-lit` - State Management, Event Handling
- `quality-gates` - Integration Testing

---

### Completion Check

```bash
# Auto-Verify Commands - alle müssen mit 0 exiten
grep -q "autoModePendingGitStrategy\|handleAutoModeStart" agent-os-ui/ui/src/components/kanban-board.ts
grep -q "isFirstStoryExecution" agent-os-ui/ui/src/components/kanban-board.ts
grep -q "currentGitStrategy" agent-os-ui/ui/src/components/kanban-board.ts
cd agent-os-ui && npm run lint
cd agent-os-ui && npm run build
```

**Story ist DONE wenn:**
1. Alle CONTAINS checks bestanden
2. Git Strategy Dialog erscheint bei erster Story im Auto-Mode
3. Nach Auswahl startet Auto-Mode automatisch
4. Bei Dialog-Abbruch wird Auto-Mode deaktiviert
5. Keine erneute Abfrage bei Folge-Stories
