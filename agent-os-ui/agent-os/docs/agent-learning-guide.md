# Agent Self-Learning Guide

> Dokumentation für das selbstlernende Agent-System
> Version: 1.0
> Created: 2026-01-12

## Overview

Agents lernen während der Ausführung von Stories und dokumentieren ihre Erkenntnisse in ihrer eigenen Agent-Definition. Dies macht Agents mit jedem Task "schlauer" für das spezifische Projekt.

## Wann wird gelernt?

Agents dokumentieren Learnings wenn sie:

1. **Fehler beheben** - Problem gefunden und gelöst
2. **Patterns entdecken** - Projekt-spezifische Konventionen erkannt
3. **Workarounds finden** - Limitierungen umgangen
4. **Konfigurationen lernen** - Tool-/Framework-Eigenheiten entdeckt
5. **Codebase-Struktur verstehen** - Unerwartete Strukturen gefunden

## Learning Format

### Struktur eines Learnings

```markdown
### [YYYY-MM-DD]: [Kurzer Titel]
- **Kategorie:** [Error-Fix | Pattern | Workaround | Config | Structure]
- **Problem:** [Was war das Problem?]
- **Lösung:** [Wie wurde es gelöst?]
- **Kontext:** [Story-ID, betroffene Dateien]
- **Vermeiden:** [Was sollte man in Zukunft vermeiden?]
```

### Beispiele

#### Error-Fix Learning
```markdown
### 2026-01-12: Prisma Migration Fehler
- **Kategorie:** Error-Fix
- **Problem:** Prisma migrations schlugen fehl mit "Client not generated"
- **Lösung:** Immer `npx prisma generate` VOR `npx prisma migrate` ausführen
- **Kontext:** Story ASE-003, src/lib/prisma.ts
- **Vermeiden:** Nie migrate ohne vorheriges generate
```

#### Pattern Learning
```markdown
### 2026-01-12: API Route Convention
- **Kategorie:** Pattern
- **Problem:** API Route wurde an falscher Stelle erstellt
- **Lösung:** Alle API Routes folgen dem Pattern: src/app/api/v1/[resource]/route.ts
- **Kontext:** Story ASE-004, Backend API Implementation
- **Vermeiden:** Keine Routes direkt unter /api/ ohne /v1/ Prefix
```

#### Config Learning
```markdown
### 2026-01-12: TailwindCSS v4 Konfiguration
- **Kategorie:** Config
- **Problem:** Tailwind Klassen wurden nicht erkannt
- **Lösung:** In v4 ist tailwind.config.js nicht mehr nötig, @config in CSS verwenden
- **Kontext:** Story FE-002, styles/globals.css
- **Vermeiden:** Keine tailwind.config.js in v4 Projekten erstellen
```

#### Structure Learning
```markdown
### 2026-01-12: Service Layer Location
- **Kategorie:** Structure
- **Problem:** Services wurden in /lib/ erstellt statt /services/
- **Lösung:** Business Logic gehört nach src/services/, /lib/ nur für Utilities
- **Kontext:** Story BE-005, Codebase Exploration
- **Vermeiden:** Keine Business Logic in /lib/
```

## Wo werden Learnings gespeichert?

### Agent-Datei Struktur

```markdown
# [Agent Name]

## Role
[Bestehende Rollenbeschreibung...]

## Skills
[Bestehende Skills...]

## Instructions
[Bestehende Anweisungen...]

---

## Project Learnings (Auto-Generated)

> Diese Sektion wird automatisch durch Agent-Erfahrungen erweitert.
> Learnings sind projekt-spezifisch und verbessern die Agent-Performance.

### [Neuestes Learning zuerst]
...

### [Ältere Learnings]
...
```

### Datei-Location

- **DevTeam Agents:** `.claude/agents/dev-team/[agent-name].md`
- **Global Agents (falls verwendet):** `~/.agent-os/agents/[agent-name].md`

## Learning-Trigger

### Automatische Trigger

