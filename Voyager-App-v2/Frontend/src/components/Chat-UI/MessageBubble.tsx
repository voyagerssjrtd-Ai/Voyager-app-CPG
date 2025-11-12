import React from 'react';
import { Message } from '../../types/chat';
import MarkdownMessage from "../MarkdownMessage";

export function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-xl p-3 rounded-2xl shadow 
        ${isUser ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-900'}`}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap">{message.content}</div>
        ) : (
          <MarkdownMessage content={message.content} />
        )}

        <div className="text-xs opacity-70 mt-1">
          {new Date(message.createdAt).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}
