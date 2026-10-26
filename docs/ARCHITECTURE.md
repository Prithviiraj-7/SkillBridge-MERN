# SkillBridge Architecture & Development Guide

Technical architecture, data flows, core design decisions, and testing strategy for the SkillBridge platform.

---

## 1. System Overview

SkillBridge is built as a decoupled full-stack JavaScript application following the MERN stack paradigm with a strict REST-based architecture (no WebSockets/Socket.IO):

```
┌────────────────────────────────────────────────────────┐
│                   React 18 SPA (Vite)                  │
│       Tailwind CSS v3 · React Router v6 · Axios        │
│                Port: 5173  (Proxy: /api)               │
└───────────────────────────┬────────────────────────────┘
                            │
              HTTP / REST (JSON + JWT Bearer)
                            │
┌───────────────────────────▼────────────────────────────┐
│                  Express.js Backend                    │
│   Auth Middleware · Express Validator · Central Error   │
│                       Port: 5000                       │
└───────────────────────────┬────────────────────────────┘
                            │
               Mongoose ODM 8.x (BSON / TLS)
                            │
┌───────────────────────────▼────────────────────────────┐
│          MongoDB (Atlas Cluster / In-Memory)           │
│   Users · Requests · Conversations · Messages Colls.   │
└────────────────────────────────────────────────────────┘
```

---

## 2. Directory Structure

The project is segregated into two clean main folders: `frontend` and `backend`, coordinated from the project root.

```
SKillBridge/
├── backend/                       # Node.js + Express backend service
│   ├── src/
│   │   ├── config/                # Database connection, env validator
│   │   │   ├── db.js              # MongoDB Atlas connection + Windows DNS fallback
│   │   │   └── validateEnv.js     # Validates required env vars on startup
│   │   ├── controllers/           # Request/response handlers
│   │   │   ├── authController.js
│   │   │   ├── userController.js
│   │   │   ├── requestController.js
│   │   │   └── conversationController.js
│   │   ├── middleware/            # Custom express middlewares
│   │   │   ├── auth.js            # JWT verification & req.user attachment
│   │   │   └── validator.js       # express-validator result formatter
│   │   ├── models/                # Mongoose schemas & business logic
│   │   │   ├── User.js
│   │   │   ├── Request.js
│   │   │   ├── Conversation.js
│   │   │   └── Message.js
│   │   ├── routes/                # Express router mounts
│   │   ├── app.js                 # Express app assembly, CORS, routes & 404/500 handlers
│   │   └── index.js               # Server bootstrap, graceful shutdown
│   ├── tests/                     # 7 automated Jest test suites
│   │   ├── setup.js               # mongodb-memory-server lifecycle hooks
│   │   ├── health.test.js
│   │   ├── auth.test.js
│   │   ├── user.test.js
│   │   ├── discovery.test.js
│   │   ├── request.test.js
│   │   ├── messaging.test.js
│   │   └── e2eJourney.test.js     # 10-step full journey integration test
│   └── package.json               # Backend dependencies & Jest configuration
│
├── frontend/                      # React 18 single-page application
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js          # Axios instance with auth interceptor & error normalization
│   │   ├── components/
│   │   │   └── common/
│   │   │       ├── Avatar.jsx     # Initials-based SVG fallback avatar
│   │   │       ├── Badge.jsx      # Skill & status badge chips
│   │   │       ├── Navbar.jsx     # Responsive nav with active routes & auth badge
│   │   │       └── ProtectedRoute.jsx # Route guard redirecting to /login
│   │   ├── context/
│   │   │   └── AuthContext.jsx    # User state, token persistence, login/logout handlers
│   │   ├── pages/
│   │   │   ├── Home.jsx           # Landing page with value proposition
│   │   │   ├── Login.jsx          # Login form with client validation
│   │   │   ├── Register.jsx       # Registration with role selection
│   │   │   ├── Discover.jsx       # Search & filter peers, exchange request modal
│   │   │   ├── Profile.jsx        # View & edit own profile, add/remove skill tags
│   │   │   ├── Requests.jsx       # Sent/Received request tabs with Accept/Decline/Cancel
│   │   │   └── Messages.jsx       # Active conversations, REST polling & message history
│   │   ├── test/                  # 5 Vitest + Testing Library test suites
│   │   ├── App.jsx                # Router configuration & Layout
│   │   ├── main.jsx               # React DOM entry point
│   │   └── index.css              # Tailwind CSS directives
│   ├── vite.config.js             # Vite strictPort 5173 + /api proxy config
│   ├── tailwind.config.js
│   └── package.json               # Frontend dependencies & Vitest configuration
│
├── docs/                          # Developer & API documentation
│   ├── API.md                     # Exhaustive REST API reference
│   └── ARCHITECTURE.md            # System architecture guide
├── .env                           # Secret environment variables (git-ignored)
├── .env.example                   # Sanitized configuration template
├── .gitignore                     # Git ignore rules
└── package.json                   # Root workspace scripts & concurrency runners
```

---

## 3. Communication & Data Flow

