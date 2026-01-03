# Code Review Checklist

Use this checklist when reviewing pull requests to ensure consistent, high-quality code.

---

## 🎯 Review Philosophy

**Goal:** Ship high-quality, maintainable code while supporting contributors.

**Principles:**
- Be kind, constructive, and specific
- Praise good work
- Explain the "why" behind suggestions
- Distinguish between must-fix and nice-to-have
- Approve when ready, even if minor improvements possible

---

## ✅ Pre-Review Checks

Before detailed review, verify automated checks:

- [ ] **CI/CD passing** (if configured)
- [ ] **Tests passing** (209/209 required)
- [ ] **TypeScript compiling** (0 errors required)
- [ ] **No merge conflicts**
- [ ] **Branch up-to-date** with target

**If any fail:** Request fixes before detailed review.

---

## 📋 Functionality Review

### Core Functionality
- [ ] **Feature works as described** in PR description
- [ ] **No regressions** - existing features still work
- [ ] **Edge cases handled** (empty input, null, undefined, extreme values)
- [ ] **Error cases handled** gracefully with helpful messages
- [ ] **User experience** is intuitive and smooth

### Business Logic
- [ ] **Logic is correct** and matches requirements
- [ ] **Calculations are accurate** (financial, statistical, etc.)
- [ ] **Data validation** appropriate and sufficient
- [ ] **State management** correct and consistent
- [ ] **Side effects** properly handled and documented

### Performance
- [ ] **No obvious performance issues** (N+1 queries, unnecessary loops)
- [ ] **Database queries optimized** (proper indexing, limiting results)
- [ ] **Large data sets handled** efficiently
- [ ] **Memory leaks prevented** (cleanup, unsubscribe, etc.)
- [ ] **Appropriate caching** used where beneficial

---

## 💻 Code Quality

### TypeScript & Types
- [ ] **No `any` types** (unless absolutely necessary and documented)
- [ ] **Proper type definitions** for functions, variables, parameters
- [ ] **Interfaces/types reused** (not redefined)
- [ ] **Type assertions justified** (not used to bypass type checking)
- [ ] **Generics used appropriately** where patterns repeat

