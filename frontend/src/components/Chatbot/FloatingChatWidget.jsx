import { useState } from 'react';
import './FloatingChatWidget.css';
import ChatPanel from './ChatPanel';
import ChatBubble from './ChatBubble';

/**
 * FloatingChatWidget - Main chatbot component with proper open/close state
 * 
 * UX Requirements:
 * - Default state: Only bubble visible (closed)
 * - Bubble click: Opens chat panel
 * - Close click: Returns to bubble-only state
 * - NO auto-open behavior
 * - Floats above entire app (high z-index)
 */
const FloatingChatWidget = ({ microservice, userId, token, tenantId }) => {
  // ✅ Default state is CLOSED (false)
  const [isOpen, setIsOpen] = useState(false);

  // ❌ NO auto-open logic
  // ❌ NO embedded mode forcing open
  // ❌ NO automatic setIsOpen(true) calls

  return (
    <div className="edu-bot-widget">
      {/* Render bubble ONLY when closed */}
      {!isOpen && (
        <ChatBubble onClick={() => setIsOpen(true)} />
      )}

      {/* Render chat panel ONLY when open */}
      {isOpen && (
        <ChatPanel
          microservice={microservice}
          userId={userId}
          token={token}
          tenantId={tenantId}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default FloatingChatWidget;

