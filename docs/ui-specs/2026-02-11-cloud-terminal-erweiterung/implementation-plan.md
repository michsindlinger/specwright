# Implementierungsplan: Cloud Terminal Erweiterung

> **Status:** APPROVED
> **Spec:** agent-os/specs/2026-02-11-cloud-terminal-erweiterung/
> **Erstellt:** 2026-02-11
> **Basiert auf:** requirements-clarification.md

---

## Executive Summary

Die Cloud Terminal Sidebar wird erweitert, um neben Claude Code Sessions auch reguläre Shell-Terminals im Projektpfad zu öffnen. Beim Starten einer neuen Session wählt der User zwischen einem normalen Terminal (sofort, ohne LLM) und einer Cloud Code Session (mit Provider/Model-Auswahl), wodurch die Sidebar zu einem vollständigen Terminal-Hub wird und Context-Switching zwischen Web UI und externem Terminal eliminiert.

---

## Architektur-Entscheidungen

### Gewählter Ansatz

**Erweiterung des bestehenden Session-Modells um einen Terminal-Typ-Discriminator.** Alle bestehenden Komponenten (Sidebar, Tabs, Session, Backend-Manager) werden minimalinvasiv erweitert, anstatt parallele Komponenten zu erstellen. Ein neues Feld `terminalType: 'shell' | 'claude-code'` durchzieht das gesamte System vom Shared Protocol bis zum Frontend-State.

### Begründung

1. **Minimalinvasivität:** Die bestehende Architektur (CloudTerminalManager, CloudTerminalService, Sidebar-Komponenten) ist bereits für Multi-Session-Management ausgelegt. Ein zusätzlicher Typ-Discriminator lässt sich nahtlos einfügen.
2. **Wiederverwendung:** Das Tab-System, die Session-Lifecycle-Logik, Buffer-Management und WebSocket-Kommunikation können 1:1 wiederverwendet werden. Nur die Session-Erstellung und die Dropdown-Komponente benötigen substantielle Änderungen.
3. **Keine neue Infrastruktur:** Der bestehende `TerminalManager` kann bereits beliebige Shell-Prozesse spawnen (über den `shell` und `args` Parameter in `SpawnPtyOptions`). Für ein Plain-Shell-Terminal muss lediglich die System-Default-Shell ohne Claude-Code-spezifische Argumente gestartet werden.

### Patterns & Technologien

- **Pattern:** Discriminated Union (TypeScript) -- `terminalType` als Diskriminator über das gesamte Protokoll
- **Pattern:** Strategy Pattern im CloudTerminalManager -- unterschiedliche Spawn-Konfiguration je nach Terminal-Typ
- **Pattern:** Grouped Dropdown -- bestehende `aos-model-dropdown` wird erweitert um eine "Terminal"-Gruppe mit Separator
- **Technologie:** Bestehender Stack (Lit, node-pty, WebSocket) -- keine neuen Abhängigkeiten

---

## Komponenten-Übersicht

### Neue Komponenten

Keine vollständig neuen Komponenten erforderlich. Alle Anforderungen lassen sich durch Erweiterung bestehender Komponenten umsetzen.

### Zu ändernde Komponenten

| Komponente | Pfad | Änderungsart | Grund |
|------------|------|--------------|-------|
| CloudTerminalProtocol | `agent-os-ui/src/shared/types/cloud-terminal.protocol.ts` | Erweitern | Neuer `terminalType`-Diskriminator in Session und Messages |
| CloudTerminalManager | `agent-os-ui/src/server/services/cloud-terminal-manager.ts` | Erweitern | `createSession()` muss Plain-Shell ohne Claude-Code spawnen können |
| WebSocket Handler | `agent-os-ui/src/server/websocket.ts` | Erweitern | `handleCloudTerminalCreate()` muss optionales `modelConfig` handhaben |
| aos-model-dropdown | `agent-os-ui/ui/src/components/terminal/aos-model-dropdown.ts` | Erweitern | "Terminal"-Gruppe als erste Option, Separator, sofort-Selektion |
| aos-terminal-session | `agent-os-ui/ui/src/components/terminal/aos-terminal-session.ts` | Erweitern | Soll bei `terminalType: 'shell'` den Model-Selector überspringen |
| aos-cloud-terminal-sidebar | `agent-os-ui/ui/src/components/terminal/aos-cloud-terminal-sidebar.ts` | Minimal | TerminalSession-Interface bekommt `terminalType`-Feld |
| aos-terminal-tabs | `agent-os-ui/ui/src/components/terminal/aos-terminal-tabs.ts` | Minimal | Tab-Name-Darstellung |
| CloudTerminalService | `agent-os-ui/ui/src/services/cloud-terminal.service.ts` | Erweitern | `PersistedTerminalSession` bekommt `terminalType`-Feld |
| app.ts | `agent-os-ui/ui/src/app.ts` | Erweitern | `_handleNewTerminalSession()` muss Terminal-Typ durchreichen |

