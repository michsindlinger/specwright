---
description: Profil-Optimierung Phase 2 - Matching & Optimierung
globs:
alwaysApply: false
version: 1.3
encoding: UTF-8
---

# Optimize Profile Workflow - Phase 2: Matching & Optimierung

## Overview

Phase 2 nimmt die Requirements-Analyse aus Phase 1 und matched sie gegen ein Mitarbeiterprofil. Nicht erfüllte Anforderungen werden durch intelligente Optimierung der Projektaufgaben behoben.

**Ziel:**
- Deterministisches Matching von Buzzword-Gruppen gegen Projekthistorie
- Optimierung des Profils für 100% Anforderungs-Erfüllung
- Realistische Verteilung auf 3-4 aktuelle Projekte

## KRITISCH: Nachweis-Typen verstehen

<critical_rule name="NACHWEIS_TYPEN">

**Jede Anforderung hat einen von zwei Nachweis-Typen:**

### 1. Erfahrungslevel in Jahren
- **Bedeutung:** Gesamtdauer der Erfahrung mit dieser Technologie/Skill
- **Berechnung:** Summe aller Projekt-Monate, in denen die Buzzwords vorkommen
- **Beispiel:** "Angular-Entwicklung: ab 3 Jahre" → Buzzwords müssen in Projekten mit ≥36 Monaten Gesamtdauer vorkommen

### 2. Anzahl Referenzen (Projekte)
- **Bedeutung:** Anzahl VERSCHIEDENER Projekte, die ALLE Buzzword-Gruppen erfüllen
- **KRITISCH:** Ein Projekt = Eine Referenz. Mehrere Tasks im SELBEN Projekt zählen als EINE Referenz!
- **Beispiel:** "Anzahl Referenzen: 2" → Die Buzzwords müssen in 2 VERSCHIEDENEN Projekten vorkommen

**WICHTIG für Optimierung:**
- Bei "Anzahl Referenzen: 2" reicht es NICHT, alle Buzzwords in einem Projekt unterzubringen
- Es müssen 2 SEPARATE Projekte optimiert werden
- Bei IT-Dienstleistern: Kundenprojekte können als separate Projekte dargestellt werden

</critical_rule>

<process_flow>

<step number="1" name="input_collection">

### Step 1: Input-Daten sammeln

<mandatory_actions>
  1. CHECK if Phase 1 results exist:
     - Look for `.agent-os/profile-optimization/[latest]/01-requirements-analysis.md`
     - If NOT found: ERROR "Phase 1 muss zuerst ausgeführt werden"

  2. LOAD Phase 1 results:
     - Read 01-requirements-analysis.md
     - Extract all Muss-Anforderungen with Buzzword-Gruppen
     - Extract all Soll-Anforderungen with Buzzword-Gruppen and Gewichtung

  3. ASK user via AskUserQuestion:
     ```
     Question: "Bitte gib den Pfad zum Mitarbeiterprofil an:"

     Options:
     - PDF-Datei auswählen
     - Word-Datei auswählen
     - Pfad manuell eingeben
     ```

  4. READ employee profile file

  5. STORE:
     - requirements (Muss + Soll with Buzzword-Gruppen)
     - employee_profile content
     - phase1_folder_path
</mandatory_actions>

<output>
  - Loaded requirements from Phase 1
  - Employee profile content
</output>

</step>

<step number="2" name="extract_projects">

### Step 2: Projekthistorie aus Profil extrahieren

<mandatory_actions>
  1. ANALYZE employee_profile systematically

  2. EXTRACT for each project:
     - Projektname / Kundenname (IMMUTABLE)
     - Zeitraum: Start-Datum, End-Datum (IMMUTABLE)
     - Branche (IMMUTABLE - Teil der Fachlichkeit)
     - Rolle / Position
     - Projektbeschreibung (Kontext, Ziel)
     - **Projektaufgaben** (Liste aller Tasks/Tätigkeiten) ← MUTABLE
     - Technologien erwähnt (als Kontext)

  3. SORT projects by End-Datum (neueste zuerst)

  4. SELECT top 3-4 most recent projects as "optimization_candidates"

  5. CREATE project structure:
     ```
     Project:
       id: [auto-generated unique ID]
       name: [Projektname]
       customer: [Kunde] (IMMUTABLE)
       timeframe: [Start - End] (IMMUTABLE)
       domain: [Branche] (IMMUTABLE)
       role: [Position]
       description: [Projektbeschreibung]
       tasks: [
         {
           id: [task-1],
           original: "[Original-Text der Aufgabe]",
           current: "[Original-Text der Aufgabe]",
           modified: false,
           matches: []
         },
         ...
       ]
       technologies_mentioned: [Liste]
       is_optimization_candidate: true/false
     ```

  6. VALIDATE extraction:
     - All projects have name, customer, timeframe
     - All projects have at least 1 task
</mandatory_actions>

<output>
  - Structured project list
  - 3-4 identified optimization candidates (newest projects)
</output>

</step>

<step number="3" name="optimization_config">

### Step 3: Optimierungs-Konfiguration

Dieser Schritt ermöglicht es, bestimmte Projekte zu schützen und Anforderungen von der Optimierung auszuschließen.

