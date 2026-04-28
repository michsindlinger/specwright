# Implementation Plan — Global Claude Concurrency Cap

> Approved 2026-04-28 — basis: iterativer User-Dialog + externer Reviewer-Pass

## Context

Auto-Mode-Run produzierte Transport-Errors auf zwei Stories:
1. `API Error: Unable to connect to API (ConnectionRefused)`
2. `API Error: Stream idle timeout - partial response received`

**Root-Cause:** Anthropic drosselt Tokens-per-Second pro API-Key bei Last → SSE wird langsam → Client-Idle-Timer triggered. Specwright UI hat kein App-weites Limit für parallele Claude-Sessions:

- `ProjectConcurrencyGate` ist **per Orchestrator-Instanz** (2 Specs Auto-Mode = 4 parallel)
- Chat-Sends, `runClaudeCommand`, Resume-nach-Question, Fallback-`--print`-Pfade umgehen den Gate komplett

**Ziel:** Globaler Cap = 2 Sessions app-weit über alle Quellen außer Cloud-Terminal-Sessions.

## Vorbedingungen (recherchiert)

### Aktueller Gate-Code (`project-concurrency-gate.ts`)
- `acquire(): Promise<void>` (kein Release-Closure)
- `release(): void` separat
- `drain(): void` resettet `running = 0`, weckt alle Waiters
- 7 Call-Sites in `auto-mode-orchestrator-base.ts:189-311` nutzen `await acquire()` + `gate.release()` getrennt

### Pfad-Realität (verifiziert)
- `startBacklogStoryExecution`: **PTY-Pfad (461-484) ist bereits gegated** via `AutoModeBacklogOrchestrator`. **Nur Fallback `--print` (489+) ist ungegated.**
- `runClaudeCommand` (1774-2030): ungegated
- Resume nach Question (2598-2622): ungegated
- Chat-Send (`claude-handler.ts:360, 543`): ungegated
- Cloud-Terminal-Sessions (`websocket.ts:498, 4276, 4622` + `cloud-terminal-manager.ts`): ungegated, **bleiben so** (User-Decision)

## Approach

Statt Singleton + Two-Tier-Wrap die existierende Klasse um klassenweite Counter erweitern. Public Instance-API bleibt unverändert. Direct-Spawn-Pfade nutzen neue statische Helper.

---

## Phase 1: Erweitere ProjectConcurrencyGate

**Datei:** `ui/src/server/services/project-concurrency-gate.ts`

Klasse um statische Counter, statische Helper und korrekte `drain()`-Semantik erweitern. Bestehende Instance-API bleibt unverändert — die 7 Call-Sites in `auto-mode-orchestrator-base.ts` brauchen keinen Diff.

### Vollständige Ziel-Implementierung

```typescript
export type GlobalGateState = { running: number; max: number; waiting: number };

export class ProjectConcurrencyGate {
  static readonly MAX_CONCURRENT = 4;

  private static readonly globalMax = Math.min(
    Number(process.env.SPECWRIGHT_GLOBAL_CLAUDE_CONCURRENCY ?? 2),
    ProjectConcurrencyGate.MAX_CONCURRENT
  );
  private static globalRunning = 0;
  private static globalWaiters: Array<() => void> = [];
  private static queuedListeners: Set<(state: GlobalGateState) => void> = new Set();

  private readonly maxConcurrent: number;
  private running = 0;
  private readonly waiters: Array<() => void> = [];
  private globalHeld = 0;

  constructor(maxConcurrent: number = 2) {
    this.maxConcurrent = Math.min(maxConcurrent, ProjectConcurrencyGate.MAX_CONCURRENT);
  }

  async acquire(): Promise<void> {
    if (ProjectConcurrencyGate.globalRunning >= ProjectConcurrencyGate.globalMax) {
      ProjectConcurrencyGate.notifyQueued();
      await new Promise<void>(res => ProjectConcurrencyGate.globalWaiters.push(res));
    }
    ProjectConcurrencyGate.globalRunning++;
    this.globalHeld++;

    if (this.running < this.maxConcurrent) {
      this.running++;
      return;
    }
    return new Promise<void>(res => this.waiters.push(res));
  }

  release(): void {
    if (this.waiters.length > 0) {
      const next = this.waiters.shift()!;
      next();
    } else {
      this.running--;
    }
    if (this.globalHeld > 0) {
      this.globalHeld--;
      ProjectConcurrencyGate.releaseGlobal();
    }
  }

  drain(): void {
    const pending = [...this.waiters];
    this.waiters.length = 0;
    this.running = 0;
    pending.forEach(r => r());
    while (this.globalHeld > 0) {
      this.globalHeld--;
      ProjectConcurrencyGate.releaseGlobal();
    }
  }

  static async acquireGlobalOnly(): Promise<void> {
    if (this.globalRunning >= this.globalMax) {
      this.notifyQueued();
      await new Promise<void>(res => this.globalWaiters.push(res));
    }
    this.globalRunning++;
  }

  static releaseGlobalOnly(): void {
    this.releaseGlobal();
  }

  private static releaseGlobal(): void {
    if (this.globalWaiters.length > 0) {
      this.globalWaiters.shift()!();
    } else {
      this.globalRunning--;
    }
  }

  static onQueued(fn: (s: GlobalGateState) => void): () => void {
    this.queuedListeners.add(fn);
    return () => this.queuedListeners.delete(fn);
  }
  private static notifyQueued(): void {
    const state = {
      running: this.globalRunning,
      max: this.globalMax,
      waiting: this.globalWaiters.length + 1,
    };
    this.queuedListeners.forEach(fn => { try { fn(state); } catch { /* swallow */ } });
  }

  static resetForTests(): void {
    this.globalRunning = 0;
    this.globalWaiters.length = 0;
    this.queuedListeners.clear();
  }

  get activeCount(): number { return this.running; }
  get waitingCount(): number { return this.waiters.length; }
  get maxSlots(): number { return this.maxConcurrent; }
  static get globalActive(): number { return this.globalRunning; }
  static get globalWaiting(): number { return this.globalWaiters.length; }
}
```

