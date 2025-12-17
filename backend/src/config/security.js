/**
 * Security Configuration
 * Centralized security settings and policies
 */

export const securityConfig = {
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '2h',
    algorithm: 'HS256'
  },

  // TLS/HTTPS Configuration
  tls: {
    minVersion: 'TLSv1.3',
    requireTLS: true,
    certificateValidation: true
  },

  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  },

  // Rate Limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    // Increased from 100 to 2000 to allow chart transcription workflows
    // Frontend makes multiple requests for charts, transcriptions, etc.
    max: process.env.NODE_ENV === 'development' ? 2000 : 2000 // limit each IP to requests per windowMs
  },

  // Data Retention
  dataRetention: {
    cacheTTL: 5184000, // 60 days in seconds
    auditLogRetention: 90, // days
    applicationLogRetention: 30 // days
  },

  // Security Headers
  securityHeaders: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    // CSP: Allows approved RAG chatbot script from rag-production-3a4c.up.railway.app
    'Content-Security-Policy': "default-src 'self'; script-src 'self' https://rag-production-3a4c.up.railway.app; connect-src 'self' https://rag-production-3a4c.up.railway.app; frame-src https://rag-production-3a4c.up.railway.app"
  }
};

