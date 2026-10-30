# Local Development with Docker Compose

This setup runs the existing Vite frontend, Express/TypeScript backend and authenticated MongoDB in containers. It is for local development; do not reuse the example credentials or development configuration in a deployed environment.

## Requirements

- Docker Desktop (or Docker Engine with the Compose plugin) with the daemon running.
- A recent Docker Compose plugin.
- Node.js 24 is used by the frontend and backend images. The repository lockfiles use npm; each Dockerfile runs `npm ci`.
- Ports 5173, 3000 and 27017 available on the host. MongoDB is published only on `127.0.0.1` for local Compass access.

The MongoDB service uses the official `mongo:8.0.32-noble` image. Compose keeps database files in the `mongodb_data` named volume and local image files in the separate `backend_image_data` named volume.

## Configure environment

From the repository root, create the ignored local environment file:

```powershell
Copy-Item .env.example .env
```

Replace `MONGO_INITDB_ROOT_PASSWORD` in `.env` with a unique local random value. `.env` is ignored by Git. Compose passes the database URI and credentials only to the backend; Mongoose receives credentials separately from the URI, so URI-reserved password characters do not need manual encoding. No database credentials are passed to the frontend.

The root `.env.example` configures:

| Variable | Purpose | Default |
|---|---|---|
| `MONGO_INITDB_ROOT_USERNAME` | MongoDB development administrator | `flux_dev` |
| `MONGO_INITDB_ROOT_PASSWORD` | Local MongoDB password; replace before starting | Placeholder |
| `MONGO_DATABASE` | Database name used by the backend URI | `flux_studio` |
| `MONGODB_HOST_PORT` | Host-only MongoDB port for Compass | `27017` |
| `MONGODB_SERVER_SELECTION_TIMEOUT_MS` | Backend connection timeout | `5000` |
| `MONGOOSE_AUTO_INDEX` | Apply declared model indexes on backend startup in development | `true` |
| `FRONTEND_ORIGIN` | Exact browser origin allowed by the backend | `http://localhost:5173` |

The backend also has existing optional session, image storage and Gemini variables documented in `backend/.env.example`. Compose does not pass `GEMINI_API_KEY` or `GEMINI_IMAGE_MODEL`, and this setup never calls Gemini.

## Start and inspect services

```powershell
docker compose config
docker compose up --build
```

Open the frontend at <http://localhost:5173>. The backend health endpoint is <http://localhost:3000/api/health>. Vite proxies `/api` requests to the backend service over the Compose network. Source directories are bind mounted for live reload; dependency directories stay in container volumes. Vite polling is enabled to support Docker Desktop file sharing.

In another terminal:

```powershell
docker compose ps
docker compose logs -f frontend backend mongodb
docker compose logs -f backend
docker compose restart backend
docker compose restart frontend
docker compose restart mongodb
```

MongoDB has an authenticated `mongosh` healthcheck. Backend starts only after MongoDB reports healthy, connects before opening port 3000, and closes the HTTP listener and Mongoose connection on container shutdown. Backend health is checked at `/api/health`.

## MongoDB Compass

Connect to `mongodb://localhost:27017/` with:

- Authentication method: Username / Password
- Username and password: `MONGO_INITDB_ROOT_USERNAME` and `MONGO_INITDB_ROOT_PASSWORD` from `.env`
- Authentication database: `admin`
- Database: `MONGO_DATABASE` from `.env` (`flux_studio` by default)

The backend connects over the internal Compose network using hostname `mongodb`; do not use `localhost` in the backend container URI.

## Build and test

The existing npm scripts run in their respective containers:

```powershell
docker compose exec backend npm run build
docker compose exec frontend npm run build
docker compose exec backend npm test
```

The optional database integration tests only write records when `MONGODB_TEST_URI` is explicitly configured to a dedicated test database. Do not point it at a shared, production or development database. To check health manually:

```powershell
Invoke-RestMethod http://localhost:3000/api/health
docker compose exec mongodb mongosh --quiet --username $env:MONGO_INITDB_ROOT_USERNAME --password $env:MONGO_INITDB_ROOT_PASSWORD --authenticationDatabase admin --eval "db.adminCommand('ping')"
```

To run a service outside Compose, install from its lockfile with `npm ci` in `frontend/` or `backend/`. Start the backend with its `backend/.env.example` values adjusted to use the host URI `mongodb://<username>:<password>@127.0.0.1:27017/flux_studio?authSource=admin`; start the frontend with `npm run dev -- --host 0.0.0.0` in `frontend/`. Set `BACKEND_PROXY_TARGET=http://localhost:3000` if running Vite with a different proxy target.

## Stop without deleting data

```powershell
docker compose down
```

This stops and removes containers and the Compose network while preserving both named volumes. `docker compose up` reuses the data. **Do not use `docker compose down -v` unless you intentionally want to delete the MongoDB database and local image files.**

## Troubleshooting

- **Cannot connect to Docker daemon:** start Docker Desktop/Engine, then retry `docker compose config` and `docker compose up --build`.
- **Compose reports a missing environment value:** copy `.env.example` to `.env` at the repository root and replace the password placeholder.
- **MongoDB healthcheck stays unhealthy:** inspect `docker compose logs mongodb`; verify the credentials in `.env`, and ensure port 27017 is free. Existing named-volume initialization credentials are not changed by editing `.env`; use the original credentials for that volume.
- **Backend cannot select a MongoDB server:** check MongoDB health and the backend logs. The container URI must use hostname `mongodb` and `authSource=admin`.
- **Port is already allocated:** change `MONGODB_HOST_PORT` for MongoDB; change host port mappings in `compose.yaml` for frontend/backend while retaining their container ports.
- **Changes do not reload on Windows:** ensure `VITE_USE_POLLING=true` remains set for the frontend, then restart the affected service. Backend uses the existing `tsx watch` script.
- **Unique index creation fails:** inspect duplicate records and reconcile through an approved database procedure. Do not drop collections or use `syncIndexes()` to force startup.
