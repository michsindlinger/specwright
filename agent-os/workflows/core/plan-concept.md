---
description: Erstelle ein komplettes Bewerbungspaket aus einer Projektanfrage
globs:
alwaysApply: false
version: 1.0
encoding: UTF-8
installation: global
---

# Plan Concept Workflow

Erstelle aus einer Projektanfrage (RFP, Recruiter-Email, direkte Kundenanfrage) ein komplettes Bewerbungspaket: Analyse, Domain-Recherche, Kompetenz-Mapping, Proposal, Pitch-Script und optionalen POC-Plan. Ziel: Sich als bester Kandidat positionieren.

<pre_flight_check>
  EXECUTE: @agent-os/workflows/meta/pre-flight.md
</pre_flight_check>

<arguments>
  --poc       POC-Plan erstellen (optional, wird auch interaktiv abgefragt)
  --profile   Pfad zum Profil-Dokument (optional, auto-detect via optimize-profile Output)
</arguments>

<process_flow>

<step number="1" subagent="date-checker" name="input_collection">

### Step 1: Input Collection

Anfrage einlesen, Profil laden, Kontext etablieren.

<input_detection>
  ASK user: "Bitte teile die Projektanfrage. Du kannst:
  - Den Text direkt einfuegen
  - Einen Dateipfad angeben (z.B. ~/Downloads/anfrage.pdf)
  - Eine URL angeben

  Optional: Soll ein POC-Plan erstellt werden? (--poc)"

  WAIT for user response

  DETERMINE input_type:
    - IF text pasted → type: text
    - IF file path → type: file, READ file content
    - IF URL → type: url, USE WebFetch to extract content

  STORE:
  - inquiry_raw: Raw input content
  - inquiry_source: [text | file | url]
  - poc_requested: [true | false] (from --poc flag or user response)
</input_detection>

<profile_detection>
  LOAD consultant profile:
  1. IF --profile argument provided:
     LOAD specified profile
  2. ELIF agent-os/profile/ exists:
     LOAD latest profile from agent-os/profile/
  3. ELIF ~/.agent-os/profile/ exists:
     LOAD global profile
  4. ELSE:
     ASK user: "Kein Profil gefunden. Bitte Pfad zum Profil angeben oder /optimize-profile ausfuehren."

  STORE:
  - profile_content: Full profile content
  - profile_path: Path to profile file
  - consultant_name: Extracted name
  - core_competencies: Extracted skills/technologies
  - experience_years: Extracted experience
  - domain_experience: Extracted domain knowledge
</profile_detection>

<date_setup>
  USE date-checker subagent to establish:
  - current_date: YYYY-MM-DD
  - project_slug: Generated from inquiry (e.g., "beitragsservice-ki-voruntersuchung")
  - output_folder: agent-os/concepts/[current_date]-[project_slug]/
</date_setup>

**Output:** Anfrage geladen, Profil geladen, Output-Ordner definiert

</step>

<step number="2" name="inquiry_analysis">

### Step 2: Anfrage-Analyse

Anfrage systematisch klassifizieren und Anforderungen extrahieren.

<classification>
  ANALYZE inquiry_raw and DETERMINE:

  inquiry_type: [rfp | recruiter | direct_client | tender | internal]
  engagement_type: [consulting | implementation | audit | workshop | coaching | mixed]
  timeline: [sofort | kurzfristig_1-3m | mittelfristig_3-6m | langfristig_6m+ | unklar]
  budget_indication: [genannt | schaetzbar | unklar]
  decision_process: [direkt | ausschreibung | mehrstufig | unklar]
</classification>

