# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

SHDL (Simple Hardware Description Language) is an educational platform for teaching digital hardware design. The system consists of a Node.js/Express backend with PostgreSQL database and a Vue 3 frontend, featuring real-time collaboration via WebSockets.

## Development Commands

### Backend (Node.js/Express + Prisma)

```bash
cd backend

# Start development server with auto-reload
npm run dev

# Create admin user (interactive CLI)
npm run create-admin

# Database operations
npx prisma migrate dev         # Create and apply migrations
npx prisma migrate deploy      # Apply migrations in production
npx prisma generate            # Generate Prisma Client after schema changes
npx prisma studio              # Open database GUI
```

### Frontend (Vue 3 + Vite)

```bash
cd frontend

# Start development server (typically runs on http://localhost:8080)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking only (no build)
npm run type-check
```

## Architecture Overview

### Technology Stack

**Backend:**
- Express.js with custom `@jcbuisson/express-x` framework (WebSocket + service layer)
- PostgreSQL database with Prisma ORM
- Socket.io for real-time bidirectional communication
- JWT authentication (RS256) with bcryptjs
- Node.js ES modules (package.json `"type": "module"`)

**Frontend:**
- Vue 3 with Composition API (`<script setup>`)
- Vuetify 3 for UI components
- RxJS for reactive state management with observables
- Socket.io client via custom wrapper (`@jcbuisson/express-x-client`)
- ACE Editor and CodeMirror 6 for code editing
- D3.js for visualizations
- Vite build system with TypeScript support

### Directory Structure

```
shdl/
├── backend/
│   ├── src/
│   │   ├── app.js                    # Express app entry point
│   │   ├── server.mjs                # WebSocket server + hooks system
│   │   ├── channels.js               # Pub/sub channel configuration
│   │   ├── services/
│   │   │   ├── database/             # CRUD services (one per model)
│   │   │   └── custom/               # Business logic services
│   │   │       ├── auth/             # Authentication (signin, signup, session)
│   │   │       ├── mail/             # Email sending
│   │   │       └── file-upload/      # File uploads
│   │   └── lib/                      # Utilities and helpers
│   ├── prisma/
│   │   └── schema.prisma             # Database schema
│   ├── config/
│   │   └── index.mjs                 # Environment configuration
│   └── scripts/
│       └── create-admin.js           # Admin user creation utility
│
└── frontend/
    ├── src/
    │   ├── main.js                   # Vue app entry point
    │   ├── App.vue                   # Root component
    │   ├── client.mjs                # WebSocket client wrapper
    │   ├── client-app.js             # Client app initialization
    │   ├── router/
    │   │   └── index.js              # Vue Router configuration
    │   ├── views/                    # Page components (25 views)
    │   │   ├── login/                # Authentication flows
    │   │   ├── users/                # User management (admin)
    │   │   ├── groups/               # Group management (admin)
    │   │   ├── workshop/             # SHDL/text editor (main workspace)
    │   │   ├── followup/             # Student progress tracking (teacher)
    │   │   └── shdl_tests/           # Test definition (admin)
    │   ├── components/               # Reusable Vue components
    │   │   ├── EditSHDLDocument.vue  # SHDL code editor
    │   │   └── SHDLSimulator.vue     # SHDL simulator
    │   ├── lib/
    │   │   ├── businessObservables.ts # RxJS observables for data streams
    │   │   └── shdl/                 # SHDL language implementation
    │   │       ├── shdlPegParser.js  # PEG-based parser (generated)
    │   │       ├── shdlSyntax.ts     # Syntax validation
    │   │       ├── shdlAnalyzer.ts   # Semantic analysis
    │   │       └── shdlUtilities.js  # Helper functions
    │   └── use/                      # Vue composables
    │       ├── useModel.ts           # Generic model CRUD
    │       ├── useAuthentication.js  # Auth state management
    │       └── useAppState.js        # Global app state
    └── vite.config.js                # Vite build configuration
```

## Backend Architecture

### Service Pattern (express-x framework)

Services are registered with `app.createService(name, methods)`. Each service method can have before/after hooks for cross-cutting concerns (auth, logging, validation).

**Service Flow:**
1. Client sends `client-request` via WebSocket: `{uid, name, action, args}`
2. Server executes before hooks → method → after hooks
3. Server publishes result to pub/sub channels
4. Connected clients receive `service-event` with updated data

**Example service structure:**
```javascript
// backend/src/services/database/user/user.service.js
app.createService('user', {
  findUnique: async (args) => { /* ... */ },
  findMany: async (args) => { /* ... */ },
  createWithMeta: async (args) => { /* ... */ },
  updateWithMeta: async (args) => { /* ... */ },
  deleteWithMeta: async (args) => { /* ... */ },
})
```

