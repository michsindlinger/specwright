# Brainstorming Session: Specwright Life OS - Cross-Project Control Board & Life Plan

> Session ID: 2026-02-25-08-51-specwright-life-os
> Started: 2026-02-25 08:51:09
> Type: feature
> Status: ready-for-spec

## Topic

Erweiterung der Specwright UI von einem projektbezogenen Spec-/Bug-/Kanban-Tool zu einem ganzheitlichen "Life OS": Private To-Dos, zentraler Lebensplan, projektuebergreifendes Control Board mit taeglicher Priorisierung, Multi-Person-Sharing (Partner), und proaktive Agent-Automatisierung mit Cron-Jobs.

## Discussion Thread

### Runde 1: Vision & Antworten

**User - Initiale Vision:**
- Specwright UI aktuell: Projekte anlegen, Specs/Bugs/Backlog pro Projekt, Kanban-Board pro Projekt
- **Neu gewuenscht:**
  1. Private To-Dos (nicht projektgebunden)
  2. Zentraler Lebensplan als Referenzrahmen
  3. Taeglicher Morning-Check: projektuebergreifende Priorisierung (Specs, Bugs, To-Dos)
  4. Cross-Project Control Board (Meine Tasks | Agent Tasks)
  5. Multi-Person: Frau bekommt eigenes System, geteilter Lebensplan, automatisierte Abstimmung
  6. Proaktiver Agent: prueft Intervall-basiert auf neue Aufgaben, fuehrt diese aus
  7. Cron-Jobs: E-Mail-Triage, regelmaessige To-Dos

**User - Klaerungen (Runde 1):**

1. **Lebensplan:** Detailliertes, lebendes Dokument (Beispiel gezeigt: 24-Monats-Plan mit Phasen, Szenarien, Entscheidungsbaeumen, finanziellen Projektionen, separaten Pfaden fuer Michael/Melli, Review-Rhythmus)
2. **Morning Check:** Agent priorisiert (nicht User)
3. **Agent-Autonomie:** "Propose-Approve-Execute" Pattern
4. **Multi-Person:** Separate Instanzen, eigene Agents, geteilter Lebensplan

### Runde 2: Vertiefung

**User - Klaerungen (Runde 2):**

1. **Lebensplan → Tasks:** Agent bricht automatisch herunter (Ziel → Monat → Woche → Tag)
2. **Sharing-Modell:** Git-Repo fuer geteilten Lebensplan
3. **Hintergrundprozess:** Cron-Job startet Claude Code, prueft + fuehrt aus, beendet sich
4. **Cron-Jobs Day 1:** Morning Check + E-Mail-Triage, UI-konfigurierbar

### Runde 3: Architektur-Klaerungen

**User - Korrekturen und Klaerungen (Runde 3):**

1. **WICHTIGE KORREKTUR - Control Board ist Aggregationsschicht:**
   - Tasks existieren BEREITS auf den Projekt-Boards
   - Control Board erstellt KEINE neuen Tasks
   - Control Board priorisiert und strukturiert bestehende Tasks projektuebergreifend
   - → Es ist eine Sicht/View auf vorhandene Daten, keine eigene Datenquelle

2. **Control Board = eigene Seite** in der Specwright UI (nicht Dashboard/Startseite)
3. **Private To-Dos = Pseudo-Projekt** (eigenes Board, gleiche Mechanik wie Projektboards)
4. **Freigabe: Einzeln pro Ticket** (nicht Batch)
5. **MVP-Scope:** Phase 1 inkl. Lebensplan, Phase 2 = Multi-Person

### Runde 4: Finale Klaerungen

**User - Klaerungen (Runde 4):**

1. **Lebensplan-Speicherort: Eigenstaendiges Git-Repo**
   - Wird spaeter in Phase 2 fuer Multi-Person Sharing genutzt
   - Unabhaengig von Specwright-Installation

2. **Morning Check Output: Bereits Tickets auf dem Board**
   - Agent soll nicht nur eine Liste vorschlagen
   - Agent erstellt/platziert konkrete Tickets auf dem Control Board
   - User sieht morgens fertige Tickets mit Prioritaet + Begruendung

3. **E-Mail-Triage: Aktuell OpenClaw**
   - Wird NICHT sofort integriert
   - Spaeter als eigener Cron-Job umgezogen
   - Kein Bestandteil des MVP

---

## Synthesis

### Architektur-Uebersicht

