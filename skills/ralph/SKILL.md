---
name: ralph
description: "Convert PRDs to prd.json format for the Ralph autonomous agent system. Use when you have an existing PRD and need to convert it to Ralph's JSON format. Triggers on: convert this prd, turn this into ralph format, create prd.json from this, ralph json."
---

# Ralph PRD Converter

Converts existing PRDs to the prd.json format that Ralph uses for autonomous execution.

---

## The Job

Take a PRD (markdown file or text) and convert it to `prd.json` in your ralph directory.

---

## Output Format

```json
{
  "project": "[Project Name]",
  "branchName": "ralph/[feature-name-kebab-case]",
  "description": "[Feature description from PRD title/intro]",
  "jiraEpicKey": null,
  "userStories": [
    {
      "id": "US-001",
      "title": "[Story title]",
      "description": "As a [user], I want [feature] so that [benefit]",
      "acceptanceCriteria": [
        "Criterion 1",
        "Criterion 2",
        "Typecheck passes"
      ],
      "priority": 1,
      "passes": false,
      "notes": "",
      "jiraKey": null,
      "reasoningLevel": "MID"
    }
  ]
}
```

---

## Story Size: The Number One Rule

**Each story must be completable in ONE Ralph iteration (one context window).**

Ralph spawns a fresh Amp instance per iteration with no memory of previous work. If a story is too big, the LLM runs out of context before finishing and produces broken code.

### Right-sized stories:
- Add a database column and migration
- Add a UI component to an existing page
- Update a server action with new logic
- Add a filter dropdown to a list

### Too big (split these):
- "Build the entire dashboard" - Split into: schema, queries, UI components, filters
- "Add authentication" - Split into: schema, middleware, login UI, session handling
- "Refactor the API" - Split into one story per endpoint or pattern

**Rule of thumb:** If you cannot describe the change in 2-3 sentences, it is too big.

---

## Story Ordering: Dependencies First

Stories execute in priority order. Earlier stories must not depend on later ones.

**Correct order:**
1. Schema/database changes (migrations)
2. Server actions / backend logic
3. UI components that use the backend
4. Dashboard/summary views that aggregate data

**Wrong order:**
1. UI component (depends on schema that does not exist yet)
2. Schema change

---

## Reasoning Level: Choosing the Right Model

**Each story MUST specify a reasoning level to optimize cost and performance.**

Ralph maps reasoning levels to Claude models:
- **HIGH** → Claude Opus 4.5 (most capable, highest cost, slowest)
- **MID** → Claude Sonnet 4.5 (balanced, default)
- **LOW** → Claude Haiku 4.0 (fast, lowest cost, best for simple tasks)

### When to use HIGH reasoning:
- Complex algorithms or data structures
- Architectural decisions requiring deep analysis
- Refactoring with many dependencies
- Features requiring sophisticated logic
- Integration tests covering multiple systems

### When to use MID reasoning (default):
- Standard feature implementation
- Typical CRUD operations
- UI components with moderate complexity
- Most database migrations
- Standard unit tests

### When to use LOW reasoning:
- Simple schema changes (add a column)
- Trivial UI updates (change text, add a button)
- Configuration file updates
- Documentation updates
- Simple test additions

### Cost-Benefit Trade-off:

Opus (HIGH) is ~15x more expensive than Haiku (LOW) and ~3x more expensive than Sonnet (MID). Use HIGH sparingly for genuinely complex work. When in doubt, use MID.

**Rule of thumb:** If you can describe the implementation steps clearly in acceptance criteria, use LOW or MID. If the solution requires exploration or design decisions, use HIGH.

---

## Acceptance Criteria: Must Be Verifiable

Each criterion must be something Ralph can CHECK, not something vague.

### Good criteria (verifiable):
- "Add `status` column to tasks table with default 'pending'"
- "Filter dropdown has options: All, Active, Completed"
- "Clicking delete shows confirmation dialog"
- "Typecheck passes"
- "Unit tests cover acceptance criteria"
- "Tests pass"

### Bad criteria (vague):
- "Works correctly"
- "User can do X easily"
- "Good UX"
- "Handles edge cases"

### Required criteria for EVERY story (in order):

1. **Typecheck passes** - Always include as final criterion
```
"Typecheck passes"
```

2. **Unit tests for acceptance criteria** - Add tests that verify the acceptance criteria
```
"Unit tests written for: [list specific testable criteria]"
"Tests pass"
```

