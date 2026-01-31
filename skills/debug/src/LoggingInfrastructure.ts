/**
 * Logging Infrastructure Analyzer
 *
 * Scans codebases to detect existing logging infrastructure and coverage.
 * This helps avoid duplicate logging when adding instrumentation.
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Detected logging framework type
 */
export type LoggingFramework =
  | 'winston'
  | 'pino'
  | 'bunyan'
  | 'logging' // Python
  | 'logrus'
  | 'zap'
  | 'slf4j'
  | 'logback'
  | 'console'
  | 'external_only'
  | 'none';

/**
 * Location of a logging statement in code
 */
export interface LogLocation {
  /** File path */
  file: string;

  /** Line number where log statement appears */
  line: number;

  /** Log level (info, warn, error, debug, etc.) */
  level: string;

  /** Context of the log statement (surrounding code) */
  context: string;

  /** Framework used for this log statement */
  framework: LoggingFramework;
}

/**
 * Report of logging coverage in a set of files
 */
export interface LoggingReport {
  /** Primary logging framework detected */
  primaryFramework: LoggingFramework;

  /** All frameworks found in the codebase */
  allFrameworks: LoggingFramework[];

  /** Whether external-only logging (Datadog, Sentry) is detected */
  hasExternalOnlyLogging: boolean;

  /** Recommendation for adding instrumentation */
  recommendation: string;

  /** Existing log locations by file */
  logsByFile: Record<string, LogLocation[]>;

  /** Overall logging coverage assessment */
  coverage: 'none' | 'sparse' | 'moderate' | 'comprehensive';

  /** Files analyzed */
  filesAnalyzed: string[];
}

/**
 * Patterns for detecting logging frameworks
 */
