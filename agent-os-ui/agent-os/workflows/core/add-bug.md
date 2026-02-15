---
description: Add bug to backlog with hypothesis-driven root-cause analysis
globs:
alwaysApply: false
version: 3.1
encoding: UTF-8
---

# Add Bug Workflow

## Overview

Add a bug to the backlog with structured root-cause analysis. Uses hypothesis-driven debugging to identify the actual cause before creating the fix story.

**Key Difference to /add-todo:**
- Includes systematic Root-Cause-Analyse (RCA)
- 3 Hypothesen mit Wahrscheinlichkeiten
- Zuständiger Agent prüft jede Hypothese
- Dokumentierter Analyseprozess
- **NEU: User Hypothesis Dialog** - Benutzer-Wissen VOR der RCA abfragen
- **NEU v3.1: Optionaler PlanAgent-Modus** für komplexe Bug-Fixes mit architektonischen Auswirkungen

**v3.1 Changes (PlanAgent-Integration):**
- **NEW: Step 3.75 - Bug Complexity Assessment** - Automatische Komplexitäts-Einschätzung nach RCA
- **NEW: Optionaler PlanAgent Delegation** - Systematischer Fix-Plan für komplexe Bugs
- **NEW: bug-fix-implementation-plan.md** - Template für strukturierte Fix-Planung
- **NEW: Self-Review für Bug-Fixes** - Kollegen-Methode vor Story-Erstellung
- **NEW: Minimalinvasive Analyse** - Fix mit minimalen Änderungen durchführen
- **ENHANCED: Automatische Empfehlung** - System schlägt Direct vs. Plan vor

**v3.0 Changes (JSON Migration):**
- **BREAKING: JSON statt Markdown** - backlog.json als Single Source of Truth
- **NEW: Structured Data** - Items werden als JSON-Objekte gespeichert
- **NEW: Statistics** - Automatische Berechnung von Backlog-Statistiken
- **NEW: Change Log** - Audit Trail für alle Änderungen
- **REMOVED: story-index.md** - Ersetzt durch backlog.json

**v2.4 Changes:**
- User Hypothesis Dialog (Step 2.5) - Interaktiver Dialog VOR der RCA
- RCA berücksichtigt User-Input - User-Hypothesen werden priorisiert
- Quelle-Spalte in Hypothesen-Tabelle - Zeigt ob Hypothese von User oder Agent

**v2.3 Changes:**
- Gherkin-Style Bug-Fix Stories - Akzeptanzkriterien als Given-When-Then Szenarien
- Bug-spezifische Szenarien - Korrektes Verhalten, Regression-Schutz, Edge-Cases
- Trennung zwischen fachlichen Gherkin-Szenarien und technischer Verifikation

<pre_flight_check>
  EXECUTE: agent-os/workflows/meta/pre-flight.md
</pre_flight_check>

<process_flow>

<step number="1" name="backlog_setup">

### Step 1: Backlog Setup (JSON)

<mandatory_actions>
  1. CHECK: Does agent-os/backlog/ directory exist?
     ```bash
     ls -la agent-os/backlog/ 2>/dev/null
     ```

  2. IF directory NOT exists:
     CREATE: agent-os/backlog/ directory
     CREATE: agent-os/backlog/stories/ subdirectory

  3. CHECK: Does agent-os/backlog/backlog.json exist?

     IF NOT exists:
       CREATE: agent-os/backlog/backlog.json (from template)

       <template_lookup>
         PATH: backlog-template.json

         LOOKUP STRATEGY (MUST TRY BOTH):
           1. READ: agent-os/templates/json/backlog-template.json
           2. IF file not found OR read error:
              READ: ~/.agent-os/templates/json/backlog-template.json
           3. IF both fail: Error - run setup-devteam-global.sh

         ⚠️ WICHTIG: Bei "Error reading file" IMMER den Fallback-Pfad versuchen!
       </template_lookup>

       REPLACE placeholders:
         - {{CREATED_AT}} → Current ISO 8601 timestamp

     ELSE:
       READ: agent-os/backlog/backlog.json
       PARSE: JSON content

  4. USE: date-checker to get current date (YYYY-MM-DD)

  5. DETERMINE: Next bug index for today
     FROM backlog.json:
       FILTER: items where id starts with today's date AND type = "bug"
       COUNT: Number of matching items
     NEXT_INDEX = count + 1 (formatted as 3 digits: 001, 002, etc.)

  6. GENERATE: Bug ID = YYYY-MM-DD-[INDEX]
     Example: 2025-01-15-001, 2025-01-15-002

  7. GENERATE: Slug from bug title
     TRANSFORM: lowercase, replace spaces with hyphens, remove special chars
     Example: "Login nach Reset" → "login-nach-reset"
</mandatory_actions>

</step>

<step number="2" name="bug_description">

### Step 2: Bug Description (PO Phase)

Gather structured bug information from user.

<mandatory_actions>
  1. IF user provided bug description in command:
     EXTRACT: Bug description from input

  2. ASK structured questions:

     **Symptom:**
     - Was genau passiert? (Fehlermeldung, falsches Verhalten, etc.)

     **Reproduktion:**
     - Wie kann der Bug reproduziert werden?
     - Schritt-für-Schritt Anleitung

     **Expected vs. Actual:**
     - Was sollte passieren? (Expected)
     - Was passiert stattdessen? (Actual)

     **Kontext:**
     - Welche Komponente/Seite ist betroffen?
     - Wann tritt es auf? (immer, manchmal, nach bestimmter Aktion)
     - Gibt es Fehlermeldungen in Console/Logs?

  3. DETERMINE: Bug-Typ
     - Frontend (UI, JavaScript, Styling)
     - Backend (API, Logik, Database)
     - DevOps (Build, Deployment, Infrastructure)
     - Integration (Zusammenspiel mehrerer Komponenten)

  4. DETERMINE: Severity
     - Critical: System unbenutzbar
     - High: Wichtige Funktion kaputt
     - Medium: Funktion eingeschränkt
     - Low: Kosmetisch oder Workaround vorhanden
</mandatory_actions>

</step>

<step number="2.5" name="user_hypothesis_dialog">

### Step 2.5: User Hypothesis Dialog

⚠️ **QUALITÄTSBOOSTER:** Benutzer-Wissen VOR der automatischen RCA abfragen.
Der Benutzer kennt oft das System besser und hat möglicherweise bereits untersucht.