<requirements_extraction>
  EXTRACT from inquiry:

  <explicit_requirements>
    - Must-have Skills/Technologies
    - Domain knowledge required
    - Certifications required
    - Location/Remote requirements
    - Start date / Duration
    - Budget / Rate indication
    - Team size / Role
    - Deliverables mentioned
  </explicit_requirements>

  <implicit_requirements>
    - Industry regulations (DSGVO, BSI, etc.)
    - Technology ecosystem hints
    - Organizational maturity signals
    - Pain points / Challenges mentioned
    - Success criteria (stated or implied)
  </implicit_requirements>

  <stakeholder_analysis>
    - Decision maker(s) identified
    - Technical vs. business stakeholders
    - Evaluation criteria (stated or implied)
    - Communication preferences
  </stakeholder_analysis>
</requirements_extraction>

<red_flags>
  IDENTIFY potential issues:
  - Unrealistische Zeitvorgaben
  - Budget-Mismatch
  - Unklare Anforderungen
  - Fehlende Entscheidungskompetenz
  - Technische Schulden-Indikatoren
</red_flags>

**Store:**
- inquiry_classification: Complete classification
- requirements_explicit: List of explicit requirements
- requirements_implicit: List of implicit requirements
- stakeholders: Stakeholder analysis
- red_flags: Identified issues

**Output:** Strukturierte Anfrage-Analyse

</step>

<step number="3" subagent="file-creator" name="create_output_folder">

### Step 3: Output-Ordner erstellen

Ordnerstruktur fuer das Bewerbungspaket anlegen.

<folder_structure>
  CREATE:
  agent-os/concepts/[current_date]-[project_slug]/
    concept-analysis.md      # Step 2 Output
    domain-research.md       # Step 4 Output
    competence-map.md        # Step 5 Output
    proposal-concept.md      # Step 7 Output
    pitch-script.md          # Step 8 Output
    poc-plan.md              # Step 9 Output (optional)
    overview.md              # Step 10 Output
</folder_structure>

<write_analysis>
  LOAD template: concept-analysis-template.md

  <template_lookup>
    1. TRY: agent-os/templates/concept/concept-analysis-template.md (project)
    2. IF NOT FOUND: ~/.agent-os/templates/concept/concept-analysis-template.md (global)
    3. IF STILL NOT FOUND: Error - template missing
  </template_lookup>

  FILL template with Step 2 results
  WRITE to: [output_folder]/concept-analysis.md
</write_analysis>

**Output:** Ordnerstruktur angelegt, concept-analysis.md geschrieben

</step>

<step number="4" name="domain_research">

### Step 4: Domain-Recherche

Tiefgehende Recherche zur Branche, Technologie-Landschaft und regulatorischen Rahmenbedingungen.

<mcp_usage>
  USE Perplexity MCP (mcp__perplexity__search or mcp__perplexity__reason):

  <industry_research>
    - "[Branche/Organisation] aktuelle Herausforderungen Digitalisierung 2026"
    - "[Branche/Organisation] IT-Strategie KI-Einsatz"
    - "[Organisation] Organigramm IT-Abteilung Struktur"
  </industry_research>

  <technology_research>
    - "[Technologie-Stack aus Anfrage] Best Practices Enterprise 2026"
    - "[Technologie] Vergleich Alternativen Markt"
    - "[Spezifische Technologie] Erfahrungsberichte oeffentliche Verwaltung" (wenn relevant)
  </technology_research>

  <regulatory_research>
    IF domain involves regulation:
      - "[Branche] regulatorische Anforderungen [Land] 2026"
      - "[Regulierung] Compliance-Anforderungen IT-Systeme"
      - "DSGVO [Branche] spezifische Anforderungen"
  </regulatory_research>

  <competitive_intelligence>
    - "[Projekttyp] Beratungsmarkt Deutschland aktuelle Trends"
    - "Freelance [Technologie] Tagessaetze Deutschland 2026"
    - "[Aehnliche Projekte] Referenzprojekte Case Studies"
  </competitive_intelligence>
</mcp_usage>

<mcp_fallback>
  IF Perplexity not available:
    USE WebSearch tool as fallback
    NOTE: Results may be less comprehensive
    REDUCE research_confidence by 15%
