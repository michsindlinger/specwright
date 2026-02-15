---
description: Create milestone-based payment plan for fixed-price projects with contractor-friendly acceptance criteria
globs:
alwaysApply: false
version: 1.0
encoding: UTF-8
installation: global
---

# Milestone Planning Workflow

Erstellt einen Milestone-basierten Zahlungsplan für Festpreisprojekte. Alle Abnahmekriterien werden PRO-AUFTRAGNEHMER formuliert (objektiv messbar, keine schwammigen Kriterien). Zusätzlich werden wasserdichte Vertragsklauseln generiert.

**Use Cases:**
- Festpreisprojekte mit Abschlagszahlungen
- Angebotserstellung für Neukunden
- Vertragsverhandlungen absichern
- Zahlungsrisiken minimieren

<pre_flight_check>
  EXECUTE: @agent-os/workflows/meta/pre-flight.md
</pre_flight_check>

<process_flow>

<step number="1" name="detect_project_type">

### Step 1: Detect Project Type and Load Documents

Determine if this is a single product or platform project, then load relevant documents.

<detection_logic>
  CHECK for project documentation:

  IF agent-os/product/platform-brief.md EXISTS:
    PROJECT_TYPE = "platform"
    LOAD: agent-os/product/platform-brief.md
    LOAD: agent-os/product/roadmap/platform-roadmap.md (REQUIRED)
    LOAD: agent-os/product/blocker-analysis.md (if exists)
    SCAN: agent-os/product/modules/*/blocker-analysis.md (collect all module blockers)
    INFORM user: "Erkannt: Plattform-Projekt"
    INFORM user: "Roadmap: platform-roadmap.md"
    INFORM user: "Blocker-Analysen: [N] gefunden (Plattform + Module)"
    PROCEED to step 2

  ELSE IF agent-os/product/product-brief.md EXISTS:
    PROJECT_TYPE = "product"
    LOAD: agent-os/product/product-brief.md
    LOAD: agent-os/product/roadmap.md (REQUIRED)
    LOAD: agent-os/product/blocker-analysis.md (if exists)
    INFORM user: "Erkannt: Produkt-Projekt"
    INFORM user: "Roadmap: roadmap.md"
    INFORM user: "Blocker-Analyse: [vorhanden/nicht vorhanden]"
    PROCEED to step 2

  ELSE:
    ERROR: "Keine Projektdokumentation gefunden."
    SUGGEST: "Führe zuerst /plan-product oder /plan-platform aus."
    ABORT workflow
</detection_logic>

<roadmap_validation>
  IF roadmap file NOT EXISTS:
    ERROR: "Roadmap-Datei nicht gefunden."
    SUGGEST: "Die Roadmap ist die Basis für die Milestone-Planung."
    SUGGEST: "Erstelle zuerst eine Roadmap mit /plan-product oder /plan-platform."
    ABORT workflow
</roadmap_validation>

</step>

<step number="2" name="collect_project_info">

### Step 2: Collect Project Information

Gather essential information for milestone planning.

**Prompt User:**
```
Milestone-Planung für Festpreisprojekt

Ich benötige einige Informationen für die Planung:

1. Projektname: [Wie soll das Projekt im Vertrag heißen?]

2. Gesamtbudget: [Festpreis in EUR, z.B. 25.000]

3. Gewünschte Anzahl Milestones:
   - 2 Milestones (bei kleinen Projekten)
   - 3 Milestones (Standard, empfohlen)
   - 4+ Milestones (bei großen Projekten)

4. Besondere Risiken/Bedenken: [Optional - gibt es spezielle Aspekte?]
```

<collect_input>
  STORE: PROJECT_NAME
  STORE: TOTAL_BUDGET
  STORE: MILESTONE_COUNT (default: 3)
  STORE: SPECIAL_CONCERNS (optional)
</collect_input>

PROCEED to step 3

</step>

<step number="3" name="analyze_roadmap">

### Step 3: Analyze Roadmap and Derive Milestones

Map roadmap phases to milestones with deliverables.

<analysis_tasks>
  FROM roadmap, EXTRACT:
  - All phases (Phase 1, Phase 2, etc.)
  - Features/Deliverables per phase
  - Success criteria (if defined)
  - Dependencies between phases
  - Effort estimates (if available)

  IF platform project:
    - Group modules by phase
    - Note inter-module dependencies
    - Consider module-specific blockers

  MAP phases to MILESTONE_COUNT milestones:
  - If phases > milestones: Combine related phases
  - If phases < milestones: Split larger phases
  - Ensure logical grouping (dependencies respected)

  FOR each milestone:
    DEFINE: Name (descriptive)
    DEFINE: Deliverables list
    DEFINE: Technical acceptance criteria (OBJECTIVE!)
    IDENTIFY: Customer dependencies (from blocker-analysis)
</analysis_tasks>

PROCEED to step 4

</step>

<step number="4" name="formulate_criteria">

### Step 4: Formulate Acceptance Criteria (PRO-CONTRACTOR)

Critical step: Transform features into objective, measurable acceptance criteria.

<criteria_rules>
  RULE 1: Every criterion must be TECHNICALLY VERIFIABLE
    - Can be demonstrated in a live system
    - Can be proven via screenshot/video
    - Can be verified via automated test
    - Does NOT depend on user opinion

  RULE 2: NO subjective criteria
    - FORBIDDEN: "Users are satisfied"
    - FORBIDDEN: "System runs performantly"
    - FORBIDDEN: "Results are relevant"
    - FORBIDDEN: "Design looks professional"

  RULE 3: Use CONCRETE technical descriptions
    - GOOD: "API endpoint /users returns HTTP 200 with JSON array"
    - GOOD: "Login validates credentials against database"
    - GOOD: "Search retrieves and displays data from RAG index"
    - GOOD: "Export generates PDF file with selected data"

  RULE 4: Include VERIFICATION METHOD
    - "Demo" = Live demonstration
    - "Test" = Automated or manual test execution
    - "Screenshot" = Visual proof
    - "Log" = System log entry
</criteria_rules>

<transform_features>
  FOR each deliverable in each milestone:
    INPUT: Feature description from roadmap
    OUTPUT: 2-5 objective acceptance criteria

    EXAMPLE:
    Feature: "User Authentication"
    Criteria:
    - "Registration form creates user record in database" [Demo]
    - "Login returns JWT token on valid credentials" [Test]
    - "Invalid login attempt shows error message" [Demo]
    - "Password reset sends email to registered address" [Test]
</transform_features>

PROCEED to step 5

</step>

<step number="5" name="incorporate_blockers">

### Step 5: Incorporate Blocker Analysis

Map customer dependencies to milestones with clear consequences.

<blocker_mapping>
  IF blocker-analysis.md EXISTS:
    FOR each blocker with category "Stakeholder" or "External System":
      DETERMINE: Which milestone is affected?
      DEFINE: Deadline (when must customer deliver?)
      DEFINE: Consequence if not delivered:
        - "Milestone gilt als erfüllt, soweit AN-Leistungen erbracht"
        - "Platzhalter werden verwendet, Austausch erfolgt gesondert"
        - "Betroffene Funktionen werden in späteren MS nachgeliefert"

  IF platform project:
    SCAN: agent-os/product/modules/*/blocker-analysis.md
    FOR each module blocker:
      MAP to appropriate milestone
      Note module context

  IMPORTANT:
    - Customer failures to deliver must NOT block payment
    - Contractor work must be valued independently
    - Clear documentation of what was/wasn't possible