<mandatory_actions>
  1. ASK user via AskUserQuestion:

     ```
     Question: "Haben Sie bereits eigene Vermutungen zur Ursache des Bugs?"

     Options:
     1. Ja, ich habe Vermutungen
        → Ich habe eine Idee, wo der Fehler liegen könnte

     2. Ich habe bereits selbst gesucht
        → Ich habe schon untersucht und kann Erkenntnisse teilen

     3. Nein, keine Ahnung
        → Ich habe keine Vermutung, Agent soll analysieren

     4. Ich möchte diskutieren
        → Lass uns gemeinsam überlegen
     ```

  2. BASED ON user choice:

     **IF "Ja, ich habe Vermutungen":**

     ASK follow-up questions (iterativ):

     a) "In welchem Bereich vermuten Sie den Fehler?"
        - Frontend (UI, Komponenten, State)
        - Backend (API, Services, Logik)
        - Datenbank (Queries, Schema)
        - Integration (Zusammenspiel)
        - Konfiguration (Environment, Settings)

     b) "Welche Dateien oder Komponenten haben Sie im Verdacht?"
        - Konkrete Dateinamen/Pfade
        - Komponenten-Namen
        - Funktionen/Methoden

     c) "Was könnte die Ursache sein?"
        - Freie Beschreibung der Vermutung
        - Warum vermuten Sie das?

     DOCUMENT:
     ```
     User-Hypothese:
     - Vermuteter Bereich: [BEREICH]
     - Verdächtige Dateien: [DATEIEN]
     - Vermutete Ursache: [BESCHREIBUNG]
     - Begründung: [WARUM]
     ```

     **IF "Ich habe bereits selbst gesucht":**

     ASK follow-up questions:

     a) "Welche Stellen haben Sie bereits untersucht?"
        - Dateien die geprüft wurden
        - Logs die analysiert wurden
        - Tests die durchgeführt wurden

     b) "Was haben Sie dabei festgestellt?"
        - Auffälligkeiten
        - Fehlermeldungen
        - Unerwartetes Verhalten

     c) "Was können wir definitiv ausschließen?"
        - Bereiche die NICHT die Ursache sind
        - Komponenten die korrekt funktionieren

     DOCUMENT:
     ```
     User-Recherche:
     - Bereits untersucht: [STELLEN]
     - Erkenntnisse: [FESTSTELLUNGEN]
     - Ausgeschlossen: [BEREICHE]
     ```

     **IF "Nein, keine Ahnung":**

     ACKNOWLEDGE: "Kein Problem, der Agent wird systematisch analysieren."
     PROCEED: Direkt zu Step 3 ohne User-Hypothesen

     **IF "Ich möchte diskutieren":**

     ENGAGE in dialog:

     a) "Was wissen wir über das Problem?"
        - Zusammenfassung aus Step 2

     b) "Wo könnte man anfangen zu suchen?"
        - Gemeinsam Ideen sammeln

     c) "Gibt es ähnliche Probleme in der Vergangenheit?"
        - Bekannte Patterns
        - Wiederkehrende Issues

     d) "Was würden Sie als erstes prüfen?"
        - Priorisierung der Untersuchung

     DOCUMENT: Alle Diskussions-Ergebnisse

  3. COMPILE User-Input für Step 3:

     <user_input_summary>
       ## User-Input zur Bug-Analyse

       **Hat der User Vermutungen:** Ja/Nein

       **User-Hypothesen:**
       [Falls vorhanden - Vermutungen des Users]

       **Bereits untersucht:**
       [Falls vorhanden - was der User schon geprüft hat]

       **Ausgeschlossene Bereiche:**
       [Falls vorhanden - was definitiv NICHT die Ursache ist]

       **Diskussions-Erkenntnisse:**
       [Falls diskutiert - gemeinsame Überlegungen]

       **Priorisierte Untersuchungs-Bereiche:**
       [Falls vorhanden - wo zuerst suchen]
     </user_input_summary>

  4. PASS user_input_summary to Step 3
</mandatory_actions>

<instructions>
  ACTION: Benutzer-Wissen vor RCA abfragen
  FORMAT: AskUserQuestion mit Follow-up Dialog
  DOCUMENT: Alle User-Inputs strukturiert
  VALUE: Verbessert RCA-Qualität signifikant
  SKIP: Nur wenn User "Keine Ahnung" wählt
</instructions>

</step>

<step number="3" name="hypothesis_driven_rca">

### Step 3: Hypothesis-Driven Root-Cause-Analyse

⚠️ **KERNSTÜCK:** Systematische Fehleranalyse statt blindes Suchen.

<determine_agent>
  BASED ON bug_type (from Step 2):

  IF bug_type = "Frontend":
    AGENT = dev-team__frontend-developer-*
  ELSE IF bug_type = "Backend":
    AGENT = dev-team__backend-developer-*
  ELSE IF bug_type = "DevOps":
    AGENT = dev-team__devops-specialist
  ELSE IF bug_type = "Integration":
    AGENT = dev-team__architect

  FALLBACK: If specific agent not available, use dev-team__architect
</determine_agent>

<delegation>
  DELEGATE to [AGENT] via Task tool:

  PROMPT:
  "Führe eine Hypothesis-Driven Root-Cause-Analyse durch.

  **Bug-Symptom:**
  [Bug description from Step 2]

  **Reproduktionsschritte:**
  [Steps from Step 2]

  **Expected:** [Expected behavior]
  **Actual:** [Actual behavior]

  **Betroffene Komponente:** [Component]

  ---

  ## User-Input aus Vorgespräch (Step 2.5)

  ⚠️ **WICHTIG:** Der Benutzer hat folgende Informationen geteilt.
  Diese MÜSSEN in deine Hypothesen einfließen!

  [USER_INPUT_SUMMARY from Step 2.5]

  **Anweisungen zur Nutzung des User-Inputs:**

  - **User-Hypothesen:** Wenn der User eine Vermutung hat, mache diese zur
    Hypothese #1 oder #2 (hohe Priorität). Der User kennt das System!

  - **Bereits untersucht:** Bereiche die der User schon geprüft hat, können
    mit niedrigerer Priorität behandelt werden (aber nicht ausschließen).

  - **Ausgeschlossene Bereiche:** Diese kannst du als "unwahrscheinlich"
    markieren, aber prüfe sie trotzdem wenn andere Hypothesen scheitern.

  - **Verdächtige Dateien:** Beginne deine Analyse mit diesen Dateien!

  ---

  ## Deine Aufgabe: Root-Cause-Analyse

  ### Phase 1: Hypothesen aufstellen

  Basierend auf dem Symptom UND dem User-Input, stelle 3 wahrscheinliche Ursachen auf.
  Ordne jeder Hypothese eine Wahrscheinlichkeit zu (muss 100% ergeben).

  ⚠️ **User-Hypothesen priorisieren:** Wenn der User eine Vermutung geteilt hat,
  sollte diese als Hypothese #1 oder #2 erscheinen (es sei denn, sie ist
  offensichtlich falsch).

  FORMAT:
  | # | Hypothese | Wahrscheinlichkeit | Quelle | Prüfmethode |
  |---|-----------|-------------------|--------|-------------|
  | 1 | [Vermutung] | XX% | User/Agent | [Wie prüfen - konkret] |
  | 2 | [Vermutung] | XX% | User/Agent | [Wie prüfen - konkret] |
  | 3 | [Vermutung] | XX% | Agent | [Wie prüfen - konkret] |

  REGELN für Hypothesen:
  - **User-Input hat Vorrang** - User kennt das System oft besser
  - Beginne mit der wahrscheinlichsten Ursache (höchster %)
  - Hypothesen müssen prüfbar sein
  - Prüfmethode muss konkret sein (Datei lesen, Log prüfen, Code analysieren)
  - Keine vagen Vermutungen ('irgendwo im Code')
  - Markiere ob Hypothese vom User oder Agent stammt

  ### Phase 2: Hypothesen prüfen

  Prüfe jede Hypothese der Reihe nach (höchste Wahrscheinlichkeit zuerst).

  FORMAT für jede Prüfung:
  ```
  **Hypothese X prüfen:** [Hypothese]
  - Aktion: [Was du konkret geprüft hast]
  - Befund: [Was du gefunden hast - Code-Snippets, Logs, etc.]
  - Ergebnis: ❌ Ausgeschlossen / ✅ BESTÄTIGT
  - Begründung: [Warum ausgeschlossen oder bestätigt]
  ```

  REGELN für Prüfung:
  - Prüfe TATSÄCHLICH (lies Code, prüfe Logs, analysiere Daten)
  - Dokumentiere konkrete Befunde (Zeilen, Werte, Fehlermeldungen)
  - Stoppe wenn Root Cause gefunden (✅ BESTÄTIGT)
  - Wenn H1 ausgeschlossen → H2 prüfen → H3 prüfen

  ### Phase 3: Root Cause dokumentieren

  Wenn Root Cause gefunden:

  ```
  ## ROOT CAUSE

  **Ursache:** [Klare Beschreibung der Ursache]

  **Beweis:** [Konkreter Nachweis - Code, Logs, etc.]

  **Betroffene Dateien:**
  - [Datei 1]: [Was ist dort falsch]
  - [Datei 2]: [Was ist dort falsch]

  **Fix-Ansatz:** [Kurze Beschreibung wie zu beheben]
  ```

  ### Falls KEINE Hypothese bestätigt:

  Wenn alle 3 Hypothesen ausgeschlossen:
  1. Stelle 3 NEUE Hypothesen auf (andere Richtung)
  2. Wiederhole Prüfung
  3. Maximal 2 Runden, dann eskalieren an User

  ---

  WICHTIG:
  - Sei gründlich aber effizient
  - Dokumentiere jeden Schritt
  - Finde die ECHTE Ursache, nicht nur Symptome
  - Gib mir am Ende den vollständigen Analyse-Bericht zurück"

  WAIT for agent completion

  RECEIVE: Root-Cause-Analyse Bericht