const LOGGING_PATTERNS = {
  // Node.js frameworks
  winston: [
    /winston\.createLogger/,
    /logger\.log\(/,
    /logger\.(info|warn|error|debug|verbose|silly)\(/,
    /import.*winston/,
    /require\(['"]winston['"]\)/,
  ],
  pino: [
    /pino\(/,
    /logger\.(info|warn|error|debug|trace|fatal)\(/,
    /import.*pino/,
    /require\(['"]pino['"]\)/,
  ],
  bunyan: [
    /bunyan\.createLogger/,
    /logger\.(trace|debug|info|warn|error|fatal)\(/,
    /import.*bunyan/,
    /require\(['"]bunyan['"]\)/,
  ],

  // Python
  logging: [
    /import logging/,
    /logging\.(debug|info|warning|error|critical)\(/,
    /logger\.(debug|info|warning|error|critical)\(/,
    /logging\.getLogger/,
  ],

  // Go
  logrus: [
    /import.*logrus/,
    /logrus\.(Debug|Info|Warn|Error|Fatal|Panic)/,
    /log\.(Debug|Info|Warn|Error|Fatal|Panic)f?\(/,
  ],
  zap: [
    /import.*zap/,
    /zap\.NewProduction/,
    /logger\.(Debug|Info|Warn|Error|Fatal|Panic)/,
  ],

  // Java/Kotlin
  slf4j: [
    /import org\.slf4j/,
    /LoggerFactory\.getLogger/,
    /logger\.(debug|info|warn|error)\(/,
  ],
  logback: [
    /import ch\.qos\.logback/,
    /LoggerContext/,
  ],

  // Console logging
  console: [
    /console\.(log|info|warn|error|debug)\(/,
    /print\(/,
    /println\(/,
    /fmt\.(Print|Println)/,
    /System\.out\.(print|println)/,
  ],

  // External-only services
  external_only: [
    /datadog/i,
    /sentry/i,
    /newrelic/i,
    /loggly/i,
    /splunk/i,
    /@sentry\/node/,
    /dd-trace/,
  ],
};

/**
 * Log level extraction patterns by framework
 */
const LOG_LEVEL_PATTERNS: Record<string, RegExp> = {
  standard: /\.(trace|debug|info|log|warn|warning|error|fatal|critical|panic|silly|verbose)\(/,
  console: /console\.(log|info|warn|error|debug)\(/,
  python: /logging\.(debug|info|warning|error|critical)\(/,
  go: /\.(Debug|Info|Warn|Error|Fatal|Panic)f?\(/,
};

/**
 * Analyzes logging infrastructure in a codebase
 */
export class LoggingInfrastructure {
  /**
   * Analyzes logging infrastructure across specified files
   *
   * @param files - Array of file paths to analyze
   * @returns LoggingReport with detected frameworks and coverage
   */
  analyzeLogging(files: string[]): LoggingReport {
    const allFrameworks = new Set<LoggingFramework>();
    const logsByFile: Record<string, LogLocation[]> = {};
    const filesAnalyzed: string[] = [];
    let hasExternalOnlyLogging = false;

    // Analyze each file
    for (const file of files) {
      if (!fs.existsSync(file)) {
        continue;
      }

      filesAnalyzed.push(file);
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      const fileLogs = this.scanFileForLogs(file, lines);
      if (fileLogs.length > 0) {
        logsByFile[file] = fileLogs;
        fileLogs.forEach((log) => allFrameworks.add(log.framework));
      }

      // Check for external-only logging
      if (this.detectExternalLogging(content)) {
        hasExternalOnlyLogging = true;
        allFrameworks.add('external_only');
      }
    }

    // Determine primary framework
    const primaryFramework = this.determinePrimaryFramework(
      Array.from(allFrameworks)
    );

    // Calculate coverage
    const coverage = this.calculateCoverage(logsByFile, filesAnalyzed.length);

    // Generate recommendation
    const recommendation = this.generateRecommendation(
      primaryFramework,
      hasExternalOnlyLogging,
      coverage
    );

    return {
      primaryFramework,
      allFrameworks: Array.from(allFrameworks),
      hasExternalOnlyLogging,
      recommendation,
      logsByFile,
      coverage,
      filesAnalyzed,
    };
  }

  /**
   * Scans a single file for logging statements
   */
  private scanFileForLogs(file: string, lines: string[]): LogLocation[] {
    const logs: LogLocation[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Skip comments
      if (
        trimmed.startsWith('//') ||
        trimmed.startsWith('#') ||
        trimmed.startsWith('/*') ||
        trimmed.startsWith('*')
      ) {
        continue;
      }

      // Check for logging statements
      const framework = this.detectFrameworkInLine(line);
      if (framework && framework !== 'none' && framework !== 'external_only') {
        const level = this.extractLogLevel(line);
        const context = this.extractContext(lines, i);

        logs.push({
          file,
          line: i + 1,
          level,
          context,
          framework,
        });
      }
    }

    return logs;
  }

  /**
   * Detects which logging framework is used in a line of code
   */
  private detectFrameworkInLine(line: string): LoggingFramework {
    for (const [framework, patterns] of Object.entries(LOGGING_PATTERNS)) {
      if (framework === 'external_only') continue;

      for (const pattern of patterns) {
        if (pattern.test(line)) {
          return framework as LoggingFramework;
        }
      }
    }
    return 'none';
  }

  /**
   * Detects external-only logging services
   */
  private detectExternalLogging(content: string): boolean {
    for (const pattern of LOGGING_PATTERNS.external_only) {
      if (pattern.test(content)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Extracts log level from a logging statement
   */
  private extractLogLevel(line: string): string {
    for (const pattern of Object.values(LOG_LEVEL_PATTERNS)) {
      const match = line.match(pattern);
      if (match && match[1]) {
        return match[1].toLowerCase();
      }
    }
    return 'unknown';
  }

  /**
   * Extracts context around a log statement (3 lines before and after)
   */
  private extractContext(lines: string[], index: number): string {
    const start = Math.max(0, index - 3);
    const end = Math.min(lines.length, index + 4);
    return lines.slice(start, end).join('\n');
  }

  /**
   * Determines the primary framework from detected frameworks
   */
  private determinePrimaryFramework(
    frameworks: LoggingFramework[]
  ): LoggingFramework {
    // Remove 'none' and 'external_only' from consideration
    const validFrameworks = frameworks.filter(
      (f) => f !== 'none' && f !== 'external_only'
    );

    if (validFrameworks.length === 0) {
      return frameworks.includes('external_only') ? 'external_only' : 'none';
    }

    // Priority order: structured frameworks > console
    const priority: Record<LoggingFramework, number> = {
      winston: 9,
      pino: 9,
      bunyan: 8,
      logging: 7,
      logrus: 7,
      zap: 7,
      slf4j: 7,
      logback: 6,
      console: 1,
      external_only: 0,
      none: 0,
    };

    validFrameworks.sort((a, b) => (priority[b] || 0) - (priority[a] || 0));
    return validFrameworks[0];
  }

  /**
   * Calculates logging coverage assessment
   */
  private calculateCoverage(
    logsByFile: Record<string, LogLocation[]>,
    totalFiles: number
  ): 'none' | 'sparse' | 'moderate' | 'comprehensive' {
    const filesWithLogs = Object.keys(logsByFile).length;
    const totalLogs = Object.values(logsByFile).reduce(
      (sum, logs) => sum + logs.length,
      0
    );

    if (totalLogs === 0) {
      return 'none';
    }

    const filesCovered = filesWithLogs / totalFiles;
    const avgLogsPerFile = totalLogs / totalFiles;

    if (filesCovered >= 0.7 && avgLogsPerFile >= 3) {
      return 'comprehensive';
    } else if (filesCovered >= 0.4 || avgLogsPerFile >= 2) {
      return 'moderate';
    } else {
      return 'sparse';
    }
  }

  /**
   * Generates recommendation for instrumentation
   */
  private generateRecommendation(
    primaryFramework: LoggingFramework,
    hasExternalOnlyLogging: boolean,
    coverage: string
  ): string {
    const recommendations: string[] = [];

    // Framework recommendation
    if (primaryFramework === 'none' || primaryFramework === 'external_only') {
      recommendations.push(
        'No local logging framework detected. Use console.log for instrumentation to ensure logs are visible locally.'
      );
    } else if (primaryFramework === 'console') {
      recommendations.push(
        'Console logging detected. Continue using console.log for consistency.'
      );
    } else {
      recommendations.push(
        `Structured logging framework '${primaryFramework}' detected. Use it for instrumentation to maintain consistency.`
      );
    }

    // External-only logging recommendation
    if (hasExternalOnlyLogging && primaryFramework !== 'console') {
      recommendations.push(
        'External logging services detected (Datadog/Sentry). Consider adding console.log fallback for local debugging visibility.'
      );
    }

    // Coverage recommendation
    if (coverage === 'none' || coverage === 'sparse') {
      recommendations.push(
        'Limited existing logging. Add comprehensive instrumentation around suspected failure points.'
      );
    } else if (coverage === 'moderate') {
      recommendations.push(
        'Moderate logging coverage. Focus instrumentation on gaps in current logging.'
      );
    } else {
      recommendations.push(
        'Good logging coverage. Add targeted instrumentation only where hypothesis-specific visibility is needed.'
      );
    }

    return recommendations.join(' ');
  }

  /**
   * Gets recommended logging statement format for detected framework
   */
  getRecommendedLogFormat(
    framework: LoggingFramework,
    level: string = 'info'
  ): string {
    switch (framework) {
      case 'winston':
      case 'pino':
      case 'bunyan':
        return `logger.${level}('message', { context: 'value' })`;
      case 'logging':
        return `logger.${level}('message: %s', variable)`;
      case 'logrus':
      case 'zap':
        return `logger.${level.charAt(0).toUpperCase() + level.slice(1)}('message')`;
      case 'slf4j':
      case 'logback':
        return `logger.${level}("message: {}", variable)`;
      case 'console':
      case 'external_only':
      case 'none':
      default:
        return `console.${level}('message:', variable)`;
    }
  }
}
