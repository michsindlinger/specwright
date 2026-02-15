# Implementierungsplan: Git Integration UI

> **Status:** APPROVED
> **Spec:** agent-os/specs/2026-02-11-git-integration-ui
> **Erstellt:** 2026-02-11
> **Basiert auf:** requirements-clarification.md

---

## Executive Summary

Es wird eine Git-Informationsleiste direkt unterhalb der Projekt-Tabs erstellt, die Entwicklern den aktuellen Branch, Ahead/Behind-Status und geaenderte Dateien anzeigt, sowie Buttons fuer Pull, Push, Commit und Refresh bereitstellt. Zusaetzlich werden ein Branch-Wechsel-Dropdown, ein Commit-Dialog (Modal mit Dateiauswahl und Message-Feld) und die noetige Backend-API implementiert, um Git-Operationen (status, branches, commit, pull, push, checkout) ueber WebSocket-Nachrichten auszufuehren.

---

## Architektur-Entscheidungen

### Gewaehlter Ansatz

**WebSocket-basierte Git-Operations-API** mit einer neuen Backend-Service-Klasse (`GitService`), einem neuen Shared Protocol Type (`git.protocol.ts`), Frontend-Gateway-Methoden und Lit Web Components in Light DOM. Das exakte Pattern der Cloud Terminal Implementation wird repliziert: Shared Protocol Types -> Backend Service -> WebSocket Handler Routing -> Gateway Methods -> Lit Components.

### Begruendung

1. **Konsistenz:** Das Projekt nutzt bereits konsequent das WebSocket-Message-Pattern (DEC-003) fuer alle Client-Server-Kommunikation. REST-Endpoints wuerden ein zweites Kommunikationsmuster einfuehren.
2. **Einfachheit:** Git-Operationen sind fire-and-respond (kein Streaming noetig), aber die vorhandene WebSocket-Infrastruktur (Gateway, message routing, project context) kann direkt wiederverwendet werden.
3. **Referenz-Pattern:** Die Cloud Terminal Implementation (Protocol Types + Backend Service + WebSocket Handler + Gateway + Components) ist ein bewaehrtes 1:1 Pattern, das hier repliziert wird.
4. **Kein Polling:** Manueller Refresh passt perfekt zum Request-Response-Muster ueber WebSocket.

### Patterns und Technologien

- **Pattern:** Service Layer Pattern (wie `CloudTerminalManager`), WebSocket Message Protocol (wie `cloud-terminal.protocol.ts`)
- **Technologie:** Node.js `child_process.execFile` fuer Git-Befehle (kein externes git-Paket noetig -- Git CLI ist auf dem System vorhanden), Lit Web Components, CSS Custom Properties
- **Begruendung:** `execFile` ist sicherer als `exec` (kein Shell-Injection-Risiko) und reicht fuer synchrone Git-Befehle voellig aus. Das Projekt nutzt bereits `child_process` in `workflow-executor.ts`.

### Alternativen verworfen

- **REST API Endpoints:** Wuerde ein zweites Kommunikationsmuster einfuehren; inkonsistent mit dem Projekt-Standard.
- **simple-git / isomorphic-git npm Pakete:** Unnoetige Abhaengigkeit. Die benoetigten Git-Befehle sind einfach genug fuer direkte CLI-Aufrufe. Haelt die Abhaengigkeiten minimal.
- **Automatisches Polling:** Explizit als Out-of-Scope definiert in den Requirements. Manueller Refresh spart Ressourcen.

---

## Komponenten-Uebersicht

### Neue Komponenten

