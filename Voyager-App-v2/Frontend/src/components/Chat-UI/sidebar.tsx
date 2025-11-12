import React from 'react';

interface SidebarProps {
  chats: { id: string; title: string }[];
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  footer?: React.ReactNode; // ✅ keep this
}

export default function Sidebar({
  chats,
  onNewChat,
  onSelectChat,
  onDeleteChat,   // ✅ add this param
  footer,
}: SidebarProps) {
  return (
    <div className="w-64 bg-gray-900 text-white flex flex-col h-full">
      <div className="p-4 border-b border-gray-400 flex justify-between items-center">
        <h1 className="font-bold text-lg">My GPT</h1>
        <button
          onClick={onNewChat}
          className="bg-blue-700 px-2 py-1 rounded hover:bg-blue-600 text-sm"
        >
          New chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {chats.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between px-4 py-2 hover:bg-gray-800 group"
          >
            <button
              className="text-left flex-1"
              onClick={() => onSelectChat(c.id)}
            >
              {c.title}
            </button>
            <button
              onClick={() => onDeleteChat(c.id)}
              className="text-red-400 opacity-0 group-hover:opacity-100 hover:text-red-600 text-xs ml-2"
              title="Delete chat"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {footer && <div className="p-4 border-t border-gray-400">{footer}</div>}
    </div>
  );
}
