# Git Backend API

> Story ID: GIT-001
> Spec: Git Integration UI
> Created: 2026-02-11
> Last Updated: 2026-02-11

**Priority**: Critical
**Type**: Backend
**Estimated Effort**: 3 SP
**Dependencies**: None

---

## Feature

```gherkin
Feature: Git Backend API
  Als Entwickler
  moechte ich Git-Operationen ueber die Web UI ausfuehren koennen,
  damit ich nicht zwischen Terminal und UI wechseln muss.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Git-Status abfragen

```gherkin
Scenario: Git-Status eines Projekts abfragen
  Given ein Projekt mit Git-Repository ist geoeffnet
  When die UI den Git-Status anfragt
  Then erhalte ich den aktuellen Branch-Namen "feature/login"
  And die Ahead/Behind-Zaehler "2 ahead, 1 behind"
  And die Anzahl geaenderter Dateien "5 changed"
```

### Szenario 2: Lokale Branches auflisten

```gherkin
Scenario: Alle lokalen Branches auflisten
  Given ein Projekt mit Git-Repository ist geoeffnet
  And es existieren die Branches "main", "develop", "feature/login"
  When die UI die Branch-Liste anfragt
  Then erhalte ich alle 3 lokalen Branches
  And der aktuelle Branch "feature/login" ist markiert
```

### Szenario 3: Commit ausfuehren

```gherkin
Scenario: Ausgewaehlte Dateien committen
  Given es gibt 5 geaenderte Dateien im Projekt
  And ich habe die Dateien "src/app.ts" und "src/utils.ts" ausgewaehlt
  And ich habe die Commit-Message "fix: update routing logic" eingegeben
  When ich den Commit ausfuehre
  Then werden nur die 2 ausgewaehlten Dateien committet
  And die Commit-Message wird korrekt gesetzt
```

### Szenario 4: Pull ausfuehren

```gherkin
Scenario: Git Pull ausfuehren
  Given ein Projekt mit Git-Repository ist geoeffnet
  And es gibt 3 neue Commits auf dem Remote
  When ich einen Pull ausfuehre
  Then werden die 3 Commits heruntergeladen
  And der aktuelle Status wird aktualisiert
```

### Szenario 5: Push ausfuehren

```gherkin
Scenario: Git Push ausfuehren
  Given ein Projekt mit Git-Repository ist geoeffnet
  And ich habe 2 lokale Commits die noch nicht gepusht sind
  When ich einen Push ausfuehre
  Then werden die 2 Commits zum Remote gesendet
  And die Ahead-Anzeige zeigt "0 ahead"
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Kein Git-Repository vorhanden
  Given ein Projekt ohne .git-Ordner ist geoeffnet
  When die UI den Git-Status anfragt
  Then erhalte ich die Information "kein Git-Repository"
```

```gherkin
Scenario: Git ist nicht installiert
  Given Git CLI ist nicht auf dem System verfuegbar
  When die UI den Git-Status anfragt
  Then erhalte ich eine Fehlermeldung "Git nicht gefunden"
```

```gherkin
Scenario: Merge-Konflikt bei Pull
  Given es gibt Merge-Konflikte beim Pull
  When ich einen Pull ausfuehre
  Then erhalte ich eine Fehlermeldung mit Hinweis auf Merge-Konflikte
  And der Hinweis sagt "Konflikte muessen ausserhalb der Anwendung geloest werden"
