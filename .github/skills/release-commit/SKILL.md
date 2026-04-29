---
name: release-commit
description: "Run the release commit workflow for this app: ask version number, update package.json/package-lock.json/app.json, ask which files to stage, generate commit message with confirmation, commit, push, and run npm run build:eas."
---

# Release Commit

Use this skill when preparing a versioned release commit for this repository.

## Workflow

1. Ask the user for the target version (for example `1.22.0`).
2. Update version fields in all required files:
   - `package.json` → `version`
   - `package-lock.json` → top-level `version` and `packages[""].version`
   - `app.json` → `expo.version`
3. Ask the user which files to stage, list all modified files and allow them to select which ones to include in the commit.
4. Stage exactly what the user requested.
5. Generate a commit message and ask for confirmation before committing.
6. Commit with the approved message.
7. Push the commit to the current branch remote.
8. Run `npm run build:eas`.
9. Report final status, including commit hash and build artifact path if available.

## Rules

- Never skip confirmation before commit.
- If any step fails, stop and show the error clearly.
- Keep actions explicit and transparent (show what changed and what will be committed).