</mcp_fallback>

<write_research>
  LOAD template: domain-research-template.md

  <template_lookup>
    1. TRY: agent-os/templates/concept/domain-research-template.md (project)
    2. IF NOT FOUND: ~/.agent-os/templates/concept/domain-research-template.md (global)
    3. IF STILL NOT FOUND: Error - template missing
  </template_lookup>

  FILL template with research results
  WRITE to: [output_folder]/domain-research.md
</write_research>

**Output:** domain-research.md geschrieben

<user_gate number="1">
  PRESENT research summary to user:

  "Domain-Recherche abgeschlossen:

  Branche: [INDUSTRY]
  Organisation: [ORG_NAME]
  Kern-Technologien: [TECH_LIST]
  Regulatorik: [REGULATIONS]
  Markt-Insights: [KEY_INSIGHTS]

  Quellen: [SOURCE_COUNT] Quellen ausgewertet

  Moechtest du:
  1. Weiter zum Kompetenz-Mapping
  2. Bestimmte Bereiche vertiefen
  3. Zusaetzliche Recherche-Fragen stellen"

  WAIT for user response
  IF user wants deeper research → REPEAT relevant research queries
  IF user approves → PROCEED to Step 5
</user_gate>

</step>

<step number="5" name="competence_mapping">

### Step 5: Kompetenz-Mapping

Profil systematisch gegen die Anforderungen mappen und Fit-Score berechnen.

<mapping_process>
  FOR EACH requirement in requirements_explicit + requirements_implicit:
    MAP to profile:
    - skill_match: [exact | related | transferable | gap]
    - evidence: Specific profile entry supporting the match
    - strength_level: [expert | advanced | intermediate | basic | none]
    - years_experience: Relevant years
    - project_references: Matching projects from profile
</mapping_process>

<fit_score_calculation>
  CALCULATE fit_score:

  <scoring_dimensions>
    technical_fit:
      weight: 35%
      score: AVERAGE(skill_match scores for technical requirements)
      - exact = 10, related = 7, transferable = 4, gap = 0

    domain_fit:
      weight: 25%
      score: Based on industry/domain experience match
      - Same industry = 10
      - Related industry = 7
      - Transferable domain = 4
      - No domain experience = 1

    methodology_fit:
      weight: 15%
      score: Based on methodology/approach match
      - Same methodology used = 10
      - Similar approach = 7
      - Adaptable = 4

    cultural_fit:
      weight: 10%
      score: Based on org type, size, communication style
      - Perfect match = 10
      - Good fit = 7
      - Acceptable = 4

    availability_fit:
      weight: 15%
      score: Based on timeline, location, rate alignment
      - Perfect alignment = 10
      - Minor adjustments = 7
      - Significant constraints = 4
      - Conflict = 0
  </scoring_dimensions>

  total_fit_score = WEIGHTED_AVERAGE(all dimensions)
  fit_category:
    - 8.0-10.0: Exzellenter Fit
    - 6.0-7.9: Guter Fit
    - 4.0-5.9: Akzeptabler Fit (Gaps adressierbar)
    - < 4.0: Schwacher Fit (Absage empfohlen)
</fit_score_calculation>

<gap_analysis>
  FOR EACH gap identified:
    ASSESS:
    - gap_severity: [critical | significant | minor]
    - bridgeable: [yes_quickly | yes_with_effort | unlikely]
    - bridge_strategy: How to address in proposal
    - talking_points: How to frame positively in pitch
</gap_analysis>

<usp_identification>
  IDENTIFY unique selling points:
  - Wo bin ich staerker als typische Mitbewerber?
  - Welche Kombination aus Skills ist selten?
  - Welche Referenzprojekte sind besonders relevant?
  - Welcher Mehrwert geht ueber die Anfrage hinaus?
</usp_identification>

