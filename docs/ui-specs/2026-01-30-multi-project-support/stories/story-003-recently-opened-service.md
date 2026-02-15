# Recently Opened Service

> Story ID: MPRO-003
> Spec: multi-project-support
> Created: 2026-01-30
> Last Updated: 2026-01-30

**Priority**: Medium
**Type**: Frontend
**Estimated Effort**: XS
**Dependencies**: None

---

## Feature

```gherkin
Feature: Recently Opened Projekte
  Als Entwickler
  möchte ich eine Liste meiner kürzlich geöffneten Projekte sehen,
  damit ich schnell zu bekannten Projekten zurückkehren kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Projekt wird zur Liste hinzugefügt

```gherkin
Scenario: Neues Projekt erscheint in Recently Opened
  Given ich habe noch nie ein Projekt geöffnet
  When ich das Projekt "/Users/dev/my-project" öffne
  Then wird "/Users/dev/my-project" zur Recently Opened Liste hinzugefügt
  And es steht an erster Stelle der Liste
```

### Szenario 2: Sortierung nach zuletzt geöffnet

```gherkin
Scenario: Liste ist nach Öffnungsdatum sortiert
  Given ich habe die Projekte "project-a", "project-b", "project-c" in dieser Reihenfolge geöffnet
  When ich die Recently Opened Liste anzeige
  Then sehe ich "project-c" an erster Stelle
  And ich sehe "project-b" an zweiter Stelle
  And ich sehe "project-a" an dritter Stelle
```

### Szenario 3: Persistenz über Browser-Sessions

```gherkin
Scenario: Liste bleibt nach Browser-Neustart erhalten
  Given ich habe das Projekt "my-project" geöffnet
  When ich den Browser schließe und wieder öffne
  Then enthält die Recently Opened Liste weiterhin "my-project"
```

### Szenario 4: Maximale Anzahl Einträge

```gherkin
Scenario: Liste ist auf 20 Einträge begrenzt
  Given die Recently Opened Liste enthält bereits 20 Projekte
  When ich ein neues Projekt "project-21" öffne
  Then enthält die Liste 20 Einträge
  And "project-21" steht an erster Stelle
  And das älteste Projekt wurde entfernt
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Ungültiger Pfad wird automatisch entfernt
  Given die Recently Opened Liste enthält "/Users/dev/deleted-project"
  And der Ordner "/Users/dev/deleted-project" existiert nicht mehr
  When die Liste geladen wird
  Then wird "/Users/dev/deleted-project" automatisch entfernt
  And ich sehe keine Fehlermeldung
```

```gherkin
Scenario: localStorage nicht verfügbar
  Given localStorage ist nicht verfügbar (z.B. Private Browsing)
  When ich ein Projekt öffne
  Then funktioniert die Anwendung weiterhin
  And die Recently Opened Liste ist leer
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [x] FILE_EXISTS: agent-os-ui/ui/src/services/recently-opened.service.ts

### Inhalt-Prüfungen

- [x] CONTAINS: agent-os-ui/ui/src/services/recently-opened.service.ts enthält "localStorage"
- [x] CONTAINS: agent-os-ui/ui/src/services/recently-opened.service.ts enthält "getRecentlyOpened"
- [x] CONTAINS: agent-os-ui/ui/src/services/recently-opened.service.ts enthält "addRecentlyOpened"

### Funktions-Prüfungen

- [x] LINT_PASS: npm run lint exits with code 0
- [x] TEST_PASS: npm run test -- tests/unit/recently-opened.test.ts exits with code 0

---

## Required MCP Tools

| Tool | Purpose | Blocking |
|------|---------|----------|
| None | - | - |

---

## Technisches Refinement (vom Architect)

> **Ausgefüllt:** 2026-01-30

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
- [x] Integration Tests geschrieben und bestanden (N/A - frontend-only service)
- [x] Code Review durchgeführt und genehmigt (self-review)

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
| Frontend | recently-opened.service.ts | Neu erstellen |

**Kritische Integration Points:**
- Keine (reiner Service, nutzt Browser localStorage API)
- Wird von MPRO-002 (Add Modal) konsumiert

---

### Technical Details

**WAS:**
- Neuer Frontend-Service `RecentlyOpenedService`
- Methoden: `getRecentlyOpened()`, `addRecentlyOpened(path)`, `removeRecentlyOpened(path)`
- localStorage-Persistenz mit Key `agent-os-recently-opened`
- Maximum 20 Einträge, LIFO-Sortierung
- Automatische Bereinigung ungültiger Pfade (optional via Backend-Validierung)

**WIE (Architektur-Guidance ONLY):**
- Singleton-Pattern für Service-Instanz (export const recentlyOpenedService)
- TypeScript Interface für RecentlyOpenedEntry: `{ path: string, name: string, lastOpened: number }`
- Graceful Handling wenn localStorage nicht verfügbar (Private Browsing)
- JSON.parse/stringify für localStorage-Operationen
- Sortierung nach `lastOpened` Timestamp (neueste zuerst)
- Pfad-Validierung kann optional via Backend `/api/project/validate` erfolgen

**WO:**
- `agent-os-ui/ui/src/services/recently-opened.service.ts` (Neu)

**WER:** dev-team__frontend-developer

**Abhängigkeiten:** None

**Geschätzte Komplexität:** XS

**Relevante Skills:**
- `frontend-lit` - Service-Patterns und State-Management

**Creates Reusable:** yes

| Artefakt | Typ | Pfad | Beschreibung |
|----------|-----|------|--------------|
| `RecentlyOpenedService` | Service | `agent-os-ui/ui/src/services/recently-opened.service.ts` | localStorage-basierte Projekt-Historie |

---

### Completion Check

```bash
# Auto-Verify Commands - alle müssen mit 0 exiten
test -f agent-os-ui/ui/src/services/recently-opened.service.ts && echo "Service exists"
grep -q "localStorage" agent-os-ui/ui/src/services/recently-opened.service.ts
grep -q "getRecentlyOpened" agent-os-ui/ui/src/services/recently-opened.service.ts
grep -q "addRecentlyOpened" agent-os-ui/ui/src/services/recently-opened.service.ts
cd agent-os-ui && npm run lint
cd agent-os-ui && npm run test -- --filter="recently-opened"
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen
