# Backend Setup Service: Status Check

> Story ID: SETUP-001
> Spec: AgentOS Extended Setup Wizard
> Created: 2026-02-13
> Last Updated: 2026-02-13

**Priority**: Critical
**Type**: Backend
**Estimated Effort**: S
**Status**: Done
**Dependencies**: None

---

## Feature

```gherkin
Feature: AgentOS Extended Installationsstatus pruefen
  Als Benutzer
  moechte ich den Installationsstatus aller AgentOS Extended Schritte sehen,
  damit ich weiss welche Schritte bereits ausgefuehrt wurden und welche noch fehlen.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Base Installation erkannt

```gherkin
Scenario: AgentOS Base Installation ist vorhanden
  Given das Projekt hat ein .agent-os/ Verzeichnis mit workflows/ und standards/ Unterordnern
  When der Status-Check ausgefuehrt wird
  Then wird Schritt 1 als "installed" gemeldet
```

### Szenario 2: Claude Code Setup erkannt

```gherkin
Scenario: Claude Code Setup ist vorhanden
  Given das Projekt hat eine CLAUDE.md Datei und ein .claude/ Verzeichnis
  When der Status-Check ausgefuehrt wird
  Then wird Schritt 2 als "installed" gemeldet
```

### Szenario 3: DevTeam Global erkannt

```gherkin
Scenario: DevTeam Global Dateien sind vorhanden
  Given das Home-Verzeichnis hat ~/.agent-os/templates/ Ordner
  When der Status-Check ausgefuehrt wird
  Then wird Schritt 3 als "installed" gemeldet
```

### Szenario 4: DevTeam Project erkannt

```gherkin
Scenario: Projekt-DevTeam ist vorhanden
  Given das Projekt hat ein agent-os/team/ Verzeichnis das nicht leer ist
  When der Status-Check ausgefuehrt wird
  Then wird Schritt 4 als "installed" gemeldet
```

### Szenario 5: Nicht installierter Schritt

```gherkin
Scenario: Base Installation fehlt
  Given das Projekt hat kein .agent-os/ Verzeichnis
  When der Status-Check ausgefuehrt wird
  Then wird Schritt 1 als "not_installed" gemeldet
```

---

## Technische Verifikation (Automated Checks)

### Inhalt-Pruefungen

- [ ] CONTAINS: `setup.service.ts` enthaelt `checkStatus` Methode
- [ ] CONTAINS: `setup.service.ts` enthaelt `checkBaseInstallation` Methode
- [ ] CONTAINS: `setup.service.ts` enthaelt `checkClaudeCodeSetup` Methode
- [ ] CONTAINS: `setup.service.ts` enthaelt `checkDevTeamGlobal` Methode
- [ ] CONTAINS: `setup.service.ts` enthaelt `checkDevTeam` Methode

### Funktions-Pruefungen

- [ ] BUILD_PASS: `cd agent-os-ui && npx tsc --noEmit` exits with code 0

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
- [x] **Handover-Dokumente definiert** (SetupService Interface fuer Story 3)

**Story ist READY wenn alle Checkboxen angehakt sind.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [ ] Code implementiert und folgt Style Guide
- [ ] Architektur-Vorgaben eingehalten (WIE section)
- [ ] Security/Performance Anforderungen erfuellt

#### Qualitaetssicherung
- [ ] Alle Akzeptanzkriterien erfuellt (via Completion Check verifiziert)
- [ ] Code Review durchgefuehrt und genehmigt
- [ ] Keine Linting Errors
- [ ] Completion Check Commands alle erfolgreich (exit 0)

#### Dokumentation
- [ ] Dokumentation aktualisiert

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Backend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Aenderung |
|-------|-------------|----------|
| Backend | `agent-os-ui/src/server/services/setup.service.ts` (NEU) | Neuer Service mit `checkStatus()` und 4 privaten Check-Methoden |

**Handover an nachfolgende Stories:**
- SETUP-003 (WebSocket Handler) nutzt `SetupService.checkStatus()` fuer `setup:check-status` Handler

---

### Technical Details

**WAS:** Neuer Backend-Service der den Installationsstatus aller 4 AgentOS Extended Schritte ueber Dateisystem-Pruefungen ermittelt.

**WIE (Architektur-Guidance ONLY):**
- Neuen Service `SetupService` erstellen der `EventEmitter` erweitert (fuer Story 2 vorbereitet)
- Interface `SetupStepStatus` definieren: `{ step: 1|2|3|4, name: string, status: 'not_installed'|'installed', details?: string }`
- `checkStatus(projectPath: string): Promise<SetupStepStatus[]>` als oeffentliche Methode
- 4 private async Check-Methoden die jeweils ein `SetupStepStatus` zurueckgeben
- Dateisystem-Checks mit `fs.access()` / `fs.readdir()` (async, non-blocking)
- Step 1 Check: `<projectPath>/.agent-os/` existiert mit `workflows/` oder `standards/` Unterordner
- Step 2 Check: `<projectPath>/CLAUDE.md` existiert UND `<projectPath>/.claude/` existiert
- Step 3 Check: `~/.agent-os/templates/` existiert (Home-Verzeichnis via `os.homedir()`)
- Step 4 Check: `<projectPath>/agent-os/team/` existiert und `readdir()` liefert mindestens einen Eintrag
- Singleton-Export: `export const setupService = new SetupService()`

**WO:**
- `agent-os-ui/src/server/services/setup.service.ts` (NEU)

**WER:** dev-team__backend-developer

**Abhaengigkeiten:** Keine - dies ist der Start

**Geschaetzte Komplexitaet:** S (1 neue Datei, ~100 LOC)

---

### Creates Reusable Artifacts

**Creates Reusable:** yes - `SetupService` wird von Story 2 erweitert und von Story 3 genutzt

---

### Relevante Skills

| Skill | Pfad | Relevanz |
|-------|------|----------|
| backend-express/services | `.claude/skills/backend-express/services.md` | Service-Layer Patterns |

---

### Completion Check

```bash
# Auto-Verify Commands - alle muessen mit 0 exiten

# 1. Datei existiert
test -f /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui/src/server/services/setup.service.ts

# 2. Service hat checkStatus Methode
grep -q "checkStatus" /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui/src/server/services/setup.service.ts

# 3. Service hat alle 4 Check-Methoden
grep -c "check\(Base\|ClaudeCode\|DevTeamGlobal\|DevTeam\)" /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui/src/server/services/setup.service.ts | grep -q "[4-9]"

# 4. TypeScript kompiliert
cd /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui && npx tsc --noEmit
```
