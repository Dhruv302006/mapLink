# MapLink - Real-Time Geospatial Tracking Platform

MapLink is a production-grade, decoupled real-time tracking application. It allows users to create private room sessions, invite friends via sharing links, and track each other's live movements on a dark-themed Leaflet map. 

The application is built using a **decoupled, containerized architecture**: a React Single Page Application (Vite) served via Nginx on the frontend, and an Express REST API & Socket.io server mapped to a PostgreSQL spatial database (with PostGIS extension) and a Redis write-behind cache on the backend.

---

## 🛠️ Architecture & Technology Stack

```text
MapLink Workspace
├── backend/            (MVC Architecture)
│   ├── config/         (PostgreSQL & Redis Connections)
│   ├── middleware/     (Request guards, JWT Verification)
│   ├── controllers/    (REST endpoint logical handlers)
│   ├── routes/         (Express REST mounts)
│   ├── sockets/        (Socket.io events + Redis Write-Behind scheduler)
│   └── Dockerfile      (Node.js Production Container)
├── frontend/           (React Single Page Application)
│   ├── tailwind.config (Tailwind v4 configurations)
│   ├── nginx.conf      (SPA redirection and compression config)
│   ├── src/
│   │   ├── context/    (AuthContext global session persistence)
│   │   ├── components/ (Landing page lobby, map rendering overlays)
│   │   └── utils/      (Geodetic distance calculators)
│   └── Dockerfile      (Multi-stage build served via Nginx)
├── docker-compose.yml  (Multi-container dev/prod orchestrator)
└── .github/workflows/  (GitHub Actions CI workflows)
```

### Backend (Model-View-Controller & Cache)
* **Node.js & Express:** Configured as a stateless REST API for handling user profile management, session verification, and room telemetry histories.
* **Socket.io (WebSockets):** Establishes bi-directional communication channels. Implements isolated **Socket Namespaces (Rooms)** so coordinates are strictly broadcast within relevant room channels.
* **PostgreSQL + PostGIS:** The database layer for geospatial data. Stored coordinates are projected natively onto geographic coordinate systems (`GEOMETRY(Point, 4326)`).
* **Redis Caching (Write-Behind Cache Pattern):** Used as an in-memory key-value store to queue incoming coordinates in real-time. Prevents PostgreSQL write bottlenecks by batching writes and performing single-transaction inserts.
* **JWT & Bcrypt:** Local user credentials are encrypted using `bcryptjs` (10 rounds). Session tokens are signed using `jsonwebtoken` to secure API routes and block unauthenticated WebSocket handshakes.
* **Google Identity Services (GSI):** Integrates Google OAuth client verification on the backend using `google-auth-library` to inspect Google signatures and securely authenticate OAuth logins.

### Frontend (React & Tailwind CSS)
* **React (Vite) & React Router:** Fast single-page application router supporting route guards (`ProtectedRoute`) to prevent unauthorized access.
* **Tailwind CSS v4:** Styled using glassmorphic UI widgets, clean color palettes, custom scrollbars, and pulsing online status badges.
* **Leaflet Maps:** Utilizes Leaflet's canvas-based circle markers (`L.circleMarker`) to draw paths. Avoids bundler asset-resolution issues and renders custom colors dynamically based on Socket IDs.
* **Telemetry Throttling Optimization:** Client browser uses the **Haversine Formula** to compute geodetic displacement. The client only transmits coordinates to the backend if the user moves **at least 5 meters** and at least **3 seconds** have passed, protecting database write capacity and saving device battery.

---

## 🚀 Performance Optimizations & Security

1. **Redis Write-Behind Caching:** Coordinates are pushed to a Redis list (`room:path:logs:<roomId>`) instantly. A background interval timer pops these logs every **15 seconds** and performs a single bulk insert in PostgreSQL in one transaction. This cuts primary database transactions by over **80%**.
2. **Database Connection Pooling (`pg.Pool`):** Reuses database connections to handle concurrent operations.
3. **PostgreSQL Spatial Indexing (GiST):** Created a GiST index on the `geom` coordinates column (`locations_geom_idx`) to optimize proximity and geographic search speeds.
4. **Database Composite Indexing:** Added an index on `(room_id, created_at)` (`locations_room_time_idx`), resulting in near-instant chronological route history retrieval when a client joins a room.
5. **WebSocket Handshake Guard:** Added verification middleware in Socket.io. Sockets must pass a valid JWT during the handshake, preventing anonymous clients from establishing links.

---

## ⚙️ Configuration & Environment Setup

Create a `.env` file inside the `backend/` directory for local development:

```env
# backend/.env
DATABASE_URL="postgresql://postgres:dhruvthakur123@localhost:5432/Trackerdb"
PORT=3000
JWT_SECRET="your_strong_jwt_session_secret"
GOOGLE_CLIENT_ID="205337054231-2c7o6m7nooknr5jveifhmd8jlq75ma8d.apps.googleusercontent.com"
REDIS_URL="redis://localhost:6379"
```

---

## 🐳 Docker Deployment (Recommended)

You can run the entire multi-container stack (Frontend, Backend, PostgreSQL + PostGIS, Redis) locally with a single command. Docker Compose will automatically configure the networks, volumes, and inject the environment variables.

### Start the Stack:
```bash
docker compose up --build
```

* The React Frontend (served via Nginx) will listen on **`http://localhost:80`**
* The Express REST API & Websockets will run on **`http://localhost:3000`**
* PostgreSQL will run on **`http://localhost:5432`**
* Redis will run on **`http://localhost:6379`**

### Stop the Stack:
```bash
docker compose down
```

---

## 🏃 Local Manual Setup (Without Docker)

### 1. Prerequisites
* **Node.js** installed on your system.
* **PostgreSQL** running locally with the **PostGIS** spatial extension bundle.
* **Redis** running locally on port 6379.
* Create a database named `Trackerdb`:
  ```sql
  CREATE DATABASE Trackerdb;
  ```

### 2. Install Dependencies
Run the custom monorepo helper script at the workspace root to install all node modules for both the frontend and backend:
```bash
npm run install-all
```

### 3. Start Development Servers
Spin up both dev servers concurrently with a single command from the root directory:
```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 📃 Resume Highlights (Interviews Portfolio)

You can list this project on your resume as follows:

* **Engineered a decoupled, containerized real-time tracking application** using React, Express, Socket.io, PostgreSQL, and Redis.
* **Designed a Write-Behind Cache pattern using Redis List queues** to batch telemetry data, executing single-transaction database bulk inserts every 15 seconds to **reduce primary PostgreSQL transaction loads by over 80%**.
* **Implemented database spatial indexing (GiST)** and built-in migrations using PostGIS to store coordinates natively inside geographic point formats (`GEOMETRY(Point, 4326)`).
* **Containerized services using Docker Compose** to orchestrate independent containers for the database (PostGIS), memory cache (Redis), Node.js server, and React client (served via Nginx).
* **Architected a Continuous Integration (CI) pipeline** using GitHub Actions to run linters, verify React production compilations, and validate Docker builds on every push.
