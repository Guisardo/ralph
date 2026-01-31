/**
 * HypothesisGenerator - Automated hypothesis generation for debugging
 *
 * Generates ranked hypotheses about potential root causes based on:
 * - Error patterns from stack traces and error messages
 * - Code structure from AST/regex analysis
 * - Common bug categories (null reference, race conditions, etc.)
 * - Cross-file dependency analysis
 */

import type { Hypothesis } from './types';
import type { SessionState } from './types';
import type { CodeAnalysisResult, FunctionDefinition, ErrorHandlingBlock } from './CodeAnalyzer';
import { CodeAnalyzer } from './CodeAnalyzer';
import { DependencyGraph } from './DependencyGraph';
import { SessionManager } from './SessionManager';

/**
 * Context about the issue being debugged
 */
export interface IssueContext {
  /** User-provided reproduction steps */
  reproductionSteps: string[];

  /** Expected vs actual behavior */
  expectedBehavior: string;
  actualBehavior: string;

  /** Error messages or stack traces */
  errorMessages?: string[];

  /** Whether this is a flaky/intermittent issue */
  isFlaky: boolean;

  /** Files mentioned in error or suspected to be involved */
  suspectedFiles?: string[];
}

/**
 * Code analysis results for hypothesis generation
 */
export interface CodeAnalysisContext {
  /** Analysis results for each file */
  fileAnalyses: Map<string, CodeAnalysisResult>;

  /** Related files from dependency analysis */
  relatedFiles: string[];

  /** API endpoints found in the codebase */
  apiEndpoints?: Array<{
    method: string;
    path: string;
    handlerFile: string;
    handlerFunction: string;
    lineNumber: number;
  }>;
}

/**
 * Error patterns that help identify failure modes
 */
interface ErrorPattern {
  /** Pattern name for reference */
  name: string;

  /** Regex patterns to match in error messages */
  patterns: RegExp[];

  /** Likely failure mode when pattern matches */
  failureMode: Hypothesis['failureMode'];

  /** Base confidence boost when this pattern matches */
  confidenceBoost: number;

  /** Keywords commonly associated with this pattern */
  keywords: string[];
}

/**
 * Parsed stack trace information
 */
interface StackFrame {
  filePath: string;
  functionName?: string;
  lineNumber?: number;
  columnNumber?: number;
}

/**
 * Configuration for hypothesis generation
 */
export interface HypothesisGeneratorConfig {
  /** Root directory for code analysis */
  rootDir?: string;

  /** Minimum confidence threshold to include a hypothesis */
  minConfidence?: number;

  /** Maximum number of hypotheses to generate */
  maxHypotheses?: number;

  /** Maximum depth for dependency analysis */
  maxDependencyDepth?: number;
}

/**
 * Known error patterns for different failure modes
 */
const ERROR_PATTERNS: ErrorPattern[] = [
  // Null reference patterns
  {
    name: 'null_reference',
    patterns: [
      /cannot read propert(?:y|ies) of (?:null|undefined)/i,
      /TypeError:.*is not a function/i,
      /TypeError:.*is (?:null|undefined)/i,
      /NullPointerException/i,
      /AttributeError:.*'NoneType'/i,
      /nil pointer dereference/i,
      /undefined is not an object/i,
      /null is not an object/i,
    ],
    failureMode: 'null_reference',
    confidenceBoost: 0.3,
    keywords: ['null', 'undefined', 'nil', 'none', 'optional', 'maybe'],
  },

  // Race condition patterns
  {
    name: 'race_condition',
    patterns: [
      /deadlock/i,
      /race condition/i,
      /concurrent.*modif/i,
      /data race/i,
      /mutex/i,
      /lock.*timeout/i,
      /stale.*data/i,
    ],
    failureMode: 'race_condition',
    confidenceBoost: 0.25,
    keywords: ['async', 'await', 'promise', 'concurrent', 'parallel', 'thread', 'mutex', 'lock'],
  },

  // Type error patterns
  {
    name: 'type_error',
    patterns: [
      /TypeError:/i,
      /type.*mismatch/i,
      /expected.*got/i,
      /incompatible types/i,
      /cannot assign.*to/i,
      /invalid cast/i,
      /ClassCastException/i,
    ],
    failureMode: 'type_error',
    confidenceBoost: 0.25,
    keywords: ['type', 'cast', 'convert', 'coerce', 'as', 'instanceof'],
  },

  // Cross-service communication patterns
  {
    name: 'cross_service',
    patterns: [
      /ECONNREFUSED/i,
      /ETIMEDOUT/i,
      /network.*error/i,
      /connection.*refused/i,
      /fetch.*failed/i,
      /api.*error/i,
      /http.*error/i,
      /status.*[45]\d\d/i,
      /cors/i,
    ],
    failureMode: 'cross_service_communication',
    confidenceBoost: 0.3,
    keywords: ['api', 'fetch', 'http', 'request', 'response', 'endpoint', 'url', 'cors'],
  },

  // Incorrect logic patterns (general)
  {
    name: 'incorrect_logic',
    patterns: [
      /assertion.*failed/i,
      /expected.*but.*got/i,
      /invalid.*argument/i,
      /out of (?:range|bounds)/i,
      /index.*bounds/i,
      /invalid.*state/i,
      /unexpected.*value/i,
    ],
    failureMode: 'incorrect_logic',
    confidenceBoost: 0.15,
    keywords: ['if', 'else', 'switch', 'case', 'condition', 'logic', 'check', 'validate'],
  },
];

