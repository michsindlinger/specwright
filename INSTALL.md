# Specwright Installation Guide

Complete installation guide for Specwright with DevTeam System.

---

## 📋 Installation Overview

Specwright installation happens in **3 steps**:

```
1. Global Standards (Optional) → ~/.specwright/standards/
2. Project Base           → specwright/ in your project
3. Claude Code Setup      → .claude/ in your project
```

---

## 🚀 Quick Start

### For a New Project:

```bash
# Step 1: Global DevTeam Standards (Optional - Recommended)
curl -sSL https://raw.githubusercontent.com/michsindlinger/specwright/main/setup-devteam-global.sh | bash

# Step 2: Project Base Installation
cd your-project/
curl -sSL https://raw.githubusercontent.com/michsindlinger/specwright/main/setup.sh | bash

# Step 3: Claude Code Setup
curl -sSL https://raw.githubusercontent.com/michsindlinger/specwright/main/setup-claude-code.sh | bash
```

---

## 📦 Detailed Installation Steps

### Step 1: Global DevTeam Standards (Optional)

**Purpose:** Install global coding standards that serve as fallback for all projects.

**Location:** `~/.specwright/standards/`

**What it installs:**
- `code-style.md` - Universal code style guidelines
- `best-practices.md` - Universal development best practices
- `code-style/javascript-style.md` - JavaScript/TypeScript guidelines
- `code-style/css-style.md` - CSS/TailwindCSS guidelines
- `code-style/html-style.md` - HTML guidelines

**Installation:**
```bash
curl -sSL https://raw.githubusercontent.com/michsindlinger/specwright/main/setup-devteam-global.sh | bash
```