**Eigenschaften:**
- Public Instance-API (`acquire`, `release`, `drain`, Getter) **unverändert**
- Nur ein Hard-Ceiling: `MAX_CONCURRENT = 4` clamps `globalMax`
- `drain()` released alle global-Slots dieser Instanz korrekt
- Kein Singleton-Boilerplate

**Acceptance:**
- 7 bestehende Call-Sites in `auto-mode-orchestrator-base.ts` kompilieren weiter ohne Änderung
- Zwei `ProjectConcurrencyGate`-Instanzen mit je `maxConcurrent=2` → max 2 active total (vorher: 4)

---

## Phase 2: Wrap Direct-Spawn-Pfade in workflow-executor

**Datei:** `ui/src/server/workflow-executor.ts`

Drei Stellen wrappen, **NICHT** den PTY-Pfad in `startBacklogStoryExecution` (461-484) — der ist bereits über Orchestrator gegated. Doppel-Gating würde Deadlock auslösen.

### Helper-Methode

Private Helper als Pattern-Quelle (für reine Promise-Pfade):

```typescript
private async withGlobalGate<T>(fn: () => Promise<T> | T): Promise<T> {
  await ProjectConcurrencyGate.acquireGlobalOnly();
  try {
    return await fn();
  } finally {
    ProjectConcurrencyGate.releaseGlobalOnly();
  }
}
```

### Wrap-Sites

| Lines | Pfad | Strategie |
|-------|------|-----------|
| 489+ | Fallback `--print` in `startBacklogStoryExecution` (CloudTerminalManager unavailable) | `acquireGlobalOnly` vor spawn, explicit release in try/catch/finally + child.on('exit') + AbortController-Cancel |
| 1774-2030 | `runClaudeCommand` direct exec | gleiches |
| 2598-2622 | Resume nach Question (`spawnWithLoginShell --resume`) | gleiches |

### Release-Robustheit

Für `ChildProcess`-Pfade gilt: explizite Release-Calls auf **jedem** Beendigungs-Pfad:
- Im `try`/`catch` der Spawn-Funktion (spawn-fail = sofort release)
- Im `child.on('exit', ...)` (normales Ende)
- Im AbortController/cancel-Handler (User-Cancel)
- Im `prompt-stuck`/`error`-Branch falls vorhanden

`once('exit')` allein reicht **nicht** — orphaned/detached Prozesse triggern es nie. Idempotenz via lokales `released = false`-Flag pro Spawn-Instanz absichern.

**Acceptance:**
- 3 Wrap-Sites umgestellt
- PTY-Pfad in `startBacklogStoryExecution` **unverändert**
- Manuelle Test: spawn-fail (z.B. ENOENT) → Slot wird trotzdem released

---

## Phase 3: Wrap Chat-Send + chat.queued WS-Event

**Datei:** `ui/src/server/claude-handler.ts`

### Wrap-Sites

| Lines | Pfad |
|-------|------|
| 360 | Chat-Send (Standard) |
| 543 | Chat-Send mit Images |

### Vor `acquireGlobalOnly()` aufrufen

Wenn Gate voll, an genau diesen Client einmaliges WS-Event:

```typescript
if (ProjectConcurrencyGate.globalActive >= ProjectConcurrencyGate.globalMax) {
  this.sendToClient(client, {
    type: 'chat.queued',
    reason: 'claude_capacity',
    state: {
      running: ProjectConcurrencyGate.globalActive,
      waiting: ProjectConcurrencyGate.globalWaiting + 1,
      max: ProjectConcurrencyGate.globalMax,
    },
  });
}
await ProjectConcurrencyGate.acquireGlobalOnly();
// ... existing spawn logic
```

