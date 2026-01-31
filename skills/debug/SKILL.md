---
name: debug
description: "Systematic debugging skill with hypothesis-driven investigation, automated instrumentation, and verification. Debugs runtime errors, logic bugs, intermittent issues, and cross-service problems across all programming languages. Use when you need to diagnose and fix unexpected behavior. Triggers on: /debug, debug this, help debug, fix this bug"
---

# Debug Skill

A systematic, hypothesis-driven debugging tool that diagnoses and fixes issues through structured investigation, targeted instrumentation, and rigorous verification.

---

## The Job

The debug skill implements a complete debugging workflow:

1. **Intake** - Gather detailed reproduction information
2. **Session Persistence** - Initialize and maintain debug session state
3. **Hypothesis Generation** - Identify ranked potential root causes with confidence scores
4. **Multi-File Tracking** - Track dependencies across related files
5. **Logging Review** - Assess existing logging infrastructure to avoid conflicts
6. **Instrumentation** - Add language-appropriate debug logging with markers
7. **Reproduction** - Execute automated tests or guide manual reproduction
8. **Flaky Test Handling** - Handle intermittent issues with multiple test runs
9. **Log Analysis** - Parse logs, confirm/reject hypotheses, generate new ones if needed
10. **Web Research** - Research confirmed issues for best practices
11. **Fix Application** - Apply research-informed complete fixes
12. **Fix Verification** - Verify fix resolves the issue or rollback
13. **Instrumentation Cleanup** - Remove all debug logging after successful fix
14. **Success Summary** - Generate learning summary with code snippets and sources
15. **Rollback Handling** - Handle max iterations gracefully with comprehensive context

---

## Debug Cycle Overview

The skill operates in distinct, repeatable phases:

### Phase 1: Issue Intake
- Gather reproduction steps, expected behavior, actual behavior, error messages
- Identify if issue is flaky/intermittent (affects verification approach)
- Create structured context for analysis

### Phase 2: Session Setup
- Initialize debug session with unique ID
- Capture initial git state before any changes
- Store session metadata for resumption capability

### Phase 3: Hypothesis Generation (5 iterations maximum)
- Analyze error patterns, code structure, common failure modes
- Generate 3-5 ranked hypotheses with specific file locations and line ranges
- Calculate confidence scores for internal ranking
- Track all affected files for each hypothesis

### Phase 4: Instrumentation
- Review existing logging infrastructure
- Add language-appropriate debug logging
- Mark instrumentation with unique markers: `// DEBUG_HYP_N_START` and `// DEBUG_HYP_N_END`
- Log: variable values, execution paths, timing data
- Preserve code style and indentation

### Phase 5: Reproduction & Log Collection
- For automatable issues: generate and run test case
- For manual issues: generate step-by-step test script
- Capture all output and logs
- Handle flaky tests by running N times for verification

### Phase 6: Log Analysis & Iteration
- Parse instrumentation markers from logs
- Extract variable values, execution flow, timing
- Mark each hypothesis: confirmed, rejected, or inconclusive
- If no confirmed hypothesis: generate 2-3 new hypotheses from log insights
- Loop back to Phase 4 until confirmation or max iterations

### Phase 7: Research & Fix Development
- Search for confirmed issue pattern using current practices
- Prioritize: official docs > GitHub issues > Stack Overflow > recent blogs
- Identify: recommended approaches, security implications, deprecated solutions
- Generate complete (not partial) fixes based on research findings

### Phase 8: Fix Verification
- Re-run tests or manual reproduction
- Compare new logs to original issue logs
- If resolved: proceed to cleanup
- If failed: rollback only the fix (keep instrumentation) and return to Phase 3

### Phase 9: Cleanup
- Search for all hypothesis marker comments
- Remove instrumentation while preserving original code
- Verify no orphaned imports or variables
- Run linter/formatter if configured

### Phase 10: Summary & Completion
- Generate success summary with root cause, research findings, fix, and verification results
- Include code snippets showing before/after
- List all tested hypotheses (confirmed vs rejected)
- Cite sources used for fix approach
- Provide test location if automated reproduction

---

## Issue Types Supported

The skill handles debugging across these categories:

- **Runtime Errors**: Null references, type errors, assertion failures, exceptions
- **Logic Bugs**: Incorrect calculations, off-by-one errors, wrong conditionals, state issues
- **Cross-Service Issues**: API integration failures, distributed system issues, async coordination
- **Intermittent/Flaky**: Race conditions, timing-dependent behavior, environment-sensitive issues
- **Performance**: Slowdowns, timeouts, resource leaks, inefficient algorithms
- **Integration**: Component interaction issues, data flow problems, dependency issues

---

## Language Support

The skill is language-agnostic and implements language-adaptive instrumentation:

- **JavaScript/TypeScript**: `console.log()`, `console.error()`, structured logging libraries
- **Python**: `logging` module, `print()` fallback
- **Java/Kotlin**: `System.out.println()`, `Logger` frameworks
- **Go**: `fmt.Println()`, `log` package
- **C/C++**: `printf()`, `std::cout`, logging frameworks
- **Ruby**: `puts`, `logger` libraries
- **PHP**: `echo`, `error_log()`, `var_dump()`
- **Others**: Adapts to language conventions and available logging mechanisms

---

## Skill Scope

### What This Skill Does
- Diagnoses root causes through systematic investigation
- Tracks issues across multiple files and dependencies
- Generates complete, research-informed fixes
- Verifies fixes resolve the issue
- Handles flaky/intermittent issues properly
- Provides learning context and sources

### What This Skill Does NOT Do
- Refactor entire codebases
- Implement new features
- Rewrite large sections of code without evidence-based justification
- Make changes outside the scope of the identified issue
- Deploy fixes to production (user responsibility)

---

## Key Principles

1. **Hypothesis-Driven**: Every investigation is driven by testable hypotheses about root causes
2. **Evidence-Based**: All conclusions are supported by log evidence and testing
3. **Language-Adaptive**: Uses language-appropriate idioms and logging patterns
4. **Non-Destructive**: Instrumentation is reversible; rollback capability always available
5. **Traceable**: All changes marked with unique identifiers for audit trail
6. **Complete Fixes**: Never applies partial or symptomatic fixes
7. **Informed Fixes**: Leverages current best practices and research before implementation
8. **Verifiable**: All fixes are verified through reproduction and testing
9. **Multi-Iteration**: Allows up to 5 debug cycles before graceful failure
10. **Stateful**: Maintains session state for resumption and recovery

---

## Session Persistence

The skill maintains persistent session state at `.claude/debug-sessions/[session-id].json`:

```json
{
  "sessionId": "sess_123abc",
  "startTime": "2025-01-31T10:30:00Z",
  "initialCommit": "abc1234def5678",
  "issueDescription": "App crashes when uploading large files",
  "reproductionSteps": ["1. Click upload button", "2. Select 500MB file", "3. Observe crash"],
  "expectedBehavior": "File uploads successfully with progress indicator",
  "actualBehavior": "Application crashes with memory error",
  "hypothesis": [
    {
      "id": "HYP_1",
      "description": "Memory buffer not sized for large uploads",
      "files": ["src/upload.ts", "src/memory/buffer.ts"],
      "lines": ["src/upload.ts:45-60", "src/memory/buffer.ts:10-30"],
      "confidence": 0.85,
      "status": "pending"
    }
  ],
  "logs": {
    "instrumentation": [...],
    "reproduction": [...]
  },
  "findings": [...],
  "iterationCount": 1,
  "maxIterations": 5
}
```

Sessions are automatically deleted after successful completion or rollback.

---

## Flaky Test Handling

For intermittent issues, the skill:

1. Detects flaky/intermittent keywords in issue description
2. Prompts user to specify success count (default: 1)
3. Runs test N times, tracking consecutive pass/fail results
4. Proceeds only if test passes N consecutive times
5. If failures occur during N-run verification, returns to hypothesis generation

Example:
- Issue: "Tests fail intermittently in CI"
- Success count: 5 (must pass 5 times consecutively)
- Runs test, gets: PASS, PASS, PASS, FAIL, PASS, PASS, PASS, PASS, PASS
- After 9 runs, achieves 5 consecutive passes, proceeds to cleanup

---

## Max Iterations Handling

If 5 debug cycles complete without successful fix:

1. Perform complete rollback to initial state
2. Remove all commits (instrumentation, fixes, cleanup attempts)
3. Generate comprehensive failure summary including:
   - Original issue description
   - All hypotheses tested with confidence scores
   - Research findings from each iteration
   - All fixes attempted with verification results
   - Why each fix failed
   - Final instrumentation logs
4. Save failure summary to `.claude/debug-sessions/FAILURE-[session-id].md`
5. Delete session file
6. Return non-zero exit code
7. Provide user with failure context for manual investigation

---

## Instrumentation Markers

All debug logging uses unique markers for reliable detection and removal:

```typescript
// DEBUG_HYP_1_START - Hypothesis ID marker
console.log("HYP_1: Starting upload with file size:", fileSize);
// ... debug logging statements ...
// DEBUG_HYP_1_END - Cleanup anchor point
```

Markers allow:
- Reliable location of all instrumentation
- Isolation of specific hypothesis investigations
- Clean removal without affecting surrounding code
- Audit trail of what was tested

---

## Exit Conditions

The skill completes successfully when:
- Issue is diagnosed and root cause confirmed
- Fix is applied and verified through testing
- All instrumentation is removed
- Success summary is generated
- All temporary state is cleaned up

The skill fails gracefully when:
- 5 debug iterations complete without success
- User determines issue is out of scope
- Environment/setup issues prevent reproduction
- At which point comprehensive context is preserved for manual debugging

