import { afterEach, describe, it, expect, vi } from 'vitest';
import { ChatApiError, sendChatMessage } from './chatApi';

function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder();

    return new ReadableStream({
        start(controller) {
            for (const chunk of chunks) {
                controller.enqueue(encoder.encode(chunk));
            }
            controller.close();
        },
    });
}

function respondWith(response: Response): void {
    vi.stubGlobal('fetch', async () => response);
}

describe('sendChatMessage', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('returns the reply when it arrives split across chunks after a heartbeat', async () => {
        respondWith(new Response(streamOf([
            '{"type": "processing"}\n{"type": "reply", "messages": [{"role": "user", "con',
            'tent": "who did this"}, {"role": "assistant", "content": "that was me"}]}\n',
        ])));

        const reply = await sendChatMessage('who did this', []);

        expect(reply).toBe('that was me');
    });

    it('rejects with the status from an error event', async () => {
        respondWith(new Response(streamOf([
            '{"type": "error", "status": 429, "detail": "rate limit exceeded"}\n',
        ])));

        const error = await sendChatMessage('hello', []).catch((err: unknown) => err);

        expect(error).toBeInstanceOf(ChatApiError);
        expect((error as ChatApiError).status).toBe(429);
    });

    it('rejects with the status when the request is refused before streaming', async () => {
        respondWith(new Response('{"detail": "rate limit exceeded"}', { status: 429 }));

        const error = await sendChatMessage('hello', []).catch((err: unknown) => err);

        expect(error).toBeInstanceOf(ChatApiError);
        expect((error as ChatApiError).status).toBe(429);
    });
});
