/**
 * Tests for LoggingInfrastructure class
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  LoggingInfrastructure,
  LoggingFramework,
  LoggingReport,
} from './LoggingInfrastructure';

describe('LoggingInfrastructure', () => {
  let tmpDir: string;
  let analyzer: LoggingInfrastructure;

  beforeEach(() => {
    // Create temporary directory for test files
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'logging-test-'));
    analyzer = new LoggingInfrastructure();
  });

  afterEach(() => {
    // Clean up temporary directory
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('Winston framework detection', () => {
    it('should detect winston logger', () => {
      const file = path.join(tmpDir, 'winston-test.ts');
      fs.writeFileSync(
        file,
        `
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
});

function processData(data: any) {
  logger.info('Processing data', { data });
  logger.warn('Warning message');
  logger.error('Error occurred', { error: 'details' });
}
`
      );

      const report = analyzer.analyzeLogging([file]);

      expect(report.primaryFramework).toBe('winston');
      expect(report.allFrameworks).toContain('winston');
      expect(report.logsByFile[file]).toHaveLength(3);
      expect(report.logsByFile[file][0].level).toBe('info');
      expect(report.logsByFile[file][1].level).toBe('warn');
      expect(report.logsByFile[file][2].level).toBe('error');
    });
  });

  describe('Pino framework detection', () => {
    it('should detect pino logger', () => {
      const file = path.join(tmpDir, 'pino-test.js');
      fs.writeFileSync(
        file,
        `
const pino = require('pino');
const logger = pino();

function handleRequest(req) {
  logger.info({ req }, 'Request received');
  logger.debug('Debug message');
  logger.trace('Trace message');
}
`
      );

      const report = analyzer.analyzeLogging([file]);

      expect(report.primaryFramework).toBe('pino');
      expect(report.logsByFile[file]).toHaveLength(3);
    });
  });

  describe('Python logging detection', () => {
    it('should detect Python logging module', () => {
      const file = path.join(tmpDir, 'python-test.py');
      fs.writeFileSync(
        file,
        `
import logging

logger = logging.getLogger(__name__)

def process_data(data):
    logger.info('Processing data: %s', data)
    logger.warning('Warning message')
    logging.error('Error occurred')
    logging.debug('Debug info')
`
      );

      const report = analyzer.analyzeLogging([file]);

      expect(report.primaryFramework).toBe('logging');
      expect(report.logsByFile[file]).toHaveLength(4);
      expect(report.logsByFile[file][0].level).toBe('info');
      expect(report.logsByFile[file][1].level).toBe('warning');
    });
  });

  describe('Go logrus detection', () => {
    it('should detect logrus logger', () => {
      const file = path.join(tmpDir, 'logrus-test.go');
      fs.writeFileSync(
        file,
        `
package main

import (
    "github.com/sirupsen/logrus"
)

func processData(data string) {
    logrus.Info("Processing data")
    logrus.Warn("Warning message")
    logrus.Error("Error occurred")
    log.Debugf("Debug: %s", data)
}
`
      );

      const report = analyzer.analyzeLogging([file]);

      expect(report.primaryFramework).toBe('logrus');
      expect(report.logsByFile[file].length).toBeGreaterThan(0);
    });
  });

  describe('Console logging detection', () => {
    it('should detect console.log statements', () => {
      const file = path.join(tmpDir, 'console-test.ts');
      fs.writeFileSync(
        file,
        `
function processData(data: any) {
  console.log('Processing:', data);
  console.info('Info message');
  console.warn('Warning');
  console.error('Error occurred');
}
`
      );

      const report = analyzer.analyzeLogging([file]);

      expect(report.primaryFramework).toBe('console');
      expect(report.logsByFile[file]).toHaveLength(4);
      expect(report.logsByFile[file][0].level).toBe('log');
      expect(report.logsByFile[file][2].level).toBe('warn');
    });

    it('should detect Go fmt.Println', () => {
      const file = path.join(tmpDir, 'fmt-test.go');
      fs.writeFileSync(
        file,
        `
package main

import "fmt"

func main() {
    fmt.Println("Hello world")
    fmt.Printf("Value: %d", 42)
}
`
      );

      const report = analyzer.analyzeLogging([file]);

      expect(report.primaryFramework).toBe('console');
      expect(report.logsByFile[file]).toHaveLength(2);
    });
  });

  describe('External-only logging detection', () => {
    it('should detect Datadog', () => {
      const file = path.join(tmpDir, 'datadog-test.ts');
      fs.writeFileSync(
        file,
        `
import tracer from 'dd-trace';
tracer.init();

function processData(data: any) {
  // No local logging, only Datadog
}
`
      );

      const report = analyzer.analyzeLogging([file]);

      expect(report.hasExternalOnlyLogging).toBe(true);
      expect(report.allFrameworks).toContain('external_only');
    });

    it('should detect Sentry', () => {
      const file = path.join(tmpDir, 'sentry-test.js');
      fs.writeFileSync(
        file,
        `
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: 'https://example.com',
});
`
      );

      const report = analyzer.analyzeLogging([file]);

      expect(report.hasExternalOnlyLogging).toBe(true);
      expect(report.primaryFramework).toBe('external_only');
    });
  });

  describe('Mixed framework detection', () => {
    it('should prioritize structured logging over console', () => {
      const file1 = path.join(tmpDir, 'winston.ts');
      const file2 = path.join(tmpDir, 'console.ts');

      fs.writeFileSync(
        file1,
        `
import winston from 'winston';
const logger = winston.createLogger();
logger.info('Winston log');
`
      );

      fs.writeFileSync(
        file2,
        `
console.log('Console log');
console.error('Console error');
`
      );

      const report = analyzer.analyzeLogging([file1, file2]);

      expect(report.primaryFramework).toBe('winston');
      expect(report.allFrameworks).toContain('winston');
      expect(report.allFrameworks).toContain('console');
    });
  });

  describe('Coverage assessment', () => {
    it('should report none coverage when no logs found', () => {
      const file = path.join(tmpDir, 'no-logs.ts');
      fs.writeFileSync(
        file,
        `
function processData(data: any) {
  return data * 2;
}
`
      );

      const report = analyzer.analyzeLogging([file]);

      expect(report.coverage).toBe('none');
      expect(report.primaryFramework).toBe('none');
    });

    it('should report sparse coverage with few logs', () => {
      const file1 = path.join(tmpDir, 'sparse1.ts');
      const file2 = path.join(tmpDir, 'sparse2.ts');

      fs.writeFileSync(
        file1,
        `
console.log('Single log');
function processData(data: any) {
  return data;
}
`
      );

      fs.writeFileSync(file2, `function noLogs() { return 42; }`);

      const report = analyzer.analyzeLogging([file1, file2]);

      expect(report.coverage).toBe('sparse');
    });

    it('should report moderate coverage with several logs', () => {
      const files = [];
      for (let i = 0; i < 5; i++) {
        const file = path.join(tmpDir, `moderate${i}.ts`);
        fs.writeFileSync(
          file,
          `
console.log('Log 1');
console.log('Log 2');
function test() { }
`
        );
        files.push(file);
      }

      const report = analyzer.analyzeLogging(files);

      expect(report.coverage).toBe('moderate');
    });

    it('should report comprehensive coverage with many logs', () => {
      const files = [];
      for (let i = 0; i < 5; i++) {
        const file = path.join(tmpDir, `comprehensive${i}.ts`);
        fs.writeFileSync(
          file,
          `
console.log('Log 1');
console.warn('Log 2');
console.error('Log 3');
console.debug('Log 4');
function test() { }
`
        );
        files.push(file);
      }

      const report = analyzer.analyzeLogging(files);

      expect(report.coverage).toBe('comprehensive');
    });
  });

  describe('Recommendation generation', () => {
    it('should recommend console.log when no framework detected', () => {
      const file = path.join(tmpDir, 'none.ts');
      fs.writeFileSync(file, `function test() { return 42; }`);

      const report = analyzer.analyzeLogging([file]);

      expect(report.recommendation).toContain('console.log');
      expect(report.recommendation).toContain('No local logging framework');
    });

    it('should recommend using detected structured framework', () => {
      const file = path.join(tmpDir, 'winston.ts');
      fs.writeFileSync(
        file,
        `
import winston from 'winston';
const logger = winston.createLogger();
logger.info('Test');
`
      );

      const report = analyzer.analyzeLogging([file]);

      expect(report.recommendation).toContain('winston');
      expect(report.recommendation).toContain('maintain consistency');
    });

    it('should recommend console fallback for external-only logging', () => {
      const file = path.join(tmpDir, 'sentry.ts');
      fs.writeFileSync(
        file,
        `
import * as Sentry from '@sentry/node';
Sentry.init({ dsn: 'https://example.com' });
`
      );

      const report = analyzer.analyzeLogging([file]);

      expect(report.recommendation).toContain('console.log fallback');
      expect(report.recommendation).toContain('local debugging visibility');
    });
  });

  describe('Context extraction', () => {
    it('should extract context around log statements', () => {
      const file = path.join(tmpDir, 'context.ts');
      fs.writeFileSync(
        file,
        `
function processData(data: any) {
  const result = transform(data);
  console.log('Result:', result);
  return result;
}
`
      );

      const report = analyzer.analyzeLogging([file]);

      expect(report.logsByFile[file][0].context).toContain('processData');
      expect(report.logsByFile[file][0].context).toContain('transform(data)');
      expect(report.logsByFile[file][0].context).toContain('return result');
    });
  });

  describe('Comment filtering', () => {
    it('should ignore logs in comments', () => {
      const file = path.join(tmpDir, 'comments.ts');
      fs.writeFileSync(
        file,
        `
function test() {
  // console.log('commented out');
  /*
   * logger.info('in block comment');
   */
  console.log('actual log');
}
`
      );

      const report = analyzer.analyzeLogging([file]);

      expect(report.logsByFile[file]).toHaveLength(1);
      expect(report.logsByFile[file][0].line).toBe(6);
    });
  });

  describe('getRecommendedLogFormat', () => {
    it('should return correct format for winston', () => {
      const format = analyzer.getRecommendedLogFormat('winston', 'info');
      expect(format).toContain('logger.info');
      expect(format).toContain('context');
    });

    it('should return correct format for Python logging', () => {
      const format = analyzer.getRecommendedLogFormat('logging', 'error');
      expect(format).toContain('logger.error');
      expect(format).toContain('%s');
    });

    it('should return correct format for Go logrus', () => {
      const format = analyzer.getRecommendedLogFormat('logrus', 'warn');
      expect(format).toContain('logger.Warn');
    });

    it('should return console format as fallback', () => {
      const format = analyzer.getRecommendedLogFormat('none', 'log');
      expect(format).toContain('console.log');
    });
  });

  describe('Non-existent file handling', () => {
    it('should handle non-existent files gracefully', () => {
      const report = analyzer.analyzeLogging([
        '/non/existent/file1.ts',
        '/non/existent/file2.ts',
      ]);

      expect(report.filesAnalyzed).toEqual([]);
      expect(report.coverage).toBe('none');
    });
  });

  describe('Empty file handling', () => {
    it('should handle empty files', () => {
      const file = path.join(tmpDir, 'empty.ts');
      fs.writeFileSync(file, '');

      const report = analyzer.analyzeLogging([file]);

      expect(report.filesAnalyzed).toContain(file);
      expect(report.coverage).toBe('none');
    });
  });
});
