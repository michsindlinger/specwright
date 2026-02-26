---
description: Interaktiv ein Custom Team Member (Einzelperson oder Team) als Skill erstellen
version: 1.0
encoding: UTF-8
---

# Add Team Member Workflow

## Overview

Erstellt ein benutzerdefiniertes Teammitglied (Einzelperson oder Team) als Skill im Anthropic Folder Format.
Der Workflow generiert einen Skill-Ordner mit erweitertem Frontmatter (`teamType`, `teamName`) und einer leeren `dos-and-donts.md`.

**Output:**
```
.claude/skills/{skill-name}/
├── SKILL.md          # Skill mit teamType/teamName Frontmatter
└── dos-and-donts.md  # Lernjournal (initial leer)
```

**Wichtig:** Claude Code unterstützt KEINE verschachtelten Ordner in `.claude/skills/`.
Alle Skills müssen direkt in `.claude/skills/` liegen (flache Struktur).

## Process Flow

<process_flow>

<step number="1" name="ask_name">

### Step 1: Name erfragen

<instructions>
  USE: AskUserQuestion
  QUESTION: "Wie soll das Teammitglied heißen?"
  HEADER: "Name"
  OPTIONS:
    - label: "Eigenen Namen eingeben"
      description: "z.B. 'Steuerberater', 'Marketing Team', 'Rechtsanwalt'"

  RECEIVE: User input
  SET: team_member_name = user input (original, mit Groß/Kleinschreibung)

  NORMALIZE for folder name:
    - Lowercase
    - Spaces und Underscores durch Hyphens ersetzen
    - Sonderzeichen und Umlaute entfernen (ä→ae, ö→oe, ü→ue, ß→ss)
    - Führende/Trailing Hyphens entfernen
    - Mehrfache Hyphens zu einem reduzieren

  SET: skill_folder_name = normalized name (z.B. "steuerberater", "marketing-team")

  VALIDATE:
    IF skill_folder_name is empty:
      ERROR: "Name ist erforderlich"

    CHECK: Does .claude/skills/{skill_folder_name}/ already exist?
    ```bash
    ls .claude/skills/{skill_folder_name}/SKILL.md 2>/dev/null
    ```

    IF exists:
      USE: AskUserQuestion
      QUESTION: "Ein Skill mit dem Namen '{skill_folder_name}' existiert bereits. Was möchtest du tun?"
      HEADER: "Konflikt"
      OPTIONS:
        - label: "Anderen Namen wählen"
          description: "Neuen Namen eingeben"
        - label: "Abbrechen"
          description: "Workflow beenden"

      IF "Anderen Namen wählen":
        GOTO: Step 1 (restart)
      ELSE:
        EXIT: Workflow

  OUTPUT: team_member_name, skill_folder_name
</instructions>

</step>

<step number="2" name="ask_type">

### Step 2: Typ erfragen

<instructions>
  USE: AskUserQuestion
  QUESTION: "Welcher Typ ist '{team_member_name}'?"
  HEADER: "Typ"
  OPTIONS:
    - label: "Einzelperson (Recommended)"
      description: "Ein individueller Experte (z.B. Steuerberater, Rechtsanwalt, Designer)"
    - label: "Team"
      description: "Eine Gruppe mit bestimmter Funktion (z.B. Marketing Team, Sales Team)"

  RECEIVE: User selection

  IF "Einzelperson":
    SET: team_type = "individual"
  ELSE IF "Team":
    SET: team_type = "team"

  OUTPUT: team_type
</instructions>

</step>

<step number="3" name="ask_role">

### Step 3: Rolle und Expertise erfragen

<instructions>
  USE: AskUserQuestion
  QUESTION: "Beschreibe die Rolle und Kernaufgaben von '{team_member_name}' (1-2 Sätze):"
  HEADER: "Rolle"
  OPTIONS:
    - label: "Rolle beschreiben"
      description: "z.B. 'Berät zu steuerlichen Themen, erstellt Steuererklärungen und prüft Belege'"

  RECEIVE: User input
  SET: role_description = user input

  OUTPUT: role_description
