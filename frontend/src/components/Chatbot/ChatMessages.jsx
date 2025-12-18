import { useEffect, useRef } from 'react';

/**
 * ChatMessages - Messages list with auto-scroll
 */
const ChatMessages = ({ messages, isLoading }) => {
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="edu-bot-messages">
        <div className="edu-bot-empty-state">
          <svg
            className="edu-bot-empty-state-icon"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            <line x1="9" y1="10" x2="9.01" y2="10" />
            <line x1="12" y1="10" x2="12.01" y2="10" />
            <line x1="15" y1="10" x2="15.01" y2="10" />
          </svg>
          <h3>Welcome to AI Assistant</h3>
          <p>Ask me anything about HR Management Reporting</p>
        </div>
      </div>
    );
  }

  return (
    <div className="edu-bot-messages">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`edu-bot-message ${message.role === 'user' ? 'user' : 'bot'}`}
        >
          <div className="edu-bot-message-avatar">
            {message.role === 'user' ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                width="16"
                height="16"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                width="16"
                height="16"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            )}
          </div>
          <div className="edu-bot-message-content">
            {message.content}
          </div>
        </div>
      ))}

      {isLoading && (
        <div className="edu-bot-message bot">
          <div className="edu-bot-message-avatar">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              width="16"
              height="16"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
          </div>
          <div className="edu-bot-message-content">
            <div className="edu-bot-loading">
              <div className="edu-bot-loading-dot"></div>
              <div className="edu-bot-loading-dot"></div>
              <div className="edu-bot-loading-dot"></div>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatMessages;