/**
 * HypothesisGenerator - Generates ranked hypotheses for debugging
 */
export class HypothesisGenerator {
  private config: Required<HypothesisGeneratorConfig>;
  private codeAnalyzer: CodeAnalyzer;
  private dependencyGraph: DependencyGraph;

  constructor(config: HypothesisGeneratorConfig = {}) {
    this.config = {
      rootDir: config.rootDir || process.cwd(),
      minConfidence: config.minConfidence ?? 0.1,
      maxHypotheses: config.maxHypotheses ?? 5,
      maxDependencyDepth: config.maxDependencyDepth ?? 5,
    };

    this.codeAnalyzer = new CodeAnalyzer();
    this.dependencyGraph = new DependencyGraph({
      rootDir: this.config.rootDir,
      maxDepth: this.config.maxDependencyDepth,
    });
  }

  /**
   * Generate hypotheses based on issue context and code analysis
   *
   * Returns 3-5 ranked hypotheses sorted by confidence (highest first).
   * Confidence scores are internal and not exposed to users.
   */
  async generateHypotheses(
    issueContext: IssueContext,
    codeAnalysisContext: CodeAnalysisContext
  ): Promise<Hypothesis[]> {
    const hypotheses: Hypothesis[] = [];
    let hypothesisCounter = 1;

    // Step 1: Analyze error patterns to identify likely failure modes
    const errorAnalysis = this.analyzeErrorPatterns(issueContext);

    // Step 2: Parse stack traces to identify affected files and functions
    const stackFrames = this.parseStackTraces(issueContext.errorMessages || []);

    // Step 3: Identify primary files (from stack traces or suspected files)
    const primaryFiles = this.identifyPrimaryFiles(
      stackFrames,
      issueContext.suspectedFiles || [],
      codeAnalysisContext
    );

    // Step 4: Generate hypotheses based on error patterns
    for (const pattern of errorAnalysis.matchedPatterns) {
      const hypothesis = await this.generatePatternBasedHypothesis(
        `HYP_${hypothesisCounter}`,
        pattern,
        primaryFiles,
        stackFrames,
        codeAnalysisContext,
        issueContext
      );

      if (hypothesis && hypothesis.confidence >= this.config.minConfidence) {
        hypotheses.push(hypothesis);
        hypothesisCounter++;
      }
    }

    // Step 5: Generate hypotheses based on code structure analysis
    const structureHypotheses = await this.generateStructureBasedHypotheses(
      hypothesisCounter,
      codeAnalysisContext,
      issueContext,
      stackFrames
    );

    for (const hypothesis of structureHypotheses) {
      if (hypothesis.confidence >= this.config.minConfidence) {
        hypotheses.push(hypothesis);
        hypothesisCounter++;
      }
    }

    // Step 6: Generate cross-file hypotheses for issues crossing boundaries
    const crossFileHypotheses = await this.generateCrossFileHypotheses(
      hypothesisCounter,
      codeAnalysisContext,
      issueContext,
      primaryFiles
    );

    for (const hypothesis of crossFileHypotheses) {
      if (hypothesis.confidence >= this.config.minConfidence) {
        hypotheses.push(hypothesis);
        hypothesisCounter++;
      }
    }

    // Step 7: Add flaky-specific hypotheses if issue is intermittent
    if (issueContext.isFlaky) {
      const flakyHypothesis = this.generateFlakyHypothesis(
        `HYP_${hypothesisCounter}`,
        primaryFiles,
        codeAnalysisContext
      );

      if (flakyHypothesis && flakyHypothesis.confidence >= this.config.minConfidence) {
        hypotheses.push(flakyHypothesis);
      }
    }

    // Step 8: Rank and limit hypotheses
    const rankedHypotheses = this.rankAndLimitHypotheses(hypotheses);

    return rankedHypotheses;
  }

