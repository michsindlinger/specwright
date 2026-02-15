# Finalize Pull Request

> Story ID: CTX-999
> Spec: 2026-02-03-context-menu
> Created: 2026-02-03
> Last Updated: 2026-02-03

**Priority**: High
**Type**: System
**Estimated Effort**: XS
**Dependencies**: CTX-998

---

## Feature

```gherkin
Feature: Finalize Pull Request
  Als Developer
  moechte ich einen sauberen Pull Request erstellen,
  damit die Aenderungen reviewed und gemerged werden koennen.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Branch Cleanup

```gherkin
Scenario: Branch ist sauber
  Given alle Feature-Stories wurden implementiert und validiert
  When der Branch geprueft wird
  Then gibt es keine uncommitted Changes
  And alle Commits haben aussagekraeftige Messages
  And der Branch ist rebased auf main
```

### Szenario 2: PR Description

```gherkin
Scenario: PR hat vollstaendige Beschreibung
  Given ein Pull Request wird erstellt
  When die PR Description geprueft wird
  Then enthaelt sie eine Zusammenfassung der Aenderungen
  And listet die implementierten Features auf
  And enthaelt Testing Instructions
```

### Szenario 3: CI/CD Checks

```gherkin
Scenario: Alle CI Checks passieren
  Given der Pull Request wurde erstellt
  When die CI Pipeline laeuft
  Then passieren alle Lint Checks
  And passiert der Build
  And passieren die Tests
```

---

## Technische Verifikation (Automated Checks)

### Pre-PR Checklist

- [x] Keine uncommitted changes (git status: clean)
- [x] Branch rebased auf main
- [x] Lint passes (`npm run lint` erfolgreich)
- [x] Build passes (`npm run build:ui` erfolgreich)
- [x] Tests pass (falls vorhanden)

### PR Content Checklist

- [x] PR Title ist beschreibend ("feat: Add Context Menu for quick workflow access")
- [x] PR Description enthaelt Summary
- [x] PR Description enthaelt Testing Instructions
- [ ] Labels gesetzt (feature, frontend, etc.) - Optional

### PR Created

**PR URL:** https://github.com/michsindlinger/agent-os-extended-web-ui/pull/14

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

#### Implementierung
- [x] Code implementiert und folgt Style Guide (PR Story - kein neuer Code)
- [x] Architektur-Vorgaben eingehalten (Git Flow Workflow)
- [x] Security/Performance Anforderungen erfüllt (N/A)

#### Qualitätssicherung
- [x] Alle Akzeptanzkriterien erfüllt (PR erstellt)
- [x] Unit Tests geschrieben und bestanden (N/A - PR Story)
- [x] Code Review durchgeführt und genehmigt (CTX-997 abgeschlossen)

#### Dokumentation
- [x] Dokumentation aktualisiert (PR Description vollständig)
- [x] Keine Linting Errors (verifiziert vor PR)
- [x] Completion Check Commands alle erfolgreich

---

### Betroffene Layer & Komponenten

**Integration Type:** Git/PR (keine Code-Aenderungen)

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| - | Git Repository | Branch Management, PR Creation |

---

### Technical Details

**WAS:**
- Feature Branch finalisieren
- Commits aufraeumen (squash/rebase wenn noetig)
- Pull Request erstellen mit vollstaendiger Beschreibung
- Labels und Reviewer zuweisen

**WIE (Architecture Guidance):**
- Pattern: Git Flow / Feature Branch Workflow
- Tool: GitHub CLI (`gh pr create`)
- Constraint: Keine force-push auf shared branches
- Best Practice: Atomic commits mit klaren Messages

**WO:**
- Git Repository: agent-os-web-ui
- Branch: feature/context-menu
- Target: main

**WER:** dev-team__architect

**Abhängigkeiten:** CTX-998 (Integration Validation abgeschlossen)

**Geschätzte Komplexität:** XS

**Relevante Skills:** N/A

**Creates Reusable:** no

---

### PR Template

```markdown
## Summary
Add Context Menu (right-click menu) for quick access to frequently used workflows: Create Spec, Add Bug, Add TODO, and Add Story to Spec.

## Changes
- Add aos-context-menu component with 4 menu items (CTX-001)
- Add global contextmenu event handler in app.ts (CTX-002)
- Add aos-workflow-modal for generic workflow display (CTX-003)
- Add aos-confirm-dialog for unsaved changes confirmation (CTX-003)
- Add aos-spec-selector for spec selection with search (CTX-004)
- Add two-step flow for "Add Story to Spec" action (CTX-005)
- Add CSS styles for all new components in theme.css (CTX-006)

## Technical Details
- All components use Light DOM pattern (createRenderRoot = this)
- Event-driven architecture with Custom Events
- z-index hierarchy: context-menu(1000) < workflow-modal(1001) < confirm-dialog(1002)
- CSS uses existing theme variables (no hardcoded colors)

## Testing Instructions
1. Start the application: `npm run dev`
2. Select a project
3. Right-click anywhere in the application
4. Verify Context Menu appears at mouse position
5. Click "Neue Spec erstellen" - verify Workflow Modal opens
6. Close Modal (ESC or outside click)
7. Right-click again, select "Story zu Spec hinzufuegen"
8. Verify Spec Selector appears, select a spec
9. Verify add-story Workflow Card appears
10. Enter text, try to close - verify Confirm Dialog appears
11. Test "Abbrechen" (stays open) and "Verwerfen" (closes)

## Checklist
- [ ] Lint passes
- [ ] Build passes
- [ ] Manual testing completed
- [ ] Code review approved (CTX-997)
- [ ] Integration validation completed (CTX-998)
```

---

### Completion Check

```bash
# Check for uncommitted changes
git status --porcelain | grep -q . && echo "ERROR: Uncommitted changes" && exit 1 || echo "OK: Clean"

# Lint check
cd agent-os-ui && npm run lint

# Build check
cd agent-os-ui && npm run build

# Create PR (dry-run)
echo "Ready to create PR:"
echo "gh pr create --title 'feat: Add Context Menu for quick workflow access' --body-file pr-template.md"
```
