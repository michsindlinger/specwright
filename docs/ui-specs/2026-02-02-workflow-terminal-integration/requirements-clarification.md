# Requirements Clarification - Workflow Terminal Integration

**Created:** 2026-02-02
**Status:** Pending User Approval

## Feature Overview

Ersetze das fehlerhafte Output-Mapping durch ein echtes Terminal, das bei aktiven Workflows den Chat-Bereich ersetzt und native Claude Code CLI-Interaktion ermöglicht. 1:1-Spiegelung der Shell-Ausgabe mit voller Interaktivität (xterm.js + node-pty).

## Target Users

Entwickler, die Claude Code Workflows über das Agent OS Web UI ausführen und vollständige Terminal-Kontrolle benötigen.

## Business Value

**Probleme der aktuellen Implementierung:**
- Unzuverlässiges Output-Mapping (Fragen fehlen oder werden mehrfach angezeigt)
- Ask Question UI zeigt Themen 2-3x (inkonsistentes Rendering)
- Keine native Terminal-Features (ANSI-Farben, Scrolling, Copy-Paste)
- Fehlende Interaktivität (nur Text-Output, keine Shell-Commands)

**Value durch neue Lösung:**
- 1:1 Terminal-Spiegelung → Keine verlorenen Ausgaben
- Native Terminal-Features → Bessere Developer Experience
- Volle Interaktivität → User kann bei Bedarf Commands eingeben
- Reduzierte Komplexität → Weniger Custom-UI-Code

## Functional Requirements

### FR-1: Terminal-UI Integration
- **xterm.js** als Frontend-Terminal-Komponente
- **node-pty** als Backend PTY-Manager
- Terminal ersetzt Chat-Bereich während Workflow-Ausführung
- Terminal zeigt alle CLI-Ausgaben 1:1 (Shell-Spiegelung, keine Filter)

### FR-2: Workflow-Lifecycle
- Terminal startet **automatisch** bei Workflow-Start (via Workflow Dashboard)
- Jeder Workflow = **eigenes isoliertes Terminal** (keine geteilten Terminals)
- Terminal bleibt **nach Workflow-Ende offen** (Exit-Code sichtbar)
- **"Zurück zum Dashboard"-Button** zum Beenden der Terminal-Session

### FR-3: Interaktivität
- **Voll interaktiv:** User kann Eingaben tätigen (Read + Write)
- **Keine beliebigen Commands:** User kann nur während Workflow-Ausführung interagieren
- Workflow-Commands sind vordefiniert (keine freie Shell-Ausführung)
- **Copy-Paste** aus Terminal (wenn Aufwand moderat)

### FR-4: Terminal-Features
- **Unbegrenztes Scrolling** (kein Truncating bei viel Output)
- **ANSI-Escape-Codes** vollständig unterstützt (Farben, Formatierung)
- **Theme-Integration:** Terminal-Farben folgen App-Theme (Moltbot Dark)
- **Shell:** Zsh (lokal), Remote-Shells in Zukunft möglich

### FR-5: Fehlerbehandlung
- **Workflow-Crash:** Terminal zeigt Exit-Code und letzte Ausgabe
- **WebSocket-Disconnect:** Automatisches Reconnect mit Backoff-Strategie
- **PTY-Prozess stirbt:** Exit-Code und Crash-Meldung im Terminal sichtbar
- **Performance:** Kein Limit auf Output-Größe (natürliches Terminal-Scrolling)

### FR-6: Session-Management
- **Session-Persistenz:** Wenn moderat umsetzbar, Terminal-Buffer über Reconnects erhalten
- **Mehrere Workflows:** User kann mehrere Workflows parallel starten (jeweils eigenes Terminal)
- **Isolation:** Keine Cross-Contamination zwischen Workflows

## Affected Areas & Dependencies

### Backend (Node.js + Express)
- **workflow-executor.ts** - Workflow-Service (bestehend)
  - Aktuell: `spawn()` mit text-based stdout/stderr
  - Neu: Integration mit PTY Terminal Manager

- **terminal-manager.ts** - NEUE Komponente (PTY-Verwaltung)
  - Basiert auf `node-pty`
  - Spawn PTY-Prozesse pro Workflow
  - Buffer-Management für Session-Persistenz

