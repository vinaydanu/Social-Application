# ConnectSphere – Full-Stack Social Authentication & Portal Demo

ConnectSphere is an educational, full-stack social media authentication demo application built with **HTML5, CSS3, JavaScript, Node.js, Express, and SQLite**. 

It demonstrates clean frontend interface design inspired by classic social networks—using original branding—coupled with modern backend security standards: salted bcrypt password encryption, parameterized SQL queries, brute-force rate limiting, and secure HTTP-only session state management.

---

## Features

- **Classic Social Aesthetic**: Responsive desktop two-column presentation and single-column mobile view with royal blue (`#1877F2`) and neutral grey (`#F0F2F5`) styling.
- **Original Branding & Educational Clarity**: Branded as *ConnectSphere* with prominent educational indicators ensuring ethical clarity and user safety.
- **Full Authentication Flow**:
  - Demo Account Registration (First name, Last name, unique username, email, password, birthdate, and gender).
  - Real-time client-side password strength meter and validation.
  - Secure Login authenticating against local SQLite storage.
  - Quick-Fill button to test seeded demo credentials with a single click.
  - Show / Hide password visibility toggle.
  - Protected Member Dashboard (`/dashboard`) showcasing profile data, session diagnostics, and a demo social feed.
  - Safe Logout destroying server session and clearing client cookies.
- **Defensive Engineering**:
  - **Zero Plaintext Passwords**: Passwords encrypted using `bcrypt` (10 salt rounds).
  - **SQL Injection Prevention**: 100% parameterized SQL prepared statements.
  - **Brute Force Protection**: IP rate limiting via `express-rate-limit`.
  - **Session Fixation Defense**: Automatic session ID regeneration upon authentication.
  - **Input Sanitization**: Email normalization and HTML tag stripping.

---

## Project Structure

```
Phising/
├── data/
│   └── connectsphere.db         # Auto-created SQLite database file
├── public/                      # Frontend static client files
│   ├── css/
│   │   └── style.css            # Responsive blue-and-white stylesheet
│   ├── js/
│   │   ├── auth.js              # Client auth handling, validation & modal logic
│   │   └── dashboard.js         # Protected dashboard & community feed logic
│   ├── 404.html                 # Friendly error page
│   ├── dashboard.html           # Authenticated member portal & feed
│   ├── index.html               # Main login page & signup modal
│   └── register.html            # Standalone account creation page
├── src/
│   ├── db/
│   │   ├── database.js          # SQLite connection, schema, & prepared queries
│   │   └── seed.js              # Database seeder with sample accounts & posts
│   ├── middleware/
│   │   ├── auth.js              # Session verification & route guards
│   │   ├── rateLimiter.js       # Login & signup brute force mitigation
│   │   └── validation.js        # Server-side input validation & sanitization
│   ├── routes/
│   │   ├── auth.js              # /api/auth routes (register, login, logout, me)
│   │   └── posts.js             # /api/posts routes (read & publish posts)
│   └── server.js                # Express app configuration & server entrypoint
├── test/
│   └── auth.test.js             # Automated test suite (18 unit & integration tests)
├── .planning/                   # GSD project roadmap and specifications
├── package.json
└── README.md
```

---

## Prerequisites

- **Node.js**: v18.x, v20.x, or v24.x (Tested with Node v24.22.0)
- **npm**: v9.x or higher

---

## Quickstart Guide

### 1. Install Dependencies
```bash
npm install
```
*(On Windows PowerShell if scripts are restricted, run: `npm.cmd install`)*

### 2. Seed Initial Demo Accounts
Populate the database with pre-configured demo users and sample community feed posts:
```bash
npm run seed
```
*(Or run: `node src/db/seed.js`)*

### 3. Start the Application Server
```bash
npm start
```
*(Or run: `node src/server.js`)*

The server will start at:
```
http://localhost:3000
```

---

## Pre-Configured Test Credentials

You can log in immediately using the seeded account or by clicking the **"Auto Fill"** button on the login card:

| Role | Email / Identifier | Username | Password |
|---|---|---|---|
| Demo User | `alex@example.com` | `alexm` | `Password123!` |
| Demo User 2 | `sarah@example.com` | `sarahc` | `Password123!` |
| Demo User 3 | `david@example.com` | `davidk` | `Password123!` |

You can also click **"Create new account"** or navigate to `http://localhost:3000/register` to create your own account.

---

## Running Automated Tests

A comprehensive automated test suite is included in `test/auth.test.js`. It validates:
- SQLite table initialization and constraints.
- Bcrypt salted hash computation and verification.
- SQL injection resistance against malicious payloads (`' OR '1'='1'`).
- Input validation (email syntax, password length, duplicate prevention).
- Authentication flow (registration, login, invalid credentials handling).
- Session cookie issuance, `/api/auth/me` checks, and logout cleanup.
- Feed post creation and unauthenticated route protection.

To run the test suite:
```bash
npm test
```
*(Or run: `node test/auth.test.js`)*

Expected Output:
```
====================================================
Summary: 18 passed, 0 failed.
====================================================
```

---

## API Reference

### Authentication Endpoints

#### `POST /api/auth/register`
Creates a new user account.
- **Body**: `{ firstName, lastName, username, email, password, dateOfBirth, gender }`
- **Response**: `201 Created` with user info and session cookie.

#### `POST /api/auth/login`
Authenticates a user and starts an active session.
- **Body**: `{ identifier, password }` (where `identifier` is email or username)
- **Response**: `200 OK` on success, or `401 Unauthorized` with generic error.

#### `POST /api/auth/logout`
Destroys session and clears cookie.
- **Response**: `200 OK`.

#### `GET /api/auth/me`
Retrieves currently logged-in user profile.
- **Response**: `200 OK` `{ authenticated: true, user }` or `{ authenticated: false }`.

### Community Feed Endpoints

#### `GET /api/posts`
Retrieves recent feed posts.
- **Response**: `200 OK` `{ success: true, posts: [...] }`.

#### `POST /api/posts`
Publishes a new post (Requires authenticated session).
- **Body**: `{ content }`
- **Response**: `201 Created` `{ success: true, post: {...} }`.

---

## Security Implementation Highlights

1. **Password Hashing**: Stored passwords use `bcryptjs` with 10 salt rounds. Plaintext is never saved to disk or logged.
2. **Prepared SQL**: Queries utilize parameterized statements (`db.prepare('... ?').run(...)`), making SQL injection structurally impossible.
3. **HTTP-Only Cookies**: Session cookies cannot be read or stolen via client-side JavaScript (`document.cookie`), mitigating XSS risks.
4. **Session Fixation Prevention**: Sessions are regenerated upon every successful login using `req.session.regenerate()`.
5. **Rate Limiting**: Mitigates automated credential stuffing and brute-force guessing.
