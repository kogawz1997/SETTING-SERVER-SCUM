# Security Policy

SETTING SERVER SCUM is a local-first tool. It is designed to run on the user's own machine and manage local SCUM server files.

## Supported Scope

Security work in this repository focuses on:

- local file write safety
- backup and rollback reliability
- command sandboxing for reload/restart actions
- path traversal protection
- support bundle sanitization
- avoiding private machine paths in release assets

## Reporting

Do not open a public issue with private server paths, tokens, logs, or config secrets.

Open a GitHub issue with a sanitized reproduction, or contact the maintainer privately if the issue includes sensitive local data.

## Command Safety

Reload/restart commands must remain explicit and sandboxed. Do not add generic shell execution, chained shell commands, or hidden remote execution behavior.

## Local Data

The app should not send SCUM config files, logs, backups, or diagnostics to an external server by default. Any future remote or SaaS mode must be treated as a separate architecture track, not an implicit behavior change in the local build.