### Code Structure
- [ ] **Single Responsibility Principle** - functions/classes do one thing
- [ ] **DRY (Don't Repeat Yourself)** - no code duplication
- [ ] **Functions are focused** (< 50 lines ideally)
- [ ] **Proper separation of concerns** (business logic, data access, presentation)
- [ ] **Appropriate abstraction level** (not over-engineered or under-engineered)

### Naming & Readability
- [ ] **Variable names descriptive** (`userId` not `id`, `totalPrice` not `tp`)
- [ ] **Function names clear** (`calculateTotalPrice()` not `calc()`)
- [ ] **Boolean variables descriptive** (`isValid`, `hasPermission`, `canEdit`)
- [ ] **Constants named appropriately** (`MAX_LOGIN_ATTEMPTS` not `maxAttempts`)
- [ ] **Code self-documenting** (clear without comments)

### Error Handling
- [ ] **Errors caught and handled** appropriately
- [ ] **Error messages helpful** for debugging and users
- [ ] **No silent failures** (errors logged or surfaced)
- [ ] **Proper error types** used (not generic Error everywhere)
- [ ] **Try-catch used appropriately** (not swallowing exceptions)

### Modern Patterns
- [ ] **Async/await** used (not callbacks or raw promises)
- [ ] **ES6+ syntax** (const/let, arrow functions, destructuring)
- [ ] **Optional chaining** (`user?.email` instead of `user && user.email`)
- [ ] **Nullish coalescing** (`value ?? default` instead of `value || default`)
- [ ] **No legacy patterns** (var, function declarations, etc.)

---

## 🔒 Security Review

### Input Validation
- [ ] **All inputs validated** (API parameters, form data, query strings)
- [ ] **Zod schemas used** for API route validation
- [ ] **Type coercion safe** (not using `parseInt` without validation)
- [ ] **File uploads validated** (type, size, content)
- [ ] **URL parameters sanitized** to prevent injection

### Authentication & Authorization
- [ ] **Authentication required** where appropriate
- [ ] **Authorization checks present** (user can perform action)
- [ ] **JWT tokens validated** properly
- [ ] **Session management secure** (tokens not in URLs, proper expiry)
- [ ] **No authentication bypasses** (no commented-out checks)

### Data Security
- [ ] **Sensitive data not logged** (passwords, tokens, PII)
- [ ] **Passwords hashed** (never stored plain text)
- [ ] **SQL/NoSQL injection prevented** (parameterized queries)
- [ ] **XSS prevented** (proper escaping, CSP headers)
- [ ] **CSRF tokens used** for state-changing operations (if applicable)

### API Security
- [ ] **Rate limiting applied** to endpoints
- [ ] **CORS configured** properly (not `*` in production)
- [ ] **Security headers present** (CSP, X-Frame-Options, etc.)
- [ ] **API keys/secrets** not hardcoded
- [ ] **Proper HTTP methods** used (GET for reads, POST for writes)

---

## 🧪 Testing Review

### Test Coverage
- [ ] **New features have tests** (unit or integration)
- [ ] **Bug fixes have regression tests**
- [ ] **Critical paths tested** (authentication, payments, data modification)
- [ ] **Edge cases tested** (boundary values, empty input, errors)
- [ ] **Test coverage maintained** (>80%)

### Test Quality
- [ ] **Tests are meaningful** (not just for coverage)
- [ ] **Test names descriptive** ("should reject invalid email format")
- [ ] **Tests independent** (can run in any order)
- [ ] **Tests use realistic data** (not just happy path)
- [ ] **Mocks appropriate** (external services, not business logic)

### Test Maintainability
- [ ] **Tests readable** and well-organized
- [ ] **Test helpers used** for common setup
- [ ] **No test code duplication**
- [ ] **Tests clean up** after themselves (database, files, mocks)
- [ ] **Tests run quickly** (< 1s per test ideally)

---

## 📚 Documentation Review

### Code Documentation
- [ ] **JSDoc present** for public functions/classes
- [ ] **Complex logic commented** (WHY, not WHAT)
- [ ] **TODOs have issue numbers** (not open-ended)
- [ ] **File headers present** for new files
- [ ] **Examples provided** in JSDoc where helpful

### External Documentation
- [ ] **README updated** (if feature user-facing)
- [ ] **API docs updated** (if API changes)
- [ ] **Environment variables documented** (if added)
- [ ] **Migration guide** (if breaking changes)
- [ ] **Changelog updated** (for releases)

### Inline Comments
- [ ] **Comments explain WHY** (not WHAT code does)
- [ ] **No commented-out code** (use git history instead)
- [ ] **No misleading comments** (code and comments match)
- [ ] **Comments up-to-date** (not stale from refactoring)
- [ ] **Comments professional** (no profanity or inappropriate content)

---

## 🎨 UI/UX Review (if applicable)

### Visual Design
- [ ] **Matches design system** (HeroUI components used)
- [ ] **Consistent spacing** and alignment
- [ ] **Responsive design** (mobile, tablet, desktop)
- [ ] **Loading states** present for async operations
- [ ] **Error states** displayed clearly

### Accessibility
- [ ] **Semantic HTML** used (`<button>` not `<div>` for clicks)
- [ ] **Alt text** for images
- [ ] **Keyboard navigation** works
- [ ] **Focus indicators** visible
- [ ] **Color contrast** sufficient (WCAG AA)

### User Experience
- [ ] **Forms have validation** with clear messages
- [ ] **Success feedback** provided (toasts, messages)
- [ ] **Confirmation prompts** for destructive actions
- [ ] **Intuitive navigation** and flow
- [ ] **No jarring transitions** or flashes

---

## 🗄️ Database Review (if applicable)

### Schema Changes
- [ ] **Migrations provided** (if schema changes)
- [ ] **Backward compatible** (or migration plan documented)
- [ ] **Indexes added** for queried fields
- [ ] **Constraints appropriate** (unique, required, etc.)
- [ ] **Default values sensible**

### Queries
- [ ] **Queries optimized** (no N+1 problems)
- [ ] **Proper error handling** for database failures
- [ ] **Transactions used** for multi-step operations
- [ ] **Pagination implemented** for large result sets
- [ ] **Connection pooling** used correctly

---

## 🔧 Configuration Review

### Environment Variables
- [ ] **.env.example updated** with new variables
- [ ] **Variables documented** (purpose, format, example)
- [ ] **Defaults provided** where appropriate
- [ ] **Secrets not committed** (.env.local in .gitignore)
- [ ] **Validation for required variables** at startup

### Dependencies
- [ ] **New dependencies justified** (not reinventing wheel, not overkill)
- [ ] **Dependencies up-to-date** and maintained
- [ ] **No security vulnerabilities** (`npm audit`)
- [ ] **Package-lock.json updated**
- [ ] **Dependencies used** (not added but unused)

---

## 📝 Git Review

### Commits
- [ ] **Commit messages follow conventions** (feat:, fix:, etc.)
- [ ] **Commits atomic** (one logical change per commit)
- [ ] **No merge commits** (rebased on target branch)
- [ ] **Commit history clean** (no "fix typo" commits)
- [ ] **Sensitive data not in history** (keys, passwords, etc.)

### Pull Request
- [ ] **PR description complete** (what, why, how)
- [ ] **Related issues linked** (Closes #123)
- [ ] **Screenshots provided** (if UI changes)
- [ ] **Breaking changes documented** (if any)
- [ ] **Migration steps documented** (if needed)

---

## 🎯 ECHO Compliance

### File Reading
- [ ] **Complete file reading** before edits (1-EOF)
- [ ] **No assumptions** about file content
- [ ] **Batch loading** for large files (>1000 lines)
- [ ] **Pre-edit verification** completed

### Code Quality
- [ ] **AAA standards** met (Architecture, Attention, Automation)
- [ ] **No pseudo-code** or placeholders
- [ ] **Complete implementation** (no TODOs without issues)
- [ ] **DRY principle** followed ruthlessly
- [ ] **Code reuse** maximized

### Documentation
- [ ] **Complete JSDoc** with examples
- [ ] **File headers** present
- [ ] **Implementation notes** footer
- [ ] **Clear variable names** (self-documenting)

---

## 🚦 Review Decision Guide

### ✅ Approve
**When:** Code is production-ready, all must-fix items addressed

**Action:** 
- Approve PR
- Add positive feedback
- Suggest optional improvements as comments

### 💬 Comment
**When:** Code is good but has suggestions or questions

**Action:**
- Leave comments (not requesting changes)
- Allow author to decide on suggestions
- Re-review only if major changes made

### 🔴 Request Changes
**When:** Code has issues that must be fixed before merge

**Action:**
- Clearly mark must-fix vs. nice-to-have
- Explain WHY changes needed
- Provide examples or suggestions
- Re-review after changes

### ⏸️ Hold
**When:** Needs discussion or design decision

**Action:**
- Start discussion in PR comments or issue
- Don't block on personal preference
- Involve maintainers if needed

---

## 💡 Review Best Practices

### Be Constructive
```
❌ "This code is bad"
✅ "Consider extracting this logic to a utility function for reusability"

❌ "You don't know TypeScript"
✅ "The return type should be Promise<User> instead of Promise<any>"
```

### Be Specific
```
❌ "Fix the styling"
✅ "Add margin-bottom: 16px to match spacing in other cards"

❌ "This needs tests"
✅ "Add tests for the edge case where user has no shares"
```

### Explain Why
```
❌ "Don't use var"
✅ "Use const instead of var - var is function-scoped and can cause bugs"

❌ "Extract this to a function"
✅ "Extract this to a utility function - same logic appears 3 times"
```

### Praise Good Work
```
✅ "Nice error handling here!"
✅ "Great test coverage on edge cases"
✅ "Clean implementation, easy to understand"
✅ "Excellent documentation with examples"
```

---

## 📊 Review Metrics

Track these to improve review process:

- **Time to first review:** < 24 hours
- **Time to merge:** < 72 hours (after approval)
- **Review iterations:** < 3 ideally
- **Comments per PR:** Quality over quantity
- **Approval rate:** >80% after 1-2 iterations

---

## 🎓 Learning from Reviews

### For Authors
- Note recurring feedback → Update personal checklist
- Ask questions → Better understanding
- Review own code first → Catch issues early
- Learn from suggestions → Apply to future PRs

### For Reviewers
- Track common issues → Update this checklist
- Note good patterns → Share with team
- Learn from other reviews → Improve skills
- Mentor contributors → Raise overall quality

---

## 🔗 Related Resources

- [CONTRIBUTING.md](../CONTRIBUTING.md) - Full contribution guidelines
- [API Documentation](API_SPECIFICATION.md) - API standards
- [Architecture Decisions](adr/) - Design decisions and rationale

---

## ✨ Remember

**Great code reviews make great software!**

- Be thorough but not pedantic
- Be kind but not permissive
- Be specific but not overwhelming
- Be helpful, not gatekeeping

**The goal is to ship great code while supporting contributors.** 🚀
