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

  // Find the chat panel - use multiple strategies
  const findChatPanel = () => {
    // Strategy 1: Look for common chat panel classes/attributes
    const commonSelectors = [
      '[class*="panel" i]',
      '[class*="chat" i]',
      '[class*="modal" i]',
      '[class*="dialog" i]',
      '[role="dialog"]',
      '[data-testid*="chat" i]',
      '[data-testid*="panel" i]'
    ];
    
    for (const selector of commonSelectors) {
      try {
        const el = container.querySelector(selector);
        if (el && el.tagName !== 'BUTTON') {
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          if (rect.width > 0 && rect.height > 0 && 
              style.display !== 'none' && 
              style.visibility !== 'hidden') {
            console.log('🤖 RAG Toggle: Found panel via selector:', selector);
            return el;
          }
        }
      } catch (e) {
        // Invalid selector
      }
    }
    
    // Strategy 2: Look for any large fixed/absolute element (not button)
    const allElements = container.querySelectorAll('*');
    const candidates = [];
    
    for (const el of allElements) {
      if (el.tagName === 'BUTTON') continue;
      
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      
      // Any visible element with significant size that's positioned
      if (rect.width > 150 && rect.height > 200 && 
          style.display !== 'none' && 
          style.visibility !== 'hidden' &&
          parseFloat(style.opacity) > 0.05 &&
          (style.position === 'fixed' || style.position === 'absolute')) {
        candidates.push({ el, area: rect.width * rect.height });
      }
    }
    
    // Return the largest candidate (most likely to be the panel)
    if (candidates.length > 0) {
      candidates.sort((a, b) => b.area - a.area);
      console.log('🤖 RAG Toggle: Found panel via size search, area:', candidates[0].area);
      return candidates[0].el;
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

  // Check if chat is currently open - CRITICAL: must check if panel is actually visible, not just exists
  const checkChatState = () => {
    const wasOpen = chatIsOpen;
    
    // Find panel element
    const panel = findChatPanel();
    
    if (!panel) {
      // No panel found = closed
      chatIsOpen = false;
      return false;
    }
    
    // CRITICAL: Check if panel is actually visible (not blocked by CSS)
    const style = window.getComputedStyle(panel);
    const rect = panel.getBoundingClientRect();
    
    // Panel is open ONLY if:
    // 1. display is NOT 'none'
    // 2. visibility is NOT 'hidden'
    // 3. opacity is > 0.1 (not fully transparent)
    // 4. Has actual size (width and height > 0)
    const isVisible = style.display !== 'none' && 
                     style.visibility !== 'hidden' &&
                     parseFloat(style.opacity) > 0.1 &&
                     rect.width > 0 && 
                     rect.height > 0;
    
    chatIsOpen = isVisible;
    
    if (wasOpen !== chatIsOpen) {
      console.log('🤖 RAG Toggle: Chat state changed:', wasOpen ? 'OPEN' : 'CLOSED', '→', chatIsOpen ? 'OPEN' : 'CLOSED');
      console.log('🤖 RAG Toggle: Panel visibility:', {
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        blocked: panelBlocked
      });
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

  // REAL SOLUTION: Block panel from displaying using CSS, then unblock on user click
  // This is more reliable than trying to close it after it opens
  let panelBlocked = true; // Start with panel blocked (closed state)
  let panelElement = null; // Cache the panel element
  
  // Function to block/unblock panel visibility
  const setPanelVisibility = (visible) => {
    // Always refresh panel element - it might have been recreated
    panelElement = findChatPanel();
    
    if (panelElement) {
      if (visible) {
        // Unblock - remove our blocking styles
        panelElement.style.removeProperty('display');
        panelElement.style.removeProperty('visibility');
        panelElement.style.removeProperty('opacity');
        panelBlocked = false;
      } else {
        // Block - force hide with !important
        panelElement.style.setProperty('display', 'none', 'important');
        panelElement.style.setProperty('visibility', 'hidden', 'important');
        panelElement.style.setProperty('opacity', '0', 'important');
        panelBlocked = true;
      }
    } else if (!visible) {
      // Panel not found but we want to block - try to find it in all children
      const allChildren = container.querySelectorAll('*');
      for (const child of allChildren) {
        if (child.tagName !== 'BUTTON') {
          const rect = child.getBoundingClientRect();
          if (rect.width > 200 && rect.height > 300) {
            // Found a large element, block it
            child.style.setProperty('display', 'none', 'important');
            child.style.setProperty('visibility', 'hidden', 'important');
            child.style.setProperty('opacity', '0', 'important');
            panelElement = child;
            panelBlocked = true;
            break;
          }
        }
      }
    }
  };

  // Use MutationObserver to continuously block auto-opens
  // BUT: Only block if panelBlocked is true (user hasn't clicked to open)
  const observer = new MutationObserver(() => {
    // Update panel element cache if needed
    if (!panelElement) {
      panelElement = findChatPanel();
    }
    
    // CRITICAL: Only block if panelBlocked is true AND we're not processing a user click
    // AND initial blocking is complete (we've had time to set up)
    // This prevents blocking when user clicked to open
    if (panelElement && panelBlocked && !isProcessingClick) {
      // Check if bot tried to show it (display is not 'none')
      const style = window.getComputedStyle(panelElement);
      // Only block if it's actually visible (not already blocked)
      if (style.display !== 'none' && style.visibility !== 'hidden' && parseFloat(style.opacity) > 0.1) {
        // Bot tried to show it, block it immediately
        setPanelVisibility(false);
      }
    }
    
    // Update state tracking
    const nowOpen = checkChatState();
    chatIsOpen = nowOpen;
  });

  observer.observe(container, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'class']
  });

  // Initial blocking - wait for panel to appear, then block it
  const initialBlockInterval = setInterval(() => {
    const panel = findChatPanel();
    if (panel) {
      panelElement = panel;
      setPanelVisibility(false); // Block it
      clearInterval(initialBlockInterval);
    }
  }, 100);
  
  // Stop trying after 3 seconds
  setTimeout(() => {
    clearInterval(initialBlockInterval);
  }, 3000);

  // Add toggle handler - intercept click before bot's handler
  button.addEventListener('click', (e) => {
    // Simple debounce - only prevent if click was VERY recent (100ms)
    const now = Date.now();
    if (now - lastClickTime < 100) {
      console.log('🤖 RAG Toggle: Click debounced (too rapid)');
      return; // Don't prevent, just ignore
    }
    lastClickTime = now;

    // Only prevent if we're actively processing a close action
    if (isProcessingClick && checkChatState()) {
      console.log('🤖 RAG Toggle: Already processing close, ignoring');
      return; // Don't prevent, just ignore
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
          
          // Block panel after close attempt
          panelBlocked = true;
          setPanelVisibility(false);
          
          // Verify it closed after a moment
          setTimeout(() => {
            const stillOpen = checkChatState();
            if (stillOpen) {
              console.log('🤖 RAG Toggle: Panel still open, forcing block');
              setPanelVisibility(false);
            } else {
              console.log('🤖 RAG Toggle: Panel closed successfully');
            }
            isProcessingClick = false;
          }, 300);
        } else {
          // Fallback: block panel directly
          console.log('🤖 RAG Toggle: No close button found, blocking panel');
          panelBlocked = true;
          setPanelVisibility(false);
          isProcessingClick = false;
        }
      }, 100); // Slightly longer delay to ensure bot's handler ran first
    } else {
      // Chat is closed, user wants to open it
      console.log('🤖 RAG Toggle: Chat is closed, user clicked to open it');
      
      // CRITICAL: Set flag FIRST to prevent observer from blocking
      panelBlocked = false;
      isProcessingClick = true; // Prevent observer from interfering
      
      // Find panel and unblock it immediately
      // Don't wait for bot - we control the visibility
      panelElement = findChatPanel();
      
      if (panelElement) {
        // Unblock the panel - remove blocking styles immediately
        panelElement.style.removeProperty('display');
        panelElement.style.removeProperty('visibility');
        panelElement.style.removeProperty('opacity');
        console.log('🤖 RAG Toggle: Unblocked panel immediately');
      } else {
        // Panel not found yet - try to find it in container children
        const containerChildren = Array.from(container.children);
        for (const child of containerChildren) {
          if (child.tagName !== 'BUTTON') {
            const rect = child.getBoundingClientRect();
            if (rect.width > 200 || rect.height > 300) {
              // Found potential panel
              panelElement = child;
              panelElement.style.removeProperty('display');
              panelElement.style.removeProperty('visibility');
              panelElement.style.removeProperty('opacity');
              console.log('🤖 RAG Toggle: Found and unblocked panel from container children');
              break;
            }
          }
        }
      }
      
      // Also let bot's handler run (in case it needs to do something)
      // Don't prevent default or stop propagation
      
      // Verify it opened after a moment
      setTimeout(() => {
        const opened = checkChatState();
        if (opened) {
          console.log('✅ RAG Toggle: Chat opened successfully');
          isProcessingClick = false; // Allow observer to work again
        } else {
          console.log('⚠️ RAG Toggle: Chat still not visible, trying again');
          // Try one more time - find panel and force unblock
          panelElement = findChatPanel();
          if (!panelElement) {
            // Try container children again
            const containerChildren = Array.from(container.children);
            for (const child of containerChildren) {
              if (child.tagName !== 'BUTTON') {
                const rect = child.getBoundingClientRect();
                if (rect.width > 200 || rect.height > 300) {
                  panelElement = child;
                  break;
                }
              }
            }
          }
          
          if (panelElement) {
            // Force unblock - remove ALL styles that might block it
            panelElement.style.removeProperty('display');
            panelElement.style.removeProperty('visibility');
            panelElement.style.removeProperty('opacity');
            // Also check computed style - if still blocked, use important to override
            setTimeout(() => {
              const style = window.getComputedStyle(panelElement);
              if (style.display === 'none' || style.visibility === 'hidden') {
                // Still blocked - force show with important
                panelElement.style.setProperty('display', 'block', 'important');
                panelElement.style.setProperty('visibility', 'visible', 'important');
                panelElement.style.setProperty('opacity', '1', 'important');
                console.log('🤖 RAG Toggle: Forced panel to show with !important');
              }
            }, 100);
          }
          
          // Keep isProcessingClick true a bit longer to prevent observer from blocking
          setTimeout(() => {
            isProcessingClick = false;
          }, 1000); // Give more time for panel to fully render
        }
      }, 500); // Longer delay to ensure bot finished opening
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


