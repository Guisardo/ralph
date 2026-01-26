# Coding Conventions

**Analysis Date:** 2026-01-26

## Naming Patterns

**Files:**
- Component files: PascalCase with `.tsx` extension (`App.tsx`, `main.tsx`)
- Style files: kebab-case with `.css` extension (`App.css`, `index.css`)
- Type definitions: Defined inline with `type` keyword or imported types

**Functions:**
- React components: PascalCase (`App`, `CustomNode`, `NoteNode`)
- Helper functions: camelCase (`createNode`, `createEdge`, `createNoteNode`, `getNodes`, `onNodesChange`, `onEdgesChange`, `onConnect`, `onReconnect`, `getEdgeVisibility`, `handleNext`, `handlePrev`, `handleReset`)
- Event handlers: `handle` prefix with camelCase (`handleNext`, `handlePrev`, `handleReset`)

**Variables:**
- Constants: camelCase for most constants (`nodeWidth`, `nodeHeight`, `allSteps`, `notes`, `positions`, `edgeConnections`, `nodeTypes`, `phaseColors`)
- State variables: camelCase (`visibleCount`, `nodes`, `edges`, `nodePositions`)
- Component props: camelCase destructured from function parameters

**Types:**
- Union types: PascalCase (`Phase`)
- Record/object types: Use `Record<Phase, {...}>` for typed objects
- Imported types: PascalCase with `type` keyword (`Node`, `Edge`, `NodeChange`, `EdgeChange`, `Connection`)

## Code Style

**Formatting:**
- No formal prettier config detected; code follows conventional React/TypeScript formatting
- 2-space indentation observed throughout
- Semicolons used consistently at end of statements
- Import statements grouped: React imports first, then library imports, then relative imports

**Linting:**
- ESLint with TypeScript plugin configured in `eslint.config.js`
- Extends: `@eslint/js`, `typescript-eslint/recommended`, `react-hooks/recommended`, `react-refresh/vite`
- Key rules enforced: React hooks rules, React Refresh compatibility

**TypeScript Compiler Options:**
- `strict: true` - Strict type checking enabled
- `noUnusedLocals: true` - Error on unused variables
- `noUnusedParameters: true` - Error on unused function parameters
- `noFallthroughCasesInSwitch: true` - Error on missing break in switch cases
- `noUncheckedSideEffectImports: true` - Warn about unverified side effects
- `jsx: "react-jsx"` - Modern JSX transform

## Import Organization

**Order:**
1. React core and hooks: `import { useCallback, useState, useRef } from 'react'`
2. React Flow types: `import type { Node, Edge, ... } from '@xyflow/react'`
3. React Flow components: `import { ReactFlow, ... } from '@xyflow/react'`
4. External styles: `import '@xyflow/react/dist/style.css'`
5. Local styles: `import './App.css'`

**Path Aliases:**
- Not detected; relative imports used (`./App.css`)

## Error Handling

**Patterns:**
- No explicit error handling detected in current codebase
- Safe optional chaining used: `data?.title`, `data?.description`
- Type guards via TypeScript's strict mode
- Null coalescing with default values: `position || positions[step.id]`

## Logging

**Framework:** console only (no logging framework detected)

**Patterns:**
- No explicit logging statements in current codebase
- Code relies on React's development warnings and browser DevTools

## Comments

**When to Comment:**
- Strategic comments marking code sections: `// Setup phase`, `// Loop phase`, `// Exit`
- Comments clarify business logic and structure

**JSDoc/TSDoc:**
- Not used in current codebase
- Function purposes inferred from names and implementation

## Function Design

**Size:**
- Most functions are concise (<30 lines)
- Largest function is `App()` component at ~150 lines (handles state and rendering)
- Helper factories: `createNode`, `createEdge`, `createNoteNode` (~15 lines each)

**Parameters:**
- React components use destructured props with type annotations
- Callback functions use inline type definitions
- Handler functions receive event/change objects from React Flow library

**Return Values:**
- Functions return typed objects matching `Node`, `Edge`, or JSX
- No implicit returns; explicit `return` statements used
- Array methods (`map`, `filter`) used for transformations

## Module Design

**Exports:**
- `export default App;` - Single default export from main component file
- No named exports; relational types imported via `type` keyword

**Barrel Files:**
- Not used; direct imports from source files

## Callback and Hook Patterns

**useCallback Usage:**
- Event handlers wrapped with `useCallback`: `handleNext`, `handlePrev`, `handleReset`
- Prevents unnecessary re-renders by memoizing functions
- Dependencies array includes all used state setters: `[visibleCount, setNodes, setEdges]`

**useState Pattern:**
- Simple state: `const [visibleCount, setVisibleCount] = useState(1)`
- Custom hooks: `useNodesState(initialNodes)`, `useEdgesState(initialEdges)` from React Flow

**useRef Pattern:**
- Track mutable values: `const nodePositions = useRef<{ [key: string]: { x: number; y: number } }>({ ...positions })`
- Updated directly in callbacks without triggering re-render

## Object Literals and Type Definitions

**Typed Records:**
```typescript
// Typed color mapping
const phaseColors: Record<Phase, { bg: string; border: string }> = {
  setup: { bg: '#f0f7ff', border: '#4a90d9' },
  // ...
};

// Typed position mapping
const positions: { [key: string]: { x: number; y: number } } = {
  '1': { x: 20, y: 20 },
  // ...
};
```

**Array of Objects:**
```typescript
const allSteps: { id: string; label: string; description: string; phase: Phase }[] = [
  // ...
];
```

---

*Convention analysis: 2026-01-26*
