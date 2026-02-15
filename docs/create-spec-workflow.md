# /create-spec Workflow - Übersicht

> Workflow Version: 3.5
> Dauer: 30-60 Minuten | User-Interaktionen: 5-7 Entscheidungspunkte
> Erstellt detaillierte Feature-Spezifikationen mit PO (fachlich) + Architect (technisch)

## Flowchart

![create-spec Workflow](assets/create-spec-workflow.png)

## Steps

| Step | Name | Beschreibung | Skill / Agent | Rolle |
|------|------|-------------|---------------|-------|
| **1** | Feature Selection | Feature aus Roadmap wählen oder eigene Idee | — | Main (PO) |
| **2.1** | Requirements Dialog | Iterative fachliche Anforderungserhebung | — | Main (PO) |
| **2.2** | Clarification Document | Anforderungszusammenfassung erstellen | — | Main (PO) |
| **2.3** | User Approval | Clarification genehmigen / ändern / weiter diskutieren | — | Main (PO) |
| **2.5** | Implementation Plan | Lückenloser Plan mit Self-Review und Minimalinvasiv-Analyse | — | **Plan Agent** (delegiert) |
| **2.5.2** | Plan Review | User reviewed Plan (4 Optionen) | — | Main |
| **2.6** | Generate Stories | User Stories aus Plan ableiten (Gherkin-Style, nur fachlich) | — | Main (PO) |
| **3** | Technical Refinement | Technische Details pro Story + System Stories | architect-refinement | Main (Architect) |
| **3.4** | DoR Validation | Alle DoR-Checkboxen prüfen | architect-refinement | Main |
| **3.5** | Story Size Validation | Stories auf Größe prüfen (max 5 Files, 400 LOC) | — | Main |
| **3.5.1** | Estimation Decision | Optional: Aufwandsschätzung erstellen? | — | Main |
| **3.6** | Effort Estimation | Dual-Schätzung: Human-only + Human+AI | — | Main |
| **4** | Spec Complete | Zusammenfassung, bereit für /execute-tasks | — | Main |

## Input-Dokumente (Kontext)

Der Workflow liest an verschiedenen Stellen bestehende Projekt-Dokumente, um fundierte Entscheidungen zu treffen. Diese Dokumente werden typischerweise durch `/plan-product` oder `/plan-platform` erstellt.

### Produkt-Dokumente (`specwright/product/`)

| Dokument | Verwendet in | Zweck |
|----------|-------------|-------|
| **roadmap.md** | Step 1 | Feature-Auswahl aus geplanter Roadmap |
| **product-brief-lite.md** | Step 2.1 | Produktkontext für Requirements-Dialog |
| **tech-stack.md** | Step 2.5, Step 3 | Technologie-Entscheidungen (Sprachen, Frameworks, DB, etc.) für Plan und Refinement |
| **architecture-structure.md** | Step 2.5, Step 3 | Projekt-Struktur (Verzeichnisse, Module, Layer) für architekturkonforme Planung |
| **architecture-decision.md** | Step 3 | Architektur-Entscheidungen (Patterns, Konventionen, Begründungen) für technisches Refinement |

### Team-Dokumente (`specwright/team/`)

| Dokument | Verwendet in | Zweck |
|----------|-------------|-------|
| **dor.md** | Step 3.4 | Definition of Ready — Kriterien, wann eine Story bereit für Implementierung ist |
| **dod.md** | Step 3 | Definition of Done — Kriterien, wann eine Story als fertig gilt |

### Knowledge & Standards

| Dokument | Verwendet in | Zweck |
|----------|-------------|-------|
| **knowledge/knowledge-index.md** | Step 2.1, Step 2.5, Step 2.6 | Wiederverwendbare Artefakte (Komponenten, Services, etc.) aus früheren Specs |
| **standards/plan-review-guidelines.md** | Step 2.5 | Leitlinien für den Self-Review des Implementation Plans |
| **standards/story-size-guidelines.md** | Step 3.5 | Schwellenwerte für Story-Größe (max. Files, LOC) |

### Zusammenhang der Dokumente

```
/plan-product oder /plan-platform
    ├── product-brief-lite.md ──────────→ Step 2.1 (Requirements Dialog)
    ├── roadmap.md ─────────────────────→ Step 1   (Feature Selection)
    ├── tech-stack.md ──────────────────→ Step 2.5 (Plan) + Step 3 (Refinement)
    ├── architecture-structure.md ──────→ Step 2.5 (Plan) + Step 3 (Refinement)
    └── architecture-decision.md ───────→ Step 3   (Refinement)

/build-development-team
    ├── dor.md ─────────────────────────→ Step 3.4 (DoR Validation)
    └── dod.md ─────────────────────────→ Step 3   (DoD pro Story)

Vorherige /create-spec + /execute-tasks
    └── knowledge/knowledge-index.md ───→ Step 2.1 + 2.5 + 2.6 (Reuse)
```

