// src/components/Chat-UI/ChatUI.tsx
import React, { useState, useEffect, useRef } from 'react';
import { ChatBackend, Message } from '../../types/chat';
import Sidebar from './sidebar';
import { MessageBubble } from './MessageBubble';
import { ArrowUpCircle, Mic } from 'lucide-react';
import { handleUserInput } from '../../adapters/chatservice';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

// 🔹 Utility to refine titles (fallback)
function generateTitleFromMessage(text: string): string {
  if (!text) return 'New Chat';
  let cleaned = text
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .split(' ')
    .filter((w) => w.length > 2)
    .slice(0, 6)
    .join(' ');
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1) + '…';
}

export default function ChatUI({ backend }: { backend: ChatBackend }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  // 🔹 Per-chat streaming state
  const [streamingByChat, setStreamingByChat] = useState<Record<string, string>>({});
  const [isStreaming, setIsStreaming] = useState(false);

  const [chats, setChats] = useState<{ id: string; title: string; messages: Message[] }[]>([]);
  const [currentChat, setCurrentChat] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const [recognition, setRecognition] = useState<any>(null);
  const [recording, setRecording] = useState(false);
  const [speechLang, setSpeechLang] = useState('en-US');

  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

  // controller for streaming stop
  const controllerRef = useRef<AbortController | null>(null);

  // helper ref to store collected partial text per chat (avoids stale closure problems)
  const collectedRef = useRef<Record<string, string>>({});

  // keep latest currentChat in a ref for callbacks
  const currentChatRef = useRef<string | null>(currentChat);
  useEffect(() => {
    currentChatRef.current = currentChat;
  }, [currentChat]);

  const [error, setError] = useState<string | null>(null);

  // suggestions (generated from assistant reply)
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // helper: is user near the bottom of the messages container?
  const isUserAtBottom = (): boolean => {
    const container = messagesEndRef.current?.parentElement;
    if (!container) return true;
    const distance = container.scrollHeight - container.scrollTop - container.clientHeight;
    return distance < 150;
  };

  // auto-scroll if user near bottom
  const maybeAutoScroll = (force = false) => {
    if (!messagesEndRef.current) return;
    if (force || isUserAtBottom()) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('chats');
    if (saved) setChats(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('chats', JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      const rec = new SpeechRec();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = speechLang;
      rec.onresult = (event: any) => {
        const transcript = Array.from(event.results).map((r: any) => r[0].transcript).join('');
        setInput((prev) => prev + transcript + ' ');
      };
      rec.onend = () => setRecording(false);
      rec.onerror = () => setRecording(false);
      setRecognition(rec);
    }
  }, [speechLang]);

  const toggleRecording = () => {
    if (!recognition) {
      alert('Speech recognition not supported in this browser');
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

  // helper: ask backend for a short title based on assistant reply (only once)
  const requestTitleFromAssistant = async (replyText: string, chatId: string) => {
    try {
      // Get current title first
      const chat = chats.find((c) => c.id === chatId);
      if (!chat) return;

      // Only update if title is "New chat" or looks auto-generated
      const existingTitle = chat.title?.trim().toLowerCase();
      if (existingTitle && existingTitle !== 'new chat' && !existingTitle.endsWith('…')) {
        console.log('Skipping title update — already finalized:', existingTitle);
        return; // do not regenerate title
      }

      const prompt = `Generate a concise 3-6 word conversation title (no punctuation) summarizing this assistant reply:\n\n"${replyText}"\n\nTitle:`;
      const res = await handleUserInput(backend, prompt, []);
      const titleText =
        (res?.content ?? String(res)).toString().trim().split('\n')[0] ||
        generateTitleFromMessage(replyText);

      setChats((prev) =>
        prev.map((c) => (c.id === chatId ? { ...c, title: titleText } : c))
      );
    } catch (e) {
      console.warn('Title generation failed, using fallback', e);
      setChats((prev) =>
        prev.map((c) =>
          c.id === chatId ? { ...c, title: generateTitleFromMessage(replyText) } : c
        )
      );
    }
  };

  // helper: ask backend for 3 suggested follow-ups from assistant reply
  const requestSuggestionsFromAssistant = async (replyText: string) => {
    try {
      const prompt =
        `From the assistant reply below, produce exactly 3 short follow-up user prompts (2-8 words each), each on a separate line. Do NOT add numbering.\n\nAssistant reply:\n${replyText}\n\nSuggestions:\n`;
      const res = await handleUserInput(backend, prompt, []);
      const raw = (res?.content ?? String(res)).toString().trim();
      // parse by newline; keep up to 3 non-empty lines
      const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, 3);
      // if parsing yields none, fall back to quick heuristics
      if (lines.length === 0) {
        const fallback = [
          `Tell me more about ${replyText.split(/\s+/).slice(0, 4).join(' ')}`,
          `Give examples related to ${replyText.split(/\s+/).slice(0, 4).join(' ')}`,
          `Summarize the key points about ${replyText.split(/\s+/).slice(0, 4).join(' ')}`,
        ];
        setSuggestions(fallback);
      } else {
        setSuggestions(lines);
      }
    } catch (e) {
      console.warn('Suggestion generation failed', e);
      setSuggestions([]);
    }
  };

  // STOP streaming (abort)
  const stopStreaming = () => {
    if (controllerRef.current) {
      controllerRef.current.abort();
      console.log('🛑 Streaming stopped manually.');
      // leave controllerRef for final cleanup in finally-block
    }
    setIsStreaming(false);
    setSending(false);

    // keep the current partial content visible (do not clear)
    if (currentChatRef.current) {
      setStreamingByChat((prev) => ({ ...prev, [currentChatRef.current!]: prev[currentChatRef.current!] ?? '' }));
    }
  };

  const sendMessage = async () => {
    if ((!input.trim() && attachedFiles.length === 0) || sending) return;
    if (recognition && recording) {
      recognition.stop();
      setRecording(false);
    }

    // capture stable chat id for this send operation
    let activeChatId = currentChat;
    let initialTitle = 'New chat';

    if (!activeChatId) {
      activeChatId = Date.now().toString();
      initialTitle = generateTitleFromMessage(input);
      const newChat = { id: activeChatId, title: initialTitle, messages: [] as Message[] };
      setChats((prev) => [...prev, newChat]);
      setCurrentChat(activeChatId);
      setMessages([]);
    }

    // Build user message text
    let userContent = input;
    if (attachedFiles.length > 0) {
      userContent += '\n[Attached: ' + attachedFiles.map((f) => f.name).join(', ') + ']';
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userContent,
      createdAt: new Date().toISOString(),
    };

    // push user message into UI and into chat history for this activeChatId
    setMessages((prev) => [...prev, userMsg]);
    setChats((prev) =>
      prev.map((c) =>
        c.id === activeChatId
          ? {
              ...c,
              messages: [...c.messages, userMsg],
              title: c.messages.length === 0 ? generateTitleFromMessage(userContent) : c.title,
            }
          : c
      )
    );

    setSending(true);
    setError(null);
    setSuggestions([]);

    // prepare streaming slot and collectedRef entry for this chat
    if (activeChatId) {
      collectedRef.current[activeChatId] = '';
      setStreamingByChat((prev) => ({ ...prev, [activeChatId]: '' }));
    }

    // build a context payload (chat history + new user message) so backend can continue topic
    const chatObj = chats.find((c) => c.id === activeChatId);
    const convoMessages = (chatObj?.messages ?? []).concat(userMsg);
    // construct a textual payload with role markers (adapter may ignore but it helps)
    const payload = convoMessages.map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');

    // create abort controller for this operation
    const abortController = new AbortController();
    controllerRef.current = abortController;

    try {
      // ✅ Stream or normal send
      if (typeof (backend as any).streamMessage === 'function') {
        setIsStreaming(true);
        let localCollected = '';

        await (backend as any).streamMessage(
          payload,
          (chunk: string) => {
            localCollected += chunk;
            if (activeChatId) {
              collectedRef.current[activeChatId] = localCollected;
              setStreamingByChat((prev) => ({ ...prev, [activeChatId!]: localCollected }));
            }
            // gentle auto-scroll while streaming
            maybeAutoScroll(false);
          },
          async (finalMsg: Message | null) => {
            const wasAborted = abortController.signal.aborted;
            console.log('stream complete callback', { chat: activeChatId, aborted: wasAborted, finalLen: finalMsg?.content?.length ?? 0 });

            if (!wasAborted && finalMsg && finalMsg.content && finalMsg.content.length > 0) {
              // append final message into the corresponding chat
              setChats((prev) =>
                prev.map((c) => (c.id === activeChatId ? { ...c, messages: [...c.messages, finalMsg] } : c))
              );
              // if we are still viewing that chat, append to current messages UI
              if (currentChatRef.current === activeChatId) {
                setMessages((prev) => [...prev, finalMsg]);
              }
              // clear streaming placeholder after successfully appending final
              setStreamingByChat((prev) => ({ ...prev, [activeChatId!]: '' }));
              // clear input / attachments only on successful completion
              setInput('');
              setAttachedFiles([]);
              // now generate title and suggestions using assistant reply text
              try {
                await requestTitleFromAssistant(finalMsg.content, activeChatId!);
                await requestSuggestionsFromAssistant(finalMsg.content);
              } catch (e) {
                console.warn('Post-processing (title/suggestions) failed', e);
              }
              // force final scroll into view
              maybeAutoScroll(true);
              if (activeChatId) collectedRef.current[activeChatId] = '';
            } else {
              // aborted or empty final: keep partial text visible and do not overwrite
              console.log('stream complete ignored (aborted or empty final) — keeping partial.');
            }

            setIsStreaming(false);
            if (controllerRef.current === abortController) controllerRef.current = null;
          },
          abortController.signal
        );
      } else {
        // fallback non-streaming (send payload so backend sees context)
        const reply = await handleUserInput(backend, payload, attachedFiles);
        const botMsg: Message = { ...reply };
        setChats((prev) =>
          prev.map((c) => (c.id === activeChatId ? { ...c, messages: [...c.messages, botMsg] } : c))
        );
        if (currentChatRef.current === activeChatId) {
          setMessages((prev) => [...prev, botMsg]);
        }
        setInput('');
        setAttachedFiles([]);

        // request title and suggestions from assistant reply
        try {
          await requestTitleFromAssistant(botMsg.content, activeChatId!);
          await requestSuggestionsFromAssistant(botMsg.content);
        } catch (e) {
          console.warn('Post-processing (title/suggestions) failed', e);
        }
        maybeAutoScroll(true);
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        console.log('🛑 Streaming aborted gracefully.');
        // keep partial streamed text visible
      } else {
        setError(err?.message || 'An error occurred while sending your message.');
        console.error('sendMessage error', err);
      }
    } finally {
      setSending(false);
      setIsStreaming(false);
      // only clear controllerRef if it's ours
      if (controllerRef.current && controllerRef.current.signal === abortController.signal) {
        controllerRef.current = null;
      }
      inputRef.current?.focus();
    }
  };

  useEffect(() => {
    if (input === '' && inputRef.current) {
      inputRef.current.focus();
    }
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const scrollHeight = el.scrollHeight;
    const MAX_HEIGHT = 160;
    if (scrollHeight > MAX_HEIGHT) {
      el.style.height = `${MAX_HEIGHT}px`;
      el.style.overflowY = 'auto';
      el.scrollTop = el.scrollHeight;
    } else {
      el.style.height = `${scrollHeight}px`;
      el.style.overflowY = 'hidden';
    }
  }, [input]);

  return (
    <div className="flex h-screen">
      <Sidebar
        chats={chats.map((c) => ({ id: c.id, title: c.title }))}
        onNewChat={() => {
          const id = Date.now().toString();
          setChats([...chats, { id, title: 'New chat', messages: [] }]);
          setCurrentChat(id);
          setMessages([]);
          setStreamingByChat((prev) => ({ ...prev, [id]: '' }));
          setSuggestions([]);
        }}
        onSelectChat={(id) => {
          setCurrentChat(id);
          const found = chats.find((c) => c.id === id);
          setMessages(found ? found.messages : []);
          setSuggestions([]);
        }}
        onDeleteChat={(id) => {
          setChats((prev) => prev.filter((c) => c.id !== id));
          if (currentChat === id) {
            setCurrentChat(null);
            setMessages([]);
            setSuggestions([]);
          }
        }}
        footer={
          <div className="flex items-center justify-center py-3">
            {user ? (
              <div className="flex items-center gap-2 hover:bg-gray-800 px-3 py-1 rounded cursor-pointer">
                <img src={user.picture} alt="avatar" className="w-6 h-6 rounded-full" />
                <span className="text-sm">{user.name}</span>
                <button onClick={() => logout()} className="ml-2 text-xs underline">Sign out</button>
              </div>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-white text-gray-800 font-medium py-2 px-4 rounded-lg shadow hover:bg-gray-100 transition flex items-center justify-center gap-2"
              >
                <img
                  src="https://developers.google.com/identity/images/g-logo.png"
                  alt="google"
                  className="w-4 h-4"
                />
                Sign in
              </button>
            )}
          </div>
        }
      />
      <div className="relative flex flex-col flex-1 bg-gray-100">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-600 px-4">
              <h1 className="text-4xl font-bold mb-4 text-gray-800">
                Welcome to <span className="text-blue-600">My GPT</span>
              </h1>
              <p className="text-lg max-w-xl mb-6">
                Start a new conversation or upload a file to get smart answers,
                summaries, and images generated instantly.
              </p>

              <div className="absolute left-0 right-0 bottom-28 px-4 flex justify-center">
                <div className="flex flex-wrap justify-center gap-3 max-w-3xl w-full">
                  {[
                    'Summarize this PDF',
                    'Generate image of a sunset',
                    'Explain quantum computing simply',
                    'Write an email reply',
                  ].map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => setInput(prompt)}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full shadow text-sm text-gray-800 transition"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {/* 🔹 Show only current chat's streaming */}
          {currentChat && streamingByChat[currentChat] && (
            <div className="bg-gray-200 text-gray-800 p-2 rounded-xl whitespace-pre-wrap">
              {streamingByChat[currentChat]}
              <span className="animate-pulse">|</span>
            </div>
          )}
          {sending && !isStreaming && (
            <div className="bg-gray-200 text-gray-800 p-2 rounded-xl whitespace-pre-wrap animate-pulse">
              Thinking…
            </div>
          )}
          {error && (
            <div className="bg-red-100 text-red-700 p-3 rounded-xl mb-2 border border-red-300">
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Suggestions area (after assistant reply) */}
          {suggestions.length > 0 && (
            <div className="flex gap-2 flex-wrap mt-2">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setInput(s)}
                  className="px-3 py-2 bg-white border rounded-full text-sm hover:bg-gray-50 shadow-sm"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="absolute left-0 right-0 bottom-8 px-4 flex justify-center">
          <div className="max-w-3xl w-full bg-white rounded-xl border shadow px-3 py-1 flex flex-col gap-2">
            {/* Attachments */}
            {attachedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 items-center px-1">
                {attachedFiles.map((file, idx) => (
                  <div key={idx} className="relative flex items-center gap-1 bg-gray-100 rounded-lg px-2 py-1 text-xs">
                    {file.type.startsWith('image/') ? (
                      <img src={URL.createObjectURL(file)} alt={file.name} className="w-10 h-10 rounded object-cover" />
                    ) : (
                      <span className="text-gray-700">📄 {file.name}</span>
                    )}
                    <button
                      onClick={() => setAttachedFiles((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-red-500 hover:text-red-700 ml-1"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-end gap-2">
              <div className="relative">
                <button
                  type="button"
                  title="Attach file or image"
                  onClick={() => setShowAttachMenu((p) => !p)}
                  className="w-10 h-10 flex items-center justify-center rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                >
                  <span className="text-2xl font-bold">+</span>
                </button>
                {showAttachMenu && (
                  <div className="absolute bottom-full mb-2 left-0 bg-white border rounded-xl shadow p-2 w-40 space-y-1">
                    <button
                      className="w-full text-left hover:bg-gray-100 px-2 py-1 rounded"
                      onClick={() => {
                        document.getElementById('fileInput')?.click();
                        setShowAttachMenu(false);
                      }}
                    >
                      📄 Upload File
                    </button>
                    <button
                      className="w-full text-left hover:bg-gray-100 px-2 py-1 rounded"
                      onClick={() => {
                        document.getElementById('imageInput')?.click();
                        setShowAttachMenu(false);
                      }}
                    >
                      🖼️ Upload Image
                    </button>
                  </div>
                )}
              </div>

              <textarea
                ref={inputRef}
                rows={1}
                className={`flex-1 px-2 py-1 focus:outline-none resize-none bg-transparent ${
                  inputRef.current && inputRef.current.scrollHeight > 160
                    ? 'overflow-y-auto'
                    : 'overflow-hidden'
                }`}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())
                }
                placeholder="Ask anything..."
                disabled={sending}
              />

              <button
                title="Record voice"
                onClick={toggleRecording}
                className={`w-10 h-10 flex items-center justify-center rounded-full ${
                  recording
                    ? 'text-red-500 animate-pulse hover:bg-red-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Mic className="w-6 h-6" />
              </button>

              {/* If streaming in progress show Stop button, otherwise Send */}
              {isStreaming || sending ? (
                <button
                  title="Stop"
                  onClick={stopStreaming}
                  className="w-10 h-10 flex items-center justify-center rounded-full text-red-500 hover:bg-red-50"
                >
                  ✕
                </button>
              ) : (
                <button
                  title="Send message"
                  onClick={sendMessage}
                  disabled={sending}
                  className="w-10 h-10 flex items-center justify-center rounded-full text-blue-500 hover:text-blue-600 hover:bg-blue-50 disabled:text-gray-400"
                >
                  <ArrowUpCircle className="w-6 h-6" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <input
        id="fileInput"
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          const fileList = e.target.files;
          if (fileList && fileList.length > 0) {
            setAttachedFiles((prev) => [...prev, ...Array.from(fileList)]);
          }
        }}
      />
      <input
        id="imageInput"
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const fileList = e.target.files;
          if (fileList && fileList.length > 0) {
            setAttachedFiles((prev) => [...prev, ...Array.from(fileList)]);
          }
        }}
      />
    </div>
  );
}
