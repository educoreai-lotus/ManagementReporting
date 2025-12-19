# RAG Bot Debugging Guide

## 🔍 Quick Debug Steps

### Step 1: Open Browser Console

Press `F12` or `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac) to open Developer Tools.

### Step 2: Run Debug Helper

In the console, type:

```javascript
window.debugRAGBot()
```

This will show you:
- ✅ Container status
- ✅ Script loading status
- ✅ Init function availability
- ✅ Authentication status
- ✅ Bot elements in DOM

### Step 3: Check Console Logs

Look for these log messages:

**✅ Success Messages:**
```
✅ RAG SCRIPT LOADED
✅ RAG: initializeEducoreBot called successfully
🤖 RAG Container children: [number > 0]
```

**❌ Error Messages:**
```
❌ RAG SCRIPT FAILED TO LOAD
❌ RAG ERROR during initialization
❌ RAG: Failed to initialize after 50 attempts
```

---

## 🐛 Common Issues & Solutions

### Issue 1: Bot Not Visible

**Symptoms:**
- No bot button on screen
- Container exists but is empty

**Debug Steps:**
1. Run `window.debugRAGBot()` in console
2. Check if container has children: `document.getElementById('edu-bot-container').children.length`
3. Check console for errors

**Possible Causes:**
- Script not loaded
- Init function not available
- Bot failed to render
- CSS hiding the bot

**Solutions:**
```javascript
// Check if script loaded
console.log('Script:', document.getElementById('edu-bot-script'));

// Check if init function exists
console.log('Init function:', typeof window.initializeEducoreBot);

// Check container
const container = document.getElementById('edu-bot-container');
console.log('Container:', container);
console.log('Children:', container?.children.length);

// Force re-initialization (if needed)
if (window.initializeEducoreBot) {
  window.initializeEducoreBot({
    microservice: 'HR_MANAGEMENT_REPORTING',
    userId: 'DEV_BOT_USER',
    token: 'DEV_BOT_TOKEN',
    tenantId: 'default'
  });
}
```

---

### Issue 2: Script Not Loading

**Symptoms:**
- `window.initializeEducoreBot` is undefined
- Console shows "Init function not available"

**Debug Steps:**
1. Check Network tab for `bot.js` request
2. Check if script tag exists: `document.getElementById('edu-bot-script')`
3. Check for CORS errors

**Solutions:**
```javascript
// Check script tag
const script = document.getElementById('edu-bot-script');
console.log('Script tag:', script);
console.log('Script src:', script?.src);

// Check Network tab for:
// - 200 OK response
// - No CORS errors
// - Script content loaded

// Manually load script if needed
if (!script) {
  const newScript = document.createElement('script');
  newScript.id = 'edu-bot-script';
  newScript.src = 'https://rag-production-3a4c.up.railway.app/embed/bot.js';
  newScript.async = true;
  newScript.onload = () => console.log('Script loaded manually');
  document.body.appendChild(newScript);
}
```

---

### Issue 3: Container Not Found

**Symptoms:**
- Console shows "Container not found"
- `document.getElementById('edu-bot-container')` returns null

**Debug Steps:**
1. Check if App.jsx renders the container
2. Check React DevTools for component tree
3. Check if container is in DOM

**Solutions:**
```javascript
// Check if container exists
const container = document.getElementById('edu-bot-container');
if (!container) {
  // Create container manually
  const newContainer = document.createElement('div');
  newContainer.id = 'edu-bot-container';
  document.body.appendChild(newContainer);
  console.log('Container created manually');
}
```

---

### Issue 4: Authentication Issues

**Symptoms:**
- Bot initializes but doesn't work
- API calls fail
- No responses from bot

**Debug Steps:**
1. Check localStorage for token
2. Verify token format (should be JWT)
3. Check Network tab for API calls

**Solutions:**
```javascript
// Check authentication
const token = localStorage.getItem('authToken') || 
              localStorage.getItem('token') || 
              localStorage.getItem('accessToken');
console.log('Token exists:', !!token);
console.log('Token length:', token?.length);

