const express = require('express');
const session = require('express-session');
const path = require('path');
const authRoutes = require('./routes/auth');
const postsRoutes = require('./routes/posts');
const { requireAuthPage, requireGuest } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Security response headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  name: 'connectsphere.sid',
  secret: process.env.SESSION_SECRET || 'connectsphere-dev-secret-key-32948293849',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Route guard for protected dashboard view
app.get('/dashboard.html', requireAuthPage, (req, res, next) => {
  next();
});

app.get('/dashboard', requireAuthPage, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

// Convenient URL aliases
app.get('/register', requireGuest, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/register.html'));
});

app.get('/login', requireGuest, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Static assets (HTML, CSS, JS, Images)
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    app: 'ConnectSphere Social Demo',
    timestamp: new Date().toISOString()
  });
});

// 404 handler for unknown routes
app.use((req, res) => {
  if (req.accepts('html')) {
    return res.status(404).sendFile(path.join(__dirname, '../public/404.html'));
  }
  return res.status(404).json({ success: false, message: 'Resource not found' });
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error. Please try again later.'
  });
});

// Start listener
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`  ConnectSphere Full-Stack Demo App Running!`);
    console.log(`  Server URL:  http://localhost:${PORT}`);
    console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`  Database:    data/connectsphere.db (SQLite)`);
    console.log(`-------------------------------------------------------`);
    console.log(`  Demo Login Account:`);
    console.log(`  Email:       alex@example.com (or username: alexm)`);
    console.log(`  Password:    Password123!`);
    console.log(`=======================================================`);
  });
}

module.exports = app;