3. **For UI stories** - Visual verification required
```
"Verify in browser using Selenium MCP"
```

### Unit Test Requirements

Each story MUST include unit tests that verify its acceptance criteria. Tests should:
- Cover the specific functionality described in acceptance criteria
- Be placed in the appropriate test directory following project conventions
- Use the project's existing test framework
- Focus on the specific story's changes, not unrelated code

**Example acceptance criteria with tests:**
```json
"acceptanceCriteria": [
  "Add status column: 'pending' | 'in_progress' | 'done' (default 'pending')",
  "Unit tests verify: status column exists, defaults to 'pending', accepts valid values",
  "Typecheck passes",
  "Tests pass"
]
```

Frontend stories are NOT complete until visually verified. Ralph will use the Selenium MCP tools to navigate to the page, interact with the UI, and confirm changes work.

---

## Conversion Rules

1. **Each user story becomes one JSON entry**
2. **IDs**: Sequential (US-001, US-002, etc.)
3. **Priority**: Based on dependency order, then document order
4. **All stories**: `passes: false` and empty `notes`
5. **branchName**: Derive from feature name, kebab-case, prefixed with `ralph/`
6. **Always add**: "Typecheck passes" to every story's acceptance criteria
7. **Always add**: Unit test criteria to every story with testable logic
8. **Always add**: A final integration tests story (see below)
9. **Set reasoning level**: Assign appropriate reasoning level (HIGH/MID/LOW) to each story based on complexity

---

## Splitting Large PRDs

If a PRD has big features, split them:

**Original:**
> "Add user notification system"

**Split into:**
1. US-001: Add notifications table to database
2. US-002: Create notification service for sending notifications
3. US-003: Add notification bell icon to header
4. US-004: Create notification dropdown panel
5. US-005: Add mark-as-read functionality
6. US-006: Add notification preferences page

Each is one focused change that can be completed and verified independently.

---

## Final Integration Tests Story (Required)

**EVERY prd.json MUST end with a final integration tests story.** This story:
- Has the LOWEST priority (runs last, after all feature stories pass)
- Creates integration/functional tests that verify ALL product requirements
- Ensures the complete feature works end-to-end

### Why This Matters

Individual story tests verify isolated pieces. The integration tests story:
1. Verifies all pieces work TOGETHER
2. Tests the complete user flows from the original PRD
3. Catches integration bugs that unit tests miss
4. Provides confidence the product requirements are fully met

### Integration Tests Story Template

```json
{
  "id": "US-XXX",
  "title": "Integration tests for [Feature Name]",
  "description": "As a developer, I want integration tests that verify all product requirements are met end-to-end.",
  "acceptanceCriteria": [
    "Integration tests cover: [list all major user flows from PRD]",
    "Tests verify complete user journey from [start] to [end]",
    "Tests cover error scenarios and edge cases",
    "All existing unit tests still pass",
    "Integration tests pass",
    "Typecheck passes"
  ],
  "priority": [LAST - highest number],
  "passes": false,
  "notes": "This story runs AFTER all feature stories complete. It validates the complete implementation."
}
```

### What Integration Tests Should Cover

Based on the original PRD requirements, the integration tests should:

1. **End-to-end user flows** - Complete paths a user would take
2. **Data persistence** - Data saves and retrieves correctly across operations
3. **Component interaction** - Different parts of the feature work together
4. **State management** - Application state remains consistent
5. **Error handling** - Graceful handling of failures

### Example Integration Tests Acceptance Criteria

For a "Task Status Feature" PRD:
```json
"acceptanceCriteria": [
  "Integration test: User can create task with status, change status, and filter by status",
  "Integration test: Status persists after page refresh",
  "Integration test: Filter returns correct tasks for each status option",
  "Integration test: Status badge updates immediately when status changes",
  "All unit tests from previous stories pass",
  "Integration tests pass",
  "Typecheck passes"
]
```

---

## Example

**Input PRD:**
```markdown
# Task Status Feature

Add ability to mark tasks with different statuses.

## Requirements
- Toggle between pending/in-progress/done on task list
- Filter list by status
- Show status badge on each task
- Persist status in database
```

