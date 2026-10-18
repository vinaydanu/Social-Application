const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for login requests to protect against brute force attacks
 * Max 10 attempts per 15 minutes per IP
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts from this IP. Please try again after 15 minutes.'
  }
});

/**
 * Rate limiter for registration to prevent automated bot account creation
 * Max 5 accounts per hour per IP
 */
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Account creation rate limit reached. Please try again later.'
  }
});

module.exports = {
  loginLimiter,
  registerLimiter
};
