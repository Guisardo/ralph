---
name: prd-reviewer
description: "Review PRDs for clarity, consistency, and Ralph execution readiness. Acts as a developer new to the company to identify unclear requirements, gaps, and areas needing refinement. Use when you have a PRD draft and want to validate it before conversion to prd.json. Triggers on: review prd, validate prd, check prd quality, prd-reviewer, improve prd."
---

# PRD Reviewer

Review Product Requirements Documents (PRDs) for clarity, completeness, and Ralph execution readiness. Acts as a fresh pair of eyes from a developer new to the company.

---

## The Job

1. Load and parse the PRD markdown file
2. Perform multi-dimensional analysis across 5 dimensions
3. Auto-fix simple, non-controversial issues immediately
4. Generate comprehensive review report with actionable feedback
5. Display report and save to `tasks/review-[name]-[timestamp].md`
6. Prompt for approval to apply manual fixes
7. Update PRD in place if approved, preserve auto-fixes if not

**Important:** This skill performs FULL re-review on every run. No incremental mode. Each run creates a new review report with unique timestamp to track PRD evolution over time.

---

## Overview: Five Review Dimensions

Every PRD review analyzes these dimensions:

- ✓ **Ralph Execution Readiness** - Story sizing, dependencies, test criteria
- ✓ **Clarity and Completeness** - Goals, requirements, scope boundaries
- ✓ **Diagram Quality** - Worthiness thresholds, complexity limits
- ✓ **Reference Quality** - Citation standards, official sources
- ✓ **Gap Analysis** - Missing info, ambiguity, implicit assumptions

---

## Step 1: Load and Parse PRD

### Accept File Path

If invoked with argument: `/prd-reviewer tasks/prd-feature.md`
- Use the provided path

If invoked without argument: `/prd-reviewer`
- List all `tasks/prd-*.md` files
- Prompt user to select one (numbered list)

### Parse PRD Structure

Extract and validate these sections:
- **Introduction/Overview** - Feature description
- **Goals** - Measurable objectives
- **User Stories** - Format: `### US-XXX: Title`
- **Acceptance Criteria** - Format: `- [ ] criterion`
- **Functional Requirements** - Format: `FR-XXX: description`
- **Non-Goals** - Scope boundaries
- **Technical Considerations** - (optional)
- **Success Metrics** - (optional)
- **Diagrams** - Mermaid diagrams (optional)
- **References** - Citations (optional)

### Handle Missing Sections

If critical sections are missing:
```markdown
⚠️ Warning: PRD appears incomplete

Missing critical sections:
- [ ] User Stories section
- [ ] Functional Requirements section
- [ ] Acceptance Criteria in stories

Cannot perform meaningful review. Please:
1. Ensure PRD has basic structure
2. Run /prd to generate complete PRD template
3. Then run /prd-reviewer again
```

Exit gracefully if structure is too incomplete to review.

---

## Step 2: Multi-Dimensional Analysis

### Dimension 1: Ralph Execution Readiness

This is the MOST CRITICAL dimension. Ralph will fail if these requirements aren't met.

#### Story Sizing Detection

**Too Large Indicators:**
- Description > 3 sentences
- Acceptance criteria count > 8
- Red flag words: "entire", "complete", "all", "system", "whole", "full"
- Multiple verbs in title: "Add, update, and delete users"
- Description mentions multiple components/files

**Detection Logic:**
```python
def is_story_too_large(story):
    description_sentences = count_sentences(story.description)
    criteria_count = len(story.acceptance_criteria)
    red_flag_words = ["entire", "complete", "all", "system", "whole", "full"]

    if description_sentences > 3:
        return True, f"{description_sentences} sentences (> 3)"

    if criteria_count > 8:
        return True, f"{criteria_count} criteria (> 8)"

    for word in red_flag_words:
        if word.lower() in story.title.lower() or word.lower() in story.description.lower():
            return True, f"contains red flag word '{word}'"

    if count_verbs_in_title(story.title) > 2:
        return True, "multiple actions in title"

    return False, ""
```

**Output Format:**
```markdown
### Critical (Blocks Ralph Execution)

- [ ] **US-003: Too Large** - Story "Build entire dashboard" is too broad for one iteration
  - **Location:** Line 45, User Stories section
  - **Evidence:** Description has 5 sentences, uses word "entire", has 10 acceptance criteria
  - **Fix:** Split into 4 focused stories:
    1. US-003a: Create dashboard schema and migration
    2. US-003b: Add dashboard data queries (SQL/ORM)
    3. US-003c: Build dashboard UI grid component
    4. US-003d: Add dashboard filtering controls
  - **Each story:** < 3 sentences, < 5 criteria, single responsibility
```

#### Dependency Order Validation

**Correct Order:**
1. Schema/migrations (database structure)
2. Backend/API/server actions (business logic)
3. UI components (frontend)
4. Integration/dashboard views (aggregation)
5. Integration tests (final story, lowest priority)

**Detection Logic:**
- No UI story should come before its backend dependency
- No backend story should come before its schema dependency
- Integration tests story must be last (highest priority number)

**Output Format:**
```markdown
- [ ] **US-005: Dependency Issue** - Story depends on US-006 which has lower priority
  - **Location:** Line 89, depends on "status filter" implemented in US-006
  - **Evidence:** US-005 description mentions "use the status filter dropdown" but US-006 (priority 6) creates that dropdown
  - **Fix:** Swap priorities: US-006 → priority 5, US-005 → priority 6
  - **Rationale:** Dependencies must execute before dependents
```

#### Required Acceptance Criteria

**Every Story Must Have:**
- "Typecheck passes" (exact match, case-insensitive)
- "Tests pass" (exact match, case-insensitive)

**Stories with Testable Logic Must Have:**
- "Unit tests verify: [specifics]" or similar test criterion

**UI Stories Must Have:**
- "Verify in browser using Selenium MCP" (exact match, case-insensitive)

**Detection Logic:**
```python
def check_required_criteria(story):
    criteria_text = " ".join(story.acceptance_criteria).lower()
    issues = []

    if "typecheck passes" not in criteria_text:
        issues.append("Missing 'Typecheck passes'")

    if "tests pass" not in criteria_text:
        issues.append("Missing 'Tests pass'")

    if is_ui_story(story) and "selenium" not in criteria_text:
        issues.append("Missing 'Verify in browser using Selenium MCP' (UI story)")

    if has_testable_logic(story) and "unit test" not in criteria_text:
        issues.append("Missing unit test criterion")

    return issues
```

#### Acceptance Criteria Quality

**Vague Terms to Flag:**
- "correctly", "properly", "well", "good UX", "works", "handles", "supports"
- "easy", "simple", "clear", "intuitive", "smooth", "seamless"
- "appropriate", "suitable", "reasonable", "efficient"

**Subjective Terms to Flag:**
- "looks nice", "feels responsive", "user-friendly"
- "clean", "elegant", "polished", "professional"

**Output Format:**
```markdown
- [ ] **US-007: Vague Criteria** - Criterion "works correctly" is not verifiable
  - **Location:** Line 134, acceptance criteria #3
  - **Current:** "Filter dropdown works correctly"
  - **Problem:** "works correctly" is vague and subjective
  - **Fix:** "Filter dropdown: selecting 'Pending' shows only pending tasks, 'Done' shows only done tasks, 'All' shows all tasks"
  - **Rationale:** Verifiable criteria specify exact expected behavior
```

#### Integration Tests Story

**Required:**
- Final story must be integration tests
- Must have lowest priority (highest number)
- Must cover end-to-end user flows from PRD
- Must test data persistence, component interaction, error handling

