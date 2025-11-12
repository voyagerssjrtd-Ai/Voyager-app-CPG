// OllamaAdapter.ts
import { ChatBackend, Message } from "../types/chat";

const BASE_URL = "http://localhost:11434/api/generate";

function buildStructuredPrompt(userPrompt: string) {
  return `
You are a helpful assistant. Format your response as follows:
- Start with a short one-line **title** at the top
- Use Markdown headings (## for sections, ### for subsections)
- Include relevant **emojis** in headings and bullet points
- Bold key terms
- Use bullet points or numbered lists
- Keep content clear, structured, and easy to read

User prompt: ${userPrompt}
  `;
}

export const OllamaAdapter: ChatBackend = {
  // Non-streaming request
  sendMessage: async (content: string): Promise<Message> => {
    const structuredPrompt = buildStructuredPrompt(content);

    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "llama3", prompt: structuredPrompt, stream: false }),
    });

    const data = await res.json();

    return {
      id: Date.now().toString(),
      role: "assistant",
      content: data.response,
      createdAt: new Date().toISOString(),
    };
  },

  // Streaming request
  streamMessage: async (
    content: string,
    onChunk: (chunk: string) => void,
    onComplete?: (final: Message) => void,
    signal?: AbortSignal
  ) => {
    const structuredPrompt = buildStructuredPrompt(content);

    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "llama3", prompt: structuredPrompt, stream: true }),
      signal,
    });

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
      const { done, value } = await reader!.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n").filter((line) => line.trim() !== "");

      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (data.response) {
            fullText += data.response;
            onChunk(data.response);
          }
          if (data.done) {
            const finalMsg: Message = {
              id: Date.now().toString(),
              role: "assistant",
              content: fullText,
              createdAt: new Date().toISOString(),
            };
            onComplete?.(finalMsg);
          }
        } catch (err) {
          console.error("Stream parse error:", err, line);
        }
      }
    }
  },
};
