/**
 * RAG chatbot init for Management Reporting.
 * Passes only localStorage.authToken (nAuth access token) and decoded metadata.
 * Does not log tokens or JWT payloads.
 */

const MICROSERVICE = 'HR_MANAGEMENT_REPORTING';
const AUTH_TOKEN_KEY = 'authToken';
const MAX_INIT_ATTEMPTS = 40;
const INIT_RETRY_MS = 250;

let lastInitializedToken = null;
let initInFlight = false;

const decodeBase64Url = (segment) => {
  const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + '='.repeat(padLength);
  return atob(padded);
};

const parseJwtPayload = (token) => {
  const parts = token.split('.');
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
    return null;
  }

  try {
    const json = decodeBase64Url(parts[1]);
    const payload = JSON.parse(json);
    if (!payload || typeof payload !== 'object') {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
};

const extractDirectoryUserId = (payload) => {
  const candidates = [
    payload.directoryUserId,
    payload.directory_user_id,
    payload.userId,
  ];

  for (const value of candidates) {
    if (typeof value === 'string' && value.trim() !== '') {
      return value.trim();
    }
  }
  return null;
};

const extractOrganizationId = (payload) => {
  const candidates = [payload.organizationId, payload.organization_id];
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim() !== '') {
      return value.trim();
    }
  }
  return null;
};

const isExpired = (payload) => {
  if (typeof payload.exp !== 'number') {
    return false;
  }
  return payload.exp * 1000 <= Date.now();
};

const getAuthToken = () => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (typeof token !== 'string' || token.trim() === '') {
    return null;
  }
  return token.trim();
};

const notifyTokenUpdate = (authToken) => {
  if (typeof window.updateEducoreBotAuth === 'function') {
    window.updateEducoreBotAuth({ token: authToken });
    return true;
  }
  if (typeof window.updateEducoreBotToken === 'function') {
    window.updateEducoreBotToken(authToken);
    return true;
  }
  if (window.educoreBot && typeof window.educoreBot.updateToken === 'function') {
    window.educoreBot.updateToken(authToken);
    return true;
  }
  return false;
};

const callInitialize = ({ authToken, directoryUserId, organizationId }) => {
  if (typeof window.initializeEducoreBot !== 'function') {
    return false;
  }

  const tenantId = organizationId || 'default';
  const tenantIdMode = organizationId ? 'organizationId' : 'default_fallback';

  window.initializeEducoreBot({
    microservice: MICROSERVICE,
    userId: directoryUserId,
    token: authToken,
    tenantId,
  });

  lastInitializedToken = authToken;

  console.info('[RAG Bot] initialized', {
    microservice: MICROSERVICE,
    hasToken: true,
    tokenLength: authToken.length,
    hasDirectoryUserId: Boolean(directoryUserId),
    hasOrganizationId: Boolean(organizationId),
    tenantIdMode,
  });

  return true;
};

/**
 * Initialize (or skip) the RAG widget using localStorage.authToken only.
 * @param {{ force?: boolean }} [options]
 * @returns {boolean} true if initializeEducoreBot was called
 */
export const initializeRagBot = (options = {}) => {
  const { force = false } = options;
  const authToken = getAuthToken();

  if (!authToken) {
    console.warn('[RAG Bot] init skipped: missing authToken');
    return false;
  }

  if (!force && authToken === lastInitializedToken) {
    return true;
  }

  const payload = parseJwtPayload(authToken);
  if (!payload) {
    console.warn('[RAG Bot] init skipped: malformed token');
    return false;
  }

  if (isExpired(payload)) {
    console.warn('[RAG Bot] init skipped: expired token');
    return false;
  }

  const directoryUserId = extractDirectoryUserId(payload);
  if (!directoryUserId) {
    console.warn('[RAG Bot] init skipped: missing directoryUserId');
    return false;
  }

  const organizationId = extractOrganizationId(payload);

  return callInitialize({
    authToken,
    directoryUserId,
    organizationId,
  });
};

/**
 * Wait for bot.js to expose initializeEducoreBot, then init.
 */
export const ensureRagBotInitialized = () => {
  if (initInFlight) {
    return;
  }

  if (typeof window.initializeEducoreBot === 'function') {
    initializeRagBot();
    return;
  }

  initInFlight = true;
  let attempts = 0;

  const timer = window.setInterval(() => {
    attempts += 1;

    if (typeof window.initializeEducoreBot === 'function') {
      window.clearInterval(timer);
      initInFlight = false;
      initializeRagBot();
      return;
    }

    if (attempts >= MAX_INIT_ATTEMPTS) {
      window.clearInterval(timer);
      initInFlight = false;
      console.warn('[RAG Bot] init skipped: initializeEducoreBot unavailable');
    }
  }, INIT_RETRY_MS);
};

/**
 * Called when localStorage.authToken is rotated (e.g. X-New-Access-Token).
 * Prefers a dedicated update API if present; otherwise reinitializes when safe.
 */
export const refreshRagBotAuth = () => {
  const authToken = getAuthToken();
  if (!authToken) {
    console.warn('[RAG Bot] init skipped: missing authToken');
    return;
  }

  if (authToken === lastInitializedToken) {
    return;
  }

  console.info('[RAG Bot] token updated, refreshing bot auth');

  if (notifyTokenUpdate(authToken)) {
    lastInitializedToken = authToken;
    return;
  }

  // No dedicated update API on the embed widget — re-init with new token.
  // Limitation: widget may not hot-swap Authorization mid-session without re-init.
  initializeRagBot({ force: true });
};
