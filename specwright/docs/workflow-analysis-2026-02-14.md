# Workflow-Analyse: Sub-Agent vs. Skills Pattern

> **Datum:** 2026-02-14
> **Zweck:** Systematische Analyse aller Specwright-Workflows auf Ungereimtheiten zwischen altem Sub-Agent-Pattern und neuem Main-Agent + Skills Pattern
> **Kontext:** Specwright hat sich von workflow-basiertem Sub-Agent-Delegation zu Main-Agent mit Skills on demand entwickelt. Der aktuelle Zustand ist ein Mix aus beidem.

## Hintergrund & Konzept

### Architektur-Entscheidung
- **Alt:** Sub-Agents (separate Task-Delegationen) für verschiedene Aufgaben der Workflows
- **Neu:** Main Agent + Skills on demand + Utility Agents für einfache Tasks
- **Problem mit Sub-Agents:** Kontextverlust bei Delegation, da Sub-Agents eigenes Context-Window haben

### Korrektes Pattern (Referenz: add-todo, add-story)
```
Main Agent:
  1. Lädt benötigte Skills (z.B. architect-refinement)
  2. Führt Aufgabe selbst aus mit Skill-Guidance
  3. Nur Utility Agents für kontextunabhängige Tasks (date-checker, file-creator, git-workflow)
```

### Falsches Pattern (Alt: plan-product, retroactive-doc)
```
Main Agent:
  1. Delegiert an Sub-Agent (product-strategist, tech-architect, etc.) via Task tool
  2. Sub-Agent arbeitet ohne vollen Kontext
  3. Main Agent wartet auf Ergebnis
```

---

## Analyse pro Workflow (Prioritäts-Reihenfolge)

### 1. plan-product (v5.0)

**Status: ✅ Migriert - Main Agent + Skills, Utility Agents bleiben**

| Step | Pattern | Aufgabe | Status |
|------|---------|---------|--------|
| 1 | context-fetcher (Utility) | Check existing brief | ✅ Utility - OK |
| 3 | Main Agent + product-strategy Skill | Idea Sharpening | ✅ Migriert |
| 5 | Main Agent + tech-stack-recommendation Skill | Tech Stack Recommendation | ✅ Migriert |
| 5.5 | Main Agent + tech-stack-recommendation Skill | Project Standards | ✅ Migriert |
| 5.6 | Main Agent + design-system-extraction Skill | Design System | ✅ Migriert |
| 5.7 | Main Agent + ux-patterns-definition Skill | UX Patterns | ✅ Migriert |
| 6 | Main Agent | Roadmap Generation | ✅ Kein Sub-Agent |
| 7 | Main Agent + architecture-decision Skill | Architecture Decision | ✅ Migriert |
| 7.5 | file-creator (Utility) | Secrets Setup | ✅ Utility - OK |
| 8 | file-creator (Utility) | Boilerplate Generation | ✅ Utility - OK |
| 9 | file-creator (Utility) | Update CLAUDE.md | ✅ Utility - OK |

**Neue Skills:** product-strategy, tech-stack-recommendation, design-system-extraction, ux-patterns-definition, architecture-decision
**Alle in:** `specwright/templates/skills/[skill-name]/SKILL.md`

**Datei:** `specwright/workflows/core/plan-product.md`

---

### 2. plan-platform (v2.0)

**Status: ✅ Migriert - Main Agent + 5 Skills, Utility Agents bleiben**

| Step | Pattern | Aufgabe | Status |
|------|---------|---------|--------|
| 1 | Main Agent | Platform Idea Capture | ✅ Kein Sub-Agent |
| 2 | Main Agent + product-strategy Skill | Platform Brief Creation | ✅ Migriert |
| 3 | Main Agent | User Review Gate | ✅ Kein Sub-Agent |
| 4 | Main Agent + product-strategy Skill | Module Identification | ✅ Migriert |
| 5 | Main Agent + tech-stack-recommendation Skill | Tech Stack Recommendation | ✅ Migriert |
| 5.5 | Main Agent + tech-stack-recommendation Skill | Project Standards | ✅ NEU |
| 5.6 | Main Agent + design-system-extraction Skill | Design System | ✅ Migriert |
| 5.7 | Main Agent + ux-patterns-definition Skill | UX Patterns | ✅ NEU |
| 5.8 | file-creator (Utility) | Secrets Setup | ✅ Utility - OK |
| 6 | Main Agent + architecture-decision Skill | Dependency Analysis | ✅ Migriert |
| 7 | Main Agent + architecture-decision Skill | Platform Architecture | ✅ Migriert |
| 8 | Main Agent | Platform Roadmap | ✅ Kein Sub-Agent |
| 9 | Main Agent | Module Roadmaps | ✅ Kein Sub-Agent |
| 10 | file-creator (Utility) | Update CLAUDE.md | ✅ Utility - OK |

