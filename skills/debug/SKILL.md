---
name: debug
description: "Systematic debugging: hypothesis-driven investigation, automated instrumentation, verification. Handles runtime errors, logic bugs, flaky issues, cross-service problems. All languages. Triggers: /debug, debug this, help debug, fix this bug"
---

# Debug Skill

Hypothesis-driven debugging through structured investigation, targeted instrumentation, rigorous verification.

---

## Intake Phase

Gather comprehensive issue info using structured template.

### Step 1: Issue Classification

Ask user:
> **Issue type?**
> 1. Runtime Error (crash, exception, null ref)
> 2. Logic Bug (incorrect behavior, wrong output)
> 3. Intermittent/Flaky (sometimes works, sometimes fails)
> 4. Performance (slow, timeout, resource leak)
> 5. Cross-Service/Integration (API fail, distributed problem)
> 6. Other (describe)

### Step 2: Reproduction Steps

> **Provide step-by-step reproduction:**
> ```
> 1. Navigate to /upload
> 2. Click "Choose File"
> 3. Select file >100MB
> 4. Click "Upload"
> 5. Observe error
> ```

Good: "Start app with NODE_ENV=prod. Call POST /api/users with {name:test, email:null}. Observe 500. Check logs."
Bad: "API breaks with bad data"

### Step 3: Expected vs Actual

> **Expected?** (describe desired behavior)
> **Actual?** (describe incorrect behavior observed)

Good:
- Expected: "Return 400 with 'email required'"
- Actual: "Return 500, server crashes"

Bad:
- Expected: "It works"
- Actual: "It doesn't"

### Step 4: Error Messages/Logs

> **Provide error msgs, stack traces, logs:**
> ```
> TypeError: Cannot read 'id' of null
>   at UserController.create (src/controllers/user.ts:45:23)
>   at Router.handle (node_modules/express/lib/router/index.js:284:9)
> ```

### Step 5: Flaky Detection

Auto-scan description for keywords:
- "flaky", "flake", "flakiness"
- "intermittent", "intermittently"
- "sometimes", "occasionally"
- "randomly", "random", "non-deterministic"
- "race condition", "timing"
- "works on my machine"
- "passes locally but fails in CI"

If found → mark `isFlaky: true` → verification runs test N times (default 10)

### Step 6: Environment Context

> **Environment details:**
> - OS/platform? (Linux, macOS, Windows, Docker)
> - Lang/framework version? (Node 18, Python 3.11, Java 17)
> - Test framework? (Jest, pytest, JUnit)
> - Recent changes? (deployments, dep upgrades, config changes)

### Step 7: Files/Components Involved

> **Which files/components involved?** (src/controllers/user.ts, src/services/auth.ts)

If user doesn't know → skip, discovery in hypothesis phase

### Summary Confirmation

Display structured summary:
```
Issue Type: [Runtime Error]
Reproduction: [steps]
Expected: [behavior]
Actual: [behavior]
Error: [message]
Flaky: [yes/no]
Environment: [details]
Files: [list]
```

Ask: **Proceed with debug?**
- Yes → initialize session
- No → allow edits, re-confirm

---

## Session Persistence Workflow

Initialize/maintain debug session state for resumption.

### Step 1: Session Initialization

**When:** After intake confirmation

**Actions:**
1. Generate unique ID: `sess_${timestamp}_${random6}`
2. Capture git state: `git rev-parse HEAD` → `initialCommit`
3. Create session file: `.claude/debug-sessions/${sessionId}.json`
4. Write initial session structure

**Session JSON Schema:**
```json
{
  "sessionId": "sess_20250131_a1b2c3",
  "startTime": "ISO8601",
  "initialCommit": "git_sha",
  "issueDescription": "string",
  "reproductionSteps": ["step1", "step2"],
  "expectedBehavior": "string",
  "actualBehavior": "string",
  "errorMessage": "string",
  "isFlaky": false,
  "environment": {"os": "", "lang": "", "framework": ""},
  "filesInvolved": ["file1.ts", "file2.ts"],
  "hypotheses": [],
  "logsCollected": [],
  "fixesAttempted": [],
  "iterationCount": 0,
  "maxIterations": 5,
  "status": "active"
}
```

### Step 2: Session Updates

Update session after each phase:
- Hypothesis generation → append to `hypotheses[]`
- Instrumentation → update hypothesis `status: instrumented`
- Log collection → append to `logsCollected[]`
- Analysis → update hypothesis `status: confirmed|rejected|inconclusive`
- Fix attempt → append to `fixesAttempted[]`
- Iteration → increment `iterationCount`

### Step 3: Session Resumption

If interrupted, resume from session file:
1. Read `.claude/debug-sessions/*.json` (find active sessions)
2. Display session summary, ask: Resume?
3. Check git state vs `initialCommit` (warn if diverged)
4. Continue from last completed phase based on `status` field

### Step 4: Session Cleanup

**On success:**
- Commit fix
- Delete session file
- Generate success summary

**On max iterations:**
- Rollback changes (git revert/checkout)
- Archive session → `.claude/debug-sessions/archived/${sessionId}.json`
- Generate failure report

### Step 5: Checkpoint Protocol

After **every phase completion**, write session checkpoint:
```bash
echo "CHECKPOINT: [phase] at $(date)" >> .claude/debug-sessions/${sessionId}.log
git add .claude/debug-sessions/${sessionId}.json
# Don't commit, just stage for safety
```

If crash → session recoverable from last checkpoint

---

## Hypothesis Generation Workflow

Generate 3-5 testable hypotheses ranked by confidence.

### Step 1: Gather Analysis Inputs

1. **Issue context:** error message, stack trace, symptoms
2. **Code context:** Read files from `filesInvolved` or entry point
3. **Previous failures:** Check `fixesAttempted[]` to avoid repeat hypotheses
4. **Log insights:** If `iterationCount > 0`, analyze previous logs

### Step 2: Generate Hypotheses

