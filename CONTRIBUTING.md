# Contributing

This project is a local-first SCUM server configuration manager. Contributions should protect the core rule: never make it easier for a user to damage real server files.

## Development Flow

1. Install dependencies with `npm install`.
2. Run the app with `npm start` or `start-local.cmd`.
3. Use the sample workspace for risky changes before testing real config files.
4. Add or update tests for behavior changes.
5. Run `npm run release:check` before pushing.
6. Run `npm run release:quality` before any release tag.

## Safety Expectations

- Preview before apply for risky changes.
- Backup before writing real config files.
- Keep command execution behind the command sandbox.
- Do not write machine-specific paths into committed examples.
- Keep support bundles sanitized.

## UI Copy

Prefer practical Thai/English labels that tell server owners what a setting does. Avoid placeholder copy, vague warnings, or raw technical labels when the UI can explain the action in plain language.

## Release Work

Release tags use this shape:

```text
v1.0.9-local
```

The GitHub Actions release workflow builds the portable folder, zips it, smoke-tests the extracted zip, and publishes the GitHub Release asset.
