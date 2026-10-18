const assert = require('assert');
const bcrypt = require('bcryptjs');
const dbHelper = require('../src/db/database');
const app = require('../src/server');
const http = require('http');

let server;
let serverPort = 3999;
let baseUrl = `http://localhost:${serverPort}`;

async function runTests() {
  console.log('====================================================');
  console.log('       CONNECTSPHERE AUTOMATED TEST SUITE           ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  [FAIL] ${name}`);
      console.error(`         ${err.message}`);
      failed++;
    }
  }

  async function asyncTest(name, fn) {
    try {
      await fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  [FAIL] ${name}`);
      console.error(`         ${err.message}`);
      failed++;
    }
  }

  // --- UNIT TESTS: DATABASE & CRYPTO ---
  console.log('1. Database & Cryptographic Verification');

  test('Database is initialized with users and posts tables', () => {
    const userCols = dbHelper.db.prepare("PRAGMA table_info(users)").all();
    const colNames = userCols.map(c => c.name);
    assert(colNames.includes('password_hash'), 'users table must have password_hash column');
    assert(colNames.includes('email'), 'users table must have email column');
    assert(colNames.includes('username'), 'users table must have username column');

    const postCols = dbHelper.db.prepare("PRAGMA table_info(posts)").all();
    const postColNames = postCols.map(c => c.name);
    assert(postColNames.includes('content'), 'posts table must have content column');
    assert(postColNames.includes('user_id'), 'posts table must have user_id column');
  });

  await asyncTest('Bcrypt salted hashing encrypts passwords securely', async () => {
    const plain = 'SecretPass123!';
    const hash = await bcrypt.hash(plain, 10);
    assert.strictEqual(hash.startsWith('$2b$10$'), true, 'Must use bcrypt algorithm with cost 10');
    assert.notStrictEqual(hash, plain, 'Hash must not equal plaintext');
    const matches = await bcrypt.compare(plain, hash);
    assert.strictEqual(matches, true, 'bcrypt.compare must validate matching password');
    const wrongMatches = await bcrypt.compare('WrongPassword', hash);
    assert.strictEqual(wrongMatches, false, 'bcrypt.compare must reject mismatched password');
  });

  test('SQL Injection resistance in prepared statements', () => {
    const maliciousInput = "' OR '1'='1' --";
    const result = dbHelper.findUserWithHashByIdentifier(maliciousInput);
    assert.strictEqual(result, undefined, 'SQL injection probe must not bypass query or return rows');
  });

  // Start HTTP server for API Integration Tests
  await new Promise((resolve) => {
    server = app.listen(serverPort, () => {
      resolve();
    });
  });

  console.log('\n2. HTTP API & Authentication Integration Tests');

  // Test 1: Health check
  await asyncTest('GET /api/health responds with status healthy', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.status, 'healthy');
  });

  // Test 2: Reject registration with invalid email
  await asyncTest('POST /api/auth/register rejects invalid email format', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'Test',
        lastName: 'User',
        username: 'testbademail',
        email: 'invalid-email-no-at-sign',
        password: 'Password123!'
      })
    });
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert(data.message.includes('valid email'), 'Must require valid email');
  });

  // Test 3: Reject registration with short password (< 8 chars)
  await asyncTest('POST /api/auth/register rejects password shorter than 8 chars', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'Test',
        lastName: 'User',
        username: 'shortpassuser',
        email: 'shortpass@example.com',
        password: '123'
      })
    });
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert(data.message.includes('at least 8 characters'), 'Must reject short passwords');
  });

  // Test 4: Successful user registration
  const uniqueId = Date.now();
  const testUser = {
    firstName: 'Jordan',
    lastName: 'Lee',
    username: `jordan_${uniqueId}`,
    email: `jordan_${uniqueId}@testdomain.com`,
    password: 'SecurePass987!',
    dateOfBirth: '1996-08-14',
    gender: 'Custom'
  };

  let sessionCookie = '';

  await asyncTest('POST /api/auth/register registers new user and sets session cookie', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });
    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.user.email, testUser.email.toLowerCase());
    assert.strictEqual(data.user.username, testUser.username.toLowerCase());
    
    // Check session cookie
    const setCookie = res.headers.get('set-cookie');
    assert(setCookie && setCookie.includes('connectsphere.sid'), 'Must set connectsphere.sid cookie');
    sessionCookie = setCookie.split(';')[0];
  });

  // Test 5: Reject duplicate email
  await asyncTest('POST /api/auth/register rejects duplicate registration attempt', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });
    assert.strictEqual(res.status, 409, 'Must return 409 Conflict');
    const data = await res.json();
    assert.strictEqual(data.success, false);
  });

  // Test 6: Verify password in database is NOT plaintext
  test('Registered password in database is hashed with bcrypt and not plaintext', () => {
    const row = dbHelper.findUserWithHashByIdentifier(testUser.email);
    assert(row, 'User must exist in DB');
    assert.notStrictEqual(row.password_hash, testUser.password, 'DB must NEVER store plaintext password');
    assert(row.password_hash.startsWith('$2b$10$'), 'DB must contain salted bcrypt hash');
  });

  // Test 7: GET /api/auth/me returns authenticated user with active cookie
  await asyncTest('GET /api/auth/me returns current user profile when session active', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: sessionCookie }
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.authenticated, true);
    assert.strictEqual(data.user.email, testUser.email.toLowerCase());
  });

  // Test 8: Login rejection with incorrect password
  await asyncTest('POST /api/auth/login rejects wrong password with 401', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: testUser.email,
        password: 'CompletelyWrongPassword!'
      })
    });
    assert.strictEqual(res.status, 401);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.message, 'The email or password you entered is incorrect.');
  });

  // Test 9: Login success with email
  await asyncTest('POST /api/auth/login authenticates with valid email', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: testUser.email,
        password: testUser.password
      })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.redirectUrl, '/dashboard.html');
  });

  // Test 10: Login success with username
  await asyncTest('POST /api/auth/login authenticates with valid username', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: testUser.username,
        password: testUser.password
      })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
  });

  // Test 11: Create post on feed with session cookie
  await asyncTest('POST /api/posts publishes post for authenticated user', async () => {
    const res = await fetch(`${baseUrl}/api/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie
      },
      body: JSON.stringify({ content: 'Testing feed post creation from test suite!' })
    });
    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.post.content, 'Testing feed post creation from test suite!');
  });

  // Test 12: Reject post creation without session
  await asyncTest('POST /api/posts rejects unauthenticated request with 401', async () => {
    const res = await fetch(`${baseUrl}/api/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Unauthenticated post' })
    });
    assert.strictEqual(res.status, 401);
  });

  // Test 13: Read posts
  await asyncTest('GET /api/posts returns community feed', async () => {
    const res = await fetch(`${baseUrl}/api/posts`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert(Array.isArray(data.posts));
    assert(data.posts.length > 0);
  });

  // Test 14: Logout clears session
  await asyncTest('POST /api/auth/logout terminates session and clears cookie', async () => {
    const res = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: sessionCookie }
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
  });

  // Test 15: Protected page redirect
  await asyncTest('GET /dashboard redirects unauthenticated browser request to login', async () => {
    const res = await fetch(`${baseUrl}/dashboard`, {
      redirect: 'manual'
    });
    // Check 302 redirect
    assert.strictEqual(res.status, 302);
    assert(res.headers.get('location').includes('/?error=unauthorized'));
  });

  // Test 16: Authenticated users are redirected away from login/register pages
  await asyncTest('GET /login and /register redirect authenticated users to dashboard', async () => {
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: testUser.email,
        password: testUser.password
      })
    });
    assert.strictEqual(loginRes.status, 200);
    const cookie = loginRes.headers.get('set-cookie');
    assert(cookie && cookie.includes('connectsphere.sid'));

    const loginPageRes = await fetch(`${baseUrl}/login`, {
      redirect: 'manual',
      headers: { Cookie: cookie.split(';')[0] }
    });
    assert.strictEqual(loginPageRes.status, 302);
    assert(loginPageRes.headers.get('location').includes('/dashboard'));

    const registerPageRes = await fetch(`${baseUrl}/register`, {
      redirect: 'manual',
      headers: { Cookie: cookie.split(';')[0] }
    });
    assert.strictEqual(registerPageRes.status, 302);
    assert(registerPageRes.headers.get('location').includes('/dashboard'));
  });

  // Close server
  server.close();

  console.log('\n====================================================');
  console.log(`Summary: ${passed} passed, ${failed} failed.`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  if (server) server.close();
  process.exit(1);
});
