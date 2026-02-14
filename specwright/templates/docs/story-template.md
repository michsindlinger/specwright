# [STORY_TITLE]

> Story ID: [STORY_ID]
> Spec: [SPEC_NAME]
> Created: [CREATED_DATE]
> Last Updated: [LAST_UPDATED_DATE]

**Priority**: [PRIORITY]
**Type**: [STORY_TYPE]
**Estimated Effort**: [EFFORT_ESTIMATE]
**Dependencies**: [DEPENDENCIES]

---

## Feature

```gherkin
Feature: [FEATURE_NAME]
  Als [USER_ROLE]
  möchte ich [ACTION],
  damit [BENEFIT].
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

> **Gherkin Best Practices:**
> - Ein Verhalten pro Szenario (fokussiert & testbar)
> - Konkrete Werte statt Platzhalter ("100€" nicht "einen Betrag")
> - Nutzer-Perspektive, keine technischen Details
> - Deklarativ: WAS passiert, nicht WIE
> - Max. 2-3 "And"-Schritte pro Abschnitt

### Szenario 1: [SCENARIO_TITLE]

```gherkin
Scenario: [SCENARIO_TITLE]
  Given [PRECONDITION/CONTEXT]
  When [USER_ACTION]
  Then [EXPECTED_OUTCOME]
```

### Szenario 2: [SCENARIO_TITLE]

```gherkin
Scenario: [SCENARIO_TITLE]
  Given [PRECONDITION/CONTEXT]
  And [ADDITIONAL_CONTEXT]
  When [USER_ACTION]
  Then [EXPECTED_OUTCOME]
  And [ADDITIONAL_OUTCOME]
```

### Szenario Outline (für Variationen)

```gherkin
Scenario Outline: [SCENARIO_TITLE]
  Given [PRECONDITION mit <variable>]
  When [ACTION mit <variable>]
  Then [OUTCOME mit <expected>]

  Examples:
    | variable | expected |
    | [value1] | [result1] |
    | [value2] | [result2] |
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: [ERROR_SCENARIO_TITLE]
  Given [ERROR_PRECONDITION]
  When [ACTION_THAT_CAUSES_ERROR]
  Then [EXPECTED_ERROR_HANDLING]
