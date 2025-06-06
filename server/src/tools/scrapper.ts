import { tool } from "@langchain/core/tools";
import { getBrowser } from "./index";
import { retry } from "./index";
import { functionModel } from "../config/ollama";
import { MemorySaver } from "@langchain/langgraph";
import { HumanMessage } from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { z } from "zod";
import * as puppeteer from "puppeteer";

let page: puppeteer.Page;

async function getSharedPage() {
  const browser = await getBrowser();
  if (!page) page = await browser.newPage();
  return page;
}

//scrapper tool
const go = tool(
  async ({ link }: { link: string }): Promise<string> => {
    const page = await getSharedPage();
    await page.goto(link);
    const content = await page.content();
    return content;
  },
  {
    name: "go",
    description: "Navigate to a specified URL",
    schema: z.object({
      link: z.string(),
    }),
  }
);

//click
const click = tool(
  async ({ selector }: { selector: string }): Promise<string> => {
    const page = await getSharedPage();
    await page.click(selector);
    return "clicked";
  },
  {
    name: "click",
    description: "Click an element by CSS/XPath selector",
    schema: z.object({
      selector: z.string(),
    }),
  }
);

//scroll
const scroll = tool(
  async ({
    direction,
    px,
  }: {
    direction: "up" | "down";
    px: number;
  }): Promise<string> => {
    const page = await getSharedPage();
    await page.evaluate(
      ({ direction, px }) => {
        window.scrollBy(0, direction === "down" ? px : -px);
      },
      { direction, px }
    );
    return "scrolled";
  },
  {
    name: "scroll",
    description: "Scroll up/down by pixels or percent",
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
    await page.type(selector, value);
    return "inputed";
  },
  {
    name: "input",
    description: "Input a value",
    schema: z.object({
      selector: z.string(),
      value: z.string(),
    }),
  }
);

const extract = tool(
  async ({ selector }: { selector: string }): Promise<string> => {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const page = await getSharedPage();
        // Wait a bit for any potential dynamic content to load
        await delay(500);

        // Check if the element exists first
        const element = await page.$(selector);
        if (!element) {
          throw new Error(`Element with selector "${selector}" not found`);
        }

        // Get the text content
        const content = await page.evaluate(
          (el) => el.textContent,
          await element
        );
        return content?.trim() || "";
      } catch (error) {
        lastError = error as Error;
        console.warn(`Attempt ${attempt} failed:`, error);

        // If it's not the last attempt, wait a bit before retrying
        if (attempt < maxRetries) {
          await delay(1000 * attempt); // Exponential backoff
        }
      }
    }

    // If we get here, all attempts failed
    throw new Error(
      `Failed to extract content after ${maxRetries} attempts: ${lastError?.message}`
    );
  },
  {
    name: "extract",
    description: "Get innerText or href, etc., of element",
    schema: z.object({
      selector: z.string(),
    }),
  }
);

//go back
const goBack = tool(
  async (): Promise<string> => {
    const page = await getSharedPage();
    await page.goBack();
    return "go back";
  },
  {
    name: "goBack",
    description: "Go back to previous page",
    schema: z.object({}),
  }
);

// Helper function for delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

//wait
const wait = tool(
  async ({ ms }: { ms: number }): Promise<string> => {
    await delay(ms);
    return "waited";
  },
  {
    name: "wait",
    description: "Sleep for a specific duration",
    schema: z.object({
      ms: z.number(),
    }),
  }
);

const agent = createReactAgent({
  llm: functionModel,
  tools: [go, click, scroll, input, extract, goBack, wait],
  checkpointer: new MemorySaver(),
});

const agentExecutor = async (messages: any) => {
  const result = await agent.invoke(
    {
      messages: [new HumanMessage(messages)],
    },
    {
      configurable: { thread_id: "42" },
    }
  );

  return result.messages;
};

export const scrapper = agentExecutor;
