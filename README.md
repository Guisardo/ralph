# Ralph

![Ralph](ralph.webp)

Ralph is an autonomous AI agent loop that runs AI coding tools ([Amp](https://ampcode.com) or [Claude Code](https://docs.anthropic.com/en/docs/claude-code)) repeatedly until all PRD items are complete. Each iteration is a fresh instance with clean context. Memory persists via git history, `progress.txt`, and `prd.json`.

Based on [Geoffrey Huntley's Ralph pattern](https://ghuntley.com/ralph/).

[Read my in-depth article on how I use Ralph](https://x.com/ryancarson/status/2008548371712135632)

## Prerequisites

- One of the following AI coding tools installed and authenticated:
  - [Amp CLI](https://ampcode.com) (default)
  - [Claude Code](https://docs.anthropic.com/en/docs/claude-code) (`npm install -g @anthropic-ai/claude-code`)
- `jq` installed (`brew install jq` on macOS)
- A git repository for your project

## Setup

### Option 1: Copy to your project

Copy the ralph files into your project:

```bash
# From your project root
mkdir -p scripts/ralph
cp /path/to/ralph/ralph.sh scripts/ralph/

# Copy the prompt template for your AI tool of choice:
cp /path/to/ralph/prompt.md scripts/ralph/prompt.md    # For Amp
# OR
cp /path/to/ralph/CLAUDE.md scripts/ralph/CLAUDE.md    # For Claude Code

chmod +x scripts/ralph/ralph.sh
```

### Option 2: Install skills globally

Copy the skills to your Amp or Claude config for use across all projects:

For AMP
```bash
cp -r skills/prd ~/.config/amp/skills/
cp -r skills/ralph ~/.config/amp/skills/
```

For Claude Code
```bash
cp -r skills/prd ~/.claude/skills/
cp -r skills/ralph ~/.claude/skills/
```

### Configure Amp auto-handoff (recommended)

Add to `~/.config/amp/settings.json`:

```json
{
  "amp.experimental.autoHandoff": { "context": 90 }
}
```

This enables automatic handoff when context fills up, allowing Ralph to handle large stories that exceed a single context window.

## Workflow

### 1. Create a PRD

Use the PRD skill to generate a detailed requirements document:

```
Load the prd skill and create a PRD for [your feature description]
```

Answer the clarifying questions. The skill saves output to `tasks/prd-[feature-name].md`.

### 2. Convert PRD to Ralph format

Use the Ralph skill to convert the markdown PRD to JSON:

```
Load the ralph skill and convert tasks/prd-[feature-name].md to prd.json
```

This creates `prd.json` with user stories structured for autonomous execution.

### 3. Run Ralph

```bash
# Using Amp (default)
./scripts/ralph/ralph.sh [max_iterations]

# Using Claude Code
./scripts/ralph/ralph.sh --tool claude [max_iterations]
```

Default is 10 iterations. Use `--tool amp` or `--tool claude` to select your AI coding tool.

Ralph will:
1. Create a feature branch (from PRD `branchName`)
2. Pick the highest priority story where `passes: false`
3. Implement that single story
4. Run quality checks (typecheck, tests)
5. Commit if checks pass
6. Update `prd.json` to mark story as `passes: true`
7. Append learnings to `progress.txt`
8. Repeat until all stories pass or max iterations reached

## Reasoning Levels

Ralph supports per-story model selection via the `reasoningLevel` field in prd.json:

### Model Mapping

| Reasoning Level | Claude Model | Use Case |
|----------------|--------------|----------|
| `HIGH` | Opus 4.5 | Complex algorithms, architectural decisions, refactoring |
| `MID` | Sonnet 4.5 | Standard features, CRUD operations, typical UI (default) |
| `LOW` | Haiku 4.0 | Simple changes, config updates, trivial UI updates |

### Setting Reasoning Levels

When using the `/ralph` skill to convert a PRD to prd.json, it will guide you in choosing appropriate reasoning levels for each story. **The `reasoningLevel` field is REQUIRED for all user stories.**

**Cost optimization tip:** Opus is ~15x more expensive than Haiku and ~3x more expensive than Sonnet. Use HIGH sparingly for genuinely complex work.

### Example

```json
{
  "id": "US-001",
  "title": "Add status column to database",
  "description": "As a developer, I need to store task status.",
  "acceptanceCriteria": ["Add status enum column with default 'pending'"],
  "priority": 1,
  "passes": false,
  "notes": "",
  "jiraKey": null,
  "reasoningLevel": "LOW"
}
```

## Key Files

| File | Purpose |
|------|---------|
| `ralph.sh` | The bash loop that spawns fresh AI instances (supports `--tool amp` or `--tool claude`) |
| `prompt.md` | Prompt template for Amp |
| `CLAUDE.md` | Prompt template for Claude Code |
| `prd.json` | User stories with `passes` status (the task list) |
| `prd.json.example` | Example PRD format for reference |
| `progress.txt` | Append-only learnings for future iterations |
| `skills/prd/` | Skill for generating PRDs |
| `skills/ralph/` | Skill for converting PRDs to JSON |
| `skills/sync-jira/` | Skill for pushing PRDs to Jira (creates epic and story tickets) |
| `skills/cancel-jira/` | Skill for cancelling all Jira tickets when abandoning a PRD |
| `flowchart/` | Interactive visualization of how Ralph works |
| `mcp_servers.json.example` | Example MCP configuration for Jira integration |
| `.ralph/jira.json.example` | Example per-project Jira configuration template |
| `.ralph/jira.json` | Per-project Jira settings (copy from example, not tracked) |

## Flowchart

[![Ralph Flowchart](ralph-flowchart.png)](https://snarktank.github.io/ralph/)

**[View Interactive Flowchart](https://snarktank.github.io/ralph/)** - Click through to see each step with animations.

The `flowchart/` directory contains the source code. To run locally:

```bash
cd flowchart
npm install
npm run dev
```

## Critical Concepts

### Each Iteration = Fresh Context

Each iteration spawns a **new AI instance** (Amp or Claude Code) with clean context. The only memory between iterations is:
- Git history (commits from previous iterations)
- `progress.txt` (learnings and context)
- `prd.json` (which stories are done)

### Small Tasks

Each PRD item should be small enough to complete in one context window. If a task is too big, the LLM runs out of context before finishing and produces poor code.

Right-sized stories:
- Add a database column and migration
- Add a UI component to an existing page
- Update a server action with new logic
- Add a filter dropdown to a list

Too big (split these):
- "Build the entire dashboard"
- "Add authentication"
- "Refactor the API"

### AGENTS.md Updates Are Critical

After each iteration, Ralph updates the relevant `AGENTS.md` files with learnings. This is key because AI coding tools automatically read these files, so future iterations (and future human developers) benefit from discovered patterns, gotchas, and conventions.

Examples of what to add to AGENTS.md:
- Patterns discovered ("this codebase uses X for Y")
- Gotchas ("do not forget to update Z when changing W")
- Useful context ("the settings panel is in component X")

### Feedback Loops

Ralph only works if there are feedback loops:
- Typecheck catches type errors
- Tests verify behavior
- CI must stay green (broken code compounds across iterations)

### Browser Verification for UI Stories

Frontend stories must include "Verify in browser using Selenium MCP" in acceptance criteria. Ralph will use Selenium MCP tools to navigate to the page, interact with the UI, and confirm changes work. Available Selenium MCP tools include:
- `mcp__selenium__start_browser` - Launch Chrome or Firefox
- `mcp__selenium__navigate` - Navigate to URLs
- `mcp__selenium__find_element` / `mcp__selenium__click_element` / `mcp__selenium__send_keys` - Interact with elements
- `mcp__selenium__take_screenshot` - Capture visual verification
- `mcp__selenium__close_session` - Clean up browser session

### Stop Condition

When all stories have `passes: true`, Ralph outputs `<promise>COMPLETE</promise>` and the loop exits.

## Debugging

Check current state:

```bash
# See which stories are done
cat prd.json | jq '.userStories[] | {id, title, passes}'

# See learnings from previous iterations
cat progress.txt

# Check git history
git log --oneline -10
```

## Customizing the Prompt

After copying `prompt.md` (for Amp) or `CLAUDE.md` (for Claude Code) to your project, customize it for your project:
- Add project-specific quality check commands
- Include codebase conventions
- Add common gotchas for your stack

## Archiving

Ralph automatically archives previous runs when you start a new feature (different `branchName`). Archives are saved to `archive/YYYY-MM-DD-feature-name/`.

## Jira Integration (Optional)

Ralph can optionally sync PRDs to Atlassian Jira, creating epics and tickets that update in real-time as stories are completed. This requires the Atlassian MCP server.

### Prerequisites for Jira Integration

- [Atlassian MCP Server](https://www.npmjs.com/package/@anthropic/mcp-server-atlassian) configured
- Jira Cloud instance with API access
- Atlassian API token with required permissions

### Step 1: Install the Atlassian MCP Server

Install the Atlassian MCP server globally:

```bash
npm install -g @anthropic/mcp-server-atlassian
```

### Step 2: Configure MCP Server in Claude Code

Add the Atlassian MCP server to your Claude Code MCP configuration at `~/.claude/mcp_servers.json`:

```json
{
  "mcpServers": {
    "atlassian": {
      "command": "mcp-server-atlassian",
      "env": {
        "ATLASSIAN_SITE_URL": "https://your-domain.atlassian.net",
        "ATLASSIAN_USER_EMAIL": "your-email@example.com",
        "ATLASSIAN_API_TOKEN": "your-api-token"
      }
    }
  }
}
```

**Important**: Credentials are stored in `~/.claude/` (your home directory), not in the repository. Never commit API tokens to version control.

### Step 3: Generate Atlassian API Token

1. Go to [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Click "Create API token"
3. Give it a descriptive label (e.g., "Ralph Claude Code Integration")
4. Copy the token and add it to your MCP configuration

### Required Jira Permissions

Your Atlassian account needs these permissions in the target Jira project:

| Permission | Purpose |
|------------|---------|
| **Create Issues** | Create epics and story tickets from PRDs |
| **Transition Issues** | Move tickets between statuses (In Progress, Done) |
| **Add Comments** | Add implementation notes and learnings to tickets |
| **Browse Projects** | Read project configuration and issue types |
| **Edit Issues** | Update ticket descriptions and fields |

### Step 4: Configure Per-Project Jira Settings

Copy the example configuration and customize for your project:

```bash
# From your project root (where prd.json lives)
mkdir -p .ralph
cp /path/to/ralph/.ralph/jira.json.example .ralph/jira.json
```

Edit `.ralph/jira.json` with your project-specific values:

```json
{
  "projectKey": "PROJ",
  "atlassianSiteUrl": "https://your-domain.atlassian.net",
  "epicIssueType": "Epic",
  "storyIssueType": "Story",
  "subtaskIssueType": "Sub-task",
  "defaultLabels": ["ralph-generated"],
  "statusMapping": {
    "start": "In Progress",
    "done": "Done",
    "fail": "In Progress"
  }
}
```

See `.ralph/jira.json.example` for all available configuration options and detailed field documentation.

**Important**: The `.ralph/jira.json` file is gitignored by default since it contains project-specific settings. Each project needs its own configuration.

### Step 5: Sync PRD to Jira

After creating your `prd.json`, run the sync-jira skill:

```
/sync-jira
```

This creates:
- One Jira epic for the PRD
- One ticket per user story, linked to the epic
- Updates `prd.json` with Jira ticket references

### Graceful Degradation

Jira integration is completely optional. If not configured:
- Ralph operates normally without any Jira functionality
- No errors or warnings are shown
- All existing Ralph functionality works unchanged

### Troubleshooting MCP Connection

Test the MCP server connection:

```bash
# Verify MCP server is installed
which mcp-server-atlassian

# Check Claude Code recognizes the server
claude mcp list
```

If the server doesn't appear, verify your `~/.claude/mcp_servers.json` syntax is valid JSON.

## References

- [Geoffrey Huntley's Ralph article](https://ghuntley.com/ralph/)
- [Amp documentation](https://ampcode.com/manual)
- [Claude Code documentation](https://docs.anthropic.com/en/docs/claude-code)