  /**
   * Generate hypotheses and update the session with results
   */
  async generateAndStoreHypotheses(
    sessionId: string,
    sessionManager: SessionManager,
    issueContext: IssueContext,
    codeAnalysisContext: CodeAnalysisContext
  ): Promise<Hypothesis[]> {
    // Generate hypotheses
    const hypotheses = await this.generateHypotheses(issueContext, codeAnalysisContext);

    // Update session with hypotheses
    sessionManager.updateSession(sessionId, {
      hypotheses,
    });

    return hypotheses;
  }

  /**
   * Analyze error messages for known patterns
   */
  private analyzeErrorPatterns(issueContext: IssueContext): {
    matchedPatterns: ErrorPattern[];
    keywordMatches: Map<string, string[]>;
  } {
    const matchedPatterns: ErrorPattern[] = [];
    const keywordMatches = new Map<string, string[]>();

    const allText = [
      ...issueContext.reproductionSteps,
      issueContext.expectedBehavior,
      issueContext.actualBehavior,
      ...(issueContext.errorMessages || []),
    ].join('\n').toLowerCase();

    for (const pattern of ERROR_PATTERNS) {
      // Check regex patterns
      const regexMatches = pattern.patterns.some(regex => regex.test(allText));

      // Check keyword matches
      const matchedKeywords = pattern.keywords.filter(kw => allText.includes(kw.toLowerCase()));

      if (regexMatches || matchedKeywords.length >= 2) {
        matchedPatterns.push(pattern);
        keywordMatches.set(pattern.name, matchedKeywords);
      }
    }

    // If no patterns matched, add a generic "incorrect_logic" as fallback
    if (matchedPatterns.length === 0) {
      const incorrectLogic = ERROR_PATTERNS.find(p => p.name === 'incorrect_logic');
      if (incorrectLogic) {
        matchedPatterns.push(incorrectLogic);
      }
    }

    return { matchedPatterns, keywordMatches };
  }

  /**
   * Parse stack traces from error messages
   */
  private parseStackTraces(errorMessages: string[]): StackFrame[] {
    const frames: StackFrame[] = [];
    const seenFrames = new Set<string>();

    for (const message of errorMessages) {
      // JavaScript/TypeScript stack trace patterns
      // at functionName (file.ts:line:col) or at file.ts:line:col
      const jsPattern = /at\s+(?:(\S+)\s+)?\(?([^:]+):(\d+)(?::(\d+))?\)?/g;
      let match: RegExpExecArray | null;

      while ((match = jsPattern.exec(message)) !== null) {
        const frame: StackFrame = {
          filePath: match[2],
          functionName: match[1],
          lineNumber: parseInt(match[3], 10),
          columnNumber: match[4] ? parseInt(match[4], 10) : undefined,
        };

        const frameKey = `${frame.filePath}:${frame.lineNumber}`;
        if (!seenFrames.has(frameKey)) {
          seenFrames.add(frameKey);
          frames.push(frame);
        }
      }

      // Python stack trace pattern
      // File "path/file.py", line N, in functionName
      const pyPattern = /File "([^"]+)", line (\d+)(?:, in (\S+))?/g;
      while ((match = pyPattern.exec(message)) !== null) {
        const frame: StackFrame = {
          filePath: match[1],
          lineNumber: parseInt(match[2], 10),
          functionName: match[3],
        };

        const frameKey = `${frame.filePath}:${frame.lineNumber}`;
        if (!seenFrames.has(frameKey)) {
          seenFrames.add(frameKey);
          frames.push(frame);
        }
      }