| Komponente | Typ | Verantwortlichkeit |
|------------|-----|-------------------|
| `git.protocol.ts` | Shared Types | Definiert alle Git WebSocket Message Types und Interfaces (Status, Branches, Commit, Pull, Push, Error) |
| `GitService` | Backend Service | Fuehrt Git CLI-Befehle aus (status, branch, checkout, commit, add, pull, push), validiert Eingaben, gibt strukturierte Ergebnisse zurueck |
| `git.handler.ts` | Backend Handler | Extrahiertes Handler-Modul fuer Git WebSocket Messages (wie queue.handler.ts) |
| `aos-git-status-bar` | UI Component | Zeigt Branch-Name, Ahead/Behind, Changed Files Count und Action Buttons (Pull, Push, Commit, Refresh) an |
| `aos-git-commit-dialog` | UI Component (Modal) | Dateiliste mit Checkboxen, Commit-Message-Feld, Commit/Abbrechen Buttons |
| Gateway Git Methods | Frontend Gateway Extension | `requestGitStatus()`, `requestGitBranches()`, `sendGitCheckout()`, `sendGitCommit()`, `sendGitPull()`, `sendGitPush()` |

### Zu aendernde Komponenten

| Komponente | Aenderungsart | Grund |
|------------|--------------|-------|
| `app.ts` (aos-app) | Erweitern | Git-Status-Bar zwischen Project-Tabs und View-Container einfuegen; State fuer git-Daten halten; Event-Handler fuer git-Aktionen registrieren |
| `gateway.ts` | Erweitern | Neue Gateway-Methoden fuer Git-Operationen hinzufuegen |
| `websocket.ts` (WebSocketHandler) | Erweitern | Neue `case`-Eintraege im Message-Switch fuer `git.*` Messages hinzufuegen; git.handler importieren |
| `theme.css` | Erweitern | CSS-Klassen fuer `.git-status-bar`, `.git-commit-dialog` und zugehoerige Elemente |

### Nicht betroffen (explizit)

- `aos-project-tabs.ts` -- Bleibt unveraendert. Die Status-Leiste wird als separates Element NACH den Tabs eingefuegt.
- `workflow-executor.ts` -- Keine Aenderungen. Git-Operationen sind voellig unabhaengig.
- `cloud-terminal-manager.ts` -- Keine Aenderungen. Dient nur als Architektur-Referenz.

---

## Komponenten-Verbindungen (KRITISCH)

### Verbindungs-Matrix

| Source | Target | Verbindungsart | Zustaendige Story | Validierung |
|--------|--------|----------------|------------------|-------------|
| `git.protocol.ts` | `GitService` | TypeScript Import (Typen) | Story 1 (Backend API) | `grep -r "git.protocol" src/server` |
| `git.protocol.ts` | `gateway.ts` | TypeScript Import (Message Types) | Story 2 (Frontend Status-Leiste) | `grep -r "git.protocol" ui/src` |
| `GitService` | `git.handler.ts` | Instanziierung + Methodenaufrufe | Story 1 (Backend API) | `grep -r "GitService" src/server/handlers/git.handler.ts` |
| `git.handler.ts` | `websocket.ts` | Import + Handler-Registration | Story 1 (Backend API) | `grep "git.handler" src/server/websocket.ts` |
| `gateway.ts` | `aos-git-status-bar` | Gateway Methods -> Component Handlers | Story 2 (Frontend Status-Leiste) | `grep "gateway" ui/src/components/git/` |
| `app.ts` | `aos-git-status-bar` | HTML Template + Property Binding + Event Handlers | Story 2 (Frontend Status-Leiste) | `grep "aos-git-status-bar" ui/src/app.ts` |
| `aos-git-status-bar` | `aos-git-commit-dialog` | Event (open-commit-dialog) -> app.ts -> Property | Story 4 (Commit Dialog) | `grep "commit-dialog" ui/src/components/git/` |
| `app.ts` | `aos-git-commit-dialog` | HTML Template + Property Binding + Events | Story 4 (Commit Dialog) | `grep "aos-git-commit-dialog" ui/src/app.ts` |
| `aos-git-commit-dialog` | `gateway.ts` | Gateway sendGitCommit() | Story 4 (Commit Dialog) | `grep "sendGitCommit" ui/src` |
| `aos-git-status-bar` | `gateway.ts` | Gateway sendGitPull/Push/requestGitBranches/sendGitCheckout | Story 3 + Story 5 | `grep "sendGit" ui/src/components/git/` |

### Verbindungs-Checkliste
- [x] Jede neue Komponente hat mindestens eine Verbindung definiert
- [x] Jede Verbindung ist einer Story zugeordnet
- [x] Validierungsbefehle sind ausfuehrbar
- [x] Keine "verwaisten" Komponenten