**Hinweis:** Alle Dokumente sind optional. Fehlen sie, arbeitet der Workflow mit den Informationen aus dem Requirements-Dialog und der Codebase-Analyse.

## Phasen-Übersicht

Der Workflow hat 4 klar getrennte Phasen:

```
┌─────────────────────────────────────────────────────────┐
│  PO Phase (Steps 1 - 2.3)                               │
│  → Fachliche Anforderungen erheben & genehmigen         │
├─────────────────────────────────────────────────────────┤
│  Planning Phase (Steps 2.5 - 2.6)                       │
│  → Implementation Plan + Story-Generierung              │
├─────────────────────────────────────────────────────────┤
│  Architect Phase (Steps 3 - 3.5)                        │
│  → Technisches Refinement + Validierung                 │
├─────────────────────────────────────────────────────────┤
│  Finalization (Steps 3.5.1 - 4)                         │
│  → Optionale Schätzung + Summary                        │
└─────────────────────────────────────────────────────────┘
```

## Human-in-the-Loop Punkte

| Gate | Step | Was passiert? |
|------|------|--------------|
| **Wahl** | Step 1 | User wählt Feature aus Roadmap oder gibt eigene Idee ein |
| **Interaktiv** | Step 2.1 | Iterativer Dialog: Feature-Details, Edge Cases, Dependencies, Scope |
| **Review Gate 1** | **Step 2.3** | User approved Clarification — Loop: Änderungen / Weiter diskutieren |
| **Review Gate 2** | **Step 2.5.2** | User reviewed Implementation Plan — 4 Optionen: Genehmigen / Editor / Besprechen / Zurück |
| **Entscheidung** | Step 3.4 | Bei DoR-Lücken: Fix / Manuell editieren / Trotzdem weiter |
| **Entscheidung** | Step 3.5 | Bei zu großen Stories: Manuell editieren / Auto-Split / Trotzdem weiter |
| **Entscheidung** | Step 3.5.1 | Effort Estimation erstellen? (JA / SKIP) |
| **Wahl** | Step 4 | Nächster Schritt: Review / Execute / Mehr Stories |

## Implementation Plan (Step 2.5) - Detail

Der Plan Agent (delegiert via Task tool) führt folgende Schritte durch:

| Schritt | Beschreibung |
|---------|-------------|
| **1. Knowledge laden** | Project Knowledge aus `knowledge-index.md` laden (wenn vorhanden) |
| **2. Codebase erkunden** | Ähnliche Features, wiederverwendbare Patterns, bestehende Infrastruktur |
| **3. Plan erstellen** | Executive Summary, Architektur, Komponenten, Phasen, Risiken |
| **4. Self-Review** | Kritischer Review (Kollegen-Methode): Vollständigkeit, Konsistenz, Risiken, Alternativen, Verbindungen |
| **5. Minimalinvasiv-Analyse** | Reuse prüfen, Change Scope minimieren, Feature-Preservation sicherstellen |
| **6. Status setzen** | Plan auf "PENDING_USER_REVIEW" setzen |

## Technical Refinement (Step 3) - Detail

Der Main Agent ergänzt pro Story (guided by architect-refinement skill):

| Bereich | Inhalt |
|---------|--------|
| **Layer-Analyse** | Alle betroffenen Layer identifizieren (Frontend, Backend, DB, etc.) |
| **DoR Checkliste** | Alle Ready-Kriterien als [x] markieren |
| **DoD Checkliste** | Done-Kriterien definieren (alle [ ] unchecked) |
| **WAS** | Welche Komponenten erstellt/geändert werden |
| **WIE** | Architektur-Guidance (Patterns, Constraints — kein Code!) |
| **WO** | Betroffene Dateipfade |
| **Abhängigkeiten** | Story-IDs die Voraussetzung sind |
| **Komplexität** | XS / S / M / L / XL |
| **Relevante Skills** | 1-3 Skills aus `.claude/skills/` |
| **Creates Reusable** | Entstehen wiederverwendbare Artefakte? |
| **Completion Check** | Bash-Befehle zur automatischen Verifikation |
| **Integration DoD** | Wenn Story Verbindung herstellt: Validierungsbefehle |

### System Stories (immer erstellt)

