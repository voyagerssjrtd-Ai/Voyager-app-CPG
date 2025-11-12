// src/types/chat.ts

// define roles
export type Role = 'user' | 'assistant';

// define message shape
export interface Message {
  id: string;
  role: Role;
  content: string;
  createdAt: string;
}

// define backend shape
export interface ChatBackend {
  /**
   * Send a single message (no streaming)
   */
  sendMessage(content: string, attachedFiles?: File[]): Promise<Message>;

  /**
   * Optional streaming support
   */
  streamMessage?: (
    content: string,
    onChunk: (chunk: string) => void,
    onComplete?: (final: Message) => void,
    signal?: AbortSignal
  ) => Promise<void>;
}
