---
description: Interaktiver Strategieberater - verwandelt vage Ziele in konkrete OpenClaw-Umsetzungspläne
globs:
alwaysApply: false
version: 1.0
encoding: UTF-8
installation: global
---

# OpenClaw Strategy Workflow

Interaktiver Strategieberater: Verwandelt ein vages Ziel durch iterative Rückfragen in einen konkreten OpenClaw-Umsetzungsplan mit Mission Control Konfiguration, Tasks, Cron-Jobs und Delivery-Setup.

<pre_flight_check>
  EXECUTE: @agent-os/workflows/meta/pre-flight.md
</pre_flight_check>

<openclaw_knowledge>

## OpenClaw Platform Knowledge Base

Dieses Wissen wird intern vom Workflow genutzt, um User-Ziele auf OpenClaw-Primitives zu mappen.

### Task-Typen

**One-Time Tasks:**
- Einmalige Ausführung, z.B. Setup, Migration, initiale Content-Erstellung
- Status: pending → running → completed/failed
- Ideal für: Account-Setup, Template-Erstellung, initiale Recherche

**Cron Tasks (Recurring):**
- Wiederkehrende Ausführung nach Zeitplan
- Konfiguration: Schedule (Cron-Expression), Timezone, Session-Typ, Delivery, Payload
- Ideal für: Content-Erstellung, Reports, Monitoring, Notifications

**Epic Tasks:**
- Langfristige Aufgaben die über mehrere Sessions laufen
- Können Sub-Tasks enthalten
- Ideal für: Große Projekte, mehrstufige Kampagnen

### Cron-Konfiguration

**Schedule (Cron-Expressions):**
```
┌───────────── Minute (0-59)
│ ┌───────────── Stunde (0-23)
│ │ ┌───────────── Tag des Monats (1-31)
│ │ │ ┌───────────── Monat (1-12)
│ │ │ │ ┌───────────── Wochentag (0-7, 0=So, 7=So)
│ │ │ │ │
* * * * *
```

**Häufige Expressions:**
- `0 9 * * 1-5` → Montag-Freitag um 09:00
- `0 8 * * *` → Täglich um 08:00
- `0 10 * * 1` → Jeden Montag um 10:00
- `0 9 1 * *` → Erster des Monats um 09:00
- `0 */4 * * *` → Alle 4 Stunden
- `30 17 * * 5` → Jeden Freitag um 17:30
- `0 6 * * 1,3,5` → Mo/Mi/Fr um 06:00

**Timezone:** z.B. `Europe/Berlin`, `America/New_York`, `UTC`

**Session-Typen:**
- `new` → Jede Ausführung startet eine neue Session (Standard für unabhängige Tasks)
- `continue` → Führt in bestehender Session fort (für aufbauende Tasks mit Kontext)

**Delivery-Kanäle:**
- **Telegram**: Bot-Nachricht an Chat/Gruppe/Kanal
  - Config: `telegram` mit `chat_id`
  - Formate: Text, Markdown, Bilder, Dateien
- **Slack**: Nachricht an Channel/DM
  - Config: `slack` mit `channel`
  - Formate: Text, Blocks, Attachments

**Payload:**
- Zusätzlicher Kontext der dem Agent bei jeder Cron-Ausführung mitgegeben wird
- Kann statische Anweisungen, Templates oder dynamische Referenzen enthalten

### Mission Control Struktur

**Projects:**
- Container für zusammengehörige Tasks
- Haben Name, Beschreibung, Status
- Gruppieren Tasks thematisch (z.B. "Instagram Automation", "Weekly Reports")

**Task-Felder:**
- Name, Beschreibung, Typ (one-time/cron/epic)
- Status: pending, running, completed, failed, paused
- Agent-Zuweisung
- Schedule (bei Cron)
- Delivery-Config
- Payload/Prompt

### Verfügbare Google-Integrationen (via gog CLI)

