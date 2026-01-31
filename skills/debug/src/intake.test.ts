/**
 * Tests for intake module
 * Tests for US-002: Implement skill invocation and issue intake
 */

import { SessionManager } from './SessionManager';
import {
  performIntake,
  detectFlakyIssue,
  generateSessionId,
  type IssueIntakeInput,
} from './intake';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('intake module', () => {
  let tempDir: string;
  let sessionManager: SessionManager;

  beforeEach(() => {
    // Create a temporary directory for tests
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'debug-intake-test-'));
    sessionManager = new SessionManager(tempDir);
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('detectFlakyIssue', () => {
    it('should detect intermittent keyword', () => {
      const result = detectFlakyIssue('This issue happens intermittently');
      expect(result).toBe(true);
    });

    it('should detect flaky keyword', () => {
      const result = detectFlakyIssue('The test is flaky and fails sometimes');
      expect(result).toBe(true);
    });

    it('should detect sometimes keyword', () => {
      const result = detectFlakyIssue('Sometimes the button does not respond');
      expect(result).toBe(true);
    });

    it('should detect occasionally keyword', () => {
      const result = detectFlakyIssue('The error appears occasionally');
      expect(result).toBe(true);
    });

    it('should detect randomly keyword', () => {
      const result = detectFlakyIssue('Data loads randomly fail');
      expect(result).toBe(true);
    });

    it('should detect race condition keyword', () => {
      const result = detectFlakyIssue('Possible race condition between API calls');
      expect(result).toBe(true);
    });

    it('should detect timing keyword', () => {
      const result = detectFlakyIssue('Timing issue with async operations');
      expect(result).toBe(true);
    });

    it('should be case-insensitive', () => {
      const result = detectFlakyIssue('The test is FLAKY');
      expect(result).toBe(true);
    });

    it('should return false for deterministic issues', () => {
      const result = detectFlakyIssue('Button click throws null pointer exception');
      expect(result).toBe(false);
    });
  });

  describe('generateSessionId', () => {
    it('should generate session ID with correct format', () => {
      const sessionId = generateSessionId('test issue description');
      const pattern = /^debug-\d{14}-[a-f0-9]{8}$/;
      expect(sessionId).toMatch(pattern);
    });

    it('should generate same hash for same issue description', () => {
      const description = 'Login button throws error on click';
      const id1 = generateSessionId(description);
      const id2 = generateSessionId(description);

      // Extract hashes (last 8 characters)
      const hash1 = id1.split('-').pop();
      const hash2 = id2.split('-').pop();

      expect(hash1).toBe(hash2);
    });

    it('should generate different timestamps for different times', (done) => {
      const id1 = generateSessionId('test');

      setTimeout(() => {
        const id2 = generateSessionId('test');

        // Extract timestamps (middle part)
        const timestamp1 = id1.split('-').slice(1, 3).join('-');
        const timestamp2 = id2.split('-').slice(1, 3).join('-');

        expect(timestamp1).not.toBe(timestamp2);
        done();
      }, 1100); // Wait for second to change
    }, 10000);

    it('should generate different hashes for different issues', () => {
      const id1 = generateSessionId('Issue A');
      const id2 = generateSessionId('Issue B');

      const hash1 = id1.split('-').pop();
      const hash2 = id2.split('-').pop();

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('performIntake', () => {
    const basicInput: IssueIntakeInput = {
      reproductionSteps: '1. Click login button\n2. Enter credentials\n3. Submit',
      expectedBehavior: 'User should be logged in',
      actualBehavior: 'Null pointer exception thrown',
      errorMessages: 'NullPointerException at line 42',
    };

    it('should create new session for deterministic issue', async () => {
      const result = await performIntake(basicInput, sessionManager);

      expect(result.resumed).toBe(false);
      expect(result.session.sessionId).toMatch(/^debug-\d{14}-[a-f0-9]{8}$/);
      expect(result.session.reproductionSteps).toHaveLength(3);
      expect(result.session.expectedBehavior).toBe(basicInput.expectedBehavior);
      expect(result.session.actualBehavior).toBe(basicInput.actualBehavior);
      expect(result.session.isFlaky).toBe(false);
      expect(result.session.successCount).toBe(1);
    });

    it('should detect flaky issue and use default success count', async () => {
      const flakyInput: IssueIntakeInput = {
        reproductionSteps: 'This test sometimes fails intermittently',
        expectedBehavior: 'Test passes',
        actualBehavior: 'Test fails occasionally',
        errorMessages: 'Timeout error',
      };

      const result = await performIntake(flakyInput, sessionManager);

      expect(result.session.isFlaky).toBe(true);
      expect(result.session.successCount).toBe(3); // Default for flaky
    });

    it('should use user-specified success count for flaky issue', async () => {
      const flakyInput: IssueIntakeInput = {
        reproductionSteps: 'This test sometimes fails',
        expectedBehavior: 'Test passes',
        actualBehavior: 'Test fails randomly',
        errorMessages: 'Timeout error',
        flakySuccessCount: 5,
      };

      const result = await performIntake(flakyInput, sessionManager);

      expect(result.session.isFlaky).toBe(true);
      expect(result.session.successCount).toBe(5);
    });

    it('should split error messages into array', async () => {
      const input: IssueIntakeInput = {
        reproductionSteps: 'Click button',
        expectedBehavior: 'Success',
        actualBehavior: 'Error',
        errorMessages: 'Error 1\nError 2\nError 3',
      };

      const result = await performIntake(input, sessionManager);

      expect(result.session.errorMessages).toEqual(['Error 1', 'Error 2', 'Error 3']);
    });

    it('should resume existing session with same issue', async () => {
      // Create first session
      const result1 = await performIntake(basicInput, sessionManager);
      const firstSessionId = result1.session.sessionId;

      // Try to create session with same issue
      const result2 = await performIntake(basicInput, sessionManager);

      expect(result2.resumed).toBe(true);
      expect(result2.session.sessionId).toBe(firstSessionId);
    });

    it('should force new session when forceNew option set', async () => {
      // Create first session
      const result1 = await performIntake(basicInput, sessionManager);
      const firstSessionId = result1.session.sessionId;

      // Force create new session with same issue
      const result2 = await performIntake(basicInput, sessionManager, { forceNew: true });

      expect(result2.resumed).toBe(false);
      expect(result2.session.sessionId).not.toBe(firstSessionId);
    });

    it('should initialize session with correct default values', async () => {
      const result = await performIntake(basicInput, sessionManager);

      expect(result.session.hypotheses).toEqual([]);
      expect(result.session.logs).toEqual([]);
      expect(result.session.researchFindings).toEqual([]);
      expect(result.session.appliedFixes).toEqual([]);
      expect(result.session.instrumentedFiles).toEqual([]);
      expect(result.session.cycleCount).toBe(0);
      expect(result.session.status).toBe('in_progress');
    });

    it('should handle empty error messages', async () => {
      const input: IssueIntakeInput = {
        reproductionSteps: 'Click button',
        expectedBehavior: 'Success',
        actualBehavior: 'Failure',
        errorMessages: '',
      };

      const result = await performIntake(input, sessionManager);

      expect(result.session.errorMessages).toBeUndefined();
    });

    it('should capture start time', async () => {
      const before = new Date().toISOString();
      const result = await performIntake(basicInput, sessionManager);
      const after = new Date().toISOString();

      expect(result.session.startTime).toBeGreaterThanOrEqual(before);
      expect(result.session.startTime).toBeLessThanOrEqual(after);
    });

    it('should persist session to disk', async () => {
      const result = await performIntake(basicInput, sessionManager);
      const sessionPath = path.join(
        tempDir,
        '.claude',
        'debug-sessions',
        `${result.session.sessionId}.json`
      );

      expect(fs.existsSync(sessionPath)).toBe(true);

      const savedData = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
      expect(savedData.sessionId).toBe(result.session.sessionId);
    });
  });
});