For each hypothesis, define:
- `id`: Unique ID (HYP_1, HYP_2, ...)
- `description`: What root cause might be (1-2 sentences)
- `reasoning`: Why this likely (error pattern, code smell, common failure mode)
- `files`: List of files to instrument (primary file + dependencies)
- `lines`: Specific line ranges per file (e.g., "user.ts:45-60")
- `confidence`: Float 0-1 (internal ranking, not shown to user)
- `testStrategy`: How to verify (log what? check what condition?)

**Generation strategies:**

**For Runtime Errors:**
- Stack trace → identify immediate crash site (high confidence)
- Null/undefined → trace var origin + checks upstream
- Type errors → check type coercion + validation logic

**For Logic Bugs:**
- Compare expected vs actual → identify decision points
- Check boundary conditions (off-by-one, edge cases)
- Trace data transformations (input → output)

**For Intermittent/Flaky:**
- Look for timing issues (async/await, promises, race conditions)
- Check state management (shared mutable state, globals)
- Environment dependencies (random values, timestamps, external APIs)

**For Performance:**
- Profile-like analysis (loops, recursion, I/O)
- Check caching strategy, algorithm complexity
- Database query patterns (N+1, missing indexes)

**For Cross-Service:**
- API contract mismatches (req/res schemas)
- Auth/permission issues (tokens, headers)
- Timeout configs, retry logic, circuit breakers

### Step 3: Rank Hypotheses

Sort by:
1. **Confidence** (primary)
2. **Testability** (can we log/verify easily?)
3. **Impact** (critical path vs edge case?)

Limit to top 5 hypotheses per iteration

### Step 4: Multi-File Tracking

For each hypothesis, track:
- **Primary file:** Where issue manifests
- **Dependency files:** Called functions, imported modules
- **Data flow:** Trace variables across file boundaries

Example:
```json
{
  "id": "HYP_1",
  "description": "Null user passed to UserController.create",
  "files": ["src/controllers/user.ts", "src/middleware/auth.ts"],
  "lines": {
    "src/controllers/user.ts": "45-60",
    "src/middleware/auth.ts": "20-35"
  },
  "dataFlow": [
    {"file": "auth.ts", "var": "req.user", "line": 30},
    {"file": "user.ts", "var": "user", "line": 45}
  ],
  "confidence": 0.85
}
```

### Step 5: Hypothesis Output

Display to user (hide confidence scores):
```
Generated 3 hypotheses:

HYP_1: Null user passed to UserController.create
- Files: src/controllers/user.ts (45-60), src/middleware/auth.ts (20-35)
- Test strategy: Log req.user in auth middleware, log user param in controller

HYP_2: Missing error handling in async user fetch
- Files: src/services/user-service.ts (100-120)
- Test strategy: Log promise rejection, catch block execution

HYP_3: Database connection timing out before query
- Files: src/db/connection.ts (15-30), src/repositories/user.ts (50-70)
- Test strategy: Log connection state, query timing
```

Proceed to logging review

---

## Logging Infrastructure Review

Assess existing logging to avoid conflicts.

### Step 1: Scan Logging Patterns

For each file in hypothesis files:
1. Search for logging statements:
   - JS/TS: `console.log|console.error|logger.`
   - Python: `logging\.|print\(|logger\.`
   - Java: `System.out|logger\.|log\.|LOG\.`
   - Go: `fmt.Print|log.Print`
   - Other langs: adapt patterns
2. Count occurrences per file
3. Identify logging libraries (winston, bunyan, log4j, logrus)

### Step 2: Assess Logging Density

- **None:** No logging found → safe to add anywhere
- **Sparse (1-5 per file):** Safe to add, use same style
- **Moderate (6-20):** Match existing pattern closely
- **Dense (20+):** Use structured logging, unique prefixes

### Step 3: Identify Logging Conventions

Check:
- Log levels used (debug, info, warn, error)
- Message format (JSON, plaintext, structured)
- Variable interpolation style (`${var}`, `%s`, `f"{var}"`)
- Timestamps (auto-added by library?)

### Step 4: Logging Recommendations

Output:
```
📋 Logging Infrastructure Review:
- src/controllers/user.ts: Sparse (3 logs), uses console.log
- src/middleware/auth.ts: Moderate (12 logs), uses winston logger
- Recommendation: Use console.log for user.ts, logger.debug() for auth.ts
- Prefix all debug logs with "DEBUG_HYP_N:" for easy filtering
```

### Step 5: Generate Instrumentation Plan

For each hypothesis file:
- Logging mechanism: console.log | logger.debug | System.out | etc
- Marker format: `// DEBUG_HYP_${id}_START` / `_END`
- Variable format: `"DEBUG_HYP_${id}: var=${value}"`
- Preservation strategy: match indentation, preserve style

---

## Language-Adaptive Instrumentation

Add language-appropriate debug logging with markers.

### General Principles

1. **Markers:** Wrap all instrumentation in unique comments
   - Start: `// DEBUG_HYP_${id}_START` (or lang-specific comment syntax)
   - End: `// DEBUG_HYP_${id}_END`
2. **Prefix logs:** All output prefixed with `DEBUG_HYP_${id}:` for filtering
3. **Preserve code:** Match indentation, braces, semicolons
4. **Log targets:**
   - Variable values (before/after operations)
   - Execution paths (if/else branches, loop iterations)
   - Timing (async operations, I/O)
   - Error states (exceptions, null checks)

### Instrumentation by Language

**JavaScript/TypeScript:**
```javascript
function processUser(user) {
  // DEBUG_HYP_1_START
  console.log("DEBUG_HYP_1: user =", JSON.stringify(user));
  console.log("DEBUG_HYP_1: user null?", user === null);
  // DEBUG_HYP_1_END

  if (!user) {
    // DEBUG_HYP_1_START
    console.error("DEBUG_HYP_1: User null, throwing error");
    // DEBUG_HYP_1_END
    throw new Error("User required");
  }

  // DEBUG_HYP_1_START
  console.log("DEBUG_HYP_1: Accessing user.id =", user.id);
  // DEBUG_HYP_1_END
  return user.id;
}
```