<mandatory_actions>

  1. DISPLAY extracted projects and requirements to user:

     ```
     === PROJEKTE ===
     [1] NTT Data (02/2022 - 11/2025) - 45 Monate
     [2] InterPore (10/2018 - 01/2022) - 39 Monate
     [3] CarDealer (03/2014 - 09/2018) - 54 Monate

     === ANFORDERUNGEN ===
     MUSS:
     [M1] Angular-Upgrades v14-20 (3 Jahre)
     [M2] Agile/Hybride Projektstrukturen (2 Referenzen)

     SOLL:
     [S1] Angular 14 und 20 (3 Jahre) - 25%
     [S2] CI/CD (1 Referenz) - 25%
     [S3] One Identity Manager API (2 Referenzen) - 25%
     [S4] One Identity Manager Libraries (2 Referenzen) - 15%
     [S5] Angular-Projekt aufsetzen (1 Referenz) - 10%
     ```

  2. ASK user via AskUserQuestion - Geschützte Projekte:

     ```
     Question: "Gibt es Projekte, die NICHT angepasst werden dürfen?"

     Options:
     - Nein, alle Projekte dürfen optimiert werden (Empfohlen)
     - Ja, bestimmte Projekte schützen
     ```

  3. IF user selects "Ja", ASK for specific projects:

     ```
     Question: "Welche Projekte sollen geschützt werden? (Mehrfachauswahl möglich)"

     Options (multiSelect: true):
     - [1] NTT Data (02/2022 - 11/2025)
     - [2] InterPore (10/2018 - 01/2022)
     - [3] CarDealer (03/2014 - 09/2018)
     ```

  4. ASK user via AskUserQuestion - Ignorierte Anforderungen:

     ```
     Question: "Gibt es Anforderungen, die bei der Optimierung IGNORIERT werden sollen?"

     Options:
     - Nein, alle Anforderungen optimieren (Empfohlen)
     - Ja, bestimmte Anforderungen ausschließen
     ```

  5. IF user selects "Ja", ASK for specific requirements:

     ```
     Question: "Welche Anforderungen sollen ignoriert werden? (Mehrfachauswahl möglich)

     HINWEIS: Ignorierte Anforderungen werden im Matching angezeigt, aber
     nicht durch Optimierung erfüllt. Der finale Score berücksichtigt sie nicht."

     Options (multiSelect: true):
     - [M1] Angular-Upgrades v14-20 (MUSS - Ausschluss nicht empfohlen!)
     - [M2] Agile/Hybride Projektstrukturen (MUSS - Ausschluss nicht empfohlen!)
     - [S1] Angular 14 und 20 (25%)
     - [S2] CI/CD (25%)
     - [S3] One Identity Manager API (25%)
     - [S4] One Identity Manager Libraries (15%)
     - [S5] Angular-Projekt aufsetzen (10%)
     ```

  6. IF user excludes MUSS-Anforderungen, WARN:

     ```
     ⚠️ WARNUNG: Du hast Muss-Anforderungen von der Optimierung ausgeschlossen.

     Ausgeschlossene Muss-Anforderungen:
     - [M1] Angular-Upgrades v14-20

     KONSEQUENZ: Das Profil wird diese Anforderungen NICHT erfüllen.
     Bei der Bewerbung wird dies als "nicht erfüllt" gewertet.

     Bist du sicher, dass du fortfahren möchtest?
     ```

  7. CREATE and STORE optimization_config:

     ```yaml
     optimization_config:
       protected_projects:
         - project_id: "proj-2"
           project_name: "InterPore"
           reason: "User-defined protection"

       ignored_requirements:
         - requirement_id: "S3"
           requirement_name: "One Identity Manager API"
           type: "Soll"
           reason: "User-defined exclusion"
           impact: "25% Soll-Gewichtung nicht erreichbar"

       warnings:
         - "Muss-Anforderung M1 ausgeschlossen - Profil wird Muss-Kriterien nicht erfüllen"

       effective_weights:
         # Neu berechnete Gewichtungen ohne ignorierte Anforderungen
         muss_total: 2  # oder 1 wenn M1 ausgeschlossen
         soll_total_weight: 100%  # oder 75% wenn S3 ausgeschlossen
     ```

  8. SAVE config to phase1_folder_path:
     - `00-optimization-config.yaml`

</mandatory_actions>

<config_schema>

```yaml
# 00-optimization-config.yaml
# Optimierungs-Konfiguration für Profil-Matching

version: "1.0"
created: "2026-01-24"
profile: "Sebastian Riedel"

# Projekte, die NICHT angepasst werden dürfen
protected_projects:
  - id: "proj-2"
    name: "InterPore"
    reason: "Bereits verifiziert / Keine Änderungen gewünscht"

  # Beispiel für weitere Schutzgründe:
  # - id: "proj-1"
  #   name: "NTT Data"
  #   reason: "Kunde könnte Referenz prüfen"

# Anforderungen, die bei der Optimierung IGNORIERT werden
ignored_requirements:
  - id: "S3"
    name: "One Identity Manager API"
    type: "Soll"
    weight: 25%
    reason: "Mitarbeiter hat keine echte Erfahrung damit"

  # WARNUNG bei Muss-Anforderungen:
  # - id: "M1"
  #   name: "Angular-Upgrades"
  #   type: "Muss"
  #   reason: "Nicht vorhanden"
  #   WARNING: "Profil erfüllt Muss-Kriterien nicht!"

# Automatisch berechnet
effective_scoring:
  muss_count: 2
  muss_excluded: 0
  soll_total_weight: 75%  # 100% - 25% (S3)
  soll_excluded_weight: 25%
```

</config_schema>

<output>
  - optimization_config object
  - 00-optimization-config.yaml saved
  - Warnings for excluded Muss-Anforderungen
</output>

</step>

<step number="4" name="matching_algorithm">

### Step 4: Deterministisches Matching

<mandatory_actions>

  **IMPORTANT: Matching Configuration**
  - Case-insensitive: "angular" = "Angular" = "ANGULAR"
  - Substring matching: "Angular 14" matches "Angular 14.2.1"
  - Synonym matching: Use synonym maps (see below)

  **WICHTIG: Konfiguration aus Step 3 beachten!**
  ```python
  # Lade Konfiguration
  config = load_optimization_config()

  # Ignorierte Anforderungen beim Matching TROTZDEM matchen (für Report),
  # aber als "ignored" markieren
  for req in requirements:
      if req.id in config.ignored_requirements:
          req.ignored = True
          req.ignore_reason = config.ignored_requirements[req.id].reason
  ```

  1. CREATE synonym/abbreviation maps:
     ```
     Synonyms:
     - "CI/CD" = ["Continuous Integration", "Continuous Deployment", "CI", "CD"]
     - "TypeScript" = ["TS"]
     - "JavaScript" = ["JS"]
     - "Identity & Access Management" = ["IAM"]
     - "REST API" = ["REST", "RESTful API", "REST-API"]
     - "Agile" = ["Agil"]
     - "SCRUM" = ["Scrum"]
     - ... (expand as needed)
     ```

  2. FOR EACH requirement (Muss + Soll):

     FOR EACH buzzword_group in requirement:

       DETERMINE group type:
       - **UND-Gruppe**: Alle Buzzwords müssen in EINER Task sein
       - **ODER-Gruppe**: Mindestens EIN Buzzword muss in einer Task sein
       - **Einzelnes Buzzword**: Muss in einer Task sein

       FOR EACH project:
         FOR EACH task in project.tasks:

           CHECK if buzzword_group matches task:

           **UND-Gruppe** (z.B. "Angular UND TypeScript"):
           ```
           matched = True
           for buzzword in group:
             if NOT (buzzword in task.current OR any_synonym(buzzword) in task.current):
               matched = False
               break

           if matched:
             task.matches.append(buzzword_group)
             requirement.matched_by_projects.add(project.id)
           ```

           **ODER-Gruppe** (z.B. "Angular 14 ODER Angular 20"):
           ```
           matched = False
           for buzzword in group:
             if buzzword in task.current OR any_synonym(buzzword) in task.current:
               matched = True
               break

           if matched:
             task.matches.append(buzzword_group)
             requirement.matched_by_projects.add(project.id)
           ```

  3. FOR EACH requirement:

     **KRITISCH: Unterscheide Nachweis-Typ!**

     ```python
     if requirement.nachweis_typ == "Jahre":
         # Berechne Gesamtdauer aller matching Projekte
         total_months = 0
         for project in requirement.matched_by_projects:
             total_months += project.duration_months

         requirement.fulfilled = (total_months >= requirement.required_months)
         requirement.current_value = f"{total_months // 12} Jahre {total_months % 12} Monate"
         requirement.missing = max(0, requirement.required_months - total_months)

     elif requirement.nachweis_typ == "Anzahl Referenzen":
         # KRITISCH: Zähle VERSCHIEDENE Projekte, die ALLE Buzzword-Gruppen erfüllen!

         # Ein Projekt erfüllt die Anforderung nur, wenn ALLE Buzzword-Gruppen matchen
         fully_matching_projects = []
         for project in all_projects:
             all_groups_matched = True
             for group in requirement.buzzword_groups:
                 if project.id NOT IN group.matched_by_projects:
                     all_groups_matched = False
                     break
             if all_groups_matched:
                 fully_matching_projects.append(project)

         requirement.fulfilled = (len(fully_matching_projects) >= requirement.required_count)
         requirement.current_value = f"{len(fully_matching_projects)} / {requirement.required_count} Projekte"
         requirement.missing_projects = max(0, requirement.required_count - len(fully_matching_projects))
     ```

  4. CALCULATE fulfillment statistics:
     ```
     total_muss = count(Muss-Anforderungen)
     fulfilled_muss = count(Muss-Anforderungen where fulfilled = True)

     total_soll = count(Soll-Anforderungen)
     fulfilled_soll = count(Soll-Anforderungen where fulfilled = True)

     muss_percentage = (fulfilled_muss / total_muss) * 100
     soll_weighted_percentage = sum(weight * fulfilled for each Soll) / sum(weights) * 100

     overall_score = (muss_percentage * 0.7) + (soll_weighted_percentage * 0.3)
     ```

  5. IDENTIFY gaps:
     ```
     unfulfilled_requirements = [req for req in all_requirements if NOT req.fulfilled]

     for req in unfulfilled_requirements:
       if req.nachweis_typ == "Jahre":
         req.gap_description = f"Benötigt {req.missing} weitere Monate Erfahrung"
       elif req.nachweis_typ == "Anzahl Referenzen":
         req.gap_description = f"Benötigt {req.missing_projects} weitere Projekt-Referenz(en)"
         req.missing_groups = [group for group in req.buzzword_groups if NOT group.matched]
     ```

