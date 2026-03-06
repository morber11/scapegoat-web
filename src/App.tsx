import { useCallback, useRef, useState } from 'react';
import { useChat } from './hooks/useChat';
import { MessageInput } from './components/MessageInput';
import { MessageList } from './components/MessageList';
import type { MessageListHandle } from './components/MessageList';
import './App.css';

function App() {
  const {
    messages,
    isSending,
    animatingId,
    sendMessage,
    clearChat,
    onAnimationDone,
  } = useChat();

  const listRef = useRef<MessageListHandle>(null);

  const [scrollHint, setScrollHint] = useState(0);

  const handleSend = useCallback(
    (content: string) => {
      setScrollHint((h) => h + 1);
      void sendMessage(content);
    },
    [sendMessage],
  );

  return (
    <div className="chat-layout">
      <header className="chat-header">
        <div className="chat-header-inner">
          <div className="chat-header-title">
            <span className="chat-header-avatar" aria-hidden="true">
            </span>
            <div>
              <h1 className="chat-header-name">Scapegoat</h1>
              <p className="chat-header-tagline">Because it wasn't your fault, and it never is your fault</p>
            </div>
          </div>
          {messages.length > 0 && (
            <button className="clear-button" onClick={clearChat}>
              Clear chat
            </button>
          )}
        </div>
      </header>

      <div className="chat-body">
        <MessageList
          ref={listRef}
          messages={messages}
          isSending={isSending}
          animatingId={animatingId}
          onAnimationDone={onAnimationDone}
          forceScrollHint={scrollHint}
        />

        <MessageInput onSend={handleSend} disabled={isSending} />
      </div>
    </div>
  );
}

export default App;