// Check token format (should be JWT)
if (token) {
  const parts = token.split('.');
  console.log('Token parts:', parts.length); // Should be 3
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(atob(parts[1]));
      console.log('Token payload:', payload);
      console.log('UserId:', payload.userId || payload.sub || payload.id);
    } catch (e) {
      console.error('Token parse error:', e);
    }
  }
}
```

---

### Issue 5: Bot Renders But Not Visible

**Symptoms:**
- Container has children
- Bot elements exist in DOM
- But nothing visible on screen

**Debug Steps:**
1. Check CSS styles
2. Check z-index
3. Check position
4. Check visibility/opacity

**Solutions:**
```javascript
const container = document.getElementById('edu-bot-container');
const style = window.getComputedStyle(container);
console.log('Container styles:', {
  display: style.display,
  position: style.position,
  zIndex: style.zIndex,
  visibility: style.visibility,
  opacity: style.opacity,
  bottom: style.bottom,
  right: style.right
});

// Check if bot elements are visible
const botElements = container.querySelectorAll('*');
botElements.forEach((el, i) => {
  const elStyle = window.getComputedStyle(el);
  console.log(`Element ${i}:`, {
    display: elStyle.display,
    visibility: elStyle.visibility,
    opacity: elStyle.opacity,
    position: elStyle.position
  });
});
```

---

## 🔧 Manual Initialization

If automatic initialization fails, you can manually initialize:

```javascript
// Wait for script to load
function waitForScript(callback, maxAttempts = 20) {
  let attempts = 0;
  const check = () => {
    if (typeof window.initializeEducoreBot === 'function') {
      callback();
    } else if (attempts < maxAttempts) {
      attempts++;
      setTimeout(check, 500);
    } else {
      console.error('Init function not available after', maxAttempts, 'attempts');
    }
  };
  check();
}

// Initialize manually
waitForScript(() => {
  const token = localStorage.getItem('authToken') || 'DEV_BOT_TOKEN';
  let userId = 'DEV_BOT_USER';
  
  if (token && token !== 'DEV_BOT_TOKEN') {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      userId = payload.userId || payload.sub || payload.id || 'DEV_BOT_USER';
    } catch (e) {
      console.warn('Could not parse token');
    }
  }
  
  window.initializeEducoreBot({
    microservice: 'HR_MANAGEMENT_REPORTING',
    userId: userId,
    token: token,
    tenantId: 'default'
  });
  
  console.log('✅ Bot initialized manually');
});
```

---

## 📊 Expected Console Output

**Successful Initialization:**
```
🤖 RAG: Container creation check
🤖 RAG: Container already exists
🤖 RAG INIT EFFECT RUNNING
🤖 RAG: Attempt #1/50
🤖 RAG: Container exists? true
🤖 RAG: Init function exists? true
🤖 RAG: Script loaded? true
🤖 RAG: Token retrieved: YES
🤖 RAG USER OK: user-123
🤖 RAG INITIALIZING BOT...
✅ RAG: initializeEducoreBot called successfully
🤖 RAG CHECK DOM (2s later): <div id="edu-bot-container">...</div>
🤖 RAG Container children: 2
🤖 RAG Container innerHTML length: 4521
```

**Failed Initialization:**
```
🤖 RAG: Attempt #1/50
🤖 RAG: Container exists? false
🤖 RAG STOP: Container not found
...
❌ RAG: Failed to initialize after 50 attempts
```

---

## 🆘 Still Not Working?

1. **Clear browser cache** and reload
2. **Check browser console** for errors
3. **Check Network tab** for failed requests
4. **Try incognito/private mode** to rule out extensions
5. **Check if RAG backend is accessible:**
   ```javascript
   fetch('https://rag-production-3a4c.up.railway.app/embed/bot.js')
     .then(r => console.log('Backend accessible:', r.ok))
     .catch(e => console.error('Backend not accessible:', e));
   ```

---

## 📝 Report Issues

If bot still doesn't work after debugging:

1. Run `window.debugRAGBot()` and copy the output
2. Check browser console for all errors
3. Check Network tab for failed requests
4. Note your browser and version
5. Note if you're in development or production

---

**Last Updated:** December 18, 2025