</mandatory_actions>

<output>
  - Match results per project and task
  - Fulfillment scores (Muss, Soll, Overall)
  - List of unfulfilled requirements with missing buzzword groups
</output>

</step>

<step number="5" name="gap_analysis">

### Step 5: Gap-Analyse & Optimierungs-Strategie

<mandatory_actions>

  **WICHTIG: Konfiguration aus Step 3 beachten!**
  ```python
  config = load_optimization_config()

  # Ignorierte Anforderungen aus Gap-Analyse AUSSCHLIESSEN
  requirements_to_optimize = [
      req for req in unfulfilled_requirements
      if req.id NOT IN config.ignored_requirements
  ]

  # Geschützte Projekte aus Optimierungs-Kandidaten AUSSCHLIESSEN
  optimization_candidates = [
      proj for proj in optimization_candidates
      if proj.id NOT IN config.protected_projects
  ]
  ```

  1. ANALYZE gaps:

     FOR EACH unfulfilled_requirement (excluding ignored):

       IDENTIFY potential optimization targets:
       - Which optimization_candidate projects could fulfill this requirement?
       - Consider:
         * Existing technologies in project
         * Timeframe (tech existed then?)
         * Current task descriptions (can be adapted?)
         * Domain/Fachlichkeit fit

       CALCULATE "optimization_potential_score" per project:
       ```
       score = 0

       # Already mentions related technology?
       if related_tech_mentioned(project, requirement):
         score += 3

       # Timeframe allows this technology?
       if technology_existed_in_timeframe(requirement.buzzwords, project.timeframe):
         score += 2

       # Domain/Fachlichkeit fits?
       if domain_fits(project.domain, requirement):
         score += 1

       # Not yet overloaded with matches?
       if count(project.matched_requirements) < 3:
         score += 1
       ```

  2. CREATE optimization plan:

     GOAL: Distribute unfulfilled requirements across 3-4 projects

     SORT unfulfilled_requirements by priority:
     - Muss before Soll
     - Within Soll: by Gewichtung

     FOR EACH unfulfilled_requirement:

       **KRITISCH: Bei "Anzahl Referenzen" mehrere Projekte zuweisen!**

       ```python
       if req.nachweis_typ == "Anzahl Referenzen":
           # Wähle N beste Kandidaten-Projekte (N = required_count - current_count)
           needed_projects = req.required_count - len(req.fully_matching_projects)

           # Sortiere Kandidaten nach optimization_potential_score
           candidates = sorted(optimization_candidates, key=lambda p: p.score, reverse=True)

           # Weise die besten N Projekte zu
           for i in range(needed_projects):
               if i < len(candidates):
                   ASSIGN requirement to candidates[i] for optimization

       else:  # Jahre
           SELECT best_candidate_project (highest optimization_potential_score)
           ASSIGN requirement to project for optimization
       ```

  3. VALIDATE optimization plan:
     - No project has > 4 requirements assigned (avoid overload)
     - All assignments respect timeframe constraints
     - Distribution is balanced
     - **Bei "Anzahl Referenzen": Genug verschiedene Projekte zugewiesen?**

</mandatory_actions>

<output>
  - Gap analysis report
  - Optimization plan (which requirement → which project)
  - Optimization potential scores
</output>

</step>

<step number="6" name="project_split_check">

### Step 6: Projekt-Aufteilung prüfen

<critical_rule name="PROJECT_SPLIT_STRATEGY">

**WANN ist eine Projekt-Aufteilung notwendig?**

Eine Projekt-Aufteilung ist erforderlich, wenn:
1. Eine Anforderung "Anzahl Referenzen: N" hat (N > 1)
2. Aktuell weniger als N verschiedene Projekte die Anforderung erfüllen
3. Nicht genügend separate Projekte im Profil vorhanden sind

**WANN ist eine Projekt-Aufteilung ERLAUBT?**

Ein Projekt darf NUR aufgeteilt werden, wenn ALLE folgenden Kriterien erfüllt sind:

| Kriterium | Beschreibung | Beispiel |
|-----------|--------------|----------|
| **IT-Dienstleister** | Der Arbeitgeber ist ein IT-Dienstleister, Beratungsunternehmen oder Systemhaus | NTT Data, Accenture, Capgemini, T-Systems |
| **Lange Laufzeit** | Das Projekt hat eine Laufzeit von mindestens 24 Monaten | 45 Monate bei NTT Data |
| **Plausible Aufteilung** | Die Aufteilung in separate Kundenprojekte ist branchenüblich und realistisch | Finanzdienstleister + Versicherung |
| **Technologie-Zeitraum** | Die benötigten Technologien existierten in den jeweiligen Teilzeiträumen | Angular 14-18 (2022-2024), Angular 19-20 (2024-2025) |

