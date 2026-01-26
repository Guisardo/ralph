# Testing Patterns

**Analysis Date:** 2026-01-26

## Test Framework

**Runner:**
- No test framework detected (vitest, jest, or similar not configured)
- No test configuration files found in project

**Assertion Library:**
- Not applicable - no testing framework configured

**Run Commands:**
```bash
npm run dev        # Start development server
npm run build      # Build for production (includes typecheck)
npm run lint       # Run ESLint
npm run preview    # Preview production build
```

**Note:** The project currently has no test infrastructure. Testing must be implemented if needed.

## Test File Organization

**Current Status:**
- No test files present in codebase
- No `.test.tsx`, `.spec.tsx`, or similar files detected
- No test directory structure established

**Recommended Location:**
- For future tests: co-locate with components (e.g., `App.test.tsx` alongside `App.tsx`)
- Alternative: Create `src/__tests__/` directory for integration/e2e tests

**Recommended Naming:**
- Unit tests: `{ComponentName}.test.tsx` or `{functionName}.test.ts`
- Integration tests: `{feature}.integration.test.tsx`
- E2E tests: `{scenario}.e2e.test.tsx`

## Quality Assurance

**Current Setup:**
- **TypeScript Compilation:** `npm run build` includes type checking via `tsc -b`
- **ESLint:** `npm run lint` validates code against TypeScript and React rules
- **Strict Mode:** App wrapped in `<StrictMode>` in `src/main.tsx` - enables React development warnings

**Build Validation:**
```bash
npm run build  # Must pass to verify:
               # - TypeScript compilation (strict mode)
               # - ESLint compliance
               # - No unused variables/parameters
```

## What IS Being Validated

**TypeScript Strict Mode Checks (`tsconfig.app.json`):**
- `strict: true` - All type checking rules enabled
- `noUnusedLocals: true` - Unused variables cause errors
- `noUnusedParameters: true` - Unused parameters cause errors
- `noFallthroughCasesInSwitch: true` - Missing breaks in switch statements
- `noUncheckedSideEffectImports: true` - Unverified side effects cause warnings

**Example from `App.tsx`:**
```typescript
// All variables and parameters are used (verified by strict mode)
function createNode(step: typeof allSteps[0], visible: boolean, position?: { x: number; y: number }): Node {
  return {
    id: step.id,
    type: 'custom',
    position: position || positions[step.id],  // position checked for usage
    // ...
  };
}
```

**ESLint Checks:**
- React Hooks rules (dependencies arrays, hook ordering)
- React Refresh compatibility
- TypeScript best practices

## Test Coverage Gaps

**Untested Areas:**
- `App.tsx` - Main component with complex state management (120+ lines)
- `CustomNode` - React Flow node component rendering logic
- `NoteNode` - React Flow note node component rendering logic
- State transitions - No tests for `handleNext`, `handlePrev`, `handleReset` workflows
- Event handlers - No tests for node/edge change handling
- Edge visibility logic - `getEdgeVisibility` function has no tests
- Position tracking - `nodePositions.current` mutations not validated

**Files:** `src/App.tsx`, `src/main.tsx`

**Risk:** UI state management issues could only be caught through manual browser testing

## Recommended Testing Strategy

**Phase 1 - Unit Tests:**
Create tests for pure functions that don't depend on React state:
- `getEdgeVisibility(conn, visibleCount)` - Deterministic logic
- Factory functions: `createNode()`, `createEdge()`, `createNoteNode()`
- Phase color mapping logic

**Phase 2 - Component Tests:**
Use React Testing Library for interactive components:
- `CustomNode` rendering with different phases
- Button click handlers and state transitions
- Visibility toggle behavior (`handleNext`, `handlePrev`, `handleReset`)

**Phase 3 - Integration Tests:**
Test complete workflows:
- Sequential step progression
- Node position tracking across resets
- Edge visibility synchronization with step count

**Recommended Test Framework:**
- **Vitest** - Modern, fast, TypeScript-first, Vite-integrated
- **React Testing Library** - React component testing best practices
- **@testing-library/react-flow** - If React Flow-specific testing needed

## Future Test Setup

**To add testing to this project:**

1. **Install dependencies:**
```bash
npm install -D vitest @vitest/ui react-testing-library jsdom @testing-library/react @testing-library/jest-dom
```

2. **Create `vitest.config.ts`:**
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

3. **Create test files alongside source:**
```
src/
  App.tsx
  App.test.tsx
  main.tsx
  __tests__/
    integration/
```

4. **Update package.json scripts:**
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

## Current State Summary

- **Testing Framework:** Not installed
- **Test Files:** None exist
- **Coverage:** 0% - No automated tests
- **Quality Assurance:** Relies entirely on TypeScript strict mode and ESLint
- **Manual Testing:** Required for UI/interaction validation

---

*Testing analysis: 2026-01-26*
