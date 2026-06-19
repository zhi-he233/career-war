# VPS Deployment

This project is deployed on an Ubuntu VPS with Docker Compose and Caddy.

## Local Check

Before pushing deployment changes, run:

```bash
npm run build
```

If the build passes, commit and push:

```bash
git add .
git commit -m "your message"
git push origin main
```

## Safer Server Update

Prefer building the new version before replacing the running service. Do not start with `docker compose down`, because a failed build would leave the site offline.

A simple update flow:

```bash
cd /opt/career-war
git pull
docker compose build
docker compose up -d
```

Use `--no-cache` only when dependency or base-image caching is suspected:

```bash
docker compose build --no-cache
docker compose up -d
```

## Runtime Failures

If the app container shows `Restarting`, the image probably built successfully but the app failed during startup. Check the app logs:

```bash
docker compose logs --tail=200 app
```

SQLite runtime files under `server/data` should stay on the server or local machine and should not be committed.
