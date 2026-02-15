# Implementierungsplan: Workflow Terminal Integration

> **Status:** APPROVED
> **Spec:** agent-os/specs/2026-02-02-workflow-terminal-integration
> **Erstellt:** 2026-02-02
> **Basiert auf:** requirements-clarification.md

---

## Executive Summary

Ersetze das fehlerhafte Text-based Output-Mapping durch eine vollständige Terminal-Integration (xterm.js + node-pty), die 1:1 Shell-Spiegelung, volle Interaktivität und native Terminal-Features bietet. Das Terminal startet automatisch bei Workflow-Ausführung, ersetzt den Chat-Bereich, und bleibt nach Workflow-Ende offen für Review.

**Wert:** Eliminiert UI-Bugs (fehlende/doppelte Fragen), bietet Developer-Experience wie native CLI, reduziert Custom-UI-Code durch Nutzung bewährter Terminal-Standards.

---

## Architektur-Entscheidungen

### Gewählter Ansatz

**Terminal-as-First-Class-Citizen Architecture**

Anstatt CLI-Output in Custom-UI-Komponenten zu mappen, nutzen wir native Terminal-Emulation:
- **Frontend:** xterm.js (Industry-Standard, VSCode-proven)
- **Backend:** node-pty (Cross-platform PTY-Wrapper)
- **Protocol:** Binary WebSocket Frames (nicht JSON für Performance)

### Begründung

**Warum xterm.js?**
- ✅ Industry-Standard (VSCode, GitHub Codespaces, Hyper)
- ✅ Vollständige ANSI/VT100-Unterstützung out-of-the-box
- ✅ Hohe Performance bei großen Outputs (10000+ Zeilen)
- ✅ TypeScript-ready, aktiv maintained
- ❌ Alternativen (Hyper.js, Terminado) weniger web-focused

**Warum node-pty?**
- ✅ Standard für PTY in Node.js
- ✅ Cross-platform (macOS, Linux, Windows WSL)
- ✅ Direkte Integration mit WorkflowExecutor möglich
- ❌ Alternative (pty.js) weniger maintained

**Warum Binary WebSocket?**
- ✅ 3-5x kleinere Payloads als JSON (bei ANSI-Codes)
- ✅ Keine Escaping-Probleme mit Control-Characters
- ✅ Sub-100ms Latency für Terminal I/O

### Patterns & Technologien

- **Pattern:** Adapter Pattern (WorkflowExecutor → TerminalManager → PTY)
- **Pattern:** Observer Pattern (PTY Events → WebSocket Broadcast)
- **Technologie Frontend:** xterm.js 5.x + xterm-addon-fit (Auto-Resize)
- **Technologie Backend:** node-pty 1.x + ws (WebSocket)
- **Begründung:** Separation of Concerns - Workflow-Logic bleibt unberührt, Terminal ist austauschbare Layer

---

## Komponenten-Übersicht

### Neue Komponenten

| Komponente | Typ | Verantwortlichkeit |
|------------|-----|-------------------|
| `TerminalManager` | Backend Service | PTY-Process-Lifecycle, Buffer-Management, Session-Isolation |
| `aos-terminal` | Frontend Component | xterm.js Wrapper, WebSocket I/O, Theme-Integration |
| `terminal.protocol.ts` | Shared Type | Terminal-spezifische WebSocket Message-Types |

### Zu ändernde Komponenten

| Komponente | Änderungsart | Grund |
|------------|--------------|-------|
| `WorkflowExecutor` | Erweitern | Integration mit TerminalManager statt spawn() |
| `websocket.ts` | Erweitern | Neue Message-Types: terminal.data, terminal.resize, terminal.exit |
| `workflow-view.ts` | Refactoren | Conditional Rendering: Terminal statt Ask Question UI |
| `gateway.ts` | Erweitern | Handler für terminal.* Messages |
| `execution-store.ts` | Erweitern | Terminal-Session-State pro Execution |

### Zu entfernende Komponenten

| Komponente | Grund |
|------------|-------|
| `workflow-question.ts` | Ersetzt durch native Terminal-Interaktion |
| `workflow-question-batch.ts` | Ersetzt durch native Terminal-Interaktion |
| `handleAskUserQuestion()` in WorkflowExecutor | Custom-Question-Logic obsolet |
| `detectTextQuestions()` in WorkflowExecutor | Fallback nicht mehr nötig |

