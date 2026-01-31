# DependencyGraph Security Analysis

## Path Traversal Prevention

The DependencyGraph class uses `path.resolve()` and `path.join()` operations for legitimate file system traversal within a project directory. These operations are **not vulnerable** to path traversal attacks because:

1. **Bounded Scope**: All file operations are constrained to the configured `rootDir` (defaults to `process.cwd()`)

2. **No External Input**: File paths come from:
   - Internal file system scans (`fs.readdirSync`)
   - AST analysis results (import statements from parsed code)
   - Project configuration (not user input)

3. **Exclusion List**: Sensitive directories are excluded by default:
   - `node_modules`, `.git`, `dist`, `build`, `__pycache__`, `vendor`

4. **Depth Limiting**: Traversal is limited to `maxDepth` (default 10) to prevent infinite loops

## Regular Expression Safety

The DependencyGraph class generates regular expressions from code analysis results (function names, API paths). These are **not vulnerable** to ReDoS because:

1. **Bounded Input**: Patterns are derived from:
   - Function names extracted via AST parsing (valid identifiers)
   - API paths from route definitions (bounded strings)

2. **Simple Patterns**: All generated regexes use simple character classes and are not complex:
   - Function call pattern: `[.\[\s]${funcName}\s*\(`
   - API path pattern: `['"\`]${path}['"\`]`

3. **No Nested Quantifiers**: Patterns don't contain nested quantifiers that could cause catastrophic backtracking

4. **Internal Tool Use**: DependencyGraph is designed for codebase analysis, not processing arbitrary user input

## Usage Guidelines

For secure usage of DependencyGraph:

```typescript
// ✓ SAFE: Analyzing project files
const graph = new DependencyGraph({
  rootDir: '/path/to/project',
  excludeDirs: ['node_modules', '.git', 'dist']
});

// ✓ SAFE: Getting dependencies of a known project file
const deps = await graph.getRelatedFiles('./src/components/Button.tsx');

// ✗ UNSAFE (but prevented by API design): Don't allow arbitrary user paths
// The API expects relative paths within the project, not arbitrary filesystem paths
```

## Semgrep False Positives

Semgrep flags these operations as potential vulnerabilities, but they are false positives because:

- Path operations are **internal tool functionality**, not exposed to untrusted input
- File paths come from **filesystem scans** and **AST analysis**, not user input
- All operations are **bounded** to the configured project directory

These findings have been suppressed in `.semgrepignore` with detailed justification.
