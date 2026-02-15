# OpenClaw Strategy Document

<!--
This template is used by the openclaw-strategy workflow to generate
a concrete implementation plan for OpenClaw Mission Control.
All [PLACEHOLDER] values are filled by the workflow.
-->

> Created: [CREATED_DATE]
> Goal: [USER_GOAL]
> Status: Draft

---

## Executive Summary

**Ziel:** [GOAL_SUMMARY]
**Timeline:** [TIMELINE_SUMMARY]
**Automatisierungsgrad:** [AUTOMATION_LEVEL]
**Geschätzte Setup-Zeit:** [SETUP_DURATION]

---

## Mission Control Project Setup

**Projekt-Name:** [PROJECT_NAME]
**Beschreibung:** [PROJECT_DESCRIPTION]

### Projekt-Struktur
```
[PROJECT_NAME]/
├── One-Time Tasks ([ONE_TIME_COUNT])
├── Cron Tasks ([CRON_COUNT])
└── Permanent/Epic Tasks ([EPIC_COUNT])
```

---

## Agent-Auswahl

**Empfehlung:** [AGENT_RECOMMENDATION]

<!-- Standard: Bestehender Agent -->
[TODO: Eine der folgenden Optionen ausfüllen]

### Option A: Bestehender Agent (Standard)
- **Agent:** [AGENT_NAME] (main/private)
- **Verhalten über:** Task-Prompts + Custom Skills
- **Vorteil:** Kein Setup-Overhead, sofort einsatzbereit

### Option B: Dedizierter Agent (Advanced)
- **Agent-Name:** [DEDICATED_AGENT_NAME]
- **Persona:** [AGENT_PERSONA_DESCRIPTION]
- **Workspace:** [AGENT_WORKSPACE]
- **Wann sinnvoll:** Spezialisierte Tonalität, separater Kontext, Multi-Agent-Strategien

---

## Required Skills

| Skill-Name | Zweck | Priorität | Erstellen mit |
|------------|-------|-----------|---------------|
| [SKILL_NAME] | [SKILL_PURPOSE] | [HIGH/MEDIUM/LOW] | `/add-skill` |
| [SKILL_NAME] | [SKILL_PURPOSE] | [HIGH/MEDIUM/LOW] | `/add-skill` |

---

## Task Breakdown

### One-Time Setup Tasks

[TODO: Für jeden Setup-Task ausfüllen]

#### Task: [SETUP_TASK_NAME]
- **Typ:** One-Time
- **Beschreibung:** [SETUP_TASK_DESCRIPTION]
- **Prompt:**
```
[SETUP_TASK_PROMPT]
```
- **Abhängigkeiten:** [DEPENDENCIES]
- **Erwartetes Ergebnis:** [EXPECTED_OUTPUT]

---

### Recurring Cron Jobs

[TODO: Für jeden Cron-Job ausfüllen]

#### Cron: [CRON_TASK_NAME]
- **Typ:** Cron
- **Beschreibung:** [CRON_TASK_DESCRIPTION]
- **Schedule:** `[CRON_EXPRESSION]` ([HUMAN_READABLE_SCHEDULE])
- **Timezone:** [TIMEZONE]
- **Session:** [SESSION_TYPE] (`new` oder `continue`)
- **Delivery:**
  - Kanal: [DELIVERY_CHANNEL]
  - Format: [DELIVERY_FORMAT]
  - Config: [DELIVERY_CONFIG]
- **Prompt/Payload:**
```
[CRON_TASK_PROMPT]
```
- **Erwartetes Ergebnis pro Ausführung:** [EXPECTED_OUTPUT_PER_RUN]

---

### Permanent/Epic Tasks

[TODO: Falls vorhanden, sonst Abschnitt entfernen]

#### Epic: [EPIC_TASK_NAME]
- **Typ:** Epic
- **Beschreibung:** [EPIC_TASK_DESCRIPTION]
- **Sub-Tasks:**
  1. [SUB_TASK_1]
  2. [SUB_TASK_2]
- **Milestones:** [EPIC_MILESTONES]

---

## Delivery Configuration

### [DELIVERY_CHANNEL_NAME]

| Eigenschaft | Wert |
|------------|------|
| Kanal-Typ | [CHANNEL_TYPE] |
| Ziel | [CHANNEL_TARGET] |
| Format | [MESSAGE_FORMAT] |
| Setup benötigt | [SETUP_REQUIRED] |

**Setup-Anleitung:**
[DELIVERY_SETUP_INSTRUCTIONS]

---

## Integration Requirements

### Google Services

| Service | Benötigt | Zweck | Status |
|---------|----------|-------|--------|
| Gmail | [JA/NEIN] | [PURPOSE] | [ ] Eingerichtet |
| Google Calendar | [JA/NEIN] | [PURPOSE] | [ ] Eingerichtet |
| Google Drive | [JA/NEIN] | [PURPOSE] | [ ] Eingerichtet |
| Google Contacts | [JA/NEIN] | [PURPOSE] | [ ] Eingerichtet |
| Google Docs | [JA/NEIN] | [PURPOSE] | [ ] Eingerichtet |
| Google Sheets | [JA/NEIN] | [PURPOSE] | [ ] Eingerichtet |
| Google Tasks | [JA/NEIN] | [PURPOSE] | [ ] Eingerichtet |

