import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { ChatMessage } from '../types/chat';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';

interface Props {
  messages: ChatMessage[];
  isSending: boolean;
  animatingId: string | null;
  onAnimationDone: () => void;
  forceScrollHint?: number;
}

export interface MessageListHandle {
  scrollToBottom: (behavior?: ScrollBehavior) => void;
}

export const MessageList = forwardRef<MessageListHandle, Props>(
  ({ messages, isSending, animatingId, onAnimationDone, forceScrollHint }, ref) => {
    const bottomRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const userScrolledRef = useRef(false);

    const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
      bottomRef.current?.scrollIntoView({ behavior });
    };

    useImperativeHandle(ref, () => ({ scrollToBottom }));

    // needed for handling scroll
    useEffect(() => {
      const list = listRef.current;
      if (!list) return;

      const handleScroll = () => {
        list.classList.add('is-scrolling');
        if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
        scrollTimerRef.current = setTimeout(() => {
          list.classList.remove('is-scrolling');
        }, 5000);

        const atBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 20;
        userScrolledRef.current = !atBottom;
      };

      list.addEventListener('scroll', handleScroll, { passive: true });
      return () => {
        list.removeEventListener('scroll', handleScroll);
        if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
      };
    }, []);

    const forceScrollRef = useRef<number | undefined>(undefined);

    useEffect(() => {
      const el = bottomRef.current;
      if (!el) return;

      const parent = listRef.current ?? el.closest('[data-scroll-container]') ?? window;
      const shouldForce =
        forceScrollHint !== undefined && forceScrollRef.current !== forceScrollHint;

      if (!userScrolledRef.current || shouldForce) {
        el.scrollIntoView({ behavior: isSending ? 'instant' : 'smooth', block: 'end' });
        if (parent !== window && parent instanceof Element) {
          parent.scrollTo({ top: parent.scrollHeight, behavior: isSending ? 'instant' : 'smooth' });
        } else if (parent === window) {
          window.scrollTo(0, document.body.scrollHeight);
        }
      }

      forceScrollRef.current = forceScrollHint;
    }, [messages, isSending, forceScrollHint]);

    if (messages.length === 0 && !isSending) {
      return (
        <div className="message-list message-list--empty">
          <p className="empty-state">
            Blame someone else
            <br />
            <span className="empty-state-sub">don't worry, it likes it</span>
          </p>
        </div>
      );
    }

    return (
      <div
        ref={listRef}
        className="message-list"
        data-scroll-container
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
      >
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            animate={message.id === animatingId}
            onAnimationDone={onAnimationDone}
          />
        ))}
        {isSending && <TypingIndicator />}
        <div ref={bottomRef} className="message-list-end" />
      </div>
    );
  });
