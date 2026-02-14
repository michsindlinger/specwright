# User Stories

> Spec: [SPEC_NAME]
> Created: [CREATED_DATE]
> Last Updated: [LAST_UPDATED_DATE]

## Story Overview

This document contains all user stories for the [SPEC_NAME] specification.

**Total Stories**: [STORY_COUNT]
**Estimated Effort**: [TOTAL_EFFORT]

---

## Story [STORY_NUMBER]: [STORY_TITLE]

**ID**: [STORY_ID]
**Priority**: [PRIORITY]
**Estimated Effort**: [EFFORT_ESTIMATE]
**Dependencies**: [DEPENDENCIES]

### User Story

Als [USER_ROLE]
möchte ich [ACTION],
damit [BENEFIT].

### Akzeptanzkriterien (Prüfbar)

**Datei-Prüfungen:**
- [ ] FILE_EXISTS: [EXACT_FILE_PATH]
- [ ] FILE_NOT_EXISTS: [PATH_THAT_SHOULD_NOT_EXIST]

**Inhalt-Prüfungen:**
- [ ] CONTAINS: [FILE] enthält "[TEXT_OR_PATTERN]"
- [ ] NOT_CONTAINS: [FILE] enthält NICHT "[TEXT]"

**Funktions-Prüfungen:**
- [ ] LINT_PASS: [LINT_COMMAND] exits with code 0
- [ ] TEST_PASS: [TEST_COMMAND] exits with code 0
- [ ] BUILD_PASS: [BUILD_COMMAND] exits with code 0

**Browser-Prüfungen (erfordern MCP-Tool):**
- [ ] MCP_PLAYWRIGHT: [PAGE_URL] loads without errors
- [ ] MCP_PLAYWRIGHT: Element "[SELECTOR]" is visible
- [ ] MCP_SCREENSHOT: Visual comparison passes

**Manuelle Prüfungen (nur wenn unvermeidbar):**
- [ ] MANUAL: [DESCRIPTION_OF_MANUAL_CHECK]

### Required MCP Tools

| Tool | Purpose | Blocking |
|------|---------|----------|
| [TOOL_NAME] | [PURPOSE] | Yes/No |

**Pre-Flight Check:**
```bash
claude mcp list | grep -q "[TOOL_NAME]"
```

**If Missing:** Story wird als BLOCKED markiert

---

### Technisches Refinement (vom Architect)

> **⚠️ WICHTIG:** Dieser Abschnitt wird vom Architect ausgefüllt
> Das technische Refinement muss DIREKT unter der fachlichen User Story stehen.

#### DoR (Definition of Ready) - Vom Architect

**Fachliche Anforderungen:**
- [x] Fachliche requirements klar definiert
- [x] Akzeptanzkriterien sind spezifisch und prüfbar
- [x] Business Value verstanden

**Technische Vorbereitung:**
- [x] Technischer Ansatz definiert (WAS/WIE/WO)
- [x] Abhängigkeiten identifiziert
- [x] Betroffene Komponenten bekannt
- [x] Erforderliche MCP Tools dokumentiert (falls zutreffend)
- [x] Story ist angemessen geschätzt (max 5 Dateien, 400 LOC)

**Story ist READY wenn alle Checkboxen angehakt sind.**

#### DoD (Definition of Done) - Vom Architect

**Implementierung:**
- [ ] Code implementiert und folgt Style Guide
- [ ] Architektur-Vorgaben eingehalten (WIE section)
- [ ] Security/Performance Anforderungen erfüllt

**Qualitätssicherung:**
- [ ] Alle Akzeptanzkriterien erfüllt (via Completion Check verifiziert)
- [ ] Unit Tests geschrieben und bestanden
- [ ] Integration Tests geschrieben und bestanden
- [ ] Code Review durchgeführt und genehmigt

**Dokumentation:**
- [ ] Dokumentation aktualisiert
- [ ] Keine Linting Errors
- [ ] Completion Check Commands alle erfolgreich (exit 0)

**Story ist DONE wenn alle Checkboxen angehakt sind.**

#### Technical Details

