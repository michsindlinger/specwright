# Backend Backlog-Datenmodell erweitern

> Story ID: UKB-003
> Spec: Unified Kanban Board
> Created: 2026-02-13
> Last Updated: 2026-02-13

**Priority**: High
**Type**: Backend
**Estimated Effort**: S
**Dependencies**: None

---

## Feature

```gherkin
Feature: Erweitertes Backlog-Datenmodell
  Als Frontend-Entwickler
  möchte ich dass das Backend Backlog-Items mit allen Feldern liefert die StoryInfo benötigt,
  damit Backlog-Items direkt in der aos-story-card Komponente gerendert werden können.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Backlog-Items haben dorComplete Feld

```gherkin
Scenario: Backlog-Item wird mit dorComplete=true geliefert
  Given ein Backlog-Item existiert in der backlog-index.json
  When das Backend die Backlog-Kanban-Daten sendet
  Then enthält jedes Item ein Feld "dorComplete" mit Wert true
```

### Szenario 2: Backlog-Items haben dependencies Feld

```gherkin
Scenario: Backlog-Item wird mit leerem dependencies Array geliefert
  Given ein Backlog-Item existiert in der backlog-index.json
  When das Backend die Backlog-Kanban-Daten sendet
  Then enthält jedes Item ein Feld "dependencies" mit Wert []
```

### Szenario 3: Erweiterte Status-Werte werden akzeptiert

```gherkin
Scenario: Backend akzeptiert blocked und in_review Status für Backlog
  Given ein Backlog-Item hat den Status "in_progress"
  When ein Status-Update auf "in_review" gesendet wird
  Then akzeptiert das Backend den neuen Status
  And speichert ihn in der backlog-index.json
```

### Szenario 4: BacklogKanbanBoard hat specId Feld

```gherkin
Scenario: Backlog-Kanban-Response enthält specId
  Given der Client die Backlog-Kanban-Daten anfragt
  When das Backend antwortet
  Then enthält die Response ein Feld "specId" mit Wert "backlog"
```

### Edge Case: Bestehende Backlog-Items ohne neue Felder

```gherkin
Scenario: Alte Backlog-Items ohne dorComplete/dependencies werden korrekt geliefert
  Given eine bestehende backlog-index.json ohne dorComplete und dependencies Felder
  When das Backend die Daten liest
  Then ergänzt es automatisch dorComplete=true und dependencies=[]