**Detection Logic:**
```python
def check_integration_tests_story(stories):
    last_story = stories[-1]

    if "integration test" not in last_story.title.lower():
        return False, "No integration tests story found"

    if last_story.priority != max(s.priority for s in stories):
        return False, "Integration tests story does not have lowest priority"

    if len(last_story.acceptance_criteria) < 4:
        return False, "Integration tests story has insufficient coverage criteria"

    return True, ""
```

### Dimension 2: Clarity and Completeness

#### Goals Clarity

**Check:**
- Are goals specific and measurable?
- Do goals answer "what problem does this solve"?
- Are goals achievable within the feature scope?

**Vague goals to flag:**
- "Improve user experience"
- "Make the system better"
- "Add functionality"

**Good goals:**
- "Reduce task creation time from 5 clicks to 2"
- "Enable users to filter tasks by status"
- "Support 1000 concurrent users"

#### User Stories Format

**Required Format:**
```markdown
### US-XXX: [Title]
**Description:** As a [user], I want [feature] so that [benefit].

**Acceptance Criteria:**
- [ ] Criterion 1
- [ ] Criterion 2
```

**Flag if:**
- Missing "As a ... I want ... so that ..." structure
- Title is too long (> 60 chars)
- Description doesn't explain user benefit

#### Functional Requirements

**Check:**
- Are requirements numbered (FR-1, FR-2, etc.)?
- Are requirements specific and unambiguous?
- Do requirements avoid implementation details?

**Output Format:**
```markdown
- [ ] **FR-3: Ambiguous** - "System should handle errors gracefully" is not verifiable
  - **Location:** Line 67, Functional Requirements
  - **Problem:** No specific error scenarios or expected behavior
  - **Fix:** Replace with specific, verifiable requirements:
    - "FR-3a: When API call fails, show error toast with retry button"
    - "FR-3b: When validation fails, highlight invalid fields with error messages"
    - "FR-3c: When network is offline, show connection lost banner"
  - **Rationale:** Each requirement should specify inputs, outputs, and conditions
```

#### Non-Goals Section

**Check:**
- Does PRD define clear scope boundaries?
- Are out-of-scope features explicitly listed?
- Does this prevent scope creep?

**Flag if:**
- Non-goals section is missing or empty
- Non-goals are too vague ("We won't add complex features")

### Dimension 3: Diagram Quality (if present)

#### Worthiness Thresholds

**User Flow Diagrams:** Include if ANY of:
- 3+ sequential steps
- 2+ decision points (branches)
- Parallel processes

**Architecture Diagrams:** Include if ANY of:
- 3+ components/services
- External integrations (APIs, databases, third-party services)
- Complex data flow between components

**Sequence Diagrams:** Include if ANY of:
- 3+ services/components interacting
- Async operations (jobs, webhooks, events)
- Complex request/response patterns

**Below Threshold:**
If diagram doesn't meet thresholds, flag it:
```markdown
- [ ] **Diagram: User Flow** - May not meet worthiness threshold
  - **Location:** Line 234, Diagrams section
  - **Analysis:** Flow has 2 steps, 0 decisions
  - **Threshold:** Requires 3+ steps OR 2+ decisions
  - **Recommendation:** Consider removing diagram or expanding flow complexity
```

#### Complexity Limits

**Maximum Nodes:**
- User Flow: 10 nodes
- Architecture: 8 nodes
- Sequence: 7 nodes

**Flag if exceeded:**
```markdown
- [ ] **Diagram: Architecture** - Exceeds complexity limit
  - **Location:** Line 289, Diagrams section
  - **Analysis:** 12 components (limit: 8)
  - **Fix:** Split into 2 diagrams:
    1. Core system architecture (main components)
    2. Integration architecture (external services)
```

#### Diagram Judgment Section

**Required:**
- Must explain why diagrams were included or excluded
- Must reference worthiness thresholds
- Must justify complexity level

**Flag if missing:**
```markdown
- [ ] **Missing Diagram Judgment** - No reasoning for diagram inclusion
  - **Location:** Diagrams section
  - **Fix:** Add "Diagram Judgment" subsection explaining:
    - Why each diagram meets worthiness threshold
    - Why excluded diagrams don't meet threshold
    - How complexity was kept within limits
```

#### Mermaid Syntax Validation

**Check:**
- Valid Mermaid syntax (basic validation)
- Proper node definitions
- Valid arrow syntax
- Balanced quotes and parentheses

**Don't do deep parsing** - just flag obvious syntax errors.

### Dimension 4: Reference Quality (if present)

#### Citation Worthiness

**Include References Only For:**
- Specialized technologies (not React, Node.js, Python, etc.)
- Unfamiliar libraries or frameworks
- Complex algorithms or patterns
- Security best practices
- Performance optimization techniques

**Do NOT Include References For:**
- Common technologies everyone knows
- Basic programming concepts
- Standard library functions
- Popular frameworks without special features

**Flag inappropriate references:**
```markdown
- [ ] **Reference: React** - Not citation-worthy
  - **Location:** Line 456, References section
  - **Issue:** React is a common technology, doesn't need citation
  - **Fix:** Remove reference or justify with: "React [feature X] documentation needed because [specific unusual usage]"
```

#### Minimum Threshold

**If References section exists:**
- Must have at least 3 citations
- If < 3 citations, consider removing section

**Flag if below threshold:**
```markdown
- [ ] **References: Below Threshold** - Only 2 citations
  - **Location:** References section
  - **Threshold:** Minimum 3 citations if References section exists
  - **Options:**
    A. Add 1+ more relevant citation
    B. Remove References section (feature uses standard tech)
```

#### Official Domains

**Verify:**
- URLs are from official sources (docs.*, github.com/official-org, etc.)
- No blog posts, Stack Overflow, or unofficial tutorials
- No broken links (if feasible to check)

**Flag unofficial sources:**
```markdown
- [ ] **Reference 4: Unofficial Source** - Blog post, not official docs
  - **Location:** Line 489, References section
  - **Current:** https://someblog.com/how-to-use-library
  - **Fix:** Replace with official docs: https://docs.library.io/guide
```

#### Reference Support

**Each reference should:**
- Support a specific technical recommendation in the PRD
- Be cited in the text (not orphaned)
- Provide value beyond common knowledge

**Flag orphaned references:**
```markdown
- [ ] **Reference 2: Orphaned** - Not cited in PRD text
  - **Location:** Line 478
  - **Fix:** Either cite in Technical Considerations or remove
```

### Dimension 5: Gap Analysis

#### Missing Information

**Common Gaps:**
- Unclear data models/schema
- Missing API endpoints specification
- Undefined error states
- No loading/empty states for UI
- Missing authentication/authorization requirements
- Undefined edge cases

**Output Format:**
```markdown
## Missing Information

- [ ] **Data Model Undefined** - Task schema not specified
  - **Impact:** Backend and UI stories need to know fields
  - **Question:** What fields does a task have? (title, description, status, assignee, due date, etc.)

- [ ] **Error States Not Defined** - How should errors be displayed?
  - **Impact:** UI stories need error handling patterns
  - **Question:** Toast notifications? Inline errors? Error boundary?
```

#### Ambiguous Requirements

**Flag requirements that could be interpreted multiple ways:**
```markdown
- [ ] **Ambiguous: "Users can filter tasks"**
  - **Location:** FR-4
  - **Ambiguity:** What filters? Status only? Or status, assignee, date, tags?
  - **Fix:** Specify exact filter criteria supported in MVP
```

#### Research Needs

