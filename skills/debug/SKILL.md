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

## Hypothesis Generation Workflow Template

This template defines how to systematically generate, rank, and track hypotheses about the root cause of an issue. The goal is to produce 3-5 testable hypotheses with specific file locations, line ranges, and confidence scores for internal prioritization.

### Hypothesis Generation Overview

```
1. Analyze Inputs → Review issue context, error messages, code structure
2. Identify Patterns → Match against common failure mode categories
3. Locate Suspects → Find specific files and line ranges
4. Rank Hypotheses → Calculate confidence scores for prioritization
5. Format Output → Structure hypotheses for tracking and instrumentation
```

### Step 1: Analyze Available Information

**When**: After session initialization with git state captured (status = "git_captured")

**Inputs to analyze**:

1. **Issue Context** (from Intake Phase):
   - `issueType`: Runtime Error, Logic Bug, Intermittent, Cross-Service, etc.
   - `reproductionSteps`: Sequence of actions that trigger the issue
   - `expectedBehavior`: What should happen
   - `actualBehavior`: What actually happens
   - `errorMessages`: Stack traces, error codes, log output

2. **Code Structure** (from codebase analysis):
   - Files mentioned in error messages/stack traces
   - Entry points referenced in reproduction steps
   - Related files (imports, dependencies, shared modules)

3. **Environment Context**:
   - Language/framework in use
   - Version information
   - Configuration that might affect behavior

**Template for analysis prompt**:

```
Given the following debug session context:

ISSUE TYPE: <issueType>

REPRODUCTION STEPS:
<reproductionSteps as numbered list>

EXPECTED BEHAVIOR:
<expectedBehavior>

ACTUAL BEHAVIOR:
<actualBehavior>

ERROR MESSAGES:
<errorMessages>

ENVIRONMENT:
- Language: <language>
- Framework: <framework>

Analyze this information to identify:
1. Primary error location (file and line from stack trace)
2. Code path leading to the error (call chain)
3. Variables and state involved
4. Potential failure mode category
```

### Step 2: Match Against Failure Mode Categories

**Failure Mode Reference**: Use this taxonomy to classify potential root causes.

#### Category 1: Null/Undefined Reference Errors

**Indicators**:
- Error messages: "Cannot read property of null/undefined", "NullPointerException", "None has no attribute"
- Variable access without prior null check
- Optional/nullable values used without guards
- Database queries returning no results

**Analysis questions**:
- Which variable is null?
- Where was it expected to be assigned?
- Is the null condition expected or exceptional?
- Is there missing validation at data boundaries?

**Common locations**:
- API response handlers
- Database query result processing
- Configuration loading
- User input processing

#### Category 2: Race Conditions / Timing Issues

**Indicators**:
- Intermittent failures ("works sometimes")
- Errors only in production/CI (faster/slower than local)
- Multiple threads/processes accessing shared state
- Async operations with unclear ordering
- "works locally but fails in CI" (timing-dependent)

**Analysis questions**:
- Are there concurrent operations modifying shared state?
- Is there async/await or Promise handling that might race?
- Are there database transactions without proper isolation?
- Are there cache invalidation timing issues?

**Common locations**:
- Shared state initialization
- Database transaction boundaries
- Cache operations
- Event handlers
- WebSocket/real-time features

#### Category 3: Logic Errors / Incorrect Algorithms

**Indicators**:
- Wrong output (not crash, just incorrect results)
- Off-by-one errors in loops/arrays
- Incorrect conditionals (wrong operator, inverted logic)
- State machine in invalid state
- Calculation/formula errors

**Analysis questions**:
- What is the expected vs actual output?
- Are there boundary conditions being handled incorrectly?
- Is there complex conditional logic that might have edge cases?
- Are there mathematical operations that might overflow/underflow?

**Common locations**:
- Loop bounds and iterations
- Conditional branches
- Data transformations
- Business logic calculations
- State transitions

#### Category 4: Cross-Service / Integration Errors

**Indicators**:
- Errors after external API calls
- Timeout or connection errors
- Data format mismatches between systems
- Authentication/authorization failures
- Contract violations

**Analysis questions**:
- Which external service is involved?
- Is the request format correct?
- Is the response being parsed correctly?
- Are error responses handled properly?
- Are there retry/fallback mechanisms?

**Common locations**:
- API client code
- Request/response serialization
- Error handling for external calls
- Configuration for external endpoints
- Authentication token management

#### Category 5: Resource Management Errors

**Indicators**:
- Memory errors (out of memory, buffer overflow)
- File handle leaks
- Connection pool exhaustion
- Timeout due to resource starvation

**Analysis questions**:
- Are resources being properly closed/released?
- Are there loops that accumulate resources?
- Is there proper cleanup in error paths?
- Are there limits on resource consumption?

**Common locations**:
- File I/O operations
- Database connection management
- Network socket handling
- Stream processing
- Large data processing

#### Category 6: Configuration / Environment Errors

**Indicators**:
- Different behavior across environments
- Missing or wrong configuration values
- Environment variable issues
- Dependency version mismatches

**Analysis questions**:
- Are all required config values present?
- Are environment-specific configs correct?
- Are there hardcoded values that should be configurable?
- Are dependency versions compatible?

**Common locations**:
- Configuration loading code
- Environment detection logic
- Dependency injection setup
- Build/deployment scripts

### Step 3: Generate Hypotheses with File Locations

**Template for hypothesis generation**:

For each potential root cause identified, generate a hypothesis with:

```json
{
  "id": "HYP_<N>",
  "category": "<failure_mode_category>",
  "description": "<specific, testable description of what might be wrong>",
  "rationale": "<why this is suspected based on evidence>",
  "files": [
    "<file_path_1>",
    "<file_path_2>"
  ],
  "lineRanges": {
    "<file_path_1>": "<start_line>-<end_line>",
    "<file_path_2>": "<start_line>-<end_line>"
  },
  "variablesToInspect": [
    "<variable_name_1>",
    "<variable_name_2>"
  ],
  "expectedEvidence": "<what log output would confirm this hypothesis>",
  "confidence": <0.0-1.0>,
  "status": "pending"
}
```

**Locating specific files and lines**:

1. **From stack traces**: Extract file paths and line numbers directly
   ```
   at UserController.create (src/controllers/user.ts:45:23)
   → File: src/controllers/user.ts, Line: 45, expand to range: 40-55
   ```

2. **From reproduction steps**: Identify entry points
   ```
   "Navigate to /upload page" → Find route handler for /upload
   → Likely: src/routes/upload.ts or src/pages/upload.tsx
   ```

3. **From imports**: Trace dependencies
   ```
   src/controllers/user.ts imports from src/services/database.ts
   → Include both files if database interaction is suspected
   ```

4. **Expand line ranges**: Include context around suspect lines
   - Function boundaries (include entire function)
   - 10-15 lines before/after for context
   - Related conditional blocks

### Step 4: Calculate Confidence Scores

**Confidence score calculation** (0.0 to 1.0 scale, for internal ranking only - not shown to user):

Calculate based on evidence strength:

| Factor | Weight | Description |
|--------|--------|-------------|
| Direct stack trace match | +0.30 | File/line appears in error stack |
| Error message pattern match | +0.20 | Error message matches failure category |
| Reproduction path match | +0.15 | File is on the code path from reproduction steps |
| Historical pattern | +0.15 | Similar issues found in this file/area before |
| Code smell indicators | +0.10 | Missing null checks, unhandled promises, etc. |
| Environmental correlation | +0.10 | Issue matches environment-specific conditions |