### Database Models (Prisma)

Key entities in `backend/prisma/schema.prisma`:

- **User**: Core user entity (email, password, firstname, lastname, pict, notes)
- **Tab**: Access control tabs (users, groups, shdl_tests, craps_tests, followup, workshop)
- **UserTabRelation**: Maps users to tabs (role-based access)
- **Group**: Student groups/classes
- **UserGroupRelation**: Many-to-many user-group membership
- **GroupSlot**: Time slots for group lessons/workshops
- **UserDocument**: SHDL/CRAPS/text documents created by users
- **UserDocumentEvent**: Audit trail (create, edit, delete, pass_test events)
- **SHDLTest**: Test definitions with test statements and memory contents
- **UserSHDLTestRelation**: Tracks student test attempts with dates and scores
- **Metadata**: Generic audit table (created_at, updated_at, deleted_at) for all entities

All database operations wrap model + metadata updates in a transaction. Use `createWithMeta`, `updateWithMeta`, `deleteWithMeta` instead of direct Prisma calls.

### Pub/Sub Channels (`backend/src/channels.js`)

- Teachers see only their own updates: `[socket.id]`
- Students' updates broadcast to themselves + all teachers: `[socket.id, 'teachers']`

This enables real-time student monitoring by teachers.

## Frontend Architecture

### Reactive State with RxJS Observables

The application uses RxJS observables for all data streams, defined in `frontend/src/lib/businessObservables.ts`:

```typescript
// Example: Stream of users matching a filter
const users$ = (filter) => service$('user', 'findMany', { filter })

// Example: Stream of user's group memberships
const userGroups$ = (user_uid) => service$('user_group_relation', 'findMany', {
  filter: { user_uid }
})
```

**Key Observable Patterns:**
- `switchMap` for cascading queries (cancel previous when new data arrives)
- `combineLatest` to wait for multiple streams
- `map`, `filter`, `tap` for transformations
- `catchError` for error handling
- `scan` for accumulating state over time

### Vue Composables (`frontend/src/use/*`)

Composables wrap service calls and observables for use in Vue components:

- `useModel.ts`: Generic CRUD operations for any model
- `useAuthentication.js`: Auth state (signedinUser$, isTeacher$, userTabs$)
- `useAppState.js`: Global state (connection status, session expiration)
- `useWebsocket.js`: WebSocket connection management

**Usage in components:**
```vue
<script setup>
import { useModel } from '@/use/useModel'

const { items: users, create, update, remove } = useModel('user', {
  filter: { /* ... */ }
})
</script>
```

### WebSocket Client (`frontend/src/client.mjs`)

The client wraps Socket.io with a Promise-based API:

```javascript
import app from '@/client-app'

// Call service method (returns Promise)
const users = await app.service('user').findMany({ filter: {} })

// Subscribe to real-time events
app.service('user').on('createWithMeta', (user) => {
  console.log('New user created:', user)
})
```

### Router Structure

Routes are defined in `frontend/src/router/index.js`:

- `/login` - Authentication
- `/home/:signedinUid` - Main app with tabs:
  - `users` - User management (admin only)
  - `groups` - Group management (admin only)
  - `workshop` - SHDL/text editor (students & teachers)
  - `followup` - Student progress tracking (teachers only)
  - `shdl_tests` - Test management (admin only)

Access is controlled by `UserTabRelation` (which tabs a user can see).

## SHDL Language Implementation

SHDL is a hardware description language for defining digital circuits. The implementation is in `frontend/src/lib/shdl/`:

### Key Components

1. **Parser** (`shdlPegParser.js`): PEG-based parser that converts SHDL text into AST
2. **Syntax Checker** (`shdlSyntax.ts`): Validates module structure, parameters, signal usage
3. **Analyzer** (`shdlAnalyzer.ts`): Performs semantic analysis:
   - Groups electrically connected signals (equipotentials)
   - Infers signal types (input/output/internal)
   - Processes module hierarchy (deepest modules first)
   - Detects unused signals and undefined references
4. **Test Parser** (`shdl_test_line_parser.js`): Parses test statements (e.g., "set rst 1", "check a 0")
5. **Utilities** (`shdlUtilities.js`): Helper functions for arity, equipotentials, formulas

### Common SHDL Operations

**Parsing:**
```javascript
import shdlParser from '@/lib/shdl/shdlPegParser'

try {
  const ast = shdlParser.parse(shdlCode)
} catch (error) {
  console.error('Parse error:', error.location)
}
```

**Analysis:**
```javascript
import { analyzeModule } from '@/lib/shdl/shdlAnalyzer'

const { equipotentials, errors } = analyzeModule(ast, submodules)
```

## Authentication & Session Management

### JWT Token Flow

