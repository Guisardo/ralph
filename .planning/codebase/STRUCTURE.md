# Codebase Structure

**Analysis Date:** 2026-01-26

## Directory Layout

```
ralph/
├── ralph.sh                        # Main orchestration script (bash loop controller)
├── prompt.md                       # Instructions for Amp AI instances
├── CLAUDE.md                       # Instructions for Claude Code instances
├── prd.json.example                # Example PRD format (reference)
├── AGENTS.md                       # Learnings for future iterations
├── README.md                       # Full documentation
├── LICENSE                         # MIT License
├── progress.txt                    # Append-only log of iterations and learnings
├── .last-branch                    # Tracks current branch name (auto-generated)
│
├── flowchart/                      # Interactive React visualization
│   ├── package.json                # Dependencies for React app
│   ├── tsconfig.json               # TypeScript project references config
│   ├── tsconfig.app.json           # App-specific TypeScript config (strict mode)
│   ├── tsconfig.node.json          # Build tools TypeScript config
│   ├── vite.config.ts              # Vite bundler config (base: /ralph/)
│   ├── eslint.config.mjs           # ESLint configuration
│   ├── index.html                  # HTML entry point (mounts React)
│   ├── public/                     # Static assets (favicon, etc)
│   └── src/
│       ├── main.tsx                # React DOM render entry
│       ├── App.tsx                 # Main flowchart component (1,379 lines)
│       ├── App.css                 # Flowchart styling
│       ├── index.css               # Global styles
│       └── assets/
│           └── react.svg           # React logo
│
├── skills/                         # Reusable skill templates for AI tools
│   ├── prd/
│   │   └── SKILL.md                # PRD generator skill (instructions for creating PRDs)
│   └── ralph/
│       └── SKILL.md                # Ralph converter skill (PRD to prd.json)
│
├── .planning/
│   └── codebase/                   # GSD codebase analysis documents
│       ├── ARCHITECTURE.md         # (you are here)
│       └── STRUCTURE.md            # Directory and file organization
│
├── archive/                        # Auto-generated: previous feature runs
│   └── YYYY-MM-DD-feature-name/
│       ├── prd.json
│       └── progress.txt
│
├── .github/
│   └── workflows/                  # CI/CD configuration (if present)
│
└── .git/                           # Git repository metadata
```

## Directory Purposes

**Root Directory:**
- Purpose: Contains orchestration scripts and PRD state files
- Contains: ralph.sh (controller), prompt.md/CLAUDE.md (AI instructions), prd.json (current state)
- Key files: `ralph.sh` (executable, must remain executable), `prd.json` (created by user before first ralph.sh run)

