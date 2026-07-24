import { tool } from "@langchain/core/tools";
import { z } from "zod";

// ── Wikipedia REST API (free, no key — best for encyclopedic/biographical/scientific) ──
async function wikipediaSearch(query: string): Promise<string | null> {
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=3&origin=*`;
    const searchRes = await fetch(searchUrl, {
      headers: { 'User-Agent': 'Aura-AI-Agent/1.0 (educational project)' }
    });
    const searchData = await searchRes.json() as any;
    const hits = searchData?.query?.search;
    if (!hits || hits.length === 0) return null;

    const title = hits[0].title;
    const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    const summaryRes = await fetch(summaryUrl, {
      headers: { 'User-Agent': 'Aura-AI-Agent/1.0' }
    });
    const summary = await summaryRes.json() as any;

    if (summary.extract && summary.extract.length > 30) {
      let result = `**${summary.title}** (Wikipedia)\n\n${summary.extract}`;
      if (summary.content_urls?.desktop?.page) {
        result += `\n\nSource: ${summary.content_urls.desktop.page}`;
      }
      const others = hits
        .slice(1, 3)
        .map((h: any) => `• ${h.title}: ${h.snippet?.replace(/<[^>]+>/g, '')}...`)
        .join('\n');
      if (others) result += `\n\nRelated results:\n${others}`;
      return result;
    }
    return null;
  } catch (e: any) {
    console.warn('[Search] Wikipedia failed:', e.message);
    return null;
  }
}

// ── Tavily Search API (purpose-built for AI agents — reliable JSON, free tier 1k/month) ──
// Get a free API key at: https://app.tavily.com — no credit card required.
async function tavilySearch(query: string): Promise<string | null> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    console.warn('[Search] TAVILY_API_KEY is not set in .env — Tavily search unavailable.');
    console.warn('[Search] Get a free key at https://app.tavily.com and add it to server/.env');
    return null;
  }

  try {
    console.log(`[Search] Querying Tavily API for: "${query}"`);
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: 'basic',  // 'advanced' uses more credits; 'basic' is fast and sufficient
        max_results: 5,
        include_answer: true,   // Tavily synthesises a direct answer if possible
        include_raw_content: false,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      console.error(`[Search] Tavily API returned HTTP ${res.status}: ${errText}`);
      return null;
    }

    const data = await res.json() as any;
    const resultCount = data.results?.length ?? 0;
    console.log(`[Search] Tavily returned ${resultCount} result(s) for: "${query}"`);

    if (resultCount === 0 && !data.answer) {
      console.warn(`[Search] Tavily returned no results for: "${query}"`);
      return null;
    }

    const parts: string[] = [];

    if (data.answer) {
      parts.push(`**Direct Answer**: ${data.answer}`);
    }

    if (data.results && data.results.length > 0) {
      const formatted = data.results
        .slice(0, 5)
        .map((r: any, i: number) => {
          const snippet = r.content ? r.content.slice(0, 300).trim() : '(no snippet)';
          return `${i + 1}. **${r.title}**\n   ${snippet}\n   Source: ${r.url}`;
        })
        .join('\n\n');
      parts.push(`**Web Results**:\n${formatted}`);
    }

    return parts.length > 0 ? parts.join('\n\n') : null;
  } catch (e: any) {
    console.error('[Search] Tavily search threw an error:', e.message);
    return null;
  }
}

// ── Main search tool ────────────────────────────────────────────────────────
export const internetSearchTool = tool(
  async ({ query }) => {
    console.log(`[Tool] internet_search called — query: "${query}"`);

    // 1. Wikipedia — best for encyclopedic, biographical, historical, scientific queries
    const wikiResult = await wikipediaSearch(query);
    if (wikiResult) {
      console.log('[Search] Wikipedia succeeded — returning result');
      return `Search results for "${query}":\n\n${wikiResult}`;
    }
    console.log('[Search] Wikipedia returned no usable result — falling back to Tavily');

    // 2. Tavily — reliable, AI-optimised, returns clean JSON for all other queries
    const tavilyResult = await tavilySearch(query);
    if (tavilyResult) {
      console.log('[Search] Tavily succeeded — returning result');
      return `Search results for "${query}":\n\n${tavilyResult}`;
    }

    console.warn(`[Search] All search methods failed for query: "${query}"`);
    return `No search results found for "${query}". Wikipedia and Tavily both returned no results. Please try a more specific or differently phrased query.`;
  },
  {
    name: "internet_search",
    description: "ALWAYS use this tool to search the internet for: current events, recent news, people (celebrities, politicians, sportsmen), places, facts, definitions, prices, or ANYTHING that requires up-to-date or factual information. Do NOT answer from your own knowledge — always search first.",
    schema: z.object({
      query: z.string().describe("Search query in English. Be specific. Examples: 'Babar Azam cricket career', 'Prime Minister of Pakistan 2024', 'current Bitcoin price'.")
    }),
  }
);
