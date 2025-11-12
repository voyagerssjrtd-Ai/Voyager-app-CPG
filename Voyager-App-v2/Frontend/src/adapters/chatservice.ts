import { ChatBackend, Message } from "../types/chat";

export async function handleUserInput(
  backend: ChatBackend,
  prompt: string,
  attachedFiles: File[] = [],
  signal?: AbortSignal    // ✅ added optional AbortSignal
): Promise<Message> {
  let content = prompt;
  if (attachedFiles.length > 0) {
    content += `\n[Attached: ${attachedFiles.map(f => f.name).join(", ")}]`;
  }

  if (backend.streamMessage && signal) {
    // ✅ streaming mode with Abort support
    let accumulated = "";
    return new Promise((resolve, reject) => {
      backend.streamMessage!(
        content,
        (chunk) => {
          accumulated += chunk;
        },
        (final) => {
          resolve(final || {
            id: Date.now().toString(),
            role: "assistant",
            content: accumulated,
            createdAt: new Date().toISOString(),
          });
        },
        signal
      ).catch(reject);
    });
  } else {
    // ✅ normal mode
    return backend.sendMessage(content);
  }
}