**Identify areas needing investigation:**
```markdown
- [ ] **Research Required: Real-time Updates**
  - **Location:** Technical Considerations
  - **Issue:** PRD mentions "real-time updates" but no implementation approach
  - **Questions:**
    - WebSockets vs Server-Sent Events vs Polling?
    - Does existing infrastructure support WebSockets?
    - What's the expected update frequency?
```

#### Implicit Assumptions

**Call out unstated assumptions:**
```markdown
- [ ] **Assumption: User Authentication Exists**
  - **Location:** Throughout PRD (references "current user")
  - **Issue:** Assumes auth system exists but doesn't verify
  - **Fix:** Add to Technical Considerations: "Requires existing authentication system with session management"
```

---

## Step 3: Auto-Fix Simple Issues

Before generating the full review report, automatically fix these non-controversial issues:

### Auto-Fixable Issues

#### 1. Missing Required Criteria

**Auto-add if missing:**
- "Typecheck passes" → Add as second-to-last criterion
- "Tests pass" → Add as last criterion
- "Unit tests verify: [functionality from description]" → Add after functional criteria
- "Verify in browser using Selenium MCP" → Add before typecheck (UI stories only)

**Detection:**
```python
def auto_fix_missing_criteria(story):
    criteria = [c.lower() for c in story.acceptance_criteria]
    fixes = []

    # Check for UI story
    is_ui = any(keyword in story.description.lower() for keyword in ["ui", "component", "button", "page", "form", "display"])

    # Check existing criteria
    has_typecheck = any("typecheck" in c for c in criteria)
    has_tests_pass = any("tests pass" in c for c in criteria)
    has_unit_tests = any("unit test" in c for c in criteria)
    has_selenium = any("selenium" in c for c in criteria)

    # Auto-fix
    if not has_typecheck:
        story.acceptance_criteria.insert(-1, "Typecheck passes")
        fixes.append("Added 'Typecheck passes'")

    if not has_tests_pass:
        story.acceptance_criteria.append("Tests pass")
        fixes.append("Added 'Tests pass'")

    if is_ui and not has_selenium:
        # Insert before typecheck
        idx = next(i for i, c in enumerate(story.acceptance_criteria) if "typecheck" in c.lower())
        story.acceptance_criteria.insert(idx, "Verify in browser using Selenium MCP")
        fixes.append("Added 'Verify in browser using Selenium MCP'")

    return fixes
```

#### 2. Story Numbering

**Auto-fix:**
- Gaps in sequence: US-001, US-002, US-005 → US-001, US-002, US-003
- Duplicate IDs: Two US-003s → Second becomes US-004
- Wrong format: US-1 → US-001 (zero-padded)

#### 3. Basic Markdown Formatting

**Auto-fix:**
- Missing newlines before headings
- Missing newlines before/after code blocks
- Inconsistent checkbox format: `[ ]` vs `[]` → `[ ]`
- Trailing whitespace

#### 4. Other Safe Fixes

**Auto-fix:**
- Lowercase "typescript" → "TypeScript"
- Lowercase "javascript" → "JavaScript"
- Missing final newline in file

### Track Auto-Fixes

Maintain a list of all auto-fixes applied:
```markdown
## Auto-Fixes Applied (8 changes)

### Required Criteria (5 changes)
- ✓ Added "Typecheck passes" to US-003, US-005, US-007
- ✓ Added "Tests pass" to US-004
- ✓ Added "Verify in browser using Selenium MCP" to US-002, US-004

### Story Numbering (2 changes)
- ✓ Renumbered US-007 → US-006 (filled gap in sequence)
- ✓ Fixed duplicate US-005 → US-005, US-006

### Formatting (1 change)
- ✓ Fixed markdown formatting: added newlines before 3 section headings
```

### Apply Auto-Fixes Immediately

**Auto-fixes are applied to the PRD file immediately** before generating the review report.

**Why:**
- Non-controversial fixes everyone would approve
- Reduces noise in review report
- Saves user time (no approval needed for obvious fixes)
- Shows progress even before manual review

**User sees:**
1. "Applied 8 auto-fixes to PRD"
2. Review report focuses on substantive issues only
3. Option to apply additional manual fixes

---

## Step 4: Generate Review Report

Create a comprehensive review document with this structure:

### Report Header

```markdown
# PRD Review Report

**Generated:** 2025-01-30 14:30:22
**Original PRD:** tasks/prd-task-status.md
**Review Run:** 3 (if tracking across runs)

---
```

### Auto-Fixes Section

```markdown
## Auto-Fixes Applied (8 changes)

These changes were applied automatically to the PRD before review:

### Required Criteria (5 changes)
- ✓ Added "Typecheck passes" to US-003, US-005, US-007
- ✓ Added "Tests pass" to US-004
- ✓ Added "Verify in browser using Selenium MCP" to US-002, US-004

### Story Numbering (2 changes)
- ✓ Renumbered US-007 → US-006 (filled gap in sequence)
- ✓ Fixed duplicate US-005 → US-005, US-006

### Formatting (1 change)
- ✓ Fixed markdown formatting: added newlines before 3 section headings

---
```

### Executive Summary

```markdown
## Executive Summary

This PRD has strong foundational structure but requires 3 critical fixes before Ralph execution. After auto-fixes, the main issues are story sizing and dependency ordering.

**Readiness:** 7/10 (Good - needs 3 critical fixes)

**Key Strengths:**
- Clear goals and success metrics
- Well-defined functional requirements
- Good acceptance criteria specificity (after auto-fixes)

**Key Issues:**
- 2 stories too large for single iteration
- 1 dependency ordering issue
- Several vague criteria need specificity

**Recommendation:** Address 3 critical issues, then re-run review. PRD will be ready for /ralph conversion after fixes.

---
```

### Issues Section

Organize by severity:

```markdown
## Issues Found

### Critical (Blocks Ralph Execution) - 3 issues

These issues will cause Ralph to fail or produce broken code:

- [ ] **US-003: Too Large** - Story "Build entire dashboard" is too broad for one iteration
  - **Location:** Line 45, User Stories section
  - **Evidence:** Description has 5 sentences, uses word "entire", has 10 acceptance criteria
  - **Fix:** Split into 4 focused stories:
    1. US-003a: Create dashboard schema and migration
    2. US-003b: Add dashboard data queries (SQL/ORM)
    3. US-003c: Build dashboard UI grid component
    4. US-003d: Add dashboard filtering controls
  - **Each story:** < 3 sentences, < 5 criteria, single responsibility

- [ ] **US-005: Dependency Issue** - Story depends on US-006 which has lower priority
  - **Location:** Line 89, depends on "status filter" implemented in US-006
  - **Evidence:** US-005 description mentions "use the status filter dropdown" but US-006 (priority 6) creates that dropdown
  - **Fix:** Swap priorities: US-006 → priority 5, US-005 → priority 6
  - **Rationale:** Dependencies must execute before dependents

- [ ] **US-008: Missing Integration Tests** - No integration tests story found
  - **Location:** End of User Stories section
  - **Evidence:** Last story is US-007 (UI component), not integration tests
  - **Fix:** Add US-008 as final story with template from /ralph skill
  - **Rationale:** Required for complete feature validation

---

### Important (Clarity/Completeness) - 4 issues

These issues reduce clarity but don't block execution:

- [ ] **FR-3: Ambiguous** - "System should handle errors gracefully" is not verifiable
  - **Location:** Line 67, Functional Requirements
  - **Problem:** No specific error scenarios or expected behavior
  - **Fix:** Replace with specific, verifiable requirements:
    - "FR-3a: When API call fails, show error toast with retry button"
    - "FR-3b: When validation fails, highlight invalid fields with error messages"
    - "FR-3c: When network is offline, show connection lost banner"
  - **Rationale:** Each requirement should specify inputs, outputs, and conditions

- [ ] **US-007: Vague Criteria** - Criterion "works correctly" is not verifiable
  - **Location:** Line 134, acceptance criteria #3
  - **Current:** "Filter dropdown works correctly"
  - **Problem:** "works correctly" is vague and subjective
  - **Fix:** "Filter dropdown: selecting 'Pending' shows only pending tasks, 'Done' shows only done tasks, 'All' shows all tasks"
  - **Rationale:** Verifiable criteria specify exact expected behavior

[... additional issues ...]

---

### Suggestions (Optional Improvements) - 2 issues

These would improve the PRD but aren't required:

- [ ] **Missing Diagram:** PRD would benefit from user flow diagram
  - **Analysis:** Feature has 4 sequential steps and 2 decision points
  - **Threshold:** User flow diagrams justified if 3+ steps OR 2+ decisions (MEETS threshold)
  - **Suggested Flow:** Create task → Set status → View filtered list → Update status
  - **Benefit:** Visualizes the user journey and state transitions

- [ ] **Integration Tests Coverage:** Consider adding edge case coverage
  - **Current:** Integration story covers happy path only
  - **Suggested:** Add criteria for:
    - Concurrent status updates (race conditions)
    - Status persistence after logout/login
    - Filter state preserved in URL (shareable links)
  - **Benefit:** Catches edge cases missed by unit tests

---
```

