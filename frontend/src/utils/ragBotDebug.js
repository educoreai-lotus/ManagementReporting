/**
 * RAG Bot Debug Helper
 * 
 * Use this in browser console to debug bot issues:
 * 
 * import { debugRAGBot } from './utils/ragBotDebug';
 * debugRAGBot();
 * 
 * Or in console:
 * window.debugRAGBot();
 */

export function debugRAGBot() {
  console.log('🔍 RAG Bot Debug Information:');
  console.log('================================');
  
  // Check container
  const container = document.getElementById('edu-bot-container');
  console.log('1. Container:', container ? '✅ EXISTS' : '❌ MISSING');
  if (container) {
    console.log('   - Location:', container.getBoundingClientRect());
    console.log('   - Children:', container.children.length);
    console.log('   - innerHTML length:', container.innerHTML.length);
    console.log('   - Computed style:', {
      display: window.getComputedStyle(container).display,
      position: window.getComputedStyle(container).position,
      zIndex: window.getComputedStyle(container).zIndex,
      visibility: window.getComputedStyle(container).visibility,
      opacity: window.getComputedStyle(container).opacity
    });
  }
  
  // Check script
  const scriptTag = document.getElementById('edu-bot-script');
  console.log('2. Script Tag:', scriptTag ? '✅ EXISTS' : '❌ MISSING');
  if (scriptTag) {
    console.log('   - Source:', scriptTag.src);
    console.log('   - Loaded:', scriptTag.complete || scriptTag.readyState === 'complete');
  }
  
  // Check global flags
  console.log('3. Global Flags:');
  console.log('   - EDUCORE_BOT_LOADED:', window.EDUCORE_BOT_LOADED || 'undefined');
  console.log('   - EDUCORE_BOT_BUNDLE_LOADED:', window.EDUCORE_BOT_BUNDLE_LOADED || 'undefined');
  console.log('   - EDUCORE_BACKEND_URL:', window.EDUCORE_BACKEND_URL || 'undefined');
  
  // Check init function
  console.log('4. Init Function:');
  console.log('   - Type:', typeof window.initializeEducoreBot);
  console.log('   - Exists:', typeof window.initializeEducoreBot === 'function' ? '✅ YES' : '❌ NO');
  
  // Check authentication
  console.log('5. Authentication:');
  const token = localStorage.getItem('authToken') || localStorage.getItem('token') || localStorage.getItem('accessToken');
  console.log('   - Token exists:', token ? '✅ YES' : '❌ NO');
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.userId || payload.sub || payload.id;
      console.log('   - UserId:', userId || 'NOT FOUND IN TOKEN');
    } catch (e) {
      console.log('   - Token parse error:', e.message);
    }
  }
  
  // Check for bot elements
  console.log('6. Bot Elements:');
  if (container) {
    const botElements = container.querySelectorAll('*');
    console.log('   - Total elements:', botElements.length);
    if (botElements.length > 0) {
      console.log('   - First element:', botElements[0]);
      console.log('   - First element classes:', botElements[0].className);
      console.log('   - First element style:', botElements[0].style.cssText);
    } else {
      console.log('   - ⚠️ No elements found in container');
    }
  }
  
  // Check page state
  console.log('7. Page State:');
  console.log('   - readyState:', document.readyState);
  console.log('   - URL:', window.location.href);
  console.log('   - Viewport:', {
    width: window.innerWidth,
    height: window.innerHeight
  });
  
  console.log('================================');
  console.log('💡 Tips:');
  console.log('   - If container missing: Check App.jsx');
  console.log('   - If script missing: Check index.html');
  console.log('   - If init function missing: Script may not have loaded');
  console.log('   - If no elements: Bot may not have initialized or rendered');
}

// Make available globally for console access
if (typeof window !== 'undefined') {
  window.debugRAGBot = debugRAGBot;
}

