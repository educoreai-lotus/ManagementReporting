import { useEffect, useRef } from 'react';
import Header from './Header';
import { useTheme } from '../../context/ThemeContext';

const Layout = ({ children }) => {
  const { theme } = useTheme();
  const botInitialized = useRef(false);

  // Create fallback container for chatbot (RAG bot may look for edu-bot-container)
  useEffect(() => {
    let fallbackContainer = document.getElementById('edu-bot-container');
    if (!fallbackContainer) {
      fallbackContainer = document.createElement('div');
      fallbackContainer.id = 'edu-bot-container';
      fallbackContainer.style.display = 'none'; // Hidden, will move content to Dashboard
      document.body.appendChild(fallbackContainer);
    }
  }, []);

  useEffect(() => {
    // Prevent multiple initializations
    if (botInitialized.current) {
      return;
    }

    // Retry mechanism: token-optional initialization (treat token gating as TRUE by default)
    let attemptCount = 0;
    const maxAttempts = 40;
    const retryDelay = 250;

    const tryInitialize = () => {
      attemptCount++;

      // Ensure DOM is fully ready - RAG bot needs complete page context
      const isPageReady = document.readyState === 'complete' || document.readyState === 'interactive';
      if (!isPageReady) {
        if (attemptCount < maxAttempts) {
          setTimeout(tryInitialize, retryDelay);
        }
        return;
      }

      // Check for Dashboard container (chatbot only renders in Dashboard)
      const dashboardContainer = document.getElementById('edu-bot-dashboard-container');
      const fallbackContainer = document.getElementById('edu-bot-container');
      const hasInitFunction = typeof window.initializeEducoreBot === 'function';

      // Only initialize if Dashboard container exists (chatbot only in Dashboard)
      if (!dashboardContainer) {
        if (attemptCount < maxAttempts) {
          setTimeout(tryInitialize, retryDelay);
        }
        return;
      }

      // Token is optional - use fallback if missing
      // RAG bot expects token format but can work with fallback for development
      const token = localStorage.getItem('authToken') || localStorage.getItem('token') || localStorage.getItem('accessToken') || 'DEV_BOT_TOKEN';

      // Wait for Dashboard container and script function - ensure app is fully ready
      if (dashboardContainer && hasInitFunction) {

        // Extract userId from JWT if possible, otherwise use fallback
        // RAG expects valid userId format - extract from token or use fallback
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

        // Initialize chatbot exactly once with official RAG parameters
        // Chatbot will render into Dashboard container
        if (!botInitialized.current) {
          try {
            const initResult = window.initializeEducoreBot({
              microservice: 'HR_MANAGEMENT_REPORTING',
              userId: userId,
              token: token,
              tenantId: 'default'
            });
            
            // CRITICAL: Do NOT move chatbot DOM elements - React controls them
            // Chatbot will render into dashboardContainer naturally
            // Visibility will be controlled via CSS only (no DOM manipulation)
            
            botInitialized.current = true;
            return; // Stop retrying once initialized
          } catch (error) {
            // Continue retrying if initialization fails
          }
        } else {
          return; // Already initialized
        }
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

