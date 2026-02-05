# Swing Library - Codex Project Map

## Vision
Build a mobile-first golf swing library and analysis platform that helps golfers store swings, analyze key positions, and track progression toward a goal swing with clear visual guidance. The app must feel fast, trustworthy, and coach-like while remaining privacy-conscious and scalable.

## High-Level Goals
- Let members upload, store, and browse large swing libraries (their own and shared libraries).
- Provide frame-by-frame analysis tools and key-frame tagging using the P Classification System.
- Deliver AI-assisted feedback and goal tracking using structured swing metadata and user memory.
- Visualize corrections with 3D stick-figure overlays aligned to the swing video.
- Maintain a longitudinal swing journey with summaries, goals, and progress tracking.

## Product Principles
- Accuracy over novelty. If analysis confidence is low, say so.
- Coaching clarity. Feedback must be actionable and concise.
- Privacy by design. Default private, explicit sharing.
- Performance matters. Video workflows must feel responsive.
- Traceability. AI outputs must reference the data used.

## Technology Choices
Primary stack and libraries to use unless explicitly changed.

- Mobile app: React Native (Expo) + TypeScript.
- Backend API: Node.js + TypeScript + Fastify (or NestJS if structure demands it).
- AI service: Python + FastAPI for model orchestration and media processing.
- Database: PostgreSQL for users, swings, metadata, and goals.
- Object storage: S3-compatible storage for videos and derived assets.
- Media processing: FFmpeg for transcoding, frame extraction, and previews.
- 3D overlay: Three.js + React Native WebGL (or a native module if performance requires).
- Auth: OAuth2 + JWT, with social login support later.
- Infrastructure: Docker for local dev, IaC (Terraform) for cloud resources.

## Repository Layout (Monorepo)
- `apps/mobile`: React Native app.
- `apps/api`: Node/TypeScript backend.
- `apps/ai`: Python/FastAPI AI and video processing service.
- `packages/shared`: Shared types, schemas, and utilities.
- `packages/ui`: Shared UI primitives and tokens.
- `packages/config`: ESLint, Prettier, TSConfig, linting rules.
- `infra`: IaC, deployment templates, CI/CD.
- `docs`: Architecture notes, product decisions, and specs.

## Core Data Model (Conceptual)
- User, Profile, Membership.
- Swing (video asset + metadata).
- SwingFrameTag (P-classification key frames).
- SwingAnalysis (AI results, versioned).
- Goal (target positions, time horizon).
- ProgressSnapshot (derived metrics over time).
- JourneyMemory (markdown log, versioned).

## Media & Analysis Workflow
- Client uploads a raw swing video to storage via signed URL.
- Backend validates format, frame rate, angle metadata, and length.
- AI service extracts frames, computes pose estimates, and suggests candidate P-frames.
- User confirms or adjusts key frames in the UI.
- AI generates guidance tied to confirmed frames and goals.
- Results and journey updates are stored and versioned.

## AI Guidance Rules
- Prefer deterministic, explainable rules for basic checks.
- LLMs summarize and coach based on verified pose and key-frame data.
- All AI outputs must carry confidence tags and data provenance.
- Do not hallucinate metrics. If data is missing, say so.

## Journey Memory (Markdown)
- Each user has a markdown log that tracks goals, checkpoints, and lessons.
- Must be versioned and append-only, with periodic summaries.
- LLMs should read from summarized memory first, then raw history if needed.

## Testing Rules
- Unit tests for core business logic and pure functions.
- Integration tests for API routes and DB interactions.
- Media pipeline tests for FFmpeg frame extraction and validation rules.
- Mobile UI tests for upload flow, key-frame tagging, and analysis view.
- AI service tests for model interface and deterministic preprocessing steps.
- Never mock API responses when running the app locally or in dev/prod environments.
- Never force tests to pass with hardcoded assertions; tests must exercise actual code paths.
- No feature is “done” without tests for its critical path.

## CI/CD Rules
- Lint and typecheck on every PR.
- Unit tests required on every PR.
- Integration tests required before release builds.
- Deploy staging before production.

## Coding Standards
- TypeScript strict mode on.
- Shared types in `packages/shared` only.
- No direct DB access from the mobile app.
- All external APIs must have typed clients.
- Prefer small, composable modules.

## Security & Privacy
- Videos are private by default.
- Explicit permissions required to share or browse others.
- Encrypt sensitive data at rest and in transit.
- Provide clear data deletion flows.

## Definition of Done
- Feature works end-to-end on a real device.
- Tests for critical path are present and passing.
- UI states for loading, error, and empty conditions.
- Analytics events for key flows.
- Documentation updated in `docs` and this `CODEX.md`.
- `TODO.md` updated with completed tasks crossed off and references added after written confirmation.

## Updating This Map
- Update this file whenever architecture, tech stack, or workflows change.
- Record decisions in `docs/decisions` with a short rationale.
- If conflicting guidance exists, this file is the source of truth.

## Task Workflow
- `TODO.md` is the authoritative task list.
- When a task is completed, ask for written confirmation that it is done and working.
- After confirmation, cross it off in `TODO.md` and add a reference to the implementation (file paths or commands).
- When finishing any task, suggest the next items from `TODO.md`.
- Always try running required commands yourself first; only ask the user if you cannot execute them in the current environment.
- If a required tool or dependency is missing, attempt to download/install it before asking the user for manual steps.