<write_competence_map>
  LOAD template: competence-map-template.md

  <template_lookup>
    1. TRY: agent-os/templates/concept/competence-map-template.md (project)
    2. IF NOT FOUND: ~/.agent-os/templates/concept/competence-map-template.md (global)
    3. IF STILL NOT FOUND: Error - template missing
  </template_lookup>

  FILL template with mapping results
  WRITE to: [output_folder]/competence-map.md
</write_competence_map>

**Output:** competence-map.md mit Fit-Score geschrieben

<user_gate number="2">
  PRESENT mapping summary:

  "Kompetenz-Mapping abgeschlossen:

  ╔═══════════════════════════════════════════╗
  ║  FIT-SCORE: [X.X]/10 - [CATEGORY]         ║
  ╚═══════════════════════════════════════════╝

  Dimensionen:
  ┌───────────────────────┬───────┐
  │ Technischer Fit       │ [X]/10│
  │ Domain-Fit            │ [X]/10│
  │ Methodik-Fit          │ [X]/10│
  │ Kultur-Fit            │ [X]/10│
  │ Verfuegbarkeit        │ [X]/10│
  └───────────────────────┴───────┘

  USPs: [USP_COUNT] identifiziert
  Gaps: [GAP_COUNT] ([CRITICAL_COUNT] kritisch)

  Empfehlung: [BEWERBEN / MIT VORBEHALT / ABSAGE EMPFOHLEN]

  Moechtest du:
  1. Weiter zur Proposal-Strategie
  2. Mapping anpassen (z.B. fehlende Erfahrung ergaenzen)
  3. Detailansicht der Gaps"

  WAIT for user response
  IF user wants adjustments → UPDATE mapping
  IF fit_score < 4.0 → WARN: "Fit-Score ist niedrig. Fortfahren?"
  IF user approves → PROCEED to Step 6
</user_gate>

</step>

<step number="6" name="proposal_strategy">

### Step 6: Proposal-Strategie

Positionierung, Struktur und Argumentation fuer das Proposal definieren.

<positioning>
  BASED ON fit_score, gaps, and USPs:

  DEFINE positioning_angle:
    - Primary USP to lead with
    - Supporting arguments (top 3)
    - Gap mitigation narratives
    - Differenzierung vom Wettbewerb

  DEFINE proposal_tone:
    IF inquiry_type == rfp → formal, strukturiert, compliance-orientiert
    IF inquiry_type == recruiter → pragmatisch, ergebnisorientiert
    IF inquiry_type == direct_client → partnerschaftlich, loesungsorientiert
</positioning>

<scope_definition>
  DEFINE proposed_scope:
    - Phase 1 (Quick Wins): Sofort lieferbare Ergebnisse
    - Phase 2 (Core): Hauptleistungen
    - Phase 3 (Extended): Optionale Erweiterungen

  DEFINE deliverables per phase:
    - Concrete outputs
    - Timeline per deliverable
    - Dependencies
</scope_definition>

<pricing_framework>
  BASED ON research (Tagessaetze, Projektvolumen):
    - rate_range: [MIN - MAX] Tagessatz
    - estimated_days: [X - Y] Tage
    - total_range: [MIN - MAX] Gesamtvolumen
    - pricing_model: [Festpreis | T&M | Hybrid | Value-Based]

  NOTE: Keine konkreten Zahlen ins Proposal - nur Rahmen fuer Pitch
</pricing_framework>

<win_strategy>
  DEFINE approach to maximize win probability:
  - Opening hook (erster Eindruck)
  - Credibility builders (Referenzen, Zertifikate)
  - Risk reducers (fuer den Kunden)
  - Call to action (naechster Schritt)
  - Differentiators vs. typical competitors
</win_strategy>

**Output:** Proposal-Strategie definiert