**Output prd.json:**
```json
{
  "project": "TaskApp",
  "branchName": "ralph/task-status",
  "description": "Task Status Feature - Track task progress with status indicators",
  "jiraEpicKey": null,
  "userStories": [
    {
      "id": "US-001",
      "title": "Add status field to tasks table",
      "description": "As a developer, I need to store task status in the database.",
      "acceptanceCriteria": [
        "Add status column: 'pending' | 'in_progress' | 'done' (default 'pending')",
        "Generate and run migration successfully",
        "Unit tests verify: status column exists, defaults to 'pending', accepts only valid values",
        "Typecheck passes",
        "Tests pass"
      ],
      "priority": 1,
      "passes": false,
      "notes": "",
      "jiraKey": null,
      "reasoningLevel": "LOW"
    },
    {
      "id": "US-002",
      "title": "Display status badge on task cards",
      "description": "As a user, I want to see task status at a glance.",
      "acceptanceCriteria": [
        "Each task card shows colored status badge",
        "Badge colors: gray=pending, blue=in_progress, green=done",
        "Unit tests verify: StatusBadge component renders correct colors for each status",
        "Typecheck passes",
        "Tests pass",
        "Verify in browser using Selenium MCP"
      ],
      "priority": 2,
      "passes": false,
      "notes": "",
      "jiraKey": null,
      "reasoningLevel": "LOW"
    },
    {
      "id": "US-003",
      "title": "Add status toggle to task list rows",
      "description": "As a user, I want to change task status directly from the list.",
      "acceptanceCriteria": [
        "Each row has status dropdown or toggle",
        "Changing status saves immediately",
        "UI updates without page refresh",
        "Unit tests verify: status change handler calls update action, UI updates on success",
        "Typecheck passes",
        "Tests pass",
        "Verify in browser using Selenium MCP"
      ],
      "priority": 3,
      "passes": false,
      "notes": "",
      "jiraKey": null,
      "reasoningLevel": "MID"
    },
    {
      "id": "US-004",
      "title": "Filter tasks by status",
      "description": "As a user, I want to filter the list to see only certain statuses.",
      "acceptanceCriteria": [
        "Filter dropdown: All | Pending | In Progress | Done",
        "Filter persists in URL params",
        "Unit tests verify: filter logic returns correct tasks, URL params update correctly",
        "Typecheck passes",
        "Tests pass",
        "Verify in browser using Selenium MCP"
      ],
      "priority": 4,
      "passes": false,
      "notes": "",
      "jiraKey": null,
      "reasoningLevel": "MID"
    },
    {
      "id": "US-005",
      "title": "Integration tests for Task Status Feature",
      "description": "As a developer, I want integration tests that verify all product requirements are met end-to-end.",
      "acceptanceCriteria": [
        "Integration test: User can create task, change status through all states, verify badge updates",
        "Integration test: Status persists correctly after page refresh",
        "Integration test: Filter returns correct tasks for each status option",
        "Integration test: Complete flow - create task, set status, filter, verify results",
        "All unit tests from previous stories pass",
        "Integration tests pass",
        "Typecheck passes"
      ],
      "priority": 5,
      "passes": false,
      "notes": "",
      "jiraKey": null,
      "reasoningLevel": "HIGH"
    }
  ]
}
```

---

## Archiving Previous Runs

**Before writing a new prd.json, check if there is an existing one from a different feature:**

1. Read the current `prd.json` if it exists
2. Check if `branchName` differs from the new feature's branch name
3. If different AND `progress.txt` has content beyond the header:
   - Create archive folder: `archive/YYYY-MM-DD-feature-name/`
   - Copy current `prd.json` and `progress.txt` to archive
   - Reset `progress.txt` with fresh header

**The ralph.sh script handles this automatically** when you run it, but if you are manually updating prd.json between runs, archive first.

---

## Checklist Before Saving

Before writing prd.json, verify:

- [ ] **Previous run archived** (if prd.json exists with different branchName, archive it first)
- [ ] Each story is completable in one iteration (small enough)
- [ ] Stories are ordered by dependency (schema → backend → UI → integration tests)
- [ ] Every story has "Typecheck passes" as criterion
- [ ] Every story with testable logic has "Unit tests verify: [specifics]" criterion
- [ ] Every story has "Tests pass" as criterion
- [ ] UI stories have "Verify in browser using Selenium MCP" as criterion
- [ ] Acceptance criteria are verifiable (not vague)
- [ ] No story depends on a later story
- [ ] **Final integration tests story exists** with lowest priority
- [ ] Integration tests cover all major user flows from original PRD
- [ ] **Every story has appropriate reasoning level** (default MID if uncertain)
- [ ] **HIGH reasoning used sparingly** (only genuinely complex stories)