---

## Umsetzungsphasen

### Phase 1: Foundation (Backend + Protocol)
**Ziel:** Git-Operationen sind ueber WebSocket aufrufbar und geben korrekte Ergebnisse zurueck.
**Komponenten:** `git.protocol.ts`, `GitService`, `git.handler.ts`, WebSocket Handler Erweiterung
**Abhaengig von:** Nichts (Startphase)
**Details:** Definiert das vollstaendige Git Protocol (Message Types, Response Interfaces), implementiert den GitService mit allen 6 Git-Operationen (status, branches, checkout, commit, pull, push) und verdrahtet die WebSocket-Nachrichtenweiterleitung.

### Phase 2: Status-Leiste (Frontend Core)
**Ziel:** Die Git-Status-Leiste ist sichtbar, zeigt korrekte Daten an, und Refresh funktioniert.
**Komponenten:** `aos-git-status-bar`, Gateway Git Methods, `app.ts` Erweiterung, `theme.css`
**Abhaengig von:** Phase 1
**Details:** Die zentrale UI-Komponente, die alle Git-Informationen anzeigt. Inkludiert Branch-Name, Ahead/Behind-Zaehler, Changed Files Count, und die Action Buttons. Reagiert auf Projektwechsel. Zeigt "Kein Git Repository" wenn noetig.

### Phase 3: Branch-Wechsel
**Ziel:** Nutzer koennen Branches ueber Dropdown wechseln mit Uncommitted-Changes-Schutz.
**Komponenten:** Branch-Dropdown in `aos-git-status-bar`, Gateway `sendGitCheckout`
**Abhaengig von:** Phase 2
**Details:** Erweitert die Status-Leiste um ein Dropdown mit lokalen Branches. Prueft vor dem Wechsel auf uncommitted changes und zeigt Warnung (Wiederverwendung von `aos-confirm-dialog`).

### Phase 4: Commit-Dialog
**Ziel:** Nutzer koennen Dateien auswaehlen, eine Commit-Message schreiben und committen.
**Komponenten:** `aos-git-commit-dialog`, `app.ts` Erweiterung, Gateway `sendGitCommit`
**Abhaengig von:** Phase 2
**Details:** Modal-Dialog mit scrollbarer Dateiliste (Checkboxen), Status-Badges (modified, added, deleted, untracked), Commit-Message-Textarea. Button-Deaktivierung bei leerer Message oder keiner Datei-Auswahl.

### Phase 5: Pull, Push und Fehlerbehandlung
**Ziel:** Pull (normal + rebase), Push funktionieren mit vollstaendigem Error-Handling.
**Komponenten:** Pull/Push-Logik in `aos-git-status-bar`, Gateway `sendGitPull`/`sendGitPush`
**Abhaengig von:** Phase 2
**Details:** Pull-Button mit Rebase-Option (Dropdown am Button), Push-Button (kein Force). Fehlerbehandlung fuer: Merge-Konflikte, kein Remote, Netzwerkfehler, laufende Operation. Integration mit Toast-Notifications.

---

## Abhaengigkeiten

### Interne Abhaengigkeiten

```
Phase 1 (Backend) ──> Phase 2 (Status-Leiste)
Phase 2 ──> Phase 3 (Branch-Wechsel)
Phase 2 ──> Phase 4 (Commit-Dialog)
Phase 2 ──> Phase 5 (Pull/Push)
```

Phase 3, 4, 5 koennen parallel nach Phase 2 umgesetzt werden.

### Externe Abhaengigkeiten

- **Git CLI:** Muss auf dem Host-System installiert sein (berechtigte Annahme).
- **Keine neuen npm-Pakete:** Alle benoetigten Funktionalitaeten sind bereits vorhanden.

---

