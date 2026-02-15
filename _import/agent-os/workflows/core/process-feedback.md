---
description: Process customer feedback and categorize into specs, bugs, and todos
version: 1.0
trigger: /process-feedback
---

# Process Feedback Workflow

## Purpose

Nimmt unstrukturiertes oder strukturiertes Kundenfeedback entgegen, analysiert es und kategorisiert jeden Punkt als:
- **Spec** - Größeres Feature, das geplant werden muss
- **Bug** - Fehler, der behoben werden muss
- **Todo** - Kleine Aufgabe, die schnell erledigt werden kann

## Input

Das Feedback kann in verschiedenen Formaten kommen:
- Freitext (E-Mail, Chat-Nachricht)
- Bullet-Liste
- Nummerierte Liste
- Screenshot-Beschreibungen
- Meeting-Notizen

## Workflow Steps

<step name="collect_feedback">
  ### 1. Feedback erfassen

  ASK: Falls kein Feedback als Parameter übergeben wurde:

  "Bitte füge das Kundenfeedback ein (Freitext, E-Mail, Liste, etc.):"

  CAPTURE: Raw feedback text
  SET: RAW_FEEDBACK = captured text
</step>

<step name="identify_project">
  ### 2. Projekt identifizieren

  CHECK: Ist ein Projektkontext verfügbar?

  IF agent-os/product/mission.md exists:
    READ: agent-os/product/mission.md
    EXTRACT: Project name and context
    SET: PROJECT_NAME = extracted name

  ELSE:
    ASK via AskUserQuestion:
    "Für welches Projekt ist dieses Feedback?"
    SET: PROJECT_NAME = user answer
</step>

<step name="extract_items">
  ### 3. Feedback-Punkte extrahieren

  ANALYZE: RAW_FEEDBACK

  <extraction_rules>
    **Identifiziere jeden einzelnen Punkt:**

    1. Trenne zusammenhängende Themen voneinander
    2. Erkenne implizite Anforderungen
    3. Extrahiere konkrete Problembeschreibungen
    4. Identifiziere Wünsche vs. Beschwerden vs. Fragen

    **Für jeden Punkt extrahiere:**
    - Originaltext (Zitat aus dem Feedback)
    - Zusammenfassung (1 Satz)
    - Betroffener Bereich (UI, Backend, Workflow, etc.)
    - Dringlichkeit (aus Kontext ableitbar?)
    - Klarheit (klar / unklar / braucht Rückfrage)
  </extraction_rules>

  SET: EXTRACTED_ITEMS = list of extracted items
</step>

<step name="categorize_items">
  ### 4. Kategorisierung

  FOR EACH item in EXTRACTED_ITEMS:

  <categorization_logic>
    **Als SPEC kategorisieren wenn:**
    - Neues Feature gewünscht
    - Größere Änderung am Verhalten
    - Neue Integration benötigt
    - Mehrere Komponenten betroffen
    - Aufwand > 1 Tag geschätzt
    - Erfordert Konzeption/Design

    **Als BUG kategorisieren wenn:**
    - Etwas funktioniert nicht wie erwartet
    - Fehler oder Crash beschrieben
    - "geht nicht", "funktioniert nicht", "kaputt"
    - Abweichung vom dokumentierten Verhalten
    - Regression (hat früher funktioniert)

    **Als TODO kategorisieren wenn:**
    - Kleine Anpassung
    - Textänderung
    - Konfigurationsänderung
    - Aufwand < 1 Tag
    - Kein neues Konzept nötig
    - "Kleinigkeit", "kurz", "schnell"

    **Bei Unklarheit:**
    - Tendenz zu TODO wenn klein
    - Tendenz zu BUG wenn Problem beschrieben
    - Tendenz zu SPEC wenn Feature gewünscht
  </categorization_logic>

  SET: item.category = "spec" | "bug" | "todo"
  SET: item.confidence = "high" | "medium" | "low"
  SET: item.reasoning = why this category
</step>

<step name="estimate_priority">
  ### 5. Priorität schätzen

  FOR EACH item in EXTRACTED_ITEMS:

  <priority_logic>
    **Critical (P0):**
    - Blocker für Nutzung
    - Datenverlust möglich
    - Sicherheitsproblem
    - Explizit als dringend markiert

    **High (P1):**
    - Beeinträchtigt Hauptfunktionen
    - Viele Nutzer betroffen
    - Workaround schwierig
    - Kunde explizit unzufrieden

    **Medium (P2):**
    - Störend aber nicht blockierend
    - Workaround möglich
    - Nice-to-have Feature

    **Low (P3):**
    - Kosmetisch
    - Edge-Case
    - Verbesserungsvorschlag ohne Druck
  </priority_logic>

  SET: item.priority = "critical" | "high" | "medium" | "low"
</step>

<step name="identify_clarifications">
  ### 6. Rückfragen identifizieren

  FOR EACH item in EXTRACTED_ITEMS:

  CHECK: Ist der Punkt klar genug für Umsetzung?

  IF NOT clear:
    GENERATE: Konkrete Rückfrage an Kunden
    SET: item.clarificationNeeded = true
    SET: item.clarificationQuestion = generated question
  ELSE:
    SET: item.clarificationNeeded = false
</step>

