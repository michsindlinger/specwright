# Tab-Close Confirmation

> Story ID: WTT-005
> Spec: Workflow Terminal Tabs
> Created: 2026-02-16
> Last Updated: 2026-02-16

**Priority**: Medium
**Type**: Frontend
**Estimated Effort**: XS
**Dependencies**: WTT-002

---

## Feature

```gherkin
Feature: Bestaetigungs-Dialog beim Schliessen laufender Workflow-Tabs
  Als Entwickler
  moechte ich eine Warnung sehen wenn ich einen Tab mit laufendem Workflow schliesse,
  damit ich nicht versehentlich einen Workflow abbreche.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Bestaetigungs-Dialog bei laufendem Workflow

```gherkin
Scenario: Schliessen eines laufenden Workflow-Tabs zeigt Warnung
  Given ein Workflow laeuft in einem Terminal-Tab
  When ich den Close-Button des Tabs klicke
  Then erscheint ein Bestaetigungs-Dialog
  And der Dialog fragt "Workflow laeuft noch - wirklich abbrechen?"
```

### Szenario 2: Abbruch bestaetigt

```gherkin
Scenario: User bestaetigt Abbruch
  Given der Bestaetigungs-Dialog ist offen
  When ich auf "Ja, abbrechen" klicke
  Then wird der Claude-Prozess beendet
  And der Tab wird geschlossen
```

### Szenario 3: Abbruch abgelehnt

```gherkin
Scenario: User lehnt Abbruch ab
  Given der Bestaetigungs-Dialog ist offen
  When ich auf "Nein, weiterlaufen lassen" klicke
  Then bleibt der Tab offen
  And der Workflow laeuft weiter
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Schliessen eines bereits beendeten Workflow-Tabs
  Given ein Workflow in einem Terminal-Tab ist bereits abgeschlossen
  When ich den Close-Button klicke
  Then wird der Tab sofort geschlossen
  And kein Bestaetigungs-Dialog erscheint
```

---

## Technische Verifikation (Automated Checks)

### Datei-Pruefungen

- [ ] CONTAINS: ui/frontend/src/components/terminal/aos-cloud-terminal-sidebar.ts enthaelt "confirm"

### Funktions-Pruefungen

- [ ] BUILD_PASS: cd ui/frontend && npm run build

---

## Required MCP Tools

Keine MCP Tools erforderlich.

---

## Technisches Refinement (vom Architect)

### DoR (Definition of Ready) - Vom Architect

#### Fachliche Anforderungen
- [x] Fachliche requirements klar definiert
- [x] Akzeptanzkriterien sind spezifisch und pruefbar
- [x] Business Value verstanden

#### Technische Vorbereitung
- [x] Technischer Ansatz definiert (WAS/WIE/WO)
- [x] Abhaengigkeiten identifiziert
- [x] Betroffene Komponenten bekannt
- [x] Erforderliche MCP Tools dokumentiert (falls zutreffend)
- [x] Story ist angemessen geschaetzt (max 5 Dateien, 400 LOC)

#### Full-Stack Konsistenz
- [x] Alle betroffenen Layer identifiziert
- [x] Integration Type bestimmt
- [x] Kritische Integration Points dokumentiert (wenn Full-stack)
- [x] Handover-Dokumente definiert (bei Multi-Layer)

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [ ] Code implementiert und folgt Style Guide
- [ ] Architektur-Vorgaben eingehalten
- [ ] Security/Performance Anforderungen erfuellt

#### Qualitaetssicherung
- [ ] Alle Akzeptanzkriterien erfuellt
- [ ] Tests geschrieben und bestanden
- [ ] Code Review durchgefuehrt

#### Dokumentation
- [ ] Keine Linting Errors
- [ ] Completion Check Commands alle erfolgreich

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

| Layer | Komponenten | Aenderung |
|-------|-------------|----------|
| Frontend | aos-cloud-terminal-sidebar.ts | Close-Confirmation-Logik, Dialog |
| Frontend | aos-terminal-tabs.ts | Close-Event mit isWorkflow-Check |

---

### Technical Details

**WAS:**
- Close-Handler in `aos-cloud-terminal-sidebar.ts` der bei Workflow-Tabs pruefen ob Prozess noch aktiv
- Bestaetigungs-Dialog (Browser `confirm()`) wenn aktiver Workflow-Tab geschlossen wird
- Bei Bestaetigung: WebSocket Message `cloud-terminal:close` senden um PTY-Prozess zu beenden
- Bei Ablehnung: Tab bleibt offen
- Bei bereits beendetem Prozess: Direkt schliessen ohne Dialog

**WIE (Architektur-Guidance):**
- Uebernehme das Close-Confirmation Pattern aus `aos-execution-tabs.ts` (Zeilen 36-76) 1:1
- Nutze Browser-native `confirm()` fuer den Dialog (keine Custom-Modal noetig)
- Pruefe `session.isWorkflow && session.status !== 'exited'` fuer Confirmation-Trigger
- Bestehende `cloud-terminal:close` Message im Backend beendet PTY bereits korrekt

**WO:**
- `ui/frontend/src/components/terminal/aos-cloud-terminal-sidebar.ts`
- `ui/frontend/src/components/terminal/aos-terminal-tabs.ts`

**Abhaengigkeiten:** WTT-002

**Geschaetzte Komplexitaet:** XS

**Relevante Skills:**

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | .claude/skills/frontend-lit/SKILL.md | Lit Event-Handling |

---

### Creates Reusable Artifacts

**Creates Reusable:** no

---

### Completion Check

```bash
# Auto-Verify Commands
grep -q "confirm" ui/frontend/src/components/terminal/aos-cloud-terminal-sidebar.ts && echo "OK confirmation dialog"
cd ui/frontend && npm run build
```