### Nicht betroffen (explizit)

- Dashboard-View (nur Workflow-Trigger, kein UI-Change)
- Chat-View (komplett unabhängig)
- Project-Management (projects.ts, specs-reader.ts)
- Kanban-Board-Logic (nur Workflow-Status-Updates)

---

## Komponenten-Verbindungen (v2.9 - KRITISCH)

Diese Sektion definiert EXPLIZIT wie die neuen/geänderten Komponenten verbunden werden. Jede Verbindung wird einer Story zugeordnet die für die Integration verantwortlich ist.

### Neue Komponenten

| Komponente | Layer | Pfad | Beschreibung |
|-----------|-------|------|--------------|
| `TerminalManager` | Backend Service | `agent-os-ui/src/server/services/terminal-manager.ts` | PTY-Lifecycle, Buffer-Management |
| `aos-terminal` | Frontend Component | `agent-os-ui/ui/src/components/aos-terminal.ts` | xterm.js Wrapper |
| `terminal.protocol.ts` | Shared Types | `agent-os-ui/src/shared/types/terminal.protocol.ts` | Message-Types |

### Komponenten-Verbindungen

| Source (Von) | Target (Zu) | Verbindungsart | Zuständige Story | Validierung |
|--------------|-------------|----------------|------------------|-------------|
| `WorkflowExecutor` | `TerminalManager` | Method Call | PTY-001 | `grep -q "terminalManager.spawn" agent-os-ui/src/server/workflow-executor.ts` |
| `TerminalManager` | `websocket.ts` | Event Emission | PTY-002 | `grep -q "emit.*terminal.data" agent-os-ui/src/server/services/terminal-manager.ts` |
| `websocket.ts` | `gateway.ts` | WebSocket Message | PTY-002 | `grep -q "terminal\\.data" agent-os-ui/ui/src/gateway.ts` |
| `gateway.ts` | `aos-terminal` | Custom Event | PTY-003 | `grep -q "CustomEvent.*terminalData" agent-os-ui/ui/src/components/aos-terminal.ts` |
| `aos-terminal` | `gateway.ts` | Method Call | PTY-003 | `grep -q "gateway.send.*terminal\\.input" agent-os-ui/ui/src/components/aos-terminal.ts` |
| `workflow-view.ts` | `aos-terminal` | Component Render | PTY-004 | `grep -q "<aos-terminal" agent-os-ui/ui/src/views/workflow-view.ts` |
| `execution-store.ts` | `aos-terminal` | Property Binding | PTY-004 | `grep -q "terminalSessionId" agent-os-ui/ui/src/components/aos-terminal.ts` |

**WICHTIG:** Jede "Zuständige Story" MUSS diese Verbindung aktiv herstellen und validieren!

### Verbindungs-Matrix (Data Flow)

```
User Action (Dashboard)
  → Workflow Start
    → WorkflowExecutor.startExecution()
      → [PTY-001] TerminalManager.spawn(executionId)
        → PTY Process spawned
          → [PTY-002] terminal.data events → WebSocket
            → [PTY-003] gateway.ts receives → aos-terminal renders
              → [PTY-004] workflow-view.ts displays terminal

User Input (Terminal)
  → [PTY-003] aos-terminal.onData()
    → gateway.send(terminal.input)
      → [PTY-002] websocket.ts receives
        → [PTY-001] TerminalManager.write(data)
          → PTY Process stdin
```

---

## Umsetzungsphasen

### Phase 1: Backend PTY Infrastructure (PTY-001)
**Ziel:** PTY-Service funktionsfähig, kann von WorkflowExecutor genutzt werden

**Komponenten:**
- `TerminalManager` Service (NEU)
- `WorkflowExecutor` Integration (ÄNDERUNG)
- `terminal.protocol.ts` Types (NEU)

**Abhängig von:** Nichts (Startphase)

**Deliverables:**
- TerminalManager kann PTY spawnen
- WorkflowExecutor ruft TerminalManager auf (Verbindung hergestellt)
- PTY-Output wird in Buffer gespeichert
- Unit Tests für TerminalManager

### Phase 2: WebSocket Terminal Protocol (PTY-002)
**Ziel:** Terminal I/O über WebSocket mit Binary Frames

