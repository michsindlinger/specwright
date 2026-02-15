# Implementation Plan: AgentOS Extended Setup Wizard

> Created: 2026-02-13
> Status: Draft
> Spec: 2026-02-13-agent-os-setup-wizard

## 1. Architektur-Entscheidungen

### 1.1 Frontend-Struktur

**Entscheidung:** Eigene Komponente `aos-setup-wizard` statt inline im Settings-View.

**Begruendung:** Die `settings-view.ts` hat bereits ~860 Zeilen (Models-Management). Der Setup Wizard hat eine komplett eigenstaendige Logik (Status-Checks, Shell-Execution, Cloud Terminal Integration). Eine separate Komponente haelt die Settings-View schlank und den Wizard testbar.

**Struktur:**
```
ui/src/
  components/
    setup/
      aos-setup-wizard.ts       # Hauptkomponente (Wizard mit Steps)
  views/
    settings-view.ts            # Erweitert um 'setup' Tab (minimal)
```

### 1.2 Backend-Struktur

**Entscheidung:** Neuer `SetupService` als eigenstaendiger Service.

**Begruendung:** Die Logik (Filesystem-Checks, Shell-Execution mit Streaming) ist komplex genug fuer einen eigenen Service. Folgt dem bestehenden Pattern (git.service.ts, cloud-terminal-manager.ts).

**Struktur:**
```
src/server/
  services/
    setup.service.ts            # Status-Check + Shell-Execution
  websocket.ts                  # Neue Cases im Switch (setup:*)
```

### 1.3 Shell-Execution fuer Curl-Commands

**Entscheidung:** `child_process.spawn()` fuer Streaming-Output.

**Begruendung:**
- `spawn` liefert stdout/stderr als Stream (Live-Output an Frontend)
- `exec` wuerde den gesamten Output erst nach Abschluss liefern
- `execFile` eignet sich nicht fuer Pipe-Commands (`curl ... | bash`)

**Sicherheit:** Die Curl-URLs sind hardcoded im Backend (nicht vom Client steuerbar). Der Shell-Befehl wird als einzelner String mit `spawn('bash', ['-c', command])` ausgefuehrt.

### 1.4 Message-Type Konvention

**Entscheidung:** Doppelpunkt-Syntax `setup:*` (wie `cloud-terminal:*` und `git:*`).

**Begruendung:** Die neueren Features nutzen Doppelpunkte statt Punkte. Setup ist ein neues Feature.

### 1.5 Cloud Terminal fuer Step 4

**Entscheidung:** Bestehende Cloud Terminal Infrastruktur nutzen, spezielle `setup:start-devteam` Message die eine Session erstellt und den Command sendet.

**Begruendung:** Cloud Terminal ist bereits implementiert (Session-Management, Live-Output, Sidebar). Wir muessen nur den initialen Prompt automatisieren.

## 2. Betroffene Dateien

### Neue Dateien
| Datei | Zweck | ~LOC |
|-------|-------|------|
| `ui/src/components/setup/aos-setup-wizard.ts` | Setup Wizard Frontend-Komponente | ~350 |
| `src/server/services/setup.service.ts` | Backend-Service (Status-Check + Shell-Exec) | ~200 |

### Geaenderte Dateien
| Datei | Aenderung | ~LOC Delta |
|-------|-----------|------------|
| `ui/src/views/settings-view.ts` | Tab 'setup' hinzufuegen, Import Wizard | +20 |
| `src/server/websocket.ts` | Cases fuer `setup:*` Messages + Handler-Methoden | +80 |

### Nicht geaenderte Dateien
- `route.types.ts` - Settings Deep-Links werden bereits ueber Segments behandelt
- `gateway.ts` - Generisches `send()`/`on()` reicht aus, keine spezifischen Methoden noetig
- `app.ts` - Kein neuer View, nur neuer Settings-Tab
- Cloud Terminal Dateien - Werden nur benutzt, nicht geaendert

## 3. Detaillierter Implementierungsplan

### Story 1: Backend Setup Service (Status-Check)

**WAS:** Service der den Installationsstatus aller 4 Schritte prueft
**WO:** `src/server/services/setup.service.ts`
**WIE:**