**Example confidence calculations**:

```
HYP_1: Null reference in user.ts:45
- Stack trace points directly to line: +0.30
- Error is "Cannot read property of null": +0.20
- user.ts is in reproduction path: +0.15
- Code has no null check before access: +0.10
Total: 0.75 (high confidence)

HYP_2: Race condition in cache.ts:120
- No direct stack trace evidence: +0.00
- Error is intermittent per user report: +0.20
- cache.ts is imported by affected module: +0.15
- Async operations without proper ordering: +0.10
Total: 0.45 (medium confidence)
```

**Ranking rules**:
- Generate 3-5 hypotheses minimum
- Rank by confidence score (highest first)
- Include at least one hypothesis from a different failure category as alternative
- If all hypotheses have low confidence (<0.4), flag for additional information gathering

### Step 5: Format and Store Hypotheses

**Template for adding hypotheses to session**:

```json
{
  "hypotheses": [
    {
      "id": "HYP_1",
      "category": "null_reference",
      "description": "User object is null when accessing email property due to missing null check after database query",
      "rationale": "Stack trace shows error at user.ts:45 accessing user.email, and database query at line 42 may return null for non-existent users",
      "files": ["src/controllers/user.ts", "src/services/database.ts"],
      "lineRanges": {
        "src/controllers/user.ts": "40-55",
        "src/services/database.ts": "120-135"
      },
      "variablesToInspect": ["user", "userId", "queryResult"],
      "expectedEvidence": "Log should show user=null after database query, or userId not found in database",
      "confidence": 0.75,
      "status": "pending",
      "generatedAt": "2025-01-31T10:32:00Z"
    },
    {
      "id": "HYP_2",
      "category": "race_condition",
      "description": "Cache is read before initialization completes on first request",
      "rationale": "Issue is intermittent and occurs on first request after deployment, suggesting initialization timing",
      "files": ["src/cache/manager.ts", "src/server/startup.ts"],
      "lineRanges": {
        "src/cache/manager.ts": "15-40",
        "src/server/startup.ts": "50-75"
      },
      "variablesToInspect": ["cacheReady", "initPromise", "startupSequence"],
      "expectedEvidence": "Log should show cache access timestamp before initialization complete timestamp",
      "confidence": 0.55,
      "status": "pending",
      "generatedAt": "2025-01-31T10:32:00Z"
    },
    {
      "id": "HYP_3",
      "category": "logic_error",
      "description": "Validation function returns true for invalid input due to inverted conditional",
      "rationale": "Expected 400 error but got 500, suggesting validation passed when it should have failed",
      "files": ["src/validators/user.ts"],
      "lineRanges": {
        "src/validators/user.ts": "20-45"
      },
      "variablesToInspect": ["email", "validationResult", "isValid"],
      "expectedEvidence": "Log should show isValid=true even when email is null/invalid",
      "confidence": 0.40,
      "status": "pending",
      "generatedAt": "2025-01-31T10:32:00Z"
    }
  ],
  "iterationCount": 1,
  "status": "hypothesis_generated"
}
```

### Hypothesis Generation Examples

#### Example 1: Runtime Error (Null Reference)

**Input**:
```
Issue Type: Runtime Error
Error: TypeError: Cannot read property 'id' of null
  at UserController.create (src/controllers/user.ts:45:23)
  at Router.handle (node_modules/express/lib/router/index.js:284:9)
Reproduction: POST /api/users with {"name": "test", "email": null}
Expected: 400 Bad Request with validation error
Actual: 500 Internal Server Error
```

**Generated Hypotheses**:

```json
[
  {
    "id": "HYP_1",
    "category": "null_reference",
    "description": "User object is null after database lookup before accessing user.id",
    "rationale": "Stack trace points to user.ts:45, error is 'Cannot read property id of null', suggesting a database lookup returns null that is not checked",
    "files": ["src/controllers/user.ts"],
    "lineRanges": {
      "src/controllers/user.ts": "40-55"
    },
    "variablesToInspect": ["user", "userId", "dbResult"],
    "expectedEvidence": "Log shows user=null after DB query, userId was not found",
    "confidence": 0.85
  },
  {
    "id": "HYP_2",
    "category": "logic_error",
    "description": "Input validation skipped for POST /api/users allowing null email to reach controller",
    "rationale": "Expected behavior is 400 Bad Request for validation error, but 500 suggests validation didn't run or didn't catch null email",
    "files": ["src/middleware/validation.ts", "src/routes/users.ts"],
    "lineRanges": {
      "src/middleware/validation.ts": "10-35",
      "src/routes/users.ts": "20-30"
    },
    "variablesToInspect": ["email", "validationErrors", "validationSchema"],
    "expectedEvidence": "Log shows validation middleware executed but email=null passed through",
    "confidence": 0.60
  },
  {
    "id": "HYP_3",
    "category": "configuration",
    "description": "Validation middleware not applied to POST /api/users route",
    "rationale": "Route might be missing validation middleware entirely",
    "files": ["src/routes/users.ts", "src/routes/index.ts"],
    "lineRanges": {
      "src/routes/users.ts": "1-20",
      "src/routes/index.ts": "15-35"
    },
    "variablesToInspect": ["routeMiddleware", "validationMiddleware"],
    "expectedEvidence": "Log shows request reaches controller without validation middleware execution",
    "confidence": 0.45
  }
]
```

#### Example 2: Intermittent Issue (Race Condition)

**Input**:
```
Issue Type: Intermittent/Flaky Issue
Error: Random test failures in CI, passes locally
Test: "should return cached user preferences"
Behavior: Sometimes returns stale data, sometimes correct data
Keywords: "flaky", "intermittent", "works locally"
```

**Generated Hypotheses**:

```json
[
  {
    "id": "HYP_1",
    "category": "race_condition",
    "description": "Cache read occurs before async write from previous test completes",
    "rationale": "Test isolation issue where cache state leaks between tests, timing difference between local and CI explains inconsistency",
    "files": ["src/cache/preferences.ts", "tests/cache.test.ts"],
    "lineRanges": {
      "src/cache/preferences.ts": "45-80",
      "tests/cache.test.ts": "20-50"
    },
    "variablesToInspect": ["cacheWritePromise", "cacheState", "testSetup"],
    "expectedEvidence": "Timestamp logs show read completes before write on failures, write completes before read on success",
    "confidence": 0.70
  },
  {
    "id": "HYP_2",
    "category": "race_condition",
    "description": "Test relies on setTimeout that is faster locally than in CI",
    "rationale": "CI environments often have different timing characteristics than local machines",
    "files": ["tests/cache.test.ts", "src/cache/preferences.ts"],
    "lineRanges": {
      "tests/cache.test.ts": "30-45",
      "src/cache/preferences.ts": "60-75"
    },
    "variablesToInspect": ["timeoutMs", "cacheExpiry", "timerCallback"],
    "expectedEvidence": "Log shows timeout elapsed before expected in CI runs",
    "confidence": 0.55
  },
  {
    "id": "HYP_3",
    "category": "resource_management",
    "description": "Shared database connection not properly reset between tests",
    "rationale": "Database state from parallel tests might interfere",
    "files": ["tests/setup.ts", "src/database/connection.ts"],
    "lineRanges": {
      "tests/setup.ts": "1-30",
      "src/database/connection.ts": "80-100"
    },
    "variablesToInspect": ["dbConnection", "testIsolation", "beforeEach"],
    "expectedEvidence": "Log shows queries from different tests interleaving",
    "confidence": 0.40
  }
]
```

