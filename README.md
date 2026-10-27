# SkillBridge

SkillBridge is a modern, peer-to-peer skill exchange platform built with the MERN stack (MongoDB, Express, React, Node.js). It connects learners and mentors directly to share practical knowledge, collaborate, and trade skills freely—without mandatory barter, points, tokens, or rigid teacher/learner restrictions.

---

## Table of Contents
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Project Directory Structure](#project-directory-structure)
- [Installation & Local Setup](#installation--local-setup)
- [Environment Configuration](#environment-configuration)
- [MongoDB Atlas Setup Guide](#mongodb-atlas-setup-guide)
- [Running the Application](#running-the-application)
- [Testing](#testing)
- [Building for Production](#building-for-production)
- [Local URLs & Ports](#local-urls--ports)
- [Troubleshooting Common Issues](#troubleshooting-common-issues)
- [Documentation Links](#documentation-links)

---

## Features

- **Flexible Peer-to-Peer Model:** Anyone can teach, learn, or both. No mandatory reciprocity, tokens, or credit barter required.
- **JWT Authentication:** Secure user registration, login, session persistence, and bcrypt password hashing.
- **Customizable Profiles:** Update bio, location, role, availability, avatar URL, and free-form skill tags (`skillsToTeach` & `skillsToLearn`).
- **Skill Discovery & Multi-Filter Search:** Find peers by skills they teach or want to learn, role, and location with case-insensitive search and pagination.
- **Exchange Requests Lifecycle:** Send structured exchange requests with finite state transitions (`pending` -> `accepted`, `declined`, or `cancelled`).
- **REST-Based Direct Messaging:** Private direct messaging between peers unlocked upon an accepted exchange request, complete with unread indicators and read receipts.
- **Initials-Based Avatar Fallbacks:** Locally rendered SVG initials when avatar URLs are not supplied or fail to load.
- **100% Isolated Automated Testing:** Comprehensive test suites using an in-memory MongoDB server, preventing any mutations to live databases.

---

## Technology Stack

- **Frontend:**
  - React 18 (SPA)
  - Vite 6
  - Tailwind CSS v3
  - React Router v6
  - Axios (with authorization interceptors)
  - Lucide React (icons)
  - Vitest & React Testing Library (frontend tests)
- **Backend:**
  - Node.js (v18+)
  - Express.js
  - MongoDB Atlas & Mongoose ODM 8.x
  - JSON Web Tokens (`jsonwebtoken`)
  - `bcryptjs`
  - `express-validator`
  - Morgan (HTTP request logger)
  - Jest & Supertest (backend tests)
  - `mongodb-memory-server` (isolated test database)

---

## Prerequisites

Before running the project locally, ensure you have:
1. **Node.js** v18.0.0 or higher (`node -v`)
2. **npm** v9.0.0 or higher (`npm -v`)
3. A free **MongoDB Atlas** account (or a local MongoDB instance running on port 27017)

---

## Project Directory Structure

SkillBridge is organized into two primary segregated directories:

```
SKillBridge/
├── backend/                       # Express API, Mongoose models, controllers, tests
│   ├── src/                       # Application source code
│   ├── tests/                     # 7 automated Jest test suites
│   └── package.json               # Backend dependencies
├── frontend/                      # React SPA with Vite and Tailwind CSS
│   ├── src/                       # Components, pages, context, styles
│   ├── dist/                      # Production build output
│   ├── vite.config.js             # Vite configuration & /api proxy
│   └── package.json               # Frontend dependencies
├── docs/                          # In-depth technical guides
│   ├── API.md                     # Complete REST API reference
│   └── ARCHITECTURE.md            # Architecture & development guide
├── .env                           # Root environment secrets (DO NOT COMMIT)
├── .env.example                   # Environment configuration template
├── .gitignore
└── package.json                   # Root orchestrator scripts
```

---

## Installation & Local Setup

1. **Clone or navigate to the repository directory:**
   ```bash
   cd SKillBridge
   ```

2. **Install all dependencies (root, backend, and frontend):**
   ```bash
   npm run install:all
   ```

   *Alternatively, install each workspace individually:*
   ```bash
   npm install
   npm --prefix backend install
   npm --prefix frontend install
   ```

---

## Environment Configuration

Copy the `.env.example` file at the project root to create your `.env` file:

```bash
cp .env.example .env
```

Open `.env` and fill in the values:

```env
# MongoDB connection string (see MongoDB Atlas setup below)
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-address>/skillbridge?retryWrites=true&w=majority

# Express Server Port
PORT=5000

# Environment Mode (development or production)
NODE_ENV=development

# JSON Web Token Secret (generate a strong random string)
JWT_SECRET=your_super_secret_jwt_key_here_change_in_production

# Token Lifespan
JWT_EXPIRES_IN=7d

# Allowed Frontend URL for CORS
CLIENT_URL=http://localhost:5173
```

> [!WARNING]
> Never commit `.env` or share your database credentials. `.env` is included in `.gitignore` by default.

---

## MongoDB Atlas Setup Guide

To connect SkillBridge to a free MongoDB Atlas cloud cluster:

1. **Create an Account & Cluster:**
   - Sign up at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas).
   - Create a free **M0 Sandbox** cluster.
2. **Create a Database User:**
   - In the Atlas sidebar, navigate to **Security** > **Database Access**.
   - Click **Add New Database User**.
   - Choose **Password Authentication**, create a username and strong password, and assign the `Read and write to any database` built-in role.
3. **Configure Network Access (Crucial):**
   - In the Atlas sidebar, navigate to **Security** > **Network Access**.
   - Click **Add IP Address**.
   - For local development, choose **Allow Access from Anywhere** (`0.0.0.0/0`) or add your current IP address.
   - Click **Confirm** and wait until the status displays **Active**.
4. **Obtain Connection String:**
   - In Atlas, go to **Database** > **Connect** > **Drivers** (Node.js).
   - Copy the connection string format:
     ```
     mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/skillbridge?retryWrites=true&w=majority
     ```
   - Replace `<username>` and `<password>` with your database user credentials and set the database name to `/skillbridge`.
   - Paste the result into your root `.env` as `MONGODB_URI`.

---

## Running the Application

### Development Mode (Both Frontend & Backend)
Run the root script to start both services concurrently with hot-reloading:
```bash
npm run dev
```

### Running Services Independently
- **Backend Only (Express + Nodemon on port 5000):**
  ```bash
  npm run dev:backend
  ```
- **Frontend Only (Vite Dev Server on port 5173):**
  ```bash
  npm run dev:frontend
  ```

---

## Testing

SkillBridge includes 100% automated test coverage across all features.

> [!NOTE]
> All backend tests run against an isolated **`mongodb-memory-server`** instance. They will **never** connect to, read from, or modify your live MongoDB Atlas database.

### Run All Tests
```bash
npm test
```

### Run Backend Tests Only (Jest + Supertest)
```bash
npm run test:backend
```
*Executes 7 test suites covering health checks, auth, profile management, discovery search, exchange requests, messaging, and full 10-step E2E journey.*

### Run Frontend Tests Only (Vitest + Testing Library)
```bash
npm run test:frontend
```
*Executes 5 test suites covering auth pages, peer discovery, profile editing, messaging polling, and frontend user journey simulation.*

---

## Building for Production

To create an optimized, minified production build of the frontend client:

```bash
npm --prefix frontend run build
```

The production assets will be output to `frontend/dist/`. To preview the production bundle locally:
```bash
npm --prefix frontend run preview
```

To run the backend server in production mode:
```bash
npm start
```

---

## Local URLs & Ports

| Service | URL | Purpose |
| :--- | :--- | :--- |
| **Frontend Web App**  |https://skill-bridge-mern.vercel.app | Main React client interface |
| **Backend REST API** | [http://localhost:5000/api](http://localhost:5000/api) | API base endpoint |
| **API Health Check** | [http://localhost:5000/api/health](http://localhost:5000/api/health) | Server & database status indicator |

---

## Troubleshooting Common Issues

### 1. MongoDB Connection Error: `SSL alert number 80`
- **Symptom:** `MongooseServerSelectionError: Could not connect to any servers in your MongoDB Atlas cluster... tlsv1 alert internal error (SSL alert number 80)`.
- **Cause:** Your public IP address has changed or is not in the Atlas Network Access whitelist.
- **Fix:** In [MongoDB Atlas](https://cloud.mongodb.com/), navigate to **Security** > **Network Access**, click **Add IP Address**, and select **"Add Current IP Address"** or **"Allow Access from Anywhere"** (`0.0.0.0/0`). Wait 1 minute for the rule to become Active.

### 2. Windows DNS SRV Resolution: `querySrv EBADRESP`
- **Symptom:** `querySrv EBADRESP _mongodb._tcp.<cluster>.mongodb.net`.
- **Cause:** Some Windows DNS resolvers fail to parse DNS SRV records returned by MongoDB Atlas.
- **Fix:** Handled automatically in `backend/src/config/db.js` using `dns.setServers(['8.8.8.8', '1.1.1.1'])` and `dns.setDefaultResultOrder('ipv4first')`. If issues persist, verify you have active internet connectivity.

### 3. Port Already in Use (`EADDRINUSE`)
- **Symptom:** `Error: listen EADDRINUSE: address already in use :::5000` or port 5173 busy.
- **Fix (Windows PowerShell):**
  ```powershell
  # Find process on port 5000
  Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess | Stop-Process -Force
  ```

### 4. CORS Errors in the Browser
- **Symptom:** Browser console logs: `Access to XMLHttpRequest blocked by CORS policy`.
- **Fix:** Ensure `CLIENT_URL=http://localhost:5173` is set in your root `.env`. The Vite proxy (`/api`) avoids CORS in development, but direct requests to port 5000 validate against `CLIENT_URL`.

---

## Documentation Links

For deeper technical information, consult the companion guides:
- 📖 [REST API Reference](docs/API.md) — Detailed endpoint parameters, payloads, responses, and error codes.
- 🏗️ [Architecture & Development Guide](docs/ARCHITECTURE.md) — Design patterns, data flows, state machines, and testing architecture.