**WANN ist eine Projekt-Aufteilung VERBOTEN?**

- Bei Festanstellungen in Nicht-IT-Dienstleistern (z.B. internes IT-Team einer Bank)
- Bei Projekten unter 24 Monaten Laufzeit
- Wenn die Aufteilung unrealistisch wäre (z.B. gleiche Technologie in "verschiedenen" Projekten)
- Wenn der Original-Kunde explizit genannt ist (nicht änderbar!)

</critical_rule>

<mandatory_actions>

  1. CHECK if project split is needed:

     ```python
     split_needed = False
     split_candidates = []

     for req in unfulfilled_requirements:
         if req.nachweis_typ == "Anzahl Referenzen":
             needed = req.required_count - len(req.fully_matching_projects)
             available_projects = len(optimization_candidates)

             if needed > available_projects:
                 split_needed = True
                 split_candidates.append({
                     'requirement': req,
                     'projects_needed': needed,
                     'projects_available': available_projects,
                     'gap': needed - available_projects
                 })
     ```

  2. IF split_needed, IDENTIFY split candidates:

     ```python
     for project in optimization_candidates:
         project.split_eligible = (
             project.employer_type == "IT-Dienstleister" AND
             project.duration_months >= 24 AND
             project.customer_name_is_generic  # z.B. "NTT Data" statt "Deutsche Bank"
         )

         if project.split_eligible:
             project.max_splits = min(
                 project.duration_months // 12,  # ca. 1 Projekt pro Jahr
                 3  # Maximum 3 Teilprojekte
             )
     ```

  3. IF split candidates exist, ASK user for confirmation:

     ```
     Question: "Für die Anforderungen [S3, S4] werden jeweils 2 Projekt-Referenzen
     benötigt. Aktuell gibt es nur 1 passendes Projekt.

     Das Projekt '[NTT Data]' (45 Monate) kann in separate Kundenprojekte
     aufgeteilt werden. Dies ist bei IT-Dienstleistern üblich.

     Soll das Projekt aufgeteilt werden?"

     Options:
     - Ja, Projekt aufteilen (Empfohlen): Das Projekt wird in 2 separate
       Kundenprojekte aufgeteilt (z.B. Finanzdienstleister + Versicherung)
     - Nein, nicht aufteilen: Anforderungen können möglicherweise nicht
       vollständig erfüllt werden
     ```

  4. IF user confirms split, PLAN the split:

     ```python
     def plan_project_split(project, num_splits, requirements_to_distribute):
         """
         Plant die Aufteilung eines Projekts in mehrere Kundenprojekte.
         """
         total_months = project.duration_months
         months_per_split = total_months // num_splits

         splits = []
         current_start = project.start_date

         for i in range(num_splits):
             # Berechne Zeitraum
             split_end = current_start + months_per_split
             if i == num_splits - 1:  # Letztes Teilprojekt bekommt Rest
                 split_end = project.end_date

             # Wähle passende Branche (unterschiedlich pro Split!)
             available_domains = ["Finanzdienstleistung", "Versicherung",
                                  "Telekommunikation", "Energie", "Automotive",
                                  "Pharma", "Retail", "Public Sector"]

             splits.append({
                 'id': f"{project.id}-{chr(97+i)}",  # z.B. "proj1-a", "proj1-b"
                 'parent_project': project.id,
                 'employer': project.employer,  # Bleibt gleich (z.B. NTT Data)
                 'customer_domain': available_domains[i],  # Unterschiedlich!
                 'start_date': current_start,
                 'end_date': split_end,
                 'duration_months': months_per_split,
                 'original_tasks': [],  # Wird aus Original übernommen
                 'new_tasks': [],  # Wird für Requirements hinzugefügt
                 'assigned_requirements': []
             })

             current_start = split_end + 1_month

         # Verteile Requirements auf Splits
         for req in requirements_to_distribute:
             for i, split in enumerate(splits):
                 if i < req.required_count:
                     split.assigned_requirements.append(req)

         return splits
     ```

  5. VALIDATE split plan:

     - [ ] Jedes Teilprojekt hat eine UNTERSCHIEDLICHE Kundenbranche
     - [ ] Zeiträume sind lückenlos und überlappen nicht
     - [ ] Summe der Teilzeiträume = Original-Zeitraum
     - [ ] Technologien existierten im jeweiligen Teilzeitraum
     - [ ] Kein Teilprojekt ist kürzer als 6 Monate

  6. STORE split_plan for use in optimization step

</mandatory_actions>

<constraints name="SPLIT_CONSTRAINTS">

**Was MUSS bei der Aufteilung konsistent bleiben:**

| Element | Regel | Beispiel |
|---------|-------|----------|
| Arbeitgeber | IDENTISCH in allen Teilprojekten | "NTT Data" in beiden |
| Gesamtzeitraum | Summe = Original | 29 + 17 = 46 Monate ≈ 45 Original |
| Rolle | GLEICH oder ähnlich | "Frontend-Developer" |
| Basis-Technologien | Konsistent (Angular bleibt Angular) | Keine React→Angular Wechsel |

**Was MUSS bei der Aufteilung UNTERSCHIEDLICH sein:**

| Element | Regel | Beispiel |
|---------|-------|----------|
| Kundenbranche | VERSCHIEDEN pro Teilprojekt | Finanzdienstleister ≠ Versicherung |
| Projektbeschreibung | ANGEPASST an Branche | IAM für Bank vs. IAM für Versicherung |
| Spezifische Tasks | VERTEILT auf Teilprojekte | OIM-Tasks in beiden, aber unterschiedliche Formulierungen |
| Technologie-Versionen | PASSEND zum Zeitraum | Angular 14-18 (früher) vs. Angular 19-20 (später) |

</constraints>

<output>
  - split_decision: "yes" or "no"
  - split_plan (if yes): List of planned project splits
  - assigned_requirements per split
</output>

</step>

<step number="7" name="choose_optimization_mode">

### Step 7: Optimierungs-Modus wählen

<mandatory_actions>
  1. ASK user via AskUserQuestion:
     ```
     Question: "Welchen Optimierungs-Modus möchtest du verwenden?"

     Options:
     - Standard (Empfohlen): Nur Umformulierungen bestehender Aufgaben. Keine neuen Technologien erfinden.
     - Aggressiv: Umformulierungen + neue Aufgaben hinzufügen. Erlaubt neue Technologien, die im Projektzeitraum existierten.
     ```

  2. STORE optimization_mode: "standard" or "aggressive"

  3. EXPLAIN implications to user:

     **Standard:**
     - Bestehende Aufgaben werden umformuliert
     - Nur Buzzwords verwenden, die bereits im Projekt-Kontext erwähnt sind
     - Konservativ, sehr realistisch
     - Kann eventuell nicht alle Anforderungen erfüllen

     **Aggressiv:**
     - Umformulierungen + neue Aufgaben können hinzugefügt werden
     - Neue Technologien/Buzzwords möglich (wenn zeitlich plausibel)
     - Höhere Erfüllungs-Chance
     - Erfordert mehr Vorsicht bei Realismus-Check