**Python:**
```python
import logging
logger = logging.getLogger(__name__)

def process_user(user):
    # DEBUG_HYP_1_START
    logger.debug(f"DEBUG_HYP_1: user = {user}")
    logger.debug(f"DEBUG_HYP_1: user is None? {user is None}")
    # DEBUG_HYP_1_END

    if user is None:
        # DEBUG_HYP_1_START
        logger.error("DEBUG_HYP_1: User None, raising error")
        # DEBUG_HYP_1_END
        raise ValueError("User required")

    # DEBUG_HYP_1_START
    logger.debug(f"DEBUG_HYP_1: Accessing user.id = {user.id}")
    # DEBUG_HYP_1_END
    return user.id
```

**Java:**
```java
public class UserService {
  public String processUser(User user) {
    // DEBUG_HYP_1_START
    System.out.println("DEBUG_HYP_1: user = " + user);
    System.out.println("DEBUG_HYP_1: user null? " + (user == null));
    // DEBUG_HYP_1_END

    if (user == null) {
      // DEBUG_HYP_1_START
      System.err.println("DEBUG_HYP_1: User null, throwing exception");
      // DEBUG_HYP_1_END
      throw new IllegalArgumentException("User required");
    }

    // DEBUG_HYP_1_START
    System.out.println("DEBUG_HYP_1: Accessing user.getId() = " + user.getId());
    // DEBUG_HYP_1_END
    return user.getId();
  }
}
```

**Go:**
```go
import "fmt"

func processUser(user *User) string {
	// DEBUG_HYP_1_START
	fmt.Printf("DEBUG_HYP_1: user = %+v\n", user)
	fmt.Printf("DEBUG_HYP_1: user nil? %v\n", user == nil)
	// DEBUG_HYP_1_END

	if user == nil {
		// DEBUG_HYP_1_START
		fmt.Println("DEBUG_HYP_1: User nil, panicking")
		// DEBUG_HYP_1_END
		panic("User required")
	}

	// DEBUG_HYP_1_START
	fmt.Printf("DEBUG_HYP_1: Accessing user.ID = %s\n", user.ID)
	// DEBUG_HYP_1_END
	return user.ID
}
```

**Other Languages:**
- Ruby: `puts "DEBUG_HYP_1: ..."` or `logger.debug`
- PHP: `echo "DEBUG_HYP_1: ..."` or `error_log`
- C/C++: `printf("DEBUG_HYP_1: ...")` or `std::cout`
- Rust: `println!("DEBUG_HYP_1: ...")` or `log::debug!`
- Swift: `print("DEBUG_HYP_1: ...")`
- Kotlin: `println("DEBUG_HYP_1: ...")` or `Log.d`

### Cross-File Instrumentation

When hypothesis spans multiple files, ensure data flow traceability:

**File 1 (auth.ts):**
```typescript
// DEBUG_HYP_1_START
console.log("DEBUG_HYP_1: [auth.ts] req.user =", req.user);
console.log("DEBUG_HYP_1: [auth.ts] Passing user to next()");
// DEBUG_HYP_1_END
next();
```

**File 2 (user.ts):**
```typescript
// DEBUG_HYP_1_START
console.log("DEBUG_HYP_1: [user.ts] Received user =", user);
console.log("DEBUG_HYP_1: [user.ts] About to access user.id");
// DEBUG_HYP_1_END
const id = user.id;
```

File labels in logs enable cross-file correlation during analysis.

### Async/Promise Instrumentation

**JavaScript/TypeScript:**
```typescript
async function fetchUser(id) {
  // DEBUG_HYP_2_START
  console.log("DEBUG_HYP_2: fetchUser called with id =", id);
  console.log("DEBUG_HYP_2: Starting async fetch");
  // DEBUG_HYP_2_END

  try {
    const user = await db.query("SELECT * FROM users WHERE id = ?", [id]);
    // DEBUG_HYP_2_START
    console.log("DEBUG_HYP_2: Query succeeded, user =", user);
    // DEBUG_HYP_2_END
    return user;
  } catch (error) {
    // DEBUG_HYP_2_START
    console.error("DEBUG_HYP_2: Query failed, error =", error.message);
    // DEBUG_HYP_2_END
    throw error;
  }
}
```

**Python:**
```python
async def fetch_user(user_id):
    # DEBUG_HYP_2_START
    logger.debug(f"DEBUG_HYP_2: fetch_user called with id = {user_id}")
    # DEBUG_HYP_2_END

    try:
        user = await db.query("SELECT * FROM users WHERE id = ?", [user_id])
        # DEBUG_HYP_2_START
        logger.debug(f"DEBUG_HYP_2: Query succeeded, user = {user}")
        # DEBUG_HYP_2_END
        return user
    except Exception as e:
        # DEBUG_HYP_2_START
        logger.error(f"DEBUG_HYP_2: Query failed, error = {str(e)}")
        # DEBUG_HYP_2_END
        raise
```

### Loop/Iteration Instrumentation

Log first few iterations to avoid log spam:

**JavaScript:**
```javascript
for (let i = 0; i < items.length; i++) {
  // DEBUG_HYP_3_START
  if (i < 3) console.log(`DEBUG_HYP_3: Processing item ${i} =`, items[i]);
  // DEBUG_HYP_3_END
  processItem(items[i]);
}
// DEBUG_HYP_3_START
console.log("DEBUG_HYP_3: Loop complete, processed", items.length, "items");
// DEBUG_HYP_3_END
```

### Conditional Branch Instrumentation

Log which branch taken:

**Python:**
```python
if user.role == "admin":
    # DEBUG_HYP_4_START
    logger.debug("DEBUG_HYP_4: Admin branch taken")
    # DEBUG_HYP_4_END
    grant_admin_access()
else:
    # DEBUG_HYP_4_START
    logger.debug("DEBUG_HYP_4: Non-admin branch taken, role =", user.role)
    # DEBUG_HYP_4_END
    grant_user_access()
```

