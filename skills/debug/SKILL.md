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

## Language-Adaptive Instrumentation Workflow Template

**Purpose:** Add debug instrumentation to code in a language-appropriate manner that follows project conventions, uses correct logging idioms, and ensures safe data formatting.

**When to Use:** After logging infrastructure review phase, before reproduction phase.

**Critical Requirement:** Instrumentation must be language-appropriate, style-preserving, and include unique markers for reliable cleanup.

---

### Overview: Why Language-Adaptive Instrumentation Matters

Adding debug instrumentation requires understanding the target language to:

1. **Use correct logging constructs**: Different languages have different logging conventions
2. **Follow project style**: Match indentation, quote style, and formatting conventions
3. **Prevent log injection**: Escape special characters that could corrupt log output
4. **Enable correlation**: Format logs consistently for cross-file analysis
5. **Ensure cleanup**: Use markers that are valid comments in the target language

This template provides language-specific instrumentation patterns for reliable debugging.

---

### Step 1: Detect Language from File

**When**: At the start of instrumentation for each file

**Action**: Identify the programming language to determine logging syntax and comment style

**Language Detection Logic:**

```
1. Extract file extension from file path
2. Map extension to language family
3. Load language-specific instrumentation patterns
4. Verify with syntax analysis if ambiguous
```

**Extension to Language Mapping:**

| Extension(s) | Language | Comment Syntax | String Syntax |
|--------------|----------|----------------|---------------|
| `.js`, `.mjs`, `.cjs` | JavaScript | `//` or `/* */` | `'`, `"`, `` ` `` |
| `.ts`, `.tsx`, `.mts`, `.cts` | TypeScript | `//` or `/* */` | `'`, `"`, `` ` `` |
| `.jsx` | JavaScript (React) | `//` or `/* */` | `'`, `"`, `` ` `` |
| `.py`, `.pyw` | Python | `#` | `'`, `"`, `'''`, `"""` |
| `.go` | Go | `//` or `/* */` | `"`, `` ` `` |
| `.java` | Java | `//` or `/* */` | `"` |
| `.kt`, `.kts` | Kotlin | `//` or `/* */` | `"`, `"""` |
| `.rb`, `.rake` | Ruby | `#` | `'`, `"` |
| `.php` | PHP | `//`, `#`, or `/* */` | `'`, `"` |
| `.c`, `.h` | C | `//` or `/* */` | `"` |
| `.cpp`, `.hpp`, `.cc`, `.cxx` | C++ | `//` or `/* */` | `"` |
| `.rs` | Rust | `//` or `/* */` | `"` |
| `.swift` | Swift | `//` or `/* */` | `"` |
| `.scala`, `.sc` | Scala | `//` or `/* */` | `"`, `"""` |
| `.cs` | C# | `//` or `/* */` | `"`, `@"` |

**Ambiguous Extension Handling:**

Some extensions need syntax analysis:
- `.h` files: Check for C++ features (`class`, `namespace`, `template`) vs pure C
- Files without extension: Scan shebang line (`#!/usr/bin/python`, `#!/bin/bash`)

**Language Detection Template:**

```json
{
  "fileLanguages": {
    "src/controllers/UserController.ts": {
      "language": "typescript",
      "detectionMethod": "extension",
      "commentSyntax": "//",
      "multilineCommentSyntax": "/* */",
      "stringQuotes": ["'", "\"", "`"],
      "loggingConstruct": "console.log"
    },
    "src/services/user_service.py": {
      "language": "python",
      "detectionMethod": "extension",
      "commentSyntax": "#",
      "multilineCommentSyntax": "'''",
      "stringQuotes": ["'", "\"", "'''", "\"\"\""],
      "loggingConstruct": "logging.debug"
    }
  }
}
```

---

### Step 2: Select Language-Appropriate Logging

**When**: After language detection, before generating instrumentation code

**Action**: Choose the correct logging method based on language AND logging infrastructure review findings

**Logging Method Selection Logic:**

```
1. Read instrumentationStrategy from logging infrastructure review
2. If useFramework = true:
   - Use frameworkName with loggerVariable (e.g., "logger.debug")
3. If useFramework = false:
   - Use language-appropriate fallback from table below
```

**Language-Specific Logging Constructs:**

#### JavaScript/TypeScript

**With Framework (from infrastructure review):**
```javascript
// Winston
logger.debug('[DEBUG_HYP_1] message', { key: value });

// Pino
logger.debug({ key: value }, '[DEBUG_HYP_1] message');

// Bunyan
log.debug({ key: value }, '[DEBUG_HYP_1] message');
```

**Fallback (no framework):**
```javascript
console.log('[DEBUG_HYP_1] message:', variable);
console.log('[DEBUG_HYP_1] object:', JSON.stringify(variable, null, 2));
console.error('[DEBUG_HYP_1] error:', error.message, error.stack);
```

**Timing:**
```javascript
// DEBUG_HYP_1_START
const DEBUG_HYP_1_START_TIME = Date.now();
console.log('[DEBUG_HYP_1][START] Entering function at', new Date().toISOString());
// ... code ...
console.log('[DEBUG_HYP_1][END] Function took', Date.now() - DEBUG_HYP_1_START_TIME, 'ms');
// DEBUG_HYP_1_END
```

#### Python

**With Framework (logging module):**
```python
import logging
logger = logging.getLogger(__name__)

# DEBUG_HYP_1_START
logger.debug('[DEBUG_HYP_1] message: %s', variable)
logger.debug('[DEBUG_HYP_1] object: %r', variable)
# DEBUG_HYP_1_END
```

**With Loguru:**
```python
from loguru import logger

# DEBUG_HYP_1_START
logger.debug('[DEBUG_HYP_1] message: {}', variable)
logger.debug('[DEBUG_HYP_1] object: {!r}', variable)
# DEBUG_HYP_1_END
```

**Fallback (no framework):**
```python
# DEBUG_HYP_1_START
print(f'[DEBUG_HYP_1] message: {variable}')
print(f'[DEBUG_HYP_1] object: {variable!r}')
# DEBUG_HYP_1_END
```

**Timing:**
```python
import time

# DEBUG_HYP_1_START
_debug_hyp_1_start = time.time()
print(f'[DEBUG_HYP_1][START] Entering function at {time.strftime("%Y-%m-%dT%H:%M:%S")}')
# ... code ...
print(f'[DEBUG_HYP_1][END] Function took {(time.time() - _debug_hyp_1_start) * 1000:.2f}ms')
# DEBUG_HYP_1_END
```

#### Go

**With Framework (logrus):**
```go
import log "github.com/sirupsen/logrus"

// DEBUG_HYP_1_START
log.WithFields(log.Fields{
    "variable": variable,
    "hyp": "HYP_1",
}).Debug("[DEBUG_HYP_1] message")
// DEBUG_HYP_1_END
```

**With Zap:**
```go
import "go.uber.org/zap"

// DEBUG_HYP_1_START
logger.Debug("[DEBUG_HYP_1] message",
    zap.Any("variable", variable),
)
// DEBUG_HYP_1_END
```

**Fallback (fmt package):**
```go
import "fmt"

// DEBUG_HYP_1_START
fmt.Printf("[DEBUG_HYP_1] message: %v\n", variable)
fmt.Printf("[DEBUG_HYP_1] object: %+v\n", variable)
// DEBUG_HYP_1_END
```

**Timing:**
```go
import "time"

// DEBUG_HYP_1_START
debugHyp1Start := time.Now()
fmt.Printf("[DEBUG_HYP_1][START] Entering function at %s\n", debugHyp1Start.Format(time.RFC3339))
// ... code ...
fmt.Printf("[DEBUG_HYP_1][END] Function took %v\n", time.Since(debugHyp1Start))
// DEBUG_HYP_1_END
```

#### Java

**With SLF4J/Logback:**
```java
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

// DEBUG_HYP_1_START
logger.debug("[DEBUG_HYP_1] message: {}", variable);
logger.debug("[DEBUG_HYP_1] object: {}", variable.toString());
// DEBUG_HYP_1_END
```

**With Log4j:**
```java
import org.apache.log4j.Logger;

// DEBUG_HYP_1_START
logger.debug("[DEBUG_HYP_1] message: " + variable);
// DEBUG_HYP_1_END
```

**Fallback (System.out):**
```java
// DEBUG_HYP_1_START
System.out.println("[DEBUG_HYP_1] message: " + variable);
System.out.println("[DEBUG_HYP_1] object: " + variable.toString());
// DEBUG_HYP_1_END
```

**Timing:**
```java
// DEBUG_HYP_1_START
long debugHyp1Start = System.currentTimeMillis();
System.out.println("[DEBUG_HYP_1][START] Entering function at " + java.time.Instant.now());
// ... code ...
System.out.println("[DEBUG_HYP_1][END] Function took " + (System.currentTimeMillis() - debugHyp1Start) + "ms");
// DEBUG_HYP_1_END
```

#### Ruby

**With Rails Logger:**
```ruby
# DEBUG_HYP_1_START
Rails.logger.debug "[DEBUG_HYP_1] message: #{variable}"
Rails.logger.debug "[DEBUG_HYP_1] object: #{variable.inspect}"
# DEBUG_HYP_1_END
```

**Fallback (puts):**
```ruby
# DEBUG_HYP_1_START
puts "[DEBUG_HYP_1] message: #{variable}"
puts "[DEBUG_HYP_1] object: #{variable.inspect}"
# DEBUG_HYP_1_END
```

**Timing:**
```ruby
# DEBUG_HYP_1_START
debug_hyp_1_start = Time.now
puts "[DEBUG_HYP_1][START] Entering function at #{debug_hyp_1_start.iso8601}"
# ... code ...
puts "[DEBUG_HYP_1][END] Function took #{((Time.now - debug_hyp_1_start) * 1000).round(2)}ms"
# DEBUG_HYP_1_END
```

#### PHP

**With Monolog:**
```php
// DEBUG_HYP_1_START
$logger->debug('[DEBUG_HYP_1] message', ['variable' => $variable]);
// DEBUG_HYP_1_END
```

**Fallback (error_log):**
```php
// DEBUG_HYP_1_START
error_log('[DEBUG_HYP_1] message: ' . print_r($variable, true));
// DEBUG_HYP_1_END
```

#### C/C++

**With spdlog (C++):**
```cpp
// DEBUG_HYP_1_START
spdlog::debug("[DEBUG_HYP_1] message: {}", variable);
// DEBUG_HYP_1_END
```

**Fallback (printf/cout):**
```c
// DEBUG_HYP_1_START
printf("[DEBUG_HYP_1] message: %d\n", variable);
// DEBUG_HYP_1_END
```

```cpp
// DEBUG_HYP_1_START
std::cout << "[DEBUG_HYP_1] message: " << variable << std::endl;
// DEBUG_HYP_1_END
```

#### Rust

**With tracing crate:**
```rust
// DEBUG_HYP_1_START
tracing::debug!("[DEBUG_HYP_1] message: {:?}", variable);
// DEBUG_HYP_1_END
```

**Fallback (println!):**
```rust
// DEBUG_HYP_1_START
println!("[DEBUG_HYP_1] message: {:?}", variable);
// DEBUG_HYP_1_END
```

---

### Step 3: Add Marker Comments

**When**: Wrapping all instrumentation code for each hypothesis

**Action**: Add unique START and END marker comments using language-appropriate syntax

**Marker Format:**

```
// DEBUG_HYP_N_START   ← Hypothesis number (1, 2, 3, etc.)
<instrumentation code>
// DEBUG_HYP_N_END
```

**Marker Comment Syntax by Language:**

| Language | Start Marker | End Marker |
|----------|-------------|------------|
| JavaScript/TypeScript | `// DEBUG_HYP_1_START` | `// DEBUG_HYP_1_END` |
| Python | `# DEBUG_HYP_1_START` | `# DEBUG_HYP_1_END` |
| Go | `// DEBUG_HYP_1_START` | `// DEBUG_HYP_1_END` |
| Java | `// DEBUG_HYP_1_START` | `// DEBUG_HYP_1_END` |
| Kotlin | `// DEBUG_HYP_1_START` | `// DEBUG_HYP_1_END` |
| Ruby | `# DEBUG_HYP_1_START` | `# DEBUG_HYP_1_END` |
| PHP | `// DEBUG_HYP_1_START` | `// DEBUG_HYP_1_END` |
| C/C++ | `// DEBUG_HYP_1_START` | `// DEBUG_HYP_1_END` |
| Rust | `// DEBUG_HYP_1_START` | `// DEBUG_HYP_1_END` |
| Swift | `// DEBUG_HYP_1_START` | `// DEBUG_HYP_1_END` |
| Scala | `// DEBUG_HYP_1_START` | `// DEBUG_HYP_1_END` |
| C# | `// DEBUG_HYP_1_START` | `// DEBUG_HYP_1_END` |
| Shell/Bash | `# DEBUG_HYP_1_START` | `# DEBUG_HYP_1_END` |
| SQL | `-- DEBUG_HYP_1_START` | `-- DEBUG_HYP_1_END` |
| HTML/XML | `<!-- DEBUG_HYP_1_START -->` | `<!-- DEBUG_HYP_1_END -->` |
| CSS | `/* DEBUG_HYP_1_START */` | `/* DEBUG_HYP_1_END */` |

**Marker Rules:**

1. **One marker pair per hypothesis**: Each hypothesis gets its own numbered markers
2. **Markers on separate lines**: Never combine markers with code on the same line
3. **Match indentation**: Markers should match the indentation level of surrounding code
4. **No nested markers**: Markers from different hypotheses should not overlap
5. **Unique identifiers**: Use hypothesis ID in markers for reliable cleanup

**Example: Multi-Hypothesis Markers in Same File:**

```typescript
async function getUser(userId: string): Promise<User> {
    // DEBUG_HYP_1_START
    console.log('[DEBUG_HYP_1] getUser called with userId:', userId);
    // DEBUG_HYP_1_END

    const user = await repository.findById(userId);

    // DEBUG_HYP_2_START
    console.log('[DEBUG_HYP_2] repository.findById returned:', JSON.stringify(user, null, 2));
    console.log('[DEBUG_HYP_2] user is null:', user === null);
    // DEBUG_HYP_2_END

    if (!user) {
        // DEBUG_HYP_1_START
        console.log('[DEBUG_HYP_1] User not found, returning null');
        // DEBUG_HYP_1_END
        return null;
    }

    return user;
}
```

---

### Step 4: Log Variable Values, Execution Paths, and Timing Data

**When**: Determining what to instrument for each hypothesis

**Action**: Add logging statements for variables, paths, and timing based on hypothesis requirements

#### 4.1 Variable Value Logging

**What to Log:**

From hypothesis `variablesToInspect` field:
- Input parameters and their values
- Return values from function calls
- Object state at critical points
- Computed values before use

**Safe Serialization Patterns:**

**JavaScript/TypeScript:**
```javascript
// DEBUG_HYP_1_START
// Simple values
console.log('[DEBUG_HYP_1] userId:', userId);
console.log('[DEBUG_HYP_1] count:', count);

// Objects - with null check and safe serialization
console.log('[DEBUG_HYP_1] user:', user ? JSON.stringify(user, null, 2) : 'null');

// Arrays - with length limit
console.log('[DEBUG_HYP_1] items (first 5):', JSON.stringify(items?.slice(0, 5), null, 2));

// Error objects
console.log('[DEBUG_HYP_1] error:', error?.message, error?.stack);
// DEBUG_HYP_1_END
```

**Python:**
```python
# DEBUG_HYP_1_START
# Simple values
print(f'[DEBUG_HYP_1] user_id: {user_id}')
print(f'[DEBUG_HYP_1] count: {count}')

# Objects - with repr for detailed view
print(f'[DEBUG_HYP_1] user: {user!r}')

# Dicts/Lists - with safe formatting
import json
print(f'[DEBUG_HYP_1] data: {json.dumps(data, default=str, indent=2)}')

# Exception objects
print(f'[DEBUG_HYP_1] error: {type(error).__name__}: {error}')
import traceback
traceback.print_exc()
# DEBUG_HYP_1_END
```

**Go:**
```go
// DEBUG_HYP_1_START
// Simple values
fmt.Printf("[DEBUG_HYP_1] userID: %s\n", userID)
fmt.Printf("[DEBUG_HYP_1] count: %d\n", count)

// Structs - with detailed view
fmt.Printf("[DEBUG_HYP_1] user: %+v\n", user)

// Pointers - with nil check
if user != nil {
    fmt.Printf("[DEBUG_HYP_1] user.Name: %s\n", user.Name)
} else {
    fmt.Printf("[DEBUG_HYP_1] user: <nil>\n")
}

// Errors
if err != nil {
    fmt.Printf("[DEBUG_HYP_1] error: %v\n", err)
}
// DEBUG_HYP_1_END
```

#### 4.2 Execution Path Logging

**What to Log:**

- Entry/exit points of functions under investigation
- Branch decisions (if/else, switch)
- Loop iterations (with iteration limits)
- Early returns

**Execution Path Patterns:**

```javascript
// DEBUG_HYP_1_START
console.log('[DEBUG_HYP_1][ENTER] processUser()');
// DEBUG_HYP_1_END

async function processUser(user: User): Promise<Result> {
    // DEBUG_HYP_1_START
    console.log('[DEBUG_HYP_1][PATH] Starting user processing');
    // DEBUG_HYP_1_END

    if (!user.isActive) {
        // DEBUG_HYP_1_START
        console.log('[DEBUG_HYP_1][BRANCH] User inactive, returning early');
        // DEBUG_HYP_1_END
        return { status: 'inactive' };
    }

    // DEBUG_HYP_1_START
    console.log('[DEBUG_HYP_1][BRANCH] User active, continuing');
    // DEBUG_HYP_1_END

    for (let i = 0; i < items.length; i++) {
        // DEBUG_HYP_1_START
        // Log first 3 iterations only to avoid log flooding
        if (i < 3) {
            console.log(`[DEBUG_HYP_1][LOOP] Processing item ${i}:`, items[i].id);
        } else if (i === 3) {
            console.log(`[DEBUG_HYP_1][LOOP] ... (${items.length - 3} more items)`);
        }
        // DEBUG_HYP_1_END

        await processItem(items[i]);
    }

    // DEBUG_HYP_1_START
    console.log('[DEBUG_HYP_1][EXIT] processUser() completed');
    // DEBUG_HYP_1_END

    return { status: 'success' };
}
```

#### 4.3 Timing Data Logging

**When to Log Timing:**

- For performance-related hypotheses
- For timeout investigations
- For race condition analysis
- For operations involving external calls

**Timing Patterns:**

**JavaScript/TypeScript:**
```javascript
// DEBUG_HYP_1_START
const DEBUG_HYP_1_START_TIME = performance.now();
const DEBUG_HYP_1_TIMESTAMP = new Date().toISOString();
console.log(`[DEBUG_HYP_1][TIMING][START] ${DEBUG_HYP_1_TIMESTAMP}`);
// DEBUG_HYP_1_END

// ... code being timed ...

// DEBUG_HYP_1_START
const DEBUG_HYP_1_END_TIME = performance.now();
const DEBUG_HYP_1_DURATION = DEBUG_HYP_1_END_TIME - DEBUG_HYP_1_START_TIME;
console.log(`[DEBUG_HYP_1][TIMING][END] Duration: ${DEBUG_HYP_1_DURATION.toFixed(2)}ms`);
// DEBUG_HYP_1_END
```

**Python:**
```python
# DEBUG_HYP_1_START
import time
from datetime import datetime
_debug_hyp_1_start = time.perf_counter()
_debug_hyp_1_timestamp = datetime.utcnow().isoformat() + 'Z'
print(f'[DEBUG_HYP_1][TIMING][START] {_debug_hyp_1_timestamp}')
# DEBUG_HYP_1_END

# ... code being timed ...

# DEBUG_HYP_1_START
_debug_hyp_1_end = time.perf_counter()
_debug_hyp_1_duration = (_debug_hyp_1_end - _debug_hyp_1_start) * 1000
print(f'[DEBUG_HYP_1][TIMING][END] Duration: {_debug_hyp_1_duration:.2f}ms')
# DEBUG_HYP_1_END
```

---

### Step 5: Preserve Indentation and Code Style

**When**: Generating instrumentation code to insert into files

**Action**: Match the existing code style for seamless integration

**Style Detection:**

1. **Indentation Style**: Detect tabs vs spaces, and space count (2, 4, 8)
2. **Quote Style**: Detect single vs double quotes preference
3. **Semicolon Usage**: Detect if semicolons are used (JavaScript)
4. **Line Ending Style**: Detect LF vs CRLF
5. **Brace Style**: Detect K&R vs Allman brace placement

**Style Detection Commands:**

```bash
# Detect indentation (tabs vs spaces)
head -50 src/file.ts | grep -E '^\s' | head -1 | cat -A

# Detect quote style in JS/TS
grep -oE "['\"][^'\"]+['\"]" src/file.ts | head -10

# Detect semicolon usage
grep -c ';$' src/file.ts
```

**Style Preservation Rules:**

1. **Match indentation exactly**: Use same tabs/spaces as surrounding code
2. **Match quote style**: Use same quote character for strings
3. **Match line endings**: Preserve LF or CRLF
4. **Follow existing patterns**: If file uses `const`, don't use `let` in instrumentation
5. **Match brace style**: Follow same opening brace placement

**Example: Style-Preserving Instrumentation**

**Original Code (2-space indent, single quotes, no semicolons):**
```javascript
async function getUser(userId) {
  const user = await db.findUser(userId)
  return user
}
```

**Instrumented (matches style):**
```javascript
async function getUser(userId) {
  // DEBUG_HYP_1_START
  console.log('[DEBUG_HYP_1] getUser called with userId:', userId)
  // DEBUG_HYP_1_END
  const user = await db.findUser(userId)
  // DEBUG_HYP_1_START
  console.log('[DEBUG_HYP_1] db.findUser returned:', user)
  // DEBUG_HYP_1_END
  return user
}
```

**Style Analysis Template:**

```json
{
  "fileStyle": {
    "src/services/user.ts": {
      "indentation": {
        "type": "spaces",
        "size": 2
      },
      "quotes": "single",
      "semicolons": false,
      "lineEnding": "LF",
      "braceStyle": "K&R"
    }
  }
}
```

---

### Step 6: Escape Special Characters for Log Safety

**When**: Generating log statements that include user data or external input

**Action**: Sanitize values to prevent log injection and ensure readable output

**Log Injection Risks:**

1. **Newline injection**: Attacker data contains `\n` to create fake log entries
2. **Control character injection**: Data contains ANSI escape codes
3. **Format string injection**: Data contains format specifiers like `%s`, `%d`, `{}`, etc.
4. **JSON breaking**: Data contains unescaped quotes or special characters

**Escaping Patterns by Language:**

**JavaScript/TypeScript:**
```javascript
// DEBUG_HYP_1_START
// Safe string logging - escape newlines and control characters
function debugSafeString(value) {
    if (typeof value !== 'string') return String(value);
    return value
        .replace(/\\/g, '\\\\')     // Escape backslashes
        .replace(/\n/g, '\\n')       // Escape newlines
        .replace(/\r/g, '\\r')       // Escape carriage returns
        .replace(/\t/g, '\\t')       // Escape tabs
        .replace(/[\x00-\x1F\x7F]/g, ''); // Remove control characters
}

// Usage
console.log('[DEBUG_HYP_1] userInput:', debugSafeString(userInput));

// For JSON serialization - handle circular references
function debugSafeJson(obj, maxDepth = 3) {
    const seen = new WeakSet();
    return JSON.stringify(obj, (key, value) => {
        if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) return '[Circular]';
            seen.add(value);
        }
        return value;
    }, 2);
}
// DEBUG_HYP_1_END
```

**Python:**
```python
# DEBUG_HYP_1_START
import re

def debug_safe_string(value):
    """Escape special characters for safe logging"""
    if not isinstance(value, str):
        return str(value)
    # Escape newlines, carriage returns, tabs
    value = value.replace('\\', '\\\\')
    value = value.replace('\n', '\\n')
    value = value.replace('\r', '\\r')
    value = value.replace('\t', '\\t')
    # Remove control characters
    value = re.sub(r'[\x00-\x1f\x7f]', '', value)
    return value

# Usage
print(f'[DEBUG_HYP_1] user_input: {debug_safe_string(user_input)}')

# For complex objects - limit depth
import json
def debug_safe_json(obj, max_depth=3):
    """Safely serialize object with depth limit"""
    try:
        return json.dumps(obj, default=str, indent=2)[:5000]  # Limit size
    except Exception as e:
        return f'<serialization error: {e}>'
# DEBUG_HYP_1_END
```

**Go:**
```go
// DEBUG_HYP_1_START
import (
    "regexp"
    "strings"
)

func debugSafeString(value string) string {
    // Escape newlines and control characters
    value = strings.ReplaceAll(value, "\\", "\\\\")
    value = strings.ReplaceAll(value, "\n", "\\n")
    value = strings.ReplaceAll(value, "\r", "\\r")
    value = strings.ReplaceAll(value, "\t", "\\t")
    // Remove control characters
    re := regexp.MustCompile(`[\x00-\x1f\x7f]`)
    value = re.ReplaceAllString(value, "")
    return value
}

// Usage
fmt.Printf("[DEBUG_HYP_1] userInput: %s\n", debugSafeString(userInput))
// DEBUG_HYP_1_END
```

**Escaping Rules:**

1. **Always escape user input**: Any variable that could contain external data
2. **Limit output length**: Truncate long strings to prevent log flooding
3. **Handle circular references**: Use safe serialization for objects
4. **Remove control characters**: Strip ANSI codes and non-printable chars
5. **Use repr/inspect for debugging**: Shows escaped strings by default

**Recommended Output Limits:**

| Data Type | Max Length | Truncation Strategy |
|-----------|------------|---------------------|
| Simple string | 500 chars | Truncate with `...` |
| Object/JSON | 2000 chars | Truncate with `[truncated]` |
| Array | 5 items | Show first N with count |
| Stack trace | 10 frames | Show top N frames |

---

### Step 7: Generate Instrumentation Code

**When**: Ready to add instrumentation to specific files and locations

**Action**: Generate complete instrumentation code blocks for each hypothesis location

**Instrumentation Generation Template:**

```json
{
  "instrumentation": {
    "hypothesisId": "HYP_1",
    "file": "src/services/UserService.ts",
    "insertions": [
      {
        "lineNumber": 45,
        "position": "before",
        "indentation": "    ",
        "code": [
          "// DEBUG_HYP_1_START",
          "console.log('[DEBUG_HYP_1] findUser called with:', { userId });",
          "const DEBUG_HYP_1_START_TIME = Date.now();",
          "// DEBUG_HYP_1_END"
        ]
      },
      {
        "lineNumber": 52,
        "position": "after",
        "indentation": "    ",
        "code": [
          "// DEBUG_HYP_1_START",
          "console.log('[DEBUG_HYP_1] findUser result:', user ? 'found' : 'null');",
          "console.log('[DEBUG_HYP_1] findUser took:', Date.now() - DEBUG_HYP_1_START_TIME, 'ms');",
          "// DEBUG_HYP_1_END"
        ]
      }
    ]
  }
}
```

**Insertion Position Types:**

- `before`: Insert instrumentation before the target line
- `after`: Insert instrumentation after the target line
- `wrap`: Wrap the target line with start/end instrumentation

---

### Step 8: Update Session and Commit Instrumentation

**When**: After instrumentation is added to all files

**Action**: Update session file and create instrumentation commit

**Session Update:**

```json
{
  "status": "instrumented",
  "instrumentation": {
    "timestamp": "2026-01-31T09:00:00Z",
    "files": [
      {
        "file": "src/services/UserService.ts",
        "hypotheses": ["HYP_1", "HYP_2"],
        "insertionCount": 4,
        "linesAdded": 16
      },
      {
        "file": "src/controllers/UserController.ts",
        "hypotheses": ["HYP_1"],
        "insertionCount": 2,
        "linesAdded": 8
      }
    ],
    "totalLinesAdded": 24,
    "commitSha": "abc123def"
  }
}
```

**Commit Template:**

```bash
git add -A
git commit -m "debug: Add HYP_1, HYP_2 instrumentation

Session: ${SESSION_ID}
Iteration: ${ITERATION_COUNT}
Files instrumented:
- src/services/UserService.ts (4 insertions)
- src/controllers/UserController.ts (2 insertions)
"
```

---

### Instrumentation Examples

#### Example 1: TypeScript Null Reference Investigation

**Hypothesis:** `user.email` is null when accessed at line 45

**Original Code:**
```typescript
async function sendWelcomeEmail(userId: string): Promise<void> {
    const user = await userRepository.findById(userId);
    const emailService = new EmailService();
    await emailService.send(user.email, 'Welcome!', welcomeTemplate);
}
```

**Instrumented Code:**
```typescript
async function sendWelcomeEmail(userId: string): Promise<void> {
    // DEBUG_HYP_1_START
    console.log('[DEBUG_HYP_1] sendWelcomeEmail called with userId:', userId);
    // DEBUG_HYP_1_END

    const user = await userRepository.findById(userId);

    // DEBUG_HYP_1_START
    console.log('[DEBUG_HYP_1] userRepository.findById returned:');
    console.log('[DEBUG_HYP_1]   user:', user ? JSON.stringify(user, null, 2) : 'null');
    console.log('[DEBUG_HYP_1]   user.email:', user?.email ?? 'undefined');
    console.log('[DEBUG_HYP_1]   typeof user.email:', typeof user?.email);
    // DEBUG_HYP_1_END

    const emailService = new EmailService();

    // DEBUG_HYP_1_START
    console.log('[DEBUG_HYP_1] About to call emailService.send with:');
    console.log('[DEBUG_HYP_1]   to:', user?.email ?? 'undefined');
    // DEBUG_HYP_1_END

    await emailService.send(user.email, 'Welcome!', welcomeTemplate);

    // DEBUG_HYP_1_START
    console.log('[DEBUG_HYP_1] emailService.send completed');
    // DEBUG_HYP_1_END
}
```

#### Example 2: Python Race Condition Investigation

