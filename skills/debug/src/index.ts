/**
 * Debug Skill - Session Management and Intake
 *
 * Exports core session management and intake functionality for the debug skill
 */

export { SessionManager } from './SessionManager';
export type {
  SessionId,
  SessionState,
  Hypothesis,
  InstrumentedFile,
  ResearchFinding,
  FixAttempt,
} from './types';

export { performIntake, detectFlakyIssue, generateSessionId } from './intake';
export type { IssueIntakeInput, IntakeResult } from './intake';

export { CodeAnalyzer } from './CodeAnalyzer';
export type {
  Language,
  FunctionDefinition,
  ClassDefinition,
  ImportStatement,
  ErrorHandlingBlock,
  CodeAnalysisResult,
} from './CodeAnalyzer';

export { DependencyGraph } from './DependencyGraph';
export type {
  FileDependency,
  APIEndpoint,
  DependencyGraphConfig,
} from './DependencyGraph';

export { HypothesisGenerator } from './HypothesisGenerator';
export type {
  IssueContext,
  CodeAnalysisContext,
  HypothesisGeneratorConfig,
} from './HypothesisGenerator';

export { LoggingInfrastructure } from './LoggingInfrastructure';
export type {
  LoggingFramework,
  LogLocation,
  LoggingReport,
} from './LoggingInfrastructure';