### Instrumentation Commit

After adding instrumentation:
1. Review all files (ensure markers present, syntax valid)
2. Commit: `git commit -m "debug: Add instrumentation for HYP_${id}"`
3. Tag commit: `git tag debug-session-${sessionId}-instrumented`
4. Update session: `status: "instrumented"`

---

## Issue Reproduction Workflow

Execute tests/reproduce issue to collect logs.

### Step 1: Determine Reproduction Type

**Automated:** Test file exists or can be generated
- Unit tests: existing test suite
- Integration tests: e2e test framework
- Generated tests: create minimal repro script

**Manual:** Interactive steps required
- UI interactions
- Manual file uploads
- External service dependencies
- Hardware-specific issues

### Step 2: Automated Reproduction

**Prerequisites check:**
- Test framework available? (package.json scripts, pytest.ini, JUnit)
- Test command known? (npm test, pytest, gradle test)
- Isolation possible? (run single test file)

**Generate test if needed:**

**JavaScript/TypeScript (Jest/Mocha):**
```javascript
// test/debug-repro-HYP_1.test.ts
describe('Debug HYP_1: User null handling', () => {
  it('reproduces user null error', async () => {
    const controller = new UserController();
    const req = { user: null }; // Trigger issue

    await expect(async () => {
      await controller.create(req);
    }).rejects.toThrow();
  });
});
```

**Python (pytest):**
```python
# test_debug_repro_HYP_1.py
def test_user_none_handling():
    """Debug HYP_1: Reproduce user None error"""
    controller = UserController()
    req = type('obj', (object,), {'user': None})()

    with pytest.raises(ValueError):
        controller.create(req)
```

**Run test:**
```bash
# Capture all output
npm test -- test/debug-repro-HYP_1.test.ts 2>&1 | tee .claude/debug-sessions/${sessionId}-logs.txt
```

**Check for flaky handling:**
If `isFlaky: true`, run N times (default 10):
```bash
for i in {1..10}; do
  echo "=== Run $i ===" >> .claude/debug-sessions/${sessionId}-logs.txt
  npm test -- test/debug-repro-HYP_1.test.ts 2>&1 | tee -a .claude/debug-sessions/${sessionId}-logs.txt
done
```

Count failures: if >0 failures detected → issue reproduced

### Step 3: Manual Reproduction

Generate step-by-step script:

**Manual Test Script:**
```markdown
# Manual Test Script - HYP_1

## Prerequisites
- [ ] Application running on localhost:3000
- [ ] Database seeded with test data
- [ ] Browser: Chrome/Firefox

## Steps
1. Open http://localhost:3000/upload
2. Click "Choose File" button
3. Select file: test-data/large-file.bin (500MB)
4. Click "Upload" button
5. Wait 5 seconds
6. Observe result

## Expected Logs
Check console/terminal for lines starting with:
- DEBUG_HYP_1: [auth.ts] req.user
- DEBUG_HYP_1: [user.ts] Received user

## Capture Output
Copy all console output to: .claude/debug-sessions/${sessionId}-logs.txt
```

Prompt user: **Run manual test, paste logs when complete**

Wait for user input → parse logs

### Step 4: Log Collection

**Automated:** Logs written to `.claude/debug-sessions/${sessionId}-logs.txt`

**Manual:** User pastes logs → write to same file

**Append to session:**
```json
{
  "logsCollected": [
    {
      "hypothesisId": "HYP_1",
      "timestamp": "ISO8601",
      "logFile": ".claude/debug-sessions/sess_123-logs.txt",
      "reproducedSuccessfully": true,
      "flakyTestRuns": 10,
      "flakyTestFailures": 3
    }
  ]
}
```

Proceed to log analysis

---

## Flaky Test Handling

Handle intermittent issues with multiple runs + statistics.

### Detection

Issue marked `isFlaky: true` if user description contains flaky keywords (see Intake Phase)

### Verification Strategy

**For flaky issues:**
- Run test N times (default: 10, configurable)
- Track: pass count, fail count, failure patterns
- Issue considered "reproduced" if ≥1 failure occurs
- Issue considered "fixed" if all N runs pass

**Non-flaky issues:**
- Run test once
- Pass/fail binary

### Instrumentation for Flaky Issues

Add timing + state logging:
```javascript
// DEBUG_HYP_5_START
console.log("DEBUG_HYP_5: Timestamp =", Date.now());
console.log("DEBUG_HYP_5: Async operation state =", operationState);
console.log("DEBUG_HYP_5: Event loop queue length =", process._getActiveHandles().length);
// DEBUG_HYP_5_END
```

Look for timing patterns in failed runs vs passed runs

### Analysis for Flaky Issues

Compare logs:
- Failed runs: extract DEBUG_HYP_N lines → identify commonalities
- Passed runs: extract DEBUG_HYP_N lines → identify differences
- Hypothesis: timing values different? State different? Event order different?

Example:
```
Failed run 3: DEBUG_HYP_5: Async operation state = pending
Failed run 7: DEBUG_HYP_5: Async operation state = pending
Passed runs 1,2,4,5,6,8,9,10: DEBUG_HYP_5: Async operation state = resolved

CONCLUSION: Issue occurs when operation still pending → missing await?
```

---

## Log Analysis Workflow

Parse logs, confirm/reject hypotheses, generate new ones if needed.

### Step 1: Extract Hypothesis Logs

For each hypothesis ID:
1. Read log file: `.claude/debug-sessions/${sessionId}-logs.txt`
2. Filter lines: grep `DEBUG_HYP_${id}:`
3. Parse structure:
   ```
   DEBUG_HYP_1: [auth.ts] req.user = null
   DEBUG_HYP_1: [auth.ts] Passing user to next()
   DEBUG_HYP_1: [user.ts] Received user = null
   DEBUG_HYP_1: [user.ts] About to access user.id
   [Error] TypeError: Cannot read 'id' of null
   ```