1. User signs in via `app.service('auth').signin({ email, password })`
2. Backend validates credentials and returns JWT token
3. Frontend stores token in sessionStorage
4. Token is included in WebSocket handshake for authenticated connections
5. Every user action calls `app.service('auth').extendExpiration()` to keep session alive
6. Session expires after inactivity (default: 1 hour)

### JWT Key Generation

The backend uses RS256 (RSA) for JWT signing:

```bash
# Generate private key
openssl genpkey -algorithm RSA -out private.pem

# Extract public key
openssl rsa -pubout -in private.pem -out public.pem
```

Store paths in backend `.env`:
```
JWT_PRIVATE_KEY_PATH=./private.pem
JWT_PUBLIC_KEY_PATH=./public.pem
```

## Key Domain Workflows

### Student Workflow
1. Student signs in and navigates to workshop tab
2. Creates/edits SHDL module documents
3. Runs SHDL simulator to test design
4. Submits module for test validation
5. Test results tracked in `UserSHDLTestRelation`

### Teacher Workflow
1. Teacher creates SHDL module templates (documents)
2. Defines tests with test statements (`SHDLTest`)
3. Assigns tests to group time slots (`GroupSlotSHDLTestRelation`)
4. Monitors student progress in followup tab
5. Reviews student activity via `UserDocumentEvent` and test results

### Admin Workflow
1. Manages users (create, update, delete)
2. Manages groups and group memberships
3. Assigns tabs to users (role-based access)
4. Manages SHDL and CRAPS test definitions

## Observable-Based Real-Time Updates

The README.md mentions the importance of observables for real-time updates:

> "La méthode habituelle consisterait à faire un fetch du document racine, en faire l'analyse syntaxique, puis réitérer le processus avec les sous-modules. Cette méthode ne serait pas temps réel..."

Instead, the system uses RxJS observables that emit new values whenever data changes:

- Avoid using Promises inside observables (noted in README)
- Observables emit partial results with errors like "sous-module X indisponible" until all submodules are available
- Eventually emits complete structure when all dependencies are resolved

## Database Operations

### Prisma Client Usage

Always use Prisma client via `app.db` (initialized in `backend/src/app.js`):

```javascript
// In services
const users = await app.db.user.findMany({
  where: { email: { contains: '@example.com' } },
  include: { user_tab_relations: true }
})
```

### Metadata Pattern

All entities have associated metadata (created_at, updated_at, deleted_at). Always use service methods that handle metadata:

```javascript
// GOOD: Handles metadata automatically
await app.service('user').createWithMeta({
  data: { email, password, firstname, lastname }
})

// BAD: Bypasses metadata tracking
await app.db.user.create({ data: { email, password } })
```

## Testing & Validation

### SHDL Test System

Tests are defined in `SHDLTest` table:
- **test_statement**: Test assertions (e.g., "set a 1; check b 0")
- **mem_content**: Initial memory state for RAM-based designs

Tests are assigned to group slots, and student attempts are tracked with:
- `first_try_date`: When student first attempted
- `last_try_date`: Most recent attempt
- `success_date`: When student passed the test
- `evaluation`: Numeric score

## Common Pitfalls

1. **Don't use Promises in observables**: Use RxJS operators (`switchMap`, `mergeMap`) instead
2. **Always update metadata**: Use `createWithMeta`, `updateWithMeta`, `deleteWithMeta`
3. **Handle partial observable emissions**: SHDL analysis emits partial results with errors until complete
4. **Session expiration**: Call `app.service('auth').extendExpiration()` on user interactions
5. **Pub/sub channels**: Student updates must broadcast to teachers channel for monitoring
6. **Vector indices**: SHDL vectors must have decreasing indices (e.g., `a[7:0]`, not `a[0:7]`)

## Configuration

### Backend Configuration

Environment variables in `backend/.env`:
- `DATABASE_URL`: PostgreSQL connection string
- `PORT`: Backend server port (default: 3000)
- `JWT_PRIVATE_KEY_PATH`: Path to RSA private key
- `JWT_PUBLIC_KEY_PATH`: Path to RSA public key
- `SMTP_*`: Email configuration (SendGrid)
- `SESSION_EXPIRATION`: Session timeout in seconds

### Frontend Configuration

Environment variables in `frontend/.env`:
- `VITE_BACKEND_URL`: Backend WebSocket URL (e.g., `http://localhost:3000`)

## Additional Notes

- The codebase uses a mix of JavaScript (`.js`, `.mjs`) and TypeScript (`.ts`)
- Backend uses ES modules (`package.json` has `"type": "module"`)
- Frontend uses Vite's build system with TypeScript support
- The system is designed for educational use at ENSEEIHT (University of Toulouse)
- SHDL syntax is French-influenced (e.g., "fin module" instead of "end module")
