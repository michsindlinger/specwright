# /add-bug Workflow - Übersicht

> Workflow Version: 3.2
> Dauer: 15-30 Minuten | User-Interaktionen: 3-5 Entscheidungspunkte
> Hypothesis-Driven Root-Cause-Analyse mit optionalem PlanAgent für komplexe Fixes

## Flowchart

![add-bug Workflow](assets/add-bug-workflow.png)

## Steps

| Step | Name | Beschreibung | Skill / Agent | Rolle |
|------|------|-------------|---------------|-------|
| **1** | Backlog Setup | Verzeichnis + backlog.json prüfen/erstellen, Bug-ID generieren | date-checker | Main |
| **2** | Bug Description | Strukturierte Bug-Informationen erheben | — | Main (PO) |
| **2.5** | User Hypothesis Dialog | Benutzer-Wissen vor RCA abfragen | — | Main |
| **3** | Root-Cause-Analyse | 3 Hypothesen aufstellen und systematisch prüfen | — | Main |
| **3.5** | Fix-Impact Layer Analysis | Betroffene Layer und Integration Points analysieren | — | Main |
| **3.75** | Complexity Assessment | Komplexität bewerten → Direct Fix oder PlanAgent? | — | Main |
| *(3.75)* | *PlanAgent (optional)* | *Fix-Plan mit Self-Review und Minimalinvasiv-Analyse* | — | *Plan Agent* |
| **4** | Create Bug Story | Bug-Story-Datei erstellen (Gherkin-Szenarien) | — | Main |
| **5** | Architect Refinement | Technische Details ergänzen (DoR/DoD, WAS/WIE/WO) | architect-refinement | Main |
| **5.5** | Bug Size Validation | Größe prüfen (max 5 Files, Complexity max M) | — | Main |
| **6** | Add to Backlog | backlog.json aktualisieren via MCP Tool | — | Main |
| **7** | Summary | Bestätigung und nächste Schritte | — | Main |

## Root-Cause-Analyse (Step 3) - Detail

Die RCA folgt einem 3-Phasen-Prozess:

| Phase | Beschreibung |
|-------|-------------|
| **1. Hypothesen aufstellen** | 3 Hypothesen mit Wahrscheinlichkeiten (= 100%), User-Hypothesen priorisiert |
| **2. Hypothesen prüfen** | Systematisch prüfen (höchste Wahrscheinlichkeit zuerst), stoppen bei Bestätigung |
| **3. Root Cause dokumentieren** | Ursache, Beweis, betroffene Dateien, Fix-Ansatz |

Wenn alle 3 Hypothesen ausgeschlossen: Neue 3 Hypothesen aufstellen (max. 2 Runden).

### Hypothesen-Tabelle

