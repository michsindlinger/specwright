---
description: Interactive workflow for saving session knowledge to persistent memory with structured topics and tags
globs: []
alwaysApply: false
---

# Save Memory Skill

> Purpose: Interaktiver Workflow zum strukturierten Speichern von Session-Wissen in die persistente Memory-Datenbank.

## When to Use

Dieser Skill wird aufgerufen wenn der User `/save-memory` ausfuehrt.
Er extrahiert relevante Topics aus der aktuellen Session und speichert sie strukturiert mit Tags.

---

## Workflow

<save_memory_workflow>

### Phase 1: Session analysieren und Topics extrahieren

<topic_extraction>
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

  EXTRACT: Liste der relevanten Topics mit jeweils:
  - **Topic Title**: Kurzer, praegnanter Titel
  - **Summary**: 1-2 Saetze Zusammenfassung
  - **Details**: Optionale ausfuehrliche Informationen (Kontext, Beispiele, Code-Snippets)

  IF keine speicherwuerdigen Topics gefunden:
    INFORM: "In dieser Session wurden keine speicherwuerdigen Topics identifiziert."
    INFORM: "Typische speicherwuerdige Inhalte sind: Architektur-Entscheidungen, Patterns, Domain-Wissen, Learnings."

    ASK via AskUserQuestion:
    question: "Moechtest du manuell ein Topic eingeben?"
    options:
      - label: "Ja, manuell eingeben"
        description: "Du gibst Topic, Summary und Details selbst ein"
      - label: "Nein, abbrechen"
        description: "Session ohne Memory-Speicherung beenden"

    IF "Ja, manuell eingeben":
      ASK via AskUserQuestion:
      question: "Was moechtest du speichern? Beschreibe das Topic und die wichtigsten Erkenntnisse."

      PARSE: User-Eingabe zu Topic mit Title, Summary, Details
      CONTINUE: mit Phase 2 fuer dieses eine Topic

    IF "Nein, abbrechen":
      STOP: Workflow beendet

  IF Topics gefunden:
    PRESENT: Gefundene Topics dem User zur Bestätigung

    ASK via AskUserQuestion:
    question: "Welche Topics moechtest du speichern?"
    multiSelect: true
    options: [Extrahierte Topics als Optionen auflisten]

    SET: SELECTED_TOPICS = Vom User ausgewaehlte Topics
</topic_extraction>

### Phase 2: Tags zuweisen

<tag_assignment>
  FOR EACH topic in SELECTED_TOPICS:

    1. LOAD: Verfuegbare Tags
       CALL MCP TOOL: mcp__kanban__memory_list_tags
       RECEIVE: Liste aller Tags mit Beschreibungen und Nutzungshaeufigkeit

    2. SUGGEST: Passende Tags basierend auf Topic-Inhalt
       ANALYZE: Topic-Title und Summary
       MATCH: Mit verfuegbaren Tags
       SELECT: 2-4 am besten passende Tags als Vorschlag

    3. ASK via AskUserQuestion:
       question: "Tags fuer Topic '[TOPIC_TITLE]' - Vorschlag: [SUGGESTED_TAGS]. Welche Tags moechtest du verwenden?"
       multiSelect: true
       options:
         - Vorgeschlagene Tags (als erste Optionen)
         - Weitere relevante bestehende Tags
         - label: "Neuen Tag erstellen"
           description: "Einen neuen Tag anlegen der noch nicht existiert"

       IF "Neuen Tag erstellen" gewaehlt:
         ASK via AskUserQuestion:
         question: "Wie soll der neue Tag heissen? (lowercase, z.B. 'payment', 'performance')"

         ADD: Neuen Tag zur Tag-Liste fuer dieses Topic

    SET: topic.tags = Ausgewaehlte Tags (bestehende + neue)
</tag_assignment>

### Phase 3: Projekt-Zuordnung

<project_assignment>
  DETECT: Aktuelles Projekt aus Working Directory

  ```bash
  # Projekt-Name aus CWD ableiten
  basename $(pwd)
  ```

  SET: DETECTED_PROJECT = basename des CWD

  ASK via AskUserQuestion:
  question: "Ist dieses Wissen projekt-spezifisch oder allgemein verwendbar?"
  options:
    - label: "Projekt-spezifisch ([DETECTED_PROJECT])"
      description: "Wird mit project_id '[DETECTED_PROJECT]' gespeichert und ist nur in diesem Projekt-Kontext abrufbar"
    - label: "Allgemeines Wissen"
      description: "Wird ohne project_id gespeichert und ist in allen Projekten abrufbar"

  IF "Projekt-spezifisch":
    SET: PROJECT_ID = DETECTED_PROJECT
  ELSE:
    SET: PROJECT_ID = null
</project_assignment>

### Phase 4: Speichern

<save_topics>
  SET: SAVED_ENTRIES = []

  FOR EACH topic in SELECTED_TOPICS:

    CALL MCP TOOL: mcp__kanban__memory_store
    Input:
    {
      "topic": "[topic.title]",
      "summary": "[topic.summary]",
      "details": "[topic.details]",  // optional, nur wenn vorhanden
      "tags": [topic.tags],
      "project_id": "[PROJECT_ID]",  // oder null fuer allgemein
      "source": "save-memory-skill"
    }

    VERIFY: Response success = true
    APPEND: Gespeichertes Entry zu SAVED_ENTRIES

    IF Response success = false:
      WARN: "Fehler beim Speichern von Topic '[topic.title]': [error message]"
      CONTINUE: Mit naechstem Topic
</save_topics>

### Phase 5: Bestaetigung

<confirmation>
  OUTPUT:

  ---
  ## Memory gespeichert

  **Gespeicherte Topics:** {count(SAVED_ENTRIES)} von {count(SELECTED_TOPICS)}
  **Projekt:** {PROJECT_ID oder "Allgemein"}

  | Topic | Tags | Summary |
  |-------|------|---------|
  | {entry.topic} | {entry.tags joined with ", "} | {entry.summary truncated to 60 chars} |
  ...

  ---

  IF any topics failed:
    WARN: "{N} Topics konnten nicht gespeichert werden. Siehe Fehlermeldungen oben."
</confirmation>

</save_memory_workflow>

---

## MCP Tools Reference

| Tool | Zweck | Wann |
|------|-------|------|
| `mcp__kanban__memory_store` | Topic mit Summary, Details und Tags speichern | Phase 4: Fuer jedes ausgewaehlte Topic |
| `mcp__kanban__memory_list_tags` | Alle verfuegbaren Tags mit Beschreibungen laden | Phase 2: Vor der Tag-Auswahl |

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
- Bereits geseedete Tags (15 Standard-Tags) sind: architecture, decision, feature, backend, frontend, database, api, testing, deployment, security, performance, convention, dependency, workflow, domain
