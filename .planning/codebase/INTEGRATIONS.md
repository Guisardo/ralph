# External Integrations

**Analysis Date:** 2026-01-26

## APIs & External Services

**AI Coding Tools (Primary Integrations):**
- Amp CLI - Autonomous AI coding agent
  - SDK/Client: `amp` CLI tool
  - Invoked by: `ralph.sh` via `amp --dangerously-allow-all`
  - Prompt: Reads from `prompt.md`
  - Output: Returned to stdout/stderr for completion detection

- Claude Code - Autonomous AI coding agent (alternative)
  - SDK/Client: `claude` CLI tool
  - Invoked by: `ralph.sh` via `claude --dangerously-skip-permissions --print` (autonomous) or `claude` (interactive)
  - Prompt: Reads from `CLAUDE.md`
  - Output: Returned to stdout/stderr for completion detection
  - Interactive mode: User approves tool usage; interactive mode disables --print flag

**No Third-Party APIs:**
- Ralph is a local orchestration system that does NOT integrate with external APIs
- All integrations are with local AI tools (Amp/Claude Code) which are user's responsibility to authenticate
- No cloud services, databases, or SaaS integrations required

## Data Storage

**Databases:**
- None - Ralph is tool-agnostic and project-agnostic
- Projects using Ralph may have databases, but Ralph itself does not manage them

**File Storage:**
- Local filesystem only
- Key files in project root:
  - `prd.json` - User stories (JSON format, user-created)
  - `progress.txt` - Iteration logs (plain text, auto-appended)
  - `.last-branch` - Branch tracking (plain text, auto-managed)
  - `archive/` - Previous run backups (created automatically per date and branch)

**Caching:**
- None - No caching mechanism. Each iteration reads fresh from prd.json and progress.txt

## Authentication & Identity

**Auth Provider:**
- None built-in - Ralph delegates to the selected AI tool (Amp or Claude Code)
- Each tool has its own authentication mechanism (user handles separately)
- ralph.sh passes `--dangerously-allow-all` (Amp) or `--dangerously-skip-permissions` (Claude) to bypass permission prompts in autonomous mode

**User Context:**
- No user identity management
- Ralph reads git config and system state to determine branch and archive structure
- All data is local to the project repository

## Monitoring & Observability

**Error Tracking:**
- None - Ralph does NOT send telemetry or error reports
- Errors logged to stdout/stderr during execution
- Failures captured in `progress.txt` by the AI agent

**Logs:**
- Local stdout/stderr during `ralph.sh` execution
- `progress.txt` - Append-only log of iterations, learnings, and thread links
- Git history - Commits from each iteration create audit trail
- Interactive execution shows real-time tool output; autonomous mode captures via tee to both stdout and stderr

## CI/CD & Deployment

**Hosting:**
- GitHub Pages (flowchart visualization only)
  - URL: `https://snarktank.github.io/ralph/`
  - Base path: `/ralph/` (configured in `flowchart/vite.config.ts`)

**CI Pipeline:**
- GitHub Actions workflow: `.github/workflows/deploy.yml`
- Triggers: Push to main branch or manual workflow_dispatch
- Steps:
  1. Checkout code
  2. Setup Node.js 20 with npm cache
  3. Install dependencies (`npm ci` in flowchart/)
  4. TypeScript compilation + Vite build (`npm run build`)
  5. Upload artifact to GitHub Pages
  6. Deploy via actions/deploy-pages

**Build Artifacts:**
- `flowchart/dist/` - Built flowchart (gitignored, generated during CI)

**Ralph Execution:**
- Not deployed via CI - Ralph is invoked locally by developers
- ralph.sh executed on developer machine to run autonomous loops
- Results (commits, prd.json updates) are pushed to git manually or via PRs

## Environment Configuration

**Required env vars:**
- None - Ralph does not require environment variables
- Optional shell variables for `ralph.sh`:
  - `TOOL` - Which AI tool to use (amp|claude, default: amp)
  - `MAX_ITERATIONS` - Maximum loop iterations (default: 10)
  - `INTERACTIVE` - Interactive approval mode (false|true, default: false)

**Secrets location:**
- No secrets managed by Ralph
- AI tool credentials (Amp/Claude API keys) managed by individual tools, typically in `~/.config/` or `~/.claude/`
- Users authenticate separately to their chosen AI tool before running ralph.sh

## Webhooks & Callbacks

**Incoming:**
- None - Ralph does not expose any endpoints or webhooks

**Outgoing:**
- None - Ralph does not make outbound requests to external services
- Ralph spawns child processes (Amp or Claude Code) which may make their own external calls

## Skills System (CLI Integrations for Users)

Ralph includes two reusable skills that users can install globally:

**PRD Generation Skill:**
- Location: `skills/prd/SKILL.md`
- Purpose: Generate Product Requirements Documents interactively
- Installation: Copy to `~/.config/amp/skills/prd/` or `~/.claude/skills/prd/`
- Triggered via: "Create a PRD for [feature]"

**Ralph Converter Skill:**
- Location: `skills/ralph/SKILL.md`
- Purpose: Convert markdown PRDs to prd.json format
- Installation: Copy to `~/.config/amp/skills/ralph/` or `~/.claude/skills/ralph/`
- Triggered via: "Convert this PRD to ralph format"

## Project Integration Points (For Projects Using Ralph)

When Ralph is used in a target project, it:

1. **Reads PRD definitions:**
   - Parses `prd.json` for user stories and branch name
   - Stories define what the AI agent should implement

2. **Manages git workflow:**
   - Creates/checks out feature branch from `prd.json.branchName`
   - Commits changes after each successful story
   - Git history serves as audit trail

3. **Reads and updates progress:**
   - Reads `progress.txt` for historical context
   - Appends iteration results and learnings
   - Consolidates reusable patterns at top of file

4. **Delegates to AI tools:**
   - Passes control to Amp or Claude Code with custom prompt
   - Each iteration gets fresh context from ralph.sh
   - AI tool reads project files (all accessible files - no sandboxing)
   - AI tool runs local commands (typecheck, lint, tests)

5. **No data export:**
   - Ralph does not upload project code or results anywhere
   - All execution is local
   - Git push is user's responsibility

---

*Integration audit: 2026-01-26*