### Proposed Changes Section

For each issue, show current vs proposed with rationale:

```markdown
## Proposed Changes

### User Story: US-003

**Current:**
```markdown
### US-003: Build entire dashboard

**Description:** As a product manager, I want a comprehensive dashboard that displays all task statistics, charts, and filtering capabilities so that I can monitor project health at a glance.

**Acceptance Criteria:**
- [ ] Dashboard page created with grid layout
- [ ] Task count statistics displayed
- [ ] Status distribution chart rendered
- [ ] Assignee breakdown chart rendered
- [ ] Date range filter controls
- [ ] Status filter dropdown
- [ ] Real-time updates when data changes
- [ ] Responsive design works on mobile
- [ ] Loading states for all async data
- [ ] Empty states when no data
- [ ] Typecheck passes
- [ ] Tests pass
```

**Proposed:**
```markdown
### US-003a: Create dashboard schema and migration

**Description:** As a developer, I want a dashboard_stats table that caches aggregated task statistics for fast dashboard rendering.

**Acceptance Criteria:**
- [ ] Add dashboard_stats table: task_count, status_counts, last_updated
- [ ] Create migration with proper indexes
- [ ] Add aggregation function to calculate stats
- [ ] Unit tests verify: table creation, aggregation logic
- [ ] Typecheck passes
- [ ] Tests pass

---

### US-003b: Add dashboard data queries

**Description:** As a developer, I want server actions that fetch dashboard statistics with filtering support.

**Acceptance Criteria:**
- [ ] getDashboardStats() server action returns cached stats
- [ ] getTasksByFilter(dateRange, status) supports filtering
- [ ] Functions handle empty results gracefully
- [ ] Unit tests verify: stats retrieval, filtering, error cases
- [ ] Typecheck passes
- [ ] Tests pass

---

### US-003c: Build dashboard UI grid component

**Description:** As a product manager, I want a dashboard page that displays task statistics in a clean grid layout.

**Acceptance Criteria:**
- [ ] Dashboard page at /dashboard route
- [ ] Grid layout with responsive breakpoints
- [ ] Task count cards (total, pending, in progress, done)
- [ ] Loading and empty states
- [ ] Unit tests verify: component rendering, loading states
- [ ] Verify in browser using Selenium MCP
- [ ] Typecheck passes
- [ ] Tests pass

---

### US-003d: Add dashboard filtering and charts

**Description:** As a product manager, I want filtering controls and charts on the dashboard to analyze task distribution.

**Acceptance Criteria:**
- [ ] Date range picker component
- [ ] Status filter dropdown (All, Pending, In Progress, Done)
- [ ] Status distribution pie chart
- [ ] Assignee breakdown bar chart
- [ ] Filters update charts in real-time
- [ ] Unit tests verify: filter logic, chart data transformation
- [ ] Verify in browser using Selenium MCP
- [ ] Typecheck passes
- [ ] Tests pass
```

**Rationale:**
- Original story had 12 criteria and 5-sentence description - far too large for one iteration
- Split follows dependency order: schema → backend → UI base → UI enhancements
- Each new story has < 3 sentences description and < 8 criteria
- Each story is independently testable and committable
- Preserved all original functionality, just organized for incremental delivery

---

### Functional Requirement: FR-3

**Current:**
```markdown
FR-3: System should handle errors gracefully
```

**Proposed:**
```markdown
FR-3a: When API call fails, display error toast notification with message "Failed to load tasks. Please try again." and a retry button

FR-3b: When form validation fails, highlight invalid fields with red border and display specific error message below each field (e.g., "Title is required", "Due date must be in the future")

FR-3c: When network is offline, display persistent banner at top: "You are offline. Changes will sync when connection is restored." with orange background
```

**Rationale:**
- Original requirement was vague - "gracefully" is subjective
- New requirements are verifiable - specific UI elements and messages
- Covers three distinct error scenarios with different UX patterns
- Provides enough detail for implementation and testing

---
```

### Recommendations Section

```markdown
## Recommendations

**Immediate Actions (Required):**
1. Split US-003 into 4 focused stories (US-003a through US-003d)
2. Swap priorities for US-005 and US-006 to fix dependency order
3. Add US-008 integration tests story as final story

**Before Next Review:**
4. Replace vague FR-3 with specific error handling requirements
5. Improve US-007 criteria specificity (remove "works correctly")

**Optional Enhancements:**
6. Consider adding user flow diagram (meets worthiness threshold)
7. Expand integration tests to cover edge cases

**Next Steps:**
- Apply manual fixes (or approve auto-application)
- Run `/prd-reviewer` again to verify all issues resolved
- When clean, run `/ralph tasks/prd-task-status.md` to convert to prd.json

---
```

### Review Metadata Section

```markdown
## Review Metadata

**Analysis Summary:**
- Auto-fixes applied: 8 changes (automatically applied to PRD)
- Manual issues found: 3 critical, 4 important, 2 suggestions
- Total issues: 9 requiring manual review
- Readiness score: 7/10

**Review Dimensions:**
- ✓ Ralph Execution Readiness: 3 critical issues
- ✓ Clarity and Completeness: 4 important issues
- ✓ Diagram Quality: Not applicable (no diagrams)
- ✓ Reference Quality: Not applicable (no references)
- ✓ Gap Analysis: 2 suggestions

**Estimated Time to Fix:**
- Critical issues: ~30 minutes (story splitting, dependency reorder, add integration tests)
- Important issues: ~15 minutes (improve specificity)
- Suggestions: ~10 minutes (optional)

**Review Checklist:**
- [x] Story sizing validated (2 stories too large)
- [x] Dependency order checked (1 dependency issue)
- [x] Required criteria verified (auto-fixed)
- [x] Acceptance criteria quality checked (2 vague criteria)
- [x] Integration tests story verified (missing)
- [x] Goals clarity checked (good)
- [x] Functional requirements checked (1 ambiguous)
- [x] Non-goals defined (good)
- [ ] Diagram quality (not applicable)
- [ ] Reference quality (not applicable)

---
```

---

## Step 5: Display and Save Report

### Display in Terminal

