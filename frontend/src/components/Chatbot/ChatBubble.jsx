/**
 * ChatBubble - Floating button that opens the chat
 * Visible ONLY when chat is closed
 */
const ChatBubble = ({ onClick }) => {
  return (
    <button
      className="edu-bot-bubble"
      onClick={onClick}
      aria-label="Open chat"
      title="Chat with AI Assistant"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    </button>
  );
};

export default ChatBubble;