**Hypothesis:** Cache read returns stale data due to race with invalidation

**Original Code:**
```python
class CacheService:
    def get_user(self, user_id: str) -> Optional[User]:
        cached = self.cache.get(f"user:{user_id}")
        if cached:
            return User.from_dict(cached)

        user = self.db.find_user(user_id)
        if user:
            self.cache.set(f"user:{user_id}", user.to_dict())
        return user
```

**Instrumented Code:**
```python
import time
from datetime import datetime

class CacheService:
    def get_user(self, user_id: str) -> Optional[User]:
        # DEBUG_HYP_2_START
        _debug_hyp_2_start = time.perf_counter()
        _debug_hyp_2_ts = datetime.utcnow().isoformat() + 'Z'
        print(f'[DEBUG_HYP_2][{_debug_hyp_2_ts}] get_user called with user_id: {user_id}')
        # DEBUG_HYP_2_END

        cached = self.cache.get(f"user:{user_id}")

        # DEBUG_HYP_2_START
        print(f'[DEBUG_HYP_2][{datetime.utcnow().isoformat()}Z] cache.get returned: {cached is not None}')
        if cached:
            print(f'[DEBUG_HYP_2] cached data: {cached!r}')
        # DEBUG_HYP_2_END

        if cached:
            # DEBUG_HYP_2_START
            print(f'[DEBUG_HYP_2][BRANCH] Returning cached user')
            print(f'[DEBUG_HYP_2][TIMING] Cache hit took {(time.perf_counter() - _debug_hyp_2_start) * 1000:.2f}ms')
            # DEBUG_HYP_2_END
            return User.from_dict(cached)

        # DEBUG_HYP_2_START
        print(f'[DEBUG_HYP_2][BRANCH] Cache miss, querying database')
        _debug_db_start = time.perf_counter()
        # DEBUG_HYP_2_END

        user = self.db.find_user(user_id)

        # DEBUG_HYP_2_START
        print(f'[DEBUG_HYP_2] db.find_user returned: {user!r}')
        print(f'[DEBUG_HYP_2][TIMING] DB query took {(time.perf_counter() - _debug_db_start) * 1000:.2f}ms')
        # DEBUG_HYP_2_END

        if user:
            self.cache.set(f"user:{user_id}", user.to_dict())
            # DEBUG_HYP_2_START
            print(f'[DEBUG_HYP_2] Cached user data for user_id: {user_id}')
            # DEBUG_HYP_2_END

        # DEBUG_HYP_2_START
        print(f'[DEBUG_HYP_2][TIMING] Total get_user took {(time.perf_counter() - _debug_hyp_2_start) * 1000:.2f}ms')
        # DEBUG_HYP_2_END

        return user
```

#### Example 3: Go Timeout Investigation

**Hypothesis:** External API call exceeds timeout for large payloads

**Original Code:**
```go
func (s *PaymentService) ProcessPayment(ctx context.Context, order Order) (*PaymentResult, error) {
    payload := s.buildPayload(order)
    resp, err := s.client.Post(ctx, "/payments", payload)
    if err != nil {
        return nil, fmt.Errorf("payment failed: %w", err)
    }
    return s.parseResponse(resp)
}
```

**Instrumented Code:**
```go
import (
    "time"
    "encoding/json"
)

func (s *PaymentService) ProcessPayment(ctx context.Context, order Order) (*PaymentResult, error) {
    // DEBUG_HYP_3_START
    debugHyp3Start := time.Now()
    fmt.Printf("[DEBUG_HYP_3][%s] ProcessPayment called\n", debugHyp3Start.Format(time.RFC3339Nano))
    fmt.Printf("[DEBUG_HYP_3] order.ID: %s\n", order.ID)
    fmt.Printf("[DEBUG_HYP_3] order.Items count: %d\n", len(order.Items))
    // DEBUG_HYP_3_END

    payload := s.buildPayload(order)

    // DEBUG_HYP_3_START
    payloadJson, _ := json.Marshal(payload)
    fmt.Printf("[DEBUG_HYP_3] payload size: %d bytes\n", len(payloadJson))
    fmt.Printf("[DEBUG_HYP_3] buildPayload took: %v\n", time.Since(debugHyp3Start))
    apiCallStart := time.Now()
    // DEBUG_HYP_3_END

    resp, err := s.client.Post(ctx, "/payments", payload)

    // DEBUG_HYP_3_START
    apiCallDuration := time.Since(apiCallStart)
    fmt.Printf("[DEBUG_HYP_3] API call took: %v\n", apiCallDuration)
    if err != nil {
        fmt.Printf("[DEBUG_HYP_3] API error: %v\n", err)
        if ctx.Err() == context.DeadlineExceeded {
            fmt.Printf("[DEBUG_HYP_3] Context deadline exceeded!\n")
        }
    } else {
        fmt.Printf("[DEBUG_HYP_3] API response status: %d\n", resp.StatusCode)
    }
    // DEBUG_HYP_3_END

    if err != nil {
        return nil, fmt.Errorf("payment failed: %w", err)
    }

    result := s.parseResponse(resp)

    // DEBUG_HYP_3_START
    fmt.Printf("[DEBUG_HYP_3] Total ProcessPayment took: %v\n", time.Since(debugHyp3Start))
    // DEBUG_HYP_3_END

    return result, nil
}
```

---

### Instrumentation Rules

1. **Always use markers**: Every instrumentation block must have START and END markers
2. **Use hypothesis ID in logs**: Include `[DEBUG_HYP_N]` prefix for filtering
3. **Match language idioms**: Use the language's natural logging approach
4. **Preserve style**: Match indentation, quotes, and formatting
5. **Escape user data**: Sanitize any external input before logging
6. **Include timing for performance issues**: Add timestamps when timing is relevant
7. **Limit output size**: Truncate large objects to prevent log flooding
8. **Log execution paths**: Include ENTER, EXIT, BRANCH markers for flow tracing
9. **Handle nulls safely**: Use safe navigation (`?.`, `?:`, `or`, etc.)
10. **Avoid side effects**: Instrumentation must not change program behavior

---

### Proceeding to Next Phase

After instrumentation is complete:

1. **Session updated** with `instrumentation` object and status `instrumented`
2. **Instrumentation commit created** with hypothesis details
3. **All affected files contain marker comments** for cleanup
4. **Log statements use consistent format** for parsing

**Proceed to:**
- **Reproduction Phase** to trigger the instrumented code and collect logs
- Use reproduction steps from session to trigger the issue
- Capture all console/log output for analysis

---

## Issue Reproduction Workflow Template

After instrumentation is complete, the next step is to reproduce the issue to capture debug logs. This template guides systematic reproduction through automated tests or manual execution.

---

### Overview

The reproduction workflow has two paths:

1. **Automated Reproduction**: When the issue can be triggered via existing tests or generated test cases
2. **Manual Reproduction**: When the issue requires user interaction, external services, or complex environment setup

The goal is to execute the instrumented code paths and capture all log output for hypothesis verification.

---

### Step 1: Test Suite Detection

Identify existing testing infrastructure to determine automation feasibility.

#### Test Framework Detection Commands

**JavaScript/TypeScript:**
```bash
# Check for Jest
grep -r "jest" package.json
ls -la jest.config.* 2>/dev/null

# Check for Mocha
grep -r "mocha" package.json
ls -la .mocharc.* test/mocha.opts 2>/dev/null

# Check for Vitest
grep -r "vitest" package.json
ls -la vitest.config.* 2>/dev/null

# Check for Cypress
grep -r "cypress" package.json
ls -la cypress.config.* 2>/dev/null
```

**Python:**
```bash
# Check for pytest
grep -r "pytest" requirements.txt pyproject.toml setup.py
ls -la pytest.ini conftest.py 2>/dev/null

# Check for unittest
find . -name "test_*.py" -o -name "*_test.py"

# Check for nose
grep -r "nose" requirements.txt setup.py
```

**Go:**
```bash
# Go has built-in testing
find . -name "*_test.go"
ls -la go.mod 2>/dev/null
```

**Java/Kotlin:**
```bash
# Check for JUnit
grep -r "junit" pom.xml build.gradle build.gradle.kts
find . -path "*/test/*" -name "*.java" -o -name "*.kt"

# Check for TestNG
grep -r "testng" pom.xml build.gradle
```

**Ruby:**
```bash
# Check for RSpec
grep -r "rspec" Gemfile
ls -la .rspec spec/ 2>/dev/null

# Check for Minitest
grep -r "minitest" Gemfile
find . -path "*/test/*" -name "*_test.rb"
```

#### Test Detection Schema

Store detected test infrastructure in session:

```json
{
  "testInfrastructure": {
    "hasTests": true,
    "framework": "jest",
    "testCommand": "npm test",
    "testFiles": ["src/__tests__/user.test.ts", "src/__tests__/api.test.ts"],
    "canAutomate": true,
    "automationStrategy": "generate_test_case",
    "reason": "Jest configured, TypeScript project, API endpoint can be tested in isolation"
  }
}
```

**Fields:**
- `hasTests` (boolean): Whether test infrastructure exists
- `framework` (string): Detected test framework name
- `testCommand` (string): Command to run tests
- `testFiles` (array): List of existing test file paths
- `canAutomate` (boolean): Whether issue can be reproduced via automated test
- `automationStrategy` (string): `generate_test_case`, `use_existing_test`, or `manual_reproduction`
- `reason` (string): Explanation of automation decision

---

### Step 2: Determine Automation Feasibility

Analyze the issue type and reproduction steps to decide between automated and manual reproduction.

#### Automation Feasibility Decision Tree

**Can Automate If:**
1. **API/Backend Issue**: HTTP endpoints can be called with `fetch`, `axios`, or test client
2. **Pure Function Issue**: Logic bugs in functions that don't require external state
3. **Database Issue**: Can mock database or use test database
4. **CLI Tool Issue**: Can execute command and capture output
5. **Existing Test Failure**: Issue reproduces via existing failing test

**Cannot Automate If:**
1. **UI Issue**: Requires browser interaction (clicks, form input, visual verification)
   - *Exception*: Can automate with Selenium/Playwright if available
2. **External Service Issue**: Requires third-party API that can't be mocked
3. **Environment-Specific**: Requires production data, specific hardware, or network conditions
4. **User Flow Issue**: Requires complex multi-step user interactions across multiple pages
5. **Timing-Dependent**: Requires specific race conditions or delays hard to simulate

#### Automation Decision Prompt

For each hypothesis, ask:

