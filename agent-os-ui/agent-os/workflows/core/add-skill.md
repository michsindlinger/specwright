# Add Skill Command

Interaktiv einen neuen Custom Skill im Anthropic Folder Format anlegen.

## Übersicht

Erstellt einen neuen Skill in der flachen Struktur (Claude Code Limitation - keine verschachtelten Ordner):
```
.claude/skills/{skill-name}/SKILL.md
```

**Wichtig:** Claude Code unterstützt KEINE verschachtelten Ordner in `.claude/skills/`.
Alle Skills müssen direkt in `.claude/skills/` liegen.

## Argumente

```
/add-skill [skill-name] [--category <category>] [--agent <agent-name>]
```

- `skill-name`: Optional - Name des Skills (wird sonst interaktiv abgefragt)
- `--category`: Optional - Kategorie/Ordner (default: interaktiv)
- `--agent`: Optional - Agent dem der Skill zugewiesen wird

## Workflow

### Step 1: Skill-Name erfragen

<instructions>
IF skill-name argument provided:
  USE: Provided skill name
  NORMALIZE: lowercase, hyphens statt spaces/underscores
ELSE:
  USE: AskUserQuestion
  QUESTION: "Wie soll der Skill heißen?"
  HEADER: "Skill Name"
  OPTIONS:
    - label: "Eigenen Namen eingeben"
      description: "z.B. 'api-error-handling', 'form-validation'"

  RECEIVE: User input
  NORMALIZE: lowercase, hyphens, keine Sonderzeichen

VALIDATE:
  IF skill_name is empty: ERROR "Skill-Name ist erforderlich"
  IF skill_name contains invalid chars: WARN and clean

OUTPUT: skill_name (z.B. "my-custom-skill")
</instructions>

### Step 2: DevTeam-Agent Zuordnung prüfen

<instructions>
USE: AskUserQuestion
QUESTION: "Gehört dieser Skill zu einem DevTeam-Agent?"
HEADER: "Agent-Zuordnung"
OPTIONS:
  - label: "Ja, zu einem Agent (Recommended)"
    description: "Skill wird mit Agent-Präfix angelegt und dem Agent zugewiesen"
  - label: "Nein, projektweiter Skill"
    description: "Skill wird direkt in .claude/skills/ angelegt"

IF "Ja, zu einem Agent" selected:
  GOTO: Step 2a (Agent auswählen)
ELSE:
  SET: is_agent_skill = false
  SET: agent_role = null
  GOTO: Step 4 (Beschreibung - keine Kategorie mehr nötig)
</instructions>

### Step 2a: Agent auswählen

<instructions>
SCAN: .claude/agents/ directory for available agents

EXTRACT: Agent list from files
  FOR each .md file in .claude/agents/:
    READ: YAML frontmatter
    EXTRACT: name, description

FILTER: Only show dev-team related agents (backend-dev, frontend-dev, qa-specialist, etc.)

KNOWN_AGENT_PREFIXES:
  backend-dev        → backend
  frontend-dev       → frontend
  qa-specialist      → qa
  tech-architect     → architect
  devops-specialist  → devops
  documenter         → documenter
  po                 → po

USE: AskUserQuestion
QUESTION: "Zu welchem Agent soll der Skill gehören?"
HEADER: "Agent"
OPTIONS: (dynamically generated from scan, max 4)
  - label: "{agent_name}"
    description: "{agent_description}"
  ... (for each found agent)

RECEIVE: selected_agent

MAP: agent_name to prefix using KNOWN_AGENT_PREFIXES
  IF agent contains "backend" → agent_prefix = "backend"
  IF agent contains "frontend" → agent_prefix = "frontend"
  IF agent contains "qa" → agent_prefix = "qa"
  IF agent contains "architect" → agent_prefix = "architect"
  IF agent contains "devops" → agent_prefix = "devops"
  IF agent contains "documenter" → agent_prefix = "documenter"
  IF agent contains "po" → agent_prefix = "po"
  ELSE → agent_prefix = agent_name (use as-is)

SET: is_agent_skill = true
SET: selected_agent_file = path to agent .md file
SET: full_skill_name = "{agent_prefix}-{skill_name}"
SET: skill_path = ".claude/skills/{full_skill_name}/SKILL.md"

NOTE: Skills are flat in .claude/skills/ - Claude Code does NOT support nested directories!

GOTO: Step 4 (Beschreibung)
</instructions>

### Step 3: Skill-Pfad für Project-Skills (DEPRECATED)

<instructions>
NOTE: Step 3 ist nicht mehr erforderlich!

Claude Code unterstützt KEINE verschachtelten Ordner in .claude/skills/
Alle Skills werden direkt in .claude/skills/{skill_name}/ angelegt.

