# Slash-Command /assign-spec

> Story ID: ASGN-005
> Spec: Spec Assignment for External Bot
> Created: 2026-02-24
> Last Updated: 2026-02-24

**Priority**: Medium
**Type**: DevOps
**Estimated Effort**: 2 SP
**Dependencies**: None

---

## Feature

```gherkin
Feature: CLI Slash-Command für Spec-Assignment
  Als Specwright-Nutzer
  möchte ich über die CLI eine Spec an OpenClaw assignen können,
  damit ich auch ohne Web UI arbeiten kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Spec erfolgreich assignen via CLI

```gherkin
Scenario: Spec über CLI assignen
  Given ich bin im Terminal im Specwright-Projekt
  And die Spec "2026-02-24-spec-assignment" hat alle Stories im Status "ready"
  When ich "/assign-spec specwright/specs/2026-02-24-spec-assignment/" ausführe
  Then wird die Spec an OpenClaw assigned
  And ich sehe eine Bestätigung "Spec assigned to OpenClaw"
```

### Szenario 2: Spec un-assignen via CLI

```gherkin
Scenario: Spec über CLI un-assignen
  Given die Spec ist bereits an OpenClaw assigned
  When ich "/assign-spec specwright/specs/2026-02-24-spec-assignment/" erneut ausführe
  Then wird das Assignment zurückgenommen
  And ich sehe "Spec un-assigned from OpenClaw"
```

### Szenario 3: Fehler bei nicht-ready Spec

```gherkin
Scenario: Assignment fehlschlägt bei nicht-ready Spec
  Given die Spec hat Stories im Status "blocked"
  When ich "/assign-spec specwright/specs/2026-02-24-spec-assignment/" ausführe
  Then sehe ich eine Fehlermeldung "Spec muss Status 'ready' haben"
  And die kanban.json wird nicht geändert
```

### Edge Case: Ungültiger Pfad

```gherkin
Scenario: Ungültiger Spec-Pfad
  Given der angegebene Pfad existiert nicht
  When ich "/assign-spec specwright/specs/nicht-existierend/" ausführe
  Then sehe ich eine Fehlermeldung "Spec nicht gefunden"
```

---

## Technische Verifikation (Automated Checks)

- [ ] FILE_EXISTS: .claude/commands/specwright/assign-spec.md
- [ ] CONTAINS: .claude/commands/specwright/assign-spec.md enthält "assign"
- [ ] CONTAINS: .claude/commands/specwright/assign-spec.md enthält "kanban"

---

## Required MCP Tools

| Tool | Purpose | Blocking |
|------|---------|----------|
| kanban (MCP) | kanban.json lesen/validieren | No (kann auch direkt lesen) |

---

## Technisches Refinement (vom Architect)

### DoR (Definition of Ready) - Vom Architect

#### Fachliche Anforderungen
- [x] Fachliche requirements klar definiert
- [x] Akzeptanzkriterien sind spezifisch und prüfbar
- [x] Business Value verstanden

#### Technische Vorbereitung
- [x] Technischer Ansatz definiert (WAS/WIE/WO)
- [x] Abhängigkeiten identifiziert
- [x] Betroffene Komponenten bekannt
- [x] Erforderliche MCP Tools dokumentiert (falls zutreffend)
- [x] Story ist angemessen geschätzt (max 5 Dateien, 400 LOC)

#### Full-Stack Konsistenz
- [x] Alle betroffenen Layer identifiziert
- [x] Integration Type bestimmt
- [x] Kritische Integration Points dokumentiert (wenn Full-stack)
- [x] Handover-Dokumente definiert (bei Multi-Layer)

---

### DoD (Definition of Done) - Vom Architect

- [ ] Command-Datei `assign-spec.md` erstellt
- [ ] Command nimmt Spec-Pfad als Argument ($ARGUMENTS)
- [ ] Command nutzt `kanban_read` MCP-Tool zum Lesen der kanban.json
- [ ] "Ready"-Status wird validiert (alle Stories im Status "ready")
- [ ] Bei nicht-ready: Fehlermeldung mit Erklärung
- [ ] Bei ready: `assignedToBot`-Feld wird getoggelt via direkten File-Write
- [ ] Bestätigung mit aktuellem Status wird ausgegeben
- [ ] Bei ungültigem Pfad: Fehlermeldung "Spec nicht gefunden"
- [ ] Completion Check commands erfolgreich

---

### Betroffene Layer & Komponenten

- **Integration Type:** CLI-only (Slash-Command Markdown)

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| CLI | `assign-spec.md` | Neues Slash-Command-File für Spec-Assignment via Claude Code CLI |

- **Kritische Integration Points:** Keine (arbeitet direkt mit kanban.json via MCP-Tool)

---

### Technical Details

**WAS:**
- Neues Slash-Command-File `.claude/commands/specwright/assign-spec.md`
- Command-Markdown das Claude instruiert:
  1. Spec-Pfad aus $ARGUMENTS lesen (oder Spec-ID)
  2. kanban.json via `kanban_read` MCP-Tool lesen
  3. Validieren: Alle Stories im Status "ready"?
  4. Wenn valid: `assignedToBot`-Feld togglen und kanban.json schreiben
  5. Bestätigung oder Fehlermeldung ausgeben

**WIE:**
- Bestehendes Slash-Command-Pattern folgen (z.B. `add-todo.md`, `add-bug.md`)
- Command nimmt $ARGUMENTS als Spec-Pfad
- `kanban_read` MCP-Tool für Lesen (kein direkter File-Read nötig)
- Für Schreiben: Direkte File-Manipulation der kanban.json (Read → Modify → Write)
- Ready-Check: Alle Stories in `stories[]` Array müssen `status: "ready"` haben
- Toggle-Logik: Wenn `assignedToBot.assigned === true` → setze auf false, sonst setze auf true mit Timestamp
- Fehlerfall: Klare Meldung warum Assignment nicht möglich (welche Stories nicht ready)

**WO:**
- `.claude/commands/specwright/assign-spec.md` (neue Datei)

**Abhängigkeiten:** None (unabhängig von UI-Stories, arbeitet direkt mit kanban.json)

**Geschätzte Komplexität:** XS

---

### Relevante Skills

| Skill | Pfad | Grund |
|-------|------|-------|
| — | — | Keine spezifischen Skills nötig - Markdown Slash-Command folgt bestehendem Pattern |

---

### Creates Reusable Artifacts

Creates Reusable: no

---

### Completion Check

```bash
# Auto-Verify Commands - alle müssen mit 0 exiten
test -f .claude/commands/specwright/assign-spec.md && echo "OK: assign-spec.md exists"
grep -q "assign" .claude/commands/specwright/assign-spec.md && echo "OK: contains assign"
grep -q "kanban" .claude/commands/specwright/assign-spec.md && echo "OK: contains kanban"
grep -q "ARGUMENTS" .claude/commands/specwright/assign-spec.md && echo "OK: uses ARGUMENTS"
grep -q "ready" .claude/commands/specwright/assign-spec.md && echo "OK: contains ready validation"
```

### Story ist DONE wenn:
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Command-Datei ist vollständig und folgt bestehendem Pattern
3. Git diff zeigt nur neue Datei assign-spec.md