1. **What code paths need to execute?** (Check if they're in instrumented files)
2. **What inputs trigger the issue?** (Check if inputs can be provided programmatically)
3. **What external dependencies exist?** (Check if they can be mocked or stubbed)
4. **Can the issue be reproduced in isolation?** (Check if minimal test case is possible)

**Example Decision:**

```
Issue: "POST /api/users with null email returns 500 instead of 400"

Analysis:
- Code paths: UserController.create (instrumented ✓)
- Inputs: HTTP POST request with JSON body (programmable ✓)
- External dependencies: Database (can use test DB or mock ✓)
- Isolation: Yes, single endpoint test (✓)

Decision: AUTOMATE with generated test case
```

---

### Step 3A: Automated Test Generation (If Automation Feasible)

Generate a test case that reproduces the issue and captures logs.

#### Test Case Template

**JavaScript/TypeScript (Jest):**

```typescript
// test/debug/reproduction-HYP_1.test.ts
// AUTO-GENERATED DEBUG TEST for Hypothesis 1
// DO NOT COMMIT - This is a temporary debug reproduction test

import { testClient } from '../helpers/testClient';
import { setupTestDb, teardownTestDb } from '../helpers/testDb';

describe('Debug Reproduction: HYP_1', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  it('reproduces issue: POST /api/users with null email', async () => {
    // Reproduction step from session
    const response = await testClient
      .post('/api/users')
      .send({ name: 'Test User', email: null });

    // Capture response for analysis
    console.log('[DEBUG_REPRO] Response status:', response.status);
    console.log('[DEBUG_REPRO] Response body:', JSON.stringify(response.body));

    // Expected behavior assertion (may fail - that's the point)
    // expect(response.status).toBe(400);  // Commented out to capture logs even on failure
  });
});
```

**Python (pytest):**

```python
# test/debug/test_reproduction_hyp_1.py
# AUTO-GENERATED DEBUG TEST for Hypothesis 1
# DO NOT COMMIT - This is a temporary debug reproduction test

import pytest
import logging
from app import create_app
from test.helpers import setup_test_db, teardown_test_db

logger = logging.getLogger(__name__)

@pytest.fixture(scope="module")
def client():
    app = create_app(config="testing")
    setup_test_db()
    yield app.test_client()
    teardown_test_db()

def test_reproduce_null_email_issue(client):
    """Reproduces issue: POST /api/users with null email"""

    # Reproduction step from session
    response = client.post('/api/users', json={
        'name': 'Test User',
        'email': None
    })

    # Capture response for analysis
    logger.info(f"[DEBUG_REPRO] Response status: {response.status_code}")
    logger.info(f"[DEBUG_REPRO] Response body: {response.get_json()}")

    # Expected behavior assertion (may fail - that's the point)
    # assert response.status_code == 400  # Commented out to capture logs even on failure
```

**Go (testing):**

```go
// test/debug/reproduction_hyp_1_test.go
// AUTO-GENERATED DEBUG TEST for Hypothesis 1
// DO NOT COMMIT - This is a temporary debug reproduction test

package debug_test

import (
    "bytes"
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "testing"
    "yourapp/api"
)

func TestReproduceNullEmailIssue(t *testing.T) {
    // Setup test server
    router := api.SetupRouter()
    server := httptest.NewServer(router)
    defer server.Close()

    // Reproduction step from session
    payload := map[string]interface{}{
        "name":  "Test User",
        "email": nil,
    }
    body, _ := json.Marshal(payload)

    resp, err := http.Post(server.URL+"/api/users", "application/json", bytes.NewBuffer(body))
    if err != nil {
        t.Fatalf("Request failed: %v", err)
    }
    defer resp.Body.Close()

    // Capture response for analysis
    t.Logf("[DEBUG_REPRO] Response status: %d", resp.StatusCode)
    var respBody map[string]interface{}
    json.NewDecoder(resp.Body).Decode(&respBody)
    t.Logf("[DEBUG_REPRO] Response body: %+v", respBody)

    // Expected behavior assertion (may fail - that's the point)
    // assert.Equal(t, 400, resp.StatusCode)  // Commented out to capture logs even on failure
}
```

#### Test Generation Rules

1. **File naming**: `test/debug/reproduction-HYP_<N>.<ext>` or `test_reproduction_hyp_<N>.<ext>`
2. **Test isolation**: Each hypothesis gets its own test file for clarity
3. **Setup/teardown**: Use test framework's setup/teardown for database/state management
4. **Log markers**: Prefix reproduction logs with `[DEBUG_REPRO]` for identification
5. **Assertion strategy**: Comment out assertions to allow log capture even when test fails
6. **DO NOT COMMIT marker**: Add prominent comment that this is temporary debug code
7. **Reproduction steps**: Translate session reproduction steps into test code
8. **Capture output**: Log response status, body, and any relevant state

---

### Step 3B: Manual Reproduction Script (If Automation Not Feasible)

Generate a step-by-step manual test script for the user to execute.

#### Manual Test Script Template

```markdown
# Manual Reproduction Script for HYP_1

**DO NOT COMMIT** - This is a temporary debug reproduction script

## Prerequisites

- Application running in development mode
- Database seeded with test data
- Browser DevTools open (Console + Network tabs)

## Reproduction Steps

Follow these steps exactly and observe the console/terminal output:

### Step 1: Start the application
```bash
npm run dev
```

**Expected Output:**
- Server starts on http://localhost:3000
- Console shows "Server listening on port 3000"

### Step 2: Open the application in browser

1. Navigate to: http://localhost:3000/users/new
2. Open Browser DevTools (F12)
3. Go to Console tab
4. Go to Network tab

### Step 3: Trigger the issue

1. Fill in the form:
   - **Name field**: Enter "Test User"
   - **Email field**: Leave empty or enter null
2. Click "Submit" button
3. **IMPORTANT**: Watch the following:
   - Browser console for errors
   - Network tab for HTTP request/response
   - Terminal/console where server is running

### Step 4: Capture logs

Copy the following outputs:

**From Browser Console:**
```
(Paste any error messages or console.log output here)
```

**From Browser Network Tab:**
- Request URL: _______________
- Request Method: _______________
- Status Code: _______________
- Response Body:
```
(Paste response body here)
```

**From Server Terminal:**
```
(Paste all server log output after clicking Submit)
```

### Step 5: Provide the captured logs

Reply with the captured logs from Step 4. The logs should contain markers like:
- `[DEBUG_HYP_1_START]` - Entry point for hypothesis 1
- `[DEBUG_HYP_1] ...` - Variable values and execution paths
- `[DEBUG_HYP_1_END]` - Exit point for hypothesis 1

## What to Look For

The instrumentation added the following debug logs. You should see these markers in the output:

1. **In UserController.create** (src/controllers/user.ts:45):
   - `[DEBUG_HYP_1_START] UserController.create ENTER`
   - `[DEBUG_HYP_1] req.body = {...}`
   - `[DEBUG_HYP_1] email value = null`

2. **In validation logic** (src/validators/user.ts:12):
   - `[DEBUG_HYP_1] Validation result = {...}`

If you don't see these markers, the code path may not have executed. Please try the reproduction steps again.

---

## Troubleshooting

**If the issue doesn't reproduce:**
- Verify all prerequisites are met
- Try clearing browser cache and restarting server
- Check that you're following the exact steps (order matters)

**If no debug logs appear:**
- Check that the instrumentation commit was applied (git log)
- Verify the application restarted after instrumentation
- Ensure logging framework is configured correctly

---

**After capturing logs, the debug skill will proceed to Log Analysis phase.**
```

#### Manual Script Generation Rules

1. **Markdown format**: Easy to read and copy
2. **Prerequisites section**: List all environment setup needed
3. **Numbered steps**: Clear, sequential instructions
4. **Expected output**: Tell user what they should see at each step
5. **Capture instructions**: Explicit guidance on what logs to copy
6. **Marker explanation**: Show user what debug markers to look for
7. **Troubleshooting**: Common issues and how to resolve them
8. **DO NOT COMMIT**: Remind user this is temporary
9. **Next phase**: Tell user what happens after they provide logs

---

### Step 4: Execute Reproduction

Execute the automated test or prompt the user to run the manual script.

#### For Automated Reproduction

**Run the generated test:**

```bash
# JavaScript/TypeScript
npm test -- test/debug/reproduction-HYP_1.test.ts

# Python
pytest test/debug/test_reproduction_hyp_1.py -v -s

# Go
go test -v ./test/debug/reproduction_hyp_1_test.go

# Java
mvn test -Dtest=ReproductionHyp1Test

# Ruby
rspec spec/debug/reproduction_hyp_1_spec.rb
```

**Capture output:**

1. Redirect stdout and stderr to a log file:
   ```bash
   npm test -- test/debug/reproduction-HYP_1.test.ts 2>&1 | tee logs/reproduction-hyp-1.log
   ```

2. Parse the log file for debug markers:
   ```bash
   grep -E '\[DEBUG_(HYP_[0-9]+|REPRO)\]' logs/reproduction-hyp-1.log
   ```

3. Store full logs in session:
   ```json
   {
     "reproductionRun": {
       "timestamp": "2026-01-31T10:30:00Z",
       "hypothesisId": "HYP_1",
       "method": "automated",
       "testFile": "test/debug/reproduction-HYP_1.test.ts",
       "testCommand": "npm test -- test/debug/reproduction-HYP_1.test.ts",
       "exitCode": 1,
       "duration": 2.5,
       "fullLog": "... (complete log output) ...",
       "debugMarkers": [
         "[DEBUG_HYP_1_START] UserController.create ENTER",
         "[DEBUG_HYP_1] req.body = {name: 'Test User', email: null}",
         "[DEBUG_HYP_1] email value = null",
         "[DEBUG_HYP_1] TypeError: Cannot read property 'toLowerCase' of null at line 47"
       ],
       "reproduced": true
     }
   }
   ```

#### For Manual Reproduction

1. **Display the manual script** to the user
2. **Prompt for logs**:
   > Please follow the manual reproduction script above and provide the captured logs.
   >
   > When ready, paste the logs here (you can use multiple messages if needed).
3. **Wait for user input** (user provides logs via chat)
4. **Parse user-provided logs** for debug markers
5. **Store logs in session** with same schema as automated

---

### Step 5: Verify Reproduction Success

Check whether the issue was successfully reproduced by analyzing the captured logs.

#### Reproduction Success Criteria

The reproduction is successful if:

1. **Debug markers present**: At least one `[DEBUG_HYP_N_*]` marker appears in logs
2. **Code path executed**: Markers from instrumented files are present
3. **Issue behavior observed**: Error messages or incorrect behavior matches session description
4. **Logs are parseable**: Log format is consistent and can be extracted

#### Reproduction Verification Prompt

```
Analyzing reproduction logs for Hypothesis HYP_1...

✓ Debug markers found: 12 markers detected
✓ Code path executed: UserController.create, validateEmail, emailToLowerCase
✓ Issue observed: TypeError: Cannot read property 'toLowerCase' of null
✓ Logs parseable: All markers extracted successfully

**Reproduction Status: SUCCESS**

Proceeding to Log Analysis phase to confirm hypothesis...
```

**If reproduction fails:**

```
Analyzing reproduction logs for Hypothesis HYP_1...

✗ Debug markers found: 0 markers detected
✗ Code path executed: No instrumented code paths executed
? Issue observed: Cannot determine (no logs)

**Reproduction Status: FAILED**

**Possible reasons:**
1. Test did not trigger the instrumented code path
2. Logging framework not configured correctly
3. Instrumentation markers not present in code (check instrumentation commit)
4. Test environment differs from issue environment

**Next steps:**
1. Verify instrumentation commit was applied: git log --oneline -5
2. Check that instrumented files contain markers: grep -r "DEBUG_HYP_1" src/
3. Verify test setup matches reproduction steps from session
4. Consider manual reproduction if automated approach doesn't match environment
```

---

### Step 6: Store Logs for Analysis

Update the session with reproduction results.

#### Session Update Schema

```json
{
  "reproductionRuns": [
    {
      "runId": "run_1738320600_abc123",
      "timestamp": "2026-01-31T10:30:00Z",
      "hypothesisId": "HYP_1",
      "method": "automated",
      "testFile": "test/debug/reproduction-HYP_1.test.ts",
      "testCommand": "npm test -- test/debug/reproduction-HYP_1.test.ts",
      "exitCode": 1,
      "duration": 2.5,
      "fullLog": "... (complete stdout/stderr) ...",
      "debugMarkers": [
        {
          "marker": "[DEBUG_HYP_1_START] UserController.create ENTER",
          "lineNumber": 45,
          "file": "src/controllers/user.ts",
          "timestamp": "2026-01-31T10:30:01.234Z"
        },
        {
          "marker": "[DEBUG_HYP_1] req.body",
          "value": "{name: 'Test User', email: null}",
          "lineNumber": 46,
          "file": "src/controllers/user.ts"
        }
      ],
      "reproduced": true,
      "issueObserved": "TypeError: Cannot read property 'toLowerCase' of null",
      "notes": "Issue reproduced successfully on first attempt"
    }
  ],
  "status": "reproduction_run"
}
```

**Fields:**
- `runId` (string): Unique identifier for this reproduction run
- `timestamp` (string): When reproduction was executed
- `hypothesisId` (string): Which hypothesis this reproduction tests
- `method` (string): `automated` or `manual`
- `testFile` (string): Path to generated test file (if automated)
- `testCommand` (string): Command used to run test
- `exitCode` (number): Test exit code (0 = pass, non-zero = fail)
- `duration` (number): Seconds taken to run test
- `fullLog` (string): Complete stdout/stderr output
- `debugMarkers` (array): Parsed debug markers with context
- `reproduced` (boolean): Whether issue was successfully reproduced
- `issueObserved` (string): Brief description of observed issue
- `notes` (string): Additional context or observations

---

### Step 7: Reproduction Rules

1. **Always prefer automated reproduction** when feasible - it's faster and more reliable
2. **Generate minimal test cases** - only include code needed to trigger the issue
3. **Use test framework conventions** - follow project's existing test patterns
4. **Capture complete logs** - don't truncate, log analysis needs full output
5. **Store reproduction artifacts** - test files and logs for potential re-runs
6. **Mark as temporary** - ensure generated tests are not accidentally committed
7. **Validate before analysis** - check that markers are present before proceeding
8. **Support re-runs** - structure allows multiple reproduction attempts for flaky issues
9. **Provide clear feedback** - tell user if reproduction succeeds or fails and why
10. **Timeout protection** - abort reproduction if it takes > 5 minutes (configurable)

---

### Proceeding to Next Phase

After reproduction is complete and logs are captured:

1. **Session updated** with `reproductionRuns` array and status `reproduction_run`
2. **Logs stored** in session for analysis phase
3. **Debug markers extracted** and structured for parsing
4. **Test artifacts saved** for potential re-runs (if flaky issue)

**Proceed to:**
- **Flaky Test Handling Phase** if `isFlaky: true` in session (multiple runs needed)
- **Log Analysis Phase** if `isFlaky: false` (single reproduction sufficient)
- Use captured logs to confirm or reject current hypothesis

---

## Flaky Test Handling Workflow Template

When debugging intermittent/flaky issues (detected by keywords in intake or user specification), use this workflow to ensure fixes are verified through multiple test runs before proceeding to cleanup.

### Overview

**Purpose:** Handle issues that don't reproduce consistently by requiring N consecutive successful test passes before considering the issue resolved.

**When to use:**
- Session has `isFlaky: true` (set during intake if flaky keywords detected)
- User explicitly requests multiple verification runs
- Issue is described as intermittent, occasionally failing, or timing-dependent

**Success count default:** 1 for deterministic issues, 5 for flaky issues (user can specify custom count)

---

### Step 1: Check Flaky Status

After reproduction completes, check if flaky handling is needed:

```typescript
// Check session for flaky status
const session = readSession(sessionId);

if (!session.isFlaky) {
  // Deterministic issue - single reproduction sufficient
  // Proceed directly to Log Analysis Phase
  return proceedToLogAnalysis(session);
}

// Flaky issue detected - multiple runs required
console.log(`Flaky issue detected. Success count required: ${session.successCount}`);
```

**Decision tree:**
- If `isFlaky: false` → Skip this phase, proceed to Log Analysis
- If `isFlaky: true` → Execute flaky test handling workflow

---

### Step 2: Verify Success Count Configuration

Ensure the session has a valid success count configured:

```json
{
  "sessionId": "sess_20250131_abc123",
  "isFlaky": true,
  "successCount": 5,
  "flakyKeywordsDetected": ["intermittent", "sometimes", "race condition"],
  "reproductionRuns": [
    {
      "runId": "run_001",
      "reproduced": true,
      "notes": "Issue reproduced on first attempt"
    }
  ]
}
```

**Success count guidelines:**
- **Default for flaky issues:** 5 consecutive passes
- **User-specified:** Accept any value from 1-20
- **Conservative approach:** Higher counts = more confidence but longer verification time
- **Recommendation:** 5 passes for race conditions, 3 passes for timing issues, 10+ for critical production issues

---

### Step 3: Execute Multiple Test Runs

Run the test repeatedly until N consecutive passes are achieved OR max attempts reached.

#### Multiple Run Strategy

**Approach:**
1. Use the same test from Issue Reproduction phase (automated test file or manual script)
2. Run test repeatedly, tracking consecutive pass/fail results
3. Reset consecutive counter on any failure
4. Continue until N consecutive passes OR max attempts (50 runs)

**Execution template:**

```bash
# For automated tests
CONSECUTIVE_PASSES=0
REQUIRED_PASSES=5
MAX_ATTEMPTS=50
ATTEMPT=0

while [ $CONSECUTIVE_PASSES -lt $REQUIRED_PASSES ] && [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  ATTEMPT=$((ATTEMPT + 1))
  echo "Attempt $ATTEMPT: Running test (consecutive passes: $CONSECUTIVE_PASSES/$REQUIRED_PASSES)"

  # Run the test (adjust command for framework)
  if npm test -- test/debug/reproduction-HYP_1.test.js > "logs/flaky-run-$ATTEMPT.log" 2>&1; then
    CONSECUTIVE_PASSES=$((CONSECUTIVE_PASSES + 1))
    echo "✓ PASS (consecutive: $CONSECUTIVE_PASSES)"
  else
    echo "✗ FAIL (resetting consecutive counter)"
    CONSECUTIVE_PASSES=0
  fi

  # Small delay between runs to avoid resource contention
  sleep 1
done

if [ $CONSECUTIVE_PASSES -ge $REQUIRED_PASSES ]; then
  echo "Success: Achieved $REQUIRED_PASSES consecutive passes after $ATTEMPT attempts"
  exit 0
else
  echo "Failure: Max attempts ($MAX_ATTEMPTS) reached without $REQUIRED_PASSES consecutive passes"
  exit 1
fi
```

**For manual reproduction:**

Generate a script that guides the user through multiple runs:

```markdown
# Flaky Issue Verification Script

This issue requires **5 consecutive successful reproductions** to verify the fix.

## Instructions

Run the following steps **repeatedly** and track your results:

1. [Reproduction step 1]
2. [Reproduction step 2]
3. [Reproduction step 3]
4. Observe: [Expected behavior]

## Tracking Sheet

Copy this table and fill in results after each run:

| Attempt | Result (PASS/FAIL) | Consecutive Passes | Notes |
|---------|--------------------|--------------------|-------|
| 1       |                    | 0                  |       |
| 2       |                    | 0                  |       |
| 3       |                    | 0                  |       |
| 4       |                    | 0                  |       |
| 5       |                    | 0                  |       |

**Rules:**
- PASS = issue does NOT occur (expected behavior observed)
- FAIL = issue DOES occur (unexpected behavior observed)
- On FAIL: Reset "Consecutive Passes" counter to 0
- Continue until you achieve **5 consecutive PASS results**
- If you reach 50 attempts without 5 consecutive passes, report failure

## When Complete

Report back with:
- Total attempts needed: ___
- Pattern observed (if any): ___
- Final verdict: VERIFIED (5 consecutive passes) or NOT VERIFIED (max attempts reached)
```

---

### Step 4: Update Session with Run Results

After each test run, update the session with detailed results:

```json
{
  "sessionId": "sess_20250131_abc123",
  "isFlaky": true,
  "successCount": 5,
  "reproductionRuns": [
    {
      "runId": "run_001",
      "timestamp": "2025-01-31T10:00:00Z",
      "hypothesisId": "HYP_1",
      "method": "automated",
      "testFile": "test/debug/reproduction-HYP_1.test.js",
      "testCommand": "npm test -- test/debug/reproduction-HYP_1.test.js",
      "exitCode": 0,
      "duration": 2.3,
      "reproduced": true,
      "notes": "Initial reproduction - issue observed"
    },
    {
      "runId": "run_002",
      "timestamp": "2025-01-31T10:05:00Z",
      "hypothesisId": "HYP_1",
      "method": "automated",
      "testFile": "test/debug/reproduction-HYP_1.test.js",
      "testCommand": "npm test -- test/debug/reproduction-HYP_1.test.js",
      "exitCode": 1,
      "duration": 2.1,
      "reproduced": false,
      "notes": "Run 1 of flaky verification - PASS"
    },
    {
      "runId": "run_003",
      "timestamp": "2025-01-31T10:05:05Z",
      "hypothesisId": "HYP_1",
      "method": "automated",
      "testFile": "test/debug/reproduction-HYP_1.test.js",
      "testCommand": "npm test -- test/debug/reproduction-HYP_1.test.js",
      "exitCode": 0,
      "duration": 2.4,
      "reproduced": true,
      "notes": "Run 2 of flaky verification - FAIL (reset consecutive counter)"
    }
  ],
  "flakyVerification": {
    "requiredConsecutivePasses": 5,
    "currentConsecutivePasses": 0,
    "totalAttempts": 2,
    "maxAttempts": 50,
    "runHistory": ["PASS", "FAIL"],
    "status": "in_progress"
  }
}
```

**New session fields for flaky tracking:**
- `flakyVerification` (object): Tracks multi-run verification state
  - `requiredConsecutivePasses` (number): How many consecutive passes needed
  - `currentConsecutivePasses` (number): Current streak of passes
  - `totalAttempts` (number): Total runs so far
  - `maxAttempts` (number): Maximum runs before giving up (default: 50)
  - `runHistory` (array): ["PASS", "FAIL", "PASS", ...] for analysis
  - `status` (string): `in_progress`, `verified`, or `failed`

---

### Step 5: Analyze Run Pattern

After completing all runs (success or failure), analyze the pattern:

```typescript
function analyzeRunPattern(runHistory: string[]): FlakyAnalysis {
  const totalRuns = runHistory.length;
  const passCount = runHistory.filter(r => r === "PASS").length;
  const failCount = runHistory.filter(r => r === "FAIL").length;
  const successRate = (passCount / totalRuns) * 100;

  // Identify failure clustering
  const failureIndexes = runHistory
    .map((r, i) => r === "FAIL" ? i : -1)
    .filter(i => i >= 0);

  const isClustered = analyzeClusteringPattern(failureIndexes);

  return {
    totalRuns,
    passCount,
    failCount,
    successRate,
    failurePattern: isClustered ? "clustered" : "random",
    longestPassStreak: calculateLongestStreak(runHistory, "PASS"),
    longestFailStreak: calculateLongestStreak(runHistory, "FAIL"),
    notes: generatePatternNotes(runHistory)
  };
}
```

**Pattern analysis insights:**
- **High success rate (>80%)**: Issue may be timing-dependent or resource contention
- **Low success rate (<50%)**: Issue may be common but masked in single-run testing
- **Clustered failures**: May indicate warmup issue, cache state, or environment drift
- **Random failures**: True race condition or non-deterministic behavior

---

### Step 6: Determine Outcome

Based on the run results, determine whether to proceed or return to hypothesis generation:

#### Outcome A: Verification Successful

**Condition:** Achieved N consecutive passes within max attempts

**Actions:**
1. Update session status to `flakyVerification.status: "verified"`
2. Add verification summary to session:

```json
{
  "flakyVerification": {
    "status": "verified",
    "requiredConsecutivePasses": 5,
    "totalAttempts": 23,
    "successRate": 78.26,
    "failurePattern": "random",
    "longestPassStreak": 5,
    "verifiedAt": "2025-01-31T10:30:00Z",
    "summary": "Achieved 5 consecutive passes after 23 attempts. Issue appears to be a true race condition with ~78% success rate."
  }
}
```

3. **Proceed to Cleanup Phase** (instrumentation removal)
4. Display success message:

```
✓ Flaky issue verified successfully

Required: 5 consecutive passes
Total attempts: 23
Success rate: 78.26%
Pattern: Random failures (likely race condition)

Proceeding to cleanup phase to remove instrumentation...
```

#### Outcome B: Verification Failed

**Condition:** Reached max attempts (50 runs) without achieving N consecutive passes

**Actions:**
1. Update session status to `flakyVerification.status: "failed"`
2. Add failure analysis to session:

```json
{
  "flakyVerification": {
    "status": "failed",
    "requiredConsecutivePasses": 5,
    "maxConsecutivePasses": 3,
    "totalAttempts": 50,
    "successRate": 42.0,
    "failurePattern": "clustered",
    "longestPassStreak": 3,
    "failedAt": "2025-01-31T10:45:00Z",
    "summary": "Failed to achieve 5 consecutive passes after 50 attempts. Maximum consecutive passes: 3. Failures appear clustered, suggesting environment or state dependency."
  }
}
```

3. **Return to Hypothesis Generation** with context from failed runs:
   - Current hypothesis is rejected (fix did not resolve flakiness)
   - Generate new hypotheses informed by run pattern:
     - If clustered failures: investigate state carryover, warmup issues
     - If random failures: investigate deeper race conditions, external dependencies
     - If low success rate: hypothesis may be partially correct but incomplete

4. Display failure message:

```
✗ Flaky verification failed

Required: 5 consecutive passes
Max consecutive: 3 (out of 50 attempts)
Success rate: 42.0%
Pattern: Clustered failures (potential state dependency)

Current hypothesis rejected. Generating new hypotheses based on run pattern...
```

5. Increment `iterationCount` and check against `maxIterations` (5)
   - If iterations remaining: Generate new hypotheses and retry
   - If max iterations reached: Trigger rollback and failure handling

---

### Step 7: Session Status Transition

Update session status based on outcome:

**Success path:**
```json
{
  "status": "flaky_verified",
  "flakyVerification": { "status": "verified" }
}
```
→ Proceed to **Cleanup Phase**

**Failure path:**
```json
{
  "status": "hypothesis_rejected",
  "flakyVerification": { "status": "failed" },
  "iterationCount": 2
}
```
→ Return to **Hypothesis Generation Phase**

---

### Step 8: Flaky Handling Rules

1. **Always reset consecutive counter on failure** - a single failure breaks the streak
2. **Enforce max attempts** - prevent infinite loops (default: 50 runs)
3. **Track all runs in session** - enables pattern analysis and debugging
4. **Provide clear feedback** - show progress during multi-run verification
5. **Short delays between runs** - prevent resource contention (1-2 seconds)
6. **Analyze pattern on completion** - provide insights regardless of outcome
7. **Use pattern to inform next hypothesis** - if verification fails, learn from run distribution
8. **Never skip flaky handling** - if `isFlaky: true`, always execute multiple runs
9. **Allow user override** - user can adjust success count or max attempts if needed
10. **Time-box verification** - if runs take too long, consider timeout (e.g., 30 minutes total)

---

### Step 9: User Feedback During Runs

For long-running verifications, provide progress updates:

**Console output template:**
```
Flaky Issue Verification in Progress
====================================

Required: 5 consecutive passes
Max attempts: 50

Attempt  1: ✓ PASS (consecutive: 1)
Attempt  2: ✓ PASS (consecutive: 2)
Attempt  3: ✗ FAIL (consecutive: 0) - Issue observed: TypeError at line 45
Attempt  4: ✓ PASS (consecutive: 1)
Attempt  5: ✓ PASS (consecutive: 2)
Attempt  6: ✓ PASS (consecutive: 3)
Attempt  7: ✓ PASS (consecutive: 4)
Attempt  8: ✓ PASS (consecutive: 5) ← SUCCESS!

Total attempts: 8
Success rate: 87.5%
Pattern: Early failure followed by consistent success (potential warmup issue)

✓ Verification complete - proceeding to cleanup
```

**For manual reproduction:**

Provide a clear checklist and status tracker that the user can update.

---

### Example: Complete Flaky Handling Flow

**Scenario:** Race condition in async handler

**Initial state:**
```json
{
  "sessionId": "sess_20250131_abc123",
  "issueType": "Intermittent/Flaky Issue",
  "issueDescription": "API endpoint sometimes returns 500, sometimes succeeds",
  "isFlaky": true,
  "successCount": 5,
  "flakyKeywordsDetected": ["sometimes", "intermittent"]
}
```

**After initial reproduction:**
```json
{
  "reproductionRuns": [
    {
      "runId": "run_001",
      "reproduced": true,
      "notes": "Issue reproduced - 500 error observed"
    }
  ]
}
```

**After instrumentation and fix application:**
```json
{
  "fixesAttempted": [
    {
      "fixId": "FIX_1",
      "hypothesisId": "HYP_1",
      "description": "Added mutex lock around shared cache access"
    }
  ]
}
```

**Flaky verification begins:**

```
Starting flaky verification for FIX_1...
Required: 5 consecutive passes

Attempt  1: ✓ PASS (consecutive: 1)
Attempt  2: ✓ PASS (consecutive: 2)
Attempt  3: ✗ FAIL (consecutive: 0) - 500 error still occurs
Attempt  4: ✓ PASS (consecutive: 1)
Attempt  5: ✗ FAIL (consecutive: 0) - 500 error still occurs
Attempt  6: ✓ PASS (consecutive: 1)
Attempt  7: ✓ PASS (consecutive: 2)
...
Attempt 48: ✗ FAIL (consecutive: 0)
Attempt 49: ✓ PASS (consecutive: 1)
Attempt 50: ✗ FAIL (consecutive: 0)

✗ Max attempts (50) reached without 5 consecutive passes
Max consecutive: 4
Success rate: 58%
Pattern: Random failures

Rejecting HYP_1. Generating new hypothesis based on run pattern...
```

**Session updated:**
```json
{
  "iterationCount": 2,
  "hypotheses": [
    {
      "id": "HYP_1",
      "status": "rejected",
      "rejectionReason": "Fix did not achieve required flaky verification (max 4 consecutive passes in 50 attempts)"
    },
    {
      "id": "HYP_2",
      "description": "Race condition involves multiple async paths, not just cache access",
      "category": "race_condition",
      "status": "pending",
      "generatedFrom": "Failed flaky verification pattern analysis - random failures suggest deeper concurrency issue"
    }
  ],
  "flakyVerification": {
    "status": "failed",
    "totalAttempts": 50,
    "maxConsecutivePasses": 4,
    "successRate": 58.0
  }
}
```

**Outcome:** Return to hypothesis generation for iteration 2, informed by the flaky verification failure pattern.

---

### Integration with Other Phases

**From: Issue Reproduction Phase**
- Input: `isFlaky` flag from session
- Input: Initial reproduction run in `reproductionRuns` array
- Input: Test file/script for running multiple times

**To: Log Analysis Phase** (if verification succeeds)
- Output: Verified fix with multi-run confidence
- Output: Pattern analysis for documentation

**To: Hypothesis Generation Phase** (if verification fails)
- Output: Rejected hypothesis with failure context
- Output: Run pattern analysis to inform next hypothesis
- Output: Incremented iteration count

---

### Proceeding to Next Phase

After flaky test handling completes:

1. **Session updated** with `flakyVerification` object and final status
2. **Run history stored** for pattern analysis and documentation
3. **Outcome determined**: verified or failed

**If verification succeeded:**
- Status: `flaky_verified`
- **Proceed to:** Cleanup Phase (remove instrumentation)

**If verification failed:**
- Status: `hypothesis_rejected`
- **Proceed to:** Hypothesis Generation Phase (generate new hypotheses from run pattern)
- **Check:** Iteration count vs max iterations (5) - may trigger rollback if limit reached

---

## Log Analysis Workflow Template

This section defines the systematic process for analyzing logs captured during reproduction to confirm, reject, or refine hypotheses. Log analysis is the critical decision point that determines whether debugging proceeds to fix application or returns to hypothesis generation.

### Overview

The Log Analysis phase:
1. Parses logs for all instrumentation markers across all files
2. Extracts variable values, execution flow, and timing data
3. Compares actual behavior against expected evidence defined in hypotheses
4. Marks each hypothesis as: **confirmed**, **rejected**, or **inconclusive**
5. Generates new hypotheses if no confirmation achieved
6. Enforces the 5-iteration maximum before triggering rollback

---

### Step 1: Collect and Parse Instrumentation Logs

Extract all debug markers from the captured reproduction logs:

**Log collection command:**
```bash
# Extract all DEBUG markers from reproduction log
grep -E "DEBUG_HYP_[0-9]+|HYP_[0-9]+_TRACE|\\[HYP_[0-9]+\\]|\\[ENTER\\]|\\[EXIT\\]|\\[BRANCH\\]|\\[LOOP\\]|\\[TIMING\\]" \
  logs/reproduction-hyp-*.log > logs/markers-extracted.log

# Count markers per hypothesis
for hyp_num in 1 2 3 4 5; do
  count=$(grep -c "HYP_${hyp_num}" logs/markers-extracted.log 2>/dev/null || echo "0")
  echo "HYP_${hyp_num}: ${count} markers found"
done
```

**Marker pattern recognition:**

| Marker Pattern | Meaning | Extraction Regex |
|----------------|---------|------------------|
| `// DEBUG_HYP_N_START` | Instrumentation block start | `DEBUG_HYP_(\d+)_START` |
| `// DEBUG_HYP_N_END` | Instrumentation block end | `DEBUG_HYP_(\d+)_END` |
| `[HYP_N]` | Log entry for hypothesis N | `\[HYP_(\d+)\]` |
| `[HYP_N_TRACE:xxx]` | Cross-file trace ID | `\[HYP_(\d+)_TRACE:([^\]]+)\]` |
| `[ENTER]` | Function entry point | `\[ENTER\]\s*(.+)` |
| `[EXIT]` | Function exit point | `\[EXIT\]\s*(.+)` |
| `[BRANCH]` | Conditional branch taken | `\[BRANCH\]\s*(.+)` |
| `[LOOP]` | Loop iteration marker | `\[LOOP\]\s*(.+)` |
| `[TIMING]` | Timing measurement | `\[TIMING\]\s*(.+):\s*([\d.]+)(ms|s)` |
| `[VALUE]` | Variable value capture | `\[VALUE\]\s*(\w+)\s*=\s*(.+)` |

**Multi-file log correlation:**

For hypotheses spanning multiple files, correlate logs using trace IDs:

```typescript
interface CrossFileLogEntry {
  traceId: string;
  file: string;
  lineNumber: number;
  timestamp: string;
  hypothesisId: string;
  markerType: "ENTER" | "EXIT" | "BRANCH" | "LOOP" | "TIMING" | "VALUE";
  content: string;
  rawLog: string;
}

// Group logs by trace ID to reconstruct execution flow across files
function correlateByTraceId(logs: CrossFileLogEntry[]): Map<string, CrossFileLogEntry[]> {
  const grouped = new Map<string, CrossFileLogEntry[]>();
  for (const log of logs) {
    const existing = grouped.get(log.traceId) || [];
    existing.push(log);
    existing.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    grouped.set(log.traceId, existing);
  }
  return grouped;
}
```

---

### Step 2: Parse Variable Values and Execution Flow

Extract structured data from log entries:

**Variable value extraction:**

```typescript
interface ExtractedValue {
  hypothesisId: string;
  variableName: string;
  value: any;
  valueType: string;
  file: string;
  lineNumber: number;
  timestamp: string;
}

function extractValues(logs: string[]): ExtractedValue[] {
  const values: ExtractedValue[] = [];
  const valueRegex = /\[HYP_(\d+)\].*?\[VALUE\]\s*(\w+)\s*=\s*(.+?)(?:\s*\[|$)/g;

  for (const line of logs) {
    const matches = line.matchAll(valueRegex);
    for (const match of matches) {
      values.push({
        hypothesisId: `HYP_${match[1]}`,
        variableName: match[2],
        value: parseValue(match[3]),
        valueType: inferType(match[3]),
        file: extractFile(line),
        lineNumber: extractLineNumber(line),
        timestamp: extractTimestamp(line)
      });
    }
  }
  return values;
}

function parseValue(raw: string): any {
  // Handle null/undefined
  if (raw === "null" || raw === "undefined") return null;
  // Handle booleans
  if (raw === "true") return true;
  if (raw === "false") return false;
  // Handle numbers
  if (/^-?\d+(\.\d+)?$/.test(raw)) return parseFloat(raw);
  // Handle JSON objects/arrays
  if (raw.startsWith("{") || raw.startsWith("[")) {
    try { return JSON.parse(raw); } catch { return raw; }
  }
  // Handle strings (remove quotes if present)
  if ((raw.startsWith('"') && raw.endsWith('"')) ||
      (raw.startsWith("'") && raw.endsWith("'"))) {
    return raw.slice(1, -1);
  }
  return raw;
}
```

**Execution flow reconstruction:**

```typescript
interface ExecutionPath {
  hypothesisId: string;
  file: string;
  sequence: ExecutionStep[];
  branchesTaken: string[];
  loopIterations: Map<string, number>;
  entryExitPairs: { entry: string; exit: string; duration?: number }[];
}

interface ExecutionStep {
  timestamp: string;
  type: "ENTER" | "EXIT" | "BRANCH" | "LOOP";
  location: string;
  details: string;
}

function reconstructExecutionPath(logs: string[], hypothesisId: string): ExecutionPath {
  const steps: ExecutionStep[] = [];
  const branches: string[] = [];
  const loops = new Map<string, number>();
  const entryExitStack: { entry: string; timestamp: string }[] = [];
  const pairs: { entry: string; exit: string; duration?: number }[] = [];

  const stepRegex = /\[HYP_\d+\].*?\[(ENTER|EXIT|BRANCH|LOOP)\]\s*(.+)/g;

  for (const line of logs) {
    const match = stepRegex.exec(line);
    if (match && line.includes(hypothesisId)) {
      const type = match[1] as ExecutionStep["type"];
      const details = match[2].trim();
      const timestamp = extractTimestamp(line);

      steps.push({
        timestamp,
        type,
        location: extractFile(line) + ":" + extractLineNumber(line),
        details
      });

      switch (type) {
        case "ENTER":
          entryExitStack.push({ entry: details, timestamp });
          break;
        case "EXIT":
          const entry = entryExitStack.pop();
          if (entry) {
            const duration = calculateDuration(entry.timestamp, timestamp);
            pairs.push({ entry: entry.entry, exit: details, duration });
          }
          break;
        case "BRANCH":
          branches.push(details);
          break;
        case "LOOP":
          const loopId = details.split(":")[0];
          loops.set(loopId, (loops.get(loopId) || 0) + 1);
          break;
      }
    }
  }

  return {
    hypothesisId,
    file: extractPrimaryFile(logs, hypothesisId),
    sequence: steps,
    branchesTaken: branches,
    loopIterations: loops,
    entryExitPairs: pairs
  };
}
```

**Timing data extraction:**

```typescript
interface TimingMeasurement {
  hypothesisId: string;
  label: string;
  durationMs: number;
  file: string;
  timestamp: string;
}

function extractTimings(logs: string[]): TimingMeasurement[] {
  const timings: TimingMeasurement[] = [];
  const timingRegex = /\[HYP_(\d+)\].*?\[TIMING\]\s*(.+?):\s*([\d.]+)(ms|s)/g;

  for (const line of logs) {
    const matches = line.matchAll(timingRegex);
    for (const match of matches) {
      let durationMs = parseFloat(match[3]);
      if (match[4] === "s") durationMs *= 1000;

      timings.push({
        hypothesisId: `HYP_${match[1]}`,
        label: match[2].trim(),
        durationMs,
        file: extractFile(line),
        timestamp: extractTimestamp(line)
      });
    }
  }
  return timings;
}
```

---

### Step 3: Compare Actual vs Expected Evidence

For each hypothesis, compare observed behavior against the expected evidence defined during hypothesis generation:

**Evidence comparison structure:**

```typescript
interface EvidenceComparison {
  hypothesisId: string;
  expectedEvidence: string;
  actualFindings: ActualFinding[];
  verdict: "confirmed" | "rejected" | "inconclusive";
  confidenceAdjustment: number; // -1.0 to +1.0 adjustment to original confidence
  reasoning: string;
}

interface ActualFinding {
  type: "value_match" | "value_mismatch" | "flow_match" | "flow_mismatch" |
        "timing_anomaly" | "missing_data" | "unexpected_behavior";
  description: string;
  expected?: any;
  actual?: any;
  evidence: string; // Raw log line or extracted data
  significance: "high" | "medium" | "low";
}

function compareEvidenceForHypothesis(
  hypothesis: Hypothesis,
  extractedValues: ExtractedValue[],
  executionPath: ExecutionPath,
  timings: TimingMeasurement[]
): EvidenceComparison {
  const findings: ActualFinding[] = [];

  // Get all data for this hypothesis
  const hypValues = extractedValues.filter(v => v.hypothesisId === hypothesis.id);
  const hypTimings = timings.filter(t => t.hypothesisId === hypothesis.id);

  // Check each variable we expected to inspect
  for (const expectedVar of hypothesis.variablesToInspect) {
    const actualValue = hypValues.find(v => v.variableName === expectedVar.name);

    if (!actualValue) {
      findings.push({
        type: "missing_data",
        description: `Variable '${expectedVar.name}' was not captured in logs`,
        expected: expectedVar.expectedValue,
        actual: undefined,
        evidence: "No matching [VALUE] marker found",
        significance: expectedVar.critical ? "high" : "medium"
      });
    } else if (matchesExpectation(actualValue.value, expectedVar.expectedValue, expectedVar.condition)) {
      findings.push({
        type: "value_match",
        description: `Variable '${expectedVar.name}' matches hypothesis expectation`,
        expected: expectedVar.expectedValue,
        actual: actualValue.value,
        evidence: `${actualValue.file}:${actualValue.lineNumber}`,
        significance: "high"
      });
    } else {
      findings.push({
        type: "value_mismatch",
        description: `Variable '${expectedVar.name}' does not match expectation`,
        expected: expectedVar.expectedValue,
        actual: actualValue.value,
        evidence: `${actualValue.file}:${actualValue.lineNumber}`,
        significance: expectedVar.critical ? "high" : "medium"
      });
    }
  }

  // Check execution flow against expected paths
  const flowFindings = compareExecutionFlow(hypothesis, executionPath);
  findings.push(...flowFindings);

  // Check timing data for anomalies
  const timingFindings = analyzeTimingData(hypothesis, hypTimings);
  findings.push(...timingFindings);

  // Determine verdict based on findings
  return determineVerdict(hypothesis, findings);
}
```

**Condition matching logic:**

```typescript
function matchesExpectation(actual: any, expected: any, condition?: string): boolean {
  if (condition) {
    switch (condition) {
      case "equals": return actual === expected;
      case "not_equals": return actual !== expected;
      case "greater_than": return actual > expected;
      case "less_than": return actual < expected;
      case "contains": return String(actual).includes(String(expected));
      case "not_contains": return !String(actual).includes(String(expected));
      case "is_null": return actual === null || actual === undefined;
      case "is_not_null": return actual !== null && actual !== undefined;
      case "is_truthy": return Boolean(actual);
      case "is_falsy": return !Boolean(actual);
      case "matches_regex": return new RegExp(expected).test(String(actual));
      case "type_is": return typeof actual === expected;
      case "array_length": return Array.isArray(actual) && actual.length === expected;
      case "array_includes": return Array.isArray(actual) && actual.includes(expected);
      default: return actual === expected;
    }
  }

  // Default deep equality comparison
  if (typeof expected === "object" && typeof actual === "object") {
    return JSON.stringify(actual) === JSON.stringify(expected);
  }
  return actual === expected;
}
```

**Execution flow comparison:**

```typescript
function compareExecutionFlow(hypothesis: Hypothesis, path: ExecutionPath): ActualFinding[] {
  const findings: ActualFinding[] = [];

  // Check if expected branches were taken
  if (hypothesis.expectedBranches) {
    for (const expectedBranch of hypothesis.expectedBranches) {
      const taken = path.branchesTaken.some(b => b.includes(expectedBranch.id));

      if (expectedBranch.shouldBeTaken && !taken) {
        findings.push({
          type: "flow_mismatch",
          description: `Expected branch '${expectedBranch.id}' was NOT taken`,
          expected: "Branch executed",
          actual: "Branch not executed",
          evidence: `Branches taken: ${path.branchesTaken.join(", ") || "none"}`,
          significance: "high"
        });
      } else if (!expectedBranch.shouldBeTaken && taken) {
        findings.push({
          type: "flow_mismatch",
          description: `Unexpected branch '${expectedBranch.id}' WAS taken`,
          expected: "Branch not executed",
          actual: "Branch executed",
          evidence: `Branch taken at: ${path.branchesTaken.find(b => b.includes(expectedBranch.id))}`,
          significance: "high"
        });
      } else {
        findings.push({
          type: "flow_match",
          description: `Branch '${expectedBranch.id}' behaved as expected`,
          expected: expectedBranch.shouldBeTaken ? "taken" : "not taken",
          actual: taken ? "taken" : "not taken",
          evidence: "Execution flow matches hypothesis",
          significance: "medium"
        });
      }
    }
  }

  // Check entry/exit pairs for unexpected termination
  for (const pair of path.entryExitPairs) {
    if (pair.entry && !pair.exit) {
      findings.push({
        type: "unexpected_behavior",
        description: `Function '${pair.entry}' entered but never exited (possible exception/crash)`,
        expected: "Normal function completion",
        actual: "Function did not exit",
        evidence: `Entry: ${pair.entry}`,
        significance: "high"
      });
    }
  }

  return findings;
}
```

**Timing anomaly detection:**

```typescript
function analyzeTimingData(hypothesis: Hypothesis, timings: TimingMeasurement[]): ActualFinding[] {
  const findings: ActualFinding[] = [];

  // Check for expected timing thresholds
  if (hypothesis.expectedTimings) {
    for (const expected of hypothesis.expectedTimings) {
      const actual = timings.find(t => t.label === expected.label);

      if (!actual) {
        findings.push({
          type: "missing_data",
          description: `Timing measurement '${expected.label}' not found`,
          evidence: "No matching [TIMING] marker",
          significance: "medium"
        });
      } else if (expected.maxMs && actual.durationMs > expected.maxMs) {
        findings.push({
          type: "timing_anomaly",
          description: `Operation '${expected.label}' exceeded expected time`,
          expected: `<= ${expected.maxMs}ms`,
          actual: `${actual.durationMs}ms`,
          evidence: `${actual.file} at ${actual.timestamp}`,
          significance: "high"
        });
      } else if (expected.minMs && actual.durationMs < expected.minMs) {
        findings.push({
          type: "timing_anomaly",
          description: `Operation '${expected.label}' completed faster than expected (possible skip)`,
          expected: `>= ${expected.minMs}ms`,
          actual: `${actual.durationMs}ms`,
          evidence: `${actual.file} at ${actual.timestamp}`,
          significance: "medium"
        });
      }
    }
  }

  // Detect general timing anomalies (outliers)
  if (timings.length >= 3) {
    const durations = timings.map(t => t.durationMs);
    const mean = durations.reduce((a, b) => a + b, 0) / durations.length;
    const stdDev = Math.sqrt(
      durations.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / durations.length
    );

    for (const timing of timings) {
      if (timing.durationMs > mean + 2 * stdDev) {
        findings.push({
          type: "timing_anomaly",
          description: `Timing outlier detected for '${timing.label}'`,
          expected: `~${mean.toFixed(2)}ms (avg)`,
          actual: `${timing.durationMs}ms (>${(2 * stdDev).toFixed(2)}ms above mean)`,
          evidence: `${timing.file} at ${timing.timestamp}`,
          significance: "medium"
        });
      }
    }
  }

  return findings;
}
```

---

### Step 4: Determine Hypothesis Verdict

Based on the evidence comparison, mark each hypothesis as confirmed, rejected, or inconclusive:

**Verdict determination logic:**

```typescript
function determineVerdict(hypothesis: Hypothesis, findings: ActualFinding[]): EvidenceComparison {
  const highSignificance = findings.filter(f => f.significance === "high");
  const matches = findings.filter(f => f.type === "value_match" || f.type === "flow_match");
  const mismatches = findings.filter(f => f.type === "value_mismatch" || f.type === "flow_mismatch");
  const anomalies = findings.filter(f => f.type === "timing_anomaly" || f.type === "unexpected_behavior");
  const missing = findings.filter(f => f.type === "missing_data");

  let verdict: "confirmed" | "rejected" | "inconclusive";
  let confidenceAdjustment: number;
  let reasoning: string;

  // Decision tree for verdict
  const highMatches = highSignificance.filter(f =>
    f.type === "value_match" || f.type === "flow_match" || f.type === "timing_anomaly"
  );
  const highMismatches = highSignificance.filter(f =>
    f.type === "value_mismatch" || f.type === "flow_mismatch"
  );

  if (highMatches.length >= 2 && highMismatches.length === 0) {
    // Strong confirmation: multiple high-significance matches, no contradictions
    verdict = "confirmed";
    confidenceAdjustment = 0.2;
    reasoning = `Hypothesis confirmed by ${highMatches.length} high-significance evidence matches. ` +
                `Key findings: ${highMatches.map(f => f.description).join("; ")}`;
  } else if (highMismatches.length >= 1) {
    // Strong rejection: at least one high-significance contradiction
    verdict = "rejected";
    confidenceAdjustment = -0.3;
    reasoning = `Hypothesis rejected due to contradictory evidence: ${highMismatches.map(f => f.description).join("; ")}`;
  } else if (missing.length > matches.length) {
    // Inconclusive: more missing data than actual evidence
    verdict = "inconclusive";
    confidenceAdjustment = -0.1;
    reasoning = `Insufficient evidence to confirm or reject. Missing data: ${missing.map(f => f.description).join("; ")}. ` +
                `Consider adding more instrumentation.`;
  } else if (anomalies.length > 0 && matches.length > mismatches.length) {
    // Likely confirmed: anomalies detected that align with hypothesis
    verdict = "confirmed";
    confidenceAdjustment = 0.1;
    reasoning = `Hypothesis likely confirmed. Anomalies detected: ${anomalies.map(f => f.description).join("; ")}. ` +
                `Supporting evidence: ${matches.map(f => f.description).join("; ")}`;
  } else if (matches.length > mismatches.length) {
    // Weakly confirmed: more matches than mismatches
    verdict = "confirmed";
    confidenceAdjustment = 0.05;
    reasoning = `Hypothesis confirmed with moderate confidence. Matches (${matches.length}) outweigh mismatches (${mismatches.length}).`;
  } else if (mismatches.length > matches.length) {
    // Weakly rejected: more mismatches than matches
    verdict = "rejected";
    confidenceAdjustment = -0.15;
    reasoning = `Hypothesis rejected. Mismatches (${mismatches.length}) outweigh matches (${matches.length}): ` +
                `${mismatches.map(f => f.description).join("; ")}`;
  } else {
    // Inconclusive: equal matches and mismatches or no clear signal
    verdict = "inconclusive";
    confidenceAdjustment = 0;
    reasoning = `Evidence is mixed - equal matches (${matches.length}) and mismatches (${mismatches.length}). ` +
                `Additional instrumentation needed to clarify.`;
  }

  return {
    hypothesisId: hypothesis.id,
    expectedEvidence: hypothesis.expectedEvidence,
    actualFindings: findings,
    verdict,
    confidenceAdjustment,
    reasoning
  };
}
```

**Verdict criteria summary:**

| Verdict | Criteria | Confidence Adjustment |
|---------|----------|----------------------|
| **Confirmed** | ≥2 high-significance matches AND 0 high-significance mismatches | +0.20 |
| **Confirmed** | Anomalies present AND matches > mismatches | +0.10 |
| **Confirmed** | matches > mismatches (no high-sig contradictions) | +0.05 |
| **Rejected** | ≥1 high-significance mismatch | -0.30 |
| **Rejected** | mismatches > matches | -0.15 |
| **Inconclusive** | missing data > matches | -0.10 |
| **Inconclusive** | matches == mismatches OR no clear signal | 0.00 |

---

### Step 5: Update Session with Analysis Results

After analyzing all hypotheses, update the session with comprehensive results:

```json
{
  "sessionId": "sess_20250131_abc123",
  "status": "log_analysis_complete",
  "iterationCount": 1,
  "maxIterations": 5,
  "hypotheses": [
    {
      "id": "HYP_1",
      "category": "null_reference",
      "description": "Null pointer when accessing user.profile before validation",
      "confidence": 0.85,
      "status": "confirmed",
      "analysisResult": {
        "verdict": "confirmed",
        "confidenceAdjustment": 0.20,
        "finalConfidence": 1.0,
        "reasoning": "Hypothesis confirmed by 3 high-significance evidence matches. Key findings: Variable 'user' was null at line 45; Branch 'validation-skip' was taken; Function 'getProfile' entered but never exited",
        "findings": [
          {
            "type": "value_match",
            "description": "Variable 'user' was null at critical access point",
            "expected": "null or undefined",
            "actual": null,
            "evidence": "src/handlers/profile.ts:45",
            "significance": "high"
          },
          {
            "type": "flow_match",
            "description": "Validation branch was skipped as hypothesized",
            "expected": "taken",
            "actual": "taken",
            "evidence": "Branch 'early-return-check' taken at line 42",
            "significance": "high"
          },
          {
            "type": "unexpected_behavior",
            "description": "Function 'getProfile' entered but never exited (exception)",
            "expected": "Normal function completion",
            "actual": "Function did not exit",
            "evidence": "Entry at line 44, no corresponding exit",
            "significance": "high"
          }
        ],
        "analyzedAt": "2025-01-31T10:45:00Z"
      }
    },
    {
      "id": "HYP_2",
      "category": "race_condition",
      "description": "Concurrent requests overwriting shared cache",
      "confidence": 0.65,
      "status": "rejected",
      "analysisResult": {
        "verdict": "rejected",
        "confidenceAdjustment": -0.30,
        "finalConfidence": 0.35,
        "reasoning": "Hypothesis rejected due to contradictory evidence: Cache was never accessed during reproduction; No concurrent requests detected",
        "findings": [
          {
            "type": "flow_mismatch",
            "description": "Expected cache access branch was NOT taken",
            "expected": "Branch executed",
            "actual": "Branch not executed",
            "evidence": "Branches taken: validation-skip, early-return",
            "significance": "high"
          }
        ],
        "analyzedAt": "2025-01-31T10:45:00Z"
      }
    },
    {
      "id": "HYP_3",
      "category": "logic_error",
      "description": "Off-by-one error in pagination calculation",
      "confidence": 0.50,
      "status": "inconclusive",
      "analysisResult": {
        "verdict": "inconclusive",
        "confidenceAdjustment": -0.10,
        "finalConfidence": 0.40,
        "reasoning": "Insufficient evidence to confirm or reject. Missing data: Variable 'pageIndex' was not captured; Variable 'offset' was not captured. Consider adding more instrumentation.",
        "findings": [
          {
            "type": "missing_data",
            "description": "Variable 'pageIndex' was not captured in logs",
            "expected": "Numeric value",
            "actual": undefined,
            "evidence": "No matching [VALUE] marker found",
            "significance": "high"
          },
          {
            "type": "missing_data",
            "description": "Variable 'offset' was not captured in logs",
            "expected": "Calculated offset value",
            "actual": undefined,
            "evidence": "No matching [VALUE] marker found",
            "significance": "high"
          }
        ],
        "analyzedAt": "2025-01-31T10:45:00Z"
      }
    }
  ],
  "logAnalysis": {
    "totalMarkersExtracted": 47,
    "filesAnalyzed": ["src/handlers/profile.ts", "src/services/user.ts", "src/cache/manager.ts"],
    "executionPathsReconstructed": 3,
    "timingMeasurements": 8,
    "crossFileCorrelations": 2,
    "analysisCompletedAt": "2025-01-31T10:45:00Z"
  }
}
```

**New session fields for log analysis:**

- `logAnalysis` (object): Summary of log analysis activity
  - `totalMarkersExtracted` (number): Count of debug markers found
  - `filesAnalyzed` (array): List of files that had instrumentation
  - `executionPathsReconstructed` (number): How many execution flows were traced
  - `timingMeasurements` (number): Count of timing data points
  - `crossFileCorrelations` (number): How many cross-file trace IDs were matched
  - `analysisCompletedAt` (string): ISO timestamp of analysis completion

- Per-hypothesis `analysisResult` (object):
  - `verdict` (string): "confirmed", "rejected", or "inconclusive"
  - `confidenceAdjustment` (number): Change to confidence based on evidence
  - `finalConfidence` (number): Original confidence + adjustment (capped at 1.0)
  - `reasoning` (string): Human-readable explanation of verdict
  - `findings` (array): List of all evidence findings
  - `analyzedAt` (string): ISO timestamp

---

### Step 6: Handle No Confirmation - Generate New Hypotheses

If no hypothesis is confirmed, generate 2-3 new hypotheses based on log insights:

**New hypothesis generation from logs:**

```typescript
interface LogInsight {
  type: "unexpected_null" | "unexpected_path" | "timing_spike" | "missing_call" |
        "repeated_failure" | "state_corruption" | "boundary_violation";
  description: string;
  evidence: string[];
  suggestedCategory: string;
  suggestedFiles: string[];
  suggestedLineRanges: Record<string, string>;
}

function generateNewHypothesesFromLogs(
  rejectedHypotheses: Hypothesis[],
  logInsights: LogInsight[],
  existingHypotheses: Hypothesis[]
): Hypothesis[] {
  const newHypotheses: Hypothesis[] = [];
  const existingCategories = new Set(existingHypotheses.map(h => h.category));

  // Prioritize insights that suggest different root causes
  const prioritizedInsights = logInsights
    .filter(i => !existingCategories.has(i.suggestedCategory))
    .sort((a, b) => {
      // Prioritize insights with more evidence
      return b.evidence.length - a.evidence.length;
    });

  // Generate 2-3 new hypotheses
  const targetCount = Math.min(3, prioritizedInsights.length);

  for (let i = 0; i < targetCount; i++) {
    const insight = prioritizedInsights[i];
    const hypId = `HYP_${existingHypotheses.length + i + 1}`;

    newHypotheses.push({
      id: hypId,
      category: insight.suggestedCategory,
      description: generateHypothesisDescription(insight),
      rationale: `Generated from log analysis: ${insight.description}. Evidence: ${insight.evidence.join("; ")}`,
      files: insight.suggestedFiles,
      lineRanges: insight.suggestedLineRanges,
      variablesToInspect: generateVariablesToInspect(insight),
      expectedEvidence: generateExpectedEvidence(insight),
      confidence: calculateInitialConfidence(insight, rejectedHypotheses),
      status: "pending",
      generatedAt: new Date().toISOString(),
      generatedFrom: "log_analysis_insights"
    });
  }

  return newHypotheses;
}
```

**Log insight detection patterns:**

```typescript
function detectLogInsights(
  extractedValues: ExtractedValue[],
  executionPaths: ExecutionPath[],
  timings: TimingMeasurement[]
): LogInsight[] {
  const insights: LogInsight[] = [];

  // 1. Detect unexpected null/undefined values
  const unexpectedNulls = extractedValues.filter(v =>
    (v.value === null || v.value === undefined) &&
    v.variableName.match(/^(?!is|has|should|can|will|may)/)  // Not boolean flags
  );
  if (unexpectedNulls.length > 0) {
    insights.push({
      type: "unexpected_null",
      description: `Found ${unexpectedNulls.length} unexpected null/undefined values`,
      evidence: unexpectedNulls.map(v => `${v.variableName} = ${v.value} at ${v.file}:${v.lineNumber}`),
      suggestedCategory: "null_reference",
      suggestedFiles: [...new Set(unexpectedNulls.map(v => v.file))],
      suggestedLineRanges: groupByFileLineRanges(unexpectedNulls)
    });
  }

  // 2. Detect unexpected execution paths
  for (const path of executionPaths) {
    const incompletePairs = path.entryExitPairs.filter(p => p.entry && !p.exit);
    if (incompletePairs.length > 0) {
      insights.push({
        type: "unexpected_path",
        description: `Functions entered but not exited: ${incompletePairs.map(p => p.entry).join(", ")}`,
        evidence: incompletePairs.map(p => `${p.entry} - no matching exit`),
        suggestedCategory: "exception_handling",
        suggestedFiles: [path.file],
        suggestedLineRanges: { [path.file]: extractLineRangeFromPath(path) }
      });
    }
  }

  // 3. Detect timing spikes
  const avgTiming = timings.reduce((sum, t) => sum + t.durationMs, 0) / timings.length;
  const timingSpikes = timings.filter(t => t.durationMs > avgTiming * 3);
  if (timingSpikes.length > 0) {
    insights.push({
      type: "timing_spike",
      description: `Operations taking 3x+ longer than average: ${timingSpikes.map(t => t.label).join(", ")}`,
      evidence: timingSpikes.map(t => `${t.label}: ${t.durationMs}ms (avg: ${avgTiming.toFixed(2)}ms)`),
      suggestedCategory: "performance_bottleneck",
      suggestedFiles: [...new Set(timingSpikes.map(t => t.file))],
      suggestedLineRanges: groupByFileLineRanges(timingSpikes.map(t => ({ file: t.file, lineNumber: 0 })))
    });
  }

  // 4. Detect missing function calls (expected but not present)
  for (const path of executionPaths) {
    if (path.entryExitPairs.length === 0 && path.sequence.length === 0) {
      insights.push({
        type: "missing_call",
        description: `No execution detected in instrumented region for ${path.hypothesisId}`,
        evidence: [`File ${path.file} has instrumentation but no execution markers captured`],
        suggestedCategory: "code_path_not_reached",
        suggestedFiles: [path.file],
        suggestedLineRanges: { [path.file]: "1-100" }  // Will be refined
      });
    }
  }

  // 5. Detect repeated patterns that might indicate loops or retries
  const valueCounts = new Map<string, number>();
  for (const v of extractedValues) {
    const key = `${v.variableName}=${JSON.stringify(v.value)}`;
    valueCounts.set(key, (valueCounts.get(key) || 0) + 1);
  }
  const repeatedValues = [...valueCounts.entries()].filter(([_, count]) => count >= 3);
  if (repeatedValues.length > 0) {
    insights.push({
      type: "repeated_failure",
      description: `Same value captured multiple times (possible retry loop or stuck state)`,
      evidence: repeatedValues.map(([key, count]) => `${key} appeared ${count} times`),
      suggestedCategory: "infinite_loop",
      suggestedFiles: [...new Set(extractedValues.map(v => v.file))],
      suggestedLineRanges: groupByFileLineRanges(extractedValues)
    });
  }

  return insights;
}
```

**Template prompt for new hypothesis generation:**

```
Based on the log analysis results, I need to generate new hypotheses.

REJECTED HYPOTHESES:
{{#each rejectedHypotheses}}
- {{this.id}}: {{this.description}}
  Rejection reason: {{this.analysisResult.reasoning}}
{{/each}}

LOG INSIGHTS DETECTED:
{{#each logInsights}}
- Type: {{this.type}}
  Description: {{this.description}}
  Evidence: {{this.evidence}}
  Suggested category: {{this.suggestedCategory}}
{{/each}}

REMAINING ITERATIONS: {{remainingIterations}} of 5

GENERATION RULES:
1. Generate 2-3 new hypotheses based on log insights
2. Avoid repeating rejected hypothesis categories unless evidence strongly suggests revisiting
3. Focus on insights with the most evidence
4. Include specific file locations and line ranges from the insights
5. Define clear expected evidence for each new hypothesis
6. Assign confidence scores based on insight strength (more evidence = higher confidence)

For each new hypothesis, provide:
- ID (HYP_N format, incrementing from existing)
- Category (from failure mode taxonomy)
- Description (specific, testable statement)
- Rationale (why logs suggest this)
- Files and line ranges to investigate
- Variables to inspect
- Expected evidence that would confirm
- Initial confidence score (0.0-1.0)
```

---

### Step 7: Enforce Maximum Iterations

Check iteration count and trigger rollback if limit reached:

**Iteration check logic:**

```typescript
function checkIterationLimit(session: DebugSession): "continue" | "rollback" {
  const currentIteration = session.iterationCount;
  const maxIterations = session.maxIterations || 5;

  // Check if we have a confirmed hypothesis
  const confirmedHypothesis = session.hypotheses.find(h => h.status === "confirmed");

  if (confirmedHypothesis) {
    // Confirmed hypothesis - proceed to research/fix phase
    return "continue";
  }

  // No confirmation - check iteration limit
  if (currentIteration >= maxIterations) {
    console.log(`
⚠️ Maximum iterations (${maxIterations}) reached without confirmed hypothesis.

Iterations completed: ${currentIteration}
Hypotheses tested: ${session.hypotheses.length}
  - Confirmed: ${session.hypotheses.filter(h => h.status === "confirmed").length}
  - Rejected: ${session.hypotheses.filter(h => h.status === "rejected").length}
  - Inconclusive: ${session.hypotheses.filter(h => h.status === "inconclusive").length}

Triggering rollback and failure summary generation...
    `);
    return "rollback";
  }

  // Under limit - generate new hypotheses and continue
  console.log(`
Iteration ${currentIteration} of ${maxIterations} complete.
No hypothesis confirmed. Generating new hypotheses from log insights...
  `);
  return "continue";
}
```

**Session update for iteration increment:**

```json
{
  "sessionId": "sess_20250131_abc123",
  "status": "iterating",
  "iterationCount": 2,
  "maxIterations": 5,
  "iterationHistory": [
    {
      "iteration": 1,
      "hypothesesTested": ["HYP_1", "HYP_2", "HYP_3"],
      "confirmed": 0,
      "rejected": 2,
      "inconclusive": 1,
      "newHypothesesGenerated": ["HYP_4", "HYP_5"],
      "completedAt": "2025-01-31T10:50:00Z"
    }
  ]
}
```

---

### Step 8: Log Analysis Rules

1. **Always extract all markers** - Parse every instrumentation marker from reproduction logs before analysis
2. **Use structured parsing** - Extract values, flows, and timings into typed structures for reliable comparison
3. **Cross-file correlation** - Match trace IDs across files to reconstruct complete execution paths
4. **Evidence-based verdicts** - Base confirmations/rejections on specific evidence, never on assumptions
5. **High-significance priority** - Weight high-significance findings more heavily in verdict determination
6. **Generate actionable insights** - When generating new hypotheses, include specific file locations and evidence
7. **Respect iteration limits** - Enforce the 5-iteration maximum to prevent infinite debugging loops
8. **Document reasoning** - Always provide human-readable reasoning for verdicts and new hypothesis generation
9. **Preserve rejected context** - Keep full analysis results for rejected hypotheses to inform future iterations
10. **Timing matters** - Don't ignore timing anomalies; they often indicate performance bugs or race conditions

---

### Step 9: Session Status Transitions

After log analysis, the session status depends on the outcome:

**Confirmed hypothesis path:**
```json
{
  "status": "hypothesis_confirmed",
  "confirmedHypothesis": "HYP_1",
  "nextPhase": "web_research"
}
```
→ Proceed to **Web Research Phase**

**No confirmation, iterations remaining:**
```json
{
  "status": "iterating",
  "iterationCount": 2,
  "newHypotheses": ["HYP_4", "HYP_5"],
  "nextPhase": "instrumentation"
}
```
→ Return to **Instrumentation Phase** with new hypotheses

**No confirmation, max iterations reached:**
```json
{
  "status": "max_iterations_reached",
  "iterationCount": 5,
  "nextPhase": "rollback"
}
```
→ Proceed to **Rollback and Failure Handling**

---

### Example: Complete Log Analysis Flow

**Scenario:** Null reference error in user profile handler

**Input logs (reproduction-hyp-1.log):**
```
2025-01-31T10:40:00.123Z [HYP_1] [ENTER] getProfile(userId: "user_123")
2025-01-31T10:40:00.125Z [HYP_1] [VALUE] user = null
2025-01-31T10:40:00.126Z [HYP_1] [BRANCH] validation-skip taken (user falsy)
2025-01-31T10:40:00.127Z [HYP_1] [VALUE] user.profile = TypeError: Cannot read property 'profile' of null
2025-01-31T10:40:00.128Z [HYP_1] [HYP_1_TRACE:trace_abc123] Request failed at profile access
```

**Analysis process:**

1. **Extract markers:**
   ```
   Found 5 markers for HYP_1:
   - 1 ENTER marker
   - 2 VALUE markers
   - 1 BRANCH marker
   - 1 TRACE marker
   ```

2. **Parse values:**
   ```typescript
   extractedValues = [
     { hypothesisId: "HYP_1", variableName: "user", value: null, ... },
     { hypothesisId: "HYP_1", variableName: "user.profile", value: "TypeError: Cannot read property 'profile' of null", ... }
   ]
   ```

3. **Reconstruct execution flow:**
   ```typescript
   executionPath = {
     hypothesisId: "HYP_1",
     sequence: [
       { type: "ENTER", details: "getProfile(userId: 'user_123')" },
       { type: "BRANCH", details: "validation-skip taken (user falsy)" }
     ],
     branchesTaken: ["validation-skip"],
     entryExitPairs: [{ entry: "getProfile", exit: undefined }]  // No exit = exception
   }
   ```

4. **Compare to expected evidence:**
   ```
   HYP_1 expected: "user variable should be null when fetched before validation"
   HYP_1 expected: "validation-skip branch should be taken"
   HYP_1 expected: "exception should occur on profile access"

   Actual findings:
   ✓ user = null (HIGH match)
   ✓ validation-skip branch taken (HIGH match)
   ✓ Function entered but never exited (HIGH - unexpected behavior)
   ```

5. **Determine verdict:**
   ```
   High-significance matches: 3
   High-significance mismatches: 0

   Verdict: CONFIRMED
   Confidence adjustment: +0.20
   Final confidence: 1.0 (capped)
   ```

6. **Update session:**
   ```json
   {
     "status": "hypothesis_confirmed",
     "confirmedHypothesis": "HYP_1",
     "hypotheses": [
       {
         "id": "HYP_1",
         "status": "confirmed",
         "analysisResult": {
           "verdict": "confirmed",
           "reasoning": "Hypothesis confirmed by 3 high-significance evidence matches..."
         }
       }
     ]
   }
   ```

7. **Next phase:** Proceed to Web Research Phase

---

### Integration with Other Phases

**From: Reproduction Phase** (or Flaky Test Handling Phase)
- Input: Reproduction logs in `logs/reproduction-hyp-*.log`
- Input: Session with hypotheses and instrumentation details
- Input: `isFlaky` flag determines if coming from flaky handling

**To: Web Research Phase** (if hypothesis confirmed)
- Output: Confirmed hypothesis with evidence
- Output: Analysis results for documentation
- Output: Session status `hypothesis_confirmed`

**To: Instrumentation Phase** (if no confirmation, iterations remaining)
- Output: New hypotheses generated from log insights
- Output: Incremented iteration count
- Output: Session status `iterating`

**To: Rollback Phase** (if no confirmation, max iterations reached)
- Output: Complete analysis history across all iterations
- Output: All rejected hypotheses with reasons
- Output: Session status `max_iterations_reached`

---

### Proceeding to Next Phase

After log analysis completes:

1. **Session updated** with analysis results and hypothesis verdicts
2. **Iteration count checked** against maximum (5)
3. **Next phase determined** based on outcome

**If hypothesis confirmed:**
- Status: `hypothesis_confirmed`
- **Proceed to:** Web Research Phase

**If no confirmation, iterations remaining:**
- Status: `iterating`
- New hypotheses generated from log insights
- **Return to:** Instrumentation Phase

**If no confirmation, max iterations reached:**
- Status: `max_iterations_reached`
- **Proceed to:** Rollback and Failure Handling Phase

---

## Web Research Workflow Template

This phase triggers immediately after a hypothesis is confirmed during log analysis. The goal is to research the confirmed issue pattern to identify current best practices, security implications, and avoid deprecated solutions before applying a fix.

### When This Phase Triggers

- **Input**: Confirmed hypothesis from Log Analysis Phase
- **Status**: Session status is `hypothesis_confirmed`
- **Trigger**: Automatic upon hypothesis confirmation (no user prompt needed)

### Web Research Overview

The research phase consists of 8 steps:

1. **Build search queries** from confirmed hypothesis context
2. **Execute prioritized searches** with source ranking
3. **Filter results** by recency and relevance
4. **Extract key findings** (approaches, security, deprecations)
5. **Evaluate applicability** to the specific codebase
6. **Generate research summary** with citations
7. **Update session** with research findings
8. **Time-box enforcement** (3-5 minutes maximum)

---

### Step 1: Build Search Queries

Generate targeted search queries from the confirmed hypothesis context.

**Query construction template:**

```
Based on the confirmed hypothesis, construct search queries that include:

HYPOTHESIS CONTEXT:
- Issue type: {hypothesis.category}
- Error pattern: {errorMessages or key error indicators}
- Language/Framework: {detected language and frameworks}
- Library versions: {package.json, requirements.txt, go.mod versions}
- Confirmed root cause: {hypothesis.description}

QUERY TEMPLATES:
1. Error-specific: "{exact error message or pattern}" + {language}
2. Pattern-specific: {root cause description} + "best practice" + {language/framework}
3. Fix-specific: "how to fix" + {root cause} + {language/framework}
4. Version-specific: {library name} + {version} + {issue pattern} + "workaround"
5. Security-specific: {issue pattern} + "security" + {language} + "vulnerability"

QUERY GENERATION RULES:
- Include exact error messages in quotes for precision
- Add language/framework to every query
- Include "best practice" or "recommended" in at least one query
- Add library version for dependency-related issues
- Include "2024" or "2025" for recency filtering
- Generate 3-5 focused queries (not more)
```

**Example query generation:**

```
Confirmed Hypothesis: HYP_1 - Null reference due to missing user validation
Language: TypeScript
Framework: Express.js
Error: "TypeError: Cannot read property 'profile' of null"

Generated Queries:
1. "TypeError Cannot read property of null" TypeScript Express
2. null check best practice TypeScript Express.js 2024
3. user validation middleware Express.js TypeScript
4. optional chaining nullish coalescing TypeScript best practice
5. Express.js request validation security
```

---

### Step 2: Execute Prioritized Searches

Execute searches with source prioritization strategy.

**Source priority ranking:**

| Priority | Source Type | Weight | Rationale |
|----------|-------------|--------|-----------|
| 1 | Official Documentation | 1.0 | Authoritative, maintained, accurate |
| 2 | GitHub Issues/Discussions | 0.9 | Direct from maintainers, context-rich |
| 3 | Stack Overflow (Accepted) | 0.8 | Community-vetted solutions |
| 4 | Stack Overflow (High Votes) | 0.7 | Popular but verify accuracy |
| 5 | Recent Blog Posts (< 2 years) | 0.6 | May have newer approaches |
| 6 | Older Blog Posts (2-5 years) | 0.3 | Potentially outdated |
| 7 | Forum Posts | 0.2 | Variable quality |

**Search execution template:**

```
For each generated query, search in this order:

1. OFFICIAL DOCUMENTATION SEARCH:
   - Site-specific search: site:docs.{framework}.com OR site:{language}.org
   - API documentation: {library} API reference
   - Migration guides: {library} migration guide {version}

2. GITHUB SEARCH:
   - Issues: site:github.com/issues {error pattern}
   - Discussions: site:github.com/discussions {issue pattern}
   - Pull requests: site:github.com/pull {fix for issue}

3. STACK OVERFLOW SEARCH:
   - Tagged search: site:stackoverflow.com [{language}] [{framework}] {error}
   - Filter: answers:1 (has accepted answer)
   - Sort by votes

4. RECENT BLOGS SEARCH:
   - General: {query} after:2023-01-01
   - Dev platforms: site:dev.to OR site:medium.com {query}

SEARCH EXECUTION RULES:
- Execute searches in priority order
- Stop early if high-quality result found (Priority 1-2)
- Collect up to 5 relevant results total
- Note source URL and publication date for each
```

**Search result structure:**

```typescript
interface SearchResult {
  query: string;
  source: {
    type: "official_docs" | "github_issue" | "stackoverflow" | "blog" | "forum";
    url: string;
    title: string;
    publishedDate: string | null;
    lastUpdated: string | null;
  };
  priority: number;  // 1-7 based on source type
  relevanceScore: number;  // 0.0-1.0 based on query match
  snippet: string;  // Key excerpt from the result
}
```

---

### Step 3: Filter Results by Recency and Relevance

Apply filtering criteria to ensure results are current and applicable.

**Recency filter:**

```
RECENCY RULES:
- Prefer results from last 2 years (2023-2025)
- Accept results from 2-5 years if:
  - From official documentation (always current)
  - High Stack Overflow score (>50 votes)
  - No newer alternative found
- Reject results older than 5 years unless:
  - Language/framework fundamentals (unlikely to change)
  - Linked from official docs

RECENCY SCORING:
- < 6 months: +0.3 to relevance
- 6-12 months: +0.2 to relevance
- 1-2 years: +0.1 to relevance
- 2-5 years: +0.0 to relevance
- > 5 years: -0.2 to relevance (unless exception applies)
```

**Relevance filter:**

```
RELEVANCE CRITERIA:
- Must match confirmed hypothesis category (null reference, race condition, etc.)
- Must apply to detected language/framework version
- Must address root cause (not just symptoms)
- Bonus: Addresses security implications
- Bonus: Includes code examples

RELEVANCE SCORING:
- Exact error match: +0.3
- Same root cause pattern: +0.2
- Same language/framework: +0.2
- Includes code example: +0.1
- Addresses security: +0.1
- Addresses testing: +0.1
```

**Filtered result validation:**

```
For each result, verify:

1. VERSION COMPATIBILITY:
   - Check if solution applies to current library versions
   - Flag if solution requires version upgrade
   - Note breaking changes between versions

2. DEPRECATION CHECK:
   - Look for deprecation warnings in result
   - Check if recommended APIs still exist
   - Verify imports/requires are current

3. SECURITY REVIEW:
   - Identify any security warnings in result
   - Check for CVE references
   - Note if solution introduces new vulnerabilities

Result passes filter if:
- Relevance score >= 0.5
- No critical deprecation issues
- No security vulnerabilities introduced
```

---

### Step 4: Extract Key Findings

From filtered results, extract actionable findings in structured format.

**Finding extraction template:**

```
For each filtered result, extract:

RECOMMENDED APPROACHES:
- What is the recommended fix pattern?
- Is there a library/utility that handles this?
- What are the implementation steps?
- Are there multiple valid approaches? If so, rank them.

SECURITY IMPLICATIONS:
- Does this issue have security implications?
- What attack vectors does it expose?
- Are there security-focused implementations?
- What validation/sanitization is recommended?

DEPRECATED SOLUTIONS:
- What solutions should be avoided?
- What APIs are deprecated?
- What patterns are considered anti-patterns now?
- What libraries are no longer maintained?

EDGE CASES:
- What edge cases should the fix handle?
- Are there known limitations?
- What error handling is recommended?
```

**Finding structure:**

```typescript
interface ResearchFinding {
  id: string;  // "FIND_1", "FIND_2", etc.
  category: "recommended_approach" | "security" | "deprecated" | "edge_case";
  source: {
    url: string;
    type: string;
    priority: number;
  };
  summary: string;  // 1-2 sentence summary
  details: string;  // Longer explanation with context
  codeExample?: string;  // Code snippet if applicable
  applicability: {
    language: string;
    framework: string | null;
    versionRange: string | null;  // e.g., ">=4.0.0"
  };
  confidence: number;  // 0.0-1.0 based on source quality and relevance
}
```

---

### Step 5: Evaluate Applicability

Assess how findings apply to the specific codebase context.

**Applicability evaluation template:**

```
For each finding, evaluate against codebase:

CODEBASE CONTEXT:
- Language: {detected language}
- Framework: {detected framework with version}
- Libraries: {relevant dependencies from package.json/requirements.txt}
- Code patterns: {existing patterns in affected files}
- Project constraints: {any architectural constraints}

APPLICABILITY CHECKS:

1. LANGUAGE COMPATIBILITY:
   - Does finding apply to our language version?
   - Are required language features available?
   - Example: Optional chaining requires ES2020+

2. FRAMEWORK COMPATIBILITY:
   - Does finding apply to our framework version?
   - Are required APIs available?
   - Example: Express 4.x vs 5.x differences

3. LIBRARY COMPATIBILITY:
   - Do we have the required libraries?
   - Are there version conflicts?
   - Would this require new dependencies?

4. PATTERN COMPATIBILITY:
   - Does the fix pattern match existing code style?
   - Can it be implemented without major refactoring?
   - Does it align with project architecture?

5. SECURITY COMPATIBILITY:
   - Does the fix meet project security requirements?
   - Does it require additional security measures?
   - Are there compliance considerations?

APPLICABILITY SCORING:
- Fully applicable (no changes needed): 1.0
- Minor adaptation needed: 0.8
- Moderate adaptation needed: 0.6
- Significant adaptation needed: 0.4
- Not directly applicable: 0.2
```

**Applicability result:**

```typescript
interface ApplicabilityResult {
  findingId: string;
  score: number;  // 0.0-1.0
  adaptationsNeeded: string[];  // What changes are required
  blockers: string[];  // What prevents direct application
  recommendation: "use_as_is" | "adapt" | "skip";
}
```

---

### Step 6: Generate Research Summary

Compile findings into actionable research summary.

**Research summary template:**

```markdown
## Research Summary for {hypothesis.id}

### Confirmed Root Cause
{hypothesis.description}

### Research Queries Used
1. {query1}
2. {query2}
3. {query3}

### Sources Consulted
| Source | Type | Priority | Relevance |
|--------|------|----------|-----------|
| {url1} | {type1} | {priority1} | {score1} |
| {url2} | {type2} | {priority2} | {score2} |

### Key Findings

#### Recommended Approach
{Primary recommended fix approach with rationale}

**Code Example:**
```{language}
{code example from research}
```

**Sources:** {source citations}

#### Security Considerations
{Security implications and mitigations}

**Sources:** {source citations}

#### Solutions to Avoid
{Deprecated or anti-pattern solutions}

**Sources:** {source citations}

### Applicability Assessment
| Finding | Applicability | Adaptations Needed |
|---------|---------------|-------------------|
| {find1} | {score1} | {adaptations1} |
| {find2} | {score2} | {adaptations2} |

### Recommended Fix Strategy
Based on research findings, the recommended approach is:
1. {step1}
2. {step2}
3. {step3}

**Rationale:** {why this approach was selected}
**Sources:** {citations supporting this approach}

### Time Spent
Research completed in: {duration} (target: 3-5 minutes)
```

---

### Step 7: Update Session with Research Findings

Store research results in session for fix application and documentation.

**Session update template:**

```json
{
  "status": "research_complete",
  "researchFindings": {
    "hypothesisId": "HYP_1",
    "researchedAt": "2025-01-31T12:00:00Z",
    "duration": "4m 23s",
    "queriesUsed": [
      "TypeError Cannot read property of null TypeScript Express",
      "null check best practice TypeScript Express.js 2024"
    ],
    "sourcesConsulted": [
      {
        "url": "https://www.typescriptlang.org/docs/handbook/2/narrowing.html",
        "type": "official_docs",
        "priority": 1,
        "relevanceScore": 0.95,
        "title": "TypeScript Handbook - Narrowing"
      }
    ],
    "findings": [
      {
        "id": "FIND_1",
        "category": "recommended_approach",
        "summary": "Use optional chaining and nullish coalescing for null-safe property access",
        "details": "TypeScript 3.7+ provides optional chaining (?.) and nullish coalescing (??) operators...",
        "codeExample": "const profile = user?.profile ?? defaultProfile;",
        "source": "https://www.typescriptlang.org/docs/handbook/2/narrowing.html",
        "applicability": 1.0
      },
      {
        "id": "FIND_2",
        "category": "security",
        "summary": "Validate user object at API boundary before accessing properties",
        "details": "Never trust user objects from external sources without validation...",
        "source": "https://expressjs.com/en/advanced/best-practice-security.html",
        "applicability": 0.9
      },
      {
        "id": "FIND_3",
        "category": "deprecated",
        "summary": "Avoid manual null checks with || operator for default values",
        "details": "The || operator treats empty strings and 0 as falsy, use ?? instead...",
        "source": "https://stackoverflow.com/questions/61515287",
        "applicability": 1.0
      }
    ],
    "recommendedStrategy": {
      "approach": "Use TypeScript optional chaining with Express validation middleware",
      "steps": [
        "Add null check middleware before route handlers",
        "Use optional chaining for property access in affected code",
        "Add type guard for user object validation"
      ],
      "rationale": "Combines runtime validation with compile-time safety",
      "primarySource": "https://www.typescriptlang.org/docs/handbook/2/narrowing.html"
    }
  }
}
```

**Session schema extension:**

```typescript
interface ResearchFindings {
  hypothesisId: string;
  researchedAt: string;
  duration: string;
  queriesUsed: string[];
  sourcesConsulted: SourceReference[];
  findings: ResearchFinding[];
  recommendedStrategy: {
    approach: string;
    steps: string[];
    rationale: string;
    primarySource: string;
    additionalSources: string[];
  };
}

interface SourceReference {
  url: string;
  type: "official_docs" | "github_issue" | "stackoverflow" | "blog" | "forum";
  priority: number;
  relevanceScore: number;
  title: string;
  publishedDate?: string;
  accessedAt: string;
}
```

---

### Step 8: Time-Box Enforcement

Enforce 3-5 minute time limit for research phase.

**Time-box rules:**

```
TIME-BOX ENFORCEMENT:

1. SOFT LIMIT (3 minutes):
   - If adequate findings collected, conclude research
   - Generate summary with available information
   - Note any gaps in research coverage

2. HARD LIMIT (5 minutes):
   - Stop all searches immediately
   - Compile summary from results collected so far
   - Mark research as "time-limited" if gaps remain
   - Note incomplete areas for potential future research

3. EARLY COMPLETION:
   - If high-quality official documentation found, may conclude early
   - If authoritative GitHub issue with fix found, may conclude early
   - Minimum 1 minute research to ensure thoroughness

TIME TRACKING:
- Record start time when phase begins
- Log each search query with timestamp
- Track cumulative time after each search
- Interrupt search if approaching hard limit
```

**Time-limited research handling:**

```json
{
  "researchFindings": {
    "duration": "5m 00s",
    "timeLimited": true,
    "incompleteAreas": [
      "Security implications not fully researched",
      "Alternative approaches not explored"
    ],
    "recommendation": "Proceed with available findings; consider additional research if fix is complex"
  }
}
```

---

### Web Research Rules

Follow these rules during web research:

1. **Trigger immediately**: Research starts automatically after hypothesis confirmation (no user prompt)

2. **Use confirmed hypothesis context**: Build queries from actual error patterns, not generic terms

3. **Prioritize authoritative sources**: Official docs > GitHub > Stack Overflow > blogs

4. **Verify recency**: Prefer results from last 2 years; flag outdated solutions

5. **Check version compatibility**: Ensure solutions apply to current library versions

6. **Identify security implications**: Always check if issue has security impact

7. **Document deprecated solutions**: Explicitly note what NOT to do

8. **Cite sources**: Every recommendation needs source citation

9. **Evaluate applicability**: Don't blindly copy solutions; adapt to codebase context

10. **Respect time box**: Complete within 3-5 minutes; partial results are acceptable

11. **Handle search failures gracefully**: If searches fail, proceed with available findings

12. **Update session completely**: Store all research for fix phase and documentation

---

### Example: Complete Web Research Workflow

**Starting state:**
```json
{
  "status": "hypothesis_confirmed",
  "confirmedHypothesis": "HYP_1",
  "hypotheses": [{
    "id": "HYP_1",
    "category": "null_reference",
    "description": "User object is null when accessed before validation middleware",
    "status": "confirmed"
  }]
}
```

**Step 1: Build queries:**
```
Queries generated:
1. "TypeError Cannot read property profile of null" TypeScript Express
2. Express.js user validation middleware best practice 2024
3. TypeScript optional chaining null check pattern
4. Express.js request validation security
```

**Step 2: Execute searches:**
```
Search results:
1. TypeScript Handbook - Narrowing (official_docs, priority 1, relevance 0.95)
2. Express.js Best Practice Security (official_docs, priority 1, relevance 0.85)
3. GitHub: expressjs/express#4521 - Request validation middleware (github_issue, priority 2, relevance 0.80)
4. Stack Overflow: "How to handle null user in Express" (stackoverflow, priority 3, relevance 0.75)
```

**Step 3: Filter results:**
```
All results pass recency filter (all < 2 years or official docs)
All results pass relevance filter (score >= 0.5)
No deprecation issues detected
No security vulnerabilities introduced
```

**Step 4: Extract findings:**
```
FIND_1 (recommended_approach): Use optional chaining (?.) and type guards
FIND_2 (recommended_approach): Add validation middleware before route handlers
FIND_3 (security): Validate user objects at API boundary
FIND_4 (deprecated): Avoid || operator for default values (use ?? instead)
```

**Step 5: Evaluate applicability:**
```
FIND_1: Fully applicable (TypeScript 4.x supports optional chaining)
FIND_2: Fully applicable (Express.js 4.x middleware pattern)
FIND_3: Fully applicable (matches project security requirements)
FIND_4: Fully applicable (prevents subtle bugs with falsy values)
```

**Step 6: Generate summary:**
```markdown
## Research Summary for HYP_1

### Recommended Approach
Combine TypeScript optional chaining with Express validation middleware:
1. Add validation middleware to check user existence before handlers
2. Use optional chaining (?.) for defensive property access
3. Add type guard for compile-time safety

**Code Example:**
```typescript
// Validation middleware
const requireUser: RequestHandler = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'User not authenticated' });
  }
  next();
};