| Situation | Learning-Typ |
|-----------|--------------|
| Test fehlgeschlagen → behoben | Error-Fix |
| Lint-Fehler → behoben | Error-Fix |
| Build-Fehler → behoben | Error-Fix |
| Datei an falscher Stelle → korrigiert | Structure |
| Unbekannte Konvention entdeckt | Pattern |
| Framework-Eigenheit gefunden | Config |

### Manuelle Trigger (Agent-Entscheidung)

Der Agent entscheidet selbst, ob ein Learning wertvoll ist:

- **Wertvoll:** Wird wahrscheinlich wieder auftreten
- **Nicht wertvoll:** Einmaliger Tippfehler

## Learning-Qualität

### Gute Learnings

- Spezifisch und actionable
- Enthalten konkreten Kontext
- Verhindern Wiederholung des Problems
- Sind für andere Stories relevant

### Schlechte Learnings (vermeiden)

- Zu generisch ("Code sollte sauber sein")
- Ohne konkreten Kontext
- Triviale Fixes (Tippfehler)
- Einmalige, nicht-wiederholbare Situationen

## Integration in Workflow

### Phase im execute-tasks.md

Nach Story-Completion und vor Git-Commit:

```
Story Execution
    ↓
Quality Gates (Architect + QA)
    ↓
Story Completion
    ↓
★ Learning Phase ★  ← NEU
    ↓
Per-Story Git Commit
    ↓
Next Story
```

### Learning Phase Ablauf

1. **Reflect:** Agent reflektiert über die Story-Ausführung
2. **Identify:** Wurden Probleme gelöst? Patterns entdeckt?
3. **Evaluate:** Ist das Learning wertvoll für die Zukunft?
4. **Document:** Learning in Agent-Datei schreiben
5. **Continue:** Weiter mit Git Commit

## Learnings nutzen

### Beim Story-Start

Agents sollten ihre Learnings-Sektion lesen bevor sie eine Story starten:

```markdown
BEFORE starting implementation:
  READ: Own agent file, especially "Project Learnings" section
  APPLY: Relevant learnings to current story
  AVOID: Previously documented mistakes
```

### Cross-Agent Learnings

Bei verwandten Problemen können Agents die Learnings anderer Agents lesen:

- Frontend-Dev liest Backend-Dev Learnings bei API-Integration
- DevOps liest alle Agents bei Deployment-Problemen

## Limits

### Max Learnings pro Agent

- **Empfohlen:** 20-30 aktive Learnings
- **Bei Überschreitung:** Älteste/irrelevante Learnings archivieren

### Learning Archivierung

Wenn die Learnings-Sektion zu groß wird:

1. Erstelle: `agent-os/team/learnings-archive/[agent-name]-archive.md`
2. Verschiebe: Alte Learnings in Archiv
3. Behalte: Neueste 20 Learnings in Agent-Datei

## Beispiel: Vollständige Agent-Datei

```markdown
# Backend Developer

## Role
Senior Backend Developer für Node.js/TypeScript Projekte...

## Skills
- api-design
- database-management
- authentication
...

## Instructions
1. Folge Clean Architecture Patterns
2. Schreibe Tests für alle neuen Funktionen
...

---

## Project Learnings (Auto-Generated)

> Diese Sektion wird automatisch erweitert.
> Neueste Learnings zuerst.

### 2026-01-12: Prisma Client Generation
- **Kategorie:** Error-Fix
- **Problem:** "PrismaClient is not defined" nach Schema-Änderung
- **Lösung:** `npx prisma generate` nach jeder schema.prisma Änderung
- **Kontext:** Story BE-003, src/lib/prisma.ts
- **Vermeiden:** Schema ändern ohne generate

### 2026-01-11: API Response Format
- **Kategorie:** Pattern
- **Problem:** Inkonsistente API Responses
- **Lösung:** Immer `{ data, error, meta }` Format verwenden
- **Kontext:** Story BE-001, alle API Routes
- **Vermeiden:** Direkte Daten-Returns ohne Wrapper

### 2026-01-10: Environment Variables
- **Kategorie:** Config
- **Problem:** DATABASE_URL nicht gefunden in Tests
- **Lösung:** .env.test Datei für Test-Environment erstellen
- **Kontext:** Story BE-002, jest.config.js
- **Vermeiden:** Gleiche .env für Dev und Test
```
