---
name: commit
description: Create a git commit whose message follows the Conventional Commits 1.0.0 standard. Use when the user asks to commit changes, write a commit message, or invokes /commit.
argument-hint: "[optional hint about type, scope, or which changes to include]"
---

# Commit with Conventional Commits

Create a commit for the current changes with a message that follows [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/).

## 1. Review the changes

Run these to see what will be committed:

```bash
git status
git diff
git diff --staged
git log --oneline -10
```

- If changes are already staged, commit only those. Otherwise stage the files that belong to this change by name. Do NOT use `git add -A` or `git add .`.
- Never stage files that look like secrets or local configuration, such as `.env` files, credentials, or `.DS_Store`.
- If the changes cover unrelated concerns, split them into separate commits, one per logical change.
- If there is nothing to commit, say so and stop.

## 2. Write the message

```
<type>(<scope>)!: <description>

<body>

<footer(s)>
```

### Type

Use exactly one of these:

| Type | Use for |
| --- | --- |
| `feat` | A new feature for users |
| `fix` | A bug fix for users |
| `docs` | Documentation only, including `README.md` and `AGENTS.md` |
| `style` | Formatting with no change in behavior, such as whitespace or Prettier |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf` | Performance improvement |
| `test` | Adding or correcting tests |
| `build` | Build system or dependencies, such as `package.json` or `angular.json` |
| `ci` | CI configuration |
| `chore` | Maintenance that doesn't touch `src/` or tests, such as Claude Code skills |
| `revert` | Reverting an earlier commit |

### Scope

The scope is optional. When the change is contained in one area, name that area in lowercase kebab-case. Follow the project structure in `AGENTS.md`:

- A routed feature uses its top-level route folder, such as `systems`.
- Shared code uses its folder: `services`, `model`, `utils`, or `common`.
- Leave the scope out when the change spans several areas.

### Description

- Use the imperative mood: "add", not "added" or "adds".
- Start with a lowercase letter and don't end with a period.
- Keep the whole header line at 72 characters or fewer.

### Body

The body is optional. Add one, separated from the header by a blank line, when the reason for the change isn't obvious from the header. Explain what changed and why, not how. Wrap lines at 72 characters.

### Footers

Separate footers from the body with a blank line. Use the `Token: value` format.

- **Breaking changes:** Add `!` after the type or scope, AND add a `BREAKING CHANGE: <what breaks and how to migrate>` footer.
- **Issue references:** Use footers such as `Refs: #123` or `Closes: #123`.
- **Attribution:** Put any attribution trailer the session requires, such as `Co-Authored-By`, last.

## 3. Commit

Pass the message through a heredoc so the formatting is kept:

```bash
git commit -F - <<'EOF'
feat(systems): add system detail page

Show a system's purpose, owners, and connected systems so new
employees can understand where it fits.

Co-Authored-By: ...
EOF
```

- Do NOT use `--no-verify`. If a hook fails, fix the cause and create a NEW commit. Do not amend.
- Do NOT push unless the user asks.

Run `git log -1` afterwards to confirm the commit, and report the commit hash and header to the user.

## Examples

```
docs: describe stakeholders and goals in README
```

```
feat(common): add reusable system card component
```

```
fix(services): handle missing owner when loading systems
```

```
refactor(model)!: rename SystemLink to Integration

BREAKING CHANGE: SystemLink is removed. Import Integration from
src/app/model instead.
```
