import axios, { AxiosError } from 'axios';
import type { ApiChatResponse, ApiMessage, ChatMessage } from '../types/chat';

export class ChatApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ChatApiError';
    this.status = status;
  }
}

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
  headers: { 'Content-Type': 'application/json' },
});

function buildMessages(content: string, history: ChatMessage[]): ApiMessage[] {
  return [
    ...history.map((m): ApiMessage => ({ role: m.role, content: m.content })),
    { role: 'user', content },
  ];
}

function extractReply(data: ApiChatResponse): string {
  if (Array.isArray(data.messages) && data.messages.length > 0) {
    const last = [...data.messages].reverse().find((m: ApiMessage) => m.role === 'assistant');
    if (last) return last.content;
  }

  if (typeof data.reply === 'string' && data.reply.length > 0) return data.reply;

  throw new Error('Unrecognised response shape from API.');
}

export async function sendChatMessage(
  content: string,
  history: ChatMessage[],
): Promise<{ reply: string }> {
  const messages = buildMessages(content, history);

  try {
    const { data } = await apiClient.post<ApiChatResponse>('/api/v1/chat', {
      messages,
    });
    return { reply: extractReply(data) };
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const detail = (err as AxiosError<{ detail?: string }>).response?.data?.detail;
      const status = err.response?.status;
      const message =
        typeof detail === 'string'
          ? detail
          : `server error (${status ?? 'network'})`;

      throw new ChatApiError(message, status);
    }
    throw err;
  }
}