- **Gmail**: E-Mails lesen, senden, durchsuchen, Labels verwalten
- **Google Calendar**: Events erstellen, lesen, aktualisieren, löschen
- **Google Drive**: Dateien hochladen, herunterladen, durchsuchen, teilen
- **Google Contacts**: Kontakte lesen, erstellen, aktualisieren
- **Google Docs**: Dokumente erstellen, lesen, bearbeiten
- **Google Sheets**: Tabellen erstellen, lesen, Daten schreiben
- **Google Tasks**: Aufgaben erstellen, lesen, aktualisieren, listen verwalten

### Custom Skills System

- Skills erweitern die Fähigkeiten eines Agents
- Definiert als Markdown-Dateien mit Anweisungen
- Können projektspezifisches Wissen, Tonalität, Workflows enthalten
- Aktivierung: per Agent oder global
- Beispiele: "Instagram Content Creator", "SEO Analyst", "Newsletter Writer"

### Agent-Auswahl

**Standard (empfohlen):**
- Bestehende Agents nutzen (main/private)
- Verhalten über Task-Prompts und Custom Skills steuern
- Vorteil: Kein Setup-Overhead, sofort einsatzbereit

**Dedizierter Agent (advanced, bei komplexen Strategien):**
- Eigener Agent mit spezifischer Persona
- Eigener Workspace/Kontext
- Sinnvoll bei: Spezialisierte Tonalität, separater Kontext, Multi-Agent-Strategien
- Beispiel: "Instagram Content Bot" als separater Agent mit eigener Persona

</openclaw_knowledge>

<process_flow>

<!-- ═══════════════════════════════════════════════════════════ -->
<!-- PHASE 1: GOAL INTAKE                                       -->
<!-- ═══════════════════════════════════════════════════════════ -->

<step number="1" name="goal_intake">

### Step 1: Goal Intake

Erfasse das Ziel des Users. Das Ziel kann als Argument übergeben oder interaktiv erfragt werden.

<conditional_logic>
  IF args provided (user passed goal as command argument):
    EXTRACT goal from args
    CONFIRM with user: "Ich habe folgendes Ziel verstanden: [GOAL]. Stimmt das?"
    IF user confirms:
      STORE as $USER_GOAL
      PROCEED to step 2
    ELSE:
      ASK user to clarify/restate goal
      STORE corrected version as $USER_GOAL
      PROCEED to step 2

  ELSE (no args, interactive mode):
    ASK user via AskUserQuestion:
      question: "Was möchtest du mit OpenClaw automatisieren oder umsetzen? Beschreibe dein Ziel so konkret wie möglich."
      header: "Dein Ziel"
      options:
        - label: "Content Automation"
          description: "z.B. Social Media Posts, Newsletter, Blog-Artikel automatisch erstellen"
        - label: "Monitoring & Reports"
          description: "z.B. SEO-Tracking, Wettbewerber-Analyse, tägliche Zusammenfassungen"
        - label: "Workflow Automation"
          description: "z.B. E-Mail-Verarbeitung, Lead-Management, Daten-Synchronisation"
        - label: "Anderes Ziel"
          description: "Beschreibe dein Ziel frei im Textfeld"

    WAIT for user response
    STORE as $USER_GOAL
    PROCEED to step 2
</conditional_logic>

**Internal Tracking (nicht dem User zeigen):**
```
$DISCOVERY_STATE = {
  goal: $USER_GOAL,
  dimensions_covered: [],      # Track welche der 7 Dimensionen abgedeckt sind
  dimensions_total: 7,
  round: 0,
  answers: {}
}

Dimensionen:
1. zielklaerung    - Messbare Outcomes, Timeline, Erfolgskriterien
2. ressourcen      - Google-Accounts, vorhandene Inhalte, Tools
3. kanal_strategie - Telegram, Slack für Notifications/Ergebnisse
4. automatisierung - Voll automatisch vs. Human-in-the-Loop
5. content_domain  - Wissen, Tonalität, Zielgruppe
6. schedule        - Ausführungszeiten, Frequenzen, Timezone
7. abhaengigkeiten - Externe Services, API-Zugriffe, Zugangsdaten
```