### Nicht betroffen (explizit)

- `TerminalManager` (`agent-os-ui/src/server/services/terminal-manager.ts`) -- Kann bereits beliebige Shells spawnen; keine Änderung nötig
- `model-config.ts` (`agent-os-ui/src/server/model-config.ts`) -- Provider-Konfiguration bleibt unverändert
- `aos-terminal` (Basis-Terminal-Komponente mit xterm.js) -- Rendert bereits beliebige PTY-Daten; keine Änderung nötig
- Gateway (`agent-os-ui/ui/src/gateway.ts`) -- Generische WebSocket-Schicht; keine Änderung nötig

---

## Umsetzungsphasen

### Phase 1: Datenmodell & Protokoll

**Ziel:** Das Shared-Type-System wird um den Terminal-Typ erweitert, sodass Frontend und Backend konsistent zwischen `shell` und `claude-code` Sessions unterscheiden können.

**Komponenten:**
- `cloud-terminal.protocol.ts` -- Neuer Typ `CloudTerminalType = 'shell' | 'claude-code'`
- `CloudTerminalSession` Interface erhält Feld `terminalType: CloudTerminalType`
- `CloudTerminalCreateMessage` -- `modelConfig` wird optional (nur für `claude-code`), neues Feld `terminalType`
- `CloudTerminalModelConfig` wird optional im Create-Flow

**Abhängig von:** Nichts (Startphase)

### Phase 2: Backend -- Plain Terminal Support

**Ziel:** Der `CloudTerminalManager` kann Shell-Terminals ohne Claude Code spawnen.

**Komponenten:**
- `CloudTerminalManager.createSession()` -- Neue Signatur akzeptiert optionales `modelConfig`; wenn `terminalType === 'shell'`, wird die System-Default-Shell (`process.env.SHELL || 'bash'`) ohne Claude-Code-Argumente gestartet
- `ManagedCloudSession` -- Speichert `terminalType` in Metadaten
- `websocket.ts` -- `handleCloudTerminalCreate()` akzeptiert Messages ohne `modelConfig` und leitet `terminalType` weiter

**Abhängig von:** Phase 1

### Phase 3: Frontend -- Session-Erstellungs-UI

**Ziel:** Das Dropdown zeigt "Terminal" als eigene Gruppe mit Separator, und bei Auswahl von "Terminal" wird sofort eine Shell-Session gestartet.

**Komponenten:**
- `aos-model-dropdown` -- Neue Gruppe "Terminal" oben im Dropdown mit Eintrag "Terminal" und visuellem Separator (`border-bottom`); bei Selektion wird `model-selected` Event mit speziellem Payload dispatcht (z.B. `{ terminalType: 'shell' }`)
- `aos-terminal-session` -- `handleModelSelected()` unterscheidet zwischen Shell- und Claude-Code-Auswahl; bei Shell wird `cloud-terminal:create` ohne `modelConfig` mit `terminalType: 'shell'` gesendet

**Abhängig von:** Phase 1, Phase 2

### Phase 4: Integration & Tab-Management

**Ziel:** Gemischte Terminal-Typen koexistieren korrekt in der Tab-Leiste, Session-Tracking und Persistenz sind konsistent.

**Komponenten:**
- `aos-cloud-terminal-sidebar` -- `TerminalSession`-Interface erhält `terminalType`-Feld; Session-Name-Generierung berücksichtigt den Typ (z.B. "Terminal 1" vs. "Claude Session 1")
- `aos-terminal-tabs` -- Tab-Name zeigt den Typ (über den Session-Namen)
- `CloudTerminalService` -- `PersistedTerminalSession` erhält `terminalType`-Feld; Persistenz und Wiederherstellung berücksichtigen den Typ
- `app.ts` -- `_handleNewTerminalSession()` wird um `terminalType`-Logik erweitert

**Abhängig von:** Alle vorherigen Phasen

---

## Komponenten-Verbindungen (KRITISCH)