**Gleiche 5 Skills wie plan-product:** product-strategy, tech-stack-recommendation, design-system-extraction, ux-patterns-definition, architecture-decision

**Datei:** `specwright/workflows/core/plan-platform.md`

---

### 3. build-development-team (v3.1)

**Status: ✅ Vollständig aligned - Goldstandard**

Dieses Workflow ist das **Referenz-Workflow** für das neue Pattern:
- Explizit: "No Sub-Agents - main agent executes stories directly"
- Skills werden in `.claude/skills/` erstellt (Claude Code Standard)
- Explizit: "No skill-index.md (skills load automatically via globs)"
- Explizit: "No agent assignment in stories"

**v3.1:** Step 9.5 Custom Skill Detection → Main Agent (war: tech-architect Sub-Agent)

**Datei:** `specwright/workflows/core/build-development-team.md`

---

### 4. create-spec (v3.4)

**Status: ❌ Größte Inkonsistenz - Mix aus alt und neu**

#### Sub-Agent-Pattern (Alt):
| Step | Sub-Agent/Pattern | Problem |
|------|-------------------|---------|
| 2.5 | "Plan Agent" via Task tool | Delegation für Implementation Planning |
| 3 | `dev-team__architect` via Task tool | Delegation für Technical Refinement |

#### Falsche Referenzen:
- **skill-index.md:** Referenziert `specwright/team/skill-index.md` - aber build-dev-team v3.0 sagt explizit "No skill-index.md"
- **Skill-Pfade:** Referenziert `specwright/skills/[skill].md` - aber build-dev-team v3.0 schreibt Skills nach `.claude/skills/`
- **WER-Feld:** Stories enthalten WER-Feld mit Agent-Referenzen (`dev-team__backend-developer`, etc.) - aber build-dev-team v3.0 sagt "NO WER field"

#### Direkte Widersprüche mit anderen Workflows:
- `add-todo` und `add-story` machen **dieselbe** Architect-Refinement-Arbeit korrekt über Main Agent + Skill
- `create-spec` macht es noch über Sub-Agent-Delegation
- Das ist ein **direkter Widerspruch** innerhalb des Frameworks

#### Wichtige Version History in create-spec:
- v2.4: "Architect now selects relevant skills from skill-index.md" (alt)
- v2.5: Pre-Refinement Layer Analysis
- v2.8: Implementation Plan mit Self-Review
- v2.9: Komponenten-Verbindungen
- v3.0: System Stories (997, 998, 999)
- v3.2: Plan-Agent Delegation
- v3.3: JSON Migration (kanban.json)
- v3.4: Optional Effort Estimation

**Datei:** `specwright/workflows/core/create-spec.md`

---

### 5. add-todo (v2.0)

**Status: ✅ Aligned mit neuem Pattern**

- Step 4: "Main agent does technical refinement guided by architect-refinement skill"
- `LOAD skill: .claude/skills/architect-refinement/SKILL.md`
- Kein WER-Feld
- Korrekte Skill-Pfade

**Kleine Inkonsistenz:**
- Command-Beschreibung sagt noch "dev-team__po gathers brief requirements" und "dev-team__architect adds technical refinement" - klingt nach Sub-Agents, ist aber als Rollen-Metapher gemeint

**Datei:** `specwright/workflows/core/add-todo.md`

---

### 6. add-bug (v3.1)

**Status: ❌ Gemischtes Pattern**

| Step | Pattern | Status |
|------|---------|--------|
| 2.5 | User Hypothesis Dialog (Main Agent) | ✅ OK |
| 3 | RCA via Sub-Agent (`dev-team__frontend-developer-*`, etc.) | ❌ Alt |
| 3.5 | Fix-Impact Analysis (Main Agent) | ✅ OK |
| 3.75 | Bug Complexity + optional "Plan Agent" via Task | ⚠️ Task-Delegation |
| 4 | Create Bug Story (Main Agent) | ✅ OK |
| 5 | Architect Refinement via Skill | ✅ Neu - korrekt |
| 5.5 | Size Validation (Main Agent) | ✅ OK |

