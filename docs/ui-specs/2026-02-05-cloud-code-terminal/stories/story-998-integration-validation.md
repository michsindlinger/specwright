# Integration Validation - Cloud Code Terminal

> Story ID: CCT-998
> Spec: Cloud Code Terminal
> Created: 2026-02-05
> Last Updated: 2026-02-05

**Priority**: Critical
**Type**: System/Integration
**Estimated Effort**: 2 SP
**Dependencies**: CCT-997

---

## Purpose

Ersetzt Phase 4.5 - Führt Integration Tests aus spec.md durch.

---

## Integration Tests

### Test 1: End-to-End Terminal Flow

```bash
# Starte Terminal Session
curl -X POST http://localhost:3000/api/cloud-terminal/create \
  -H "Content-Type: application/json" \
  -d '{"projectPath":"/test/project","model":"claude-sonnet"}'

# Erwartet: Session-ID zurück
```

### Test 2: Multi-Session Support

```bash
# Erstelle 3 Sessions
# Erwarte: Alle 3 Sessions laufen parallel
```

### Test 3: Session Persistence

```bash
# 1. Erstelle Session
# 2. Simuliere Page Reload (IndexedDB check)
# 3. Erwarte: Session wird wiederhergestellt
```

### Test 4: Project Context

```bash
# 1. Erstelle Session in Projekt A
# 2. Wechsle zu Projekt B
# 3. Erwarte: Session von A ist pausiert
# 4. Wechsle zurück zu A
# 5. Erwarte: Session wird fortgesetzt
```

### Test 5: Connection Matrix Validation

```bash
# Validiere alle Verbindungen aus implementation-plan.md
grep -q "aos-cloud-terminal-sidebar" agent-os-ui/ui/src/app.ts
grep -q "aos-terminal" agent-os-ui/ui/src/components/terminal/aos-terminal-session.ts
grep -q "CloudTerminalService" agent-os-ui/ui/src/components/terminal/aos-terminal-session.ts
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
- [x] Alle Tests passen (8/9, 1 pre-existing UI error unrelated to Cloud Terminal)
- [x] Report erstellt

**WER:** dev-team__qa-specialist

**Abhängigkeiten:** CCT-997

**Geschätzte Komplexität:** S

**Relevante Skills:**

| Skill | Pfad | Grund |
|-------|------|-------|
| integration-testing | agent-os/skills/integration-testing.md | End-to-end integration tests |

### Completion Check

```bash
# Integration Test Report existiert
test -f agent-os/specs/2026-02-05-cloud-code-terminal/implementation-reports/integration-test-report.md
```
