# /plan-platform Workflow - Übersicht

> Workflow Version: 2.0
> Dauer: 30-45 Minuten | User-Interaktionen: 3-4 Entscheidungspunkte
> Für Multi-Modul-Projekte (z.B. AI System, E-Commerce Platform, Multi-tenant SaaS)

## Flowchart

![plan-platform Workflow](assets/plan-platform-workflow.png)

## Steps

| Step | Name | Beschreibung | Skill | Agent |
|------|------|-------------|-------|-------|
| **1** | Gather Platform Info | Fragt User nach Platform Vision, Modulen, Zielgruppe, Problem | — | Main |
| **2** | Platform Brief | Interaktive Erstellung des Platform Briefs | product-strategy | Main |
| **3** | User Review Gate | **PAUSE** - User reviewed Platform Brief | — | Main |
| **4** | Module Identification | Module identifizieren + individuelle Module Briefs erstellen | product-strategy | Main |
| **5** | Platform Tech Stack | Tech-Stack-Empfehlung auf Platform- und Modul-Ebene | tech-stack-recommendation | Main |
| **5.5** | Project Standards | Optional: Projektspezifische Coding-Standards generieren | tech-stack-recommendation | Main |
| **5.6** | Design System | Optional: Design-System aus URL/Screenshots extrahieren | design-system-extraction | Main |
| **5.7** | UX Patterns | Optional: Cross-Module UX-Patterns (nur wenn Frontend-Module existieren) | ux-patterns-definition | Main |
| **5.8** | Secrets Setup | Secrets-Template anlegen | — | file-creator |
| **6** | Dependency Analysis | Abhängigkeiten zwischen Modulen analysieren + Mermaid Graph | architecture-decision | Main |
| **7** | Platform Architecture | Gesamtarchitektur der Plattform designen | architecture-decision | Main |
| **8** | Platform Roadmap | Phasenplan über alle Module mit Priorisierung | — | Main |
| **9** | Per-Module Roadmaps | Individuelle Roadmaps pro Modul | — | Main |
| **10** | Update CLAUDE.md | CLAUDE.md mit Platform-Konfiguration aktualisieren | — | file-creator |
| **11** | Summary | Zusammenfassung aller erstellten Dokumente | — | Main |

## Human-in-the-Loop Punkte

| Gate | Step | Was passiert? |
|------|------|--------------|
| **Input** | Step 1 | User beschreibt Platform Vision, Core Modules, Zielgruppe, Problem |
| **Interaktiv** | Step 2 | Rückfragen zur Verfeinerung (Vision, Module, Integrationspunkte, Metriken) |
| **Review Gate 1** | **Step 3** | User approved/ändert `platform-brief.md` — Loop bis genehmigt |
| **Entscheidung** | Step 5 | User wählt Tech Stack (Platform-Level + Module-Level) |
| **Entscheidung** | Step 5.5 | User entscheidet: Projektspezifische Standards JA/NEIN |
| **Entscheidung** | Step 5.6 | User entscheidet: Design-System extrahieren? (URL / Screenshots / No UI / Later) |
| **Interaktiv** | Step 5.7 | Cross-Module UX-Patterns werden interaktiv besprochen bis User zustimmt |
| **Review Gate 2** | **Step 7** | User approved Platform Architecture oder wählt Alternative |
| **Review Gate 3** | **Step 8** | User approved/ändert Platform Roadmap — Loop bis genehmigt |

## Output-Dokumente

| Step | Dokument | Pfad | Optional? |
|------|----------|------|-----------|
| 2 | **platform-brief.md** | `specwright/product/platform-brief.md` | Nein |
| 4 | **module-brief.md** (N Stück) | `specwright/product/modules/[name]/module-brief.md` | Nein |
| 5 | **tech-stack.md** | `specwright/product/tech-stack.md` | Nein |
| 5.5 | **code-style.md** + **best-practices.md** | `specwright/standards/` | Ja |
| 5.6 | **design-system.md** | `specwright/product/design-system.md` | Ja |
| 5.7 | **ux-patterns.md** | `specwright/product/ux-patterns.md` | Ja (nur Frontend) |
| 5.8 | **secrets.md** | `specwright/product/secrets.md` | Nein |
| 6 | **module-dependencies.md** | `specwright/product/architecture/module-dependencies.md` | Nein |
| 7 | **platform-architecture.md** | `specwright/product/architecture/platform-architecture.md` | Nein |
| 8 | **platform-roadmap.md** | `specwright/product/roadmap/platform-roadmap.md` | Nein |
| 9 | **roadmap.md** (N Stück) | `specwright/product/roadmap/modules/[name]/roadmap.md` | Nein |
| 10 | **CLAUDE.md** | Projekt-Root | Nein |

**Gesamt:** 8+ Core-Dokumente + N Module Briefs + N Module Roadmaps + CLAUDE.md Update

## Skills

| Skill | Steps | Zweck |
|-------|-------|-------|
| product-strategy | 2, 4 | Platform Brief, Module Identification |
| tech-stack-recommendation | 5, 5.5 | Tech-Stack-Analyse (Platform + Module), Standards |
| design-system-extraction | 5.6 | Design-System aus URLs/Screenshots |
| ux-patterns-definition | 5.7 | Cross-Module Navigation, Flows, Interactions |
| architecture-decision | 6, 7 | Dependency-Analyse, Platform Architecture |

## Unterschied zu /plan-product

| Aspekt | /plan-product | /plan-platform |
|--------|--------------|----------------|
| **Scope** | Einzelnes Produkt | Multi-Modul-Plattform |
| **Module** | Keine | N Module mit eigenen Briefs |
| **Dependencies** | Nicht nötig | Modul-Abhängigkeitsanalyse (Step 6) |
| **Roadmap** | Eine Roadmap | Platform-Roadmap + N Module-Roadmaps |
| **Architektur** | Pattern-Empfehlung | Gesamtarchitektur + Module-Integration |
| **Boilerplate** | Ja (Step 8) | Nein (pro Modul via /create-spec) |
| **Dauer** | 15-25 Min | 30-45 Min |

## Farbkodierung (Diagramm)

| Farbe | Bedeutung |
|-------|-----------|
| Blau | Main Agent mit Skill (Kernarbeit) |
| Orange | User Input / Interaktive Dialoge |
| Rot/Rosa | Review Gates (User Approval, Loop bei Änderungen) |
| Grün | Output-Dokumente |
| Lila | Utility Agents (file-creator) |
| Gelb | Optionale Entscheidungspunkte |
