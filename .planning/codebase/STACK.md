# Technology Stack

**Analysis Date:** 2026-01-26

## Languages

**Primary:**
- TypeScript 5.9.3 - Used in flowchart visualization and configuration
- Bash - Shell scripting for the ralph.sh orchestration engine
- Markdown - Documentation and PRD format for skills

**Secondary:**
- JavaScript - Runtime for Node.js and npm packages
- JSON - Configuration and prd.json format for task definitions

## Runtime

**Environment:**
- Node.js 20 (specified in GitHub Actions, no version manager lock file detected)

**Package Manager:**
- npm - Primary package manager for JavaScript/TypeScript projects
- Lockfile: `flowchart/package-lock.json` present (npm v3 lockfile format)

## Frameworks

**Core:**
- React 19.2.0 - UI framework for flowchart visualization
- @xyflow/react 12.10.0 - Flow diagram library for Ralph flowchart visualization (interactive step-by-step visualization of the Ralph loop)

**Build/Dev:**
- Vite 7.2.4 - Build tool and dev server for React flowchart
- TypeScript 5.9.3 - Type checking and compilation
- ESLint 9.39.1 - Linting for TypeScript/JavaScript code
- @vitejs/plugin-react 5.1.1 - Vite plugin for React fast refresh

**Linting/Type Checking:**
- @eslint/js 9.39.1 - ESLint core rules
- typescript-eslint 8.46.4 - TypeScript-specific ESLint rules
- eslint-plugin-react-hooks 7.0.1 - React hooks linting rules
- eslint-plugin-react-refresh 0.4.24 - Vite React refresh plugin linting

## Key Dependencies

**Critical:**
- @xyflow/react 12.10.0 - Enables interactive flowchart visualization in `flowchart/src/App.tsx`. Core to explaining Ralph's algorithm to users.
- React 19.2.0 - Powers the flowchart UI at `flowchart/src/main.tsx`
- react-dom 19.2.0 - React DOM rendering

**Infrastructure:**
- @types/react 19.2.5 - TypeScript type definitions for React
- @types/react-dom 19.2.3 - TypeScript type definitions for React DOM
- @types/node 24.10.1 - TypeScript type definitions for Node.js
- globals 16.5.0 - Global variable definitions for ESLint

## Configuration

**Environment:**
- No `.env` files required - Ralph reads `prd.json` (user-created) and `progress.txt` (auto-generated) for state
- Shell variables in `ralph.sh`: `TOOL` (amp|claude), `MAX_ITERATIONS` (default 10), `INTERACTIVE` (boolean)
- No external API credentials required - Ralph is tool-agnostic (supports Amp or Claude Code)

**Build:**
- `flowchart/vite.config.ts` - Vite configuration with React plugin, base path set to `/ralph/` for GitHub Pages deployment
- `flowchart/tsconfig.json` - References both app and node configs
- `flowchart/tsconfig.app.json` - Application-level TypeScript settings
- `flowchart/tsconfig.node.json` - Build tooling TypeScript settings
- `flowchart/eslint.config.js` - Unified ESLint config using flat config format (ESLint 8+)

**Scripts:**
- `flowchart/package.json` scripts:
  - `dev`: Starts Vite dev server (local development)
  - `build`: Runs TypeScript compilation (`tsc -b`) then Vite build
  - `lint`: Runs ESLint on all files
  - `preview`: Preview built output locally

## Platform Requirements

**Development:**
- macOS/Linux/Windows (bash shell required for ralph.sh)
- Node.js 20+
- npm (installed with Node.js)
- Git (required, no version specified)
- `jq` command-line JSON processor (used in ralph.sh for parsing prd.json, mentioned in README)
- One of: Amp CLI or Claude Code (for autonomous agent loop)

**Production:**
- GitHub Pages hosting (flowchart deployed via `/.github/workflows/deploy.yml`)
- Node.js 20 (CI environment)

## Ralph CLI Tool

**Core Script:**
- `ralph.sh` - Bash orchestration script that:
  - Parses command-line arguments (`--tool amp|claude`, `--interactive`, `max_iterations`)
  - Manages PRD/progress file archiving when branch changes
  - Spawns fresh AI instances per iteration (using Amp or Claude Code)
  - Loops until all PRD stories have `passes: true` or max iterations reached
  - Detects completion via `<promise>COMPLETE</promise>` signal (non-interactive) or prd.json verification (interactive)

**Supported AI Tools:**
- Amp CLI (default) - Uses `amp --dangerously-allow-all` with prompt from `prompt.md`
- Claude Code CLI - Uses `claude --dangerously-skip-permissions --print` with prompt from `CLAUDE.md` (or interactive mode without flags)

**State Files:**
- `prd.json` - User stories with `passes` status (task list)
- `progress.txt` - Append-only learnings log for future iterations
- `.last-branch` - Tracks current feature branch for archive logic

---

*Stack analysis: 2026-01-26*
