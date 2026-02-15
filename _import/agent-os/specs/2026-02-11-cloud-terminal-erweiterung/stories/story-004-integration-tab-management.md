# Integration & Tab-Management

> Story ID: CTE-004
> Spec: Cloud Terminal Erweiterung
> Created: 2026-02-11
> Last Updated: 2026-02-11

**Priority**: High
**Type**: Frontend
**Estimated Effort**: S
**Dependencies**: CTE-001, CTE-002, CTE-003
**Integration:** aos-cloud-terminal-sidebar -> aos-terminal-tabs, CloudTerminalService -> IndexedDB, app.ts -> aos-cloud-terminal-sidebar

---

## Feature

```gherkin
Feature: Gemischte Terminal-Tabs verwalten
  Als Entwickler
  möchte ich Shell-Terminals und Claude Code Sessions gleichzeitig als Tabs verwenden können,
  damit ich nahtlos zwischen verschiedenen Terminal-Typen wechseln kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Gemischte Tabs nebeneinander

```gherkin
Scenario: Shell-Terminal und Claude Code Session als Tabs
  Given ich habe ein Shell-Terminal "Terminal 1" geöffnet
  And ich habe eine Claude Code Session "Claude Session 1" geöffnet
  When ich die Tab-Leiste betrachte
  Then sehe ich beide Sessions als Tabs
  And ich kann zwischen ihnen hin- und herwechseln
```

### Szenario 2: Session-Persistenz mit Terminal-Typ

```gherkin
Scenario: Terminal-Typ bleibt nach Seite-Neuladen erhalten
  Given ich habe ein Shell-Terminal und eine Claude Code Session geöffnet
  When ich die Seite neu lade
  Then werden beide Sessions wiederhergestellt
  And das Shell-Terminal ist weiterhin ein Shell-Terminal
  And die Claude Code Session ist weiterhin eine Claude Code Session
```

### Szenario 3: Tab schließen funktioniert für beide Typen

```gherkin
Scenario: Shell-Terminal Tab schließen
  Given ich habe ein Shell-Terminal als Tab
  When ich den Tab schließe
  Then wird der Shell-Prozess beendet
  And der Tab verschwindet aus der Tab-Leiste
```

### Szenario 4: Session-Name zeigt Terminal-Typ

```gherkin
Scenario: Session-Namen unterscheiden sich nach Typ
  Given ich erstelle ein Shell-Terminal
  And ich erstelle eine Claude Code Session
  When ich die Tab-Leiste betrachte
  Then hat das Shell-Terminal einen Namen wie "Terminal 1"
  And die Claude Code Session hat einen Namen wie "Claude Session 1"
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Alle Tabs geschlossen
  Given ich habe mehrere gemischte Tabs
  When ich alle Tabs schließe
  Then sehe ich den leeren Zustand der Sidebar
  And ich kann eine neue Session (Shell oder Claude Code) starten
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [ ] FILE_EXISTS: `agent-os-ui/ui/src/components/terminal/aos-cloud-terminal-sidebar.ts`
- [ ] FILE_EXISTS: `agent-os-ui/ui/src/services/cloud-terminal.service.ts`
- [ ] FILE_EXISTS: `agent-os-ui/ui/src/app.ts`
- [ ] CONTAINS: `terminalType` in `aos-cloud-terminal-sidebar.ts` (TerminalSession interface)
- [ ] CONTAINS: `terminalType` in `cloud-terminal.service.ts` (PersistedTerminalSession interface)
- [ ] CONTAINS: `terminalType` in `app.ts` (_handleNewTerminalSession)

### Funktions-Prüfungen

- [ ] LINT_PASS: `cd agent-os-ui && npx tsc --noEmit`
- [ ] BUILD_PASS: `cd agent-os-ui && npm run build`

---

## Required MCP Tools

Keine MCP Tools erforderlich.

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

#### Full-Stack Konsistenz (NEU)
- [x] **Alle betroffenen Layer identifiziert**
- [x] **Integration Type bestimmt**
- [x] **Kritische Integration Points dokumentiert** (wenn Full-stack)
- [x] **Handover-Dokumente definiert** (bei Multi-Layer)

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [ ] `TerminalSession` Interface in `aos-cloud-terminal-sidebar.ts` hat `terminalType?: 'shell' | 'claude-code'` Feld
- [ ] Session-Name-Generierung in `app.ts` beruecksichtigt Terminal-Typ: "Terminal N" fuer Shell, "Claude Session N" fuer Claude-Code
- [ ] `_handleNewTerminalSession()` in `app.ts` akzeptiert und speichert `terminalType` im neuen Session-Objekt
- [ ] `PersistedTerminalSession` in `cloud-terminal.service.ts` hat `terminalType` Feld (optional fuer Backward Compatibility)
- [ ] `createSession()` in `CloudTerminalService` akzeptiert `terminalType` Parameter
- [ ] Tab-Namen in `aos-terminal-tabs.ts` zeigen den Session-Namen (der bereits den Typ reflektiert)
- [ ] Bestehende Sessions ohne `terminalType` werden als `'claude-code'` behandelt

#### Qualitaetssicherung
- [ ] TypeScript kompiliert fehlerfrei
- [ ] Gemischte Tabs (Shell + Claude Code) koexistieren korrekt
- [ ] Session-Persistenz mit `terminalType` funktioniert
- [ ] Backward Compatibility: bestehende persisted Sessions ohne `terminalType` laden korrekt
- [ ] Alle Akzeptanzkriterien erfuellt