Show the complete review report with formatting:
- Use markdown rendering for terminal
- Highlight critical issues in red/bold
- Show summary statistics at top
- End with clear next steps

### Save Report File

**File Naming:**
- Location: `tasks/` directory (same as PRD)
- Format: `review-[prd-basename]-[timestamp].md`
- Timestamp: `YYYYMMDD-HHMMSS` (sortable, no special chars)

**Example:**
- Original PRD: `tasks/prd-task-status.md`
- Review report: `tasks/review-task-status-20250130-143022.md`

**Benefits:**
- All review history preserved
- Easy to compare reviews over time
- Git-friendly (text files)
- Same directory for easy discovery

**Extraction Logic:**
```python
from pathlib import Path
from datetime import datetime

def get_review_report_path(prd_path):
    prd_file = Path(prd_path)
    prd_basename = prd_file.stem.replace("prd-", "")  # "prd-task-status" → "task-status"
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")

    review_filename = f"review-{prd_basename}-{timestamp}.md"
    review_path = prd_file.parent / review_filename

    return review_path
```

### Confirmation Message

After saving, display:
```
✓ Review complete!

📊 Summary:
   - Auto-fixes applied: 8 (already saved to PRD)
   - Manual issues: 3 critical, 4 important, 2 suggestions
   - Readiness: 7/10 (Good - needs critical fixes)

📄 Files:
   - Updated PRD: tasks/prd-task-status.md (with auto-fixes)
   - Review report: tasks/review-task-status-20250130-143022.md

🔍 Next steps:
   1. Review proposed changes above
   2. Approve manual fixes? (see Step 6 below)
```

---

## Step 6: User Approval

### Prompt for Manual Fixes

After displaying the review report, ask:

```markdown
## Apply Manual Changes?

Auto-fixes have been applied to the PRD. Review the proposed manual changes above.

**Manual changes to apply:** 9 issues (3 critical, 4 important, 2 suggestions)

Should I apply the proposed manual changes to the original PRD?

Options:
A. Yes - Apply all manual changes (critical + important + suggestions)
B. Critical only - Apply only critical issues (recommended if unsure)
C. No - Keep only auto-fixes, skip manual changes
D. Let me review first - Just show what would change

Your choice (A/B/C/D):
```

### Handle User Choice

**Option A: Apply All**
- Apply all proposed changes from review report
- Update PRD in place
- Show summary of changes

**Option B: Critical Only**
- Apply only issues marked "Critical (Blocks Ralph Execution)"
- Update PRD in place
- Show summary, note that important/suggestions skipped

**Option C: No Changes**
- Keep auto-fixes only (already applied)
- Original PRD has auto-fixes but no manual changes
- User can manually address issues

**Option D: Review First**
- Display detailed diff preview
- Then re-prompt with options A/B/C

---

## Step 7: Apply Manual Changes

If user approves (Option A or B):

### Read Current PRD

The PRD already has auto-fixes applied from Step 3.

### Apply Approved Changes

For each approved issue:

1. **Story Splitting** (e.g., US-003 → US-003a/b/c/d):
   - Replace original story section with 4 new story sections
   - Maintain markdown formatting
   - Update story numbering in subsequent stories

2. **Dependency Reordering** (e.g., swap US-005 and US-006 priorities):
   - Find both story sections
   - Swap the priority numbers in the text (if documented)
   - Note: Priority is typically in prd.json, not markdown PRD
   - Add comment noting the reorder

3. **Add Missing Stories** (e.g., add US-008 integration tests):
   - Append new story at end of User Stories section
   - Use template format
   - Ensure proper markdown formatting

4. **Improve Specificity** (e.g., fix vague criteria):
   - Find the specific line
   - Replace with more specific version
   - Maintain checkbox format

5. **Update Requirements** (e.g., split FR-3):
   - Find requirement in Functional Requirements section
   - Replace with multiple specific requirements
   - Renumber subsequent requirements if needed

### Add Review Metadata

Add HTML comment to PRD header (after frontmatter if present):

```markdown
<!--
Last reviewed: 2025-01-30 14:30:22
Review report: tasks/review-task-status-20250130-143022.md
Issues resolved: 3 critical, 4 important, 2 suggestions
-->
```

### Save Updated PRD

Write changes back to original PRD file.

### Display Summary

```markdown
✓ Applied changes to PRD!

📝 Changes made:
   - Auto-fixes: 8 (applied earlier)
   - Manual fixes: 9 (just applied)
   - Total: 17 changes

📄 Files updated:
   - tasks/prd-task-status.md (updated with all changes)
   - Review metadata added to PRD header

🔍 Verify changes:
   git diff tasks/prd-task-status.md

📋 Review history:
   - tasks/review-task-status-20250130-143022.md (this review)

🎯 Next steps:
   1. Review git diff to verify changes
   2. Run `/prd-reviewer tasks/prd-task-status.md` again (optional, verify clean)
   3. When satisfied, convert: `/ralph tasks/prd-task-status.md`
   4. Then execute: `./ralph.sh`
```

---

## Validation Rules and Detection Logic

### Story Sizing Detection

```python
def analyze_story_size(story):
    """
    Returns: (is_too_large: bool, reasons: List[str])
    """
    reasons = []

    # Count sentences in description
    description_sentences = count_sentences(story.description)
    if description_sentences > 3:
        reasons.append(f"{description_sentences} sentences in description (> 3)")

    # Count acceptance criteria
    criteria_count = len(story.acceptance_criteria)
    if criteria_count > 8:
        reasons.append(f"{criteria_count} acceptance criteria (> 8)")

    # Check for red flag words
    red_flags = ["entire", "complete", "all", "system", "whole", "full", "comprehensive"]
    text_lower = (story.title + " " + story.description).lower()
    found_flags = [flag for flag in red_flags if flag in text_lower]
    if found_flags:
        reasons.append(f"contains red flag words: {', '.join(found_flags)}")

    # Check for multiple verbs in title (indicates multiple actions)
    action_verbs = ["add", "create", "build", "update", "delete", "implement", "refactor"]
    title_lower = story.title.lower()
    verb_count = sum(1 for verb in action_verbs if verb in title_lower)
    if verb_count > 1:
        reasons.append(f"multiple actions in title ({verb_count} verbs)")

    # Check for multiple components mentioned
    if text_lower.count("component") > 2 or text_lower.count("page") > 1:
        reasons.append("mentions multiple components/pages")

    return len(reasons) > 0, reasons

def count_sentences(text):
    """Count sentences in text (naive implementation)."""
    # Split by period, question mark, exclamation
    import re
    sentences = re.split(r'[.!?]+', text)
    # Filter out empty strings
    sentences = [s.strip() for s in sentences if s.strip()]
    return len(sentences)
```

### Dependency Order Validation

