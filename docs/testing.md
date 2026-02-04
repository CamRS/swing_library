# Testing Guide

## Goals
- Catch regressions early with fast unit tests.
- Validate real integrations (API + DB + storage) with integration tests.
- Prove end-to-end flows locally using the same services we run in dev/prod.
- Never fake success: tests must exercise actual code paths and real data.

## Test Layers

### Unit Tests
Purpose: fast feedback for pure logic.
- API: validate request shaping and helper logic.
- Mobile: UI rendering and component logic.
- AI: pure functions and model input/output shaping.

### Integration Tests
Purpose: real service + DB + storage interactions.
- API tests use Postgres (Testcontainers) and require Docker.
- MinIO used for local S3 emulation where applicable.
- No mocked API responses.

### E2E Tests
Purpose: full user flow with real services.
- Upload video → create swing → browse library.
- Run locally against Docker Compose services.
- Mobile E2E: Maestro (fast iteration).

## Local Infrastructure (Dev)
We use Docker Compose to run dependencies locally.

Start local infra (full stack):
```
docker compose -f docker-compose.dev.yml up -d
```

If you want to run API/AI on the host for faster iteration:
```
docker compose -f docker-compose.dev.yml up -d postgres minio
```
Then run:
- API: `pnpm --filter @swing/api dev`
- AI: `cd apps/ai && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
- Mobile: `pnpm --filter @swing/mobile start`

MinIO console: `http://localhost:9001` (default creds are in `docker-compose.dev.yml`).
Bucket: `swing-library`.
The API uses S3 presigned uploads; MinIO emulates S3 locally.

## Commands

### API
- Unit: `pnpm --filter @swing/api test:unit`
- Integration: `pnpm --filter @swing/api test:integration`

### AI
- Tests: `cd apps/ai && pytest`

### Mobile
- Unit: `pnpm --filter @swing/mobile test`

### E2E (Local)
- Bring up infra: `docker compose -f docker-compose.dev.yml up -d`
- Run API + AI + mobile.
- Execute Maestro flows from `apps/e2e`.

### Prod-Like Local
- Build and run: `docker compose -f docker-compose.prod.yml up --build`
- Uses the same ports as dev, but runs the production containers.

## Rules
- Tests must exercise actual code paths; no hardcoded pass conditions.
- Do not mock API responses for local/dev/prod runs.
- Integration tests use real services (Postgres, MinIO).
- Any new feature must include tests for its critical path.

## Environments
- `dev`: local services + dev API keys.
- `prod`: production-like settings. No hot reload. No mocks.