### Step 2: Cross-File Correlation

For multi-file hypotheses:
1. Build execution timeline from file labels: `[filename]`
2. Trace variable values across files:
   - auth.ts: `req.user = null`
   - user.ts: `user = null`
3. Identify data flow: null value propagated from auth → user

### Step 3: Hypothesis Evaluation

For each hypothesis, determine status:

**CONFIRMED:** Logs prove hypothesis correct
- Example: "DEBUG_HYP_1: user = null" appears before crash
- Criteria: logged value matches error condition

**REJECTED:** Logs prove hypothesis incorrect
- Example: "DEBUG_HYP_2: user = {id: 123}" (user NOT null)
- Criteria: logged value contradicts hypothesis

**INCONCLUSIVE:** Logs don't provide enough info
- Example: "DEBUG_HYP_3: Query started" but no result logged
- Criteria: instrumentation didn't capture key moment

Update session:
```json
{
  "hypotheses": [
    {
      "id": "HYP_1",
      "status": "confirmed",
      "evidence": ["req.user = null at auth.ts:30", "crash at user.ts:45"]
    },
    {
      "id": "HYP_2",
      "status": "rejected",
      "evidence": ["user.id = 123 (not null)"]
    },
    {
      "id": "HYP_3",
      "status": "inconclusive",
      "evidence": ["No query result logged"]
    }
  ]
}
```

### Step 4: Decision Point

**If confirmed hypothesis:**
→ Proceed to Web Research phase

**If all rejected/inconclusive:**
→ Generate new hypotheses from log insights

**New hypothesis generation from logs:**
- Look for unexpected values in logs
- Identify execution paths taken
- Check timing patterns
- Review error messages not in original hypothesis

Example:
```
Original HYP_1: "User not authenticated"
Logs show: "DEBUG_HYP_1: user.authenticated = true"
New insight: "User IS authenticated, but user.role missing"
New HYP_4: "User role not set during authentication"
```

Generate 2-3 new hypotheses → return to Instrumentation phase

### Step 5: Max Iteration Check

Increment `iterationCount`

If `iterationCount >= maxIterations` (default 5):
→ Proceed to Rollback and Failure Handling

Else:
→ Continue debug cycle

---

## Web Research Workflow

Research confirmed issue for best practices + solutions.

### Step 1: Formulate Search Query

From confirmed hypothesis, extract:
- Error pattern: "Cannot read property of null"
- Language/framework: "JavaScript Express"
- Context: "middleware user authentication"

**Query construction:**
```
[Language] [Framework] [Error Pattern] [Context] best practices
[Language] [Error Pattern] how to fix
[Framework] [Context] common mistakes
```

Examples:
- "JavaScript Express null user authentication middleware best practices"
- "TypeScript cannot read property of null how to fix"
- "Express middleware user object missing common mistakes"

### Step 2: Search Prioritization

Search sources in order:
1. **Official docs** (language/framework official sites)
2. **GitHub issues** (framework repo, similar projects)
3. **Stack Overflow** (recent, high-vote answers)
4. **Recent blogs** (prefer <2 years old)
5. **API references** (MDN, DevDocs)

Skip: outdated tutorials (>5 years), low-quality blogs, forums

### Step 3: Execute Searches

Use WebSearch tool (if available) or guide user:

**Automated search:**
```
WebSearch: "JavaScript Express middleware null user handling best practices"
→ Filter results by date (recent)
→ Extract: official docs links, Stack Overflow top answers, GitHub issues

WebFetch: [top 3 results]
→ Extract: code examples, explanations, security considerations
```

**Manual search guidance:**
```
Please search:
1. "Express.js authentication middleware best practices"
2. "JavaScript null checking strategies 2025"
3. "[Framework] user object validation"

Paste relevant findings/code snippets
```

### Step 4: Findings Synthesis

Extract from research:
- **Recommended approach:** What official docs suggest
- **Common mistakes:** What mistakes lead to this issue
- **Security implications:** Auth/validation concerns
- **Code patterns:** Idiomatic solutions in this language/framework
- **Deprecated approaches:** What NOT to do

Example findings:
```markdown
## Research Findings for HYP_1

### Recommended Approach (Express.js docs)
- Middleware should always validate req.user existence before next()
- Use optional chaining: req.user?.id
- Throw 401 error if auth required but user missing

### Common Mistakes (Stack Overflow)
- Assuming req.user always populated by auth middleware
- Not handling auth middleware failure gracefully
- Accessing user.id without null check

### Security Implications
- Missing auth checks → unauthorized access
- Always validate authentication at route level
- Use type guards in TypeScript

### Code Pattern (Express + TypeScript)
```typescript
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}
```

### Deprecated
- Don't use `req.user || {}` (masks auth failures)
```

### Step 5: Cite Sources

Track sources for summary:
```json
{
  "research": {
    "hypothesisId": "HYP_1",
    "sources": [
      {"url": "https://expressjs.com/en/guide/using-middleware.html", "type": "official_docs"},
      {"url": "https://stackoverflow.com/questions/12345", "type": "stackoverflow", "votes": 234},
      {"url": "https://github.com/expressjs/express/issues/678", "type": "github_issue"}
    ],
    "recommendedApproach": "...",
    "securityConsiderations": "..."
  }
}
```

Proceed to Fix Application phase

---

## Fix Application Workflow

Apply research-informed complete fix.

### Step 1: Fix Design

From research findings, design fix:
- **What to change:** Specific lines/functions
- **How to change:** Code transformation
- **Completeness:** Must handle all edge cases identified in research
- **Security:** Apply security best practices from research

**BAD (partial fix):**
```typescript
// Just add null check
if (user) {
  return user.id;
}
```

**GOOD (complete fix):**
```typescript
function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Validate user exists (from research: Express best practice)
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  // Validate user has required fields (from research: security implication)
  if (!req.user.id) {
    return res.status(500).json({
      error: 'Invalid user object',
      code: 'INVALID_USER'
    });
  }

  next();
}

// Apply middleware to protected routes
app.post('/api/users', requireAuth, userController.create);
```

