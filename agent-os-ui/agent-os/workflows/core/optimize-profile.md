---
description: Profil-Optimierung durch Projektausschreibungs-Analyse
globs:
alwaysApply: false
version: 1.0
encoding: UTF-8
---

# Optimize Profile Workflow (Phase 1)

## Overview

Analysiert eine Projektausschreibung und extrahiert strukturierte Anforderungen mit Buzzwords und intelligenten Ergänzungen. Dieser Workflow ist die erste Phase der Profil-Optimierung und bereitet die Grundlage für späteres Profil-Matching.

**Ziel:** Aus einer Projektausschreibung werden:
- Muss- und Soll-Anforderungen extrahiert
- Buzzwords (Kern-Begriffe) identifiziert
- Buzzword-Gruppen mit UND/ODER-Verknüpfung gebildet
- Intelligente Ergänzungen basierend auf Versionen/Technologien hinzugefügt

<process_flow>

<step number="1" name="input_collection">

### Step 1: Input-Daten sammeln

<mandatory_actions>
  1. ASK user via AskUserQuestion:
     ```
     Question: "Wie möchtest du die Projektausschreibung bereitstellen?"

     Options:
     - Text direkt eingeben
     - Datei-Pfad angeben (PDF/Word/Text)
     - URL zur Ausschreibung
     ```

  2. WAIT for user input

  3. COLLECT job description based on user choice:
     - If file path: READ the file (PDF or Word)
     - If URL: FETCH the content via WebFetch
     - If text: STORE directly

  4. ASK user via AskUserQuestion:
     ```
     Question: "Möchtest du auch ein Mitarbeiterprofil bereitstellen? (Wird in dieser Phase noch nicht verwendet, aber für zukünftige Schritte gespeichert)"

     Options:
     - Ja, Profil jetzt bereitstellen (Empfohlen)
     - Nein, nur Projektausschreibung analysieren
     ```

  5. IF user wants to provide profile:
     ASK user via AskUserQuestion:
     ```
     Question: "Bitte gib den Pfad zum Mitarbeiterprofil an:"

     Options:
     - PDF-Datei auswählen
     - Word-Datei auswählen
     - Pfad manuell eingeben
     ```

  6. IF profile provided:
     READ the profile file

  7. STORE:
     - job_description
     - employee_profile (optional, für zukünftige Phasen)
</mandatory_actions>

<output>
  - job_description content
  - employee_profile content (if provided)
</output>

</step>

<step number="2" name="extract_requirements">

### Step 2: Anforderungen extrahieren (Muss vs. Soll)

<mandatory_actions>
  1. ANALYZE job_description structure

  2. CHECK if dedicated requirements sections exist:
     - Look for sections like: "Muss-Anforderungen", "Soll-Anforderungen", "Requirements", "Must-have", "Nice-to-have", "Anforderungsprofil", etc.
     - Look for tables or structured lists with requirements

  3. IF dedicated sections exist:

     **IMPORTANT: Extract ONLY from these dedicated sections**
     - Do NOT extract implicit requirements from other sections (Scope, Context, Description, etc.)
     - Do NOT infer requirements from project descriptions
     - ONLY use what is explicitly listed in the requirements sections

     EXTRACT each requirement:
     - Original-Text der Anforderung (exact wording)
     - Kategorie: Muss oder Soll (as specified in section)
     - Bereich: Classify as (Technologie, Methodik, Soft Skills, Erfahrung, etc.)
     - Additional metadata if present (years of experience, number of references, etc.)

  4. IF NO dedicated sections exist:

     IDENTIFY all requirements from the full text:
     - **Muss-Anforderung**: Explizit gekennzeichnet als "Muss", "Required", "Zwingend erforderlich", "Voraussetzung", etc.
     - **Soll-Anforderung**: Explizit gekennzeichnet als "Soll", "Wünschenswert", "Nice-to-have", "Von Vorteil", etc.
     - **Default**: Wenn NICHT explizit als Soll gekennzeichnet → IMMER Muss-Anforderung

  5. CREATE structured list:
     ```
     Muss-Anforderungen:
     1. [ID/Number] [Original-Text] | Bereich: [Kategorie] | [Metadata]
     2. [ID/Number] [Original-Text] | Bereich: [Kategorie] | [Metadata]
     ...

     Soll-Anforderungen:
     1. [ID/Number] [Original-Text] | Bereich: [Kategorie] | [Metadata]
     2. [ID/Number] [Original-Text] | Bereich: [Kategorie] | [Metadata]
     ...
     ```

  6. NOTE the extraction method used:
     - "Extracted from dedicated sections only"
     - "Extracted from full text (no dedicated sections found)"
