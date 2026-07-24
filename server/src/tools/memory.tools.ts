import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

export const createSaveMemoryTool = (userId: string) => tool(
  async ({ key, value }) => {
    try {
      await prisma.userMemory.upsert({
        where: { userId_key: { userId, key } },
        update: { value },
        create: { userId, key, value },
      });
      return `Successfully remembered: "${key}" → "${value}".`;
    } catch (err: any) {
      console.error("[Tool] Memory save failed:", err);
      return `Failed to save memory: ${err.message}`;
    }
  },
  {
    name: "save_memory",
    description: "Save or update a specific user preference, fact, or personal detail about the user to their permanent memory. Use this when the user explicitly tells you something about themselves they want you to remember.",
    schema: z.object({
      key: z.string().describe("A short, descriptive camelCase key for the memory (e.g., 'userName', 'favoriteLanguage', 'occupation')."),
      value: z.string().describe("The actual value or fact to remember (e.g., 'Alice', 'Python', 'Software Engineer').")
    }),
  }
);

export const createQueryMemoryTool = (userId: string) => tool(
  async () => {
    try {
      const memories = await prisma.userMemory.findMany({ where: { userId } });
      if (memories.length === 0) {
        return "No memories found for this user.";
      }
      return memories.map(m => `- ${m.key}: ${m.value}`).join('\n');
    } catch (err: any) {
      return `Failed to fetch memories: ${err.message}`;
    }
  },
  {
    name: "query_memory",
    description: "Retrieve all stored preferences and facts about the user. Call this tool when you need to personalize your response, remember their name, or recall past facts they asked you to save.",
    schema: z.object({}),
  }
);

export const createDeleteMemoryTool = (userId: string) => tool(
  async ({ key }) => {
    try {
      await prisma.userMemory.delete({ where: { userId_key: { userId, key } } });
      return `Successfully deleted memory key: "${key}".`;
    } catch (err: any) {
      return `Failed to delete memory (it might not exist): ${err.message}`;
    }
  },
  {
    name: "delete_memory",
    description: "Delete a stored preference or fact about the user.",
    schema: z.object({
      key: z.string().describe("The exact key of the memory to delete.")
    }),
  }
);