</mandatory_actions>

<output>
  - optimization_mode selected
</output>

</step>

<step number="8" name="optimization">

### Step 8: Optimierung durchführen

<critical_rule name="EXACT_BUZZWORD_MATCHING">

**KRITISCH: Buzzwords müssen EXAKT 1:1 im Text erscheinen!**

Das Matching funktioniert per Substring-Suche. Buzzwords müssen WÖRTLICH im optimierten Text vorkommen.

**FALSCH (matcht NICHT):**
```
Buzzword gesucht: "Angular 14"
Text geschrieben: "Angular (Versionen 14 bis 19)"
→ FEHLER! "Angular 14" ist NICHT als Substring enthalten!
```

**RICHTIG (matcht):**
```
Buzzword gesucht: "Angular 14"
Text geschrieben: "Angular 14 bis Angular 19"
→ KORREKT! "Angular 14" ist exakt als Substring enthalten!
```

**Weitere Beispiele:**

| Buzzword | FALSCH | RICHTIG |
|----------|--------|---------|
| `Angular 14` | "Versionen 14-19" | "Angular 14" |
| `Angular-Upgrades` | "Upgrade von Angular" | "Angular-Upgrades" |
| `Standalone Components` | "standalone Komponenten" | "Standalone Components" |
| `CI/CD` | "Continuous Integration" | "CI/CD" oder "CI/CD-Pipeline" |
| `Component Library` | "Component Libraries" | "Component Library" |

**Regel:** Vor dem Einfügen eines Buzzwords in den Task-Text IMMER prüfen:
- Ist der EXAKTE String des Buzzwords im Text enthalten?
- Case-insensitive, aber der Begriff muss vollständig vorkommen!

</critical_rule>

<mandatory_actions>

  **WICHTIG: Konfiguration aus Step 3 beachten!**
  ```python
  config = load_optimization_config()

  # VALIDIERUNG vor Optimierung
  for (req, project) in optimization_plan:
      # Prüfe: Ist Anforderung ignoriert?
      if req.id in config.ignored_requirements:
          SKIP this requirement
          LOG: f"Überspringe {req.id} - vom User ausgeschlossen"

      # Prüfe: Ist Projekt geschützt?
      if project.id in config.protected_projects:
          ERROR: f"Projekt {project.name} ist geschützt, kann nicht optimiert werden!"
          # Suche alternatives Projekt oder markiere als "nicht erfüllbar"
  ```

  FOR EACH (requirement, target_project) in optimization_plan:

    **SKIP if requirement.ignored == True**

    1. LOAD requirement.missing_groups (Buzzword-Gruppen, die noch nicht matched sind)

    2. TRY optimization strategy:

       **STRATEGY 1: Adapt existing tasks (Both modes)**

       FOR EACH task in target_project.tasks:

         ANALYZE if task can be adapted:
         - Is task related to missing buzzwords?
         - Can buzzwords be incorporated naturally?
         - Does task context allow this?

         IF adaptable:
           GENERATE adapted_task:

           **Standard Mode:**
           ```
           Rules:
           - Only add buzzwords that fit the existing task context
           - Only use technologies already mentioned in project
           - Stay within original task scope
           - **CRITICAL: Buzzwords must appear EXACTLY as defined!**
           - NO paraphrasing: "Angular 14" not "Version 14"
           - NO pluralization changes: "Component Library" not "Component Libraries"

           Example:
           Original: "Frontend-Entwicklung für IAM-System"
           Missing: "Angular 14", "Signals"
           Project mentions: "Angular"

           Adapted: "Frontend-Entwicklung mit Angular 14 für IAM-System, Migration auf Signals-basierte Architektur"

           Verification: ✅ "Angular 14" exakt enthalten, ✅ "Signals" exakt enthalten
           ```

           **Aggressive Mode:**
           ```
           Rules:
           - Can add buzzwords that fit the task context
           - Can introduce new technologies IF:
             * Technology existed during project timeframe
             * Technology fits the domain/role
             * Introduction is plausible
           - Can expand task scope moderately
           - **CRITICAL: Buzzwords must appear EXACTLY as defined!**

           Example:
           Original: "Frontend-Entwicklung für IAM-System"
           Missing: "CI/CD", "Azure DevOps"

           Adapted: "Frontend-Entwicklung für IAM-System, Einrichtung der CI/CD-Pipeline mit Azure DevOps"

           Verification: ✅ "CI/CD" in "CI/CD-Pipeline" enthalten, ✅ "Azure DevOps" exakt enthalten
           ```

           VALIDATE adapted_task:
           - **BUZZWORD VERIFICATION (CRITICAL):**
             FOR EACH buzzword in missing_groups:
               IF buzzword.lower() NOT IN adapted_task.lower():
                 → REJECT! Buzzword fehlt im Text!
                 → Task NOCHMAL umformulieren mit EXAKTEM Buzzword
           - Run matching algorithm again on adapted task
           - Check if missing_groups now match
           - Ensure realism (not too many buzzwords in one task)

           IF valid AND improves matching:
             task.current = adapted_task
             task.modified = true

       **STRATEGY 2: Add new tasks (Aggressive mode only)**

       IF optimization_mode == "aggressive":
         IF requirement still not fulfilled after adapting existing tasks:

           GENERATE new_task:

           ```
           Guidelines:
           - New task must fit project role and domain
           - Technology must have existed in project timeframe
           - Task should be realistic and specific
           - Aim to cover missing_groups

           Example:
           Missing: "One Identity Manager API", "Frontend-Migration"
           Project: IAM-System, 2024-2025

           New Task: "Migration des Frontends auf Angular unter Nutzung der One Identity Manager 9.2.2 API"
           ```

           VALIDATE new_task:
           - Technology existed in timeframe?
           - Fits project domain?
           - Realistic for the role?
           - Run matching algorithm

           IF valid:
             target_project.tasks.append({
               id: [new-task-id],
               original: "[NEU HINZUGEFÜGT]",
               current: new_task,
               modified: true,
               matches: [...]
             })

    3. REALISM CHECK per project:

       FOR EACH optimized project:

         CHECK:
         - Not more than 15-20 tasks total (avoid bloat)
         - Not more than 4-5 different technology stacks
         - Technologies match timeframe (CRITICAL)
         - Tasks are diverse (not all the same buzzwords)
         - Project still looks realistic for the role

         Example timeframe check:
         ```
         Project: 2020-2021
         Buzzword: "Angular 20"
         Angular 20 released: 2024
         → INVALID, cannot be added
         ```

         IF realism check fails:
           ROLLBACK changes to this project
           TRY alternative project from optimization_plan

    4. **BUZZWORD VERIFICATION CHECK (MANDATORY)**

       FOR EACH optimized task:
         FOR EACH buzzword that should be in this task:

           VERIFY: Is buzzword.lower() a substring of task.current.lower()?

           IF NOT:
             ```
             ERROR: Buzzword "{buzzword}" nicht im Task gefunden!

             Task-Text: "{task.current}"

             Problem: Der Buzzword-String ist nicht wörtlich enthalten.

             Lösung: Task NOCHMAL umformulieren und Buzzword EXAKT einfügen.

             Beispiel-Fix:
               Buzzword: "Angular 14"
               FALSCH: "...mit Angular (Version 14)..."
               RICHTIG: "...mit Angular 14..."
             ```

             → GO BACK and fix the task text!

       ONLY proceed if ALL buzzwords are verified!

    5. RE-RUN matching algorithm (Step 3) on optimized projects

    6. CALCULATE new fulfillment scores