**flowchart/**
- Purpose: Interactive React application for visualizing and presenting how Ralph works
- Contains: React 19 app using @xyflow/react for flowchart rendering
- Key files: `src/App.tsx` (2000+ lines, contains entire flowchart logic, node definitions, edges, animation state)
- Generated: `dist/` after build (contains static HTML/JS output)

**skills/**
- Purpose: Reusable skill templates for Amp or Claude Code tools
- Contains: Two SKILL.md files that define AI skill triggers and outputs
- Usage: Copy to `~/.config/amp/skills/` or `~/.claude/skills/` for global availability

**.planning/codebase/**
- Purpose: GSD agent-generated codebase documentation
- Contains: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md (if applicable), TESTING.md (if applicable)
- Pattern: Auto-created by `/gsd:map-codebase` command; consumed by `/gsd:plan-phase` and `/gsd:execute-phase`

**archive/**
- Purpose: Stores previous feature run state when starting a new feature (different branchName)
- Created automatically by ralph.sh when detecting branch change
- Pattern: `archive/YYYY-MM-DD-feature-name/` with old `prd.json` and `progress.txt`
- Protection: Prevents data loss when switching between features

## Key File Locations

**Entry Points:**

- `./ralph.sh` - Main user-facing script; start here to run Ralph loop
- `./flowchart/src/main.tsx` - React app entry point; mounts App.tsx to DOM
- `./skills/prd/SKILL.md` - Entry for PRD generation workflow
- `./skills/ralph/SKILL.md` - Entry for PRD-to-JSON conversion workflow

**Configuration:**

- `./flowchart/vite.config.ts` - Vite bundler config (base path set to `/ralph/` for GitHub Pages)
- `./flowchart/tsconfig.json` - Composite TypeScript config with app and node tool configs
- `./flowchart/eslint.config.mjs` - ESLint rules (React hooks, refresh plugin)

**Core Logic:**

- `./ralph.sh` - Loop controller; tool selection, iteration management, completion detection, archiving
- `./prompt.md` - Amp AI instructions; task selection, quality checks, progress format
- `./CLAUDE.md` - Claude Code AI instructions (same content as prompt.md adapted for Claude)
- `./flowchart/src/App.tsx` - Entire flowchart visualization logic

**State & Logs:**

- `./prd.json` - Current PRD state (user stories, pass/fail status, priorities); created by user before ralph.sh runs
- `./progress.txt` - Append-only iteration log; **Codebase Patterns** section at top tracks learnings
- `./.last-branch` - Auto-generated; stores branchName to detect feature switches (triggers archiving)

**Documentation:**

- `./README.md` - Complete user guide and workflow explanation
- `./AGENTS.md` - Patterns and context for future AI iterations
- `./prd.json.example` - Reference structure for prd.json format
- `./LICENSE` - MIT License terms

## Naming Conventions

**Files:**

- Shell scripts: lowercase with `.sh` extension (e.g., `ralph.sh`)
- Markdown docs: UPPERCASE.md for core docs (README.md, CLAUDE.md, AGENTS.md)
- Config files: lowercase with extension (vite.config.ts, eslint.config.mjs)
- JSON state: lowercase (prd.json, not PRD.JSON)
- React components: PascalCase (App.tsx, CustomNode function inside App)

**Directories:**

- Feature archive: `archive/YYYY-MM-DD-feature-name/` (kebab-case feature name)
- Source code: `src/` for React app
- Public assets: `public/` for static files
- Build output: `dist/` (generated, not committed)
- Node dependencies: `node_modules/` (generated, not committed)

**Branch Names:**

- Feature branches: `ralph/feature-name` (derived from PRD, kebab-case)
- Example: `ralph/task-priority`, `ralph/user-auth`, `ralph/notification-system`

**Story IDs:**

- Format: `US-001`, `US-002`, etc. (sequential, zero-padded)
- Usage: Referenced in commit messages (`feat: US-001 - Add priority field`), progress.txt entries

## Where to Add New Code

**New Feature:**
- Primary code: Implement in user's project repo (not in Ralph repo); Ralph orchestrates the loop
- Tests: Place alongside implementation (determined by user's project structure)
- Ralph itself is not intended for feature development; it's the orchestrator

**New Skill:**
- Implementation: `./skills/[name]/SKILL.md` (follow template from prd/SKILL.md)
- Content: Skill definition with description, triggers, instructions
- Distribution: Copy to `~/.config/amp/skills/` or `~/.claude/skills/`

**New Ralph Enhancement:**
- Orchestration: Modify `./ralph.sh` (bash)
- Amp instructions: Modify `./prompt.md`
- Claude instructions: Modify `./CLAUDE.md`
- Keep both prompt.md and CLAUDE.md in sync (same behavior, different syntax)

**Flowchart Visualization Changes:**
- UI/styling: `./flowchart/src/App.css`
- Logic/nodes: `./flowchart/src/App.tsx` (update step definitions, node positioning, edge connections)
- Dependencies: Add to `./flowchart/package.json`

**Documentation:**
- User guide: `./README.md`
- Iteration learnings: `./ progress.txt` (append-only)
- Pattern updates: `./AGENTS.md` (consolidate reusable patterns)
- Example PRD: `./prd.json.example` (update if format changes)

## Special Directories

**flowchart/node_modules:**
- Purpose: npm dependencies for React app
- Generated: Yes (by `npm install`)
- Committed: No (.gitignore excludes)

**flowchart/dist:**
- Purpose: Built/bundled output from Vite
- Generated: Yes (by `npm run build`)
- Committed: No (.gitignore excludes)

**.git:**
- Purpose: Git repository metadata and history
- Generated: Yes (by git init)
- Committed: N/A (special directory)

**archive/**
- Purpose: Stores old prd.json and progress.txt when switching features
- Generated: Yes (by ralph.sh when detecting branchName change)
- Committed: Yes (preserves history)

## Project Structure for Ralph Users

When users copy Ralph files into their project, typical structure:

```
their-project/
├── prd.json                       # Feature tasks (user creates)
├── progress.txt                   # Iteration log (auto-appended)
├── src/                           # Their application code
├── tests/                         # Their test suite
├── package.json                   # Their dependencies
└── scripts/ralph/                 # (Optional; if copying Ralph files)
    ├── ralph.sh
    ├── prompt.md
    └── CLAUDE.md
```

Ralph modifies:
- `prd.json` (sets `passes: true` as stories complete)
- `progress.txt` (appends learnings)
- `.git/` (creates commits)
- `src/`, tests, etc. (implementation)

Ralph does NOT modify:
- package.json, tsconfig.json, other config (unless story explicitly requires it)
- Ralph's own files (ralph.sh, prompt.md, CLAUDE.md)

---

*Structure analysis: 2026-01-26*
