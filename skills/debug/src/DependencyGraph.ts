/**
 * DependencyGraph - Multi-file dependency analysis
 *
 * Traces dependencies across files for cross-boundary hypothesis generation.
 * Analyzes import statements, function call chains, and API endpoints.
 */

import * as fs from 'fs';
import * as path from 'path';
import { CodeAnalyzer, ImportStatement, FunctionDefinition } from './CodeAnalyzer';

/**
 * Represents a relationship between two files
 */
export interface FileDependency {
  /** Source file path */
  from: string;

  /** Target file path */
  to: string;

  /** Type of dependency relationship */
  type: 'import' | 'function_call' | 'api_endpoint';

  /** Specific entity being referenced (e.g., function name, endpoint path) */
  entity?: string;

  /** Line number in source file where dependency occurs */
  lineNumber?: number;
}

/**
 * Represents an API endpoint and its handler
 */
export interface APIEndpoint {
  /** HTTP method (GET, POST, etc.) */
  method: string;

  /** Endpoint path (e.g., /api/users) */
  path: string;

  /** File containing the handler */
  handlerFile: string;

  /** Handler function name */
  handlerFunction: string;

  /** Line number where endpoint is defined */
  lineNumber: number;
}

/**
 * Configuration for dependency analysis
 */
export interface DependencyGraphConfig {
  /** Root directory to analyze (defaults to cwd) */
  rootDir?: string;

  /** File extensions to analyze */
  extensions?: string[];

  /** Directories to exclude */
  excludeDirs?: string[];

  /** Maximum depth for traversal */
  maxDepth?: number;
}

/**
 * DependencyGraph - Analyzes and maps file relationships
 */
export class DependencyGraph {
  private analyzer: CodeAnalyzer;
  private config: Required<DependencyGraphConfig>;
  private fileCache: Map<string, { imports: ImportStatement[]; functions: FunctionDefinition[] }>;

  constructor(config: DependencyGraphConfig = {}) {
    this.analyzer = new CodeAnalyzer();
    this.config = {
      rootDir: config.rootDir || process.cwd(),
      extensions: config.extensions || ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.java', '.kt'],
      excludeDirs: config.excludeDirs || ['node_modules', '.git', 'dist', 'build', '__pycache__', 'vendor'],
      maxDepth: config.maxDepth || 10,
    };
    this.fileCache = new Map();
  }

  /**
   * Get all files related to the given file through dependencies
   *
   * Returns an array of related file paths sorted by relevance.
   */
  async getRelatedFiles(filePath: string): Promise<string[]> {
    const normalizedPath = path.resolve(filePath);
    const relatedFiles = new Set<string>();
    const visited = new Set<string>();

    // Build dependency map starting from target file
    await this.buildDependencyMap(normalizedPath, relatedFiles, visited, 0);

    // Convert to array and remove the original file
    const result = Array.from(relatedFiles).filter(f => f !== normalizedPath);

    // Sort by proximity (direct imports first, then transitive)
    return this.sortByRelevance(normalizedPath, result);
  }

  /**
   * Recursively build dependency map for a file
   */
  private async buildDependencyMap(
    filePath: string,
    relatedFiles: Set<string>,
    visited: Set<string>,
    depth: number
  ): Promise<void> {
    // Stop conditions
    if (depth >= this.config.maxDepth || visited.has(filePath)) {
      return;
    }

    visited.add(filePath);

    // Skip if file doesn't exist or is excluded
    if (!fs.existsSync(filePath) || this.isExcluded(filePath)) {
      return;
    }

    try {
      // Analyze file to get imports and functions
      const analysis = await this.getFileAnalysis(filePath);

      // Process import dependencies
      for (const imp of analysis.imports) {
        const resolvedPath = this.resolveImportPath(filePath, imp.module);
        if (resolvedPath && !visited.has(resolvedPath)) {
          relatedFiles.add(resolvedPath);
          // Recursively analyze imported files
          await this.buildDependencyMap(resolvedPath, relatedFiles, visited, depth + 1);
        }
      }

      // Find reverse dependencies (files that import this file)
      const reverseDeps = await this.findReverseImports(filePath);
      for (const dep of reverseDeps) {
        if (!visited.has(dep)) {
          relatedFiles.add(dep);
          await this.buildDependencyMap(dep, relatedFiles, visited, depth + 1);
        }
      }

      // Find function call dependencies (files that call functions from this file)
      const functionCallDeps = await this.findFunctionCallDependencies(filePath, analysis.functions);
      for (const dep of functionCallDeps) {
        if (!visited.has(dep)) {
          relatedFiles.add(dep);
          await this.buildDependencyMap(dep, relatedFiles, visited, depth + 1);
        }
      }
    } catch (error) {
      // Log error but continue analysis
      console.warn('Error analyzing file during dependency mapping:', filePath, error);
    }
  }

