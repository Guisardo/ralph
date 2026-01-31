---
name: debug
description: "Systematic debugging skill with hypothesis-driven investigation, automated instrumentation, and verification. Debugs runtime errors, logic bugs, intermittent issues, and cross-service problems across all programming languages. Use when you need to diagnose and fix unexpected behavior. Triggers on: /debug, debug this, help debug, fix this bug"
---

# Debug Skill

A systematic, hypothesis-driven debugging tool that diagnoses and fixes issues through structured investigation, targeted instrumentation, and rigorous verification.

---

## Intake Phase Template

When the /debug skill is invoked, use this structured template to gather comprehensive issue information.

### Step 1: Issue Classification

Ask the user:

> **What type of issue are you experiencing?**
>
> 1. Runtime Error (crash, exception, null reference)
> 2. Logic Bug (incorrect behavior, wrong output)
> 3. Intermittent/Flaky Issue (sometimes works, sometimes fails)
> 4. Performance Issue (slowness, timeout, resource leak)
> 5. Cross-Service/Integration Issue (API failure, distributed system problem)
> 6. Other (please describe)

### Step 2: Reproduction Steps

Guide the user with:

> **Please provide step-by-step reproduction instructions:**
>
> Example format:
> ```
> 1. Navigate to /upload page
> 2. Click "Choose File" button
> 3. Select a file larger than 100MB
> 4. Click "Upload" button
> 5. Observe the error message
> ```
>
> Your reproduction steps:

**Good Example:**
```
1. Start the application with NODE_ENV=production
2. Call POST /api/users with payload {"name": "test", "email": null}
3. Observe 500 error in response
4. Check server logs for stack trace
```

**Poor Example (too vague):**
```
The API doesn't work when I send bad data
```

### Step 3: Expected vs Actual Behavior

Guide the user with:

> **What did you expect to happen?**
>
> (Describe the correct/desired behavior in detail)
>
> **What actually happened?**
>
> (Describe the incorrect behavior you observed)

**Good Example:**
- Expected: "API should return 400 Bad Request with validation error message: 'email field is required'"
- Actual: "API returns 500 Internal Server Error with no error message. Server crashes and restarts."

**Poor Example:**
- Expected: "It should work"
- Actual: "It doesn't work"

### Step 4: Error Messages and Logs

Guide the user with:

> **Please provide any error messages, stack traces, or log output:**
>
> (Copy the full error text, including line numbers and file paths if available)
>
> Example:
> ```
> TypeError: Cannot read property 'id' of null
>   at UserController.create (src/controllers/user.ts:45:23)
>   at Router.handle (node_modules/express/lib/router/index.js:284:9)
> ```

### Step 5: Flaky/Intermittent Detection

**Automatically scan the user's description for these keywords:**
- "flaky", "flake", "flakiness"
- "intermittent", "intermittently"
- "sometimes", "occasionally"
- "randomly", "random"
- "inconsistent", "inconsistently"
- "race condition"
- "timing", "time-dependent"
- "can't reproduce consistently"
- "works locally but fails in CI"

**If ANY keywords are detected, ask:**

> **This issue appears to be intermittent/flaky. To verify a fix, how many consecutive successful test runs do you need?**
>
> (Default: 5 consecutive passes)
>
> Your success count:

Store this value in the session as `successCount` (default: 1 for deterministic issues).

### Step 6: Environment and Context

Guide the user with:

> **Additional context (optional but helpful):**
>
> - Language/framework version (e.g., Node.js 18.x, Python 3.11)
> - Operating system (macOS, Linux, Windows)
> - When did this start happening? (always, after a recent change, after deployment)
> - Any recent changes to the codebase?
> - Does this happen in specific environments? (local, staging, production)

### Step 7: Structured Session Initialization

After gathering all information, initialize the session file at `.claude/debug-sessions/[session-id].json` with this structure:

```json
{
  "sessionId": "sess_<timestamp>_<random>",
  "startTime": "<ISO 8601 timestamp>",
  "initialCommit": "<git HEAD commit hash>",
  "issueType": "<type from Step 1>",
  "reproductionSteps": [
    "Step 1: ...",
    "Step 2: ..."
  ],
  "expectedBehavior": "<expected behavior from Step 3>",
  "actualBehavior": "<actual behavior from Step 3>",
  "errorMessages": [
    "<error message from Step 4>"
  ],
  "isFlaky": true/false,
  "successCount": 1 or <user-specified count>,
  "environment": {
    "language": "<detected or user-provided>",
    "framework": "<detected or user-provided>",
    "os": "<detected or user-provided>"
  },
  "additionalContext": "<Step 6 notes>",
  "hypotheses": [],
  "logs": {
    "instrumentation": [],
    "reproduction": []
  },
  "findings": [],
  "iterationCount": 0,
  "maxIterations": 5,
  "researchFindings": [],
  "fixesAttempted": []
}
```

### Step 8: Confirmation

Show the user a summary and confirm before proceeding:

> **Debug Session Initialized**
>
> - Session ID: `sess_<id>`
> - Issue Type: `<type>`
> - Flaky: `<yes/no>`
> - Success Count: `<N>`
> - Initial Commit: `<hash>`
>
> I will now begin hypothesis generation and instrumentation. You can resume this session later if needed using session ID: `sess_<id>`
>
> Ready to proceed? (yes/no)

### Template Usage Pattern

```
1. User invokes: /debug or "debug this issue"
2. Claude uses Intake Phase Template (Steps 1-8)
3. Session file created at .claude/debug-sessions/[session-id].json
4. Proceed to Hypothesis Generation Phase
```

---

## Session Persistence Workflow Template

This template defines how debug session state is created, maintained, updated, and cleaned up throughout the debugging process.

### Session Lifecycle Overview

```
1. Initialization → Create session file with initial state
2. Git Capture → Record commit before any changes
3. Updates → Append state after each major step
4. Completion → Delete session file after success
5. Rollback → Delete session file after full rollback
```

### Step 1: Session File Initialization

**When**: Immediately after completing Step 7 of Intake Phase (before Step 8 confirmation)

**Action**: Create the session directory and file

```bash
# Create debug sessions directory if it doesn't exist
mkdir -p .claude/debug-sessions

# Generate session ID format: sess_<timestamp>_<random_hex>
# Example: sess_1738308000_a3f9e2c1
SESSION_ID="sess_$(date +%s)_$(openssl rand -hex 4)"

# Create session file
touch ".claude/debug-sessions/${SESSION_ID}.json"
```

**Template for initial session content**:

```json
{
  "sessionId": "sess_<timestamp>_<random>",
  "startTime": "<ISO 8601 timestamp, e.g., 2025-01-31T10:30:00Z>",
  "initialCommit": null,
  "issueType": "<from Intake Step 1>",
  "reproductionSteps": [
    "<from Intake Step 2>"
  ],
  "expectedBehavior": "<from Intake Step 3>",
  "actualBehavior": "<from Intake Step 3>",
  "errorMessages": [
    "<from Intake Step 4>"
  ],
  "isFlaky": true/false,
  "successCount": 1,
  "environment": {
    "language": "<detected or user-provided>",
    "framework": "<detected or user-provided>",
    "os": "<detected or user-provided>",
    "cwd": "<current working directory>"
  },
  "additionalContext": "<from Intake Step 6>",
  "hypotheses": [],
  "logs": {
    "instrumentation": [],
    "reproduction": []
  },
  "findings": [],
  "iterationCount": 0,
  "maxIterations": 5,
  "researchFindings": [],
  "fixesAttempted": [],
  "commits": {
    "instrumentation": [],
    "fixes": [],
    "cleanup": []
  },
  "status": "initialized"
}
```

### Step 2: Capture Initial Git State

**When**: Immediately after session file creation, before any code changes

**Action**: Record the current git commit hash

```bash
# Capture current HEAD commit
INITIAL_COMMIT=$(git rev-parse HEAD)

# Update session file with initial commit
# Use jq or similar JSON tool to update the initialCommit field
```

**Why this matters**: This commit hash is the rollback point if debugging fails. All changes made during debugging are relative to this commit.

**Template update**:

```json
{
  "sessionId": "sess_123abc",
  "startTime": "2025-01-31T10:30:00Z",
  "initialCommit": "abc1234def5678",  // ← Updated with git HEAD
  "status": "git_captured",
  // ... rest of session data
}
```

### Step 3: Session Updates During Debug Workflow

**When**: After each major workflow step (hypothesis generation, instrumentation, fix application, etc.)

**What to update**: Append new state to appropriate arrays and update status

#### After Hypothesis Generation

```json
{
  // ... existing fields
  "hypotheses": [
    {
      "id": "HYP_1",
      "description": "Memory buffer not sized correctly for large uploads",
      "files": ["src/upload.ts", "src/memory/buffer.ts"],
      "lineRanges": {
        "src/upload.ts": "45-60",
        "src/memory/buffer.ts": "10-30"
      },
      "confidence": 0.85,
      "status": "pending",
      "generatedAt": "2025-01-31T10:32:00Z"
    },
    {
      "id": "HYP_2",
      "description": "Stream pipeline closes prematurely on network timeout",
      "files": ["src/upload.ts", "src/network/stream.ts"],
      "lineRanges": {
        "src/upload.ts": "70-85",
        "src/network/stream.ts": "120-150"
      },
      "confidence": 0.65,
      "status": "pending",
      "generatedAt": "2025-01-31T10:32:00Z"
    }
  ],
  "iterationCount": 1,
  "status": "hypothesis_generated"
}
```

#### After Instrumentation

```json
{
  // ... existing fields
  "logs": {
    "instrumentation": [
      {
        "hypothesisId": "HYP_1",
        "files": ["src/upload.ts", "src/memory/buffer.ts"],
        "markerComments": [
          "// DEBUG_HYP_1_START",
          "// DEBUG_HYP_1_END"
        ],
        "instrumentedAt": "2025-01-31T10:35:00Z"
      }
    ],
    "reproduction": []
  },
  "commits": {
    "instrumentation": [
      {
        "commit": "def5678abc9012",
        "hypothesisId": "HYP_1",
        "message": "debug: Add instrumentation for HYP_1",
        "timestamp": "2025-01-31T10:36:00Z"
      }
    ],
    "fixes": [],
    "cleanup": []
  },
  "status": "instrumented"
}
```

#### After Log Analysis

```json
{
  // ... existing fields
  "hypotheses": [
    {
      "id": "HYP_1",
      "status": "confirmed",  // ← Updated from "pending"
      "confirmedAt": "2025-01-31T10:40:00Z",
      "evidence": "Log shows buffer allocation of 10MB but file size is 500MB"
    },
    {
      "id": "HYP_2",
      "status": "rejected",  // ← Updated from "pending"
      "rejectedAt": "2025-01-31T10:40:00Z",
      "evidence": "Logs show stream closes normally after completion, no premature closure"
    }
  ],
  "findings": [
    {
      "hypothesisId": "HYP_1",
      "finding": "Buffer overflow detected: allocated 10MB, received 500MB",
      "evidence": "src/memory/buffer.ts:15 log output: 'HYP_1: bufferSize=10485760, fileSize=524288000'",
      "timestamp": "2025-01-31T10:40:00Z"
    }
  ],
  "logs": {
    "instrumentation": [...],
    "reproduction": [
      {
        "hypothesisId": "HYP_1",
        "output": "<captured log output from test run>",
        "executedAt": "2025-01-31T10:38:00Z"
      }
    ]
  },
  "status": "hypothesis_confirmed"
}
```

#### After Web Research

```json
{
  // ... existing fields
  "researchFindings": [
    {
      "hypothesisId": "HYP_1",
      "query": "Node.js buffer large file upload memory allocation best practice",
      "sources": [
        {
          "title": "Handling Large File Uploads in Node.js",
          "url": "https://nodejs.org/en/docs/guides/large-file-upload",
          "type": "official_docs",
          "relevance": "high",
          "keyPoints": [
            "Use streaming APIs instead of loading entire file into memory",
            "Configure multer maxFileSize and buffer limits",
            "Implement chunked uploads for files > 100MB"
          ]
        }
      ],
      "recommendedApproach": "Implement streaming upload with chunked processing",
      "securityConsiderations": "Validate chunk sizes to prevent DoS attacks",
      "deprecatedSolutions": ["Loading entire file into Buffer"],
      "researchedAt": "2025-01-31T10:42:00Z"
    }
  ],
  "status": "research_complete"
}
```

