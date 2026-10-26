# SkillBridge API Documentation

Comprehensive reference documentation for the SkillBridge RESTful API.

All SkillBridge endpoints follow standard REST conventions, accept and return `application/json`, and use standard HTTP status codes.

---

## Table of Contents
- [Base URLs & Common Conventions](#base-urls--common-conventions)
- [Authentication & Error Format](#authentication--error-format)
- [System & Health Endpoints](#system--health-endpoints)
- [Authentication Endpoints (`/api/auth`)](#authentication-endpoints-apiauth)
- [User Profile & Discovery Endpoints (`/api/users`)](#user-profile--discovery-endpoints-apiusers)
- [Skill Exchange Request Endpoints (`/api/requests`)](#skill-exchange-request-endpoints-apirequests)
- [Messaging & Conversation Endpoints (`/api/conversations`)](#messaging--conversation-endpoints-apiconversations)

---

## Base URLs & Common Conventions

- **Base URL:** `http://localhost:5000/api` (or proxied via Vite dev server at `/api`)
- **Content-Type:** `application/json`
- **Pagination Defaults:**
  - `page`: default `1` (positive integer)
  - `limit`: default `10` or `20`, maximum `50` (or `100` for messages)
  - Standard pagination response format:
    ```json
    {
      "success": true,
      "total": 42,
      "page": 1,
      "pages": 5,
      "data": [ ... ]
    }
    ```

---

## Authentication & Error Format

### Authorization Header
Protected endpoints require a JSON Web Token (JWT) supplied in the HTTP `Authorization` header:
```http
Authorization: Bearer <your_jwt_token>
```

### Standard Error Response
Validation errors, authentication errors, and server errors return structured JSON:
```json
{
  "success": false,
  "message": "Human-readable error explanation",
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email address"
    }
  ]
}
```

### HTTP Status Codes
| Status Code | Meaning | Description |
| :--- | :--- | :--- |
| `200 OK` | Success | Request succeeded. |
| `201 Created` | Created | Resource successfully created. |
| `400 Bad Request` | Validation Failure | Invalid input payload or missing fields. |
| `401 Unauthorized` | Auth Required | Missing, expired, or invalid JWT token. |
| `403 Forbidden` | Access Denied | Authenticated user is not authorized to access this resource. |
| `404 Not Found` | Not Found | Resource or route does not exist. |
| `409 Conflict` | Conflict | Email already registered or invalid status transition. |
| `500 Server Error` | Server Error | Unhandled internal exception. |

---

## System & Health Endpoints

### 1. API Welcome Info
- **Method:** `GET`
- **Path:** `/api`
- **Auth Required:** No
- **Response (200 OK):**
```json
{
  "name": "SkillBridge API",
  "version": "1.0.0",
  "description": "Peer-to-peer flexible skill exchange platform"
}
```

### 2. System Health Check
- **Method:** `GET`
- **Path:** `/api/health`
- **Auth Required:** No
- **Response (200 OK):**
```json
{
  "status": "ok",
  "message": "SkillBridge API is healthy and operational",
  "database": "connected",
  "timestamp": "2026-10-26T18:00:00.000Z",
  "uptime": 124.56
}
```

---

## Authentication Endpoints (`/api/auth`)

### 1. Register User
- **Method:** `POST`
- **Path:** `/api/auth/register`
- **Auth Required:** No
- **Request Body:**
| Field | Type | Required | Rules | Description |
| :--- | :--- | :--- | :--- | :--- |
| `name` | String | Yes | 2–50 characters, trimmed | Full name of the user |
| `email` | String | Yes | Valid email, unique | User's email address |
| `password` | String | Yes | Min 6 characters | Plain text password (bcrypt-hashed on save) |
| `avatar` | String | No | Valid URL | Optional profile avatar image URL |

- **Sample Request:**
```json
{
  "name": "Alice Developer",
  "email": "alice@example.com",
  "password": "Password123",
  "avatar": "https://example.com/avatar.jpg"
}
```

- **Response (201 Created):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "671cc81a1234567890abcdef",
    "name": "Alice Developer",
    "email": "alice@example.com",
    "role": "both",
    "bio": "",
    "location": "",
    "avatar": "https://example.com/avatar.jpg",
    "skillsToTeach": [],
    "skillsToLearn": [],
    "availability": "Flexible",
    "createdAt": "2026-10-26T18:00:00.000Z",
    "updatedAt": "2026-10-26T18:00:00.000Z"
  }
}
```

### 2. Login User
- **Method:** `POST`
- **Path:** `/api/auth/login`
- **Auth Required:** No
- **Request Body:**
| Field | Type | Required | Rules |
| :--- | :--- | :--- | :--- |
| `email` | String | Yes | Valid email |
| `password` | String | Yes | Non-empty string |

- **Sample Request:**
```json
{
  "email": "alice@example.com",
  "password": "Password123"
}
```

- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "671cc81a1234567890abcdef",
    "name": "Alice Developer",
    "email": "alice@example.com",
    "role": "both",
    "bio": "",
    "location": "",
    "avatar": "https://example.com/avatar.jpg",
    "skillsToTeach": [],
    "skillsToLearn": [],
    "availability": "Flexible"
  }
}
```

### 3. Get Current Authenticated User (`/me`)
- **Method:** `GET`
- **Path:** `/api/auth/me`
- **Auth Required:** Yes (`Bearer <token>`)
- **Response (200 OK):**
```json
{
  "success": true,
  "user": {
    "id": "671cc81a1234567890abcdef",
    "name": "Alice Developer",
    "email": "alice@example.com",
    "role": "both",
    "bio": "Full stack engineer passionate about mentoring.",
    "location": "San Francisco, CA",
    "avatar": "",
    "skillsToTeach": ["React", "Node.js"],
    "skillsToLearn": ["Python", "Machine Learning"],
    "availability": "Weekends"
  }
}
```

---

## User Profile & Discovery Endpoints (`/api/users`)

### 1. Get Own Profile
- **Method:** `GET`
- **Path:** `/api/users/me`
- **Auth Required:** Yes
- **Response (200 OK):** Returns own full profile object including email.

### 2. Update Own Profile
- **Method:** `PUT`
- **Path:** `/api/users/me`
- **Auth Required:** Yes
- **Allowed Fields:**
| Field | Type | Rules |
| :--- | :--- | :--- |
| `name` | String | 2–50 characters |
| `bio` | String | Max 500 characters |
| `location` | String | Max 100 characters |
| `avatar` | String | Valid URL or empty string |
| `role` | String | `learner`, `teacher`, or `both` |
| `skillsToTeach` | Array of Strings | Free-form skill tags, automatically trimmed and de-duplicated |
| `skillsToLearn` | Array of Strings | Free-form skill tags, automatically trimmed and de-duplicated |
| `availability` | String | Max 100 characters |

> [!NOTE]
> Sensitive fields (`email`, `password`, `_id`, `role` restrictions) cannot be changed through this endpoint. Attempting to pass `email` or `password` will be safely ignored without modifying authentication records.

- **Sample Request:**
```json
{
  "name": "Alice Developer",
  "bio": "Building scalable web apps and learning data science.",
  "location": "San Francisco, CA",
  "role": "both",
  "skillsToTeach": ["React", "Node.js", "TypeScript"],
  "skillsToLearn": ["Python", "PyTorch"],
  "availability": "Weekday evenings"
}
```

- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "user": {
    "id": "671cc81a1234567890abcdef",
    "name": "Alice Developer",
    "email": "alice@example.com",
    "role": "both",
    "bio": "Building scalable web apps and learning data science.",
    "location": "San Francisco, CA",
    "avatar": "",
    "skillsToTeach": ["React", "Node.js", "TypeScript"],
    "skillsToLearn": ["Python", "PyTorch"],
    "availability": "Weekday evenings"
  }
}
```

### 3. Discover & Search Peers
- **Method:** `GET`
- **Path:** `/api/users`
- **Auth Required:** Yes
- **Query Parameters:**
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `teach` | String | None | Search users who can teach this skill (case-insensitive substring) |
| `learn` | String | None | Search users who want to learn this skill (case-insensitive substring) |
| `role` | String | None | Filter by role (`learner`, `teacher`, `both`) |
| `location` | String | None | Filter by location substring |
| `search` | String | None | Broad keyword search across name, bio, skillsToTeach, and skillsToLearn |
| `excludeMe`| Boolean | `true` | When `true` (default), excludes the authenticated requester |
| `page` | Integer | `1` | Page number |
| `limit` | Integer | `10` | Users per page (max 50) |

- **Sample Request:**
`GET /api/users?teach=react&role=both&page=1&limit=10`

- **Response (200 OK):**
```json
{
  "success": true,
  "total": 1,
  "page": 1,
  "pages": 1,
  "users": [
    {
      "id": "671cc81a1234567890abcdef",
      "name": "Alice Developer",
      "role": "both",
      "bio": "Building scalable web apps and learning data science.",
      "location": "San Francisco, CA",
      "avatar": "",
      "skillsToTeach": ["React", "Node.js", "TypeScript"],
      "skillsToLearn": ["Python", "PyTorch"],
      "availability": "Weekday evenings"
    }
  ]
}
```

### 4. Get User Public Profile by ID
- **Method:** `GET`
- **Path:** `/api/users/:id`
- **Auth Required:** Yes
- **Response (200 OK):** Public user profile without sensitive fields (`password` excluded). Returns `404 Not Found` if user does not exist.

---

## Skill Exchange Request Endpoints (`/api/requests`)

### 1. Create Exchange Request
- **Method:** `POST`
- **Path:** `/api/requests`
- **Auth Required:** Yes
- **Request Body:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `recipient` | MongoId | Yes | Target user's ID (cannot send request to self) |
| `skillWanted` | String | Yes | Skill requester wishes to learn (1–100 chars) |
| `skillOffered` | String | No | Skill requester can share in return (0–100 chars) |
| `message` | String | No | Introductory note (max 1000 chars) |

> [!NOTE]
> `skillOffered` is optional. SkillBridge supports both one-way learning and two-way skill exchange.

- **Sample Request:**
```json
{
  "recipient": "671cc81a1234567890abcdef",
  "skillWanted": "React",
  "skillOffered": "Python",
  "message": "Hi Alice! I'd love to learn React from you and can help you with Python in return."
}
```

- **Response (201 Created):**
```json
{
  "success": true,
  "message": "Skill exchange request sent successfully",
  "request": {
    "id": "671cc82b2345678901bcdef0",
    "sender": {
      "id": "671cc80f0123456789abcdef",
      "name": "Bob Learner",
      "email": "bob@example.com",
      "avatar": ""
    },
    "recipient": {
      "id": "671cc81a1234567890abcdef",
      "name": "Alice Developer",
      "email": "alice@example.com",
      "avatar": ""
    },
    "skillWanted": "React",
    "skillOffered": "Python",
    "message": "Hi Alice! I'd love to learn React from you and can help you with Python in return.",
    "status": "pending",
    "createdAt": "2026-10-26T18:05:00.000Z",
    "updatedAt": "2026-10-26T18:05:00.000Z"
  }
}
```

### 2. Get Sent Requests
- **Method:** `GET`
- **Path:** `/api/requests/sent`
- **Auth Required:** Yes
- **Query Parameters:** `page`, `limit`, `status` (`pending`, `accepted`, `declined`, `cancelled`)
- **Response (200 OK):** Paginated array of requests sent by the authenticated user.

### 3. Get Received Requests
- **Method:** `GET`
- **Path:** `/api/requests/received`
- **Auth Required:** Yes
- **Query Parameters:** `page`, `limit`, `status`
- **Response (200 OK):** Paginated array of requests received by the authenticated user.

### 4. Get Request by ID
- **Method:** `GET`
- **Path:** `/api/requests/:id`
- **Auth Required:** Yes
- **Access Rule:** Only the `sender` or `recipient` can view the request. Others receive `403 Forbidden`.

### 5. Update Request Status
- **Method:** `PATCH`
- **Path:** `/api/requests/:id/status`
- **Auth Required:** Yes
- **Allowed Transitions:**
  - **Recipient:** Can change `pending` -> `accepted` or `declined`.
  - **Sender:** Can change `pending` -> `cancelled`.
  - **Terminal Rule:** Once a request is `accepted`, `declined`, or `cancelled`, it cannot be changed. Attempting to change a finalized request returns `400 Bad Request`.
- **Request Body:**
```json
{
  "status": "accepted"
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Request status updated to accepted",
  "request": {
    "id": "671cc82b2345678901bcdef0",
    "status": "accepted"
  }
}
```

---

## Messaging & Conversation Endpoints (`/api/conversations`)

> [!IMPORTANT]
> Messaging in SkillBridge is entirely REST-based with strict participant privacy. Conversation creation requires an `accepted` skill exchange request.

### 1. Create or Retrieve Conversation
- **Method:** `POST`
- **Path:** `/api/conversations`
- **Auth Required:** Yes
- **Request Body:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `requestId` | MongoId | Yes | ID of an `accepted` exchange request |
- **Rules:**
  - Only the `sender` or `recipient` of that accepted request can initiate the conversation.
  - Idempotent: repeated calls for the same `requestId` return the existing conversation instead of creating duplicates.
- **Sample Request:**
```json
{
  "requestId": "671cc82b2345678901bcdef0"
}
```
- **Response (200 OK or 201 Created):**
```json
{
  "success": true,
  "message": "Conversation retrieved successfully",
  "conversation": {
    "id": "671cc83c3456789012cdef01",
    "request": "671cc82b2345678901bcdef0",
    "participants": [
      { "id": "671cc80f0123456789abcdef", "name": "Bob Learner", "avatar": "" },
      { "id": "671cc81a1234567890abcdef", "name": "Alice Developer", "avatar": "" }
    ],
    "lastMessage": null,
    "lastMessageAt": "2026-10-26T18:10:00.000Z"
  }
}
```

### 2. List User Conversations
- **Method:** `GET`
- **Path:** `/api/conversations`
- **Auth Required:** Yes
- **Query Parameters:** `page` (default 1), `limit` (default 20, max 50)
- **Response (200 OK):** Paginated conversations for the authenticated user, sorted with the latest message first. Includes `unreadCount` for each conversation.

### 3. Get Conversation by ID
- **Method:** `GET`
- **Path:** `/api/conversations/:id`
- **Auth Required:** Yes
- **Access Rule:** Only participants can view the conversation.

### 4. Get Conversation Messages
- **Method:** `GET`
- **Path:** `/api/conversations/:id/messages`
- **Auth Required:** Yes
- **Query Parameters:** `page` (default 1), `limit` (default 50, max 100)
- **Response (200 OK):**
```json
{
  "success": true,
  "total": 2,
  "page": 1,
  "pages": 1,
  "messages": [
    {
      "id": "671cc84d4567890123def012",
      "conversation": "671cc83c3456789012cdef01",
      "sender": {
        "id": "671cc80f0123456789abcdef",
        "name": "Bob Learner",
        "avatar": ""
      },
      "text": "Hello Alice, excited to get started!",
      "readAt": "2026-10-26T18:15:00.000Z",
      "createdAt": "2026-10-26T18:12:00.000Z"
    }
  ]
}
```

### 5. Send Message
- **Method:** `POST`
- **Path:** `/api/conversations/:id/messages`
- **Auth Required:** Yes
- **Request Body:**
| Field | Type | Required | Rules |
| :--- | :--- | :--- | :--- |
| `text` | String | Yes | 1–5000 characters, trimmed |

- **Sample Request:**
```json
{
  "text": "Sounds great Bob! Let's set up a session for Thursday."
}
```

- **Response (201 Created):**
```json
{
  "success": true,
  "message": "Message sent successfully",
  "data": {
    "id": "671cc85e5678901234ef0123",
    "conversation": "671cc83c3456789012cdef01",
    "sender": {
      "id": "671cc81a1234567890abcdef",
      "name": "Alice Developer",
      "avatar": ""
    },
    "text": "Sounds great Bob! Let's set up a session for Thursday.",
    "readAt": null,
    "createdAt": "2026-10-26T18:16:00.000Z"
  }
}
```

### 6. Mark Conversation Messages as Read
- **Method:** `PATCH`
- **Path:** `/api/conversations/:id/read`
- **Auth Required:** Yes
- **Behavior:** Marks all messages sent by the *other* participant in this conversation where `readAt` is null as read with the current timestamp.
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Messages marked as read",
  "updatedCount": 1
}
```
