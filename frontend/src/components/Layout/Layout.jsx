import { useEffect, useRef } from 'react';
import Header from './Header';
import { useTheme } from '../../context/ThemeContext';

const Layout = ({ children }) => {
  const { theme } = useTheme();
  const botInitialized = useRef(false);

  useEffect(() => {
    // Initialize RAG Chatbot only after authentication
    const initializeBot = () => {
      const token = localStorage.getItem('authToken');
      
      // token MUST exist
      if (!token) {
        console.warn('[Chatbot] Token not found, skipping bot initialization');
        return;
      }

      // Extract userId from JWT token (if possible)
      // JWT format: header.payload.signature - we need the payload
      let userId = 'default-user';
      try {
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          userId = payload.userId || payload.sub || payload.id || token; // Fallback to token if no userId in payload
        } else {
          userId = token; // Not a JWT, use token as userId
        }
      } catch (error) {
        // Token parsing failed, use token as userId
        userId = token;
      }

      // Prevent multiple initializations
      if (botInitialized.current) {
        return;
      }

      // Load bot script if not already loaded
      if (!document.getElementById('edu-bot-script')) {
        const script = document.createElement('script');
        script.id = 'edu-bot-script';
        script.src = 'https://rag-production-3a4c.up.railway.app/embed/bot.js';
        script.async = true;
        script.onload = () => {
          // Initialize bot after script loads
          if (window.initializeEducoreBot) {
            try {
              window.initializeEducoreBot({
                microservice: 'HR_MANAGEMENT_REPORTING',
                userId: userId,
                token: token,
                tenantId: 'default' // Optional, default value
              });
              botInitialized.current = true;
              console.log('[Chatbot] Bot initialized successfully');
            } catch (error) {
              console.error('[Chatbot] Failed to initialize bot:', error);
            }
          } else {
            console.error('[Chatbot] initializeEducoreBot function not found');
          }
        };
        script.onerror = () => {
          console.error('[Chatbot] Failed to load bot script');
        };
        document.body.appendChild(script);
      } else if (window.initializeEducoreBot && !botInitialized.current) {
        // Script already loaded, just initialize
        try {
          window.initializeEducoreBot({
            microservice: 'HR_MANAGEMENT_REPORTING',
            userId: userId,
            token: token,
            tenantId: 'default'
          });
          botInitialized.current = true;
          console.log('[Chatbot] Bot initialized successfully (script already loaded)');
        } catch (error) {
          console.error('[Chatbot] Failed to initialize bot:', error);
        }
      }
    };

    // Initialize bot when component mounts and token is available
    initializeBot();
  }, []); // Empty dependency array - initialize once on mount

  return (
    <div className={`min-h-screen bg-neutral-50 dark:bg-neutral-800 ${theme === 'dark' ? 'dark' : ''}`}>
      <Header />
      <main className="container mx-auto px-6 pt-24 pb-8">
        {children}
      </main>
      {/* RAG Chatbot container - widget will be injected here */}
      <div id="edu-bot-container"></div>
    </div>
  );
};

export default Layout;

