import rateLimit from 'express-rate-limit';

export const rateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minutes
  max: 120,
  message: 'Server is busy, try again later',
});

// Stricter rate limiter for login
export const authRateLimit = rateLimit({
  windowMs: 6 * 60 * 60 * 1000, // 6 hours
  max: 30,
  message: 'Server is busy, try again later',
});

export const supportRateLimit = rateLimit({
  windowMs: 12 * 60 * 60 * 1000, // 6 hours
  max: 2,
  message: 'We are reviewing your case',
});