IF is_agent_skill == false:
  SET: skill_path = ".claude/skills/{skill_name}/SKILL.md"

GOTO: Step 4 (Beschreibung)
</instructions>

### Step 4: Beschreibung erfragen

<instructions>
USE: AskUserQuestion
QUESTION: "Kurze Beschreibung des Skills (1-2 Sätze):"
HEADER: "Beschreibung"
OPTIONS:
  - label: "Beschreibung eingeben"
    description: "Was macht dieser Skill? Wann wird er aktiviert?"

RECEIVE: description

OUTPUT: description
</instructions>

### Step 5: Datei-Trigger (Globs) erfragen

<instructions>
USE: AskUserQuestion
QUESTION: "Für welche Dateien soll der Skill automatisch aktiviert werden?"
HEADER: "File Globs"
multiSelect: true
OPTIONS:
  - label: "TypeScript/JavaScript"
    description: "**/*.ts, **/*.tsx, **/*.js, **/*.jsx"
  - label: "React Components"
    description: "**/*.tsx, **/*.jsx"
  - label: "Ruby/Rails"
    description: "**/*.rb, **/*.erb"
  - label: "Keine Auto-Aktivierung"
    description: "Skill wird nur manuell oder über Agent geladen"

RECEIVE: glob_selections

MAP selections to actual globs:
  "TypeScript/JavaScript" → ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"]
  "React Components" → ["**/*.tsx", "**/*.jsx"]
  "Ruby/Rails" → ["**/*.rb", "**/*.erb"]
  "Keine Auto-Aktivierung" → []

IF user selects "Other":
  ASK: "Gib die Glob-Patterns ein (kommasepariert):"
  PARSE: User input as array

OUTPUT: globs (z.B. ["**/*.ts", "**/*.tsx"])
</instructions>

### Step 6: Template auswählen

<instructions>
USE: AskUserQuestion
QUESTION: "Welches Template möchtest du verwenden?"
HEADER: "Template"
OPTIONS:
  - label: "Standard (Recommended)"
    description: "Alle Sektionen: Purpose, Capabilities, Best Practices, Examples"
  - label: "Minimal"
    description: "Nur Basics: Purpose, When to Activate, Key Points"
  - label: "Pattern-focused"
    description: "Code-Patterns fokussiert mit vielen Beispielen"

OUTPUT: template_type
</instructions>

### Step 7: Skill-Datei generieren

<instructions>
CONSTRUCT: skill_path (already set in Step 2a or Step 3)

CREATE: Directory
  USE: Bash
  COMMAND: mkdir -p "$(dirname "{skill_path}")"

PREPARE: globs_yaml_lines (convert array to YAML format)
  IF globs is empty OR globs == []:
    SET: globs_yaml_lines = ""  # Empty, no glob lines
  ELSE:
    CONVERT: globs array to YAML array format
    FOR EACH glob in globs:
      PREFIX with "- " and newline
      INDENT with 2 spaces
    EXAMPLE: ["**/*.ts", "**/*.tsx"] → "- **/*.ts\n  - **/*.tsx"

GENERATE: SKILL.md content based on template_type

IF template_type == "Standard":
  content = """---
name: {skill_name}
description: {description}
globs:
{globs_yaml_lines}
---

# {Skill Name Title Case}

> {description}

## Wann aktivieren

Dieser Skill wird aktiviert wenn:
- [Bedingung 1]
- [Bedingung 2]

## Kernfähigkeiten

### 1. [Fähigkeit]

[Beschreibung]

**Konkrete Aktionen:**
- [Aktion 1]
- [Aktion 2]

### 2. [Fähigkeit]

[Beschreibung]

## Best Practices

### [Kategorie]

- **[Practice 1]:** [Details]
- **[Practice 2]:** [Details]

### Anti-Patterns vermeiden

- ❌ [Anti-Pattern] - [Warum vermeiden]

## Beispiele

### Beispiel 1: [Name]

**Kontext:** [Wann verwenden]

```typescript
// Beispiel-Code
```

### Beispiel 2: [Name]

**Kontext:** [Wann verwenden]

```typescript
// Beispiel-Code
```

## Checkliste

- [ ] [Check 1]
- [ ] [Check 2]
- [ ] [Check 3]

## Verwandte Skills

- **[Skill 1]** - [Beziehung]
- **[Skill 2]** - [Beziehung]
"""

ELSE IF template_type == "Minimal":
  content = """---
name: {skill_name}
description: {description}
globs:
{globs_yaml_lines}
---

# {Skill Name Title Case}

> {description}

## Wann aktivieren

- [Bedingung 1]
- [Bedingung 2]

## Wichtige Punkte

1. **[Punkt 1]:** [Details]
2. **[Punkt 2]:** [Details]
3. **[Punkt 3]:** [Details]

## Beispiel

```typescript
// Beispiel-Code
```
"""