**Hauptproblem:**
- Step 3 hat `<determine_agent>` Block der Bug-Typen auf Sub-Agents mappt:
  - Frontend → `dev-team__frontend-developer-*`
  - Backend → `dev-team__backend-developer-*`
  - DevOps → `dev-team__devops-specialist`
  - Integration → `dev-team__architect`
- Das ist das alte Pattern - die RCA sollte der Main Agent mit passenden Skills machen

**Datei:** `specwright/workflows/core/add-bug.md`

---

### 7. add-story (v2.0)

**Status: ✅ Aligned mit neuem Pattern**

- Step 4: "Main agent does technical refinement guided by architect-refinement skill"
- `LOAD skill: .claude/skills/architect-refinement/SKILL.md`
- Kein WER-Feld
- Korrekte Skill-Pfade

**Datei:** `specwright/workflows/core/add-story.md`

---

### 8. retroactive-spec (v2.0)

**Status: ✅ Migriert - Main Agent für Codebase-Analyse, Utility Agents bleiben**

| Step | Pattern | Aufgabe | Status |
|------|---------|---------|--------|
| Pre-Flight | - | Pre-Flight Check | ✅ Pfad gefixt |
| 1 | Main Agent | Feature Identification | ✅ Kein Sub-Agent |
| 2.1 | Main Agent | Code Discovery (Glob, Grep) | ✅ Migriert (war: codebase-analyzer) |
| 2.2 | Main Agent | Implementation Analysis | ✅ Migriert (war: codebase-analyzer) |
| 2.3 | Main Agent | Interactive Clarification | ✅ Kein Sub-Agent |
| 3 | Main Agent | Feature Validation | ✅ Kein Sub-Agent |
| 4 | date-checker (Utility) | Date Determination | ✅ Utility - OK |
| 5 | file-creator (Utility) | Spec Generation | ✅ Utility - OK |
| 6 | Main Agent | User Review | ✅ Kein Sub-Agent |

**Datei:** `specwright/workflows/core/retroactive-spec.md`

---

### 9. retroactive-doc (v2.0)

**Status: ✅ Migriert - Main Agent für Codebase-Analyse, Utility Agents bleiben**

| Step | Pattern | Aufgabe | Status |
|------|---------|---------|--------|
| Pre-Flight | - | Pre-Flight Check | ✅ Pfad gefixt |
| 1 | Main Agent | Codebase Analysis (Glob, Grep, Read) | ✅ Migriert (war: context-fetcher) |
| 2 | Main Agent | Feature Discovery & Categorization | ✅ Migriert (war: context-fetcher) |
| 3 | Main Agent | Deep Feature Analysis (Read) | ✅ Migriert (war: context-fetcher) |
| 4 | Main Agent | Interactive Feature Discovery | ✅ Kein Sub-Agent |
| 5 | date-checker (Utility) | Date Determination | ✅ Utility - OK |
| 6 | file-creator (Utility) | Retroactive Spec Creation | ✅ Utility - OK |
| 7 | file-creator (Utility) | Retro Notes Creation | ✅ Utility - OK |
| 9 | file-creator (Utility) | User Documentation Creation | ✅ Utility - OK |

**Datei:** `specwright/workflows/core/retroactive-doc.md`

---

### 10. validate-market (v5.0)

**Status: ✅ Migriert - Main Agent für alle Steps, Utility Agents bleiben**

| Step | Pattern | Aufgabe | Status |
|------|---------|---------|--------|
| 1 | Main Agent | Product Idea Capture | ✅ Kein Sub-Agent |
| 2 | Main Agent | User Review Gate | ✅ Kein Sub-Agent |
| 3 | Main Agent | Idea Sharpening | ✅ Migriert (war: product-idea-refiner) |
| 4 | Main Agent | User Review Gate | ✅ Kein Sub-Agent |
| 5 | Main Agent | Competitive Analysis | ✅ Migriert (war: market-researcher) |
| 6 | Main Agent | Market Positioning | ✅ Migriert (war: product-strategist) |
| 7 | Main Agent | User Review Gate | ✅ Kein Sub-Agent |
| 8 | Main Agent | Design System Extraction | ✅ Migriert (war: design-extractor) |
| 9 | Main Agent | Page Structure | ✅ Migriert (war: landing-page-builder) |
| 10 | Main Agent | SEO Keywords | ✅ Migriert (war: seo-expert) |
| 11 | Main Agent | Content Creation | ✅ Migriert (war: content-creator) |
| 12 | Main Agent | Landing Page Build | ✅ Migriert (war: landing-page-builder) |
| 13 | Main Agent | Quality Assurance | ✅ Migriert (war: quality-assurance) |
| 14 | Main Agent | Campaign Planning | ✅ Migriert (war: validation-specialist) |
| 15 | Main Agent | User Campaign Execution | ✅ Kein Sub-Agent |
| 16 | Main Agent | GO/NO-GO Analysis | ✅ Migriert (war: business-analyst) |
| 17 | Main Agent | Decision & Next Steps | ✅ Kein Sub-Agent |

