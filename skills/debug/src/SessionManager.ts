/**
 * SessionManager
 *
 * Manages debug session persistence, including creation, loading, updating,
 * and deletion of session files stored in .claude/debug-sessions/
 *
 * Security: All paths are validated to prevent path traversal attacks
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { SessionState, SessionId } from './types';

export class SessionManager {
  private readonly sessionsDir: string;
  private readonly baseDir: string;

  /**
   * Creates a new SessionManager instance
   * @param baseDir - Base directory for the project (defaults to current working directory)
   */
  constructor(baseDir: string = process.cwd()) {
    // Store the resolved base directory
    this.baseDir = path.resolve(baseDir);

    // Validate that baseDir doesn't contain null bytes
    if (this.baseDir.includes('\0')) {
      throw new Error('Invalid base directory: contains null byte');
    }

    // Construct sessions directory using fixed path components
    this.sessionsDir = path.join(this.baseDir, '.claude', 'debug-sessions');
    this.ensureSessionsDirectoryExists();
  }

  /**
   * Ensures the debug sessions directory exists
   * @private
   */
  private ensureSessionsDirectoryExists(): void {
    if (!fs.existsSync(this.sessionsDir)) {
      fs.mkdirSync(this.sessionsDir, { recursive: true });
    }
  }

  /**
   * Validates a session ID to ensure it matches expected format
   * Prevents path traversal by ensuring session ID doesn't contain path separators
   * @private
   */
  private validateSessionId(sessionId: SessionId): void {
    // Session ID must match format: debug-YYYYMMDD-HHMMSS-[hash]
    const sessionIdPattern = /^debug-\d{14}-[a-f0-9]{8}$/;

    if (!sessionIdPattern.test(sessionId)) {
      throw new Error(`Invalid session ID format: ${sessionId}`);
    }

    // Additional security check: ensure no path traversal characters
    if (sessionId.includes('/') || sessionId.includes('\\') || sessionId.includes('\0')) {
      throw new Error(`Invalid session ID: contains path traversal characters`);
    }
  }

  /**
   * Generates a unique session ID
   * Format: debug-YYYYMMDD-HHMMSS-[issue-hash]
   *
   * @param issueDescription - Brief description of the issue for hashing
   * @returns Generated session ID
   */
  generateSessionId(issueDescription: string): SessionId {
    const now = new Date();
    const datePart = now.toISOString().replace(/[-:T]/g, '').slice(0, 14); // YYYYMMDDHHMMSS
    const issueHash = crypto
      .createHash('md5')
      .update(issueDescription)
      .digest('hex')
      .slice(0, 8);

    return `debug-${datePart}-${issueHash}`;
  }

  /**
   * Creates a new debug session
   *
   * @param params - Session creation parameters
   * @param params.reproductionSteps - Steps to reproduce the issue
   * @param params.expectedBehavior - What should happen
   * @param params.actualBehavior - What actually happens
   * @param params.errorMessages - Error messages or stack traces
   * @param params.initialCommit - Git commit SHA at session start
   * @param params.initialBranch - Git branch at session start
   * @param params.isFlaky - Whether issue is intermittent
   * @param params.successCount - Consecutive successes needed for flaky issues
   * @returns The created session state
   * @throws Error if session file cannot be written
   */
  createSession(params: {
    reproductionSteps: string[];
    expectedBehavior: string;
    actualBehavior: string;
    errorMessages?: string[];
    initialCommit: string;
    initialBranch: string;
    isFlaky: boolean;
    successCount: number;
  }): SessionState {
    const issueDescription = params.reproductionSteps.join(' ');
    const sessionId = this.generateSessionId(issueDescription);
    const now = new Date().toISOString();

    const session: SessionState = {
      sessionId,
      startTime: now,
      initialCommit: params.initialCommit,
      initialBranch: params.initialBranch,
      reproductionSteps: params.reproductionSteps,
      expectedBehavior: params.expectedBehavior,
      actualBehavior: params.actualBehavior,
      errorMessages: params.errorMessages,
      isFlaky: params.isFlaky,
      successCount: params.successCount,
      hypotheses: [],
      logs: [],
      researchFindings: [],
      appliedFixes: [],
      instrumentedFiles: [],
      cycleCount: 0,
      status: 'in_progress',
      lastUpdated: now,
    };

    this.saveSession(session);
    return session;
  }

  /**
   * Loads an existing session from disk
   *
   * @param sessionId - The session ID to load
   * @returns The loaded session state
   * @throws Error if session file doesn't exist or is invalid
   */
  loadSession(sessionId: SessionId): SessionState {
    const sessionPath = this.getSessionPath(sessionId);

    if (!fs.existsSync(sessionPath)) {
      throw new Error(`Session ${sessionId} not found at ${sessionPath}`);
    }

    try {
      const sessionData = fs.readFileSync(sessionPath, 'utf-8');
      const session = JSON.parse(sessionData) as SessionState;

      // Validate required fields
      if (!session.sessionId || !session.startTime || !session.status) {
        throw new Error(`Invalid session data in ${sessionPath}`);
      }

      return session;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON in session file ${sessionPath}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Updates an existing session
   *
   * @param session - The session state to save
   * @throws Error if session file cannot be written
   */
  updateSession(session: SessionState): void {
    session.lastUpdated = new Date().toISOString();
    this.saveSession(session);
  }

  /**
   * Deletes a session file
   *
   * @param sessionId - The session ID to delete
   * @throws Error if session file cannot be deleted
   */
  deleteSession(sessionId: SessionId): void {
    const sessionPath = this.getSessionPath(sessionId);

    if (fs.existsSync(sessionPath)) {
      try {
        fs.unlinkSync(sessionPath);
      } catch (error) {
        throw new Error(
          `Failed to delete session ${sessionId}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }

  /**
   * Lists all session IDs in the debug-sessions directory
   *
   * @returns Array of session IDs
   */
  listSessions(): SessionId[] {
    if (!fs.existsSync(this.sessionsDir)) {
      return [];
    }

    const files = fs.readdirSync(this.sessionsDir);
    return files
      .filter(file => file.endsWith('.json') && file.startsWith('debug-'))
      .map(file => file.replace('.json', ''));
  }

  /**
   * Finds sessions matching a given issue hash
   * Useful for detecting existing sessions for the same issue
   *
   * @param issueDescription - Description to hash and match
   * @returns Array of matching session IDs
   */
  findSessionsByIssue(issueDescription: string): SessionId[] {
    const issueHash = crypto
      .createHash('md5')
      .update(issueDescription)
      .digest('hex')
      .slice(0, 8);

    return this.listSessions().filter(sessionId =>
      sessionId.endsWith(`-${issueHash}`)
    );
  }

  /**
   * Saves session state to disk
   * @private
   */
  private saveSession(session: SessionState): void {
    const sessionPath = this.getSessionPath(session.sessionId);

    try {
      const sessionData = JSON.stringify(session, null, 2);
      fs.writeFileSync(sessionPath, sessionData, 'utf-8');
    } catch (error) {
      throw new Error(
        `Failed to save session ${session.sessionId}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Gets the file path for a session
   * Validates sessionId to prevent path traversal
   * @private
   */
  private getSessionPath(sessionId: SessionId): string {
    // Validate session ID format to prevent path traversal
    this.validateSessionId(sessionId);

    // Construct filename using only the validated session ID
    const filename = `${sessionId}.json`;

    // Join with sessions directory (which is already validated in constructor)
    const sessionPath = path.join(this.sessionsDir, filename);

    // Final security check: ensure the resolved path is within sessionsDir
    const resolvedPath = path.resolve(sessionPath);
    const resolvedSessionsDir = path.resolve(this.sessionsDir);

    if (!resolvedPath.startsWith(resolvedSessionsDir + path.sep) &&
        resolvedPath !== resolvedSessionsDir) {
      throw new Error(`Path traversal detected: ${sessionId}`);
    }

    return sessionPath;
  }
}
