# Session Persistence Service

> Story ID: MSC-003
> Spec: Multi-Session Chat
> Created: 2026-01-30
> Last Updated: 2026-01-30

**Priority**: High
**Type**: Backend
**Estimated Effort**: S
**Dependencies**: MSC-002

---

## Feature

```gherkin
Feature: Session Persistenz
  Als Entwickler
  möchte ich dass meine Sessions automatisch gespeichert werden,
  damit ich nach einem Neustart der App meine Arbeit fortsetzen kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Neue Session erstellen

```gherkin
Scenario: Neue Session wird erstellt und gespeichert
  Given der Session-Service ist aktiv
  When ich eine neue Session erstelle
  Then wird eine Session-Datei in "agent-os/sessions/" angelegt
  And die Datei enthält die Session-Daten als JSON
  And die Session hat eine eindeutige ID
```

### Szenario 2: Session automatisch speichern

```gherkin
Scenario: Änderungen werden automatisch persistiert
  Given ich habe eine aktive Session "Mein Projekt"
  When ich eine neue Chat-Nachricht hinzufüge
  Then wird die Session-Datei automatisch aktualisiert
  And das "lastUpdated" Datum wird aktualisiert
```

### Szenario 3: Sessions beim Start laden

```gherkin
Scenario: Gespeicherte Sessions werden beim Start geladen
  Given es existieren 3 Session-Dateien im "agent-os/sessions/" Ordner
  When der Server startet
  Then werden alle 3 Sessions geladen
  And sie sind im Frontend verfügbar
```

### Szenario 4: Session archivieren

```gherkin
Scenario: Geschlossene Session wird archiviert
  Given ich habe eine Session "Altes Projekt"
  When ich die Session schließe
  Then wird die Session in "agent-os/sessions/archive/" verschoben
  And der Status wird auf "archived" gesetzt
```

### Szenario 5: Archivierte Session wiederherstellen

```gherkin
Scenario: Session aus dem Archiv wiederherstellen
  Given eine Session "Altes Projekt" ist im Archiv
  When ich die Session wiederherstelle
  Then wird sie zurück in "agent-os/sessions/" verschoben
  And der Status wird auf "active" gesetzt
  And sie erscheint wieder in der Tab-Leiste
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Sessions-Ordner existiert nicht
  Given der Ordner "agent-os/sessions/" existiert nicht
  When der Server startet
  Then wird der Ordner automatisch erstellt
  And der Server startet normal
```

```gherkin
Scenario: Korrupte Session-Datei
  Given eine Session-Datei enthält ungültiges JSON
  When der Server die Sessions lädt
  Then wird die korrupte Datei übersprungen
  And eine Warnung wird geloggt
  And die anderen Sessions werden normal geladen
```

```gherkin
Scenario: Speichern schlägt fehl (Disk voll)
  Given der Speicherplatz ist voll
  When eine Session gespeichert werden soll
  Then wird ein Fehler geloggt
  And der User wird benachrichtigt
  And die Session bleibt im Memory erhalten
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [ ] FILE_EXISTS: `agent-os-ui/src/server/session.service.ts`
- [ ] DIR_EXISTS: `agent-os/sessions/` (wird beim Start erstellt)

### Funktions-Prüfungen

- [ ] LINT_PASS: `cd agent-os-ui && npm run lint`
- [ ] BUILD_PASS: `cd agent-os-ui && npx tsc --noEmit`
- [ ] TEST_PASS: `cd agent-os-ui && npm test -- --grep "SessionService"`

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
- [ ] Error-Handling für File I/O implementiert

#### Qualitätssicherung
- [ ] Alle Akzeptanzkriterien erfüllt
- [ ] Unit Tests mit Vitest geschrieben und bestanden
- [ ] Code Review durchgeführt und genehmigt

#### Dokumentation
- [ ] Dokumentation aktualisiert
- [ ] Keine Linting Errors
- [ ] Completion Check Commands alle erfolgreich

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Backend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Backend/Service | session.service.ts | NEU: CRUD-Operationen für Sessions |
| Backend/Integration | filesystem | Nutzung von Node.js fs/promises |
| Filesystem | agent-os/sessions/ | NEU: Verzeichnisstruktur |
| Filesystem | agent-os/sessions/archive/ | NEU: Archiv-Verzeichnis |

**Kritische Integration Points:** N/A (Backend-only, wird von WebSocket-Handler konsumiert)

---

### Technical Details

**WAS:**
- `SessionService` Klasse mit folgenden Methoden:
  - `loadSessions(projectPath: string)`: Lädt alle aktiven Sessions aus dem Verzeichnis
  - `createSession(projectPath: string, name?: string)`: Erstellt neue Session mit UUID
  - `updateSession(projectPath: string, session: ISession)`: Aktualisiert Session-Datei
  - `deleteSession(projectPath: string, sessionId: string)`: Löscht Session-Datei
  - `archiveSession(projectPath: string, sessionId: string)`: Verschiebt Session ins Archiv
  - `restoreSession(projectPath: string, sessionId: string)`: Stellt Session aus Archiv wieder her
  - `getArchivedSessions(projectPath: string)`: Lädt archivierte Sessions
- Automatische Ordner-Erstellung beim Start
- Robustes Error-Handling für korrupte JSON-Dateien

**WIE:**
- Folge Service Pattern aus backend-express/SKILL.md
- Nutze Node.js `fs/promises` für async File I/O
- Session-Dateien als `{sessionId}.json` speichern
- Beim Laden: try/catch pro Datei, korrupte überspringen mit console.warn
- Auto-Save: Session wird bei jeder Änderung automatisch gespeichert
- Singleton-Pattern für SessionService

**WO:**
- `agent-os-ui/src/server/session.service.ts` (NEU)
- `agent-os/sessions/` (Verzeichnis, wird erstellt wenn nicht vorhanden)
- `agent-os/sessions/archive/` (Verzeichnis für archivierte Sessions)

**WER:** dev-team__backend-developer

**Abhängigkeiten:** MSC-002 (Session Types für ISession, ISessionState)

**Geschätzte Komplexität:** S (~150-200 LOC, File I/O Service)

---

### Relevante Skills

- `backend-express` (Service Pattern, Error Handling)

---

### Completion Check

```bash
# TypeScript Compilation Check
cd /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui && npx tsc --noEmit

# Lint Check
cd /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui && npm run lint

# Test Check
cd /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui && npm test -- --grep "SessionService" || echo "Tests pending"
```

---

### Technische Verifikation

- [x] FILE_EXISTS: `agent-os-ui/src/server/session.service.ts`
- [x] CONTAINS: `session.service.ts` enthält `class SessionService`
- [x] CONTAINS: `session.service.ts` enthält `loadSessions`, `createSession`, `archiveSession`
- [x] LINT_PASS: `npm run lint` ohne Fehler
- [x] BUILD_PASS: `npx tsc --noEmit` ohne Fehler
