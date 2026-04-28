---
description: Interactive workflow for recalling and browsing persistent memory entries from the Memory database
globs: []
alwaysApply: false
---

# Recall Memory Skill

> Purpose: Interaktiver Workflow zum Abrufen, Browsen und Injizieren von gespeichertem Wissen aus der persistenten Memory-Datenbank.

## When to Use

Dieser Skill wird aufgerufen wenn der User `/recall-memory` ausfuehrt.
Er ermoeglicht das Durchsuchen, Filtern und Abrufen von Memory-Eintraegen aus vorherigen Sessions.

---

## Workflow

<recall_memory_workflow>

### Phase 1: Kontext erkennen

<context_detection>
  DETECT: Aktuelles Projekt aus Working Directory

  ```bash
  basename $(pwd)
  ```

  SET: DETECTED_PROJECT = basename des CWD

  ASK via AskUserQuestion:
  question: "Wie moechtest du auf deine Memories zugreifen?"
  options:
    - label: "Nach Tag browsen"
      description: "Alle verfuegbaren Tags anzeigen und nach Tag filtern"
    - label: "Nach Stichwort suchen"
      description: "Volltextsuche ueber alle Memory-Eintraege (FTS5)"
    - label: "Letzte Eintraege anzeigen"
      description: "Die zuletzt aktualisierten Eintraege anzeigen"
    - label: "Kontext-Summary laden"
      description: "Kompakte Zusammenfassung aller Memories fuer diese Session"
    - label: "Memory-Stats anzeigen"
      description: "Ueberblick ueber den Zustand des Memory-Systems"

  SET: ACCESS_MODE = Auswahl des Users
</context_detection>

### Phase 2: Abrufen

<fetch_entries>

  IF ACCESS_MODE == "Nach Tag browsen":

    1. LOAD: Verfuegbare Tags
       CALL MCP TOOL: mcp__kanban__memory_list_tags
       RECEIVE: Liste aller Tags mit Entry-Counts

    2. PRESENT: Tags als sortierte Liste mit Counts

    3. ASK via AskUserQuestion:
       question: "Welchen Tag moechtest du browsen?"
       options: [Tags als Optionen, sortiert nach entry_count DESC]

    4. CALL MCP TOOL: mcp__kanban__memory_recall
       Input: { "tag": "[SELECTED_TAG]", "limit": 20 }

  IF ACCESS_MODE == "Nach Stichwort suchen":

    1. ASK via AskUserQuestion:
       question: "Wonach moechtest du suchen? (Stichwort, Phrase in Anfuehrungszeichen, oder AND/OR/NOT Kombinationen)"

    2. CALL MCP TOOL: mcp__kanban__memory_search
       Input: { "query": "[USER_QUERY]", "limit": 20 }

  IF ACCESS_MODE == "Letzte Eintraege anzeigen":

    1. ASK via AskUserQuestion:
       question: "Moechtest du nur Eintraege dieses Projekts oder alle?"
       options:
         - label: "Nur [DETECTED_PROJECT]"
           description: "Eintraege mit project_id '[DETECTED_PROJECT]' + globale"
         - label: "Alle Projekte"
           description: "Alle Memory-Eintraege anzeigen"

    2. CALL MCP TOOL: mcp__kanban__memory_recall
       Input: { "limit": 20, "project_id": "[PROJECT_ID or omit]" }

  IF ACCESS_MODE == "Kontext-Summary laden":
    GOTO: Phase 4 (Context Injection)

  IF ACCESS_MODE == "Memory-Stats anzeigen":
    GOTO: Phase 5 (Stats)

  SET: RESULTS = Ergebnisse der Abfrage

  IF RESULTS ist leer:
    INFORM: "Keine Memory-Eintraege gefunden."
    ASK via AskUserQuestion:
    question: "Moechtest du eine andere Suche versuchen?"
    options:
      - label: "Ja, nochmal suchen"
        description: "Zurueck zur Auswahl"
      - label: "Nein, beenden"
        description: "Workflow beenden"

    IF "Ja": GOTO Phase 1
    IF "Nein": STOP

  PRESENT: Ergebnisse als Tabelle:

  | ID | Topic | Importance | Tags | Summary | Updated |
  |----|-------|------------|------|---------|---------|
  | {id} | {topic} | {importance} | {tags} | {summary truncated 50} | {updated_at} |

</fetch_entries>

### Phase 3: Expandieren

