"use client";

import { SparklesIcon } from "lucide-react";

interface EmptyStateProps {
  onSuggestion: (text: string) => void;
}

const SUGGESTIONS = [
  "What brands do you carry?",
  "Show me products under $50",
  "What's on sale right now?",
  "Pick something for me",
];

export function EmptyState({ onSuggestion }: EmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 overflow-y-auto px-4 py-6 text-center">
      <div
        className="flex h-12 w-12 items-center justify-center rounded-full"
        style={{ backgroundColor: "#0B0F19", color: "#B8FF3C" }}
      >
        <SparklesIcon className="h-6 w-6" />
      </div>
      <div>
        <h2 className="text-base font-semibold text-foreground">
          Welcome to Aisle
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Ask about products, brands, prices, or what's in stock — I'll search
          the catalog and pull up matching items.
        </p>
      </div>
      <div className="flex w-full flex-col gap-2">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Try asking
        </p>
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => onSuggestion(suggestion)}
            className="rounded-md border border-border bg-card px-3 py-2 text-left text-sm text-foreground transition-colors hover:border-foreground/30 hover:bg-muted/40"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