**10 Sub-Agents entfernt:** product-idea-refiner, market-researcher, product-strategist, design-extractor, landing-page-builder (2x), seo-expert, content-creator, quality-assurance, validation-specialist, business-analyst
**Utility Agents bleiben:** context-fetcher (Pre-Flight)
**Keine separaten Skills nötig:** Workflow läuft einmal pro Produkt, Guidance ist inline

**Datei:** `specwright/workflows/validation/validate-market.md`

---

### 11. validate-market-for-existing (v2.0)

**Status: ✅ Migriert - Main Agent für alle Steps, Utility Agents bleiben**

| Step | Pattern | Aufgabe | Status |
|------|---------|---------|--------|
| 1 | context-fetcher (Utility) | Check Product Brief | ✅ Utility - OK |
| 2 | Main Agent | Create Product Brief | ✅ Migriert (war: product-strategist) |
| 3 | Main Agent | Competitive Analysis | ✅ Migriert (war: market-researcher) |
| 4 | Main Agent | Market Positioning | ✅ Migriert (war: market-researcher) |
| 5 | Main Agent | User Review Gate | ✅ Kein Sub-Agent |
| 6 | Main Agent | Validation Summary | ✅ Kein Sub-Agent |

**3 Sub-Agents entfernt:** product-strategist, market-researcher (2x)
**Utility Agents bleiben:** context-fetcher (1)
**Keine separaten Skills nötig:** Workflow läuft einmal pro Produkt, Guidance ist inline

**Datei:** `specwright/workflows/validation/validate-market-for-existing.md`

---

## Zusammenfassung

### Status-Übersicht

| Workflow | Version | Status | Hauptproblem |
|----------|---------|--------|--------------|
| build-dev-team | v3.1 | ✅ Vollständig aligned | Goldstandard - keine offenen Punkte |
| add-todo | v2.0 | ✅ Aligned | Command-Beschreibung alt |
| add-story | v2.0 | ✅ Aligned | - |
| create-spec | v3.5 | ✅ Migriert | Step 3 Main Agent + Skill, Plan Agent bleibt (bewusst), WER entfernt, Skill-Pfade gefixt |
| add-bug | v3.2 | ✅ Migriert | RCA Main Agent, Architect Skill + Hybrid Lookup, PlanAgent bleibt |
| plan-product | v5.0 | ✅ Migriert | Main Agent + 5 Skills, Utility Agents bleiben |
| plan-platform | v2.0 | ✅ Migriert | Main Agent + 5 Skills, Utility Agents bleiben |
| retroactive-spec | v2.0 | ✅ Migriert | Main Agent für Codebase-Analyse, Utility Agents bleiben |
| retroactive-doc | v2.0 | ✅ Migriert | Main Agent für Codebase-Analyse, Utility Agents bleiben |
| validate-market | v5.0 | ✅ Migriert | 10 Sub-Agents entfernt, Main Agent für alle Steps |
| validate-market-for-existing | v2.0 | ✅ Migriert | 3 Sub-Agents entfernt, Main Agent für alle Steps |
| change-spec | v2.0 | ✅ Portiert+Migriert | Neuer Workflow (ex update-feature), Main Agent |
| document-feature | v2.0 | ✅ Portiert+Migriert | Neuer Workflow, Main Agent + Utility Agents |
| analyze-product | v2.0 | ✅ Portiert+Migriert | Main Agent + product-strategy Skill |
| process-feedback | v2.0 | ✅ Portiert+Migriert | Main Agent (war bereits kompatibel) |
| update-changelog | v2.0 | ✅ Portiert+Migriert | Main Agent, bilingualer Changelog |
| analyze-feasibility | v2.0 | ✅ Portiert+Migriert | Main Agent + optionale Market-Analyse |
| analyze-blockers | v2.0 | ✅ Portiert+Migriert | Main Agent (war: business-analyst) |
| estimate-spec | v2.0 | ✅ Portiert+Migriert | estimation-specialist Delegation beibehalten |
| validate-estimation | v2.0 | ✅ Portiert+Migriert | Main Agent (war bereits kompatibel) |
| extract-design | v2.0 | ✅ Neu erstellt | Standalone Design-Extraktion + Skill |
| brainstorm-upselling-ideas | v2.0 | ✅ Portiert+Migriert | Interaktiver Brainstorm, Main Agent |
| create-instagram-account | v2.0 | ✅ Portiert+Migriert | Marketing-Workflow, Main Agent |
| create-content-plan | v2.0 | ✅ Portiert+Migriert | Marketing-Workflow, Main Agent |

