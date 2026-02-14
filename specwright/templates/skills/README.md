# Skill Templates - Fachliche Wissensvorlagen

> Framework-agnostische Skill-Templates für projekt-spezifische Anpassungen

## Konzept

**Skills = Fachliches Wissen** (nicht Orchestration)

**Problem (Vorher)**:
- Agents enthalten fachliches Wissen + Code-Beispiele
- Duplikation zwischen Agents und Skills
- Schwer zu customizen (große Dateien)
- Context waste (1000 Zeilen geladen, 100 genutzt)

**Lösung (Jetzt)**:
- **Kleine Agents** (Orchestratoren, ~100 Zeilen)
- **Skills** (Fachliches Wissen, framework-spezifisch)
- **Skill Templates** (Basis für projekt-spezifische Skills)
- **`/add-skill` Command** (generiert Skills aus Templates)

---

## Architektur

```
Agent (Klein - Orchestrator)
  ↓ lädt explizit
Projekt-Spezifische Skills
  ↓ erstellt via
/add-skill Command
  ↓ nutzt
Skill Templates (Framework-agnostisch)
  ↓ gefüllt mit
Code-Analyse ODER Best Practices
```

---

## Verfügbare Skill Templates

### 1. api-implementation-patterns-template.md

**Für**: Backend API Implementation

**Fachliche Bereiche**:
- Controller/Route Layer (Endpoint Definition)
- Service Layer (Business Logic)
- Data Access Layer (Repository/ORM)
- Data Models/Entities (Schema)
- DTOs/Serializers (Request/Response)
- Exception Handling
- Testing Patterns (Unit, Integration)
- API Documentation

**Framework-Agnostisch**: Spring Boot, Express, FastAPI, Django, Rails, Go Gin

**[CUSTOMIZE] Bereiche**:
- Framework und Language
- Code-Beispiele für jede Layer
- Naming Conventions
- Testing Commands

---

### 2. component-architecture-template.md

**Für**: Frontend Component Development

**Fachliche Bereiche**:
- Component Structure (File organization)
- Props/Inputs (Definition pattern)
- State Management (Local, Global, Derived)
- Side Effects/Lifecycle
- Event Handling
- API Integration
- Styling Approach
- Form Handling
- Testing Patterns
- Performance Optimization
- Accessibility

**Framework-Agnostisch**: React, Angular, Vue, Svelte, SolidJS

**[CUSTOMIZE] Bereiche**:
- Framework und Language
- Component pattern (Functional, Class, Composition)
- State management approach
- Styling method
- Testing framework

---

### 3. testing-strategies-template.md

**Für**: Testing & QA

**Fachliche Bereiche**:
- Testing Philosophy (Pyramid, Coverage targets)
- Unit Testing (Backend + Frontend)
- Integration Testing (API, Database)
- E2E Testing (Critical flows)
- Test Data Management
- Mocking Strategy
- Coverage Requirements
- Test Execution Commands
- Quality Gates

**Framework-Agnostisch**: JUnit, Jest, Pytest, RSpec, Playwright, Cypress

**[CUSTOMIZE] Bereiche**:
- Test frameworks (backend, frontend, E2E)
- Coverage targets
- Critical flows to test
- CI/CD integration

---

### 4. deployment-automation-template.md

**Für**: CI/CD & Deployment

**Fachliche Bereiche**:
- CI/CD Platform (Configuration)
- Pipeline Stages (Test, Build, Deploy)
- Containerization (Docker patterns)
- Deployment Strategy (Rolling, Blue-Green)
- Secrets Management
- Health Checks & Smoke Tests
- Database Migrations
- Monitoring & Logging
- Security Scanning

**Platform-Agnostisch**: GitHub Actions, GitLab CI, Jenkins, CircleCI

**[CUSTOMIZE] Bereiche**:
- CI/CD platform und syntax
- Containerization approach
- Deployment commands
- Hosting platform

---

## Verwendung

### Mit /add-skill Command (Automatisch) - Empfohlen

```bash
# Fall A: Code existiert (Analyse + Validation)
cd mein-projekt
/add-skill api-implementation-patterns

# → Explore agent analysiert src/
# → Erkennt Patterns (Controller in src/controllers/, Services mit @Transactional)
# → Validiert Patterns (gut oder verbesserungswürdig?)
# → Schlägt Improvements vor
# → User wählt welche übernehmen
# → Generiert .claude/skills/meinprojekt-api-patterns.md

# Fall B: Kein Code (Best Practices)
/add-skill api-implementation-patterns

# → Fragt: Framework? → FastAPI
# → Lädt Template
# → Füllt mit FastAPI best practices
# → Generiert .claude/skills/meinprojekt-api-patterns.md
```

### Manuell (Fortgeschritten)

```bash
# 1. Template kopieren
cp specwright/templates/skills/api-implementation-patterns-template.md \
   .claude/skills/rockstardevelopers-api-patterns.md

# 2. Bearbeiten
code .claude/skills/rockstardevelopers-api-patterns.md

# 3. [CUSTOMIZE] Bereiche ausfüllen:
# - Framework: Django 5.0
# - Controller Pattern: ViewSets in app/views/
# - Service Pattern: Service classes in app/services/
# - etc.

# 4. Speichern
```

---

## Integration mit Agents

### Agent Konfiguration

**Agents listen explizit benötigte Skills**:

```markdown
---
name: backend-dev
skills_required:
  - testing-best-practices (global)
skills_project:
  - rockstardevelopers-api-patterns (projekt-spezifisch!)
---
```

**Agent lädt automatisch**:
1. Global skills (testing-best-practices)
2. Projekt skills (rockstardevelopers-api-patterns)
3. Framework skills basierend auf Detection

---

## Vorteile

✅ **Klein**: Agent ~100 Zeilen, Skills enthalten Details
✅ **Wiederverwendbar**: Skills von mehreren Agents nutzbar
✅ **Context Efficient**: Nur benötigte Skills geladen
✅ **Einfach Customizable**: Nur Skills überschreiben, nicht ganze Agents
✅ **Zentrale Updates**: Global skill update → alle Agents profitieren
✅ **Klare Separation**: Agent = Workflow, Skill = Knowledge

---

## Beispiel: Django Projekt

**Vorher** (Große Agents):
```
backend-dev.md (1000 Zeilen, Spring Boot focused)
→ User muss kompletten Agent überschreiben für Django
```

**Jetzt** (Klein + Skills):
```
backend-dev.md (100 Zeilen, framework-agnostisch)
  ↓ lädt
rockstardevelopers-api-patterns.md (erstellt via /add-skill)
  ← gefüllt mit Django ViewSets, Serializers, ORM patterns
```

---

## Skill Template Struktur

Alle Templates folgen dieser Struktur:

1. **Frontmatter** - name (mit [PROJECT]), description, globs
2. **Fachliche Bereiche** - Layer für Layer (Controller, Service, Data Access, etc.)
3. **[CUSTOMIZE] Marker** - Zeigen genau was anzupassen ist
4. **Code-Beispiel Slots** - Platz für framework-spezifische Beispiele
5. **Checklist** - Vollständigkeit sicherstellen

---

**Version**: 1.0
**Created**: 2025-12-30
**Next**: `/add-skill` Command für automatische Generierung