```typescript
interface SetupStepStatus {
  step: 1 | 2 | 3 | 4;
  name: string;
  status: 'not_installed' | 'installed';
  details?: string; // Optionale Details (z.B. welche Dateien gefunden)
}

class SetupService {
  async checkStatus(projectPath: string): Promise<SetupStepStatus[]> {
    return [
      await this.checkBaseInstallation(projectPath),
      await this.checkClaudeCodeSetup(projectPath),
      await this.checkDevTeamGlobal(),
      await this.checkDevTeam(projectPath),
    ];
  }

  private async checkBaseInstallation(projectPath: string): Promise<SetupStepStatus> {
    // Pruefen: existiert <projectPath>/.agent-os/ mit erwarteten Unterordnern
    // z.B. .agent-os/workflows/, .agent-os/standards/
  }

  private async checkClaudeCodeSetup(projectPath: string): Promise<SetupStepStatus> {
    // Pruefen: existiert <projectPath>/CLAUDE.md UND <projectPath>/.claude/
  }

  private async checkDevTeamGlobal(): Promise<SetupStepStatus> {
    // Pruefen: existiert ~/.agent-os/templates/ (globale Dateien)
  }

  private async checkDevTeam(projectPath: string): Promise<SetupStepStatus> {
    // Pruefen: existiert <projectPath>/agent-os/team/ und nicht leer
  }
}
```

### Story 2: Backend Setup Service (Shell-Execution)

**WAS:** Shell-Ausfuehrung der Curl-Commands mit Streaming-Output
**WO:** `src/server/services/setup.service.ts`
**WIE:**

```typescript
interface SetupStepConfig {
  step: 1 | 2 | 3;
  name: string;
  command: string;
}

const SETUP_STEPS: SetupStepConfig[] = [
  {
    step: 1,
    name: 'Base Installation',
    command: 'curl -sSL https://raw.githubusercontent.com/michsindlinger/agent-os-extended/main/setup.sh | bash'
  },
  {
    step: 2,
    name: 'Claude Code Setup',
    command: 'curl -sSL https://raw.githubusercontent.com/michsindlinger/agent-os-extended/main/setup-claude-code.sh | bash'
  },
  {
    step: 3,
    name: 'DevTeam Global',
    command: 'curl -sSL https://raw.githubusercontent.com/michsindlinger/agent-os-extended/main/setup-devteam-global.sh | bash'
  }
];

class SetupService extends EventEmitter {
  runStep(step: 1 | 2 | 3, projectPath: string): void {
    const config = SETUP_STEPS.find(s => s.step === step);
    const proc = spawn('bash', ['-c', config.command], {
      cwd: projectPath,
      env: { ...process.env }
    });

    proc.stdout.on('data', (data) => {
      this.emit('step-output', { step, data: data.toString() });
    });

    proc.stderr.on('data', (data) => {
      this.emit('step-output', { step, data: data.toString() });
    });

    proc.on('close', (code) => {
      this.emit('step-complete', { step, success: code === 0, exitCode: code });
    });
  }
}
```

### Story 3: Backend WebSocket Handler

**WAS:** WebSocket Message-Routing fuer Setup-Messages
**WO:** `src/server/websocket.ts`
**WIE:**

Neue Cases im `handleMessage()` Switch:

```typescript
case 'setup:check-status':
  this.handleSetupCheckStatus(client);
  break;
case 'setup:run-step':
  this.handleSetupRunStep(client, message);
  break;
case 'setup:start-devteam':
  this.handleSetupStartDevteam(client, message);
  break;
```

Handler-Methoden:
- `handleSetupCheckStatus()` - Ruft `setupService.checkStatus()` auf, sendet `setup:status`
- `handleSetupRunStep()` - Ruft `setupService.runStep()` auf, leitet Events weiter als `setup:step-output` und `setup:step-complete`
- `handleSetupStartDevteam()` - Erstellt Cloud Terminal Session, sendet `/agent-os:build-development-team` als initialen Input

### Story 4: Frontend Setup Wizard Komponente

**WAS:** Lit Web Component fuer den Setup Wizard
**WO:** `ui/src/components/setup/aos-setup-wizard.ts`
**WIE:**

```typescript
@customElement('aos-setup-wizard')
export class AosSetupWizard extends LitElement {
  @state() private steps: StepInfo[] = [];     // Status aller 4 Schritte
  @state() private activeStep: number | null = null;  // Aktuell laufender Schritt
  @state() private output: string = '';        // Live-Output des aktiven Schritts
  @state() private loading = true;             // Initial Status-Check laeuft

  connectedCallback() {
    super.connectedCallback();
    this.setupHandlers();
    this.checkStatus();
  }

  // Gateway Handlers fuer setup:status, setup:step-output, setup:step-complete

  render() {
    // Step-Liste mit Status-Indikatoren
    // Action-Button fuer naechsten Schritt
    // Output-Bereich fuer Live-Terminal-Output
    // "Setup Complete" Anzeige wenn alles installiert
  }

  protected createRenderRoot() { return this; }
}
```