| # | Hypothese | Wahrscheinlichkeit | Quelle | Prüfmethode |
|---|-----------|-------------------|--------|-------------|
| 1 | Vermutung | XX% | **User**/Agent | Konkrete Prüfmethode |
| 2 | Vermutung | XX% | User/**Agent** | Konkrete Prüfmethode |
| 3 | Vermutung | XX% | Agent | Konkrete Prüfmethode |

## Zwei Pfade: Direct Fix vs. PlanAgent (Step 3.75)

```
                  ┌──────────────────────┐
                  │  Complexity Score     │
                  │  berechnen            │
                  └──────────┬───────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
        Score 0-2      Score 3-5      Score 6+
        SIMPLE         MODERATE       COMPLEX
              │              │              │
              │         User wählt    User wählt
              │              │              │
              ▼              ▼              ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │ Direct   │  │ Direct   │  │ PlanAgent│
        │ Fix      │  │ oder     │  │(empfohl.)│
        │(autom.)  │  │ PlanAgent│  │          │
        └──────────┘  └──────────┘  └──────────┘
```

### Complexity Score Berechnung

| Indikator | Punkte |
|-----------|--------|
| affected_files > 5 | +3 |
| affected_files > 3 | +1 |
| fix_type = "Full-stack" | +2 |
| complexity >= M | +2 |
| complexity >= L | +4 |
| systemic_issue | +3 |
| integration_points > 2 | +1 |

| Score | Bewertung | Empfehlung |
|-------|-----------|------------|
| 0-2 | SIMPLE | Direct Fix (automatisch) |
| 3-5 | MODERATE | User Choice |
| 6+ | COMPLEX | PlanAgent (empfohlen) |

## Human-in-the-Loop Punkte

| Gate | Step | Was passiert? |
|------|------|--------------|
| **Input** | Step 2 | User beschreibt Bug (Symptom, Reproduktion, Expected/Actual) |
| **Entscheidung** | Step 2.5 | User teilt Vermutungen / Erkenntnisse / Keine Ahnung / Diskussion |
| **Entscheidung** | Step 3.75 | Bei MODERATE/COMPLEX: Direct Fix oder PlanAgent? |
| **Review Gate** | Step 3.75 | Wenn PlanAgent: User reviewed Fix-Plan (4 Optionen) |
| **Entscheidung** | Step 5.5 | Bei zu großem Bug: /create-spec / Scope reduzieren / Weiter |

## Output-Dokumente

| Step | Dokument | Pfad | Optional? |
|------|----------|------|-----------|
| 1 | **backlog.json** | `specwright/backlog/backlog.json` | Nein (erstellt wenn nötig) |
| 3.75 | **bug-fix-plan.md** | `specwright/backlog/stories/bug-[ID]-fix-plan.md` | Ja (nur PlanAgent) |
| 4 | **bug-[ID]-[slug].md** | `specwright/backlog/stories/` | Nein |
| 6 | **backlog.json** (aktualisiert) | `specwright/backlog/backlog.json` | Nein |

**Gesamt:** 2-3 Dokumente (Bug Story + Backlog Update, optional Fix-Plan)

## Skills & Agents

| Skill / Agent | Steps | Zweck |
|---------------|-------|-------|
| architect-refinement (Skill) | 5 | Technisches Refinement, DoR/DoD |
| Plan Agent (delegiert) | 3.75 | Fix-Plan für komplexe Bugs (optional) |
| date-checker (Utility) | 1 | Datum für Bug-ID |

## Unterschied zu verwandten Workflows

| Aspekt | /add-bug | /add-todo | /create-spec |
|--------|---------|----------|-------------|
| **Zweck** | Bug-Fix mit RCA | Schnelle Aufgabe | Feature-Spezifikation |
| **RCA** | Ja (3 Hypothesen) | Nein | Nein |
| **PlanAgent** | Optional (komplex) | Nein | Ja (immer) |
| **Gherkin** | Ja (Bug-Fix-Szenarien) | Nein | Ja (Feature-Szenarien) |
| **Complexity Gate** | Ja (Score-basiert) | Nein | Nein |
| **Eskalation** | → /create-spec | → /add-bug oder /create-spec | — |
| **Dauer** | 15-30 Min | 5-10 Min | 30-60 Min |

## Wann NICHT /add-bug verwenden

Stattdessen `/create-spec` verwenden wenn:
- Root Cause architektonische Änderungen erfordert
- Fix betrifft >5 Dateien
- Mehrere zusammenhängende Bugs koordiniert gefixt werden müssen
- Bug offenbart größeres Design-Problem
- Geschätzte Komplexität > M

## Farbkodierung (Diagramm)

| Farbe | Bedeutung |
|-------|-----------|
| Hellblau | Analyse-Schritte (RCA, Layer Analysis) |
| Blau | Main Agent mit Skill (Architect Refinement) |
| Lila | Plan Agent (delegierte Fix-Planung) |
| Orange | User Input / Dialoge |
| Rot/Rosa | Review Gates / Entscheidungspunkte |
| Grün | Output-Dokumente |
| Rot (dunkel) | Eskalation zu /create-spec |
