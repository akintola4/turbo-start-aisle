"use client";

import { Textarea } from "@workspace/ui/components/textarea";
import { SendIcon } from "lucide-react";
import { type KeyboardEvent, useState } from "react";

interface MessageInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [value, setValue] = useState("");

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends; Shift+Enter (or any modifier) inserts a newline.
    if (e.key === "Enter" && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <form
      className="flex items-end gap-2 border-t border-border p-2"
      onSubmit={(e) => {
        e.preventDefault();
        handleSend();
      }}
    >
      <Textarea
        rows={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask about products…"
        disabled={disabled}
        className="max-h-40 min-h-9 resize-none text-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="rounded-md bg-primary p-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        <SendIcon className="h-4 w-4" />
      </button>
    </form>
  );
}
