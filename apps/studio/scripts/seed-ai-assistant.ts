/**
 * Seeds the aiAssistantSettings singleton with sensible defaults.
 * Run with: pnpm --filter studio exec sanity exec scripts/seed-ai-assistant.ts --with-user-token
 *
 * Idempotent — uses createOrReplace so re-running just resets the doc.
 */

import { getCliClient } from "sanity/cli";

const client = getCliClient();

const doc = {
  _id: "aiAssistantSettings",
  _type: "aiAssistantSettings",
  welcomeHeading: "How can I help you find something today?",
  welcomeSubtitle:
    "I know what's in stock, what's on sale, and what each brand makes. Ask me anything — or pick one of the suggestions below.",
  suggestions: [
    "What brands do you carry?",
    "Show me products under $50",
    "What's on sale right now?",
    "Pick something for me",
    "Find me a gift idea",
  ],
};

client
  .createOrReplace(doc)
  .then(() => {
    console.log(`Seeded aiAssistantSettings (${doc._id})`);
  })
  .catch((err) => {
    console.error("Seed failed:", err.message);
    process.exitCode = 1;
  });