<step name="generate_json_output">
  ### 7. JSON-Output generieren

  GENERATE: Strukturiertes JSON

  ```json
  {
    "$schema": "feedback-analysis-schema.json",
    "version": "1.0",

    "metadata": {
      "analyzedAt": "[ISO-TIMESTAMP]",
      "project": "[PROJECT_NAME]",
      "feedbackSource": "[email|chat|meeting|other]",
      "rawFeedbackLength": [CHARACTER_COUNT]
    },

    "summary": {
      "totalItems": [COUNT],
      "byCategory": {
        "spec": [COUNT],
        "bug": [COUNT],
        "todo": [COUNT]
      },
      "byPriority": {
        "critical": [COUNT],
        "high": [COUNT],
        "medium": [COUNT],
        "low": [COUNT]
      },
      "clarificationsNeeded": [COUNT]
    },

    "items": [
      {
        "id": "fb-001",
        "category": "spec|bug|todo",
        "priority": "critical|high|medium|low",
        "confidence": "high|medium|low",

        "original": "[Originaltext aus Feedback]",
        "title": "[Kurztitel, max 60 Zeichen]",
        "description": "[Zusammenfassung in 1-2 Sätzen]",

        "area": "[UI|Backend|API|Database|Workflow|Integration|Other]",
        "reasoning": "[Warum diese Kategorie?]",

        "clarificationNeeded": true|false,
        "clarificationQuestion": "[Rückfrage an Kunden]" | null,

        "suggestedAction": {
          "command": "/create-spec|/add-bug|/add-todo",
          "parameters": {
            "title": "[Vorgeschlagener Titel]",
            "description": "[Vorgeschlagene Beschreibung]"
          }
        }
      }
    ],

    "rawFeedback": "[Original-Feedback zur Referenz]"
  }
  ```
</step>

<step name="display_results">
  ### 8. Ergebnisse anzeigen

  OUTPUT to user:
  ---
  ## Feedback-Analyse abgeschlossen

  **Projekt:** {PROJECT_NAME}
  **Analysiert:** {TIMESTAMP}

  ### Zusammenfassung

  | Kategorie | Anzahl |
  |-----------|--------|
  | 📋 Specs | {spec_count} |
  | 🐛 Bugs | {bug_count} |
  | ✅ Todos | {todo_count} |
  | **Gesamt** | {total_count} |

  ### Prioritäten

  | Priorität | Anzahl |
  |-----------|--------|
  | 🔴 Critical | {critical_count} |
  | 🟠 High | {high_count} |
  | 🟡 Medium | {medium_count} |
  | 🟢 Low | {low_count} |

  ### Items nach Kategorie

  **📋 Specs (größere Features):**
  {FOR EACH spec item:}
  - [{priority}] **{title}**: {description}
    → `/create-spec "{title}"`

  **🐛 Bugs (Fehler):**
  {FOR EACH bug item:}
  - [{priority}] **{title}**: {description}
    → `/add-bug "{title}"`

  **✅ Todos (kleine Aufgaben):**
  {FOR EACH todo item:}
  - [{priority}] **{title}**: {description}
    → `/add-todo "{title}"`

  ### Rückfragen an Kunden ({clarification_count})

  {FOR EACH item with clarificationNeeded:}
  - **{title}**: {clarificationQuestion}

  ---

  **JSON-Output wurde generiert.**

  **Nächste Schritte:**
  1. Rückfragen an Kunden senden (falls vorhanden)
  2. Items mit `/create-spec`, `/add-bug`, `/add-todo` anlegen
  3. Oder: Direkt mit `/process-feedback --apply` automatisch anlegen

  ---
</step>

<step name="optional_apply" condition="--apply flag provided">
  ### 9. Optional: Automatisch anlegen

  IF --apply flag was provided:

  ASK via AskUserQuestion:
  "Sollen alle {total_count} Items automatisch angelegt werden?

  1. Ja, alle anlegen (Recommended)
  2. Nur Bugs und Todos anlegen (Specs manuell)
  3. Nein, nur JSON ausgeben"

  IF user chooses 1 or 2:
    FOR EACH item:
      IF item.category = "spec" AND user chose 1:
        LOG: "Spec muss manuell mit /create-spec angelegt werden"
        OUTPUT: Vorgeschlagener /create-spec Aufruf

      IF item.category = "bug":
        EXECUTE: /add-bug with item.suggestedAction.parameters

      IF item.category = "todo":
        EXECUTE: /add-todo with item.suggestedAction.parameters

    OUTPUT: "{created_count} Items wurden angelegt."
</step>

## Output Format

Das JSON wird in der Konsole ausgegeben und kann optional gespeichert werden:

```bash
# JSON in Datei speichern (wird vom Workflow vorgeschlagen)
agent-os/feedback/feedback-{DATE}-{HASH}.json
```

## Beispiel

**Input:**
```
Hey, kurzes Feedback zur App:
- Der Login geht manchmal nicht, muss dann 2-3 mal probieren
- Wäre cool wenn man auch mit Google einloggen könnte
- Der Text auf dem Button ist abgeschnitten auf meinem iPhone
- Könnt ihr die Farbe vom Header etwas dunkler machen?
```

**Output:**
```json
{
  "items": [
    {
      "id": "fb-001",
      "category": "bug",
      "priority": "high",
      "title": "Login funktioniert intermittierend nicht",
      "description": "Nutzer muss Login mehrfach versuchen",
      "suggestedAction": { "command": "/add-bug" }
    },
    {
      "id": "fb-002",
      "category": "spec",
      "priority": "medium",
      "title": "Google OAuth Integration",
      "description": "Social Login mit Google ermöglichen",
      "suggestedAction": { "command": "/create-spec" }
    },
    {
      "id": "fb-003",
      "category": "bug",
      "priority": "medium",
      "title": "Button-Text auf iPhone abgeschnitten",
      "description": "Responsive Issue auf kleineren Bildschirmen",
      "suggestedAction": { "command": "/add-bug" }
    },
    {
      "id": "fb-004",
      "category": "todo",
      "priority": "low",
      "title": "Header-Farbe anpassen",
      "description": "Header etwas dunkler gestalten",
      "suggestedAction": { "command": "/add-todo" }
    }
  ]
}
```