### Step 2: Multi-File Fixes

If hypothesis spans multiple files, fix must be coordinated:

**File 1 (auth.ts):** Ensure user always set or throw early
**File 2 (user.ts):** Add defensive null checks + error handling

Test plan: verify data flow across both files

### Step 3: Test Coverage

If fix modifies critical logic, add/update tests:

**Add test for fixed behavior:**
```typescript
// test/auth-fix.test.ts
describe('Authentication fix', () => {
  it('returns 401 when user not authenticated', async () => {
    const req = { user: null };
    const res = mockResponse();

    requireAuth(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  });

  it('calls next() when user authenticated', async () => {
    const req = { user: { id: 123, role: 'user' } };
    const res = mockResponse();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
```

### Step 4: Apply Fix

1. Make code changes across all files
2. Run linter/formatter if configured
3. Commit fix: `git commit -m "fix: [HYP_${id}] ${description}"`
4. Tag: `git tag debug-session-${sessionId}-fix-attempt-${fixCount}`

Update session:
```json
{
  "fixesAttempted": [
    {
      "fixId": "FIX_1",
      "hypothesisId": "HYP_1",
      "description": "Add authentication validation middleware",
      "filesModified": ["src/middleware/auth.ts", "src/app.ts"],
      "commit": "abc123",
      "timestamp": "ISO8601"
    }
  ]
}
```

Proceed to Fix Verification phase

---

## Fix Verification Workflow

Verify fix resolves issue, rollback if failed.

### Step 1: Re-run Reproduction

**Same test as Issue Reproduction phase:**
- Automated: Run test command
- Manual: Execute manual test script

**For flaky issues:**
- Run N times (default 10)
- ALL runs must pass (0 failures)

**For non-flaky issues:**
- Single run must pass

### Step 2: Capture Verification Logs

Run test, capture output:
```bash
npm test -- test/debug-repro-HYP_1.test.ts 2>&1 | tee .claude/debug-sessions/${sessionId}-verification.txt
```

### Step 3: Compare Logs

**Original issue logs:** `.claude/debug-sessions/${sessionId}-logs.txt`
**Verification logs:** `.claude/debug-sessions/${sessionId}-verification.txt`

Look for:
- Original error message absent in verification logs?
- Test passes instead of fails?
- Instrumentation logs show corrected behavior?

Example comparison:
```
ORIGINAL:
DEBUG_HYP_1: [user.ts] user = null
[Error] Cannot read 'id' of null

VERIFICATION:
DEBUG_HYP_1: [auth.ts] User not authenticated, returning 401
[Test] Assertion passed: status = 401
```

### Step 4: Verification Decision

**SUCCESS:** Test passes, error resolved
→ Update session: `status: "fixed"`
→ Proceed to Instrumentation Cleanup phase

**FAILURE:** Test still fails, error persists
→ Rollback fix (keep instrumentation)
→ Increment `iterationCount`
→ Check: `iterationCount >= maxIterations`?
  - NO: Return to Hypothesis Generation with failure context
  - YES: Proceed to Rollback and Failure Handling phase

### Step 5: Rollback on Failure

**Rollback strategy:**
1. Identify fix commit: `git log --oneline | grep "debug-session-${sessionId}-fix"`
2. Revert fix: `git revert ${fixCommit} --no-edit`
3. Verify instrumentation intact: `grep -r "DEBUG_HYP" src/`
4. Update session: mark fix as failed

**Session update:**
```json
{
  "fixesAttempted": [
    {
      "fixId": "FIX_1",
      "status": "failed",
      "failureReason": "Test still fails with same error",
      "rolledBack": true,
      "rollbackCommit": "def456"
    }
  ]
}
```

**Capture failure context:**
- Why fix didn't work
- What logs showed
- New insights from verification

Use this context for next hypothesis generation iteration

---

## Instrumentation Cleanup Phase

Remove all debug logging after successful fix.

### Step 1: Search for Markers

Find all instrumentation:
```bash
grep -rn "DEBUG_HYP" src/ --include="*.ts" --include="*.js" --include="*.py" --include="*.java" --include="*.go"
```

List all files with markers:
```
src/middleware/auth.ts:30: // DEBUG_HYP_1_START
src/middleware/auth.ts:33: // DEBUG_HYP_1_END
src/controllers/user.ts:45: // DEBUG_HYP_1_START
src/controllers/user.ts:50: // DEBUG_HYP_1_END
```

### Step 2: Remove Instrumentation

For each file:
1. Read file
2. Identify all `DEBUG_HYP_*_START` → `DEBUG_HYP_*_END` blocks
3. Remove entire blocks (marker comments + log statements)
4. Preserve original code structure (indentation, blank lines)

**Example cleanup:**

**BEFORE:**
```typescript
function processUser(user) {
  // DEBUG_HYP_1_START
  console.log("DEBUG_HYP_1: user =", user);
  // DEBUG_HYP_1_END

  if (!user) {
    throw new Error("User required");
  }

  return user.id;
}
```

**AFTER:**
```typescript
function processUser(user) {
  if (!user) {
    throw new Error("User required");
  }

  return user.id;
}
```

### Step 3: Orphaned Import Cleanup

Check for unused imports added for instrumentation:
- Unused `import logging` (Python)
- Unused `import { logger }` (TypeScript)
- Unused `import java.util.logging.*` (Java)

Remove if no other usage in file.

### Step 4: Verification

After cleanup:
1. Run linter: `npm run lint` or `ruff check` or `gradle check`
2. Run tests: Verify fix still works WITHOUT instrumentation
3. Visual inspection: `git diff` to ensure only debug code removed

### Step 5: Cleanup Commit

Commit cleanup:
```bash
git add .
git commit -m "debug: Remove instrumentation for HYP_${id} after successful fix"
```

Update session: `status: "cleanup_complete"`

Proceed to Success Summary phase

---

## Success Summary Generation