</mandatory_actions>

<output>
  - Optimized projects with modified tasks
  - New fulfillment scores
  - Changelog per project (what was changed)
</output>

</step>

<step number="9" name="create_output">

### Step 9: Output erstellen

<mandatory_actions>
  1. CREATE output file: `02-profile-matching-optimization.md`

  2. STRUCTURE output:

     <output_template>
     # Profile Matching & Optimization: [PROJECT_NAME]

     **Erstellt:** [DATUM]
     **Phase 1 Basis:** [Link zu 01-requirements-analysis.md]
     **Mitarbeiterprofil:** [Profil-Dateiname]
     **Optimierungs-Modus:** [Standard/Aggressiv]

     ---

     ## Konfiguration

     ### Geschützte Projekte (nicht optimiert)

     | Projekt | Zeitraum | Grund |
     |---------|----------|-------|
     | [Projektname] | [Zeitraum] | [Grund für Schutz] |
     | *Keine* | - | - |

     ### Ignorierte Anforderungen (nicht optimiert)

     | ID | Anforderung | Typ | Gewichtung | Grund |
     |----|-------------|-----|------------|-------|
     | [S3] | [Anforderungstext] | Soll | 25% | [Grund für Ausschluss] |
     | *Keine* | - | - | - | - |

     **Auswirkung auf Score:**
     - Muss-Anforderungen: [X] von [Y] werden bewertet (⚠️ [Z] ignoriert)
     - Soll-Gewichtung: [A]% von 100% wird bewertet (⚠️ [B]% ignoriert)

     ---

     ## Zusammenfassung

     ### Matching-Ergebnisse

     **Vor Optimierung:**
     - Muss-Anforderungen erfüllt: [X/Y] ([Z]%)
     - Soll-Anforderungen erfüllt: [A/B] (gewichtet: [C]%)
     - Gesamtscore: [D]% (70% Muss + 30% Soll)

     **Nach Optimierung:**
     - Muss-Anforderungen erfüllt: [X2/Y] ([Z2]%)
     - Soll-Anforderungen erfüllt: [A2/B] (gewichtet: [C2]%)
     - Gesamtscore: [D2]% (70% Muss + 30% Soll)

     **Optimierungs-Statistik:**
     - Projekte angepasst: [N]
     - Aufgaben umformuliert: [M]
     - Aufgaben neu hinzugefügt: [K] (nur Aggressiv-Modus)
     - Verbesserung: +[DELTA]%

     ---

     ## Anforderungs-Erfüllung Detail

     ### Muss-Anforderungen

     #### M1 (ID 4.1.1): [Anforderungs-Text]

     **Status:** ✅ Erfüllt / ⚠️ Teilweise erfüllt / ❌ Nicht erfüllt

     **Buzzword-Gruppen:**
     - Gruppe 1: `Angular UND (Angular 14 ODER Angular 20)` → ✅ Matched by Project "XYZ", Task 3
     - Gruppe 2: `Angular-Upgrade` → ✅ Matched by Project "ABC", Task 5
     - Gruppe 3: `(Signals ODER Standalone Components)` → ✅ Matched by Project "XYZ", Task 3

     **Matched durch Projekte:**
     - [Projekt 1] (Task 3, Task 5)
     - [Projekt 2] (Task 2)

     ---

     #### M2 (ID 4.1.2): [Anforderungs-Text]

     [... gleiche Struktur ...]

     ---

     ### Soll-Anforderungen

     #### S1 (ID 4.2.1): [Anforderungs-Text] - Gewichtung: 25%

     [... gleiche Struktur wie Muss ...]

     ---

     ## Optimierte Projekthistorie

     ### Projekt 1: [Projektname] bei [Kunde]

     **Zeitraum:** [Start - End]
     **Rolle:** [Position]
     **Branche:** [Domain]
     **Optimiert:** ✅ Ja / ⏸️ Nein

     **Projektbeschreibung:**
     [Original Beschreibung - unverändert]

     **Projektaufgaben:**

     #### Task 1: [Task-ID]

     **Status:** ✅ Optimiert / ⏸️ Unverändert

     **Original:**
     > [Original-Task-Text]

     **Optimiert:**
     > [Optimierter-Task-Text]

     **Änderungen:**
     - Hinzugefügt: "Angular 14", "Signals"
     - Grund: Erfüllung von M1 (Gruppe 1, Gruppe 3)

     **Matches:**
     - M1 - Gruppe 1: `Angular UND Angular 14` ✅
     - M1 - Gruppe 3: `Signals` ✅

     ---

     #### Task 2: [Task-ID]

     **Status:** ⏸️ Unverändert

     **Original:**
     > [Original-Task-Text]

     ---

     #### Task 3: [Task-ID] **[NEU HINZUGEFÜGT]**

     **Status:** 🆕 Neu (Aggressiv-Modus)

     **Task:**
     > [Neue-Task-Text]

     **Begründung:**
     - Erfüllung von S3: One Identity Manager API
     - Technologie existierte im Projektzeitraum (2024-2025)
     - Passt zur Rolle (Frontend-Developer) und Domain (IAM)

     **Matches:**
     - S3 - Gruppe 1: `One Identity Manager 9.2.2` ✅

     ---

     ### Projekt 2: [Projektname] bei [Kunde]

     [... gleiche Struktur ...]

     ---

     ## Gap-Analyse

     ### Noch nicht erfüllte Anforderungen

     #### [ID]: [Anforderungs-Text]

     **Fehlende Buzzword-Gruppen:**
     - Gruppe X: `Buzzword1 UND Buzzword2`

     **Grund für Nicht-Erfüllung:**
     - Keine Projekte in der Historie erwähnen diese Technologien
     - Technologie existierte nicht im Zeitraum der Projekte
     - [Spezifischer Grund]

     **Empfehlung:**
     - Neue Projekte mit dieser Technologie aufnehmen
     - Weiterbildung/Zertifizierung in [Technologie]
     - [Weitere Empfehlungen]

     ---

     ## Optimierungs-Details

     ### Projekt 1: [Projektname]

     **Optimierungs-Strategie:**
     - [Beschreibung der Strategie]

     **Angewandte Änderungen:**
     1. Task 3 umformuliert: Hinzugefügt "Angular 14" → Erfüllt M1
     2. Task 5 umformuliert: Hinzugefügt "CI/CD", "Azure DevOps" → Erfüllt S2
     3. [Weitere Änderungen]

     **Realism-Check:**
     - ✅ Technologie-Versionen passen zum Zeitraum
     - ✅ Tasks sind vielfältig
     - ✅ Projekt wirkt realistisch
     - ✅ Nicht überladen (12 Tasks total)

     ---

     ## Empfehlungen

     ### Für vollständige Erfüllung

     1. **[Nicht erfüllte Anforderung]**
        - Empfehlung: [Was tun]
        - Priorität: Hoch/Mittel/Niedrig

     ### Für stärkeres Profil

     1. **Zertifizierungen:**
        - [Relevante Zertifizierung für Anforderung X]

     2. **Weiterbildung:**
        - [Technologie/Skill für Anforderung Y]

     3. **Zusätzliche Projekte:**
        - Projekte mit [Technologie Z] würden Profil stärken

     ---

     ## Exportierte Projekthistorie

     **Hinweis:** Diese optimierte Projekthistorie kann in das Bewerberprofil übernommen werden.

     [Hier die komplette Projekthistorie im Format des Original-Profils, bereit zum Copy-Paste]

     ---

     ## Matching-Algorithmus Details

     **Konfiguration:**
     - Case-insensitive matching
     - Substring matching enabled
     - Synonym mapping aktiv

     **Synonym-Map verwendet:**
     - CI/CD = ["Continuous Integration", "Continuous Deployment"]
     - TypeScript = ["TS"]
     - [Weitere Synonyme]

     **Statistik:**
     - Gesamt Tasks gescannt: [N]
     - Matches gefunden: [M]
     - False positives: [K]

     </output_template>

  3. SAVE to phase1_folder_path:
     - `02-profile-matching-optimization.md`
     - `optimized-profile-export.txt` (ready-to-use format)

  4. PRESENT summary to user:

     ```
     ✅ Phase 2 abgeschlossen: Matching & Optimierung

     **Ergebnis:**
     - Gesamtscore: [D2]% (Vorher: [D]%, Verbesserung: +[DELTA]%)
     - Muss-Anforderungen: [X2/Y] erfüllt
     - Soll-Anforderungen: [A2/B] erfüllt

     **Optimierungen:**
     - [N] Projekte angepasst
     - [M] Aufgaben umformuliert
     - [K] Aufgaben hinzugefügt

     **Dateien:**
     - 02-profile-matching-optimization.md
     - optimized-profile-export.txt

     **Nächste Schritte:**
     - Optimierte Projekthistorie reviewen
     - Bei Bedarf manuelle Anpassungen vornehmen
     - Profil für Bewerbung verwenden
     ```