</blocker_mapping>

PROCEED to step 6

</step>

<step number="6" name="propose_payment_split">

### Step 6: Propose Payment Split (Interactive)

Present initial payment distribution for discussion.

<calculate_split>
  DEFAULT distribution by milestone count:

  2 Milestones:
    - MS-1: 50% (Grundlagen + erste Features)
    - MS-2: 50% (Abschluss + Go-Live)

  3 Milestones:
    - MS-1: 40% (Fundament, Setup, Core)
    - MS-2: 35% (Hauptfunktionen)
    - MS-3: 25% (Feinschliff, Go-Live)

  4 Milestones:
    - MS-1: 30% (Fundament)
    - MS-2: 30% (Core Features)
    - MS-3: 25% (Extended Features)
    - MS-4: 15% (Polish, Go-Live)

  ADJUST based on:
    - Effort distribution from roadmap
    - Risk assessment (front-load if risky client)
    - Complexity of phases
</calculate_split>

**Prompt User:**
```
Vorschlag: Zahlungsverteilung

Basierend auf der Roadmap und Komplexität schlage ich folgende Aufteilung vor:

| Milestone | Name | Anteil | Betrag |
|-----------|------|--------|--------|
| MS-1 | [Name] | [X]% | [€X.XXX] |
| MS-2 | [Name] | [X]% | [€X.XXX] |
| MS-3 | [Name] | [X]% | [€X.XXX] |
| **Gesamt** | | **100%** | **[€X.XXX]** |

Begründung:
- MS-1 höher gewichtet wegen [Setup-Aufwand / Infrastruktur / ...]
- MS-2 enthält [Hauptfunktionen / kritische Features / ...]
- MS-3 geringer wegen [Feinarbeit / weniger Komplexität / ...]

Passt diese Aufteilung? Optionen:
1. Aufteilung übernehmen
2. Gleichmäßiger aufteilen
3. Mehr am Anfang (Risikominimierung)
4. Mehr am Ende (Kundenwunsch)
5. Eigenen Vorschlag machen
```