<user_gate number="3">
  PRESENT strategy summary:

  "Proposal-Strategie definiert:

  Positionierung: [POSITIONING_ANGLE]
  Ton: [TONE]

  Scope:
  - Phase 1: [QUICK_WINS] ([X] Tage)
  - Phase 2: [CORE] ([Y] Tage)
  - Phase 3: [EXTENDED] ([Z] Tage, optional)

  Preisrahmen: [RATE_RANGE] / Tag
  Geschaetztes Volumen: [TOTAL_RANGE]

  USPs fuer Proposal:
  1. [USP_1]
  2. [USP_2]
  3. [USP_3]

  Moechtest du:
  1. Strategie freigeben und Proposal erstellen
  2. Positionierung anpassen
  3. Scope aendern
  4. Preisrahmen diskutieren"

  WAIT for user response
  IF user wants adjustments → UPDATE strategy
  IF user approves → PROCEED to Step 7
</user_gate>

</step>

<step number="7" subagent="file-creator" name="create_proposal">

### Step 7: Proposal erstellen

Das Hauptdokument - das Konzept/Proposal - schreiben.

<proposal_generation>
  LOAD template: proposal-concept-template.md

  <template_lookup>
    1. TRY: agent-os/templates/concept/proposal-concept-template.md (project)
    2. IF NOT FOUND: ~/.agent-os/templates/concept/proposal-concept-template.md (global)
    3. IF STILL NOT FOUND: Error - template missing
  </template_lookup>

  FILL sections:
  - Header (Projekt, Datum, Consultant)
  - Executive Summary (Positionierung + Hook)
  - Verstaendnis der Aufgabe (zeigt Recherche-Tiefe)
  - Loesungsansatz (Phasen + Deliverables)
  - Methodik (Vorgehen, Tools, Standards)
  - Qualifikation & Referenzen (USPs + relevante Projekte)
  - Zeitplan & Meilensteine
  - Investitionsrahmen (falls gewuenscht)
  - Naechste Schritte

  WRITE to: [output_folder]/proposal-concept.md
</proposal_generation>

**Output:** proposal-concept.md geschrieben

</step>

<step number="8" subagent="file-creator" name="create_pitch_script">

### Step 8: Pitch-Script erstellen

Vorbereitung fuer Vorstellungsgespraech / Pitch-Call.

<pitch_generation>
  LOAD template: pitch-script-template.md

  <template_lookup>
    1. TRY: agent-os/templates/concept/pitch-script-template.md (project)
    2. IF NOT FOUND: ~/.agent-os/templates/concept/pitch-script-template.md (global)
    3. IF STILL NOT FOUND: Error - template missing
  </template_lookup>

  FILL sections:
  - Elevator Pitch (30 Sekunden)
  - Ausfuehrlicher Pitch (3 Minuten)
  - Erwartete Fragen + Antworten
  - Gap-Handling (wie Luecken adressieren)
  - Gegenfragen an den Kunden
  - Storytelling-Elemente (relevante Projekt-Geschichten)
  - Do's and Don'ts fuer das Gespraech
  - Abschluss-Strategie

  WRITE to: [output_folder]/pitch-script.md
</pitch_generation>

**Output:** pitch-script.md geschrieben

</step>

<step number="9" subagent="file-creator" name="create_poc_plan" condition="--poc">

### Step 9: POC-Plan erstellen (Optional)

Nur ausgefuehrt wenn --poc Flag gesetzt oder in Step 1 bestaetigt.

<conditional_logic>
  IF poc_requested == false:
    SKIP this step
    PROCEED to step 10
</conditional_logic>

<poc_generation>
  LOAD template: poc-plan-template.md

  <template_lookup>
    1. TRY: agent-os/templates/concept/poc-plan-template.md (project)
    2. IF NOT FOUND: ~/.agent-os/templates/concept/poc-plan-template.md (global)
    3. IF STILL NOT FOUND: Error - template missing
  </template_lookup>

  FILL sections:
  - POC-Zielsetzung (Was soll bewiesen werden?)
  - Scope & Abgrenzung
  - Technischer Ansatz
  - Architektur-Skizze
  - Zeitplan (typisch 1-2 Wochen)
  - Erfolgskriterien (messbar)
  - Ressourcen & Voraussetzungen
  - Uebergang zum Hauptprojekt

  WRITE to: [output_folder]/poc-plan.md
