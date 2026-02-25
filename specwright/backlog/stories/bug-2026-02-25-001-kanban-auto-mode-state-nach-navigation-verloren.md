# Bug: Kanban Auto-Mode State geht bei Navigation verloren

> Bug ID: 2026-02-25-001
> Created: 2026-02-25
> Severity: Medium
> Status: Ready

**Priority**: High
**Type**: Bug - Frontend/Integration
**Affected Component**: Dashboard View, Kanban Board

---

## Bug Description

### Symptom
Wenn man ein Spec Kanban Board im Auto-Mode startet und dann weg navigiert (z.B. zu Chat, Settings) und wieder zurück zum Dashboard navigiert, fehlt die Verbindung für die Visualisierung des aktuellen Status. Board-Updates sind nur noch durch manuellen Reload sichtbar.

### Reproduktion
1. Spec Kanban Board öffnen
2. Auto-Mode aktivieren (Execution startet)
3. Weg navigieren (z.B. zu Chat oder Settings)
4. Zurück zum Dashboard navigieren
5. Spec erneut auswählen und Kanban Board öffnen
6. Beobachten: Board zeigt keine Live-Updates mehr, Auto-Mode ist deaktiviert

### Expected vs. Actual
- **Expected:** Nach Rückkehr zum Kanban Board wird der Auto-Mode-Status wiederhergestellt, laufende Workflows werden erkannt und Live-Updates funktionieren weiter
- **Actual:** Auto-Mode ist deaktiviert, `selectedSpec` ist null, Workflow-Completion-Events werden verworfen (Zeile 866 in dashboard-view.ts), Board aktualisiert sich nur durch Reload

---

## User-Input (aus Step 2.5)

> Dokumentation des Benutzer-Wissens vor der RCA

**Hat User Vermutungen geteilt:** Nein

---

## Root-Cause-Analyse

### Hypothesen (vor Analyse)

| # | Hypothese | Wahrscheinlichkeit | Quelle | Prüfmethode |
|---|-----------|-------------------|--------|-------------|
| 1 | Frontend-State (autoMode, workflowStates) geht bei Navigation verloren, da nur als Instanz-State gespeichert | 50% | Agent | dashboard-view.ts lifecycle und state-Properties analysieren |
| 2 | WebSocket-Verbindung bricht bei Navigation ab und reconnected nicht | 30% | Agent | Gateway-Code und reconnect-Logik prüfen |
| 3 | Backend sendet Workflow-Events nur an ursprünglichen Client, nicht an alle Projekt-Connections | 20% | Agent | workflow-executor.ts sendToClient prüfen |

### Prüfung

**Hypothese 1 prüfen:** Frontend-State geht bei Navigation verloren
- Aktion: `dashboard-view.ts` lifecycle und `@state()` Properties analysiert
- Befund:
  - `disconnectedCallback()` (Zeile 345-349): Ruft `removeHandlers()` und `clearAutoExecutionTimer()` auf
  - `autoModeEnabled` (Zeile 130): `@state()` Property, reset auf `false` bei neuer Instanz
  - `onWorkflowComplete` (Zeile 866): Filtert Events wenn `!this.selectedSpec || this.selectedSpec.id !== specId`
  - `kanban-board.ts:144`: `workflowStates` Map geht bei Unmount komplett verloren
- Ergebnis: BESTÄTIGT
- Begründung: Alle auto-mode-relevanten States existieren nur als Component-Instance-State ohne jeglichen Persistenz-Layer

**Hypothese 2 prüfen:** WebSocket bricht bei Navigation ab
- Aktion: `gateway.ts` Singleton-Pattern und Reconnect-Logik geprüft
- Befund: Gateway ist ein Singleton (`export const gateway = new Gateway()`), bleibt während SPA-Navigation bestehen, wird nie geschlossen. Exponential backoff reconnect bei echtem Disconnect.
- Ergebnis: AUSGESCHLOSSEN
- Begründung: WebSocket-Verbindung bleibt intakt, nur die Component-Handler werden ab/angemeldet

**Hypothese 3 prüfen:** Backend sendet nur an Original-Client
- Aktion: `workflow-executor.ts:199` und `sendToClient` analysiert
- Befund: `workflow.interactive.complete` wird via `sendToClient(execution.client, ...)` gesendet. Da dieselbe physische WebSocket-Verbindung offen bleibt (kein Page Reload), kommen Events im Gateway an. Aber der NEUE Dashboard-Handler verwirft sie weil `selectedSpec === null`.
- Ergebnis: Verstärkender Faktor (nicht Primärursache)
- Begründung: Events kommen an, werden aber vom Frontend verworfen

### Root Cause

**Ursache:** Auto-Mode-State (`autoModeEnabled`, `completedWorkflowStoryId`, `selectedSpec`, `autoExecutionTimer`, `workflowStates`) ist ausschließlich als Lit Component Instance-State gespeichert. Bei SPA-Navigation wird `AosDashboardView` zerstört (hash routing ersetzt die gesamte Komponente) und neu erstellt - alle States gehen permanent verloren. Zusätzlich verwirft `onWorkflowComplete` (Zeile 866) eingehende Completion-Events weil `selectedSpec === null` ist.

**Beweis:**
- `dashboard-view.ts:345-349`: disconnectedCallback zerstört allen State
- `dashboard-view.ts:866-868`: Events werden gefiltert wenn selectedSpec null
- `kanban-board.ts:1008-1010`: workflowStates Map verloren
- `dashboard-view.ts:130`: autoModeEnabled = false bei neuer Instanz

**Betroffene Dateien:**
- `ui/frontend/src/views/dashboard-view.ts`: Auto-Mode-State nicht persistiert, Completion-Events verworfen
- `ui/frontend/src/components/kanban-board.ts`: workflowStates Map geht bei Unmount verloren

