import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

interface MarkdownMessageProps {
  content: string;
}

// Automatically splits first line (# Title) from the rest
export default function MarkdownMessage({ content }: MarkdownMessageProps) {
  const lines = content.split("\n");
  let title = "";
  let body = content;

  // Check if first line is a title starting with #
  if (lines[0]?.startsWith("#")) {
    title = lines[0].replace(/^#\s*/, ""); // remove leading #
    body = lines.slice(1).join("\n"); // rest of content
  }

  return (
    <div className="prose prose-sm max-w-none text-gray-800">
      {title && (
        <h1 className="text-xl font-bold mb-2 text-gray-900">{title}</h1>
      )}
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code: (props: any) => {
            const { inline, className, children, ...rest } = props;
            const match = /language-(\w+)/.exec(className || "");
            return !inline && match ? (
              <SyntaxHighlighter
                style={oneDark}
                language={match[1]}
                PreTag="div"
                className="rounded-lg p-2 text-sm"
                {...rest}
              >
                {String(children).replace(/\n$/, "")}
              </SyntaxHighlighter>
            ) : (
              <code className="bg-gray-200 px-1 py-0.5 rounded text-sm" {...rest}>
                {children}
              </code>
            );
          },
        }}
      >
        {body}
      </ReactMarkdown>
    </div>
  );
}