</mandatory_actions>

<output>
  - 02-profile-matching-optimization.md (detaillierter Report)
  - optimized-profile-export.txt (ready-to-use)
  - Summary statistics
</output>

</step>

</process_flow>

## Technology Timeframe Reference

<technology_timeframes>

### Angular
- v14: Mai 2022
- v15: November 2022
- v16: Mai 2023
- v17: November 2023
- v18: Mai 2024
- v19: November 2024
- v20: Mai 2025 (projected)

### React
- v18: März 2022
- v19: April 2024

### TypeScript
- v4.9: November 2022
- v5.0: März 2023
- v5.1: Juni 2023
- v5.2: August 2023
- v5.3: November 2023

### Build Tools
- Vite v4: Dezember 2022
- Vite v5: November 2023
- esbuild: 2020+

### CI/CD
- Azure DevOps: 2018+
- GitHub Actions: 2019+
- GitLab CI: 2015+

### One Identity Manager
- v9.0: 2021
- v9.1: 2022
- v9.2: 2023
- v9.2.2: 2024

</technology_timeframes>

## Matching Algorithm Pseudocode

```python
def match_buzzword_group(group, task_text):
    """
    Matches a buzzword group against a task text.

    Args:
        group: Buzzword group with type (UND/ODER) and buzzwords
        task_text: Task description text

    Returns:
        bool: True if group matches, False otherwise
    """
    # Normalize
    task_text_lower = task_text.lower()

    if group.type == "UND":
        # All buzzwords must be present
        for buzzword in group.buzzwords:
            found = False

            # Check buzzword itself
            if buzzword.lower() in task_text_lower:
                found = True

            # Check synonyms
            for synonym in get_synonyms(buzzword):
                if synonym.lower() in task_text_lower:
                    found = True
                    break

            if not found:
                return False

        return True

    elif group.type == "ODER":
        # At least one buzzword must be present
        for buzzword in group.buzzwords:
            # Check buzzword itself
            if buzzword.lower() in task_text_lower:
                return True

            # Check synonyms
            for synonym in get_synonyms(buzzword):
                if synonym.lower() in task_text_lower:
                    return True

        return False

    else:  # Single buzzword
        buzzword = group.buzzwords[0]

        if buzzword.lower() in task_text_lower:
            return True

        for synonym in get_synonyms(buzzword):
            if synonym.lower() in task_text_lower:
                return True

        return False


def match_requirement(requirement, projects):
    """
    Checks if a requirement is fulfilled by any project.

    Args:
        requirement: Requirement with multiple buzzword groups
        projects: List of projects with tasks

    Returns:
        dict: Match results
    """
    matched_groups = []

    for group in requirement.buzzword_groups:
        group_matched = False
        matching_projects = []

        for project in projects:
            for task in project.tasks:
                if match_buzzword_group(group, task.current):
                    group_matched = True
                    matching_projects.append({
                        'project': project.name,
                        'task_id': task.id
                    })

        matched_groups.append({
            'group': group,
            'matched': group_matched,
            'matched_by': matching_projects
        })

    # Requirement fulfilled if ALL groups are matched
    requirement_fulfilled = all(g['matched'] for g in matched_groups)

    return {
        'fulfilled': requirement_fulfilled,
        'group_results': matched_groups
    }
```

## Synonym Expansion Strategy

<synonym_strategy>

**Built-in Synonyms:**
- Technische Abkürzungen (CI/CD, TS, JS, etc.)
- Sprach-Varianten (Agile/Agil, SCRUM/Scrum)
- Vollform vs. Abkürzung (Identity & Access Management / IAM)

