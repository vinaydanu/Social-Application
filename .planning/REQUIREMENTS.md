# REQUIREMENTS: ConnectSphere Social Demo

## 1. Visual & Branding Requirements (UI/UX)
- [x] **REQ-UI-01**: Original branding "ConnectSphere" with clean logo icon and distinct slogan ("Connect with friends and the world around you").
- [x] **REQ-UI-02**: Signature social media palette: primary royal blue (`#1877F2`), hover blue (`#166FE5`), background neutral grey (`#F0F2F5`), crisp white cards (`#FFFFFF`), dark typography (`#1C1E21`), subtle borders (`#DADDE1`).
- [x] **REQ-UI-03**: Dual-column desktop layout with left-hand brand showcase / bullet benefits and right-hand elevated card containing login form.
- [x] **REQ-UI-04**: Dedicated registration interface (both modal dialog and standalone `/register.html`) matching the aesthetic, featuring first name, last name, email/username, password, date of birth, and gender selectors.
- [x] **REQ-UI-05**: Interactive member dashboard (`/dashboard.html`) displaying user profile information, greeting, session diagnostics, and a demo social feed where users can create posts.
- [x] **REQ-UI-06**: Responsive design that scales cleanly to tablets and smartphones with touch-friendly form inputs.

## 2. Authentication & Functional Requirements
- [x] **REQ-AUTH-01**: Registration endpoint accepting valid user details, checking for email/username uniqueness, hashing password with bcrypt, and creating account.
- [x] **REQ-AUTH-02**: Login endpoint accepting email or username with password, comparing against bcrypt hash, and establishing an authenticated session.
- [x] **REQ-AUTH-03**: Logout endpoint that destroys server session and clears client session cookies.
- [x] **REQ-AUTH-04**: Session check endpoint (`/api/auth/me`) returning currently authenticated user details.
- [x] **REQ-AUTH-05**: Route protection middleware redirecting unauthenticated users attempting to access `/dashboard` back to login.

## 3. Security & Data Integrity Requirements
- [x] **REQ-SEC-01**: Bcrypt salted hashing with cost factor 10. Passwords must never be stored, logged, or returned in plaintext.
- [x] **REQ-SEC-02**: 100% Parameterized SQL queries using prepared statements to prevent SQL injection vulnerabilities.
- [x] **REQ-SEC-03**: Server-side payload validation verifying email syntax, minimum password length (minimum 8 characters), and string sanitization.
- [x] **REQ-SEC-04**: Rate limiting on authentication routes (login: 10 requests / 15 mins; registration: 5 requests / 1 hour per IP).
- [x] **REQ-SEC-05**: Secure session configuration with `httpOnly: true`, `sameSite: 'lax'`, and session regeneration on authentication to prevent session fixation.

## 4. Architecture & Organization Requirements
- [x] **REQ-ARCH-01**: Structured folder organization:
  - `public/`: Static files (`index.html`, `register.html`, `dashboard.html`, `css/style.css`, `js/auth.js`, `js/dashboard.js`)
  - `src/db/`: Database connection, schema setup, seed data, and prepared query helpers
  - `src/middleware/`: Auth verification, rate limiting, and input validation
  - `src/routes/`: Modular Express route routers (`auth.js`, `posts.js`, `user.js`)
  - `src/server.js`: Server entrypoint
- [x] **REQ-ARCH-02**: Native SQLite storage persisted in `data/connectsphere.db`.
- [x] **REQ-ARCH-03**: Comprehensive README.md with setup instructions, prerequisites, environment configurations, and quickstart commands.
