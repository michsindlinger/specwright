---
description: Interactive workflow for saving session knowledge to persistent memory with structured topics and tags
globs: []
alwaysApply: false
---

# Save Memory Skill

> Purpose: Interaktiver Workflow zum strukturierten Speichern von Session-Wissen in die persistente Memory-Datenbank.
> Kostenoptimiert: Main Agent (Opus) extrahiert nur die Roh-Punkte, ein Haiku Sub-Agent uebernimmt Strukturierung und Speicherung.

## When to Use

Dieser Skill wird aufgerufen wenn der User `/save-memory` ausfuehrt.
Er extrahiert relevante Topics aus der aktuellen Session und speichert sie strukturiert mit Tags.

---

## Workflow

<save_memory_workflow>

### Phase 1: Session analysieren und Roh-Punkte extrahieren (Main Agent)

<topic_extraction>
  **WICHTIG: Diese Phase laeuft im Main Agent (Opus), da nur er den Konversationskontext hat.**
  **Ziel: Minimaler Output — nur die Kernpunkte extrahieren, KEINE aufwaendige Strukturierung.**

  ANALYZE: Die aktuelle Konversation nach speicherwuerdigen Inhalten.

  **Speicherwuerdig (DO save):**
  - Architektur-Entscheidungen und deren Begruendung
  - Erkannte Patterns und Best Practices
  - Wichtige Business-Logik und Domain-Wissen
  - Technische Erkenntnisse und Learnings
  - Strategische Entscheidungen und Priorisierungen
  - Workflow-Praeferenzen und Konventionen
  - Debugging-Erkenntnisse mit allgemeinem Wert
  - Projektuebergreifendes Wissen

  **NICHT speicherwuerdig (DO NOT save):**
  - Reines Debugging einer spezifischen Session
  - Code-Aenderungen die bereits im Git sind
  - Temporaere Workarounds ohne Lernwert
  - Triviale Code-Diskussionen
  - Informationen die bereits in CLAUDE.md oder Skills stehen

  EXTRACT: Fuer jeden speicherwuerdigen Punkt eine **kompakte Notiz** (2-5 Saetze):
  - Was wurde entschieden/gelernt?
  - Warum? (Kontext/Begruendung)
  - Relevante Details (Dateinamen, Patterns, Constraints)

  IF keine speicherwuerdigen Inhalte gefunden:
    INFORM: "In dieser Session wurden keine speicherwuerdigen Topics identifiziert."
    ASK via AskUserQuestion:
    question: "Moechtest du manuell ein Topic eingeben?"
    options:
      - label: "Ja, manuell eingeben"
        description: "Du gibst das Topic und die wichtigsten Erkenntnisse selbst ein"
      - label: "Nein, abbrechen"
        description: "Session ohne Memory-Speicherung beenden"

    IF "Ja, manuell eingeben":
      ASK via AskUserQuestion:
      question: "Was moechtest du speichern? Beschreibe das Topic und die wichtigsten Erkenntnisse."
      SET: RAW_POINTS = User-Eingabe als einzelner Punkt

    IF "Nein, abbrechen":
      STOP: Workflow beendet

  IF speicherwuerdige Inhalte gefunden:
    PRESENT: Gefundene Punkte dem User als nummerierte Liste zur Bestaetigung

    ASK via AskUserQuestion:
    question: "Welche Punkte moechtest du speichern?"
    multiSelect: true
    options: [Extrahierte Punkte als Optionen auflisten]

    SET: RAW_POINTS = Vom User ausgewaehlte Roh-Punkte

  DETECT: Aktuelles Projekt aus Working Directory
  SET: DETECTED_PROJECT = basename des CWD
</topic_extraction>

### Phase 2: An Haiku Sub-Agent delegieren

