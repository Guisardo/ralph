# Codebase Concerns

**Analysis Date:** 2026-01-26

## Critical Issues

### Security: Dangerous Flags in Shell Script

**Issue:** The `ralph.sh` script uses `--dangerously-allow-all` (Amp) and `--dangerously-skip-permissions` (Claude Code) flags, which disable security checks.
- Files: `ralph.sh` lines 112, 120
- Impact: AI agents can execute arbitrary code without permission prompts. This is intentional for autonomous operation but represents a security boundary that should be carefully documented and controlled.
- Current mitigation: Script runs in user's local environment with git history for audit trail
- Recommendations:
  - Add prominent warning in README about security implications
  - Consider sandboxing Ralph runs or limiting to trusted CI/CD environments
  - Document that users should review git history before merging Ralph branches
  - Add optional approval step before executing tool (already supported via `--interactive` flag for Claude)

### Error Handling: Silent Tool Failures

**Issue:** Tool execution uses `|| true` fallback pattern, silencing errors.
- Files: `ralph.sh` lines 112, 116, 120
- Problem: If Amp or Claude Code crashes, the script continues without reporting failure
- Symptom: Loop iteration completes "successfully" but may have produced no output/code
- Impact: Broken PRD state passes silently; subsequent iteration may repeat or get stuck
- Workaround: Check `progress.txt` and git log manually to detect silent failures
- Fix approach:
  - Remove `|| true` fallback
  - Add explicit error checking after tool execution
  - Verify non-empty OUTPUT before checking completion signal
  - Log tool exit codes

### Output Capture Incompleteness

**Issue:** Interactive mode cannot capture Claude Code output for completion detection.
- Files: `ralph.sh` lines 114-117
- Problem: `claude < CLAUDE.md` (interactive) produces no `OUTPUT` variable to check completion
- Impact: Loop must rely on file polling (checking PRD status) instead of output signal
- Result: Completion detection in interactive mode is slower and less reliable
- Fix approach:
  - Add delay before polling PRD status in interactive mode
  - Or force non-interactive mode with better output capture
  - Document limitation in comments

## Tech Debt

### Script Fragility: Hard-coded Paths and File Locations

**Issue:** `ralph.sh` assumes specific directory structure and file locations.
- Files: `ralph.sh` lines 52-56
- Problem:
  - Relies on being in the project root directory
  - Hard-codes paths relative to script location (`$SCRIPT_DIR`)
  - `prd.json`, `progress.txt`, `.last-branch` must be in project root
- Impact: Script breaks if run from different directory or if files are in different locations
- Safe modification: Use absolute paths or verify directory structure before executing

### Bash Portability: sed Command May Not Work Cross-Platform

**Issue:** `sed 's|^ralph/||'` at line 67 works on macOS but may fail on BSD sed vs GNU sed.
- Files: `ralph.sh` line 67
- Problem: `-i` flag behavior differs between platforms; only using `sed` without `-i` is safer but script doesn't use `-i`
- Risk: Low (current usage works), but extraction logic could be more portable
- Improvement: Use `bash` string manipulation instead: `${LAST_BRANCH#ralph/}`

### Missing Input Validation

**Issue:** Script doesn't validate `prd.json` structure before reading.
- Files: `ralph.sh` lines 60, 85, 128
- Problem: If `prd.json` is malformed, `jq` queries fail silently (caught by `|| echo ""`)
- Impact: Empty branch names or missing userStories could cause undefined behavior
- Recommendation:
  - Add explicit `jq` syntax check before execution
  - Validate that `.userStories` array exists and is non-empty
  - Fail early with clear error message if PRD is invalid

### Timing Issue: Fixed Sleep in Loop

**Issue:** Hard-coded `sleep 2` between iterations may be too short or too long.
- Files: `ralph.sh` line 144
- Problem:
  - If tool is still processing, 2 seconds may not be enough
  - If tool completes quickly, 2 seconds is wasted per iteration
  - No adaptive timing based on tool response time
- Impact: Could cause rate limiting issues or slow execution
- Improvement: Make sleep duration configurable or adaptive

## Performance Bottlenecks

### React Component: Large Single File

**Issue:** `App.tsx` contains 379 lines in a single component file.
- Files: `flowchart/src/App.tsx`
- Problem:
  - All state management, rendering, and node/edge creation in one component
  - Makes testing individual features difficult
  - Hard to understand flow at a glance
- Current approach: All UI logic centralized (intentional for flowchart demo)
- Improvement path: If feature complexity grows, extract:
  - `CustomNode` and `NoteNode` components to separate files
  - Position/edge data to separate module
  - Node/edge creation logic to utilities

