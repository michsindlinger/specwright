# Backend Plain Terminal Support

> Story ID: CTE-002
> Spec: Cloud Terminal Erweiterung
> Created: 2026-02-11
> Last Updated: 2026-02-11

**Priority**: High
**Type**: Backend
**Estimated Effort**: S
**Dependencies**: CTE-001

---

## Feature

```gherkin
Feature: Plain Shell Terminal im Backend starten
  Als Entwickler
  möchte ich ein normales Shell-Terminal über das Cloud Terminal System starten können,
  damit ich Shell-Befehle ausführen kann ohne Claude Code zu laden.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Shell-Terminal wird gestartet

```gherkin
Scenario: Erfolgreiches Starten eines Shell-Terminals
  Given der Cloud Terminal Manager ist bereit
  And ein Projektpfad "/projects/mein-projekt" existiert
  When eine neue Session mit Terminal-Typ "shell" angefordert wird
  Then wird ein Shell-Prozess im Projektpfad gestartet
  And der Prozess nutzt die System-Default-Shell
  And die Session erscheint in der aktiven Session-Liste
```

### Szenario 2: Shell-Terminal ohne Model-Konfiguration

```gherkin
Scenario: Shell-Terminal benötigt keine LLM-Konfiguration
  Given der Cloud Terminal Manager ist bereit
  When eine neue Shell-Session ohne Model-Konfiguration angefordert wird
  Then wird die Session erfolgreich erstellt
  And kein Claude Code Prozess wird gestartet
  And kein LLM-Provider wird kontaktiert
```

### Szenario 3: Cloud Code Terminal funktioniert weiterhin

```gherkin
Scenario: Bestehende Claude Code Sessions funktionieren unverändert
  Given der Cloud Terminal Manager ist bereit
  When eine neue Session mit Terminal-Typ "claude-code" und Model "sonnet" bei Provider "anthropic" angefordert wird
  Then wird Claude Code mit den gewählten Einstellungen gestartet
  And die Session verhält sich wie bisher
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Shell-Terminal bei fehlendem Projektpfad
  Given der Cloud Terminal Manager ist bereit
  When eine Shell-Session für einen nicht existierenden Projektpfad angefordert wird
  Then wird ein Fehler mit einer verständlichen Meldung zurückgegeben
  And keine Session wird erstellt
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [x] FILE_EXISTS: `agent-os-ui/src/server/services/cloud-terminal-manager.ts`
- [x] FILE_EXISTS: `agent-os-ui/src/server/websocket.ts`
- [x] CONTAINS: `terminalType` in `cloud-terminal-manager.ts`
- [x] CONTAINS: `terminalType` in `websocket.ts` (handleCloudTerminalCreate)

### Funktions-Prüfungen

- [x] LINT_PASS: `cd agent-os-ui && npx tsc --noEmit`
- [x] BUILD_PASS: `cd agent-os-ui && npm run build`

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
- [x] `CloudTerminalManager.createSession()` akzeptiert optionales `modelConfig` und neuen `terminalType` Parameter
- [x] Bei `terminalType === 'shell'`: System-Default-Shell wird gestartet (`process.env.SHELL || 'bash'`) ohne Claude-Code-Argumente
- [x] Bei `terminalType === 'claude-code'`: bestehender Flow mit `getCliCommandForModel()` bleibt unveraendert
- [x] `ManagedCloudSession` speichert `terminalType` in Metadaten
- [x] `getSessionMetadata()` gibt `terminalType` im Ergebnis zurueck
- [x] `handleCloudTerminalCreate()` in `websocket.ts` liest `terminalType` aus der Message und leitet es an `createSession()` weiter
- [x] `handleCloudTerminalCreate()` akzeptiert Messages ohne `modelConfig` (fuer Shell-Terminals)

#### Qualitaetssicherung
- [x] TypeScript kompiliert fehlerfrei
- [x] Bestehende Claude-Code-Sessions funktionieren unveraendert
- [x] Shell-Terminal-Erstellung ohne modelConfig schlaegt nicht fehl
- [x] Alle Akzeptanzkriterien erfuellt