#### Example 3: Cross-Service Issue

**Input**:
```
Issue Type: Cross-Service/Integration Issue
Error: 504 Gateway Timeout when calling payment API
Reproduction: Checkout with cart > $1000
Expected: Payment processed, order confirmed
Actual: Timeout after 30 seconds, order stuck in "processing"
```

**Generated Hypotheses**:

```json
[
  {
    "id": "HYP_1",
    "category": "cross_service",
    "description": "Payment API has longer processing time for large amounts, exceeding configured timeout",
    "rationale": "Issue specific to carts > $1000 suggests amount-dependent processing time",
    "files": ["src/services/payment.ts", "src/config/api.ts"],
    "lineRanges": {
      "src/services/payment.ts": "40-80",
      "src/config/api.ts": "15-25"
    },
    "variablesToInspect": ["paymentTimeout", "amount", "apiResponse", "requestStartTime"],
    "expectedEvidence": "Log shows request sent at T, timeout at T+30s, but payment API took 45s to respond",
    "confidence": 0.75
  },
  {
    "id": "HYP_2",
    "category": "cross_service",
    "description": "Payment API returns different response structure for fraud check on large amounts",
    "rationale": "Large amounts may trigger additional fraud verification with different response format",
    "files": ["src/services/payment.ts", "src/models/payment-response.ts"],
    "lineRanges": {
      "src/services/payment.ts": "85-120",
      "src/models/payment-response.ts": "1-40"
    },
    "variablesToInspect": ["apiResponse", "responseBody", "fraudCheckStatus"],
    "expectedEvidence": "Log shows unexpected response structure with fraudCheck field not in model",
    "confidence": 0.50
  },
  {
    "id": "HYP_3",
    "category": "logic_error",
    "description": "Order state not properly updated when payment is pending fraud review",
    "rationale": "Order stuck in 'processing' suggests state machine doesn't handle pending payment status",
    "files": ["src/services/order.ts", "src/models/order-state.ts"],
    "lineRanges": {
      "src/services/order.ts": "100-150",
      "src/models/order-state.ts": "20-50"
    },
    "variablesToInspect": ["orderStatus", "paymentStatus", "stateTransition"],
    "expectedEvidence": "Log shows payment returns 'pending_review' status but order handler doesn't process it",
    "confidence": 0.45
  }
]
```

### Hypothesis Generation Rules

1. **Always generate 3-5 hypotheses**: Even if one seems obvious, include alternatives
2. **Include at least one from a different category**: Avoid tunnel vision
3. **Be specific about locations**: Exact files and line ranges, not vague areas
4. **Include variables to inspect**: What to log for evidence
5. **Define expected evidence**: What log output would confirm/reject the hypothesis
6. **Confidence is internal**: Use for prioritization, don't show to user
7. **Keep descriptions testable**: Each hypothesis should be provable or disprovable with logging

### Session Update After Hypothesis Generation

After generating hypotheses, update the session:

```json
{
  "hypotheses": [/* generated hypotheses */],
  "iterationCount": 1,  // or increment if regenerating
  "status": "hypothesis_generated"
}
```

Then proceed to the Multi-File Tracking phase to expand hypothesis coverage across related files, followed by Logging Infrastructure Review and Instrumentation.

---

## Multi-File Hypothesis Tracking Workflow Template

This template defines how to expand hypothesis coverage across related files by analyzing dependencies, imports, and cross-boundary interactions. The goal is to ensure each hypothesis tracks ALL files that could be involved in the issue, enabling comprehensive instrumentation and log correlation.

### Multi-File Tracking Overview

```
1. Analyze Initial Files → Extract imports, exports, and dependencies from hypothesis files
2. Identify Related Files → Find files in the call chain, data flow, and shared state
3. Categorize by Layer → Map files to frontend, backend, database, and shared layers
4. Expand Hypothesis → Add all related files with specific line ranges
5. Track Correlation → Define log markers for cross-file correlation
```

### Step 1: Analyze Initial Hypothesis Files

**When**: After hypothesis generation is complete (status = "hypothesis_generated")

**Input**: Each hypothesis has initial `files` and `lineRanges` from generation phase

**Action**: For each file in the hypothesis, extract dependency information

#### Import/Require Analysis Patterns

**JavaScript/TypeScript**:
```javascript
// Pattern: ES6 imports
import { UserService } from '../services/user';
import * as db from './database';
import type { User } from '../types/user';

// Pattern: CommonJS requires
const { validateEmail } = require('../validators/email');
const config = require('../../config');

// Pattern: Dynamic imports
const module = await import('./dynamic-module');
```

**Python**:
```python
# Pattern: Standard imports
from services.user import UserService
from database import db, query_builder
import validators.email as email_validator

# Pattern: Relative imports
from . import utils
from ..shared import constants
```

**Go**:
```go
// Pattern: Package imports
import (
    "myapp/services/user"
    "myapp/database"
    "myapp/validators"
)
```

**Java/Kotlin**:
```java
// Pattern: Package imports
import com.myapp.services.UserService;
import com.myapp.database.Repository;
import static com.myapp.utils.Validators.*;
```

**Template for extracting dependencies from a file**:

```
Given file: <file_path>

1. Extract all import/require statements
2. Resolve relative paths to absolute project paths
3. Identify:
   - Direct dependencies (explicitly imported)
   - Type dependencies (interface/type imports)
   - Side-effect imports (import for initialization)
4. For each dependency, note:
   - What is imported (specific exports vs entire module)
   - How it's used in the hypothesis line range
```

### Step 2: Identify Related Files by Category

**File Relationship Categories**:

#### 2.1 Call Chain Files (Direct Dependencies)

Files that are directly called from the hypothesis location:

```
Example: Error at src/controllers/user.ts:45

Call chain analysis:
- user.ts imports UserService from src/services/user.ts
- Line 45 calls userService.findById()
- findById() calls database.query() at src/database/queries.ts

Call chain files:
1. src/controllers/user.ts (origin)
2. src/services/user.ts (direct call)
3. src/database/queries.ts (transitive call)
```

**Template**:
```json
{
  "callChain": {
    "origin": "src/controllers/user.ts:45",
    "directCalls": [
      {
        "file": "src/services/user.ts",
        "function": "findById",
        "lineRange": "30-50"
      }
    ],
    "transitiveCalls": [
      {
        "file": "src/database/queries.ts",
        "function": "query",
        "lineRange": "15-25",
        "calledFrom": "src/services/user.ts:42"
      }
    ]
  }
}
```

#### 2.2 Data Flow Files

Files involved in data transformation between layers:

```
Example: User input validation error

Data flow analysis:
- Request enters at src/routes/user.ts (route handler)
- Data validated by src/validators/user.ts (validation layer)
- Transformed by src/transformers/user.ts (DTO transformation)
- Stored via src/repositories/user.ts (database layer)

Data flow files:
1. src/routes/user.ts (entry point)
2. src/validators/user.ts (validation)
3. src/transformers/user.ts (transformation)
4. src/repositories/user.ts (persistence)
```

**Template**:
```json
{
  "dataFlow": {
    "entryPoint": "src/routes/user.ts:20",
    "stages": [
      {
        "stage": "validation",
        "file": "src/validators/user.ts",
        "lineRange": "10-35",
        "dataIn": "rawUserInput",
        "dataOut": "validatedUser"
      },
      {
        "stage": "transformation",
        "file": "src/transformers/user.ts",
        "lineRange": "15-40",
        "dataIn": "validatedUser",
        "dataOut": "userDTO"
      },
      {
        "stage": "persistence",
        "file": "src/repositories/user.ts",
        "lineRange": "50-80",
        "dataIn": "userDTO",
        "dataOut": "savedUser"
      }
    ]
  }
}
```

