---
description: Interactive housekeeping workflow for managing, archiving, and maintaining the persistent Memory database
globs: []
alwaysApply: false
---

# Manage Memory Skill

> Purpose: Interaktiver Housekeeping-Workflow zum Verwalten, Archivieren und Pflegen der persistenten Memory-Datenbank.

## When to Use

Dieser Skill wird aufgerufen wenn der User `/manage-memory` ausfuehrt.
Er ermoeglicht das Reviewen, Aktualisieren, Archivieren und Loeschen von Memory-Eintraegen.

---

## Workflow

<manage_memory_workflow>

### Phase 1: Stats anzeigen

<show_stats>
  CALL MCP TOOL: mcp__kanban__memory_stats

  PRESENT:

  ---
  ## Memory System Status

  | Metrik | Wert |
  |--------|------|
  | Gesamt-Eintraege | {total_entries} |
  | Aktive Eintraege | {active_entries} |
  | Archivierte Eintraege | {archived_entries} |
  | Veraltete (30+ Tage nicht abgerufen) | {stale_entries} |

  ### Importance-Verteilung

  | Level | Anzahl | Beschreibung |
  |-------|--------|-------------|
  | Strategic | {strategic} | Langlebige Architektur-/Business-Entscheidungen |
  | Operational | {operational} | Mittelfristiges Projekt-Wissen |
  | Tactical | {tactical} | Kurzlebige Session-Notizen |

  ### Top Tags (aktive Eintraege)

  | Tag | Eintraege |
  |-----|-----------|
  | {tag} | {count} |

  ---

  ASK via AskUserQuestion:
  question: "Was moechtest du tun?"
  options:
    - label: "Veraltete Eintraege browsen"
      description: "Eintraege die seit 30+ Tagen nicht abgerufen wurden"
    - label: "Tactical Entries aufraumen"
      description: "Alle tactical Eintraege aelter als 30 Tage archivieren"
    - label: "Einzelnen Eintrag bearbeiten"
      description: "Importance, Tags oder Inhalt eines bestimmten Eintrags aendern"
    - label: "Archivierte Eintraege verwalten"
      description: "Archivierte Eintraege anzeigen, wiederherstellen oder permanent loeschen"
    - label: "Eintraege verlinken"
      description: "Beziehungen zwischen Memory-Eintraegen erstellen"
    - label: "Fertig"
      description: "Housekeeping beenden"

  SET: ACTION = Auswahl des Users
</show_stats>

### Phase 2: Veraltete Eintraege browsen

<browse_stale>
  IF ACTION != "Veraltete Eintraege browsen": SKIP

  CALL MCP TOOL: mcp__kanban__memory_recall
  Input: { "limit": 30 }

  FILTER: Nur Eintraege mit last_accessed_at aelter als 30 Tage oder NULL + created_at aelter als 30 Tage

  IF keine veralteten Eintraege:
    INFORM: "Keine veralteten Eintraege gefunden. Deine Memories sind alle aktuell!"
    GOTO: Phase 1 (zurueck zur Aktionsauswahl)

  PRESENT: Veraltete Eintraege als Tabelle:

  | ID | Topic | Importance | Tags | Letzter Zugriff | Erstellt |
  |----|-------|------------|------|----------------|----------|
  | {id} | {topic} | {importance} | {tags} | {last_accessed_at or 'nie'} | {created_at} |

  ASK via AskUserQuestion:
  question: "Was moechtest du mit diesen Eintraegen tun?"
  multiSelect: true
  options:
    - Fuer jeden Eintrag: "Archivieren: [topic] (ID: [id])"
    - label: "Alle archivieren"
      description: "Alle angezeigten veralteten Eintraege archivieren"
    - label: "Nichts tun"
      description: "Zurueck zur Aktionsauswahl"

  IF "Alle archivieren" oder einzelne ausgewaehlt:
    FOR EACH selected entry:
      CALL MCP TOOL: mcp__kanban__memory_delete
      Input: { "id": [entry.id], "permanent": false }

    INFORM: "{count} Eintraege archiviert."

  GOTO: Phase 1
</browse_stale>

### Phase 3: Tactical Entries aufraumen (Bulk)

