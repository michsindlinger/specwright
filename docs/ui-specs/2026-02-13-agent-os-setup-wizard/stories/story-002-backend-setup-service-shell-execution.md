# Backend Setup Service: Shell Execution

> Story ID: SETUP-002
> Spec: AgentOS Extended Setup Wizard
> Created: 2026-02-13
> Last Updated: 2026-02-13

**Priority**: Critical
**Type**: Backend
**Estimated Effort**: M
**Status**: Done
**Dependencies**: None

---

## Feature

```gherkin
Feature: AgentOS Extended Installations-Schritte ausfuehren
  Als Benutzer
  moechte ich die Curl-Commands fuer die AgentOS Installation ueber die UI ausfuehren,
  damit ich nicht manuell im Terminal arbeiten muss.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Schritt 1 erfolgreich ausfuehren

```gherkin
Scenario: Base Installation wird ausgefuehrt
  Given der Benutzer startet Schritt 1
  When der Curl-Command fuer setup.sh ausgefuehrt wird
  Then wird der Live-Output per Event gestreamt
  And nach Abschluss wird ein "step-complete" Event mit success=true emittiert
```

### Szenario 2: Live-Output Streaming

```gherkin
Scenario: Shell-Output wird in Echtzeit gestreamt
  Given ein Installations-Schritt laeuft
  When der Shell-Prozess Output erzeugt (stdout/stderr)
  Then wird jede Output-Zeile als "step-output" Event emittiert
  And der Output enthaelt die Step-Nummer zur Zuordnung
```

### Szenario 3: Fehlerbehandlung

```gherkin
Scenario: Installations-Schritt schlaegt fehl
  Given der Benutzer startet einen Installations-Schritt
  When der Shell-Prozess mit Exit-Code != 0 endet
  Then wird ein "step-complete" Event mit success=false emittiert
  And der Exit-Code wird mitgeliefert
```

### Szenario 4: Nur ein Schritt gleichzeitig

```gherkin
Scenario: Kein paralleles Ausfuehren
  Given Schritt 1 laeuft gerade
  When der Benutzer Schritt 2 starten moechte
  Then wird die Anfrage abgelehnt mit einer Fehlermeldung
```

---

## Technische Verifikation (Automated Checks)

### Inhalt-Pruefungen

- [x] CONTAINS: `setup.service.ts` enthaelt `runStep` Methode
- [x] CONTAINS: `setup.service.ts` enthaelt `spawn` Import von `child_process`
- [x] CONTAINS: `setup.service.ts` enthaelt die drei Curl-URLs

### Funktions-Pruefungen

- [x] BUILD_PASS: `cd agent-os-ui && npx tsc --noEmit` exits with code 0

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
- [x] **Alle betroffenen Layer identifiziert** (Backend-only)
- [x] **Integration Type bestimmt** (Backend-only)
- [x] **Kritische Integration Points dokumentiert** (keine)
- [x] **Handover-Dokumente definiert** (EventEmitter Events fuer Story 3)

**Story ist READY wenn alle Checkboxen angehakt sind.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [x] Code implementiert und folgt Style Guide
- [x] Architektur-Vorgaben eingehalten (WIE section)
- [x] Security/Performance Anforderungen erfuellt

#### Qualitaetssicherung
- [x] Alle Akzeptanzkriterien erfuellt (via Completion Check verifiziert)
- [x] Code Review durchgefuehrt und genehmigt
- [x] Keine Linting Errors
- [x] Completion Check Commands alle erfolgreich (exit 0)

#### Dokumentation
- [x] Dokumentation aktualisiert

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Backend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Aenderung |
|-------|-------------|----------|
| Backend | `agent-os-ui/src/server/services/setup.service.ts` | `runStep()` Methode hinzufuegen, EventEmitter Events definieren |

**Handover an nachfolgende Stories:**
- SETUP-003 (WebSocket Handler) hoert auf `step-output` und `step-complete` Events

---

### Technical Details

**WAS:** Shell-Execution-Logik im SetupService die Curl-Commands als Child-Prozesse ausfuehrt und stdout/stderr als Events streamt.

**WIE (Architektur-Guidance ONLY):**
- `SetupService` erweitert `EventEmitter` (Node.js `events` Modul)
- Statische Step-Konfiguration als `SETUP_STEPS` Array mit `{ step, name, command }` Objekten
- 3 hardcoded Curl-Commands (URLs nicht vom Client steuerbar = sicher)
- `runStep(step: 1|2|3, projectPath: string): void` als oeffentliche Methode
- Guard: `runningStep` Property pruefen - wenn nicht null, Error werfen (kein paralleles Ausfuehren)
- `child_process.spawn('bash', ['-c', command], { cwd: projectPath })` fuer Streaming
- `proc.stdout.on('data')` und `proc.stderr.on('data')` → `this.emit('step-output', { step, data: chunk.toString() })`
- `proc.on('close', (code))` → `this.emit('step-complete', { step, success: code === 0, exitCode: code })`; `this.runningStep = null`
- `proc.on('error', (err))` → `this.emit('step-complete', { step, success: false, error: err.message })`; `this.runningStep = null`

**Sicherheitshinweis:** Commands sind hardcoded. Der Client sendet nur die Step-Nummer (1/2/3). Der Server resolved zum Command. Kein User-Input fliesst in den Shell-Befehl.

**WO:**
- `agent-os-ui/src/server/services/setup.service.ts` (erweitern)

**WER:** dev-team__backend-developer

**Abhaengigkeiten:** Kann parallel zu SETUP-001 implementiert werden (gleiche Datei, verschiedene Methoden)

**Geschaetzte Komplexitaet:** M (1 Datei, ~100 LOC, EventEmitter Pattern)

---

### Creates Reusable Artifacts

**Creates Reusable:** no

---

### Relevante Skills

| Skill | Pfad | Relevanz |
|-------|------|----------|
| backend-express/services | `.claude/skills/backend-express/services.md` | Service-Layer Patterns |

---

### Completion Check

```bash
# Auto-Verify Commands

# 1. runStep Methode existiert
grep -q "runStep" /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui/src/server/services/setup.service.ts

# 2. spawn Import vorhanden
grep -q "spawn" /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui/src/server/services/setup.service.ts

# 3. Curl-URLs vorhanden
grep -q "setup.sh" /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui/src/server/services/setup.service.ts

# 4. TypeScript kompiliert
cd /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui && npx tsc --noEmit
```
