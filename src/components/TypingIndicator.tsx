export function TypingIndicator() {
  return (
    <div className="message-wrapper message-wrapper--assistant">
      <span className="message-label">Scapegoat</span>
      <div className="message-bubble message-bubble--assistant">
        <div className="typing-indicator" aria-label="Scapegoat is thinking">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}