</delegation>

</step>

<step number="3.5" name="fix_impact_layer_analysis">

### Step 3.5: Fix-Impact Layer Analysis (NEU)

⚠️ **PFLICHT:** Basierend auf RCA analysieren, welche Layer vom Fix betroffen sind.

<mandatory_actions>
  1. EXTRACT from RCA (Step 3):
     - Root Cause (confirmed hypothesis)
     - Betroffene Dateien (from analysis)
     - Fix-Ansatz (proposed fix)

  2. ANALYZE fix impact across layers:
     ```
     Fix-Impact Layer Checklist:
     - [ ] Frontend (UI behavior, components, state)
     - [ ] Backend (API response, services, logic)
     - [ ] Database (data integrity, queries)
     - [ ] Integration (connections between layers)
     - [ ] Tests (affected test files)
     ```

  3. FOR EACH potentially affected layer:
     ASSESS:
     - Direct impact: Layer where bug originates
     - Indirect impact: Layers that depend on the fix
     - Test coverage: Tests that verify the fix

  4. IDENTIFY Integration Points:
     IF bug fix affects data flow between layers:
       DOCUMENT: Connection points that need verification
       Example: "Backend API response change → Frontend must handle new field"

  5. DETERMINE Fix Scope:
     - IF only 1 layer affected: "[Layer]-only fix"
     - IF 2+ layers affected: "Full-stack fix"
       ⚠️ WARNING: "Full-stack bug fix - ensure all layers are updated"

  6. GENERATE Fix-Impact Summary:
     ```
     Fix Type: [Backend-only / Frontend-only / Full-stack]
     Affected Layers:
       - [Layer 1]: [Direct/Indirect] - [Impact description]
       - [Layer 2]: [Direct/Indirect] - [Impact description]
     Critical Integration Points:
       - [Point 1]: [Source] → [Target] - [Needs verification]
     Required Tests:
       - [Test scope per layer]
     ```

  7. PASS Fix-Impact Summary to:
     - Step 4 (Bug Story File creation)
     - Step 5 (Architect Refinement)
</mandatory_actions>

<output>
  Fix-Impact Summary:
  - Fix Type (scope)
  - Affected Layers with direct/indirect impact
  - Critical Integration Points
  - Required test coverage per layer
</output>

</step>

<step number="3.75" name="bug_complexity_assessment">

### Step 3.75: Bug Complexity Assessment & Plan-Mode Decision (NEU v3.1)

⚠️ **ENTSCHEIDUNGSPUNKT:** Nach RCA und Fix-Impact Analyse entscheiden, ob der Fix direkt geplant wird oder über PlanAgent.

**Zweck:** Komplexe Bug-Fixes mit architektonischen Auswirkungen erhalten denselben systematischen Plan-Prozess wie Features.

<assessment_process>

**Phase 1: Automatische Komplexitäts-Analyse**

EXTRACT from previous steps:
- Root Cause (Step 3)
- Fix-Impact Summary (Step 3.5)
- Affected file count
- Complexity indicators

CALCULATE Complexity Score:
```
Complexity Indicators:
- affected_files > 5: +3 points
- affected_files > 3: +1 point
- fix_type = "Full-stack": +2 points
- complexity_rating >= M: +2 points
- complexity_rating >= L: +4 points
- systemic_issue_detected: +3 points
- integration_points_count > 2: +1 point

Score Interpretation:
- 0-2 points: SIMPLE → Direct Fix (empfohlen)
- 3-5 points: MODERATE → User Choice fragen
- 6+ points: COMPLEX → PlanAgent (empfohlen)
```

</assessment_process>

<decision_flow>

**Phase 2: Entscheidung präsentieren**

BASED ON Complexity Score:

**IF Score <= 2 (SIMPLE):**

INFORM user:
```
✅ Bug-Analyse abgeschlossen.

**Fix-Einschätzung:** Geringer Komplexität
- Betroffene Dateien: [count]
- Fix-Type: [type]
- Empfehlung: Direkter Fix (Architect erstellt Story)

Der Bug kann direkt als Story geplant werden.
```

PROCEED: To Step 4 (Create Bug Story) - SKIP PlanAgent

---

**IF Score >= 6 (COMPLEX):**

INFORM user:
```
⚠️ Bug-Analyse abgeschlossen - ACHTUNG: Hohe Komplexität!

**Fix-Einschätzung:** Komplexer architektonischer Fix
- Betroffene Dateien: [count]
- Fix-Type: [type]
- Systemic Issue: [yes/no]
- Integration Points: [count]
- Empfehlung: PlanAgent für systematischen Fix-Plan

Gründe für PlanAgent:
- [Grund 1: z.B. "Betrifft >5 Dateien"]
- [Grund 2: z.B. "Full-stack Fix mit vielen Integration Points"]
- [Grund 3: z.B. "Architektonische Änderung erforderlich"]

Vorteile mit PlanAgent:
- Systematischer Fix-Plan mit Self-Review
- Minimalinvasive Analyse (kleinster möglicher Fix)
- Validierung aller Integration Points
- Klare Phasen für sichere Implementierung
```

ASK via AskUserQuestion:
```
Question: "Wie soll der komplexe Bug-Fix geplant werden?"

Options:
1. PlanAgent verwenden (Empfohlen)
   → Systematischer Fix-Plan erstellen
   → Self-Review und Minimalinvasiv-Analyse
   → Sicherere Implementierung

2. Direkter Fix (Schnell)
   → Architect erstellt Story
   → Risiko: Integration-Probleme möglich
   → Empfohlen nur bei Zeitdruck

3. Zur /create-spec wechseln
   → Wenn Bug Feature-Änderungen erfordert
   → Vollständige Spec-Planung
```

WAIT for user choice

---

**IF Score 3-5 (MODERATE):**

INFORM user:
```
✅ Bug-Analyse abgeschlossen.

**Fix-Einschätzung:** Mittlere Komplexität
- Betroffene Dateien: [count]
- Fix-Type: [type]
- Bewertung: Grenzfall

Der Bug lässt sich beide Wege planen.
```

ASK via AskUserQuestion:
```
Question: "Wie soll der Bug-Fix geplant werden?"

Options:
1. Direkter Fix (Empfohlen für mittlere Komplexität)
   → Schnell, effizient
   → Architect erstellt Story basierend auf RCA

2. PlanAgent verwenden
   → Systematischer Fix-Plan mit Self-Review
   → Für extra Sicherheit bei Integration

3. Automatisch entscheiden
   → System wählt basierend auf Best Practices
```

WAIT for user choice

**IF "Automatisch entscheiden":**
IF score <= 4: PROCEED to Step 4 (Direct Fix)
ELSE: PROCEED to PlanAgent

</decision_flow>

<planagent_delegation>

**Phase 3: PlanAgent Delegation (wenn gewählt)**

EXECUTE only if user chose "PlanAgent" OR automatic decision favored it.

DELEGATE to Plan Agent via Task tool:

PROMPT:
"""
Create a detailed Bug-Fix Implementation Plan for the following root cause analysis.

⚠️ **CRITICAL: This is a BUG FIX PLANNING task only!**
- You are creating a strategic fix plan based on Root Cause
- NO implementation code, NO detailed file paths yet
- Focus on: What to fix, how to minimize changes, execution phases
- Output: bug-fix-implementation-plan.md document

**Input Context:**
- Bug Description: [from Step 2]
- Root Cause Analysis: [from Step 3]
- Fix-Impact Summary: [from Step 3.5]
- Tech Stack: agent-os/product/tech-stack.md
- Architecture: agent-os/product/architecture-structure.md (if exists)

## Your Task: Create Bug-Fix Implementation Plan

### Step 1: Load Bug Context

ANALYZE the complete bug analysis:
- Root Cause (confirmed hypothesis)
- Affected files (from RCA)
- Fix-Impact Summary (layers, integration points)
- User-Hypothesen (if any from Step 2.5)

### Step 2: Create Bug-Fix Implementation Plan

CREATE file: agent-os/backlog/stories/bug-[BUG_ID]-fix-plan.md

Use template (hybrid lookup):
- TRY: agent-os/templates/docs/bug-fix-implementation-plan-template.md
- FALLBACK: ~/.agent-os/templates/docs/bug-fix-implementation-plan-template.md

Fill with:
- **Executive Summary** - What is the fix and why (2-3 sentences)
- **Root Cause Summary** - Brief RC description
- **Fix Strategy** - Overall approach (minimal change vs. comprehensive)
- **Affected Components** - What needs to change (table format)
- **Fix Phases** - Step-by-step execution plan
- **Risk Assessment** - What could go wrong
- **Rollback Plan** - How to revert if needed
- **Regression Prevention** - How to ensure no new bugs

### Step 3: Critical Self-Review (Kollegen-Methode)

Perform a critical review of your fix plan:

```
Bug-Fix Self-Review Checklist:

1. CORRECTNESS
   - Does the fix address the Root Cause directly?
   - Are all affected layers covered?
   - Are integration points validated?

2. MINIMAL IMPACT (CRITICAL!)
   - Is this the SMALLEST possible fix?
   - Can we achieve the goal with fewer changes?
   - Are any changes unnecessary?

3. SAFETY
   - What could break?
   - Are there edge cases not covered?
   - Is rollback possible?

4. TESTING
   - How do we verify the fix works?
   - What regression tests are needed?
   - Are integration points tested?

If you find problems, suggest improvements that fix the bug
with MINIMAL changes while maintaining CORRECTNESS.
```

Output: Fill `## Self-Review Results` section in the plan

### Step 4: Minimal-Invasive Analysis

1. Analyze the fix plan for minimal invasiveness:
```
Minimal-Invasiv Check:

1. REUSE EXISTING CODE
   - Can existing patterns be applied?
   - Are there similar bug-fix patterns to follow?

2. MINIMIZE CHANGE SCOPE
   - Which files MUST be changed? (mark essential)
   - Which changes are NICE-TO-HAVE? (defer)

3. PRESERVE FUNCTIONALITY (CRITICAL!)
   - Validate: NO working feature is broken!
   - Every change must preserve existing behavior
   - Only the bug is eliminated

Optimize the plan based on your findings.
Document each optimization with rationale.
```

2. Output: Fill `## Minimal-Invasive Optimizations` section in the plan

3. Bug-Preservation Checklist:
   - [ ] Root Cause is addressed
   - [ ] No working features are broken
   - [ ] All integration points covered
   - [ ] Regression tests planned

### Step 5: Mark Plan as Ready for Review

Set status in bug-fix-implementation-plan.md to "PENDING_USER_REVIEW"
"""

WAIT for Plan Agent completion

RECEIVE:
  - agent-os/backlog/stories/bug-[BUG_ID]-fix-plan.md (complete with self-review and optimizations)

</planagent_delegation>

<user_review>

**Phase 4: Plan Review (nach PlanAgent)**

1. PRESENT den Bug-Fix Plan dem User

2. HIGHLIGHT key sections:
```
📋 Bug-Fix Plan erstellt

**Executive Summary:**
[Ausgabe aus Plan]

**Fix Strategy:** [Minimal / Comprehensive]
**Affected Files:** [Anzahl]
**Estimated Complexity:** [nach Optimierung]

**Key Recommendations from PlanAgent:**
- [Empfehlung 1 aus Minimal-Invasive Optimizations]
- [Empfehlung 2 aus Self-Review]
```

3. ASK user via AskUserQuestion:
   ```
   Question: "Der PlanAgent hat einen Bug-Fix Plan erstellt. Der Plan enthält
              Self-Review und Minimalinvasiv-Optimierungen."

   Options:
   1. Plan genehmigen
      → Weiter zu Step 4 (Bug Story aus Plan erstellen)

   2. Im Editor öffnen
      → Ich zeige dir den Dateipfad
      → Du bearbeitest die Datei
      → Sage 'fertig' wenn du bereit bist

   3. Änderungen besprechen
      → Beschreibe die gewünschten Anpassungen
      → Ich aktualisiere den Plan

   4. Zurück zur RCA
      → Plan passt nicht, neue Analyse nötig
      → Zurück zu Step 3
   ```

4. BASED on user choice:
   - If "Plan genehmigen":
     - Set Status: APPROVED
     - PROCEED to Step 4 (Create Bug Story from Plan)

   - If "Im Editor öffnen":
     - SHOW: "Der Plan liegt unter: agent-os/backlog/stories/bug-[BUG_ID]-fix-plan.md"
     - WAIT for user confirmation
     - READ plan again
     - VALIDATE changes still fix the Root Cause
     - Re-ask approval

   - If "Änderungen besprechen":
     - COLLECT user feedback
     - For significant changes: Re-delegate to Plan Agent
     - For minor changes: Update directly
     - Re-ask approval

   - If "Zurück zur RCA":
     - RETURN to Step 3

</user_review>

<instructions>
  ACTION: Assess bug complexity after RCA and Fix-Impact analysis
  CALCULATE: Complexity score based on multiple indicators
  PRESENT: Clear recommendation with reasoning
  DELEGATE: To PlanAgent for complex bugs (score >= 6 or user choice)
  REQUIRE: User approval before proceeding
  REFERENCE: agent-os/standards/bug-fix-planning-guidelines.md (if exists)
</instructions>

**Output (Step 3.75):**
- Complexity Assessment report
- User decision on planning approach
- agent-os/backlog/stories/bug-[BUG_ID]-fix-plan.md (APPROVED, if PlanAgent used)
- OR: Proceed to Step 4 with RCA only (if Direct Fix chosen)

</step>

<step number="4" name="create_bug_story">

### Step 4: Create Bug Story File

⚠️ **v3.1:** Unterstützt zwei Pfade:
- **Direct Fix Path:** Story wird direkt aus RCA erstellt (Steps 2-3.5)
- **PlanAgent Path:** Story wird aus genehmigtem Fix-Plan erstellt (Step 3.75)

<mandatory_actions>

**PATH A: Direct Fix (wenn Step 3.75 Direct Fix gewählt)**

IF coming from Direct Fix path (no fix-plan exists):
  1. GENERATE: File name
     FORMAT: bug-[YYYY-MM-DD]-[INDEX]-[slug].md
     Example: bug-2025-01-15-001-login-after-reset.md

  2. CREATE bug story file with RCA included (bestehendes Template)

  3. FILL in all fields from:
     - Step 2 (Bug Description)
     - Step 3 (RCA - vollständig übernehmen)
     - Step 3.5 (Fix-Impact Summary)

  4. LEAVE Architect sections partially empty (Step 5 fills them)

**PATH B: PlanAgent (wenn Step 3.75 PlanAgent gewählt)**

