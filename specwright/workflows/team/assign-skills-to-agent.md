---
description: Manually assign skills to specialist agents
version: 1.0
encoding: UTF-8
---

# Assign Skills to Agent Workflow

## Overview

Interactively assign skills to agent files by updating the frontmatter's `skills_project` field.

## Process Flow

<process_flow>

<step number="1" name="list_agents">

### Step 1: List Available Agents

Find all agent files in the project.

<instructions>
  ACTION: Find agent files
    USE: Glob pattern=".claude/agents/*.md"

    IF no agents found:
      ERROR: "No agents found in .claude/agents/"
      SUGGEST: "Create agents first with /create-project-agents"
      EXIT: Workflow

    EXTRACT: Agent names from file names
      ".claude/agents/backend-dev.md" → "backend-dev"
      ".claude/agents/frontend-dev.md" → "frontend-dev"
      ...

    FOR each agent_file:
      READ: File
      EXTRACT: description from frontmatter (if available)

  OUTPUT:
    available_agents: [
      { name: "backend-dev", description: "Backend API development specialist", file: ".claude/agents/backend-dev.md" },
      { name: "frontend-dev", description: "Frontend component specialist", file: ".claude/agents/frontend-dev.md" },
      ...
    ]
</instructions>

</step>

<step number="2" name="select_agent">

### Step 2: Select Agent to Configure

Ask user which agent to configure.

<instructions>
  USE: AskUserQuestion
  QUESTION: "Which agent would you like to configure?"
  HEADER: "Agent Selection"
  MULTI_SELECT: false

  OPTIONS:
    FOR each agent in available_agents:
      - label: "{agent.name}"
        description: "{agent.description}"

  RECEIVE: User selection
    selected_agent = "backend-dev"

  GET: Agent file path
    agent_file_path = ".claude/agents/{selected_agent}.md"

  OUTPUT:
    agent_to_configure: {
      name: "backend-dev",
      file: ".claude/agents/backend-dev.md"
    }
</instructions>

</step>

<step number="3" name="read_current_skills">

### Step 3: Read Current Agent Configuration

Extract currently assigned skills from agent.

<instructions>
  ACTION: Read agent file
    USE: Read tool
    FILE: {agent_file_path}

  ACTION: Parse frontmatter
    EXTRACT: YAML between --- markers
    PARSE: YAML content

    IF skills_project field exists:
      current_skills = skills_project (array)
    ELSE:
      current_skills = []

    IF skills_required field exists:
      base_skills = skills_required (array)
    ELSE:
      base_skills = []

  DISPLAY: Current configuration
    "Current skills for {agent_name}:

    Base Skills (always loaded):
    {FOR each skill in base_skills:
      - {skill}
    }

    Project Skills (currently assigned):
    {FOR each skill in current_skills:
      - {skill}
    }
    {IF current_skills empty:
      (none assigned yet)
    }
    "

  OUTPUT:
    current_config: {
      skills_required: ["testing-best-practices", "security-best-practices"],
      skills_project: ["my-app-api-patterns"]
    }
</instructions>

</step>

<step number="4" name="list_available_skills">

### Step 4: List Available Skills

Find all skills in the project.

<instructions>
  ACTION: Find skill files
    USE: Glob pattern=".claude/skills/*.md"

    IF no skills found:
      WARN: "No skills found in .claude/skills/"
      ASK: "Create skills first with /add-skill?"
      OPTIONS: ["Yes, run /add-skill", "No, cancel"]

      IF "Yes":
        MESSAGE: "Run /add-skill to create project skills"
        EXIT: Workflow

    EXTRACT: Skill names from file names
      ".claude/skills/my-app-api-patterns.md" → "my-app-api-patterns"
      ".claude/skills/custom-validation.md" → "custom-validation"
      ...

    FOR each skill_file:
      READ: File (first 20 lines to get frontmatter)
      EXTRACT: description from frontmatter (if available)

  FILTER: Skills already assigned
    available_for_assignment = skills NOT IN current_skills

  OUTPUT:
    available_skills: [
      { name: "my-app-api-patterns", description: "Spring Boot API patterns", file: "..." },
      { name: "custom-validation", description: "Custom validation rules", file: "..." },
      ...
    ]
</instructions>

</step>

<step number="5" name="select_skills">

### Step 5: Select Skills to Assign

Ask user which skills to assign.