### Command-Beschreibungen mit falschen Referenzen

| Command | Datei | Problem |
|---------|-------|---------|
| create-spec | `.claude/commands/specwright/create-spec.md` | ✅ Gefixt in v3.5 |
| add-todo | `.claude/commands/specwright/add-todo.md` | ✅ Gefixt - Main Agent + architect-refinement Skill |
| add-bug | `.claude/commands/specwright/add-bug.md` | ✅ Gefixt in v3.2 |

### Pfad-Inkonsistenzen

| Workflow | Pre-Flight Pfad | Sollte sein |
|----------|----------------|-------------|
| plan-product | `specwright/workflows/meta/pre-flight.md` | ✅ OK |
| plan-platform | `specwright/workflows/meta/pre-flight.md` | ✅ OK |
| build-dev-team | `specwright/workflows/meta/pre-flight.md` | ✅ OK |
| create-spec | `specwright/workflows/meta/pre-flight.md` | ✅ OK |
| add-todo | `specwright/workflows/meta/pre-flight.md` | ✅ OK |
| add-bug | `specwright/workflows/meta/pre-flight.md` | ✅ OK |
| add-story | `specwright/workflows/meta/pre-flight.md` | ✅ OK |
| retroactive-spec | `specwright/workflows/meta/pre-flight.md` | ✅ Gefixt |
| retroactive-doc | `specwright/workflows/meta/pre-flight.md` | ✅ Gefixt |

### Skill-Pfad-Inkonsistenzen

| Referenz in Workflow | Korrekt (build-dev-team v3.0) |
|----------------------|-------------------------------|
| `specwright/team/skill-index.md` | Gibt es nicht mehr |
| `specwright/skills/[skill].md` | `.claude/skills/[skill]/SKILL.md` |
| WER-Feld mit Agent-Referenzen | Kein WER-Feld mehr |

---

## Migrationsfortschritt

### Erledigt
1. ✅ **create-spec v3.5** - Step 3 → Main Agent + Skill, WER entfernt, Skill-Pfade gefixt, Command aktualisiert
   - **Entscheidung:** Step 2.5 Plan Agent Delegation bleibt (Input dokumentiert, profitiert von fokussiertem Kontext)
   - **Neu:** Hybrid Skill Lookup (`.claude/skills/` → `~/.specwright/templates/skills/`)

2. ✅ **add-bug v3.2** - Step 3 RCA → Main Agent, WER entfernt, Hybrid Skill Lookup, Command aktualisiert
   - **Entscheidung:** Step 3.75 PlanAgent Delegation bleibt (gleiche Logik wie create-spec)

3. ✅ **plan-product v5.0** - Steps 3, 5, 5.5, 5.6, 5.7, 7 → Main Agent + Skills
   - **5 neue Skills:** product-strategy, tech-stack-recommendation, design-system-extraction, ux-patterns-definition, architecture-decision
   - **Utility Agents bleiben:** context-fetcher (1), file-creator (7.5, 8, 9)

4. ✅ **plan-platform v2.0** - Steps 2, 4, 5, 5.6, 6, 7 → Main Agent + Skills
   - **Gleiche 5 Skills wie plan-product** (product-strategy, tech-stack-recommendation, design-system-extraction, ux-patterns-definition, architecture-decision)
   - **NEU:** Step 5.5 (Project Standards), Step 5.7 (UX Patterns) aus plan-product übernommen
   - **Utility Agents bleiben:** file-creator (5.8, 10)
   - **Secrets renumbered:** 5.6 → 5.8