</step>

<!-- ═══════════════════════════════════════════════════════════ -->
<!-- PHASE 2: INTERACTIVE DISCOVERY (max 3 Runden)              -->
<!-- ═══════════════════════════════════════════════════════════ -->

<step number="2" name="discovery_round_1">

### Step 2: Discovery Round 1 - Fundamentals

Erste Fragenrunde: Fokus auf die fundamentalsten Dimensionen (Zielklärung + Ressourcen).

**Analyse des Goals:**
Analysiere $USER_GOAL und identifiziere:
- Was bereits implizit klar ist (z.B. "15 Instagram Posts" → Dimension 1 teilweise abgedeckt)
- Was noch völlig unklar ist
- Welche 2-3 Fragen den größten Informationsgewinn bringen

**Fragen (2-3, adaptiv basierend auf Goal):**

Wähle aus folgenden Fragen die relevantesten 2-3:

*Dimension 1 - Zielklärung:*
- "Was genau soll am Ende rauskommen? Beschreibe das ideale Ergebnis."
- "Bis wann soll das laufen / in welchem Zeitraum?"
- "Woran erkennst du, dass es erfolgreich war?"

*Dimension 2 - Ressourcen:*
- "Welche Google-Services nutzt du bereits? (Gmail, Drive, Calendar, Sheets, etc.)"
- "Hast du bereits Inhalte/Templates/Vorlagen die wir nutzen können?"
- "Welche Tools/Accounts sind schon vorhanden?"

**Format:** Stelle die Fragen als zusammenhängenden Block via AskUserQuestion oder als direkte Fragen im Chat (je nachdem was natürlicher wirkt). Das soll sich wie ein Beratungsgespräch anfühlen, nicht wie ein Formular.

WAIT for user response
UPDATE $DISCOVERY_STATE:
  - Mark covered dimensions
  - Store answers
  - Increment round

PROCEED to step 3

</step>

<step number="3" name="discovery_round_2">

### Step 3: Discovery Round 2 - Follow-up

Zweite Fragenrunde: Basierend auf den bisherigen Antworten die nächst-wichtigsten Lücken schließen.

**Analyse:**
Review $DISCOVERY_STATE.answers und identifiziere:
- Welche Dimensionen sind noch nicht abgedeckt?
- Welche Antworten waren vage und brauchen Vertiefung?
- Was ergibt sich als logische Follow-up-Frage?

**Fragen (2-3, adaptiv):**

Wähle aus den noch nicht abgedeckten Dimensionen:

*Dimension 3 - Kanal-Strategie:*
- "Wohin sollen die Ergebnisse geliefert werden? (Telegram, Slack, E-Mail, Datei)"
- "Soll es Benachrichtigungen geben? Wenn ja, wann und wohin?"

*Dimension 4 - Automatisierungsgrad:*
- "Soll alles vollautomatisch laufen oder möchtest du vor der Ausführung prüfen/bestätigen?"
- "Gibt es Schritte die du selbst machen möchtest (z.B. Bilder auswählen, Text freigeben)?"

*Dimension 5 - Content/Domain:*
- "In welchem Stil/Tonalität soll kommuniziert werden?"
- "Wer ist die Zielgruppe?"
- "Gibt es fachliches Wissen das der Agent braucht?"

*Dimension 6 - Schedule:*
- "Wann und wie oft soll das laufen? (täglich, wöchentlich, bestimmte Tage/Uhrzeiten)"
- "In welcher Timezone bist du?"

**Format:** Natürlicher Gesprächston. Referenziere die bisherigen Antworten ("Du hast erwähnt, dass... - dazu noch eine Frage:")

WAIT for user response
UPDATE $DISCOVERY_STATE
PROCEED to step 4

</step>

