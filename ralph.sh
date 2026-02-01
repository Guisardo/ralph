#!/bin/bash
# Ralph Wiggum - Long-running AI agent loop
# Usage: ./ralph.sh [--tool amp|claude] [--interactive|-i] [max_iterations]
#
# Options:
#   --tool amp|claude    Select the AI tool to use (default: amp)
#   --interactive, -i    Enable interactive mode with tool approval prompts
#   max_iterations       Maximum number of iterations (default: 10)

set -e

# Parse arguments
TOOL="amp"  # Default to amp for backwards compatibility
MAX_ITERATIONS=10
INTERACTIVE=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --tool)
      TOOL="$2"
      shift 2
      ;;
    --tool=*)
      TOOL="${1#*=}"
      shift
      ;;
    --interactive|-i)
      INTERACTIVE=true
      shift
      ;;
    *)
      # Assume it's max_iterations if it's a number
      if [[ "$1" =~ ^[0-9]+$ ]]; then
        MAX_ITERATIONS="$1"
      fi
      shift
      ;;
  esac
done

# Validate tool choice
if [[ "$TOOL" != "amp" && "$TOOL" != "claude" ]]; then
  echo "Error: Invalid tool '$TOOL'. Must be 'amp' or 'claude'."
  exit 1
fi

# Warn if interactive mode with amp (not supported)
if [[ "$INTERACTIVE" == true && "$TOOL" == "amp" ]]; then
  echo "Warning: Interactive mode is only supported with Claude. Ignoring --interactive flag."
  INTERACTIVE=false
fi
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PRD_FILE="$PWD/ralph/prd.json"
PROGRESS_FILE="$PWD/ralph/progress.txt"
ARCHIVE_DIR="$SCRIPT_DIR/archive"
LAST_BRANCH_FILE="$SCRIPT_DIR/.last-branch"

if [[ "$TOOL" == "amp" ]]; then
  # prompt.md with prd.json and progress.txt path substituted
  sed -e "s|\`prd.json\`|\`$PRD_FILE\`|" -e "s|\`progress.txt\`|\`$PROGRESS_FILE\`|" "$SCRIPT_DIR/prompt.md" > "$PWD/ralph/prompt.md.tmp"
else
  # claude prompt content with prd.json and progress.txt path substituted
  sed -e "s|\`prd.json\`|\`$PRD_FILE\`|" -e "s|\`progress.txt\`|\`$PROGRESS_FILE\`|" "$SCRIPT_DIR/CLAUDE.md" > "$PWD/ralph/prompt.md.tmp"
fi

# Archive previous run if branch changed
if [ -f "$PRD_FILE" ] && [ -f "$LAST_BRANCH_FILE" ]; then
  CURRENT_BRANCH=$(jq -r '.branchName // empty' "$PRD_FILE" 2>/dev/null || echo "")
  LAST_BRANCH=$(cat "$LAST_BRANCH_FILE" 2>/dev/null || echo "")
  
  if [ -n "$CURRENT_BRANCH" ] && [ -n "$LAST_BRANCH" ] && [ "$CURRENT_BRANCH" != "$LAST_BRANCH" ]; then
    # Archive the previous run
    DATE=$(date +%Y-%m-%d)
    # Strip "ralph/" prefix from branch name for folder
    FOLDER_NAME=$(echo "$LAST_BRANCH" | sed 's|^ralph/||')
    ARCHIVE_FOLDER="$ARCHIVE_DIR/$DATE-$FOLDER_NAME"
    
    echo "Archiving previous run: $LAST_BRANCH"
    mkdir -p "$ARCHIVE_FOLDER"
    [ -f "$PRD_FILE" ] && cp "$PRD_FILE" "$ARCHIVE_FOLDER/"
    [ -f "$PROGRESS_FILE" ] && cp "$PROGRESS_FILE" "$ARCHIVE_FOLDER/"
    echo "   Archived to: $ARCHIVE_FOLDER"
    
    # Reset progress file for new run
    echo "# Ralph Progress Log" > "$PROGRESS_FILE"
    echo "Started: $(date)" >> "$PROGRESS_FILE"
    echo "---" >> "$PROGRESS_FILE"
  fi
fi

# Track current branch
if [ -f "$PRD_FILE" ]; then
  CURRENT_BRANCH=$(jq -r '.branchName // empty' "$PRD_FILE" 2>/dev/null || echo "")
  if [ -n "$CURRENT_BRANCH" ]; then
    echo "$CURRENT_BRANCH" > "$LAST_BRANCH_FILE"
  fi
fi

# Initialize progress file if it doesn't exist
if [ ! -f "$PROGRESS_FILE" ]; then
  echo "# Ralph Progress Log" > "$PROGRESS_FILE"
  echo "Started: $(date)" >> "$PROGRESS_FILE"
  echo "---" >> "$PROGRESS_FILE"
fi

INTERACTIVE_MSG=""
if [[ "$INTERACTIVE" == true ]]; then
  INTERACTIVE_MSG=" (interactive)"
fi
echo "Starting Ralph - Tool: $TOOL$INTERACTIVE_MSG - Max iterations: $MAX_ITERATIONS"

