/**
 * CodeAnalyzer - Language detection and AST analysis utilities
 *
 * Provides language-aware code analysis for hypothesis generation.
 * Supports AST parsing for TypeScript/JavaScript with regex fallback for other languages.
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Supported programming languages
 */
export type Language = 'typescript' | 'javascript' | 'python' | 'go' | 'java' | 'kotlin' | 'unknown';

/**
 * File extension to language mapping
 */
const EXTENSION_MAP: Record<string, Language> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.py': 'python',
  '.go': 'go',
  '.java': 'java',
  '.kt': 'kotlin',
  '.kts': 'kotlin',
};

/**
 * Represents a function definition found in code
 */
export interface FunctionDefinition {
  name: string;
  startLine: number;
  endLine: number;
  params: string[];
  isAsync: boolean;
}

/**
 * Represents a class definition found in code
 */
export interface ClassDefinition {
  name: string;
  startLine: number;
  endLine: number;
  methods: string[];
}

/**
 * Represents an import statement
 */
export interface ImportStatement {
  module: string;
  imports: string[];
  lineNumber: number;
  isDefault: boolean;
}

/**
 * Represents an error handling block (try-catch, etc.)
 */
export interface ErrorHandlingBlock {
  type: 'try-catch' | 'if-error' | 'promise-catch' | 'defer-panic';
  startLine: number;
  endLine: number;
  handlesError: string; // Variable name being caught
}

/**
 * Analysis result from code parsing
 */
export interface CodeAnalysisResult {
  language: Language;
  functions: FunctionDefinition[];
  classes: ClassDefinition[];
  imports: ImportStatement[];
  errorHandling: ErrorHandlingBlock[];
  parseMethod: 'ast' | 'regex';
}

/**
 * CodeAnalyzer - Analyzes source code to extract structure
 */
export class CodeAnalyzer {
  /**
   * Detect language from file path
   */
  static detectLanguage(filePath: string): Language {
    const ext = path.extname(filePath).toLowerCase();
    return EXTENSION_MAP[ext] || 'unknown';
  }

  /**
   * Analyze a file and extract code structure
   *
   * Attempts AST parsing for TypeScript/JavaScript, falls back to regex for other languages.
   */
  async analyzeFile(filePath: string): Promise<CodeAnalysisResult> {
    const language = CodeAnalyzer.detectLanguage(filePath);
    const content = fs.readFileSync(filePath, 'utf-8');

    // Try AST parsing for TypeScript/JavaScript
    if (language === 'typescript' || language === 'javascript') {
      try {
        return await this.analyzeWithAST(content, language);
      } catch (error) {
        // Fall back to regex if AST parsing fails
        console.warn('AST parsing failed for file, falling back to regex:', filePath, error);
        return this.analyzeWithRegex(content, language);
      }
    }

    // Use regex for other languages
    return this.analyzeWithRegex(content, language);
  }

