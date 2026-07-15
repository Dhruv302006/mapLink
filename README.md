# MapLink - Real-Time Geospatial Tracking Platform

MapLink is a production-grade, decoupled real-time tracking application. It allows users to create private room sessions, invite friends via sharing links, and track each other's live movements on a dark-themed Leaflet map. 

The application is built using a **decoupled architecture**: a React Single Page Application (Vite) styled with Tailwind CSS on the frontend, and an Express REST API & Socket.io server mapped to a PostgreSQL spatial database (with PostGIS extension) on the backend.

---

## 🛠️ Architecture & Technology Stack

```text
MapLink Workspace
├── backend/            (MVC Architecture)
│   ├── config/         (Postgres Connection Pools & Migrations)
│   ├── middleware/     (Request guards, JWT Verification)
│   ├── controllers/    (Local Signup, local Login, Google Token Verification, Room check)
│   ├── routes/         (Express REST mounts)
│   └── sockets/        (Socket.io token authentication & connection namespaces)
└── frontend/           (React Single Page Application)
    ├── tailwind.config (Tailwind v4 theme configurations)
    └── src/
        ├── context/    (AuthContext global session persistence)
        ├── components/ (Landing page lobby, map canvas rendering overlays)
        └── utils/      (Geodetic distance calculators)
```

### Backend (Model-View-Controller)
* **Node.js & Express:** Configured as a stateless REST API for handling user profile management, session verification, and room telemetry histories.
* **Socket.io (WebSockets):** Establishes bi-directional communication channels. Implements isolated **Socket Namespaces (Rooms)** so coordinates are strictly broadcast within relevant room channels.
* **PostgreSQL + PostGIS:** The industry-standard database layer for geospatial data. Stored coordinates are projected natively onto geographic coordinate systems (`GEOMETRY(Point, 4326)`) representing the standard WGS 84 GPS standard.
* **JWT (JsonWebTokens) & Bcrypt:** Local user credentials are encrypted using `bcryptjs` with 10 salt rounds. Session tokens are signed using `jsonwebtoken` to secure API routes and block unauthenticated WebSocket handshakes.
* **Google Identity Services (GSI):** Integrates Google OAuth client verification on the backend using `google-auth-library` to inspect Google signatures and securely authenticate OAuth logins.

### Frontend (React & Tailwind CSS)
* **React (Vite) & React Router:** Fast single-page application router supporting route guards (`ProtectedRoute`) to prevent unauthorized access.
* **Tailwind CSS v4:** Styled using glassmorphic UI widgets, clean color palettes, custom scrollbars, and pulsing online status badges.
* **Leaflet Maps:** Utilizes Leaflet's canvas-based circle markers (`L.circleMarker`) to draw paths. Avoids bundler asset-resolution issues and renders custom colors dynamically based on Socket IDs.
* **Telemetry Throttling Optimization:** Client browser uses the **Haversine Formula** to compute geodetic displacement. The client only transmits coordinates to the backend if the user moves **at least 5 meters** and at least **3 seconds** have passed, protecting database write capacity and saving device battery.

---

## 🚀 Performance Optimizations & Security

1. **Database Connection Pooling (`pg.Pool`):** Reuses idle DB sockets, drastically lowering connection establishment overhead during concurrent coordinate writes.
2. **PostgreSQL Spatial Indexing (GiST):** Created a GiST index on the `geom` coordinates column (`locations_geom_idx`) to optimize proximity and geographic search speeds.
3. **Database Composite Indexing:** Added an index on `(room_id, created_at)` (`locations_room_time_idx`), resulting in near-instant chronological route history retrieval when a client joins a room.
4. **WebSocket Handshake Guard:** Added verification middleware in Socket.io. Sockets must pass a valid JWT during the handshake, preventing anonymous clients from establishing links.
5. **Offline Path Retainage:** When a user goes offline, their map pin is deleted, but their route history polyline remains on the map drawn in a dashed style, providing a complete journey history.

---

## ⚙️ Configuration & Environment Setup

Create a `.env` file inside the `backend/` directory:

```env
# backend/.env
DATABASE_URL="postgresql://<user>:<password>@<host>:<port>/<db_name>"
PORT=3000
JWT_SECRET="your_strong_jwt_session_secret"
GOOGLE_CLIENT_ID="205337054231-2c7o6m7nooknr5jveifhmd8jlq75ma8d.apps.googleusercontent.com"
```

---

## 🏃 Local Setup & Running

### 1. Prerequisites
* **Node.js** installed on your system.
* **PostgreSQL** running locally with the **PostGIS** spatial extension bundle.
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

* The Express API will listen on `http://localhost:3000`
* The React client dev server will listen on `http://localhost:5173`

Open `http://localhost:5173` in your browser.

---

## 📃 Resume Highlights (Interviews Portfolio)

You can list this project on your resume as follows:

* **Designed and developed a decoupled real-time tracking application** using React, Express, Socket.io rooms isolation, and PostgreSQL.
* **Implemented database spatial indexing (GiST)** and built-in migrations using PostGIS to store coordinates natively inside geographic point formats (`GEOMETRY(Point, 4326)`).
* **Secured server REST API endpoints and Socket.io handshakes** using JSON Web Token (JWT) verification middlewares and Bcrypt password hashing.
* **Integrated official Google OAuth2 One-Tap Sign-In**, verifying client tokens via backend `google-auth-library` signatures.
* **Optimized telemetry network payload and device battery drain** by implementing client-side location throttling (using Haversine calculations to enforce 5-meter displacement and 3-second limits).