IF coming from PlanAgent path (fix-plan.md exists):
  1. GENERATE: File name
     FORMAT: bug-[YYYY-MM-DD]-[INDEX]-[slug].md
     Example: bug-2025-01-15-001-login-after-reset.md

  2. CHECK: Does fix-plan exist?
     ```bash
     ls agent-os/backlog/stories/bug-[BUG_ID]-fix-plan.md
     ```

  3. CREATE bug story file with Fix-Plan reference:

     <bug_story_template_with_plan>
       # 🐛 [BUG_TITLE]

       > Bug ID: [BUG_ID]
       > Created: [DATE]
       > Severity: [SEVERITY]
       > Status: Ready
       > Planning: PlanAgent v3.1

       **Priority**: [PRIORITY]
       **Type**: Bug - [Frontend/Backend/DevOps]
       **Affected Component**: [COMPONENT]
       **Fix Plan**: bug-[BUG_ID]-fix-plan.md

       ---

       ## Bug Description

       [Kurzbeschreibung aus Fix-Plan Executive Summary]

       ### Symptom
       [Bug symptom description]

       ### Reproduktion
       1. [Step 1]
       2. [Step 2]
       3. [Step 3]

       ### Expected vs. Actual
       - **Expected:** [What should happen]
       - **Actual:** [What happens instead]

       ---

       ## Root-Cause-Analyse (zusammenfassend)

       > **Vollständige RCA im Fix-Plan:** bug-[BUG_ID]-fix-plan.md

       **Root Cause:** [Kurze Zusammenfassung aus Plan]

       **Betroffene Dateien:**
       - [Datei 1]
       - [Datei 2]

       ---

       ## Bug-Fix Implementation Plan

       > **Detaillierter Fix-Plan:** bug-[BUG_ID]-fix-plan.md

       ### Fix Strategy (aus Plan)
       - [Fix-Strategie aus Plan]
       - [Begründung aus Minimal-Invasive Optimizations]

       ### Fix Phases (aus Plan)
       1. [Phase 1 aus Plan]
       2. [Phase 2 aus Plan]
       3. [Phase 3 aus Plan]

       ### Key Optimizations (aus Plan)
       - [Optimierung 1 aus Self-Review]
       - [Optimierung 2 aus Minimal-Invasive Analysis]

       ---

       ## Feature (Bug-Fix)

       ```gherkin
       Feature: [BUG_TITLE] beheben
         Als [USER_ROLE]
         möchte ich dass [BUG_DESCRIPTION] behoben wird,
         damit [BENEFIT/EXPECTED_BEHAVIOR].
       ```

       ---

       ## Akzeptanzkriterien (Gherkin-Szenarien)

       ### Szenario 1: Korrektes Verhalten (was vorher fehlschlug)

       ```gherkin
       Scenario: [ORIGINAL_BUG_SCENARIO] funktioniert korrekt
         Given [AUSGANGSSITUATION die vorher zum Bug führte]
         When [AKTION die vorher den Bug auslöste]
         Then [KORREKTES_ERWARTETES_VERHALTEN]
         And [KEINE_FEHLERMELDUNG_ODER_FALSCHES_VERHALTEN]
       ```

       ### Szenario 2: Regression-Schutz

       ```gherkin
       Scenario: Verwandte Funktionalität bleibt intakt
         Given [SETUP für verwandte Funktion]
         When [VERWANDTE_AKTION]
         Then [ERWARTETES_VERHALTEN bleibt unverändert]
       ```

       ---

       ## Technische Verifikation

       - [ ] BUG_FIXED: [Description aus Fix-Plan]
       - [ ] TEST_PASS: [Regression tests aus Plan]
       - [ ] LINT_PASS: No linting errors
       - [ ] PLAN_VALIDATED: Fix-Plan Phase[n] completed

       ---

       ## Technisches Refinement (vom Architect)

       > **⚠️ WICHTIG:** Dieser Abschnitt wird vom Architect ausgefüllt
       > **HINWEIS:** Fix-Plan enthält bereits strategische Anleitung

       ### DoR (Definition of Ready) - Vom Architect

       #### Bug-Analyse (aus Fix-Plan)
       - [x] Bug reproduzierbar
       - [x] Root Cause identifiziert
       - [x] Betroffene Dateien bekannt
       - [x] Fix-Plan genehmigt

       #### Technische Vorbereitung
       - [ ] Fix-Ansatz aus Plan in WAS/WIE/WO übertragen
       - [ ] Abhängigkeiten identifiziert
       - [ ] Risiken aus Plan bewertet

       **Bug ist READY wenn alle Checkboxen angehakt sind.**

       ---

       ### DoD (Definition of Done) - Vom Architect

       - [ ] Alle Fix-Phasen aus Plan abgeschlossen
       - [ ] Regression Tests aus Plan hinzugefügt
       - [ ] Keine neuen Bugs eingeführt (Rollback-Plan aus Plan konsultiert)
       - [ ] Code Review durchgeführt
       - [ ] Original Reproduktionsschritte führen nicht mehr zum Bug

       **Bug ist DONE wenn alle Checkboxen angehakt sind.**

       ---

       ### Betroffene Layer & Komponenten (aus Fix-Plan)

       > **PFLICHT:** Übernommen aus Fix-Plan "Affected Components"

       **Fix Type:** [aus Fix-Plan]

       **Betroffene Komponenten:**

       | Layer | Komponenten | Impact | Änderung |
       |-------|-------------|--------|----------|
       | [aus Fix-Plan] | [aus Fix-Plan] | [aus Fix-Plan] | [aus Fix-Plan] |

       **Kritische Integration Points:**
       - [aus Fix-Plan]

       ---

       ### Technical Details

       **WAS:** [Übernommen aus Fix-Plan Fix Phases]

       **WIE (Architektur-Guidance ONLY):**
       - [Übernommen aus Fix-Plan Strategy]
       - [Constraints aus Fix-Plan]

       **WO:** [Dateien aus Fix-Plan Affected Components]

       **WER:** [Agent based on bug type]

       **Abhängigkeiten:** None (oder aus Fix-Plan)

       **Geschätzte Komplexität:** [aus Fix-Plan nach Optimierung]

       ---

       ### Completion Check

       ```bash
       # Verify bug is fixed (aus Fix-Plan)
       [VERIFY_COMMANDS aus Fix-Plan]
       ```

       **Bug ist DONE wenn:**
       1. Alle Fix-Phasen abgeschlossen
       2. Regression Tests aus Plan bestehen
       3. Keine verwandten Fehler auftreten
     </bug_story_template_with_plan>

  4. FILL in all fields from:
     - Fix-Plan (agent-os/backlog/stories/bug-[BUG_ID]-fix-plan.md)
     - Bug Description (Step 2)
     - RCA Summary (aus Fix-Plan)

  5. LEAVE Architect sections partially empty (Step 5 fills them)
     - NOTE: Architect überträgt strategische Anleitung aus Plan in WAS/WIE/WO

