/**
 * Issue Intake Module
 *
 * Handles gathering reproduction steps, detecting flaky issues, and creating
 * debug sessions with git state capture.
 */

import { SessionManager } from './SessionManager.js';
import type { SessionState } from './types.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as crypto from 'crypto';

const execAsync = promisify(exec);

/**
 * Flaky issue detection keywords
 */
const FLAKY_KEYWORDS = [
  'intermittent',
  'flaky',
  'sometimes',
  'occasionally',
  'randomly',
  'race condition',
  'timing',
] as const;

/**
 * User input for issue intake
 */
export interface IssueIntakeInput {
  /** Steps to reproduce the issue */
  reproductionSteps: string;

  /** Expected behavior */
  expectedBehavior: string;

  /** Actual behavior observed */
  actualBehavior: string;

  /** Error messages or stack traces */
  errorMessages: string;

  /** Optional: user-specified success count for flaky issues */
  flakySuccessCount?: number;
}

/**
 * Result of intake process
 */
export interface IntakeResult {
  /** Created session state */
  session: SessionState;

  /** Whether this is a resumption of existing session */
  resumed: boolean;
}

/**
 * Git state captured at session start
 */
interface GitState {
  /** Current commit SHA */
  commitSHA: string;

  /** Current branch name */
  branchName: string;

  /** Whether we're in a git repository */
  isGitRepo: boolean;
}

/**
 * Check if we're in a git repository and capture current state
 */
async function captureGitState(): Promise<GitState> {
  try {
    const { stdout: commitSHA } = await execAsync('git rev-parse HEAD');
    const { stdout: branchName } = await execAsync('git rev-parse --abbrev-ref HEAD');

    return {
      commitSHA: commitSHA.trim(),
      branchName: branchName.trim(),
      isGitRepo: true,
    };
  } catch (error) {
    // Not in a git repo or git not available
    return {
      commitSHA: '',
      branchName: '',
      isGitRepo: false,
    };
  }
}

/**
 * Create a temporary debug branch
 */
async function createDebugBranch(sessionId: string): Promise<void> {
  const branchName = `debug-session-${sessionId}`;

  try {
    await execAsync(`git checkout -b ${branchName}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create debug branch ${branchName}: ${errorMessage}`);
  }
}

/**
 * Detect if issue description contains flaky keywords
 */
export function detectFlakyIssue(text: string): boolean {
  const lowerText = text.toLowerCase();
  return FLAKY_KEYWORDS.some(keyword => lowerText.includes(keyword));
}

/**
 * Generate a session ID from issue description
 *
 * Format: debug-YYYYMMDD-HHMMSS-[8-char-hex-hash]
 */
export function generateSessionId(issueDescription: string): string {
  const now = new Date();

  // Format: YYYYMMDD-HHMMSS
  const datePart = now
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/T/, '-')
    .slice(0, 15); // YYYYMMDD-HHMMSS

  // Generate 8-character hex hash from issue description
  const hash = crypto
    .createHash('sha256')
    .update(issueDescription)
    .digest('hex')
    .slice(0, 8);

  return `debug-${datePart}-${hash}`;
}

/**
 * Check for existing session with same issue hash
 */
function findExistingSession(
  issueDescription: string,
  sessionManager: SessionManager
): string | null {
  // Use SessionManager's findSessionsByIssue method
  const sessions = sessionManager.findSessionsByIssue(issueDescription);

  // Return the first matching session (most recent)
  return sessions.length > 0 ? sessions[0] : null;
}

/**
 * Perform issue intake and create or resume debug session
 */
export async function performIntake(
  input: IssueIntakeInput,
  sessionManager: SessionManager,
  options: {
    /** Whether to force create new session even if existing one found */
    forceNew?: boolean;
  } = {}
): Promise<IntakeResult> {
  const issueDescription = [
    input.reproductionSteps,
    input.errorMessages,
  ].join('\n');

  // Check for existing session (unless forceNew)
  let existingSessionId: string | null = null;
  if (!options.forceNew) {
    existingSessionId = findExistingSession(issueDescription, sessionManager);
  }

  // If existing session found, load and return it
  if (existingSessionId) {
    const existingSession = sessionManager.loadSession(existingSessionId);
    return {
      session: existingSession,
      resumed: true,
    };
  }

  // Detect flaky issue
  const isFlaky = detectFlakyIssue(issueDescription);
  const flakySuccessCount = isFlaky
    ? (input.flakySuccessCount ?? 3) // Default: 3 consecutive passes
    : 1;

  // Capture git state
  const gitState = await captureGitState();

  // Split reproduction steps into array (if single string provided)
  const reproductionStepsArray = input.reproductionSteps
    .split('\n')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  // Split error messages into array (if provided)
  const errorMessagesArray = input.errorMessages
    ? input.errorMessages.split('\n').map(s => s.trim()).filter(s => s.length > 0)
    : undefined;

  // Create debug session using SessionManager's API
  const session = sessionManager.createSession({
    reproductionSteps: reproductionStepsArray,
    expectedBehavior: input.expectedBehavior,
    actualBehavior: input.actualBehavior,
    errorMessages: errorMessagesArray,
    initialCommit: gitState.commitSHA || '',
    initialBranch: gitState.branchName || '',
    isFlaky,
    successCount: flakySuccessCount,
  });

  // Create debug branch if in git repo
  if (gitState.isGitRepo) {
    await createDebugBranch(session.sessionId);
  }

  return {
    session,
    resumed: false,
  };
}
