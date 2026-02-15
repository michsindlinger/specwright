# Git Backend Erweiterung (Revert, Delete, PR-Info)

> Story ID: GITE-001
> Spec: Git Integration Erweitert
> Created: 2026-02-11
> Last Updated: 2026-02-11

**Priority**: Critical
**Type**: Backend
**Estimated Effort**: 3 SP
**Dependencies**: None
**Status**: Done

---

## Feature

```gherkin
Feature: Git Backend Erweiterung
  Als Developer
  moechte ich Backend-Endpunkte fuer Revert, Delete und PR-Info haben,
  damit die Git-UI diese Aktionen ausfuehren kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Einzelne Datei reverten

```gherkin
Scenario: Erfolgreicher Revert einer modifizierten Datei
  Given eine Datei "src/app.ts" ist modifiziert (unstaged)
  When das Backend eine Revert-Anfrage fuer "src/app.ts" erhaelt
  Then wird die Datei auf den letzten Commit-Stand zurueckgesetzt
  And die Revert-Response meldet Erfolg mit der Datei in "revertedFiles"
```

### Szenario 2: Staged Datei reverten

```gherkin
Scenario: Revert einer gestaged Datei
  Given eine Datei "src/utils.ts" ist staged (im Index)
  When das Backend eine Revert-Anfrage fuer "src/utils.ts" erhaelt
  Then wird die Datei zuerst aus dem Staging entfernt (unstaged)
  And dann auf den letzten Commit-Stand zurueckgesetzt
  And die Response meldet Erfolg
```

### Szenario 3: Batch-Revert mehrerer Dateien

```gherkin
Scenario: Revert aller geaenderten Dateien auf einmal
  Given 3 Dateien sind modifiziert und 1 Datei ist staged
  When das Backend eine Revert-Anfrage fuer alle 4 Dateien erhaelt
  Then werden alle 4 Dateien auf den letzten Commit-Stand zurueckgesetzt
  And die Response enthaelt alle 4 Dateien in "revertedFiles"
```

### Szenario 4: Untracked Datei loeschen

```gherkin
Scenario: Erfolgreiche Loeschung einer untracked Datei
  Given eine Datei "src/temp.ts" ist untracked (nicht im Git-Index)
  When das Backend eine Delete-Anfrage fuer "src/temp.ts" erhaelt
  Then wird die Datei vom Dateisystem geloescht
  And die Response meldet Erfolg mit dem Dateinamen
```

### Szenario 5: PR-Info abrufen

```gherkin
Scenario: PR-Info fuer aktuellen Branch abrufen
  Given der aktuelle Branch hat einen offenen Pull Request #42
  When das Backend eine PR-Info-Anfrage erhaelt
  Then wird die PR-Info zurueckgegeben mit Nummer 42, Status "OPEN", URL und Titel
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Revert einer Datei mit Konflikten schlaegt fehl
  Given eine Datei "src/conflict.ts" hat Merge-Konflikte
  When das Backend eine Revert-Anfrage fuer "src/conflict.ts" erhaelt
  Then wird die Datei in "failedFiles" mit einer Fehlermeldung zurueckgegeben
  And die anderen Dateien werden trotzdem erfolgreich revertiert

Scenario: Delete einer Datei die nicht untracked ist
  Given eine Datei "src/tracked.ts" ist im Git-Index (tracked)
  When das Backend eine Delete-Anfrage fuer "src/tracked.ts" erhaelt
  Then wird ein Fehler zurueckgegeben "Datei ist nicht untracked"
  And die Datei wird NICHT geloescht

Scenario: PR-Info wenn kein PR existiert
  Given der aktuelle Branch hat keinen Pull Request
  When das Backend eine PR-Info-Anfrage erhaelt
  Then wird null zurueckgegeben (kein PR)

Scenario: PR-Info wenn gh CLI nicht installiert
  Given das gh CLI Tool ist nicht installiert
  When das Backend eine PR-Info-Anfrage erhaelt
  Then wird null zurueckgegeben (graceful degradation)
  And es wird kein Fehler an den Client gesendet