<iteration_loop>
  REPEAT until user approves:
    IF user adjusts split:
      RECALCULATE amounts
      PRESENT updated table
      ASK for confirmation
    IF user has concerns:
      DISCUSS implications
      SUGGEST alternatives
</iteration_loop>

PROCEED to step 7 when approved

</step>

<step number="7" name="generate_contract_clauses">

### Step 7: Generate Contract Clauses

Create waterproof contract clauses protecting contractor interests.

<clause_categories>
  GENERATE clauses for:

  1. ACCEPTANCE (Abnahme):
     - Abnahmefiktion bei Fristablauf
     - Definition "wesentlicher Mangel"
     - Prüffrist (empfohlen: 5 Werktage)

  2. PAYMENT (Vergütung):
     - Zahlungsfrist nach Abnahme
     - Verzugsfolgen (Zinsen, Arbeitseinstellung)
     - Keine Aufrechnung

  3. COOPERATION (Mitwirkung):
     - Kunde-Pflichten definieren
     - Folgen bei Nicht-Mitwirkung
     - Freigabe-Fristen

  4. CHANGES (Änderungen):
     - Change Request Prozess
     - Zusatzvergütung
     - Terminverschiebung

  5. TERMINATION (Kündigung):
     - Vergütung bis Kündigung
     - Entschädigung bei AG-Kündigung
     - AN-Kündigung bei Zahlungsverzug

  6. IP RIGHTS (Eigentum):
     - Eigentumsvorbehalt
     - Nutzungsrecht erst nach Zahlung
</clause_categories>

<customize_clauses>
  ADAPT standard clauses based on:
  - Identified blockers (Mitwirkungspflichten konkretisieren)
  - Project type (Product vs Platform)
  - Special concerns from user input
  - Milestone structure
</customize_clauses>

PROCEED to step 8

</step>

<step number="8" name="write_output">

### Step 8: Write Milestone Plan

Compile all information into the final document.

