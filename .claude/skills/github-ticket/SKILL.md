# Work on a GitHub Ticket

Read a GitHub ticket and implement the requested changes in a worktree, then open a draft PR.

## Steps

1. **Verify base branch**: Run `git branch --show-current`.
    - If on `main`, continue.
    - If on any other branch, stop and ask the user to confirm whether to proceed from the current branch or switch to `main` first.

2. **Read the ticket**: Fetch the issue with `gh issue view <number> --repo <owner>/<repo>`.
    - If no issue number or ticket URL was provided as an argument, ask the user for them.

3. **Explore the codebase**: Read the relevant source files to understand the existing patterns,
   idioms, and conventions before planning. Use the Explore subagent for broad searches; use
   direct `Read` / `grep` / `find` calls for targeted lookups.

4. **Plan the implementation**: Think through:
    - Whether `backend/`, `frontend/` or both need to be updated
    - What new files are needed (API handlers, UI components, tests, etc.)
    - What existing files must be modified
    - How the new code fits the existing architecture (package structure, naming, API conventions,
      test style — all as documented in CLAUDE.md)
    - Use/prefer modern ECMAScript and TypeScript idioms where applicable

5. **Resolve ambiguity before coding**: If anything is unclear, or there is a genuine judgment call
   between two or more valid approaches with meaningful trade-offs and no obvious preferred answer,
   ask the user to choose before writing any code. Do not ask about trivial implementation details
   you can decide yourself.

6. **Create a worktree**: Once the approach is clear, create a worktree branch with a name that
   reflects the work (e.g., `feature/add-history-chart`). Use the `EnterWorktree` tool. The
   worktree will be created inside `.claude/worktrees/` — do not pass an explicit path argument;
   the `EnterWorktree` tool handles placement automatically.

7. **Set up the worktree for local dev**: Immediately after creating the worktree, run:
   ```bash
   npm run setup:worktree
   ```
   This installs dependencies, symlinks `backend/.env` from the main project, and copies
   `backend/jobman.db` so the worktree is ready for `npm run dev` without manual setup.

8. **Implement the changes**: Write all code inside the worktree. Follow CLAUDE.md conventions
   exactly.

9. **Run tests and linting, then commit**:
    - Run `npm test` - fix any broken tests before proceeding.
    - Run `npm run lint:fix` — fix any linting failures before proceeding.
    - Run `npm run format:fix` — fix any formatting failures before proceeding.
    - Run `npm run tsc` — fix any typing errors identified before proceeding.
    - Stage and commit all changes in a single commit using conventional commit style.
      Include `Co-Authored-By: Claude <model> <version> <noreply@anthropic.com>` in the commit message.
      For example, `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`.

10. **Create a draft PR**: Push the branch and open a draft PR via `gh pr create --draft`.
    - Title: concise, matching the commit style
    - Body: use the project's GitHub pull request template. Reference the issue number (e.g.,
      `Closes #34`), summarize what changed and add the footer:
      `🤖 Generated with [Claude Code](https://claude.ai/claude-code)`
    - Add relevant labels (`bug`, `build`, `ci/cd`, `dependencies`, `enhancement`, `refactor`, `tests`, etc.)
