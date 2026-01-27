---
name: cancel-jira
description: "Cancel all Jira tickets for a PRD when the PRD is cancelled or replaced. Transitions all story tickets and the epic to cancelled status with explanation. Use when abandoning a PRD or starting fresh. Triggers on: cancel jira, cancel tickets, abandon prd, cancel-jira."
---

# Cancel Jira Tickets for PRD

Cancels all Jira tickets associated with a PRD, transitioning story tickets and the epic to cancelled status with explanatory comments. Clears Jira references from prd.json after cancellation.

---

## Prerequisites

Before running this skill, ensure:

1. **Atlassian MCP server is configured** in `~/.claude/mcp_servers.json`
2. **prd.json exists** with `jiraEpicKey` and story `jiraKey` values (from previous /sync-jira)
3. **Per-project Jira config exists** at `.ralph/jira.json`

---

## The Job

1. Validate prd.json has Jira references to cancel
2. Load Jira configuration and verify MCP connection
3. Cancel all story tickets with comment
4. Cancel the epic with summary comment
5. Clear Jira references from prd.json
6. Display summary of cancelled tickets

---

## Usage

### Basic Usage (Default Reason)

```
/cancel-jira
```

Uses default cancellation reason: "PRD cancelled by user"

### With Custom Reason

```
/cancel-jira PRD replaced with new requirements
```

or

```
/cancel-jira reason="Project scope changed - starting fresh with different approach"
```

The reason is included in all ticket comments for audit trail.

---

## Step 1: Validate PRD Has Jira References

### Load prd.json

Read `./prd.json` from the current working directory.

**If file doesn't exist:**
```
Error: prd.json not found.

There is no PRD to cancel. To create a PRD:
1. Run /prd to create a requirements document
2. Run /ralph to convert to prd.json
3. Run /sync-jira to push to Jira
```

### Check for Jira References

Verify that `jiraEpicKey` exists and is not null:

```javascript
if (!prd.jiraEpicKey) {
  // No Jira references to cancel
  return "No Jira tickets found for this PRD. Nothing to cancel.";
}
```

**If no Jira references:**
```
Info: This PRD has no Jira tickets to cancel.

The prd.json does not have a jiraEpicKey, which means:
- /sync-jira was never run, OR
- Jira tickets were already cancelled

Nothing to do.
```

### Count Linked Tickets

Count how many story tickets have `jiraKey` values:

```javascript
const ticketsToCancel = prd.userStories.filter(s => s.jiraKey).length;
console.log(`Found ${ticketsToCancel} story tickets + 1 epic to cancel`);
```

---

## Step 2: Load Configuration and Verify MCP

### Load Jira Configuration

Read `.ralph/jira.json` for status mapping and site URL.

**Required fields:**
- `atlassianSiteUrl` - For building ticket links in summary
- `statusMapping` - For getting cancellation transition (see below)

### Determine Cancellation Status

The cancellation transition name depends on your Jira workflow. Common options:

1. **Check `statusMapping.cancel`** in jira.json (if configured)
2. **Try common transition names:** "Cancel", "Cancelled", "Won't Do", "Done"
3. **Use `jira-get-transitions` MCP tool** to find available transitions

**Add to jira.json.example (optional field):**
```json
{
  "statusMapping": {
    "start": "In Progress",
    "done": "Done",
    "fail": "In Progress",
    "cancel": "Cancelled"
  }
}
```

If `statusMapping.cancel` is not configured, try these transitions in order:
1. "Cancelled" (most common)
2. "Won't Do" (Jira default)
3. "Done" (fallback - at least closes the ticket)

### Verify MCP Connection

Attempt to list available Jira tools. The Atlassian MCP server should provide:
- `jira-transition-issue` for changing ticket status
- `jira-add-comment` for adding cancellation comments

**If MCP tools not available:**
```
Error: Atlassian MCP server not configured or not responding.

Cannot cancel Jira tickets without MCP connection.
See README.md "Jira Integration" section for setup instructions.
```

---

## Step 3: Cancel Story Tickets

Cancel each user story ticket before cancelling the epic. This ensures the epic summary includes all cancelled stories.

### Iterate Through Stories

```
FOR each story IN prd.userStories:
  IF story.jiraKey is null or empty:
    SKIP (story was never synced to Jira)

  1. Add cancellation comment to ticket
  2. Transition ticket to cancelled status
  3. Track success/failure for summary
```

### Cancellation Comment Format (Jira Wiki Markup)