**Komponenten:**
- `websocket.ts` Handler (ÄNDERUNG)
- `gateway.ts` Client (ÄNDERUNG)
- `terminal.protocol.ts` Message-Types (ERWEITERUNG)

**Abhängig von:** Phase 1 (TerminalManager muss events emittieren können)

**Deliverables:**
- WebSocket empfängt terminal.data von TerminalManager (Verbindung hergestellt)
- gateway.ts sendet terminal.input an Backend (Verbindung hergestellt)
- Binary Frame-Encoding funktioniert
- Reconnect-Logic mit Buffer-Restore
- Integration Tests für Message-Flow

### Phase 3: Frontend Terminal Component (PTY-003)
**Ziel:** xterm.js Lit-Komponente mit Theme-Integration

**Komponenten:**
- `aos-terminal` Component (NEU)
- Theme-Integration mit CSS Custom Properties
- xterm-addon-fit für Auto-Resize

**Abhängig von:** Phase 2 (WebSocket-Protokoll muss existieren)

**Deliverables:**
- aos-terminal rendert xterm.js
- Verbindung zu gateway.ts hergestellt (send/receive)
- Copy-Paste funktioniert
- Theme-Farben aus App-Theme übernommen
- Component Unit Tests

### Phase 4: View Switching & UI Integration (PTY-004)
**Ziel:** Terminal ersetzt Chat-Bereich während Workflow

**Komponenten:**
- `workflow-view.ts` (REFACTORING)
- `execution-store.ts` (ERWEITERUNG)
- Conditional Rendering Logic

**Abhängig von:** Phase 3 (aos-terminal muss funktionieren)

**Deliverables:**
- workflow-view.ts rendert aos-terminal (Verbindung hergestellt)
- Terminal visible only when workflow active
- "Zurück zum Dashboard"-Button
- execution-store speichert Terminal-Session-State (Property Binding hergestellt)
- UI Tests für View-Switching

### Phase 5: Code Cleanup & Removal (PTY-005)
**Ziel:** Alte Ask Question UI und Custom-Mapping entfernen

**Komponenten:**
- `workflow-question.ts` (LÖSCHEN)
- `workflow-question-batch.ts` (LÖSCHEN)
- `WorkflowExecutor` handleAskUserQuestion Logic (VEREINFACHEN)

**Abhängig von:** Phase 4 (neue UI muss fertig sein)

**Deliverables:**
- Alte Komponenten gelöscht
- WorkflowExecutor simplifiziert
- Keine toten Code-Pfade mehr
- Regression Tests pass

### Phase 6: Integration & Validation (PTY-999)
**Ziel:** End-to-End funktioniert, alle Verbindungen validiert

**Komponenten:** Alle

**Abhängig von:** Alle vorherigen Phasen

**Deliverables:**
- **Verbindungs-Validierung:** Alle Verbindungen aus Matrix funktionieren
- End-to-End Test: Workflow Start → Terminal I/O → Workflow End
- Performance Test: 1000+ Zeilen Output
- Reconnect Test: Disconnect → Reconnect → Buffer Restored
- Multi-Workflow Test: 3 Workflows parallel
- Security Audit: Input-Validierung, Auth-Tokens

---

## Abhängigkeiten

### Interne Abhängigkeiten

```
WorkflowExecutor ──calls──> TerminalManager ──emits events──> WebSocket Handler
                                                                    │
                                                                    v
WebSocket Handler ──broadcasts──> Gateway Client ──sends events──> aos-terminal
                                        ^                                │
                                        └────────receives input──────────┘

workflow-view.ts ──renders──> aos-terminal
execution-store.ts ──provides state──> aos-terminal
```

### Externe Abhängigkeiten

**Neue NPM-Packages:**
- `node-pty@^1.0.0` (Backend) - PTY Process-Management
- `xterm@^5.3.0` (Frontend) - Terminal-Emulation
- `xterm-addon-fit@^0.8.0` (Frontend) - Auto-Resize
- `@xterm/addon-web-links@^0.9.0` (Frontend, optional) - URL-Clicking

**Bestehende Packages (bereits vorhanden):**
- `ws` (Backend) - WebSocket Server
- `lit` (Frontend) - Web Components
- `@types/node-pty` (Dev) - TypeScript Typings

---

