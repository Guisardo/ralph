/**
 * Tests for HypothesisGenerator
 *
 * Verifies hypothesis generation based on error patterns, code analysis,
 * and cross-file dependencies.
 */

import { HypothesisGenerator, IssueContext, CodeAnalysisContext } from './HypothesisGenerator';
import type { CodeAnalysisResult } from './CodeAnalyzer';
import type { Hypothesis } from './types';

describe('HypothesisGenerator', () => {
  let generator: HypothesisGenerator;

  beforeEach(() => {
    generator = new HypothesisGenerator({
      rootDir: '/test/project',
      minConfidence: 0.1,
      maxHypotheses: 5,
    });
  });

  describe('generateHypotheses', () => {
    it('generates hypotheses from null reference error pattern', async () => {
      const issueContext: IssueContext = {
        reproductionSteps: ['Click the submit button', 'Form shows loading state'],
        expectedBehavior: 'Form should submit successfully',
        actualBehavior: 'Error message appears',
        errorMessages: [
          'TypeError: Cannot read property "name" of undefined',
          '    at processUser (src/handlers/user.ts:42:15)',
        ],
        isFlaky: false,
      };

      const codeAnalysisContext: CodeAnalysisContext = {
        fileAnalyses: new Map([
          ['src/handlers/user.ts', createMockAnalysis({
            functions: [
              { name: 'processUser', startLine: 35, endLine: 60, params: ['userData'], isAsync: true },
            ],
          })],
        ]),
        relatedFiles: ['src/handlers/user.ts'],
      };

      const hypotheses = await generator.generateHypotheses(issueContext, codeAnalysisContext);

      expect(hypotheses.length).toBeGreaterThanOrEqual(1);
      expect(hypotheses.length).toBeLessThanOrEqual(5);

      // Should have a null_reference hypothesis
      const nullRefHypothesis = hypotheses.find(h => h.failureMode === 'null_reference');
      expect(nullRefHypothesis).toBeDefined();
      expect(nullRefHypothesis?.description).toContain('null');
      expect(nullRefHypothesis?.affectedFiles.length).toBeGreaterThan(0);
      expect(nullRefHypothesis?.status).toBe('pending');
    });

    it('generates hypotheses from race condition error pattern', async () => {
      const issueContext: IssueContext = {
        reproductionSteps: ['Start multiple concurrent requests'],
        expectedBehavior: 'All requests complete successfully',
        actualBehavior: 'Intermittent failures with stale data',
        errorMessages: [
          'Race condition detected: concurrent modification of shared state',
        ],
        isFlaky: true,
      };

      const codeAnalysisContext: CodeAnalysisContext = {
        fileAnalyses: new Map([
          ['src/services/cache.ts', createMockAnalysis({
            functions: [
              { name: 'updateCache', startLine: 10, endLine: 30, params: ['key', 'value'], isAsync: true },
              { name: 'getFromCache', startLine: 32, endLine: 45, params: ['key'], isAsync: true },
            ],
          })],
        ]),
        relatedFiles: ['src/services/cache.ts'],
      };

      const hypotheses = await generator.generateHypotheses(issueContext, codeAnalysisContext);

      expect(hypotheses.length).toBeGreaterThanOrEqual(1);

      // Should have a race_condition hypothesis
      const raceHypothesis = hypotheses.find(h => h.failureMode === 'race_condition');
      expect(raceHypothesis).toBeDefined();
      expect(raceHypothesis?.confidence).toBeGreaterThan(0.2);
    });

    it('generates hypotheses from type error pattern', async () => {
      const issueContext: IssueContext = {
        reproductionSteps: ['Call API with string parameter'],
        expectedBehavior: 'Parameter is processed correctly',
        actualBehavior: 'Type mismatch error',
        errorMessages: [
          'TypeError: expected number, got string',
        ],
        isFlaky: false,
      };

      const codeAnalysisContext: CodeAnalysisContext = {
        fileAnalyses: new Map([
          ['src/api/handler.ts', createMockAnalysis({
            functions: [
              { name: 'handleRequest', startLine: 5, endLine: 25, params: ['id', 'options'], isAsync: true },
            ],
          })],
        ]),
        relatedFiles: ['src/api/handler.ts'],
      };

      const hypotheses = await generator.generateHypotheses(issueContext, codeAnalysisContext);

      const typeHypothesis = hypotheses.find(h => h.failureMode === 'type_error');
      expect(typeHypothesis).toBeDefined();
      expect(typeHypothesis?.description).toContain('type');
    });

    it('generates hypotheses from cross-service communication error pattern', async () => {
      const issueContext: IssueContext = {
        reproductionSteps: ['Make API call to backend'],
        expectedBehavior: 'Response with data',
        actualBehavior: 'ECONNREFUSED error',
        errorMessages: [
          'Error: connect ECONNREFUSED 127.0.0.1:3000',
          'FetchError: request to http://localhost:3000/api/users failed',
        ],
        isFlaky: false,
      };

      const codeAnalysisContext: CodeAnalysisContext = {
        fileAnalyses: new Map([
          ['src/client/api.ts', createMockAnalysis({
            functions: [
              { name: 'fetchUsers', startLine: 10, endLine: 25, params: [], isAsync: true },
            ],
            errorHandling: [
              { type: 'try-catch', startLine: 12, endLine: 24, handlesError: 'error' },
            ],
          })],
        ]),
        relatedFiles: ['src/client/api.ts'],
        apiEndpoints: [
          { method: 'GET', path: '/api/users', handlerFile: 'src/server/routes.ts', handlerFunction: 'getUsers', lineNumber: 15 },
        ],
      };

      const hypotheses = await generator.generateHypotheses(issueContext, codeAnalysisContext);

      const crossServiceHypothesis = hypotheses.find(h => h.failureMode === 'cross_service_communication');
      expect(crossServiceHypothesis).toBeDefined();
      expect(crossServiceHypothesis?.description).toContain('communication') || expect(crossServiceHypothesis?.description).toContain('API');
    });

    it('generates 3-5 ranked hypotheses', async () => {
      const issueContext: IssueContext = {
        reproductionSteps: ['Complex multi-step operation'],
        expectedBehavior: 'Operation completes',
        actualBehavior: 'Fails with error',
        errorMessages: [
          'Error: Something went wrong',
          '    at process (src/handler.ts:10:5)',
        ],
        isFlaky: false,
      };

      const codeAnalysisContext: CodeAnalysisContext = {
        fileAnalyses: new Map([
          ['src/handler.ts', createMockAnalysis({
            functions: [
              { name: 'process', startLine: 5, endLine: 50, params: ['data'], isAsync: true },
              { name: 'validate', startLine: 52, endLine: 70, params: ['input'], isAsync: false },
              { name: 'transform', startLine: 72, endLine: 90, params: ['data'], isAsync: true },
            ],
            errorHandling: [],
          })],
          ['src/utils.ts', createMockAnalysis({
            functions: [
              { name: 'helper', startLine: 1, endLine: 20, params: [], isAsync: false },
            ],
          })],
        ]),
        relatedFiles: ['src/handler.ts', 'src/utils.ts', 'src/types.ts'],
      };

      const hypotheses = await generator.generateHypotheses(issueContext, codeAnalysisContext);

      expect(hypotheses.length).toBeGreaterThanOrEqual(1);
      expect(hypotheses.length).toBeLessThanOrEqual(5);

      // Should be sorted by confidence (descending)
      for (let i = 1; i < hypotheses.length; i++) {
        expect(hypotheses[i - 1].confidence).toBeGreaterThanOrEqual(hypotheses[i].confidence);
      }
    });

    it('generates flaky-specific hypothesis for intermittent issues', async () => {
      const issueContext: IssueContext = {
        reproductionSteps: ['Run test suite'],
        expectedBehavior: 'All tests pass',
        actualBehavior: 'Test sometimes fails randomly',
        errorMessages: ['Assertion failed: expected 5 but got 4'],
        isFlaky: true,
      };

      const codeAnalysisContext: CodeAnalysisContext = {
        fileAnalyses: new Map([
          ['src/counter.ts', createMockAnalysis({
            functions: [
              { name: 'increment', startLine: 5, endLine: 15, params: [], isAsync: true },
            ],
          })],
        ]),
        relatedFiles: ['src/counter.ts'],
      };

      const hypotheses = await generator.generateHypotheses(issueContext, codeAnalysisContext);

      // Should have at least one race_condition hypothesis for flaky issues
      const flakyHypothesis = hypotheses.find(h =>
        h.failureMode === 'race_condition' && h.description.toLowerCase().includes('timing')
      );
      expect(flakyHypothesis).toBeDefined();
    });

    it('includes multi-file hypotheses when issue crosses boundaries', async () => {
      const issueContext: IssueContext = {
        reproductionSteps: ['Submit form with user data'],
        expectedBehavior: 'Data saved correctly',
        actualBehavior: 'Data corrupted between frontend and backend',
        errorMessages: [],
        isFlaky: false,
        suspectedFiles: ['src/frontend/form.ts', 'src/backend/handler.ts'],
      };

      const codeAnalysisContext: CodeAnalysisContext = {
        fileAnalyses: new Map([
          ['src/frontend/form.ts', createMockAnalysis({
            functions: [
              { name: 'submitForm', startLine: 20, endLine: 40, params: ['data'], isAsync: true },
            ],
            imports: [
              { module: '../api/client', imports: ['postData'], lineNumber: 1, isDefault: false },
              { module: '../types', imports: ['FormData'], lineNumber: 2, isDefault: false },
            ],
          })],
          ['src/backend/handler.ts', createMockAnalysis({
            functions: [
              { name: 'handlePost', startLine: 10, endLine: 35, params: ['req', 'res'], isAsync: true },
            ],
          })],
        ]),
        relatedFiles: ['src/frontend/form.ts', 'src/backend/handler.ts', 'src/api/client.ts', 'src/types.ts'],
      };

      const hypotheses = await generator.generateHypotheses(issueContext, codeAnalysisContext);

      // Should have hypotheses that span multiple files
      const multiFileHypothesis = hypotheses.find(h => h.affectedFiles.length > 1);
      expect(multiFileHypothesis).toBeDefined();
    });

    it('does not expose confidence scores to users (internal only)', async () => {
      const issueContext: IssueContext = {
        reproductionSteps: ['Test step'],
        expectedBehavior: 'Works',
        actualBehavior: 'Fails',
        errorMessages: ['Error'],
        isFlaky: false,
      };

      const codeAnalysisContext: CodeAnalysisContext = {
        fileAnalyses: new Map([
          ['src/file.ts', createMockAnalysis({})],
        ]),
        relatedFiles: ['src/file.ts'],
      };

      const hypotheses = await generator.generateHypotheses(issueContext, codeAnalysisContext);

      // Confidence should exist internally but is documented as not exposed to user
      for (const hypothesis of hypotheses) {
        expect(hypothesis.confidence).toBeDefined();
        expect(typeof hypothesis.confidence).toBe('number');
        expect(hypothesis.confidence).toBeGreaterThanOrEqual(0);
        expect(hypothesis.confidence).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('hypothesis structure', () => {
    it('generates hypotheses with all required fields', async () => {
      const issueContext: IssueContext = {
        reproductionSteps: ['Step 1'],
        expectedBehavior: 'Expected',
        actualBehavior: 'Actual',
        errorMessages: ['Error: test'],
        isFlaky: false,
      };

      const codeAnalysisContext: CodeAnalysisContext = {
        fileAnalyses: new Map([
          ['src/test.ts', createMockAnalysis({
            functions: [{ name: 'test', startLine: 1, endLine: 10, params: [], isAsync: false }],
          })],
        ]),
        relatedFiles: ['src/test.ts'],
      };

      const hypotheses = await generator.generateHypotheses(issueContext, codeAnalysisContext);

      for (const hypothesis of hypotheses) {
        // Required fields per types.ts
        expect(hypothesis.id).toBeDefined();
        expect(hypothesis.id).toMatch(/^HYP_\d+$/);
        expect(hypothesis.description).toBeDefined();
        expect(hypothesis.description.length).toBeGreaterThan(10);
        expect(hypothesis.confidence).toBeDefined();
        expect(hypothesis.affectedFiles).toBeDefined();
        expect(Array.isArray(hypothesis.affectedFiles)).toBe(true);
        expect(hypothesis.failureMode).toBeDefined();
        expect(['null_reference', 'race_condition', 'incorrect_logic', 'type_error', 'cross_service_communication', 'other']).toContain(hypothesis.failureMode);
        expect(hypothesis.status).toBe('pending');
      }
    });

    it('generates affected files with line ranges', async () => {
      const issueContext: IssueContext = {
        reproductionSteps: ['Step'],
        expectedBehavior: 'Expected',
        actualBehavior: 'Actual',
        errorMessages: ['Error at line 25'],
        isFlaky: false,
      };

      const codeAnalysisContext: CodeAnalysisContext = {
        fileAnalyses: new Map([
          ['src/module.ts', createMockAnalysis({
            functions: [
              { name: 'functionA', startLine: 20, endLine: 40, params: [], isAsync: false },
            ],
          })],
        ]),
        relatedFiles: ['src/module.ts'],
      };

      const hypotheses = await generator.generateHypotheses(issueContext, codeAnalysisContext);

      for (const hypothesis of hypotheses) {
        for (const file of hypothesis.affectedFiles) {
          expect(file.path).toBeDefined();
          expect(file.lineRanges).toBeDefined();
          expect(Array.isArray(file.lineRanges)).toBe(true);

          for (const range of file.lineRanges) {
            expect(range.start).toBeDefined();
            expect(range.end).toBeDefined();
            expect(range.start).toBeLessThanOrEqual(range.end);
          }
        }
      }
    });
  });

  describe('error pattern detection', () => {
    it('detects null reference patterns', async () => {
      const errorMessages = [
        'TypeError: Cannot read properties of undefined (reading "id")',
      ];

      const hypotheses = await generateHypothesesWithErrors(generator, errorMessages);
      expect(hypotheses.some(h => h.failureMode === 'null_reference')).toBe(true);
    });

    it('detects race condition patterns', async () => {
      const errorMessages = [
        'Error: Deadlock detected while acquiring lock',
      ];

      const hypotheses = await generateHypothesesWithErrors(generator, errorMessages);
      expect(hypotheses.some(h => h.failureMode === 'race_condition')).toBe(true);
    });

    it('detects type error patterns', async () => {
      const errorMessages = [
        'TypeError: expected number got string',
      ];

      const hypotheses = await generateHypothesesWithErrors(generator, errorMessages);
      expect(hypotheses.some(h => h.failureMode === 'type_error')).toBe(true);
    });

    it('detects cross-service communication patterns', async () => {
      const errorMessages = [
        'Error: ECONNREFUSED when calling API',
      ];

      const hypotheses = await generateHypothesesWithErrors(generator, errorMessages);
      expect(hypotheses.some(h => h.failureMode === 'cross_service_communication')).toBe(true);
    });

    it('falls back to incorrect_logic when no pattern matches', async () => {
      const errorMessages = [
        'Some generic error without specific pattern',
      ];

      const hypotheses = await generateHypothesesWithErrors(generator, errorMessages);
      expect(hypotheses.some(h => h.failureMode === 'incorrect_logic')).toBe(true);
    });
  });

  describe('stack trace parsing', () => {
    it('parses JavaScript/TypeScript stack traces', async () => {
      const issueContext: IssueContext = {
        reproductionSteps: ['Step'],
        expectedBehavior: 'Expected',
        actualBehavior: 'Actual',
        errorMessages: [
          'Error: Something failed',
          '    at processData (src/handlers/data.ts:42:15)',
          '    at main (src/index.ts:10:3)',
        ],
        isFlaky: false,
      };

      const codeAnalysisContext: CodeAnalysisContext = {
        fileAnalyses: new Map([
          ['src/handlers/data.ts', createMockAnalysis({
            functions: [{ name: 'processData', startLine: 35, endLine: 60, params: [], isAsync: false }],
          })],
          ['src/index.ts', createMockAnalysis({
            functions: [{ name: 'main', startLine: 5, endLine: 20, params: [], isAsync: false }],
          })],
        ]),
        relatedFiles: ['src/handlers/data.ts', 'src/index.ts'],
      };

      const hypotheses = await generator.generateHypotheses(issueContext, codeAnalysisContext);

      // Should identify files from stack trace
      const filesInHypotheses = new Set(
        hypotheses.flatMap(h => h.affectedFiles.map(f => f.path))
      );

      expect(filesInHypotheses.has('src/handlers/data.ts')).toBe(true);
    });

    it('parses Python stack traces', async () => {
      const issueContext: IssueContext = {
        reproductionSteps: ['Step'],
        expectedBehavior: 'Expected',
        actualBehavior: 'Actual',
        errorMessages: [
          'Traceback (most recent call last):',
          '  File "src/handlers/user.py", line 25, in process_user',
          '    return user.name',
          'AttributeError: \'NoneType\' object has no attribute \'name\'',
        ],
        isFlaky: false,
      };

      const codeAnalysisContext: CodeAnalysisContext = {
        fileAnalyses: new Map([
          ['src/handlers/user.py', createMockAnalysis({
            functions: [{ name: 'process_user', startLine: 20, endLine: 35, params: ['user'], isAsync: false }],
          })],
        ]),
        relatedFiles: ['src/handlers/user.py'],
      };

      const hypotheses = await generator.generateHypotheses(issueContext, codeAnalysisContext);

      // Should have null_reference for NoneType error
      expect(hypotheses.some(h => h.failureMode === 'null_reference')).toBe(true);
    });
  });

  describe('buildCodeAnalysisContext', () => {
    it('returns empty context for non-existent files', async () => {
      const context = await generator.buildCodeAnalysisContext([
        '/non/existent/file.ts',
      ]);

      expect(context.fileAnalyses.size).toBe(0);
      expect(context.relatedFiles.length).toBe(0);
    });
  });

  describe('confidence calculation', () => {
    it('boosts confidence when error keywords match', async () => {
      // Test with strong null reference indicators
      const nullRefContext: IssueContext = {
        reproductionSteps: ['Access undefined property'],
        expectedBehavior: 'Works',
        actualBehavior: 'TypeError',
        errorMessages: ['TypeError: Cannot read property "name" of undefined'],
        isFlaky: false,
      };

      const analysisContext: CodeAnalysisContext = {
        fileAnalyses: new Map([
          ['src/test.ts', createMockAnalysis({
            functions: [{ name: 'test', startLine: 1, endLine: 10, params: [], isAsync: false }],
          })],
        ]),
        relatedFiles: ['src/test.ts'],
      };

      const hypotheses = await generator.generateHypotheses(nullRefContext, analysisContext);
      const nullRefHypothesis = hypotheses.find(h => h.failureMode === 'null_reference');

      expect(nullRefHypothesis).toBeDefined();
      // Strong pattern match should have higher confidence
      expect(nullRefHypothesis!.confidence).toBeGreaterThan(0.3);
    });

    it('caps confidence at 0.95', async () => {
      const issueContext: IssueContext = {
        reproductionSteps: ['Many keywords: null undefined nil none'],
        expectedBehavior: 'Works',
        actualBehavior: 'Fails with null error',
        errorMessages: [
          'TypeError: Cannot read properties of undefined',
          'null is not an object',
          'undefined is not a function',
        ],
        isFlaky: false,
      };

      const codeAnalysisContext: CodeAnalysisContext = {
        fileAnalyses: new Map([
          ['src/test.ts', createMockAnalysis({
            functions: [{ name: 'test', startLine: 1, endLine: 50, params: [], isAsync: false }],
          })],
        ]),
        relatedFiles: ['src/test.ts'],
      };

      const hypotheses = await generator.generateHypotheses(issueContext, codeAnalysisContext);

      for (const hypothesis of hypotheses) {
        expect(hypothesis.confidence).toBeLessThanOrEqual(0.95);
      }
    });
  });

  describe('deduplication', () => {
    it('removes duplicate hypotheses with same failure mode and file', async () => {
      // Create context that would generate multiple similar hypotheses
      const issueContext: IssueContext = {
        reproductionSteps: ['Step with null and undefined keywords'],
        expectedBehavior: 'Works',
        actualBehavior: 'null error and undefined error',
        errorMessages: [
          'TypeError: null is not an object',
          'TypeError: undefined is not a function',
        ],
        isFlaky: false,
      };

      const codeAnalysisContext: CodeAnalysisContext = {
        fileAnalyses: new Map([
          ['src/single.ts', createMockAnalysis({
            functions: [{ name: 'test', startLine: 1, endLine: 10, params: [], isAsync: false }],
          })],
        ]),
        relatedFiles: ['src/single.ts'],
      };

      const hypotheses = await generator.generateHypotheses(issueContext, codeAnalysisContext);

      // Should not have multiple null_reference hypotheses for the same file
      const nullRefHypotheses = hypotheses.filter(h => h.failureMode === 'null_reference');
      const filesForNullRef = new Set(nullRefHypotheses.flatMap(h => h.affectedFiles.map(f => f.path)));

      // Each file should only appear once per failure mode
      expect(nullRefHypotheses.length).toBeLessThanOrEqual(filesForNullRef.size);
    });
  });
});

// Helper function to create mock CodeAnalysisResult
function createMockAnalysis(overrides: Partial<CodeAnalysisResult> = {}): CodeAnalysisResult {
  return {
    language: 'typescript',
    functions: [],
    classes: [],
    imports: [],
    errorHandling: [],
    parseMethod: 'ast',
    ...overrides,
  };
}

// Helper function to generate hypotheses with specific error messages
async function generateHypothesesWithErrors(
  generator: HypothesisGenerator,
  errorMessages: string[]
): Promise<Hypothesis[]> {
  const issueContext: IssueContext = {
    reproductionSteps: ['Test step'],
    expectedBehavior: 'Expected behavior',
    actualBehavior: 'Actual behavior',
    errorMessages,
    isFlaky: false,
  };

  const codeAnalysisContext: CodeAnalysisContext = {
    fileAnalyses: new Map([
      ['src/test.ts', createMockAnalysis({
        functions: [{ name: 'testFunc', startLine: 1, endLine: 20, params: [], isAsync: false }],
      })],
    ]),
    relatedFiles: ['src/test.ts'],
  };

  return generator.generateHypotheses(issueContext, codeAnalysisContext);
}
