import { useCallback, useReducer, useRef } from 'react';
import { sendChatMessage, ChatApiError } from '../api/chatApi';
import type { ChatMessage } from '../types/chat';
import { FALLBACK_REPLIES, RATE_LIMIT_FALLBACK_REPLIES } from '../constants/constants';
import { styleFallback } from '../utils/styleFallback';

const RaceStatus = {
    Ok: 'ok',
    Error: 'error',
    Timeout: 'timeout',
} as const;

const ActionType = {
    SendStart: 'SEND_START',
    SendSuccess: 'SEND_SUCCESS',
    AnimationDone: 'ANIMATION_DONE',
    Clear: 'CLEAR',
} as const;

const Role = {
    User: 'user',
    Assistant: 'assistant',
} as const;

const Status = {
    Idle: 'idle',
    Sending: 'sending',
} as const;

const TIMEOUT_BASE = 4000;
const TIMEOUT_JITTER = 2000;
const RATE_LIMIT_STATUS = 429;

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
    status: (typeof Status)[keyof typeof Status];
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

type Action =
    | { type: typeof ActionType.SendStart; userMessage: ChatMessage }
    | { type: typeof ActionType.SendSuccess; assistantMessage: ChatMessage }
    | { type: typeof ActionType.AnimationDone }
    | { type: typeof ActionType.Clear };

function reducer(state: State, action: Action): State {
    switch (action.type) {
        case ActionType.SendStart:
            return {
                ...state,
                messages: [...state.messages, action.userMessage],
                status: Status.Sending,
                animatingId: null,
            };
        case ActionType.SendSuccess:
            return {
                ...state,
                messages: [...state.messages, action.assistantMessage],
                status: Status.Idle,
                animatingId: action.assistantMessage.id,
            };
        case ActionType.AnimationDone:
            return { ...state, animatingId: null };
        case ActionType.Clear:
            return {
                messages: [],
                status: Status.Idle,
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
        status: Status.Idle,
        animatingId: null,
    }));

    const messagesRef = useRef<ChatMessage[]>(state.messages);

    const sendMessage = useCallback(
        async (content: string) => {
            const historySnapshot = [...messagesRef.current];
            const userMessage = createMessage(Role.User, content);

            dispatch({ type: ActionType.SendStart, userMessage });
            messagesRef.current = [...historySnapshot, userMessage];

            saveToStorage(messagesRef.current);

            const controller = new AbortController();

            // abort after fuzzy 4 - 6 seconds and use fallback messages, much snappier
            const result = await Promise.race([
                sendChatMessage(content, historySnapshot, controller.signal)
                    .then((r) => ({ status: RaceStatus.Ok, reply: r.reply }))
                    .catch((err) => ({ status: RaceStatus.Error, err })),
                new Promise<{ status: typeof RaceStatus.Timeout }>((resolve) =>
                    setTimeout(() => {
                        resolve({ status: RaceStatus.Timeout });
                        controller.abort();
                    }, TIMEOUT_BASE + Math.random() * TIMEOUT_JITTER),
                ),
            ]);

            if (result.status === RaceStatus.Ok) {
                const assistantMessage = createMessage(Role.Assistant, result.reply);
                dispatch({ type: ActionType.SendSuccess, assistantMessage });
                messagesRef.current = [...messagesRef.current, assistantMessage];

                saveToStorage(messagesRef.current);
            } else {
                console.error('[Scapegoat] API error:', result.status === RaceStatus.Timeout ? 'request timed out' : result.err);

                let rawReply: string;
                if (result.status === RaceStatus.Error
                    && result.err instanceof ChatApiError
                    && result.err.status === RATE_LIMIT_STATUS) {
                    rawReply = randomRateLimitFallback();
                } else {
                    rawReply = randomFallback();
                }

                const styled = styleFallback(rawReply, messagesRef.current);
                const fallback = createMessage(Role.Assistant, styled);
                dispatch({ type: ActionType.SendSuccess, assistantMessage: fallback });
                messagesRef.current = [...messagesRef.current, fallback];

                saveToStorage(messagesRef.current);
            }
        },
        [],
    );

    const clearChat = useCallback(() => {
        dispatch({ type: ActionType.Clear });
        messagesRef.current = [];
        saveToStorage([]);
    }, []);

    const onAnimationDone = useCallback(() => {
        dispatch({ type: ActionType.AnimationDone });
    }, []);


    return {
        messages: state.messages,
        isSending: state.status === Status.Sending,
        animatingId: state.animatingId,
        sendMessage,
        clearChat,
        onAnimationDone,
    };
}