#### After Fix Application

```json
{
  // ... existing fields
  "fixesAttempted": [
    {
      "hypothesisId": "HYP_1",
      "description": "Implemented streaming upload with 10MB chunk processing",
      "files": ["src/upload.ts", "src/memory/buffer.ts"],
      "approach": "Replaced Buffer.from() with stream pipeline, added chunk size configuration",
      "researchBased": true,
      "appliedAt": "2025-01-31T10:45:00Z"
    }
  ],
  "commits": {
    "instrumentation": [...],
    "fixes": [
      {
        "commit": "789abc012def345",
        "hypothesisId": "HYP_1",
        "message": "fix: Implement streaming upload for large files (HYP_1)",
        "timestamp": "2025-01-31T10:46:00Z"
      }
    ],
    "cleanup": []
  },
  "status": "fix_applied"
}
```

#### After Fix Verification (Success)

```json
{
  // ... existing fields
  "fixesAttempted": [
    {
      "hypothesisId": "HYP_1",
      "description": "Implemented streaming upload with 10MB chunk processing",
      "verificationStatus": "success",  // ← Added
      "verificationOutput": "Test passed: 500MB file uploaded successfully without crash",
      "verifiedAt": "2025-01-31T10:50:00Z"
    }
  ],
  "status": "fix_verified"
}
```

#### After Fix Verification (Failure - Rollback)

```json
{
  // ... existing fields
  "fixesAttempted": [
    {
      "hypothesisId": "HYP_1",
      "description": "Implemented streaming upload with 10MB chunk processing",
      "verificationStatus": "failed",  // ← Fix didn't work
      "verificationOutput": "Test failed: Still crashes with memory error",
      "verifiedAt": "2025-01-31T10:50:00Z",
      "rolledBack": true,
      "rollbackCommit": "def5678abc9012",  // ← Rolled back to instrumentation commit
      "rolledBackAt": "2025-01-31T10:51:00Z"
    }
  ],
  "iterationCount": 2,  // ← Increment for next iteration
  "status": "fix_rolled_back"
}
```

#### After Cleanup (Success Path)

```json
{
  // ... existing fields
  "commits": {
    "instrumentation": [...],
    "fixes": [...],
    "cleanup": [
      {
        "commit": "012def345abc678",
        "message": "chore: Remove debug instrumentation for HYP_1",
        "filesAffected": ["src/upload.ts", "src/memory/buffer.ts"],
        "timestamp": "2025-01-31T10:55:00Z"
      }
    ]
  },
  "status": "cleanup_complete"
}
```

### Step 4: Session Deletion After Successful Completion

**When**: After cleanup commit succeeds and success summary is generated

**Action**: Delete the session file

```bash
# Remove session file
rm ".claude/debug-sessions/${SESSION_ID}.json"
```

**Why**: Session state is no longer needed after successful completion. All changes are committed and the issue is resolved.

### Step 5: Session Deletion After Rollback (Max Iterations)

**When**: After complete rollback to initial commit when max iterations (5) are reached

**Action**:
1. Create failure summary file
2. Delete session file

```bash
# Create failure summary document
cat > ".claude/debug-sessions/FAILURE-${SESSION_ID}.md" << EOF
# Debug Session Failure: ${SESSION_ID}

## Original Issue
<issue description from session>

## Hypotheses Tested
<list all hypotheses with confidence scores and status>

## Research Findings
<summarize research from all iterations>

## Fixes Attempted
<list all fixes with verification results>

## Why Each Fix Failed
<explain failure reasons>

## Final State
- Initial Commit: <hash>
- Iterations Completed: 5
- Status: Failed - max iterations reached

## Next Steps
<suggestions for manual debugging based on evidence>
EOF

# Delete session file after creating failure summary
rm ".claude/debug-sessions/${SESSION_ID}.json"
```

**Why**: Failure context is preserved in markdown format for human review, but active session state is cleaned up.