5. ✅ **retroactive-spec v2.0** - Steps 2.1, 2.2 → Main Agent, Pre-Flight Pfad gefixt
   - **codebase-analyzer** Delegation entfernt → Main Agent führt Code Discovery + Analysis selbst aus
   - **Utility Agents bleiben:** date-checker (4), file-creator (5)

6. ✅ **retroactive-doc v2.0** - Steps 1, 2, 3 → Main Agent, Pre-Flight Pfad gefixt, Pfade gefixt
   - **context-fetcher** Delegation entfernt → Main Agent führt Codebase Analysis, Feature Discovery + Analysis selbst aus
   - **Pfade:** `.specwright/specs/` → `specwright/specs/`, `.specwright/docs/` → `specwright/docs/`
   - **Utility Agents bleiben:** date-checker (5), file-creator (6, 7, 9)

7. ✅ **build-dev-team v3.1** - Step 9.5 Custom Skill Detection → Main Agent
   - **tech-architect** Sub-Agent Delegation entfernt
   - Main Agent nutzt Detection Checklist + bestehende Custom-Skill-Templates direkt
   - Kein separater Skill nötig (Templates existieren bereits, Step läuft einmal pro Setup)

8. ✅ **add-todo Command** - Sub-Agent-Referenzen entfernt, WER→WAS/WIE/WO
   - `dev-team__po` → "Main agent gathers brief requirements"
   - `dev-team__architect` → "Main agent guided by architect-refinement skill"
   - `WAS/WIE/WO/WER` → `WAS/WIE/WO` (kein WER-Feld mehr)

9. ✅ **validate-market v5.0** - 10 Sub-Agent-Delegationen entfernt
   - `product-idea-refiner`, `market-researcher`, `product-strategist`, `design-extractor`, `landing-page-builder` (2x), `seo-expert`, `content-creator`, `quality-assurance`, `validation-specialist`, `business-analyst` → Main Agent
   - Agent Handoff Chain → Workflow Flow Diagramm
   - Quality Checks: "RETURN to agent" → "REDO" Pattern
   - Command-Datei aktualisiert (Specialist Agents Tabelle entfernt)
   - Keine separaten Skills nötig (Workflow läuft einmal pro Produkt)

10. ✅ **validate-market-for-existing v2.0** - 3 Sub-Agent-Delegationen entfernt
    - `market-researcher` (Steps 3, 4), `product-strategist` (Step 2) → Main Agent
    - Quality Check: "RETURN to market-researcher" → "REDO" Pattern
    - Keine separaten Skills nötig (Workflow läuft einmal pro Produkt)

11. ✅ **change-spec v2.0** - Neuer Workflow (portiert aus agent-os-extended update-feature)
    - Vereint update-feature + change-spec Funktionalität
    - Main Agent für alle Steps, file-creator (Utility) für Dateierstellung
    - Unterstützt: add-feature, modify-feature, remove-feature, change-scope, update-architecture

12. ✅ **document-feature v2.0** - Neuer Workflow (portiert aus agent-os-extended)
    - Main Agent für Codebase-Analyse und Dokumentationsgenerierung
    - context-fetcher (Utility) für Spec-Loading, file-creator (Utility) für Dokumenterstellung
    - Output: User-facing Dokumentation in `specwright/docs/[Feature-Name]/`

13. ✅ **auto-execute.sh v2.0** - Script portiert und migriert auf kanban.json
    - Von kanban-board.md (Markdown-Regex) auf kanban.json (jq JSON-Parsing)
    - jq-Prerequisite-Check hinzugefügt
    - Legacy-Fallback auf kanban-board.md beibehalten

14. ✅ **analyze-product v2.0** - Neuer Workflow (portiert aus agent-os-extended)
    - Steps 1-7, 9-10: Main Agent (war: context-fetcher/product-strategist Sub-Agents)
    - Step 3: Lädt product-strategy Skill via Hybrid Lookup
    - Step 8: file-creator (Utility)
    - 10-Step Workflow für Specwright-Installation in bestehende Codebases

15. ✅ **process-feedback v2.0** - Neuer Workflow (portiert aus agent-os-extended)
    - Alle Steps Main Agent (war bereits kompatibel, Frontmatter + Pre-Flight ergänzt)
    - 9-Step Workflow für Kundenfeedback-Kategorisierung (spec/bug/todo)
    - Referenziert feedback-analysis-schema.json via Hybrid Lookup