**BEIDE PFADE:**

     <bug_story_template>
       # 🐛 [BUG_TITLE]

       > Bug ID: [BUG_ID]
       > Created: [DATE]
       > Severity: [SEVERITY]
       > Status: Ready

       **Priority**: [PRIORITY]
       **Type**: Bug - [Frontend/Backend/DevOps]
       **Affected Component**: [COMPONENT]

       ---

       ## Bug Description

       ### Symptom
       [Bug symptom description]

       ### Reproduktion
       1. [Step 1]
       2. [Step 2]
       3. [Step 3]

       ### Expected vs. Actual
       - **Expected:** [What should happen]
       - **Actual:** [What happens instead]

       ---

       ## User-Input (aus Step 2.5)

       > Dokumentation des Benutzer-Wissens vor der RCA

       **Hat User Vermutungen geteilt:** [Ja/Nein]

       ### User-Hypothesen
       [Falls vorhanden - Vermutungen des Users]
       - Vermuteter Bereich: [BEREICH]
       - Verdächtige Dateien: [DATEIEN]
       - Vermutete Ursache: [BESCHREIBUNG]

       ### Bereits vom User untersucht
       [Falls vorhanden - was der User schon geprüft hat]

       ### Ausgeschlossene Bereiche
       [Falls vorhanden - was definitiv NICHT die Ursache ist]

       ---

       ## Root-Cause-Analyse

       ### Hypothesen (vor Analyse)

       | # | Hypothese | Wahrscheinlichkeit | Quelle | Prüfmethode |
       |---|-----------|-------------------|--------|-------------|
       | 1 | [H1] | XX% | User/Agent | [Method] |
       | 2 | [H2] | XX% | User/Agent | [Method] |
       | 3 | [H3] | XX% | Agent | [Method] |

       ### Prüfung

       **Hypothese 1 prüfen:** [H1]
       - Aktion: [What was checked]
       - Befund: [What was found]
       - Ergebnis: [❌/✅]
       - Begründung: [Why]

       [... weitere Hypothesen ...]

       ### Root Cause

       **Ursache:** [Root cause description]

       **Beweis:** [Evidence]

       **Betroffene Dateien:**
       - [File 1]
       - [File 2]

       ---

       ## Feature (Bug-Fix)

       ```gherkin
       Feature: [BUG_TITLE] beheben
         Als [USER_ROLE]
         möchte ich dass [BUG_DESCRIPTION] behoben wird,
         damit [BENEFIT/EXPECTED_BEHAVIOR].
       ```

       ---

       ## Akzeptanzkriterien (Gherkin-Szenarien)

       > **Bug-Fix Szenarien:** Beschreiben das KORREKTE Verhalten nach dem Fix

       ### Szenario 1: Korrektes Verhalten (was vorher fehlschlug)

       ```gherkin
       Scenario: [ORIGINAL_BUG_SCENARIO] funktioniert korrekt
         Given [AUSGANGSSITUATION die vorher zum Bug führte]
         When [AKTION die vorher den Bug auslöste]
         Then [KORREKTES_ERWARTETES_VERHALTEN]
         And [KEINE_FEHLERMELDUNG_ODER_FALSCHES_VERHALTEN]
       ```

       ### Szenario 2: Regression-Schutz

       ```gherkin
       Scenario: Verwandte Funktionalität bleibt intakt
         Given [SETUP für verwandte Funktion]
         When [VERWANDTE_AKTION]
         Then [ERWARTETES_VERHALTEN bleibt unverändert]
       ```

       ### Edge-Case nach Fix

       ```gherkin
       Scenario: Edge-Case wird korrekt behandelt
         Given [EDGE_CASE_SITUATION]
         When [EDGE_CASE_AKTION]
         Then [KORREKTE_EDGE_CASE_BEHANDLUNG]
       ```

       **Beispiel für Bug "Login nach Passwort-Reset fehlschlägt":**
       ```gherkin
       Scenario: Login nach Passwort-Reset funktioniert
         Given ich habe mein Passwort auf "NeuesPasswort123" zurückgesetzt
         And ich habe die Bestätigungs-Email erhalten
         When ich mich mit meiner Email und "NeuesPasswort123" anmelde
         Then bin ich erfolgreich eingeloggt
         And ich sehe mein Dashboard

       Scenario: Normaler Login bleibt funktionsfähig
         Given ich bin ein Benutzer ohne Passwort-Reset
         When ich mich mit meinen ursprünglichen Zugangsdaten anmelde
         Then bin ich erfolgreich eingeloggt

       Scenario: Falsches neues Passwort wird abgelehnt
         Given ich habe mein Passwort zurückgesetzt
         When ich mich mit dem alten Passwort anmelde
         Then sehe ich "Ungültige Zugangsdaten"
       ```

       ---

       ## Technische Verifikation

       - [ ] BUG_FIXED: [Description of fix verification]
       - [ ] TEST_PASS: Regression test added and passing
       - [ ] LINT_PASS: No linting errors
       - [ ] MANUAL: Bug no longer reproducible with original steps

       ---

       ## Technisches Refinement (vom Architect)

       > **⚠️ WICHTIG:** Dieser Abschnitt wird vom Architect ausgefüllt

       ### DoR (Definition of Ready) - Vom Architect

       #### Bug-Analyse
       - [x] Bug reproduzierbar
       - [x] Root Cause identifiziert
       - [x] Betroffene Dateien bekannt

       #### Technische Vorbereitung
       - [ ] Fix-Ansatz definiert (WAS/WIE/WO)
       - [ ] Abhängigkeiten identifiziert
       - [ ] Risiken bewertet

       **Bug ist READY wenn alle Checkboxen angehakt sind.**

       ---

       ### DoD (Definition of Done) - Vom Architect

       - [ ] Bug behoben gemäß Root Cause
       - [ ] Regression Test hinzugefügt
       - [ ] Keine neuen Bugs eingeführt
       - [ ] Code Review durchgeführt
       - [ ] Original Reproduktionsschritte führen nicht mehr zum Bug

       **Bug ist DONE wenn alle Checkboxen angehakt sind.**

       ---

       ### Betroffene Layer & Komponenten (Fix-Impact)

       > **PFLICHT:** Basierend auf Fix-Impact Analysis (Step 3.5)

       **Fix Type:** [Backend-only / Frontend-only / Full-stack]

       **Betroffene Komponenten:**

       | Layer | Komponenten | Impact | Änderung |
       |-------|-------------|--------|----------|
       | [Layer] | [components] | Direct/Indirect | [Fix description] |

       **Kritische Integration Points:**
       - [Point]: [Source] → [Target] - [Verification needed]

       ---

       ### Technical Details

       **WAS:** [What needs to be fixed - based on Root Cause]

       **WIE (Architektur-Guidance ONLY):**
       - [Fix approach based on RCA]
       - [Constraints to respect]

       **WO:** [Files to modify - MUST cover ALL layers from Fix-Impact Analysis!]

       **WER:** [Agent based on bug type]

       **Abhängigkeiten:** None

       **Geschätzte Komplexität:** [XS/S/M based on RCA]

       ---

       ### Completion Check

       ```bash
       # Verify bug is fixed
       [VERIFY_COMMAND based on bug type]
       ```

       **Bug ist DONE wenn:**
       1. Original Reproduktionsschritte funktionieren korrekt
       2. Regression Test besteht
       3. Keine verwandten Fehler auftreten
     </bug_story_template>

  3. FILL in all fields from:
     - Step 2 (Bug Description)
     - Step 3 (RCA - vollständig übernehmen)

  4. LEAVE Architect sections partially empty (Step 5 fills them)

  5. WRITE: Bug file to agent-os/backlog/stories/
     PATH: agent-os/backlog/stories/bug-[BUG_ID]-[SLUG].md
     Example: agent-os/backlog/stories/bug-2025-01-15-001-login-after-reset.md
</mandatory_actions>

</step>

<step number="5" name="architect_refinement">

### Step 5: Architect Phase - Technical Refinement (v3.0)

Main agent does technical refinement guided by architect-refinement skill.

