import { tool } from "@langchain/core/tools";
import { getBrowser, retry } from "./index";
import { functionModel, summaryModel } from "../config/ollama";
import { MemorySaver } from "@langchain/langgraph";
import { HumanMessage } from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import axios from "axios";
import { z } from "zod";
import * as cheerio from "cheerio";
import botDetectionResolver from "../browser/bot";
import { getStealthPage, navigateWithStealth } from "../browser";

//shared page
let sharedPage;
export async function getPage() {
  if (!sharedPage) {
    const browser = await getBrowser();
    sharedPage = await browser.newPage();
    //request headers
    sharedPage.setExtraHTTPHeaders({
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      "Accept-Encoding": "gzip, deflate",
      DNT: "1",
      Connection: "keep-alive",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Cache-Control": "max-age=0",
    });
  }
  return sharedPage;
}

//get website content in form of markdown
const getWebsiteContent = tool(
  async ({ url }: { url: string }): Promise<string> => {
    try {
      const BASE_URL = "https://r.jina.ai/";
      const { data: markdown } = await axios.get(`${BASE_URL}${url}`, {
        headers: {
          Authorization: `Bearer ${process.env.R_JINA_AI_API_KEY}`,
        },
      });

      const cleaned = markdown
        .replace(/!\[.*?\]\(.*?\)/g, "") //remove image markdown
        .replace(/^#{1,6}\s*/gm, (match) => match.trim() + " ") //normalize heading spacing
        .replace(/\n{3,}/g, "\n\n") //remove extra blank lines
        .replace(/[ \t]{2,}/g, " ") //collapse multiple spaces/tabs
        .trim();

      return cleaned;
    } catch (error) {
      console.error("Scraper error:", error);
      throw error;
    }
  },
  {
    name: "getWebsiteContent",
    description: "Get website content in markdown (cleaned, with links intact)",
    schema: z.object({
      url: z.string(),
    }),
  }
);

//bot detection, captcha bypass, proxy rotation

const botHandler = tool(
  async () => {
    let page;
    try {
      page = await getPage();
      const result = await botDetectionResolver(page);
      return result;
    } catch (error) {
      console.error("Bot handler error:", error);

      throw new Error(
        `Bot detection handling failed: ${(error as Error).message}`
      );
    }
  },
  {
    name: "botHandler",
    description:
      "Advanced bot detection bypass with reCAPTCHA support, multiple strategies and robust error handling",
  }
);

//duckduckgo search tool
const duckDuckGoSearch = tool(
  async ({
    query,
    limit = 10,
    returnFormat = "structured",
  }: {
    query: string;
    limit?: number;
    returnFormat?: "structured" | "text" | "raw";
  }) => {
    let page;
    try {
      console.log(`Searching DuckDuckGo for: "${query}"`);

      page = await getPage();

      // Set a more realistic user agent to avoid blocking
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      );

      // Navigate to DuckDuckGo with better error handling
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(
        query
      )}&kl=us-en`;

      await page.goto(url, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });

      // Wait for results with better error handling
      try {
        await page.waitForSelector(".result, .no-results, .result__body", {
          timeout: 15000,
        });
      } catch (waitError) {
        console.warn("Timeout waiting for results, attempting to continue...");

        // Check if page loaded at all
        const pageContent = await page.content();
        if (pageContent.length < 1000) {
          throw new Error("Page appears to be empty or blocked");
        }
      }

      // Check for no results
      const noResults = await page.$(".no-results");
      if (noResults) {
        console.log("No search results found");
        return {
          results: [],
          totalResults: 0,
          query,
          message: "No results found for this query",
        };
      }

      // Enhanced result extraction with multiple selectors and error handling
      const results = await page.evaluate((maxResults: number) => {
        const resultElements = document.querySelectorAll(
          ".result, .web-result"
        );
        const extractedResults: any[] = [];

        for (let i = 0; i < Math.min(resultElements.length, maxResults); i++) {
          const node = resultElements[i];

          try {
            // Multiple selectors for title
            const titleSelectors = [
              ".result__a",
              ".result__title a",
              "h2 a",
              'a[href*="uddg="]',
              ".result-title a",
            ];

            let titleEl: Element | null = null;
            let title = "";

            for (const selector of titleSelectors) {
              titleEl = node.querySelector(selector);
              if (titleEl) {
                title = titleEl.textContent?.trim() ?? "";
                if (title) break;
              }
            }

            // Multiple selectors for snippet
            const snippetSelectors = [
              ".result__snippet",
              ".result-snippet",
              ".snippet",
              ".result__body",
              ".web-result__snippet",
            ];

            let snippet = "";
            for (const selector of snippetSelectors) {
              const snippetEl = node.querySelector(selector);
              if (snippetEl) {
                snippet = snippetEl.textContent?.trim() || "";
                if (snippet) break;
              }
            }

            // Extract and clean URL
            let href = titleEl?.getAttribute("href") || "";
            let cleanLink = "";

            if (href) {
              // Handle DuckDuckGo redirect URLs
              if (href.includes("uddg=")) {
                try {
                  const urlParams = new URLSearchParams(href.split("?")[1]);
                  cleanLink = decodeURIComponent(urlParams.get("uddg") || "");
                } catch (e) {
                  // Fallback: try to extract from the href directly
                  const match = href.match(/uddg=([^&]+)/);
                  if (match) {
                    cleanLink = decodeURIComponent(match[1]);
                  }
                }
              } else if (href.startsWith("http")) {
                cleanLink = href;
              } else if (href.startsWith("/l/?")) {
                // Handle old-style DuckDuckGo redirects
                const match = href.match(/uddg=([^&]+)/);
                if (match) {
                  cleanLink = decodeURIComponent(match[1]);
                }
              }
            }

            // Extract display URL
            const displayUrlSelectors = [
              ".result__url",
              ".result-url",
              "cite",
              ".web-result__url",
            ];

            let displayUrl = "";
            for (const selector of displayUrlSelectors) {
              const urlEl = node.querySelector(selector);
              if (urlEl) {
                displayUrl = urlEl.textContent?.trim() || "";
                if (displayUrl) break;
              }
            }

            // Only include results with at least title and link
            if (title && cleanLink && cleanLink.startsWith("http")) {
              extractedResults.push({
                title,
                link: cleanLink,
                snippet: snippet || "No snippet available",
                displayUrl: displayUrl || new URL(cleanLink).hostname,
                position: extractedResults.length + 1,
              });
            }
          } catch (error) {
            console.warn(`Error extracting result ${i}:`, error);
            continue;
          }
        }

        return extractedResults;
      }, limit);

      console.log(`Successfully extracted ${results.length} search results`);

      // Return different formats based on returnFormat parameter
      const response = {
        results,
        totalResults: results.length,
        query,
        searchEngine: "DuckDuckGo",
      };

      switch (returnFormat) {
        case "text":
          // LLM-friendly text format
          const preprocessed = results
            .map((r, i) =>
              [
                `### Result ${i + 1}`,
                `Title: ${r.title}`,
                `URL: ${r.link}`,
                `Display URL: ${r.displayUrl}`,
                `Snippet: ${r.snippet}`,
              ].join("\n")
            )
            .join("\n\n");

          return {
            ...response,
            textFormat: preprocessed,
          };

        case "raw":
          // Raw page content for debugging
          const rawContent = await page.content();
          return {
            ...response,
            rawHtml: rawContent,
          };

        case "structured":
        default:
          return response;
      }
    } catch (error) {
      console.error("DuckDuckGo search error:", error);

      // Take screenshot for debugging if page exists
      if (page) {
        try {
          await page.screenshot({
            path: `duckduckgo_error_${Date.now()}.png`,
            fullPage: true,
          });
        } catch (screenshotError) {
          console.error("Failed to take error screenshot:", screenshotError);
        }
      }

      throw new Error(`DuckDuckGo search failed: ${(error as Error).message}`);
    } finally {
      // Ensure page is closed to prevent memory leaks
      if (page) {
        try {
          await page.close();
        } catch (closeError) {
          console.error("Failed to close page:", closeError);
        }
      }
    }
  },
  {
    name: "duckDuckGoSearch",
    description:
      "Search DuckDuckGo with enhanced error handling, multiple output formats, and robust result extraction",
    schema: z.object({
      query: z.string().describe("Search query to send to DuckDuckGo"),
      limit: z
        .number()
        .optional()
        .default(10)
        .describe("Maximum number of results to return (default: 10)"),
      returnFormat: z
        .enum(["structured", "text", "raw"])
        .optional()
        .default("structured")
        .describe(
          "Output format: structured (JSON), text (LLM-friendly), or raw (with HTML)"
        ),
    }),
  }
);

