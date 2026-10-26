# MSSMS

Meteorological Station & Sensor Management System: a MERN application for virtual weather stations, validated telemetry, calibration schedules, maintenance records, rule-based alerts, and CSV reports.

## Features

- **Stations**: Create, list, and manage virtual observation sites with coordinates and per-station alert thresholds (temperature max, humidity max, stale-minutes, temperature jump).
- **Sensors**: Register temperature/humidity/wind/pressure sensors per station with calibration tracking (last calibrated, next due, status: Calibrated / Due Soon / Overdue). Admin-only.
- **Readings**: Poll Open-Meteo for active stations on a cron schedule (default every 10 minutes), without an API key. Invalid provider readings are retained with `isValid: false` for auditability and excluded from dashboards, charts, and exports.
- **Alerts**: Rule-based alerts (TEMPERATURE, HUMIDITY, STALE_DATA) raised on ingestion. Admins resolve; Admins and Operators acknowledge.
- **Maintenance**: Planned/Done maintenance records tied to stations and optional sensors. Admins and Operators can create.
- **Reports**: CSV export of valid readings with optional station and date-range filters.
- **Auth**: JWT authentication with three roles — Admin, Operator, Viewer. The first account registered in an empty database becomes Admin; later public signups are Viewers. An authenticated Admin can create accounts with any role.

## Roles & permissions

| Action | Admin | Operator | Viewer |
|---|---:|---:|---:|
| Register (any role) | Yes | No | No |
| Manage stations / sensors | Yes | No | No |
| Calibrate sensors | Yes | No | No |
| Create maintenance records | Yes | Yes | No |
| Acknowledge alerts | Yes | Yes | No |
| Resolve alerts | Yes | No | No |
| View dashboard, stations, charts, reports | Yes | Yes | Yes |

## Requirements

- Node.js 20 or newer
- MongoDB (local or Atlas)
- Network access to the Open-Meteo forecast API (`https://api.open-meteo.com`). No API key is required for this development integration.

## Environment setup

### Server

Copy `server/.env.example` to `server/.env`, then set `MONGODB_URI` and a random `JWT_SECRET` of at least 32 characters. Open-Meteo ingestion does not require a provider key.

```
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/mssms
DATA_SOURCE=OPEN_METEO
INGEST_CRON=*/10 * * * *
CLIENT_ORIGIN=http://localhost:5173
JWT_SECRET=<random-secret-min-32-chars>
JWT_EXPIRES_IN=12h
```

- `CLIENT_ORIGIN` must match the Vite dev-server origin (default `http://localhost:5173`). If Vite picks a different port (e.g. 5174), update this value accordingly or set multiple comma-separated origins.
- Set `INGEST_ON_START=true` to fetch a reading for every active station immediately at server startup.

### Client

Create `client/.env` if you need to point the API base URL elsewhere:

```
VITE_API_BASE_URL=http://localhost:5000/api
```

## Run locally

1. Start MongoDB (local `mongod` or use Atlas).
2. In `server/`, run:

```
npm install
npm run dev        # or: npm start
```

The API listens on port `PORT` (default 5000). A health endpoint is available at `GET /api/health`.

3. In `client/`, run:

```
npm install
npm run dev        # Vite, normally http://localhost:5173
```

4. Open the Vite URL in the browser. Register the first account — it becomes the Admin.

## Deploy to Vercel

Deploy this as two Vercel projects from the same repository or workspace upload:

1. **API project**: set the Vercel Root Directory to `server`. The Express app is exported for Vercel Functions. Add these Production environment variables in Project Settings:
   - `MONGODB_URI`: a MongoDB Atlas connection string (Atlas must allow network access from Vercel).
   - `JWT_SECRET`: a unique random secret of at least 32 characters.
   - `CRON_SECRET`: a separate random secret for scheduled ingestion.
   - `CLIENT_ORIGIN`: the deployed frontend origin, for example `https://mssms-client.vercel.app`.
   - `DATA_SOURCE`: `OPEN_METEO` (no weather API key is needed).
   - Optionally `JWT_EXPIRES_IN`: defaults to `12h`.
2. **Frontend project**: set the Vercel Root Directory to `client`, framework preset to Vite, and set `VITE_API_BASE_URL` to the API project URL plus `/api`, for example `https://mssms-api.vercel.app/api`.
3. Deploy both projects. Update the API project's `CLIENT_ORIGIN` to the exact frontend URL and redeploy the API if the URL was not known when it was first deployed.
4. Register the first account on the deployed frontend; it becomes the Admin if the Atlas database has no users.