```python
def validate_dependency_order(stories):
    """
    Returns: List[Tuple[story_id, issue_description, fix_suggestion]]
    """
    issues = []

    # Categorize stories by type
    schema_stories = [s for s in stories if is_schema_story(s)]
    backend_stories = [s for s in stories if is_backend_story(s)]
    ui_stories = [s for s in stories if is_ui_story(s)]
    integration_stories = [s for s in stories if is_integration_story(s)]

    # Check order: schema < backend < ui < integration
    for ui in ui_stories:
        for schema in schema_stories:
            if ui.priority < schema.priority:
                issues.append((
                    ui.id,
                    f"UI story {ui.id} comes before schema story {schema.id}",
                    f"Swap priorities: {schema.id} → {ui.priority}, {ui.id} → {schema.priority}"
                ))

    # Check integration tests are last
    if integration_stories:
        max_priority = max(s.priority for s in stories)
        for integration in integration_stories:
            if integration.priority != max_priority:
                issues.append((
                    integration.id,
                    f"Integration tests story {integration.id} is not last (priority {integration.priority}, should be {max_priority})",
                    f"Change {integration.id} priority to {max_priority}"
                ))

    # Check for forward references in descriptions
    for story in stories:
        # Look for references to other stories
        referenced_ids = extract_story_references(story.description)
        for ref_id in referenced_ids:
            ref_story = next((s for s in stories if s.id == ref_id), None)
            if ref_story and ref_story.priority > story.priority:
                issues.append((
                    story.id,
                    f"Story {story.id} references {ref_id} which has lower priority (runs later)",
                    f"Either remove reference or swap priorities so {ref_id} runs first"
                ))

    return issues

def is_schema_story(story):
    keywords = ["schema", "migration", "table", "database", "column", "index"]
    text = (story.title + " " + story.description).lower()
    return any(keyword in text for keyword in keywords)

def is_backend_story(story):
    keywords = ["server action", "api", "endpoint", "backend", "service", "query"]
    text = (story.title + " " + story.description).lower()
    return any(keyword in text for keyword in keywords) and not is_schema_story(story)

def is_ui_story(story):
    keywords = ["ui", "component", "page", "button", "form", "display", "render", "view"]
    text = (story.title + " " + story.description).lower()
    return any(keyword in text for keyword in keywords)

def is_integration_story(story):
    keywords = ["integration test", "e2e", "end-to-end", "full flow"]
    text = (story.title + " " + story.description).lower()
    return any(keyword in text for keyword in keywords)
```

### Vague Criteria Detection

```python
def detect_vague_criteria(criterion):
    """
    Returns: (is_vague: bool, vague_terms: List[str], suggestion: str)
    """
    vague_terms = [
        "correctly", "properly", "well", "good", "works",
        "handles", "supports", "easy", "simple", "clear",
        "intuitive", "smooth", "seamless", "appropriate",
        "suitable", "reasonable", "efficient", "nice",
        "responsive", "user-friendly", "clean", "elegant"
    ]

    criterion_lower = criterion.lower()
    found_terms = [term for term in vague_terms if term in criterion_lower]

    if not found_terms:
        return False, [], ""

    # Generate suggestion
    suggestion = generate_specific_alternative(criterion)

    return True, found_terms, suggestion

def generate_specific_alternative(criterion):
    """
    Generate a more specific version of a vague criterion.
    This is a heuristic - can be improved with examples.
    """
    suggestions = {
        "works correctly": "specify exact expected behavior for each input/action",
        "handles errors": "specify which errors and what UI should show",
        "good UX": "specify exact UI elements, states, and user feedback",
        "easy to use": "specify max clicks, clear labels, helpful error messages",
    }

    criterion_lower = criterion.lower()
    for vague, specific in suggestions.items():
        if vague in criterion_lower:
            return specific

    return "make criterion verifiable with specific inputs/outputs/UI elements"
```

### Diagram Worthiness Calculation

```python
def calculate_diagram_worthiness(prd, diagram_type):
    """
    Returns: (meets_threshold: bool, analysis: Dict)
    """
    if diagram_type == "user_flow":
        # Count steps and decisions from PRD
        steps = count_user_flow_steps(prd)
        decisions = count_decision_points(prd)

        threshold = steps >= 3 or decisions >= 2

        return threshold, {
            "steps": steps,
            "decisions": decisions,
            "threshold": "3+ steps OR 2+ decisions",
            "meets": threshold
        }

    elif diagram_type == "architecture":
        # Count components and integrations
        components = count_components(prd)
        integrations = count_external_integrations(prd)

        threshold = components >= 3 or integrations >= 1

        return threshold, {
            "components": components,
            "integrations": integrations,
            "threshold": "3+ components OR 1+ external integration",
            "meets": threshold
        }

    elif diagram_type == "sequence":
        # Count service interactions
        services = count_interacting_services(prd)
        async_ops = count_async_operations(prd)

        threshold = services >= 3 or async_ops >= 1

        return threshold, {
            "services": services,
            "async_operations": async_ops,
            "threshold": "3+ services OR 1+ async operation",
            "meets": threshold
        }

    return False, {}

def count_user_flow_steps(prd):
    """Count sequential steps in user stories."""
    # Heuristic: count numbered steps or "then" occurrences
    text = prd.lower()
    step_count = text.count("step ") + text.count("then ") + text.count("next ")
    return max(step_count, len(prd.user_stories))  # At least one step per story

def count_decision_points(prd):
    """Count decision points (if/else, options, branches)."""
    text = prd.lower()
    decision_keywords = ["if ", "else", "either", "or ", "choose", "select", "option"]
    return sum(text.count(keyword) for keyword in decision_keywords)
```

---

## Review Checklist

Use this checklist to validate review completeness:

### Ralph Execution Readiness

- [ ] Each user story is small enough (< 3 sentences description, < 8 criteria)
- [ ] No red flag words in stories ("entire", "complete", "all", "system")
- [ ] Stories are ordered by dependency (schema → backend → UI → integration)
- [ ] No story depends on a later story
- [ ] Every story has "Typecheck passes" criterion
- [ ] Every story has "Tests pass" criterion
- [ ] Stories with testable logic have "Unit tests verify: [specifics]" criterion
- [ ] UI stories have "Verify in browser using Selenium MCP" criterion
- [ ] All acceptance criteria are verifiable (no vague terms)
- [ ] Final integration tests story exists with lowest priority
- [ ] Integration tests cover complete user flows from PRD

### PRD Quality

- [ ] Goals are specific and measurable
- [ ] User stories follow "As a [user], I want [feature] so that [benefit]" format
- [ ] Functional requirements are numbered (FR-1, FR-2, etc.)
- [ ] Functional requirements are specific and unambiguous
- [ ] Non-goals define clear scope boundaries
- [ ] Success metrics are defined (if applicable)
- [ ] Open questions are documented (if any exist)

### Diagram Quality (if applicable)

- [ ] User flow diagrams meet threshold: 3+ steps OR 2+ decisions
- [ ] Architecture diagrams meet threshold: 3+ components OR 1+ integration
- [ ] Sequence diagrams meet threshold: 3+ services OR 1+ async operation
- [ ] Diagrams within complexity limits (10/8/7 nodes)
- [ ] Diagram judgment section explains inclusion/exclusion reasoning
- [ ] Mermaid syntax is valid (basic validation)

### Reference Quality (if applicable)

- [ ] References are for specialized tech only (not React, Node.js, etc.)
- [ ] At least 3 citations if References section exists
- [ ] URLs are from official domains (docs.*, official GitHub)
- [ ] Each reference supports a specific recommendation in PRD
- [ ] No orphaned references (all cited in text)

### Gap Analysis

- [ ] No critical information is missing
- [ ] No requirements are ambiguous (can be interpreted multiple ways)
- [ ] No areas requiring research before implementation
- [ ] No unstated assumptions that could cause confusion

---

## Example Review Output

### Perfect PRD (No Issues)

