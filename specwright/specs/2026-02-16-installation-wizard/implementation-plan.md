# Implementierungsplan: Installation Wizard

> **Status:** APPROVED
> **Spec:** specwright/specs/2026-02-16-installation-wizard/
> **Erstellt:** 2026-02-16
> **Basiert auf:** requirements-clarification.md

---

## Executive Summary

Wenn ein Benutzer ueber den Plus-Button ein neues Projekt hinzufuegt, das KEINEN `specwright/`-Ordner enthaelt, erscheint ein modaler Installations-Wizard. Dieser bietet vier Setup-Commands (plan-product, plan-platform, analyze-product, analyze-platform), erkennt Bestandsprojekte via Dateianzahl, bettet ein Claude Code Terminal fuer die Command-Ausfuehrung ein, und leitet nach Abschluss auf eine `/getting-started`-Route weiter. Die Getting-Started-View zeigt die naechsten Schritte (create-spec, add-todo, add-bug) und bleibt ueber die Sidebar-Navigation erreichbar.

---

## Architektur-Entscheidungen

### 1. Wizard als Modal-Komponente (nicht als eigene View)
Der Wizard ist ein Modal-Overlay (`aos-installation-wizard-modal`), konsistent mit dem bestehenden Modal-Pattern (`aos-project-add-modal`, `aos-create-spec-modal`, `aos-quick-todo-modal`). Alle Modals in der Codebase sind Lit-Komponenten mit Light DOM, `open`-Property und `modal-close`-Events.

### 2. Getting Started als neue Router-View
Die `/getting-started`-Route folgt dem bestehenden Pattern der `ViewType` Union Types in `route.types.ts`. Hinzufuegen von `'getting-started'` zu `ViewType`, `VALID_VIEWS` und den `navItems` + `renderView()`-Switch in `app.ts` ist der Standard-Weg fuer neue Views.

### 3. Backend-Erkennung via bestehende Infrastruktur
Die `specwright/`-Ordner-Erkennung existiert bereits in `resolveProjectDir()` in `project-dirs.ts`. Die zentrale Aenderung: `validateProject()` in `project-context.service.ts` lehnt aktuell Projekte OHNE `specwright/`-Ordner ab. Dies muss geaendert werden zu: akzeptieren, aber Flag `hasSpecwright: boolean` zurueckgeben. Dateianzahl nutzt bestehende Infrastruktur oder eine neue leichtgewichtige Methode.

### 4. Terminal-Einbettung via bestehende Cloud-Terminal-Infrastruktur
Das Terminal im Wizard nutzt die `aos-terminal-session`-Komponente und den `CloudTerminalManager`-Backend-Service. Das Pattern fuer Session-Erstellung und initiale Command-Injection existiert bereits in `handleSetupStartDevteam()` in `websocket.ts`.

### 5. State-Persistenz via sessionStorage
Ob der Wizard abgebrochen wurde (und wieder erscheinen soll), wird pro Projektpfad getrackt. Der natuerliche Ort ist der bestehende `projectStateService`, der bereits sessionStorage fuer Projekt-Tab-State nutzt.

### Patterns & Technologien
- **Pattern:** Modal-Overlay, Multi-Step-Wizard, Event-basierte Kommunikation
- **Technologie:** Lit Web Components, xterm.js (via aos-terminal-session), WebSocket
- **Begruendung:** Alle Technologien bereits im Einsatz, kein neuer Dependency-Overhead

---

## Komponenten-Uebersicht

### Neue Komponenten

| Komponente | Typ | Verantwortlichkeit |
|------------|-----|-------------------|
| `aos-installation-wizard-modal` | Frontend UI (Lit) | Modal mit Command-Auswahl-Cards, Dateianzahl-Hinweis, eingebettetem Terminal, Abbruch-Handling |
| `aos-getting-started-view` | Frontend View (Lit) | `/getting-started`-Route mit Naechste-Schritte-Cards (create-spec, add-todo, add-bug) |
| `wizard.protocol.ts` | Shared Types | TypeScript-Interfaces fuer Wizard-bezogene WebSocket-Messages |

### Zu aendernde Komponenten

