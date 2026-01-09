# Testing Guide

This project uses [Vitest](https://vitest.dev/) for unit testing and [React Testing Library](https://testing-library.com/react) for component testing.

## Setup

Testing dependencies are already installed. The test environment is configured in `vite.config.ts`.

## Running Tests

### Run all tests once
```bash
npm test
# or
npm run test:run
```

### Run tests in watch mode
```bash
npm test
```
This will automatically re-run tests when files change.

### Run tests with UI
```bash
npm run test:ui
```
Opens an interactive UI in the browser for debugging and viewing test results.

### Run tests with coverage
```bash
npm run test:coverage
```
Generates a coverage report in the `coverage/` directory.

## Test Structure

- **Test files**: Located in `test/` directory
- **Test pattern**: `*.test.ts` or `*.test.tsx`
- **Setup file**: `test/setup.ts` - Contains global test configuration and mocks

## Example Test Files

- `test/memoryUtils.test.ts` - Tests for memory utility functions (similarity calculations, quality scores, etc.)
- `test/knowledgeUtils.test.ts` - Tests for knowledge base utility functions (hashing, retrieval, formatting, etc.)

## Writing Tests

### Basic Test Example
```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from '../myFile';

describe('myFunction', () => {
  it('should do something', () => {
    const result = myFunction('input');
    expect(result).toBe('expected output');
  });
});
```

### React Component Test Example
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MyComponent from '../components/MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

## Test Utilities

The test setup includes:
- **jest-dom matchers**: Custom matchers like `toBeInTheDocument()`, `toHaveClass()`, etc.
- **localStorage mock**: Mocked localStorage for testing
- **crypto.subtle mock**: Mocked crypto API for content hashing tests
- **Cleanup**: Automatic cleanup after each test

## Best Practices

1. **Test isolation**: Each test should be independent and not rely on state from previous tests
2. **Clear naming**: Use descriptive test names that explain what is being tested
3. **AAA pattern**: Arrange, Act, Assert - structure your tests clearly
4. **Mock external dependencies**: Mock API calls, localStorage, and other external services
5. **Test edge cases**: Include tests for empty inputs, null values, and error conditions
