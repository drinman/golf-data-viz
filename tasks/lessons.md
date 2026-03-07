# Lessons Learned

Track patterns, mistakes, and corrections here to avoid repeating them.

## Format
```
### [Date] — Category
**Pattern**: What happened
**Rule**: What to do instead
```

### 2026-03-06 — Stale E2E Tests
**Pattern**: UI text was renamed across multiple PRs (headings, labels, trust panel copy) and benchmark data was updated (v1.0.0 citations), but e2e tests were never updated. 17 tests broke in CI.
**Rule**: Any PR that changes user-facing text, benchmark data, or page structure must include matching e2e test updates. Run `npx playwright test --project=functional` as part of verification.
