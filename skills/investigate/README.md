# Investigate Skill - Subagent Architecture

## Overview

This skill implements hypothesis-driven investigation through orchestrated subagents. Each investigation phase runs in an isolated context to prevent context overflow.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Main Orchestrator                            │
│                      (SKILL.md)                                  │
│  - User interaction (intake, confirmations)                      │
│  - Flow control decisions                                        │
│  - Iteration management                                          │
│  - Summary display                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Session File                                 │
│            .claude/debug-sessions/{sessionId}.json               │
│  - Shared state between all subagents                           │
│  - Hypotheses, logs, fixes, iteration count                     │
└─────────────────────────────────────────────────────────────────┘
                              │
       ┌──────────────────────┼──────────────────────┐
       ▼                      ▼                      ▼
┌─────────────┐        ┌─────────────┐        ┌─────────────┐
│   Haiku     │        │   Sonnet    │        │    Opus     │
│  Subagents  │        │  Subagents  │        │  Subagents  │
│             │        │             │        │             │
│ - Session   │        │ - Research  │        │ - Hypothesis│
│ - Instrument│        │ - Verify    │        │ - Analyze   │
│ - Reproduce │        │             │        │ - Fix       │
│ - Cleanup   │        │             │        │             │
└─────────────┘        └─────────────┘        └─────────────┘
```

## Model Distribution

| Task Type | Model | Rationale |
|-----------|-------|-----------|
| Session management | Haiku | Simple file operations |
| Hypothesis generation | Opus | Complex code analysis |
| Instrumentation | Haiku | Pattern-based insertion |
| Test reproduction | Haiku | Command execution |
| Log analysis | Opus | Pattern correlation |
| Web research | Sonnet | Balanced reasoning for research |
| Fix application | Opus | Deep understanding needed |
| Verification | Sonnet | Compare logs, validate fix |
| Cleanup | Haiku | Pattern-based removal |

## Context Management

### Problem Solved
The original 1665-line skill tried to handle everything in one context, causing overflow as:
- File contents accumulated
- Log outputs filled context
- Code examples repeated

### Solution
Each phase runs in isolated subagent context:
1. Subagent receives focused prompt (~60 lines)
2. Subagent reads session file for state
3. Subagent performs task
4. Subagent updates session file
5. Subagent returns summary (not full content)

### Benefits
- Main context stays small (~500 lines)
- Each subagent context is focused
- Session file is shared memory (not context)
- Deep reasoning (Opus) for complex analysis
- Balanced reasoning (Sonnet) for research and verification
- Fast/cheap (Haiku) handles routine tasks

## File Structure

```
skills/investigate/
├── SKILL.md           # Main orchestrator (552 lines)
├── README.md          # This file
└── agents/            # Subagent definitions
    ├── debug-session.md     # Session file management
    ├── debug-hypothesis.md  # Hypothesis generation
    ├── debug-instrument.md  # Code instrumentation
    ├── debug-reproduce.md   # Test execution
    ├── debug-analyze.md     # Log analysis
    ├── debug-research.md    # Web research
    ├── debug-fix.md         # Fix application
    ├── debug-verify.md      # Fix verification
    └── debug-cleanup.md     # Instrumentation removal
```

## Usage

```bash
# Start investigation
/investigate

# Skill will:
# 1. Ask intake questions (main context)
# 2. Spawn subagents for each phase
# 3. Use session file as shared state
# 4. Present summary when complete
```

## How Subagents Work

The skill uses Claude Code's Task tool to spawn subagents:

```
Task tool call:
  subagent_type: general-purpose
  model: haiku|sonnet|opus
  prompt: <focused phase instructions>
```

The agent definition files in `agents/` directory serve two purposes:

1. **Reference documentation** - Detailed instructions for each phase
2. **Optional installation** - Can be installed as project/user agents for direct use

### Installation (Required)

The investigate skill requires its subagent definitions to be installed:

```bash
# Install to user agents (available in all projects)
mkdir -p ~/.claude/agents
cp skills/investigate/agents/*.md ~/.claude/agents/
```

Or for project-level installation:
```bash
# Install to project agents (available in this project only)
mkdir -p .claude/agents
cp skills/investigate/agents/*.md .claude/agents/
```

The SKILL.md orchestrates these subagents using the Task tool with focused prompts for each phase.

## PRD Compliance

All requirements from `tasks/prd-claude-code-debug-skill.md` are preserved:

- ✅ US-001: Issue intake with structured questions
- ✅ US-002: Automated hypothesis generation (3-5 ranked)
- ✅ US-003: Logging infrastructure review
- ✅ US-004: Language-adaptive instrumentation
- ✅ US-005: Automated/manual reproduction
- ✅ US-006: Log analysis and hypothesis confirmation
- ✅ US-007: Web research for best practices
- ✅ US-008: Research-informed fix application
- ✅ US-009: Fix verification with rollback
- ✅ US-010: Instrumentation cleanup
- ✅ US-011: Debug summary generation
- ✅ US-012: Multi-file hypothesis tracking
- ✅ US-013: Session persistence
- ✅ US-014: Flaky test handling
- ✅ US-015: Rollback on max iterations

## Investigating the Investigator

If issues occur with the skill itself:

1. Check session file: `.claude/debug-sessions/*.json`
2. Check log files: `.claude/debug-sessions/*-logs.txt`
3. Verify subagent prompts match expected behavior
4. Ensure session file is being updated between phases
