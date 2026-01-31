---
name: debug
description: "Systematic debugging with hypothesis-driven instrumentation, automated log analysis, and web research. Use for bug investigation, flaky tests, or production issues. Triggers on: debug this, investigate bug, fix flaky test, troubleshoot issue."
---

# Debug Skill

Systematically debug issues through hypothesis-driven instrumentation, automated testing, and web research for fixes.

---

## The Job

You are a systematic debugging agent that follows the scientific method to identify and fix bugs. Your workflow:

1. **Intake**: Gather reproduction steps, error details, and detect flaky behavior
2. **Session Creation**: Create persistent debug session with git state snapshot
3. **Hypothesis Generation**: Automatically generate ranked hypotheses about root cause
4. **Instrumentation**: Add targeted logging to test each hypothesis
5. **Test Execution**: Run tests (automated or manual) to capture logs
6. **Analysis**: Analyze logs to confirm or reject hypotheses
7. **Research**: Web research for best practice fixes when hypothesis confirmed
8. **Fix & Verify**: Apply fix, verify it works, clean up instrumentation
9. **Rollback & Retry**: If fix fails, rollback and try next hypothesis (max 5 cycles)

All progress saved in `.claude/debug-sessions/[session-id].json` for resumption after interruptions.

---

## Invocation

Skill invoked via `/debug` command.

On invocation:
1. Check for existing session with same issue hash
2. If exists: prompt user to resume or start fresh
3. If new or user chooses fresh: begin intake process

---

## Intake Process

### Step 1: Gather Reproduction Steps

Prompt user for:
```
Please provide:

1. **Reproduction steps** - How to trigger the issue
2. **Expected behavior** - What should happen
3. **Actual behavior** - What actually happens
4. **Error messages/stack traces** - Any relevant error output
```

### Step 2: Detect Flaky Issues

Scan reproduction steps for flaky keywords:
- intermittent
- flaky
- sometimes
- occasionally
- randomly
- race condition
- timing

If detected, prompt:
```
This issue appears to be non-deterministic (flaky). To verify a fix works,
how many consecutive successful test runs do you require?

Default: 3 consecutive passes
Enter number (1-10):
```

If no flaky keywords detected, default success count = 1.

### Step 3: Create Debug Session

1. Capture initial git state:
   - Current commit SHA: `git rev-parse HEAD`
   - Current branch name: `git rev-parse --abbrev-ref HEAD`

2. Create session file using SessionManager:
   ```typescript
   const sessionId = generateSessionId(issueDescription);
   const session = sessionManager.createSession({
     sessionId,
     startTime: new Date().toISOString(),
     initialCommit: commitSHA,
     initialBranch: branchName,
     reproductionSteps,
     expectedBehavior,
     actualBehavior,
     errorMessages,
     flakySuccessCount: detectedFlaky ? userInputCount : 1
   });
   ```

3. Create temporary debug branch:
   ```bash
   git checkout -b debug-session-[session-id]
   ```

4. Store issue context in session file for hypothesis generation

---

## Session ID Format

Format: `debug-YYYYMMDD-HHMMSS-[8-char-hex-hash]`

Hash generated from:
- Issue description (reproduction steps + error messages)
- Allows detecting duplicate sessions

Example: `debug-20260131-143022-a3f5bc12`

---

## Session Storage

- Location: `.claude/debug-sessions/`
- Format: `[session-id].json`
- Contains full SessionState (see types.ts)

Session persists across interruptions. User can resume anytime by invoking `/debug` when matching session exists.

---

## Graceful Degradation

### Not in Git Repo

If not in a git repository:
1. Skip git state capture (initialCommit and initialBranch = null)
2. Create file snapshots at session start for rollback
3. Store snapshots in `.claude/debug-sessions/[session-id]/snapshots/`

### Manual Test Fallback

If automated test generation fails:
1. Generate numbered step-by-step manual script from reproduction steps
2. Include expected observations at each step
3. Prompt user to paste logs after manual reproduction

---

## Exit Codes

The debug skill returns these exit codes:

- `0`: Success - issue fixed and verified
- `1`: Failure - max iterations reached without fix
- `2`: User cancellation
- `3`: Internal error

---

## Next Steps

After intake completion, the orchestrator routes to:
- Hypothesis generation (US-005)
- Code analysis utilities (US-003, US-004)

Future iterations will implement the full debug loop.

---

## Important Notes

- **Session persistence** allows resuming after context resets
- **Flaky detection** ensures fixes are verified with sufficient confidence
- **Git branching** isolates debug work from main codebase
- **Non-blocking rollback** preserves instrumentation across cycles
