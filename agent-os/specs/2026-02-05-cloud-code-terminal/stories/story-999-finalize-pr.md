# Finalize PR - Cloud Code Terminal

> Story ID: CCT-999
> Spec: Cloud Code Terminal
> Created: 2026-02-05
> Last Updated: 2026-02-05

**Priority**: Critical
**Type**: System/Finalization
**Estimated Effort**: 2 SP
**Dependencies**: CCT-998

---

## Purpose

Ersetzt Phase 5 - Test-Szenarien, User-Todos, PR, Worktree Cleanup.

---

## Tasks

### 1. Test-Szenarien Dokumentieren

Erstelle `implementation-reports/test-scenarios.md`:

```markdown
# Test Scenarios - Cloud Code Terminal

## Manuelle Test-Szenarien

### Szenario 1: Terminal Starten
1. Klicke Terminal-Button im Header
2. Wähle Modell aus
3. Erwarte: Terminal öffnet sich

### Szenario 2: Multi-Session
1. Starte Session 1
2. Starte Session 2
3. Wechsle zwischen Tabs
4. Erwarte: Beide Sessions laufen

### Szenario 3: Persistenz
1. Starte Session
2. Reload Page
3. Erwarte: Session ist wieder da

## Automatisierte Tests
- [ ] Unit Tests: [Liste]
- [ ] Integration Tests: [Liste]
```

### 2. User-Todos Erstellen

Erstelle `handover-docs/user-todos.md`:

```markdown
# User Todos - Cloud Code Terminal

## Konfiguration
- [ ] Stelle sicher, dass mindestens ein Provider konfiguriert ist
- [ ] Passe `MAX_SESSIONS` in der Config an (default: 5)

## Nutzung
- [ ] Starte erste Terminal-Session über Header-Button
- [ ] Teste Modell-Auswahl
- [ ] Probiere Multi-Session Tabs
- [ ] Teste Session-Persistenz (Reload)

## Bekannte Limitationen
- Max 5 gleichzeitige Sessions
- Terminal-Buffer wird nicht persistiert (nur Metadaten)
```

### 3. PR Erstellen

Erstelle PR mit:
- Titel: "feat: Add Cloud Code Terminal"
- Beschreibung: Zusammenfassung aller Änderungen
- Referenz zu Spec: `agent-os/specs/2026-02-05-cloud-code-terminal/`

### 4. Worktree Cleanup

- [ ] Stelle sicher, dass alle Tests passen
- [ ] Keine Debug-Logs im Code
- [ ] Keine ungenutzten Imports
- [ ] Linting fehlerfrei

---

## Deliverables

1. `implementation-reports/test-scenarios.md`
2. `handover-docs/user-todos.md`
3. PR erstellt
4. Worktree bereinigt

---

## Technisches Refinement

### DoR (Definition of Ready)
- [x] Integration Validation abgeschlossen
- [x] Alle Tests passen
- [x] Code Review approved

### DoD (Definition of Done)
- [ ] Test-Szenarien dokumentiert
- [ ] User-Todos erstellt
- [ ] PR erstellt
- [ ] Worktree bereinigt

**WER:** dev-team__tech-lead

**Abhängigkeiten:** CCT-998

**Geschätzte Komplexität:** S

**Relevante Skills:**

| Skill | Pfad | Grund |
|-------|------|-------|
| git-workflow | agent-os/skills/git-workflow.md | PR creation and worktree cleanup |

### Completion Check

```bash
# Alle Deliverables existieren
test -f agent-os/specs/2026-02-05-cloud-code-terminal/implementation-reports/test-scenarios.md
test -f agent-os/specs/2026-02-05-cloud-code-terminal/handover-docs/user-todos.md
# PR wurde erstellt
git log --oneline --grep="Cloud Code Terminal" | head -1
```
