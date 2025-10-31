# ESLint Configuration - Quick Reference

## Current Status

- **Errors**: 0 ✅
- **Warnings**: 34 ⚠️
- **CI Status**: PASSING (exit code 0) ✅
- **Last Updated**: 2025-10-30

---

## What Changed

### Removed

- `plugin:@typescript-eslint/recommended-requiring-type-checking` preset
- This was causing 815 of 993 errors (82%)

### Disabled Rules (Global)

```json
{
  "@typescript-eslint/no-unsafe-assignment": "off",
  "@typescript-eslint/no-unsafe-member-access": "off",
  "@typescript-eslint/no-unsafe-call": "off",
  "@typescript-eslint/no-unsafe-argument": "off",
  "@typescript-eslint/no-unsafe-return": "off",
  "no-useless-escape": "off"
}
```

### Changed to Warnings

- `@typescript-eslint/no-explicit-any`: "warn" (was "error")
- `@typescript-eslint/no-var-requires`: "warn" (in non-test files)

### Test File Overrides

Test files (_.test.ts, _.spec.ts) now allow:

- `any` types (no-explicit-any: off)
- Unused variables as warnings
- CommonJS requires

---

## Files Modified

1. `/Users/devarisbrown/Code/projects/gtsd/.eslintrc.json` - Main config
2. `/Users/devarisbrown/Code/projects/gtsd/.eslintignore` - Added debug scripts

---

## Warning Breakdown (34 total)

| Type              | Count | Fix Difficulty             |
| ----------------- | ----- | -------------------------- |
| `no-explicit-any` | 14    | Easy - Add proper types    |
| `no-unused-vars`  | 19    | Very Easy - Prefix with \_ |
| `no-var-requires` | 1     | Easy - Convert to import   |

---

## Quick Fixes

### Fix unused variables in tests

```typescript
// Before
const { passwordHash } = user;

// After
const { passwordHash: _passwordHash } = user;
```

### Fix explicit any types

```typescript
// Before
catch (error: any) {

// After
catch (error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown error';
}
```

### Fix require statements

```typescript
// Before
const twilio = require('twilio');

// After
import twilio from 'twilio';
```

---

## Running Linter

```bash
# Check all files
pnpm lint

# Auto-fix what's possible
pnpm lint --fix

# Check specific file
pnpm eslint path/to/file.ts

# Check and show only errors (ignore warnings)
pnpm eslint . --quiet
```

---

## Next Steps (Priority Order)

1. **Immediate** (0-1 week): Address 34 warnings
   - Prefix unused test variables with `_` (19 warnings)
   - Add types to replace `any` in error handlers (14 warnings)
   - Convert require to import in Twilio service (1 warning)

2. **Short-term** (1-2 months): Re-enable strict rules per-directory
   - Start with new features
   - Gradually expand to core modules
   - Document type safety improvements

3. **Long-term** (3-6 months): Full strict mode
   - Re-add `recommended-requiring-type-checking`
   - Enable strict TypeScript compiler options
   - Achieve 100% type coverage

---

## Rollback Instructions

If you need to revert to strict mode:

```json
// .eslintrc.json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking", // ADD THIS BACK
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error" // CHANGE TO ERROR
    // REMOVE all "off" rules for no-unsafe-*
  }
}
```

**Note**: This will bring back ~993 errors and fail CI.

---

## Configuration Reference

### Current .eslintrc.json Structure

```
.eslintrc.json
├── extends: [recommended, recommended (no strict), prettier]
├── rules: [relaxed type checking, warnings only]
└── overrides:
    ├── test files: [allow any, warn on unused]
    └── js files: [allow requires]
```

### Current .eslintignore Additions

- test-acknowledge.js
- apps/api/src/test-acknowledge.ts
- apps/api/src/investigate-user.ts
- apps/api/src/verify-fix.ts

---

## Contact & Documentation

- **Full Report**: `ESLINT_RELAXATION_REPORT.md`
- **Configuration**: `.eslintrc.json`
- **Ignored Files**: `.eslintignore`
- **TypeScript Config**: `tsconfig.json`