```markdown
# PRD Review Report

**Generated:** 2025-01-30 14:30:22
**Original PRD:** tasks/prd-user-auth.md

---

## Auto-Fixes Applied (3 changes)

### Formatting (3 changes)
- ✓ Added "Typecheck passes" to US-007 (was missing)
- ✓ Fixed markdown formatting: added newlines before 2 section headings
- ✓ Fixed inconsistent checkbox format in 4 acceptance criteria

---

## Executive Summary

Excellent PRD! No critical or important issues found.

**Readiness:** 10/10 (Ready for /ralph conversion)

This PRD meets all Ralph execution requirements and quality standards. All stories are properly sized, dependencies are correctly ordered, and acceptance criteria are specific and verifiable.

---

## Strengths

- ✓ All 7 user stories are well-sized (< 3 sentences, < 6 criteria each)
- ✓ Perfect dependency ordering: schema → API → UI → integration
- ✓ Acceptance criteria are specific and verifiable (no vague terms)
- ✓ Integration tests story (US-007) covers complete flows
- ✓ Diagrams meet worthiness thresholds (user flow: 5 steps, 3 decisions)
- ✓ References are well-sourced (4 citations, all official docs)
- ✓ Clear goals with measurable success metrics
- ✓ Functional requirements are unambiguous
- ✓ Non-goals prevent scope creep

---

## Issues Found

No issues found! ✓

---

## Recommendations

**Next Steps:**
1. ✓ PRD is ready for conversion: `/ralph tasks/prd-user-auth.md`
2. ✓ Review saved to: `tasks/review-user-auth-20250130-143022.md`
3. ✓ After conversion, start execution: `./ralph.sh`

---

## Review Metadata

**Analysis Summary:**
- Auto-fixes applied: 3 minor formatting changes
- Manual issues found: 0 critical, 0 important, 0 suggestions
- Readiness score: 10/10

**Review Checklist:**
- [x] Story sizing validated (all stories well-sized)
- [x] Dependency order correct (perfect ordering)
- [x] Required criteria present (all stories compliant)
- [x] Acceptance criteria quality high (no vague terms)
- [x] Integration tests story present and comprehensive
- [x] Goals clear and measurable
- [x] Functional requirements unambiguous
- [x] Non-goals well-defined
- [x] Diagrams meet quality standards
- [x] References properly sourced

---
```

### Poor PRD (Many Issues)

```markdown
# PRD Review Report

**Generated:** 2025-01-30 15:45:10
**Original PRD:** tasks/prd-notification-system.md
**Review Run:** 1

---

## Auto-Fixes Applied (12 changes)

### Required Criteria (8 changes)
- ✓ Added "Typecheck passes" to US-001, US-002, US-003, US-005, US-006
- ✓ Added "Tests pass" to US-001, US-004
- ✓ Added "Verify in browser using Selenium MCP" to US-003, US-004, US-005

### Story Numbering (3 changes)
- ✓ Renumbered US-008 → US-006 (filled gap after US-005)
- ✓ Fixed duplicate US-004 → US-004, US-005
- ✓ Normalized US-7 → US-007 (zero-padded)

### Formatting (1 change)
- ✓ Fixed markdown: added newlines before 5 section headings

---

## Executive Summary

This PRD has good intent but requires significant revision before Ralph can execute it. Multiple stories are too large, several dependencies are out of order, and many acceptance criteria are too vague.

**Readiness:** 3/10 (Needs Work - requires 8 critical fixes)

**Key Issues:**
- 3 stories are too large and must be split
- 2 dependency ordering violations
- Missing integration tests story
- 6 vague acceptance criteria need specificity
- 2 ambiguous functional requirements

**Recommendation:** Address all 8 critical issues first, then re-run review. Expect 2-3 review cycles before PRD is ready for /ralph conversion.

---

## Issues Found

### Critical (Blocks Ralph Execution) - 8 issues

- [ ] **US-001: Too Large** - Story "Add notification system" is too broad
  - **Location:** Line 23, User Stories section
  - **Evidence:** 6 sentences, uses word "entire", has 12 acceptance criteria
  - **Fix:** Split into:
    1. US-001a: Add notifications table schema
    2. US-001b: Create notification service API
    3. US-001c: Add notification bell UI component
    4. US-001d: Add notification list dropdown
    5. US-001e: Add mark-as-read functionality

- [ ] **US-002: Dependency Issue** - UI story before its backend dependency
  - **Location:** Line 56
  - **Evidence:** US-002 (priority 2) displays notifications but US-003 (priority 3) creates the fetch API
  - **Fix:** Swap priorities: US-003 → priority 2, US-002 → priority 3

[... 6 more critical issues ...]

---

### Important (Clarity/Completeness) - 7 issues

- [ ] **FR-1: Ambiguous** - "Users can receive notifications" lacks specifics
  - **Location:** Line 145
  - **Problem:** Doesn't specify: notification types, triggers, delivery method, timing
  - **Fix:** Split into specific requirements:
    - "FR-1a: Users receive notification when task is assigned to them (real-time)"
    - "FR-1b: Users receive notification when task status changes (real-time)"
    - "FR-1c: Users receive notification when mentioned in comments (real-time)"

[... 6 more important issues ...]

---

### Suggestions (Optional Improvements) - 3 issues

- [ ] **Missing Diagram:** Consider architecture diagram
  - **Analysis:** Feature has 5 components and 2 external integrations
  - **Threshold:** Architecture diagrams justified if 3+ components OR 1+ integration (MEETS)
  - **Suggested:** Database ↔ Notification Service ↔ WebSocket Server ↔ UI ↔ Push Service

[... 2 more suggestions ...]

---

## Proposed Changes

[... detailed current vs proposed for each issue ...]

---

## Recommendations

**Immediate Actions (Required):**
1. Split US-001 into 5 focused stories
2. Split US-004 into 3 focused stories
3. Split US-006 into 2 focused stories
4. Fix dependency order: swap US-002/US-003 priorities
5. Fix dependency order: swap US-005/US-006 priorities
6. Add US-007 integration tests story (final story, lowest priority)
7. Improve specificity of 6 vague acceptance criteria
8. Split ambiguous FR-1 and FR-4 into specific requirements

**After Addressing Critical Issues:**
9. Re-run `/prd-reviewer tasks/prd-notification-system.md`
10. Verify all critical issues resolved
11. Address any remaining important issues

**Optional Enhancements:**
12. Add architecture diagram (meets threshold)
13. Add References section with WebSocket and push notification docs
14. Expand integration tests edge case coverage

**Estimated Effort:**
- Critical fixes: ~60 minutes (story splitting, dependency fixes)
- Important fixes: ~20 minutes (improve specificity)
- Suggestions: ~15 minutes (optional)

---

## Review Metadata

**Analysis Summary:**
- Auto-fixes applied: 12 changes
- Manual issues found: 8 critical, 7 important, 3 suggestions
- Total issues: 18 requiring manual review
- Readiness score: 3/10

**Review Dimensions:**
- ✓ Ralph Execution Readiness: 8 critical issues (BLOCKS)
- ✓ Clarity and Completeness: 7 important issues
- ✓ Diagram Quality: Not applicable (no diagrams, but recommended)
- ✓ Reference Quality: Not applicable (no references, but recommended)
- ✓ Gap Analysis: 3 suggestions

**Review Checklist:**
- [ ] Story sizing validated - FAILED (3 stories too large)
- [ ] Dependency order correct - FAILED (2 ordering violations)
- [x] Required criteria verified (auto-fixed)
- [ ] Acceptance criteria quality - FAILED (6 vague criteria)
- [ ] Integration tests story - FAILED (missing)
- [x] Goals clarity (good)
- [ ] Functional requirements - FAILED (2 ambiguous)
- [x] Non-goals defined (good)
- [ ] Diagram quality (not applicable, but recommended)
- [ ] Reference quality (not applicable, but recommended)

---
```

---

## Error Handling and Edge Cases

### Missing or Invalid PRD

