# Agent Autonomy Approval

The user has approved the following command allowlist for autonomous execution
within this repo. Requests outside this list still require explicit approval.

## Allowed Commands
- Read-only repo checks: `rg`, `ls`, `cat`, `sed`, `tail`, `git status`
- App/dev: `pnpm --filter @swing/mobile start|ios|android|web`
- All repo pnpm commands: `pnpm ...`
- Build/typecheck: `pnpm --filter @swing/shared build`, `pnpm -r typecheck`
- Tests: `pnpm -r test`, `pnpm --filter @swing/mobile test`
- API integration tests: `pnpm --filter @swing/api test:integration`
- Dependency sync (network): `pnpm install`, `pnpm --filter @swing/mobile exec expo install <pkg>`
- Local services: `docker compose -f docker-compose.dev.yml up -d|down|ps|logs`
- Health checks: `curl http://localhost:*`

## Always Ask First
- Destructive commands or file deletions
- Edits outside this repository
- GUI launches (including Simulator) unless explicitly requested
- Network access not covered above
