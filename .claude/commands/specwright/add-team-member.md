# Add Team Member

Interaktiv ein Custom Team Member (Einzelperson oder Team) als Skill erstellen.

Refer to the instructions located in specwright/workflows/team/add-team-member.md

## Command Arguments

Keine Argumente erforderlich - der Workflow ist vollständig interaktiv.

## Usage Examples

```bash
# Interaktiv (empfohlen)
/add-team-member
```

## Output

```
.claude/skills/{team-member-name}/
├── SKILL.md          # Skill mit teamType/teamName Frontmatter
├── dos-and-donts.md  # Lernjournal (initial leer)
└── [templates...]    # Optional: Dokumenten-Templates
```

**Beispiel:** /add-team-member → Dialog: "Steuerberater", "individual"
```
.claude/skills/steuerberater/
├── SKILL.md          # teamType: individual, teamName: Steuerberater
└── dos-and-donts.md
```

## Features

- **Interaktiv**: Führt durch alle Schritte mit AskUserQuestion
- **Zwei Typen**: Einzelperson (individual) oder Team (team)
- **Erweitertes Frontmatter**: `teamType` und `teamName` im YAML-Header
- **Lernjournal**: Automatische dos-and-donts.md Erstellung
- **Dokumenten-Templates**: Optionale Template-Dateien im Skill-Ordner
- **Duplikat-Erkennung**: Warnt bei bereits existierenden Skill-Namen
