import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '../types/chat';

interface Props {
  message: ChatMessage;
  animate: boolean;
  onAnimationDone: () => void;
}

const CHARS_PER_TICK = 1;
const TICK_MS = 12;

export function MessageBubble({ message, animate, onAnimationDone }: Props) {
  const [displayedText, setDisplayedText] = useState('');
  const calledDoneRef = useRef(false);

  useEffect(() => {
    if (!animate) return;

    calledDoneRef.current = false;
    let index = 0;

    const interval = setInterval(() => {
      index = Math.min(index + CHARS_PER_TICK, message.content.length);

      setDisplayedText(message.content.slice(0, index));

      if (index >= message.content.length && !calledDoneRef.current) {
        calledDoneRef.current = true;
        clearInterval(interval);
        onAnimationDone();
      }
    }, TICK_MS);

    return () => clearInterval(interval);
  }, [animate, message.content, onAnimationDone]);

  const isUser = message.role === 'user';
  const text = animate ? displayedText : message.content;
  const isCursorVisible = animate && displayedText.length < message.content.length;

  return (
    <div
      className={`message-wrapper ${
        isUser ? 'message-wrapper--user' : 'message-wrapper--assistant'
      }`}
    >
      <span className="message-label">{isUser ? 'You' : 'Scapegoat'}</span>
      <div
        className={`message-bubble ${
          isUser ? 'message-bubble--user' : 'message-bubble--assistant'
        }`}
      >
        <p className="message-content">
          {text}
          {isCursorVisible && (
            <span className="message-cursor" aria-hidden="true"> 
              ▋{/* U+258B : LEFT FIVE EIGHTHS BLOCK */} 
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