### Verbindungs-Matrix

| Source | Target | Verbindungsart | Zuständige Story | Validierung |
|--------|--------|----------------|------------------|-------------|
| CloudTerminalProtocol | CloudTerminalManager | Type Import | Story 1 (Datenmodell) | grep `CloudTerminalType` in cloud-terminal-manager.ts |
| CloudTerminalProtocol | CloudTerminalService | Type Import | Story 1 (Datenmodell) | grep `terminalType` in cloud-terminal.service.ts |
| CloudTerminalProtocol | aos-terminal-session | Type Import (via Gateway Message) | Story 1 (Datenmodell) | grep `terminalType` in aos-terminal-session.ts |
| CloudTerminalManager | TerminalManager | Method Call (spawn) | Story 2 (Backend) | Bestehende Verbindung; validiert durch `getCliCommandForModel` vs. Default-Shell-Logik |
| WebSocket Handler | CloudTerminalManager | Method Call (createSession) | Story 2 (Backend) | grep `createSession` in websocket.ts |
| aos-model-dropdown | aos-terminal-session | Custom Event (model-selected) | Story 3 (Frontend UI) | grep `model-selected` in aos-terminal-session.ts |
| aos-terminal-session | Gateway/WebSocket | WebSocket Message (cloud-terminal:create) | Story 3 (Frontend UI) | grep `cloud-terminal:create` in aos-terminal-session.ts |
| aos-cloud-terminal-sidebar | aos-terminal-tabs | Property Binding (.sessions) | Story 4 (Integration) | Bestehende Verbindung; `terminalType` fließt durch Session-Objekt |
| app.ts | aos-cloud-terminal-sidebar | Property Binding (.sessions) | Story 4 (Integration) | Bestehende Verbindung; `terminalType` fließt durch |
| CloudTerminalService | IndexedDB | IndexedDB Persistence | Story 4 (Integration) | Funktionstest: Session mit `terminalType` speichern und laden |

---

## Abhängigkeiten

### Interne Abhängigkeiten

```
CloudTerminalProtocol (Types) ──used by──> CloudTerminalManager (Backend)
CloudTerminalProtocol (Types) ──used by──> CloudTerminalService (Frontend)
CloudTerminalProtocol (Types) ──used by──> WebSocket Handler (Backend)
CloudTerminalProtocol (Types) ──used by──> aos-terminal-session (Frontend)
CloudTerminalManager ──delegates to──> TerminalManager (für PTY Spawn)
aos-model-dropdown ──events to──> aos-terminal-session
aos-terminal-session ──messages via──> Gateway ──to──> WebSocket Handler
WebSocket Handler ──calls──> CloudTerminalManager
app.ts ──manages──> TerminalSession[] ──binds to──> aos-cloud-terminal-sidebar
```

### Externe Abhängigkeiten

- Keine neuen externen Abhängigkeiten erforderlich
- `node-pty`: Bereits installiert, unterstützt bereits beliebige Shell-Spawns
- `process.env.SHELL`: Standard-Unix-Umgebungsvariable für Default-Shell

---

## Risiken & Mitigationen

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|--------|------------|
| `modelConfig` ist tief im Code als required behandelt -- optionale Umstellung könnte TypeScript-Errors auslösen | Medium | Medium | Sorgfältiges Typ-Narrowing; `CloudTerminalModelConfig \| undefined` mit Guards |
| IndexedDB Schema-Migration -- `terminalType`-Feld fehlt bei existierenden Sessions | Medium | Low | Default-Wert `'claude-code'` für existierende Sessions ohne `terminalType` |
| Shell-Prozess hat andere Exit-Verhaltensweisen als Claude Code | Low | Low | Bestehende Exit-Handler sind bereits generisch; `exitCode`-Handling bleibt identisch |
| model-selected Event-Interface-Änderung bricht bestehende Listener | Low | Medium | Union-Type für Event Detail: `{ terminalType: 'shell' } \| { providerId: string; modelId: string }` |

---

## Self-Review Ergebnisse

### Validiert

