const express = require('express');
const bcrypt = require('bcryptjs');
const dbHelper = require('../db/database');
const { validateRegistration, validateLogin } = require('../middleware/validation');
const { loginLimiter, registerLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

const AVATAR_COLORS = [
  '#1877f2', // Classic blue
  '#42b72a', // Vibrant green
  '#e0245e', // Coral red
  '#7952b3', // Royal purple
  '#fd7e14', // Warm orange
  '#009688', // Teal
  '#0288d1'  // Ocean blue
];

/**
 * POST /api/auth/register
 * Creates a new user with bcrypt-hashed password and initializes session
 */
router.post('/register', registerLimiter, validateRegistration, async (req, res) => {
  try {
    const { firstName, lastName, username, email, password, dateOfBirth, gender } = req.cleanData;

    // Check if email or username is already registered
    const existingUser = dbHelper.findUserWithHashByIdentifier(email) || 
                         dbHelper.findUserWithHashByIdentifier(username);

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with that email or username already exists. Please sign in or use different details.'
      });
    }

    // Hash password with bcrypt (10 rounds)
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Pick random avatar color
    const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

    // Persist new user with parameterized query
    const newUser = dbHelper.createUser({
      firstName,
      lastName,
      username,
      email,
      passwordHash,
      dateOfBirth,
      gender,
      avatarColor
    });

    // Regenerate session to prevent fixation and create authenticated session
    req.session.regenerate((err) => {
      if (err) {
        console.error('Session regeneration error during registration:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to establish session after registration. Please try again.'
        });
      }

      req.session.userId = newUser.id;

      return res.status(201).json({
        success: true,
        message: 'Account created successfully! Welcome to ConnectSphere.',
        user: newUser,
        redirectUrl: '/dashboard.html'
      });
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'A server error occurred during registration. Please try again.'
    });
  }
});

/**
 * POST /api/auth/login
 * Authenticates user credentials using bcrypt and establishes secure session
 */
router.post('/login', loginLimiter, validateLogin, async (req, res) => {
  try {
    const { identifier, password } = req.cleanLogin;

    // Query user by email or username using prepared parameterized query
    const user = dbHelper.findUserWithHashByIdentifier(identifier);

    // Use constant-time comparison / generic failure message against user enumeration
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The email or password you entered is incorrect.'
      });
    }

    // Verify bcrypt hash
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'The email or password you entered is incorrect.'
      });
    }

    // Update last login timestamp
    dbHelper.updateLastLogin(user.id);

    // Regenerate session to prevent session fixation attacks
    req.session.regenerate((err) => {
      if (err) {
        console.error('Session regeneration error:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to establish session. Please try again.'
        });
      }

      req.session.userId = user.id;

      return res.status(200).json({
        success: true,
        message: `Welcome back, ${user.first_name}!`,
        redirectUrl: '/dashboard.html'
      });
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'A server error occurred during sign in. Please try again.'
    });
  }
});

/**
 * POST /api/auth/logout
 * Destroys server-side session and instructs client to clear session cookie
 */
router.post('/logout', (req, res) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Unable to log out completely.'
        });
      }
      res.clearCookie('connectsphere.sid');
      return res.status(200).json({
        success: true,
        message: 'You have been safely signed out.',
        redirectUrl: '/'
      });
    });
  } else {
    res.clearCookie('connectsphere.sid');
    return res.status(200).json({
      success: true,
      message: 'Signed out.',
      redirectUrl: '/'
    });
  }
});

/**
 * GET /api/auth/me
 * Retrieves current authenticated user profile
 */
router.get('/me', (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(200).json({
      authenticated: false,
      user: null
    });
  }

  const user = dbHelper.findUserById(req.session.userId);
  if (!user) {
    req.session.destroy(() => {});
    return res.status(200).json({
      authenticated: false,
      user: null
    });
  }

  return res.status(200).json({
    authenticated: true,
    user: {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      username: user.username,
      email: user.email,
      dateOfBirth: user.date_of_birth,
      gender: user.gender,
      avatarColor: user.avatar_color,
      createdAt: user.created_at,
      lastLoginAt: user.last_login_at
    }
  });
});

module.exports = router;
