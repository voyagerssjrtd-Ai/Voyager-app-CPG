// src/components/Chat-UI/ChatUI.tsx
import React, { useState, useEffect, useRef } from "react";
import { ChatBackend, Message } from "../../types/chat";
import { MessageBubble } from "./MessageBubble";
import { ArrowUpCircle, Mic, UploadCloud } from "lucide-react";
import { handleUserInput } from "../../adapters/chatservice";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

/**
 * ChatUI.tsx — anchored history/profile + new chat + slide/fade animation
 * - History & New chat buttons placed under the user name (Voyagers)
 * - Clicking Voyagers name opens an anchored Profile popup
 * - Popups animate with subtle slide+fade CSS
 * - Popups reposition on resize/scroll and close on outside click
 *
 * Overwrite src/components/Chat-UI/ChatUI.tsx
 */

function generateTitleFromMessage(text: string): string {
  if (!text) return "New Chat";
  let cleaned = text
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .split(" ")
    .filter((w) => w.length > 2)
    .slice(0, 6)
    .join(" ");
  return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) + "…" : "New Chat";
}

export default function ChatUI({ backend }: { backend: ChatBackend }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) navigate("/login");
  }, [user, navigate]);

  // core state (same as before)
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [streamingByChat, setStreamingByChat] = useState<Record<string, string>>({});
  const [isStreaming, setIsStreaming] = useState(false);
  const [chats, setChats] = useState<{ id: string; title: string; messages: Message[] }[]>([]);
  const [currentChat, setCurrentChat] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [recognition, setRecognition] = useState<any>(null);
  const [recording, setRecording] = useState(false);
  const [speechLang] = useState("en-US");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const controllerRef = useRef<AbortController | null>(null);
  const collectedRef = useRef<Record<string, string>>({});
  const currentChatRef = useRef<string | null>(currentChat);
    useEffect(() => {
    currentChatRef.current = currentChat;
  }, [currentChat]);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // avatar/hero image persisted via localStorage
  const [heroImage, setHeroImage] = useState<string | null>(() => {
    try {
      return localStorage.getItem("chatui.heroImage");
    } catch {
      return null;
    }
  });
  const heroInputRef = useRef<HTMLInputElement | null>(null);
  const attachInputRef = useRef<HTMLInputElement | null>(null);
  function setHeroFromFile(file?: File) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setHeroImage(url);
    try {
      localStorage.setItem("chatui.heroImage", url);
    } catch {}
  }

  // speech recognition
  useEffect(() => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      const rec = new SpeechRec();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = speechLang;
      rec.onresult = (event: any) => {
        const transcript = Array.from(event.results).map((r: any) => r[0].transcript).join("");
        setInput((prev) => prev + transcript + " ");
      };
      rec.onend = () => setRecording(false);
      rec.onerror = () => setRecording(false);
      setRecognition(rec);
    }
  }, [speechLang]);

  const toggleRecording = () => {
    if (!recognition) {
      alert("Speech recognition not supported in this browser");
      return;
    }
    if (recording) {
      recognition.stop();
      setRecording(false);
    } else {
      recognition.start();
      setRecording(true);
    }
  };

  // load chats
  useEffect(() => {
    const saved = localStorage.getItem("chats");
    if (saved) setChats(JSON.parse(saved));
  }, []);
  useEffect(() => {
    localStorage.setItem("chats", JSON.stringify(chats));
  }, [chats]);

  // title/suggestions helpers (robust)
  const requestTitleFromAssistant = async (replyText: string, chatId: string) => {
    if (!replyText) return;
    try {
      const prompt = `Generate a concise 3-6 word conversation title (no punctuation) summarizing this assistant reply:\n\n"${replyText}"\n\nTitle:`;
      const res = await handleUserInput(backend, prompt, []);
      const titleText = (res?.content ?? String(res)).toString().trim().split("\n")[0];
      const finalTitle = titleText && titleText.length > 0 ? titleText : generateTitleFromMessage(replyText);
      setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, title: finalTitle } : c)));
    } catch (e) {
      setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, title: generateTitleFromMessage(replyText) } : c)));
      console.warn("Title generation failed, used fallback", e);
    }
  };

  const requestSuggestionsFromAssistant = async (replyText: string) => {
    try {
      const prompt =
        `From the assistant reply below, produce exactly 3 short follow-up user prompts (2-8 words each), each on a separate line. Do NOT add numbering.\n\nAssistant reply:\n${replyText}\n\nSuggestions:\n`;
      const res = await handleUserInput(backend, prompt, []);
      const raw = (res?.content ?? String(res)).toString().trim();
      const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, 3);
      if (lines.length === 0) {
        setSuggestions([
          `Tell me more about ${replyText.split(/\s+/).slice(0,4).join(" ")}`,
          `Give examples related to ${replyText.split(/\s+/).slice(0,4).join(" ")}`,
          `Summarize key points about ${replyText.split(/\s+/).slice(0,4).join(" ")}`,
        ]);
      } else setSuggestions(lines);
    } catch {
      setSuggestions([]);
    }
  };

  // scroll helpers
  const isUserAtBottom = (): boolean => {
    const container = messagesEndRef.current?.parentElement;
    if (!container) return true;
    const distance = container.scrollHeight - container.scrollTop - container.clientHeight;
    return distance < 150;
  };
  const maybeAutoScroll = (force = false) => {
    if (!messagesEndRef.current) return;
    if (force || isUserAtBottom()) messagesEndRef.current.scrollIntoView({ behavior: "auto" });
  };

  const stopStreaming = () => {
    if (controllerRef.current) controllerRef.current.abort();
    setIsStreaming(false);
    setSending(false);
    if (currentChatRef.current) {
      setStreamingByChat((prev) => ({ ...prev, [currentChatRef.current!]: prev[currentChatRef.current!] ?? "" }));
    }
  };

  // sendMessage (same approach)
  const sendMessage = async () => {
    if ((!input.trim() && attachedFiles.length === 0) || sending) return;
    if (recognition && recording) {
      recognition.stop();
      setRecording(false);
    }

    let activeChatId = currentChat;
    let initialTitle = "New Chat";

    if (!activeChatId) {
      activeChatId = Date.now().toString();
      initialTitle = generateTitleFromMessage(input);
      const newChat = { id: activeChatId, title: initialTitle, messages: [] as Message[] };
      setChats((prev) => [...prev, newChat]);
      setCurrentChat(activeChatId);
      setMessages([]);
    }

    let userContent = input;
    if (attachedFiles.length > 0) userContent += "\n[Attached: " + attachedFiles.map((f) => f.name).join(", ") + "]";

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: userContent, createdAt: new Date().toISOString() };

    setMessages((prev) => [...prev, userMsg]);
    setChats((prev) =>
      prev.map((c) =>
        c.id === activeChatId
          ? { ...c, messages: [...c.messages, userMsg], title: c.messages.length === 0 ? generateTitleFromMessage(userContent) : c.title }
          : c
      )
    );

    setSending(true);
    setError(null);
    setSuggestions([]);

    if (activeChatId) {
      collectedRef.current[activeChatId] = "";
      setStreamingByChat((prev) => ({ ...prev, [activeChatId]: "" }));
    }

    const chatObj = chats.find((c) => c.id === activeChatId);
    const convoMessages = (chatObj?.messages ?? []).concat(userMsg);
    const payload = convoMessages.map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n");

    const abortController = new AbortController();
    controllerRef.current = abortController;

    try {
      if (typeof (backend as any).streamMessage === "function") {
        setIsStreaming(true);
        let localCollected = "";

        await (backend as any).streamMessage(
          payload,
          (chunk: string) => {
            localCollected += chunk;
            if (activeChatId) {
              collectedRef.current[activeChatId] = localCollected;
              setStreamingByChat((prev) => ({ ...prev, [activeChatId!]: localCollected }));
            }
            maybeAutoScroll(false);
          },
          async (finalMsg: Message | null) => {
            const wasAborted = abortController.signal.aborted;
            if (!wasAborted && finalMsg && finalMsg.content && finalMsg.content.length > 0) {
              setChats((prev) => prev.map((c) => (c.id === activeChatId ? { ...c, messages: [...c.messages, finalMsg] } : c)));
              if (currentChatRef.current === activeChatId) setMessages((prev) => [...prev, finalMsg]);
              setStreamingByChat((prev) => ({ ...prev, [activeChatId!]: "" }));
              setInput("");
              setAttachedFiles([]);
              try {
                await requestTitleFromAssistant(finalMsg.content, activeChatId!);
                await requestSuggestionsFromAssistant(finalMsg.content);
              } catch {}
              maybeAutoScroll(true);
              if (activeChatId) collectedRef.current[activeChatId] = "";
            }
            setIsStreaming(false);
            if (controllerRef.current === abortController) controllerRef.current = null;
          },
          abortController.signal
        );
      } else {
        const reply = await handleUserInput(backend, payload, attachedFiles);
        const botMsg: Message = { ...reply };
        setChats((prev) => prev.map((c) => (c.id === activeChatId ? { ...c, messages: [...c.messages, botMsg] } : c)));
        if (currentChatRef.current === activeChatId) setMessages((prev) => [...prev, botMsg]);
        setInput("");
        setAttachedFiles([]);
        try {
          await requestTitleFromAssistant(botMsg.content, activeChatId!);
          await requestSuggestionsFromAssistant(botMsg.content);
        } catch {}
        maybeAutoScroll(true);
      }
    } catch (err: any) {
      if (err?.name === "AbortError") {
        // aborted
      } else {
        setError(err?.message || "An error occurred while sending your message.");
        console.error("sendMessage error", err);
      }
    } finally {
      setSending(false);
      setIsStreaming(false);
      if (controllerRef.current && controllerRef.current.signal === abortController.signal) controllerRef.current = null;
      inputRef.current?.focus();
    }
  };

  // auto-resize textarea
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    const scrollHeight = el.scrollHeight;
    const MAX_HEIGHT = 160;
    if (scrollHeight > MAX_HEIGHT) {
      el.style.height = `${MAX_HEIGHT}px`;
      el.style.overflowY = "auto";
    } else {
      el.style.height = `${scrollHeight}px`;
      el.style.overflowY = "hidden";
    }
  }, [input]);

  // History anchor/modal controls
  const [showHistory, setShowHistory] = useState(false);
  const historyBtnRef = useRef<HTMLButtonElement | null>(null);
  const [historyStyle, setHistoryStyle] = useState<React.CSSProperties | null>(null);
  const historyContainerRef = useRef<HTMLDivElement | null>(null);

  const openHistoryAnchored = () => {
    const btn = historyBtnRef.current;
    if (!btn) {
      setShowHistory(true);
      setHistoryStyle(null);
      return;
    }
    const rect = btn.getBoundingClientRect();
    const width = 320;
    const top = rect.bottom + window.scrollY + 8;
    let left = rect.left + window.scrollX; // align left with button
    // clamp
    if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8;
    if (left < 8) left = 8;
    setHistoryStyle({ position: "absolute", top: `${top}px`, left: `${left}px`, width: `${width}px`, zIndex: 1200 });
    setShowHistory(true);
  };

  useEffect(() => {
    if (!showHistory) return;
    function reposition() {
      const btn = historyBtnRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const width = 320;
      const top = rect.bottom + window.scrollY + 8;
      let left = rect.left + window.scrollX;
      if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8;
      if (left < 8) left = 8;
      setHistoryStyle((s) => ({ ...(s || {}), top: `${top}px`, left: `${left}px` }));
    }
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [showHistory]);

  useEffect(() => {
    if (!showHistory) return;
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (!historyContainerRef.current) return;
      if (historyContainerRef.current.contains(target)) return;
      if (historyBtnRef.current && historyBtnRef.current.contains(target)) return;
      setShowHistory(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [showHistory]);

  function selectHistory(id: string) {
    setCurrentChat(id);
    const found = chats.find((c) => c.id === id);
    setMessages(found ? found.messages : []);
    setShowHistory(false);
  }
  function deleteHistory(id: string) {
    setChats((prev) => prev.filter((c) => c.id !== id));
    if (currentChat === id) {
      setCurrentChat(null);
      setMessages([]);
    }
  }

  // Profile popup controls (anchored to name element)
  const [showProfile, setShowProfile] = useState(false);
  const nameRef = useRef<HTMLDivElement | null>(null);
  const profileContainerRef = useRef<HTMLDivElement | null>(null);
  const [profileStyle, setProfileStyle] = useState<React.CSSProperties | null>(null);

  const openProfileAnchored = () => {
    const node = nameRef.current;
    if (!node) {
      setShowProfile(true);
      return;
    }
    const rect = node.getBoundingClientRect();
    const width = 300;
    const top = rect.bottom + window.scrollY + 8;
    let left = rect.left + window.scrollX;
    if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8;
    if (left < 8) left = 8;
    setProfileStyle({ position: "absolute", top: `${top}px`, left: `${left}px`, width: `${width}px`, zIndex: 1200 });
    setShowProfile(true);
  };

  useEffect(() => {
    if (!showProfile) return;
    function reposition() {
      const node = nameRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const width = 300;
      const top = rect.bottom + window.scrollY + 8;
      let left = rect.left + window.scrollX;
      if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8;
      if (left < 8) left = 8;
      setProfileStyle((s) => ({ ...(s || {}), top: `${top}px`, left: `${left}px` }));
    }
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [showProfile]);

  useEffect(() => {
    if (!showProfile) return;
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (!profileContainerRef.current) return;
      if (profileContainerRef.current.contains(target)) return;
      if (nameRef.current && nameRef.current.contains(target)) return;
      setShowProfile(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [showProfile]);

  // small blob SVG with mask used earlier
  const BlobWithImage = ({ src, size = 96 }: { src?: string | null; size?: number }) => {
    const path =
      "M86.9,-72.3C108.3,-52,119.1,-26,118.1,-1.8C117.1,22.4,104.3,44.9,84.7,62.1C65.1,79.3,38.6,91.1,10.2,92.9C-18.2,94.7,-48.5,86.5,-69.8,68.4C-91.1,50.4,-103.3,22.4,-103.8,-5.5C-104.3,-33.4,-93.2,-61.2,-72.9,-81.5C-52.6,-101.8,-26.3,-114.6,2.4,-116.2C31.1,-117.8,62.1,-108.6,86.9,-72.3Z";
    const view = 240;
    return (
      <svg viewBox={`-120 -120 ${view} ${view}`} style={{ width: size, height: size }}>
        <defs>
          <clipPath id="blobClipHero">
            <path d={path} transform="scale(0.6) translate(0,32)" />
          </clipPath>
          <linearGradient id="blobGradHero" x1="0" x2="1">
            <stop offset="0%" stopColor="#0ea5e9" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
          <filter id="blobShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="8" stdDeviation="14" floodColor="#001022" floodOpacity="0.28" />
          </filter>
        </defs>

        <g clipPath="url(#blobClipHero)" filter="url(#blobShadow)">
          <rect x="-120" y="-120" width={view} height={view} fill="url(#blobGradHero)" />
          {src ? <image href={src} x="-120" y="-120" width={view} height={view} preserveAspectRatio="xMidYMid slice" /> : null}
        </g>

        <path d={path} transform="scale(0.6) translate(0,32)" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.2" />
      </svg>
    );
  };

  // quick send helper
  const sendPrompt = (p: string) => {
    setInput(p);
    setTimeout(() => sendMessage(), 80);
  };

  // CSS for glass buttons and animations
  const StyleBlock = () => (
    <style>{`
      .glass-btn {
        background: rgba(255,255,255,0.06);
        backdrop-filter: blur(6px) saturate(120%);
        -webkit-backdrop-filter: blur(6px) saturate(120%);
        border: 1px solid rgba(255,255,255,0.08);
        color: rgba(255,255,255,0.95);
        padding: 6px 10px;
        border-radius: 12px;
        transition: transform .15s ease, box-shadow .15s ease;
        box-shadow: 0 6px 18px rgba(2,6,23,0.32);
      }
      .glass-btn:hover { transform: translateY(-3px) scale(1.02); box-shadow: 0 10px 26px rgba(2,6,23,0.42); }

      @keyframes slideFade {
        from { transform: translateY(-8px); opacity: 0; }
        to   { transform: translateY(0); opacity: 1; }
      }
      .popup-animate {
        animation: slideFade 220ms cubic-bezier(.2,.9,.2,1);
      }
    `}</style>
  );

  return (
    <div className="h-screen overflow-hidden" style={{ background: "linear-gradient(180deg,#021827 0%, #001420 100%)" }}>
      <StyleBlock />

      <div className="flex h-full">
        {/* LEFT: large chat area */}
        <div className="w-2/3 p-8 flex flex-col gap-4" style={{ minWidth: 0 }}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="transform-gpu" style={{ animation: "floaty 5.4s ease-in-out infinite" as any }}>
                <BlobWithImage src={heroImage} size={96} />
              </div>
              <div>
                <h2 className="text-white text-2xl font-bold">Sales AI</h2>
                <p className="text-sky-200 text-sm">Ask for insights, recommendations & alerts</p>
              </div>
            </div>

            {/* user area: avatar + name (clickable) + History/New chat below name */}
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-3 text-white/90">
                <img src={user?.picture ?? ""} alt="avatar" className="w-8 h-8 rounded-full object-cover bg-white/10" />
                <div>
                  <div
                    ref={nameRef}
                    onClick={() => openProfileAnchored()}
                    style={{ cursor: "pointer" }}
                    className="text-sm font-medium text-white/95 hover:underline"
                  >
                    {user?.name ?? user?.email ?? "Voyagers"}
                  </div>

                  {/* subtle place-holder small meta */}
                  <div className="text-xs text-sky-200">Enterprise</div>
                </div>
              </div>

              {/* Buttons below the name */}
              <div className="flex items-center gap-3 mt-1">
                <button onClick={() => { /* new chat creates empty conversation */ const id = Date.now().toString(); setChats([...chats, { id, title: "New chat", messages: [] }]); setCurrentChat(id); setMessages([]); }} className="glass-btn text-sm">
                  New chat
                </button>

                <button ref={historyBtnRef} onClick={openHistoryAnchored} className="glass-btn text-sm">
                  History
                </button>
              </div>
            </div>
          </div>

          {/* Chat card */}
          <div className="bg-white rounded-2xl p-4 flex-1 overflow-auto shadow-lg" style={{ minHeight: 0 }}>
            <div className="space-y-4">
              {messages.length === 0 && (
                <div className="p-6 text-gray-600">
                  <h3 className="text-xl font-semibold mb-2">Welcome</h3>
                  <p className="text-sm">Start a conversation — try "Show me sales trends for last quarter".</p>
                </div>
              )}

              <div className="px-2 space-y-3">
                {messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)}

                {currentChat && streamingByChat[currentChat] && (
                  <div className="bg-gray-100 text-gray-800 p-2 rounded-xl whitespace-pre-wrap">
                    {streamingByChat[currentChat]}
                    <span className="animate-pulse">|</span>
                  </div>
                )}

                {sending && !isStreaming && (
                  <div className="bg-gray-100 text-gray-800 p-2 rounded-xl whitespace-pre-wrap animate-pulse">Thinking…</div>
                )}

                {error && <div className="bg-red-50 text-red-700 p-2 rounded mb-2 border border-red-100"><strong>Error:</strong> {error}</div>}

                {suggestions.length > 0 && (
                  <div className="flex gap-2 flex-wrap mt-2">
                    {suggestions.map((s, i) => (
                      <button key={i} onClick={() => setInput(s)} className="px-3 py-2 bg-white border rounded-full text-sm hover:bg-gray-50">{s}</button>
                    ))}
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>
          </div>

          {/* Input area */}
          <div className="mt-2">
            {attachedFiles.length > 0 && (
              <div className="flex items-center gap-2 mb-2 overflow-x-auto">
                {attachedFiles.map((f, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-gray-100 rounded px-2 py-1 text-xs">
                    {f.type.startsWith("image/") ? (
                      <img src={URL.createObjectURL(f)} alt={f.name} className="w-12 h-12 rounded object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded bg-gray-200 flex items-center justify-center text-gray-600">📄</div>
                    )}
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-gray-800">{f.name.length > 20 ? f.name.slice(0,18) + "…" : f.name}</span>
                      <span className="text-xs text-gray-500">{(f.size / 1024).toFixed(0)} KB</span>
                    </div>
                    <button onClick={() => setAttachedFiles((prev) => prev.filter((_, i) => i !== idx))} className="text-red-500 ml-2">✕</button>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-white rounded-lg border shadow px-3 py-2 flex items-center gap-3">
              <textarea
                ref={inputRef}
                rows={1}
                className={`flex-1 px-2 py-2 focus:outline-none resize-none bg-transparent ${inputRef.current && inputRef.current.scrollHeight > 160 ? "overflow-y-auto" : "overflow-hidden"}`}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage())}
                placeholder="Type a message..."
                disabled={sending}
              />

              <div className="flex items-center gap-2">
                <button title="Attach file" onClick={() => attachInputRef.current?.click()} className="w-10 h-10 flex items-center justify-center rounded-full text-sky-600 hover:bg-sky-50">
                  <UploadCloud className="w-5 h-5" />
                </button>

                <button title="Record voice" onClick={toggleRecording} className={`w-10 h-10 flex items-center justify-center rounded-full ${recording ? "text-red-500 animate-pulse" : "text-sky-600 hover:bg-sky-50"}`}>
                  <Mic className="w-5 h-5" />
                </button>

                {isStreaming || sending ? (
                  <button onClick={stopStreaming} className="w-10 h-10 rounded-full text-red-500">✕</button>
                ) : (
                  <button onClick={sendMessage} className="w-10 h-10 rounded-full text-white bg-sky-600 hover:bg-sky-700 flex items-center justify-center">
                    <ArrowUpCircle className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            <input ref={attachInputRef} type="file" multiple accept="*" className="hidden" onChange={(e) => {
              const files = e.target.files;
              if (files && files.length > 0) setAttachedFiles((prev) => [...prev, ...Array.from(files)]);
            }} />
          </div>
        </div>

        {/* RIGHT: options */}
        <div className="w-1/3 p-8" style={{ minWidth: 320 }}>
          <div className="bg-[#082a43] rounded-2xl p-6 shadow-inner h-full text-sky-100 flex flex-col overflow-hidden">
            <h3 className="text-2xl font-bold mb-4">Highlights</h3>

            <div className="flex-1 overflow-auto pr-2 space-y-4">
              <button onClick={() => sendPrompt("Give me insights for last month")} className="rounded-lg bg-[#0c3b59] p-4 w-full flex items-center gap-4 hover:scale-[1.01] transition">
                <img src="/assets/insights.png" alt="insights" className="w-20 h-20 rounded-lg object-cover" />
                <div className="text-left">
                  <h4 className="font-semibold text-lg text-white">Insights</h4>
                  <p className="text-sm text-sky-200 mt-1">Access metrics and trends</p>
                </div>
              </button>

              <button onClick={() => sendPrompt("Recommend quantity and timing for promotions")} className="rounded-lg bg-[#0b3a55] p-4 w-full flex items-center gap-4 hover:scale-[1.01] transition">
                <img src="/assets/recommendations.png" alt="recommendations" className="w-20 h-20 rounded-lg object-cover" />
                <div className="text-left">
                  <h4 className="font-semibold text-lg text-white">Recommendations</h4>
                  <p className="text-sm text-sky-200 mt-1">Get suggestions on quantity & timing</p>
                </div>
              </button>

              <button onClick={() => sendPrompt("Show current alerts and action plans")} className="rounded-lg bg-[#0b364a] p-4 w-full flex items-center gap-4 hover:scale-[1.01] transition">
                <img src="/assets/alerts.png" alt="alerts" className="w-20 h-20 rounded-lg object-cover" />
                <div className="text-left">
                  <h4 className="font-semibold text-lg text-white">Alerts</h4>
                  <p className="text-sm text-sky-200 mt-1">Receive action plans</p>
                </div>
              </button>

              <div>
                <h5 className="text-sm text-sky-300 mb-2 mt-3">Quick prompts</h5>
                <div className="flex flex-col gap-2">
                  {["Summarize last month", "Top customers", "Generate outreach"].map((p) => (
                    <button key={p} onClick={() => sendPrompt(p)} className="text-left px-3 py-2 bg-[#022735] rounded hover:bg-[#033848]">{p}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 text-xs text-sky-300 pt-4">Demo: cards send demo prompts into the chat.</div>
          </div>
        </div>
      </div>

      {/* Anchored History popup (below History button) */}
      {showHistory && (
        <div ref={historyContainerRef} style={historyStyle ?? { position: "absolute", top: 80, left: 16, width: 320, zIndex: 1200 }} className="popup-animate">
          <div className="bg-white rounded-lg shadow-lg max-h-[70vh] overflow-auto">
            <div className="flex items-center justify-between p-3 border-b">
              <div className="font-semibold">Conversations</div>
              <button className="text-xs text-gray-500" onClick={() => setShowHistory(false)}>Close</button>
            </div>

            <div>
              {chats.length === 0 && <div className="p-4 text-sm text-gray-600">No history yet</div>}
              {chats.map((c) => (
                <div key={c.id} className="flex items-center justify-between px-3 py-2 hover:bg-gray-50">
                  <button className="text-left flex-1 text-sm" onClick={() => selectHistory(c.id)}>{c.title}</button>
                  <button onClick={() => deleteHistory(c.id)} className="text-red-500 text-xs ml-2">Delete</button>
                </div>
              ))}
            </div>

            <div className="p-3 border-t">
              <div className="text-xs text-gray-500">Tip: click a conversation to open it.</div>
            </div>
          </div>
        </div>
      )}

      {/* Anchored Profile popup (below user name) */}
      {showProfile && (
        <div ref={profileContainerRef} style={profileStyle ?? { position: "absolute", top: 80, left: 16, width: 300, zIndex: 1200 }} className="popup-animate">
          <div className="bg-white rounded-lg shadow-lg overflow-auto">
            <div className="p-4 border-b flex items-center gap-3">
              <img src={user?.picture ?? ""} alt="avatar" className="w-12 h-12 rounded-full object-cover" />
              <div>
                <div className="font-semibold">{user?.name ?? user?.email ?? "Voyagers"}</div>
                <div className="text-xs text-gray-500">{user?.email ?? "No email"}</div>
              </div>
            </div>

            <div className="p-3">
              <div className="text-sm mb-2 font-medium">Account</div>
              <div className="text-xs text-gray-600 mb-3">Member since: (demo)</div>

              <button onClick={() => { logout(); }} className="w-full bg-red-50 text-red-600 py-2 rounded">Sign out</button>
            </div>
          </div>
        </div>
      )}

      {/* hidden hero input */}
      <input ref={heroInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) setHeroFromFile(f);
      }} />
    </div>
  );
}
