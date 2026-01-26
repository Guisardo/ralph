# Architecture

**Analysis Date:** 2026-01-26

## Pattern Overview

**Overall:** Autonomous AI Agent Loop System

Ralph is a framework that orchestrates repeated autonomous AI coding iterations. It implements the Ralph pattern: spawning fresh AI instances to implement user stories sequentially, with memory persisting through git history, PRD state, and progress logs.

**Key Characteristics:**
- Fresh context per iteration (no memory carryover between cycles)
- State persisted in git commits, JSON manifests, and append-only logs
- Deterministic task selection (highest priority story where `passes: false`)
- Quality gates before commit (typecheck, lint, tests)
- Context handed off to next iteration via git and documentation

## Layers

**Orchestration Layer (ralph.sh):**
- Purpose: Spawn repeated fresh AI instances, manage loop lifecycle
- Location: `./ralph.sh`
- Contains: Bash loop controller, tool selection logic (Amp/Claude), iteration counter, completion detection
- Depends on: Tool CLIs (amp or claude), jq for JSON parsing, git
- Used by: Users running `./ralph.sh` command

**Instruction Layer (prompt.md, CLAUDE.md):**
- Purpose: Provide AI instances with task context, goals, and coding guidelines
- Location: `./prompt.md` (for Amp), `./CLAUDE.md` (for Claude Code)
- Contains: Task instructions, quality requirements, progress reporting format, pattern consolidation rules
- Depends on: prd.json for story selection, progress.txt for context
- Used by: Each AI iteration to understand what to build and how to build it

**State Management Layer:**
- Purpose: Track PRD state, learnings, and feature branch context
- Location: `./prd.json` (task manifest), `./progress.txt` (append-only log), `./.last-branch` (branch tracking)
- Contains: User story status, acceptance criteria, priority, and learnings from previous iterations
- Depends on: Nothing; written to by AI iterations
- Used by: AI iterations to know which story to pick, what to avoid, patterns to follow

**Skills/Tool Layer:**
- Purpose: Provide reusable skill templates for AI agents
- Location: `./skills/prd/SKILL.md` (PRD generator), `./skills/ralph/SKILL.md` (PRD converter)
- Contains: Structured prompts for creating PRDs and converting them to JSON
- Depends on: Nothing standalone; integrated into AI workflows
- Used by: Users and AI agents when starting new features

**Visualization Layer:**
- Purpose: Interactive explanation of how Ralph works
- Location: `./flowchart/` (React application)
- Contains: React Flow diagram showing the autonomous loop, node types, edge definitions, control flow
- Depends on: React 19+, @xyflow/react, Vite
- Used by: Presentations and documentation (generates static output for ralph-flowchart.png)

## Data Flow

**Feature Initialization:**

1. User creates or loads PRD → converts to `prd.json` with user stories
2. Branch tracking written to `.last-branch`
3. Archive check: if `branchName` differs from previous run, archive old `prd.json` and `progress.txt`

**Single Iteration Loop:**

1. Ralph.sh spawns fresh AI instance (Amp or Claude)
2. AI instance reads `prd.json` to find highest-priority `passes: false` story
3. AI reads `progress.txt` (especially **Codebase Patterns** section at top)
4. AI implements single story, writes code, runs quality checks
5. If checks pass: commits with message `feat: [ID] - [Title]`
6. AI updates `prd.json` to set story `passes: true`
7. AI appends learnings to `progress.txt` (creates **Codebase Patterns** section if new patterns found)
8. Ralph.sh loop detects completion (`<promise>COMPLETE</promise>` or all stories pass)
9. If not complete, sleep 2 seconds and repeat with fresh context

**State Persistence Between Iterations:**

- Git commits preserve implementation history
- `prd.json` tracks which stories are done
- `progress.txt` contains **Codebase Patterns** section at top (learned rules for future iterations)
- AGENTS.md files updated with reusable patterns from edited directories
- `.last-branch` prevents accidental mixing of feature branches