// Safe property access with optional chaining
const profile = req.user?.profile ?? defaultProfile;
```

**Sources:**
- https://www.typescriptlang.org/docs/handbook/2/narrowing.html
- https://expressjs.com/en/advanced/best-practice-security.html
```

**Step 7: Update session:**
```json
{
  "status": "research_complete",
  "researchFindings": {
    "hypothesisId": "HYP_1",
    "researchedAt": "2025-01-31T12:00:00Z",
    "duration": "3m 45s",
    "findings": [...],
    "recommendedStrategy": {
      "approach": "TypeScript optional chaining with Express validation middleware",
      "steps": ["Add validation middleware", "Use optional chaining", "Add type guard"],
      "rationale": "Combines runtime and compile-time safety"
    }
  }
}
```

**Step 8: Time check:**
```
Duration: 3m 45s (within soft limit)
Research complete: Yes
```

**Ending state:**
```json
{
  "status": "research_complete",
  "confirmedHypothesis": "HYP_1"
}
```

**Next phase:** Proceed to Fix Application Phase

---

### Integration with Other Phases

**From: Log Analysis Phase**
- Input: Confirmed hypothesis with evidence
- Input: Session with `status: hypothesis_confirmed`
- Input: Error patterns, language, framework context

**To: Fix Application Phase**
- Output: Research findings with recommended approach
- Output: Source citations for documentation
- Output: Security considerations for fix implementation
- Output: Session status `research_complete`

