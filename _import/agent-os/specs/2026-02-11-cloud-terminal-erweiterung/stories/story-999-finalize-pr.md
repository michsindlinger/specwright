# Finalize PR - Cloud Terminal Erweiterung

> Story ID: CTE-999
> Spec: Cloud Terminal Erweiterung
> Created: 2026-02-11
> Last Updated: 2026-02-11

**Priority**: Critical
**Type**: System/Finalization
**Estimated Effort**: 2 SP
**Dependencies**: CTE-998

---

## Purpose

Ersetzt Phase 5 - Test-Szenarien, User-Todos, PR, Worktree Cleanup.

---

## Tasks

### 1. Test-Szenarien Dokumentieren

Erstelle `implementation-reports/test-scenarios.md`:

- Szenario 1: Normales Terminal starten (Terminal auswählen, Shell öffnet sich)
- Szenario 2: Claude Code Terminal starten (Provider + Model wählen, Claude Code startet)
- Szenario 3: Gemischte Tabs (Shell + Claude Code gleichzeitig, Wechsel zwischen Tabs)
- Szenario 4: Session-Persistenz (Seite neu laden, beide Typen bleiben erhalten)
- Szenario 5: Terminal ohne Provider (auch ohne LLM-Provider kann Shell gestartet werden)

### 2. User-Todos Erstellen

Erstelle `handover-docs/user-todos.md`:

- Konfiguration: Keine spezielle Konfiguration nötig für Shell-Terminals
- Nutzung: "Terminal" als erste Option im Session-Dropdown auswählen
- Bekannte Limitationen: Immer System-Default-Shell, keine Custom-Shell-Auswahl

### 3. PR Erstellen

Erstelle PR mit:
- Titel: "feat: Add plain shell terminal support to Cloud Terminal"
- Beschreibung: Zusammenfassung aller Änderungen
- Referenz zu Spec: `agent-os/specs/2026-02-11-cloud-terminal-erweiterung/`

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
- [x] Test-Szenarien dokumentiert
- [x] User-Todos erstellt
- [x] PR erstellt
- [x] Worktree bereinigt

**WER:** dev-team__tech-lead

**Abhängigkeiten:** CTE-998

**Geschätzte Komplexität:** S

### Completion Check

```bash
# Alle Deliverables existieren
test -f agent-os/specs/2026-02-11-cloud-terminal-erweiterung/implementation-reports/test-scenarios.md
test -f agent-os/specs/2026-02-11-cloud-terminal-erweiterung/handover-docs/user-todos.md
# PR wurde erstellt
git log --oneline --grep="Cloud Terminal" | head -1
```