<delegate_to_haiku>
  **WICHTIG: Ab hier wird ein Haiku Sub-Agent gestartet der die restliche Arbeit uebernimmt.**
  **Das spart erhebliche Kosten, da Strukturierung, Tag-Auswahl und MCP-Calls kein Opus benoetigen.**

  DELEGATE to Agent (model: "haiku"):
  description: "Save memory entries"
  prompt: |
    Du bist ein Memory-Management-Agent. Deine Aufgabe ist es, die folgenden Roh-Punkte
    aus einer Entwicklungs-Session in strukturierte Memory-Eintraege umzuwandeln und zu speichern.

    ## Roh-Punkte zum Speichern

    [RAW_POINTS hier einfuegen — die vom User bestaetigten Punkte]

    ## Erkanntes Projekt

    Projekt: [DETECTED_PROJECT]

    ## Deine Aufgaben

    Fuehre fuer JEDEN Roh-Punkt die folgenden Schritte aus:

    ### Schritt 1: Strukturieren

    Wandle jeden Roh-Punkt um in:
    - **Topic Title**: Kurzer, praegnanter Titel (3-8 Woerter)
    - **Summary**: 1-2 Saetze Zusammenfassung des Kernpunkts
    - **Details**: Optionale ausfuehrliche Informationen (Kontext, Beispiele, relevante Dateipfade)

    ### Schritt 2: Tags zuweisen

    1. Lade verfuegbare Tags:
       CALL MCP TOOL: mcp__kanban__memory_list_tags

    2. Waehle 2-4 passende Tags pro Topic basierend auf dem Inhalt.
       Frage den User:

       ASK via AskUserQuestion:
       question: "Tags fuer '[TOPIC_TITLE]' — Vorschlag: [SUGGESTED_TAGS]. Welche Tags?"
       multiSelect: true
       options:
         - Vorgeschlagene Tags (als erste Optionen)
         - Weitere relevante bestehende Tags
         - label: "Neuen Tag erstellen"
           description: "Einen neuen Tag anlegen"

       IF "Neuen Tag erstellen":
         ASK via AskUserQuestion:
         question: "Wie soll der neue Tag heissen? (lowercase, z.B. 'payment')"

    ### Schritt 3: Importance-Level festlegen

    ASK via AskUserQuestion:
    question: "Importance-Level fuer '[TOPIC_TITLE]'?"
    options:
      - label: "tactical"
        description: "Kurzlebig (Tage-Wochen): Debugging-Erkenntnisse, Session-Notizen"
      - label: "operational (Standard)"
        description: "Mittelfristig (Wochen-Monate): Projekt-Entscheidungen, aktuelle Patterns"
      - label: "strategic"
        description: "Langlebig (Monate-Jahre): Architektur-Grundsaetze, Domain-Wissen"

    ### Schritt 4: Projekt-Zuordnung

    Frage den User einmalig (gilt fuer alle Topics):

    ASK via AskUserQuestion:
    question: "Ist dieses Wissen projekt-spezifisch oder allgemein verwendbar?"
    options:
      - label: "Projekt-spezifisch ([DETECTED_PROJECT])"
        description: "Wird mit project_id '[DETECTED_PROJECT]' gespeichert"
      - label: "Allgemeines Wissen"
        description: "Wird ohne project_id gespeichert, in allen Projekten abrufbar"

    SET: PROJECT_ID = Auswahl (project name oder null)

    ### Schritt 5: Speichern

    FOR EACH strukturiertes Topic:
      CALL MCP TOOL: mcp__kanban__memory_store
      Input:
      {
        "topic": "[topic.title]",
        "summary": "[topic.summary]",
        "details": "[topic.details]",
        "tags": [topic.tags],
        "project_id": "[PROJECT_ID]",
        "source": "save-memory-skill",
        "importance": "[topic.importance]"
      }

    ### Schritt 6: Bestaetigung

    OUTPUT:

    ---
    ## Memory gespeichert

    **Gespeicherte Topics:** {count} von {total}
    **Projekt:** {PROJECT_ID oder "Allgemein"}

    | Topic | Tags | Importance | Summary |
    |-------|------|------------|---------|
    | {topic} | {tags} | {importance} | {summary truncated 60} |

    ---
</delegate_to_haiku>

</save_memory_workflow>

---

## MCP Tools Reference

| Tool | Zweck | Wann |
|------|-------|------|
| `mcp__kanban__memory_store` | Topic mit Summary, Details und Tags speichern | Schritt 5: Fuer jedes Topic |
| `mcp__kanban__memory_list_tags` | Alle verfuegbaren Tags mit Beschreibungen laden | Schritt 2: Vor der Tag-Auswahl |

---

## Kostenoptimierung

| Phase | Modell | Grund |
|-------|--------|-------|
| Phase 1: Roh-Punkte extrahieren | **Main Agent (Opus)** | Braucht Zugriff auf die Konversationshistorie |
| Phase 2: Strukturieren + Speichern | **Haiku Sub-Agent** | Einfache Aufgabe: Formatieren, User fragen, MCP-Calls |

Dies spart ~90% der Token-Kosten gegenueber dem alten Ansatz, bei dem Opus den gesamten Workflow ausfuehrte.

---

## Upsert-Verhalten

Das `memory_store` Tool nutzt Upsert-Logik:
- **Gleicher Topic + Tag + Datum** → Summary wird ersetzt, Details werden angehaengt
- Das bedeutet: Mehrfaches Speichern des gleichen Topics am gleichen Tag fuegt Details hinzu statt zu duplizieren
- Ideal fuer iteratives Wissens-Aufbau ueber eine Session hinweg

---

## Hinweise

- **project_id** ist optional. NULL = allgemeines Wissen, String = projekt-spezifisch
- **Tags** koennen frei erstellt werden. Bestehende Tags werden beim naechsten Aufruf automatisch angezeigt
- **source** wird automatisch auf "save-memory-skill" gesetzt fuer Nachvollziehbarkeit
- Standard-Tags (15): architecture, decision, feature, backend, frontend, database, api, testing, deployment, security, performance, convention, dependency, workflow, domain
