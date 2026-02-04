---
name: investigate
description: "Systematic issue investigation with subagent orchestration. Hypothesis-driven diagnosis, automated instrumentation, verification. Triggers: /investigate, investigate this, help investigate, fix this bug, help debug"
---

# Investigate Skill - Orchestrated

Hypothesis-driven investigation through specialized subagents. Each phase runs in isolated context to prevent overflow.

---

## Architecture Overview

This skill orchestrates debugging through focused subagents:

| Phase | Subagent | Model | Purpose |
|-------|----------|-------|---------|
| Session | debug-session | Haiku | Session file management |
| Hypothesis | debug-hypothesis | Opus | Code analysis, hypothesis generation |
| Instrument | debug-instrument | Haiku | Add logging markers (no commit) |
| Reproduce | debug-reproduce | Haiku | **Mechanical test execution only** - run commands, capture output (no analysis) |
| Analyze | debug-analyze | Opus | **Log analysis** - parse logs, confirm/reject hypotheses |
| Research | debug-research | Sonnet | Web research for solutions |
| Fix | debug-fix | Opus | Apply research-informed fix (no commit) |
| Verify | debug-verify | Sonnet | Re-run tests to verify fix works |
| Cleanup | debug-cleanup | Haiku | Remove instrumentation (no commit) |
| Commit | (orchestrator) | - | Final commit after verification + cleanup |

---

## Phase 1: Issue Intake

**Run directly in main context** (requires user interaction).

Ask user using AskUserQuestion:

1. **Issue type?**
   - Runtime Error (crash, exception, null ref)
   - Logic Bug (incorrect behavior, wrong output)
   - Intermittent/Flaky (sometimes works)
   - Performance (slow, timeout)
   - Cross-Service (API fail, distributed)
   - Other

2. **Reproduction steps?**
   Request step-by-step instructions to trigger issue.

3. **Expected vs Actual behavior?**

4. **Error messages/stack traces?**

5. **Files/components involved?** (if known)

6. **Environment?** (OS, language version, framework)

**Flaky Detection:** If description contains "intermittent", "flaky", "sometimes", "occasionally", "randomly" → mark `isFlaky: true`.

Display summary and confirm: **Proceed with investigation?**

---

## Phase 2: Session Initialization

**Spawn Task subagent:**
```
subagent_type: general-purpose
model: haiku
prompt: |
  Initialize investigation session:
  1. Generate sessionId: sess_${timestamp}_${random6}
  2. Run: git rev-parse HEAD → save as initialCommit
  3. Create directory: mkdir -p .claude/debug-sessions
  4. Write session file: .claude/debug-sessions/{sessionId}.json

  Session JSON:
  {
    "sessionId": "{sessionId}",
    "startTime": "{ISO8601}",
    "initialCommit": "{git_sha}",
    "issueDescription": "{from intake}",
    "reproductionSteps": [{steps}],
    "expectedBehavior": "{expected}",
    "actualBehavior": "{actual}",
    "errorMessage": "{error}",
    "isFlaky": {true|false},
    "environment": {env},
    "filesInvolved": [{files}],
    "hypotheses": [],
    "logsCollected": [],
    "fixesAttempted": [],
    "iterationCount": 0,
    "maxIterations": 5,
    "status": "active"
  }

  Return the session file path.
```

---

## Phase 3: Hypothesis Generation

**Spawn Task subagent:**
```
subagent_type: general-purpose
model: opus
prompt: |
  Read session file at: {sessionFilePath}

  Generate 3-5 testable hypotheses for the issue.

  For each hypothesis:
  1. Analyze error message, stack trace, and code in affected area
  2. Consider common failure modes for this issue type
  3. Identify specific files and line ranges to investigate
  4. Define test strategy (what to log to confirm/reject)

  Hypothesis format:
  {
    "id": "HYP_N",
    "description": "One sentence root cause theory",
    "reasoning": "Why this is likely",
    "files": ["file1.ts", "file2.ts"],
    "lines": {"file1.ts": "45-60"},
    "testStrategy": "What to log",
    "confidence": 0.85
  }

  Issue type patterns:
  - Runtime: null/undefined origins, type errors
  - Logic: decision points, boundaries, data transforms
  - Flaky: timing, shared state, race conditions
  - Performance: loops, I/O, complexity
  - Cross-service: API contracts, auth, timeouts

  Return JSON array sorted by confidence.
  Update session file hypotheses array.
```

---

## Phase 4: Instrumentation

**Spawn Task subagent:**
```
subagent_type: general-purpose
model: haiku
prompt: |
  Read session file at: {sessionFilePath}

  Add debug instrumentation for all hypotheses.

  Marker format:
  // DEBUG_HYP_{id}_START
  console.log("DEBUG_HYP_{id}: [filename] var =", value);
  // DEBUG_HYP_{id}_END

  Language patterns:
  - JS/TS: console.log("DEBUG_HYP_{id}: ...")
  - Python: # markers, logging.debug(f"DEBUG_HYP_{id}: ...")
  - Java: // markers, System.out.println("DEBUG_HYP_{id}: ...")
  - Go: // markers, fmt.Printf("DEBUG_HYP_{id}: ...")

  For each hypothesis:
  1. Read files from hypothesis.files
  2. Add markers at hypothesis.lines
  3. Log variable values, execution paths, timing
  4. Preserve exact indentation
  5. Include [filename] label in logs for cross-file correlation

  DO NOT commit these changes - instrumentation is temporary.

  Return list of files modified.
```