Generate comprehensive learning summary with code, sources, insights.

### Template

```markdown
# Debug Summary - ${issueDescription}

## Root Cause
[1-2 sentence explanation of what caused the issue]

Example: "The Express authentication middleware did not validate req.user existence before calling next(), causing downstream controllers to access null user objects."

## Research Findings
[Key insights from web research]

- Official docs recommendation: [summary]
- Common mistake identified: [summary]
- Security implication: [summary]
- Best practice applied: [summary]

**Sources:**
- [Official Docs] ${url}
- [Stack Overflow] ${url}
- [GitHub Issue] ${url}

## Fix Applied
[Describe the complete fix with code snippets]

### Changes Made:
**File: src/middleware/auth.ts**
```typescript
// BEFORE:
function authenticate(req, res, next) {
  // Missing validation
  next();
}

// AFTER:
function authenticate(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (!req.user.id) {
    return res.status(500).json({ error: 'Invalid user object' });
  }
  next();
}
```

**File: src/app.ts**
```typescript
// AFTER: Applied middleware to protected routes
app.post('/api/users', authenticate, userController.create);
```

## Hypotheses Tested
1. **HYP_1** (CONFIRMED): Null user passed to UserController.create
   - Evidence: Logs showed req.user = null at middleware, crash at controller
   - Led to fix: Added user validation in middleware

2. **HYP_2** (REJECTED): Missing error handling in async user fetch
   - Evidence: Logs showed async operations completed successfully
   - Ruled out: Not async-related issue

## Verification Results
- Test: test/debug-repro-HYP_1.test.ts
- Initial state: FAILED (TypeError: Cannot read 'id' of null)
- After fix: PASSED (Returns 401 as expected)
- Flaky issue: No (consistent pass after fix)

## Key Learnings
- Always validate authentication state before calling next() in middleware
- Type guards in TypeScript don't prevent runtime null access
- Return early with error response instead of throwing in middleware
- Security: Unauthenticated requests must be rejected at route entry point
```

### Generate and Display

1. Populate template with session data
2. Display to user
3. Save to: `.claude/debug-sessions/${sessionId}-summary.md`
4. Ask: **Debug complete. Keep summary for reference?**
   - Yes: Commit summary to repo
   - No: Delete summary file

---

## Rollback and Failure Handling

Handle max iterations reached gracefully with comprehensive context for manual investigation.

### Trigger Conditions

1. `iterationCount >= maxIterations` (default 5)
2. Unrecoverable error (e.g., cannot instrument files, tests fail to run)
3. User requests abort

### Step 1: Rollback All Changes

**Identify all debug commits:**
```bash
git log --oneline | grep "debug-session-${sessionId}"
```

**Rollback strategy:**
- Option 1: Revert all commits: `git revert ${commit1} ${commit2} ...`
- Option 2: Hard reset: `git reset --hard ${initialCommit}`

Choose Option 2 if many commits, Option 1 if few (preserves history)

**Verify rollback:**
```bash
git diff ${initialCommit} HEAD
# Should show no differences
```

### Step 2: Archive Session

Move session file:
```bash
mv .claude/debug-sessions/${sessionId}.json .claude/debug-sessions/archived/${sessionId}.json
```

### Step 3: Generate Failure Report

```markdown
# Debug Failure Report - ${issueDescription}

## What Was Being Debugged
[Original issue description]

**Reproduction Steps:**
${reproductionSteps}

**Expected:** ${expectedBehavior}
**Actual:** ${actualBehavior}

## Root Cause Analysis Attempts
[Summary of hypotheses tested]

${hypotheses.map(h => `
### ${h.id}: ${h.description}
- Status: ${h.status}
- Evidence: ${h.evidence}
- Files: ${h.files}
`)}

## Fixes Attempted
${fixesAttempted.map(f => `
### ${f.fixId}: ${f.description}
- Files modified: ${f.filesModified}
- Result: ${f.status}
- Failure reason: ${f.failureReason}
`)}

## Research Conducted
${research.sources.map(s => `- [${s.type}] ${s.url}`)}

Key findings: ${research.recommendedApproach}

## Recommended Next Steps
1. **Manual investigation required:** Automated debugging reached max iterations without confirming root cause
2. **Review logs:** Check .claude/debug-sessions/archived/${sessionId}.json for all collected data
3. **Consider:**
   - ${suggestedNextSteps[0]}
   - ${suggestedNextSteps[1]}
   - ${suggestedNextSteps[2]}
4. **Expertise needed:** ${recommendedExpertise} (e.g., "Database administrator", "Authentication expert")

## Files Modified During Attempts
${allModifiedFiles}

## Session Artifacts
All changes rolled back. Artifacts preserved:
- Session data: .claude/debug-sessions/archived/${sessionId}.json
- Original logs: .claude/debug-sessions/archived/${sessionId}-logs.txt
- This report: .claude/debug-sessions/archived/${sessionId}-failure-report.md
```

### Step 4: Display Failure Report

Show report to user, prompt:
> **Debug incomplete after ${iterationCount} iterations. All changes rolled back.**
>
> Failure report saved to: `.claude/debug-sessions/archived/${sessionId}-failure-report.md`
>
> **Next steps:**
> 1. Review failure report for insights
> 2. Consider manual investigation (see recommendations)
> 3. Re-run /debug with refined reproduction steps if new info discovered

---

## The Job

Complete debugging workflow:

1. **Intake** - Gather reproduction info
2. **Session Persistence** - Initialize/maintain debug session state
3. **Hypothesis Generation** - Identify ranked potential root causes (max 5 iterations)
4. **Logging Review** - Assess existing logging infrastructure
5. **Instrumentation** - Add language-appropriate debug logging with markers
6. **Reproduction** - Execute automated tests or guide manual reproduction
7. **Flaky Handling** - Handle intermittent issues with multiple test runs
8. **Log Analysis** - Parse logs, confirm/reject hypotheses, iterate if needed
9. **Web Research** - Research confirmed issues for best practices
10. **Fix Application** - Apply research-informed complete fixes
11. **Fix Verification** - Verify fix resolves issue or rollback
12. **Instrumentation Cleanup** - Remove all debug logging after successful fix
13. **Success Summary** - Generate learning summary with code snippets and sources
14. **Rollback Handling** - Handle max iterations gracefully with comprehensive context