**WAS:** [Was für Komponenten/Features erstellt oder modifiziert werden müssen - KEIN Code]

**WIE (Architektur-Guidance ONLY):**
- Welche Architektur-Pattern anwenden (z.B. "Use Repository Pattern", "Apply Service Object")
- Constraints zu beachten (z.B. "Keine direkten DB-Aufrufe aus Controllers", "Must use existing AuthService")
- Existierende Patterns folgen (z.B. "Follow pattern from existing UserController")
- Security/Performance Überlegungen (z.B. "Requires rate limiting", "Use caching")

⚠️ **WICHTIG:** KEIN Implementierungscode, KEIN Pseudo-Code, KEIN detaillierte Algorithmen.
Der implementierende Agent entscheidet WIE er den Code schreibt - du setzt nur Guardrails.

**WO:** [Welche Dateien/Ordner zu modifizieren oder erstellen sind - nur Pfade, kein Inhalt]

**WER:** [Welcher Agent - siehe .claude/agents/dev-team/ für verfügbare Agents]
Beispiele: dev-team__backend-developer, dev-team__frontend-developer

**Abhängigkeiten:** [Story IDs von denen diese Story abhängt, oder "None"]

**Geschätzte Komplexität:** [XS/S/M/L/XL]

#### Completion Check

```bash
# Auto-Verify Commands - alle müssen mit 0 exiten
[VERIFY_COMMAND_1]
[VERIFY_COMMAND_2]
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen

---

[ADDITIONAL_STORIES]

---

## Template Usage Instructions

### Structure

**Jede Story muss folgende Struktur haben:**

1. **Fachliche User Story** (vom PO)
   - User Story Format
   - Akzeptanzkriterien (prüfbar mit FILE_EXISTS, CONTAINS, etc.)
   - Required MCP Tools (falls zutreffend)

2. **Technisches Refinement** (vom Architect) - DIREKT nach fachlicher Story
   - DoR (vom Architect abgehakt)
   - DoD (vom Architect definiert)
   - WAS/WIE/WO/WER Details
   - Completion Check mit bash Commands

**WICHTIG:** Das technische Refinement muss DIREKT unter der fachlichen Story stehen,
nicht am Ende des Dokuments!

### Placeholders

**Document Level**:
- `[SPEC_NAME]`: Name of the parent specification
- `[CREATED_DATE]`: ISO date format (YYYY-MM-DD)
- `[LAST_UPDATED_DATE]`: ISO date format (YYYY-MM-DD)
- `[STORY_COUNT]`: Total number of stories
- `[TOTAL_EFFORT]`: Sum of all story estimates

**Story Level**:
- `[STORY_NUMBER]`: Sequential number (1, 2, 3...)
- `[STORY_TITLE]`: Brief descriptive title
- `[STORY_ID]`: Unique identifier (e.g., PROF-001)
- `[PRIORITY]`: Critical, High, Medium, Low
- `[EFFORT_ESTIMATE]`: Story points (max S/3 SP for automation)
- `[DEPENDENCIES]`: Other story IDs or "None"
- `[USER_ROLE]`: The persona using this feature
- `[ACTION]`: What the user wants to do
- `[BENEFIT]`: Why this matters to the user

**Acceptance Criteria Prefixes**:
- `FILE_EXISTS:` - Verify file exists at path
- `FILE_NOT_EXISTS:` - Verify file does NOT exist
- `CONTAINS:` - Verify file contains text/pattern
- `NOT_CONTAINS:` - Verify file does NOT contain text
- `LINT_PASS:` - Verify lint command passes
- `TEST_PASS:` - Verify test command passes
- `BUILD_PASS:` - Verify build command passes
- `MCP_PLAYWRIGHT:` - Browser verification (requires MCP tool)
- `MCP_SCREENSHOT:` - Visual comparison (requires MCP tool)
- `MANUAL:` - Manual verification required (avoid if possible)

### Guidelines

**Story Sizing** (for automated execution):
- Max 5 files per story
- Max 400 LOC per story
- Max complexity: S (Small, 1-3 SP)
- Single concern per story
- See: specwright/docs/story-sizing-guidelines.md

**Acceptance Criteria**:
- MUST use prefix format (FILE_EXISTS, CONTAINS, etc.)
- MUST be verifiable via bash commands
- MUST include exact file paths
- Avoid MANUAL criteria when possible

**DoR (Definition of Ready)**:
- Architect marks items as done [x] during refinement
- All checkboxes MUST be checked before /execute-tasks
- Story cannot start if DoR is incomplete

**DoD (Definition of Done)**:
- Architect defines completion criteria
- All items start unchecked [ ]
- Implementing agent marks as done [x] during execution
- Story is DONE only when all DoD items are checked

**MCP Tools**:
- Document required tools in "Required MCP Tools" section
- Include Pre-Flight Check command
- See: specwright/docs/mcp-setup-guide.md

**Completion Check**:
- Include bash commands that verify story completion
- All commands must exit with code 0 for story to be DONE

### Example Complete Story

```markdown
## Story 1: Create User Profile API