      // Go stack trace pattern
      // path/file.go:line +offset
      const goPattern = /([^\s]+\.go):(\d+)/g;
      while ((match = goPattern.exec(message)) !== null) {
        const frame: StackFrame = {
          filePath: match[1],
          lineNumber: parseInt(match[2], 10),
        };

        const frameKey = `${frame.filePath}:${frame.lineNumber}`;
        if (!seenFrames.has(frameKey)) {
          seenFrames.add(frameKey);
          frames.push(frame);
        }
      }

      // Java/Kotlin stack trace pattern
      // at package.Class.method(File.java:line)
      const javaPattern = /at\s+[\w.]+\.(\w+)\(([\w.]+):(\d+)\)/g;
      while ((match = javaPattern.exec(message)) !== null) {
        const frame: StackFrame = {
          filePath: match[2],
          functionName: match[1],
          lineNumber: parseInt(match[3], 10),
        };

        const frameKey = `${frame.filePath}:${frame.lineNumber}`;
        if (!seenFrames.has(frameKey)) {
          seenFrames.add(frameKey);
          frames.push(frame);
        }
      }
    }

    return frames;
  }

  /**
   * Identify primary files affected by the issue
   */
  private identifyPrimaryFiles(
    stackFrames: StackFrame[],
    suspectedFiles: string[],
    codeAnalysisContext: CodeAnalysisContext
  ): string[] {
    const primaryFiles: string[] = [];
    const seen = new Set<string>();

    // Add files from stack traces (most relevant)
    for (const frame of stackFrames) {
      if (!seen.has(frame.filePath)) {
        seen.add(frame.filePath);
        primaryFiles.push(frame.filePath);
      }
    }

    // Add user-suspected files
    for (const file of suspectedFiles) {
      if (!seen.has(file)) {
        seen.add(file);
        primaryFiles.push(file);
      }
    }

    // Add files from code analysis context if we have few files
    if (primaryFiles.length < 3) {
      for (const file of codeAnalysisContext.relatedFiles) {
        if (!seen.has(file) && primaryFiles.length < 5) {
          seen.add(file);
          primaryFiles.push(file);
        }
      }
    }

    return primaryFiles;
  }

  /**
   * Generate a hypothesis based on a matched error pattern
   */
  private async generatePatternBasedHypothesis(
    id: string,
    pattern: ErrorPattern,
    primaryFiles: string[],
    stackFrames: StackFrame[],
    codeAnalysisContext: CodeAnalysisContext,
    issueContext: IssueContext
  ): Promise<Hypothesis | null> {
    // Calculate base confidence from pattern and context
    let confidence = pattern.confidenceBoost;

    // Boost confidence if pattern keywords appear in error messages
    const errorText = (issueContext.errorMessages || []).join(' ').toLowerCase();
    const keywordMatches = pattern.keywords.filter(kw => errorText.includes(kw.toLowerCase()));
    confidence += keywordMatches.length * 0.05;

    // Boost confidence if we have stack frames pointing to specific files
    if (stackFrames.length > 0) {
      confidence += 0.1;
    }

    // Build affected files with line ranges
    const affectedFiles = this.buildAffectedFilesFromPattern(
      pattern,
      primaryFiles,
      stackFrames,
      codeAnalysisContext
    );

    // Generate description based on pattern
    const description = this.generatePatternDescription(pattern, affectedFiles, issueContext);

    // Cap confidence at 0.95
    confidence = Math.min(confidence, 0.95);

    return {
      id,
      description,
      confidence,
      affectedFiles,
      failureMode: pattern.failureMode,
      status: 'pending',
    };
  }

  /**
   * Build affected files list from pattern analysis
   */
  private buildAffectedFilesFromPattern(
    pattern: ErrorPattern,
    primaryFiles: string[],
    stackFrames: StackFrame[],
    codeAnalysisContext: CodeAnalysisContext
  ): Hypothesis['affectedFiles'] {
    const affectedFiles: Hypothesis['affectedFiles'] = [];

    // Add files from stack frames with line ranges
    for (const frame of stackFrames) {
      const analysis = codeAnalysisContext.fileAnalyses.get(frame.filePath);

      if (frame.lineNumber) {
        // Try to find the function containing this line
        let lineRanges: Array<{start: number; end: number}>;

        if (analysis) {
          const containingFunc = analysis.functions.find(
            f => frame.lineNumber! >= f.startLine && frame.lineNumber! <= f.endLine
          );

          if (containingFunc) {
            lineRanges = [{ start: containingFunc.startLine, end: containingFunc.endLine }];
          } else {
            // Use a window around the line
            lineRanges = [{
              start: Math.max(1, frame.lineNumber - 5),
              end: frame.lineNumber + 10,
            }];
          }
        } else {
          lineRanges = [{
            start: Math.max(1, frame.lineNumber - 5),
            end: frame.lineNumber + 10,
          }];
        }

        affectedFiles.push({
          path: frame.filePath,
          lineRanges,
        });
      }
    }

    // Add primary files not already included
    const includedPaths = new Set(affectedFiles.map(f => f.path));
    for (const file of primaryFiles.slice(0, 3)) {
      if (!includedPaths.has(file)) {
        const analysis = codeAnalysisContext.fileAnalyses.get(file);

        // For pattern-specific analysis, look for relevant code structures
        const lineRanges = this.findPatternRelevantRanges(pattern, analysis);

        affectedFiles.push({
          path: file,
          lineRanges: lineRanges.length > 0 ? lineRanges : [{ start: 1, end: 50 }],
        });
      }
    }

    return affectedFiles;
  }

  /**
   * Find line ranges relevant to a specific error pattern
   */
  private findPatternRelevantRanges(
    pattern: ErrorPattern,
    analysis?: CodeAnalysisResult
  ): Array<{start: number; end: number}> {
    if (!analysis) return [];

    const ranges: Array<{start: number; end: number}> = [];

    switch (pattern.failureMode) {
      case 'null_reference':
        // Look for functions that might return null/undefined
        for (const func of analysis.functions) {
          ranges.push({ start: func.startLine, end: func.endLine });
        }
        break;

      case 'race_condition':
        // Look for async functions
        for (const func of analysis.functions.filter(f => f.isAsync)) {
          ranges.push({ start: func.startLine, end: func.endLine });
        }
        break;

      case 'type_error':
        // Look for functions with complex parameters
        for (const func of analysis.functions.filter(f => f.params.length > 0)) {
          ranges.push({ start: func.startLine, end: func.endLine });
        }
        break;

      case 'cross_service_communication':
        // Look for error handling blocks
        for (const block of analysis.errorHandling) {
          ranges.push({ start: block.startLine, end: block.endLine });
        }
        break;

      case 'incorrect_logic':
      default:
        // Look for all functions
        for (const func of analysis.functions.slice(0, 3)) {
          ranges.push({ start: func.startLine, end: func.endLine });
        }
        break;
    }

    return ranges.slice(0, 5);
  }

  /**
   * Generate a human-readable description for a pattern-based hypothesis
   */
  private generatePatternDescription(
    pattern: ErrorPattern,
    affectedFiles: Hypothesis['affectedFiles'],
    issueContext: IssueContext
  ): string {
    const fileCount = affectedFiles.length;
    const fileNames = affectedFiles.slice(0, 2).map(f => this.extractFileName(f.path));

    switch (pattern.failureMode) {
      case 'null_reference':
        return `Potential null/undefined reference in ${fileNames.join(' or ')}. ` +
          `A variable or property may be accessed before it's properly initialized or after it's been set to null.`;

      case 'race_condition':
        return `Possible race condition affecting ${fileCount > 1 ? 'multiple files' : fileNames[0]}. ` +
          `Asynchronous operations may be executing in an unexpected order, causing data inconsistency.`;

      case 'type_error':
        return `Type mismatch detected in ${fileNames.join(' or ')}. ` +
          `A value of one type may be used where another type is expected.`;

      case 'cross_service_communication':
        return `Cross-service communication issue in ${fileNames.join(' or ')}. ` +
          `API calls may be failing due to network issues, incorrect endpoints, or malformed requests/responses.`;

      case 'incorrect_logic':
      default:
        return `Logic error in ${fileNames.join(' or ')}. ` +
          `The control flow or calculations may not handle all expected cases correctly.`;
    }
  }

  /**
   * Extract just the filename from a path
   */
  private extractFileName(filePath: string): string {
    const parts = filePath.split(/[/\\]/);
    return parts[parts.length - 1] || filePath;
  }

  /**
   * Generate hypotheses based on code structure analysis
   */
  private async generateStructureBasedHypotheses(
    startId: number,
    codeAnalysisContext: CodeAnalysisContext,
    issueContext: IssueContext,
    stackFrames: StackFrame[]
  ): Promise<Hypothesis[]> {
    const hypotheses: Hypothesis[] = [];
    let idCounter = startId;

    // Look for error handling gaps
    const errorHandlingHypothesis = this.checkErrorHandlingGaps(
      `HYP_${idCounter}`,
      codeAnalysisContext,
      stackFrames
    );

    if (errorHandlingHypothesis) {
      hypotheses.push(errorHandlingHypothesis);
      idCounter++;
    }

    // Look for async/await issues
    const asyncHypothesis = this.checkAsyncPatterns(
      `HYP_${idCounter}`,
      codeAnalysisContext,
      stackFrames
    );

    if (asyncHypothesis) {
      hypotheses.push(asyncHypothesis);
      idCounter++;
    }

    return hypotheses;
  }

  /**
   * Check for error handling gaps in code
   */
  private checkErrorHandlingGaps(
    id: string,
    codeAnalysisContext: CodeAnalysisContext,
    stackFrames: StackFrame[]
  ): Hypothesis | null {
    const affectedFiles: Hypothesis['affectedFiles'] = [];
    let hasGaps = false;

    for (const [filePath, analysis] of codeAnalysisContext.fileAnalyses) {
      // Check if file has async functions without corresponding error handling
      const asyncFuncs = analysis.functions.filter(f => f.isAsync);
      const errorBlocks = analysis.errorHandling;

      if (asyncFuncs.length > 0 && errorBlocks.length < asyncFuncs.length / 2) {
        hasGaps = true;

        // Find async functions without nearby error handling
        const uncoveredFuncs = this.findUncoveredAsyncFunctions(asyncFuncs, errorBlocks);

        if (uncoveredFuncs.length > 0) {
          affectedFiles.push({
            path: filePath,
            lineRanges: uncoveredFuncs.map(f => ({ start: f.startLine, end: f.endLine })),
          });
        }
      }
    }

    if (!hasGaps || affectedFiles.length === 0) {
      return null;
    }

    return {
      id,
      description: `Missing or incomplete error handling for asynchronous operations. ` +
        `Errors in async code may be silently swallowed or not properly propagated.`,
      confidence: 0.35,
      affectedFiles,
      failureMode: 'incorrect_logic',
      status: 'pending',
    };
  }

  /**
   * Find async functions without error handling coverage
   */
  private findUncoveredAsyncFunctions(
    asyncFuncs: FunctionDefinition[],
    errorBlocks: ErrorHandlingBlock[]
  ): FunctionDefinition[] {
    return asyncFuncs.filter(func => {
      // Check if any error handling block overlaps with this function
      const hasCoverage = errorBlocks.some(block =>
        block.startLine >= func.startLine && block.endLine <= func.endLine
      );
      return !hasCoverage;
    });
  }

  /**
   * Check for common async/await anti-patterns
   */
  private checkAsyncPatterns(
    id: string,
    codeAnalysisContext: CodeAnalysisContext,
    stackFrames: StackFrame[]
  ): Hypothesis | null {
    const affectedFiles: Hypothesis['affectedFiles'] = [];

    // Look for files with multiple async functions (potential ordering issues)
    for (const [filePath, analysis] of codeAnalysisContext.fileAnalyses) {
      const asyncFuncs = analysis.functions.filter(f => f.isAsync);

      if (asyncFuncs.length >= 3) {
        affectedFiles.push({
          path: filePath,
          lineRanges: asyncFuncs.slice(0, 3).map(f => ({ start: f.startLine, end: f.endLine })),
        });
      }
    }

    if (affectedFiles.length === 0) {
      return null;
    }

    return {
      id,
      description: `Potential async/await sequencing issue. Multiple async operations may need ` +
        `proper ordering or parallel execution handling.`,
      confidence: 0.25,
      affectedFiles,
      failureMode: 'race_condition',
      status: 'pending',
    };
  }

  /**
   * Generate hypotheses for issues crossing architectural boundaries
   */
  private async generateCrossFileHypotheses(
    startId: number,
    codeAnalysisContext: CodeAnalysisContext,
    issueContext: IssueContext,
    primaryFiles: string[]
  ): Promise<Hypothesis[]> {
    const hypotheses: Hypothesis[] = [];
    let idCounter = startId;

    // Check for API endpoint issues if we have endpoint data
    if (codeAnalysisContext.apiEndpoints && codeAnalysisContext.apiEndpoints.length > 0) {
      const apiHypothesis = this.generateAPIBoundaryHypothesis(
        `HYP_${idCounter}`,
        codeAnalysisContext,
        primaryFiles
      );

      if (apiHypothesis) {
        hypotheses.push(apiHypothesis);
        idCounter++;
      }
    }

    // Check for import chain issues
    if (codeAnalysisContext.relatedFiles.length > 2) {
      const importHypothesis = this.generateImportChainHypothesis(
        `HYP_${idCounter}`,
        codeAnalysisContext,
        primaryFiles
      );

      if (importHypothesis) {
        hypotheses.push(importHypothesis);
        idCounter++;
      }
    }

    return hypotheses;
  }

  /**
   * Generate hypothesis for API boundary issues
   */
  private generateAPIBoundaryHypothesis(
    id: string,
    codeAnalysisContext: CodeAnalysisContext,
    primaryFiles: string[]
  ): Hypothesis | null {
    if (!codeAnalysisContext.apiEndpoints || codeAnalysisContext.apiEndpoints.length === 0) {
      return null;
    }

    const affectedFiles: Hypothesis['affectedFiles'] = [];

    // Find API endpoints in primary files
    for (const endpoint of codeAnalysisContext.apiEndpoints) {
      if (primaryFiles.some(f => f.includes(endpoint.handlerFile) || endpoint.handlerFile.includes(f))) {
        affectedFiles.push({
          path: endpoint.handlerFile,
          lineRanges: [{ start: Math.max(1, endpoint.lineNumber - 2), end: endpoint.lineNumber + 20 }],
        });
      }
    }

    if (affectedFiles.length === 0) {
      return null;
    }

    return {
      id,
      description: `API boundary issue between frontend and backend components. ` +
        `Request/response data may not match expected formats or error handling may be inconsistent.`,
      confidence: 0.4,
      affectedFiles,
      failureMode: 'cross_service_communication',
      status: 'pending',
    };
  }

  /**
   * Generate hypothesis for import chain issues
   */
  private generateImportChainHypothesis(
    id: string,
    codeAnalysisContext: CodeAnalysisContext,
    primaryFiles: string[]
  ): Hypothesis | null {
    const affectedFiles: Hypothesis['affectedFiles'] = [];

    // Check for circular-like patterns or long import chains
    for (const file of primaryFiles.slice(0, 2)) {
      const analysis = codeAnalysisContext.fileAnalyses.get(file);

      if (analysis && analysis.imports.length > 5) {
        affectedFiles.push({
          path: file,
          lineRanges: [{ start: 1, end: Math.max(...analysis.imports.map(i => i.lineNumber)) + 5 }],
        });
      }
    }

    // Add some related files
    for (const file of codeAnalysisContext.relatedFiles.slice(0, 2)) {
      if (!affectedFiles.some(f => f.path === file)) {
        const analysis = codeAnalysisContext.fileAnalyses.get(file);

        affectedFiles.push({
          path: file,
          lineRanges: analysis?.imports.length
            ? [{ start: 1, end: 30 }]
            : [{ start: 1, end: 20 }],
        });
      }
    }

    if (affectedFiles.length < 2) {
      return null;
    }

    return {
      id,
      description: `Cross-file dependency issue. Data or state may be incorrectly passed or transformed ` +
        `between modules in the import chain.`,
      confidence: 0.3,
      affectedFiles,
      failureMode: 'incorrect_logic',
      status: 'pending',
    };
  }

  /**
   * Generate hypothesis specifically for flaky/intermittent issues
   */
  private generateFlakyHypothesis(
    id: string,
    primaryFiles: string[],
    codeAnalysisContext: CodeAnalysisContext
  ): Hypothesis | null {
    const affectedFiles: Hypothesis['affectedFiles'] = [];

    // Look for async operations in primary files
    for (const file of primaryFiles.slice(0, 3)) {
      const analysis = codeAnalysisContext.fileAnalyses.get(file);

      if (analysis) {
        const asyncFuncs = analysis.functions.filter(f => f.isAsync);

        if (asyncFuncs.length > 0) {
          affectedFiles.push({
            path: file,
            lineRanges: asyncFuncs.map(f => ({ start: f.startLine, end: f.endLine })),
          });
        }
      }
    }

    if (affectedFiles.length === 0) {
      // Add primary files with generic ranges
      for (const file of primaryFiles.slice(0, 2)) {
        affectedFiles.push({
          path: file,
          lineRanges: [{ start: 1, end: 50 }],
        });
      }
    }

    return {
      id,
      description: `Timing-dependent race condition causing intermittent failures. ` +
        `The order of asynchronous operations may vary between runs, leading to inconsistent behavior.`,
      confidence: 0.5, // Higher confidence for flaky issues
      affectedFiles,
      failureMode: 'race_condition',
      status: 'pending',
    };
  }

  /**
   * Rank hypotheses by confidence and limit to maxHypotheses
   */
  private rankAndLimitHypotheses(hypotheses: Hypothesis[]): Hypothesis[] {
    // Sort by confidence (descending)
    const sorted = hypotheses.sort((a, b) => b.confidence - a.confidence);

    // Remove duplicates (same failure mode + similar files)
    const deduplicated = this.deduplicateHypotheses(sorted);

    // Limit to configured max
    const limited = deduplicated.slice(0, this.config.maxHypotheses);

    // Ensure we have at least 3 hypotheses if possible
    if (limited.length < 3 && deduplicated.length >= 3) {
      return deduplicated.slice(0, 3);
    }

    return limited;
  }

  /**
   * Remove duplicate or highly similar hypotheses
   */
  private deduplicateHypotheses(hypotheses: Hypothesis[]): Hypothesis[] {
    const seen = new Set<string>();
    const deduplicated: Hypothesis[] = [];

    for (const hypothesis of hypotheses) {
      // Create a key from failure mode and primary file
      const primaryFile = hypothesis.affectedFiles[0]?.path || 'unknown';
      const key = `${hypothesis.failureMode}:${this.extractFileName(primaryFile)}`;

      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(hypothesis);
      }
    }

    return deduplicated;
  }

  /**
   * Build code analysis context from a list of files
   *
   * Utility method to help users construct CodeAnalysisContext
   */
  async buildCodeAnalysisContext(files: string[]): Promise<CodeAnalysisContext> {
    const fileAnalyses = new Map<string, CodeAnalysisResult>();
    const allRelatedFiles = new Set<string>();

    // Analyze each file
    for (const file of files) {
      try {
        const analysis = await this.codeAnalyzer.analyzeFile(file);
        fileAnalyses.set(file, analysis);

        // Get related files
        const related = await this.dependencyGraph.getRelatedFiles(file);
        for (const relatedFile of related) {
          allRelatedFiles.add(relatedFile);
        }
      } catch (error) {
        // Log but continue with other files
        console.warn('Failed to analyze file:', file, error);
      }
    }

    // Get API endpoints
    let apiEndpoints;
    try {
      apiEndpoints = await this.dependencyGraph.identifyAPIEndpoints();
    } catch (error) {
      console.warn('Failed to identify API endpoints:', error);
    }

    return {
      fileAnalyses,
      relatedFiles: Array.from(allRelatedFiles),
      apiEndpoints,
    };
  }
}
