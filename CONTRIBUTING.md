# Contributing to fetch-notion-page

Thank you for your interest in contributing to fetch-notion-page! This guide will help you get started.

## Development Setup

### Requirements
- Node.js >= 22.0.0
- Bun (recommended) or npm

### Getting Started
```bash
# Clone the repository
git clone https://github.com/yukukotani/fetch-notion-page.git
cd fetch-notion-page

# Install dependencies
bun install

# Run tests
bun test

# Run linter
bun lint

# Build the project
bun run build
```

## Development Scripts

- `bun dev` - Run the CLI in development mode
- `bun test` - Run tests
- `bun run test:watch` - Run tests in watch mode
- `bun run test:coverage` - Generate coverage report
- `bun lint` - Run all linters (Biome, TypeScript, Knip)
- `bun run fix` - Auto-fix linting issues
- `bun run format` - Format code with Biome
- `bun run build` - Build the project

## Testing

The project follows Test-Driven Development (TDD) principles:

### Running Tests
```bash
# Run all tests
bun test

# Watch mode for development
bun run test:watch

# Generate coverage report
bun run test:coverage
```

### Writing Tests
- Tests should be placed in the same directory as the source files
- Follow the naming convention: `*.test.ts`
- Use vitest and power-assert for testing
- Write failing tests first, then implement the functionality

Example:
```typescript
import { test } from 'vitest';
import assert from 'power-assert';
import { myFunction } from './my-function.js';

test('should do something', () => {
  const result = myFunction('input');
  assert(result === 'expected');
});
```

## Architecture

This project follows clean architecture principles with functional programming:

### Directory Structure
- **`src/presentation/`**: CLI interface and argument handling
- **`src/usecase/`**: Core business logic for fetching pages
- **`src/libs/`**: Reusable utilities (fetchers, converters, builders)
- **`src/types/`**: TypeScript type definitions

### Design Principles
1. **Functions over classes**: Use pure functions whenever possible
2. **Tagged unions for errors**: No throwing exceptions, use Result types
3. **Immutable data**: Avoid mutating objects and arrays
4. **Small, focused modules**: Each file should have a single responsibility
5. **Comprehensive testing**: All functionality must be tested

### Code Style
- Use TypeScript with strict type checking
- Follow functional programming patterns
- Use Biome for formatting and linting
- No comments describing changes in code
- Write commit messages in Japanese (for this project)

## Commit Guidelines

### Small, Frequent Commits
- Make small, focused commits for each task
- Each commit should represent a single logical change
- Commit messages should be in Japanese
- Always run `bun lint` before committing

### Commit Message Format
```
機能追加: NotionページのMarkdown変換機能を実装

- ページタイトルの抽出機能を追加
- ブロック階層のMarkdown変換を実装
- テストケースを作成
```

## Pull Request Process

1. Fork the repository
2. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. Make your changes following the coding standards
4. Ensure all tests pass:
   ```bash
   bun test
   ```
5. Ensure linting passes:
   ```bash
   bun lint
   ```
6. Commit your changes with descriptive messages
7. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
8. Open a Pull Request with:
   - Clear description of changes
   - Link to any related issues
   - Screenshots if applicable

## Code Review Guidelines

### For Contributors
- Keep PRs focused and reasonably sized
- Include tests for new functionality
- Update documentation if needed
- Respond to feedback promptly

### For Reviewers
- Be constructive and respectful
- Focus on code quality, not personal preferences
- Suggest improvements with explanations
- Approve when ready, don't delay unnecessarily

## Issue Guidelines

### Reporting Bugs
- Use the bug report template
- Include minimal reproduction steps
- Provide error messages and stack traces
- Specify Node.js and package versions

### Requesting Features
- Use the feature request template
- Explain the use case clearly
- Consider if it fits the project's scope
- Be open to discussion about implementation

## Getting Help

- Open an issue for bugs or feature requests
- Start discussions for design questions
- Check existing issues before creating new ones

## Development Environment

### Recommended Setup
- VS Code with TypeScript and Biome extensions
- Node.js version manager (nvm or similar)
- Git with proper configuration for commits

### Environment Variables
For testing with real Notion API:
```bash
export NOTION_API_KEY="your_test_api_key"
export NOTION_PAGE_ID="your_test_page_id"
```

## Release Process

This section is for maintainers:

1. Update version in `package.json`
2. Run tests and ensure they pass
3. Build the project: `bun run build`
4. Create a git tag: `git tag v1.0.0`
5. Push tags: `git push --tags`
6. Publish to npm: `npm publish`

Thank you for contributing to fetch-notion-page!