#### 2.3 Shared State Files

Files that share state (global variables, singletons, caches):

```
Example: Race condition in cache access

Shared state analysis:
- Cache defined in src/cache/manager.ts (singleton)
- Accessed by src/services/user.ts (service layer)
- Also accessed by src/services/preferences.ts (different service)
- Initialized in src/server/startup.ts (initialization)

Shared state files:
1. src/cache/manager.ts (state owner)
2. src/services/user.ts (accessor 1)
3. src/services/preferences.ts (accessor 2)
4. src/server/startup.ts (initializer)
```

**Template**:
```json
{
  "sharedState": {
    "stateOwner": {
      "file": "src/cache/manager.ts",
      "stateVariable": "cacheInstance",
      "lineRange": "5-30"
    },
    "initializer": {
      "file": "src/server/startup.ts",
      "lineRange": "45-60"
    },
    "accessors": [
      {
        "file": "src/services/user.ts",
        "accessType": "read/write",
        "lineRange": "70-85"
      },
      {
        "file": "src/services/preferences.ts",
        "accessType": "read",
        "lineRange": "40-55"
      }
    ]
  }
}
```

#### 2.4 Configuration Files

Files that provide configuration affecting behavior:

```
Configuration files:
1. src/config/database.ts (database settings)
2. src/config/api.ts (API timeouts, endpoints)
3. .env / environment variables
4. package.json (dependency versions)
```

**Template**:
```json
{
  "configuration": {
    "files": [
      {
        "file": "src/config/database.ts",
        "relevantSettings": ["connectionTimeout", "poolSize"],
        "lineRange": "10-30"
      },
      {
        "file": "src/config/api.ts",
        "relevantSettings": ["requestTimeout", "baseUrl"],
        "lineRange": "5-20"
      }
    ]
  }
}
```

### Step 3: Categorize Files by Project Layer

**Template for layer categorization**:

```json
{
  "layers": {
    "frontend": {
      "patterns": ["src/pages/**", "src/components/**", "src/hooks/**", "app/**/*.tsx"],
      "files": [
        {
          "path": "src/pages/upload.tsx",
          "role": "Page component",
          "hypothesisRelevance": "User interaction entry point"
        }
      ]
    },
    "backend": {
      "patterns": ["src/controllers/**", "src/services/**", "src/routes/**", "api/**"],
      "files": [
        {
          "path": "src/controllers/user.ts",
          "role": "Request handler",
          "hypothesisRelevance": "Error origin from stack trace"
        },
        {
          "path": "src/services/user.ts",
          "role": "Business logic",
          "hypothesisRelevance": "Called from controller at error point"
        }
      ]
    },
    "database": {
      "patterns": ["src/database/**", "src/repositories/**", "src/models/**", "prisma/**"],
      "files": [
        {
          "path": "src/repositories/user.ts",
          "role": "Data access",
          "hypothesisRelevance": "Database query returning null"
        }
      ]
    },
    "shared": {
      "patterns": ["src/utils/**", "src/types/**", "src/constants/**", "lib/**"],
      "files": [
        {
          "path": "src/types/user.ts",
          "role": "Type definitions",
          "hypothesisRelevance": "Type may not handle null case"
        }
      ]
    },
    "infrastructure": {
      "patterns": ["src/config/**", "src/middleware/**", "src/server/**"],
      "files": [
        {
          "path": "src/middleware/validation.ts",
          "role": "Request validation",
          "hypothesisRelevance": "May be skipping validation"
        }
      ]
    }
  }
}
```

### Step 4: Expand Hypothesis with Related Files

**When**: After dependency analysis is complete for all hypothesis files

**Action**: Update each hypothesis to include all related files with specific line ranges

**Expanded Hypothesis Format**:

```json
{
  "id": "HYP_1",
  "category": "null_reference",
  "description": "User object is null after database lookup in findById",
  "rationale": "Stack trace shows null access at controller level, traced to database query",

  "primaryFile": {
    "path": "src/controllers/user.ts",
    "lineRange": "40-55",
    "role": "Error origin"
  },

  "relatedFiles": [
    {
      "path": "src/services/user.ts",
      "lineRange": "30-50",
      "role": "Direct call chain",
      "relationship": "Called from controller at line 45",
      "variablesToInspect": ["userId", "userRecord"]
    },
    {
      "path": "src/repositories/user.ts",
      "lineRange": "60-80",
      "role": "Database access",
      "relationship": "Called from service at line 42",
      "variablesToInspect": ["query", "result", "rowCount"]
    },
    {
      "path": "src/database/connection.ts",
      "lineRange": "20-40",
      "role": "Connection management",
      "relationship": "Provides connection to repository",
      "variablesToInspect": ["connection", "isConnected"]
    }
  ],

  "allFiles": [
    "src/controllers/user.ts",
    "src/services/user.ts",
    "src/repositories/user.ts",
    "src/database/connection.ts"
  ],

  "lineRanges": {
    "src/controllers/user.ts": "40-55",
    "src/services/user.ts": "30-50",
    "src/repositories/user.ts": "60-80",
    "src/database/connection.ts": "20-40"
  },

  "crossFileCorrelation": {
    "traceId": "HYP_1_TRACE",
    "entryPoint": "src/controllers/user.ts:45",
    "exitPoint": "src/repositories/user.ts:75",
    "dataVariables": ["userId", "userRecord", "query", "result"]
  },

  "confidence": 0.85,
  "status": "pending",
  "generatedAt": "2025-01-31T10:32:00Z",
  "expandedAt": "2025-01-31T10:33:00Z"
}
```

### Step 5: Define Cross-File Log Correlation

**Purpose**: Enable correlation of log entries across multiple files to trace data flow and timing

**Correlation Strategy**:

#### 5.1 Trace ID Propagation

Each hypothesis gets a unique trace ID that flows through all instrumented files:

```javascript
// src/controllers/user.ts
// DEBUG_HYP_1_START
const HYP_1_TRACE_ID = `HYP_1_${Date.now()}`;
console.log(`[HYP_1_TRACE:${HYP_1_TRACE_ID}] Controller: userId=${userId}`);
// Pass trace ID to service
const result = await userService.findById(userId, { traceId: HYP_1_TRACE_ID });
// DEBUG_HYP_1_END

// src/services/user.ts
// DEBUG_HYP_1_START
console.log(`[HYP_1_TRACE:${traceId}] Service: Looking up user ${userId}`);
const user = await repository.findById(userId, traceId);
console.log(`[HYP_1_TRACE:${traceId}] Service: Result=${JSON.stringify(user)}`);
// DEBUG_HYP_1_END

// src/repositories/user.ts
// DEBUG_HYP_1_START
console.log(`[HYP_1_TRACE:${traceId}] Repository: Executing query for ${userId}`);
const result = await db.query(sql);
console.log(`[HYP_1_TRACE:${traceId}] Repository: Rows returned=${result.rowCount}`);
// DEBUG_HYP_1_END
```

#### 5.2 Timestamp Correlation

When trace ID propagation isn't possible, use synchronized timestamps:

```javascript
// All files use same timestamp format for correlation
const timestamp = new Date().toISOString();
console.log(`[HYP_1][${timestamp}] File: event description`);
```

**Log Correlation Template**:

```json
{
  "crossFileCorrelation": {
    "hypothesisId": "HYP_1",
    "traceIdFormat": "HYP_1_<timestamp>",
    "logFormat": "[HYP_1_TRACE:<traceId>] <file>:<function>: <message>",
    "files": [
      {
        "file": "src/controllers/user.ts",
        "markers": {
          "entry": "[HYP_1_TRACE:*] Controller: userId=*",
          "exit": "[HYP_1_TRACE:*] Controller: Response=*"
        },
        "expectedOrder": 1
      },
      {
        "file": "src/services/user.ts",
        "markers": {
          "entry": "[HYP_1_TRACE:*] Service: Looking up*",
          "exit": "[HYP_1_TRACE:*] Service: Result=*"
        },
        "expectedOrder": 2
      },
      {
        "file": "src/repositories/user.ts",
        "markers": {
          "entry": "[HYP_1_TRACE:*] Repository: Executing*",
          "exit": "[HYP_1_TRACE:*] Repository: Rows returned=*"
        },
        "expectedOrder": 3
      }
    ],
    "expectedFlow": "Controller → Service → Repository → Service → Controller",
    "anomalyIndicators": [
      "Out-of-order timestamps (possible race condition)",
      "Missing log from expected file (possible early return)",
      "Duplicate trace IDs (possible retry/loop)",
      "Large time gap between files (possible timeout)"
    ]
  }
}
```

### Multi-File Tracking Examples

#### Example 1: Frontend-Backend-Database Issue

**Issue**: User profile edit fails silently

**Initial Hypothesis Files**:
- `src/pages/profile.tsx` (UI shows success but data unchanged)

**Expanded with Related Files**:

```json
{
  "id": "HYP_1",
  "description": "Profile update API returns 200 but database transaction rolls back",

  "primaryFile": {
    "path": "src/pages/profile.tsx",
    "lineRange": "80-120",
    "role": "Frontend form submission"
  },

  "relatedFiles": [
    {
      "path": "src/api/profile.ts",
      "lineRange": "30-60",
      "role": "API client",
      "relationship": "Called from page component",
      "variablesToInspect": ["requestBody", "response", "status"]
    },
    {
      "path": "src/controllers/profile.ts",
      "lineRange": "45-90",
      "role": "Backend handler",
      "relationship": "Receives API request",
      "variablesToInspect": ["body", "userId", "updateResult"]
    },
    {
      "path": "src/services/profile.ts",
      "lineRange": "60-100",
      "role": "Business logic",
      "relationship": "Called from controller",
      "variablesToInspect": ["profileData", "validationResult", "saveResult"]
    },
    {
      "path": "src/repositories/profile.ts",
      "lineRange": "40-80",
      "role": "Database access",
      "relationship": "Executes update query",
      "variablesToInspect": ["query", "params", "affectedRows", "transactionId"]
    }
  ],

  "allFiles": [
    "src/pages/profile.tsx",
    "src/api/profile.ts",
    "src/controllers/profile.ts",
    "src/services/profile.ts",
    "src/repositories/profile.ts"
  ],

  "crossFileCorrelation": {
    "traceId": "HYP_1_PROFILE_UPDATE",
    "flow": "Frontend → API Client → Controller → Service → Repository",
    "dataVariables": ["profileId", "profileData", "updateResult", "affectedRows"]
  }
}
```

#### Example 2: Race Condition Across Services

**Issue**: Cache returns stale data intermittently

**Initial Hypothesis Files**:
- `src/services/user.ts` (returns outdated user data)

**Expanded with Related Files**:

```json
{
  "id": "HYP_2",
  "description": "Cache invalidation races with concurrent read operations",

  "primaryFile": {
    "path": "src/services/user.ts",
    "lineRange": "50-80",
    "role": "Service reading from cache"
  },

  "relatedFiles": [
    {
      "path": "src/cache/manager.ts",
      "lineRange": "20-60",
      "role": "Cache singleton",
      "relationship": "Shared state owner",
      "variablesToInspect": ["cacheMap", "isInvalidating", "lastInvalidation"]
    },
    {
      "path": "src/services/admin.ts",
      "lineRange": "100-130",
      "role": "Admin service",
      "relationship": "Triggers cache invalidation",
      "variablesToInspect": ["invalidationTimestamp", "affectedKeys"]
    },
    {
      "path": "src/events/user-updated.ts",
      "lineRange": "15-40",
      "role": "Event handler",
      "relationship": "Triggers async invalidation",
      "variablesToInspect": ["eventTimestamp", "userId", "eventId"]
    },
    {
      "path": "src/server/startup.ts",
      "lineRange": "80-100",
      "role": "Cache initialization",
      "relationship": "Initializes cache singleton",
      "variablesToInspect": ["initTimestamp", "cacheReady"]
    }
  ],

  "allFiles": [
    "src/services/user.ts",
    "src/cache/manager.ts",
    "src/services/admin.ts",
    "src/events/user-updated.ts",
    "src/server/startup.ts"
  ],

  "crossFileCorrelation": {
    "traceId": "HYP_2_CACHE_RACE",
    "timingCritical": true,
    "timestampFormat": "ISO8601 with milliseconds",
    "expectedSequence": [
      "1. Cache read starts (user.ts)",
      "2. Invalidation triggered (admin.ts)",
      "3. Event emitted (user-updated.ts)",
      "4. Cache cleared (manager.ts)",
      "5. Cache read completes (user.ts)"
    ],
    "raceConditionSignature": "Step 5 completes before Step 4"
  }
}
```

#### Example 3: Cross-Service Integration Issue

**Issue**: Payment processing times out for large orders

**Initial Hypothesis Files**:
- `src/services/payment.ts` (timeout error)

**Expanded with Related Files**:

```json
{
  "id": "HYP_3",
  "description": "Payment API has longer response time for fraud-checked orders",

  "primaryFile": {
    "path": "src/services/payment.ts",
    "lineRange": "40-90",
    "role": "Payment service"
  },

  "relatedFiles": [
    {
      "path": "src/services/order.ts",
      "lineRange": "120-160",
      "role": "Order orchestration",
      "relationship": "Calls payment service",
      "variablesToInspect": ["orderTotal", "orderItems", "paymentRequest"]
    },
    {
      "path": "src/api/external/payment-gateway.ts",
      "lineRange": "30-80",
      "role": "External API client",
      "relationship": "Makes HTTP request to payment gateway",
      "variablesToInspect": ["requestTimeout", "requestBody", "responseStatus"]
    },
    {
      "path": "src/config/api.ts",
      "lineRange": "15-35",
      "role": "API configuration",
      "relationship": "Provides timeout settings",
      "variablesToInspect": ["paymentTimeout", "retryConfig"]
    },
    {
      "path": "src/models/order.ts",
      "lineRange": "50-80",
      "role": "Order state machine",
      "relationship": "Tracks order status during payment",
      "variablesToInspect": ["status", "paymentStatus", "statusHistory"]
    },
    {
      "path": "src/handlers/payment-webhook.ts",
      "lineRange": "20-60",
      "role": "Async payment handler",
      "relationship": "Handles delayed payment confirmations",
      "variablesToInspect": ["webhookPayload", "orderId", "paymentResult"]
    }
  ],

  "allFiles": [
    "src/services/payment.ts",
    "src/services/order.ts",
    "src/api/external/payment-gateway.ts",
    "src/config/api.ts",
    "src/models/order.ts",
    "src/handlers/payment-webhook.ts"
  ],

  "crossFileCorrelation": {
    "traceId": "HYP_3_PAYMENT_TIMEOUT",
    "externalService": "payment-gateway",
    "timeTracking": {
      "requestSent": "payment-gateway.ts",
      "timeoutOccurred": "payment.ts",
      "webhookReceived": "payment-webhook.ts"
    },
    "dataVariables": ["orderId", "amount", "requestTimestamp", "responseTimestamp", "timeoutDuration"]
  }
}
```