  /**
   * Parse TypeScript/JavaScript using AST (@babel/parser)
   */
  private async analyzeWithAST(content: string, language: Language): Promise<CodeAnalysisResult> {
    // Import babel parser dynamically to handle if not installed
    let parser: any;
    try {
      parser = await import('@babel/parser');
    } catch {
      throw new Error('@babel/parser not available, falling back to regex');
    }

    const ast = parser.parse(content, {
      sourceType: 'module',
      plugins: [
        'typescript',
        'jsx',
        'decorators-legacy',
        'classProperties',
        'asyncGenerators',
        'bigInt',
        'classPrivateProperties',
        'classPrivateMethods',
        'dynamicImport',
        'exportDefaultFrom',
        'exportNamespaceFrom',
        'functionBind',
        'nullishCoalescingOperator',
        'objectRestSpread',
        'optionalCatchBinding',
        'optionalChaining',
        'topLevelAwait',
      ],
    });

    const functions: FunctionDefinition[] = [];
    const classes: ClassDefinition[] = [];
    const imports: ImportStatement[] = [];
    const errorHandling: ErrorHandlingBlock[] = [];

    // Traverse AST to extract information
    this.traverseAST(ast, {
      onFunction: (node: any) => {
        if (node.loc) {
          functions.push({
            name: node.id?.name || '<anonymous>',
            startLine: node.loc.start.line,
            endLine: node.loc.end.line,
            params: node.params.map((p: any) => p.name || p.left?.name || '<param>'),
            isAsync: node.async || false,
          });
        }
      },
      onClass: (node: any) => {
        if (node.loc) {
          const methods = node.body.body
            .filter((m: any) => m.type === 'ClassMethod' || m.type === 'ClassProperty')
            .map((m: any) => m.key?.name || '<method>');

          classes.push({
            name: node.id?.name || '<anonymous>',
            startLine: node.loc.start.line,
            endLine: node.loc.end.line,
            methods,
          });
        }
      },
      onImport: (node: any) => {
        if (node.loc) {
          const isDefault = node.specifiers.some((s: any) => s.type === 'ImportDefaultSpecifier');
          imports.push({
            module: node.source.value,
            imports: node.specifiers.map((s: any) => s.local.name),
            lineNumber: node.loc.start.line,
            isDefault,
          });
        }
      },
      onTryCatch: (node: any) => {
        if (node.loc) {
          errorHandling.push({
            type: 'try-catch',
            startLine: node.loc.start.line,
            endLine: node.loc.end.line,
            handlesError: node.handler?.param?.name || 'error',
          });
        }
      },
      onPromiseCatch: (node: any) => {
        if (node.loc) {
          errorHandling.push({
            type: 'promise-catch',
            startLine: node.loc.start.line,
            endLine: node.loc.end.line,
            handlesError: 'error',
          });
        }
      },
    });

    return {
      language,
      functions,
      classes,
      imports,
      errorHandling,
      parseMethod: 'ast',
    };
  }

  /**
   * Traverse AST and call callbacks for different node types
   */
  private traverseAST(node: any, callbacks: {
    onFunction?: (node: any) => void;
    onClass?: (node: any) => void;
    onImport?: (node: any) => void;
    onTryCatch?: (node: any) => void;
    onPromiseCatch?: (node: any) => void;
  }) {
    if (!node || typeof node !== 'object') return;

    // Handle function declarations/expressions/arrow functions
    if (
      node.type === 'FunctionDeclaration' ||
      node.type === 'FunctionExpression' ||
      node.type === 'ArrowFunctionExpression' ||
      node.type === 'ObjectMethod' ||
      node.type === 'ClassMethod'
    ) {
      callbacks.onFunction?.(node);
    }

    // Handle class declarations
    if (node.type === 'ClassDeclaration' || node.type === 'ClassExpression') {
      callbacks.onClass?.(node);
    }

    // Handle import statements
    if (node.type === 'ImportDeclaration') {
      callbacks.onImport?.(node);
    }

    // Handle try-catch statements
    if (node.type === 'TryStatement') {
      callbacks.onTryCatch?.(node);
    }

    // Handle promise catch (CallExpression with callee.property.name === 'catch')
    if (node.type === 'CallExpression' && node.callee?.property?.name === 'catch') {
      callbacks.onPromiseCatch?.(node);
    }

    // Recursively traverse child nodes
    for (const key in node) {
      if (key === 'loc' || key === 'range' || key === 'comments') continue;
      const child = node[key];
      if (Array.isArray(child)) {
        child.forEach(c => this.traverseAST(c, callbacks));
      } else {
        this.traverseAST(child, callbacks);
      }
    }
  }

