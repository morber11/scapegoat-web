import type { ApiChatEvent, ApiMessage, ChatMessage } from '../types/chat';

export class ChatApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
        super(message);
        this.name = 'ChatApiError';
        this.status = status;
    }
}

const CHAT_URL = `${import.meta.env.VITE_API_URL ?? ''}/api/v1/chat`;

// the backend sends a heartbeat every 2 seconds, so this much silence means it is gone
const IDLE_TIMEOUT_MS = 10000;

export async function sendChatMessage(content: string, history: ChatMessage[]): Promise<string> {
    const messages: ApiMessage[] = [];
    for (const message of history) {
        messages.push({ role: message.role, content: message.content });
    }
    messages.push({ role: 'user', content });

    const controller = new AbortController();
    let idleTimer: ReturnType<typeof setTimeout> | undefined;

    function resetIdleTimer(): void {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => controller.abort(), IDLE_TIMEOUT_MS);
    }

    resetIdleTimer();

    try {
        const response = await fetch(CHAT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages }),
            signal: controller.signal,
        });

        if (!response.ok) {
            throw new ChatApiError(`server error (${response.status})`, response.status);
        }

        // a successful POST response always has a body
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const chunk = await reader.read();
            if (chunk.done) break;

            resetIdleTimer();
            buffer += decoder.decode(chunk.value, { stream: true });

            const lines = buffer.split('\n');
            buffer = lines[lines.length - 1];
            const completeLines = lines.slice(0, -1);

            for (const line of completeLines) {
                const event = JSON.parse(line) as ApiChatEvent;

                if (event.type === 'error') {
                    throw new ChatApiError(event.detail, event.status);
                }

                if (event.type === 'reply') {
                    const lastMessage = event.messages[event.messages.length - 1];
                    return lastMessage.content;
                }
            }
        }

        throw new Error('stream ended without a reply');
    } finally {
        clearTimeout(idleTimer);
    }
}
