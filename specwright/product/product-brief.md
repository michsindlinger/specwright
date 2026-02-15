# Product Brief: Specwright

> Version: 1.0
> Created: 2026-02-14
> Status: Draft

---

## Elevator Pitch

Specwright is an open-source, spec-driven development framework that helps experienced software developers and architects in enterprise environments multiply their efficiency by providing structured, agentic workflows that mirror real-world SCRUM/SAFe processes - with the human always in the loop at every critical decision point.

**Tagline:** "Spezifiziere am Morgen, lass die Agents stundenlang autonom arbeiten."

---

## Target Audience

### Primary Customers

| Segment | Description | Size Estimate |
|---------|-------------|---------------|
| Enterprise Dev Teams | Teams in SCRUM/SAFe-Umgebungen mit 5-50 Entwicklern, die AI Coding Assistants nutzen | 500K+ Teams weltweit |
| Senior Developers / Architects | Erfahrene Entwickler die komplexe Features planen und umsetzen | 5M+ Personen weltweit |
| Tech Leads / Engineering Managers | Verantwortliche für Entwicklungsprozesse und -qualität | 1M+ Personen weltweit |

### User Personas

#### Persona 1: Der Enterprise Architect

- **Demographics:** 35-50 Jahre, Senior Software Architect / Principal Engineer
- **Context:** Arbeitet in einem SCRUM/SAFe-Umfeld mit mehreren Teams, verantwortlich für technische Entscheidungen und Architektur-Governance
- **Pain Points:**
  - AI Coding Assistants generieren Code ohne Kontext zu Architektur-Entscheidungen und Standards
  - Kein strukturierter Prozess, um AI-generierte Features in Enterprise-Workflows einzubetten
  - Wissensverlust zwischen AI-Sessions - jede Konversation startet bei Null
- **Goals:**
  - AI als verlässlichen Sparringspartner für Architektur-Entscheidungen nutzen
  - Konsistente Code-Qualität über alle AI-generierten Features sicherstellen
  - Entwicklungsgeschwindigkeit verdreifachen ohne Qualitätsverlust
- **Current Solutions:** Ad-hoc Prompts an Claude/GPT, manuelle Code-Reviews, keine strukturierte AI-Integration

#### Persona 2: Der SCRUM-Entwickler

- **Demographics:** 28-40 Jahre, Senior Software Developer
- **Context:** Arbeitet in Sprint-Zyklen, übernimmt User Stories aus dem Backlog, nutzt bereits Claude Code für tägliche Entwicklung
- **Pain Points:**
  - Jede AI-Session verliert den Kontext der vorherigen Arbeit
  - Keine Verbindung zwischen Product Backlog und AI-Entwicklung
  - Code-Qualität schwankt stark zwischen AI-generierten Features
  - Fehlende Self-Learning: gleiche Fehler werden in jeder Session wiederholt
- **Goals:**
  - Ganze Features autonom durch AI umsetzen lassen, basierend auf gut spezifizierten Stories
  - Konsistente Qualität durch selbstlernende Agents
  - Morgens spezifizieren, AI arbeiten lassen, abends reviewen
- **Current Solutions:** Manuelles Copy-Paste von Kontext in jede AI-Session, eigene Prompt-Sammlungen, keine automatisierte Pipeline

#### Persona 3: Der Security-bewusste Tech Lead

- **Demographics:** 30-45 Jahre, Tech Lead / Engineering Manager
- **Context:** Verantwortlich für Sicherheit und Compliance, arbeitet in regulierten Umgebungen (Finanz, Gesundheit, Behörden)
- **Pain Points:**
  - Keine Enterprise-tauglichen AI-Coding-Lösungen, die on-premise laufen können
  - Bedenken bezüglich Datenschutz bei Cloud-basierten AI-Diensten
  - Fehlende Audit-Trails für AI-generierte Code-Änderungen
- **Goals:**
  - AI-Produktivitätsvorteile nutzen ohne Sicherheitsrisiken
  - Lokal gehostete LLMs für sensible Projekte einsetzen können
  - Vollständige Nachvollziehbarkeit aller Entscheidungen und Änderungen