<step number="4" name="discovery_round_3">

### Step 4: Discovery Round 3 - Final Gaps (Conditional)

Dritte und letzte Fragenrunde. Nur wenn noch signifikante Lücken bestehen.

<conditional_logic>
  COUNT covered dimensions in $DISCOVERY_STATE

  IF >= 5 of 7 dimensions covered:
    INFORM user: "Ich habe genug Informationen für eine solide Strategie."
    SKIP remaining questions
    ASK only: "Gibt es noch etwas Wichtiges, das ich wissen sollte? Etwas das wir noch nicht besprochen haben?"
    WAIT for response (accept "Nein" / empty as valid)
    PROCEED to step 5

  ELSE (< 5 dimensions covered):
    ASK 2-3 questions from uncovered dimensions, prioritized:

    *Dimension 7 - Abhängigkeiten (oft vergessen):*
    - "Braucht der Agent Zugriff auf externe Services oder APIs?"
    - "Gibt es Zugangsdaten oder Accounts die eingerichtet werden müssen?"

    *Remaining uncovered dimensions:*
    - Pick most critical uncovered questions

    PLUS always ask:
    - "Gibt es noch etwas Wichtiges, das ich wissen sollte?"

    WAIT for user response
    UPDATE $DISCOVERY_STATE
    PROCEED to step 5
</conditional_logic>

</step>

<!-- ═══════════════════════════════════════════════════════════ -->
<!-- PHASE 3: STRATEGY GENERATION                               -->
<!-- ═══════════════════════════════════════════════════════════ -->

<step number="5" name="discovery_summary">

### Step 5: Discovery Summary & Bestätigung

Fasse alle gesammelten Erkenntnisse zusammen und lasse den User bestätigen.

**Zusammenfassung erstellen:**

Präsentiere dem User eine strukturierte Zusammenfassung:

```
## Zusammenfassung deiner Strategie-Anforderungen

**Ziel:** [USER_GOAL in einem Satz]
**Timeline:** [Zeitraum/Deadline]
**Erfolgsmetrik:** [Wie wird Erfolg gemessen]

**Ressourcen:**
- Google Services: [Liste]
- Vorhandene Inhalte: [Was existiert bereits]
- Weitere Tools: [Falls vorhanden]

**Delivery:**
- Kanal: [Telegram/Slack/etc.]
- Benachrichtigungen: [Ja/Nein, wann]

**Automatisierung:**
- Grad: [Vollautomatisch / Human-in-the-Loop]
- Manuelle Schritte: [Falls vorhanden]

**Content/Domain:**
- Tonalität: [Stil]
- Zielgruppe: [Wer]
- Fachwissen: [Relevantes Domain-Wissen]

**Schedule:**
- Frequenz: [Täglich/Wöchentlich/etc.]
- Uhrzeiten: [Bevorzugte Zeiten]
- Timezone: [Timezone]

**Abhängigkeiten:**
- Externe Services: [Liste]
- Noch einzurichten: [Was fehlt noch]
```

**User-Bestätigung:**
ASK: "Ist diese Zusammenfassung korrekt und vollständig? Möchtest du etwas ändern oder ergänzen?"

<conditional_logic>
  IF user confirms:
    PROCEED to step 6
  ELIF user wants changes:
    UPDATE relevant fields based on user feedback
    PRESENT updated summary
    RE-ASK for confirmation
    PROCEED to step 6 when confirmed
</conditional_logic>

</step>

<step number="6" name="strategy_generation">

### Step 6: Strategy Generation - Mapping auf OpenClaw

Nutze das `<openclaw_knowledge>` und die bestätigte Zusammenfassung, um einen konkreten OpenClaw-Umsetzungsplan zu erstellen.

**Mapping-Prozess:**

1. **Project Definition:**
   - Projekt-Name ableiten (kurz, beschreibend)
   - Projekt-Beschreibung (1-2 Sätze)

