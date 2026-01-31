/**
 * SessionManager Tests
 *
 * Tests for US-001: Create debug session data structures and session manager
 */

import { SessionManager } from './SessionManager';
import type { SessionState } from './types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('SessionManager', () => {
  let tempDir: string;
  let sessionManager: SessionManager;

  beforeEach(() => {
    // Create a temporary directory for tests
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'debug-test-'));
    sessionManager = new SessionManager(tempDir);
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Session Creation', () => {
    it('should create a new session with all required fields', () => {
      const session = sessionManager.createSession({
        reproductionSteps: ['Step 1', 'Step 2'],
        expectedBehavior: 'Should work',
        actualBehavior: 'Throws error',
        errorMessages: ['Error: something broke'],
        initialCommit: 'abc123',
        initialBranch: 'main',
        isFlaky: false,
        successCount: 1,
      });

      // Verify all required fields from acceptance criteria
      expect(session.sessionId).toMatch(/^debug-\d{14}-[a-f0-9]{8}$/);
      expect(session.startTime).toBeDefined();
      expect(session.initialCommit).toBe('abc123');
      expect(session.initialBranch).toBe('main');
      expect(session.reproductionSteps).toEqual(['Step 1', 'Step 2']);
      expect(session.hypotheses).toEqual([]);
      expect(session.logs).toEqual([]);
      expect(session.researchFindings).toEqual([]);
      expect(session.appliedFixes).toEqual([]);
      expect(session.cycleCount).toBe(0);
      expect(session.status).toBe('in_progress');
    });

    it('should create session file in correct location', () => {
      const session = sessionManager.createSession({
        reproductionSteps: ['Test step'],
        expectedBehavior: 'Expected',
        actualBehavior: 'Actual',
        initialCommit: 'abc123',
        initialBranch: 'main',
        isFlaky: false,
        successCount: 1,
      });

      const sessionPath = path.join(
        tempDir,
        '.claude',
        'debug-sessions',
        `${session.sessionId}.json`
      );

      expect(fs.existsSync(sessionPath)).toBe(true);
    });

    it('should generate consistent session IDs for same issue', () => {
      const issue = 'same issue description';

      const id1 = sessionManager.generateSessionId(issue);
      const id2 = sessionManager.generateSessionId(issue);

      // Should have same hash suffix
      const hash1 = id1.split('-').pop();
      const hash2 = id2.split('-').pop();
      expect(hash1).toBe(hash2);
    });
  });

  describe('Session Loading', () => {
    it('should load existing session from disk', () => {
      const created = sessionManager.createSession({
        reproductionSteps: ['Step 1'],
        expectedBehavior: 'Expected',
        actualBehavior: 'Actual',
        initialCommit: 'abc123',
        initialBranch: 'main',
        isFlaky: false,
        successCount: 1,
      });

      const loaded = sessionManager.loadSession(created.sessionId);

      expect(loaded.sessionId).toBe(created.sessionId);
      expect(loaded.reproductionSteps).toEqual(created.reproductionSteps);
      expect(loaded.initialCommit).toBe(created.initialCommit);
    });

    it('should throw error for non-existent session', () => {
      expect(() => {
        sessionManager.loadSession('debug-20260101-000000-12345678');
      }).toThrow('Session debug-20260101-000000-12345678 not found');
    });

    it('should throw error for invalid session ID format', () => {
      expect(() => {
        sessionManager.loadSession('../../etc/passwd');
      }).toThrow('Invalid session ID format');
    });
  });

  describe('Session Updates', () => {
    it('should update existing session', () => {
      const session = sessionManager.createSession({
        reproductionSteps: ['Step 1'],
        expectedBehavior: 'Expected',
        actualBehavior: 'Actual',
        initialCommit: 'abc123',
        initialBranch: 'main',
        isFlaky: false,
        successCount: 1,
      });

      session.cycleCount = 2;
      session.status = 'success';
      sessionManager.updateSession(session);

      const loaded = sessionManager.loadSession(session.sessionId);
      expect(loaded.cycleCount).toBe(2);
      expect(loaded.status).toBe('success');
    });
  });

  describe('Session Deletion', () => {
    it('should delete session file', () => {
      const session = sessionManager.createSession({
        reproductionSteps: ['Step 1'],
        expectedBehavior: 'Expected',
        actualBehavior: 'Actual',
        initialCommit: 'abc123',
        initialBranch: 'main',
        isFlaky: false,
        successCount: 1,
      });

      sessionManager.deleteSession(session.sessionId);

      expect(() => {
        sessionManager.loadSession(session.sessionId);
      }).toThrow();
    });
  });

  describe('Security - Path Traversal Prevention', () => {
    it('should reject session ID with path traversal', () => {
      expect(() => {
        sessionManager.loadSession('../../../etc/passwd');
      }).toThrow('Invalid session ID format');
    });

    it('should reject session ID with path separators', () => {
      expect(() => {
        sessionManager.loadSession('debug-20260101-000000-12345678/../bad');
      }).toThrow('Invalid session ID format');
    });

    it('should reject session ID with null bytes', () => {
      expect(() => {
        sessionManager.loadSession('debug-20260101-000000-12345678\0');
      }).toThrow('Invalid session ID');
    });
  });

  describe('Session Listing', () => {
    it('should list all sessions', () => {
      const session1 = sessionManager.createSession({
        reproductionSteps: ['Test 1'],
        expectedBehavior: 'Expected',
        actualBehavior: 'Actual',
        initialCommit: 'abc123',
        initialBranch: 'main',
        isFlaky: false,
        successCount: 1,
      });

      const session2 = sessionManager.createSession({
        reproductionSteps: ['Test 2'],
        expectedBehavior: 'Expected',
        actualBehavior: 'Actual',
        initialCommit: 'abc123',
        initialBranch: 'main',
        isFlaky: false,
        successCount: 1,
      });

      const sessions = sessionManager.listSessions();
      expect(sessions).toHaveLength(2);
      expect(sessions).toContain(session1.sessionId);
      expect(sessions).toContain(session2.sessionId);
    });

    it('should find sessions by issue description', () => {
      const issue = 'specific issue';

      const session1 = sessionManager.createSession({
        reproductionSteps: [issue],
        expectedBehavior: 'Expected',
        actualBehavior: 'Actual',
        initialCommit: 'abc123',
        initialBranch: 'main',
        isFlaky: false,
        successCount: 1,
      });

      const found = sessionManager.findSessionsByIssue(issue);
      expect(found).toHaveLength(1);
      expect(found[0]).toBe(session1.sessionId);
    });
  });
});