</poc_generation>

**Output:** poc-plan.md geschrieben (oder uebersprungen)

</step>

<step number="10" name="finalization">

### Step 10: Finalisierung

Overview erstellen, Zusammenfassung praesentieren.

<create_overview>
  LOAD template: overview-template.md

  <template_lookup>
    1. TRY: agent-os/templates/concept/overview-template.md (project)
    2. IF NOT FOUND: ~/.agent-os/templates/concept/overview-template.md (global)
    3. IF STILL NOT FOUND: Error - template missing
  </template_lookup>

  FILL sections:
  - Projekt-Header
  - Dokumenten-Index mit Status
  - Fit-Score Zusammenfassung
  - Timeline / Naechste Schritte
  - Offene Punkte

  WRITE to: [output_folder]/overview.md
</create_overview>

<summary_format>
  PRESENT to user:

  "Bewerbungspaket erstellt!

  Projekt: [PROJECT_NAME]
  Kunde: [CLIENT_NAME]
  Typ: [ENGAGEMENT_TYPE]

  ╔═══════════════════════════════════════════╗
  ║  FIT-SCORE: [X.X]/10 - [CATEGORY]         ║
  ║  EMPFEHLUNG: [BEWERBEN / MIT VORBEHALT]    ║
  ╚═══════════════════════════════════════════╝

  Erstellte Dokumente:
  ┌────────────────────────┬──────────┐
  │ Dokument               │ Status   │
  ├────────────────────────┼──────────┤
  │ concept-analysis.md    │ Fertig   │
  │ domain-research.md     │ Fertig   │
  │ competence-map.md      │ Fertig   │
  │ proposal-concept.md    │ Fertig   │
  │ pitch-script.md        │ Fertig   │
  │ poc-plan.md            │ [Fertig/Uebersprungen] │
  │ overview.md            │ Fertig   │
  └────────────────────────┴──────────┘

  Gespeichert in: [output_folder]

  Naechste Schritte:
  1. Proposal reviewen und personalisieren
  2. Pitch-Script durchlesen und ueben
  3. /optimize-profile-match fuer Profil-Anpassung
  4. /prepare-interview fuer Interview-Vorbereitung (falls vorhanden)

  Soll ich:
  a) Ein bestimmtes Dokument ueberarbeiten?
  b) Das Proposal als Email-Entwurf formatieren?
  c) Zusaetzliche Recherche durchfuehren?"

  WAIT for user response
</summary_format>

</step>

</process_flow>

## MCP Server Usage

| MCP Server | Purpose | Steps |
|------------|---------|-------|
| **Perplexity** | Domain-Recherche, Markt-Analyse, Regulatorik | 4 |
| **WebSearch** | Fallback fuer Recherche | 4 |

<mcp_fallback>
  IF Perplexity not available:
    USE WebSearch tool as fallback
    NOTE: Results may be less comprehensive
    REDUCE research_confidence by 15%

  IF neither Perplexity nor WebSearch available:
    WARN user: "Keine Recherche-Tools verfuegbar. Domain-Recherche wird manuell durchgefuehrt."
    ASK user for key information about domain
    PROCEED with reduced research depth
</mcp_fallback>

## Error Handling

