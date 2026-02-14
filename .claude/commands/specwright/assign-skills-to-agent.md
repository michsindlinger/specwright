# Assign Skills to Agent

Manually assign skills to specialist agents.

Refer to the instructions located in @specwright/workflows/team/assign-skills-to-agent.md

## Command Arguments

No arguments required - interactive selection via prompts.

## Usage

```bash
/assign-skills-to-agent
```

## What This Does

1. Lists all available agents in `.claude/agents/`
2. Asks which agent to configure
3. Lists all available skills in `.claude/skills/`
4. Asks which skills to assign (multi-select)
5. Updates agent's frontmatter with selected skills
6. Preserves existing agent configuration

## Output

Updates agent file in `.claude/agents/` with assigned skills in frontmatter:

```yaml
---
name: backend-dev
skills_project:
  - my-app-api-patterns
  - custom-validation-rules
  - database-optimization-patterns
---
```

## Features

- **Interactive Selection**: Choose agent and skills via prompts
- **Multi-Select**: Assign multiple skills at once
- **Preserves Config**: Keeps existing agent content intact
- **Validates Skills**: Checks that skill files exist
- **Shows Current**: Displays currently assigned skills

## Use Cases

- Assign custom skills to agents
- Add additional skills beyond auto-loaded ones
- Override auto-loading behavior
- Share skills across multiple agents

## Notes

- Auto-assignment via naming convention still works
- Manual assignment is additive (adds to skills_project)
- Skills are loaded in order: base skills → project skills
- Agent files must exist (create with `/create-project-agents` first)
