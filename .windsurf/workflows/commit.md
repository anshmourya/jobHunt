---
description: Define commit message rules to ensure consistency, readability, and traceability across the development team.
---

# Commit Message Guidelines

This workflow enforces a commit message format based on the conventional commit specification.

## Format

### Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code (white-space, formatting, etc.)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing ones
- `chore`: Maintenance tasks (build, CI, dependencies)

### Scope

Scope refers to the section of the codebase the commit affects (e.g., `auth`, `dashboard`, `api`). It is optional but recommended.

### Description

Use the imperative mood in the short description (e.g., “fix bug” not “fixed bug” or “fixes bug”).

### Body

Explain what and why (not how). Include motivation, background, or reasoning if necessary.

### Footer

Use for breaking changes and issues:

- Breaking changes: `BREAKING CHANGE: description`
- Issue references: `Fixes #123`

## Example

feat(auth): add JWT-based login system