---

## Phase 5: Reproduction

**Spawn Task subagent:**
```
subagent_type: general-purpose
model: haiku
prompt: |
  Read session file at: {sessionFilePath}

  Execute reproduction to capture logs.

  Your ONLY job is mechanical execution - run commands and save output.
  DO NOT analyze, interpret, or determine pass/fail status.

  1. Detect test framework:
     - package.json → npm test / jest / vitest
     - pytest.ini → pytest
     - go.mod → go test

  2. Run test capturing all output:
     {test_command} 2>&1 | tee .claude/debug-sessions/{sessionId}-logs.txt

  3. For flaky issues (isFlaky: true):
     Run {successCount} times (default 10)
     Log each run's output with separator markers

  4. If no automated test possible:
     Write manual test script to:
     .claude/debug-sessions/{sessionId}-manual.md
     Then output: "Manual test script created. Waiting for logs."

  Return ONLY:
  - Log file path: .claude/debug-sessions/{sessionId}-logs.txt
  - Exit code: {command exit code}

  Analysis happens in Phase 6 - not your job.
```

---

## Phase 6: Log Analysis

**Spawn Task subagent:**
```
subagent_type: general-purpose
model: opus
prompt: |
  Read session file at: {sessionFilePath}
  Read log file at: {logFilePath}

  Analyze logs to confirm/reject hypotheses.

  For each hypothesis:
  1. Filter logs: grep "DEBUG_HYP_{id}:"
  2. Extract variable values, execution paths
  3. For multi-file: correlate [filename] labels
  4. Compare logged values to hypothesis prediction

  Evaluation:
  - CONFIRMED: Logs prove hypothesis (e.g., user = null before crash)
  - REJECTED: Logs contradict hypothesis (e.g., user has valid id)
  - INCONCLUSIVE: Logs don't capture key moment

  Return:
  {
    "hypotheses": [
      {"id": "HYP_1", "status": "confirmed", "evidence": [...]}
    ],
    "confirmedHypothesis": "HYP_1" or null,
    "newInsights": ["Observations for new hypotheses"],
    "recommendNewHypotheses": true|false
  }

  Update session file with analysis results.
```

---

## Phase 7: Research (if confirmed)

**Spawn Task subagent:**
```
subagent_type: general-purpose
model: sonnet
prompt: |
  Confirmed hypothesis: {confirmedHypothesis}
  Language/framework: {from session}

  Research best practices for fixing this issue.

  Search queries:
  - "{error_pattern}" {language} best practices
  - "{error_message}" fix site:stackoverflow.com
  - {framework} {issue_type} common mistakes

  Priority: Official docs > GitHub issues > Stack Overflow > Recent blogs

  Extract:
  - Recommended approach
  - Code examples
  - Security considerations
  - Deprecated approaches to avoid

  Return:
  {
    "recommendedApproach": "...",
    "codeExample": "...",
    "sources": [{"url": "...", "type": "...", "summary": "..."}],
    "securityNotes": [...],
    "deprecated": [...]
  }
```

---

## Phase 8: Fix Application

**Spawn Task subagent:**
```
subagent_type: general-purpose
model: opus
prompt: |
  Read session file at: {sessionFilePath}

  Confirmed hypothesis: {confirmedHypothesis}
  Research findings: {researchResults}

  Apply COMPLETE fix (no partial fixes).

  1. Design fix using research best practices
  2. Identify ALL files needing changes
  3. Apply changes using Edit tool
  4. PRESERVE instrumentation markers (needed for verify)
  5. Add test for fixed behavior if appropriate

  DO NOT commit - fix must be verified and cleaned first.

  Return:
  {
    "filesModified": [...],
    "approach": "Which research approach used",
    "testAdded": true|false
  }
```

---

## Phase 9: Verification

**Spawn Task subagent:**
```
subagent_type: general-purpose
model: sonnet
prompt: |
  Read session file at: {sessionFilePath}

  Verify fix resolves the issue.

  1. Re-run same reproduction test
  2. Capture logs to: {sessionId}-verification.txt
  3. For flaky: run {successCount} times, ALL must pass

  Compare:
  - Original error absent?
  - Test passes?
  - Logs show corrected behavior?

  Return:
  {
    "success": true|false,
    "verificationResult": "passed|failed",
    "comparison": {"before": "...", "after": "..."}
  }
```

**Decision Logic:**
- SUCCESS → Proceed to Phase 10 (Cleanup) → Phase 11 (Commit) → Phase 12 (Summary)
- FAILURE → Rollback fix, increment iteration, check max:
  - If iterations < 5: Return to Phase 3 (new hypotheses)
  - If iterations >= 5: Proceed to Failure Handling

