# TODO

## How We Use This List
- This file is the authoritative task tracker for completing the app.
- When a task is completed, we must ask for written confirmation that it is done and working.
- After confirmation, we cross it off and add a short reference to the code or command used.
- When finishing any task, suggest the next items from this list.

## Phase 1: Full Local Run + Xcode Simulator (Top Priority)
- [x] Install dependencies and lockfiles for the monorepo (pnpm, Python).  
  Reference: `pnpm install` (created `pnpm-lock.yaml`), `pip install -r apps/ai/requirements.txt` (optional `apps/ai/requirements.lock`).
- [ ] Run database migrations locally and verify schema update (users.password_hash).
- [ ] Start local infra with Docker Compose (Postgres + MinIO) and verify health endpoints.
- [ ] Run API locally with S3/MinIO config and validate auth + upload endpoints.
- [ ] Run AI service locally and validate `/health`.
- [ ] Run mobile app locally with Expo and verify Auth → Library → Upload flow.
- [ ] Simulate in Xcode (iOS Simulator) and verify video picker, upload, and library refresh.
- [ ] Enable agent autonomy to run app and tests (permissions + agreed commands).

## Phase 2: Core Feature Completion
- [ ] Implement swing browsing for shared libraries (visibility rules + API endpoint).
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