<instructions>
  USE: AskUserQuestion
  QUESTION: "Which skills should {agent_name} load?"
  HEADER: "Skill Assignment"
  MULTI_SELECT: true

  OPTIONS:
    FOR each skill in available_skills:
      - label: "{skill.name}"
        description: "{skill.description}"

  RECEIVE: User selections
    selected_skills = ["my-app-api-patterns", "custom-validation", "database-optimization"]

  IF selected_skills empty:
    MESSAGE: "No skills selected. Agent configuration unchanged."
    EXIT: Workflow

  OUTPUT:
    skills_to_assign: ["my-app-api-patterns", "custom-validation", "database-optimization"]
</instructions>

</step>

<step number="6" name="update_agent">

### Step 6: Update Agent File

Modify agent frontmatter to include selected skills.

<instructions>
  ACTION: Read current agent file
    USE: Read tool
    FILE: {agent_file_path}
    STORE: full_content

  ACTION: Parse frontmatter
    EXTRACT: YAML between first --- and second ---
    PARSE: YAML to object

  ACTION: Update skills_project field
    IF skills_project exists:
      MERGE: selected_skills with existing skills (no duplicates)
      new_skills = current_skills + selected_skills (unique)
    ELSE:
      CREATE: skills_project field
      new_skills = selected_skills

    UPDATE: frontmatter object
      frontmatter.skills_project = new_skills

  ACTION: Reconstruct file
    SERIALIZE: frontmatter to YAML
    COMBINE: "---\n" + frontmatter_yaml + "---\n" + agent_content

    EXAMPLE:
      ```yaml
      ---
      name: backend-dev
      description: my-app backend specialist
      tools: Read, Write, Edit, Bash
      skills_required:
        - testing-best-practices
        - security-best-practices
      skills_project:
        - my-app-api-patterns
        - custom-validation
        - database-optimization
      ---

      # Backend Development Specialist
      [Rest of agent content...]
      ```

  ACTION: Write updated agent file
    USE: Write tool
    FILE: {agent_file_path}
    CONTENT: {updated_content}

  VERIFY: File was written
    USE: Read tool
    FILE: {agent_file_path}
    CHECK: skills_project contains new skills

  OUTPUT:
    updated_agent: {
      name: "backend-dev",
      skills_added: ["custom-validation", "database-optimization"],
      total_skills: 3
    }
</instructions>

</step>

<step number="7" name="display_success">

### Step 7: Display Success Message

Show what was updated and how to use.

<instructions>
  DISPLAY: Success message
    "✅ Skills assigned successfully!

    Updated: .claude/agents/{agent_name}.md

    Skills now assigned to {agent_name}:
    {FOR each skill in new_skills:
      - {skill}
    }

    Total skills: {new_skills.length}

    💡 How it works:

    When {agent_name} is invoked, it will automatically load:
    1. Base skills (testing-best-practices, security-best-practices)
    2. Project skills ({new_skills joined with ', '})

    The agent will use these skills to guide its implementation work.

    🚀 Next Steps:

    1. Enable Team Development System:
       team_system.enabled: true (in specwright/config.yml)

    2. Test the agent:
       /execute-tasks
       → Create a task matching {agent_type} keywords
       → Task will be routed to {agent_name}
       → Agent uses assigned skills

    3. Assign more skills:
       Run /assign-skills-to-agent again
    "

  OPTIONAL:
    USE: AskUserQuestion
    QUESTION: "Configure another agent?"
    OPTIONS: ["Yes", "No, done"]

    IF "Yes":
      RESTART: From step 2 (select different agent)
</instructions>

</step>

</process_flow>

## Error Handling

<error_protocols>
  <invalid_yaml>
    IF frontmatter parsing fails:
      ERROR: "Agent file has invalid YAML frontmatter"
      DISPLAY: Parse error details
      SUGGEST: "Edit {agent_file_path} manually to fix YAML"
      EXIT: Workflow
  </invalid_yaml>

  <file_write_failed>
    IF Write tool fails:
      ERROR: "Failed to update agent file"
      CHECK: File permissions
      SUGGEST: "Check write permissions on .claude/agents/"
      EXIT: Workflow
  </file_write_failed>

  <skill_not_found>
    FOR each selected_skill:
      CHECK: .claude/skills/{skill}.md exists
      IF not found:
        WARN: "Skill {skill}.md not found in .claude/skills/"
        ASK: "Continue anyway or skip this skill?"
        OPTIONS: ["Continue (skill might be created later)", "Skip this skill"]
  </skill_not_found>
</error_protocols>

## Notes

- Skills are loaded in order: base skills → project skills
- Duplicate skills are automatically removed
- Agent content (below frontmatter) is preserved unchanged
- Always creates backup before overwriting
- Skills must exist in `.claude/skills/` to be loaded