---

## Feature (Bug-Fix)

```gherkin
Feature: Kanban Auto-Mode State nach Navigation wiederherstellen
  Als Benutzer
  möchte ich dass der Auto-Mode-Status nach Navigation erhalten bleibt,
  damit ich das Kanban Board verlassen und zurückkehren kann ohne Live-Updates zu verlieren.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Korrektes Verhalten (was vorher fehlschlug)

```gherkin
Scenario: Auto-Mode bleibt nach Navigation aktiv
  Given ich habe Auto-Mode auf einem Spec Kanban Board aktiviert
  And ein Workflow läuft gerade
  When ich zu einer anderen Seite navigiere (z.B. Chat)
  And ich zurück zum Dashboard navigiere
  And ich den selben Spec und das Kanban Board öffne
  Then ist Auto-Mode als aktiv angezeigt
  And ich sehe den aktuellen Workflow-Status
  And Live-Updates funktionieren ohne manuellen Reload
```

### Szenario 2: Regression-Schutz

```gherkin
Scenario: Normales Auto-Mode Verhalten bleibt funktionsfähig
  Given ich bin auf dem Kanban Board eines Specs
  When ich Auto-Mode aktiviere
  Then startet die erste Story automatisch
  And nach Abschluss startet die nächste Story
  And der Fortschritt wird live angezeigt
```

### Edge-Case nach Fix

```gherkin
Scenario: Auto-Mode wird korrekt beendet wenn alle Stories done
  Given Auto-Mode ist aktiv und wird nach Navigation wiederhergestellt
  When die letzte Story abgeschlossen wird
  Then wird Auto-Mode automatisch deaktiviert
  And eine Erfolgsmeldung wird angezeigt
```

---

## Technische Verifikation

- [ ] BUG_FIXED: Auto-Mode State bleibt nach Navigation erhalten
- [ ] BUG_FIXED: Workflow-Completion-Events werden nach Navigation korrekt verarbeitet
- [ ] BUG_FIXED: Kanban Board zeigt laufende Workflows nach Rückkehr an
- [ ] TEST_PASS: Regression test added and passing
- [ ] LINT_PASS: No linting errors
- [ ] MANUAL: Bug no longer reproducible with original steps

---

## Technisches Refinement

### DoR (Definition of Ready)

#### Bug-Analyse
- [x] Bug reproduzierbar
- [x] Root Cause identifiziert
- [x] Betroffene Dateien bekannt

#### Technische Vorbereitung
- [x] Fix-Ansatz definiert (WAS/WIE/WO)
- [x] Abhängigkeiten identifiziert
- [x] Risiken bewertet

**Bug ist READY wenn alle Checkboxen angehakt sind.**

---

### DoD (Definition of Done)

- [ ] Bug behoben gemäß Root Cause
- [ ] Auto-Mode State überlebt Navigation
- [ ] Workflow-Events werden nach Navigation korrekt verarbeitet
- [ ] Keine neuen Bugs eingeführt
- [ ] Code Review durchgeführt
- [ ] Original Reproduktionsschritte führen nicht mehr zum Bug
- [ ] Linting passt (`cd ui/frontend && npm run build`)

**Bug ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten (Fix-Impact)

**Fix Type:** Frontend-primary

**Betroffene Komponenten:**

| Layer | Komponenten | Impact | Änderung |
|-------|-------------|--------|----------|
| Frontend | dashboard-view.ts | Direct | Auto-Mode-State persistieren (z.B. localStorage), bei connectedCallback wiederherstellen |
| Frontend | kanban-board.ts | Direct | workflowStates nach Navigation wiederherstellen, laufende Workflows erkennen |
| Integration | Gateway event handling | Indirect | Event-Verarbeitung auch wenn selectedSpec noch null |

**Kritische Integration Points:**
- Gateway completion events → Dashboard auto-mode state (muss nach Navigation funktionieren)

---

### Technical Details

**WAS:**
1. Auto-Mode-State (`autoModeEnabled`, aktiver specId) über Navigation hinweg persistieren
2. Bei Rückkehr zum Kanban Board: Auto-Mode-State wiederherstellen und laufende Workflows erkennen
3. `onWorkflowComplete` so anpassen, dass Events nicht verworfen werden wenn spec gerade geladen wird

**WIE (Architektur-Guidance ONLY):**
- State-Persistenz via localStorage (Pattern existiert bereits: `STORAGE_KEY` für specsViewMode in dashboard-view.ts, Zeile 57)
- Bei `connectedCallback`: Persistierten Auto-Mode-State lesen und `selectedSpec` + `autoModeEnabled` wiederherstellen
- `onWorkflowComplete`: Events zwischenspeichern wenn `selectedSpec` noch null, nach Spec-Laden verarbeiten (oder selectedSpec aus Event-specId automatisch setzen)
- Bestehende Patterns aus `gateway.ts` reconnect nutzen (Projekt-Context wird bereits bei Reconnect wiederhergestellt)

**WO:**
- `ui/frontend/src/views/dashboard-view.ts`: State-Persistenz, Event-Handling-Fix
- `ui/frontend/src/components/kanban-board.ts`: workflowStates-Wiederherstellung

**Abhängigkeiten:** Keine

**Geschätzte Komplexität:** S

---

### Completion Check

```bash
# Verify bug is fixed
cd ui/frontend && npm run build
cd ui && npm run lint
cd ui && npm test
```

**Bug ist DONE wenn:**
1. Original Reproduktionsschritte funktionieren korrekt (Auto-Mode bleibt nach Navigation aktiv)
2. Kein manueller Reload nötig für Board-Updates
3. Keine verwandten Fehler auftreten