#### Dokumentation
- [ ] JSDoc-Kommentare aktualisiert
- [ ] Keine Linting Errors
- [ ] Completion Check Commands alle erfolgreich

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend (Multi-Component Integration)

| Layer | Komponenten | Aenderung |
|-------|-------------|-----------|
| Frontend Interface | `aos-cloud-terminal-sidebar.ts` | `TerminalSession` Interface um `terminalType` erweitern |
| Frontend App | `app.ts` | `_handleNewTerminalSession()` um `terminalType`-Logik erweitern, Session-Name-Generierung anpassen |
| Frontend Service | `cloud-terminal.service.ts` | `PersistedTerminalSession` um `terminalType` erweitern, `createSession()` Signatur anpassen |
| Frontend Component | `aos-terminal-tabs.ts` | Keine Code-Aenderung noetig -- Tab-Name kommt aus `session.name` das bereits den Typ reflektiert |

---

### Technical Details

**WAS:**
- `TerminalSession` Interface in `aos-cloud-terminal-sidebar.ts`: Neues optionales Feld `terminalType?: 'shell' | 'claude-code'` (optional fuer Backward Compatibility mit bestehenden Session-Objekten)
- `app.ts` `_handleNewTerminalSession()`: Muss `terminalType` Parameter empfangen koennen (via Event-Detail von `new-session` Event oder Methoden-Parameter). Session-Name-Generierung: `terminalType === 'shell'` => "Terminal N", sonst "Claude Session N". Separate Zaehler fuer Shell- und Claude-Code-Sessions pro Projekt
- `PersistedTerminalSession` in `cloud-terminal.service.ts`: Neues optionales Feld `terminalType?: 'shell' | 'claude-code'`. `createSession()` Signatur um `terminalType` erweitern. `modelId` und `providerId` werden optional (fuer Shell-Terminals nicht benoetigt)
- `aos-cloud-terminal-sidebar.ts`: `_handleNewSession()` Event muss `terminalType` Information durchreichen koennen, oder der Flow wird so geaendert dass der Typ aus der CTE-003 Event-Kette kommt

**WIE:**
- Property Binding Kette: `app.ts` setzt `terminalType` im `TerminalSession`-Objekt, dieses fliesst ueber Property-Binding an `aos-cloud-terminal-sidebar` -> `aos-terminal-tabs` -> `aos-terminal-session`
- Session-Name-Generierung: In `_handleNewTerminalSession()` den Typ-spezifischen Namen generieren. Bestehende `projectSessions.length + 1` Logik wird aufgeteilt in Shell-Zaehler und Claude-Code-Zaehler
- IndexedDB Backward Compatibility: `terminalType` als optional markieren. Beim Lesen aus IndexedDB: `session.terminalType || 'claude-code'` als Fallback
- `new-session` Event Erweiterung: Das Event in `aos-cloud-terminal-sidebar.ts` wird um `terminalType` im Detail erweitert, damit `app.ts` weiss welchen Typ es erstellen soll
- Bestehende Tab-Rendering-Logik in `aos-terminal-tabs.ts` benoetigt keine Aenderung -- sie zeigt `session.name` an, und der Name enthaelt bereits die Typ-Information

**WO:**
- `agent-os-ui/ui/src/components/terminal/aos-cloud-terminal-sidebar.ts`
- `agent-os-ui/ui/src/app.ts`
- `agent-os-ui/ui/src/services/cloud-terminal.service.ts`

**WER:** tech-architect

**Abhängigkeiten:** CTE-001, CTE-002, CTE-003

**Geschätzte Komplexität:** S (3 Dateien, ca. 40-60 LOC Aenderungen)

---

### Kritische Integration Points

| Source | Target | Verbindung | Validierung |
|--------|--------|------------|-------------|
| `aos-cloud-terminal-sidebar` | `app.ts` | Custom Event `new-session` mit `terminalType` | grep `new-session` in `app.ts` |
| `app.ts` | `aos-cloud-terminal-sidebar` | Property Binding `.sessions` mit `terminalType` | grep `terminalType` in TerminalSession Interface |
| `CloudTerminalService` | IndexedDB | Persistence mit `terminalType` Feld | grep `terminalType` in `PersistedTerminalSession` |
| `app.ts` | `CloudTerminalService` | `createSession()` mit `terminalType` | grep `createSession` in `app.ts` |

---

### Creates Reusable Artifacts

**Creates Reusable:** no

---

### Completion Check

```bash
# Verify terminalType in TerminalSession interface
grep -A10 "interface TerminalSession" agent-os-ui/ui/src/components/terminal/aos-cloud-terminal-sidebar.ts | grep -q "terminalType" && echo "PASS: terminalType in TerminalSession" || echo "FAIL: terminalType missing"

# Verify terminalType in PersistedTerminalSession
grep -A10 "interface PersistedTerminalSession" agent-os-ui/ui/src/services/cloud-terminal.service.ts | grep -q "terminalType" && echo "PASS: terminalType in PersistedTerminalSession" || echo "FAIL: terminalType missing"

# Verify session name generation uses type
grep -A15 "_handleNewTerminalSession" agent-os-ui/ui/src/app.ts | grep -q "Terminal" && echo "PASS: Terminal name in session creation" || echo "FAIL: Terminal name missing"

# Verify terminalType in new session object
grep -A15 "_handleNewTerminalSession" agent-os-ui/ui/src/app.ts | grep -q "terminalType" && echo "PASS: terminalType in new session" || echo "FAIL: terminalType missing in new session"

# TypeScript compilation check
cd agent-os-ui && npx tsc --noEmit 2>&1 | head -20
```
