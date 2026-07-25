import { tool } from "@langchain/core/tools";
import { z } from "zod";

export const timeTool = tool(
  async () => {
    const date = new Date();
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return `The current system time is: ${date.toLocaleString('en-GB', options)}`;
  },
  {
    name: "get_current_time",
    description: "Returns the current date and time.",
    schema: z.object({
      query: z.string().optional().describe("Optional query, not required to get the current time.")
    }),
  }
);