| Komponente | Aenderungsart | Grund |
|------------|--------------|-------|
| `project-context.service.ts` (Backend) | Erweitern | Projekte ohne `specwright/` akzeptieren; `hasSpecwright: boolean` Flag zurueckgeben |
| `project.routes.ts` (Backend) | Erweitern | `/validate`-Response um `hasSpecwright` und `fileCount` erweitern |
| `websocket.ts` (Backend) | Erweitern | Terminal-Session-Erstellung fuer Wizard-Commands |
| `route.types.ts` (Frontend) | Erweitern | `'getting-started'` zu `ViewType` und `VALID_VIEWS` hinzufuegen |
| `app.ts` (Frontend) | Erweitern | Wizard-Modal importieren, Getting-Started-View, navItem, renderView-Case, Wizard-Trigger in handleProjectSelected |
| `gateway.ts` (Frontend) | Erweitern | Wizard-spezifische Send-Methoden |
| `project-state.service.ts` (Frontend) | Erweitern | Wizard-State pro Projekt tracken |

### Nicht betroffen (explizit)
- `aos-setup-wizard.ts` -- Dies ist der BESTEHENDE Extended-Setup-Wizard (fuer base/claude-code/devteam Installation). Es ist ein ANDERES Feature. Der neue Installation Wizard ist eine separate Komponente.
- `aos-file-tree-sidebar.ts`, `aos-file-editor-panel.ts` -- Nicht betroffen
- Queue-System, Git-System, Chat-System -- Nicht betroffen

---

## Umsetzungsphasen

### Phase 1: Backend-Erkennung (Story 1)
**Ziel:** Backend kann `specwright/`-Ordner-Existenz erkennen und Dateien zaehlen
**Komponenten:**
- `project-context.service.ts`: Neue Methode `validateProjectForWizard()` die `{ valid, exists, isDirectory, hasSpecwright, fileCount }` zurueckgibt
- `project.routes.ts`: `/validate`-Endpoint gibt erweiterte Response zurueck
- Aktuell lehnt `validateProject()` Projekte ohne `specwright/` ab -- muss aufgespalten werden in Pfad-Validierung und Specwright-Erkennung
**Abhaengig von:** Nichts (Startphase)

### Phase 2: Wizard-Modal-Komponente (Story 2)
**Ziel:** Frontend-Wizard-Modal mit Command-Auswahl-UI
**Komponenten:**
- Neue `aos-installation-wizard-modal.ts` in `ui/frontend/src/components/setup/`
- Vier Command-Cards: plan-product, plan-platform, analyze-product, analyze-platform
- Dateianzahl-Hinweis bei vielen Dateien (Bestandsprojekt)
- Multi-Step-UI: Auswahl-Schritt -> Terminal-Schritt -> Abschluss-Schritt
**Abhaengig von:** Phase 1 (braucht Erkennungsdaten)

### Phase 3: Terminal-Integration im Wizard (Story 3)
**Ziel:** Claude Code Terminal im Wizard-Modal einbetten
**Komponenten:**
- `aos-terminal-session`-Komponente im Wizard-Modal wiederverwenden
- Cloud-Terminal-Session via Gateway erstellen wenn Benutzer Command auswaehlt
- Ausgewaehlten Slash-Command als initialen Input senden (gleiches Pattern wie `handleSetupStartDevteam`)
- Terminal-Session auf Abschluss monitoren
**Abhaengig von:** Phase 2 (braucht Modal-UI)

### Phase 4: Abbruch-Handling (Story 4)
**Ziel:** Abbruch zeigt Meldung, Wizard erscheint beim naechsten Oeffnen wieder
**Komponenten:**
- Cancel-Button im Wizard-Modal bei allen Schritten
- Abbruch-Meldung anzeigen
- "Wizard benoetigt"-State pro Projektpfad in sessionStorage persistieren
- Bei Projekt-Oeffnen pruefen ob Wizard-State existiert -> Wizard erneut anzeigen
**Abhaengig von:** Phase 2

