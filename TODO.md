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
- [x] Add swing detail view with video playback + frame-by-frame controls.  
  Reference: `apps/mobile/src/screens/SwingDetailScreen.tsx`, `apps/api/src/routes/swings.ts`.
- [x] Implement key-frame tagging UI for P-positions.  
  Reference: `apps/mobile/src/screens/SwingAnalyzeScreen.tsx`, `apps/mobile/src/screens/SwingDetailScreen.tsx`, `apps/mobile/App.tsx`.
- [x] Store and retrieve frame tags via API.  
  Reference: `apps/api/src/routes/swings.ts`, `apps/api/src/lib/validation.ts`, `apps/mobile/src/lib/api.ts`, `apps/api/tests/integration/swings.test.ts`.
- [x] Add initial analysis request flow + job status polling.  
  Reference: `apps/api/src/routes/swings.ts`, `apps/mobile/src/screens/SwingAnalyzeScreen.tsx`, `apps/mobile/src/lib/api.ts`, `packages/shared/src/api.ts`, `apps/api/tests/integration/swings.test.ts`.

## Phase 3: 3D Stick Figure Rendering (P1-P10)
- [x] Decide rendering stack and runtime constraints (`@react-three/fiber/native`, `three`, `expo-gl`) and document Expo Go vs dev-build support.  
  Reference: `docs/decisions/002-3d-rendering-stack.md`.
- [x] Define canonical stick-figure schema (joints, bones, coordinate space, handedness) in shared types.  
  Reference: `packages/shared/src/stick-figure.ts`, `packages/shared/src/index.ts`.
- [x] Create initial P1-P10 pose dataset (static joint coordinates) and validation utilities.  
  Reference: `packages/shared/src/stick-figure-poses.ts`, `packages/shared/src/stick-figure-validation.ts`, `packages/shared/src/index.ts`.
- [x] Build reusable 3D viewport component with Blender-like grid background, camera, and lighting.  
  Reference: `apps/mobile/src/components/ThreeDViewport.tsx`, `apps/mobile/package.json`.
- [x] Unblock iOS development build for Phase 3 validation: update macOS to `>= 14.5`, install Xcode `>= 16.1`, run `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer` and `sudo xcodebuild -runFirstLaunch`, then run `pnpm --filter @swing/mobile exec expo run:ios`.  
  Reference: `xcodebuild -version` (`Xcode 26.2`), `xcodebuild -workspace apps/mobile/ios/SwingLibrary.xcworkspace -scheme SwingLibrary -showdestinations`, `pnpm --filter @swing/mobile exec expo run:ios --device 8C4473E2-ADCD-4048-92CE-DA89D7D1ABC6`.
- [ ] Verify dev-client startup and confirm Analyze screen renders the 3D viewport in simulator via development build (not Expo Go).
- [ ] Render stick figure from pose data and add controls to switch P1 through P10.
- [ ] Integrate split layout in Swing Analyze screen: video on left, 3D viewport on right (responsive fallback for narrow screens).
- [ ] Link selected frame-tag position to highlighted 3D P-position when possible.
- [ ] Add performance safeguards (memoization, low-cost materials, capped frame loop) for mobile rendering.
- [ ] Add tests for pose-data validity and UI state transitions.
- [ ] Manual (you): Provide/approve style references (camera angle, grid density, line thickness, background tone).
- [ ] Manual (you): Validate biomechanics of P1-P10 poses and provide correction notes.
- [ ] Manual (you): Create/use Expo development build if Expo Go is insufficient for target 3D performance.
- [ ] Manual (you + me): Run QA pass on simulator and one physical device before sign-off.

## Phase 4: Journey Tracking
- [ ] Add journey memory editor and versioned markdown storage.
- [ ] Add progress snapshots and goal tracking UI.
- [ ] Summarize journey memory for AI context.

## Phase 5: AI Analysis Pipeline
- [ ] Implement pose estimation pipeline (frame extraction + pose model).
- [ ] Derive P-position candidates and confidence scores.
- [ ] Generate coaching feedback with LLM using structured inputs.
- [ ] Align dynamic 3D stick figure overlay to swing video frames.

## Phase 6: Hardening & Release
- [ ] Add rate limiting and abuse protection on upload endpoints.
- [ ] Expand integration tests (storage + analysis flows).
- [ ] Add E2E Maestro flows for critical journeys.
- [ ] Prepare staging + production deployments with IaC.
