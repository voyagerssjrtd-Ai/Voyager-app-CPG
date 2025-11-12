// src/adapters/BrainAdapter.ts
import { ChatBackend, Message } from "../types/chat";
import { OpenAIAdapter } from "./OpenAIAdapter";
import {
  hfChat,
  hfGenerateImage,
  hfSummarize,
  hfTranscribeAudio,
} from "./HuggingFaceAdapter";

export const BrainAdapter: ChatBackend = {
  async sendMessage(content: string): Promise<Message> {
    const lower = content.toLowerCase();

    // 🖼️ image generation
    if (lower.startsWith("generate image")) {
      const prompt = content.replace(/generate image/i, "").trim();
      console.log("BrainAdapter: using HuggingFace image model");
      const img = await hfGenerateImage(prompt);
      return {
        id: Date.now().toString(),
        role: "assistant",
        content: `![image](${img})`,
        createdAt: new Date().toISOString(),
      };
    }

    // 📄 summarization
    if (lower.startsWith("summarize")) {
      const text = content.replace(/summarize/i, "").trim();
      console.log("BrainAdapter: using HuggingFace summarization model");
      const summary = await hfSummarize(text);
      return {
        id: Date.now().toString(),
        role: "assistant",
        content: summary,
        createdAt: new Date().toISOString(),
      };
    }

    // 🎙️ audio transcription
    // (you’d have to pass a File instead of string here; just showing for completeness)
    // if (content === 'transcribe') {
    //   console.log("BrainAdapter: using HuggingFace whisper model");
    //   const text = await hfTranscribeAudio(file);
    //   …
    // }

    // 📝 fallback: just chat (choose HF or OpenAI)
    console.log("BrainAdapter: using HuggingFace chat model");
    const reply = await hfChat(content); // or OpenAIAdapter.sendMessage(content)
    return {
      id: Date.now().toString(),
      role: "assistant",
      content: reply,
      createdAt: new Date().toISOString(),
    };
  },
};