</instructions>

</step>

<step number="4" name="ask_knowledge">

### Step 4: Wissensgebiete erfragen

<instructions>
  USE: AskUserQuestion
  QUESTION: "Welche Wissensgebiete hat '{team_member_name}'? (Komma-separiert)"
  HEADER: "Wissen"
  OPTIONS:
    - label: "Wissensgebiete eingeben"
      description: "z.B. 'Einkommensteuer, Umsatzsteuer, Buchhaltung, Jahresabschluss'"

  RECEIVE: User input
  PARSE: Comma-separated list into array
  SET: knowledge_areas = parsed array

  OUTPUT: knowledge_areas
</instructions>

</step>

<step number="5" name="ask_behavior">

### Step 5: Verhaltensregeln erfragen

<instructions>
  USE: AskUserQuestion
  QUESTION: "Gibt es besondere Verhaltensregeln oder Kommunikationsstil-Vorgaben?"
  HEADER: "Verhalten"
  OPTIONS:
    - label: "Ja, Regeln definieren"
      description: "z.B. 'Immer auf deutsche Gesetze verweisen, Fachbegriffe erklären, konservativ beraten'"
    - label: "Nein, Standard-Verhalten"
      description: "Keine besonderen Regeln"

  IF "Ja, Regeln definieren":
    RECEIVE: User input
    SET: behavior_rules = user input
  ELSE:
    SET: behavior_rules = null

  OUTPUT: behavior_rules
</instructions>

</step>

<step number="6" name="ask_templates">

### Step 6: Dokumenten-Templates erfragen (Optional)

<instructions>
  USE: AskUserQuestion
  QUESTION: "Soll '{team_member_name}' Dokumenten-Templates mitbringen?"
  HEADER: "Templates"
  OPTIONS:
    - label: "Nein, keine Templates (Recommended)"
      description: "Skill wird ohne Templates erstellt"
    - label: "Ja, Templates definieren"
      description: "Template-Dateien im Skill-Ordner erstellen"

  IF "Ja, Templates definieren":
    USE: AskUserQuestion
    QUESTION: "Welche Templates sollen erstellt werden? (Ein Template pro Zeile, Format: dateiname.md - Beschreibung)"
    HEADER: "Template-Liste"
    OPTIONS:
      - label: "Templates eingeben"
        description: "z.B. 'brief-vorlage.md - Formeller Briefentwurf' oder 'checkliste.md - Prüfliste'"

    RECEIVE: User input
    PARSE: Each line as template entry
      FOR EACH line:
        SPLIT on " - " (first part = filename, second part = description)
        IF no description: description = filename without extension
    SET: templates = parsed array of {filename, description}
  ELSE:
    SET: templates = []

  OUTPUT: templates
</instructions>

</step>

<step number="7" name="ask_globs">

### Step 7: Datei-Trigger (Globs) erfragen

<instructions>
  USE: AskUserQuestion
  QUESTION: "Soll der Skill automatisch bei bestimmten Dateien aktiviert werden?"
  HEADER: "Aktivierung"
  OPTIONS:
    - label: "Keine Auto-Aktivierung (Recommended)"
      description: "Skill wird nur manuell oder als user-invocable Skill geladen"
    - label: "Bei bestimmten Dateitypen"
      description: "z.B. bei .md Dateien, .ts Dateien etc."

  IF "Bei bestimmten Dateitypen":
    USE: AskUserQuestion
    QUESTION: "Für welche Dateien? (Komma-separierte Glob-Patterns)"
    HEADER: "Globs"
    OPTIONS:
      - label: "Glob-Patterns eingeben"
        description: "z.B. '**/*.md' oder '**/*.ts, **/*.tsx'"

    RECEIVE: User input
    PARSE: Comma-separated list into array
    TRIM: Whitespace from each glob
    SET: globs = parsed array
  ELSE:
    SET: globs = []

  OUTPUT: globs
