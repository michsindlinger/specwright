# Frontend - Kanban Board Integration

> Story ID: SDVE-003
> Spec: Spec Docs Viewer Extension
> Created: 2026-02-12
> Last Updated: 2026-02-12

**Priority**: High
**Type**: Frontend
**Estimated Effort**: S (3 SP)
**Dependencies**: SDVE-001, SDVE-002

**Integration:** kanban-board.ts → aos-spec-file-tabs (Rendering), kanban-board.ts → Gateway (specs.files, specs.read, specs.save)

---

## Feature

```gherkin
Feature: Spec Viewer mit dynamischen Tabs im Kanban Board
  Als Entwickler
  möchte ich im Kanban Board Spec Viewer alle Markdown-Dateien eines Specs sehen und bearbeiten können,
  damit ich die vollständige Dokumentation direkt im UI zugänglich habe.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Spec Viewer öffnet mit allen Dateien

```gherkin
Scenario: Spec Viewer zeigt dynamische Dateiliste
  Given ich bin auf dem Kanban Board eines Specs
  And der Spec hat spec.md, spec-lite.md, implementation-plan.md und 3 Story-Dateien
  When ich den Spec Viewer öffne
  Then sehe ich eine Tab-Bar mit allen 6 Dateien gruppiert nach Ordner
  And die erste Datei (spec.md) ist automatisch ausgewählt und angezeigt
```

### Szenario 2: Zwischen Dateien wechseln

```gherkin
Scenario: Tab-Wechsel lädt neue Datei
  Given der Spec Viewer ist geöffnet mit spec.md angezeigt
  When ich auf den Tab "stories/story-001-feature.md" klicke
  Then wird der Inhalt von story-001-feature.md geladen und angezeigt
  And der Tab "stories/story-001-feature.md" ist als aktiv markiert
```

### Szenario 3: Datei bearbeiten und speichern

```gherkin
Scenario: Beliebige Markdown-Datei bearbeiten
  Given ich habe "implementation-plan.md" im Spec Viewer geöffnet
  When ich in den Edit-Modus wechsle
  And den Inhalt ändere und speichere
  Then wird die Datei erfolgreich gespeichert
  And ich sehe eine Bestätigungsmeldung
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Spec Viewer öffnen bei leerem Spec-Ordner
  Given ein Spec-Ordner enthält keine Markdown-Dateien
  When ich den Spec Viewer öffne
  Then sehe ich eine Hinweismeldung "Keine Dokumente gefunden"
```

```gherkin
Scenario: Lazy Loading - Dateien werden erst bei Bedarf geladen
  Given der Spec Viewer zeigt 10 Tabs
  When ich den Viewer öffne
  Then wird nur der Inhalt der ersten Datei geladen
  And andere Dateien werden erst beim Tab-Klick geladen
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [x] FILE_EXISTS: `agent-os-ui/ui/src/components/kanban-board.ts` (erweitert)
- [x] FILE_EXISTS: `agent-os-ui/ui/src/gateway.ts` (erweitert)

### Inhalt-Prüfungen

- [x] CONTAINS: `agent-os-ui/ui/src/components/kanban-board.ts` enthält `aos-spec-file-tabs`
- [x] CONTAINS: `agent-os-ui/ui/src/components/kanban-board.ts` enthält `specViewerRelativePath`
- [x] CONTAINS: `agent-os-ui/ui/src/gateway.ts` enthält `requestSpecFiles`
- [x] CONTAINS: `agent-os-ui/ui/src/gateway.ts` enthält `specs.files`

### Funktions-Prüfungen

- [x] LINT_PASS: `cd agent-os-ui/ui && npx tsc --noEmit`
- [x] BUILD_PASS: `cd agent-os-ui/ui && npx tsc --noEmit`

---

## Required MCP Tools

_No MCP tools required for this story._

---

## Technisches Refinement (vom Architect)

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
- [x] **Alle betroffenen Layer identifiziert** - Frontend (kanban-board.ts, gateway.ts) mit WebSocket-Kommunikation zum Backend (SDVE-001)
- [x] **Integration Type bestimmt** - Full-stack (Frontend verbindet sich mit Backend via WebSocket)
- [x] **Kritische Integration Points dokumentiert** - kanban-board.ts -> Gateway (`specs.files`, `specs.read` mit `relativePath`, `specs.save` mit `relativePath`); kanban-board.ts -> `aos-spec-file-tabs` (Property Binding + Event Handling)
- [x] **Handover-Dokumente definiert** - Nutzt API Contract aus SDVE-001 (specs.files Response) und Component Interface aus SDVE-002 (aos-spec-file-tabs Properties/Events)

**Story ist READY wenn alle Checkboxen angehakt sind.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [x] Code implementiert und folgt Style Guide
- [x] Architektur-Vorgaben eingehalten (WIE section)
- [x] Lazy Loading: Datei-Content wird erst beim Tab-Klick geholt

#### Qualitätssicherung
- [x] Alle Akzeptanzkriterien erfüllt (via Completion Check verifiziert)
- [x] TypeScript kompiliert fehlerfrei (`npx tsc --noEmit`)
- [x] Code Review durchgeführt und genehmigt

#### Integration-DoD
- [x] **Integration hergestellt: kanban-board.ts -> aos-spec-file-tabs (Rendering)** - Komponente im Spec Viewer Modal gerendert, Properties gebunden, Events behandelt
- [x] **Integration hergestellt: kanban-board.ts -> Gateway (specs.files, specs.read mit relativePath)** - Gateway-Methode aufgerufen, Handler registriert, Response verarbeitet