```

---

## Technische Verifikation (Automated Checks)

> **Hinweis:** Diese technischen Prüfungen werden automatisch ausgeführt.
> Sie ergänzen die fachlichen Gherkin-Szenarien mit maschinell prüfbaren Kriterien.

### Datei-Prüfungen

- [ ] FILE_EXISTS: [EXACT_FILE_PATH]
- [ ] FILE_NOT_EXISTS: [PATH_THAT_SHOULD_NOT_EXIST]

### Inhalt-Prüfungen

- [ ] CONTAINS: [FILE] enthält "[TEXT_OR_PATTERN]"
- [ ] NOT_CONTAINS: [FILE] enthält NICHT "[TEXT]"

### Funktions-Prüfungen

- [ ] LINT_PASS: [LINT_COMMAND] exits with code 0
- [ ] TEST_PASS: [TEST_COMMAND] exits with code 0
- [ ] BUILD_PASS: [BUILD_COMMAND] exits with code 0

### Browser-Prüfungen (erfordern MCP-Tool)

- [ ] MCP_PLAYWRIGHT: [PAGE_URL] loads without errors
- [ ] MCP_SCREENSHOT: Visual comparison passes

### Manuelle Prüfungen (nur wenn unvermeidbar)

- [ ] MANUAL: [DESCRIPTION_OF_MANUAL_CHECK]

---

## Required MCP Tools

| Tool | Purpose | Blocking |
|------|---------|----------|
| [TOOL_NAME] | [PURPOSE] | Yes/No |

**Pre-Flight Check:**
```bash
claude mcp list | grep -q "[TOOL_NAME]"
```

**If Missing:** Story wird als BLOCKED markiert

---

## Technisches Refinement (vom Architect)

> **⚠️ WICHTIG:** Dieser Abschnitt wird vom Architect ausgefüllt

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

#### Full-Stack Konsistenz (NEU)
- [x] **Alle betroffenen Layer identifiziert** (Frontend/Backend/Database/DevOps)
- [x] **Integration Type bestimmt** (Backend-only/Frontend-only/Full-stack)
- [x] **Kritische Integration Points dokumentiert** (wenn Full-stack)
- [x] **Handover-Dokumente definiert** (bei Multi-Layer: API Contracts, Data Structures)

**Story ist READY wenn alle Checkboxen angehakt sind.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [ ] Code implementiert und folgt Style Guide
- [ ] Architektur-Vorgaben eingehalten (WIE section)
- [ ] Security/Performance Anforderungen erfüllt

#### Qualitätssicherung
- [ ] Alle Akzeptanzkriterien erfüllt (via Completion Check verifiziert)
- [ ] Unit Tests geschrieben und bestanden
- [ ] Integration Tests geschrieben und bestanden
- [ ] Code Review durchgeführt und genehmigt

#### Dokumentation
- [ ] Dokumentation aktualisiert
- [ ] Keine Linting Errors
- [ ] Completion Check Commands alle erfolgreich (exit 0)

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

> **PFLICHT:** Der Architect MUSS alle betroffenen Layer identifizieren für Full-Stack Konsistenz

**Integration Type:** [Backend-only / Frontend-only / Full-stack]

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | [Komponenten/Dateien] | [Was wird geändert/erstellt] |
| Backend | [Services/Controller] | [Was wird geändert/erstellt] |
| Database | [Tabellen/Schema] | [Was wird geändert/erstellt] |
| DevOps | [Config/Pipeline] | [Was wird geändert/erstellt] |

**Kritische Integration Points:**
- [Integration 1]: [Quelle] → [Ziel] (z.B. "Backend API Response → Frontend UserProfile Component")
- [Integration 2]: [Quelle] → [Ziel] (z.B. "Database Schema → Backend Query")

**Handover-Dokumente (bei Multi-Layer):**
- API Contracts: [Link oder inline definieren]
- Data Structures: [Link oder inline definieren]
- Shared Types: [Link oder inline definieren]

---

### Technical Details

**WAS:** [Was für Komponenten/Features erstellt oder modifiziert werden müssen - KEIN Code]

**WIE (Architektur-Guidance ONLY):**
- Welche Architektur-Pattern anwenden (z.B. "Use Repository Pattern", "Apply Service Object")
- Constraints zu beachten (z.B. "Keine direkten DB-Aufrufe aus Controllers", "Must use existing AuthService")
- Existierende Patterns folgen (z.B. "Follow pattern from existing UserController")
- Security/Performance Überlegungen (z.B. "Requires rate limiting", "Use caching")

⚠️ **WICHTIG:** KEIN Implementierungscode, KEIN Pseudo-Code, KEIN detaillierte Algorithmen.
Der implementierende Agent entscheidet WIE er den Code schreibt - du setzt nur Guardrails.

**WO:** [Welche Dateien/Ordner zu modifizieren oder erstellen sind - nur Pfade, kein Inhalt]

**Domain:** [Optional - Fachlicher Bereich aus .claude/skills/domain-[projekt]/]
Beispiele: user-registration, order-processing, payment-flow

**Abhängigkeiten:** [Story IDs von denen diese Story abhängt, oder "None"]

**Geschätzte Komplexität:** [XS/S/M/L/XL]

---

### Creates Reusable Artifacts

> **Vom Architect auszufüllen:** Markiere "yes" wenn diese Story wiederverwendbare Artefakte erstellt
> (UI-Komponenten, Shared Services, API-Endpunkte, etc.)
> Diese werden nach Spec-Abschluss automatisch ins Project Knowledge aufgenommen.

**Creates Reusable:** [yes/no]

**Reusable Artifacts:** (nur ausfüllen wenn Creates Reusable = yes)

| Artefakt | Typ | Pfad | Beschreibung |
|----------|-----|------|--------------|
| [Name] | [UI/API/Service/Model] | [Dateipfad] | [Kurze Beschreibung] |

<!--
Beispiele:

| Button | UI Component | src/components/ui/Button.tsx | Primary/Secondary Button mit Variants |
| useAuth | Hook | src/hooks/useAuth.ts | Authentication State Hook |
| /api/users | API Endpoint | src/app/api/users/route.ts | User CRUD Operations |
| UserService | Service | src/services/UserService.ts | User Business Logic |
-->

---

### Completion Check

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

## Template Usage Instructions

### Placeholders

**Story Level:**
- `[STORY_ID]`: Unique identifier (e.g., PROF-001)
- `[STORY_TITLE]`: Brief descriptive title
- `[SPEC_NAME]`: Name of the parent specification
- `[CREATED_DATE]`: ISO date format (YYYY-MM-DD)
- `[LAST_UPDATED_DATE]`: ISO date format (YYYY-MM-DD)
- `[PRIORITY]`: Critical, High, Medium, Low
- `[STORY_TYPE]`: Backend, Frontend, DevOps, Test
- `[EFFORT_ESTIMATE]`: Story points (max S/3 SP for automation)
- `[DEPENDENCIES]`: Other story IDs or "None"
- `[DOMAIN_AREA]`: Optional domain area from .claude/skills/domain-[project]/
- `[FEATURE_NAME]`: Kurze Feature-Bezeichnung
- `[USER_ROLE]`: The persona using this feature
- `[ACTION]`: What the user wants to do
- `[BENEFIT]`: Why this matters to the user

**Gherkin Scenario Placeholders:**
- `[SCENARIO_TITLE]`: Kurzer, beschreibender Szenario-Name
- `[PRECONDITION/CONTEXT]`: Ausgangssituation (Given)
- `[ADDITIONAL_CONTEXT]`: Weitere Vorbedingungen (And nach Given)
- `[USER_ACTION]`: Nutzeraktion (When)
- `[EXPECTED_OUTCOME]`: Erwartetes Ergebnis (Then)
- `[ADDITIONAL_OUTCOME]`: Weitere Ergebnisse (And nach Then)
- `[ERROR_SCENARIO_TITLE]`: Fehlerszenario-Name
- `[ERROR_PRECONDITION]`: Fehler-Ausgangssituation
- `[ACTION_THAT_CAUSES_ERROR]`: Aktion die Fehler verursacht
- `[EXPECTED_ERROR_HANDLING]`: Erwartete Fehlerbehandlung

**Technical Verification Prefixes:**
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

**Gherkin Best Practices (WICHTIG für PO):**
- **Ein Verhalten pro Szenario**: Jedes Szenario testet genau ein Outcome
- **Konkrete Werte**: "100€" statt "einen Betrag", "Max Mustermann" statt "ein Benutzer"
- **Nutzer-Perspektive**: Beschreibe aus Sicht des Anwenders, nicht technisch
- **Deklarativ**: Beschreibe WAS passiert, nicht WIE (keine UI-Details wie "klicke Button")
- **Max 2-3 Ands**: Pro Given/When/Then-Abschnitt maximal 2-3 "And"-Zeilen
- **Background für Wiederholungen**: Gemeinsame Vorbedingungen in Background auslagern
- **Scenario Outline für Variationen**: Bei gleicher Logik mit verschiedenen Werten

**Gherkin Anti-Patterns (VERMEIDEN):**
- ❌ Technische Details: "Given ich navigiere zu /login.html"
- ❌ Mehrere Verhaltens-Tests in einem Szenario
- ❌ Vage Beschreibungen: "Given ich habe ein Konto"
- ❌ Zu viele Steps (>10 pro Szenario)
- ❌ Implementation Details im When-Step

**Gherkin Good Examples:**
```gherkin
# ✅ GUT: Konkret, nutzerorientiert, ein Verhalten
Scenario: Erfolgreiche Abhebung bei ausreichendem Guthaben
  Given mein Kontostand beträgt 100€
  When ich 20€ abhebe
  Then sollte mein Kontostand 80€ betragen
  And ich erhalte eine Transaktionsbestätigung

# ❌ SCHLECHT: Technisch, vage, multiple Tests
Scenario: Login und Abhebung
  Given ich bin auf der URL /bank/login
  When ich username und password eingebe
  And ich auf den Submit-Button klicke
  Then werde ich zur Dashboard-Seite weitergeleitet
  And ich sehe mein Konto
  And ich kann Geld abheben
```

**Technical Verification:**
- MUST use prefix format (FILE_EXISTS, CONTAINS, etc.)
- MUST be verifiable via bash commands
- MUST include exact file paths
- Avoid MANUAL criteria when possible
- Technical checks COMPLEMENT Gherkin scenarios (they don't replace them)

**DoR (Definition of Ready):**
- Architect marks items as done [x] during refinement
- All checkboxes MUST be checked before /execute-tasks
- Story cannot start if DoR is incomplete

**DoD (Definition of Done):**
- Architect defines completion criteria
- All items start unchecked [ ]
- Implementing agent marks as done [x] during execution
- Story is DONE only when all DoD items are checked

**MCP Tools:**
- Document required tools in "Required MCP Tools" section
- Include Pre-Flight Check command

**Completion Check:**
- Include bash commands that verify story completion
- All commands must exit with code 0 for story to be DONE