</mandatory_actions>

<output>
  - Structured list of Muss requirements
  - Structured list of Soll requirements
  - Each with original text and classification
  - Note on extraction method
</output>

</step>

<step number="3" name="extract_buzzwords">

### Step 3: Buzzwords extrahieren

<mandatory_actions>
  1. FOR EACH requirement (Muss + Soll):

     EXTRACT buzzwords:
     - Kern-Begriffe (wichtigste Wörter oder Teilsätze)
     - Technologie-Namen
     - Methoden-Namen
     - Framework/Tool-Namen
     - Qualifikations-Begriffe
     - Erfahrungs-Bereiche

  2. RULES for buzzword extraction:
     - Fokus auf das Wesentliche (1-3 Wörter pro Buzzword)
     - Technologien IMMER mit Version, falls angegeben
     - Keine Füllwörter oder generische Begriffe
     - Konkrete, suchbare Begriffe

  3. CREATE buzzword list per requirement:
     ```
     Anforderung 1: "[Original-Text]"
     Buzzwords:
     - [Buzzword 1]
     - [Buzzword 2]
     - [Buzzword 3]
     ...
     ```

  4. EXAMPLE:
     ```
     Anforderung: "Mehrjährige Erfahrung in der Angular-Entwicklung mit Versionen 14 und 20"
     Buzzwords:
     - Angular
     - Angular 14
     - Angular 20
     - Frontend-Entwicklung
     ```
</mandatory_actions>

<output>
  - Buzzwords pro Anforderung
  - Alle extrahierten Buzzwords als Liste
</output>

</step>

<step number="4" name="create_buzzword_groups">

### Step 4: Buzzword-Gruppen bilden (UND/ODER)

<mandatory_actions>
  1. FOR EACH requirement:

     ANALYZE semantic relationships between buzzwords

  2. CREATE logical groups with connectors:
     - **UND-Verknüpfung**: Buzzwords müssen ZUSAMMEN erfüllt sein
     - **ODER-Verknüpfung**: Mindestens EINES der Buzzwords muss erfüllt sein

  3. RULES for grouping:
     - Technologie + Version → UND (z.B. "TypeScript UND Angular")
     - Alternative Technologien → ODER (z.B. "Cypress ODER Playwright")
     - Methodik ohne Alternative → einzelne Gruppe (z.B. "SCRUM")
     - Spezifische Versionen → UND mit Basis-Technologie (z.B. "Angular UND (Angular 14 ODER Angular 20)")

  4. CREATE buzzword groups:
     ```
     Anforderung 1: "[Original-Text]"
     Buzzword-Gruppen:
     - Gruppe 1: [Buzzword 1] UND [Buzzword 2]
     - Gruppe 2: [Buzzword 3] ODER [Buzzword 4]
     - Gruppe 3: [Buzzword 5]
     ```

  5. EXAMPLES:
     ```
     Anforderung: "Erfahrung mit TypeScript und Angular oder React"
     Gruppen:
     - TypeScript UND (Angular ODER React)

     Anforderung: "Testing mit Cypress oder Playwright"
     Gruppen:
     - Cypress ODER Playwright

     Anforderung: "Agile Entwicklung mit SCRUM"
     Gruppen:
     - SCRUM
     ```
</mandatory_actions>

<output>
  - Buzzword-Gruppen pro Anforderung
  - Logische Verknüpfungen (UND/ODER)
</output>

</step>

<step number="5" name="intelligent_supplements">

### Step 5: Intelligente Ergänzungen basierend auf Versionen/Kontext