# Function to map reasoning level to model
map_reasoning_to_model() {
  local reasoning_level="$1"
  case "$reasoning_level" in
    HIGH) echo "opus" ;;
    LOW) echo "haiku" ;;
    MID|*) echo "sonnet" ;;  # Default to sonnet for MID or invalid values
  esac
}

# Create temporary output file for streaming
OUTPUT_FILE="$PWD/ralph/.output.tmp"

for i in $(seq 1 $MAX_ITERATIONS); do
  echo ""
  echo "==============================================================="
  echo "  Ralph Iteration $i of $MAX_ITERATIONS ($TOOL)"
  echo "==============================================================="

  # Extract reasoning level from current story (only for claude tool)
  MODEL="sonnet"  # Default model
  if [[ "$TOOL" == "claude" ]] && [ -f "$PRD_FILE" ]; then
    # Get reasoning level of first incomplete story
    REASONING_LEVEL=$(jq -r '.userStories[] | select(.passes != true) | .reasoningLevel' "$PRD_FILE" 2>/dev/null | head -1)

    # Validate that reasoning level exists (required field)
    if [ -z "$REASONING_LEVEL" ] || [ "$REASONING_LEVEL" == "null" ]; then
      echo "ERROR: Missing reasoningLevel field in prd.json for current story"
      echo "All user stories must have a reasoningLevel field (HIGH, MID, or LOW)"
      exit 1
    fi

    MODEL=$(map_reasoning_to_model "$REASONING_LEVEL")
    echo "Story reasoning level: $REASONING_LEVEL → Using model: $MODEL"
  fi

  # Print story id
  if [ -f "$PRD_FILE" ]; then
    STORY_ID=$(jq -r '.userStories[] | select(.passes != true) | .id' "$PRD_FILE" 2>/dev/null | head -1)
    if [ -n "$STORY_ID" ] && [ "$STORY_ID" != "null" ]; then
      echo "Current story ID: $STORY_ID"
    fi
  fi

  # Run the selected tool with the ralph prompt
  if [[ "$TOOL" == "amp" ]]; then
    # Run Amp and stream output to file + console
    cat "$PWD/ralph/prompt.md.tmp" | amp --dangerously-allow-all > "$OUTPUT_FILE" 2>&1 &
    AMP_PID=$!

    # Stream output in real-time
    tail -f "$OUTPUT_FILE" 2>/dev/null &
    TAIL_PID=$!

    # Wait for Amp to finish
    wait $AMP_PID || true
    EXIT_CODE=$?

    # Stop tailing and give it a moment to finish
    kill $TAIL_PID 2>/dev/null || true
    wait $TAIL_PID 2>/dev/null || true
    sleep 0.5

    # Read final output for completion check
    OUTPUT=$(cat "$OUTPUT_FILE" 2>/dev/null || echo "")
  else
    if [[ "$INTERACTIVE" == true ]]; then
      # Claude Code: interactive mode - user approves tool usage, no --print for interactive UI
      claude --model "$MODEL" < "$PWD/ralph/prompt.md.tmp" || true
      OUTPUT=""  # In interactive mode, we can't capture output easily
    else
      # Claude Code: autonomous mode with real-time streaming output
      # Use stream-json format with print, verbose, and partial messages for real-time output
      # Stream to console while capturing full output for completion check
      claude --model "$MODEL" --dangerously-skip-permissions --print \
        --output-format stream-json --verbose --include-partial-messages \
        < "$PWD/ralph/prompt.md.tmp" 2>&1 | tee "$OUTPUT_FILE" | \
        jq -rj 'select(.type == "stream_event" and .event.delta.type? == "text_delta") | .event.delta.text'
      EXIT_CODE=${PIPESTATUS[0]}

      # Extract text from stream-json output for completion check
      OUTPUT=$(jq -rj 'select(.type == "stream_event" and .event.delta.type? == "text_delta") | .event.delta.text' "$OUTPUT_FILE" 2>/dev/null || echo "")
    fi
  fi
  
  # Check for completion signal
  if [[ "$INTERACTIVE" == true ]]; then
    # In interactive mode, check PRD file for completion (all stories pass)
    if [ -f "$PRD_FILE" ]; then
      INCOMPLETE=$(jq '[.userStories[] | select(.passes != true)] | length' "$PRD_FILE" 2>/dev/null || echo "1")
      if [[ "$INCOMPLETE" == "0" ]]; then
        rm -f "$OUTPUT_FILE"
        echo ""
        echo "Ralph completed all tasks!"
        echo "Completed at iteration $i of $MAX_ITERATIONS"
        exit 0
      fi
    fi
  elif echo "$OUTPUT" | grep -q "<promise>COMPLETE</promise>"; then
    rm -f "$OUTPUT_FILE"
    echo ""
    echo "Ralph completed all tasks!"
    echo "Completed at iteration $i of $MAX_ITERATIONS"
    exit 0
  fi

  # Clean up output file for next iteration
  rm -f "$OUTPUT_FILE"

  echo "Iteration $i complete. Continuing..."
  sleep 2
done

# Final cleanup
rm -f "$OUTPUT_FILE"

echo ""
echo "Ralph reached max iterations ($MAX_ITERATIONS) without completing all tasks."
echo "Check $PROGRESS_FILE for status."
exit 1
