import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

export const createReadFullDocumentTool = (userId: string) => tool(
  async ({ query }) => {
    console.log(`[Tool] read_full_document called — user: ${userId}, query: "${query}"`)
    
    try {
      // Find the document that matches the query (usually the file name)
      const documents = await prisma.document.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      if (documents.length === 0) {
        return "You have not uploaded any documents yet, or they are still processing.";
      }

      // If they didn't specify a filename, or if we want to default to the most recent one
      let targetDoc = documents[0];

      if (query && query.trim() !== "") {
        const queryLower = query.toLowerCase();
        const matchedDoc = documents.find(d => d.fileName.toLowerCase().includes(queryLower));
        if (matchedDoc) {
          targetDoc = matchedDoc;
        }
      }

      console.log(`[Tool] Reading full document: ${targetDoc.fileName}`);
      
      // If the document is massive, we might want to truncate it to fit within context limits
      // Gemini 1.5/2.5 Flash has a 1M-2M token limit, so returning the full text is usually perfectly fine!
      return `--- DOCUMENT START (${targetDoc.fileName}) ---\n${targetDoc.content}\n--- DOCUMENT END ---`;

    } catch (err: any) {
      console.error(`[Tool] read_full_document error:`, err);
      return `Failed to read the document from the database: ${err.message}`;
    }
  },
  {
    name: "read_full_document",
    description: "Use this tool to read the FULL raw text of an uploaded document. Best for summarizing a document, extracting specific details like contact info, or getting a holistic understanding. Provide the filename as the query, or leave empty to read the most recently uploaded document.",
    schema: z.object({
      query: z.string().optional().describe("The name of the file you want to read, or empty to get the most recent one."),
    }),
  }
);
