/**
 * Tests for DependencyGraph - Multi-file dependency analysis
 */

import { DependencyGraph } from './DependencyGraph';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('DependencyGraph', () => {
  let testDir: string;

  beforeEach(() => {
    // Create temporary test directory
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'depgraph-test-'));
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    it('should create instance with default config', () => {
      const graph = new DependencyGraph();
      expect(graph).toBeInstanceOf(DependencyGraph);
    });

    it('should create instance with custom config', () => {
      const graph = new DependencyGraph({
        rootDir: testDir,
        extensions: ['.ts', '.js'],
        excludeDirs: ['node_modules'],
        maxDepth: 5,
      });
      expect(graph).toBeInstanceOf(DependencyGraph);
    });
  });

  describe('getRelatedFiles', () => {
    it('should return empty array for file with no dependencies', async () => {
      const filePath = path.join(testDir, 'standalone.ts');
      fs.writeFileSync(filePath, 'const x = 42;');

      const graph = new DependencyGraph({ rootDir: testDir });
      const related = await graph.getRelatedFiles(filePath);

      expect(related).toEqual([]);
    });

    it('should find files imported by target file', async () => {
      // Create dependency chain: main.ts -> utils.ts
      const utilsPath = path.join(testDir, 'utils.ts');
      const mainPath = path.join(testDir, 'main.ts');

      fs.writeFileSync(utilsPath, 'export const add = (a: number, b: number) => a + b;');
      fs.writeFileSync(mainPath, "import { add } from './utils';\nconsole.log(add(1, 2));");

      const graph = new DependencyGraph({ rootDir: testDir });
      const related = await graph.getRelatedFiles(mainPath);

      expect(related).toContain(utilsPath);
    });

    it('should find files that import target file (reverse deps)', async () => {
      // Create dependency chain: main.ts -> utils.ts
      const utilsPath = path.join(testDir, 'utils.ts');
      const mainPath = path.join(testDir, 'main.ts');

      fs.writeFileSync(utilsPath, 'export const add = (a: number, b: number) => a + b;');
      fs.writeFileSync(mainPath, "import { add } from './utils';\nconsole.log(add(1, 2));");

      const graph = new DependencyGraph({ rootDir: testDir });
      const related = await graph.getRelatedFiles(utilsPath);

      expect(related).toContain(mainPath);
    });

    it('should handle transitive dependencies', async () => {
      // Create chain: main.ts -> utils.ts -> math.ts
      const mathPath = path.join(testDir, 'math.ts');
      const utilsPath = path.join(testDir, 'utils.ts');
      const mainPath = path.join(testDir, 'main.ts');

      fs.writeFileSync(mathPath, 'export const multiply = (a: number, b: number) => a * b;');
      fs.writeFileSync(utilsPath, "import { multiply } from './math';\nexport const double = (x: number) => multiply(x, 2);");
      fs.writeFileSync(mainPath, "import { double } from './utils';\nconsole.log(double(5));");

      const graph = new DependencyGraph({ rootDir: testDir });
      const related = await graph.getRelatedFiles(mainPath);

      expect(related).toContain(utilsPath);
      expect(related).toContain(mathPath);
    });

    it('should resolve index file imports', async () => {
      // Create structure: main.ts -> lib/index.ts
      const libDir = path.join(testDir, 'lib');
      fs.mkdirSync(libDir);

      const indexPath = path.join(libDir, 'index.ts');
      const mainPath = path.join(testDir, 'main.ts');

      fs.writeFileSync(indexPath, 'export const lib = "library";');
      fs.writeFileSync(mainPath, "import { lib } from './lib';\nconsole.log(lib);");

      const graph = new DependencyGraph({ rootDir: testDir });
      const related = await graph.getRelatedFiles(mainPath);

      expect(related).toContain(indexPath);
    });

    it('should handle multiple file extensions', async () => {
      const tsPath = path.join(testDir, 'file.ts');
      const jsPath = path.join(testDir, 'file.js');

      fs.writeFileSync(tsPath, "import './file.js';\n");
      fs.writeFileSync(jsPath, 'console.log("hello");');

      const graph = new DependencyGraph({ rootDir: testDir });
      const related = await graph.getRelatedFiles(tsPath);

      expect(related).toContain(jsPath);
    });

    it('should sort related files by relevance (same directory first)', async () => {
      // Create structure:
      // main.ts -> ./utils.ts, ./subdir/helper.ts
      const subdir = path.join(testDir, 'subdir');
      fs.mkdirSync(subdir);

      const utilsPath = path.join(testDir, 'utils.ts');
      const helperPath = path.join(subdir, 'helper.ts');
      const mainPath = path.join(testDir, 'main.ts');

      fs.writeFileSync(utilsPath, 'export const utils = "utils";');
      fs.writeFileSync(helperPath, 'export const helper = "helper";');
      fs.writeFileSync(mainPath, "import { utils } from './utils';\nimport { helper } from './subdir/helper';\n");

      const graph = new DependencyGraph({ rootDir: testDir });
      const related = await graph.getRelatedFiles(mainPath);

      // utils.ts should come before subdir/helper.ts (same directory preference)
      const utilsIndex = related.indexOf(utilsPath);
      const helperIndex = related.indexOf(helperPath);
      expect(utilsIndex).toBeLessThan(helperIndex);
    });

    it('should respect maxDepth limit', async () => {
      // Create deep chain: a -> b -> c -> d -> e
      const files = ['a.ts', 'b.ts', 'c.ts', 'd.ts', 'e.ts'];
      for (let i = 0; i < files.length; i++) {
        const filePath = path.join(testDir, files[i]);
        if (i < files.length - 1) {
          fs.writeFileSync(filePath, `import './${files[i + 1].replace('.ts', '')}';\n`);
        } else {
          fs.writeFileSync(filePath, 'export const end = true;');
        }
      }

      // With maxDepth=2, should only reach b and c (2 levels from a)
      const graph = new DependencyGraph({ rootDir: testDir, maxDepth: 2 });
      const related = await graph.getRelatedFiles(path.join(testDir, 'a.ts'));

      expect(related.length).toBeLessThan(4); // Should not reach all 4 dependencies
    });

    it('should exclude configured directories', async () => {
      // Create structure with excluded directory
      const nodeModules = path.join(testDir, 'node_modules');
      fs.mkdirSync(nodeModules);

      const libPath = path.join(nodeModules, 'lib.ts');
      const mainPath = path.join(testDir, 'main.ts');

      fs.writeFileSync(libPath, 'export const lib = "lib";');
      fs.writeFileSync(mainPath, "import './node_modules/lib';\n");

      const graph = new DependencyGraph({ rootDir: testDir });
      const related = await graph.getRelatedFiles(mainPath);

      // node_modules is excluded by default
      expect(related).not.toContain(libPath);
    });
  });

  describe('traceFunctionCalls', () => {
    it('should find files that call a specific function', async () => {
      const utilsPath = path.join(testDir, 'utils.ts');
      const mainPath = path.join(testDir, 'main.ts');

      fs.writeFileSync(utilsPath, 'export function calculate() { return 42; }');
      fs.writeFileSync(mainPath, "import { calculate } from './utils';\nconst result = calculate();");

      const graph = new DependencyGraph({ rootDir: testDir });
      const deps = await graph.traceFunctionCalls('calculate', utilsPath);

      expect(deps).toContainEqual(
        expect.objectContaining({
          from: mainPath,
          to: utilsPath,
          type: 'function_call',
          entity: 'calculate',
        })
      );
    });

    it('should trace nested function calls', async () => {
      // Chain: main calls processData, processData calls validate
      const validatePath = path.join(testDir, 'validate.ts');
      const processPath = path.join(testDir, 'process.ts');
      const mainPath = path.join(testDir, 'main.ts');

      fs.writeFileSync(validatePath, 'export function validate(x: any) { return true; }');
      fs.writeFileSync(processPath, "import { validate } from './validate';\nexport function processData(d: any) { return validate(d); }");
      fs.writeFileSync(mainPath, "import { processData } from './process';\nprocessData({});");

      const graph = new DependencyGraph({ rootDir: testDir });
      const deps = await graph.traceFunctionCalls('validate', validatePath, 2);

      // Should find both direct (process) and indirect (main) callers
      const files = deps.map(d => d.from);
      expect(files).toContain(processPath);
    });

    it('should handle method call syntax', async () => {
      const objPath = path.join(testDir, 'obj.ts');
      const mainPath = path.join(testDir, 'main.ts');

      fs.writeFileSync(objPath, 'export const obj = { method() { return 1; } };');
      fs.writeFileSync(mainPath, "import { obj } from './obj';\nobj.method();");

      const graph = new DependencyGraph({ rootDir: testDir });
      const deps = await graph.traceFunctionCalls('method', objPath);

      expect(deps.some(d => d.from === mainPath && d.entity === 'method')).toBe(true);
    });

    it('should respect maxDepth parameter', async () => {
      // Create chain where function is called in deeply nested file
      const files = ['a.ts', 'b.ts', 'c.ts', 'd.ts'];
      const targetFunc = 'deepFunction';

      fs.writeFileSync(path.join(testDir, 'a.ts'), `export function ${targetFunc}() { return 1; }`);

      for (let i = 1; i < files.length; i++) {
        const prevFile = files[i - 1].replace('.ts', '');
        const content = i === 1
          ? `import { ${targetFunc} } from './${prevFile}';\nexport function call${i}() { return ${targetFunc}(); }`
          : `import { call${i-1} } from './${files[i-1].replace('.ts', '')}';\nexport function call${i}() { return call${i-1}(); }`;
        fs.writeFileSync(path.join(testDir, files[i]), content);
      }

      const graph = new DependencyGraph({ rootDir: testDir });
      const depsShallow = await graph.traceFunctionCalls(targetFunc, path.join(testDir, 'a.ts'), 1);
      const depsDeep = await graph.traceFunctionCalls(targetFunc, path.join(testDir, 'a.ts'), 3);

      expect(depsDeep.length).toBeGreaterThan(depsShallow.length);
    });
  });

  describe('identifyAPIEndpoints', () => {
    it('should detect Express route definitions', async () => {
      const serverPath = path.join(testDir, 'server.ts');
      fs.writeFileSync(serverPath, `
        import express from 'express';
        const app = express();
        app.get('/api/users', getUsers);
        app.post('/api/users', createUser);
      `);

      const graph = new DependencyGraph({ rootDir: testDir });
      const endpoints = await graph.identifyAPIEndpoints();

      expect(endpoints).toContainEqual({
        method: 'GET',
        path: '/api/users',
        handlerFile: serverPath,
        handlerFunction: 'getUsers',
        lineNumber: 4,
      });

      expect(endpoints).toContainEqual({
        method: 'POST',
        path: '/api/users',
        handlerFile: serverPath,
        handlerFunction: 'createUser',
        lineNumber: 5,
      });
    });

    it('should detect router endpoints', async () => {
      const routerPath = path.join(testDir, 'router.ts');
      fs.writeFileSync(routerPath, `
        import { Router } from 'express';
        const router = Router();
        router.put('/items/:id', updateItem);
        router.delete('/items/:id', deleteItem);
      `);

      const graph = new DependencyGraph({ rootDir: testDir });
      const endpoints = await graph.identifyAPIEndpoints();

      expect(endpoints).toContainEqual(
        expect.objectContaining({
          method: 'PUT',
          path: '/items/:id',
          handlerFunction: 'updateItem',
        })
      );

      expect(endpoints).toContainEqual(
        expect.objectContaining({
          method: 'DELETE',
          path: '/items/:id',
          handlerFunction: 'deleteItem',
        })
      );
    });

    it('should detect FastAPI decorator patterns', async () => {
      const apiPath = path.join(testDir, 'api.py');
      fs.writeFileSync(apiPath, `
from fastapi import FastAPI
app = FastAPI()

@app.get('/items')
def get_items():
    return []

@app.post('/items')
def create_item():
    return {}
      `);

      const graph = new DependencyGraph({ rootDir: testDir, extensions: ['.py'] });
      const endpoints = await graph.identifyAPIEndpoints();

      expect(endpoints).toContainEqual(
        expect.objectContaining({
          method: 'GET',
          path: '/items',
          handlerFunction: 'get_items',
        })
      );

      expect(endpoints).toContainEqual(
        expect.objectContaining({
          method: 'POST',
          path: '/items',
          handlerFunction: 'create_item',
        })
      );
    });

    it('should detect Go http.HandleFunc patterns', async () => {
      const serverPath = path.join(testDir, 'server.go');
      fs.writeFileSync(serverPath, `
package main
import "net/http"

func main() {
    http.HandleFunc("/api/health", healthCheck)
    http.HandleFunc("/api/data", getData)
}
      `);

      const graph = new DependencyGraph({ rootDir: testDir, extensions: ['.go'] });
      const endpoints = await graph.identifyAPIEndpoints();

      expect(endpoints).toContainEqual(
        expect.objectContaining({
          method: 'ANY',
          path: '/api/health',
          handlerFunction: 'healthCheck',
        })
      );
    });

    it('should detect Spring annotations', async () => {
      const controllerPath = path.join(testDir, 'Controller.java');
      fs.writeFileSync(controllerPath, `
@RestController
public class UserController {
    @GetMapping("/users")
    public List<User> getUsers() {
        return users;
    }

    @PostMapping("/users")
    public User createUser() {
        return user;
    }
}
      `);

      const graph = new DependencyGraph({ rootDir: testDir, extensions: ['.java'] });
      const endpoints = await graph.identifyAPIEndpoints();

      expect(endpoints).toContainEqual(
        expect.objectContaining({
          method: 'GET',
          path: '/users',
          handlerFunction: 'getUsers',
        })
      );

      expect(endpoints).toContainEqual(
        expect.objectContaining({
          method: 'POST',
          path: '/users',
          handlerFunction: 'createUser',
        })
      );
    });

    it('should handle PATCH method', async () => {
      const serverPath = path.join(testDir, 'server.ts');
      fs.writeFileSync(serverPath, `
        app.patch('/api/users/:id', patchUser);
      `);

      const graph = new DependencyGraph({ rootDir: testDir });
      const endpoints = await graph.identifyAPIEndpoints();

      expect(endpoints).toContainEqual(
        expect.objectContaining({
          method: 'PATCH',
          path: '/api/users/:id',
          handlerFunction: 'patchUser',
        })
      );
    });
  });

  describe('findAPICallers', () => {
    it('should find fetch calls to API endpoint', async () => {
      const clientPath = path.join(testDir, 'client.ts');
      fs.writeFileSync(clientPath, `
        const data = await fetch('/api/users');
        const json = await data.json();
      `);

      const graph = new DependencyGraph({ rootDir: testDir });
      const callers = await graph.findAPICallers('/api/users');

      expect(callers).toContainEqual(
        expect.objectContaining({
          from: clientPath,
          type: 'api_endpoint',
          entity: '/api/users',
        })
      );
    });

    it('should find axios calls to API endpoint', async () => {
      const clientPath = path.join(testDir, 'client.ts');
      fs.writeFileSync(clientPath, `
        import axios from 'axios';
        const response = await axios.get('/api/data');
        const items = await axios.post('/api/items', { name: 'test' });
      `);

      const graph = new DependencyGraph({ rootDir: testDir });
      const getCallers = await graph.findAPICallers('/api/data');
      const postCallers = await graph.findAPICallers('/api/items');

      expect(getCallers).toContainEqual(
        expect.objectContaining({
          from: clientPath,
          entity: '/api/data',
        })
      );

      expect(postCallers).toContainEqual(
        expect.objectContaining({
          from: clientPath,
          entity: '/api/items',
        })
      );
    });

    it('should normalize paths with leading slash', async () => {
      const clientPath = path.join(testDir, 'client.ts');
      fs.writeFileSync(clientPath, `
        fetch('/api/test');
      `);

      const graph = new DependencyGraph({ rootDir: testDir });

      // Test with and without leading slash
      const callers1 = await graph.findAPICallers('/api/test');
      const callers2 = await graph.findAPICallers('api/test');

      expect(callers1.length).toBeGreaterThan(0);
      expect(callers2.length).toBeGreaterThan(0);
    });

    it('should detect http.Get calls in Go', async () => {
      const clientPath = path.join(testDir, 'client.go');
      fs.writeFileSync(clientPath, `
package main
import "net/http"

func fetchData() {
    resp, err := http.Get("/api/data")
}
      `);

      const graph = new DependencyGraph({ rootDir: testDir, extensions: ['.go'] });
      const callers = await graph.findAPICallers('/api/data');

      expect(callers).toContainEqual(
        expect.objectContaining({
          from: clientPath,
          entity: '/api/data',
        })
      );
    });

    it('should detect calls with different quote styles', async () => {
      const clientPath = path.join(testDir, 'client.ts');
      fs.writeFileSync(clientPath, `
        fetch('/api/single');
        fetch("/api/double");
        fetch(\`/api/backtick\`);
      `);

      const graph = new DependencyGraph({ rootDir: testDir });

      const singleCallers = await graph.findAPICallers('/api/single');
      const doubleCallers = await graph.findAPICallers('/api/double');
      const backtickCallers = await graph.findAPICallers('/api/backtick');

      expect(singleCallers.length).toBeGreaterThan(0);
      expect(doubleCallers.length).toBeGreaterThan(0);
      expect(backtickCallers.length).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should handle non-existent files gracefully', async () => {
      const graph = new DependencyGraph({ rootDir: testDir });
      const related = await graph.getRelatedFiles(path.join(testDir, 'nonexistent.ts'));

      expect(related).toEqual([]);
    });

    it('should handle circular dependencies without infinite loop', async () => {
      // Create circular dependency: a.ts -> b.ts -> a.ts
      const aPath = path.join(testDir, 'a.ts');
      const bPath = path.join(testDir, 'b.ts');

      fs.writeFileSync(aPath, "import './b';\nexport const a = 1;");
      fs.writeFileSync(bPath, "import './a';\nexport const b = 2;");

      const graph = new DependencyGraph({ rootDir: testDir });
      const related = await graph.getRelatedFiles(aPath);

      // Should complete without hanging
      expect(related).toContain(bPath);
    });

    it('should handle files with syntax errors gracefully', async () => {
      const invalidPath = path.join(testDir, 'invalid.ts');
      const validPath = path.join(testDir, 'valid.ts');

      fs.writeFileSync(invalidPath, 'this is not valid typescript code ###');
      fs.writeFileSync(validPath, "import './invalid';\nconst x = 1;");

      const graph = new DependencyGraph({ rootDir: testDir });

      // Should not throw, but may have empty results
      const related = await graph.getRelatedFiles(validPath);
      expect(Array.isArray(related)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty project directory', async () => {
      const graph = new DependencyGraph({ rootDir: testDir });
      const related = await graph.getRelatedFiles(path.join(testDir, 'any.ts'));

      expect(related).toEqual([]);
    });

    it('should handle file with only comments', async () => {
      const filePath = path.join(testDir, 'comments.ts');
      fs.writeFileSync(filePath, '// Just a comment\n/* Block comment */');

      const graph = new DependencyGraph({ rootDir: testDir });
      const related = await graph.getRelatedFiles(filePath);

      expect(related).toEqual([]);
    });

    it('should handle deeply nested directory structure', async () => {
      // Create deep directory structure
      const deep = path.join(testDir, 'a', 'b', 'c', 'd', 'e');
      fs.mkdirSync(deep, { recursive: true });

      const deepFile = path.join(deep, 'deep.ts');
      const rootFile = path.join(testDir, 'root.ts');

      fs.writeFileSync(deepFile, 'export const deep = true;');
      fs.writeFileSync(rootFile, "import { deep } from './a/b/c/d/e/deep';");

      const graph = new DependencyGraph({ rootDir: testDir });
      const related = await graph.getRelatedFiles(rootFile);

      expect(related).toContain(deepFile);
    });
  });
});
