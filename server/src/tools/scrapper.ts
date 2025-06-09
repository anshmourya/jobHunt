import { tool } from "@langchain/core/tools";
import { getBrowser } from "./index";
import { retry } from "./index";
import { functionModel } from "../config/ollama";
import { MemorySaver } from "@langchain/langgraph";
import { HumanMessage } from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { z } from "zod";
import * as puppeteer from "puppeteer";

// keep a single shared page instance
let page: puppeteer.Page | null = null;

async function getSharedPage() {
  const browser = await getBrowser();
  if (!page) {
    page = await browser.newPage();
    if (!page) throw new Error("Failed to create page");
    // Set user agent to avoid bot detection
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    );
  }
  return page;
}

// Helper function for delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// --- TOOLS ---

const go = tool(
  async ({ link }: { link: string }): Promise<string> => {
    const page = await getSharedPage();
    if (!page) throw new Error("No page found");

    try {
      await page.goto(link, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });

      await delay(2000);

      const title = await page.title();
      const url = page.url();

      return `Successfully navigated to: ${title} (${url})`;
    } catch (error) {
      throw new Error(`Failed to navigate to ${link}: ${error}`);
    }
  },
  {
    name: "go",
    description: "Navigate to a specified URL",
    schema: z.object({ link: z.string() }),
  }
);

// New tool for Google search
const googleSearch = tool(
  async ({ query }: { query: string }): Promise<string> => {
    const page = await getSharedPage();
    if (!page) throw new Error("No page found");

    try {
      // Navigate to Google
      await page.goto(
        `https://www.google.com/search?q=${encodeURIComponent(query)}`,
        {
          waitUntil: "networkidle2",
          timeout: 30000,
        }
      );

      await delay(2000);

      // Extract search results
      const results = await page.evaluate(() => {
        const searchResults: { title: string; url: string; snippet: string }[] =
          [];

        // Try different selectors for search results
        const resultSelectors = [
          "div[data-ved] h3",
          ".g h3",
          "[data-header-feature] h3",
          ".yuRUbf h3",
        ];

        for (const selector of resultSelectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            elements.forEach((element, index) => {
              if (index < 5) {
                // Limit to first 5 results
                const linkElement =
                  element.closest("a") || element.querySelector("a");
                const url = linkElement?.href || "";
                const title = element.textContent?.trim() || "";

                // Try to find snippet text
                const parent = element.closest(
                  ".g, [data-ved], .yuRUbf"
                )?.parentElement;
                const snippetElement = parent?.querySelector(
                  "[data-sncf], .s, .st"
                );
                const snippet = snippetElement?.textContent?.trim() || "";

                if (url && title) {
                  searchResults.push({ title, url, snippet });
                }
              }
            });
            break; // If we found results with this selector, stop trying others
          }
        }

        return searchResults;
      });

      if (results.length === 0) {
        return `No search results found for: ${query}`;
      }

      return JSON.stringify(
        {
          query,
          results: results.slice(0, 5), // Limit to top 5 results
        },
        null,
        2
      );
    } catch (error) {
      throw new Error(`Failed to search Google for ${query}: ${error}`);
    }
  },
  {
    name: "googleSearch",
    description: "Search Google and return top results with URLs",
    schema: z.object({ query: z.string() }),
  }
);