---

### Proceeding to Next Phase

After web research completes:

1. **Session updated** with research findings and recommended strategy
2. **Sources documented** for fix application and summary generation
3. **Time recorded** for audit trail

**Research complete:**
- Status: `research_complete`
- **Proceed to:** Fix Application Phase

**Research time-limited:**
- Status: `research_complete` (with `timeLimited: true`)
- **Proceed to:** Fix Application Phase (with incomplete research note)

---

## Fix Application Workflow Template

After research is complete and a strategy is identified, the next step is to apply a complete fix that addresses the root cause. This template guides systematic fix generation based on confirmed hypotheses and research findings.

---

### Overview

The fix application workflow ensures fixes are:

1. **Complete**: Addresses the entire root cause, not just symptoms
2. **Research-Informed**: Uses best practices from official documentation and community solutions
3. **Well-Documented**: Explains what the fix does, why it solves the issue, and the chosen approach
4. **Source-Cited**: References research sources for auditability
5. **Verifiable**: Preserves instrumentation for verification phase

---

### Step 1: Review Fix Context

**When**: Session status is `research_complete`

**Action**: Gather all context needed for fix generation

**Context Collection Template:**

```
Fix Context Summary:

CONFIRMED HYPOTHESIS:
- ID: ${hypothesis.id}
- Category: ${hypothesis.category}
- Description: ${hypothesis.description}
- Primary File: ${hypothesis.primaryFile}
- All Files: ${hypothesis.allFiles}
- Line Ranges: ${hypothesis.lineRanges}
- Evidence: ${hypothesis.analysisResult.findings}

ROOT CAUSE:
${researchFindings.rootCauseAnalysis}

RESEARCH FINDINGS:
- Recommended Approach: ${researchFindings.recommendedStrategy.approach}
- Primary Source: ${researchFindings.recommendedStrategy.primarySource}
- Security Considerations: ${researchFindings.recommendedStrategy.securityConsiderations}
- Deprecated Alternatives to Avoid: ${researchFindings.findings.filter(f => f.category === 'deprecated')}

CURRENT STATE:
- Instrumentation Present: Yes (preserve for verification)
- Affected Files: ${instrumentation.files}
- Session ID: ${session.sessionId}
- Iteration: ${session.iterationCount}
```

**Fields Required:**
- `hypothesis`: The confirmed hypothesis with evidence from log analysis
- `researchFindings`: Research results including recommended approach and sources
- `instrumentation`: Current instrumentation state (must be preserved)
- `session`: Session metadata for commit messages

---

### Step 2: Validate Fix Completeness Requirements

**When**: Before generating fix code

**Action**: Verify the fix will address the complete root cause

**Completeness Checklist:**

| Requirement | Check | Status |
|-------------|-------|--------|
| Root cause identified | Hypothesis confirmed with evidence | ☐ |
| All affected files known | `allFiles` array populated | ☐ |
| Fix addresses all locations | Fix planned for all line ranges | ☐ |
| Edge cases considered | Research findings reviewed | ☐ |
| Security implications addressed | Security findings applied | ☐ |
| Deprecated solutions avoided | No deprecated patterns used | ☐ |
| Code style preserved | Match existing file conventions | ☐ |
| Instrumentation preserved | DEBUG markers not removed | ☐ |

**Completeness Validation Prompt:**

```
Before generating the fix, validate:

1. SCOPE: Does the fix address ALL locations where the root cause manifests?
   - Primary file: ${hypothesis.primaryFile} at lines ${hypothesis.lineRanges[hypothesis.primaryFile]}
   - Related files: ${hypothesis.relatedFiles.map(f => f.path + ' at lines ' + hypothesis.lineRanges[f.path])}

2. ROOT CAUSE: Does the fix address the actual root cause (not symptoms)?
   - Root cause: ${researchFindings.rootCauseAnalysis}
   - Fix mechanism: ${researchFindings.recommendedStrategy.mechanism}

3. COMPLETENESS: Will the issue be fully resolved after this fix?
   - Partial fixes are NOT acceptable
   - If fix cannot be complete, document why and escalate

4. EDGE CASES: Does the fix handle edge cases identified in research?
   - Edge cases: ${researchFindings.findings.filter(f => f.category === 'edge_case')}

5. SECURITY: Does the fix address any security implications?
   - Security findings: ${researchFindings.findings.filter(f => f.category === 'security')}
```

**If completeness cannot be guaranteed:**
- Do NOT proceed with partial fix
- Document incompleteness reason
- Consider generating additional hypotheses
- Update session with `fixBlocked: true` and reason

---

### Step 3: Generate Fix Code

**When**: Completeness requirements validated

**Action**: Generate the complete fix code for all affected files

**Fix Generation Template:**

```json
{
  "fix": {
    "fixId": "FIX_${hypothesis.id}_${Date.now()}",
    "basedOnHypothesis": "${hypothesis.id}",
    "researchSource": "${researchFindings.recommendedStrategy.primarySource}",
    "approach": "${researchFindings.recommendedStrategy.approach}",
    "files": [
      {
        "file": "${file.path}",
        "changes": [
          {
            "type": "replace|insert|delete|wrap",
            "startLine": 45,
            "endLine": 52,
            "originalCode": "// original code here",
            "newCode": "// fixed code here",
            "explanation": "Why this change fixes the issue"
          }
        ],
        "preserveInstrumentation": true,
        "instrumentationMarkers": ["DEBUG_HYP_1_START", "DEBUG_HYP_1_END"]
      }
    ],
    "fixExplanation": {
      "whatItDoes": "Description of what the fix changes",
      "whyItSolves": "Explanation of why this addresses the root cause",
      "approachChosen": "Which recommended approach was selected and why",
      "alternativesConsidered": "Other approaches considered but not chosen",
      "sourceReference": "Citation to research source used"
    }
  }
}
```

**Change Types:**

| Type | Description | Use When |
|------|-------------|----------|
| `replace` | Replace existing code with new code | Fixing logic errors, changing implementations |
| `insert` | Add new code at location | Adding null checks, validation, error handling |
| `delete` | Remove code | Removing problematic code causing the issue |
| `wrap` | Wrap existing code with new code | Adding try-catch, conditionals around existing logic |

---

### Step 4: Prioritize Research Best Practices

**When**: Generating fix code

**Action**: Ensure fix follows researched best practices, not naive solutions

**Best Practice Prioritization:**

```
Fix Approach Selection:

1. CHECK OFFICIAL DOCUMENTATION FIRST
   - If official docs provide specific guidance, follow it
   - Source: ${researchFindings.findings.filter(f => f.sourceType === 'official_documentation')[0]}

2. CHECK SECURITY RECOMMENDATIONS
   - Apply any security-related fixes from research
   - Security findings: ${researchFindings.findings.filter(f => f.category === 'security')}
   - Never introduce new security vulnerabilities

3. CHECK COMMUNITY CONSENSUS
   - If multiple sources recommend same approach, prefer it
   - Consensus approach: ${researchFindings.recommendedStrategy.approach}

4. AVOID DEPRECATED SOLUTIONS
   - Do NOT use any approach marked as deprecated
   - Deprecated: ${researchFindings.findings.filter(f => f.category === 'deprecated')}

5. PREFER SIMPLE OVER CLEVER
   - If multiple valid approaches exist, choose the simpler one
   - Complexity introduces bugs
```

**Best Practice Validation:**

```json
{
  "bestPracticeValidation": {
    "followsOfficialDocs": true,
    "officialDocSource": "https://docs.example.com/error-handling",
    "addressesSecurityConcerns": true,
    "securityMeasures": ["Input validation added", "Error messages sanitized"],
    "avoidsDeprecated": true,
    "deprecatedAvoided": ["Direct string interpolation", "synchronous file reads"],
    "approachJustification": "Followed official async/await pattern per docs"
  }
}
```

---

### Step 5: Preserve Instrumentation

**When**: Generating fix code

**Action**: Ensure all instrumentation markers remain intact for verification

**Instrumentation Preservation Rules:**

1. **Do NOT delete** any lines containing `DEBUG_HYP_N_START` or `DEBUG_HYP_N_END`
2. **Do NOT modify** instrumentation log statements
3. **Work around** instrumentation when making changes
4. **Document** which markers are present in each fixed file

**Instrumentation Preservation Template:**

```typescript
// BEFORE FIX (with instrumentation)
async function findUser(userId: string): Promise<User | null> {
    // DEBUG_HYP_1_START
    console.log('[DEBUG_HYP_1] findUser called with userId:', userId);
    // DEBUG_HYP_1_END

    const user = await db.query('SELECT * FROM users WHERE id = ?', [userId]);

    // DEBUG_HYP_1_START
    console.log('[DEBUG_HYP_1] db.query returned:', user);
    // DEBUG_HYP_1_END

    return user;
}

// AFTER FIX (instrumentation preserved)
async function findUser(userId: string): Promise<User | null> {
    // DEBUG_HYP_1_START
    console.log('[DEBUG_HYP_1] findUser called with userId:', userId);
    // DEBUG_HYP_1_END

    // FIX: Added null check for userId before query
    if (!userId) {
        // DEBUG_HYP_1_START
        console.log('[DEBUG_HYP_1] userId is null/undefined, returning null');
        // DEBUG_HYP_1_END
        return null;
    }

    const user = await db.query('SELECT * FROM users WHERE id = ?', [userId]);

    // DEBUG_HYP_1_START
    console.log('[DEBUG_HYP_1] db.query returned:', user);
    // DEBUG_HYP_1_END

    return user;
}
```

**Key Points:**
- Existing instrumentation remains unchanged
- New instrumentation may be added for fix verification
- Fix code is inserted around instrumentation blocks
- Markers are preserved for cleanup phase after verification

---

### Step 6: Generate Fix Explanation

**When**: After fix code is generated

**Action**: Generate comprehensive explanation for user and documentation

**Fix Explanation Template:**

```markdown
## Fix Applied: ${fix.fixId}

### What This Fix Does
${fix.fixExplanation.whatItDoes}

Specifically:
- Change 1: ${files[0].changes[0].explanation}
- Change 2: ${files[0].changes[1].explanation}
- ... (for each change)

### Why This Solves the Issue
${fix.fixExplanation.whyItSolves}

**Root Cause:** ${hypothesis.description}
**Evidence:** ${hypothesis.analysisResult.findings}
**Fix Mechanism:** This fix addresses the root cause by ${fix.fixExplanation.approachChosen}

### Approach Chosen
${fix.fixExplanation.approachChosen}

**Alternatives Considered:**
${fix.fixExplanation.alternativesConsidered.map(alt => '- ' + alt.name + ': ' + alt.whyNotChosen)}

**Why This Approach:**
- Recommended by: ${researchFindings.recommendedStrategy.primarySource}
- Relevance score: ${researchFindings.recommendedStrategy.relevanceScore}
- Security: ${bestPracticeValidation.securityMeasures}

### Source References
${fix.fixExplanation.sourceReference}

**Primary Source:**
- URL: ${researchFindings.recommendedStrategy.primarySource.url}
- Type: ${researchFindings.recommendedStrategy.primarySource.type}
- Accessed: ${researchFindings.recommendedStrategy.primarySource.accessedAt}

**Supporting Sources:**
${researchFindings.sourcesConsulted.map(s => '- ' + s.url + ' (' + s.type + ')')}

### Files Changed
${fix.files.map(f => '- ' + f.file + ': ' + f.changes.length + ' changes')}

### Instrumentation Status
- Instrumentation preserved: Yes
- Markers present: ${fix.files.flatMap(f => f.instrumentationMarkers)}
- Ready for verification: Yes
```

---

### Step 7: Apply Fix to Files

**When**: Fix code and explanation generated

**Action**: Apply the fix changes to all affected files

**Fix Application Process:**

```bash
# For each file in fix.files:
# 1. Read current file content
# 2. Apply changes in reverse line order (to preserve line numbers)
# 3. Validate instrumentation preserved
# 4. Write updated content
# 5. Stage file for commit
```

**Application Order (Important):**

1. **Apply changes in reverse line order** to preserve line numbers during multi-change files
2. **Validate after each file** that instrumentation markers are still present
3. **Stage all files** before committing

**Fix Application Schema:**

```json
{
  "fixApplication": {
    "timestamp": "2026-01-31T10:00:00Z",
    "fixId": "FIX_HYP_1_1706691600000",
    "filesModified": [
      {
        "file": "src/services/UserService.ts",
        "changesApplied": 2,
        "linesModified": 15,
        "instrumentationPreserved": true,
        "markersVerified": ["DEBUG_HYP_1_START", "DEBUG_HYP_1_END"]
      }
    ],
    "totalLinesModified": 15,
    "applicationStatus": "success"
  }
}
```

---

### Step 8: Update Session and Commit Fix

**When**: All fix changes applied successfully

**Action**: Update session state and create fix commit

**Session Update:**

```json
{
  "status": "fix_applied",
  "currentFix": {
    "fixId": "FIX_HYP_1_1706691600000",
    "appliedAt": "2026-01-31T10:00:00Z",
    "hypothesis": "HYP_1",
    "approach": "Added null check per official documentation recommendation",
    "filesModified": ["src/services/UserService.ts"],
    "instrumentationPreserved": true,
    "commitSha": null
  },
  "fixesAttempted": [
    {
      "fixId": "FIX_HYP_1_1706691600000",
      "iteration": 1,
      "hypothesis": "HYP_1",
      "approach": "Null check addition",
      "status": "applied",
      "verificationPending": true
    }
  ]
}
```

**Commit Message Template:**

```bash
git add ${fix.files.map(f => f.file).join(' ')}
git commit -m "debug: Apply fix for ${hypothesis.id}

Session: ${session.sessionId}
Iteration: ${session.iterationCount}
Hypothesis: ${hypothesis.id} - ${hypothesis.description}
Fix: ${fix.fixExplanation.whatItDoes}

Approach: ${fix.approach}
Source: ${researchFindings.recommendedStrategy.primarySource.url}

Files modified:
${fix.files.map(f => '- ' + f.file + ': ' + f.changes.map(c => c.explanation).join(', ')).join('\n')}

Note: Instrumentation preserved for verification phase.
"
```

**Commit Message Structure:**
- **Type**: `debug:` prefix for debug skill commits
- **Summary**: Brief description of the fix
- **Session Info**: Session ID and iteration for traceability
- **Hypothesis**: Which hypothesis this fix addresses
- **Approach**: What approach was taken (for audit)
- **Source**: Research source reference
- **Files**: List of files and changes
- **Note**: Confirmation that instrumentation is preserved

**Update Session with Commit SHA:**

```json
{
  "currentFix": {
    "commitSha": "abc123def456",
    "committed": true,
    "committedAt": "2026-01-31T10:01:00Z"
  }
}
```

---

### Fix Application Examples

#### Example 1: Null Reference Fix (TypeScript)

**Confirmed Hypothesis:** User object is null when accessed at line 45 of UserService.ts

**Research Finding:** Official TypeScript documentation recommends optional chaining and null guards

**Original Code (with instrumentation):**
```typescript
async function sendEmail(userId: string): Promise<void> {
    // DEBUG_HYP_1_START
    console.log('[DEBUG_HYP_1] sendEmail called with userId:', userId);
    // DEBUG_HYP_1_END

    const user = await userRepository.findById(userId);

    // DEBUG_HYP_1_START
    console.log('[DEBUG_HYP_1] user result:', user);
    // DEBUG_HYP_1_END

    // BUG: user can be null here
    await emailService.send(user.email, 'Hello!');
}
```

**Fixed Code (instrumentation preserved):**
```typescript
async function sendEmail(userId: string): Promise<void> {
    // DEBUG_HYP_1_START
    console.log('[DEBUG_HYP_1] sendEmail called with userId:', userId);
    // DEBUG_HYP_1_END

    const user = await userRepository.findById(userId);

    // DEBUG_HYP_1_START
    console.log('[DEBUG_HYP_1] user result:', user);
    // DEBUG_HYP_1_END

    // FIX: Add null guard per TypeScript best practices
    // Source: https://www.typescriptlang.org/docs/handbook/2/narrowing.html
    if (!user) {
        // DEBUG_HYP_1_START
        console.log('[DEBUG_HYP_1] user not found, throwing error');
        // DEBUG_HYP_1_END
        throw new UserNotFoundError(`User ${userId} not found`);
    }

    await emailService.send(user.email, 'Hello!');
}
```

**Fix Explanation:**
```json
{
  "fixExplanation": {
    "whatItDoes": "Adds a null guard check before accessing user.email, throwing a descriptive error if user is not found",
    "whyItSolves": "The root cause was accessing user.email when user is null. The null guard prevents the null reference by explicitly handling the null case before property access.",
    "approachChosen": "Explicit null check with early return pattern - recommended by TypeScript documentation for narrowing types",
    "alternativesConsidered": [
      {"name": "Optional chaining (user?.email)", "whyNotChosen": "Would silently pass null/undefined to emailService, not addressing the root issue"},
      {"name": "Default value (user?.email ?? 'default')", "whyNotChosen": "Inappropriate - no default email makes sense, should fail explicitly"}
    ],
    "sourceReference": "TypeScript Handbook: Narrowing (https://www.typescriptlang.org/docs/handbook/2/narrowing.html)"
  }
}
```

#### Example 2: Race Condition Fix (Python)

**Confirmed Hypothesis:** Cache invalidation races with read, causing stale data

**Research Finding:** Python asyncio documentation recommends locks for shared state access

**Original Code (with instrumentation):**
```python
class CacheService:
    def __init__(self):
        self.cache = {}

    async def get_user(self, user_id: str) -> Optional[User]:
        # DEBUG_HYP_2_START
        print(f'[DEBUG_HYP_2] get_user called with user_id: {user_id}')
        # DEBUG_HYP_2_END

        # BUG: No synchronization, race with invalidate_user
        if user_id in self.cache:
            return self.cache[user_id]

        user = await self.db.find_user(user_id)
        if user:
            self.cache[user_id] = user
        return user

    async def invalidate_user(self, user_id: str) -> None:
        # DEBUG_HYP_2_START
        print(f'[DEBUG_HYP_2] invalidate_user called with user_id: {user_id}')
        # DEBUG_HYP_2_END

        if user_id in self.cache:
            del self.cache[user_id]
```