```

---

## Technische Verifikation (Automated Checks)

- [x] FILE_EXISTS: agent-os-ui/src/shared/types/git.protocol.ts
- [x] CONTAINS: git.protocol.ts enthaelt "git:revert"
- [x] CONTAINS: git.protocol.ts enthaelt "git:delete-untracked"
- [x] CONTAINS: git.protocol.ts enthaelt "git:pr-info"
- [x] CONTAINS: git.protocol.ts enthaelt "GitPrInfo"
- [x] CONTAINS: git.protocol.ts enthaelt "GitRevertResult"
- [x] CONTAINS: git.service.ts enthaelt "revertFiles"
- [x] CONTAINS: git.service.ts enthaelt "deleteUntrackedFile"
- [x] CONTAINS: git.service.ts enthaelt "getPrInfo"
- [x] CONTAINS: git.handler.ts enthaelt "handleRevert"
- [x] CONTAINS: git.handler.ts enthaelt "handleDeleteUntracked"
- [x] CONTAINS: git.handler.ts enthaelt "handlePrInfo"
- [x] CONTAINS: websocket.ts enthaelt "git:revert"
- [x] CONTAINS: websocket.ts enthaelt "git:delete-untracked"
- [x] CONTAINS: websocket.ts enthaelt "git:pr-info"
- [x] LINT_PASS: cd agent-os-ui && npx tsc --noEmit exits with code 0

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
- [x] Alle betroffenen Layer identifiziert
- [x] Integration Type bestimmt
- [x] Kritische Integration Points dokumentiert
- [x] Handover-Dokumente definiert

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [x] Code implementiert und folgt Style Guide
- [x] Architektur-Vorgaben eingehalten (WIE section)
- [x] Security/Performance Anforderungen erfuellt

#### Qualitaetssicherung
- [x] Alle Akzeptanzkriterien erfuellt
- [x] Code Review durchgefuehrt
- [x] Keine Linting Errors
- [x] Completion Check Commands alle erfolgreich (exit 0)

#### Dokumentation
- [x] Dokumentation aktualisiert

---

### Betroffene Layer & Komponenten

**Integration Type:** Backend-only (mit Shared Types)

| Layer | Komponenten | Aenderung |
|-------|-------------|----------|
| Shared Types | git.protocol.ts | 6 neue Message-Typen, GitPrInfo, GitRevertResult Interfaces |
| Backend Service | git.service.ts | revertFiles(), deleteUntrackedFile(), getPrInfo() + PR-Cache |
| Backend Handler | git.handler.ts | handleRevert(), handleDeleteUntracked(), handlePrInfo() |
| Backend WebSocket | websocket.ts | 3 neue Case-Branches + Proxy-Methoden |

**Kritische Integration Points:**
- git.handler.ts -> git.service.ts (Methoden-Aufrufe)
- websocket.ts -> git.handler.ts (Message-Routing)
- git.protocol.ts -> Alle Backend-Dateien (Type-Imports)

**Handover-Dokumente:**
- Shared Types: git.protocol.ts definiert den Vertrag fuer Story 2, 3, 4

---

### Technical Details

**WAS:**
- 6 neue WebSocket Message-Typen in git.protocol.ts (revert, delete-untracked, pr-info + jeweilige Responses)
- 2 neue Interfaces: GitPrInfo, GitRevertResult
- 3 neue Service-Methoden in git.service.ts
- 3 neue Handler-Methoden in git.handler.ts
- 3 neue Case-Branches + Proxy-Methoden in websocket.ts
- In-Memory PR-Cache mit 60s TTL

**WIE (Architektur-Guidance):**
- Folge exakt dem bestehenden Pattern aus handleCommit/handlePush etc.
- Revert nutzt `git checkout -- <file>` fuer unstaged, `git reset HEAD -- <file>` + `git checkout -- <file>` fuer staged
- Delete nutzt `fs.unlink` (NICHT `git clean`)
- PR-Info via `execFile('gh', ['pr', 'view', '--json', 'number,state,url,title'])` mit graceful fallback auf null
- PR-Cache als private Map im Service mit TTL-Pruefung
- Alle Operationen verwenden bestehende `execGit` Pattern mit Timeout
- Fehlerbehandlung via bestehendes GitError Pattern

**WO:**
- `agent-os-ui/src/shared/types/git.protocol.ts`
- `agent-os-ui/src/server/services/git.service.ts`
- `agent-os-ui/src/server/handlers/git.handler.ts`
- `agent-os-ui/src/server/websocket.ts`

**WER:** dev-team__backend-developer

**Abhaengigkeiten:** None

**Geschaetzte Komplexitaet:** S

---

### Relevante Skills

| Skill | Pfad | Grund |
|-------|------|-------|
| backend-express | .claude/skills/backend-express/SKILL.md | Express + TypeScript Backend Patterns |

---

### Creates Reusable Artifacts

**Creates Reusable:** yes

| Artefakt | Typ | Pfad | Beschreibung |
|----------|-----|------|--------------|
| GitPrInfo | Type/Interface | src/shared/types/git.protocol.ts | PR-Info Datenstruktur fuer Frontend-Nutzung |
| GitRevertResult | Type/Interface | src/shared/types/git.protocol.ts | Revert-Ergebnis Datenstruktur |
| revertFiles() | Service | src/server/services/git.service.ts | Wiederverwendbare Revert-Methode |
| deleteUntrackedFile() | Service | src/server/services/git.service.ts | Wiederverwendbare Delete-Methode |
| getPrInfo() | Service | src/server/services/git.service.ts | Wiederverwendbare PR-Info-Methode mit Caching |

---

### Completion Check

```bash
# Protocol Types enthalten neue Message-Typen
grep -q "git:revert" agent-os-ui/src/shared/types/git.protocol.ts
grep -q "git:delete-untracked" agent-os-ui/src/shared/types/git.protocol.ts
grep -q "git:pr-info" agent-os-ui/src/shared/types/git.protocol.ts
grep -q "GitPrInfo" agent-os-ui/src/shared/types/git.protocol.ts
# Service-Methoden existieren
grep -q "revertFiles" agent-os-ui/src/server/services/git.service.ts
grep -q "deleteUntrackedFile" agent-os-ui/src/server/services/git.service.ts
grep -q "getPrInfo" agent-os-ui/src/server/services/git.service.ts
# Handler-Methoden existieren
grep -q "handleRevert" agent-os-ui/src/server/handlers/git.handler.ts
grep -q "handleDeleteUntracked" agent-os-ui/src/server/handlers/git.handler.ts
grep -q "handlePrInfo" agent-os-ui/src/server/handlers/git.handler.ts
# WebSocket-Routing existiert
grep -q "git:revert" agent-os-ui/src/server/websocket.ts
# TypeScript kompiliert
cd agent-os-ui && npx tsc --noEmit
```