The included GitHub Actions workflow triggers free 10-minute ingestion; the Vercel project config intentionally has no Vercel cron so it can deploy on Hobby. Add repository Actions secrets `MSSMS_API_BASE_URL` (the backend origin, e.g. `https://mssms-api.vercel.app`) and `MSSMS_CRON_SECRET` (the exact value configured as the API project's `CRON_SECRET`). The workflow can also be started manually from the Actions tab. GitHub scheduled workflows use UTC and may be delayed; GitHub may disable schedules on inactive public repositories.

Do not put MongoDB credentials or JWT/cron secrets in `VITE_*` variables; those are exposed to the browser bundle. Keep them only in the API project's environment settings.

## API reference

All paths are relative to `http://localhost:5000/api`. Endpoints under `/api/*` (except `/api/auth/*`, `/api/health`, and the `CRON_SECRET` protected ingestion endpoint) require `Authorization: Bearer <token>`.

### Authentication (public)

- `POST /api/auth/register` — body: `{ username, email, password, role? }`. First account in an empty DB becomes Admin; otherwise public signups are Viewers unless the caller is an authenticated Admin.
- `POST /api/auth/login` — body: `{ login (username or email), password }`. Returns `{ token, user }`.
- `GET /api/auth/me` — authenticated. Returns `{ user }`.

### Stations

- `GET /api/stations` — list all stations (authenticated).
- `POST /api/stations` — Admin only. body: `{ name, city, state, latitude, longitude, status?, thresholds? }`.
- `PUT /api/stations/:id` — Admin only. Partial update.
- `GET /api/stations/:id/readings?from=&to=` — valid readings for a station within an optional date range (latest 10000).

### Readings

- `GET /api/readings?stationId=` — latest valid observation per active station (500 max), used by the dashboard.

### Sensors

- `GET /api/sensors` — Admin/Operator. Includes computed `calibration` status.
- `POST /api/sensors` — Admin only. body: `{ stationId, type ('temperature'|'humidity'|'wind'|'pressure'), name?, lastCalibrated?, calibrationIntervalDays? }`.
- `PUT /api/sensors/:id/calibrate` — Admin only. body: `{ calibratedOn? }`.

### Maintenance

- `GET /api/maintenance?stationId=` — Admin/Operator.
- `POST /api/maintenance` — Admin/Operator. body: `{ stationId, sensorId?, type, description?, performedOn?, performedBy?, status? ('Planned'|'Done') }`.

### Alerts

- `GET /api/alerts?status=&type=&severity=` — list alerts. Query filters: `status` (Open/Acknowledged/Resolved), `type` (TEMPERATURE/HUMIDITY/STALE_DATA), `severity` (Low/Medium/High).
- `PUT /api/alerts/:id` — body: `{ status: 'Acknowledged'|'Resolved' }`. Acknowledged by Admin/Operator; Resolved by Admin only.

### Reports

- `GET /api/reports/readings.csv?stationId=&from=&to=` — CSV export of valid readings. Requires a valid date range if `from`/`to` are provided.

### Health

- `GET /api/health` — `{ status, database }`. No auth required.

## Ingestion scheduler

`startIngestionJob()` runs `node-cron` on `INGEST_CRON` (default `*/10 * * * *`). Each cycle:

1. Fetches current Open-Meteo conditions for every active station using its latitude and longitude, requesting Celsius, relative humidity, surface pressure, and wind speed in m/s.
2. Validates telemetry against bounds (temperature −90–60 °C, humidity 0–100 %, wind 0–120 m/s, pressure 850–1090 hPa).
3. Creates a `Reading` (`isValid: true` if in bounds, `isValid: false` otherwise for auditability).
4. Evaluates threshold/jump rules and raises alerts (at most one active alert per station and type).
5. Checks for stale stations (no valid reading within `thresholds.staleMinutes`).

Set `INGEST_ON_START=true` in `server/.env` to run one cycle at startup.

## Client pages & components

- `Dashboard.jsx` — live network summary, average conditions, station conditions table.
- `Stations.jsx` — station registry, add/edit, activate/deactivate, search.
- `StationDetail.jsx` — station readings, trend charts (temperature/humidity/pressure/wind), date filters, CSV export.
- `Sensors.jsx` — sensor list, create, calibrate (Admin).
- `Maintenance.jsx` — maintenance records (Admin/Operator).
- `Alerts.jsx` — alert list, acknowledge/resolve (Admin/Operator).
- `Reports.jsx` — CSV report download.
- `Login.jsx`, `Register.jsx` — auth pages.
- `Navbar.jsx`, `Sidebar.jsx` — navigation and theme toggle.
- `PrivateRoute.jsx` — role-gated routes.
- `AuthContext.jsx` — JWT token management and `hasRole()` helper.

## Project structure

```
MSSMS-1/
├── README.md
├── server/                 # Express + Mongoose API
│   ├── server.js           # Entry point, CORS, routes, ingestion job
│   ├── .env.example        # Server environment template
│   ├── package.json
│   ├── models/             # User, Station, Reading, Sensor, Maintenance, Alert
│   ├── routes/             # auth, stations, readings, sensors, maintenance, alerts, reports
│   ├── services/           # weatherService, calibrationService, validatorService, alertEngine
│   ├── jobs/               # ingestionJob (node-cron scheduler)
│   └── middleware/         # auth (requireAuth, optionalAuth, allowRoles)
└── client/                 # Vite + React + Tailwind frontend
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── package.json
    ├── src/
    │   ├── main.jsx
    │   ├── App.jsx
    │   ├── index.css
    │   ├── pages/            # Dashboard, Stations, StationDetail, Sensors, Maintenance, Alerts, Reports, Login, Register
    │   ├── components/       # Navbar, Sidebar, PrivateRoute, StatusBadge, MetricCard, StationForm, TrendChart
    │   ├── context/          # AuthContext
    │   └── services/         # api.js (axios)
```

## Troubleshooting

- **`React is not defined`** — ensure `client/vite.config.js` registers `@vitejs/plugin-react`. Without it, esbuild defaults to the classic JSX runtime, but source files never import `React`.
- **CORS errors** — set `CLIENT_ORIGIN` in `server/.env` to the exact Vite origin (e.g. `http://localhost:5174` if 5173 is in use), then restart the server.
- **Port 5000 already in use** — another node process is holding the port. Stop it or change `PORT` in `server/.env`.
- **`JWT_SECRET must contain at least 32 characters`** — generate a longer secret (48+ random alphanumeric characters).
- **First account not becoming Admin** — ensure the database is empty before registering the first account; the role logic runs on `User.countDocuments() === 0`.