#### Dokumentation
- [x] Keine Linting Errors
- [x] Completion Check Commands alle erfolgreich (exit 0)

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Full-stack

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | `kanban-board.ts` (State) | `specViewerFileType` State durch `specViewerRelativePath: string` ersetzen; neuer State `specViewerFiles` fuer Dateiliste; Entfernung von `showSpecFileSelector` State |
| Frontend | `kanban-board.ts` (Handler) | `setupSpecViewerHandlers()` um `specs.files` Handler erweitern; `handleSpecsRead` mit `relativePath` statt `fileType`; `handleSpecSaveRequested` mit `relativePath`; `requestSpecFile` umbauen auf `relativePath` |
| Frontend | `kanban-board.ts` (Template) | Hardcodierte spec.md/spec-lite.md Buttons durch `<aos-spec-file-tabs>` ersetzen; `file-selected` Event Handler |
| Frontend | `gateway.ts` | Neue `requestSpecFiles(specId)` Convenience-Methode fuer `specs.files` Message-Typ |

**Kritische Integration Points:**
- `kanban-board.ts` -> `aos-spec-file-tabs`: Property Binding (`.files`, `.activeFile`) und Event Handling (`@file-selected`)
- `kanban-board.ts` -> `gateway.ts`: `requestSpecFiles()` Aufruf beim Oeffnen des Spec Viewers, `specs.files` Response Handler
- `kanban-board.ts` -> `gateway.ts`: `specs.read` mit `relativePath` statt `fileType`, `specs.save` mit `relativePath` statt `fileType`
- Backward-Kompatibilitaet: Bestehende `handleSpecsRead` und `handleSpecsSave` Handler muessen mit neuem `relativePath` Parameter arbeiten

---

### Technical Details

**WAS:**
- Refactoring des Spec Viewer Modals in `kanban-board.ts`: Hardcodierte spec.md/spec-lite.md Buttons durch dynamische `aos-spec-file-tabs` Komponente ersetzen
- State-Aenderung: `specViewerFileType: 'spec' | 'spec-lite'` wird zu `specViewerRelativePath: string`; neuer State `specViewerFiles` fuer die Dateiliste
- Neue Gateway-Methode `requestSpecFiles(specId)` analog zu bestehendem `requestSpecsList()`
- Neuer WebSocket-Handler `specs.files` in `setupSpecViewerHandlers()`
- Beim Oeffnen des Spec Viewers `specs.files` senden, bei Response Dateiliste speichern und erste Datei automatisch laden
- `handleSpecSaveRequested` und `requestSpecFile` umbauen auf `relativePath` statt `fileType`

**WIE (Architektur-Guidance ONLY):**
- `gateway.ts` Erweiterung folgt dem Pattern von `requestSpecsList()` (Zeile 342): einfacher `send()` Aufruf mit `type` und `specId`
- `kanban-board.ts` State-Management folgt dem bestehenden Pattern (Zeile 140-161): `@state()` Decorator fuer reaktive Properties
- `setupSpecViewerHandlers()` (Zeile 749-753) erweitern um `gateway.on('specs.files', ...)` Handler analog zu bestehendem `specs.read` Handler
- Spec Viewer Modal Template (Zeile 1600-1636) anpassen: die zwei `<button>` Elemente (Zeile 1607-1618) durch `<aos-spec-file-tabs .files=${this.specViewerFiles} .activeFile=${this.specViewerRelativePath} @file-selected=${...}>` ersetzen
- Import von `aos-spec-file-tabs` am Anfang der Datei hinzufuegen (relativ: `./specs/aos-spec-file-tabs.js`)
- `requestSpecFile` Methode (Zeile 813) umbauen: statt `fileType` Parameter nimmt es `relativePath` und sendet `{ type: 'specs.read', specId, relativePath }`
- `handleSpecSaveRequested` (Zeile 802) sendet `relativePath` statt `fileType`
- Beim Oeffnen des Spec Viewers (wo bisher `requestSpecFile('spec')` aufgerufen wird): zuerst `gateway.requestSpecFiles(specId)` senden, dann im `specs.files` Handler die erste Datei laden

**WO:**
- `agent-os-ui/ui/src/components/kanban-board.ts` - State, Handler, Template-Aenderungen
- `agent-os-ui/ui/src/gateway.ts` - neue `requestSpecFiles()` Methode

**WER:** codebase-analyzer

**Abhängigkeiten:** SDVE-001 (Backend specs.files Handler, relativePath in specs.read/save), SDVE-002 (aos-spec-file-tabs Komponente)

**Geschätzte Komplexität:** S

---

### Creates Reusable Artifacts

**Creates Reusable:** no

---

### Relevante Skills

- ui-component-architecture (Integration bestehender Lit Components)
- state-management (Lit @state() reaktive Properties)

---

### Completion Check

```bash
# 1. TypeScript Frontend compilation
cd agent-os-ui/ui && npx tsc --noEmit

# 2. Verify aos-spec-file-tabs import in kanban-board
grep -n "aos-spec-file-tabs" agent-os-ui/ui/src/components/kanban-board.ts

# 3. Verify specViewerRelativePath state
grep -n "specViewerRelativePath" agent-os-ui/ui/src/components/kanban-board.ts

# 4. Verify requestSpecFiles in gateway
grep -n "requestSpecFiles" agent-os-ui/ui/src/gateway.ts

# 5. Verify specs.files handler in kanban-board
grep -n "specs.files" agent-os-ui/ui/src/components/kanban-board.ts

# 6. Verify relativePath in save handler
grep -n "relativePath" agent-os-ui/ui/src/components/kanban-board.ts
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt Aenderungen in `kanban-board.ts` und `gateway.ts`
4. Hardcodierte spec.md/spec-lite.md Buttons sind durch dynamische Tab-Bar ersetzt