- **Current Solutions:** Kein Einsatz von AI-Coding oder stark eingeschränkte Nutzung

---

## The Problem

### Problem Statement

Enterprise-Softwareteams, die AI Coding Assistants nutzen, verlieren bis zu 60% des Produktivitätspotenzials durch fehlende Struktur: kein Kontext zwischen Sessions, keine Verbindung zu bestehenden SCRUM/SAFe-Prozessen, keine selbstlernenden Qualitätsstandards und keine Möglichkeit, Features autonom und konsistent von AI-Agents entwickeln zu lassen.

### Impact

| Metric | Current State | Impact |
|--------|---------------|--------|
| Kontextverlust pro Session | 100% - jede Session startet bei Null | 2-3 Stunden/Tag für Kontext-Wiederherstellung |
| Code-Qualitätskonsistenz | Schwankend (abhängig von Prompt-Qualität) | 40% der AI-generierten Features erfordern signifikante Nacharbeit |
| Feature-Autonomie | ~0% - Entwickler muss dauerhaft begleiten | Nur 10-20% Effizienzgewinn statt möglicher 300-500% |
| Architektur-Compliance | Nicht durchsetzbar durch AI | Architektur-Erosion über Zeit, steigende technische Schulden |
| Digitalisierungsstau | Wochen pro Feature in Enterprise-Umgebungen | Massive Verzögerungen, verpasste Marktchancen |

### Root Causes

1. **Fehlende Prozess-Integration:** AI Coding Assistants sind Werkzeuge, keine Teammitglieder - sie kennen den Entwicklungsprozess nicht
2. **Kontextlosigkeit:** Jede AI-Session ist isoliert, ohne Wissen über Architektur, Standards, vorherige Entscheidungen
3. **Kein Self-Learning:** AI wiederholt Fehler, weil es keine Feedback-Schleife gibt
4. **Fehlende Spezifikations-Brücke:** Zwischen Product Backlog und AI-Execution gibt es keine strukturierte Verbindung

---

## Solution

### How It Works

Specwright installiert ein vollständiges, agentisches Entwicklungs-Ökosystem in jedes Projekt:

1. **Planen** - Interaktive Workshops mit AI: Product Briefs, Tech Stack, Architektur, Roadmap, Design System
2. **Spezifizieren** - Features werden in fachliche User Stories (Gherkin) aufgeteilt, vom Architekt-Agent technisch verfeinert
3. **Ausführen** - Jede Story wird in einem frischen Kontext umgesetzt, mit vollständigem Wissen über Architektur, Standards und vorherige Arbeit
4. **Reviewen** - Code Reviews am Ende jeder Story, Findings werden automatisch gefixt
5. **Lernen** - Agents aktualisieren ihre Dos-and-Donts und Domain-Wissen nach jeder Umsetzung

Der Mensch bleibt in der Kontrolle: Nach jedem Prozessschritt entsteht ein ausführliches Dokument zum Review.

### Key Features