<mandatory_actions>
  1. FOR EACH buzzword group mit spezifischen Versionen:

     ANALYZE:
     - Warum wird eine spezielle Version gefordert?
     - Was sind die Besonderheiten dieser Version?
     - Was sind die Unterschiede zu vorherigen Versionen?
     - Welche impliziten Features/Konzepte werden dadurch wichtig?

  2. APPLY technology-specific knowledge:

     **Angular (v14-v20):**
     - Signals (ab v16)
     - Zoneless Angular (ab v18)
     - Deferrable Views / @defer (ab v17)
     - Built-in Control Flow (@if, @for, @switch) (ab v17)
     - Partial Hydration (ab v16)
     - Esbuild / Vite (ab v16)

     **React (v18+):**
     - Concurrent Features
     - Server Components
     - Automatic Batching
     - Suspense

     **Vue (v3+):**
     - Composition API
     - Script Setup
     - Teleport
     - Fragments

     **TypeScript (v5+):**
     - Decorators
     - const type parameters
     - satisfies operator

  3. ADD supplemental buzzwords to groups:
     ```
     Anforderung: "Angular-Entwicklung mit Versionen 14 und 20"

     Original Buzzwords:
     - Angular
     - Angular 14
     - Angular 20

     Ergänzte Buzzwords (Fokus v17-v20):
     - Signals
     - Zoneless Angular
     - Deferrable Views
     - Built-in Control Flow (@if, @for, @switch)
     - Partial Hydration
     - Esbuild
     - Standalone Components (ab v14)

     Begründung:
     Version 14-20 zeigt, dass moderne Angular-Features erwartet werden.
     Diese Features sind charakteristisch für die aktuelle Architektur.
     ```

  4. RULES for supplements:
     - NUR ergänzen, wenn Version/Kontext dies nahelegt
     - Fokus auf unterscheidende Features der Version
     - Keine allgemeinen Basis-Konzepte
     - Supplements sollten in Projektbeschreibungen vorkommen können

  5. UPDATE buzzword groups with supplements:
     - Original buzzwords bleiben erhalten
     - Supplements werden als eigene Gruppe hinzugefügt (ODER-verknüpft)
</mandatory_actions>

<output>
  - Erweiterte Buzzword-Gruppen
  - Ergänzungs-Begründungen
  - Version-spezifische Feature-Liste
</output>

</step>

<step number="6" name="create_output">

### Step 6: Ausgabe erstellen und Workflow stoppen

