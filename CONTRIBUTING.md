# Contributing to Simplest Chat

First off, thank you for considering contributing to Simplest Chat! It's people like you that make this project a great tool. We welcome any and all contributions, from bug reports to new features.

This document provides guidelines for contributing to the project. Please read it carefully to ensure a smooth and effective contribution process.

## Code of Conduct

By participating in this project, you are expected to uphold our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it before you start, as we require all contributors to adhere to it.

## How Can I Contribute?

There are many ways to contribute to the project, and we appreciate all of them.

### 🐛 Reporting Bugs

If you find a bug, please ensure it hasn't already been reported by searching our [issues list](https://github.com/kirillinoz/simplest-chat/issues). If you can't find an existing issue, please [open a new one](https://github.com/kirillinoz/simplest-chat/issues/new?template=bug_report.yml) using the "Bug Report" template.

Please be sure to include as much information as possible, including steps to reproduce the bug.

### 🚀 Suggesting Enhancements

If you have an idea for a new feature or an improvement to an existing one, please check the [issues list](https://github.com/kirillinoz/simplest-chat/issues) to see if it has been suggested before. If not, please [open a new issue](https://github.com/kirillinoz/simplest-chat/issues/new?template=feature_request.yml) using the "Feature Request" template.

Well-defined feature requests with clear use cases are more likely to be implemented.

## Your First Code Contribution

Ready to write some code? Here's how to set up your environment and submit your first pull request.

### Tech Stack

Before you start, it's helpful to be familiar with our core technologies:

- **Framework:** React
- **Routing:** TanStack Router
- **Styling:** TailwindCSS
- **UI Components:** Shadcn UI
- **Code Quality:** ESLint and Prettier

### Branch Naming Convention

We use a structured branch naming convention to keep our codebase organized. All branch names must follow this pattern:

```
<type>/<description>
```

#### Branch Types

| Type            | Purpose                                                 | Examples                                              |
| --------------- | ------------------------------------------------------- | ----------------------------------------------------- |
| **`feature/`**  | New functionality or capabilities                       | `feature/dark-mode`, `feature/file-upload`            |
| **`fix/`**      | Bug fixes and error corrections                         | `fix/message-copy-bug`, `fix/scroll-performance`      |
| **`docs/`**     | Documentation changes                                   | `docs/update-readme`, `docs/api-documentation`        |
| **`style/`**    | Code formatting, whitespace, styling (no logic changes) | `style/button-colors`, `style/code-formatting`        |
| **`refactor/`** | Code restructuring without changing functionality       | `refactor/chat-store`, `refactor/component-structure` |
| **`perf/`**     | Performance improvements                                | `perf/message-rendering`, `perf/file-loading`         |
| **`test/`**     | Adding or updating tests                                | `test/chat-actions`, `test/file-storage`              |
| **`chore/`**    | Maintenance tasks, dependency updates, build config     | `chore/update-deps`, `chore/ci-improvements`          |

#### Examples

✅ **Good branch names:**

- `feature/add-message-actions`
- `fix/sidebar-scroll-issue`
- `docs/contributing-guidelines`
- `refactor/file-storage-manager`

❌ **Bad branch names:**

- `my-new-feature`
- `bugfix`
- `updates`
- `feature-branch`

### 1. Fork the Repository

First, [fork the repository](https://github.com/kirillinoz/simplest-chat/fork) to your own GitHub account.

### 2. Clone Your Fork

Next, clone your forked repository to your local machine.

```bash
git clone https://github.com/YOUR_USERNAME/simplest-chat.git
cd simplest-chat
```

### 3. Create a Feature Branch

Create a new branch following our naming convention:

```bash
# For a new feature
git checkout -b feature/your-feature-name

# For a bug fix
git checkout -b fix/your-bug-fix

# For documentation
git checkout -b docs/your-doc-update
```

### 4. Make Your Changes

Write your code, following our coding standards:

- Use TypeScript for type safety
- Follow existing code patterns and conventions
- Write clear, descriptive commit messages
- Add comments for complex logic
- Ensure your code is properly formatted

### 5. Test Your Changes

Before submitting your pull request:

- Test your changes locally
- Ensure the application builds without errors
- Verify that existing functionality still works
- Add tests for new features when applicable

### 6. Commit Your Changes

Use clear, descriptive commit messages:

```bash
git add .
git commit -m "Add message copy functionality with clipboard integration"
```

### 7. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

### 8. Create a Pull Request

Go to the original repository and create a pull request from your fork. Include:

- A clear title describing the change
- A detailed description of what you've implemented
- Any relevant issue numbers (e.g., "Fixes #123")
- Screenshots if your changes affect the UI

## Pull Request Guidelines

- Keep pull requests focused on a single feature or fix
- Include a clear description of the changes
- Reference any related issues
- Ensure all checks pass before requesting review
- Be responsive to feedback and questions

## Development Setup

```bash
# Install dependencies
pnpm install

# Start development server
pnpm run dev

# Run type checking
pnpm run type-check

# Run linting
pnpm run lint

# Build for production
pnpm run build
```

## Questions?

If you have any questions about contributing, feel free to:

- Open an issue for discussion
- Reach out to the maintainers
- Check existing issues and discussions

Thank you for contributing! 🎉
