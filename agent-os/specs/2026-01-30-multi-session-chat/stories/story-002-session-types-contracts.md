# Session Types & Contracts

> Story ID: MSC-002
> Spec: Multi-Session Chat
> Created: 2026-01-30
> Last Updated: 2026-01-30

**Priority**: High
**Type**: Shared
**Estimated Effort**: XS
**Dependencies**: None

---

## Feature

```gherkin
Feature: Session Datenstrukturen
  Als Entwickler des Systems
  möchte ich einheitliche TypeScript-Types für Sessions,
  damit Frontend und Backend konsistent kommunizieren können.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Session-Objekt hat alle erforderlichen Felder

```gherkin
Scenario: Session enthält Identifikation und Metadaten
  Given ein neues Session-Objekt wird erstellt
  Then hat es eine eindeutige ID
  And einen Namen
  And ein Erstellungsdatum
  And ein letztes Aktualisierungsdatum
  And einen Status (active/archived)
```

### Szenario 2: Session enthält Chat-Historie

```gherkin
Scenario: Session speichert Nachrichten-Verlauf
  Given eine Session mit Chat-Historie
  Then enthält die Session eine Liste von Nachrichten
  And jede Nachricht hat einen Absender (user/assistant)
  And jede Nachricht hat einen Inhalt
  And jede Nachricht hat einen Zeitstempel
```

### Szenario 3: Session enthält Agent-State

```gherkin
Scenario: Session speichert Agent-Zustand
  Given eine Session mit aktivem Agent-Prozess
  Then enthält die Session den Agent-State
  And der State zeigt ob ein Prozess läuft
  And der State enthält die aktuelle Aufgabe (falls aktiv)
```

### Szenario 4: WebSocket-Nachrichten mit Session-ID

```gherkin
Scenario: Nachrichten sind einer Session zugeordnet
  Given eine WebSocket-Nachricht wird gesendet
  Then enthält die Nachricht eine Session-ID
  And der Server kann die Nachricht der richtigen Session zuordnen
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Ungültige Session-ID wird abgelehnt
  Given eine Nachricht mit ungültiger Session-ID
  When der Server die Nachricht empfängt
  Then wird ein Fehler zurückgegeben
  And die Nachricht wird nicht verarbeitet
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [ ] FILE_EXISTS: `agent-os-ui/ui/src/types/session.types.ts`
- [ ] FILE_EXISTS: `agent-os-ui/ui/src/types/index.ts`

### Funktions-Prüfungen

- [ ] LINT_PASS: `cd agent-os-ui && npm run lint`
- [ ] BUILD_PASS: `cd agent-os-ui && npx tsc --noEmit`

---

## Required MCP Tools

| Tool | Purpose | Blocking |
|------|---------|----------|
| - | Keine MCP Tools erforderlich | - |

---

## Technisches Refinement (vom Architect)

> **Refined:** 2026-01-30

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

**Story ist READY wenn alle Checkboxen angehakt sind.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [ ] Code implementiert und folgt Style Guide
- [ ] Architektur-Vorgaben eingehalten
- [ ] Security/Performance Anforderungen erfüllt

#### Qualitätssicherung
- [ ] Alle Akzeptanzkriterien erfüllt
- [ ] TypeScript Compiler läuft ohne Fehler
- [ ] Code Review durchgeführt und genehmigt

#### Dokumentation
- [ ] Dokumentation aktualisiert
- [ ] Keine Linting Errors
- [ ] Completion Check Commands alle erfolgreich

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Shared (Types-only, no runtime code)

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Shared | session.types.ts | NEU: Session-Interfaces definieren |
| Shared | messages.types.ts | ERWEITERN: Session-WebSocket-Nachrichten hinzufügen |

**Kritische Integration Points:** N/A (Types-only, werden von allen anderen Stories konsumiert)

---

### Technical Details

**WAS:**
- ISession Interface: Session-Metadaten (id, name, createdAt, updatedAt, status)
- ISessionMessage Interface: Chat-Nachrichten (role, content, timestamp)
- ISessionAgentState Interface: Agent-Status (isRunning, currentTask)
- ISessionState Interface: Kombiniert Session + Messages + AgentState
- SessionStatus Enum: 'active' | 'archived'
- WebSocket Message Types: session:create, session:update, session:delete, session:list

**WIE:**
- Folge IWebSocketMessage Pattern aus architecture-decision.md (DEC-003)
- Nutze TypeScript strict mode, keine any types
- Exportiere alle Types aus einem zentralen Index
- Verwende Prefix "I" für Interfaces gemäß architecture-structure.md

**WO:**
- `agent-os-ui/ui/src/types/session.types.ts` (NEU)
- `agent-os-ui/ui/src/types/index.ts` (NEU oder ERWEITERN)
- `agent-os-ui/src/server/types/session.types.ts` (NEU - Backend-spezifisch falls nötig)

**WER:** dev-team__backend-developer (Types sind Stack-agnostisch)

**Abhängigkeiten:** None (Basis-Story)

**Geschätzte Komplexität:** XS (~50-80 LOC, reine Type-Definitionen)

---

### Relevante Skills

- `backend-express` (für WebSocket Message Patterns)
- `frontend-lit` (für Frontend Type Integration)

---

### Completion Check

```bash
# TypeScript Compilation Check
cd /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui && npx tsc --noEmit

# Lint Check
cd /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui && npm run lint
```

---

### Technische Verifikation

- [x] FILE_EXISTS: `agent-os-ui/ui/src/types/session.types.ts`
- [x] CONTAINS: `session.types.ts` enthält `ISession`, `ISessionMessage`, `ISessionAgentState`
- [x] LINT_PASS: `npm run lint` ohne Fehler
- [x] BUILD_PASS: `npx tsc --noEmit` ohne Fehler
