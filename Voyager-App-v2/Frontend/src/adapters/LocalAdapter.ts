import { ChatBackend, Message } from '../types/chat';

export const LocalAdapter: ChatBackend = {
  async sendMessage(content: string): Promise<Message> {
    await new Promise(r => setTimeout(r, 600));
    return {
      id: Date.now().toString(),
      role: 'assistant',
      content: `${content}`,
      createdAt: new Date().toISOString(),
    };
  }
};
