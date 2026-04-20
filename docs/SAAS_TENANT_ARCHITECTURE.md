# SaaS / Tenant Architecture Notes

## Direct Answer
An online website cannot directly read or edit a customer's local SCUM config files by itself. Browsers are sandboxed and hosted servers cannot access files on a customer's PC unless the customer uploads them or installs a local component.

## Viable Models

### 1. Local-First App
This is the current model.
- The app runs on the same machine as the files.
- It can read/write local paths.
- It is simplest and safest for a single admin machine.
- No tenant login is required.

### 2. Hosted Web + Manual Upload/Download
- Customer uploads config/loot files.
- Website analyzes and edits them.
- Customer downloads the result and applies it manually.
- Good for presets and analysis.
- Not good for one-click live server changes.

### 3. Hosted Web + Local Agent
This is the realistic tenant model.
- Hosted web app handles login, tenant UI, plans, presets, and dashboards.
- A small local agent runs on the customer's server machine.
- The agent reads/writes SCUM files locally.
- The hosted app sends signed jobs to the agent.
- The agent pulls jobs, validates them, creates backups, applies changes, then reports status.

## Tenant Data Model
- Tenant
- Server
- Agent
- User
- Role/permission
- Config snapshot
- Backup metadata
- Apply job
- Audit event
- Item catalog metadata
- Preset/template

## Required Security Rules
- Never let the hosted app execute arbitrary shell commands by default.
- Agent commands should use an allowlist.
- Every apply job must create a backup first.
- Every job needs an audit event.
- Agent should only access configured SCUM folders.
- Sensitive local paths should be redacted in shared diagnostics.
- Each agent should authenticate with a revocable token.

## Recommended Path From This Project
1. Keep this project as the local agent/admin prototype.
2. Split `server.js` into modules for config, backups, loot, catalog, validation, graph, and activity.
3. Add an agent mode with a job polling endpoint.
4. Build a hosted tenant dashboard separately.
5. Move only metadata, status, diagnostics, presets, and audit events to the cloud.
6. Keep file writes on the customer's machine through the agent.

## What Not To Do
- Do not expect a hosted website to browse `C:\...` paths directly.
- Do not expose raw local command execution to tenants.
- Do not apply remote changes without local backup and validation.
- Do not mix multiple tenant files in one shared folder.