| Feature | Description | User Benefit |
|---------|-------------|--------------|
| Spec-Driven Workflow | Vollständiger Lifecycle von Produkt-Planung bis Feature-Execution mit 34 Slash Commands | Ein Befehl startet komplexe, mehrstufige Prozesse die Enterprise-Workflows abbilden |
| Self-Learning Agent Team | Agents aktualisieren Skills (Dos-and-Donts, Domain-Wissen) nach jeder Story | Qualität steigt automatisch mit jeder Iteration - Fehler werden nicht wiederholt |
| Human-in-the-Loop | Review-Punkte nach jedem Prozessschritt, interaktive Entscheidungen | Volle Kontrolle über alle Entscheidungen, AI als Sparringspartner nicht als Ersatz |
| Multi-LLM Support | Pro Story konfigurierbar: Anthropic, GLM, MiniMax, Kimi K2 u.a. | Lokal gehostete LLMs für sicherheitskritische Umgebungen, Cost-Optimierung |
| Autonomous Feature Pipeline | Kanban-Board-Automation: mehrere Specs in Queue, automatisierte Abarbeitung | "Spezifiziere am Morgen, lass Agents stundenlang autonom arbeiten" |
| Technology-Agnostic Skills | Fachliche Skill-Templates, angepasst auf spezifischen Tech-Stack | Funktioniert mit Angular, React, Vue, Spring Boot, NestJS, Rails u.v.m. |
| Architecture Governance | Architect Agent erzwingt DoD, DoR, Architektur-Patterns | Konsistente Code-Qualität und Architektur-Compliance über alle Features |
| Hybrid Lookup System | Projekt-spezifische Overrides mit globalen Fallbacks | Einmal konfigurieren, in allen Projekten nutzen, pro Projekt anpassen |
| Git Strategy per Feature | Worktrees oder Branch-Strategie pro Spec wählbar | Parallele Feature-Entwicklung, saubere Git-History |
| Automated Testing | Playwright, Chrome DevTools MCP Integration am Ende jeder Spec | Features werden automatisch getestet bevor der Entwickler reviewt |

### Feature Prioritization (MoSCoW) - Status v3.0

**Must Have (all shipped in v3.0):**
- [x] Spec-Driven Workflow (Plan, Specify, Execute)
- [x] Self-Learning Agent Team
- [x] Human-in-the-Loop Review Points
- [x] Technology-Agnostic Skill Templates
- [x] Architecture Governance (DoD, DoR, Patterns)

**Should Have (all shipped in v3.0):**
- [x] Multi-LLM Support
- [x] Hybrid Lookup System
- [x] Git Strategy per Feature
- [x] Automated Testing Integration

**Could Have (all shipped in v3.0):**
- [x] Autonomous Feature Pipeline (via Specwright UI)
- [x] Projektübergreifende Queue-Verwaltung

**Next Milestone:**
- [ ] Audio Calls mit Agent Team (Voice-basierte Interaktion)

**Won't Have (this version):**
- Visual IDE Integration (VS Code Extension)
- Real-time Collaboration (Multi-User)
- Cloud-hosted Agent Infrastructure

---

## Differentiators

### Competitive Advantages

| Differentiator | vs. Competitors | Evidence |
|----------------|-----------------|----------|
| Enterprise-Process-First | Cursor/Copilot/Windsurf haben keine SCRUM/SAFe-Integration | 34 strukturierte Workflows die Enterprise-Prozesse abbilden |
| Self-Learning Agents | Keine andere Lösung hat automatisches Skill-Update nach jeder Story | Dos-and-Donts und Domain-Wissen wachsen mit jeder Iteration |
| Human-in-the-Loop by Design | Andere AI-Tools ersetzen Entwickler, Specwright multipliziert sie | Review-Dokumente nach jedem Step, interaktive Entscheidungspunkte |
| Full Lifecycle Coverage | Andere Tools decken nur Code-Generation ab | Von Produkt-Planung über Architektur bis Testing und Self-Learning |
| On-Premise LLM Support | Cloud-only bei Cursor/GitHub Copilot | Multi-LLM-Konfiguration ermöglicht lokale LLMs für regulierte Umgebungen |
| Spec-as-Source-of-Truth | Andere Tools nutzen Code als einzige Quelle | Specs, Stories und Architektur-Entscheidungen steuern die Entwicklung |

### Zero-Friction Integration

Specwright works for both greenfield and brownfield projects:
- **New Projects:** Start from scratch with `/plan-product` for complete setup from vision to execution
- **Existing Projects:** Integrate at any time with `/analyze-product` - analyzes the existing codebase, extracts patterns, and creates all documentation automatically. No migration needed, no breaking changes.

### Unique Value Proposition

Unlike Cursor, GitHub Copilot, and Windsurf, which focus on code completion and inline suggestions, Specwright provides a complete spec-driven development lifecycle that mirrors enterprise SCRUM/SAFe processes - from product planning through architecture decisions to autonomous feature execution - with self-learning agents that improve with every iteration and the human always in control. It integrates seamlessly into both new and existing projects without disrupting current workflows.

