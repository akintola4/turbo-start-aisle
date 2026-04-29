"use client";

import type { UIMessage } from "ai";
import { useEffect, useRef } from "react";

import { TextPart } from "./text-part";

interface MessageListProps {
  messages: UIMessage[];
  isStreaming: boolean;
}

export function MessageList({ messages, isStreaming }: MessageListProps) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isStreaming]);

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
      {messages.map((m) => {
        const isUser = m.role === "user";
        return (
          <div
            key={m.id}
            className={`flex ${isUser ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-md px-3 py-2 text-sm ${
                isUser
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              {m.parts.map((part, idx) => {
                if (part.type === "text") {
                  return (
                    <TextPart
                      key={`${m.id}-${idx}`}
                      text={part.text}
                      isUser={isUser}
                    />
                  );
                }
                return null;
              })}
            </div>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}
