"use client";

import { MessageCircleIcon, XIcon } from "lucide-react";
import { useState } from "react";

import { ChatPanel } from "./chat-panel";

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {isOpen ? (
        <div
          data-agent-chat-hidden
          className="fixed bottom-22 right-4 z-50 h-[500px] w-[380px]"
        >
          <ChatPanel onClose={() => setIsOpen(false)} />
        </div>
      ) : null}

      <button
        type="button"
        data-agent-chat-hidden
        onClick={() => setIsOpen((v) => !v)}
        aria-label={isOpen ? "Close chat" : "Open chat"}
        className="fixed bottom-4 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all duration-300 ease-out hover:scale-105 hover:shadow-xl active:scale-95"
      >
        <div className="relative h-6 w-6">
          <MessageCircleIcon
            className={`absolute inset-0 h-6 w-6 transition-all duration-300 ${
              isOpen
                ? "rotate-90 scale-0 opacity-0"
                : "rotate-0 scale-100 opacity-100"
            }`}
          />
          <XIcon
            className={`absolute inset-0 h-6 w-6 transition-all duration-300 ${
              isOpen
                ? "rotate-0 scale-100 opacity-100"
                : "-rotate-90 scale-0 opacity-0"
            }`}
          />
        </div>
      </button>
    </>
  );
}