### Session Schema Reference

Complete session file schema with all fields:

```typescript
interface DebugSession {
  // Identity & Metadata
  sessionId: string;                    // sess_<timestamp>_<random>
  startTime: string;                    // ISO 8601
  initialCommit: string | null;         // git HEAD before changes
  status: SessionStatus;                // Current workflow state

  // Issue Information
  issueType: string;
  reproductionSteps: string[];
  expectedBehavior: string;
  actualBehavior: string;
  errorMessages: string[];
  isFlaky: boolean;
  successCount: number;                 // 1 for deterministic, N for flaky

  // Environment
  environment: {
    language: string;
    framework: string;
    os: string;
    cwd: string;
  };
  additionalContext: string;

  // Debug State
  hypotheses: Hypothesis[];
  logs: {
    instrumentation: InstrumentationLog[];
    reproduction: ReproductionLog[];
  };
  findings: Finding[];
  iterationCount: number;               // Current iteration (0-5)
  maxIterations: number;                // Always 5

  // Research & Fixes
  researchFindings: ResearchFinding[];
  fixesAttempted: FixAttempt[];

  // Git Tracking
  commits: {
    instrumentation: CommitRecord[];
    fixes: CommitRecord[];
    cleanup: CommitRecord[];
  };
}

type SessionStatus =
  | "initialized"              // Session created, awaiting git capture
  | "git_captured"             // Initial commit recorded
  | "hypothesis_generated"     // Hypotheses generated for current iteration
  | "instrumented"             // Debug logging added
  | "reproduction_run"         // Test executed, logs captured
  | "hypothesis_confirmed"     // At least one hypothesis confirmed by logs
  | "hypothesis_rejected"      // All hypotheses rejected, need new iteration
  | "research_complete"        // Web research finished
  | "fix_applied"              // Fix committed
  | "fix_verified"             // Fix verified successful
  | "fix_rolled_back"          // Fix failed, rolled back to instrumentation
  | "cleanup_complete"         // All instrumentation removed
  | "success"                  // Issue resolved
  | "failed"                   // Max iterations reached without success
```

### Session File Access Patterns

**Reading session during workflow**:

```bash
# Load current session state
SESSION_DATA=$(cat ".claude/debug-sessions/${SESSION_ID}.json")
```

**Updating session during workflow**:

```bash
# Update session with new data (using jq or similar)
jq '.status = "hypothesis_generated" | .iterationCount = 1' \
  ".claude/debug-sessions/${SESSION_ID}.json" > temp.json
mv temp.json ".claude/debug-sessions/${SESSION_ID}.json"
```

**Listing active sessions** (for resume capability):

```bash
# Show all active debug sessions
ls -1 .claude/debug-sessions/*.json 2>/dev/null || echo "No active sessions"
```

### Resume Capability Template

If a user wants to resume a previous session:

```bash
# User provides: /debug resume sess_123abc

# 1. Verify session file exists
if [ ! -f ".claude/debug-sessions/sess_123abc.json" ]; then
  echo "Error: Session sess_123abc not found"
  exit 1
fi

# 2. Load session state
SESSION_DATA=$(cat ".claude/debug-sessions/sess_123abc.json")

# 3. Display session summary
echo "Resuming debug session: sess_123abc"
echo "Started: <startTime from session>"
echo "Issue: <issueType from session>"
echo "Current Status: <status from session>"
echo "Iteration: <iterationCount from session> of <maxIterations>"

# 4. Continue from current status
# - If status = "instrumented": proceed to reproduction
# - If status = "fix_applied": proceed to verification
# - etc.
```

### Important Notes

1. **Always update session before git commits**: Update session state before making commits so commit hashes can be tracked

2. **Atomic updates**: When updating session, write to temp file first, then move to avoid corruption:
   ```bash
   jq '.field = "value"' session.json > session.tmp && mv session.tmp session.json
   ```

3. **Validate session integrity**: Before each phase, verify session file is valid JSON and contains required fields

4. **Session cleanup is mandatory**: ALWAYS delete session files after completion or rollback to avoid stale state

5. **Timestamps use ISO 8601**: All timestamps in session must be ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ)

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

