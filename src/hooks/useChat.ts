import { useCallback, useReducer, useRef } from 'react';
import { sendChatMessage, ChatApiError } from '../api/chatApi';
import type { ChatMessage } from '../types/chat';
import { FALLBACK_REPLIES, RATE_LIMIT_FALLBACK_REPLIES } from '../constants/constants';

const STORAGE_KEY = 'scapegoat_chat_v1';
const STORAGE_VERSION = 1;

interface StoredChat {
    version: typeof STORAGE_VERSION;
    messages: ChatMessage[];
}

function loadFromStorage(): ChatMessage[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);

        if (!raw) return [];

        const parsed = JSON.parse(raw) as StoredChat;

        if (parsed.version !== STORAGE_VERSION || !Array.isArray(parsed.messages)) return [];

        return parsed.messages;
    } catch {
        return [];
    }
}

function saveToStorage(messages: ChatMessage[]): void {
    try {
        const data: StoredChat = { version: STORAGE_VERSION, messages };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
        // ignore
    }
}

interface State {
    messages: ChatMessage[];
    status: 'idle' | 'sending';
    animatingId: string | null;
}


let lastFallback: string | null = null;
let lastRateLimitFallback: string | null = null;

function randomFallback(): string {
    let reply: string;
    do {
        reply = FALLBACK_REPLIES[Math.floor(Math.random() * FALLBACK_REPLIES.length)];
    } while (reply === lastFallback && FALLBACK_REPLIES.length > 1);

    lastFallback = reply;

    return reply;
}

function randomRateLimitFallback(): string {
    let reply: string;
    do {
        reply = RATE_LIMIT_FALLBACK_REPLIES[Math.floor(Math.random() * RATE_LIMIT_FALLBACK_REPLIES.length)];
    } while (reply === lastRateLimitFallback && RATE_LIMIT_FALLBACK_REPLIES.length > 1);

    lastRateLimitFallback = reply;

    return reply;
}

// roughly guess the users typing style and transform the prompts to match
function styleFallback(reply: string, messages: ChatMessage[]): string {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
    let styled = reply;

    const letterCounts = { lower: 0, upper: 0 };
    for (const ch of lastUser) {
        if (/[a-z]/.test(ch)) letterCounts.lower++;
        else if (/[A-Z]/.test(ch)) letterCounts.upper++;
    }
    if (letterCounts.lower > letterCounts.upper) {
        styled = styled.toLowerCase();
    }

    if (lastUser.trim().endsWith('.') && !/[.!?]$/.test(styled)) {
        styled = styled + '.';
    }

    return styled;
}

type Action =
    | { type: 'SEND_START'; userMessage: ChatMessage }
    | { type: 'SEND_SUCCESS'; assistantMessage: ChatMessage }
    | { type: 'ANIMATION_DONE' }
    | { type: 'CLEAR' };

function reducer(state: State, action: Action): State {
    switch (action.type) {
        case 'SEND_START':
            return {
                ...state,
                messages: [...state.messages, action.userMessage],
                status: 'sending',
                animatingId: null,
            };
        case 'SEND_SUCCESS':
            return {
                ...state,
                messages: [...state.messages, action.assistantMessage],
                status: 'idle',
                animatingId: action.assistantMessage.id,
            };
        case 'ANIMATION_DONE':
            return { ...state, animatingId: null };
        case 'CLEAR':
            return {
                messages: [],
                status: 'idle',
                animatingId: null,
            };
    }
}

function createMessage(role: ChatMessage['role'], content: string): ChatMessage {
    return { id: crypto.randomUUID(), role, content, timestamp: Date.now() };
}

export interface UseChatReturn {
    messages: ChatMessage[];
    isSending: boolean;
    animatingId: string | null;
    sendMessage: (content: string) => Promise<void>;
    clearChat: () => void;
    onAnimationDone: () => void;
}

export function useChat(): UseChatReturn {
    const [state, dispatch] = useReducer(reducer, undefined, () => ({
        messages: loadFromStorage(),
        status: 'idle' as const,
        animatingId: null,
    }));

    const messagesRef = useRef<ChatMessage[]>(state.messages);

    const sendMessage = useCallback(
        async (content: string) => {
            const historySnapshot = [...messagesRef.current];
            const userMessage = createMessage('user', content);

            dispatch({ type: 'SEND_START', userMessage });
            messagesRef.current = [...historySnapshot, userMessage];

            saveToStorage(messagesRef.current);

            try {
                const response = await sendChatMessage(content, historySnapshot);
                const assistantMessage = createMessage('assistant', response.reply);
                dispatch({ type: 'SEND_SUCCESS', assistantMessage });
                messagesRef.current = [...messagesRef.current, assistantMessage];

                saveToStorage(messagesRef.current);
            } catch (err) {
                console.error('[Scapegoat] API error:', err);

                let rawReply: string;
                if (err instanceof ChatApiError && err.status === 429) {
                    rawReply = randomRateLimitFallback();
                } else {
                    rawReply = randomFallback();
                }

                const styled = styleFallback(rawReply, historySnapshot);
                const fallback = createMessage('assistant', styled);
                dispatch({ type: 'SEND_SUCCESS', assistantMessage: fallback });
                messagesRef.current = [...messagesRef.current, fallback];

                saveToStorage(messagesRef.current);
            }
        },
        [],
    );

    const clearChat = useCallback(() => {
        dispatch({ type: 'CLEAR' });
        messagesRef.current = [];
        saveToStorage([]);
    }, []);

    const onAnimationDone = useCallback(() => {
        dispatch({ type: 'ANIMATION_DONE' });
    }, []);


    return {
        messages: state.messages,
        isSending: state.status === 'sending',
        animatingId: state.animatingId,
        sendMessage,
        clearChat,
        onAnimationDone,
    };
}
