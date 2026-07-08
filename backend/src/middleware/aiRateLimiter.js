const AI_RATE_LIMIT_WINDOW_MS = Number(process.env.AI_RATE_LIMIT_WINDOW_MS || 60000);
const AI_RATE_LIMIT_MAX_REQUESTS = Number(process.env.AI_RATE_LIMIT_MAX_REQUESTS || 12);

const requestBuckets = new Map();

const pruneExpiredBuckets = (now) => {
  for (const [key, bucket] of requestBuckets.entries()) {
    if (now - bucket.windowStart > AI_RATE_LIMIT_WINDOW_MS) {
      requestBuckets.delete(key);
    }
  }
};

const aiRateLimiter = (req, res, next) => {
  const now = Date.now();
  const key = req.user?._id?.toString() || req.ip;

  pruneExpiredBuckets(now);

  const bucket = requestBuckets.get(key) || { count: 0, windowStart: now };

  if (now - bucket.windowStart > AI_RATE_LIMIT_WINDOW_MS) {
    bucket.count = 0;
    bucket.windowStart = now;
  }

  bucket.count += 1;
  requestBuckets.set(key, bucket);

  if (bucket.count > AI_RATE_LIMIT_MAX_REQUESTS) {
    const retryAfterSeconds = Math.ceil((AI_RATE_LIMIT_WINDOW_MS - (now - bucket.windowStart)) / 1000);
    res.set('Retry-After', String(Math.max(retryAfterSeconds, 1)));
    return res.status(429).json({
      success: false,
      message: 'Too many AI requests. Please wait a moment and try again.',
    });
  }

  next();
};

module.exports = { aiRateLimiter };