**When to skip:** If you always want project-specific standards (you'll generate them in /plan-product)

---

### Step 2: Project Base Installation

**Purpose:** Install Specwright core structure in your project.

**Location:** `specwright/` in your project directory

**What it installs:**
- **Standards** (6 files): code-style.md, best-practices.md, code-style/*
- **Templates** (53 files):
  - Product templates (6)
  - Agent templates (7)
  - Skill templates (30)
  - Documentation templates (10)
- **Workflows** (30+ files): All command workflows
- **Profiles** (Phase II): Java, React, Angular profiles
- **Skills** (Phase II): Base skills for different tech stacks
- `config.yml` - Configuration file
- `CLAUDE.md` - Project instructions template

**Installation:**
```bash
cd your-project/
curl -sSL https://raw.githubusercontent.com/michsindlinger/specwright/main/setup.sh | bash
```

**After installation:**
1. Customize `CLAUDE.md` with your project-specific information
2. Review `specwright/config.yml` and set your profile

---

### Step 3: Claude Code Setup

**Purpose:** Install Claude Code-specific commands and agents.

**Location:** `.claude/` in your project directory

**What it installs:**
- **Commands** (30+ files): All slash commands like /create-spec, /execute-tasks, etc.
- **Agents** (13 files):
  - Utility agents: test-runner, context-fetcher, git-workflow, file-creator, date-checker
  - Specialist agents: product-strategist, market-researcher, content-creator, seo-specialist, web-developer, validation-specialist, business-analyst, estimation-specialist
- **Skills symlinks** (18): Symlinks to specwright/skills/

**Installation:**
```bash
# Must run AFTER Step 2
curl -sSL https://raw.githubusercontent.com/michsindlinger/specwright/main/setup-claude-code.sh | bash
```

**Available commands after installation:**
- `/plan-product` - Plan your product roadmap
- `/build-development-team` - Set up DevTeam skills
- `/create-spec` - Create feature specifications
- `/add-bug` - Add bug with root-cause analysis
- `/add-todo` - Add lightweight task to backlog
- `/execute-tasks` - Execute development tasks
- And 15+ more commands...

---

## 🎯 Complete DevTeam Workflow

### 1. Plan Product

```bash
# In your project directory
/plan-product
```

**What happens:**
- Creates product-brief.md
- Generates tech-stack.md
- Creates roadmap.md
- **Step 5.5:** Asks "Generate project-specific standards?"
  - **Yes:** Creates .specwright/standards/code-style.md (tech-stack aware)
  - **No:** Uses global ~/.specwright/standards/code-style.md

**Output:**
- `.specwright/product/product-brief.md`
- `.specwright/product/product-brief-lite.md`
- `.specwright/product/tech-stack.md`
- `.specwright/product/roadmap.md`
- `.specwright/product/architecture-decision.md`
- `.specwright/standards/` (if generated)

---

### 2. Build Development Team

```bash
/build-development-team
```

**What happens:**
- Creates dev-team__architect agent
- Creates dev-team__po agent
- Asks which agents you need (backend, frontend, devops, qa)
- Creates multi-instances (1-3) for backend/frontend
- Creates dev-team__documenter agent
- Generates tech-stack-specific skills for each agent
- Creates dod.md and dor.md

**Output:**
- `.claude/agents/dev-team/*.md` (7 agents)
- `.claude/skills/dev-team/**/*.md` (project-specific skills)
- `.specwright/team/dod.md`
- `.specwright/team/dor.md`

---

### 3. Create Spec

```bash
/create-spec
```

**What happens:**
- dev-team__po gathers fachliche requirements
- Creates spec.md, spec-lite.md, user-stories.md
- dev-team__architect does technical refinement
- Adds WAS/WIE/WO/WER to each story
- Defines DoR/DoD
- Identifies dependencies

**Output:**
- `.specwright/specs/YYYY-MM-DD-feature-name/spec.md`
- `.specwright/specs/YYYY-MM-DD-feature-name/spec-lite.md`
- `.specwright/specs/YYYY-MM-DD-feature-name/user-stories.md`
- `.specwright/specs/YYYY-MM-DD-feature-name/sub-specs/cross-cutting-decisions.md` (optional)

---

### 4. Execute Tasks

```bash
/execute-tasks
```

**What happens:**
- Claude Code loads Orchestration Skill
- Creates kanban-board.md (or loads existing)
- Selects story from Backlog
- Delegates to appropriate dev-team agent
- Enforces quality gates (Architect Review → QA Testing)
- Generates documentation per story
- Commits per story
- Loops until all stories done

**Output:**
- `.specwright/specs/[spec-name]/kanban-board.md` (execution state)
- `.specwright/specs/[spec-name]/handover-docs/*.md` (for dependencies)
- `CHANGELOG.md` entries
- Code implementation
- Pull Request

---

### 5. Add Bug (During Development)

```bash
/add-bug feature-name "Login fails with special characters"
```

**What happens:**
- dev-team__po gathers bug details
- dev-team__architect analyzes (if complex)
- Bug story added to user-stories.md
- Bug added to kanban-board.md Backlog
- Option to fix immediately or later

---

## 📁 File Structure After Installation

```
your-project/
├── CLAUDE.md                      # Project instructions (customize!)
├── specwright/
│   ├── config.yml                 # Configuration
│   ├── standards/
│   │   ├── code-style.md          # Project standards (or uses global)
│   │   ├── best-practices.md      # Project practices (or uses global)
│   │   └── code-style/
│   │       ├── javascript-style.md
│   │       ├── css-style.md
│   │       └── html-style.md
│   ├── workflows/
│   │   ├── core/                  # 30+ workflow files
│   │   ├── meta/                  # Meta workflows
│   │   ├── research/              # Research workflows
│   │   └── verification/          # Verification workflows
│   ├── templates/
│   │   ├── product/               # 6 product templates
│   │   ├── agents/dev-team/       # 7 agent templates
│   │   ├── skills/dev-team/       # 30 skill templates
│   │   ├── skills/orchestration/  # 1 orchestration template
│   │   └── docs/                  # 10 doc templates
│   ├── profiles/                  # Tech-stack profiles
│   └── skills/                    # Base skills
├── .claude/
│   ├── commands/specwright/         # 30+ slash commands
│   ├── agents/                    # Utility agents
│   └── skills/                    # Symlinks to specwright/skills/
└── .specwright/                     # Created during usage
    ├── product/                   # Product planning output
    ├── team/                      # DevTeam config (dod.md, dor.md)
    └── specs/                     # Feature specs

~/.specwright/                       # Global (optional)
└── standards/                     # Global fallback standards
    ├── code-style.md
    ├── best-practices.md
    └── code-style/
        ├── javascript-style.md
        ├── css-style.md
        └── html-style.md
```

---

## 🔄 Typical Workflow

### First Time Setup

```bash
# 1. Install global standards (optional)
curl -sSL https://raw.githubusercontent.com/michsindlinger/specwright/main/setup-devteam-global.sh | bash

# 2. Create new project
mkdir my-awesome-app && cd my-awesome-app
git init

# 3. Install Specwright
curl -sSL https://raw.githubusercontent.com/michsindlinger/specwright/main/setup.sh | bash

# 4. Install Claude Code
curl -sSL https://raw.githubusercontent.com/michsindlinger/specwright/main/setup-claude-code.sh | bash

# 5. Customize CLAUDE.md
nano CLAUDE.md  # Add your project details

# 6. Plan your product
/plan-product
# → Answer questions
# → Choose: Generate project standards? (yes/no)
# → Output: product-brief.md, tech-stack.md, roadmap.md, etc.

# 7. Build DevTeam
/build-development-team
# → Select agents needed
# → DevTeam created with skills

# 8. Create your first feature
/create-spec
# → dev-team__po gathers requirements
# → dev-team__architect does technical refinement
# → Output: user-stories.md with DoR/DoD

# 9. Execute!
/execute-tasks
# → Claude Code orchestrates DevTeam
# → Stories executed one by one
# → Quality gates enforced
# → Documentation generated
# → PR created
```

---

## 🛠 Troubleshooting

### "Specwright base installation not found"

**Problem:** Running Claude Code setup before base installation.

**Solution:**
```bash
curl -sSL .../setup.sh | bash
# Then run setup-claude-code.sh again
```

---

### "tech-stack.md not found" during /build-development-team

**Problem:** DevTeam setup requires tech-stack.md

**Solution:**
```bash
/plan-product  # Creates tech-stack.md
# Then run /build-development-team again
```

---

### Global vs Project Standards Confusion

**How it works:**
1. Agent checks: `.specwright/standards/code-style.md` (project)
2. If not found, uses: `~/.specwright/standards/code-style.md` (global)

**Create project standards:**
```bash
/plan-product
# → When asked "Generate project standards?", choose YES
```

**Use global standards:**
```bash
/plan-product
# → When asked "Generate project standards?", choose NO
```

---

## 🔑 Key Concepts

### Hybrid Standards System

- **Global:** `~/.specwright/standards/` - Fallback for all projects
- **Project:** `.specwright/standards/` - Optional project-specific override
- **Lookup:** Project first, then global fallback

### DevTeam System

- **Templates:** specwright/templates/ - Generic templates
- **Agents:** .claude/agents/dev-team/ - Project-specific agents created from templates
- **Skills:** .claude/skills/dev-team/ - Project-specific skills created from templates
- **Orchestrator:** Claude Code + Orchestration Skill = Smart delegation

### Execution State

- **user-stories.md** - Source of truth for requirements
- **kanban-board.md** - Execution state (resumable!)
- **handover-docs/** - Context between dependent stories
- **Per-story commits** - Atomic git history

---

## 📚 What Gets Installed Where

| Component | Location | Installed By | Purpose |
|-----------|----------|--------------|---------|
| Global Standards | ~/.specwright/standards/ | setup-devteam-global.sh | Fallback standards |
| Project Templates | specwright/templates/ | setup.sh | Template library |
| Project Workflows | specwright/workflows/ | setup.sh | Command workflows |
| Project Standards | specwright/standards/ | setup.sh | Default standards |
| Claude Commands | .claude/commands/ | setup-claude-code.sh | Slash commands |
| Claude Agents | .claude/agents/ | setup-claude-code.sh | Utility agents |
| DevTeam Agents | .claude/agents/dev-team/ | /build-development-team | Specialist agents |
| DevTeam Skills | .claude/skills/dev-team/ | /build-development-team | Specialist skills |

---

## ✅ Verification

### After Global Standards Installation:

```bash
ls ~/.specwright/standards/
# Should show: code-style.md, best-practices.md, code-style/
```

### After Project Base Installation:

```bash
ls specwright/
# Should show: standards/, workflows/, templates/, profiles/, skills/, config.yml

ls specwright/templates/
# Should show: product/, agents/, skills/, docs/
```

### After Claude Code Setup:

```bash
ls .claude/
# Should show: commands/, agents/, skills/

ls .claude/commands/specwright/ | wc -l
# Should show: ~30+ commands
```

### After /build-development-team:

```bash
ls .claude/agents/dev-team/
# Should show: architect.md, po.md, backend-developer-*.md, etc.

ls .claude/skills/dev-team/
# Should show: PROJECT-architect-pattern-enforcement.md, etc.

ls .specwright/team/
# Should show: dod.md, dor.md
```

---

## 🔄 Update Existing Installation

### Update to Latest Version:

```bash
cd your-project/

# Update workflows (overwrite)
curl -sSL .../setup.sh | bash --overwrite-workflows

# Update standards (overwrite)
curl -sSL .../setup.sh | bash --overwrite-standards

# Update both
curl -sSL .../setup.sh | bash --overwrite-workflows --overwrite-standards

# Update Claude Code commands
curl -sSL .../setup-claude-code.sh | bash
```

---

## 🎓 Learning Path

### Day 1: Setup & Planning
1. Install Specwright (3 scripts)
2. Run `/plan-product`
3. Review generated files

### Day 2: Build Team
1. Run `/build-development-team`
2. Explore created agents in `.claude/agents/dev-team/`
3. Review dod.md and dor.md

### Day 3: First Feature
1. Run `/create-spec`
2. Review user-stories.md
3. Understand DoR/DoD

### Day 4: Execute
1. Run `/execute-tasks`
2. Watch orchestrator in action
3. See kanban-board.md updates

### Day 5: Iterate
1. Add bugs with `/add-bug`
2. Continue execution
3. Review generated docs and commits

---

## 📖 Next Steps

After installation:

1. **Read:** `CLAUDE.md` - Understand the system
2. **Customize:** `CLAUDE.md` with your project specifics
3. **Configure:** `specwright/config.yml` with your preferences
4. **Plan:** Run `/plan-product` to start
5. **Build:** Run `/build-development-team` to create your team
6. **Develop:** Use `/create-spec` and `/execute-tasks`

---

## 🆘 Support

- **Issues:** https://github.com/michsindlinger/specwright/issues
- **Workflow Diagram:** See `specwright-workflow-complete.md`
- **Documentation:** See `.specwright/` directories after running commands

---

## 📜 Version History

- **v2.1** - DevTeam System with Orchestrator, Kanban, Quality Gates
- **v2.0** - Profiles, Skills, Research, Verification
- **v1.x** - Basic workflows and standards

---

**Happy building with Specwright + DevTeam! 🚀**