## Risiken und Mitigationen

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|--------|------------|
| Git-Befehle blockieren bei grossen Repos | Medium | Medium | Timeout fuer alle Git-Operationen (10s); async Ausfuehrung; UI zeigt Loading-State |
| Merge-Konflikte bei Pull | High | Medium | Klare Fehlermeldung mit Hinweis auf externe Loesung |
| Concurrent Git-Operationen (mehrfach klicken) | Medium | Low | Operation-Lock: Buttons disabled waehrend laufender Operation |
| Kein Git auf dem System | Low | High | Git-Verfuegbarkeit beim Start pruefen |
| Shell-Injection ueber Branch-Namen/Messages | Low | High | `execFile` statt `exec` (keine Shell-Interpretation) |
| websocket.ts wird zu gross | Medium | Low | Git-Handler als separates Modul extrahieren (wie queue.handler.ts) |

---

## Self-Review Ergebnisse

### Validiert

- Alle 6 Functional Requirements (FR-1 bis FR-6) sind durch die Phasen 1-5 abgedeckt
- Alle Edge Cases und Error Scenarios sind adressiert
- Architektur folgt bestehenden Patterns (DEC-001 Layered Architecture, DEC-003 WebSocket Communication)
- Jede neue Komponente hat mindestens eine Verbindung in der Verbindungs-Matrix
- Jede Verbindung ist einer Story/Phase zugeordnet
- Keine "verwaisten" Komponenten identifiziert

### Identifizierte Probleme und Loesungen

| Problem | Urspruenglicher Plan | Verbesserung |
|---------|---------------------|--------------|
| websocket.ts ist bereits gross | Alle git.* Handler direkt in websocket.ts | Git-Handler als separates Modul `handlers/git.handler.ts` extrahieren |
| Pull-Rebase Option braucht eigenes UI-Element | Separater Rebase-Button | Dropdown-Menue am Pull-Button (Klick = normal pull, Pfeil = rebase) |
| Branch-Wechsel Warnung bei Uncommitted Changes | Neuer Dialog erstellen | Bestehendes `aos-confirm-dialog` wiederverwenden |

---

## Minimalinvasiv-Optimierungen

### Wiederverwendbare Elemente

| Element | Gefunden in | Nutzbar fuer |
|---------|-------------|-------------|
| `aos-confirm-dialog` | `ui/src/components/aos-confirm-dialog.ts` | Branch-Wechsel Warnung |
| Light DOM Pattern | Alle `aos-*` Components | Alle neuen Git-Components |
| Gateway Singleton Pattern | `ui/src/gateway.ts` | Git-Methoden als Gateway-Erweiterung |
| WebSocket Message Routing | `src/server/websocket.ts` | Neue git.* Cases |
| Handler Extraction Pattern | `src/server/handlers/queue.handler.ts` | Git-Handler als separates Modul |
| `getClientProjectPath()` | `src/server/websocket.ts` | Projekt-Pfad fuer Git-Operationen |
| Cloud Terminal Protocol Pattern | `src/shared/types/cloud-terminal.protocol.ts` | Vorlage fuer `git.protocol.ts` |
| `child_process` | `src/server/workflow-executor.ts` | Bestaetigt: bereits genutzt |
| Toast Notification | `ui/src/components/toast-notification.ts` | Error/Success Feedback |
| CSS Custom Properties | `ui/src/styles/theme.css` | Konsistentes Styling |

### Optimierungen

| Urspruenglich | Optimiert zu | Ersparnis |
|--------------|-------------|-----------|
| Neuen Warndialog erstellen | `aos-confirm-dialog` wiederverwenden | ~100 Zeilen Code |
| Alle Handler in websocket.ts | Separates `handlers/git.handler.ts` | Bessere Wartbarkeit |
| Separater Frontend-Service | State in `app.ts` halten | Kein neuer Service noetig |
| Externes Git-Paket | Direkte `execFile` Aufrufe | Keine neue Abhaengigkeit |
| REST API Endpoints | WebSocket-basiert | Nutzt bestehende Infrastruktur |

### Feature-Preservation Checkliste
- [x] Alle Requirements aus Clarification sind abgedeckt (FR-1 bis FR-6)
- [x] Kein Feature wurde geopfert
- [x] Alle Akzeptanzkriterien bleiben erfuellbar

---

*Erstellt mit Agent OS /create-spec v3.4 - Plan Agent mit Self-Review und Minimalinvasiv-Analyse*