## Key Abstractions

**User Story:**
- Purpose: Atomic unit of work completable in one AI context window
- Examples: `prd.json[].userStories[]`
- Pattern: JSON object with `id`, `title`, `description`, `acceptanceCriteria[]`, `priority`, `passes`, `notes`
- Constraints: Must be small enough to implement in ~50% of AI token budget; must have no dependency on future stories

**Acceptance Criteria:**
- Purpose: Verifiable checklist that AI uses to validate story completion
- Pattern: Array of strings describing testable requirements
- Required entries: "Typecheck passes" (always), "Tests pass" (for logic), "Verify in browser using dev-browser skill" (for UI)
- Anti-pattern: Vague criteria like "works correctly" or "good UX"

**Codebase Patterns Section:**
- Purpose: Consolidate reusable learnings at top of `progress.txt` for next iteration
- Pattern: Bullet-point list of discovered patterns, gotchas, conventions
- Examples: "Use sql<number> template for aggregations", "Always add typecheck to acceptance criteria", "Export types from actions.ts for UI"
- Scope: General and reusable, not story-specific

**Iteration Memory (progress.txt):**
- Purpose: Append-only log of what each AI iteration built and learned
- Structure: Header sections + per-iteration blocks dated/tagged by story ID
- Pattern: Each block includes "Learnings for future iterations" subsection
- Contract: Future iterations must read this before starting

## Entry Points

**User Entry (CLI):**
- Location: `./ralph.sh`
- Triggers: `./ralph.sh [--tool amp|claude] [--interactive] [max_iterations]`
- Responsibilities: Validate tool choice, manage iteration loop, archive previous runs, detect completion

**AI Entry (per iteration):**
- Location: `./prompt.md` or `./CLAUDE.md`
- Triggers: Spawned by ralph.sh loop
- Responsibilities: Read PRD, select story, implement, test, commit, update state, report learnings

**Feature Initialization:**
- Location: Skills (`./skills/prd/`, `./skills/ralph/`)
- Triggers: User loads PRD skill or Ralph skill in Amp/Claude
- Responsibilities: Generate PRD markdown, convert to prd.json with proper story sizing and ordering

**Visualization Entry:**
- Location: `./flowchart/src/main.tsx`
- Triggers: `npm run dev` in flowchart directory
- Responsibilities: Render interactive flowchart showing Ralph loop steps

## Error Handling

**Strategy:** Fail-safe loop with readable diagnostics

**Patterns:**

- **Bad story format:** Ralph skips incomplete stories, AI continues to next one
- **Test failure:** AI does not commit, continues to next iteration; human must fix
- **Max iterations reached:** Loop exits with status message; human reviews progress.txt
- **Tool not installed:** ralph.sh exits early with clear error message
- **Branch mismatch:** Archive triggers automatically to prevent data loss; old run saved with date stamp
- **Missing prd.json:** Ralph.sh checks existence before attempting parse

## Cross-Cutting Concerns

**Logging:**
- Ralph.sh prints iteration count and tool choice to stdout
- Each AI iteration logs progress to `progress.txt` (append-only)
- Verbose output preserved via `tee /dev/stderr` in ralph.sh

**Validation:**
- PRD story ordering enforced in skills (schema → backend → UI)
- Story size validated by human before running Ralph (stories must fit in one context)
- Acceptance criteria format checked by AI before implementing

**Authentication:**
- No explicit auth mechanism; tools (Amp, Claude) handle their own credentials
- Git commits use system git config

**State Consistency:**
- Single source of truth per concern: `prd.json` (stories), `progress.txt` (learnings), git commits (code)
- Append-only pattern in progress.txt prevents accidental erasure
- `.last-branch` prevents branch confusion
- Archive mechanism protects previous feature runs

---

*Architecture analysis: 2026-01-26*