Release explizit auf allen Beendigungs-Pfaden (siehe Phase 2).

**Acceptance:**
- Bei vollem Gate: Client erhält genau ein `chat.queued`-Event vor dem Spawn
- Spawn startet sobald Slot frei
- Slot wird released auf jedem Pfad (success, spawn-fail, abort, exit)

---

## Phase 4: Frontend Banner für chat.queued

**Datei:** Chat-Component im Frontend (`ui/frontend/src/components/...` — exakte Datei beim Implementieren ermitteln)

### WS-Handler erweitern

Existierender WS-Listener bekommt neuen Case:

```typescript
case 'chat.queued':
  this.queued = true;
  this.queuedState = msg.state;
  break;
```

### Render-Bedingung

Banner anzeigen wenn `this.queued && !this.responseStarted`:

```html
<div class="chat-queued-banner" ?hidden=${!this.queued || this.responseStarted}>
  Warte auf Claude-Kapazität (${this.queuedState.running}/${this.queuedState.max} aktiv,
  ${this.queuedState.waiting} in Warteschlange)…
</div>
```

Sobald die normale Claude-Response startet (`message`-Event vom Backend), `queued = false` setzen — Banner verschwindet.

**Acceptance:**
- Bei vollem Gate erscheint Banner sofort nach Chat-Send
- Banner verschwindet wenn Antwort beginnt
- Kein Banner wenn Gate frei

---

## Phase 5: Tests

**Datei:** `ui/tests/unit/project-concurrency-gate.test.ts`

### Erweitern

Existierende Instance-Tests bleiben. Neue Suites:

**Suite: Global counter — `acquireGlobalOnly` / `releaseGlobalOnly`**
- Acquires bis Max → blocks weitere
- Release weckt einen Waiter
- FIFO-Reihenfolge bei mehreren Waitern
- `globalActive` / `globalWaiting`-Getter konsistent

**Suite: Cross-instance global cap**
- Zwei Instanzen `new ProjectConcurrencyGate(2)`
- Beide acquire 1× → globalActive = 2
- Dritte acquire (egal welche Instanz) blockiert bis irgendwer released

**Suite: drain() releases global slots**
- Instance acquired 2 lokale + 2 globale Slots
- `drain()` aufrufen → global-Slots dieser Instanz wieder frei
- Andere Instanz kann acquire ohne hängen zu bleiben

**Suite: Test isolation**
- `resetForTests()` in `beforeEach` setzt globalRunning=0, leert globalWaiters
- `process.env.SPECWRIGHT_GLOBAL_CLAUDE_CONCURRENCY`-Override kann hier nicht getestet werden (frozen at module-load), Hinweis in Test-Kommentar

### Integration

Zusätzliche Test-Datei `ui/tests/integration/global-gate-cross-orchestrator.test.ts`:
- Mock zwei `AutoModeBacklogOrchestrator`-Instanzen
- Starte je 2 Items parallel
- Erwartet: max 2 PTYs gleichzeitig aktiv (heute: 4)

**Acceptance:**
- `cd ui && npm test` → alle grün
- `cd ui && npm run lint` → keine Fehler
- Mindestens 8 neue Test-Cases in der Unit-Suite

---

## Phase 6 — System: Code Review

Wird über System-Task `CCG-997` automatisch ausgeführt (Opus reviewt Feature-Diff).

## Phase 7 — System: Integration Validation

Wird über System-Task `CCG-998` ausgeführt:
- Backend: `cd ui && npm run build:backend` exit 0
- Frontend: `cd ui/frontend && npm run build` exit 0
- Tests: `cd ui && npm test` exit 0
- Manueller Smoke: 2 Auto-Mode-Specs parallel → cloud-terminal zeigt max 2 aktive Sessions

## Phase 8 — System: Finalize PR

Wird über System-Task `CCG-999` ausgeführt (User-Todos, PR, Cleanup).

---

## Out of Scope

- Globales WS-Broadcast für Header-Indikator (Badge "⚡ 2/2") → Follow-up Spec
- Retry-Logik für Transport-Errors → eigenes Thema
- Resume-Mechanik bei Session-Crash → eigenes Thema
- Cloud-Terminal-Gating → User-Decision: bleibt ungated

## Risks & Mitigations

| Risiko | Mitigation |
|--------|-----------|
| Release-Leak bei orphaned/detached Process | Explizite Release-Calls in allen Pfaden + Idempotenz-Flag |
| Test-Pollution durch geteilten static state | `resetForTests()` in `beforeEach` aller Suites |
| Doppel-Gating in `startBacklogStoryExecution` | PTY-Pfad **nicht** wrappen — nur Fallback `--print` |
| Chat-Stille-Hang | `chat.queued` WS-Event vor `acquireGlobalOnly` |
| Backwards-Compat | Public Instance-API unverändert, 7 Call-Sites brauchen keinen Diff |