<expand_entries>
  ASK via AskUserQuestion:
  question: "Moechtest du Details zu einem oder mehreren Eintraegen sehen?"
  options:
    - label: "Ja, Details anzeigen"
      description: "Waehle Eintraege aus fuer volle Details + Related Entries"
    - label: "Kontext-Summary generieren"
      description: "Kompaktes Markdown aus den gefundenen Eintraegen"
    - label: "Nein, fertig"
      description: "Workflow beenden"

  IF "Ja, Details anzeigen":

    ASK via AskUserQuestion:
    question: "Welche Eintraege moechtest du im Detail sehen? (IDs)"

    FOR EACH selected_id:
      CALL MCP TOOL: mcp__kanban__memory_recall
      Input: { "id": [selected_id] }

      PRESENT: Voller Eintrag mit:
      - Topic, Summary, Details (vollstaendig)
      - Tags, Importance, Source
      - Access Count, Last Accessed
      - Created/Updated Timestamps
      - Related Entries (falls vorhanden):

        | Related ID | Topic | Relation |
        |-----------|-------|----------|
        | {id} | {topic} | {relation_type} |

  IF "Kontext-Summary generieren":
    GOTO: Phase 4

  IF "Nein, fertig":
    STOP
</expand_entries>

### Phase 4: Context Injection

<context_injection>
  ASK via AskUserQuestion:
  question: "Memory-Kontext laden - welchen Scope?"
  options:
    - label: "Nur Projekt [DETECTED_PROJECT]"
      description: "Projekt-spezifische + globale Memories"
    - label: "Alle Memories"
      description: "Gesamter Memory-Bestand"
    - label: "Nach Tag filtern"
      description: "Nur Memories mit bestimmtem Tag"

  IF "Nach Tag filtern":
    ASK: Welcher Tag?
    SET: CONTEXT_TAG = Auswahl

  CALL MCP TOOL: mcp__kanban__memory_recall
  Input:
  {
    "format": "context",
    "project_id": "[PROJECT_ID or omit]",
    "tag": "[CONTEXT_TAG or omit]",
    "limit": 50
  }

  RECEIVE: Markdown-formatierter Kontext (gruppiert nach Importance)

  OUTPUT: Den empfangenen Markdown-Kontext direkt anzeigen

  INFORM: "Dieser Kontext ist jetzt in deiner aktuellen Session verfuegbar."
</context_injection>

### Phase 5: Stats-Ueberblick

<stats_overview>
  CALL MCP TOOL: mcp__kanban__memory_stats

  PRESENT:

  ---
  ## Memory System Health

  | Metrik | Wert |
  |--------|------|
  | Gesamt-Eintraege | {total_entries} |
  | Aktive Eintraege | {active_entries} |
  | Archivierte Eintraege | {archived_entries} |
  | Veraltete Eintraege (30+ Tage) | {stale_entries} |

  ### Nach Importance

  | Level | Anzahl |
  |-------|--------|
  | Strategic | {by_importance.strategic} |
  | Operational | {by_importance.operational} |
  | Tactical | {by_importance.tactical} |

  ### Top Tags

  | Tag | Eintraege |
  |-----|-----------|
  | {tag} | {count} |
  ...

  ### Meistgenutzte Memories

  | ID | Topic | Zugriffe |
  |----|-------|----------|
  | {id} | {topic} | {access_count} |
  ...

  ---

  IF stale_entries > 0:
    INFORM: "Es gibt {stale_entries} veraltete Eintraege. Nutze `/manage-memory` fuer Housekeeping."
</stats_overview>

</recall_memory_workflow>

---

## MCP Tools Reference

| Tool | Zweck | Wann |
|------|-------|------|
| `mcp__kanban__memory_recall` | Eintraege nach ID, Topic, Tag abrufen | Phase 2-4: Hauptabruf |
| `mcp__kanban__memory_search` | Volltextsuche ueber Entries | Phase 2: Bei Stichwort-Suche |
| `mcp__kanban__memory_list_tags` | Verfuegbare Tags laden | Phase 2: Beim Tag-Browsen |
| `mcp__kanban__memory_stats` | System-Statistiken | Phase 5: Health-Check |

---

## Format-Optionen

- **JSON** (default): Vollstaendige strukturierte Daten pro Eintrag
- **Context** (`format: 'context'`): Kompaktes Markdown, gruppiert nach Importance-Level
  - Strategic zuerst (langlebige Architektur-Entscheidungen)
  - Dann Operational (mittelfristiges Projekt-Wissen)
  - Dann Tactical (kurzlebige Session-Notizen)
  - Format: `- **[topic]** (tags): summary`

---

## Hinweise

- **Access-Tracking**: Jeder Abruf zaehlt automatisch `access_count` hoch und setzt `last_accessed_at`
- **Archivierte Eintraege**: Werden standardmaessig NICHT angezeigt. Nutze `include_archived: true` fuer Zugriff.
- **Importance-Filter**: Kann bei Recall und Search als Filter genutzt werden
- **Related Entries**: Zeigt verlinkte Eintraege an (Relationen: related, supersedes, depends_on)
