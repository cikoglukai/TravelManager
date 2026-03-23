# Trip Manager

A single-page web application for managing leisure travel trips.
Built as part of a university exercise at HTWG Konstanz.

**Group members:** Kai Cikoglu, Nina Karl, Johanna Prinz, Daniel Rill

---

## Application Architecture

### Overview

The application follows a fullstack architecture where the frontend and backend
are served from the same Nuxt 3 process. The frontend communicates with the
backend exclusively through a REST API.

```
┌─────────────────────────────────────────┐
│              Browser (SPA)              │
│         Vue 3 · Nuxt 3 (app/)           │
└────────────────────┬────────────────────┘
                     │ REST (HTTP/JSON)
┌────────────────────▼────────────────────┐
│           Nuxt / Nitro Server           │
│        REST API  (server/api/)          │
└────────────────────┬────────────────────┘
                     │ pg (node-postgres)
┌────────────────────▼────────────────────┐
│             PostgreSQL 16               │
│         (Docker named volume)           │
└─────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 22 |
| Framework | Nuxt 3 (Vue 3 + Nitro) |
| Frontend | Vue 3 Composition API, single-file components |
| Backend / API | Nitro (built into Nuxt) — file-based REST routes |
| Database | PostgreSQL 16 |
| DB Client | node-postgres (`pg`) |
| Containerisation | Docker + Docker Compose |
| Operating System | macOS / Linux (any Docker-capable OS) |

### Project Structure

```
app/                    # Frontend (Nuxt srcDir)
├── app.vue             # Root layout, navigation bar, footer
├── components/
│   └── TripForm.vue    # Shared create/edit form component
├── composables/
│   └── useAuth.js      # Session state (useState + localStorage)
├── pages/
│   ├── index.vue       # Redirect based on auth state
│   ├── register.vue    # Login / registration (two-step)
│   └── trips/
│       ├── index.vue   # Trip list
│       ├── new.vue     # Create trip
│       └── [id].vue    # Trip detail + inline edit
└── plugins/
    └── auth.client.js  # Restores session from localStorage on load

server/                 # Backend (Nitro — runs on Node.js)
├── api/
│   ├── users/
│   │   └── index.post.js       # POST /api/users  (login / register)
│   └── trips/
│       ├── index.get.js        # GET  /api/trips
│       ├── index.post.js       # POST /api/trips
│       ├── [id].get.js         # GET  /api/trips/:id
│       ├── [id].put.js         # PUT  /api/trips/:id
│       └── [id].delete.js      # DELETE /api/trips/:id
├── plugins/
│   └── db.js           # Runs CREATE TABLE IF NOT EXISTS on startup
└── utils/
    └── db.js           # PostgreSQL connection pool + schema definition

public/                 # Static assets
nuxt.config.js          # Nuxt configuration (srcDir, compatibilityDate)
docker-compose.yml      # PostgreSQL + app services
Dockerfile              # App container (Node 22 Alpine)
```

### REST API

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/users` | Login (existing email) or register (new email + name) |
| GET | `/api/trips?userId=` | List all trips for a user |
| POST | `/api/trips` | Create a new trip |
| GET | `/api/trips/:id` | Get full trip details |
| PUT | `/api/trips/:id` | Update a trip |
| DELETE | `/api/trips/:id` | Delete a trip |

### Database Schema

```sql
users
  id         SERIAL PRIMARY KEY
  name       TEXT NOT NULL
  email      TEXT NOT NULL UNIQUE
  created_at TIMESTAMPTZ DEFAULT NOW()

trips
  id                 SERIAL PRIMARY KEY
  user_id            INTEGER REFERENCES users(id) ON DELETE CASCADE
  title              TEXT NOT NULL
  destination        TEXT NOT NULL
  start_date         TEXT NOT NULL
  short_description  TEXT NOT NULL          -- max 80 characters
  detail_description TEXT NOT NULL DEFAULT ''
  created_at         TIMESTAMPTZ DEFAULT NOW()
```

---

## Running the Application

### With Docker (recommended)

Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
docker compose up --build
```

The app is available at **http://localhost:3000**.
PostgreSQL data is persisted in a Docker named volume (`postgres_data`).

```bash
docker compose down        # stop (data kept)
docker compose down -v     # stop and delete database
```

### Local Development

Requires Node.js 22+ and a running PostgreSQL instance.

```bash
# 1. Start only the database
docker compose up postgres -d

# 2. Install dependencies
npm install

# 3. Start the dev server with hot-reload
npm run dev
```

The app is available at **http://localhost:3000**.

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/travelmanager` | PostgreSQL connection string |
| `NITRO_HOST` | — | Set to `0.0.0.0` inside Docker to accept external connections |

Copy `.env.example` to `.env` to override defaults locally.

---

## User Stories Implemented

- **Register / Login** — identify by email address; no password required
- **Create Trip** — title, destination, start date, short description (max 80 chars), detailed description
- **View Trips** — list of all trips for the logged-in user (title + date)
- **Trip Detail** — full view of all trip fields
- **Edit Trip** — inline edit form on the detail page
- **Delete Trip** — with confirmation prompt