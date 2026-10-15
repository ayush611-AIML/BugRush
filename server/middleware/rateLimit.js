// Rate limiting and input validation for BugRush sandbox submissions

const runCooldowns = new Map(); // userId -> lastRunTimestamp

/**
 * Validates submission rate limit (1 run per 3 seconds per player)
 * and input code size (max 10 KB).
 */
function validateSubmission(userId, code) {
  if (!code || typeof code !== 'string') {
    return { valid: false, error: 'Code cannot be empty' };
  }

  // Cap code at 10 KB (10 * 1024 bytes)
  const codeSizeBytes = Buffer.byteLength(code, 'utf8');
  if (codeSizeBytes > 10 * 1024) {
    return {
      valid: false,
      error: `Submission exceeds maximum allowed size of 10 KB (received ${(codeSizeBytes / 1024).toFixed(1)} KB)`
    };
  }

  // Rate limit: 1 run per 3 seconds
  const now = Date.now();
  const lastRun = runCooldowns.get(userId) || 0;
  const cooldownRemaining = 3000 - (now - lastRun);

  if (cooldownRemaining > 0) {
    const secondsWait = (cooldownRemaining / 1000).toFixed(1);
    return {
      valid: false,
      error: `Rate limited: Please wait ${secondsWait}s before submitting again`
    };
  }

  runCooldowns.set(userId, now);
  return { valid: true };
}

// HTTP API express rate limiter middleware for /api routes
function expressRateLimiter(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const last = runCooldowns.get(ip) || 0;
  if (now - last < 500) {
    return res.status(429).json({ error: 'Too many requests, slow down.' });
  }
  runCooldowns.set(ip, now);
  next();
}

module.exports = {
  validateSubmission,
  expressRateLimiter
};