16. ✅ **update-changelog v2.0** - Neuer Workflow (portiert aus agent-os-extended)
    - Steps 2, 3, 3b, 5: Main Agent (war: context-fetcher Sub-Agents)
    - date-checker (Utility) für Datum, file-creator (Utility) für Dateierstellung
    - Bilingualer Changelog (DE/EN)

17. ✅ **analyze-feasibility v2.0** - Neuer Workflow (portiert aus agent-os-extended)
    - Steps 1-8, 10: Main Agent (war: context-fetcher Sub-Agents)
    - Step 9: file-creator (Utility)
    - 10-Step Feasibility-Analyse mit optionalem --market Flag
    - MCP Fallback: Perplexity → WebSearch

18. ✅ **analyze-blockers v2.0** - Neuer Workflow (portiert aus agent-os-extended)
    - Steps 2a/2b: Main Agent (war: business-analyst Delegation)
    - 4-Step Blocker-Analyse für externe Abhängigkeiten
    - Unterstützt Product- und Platform-Projekttypen

19. ✅ **estimate-spec v2.0** - Neuer Workflow (portiert aus agent-os-extended)
    - Step 1: Main Agent (war: context-fetcher)
    - Steps 2-6: estimation-specialist Delegation BEIBEHALTEN (Spezialwissen-Ausnahme)
    - Planning Poker + AI-Acceleration Faktoren
    - Triple Output: estimation-technical.md, estimation-client.md (DE), estimation-validation.json

20. ✅ **validate-estimation v2.0** - Neuer Workflow (portiert aus agent-os-extended)
    - Bereits Main Agent Pattern (keine Sub-Agents in v1.0)
    - Pre-Flight + Pfade gefixt
    - 100-Punkte Scoring über 6 Validierungsdimensionen

21. ✅ **extract-design v2.0** - Neuer Standalone-Workflow
    - Lädt design-system-extraction Skill via Hybrid Lookup
    - file-creator (Utility) für Dateierstellung
    - 5-Step Workflow für Design-System-Extraktion aus URLs

22. ✅ **brainstorm-upselling-ideas v2.0** - Neuer Workflow (portiert aus agent-os-extended)
    - Step 1: Main Agent (war: context-fetcher)
    - Step 6: file-creator (Utility)
    - 7-Step interaktiver Upselling-Brainstorm
    - CRITICAL: Dokumentation erst NACH User-Bestätigung

23. ✅ **create-instagram-account v2.0** - Neuer Marketing-Workflow (portiert aus agent-os-extended)
    - Steps 1-2: Main Agent (war: context-fetcher/perplexity Sub-Agents)
    - Steps 10-11: date-checker, file-creator (Utility)
    - 12-Step Instagram-Strategie, Output: 5 Dateien in specwright/marketing/instagram/

24. ✅ **create-content-plan v2.0** - Neuer Marketing-Workflow (portiert aus agent-os-extended)
    - Step 1: Main Agent (war: context-fetcher)
    - Steps 2, 6: date-checker, file-creator (Utility)
    - 7-Step Content-Plan, Prerequisite: strategy.md muss existieren
    - Output: 8 Dateien in specwright/marketing/instagram/content-plans/

### Migration abgeschlossen ✅
Alle Workflows (Core + Validation + Marketing) und Commands sind auf das Main Agent + Skills Pattern migriert.

---

## Referenz: Korrekte Agent-Kategorisierung

### Utility Agents (bleiben als Sub-Agents)
- `date-checker` - Datum abrufen
- `file-creator` - Dateien erstellen
- `git-workflow` - Git-Operationen
- `context-fetcher` - Dokumente laden (einfaches Fetching)

### Rollen die zu Skills werden sollten
- `product-strategist` → Skill für Produkt-Planung
- `tech-architect` → Skill für Architektur-Entscheidungen
- `design-extractor` → Skill für Design-System-Extraktion
- `ux-designer` → Skill für UX-Pattern-Definition
- `dev-team__architect` → Bereits teilweise als `architect-refinement` Skill
- `dev-team__po` → Bereits teilweise als `po-requirements` Skill
- `dev-team__frontend-developer` → Frontend-Skill
- `dev-team__backend-developer` → Backend-Skill
- `codebase-analyzer` → Skill für Code-Analyse