### React Flow: Excessive Handle Definitions

**Issue:** CustomNode has 8 handles (top, left, right, bottom, and duplicates for source/target).
- Files: `flowchart/src/App.tsx` lines 91-98
- Problem: Not all handles are used; only 4 are referenced in edge connections
- Impact: Unused DOM elements, potential confusion for future maintainers
- Simplification: Remove unused handles (left-target, bottom-target if not needed)

### Flowchart Performance: Complete Redraw on Step Change

**Issue:** `handleNext`/`handlePrev` recreate entire nodes and edges arrays.
- Files: `flowchart/src/App.tsx` lines 290-316
- Problem: On each step, `getNodes()` and `getEdges()` iterate all steps even if only visibility changes
- Impact: Acceptable for 10 steps, but doesn't scale if flowchart grows
- Improvement:
  - Use React Flow's `updateNode`/`updateEdge` for single property updates
  - Or memoize unchanged nodes/edges

## Fragile Areas

### Progress File: Append-only Design Makes Parsing Complex

**Issue:** `progress.txt` uses append-only format with special markers.
- Files: `progress.txt`, referenced in `CLAUDE.md` and `prompt.md`
- Why fragile:
  - Parser must scan entire file to find latest section
  - No clear schema for structured data
  - Future iterations must understand header format to find patterns
  - Regex-based parsing is brittle
- Safe modification: When extending progress tracking, maintain append-only semantics but add clear delimiters

### PRD JSON: No Schema Validation

**Issue:** `prd.json` structure is documented but not validated at runtime.
- Files: `ralph.sh`, `prd.json.example`
- Why fragile:
  - Any field can be missing; script uses `jq` default fallback
  - `userStories` array could be empty or contain wrong structure
  - No type checking for fields like `priority` (should be number)
  - Missing `passes` field doesn't cause error, just uses falsy check
- Test coverage gap: No tests verify PRD parsing handles malformed input
- Safe modification: Add JSON schema file and validate on load

### Branch Name Extraction: Fragile String Parsing

**Issue:** Branch name extraction assumes specific format.
- Files: `ralph.sh` line 67
- Problem: Assumes branch starts with `ralph/`; non-conforming names break archive folder naming
- Impact: Archive folder has unexpected name if PRD branch doesn't follow convention
- Recommendation: Sanitize folder names to be filesystem-safe, or validate branch name format early

## Security Considerations

### Secrets Risk: Progress File May Contain Sensitive Data

**Issue:** `progress.txt` is appended with learnings that may contain environment variables or config.
- Files: `progress.txt`
- Risk: If developers paste error logs or debug output into progress entries, secrets could be exposed
- Current mitigation: File is version-controlled in git
- Recommendations:
  - Add warning to CLAUDE.md/prompt.md about not pasting secrets in progress notes
  - Consider using `.env` or secrets manager instead of environment variables in logs
  - Pre-commit hook to scan progress.txt for common secret patterns

### Git History: All AI Tool Interactions Are Logged

**Issue:** `git log` contains all commits from AI agents.
- Files: Implicit through `.git/` directory
- Risk: If repository is made public, exposes AI tool interactions and problem-solving approaches
- Current mitigation: Requires explicit user action to push to public repo
- Recommendations:
  - Document that AI-generated code should be reviewed before sharing publicly
  - Consider squashing commits before publishing if sensitive

### Permissions: `dangerously-skip-permissions` Bypasses User Consent

**Issue:** Claude Code in autonomous mode skips permission prompts.
- Files: `ralph.sh` line 120
- Risk: Scripts execute file operations without user approval per operation
- Current mitigation: Single approval at script start, git history for audit
- Recommendations:
  - Document workflow to review git diffs between iterations
  - Add `--interactive` mode as safer alternative
  - Consider requiring branch approval before final merge

## Dependency Risks

### Node.js Dependency Age: React at v19 (New)

**Issue:** Flowchart uses React 19.2.0 (latest major version, released 2024).
- Files: `flowchart/package.json`
- Risk: Newer versions may have compatibility issues with ecosystem
- Current mitigation: Pinned to ~19, TypeScript strict mode enables early error detection
- Recommendation: Monitor React 19 adoption in React Flow ecosystem; test before major upgrades

### React Flow: Large Third-Party Dependency

**Issue:** React Flow is the primary dependency, represents significant code outside control.
- Files: `flowchart/package.json` line 13
- Risk: Updates could introduce breaking changes; CVEs could affect flowchart
- Current mitigation: Flowchart is optional; Ralph works without it
- Recommendation: Monitor React Flow security advisories; consider if core Ralph needs flowchart

