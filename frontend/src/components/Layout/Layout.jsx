import { useEffect, useRef } from 'react';
import Header from './Header';
import { useTheme } from '../../context/ThemeContext';

const Layout = ({ children }) => {
  const { theme } = useTheme();
  const botInitialized = useRef(false);

  // Create chatbot container in document.body with fixed positioning for floating widget visibility
  useEffect(() => {
    let container = document.getElementById('edu-bot-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'edu-bot-container';
      // Ensure container is visible and not clipped by layout overflow
      container.style.position = 'fixed';
      container.style.bottom = '16px';
      container.style.right = '16px';
      container.style.zIndex = '2147483647';
      container.style.pointerEvents = 'auto';
      document.body.appendChild(container);
    }
  }, []);

  // Create debug badge for initialization status (temporary, easy to remove)
  useEffect(() => {
    let debugBadge = document.getElementById('edu-bot-debug');
    if (!debugBadge) {
      debugBadge = document.createElement('div');
      debugBadge.id = 'edu-bot-debug';
      debugBadge.style.position = 'fixed';
      debugBadge.style.top = '16px';
      debugBadge.style.right = '16px';
      debugBadge.style.padding = '4px 8px';
      debugBadge.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
      debugBadge.style.color = 'white';
      debugBadge.style.fontSize = '11px';
      debugBadge.style.fontFamily = 'monospace';
      debugBadge.style.borderRadius = '4px';
      debugBadge.style.zIndex = '2147483647';
      debugBadge.style.pointerEvents = 'none';
      debugBadge.textContent = 'BOT: container ok';
      document.body.appendChild(debugBadge);
    }
  }, []);

  useEffect(() => {
    // Prevent multiple initializations
    if (botInitialized.current) {
      return;
    }

    const updateDebug = (text) => {
      const badge = document.getElementById('edu-bot-debug');
      if (badge) badge.textContent = text;
    };

    // Retry mechanism: token-optional initialization (treat token gating as TRUE by default)
    let attemptCount = 0;
    const maxAttempts = 40;
    const retryDelay = 250;

    const tryInitialize = () => {
      attemptCount++;

      const container = document.getElementById('edu-bot-container');
      const hasInitFunction = typeof window.initializeEducoreBot === 'function';

      // Token is optional - use fallback if missing
      const token = localStorage.getItem('authToken') || localStorage.getItem('token') || localStorage.getItem('accessToken') || 'DEV_BOT_TOKEN';

      // Wait for container and script function
      if (container && hasInitFunction) {
        updateDebug('BOT: initializing');

        // Extract userId from JWT if possible, otherwise use fallback
        let userId = 'DEV_BOT_USER';
        if (token && token !== 'DEV_BOT_TOKEN') {
          try {
            const tokenParts = token.split('.');
            if (tokenParts.length === 3) {
              const payload = JSON.parse(atob(tokenParts[1]));
              userId = payload.userId || payload.sub || payload.id || 'DEV_BOT_USER';
            }
          } catch (error) {
            userId = 'DEV_BOT_USER';
          }
        }

        // Initialize chatbot exactly once
        if (!botInitialized.current) {
          try {
            window.initializeEducoreBot({
              microservice: 'HR_MANAGEMENT_REPORTING',
              userId: userId,
              token: token,
              tenantId: 'default'
            });
            botInitialized.current = true;
            updateDebug('BOT: initialized');
            return; // Stop retrying once initialized
          } catch (error) {
            updateDebug('BOT: init failed');
            // Continue retrying if initialization fails
          }
        } else {
          return; // Already initialized
        }
      } else if (container && !hasInitFunction) {
        updateDebug('BOT: waiting for script');
      }

      // Load bot script if not already loaded (only once)
      if (!document.getElementById('edu-bot-script') && !botInitialized.current) {
        const script = document.createElement('script');
        script.id = 'edu-bot-script';
        script.src = 'https://rag-production-3a4c.up.railway.app/embed/bot.js';
        script.async = true;
        script.onerror = () => {
          // Silent error handling - retry will continue
        };
        document.body.appendChild(script);
      }

      // If conditions not met and haven't exceeded max attempts, retry
      if (attemptCount < maxAttempts && !botInitialized.current) {
        setTimeout(tryInitialize, retryDelay);
      }
    };

    // Start retry mechanism
    tryInitialize();
  }, []); // Empty dependency array - initialize once on mount

  return (
    <div className={`min-h-screen bg-neutral-50 dark:bg-neutral-800 ${theme === 'dark' ? 'dark' : ''}`}>
      <Header />
      <main className="container mx-auto px-6 pt-24 pb-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;

