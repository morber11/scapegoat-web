export type Role = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
}

export interface ApiMessage {
  role: Role;
  content: string;
}

export type ApiChatEvent =
  | { type: 'processing' }
  | { type: 'reply'; messages: ApiMessage[] }
  | { type: 'error'; status: number; detail: string };