**UI-Elemente:**
- Step-Liste (vertikal, nummeriert 1-4)
- Status-Indikatoren (nicht installiert, installiert, laufend, fehler)
- "Run" Button pro Schritt (nur aktiv wenn kein anderer Schritt laeuft)
- Output-Bereich mit monospace Font und Scroll (aehnlich Terminal)
- "Open Cloud Terminal" Button fuer Schritt 4

### Story 5: Settings-View Integration

**WAS:** Setup-Tab in der bestehenden Settings-View
**WO:** `ui/src/views/settings-view.ts`
**WIE:**

Minimale Aenderungen:
1. `SettingsSection` Type erweitern: `'models' | 'general' | 'appearance' | 'setup'`
2. `VALID_TABS` erweitern um `'setup'`
3. Tab-Button hinzufuegen (nicht disabled, aktiv)
4. Import von `aos-setup-wizard`
5. Case im `renderContent()` Switch: `return html\`<aos-setup-wizard></aos-setup-wizard>\``

## 4. Abhaengigkeiten zwischen Stories

```
Story 1 (Backend Status-Check) ─┐
                                 ├─> Story 3 (Backend WS Handler) ─> Story 4 (Frontend Wizard)
Story 2 (Backend Shell-Exec)  ──┘                                          │
                                                                           v
                                                              Story 5 (Settings Integration)
```

- Stories 1+2 sind unabhaengig voneinander, koennen parallel
- Story 3 braucht 1+2 (nutzt den Service)
- Story 4 braucht 3 (nutzt die WS Messages)
- Story 5 braucht 4 (einbetten der Komponente)

## 5. Self-Review (Kollegen-Methode)

### Frage: Ist eine separate Komponente wirklich noetig?
**Antwort:** Ja. Settings-View hat 860 Zeilen. Der Wizard hat eigene State-Logik (Status-Checks, Running-State, Output-Buffer). Inline wuerde die Settings-View auf 1200+ Zeilen aufblaehen.

### Frage: Warum nicht den bestehenden TerminalManager fuer Curl-Commands nutzen?
**Antwort:** TerminalManager (node-pty) ist fuer interaktive Sessions gedacht. Curl-Commands sind non-interaktive Einmal-Ausfuehrungen. `spawn()` ist einfacher und ausreichend. Weniger Overhead, keine Session-Verwaltung noetig.

### Frage: Sicherheitsrisiko bei `spawn('bash', ['-c', command])`?
**Antwort:** Akzeptabel, weil die Commands hardcoded sind (nicht vom Client). Der Client sendet nur die Step-Nummer (1/2/3), der Server resolved das zum Command. Kein User-Input fliesst in den Shell-Befehl.

### Frage: Wie wird Step 4 (Cloud Terminal) genau integriert?
**Antwort:** Der Wizard sendet `setup:start-devteam`. Das Backend erstellt eine Cloud Terminal Session und sendet den initialen Input `/agent-os:build-development-team\n`. Die Cloud Terminal Sidebar oeffnet sich automatisch (bestehendes Feature reagiert auf `cloud-terminal:created`). Der Wizard zeigt einen Hinweis "Cloud Terminal wurde geoeffnet" mit Link zur Sidebar.

### Frage: Was wenn ein Step fehlschlaegt?
**Antwort:** Der Output-Bereich zeigt den Fehler. Der Step-Status wechselt auf `error`. Ein "Retry" Button erscheint. Der Benutzer kann erneut starten.

## 6. Minimal-Invasive Analyse

| Datei | Risiko | Massnahme |
|-------|--------|-----------|
| `settings-view.ts` | Niedrig | Nur Type + Tab + Import + Case hinzufuegen (~20 Zeilen) |
| `websocket.ts` | Niedrig | 3 neue Cases + 3 Handler-Methoden, kein bestehender Code geaendert |
| Neue Dateien | Kein Risiko | Komplett neu, keine Seiteneffekte |

**Keine Breaking Changes.** Alle Aenderungen sind additiv.