### Phase 5: Getting-Started-View (Story 5)
**Ziel:** Neue `/getting-started`-Route mit Naechste-Schritte-Cards
**Komponenten:**
- Neue `aos-getting-started-view.ts` in `ui/frontend/src/views/`
- Drei Action-Cards: create-spec, add-todo, add-bug
- Jede Card triggert den bestehenden Workflow-Flow
- Responsives Layout, zugaenglich fuer Einsteiger und Erfahrene
**Abhaengig von:** Nichts (kann parallel zu Phase 1-4 gebaut werden)

### Phase 6: Router & Navigation Integration (Story 6)
**Ziel:** Alles zusammenfuehren
**Komponenten:**
- `'getting-started'` zu `ViewType` in `route.types.ts` hinzufuegen
- Zu `VALID_VIEWS` Array hinzufuegen
- Nav-Item in `app.ts` navItems Array hinzufuegen
- `renderView()`-Case hinzufuegen
- Wizard-Modal in `handleProjectSelected()`-Flow einklinken
- Auto-Navigation zu `/getting-started` nach Wizard-Abschluss
**Abhaengig von:** Phase 1-5

---

## Komponenten-Verbindungen (KRITISCH)

### Verbindungs-Matrix

| Source | Target | Verbindungsart | Zustaendige Story | Validierung |
|--------|--------|----------------|-------------------|-------------|
| `app.ts` (handleProjectSelected) | `aos-installation-wizard-modal` | Property Binding (.open, .projectPath, .fileCount, .hasSpecwright) | Story 2 + Story 6 | `grep "aos-installation-wizard-modal" ui/frontend/src/app.ts` |
| `app.ts` | Backend `/api/project/validate` | REST API (erweiterte Response) | Story 1 | Check Response enthaelt hasSpecwright |
| `aos-installation-wizard-modal` | `aos-terminal-session` | Child-Component-Einbettung | Story 3 | `grep "aos-terminal-session" ui/frontend/src/components/setup/aos-installation-wizard-modal.ts` |
| `aos-installation-wizard-modal` | `gateway.ts` | WebSocket cloud-terminal:create | Story 3 | Sendet cloud-terminal:create Message |
| `aos-installation-wizard-modal` | `app.ts` | Custom Events (wizard-complete, wizard-cancel, modal-close) | Story 4 | `grep "wizard-complete" ui/frontend/src/app.ts` |
| `app.ts` (wizard-complete Handler) | `routerService` | `routerService.navigate('getting-started')` | Story 6 | Hash aendert sich zu #/getting-started |
| `app.ts` navItems | `aos-getting-started-view` | Route-Rendering in renderView() | Story 5 + Story 6 | getting-started in navItems + renderView |
| `aos-getting-started-view` | `app.ts` | Custom Event (workflow-start) zum Triggern von Command-Ausfuehrung | Story 5 | `grep "workflow-start" dispatch` |
| Backend `/validate` | `project-context.service.ts` | Method Call: validateProjectForWizard() | Story 1 | Backend Tests |
| Backend `/validate` | `fs.readdir` | Dateianzahl im Projektverzeichnis | Story 1 | Backend Tests |

### Verbindungs-Details

**VERBINDUNG-1: app.ts -> aos-installation-wizard-modal**
- **Art:** Lit Property Binding + Custom Events
- **Schnittstelle:** `.open`, `.projectPath`, `.fileCount`, `.hasSpecwright` Properties; `@wizard-complete`, `@wizard-cancel`, `@modal-close` Events
- **Datenfluss:** App setzt Properties wenn Projekt ohne specwright/ hinzugefuegt wird; Modal emittiert Events bei Abschluss oder Abbruch
- **Story:** Story 2 (Modal-Erstellung), integriert in Story 6 (Router & Navigation)
- **Validierung:** `grep -r "aos-installation-wizard-modal" ui/frontend/src/app.ts`

**VERBINDUNG-2: aos-installation-wizard-modal -> Cloud Terminal**
- **Art:** WebSocket Gateway Message + Child-Component-Einbettung
- **Schnittstelle:** `gateway.send({ type: 'cloud-terminal:create', ... })` dann rendert `<aos-terminal-session>`
- **Datenfluss:** Wizard erstellt Cloud-Terminal-Session mit spezifischem Command, rendert Terminal-Output innerhalb des Modals
- **Story:** Story 3 (Terminal-Integration)
- **Validierung:** `grep -r "cloud-terminal:create" ui/frontend/src/components/setup/aos-installation-wizard-modal.ts`

