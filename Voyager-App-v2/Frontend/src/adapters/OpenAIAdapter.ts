// src/adapters/OpenAIAdapter.ts
import OpenAI from "openai";
import { ChatBackend, Message } from "../types/chat";

/**
 * ⚠️ WARNING: Do NOT keep your API keys in frontend code in production.
 * Use this only for local testing or secured environments.
 */
const openai = new OpenAI({
  baseURL: "https://genailab.tcs.in",
  apiKey: "sk-m4zpk6v9j-WVZzqI4h1wuQ", // placeholder
  dangerouslyAllowBrowser: true,
});

export const OpenAIAdapter: ChatBackend = {
  /**
   * Non-streaming message (used for short prompts or fallback)
   */
  async sendMessage(content: string): Promise<Message> {
    const res = await openai.chat.completions.create({
      model: "azure/genailab-maas-gpt-4o",
      messages: [{ role: "user", content }],
    });

    // Some SDKs return choice.message.content, some return choice.text
    const replyText =
      res.choices?.[0]?.message?.content ??
      (res.choices?.[0] as any)?.text ??
      "";

    return {
      id: Date.now().toString(),
      role: "assistant",
      content: replyText,
      createdAt: new Date().toISOString(),
    };
  },

  /**
   * ✅ Streaming message (compatible with AbortController)
   *
   * Notes:
   * - onChunk is called only when there is new delta/text.
   * - onComplete will be called once at the end with the full accumulated text
   *   if the stream finished normally (not when aborted).
   */
  async streamMessage(
    content: string,
    onChunk: (chunk: string) => void,
    onComplete?: (finalMsg: Message) => void,
    signal?: AbortSignal
  ): Promise<void> {
    // create the streaming request
    const stream = await openai.chat.completions.create({
      model: "azure/genailab-maas-gpt-4o",
      messages: [{ role: "user", content }],
      stream: true,
    });

    let fullText = "";

    try {
      // The OpenAI client may return an async iterator. We iterate and process chunks.
      for await (const chunk of stream) {
        // If the user aborted, break and do NOT call onComplete
        if (signal?.aborted) {
          console.log("🛑 Aborted stream detected in adapter.");
          break;
        }

        // delta content can be in different places depending on SDK; try the common options
        // - streaming SDKs: choice.delta.content
        // - fallback: choice.text
        // - some variants: choice.message.content
        const choice = chunk?.choices?.[0] ?? {};
        const delta =
          (choice as any)?.delta?.content ??
          (choice as any)?.text ??
          (choice as any)?.message?.content ??
          "";

        if (delta && delta.length > 0) {
          fullText += delta;
          try {
            onChunk(delta);
          } catch (e) {
            // swallow UI callback errors so streaming continues
            console.warn("onChunk callback threw:", e);
          }
        }
      }

      // If the stream finished normally (not aborted), call onComplete with full text
      if (!signal?.aborted && typeof onComplete === "function") {
        try {
          onComplete({
            id: Date.now().toString(),
            role: "assistant",
            content: fullText,
            createdAt: new Date().toISOString(),
          });
        } catch (e) {
          console.warn("onComplete callback threw:", e);
        }
      }
    } catch (err: any) {
      // If adapter-level AbortError, allow caller to handle
      if (err?.name === "AbortError") {
        console.log("Stream aborted in adapter (handled).");
      } else {
        console.error("Stream error in adapter:", err);
        // rethrow so caller can show error if desired
        throw err;
      }
    } finally {
      // best-effort cleanup (some SDKs attach controller)
      try {
        if (typeof (stream as any).controller?.close === "function") {
          (stream as any).controller.close();
        }
      } catch {
        // ignore
      }
    }
  },
};

/**
 * Convenience helper: text generation
 */
export async function generateText(prompt: string): Promise<string> {
  const res = await openai.chat.completions.create({
    model: "azure/genailab-maas-gpt-4o",
    messages: [{ role: "user", content: prompt }],
  });

  return (
    res.choices?.[0]?.message?.content ??
    (res.choices?.[0] as any)?.text ??
    ""
  );
}

/**
 * Convenience helper: image generation
 */
export async function generateImage(prompt: string): Promise<string> {
  const res = await openai.images.generate({
    model: "dall-e-3",
    prompt,
    size: "1024x1024",
  });

  if (!res.data?.[0]?.url) throw new Error("No image URL returned from OpenAI");
  return res.data[0].url;
}

/**
 * Convenience helper: audio transcription
 */
export async function transcribeAudio(file: File): Promise<string> {
  const res = await openai.audio.transcriptions.create({
    file,
    model: "whisper-1",
  });
  return (res as any)?.text ?? "";
}
