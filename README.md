# SHDL

SHDL is an educational web platform for teaching digital hardware design and low-level programming. It lets students write, test, and simulate SHDL hardware modules and CRAPS assembly programs from a browser, while teachers can organize groups, assign tests, and follow student progress in real time.

The project is split into a Vue 3 frontend and a Node.js backend backed by PostgreSQL. Client data is synchronized through WebSockets and cached locally in IndexedDB so the application can keep a responsive offline-first workflow.

## Main Features

- SHDL document editor with parsing, syntax checks, semantic analysis, and simulation.
- CRAPS assembly editor and simulator for an educational SPARC-inspired 32-bit processor.
- Test definitions for SHDL and CRAPS exercises.
- Student test tracking with attempts, success dates, update counts, and teacher evaluations.
- User, group, lesson slot, and access-tab management.
- Teacher follow-up views for workshop activity, attendance, and grades.
- Real-time updates through Socket.io and the `express-x` service layer.

## Technology Stack

Backend:

- Node.js with ES modules.
- `@jcbuisson/express-x` for WebSocket services.
- PostgreSQL with Drizzle ORM.
- Socket.io for real-time communication.
- JWT authentication and bcrypt password hashing.

Frontend:

- Vue 3 with the Composition API.
- Vite and Vuetify 3.
- RxJS observables for reactive data flows.
- `@jcbuisson/express-x-client` with IndexedDB offline cache.
- Ace Editor for SHDL and CRAPS source editing.
- D3 for activity visualizations.
- Vite PWA service worker support.

## Repository Layout

```text
.
├── backend/      Node.js backend, services, database schema, scripts
├── frontend/     Vue application, routes, views, composables, simulators
└── synthesis/    Command-line SHDL synthesis tooling
```

Important frontend areas:

- `frontend/src/views/workshop/`: student document workspace and simulators.
- `frontend/src/views/followup/`: teacher follow-up, attendance, and grading views.
- `frontend/src/views/tests/`: test creation and management.
- `frontend/src/lib/shdl/`: SHDL parser, syntax checks, analyzer, and utilities.
- `frontend/src/lib/craps/`: CRAPS parser and checker.
- `frontend/src/use/`: data access composables and business observables.

Important backend areas:

- `backend/src/db/schema.js`: database schema.
- `backend/src/services/database/`: CRUD services for persisted models.
- `backend/src/services/custom/auth/`: authentication and session handling.
- `backend/src/channels.js`: WebSocket publication channels.
- `backend/scripts/create-admin.js`: admin account creation helper.

## Development

Install dependencies separately for the backend and frontend:

```bash
cd backend
npm install

cd ../frontend
npm install
```

The backend reads configuration from `.env` through `node --env-file=.env`. Key variables include:

- `PORT`
- `DATABASE_URL`
- `CLIENT_URL`
- `SESSION_EXPIRE_DELAY`
- `JWT_PRIVATE_KEY`
- mail settings used by password and account flows
- avatar upload/static file paths

Start the backend:

```bash
cd backend
npm run dev
```

Start the frontend:

```bash
cd frontend
npm run dev
```

In development, Vite serves the frontend on port `8080` and proxies `/shdl-socket-io/` and `/static/` requests to the backend, typically running on port `3000`.

## Database

Database access is defined with Drizzle. The backend exposes one service per model and stores audit metadata such as creation, update, and deletion timestamps in a shared `metadata` table.

Useful backend commands:

```bash
cd backend
npm run db:generate
npm run db:push
npm run db:studio
npm run create-admin
```

## Frontend Commands

```bash
cd frontend
npm run dev
npm run build
npm run preview
npm run type-check
```

## License

The backend package declares the project license as AGPL version 3.0.