**Fixed Code (instrumentation preserved):**
```python
import asyncio

class CacheService:
    def __init__(self):
        self.cache = {}
        # FIX: Add lock for cache access synchronization
        # Source: https://docs.python.org/3/library/asyncio-sync.html
        self._cache_lock = asyncio.Lock()

    async def get_user(self, user_id: str) -> Optional[User]:
        # DEBUG_HYP_2_START
        print(f'[DEBUG_HYP_2] get_user called with user_id: {user_id}')
        # DEBUG_HYP_2_END

        # FIX: Use lock to prevent race condition with invalidation
        async with self._cache_lock:
            if user_id in self.cache:
                # DEBUG_HYP_2_START
                print(f'[DEBUG_HYP_2] cache hit for user_id: {user_id}')
                # DEBUG_HYP_2_END
                return self.cache[user_id]

        # FIX: DB query outside lock to prevent blocking
        user = await self.db.find_user(user_id)

        async with self._cache_lock:
            if user:
                # FIX: Re-check cache in case of concurrent populate
                if user_id not in self.cache:
                    self.cache[user_id] = user
        return user

    async def invalidate_user(self, user_id: str) -> None:
        # DEBUG_HYP_2_START
        print(f'[DEBUG_HYP_2] invalidate_user called with user_id: {user_id}')
        # DEBUG_HYP_2_END

        # FIX: Use lock for atomic cache modification
        async with self._cache_lock:
            if user_id in self.cache:
                del self.cache[user_id]
                # DEBUG_HYP_2_START
                print(f'[DEBUG_HYP_2] user {user_id} invalidated from cache')
                # DEBUG_HYP_2_END
```

**Fix Explanation:**
```json
{
  "fixExplanation": {
    "whatItDoes": "Adds asyncio.Lock to synchronize all cache access operations, preventing race conditions between get_user and invalidate_user",
    "whyItSolves": "The root cause was concurrent access to shared cache state without synchronization. The asyncio.Lock ensures only one coroutine can modify the cache at a time, eliminating the race condition.",
    "approachChosen": "asyncio.Lock with double-check pattern - recommended by Python asyncio documentation for shared state protection",
    "alternativesConsidered": [
      {"name": "threading.Lock", "whyNotChosen": "Not compatible with async/await, would block the event loop"},
      {"name": "Queue-based cache", "whyNotChosen": "Over-engineering for this use case, Lock is simpler and sufficient"}
    ],
    "sourceReference": "Python asyncio Synchronization Primitives (https://docs.python.org/3/library/asyncio-sync.html)"
  }
}
```

#### Example 3: Timeout Fix (Go)

**Confirmed Hypothesis:** External API call timeout is too short for large payloads

**Research Finding:** Go context documentation recommends configurable timeouts with context.WithTimeout

**Original Code (with instrumentation):**
```go
func (s *PaymentService) ProcessPayment(ctx context.Context, order Order) (*PaymentResult, error) {
    // DEBUG_HYP_3_START
    fmt.Printf("[DEBUG_HYP_3] ProcessPayment called, order.ID: %s\n", order.ID)
    // DEBUG_HYP_3_END

    // BUG: Uses parent context timeout, insufficient for large orders
    payload := s.buildPayload(order)

    // DEBUG_HYP_3_START
    fmt.Printf("[DEBUG_HYP_3] payload size: %d bytes\n", len(payload))
    // DEBUG_HYP_3_END

    resp, err := s.client.Post(ctx, "/payments", payload)
    if err != nil {
        return nil, fmt.Errorf("payment failed: %w", err)
    }
    return s.parseResponse(resp)
}
```

**Fixed Code (instrumentation preserved):**
```go
import (
    "context"
    "time"
)

// FIX: Add timeout configuration based on payload size
// Source: https://pkg.go.dev/context#WithTimeout
const (
    baseTimeout      = 10 * time.Second
    perMBTimeout     = 5 * time.Second
    maxPaymentTimeout = 60 * time.Second
)

func (s *PaymentService) ProcessPayment(ctx context.Context, order Order) (*PaymentResult, error) {
    // DEBUG_HYP_3_START
    fmt.Printf("[DEBUG_HYP_3] ProcessPayment called, order.ID: %s\n", order.ID)
    // DEBUG_HYP_3_END

    payload := s.buildPayload(order)

    // DEBUG_HYP_3_START
    fmt.Printf("[DEBUG_HYP_3] payload size: %d bytes\n", len(payload))
    // DEBUG_HYP_3_END

    // FIX: Calculate dynamic timeout based on payload size
    payloadMB := float64(len(payload)) / (1024 * 1024)
    timeout := baseTimeout + time.Duration(payloadMB*float64(perMBTimeout))
    if timeout > maxPaymentTimeout {
        timeout = maxPaymentTimeout
    }

    // DEBUG_HYP_3_START
    fmt.Printf("[DEBUG_HYP_3] calculated timeout: %v\n", timeout)
    // DEBUG_HYP_3_END

    // FIX: Create dedicated context with appropriate timeout
    paymentCtx, cancel := context.WithTimeout(ctx, timeout)
    defer cancel()

    resp, err := s.client.Post(paymentCtx, "/payments", payload)
    if err != nil {
        // DEBUG_HYP_3_START
        if paymentCtx.Err() == context.DeadlineExceeded {
            fmt.Printf("[DEBUG_HYP_3] timeout exceeded: %v\n", timeout)
        }
        // DEBUG_HYP_3_END
        return nil, fmt.Errorf("payment failed: %w", err)
    }
    return s.parseResponse(resp)
}
```

**Fix Explanation:**
```json
{
  "fixExplanation": {
    "whatItDoes": "Implements dynamic timeout calculation based on payload size, creating a dedicated context with appropriate timeout for each payment request",
    "whyItSolves": "The root cause was using a fixed timeout from the parent context that was insufficient for large payloads. The dynamic timeout scales with payload size, ensuring adequate time for transmission while still preventing indefinite hangs.",
    "approachChosen": "Dynamic timeout with context.WithTimeout - recommended by Go context package documentation for time-bounded operations",
    "alternativesConsidered": [
      {"name": "Fixed longer timeout", "whyNotChosen": "Would unnecessarily delay failure detection for small payloads"},
      {"name": "No timeout (context.Background)", "whyNotChosen": "Could hang indefinitely on network issues, unacceptable for payment processing"}
    ],
    "sourceReference": "Go context package (https://pkg.go.dev/context#WithTimeout)"
  }
}
```

---

### Fix Application Rules

1. **Complete fixes only**: Never apply partial fixes that address symptoms instead of root cause
2. **Research-informed**: Always prioritize official documentation and best practices over naive solutions
3. **Preserve instrumentation**: Do NOT remove or modify any DEBUG markers during fix application
4. **Document everything**: Every fix must include what, why, and source reference
5. **Single hypothesis per fix**: Each fix should address one confirmed hypothesis
6. **Style preservation**: Match existing code style (indentation, quotes, braces) in fixed code
7. **Security first**: Apply security recommendations from research; never introduce vulnerabilities
8. **Avoid deprecated**: Do NOT use any deprecated solutions identified in research
9. **Commit atomically**: One commit per fix attempt with descriptive message
10. **Track all attempts**: Store each fix attempt in `fixesAttempted` array for rollback and audit

---

### Session Status Transitions

**Entering Fix Application:**
- Required status: `research_complete`
- Required fields: `confirmedHypothesis`, `researchFindings.recommendedStrategy`

**After Fix Applied:**
- New status: `fix_applied`
- New fields: `currentFix` with fixId, approach, filesModified, commitSha

**Next Phase Routing:**
- **Fix applied successfully** → Proceed to Fix Verification Phase
- **Fix blocked** (cannot achieve completeness) → Return to Hypothesis Generation with context

---

### Proceeding to Next Phase

After fix is applied and committed:

1. **Session updated** with `currentFix` object and status `fix_applied`
2. **Commit created** with descriptive message and source references
3. **Instrumentation preserved** in all modified files
4. **Fix explanation documented** for user understanding

**Proceed to:**
- **Fix Verification Phase** to verify the fix resolves the issue
- Re-run reproduction to compare new logs with original issue logs
- If verification fails, rollback fix (keep instrumentation) and return to hypothesis generation

---

## Fix Verification Workflow Template

After a fix is applied and committed, the next step is to verify that the fix actually resolves the issue. This template guides systematic verification through reproduction and log comparison, with robust rollback for failed fixes.

---

### Overview

The fix verification workflow ensures:

1. **Reproduction**: Re-runs the same reproduction steps used in the initial investigation
2. **Evidence-Based**: Compares new logs against original issue logs to verify resolution
3. **Rollback-Safe**: Failed fixes are rolled back cleanly while preserving instrumentation
4. **Context-Preserving**: Failed fix context is captured for improved next hypothesis
5. **Loop-Capable**: Returns to hypothesis generation with learnings from failed attempt

---

### Step 1: Re-Run Reproduction

**When**: Session status is `fix_applied`

**Action**: Execute the same reproduction method used during initial investigation

**Reproduction Method Selection:**

```
Verification Reproduction Selection:

1. CHECK REPRODUCTION METHOD from session:
   - Method: ${session.reproductionRuns[0].method}
   - If 'automated': Re-run the same test file
   - If 'manual': Guide user through same manual steps

2. RETRIEVE REPRODUCTION DETAILS:
   - Test file: ${session.reproductionRuns[0].testFile}
   - Test command: ${session.reproductionRuns[0].testCommand}
   - Manual script location: ${session.manualReproductionScript}

3. PREPARE LOG CAPTURE:
   - Use same log capture mechanism as initial reproduction
   - Include all instrumentation markers
   - Capture full stdout/stderr
```

**Automated Verification Template:**

```bash
#!/bin/bash
# Fix Verification - Automated Reproduction
# Session: ${session.sessionId}
# Fix ID: ${currentFix.fixId}

# Create verification logs directory
mkdir -p logs/verification

# Run the same test command used for initial reproduction
${session.reproductionRuns[0].testCommand} 2>&1 | tee logs/verification/verification-${currentFix.fixId}.log

# Store exit code
echo $? > logs/verification/exit-code-${currentFix.fixId}.txt

# Extract markers from verification logs
grep -E "(DEBUG_HYP_|HYP_[0-9]+_|\\[ENTER\\]|\\[EXIT\\]|\\[BRANCH\\]|\\[VALUE\\])" \
    logs/verification/verification-${currentFix.fixId}.log \
    > logs/verification/markers-${currentFix.fixId}.txt
```

**Manual Verification Template:**

```markdown
## Manual Fix Verification

**Session**: ${session.sessionId}
**Fix Applied**: ${currentFix.fixId}
**Approach**: ${currentFix.approach}

### Instructions

Please re-run the manual reproduction steps to verify the fix:

#### Original Reproduction Steps
${session.reproductionSteps.map((step, i) => (i + 1) + '. ' + step).join('\n')}

#### Expected Outcome After Fix
- Issue should NOT reproduce
- Expected behavior: ${session.expectedBehavior}
- Error messages should NOT appear

#### Capture Instructions

1. Run the reproduction steps above
2. Observe the behavior
3. Copy any log output or error messages
4. Report whether:
   - [ ] Issue NO LONGER reproduces (fix worked)
   - [ ] Issue STILL reproduces (fix failed)
   - [ ] Different issue appeared (regression)

#### Verification Log Location
Save any log output to: logs/verification/verification-${currentFix.fixId}.log
```

---

### Step 2: Compare Logs to Original Issue

**When**: Verification reproduction completes

**Action**: Compare new logs against original issue logs to determine fix success

**Log Comparison Template:**

```
Log Comparison Analysis:

ORIGINAL ISSUE LOGS (from initial reproduction):
- Run ID: ${session.reproductionRuns[0].runId}
- Issue Reproduced: ${session.reproductionRuns[0].reproduced}
- Error Observed: ${session.reproductionRuns[0].errorObserved}
- Key Markers: ${session.reproductionRuns[0].debugMarkers.filter(m => m.significance === 'high')}

VERIFICATION LOGS (after fix):
- Run ID: verification-${currentFix.fixId}
- File: logs/verification/verification-${currentFix.fixId}.log
- Exit Code: ${verificationExitCode}
- Key Markers: ${verificationMarkers.filter(m => m.significance === 'high')}

COMPARISON CRITERIA:
1. Exit code comparison (0 = success, non-0 = failure)
2. Error message presence/absence
3. Instrumentation marker values (before vs after)
4. Expected behavior observation
```

**Evidence Comparison Structure:**

```json
{
  "logComparison": {
    "verificationRunId": "verification-${currentFix.fixId}",
    "timestamp": "${new Date().toISOString()}",
    "originalRunId": "${session.reproductionRuns[0].runId}",
    "comparisons": [
      {
        "criterion": "exit_code",
        "original": 1,
        "verification": 0,
        "improved": true,
        "notes": "Test now passes (exit 0)"
      },
      {
        "criterion": "error_presence",
        "original": true,
        "verification": false,
        "improved": true,
        "notes": "TypeError no longer appears"
      },
      {
        "criterion": "expected_behavior",
        "original": false,
        "verification": true,
        "improved": true,
        "notes": "API now returns 400 with validation message"
      },
      {
        "criterion": "instrumentation_values",
        "original": { "user_value": "null" },
        "verification": { "user_value": "{ id: 123, name: 'test' }" },
        "improved": true,
        "notes": "Null reference issue resolved"
      }
    ],
    "overallResult": "improved|unchanged|regressed"
  }
}
```

**Comparison Analysis Prompt:**

```
Analyze verification logs against original issue:

1. EXIT CODE COMPARISON:
   - Original: ${originalExitCode} (${originalExitCode === 0 ? 'pass' : 'fail'})
   - Verification: ${verificationExitCode} (${verificationExitCode === 0 ? 'pass' : 'fail'})
   - Assessment: ${verificationExitCode === 0 && originalExitCode !== 0 ? 'IMPROVED' : 'CHECK FURTHER'}

2. ERROR MESSAGE COMPARISON:
   - Original errors present: ${originalErrorsPresent ? 'Yes' : 'No'}
   - Verification errors present: ${verificationErrorsPresent ? 'Yes' : 'No'}
   - Target error resolved: ${targetErrorResolved ? 'Yes' : 'No'}
   - New errors introduced: ${newErrorsIntroduced ? 'Yes - REGRESSION' : 'No'}

3. MARKER VALUE COMPARISON:
   - Compare instrumentation output for hypothesis-critical variables
   - Original: ${originalMarkerValues}
   - Verification: ${verificationMarkerValues}
   - Values match expected: ${valuesMatchExpected ? 'Yes' : 'No'}

4. BEHAVIOR COMPARISON:
   - Expected behavior: ${session.expectedBehavior}
   - Behavior observed in verification: ${observedBehavior}
   - Matches expected: ${behaviorMatchesExpected ? 'Yes' : 'No'}
```

---

### Step 3: Determine Verification Outcome

**When**: Log comparison complete

**Action**: Make a clear determination of whether the fix resolved the issue

**Verification Decision Tree:**

```
Verification Outcome Determination:

START
│
├─ Exit code improved (was failing, now passing)?
│  ├─ YES → Check for regressions
│  │        ├─ New errors introduced? → REGRESSION (failed)
│  │        └─ No new errors? → Continue to behavior check
│  │
│  └─ NO → Exit code still failing?
│          ├─ Same error? → FIX FAILED
│          └─ Different error? → REGRESSION (failed)
│
├─ Target error message resolved?
│  ├─ YES → Continue to behavior check
│  └─ NO → FIX FAILED (error still present)
│
├─ Expected behavior now observed?
│  ├─ YES → FIX VERIFIED (success)
│  └─ NO → Check if partial improvement
│          ├─ Some improvement? → FIX INCOMPLETE (failed)
│          └─ No improvement? → FIX FAILED
│
END
```

**Outcome Categories:**

| Outcome | Description | Next Action |
|---------|-------------|-------------|
| `verified` | Fix completely resolves the issue | Proceed to Cleanup Phase |
| `failed` | Fix does not resolve the issue | Rollback fix, return to Hypothesis Generation |
| `regression` | Fix introduces new issues | Rollback fix, return to Hypothesis Generation |
| `partial` | Fix partially resolves the issue | Rollback fix, refine hypothesis |
| `inconclusive` | Cannot determine fix effectiveness | Request additional verification |

**Verification Result Structure:**

```json
{
  "verificationResult": {
    "fixId": "${currentFix.fixId}",
    "hypothesisId": "${currentFix.basedOnHypothesis}",
    "timestamp": "${new Date().toISOString()}",
    "outcome": "verified|failed|regression|partial|inconclusive",
    "evidence": {
      "exitCodeImproved": true,
      "errorResolved": true,
      "behaviorCorrect": true,
      "noRegressions": true
    },
    "reasoning": "Detailed explanation of why this outcome was determined",
    "verificationLogs": "logs/verification/verification-${currentFix.fixId}.log",
    "nextAction": "cleanup|rollback|manual_review"
  }
}
```

---

### Step 4: Handle Verification Success

**When**: Verification outcome is `verified`

**Action**: Update session and proceed to cleanup

**Success Handling Template:**

```
Fix Verification SUCCESS:

✅ Fix ${currentFix.fixId} has been VERIFIED

Summary:
- Hypothesis: ${currentFix.basedOnHypothesis}
- Approach: ${currentFix.approach}
- Files Modified: ${currentFix.filesModified.join(', ')}
- Evidence: ${verificationResult.evidence}

Proceeding to Instrumentation Cleanup Phase...
```

**Session Update for Success:**

```json
{
  "status": "fix_verified",
  "verificationResult": {
    "fixId": "${currentFix.fixId}",
    "outcome": "verified",
    "timestamp": "${new Date().toISOString()}",
    "evidence": { ... },
    "verificationLogs": "logs/verification/verification-${currentFix.fixId}.log"
  },
  "verifiedFix": {
    "fixId": "${currentFix.fixId}",
    "commitSha": "${currentFix.commitSha}",
    "approach": "${currentFix.approach}",
    "filesModified": [ ... ]
  }
}
```

**Next Phase Routing (Success):**

```
SUCCESS PATH:
1. Session status updated to: fix_verified
2. Verified fix details stored
3. PROCEED TO: Instrumentation Cleanup Phase
4. Cleanup will remove all DEBUG markers
5. Then: Success Summary Generation
```

---

### Step 5: Handle Verification Failure - Rollback Fix

**When**: Verification outcome is `failed`, `regression`, or `partial`

**Action**: Rollback ONLY the fix commit while preserving instrumentation

**Rollback Strategy:**

```
Fix Rollback Strategy:

CRITICAL: Rollback ONLY the fix. Preserve instrumentation.

1. IDENTIFY FIX COMMIT:
   - Fix commit SHA: ${currentFix.commitSha}
   - Fix commit message: ${currentFix.commitMessage}
   - Files modified by fix: ${currentFix.filesModified}

2. IDENTIFY INSTRUMENTATION STATE:
   - Instrumentation commit SHA: ${session.instrumentation.commitSha}
   - Files with instrumentation: ${session.instrumentation.files}
   - Markers present: ${session.instrumentation.markers}

3. ROLLBACK APPROACH:
   - Option A: git revert ${currentFix.commitSha} (if clean)
   - Option B: git checkout ${currentFix.commitSha}^ -- <files> (selective)
   - Option C: Manual code removal of fix changes

4. VERIFY AFTER ROLLBACK:
   - Fix code removed: YES
   - Instrumentation markers present: YES (CRITICAL)
   - Code compiles/runs: YES
```

**Rollback Execution Template:**

```bash
#!/bin/bash
# Fix Rollback Script
# Session: ${session.sessionId}
# Rolling back fix: ${currentFix.fixId}

# Store current state for recovery
git stash push -m "pre-rollback-${currentFix.fixId}"

# Method 1: Git revert (preferred if fix was clean commit)
git revert --no-commit ${currentFix.commitSha}

# OR Method 2: Selective file rollback
# git checkout ${currentFix.commitSha}^ -- ${currentFix.filesModified.join(' ')}

# Verify instrumentation markers still present
echo "Verifying instrumentation preservation..."
for file in ${session.instrumentation.files.join(' ')}; do
    if grep -q "DEBUG_HYP_" "$file"; then
        echo "✅ Instrumentation preserved in $file"
    else
        echo "❌ WARNING: Instrumentation missing in $file"
        echo "Restoring from pre-fix state..."
        git checkout ${session.instrumentation.commitSha} -- "$file"
    fi
done

# Commit the rollback
git commit -m "rollback: Revert fix ${currentFix.fixId} (verification failed)

Fix did not resolve issue. Instrumentation preserved for next iteration.
Session: ${session.sessionId}
Reason: ${verificationResult.reasoning}"
```

**Rollback Verification Checklist:**

| Check | Expected | Verified |
|-------|----------|----------|
| Fix code removed from all files | Fix changes reverted | ☐ |
| `DEBUG_HYP_N_START` markers present | All markers intact | ☐ |
| `DEBUG_HYP_N_END` markers present | All markers intact | ☐ |
| Instrumentation logging preserved | Log statements present | ☐ |
| Code compiles successfully | No syntax errors | ☐ |
| Tests run (may still fail) | Can execute reproduction | ☐ |

---

### Step 6: Verify Rollback Integrity

**When**: After rollback execution

**Action**: Confirm fix is removed AND instrumentation is preserved

**Rollback Integrity Verification Template:**

```bash
#!/bin/bash
# Rollback Integrity Verification
# Session: ${session.sessionId}

echo "=== Rollback Integrity Verification ==="

# Check 1: Fix code should NOT be present
echo "Checking fix code removal..."
FIX_PATTERNS=(
    "${currentFix.codePatterns[0]}"
    "${currentFix.codePatterns[1]}"
    # Patterns specific to the fix that was applied
)
for pattern in "${FIX_PATTERNS[@]}"; do
    if grep -r "$pattern" ${currentFix.filesModified}; then
        echo "❌ FAIL: Fix code still present: $pattern"
        ROLLBACK_CLEAN=false
    fi
done

# Check 2: Instrumentation markers MUST be present
echo "Checking instrumentation preservation..."
MARKERS_FOUND=0
MARKERS_EXPECTED=${session.instrumentation.markerCount}

for file in ${session.instrumentation.files.join(' ')}; do
    FILE_MARKERS=$(grep -c "DEBUG_HYP_" "$file" || echo 0)
    MARKERS_FOUND=$((MARKERS_FOUND + FILE_MARKERS))

    # Check for matching START/END pairs
    STARTS=$(grep -c "DEBUG_HYP_.*_START" "$file" || echo 0)
    ENDS=$(grep -c "DEBUG_HYP_.*_END" "$file" || echo 0)

    if [ "$STARTS" -ne "$ENDS" ]; then
        echo "❌ FAIL: Unbalanced markers in $file (START: $STARTS, END: $ENDS)"
    else
        echo "✅ Balanced markers in $file"
    fi
done

if [ "$MARKERS_FOUND" -ge "$MARKERS_EXPECTED" ]; then
    echo "✅ Instrumentation preserved: $MARKERS_FOUND markers found"
else
    echo "❌ FAIL: Instrumentation missing: $MARKERS_FOUND/$MARKERS_EXPECTED markers"
fi

# Check 3: Code compiles/runs
echo "Checking code integrity..."
${session.buildCommand || 'echo "No build command configured"'}

echo "=== Verification Complete ==="
```

**Integrity Check Structure:**

```json
{
  "rollbackIntegrity": {
    "timestamp": "${new Date().toISOString()}",
    "fixRemoved": true,
    "fixPatternsChecked": [ ... ],
    "instrumentationPreserved": true,
    "markersFound": 24,
    "markersExpected": 24,
    "markerBalance": {
      "starts": 12,
      "ends": 12,
      "balanced": true
    },
    "codeCompiles": true,
    "testsExecutable": true,
    "integrityPassed": true
  }
}
```

---

### Step 7: Return to Hypothesis Generation with Failure Context

**When**: Rollback complete and verified

**Action**: Update session with failure context and return to hypothesis generation

**Failure Context Template:**

```json
{
  "failedFix": {
    "fixId": "${currentFix.fixId}",
    "hypothesisId": "${currentFix.basedOnHypothesis}",
    "approach": "${currentFix.approach}",
    "filesModified": [ ... ],
    "verificationResult": {
      "outcome": "failed|regression|partial",
      "reasoning": "Detailed explanation of why fix failed",
      "evidence": { ... }
    },
    "verificationLogs": "logs/verification/verification-${currentFix.fixId}.log",
    "rollbackCommit": "${rollbackCommitSha}",
    "lessonLearned": "What this failed attempt teaches us about the root cause"
  }
}
```

**Hypothesis Generation Context Injection:**

```
Failed Fix Context for Next Hypothesis Generation:

PREVIOUS FIX ATTEMPT:
- Fix ID: ${failedFix.fixId}
- Hypothesis Addressed: ${failedFix.hypothesisId}
- Approach Used: ${failedFix.approach}
- Outcome: ${failedFix.verificationResult.outcome}

WHY FIX FAILED:
${failedFix.verificationResult.reasoning}

VERIFICATION EVIDENCE:
- Exit code: ${verificationResult.evidence.exitCode}
- Error still present: ${verificationResult.evidence.errorPresent}
- Observed behavior: ${verificationResult.evidence.observedBehavior}

LESSON LEARNED:
${failedFix.lessonLearned}

IMPLICATIONS FOR NEXT HYPOTHESIS:
- The ${failedFix.approach} approach does NOT address the root cause
- Instrumentation logs show: ${keyInsightsFromVerificationLogs}
- Consider alternative hypotheses that account for:
  - ${alternativeDirection1}
  - ${alternativeDirection2}

INSTRUMENTATION STATE:
- All DEBUG markers preserved
- Can re-run reproduction immediately
- Ready for new hypothesis testing
```

**Session Update for Failure:**

```json
{
  "status": "iterating",
  "iterationCount": "${session.iterationCount + 1}",
  "fixesAttempted": [
    ...session.fixesAttempted,
    {
      "fixId": "${currentFix.fixId}",
      "hypothesisId": "${currentFix.basedOnHypothesis}",
      "approach": "${currentFix.approach}",
      "verificationOutcome": "failed",
      "reasoning": "${verificationResult.reasoning}",
      "rollbackCommit": "${rollbackCommitSha}",
      "timestamp": "${new Date().toISOString()}"
    }
  ],
  "currentFix": null,
  "hypotheses": [
    ...session.hypotheses.map(h =>
      h.id === currentFix.basedOnHypothesis
        ? { ...h, status: 'fix_failed', fixAttempted: currentFix.fixId }
        : h
    )
  ]
}
```

---

### Step 8: Check Iteration Limit After Failed Verification

**When**: Returning to hypothesis generation

**Action**: Verify iteration count before generating new hypotheses

**Iteration Check Template:**

```
Iteration Check After Failed Verification:

Current Iteration: ${session.iterationCount}
Maximum Iterations: ${session.maxIterations} (default: 5)
Remaining Iterations: ${session.maxIterations - session.iterationCount}

IF iterationCount >= maxIterations:
  → STOP: Maximum iterations reached
  → Trigger: Complete Rollback and Failure Summary
  → Do NOT generate new hypotheses

IF iterationCount < maxIterations:
  → CONTINUE: Generate new hypotheses
  → Use failed fix context to inform new hypotheses
  → Instrumentation preserved - ready for new iteration
```

**Routing Decision:**

```
Post-Verification-Failure Routing:

CHECK: session.iterationCount >= session.maxIterations ?

YES → Route to: Rollback and Failure Handling Phase
      - Roll back ALL changes to initial commit
      - Generate comprehensive failure summary
      - Save failure report to FAILURE-${session.sessionId}.md
      - Delete session file
      - Exit with error code

NO  → Route to: Hypothesis Generation Phase
      - Inject failed fix context
      - Generate 2-3 new hypotheses informed by failure
      - Preserve instrumentation state
      - Continue debugging cycle
```

---

### Fix Verification Examples

#### Example 1: Successful Verification (TypeScript Null Reference)

**Context:**
```json
{
  "currentFix": {
    "fixId": "FIX_HYP_1_1706789400000",
    "basedOnHypothesis": "HYP_1",
    "approach": "null_guard_with_validation",
    "filesModified": ["src/controllers/user.ts"],
    "commitSha": "abc123"
  }
}
```

**Verification Result:**
```
Original Issue:
- Exit code: 1 (test failed)
- Error: "TypeError: Cannot read property 'id' of null"
- Behavior: API returns 500 error

After Fix:
- Exit code: 0 (test passed)
- Error: None
- Behavior: API returns 400 with validation message

Comparison:
✅ Exit code: IMPROVED (1 → 0)
✅ Error: RESOLVED (TypeError eliminated)
✅ Behavior: CORRECT (proper validation response)
✅ Regressions: NONE

Outcome: VERIFIED
Next: Proceed to Instrumentation Cleanup
```

#### Example 2: Failed Verification (Race Condition)

**Context:**
```json
{
  "currentFix": {
    "fixId": "FIX_HYP_2_1706789500000",
    "basedOnHypothesis": "HYP_2",
    "approach": "mutex_lock_on_cache_access",
    "filesModified": ["src/services/cache.py"],
    "commitSha": "def456"
  }
}
```

**Verification Result:**
```
Original Issue:
- Exit code: 1 (test failed intermittently)
- Error: "KeyError: 'user_123' - cache miss during concurrent access"
- Behavior: Cache returns stale/missing data

After Fix:
- Exit code: 1 (test still fails)
- Error: "KeyError: 'user_123' - cache miss during concurrent access"
- Behavior: Same issue persists

Comparison:
❌ Exit code: UNCHANGED (still 1)
❌ Error: UNCHANGED (same KeyError)
❌ Behavior: UNCHANGED (cache still fails)

Outcome: FAILED
Reasoning: Mutex lock was added but race condition occurs BEFORE cache access,
           during the user lookup phase. The hypothesis targeted the wrong location.

Rollback: Reverting fix, preserving instrumentation.
Next: Return to Hypothesis Generation with this context.
```