```
h2. Ticket Cancelled

h3. Reason
{cancellation_reason}

h3. Story Details
||Field||Value||
|Story ID|{story.id}|
|Title|{story.title}|
|Status|{story.passes ? "Completed" : "Not Started"}|

h3. Action
This ticket was cancelled via Ralph /cancel-jira skill.

{If story.passes was true:}
Note: This story was already implemented before cancellation. Review commit history for the implementation.

----
_Cancelled by Ralph /cancel-jira skill_
```

### MCP Tool Calls

**Add Comment:**
```
Tool: jira-add-comment (or atlassian_jira_add_comment)
Parameters:
  - issueKey: story.jiraKey (e.g., "PROJ-101")
  - body: <cancellation comment in wiki markup>
```

**Transition to Cancelled:**
```
Tool: jira-transition-issue (or atlassian_jira_transition_issue)
Parameters:
  - issueKey: story.jiraKey (e.g., "PROJ-101")
  - transition: statusMapping.cancel or "Cancelled" or "Won't Do"
```

### Handle Transition Failures

If a transition fails (ticket already cancelled, transition not available, permission denied):

1. **Log the failure** but continue with other tickets
2. **Try fallback transitions** ("Won't Do", "Done")
3. **Include in summary** which tickets couldn't be transitioned

```javascript
const results = {
  success: [],      // Tickets successfully cancelled
  alreadyClosed: [], // Tickets already in terminal state
  failed: []        // Tickets that couldn't be cancelled
};
```

---

## Step 4: Cancel the Epic

After all story tickets are cancelled, cancel the parent epic with a summary comment.

### Epic Cancellation Comment Format (Jira Wiki Markup)

```
h2. Epic Cancelled

h3. Reason
{cancellation_reason}

h3. PRD Summary
||Field||Value||
|Project|{prd.project}|
|Branch|{prd.branchName}|
|Total Stories|{prd.userStories.length}|
|Completed Before Cancel|{count of stories where passes=true}|
|Not Started|{count of stories where passes=false}|

h3. Story Tickets Cancelled

{For each story with jiraKey:}
* [{story.jiraKey}] {story.id}: {story.title} - {story.passes ? "Was Complete" : "Not Started"}

h3. Action
This epic and all linked story tickets were cancelled via Ralph /cancel-jira skill.

{If any stories were completed:}
h3. Note on Completed Work
{count} stories were already implemented before cancellation.
The code changes remain in the git history on branch: {prd.branchName}

----
_Cancelled by Ralph /cancel-jira skill_
```

### MCP Tool Calls for Epic

**Add Comment:**
```
Tool: jira-add-comment (or atlassian_jira_add_comment)
Parameters:
  - issueKey: prd.jiraEpicKey (e.g., "PROJ-100")
  - body: <epic cancellation comment>
```

**Transition to Cancelled:**
```
Tool: jira-transition-issue (or atlassian_jira_transition_issue)
Parameters:
  - issueKey: prd.jiraEpicKey
  - transition: statusMapping.cancel or "Cancelled" or "Won't Do"
```

---

## Step 5: Clear Jira References from prd.json

After successfully cancelling tickets, clear the Jira references from prd.json so:
- Future /sync-jira runs won't see duplicate detection warnings
- The PRD can be re-synced to Jira with new tickets if needed
- The local state reflects that there are no active Jira tickets

### Update Process

```javascript
// Clear epic key
prd.jiraEpicKey = null;

// Clear story keys
for (const story of prd.userStories) {
  story.jiraKey = null;
}

// Write updated prd.json
writeFile('./prd.json', JSON.stringify(prd, null, 2));
```

### Example: Before and After

**Before cancel-jira:**
```json
{
  "project": "TaskApp",
  "branchName": "ralph/task-status",
  "description": "Task Status Feature",
  "jiraEpicKey": "PROJ-100",
  "userStories": [
    {
      "id": "US-001",
      "title": "Add status field",
      "priority": 1,
      "passes": true,
      "notes": "Completed",
      "jiraKey": "PROJ-101"
    },
    {
      "id": "US-002",
      "title": "Add status filter",
      "priority": 2,
      "passes": false,
      "notes": "",
      "jiraKey": "PROJ-102"
    }
  ]
}
```