**VERBINDUNG-3: app.ts -> routerService (Navigation nach Wizard)**
- **Art:** Direkter Method Call
- **Schnittstelle:** `routerService.navigate('getting-started')`
- **Datenfluss:** Bei `wizard-complete`-Event navigiert App zu getting-started
- **Story:** Story 6 (Router & Navigation)
- **Validierung:** `grep "getting-started" ui/frontend/src/app.ts`

**VERBINDUNG-4: Backend Validation erweiterte Response**
- **Art:** REST API Response Erweiterung
- **Schnittstelle:** `POST /api/project/validate` gibt `{ valid: boolean, hasSpecwright: boolean, fileCount: number }` zurueck
- **Datenfluss:** Frontend ruft validate auf, bekommt Specwright-Erkennung + Dateianzahl
- **Story:** Story 1 (Specwright-Erkennung)
- **Validierung:** Backend-Test fuer /api/project/validate Response-Shape

### Verbindungs-Checkliste
- [x] Jede neue Komponente hat mindestens eine Verbindung definiert
- [x] Jede Verbindung ist einer Story zugeordnet
- [x] Validierungsbefehle sind ausfuehrbar

---

## Abhaengigkeiten

### Interne Abhaengigkeiten
```
Phase 1 (Backend-Erkennung)
    |
    v
Phase 2 (Wizard-Modal) <--- Phase 5 (Getting-Started-View) [parallel]
    |
    v
Phase 3 (Terminal-Integration)
    |
    v
Phase 4 (Abbruch-Handling)
    |
    v
Phase 6 (Router & Navigation) <--- Phase 5
```

- `aos-installation-wizard-modal` haengt ab von `aos-terminal-session` (bestehende Komponente)
- `aos-installation-wizard-modal` haengt ab von `gateway.ts` (bestehendes Gateway)
- `aos-getting-started-view` haengt ab von `routerService` (bestehender Service)
- Backend-Erkennung haengt ab von `project-context.service.ts` und `project-dirs.ts` (bestehend)

### Externe Abhaengigkeiten
- Keine. Alle Technologien (Lit, xterm.js, WebSocket) sind bereits im Einsatz.

---

## Risiken & Mitigationen

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|--------|------------|
| Bestehende Projekt-Validierung bricht (Projekte die aktuell funktionieren koennten aufhoeren) | Medium | High | Validierung aufspalten in `validateProjectPath()` (existiert + Directory) und `validateProjectSpecwright()` (hat specwright/). Abwaertskompatiblen `validateProject()` beibehalten der beides aufruft. |
| Terminal-Session im Modal hat Sizing/Rendering-Probleme | Medium | Medium | Gleiches Pattern wie `aos-cloud-terminal-sidebar` mit explizitem Resize-Handling. `aos-terminal-session` handhabt Resize bereits via `refreshTerminal()`. |
| Command-Ausfuehrungs-Erkennung (woher wissen wann plan-product fertig ist) | Medium | Medium | Terminal-Session-Close-Event monitoren ODER auf `specwright/`-Ordner-Erstellung pruefen. Einfachster Ansatz: Benutzer klickt "Fertig"-Button nach Command-Abschluss, oder `specwright/`-Ordner-Erscheinen via Polling erkennen. |
| Race Condition: Benutzer fuegt Projekt hinzu, Wizard startet, sessionStorage-State kollidiert | Low | Medium | Dedizierter sessionStorage-Key pro Projektpfad fuer Wizard-State, getrennt vom Projekt-Tab-State. |
| Dateianzahl-Heuristik unzuverlaessig (leere Git-Repos haben .git-Dateien) | Low | Low | Nur benutzersichtbare Dateien zaehlen (versteckte Dirs wie .git, node_modules ausschliessen). Konfigurierbarer Threshold. Hinweis ist nur beratend -- Benutzer hat immer freie Wahl. |