// Enhanced go tool with fallback search
const smartGo = tool(
  async ({
    link,
    fallbackSearch,
  }: {
    link: string;
    fallbackSearch?: string;
  }): Promise<string> => {
    const page = await getSharedPage();
    if (!page) throw new Error("No page found");

    try {
      // First try the original URL
      await page.goto(link, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });

      await delay(2000);

      const title = await page.title();
      const url = page.url();

      // Check if we got a valid page (not an error page)
      const isErrorPage = await page.evaluate(() => {
        const bodyText = document.body.textContent?.toLowerCase() || "";
        return (
          bodyText.includes("not found") ||
          bodyText.includes("error") ||
          bodyText.includes("404") ||
          bodyText.includes("can't reach") ||
          bodyText.includes("server not found")
        );
      });

      if (isErrorPage && fallbackSearch) {
        console.log(`Error page detected for ${link}, trying Google search...`);

        // Try Google search for the correct URL
        const searchQuery =
          fallbackSearch || link.replace(/https?:\/\//, "").replace(/\/$/, "");
        await page.goto(
          `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`,
          {
            waitUntil: "networkidle2",
            timeout: 30000,
          }
        );

        await delay(2000);

        // Get the first valid result
        const firstResult = await page.evaluate(() => {
          const linkElements = document.querySelectorAll(".yuRUbf a, .g a h3");
          for (const element of linkElements) {
            const href = element.getAttribute("href");
            if (
              href &&
              href.startsWith("http") &&
              !href.includes("google.com")
            ) {
              return href;
            }
          }
          return null;
        });

        if (firstResult) {
          // Navigate to the found URL
          await page.goto(firstResult, {
            waitUntil: "networkidle2",
            timeout: 30000,
          });

          await delay(2000);

          const newTitle = await page.title();
          const newUrl = page.url();

          return `Original URL failed, found alternative: ${newTitle} (${newUrl})`;
        }
      }

      return `Successfully navigated to: ${title} (${url})`;
    } catch (error) {
      if (fallbackSearch) {
        // If direct navigation fails, try Google search
        try {
          const searchQuery =
            fallbackSearch ||
            link.replace(/https?:\/\//, "").replace(/\/$/, "");
          await page.goto(
            `https://www.google.com/search?q=${encodeURIComponent(
              searchQuery + " site:"
            )}`
          );

          await delay(2000);

          const firstResult = await page.evaluate(() => {
            const linkElements =
              document.querySelectorAll(".yuRUbf a, .g a h3");
            for (const element of linkElements) {
              const href = element.getAttribute("href");
              if (
                href &&
                href.startsWith("http") &&
                !href.includes("google.com")
              ) {
                return href;
              }
            }
            return null;
          });

          if (firstResult) {
            await page.goto(firstResult, {
              waitUntil: "networkidle2",
              timeout: 30000,
            });

            const title = await page.title();
            const url = page.url();
            return `Original URL failed, found via search: ${title} (${url})`;
          }
        } catch (searchError) {
          throw new Error(
            `Both direct navigation and search failed for ${link}: ${error}`
          );
        }
      }
      throw new Error(`Failed to navigate to ${link}: ${error}`);
    }
  },
  {
    name: "smartGo",
    description:
      "Navigate to a URL with fallback Google search if the URL fails",
    schema: z.object({
      link: z.string(),
      fallbackSearch: z
        .string()
        .optional()
        .describe("Search query to use if direct navigation fails"),
    }),
  }
);

const click = tool(
  async ({ selector }: { selector: string }): Promise<string> => {
    const page = await getSharedPage();
    if (!page) throw new Error("No page found");

    try {
      await page.waitForSelector(selector, { timeout: 10000 });
      await page.click(selector);
      await delay(1000);
      return `Successfully clicked: ${selector}`;
    } catch (error) {
      throw new Error(`Failed to click ${selector}: ${error}`);
    }
  },
  {
    name: "click",
    description: "Click an element by CSS/XPath selector",
    schema: z.object({ selector: z.string() }),
  }
);

const scroll = tool(
  async ({
    direction,
    px,
  }: {
    direction: "up" | "down";
    px: number;
  }): Promise<string> => {
    const page = await getSharedPage();
    if (!page) throw new Error("No page found");

    await page.evaluate(
      ({ direction, px }) =>
        window.scrollBy(0, direction === "down" ? px : -px),
      { direction, px }
    );

    await delay(500);
    return `Scrolled ${direction} by ${px}px`;
  },
  {
    name: "scroll",
    description: "Scroll up/down by pixels",
    schema: z.object({
      direction: z.enum(["up", "down"]),
      px: z.number(),
    }),
  }
);

const input = tool(
  async ({
    selector,
    value,
  }: {
    selector: string;
    value: string;
  }): Promise<string> => {
    const page = await getSharedPage();
    if (!page) throw new Error("No page found");

    try {
      await page.waitForSelector(selector, { timeout: 10000 });
      await page.click(selector);
      await page.keyboard.down("Control");
      await page.keyboard.press("a");
      await page.keyboard.up("Control");
      await page.type(selector, value);
      return `Successfully typed "${value}" into ${selector}`;
    } catch (error) {
      throw new Error(`Failed to input text into ${selector}: ${error}`);
    }
  },
  {
    name: "input",
    description: "Type a value into an input field",
    schema: z.object({
      selector: z.string(),
      value: z.string(),
    }),
  }
);

const getStructuredData = tool(
  async (): Promise<string> => {
    const page = await getSharedPage();
    if (!page) throw new Error("No page found");

    try {
      const structuredData = await page.evaluate(() => {
        const data: any = {
          title: document.title,
          url: window.location.href,
          timestamp: new Date().toISOString(),
          meta: {},
          headings: [],
          links: [],
          images: [],
          text_content: "",
        };

        // Get meta tags
        const metaTags = document.querySelectorAll("meta");
        metaTags.forEach((meta) => {
          const name =
            meta.getAttribute("name") || meta.getAttribute("property");
          const content = meta.getAttribute("content");
          if (name && content) {
            data.meta[name] = content;
          }
        });

        // Get headings
        const headings = document.querySelectorAll("h1, h2, h3, h4, h5, h6");
        headings.forEach((heading) => {
          data.headings.push({
            level: heading.tagName.toLowerCase(),
            text: heading.textContent?.trim() || "",
          });
        });

        // Get links (limited to first 20)
        const links = document.querySelectorAll("a[href]");
        Array.from(links)
          .slice(0, 20)
          .forEach((link) => {
            const href = link.getAttribute("href");
            const text = link.textContent?.trim();
            if (href && text) {
              data.links.push({ href, text });
            }
          });

        // Get images (limited to first 10)
        const images = document.querySelectorAll("img[src]");
        Array.from(images)
          .slice(0, 10)
          .forEach((img) => {
            const src = img.getAttribute("src");
            const alt = img.getAttribute("alt");
            if (src) {
              data.images.push({ src, alt: alt || "" });
            }
          });

        // Get main text content
        const body = document.body;
        if (body) {
          const scripts = body.querySelectorAll("script, style, noscript");
          scripts.forEach((el) => el.remove());
          data.text_content = body.innerText || body.textContent || "";
        }

        return data;
      });

      return JSON.stringify(structuredData, null, 2);
    } catch (error) {
      throw new Error(`Failed to get structured data: ${error}`);
    }
  },
  {
    name: "getStructuredData",
    description: "Extract structured data from the page in JSON format",
    schema: z.object({}),
  }
);

const getPageInfo = tool(
  async (): Promise<string> => {
    const page = await getSharedPage();
    if (!page) throw new Error("No page found");

    const info = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        readyState: document.readyState,
        bodyExists: !!document.body,
        bodyChildCount: document.body ? document.body.children.length : 0,
        textLength: document.body
          ? (document.body.textContent || "").length
          : 0,
      };
    });

    return JSON.stringify(info, null, 2);
  },
  {
    name: "getPageInfo",
    description: "Get basic information about the current page",
    schema: z.object({}),
  }
);

const goBack = tool(
  async (): Promise<string> => {
    const page = await getSharedPage();
    if (!page) throw new Error("No page found");
    await page.goBack({ waitUntil: "networkidle2" });
    await delay(1000);
    return "Successfully went back to previous page";
  },
  {
    name: "goBack",
    description: "Go back to the previous page",
    schema: z.object({}),
  }
);

const wait = tool(
  async ({ ms }: { ms: number }): Promise<string> => {
    await delay(ms);
    return `Waited ${ms}ms`;
  },
  {
    name: "wait",
    description: "Wait for a given number of milliseconds",
    schema: z.object({ ms: z.number() }),
  }
);

// --- AGENT SETUP ---

const agent = createReactAgent({
  llm: functionModel,
  tools: [
    go,
    smartGo,
    googleSearch,
    click,
    scroll,
    input,
    getStructuredData,
    getPageInfo,
    goBack,
    wait,
  ],
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
  } catch (error) {
    console.error("Scraper error:", error);
    throw error;
  }
};
