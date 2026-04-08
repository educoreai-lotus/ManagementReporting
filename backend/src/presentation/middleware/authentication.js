import { auditLogger } from '../../infrastructure/services/AuditLogger.js';
import axios from 'axios';

const N_AUTH_ACTION =
  'Route this request to nAuth service only for access token validation and session continuity decision.';

function extractValidationPayload(rawData) {
  const parsed = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
  if (!parsed || typeof parsed !== 'object') {
    return parsed;
  }

  if (parsed.response && typeof parsed.response === 'object') {
    return parsed.response;
  }

  if (parsed.data && typeof parsed.data === 'object') {
    if (parsed.data.response && typeof parsed.data.response === 'object') {
      return parsed.data.response;
    }
    return parsed.data;
  }

  return parsed;
}

async function postAuthValidationToCoordinator(envelope) {
  const coordinatorUrl = process.env.COORDINATOR_API_URL;
  if (!coordinatorUrl) {
    throw new Error('COORDINATOR_API_URL environment variable is required');
  }

  const cleanCoordinatorUrl = coordinatorUrl.replace(/\/$/, '');
  const url = `${cleanCoordinatorUrl}/request`;

  return axios.post(url, envelope, {
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 10000,
  });
}

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      auditLogger.logTokenValidation(null, 'failure', {
        reason: 'missing_bearer_token',
        ipAddress: req.ip,
      });
      return res.status(401).json({ error: 'Missing bearer token' });
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      auditLogger.logTokenValidation(null, 'failure', {
        reason: 'empty_bearer_token',
        ipAddress: req.ip,
      });
      return res.status(401).json({ error: 'Invalid bearer token' });
    }

    const envelope = {
      requester_service: 'ManagementReporting',
      payload: {
        action: N_AUTH_ACTION,
        access_token: token,
        route: req.originalUrl || req.path || '',
        method: req.method || 'GET',
      },
      response: {
        valid: false,
        reason: '',
        auth_state: '',
        directory_user_id: '',
        organization_id: '',
        new_access_token: '',
        primary_role: '',
        is_system_admin: false,
      },
    };

    const coordinatorResponse = await postAuthValidationToCoordinator(envelope);
    const validation = extractValidationPayload(coordinatorResponse?.data);

    if (!validation || validation.valid !== true) {
      const responseData = coordinatorResponse?.data;
      const parsedRoot = responseData && typeof responseData === 'object' ? responseData : null;
      const parsedData = parsedRoot?.data && typeof parsedRoot.data === 'object' ? parsedRoot.data : null;

      console.warn('[AuthValidationDebug] Validation rejected', {
        path: req.originalUrl || req.path || '',
        method: req.method || 'GET',
        topLevelKeys: parsedRoot ? Object.keys(parsedRoot) : [],
        hasResponse: !!(parsedRoot && parsedRoot.response && typeof parsedRoot.response === 'object'),
        hasData: !!parsedData,
        hasDataResponse: !!(parsedData && parsedData.response && typeof parsedData.response === 'object'),
        parsedValid: validation?.valid,
        parsedReason: validation?.reason || '',
      });

      auditLogger.logTokenValidation(null, 'failure', {
        reason: validation?.reason || 'invalid_token',
        ipAddress: req.ip,
      });
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const directoryUserId = validation.directory_user_id || '';
    const organizationId = validation.organization_id || '';
    const primaryRole = validation.primary_role || '';
    const isSystemAdmin = validation.is_system_admin === true;

    req.user = {
      userId: directoryUserId || undefined,
      sub: directoryUserId || undefined,
      directoryUserId,
      organizationId,
      primaryRole,
      isSystemAdmin,
    };

    if (typeof validation.new_access_token === 'string' && validation.new_access_token.trim() !== '') {
      res.setHeader('X-New-Access-Token', validation.new_access_token.trim());
    }

    auditLogger.logTokenValidation(directoryUserId || null, 'success');
    return next();
  } catch (error) {
    auditLogger.logTokenValidation(null, 'failure', {
      reason: 'coordinator_validation_failed',
      error: error.message,
      ipAddress: req.ip,
    });
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

