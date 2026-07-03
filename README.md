# Game Bounties

A self-hosted household tracker for 100%-completion checklists across your game library — playtime, peer-approved completions, a token economy, and purchase logging.

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). This uses a local ephemeral Postgres via `npx prisma dev` (see `.env`).

## Deploying (Docker + TrueNAS)

The app ships as a Docker image built by [`.github/workflows/docker-publish.yml`](.github/workflows/docker-publish.yml), which publishes to GitHub Container Registry (GHCR) on every push to `main`. No local Docker install or SSH needed.

**One-time setup:**

1. Create a GitHub repo and push this project to it.
2. The included workflow builds and publishes the image automatically — check the "Actions" tab on GitHub after your first push.
3. By default, GHCR packages are private. Go to your GitHub profile → Packages → the `game-bounties` package → Package settings → change visibility to Public (simplest option — otherwise TrueNAS needs a registry pull secret).
4. Edit [`docker-compose.yaml`](docker-compose.yaml): replace `YOUR_GITHUB_USERNAME/YOUR_REPO_NAME` in the `image:` line with your actual GitHub username and repo name (lowercase).
5. On TrueNAS SCALE: Apps → Discover Apps → Custom App, and paste in `docker-compose.yaml`'s contents (or use "Launch Docker Image" pointing at the same `ghcr.io/...` image). Fill in the environment variables from `.env.example` and point `UPLOADS_PATH`/`DB_DATA_PATH` at real dataset paths.

**Updating later:** push code changes to GitHub → the workflow rebuilds and republishes `:latest` automatically → on TrueNAS, click Update/Restart on the app to pull the new image. Database migrations run automatically on container start (`docker-entrypoint.sh` runs `prisma migrate deploy`), so schema changes ship with the same redeploy — no manual DB steps.
