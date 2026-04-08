/**
 * Test Authentication Helper
 * For local testing without full auth service
 * 
 * IMPORTANT: Remove or disable this in production!
 */

// Set a test token for local development
export const setTestToken = (token = 'test-token-for-local-development') => {
  localStorage.setItem('authToken', token);
  console.warn('⚠️ Using test authentication token for local development');
};

// Get current token
export const getTestToken = () => {
  return localStorage.getItem('authToken');
};

// Clear test token
export const clearTestToken = () => {
  localStorage.removeItem('authToken');
};

// Check if we're in development mode
export const isDevelopment = () => {
  return import.meta.env.DEV || import.meta.env.MODE === 'development';
};

