# Decision: Baseline Tech Stack

- Status: accepted
- Date: 2026-02-04
- Owners: core team

## Context
We need a consistent, scalable foundation for mobile development, backend APIs, AI processing, and shared contracts. The stack should support video workflows, rapid iteration, and a monorepo structure.

## Decision
Adopt the baseline stack defined in `CODEX.md`:
- Mobile: React Native (Expo) + TypeScript.
- API: Node.js + TypeScript + Fastify.
- AI: Python + FastAPI.
- Data: PostgreSQL + S3-compatible object storage.
- Media: FFmpeg for processing.
- Repo: Monorepo with `apps/*` and `packages/*` using pnpm workspaces.

## Consequences
- Shared contracts live in `packages/shared` and are used by all services.
- Media workflows will depend on FFmpeg availability in dev and prod.
- The stack is TypeScript-heavy, which improves type safety but requires consistent TS config.

## Alternatives Considered
- Flutter for mobile (rejected for ecosystem and team preference).
- Firebase-only backend (rejected due to complex media workflows and future analytics needs).

## References
- `CODEX.md`
