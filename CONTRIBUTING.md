# Contributing to Corporate Game Platform

Welcome! Thank you for your interest in contributing to the Corporate Game Platform. This document provides guidelines and standards to ensure high-quality contributions.

---

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing Requirements](#testing-requirements)
- [Documentation Standards](#documentation-standards)
- [Code Review Checklist](#code-review-checklist)

---

## 🤝 Code of Conduct

**Be respectful, professional, and collaborative.** We're building something great together.

- Respectful communication in issues, PRs, and discussions
- Constructive feedback focused on code, not people
- Welcome newcomers and help them learn
- Report harassment or unprofessional behavior to project maintainers

---

## 🚀 Getting Started

### Prerequisites

- **Node.js:** 18.x or higher
- **MongoDB:** 6.x or higher (local or Atlas)
- **Git:** Latest version

### Initial Setup

```bash
# Clone repository
git clone https://github.com/yourusername/corpgame.git
cd corpgame

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Configure .env.local with your settings
# (MongoDB URI, JWT secrets, etc.)

# Run development server
npm run dev

# Open http://localhost:3000
```

### Database Setup

```bash
# Seed initial data (sectors, states)
node scripts/seed-sectors-data.js
node scripts/seed-states-data.js

# Create first admin user
node scripts/admin-manager.js
```

---

## 🔄 Development Workflow

### Branch Strategy

We use **Git Flow** with the following branches:

- `main` - Production-ready code (protected)
- `develop` - Integration branch for features (protected)
- `feature/*` - New features (e.g., `feature/user-portfolio`)
- `bugfix/*` - Bug fixes (e.g., `bugfix/login-error`)
- `hotfix/*` - Urgent production fixes (e.g., `hotfix/security-patch`)
- `release/*` - Release preparation (e.g., `release/v1.2.0`)

### Creating a Feature Branch

```bash
# Start from latest develop
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feature/your-feature-name

# Work on your feature...
git add .
git commit -m "feat: add user portfolio page"

# Push to remote
git push origin feature/your-feature-name
```

### Keeping Branch Updated

```bash
# Regularly sync with develop
git checkout develop
git pull origin develop
git checkout feature/your-feature-name
git merge develop

# Resolve conflicts if any
# Test thoroughly after merge
```

---

## 💻 Coding Standards

### TypeScript

**Required:** All code must be TypeScript with strict type checking.

```typescript
// ✅ GOOD: Explicit types
interface User {
  id: string;
  username: string;
  email: string;
}

async function getUser(userId: string): Promise<User> {
  // Implementation
}

// ❌ BAD: Any types
function getUser(userId: any): any {
  // Don't do this!
}
```

### Modern JavaScript/TypeScript (2025+)

```typescript
// ✅ GOOD: Modern syntax
const users = await db.users.find().toArray();
const activeUsers = users.filter(u => u.isActive);

// ❌ BAD: Legacy syntax
var users; // Use const/let
function callback(err, data) { } // Use async/await
```

### File Structure

```
lib/
  models/          # Mongoose models
  services/        # Business logic
  utils/           # Utility functions
  middleware/      # Express/Next.js middleware
  validations/     # Zod schemas
  constants/       # Constants and enums

app/api/           # Next.js API routes
  [domain]/        # Domain-specific routes
    route.ts       # Main CRUD operations
    [id]/          # ID-specific operations
      route.ts

components/        # React components
  [domain]/        # Domain-specific components
    index.ts       # Barrel exports
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| **Files** | kebab-case | `user-service.ts` |
| **Components** | PascalCase | `UserProfile.tsx` |
| **Functions** | camelCase | `getUserById()` |
| **Constants** | UPPER_SNAKE_CASE | `MAX_LOGIN_ATTEMPTS` |
| **Interfaces** | PascalCase, prefix I optional | `User` or `IUser` |
| **Types** | PascalCase | `UserRole` |
| **Enums** | PascalCase | `OrderStatus` |

### Code Organization

**Single Responsibility Principle:**
```typescript
// ✅ GOOD: One responsibility
function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sendWelcomeEmail(email: string): Promise<void> {
  // Send email
}

// ❌ BAD: Multiple responsibilities
function validateAndSendEmail(email: string): Promise<boolean> {
  // Validates AND sends - too much!
}
```

**DRY Principle (Don't Repeat Yourself):**
```typescript
// ✅ GOOD: Reusable utility
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

// Use everywhere:
const price = formatCurrency(1000); // "$1,000.00"

// ❌ BAD: Duplicated formatting logic
// Copy-pasting this everywhere in components
```

---

## 📝 Commit Guidelines

### Commit Message Format

We follow **Conventional Commits** specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code formatting (no logic changes)
- `refactor:` Code restructuring (no behavior changes)
- `perf:` Performance improvements
- `test:` Adding or updating tests
- `chore:` Build process, dependencies, tooling

### Examples

```bash
# Feature
git commit -m "feat(auth): add JWT refresh token rotation"

# Bug fix
git commit -m "fix(trading): prevent negative share quantities"

# Documentation
git commit -m "docs(api): add OpenAPI specification for auth endpoints"

# Refactor
git commit -m "refactor(utils): extract date formatting to utility"

# With body
git commit -m "feat(portfolio): add real-time portfolio updates

Implemented WebSocket connection for live portfolio updates.
Includes automatic reconnection and error handling.

Closes #123"
```

### Commit Best Practices

- **Atomic commits:** One logical change per commit
- **Present tense:** "add feature" not "added feature"
- **Imperative mood:** "fix bug" not "fixes bug"
- **Reference issues:** Include issue numbers when applicable
- **Keep subject < 72 characters**
- **Use body for WHY, not WHAT** (code shows what)

---

## 🔍 Pull Request Process

### Before Creating PR

✅ **Pre-flight checklist:**
- [ ] Code follows all coding standards
- [ ] All tests passing (`npm run test:run`)
- [ ] TypeScript compiles with 0 errors (`npx tsc --noEmit`)
- [ ] New features have tests
- [ ] Documentation updated (if applicable)
- [ ] Commit messages follow conventions
- [ ] Branch is up-to-date with develop

### Creating PR

1. **Push your branch** to GitHub
2. **Open Pull Request** targeting `develop` (not `main`)
3. **Use PR template** (auto-filled)
4. **Fill out all sections:**
   - Description of changes
   - Related issues
   - Testing performed
   - Screenshots (if UI changes)
   - Breaking changes (if any)

### PR Title Format

Same as commit messages:

```
feat(auth): add OAuth2 Google login
fix(trading): resolve share price calculation bug
docs(readme): update installation instructions
```

### PR Description Template

```markdown
## Description
Brief description of changes

## Related Issues
Closes #123
Related to #456

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing performed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-reviewed code
- [ ] Commented complex sections
- [ ] Updated documentation
- [ ] No new warnings
- [ ] Tests passing
- [ ] TypeScript compiles
```

### Review Process

1. **Automated checks** must pass:
   - TypeScript compilation
   - Test suite (100% passing required)
   - Linting (if configured)

2. **Code review** by 1+ maintainers:
   - Review comments addressed
   - Requested changes implemented
   - Approval granted

3. **Merge** (squash and merge preferred):
   - Combines commits into one
   - Keeps history clean
   - Includes PR number in commit

---

## 🧪 Testing Requirements

### Test Coverage

- **Minimum:** 80% code coverage
- **Required:** All critical paths tested
- **Integration tests** for API routes
- **Unit tests** for utilities, services, models

### Writing Tests

**Use Vitest** for all tests:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { POST } from '@/app/api/auth/login/route';

describe('Login API', () => {
  beforeAll(async () => {
    // Setup test database
  });

  afterAll(async () => {
    // Cleanup
  });

  it('should authenticate valid credentials', async () => {
    const request = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: 'testuser',
        password: 'password123'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.accessToken).toBeDefined();
  });

  it('should reject invalid credentials', async () => {
    const request = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: 'testuser',
        password: 'wrongpassword'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Invalid credentials');
  });
});
```

### Running Tests

```bash
# Run all tests
npm run test:run

# Run tests in watch mode
npm run test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm run test:run tests/api/auth/login.test.ts
```

### Test Best Practices

- **Test behavior, not implementation**
- **Use descriptive test names** ("should reject invalid email format")
- **Arrange-Act-Assert** pattern
- **Mock external dependencies** (database, APIs)
- **Test edge cases** (empty input, null, undefined, boundary values)
- **Clean up after tests** (database, files, mocks)

---

## 📚 Documentation Standards

### Code Documentation

**JSDoc for all public functions:**

```typescript
/**
 * Calculates the total value of a user's portfolio
 * 
 * Includes all owned shares multiplied by current market prices.
 * Excludes pending transactions and restricted shares.
 * 
 * @param userId - User's unique identifier
 * @param includeRestricted - Whether to include restricted shares (default: false)
 * @returns Total portfolio value in USD
 * 
 * @example
 * ```typescript
 * const value = await calculatePortfolioValue('507f1f77bcf86cd799439011');
 * console.log(`Portfolio: $${value.toFixed(2)}`);
 * ```
 * 
 * @throws {Error} If user not found
 * @throws {DatabaseError} If database query fails
 */
export async function calculatePortfolioValue(
  userId: string,
  includeRestricted: boolean = false
): Promise<number> {
  // Implementation
}
```

### Inline Comments

```typescript
// ✅ GOOD: Explain WHY
// Calculate 30-day moving average to smooth out daily volatility
const movingAverage = calculateMovingAverage(prices, 30);

// ❌ BAD: Explain WHAT (code already shows this)
// Loop through prices array
for (const price of prices) {
  // Add price to sum
  sum += price;
}
```

### File Headers

```typescript
/**
 * User Authentication Service
 * 
 * Handles user login, registration, token generation, and session management.
 * Implements JWT-based authentication with refresh token rotation.
 * 
 * **Security Features:**
 * - Password hashing with bcrypt (12 rounds)
 * - JWT access tokens (15min expiry)
 * - Refresh tokens (7 day expiry, single-use)
 * - Rate limiting on authentication endpoints
 * 
 * Created: 2025-12-31
 * Last Modified: 2025-12-31
 */
```

### README Updates

When adding features:
1. Update feature list
2. Add configuration instructions
3. Include examples
4. Update troubleshooting section

---

## ✅ Code Review Checklist

Reviewers should verify:

### Functionality
- [ ] Code works as intended
- [ ] Edge cases handled
- [ ] No regressions introduced
- [ ] Performance acceptable

### Code Quality
- [ ] Follows coding standards
- [ ] No code duplication
- [ ] Proper error handling
- [ ] Clear variable names
- [ ] Functions are focused (single responsibility)

### Security
- [ ] Input validation present
- [ ] SQL/NoSQL injection prevented
- [ ] XSS protection present
- [ ] Sensitive data not logged
- [ ] Authentication/authorization correct

### Testing
- [ ] Tests added for new features
- [ ] All tests passing
- [ ] Coverage maintained/improved
- [ ] Tests are meaningful (not trivial)

### Documentation
- [ ] Code commented where needed
- [ ] JSDoc present for public APIs
- [ ] README updated (if applicable)
- [ ] Breaking changes documented

### Git
- [ ] Commit messages follow conventions
- [ ] No merge commits (rebase preferred)
- [ ] Branch up-to-date with develop
- [ ] No unnecessary files committed

---

## 🎯 Quality Standards

We maintain **AAA quality standards**:

### A - Architecture
- Clean, modular design
- Proper separation of concerns
- Scalable patterns
- Follow Next.js best practices

### A - Attention to Detail
- No typos or formatting issues
- Consistent naming and style
- Complete error handling
- Thorough testing

### A - Automation
- Comprehensive test suite
- CI/CD integration (when available)
- Automated quality checks
- Documentation generation

---

## 🐛 Reporting Issues

### Before Reporting

1. **Search existing issues** - May already be reported
2. **Check documentation** - May be expected behavior
3. **Reproduce reliably** - Can you make it happen consistently?
4. **Gather information** - Error messages, logs, screenshots

### Issue Template

```markdown
## Bug Description
Clear description of the bug

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. See error

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- OS: [e.g., Windows 11]
- Node.js version: [e.g., 18.17.0]
- Browser: [e.g., Chrome 120]

## Additional Context
Any other relevant information
```

---

## 🎓 Learning Resources

### Project Architecture
- [Architecture Decision Records](docs/adr/)
- [API Documentation](docs/API_SPECIFICATION.md)
- [Database Schema](docs/DATABASE_SCHEMA.md)

### Technologies Used
- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [MongoDB Manual](https://docs.mongodb.com/manual/)
- [HeroUI Components](https://www.heroui.com/)
- [Vitest Documentation](https://vitest.dev/)

### Best Practices
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Git Flow](https://nvie.com/posts/a-successful-git-branching-model/)
- [Clean Code](https://github.com/ryanmcdermott/clean-code-javascript)

---

## 💬 Getting Help

- **Discord:** [Link to Discord server]
- **GitHub Discussions:** Use for questions and ideas
- **GitHub Issues:** Use for bugs and feature requests
- **Email:** project-maintainers@example.com

---

## 📄 License

By contributing, you agree that your contributions will be licensed under the project's license.

---

## 🙏 Thank You!

Thank you for contributing to Corporate Game Platform. Every contribution, no matter how small, helps make this project better.

**Happy coding!** 🚀