```

---

## Technische Verifikation (Automated Checks)

- [ ] **FILE_EXISTS:** `agent-os-ui/src/shared/types/git.protocol.ts`
- [ ] **FILE_EXISTS:** `agent-os-ui/src/server/services/git.service.ts`
- [ ] **FILE_EXISTS:** `agent-os-ui/src/server/handlers/git.handler.ts`
- [ ] **CONTAINS:** `agent-os-ui/src/server/websocket.ts` enthaelt `git.handler`
- [ ] **CONTAINS:** `agent-os-ui/src/shared/types/git.protocol.ts` enthaelt `git:status`
- [ ] **CONTAINS:** `agent-os-ui/src/shared/types/git.protocol.ts` enthaelt `git:branches`
- [ ] **CONTAINS:** `agent-os-ui/src/shared/types/git.protocol.ts` enthaelt `git:commit`
- [ ] **CONTAINS:** `agent-os-ui/src/shared/types/git.protocol.ts` enthaelt `git:pull`
- [ ] **CONTAINS:** `agent-os-ui/src/shared/types/git.protocol.ts` enthaelt `git:push`
- [ ] **CONTAINS:** `agent-os-ui/src/shared/types/git.protocol.ts` enthaelt `git:checkout`
- [ ] **CONTAINS:** `agent-os-ui/src/server/services/git.service.ts` enthaelt `execFile`
- [ ] **CONTAINS:** `agent-os-ui/src/server/handlers/git.handler.ts` enthaelt `GitService`
- [ ] **BUILD_PASS:** `cd agent-os-ui && npm run build`

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

#### Full-Stack Konsistenz (NEU)
- [x] Alle betroffenen Layer identifiziert
- [x] Integration Type bestimmt
- [x] Kritische Integration Points dokumentiert (wenn Full-stack)
- [x] Handover-Dokumente definiert (bei Multi-Layer)

---

### DoD (Definition of Done) - Vom Architect

- [ ] Code implemented and follows Style Guide
- [ ] Architecture requirements met (Service Layer Pattern, Handler Extraction Pattern)
- [ ] All acceptance criteria met (git status, branches, commit, pull, push, checkout via WebSocket)
- [ ] No linting errors (`cd agent-os-ui && npm run lint`)
- [ ] Shared protocol types are importable from both server and client code
- [ ] GitService uses `execFile` (not `exec`) for security
- [ ] All git operations return structured typed responses
- [ ] Error handling covers: no git repo, git not installed, merge conflicts, network errors
- [ ] Completion Check commands successful

---

### Betroffene Layer & Komponenten

- **Integration Type:** Backend-only (Shared Types + Service Layer + Integration Layer)

| Layer | Komponenten | Aenderung |
|-------|-------------|-----------|
| Shared Types | `git.protocol.ts` | **NEU** - Alle Git WebSocket Message Types und Response Interfaces |
| Service Layer | `git.service.ts` | **NEU** - GitService Klasse mit allen 6 Git-Operationen |
| Service Layer | `git.handler.ts` | **NEU** - Extrahierter WebSocket Handler fuer git.* Messages |
| Integration Layer | `websocket.ts` | **ERWEITERN** - Neue case-Eintraege fuer git.* Message Routing |

---

### Technical Details

- **WAS:**
  - Neue Datei `git.protocol.ts` mit allen Git Message Types (status, branches, commit, pull, push, checkout) und Response Interfaces
  - Neue Klasse `GitService` mit Methoden: `getStatus()`, `getBranches()`, `checkout()`, `commit()`, `pull()`, `push()`
  - Neue Klasse `GitHandler` als extrahiertes Handler-Modul fuer Git WebSocket Messages
  - Erweiterung von `websocket.ts` um git.* Message Routing zum GitHandler

- **WIE:**
  - **Protocol Pattern:** Exakt wie `cloud-terminal.protocol.ts` - Message Types als String Literal Union, separate Interfaces pro Message, Client/Server Union Types
  - **Service Pattern:** Wie `CloudTerminalManager` - Klasse mit Methoden die `child_process.execFile` nutzen, strukturierte Rueckgabewerte, Fehlerbehandlung
  - **Handler Pattern:** Wie `QueueHandler` in `queue.handler.ts` - Klasse mit public handle-Methoden pro Message Type, nimmt WebSocket client und message entgegen
  - **WebSocket Routing:** Neue `case`-Eintraege im Message-Switch von `websocket.ts` die an `GitHandler` delegieren
  - **Sicherheit:** Ausschliesslich `execFile` (NICHT `exec`) fuer alle Git-Befehle - verhindert Shell-Injection
  - **Timeout:** 10 Sekunden Timeout fuer alle Git-Operationen

- **WO:**
  - `agent-os-ui/src/shared/types/git.protocol.ts` (NEU)
  - `agent-os-ui/src/server/services/git.service.ts` (NEU)
  - `agent-os-ui/src/server/handlers/git.handler.ts` (NEU)
  - `agent-os-ui/src/server/websocket.ts` (ERWEITERN)

- **WER:** dev-team__backend-developer

- **Abhaengigkeiten:** None

- **Geschaetzte Komplexitaet:** M

### Relevante Skills

| Skill | Pfad | Grund |
|-------|------|-------|
| WebSocket Message Protocol | Referenz: `src/shared/types/cloud-terminal.protocol.ts` | Pattern fuer Protocol Type Definition |
| Service Layer Pattern | Referenz: `src/server/services/` | Pattern fuer GitService Implementierung |
| Handler Extraction Pattern | Referenz: `src/server/handlers/queue.handler.ts` | Pattern fuer git.handler.ts Extraktion |

---

### Creates Reusable Artifacts

**Ja**

| Artifact | Typ | Wiederverwendbar fuer |
|----------|-----|----------------------|
| `git.protocol.ts` | Shared Types | Frontend (Gateway, Components) und Backend (Handler, Service) |
| `GitService` | Backend Service | Alle zukuenftigen Git-Operationen im Backend |
| `GitHandler` | Backend Handler | WebSocket Message Routing fuer Git |

---

### Completion Check

```bash
# Verify all new files exist
test -f agent-os-ui/src/shared/types/git.protocol.ts && echo "PASS: git.protocol.ts exists" || echo "FAIL"
test -f agent-os-ui/src/server/services/git.service.ts && echo "PASS: git.service.ts exists" || echo "FAIL"
test -f agent-os-ui/src/server/handlers/git.handler.ts && echo "PASS: git.handler.ts exists" || echo "FAIL"

# Verify protocol types contain all message types
grep -q "git:status" agent-os-ui/src/shared/types/git.protocol.ts && echo "PASS: git:status type" || echo "FAIL"
grep -q "git:branches" agent-os-ui/src/shared/types/git.protocol.ts && echo "PASS: git:branches type" || echo "FAIL"
grep -q "git:commit" agent-os-ui/src/shared/types/git.protocol.ts && echo "PASS: git:commit type" || echo "FAIL"
grep -q "git:pull" agent-os-ui/src/shared/types/git.protocol.ts && echo "PASS: git:pull type" || echo "FAIL"
grep -q "git:push" agent-os-ui/src/shared/types/git.protocol.ts && echo "PASS: git:push type" || echo "FAIL"
grep -q "git:checkout" agent-os-ui/src/shared/types/git.protocol.ts && echo "PASS: git:checkout type" || echo "FAIL"

# Verify GitService uses execFile (security)
grep -q "execFile" agent-os-ui/src/server/services/git.service.ts && echo "PASS: uses execFile" || echo "FAIL"

# Verify handler imports GitService
grep -q "GitService" agent-os-ui/src/server/handlers/git.handler.ts && echo "PASS: handler uses GitService" || echo "FAIL"

# Verify websocket.ts routes to git handler
grep -q "git.handler" agent-os-ui/src/server/websocket.ts && echo "PASS: websocket routes git" || echo "FAIL"

# Build check
cd agent-os-ui && npm run build && echo "PASS: build successful" || echo "FAIL: build failed"
```
