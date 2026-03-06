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

export interface ApiChatResponse {
  messages?: ApiMessage[];
  reply?: string;
}
