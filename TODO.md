# TODO

## How We Use This List
- This file is the authoritative task tracker for completing the app.
- When a task is completed, we must ask for written confirmation that it is done and working.
- After confirmation, we cross it off and add a short reference to the code or command used.
- When finishing any task, suggest the next items from this list.

## Phase 1: Full Local Run + Xcode Simulator (Top Priority)
- [x] Install dependencies and lockfiles for the monorepo (pnpm, Python).  
  Reference: `pnpm install` (created `pnpm-lock.yaml`), `pip install -r apps/ai/requirements.txt` (optional `apps/ai/requirements.lock`).
- [x] Run database migrations locally and verify schema update (users.password_hash).  
  Reference: `apps/api/prisma/migrations/20260204232858_init/`, verified via `SELECT column_name FROM information_schema.columns WHERE table_name='User' AND column_name='password_hash';`.
- [x] Start local infra with Docker Compose (Postgres + MinIO) and verify health endpoints.  
  Reference: `docker compose -f docker-compose.dev.yml up -d`, `curl http://localhost:4000/health`, `curl http://localhost:8000/health`, `curl http://localhost:9000/minio/health/ready`.
- [x] Run API locally with S3/MinIO config and validate auth + upload endpoints.  
  Reference: `POST /v1/auth/login`, `POST /v1/swings/uploads`, presigned PUT to MinIO, `POST /v1/swings`, `GET /v1/swings`.
- [x] Run AI service locally and validate `/health`.  
  Reference: `curl http://localhost:8000/health`.
- [x] Run mobile app locally with Expo and verify Auth → Library → Upload flow.  
  Reference: `pnpm --filter @swing/mobile ios -- --host localhost --port 8082 --clear` (Auth → Library → Upload verified).
- [x] Simulate in Xcode (iOS Simulator) and verify video picker, upload, and library refresh.  
  Reference: iOS Simulator (Expo Go) video picker import + upload + library refresh.
- [x] Enable agent autonomy to run app and tests (permissions + agreed commands).  
  Reference: `AGENTS.md`.

## Phase 2: Core Feature Completion
- [x] Implement swing browsing for shared libraries (visibility rules + API endpoint).  
  Reference: `apps/api/src/routes/swings.ts`, `packages/shared/src/api.ts`, `apps/api/tests/integration/swings.test.ts`.
- [ ] Add swing detail view with video playback + frame-by-frame controls.
- [ ] Implement key-frame tagging UI for P-positions.
- [ ] Store and retrieve frame tags via API.
- [ ] Add initial analysis request flow + job status polling.

## Phase 3: Journey Tracking
- [ ] Add journey memory editor and versioned markdown storage.
- [ ] Add progress snapshots and goal tracking UI.
- [ ] Summarize journey memory for AI context.

## Phase 4: AI Analysis Pipeline
- [ ] Implement pose estimation pipeline (frame extraction + pose model).
- [ ] Derive P-position candidates and confidence scores.
- [ ] Generate coaching feedback with LLM using structured inputs.
- [ ] Display 3D stick figure overlay aligned to swing video.

## Phase 5: Hardening & Release
- [ ] Add rate limiting and abuse protection on upload endpoints.
- [ ] Expand integration tests (storage + analysis flows).
- [ ] Add E2E Maestro flows for critical journeys.
- [ ] Prepare staging + production deployments with IaC.