---

## Phase 10: Cleanup

**Spawn Task subagent:**
```
subagent_type: general-purpose
model: haiku
prompt: |
  Read session file at: {sessionFilePath}

  Remove all debug instrumentation.

  1. Find markers: grep -rn "DEBUG_HYP" src/
  2. For each file with markers:
     - Remove DEBUG_HYP_*_START to DEBUG_HYP_*_END blocks
     - Remove log statements between markers
     - Preserve original code
  3. Check orphaned imports (remove if only used for debug)
  4. Run linter if configured
  5. Verify: grep -r "DEBUG_HYP" . (should be empty)

  DO NOT commit - orchestrator will commit after cleanup verification.

  Return:
  {
    "filesCleanedUp": [...],
    "markersRemoved": N,
    "verificationPassed": true
  }
```

---

## Phase 11: Final Commit

**Run in main context:**

After cleanup completes successfully, commit the verified, clean fix:

```bash
# Read session file to get confirmed hypothesis details
confirmedHyp=$(jq -r '.hypotheses[] | select(.status=="confirmed") | .id' {sessionFilePath})
hypDesc=$(jq -r '.hypotheses[] | select(.status=="confirmed") | .description' {sessionFilePath})

# Commit the clean fix with descriptive message
git add .
git commit -m "fix: Resolve ${confirmedHyp} - ${hypDesc}

Root cause: ${hypDesc}
Verified through hypothesis-driven investigation.
All instrumentation removed."

# Clean up session file
rm {sessionFilePath}
```

This ensures:
- Fix has been verified to work (Phase 9)
- All debug instrumentation removed (Phase 10)
- Commit contains only the actual fix, not temporary debug code
- Commit message references the confirmed hypothesis

---

## Phase 12: Success Summary

**Run in main context** - Display to user:

```markdown
# Investigation Summary

## Root Cause
{One sentence explanation from confirmed hypothesis}

## Research Findings
- Recommended: {approach from research}
- Sources: {cited URLs}

## Fix Applied
{Description of what was changed}

### Files Modified
- {file1}: {change description}
- {file2}: {change description}

## Verification
- Test: {passed/N of N runs passed}
- Original error: {absent}

## Key Learnings
{Insights for preventing similar issues}
```

---

## Failure Handling

When `iterationCount >= maxIterations`:

1. **Rollback all changes:**
   ```bash
   git reset --hard {initialCommit}
   ```

2. **Archive session:**
   ```bash
   mv {sessionFile} .claude/debug-sessions/archived/
   ```

3. **Generate failure report** (in main context):

```markdown
# Investigation Failure Report

## Issue
{Original issue description}

## Hypotheses Tested
{List all with status: confirmed/rejected/inconclusive}

## Fixes Attempted
{Each fix attempt with why it failed}

## Research Conducted
{Sources consulted, approaches tried}

## Recommended Next Steps
1. {Manual investigation suggestion}
2. {Different approach to try}
3. {Expert consultation needed}

## Artifacts
- Archived session: {path}
- Original logs: {path}
```

---

## Iteration Control

The orchestrator tracks:
- `iterationCount`: Incremented after each failed fix verification
- `maxIterations`: 5 (hard limit)
- `status`: active → fixing → verified/failed

**Loop flow:**
```
Intake → Session → Hypothesis → Instrument → Reproduce → Analyze
                      ↑                                    ↓
                      ← ← ← ← ← (if no confirmed) ← ← ← ← ←
                                                           ↓
                                                    (if confirmed)
                                                           ↓
                      Research → Fix → Verify → Cleanup → Commit → Summary
                         ↑              ↓ (fail)
                         ← ← ← ← ← ← ← ←
```

---

## Subagent Orchestration Rules

1. **Main context handles:**
   - User interaction (intake, confirmations)
   - Flow control decisions
   - Final summary display
   - Iteration count management

2. **Subagents handle:**
   - All file operations
   - Code analysis and modification
   - Test execution
   - Log parsing

3. **Session file is shared memory:**
   - Each subagent reads current state
   - Each subagent updates with its results
   - Orchestrator checks state between phases

4. **Model selection:**
   - Haiku: File ops, test running, cleanup (fast, cheap)
   - Sonnet: Research, verification (balanced reasoning)
   - Opus: Code analysis, hypothesis, fix application (deep reasoning)

5. **Context isolation:**
   - Each subagent runs in separate context
   - Only relevant data passed via session file
   - Results returned are summaries, not full context

---

## Quick Reference

**Start investigation:**
```
/investigate
```

**Subagent spawn pattern:**
```
Use Task tool with:
- subagent_type: general-purpose
- model: haiku|opus (based on complexity)
- prompt: Focused instructions for this phase
```

**Session file location:**
```
.claude/debug-sessions/{sessionId}.json
```

**Log file location:**
```
.claude/debug-sessions/{sessionId}-logs.txt
```

**Marker pattern:**
```
// DEBUG_HYP_{id}_START
[log statement]
// DEBUG_HYP_{id}_END
```