2. **Agent-Auswahl:**

   <conditional_logic>
     ANALYSE complexity of strategy:

     IF strategy is straightforward (single domain, standard tasks):
       RECOMMEND: "Bestehenden Agent nutzen (main oder private)"
       REASON: "Dein Ziel lässt sich gut mit deinem bestehenden Agent umsetzen. Das Verhalten wird über Task-Prompts und optional Custom Skills gesteuert."

     ELIF strategy requires specialized persona OR complex multi-domain setup:
       RECOMMEND: "Dedizierten Agent erstellen (optional, advanced)"
       REASON: "Für diese Strategie könnte ein dedizierter Agent mit eigener Persona sinnvoll sein, z.B. für konsistente Tonalität oder separaten Kontext."
       PROVIDE: Agent-Name, Persona-Beschreibung, empfohlener Workspace

     DEFAULT: Standard-Empfehlung (bestehender Agent)
   </conditional_logic>

3. **Task Breakdown:**

   Für jedes identifizierte Arbeitspaket:

   a) **One-Time Setup Tasks:**
      - Was muss einmalig eingerichtet werden?
      - Beispiele: Google-Zugriffe konfigurieren, Templates erstellen, Skills installieren
      - Für jeden Task: Name, Beschreibung, konkreter Prompt

   b) **Cron Tasks (Recurring):**
      - Welche wiederkehrenden Aufgaben gibt es?
      - Für jeden Cron-Task:
        - Name und Beschreibung
        - Cron-Expression (aus `<openclaw_knowledge>` Referenz)
        - Timezone
        - Session-Typ (`new` oder `continue`)
        - Delivery-Config (Kanal, Format)
        - Payload/Prompt (der exakte Prompt den der Agent bei jeder Ausführung erhält)

   c) **Permanent/Epic Tasks:**
      - Gibt es langfristige Aufgaben?
      - Falls ja: Name, Beschreibung, Sub-Tasks, Milestones

4. **Custom Skills Empfehlungen:**
   - Welche Skills würden die Strategie verbessern?
   - Für jeden Skill: Name, Zweck, grobe Inhalte
   - Hinweis: "Kann mit `/add-skill` erstellt werden"

5. **Delivery Configuration:**
   - Welche Kanäle werden benötigt?
   - Telegram: Chat-ID, Bot-Setup
   - Slack: Channel, Workspace

6. **Integration Requirements:**
   - Welche Google-Services werden benötigt?
   - Welche externen APIs/Services?
   - Was muss vorab konfiguriert werden?

7. **Timeline & Meilensteine:**
   - Setup-Phase (Tag 1-X)
   - Testphase (mit manueller Validierung)
   - Vollbetrieb
   - Optimierungsphase

8. **Erfolgsmetriken:**
   - Quantitative Metriken (Anzahl, Frequenz, etc.)
   - Qualitative Metriken (Zufriedenheit, Relevanz)
   - Review-Zeitpunkte

STORE complete strategy as $STRATEGY_DATA
PROCEED to step 7

</step>

<!-- ═══════════════════════════════════════════════════════════ -->
<!-- PHASE 4: DOCUMENT OUTPUT                                   -->
<!-- ═══════════════════════════════════════════════════════════ -->

<step number="7" name="document_creation">

### Step 7: Strategy Document Creation

Lade das Template und erstelle das Strategie-Dokument.

<template_lookup>
  PATH: agent-os/templates/openclaw/strategy-document-template.md

  LOOKUP STRATEGY (Hybrid):
    1. TRY: Read from project (agent-os/templates/openclaw/strategy-document-template.md)
    2. IF NOT FOUND: Read from global (~/.agent-os/templates/openclaw/strategy-document-template.md)
    3. IF STILL NOT FOUND: Use inline fallback structure
</template_lookup>

**Document Generation:**

1. Load template
2. Fill all placeholders with $STRATEGY_DATA:
   - Replace `[PLACEHOLDER]` patterns with concrete values
   - Generate cron expressions from schedule requirements
   - Write concrete prompts for each task
   - Create actionable setup checklist