### Dependency Analysis Commands

**Template for running dependency analysis**:

#### JavaScript/TypeScript Projects

```bash
# Find all imports in a file
grep -E "^import|^const.*require" src/controllers/user.ts

# Find files that import a specific module
grep -rl "from.*services/user" src/

# Trace dependency tree (if available)
npx madge --circular src/controllers/user.ts
npx dependency-cruiser --output-type json src/controllers/user.ts
```

#### Python Projects

```bash
# Find all imports in a file
grep -E "^import|^from" src/controllers/user.py

# Find files that import a specific module
grep -rl "from services.user import\|import services.user" src/

# Use pipdeptree for package dependencies
pipdeptree --packages mypackage
```

#### Go Projects

```bash
# Find all imports in a file
grep -E "^import|^\t\"" src/controllers/user.go

# Find files that import a specific package
grep -rl "\"myapp/services/user\"" .

# Use go mod graph for module dependencies
go mod graph | grep services/user
```

### Session Update After Multi-File Expansion

After expanding hypotheses with related files, update the session:

```json
{
  "hypotheses": [
    {
      "id": "HYP_1",
      "description": "...",
      "primaryFile": {...},
      "relatedFiles": [...],
      "allFiles": ["file1.ts", "file2.ts", "file3.ts"],
      "lineRanges": {
        "file1.ts": "40-55",
        "file2.ts": "30-50",
        "file3.ts": "60-80"
      },
      "crossFileCorrelation": {...},
      "status": "pending",
      "expandedAt": "2025-01-31T10:33:00Z"
    }
  ],
  "status": "hypothesis_expanded"
}
```

### Multi-File Tracking Rules

1. **Always trace at least one level deep**: Don't stop at direct imports; follow calls through services
2. **Include configuration files**: Many bugs stem from configuration issues
3. **Track shared state owners**: Singletons, caches, and global state are common bug sources
4. **Map data transformations**: Follow data from entry to exit, noting transformations
5. **Consider async boundaries**: Note where sync becomes async (important for race conditions)
6. **Document the relationship**: Each related file should explain WHY it's relevant
7. **Set correlation strategy**: Define how logs from different files will be matched
8. **Preserve original hypothesis**: Expansion adds context, doesn't change the core hypothesis

### Proceeding to Next Phase

After multi-file expansion is complete:

1. Update session status to `hypothesis_expanded`
2. All hypotheses now have complete file lists and correlation strategies
3. Proceed to **Logging Infrastructure Review** to assess existing logging before instrumentation
4. Then proceed to **Instrumentation** using the expanded file list and correlation strategy

---

## Logging Infrastructure Review Workflow Template

**Purpose:** Before adding instrumentation, assess existing logging infrastructure in affected files to avoid conflicts, maintain consistency, and ensure instrumentation is compatible with the project's logging approach.

**When to Use:** After hypothesis generation and multi-file expansion, before instrumentation phase.

**Critical Requirement:** NEVER add instrumentation before completing this review. Understanding existing logging prevents duplicate statements, framework conflicts, and style inconsistencies.

---

### Overview: Why Logging Review Matters

Adding debug instrumentation without understanding existing logging infrastructure can cause:

1. **Duplicate logs**: Your instrumentation might log variables already being logged
2. **Framework conflicts**: Mixing console.log with winston/pino can break structured logging
3. **Style inconsistencies**: Different log formats make analysis harder
4. **Configuration issues**: Logger might be disabled in certain environments
5. **Missing dependencies**: External-only logging (Datadog, Sentry) requires fallback approach

This template systematically reviews existing logging to inform instrumentation strategy.

---

### Step 1: Identify Affected Files

Start by gathering all files that will need instrumentation based on hypothesis tracking.

**From Session File:**

```bash
# Read session to get hypothesis files
cat .claude/debug-sessions/${SESSION_ID}.json | jq -r '.hypotheses[].allFiles[]' | sort -u > /tmp/affected_files.txt
```

**Expected Output:**

```
src/controllers/UserController.ts
src/services/UserService.ts
src/repositories/UserRepository.ts
src/utils/validation.ts
```

---

### Step 2: Scan for Existing Logging Statements

For each affected file, scan for logging statements using language-specific patterns.

**Scanning Commands by Language:**

**JavaScript/TypeScript:**
```bash
# Scan for console methods, logger calls, and common frameworks
grep -nE '(console\.(log|error|warn|info|debug))|(logger\.(log|error|warn|info|debug))|(winston\.)|(pino\.)|(bunyan\.)|(log4js\.)' src/controllers/UserController.ts
```

**Python:**
```bash
# Scan for print, logging module, and common frameworks
grep -nE '(print\()|(logging\.(debug|info|warning|error|critical))|(logger\.(debug|info|warning|error|critical))|(loguru\.)' src/services/user_service.py
```

**Go:**
```bash
# Scan for fmt.Print, log package, and common frameworks
grep -nE '(fmt\.Print)|(log\.(Print|Fatal|Panic))|(logrus\.)|(zap\.)|(zerolog\.)' internal/user/service.go
```

**Java/Kotlin:**
```bash
# Scan for System.out, Log4j, SLF4J, and common frameworks
grep -nE '(System\.out\.)|(System\.err\.)|(log\.(debug|info|warn|error))|(logger\.(debug|info|warn|error))|(Log\.(d|i|w|e))' src/main/java/UserService.java
```

**Ruby:**
```bash
# Scan for puts, Rails logger, and common frameworks
grep -nE '(puts )|(p )|(pp )|(Rails\.logger\.)|(logger\.(debug|info|warn|error))' app/services/user_service.rb
```

**PHP:**
```bash
# Scan for echo, error_log, Monolog, and common frameworks
grep -nE '(echo )|(print )|(var_dump)|(error_log)|(\\Log::)|(->log\()' src/Services/UserService.php
```

**C/C++:**
```bash
# Scan for printf, cout, and common frameworks
grep -nE '(printf)|(fprintf)|(std::cout)|(std::cerr)|(LOG\()|(spdlog::)' src/user_service.cpp
```

**Example Output:**

```
src/controllers/UserController.ts:23:    logger.info('Creating user', { email: user.email });
src/controllers/UserController.ts:45:    logger.error('User creation failed', { error: err.message });
src/services/UserService.ts:67:    logger.debug('Validating user data', { userId: user.id });
```

---

### Step 3: Identify Logging Framework

Based on scan results, identify which logging framework(s) are in use.

**Framework Detection Logic:**

1. **Check imports/requires at top of file:**
   ```bash
   # JavaScript/TypeScript
   grep -E '^import.*from.*["\']' src/controllers/UserController.ts | grep -iE '(winston|pino|bunyan|log4js)'

   # Python
   grep -E '^import |^from ' src/services/user_service.py | grep -iE '(logging|loguru)'

   # Go
   grep -E '^import ' internal/user/service.go | grep -iE '(logrus|zap|zerolog)'
   ```

2. **Analyze logging statement patterns:**
   - `console.log` → Console (JavaScript/TypeScript)
   - `logger.info()` with structured data → Likely winston/pino (JavaScript)
   - `logging.getLogger(__name__)` → Python logging module
   - `print()` → Python print (no framework)
   - `fmt.Println` → Go fmt package (no framework)
   - `log.Logger` → Go log package
   - `System.out.println` → Java System.out (no framework)
   - `Rails.logger` → Ruby on Rails logger

