# /plan-product Workflow - Übersicht

> Workflow Version: 5.0
> Dauer: 15-25 Minuten | User-Interaktionen: 3-4 Entscheidungspunkte

## Flowchart

![plan-product Workflow](assets/plan-product-workflow.png)

## Steps

| Step | Name | Beschreibung | Skill | Agent |
|------|------|-------------|-------|-------|
| **1** | Check Existing Brief | Prüft ob `product-brief.md` bereits existiert (z.B. aus validate-market) | — | context-fetcher |
| **2** | Gather Product Info | Fragt User nach Produktidee, Features, Zielgruppe, Problem | — | Main |
| **3** | Idea Sharpening | Interaktive Verfeinerung der Produktidee, Rückfragen | product-strategy | Main |
| **4** | User Review Gate | **PAUSE** - User reviewed Product Brief | — | Main |
| **5** | Tech Stack | Analyse & Empfehlung des Tech Stacks | tech-stack-recommendation | Main |
| **5.5** | Project Standards | Optional: Projektspezifische Coding-Standards generieren | tech-stack-recommendation | Main |
| **5.6** | Design System | Optional: Design-System aus URL/Screenshots extrahieren | design-system-extraction | Main |
| **5.7** | UX Patterns | Optional: UX-Patterns definieren (nur wenn Frontend existiert) | ux-patterns-definition | Main |
| **6** | Roadmap | Roadmap generieren (MoSCoW, Phasen, Aufwände) | — | Main |
| **7** | Architecture Decision | Architektur-Pattern empfehlen & begründen | architecture-decision | Main |
| **7.5** | Secrets Setup | Secrets-Template anlegen | — | file-creator |
| **8** | Boilerplate | Projektstruktur generieren basierend auf Architektur | — | file-creator |
| **9** | Update CLAUDE.md | CLAUDE.md mit Produktkonfiguration aktualisieren | — | file-creator |
| **10** | Summary | Zusammenfassung aller erstellten Dokumente | — | Main |

## Human-in-the-Loop Punkte

| Gate | Step | Was passiert? |
|------|------|--------------|
| **Input** | Step 2 | User beschreibt Produktidee (Elevator Pitch, Features, Zielgruppe, Problem) |
| **Interaktiv** | Step 3 | Rückfragen zur Verfeinerung (Zielgruppe, Metriken, Value Proposition) |
| **Review Gate 1** | **Step 4** | User approved/ändert `product-brief.md` — Loop bis genehmigt |
| **Entscheidung** | Step 5 | User wählt Tech Stack aus Empfehlungen (via AskUserQuestion) |
| **Entscheidung** | Step 5.5 | User entscheidet: Projektspezifische Standards JA/NEIN |
| **Entscheidung** | Step 5.6 | User entscheidet: Design-System extrahieren? (URL / Screenshots / Skip) |
| **Interaktiv** | Step 5.7 | UX-Patterns werden interaktiv besprochen bis User zustimmt |
| **Review Gate 2** | **Step 6** | User approved/ändert Roadmap — Loop bis genehmigt |
| **Review Gate 3** | **Step 7** | User approved Architektur-Pattern oder wählt Alternative |

## Output-Dokumente

| Step | Dokument | Pfad | Optional? |
|------|----------|------|-----------|
| 3 | **product-brief.md** | `specwright/product/product-brief.md` | Nein |
| 4 | **product-brief-lite.md** | `specwright/product/product-brief-lite.md` | Nein |
| 5 | **tech-stack.md** | `specwright/product/tech-stack.md` | Nein |
| 5.5 | **code-style.md** + **best-practices.md** | `specwright/standards/` | Ja |
| 5.6 | **design-system.md** | `specwright/product/design-system.md` | Ja |
| 5.7 | **ux-patterns.md** | `specwright/product/ux-patterns.md` | Ja (nur Frontend) |
| 6 | **roadmap.md** | `specwright/product/roadmap.md` | Nein |
| 7 | **architecture-decision.md** | `specwright/product/architecture-decision.md` | Nein |
| 7.5 | **secrets.md** | `specwright/product/secrets.md` | Nein |
| 8 | **boilerplate/** + **architecture-structure.md** | `specwright/product/` | Nein |
| 9 | **CLAUDE.md** | Projekt-Root | Nein |

**Gesamt:** 7-10 Dokumente + 1 Verzeichnisstruktur (je nach optionalen Steps)

## Skills

| Skill | Steps | Zweck |
|-------|-------|-------|
| product-strategy | 3 | Idea Sharpening, Product Brief Qualität |
| tech-stack-recommendation | 5, 5.5 | Tech-Stack-Analyse, Standards-Generierung |
| design-system-extraction | 5.6 | Design-System aus URLs/Screenshots |
| ux-patterns-definition | 5.7 | Navigation, Flows, Interactions, Accessibility |
| architecture-decision | 7 | Komplexitätsanalyse, Pattern-Auswahl |

## Farbkodierung (Diagramm)

| Farbe | Bedeutung |
|-------|-----------|
| Blau | Main Agent mit Skill (Kernarbeit) |
| Orange | User Input / Interaktive Dialoge |
| Rot/Rosa | Review Gates (User Approval, Loop bei Änderungen) |
| Grün | Output-Dokumente |
| Lila | Utility Agents (context-fetcher, file-creator) |
| Gelb | Optionale Entscheidungspunkte |