**Failure Context for Next Iteration:**
```
The mutex lock approach addressed cache access, but verification shows the race
condition occurs during user lookup (before cache access). New hypotheses should
investigate:
1. User lookup service concurrency
2. Database connection pool behavior
3. Request queuing mechanism
```

#### Example 3: Regression Detected

**Context:**
```json
{
  "currentFix": {
    "fixId": "FIX_HYP_3_1706789600000",
    "basedOnHypothesis": "HYP_3",
    "approach": "timeout_increase_with_retry",
    "filesModified": ["src/api/client.go"],
    "commitSha": "ghi789"
  }
}
```

**Verification Result:**
```
Original Issue:
- Exit code: 1
- Error: "context deadline exceeded"
- Behavior: API call times out after 5 seconds

After Fix:
- Exit code: 1
- Error: "connection refused" (NEW ERROR)
- Behavior: API call fails immediately (no timeout)

Comparison:
⚠️ Exit code: UNCHANGED (still 1)
❌ Original Error: NOT RESOLVED
⚠️ New Error: REGRESSION DETECTED - "connection refused"
❌ Behavior: WORSE (immediate failure instead of timeout)

Outcome: REGRESSION
Reasoning: The timeout increase accidentally changed connection parameters,
           causing the client to connect to wrong port. This introduced a
           regression without fixing the original timeout issue.

Rollback: Reverting fix immediately, preserving instrumentation.
Next: Return to Hypothesis Generation. Fix approach was fundamentally wrong.
```

---

### Fix Verification Rules

1. **Same reproduction method**: Always use the exact same reproduction method (automated/manual) used in initial investigation
2. **Complete log capture**: Capture full logs including all instrumentation markers for thorough comparison
3. **Evidence-based decisions**: Base verification outcome on concrete evidence (exit codes, error presence, marker values)
4. **Conservative rollback**: When in doubt, rollback - incomplete fixes cause more problems than no fix
5. **Preserve instrumentation**: NEVER remove DEBUG markers during rollback - they're needed for next iteration
6. **Verify rollback integrity**: Always confirm instrumentation is intact after rollback
7. **Capture failure context**: Document exactly why the fix failed to inform next hypothesis
8. **Check iteration limits**: Always verify iteration count before returning to hypothesis generation
9. **Flaky test awareness**: For flaky issues, verification uses the configured success count (N consecutive passes)
10. **No partial success**: "Partial" verification means failure - either the fix completely resolves the issue or it doesn't

---

### Session Status Transitions

**Entering Fix Verification:**
- Required status: `fix_applied`
- Required fields: `currentFix` with fixId, commitSha, filesModified

**After Verification Success:**
- New status: `fix_verified`
- New fields: `verificationResult` with outcome 'verified', `verifiedFix` object
- Next phase: Instrumentation Cleanup

**After Verification Failure:**
- New status: `iterating` (if iterations remaining) OR `max_iterations_reached`
- New fields: `rollbackIntegrity`, failed fix added to `fixesAttempted`
- Next phase: Hypothesis Generation (if iterations remaining) OR Rollback Handling

---

### Proceeding to Next Phase

**After Verification SUCCESS:**

1. Session updated with `verificationResult.outcome: 'verified'`
2. Status changed to `fix_verified`
3. **PROCEED TO: Instrumentation Cleanup Phase**
   - Remove all DEBUG markers from all instrumented files
   - Commit cleanup separately from fix
   - Generate success summary

**After Verification FAILURE:**

1. Fix rolled back via git revert or selective checkout
2. Rollback integrity verified (instrumentation preserved)
3. Failed fix context captured in `fixesAttempted` array
4. Iteration count incremented
5. **CHECK: Iterations remaining?**
   - YES → **PROCEED TO: Hypothesis Generation Phase** with failure context
   - NO → **PROCEED TO: Rollback and Failure Handling Phase**

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

---

## Instrumentation Cleanup Phase Template

When fix verification succeeds, use this template to remove all debug instrumentation added during investigation.

---

### Step 1: Identify All Instrumented Files

**When**: Fix verification status is `fix_verified`

**Action**: Locate all files that contain debug instrumentation markers

**Marker Search Template:**

```bash
#!/bin/bash
# Instrumentation Marker Search
# Session: ${session.sessionId}

echo "=== Searching for DEBUG markers across all instrumented files ==="

# Search for all files with DEBUG markers
INSTRUMENTED_FILES=$(grep -rl "DEBUG_HYP_" . \
    --exclude-dir=node_modules \
    --exclude-dir=.git \
    --exclude-dir=build \
    --exclude-dir=dist \
    --exclude-dir=logs \
    --exclude="*.log" \
    --exclude="*.md")

echo "Files with instrumentation:"
echo "$INSTRUMENTED_FILES" | while read -r file; do
    if [ -n "$file" ]; then
        MARKER_COUNT=$(grep -c "DEBUG_HYP_" "$file" || echo 0)
        START_COUNT=$(grep -c "DEBUG_HYP_.*_START" "$file" || echo 0)
        END_COUNT=$(grep -c "DEBUG_HYP_.*_END" "$file" || echo 0)

        echo "  $file: $MARKER_COUNT markers (START: $START_COUNT, END: $END_COUNT)"

        if [ "$START_COUNT" -ne "$END_COUNT" ]; then
            echo "    ⚠️  WARNING: Unbalanced START/END markers"
        fi
    fi
done

# Store results for cleanup phase
echo "$INSTRUMENTED_FILES" > /tmp/debug-cleanup-files.txt
```

**Instrumentation Inventory Structure:**

```json
{
  "instrumentationInventory": {
    "timestamp": "${new Date().toISOString()}",
    "sessionId": "${session.sessionId}",
    "files": [
      {
        "path": "src/controllers/user.ts",
        "markerCount": 8,
        "startMarkers": 4,
        "endMarkers": 4,
        "balanced": true,
        "hypothesisIds": ["HYP_1"]
      },
      {
        "path": "src/services/database.py",
        "markerCount": 12,
        "startMarkers": 6,
        "endMarkers": 6,
        "balanced": true,
        "hypothesisIds": ["HYP_1", "HYP_2"]
      }
    ],
    "totalFiles": 2,
    "totalMarkers": 20,
    "allBalanced": true
  }
}
```

**Validation Checklist:**

| Check | Expected | Status |
|-------|----------|--------|
| All instrumented files from session found | Files match `session.instrumentation.files` | ☐ |
| START/END markers balanced per file | `startMarkers === endMarkers` | ☐ |
| No orphaned markers in unexpected files | Only session files have markers | ☐ |
| Marker format correct | All match `DEBUG_HYP_*` pattern | ☐ |

---

### Step 2: Extract Marker Boundaries

**When**: Instrumented files identified

**Action**: For each file, identify exact line ranges for removal

**Boundary Extraction Template:**

```bash
#!/bin/bash
# Extract Marker Boundaries for Cleanup
# File: $FILE_PATH

echo "=== Extracting marker boundaries from $FILE_PATH ==="

# Find all START markers with line numbers
grep -n "DEBUG_HYP_.*_START" "$FILE_PATH" | while read -r start_line; do
    LINE_NUM=$(echo "$start_line" | cut -d: -f1)
    MARKER=$(echo "$start_line" | cut -d: -f2- | grep -oP "DEBUG_HYP_\d+")

    # Find corresponding END marker
    END_LINE=$(awk -v start="$LINE_NUM" -v marker="$MARKER" '
        NR > start && /_END/ && $0 ~ marker { print NR; exit }
    ' "$FILE_PATH")

    if [ -n "$END_LINE" ]; then
        echo "  Found: $MARKER (lines $LINE_NUM-$END_LINE)"
        echo "$FILE_PATH:$LINE_NUM:$END_LINE:$MARKER" >> /tmp/debug-cleanup-boundaries.txt
    else
        echo "  ⚠️  WARNING: $MARKER at line $LINE_NUM has no END marker"
    fi
done
```

**Boundary Structure:**

```json
{
  "markerBoundaries": [
    {
      "file": "src/controllers/user.ts",
      "hypothesisId": "HYP_1",
      "regions": [
        {
          "startLine": 45,
          "endLine": 52,
          "startMarkerText": "// DEBUG_HYP_1_START",
          "endMarkerText": "// DEBUG_HYP_1_END",
          "linesAffected": 8,
          "codePreview": "console.log('HYP_1: user object:', user);"
        }
      ]
    }
  ]
}
```

**Boundary Detection Rules:**

1. **Paired markers**: Every START must have matching END
2. **Nested markers**: Handle nested hypothesis markers (HYP_1 inside HYP_2 blocks)
3. **Line precision**: Capture exact line numbers including marker comment lines
4. **Content preservation**: Identify original code vs instrumentation code within boundaries
5. **Multi-file tracking**: Track boundaries across all instrumented files

---

### Step 3: Generate Cleanup Plan

**When**: All marker boundaries extracted

**Action**: Create detailed removal plan preserving original code structure

**Cleanup Plan Generation Prompt:**

```
Generate cleanup plan for session ${session.sessionId}:

FOR EACH instrumented file:
  1. Load file content
  2. Identify all DEBUG marker regions (START to END)
  3. Determine what to remove:
     - Marker comment lines (// DEBUG_HYP_N_START/END)
     - Logging statements added for debugging
     - Temporary variable declarations used only for logging
  4. Determine what to PRESERVE:
     - Original code structure
     - Indentation and whitespace
     - Comments that existed before debugging
     - All code outside marker boundaries
  5. Generate line-by-line removal instructions

VALIDATION:
  - Ensure no original code is removed
  - Preserve all imports/exports not added for instrumentation
  - Maintain code formatting and style
  - Verify syntax remains valid after removal
```

**Cleanup Plan Structure:**

```json
{
  "cleanupPlan": {
    "sessionId": "${session.sessionId}",
    "timestamp": "${new Date().toISOString()}",
    "files": [
      {
        "path": "src/controllers/user.ts",
        "language": "typescript",
        "operations": [
          {
            "type": "remove_lines",
            "startLine": 45,
            "endLine": 52,
            "reason": "DEBUG_HYP_1 instrumentation block",
            "affectedCode": [
              "// DEBUG_HYP_1_START",
              "console.log('HYP_1: Entering user.create with data:', data);",
              "console.log('HYP_1: User object after validation:', user);",
              "console.log('HYP_1: user.id value:', user?.id);",
              "// DEBUG_HYP_1_END"
            ]
          }
        ],
        "importsToRemove": [],
        "variablesToRemove": [],
        "expectedLineCountReduction": 5,
        "syntaxValidationRequired": true
      }
    ],
    "totalOperations": 3,
    "estimatedLinesRemoved": 15
  }
}
```

**Cleanup Plan Rules:**

1. **Conservative removal**: Only remove lines explicitly added for debugging
2. **Line-by-line precision**: Use exact line numbers from marker extraction
3. **Import cleanup**: Remove imports only if added solely for debugging (e.g., `import { performance } from 'perf_hooks'`)
4. **Variable cleanup**: Remove variables declared only for logging purposes
5. **Comment preservation**: Keep original comments, remove only DEBUG markers
6. **Formatting preservation**: Maintain original indentation, whitespace, and style
7. **Syntax verification**: Verify resulting code is syntactically valid
8. **Atomic operations**: Group removals by file for atomic commits

---

### Step 4: Remove Instrumentation Code

**When**: Cleanup plan generated and validated

**Action**: Execute removal operations for each file

**Removal Execution Template:**

```bash
#!/bin/bash
# Execute Instrumentation Cleanup
# Session: ${session.sessionId}

echo "=== Executing Instrumentation Cleanup ==="

# Process each file in cleanup plan
while IFS= read -r file_path; do
    echo "Cleaning: $file_path"

    # Create backup
    cp "$file_path" "${file_path}.pre-cleanup"

    # Remove marker blocks (reverse order to maintain line numbers)
    # Extract boundaries for this file
    grep "^${file_path}:" /tmp/debug-cleanup-boundaries.txt | \
        sort -t: -k2 -rn | \
        while IFS=: read -r path start end marker; do
            echo "  Removing lines $start-$end ($marker)"

            # Use sed to delete line range (inclusive)
            sed -i.bak "${start},${end}d" "$file_path"
        done

    # Verify syntax after cleanup
    case "$file_path" in
        *.ts|*.tsx)
            npx tsc --noEmit "$file_path" 2>&1 | grep -q "error" && {
                echo "  ❌ Syntax error after cleanup, restoring backup"
                mv "${file_path}.pre-cleanup" "$file_path"
                exit 1
            }
            ;;
        *.py)
            python3 -m py_compile "$file_path" 2>&1 | grep -q "SyntaxError" && {
                echo "  ❌ Syntax error after cleanup, restoring backup"
                mv "${file_path}.pre-cleanup" "$file_path"
                exit 1
            }
            ;;
        *.go)
            go fmt "$file_path" > /dev/null 2>&1 || {
                echo "  ❌ Syntax error after cleanup, restoring backup"
                mv "${file_path}.pre-cleanup" "$file_path"
                exit 1
            }
            ;;
    esac

    echo "  ✅ Cleaned successfully"

done < /tmp/debug-cleanup-files.txt

echo "=== Cleanup Complete ==="
```

**Alternative: Programmatic Removal (TypeScript Example):**

```typescript
// Programmatic Cleanup Implementation
import * as fs from 'fs';

function removeInstrumentation(
  filePath: string,
  boundaries: Array<{ startLine: number; endLine: number }>
): void {
  const lines = fs.readFileSync(filePath, 'utf-8').split('\n');

  // Sort boundaries in reverse order to maintain line numbers
  const sortedBoundaries = boundaries.sort((a, b) => b.startLine - a.startLine);

  // Remove each boundary (inclusive)
  for (const { startLine, endLine } of sortedBoundaries) {
    // Line numbers are 1-indexed, array is 0-indexed
    lines.splice(startLine - 1, endLine - startLine + 1);
  }

  // Write cleaned content
  fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
}
```

**Removal Verification Checklist:**

| Check | Expected | Status |
|-------|----------|--------|
| All DEBUG markers removed | `grep -r "DEBUG_HYP_" returns no results | ☐ |
| Original code preserved | No functional code removed | ☐ |
| Syntax valid | Code compiles/parses without errors | ☐ |
| Formatting preserved | Indentation and style unchanged | ☐ |
| No orphaned variables | No unused imports or declarations | ☐ |

---

### Step 5: Clean Up Orphaned Imports and Variables

**When**: Instrumentation code removed

**Action**: Remove imports and variables that were added only for debugging

**Orphaned Code Detection:**

```bash
#!/bin/bash
# Detect Orphaned Imports and Variables

echo "=== Detecting Orphaned Code ==="

for file in $(cat /tmp/debug-cleanup-files.txt); do
    echo "Checking: $file"

    # Language-specific orphan detection
    case "$file" in
        *.ts|*.tsx|*.js|*.jsx)
            # Check for unused imports
            npx ts-prune "$file" 2>&1 | grep "unused" || echo "  No orphaned imports"
            ;;
        *.py)
            # Check for unused imports with autoflake
            autoflake --check --remove-all-unused-imports "$file" || echo "  Orphaned imports detected"
            ;;
        *.go)
            # Go compiler handles this automatically
            go build "$file" 2>&1 | grep "imported and not used" || echo "  No orphaned imports"
            ;;
    esac
done
```

**Common Orphaned Patterns:**

| Language | Pattern | Removal Command |
|----------|---------|-----------------|
| TypeScript | `import { performance } from 'perf_hooks'` | Remove if no other usage |
| Python | `import time`, `import logging` (if not used elsewhere) | Use `autoflake --remove-all-unused-imports` |
| Go | `import "time"` | `goimports -w <file>` |
| Java | `import java.time.Instant` | IDE or `organize imports` |

**Orphan Removal Template:**

```json
{
  "orphanedCode": {
    "file": "src/controllers/user.ts",
    "orphanedImports": [
      {
        "line": 3,
        "code": "import { performance } from 'perf_hooks';",
        "reason": "Used only for DEBUG timing measurements",
        "safeToRemove": true
      }
    ],
    "orphanedVariables": [
      {
        "line": 48,
        "code": "const debugStartTime = performance.now();",
        "reason": "Temporary variable for timing instrumentation",
        "safeToRemove": true
      }
    ]
  }
}
```

---

### Step 6: Run Linter and Formatter

**When**: All instrumentation and orphaned code removed

**Action**: Run project's configured linter and formatter to restore code consistency

**Linter/Formatter Detection:**

```bash
#!/bin/bash
# Detect and Run Project Linter/Formatter

echo "=== Running Linter/Formatter ==="

# Detect project configuration
if [ -f "package.json" ]; then
    # JavaScript/TypeScript projects
    if jq -e '.scripts.lint' package.json > /dev/null; then
        echo "Running npm run lint..."
        npm run lint -- --fix
    elif jq -e '.scripts.format' package.json > /dev/null; then
        echo "Running npm run format..."
        npm run format
    elif [ -f ".eslintrc.json" ] || [ -f ".eslintrc.js" ]; then
        echo "Running eslint..."
        npx eslint --fix $(cat /tmp/debug-cleanup-files.txt)
    elif [ -f ".prettierrc" ]; then
        echo "Running prettier..."
        npx prettier --write $(cat /tmp/debug-cleanup-files.txt)
    fi
elif [ -f "pyproject.toml" ] || [ -f "setup.cfg" ]; then
    # Python projects
    if command -v ruff &> /dev/null; then
        echo "Running ruff format..."
        ruff format $(cat /tmp/debug-cleanup-files.txt)
        ruff check --fix $(cat /tmp/debug-cleanup-files.txt)
    elif command -v black &> /dev/null; then
        echo "Running black..."
        black $(cat /tmp/debug-cleanup-files.txt)
    fi
elif [ -f "go.mod" ]; then
    # Go projects
    echo "Running go fmt..."
    go fmt $(cat /tmp/debug-cleanup-files.txt)
    echo "Running goimports..."
    goimports -w $(cat /tmp/debug-cleanup-files.txt)
fi

echo "=== Formatting Complete ==="
```

**Formatter Configuration Detection:**

| Language | Config Files | Formatter | Command |
|----------|--------------|-----------|---------|
| TypeScript/JS | `.eslintrc.*`, `.prettierrc` | ESLint, Prettier | `eslint --fix`, `prettier --write` |
| Python | `pyproject.toml`, `setup.cfg` | Black, Ruff | `black .`, `ruff format` |
| Go | N/A (built-in) | gofmt, goimports | `go fmt`, `goimports -w` |
| Java | `.editorconfig`, checkstyle | google-java-format | `google-java-format -i` |
| Ruby | `.rubocop.yml` | RuboCop | `rubocop -a` |

**Linter Rules:**

1. **Run only if configured**: Don't introduce new linter config if project doesn't have one
2. **Fix mode**: Use auto-fix flags (`--fix`, `-a`, etc.) to correct issues automatically
3. **Scoped to cleaned files**: Only format files that were instrumented
4. **Fail gracefully**: If linter not available, skip with warning
5. **Respect .gitignore**: Don't format generated or ignored files

---

### Step 7: Verify Cleanup Integrity

**When**: Formatting complete

**Action**: Verify all instrumentation removed and code is functional

**Cleanup Verification Template:**

```bash
#!/bin/bash
# Cleanup Integrity Verification
# Session: ${session.sessionId}

echo "=== Cleanup Integrity Verification ==="

# Check 1: No DEBUG markers remain
echo "1. Checking for remaining DEBUG markers..."
REMAINING_MARKERS=$(grep -r "DEBUG_HYP_" . \
    --exclude-dir=node_modules \
    --exclude-dir=.git \
    --exclude-dir=logs \
    --exclude="*.log" \
    --exclude="*.md" || echo "")

if [ -z "$REMAINING_MARKERS" ]; then
    echo "   ✅ No DEBUG markers found"
else
    echo "   ❌ FAIL: DEBUG markers still present:"
    echo "$REMAINING_MARKERS"
    exit 1
fi

# Check 2: No orphaned imports
echo "2. Checking for orphaned imports..."
case "$(basename $(pwd))" in
    *typescript*|*javascript*)
        npx ts-prune 2>&1 | grep -q "unused" && {
            echo "   ⚠️  Warning: Orphaned imports detected (may need manual cleanup)"
        } || echo "   ✅ No orphaned imports"
        ;;
    *python*)
        autoflake --check --remove-all-unused-imports $(cat /tmp/debug-cleanup-files.txt) && {
            echo "   ✅ No orphaned imports"
        } || echo "   ⚠️  Warning: Orphaned imports detected"
        ;;
esac

# Check 3: Code compiles/runs
echo "3. Verifying code integrity..."
${session.buildCommand || 'echo "No build command - skipping"'}
BUILD_EXIT=$?

if [ $BUILD_EXIT -eq 0 ]; then
    echo "   ✅ Code compiles successfully"
else
    echo "   ❌ FAIL: Code does not compile after cleanup"
    exit 1
fi

# Check 4: Tests still pass (use original reproduction)
echo "4. Re-running original reproduction test..."
${session.reproductionRuns[0].testCommand}
TEST_EXIT=$?

if [ $TEST_EXIT -eq 0 ]; then
    echo "   ✅ Reproduction test still passes"
else
    echo "   ❌ FAIL: Reproduction test fails after cleanup"
    exit 1
fi

echo "=== Verification Complete: All checks passed ==="
```

**Verification Checklist:**

| Check | Description | Expected | Status |
|-------|-------------|----------|--------|
| No DEBUG markers | `grep -r "DEBUG_HYP_"` returns nothing | Zero matches | ☐ |
| No orphaned imports | Unused imports removed | Clean import list | ☐ |
| No orphaned variables | Temp variables removed | No unused declarations | ☐ |
| Code compiles | Build succeeds | Exit code 0 | ☐ |
| Tests pass | Original reproduction test passes | Exit code 0 | ☐ |
| Formatting clean | Linter passes | No warnings | ☐ |
| Original code preserved | Functional behavior unchanged | Same as pre-debug | ☐ |

**Cleanup Integrity Structure:**

```json
{
  "cleanupIntegrity": {
    "timestamp": "${new Date().toISOString()}",
    "markersRemoved": 20,
    "markersRemaining": 0,
    "orphanedImportsRemoved": 2,
    "orphanedVariablesRemoved": 3,
    "codeCompiles": true,
    "buildExitCode": 0,
    "testsPass": true,
    "testExitCode": 0,
    "linterPassed": true,
    "filesModified": ["src/controllers/user.ts", "src/services/database.py"],
    "integrityPassed": true
  }
}
```

---

### Step 8: Commit Cleanup Changes

**When**: Cleanup verification passes

**Action**: Commit all cleanup changes separately from fix commit

**Cleanup Commit Template:**

```bash
#!/bin/bash
# Commit Cleanup Changes
# Session: ${session.sessionId}

# Stage all cleaned files
git add $(cat /tmp/debug-cleanup-files.txt)

# Generate commit message
git commit -m "chore: Remove debug instrumentation

Cleanup after successful fix verification.
Session: ${session.sessionId}

Files cleaned:
$(cat /tmp/debug-cleanup-files.txt | sed 's/^/- /')

Instrumentation removed:
- ${cleanupIntegrity.markersRemoved} DEBUG markers
- ${cleanupIntegrity.orphanedImportsRemoved} orphaned imports
- ${cleanupIntegrity.orphanedVariablesRemoved} temporary variables

Original fix preserved in commit: ${session.verifiedFix.commitSha}
All tests passing: ${cleanupIntegrity.testsPass}"
```

**Commit Message Structure:**

```
chore: Remove debug instrumentation

Cleanup after successful fix verification.
Session: sess_1706789400000_abc123

Files cleaned:
- src/controllers/user.ts
- src/services/database.py

Instrumentation removed:
- 20 DEBUG markers
- 2 orphaned imports (performance, time)
- 3 temporary variables

Original fix preserved in commit: abc123def456
All tests passing: true
```

**Commit Rules:**

1. **Separate commit**: Cleanup MUST be separate commit from fix (for clarity and potential revert)
2. **Descriptive message**: List exactly what was removed
3. **Reference fix commit**: Include SHA of verified fix
4. **Include session ID**: For traceability back to debug session
5. **Verify before commit**: All integrity checks must pass
6. **No-amend**: Do NOT amend fix commit, always create new cleanup commit

---

### Step 9: Update Session and Transition Status

**When**: Cleanup committed successfully

**Action**: Update session with cleanup details and transition to success summary

**Session Update for Cleanup:**

```json
{
  "status": "cleanup_complete",
  "cleanup": {
    "timestamp": "${new Date().toISOString()}",
    "commitSha": "${cleanupCommitSha}",
    "commitMessage": "chore: Remove debug instrumentation",
    "filesModified": ["src/controllers/user.ts", "src/services/database.py"],
    "markersRemoved": 20,
    "orphanedImportsRemoved": 2,
    "orphanedVariablesRemoved": 3,
    "integrityVerification": {
      "markersRemaining": 0,
      "codeCompiles": true,
      "testsPass": true,
      "linterPassed": true
    }
  },
  "commits": [
    ...session.commits,
    {
      "type": "cleanup",
      "sha": "${cleanupCommitSha}",
      "timestamp": "${new Date().toISOString()}",
      "message": "chore: Remove debug instrumentation"
    }
  ]
}
```

**Cleanup Summary Template:**

```
Instrumentation Cleanup COMPLETE:

✅ All DEBUG markers removed: ${cleanup.markersRemoved} markers
✅ Orphaned code cleaned: ${cleanup.orphanedImportsRemoved} imports, ${cleanup.orphanedVariablesRemoved} variables
✅ Code integrity verified: Compiles ✓, Tests pass ✓, Linter clean ✓
✅ Changes committed: ${cleanup.commitSha}

Files cleaned:
${cleanup.filesModified.map(f => '  - ' + f).join('\n')}

Session state:
- Original issue: RESOLVED ✓
- Fix applied: ${session.verifiedFix.commitSha}
- Cleanup complete: ${cleanup.commitSha}
- Session status: cleanup_complete

Proceeding to Success Summary Generation...
```

---

### Instrumentation Cleanup Examples

#### Example 1: TypeScript Single-File Cleanup

**Context:**
```json
{
  "instrumentationInventory": {
    "files": [
      {
        "path": "src/controllers/user.ts",
        "markerCount": 6,
        "startMarkers": 3,
        "endMarkers": 3,
        "hypothesisIds": ["HYP_1"]
      }
    ]
  }
}
```

**Before Cleanup:**
```typescript
// src/controllers/user.ts
import { Request, Response } from 'express';
import { performance } from 'perf_hooks'; // Added for debugging

export async function createUser(req: Request, res: Response) {
    // DEBUG_HYP_1_START
    console.log('HYP_1: [ENTER] createUser with body:', req.body);
    const debugStartTime = performance.now();
    // DEBUG_HYP_1_END

    const { name, email } = req.body;

    // DEBUG_HYP_1_START
    console.log('HYP_1: [VALUE] name:', name, 'email:', email);
    // DEBUG_HYP_1_END

    if (!email) {
        return res.status(400).json({ error: 'Email required' });
    }

    const user = await User.create({ name, email });

    // DEBUG_HYP_1_START
    console.log('HYP_1: [VALUE] Created user:', user);
    console.log('HYP_1: [TIMING] createUser took:', performance.now() - debugStartTime, 'ms');
    console.log('HYP_1: [EXIT] createUser');
    // DEBUG_HYP_1_END

    return res.status(201).json(user);
}
```

**After Cleanup:**
```typescript
// src/controllers/user.ts
import { Request, Response } from 'express';

export async function createUser(req: Request, res: Response) {
    const { name, email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email required' });
    }

    const user = await User.create({ name, email });

    return res.status(201).json(user);
}
```

**Cleanup Summary:**
- Removed: 3 marker blocks (6 marker lines + 6 logging statements = 12 lines total)
- Removed: 1 orphaned import (`performance`)
- Removed: 1 orphaned variable (`debugStartTime`)
- Result: Clean, production-ready code with original functionality preserved

---

#### Example 2: Python Multi-File Cleanup

**Context:**
```json
{
  "instrumentationInventory": {
    "files": [
      {
        "path": "src/services/cache.py",
        "markerCount": 8,
        "startMarkers": 4,
        "endMarkers": 4,
        "hypothesisIds": ["HYP_2"]
      },
      {
        "path": "src/models/user.py",
        "markerCount": 4,
        "startMarkers": 2,
        "endMarkers": 2,
        "hypothesisIds": ["HYP_2"]
      }
    ]
  }
}
```

**Before Cleanup (cache.py):**
```python
# src/services/cache.py
import redis
import logging
import time  # Added for debugging

logger = logging.getLogger(__name__)

def get_user_from_cache(user_id: str):
    # DEBUG_HYP_2_START
    trace_id = f"{user_id}_{time.time()}"
    logging.info(f"HYP_2: [HYP_2_TRACE:{trace_id}] [ENTER] get_user_from_cache user_id={user_id}")
    # DEBUG_HYP_2_END

    cache_key = f"user:{user_id}"

    # DEBUG_HYP_2_START
    logging.info(f"HYP_2: [HYP_2_TRACE:{trace_id}] [VALUE] cache_key={cache_key}")
    # DEBUG_HYP_2_END

    result = redis_client.get(cache_key)

    # DEBUG_HYP_2_START
    logging.info(f"HYP_2: [HYP_2_TRACE:{trace_id}] [VALUE] result={result}")
    logging.info(f"HYP_2: [HYP_2_TRACE:{trace_id}] [EXIT] get_user_from_cache")
    # DEBUG_HYP_2_END

    return result
```

**After Cleanup (cache.py):**
```python
# src/services/cache.py
import redis
import logging

logger = logging.getLogger(__name__)

def get_user_from_cache(user_id: str):
    cache_key = f"user:{user_id}"
    result = redis_client.get(cache_key)
    return result
