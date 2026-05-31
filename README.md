# ReleaseCheck

> Your all-in-one release checklist tool.

A single-page application that helps development teams track and manage software releases with a step-by-step checklist.

---

## Tech Stack

| Layer    | Technology                     |
|----------|-------------------------------|
| Frontend | React + Vite                  |
| Backend  | Node.js + Express             |
| Database | PostgreSQL                    |
| Infra    | Docker / docker-compose       |
| Deploy   | Render (API) + Vercel (UI)    |

---

## Running Locally (Docker — recommended)

```bash
git clone https://github.com/YOUR_USERNAME/releasecheck.git
cd releasecheck
docker compose up --build
```

| Service  | URL                      |
|----------|--------------------------|
| Frontend | http://localhost:3000    |
| API      | http://localhost:4000    |
| Postgres | localhost:5432           |

---

## Running Locally (Manual)

### Prerequisites
- Node.js 20+
- PostgreSQL 15+ running locally

### Backend

```bash
cd backend
cp .env.example .env          # fill in DATABASE_URL
npm install
npm run dev                   # nodemon on :4000
```

`.env.example`:
```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/releasecheck
PORT=4000
```

### Frontend

```bash
cd frontend
cp .env.example .env          # fill in VITE_API_URL
npm install
npm run dev                   # Vite on :5173
```

`.env.example`:
```
VITE_API_URL=http://localhost:4000
```

---

## Running Tests

```bash
cd backend
npm test
```

---

## Deployment

### API → Render

1. Create a new **Web Service** on [render.com](https://render.com)
2. Connect your GitHub repo, set **Root directory** to `backend`
3. Build command: `npm install`  
   Start command: `node index.js`
4. Add env var: `DATABASE_URL` → your PostgreSQL connection string  
   (Render's managed Postgres or Neon/Supabase free tier work great)

### Frontend → Vercel

```bash
cd frontend
npx vercel --prod
# set VITE_API_URL to your Render API URL when prompted
```

---

## API Endpoints

| Method | Path                        | Description                        |
|--------|-----------------------------|------------------------------------|
| GET    | `/health`                   | Health check                       |
| GET    | `/releases`                 | List all releases                  |
| GET    | `/releases/:id`             | Get a single release               |
| POST   | `/releases`                 | Create a new release               |
| PATCH  | `/releases/:id/steps`       | Update completed steps             |
| PATCH  | `/releases/:id/info`        | Update additional info             |
| DELETE | `/releases/:id`             | Delete a release                   |

### POST `/releases` — Request Body

```json
{
  "name": "Version 2.0",
  "date": "2025-09-30T10:00:00Z",
  "info": "Optional notes"
}
```

### PATCH `/releases/:id/steps` — Request Body

```json
{
  "completedSteps": [0, 2, 5]
}
```

Steps are stored as an array of integer indices (0–8) referring to the fixed global step list.

---

## Database Schema

```sql
CREATE TABLE releases (
  id               TEXT PRIMARY KEY,
  name             TEXT        NOT NULL,
  date             TIMESTAMPTZ NOT NULL,
  info             TEXT        DEFAULT '',
  completed_steps  INTEGER[]   DEFAULT '{}',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
```

### computed `status` field (not stored, derived in API)

| Condition                         | Status    |
|-----------------------------------|-----------|
| `completed_steps = '{}'`          | `planned` |
| `0 < len(completed_steps) < 9`    | `ongoing` |
| `len(completed_steps) = 9`        | `done`    |

---

## Release Steps (fixed, global)

0. All relevant GitHub pull requests have been merged  
1. CHANGELOG has been updated  
2. Unit tests passing  
3. Release branch is created  
4. Deployed to staging & demo  
5. Tested thoroughly in the browser  
6. Deployment manifest updated  
7. Production deployment done  
8. Post-release monitoring active  

---

## Project Structure

```
releasecheck/
├── backend/
│   ├── index.js          # Express API
│   ├── index.test.js     # Jest tests
│   ├── package.json
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx       # Main SPA component
│   │   └── api.js        # API service layer
│   ├── package.json
│   ├── Dockerfile
│   ├── nginx.conf
│   └── .env.example
├── docker-compose.yml
└── README.md
```