```

---

## Technische Verifikation (Automated Checks)

- [ ] FILE_EXISTS: agent-os-ui/src/server/backlog-reader.ts
- [ ] CONTAINS: backlog-reader.ts enthält "dorComplete"
- [ ] CONTAINS: backlog-reader.ts enthält "dependencies"
- [ ] CONTAINS: websocket.ts akzeptiert "in_review" für Backlog-Status
- [ ] LINT_PASS: `cd agent-os-ui && npx tsc --noEmit` exits with code 0

---

## Required MCP Tools

Keine

---

## Technisches Refinement (vom Architect)

> **Ausgefuellt:** 2026-02-13 durch Software Architect

### DoR (Definition of Ready) - Vom Architect

#### Fachliche Anforderungen
- [x] Fachliche requirements klar definiert
- [x] Akzeptanzkriterien sind spezifisch und prüfbar
- [x] Business Value verstanden

#### Technische Vorbereitung
- [x] Technischer Ansatz definiert (WAS/WIE/WO)
- [x] Abhängigkeiten identifiziert
- [x] Betroffene Komponenten bekannt
- [x] Erforderliche MCP Tools dokumentiert
- [x] Story ist angemessen geschätzt (max 5 Dateien, 400 LOC)

#### Full-Stack Konsistenz
- [x] Alle betroffenen Layer identifiziert
- [x] Integration Type bestimmt
- [x] Kritische Integration Points dokumentiert
- [x] Handover-Dokumente definiert

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [x] Code implementiert und folgt Style Guide
- [x] Architektur-Vorgaben eingehalten
- [x] Security/Performance Anforderungen erfuellt

#### Qualitaetssicherung
- [x] Alle Akzeptanzkriterien erfuellt
- [x] Tests geschrieben und bestanden
- [x] Code Review durchgefuehrt

#### Integration DoD
- [x] BacklogReader.getKanbanBoard() liefert `dorComplete: true` und `dependencies: []` fuer jedes Item
- [x] BacklogKanbanBoard Response enthaelt `specId: 'backlog'`
- [x] websocket.ts `handleBacklogStoryStatus` akzeptiert `'blocked'` und `'in_review'` als gueltige Status-Werte
- [x] Bestehende Backlog-Items ohne dorComplete/dependencies Felder werden automatisch mit Defaults angereichert

#### Dokumentation
- [x] Keine Linting Errors
- [x] Completion Check Commands erfolgreich

---

### Betroffene Layer & Komponenten

**Integration Type:** Backend-only

| Layer | Komponenten | Aenderung |
|-------|-------------|----------|
| Backend | `backlog-reader.ts` | `BacklogStoryInfo` Interface: `dorComplete`, `dependencies` Felder hinzufuegen. `BacklogKanbanBoard`: `specId` Feld hinzufuegen. Status-Union erweitern um `'blocked'` und `'in_review'`. |
| Backend | `websocket.ts` | `handleBacklogStoryStatus`: statusMap um `'blocked'` und `'in_review'` Mappings erweitern. Statistics-Berechnung um neue Status erweitern. |

**Kritische Integration Points:**
- `BacklogReader.getKanbanBoard()` -> `dashboard-view` (via WebSocket `backlog.kanban` Message)
- Die gelieferten Daten muessen kompatibel mit dem Frontend `StoryInfo` Interface sein (nach UKB-001 Konsolidierung)

---

### Technical Details

**WAS:**
- `BacklogStoryInfo` Interface wird um `dorComplete: boolean` und `dependencies: string[]` erweitert.
- `BacklogStoryInfo.status` Union wird von `'backlog' | 'in_progress' | 'done'` zu `'backlog' | 'in_progress' | 'in_review' | 'done' | 'blocked'` erweitert.
- `BacklogKanbanBoard` Interface wird um `specId: string` erweitert.
- In `getKanbanBoard()` werden alle Items mit `dorComplete: true` und `dependencies: []` angereichert (harte Defaults, da Backlog-Items kein DoR-Konzept haben).
- Der `specId` Wert wird als `'backlog'` gesetzt (Sentinel-Wert fuer den Adapter in UKB-004).
- `handleBacklogStoryStatus` im websocket.ts bekommt Mappings fuer `'blocked'` und `'in_review'` in der statusMap.
- Die Sortier-Reihenfolge in `getKanbanBoard()` wird um `blocked` und `in_review` erweitert.

**WIE:**
- Additive Interface-Erweiterung: Alle neuen Felder werden mit festen Defaults belegt, keine Aenderung an bestehender backlog-index.json Struktur noetig.
- `dorComplete` und `dependencies` sind rein fuer die Frontend-Kompatibilitaet (canMoveToInProgress Validierung soll natuerlich passieren).
- `specId: 'backlog'` ist ein Sentinel-Wert, der im Frontend-Adapter (UKB-004) erkannt wird. Kein echter Spec-Pfad.
- Die Status-Mapping-Erweiterung in websocket.ts folgt dem bestehenden Pattern der statusMap Record-Struktur.
- Rueckwaertskompatibilitaet: Bestehende `backlog-index.json` Dateien benoetigen keine Migration.

**WO:**
- `agent-os-ui/src/server/backlog-reader.ts` -- BacklogStoryInfo Interface, BacklogKanbanBoard Interface, getKanbanBoard() Methode (beide Pfade: JSON und Legacy)
- `agent-os-ui/src/server/websocket.ts` -- handleBacklogStoryStatus() statusMap, Statistics-Berechnung

**Abhängigkeiten:** None (kann parallel zu UKB-001 entwickelt werden)

**Geschaetzte Komplexitaet:** S

---

### Relevante Skills

| Skill | Pfad | Grund |
|-------|------|-------|
| backend-express | agent-os/team/skills/ | Express/TypeScript Backend Patterns, Interface-Design |
| domain-agent-os-web-ui | agent-os/team/skills/ | Backlog-Datenmodell, WebSocket-Protokoll, Status-Lifecycle |
| quality-gates | agent-os/team/skills/ | TypeScript strict mode, Rueckwaertskompatibilitaet |

---

### Creates Reusable Artifacts

**Creates Reusable:** no

---

### Completion Check

```bash
# Auto-Verify Commands
cd agent-os-ui && npx tsc --noEmit
# Verify dorComplete in BacklogStoryInfo
grep -q "dorComplete" agent-os-ui/src/server/backlog-reader.ts && echo "PASS: dorComplete" || echo "FAIL: dorComplete missing"
# Verify dependencies in BacklogStoryInfo
grep -q "dependencies" agent-os-ui/src/server/backlog-reader.ts && echo "PASS: dependencies" || echo "FAIL: dependencies missing"
# Verify specId in BacklogKanbanBoard
grep -q "specId" agent-os-ui/src/server/backlog-reader.ts && echo "PASS: specId" || echo "FAIL: specId missing"
# Verify in_review in websocket status handling
grep -q "in_review" agent-os-ui/src/server/websocket.ts && echo "PASS: in_review in websocket" || echo "FAIL: in_review missing in websocket"
```