**File not found:**
```
❌ Error: PRD file not found

Path: tasks/prd-feature.md

Did you mean one of these?
  1. tasks/prd-task-status.md
  2. tasks/prd-auth-system.md
  3. tasks/prd-notification-system.md

Usage:
  /prd-reviewer <path-to-prd.md>
  /prd-reviewer  (will prompt to select from tasks/*.md)
```

**No PRD files in tasks directory:**
```
❌ Error: No PRD files found in tasks/ directory

To create a PRD:
  /prd [feature description]

Then review it:
  /prd-reviewer tasks/prd-[name].md
```

### Empty or Malformed PRD

**Incomplete structure:**
```
⚠️ Warning: PRD appears incomplete

Missing critical sections:
- [ ] User Stories section
- [ ] Functional Requirements section
- [ ] Acceptance Criteria in stories

Found sections:
- [x] Introduction
- [x] Goals

Cannot perform meaningful review without User Stories.

Please:
1. Ensure PRD has basic structure
2. Run /prd to generate complete PRD template
3. Then run /prd-reviewer again
```

**Completely empty file:**
```
❌ Error: PRD file is empty

File: tasks/prd-feature.md (0 bytes)

Please:
1. Run /prd to generate a PRD
2. Or paste PRD content into the file
3. Then run /prd-reviewer again
```

### File Write Errors

**Review report save fails:**
```
⚠️ Warning: Could not save review report

Attempted path: tasks/review-feature-20250130-143022.md
Error: Permission denied

The review report is displayed above. You can:
1. Copy the report from terminal output
2. Manually create the file with write permissions
3. Check directory permissions: ls -la tasks/

Review continues...
```

**PRD update fails:**
```
❌ Error: Could not update PRD file

File: tasks/prd-feature.md
Error: File is read-only

Auto-fixes could not be applied. Options:
1. Make file writable: chmod u+w tasks/prd-feature.md
2. Manually apply the 8 auto-fixes listed above
3. Re-run /prd-reviewer after fixing permissions

Review report saved to: tasks/review-feature-20250130-143022.md
```

### Perfect PRD (No Issues)

Already shown in Example Review Output section above.

### Malformed Review Report (Recovery)

**If review generation fails mid-process:**
```
⚠️ Warning: Review generation encountered an error

Partial review completed:
- ✓ Auto-fixes applied: 8 changes (saved to PRD)
- ✓ Ralph Execution analysis: complete
- ✓ Clarity analysis: complete
- ✗ Diagram analysis: ERROR (invalid Mermaid syntax)

Error: Could not parse diagram at line 234

Continuing with partial review...
```

**Graceful degradation:**
- Complete what can be completed
- Note what failed
- Provide actionable next steps
- Never crash entirely

---

## Integration with Skills Workflow

This skill integrates seamlessly with the existing PRD → Ralph workflow:

### Complete Workflow

```
┌─────────────────────────────────────────────────────────────┐
│  1. Generate Initial PRD                                    │
│     /prd [feature description]                              │
│     → Creates: tasks/prd-feature.md                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  2. Review PRD (Iteration 1)                                │
│     /prd-reviewer tasks/prd-feature.md                      │
│     → Auto-fixes: 8 changes (applied immediately)           │
│     → Manual issues: 6 critical, 4 important                │
│     → Creates: tasks/review-feature-20250130-143022.md      │
│     → User approves manual fixes                            │
│     → Updates: tasks/prd-feature.md (all fixes applied)     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  3. Review PRD (Iteration 2)                                │
│     /prd-reviewer tasks/prd-feature.md                      │
│     → Auto-fixes: 1 change (minor formatting)               │
│     → Manual issues: 0 critical, 2 important                │
│     → Creates: tasks/review-feature-20250130-151500.md      │
│     → User approves manual fixes                            │
│     → Updates: tasks/prd-feature.md                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  4. Final Review (Iteration 3)                              │
│     /prd-reviewer tasks/prd-feature.md                      │
│     → Auto-fixes: 0 changes                                 │
│     → Manual issues: 0 critical, 0 important                │
│     → Readiness: 10/10 ✓                                    │
│     → Creates: tasks/review-feature-20250130-153000.md      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  5. Convert to Ralph Format                                 │
│     /ralph tasks/prd-feature.md                             │
│     → Creates: prd.json (Ralph execution format)            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  6. Execute with Ralph Agent                                │
│     ./ralph.sh                                              │
│     → Ralph reads prd.json                                  │
│     → Executes user stories in priority order               │
│     → Updates progress.txt and prd.json                     │
└─────────────────────────────────────────────────────────────┘
```

### Key Integration Points

**Preserves PRD Structure:**
- Auto-fixes don't break Mermaid diagrams
- Manual fixes maintain markdown formatting
- Changes preserve reference links
- Checkbox format stays consistent

**Complements /ralph Skill:**
- Validates same requirements /ralph enforces
- Catches issues before conversion fails
- Reduces /ralph rejection rate
- Speeds up PRD → prd.json → execution cycle

**Git-Friendly:**
- All changes tracked in git
- Review reports are text files (diffable)
- Clear commit points: after each review iteration
- Easy rollback if needed

**Iterative by Design:**
- Each review is full re-analysis (no stale cache)
- Review reports create audit trail
- User can compare reports across iterations
- Shows progress toward clean PRD

---

## Tips for Best Results

### For Users

**Run early and often:**
- Don't wait until PRD is "done" to review
- Run after first draft to catch major issues
- Run again after addressing critical issues
- Final run before /ralph conversion

**Trust auto-fixes:**
- Auto-fixes are non-controversial (required criteria, formatting)
- They save time by handling obvious issues
- Focus your attention on manual issues

**Address critical issues first:**
- Critical issues block Ralph execution
- Important issues reduce clarity but don't block
- Suggestions are optional improvements

**Iterate until clean:**
- Expect 2-3 review cycles for complex features
- Each cycle should find fewer issues
- Clean PRD = smooth Ralph execution

**Use review reports as learning:**
- Review reports teach PRD quality standards
- Patterns emerge: common mistakes, best practices
- Over time, first drafts get cleaner

### For Skill Implementation

**Fail gracefully:**
- Never crash on unexpected input
- Always provide actionable next steps
- Complete partial reviews if possible
- Preserve user work (auto-fixes applied even if manual review fails)

**Be specific:**
- Don't just flag issues, explain why and how to fix
- Show before/after for proposed changes
- Provide rationale for each recommendation
- Reference line numbers for easy navigation

**Optimize for speed:**
- Review should complete in < 2 minutes
- Parallelize analysis where possible (dimensions are independent)
- Don't do deep parsing or complex NLP
- Use heuristics and keywords for detection

**Be consistent:**
- Use same detection logic across runs
- Don't flip-flop on recommendations
- Track review metadata for consistency
- Apply same standards to all PRDs

---

## Success Criteria

This skill is successful when:

- ✓ Users catch PRD issues before /ralph conversion
- ✓ /ralph rejection rate decreases (fewer invalid PRDs)
- ✓ Ralph execution success rate increases (better-prepared stories)
- ✓ Users learn PRD quality standards through review feedback
- ✓ Review reports create audit trail of PRD evolution
- ✓ Iterative refinement converges to clean PRD in 2-3 cycles
- ✓ Auto-fixes reduce manual review burden by ~40%
- ✓ Review completes quickly (< 2 minutes) to encourage iteration

---

## Skill Metadata

**Version:** 1.0.0
**Last Updated:** 2025-01-30
**Maintainer:** Ralph Team
**Dependencies:** None (uses only built-in tools)
**Triggers:** "review prd", "validate prd", "check prd quality", "prd-reviewer", "improve prd"

---