<mandatory_actions>
  1. USE date-checker to get current date (YYYY-MM-DD)

  2. EXTRACT project/customer name from job_description
     - Normalize: lowercase, replace spaces with hyphens

  3. CREATE output folder structure:
     ```
     .agent-os/profile-optimization/
     └── YYYY-MM-DD-[project-name]/
         ├── 01-requirements-analysis.md
         └── inputs/
             ├── job-description.md (or .pdf)
             └── employee-profile.md (if provided)
     ```

  4. SAVE inputs:
     - Copy/save job_description to inputs folder
     - Copy/save employee_profile if provided

  5. CREATE 01-requirements-analysis.md:

     <output_template>
     # Requirements Analysis: [PROJECT_NAME]

     **Erstellt:** [DATUM]
     **Quelle:** [Job Description Source]

     ---

     ## Zusammenfassung

     - **Anzahl Muss-Anforderungen:** [X]
     - **Anzahl Soll-Anforderungen:** [Y]
     - **Gesamt Buzzwords extrahiert:** [Z]
     - **Buzzword-Gruppen gebildet:** [N]

     ---

     ## Muss-Anforderungen

     ### Anforderung M1: [Original-Text]

     **Bereich:** [Kategorie]

     **Buzzwords:**
     - [Buzzword 1]
     - [Buzzword 2]
     - ...

     **Buzzword-Gruppen:**
     - `[Buzzword 1] UND [Buzzword 2]`
     - `[Buzzword 3] ODER [Buzzword 4]`

     **Intelligente Ergänzungen:**
     - **[Supplement 1]** - [Begründung]
     - **[Supplement 2]** - [Begründung]

     **Finale Buzzword-Gruppen (mit Ergänzungen):**
     - `[Buzzword 1] UND [Buzzword 2]`
     - `([Buzzword 3] ODER [Supplement 1] ODER [Supplement 2])`

     ---

     ### Anforderung M2: [Original-Text]

     [... gleiche Struktur ...]

     ---

     ## Soll-Anforderungen

     ### Anforderung S1: [Original-Text]

     [... gleiche Struktur wie Muss-Anforderungen ...]

     ---

     ## Alle Buzzwords (Alphabetisch)

     ```
     A
     - Angular
     - Angular 14
     - Angular 20
     - Agile

     B
     - Built-in Control Flow

     C
     - Cypress

     [... etc ...]
     ```

     ---

     ## Alle Buzzword-Gruppen (Übersicht)

     ### Technologie-Stack
     - `TypeScript UND Angular`
     - `Angular UND (Angular 14 ODER Angular 20)`
     - `(Signals ODER Zoneless Angular ODER Deferrable Views)` [Ergänzung]

     ### Testing
     - `Cypress ODER Playwright`

     ### Methodiken
     - `SCRUM`
     - `CI/CD`

     ---

     ## Nächste Schritte

     **Phase 2 (zukünftig):**
     - Profil-Analyse gegen diese Anforderungen
     - Matching-Score berechnen
     - Optimierungsvorschläge generieren

     **Datei-Struktur:**
     - Input-Dateien: `inputs/`
     - Phase 1 Output: `01-requirements-analysis.md` (diese Datei)
     - Phase 2 Output: `02-profile-matching.md` (zukünftig)
     </output_template>

  6. PRESENT output to user:
     ```
     ✅ Phase 1 abgeschlossen: Requirements-Analyse

     **Speicherort:** .agent-os/profile-optimization/[YYYY-MM-DD-project-name]/

     **Erstellte Dateien:**
     📄 01-requirements-analysis.md
     📁 inputs/
        ├── job-description.[ext]
        └── employee-profile.[ext] (falls bereitgestellt)

     **Statistik:**
     - Muss-Anforderungen: [X]
     - Soll-Anforderungen: [Y]
     - Buzzwords extrahiert: [Z]
     - Buzzword-Gruppen: [N]
     - Intelligente Ergänzungen: [M]

     **Highlights:**
     - [Notable finding 1]
     - [Notable finding 2]
     - [Notable finding 3]

     ---

     **Workflow gestoppt für Step-by-Step Entwicklung.**

     Nächster Schritt (Phase 2): Profil-Analyse und Matching
     ```

  7. STOP workflow
</mandatory_actions>

<output>
  - 01-requirements-analysis.md
  - Saved input files
  - Summary statistics
</output>

</step>

</process_flow>

## Hybrid Template Lookup

Templates werden in folgender Reihenfolge gesucht:
1. Projekt-lokal: `agent-os/templates/profile-optimization/`
2. Global: `~/.agent-os/templates/profile-optimization/`

Wenn Templates nicht gefunden werden, wird der eingebettete Template-Inhalt aus diesem Workflow verwendet.

## Technologie-Spezifische Ergänzungen

<technology_supplements>

### Angular
- **v14-15:** Standalone Components, inject() function, typed forms
- **v16-17:** Signals, @defer, @if/@for/@switch, hydration
- **v18-20:** Zoneless, Partial Hydration, Vite/Esbuild

### React
- **v18+:** Concurrent Features, Server Components, Suspense, Automatic Batching
- **v19+:** React Compiler, Actions, use() hook

### Vue
- **v3+:** Composition API, <script setup>, Teleport, Suspense
- **v3.3+:** defineModel, generic components

### TypeScript
- **v5+:** Decorators, const type parameters, satisfies operator
- **v5.2+:** using declarations, explicit resource management

### Node.js
- **v18+:** Fetch API, Test Runner, Watch mode
- **v20+:** Stable Test Runner, Permission Model

</technology_supplements>

## Final Checklist

<verify>
  - [ ] Job description eingelesen
  - [ ] Alle Anforderungen extrahiert (Muss/Soll)
  - [ ] Buzzwords pro Anforderung identifiziert
  - [ ] Buzzword-Gruppen mit UND/ODER gebildet
  - [ ] Intelligente Ergänzungen basierend auf Versionen
  - [ ] Output-Struktur erstellt
  - [ ] 01-requirements-analysis.md geschrieben
  - [ ] Input-Dateien gesichert
  - [ ] Statistik präsentiert
</verify>