  /**
   * Parse code using regex patterns (fallback or for non-JS languages)
   */
  private analyzeWithRegex(content: string, language: Language): CodeAnalysisResult {
    const lines = content.split('\n');
    const functions: FunctionDefinition[] = [];
    const classes: ClassDefinition[] = [];
    const imports: ImportStatement[] = [];
    const errorHandling: ErrorHandlingBlock[] = [];

    // Language-specific regex patterns
    const patterns = this.getRegexPatterns(language);

    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      // Extract function definitions
      if (patterns.function) {
        const funcMatch = line.match(patterns.function);
        if (funcMatch) {
          functions.push({
            name: funcMatch[1] || '<anonymous>',
            startLine: lineNumber,
            endLine: lineNumber, // Regex can't determine end accurately
            params: this.extractParams(funcMatch[2] || ''),
            isAsync: line.includes('async'),
          });
        }
      }

      // Extract class definitions
      if (patterns.class) {
        const classMatch = line.match(patterns.class);
        if (classMatch) {
          classes.push({
            name: classMatch[1],
            startLine: lineNumber,
            endLine: lineNumber, // Regex can't determine end accurately
            methods: [], // Can't extract methods easily with single-line regex
          });
        }
      }

      // Extract imports
      if (patterns.import) {
        const importMatch = line.match(patterns.import);
        if (importMatch) {
          imports.push({
            module: importMatch[2] || importMatch[1],
            imports: this.extractImports(importMatch[1] || ''),
            lineNumber,
            isDefault: line.includes('import ') && !line.includes('{'),
          });
        }
      }

      // Extract error handling
      if (patterns.errorHandling) {
        const errorMatch = line.match(patterns.errorHandling);
        if (errorMatch) {
          errorHandling.push({
            type: this.inferErrorType(line, language),
            startLine: lineNumber,
            endLine: lineNumber, // Regex can't determine end accurately
            handlesError: errorMatch[1] || 'error',
          });
        }
      }
    });

    return {
      language,
      functions,
      classes,
      imports,
      errorHandling,
      parseMethod: 'regex',
    };
  }

  /**
   * Get regex patterns for a specific language
   */
  private getRegexPatterns(language: Language): {
    function?: RegExp;
    class?: RegExp;
    import?: RegExp;
    errorHandling?: RegExp;
  } {
    switch (language) {
      case 'typescript':
      case 'javascript':
        return {
          function: /(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s*)?\(|(\w+)\s*\()/,
          class: /class\s+(\w+)/,
          import: /import\s+(?:(.+?)\s+from\s+)?['"](.+?)['"]/,
          errorHandling: /catch\s*\((\w+)\)|\.catch\(/,
        };

      case 'python':
        return {
          function: /def\s+(\w+)\s*\((.*?)\)/,
          class: /class\s+(\w+)/,
          import: /(?:from\s+(\S+)\s+)?import\s+(.+)/,
          errorHandling: /except\s+(?:\w+\s+)?as\s+(\w+)/,
        };

      case 'go':
        return {
          function: /func\s+(?:\(\w+\s+\*?\w+\)\s+)?(\w+)\s*\((.*?)\)/,
          class: /type\s+(\w+)\s+struct/,
          import: /import\s+(?:"(.+?)"|(.+))/,
          errorHandling: /if\s+(\w+)\s*:?=.*?;\s*\w+\s*!=\s*nil/,
        };

      case 'java':
      case 'kotlin':
        return {
          function: /(?:fun|public|private|protected)?\s*(?:static)?\s*\w+\s+(\w+)\s*\(/,
          class: /(?:class|interface)\s+(\w+)/,
          import: /import\s+(.+)/,
          errorHandling: /catch\s*\((\w+)\s+\w+\)/,
        };

      default:
        return {};
    }
  }

  /**
   * Extract parameter names from parameter string
   */
  private extractParams(paramStr: string): string[] {
    if (!paramStr.trim()) return [];
    return paramStr.split(',').map(p => {
      const match = p.trim().match(/(\w+)/);
      return match ? match[1] : '<param>';
    });
  }

  /**
   * Extract imported names from import statement
   */
  private extractImports(importStr: string): string[] {
    // Handle "import X from" or "import { X, Y } from"
    const braceMatch = importStr.match(/\{(.+?)\}/);
    if (braceMatch) {
      return braceMatch[1].split(',').map(i => i.trim());
    }
    return [importStr.trim()];
  }

  /**
   * Infer error handling type from line content
   */
  private inferErrorType(line: string, language: Language): ErrorHandlingBlock['type'] {
    if (line.includes('.catch(')) return 'promise-catch';
    if (line.includes('defer') && line.includes('panic') && language === 'go') return 'defer-panic';
    if (line.includes('if') && language === 'go') return 'if-error';
    return 'try-catch';
  }
}
