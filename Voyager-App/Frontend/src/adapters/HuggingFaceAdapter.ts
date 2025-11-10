// src/adapters/HuggingFaceAdapter.ts
import { Message } from "../types/chat";
 
/**
 * ⚠️ Hard-coding a token exposes it to everyone; only for dev/testing
 */
const HF_TOKEN = "";

const HF_HEADERS_JSON = {
  Authorization: `Bearer ${HF_TOKEN}`,
  "Content-Type": "application/json",
};

// 📝 text-chat (instruct)
export async function hfChat(prompt: string): Promise<string> {
  const res = await fetch("https://router.huggingface.co/v1/chat/completions", {
    method: "POST",
    headers: HF_HEADERS_JSON,
    body: JSON.stringify({
      model: "mistralai/Mistral-7B-Instruct-v0.2:featherless-ai",
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`HF chat error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// 🖼️ image generation (text → image)
export async function hfGenerateImage(prompt: string): Promise<string> {
  const res = await fetch(
    "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2",
    {
      method: "POST",
      headers: HF_HEADERS_JSON,
      body: JSON.stringify({ inputs: prompt }),
    }
  );

  if (!res.ok) throw new Error(`HF image error ${res.status}: ${await res.text()}`);
  const blob = await res.blob();
  return URL.createObjectURL(blob); // local blob URL for <img src>
}

// 🔊 speech-to-text (Whisper style)
export async function hfTranscribeAudio(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(
    "https://api-inference.huggingface.co/models/openai/whisper-small",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`, // no content-type for FormData
      },
      body: form,
    }
  );

  if (!res.ok) throw new Error(`HF audio error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  // Some whisper endpoints return { text: "..."}; others return array
  return data.text ?? data[0]?.text ?? "";
}

// 📄 pdf/text summarize (BART)
export async function hfSummarize(text: string): Promise<string> {
  const res = await fetch(
    "https://api-inference.huggingface.co/models/facebook/bart-large-cnn",
    {
      method: "POST",
      headers: HF_HEADERS_JSON,
      body: JSON.stringify({ inputs: text }),
    }
  );

  if (!res.ok) throw new Error(`HF summarise error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  // bart returns array of {summary_text}
  return data[0]?.summary_text ?? "";
}
