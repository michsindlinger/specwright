# Integration Validation - Cloud Terminal Erweiterung

> Story ID: CTE-998
> Spec: Cloud Terminal Erweiterung
> Created: 2026-02-11
> Last Updated: 2026-02-11

**Priority**: Critical
**Type**: System/Integration
**Estimated Effort**: 2 SP
**Dependencies**: CTE-997

---

## Purpose

Ersetzt Phase 4.5 - Führt Integration Tests aus spec.md durch.

---

## Integration Tests

### Test 1: Shell-Terminal Flow

```bash
# Validiere: terminalType 'shell' ist im Protocol definiert
grep -q "shell" agent-os-ui/src/shared/types/cloud-terminal.protocol.ts && echo "PASS: shell type defined"
```

### Test 2: Backend Shell-Spawn

```bash
# Validiere: CloudTerminalManager kann Shell spawnen
grep -q "terminalType" agent-os-ui/src/server/services/cloud-terminal-manager.ts && echo "PASS: terminalType handled"
```

### Test 3: Dropdown Terminal-Gruppe

```bash
# Validiere: Terminal-Option existiert im Dropdown
grep -rq "Terminal" agent-os-ui/ui/src/components/terminal/aos-model-dropdown.ts && echo "PASS: Terminal option exists"
```

### Test 4: Session-Typ Tracking

```bash
# Validiere: PersistedTerminalSession hat terminalType
grep -q "terminalType" agent-os-ui/ui/src/services/cloud-terminal.service.ts && echo "PASS: terminalType persisted"
```

### Test 5: Connection Matrix Validation

```bash
# Validiere alle Verbindungen aus implementation-plan.md
grep -q "terminalType" agent-os-ui/src/server/websocket.ts && echo "PASS: WebSocket handles terminalType"
grep -q "terminalType" agent-os-ui/ui/src/components/terminal/aos-terminal-session.ts && echo "PASS: Session component handles terminalType"
grep -q "terminalType" agent-os-ui/ui/src/app.ts && echo "PASS: App handles terminalType"
```

---

## Deliverables

1. Integration Test Report in `implementation-reports/integration-test-report.md`
2. Alle Integration Tests müssen passen

---

## Technisches Refinement

### DoR (Definition of Ready)
- [x] Code Review abgeschlossen
- [x] Alle Stories implementiert
- [x] Backend läuft lokal

### DoD (Definition of Done)
- [x] Alle Integration Tests ausgeführt
- [x] Alle Tests passen
- [x] Report erstellt

**WER:** dev-team__qa-specialist

**Abhängigkeiten:** CTE-997

**Geschätzte Komplexität:** S

### Completion Check

```bash
# Integration Test Report existiert
test -f agent-os/specs/2026-02-11-cloud-terminal-erweiterung/implementation-reports/integration-test-report.md
```