3. **Check for logger initialization:**
   ```bash
   # Look for logger creation/configuration
   grep -nE '(winston\.createLogger|pino\(|new Logger|logging\.basicConfig|logrus\.New)' src/**/*.{ts,js,py,go,java}
   ```

**Framework Identification Table:**

| Pattern Found | Framework | Import Pattern | Logger Instantiation |
|--------------|-----------|----------------|---------------------|
| `logger.info({...})` | Winston (JS) | `import winston from 'winston'` | `winston.createLogger({...})` |
| `logger.info({...})` | Pino (JS) | `import pino from 'pino'` | `pino({...})` |
| `logging.info(...)` | Python logging | `import logging` | `logging.basicConfig(...)` |
| `logger.info(...)` | Loguru (Python) | `from loguru import logger` | N/A (auto-configured) |
| `log.Info(...)` | Logrus (Go) | `"github.com/sirupsen/logrus"` | `logrus.New()` |
| `logger.Info(...)` | Zap (Go) | `"go.uber.org/zap"` | `zap.NewProduction()` |
| `Logger.getLogger(...).info(...)` | Log4j (Java) | `import org.apache.log4j.Logger` | `Logger.getLogger(...)` |
| `logger.info(...)` | SLF4J (Java) | `import org.slf4j.Logger` | `LoggerFactory.getLogger(...)` |
| `Rails.logger.info(...)` | Rails logger (Ruby) | N/A (built-in) | N/A (auto-configured) |
| `console.log(...)` | Console (JS/TS) | N/A (built-in) | N/A (built-in) |
| `print(...)` | Print (Python) | N/A (built-in) | N/A (built-in) |
| `fmt.Println(...)` | Fmt (Go) | `"fmt"` | N/A (built-in) |

**Framework Identification Example:**

```typescript
// File: src/controllers/UserController.ts
import winston from 'winston';  // ← Winston framework detected

const logger = winston.createLogger({  // ← Logger initialization found
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

// Logging statements
logger.info('Creating user', { email: user.email });  // ← Structured logging pattern
logger.error('User creation failed', { error: err.message });
```

**Conclusion:** Framework is **Winston** with structured JSON logging.

---

### Step 4: Report Current Logging Coverage

Analyze what is ALREADY being logged in the affected code paths to avoid duplication.

**Coverage Analysis Template:**

For each hypothesis and its affected files, document:

1. **File Path**
2. **Logging Statements Found** (line numbers)
3. **What Variables Are Already Logged**
4. **Logging Level Used** (debug, info, warn, error)
5. **Gaps Identified** (what's NOT being logged but is needed for hypothesis testing)

**Example Coverage Report:**

```markdown
### Logging Coverage Report

**Hypothesis:** HYP_1 - Null reference error when user.email is null
**Files Affected:** src/controllers/UserController.ts, src/services/UserService.ts

---

#### File: src/controllers/UserController.ts

**Existing Logging:**

| Line | Statement | Variables Logged | Level | Context |
|------|-----------|------------------|-------|---------|
| 23 | `logger.info('Creating user', ...)` | `email` | info | Entry point |
| 45 | `logger.error('User creation failed', ...)` | `error.message` | error | Error handler |

**Variables Already Logged:** `user.email`, `error.message`

**Gaps Identified:**
- Line 30: Need to log `user` object before validation (not currently logged)
- Line 35: Need to log result of `validateUser()` call (not currently logged)
- Line 40: Need to log `req.body` if validation fails (not currently logged)

---

#### File: src/services/UserService.ts

**Existing Logging:**

| Line | Statement | Variables Logged | Level | Context |
|------|-----------|------------------|-------|---------|
| 67 | `logger.debug('Validating user data', ...)` | `userId` | debug | Validation entry |

**Variables Already Logged:** `user.id`

**Gaps Identified:**
- Line 70: Need to log `user.email` before null check (not currently logged) ← **Critical for hypothesis**
- Line 75: Need to log execution path when email is null (not currently logged)
- Line 80: Need to log `validationResult` object (not currently logged)

---

**Coverage Summary:**

- Total logging statements: 3
- Files with logging: 2/2 (100%)
- Critical gaps: 5 locations need instrumentation
- Hypothesis-critical gaps: 2 (lines 70, 75 in UserService.ts)
```

**Coverage Analysis Rules:**

1. **Focus on hypothesis variables**: Prioritize logging gaps for variables mentioned in `variablesToInspect`
2. **Identify execution path gaps**: Look for branches/conditions that aren't logged
3. **Note timing-sensitive locations**: For race conditions, identify where timing data is missing
4. **Flag error handling gaps**: Ensure all catch blocks and error paths have logging

---

### Step 5: Detect External-Only Logging

Some projects use external logging services (Datadog, Sentry, New Relic) without local logging. Detect this scenario.

**External Logging Detection:**

1. **Scan for external logging integrations:**
   ```bash
   # Check package.json / requirements.txt / go.mod for external logging packages
   grep -iE '(@datadog|dd-trace|@sentry|sentry-sdk|newrelic|elastic-apm)' package.json
   grep -iE '(datadog|sentry-sdk|newrelic|elastic-apm)' requirements.txt
   grep -iE '(datadog|sentry|newrelic|elastic)' go.mod
   ```

2. **Scan for external logging initialization:**
   ```bash
   # JavaScript/TypeScript
   grep -rn 'Sentry.init\|dd-trace\|newrelic.start' src/

   # Python
   grep -rn 'sentry_sdk.init\|ddtrace\|newrelic.agent.initialize' src/

   # Go
   grep -rn 'sentry.Init\|dd.Start\|newrelic.NewApplication' internal/
   ```

3. **Check if local logging is absent:**
   ```bash
   # If no console/logger statements found in Step 2, external-only logging likely
   ```

**External-Only Detection Logic:**

```
IF (external logging integration found) AND (no local logging statements found):
  → External-only logging detected
  → Plan console/print fallback for instrumentation
ELSE:
  → Local logging present
  → Use existing framework for instrumentation
```

**Example Detection Result:**

```markdown
### External Logging Detection

**External Integrations Found:**
- Sentry (error tracking) - initialized in src/index.ts:12
- Datadog APM (application monitoring) - initialized in src/index.ts:15

**Local Logging Coverage:**
- 0 console.log statements found
- 0 logger.* statements found
- 0 fmt.Println statements found

**Conclusion:** External-only logging detected.

**Instrumentation Strategy:**
- Use `console.log()` for debug instrumentation (won't interfere with Sentry/Datadog)
- Prefix all instrumentation logs with `[DEBUG_HYP_N]` for easy filtering
- After debugging, remove all console.log statements (they're temporary)
```

---

### Step 6: Generate Logging Infrastructure Summary

Consolidate findings into a structured summary that informs instrumentation decisions.

**Summary Template:**

```json
{
  "loggingInfrastructure": {
    "reviewedAt": "2026-01-31T08:30:00Z",
    "affectedFiles": [
      "src/controllers/UserController.ts",
      "src/services/UserService.ts"
    ],
    "framework": {
      "name": "winston",
      "version": "3.8.2",
      "detected": true,
      "importPattern": "import winston from 'winston'",
      "loggerInstantiation": "winston.createLogger(...)",
      "structuredLogging": true,
      "logFormat": "json"
    },
    "existingLoggingCoverage": {
      "totalStatements": 3,
      "filesWithLogging": 2,
      "filesWithoutLogging": 0,
      "gapsIdentified": 5,
      "hypothesisCriticalGaps": 2
    },
    "externalLogging": {
      "detected": true,
      "services": ["Sentry", "Datadog APM"],
      "localLoggingPresent": true,
      "fallbackRequired": false
    },
    "instrumentationStrategy": {
      "useFramework": true,
      "frameworkName": "winston",
      "loggerVariable": "logger",
      "logLevel": "debug",
      "structuredFormat": true,
      "fallbackMethod": null,
      "markerFormat": "// DEBUG_HYP_N_START / // DEBUG_HYP_N_END",
      "logPrefix": "[DEBUG_HYP_N]",
      "preserveExisting": true
    },
    "fileSpecificNotes": [
      {
        "file": "src/controllers/UserController.ts",
        "existingLogger": "logger (winston instance)",
        "loggerImported": true,
        "needsLoggerImport": false,
        "existingLogLevel": "info",
        "recommendedLogLevel": "debug",
        "notes": "Logger already configured, use existing instance"
      },
      {
        "file": "src/services/UserService.ts",
        "existingLogger": "logger (winston instance)",
        "loggerImported": true,
        "needsLoggerImport": false,
        "existingLogLevel": "debug",
        "recommendedLogLevel": "debug",
        "notes": "Already uses debug level, perfect for instrumentation"
      }
    ],
    "instrumentationGuidelines": [
      "Use existing winston logger instance",
      "Add instrumentation at debug level to avoid production noise",
      "Follow structured logging format: logger.debug('message', { key: value })",
      "Preserve existing logging statements (do not modify)",
      "Add marker comments around instrumentation for cleanup",
      "Include trace ID in logs for cross-file correlation: { traceId: 'HYP_1_TRACE_...' }"
    ]
  }
}
```

**Summary for External-Only Logging (Fallback Example):**

```json
{
  "loggingInfrastructure": {
    "framework": {
      "name": null,
      "detected": false
    },
    "externalLogging": {
      "detected": true,
      "services": ["Sentry"],
      "localLoggingPresent": false,
      "fallbackRequired": true
    },
    "instrumentationStrategy": {
      "useFramework": false,
      "frameworkName": null,
      "fallbackMethod": "console.log",
      "logLevel": "debug",
      "structuredFormat": false,
      "markerFormat": "// DEBUG_HYP_N_START / // DEBUG_HYP_N_END",
      "logPrefix": "[DEBUG_HYP_N]",
      "preserveExisting": true
    },
    "instrumentationGuidelines": [
      "Use console.log() for temporary debug instrumentation",
      "Prefix all logs with [DEBUG_HYP_N] for easy filtering",
      "Use simple string format: console.log('[DEBUG_HYP_1] variableName:', variableName)",
      "Remove all console.log statements after debugging (temporary only)",
      "Do not modify Sentry configuration or error tracking"
    ]
  }
}
```

---

### Step 7: Update Session File

After completing the logging infrastructure review, update the session file with findings.

**Session Update Command:**

```bash
# Update session with logging infrastructure summary
jq --argjson logging "$LOGGING_INFRASTRUCTURE_JSON" \
  '.loggingInfrastructure = $logging | .status = "logging_reviewed"' \
  .claude/debug-sessions/${SESSION_ID}.json > /tmp/session_update.json

mv /tmp/session_update.json .claude/debug-sessions/${SESSION_ID}.json
```

**Session Schema Addition:**

```typescript
interface DebugSession {
  // ... existing fields ...
  loggingInfrastructure?: {
    reviewedAt: string;
    affectedFiles: string[];
    framework: {
      name: string | null;
      version?: string;
      detected: boolean;
      importPattern?: string;
      loggerInstantiation?: string;
      structuredLogging: boolean;
      logFormat?: string;
    };
    existingLoggingCoverage: {
      totalStatements: number;
      filesWithLogging: number;
      filesWithoutLogging: number;
      gapsIdentified: number;
      hypothesisCriticalGaps: number;
    };
    externalLogging: {
      detected: boolean;
      services: string[];
      localLoggingPresent: boolean;
      fallbackRequired: boolean;
    };
    instrumentationStrategy: {
      useFramework: boolean;
      frameworkName: string | null;
      loggerVariable?: string;
      logLevel: string;
      structuredFormat: boolean;
      fallbackMethod: string | null;
      markerFormat: string;
      logPrefix: string;
      preserveExisting: boolean;
    };
    fileSpecificNotes: Array<{
      file: string;
      existingLogger: string | null;
      loggerImported: boolean;
      needsLoggerImport: boolean;
      existingLogLevel: string | null;
      recommendedLogLevel: string;
      notes: string;
    }>;
    instrumentationGuidelines: string[];
  };
  status: "logging_reviewed";  // ← New status
}
```

---

### Step 8: Display Summary to User (Optional)

Before proceeding to instrumentation, optionally show the user a summary of findings.

**User-Facing Summary Template:**

```markdown
## 📋 Logging Infrastructure Review Complete

**Framework Detected:** Winston (JSON structured logging)

**Existing Logging Coverage:**
- ✅ 2 of 2 files have logging
- 📊 3 existing log statements found
- 🔍 5 instrumentation gaps identified (2 critical for hypothesis testing)

**Instrumentation Strategy:**
- Using existing Winston logger
- Debug level (won't appear in production)
- Structured format: `logger.debug('message', { data })`
- Marker comments for cleanup: `// DEBUG_HYP_1_START`

**Next Step:** Adding targeted debug instrumentation to 5 identified gaps.
```

**Fallback Strategy Summary (External-Only Logging):**

```markdown
## 📋 Logging Infrastructure Review Complete

**Framework Detected:** None (external-only logging)

**External Services:**
- Sentry (error tracking)
- Datadog APM (monitoring)

**Instrumentation Strategy:**
- Using `console.log()` for temporary debug logs
- Prefix: `[DEBUG_HYP_1]` for filtering
- Simple string format
- Will be completely removed after debugging

**Note:** These debug logs won't interfere with Sentry or Datadog.

**Next Step:** Adding temporary console.log instrumentation.
```

---

### Proceeding to Next Phase

After logging infrastructure review is complete:

1. **Session updated** with `loggingInfrastructure` object and status `logging_reviewed`
2. **Instrumentation strategy defined**: Use existing framework OR fallback to console/print
3. **Coverage gaps identified**: Know exactly where to add instrumentation
4. **Framework compatibility ensured**: Won't conflict with existing logging

**Proceed to:**
- **Instrumentation Phase** using the strategy and guidelines from this review
- Use `instrumentationStrategy.useFramework` to choose between framework logging or fallback
- Use `fileSpecificNotes` to determine per-file logger setup
- Use `instrumentationGuidelines` for consistent instrumentation style

---

### Logging Review Rules

1. **Always review before instrumenting**: Never skip this phase
2. **Respect existing framework**: Use the project's logging approach, don't impose a different one
3. **Avoid duplication**: Don't log variables that are already being logged
4. **Follow existing patterns**: Match log level, format, and style of existing logs
5. **Plan for cleanup**: Instrumentation is temporary - ensure it can be cleanly removed
6. **Fallback gracefully**: If no framework exists, use built-in methods (console.log, print, fmt.Println)
7. **Document per-file strategy**: Different files might need different approaches
8. **Prioritize hypothesis variables**: Focus instrumentation on variables mentioned in hypotheses

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