## Risiken & Mitigationen

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|--------|------------|
| **PTY-Prozesse leaken Memory** | Medium | High | Automatisches Cleanup nach 5min Inaktivität, Max-Buffer-Size 10MB |
| **WebSocket-Disconnect verliert Output** | Medium | Medium | Buffer im Backend (10000 Zeilen), Reconnect mit Restore |
| **xterm.js Performance bei 10000+ Zeilen** | Low | Low | xterm.js ist für 100K+ Zeilen optimiert, Buffer-Limit konfigurierbar |
| **ANSI-Escape-Codes brechen UI** | Low | Medium | xterm.js handled alle Standard-Codes, Fuzzing-Tests hinzufügen |
| **Session-Persistenz zu komplex** | Medium | Low | Phase 1: In-Memory-Buffer (MVP), Phase 2: Filesystem-Backup (optional) |
| **Mehrere Workflows überladen Server** | Medium | Medium | Max 10 parallele PTYs (konfigurierbar), Queue für weitere |
| **Copy-Paste funktioniert nicht** | Low | Low | xterm.js Copy-Paste ist Standard-Feature, Browser-Permissions prüfen |
| **Theme-Integration nicht konsistent** | Low | Low | CSS Custom Properties von xterm.js überschreiben mit App-Theme |

---

## Self-Review Ergebnisse

### 1. VOLLSTÄNDIGKEIT

✅ **Alle Requirements abgedeckt:**
- FR-1: Terminal-UI Integration (xterm.js + node-pty) ✓
- FR-2: Workflow-Lifecycle (Auto-Start, isolierte Sessions) ✓
- FR-3: Interaktivität (Read/Write) ✓
- FR-4: Terminal-Features (Scrolling, ANSI, Theme, Zsh) ✓
- FR-5: Fehlerbehandlung (Crash, Reconnect, Exit-Codes) ✓
- FR-6: Session-Management (Persistenz, Multi-Workflow) ✓
- Security (Auth, Least Privilege, Auditing) ✓
- Performance (Sub-100ms, 1000+ Zeilen) ✓

### 2. KONSISTENZ

✅ **Keine Widersprüche gefunden:**
- Layered Architecture wird respektiert (Service → Integration)
- WebSocket-Protokoll konsistent mit bestehenden Patterns
- Naming Conventions eingehalten (kebab-case für Files)
- TypeScript Strict Mode kompatibel

### 3. RISIKEN

⚠️ **Identifizierte Probleme:**

| Problem | Ursprünglicher Plan | Verbesserung |
|---------|---------------------|--------------|
| **WorkflowExecutor stark gekoppelt mit spawn()** | Direkter Refactor in WorkflowExecutor | **Adapter Pattern:** TerminalManager als abstraction Layer, WorkflowExecutor ruft Adapter auf |
| **Session-Persistenz unklar (Low vs High Effort)** | Vollständige Persistenz geplant | **MVP-Approach:** Phase 1 = In-Memory-Buffer (Low), Phase 2 = Optional Filesystem-Backup (wenn User Request) |
| **Ask Question UI Removal könnte andere Features brechen** | Sofortiges Löschen | **Phased Approach:** PTY-005 erst NACH PTY-004 fertig, Regression Tests vorher |

### 4. ALTERNATIVEN

✅ **Evaluierte Alternativen:**

**Alternative 1: Text-based Output mit ANSI-Parser**
- ❌ Komplexität: Custom ANSI-Parser wartungsintensiv
- ❌ Features: Copy-Paste, Resize schwer zu implementieren
- ✅ Gewählte Lösung: xterm.js ist Standard, battle-tested

**Alternative 2: tmux/screen für Session-Persistenz**
- ❌ Komplexität: Zusätzlicher External-Dependency-Layer
- ❌ Plattform: Windows-Support problematisch
- ✅ Gewählte Lösung: In-Memory-Buffer für MVP, tmux optional später

**Alternative 3: WebRTC Data Channels statt WebSocket**
- ❌ Overhead: WebRTC-Signaling komplex für localhost
- ❌ Latency: WebSocket genügt für <100ms Ziel
- ✅ Gewählte Lösung: WebSocket Binary Frames (einfacher)

### 5. KOMPONENTEN-VERBINDUNGEN (v2.9 KRITISCH)