### Request Flow
1. **Frontend Request:** The browser issues requests through Axios (`frontend/src/api/client.js`). During local development, requests to `/api/*` are intercepted by Vite's proxy (`http://localhost:5173/api`) and forwarded to Express at `http://localhost:5000/api`.
2. **Authorization Interceptor:** If a JWT exists in `localStorage`, the Axios request interceptor attaches `Authorization: Bearer <token>`.
3. **CORS:** Configured in `backend/src/app.js` using `process.env.CLIENT_URL` and `http://localhost:5173`.
4. **Auth Middleware:** `protect` middleware verifies the JWT against `JWT_SECRET` via `jsonwebtoken`. If valid, it retrieves the user document from MongoDB (excluding password) and attaches it to `req.user`.
5. **Validation Middleware:** `validate` checks input fields using `express-validator`. If validation fails, it stops execution and immediately responds with a structured `400 Bad Request`.
6. **Controller Layer:** Business logic executes, communicating with MongoDB via Mongoose models.
7. **Response / Error:** Standard JSON response is sent. Any unhandled error bubbles to the centralized error handler in `app.js`.

---

## 4. Key Subsystem Architectures

### 4.1 Authentication & Security
- **Passwords:** Salted and hashed using `bcryptjs` with 10 salt rounds before saving via Mongoose pre-save hook.
- **Passwords Projection:** `password` has `select: false` on the User schema, preventing it from ever being accidentally serialized or returned in queries.
- **JWT Lifespan:** Default `7d`. Signed with HMAC-SHA256.
- **Protected Profile Fields:** The general profile update endpoint whitelists updateable fields (`name`, `bio`, `location`, `avatar`, `role`, `skillsToTeach`, `skillsToLearn`, `availability`). Attempts to modify `email`, `password`, or `_id` are safely ignored.

### 4.2 Flexible Peer-to-Peer Philosophy
SkillBridge rejects rigid teacher/learner divides:
- Any user can teach skills, learn skills, or do both.
- Skills are stored as clean, free-form strings (`[String]`).
- On saving, skills are normalized (trimmed, de-duplicated case-insensitively).
- No credits, points, or mandatory reciprocity: users can request to learn without offering a skill in return.

### 4.3 Skill Discovery & Search
The `/api/users` discovery engine features:
- **Substring Case-Insensitive Matching:** Uses regex matching for `teach`, `learn`, `location`, and broad `search`.
- **ReDoS Safety:** All search terms are sanitized with a regex character escaper (`term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')`) before query construction.
- **Self-Exclusion:** The querying user is excluded from search results by default (`_id: { $ne: req.user._id }`), with an optional `excludeMe=false` parameter.
- **Pagination:** Uses Mongoose `.skip()` and `.limit()` with validated boundaries (`limit` capped at 50).

### 4.4 Exchange Requests Finite State Machine
Skill exchange requests enforce a strict lifecycle state machine:
```
           ┌──────────┐
           │ PENDING  │
           └────┬─────┘
                │
     ┌──────────┼──────────┐
     │          │          │
 (Recipient) (Recipient) (Sender)
     │          │          │
     ▼          ▼          ▼
┌──────────┐ ┌──────────┐ ┌───────────┐
│ ACCEPTED │ │ DECLINED │ │ CANCELLED │
└──────────┘ └──────────┘ └───────────┘
```
- **Rules:**
  - Only the recipient can accept or decline.
  - Only the sender can cancel.
  - Users cannot send requests to themselves.
  - Terminal states are irreversible: once accepted, declined, or cancelled, status cannot be mutated.
  - Atomic updates with concurrency checks prevent race conditions.

### 4.5 REST-Based Messaging
Messaging is implemented with standard REST endpoints (no WebSocket dependencies):
- **Access Rule:** Requires an `accepted` skill exchange request to create a conversation.
- **Idempotency:** Requesting conversation creation for an existing accepted exchange returns the existing conversation rather than duplicating records.
- **Participant Isolation:** Messages and conversations can only be read or written by the two participating users. Any other user receives `403 Forbidden`.
- **Read Receipts:** Messages have `readAt: Date | null`. The `PATCH /api/conversations/:id/read` endpoint marks incoming messages with the current timestamp.
- **Frontend Polling:** `Messages.jsx` polls every 5 seconds for fresh messages. Polling cleanly clears its timer on unmount and preserves unsent message drafts.

---

## 5. Testing Architecture

### 5.1 Backend Isolation (`mongodb-memory-server`)
Automated tests **never** connect to or mutate the real MongoDB Atlas database.
- `backend/tests/setup.js` initializes `MongoMemoryServer` before tests run and disconnects after completion.
- Each test suite exercises actual HTTP routes via `supertest`, validating authentication, status codes, input boundaries, and database state.

### 5.2 Frontend Component & E2E Testing
- Powered by `vitest` and `@testing-library/react`.
- Runs with `jsdom` environment.
- Mocked Axios client enables realistic API simulation.
- `frontend/src/test/e2eJourney.test.jsx` simulates the entire 10-step user journey: Login -> Discover -> Send Request -> View Requests -> Accept -> Messaging -> Logout.

---

## 6. Extending the Codebase

### Adding a New Model & Route
1. **Create Model:** Add `backend/src/models/YourModel.js`.
2. **Create Controller:** Add handler methods in `backend/src/controllers/yourController.js`.
3. **Define Routes & Validators:** Add `backend/src/routes/yourRoutes.js` using `express-validator` and `protect` middleware.
4. **Mount in Express:** Mount in `backend/src/app.js` (`app.use('/api/your-endpoint', yourRoutes)`).
5. **Add Automated Tests:** Create `backend/tests/yourFeature.test.js` exercising success and failure paths with `supertest`.
6. **Integrate in Frontend:** Add API calls to `frontend/src/api/client.js` and build the corresponding React views in `frontend/src/pages/`.
