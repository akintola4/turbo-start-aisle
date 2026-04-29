// Types
export type {
  ClientToolName,
  NavigateDirective,
  PageContext,
  PageSurface,
  ProductFiltersInput,
  UserContext,
} from "./types";
export { CLIENT_TOOLS, productFiltersSchema } from "./types";

// Page-context hooks
export { usePageContext, useSetPageContext } from "./context/page-context";

// System prompt + MCP wrapper
export { buildSystemPrompt } from "./system-prompt";
export {
  createSanityAgentContextClient,
  type SanityAgentContextConfig,
} from "./mcp/sanity-agent-context";

// Tool registry
export { clientTools } from "./tools";

// UI
export { ChatWidget } from "./ui/chat-widget";
export { Product } from "./ui/product";
