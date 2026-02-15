# Terminal-Typ im Datenmodell & Protokoll

> Story ID: CTE-001
> Spec: Cloud Terminal Erweiterung
> Created: 2026-02-11
> Last Updated: 2026-02-11

**Priority**: High
**Type**: Backend
**Estimated Effort**: S
**Dependencies**: None

---

## Feature

```gherkin
Feature: Terminal-Typ Unterscheidung im System
  Als Entwickler des Cloud Terminal Systems
  möchte ich einen Terminal-Typ-Discriminator im Datenmodell haben,
  damit das System zwischen Shell-Terminals und Claude Code Sessions unterscheiden kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Shell-Terminal Typ ist definiert

```gherkin
Scenario: System kennt den Terminal-Typ "shell"
  Given das Cloud Terminal Protokoll ist geladen
  When eine neue Session mit Typ "shell" erstellt wird
  Then wird der Terminal-Typ "shell" in der Session gespeichert
  And die Session benötigt keine Model-Konfiguration
```

### Szenario 2: Claude Code Terminal Typ ist definiert

```gherkin
Scenario: System kennt den Terminal-Typ "claude-code"
  Given das Cloud Terminal Protokoll ist geladen
  When eine neue Session mit Typ "claude-code" erstellt wird
  Then wird der Terminal-Typ "claude-code" in der Session gespeichert
  And die Session enthält eine Model-Konfiguration mit Provider und Model
```

### Szenario 3: Backward Compatibility für bestehende Sessions

```gherkin
Scenario: Bestehende Sessions ohne Terminal-Typ werden als Claude Code behandelt
  Given eine Session existiert ohne expliziten Terminal-Typ
  When das System die Session lädt
  Then wird der Terminal-Typ automatisch auf "claude-code" gesetzt
  And alle bestehenden Funktionen bleiben erhalten
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Ungültiger Terminal-Typ wird abgelehnt
  Given das Cloud Terminal Protokoll validiert Typen
  When eine Session mit einem ungültigen Typ erstellt werden soll
  Then wird die Erstellung mit einem Fehler abgelehnt
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [x] FILE_EXISTS: `agent-os-ui/src/shared/types/cloud-terminal.protocol.ts`
- [x] CONTAINS: `CloudTerminalType` in `cloud-terminal.protocol.ts`
- [x] CONTAINS: `terminalType` in `CloudTerminalSession` interface
- [x] CONTAINS: `terminalType` in `CloudTerminalCreateMessage` interface

### Funktions-Prüfungen

- [x] LINT_PASS: `cd agent-os-ui && npx tsc --noEmit` (2 errors in downstream consumers - CTE-002 scope)
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
- [x] `CloudTerminalType` Union-Typ exportiert (`'shell' | 'claude-code'`)
- [x] `CloudTerminalSession.terminalType` Feld hinzugefuegt (required)
- [x] `CloudTerminalSession.modelConfig` auf optional geaendert (`CloudTerminalModelConfig | undefined`)
- [x] `CloudTerminalCreateMessage.terminalType` Feld hinzugefuegt (required)
- [x] `CloudTerminalCreateMessage.modelConfig` auf optional geaendert
- [x] Alle Union-Types (`CloudTerminalClientMessage`, `CloudTerminalServerMessage`) bleiben korrekt
- [x] Code folgt bestehendes Style Guide (JSDoc-Kommentare, 2 Spaces Indent)

#### Qualitaetssicherung
- [x] TypeScript kompiliert fehlerfrei (`npx tsc --noEmit`) - 2 downstream consumer errors (CTE-002 scope)
- [x] Keine bestehenden Imports brechen (Backward Compatibility)
- [x] Alle Akzeptanzkriterien erfuellt

#### Dokumentation
- [x] JSDoc-Kommentare fuer neue Types und Felder
- [x] Keine Linting Errors
- [x] Completion Check Commands alle erfolgreich

---

### Betroffene Layer & Komponenten

**Integration Type:** Shared Types (konsumiert von Backend und Frontend)

| Layer | Komponenten | Aenderung |
|-------|-------------|-----------|
| Shared Types | `cloud-terminal.protocol.ts` | Neuer `CloudTerminalType` Union-Typ, `terminalType`-Feld in `CloudTerminalSession` und `CloudTerminalCreateMessage`, `modelConfig` optional machen |

---

### Technical Details

**WAS:**
- Neuen Typ `CloudTerminalType = 'shell' | 'claude-code'` definieren und exportieren
- Feld `terminalType: CloudTerminalType` zu `CloudTerminalSession` Interface hinzufuegen
- Feld `modelConfig` in `CloudTerminalSession` von required auf optional aendern (`CloudTerminalModelConfig | undefined`)
- Feld `terminalType: CloudTerminalType` zu `CloudTerminalCreateMessage` hinzufuegen
- Feld `modelConfig` in `CloudTerminalCreateMessage` von required auf optional aendern

**WIE:**
- Discriminated Union Pattern: `terminalType` als Discriminator-Feld durchs gesamte Protokoll
- Backward Compatibility: Bestehende Consumer die `modelConfig` als required erwarten muessen angepasst werden (in Folge-Stories CTE-002/003/004), aber die Typ-Aenderung selbst ist sicher weil TypeScript sofort alle Stellen markiert
- Bestehende Code-Conventions folgen: JSDoc-Kommentare, Export-Reihenfolge (Types -> Interfaces -> Constants)
- Keine Default-Werte im Protocol-File selbst -- Defaults werden in den konsumierenden Layern gesetzt

**WO:**
- `agent-os-ui/src/shared/types/cloud-terminal.protocol.ts`

**WER:** tech-architect

**Abhängigkeiten:** None

**Geschätzte Komplexität:** XS (1 Datei, ca. 15 LOC Aenderungen)

---

### Creates Reusable Artifacts

**Creates Reusable:** yes

| Artifact | Type | Reusable by |
|----------|------|-------------|
| `CloudTerminalType` | TypeScript Union Type | CTE-002 (Backend), CTE-003 (Frontend), CTE-004 (Integration) |

---

### Completion Check

```bash
# Verify CloudTerminalType exists
grep -q "CloudTerminalType" agent-os-ui/src/shared/types/cloud-terminal.protocol.ts && echo "PASS: CloudTerminalType exists" || echo "FAIL: CloudTerminalType missing"

# Verify terminalType in CloudTerminalSession
grep -q "terminalType.*CloudTerminalType" agent-os-ui/src/shared/types/cloud-terminal.protocol.ts && echo "PASS: terminalType in Session" || echo "FAIL: terminalType missing in Session"

# Verify terminalType in CloudTerminalCreateMessage
grep -A5 "CloudTerminalCreateMessage" agent-os-ui/src/shared/types/cloud-terminal.protocol.ts | grep -q "terminalType" && echo "PASS: terminalType in CreateMessage" || echo "FAIL: terminalType missing in CreateMessage"

# Verify modelConfig is optional in CloudTerminalSession
grep -A10 "CloudTerminalSession" agent-os-ui/src/shared/types/cloud-terminal.protocol.ts | grep -q "modelConfig?" && echo "PASS: modelConfig optional in Session" || echo "FAIL: modelConfig not optional in Session"

# TypeScript compilation check
cd agent-os-ui && npx tsc --noEmit 2>&1 | head -20
```