<refinement_process>
  LOAD skill: .claude/skills/architect-refinement/SKILL.md
  (This skill provides guidance for technical refinement)

  **Bug Context:**
  - Bug File: agent-os/backlog/bug-[YYYY-MM-DD]-[INDEX]-[slug].md
  - Fix-Impact Summary (from Step 3.5): [FIX_IMPACT_SUMMARY]
  - Root Cause: Already identified in bug story
  - Tech Stack: agent-os/product/tech-stack.md
  - Architecture: Try both locations:
    1. agent-os/product/architecture-decision.md
    2. agent-os/product/architecture/platform-architecture.md
  - DoR/DoD: agent-os/team/dor.md and dod.md (if exist)

  **Tasks (guided by architect-refinement skill):**
  1. READ the bug story file (Root Cause section)
  2. REVIEW Fix-Impact Summary - ensure ALL layers addressed
  3. LOAD project quality definitions
  4. FILL technical sections:

     **Betroffene Layer & Komponenten (PFLICHT):**
     Based on Fix-Impact Summary:
     - Fix Type: [Backend-only / Frontend-only / Full-stack]
     - Betroffene Komponenten Table with Direct/Indirect impact
     - Kritische Integration Points (if Full-stack fix)

     **DoR vervollständigen:**
     - Apply relevant DoR criteria
     - Mark ALL checkboxes as [x] when complete

     **DoD:**
     - Define completion criteria (unchecked [ ])

     **Technical Details:**
     - WAS: What needs to be fixed
     - WIE: Fix approach (patterns, constraints)
     - WO: Files to modify (ALL layers!)
     - Domain: Optional domain area reference
     - Abhängigkeiten: None
     - Geschätzte Komplexität: XS/S/M

     **Completion Check:**
     - Add bash verify commands

  5. VALIDATE: Bug not too complex for backlog

  **IMPORTANT (v3.0):**
  - NO "WER" field (main agent implements directly)
  - Skills auto-load during implementation
  - Follow architect-refinement skill guidance
  - Keep lightweight
  - Mark ALL DoR checkboxes as [x] when ready
</refinement_process>

</step>

<step number="5.5" name="bug_size_validation">

### Step 5.5: Bug Size Validation

Validate that the bug fix complies with size guidelines for single-session execution.

<validation_process>
  READ: The bug file from agent-os/backlog/bug-[...].md

  <extract_metrics>
    ANALYZE: WO (Where) field
      COUNT: Number of file paths mentioned
      EXTRACT: File paths list

    ANALYZE: Geschätzte Komplexität field
      EXTRACT: Complexity rating (XS/S/M/L/XL)

    ANALYZE: Root Cause section
      ASSESS: Is this a localized bug or systemic issue?
      CHECK: Number of "Betroffene Dateien"

    ANALYZE: WAS (What) field
      ESTIMATE: Lines of code for fix
      HEURISTIC:
        - Simple fix (1-2 files) ~50-100 lines
        - Medium fix (3-4 files) ~150-250 lines
        - Complex fix (5+ files) ~300+ lines
  </extract_metrics>

  <check_thresholds>
    CHECK: Number of affected files
      IF files > 5:
        FLAG: Bug as "Too Large - Affects Too Many Files"
        SEVERITY: High

    CHECK: Complexity rating
      IF complexity in [L, XL]:
        FLAG: Bug as "Too Complex for /add-bug"
        SEVERITY: High
      ELSE IF complexity = M:
        FLAG: Bug as "Borderline Complexity"
        SEVERITY: Medium

    CHECK: Estimated LOC
      IF estimated_loc > 400:
        FLAG: Bug as "Too Large - Code Volume"
        SEVERITY: High
      ELSE IF estimated_loc > 250:
        FLAG: Bug as "Watch - Approaching Limit"
        SEVERITY: Low

    CHECK: Systemic issue detection
      IF Root Cause mentions "architectural", "design flaw", or "multiple components":
        FLAG: Bug as "Systemic Issue"
        SEVERITY: High
        SUGGEST: "Consider /create-spec for architectural fixes"

    CHECK: Full-Stack Fix Coverage (Enhanced)
      EXTRACT: "Betroffene Layer & Komponenten" section
      IF Fix Type = "Full-stack":
        CHECK: WO section covers ALL layers from "Betroffene Komponenten" table
        IF missing_layers detected:
          FLAG: Bug as "Incomplete Full-Stack Fix"
          SEVERITY: Critical
          LIST: "Missing file paths for layers: [missing_layers]"
          WARN: "Bug fix does not cover all affected layers - risk of partial fix!"
          SUGGEST: "Add ALL layer files to WO section OR split into multiple bugs"

        CHECK: Integration Points coverage
        IF Critical Integration Points defined:
          VERIFY: Each integration point has source AND target in WO
          IF missing_connections:
            FLAG: Bug as "Missing Integration Coverage"
            SEVERITY: High
            LIST: "Integration points not fully covered: [points]"
            WARN: "Fix may break integration between layers"
  </check_thresholds>
</validation_process>

<decision_tree>
  IF no flags raised OR only low severity:
    LOG: "✅ Bug passes size validation - appropriate for /add-bug"
    PROCEED: To Step 6 (Update Story Index)

  ELSE (bug flagged with Medium/High severity):
    GENERATE: Validation Report

    <validation_report_format>
      ⚠️ Bug Size Validation - Issues Detected

      **Bug:** 🐛 [Bug Title]
      **File:** [Bug file path]
      **Root Cause:** [Brief RC description]

      **Metrics:**
      - Affected Files: [count] (max recommended: 5) [✅/❌]
      - Complexity: [rating] (max recommended: S, tolerated: M) [✅/⚠️/❌]
      - Est. LOC for Fix: ~[count] (max recommended: 400) [✅/❌]
      - Systemic Issue: [Yes/No] [✅/❌]

      **Issue:** [Description of what exceeds guidelines]

      **Why this matters:**
      - /add-bug is designed for localized, contained bug fixes
      - Systemic issues need proper planning to avoid introducing new bugs
      - Complex fixes benefit from story splitting and integration testing

      **Recommendation:** Use /create-spec instead for:
      - Proper architectural analysis
      - Story splitting for safer implementation
      - Integration story to validate complete fix
      - Better dependency mapping
    </validation_report_format>

    PRESENT: Validation Report to user

    ASK user via AskUserQuestion:
    "This bug fix exceeds /add-bug size guidelines. How would you like to proceed?

    Options:
    1. Switch to /create-spec (Recommended)
       → Full specification with proper planning
       → Story splitting for safer implementation
       → Integration story for validation

    2. Edit bug to reduce scope
       → Focus on most critical part of the fix
       → Create follow-up bugs for remaining issues
       → Re-run validation after edits

    3. Proceed anyway
       → Accept higher context usage
       → Risk mid-execution context compaction
       → Continue with current bug fix"

    WAIT for user choice

    <user_choice_handling>
      IF choice = "Switch to /create-spec":
        INFORM: "Switching to /create-spec workflow.
                 The bug analysis and Root Cause will be preserved as context."

        PRESERVE: Root-Cause-Analyse for create-spec input

        INVOKE: /create-spec with bug description and RCA
        STOP: This workflow

      ELSE IF choice = "Edit bug to reduce scope":
        INFORM: "Please edit the bug file: agent-os/backlog/[bug-file].md"
        INFORM: "Reduce the scope by:
                 - Focus on the most critical affected file
                 - Create separate bugs for other affected areas
                 - Reduce WO section to essential files only"
        PAUSE: Wait for user to edit
        ASK: "Ready to re-validate? (yes/no)"
        IF yes:
          REPEAT: Step 5.5 (this validation step)
        ELSE:
          PROCEED: To Step 6 with warning flag

      ELSE IF choice = "Proceed anyway":
        WARN: "⚠️ Proceeding with oversized bug fix
               - Expect higher token costs
               - Mid-execution compaction possible
               - Consider splitting into multiple bugs next time"
        LOG: Validation bypassed by user
        PROCEED: To Step 6
    </user_choice_handling>
</decision_tree>

<instructions>
  ACTION: Validate bug against size guidelines
  CHECK: Affected files, complexity, estimated LOC, systemic issue detection
  THRESHOLD: Max 5 files, max M complexity (S preferred), max 400 LOC
  REPORT: Issues found with specific recommendations
  OFFER: Three options (switch to create-spec, edit scope, proceed)
  ENFORCE: Validation before adding to backlog
</instructions>

