# API Service (Node + TypeScript)

Backend service for authentication, swing metadata, sharing, and orchestration of AI workflows.

Planned responsibilities:
- User and profile management.
- Swing metadata, permissions, and browsing.
- Signed upload URLs and media validation.
- Coordination with AI service for analysis.

Dev notes:
- Requires S3-compatible storage configuration (MinIO locally).
- Set env vars listed in `.env.example` before running.
- Use `/v1/auth/register` and `/v1/auth/login` to obtain a JWT for requests.