**ID**: PROF-001
**Priority**: High
**Estimated Effort**: S (2 SP)
**Dependencies**: None

### User Story

Als registered user
möchte ich meine Profildaten via API abrufen,
damit ich mein Profil in der App anzeigen kann.

### Akzeptanzkriterien (Prüfbar)

**Datei-Prüfungen:**
- [ ] FILE_EXISTS: src/api/profile/route.ts
- [ ] FILE_EXISTS: src/api/profile/route.test.ts

**Inhalt-Prüfungen:**
- [ ] CONTAINS: route.ts enthält "export async function GET"
- [ ] CONTAINS: route.ts enthält "currentUser"

**Funktions-Prüfungen:**
- [ ] LINT_PASS: npm run lint exits with 0
- [ ] TEST_PASS: npm test -- profile passes

### Required MCP Tools

_No MCP tools required for this story._

---

### Technisches Refinement (vom Architect)

#### DoR (Definition of Ready)

**Fachliche Anforderungen:**
- [x] Fachliche requirements klar definiert
- [x] Akzeptanzkriterien sind spezifisch und prüfbar
- [x] Business Value verstanden

**Technische Vorbereitung:**
- [x] Technischer Ansatz definiert
- [x] Abhängigkeiten identifiziert (None)
- [x] Betroffene Komponenten bekannt (API Routes, User Service)
- [x] Erforderliche MCP Tools dokumentiert (None)
- [x] Story ist angemessen geschätzt (2 Dateien, ~150 LOC)

**Story ist READY.**

#### DoD (Definition of Done)

**Implementierung:**
- [ ] API Route implementiert (src/api/profile/route.ts)
- [ ] Service Layer Pattern verwendet
- [ ] TypeScript Strict Mode

**Qualitätssicherung:**
- [ ] Alle Akzeptanzkriterien erfüllt
- [ ] Unit Tests für GET Endpoint
- [ ] Code Review bestanden

**Dokumentation:**
- [ ] JSDoc Comments hinzugefügt
- [ ] Keine TypeScript Errors
- [ ] Completion Check erfolgreich

#### Technical Details

**WAS:** API Route für Profil-Abfrage, Integration mit existierendem UserService

**WIE (Architektur-Guidance):**
- Nutze Next.js App Router Route Handlers
- Folge Pattern aus src/api/auth/route.ts
- Keine direkten DB-Aufrufe aus Route (nutze UserService)
- TypeScript Zod Validation für Query Params

**WO:**
- src/api/profile/route.ts (neu)
- src/api/profile/route.test.ts (neu)

**WER:** dev-team__backend-developer

**Abhängigkeiten:** None

**Geschätzte Komplexität:** S

#### Completion Check

```bash
# Auto-Verify
test -f src/api/profile/route.ts && echo "FILE OK"
test -f src/api/profile/route.test.ts && echo "TEST FILE OK"
grep -q "export async function GET" src/api/profile/route.ts && echo "EXPORT OK"
npm run lint --quiet && echo "LINT OK"
npm test -- --grep "profile" && echo "TEST OK"
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen
```