- **websocket.ts** - WebSocket-Handler (bestehend)
  - Neues Protokoll: `terminal.data`, `terminal.resize`, `terminal.exit`
  - Integration mit Terminal Manager

### Frontend (Lit Web Components)
- **aos-workflow-view.ts** - Workflow-View-Komponente
  - Ersetzt Ask Question UI durch Terminal-UI
  - Conditional Rendering: Terminal nur bei laufendem Workflow

- **aos-terminal.ts** - NEUE Terminal-Komponente
  - xterm.js Wrapper als Lit-Element
  - WebSocket-Integration für Terminal I/O
  - Copy-Paste Support
  - Theme-Integration

- **gateway.ts** - WebSocket-Gateway (bestehend)
  - Neue Message-Types für Terminal-Kommunikation

- **execution-store.ts** - State-Management
  - Terminal-Buffer-State pro Execution

### Zu entfernende Komponenten
- **workflow-question.ts** - Single Question UI (ENTFERNEN)
- **workflow-question-batch.ts** - Multi-Question UI (ENTFERNEN)
- Ask Question Logic in workflow-executor.ts (VEREINFACHEN)

## Edge Cases & Error Scenarios

### EC-1: WebSocket Connection Lost
- **Expected Behavior:**
  - Frontend zeigt "Reconnecting..." Overlay im Terminal
  - Automatisches Reconnect mit Exponential Backoff (800ms → 15s)
  - Nach Reconnect: Terminal-Buffer wird vom Backend restored
  - User kann weiter interagieren sobald verbunden

### EC-2: Workflow Crashes
- **Expected Behavior:**
  - Terminal zeigt letzten Output
  - Exit-Code wird angezeigt (z.B. "Process exited with code 1")
  - "Zurück zum Dashboard"-Button bleibt aktiv
  - Optional: "Retry Workflow"-Button

### EC-3: PTY Process Dies
- **Expected Behavior:**
  - Terminal zeigt Crash-Meldung
  - Backend sendet `terminal.exit` Event mit Exit-Code
  - Frontend locked Terminal (read-only)
  - "Zurück zum Dashboard"-Button verfügbar

### EC-4: Very Large Output (1000+ lines)
- **Expected Behavior:**
  - Unbegrenztes Scrolling (wie natives Terminal)
  - xterm.js Buffer-Management (default 1000 lines, konfigurierbar)
  - Keine Performance-Degradation (xterm.js optimiert für große Outputs)

### EC-5: Multiple Concurrent Workflows
- **Expected Behavior:**
  - Jeder Workflow = eigenes Terminal (isoliert)
  - User kann zwischen Workflows wechseln (via Dashboard)
  - Terminal-Buffer bleibt pro Workflow erhalten
  - Keine Cross-Contamination

### EC-6: User closes Browser/Tab während Workflow
- **Expected Behavior:**
  - Backend-Workflow läuft weiter
  - Bei Reconnect: Terminal-Buffer wird restored (wenn Session-Persistenz implementiert)
  - Alternative: Workflow wird abgebrochen (wenn keine Persistenz)

## Security & Permissions

### SEC-1: Deployment-Szenarien
- **Aktuell:** Lokal (localhost:3001)
- **Zukünftig:** Remote-Server möglich
- **Architektur:** Muss beide Szenarien unterstützen

### SEC-2: Authentifizierung & Autorisierung
- **WebSocket-Auth:** Token-basierte Authentifizierung (Bearer Token)
- **Session-Management:** Sichere Session-Verwaltung (HttpOnly Cookies oder JWT)
- **Best Practice:** OAuth/OpenID Connect für Remote-Deployment
- **mTLS:** Optional für Remote-Server (hohe Sicherheitsanforderungen)

### SEC-3: Command Restrictions
- **Keine beliebigen Commands:** User kann NICHT freie Shell-Commands ausführen
- **Nur Workflows:** User kann nur vordefinierte Workflows starten
- **Interaction während Workflow:** User kann interagieren (z.B. Fragen beantworten), aber nicht außerhalb

### SEC-4: Principle of Least Privilege
- **Backend-Prozesse:** Laufen mit minimalen Rechten
- **Input-Validierung:** Alle User-Inputs validiert
- **Sandboxing:** PTY-Prozesse in isolierter Umgebung