const extractStructuredData = tool(
  async ({ content }: { content: string }) => {
    try {
      //use llm to get the strucutred and relevant data
      const result = await summaryModel.invoke(
        [
          {
            role: "system",
            content: `You are a helpful assistant that extracts structured data from HTML content with titles, links, snippets, and metadata.`,
          },
          {
            role: "user",
            content: content,
          },
        ],
        {
          response_format: {
            type: "json_object",
          },
        }
      );
      const data =
        typeof result.content === "string"
          ? JSON.parse(result.content)
          : result.content;
      return data;
    } catch (error) {
      console.error("Extract structured data error:", error);
      throw error;
    }
  },
  {
    name: "extractStructuredData",
    description:
      "Extract structured data from HTML content with titles, links, snippets, and metadata",
    schema: z.object({
      content: z
        .string()
        .describe("HTML content to extract structured data from"),
    }),
  }
);
// --- AGENT SETUP ---

const agent = createReactAgent({
  llm: functionModel,
  tools: [getWebsiteContent, botHandler, duckDuckGoSearch],
  checkpointer: new MemorySaver(),
});

export const scrapper = async (messages: string) => {
  try {
    const result = await agent.invoke(
      {
        messages: [new HumanMessage(messages)],
      },
      {
        configurable: { thread_id: "42" },
      }
    );
    return result.messages;
  } catch (error: unknown) {
    console.error("Scraper error:", error);
    throw error;
  }
};