  /**
   * Get cached file analysis or analyze if not cached
   */
  private async getFileAnalysis(filePath: string): Promise<{ imports: ImportStatement[]; functions: FunctionDefinition[] }> {
    if (this.fileCache.has(filePath)) {
      return this.fileCache.get(filePath)!;
    }

    const analysis = await this.analyzer.analyzeFile(filePath);
    const cached = {
      imports: analysis.imports,
      functions: analysis.functions,
    };
    this.fileCache.set(filePath, cached);
    return cached;
  }

  /**
   * Resolve import path to absolute file path
   */
  private resolveImportPath(fromFile: string, importPath: string): string | null {
    try {
      // Handle relative imports
      if (importPath.startsWith('.')) {
        const dir = path.dirname(fromFile);
        const resolved = path.resolve(dir, importPath);

        // Try with various extensions
        for (const ext of this.config.extensions) {
          const withExt = resolved + ext;
          if (fs.existsSync(withExt)) {
            return withExt;
          }
          // Try index files
          const indexPath = path.join(resolved, `index${ext}`);
          if (fs.existsSync(indexPath)) {
            return indexPath;
          }
        }

        // Return resolved path even if file doesn't exist (might be directory)
        return resolved;
      }

      // Handle absolute imports (node_modules, etc.) - skip for now
      // These would require package resolution which is complex
      return null;
    } catch (error) {
      console.warn('Error resolving import path:', importPath, error);
      return null;
    }
  }

  /**
   * Find files that import the given file
   */
  private async findReverseImports(targetFile: string): Promise<string[]> {
    const reverseImports: string[] = [];
    const allFiles = await this.getAllProjectFiles();

    for (const file of allFiles) {
      if (file === targetFile) continue;

      try {
        const analysis = await this.getFileAnalysis(file);

        for (const imp of analysis.imports) {
          const resolvedPath = this.resolveImportPath(file, imp.module);
          if (resolvedPath === targetFile) {
            reverseImports.push(file);
            break;
          }
        }
      } catch (error) {
        // Skip files that can't be analyzed
        continue;
      }
    }

    return reverseImports;
  }

  /**
   * Find files that call functions from the target file
   */
  private async findFunctionCallDependencies(
    targetFile: string,
    targetFunctions: FunctionDefinition[]
  ): Promise<string[]> {
    const dependencies: string[] = [];
    const allFiles = await this.getAllProjectFiles();
    const functionNames = new Set(targetFunctions.map(f => f.name).filter(n => n !== '<anonymous>'));

    for (const file of allFiles) {
      if (file === targetFile) continue;

      try {
        const content = fs.readFileSync(file, 'utf-8');

        // Check if any target functions are called in this file
        for (const funcName of functionNames) {
          // Look for function calls: funcName( or .funcName( or [funcName](
          const callPattern = new RegExp(`[.\\[\\s]${funcName}\\s*\\(`);
          if (callPattern.test(content)) {
            dependencies.push(file);
            break;
          }
        }
      } catch (error) {
        // Skip files that can't be read
        continue;
      }
    }

    return dependencies;
  }

