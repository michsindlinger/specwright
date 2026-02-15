# Finalize Pull Request

> Story ID: CIMG-999
> Spec: Chat Image Attachments
> Created: 2026-02-02
> Last Updated: 2026-02-03
> **Status: Done**

**Priority**: High
**Type**: System
**Estimated Effort**: XS (1 SP)
**Dependencies**: CIMG-998

**PR**: https://github.com/michsindlinger/agent-os-extended-web-ui/pull/12

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

- [x] Keine uncommitted changes
- [x] Branch rebased auf main
- [x] Lint passes
- [x] Build passes
- [x] Tests pass

### PR Content Checklist

- [x] PR Title ist beschreibend
- [x] PR Description enthaelt Summary
- [x] PR Description enthaelt Testing Instructions
- [ ] Labels gesetzt (feature, enhancement, etc.)

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
- [ ] Code implementiert und folgt Style Guide
- [ ] Architektur-Vorgaben eingehalten
- [ ] Security/Performance Anforderungen erfüllt

#### Qualitätssicherung
- [ ] Alle Akzeptanzkriterien erfüllt
- [ ] Unit Tests geschrieben und bestanden
- [ ] Code Review durchgeführt und genehmigt

#### Dokumentation
- [ ] Dokumentation aktualisiert
- [ ] Keine Linting Errors
- [ ] Completion Check Commands alle erfolgreich

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
- Commits aufräumen (squash/rebase wenn nötig)
- Pull Request erstellen mit vollständiger Beschreibung
- Labels und Reviewer zuweisen

**WIE (Architecture Guidance):**
- Pattern: Git Flow / Feature Branch Workflow
- Tool: GitHub CLI (`gh pr create`)
- Constraint: Keine force-push auf shared branches
- Best Practice: Atomic commits mit klaren Messages

**WO:**
- Git Repository: agent-os-web-ui
- Branch: feature/chat-image-attachments
- Target: main

**WER:** dev-team__developer

**Abhängigkeiten:** CIMG-998 (Integration Validation abgeschlossen)

**Geschätzte Komplexität:** XS

**Relevante Skills:** N/A

**Creates Reusable:** no

---

### PR Template

```markdown
## Summary
Add image attachment support to chat interface, allowing users to attach images to messages and leverage Claude's vision capabilities.

## Changes
- Add drag & drop, file input, and clipboard paste for image upload (CIMG-001)
- Add image staging area with thumbnails and remove functionality (CIMG-002)
- Add backend image storage service (CIMG-003)
- Add WebSocket protocol for images with hybrid Base64/HTTP strategy (CIMG-004)
- Add image display in chat messages (CIMG-005)
- Add lightbox component for full-size image viewing (CIMG-006)
- Add Claude Vision integration with --image CLI flag (CIMG-007)

## Testing Instructions
1. Start the application: `npm run dev`
2. Select a project
3. Drag & drop an image into the chat
4. Verify the image appears in the staging area
5. Type a message and send
6. Verify the image appears in the chat message
7. Click the image to open lightbox
8. Press Escape to close lightbox
9. Ask Claude "What do you see in this image?" with an attached image

## Checklist
- [ ] Lint passes
- [ ] Build passes
- [ ] Manual testing completed
- [ ] Code review approved
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
echo "gh pr create --title 'feat: Add chat image attachments' --body-file pr-template.md"
```