```

**Cleanup Summary:**
- Files cleaned: 2 (cache.py, user.py)
- Removed: 6 marker blocks total (20 lines)
- Removed: 1 orphaned import (`time`)
- Removed: 1 orphaned variable (`trace_id`)
- Result: Original code preserved across both files

---

### Instrumentation Cleanup Rules

1. **Complete removal**: Remove ALL DEBUG markers, logging statements, and temporary code
2. **Preserve original**: Never remove code that existed before debugging session
3. **Atomic operations**: Process each file completely before moving to next
4. **Syntax verification**: Always verify code compiles after each file cleanup
5. **Orphan cleanup**: Remove imports and variables added solely for debugging
6. **Formatting**: Run configured linter/formatter after cleanup
7. **Separate commit**: Cleanup must be separate commit from fix
8. **Verification**: Run full integrity check before committing
9. **Traceability**: Include session ID and reference fix commit in cleanup commit message
10. **Fail-safe**: If cleanup fails, restore backup and report error (do not commit partial cleanup)

---

### Session Status Transitions

**Entering Cleanup:**
- Required status: `fix_verified`
- Required fields: `verifiedFix` with fixId and commitSha

**After Cleanup Success:**
- New status: `cleanup_complete`
- New fields: `cleanup` with commitSha, filesModified, markersRemoved, integrityVerification
- Next phase: Success Summary Generation

**Cleanup Never Fails** (by design):
- If syntax errors after cleanup: restore backups, report in session, but don't fail debugging
- If orphaned imports remain: warn but don't block (user can clean manually)
- Session always proceeds to Success Summary even if minor cleanup issues

---

### Proceeding to Next Phase

After cleanup completion:

1. Session status updated to: `cleanup_complete`
2. Cleanup details stored in session
3. All temporary files deleted (`/tmp/debug-cleanup-*.txt`)
4. **PROCEED TO: Success Summary Generation Phase**
   - Generate comprehensive summary with root cause, fix, and learnings
   - Include before/after code snippets
   - Cite research sources
   - Provide test location

---

## Success Summary Generation Phase

When debugging is complete and the fix is verified, use this template to generate a comprehensive summary for the user.

### Purpose

The success summary serves three critical functions:
1. **Documentation**: Creates a record of the issue, investigation, and solution for future reference
2. **Learning**: Helps the user and team understand root causes and best practices
3. **Traceability**: Provides sources and verification that the fix is complete

### Step 1: Review Session Context

Before generating the summary, collect all context from the session file:

**Required fields:**
- `issueType`: Classification from intake
- `reproductionSteps`: How issue was triggered
- `hypotheses`: All hypotheses generated (confirmed and rejected)
- `researchFindings`: Sources consulted and findings
- `verifiedFix`: The committed fix details
- `reproductionRuns`: Test execution logs

**Verify completeness:**
- Session status must be: `cleanup_complete`
- All hypothesis verdicts documented (confirmed/rejected)
- At least one hypothesis marked as `confirmed`
- Research findings documented with sources
- Fix verification shows `outcome: "verified"`

### Step 2: Generate Root Cause Analysis Section

Create a concise 3-5 line summary:

```
## Root Cause

[Hypothesis #]: [Category] - [Description]

**Evidence**:
- [Key log finding 1 that confirmed this hypothesis]
- [Key log finding 2 showing the problem]

**Impact**: [Explain how this caused the reported issue]
```

**Example:**
```
## Root Cause

Hypothesis 3: Null Reference - User object not initialized before property access

**Evidence**:
- Log shows `userService.getUser()` returned null at line 45
- Subsequent access to `user.email` threw TypeError
- Issue occurs 30% of the time (race condition in async initialization)

**Impact**: When concurrent requests loaded user data, the cache wasn't updated before lookup, causing null dereference in 3 affected code paths
```

### Step 3: Create Research Findings Section

List sources consulted and key findings:

```
## Research Findings

**Sources Consulted:**
| Source | Type | Relevance | Key Finding |
|--------|------|-----------|------------|
| [Official Docs](URL) | Official | High | Best practice for async initialization |
| [GitHub Issue #12345](URL) | Community | Medium | Others encountered similar race condition |

**Recommended Approach**: [From official docs/consensus]

**Alternatives Considered**:
- [Alternative 1 - why not used]
- [Alternative 2 - why not used]
```

**Example:**
```
## Research Findings

**Sources Consulted:**
| Source | Type | Relevance | Key Finding |
|--------|------|-----------|------------|
| [Node.js Async Patterns](https://nodejs.org/en/docs/guides/blocking-vs-non-blocking/) | Official | High | Use async/await or promises for consistency |
| [Express.js Middleware Guide](https://expressjs.com/en/guide/using-middleware.html) | Official | High | Initialize dependencies in middleware before routes |
| [GitHub: express-cache-race](https://github.com/example/issue#1234) | Community | Medium | Others used async/await to prevent race |

**Recommended Approach**: Use async/await in middleware to ensure dependencies initialized before route handlers execute

**Alternatives Considered**:
- Callbacks (error-prone, callback hell)
- Promises without await (doesn't guarantee order)
- Singleton patterns (still vulnerable to races)
```

### Step 4: Add Fix Applied Section

Document what was changed and why:

```
## Fix Applied

**Files Modified**: [list files]

**Before:**
\`\`\`[language]
[Original problematic code snippet - max 15 lines]
\`\`\`

**After:**
\`\`\`[language]
[Fixed code snippet - max 15 lines]
\`\`\`

**What Changed**: [1-2 sentences explaining the fix]

**Why This Solves It**: [Explain how it addresses the root cause]
```

**Example:**
```
## Fix Applied

**Files Modified**: src/middleware/userLoader.ts, src/controllers/userController.ts

**Before:**
\`\`\`typescript
// Initiating user fetch but not awaiting
const userService = new UserService();
userService.loadUser(userId); // Fire and forget

app.get('/users/:id', (req, res) => {
  const user = userService.getUser(req.params.id); // May return null
  res.json(user.profile); // Crashes if user is null
});
\`\`\`

**After:**
\`\`\`typescript
// Properly await user initialization in middleware
const userService = new UserService();

app.use(async (req, res, next) => {
  await userService.loadUser(req.userId); // Wait for completion
  next();
});

app.get('/users/:id', (req, res) => {
  const user = userService.getUser(req.params.id); // Guaranteed initialized
  res.json(user.profile); // Safe to access
});
\`\`\`

**What Changed**: Added `await` to userService.loadUser() in middleware and removed concurrent race condition

**Why This Solves It**: Ensures user data is fully initialized before any route handler accesses it, eliminating the null reference that occurred during concurrent requests
```

### Step 5: Document Hypotheses Tested

Create a concise table of all hypotheses:

```
## Hypotheses Tested

| # | Category | Status | Confidence | Key Finding |
|---|----------|--------|------------|------------|
| 1 | [Type] | Confirmed/Rejected | 0.85 | [Brief finding] |
| 2 | [Type] | Rejected | 0.15 | [Why ruled out] |
| 3 | [Type] | Confirmed | 0.92 | [Brief finding] |
```

**Example:**
```
## Hypotheses Tested

| # | Category | Status | Evidence |
|---|----------|--------|----------|
| 1 | Null Reference (cache miss) | Rejected | Logs showed data in cache, issue persisted |
| 2 | Race Condition (init order) | **Confirmed** | Concurrent requests hit getUser() before loadUser() completed |
| 3 | Logic Error (wrong comparison) | Rejected | Comparison logic was correct |
| 4 | Configuration (wrong env var) | Rejected | Environment variables correct across all test runs |
```

### Step 6: Add Verification Results Section

Document how the fix was verified:

```
## Verification Results

**Test Location**: [path to test file if automated]

**Method**: Automated / Manual

**Verification Details**:
- [Run 1]: ✓ Pass (with details)
- [Run 2]: ✓ Pass (with details)
- [Run 3]: ✓ Pass (optional, for flaky issues: "5 consecutive passes")

**Logs Comparison**:
- ✓ Original error messages gone
- ✓ No new errors introduced
- ✓ Instrumentation shows expected execution path
- ✓ Performance baseline maintained
```

**Example:**
```
## Verification Results

**Test Location**: test/debug/reproduction-HYP_2.test.ts

**Method**: Automated (Jest)

**Verification Details**:
- Run 1: ✓ Pass - 50 concurrent requests, all resolved correctly
- Run 2: ✓ Pass - 50 concurrent requests, all resolved correctly
- Run 3: ✓ Pass - 50 concurrent requests, all resolved correctly
- Run 4: ✓ Pass - 100 concurrent requests, no failures
- Run 5: ✓ Pass - 100 concurrent requests, no failures

**Logs Comparison**:
- ✓ "Cannot read property 'email' of null" error eliminated
- ✓ No new errors introduced
- ✓ All 50 requests completed successfully
- ✓ Response time: 45ms average (baseline: 43ms, acceptable)
```

### Step 7: Summary Structure Template

Create the final summary document with this structure:

```markdown
# Debug Session Summary

**Session ID**: [session-id]
**Date**: [date]
**Total Time**: [duration]
**Status**: ✓ Complete

## Root Cause
[From Step 2]

## Research Findings
[From Step 3]

## Fix Applied
[From Step 4]

## Hypotheses Tested
[From Step 5]

## Verification Results
[From Step 6]

## Key Learnings

- Pattern identified: [General lesson for future debugging]
- Prevention: [How to avoid this in future]
- Testing: [Improved test coverage recommendation]

---

**Session Files**:
- Session record: .claude/debug-sessions/[session-id].json
- Instrumentation cleanup: Reverted in commit [SHA]
- Fix applied: Commit [SHA]
```

### Step 8: Enforce Size Limit

**Summary must stay under 50 lines** (excluding code blocks):

- Root Cause: 3-5 lines
- Research: 8-10 lines
- Fix Applied: 12-15 lines (including before/after snippets with syntax highlighting)
- Hypotheses: 5-7 lines (table format)
- Verification: 6-8 lines
- Learnings: 4-5 lines

**Size reduction strategies:**
- Use tables to compress hypothesis data
- Limit code snippets to problem areas only
- Use links to external docs instead of quoting
- Combine related findings into single points

### Step 9: Update Session and Cleanup

After generating the summary:

1. **Save summary** to `.claude/debug-sessions/SUMMARY-[session-id].md`
2. **Update session file** with final status: `success`
3. **Display summary** to user in formatted markdown
4. **Delete session JSON** file after user confirmation
5. **Return exit code**: 0 (success)

**Session update before deletion:**
```json
{
  "sessionId": "[session-id]",
  "status": "success",
  "completedAt": "2024-01-31T10:45:00Z",
  "debugSummary": {
    "issueCause": "[Confirmed hypothesis #N]",
    "fixApplied": "[Brief description]",
    "hypothesesTested": 4,
    "hypothesesConfirmed": 1,
    "iterationCount": 2,
    "totalTime": "14 minutes"
  }
}
```

### Success Summary Rules

1. **Completeness**: Always include root cause, fix, and verification
2. **Clarity**: Use markdown formatting for readability
3. **Evidence**: Every claim must reference logs or test results
4. **Sources**: Cite all research sources with URLs
5. **Code snippets**: Show minimal before/after that demonstrates the issue
6. **Brevity**: Under 50 lines enforces concise communication
7. **Learnings**: Include 3-4 general lessons for future prevention
8. **Traceability**: Link to session ID, commits, and test locations
9. **Accessibility**: Avoid jargon, explain technical terms
10. **Completeness before display**: Generate full summary before showing to user

### Success Summary Examples

#### Example 1: TypeScript Null Reference (Runtime Error)

```
# Debug Session Summary

**Session ID**: sess_1704067800_a1b2c3d4
**Date**: 2024-01-31
**Status**: ✓ Complete

## Root Cause

Hypothesis 2: Null Reference - UserService async initialization race condition

**Evidence**:
- Concurrent requests accessed user data before loadUser() completed
- Logs show getUser() returned null 30% of the time under load
- Issue disappeared when requests serialized

**Impact**: API returned 500 errors when multiple requests hit same endpoint simultaneously

## Research Findings

| Source | Type | Finding |
|--------|------|---------|
| [Node.js async docs](https://nodejs.org) | Official | Always await async initialization |
| [GitHub issue #456](https://github.com/example) | Community | Others solved with middleware |

**Solution**: Move async initialization to middleware with await

## Fix Applied

**Before**:
\`\`\`typescript
userService.loadUser(id); // Not awaited
const user = userService.getUser(id); // May be null
\`\`\`

**After**:
\`\`\`typescript
await userService.loadUser(id); // Awaited
const user = userService.getUser(id); // Guaranteed initialized
\`\`\`

## Hypotheses Tested

| # | Type | Status |
|---|------|--------|
| 1 | Cache miss | Rejected |
| 2 | Race condition | ✓ Confirmed |
| 3 | Config error | Rejected |

## Verification Results

**Test**: 100 concurrent requests - ✓ All succeeded
**Time**: 5 runs, 5/5 passed

## Key Learnings

- Always use await/promises for critical initialization
- Test with concurrent load early
- Add markers for initialization completion
```

#### Example 2: Python Race Condition (Intermittent Issue)

```
# Debug Session Summary

**Session ID**: sess_1704068200_x9y8z7w6
**Date**: 2024-01-31
**Status**: ✓ Complete (flaky, verified 5 consecutive passes)

## Root Cause

Hypothesis 3: Race Condition - Missing lock on shared cache dictionary

**Evidence**:
- Multi-threaded writes to cache_dict without synchronization
- Logs showed KeyError 2-3% of the time under load
- Issue was deterministic when serialized

**Impact**: Intermittent crashes in cache layer affecting 0.1% of requests

## Research Findings

| Source | Key Finding |
|--------|------------|
| [Python threading docs](https://docs.python.org) | Use threading.Lock for shared state |

**Solution**: Add threading.Lock around cache operations

## Fix Applied

**Before**:
\`\`\`python
cache_dict[key] = value  # Not thread-safe
\`\`\`

**After**:
\`\`\`python
with cache_lock:
    cache_dict[key] = value  # Thread-safe
\`\`\`

## Verification Results

**Test**: test/debug/reproduction-HYP_3.py
**Flaky Verification**: 5 consecutive successful runs (confirmed intermittent is fixed)

## Key Learnings

- Thread safety: Always protect mutable shared state
- Flaky issue verification: 5 passes required, not 1
- Testing: Add stress tests with 10+ threads before release
```

---

### Proceeding After Summary

After generating and displaying the success summary:

1. User reviews summary and learnings
2. User confirms debugging is complete
3. Delete session file: `.claude/debug-sessions/[session-id].json`
4. Keep summary file for reference: `.claude/debug-sessions/SUMMARY-[session-id].md`
5. **Debugging workflow complete** ✓

---

## Rollback and Failure Handling Workflow

When debugging reaches iteration limits or encounters unrecoverable failures, use this template to gracefully rollback and provide comprehensive failure context.

### Purpose

The rollback workflow ensures:
1. **Clean State Recovery**: All debugging changes are reverted to pre-debug state
2. **Comprehensive Documentation**: Failure context preserved for future investigation
3. **No Damage**: No partial fixes left behind, no orphaned code
4. **Learnings Captured**: All hypotheses, research, and failure reasons documented

### Step 1: Detect Rollback Trigger

Monitor for these rollback conditions:

**Automatic Triggers:**
1. **Max Iterations Reached**: `iterationCount >= 5` (checked after each failed verification or analysis)
2. **Unrecoverable Error**: Fix application fails with syntax errors in all attempted files
3. **Cascade Failure**: Each fix attempt makes situation worse (error count increases)

**Manual Triggers:**
1. User explicitly requests rollback during long debugging session
2. Timeout reached (30+ minutes elapsed without progress)

**Session Check Template:**
```json
{
  "rollbackCheck": {
    "iterationCount": 2,
    "maxIterations": 5,
    "shouldRollback": false,
    "reason": "none",
    "checksPerformed": [
      { "check": "iteration_limit", "passed": true },
      { "check": "error_trend", "passed": true },
      { "check": "time_elapsed", "passed": true },
      { "check": "user_request", "passed": true }
    ]
  }
}
```

### Step 2: Identify Initial State

Retrieve the initial git state captured at debug start:

**From Session:**
```json
{
  "initialCommit": "abc123def456",
  "startTime": "2024-01-31T10:00:00Z",
  "gitStateCapture": {
    "branch": "feature/fix-user-auth",
    "uncommittedChanges": [],
    "commits": [
      { "sha": "abc123def456", "message": "last commit before debug", "time": "2024-01-31T09:55:00Z" }
    ]
  }
}
```

**Verification Commands:**
```bash
# Get the exact initial commit
INITIAL_COMMIT=$(jq -r '.initialCommit' .claude/debug-sessions/$SESSION_ID.json)

# Get current state
CURRENT_COMMIT=$(git rev-parse HEAD)

# Count commits made during debugging
COMMITS_DURING_DEBUG=$(git rev-list --count $INITIAL_COMMIT..$CURRENT_COMMIT)

echo "Initial commit: $INITIAL_COMMIT"
echo "Current commit: $CURRENT_COMMIT"
echo "Commits made: $COMMITS_DURING_DEBUG"
```

### Step 3: Collect Failure Context

Document comprehensive failure information before rollback:

**Failure Context Schema:**
```json
{
  "failureContext": {
    "trigger": "max_iterations_reached",
    "detectedAt": "2024-01-31T10:15:00Z",
    "iterationCount": 5,
    "hypothesesTested": [
      {
        "id": 1,
        "category": "Null Reference",
        "status": "rejected",
        "reason": "Evidence showed variable was initialized",
        "attemptedFixes": 2,
        "totalTime": "3 minutes"
      },
      {
        "id": 2,
        "category": "Race Condition",
        "status": "inconclusive",
        "reason": "Logs showed timing issues but inconsistent",
        "attemptedFixes": 3,
        "totalTime": "5 minutes"
      },
      {
        "id": 3,
        "category": "Logic Error",
        "status": "rejected",
        "reason": "Fix changed behavior but didn't resolve original error",
        "attemptedFixes": 2,
        "totalTime": "4 minutes"
      }
    ],
    "researchFindings": {
      "queriesUsed": ["TypeError null reference JS", "race condition async await"],
      "sourcesConsulted": 8,
      "adequateCoverage": "partial"
    },
    "fixesAttempted": [
      {
        "fixId": "FIX_1",
        "hypothesis": "HYP_1",
        "approach": "Add null checks",
        "filesModified": ["src/user.ts"],
        "verificationResult": "failed",
        "reason": "Error persisted, suggests different root cause"
      },
      {
        "fixId": "FIX_2",
        "hypothesis": "HYP_2",
        "approach": "Add async/await",
        "filesModified": ["src/service.ts", "src/controller.ts"],
        "verificationResult": "regression",
        "reason": "Fixed original error but introduced new timeout error"
      }
    ],
    "lastLogs": {
      "timestamp": "2024-01-31T10:14:55Z",
      "errorMessage": "Still getting TypeError on line 45 after 5 attempts",
      "markers": 12,
      "excerpt": "[DEBUG_HYP_3_START] Hypothesis 3 test... [DEBUG_HYP_3_END]"
    },
    "totalTimeSpent": "12 minutes"
  }
}
```

### Step 4: Execute Complete Rollback

Rollback all commits made during debugging:

**Rollback Strategy:**

1. **Check for uncommitted changes:**
   ```bash
   git status --porcelain > /tmp/uncommitted-before-rollback.txt
   if [ -s /tmp/uncommitted-before-rollback.txt ]; then
     echo "WARNING: Uncommitted changes exist, will be discarded"
     cat /tmp/uncommitted-before-rollback.txt
   fi
   ```

2. **Rollback commits using revert:**
   ```bash
   # List commits to revert
   COMMITS_TO_REVERT=$(git rev-list --reverse $INITIAL_COMMIT..$CURRENT_COMMIT)

   # Revert each commit
   for COMMIT in $COMMITS_TO_REVERT; do
     echo "Reverting commit $COMMIT..."
     git revert --no-edit $COMMIT || {
       echo "Revert failed for $COMMIT, attempting manual cleanup"
       # Fall back to selective file checkout if revert fails
     }
   done
   ```

3. **Alternative: Reset to initial state if reverts fail:**
   ```bash
   # Last resort: reset hard to initial commit
   git reset --hard $INITIAL_COMMIT
   git clean -fd  # Remove untracked files
   ```

4. **Verify rollback success:**
   ```bash
   AFTER_ROLLBACK_COMMIT=$(git rev-parse HEAD)
   if [ "$AFTER_ROLLBACK_COMMIT" = "$INITIAL_COMMIT" ]; then
     echo "✓ Rollback successful: back to $INITIAL_COMMIT"
   else
     echo "✗ Rollback verification failed"
     exit 1
   fi
   ```

**Rollback Verification Checklist:**
- [ ] All instrumentation commits reverted
- [ ] All fix commits reverted
- [ ] All cleanup commits reverted
- [ ] Working directory clean (no modified files)
- [ ] HEAD == initialCommit
- [ ] No orphaned debug files remain

### Step 5: Verify Instrumentation Cleanup

Ensure NO debug markers remain after rollback:

**Marker Verification:**
```bash
# Search for remaining DEBUG markers in all files
REMAINING_MARKERS=$(grep -r "DEBUG_HYP_" --exclude-dir=node_modules --exclude-dir=.git . 2>/dev/null | wc -l)

if [ "$REMAINING_MARKERS" -gt 0 ]; then
  echo "WARNING: Found $REMAINING_MARKERS remaining DEBUG markers"
  echo "Removing remaining markers..."

  # Remove any remaining markers
  find . -name "*.ts" -o -name "*.js" -o -name "*.py" | while read file; do
    sed -i '/\/\/ DEBUG_HYP_/d' "$file"
    sed -i '/# DEBUG_HYP_/d' "$file"
  done
else
  echo "✓ All DEBUG markers successfully removed"
fi
```

**Integrity Verification Template:**
```json
{
  "rollbackIntegrity": {
    "markersRemaining": 0,
    "orphanedImports": 0,
    "syntaxValid": true,
    "fileCount": 42,
    "checksPerformed": [
      { "check": "no_debug_markers", "passed": true },
      { "check": "no_orphaned_code", "passed": true },
      { "check": "syntax_valid", "passed": true },
      { "check": "git_clean", "passed": true },
      { "check": "initial_state_restored", "passed": true }
    ]
  }
}
```

### Step 6: Generate Failure Summary

Create comprehensive documentation of failed debugging attempt:

**Failure Summary Structure:**

```markdown
# Debug Session Failure Report

**Session ID**: [session-id]
**Date**: [date]
**Duration**: [total time]
**Status**: Failed - Max Iterations Reached

## What Was Being Debugged

**Issue Type**: [Type from intake]
**Reproduction Steps**:
[Steps from session]

**Initial Error**:
[Error message and stack trace]

## Root Cause Analysis Attempts

### Hypotheses Tested

| # | Category | Status | Evidence | Time |
|---|----------|--------|----------|------|
| 1 | [Type] | Rejected | [Why ruled out] | 3m |
| 2 | [Type] | Inconclusive | [Mixed signals] | 5m |
| 3 | [Type] | Rejected | [Evidence against] | 4m |

### Key Findings from Investigation

- Finding 1: [Observation from logs]
- Finding 2: [Observation from logs]
- Finding 3: [Pattern observed]

## Fixes Attempted and Results

| Fix # | Hypothesis | Approach | Result | Why It Failed |
|-------|-----------|----------|--------|---------------|
| 1 | HYP_1 | [Brief description] | Failed | [Reason] |
| 2 | HYP_2 | [Brief description] | Regression | [New error] |

## Research Conducted

**Queries Used**:
- "error message" + language
- "best practice" + framework
- [Other queries]

**Sources Consulted**: 8 sources
**Key Findings**: [Summary of research findings that didn't lead to solution]

## Recommended Next Steps for Manual Investigation

1. **Review hypotheses #2**: Logs showed mixed signals - suggest adding more targeted instrumentation to confirm/reject
2. **Consider cross-service issue**: Error timeline correlates with external API calls - investigate service dependencies
3. **Expand search scope**: May be configuration-related - check environment variables, deployment differences
4. **Consult team**: Similar error mentioned in team Slack - consider pairing with team member familiar with this code

## Files Modified During Attempt

[List all files that had instrumentation added - these have been reverted]

## Session Artifacts

- Failed session: .claude/debug-sessions/FAILURE-[session-id].md (this file)
- Session record deleted (contained 5 iterations of data)
- Initial state restored: Commit [initial-commit]
- All debug markers removed: ✓ Verified

---

**Next Steps**:
1. Review this failure report
2. Consider manual investigation strategies suggested above
3. If retrying with /debug, start with fresh session - new insights may emerge with different approach
```

**Example Failure Summary:**

```
# Debug Session Failure Report

**Session ID**: sess_1704070200_m1n2o3p4
**Date**: 2024-01-31
**Duration**: 12 minutes
**Status**: Failed - Max Iterations Reached (5 attempts)

## What Was Being Debugged

**Issue Type**: Intermittent Runtime Error
**Reproduction Steps**:
1. Run load test: `npm run test:load`
2. Watch for random "Cannot read property 'id' of null" errors
3. Errors appear ~5% of the time under 50+ concurrent connections

**Initial Error**:
```
TypeError: Cannot read property 'id' of null
  at UserService.getProfile (src/services/user.ts:45:23)
  at async Router.handle (src/controllers/user.ts:12:8)
```

## Root Cause Analysis Attempts

### Hypotheses Tested

| # | Category | Status | Evidence | Time |
|---|----------|--------|----------|------|
| 1 | Null Reference (cache miss) | Rejected | Cache was populated, error occurred anyway | 3m |
| 2 | Race Condition (async init) | Inconclusive | Logs showed timing issues but inconsistent | 5m |
| 3 | Logic Error (wrong condition) | Rejected | Logic was correct in all code paths | 4m |

## Fixes Attempted

| Fix # | Hypothesis | Approach | Result | Reason Failed |
|-------|-----------|----------|--------|---------------|
| 1 | HYP_1 | Add null checks before .id access | Failed | Error still occurred in 2% of runs |
| 2 | HYP_2 | Add async/await to initialization | Regression | Fixed original error but new timeout errors appeared |

## Recommended Next Steps

1. **Add distributed tracing**: Correlation IDs across services to understand full flow
2. **Check for external service issues**: May be timeout from upstream API
3. **Review deployment config**: Differences between dev and production environments
4. **Consider database connection pool**: Pool exhaustion under load
```

### Step 7: Save Failure Summary

Store failure documentation:

```bash
# Save failure summary
FAILURE_FILE=".claude/debug-sessions/FAILURE-${SESSION_ID}.md"
echo "$FAILURE_SUMMARY" > "$FAILURE_FILE"

# Update session with failure status
SESSION_FILE=".claude/debug-sessions/${SESSION_ID}.json"
jq '.status = "failed" | .failureContext = $CONTEXT | .completedAt = now | del(.hypotheses[].instrumentation)' \
  --arg CONTEXT "$FAILURE_CONTEXT_JSON" \
  "$SESSION_FILE" > "${SESSION_FILE}.tmp"
mv "${SESSION_FILE}.tmp" "$SESSION_FILE"
```

### Step 8: Cleanup and Final Status

After rollback completion:

1. **Keep failure summary:** `.claude/debug-sessions/FAILURE-[session-id].md` (for reference)
2. **Update session file:** Mark as `failed` with failure context
3. **Display to user:** Show failure summary with recommendations
4. **Return status:** Exit code 1 (failure)
5. **Optional:** User can keep session JSON for manual review, or delete it

**Session Final State:**
```json
{
  "sessionId": "sess_1704070200_m1n2o3p4",
  "status": "failed",
  "failureReason": "max_iterations_reached",
  "completedAt": "2024-01-31T10:15:30Z",
  "iterationCount": 5,
  "hypothesesTested": 3,
  "hypothesesConfirmed": 0,
  "hypothesesRejected": 2,
  "hypothesesInconclusive": 1,
  "fixesAttempted": 2,
  "totalTime": "12 minutes",
  "rollbackStatus": "successful",
  "failureSummaryLocation": ".claude/debug-sessions/FAILURE-sess_1704070200_m1n2o3p4.md"
}
```

### Rollback Rules

1. **Always rollback completely**: Never leave partial fixes behind
2. **Preserve failure context**: Capture all hypothesis/research/fix data before rollback
3. **Verify clean state**: Confirm all markers removed, working directory clean
4. **Document reasons**: Failure summary must explain why each fix didn't work
5. **Recommend next steps**: Provide actionable suggestions for manual investigation
6. **No blame**: Frame as "debugging workflow reached iteration limit, not a failure of approach"
7. **Session cleanup**: Delete JSON after user reviews, keep MD for reference
8. **Time limit**: Enforce 30-minute timeout to prevent endless debugging
9. **Graceful failure**: Return helpful failure summary, not cryptic error
10. **Exit status**: Return code 1 to indicate rollback occurred

### Rollback Decision Tree

```
Debug Cycle Complete?
├─ YES (fix verified)
│  └─ Generate Success Summary → COMPLETE
│
└─ NO (fix failed)
   ├─ Iterations remaining < 5?
   │  ├─ YES
   │  │  ├─ Can retry with different hypothesis?
   │  │  │  ├─ YES → Return to Hypothesis Generation (iteration loop)
   │  │  │  └─ NO → Trigger rollback
   │  │  └─ Time remaining < 30 minutes?
   │  │     ├─ YES → Retry
   │  │     └─ NO → Trigger rollback
   │  │
   │  └─ NO (iterations maxed)
   │     └─ Trigger complete rollback → Generate Failure Summary
   │
   └─ User requested rollback?
      └─ Trigger rollback immediately
```

### Integration Points

**After Max Iterations Check in Fix Verification:**
```
Fix Verification Phase (US-013) completes
  ↓
Check: iterationCount >= 5?
  ├─ YES → **Trigger Rollback Phase (US-016)**
  │        1. Collect failure context
  │        2. Execute rollback
  │        3. Verify markers removed
  │        4. Generate failure summary
  │        5. Display to user
  │        6. Return exit code 1
  │
  └─ NO → Return to Hypothesis Generation (US-010)
```

---