### SEC-5: Auditing & Logging
- **Audit-Log:** Alle Workflow-Starts protokolliert
- **Exit-Codes:** Erfassung aller Exit-Codes
- **Failed Attempts:** Log bei fehlgeschlagenen Ausführungen
- **Log-Level:** Konfigurierbar (DEBUG, INFO, WARN, ERROR)

## Performance Considerations

### PERF-1: WebSocket Latency
- **Target:** <100ms Round-Trip-Time für Terminal I/O
- **Strategie:** Binary WebSocket Frames (nicht JSON)

### PERF-2: Large Output Handling
- **xterm.js Buffer:** Default 1000 lines, konfigurierbar auf 10000+
- **Backend-Buffer:** Sliding Window (letzten 10000 Zeilen behalten)
- **Memory:** Monitor Memory-Usage bei langen Workflows

### PERF-3: Multiple Terminals
- **Limit:** Max 10 parallele Workflows (konfigurierbar)
- **Cleanup:** Automatisches Cleanup nach Workflow-Ende (nach 5 Minuten Inaktivität)

## Scope Boundaries

### IN SCOPE
✅ Terminal-UI im Frontend (xterm.js)
✅ PTY-Backend-Service (node-pty)
✅ WebSocket-Protokoll für Terminal I/O
✅ Automatischer Terminal-Start bei Workflow-Start
✅ Button "Zurück zum Dashboard"
✅ Copy-Paste aus Terminal (wenn moderat)
✅ Theme-Integration (Moltbot Dark)
✅ Session-Persistenz (wenn moderat, sonst optional)
✅ Automatisches Reconnect
✅ Mehrere Workflows parallel (jeweils eigenes Terminal)
✅ Exit-Code-Anzeige bei Crashes
✅ Unbegrenztes Scrolling

### OUT OF SCOPE
❌ Terminal-Tabs (jeder Workflow hat eigenes Terminal, Wechsel via Dashboard)
❌ Split-View (Terminal + Chat gleichzeitig)
❌ Custom Terminal-Settings UI (nutzt App-Theme)
❌ Freie Shell-Ausführung (nur vordefinierte Workflows)
❌ Terminal-Shortcuts für Nicht-Workflow-Commands
❌ Remote-Shell-Support (aktuell nur Zsh lokal, Remote in v2.0)
❌ Terminal-Recording/Replay
❌ Collaborative Terminals (Multi-User)

## Open Questions

### Q1: Session-Persistenz Aufwand
**Question:** Wie aufwändig ist Session-Persistenz (Terminal-Buffer über Restarts)?
**Options:**
- **Low:** Einfaches Buffer-Caching im Memory (verloren bei Server-Restart)
- **Medium:** Persistenz in File-System (Buffer in /tmp speichern)
- **High:** Vollständige Replay-Fähigkeit mit tmux/screen Integration

**Decision Needed:** Aufwandsschätzung vs. Nutzen

### Q2: Reconnect-Strategie
**Question:** Wie aggressive soll Reconnect sein?
**Options:**
- **Conservative:** 3 Versuche, dann Abbruch
- **Moderate:** 10 Versuche mit Exponential Backoff
- **Aggressive:** Unbegrenzt mit Max-Backoff 30s

**Decision Needed:** Balance zwischen UX und Resource-Usage

### Q3: Auth-Architektur für Remote
**Question:** Welche Auth für Remote-Deployment?
**Options:**
- **Simple:** Basic Auth (nur lokal)
- **Standard:** JWT mit Refresh-Tokens
- **Advanced:** OAuth/OpenID Connect mit SSO
- **Enterprise:** mTLS + OAuth

**Decision Needed:** Basierend auf geplanter Deployment-Topologie

## Proposed User Stories (High Level)

1. **PTY-001: Backend PTY Service** - Implementiere Terminal Manager mit node-pty
2. **PTY-002: WebSocket Terminal Protocol** - Erweitere WebSocket für Terminal I/O
3. **PTY-003: Frontend Terminal Component** - Erstelle xterm.js Lit-Komponente
4. **PTY-004: View Switching Logic** - Terminal ersetzt Chat bei Workflow-Start
5. **PTY-005: Code Cleanup & Removal** - Entferne Ask Question UI und altes Mapping
6. **PTY-999: Integration & Validation** - End-to-End Tests

---

*Review this document carefully. Once approved, detailed user stories will be generated.*