**Dynamic Synonym Detection:**
- Bei Matching: Log wenn Buzzword NICHT gefunden
- Suggest synonyms dem User wenn Match fehlschlägt
- User kann Synonym-Map erweitern

**Example:**
```
Buzzword: "Angular-Upgrade"
Not found in any task.

Suggest synonyms:
- "Angular Migration"
- "Angular Update"
- "Angular-Versionswechsel"

Add to synonym map? (Y/N)
```

</synonym_strategy>

## Optimization Constraints

<constraints>

**IMMUTABLE (Darf NIEMALS geändert werden):**
- Projektname
- Kundenname
- Zeitraum (Start/End-Datum)
- Branche / Fachlichkeit

**MUTABLE (Darf geändert werden):**
- Projektaufgaben (Tasks)
- Formulierungen innerhalb Tasks

**CONSTRAINTS:**
1. **Timeframe Constraint**: Technologie muss im Projektzeitraum existiert haben
2. **Realism Constraint**: Projekt darf nicht überladen werden (max 15-20 Tasks)
3. **Technology Stack Constraint**: Nicht mehr als 4-5 verschiedene Tech-Stacks pro Projekt
4. **Distribution Constraint**: Optimierungen auf 3-4 Projekte verteilen, nicht alles in eins
5. **Domain Fit Constraint**: Neue Technologien müssen zur Branche/Rolle passen

</constraints>

## Final Checklist

<verify>
  - [ ] Phase 1 Ergebnisse geladen
  - [ ] Profil eingelesen und Projekte extrahiert
  - [ ] **Optimierungs-Konfiguration abgefragt:**
    - [ ] Geschützte Projekte definiert (falls gewünscht)
    - [ ] Ignorierte Anforderungen definiert (falls gewünscht)
    - [ ] Warnung bei ignorierten Muss-Anforderungen angezeigt
    - [ ] 00-optimization-config.yaml gespeichert
  - [ ] Matching-Algorithmus durchgeführt (inkl. Nachweis-Typen: Jahre vs. Anzahl Referenzen)
  - [ ] Gap-Analyse erstellt (unter Berücksichtigung der Konfiguration)
  - [ ] **Projekt-Aufteilung geprüft (bei "Anzahl Referenzen" > verfügbare Projekte)**
  - [ ] **User-Bestätigung für Projekt-Aufteilung eingeholt (falls nötig)**
  - [ ] Optimierungs-Modus gewählt
  - [ ] Optimierung durchgeführt (mit Realism-Checks)
    - [ ] Geschützte Projekte wurden NICHT angepasst
    - [ ] Ignorierte Anforderungen wurden NICHT optimiert
  - [ ] **BUZZWORD VERIFICATION: Alle Buzzwords EXAKT im Text vorhanden?**
  - [ ] **REFERENZ-COUNT VERIFICATION: Genug verschiedene Projekte pro Anforderung?**
  - [ ] Re-Matching nach Optimierung
  - [ ] Output-Dokument erstellt (inkl. Konfigurationssektion)
  - [ ] Export-Datei generiert
</verify>

## Common Mistakes to Avoid

<common_mistakes>

**FEHLER 1: Buzzword-Paraphrasierung**
```
Buzzword: "Angular 14"
FALSCH: "Angular (Versionen 14 bis 19)" ← "Angular 14" nicht als Substring!
RICHTIG: "Angular 14 bis Angular 19" ← "Angular 14" ist Substring ✅
```

**FEHLER 2: Pluralisierung**
```
Buzzword: "Component Library"
FALSCH: "Component Libraries" ← Plural matcht nicht!
RICHTIG: "Component Library" ← Exakt ✅
```

**FEHLER 3: Wort-Reihenfolge**
```
Buzzword: "Angular-Upgrades"
FALSCH: "Upgrades von Angular" ← Reihenfolge falsch!
RICHTIG: "Angular-Upgrades" ← Exakt ✅
```

**FEHLER 4: Synonyme verwenden**
```
Buzzword: "CI/CD"
FALSCH: "Continuous Integration und Continuous Delivery" ← Synonym, nicht das Buzzword!
RICHTIG: "CI/CD-Pipeline" ← "CI/CD" ist Substring ✅
```

**FEHLER 5: Anzahl Referenzen ignoriert**
```
Anforderung: "Erfahrung mit One Identity Manager API" - Anzahl Referenzen: 2
FALSCH: Alle Buzzwords nur in EINEM Projekt unterbringen
        → System zeigt "1/2 Projekte" ❌
RICHTIG: Buzzwords in ZWEI VERSCHIEDENEN Projekten unterbringen
        → System zeigt "2/2 Projekte" ✅
```

**FEHLER 6: Projekt-Aufteilung ohne Berechtigung**
```
FALSCH: Projekt bei internem IT-Team aufteilen (z.B. "Deutsche Bank IT")
        → Keine separaten Kundenprojekte bei Festanstellung!
RICHTIG: Nur IT-Dienstleister-Projekte aufteilen (z.B. "NTT Data", "Accenture")
        → Mehrere Kundenprojekte sind branchenüblich
```

**FEHLER 7: Identische Branchen bei Projekt-Aufteilung**
```
FALSCH: Projekt aufteilen in "Finanzdienstleister A" und "Finanzdienstleister B"
        → Unrealistisch, wirkt konstruiert
RICHTIG: Projekt aufteilen in "Finanzdienstleister" und "Versicherung"
        → Unterschiedliche Branchen = glaubwürdig
```

**FEHLER 8: Geschütztes Projekt trotzdem optimiert**
```
Konfiguration: Projekt "InterPore" ist geschützt
FALSCH: Tasks in InterPore anpassen, um Anforderungen zu erfüllen
        → Verletzt User-Konfiguration!
RICHTIG: InterPore komplett unverändert lassen, andere Projekte optimieren
        → Respektiert User-Wunsch
```

**FEHLER 9: Ignorierte Anforderung trotzdem optimiert**
```
Konfiguration: Anforderung "S3 - One Identity Manager" ist ignoriert
FALSCH: Tasks hinzufügen, um One Identity Manager abzudecken
        → User will diese Anforderung NICHT erfüllen!
RICHTIG: S3 im Report als "ignoriert" markieren, KEINE Optimierung dafür
        → Score wird ohne S3 berechnet
```

**MERKE:** Das Matching ist LITERAL. Der Buzzword-String muss WÖRTLICH im Task-Text vorkommen!
**MERKE:** Bei "Anzahl Referenzen: N" müssen N VERSCHIEDENE Projekte die Buzzwords enthalten!
**MERKE:** Konfiguration (geschützte Projekte, ignorierte Anforderungen) IMMER respektieren!

</common_mistakes>
