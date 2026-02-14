# Create Project Agents

Create project-specific specialist agents from global templates.

Refer to the instructions located in @specwright/workflows/team/create-project-agents.md

## Command Arguments

No arguments required - interactive selection via prompts.

## Usage

```bash
/create-project-agents
```

## What This Does

1. Asks which specialist agents you need (backend, frontend, qa, devops)
2. Detects your tech stack (framework, language, database, etc.)
3. Creates customized agents from templates
4. Saves to `.claude/agents/` in your project
5. Sets up skill auto-loading with naming conventions

## Output

Creates agent files in `.claude/agents/`:
- `backend-dev.md` - Backend API development specialist
- `frontend-dev.md` - Frontend component development specialist
- `qa-specialist.md` - Testing and quality assurance specialist
- `devops-specialist.md` - CI/CD and deployment specialist

## Features

- **Interactive Selection**: Choose only the agents you need
- **Auto-Detection**: Detects your tech stack automatically
- **Template-Based**: Uses proven agent structures
- **Skill Integration**: Pre-configured with skill naming conventions
- **Customizable**: All [CUSTOMIZE] sections filled with your stack

## Notes

- Requires global Team Development System installation
- Agents will automatically look for project skills via naming convention
- Example: backend-dev looks for `[project-name]-api-patterns` skill
- Create matching skills with `/add-skill`
- Assign additional skills with `/assign-skills-to-agent`
