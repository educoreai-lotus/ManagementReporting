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

      const container = document.getElementById('edu-bot-container');
      const hasInitFunction = typeof window.initializeEducoreBot === 'function';

      // Token is optional - use fallback if missing
      // RAG bot expects token format but can work with fallback for development
      const token = localStorage.getItem('authToken') || localStorage.getItem('token') || localStorage.getItem('accessToken') || 'DEV_BOT_TOKEN';

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
            userId = 'DEV_BOT_USER';
          }
        }

        // Initialize chatbot exactly once with official RAG parameters
        // Container selector: RAG bot expects container with id 'edu-bot-container' (auto-detected)
        // Microservice: HR_MANAGEMENT_REPORTING is valid per approved list
        // TODO: Confirm with RAG team if container selector needs explicit parameter
        if (!botInitialized.current) {
          try {
            const initResult = window.initializeEducoreBot({
              microservice: 'HR_MANAGEMENT_REPORTING',
              userId: userId,
              token: token,
              tenantId: 'default'
            });
            
            // Verify initialization result (if returned) - bot should consider itself UI-enabled
            // RAG bot should render UI naturally based on its internal logic
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

  // TODO: Remove this temporary DOM detection indicator after diagnosis
  // Temporary indicator to detect if chatbot injects UI elements into DOM
  useEffect(() => {
    let pollCount = 0;
    const maxPolls = 20;
    const pollDelay = 250;

    const checkBotDOM = () => {
      pollCount++;

      // Detection logic: check for chatbot DOM elements
      let botFound = false;

      // A) Check if container has children
      const container = document.getElementById('edu-bot-container');
      if (container && container.children.length > 0) {
        botFound = true;
      }

      // B) Check for iframe with RAG domain
      if (!botFound) {
        const iframes = document.querySelectorAll('iframe');
        for (const iframe of iframes) {
          if (iframe.src && iframe.src.includes('rag-production-3a4c.up.railway.app')) {
            botFound = true;
            break;
          }
        }
      }

      // C) Check for elements with bot-related id/class
      if (!botFound) {
        const botKeywords = ['edu-bot', 'chat', 'widget', 'bot'];
        const allElements = document.querySelectorAll('*');
        for (const el of allElements) {
          const id = el.id?.toLowerCase() || '';
          const className = el.className?.toLowerCase() || '';
          if (botKeywords.some(keyword => id.includes(keyword) || className.includes(keyword))) {
            botFound = true;
            break;
          }
        }
      }

      // Create or update indicator
      let indicator = document.getElementById('bot-dom-indicator');
      if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'bot-dom-indicator';
        indicator.style.position = 'fixed';
        indicator.style.bottom = '16px';
        indicator.style.left = '16px';
        indicator.style.padding = '4px 8px';
        indicator.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        indicator.style.color = 'white';
        indicator.style.fontSize = '11px';
        indicator.style.fontFamily = 'monospace';
        indicator.style.borderRadius = '4px';
        indicator.style.zIndex = '2147483646';
        indicator.style.pointerEvents = 'none';
        document.body.appendChild(indicator);
      }

      indicator.textContent = botFound ? 'BOT DOM: FOUND' : 'BOT DOM: NOT FOUND';

      // Continue polling if not found and haven't exceeded max polls
      if (!botFound && pollCount < maxPolls) {
        setTimeout(checkBotDOM, pollDelay);
      }
    };

    // Start polling after a short delay to allow initialization
    setTimeout(checkBotDOM, 500);
  }, []); // Empty dependency array - run once on mount

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