<cleanup_tactical>
  IF ACTION != "Tactical Entries aufraumen": SKIP

  CALL MCP TOOL: mcp__kanban__memory_recall
  Input: { "importance": "tactical", "limit": 50 }

  FILTER: Nur Eintraege die aelter als 30 Tage sind (created_at)

  IF keine alten tactical Eintraege:
    INFORM: "Keine tactical Eintraege aelter als 30 Tage gefunden."
    GOTO: Phase 1

  PRESENT: Gefundene Eintraege

  | ID | Topic | Tags | Erstellt |
  |----|-------|------|----------|
  | {id} | {topic} | {tags} | {created_at} |

  ASK via AskUserQuestion:
  question: "Sollen alle {count} tactical Eintraege aelter als 30 Tage archiviert werden?"
  options:
    - label: "Ja, alle archivieren"
      description: "Soft-Delete - koennen spaeter wiederhergestellt werden"
    - label: "Nein, einzeln auswaehlen"
      description: "Manuell waehlen welche archiviert werden"
    - label: "Abbrechen"
      description: "Zurueck zur Aktionsauswahl"

  IF "Ja, alle archivieren":
    FOR EACH entry:
      CALL MCP TOOL: mcp__kanban__memory_delete
      Input: { "id": [entry.id], "permanent": false }

    INFORM: "{count} tactical Eintraege archiviert."

  IF "Nein, einzeln auswaehlen":
    ASK: Welche IDs archivieren?
    FOR EACH selected:
      CALL MCP TOOL: mcp__kanban__memory_delete
      Input: { "id": [id], "permanent": false }

  GOTO: Phase 1
</cleanup_tactical>

### Phase 4: Einzelnen Eintrag bearbeiten

<edit_entry>
  IF ACTION != "Einzelnen Eintrag bearbeiten": SKIP

  ASK via AskUserQuestion:
  question: "Welchen Eintrag moechtest du bearbeiten? (ID eingeben oder Topic-Stichwort)"

  IF User gibt ID:
    CALL MCP TOOL: mcp__kanban__memory_recall
    Input: { "id": [USER_ID] }

  IF User gibt Stichwort:
    CALL MCP TOOL: mcp__kanban__memory_recall
    Input: { "topic": "[USER_INPUT]", "limit": 5 }

    IF mehrere Ergebnisse:
      PRESENT: Ergebnisse zur Auswahl
      ASK: Welchen Eintrag bearbeiten?

  PRESENT: Voller Eintrag mit allen Details

  ASK via AskUserQuestion:
  question: "Was moechtest du aendern?"
  multiSelect: true
  options:
    - label: "Importance aendern"
      description: "tactical / operational / strategic"
    - label: "Tags aktualisieren"
      description: "Bestehende Tags ersetzen"
    - label: "Summary aktualisieren"
      description: "Zusammenfassung ueberarbeiten"
    - label: "Details aktualisieren"
      description: "Details ersetzen (nicht anhaengen)"
    - label: "Archivieren"
      description: "Eintrag als archiviert markieren"
    - label: "Permanent loeschen"
      description: "Eintrag unwiderruflich entfernen"

  BUILD: Update-Objekt basierend auf Auswahl

  IF "Importance aendern":
    ASK via AskUserQuestion:
    question: "Neues Importance-Level?"
    options:
      - label: "tactical"
        description: "Kurzlebig - Session-spezifische Notizen, Debugging-Ergebnisse"
      - label: "operational"
        description: "Mittelfristig - Projekt-Entscheidungen, aktuelle Patterns"
      - label: "strategic"
        description: "Langlebig - Architektur-Grundsaetze, Domain-Wissen"
    ADD: importance zum Update-Objekt

  IF "Tags aktualisieren":
    CALL MCP TOOL: mcp__kanban__memory_list_tags
    PRESENT: Verfuegbare Tags
    ASK: Neue Tags waehlen (ersetzt ALLE bestehenden)
    ADD: tags zum Update-Objekt

  IF "Summary aktualisieren":
    ASK: Neue Summary eingeben
    ADD: summary zum Update-Objekt

  IF "Details aktualisieren":
    ASK: Neue Details eingeben (ersetzt bestehende)
    ADD: details zum Update-Objekt

  IF "Archivieren":
    CALL MCP TOOL: mcp__kanban__memory_delete
    Input: { "id": [entry.id], "permanent": false }
    INFORM: "Eintrag archiviert."
    GOTO: Phase 1

  IF "Permanent loeschen":
    ASK via AskUserQuestion:
    question: "Bist du sicher? Permanentes Loeschen kann nicht rueckgaengig gemacht werden."
    options:
      - label: "Ja, permanent loeschen"
      - label: "Nein, abbrechen"

    IF "Ja":
      CALL MCP TOOL: mcp__kanban__memory_delete
      Input: { "id": [entry.id], "permanent": true }
      INFORM: "Eintrag permanent geloescht."
    GOTO: Phase 1

  IF Update-Objekt nicht leer:
    CALL MCP TOOL: mcp__kanban__memory_update
    Input: { "id": [entry.id], ...Update-Objekt }

    PRESENT: Aktualisierter Eintrag
    INFORM: "Eintrag erfolgreich aktualisiert."

  GOTO: Phase 1
