import { useEffect, useRef } from 'react';
import Header from './Header';
import { useTheme } from '../../context/ThemeContext';

const Layout = ({ children }) => {
  const { theme } = useTheme();
  const botInitialized = useRef(false);

  // Create chatbot container in document.body to avoid layout overflow clipping
  useEffect(() => {
    if (!document.getElementById('edu-bot-container')) {
      const container = document.createElement('div');
      container.id = 'edu-bot-container';
      document.body.appendChild(container);
    }
  }, []);

  useEffect(() => {
    // Prevent multiple initializations
    if (botInitialized.current) {
      return;
    }

    // Retry mechanism to handle timing issues: waits for token, container, and script to be ready
    let attemptCount = 0;
    const maxAttempts = 20;
    const retryDelay = 250; // 250ms between attempts

    const tryInitialize = () => {
      attemptCount++;

      // Check all required conditions
      const token = localStorage.getItem('authToken');
      const container = document.getElementById('edu-bot-container');
      const hasInitFunction = typeof window.initializeEducoreBot === 'function';

      // If all conditions are met, proceed with initialization
      if (token && container && hasInitFunction) {
        // Extract userId from JWT token (if possible)
        let userId = 'default-user';
        try {
          const tokenParts = token.split('.');
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            userId = payload.userId || payload.sub || payload.id || token;
          } else {
            userId = token;
          }
        } catch (error) {
          userId = token;
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
          } catch (error) {
            // Silent error handling - retry will continue if initialization fails
          }
        }
        return; // Stop retrying once initialized
      }

      // If conditions not met and haven't exceeded max attempts, retry
      if (attemptCount < maxAttempts) {
        setTimeout(tryInitialize, retryDelay);
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

