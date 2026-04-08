import { auditLogger } from '../../infrastructure/services/AuditLogger.js';
import { incidentResponse } from '../../infrastructure/services/IncidentResponse.js';

export const authorizeAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.isSystemAdmin !== true) {
    const userId = req.user.directoryUserId || req.user.userId || req.user.sub;
    
    // Log unauthorized access attempt
    auditLogger.logAccess(userId, req.path, 'denied');

    // Detect security incident
    incidentResponse.detectIncident({
      type: 'unauthorized_access',
      severity: 'high',
      description: `Unauthorized access attempt by user ${userId} to ${req.path}`,
      affectedSystems: ['management-reporting-api'],
      detectionTime: new Date().toISOString()
    });

    return res.status(403).json({
      error: 'Access denied',
      message: 'System Administrator role required'
    });
  }

  // Log authorized access
  auditLogger.logAccess(
    req.user.directoryUserId || req.user.userId || req.user.sub,
    req.path,
    'granted'
  );

  next();
};

