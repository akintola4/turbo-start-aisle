"use client";

import type { UIMessage, UIMessagePart, UIDataTypes, UITools } from "ai";
import { useEffect, useRef } from "react";

import { TextPart } from "./text-part";

interface MessageListProps {
  messages: UIMessage[];
  isStreaming: boolean;
}

function TypingIndicator() {
  return (
    <div className="flex animate-in fade-in justify-start duration-300">
      <output
        className="flex max-w-[85%] items-center gap-1 rounded-md bg-muted px-3 py-3 text-sm text-foreground"
        aria-label="Assistant is typing"
      >
        <span
          className="inline-block h-2 w-2 animate-bounce rounded-full bg-foreground/60"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="inline-block h-2 w-2 animate-bounce rounded-full bg-foreground/60"
          style={{ animationDelay: "150ms" }}
        />
        <span
          className="inline-block h-2 w-2 animate-bounce rounded-full bg-foreground/60"
          style={{ animationDelay: "300ms" }}
        />
      </output>
    </div>
  );
}

type Part = UIMessagePart<UIDataTypes, UITools>;

/**
 * Returns the final assistant answer — i.e. text parts that appear AFTER the
 * last tool/reasoning/file part. Anything before that is intermediate
 * "Let me query…" narration emitted between tool steps; we hide it so the
 * user only sees the resolved answer once the tools finish.
 */
function getDisplayableText(message: UIMessage): string {
  let lastNonTextIdx = -1;
  for (let i = message.parts.length - 1; i >= 0; i--) {
    const part = message.parts[i] as Part | undefined;
    if (!part) continue;
    if (part.type === "text" || part.type === "step-start") continue;
    lastNonTextIdx = i;
    break;
  }
  let text = "";
  for (let i = lastNonTextIdx + 1; i < message.parts.length; i++) {
    const part = message.parts[i] as Part | undefined;
    if (part?.type === "text") text += part.text;
  }
  return text;
}

const FALLBACK_TEXT =
  "I couldn't find an answer to that. Try rephrasing or asking about something else.";

export function MessageList({ messages, isStreaming }: MessageListProps) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isStreaming]);

  // Keep the typing indicator visible until the assistant has produced
  // post-tool text. The previous logic hid the dots the instant the
  // assistant message slot existed — even when it only held tool calls or
  // "let me query…" narration — leaving an empty/awkward bubble on screen.
  const lastMessage = messages[messages.length - 1];
  const lastDisplayable =
    lastMessage?.role === "assistant"
      ? getDisplayableText(lastMessage).trim()
      : "";
  const showTyping =
    isStreaming &&
    (lastMessage?.role === "user" ||
      (lastMessage?.role === "assistant" && lastDisplayable.length === 0));

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
      {messages.map((m, idx) => {
        const isUser = m.role === "user";
        const isLast = idx === messages.length - 1;

        if (isUser) {
          return (
            <div
              key={m.id}
              className="flex animate-in fade-in slide-in-from-bottom-1 justify-end duration-300"
            >
              <div className="max-w-[85%] rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground">
                {m.parts.map((part, partIdx) => {
                  if (part.type === "text") {
                    return (
                      <TextPart
                        key={`${m.id}-${partIdx}`}
                        text={part.text}
                        isUser
                      />
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          );
        }

        const displayable = getDisplayableText(m).trim();

        // Suppress the empty bubble while we're still waiting on tools or the
        // first post-tool token — the typing indicator carries the feedback.
        if (displayable.length === 0 && isStreaming && isLast) {
          return null;
        }

        // Stream ended with no final answer text (e.g. the model only emitted
        // tool calls or gave up). Show a friendly fallback instead of a bare
        // bubble.
        if (displayable.length === 0) {
          return (
            <div
              key={m.id}
              className="flex animate-in fade-in slide-in-from-bottom-1 justify-start duration-300"
            >
              <div className="max-w-[85%] rounded-md bg-muted px-3 py-2 text-sm italic text-muted-foreground">
                {FALLBACK_TEXT}
              </div>
            </div>
          );
        }

        return (
          <div
            key={m.id}
            className="flex animate-in fade-in slide-in-from-bottom-1 justify-start duration-300"
          >
            <div className="max-w-[85%] rounded-md bg-muted px-3 py-2 text-sm text-foreground">
              <TextPart text={displayable} />
            </div>
          </div>
        );
      })}
      {showTyping ? <TypingIndicator /> : null}
      <div ref={endRef} />
    </div>
  );
}