### No Lock File Checked: Inconsistent Installs

**Issue:** While `package-lock.json` exists, it's not clear if it's committed.
- Files: `flowchart/package-lock.json`
- Risk: Team members or CI might install different versions if lock file is not in git
- Verification: Lock file must be in git for deterministic builds
- Recommendation: Add CI step to verify lock file is committed when `package.json` changes

## Missing Critical Features

### Test Coverage: No Automated Tests

**Issue:** No test files found in project.
- Files: None detected
- Gap: Ralph is a shell script and React app with no tests
- Risk:
  - Regressions in shell script logic go undetected
  - React Flow visualization may break with updates
  - No tests verify PRD JSON parsing logic
- What's not tested:
  - `ralph.sh` argument parsing
  - `ralph.sh` branch archival logic
  - `ralph.sh` completion detection (regex matching)
  - React app rendering of nodes/edges
  - Flowchart interaction (next/prev/reset)
- Priority: Medium (functional testing is manual, but automation would improve quality)
- Recommendation: Add shell script tests (`bats`, `shunit2`) and React component tests (`vitest`)

### Documentation: No Developer Setup Guide

**Issue:** README covers usage but not local development setup.
- Files: `README.md`
- Gap: No instructions for modifying `ralph.sh`, `prompt.md`, or `CLAUDE.md`
- Impact: Future developers must infer how to test changes
- Recommendation: Add development section with:
  - How to run ralph.sh locally with debugging
  - How to modify prompts and test against real repo
  - How to test flowchart changes

### Logging: No Diagnostic Output in Script

**Issue:** `ralph.sh` has no debug or verbose logging.
- Files: `ralph.sh`
- Gap:
  - No way to see what branch script is on during archival
  - No visibility into tool execution
  - Silent failures with `|| true` leave no trace
- Impact: Hard to debug issues when script runs
- Recommendation: Add `--verbose` flag to enable `set -x` and additional logging

## Scaling Limits

### PRD Size: Assumes Small Story Sets

**Issue:** Design assumes 3-10 stories per PRD.
- Files: `ralph.sh`, `prd.json.example`, skills documentation
- Current capacity: Loop can run indefinitely (controlled by `--max-iterations` flag)
- Limit: If PRD has 50+ stories and takes 100 iterations to complete, execution time becomes prohibitive
- Scaling path:
  - Add optional parallel execution of independent stories
  - Or pre-split PRD into sub-PRDs that can run in parallel
  - Or add estimated completion time to help users right-size PRDs

### Git History: Accumulates Without Pruning

**Issue:** Each iteration adds a commit; git history grows without bounds.
- Files: Implicit through `.git/` and commits from AI agents
- Current capacity: Manageable for typical projects (<100 stories = ~100 commits)
- Limit: Very large features may generate 500+ commits, slowing git operations
- Scaling path:
  - Automatically squash commits when archiving
  - Or periodic cleanup to rebase/compress history

## Test Coverage Gaps

### Shell Script Logic: Untested

**Issue:** Core `ralph.sh` loop has no test coverage.
- Files: `ralph.sh`
- What's not tested:
  - Argument parsing (tool selection, max iterations)
  - Branch archival logic
  - Completion signal detection (`<promise>COMPLETE</promise>`)
  - Interactive mode PR polling
  - File I/O (reading `prd.json`, writing `.last-branch`)
- Risk: Logic bugs persist undetected; regressions on refactor are common
- Priority: High (core loop logic is critical)

### React Component: No Unit Tests

**Issue:** `App.tsx` has no tests for individual functions or components.
- Files: `flowchart/src/App.tsx`
- What's not tested:
  - `createNode` factory function
  - `createEdge` factory function
  - Visibility toggling (next/prev/reset handlers)
  - Node position tracking
  - Component rendering
- Risk: Changes to visualization or interaction could break flowchart
- Priority: Medium (flowchart is optional, used for documentation)

### End-to-End: No Integration Tests

**Issue:** No tests verify Ralph loop end-to-end.
- Files: No test files exist
- What's not tested:
  - Complete cycle: read PRD → branch → implement → commit → update PRD
  - Interaction between components: script, tool invocation, output parsing
  - Failure scenarios: malformed PRD, tool timeout, git errors
- Risk: Complex interactions fail silently or produce incorrect state
- Priority: High (integration failures compound across iterations)

---

*Concerns audit: 2026-01-26*