</edit_entry>

### Phase 5: Archivierte Eintraege verwalten

<manage_archived>
  IF ACTION != "Archivierte Eintraege verwalten": SKIP

  CALL MCP TOOL: mcp__kanban__memory_recall
  Input: { "include_archived": true, "limit": 30 }

  FILTER: Nur Eintraege mit archived_at != null

  IF keine archivierten Eintraege:
    INFORM: "Keine archivierten Eintraege vorhanden."
    GOTO: Phase 1

  PRESENT: Archivierte Eintraege

  | ID | Topic | Tags | Archiviert am |
  |----|-------|------|---------------|
  | {id} | {topic} | {tags} | {archived_at} |

  ASK via AskUserQuestion:
  question: "Was moechtest du tun?"
  options:
    - label: "Einzelnen Eintrag wiederherstellen"
      description: "Archivierung rueckgaengig machen"
    - label: "Alle permanent loeschen"
      description: "Alle archivierten Eintraege unwiderruflich entfernen"
    - label: "Zurueck"
      description: "Zurueck zur Aktionsauswahl"

  IF "Einzelnen Eintrag wiederherstellen":
    ASK: Welche ID wiederherstellen?
    CALL MCP TOOL: mcp__kanban__memory_update
    Input: { "id": [selected_id] }
    NOTE: archived_at wird durch ein Update auf ein beliebiges Feld nicht zurueckgesetzt.
          Stattdessen direkt:
    INFORM: "Um einen archivierten Eintrag wiederherzustellen, aktualisiere ihn mit memory_update - das setzt archived_at nicht zurueck. Fuer echte Wiederherstellung muss der Eintrag neu gespeichert werden via memory_store."

  IF "Alle permanent loeschen":
    ASK: "Bist du sicher? Dies kann nicht rueckgaengig gemacht werden."
    IF Ja:
      FOR EACH archived entry:
        CALL MCP TOOL: mcp__kanban__memory_delete
        Input: { "id": [entry.id], "permanent": true }
      INFORM: "{count} Eintraege permanent geloescht."

  GOTO: Phase 1
</manage_archived>

### Phase 6: Eintraege verlinken

<link_entries>
  IF ACTION != "Eintraege verlinken": SKIP

  ASK via AskUserQuestion:
  question: "Welchen Eintrag moechtest du als Quelle verlinken? (ID)"

  CALL MCP TOOL: mcp__kanban__memory_recall
  Input: { "id": [SOURCE_ID] }
  PRESENT: Quell-Eintrag

  ASK via AskUserQuestion:
  question: "Mit welchen Eintraegen verlinken? (IDs, komma-getrennt)"

  PARSE: Target-IDs

  CALL MCP TOOL: mcp__kanban__memory_update
  Input: { "id": [SOURCE_ID], "related_to": [TARGET_IDS] }

  PRESENT: Aktualisierter Eintrag mit Related Entries
  INFORM: "Verlinkung erstellt."

  GOTO: Phase 1
</link_entries>

</manage_memory_workflow>

---

## MCP Tools Reference

| Tool | Zweck | Wann |
|------|-------|------|
| `mcp__kanban__memory_stats` | System-Statistiken | Phase 1: Ueberblick |
| `mcp__kanban__memory_recall` | Eintraege abrufen | Phase 2-5: Browsen und Details |
| `mcp__kanban__memory_update` | Eintrag aktualisieren | Phase 4, 6: Bearbeiten und Verlinken |
| `mcp__kanban__memory_delete` | Archivieren oder Loeschen | Phase 2-5: Aufraumen |
| `mcp__kanban__memory_list_tags` | Tags laden | Phase 4: Bei Tag-Aenderung |

---

## Importance-Level Erklaerung

| Level | Lebensdauer | Beispiele |
|-------|-------------|-----------|
| **tactical** | Kurzlebig (Tage-Wochen) | Debugging-Erkenntnisse, Session-Notizen, temporaere Workarounds |
| **operational** | Mittelfristig (Wochen-Monate) | Projekt-Entscheidungen, aktuelle Patterns, Sprint-spezifisches Wissen |
| **strategic** | Langlebig (Monate-Jahre) | Architektur-Grundsaetze, Domain-Wissen, Business-Regeln |

---

## Hinweise

- **Soft-Delete**: Archivierung setzt `archived_at` - Eintraege sind recoverable
- **Hard-Delete**: `permanent: true` loescht unwiderruflich (CASCADE auf Tags + Relations)
- **Access-Tracking**: Jeder Abruf zaehlt `access_count` hoch
- **Stale-Definition**: Nicht abgerufen in 30+ Tagen ODER nie abgerufen und erstellt vor 30+ Tagen