✅ **Alle Komponenten verbunden:**
- TerminalManager → websocket.ts (Event Emission) ✓
- websocket.ts → gateway.ts (WebSocket Messages) ✓
- gateway.ts → aos-terminal (Custom Events) ✓
- aos-terminal → gateway.ts (Method Calls) ✓
- workflow-view.ts → aos-terminal (Component Render) ✓
- execution-store.ts → aos-terminal (Property Binding) ✓

✅ **Alle Verbindungen haben zuständige Stories:**
- PTY-001: WorkflowExecutor → TerminalManager
- PTY-002: TerminalManager → websocket.ts → gateway.ts
- PTY-003: gateway.ts ↔ aos-terminal
- PTY-004: workflow-view.ts → aos-terminal, execution-store.ts → aos-terminal

✅ **Alle Validierungen sind ausführbar:**
- Grep-Checks für Imports/Calls definiert
- Integration Tests pro Verbindung geplant

❌ **Keine verwaisten Komponenten gefunden**

### Offene Fragen

**Q1: Session-Persistenz Effort-Level?**
- **Empfehlung:** Start mit In-Memory (Low), Filesystem-Backup optional wenn User-Feedback positiv

**Q2: Reconnect-Strategie?**
- **Empfehlung:** Moderate (10 Versuche, Exponential Backoff, Max 30s)

**Q3: Auth-Architektur Remote?**
- **Empfehlung:** JWT mit Refresh-Tokens (Standard), OAuth für v2.0

---

## Minimalinvasiv-Optimierungen

### Wiederverwendbare Elemente gefunden

| Element | Gefunden in | Nutzbar für |
|---------|-------------|-------------|
| **Exponential Backoff Logic** | `gateway.ts` (Zeile 45-60) | TerminalManager Reconnect |
| **WebSocket Message-Type Pattern** | `websocket.ts` (handleWorkflowStart) | terminal.* Message-Handler |
| **Execution-ID-based Isolation** | `WorkflowExecutor` (executionMap) | TerminalManager Session-Isolation |
| **Event Emitter Pattern** | `WorkflowExecutor` (EventEmitter) | TerminalManager PTY-Events |
| **CSS Custom Properties Theme** | `theme.css` | xterm.js Theme-Override |

### Optimierungen

| Ursprünglich | Optimiert zu | Ersparnis |
|--------------|--------------|-----------|
| **Neue Reconnect-Logic für Terminal** | Wiederverwendung von gateway.ts Backoff-Logic | ~50 LOC |
| **Neue Session-Isolation** | Wiederverwendung von WorkflowExecutor.executionMap Pattern | ~100 LOC, konsistentes Behavior |
| **Custom ANSI-Parser** | xterm.js out-of-the-box | ~500 LOC, weniger Bugs |
| **Custom Theme-Switcher** | CSS Custom Properties Override | ~200 LOC |
| **Custom WebSocket-Handler-Struktur** | Copy Pattern von handleWorkflowStart | ~80 LOC, konsistente API |

**Gesamt-Ersparnis:** ~930 LOC + weniger Maintenance-Overhead

### Feature-Preservation bestätigt

- [x] Alle Requirements aus Clarification sind abgedeckt
- [x] Kein Feature wurde geopfert (alle FR-1 bis FR-6 erfüllt)
- [x] Alle Akzeptanzkriterien bleiben erfüllbar:
  - ✓ 1:1 Terminal-Spiegelung
  - ✓ Volle Interaktivität
  - ✓ Auto-Start bei Workflow
  - ✓ Mehrere Workflows parallel
  - ✓ Copy-Paste (xterm.js Standard)
  - ✓ Unbegrenztes Scrolling (xterm.js Standard)
  - ✓ Theme-Integration (CSS Custom Properties)
  - ✓ Exit-Code-Anzeige (PTY-Events)
  - ✓ Automatisches Reconnect (gateway.ts Pattern)
  - ✓ Session-Persistenz (In-Memory Buffer)

---

## Nächste Schritte

Nach Genehmigung dieses Plans:
1. **Step 2.6:** User Stories aus diesem Plan ableiten (PTY-001 bis PTY-999)
2. **Step 3:** Architect fügt technische Details hinzu (WAS/WIE/WO/WER/DoR/DoD)
3. **Step 3.4:** DoR Validation (alle Checkboxen [x])
4. **Step 3.5:** Story Size Validation (<5 files, <400 LOC)
5. **Step 3.6:** Effort Estimation (Human + AI)
6. **Step 4:** Spec ready for /execute-tasks