</instructions>

</step>

<step number="8" name="generate_skill">

### Step 8: Skill-Dateien generieren

<instructions>
  ACTION: Create skill directory
    ```bash
    mkdir -p ".claude/skills/{skill_folder_name}"
    ```

  ACTION: Prepare globs YAML
    IF globs is empty:
      SET: globs_yaml = "globs: []"
    ELSE:
      SET: globs_yaml = "globs:\n" + (FOR EACH glob: "  - \"{glob}\"\n")

  ACTION: Prepare knowledge list
    SET: knowledge_list = ""
    FOR EACH area in knowledge_areas:
      knowledge_list += "- {area.trim()}\n"

  ACTION: Prepare behavior section
    IF behavior_rules is not null:
      SET: behavior_section = """
## Verhaltensregeln

{behavior_rules}
"""
    ELSE:
      SET: behavior_section = ""

  ACTION: Prepare template references
    IF templates is not empty:
      SET: template_section = """
## Dokumenten-Templates

| Template | Beschreibung |
|----------|--------------|
"""
      FOR EACH template in templates:
        template_section += "| [{template.filename}](./{template.filename}) | {template.description} |\n"

      template_section += """

### Verwendung

Die Templates können als Vorlage für neue Dokumente verwendet werden.
Kopiere das gewünschte Template und passe es an den konkreten Anwendungsfall an.
"""
    ELSE:
      SET: template_section = ""

  ACTION: Generate SKILL.md
    WRITE: .claude/skills/{skill_folder_name}/SKILL.md

    content = """---
description: {role_description}
{globs_yaml}
alwaysApply: false
teamType: {team_type}
teamName: {team_member_name}
---

# {team_member_name}

> {role_description}

## Wissensgebiete

{knowledge_list}
{behavior_section}
## Kernfähigkeiten

### 1. [Fähigkeit anpassen]

[Beschreibung der ersten Kernfähigkeit]

**Konkrete Aktionen:**
- [Aktion 1]
- [Aktion 2]

### 2. [Fähigkeit anpassen]

[Beschreibung der zweiten Kernfähigkeit]

**Konkrete Aktionen:**
- [Aktion 1]
- [Aktion 2]
{template_section}
## Checkliste

- [ ] Wissensgebiete vervollständigt
- [ ] Kernfähigkeiten angepasst
- [ ] Verhaltensregeln geprüft
"""

  WRITE: SKILL.md to disk

  ACTION: Generate dos-and-donts.md
    WRITE: .claude/skills/{skill_folder_name}/dos-and-donts.md

    content = """# Dos and Don'ts - {team_member_name}

> Lernjournal: Erkenntnisse aus der Zusammenarbeit mit {team_member_name}.
> Wird automatisch aktualisiert wenn neue Learnings entstehen.

## Dos

_Noch keine Einträge._

## Don'ts

_Noch keine Einträge._

## Gotchas

_Noch keine Einträge._
"""

  WRITE: dos-and-donts.md to disk

  ACTION: Generate template files (if any)
    IF templates is not empty:
      FOR EACH template in templates:
        WRITE: .claude/skills/{skill_folder_name}/{template.filename}

        content = """# {template.description}

> Template erstellt für: {team_member_name}
> Anpassen und verwenden nach Bedarf.

---

[Template-Inhalt hier einfügen]
"""

        WRITE: template file to disk

  OUTPUT: All files created
</instructions>

</step>

<step number="9" name="verify_creation">

### Step 9: Erstellung verifizieren

