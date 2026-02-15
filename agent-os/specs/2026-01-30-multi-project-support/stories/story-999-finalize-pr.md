# Finalize PR

> Story ID: MPRO-999
> Spec: multi-project-support
> Created: 2026-02-02
> Last Updated: 2026-02-02

**Priority**: High
**Type**: System/Finalization
**Estimated Effort**: S
**Dependencies**: MPRO-998
**Status**: Ready

---

## Feature

```gherkin
Feature: PR Finalisierung
  Als Entwickler
  möchte ich einen sauberen Pull Request mit Test-Szenarien und Cleanup,
  damit das Feature für Review und Merge bereit ist.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Test-Szenarien dokumentiert

```gherkin
Scenario: Test-Szenarien für Reviewer erstellt
  Given alle Stories sind implementiert und getestet
  When die PR-Finalisierung startet
  Then werden manuelle Test-Szenarien dokumentiert
  And der Reviewer weiß genau was zu testen ist
```

### Szenario 2: User-Todos erfasst

```gherkin
Scenario: Offene User-Todos werden aufgelistet
  Given das Feature ist funktional komplett
  When User-Todos während der Implementierung entstanden sind
  Then werden diese in der PR-Description aufgelistet
  And der User kann sie nach Merge bearbeiten
```

### Szenario 3: Pull Request erstellt

```gherkin
Scenario: PR wird erstellt
  Given alle Commits sind gepusht
  When der PR erstellt wird
  Then enthält der PR eine aussagekräftige Description
  And enthält der PR die Test-Szenarien
  And enthält der PR die User-Todos (falls vorhanden)
```

### Szenario 4: Worktree Cleanup

```gherkin
Scenario: Worktree wird aufgeräumt
  Given der PR ist erstellt
  When das Feature zur Review bereit ist
  Then wird der Worktree-Status geprüft
  And temporäre Dateien werden entfernt
  And der Worktree bleibt für eventuelle Fixes bestehen
```

---

## Technische Verifikation (Automated Checks)

### Funktions-Prüfungen

- [ ] GIT_CLEAN: `git status` zeigt keine uncommitted changes
- [ ] BRANCH_PUSHED: Branch ist auf Remote gepusht
- [ ] PR_EXISTS: PR wurde erstellt oder existiert bereits

---

## Required MCP Tools

| Tool | Purpose | Blocking |
|------|---------|----------|
| gh CLI | PR Creation | Yes |

---

## Technisches Refinement (vom Architect)

> **Ausgefüllt:** 2026-02-02

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
- [x] **Alle betroffenen Layer identifiziert**
- [x] **Integration Type bestimmt**
- [x] **Kritische Integration Points dokumentiert** (wenn Full-stack)
- [x] **Handover-Dokumente definiert** (bei Multi-Layer)

**Story ist READY wenn alle Checkboxen angehakt sind.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [ ] Alle Commits gepusht
- [ ] PR erstellt mit vollständiger Description
- [ ] Test-Szenarien dokumentiert

#### Qualitätssicherung
- [ ] PR ist review-ready
- [ ] Keine offenen Blocker
- [ ] CI/CD Pipeline grün (falls vorhanden)

#### Dokumentation
- [ ] PR-Description vollständig
- [ ] User-Todos dokumentiert
- [ ] Kanban-Board auf "Done" aktualisiert

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Git/PR-only (keine Code-Änderungen)

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Git | Feature Branch | Push & PR |
| Docs | PR Description | Erstellen |

**Kritische Integration Points:**
- Remote Repository Zugriff
- gh CLI für PR Creation

---

### Technical Details

**WAS:**
- Test-Szenarien für Reviewer dokumentieren
- User-Todos sammeln und auflisten
- Pull Request erstellen oder aktualisieren
- Worktree-Status prüfen und aufräumen
- Kanban-Board finalisieren

**WIE (Architektur-Guidance ONLY):**
- `gh pr create` oder `gh pr edit` für PR
- PR-Template mit Test-Szenarien, Summary, User-Todos
- `git status` für Worktree-Check
- Kanban-Board auf "Done" setzen

**WO:**
- Input: Git Branch, Implementation Reports
- Output: GitHub Pull Request

**WER:** Orchestrator / Git-Workflow Agent

**Abhängigkeiten:** MPRO-998 (Integration Validation)

**Geschätzte Komplexität:** S

**Relevante Skills:**
- `git-workflow` - PR Creation

**Creates Reusable:** no

---

### PR Template

```markdown
## Summary
Multi-Project Support ermöglicht das gleichzeitige Öffnen und Wechseln zwischen mehreren Projekten.

### Features
- Tab-Navigation im Header für geöffnete Projekte
- Modal-Dialog zum Hinzufügen von Projekten
- Recently Opened Liste mit localStorage-Persistenz
- Unabhängige WebSocket-Verbindungen pro Projekt
- Projekt-Context-Switching mit State-Persistenz

## Test Plan

### Manuelle Test-Szenarien
1. [ ] Projekt über Plus-Icon hinzufügen
2. [ ] Projekt aus Recently Opened auswählen
3. [ ] Zwischen Tabs wechseln
4. [ ] Tab schließen (X-Button)
5. [ ] Letzten Tab schließen → Leerer Zustand
6. [ ] Browser Refresh → Tabs wiederhergestellt
7. [ ] Workflow starten und Projekt wechseln → Workflow läuft weiter

### Automated Tests
- `npm run test` - Alle Unit Tests
- `npm run lint` - Code Quality
- `npm run build` - Build Validation

## User Todos
<!-- Nach Merge vom User zu bearbeiten -->
- [ ] Dokumentation in agent-os/docs/ erstellen
- [ ] Release Notes aktualisieren

---
Generated with [Claude Code](https://claude.com/claude-code)
```

---

### Completion Check

```bash
# Auto-Verify Commands - alle müssen mit 0 exiten
git status --porcelain | grep -q . && echo "Uncommitted changes!" && exit 1 || echo "Clean"
git push origin HEAD
gh pr view --json state -q '.state' | grep -q "OPEN\|MERGED" || gh pr create --fill
```

**Story ist DONE wenn:**
1. Alle Änderungen committed und gepusht
2. PR erstellt und review-ready
3. Kanban-Board zeigt alle Stories als "Done"