---

## Success Metrics

### Key Performance Indicators

| KPI | Target | Measurement Method |
|-----|--------|-------------------|
| GitHub Stars | 1.000 in 6 Monaten | GitHub API |
| Active Installations | 500 Projekte in 6 Monaten | Download-Counter setup.sh |
| Feature Velocity | 3-5x Improvement vs. manuelle Entwicklung | User Surveys, Case Studies |
| Story Completion Rate | >90% autonome Completion pro Spec | Kanban-Board-Statistiken |
| Self-Learning Impact | Qualitäts-Score steigt >10% pro 10 Stories | Dos-and-Donts Growth, Review-Findings Decline |
| Community Contributions | 50 Contributors in 12 Monaten | GitHub Contributors |

### Validation Criteria

- [ ] Erfolgreiches End-to-End: plan-product -> create-spec -> execute-tasks in 3 verschiedenen Tech-Stacks
- [ ] 10 externe Nutzer setzen erfolgreich ein Feature mit Specwright um
- [ ] Self-Learning nachweisbar: Agents machen weniger Fehler nach 20 Stories
- [ ] Enterprise-Einsatz: Mindestens 1 Team in regulierter Umgebung nutzt Specwright mit lokalen LLMs

---

## Constraints & Assumptions

### Constraints

- Abhängigkeit von Claude Code CLI als primäre Laufzeitumgebung
- Markdown-basierte Workflows begrenzen die Komplexität der Prozesslogik
- Self-Learning ist an die Skill-Dateistruktur gebunden (kein dynamisches ML)
- Multi-LLM Support erfordert kompatible API-Formate pro Provider

### Assumptions

- Claude Code bleibt die führende AI Coding CLI und wird weiterentwickelt
- Enterprise-Teams sind bereit, strukturierte Workflows für AI-Coding zu adoptieren
- Lokal gehostete LLMs erreichen ausreichende Qualität für Code-Generation
- Die Specwright UI (separates Projekt) wird für Queue-Automation entwickelt

### Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Claude Code API-Änderungen brechen Workflows | Medium | High | Abstraktionsschicht in Workflows, schnelle Anpassung durch Framework-Team |
| Markt wird von IDE-integrierten Tools dominiert | Medium | Medium | Specwright als Ergänzung positionieren, nicht als IDE-Ersatz |
| Enterprise-Adoption zu langsam | Medium | High | Case Studies, ROI-Kalkulator, kostenlose Community-Version |
| Competing Open-Source Framework entsteht | Low | Medium | First-Mover-Advantage, Community-Building, kontinuierliche Innovation |

---

## Appendix

### Glossary

| Term | Definition |
|------|------------|
| Spec | Feature-Spezifikation bestehend aus User Stories, Architektur-Refinement und Kanban-Board |
| Skill | Technologie-spezifisches Wissenspaket eines Agents (z.B. Angular Components, Spring Boot Services) |
| Hybrid Lookup | Zwei-stufiges Template-System: Projekt-Override -> Global Fallback |
| Human-in-the-Loop | Designprinzip: Der Mensch reviewt und entscheidet nach jedem Prozessschritt |
| Self-Learning | Agents aktualisieren ihre Dos-and-Donts und Domain-Dateien nach jeder Story-Umsetzung |
| Workflow | Mehrstufiger, XML-strukturierter Prozess in Markdown definiert (z.B. plan-product, create-spec) |
| Agent Team | Zusammenstellung von spezialisierten Skills für ein spezifisches Projekt und Tech-Stack |
| Specwright UI | Separates Projekt: Web-UI für Queue-Management und projektübergreifende Automation |

### References

- Specwright GitHub: https://github.com/michsindlinger/specwright
- Claude Code Documentation: https://docs.anthropic.com/en/docs/claude-code
- Workflow-Analyse (Migration): specwright/docs/workflow-analysis-2026-02-14.md