ELSE IF template_type == "Pattern-focused":
  content = """---
name: {skill_name}
description: {description}
globs:
{globs_yaml_lines}
---

# {Skill Name Title Case}

> {description}

## Pattern-Übersicht

| Pattern | Anwendung | Priorität |
|---------|-----------|-----------|
| [Pattern 1] | [Wann] | Hoch |
| [Pattern 2] | [Wann] | Mittel |

## Pattern 1: [Name]

### Beschreibung
[Was macht dieses Pattern]

### Code-Beispiel

```typescript
// Gutes Beispiel
```

### Anti-Pattern

```typescript
// ❌ Nicht so
```

## Pattern 2: [Name]

### Beschreibung
[Was macht dieses Pattern]

### Code-Beispiel

```typescript
// Gutes Beispiel
```

## Checkliste

- [ ] Pattern 1 angewendet
- [ ] Pattern 2 angewendet
- [ ] Keine Anti-Patterns
"""

WRITE: skill_path with content
</instructions>

### Step 8: Agent aktualisieren (nur für Agent-Skills)

<instructions>
IF is_agent_skill == false:
  SKIP: This step

READ: selected_agent_file (z.B. .claude/agents/backend-dev.md)

PARSE: YAML frontmatter

UPDATE: Add skill to appropriate list

  IF frontmatter contains "skills_project":
    APPEND: skill_name to skills_project array
  ELSE IF frontmatter contains "skills_required":
    APPEND: skill_name to skills_required array
  ELSE:
    ADD: new field "skills_project: [skill_name]"

WRITE: Updated agent file

EXAMPLE:
  Before:
    ---
    name: backend-dev
    skills_project:
      - api-patterns
    ---

  After:
    ---
    name: backend-dev
    skills_project:
      - api-patterns
      - {skill_name}
    ---

OUTPUT: agent_updated = true
</instructions>

### Step 9: Erfolg anzeigen

<instructions>
DISPLAY:
  "✅ Skill erfolgreich erstellt!

  📁 Pfad: {skill_path}
  📝 Name: {skill_name}
  🎯 Globs: {globs}
  "

IF is_agent_skill:
  APPEND TO DISPLAY:
  "
  🤖 Agent: {selected_agent}
  ✅ Agent aktualisiert: Skill wurde zu {selected_agent_file} hinzugefügt
  "

APPEND TO DISPLAY:
  "
  📋 Nächste Schritte:

  1. Öffne die Datei und passe die [PLACEHOLDER] an:
     {skill_path}

  2. Der Skill wird automatisch aktiviert für:
     {glob_list}
  "

IF is_agent_skill:
  APPEND:
  "
  3. Der Agent '{selected_agent}' lädt den Skill automatisch
  "

OFFER:
  USE: AskUserQuestion
  QUESTION: "Was möchtest du als nächstes tun?"
  OPTIONS:
    - label: "Skill-Datei öffnen"
      description: "SKILL.md im Editor anzeigen"
    - label: "Weiteren Skill erstellen"
      description: "/add-skill erneut ausführen"
    - label: "Fertig"
      description: "Workflow beenden"

IF "Skill-Datei öffnen":
  READ: skill_path
  DISPLAY: Content

IF "Weiteren Skill erstellen":
  RESTART: Workflow from Step 1
</instructions>

## Beispiel-Aufrufe

```bash
# Interaktiv (empfohlen)
/add-skill

# Mit Skill-Name
/add-skill api-error-handling

# Direkt einem Agent zuweisen
/add-skill form-validation --agent backend-dev
```

## Output

**WICHTIG:** Claude Code unterstützt keine verschachtelten Ordner in `.claude/skills/`!

### Für Agent-Skills:
```
.claude/skills/{agent-prefix}-{skill-name}/
└── SKILL.md

Beispiel: /add-skill form-validation --agent backend-dev
→ .claude/skills/backend-form-validation/SKILL.md

.claude/agents/{agent-name}.md (aktualisiert mit neuem Skill)
```

### Für Project-Skills:
```
.claude/skills/{skill-name}/
└── SKILL.md

Beispiel: /add-skill my-custom-skill
→ .claude/skills/my-custom-skill/SKILL.md
```

## Agent-Prefix Mappings

| Agent Name | Skill-Präfix |
|------------|--------------|
| backend-dev | backend |
| frontend-dev | frontend |
| qa-specialist | qa |
| tech-architect | architect |
| devops-specialist | devops |
| documenter | documenter |
| po | po |
