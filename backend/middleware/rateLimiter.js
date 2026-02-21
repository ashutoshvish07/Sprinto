const rateLimit = require('express-rate-limit');

// ─── Feature 4: Rate Limiting ─────────────────────────────────────────────────

// Login: max 10 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 15 minutes.',
  },
  standardHeaders: true,  // Return rate limit info in headers
  legacyHeaders: false,
  // Skip successful requests — only count failed ones
  skipSuccessfulRequests: true,
});

// Forgot password: max 5 requests per hour per IP
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: {
    success: false,
    message: 'Too many password reset requests. Please try again after 1 hour.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API limiter: max 200 requests per 15 min per IP
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: {
    success: false,
    message: 'Too many requests from this IP. Please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { loginLimiter, forgotPasswordLimiter, generalLimiter };
