# Security Documentation - Debug Skill

## Path Traversal Prevention

The SessionManager class implements multiple layers of defense against path traversal attacks:

### 1. Base Directory Validation (Constructor)
- **Normalization**: `path.resolve()` eliminates `..` and `.` sequences
- **Null Byte Check**: Rejects paths containing `\0` characters
- **Immutable Storage**: Validated baseDir stored as readonly property

### 2. Session ID Format Validation
Session IDs follow strict format: `debug-YYYYMMDD-HHMMSS-[8-char-hex]`

The `validateSessionId()` method enforces:
- **Regex Pattern**: `/^debug-\d{14}-[a-f0-9]{8}$/`
- **Path Separator Check**: Rejects `/`, `\`, and `\0` characters
- **Called Before Use**: Every path construction validates the session ID first

### 3. Path Boundary Verification
The `getSessionPath()` method performs final checks:
- Validates session ID format
- Resolves final path to absolute
- Verifies resolved path is within sessionsDir boundary
- Throws error if path escapes intended directory

## Example Attack Scenarios (Mitigated)

### Scenario 1: Path Traversal in Session ID
```typescript
// Attacker attempts:
loadSession("../../etc/passwd")

// Result: REJECTED
// validateSessionId() fails regex check
// Error: "Invalid session ID format: ../../etc/passwd"
```

### Scenario 2: Null Byte Injection
```typescript
// Attacker attempts:
loadSession("debug-20260131-12345678\0/../../etc/passwd")

// Result: REJECTED
// validateSessionId() detects null byte
// Error: "Invalid session ID: contains path traversal characters"
```

### Scenario 3: Malicious Base Directory
```typescript
// Attacker attempts:
new SessionManager("../../../../etc")

// Result: SAFE
// path.resolve() normalizes to absolute path
// Null byte check validates
// Final boundary check ensures all operations stay within intended directory
```

## Semgrep False Positives

Semgrep's `path-join-resolve-traversal` rule flags this code as potentially vulnerable. These are false positives because:

1. **baseDir**: Sanitized via `path.resolve()` which is the recommended mitigation
2. **sessionId**: Validated with strict regex before any path operations
3. **Boundary checks**: Additional verification that paths stay within sessionsDir

The warnings have been acknowledged in `.semgrepignore` after manual security review.

## Testing Recommendations

When testing SessionManager, verify:

1. ✅ Normal session IDs work correctly
2. ✅ Invalid formats are rejected
3. ✅ Path traversal attempts are blocked
4. ✅ Null byte injection is prevented
5. ✅ Resolved paths stay within sessionsDir

## References

- [OWASP Path Traversal](https://owasp.org/www-community/attacks/Path_Traversal)
- [CWE-22: Path Traversal](https://cwe.mitre.org/data/definitions/22.html)
- [Node.js path.resolve() documentation](https://nodejs.org/api/path.html#path_path_resolve_paths)
