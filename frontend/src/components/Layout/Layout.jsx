import { useEffect, useRef } from 'react';
import Header from './Header';
import { useTheme } from '../../context/ThemeContext';
import { debugRAGBot } from '../../utils/ragBotDebug';

/**
 * Setup toggle functionality for RAG bot button
 * When clicking the bubble button:
 * - If chat is open → close it
 * - If chat is closed → open it
 */
function setupBotToggle() {
  const container = document.getElementById('edu-bot-container');
  if (!container) {
    console.log('🤖 RAG Toggle: Container not found, retrying...');
    setTimeout(setupBotToggle, 500);
    return;
  }

  // Track chat state
  let chatIsOpen = false;

  // Find the bot button
  const findBotButton = () => {
    // Find button that's fixed and in bottom-right area
    const buttons = container.querySelectorAll('button');
    for (const btn of buttons) {
      const rect = btn.getBoundingClientRect();
      const style = window.getComputedStyle(btn);
      // Button should be visible and positioned fixed
      if (rect.width > 0 && rect.height > 0 && 
          (style.position === 'fixed' || rect.bottom > window.innerHeight - 100)) {
        return btn;
      }
    }
    return null;
  };

  // Find the chat panel
  const findChatPanel = () => {
    // Look for panel-like elements (not the button)
    const allElements = container.querySelectorAll('*');
    for (const el of allElements) {
      if (el.tagName === 'BUTTON') continue;
      
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      
      // Panel should be visible, have width/height, and be positioned
      if (rect.width > 200 && rect.height > 200 && 
          style.display !== 'none' && 
          style.visibility !== 'hidden' &&
          (style.position === 'fixed' || style.position === 'absolute')) {
        return el;
      }
    }
    return null;
  };

  // Check if chat is currently open
  const checkChatState = () => {
    const panel = findChatPanel();
    const wasOpen = chatIsOpen;
    chatIsOpen = panel && panel.getBoundingClientRect().width > 200;
    
    if (wasOpen !== chatIsOpen) {
      console.log('🤖 RAG Toggle: Chat state changed to', chatIsOpen ? 'OPEN' : 'CLOSED');
    }
    
    return chatIsOpen;
  };

  const button = findBotButton();
  if (!button) {
    console.log('🤖 RAG Toggle: Button not found yet, retrying...');
    setTimeout(setupBotToggle, 500);
    return;
  }

  // Check if handler already attached
  if (button.dataset.toggleHandlerAttached === 'true') {
    return;
  }

  console.log('🤖 RAG Toggle: Setting up toggle functionality');

  // Use MutationObserver to track panel visibility
  const observer = new MutationObserver(() => {
    checkChatState();
  });

  observer.observe(container, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'class']
  });

  // Initial state check
  setTimeout(() => {
    checkChatState();
  }, 500);

  // Add toggle handler - intercept click before bot's handler
  button.addEventListener('click', (e) => {
    // Check current state before bot's handler runs
    const currentlyOpen = checkChatState();
    
    console.log('🤖 RAG Toggle: Button clicked, chat is currently', currentlyOpen ? 'OPEN' : 'CLOSED');

    if (currentlyOpen) {
      // Chat is open, we want to close it
      // Stop the event from opening it again
      e.stopImmediatePropagation();
      
      // Find and click close button
      setTimeout(() => {
        const closeSelectors = [
          'button[aria-label*="close" i]',
          'button[aria-label*="Close" i]',
          '[class*="close" i]',
          'button:has(svg[class*="x" i])',
          'button:has(svg[class*="X" i])'
        ];

        let closeButton = null;
        for (const selector of closeSelectors) {
          try {
            closeButton = container.querySelector(selector);
            if (closeButton) break;
          } catch (e) {
            // Invalid selector, skip
          }
        }

        if (closeButton) {
          console.log('🤖 RAG Toggle: Clicking close button');
          closeButton.click();
        } else {
          // Fallback: hide panel directly
          const panel = findChatPanel();
          if (panel) {
            console.log('🤖 RAG Toggle: Hiding panel directly');
            panel.style.display = 'none';
            chatIsOpen = false;
          }
        }
      }, 100);
    } else {
      // Chat is closed, let bot's handler open it (don't prevent default)
      console.log('🤖 RAG Toggle: Chat is closed, allowing bot to open it');
    }
  }, true); // Capture phase - runs before bot's handler

  button.dataset.toggleHandlerAttached = 'true';
  console.log('✅ RAG Toggle: Toggle functionality attached');
}

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
    const maxAttempts = 50; // Increased attempts
    const retryDelay = 300; // Slightly longer delay

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
      const scriptLoaded = !!document.getElementById('edu-bot-script') || !!window.EDUCORE_BOT_LOADED;

      console.log('🤖 RAG: Container exists?', !!container);
      console.log('🤖 RAG: Init function exists?', hasInitFunction);
      console.log('🤖 RAG: Script loaded?', scriptLoaded);
      console.log('🤖 RAG: window.initializeEducoreBot type:', typeof window.initializeEducoreBot);

      // Ensure container exists (create if missing)
      if (!container) {
        console.log('🤖 RAG: Container not found, creating...');
        const newContainer = document.createElement('div');
        newContainer.id = 'edu-bot-container';
        document.body.appendChild(newContainer);
        console.log('🤖 RAG: Container created');
        // Continue to next attempt
        if (attemptCount < maxAttempts) {
          setTimeout(tryInitialize, retryDelay);
        }
        return;
      }

      // Load bot script if not already loaded (check both script tag and global flag)
      if (!scriptLoaded && !document.getElementById('edu-bot-script')) {
        console.log('🤖 RAG: Loading script dynamically...');
        const script = document.createElement('script');
        script.id = 'edu-bot-script';
        script.src = 'https://rag-production-3a4c.up.railway.app/embed/bot.js';
        script.async = true;
        
        script.onload = () => {
          console.log('✅ RAG SCRIPT LOADED (dynamic)');
          // Retry initialization after script loads
          setTimeout(tryInitialize, 500);
        };
        
        script.onerror = () => {
          console.error('❌ RAG SCRIPT FAILED TO LOAD');
          if (attemptCount < maxAttempts) {
            setTimeout(tryInitialize, retryDelay * 2);
          }
        };
        
        document.body.appendChild(script);
        return; // Wait for script to load
      }

      // Wait for init function to be available
      if (!hasInitFunction) {
        console.log('🤖 RAG: Init function not available yet, waiting...');
        if (attemptCount < maxAttempts) {
          setTimeout(tryInitialize, retryDelay);
        }
        return;
      }

      // Token is optional - use fallback if missing
      // RAG bot expects token format but can work with fallback for development
      const token = localStorage.getItem('authToken') || localStorage.getItem('token') || localStorage.getItem('accessToken') || 'DEV_BOT_TOKEN';

      console.log('🤖 RAG: Token retrieved:', token ? 'YES' : 'NO');

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
      if (!botInitialized.current && container && hasInitFunction) {
        try {
          console.log('🤖 RAG INITIALIZING BOT...');
          console.log('🤖 RAG Config:', {
            microservice: 'HR_MANAGEMENT_REPORTING',
            userId: userId,
            token: token ? '***' : 'MISSING',
            tenantId: 'default'
          });
          
          window.initializeEducoreBot({
            microservice: 'HR_MANAGEMENT_REPORTING',
            userId: userId,
            token: token,
            tenantId: 'default'
          });
          
            console.log('✅ RAG: initializeEducoreBot called successfully');
            botInitialized.current = true;

            // Make debug function available
            if (typeof window !== 'undefined') {
              window.debugRAGBot = debugRAGBot;
              console.log('💡 RAG: Debug helper available - call window.debugRAGBot() in console');
            }

            // Setup toggle functionality for bot button
            // Wait a bit for bot to fully render, then attach toggle handler
            setTimeout(() => {
              setupBotToggle();
            }, 1000);

            // Check DOM after delays to see if bot rendered
          setTimeout(() => {
            const containerCheck = document.getElementById('edu-bot-container');
            console.log('🤖 RAG CHECK DOM (2s later):', containerCheck);
            console.log('🤖 RAG Container children:', containerCheck?.children.length || 0);
            console.log('🤖 RAG Container innerHTML length:', containerCheck?.innerHTML.length || 0);
            
            if (containerCheck) {
              const style = window.getComputedStyle(containerCheck);
              const rect = containerCheck.getBoundingClientRect();
              console.log('🤖 RAG Container computed style:', {
                display: style.display,
                position: style.position,
                zIndex: style.zIndex,
                visibility: style.visibility,
                opacity: style.opacity,
                bottom: style.bottom,
                right: style.right,
                width: style.width,
                height: style.height
              });
              console.log('🤖 RAG Container bounding rect:', {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height,
                bottom: rect.bottom,
                right: rect.right,
                visible: rect.width > 0 && rect.height > 0
              });
              
              // Check for bot elements
              const botElements = containerCheck.querySelectorAll('*');
              console.log('🤖 RAG Bot elements found:', botElements.length);
              
              // Check first few elements for visibility
              if (botElements.length > 0) {
                Array.from(botElements).slice(0, 5).forEach((el, i) => {
                  const elStyle = window.getComputedStyle(el);
                  const elRect = el.getBoundingClientRect();
                  console.log(`🤖 RAG Bot element ${i}:`, {
                    tag: el.tagName,
                    className: el.className,
                    display: elStyle.display,
                    visibility: elStyle.visibility,
                    opacity: elStyle.opacity,
                    position: elStyle.position,
                    zIndex: elStyle.zIndex,
                    visible: elRect.width > 0 && elRect.height > 0,
                    rect: { x: elRect.x, y: elRect.y, width: elRect.width, height: elRect.height }
                  });
                });
              }
            }
          }, 2000);

          setTimeout(() => {
            const containerCheck = document.getElementById('edu-bot-container');
            console.log('🤖 RAG CHECK DOM (5s later):', containerCheck);
            console.log('🤖 RAG Container children:', containerCheck?.children.length || 0);
            if (containerCheck?.children.length === 0) {
              console.warn('⚠️ RAG: Container still empty after 5 seconds. Bot may not be rendering.');
            }
          }, 5000);

          return; // Stop retrying once initialized
        } catch (error) {
          console.error('❌ RAG ERROR during initialization:', error);
          console.error('❌ RAG Error stack:', error.stack);
          // Continue retrying if initialization fails
          if (attemptCount < maxAttempts) {
            setTimeout(tryInitialize, retryDelay * 2);
          }
        }
      }

      // If conditions not met and haven't exceeded max attempts, retry
      if (attemptCount < maxAttempts && !botInitialized.current) {
        setTimeout(tryInitialize, retryDelay);
      } else if (attemptCount >= maxAttempts && !botInitialized.current) {
        console.error('❌ RAG: Failed to initialize after', maxAttempts, 'attempts');
        console.error('❌ RAG: Final state - Container:', !!container, 'Init function:', hasInitFunction, 'Script loaded:', scriptLoaded);
      }
    };

    // Start retry mechanism after a short delay to ensure DOM is ready
    setTimeout(() => {
      tryInitialize();
    }, 500);
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

