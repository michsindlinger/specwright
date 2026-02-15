# /add-story Workflow - Übersicht

> Workflow Version: 2.0
> Zweck: Neue User Story zu einer bestehenden Spezifikation hinzufügen

## Flowchart

![add-story Workflow](assets/add-story-workflow.png)

## Steps

| Step | Name | Beschreibung | Skill | Agent |
|------|------|-------------|-------|-------|
| **1** | Spec Selection | Spec auswählen (per Parameter oder interaktiv), Kontext laden, Story-ID generieren | — | Main |
| **2** | PO Requirements Dialog | Fachliche Anforderungen erfassen: Was, Warum, Wer, Akzeptanzkriterien, Abhängigkeiten | — | Main |
| **3** | Create Story File | Story-Datei aus Template erstellen, fachliche Felder füllen, technische Sections leer lassen | — | Main |
| **4** | Architect Refinement | Technische Verfeinerung: DoR/DoD, WAS/WIE/WO, Komplexität, Completion Check | architect-refinement | Main |
| **5** | Update Story Index | story-index.md aktualisieren: Tabelle, Dependency Graph, Execution Plan, Totals | — | Main |
| **6** | Kanban Update | Story via MCP Tool zu kanban.json hinzufügen (falls vorhanden) | — | Main (MCP) |
| **7** | Confirmation | Zusammenfassung und nächste Schritte anzeigen | — | Main |

## Human-in-the-Loop Punkte

| Gate | Step | Was passiert? |
|------|------|--------------|
| **Auswahl** | Step 1 | User wählt Ziel-Spec (falls nicht als Parameter übergeben) |
| **Input** | Step 2 | User beschreibt neue Anforderung, beantwortet Rückfragen (Was, Warum, Wer, Akzeptanzkriterien) |
| **Input** | Step 2 | User identifiziert Abhängigkeiten zu bestehenden Stories |
| **Entscheidung** | Step 4 | Falls Story zu groß / passt nicht zur Spec: User entscheidet (Fortfahren, Aufteilen, Neue Spec) |

## Output-Dokumente

| Step | Dokument | Pfad | Beschreibung |
|------|----------|------|-------------|
| 3 + 4 | **story-NNN-slug.md** | `specwright/specs/[spec]/stories/` | Neue Story-Datei (fachlich + technisch) |
| 5 | **story-index.md** (Update) | `specwright/specs/[spec]/story-index.md` | Aktualisierter Story-Index |
| 6 | **kanban.json** (Update) | `specwright/specs/[spec]/kanban.json` | Story zum Kanban-Board hinzugefügt (falls vorhanden) |

## Ablauf im Detail

### Step 1: Spec Selection
- Prüft ob Spec-Name als Parameter übergeben wurde
- Falls nicht: Listet verfügbare Specs und fragt User
- Lädt Spec-Kontext (spec.md, spec-lite.md, story-index.md)
- Ermittelt Story-Prefix (z.B. PROF, AUTH) und nächste Nummer

### Step 2: PO Requirements Dialog
- Zeigt Spec-Zusammenfassung und existierende Stories
- Fragt nach: Was, Warum, Wer, Akzeptanzkriterien
- Identifiziert Abhängigkeiten zu bestehenden Stories
- Bestimmt Story-Typ (Frontend/Backend/DevOps/Test/Integration)

### Step 3: Create Story File
- Generiert Dateiname: `story-NNN-slug.md`
- Lädt Template (hybrid lookup: Projekt -> Global)
- Füllt fachliche Felder (PO-Perspektive)
- Lässt technische Sections bewusst leer

### Step 4: Architect Refinement
- Lädt `architect-refinement` Skill
- Liest existierende Stories für Konsistenz-Check
- Füllt technische Sections: DoR, DoD, WAS/WIE/WO
- Schätzt Komplexität (XS/S/M)
- Warnt bei zu großen Stories oder Scope-Mismatch

### Step 5: Update Story Index
- Fügt Story zur Summary-Tabelle hinzu
- Aktualisiert Dependency Graph
- Ergänzt Execution Plan
- Aktualisiert Totals und Last Updated

### Step 6: Kanban Update
- Prüft ob kanban.json existiert
- Falls ja: Nutzt MCP Tool `kanban_add_item`
  - Validiert Story-ID Uniqueness
  - Aktualisiert boardStatus und Statistics
  - Schreibt changeLog Eintrag
- Falls nein: Hinweis an User

### Step 7: Confirmation
- Zeigt Story-ID, Spec, Datei, Typ, Komplexität, Status
- Empfiehlt nächste Schritte (/add-story, /execute-tasks)

## Abgrenzung zu anderen Workflows

| Situation | Empfohlener Workflow |
|-----------|---------------------|
| Story gehört zu bestehender Spec | **/add-story** |
| Unabhängige Aufgabe ohne Spec | /add-todo |
| Bug-Report | /add-bug |
| Mehrere neue Stories nötig | Spec-Revision prüfen |
| Story ändert Spec-Kernzweck | Diskussion mit User |

## Farbkodierung (Diagramm)

| Farbe | Bedeutung |
|-------|-----------|
| Blau (dunkel) | Main Agent mit Skill (technische Arbeit) |
| Blau (hell) | Automatisierte Prozess-Schritte |
| Orange | User Input / Interaktive Dialoge |
| Rot/Rosa | Entscheidungspunkte / Prüfungen |
| Grün | Output-Dokumente |
| Gelb | Warnungen |
| Lila | Info / MCP-Aufrufe |