**After cancel-jira:**
```json
{
  "project": "TaskApp",
  "branchName": "ralph/task-status",
  "description": "Task Status Feature",
  "jiraEpicKey": null,
  "userStories": [
    {
      "id": "US-001",
      "title": "Add status field",
      "priority": 1,
      "passes": true,
      "notes": "Completed",
      "jiraKey": null
    },
    {
      "id": "US-002",
      "title": "Add status filter",
      "priority": 2,
      "passes": false,
      "notes": "",
      "jiraKey": null
    }
  ]
}
```

Note: The `passes` status and `notes` are preserved - only Jira references are cleared.

---

## Step 6: Output Summary

Display a comprehensive summary of what was cancelled.

### Summary Format

```
## Jira Cancellation Complete

### Cancellation Reason
{cancellation_reason}

### Epic Cancelled
- **{epicKey}**: [PRD] {project name}
- Status: Cancelled
- Link: {atlassianSiteUrl}/browse/{epicKey}

### Story Tickets Cancelled ({success_count}/{total_count})

| Jira Key | Story ID | Title | Previous Status | Result |
|----------|----------|-------|-----------------|--------|
| PROJ-101 | US-001 | Add status field | Completed | Cancelled |
| PROJ-102 | US-002 | Add status filter | Not Started | Cancelled |
| PROJ-103 | US-003 | Add status API | In Progress | Already Closed |

{If any failures:}
### Tickets That Could Not Be Cancelled

| Jira Key | Story ID | Reason |
|----------|----------|--------|
| PROJ-104 | US-004 | Transition "Cancelled" not available |

### prd.json Updated
- Cleared `jiraEpicKey` (was: {old_epic_key})
- Cleared `jiraKey` from {count} user stories

### Next Steps
1. The PRD remains in prd.json with story progress preserved
2. To re-sync to Jira with new tickets: `/sync-jira`
3. To start fresh with a new PRD: Delete prd.json and run `/prd`
4. Git branch `{branchName}` still exists with any completed work
```

---

## Error Handling

### Partial Failure Recovery

If some tickets fail to cancel:
1. **Continue with other tickets** - don't stop on first failure
2. **Still update prd.json** - clear references for successful cancellations only (optional) or all (simpler)
3. **Report partial success** in summary
4. **Provide manual instructions** for failed tickets

### Network/API Errors

If MCP calls fail mid-process:
1. **Log which tickets were successfully cancelled**
2. **Report the error** with ticket key that failed
3. **Do NOT update prd.json** if epic cancellation failed
4. **Provide re-run instructions**

```
Error: Jira API error while cancelling PROJ-103

Successfully cancelled:
- PROJ-101 (US-001)
- PROJ-102 (US-002)

Not cancelled (manual action required):
- PROJ-103 (US-003) - API Error: Connection timeout
- PROJ-104 (US-004) - Not attempted
- PROJ-100 (Epic) - Not attempted

To complete cancellation:
1. Manually cancel remaining tickets in Jira
2. Run /cancel-jira again (will skip already-cancelled tickets)
```

### Idempotency

The skill should be safe to run multiple times:
- If tickets are already cancelled, skip transition but still add comment
- If prd.json already has null jiraKey values, skip those stories
- If jiraEpicKey is already null, report "nothing to cancel"

---

## MCP Tool Reference

The skill uses these Atlassian MCP server tools:

### Transitioning Issues
```
Tool: jira-transition-issue (or atlassian_jira_transition_issue)
Parameters:
  - issueKey: Issue key (e.g., "PROJ-123")
  - transition: Transition name (e.g., "Cancelled", "Won't Do")
```

### Adding Comments
```
Tool: jira-add-comment (or atlassian_jira_add_comment)
Parameters:
  - issueKey: Issue key (e.g., "PROJ-123")
  - body: Comment text (Jira wiki markup)
```

### Getting Available Transitions
```
Tool: jira-get-transitions (or atlassian_jira_get_transitions)
Parameters:
  - issueKey: Issue key (e.g., "PROJ-123")
Returns: List of available status transitions for the issue
```

Use `jira-get-transitions` to discover what cancellation transitions are available in the project's workflow before attempting to transition tickets.

---

## Checklist

Before completing:

- [ ] prd.json found and has jiraEpicKey
- [ ] Jira configuration loaded from .ralph/jira.json
- [ ] MCP connection verified
- [ ] All story tickets cancelled (or attempted with failures logged)
- [ ] Epic cancelled with summary comment
- [ ] prd.json updated (jiraEpicKey and all jiraKeys set to null)
- [ ] Summary displayed to user with results