#### Dokumentation
- [x] JSDoc-Kommentare fuer geaenderte Methoden aktualisiert
- [x] Keine Linting Errors
- [x] Completion Check Commands alle erfolgreich

---

### Betroffene Layer & Komponenten

**Integration Type:** Backend

| Layer | Komponenten | Aenderung |
|-------|-------------|-----------|
| Backend Service | `cloud-terminal-manager.ts` | `createSession()` Signatur erweitern um `terminalType`, Conditional fuer Shell-Spawn vs. Claude-Code-Spawn |
| Backend Service | `cloud-terminal-manager.ts` | `ManagedCloudSession` und `getSessionMetadata()` um `terminalType` erweitern |
| Backend WebSocket | `websocket.ts` | `handleCloudTerminalCreate()` liest `terminalType` und optionales `modelConfig` aus der Message |

---

### Technical Details

**WAS:**
- `CloudTerminalManager.createSession()` Signatur erweitern: neuer Parameter `terminalType: CloudTerminalType`, `modelConfig` wird optional
- Conditional in `createSession()`: wenn `terminalType === 'shell'`, dann Shell-Spawn mit `process.env.SHELL || 'bash'` und leeren Args; kein Aufruf von `getCliCommandForModel()`
- `ManagedCloudSession` Interface um `terminalType` erweitern (erbt von CTE-001 geaendertem `CloudTerminalSession`)
- `getSessionMetadata()` gibt `terminalType` zurueck
- `handleCloudTerminalCreate()` in `websocket.ts`: `terminalType` aus Message lesen (Default: `'claude-code'` fuer Backward Compatibility), `modelConfig` als optional behandeln

**WIE:**
- Strategy Pattern: In `createSession()` einen Branch einfuegen (`if (terminalType === 'shell')`) der die Shell-Konfiguration bestimmt, anstatt `getCliCommandForModel()` aufzurufen
- Bestehender Code-Flow fuer `claude-code` bleibt identisch -- nur ein neuer Branch wird hinzugefuegt
- `process.env.SHELL` als Default-Shell verwenden, Fallback auf `'bash'`
- Keine neuen env-Variablen fuer Shell-Terminals setzen (kein `CLAUDE_MODEL`, kein `CLAUDE_PROVIDER`)
- modelConfig-Validierung in `websocket.ts` nur wenn `terminalType !== 'shell'` enforced
- Backward Compatibility: Messages ohne `terminalType`-Feld werden als `'claude-code'` behandelt

**WO:**
- `agent-os-ui/src/server/services/cloud-terminal-manager.ts`
- `agent-os-ui/src/server/websocket.ts`

**WER:** tech-architect

**Abhängigkeiten:** CTE-001

**Geschätzte Komplexität:** S (2 Dateien, ca. 40-60 LOC Aenderungen)

---

### Creates Reusable Artifacts

**Creates Reusable:** no

---

### Completion Check

```bash
# Verify terminalType handling in CloudTerminalManager
grep -q "terminalType" agent-os-ui/src/server/services/cloud-terminal-manager.ts && echo "PASS: terminalType in manager" || echo "FAIL: terminalType missing in manager"

# Verify shell spawn logic
grep -q "process.env.SHELL" agent-os-ui/src/server/services/cloud-terminal-manager.ts && echo "PASS: Shell spawn logic exists" || echo "FAIL: Shell spawn logic missing"

# Verify terminalType in websocket handler
grep -A10 "handleCloudTerminalCreate" agent-os-ui/src/server/websocket.ts | grep -q "terminalType" && echo "PASS: terminalType in websocket handler" || echo "FAIL: terminalType missing in websocket handler"

# Verify modelConfig is treated as optional in websocket handler
grep -A10 "handleCloudTerminalCreate" agent-os-ui/src/server/websocket.ts | grep -q "modelConfig" && echo "PASS: modelConfig handled" || echo "FAIL: modelConfig handling missing"

# TypeScript compilation check
cd agent-os-ui && npx tsc --noEmit 2>&1 | head -20
```