---

## Debug Cycle Overview

**Phase 1: Issue Intake** - Gather reproduction steps, expected/actual behavior, error messages, identify flaky

**Phase 2: Session Setup** - Initialize debug session, capture git state, store metadata

**Phase 3: Hypothesis Generation (max 5 iterations)** - Analyze error patterns, generate 3-5 ranked hypotheses with file locations + line ranges, track affected files

**Phase 4: Instrumentation** - Review existing logging, add language-appropriate debug logs, mark with `// DEBUG_HYP_N_START/END`, preserve code style

**Phase 5: Reproduction & Log Collection** - Run tests (automated) or guide manual, capture output, handle flaky (run N times)

**Phase 6: Log Analysis & Iteration** - Parse markers, extract values/flow/timing, mark hypotheses (confirmed/rejected/inconclusive), generate new hypotheses if needed, loop to Phase 4 or continue

**Phase 7: Research & Fix Development** - Search for confirmed pattern (official docs > GitHub > Stack Overflow > blogs), identify best practices/security/deprecated solutions, generate complete fixes

**Phase 8: Fix Verification** - Re-run tests, compare logs, if resolved → cleanup, if failed → rollback fix (keep instrumentation) and return to Phase 3

**Phase 9: Cleanup** - Remove all marker comments + log statements, verify no orphaned imports, run linter/formatter

**Phase 10: Summary & Completion** - Generate success summary with root cause, research findings, fix, verification results, code snippets, sources, tested hypotheses

---

## Issue Types Supported

- **Runtime Errors**: Null refs, type errors, assertion failures, exceptions
- **Logic Bugs**: Incorrect calculations, off-by-one, wrong conditionals, state issues
- **Cross-Service**: API integration failures, distributed system issues, async coordination
- **Intermittent/Flaky**: Race conditions, timing-dependent, environment-sensitive
- **Performance**: Slowdowns, timeouts, resource leaks, inefficient algorithms
- **Integration**: Component interaction, data flow, dependency issues

---

## Language Support

Language-agnostic, adapts instrumentation:
- **JS/TS**: console.log/error, structured logging libs
- **Python**: logging module, print fallback
- **Java/Kotlin**: System.out, Logger frameworks
- **Go**: fmt.Println, log package
- **C/C++**: printf, std::cout, logging frameworks
- **Ruby**: puts, logger libs
- **PHP**: echo, error_log, var_dump
- **Others**: Adapts to conventions + available mechanisms

---

## Skill Scope

**Does:**
- Diagnose root causes via systematic investigation
- Track issues across multiple files + dependencies
- Generate complete, research-informed fixes
- Verify fixes resolve issue
- Handle flaky/intermittent issues
- Provide learning context + sources

**Does NOT:**
- Refactor entire codebases
- Implement new features
- Rewrite large code sections without evidence-based justification
- Make changes outside identified issue scope
- Deploy fixes to production

---

## Key Principles

1. **Hypothesis-Driven**: Every investigation driven by testable hypotheses
2. **Evidence-Based**: All conclusions supported by log evidence + testing
3. **Language-Adaptive**: Uses language-appropriate idioms + logging patterns
4. **Non-Destructive**: Instrumentation reversible, rollback always available
5. **Traceable**: All changes marked with unique IDs for audit trail
6. **Complete Fixes**: Never partial or symptomatic fixes
7. **Informed Fixes**: Leverages current best practices + research before implementation
8. **Verifiable**: All fixes verified via reproduction + testing
9. **Multi-Iteration**: Allows up to 5 debug cycles before graceful failure
10. **Stateful**: Maintains session state for resumption + recovery

---

## Session Persistence

Persistent session state at `.claude/debug-sessions/[session-id].json`:

```json
{
  "sessionId": "sess_123abc",
  "startTime": "ISO8601",
  "initialCommit": "git_sha",
  "issueDescription": "...",
  "reproductionSteps": [],
  "expectedBehavior": "...",
  "actualBehavior": "...",
  "errorMessage": "...",
  "isFlaky": false,
  "environment": {},
  "filesInvolved": [],
  "hypotheses": [],
  "logsCollected": [],
  "fixesAttempted": [],
  "iterationCount": 0,
  "maxIterations": 5,
  "status": "active"
}
```

Sessions auto-deleted after successful completion or rollback.

---

## Flaky Test Handling

Flaky issues detected via keywords → run test N times (default 10)
- Issue "reproduced" if ≥1 failure
- Issue "fixed" if all N runs pass
- Compare failed vs passed run logs for timing/state patterns

---

## Max Iterations Handling

If `iterationCount >= 5`:
1. Rollback all changes to `initialCommit`
2. Archive session to `.claude/debug-sessions/archived/`
3. Generate failure report with:
   - All hypotheses tested
   - All fixes attempted + why failed
   - Research conducted
   - Recommended next steps for manual investigation
4. Preserve artifacts (session JSON, logs, report)

---

## Instrumentation Markers

All instrumentation wrapped in markers:
```
// DEBUG_HYP_${id}_START
console.log("DEBUG_HYP_${id}: var =", value);
// DEBUG_HYP_${id}_END
```

Enables:
- Easy search/removal during cleanup
- Log filtering during analysis
- Audit trail for changes
- Rollback verification (ensure markers preserved after fix rollback)

---

## Exit Conditions

**Success:**
1. Hypothesis confirmed
2. Fix applied
3. Fix verification passed
4. Instrumentation cleaned
5. Success summary generated

**Failure:**
1. Max iterations reached (5)
2. Rollback all changes
3. Failure report generated
4. Session archived

**Abort:**
1. User requests abort
2. Rollback all changes
3. Session deleted
