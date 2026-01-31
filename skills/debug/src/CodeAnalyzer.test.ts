/**
 * CodeAnalyzer Tests
 *
 * Tests for US-003: Implement language detection and AST analysis utilities
 */

import { CodeAnalyzer } from './CodeAnalyzer';
import type { Language } from './CodeAnalyzer';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('CodeAnalyzer', () => {
  let tempDir: string;
  let analyzer: CodeAnalyzer;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'code-analyzer-test-'));
    analyzer = new CodeAnalyzer();
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Language Detection', () => {
    it('should detect TypeScript from .ts extension', () => {
      const lang = CodeAnalyzer.detectLanguage('test.ts');
      expect(lang).toBe('typescript');
    });

    it('should detect TypeScript from .tsx extension', () => {
      const lang = CodeAnalyzer.detectLanguage('Component.tsx');
      expect(lang).toBe('typescript');
    });

    it('should detect JavaScript from .js extension', () => {
      const lang = CodeAnalyzer.detectLanguage('script.js');
      expect(lang).toBe('javascript');
    });

    it('should detect JavaScript from .jsx extension', () => {
      const lang = CodeAnalyzer.detectLanguage('Component.jsx');
      expect(lang).toBe('javascript');
    });

    it('should detect Python from .py extension', () => {
      const lang = CodeAnalyzer.detectLanguage('script.py');
      expect(lang).toBe('python');
    });

    it('should detect Go from .go extension', () => {
      const lang = CodeAnalyzer.detectLanguage('main.go');
      expect(lang).toBe('go');
    });

    it('should detect Java from .java extension', () => {
      const lang = CodeAnalyzer.detectLanguage('Main.java');
      expect(lang).toBe('java');
    });

    it('should detect Kotlin from .kt extension', () => {
      const lang = CodeAnalyzer.detectLanguage('Main.kt');
      expect(lang).toBe('kotlin');
    });

    it('should return unknown for unsupported extensions', () => {
      const lang = CodeAnalyzer.detectLanguage('file.txt');
      expect(lang).toBe('unknown');
    });

    it('should handle case-insensitive extensions', () => {
      const lang = CodeAnalyzer.detectLanguage('TEST.TS');
      expect(lang).toBe('typescript');
    });
  });

  describe('AST Parsing for TypeScript/JavaScript', () => {
    it('should parse TypeScript file with AST', async () => {
      const filePath = path.join(tempDir, 'test.ts');
      const content = `
import { Something } from './module';

class MyClass {
  method() {
    console.log('hello');
  }
}

function myFunction(param1: string, param2: number): void {
  console.log(param1, param2);
}

async function asyncFunc() {
  return Promise.resolve();
}
`;
      fs.writeFileSync(filePath, content);

      const result = await analyzer.analyzeFile(filePath);

      expect(result.language).toBe('typescript');
      expect(result.parseMethod).toBe('ast');
      expect(result.functions.length).toBeGreaterThanOrEqual(2);
      expect(result.classes.length).toBe(1);
      expect(result.imports.length).toBe(1);

      // Check function details
      const func = result.functions.find(f => f.name === 'myFunction');
      expect(func).toBeDefined();
      expect(func?.params).toEqual(['param1', 'param2']);
      expect(func?.isAsync).toBe(false);

      const asyncFn = result.functions.find(f => f.name === 'asyncFunc');
      expect(asyncFn?.isAsync).toBe(true);

      // Check class details
      const cls = result.classes[0];
      expect(cls.name).toBe('MyClass');
      expect(cls.methods).toContain('method');

      // Check import details
      const imp = result.imports[0];
      expect(imp.module).toBe('./module');
      expect(imp.imports).toContain('Something');
    });

    it('should extract error handling blocks', async () => {
      const filePath = path.join(tempDir, 'errors.ts');
      const content = `
try {
  riskyOperation();
} catch (error) {
  console.error(error);
}

promise.catch((err) => {
  console.error(err);
});
`;
      fs.writeFileSync(filePath, content);

      const result = await analyzer.analyzeFile(filePath);

      expect(result.errorHandling.length).toBeGreaterThanOrEqual(1);
      const tryCatch = result.errorHandling.find(e => e.type === 'try-catch');
      expect(tryCatch).toBeDefined();
      expect(tryCatch?.handlesError).toBe('error');
    });

    it('should handle arrow functions', async () => {
      const filePath = path.join(tempDir, 'arrow.ts');
      const content = `
const arrowFunc = (a: number, b: number) => {
  return a + b;
};

const asyncArrow = async (x: string) => {
  return x;
};
`;
      fs.writeFileSync(filePath, content);

      const result = await analyzer.analyzeFile(filePath);

      expect(result.functions.length).toBeGreaterThanOrEqual(2);
      const asyncFn = result.functions.find(f => f.isAsync);
      expect(asyncFn).toBeDefined();
    });
  });

  describe('Regex Fallback Parsing', () => {
    it('should parse Python with regex', async () => {
      const filePath = path.join(tempDir, 'test.py');
      const content = `
import os
from typing import List

class MyClass:
    def method(self, param1, param2):
        print(param1, param2)

def my_function(arg1, arg2):
    return arg1 + arg2

try:
    risky_operation()
except Exception as e:
    print(e)
`;
      fs.writeFileSync(filePath, content);

      const result = await analyzer.analyzeFile(filePath);

      expect(result.language).toBe('python');
      expect(result.parseMethod).toBe('regex');
      expect(result.functions.length).toBeGreaterThanOrEqual(1);
      expect(result.classes.length).toBe(1);
      expect(result.imports.length).toBeGreaterThanOrEqual(1);

      const func = result.functions.find(f => f.name === 'my_function');
      expect(func).toBeDefined();
      expect(func?.params).toEqual(['arg1', 'arg2']);

      const cls = result.classes[0];
      expect(cls.name).toBe('MyClass');

      const errorBlock = result.errorHandling.find(e => e.handlesError === 'e');
      expect(errorBlock).toBeDefined();
    });

    it('should parse Go with regex', async () => {
      const filePath = path.join(tempDir, 'test.go');
      const content = `
package main

import "fmt"

type MyStruct struct {
    field string
}

func myFunction(param1 string, param2 int) error {
    fmt.Println(param1, param2)
    return nil
}

func (m *MyStruct) method() {
    fmt.Println(m.field)
}
`;
      fs.writeFileSync(filePath, content);

      const result = await analyzer.analyzeFile(filePath);

      expect(result.language).toBe('go');
      expect(result.parseMethod).toBe('regex');
      expect(result.functions.length).toBeGreaterThanOrEqual(1);
      expect(result.classes.length).toBeGreaterThanOrEqual(1); // struct detected as class

      const func = result.functions.find(f => f.name === 'myFunction');
      expect(func).toBeDefined();
    });

    it('should parse Java with regex', async () => {
      const filePath = path.join(tempDir, 'Test.java');
      const content = `
import java.util.List;

public class MyClass {
    public void method(String param1, int param2) {
        System.out.println(param1);
    }

    public static void main(String[] args) {
        try {
            riskyOperation();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
`;
      fs.writeFileSync(filePath, content);

      const result = await analyzer.analyzeFile(filePath);

      expect(result.language).toBe('java');
      expect(result.parseMethod).toBe('regex');
      expect(result.functions.length).toBeGreaterThanOrEqual(1);
      expect(result.classes.length).toBe(1);
      expect(result.imports.length).toBe(1);
    });

    it('should parse Kotlin with regex', async () => {
      const filePath = path.join(tempDir, 'Test.kt');
      const content = `
import kotlin.collections.List

class MyClass {
    fun method(param1: String, param2: Int) {
        println(param1)
    }
}

fun myFunction(arg: String): String {
    return arg
}
`;
      fs.writeFileSync(filePath, content);

      const result = await analyzer.analyzeFile(filePath);

      expect(result.language).toBe('kotlin');
      expect(result.parseMethod).toBe('regex');
      expect(result.functions.length).toBeGreaterThanOrEqual(1);
      expect(result.classes.length).toBe(1);
    });
  });

  describe('Graceful Fallback', () => {
    it('should fall back to regex if AST parsing fails', async () => {
      const filePath = path.join(tempDir, 'broken.ts');
      // Invalid TypeScript syntax that will fail AST parsing
      const content = `
function validFunction() {
  console.log('valid');
}

// But then some invalid syntax
func broken syntax here {{{{
`;
      fs.writeFileSync(filePath, content);

      const result = await analyzer.analyzeFile(filePath);

      // Should still return a result via regex fallback
      expect(result.language).toBe('typescript');
      expect(result.parseMethod).toBe('regex');
      expect(result.functions.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty files', async () => {
      const filePath = path.join(tempDir, 'empty.ts');
      fs.writeFileSync(filePath, '');

      const result = await analyzer.analyzeFile(filePath);

      expect(result.language).toBe('typescript');
      expect(result.functions).toEqual([]);
      expect(result.classes).toEqual([]);
      expect(result.imports).toEqual([]);
    });

    it('should handle files with only comments', async () => {
      const filePath = path.join(tempDir, 'comments.ts');
      const content = `
// This is a comment
/* Multi-line
   comment */
`;
      fs.writeFileSync(filePath, content);

      const result = await analyzer.analyzeFile(filePath);

      expect(result.functions).toEqual([]);
      expect(result.classes).toEqual([]);
    });

    it('should extract anonymous functions', async () => {
      const filePath = path.join(tempDir, 'anon.ts');
      const content = `
const arr = [1, 2, 3].map(function(x) {
  return x * 2;
});

const arr2 = [1, 2, 3].map((x) => x * 2);
`;
      fs.writeFileSync(filePath, content);

      const result = await analyzer.analyzeFile(filePath);

      expect(result.functions.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle complex import statements', async () => {
      const filePath = path.join(tempDir, 'imports.ts');
      const content = `
import Default from './default';
import { Named1, Named2 } from './named';
import * as Namespace from './namespace';
import type { Type1 } from './types';
`;
      fs.writeFileSync(filePath, content);

      const result = await analyzer.analyzeFile(filePath);

      expect(result.imports.length).toBe(4);

      const defaultImport = result.imports.find(i => i.module === './default');
      expect(defaultImport?.isDefault).toBe(true);

      const namedImport = result.imports.find(i => i.module === './named');
      expect(namedImport?.imports).toContain('Named1');
      expect(namedImport?.imports).toContain('Named2');
    });
  });

  describe('Extract Methods from Classes', () => {
    it('should extract class methods', async () => {
      const filePath = path.join(tempDir, 'class.ts');
      const content = `
class MyClass {
  private value: number;

  constructor(val: number) {
    this.value = val;
  }

  getValue(): number {
    return this.value;
  }

  setValue(val: number): void {
    this.value = val;
  }

  static staticMethod(): void {
    console.log('static');
  }
}
`;
      fs.writeFileSync(filePath, content);

      const result = await analyzer.analyzeFile(filePath);

      expect(result.classes.length).toBe(1);
      const cls = result.classes[0];
      expect(cls.methods).toContain('constructor');
      expect(cls.methods).toContain('getValue');
      expect(cls.methods).toContain('setValue');
      expect(cls.methods).toContain('staticMethod');
    });
  });
});