1. **COMPLETENESS:** Alle 5 funktionalen Requirements (Terminal-Typ-Auswahl, Normales Terminal starten, Cloud Code Terminal, Gemischte Tabs, Tab-Navigation) sind abgedeckt.
2. **CONSISTENCY:** Die Architektur-Entscheidung "Erweitern statt Duplizieren" zieht sich konsistent durch alle Phasen. Der `terminalType`-Discriminator ist der rote Faden.
3. **SCOPE BOUNDARIES:** Alle IN-SCOPE-Punkte sind adressiert. OUT-OF-SCOPE-Punkte (Umbenennung, visuelle Tab-Unterscheidung, Split-View, Custom Shell) werden explizit nicht angefasst.
4. **COMPONENT CONNECTIONS:** Jede geänderte Komponente hat mindestens eine Verbindung in der Matrix. Jede Verbindung ist einer Story zugeordnet. Keine verwaisten Komponenten.
5. **EDGE CASES:** Terminal-Prozess-Ende, leere Tab-Liste und gemischte Typen sind alle über die bestehende Session-Lifecycle-Logik abgedeckt.

### Identifizierte Probleme & Lösungen

| Problem | Ursprünglicher Plan | Verbesserung |
|---------|---------------------|--------------|
| `modelConfig` ist in `CloudTerminalCreateMessage` ein Pflichtfeld | Neues separates Message-Interface für Shell-Terminals | Besser: `modelConfig` optional machen mit Type Guard; ein Interface, weniger Duplizierung |
| `CloudTerminalSession.modelConfig` ist immer gesetzt | Zwei Session-Typen mit separaten Interfaces | Besser: `modelConfig` optional machen; bei Shell-Terminals ist es `undefined` |
| Dropdown muss zwischen zwei verschiedenen Event-Typen unterscheiden | Zwei separate Events (`terminal-selected`, `model-selected`) | Besser: Ein Event `model-selected` mit Discriminated Union Detail; vermeidet Event-Proliferation |
| Session-Erstellung: Shell-Terminal zeigt kurz Model-Selector | Zweiter Code-Pfad im Session-Component | Besser: In `aos-terminal-session` prüfen ob `terminalType === 'shell'` und Model-Selector überspringen |

---

## Minimalinvasiv-Optimierungen

### Wiederverwendbare Elemente gefunden

| Element | Gefunden in | Nutzbar für |
|---------|-------------|-------------|
| `TerminalManager.spawn()` mit `shell` + `args` Parameter | `terminal-manager.ts` | Plain-Shell-Spawn ohne Claude Code; einfach `shell: process.env.SHELL`, `args: []` |
| `CloudTerminalManager.createSession()` Gesamtstruktur | `cloud-terminal-manager.ts` | Nur eine Bedingung einfügen: `if (terminalType === 'shell')` statt neuer Methode |
| Provider-Group-Rendering in `aos-model-dropdown` | `aos-model-dropdown.ts` | "Terminal"-Gruppe nutzt exakt das gleiche Rendering-Pattern wie Provider-Gruppen |
| Session-Lifecycle in `aos-terminal-session` | `aos-terminal-session.ts` | `handleModelSelected()` und `syncStateFromProps()` können mit minimalem Branch erweitert werden |
| `PersistedTerminalSession` Interface | `cloud-terminal.service.ts` | Nur ein Feld hinzufügen: `terminalType: 'shell' \| 'claude-code'` |

### Optimierungen

| Ursprünglich | Optimiert zu | Ersparnis |
|--------------|-------------|-----------|
| Neue `createShellSession()` Methode im CloudTerminalManager | Conditional in bestehender `createSession()`: `if (terminalType === 'shell')` überspringt `getCliCommandForModel()` | Eine Methode weniger; ~30 Zeilen Code gespart |
| Separates Terminal-Dropdown-Component | "Terminal"-Eintrag als erste Gruppe im bestehenden `aos-model-dropdown` | Kein neues Component nötig; ~100 Zeilen Code gespart |
| Neues WebSocket Message `shell-terminal:create` | Bestehende `cloud-terminal:create` Message mit optionalem `modelConfig` und neuem `terminalType` Feld | Kein neuer Message-Handler nötig; ~50 Zeilen Code gespart |
| Separater Session-Flow für Shell-Terminals in `aos-terminal-session` | Ein Branch in `handleModelSelected()` + ein Branch in `syncStateFromProps()` | Kein zweites Component; ~80 Zeilen Code gespart |

### Feature-Preservation bestätigt

- [x] Alle Requirements aus Clarification sind abgedeckt
- [x] Kein Feature wurde geopfert
- [x] Alle Akzeptanzkriterien bleiben erfüllbar
- [x] Bestehende Claude-Code-Funktionalität bleibt vollständig erhalten
- [x] Bestehende Session-Persistenz, Pause/Resume, Tab-Management bleiben unverändert
