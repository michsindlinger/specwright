# StoryInfo Interface vereinheitlichen

> Story ID: UKB-001
> Spec: Unified Kanban Board
> Created: 2026-02-13
> Last Updated: 2026-02-13
> Status: Done

**Priority**: High
**Type**: Frontend
**Estimated Effort**: S
**Dependencies**: None

---

## Feature

```gherkin
Feature: Einheitliches StoryInfo Interface
  Als Entwickler
  möchte ich ein einziges StoryInfo Interface für Spec-Stories und Backlog-Items,
  damit beide Kontexte die gleiche Datenstruktur nutzen und Komponenten wiederverwendbar sind.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: StoryInfo enthält in_review Status

```gherkin
Scenario: Story-Card zeigt In Review Status korrekt an
  Given eine Story hat den Status "in_review"
  When die Story in einer aos-story-card gerendert wird
  Then sehe ich ein gelbes Status-Badge mit dem Text "In Review"
```

### Szenario 2: Einheitliches Interface für beide Kontexte

```gherkin
Scenario: Backlog-Item nutzt StoryInfo Interface
  Given ein Backlog-Item wird als StoryInfo Objekt bereitgestellt
  And das Backlog-Item hat dorComplete=true und dependencies=[]
  When das Item an eine aos-story-card übergeben wird
  Then wird das Item korrekt gerendert ohne Fehler
```

### Edge Case: Status-Badge für unbekannten Status

```gherkin
Scenario: Unbekannter Status wird graceful behandelt
  Given eine Story hat einen unbekannten Status-Wert
  When die Story in einer aos-story-card gerendert wird
  Then sehe ich ein neutrales Status-Badge statt eines Fehlers
```

---

## Technische Verifikation (Automated Checks)

- [ ] FILE_EXISTS: agent-os-ui/ui/src/components/story-card.ts
- [ ] CONTAINS: story-card.ts enthält "in_review" in StoryInfo status union
- [ ] CONTAINS: story-status-badge.ts enthält "in-review" Status-Support
- [ ] LINT_PASS: `cd agent-os-ui/ui && npx tsc --noEmit` exits with code 0

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
- [x] Erforderliche MCP Tools dokumentiert (falls zutreffend)
- [x] Story ist angemessen geschätzt (max 5 Dateien, 400 LOC)

#### Full-Stack Konsistenz
- [x] Alle betroffenen Layer identifiziert
- [x] Integration Type bestimmt
- [x] Kritische Integration Points dokumentiert (wenn Full-stack)
- [x] Handover-Dokumente definiert (bei Multi-Layer)

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [x] Code implementiert und folgt Style Guide
- [x] Architektur-Vorgaben eingehalten
- [x] Security/Performance Anforderungen erfüllt

#### Qualitaetssicherung
- [x] Alle Akzeptanzkriterien erfuellt
- [x] Tests geschrieben und bestanden
- [x] Code Review durchgefuehrt

#### Dokumentation
- [x] Keine Linting Errors
- [x] Completion Check Commands erfolgreich

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

| Layer | Komponenten | Aenderung |
|-------|-------------|----------|
| Frontend | `story-card.ts` | `in_review` zu StoryInfo status Union hinzufuegen, `getEffectiveStatus()` Mapping ergaenzen |
| Frontend | `kanban-board.ts` | Doppelte StoryInfo Definition entfernen, Re-export aus story-card.ts nutzen |
| Frontend | `story-status-badge.ts` | `in-review` zu StoryStatus Union hinzufuegen, gelbe Badge-Konfiguration ergaenzen |

---

### Technical Details

**WAS:**
- StoryInfo Interface in `story-card.ts` ist die kanonische Definition. Die status Union wird um `'in_review'` erweitert.
- Das duplizierte StoryInfo Interface in `kanban-board.ts` (Zeile 27-39) wird entfernt und stattdessen aus `story-card.ts` re-exportiert.
- StoryStatus Union in `story-status-badge.ts` wird um `'in-review'` erweitert (Kebab-Case, wie die bestehenden Status-Werte).
- Die `getEffectiveStatus()` Methode in `story-card.ts` bekommt ein Mapping von `'in_review'` auf `'in-review'`.
- Die `getStatusConfig()` Methode in `story-status-badge.ts` bekommt einen neuen Block fuer `'in-review'` mit gelbem Styling.

**WIE:**
- Konsolidierung folgt dem bestehenden Pattern: `story-card.ts` definiert, `kanban-board.ts` re-exportiert (wie bereits bei `ModelSelection`, `ProviderInfo`).
- Die StoryInfo Union-Erweiterung ist additiv und bricht keine bestehenden Typen.
- `in-review` Badge-Farbe: Gelb (analog zu `status-working`, aber mit eigenem Klassen-Namen `status-in-review`). Orientierung an bestehendem `getStatusConfig()` Pattern.
- Kein neuer CSS-Import noetig, da `story-status-badge.ts` Light DOM nutzt (`createRenderRoot() { return this; }`).
- Bestehende Tests und Consumers bleiben kompatibel, da die Union nur erweitert wird.

**WO:**
- `agent-os-ui/ui/src/components/story-card.ts` -- StoryInfo.status Union, getEffectiveStatus() statusMap
- `agent-os-ui/ui/src/components/kanban-board.ts` -- Doppeltes StoryInfo Interface entfernen, Import/Re-export anpassen
- `agent-os-ui/ui/src/components/story-status-badge.ts` -- StoryStatus Union, getStatusConfig(), getIcon()

**Abhängigkeiten:** None

**Geschaetzte Komplexitaet:** S

---

### Relevante Skills

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | agent-os/team/skills/ | Lit Web Components Patterns (reactive Properties, Light DOM, Union Types) |
| domain-agent-os-web-ui | agent-os/team/skills/ | Kanban Board Domain-Wissen, StoryInfo Datenstruktur |
| quality-gates | agent-os/team/skills/ | TypeScript strict mode Validierung, Linting |

---

### Creates Reusable Artifacts

**Creates Reusable:** no

---

### Completion Check

```bash
# Auto-Verify Commands
cd agent-os-ui/ui && npx tsc --noEmit
# Verify in_review in story-card StoryInfo
grep -q "in_review" agent-os-ui/ui/src/components/story-card.ts && echo "PASS: in_review in story-card" || echo "FAIL: in_review missing"
# Verify no duplicate StoryInfo in kanban-board
grep -c "export interface StoryInfo" agent-os-ui/ui/src/components/kanban-board.ts | grep -q "^0$" && echo "PASS: No duplicate StoryInfo in kanban-board" || echo "FAIL: Duplicate StoryInfo still exists"
# Verify in-review in story-status-badge
grep -q "in-review" agent-os-ui/ui/src/components/story-status-badge.ts && echo "PASS: in-review in badge" || echo "FAIL: in-review missing in badge"
```