<error_scenarios>
  <scenario name="no_inquiry_provided">
    <condition>User provides no inquiry content</condition>
    <action>
      ASK user: "Bitte teile die Projektanfrage (Text, Datei oder URL)."
      WAIT for input
      IF still no input after 2 prompts → EXIT with message
    </action>
  </scenario>

  <scenario name="no_profile_found">
    <condition>No consultant profile found</condition>
    <action>
      INFORM user: "Kein Profil gefunden."
      SUGGEST: "Fuehre zuerst /optimize-profile aus oder gib den Pfad zum Profil an."
      OFFER: "Alternativ kann ich mit den Informationen aus der CLAUDE.md arbeiten."
      IF user provides alternative → PROCEED with limited profile
    </action>
  </scenario>

  <scenario name="inquiry_too_vague">
    <condition>Inquiry lacks essential information</condition>
    <action>
      LIST missing information:
      - Keine Technologie-Anforderungen erkennbar
      - Kein Zeitrahmen genannt
      - Keine Rolle/Aufgabe definiert
      ASK user to provide additional context
      PROCEED with assumptions (documented in analysis)
    </action>
  </scenario>

  <scenario name="mcp_unavailable">
    <condition>Neither Perplexity nor WebSearch available</condition>
    <action>
      WARN user: "Eingeschraenkte Recherche-Moeglichkeiten"
      SKIP deep domain research
      FILL domain-research.md with available information
      NOTE limitation in overview.md
    </action>
  </scenario>

  <scenario name="low_fit_score">
    <condition>Fit score below 4.0</condition>
    <action>
      WARN user: "Der Fit-Score ist niedrig ([X.X]/10). Eine Bewerbung wird nicht empfohlen."
      PRESENT gap analysis
      ASK: "Moechtest du trotzdem fortfahren oder die Anfrage verwerfen?"
      IF user proceeds → CONTINUE with honest assessment
      IF user stops → SAVE partial results and EXIT
    </action>
  </scenario>

  <scenario name="template_missing">
    <condition>Required template not found in project or global</condition>
    <action>
      ERROR: "Template [TEMPLATE_NAME] nicht gefunden."
      SUGGEST: "Fuehre setup-devteam-global.sh aus oder pruefe die Installation."
      USE inline fallback structure if possible
    </action>
  </scenario>
</error_scenarios>

## Output Files

| File | Description | Location |
|------|-------------|----------|
| concept-analysis.md | Strukturierte Anfrage-Analyse | agent-os/concepts/[date]-[slug]/ |
| domain-research.md | Domain-Recherche-Ergebnisse | agent-os/concepts/[date]-[slug]/ |
| competence-map.md | Kompetenz-Mapping mit Fit-Score | agent-os/concepts/[date]-[slug]/ |
| proposal-concept.md | Hauptdokument: Konzept/Proposal | agent-os/concepts/[date]-[slug]/ |
| pitch-script.md | Pitch- und Interview-Vorbereitung | agent-os/concepts/[date]-[slug]/ |
| poc-plan.md | POC-Plan (optional) | agent-os/concepts/[date]-[slug]/ |
| overview.md | Index aller Dokumente + Status | agent-os/concepts/[date]-[slug]/ |

## Integration mit anderen Workflows

| Workflow | Richtung | Beschreibung |
|----------|----------|--------------|
| `/optimize-profile` | Input | Profil als Basis fuer Kompetenz-Mapping |
| `/optimize-profile-match` | Output → Input | Profil auf Anfrage optimieren |
| `/prepare-interview` | Output → Input | Interview-Vorbereitung vertiefen |
| `/analyze-feasibility` | Ergaenzend | Technische Machbarkeit des POC |

## Execution Summary

**Duration:** 15-30 Minuten (abhaengig von Recherche-Tiefe und User Gates)
**User Interactions:** 4 (nach Recherche, Mapping, Strategie, Finalisierung)
**MCP Calls:** 5-15 (Domain-Recherche)
**Output:** 6-7 Dokumente im Bewerbungspaket

## Usage Examples

```bash
# Standard: Anfrage als Text einfuegen
/plan-concept

# Mit POC-Plan
/plan-concept --poc

# Mit spezifischem Profil
/plan-concept --profile ~/profil/michael-sindlinger-cv.md

# Alles zusammen
/plan-concept --poc --profile agent-os/profile/optimized-profile.md
```
