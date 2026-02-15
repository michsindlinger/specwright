# /analyze-product Workflow - Übersicht

> Workflow Version: 2.0
> Dauer: 20-30 Minuten | User-Interaktionen: 4-5 Entscheidungspunkte
> Für bestehende Codebases, die nachträglich mit Specwright ausgestattet werden sollen

## Flowchart

![analyze-product Workflow](assets/analyze-product-workflow.png)

## Steps

| Step | Name | Beschreibung | Skill | Agent |
|------|------|-------------|-------|-------|
| **1** | Deep Codebase Analysis | Umfassende Analyse: Struktur, Technologien, Architektur, Features, Code-Patterns | — | Main |
| **2** | Gather Product Context | User ergänzt Business-Kontext zur technischen Analyse | — | Main |
| **3** | Generate Product Brief | Product Brief aus Analyse + User-Input erstellen | product-strategy | Main |
| **4** | Generate Brief Lite | Kondensierte Version für AI-Kontext | — | Main |
| **5** | Document Tech Stack | Erkannte Technologien dokumentieren + User-Bestätigung | — | Main |
| **6** | Roadmap mit Phase 0 | Roadmap mit bereits fertigen Features (Phase 0) + geplanten Features | — | Main |
| **7** | Architecture Analysis | Architektur-Pattern erkennen, Compliance bewerten, Strategie wählen | — | Main |
| **8** | Boilerplate Generation | Projektstruktur für neue Features generieren | — | file-creator |
| **9** | Refactoring Analysis | Optional: Refactoring-Plan erstellen (nur wenn in Step 7 gewählt) | — | Main |
| **10** | Summary | Zusammenfassung der Specwright-Installation | — | Main |

## Human-in-the-Loop Punkte

| Gate | Step | Was passiert? |
|------|------|--------------|
| **Input** | Step 2 | User ergänzt: Product Vision, Zielgruppe, nicht-offensichtliche Features, geplante Features, Architektur-Intent, Team-Praktiken |
| **Review** | **Step 3** | User reviewed/korrigiert `product-brief.md` — Loop bis korrekt |
| **Bestätigung** | Step 5 | User bestätigt erkannten Tech Stack oder ergänzt fehlende Technologien |
| **Entscheidung** | **Step 7** | User wählt Architektur-Strategie: (1) Ist-Zustand dokumentieren, (2) Refactoring planen, (3) Neues Pattern definieren |
| **Bestätigung** | Step 9 | Optional: User bestätigt Refactoring-Empfehlungen zur Aufnahme in Roadmap |

## Analyse-Bereiche (Step 1)

Der Main Agent analysiert die Codebase in 5 Bereichen:

| Bereich | Was wird analysiert? |
|---------|---------------------|
| **Projektstruktur** | Directory-Organisation, File-Naming, Modul-Struktur, Build-Konfiguration |
| **Technologie-Erkennung** | Frameworks (package.json, Gemfile, etc.), Datenbanken, Frontend, Infrastruktur |
| **Architektur-Erkennung** | Layer-Trennung, Domain-Struktur, Dependency-Richtung, Design Patterns |
| **Implementierungsstand** | Fertige Features, Auth-Status, API-Endpoints, DB-Tabellen, Test-Coverage |
| **Code-Patterns** | Coding-Style, File-Organisation, Testing-Ansatz, Error-Handling |

## Architektur-Strategie (Step 7)

| Option | Beschreibung | Empfohlen für |
|--------|-------------|---------------|
| **1: Ist-Zustand dokumentieren** | Aktuellen Zustand dokumentieren, Pattern nur für neue Features | Große Codebases (empfohlen) |
| **2: Refactoring planen** | Refactoring-Tasks in Roadmap aufnehmen | Inkonsistente Codebases mit Budget |
| **3: Neues Pattern definieren** | Anderes Pattern für zukünftige Entwicklung | Architektur-Neuausrichtung |

## Output-Dokumente

| Step | Dokument | Pfad | Optional? |
|------|----------|------|-----------|
| 3 | **product-brief.md** | `specwright/product/product-brief.md` | Nein |
| 4 | **product-brief-lite.md** | `specwright/product/product-brief-lite.md` | Nein |
| 5 | **tech-stack.md** | `specwright/product/tech-stack.md` | Nein |
| 6 | **roadmap.md** | `specwright/product/roadmap.md` | Nein |
| 7 | **architecture-decision.md** | `specwright/product/architecture-decision.md` | Nein |
| 8 | **boilerplate/** + **architecture-structure.md** | `specwright/product/` | Nein |

**Gesamt:** 6 Dokumente + 1 Verzeichnisstruktur

## Skills

| Skill | Steps | Zweck |
|-------|-------|-------|
| product-strategy | 3 | Product Brief aus Analyse + User-Input strukturiert erstellen |

## Unterschied zu /plan-product

| Aspekt | /plan-product | /analyze-product |
|--------|--------------|-----------------|
| **Ausgangslage** | Greenfield (neues Projekt) | Bestehende Codebase |
| **Analyse** | Keine Codebase-Analyse | Deep Codebase Analysis (Step 1) |
| **Features** | Vom User beschrieben | Aus Code erkannt + User-Input |
| **Roadmap** | Ab Phase 1 | Phase 0 = bereits fertig |
| **Architektur** | Empfehlung für neues Projekt | Erkennung + Compliance-Check |
| **Refactoring** | Nicht relevant | Optional (Step 9) |
| **Tech Stack** | Empfehlung | Erkennung + Bestätigung |
| **Design System** | Optional (Step 5.6) | Nicht enthalten |
| **UX Patterns** | Optional (Step 5.7) | Nicht enthalten |
| **Dauer** | 15-25 Min | 20-30 Min |

## Farbkodierung (Diagramm)

| Farbe | Bedeutung |
|-------|-----------|
| Blau (hell) | Analyse-Schritte (Codebase lesen, Pattern erkennen) |
| Blau (dunkel) | Main Agent mit Skill |
| Orange | User Input / Bestätigungen |
| Rot/Rosa | Review Gates / Entscheidungspunkte |
| Grün | Output-Dokumente |
| Lila | Utility Agent (file-creator) |
| Gelb | Optionale Verzweigungen |
