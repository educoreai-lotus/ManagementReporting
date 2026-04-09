const getNAuthBaseUrl = () => {
  const baseUrl = import.meta.env.VITE_NAUTH_BASE_URL;
  if (typeof baseUrl !== 'string' || baseUrl.trim() === '') {
    throw new Error('VITE_NAUTH_BASE_URL is not configured');
  }
  return baseUrl.replace(/\/$/, '');
};

const getNAuthFrontendUrl = () => {
  const frontendUrl = import.meta.env.VITE_NAUTH_FRONTEND_URL;
  if (typeof frontendUrl !== 'string' || frontendUrl.trim() === '') {
    throw new Error('VITE_NAUTH_FRONTEND_URL is not configured');
  }
  return frontendUrl.replace(/\/$/, '');
};

export const callNAuthLogout = async () => {
  const baseUrl = getNAuthBaseUrl();
  const response = await fetch(`${baseUrl}/auth/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`nAuth logout failed with status ${response.status}`);
  }
};

export const clearAccessToken = () => {
  localStorage.removeItem('authToken');
};

export const redirectToNAuthLogin = () => {
  const frontendUrl = getNAuthFrontendUrl();
  window.location.href = `${frontendUrl}/login`;
};

export const logout = async (options = {}) => {
  console.log('[Logout] Logout flow started');

  try {
    await callNAuthLogout();
    console.log('[Logout] nAuth logout success');
  } catch (error) {
    console.error('[Logout] nAuth logout failed (continuing):', error.message);
  } finally {
    clearAccessToken();
    console.log('[Logout] Local access token cleared');

    if (options.redirect !== false) {
      redirectToNAuthLogin();
    }
  }
};