<file_output>
  LOAD: milestone-plan-template.md (hybrid lookup)
    TRY: agent-os/templates/product/milestone-plan-template.md
    FALLBACK: ~/.agent-os/templates/product/milestone-plan-template.md

  WRITE to: agent-os/product/milestone-plan.md

  CONTENT structure:
  1. Executive Summary
     - Project name, budget, milestone count
     - Payment overview table

  2. Per Milestone:
     - Leistungsumfang
     - Abnahmekriterien (objektiv!)
     - Kundenabhängigkeiten
     - Milestone-spezifische Abnahmeklausel

  3. Vertragsklauseln (Empfohlen)
     - All generated clauses
     - Customized to project

  4. Kriterien-Referenz
     - DO / DON'T examples
</file_output>

PROCEED to step 9

</step>

<step number="9" name="summary">

### Step 9: Summary and Recommendations

Present summary and next steps.

**Summary Template:**
```
Milestone-Plan erstellt!

Projekt: [PROJECT_NAME]
Typ: [Product / Platform]
Gesamtbudget: [€X.XXX]
Milestones: [N]

Zahlungsübersicht:
[Table]

Dokumentation erstellt:
- agent-os/product/milestone-plan.md

Wichtige Hinweise:

1. ABNAHMEKRITERIEN PRÜFEN
   Alle Kriterien sind objektiv formuliert. Prüfe, ob sie
   vollständig sind und die Deliverables abdecken.

2. KUNDENABHÄNGIGKEITEN KOMMUNIZIEREN
   [N] Blocker identifiziert. Diese müssen VOR Vertragsschluss
   mit dem Kunden besprochen werden.

3. VERTRAGSKLAUSELN ANPASSEN
   Die empfohlenen Klauseln sind Vorschläge. Passe sie an
   deine AGB bzw. Vertragsvorlage an oder lass sie rechtlich prüfen.

4. ANGEBOT ERSTELLEN
   Nutze den Milestone-Plan als Anhang zum Angebot oder
   integriere ihn in deine Vertragsvorlage.

Empfohlene nächste Schritte:
1. Milestone-Plan mit Kunden besprechen
2. Blocker/Mitwirkungspflichten klären
3. Vertrag mit Klauseln aufsetzen
4. Bei Bedarf: /analyze-feasibility für GO/NO-GO Entscheidung
```

</step>

</process_flow>

## Acceptance Criteria Examples

### Technology-Specific Examples

**Web Application:**
- "Homepage lädt in unter 3 Sekunden (gemessen mit Browser DevTools)"
- "Responsives Layout passt sich an Bildschirmbreiten 320px bis 1920px an"
- "Formulareingaben werden vor Submit validiert (leere Pflichtfelder markiert)"

**API/Backend:**
- "REST API dokumentiert mit OpenAPI/Swagger unter /api/docs erreichbar"
- "Authentication Endpoint gibt JWT Token bei validem Login zurück"
- "Rate Limiting aktiv: Mehr als 100 Requests/Minute werden mit 429 beantwortet"

**Database/Data:**
- "Datenbankschema enthält alle Tabellen gemäß ER-Diagramm"
- "Datenimport verarbeitet CSV mit 10.000 Zeilen in unter 60 Sekunden"
- "Backup-Routine erstellt tägliche Dumps in S3 Bucket"

**AI/ML Features:**
- "RAG-Suche ruft relevante Dokumente aus dem Index ab"
- "Chatbot-Antwort enthält Quellenangaben aus den abgerufenen Dokumenten"
- "Embedding-Generation verarbeitet neue Dokumente innerhalb von 5 Minuten"

**Integrations:**
- "OAuth2 Login mit [Provider] funktioniert in Staging-Umgebung"
- "Webhook empfängt Events von [Service] und loggt sie in der Datenbank"
- "E-Mail-Versand über [Provider] funktioniert (Test-Mail verifiziert)"

## Output Files

| File | Description | When Created |
|------|-------------|--------------|
| agent-os/product/milestone-plan.md | Complete milestone plan with criteria and contract clauses | Always |

## Execution Summary

**Duration:** 15-30 minutes (interactive)
**User Interactions:** 2-3 (info collection, payment split discussion, approval)
**Output:** 1 file (milestone-plan.md)