---

## Self-Review Ergebnisse

### Validiert
- Alle 10 Requirements aus der Clarification sind abgedeckt
- Architektur-Entscheidungen sind konsistent mit bestehenden Patterns (Light DOM Lit-Komponenten, WebSocket Gateway, sessionStorage-Persistenz, Hash-basiertes Routing)
- Der bestehende `aos-setup-wizard.ts` ist ein ANDERES Feature (Extended Setup) -- kein Konflikt
- Modal-Pattern passt zu `aos-project-add-modal`, `aos-create-spec-modal`, `aos-quick-todo-modal`
- Terminal-Einbettung folgt dem Pattern aus `handleSetupStartDevteam()` in websocket.ts

### Identifizierte Probleme & Loesungen

| Problem | Urspruenglicher Plan | Verbesserung |
|---------|---------------------|--------------|
| `validateProject()` lehnt aktuell Projekte ohne specwright/ ab | validateProject direkt modifizieren | Separate `validateProjectForWizard()` erstellen um bestehende Aufrufer nicht zu brechen |
| Getting Started ueber Menu erreichbar -- Sidebar hat nur 4 feste Items | 5. Nav-Item immer sichtbar | Bedingt anzeigen (nur wenn Projekt specwright/ hat) ODER immer sichtbar unter einem Divider |
| Dateianzahl koennte bei grossen Repos langsam sein | Vollstaendiger rekursiver Count | Nur Top-Level-Eintraege zaehlen (versteckte Directories ausschliessen). `fs.readdir()` mit Limit/Early-Exit bei Threshold |

### Offene Fragen
- Keine -- alle Requirements sind klar aus dem Requirements-Clarification-Dokument.

---

## Minimalinvasiv-Optimierungen

### Wiederverwendbare Elemente gefunden

| Element | Gefunden in | Nutzbar fuer |
|---------|-------------|-------------|
| Modal-Overlay-Pattern (Overlay-Click, ESC-Key, Focus-Trap) | `aos-project-add-modal.ts` | `aos-installation-wizard-modal` |
| Terminal-Session-Erstellung + Command-Injection | `websocket.ts` handleSetupStartDevteam | Wizard Terminal-Integration |
| Cloud Terminal Component Embedding | `aos-cloud-terminal-sidebar.ts` + `aos-terminal-session.ts` | Wizard Modal Terminal |
| Route Types + navItems Pattern | `route.types.ts` + `app.ts` navItems | Getting-Started-Route |
| `resolveProjectDir()` / `resolveCommandDir()` | `project-dirs.ts` | Specwright-Erkennung |
| Workflow Command Card UI | `workflow-card.ts` | Getting-Started Action-Cards |

### Optimierungen

| Urspruenglich | Optimiert zu | Ersparnis |
|---------------|-------------|-----------|
| Eigene Terminal-Komponente fuer Wizard | Bestehende `aos-terminal-session` direkt wiederverwenden | ~300 Zeilen Terminal-Management-Code vermieden |
| Eigenes WebSocket-Protokoll fuer Wizard-Erkennung | Bestehenden `/api/project/validate` REST-Endpoint erweitern | Ein WebSocket-Message-Typ weniger; einfachere Architektur |
| Neuer Wizard-State-Management-Service | Bestehenden `projectStateService` um Wizard-State erweitern | Keine neue Service-Datei noetig |
| Eigene Command-Cards von Grund auf | Layout von bestehendem `workflow-card.ts` adaptieren | Konsistente UI; weniger Design-Arbeit |

### Feature-Preservation bestaetigt
- [x] Alle Requirements aus Clarification sind abgedeckt (alle 10 gelisteten Requirements auf Phasen/Stories gemappt)
- [x] Kein Feature wurde geopfert
- [x] Alle Akzeptanzkriterien bleiben erfuellbar

---

## Naechste Schritte

Nach Genehmigung dieses Plans:
1. Step 2.6: User Stories aus diesem Plan ableiten
2. Step 3: Architect fuegt technische Details hinzu
3. Step 4: Spec ready for execution