```
┌─────────────────────────────────────────────────────┐
│  LEBENSPLAN (Strategische Ebene)                    │
│  Eigenstaendiges Git-Repo                           │
│  Phasen, Ziele, Entscheidungsbaeume                 │
│  Agent: Goal-Breakdown → Monat → Woche → Tag        │
└──────────────────────┬──────────────────────────────┘
                       │ Priorisierung + Kontext
┌──────────────────────▼──────────────────────────────┐
│  CONTROL BOARD (Taktische Ebene) ← AGGREGATION      │
│  Eigene Seite in der Specwright UI                   │
│  Liest aus allen Boards, erstellt NICHTS Neues       │
│  Meine Tasks | Agent (Freigabe) | Agent (arbeitet)  │
│  + Cron-Job Konfiguration                            │
│  Morning Check: Agent platziert Tickets mit          │
│  Begruendung + Lebensplan-Bezug                      │
└───────┬──────────────┬──────────────┬───────────────┘
        │ liest        │ liest        │ liest
┌───────▼────┐  ┌──────▼─────┐  ┌────▼──────────────┐
│ Projekt A  │  │ Projekt B  │  │ Private To-Dos    │
│ Specs/Bugs │  │ Specs/Bugs │  │ (Pseudo-Projekt)  │
│ Kanban     │  │ Kanban     │  │ Eigenes Board     │
└────────────┘  └────────────┘  └───────────────────┘
```

### MVP Feature-Set (Phase 1)

| # | Feature | Beschreibung |
|---|---------|-------------|
| 1 | **Private To-Dos** | Pseudo-Projekt mit eigenem Board, gleiche Mechanik wie Projektboards |
| 2 | **Lebensplan-Integration** | Eigenstaendiges Git-Repo, Markdown-Format, Agent liest + analysiert |
| 3 | **Goal-Breakdown** | Agent bricht Lebensplan-Ziele herunter: Monat → Woche → Tag |
| 4 | **Control Board** | Eigene Seite, Aggregationsschicht ueber alle Projekt-Boards |
| 5 | **Morning Check** | Cron-Job: Agent priorisiert, platziert Tickets auf Control Board |
| 6 | **Propose-Approve-Execute** | Einzelfreigabe pro Ticket, Agent fuehrt freigegebene Tasks aus |
| 7 | **Cron-Engine** | UI-konfigurierbar, System-Cron startet Claude Code |

### Phase 2 (spaeter)

| # | Feature | Beschreibung |
|---|---------|-------------|
| 1 | **Multi-Person / Connections** | Separate Instanzen, geteilter Lebensplan via Git-Repo |
| 2 | **E-Mail-Triage** | Migration von OpenClaw, als Cron-Job |
| 3 | **Weitere Cron-Jobs** | Woechentliche Reviews, Finanz-Checks, etc. |

## Key Decisions

1. **Agent priorisiert** (nicht User) beim Morning Check
2. **Propose-Approve-Execute** als Autonomie-Modell
3. **Einzelfreigabe** pro Ticket (nicht Batch)
4. **Control Board = Aggregationsschicht** (keine eigene Datenquelle, liest aus Projekt-Boards)
5. **Control Board = eigene Seite** in der UI
6. **Private To-Dos = Pseudo-Projekt** (gleiche Mechanik wie Projektboards)
7. **Lebensplan = eigenstaendiges Git-Repo** (Markdown-Format)
8. **Automatisches Goal-Breakdown** durch Agent (Lebensplan → Monat → Woche → Tag)
9. **Cron-Job-basiert:** Claude Code wird per Cron gestartet, nicht dauerhaft laufend
10. **Cron-Jobs UI-konfigurierbar** ueber Control Board
11. **Morning Check erzeugt fertige Tickets** auf dem Control Board (nicht nur Vorschlagsliste)
12. **MVP = Control Board + Morning Check + Private To-Dos + Lebensplan + Cron-Engine + Goal-Breakdown**
13. **Phase 2 = Multi-Person/Connections + E-Mail-Triage (von OpenClaw)**

## Action Items

1. **Spec erstellen** fuer "Specwright Life OS - Phase 1" basierend auf dieser Brainstorming-Session
2. Transfer via `/transfer-and-create-spec`

## Session Summary

**Duration:** 2026-02-25 08:51 - 09:05
**Ideas Generated:** 7 Kernfeatures
**Key Decisions:** 13
**Next Action:** Spec erstellen

### Main Outcome
Klare Vision fuer "Specwright Life OS" mit definiertem MVP-Scope (7 Features) und abgegrenzter Phase 2. Alle architektonischen Kernentscheidungen getroffen.

### Ready for Transfer
- [x] Feature Spec (use: transfer-and-create-spec)
- [ ] Bug Report
- [ ] Needs more brainstorming
