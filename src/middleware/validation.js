const validator = require('validator');

/**
 * Validate and sanitize user registration input
 */
function validateRegistration(req, res, next) {
  const { firstName, lastName, username, email, password, dateOfBirth, gender } = req.body;
  const errors = [];

  // First & Last Name validation
  if (!firstName || typeof firstName !== 'string' || firstName.trim().length === 0) {
    errors.push('First name is required.');
  } else if (firstName.trim().length > 50) {
    errors.push('First name cannot exceed 50 characters.');
  }

  if (!lastName || typeof lastName !== 'string' || lastName.trim().length === 0) {
    errors.push('Last name is required.');
  } else if (lastName.trim().length > 50) {
    errors.push('Last name cannot exceed 50 characters.');
  }

  // Username validation: alphanumeric + underscores, 3-30 chars
  if (!username || typeof username !== 'string' || username.trim().length === 0) {
    errors.push('Username is required.');
  } else {
    const cleanUsername = username.trim();
    if (cleanUsername.length < 3 || cleanUsername.length > 30) {
      errors.push('Username must be between 3 and 30 characters.');
    } else if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
      errors.push('Username may only contain letters, numbers, and underscores.');
    }
  }

  // Email validation
  if (!email || typeof email !== 'string' || !validator.isEmail(email.trim())) {
    errors.push('Please enter a valid email address.');
  }

  // Password validation: minimum 8 characters, at least 1 number or special character
  if (!password || typeof password !== 'string') {
    errors.push('Password is required.');
  } else if (password.length < 8) {
    errors.push('Password must be at least 8 characters long.');
  } else if (!/(?=.*[0-9])|(?=.*[^A-Za-z0-9])/.test(password)) {
    errors.push('Password must contain at least one number or special character.');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: errors[0],
      errors
    });
  }

  // Clean data attached to req
  req.cleanData = {
    firstName: validator.escape(firstName.trim()),
    lastName: validator.escape(lastName.trim()),
    username: username.trim().toLowerCase(),
    email: validator.normalizeEmail(email.trim(), { all_lowercase: true }),
    password: password,
    dateOfBirth: dateOfBirth ? dateOfBirth.trim() : null,
    gender: gender ? validator.escape(gender.trim()) : 'Not specified'
  };

  next();
}

/**
 * Validate login credentials input
 */
function validateLogin(req, res, next) {
  const { identifier, password } = req.body;

  if (!identifier || typeof identifier !== 'string' || identifier.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Email or username is required.'
    });
  }

  if (!password || typeof password !== 'string' || password.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Password is required.'
    });
  }

  req.cleanLogin = {
    identifier: identifier.trim().toLowerCase(),
    password: password
  };

  next();
}

module.exports = {
  validateRegistration,
  validateLogin
};
