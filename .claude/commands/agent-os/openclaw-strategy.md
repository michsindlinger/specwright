---
description: Interaktiver Strategieberater - verwandelt vage Ziele in konkrete OpenClaw-Umsetzungspläne mit Mission Control Konfiguration
---

# OpenClaw Strategy

Interaktiver Strategieberater: Verwandelt ein vages Ziel in einen konkreten OpenClaw-Umsetzungsplan mit Mission Control Konfiguration, Tasks, Cron-Jobs und Delivery-Setup.

Refer to the instructions located in @agent-os/workflows/openclaw/openclaw-strategy.md

{{#if args}}
Verwende folgendes Ziel als Ausgangspunkt: {{args}}
{{else}}
Starte den interaktiven Discovery-Prozess, um das Ziel des Users zu erfassen.
{{/if}}

**Version**: 1.0

**Features:**
- Interaktives Goal Intake mit optionalem Argument
- Adaptives Discovery-System (7 Dimensionen, max 3 Q&A Runden)
- Automatisches Mapping auf OpenClaw-Primitives (Tasks, Crons, Skills)
- Mission Control Project Setup Empfehlung
- Konkrete Cron-Expressions mit Timezone und Delivery-Config
- Agent-Auswahl (Standard: bestehende Agents, optional: dedizierter Agent)
- Strategie-Dokument als Markdown-Datei

**Deliverables:**
- Strategy Document (`.agent-os/openclaw/strategies/[YYYY-MM-DD]-[goal-slug]/strategy-document.md`)
  - Executive Summary
  - Mission Control Project Setup
  - Agent-Auswahl & Required Skills
  - Task Breakdown (One-Time, Cron, Permanent)
  - Delivery Configuration
  - Integration Requirements
  - Timeline & Milestones
  - Success Metrics
  - Setup Checklist

**Workflow Phasen:**
1. **Goal Intake** (Step 1): Ziel erfassen oder aus Argument übernehmen
2. **Interactive Discovery** (Steps 2-4): Adaptives Fragensystem, max 3 Runden
3. **Strategy Generation** (Steps 5-6): Zusammenfassung + Mapping auf OpenClaw-Primitives
4. **Document Output** (Steps 7-8): Dokument erstellen und User-Review

**Timeline:**
- Komplett interaktiv: 10-20 Minuten
- Output: 1 Strategie-Dokument mit konkretem Umsetzungsplan

**Usage:**
```bash
# Interaktiv (empfohlen)
/openclaw-strategy

# Mit Ziel als Argument
/openclaw-strategy "15 Instagram Posts in 30 Tagen automatisch erstellen"

# Weitere Beispiele
/openclaw-strategy "Tägliche News-Zusammenfassung per Telegram"
/openclaw-strategy "Wöchentlicher SEO-Report mit Keyword-Tracking"
/openclaw-strategy "Automatisierte Lead-Generierung über LinkedIn"
```

**Example Flow:**
1. User beschreibt vages Ziel (z.B. "Instagram Content automatisieren")
2. Discovery Round 1: Zielklärung + Ressourcen (2-3 Fragen)
3. Discovery Round 2: Kanal-Strategie + Automatisierungsgrad (2-3 Follow-ups)
4. Discovery Round 3: Offene Fragen + "Gibt es noch etwas?" (conditional)
5. Zusammenfassung aller Erkenntnisse → User-Bestätigung
6. Mapping auf OpenClaw: Tasks, Cron-Jobs, Skills, Delivery
7. Strategie-Dokument wird erstellt und gespeichert
8. User-Review: Genehmigen oder Änderungen anfordern

**Integration:**
- Output kann direkt in OpenClaw Mission Control übernommen werden
- Cron-Expressions sind copy-paste-ready
- Custom Skills Empfehlungen können mit `/add-skill` erstellt werden
