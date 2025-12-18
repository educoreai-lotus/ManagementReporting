import { useEffect, useRef } from 'react';
import Header from './Header';
import { useTheme } from '../../context/ThemeContext';

const Layout = ({ children }) => {
  const { theme } = useTheme();
  const botInitialized = useRef(false);

  useEffect(() => {
    console.log('🤖 RAG: Container creation check');
    const existing = document.getElementById('edu-bot-container');
    if (!existing) {
      console.log('🤖 RAG: Creating container (fallback)');
      const div = document.createElement('div');
      div.id = 'edu-bot-container';
      document.body.appendChild(div);
    } else {
      console.log('🤖 RAG: Container already exists');
    }
  }, []);

  useEffect(() => {
    console.log('🤖 RAG INIT EFFECT RUNNING');
    
    // Prevent multiple initializations
    if (botInitialized.current) {
      console.log('🤖 RAG: Already initialized, skipping');
      return;
    }

    // Retry mechanism: token-optional initialization (treat token gating as TRUE by default)
    let attemptCount = 0;
    const maxAttempts = 40;
    const retryDelay = 250;

    const tryInitialize = () => {
      attemptCount++;
      console.log(`🤖 RAG: Attempt #${attemptCount}/${maxAttempts}`);

      // Ensure DOM is fully ready - RAG bot needs complete page context
      const isPageReady = document.readyState === 'complete' || document.readyState === 'interactive';
      if (!isPageReady) {
        console.log('🤖 RAG: DOM not ready, retrying...');
        if (attemptCount < maxAttempts) {
          setTimeout(tryInitialize, retryDelay);
        }
        return;
      }

      const container = document.getElementById('edu-bot-container');
      const hasInitFunction = typeof window.initializeEducoreBot === 'function';

      console.log('🤖 RAG: Container exists?', !!container);
      console.log('🤖 RAG: Init function exists?', hasInitFunction);

      // Only initialize if container exists (chatbot only in Dashboard)
      if (!container) {
        console.log('🤖 RAG STOP: Container not found');
        if (attemptCount < maxAttempts) {
          setTimeout(tryInitialize, retryDelay);
        }
        return;
      }

      // Token is optional - use fallback if missing
      // RAG bot expects token format but can work with fallback for development
      const token = localStorage.getItem('authToken') || localStorage.getItem('token') || localStorage.getItem('accessToken') || 'DEV_BOT_TOKEN';

      console.log('🤖 RAG: Token retrieved:', token ? 'YES' : 'NO');

      // Wait for container and script function - ensure app is fully ready
      if (container && hasInitFunction) {

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
            console.warn('🤖 RAG: Could not parse JWT, using fallback user');
            userId = 'DEV_BOT_USER';
          }
        }

        console.log('🤖 RAG USER OK:', userId);

        // Initialize chatbot exactly once with official RAG parameters
        if (!botInitialized.current) {
          try {
            console.log('🤖 RAG INITIALIZING BOT...');
            window.initializeEducoreBot({
              microservice: 'HR_MANAGEMENT_REPORTING',
              userId: userId,
              token: token,
              tenantId: 'default'
            });
            
            console.log('✅ RAG: initializeEducoreBot called successfully');
            botInitialized.current = true;

            // Check DOM after 2 seconds
            setTimeout(() => {
              const containerCheck = document.getElementById('edu-bot-container');
              console.log('🤖 RAG CHECK DOM (2s later):', containerCheck);
              console.log('🤖 RAG Container children:', containerCheck?.children.length || 0);
              console.log('🤖 RAG Container innerHTML length:', containerCheck?.innerHTML.length || 0);
            }, 2000);

            return; // Stop retrying once initialized
          } catch (error) {
            console.error('❌ RAG ERROR during initialization:', error);
            // Continue retrying if initialization fails
          }
        } else {
          return; // Already initialized
        }
      }

      // Load bot script if not already loaded (only once)
      if (!document.getElementById('edu-bot-script') && !botInitialized.current) {
        console.log('🤖 RAG: Loading script...');
        const script = document.createElement('script');
        script.id = 'edu-bot-script';
        script.src = 'https://rag-production-3a4c.up.railway.app/embed/bot.js';
        script.async = true;
        
        script.onload = () => {
          console.log('✅ RAG SCRIPT LOADED');
          if (!window.initializeEducoreBot) {
            console.error('❌ RAG ERROR: initializeEducoreBot NOT FOUND after script load');
          }
        };
        
        script.onerror = () => {
          console.error('❌ RAG SCRIPT FAILED TO LOAD');
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

