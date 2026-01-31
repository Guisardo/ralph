/**
 * Debug Session Data Structures
 *
 * These types define the structure for persistent debug sessions that can be
 * saved and resumed across interruptions.
 */

/**
 * Unique identifier for a debug session
 * Format: debug-YYYYMMDD-HHMMSS-[issue-hash]
 */
export type SessionId = string;

/**
 * Represents a single hypothesis about the root cause of an issue
 */
export interface Hypothesis {
  /** Unique identifier for this hypothesis */
  id: string;

  /** Human-readable description of the potential root cause */
  description: string;

  /** Internal confidence score (0-1, not exposed to user) */
  confidence: number;

  /** Files and line ranges this hypothesis affects */
  affectedFiles: Array<{
    path: string;
    lineRanges: Array<{start: number; end: number}>;
  }>;

  /** Expected failure mode (null reference, race condition, etc.) */
  failureMode: 'null_reference' | 'race_condition' | 'incorrect_logic' |
                'type_error' | 'cross_service_communication' | 'other';

  /** Status after log analysis */
  status: 'pending' | 'confirmed' | 'rejected' | 'inconclusive';

  /** Evidence from logs supporting this hypothesis */
  evidence?: string[];
}

/**
 * Tracks an instrumented file and what was added
 */
export interface InstrumentedFile {
  /** Path to the instrumented file */
  path: string;

  /** Which hypothesis IDs this instrumentation supports */
  hypothesisIds: string[];

  /** Locations where instrumentation was added */
  instrumentationPoints: Array<{
    lineNumber: number;
    markerStart: string; // e.g., "// DEBUG_HYP_1_START"
    markerEnd: string;   // e.g., "// DEBUG_HYP_1_END"
  }>;
}

/**
 * Research findings from web search
 */
export interface ResearchFinding {
  /** Search query used */
  query: string;

  /** Source URL */
  url: string;

  /** Source type for prioritization */
  sourceType: 'official_docs' | 'github_issue' | 'stackoverflow' | 'blog' | 'other';

  /** Key takeaways from this source */
  summary: string;

  /** Recommended fix approach if any */
  recommendedApproach?: string;

  /** Security implications mentioned */
  securityImplications?: string[];

  /** Deprecated approaches to avoid */
  deprecatedApproaches?: string[];

  /** Timestamp of research */
  timestamp: string;
}

/**
 * Tracks a fix attempt
 */
export interface FixAttempt {
  /** Unique identifier for this fix attempt */
  id: string;

  /** Hypothesis this fix addresses */
  hypothesisId: string;

  /** Description of what the fix does */
  description: string;

  /** Why this approach was chosen */
  rationale: string;

  /** Files modified by this fix */
  filesModified: string[];

  /** Git commit SHA for this fix */
  commitSha: string;

  /** Verification result */
  verificationResult: 'passed' | 'failed' | 'pending';

  /** Logs captured during verification */
  verificationLogs?: string;

  /** Whether this fix was rolled back */
  rolledBack: boolean;

  /** Reason for rollback if applicable */
  rollbackReason?: string;

  /** Timestamp of fix attempt */
  timestamp: string;
}

/**
 * Complete state of a debug session
 */
export interface SessionState {
  /** Unique session identifier */
  sessionId: SessionId;

  /** When this session started */
  startTime: string;

  /** Git commit SHA at session start */
  initialCommit: string;

  /** Git branch at session start */
  initialBranch: string;

  /** Commit SHA after instrumentation was added */
  instrumentationCommit?: string;

  /** User-provided reproduction steps */
  reproductionSteps: string[];

  /** Expected vs actual behavior */
  expectedBehavior: string;
  actualBehavior: string;

  /** Error messages or stack traces */
  errorMessages?: string[];

  /** Whether this is a flaky issue */
  isFlaky: boolean;

  /** Number of consecutive successes needed for flaky issues */
  successCount: number;

  /** Generated hypotheses */
  hypotheses: Hypothesis[];

  /** Captured logs from test runs */
  logs: string[];

  /** The confirmed hypothesis (if any) */
  confirmedHypothesis?: Hypothesis;

  /** Research findings from web search */
  researchFindings: ResearchFinding[];

  /** All fix attempts */
  appliedFixes: FixAttempt[];

  /** Files that were instrumented */
  instrumentedFiles: InstrumentedFile[];

  /** Current iteration count (max 5) */
  cycleCount: number;

  /** Overall session status */
  status: 'in_progress' | 'success' | 'failed' | 'cancelled';

  /** When session was last updated */
  lastUpdated: string;
}
