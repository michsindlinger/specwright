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
- **Actual:** Auto-Mode ist deaktiviert, selectedSpec ist null, Workflow-Completion-Events werden verworfen (Zeile 866 in dashboard-view.ts), Board aktualisiert sich nur durch Reload

---

## Root-Cause-Analyse

### Hypothesen (vor Analyse)

| # | Hypothese | Wahrscheinlichkeit | Quelle | Prüfmethode |
|---|-----------|-------------------|--------|-------------|
| 1 | Frontend-State geht bei Navigation verloren | 50% | Agent | dashboard-view.ts lifecycle analysieren |
| 2 | WebSocket-Verbindung bricht ab | 30% | Agent | Gateway-Code prüfen |
| 3 | Backend sendet nur an Original-Client | 20% | Agent | workflow-executor.ts prüfen |

### Root Cause

**Ursache:** Auto-Mode-State ist ausschließlich als Lit Component Instance-State gespeichert. Bei SPA-Navigation wird AosDashboardView zerstört und neu erstellt - alle States gehen permanent verloren.

**Betroffene Dateien:**
- ui/frontend/src/views/dashboard-view.ts
- ui/frontend/src/components/kanban-board.ts

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

### Szenario 1: Korrektes Verhalten

```gherkin
Scenario: Auto-Mode bleibt nach Navigation aktiv
  Given ich habe Auto-Mode auf einem Spec Kanban Board aktiviert
  And ein Workflow läuft gerade
  When ich zu einer anderen Seite navigiere
  And ich zurück zum Dashboard navigiere
  And ich den selben Spec und das Kanban Board öffne
  Then ist Auto-Mode als aktiv angezeigt
  And Live-Updates funktionieren ohne manuellen Reload
```

---

## Technisches Refinement

### Technical Details

**WAS:**
1. Auto-Mode-State über Navigation hinweg persistieren
2. Bei Rückkehr: State wiederherstellen und laufende Workflows erkennen
3. onWorkflowComplete anpassen: Events nicht verwerfen wenn spec gerade geladen wird

**WIE:**
- State-Persistenz via localStorage (Pattern existiert bereits in dashboard-view.ts)
- Bei connectedCallback: Persistierten State lesen und wiederherstellen
- Events zwischenspeichern wenn selectedSpec noch null

**WO:**
- ui/frontend/src/views/dashboard-view.ts
- ui/frontend/src/components/kanban-board.ts

**Geschätzte Komplexität:** S