**Output:**
- Validation report (if issues found)
- User decision on how to proceed
- Bug either validated, edited, or escalated to /create-spec

</step>

<step number="6" name="update_backlog_json">

### Step 6: Add Bug to Backlog via MCP Tool

<mandatory_actions>
  EXTRACT from previous steps:
  - Bug Title: [BUG_TITLE]
  - Description: [From bug story file or Step 2]
  - Priority: [PRIORITY]
  - Severity: [SEVERITY]
  - Category: [CATEGORY]
  - Root Cause: [Brief summary from Step 3]
  - Related Spec: [IF applicable]

  CALL MCP TOOL: backlog_add_item
  Input:
  {
    "itemType": "bug",
    "data": {
      "title": "[BUG_TITLE]",
      "description": "[BUG_DESCRIPTION from Step 2]\n\nRoot Cause: [BRIEF_ROOT_CAUSE]\n\nSeverity: [SEVERITY]",
      "priority": "[PRIORITY]",
      "source": "/add-bug command",
      "relatedSpec": "[RELATED_SPEC or null]",
      "estimatedEffort": [EFFORT_POINTS],
      "severity": "[SEVERITY]",
      "reproduction": "[REPRODUCTION_STEPS from Step 2]"
    }
  }

  VERIFY: Tool returns {
    "success": true,
    "itemId": "BUG-NNN",
    "path": "items/bug-NNN-slug.md"
  }

  LOG: "Bug {itemId} added to backlog via MCP tool"

  NOTE: The MCP tool automatically:
  - Generates unique bug ID (BUG-001, BUG-002, etc.)
  - Creates bug item file in agent-os/backlog/items/
  - Updates backlog-index.json (creates if needed)
  - Uses bug template with all metadata
  - All atomic with file lock (no corruption risk)
</mandatory_actions>

</step>

<step number="7" name="completion_summary">

### Step 7: Bug Added Confirmation

⚠️ **Note:** Only reached if bug passed size validation (Step 5.5)

⚠️ **v3.1:** Summary unterscheidet zwischen Direct Fix und PlanAgent Path.

<summary_template_direct_fix>
  ✅ Bug added to backlog with Root-Cause-Analyse!

  **Bug ID:** [YYYY-MM-DD-INDEX]
  **Story File:** agent-os/backlog/stories/bug-[YYYY-MM-DD]-[INDEX]-[slug].md
  **Planning:** Direct Fix (Architect created Story)
  **Backlog:** agent-os/backlog/backlog.json

  **Summary:**
  - Title: 🐛 [Bug Title]
  - Severity: [Critical/High/Medium/Low]
  - Root Cause: [Brief RC description]
  - Complexity: [XS/S/M]
  - Status: Ready

  **Root-Cause-Analyse:**
  - Hypothesen geprüft: [N]
  - Root Cause gefunden: ✅
  - Betroffene Dateien: [N]

  **Backlog Status (from backlog.json):**
  - Total items: [statistics.total]
  - Bugs: [statistics.byType.bug]
  - Todos: [statistics.byType.todo]
  - Ready for execution: [statistics.byStatus.ready]

  **Next Steps:**
  1. Add more bugs: /add-bug "[description]"
  2. Add quick tasks: /add-todo "[description]"
  3. Execute backlog: /execute-tasks backlog
  4. View backlog: agent-os/backlog/backlog.json
</summary_template_direct_fix>

<summary_template_planagent>
  ✅ Bug added to backlog with Root-Cause-Analyse AND Fix-Plan!

  **Bug ID:** [YYYY-MM-DD-INDEX]
  **Story File:** agent-os/backlog/stories/bug-[YYYY-MM-DD]-[INDEX]-[slug].md
  **Fix Plan:** agent-os/backlog/stories/bug-[BUG_ID]-fix-plan.md
  **Planning:** PlanAgent v3.1 (Self-Reviewed Fix Plan)
  **Backlog:** agent-os/backlog/backlog.json

  **Summary:**
  - Title: 🐛 [Bug Title]
  - Severity: [Critical/High/Medium/Low]
  - Root Cause: [Brief RC description]
  - Complexity: [M/L/XL before optimization → XS/S/M after]
  - Status: Ready

  **Root-Cause-Analyse:**
  - Hypothesen geprüft: [N]
  - Root Cause gefunden: ✅
  - Betroffene Dateien: [N]

  **Fix-Plan Highlights:**
  - Fix Strategy: [Minimal/Comprehensive]
  - Fix Phases: [N] phases defined
  - Self-Review: ✅ Passed
  - Minimal-Invasive Optimizations: [X]% reduction
  - Rollback Plan: ✅ Defined

  **Backlog Status (from backlog.json):**
  - Total items: [statistics.total]
  - Bugs: [statistics.byType.bug]
  - Todos: [statistics.byType.todo]
  - Ready for execution: [statistics.byStatus.ready]

  **Next Steps:**
  1. Review Fix-Plan: agent-os/backlog/stories/bug-[BUG_ID]-fix-plan.md
  2. Add more bugs: /add-bug "[description]"
  3. Execute backlog: /execute-tasks backlog
  4. View backlog: agent-os/backlog/backlog.json

  💡 **PlanAgent Advantage:**
  - Systematischer Fix-Plan mit Self-Review
  - Minimalinvasive Optimierungen angewendet
  - Klare Phasen für sichere Implementierung
  - Rollback-Plan für Risikominimierung
</summary_template_planagent>

</step>

</process_flow>

## Final Checklist

<verify>
  - [ ] Backlog directory exists (agent-os/backlog/)
  - [ ] Backlog JSON exists (agent-os/backlog/backlog.json)
  - [ ] Bug description gathered (symptom, repro, expected/actual)
  - [ ] Bug type determined (Frontend/Backend/DevOps)
  - [ ] **User Hypothesis Dialog completed (Step 2.5)**
  - [ ] **User-Input dokumentiert (falls vorhanden)**
  - [ ] Hypothesis-Driven RCA completed (mit User-Input)
  - [ ] Root Cause identified and documented
  - [ ] Fix-Impact Layer Analysis completed (Step 3.5)
  - [ ] **Bug Complexity Assessment completed (Step 3.75)** (NEW v3.1)
  - [ ] **Planning path decided** (Direct Fix OR PlanAgent)
  - [ ] **Fix-Plan created IF PlanAgent path chosen** (NEW v3.1)
  - [ ] **Fix-Plan approved by user IF PlanAgent path** (NEW v3.1)
  - [ ] Bug story file created in stories/ subdirectory
  - [ ] Technical refinement complete
  - [ ] All DoR checkboxes marked [x]
  - [ ] **Bug size validation passed (Step 5.5)**
  - [ ] **backlog.json updated with new item**
  - [ ] **statistics recalculated**
  - [ ] **changeLog entry added**
  - [ ] Ready for /execute-tasks backlog
</verify>

## When NOT to Use /add-bug

Suggest /create-spec instead when:
- Root Cause requires architectural changes
- Fix affects >5 files
- Multiple related bugs need coordinated fix
- Bug reveals larger design issue
- Estimated complexity > M

## When to Use PlanAgent Mode (Step 3.75)

**PlanAgent recommended for:**
- Bugs with Complexity Score >= 6 (automatic trigger)
- Full-stack fixes with >2 integration points
- Systemic issues affecting architecture
- Bugs where minimal-invasive analysis is critical

**Direct Fix recommended for:**
- Simple bugs (Complexity Score <= 2)
- Single-layer fixes (Backend-only OR Frontend-only)
- Localized issues (<= 3 affected files)
- XS or S complexity rating

**User Choice for Moderate Complexity (Score 3-5):**
- Direct Fix: Faster, Architect creates story directly
- PlanAgent: Extra safety margin for integration-heavy fixes
- Automatic: System decides based on best practices
