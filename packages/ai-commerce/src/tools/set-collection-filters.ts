import { productFiltersSchema } from "../types";

export const setCollectionFiltersTool = {
  description: [
    "Update the collection page filters. Only use AFTER you've used the GROQ tool to:",
    "1) get valid filter values (vendors, types, tags, sort keys),",
    "2) confirm matching products exist.",
    "Use the exact values from your query. Do not call this tool blindly — you should already know what results the user will see.",
    "If the user is not currently on a collection page, this tool will navigate them to the collection.",
  ].join(" "),
  inputSchema: productFiltersSchema,
} as const;