<instructions>
  VERIFY: All required files exist

  ```bash
  # Verify SKILL.md exists
  test -f ".claude/skills/{skill_folder_name}/SKILL.md" && echo "SKILL.md OK" || echo "SKILL.md MISSING"

  # Verify dos-and-donts.md exists
  test -f ".claude/skills/{skill_folder_name}/dos-and-donts.md" && echo "dos-and-donts.md OK" || echo "dos-and-donts.md MISSING"

  # Verify SKILL.md contains teamType
  grep -q "teamType:" ".claude/skills/{skill_folder_name}/SKILL.md" && echo "teamType OK" || echo "teamType MISSING"

  # Verify SKILL.md contains teamName
  grep -q "teamName:" ".claude/skills/{skill_folder_name}/SKILL.md" && echo "teamName OK" || echo "teamName MISSING"
  ```

  IF any verification fails:
    ERROR: "Erstellung fehlgeschlagen - fehlende Dateien"
    ATTEMPT: Regeneration of missing files

  VERIFY: Template files (if any)
    IF templates is not empty:
      FOR EACH template in templates:
        ```bash
        test -f ".claude/skills/{skill_folder_name}/{template.filename}" && echo "{template.filename} OK" || echo "{template.filename} MISSING"
        ```

  OUTPUT: All verifications passed
</instructions>

</step>

<step number="10" name="display_success">

### Step 10: Erfolg anzeigen

<instructions>
  DISPLAY:
    """
    ## Teammitglied erstellt!

    | Eigenschaft | Wert |
    |-------------|------|
    | **Name** | {team_member_name} |
    | **Typ** | {team_type} |
    | **Ordner** | .claude/skills/{skill_folder_name}/ |
    | **Dateien** | SKILL.md, dos-and-donts.md{IF templates: , {template_count} Templates} |

    ### Erstellte Dateien

    ```
    .claude/skills/{skill_folder_name}/
    ├── SKILL.md
    ├── dos-and-donts.md
    {FOR EACH template: └── {template.filename}\n}
    ```

    ### Nächste Schritte

    1. **SKILL.md anpassen:** Öffne die Datei und vervollständige die Kernfähigkeiten
    2. **Testen:** Nutze den Skill in einem Chat-Gespräch
    3. **Lernen:** dos-and-donts.md wird automatisch mit Learnings aktualisiert
    """

  USE: AskUserQuestion
  QUESTION: "Was möchtest du als nächstes tun?"
  HEADER: "Nächster Schritt"
  OPTIONS:
    - label: "SKILL.md anzeigen"
      description: "Generierte Skill-Datei im Editor anzeigen"
    - label: "Weiteres Teammitglied erstellen"
      description: "/add-team-member erneut ausführen"
    - label: "Fertig"
      description: "Workflow beenden"

  IF "SKILL.md anzeigen":
    READ: .claude/skills/{skill_folder_name}/SKILL.md
    DISPLAY: Content

  IF "Weiteres Teammitglied erstellen":
    RESTART: Workflow from Step 1
</instructions>

</step>

</process_flow>

## Error Handling

<error_protocols>
  <name_conflict>
    IF skill folder already exists:
      INFORM: User about existing skill
      OFFER: Choose different name or abort
  </name_conflict>

  <invalid_name>
    IF normalized name is empty after sanitization:
      ERROR: "Der Name konnte nicht in einen gültigen Ordner-Namen umgewandelt werden"
      ASK: For a different name
  </invalid_name>

  <file_write_failed>
    IF file write fails:
      ERROR: "Datei konnte nicht geschrieben werden: {error}"
      CHECK: Directory permissions
      SUGGEST: Manual creation
  </file_write_failed>
</error_protocols>

## Beispiel-Aufruf

```bash
# Interaktiv (empfohlen)
/add-team-member

# Ergebnis nach Dialog:
.claude/skills/steuerberater/
├── SKILL.md          # teamType: individual, teamName: Steuerberater
└── dos-and-donts.md  # Leer, wird mit Learnings gefüllt
```

## SKILL.md Beispiel-Output

```yaml
---
description: Berät zu steuerlichen Themen, erstellt Steuererklärungen und prüft Belege
globs: []
alwaysApply: false
teamType: individual
teamName: Steuerberater
---
```
