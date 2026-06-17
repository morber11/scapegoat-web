import type { ChatMessage } from '../types/chat';

export function styleFallback(reply: string, messages: ChatMessage[]): string {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
    let styled = reply;

    if (lastUser && lastUser === lastUser.toLowerCase()) {
        styled = styled.toLowerCase();
    }

    if (lastUser.trim().endsWith('.') && !/[.!?]$/.test(styled)) {
        styled = styled + '.';
    }

    return styled;
}