### Externe Services

| Service | Zweck | Zugang vorhanden |
|---------|-------|-----------------|
| [SERVICE_NAME] | [PURPOSE] | [JA/NEIN] |

---

## Timeline & Milestones

### Phase 1: Foundation (Tag 1-[X])
- [ ] Projekt in Mission Control erstellen
- [ ] Agent konfigurieren (Skills, Persona)
- [ ] Google-Integrationen einrichten
- [ ] Delivery-Kanal(e) konfigurieren
- [ ] [ADDITIONAL_SETUP_STEPS]

### Phase 2: Task-Erstellung (Tag [X]-[Y])
- [ ] One-Time Setup Tasks erstellen und ausführen
- [ ] Cron-Jobs erstellen (noch pausiert)
- [ ] Prompts testen (manuelle Ausführung)
- [ ] [ADDITIONAL_TASK_STEPS]

### Phase 3: Validierung (Tag [Y]-[Z])
- [ ] Cron-Jobs einzeln aktivieren
- [ ] Erste Ergebnisse prüfen
- [ ] Prompts bei Bedarf optimieren
- [ ] Delivery-Format validieren
- [ ] [ADDITIONAL_VALIDATION_STEPS]

### Phase 4: Vollbetrieb & Optimierung (ab Tag [Z])
- [ ] Alle Cron-Jobs aktiv
- [ ] Monitoring einrichten (Fehler-Benachrichtigungen)
- [ ] Wöchentliches Review der Ergebnisse
- [ ] Prompt-Optimierung basierend auf Erfahrung
- [ ] [ADDITIONAL_OPTIMIZATION_STEPS]

---

## Success Metrics

| Metrik | Ziel | Messung | Review-Zeitpunkt |
|--------|------|---------|-----------------|
| [METRIC_NAME] | [TARGET_VALUE] | [HOW_TO_MEASURE] | [REVIEW_FREQUENCY] |
| [METRIC_NAME] | [TARGET_VALUE] | [HOW_TO_MEASURE] | [REVIEW_FREQUENCY] |

**Review-Zeitpunkte:**
- Nach 1 Woche: Erster Check - läuft alles technisch?
- Nach 2 Wochen: Qualitäts-Check - stimmen die Ergebnisse?
- Nach 1 Monat: Vollständiges Review - Metriken erreicht?

---

## Setup Checklist

### Schritt 1: Foundation
- [ ] OpenClaw Mission Control öffnen
- [ ] Projekt "[PROJECT_NAME]" erstellen
- [ ] Projekt-Beschreibung eintragen
- [ ] Agent auswählen/konfigurieren

### Schritt 2: Tasks erstellen
- [ ] One-Time Tasks anlegen (siehe Abschnitt oben)
- [ ] Cron-Jobs anlegen mit dokumentierten Expressions
- [ ] Delivery pro Task konfigurieren
- [ ] Prompts aus diesem Dokument kopieren

### Schritt 3: Validierung
- [ ] Jeden Task einmal manuell ausführen
- [ ] Ergebnisse prüfen und Prompts anpassen
- [ ] Delivery testen (Nachricht kommt an?)
- [ ] Cron-Jobs aktivieren

### Schritt 4: Optimierung
- [ ] Ergebnisse nach 1 Woche reviewen
- [ ] Prompts bei Bedarf verfeinern
- [ ] Schedule anpassen falls nötig
- [ ] Erfolgsmetriken tracken

---

## Beispiel: Instagram Content Automation

> Dieses Beispiel zeigt wie eine typische Strategie aussehen kann.

**Ziel:** 15 Instagram Posts in 30 Tagen automatisch erstellen

**Cron-Job Beispiel:**
```
Name: Instagram Post Generator
Schedule: 0 9 * * 1,3,5 (Mo/Mi/Fr um 09:00)
Timezone: Europe/Berlin
Session: new
Delivery: Telegram (zur Freigabe vor Posting)
Prompt: |
  Erstelle einen Instagram-Post zum Thema [NISCHE].
  Zielgruppe: [ZIELGRUPPE].
  Tonalität: [STIL].

  Output:
  1. Caption (max 2200 Zeichen, mit Hashtags)
  2. Bild-Beschreibung für Bildgenerierung
  3. Beste Posting-Zeit heute

  Nutze aktuelle Trends und saisonale Themen.
```

**Setup-Tasks:**
1. Content-Kalender in Google Sheets erstellen (One-Time)
2. Hashtag-Recherche für Nische durchführen (One-Time)
3. Tonalität-Guide als Custom Skill erstellen (One-Time)

---

*Generiert mit OpenClaw Strategy Workflow v1.0*
