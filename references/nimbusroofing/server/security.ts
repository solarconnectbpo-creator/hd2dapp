import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import type { Express, Request, Response, NextFunction } from 'express';

/**
 * Security Hardening Module
 * Implements multiple layers of protection against common attacks
 */

/**
 * Rate limiter for general API endpoints
 * Prevents brute force attacks and API abuse
 */
export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for authenticated admin users
  skip: (req: Request) => {
    // Add logic to skip for admin users if needed
    return false;
  },
});

/**
 * Strict rate limiter for sensitive endpoints (contact forms, auth)
 * Prevents spam and brute force attacks
 */
export const strictRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Too many attempts. Please try again in 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Very strict rate limiter for critical operations
 * Maximum protection for authentication and password resets
 */
export const criticalRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 requests per hour
  message: 'Too many failed attempts. Please try again in 1 hour.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Input sanitization middleware
 * Removes potentially dangerous characters from user input
 */
export function sanitizeInput(req: Request, res: Response, next: NextFunction) {
  // Sanitize request body
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }

  next();
}

/**
 * Recursively sanitize object properties
 */
function sanitizeObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  const sanitized: any = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      sanitized[key] = sanitizeObject(obj[key]);
    }
  }
  return sanitized;
}

/**
 * Sanitize string input
 * Removes potentially dangerous characters while preserving legitimate content
 */
function sanitizeString(value: any): any {
  if (typeof value !== 'string') {
    return value;
  }

  // Remove null bytes
  let sanitized = value.replace(/\0/g, '');

  // Remove control characters except newlines and tabs
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Limit length to prevent DoS
  if (sanitized.length > 10000) {
    sanitized = sanitized.substring(0, 10000);
  }

  return sanitized;
}

/**
 * Request size limiter middleware
 * Prevents DoS attacks via large payloads
 */
export function requestSizeLimit(req: Request, res: Response, next: NextFunction) {
  const contentLength = req.headers['content-length'];
  
  if (contentLength) {
    const size = parseInt(contentLength, 10);
    const maxSize = 10 * 1024 * 1024; // 10MB limit

    if (size > maxSize) {
      return res.status(413).json({
        error: 'Request payload too large',
        maxSize: '10MB',
      });
    }
  }

  next();
}

/**
 * Security logging middleware
 * Logs suspicious activity for monitoring
 */
export function securityLogger(req: Request, res: Response, next: NextFunction) {
  // Log suspicious patterns
  const suspiciousPatterns = [
    /(\.\.|\/etc\/|\/proc\/|\/sys\/)/i, // Path traversal
    /(union.*select|insert.*into|drop.*table)/i, // SQL injection
    /(<script|javascript:|onerror=|onload=)/i, // XSS attempts
    /(eval\(|exec\(|system\()/i, // Code injection
  ];

  const url = req.url;
  const body = JSON.stringify(req.body);
  const query = JSON.stringify(req.query);

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(url) || pattern.test(body) || pattern.test(query)) {
      console.warn('[SECURITY] Suspicious request detected:', {
        ip: req.ip,
        method: req.method,
        url: req.url,
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString(),
      });
      break;
    }
  }

  next();
}

/**
 * Configure security headers using Helmet
 * Protects against common web vulnerabilities
 */
export function configureSecurityHeaders(app: Express) {
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          imgSrc: ["'self'", "data:", "https:", "blob:"],
          fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
          connectSrc: ["'self'", "https://api.manus.im"],
          frameSrc: ["'self'"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
      frameguard: {
        action: 'deny', // Prevent clickjacking
      },
      noSniff: true, // Prevent MIME type sniffing
      xssFilter: true, // Enable XSS filter
      referrerPolicy: {
        policy: 'strict-origin-when-cross-origin',
      },
    })
  );
}

/**
 * Apply all security middleware to Express app
 */
export function applySecurityMiddleware(app: Express) {
  // Configure security headers
  configureSecurityHeaders(app);

  // Apply request size limits
  app.use(requestSizeLimit);

  // Apply input sanitization
  app.use(sanitizeInput);

  // Apply security logging
  app.use(securityLogger);

  // Apply general rate limiting to all routes
  app.use('/api/', generalRateLimiter);

  console.log('[SECURITY] Security middleware initialized');
  console.log('[SECURITY] Rate limiting: 100 requests per 15 minutes');
  console.log('[SECURITY] Request size limit: 10MB');
  console.log('[SECURITY] Input sanitization: Enabled');
  console.log('[SECURITY] Security headers: Configured');
}