  /**
   * Get all project files matching configured extensions
   */
  private async getAllProjectFiles(): Promise<string[]> {
    const files: string[] = [];

    const traverse = (dir: string, depth: number) => {
      if (depth >= this.config.maxDepth) return;

      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory()) {
            if (!this.isExcluded(fullPath)) {
              traverse(fullPath, depth + 1);
            }
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name);
            if (this.config.extensions.includes(ext)) {
              files.push(fullPath);
            }
          }
        }
      } catch (error) {
        // Skip directories that can't be read
      }
    };

    traverse(this.config.rootDir, 0);
    return files;
  }

  /**
   * Check if path should be excluded
   */
  private isExcluded(filePath: string): boolean {
    const parts = filePath.split(path.sep);
    return parts.some(part => this.config.excludeDirs.includes(part));
  }

  /**
   * Sort related files by relevance (direct imports first)
   */
  private sortByRelevance(originFile: string, relatedFiles: string[]): string[] {
    // Simple heuristic: files in same directory are more relevant
    const originDir = path.dirname(originFile);

    return relatedFiles.sort((a, b) => {
      const aDir = path.dirname(a);
      const bDir = path.dirname(b);

      // Same directory = highest relevance
      if (aDir === originDir && bDir !== originDir) return -1;
      if (bDir === originDir && aDir !== originDir) return 1;

      // Same parent directory = medium relevance
      const aParent = path.dirname(aDir);
      const bParent = path.dirname(bDir);
      if (aParent === path.dirname(originDir) && bParent !== path.dirname(originDir)) return -1;
      if (bParent === path.dirname(originDir) && aParent !== path.dirname(originDir)) return 1;

      // Default: alphabetical
      return a.localeCompare(b);
    });
  }

  /**
   * Trace function call chains across file boundaries
   *
   * Given a function name and starting file, find all files where this function
   * is called, and recursively trace calls to those functions.
   */
  async traceFunctionCalls(functionName: string, startFile: string, maxDepth: number = 3): Promise<FileDependency[]> {
    const dependencies: FileDependency[] = [];
    const visited = new Set<string>();

    await this.traceFunctionCallsRecursive(functionName, startFile, dependencies, visited, 0, maxDepth);

    return dependencies;
  }

  /**
   * Recursively trace function calls
   */
  private async traceFunctionCallsRecursive(
    functionName: string,
    currentFile: string,
    dependencies: FileDependency[],
    visited: Set<string>,
    depth: number,
    maxDepth: number
  ): Promise<void> {
    if (depth >= maxDepth || visited.has(currentFile)) return;
    visited.add(currentFile);

    const allFiles = await this.getAllProjectFiles();

    for (const file of allFiles) {
      if (file === currentFile) continue;

      try {
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');

        // Look for calls to this function
        const callPattern = new RegExp(`[.\\[\\s]${functionName}\\s*\\(`);

        for (let i = 0; i < lines.length; i++) {
          if (callPattern.test(lines[i])) {
            dependencies.push({
              from: file,
              to: currentFile,
              type: 'function_call',
              entity: functionName,
              lineNumber: i + 1,
            });

            // Find functions defined in this file and trace their calls
            const analysis = await this.getFileAnalysis(file);
            for (const func of analysis.functions) {
              if (func.name !== '<anonymous>') {
                await this.traceFunctionCallsRecursive(func.name, file, dependencies, visited, depth + 1, maxDepth);
              }
            }
          }
        }
      } catch (error) {
        // Skip files that can't be analyzed
        continue;
      }
    }
  }

  /**
   * Identify API endpoints and their handlers
   *
   * Detects common patterns for API route definitions:
   * - Express: app.get('/path', handler)
   * - FastAPI: @app.get('/path')
   * - Go: http.HandleFunc('/path', handler)
   * - Spring: @GetMapping('/path')
   */
  async identifyAPIEndpoints(): Promise<APIEndpoint[]> {
    const endpoints: APIEndpoint[] = [];
    const allFiles = await this.getAllProjectFiles();

    for (const file of allFiles) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const lineNumber = i + 1;

          // Express/Node.js patterns: app.get('/path', handler)
          const expressMatch = line.match(/(?:app|router)\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]\s*,\s*(\w+)/);
          if (expressMatch) {
            endpoints.push({
              method: expressMatch[1].toUpperCase(),
              path: expressMatch[2],
              handlerFile: file,
              handlerFunction: expressMatch[3],
              lineNumber,
            });
            continue;
          }

          // FastAPI decorator: @app.get('/path')
          const fastApiMatch = line.match(/@app\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]\s*\)/);
          if (fastApiMatch) {
            // Handler function is on next non-empty line
            let handlerFunc = '<anonymous>';
            for (let j = i + 1; j < lines.length; j++) {
              const nextLine = lines[j].trim();
              if (nextLine && nextLine.startsWith('def ')) {
                const funcMatch = nextLine.match(/def\s+(\w+)/);
                if (funcMatch) handlerFunc = funcMatch[1];
                break;
              }
            }

            endpoints.push({
              method: fastApiMatch[1].toUpperCase(),
              path: fastApiMatch[2],
              handlerFile: file,
              handlerFunction: handlerFunc,
              lineNumber,
            });
            continue;
          }

          // Go: http.HandleFunc('/path', handler)
          const goMatch = line.match(/http\.HandleFunc\s*\(\s*['"]([^'"]+)['"]\s*,\s*(\w+)/);
          if (goMatch) {
            endpoints.push({
              method: 'ANY', // Go HandleFunc handles all methods
              path: goMatch[1],
              handlerFile: file,
              handlerFunction: goMatch[2],
              lineNumber,
            });
            continue;
          }

          // Spring: @GetMapping('/path')
          const springMatch = line.match(/@(Get|Post|Put|Delete|Patch)Mapping\s*\(\s*['"]?([^'")\s]+)['"]?\s*\)/);
          if (springMatch) {
            // Handler function is on next non-empty line
            let handlerFunc = '<anonymous>';
            for (let j = i + 1; j < lines.length; j++) {
              const nextLine = lines[j].trim();
              if (nextLine && (nextLine.includes('public ') || nextLine.includes('private '))) {
                const funcMatch = nextLine.match(/\s+(\w+)\s*\(/);
                if (funcMatch) handlerFunc = funcMatch[1];
                break;
              }
            }

            endpoints.push({
              method: springMatch[1].toUpperCase(),
              path: springMatch[2],
              handlerFile: file,
              handlerFunction: handlerFunc,
              lineNumber,
            });
            continue;
          }
        }
      } catch (error) {
        // Skip files that can't be analyzed
        continue;
      }
    }

    return endpoints;
  }

  /**
   * Find API endpoint caller files (frontend calling backend)
   *
   * Given an API path, find files that make HTTP requests to that endpoint.
   */
  async findAPICallers(apiPath: string): Promise<FileDependency[]> {
    const callers: FileDependency[] = [];
    const allFiles = await this.getAllProjectFiles();

    // Normalize path for matching
    const normalizedPath = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;

    for (const file of allFiles) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];

          // Look for HTTP client calls with this path
          // fetch('/api/path'), axios.get('/api/path'), http.Get('/api/path'), etc.
          const pathPattern = new RegExp(`['"\`]${normalizedPath}['"\`]`);
          if (pathPattern.test(line) && /\.(get|post|put|delete|patch|fetch)\s*\(|fetch\s*\(|http\.(Get|Post|Put|Delete|Patch)\s*\(/.test(line)) {
            callers.push({
              from: file,
              to: '<api>', // Placeholder since we don't know handler file yet
              type: 'api_endpoint',
              entity: normalizedPath,
              lineNumber: i + 1,
            });
          }
        }
      } catch (error) {
        // Skip files that can't be analyzed
        continue;
      }
    }

    return callers;
  }
}