3. Determine output path:
   ```
   $DATE = current date (YYYY-MM-DD)
   $SLUG = goal-slug (lowercase, hyphens, max 50 chars)
   $OUTPUT_DIR = .agent-os/openclaw/strategies/$DATE-$SLUG/
   $OUTPUT_FILE = $OUTPUT_DIR/strategy-document.md
   ```

4. Create directory and write file:
   ```
   mkdir -p $OUTPUT_DIR
   Write strategy document to $OUTPUT_FILE
   ```

PROCEED to step 8

</step>

<step number="8" name="user_review">

### Step 8: User Review & Approval

Präsentiere das fertige Strategie-Dokument und biete Änderungsmöglichkeit.

**Präsentation:**

Zeige dem User:
1. Den Dateipfad des erstellten Dokuments
2. Eine kompakte Übersicht der Strategie:
   - Projekt-Name
   - Anzahl Tasks (aufgeteilt nach Typ)
   - Cron-Schedule Übersicht
   - Delivery-Setup
   - Geschätzte Setup-Zeit
3. Die wichtigsten nächsten Schritte

**User-Review:**
ASK via AskUserQuestion:
  question: "Wie möchtest du fortfahren?"
  header: "Review"
  options:
    - label: "Strategie genehmigen"
      description: "Das Dokument ist gut so. Ich setze es manuell in Mission Control um."
    - label: "Änderungen anfordern"
      description: "Ich möchte bestimmte Teile anpassen bevor ich starte."
    - label: "Nochmal überarbeiten"
      description: "Bitte überarbeite die gesamte Strategie mit folgenden Anpassungen..."

<conditional_logic>
  IF "Strategie genehmigen":
    INFORM user:
      "Deine Strategie wurde gespeichert unter: $OUTPUT_FILE

      Nächste Schritte:
      1. Öffne OpenClaw Mission Control
      2. Erstelle das Projekt '[PROJECT_NAME]'
      3. Folge der Setup-Checklist im Dokument
      4. Erstelle die Tasks mit den dokumentierten Prompts und Configs

      Optional:
      - Erstelle empfohlene Custom Skills mit /add-skill
      - Richte Delivery-Kanäle ein (Telegram/Slack)"

    WORKFLOW COMPLETE

  ELIF "Änderungen anfordern":
    ASK: "Was möchtest du ändern?"
    WAIT for user response
    UPDATE $STRATEGY_DATA with changes
    RE-GENERATE document (return to step 7)
    RE-PRESENT for review

  ELIF "Nochmal überarbeiten":
    ASK: "Was soll anders sein?"
    WAIT for user response
    RETURN to step 6 with updated requirements
</conditional_logic>

</step>

</process_flow>

## Workflow Summary

| Phase | Steps | Beschreibung | Dauer |
|-------|-------|-------------|-------|
| 1. Goal Intake | Step 1 | Ziel erfassen | 1-2 Min |
| 2. Interactive Discovery | Steps 2-4 | Adaptives Q&A (max 3 Runden) | 5-10 Min |
| 3. Strategy Generation | Steps 5-6 | Zusammenfassung + OpenClaw-Mapping | 3-5 Min |
| 4. Document Output | Steps 7-8 | Dokument erstellen + Review | 2-3 Min |
| **Gesamt** | **8 Steps** | **Komplett interaktiv** | **10-20 Min** |

## Quality Criteria

- Alle Cron-Expressions müssen syntaktisch korrekt sein
- Jeder Task muss einen konkreten, ausführbaren Prompt haben
- Delivery-Config muss zum gewählten Kanal passen
- Timeline muss realistisch sein (Setup-Zeit berücksichtigen)
- Mindestens 5 von 7 Discovery-Dimensionen müssen abgedeckt sein
- Das Strategie-Dokument muss ohne weitere Rückfragen umsetzbar sein