| Story | Zweck | Abhängigkeit |
|-------|-------|-------------|
| **story-997** | Code Review (Opus reviewt gesamten Feature-Diff) | Alle regulären Stories |
| **story-998** | Integration Validation (Tests aus spec.md) | story-997 |
| **story-999** | Finalize PR (User-Todos, PR, Cleanup) | story-998 |

## Output-Dokumente

| Step | Dokument | Pfad | Optional? |
|------|----------|------|-----------|
| 2.2 | **requirements-clarification.md** | `specwright/specs/YYYY-MM-DD-name/` | Nein |
| 2.5 | **implementation-plan.md** | `specwright/specs/YYYY-MM-DD-name/` | Nein |
| 2.6 | **spec.md** | `specwright/specs/YYYY-MM-DD-name/` | Nein |
| 2.6 | **spec-lite.md** | `specwright/specs/YYYY-MM-DD-name/` | Nein |
| 2.6 | **story-index.md** | `specwright/specs/YYYY-MM-DD-name/` | Nein |
| 2.6 | **kanban.json** | `specwright/specs/YYYY-MM-DD-name/` | Nein |
| 2.6 | **stories/story-NNN-[slug].md** (N Stück, fachlich) | `specwright/specs/YYYY-MM-DD-name/stories/` | Nein |
| 3 | **stories/story-NNN-[slug].md** (aktualisiert, technisch) | `specwright/specs/YYYY-MM-DD-name/stories/` | Nein |
| 3 | **stories/story-997-code-review.md** | `specwright/specs/YYYY-MM-DD-name/stories/` | Nein |
| 3 | **stories/story-998-integration-validation.md** | `specwright/specs/YYYY-MM-DD-name/stories/` | Nein |
| 3 | **stories/story-999-finalize-pr.md** | `specwright/specs/YYYY-MM-DD-name/stories/` | Nein |
| 3 | **sub-specs/cross-cutting-decisions.md** | `specwright/specs/YYYY-MM-DD-name/sub-specs/` | Ja |
| 3.6 | **effort-estimation.md** | `specwright/specs/YYYY-MM-DD-name/` | Ja |

**Gesamt:** 8+ Dokumente + N Story-Files + 3 System Stories + optionale Effort Estimation

### Spec-Folder-Struktur

```
specwright/specs/YYYY-MM-DD-spec-name/
├── requirements-clarification.md    # Genehmigte Anforderungen
├── implementation-plan.md           # Self-reviewed Plan
├── spec.md                          # Vollständige Spezifikation
├── spec-lite.md                     # Kurzfassung
├── story-index.md                   # Story-Übersicht (human-readable)
├── kanban.json                      # Kanban State (machine-readable)
├── effort-estimation.md             # Optional: Aufwandsschätzung
├── stories/
│   ├── story-001-[slug].md          # Fachlich + Technisch
│   ├── story-002-[slug].md
│   ├── ...
│   ├── story-997-code-review.md     # System Story
│   ├── story-998-integration-validation.md
│   └── story-999-finalize-pr.md
└── sub-specs/                       # Optional
    └── cross-cutting-decisions.md
```

## Skills & Agents

| Skill / Agent | Steps | Zweck |
|---------------|-------|-------|
| architect-refinement (Skill) | 3, 3.4 | Technisches Refinement, DoR/DoD, Layer-Analyse |
| Plan Agent (delegiert) | 2.5 | Implementation Plan mit Self-Review |
| date-checker (Utility) | 2.2 | Aktuelles Datum für Spec-Folder |

## Unterschied zu anderen Workflows

| Aspekt | /create-spec | /plan-product | /analyze-product |
|--------|-------------|--------------|-----------------|
| **Scope** | Ein Feature | Gesamtes Produkt | Bestehende Codebase |
| **Output** | Spec + Stories | Product Docs | Product Docs (aus Code) |
| **Rollen** | PO + Architect | Strategist | Analyst |
| **Nächster Schritt** | /execute-tasks | /create-spec | /create-spec |
| **Stories** | Ja (Gherkin) | Nein | Nein |
| **Plan** | Implementation Plan | Roadmap | Roadmap + Phase 0 |

## Farbkodierung (Diagramm)

| Farbe | Bedeutung |
|-------|-----------|
| Blau | Main Agent mit Skill (Kernarbeit) |
| Lila | Plan Agent (delegierte Planung) |
| Orange | User Input / Interaktive Dialoge |
| Rot/Rosa | Review Gates / Entscheidungspunkte |
| Grün | Output-Dokumente |
| Gelb | Optionale Schritte |
