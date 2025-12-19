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

  // Track chat state and prevent infinite loops
  let chatIsOpen = false;
  let isProcessingClick = false;
  let lastClickTime = 0;
  let userInitiatedOpen = false; // Track if user clicked to open
  let autoOpenPrevented = false; // Track if we prevented auto-open
  const CLICK_DEBOUNCE_MS = 300; // Prevent rapid clicks

  // Find the bot button (the floating bubble button)
  const findBotButton = () => {
    // Find button that's fixed and in bottom-right area (the bubble)
    const buttons = container.querySelectorAll('button');
    for (const btn of buttons) {
      const rect = btn.getBoundingClientRect();
      const style = window.getComputedStyle(btn);
      // Button should be visible, positioned fixed, and in bottom-right
      if (rect.width > 0 && rect.height > 0 && 
          style.position === 'fixed' &&
          rect.bottom > window.innerHeight - 100 &&
          rect.right > window.innerWidth - 100) {
        return btn;
      }
    }
    return null;
  };

  // Find the chat panel
  const findChatPanel = () => {
    // Look for panel-like elements (not buttons)
    const allElements = container.querySelectorAll('*');
    for (const el of allElements) {
      if (el.tagName === 'BUTTON') continue;
      
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      
      // Panel should be visible, have significant width/height, and be positioned
      if (rect.width > 300 && rect.height > 400 && 
          style.display !== 'none' && 
          style.visibility !== 'hidden' &&
          style.opacity !== '0' &&
          (style.position === 'fixed' || style.position === 'absolute')) {
        return el;
      }
    }
    return null;
  };

  // Find the close button (X button in panel header)
  const findCloseButton = () => {
    // First, find the chat panel to narrow search
    const panel = findChatPanel();
    const searchRoot = panel || container;

    // Try multiple selectors for close button
    const closeSelectors = [
      'button[aria-label*="close" i]',
      'button[aria-label*="Close" i]',
      'button[aria-label*="CLOSE" i]',
      'button[title*="close" i]',
      'button[title*="Close" i]',
      '[role="button"][aria-label*="close" i]',
    ];

    for (const selector of closeSelectors) {
      try {
        const btn = searchRoot.querySelector(selector);
        if (btn) {
          const rect = btn.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            console.log('🤖 RAG Toggle: Found close button via selector:', selector);
            return btn;
          }
        }
      } catch (e) {
        // Invalid selector, skip
      }
    }

    // Look for button with X icon in panel header area
    if (panel) {
      // Find header area (usually first child or has specific classes)
      const header = panel.querySelector('[class*="header" i]') || 
                     panel.querySelector('[class*="Header" i]') ||
                     panel.firstElementChild;
      
      if (header) {
        const headerButtons = header.querySelectorAll('button');
        for (const btn of headerButtons) {
          // Check if button has X icon (cross pattern)
          const svg = btn.querySelector('svg');
          if (svg) {
            const paths = svg.querySelectorAll('path');
            if (paths.length >= 2) {
              // X icon typically has 2 diagonal lines
              const pathData = Array.from(paths).map(p => p.getAttribute('d') || '').join('');
              // Check for diagonal line patterns (M followed by L or l)
              if (pathData.match(/M[^M]*[Ll][^M]*M[^M]*[Ll]/)) {
                const rect = btn.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0 && rect.width < 50 && rect.height < 50) {
                  console.log('🤖 RAG Toggle: Found close button via X icon in header');
                  return btn;
                }
              }
            }
          }
          // Also check for text content like "×" or "✕"
          const text = btn.textContent.trim();
          if (text === '×' || text === '✕' || text === '✖' || text.toLowerCase() === 'close') {
            console.log('🤖 RAG Toggle: Found close button via text content');
            return btn;
          }
        }
      }
    }

    // Last resort: find any small button in top-right of panel
    if (panel) {
      const allButtons = panel.querySelectorAll('button');
      const panelRect = panel.getBoundingClientRect();
      for (const btn of allButtons) {
        const rect = btn.getBoundingClientRect();
        // Small button in top-right area of panel
        if (rect.width > 0 && rect.height > 0 && 
            rect.width < 50 && rect.height < 50 &&
            rect.right > panelRect.right - 60 &&
            rect.top < panelRect.top + 60) {
          console.log('🤖 RAG Toggle: Found potential close button in top-right');
          return btn;
        }
      }
    }

    console.log('🤖 RAG Toggle: Close button not found');
    return null;
  };

  // Check if chat is currently open
  const checkChatState = () => {
    const panel = findChatPanel();
    const wasOpen = chatIsOpen;
    chatIsOpen = panel && panel.getBoundingClientRect().width > 300;
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

  // Use MutationObserver to track panel visibility and prevent auto-open
  const observer = new MutationObserver(() => {
    const wasOpen = chatIsOpen;
    const nowOpen = checkChatState();
    
    // Only prevent auto-open if:
    // 1. Panel just opened (was closed, now open)
    // 2. User didn't initiate it (no user click)
    // 3. We're not currently processing a user click
    // 4. We haven't just prevented an auto-open (avoid loops)
    if (!wasOpen && nowOpen && !userInitiatedOpen && !isProcessingClick && !autoOpenPrevented) {
      console.log('🤖 RAG Toggle: Panel auto-opened, closing it to maintain closed default state');
      autoOpenPrevented = true;
      
      setTimeout(() => {
        const closeButton = findCloseButton();
        if (closeButton) {
          closeButton.click();
        } else {
          const panel = findChatPanel();
          if (panel) {
            panel.style.display = 'none';
            panel.style.visibility = 'hidden';
            panel.style.opacity = '0';
            chatIsOpen = false;
          }
        }
        // Reset flag after a delay
        setTimeout(() => {
          autoOpenPrevented = false;
        }, 1000);
      }, 100);
    }
    
    // Update state
    chatIsOpen = nowOpen;
    
    // Reset user initiated flag after state change (but give it time for user-initiated opens)
    if (wasOpen !== nowOpen && userInitiatedOpen) {
      setTimeout(() => {
        // Only reset if chat is still open (user successfully opened it)
        if (checkChatState()) {
          console.log('🤖 RAG Toggle: User-initiated open confirmed, resetting flag');
          userInitiatedOpen = false;
        }
      }, 1000); // Longer delay to ensure user-initiated opens complete
    }
  });

  observer.observe(container, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'class']
  });

  // Initial state check - close if auto-opened
  setTimeout(() => {
    const initialState = checkChatState();
    if (initialState) {
      console.log('🤖 RAG Toggle: Panel was auto-opened on load, closing it');
      const closeButton = findCloseButton();
      if (closeButton) {
        setTimeout(() => closeButton.click(), 200);
      } else {
        const panel = findChatPanel();
        if (panel) {
          panel.style.display = 'none';
          panel.style.visibility = 'hidden';
          panel.style.opacity = '0';
          chatIsOpen = false;
        }
      }
    }
  }, 1500); // Wait for bot to fully initialize

  // Add toggle handler - intercept click before bot's handler
  button.addEventListener('click', (e) => {
    // Debounce rapid clicks
    const now = Date.now();
    if (now - lastClickTime < CLICK_DEBOUNCE_MS) {
      console.log('🤖 RAG Toggle: Click debounced');
      e.stopPropagation();
      e.preventDefault();
      return;
    }
    lastClickTime = now;

    // Prevent infinite loops
    if (isProcessingClick) {
      console.log('🤖 RAG Toggle: Already processing click, ignoring');
      e.stopPropagation();
      e.preventDefault();
      return;
    }

    // Check current state
    const currentlyOpen = checkChatState();
    console.log('🤖 RAG Toggle: Button clicked, chat is', currentlyOpen ? 'OPEN' : 'CLOSED');

    if (currentlyOpen) {
      // Chat is open, we want to close it
      isProcessingClick = true;
      
      // Stop the event from propagating to bot's handler
      e.stopImmediatePropagation();
      e.preventDefault();
      
      // Find and click close button
      setTimeout(() => {
        const closeButton = findCloseButton();
        
        if (closeButton) {
          console.log('🤖 RAG Toggle: Found close button, clicking it');
          
          // Try multiple methods to trigger close
          // Method 1: Direct click
          if (typeof closeButton.click === 'function') {
            closeButton.click();
          }
          
          // Method 2: Dispatch click event
          const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window,
            button: 0
          });
          closeButton.dispatchEvent(clickEvent);
          
          // Method 3: Dispatch mousedown + mouseup (some components listen to these)
          const mouseDownEvent = new MouseEvent('mousedown', {
            bubbles: true,
            cancelable: true,
            view: window,
            button: 0
          });
          const mouseUpEvent = new MouseEvent('mouseup', {
            bubbles: true,
            cancelable: true,
            view: window,
            button: 0
          });
          closeButton.dispatchEvent(mouseDownEvent);
          setTimeout(() => {
            closeButton.dispatchEvent(mouseUpEvent);
          }, 10);
          
          // Verify it closed after a moment
          setTimeout(() => {
            const stillOpen = checkChatState();
            if (stillOpen) {
              console.log('🤖 RAG Toggle: Panel still open, trying CSS fallback');
              const panel = findChatPanel();
              if (panel) {
                panel.style.display = 'none';
                panel.style.visibility = 'hidden';
                panel.style.opacity = '0';
                chatIsOpen = false;
              }
            } else {
              console.log('🤖 RAG Toggle: Panel closed successfully');
            }
            isProcessingClick = false;
          }, 300);
        } else {
          // Fallback: hide panel directly via CSS
          console.log('🤖 RAG Toggle: No close button found, hiding panel via CSS');
          const panel = findChatPanel();
          if (panel) {
            panel.style.display = 'none';
            panel.style.visibility = 'hidden';
            panel.style.opacity = '0';
            chatIsOpen = false;
          }
          isProcessingClick = false;
        }
      }, 100); // Slightly longer delay to ensure bot's handler ran first
    } else {
      // Chat is closed, user wants to open it
      userInitiatedOpen = true;
      isProcessingClick = true; // Prevent observer from interfering
      console.log('🤖 RAG Toggle: Chat is closed, user clicked to open it');
      
      // Don't prevent default or stop propagation - let bot's handler open it
      // The userInitiatedOpen flag will prevent the observer from closing it
      
      // Reset processing flag after bot has time to open
      setTimeout(() => {
        isProcessingClick = false;
        // Verify it opened
        setTimeout(() => {
          const opened = checkChatState();
          if (opened) {
            console.log('🤖 RAG Toggle: Chat opened successfully');
          } else {
            console.log('🤖 RAG Toggle: Chat did not open, may need manual trigger');
            // If bot didn't open it, try to trigger it manually
            // But don't do this - let bot handle it naturally
          }
        }, 300);
      }, 500);
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

