import { useCallback, useRef, useState } from 'react';

interface Props {
  onSend: (content: string) => void;
  disabled: boolean;
}

const MAX_LENGTH = 8000;

export function MessageInput({ onSend, disabled }: Props) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const submit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [value, disabled, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submit();
      }
    },
    [submit],
  );

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = `${ta.scrollHeight}px`;
  }, []);

  const canSend = value.trim().length > 0 && !disabled;

  return (
    <div className="message-input">
      <textarea
        ref={textareaRef}
        className="message-input-field"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="What happened this time?"
        disabled={disabled}
        maxLength={MAX_LENGTH}
        rows={1}
        aria-label="Message input"
      />
      <button
        className="message-input-send"
        onClick={submit}
        disabled={!canSend}
        aria-label="Send message"
      >
        Send
      </button>
    </div>
  );
}
