import fs from "fs/promises";
import path from "path";
import { getBrowser } from "./index";
import type { Page, Cookie } from "puppeteer";
import {
  getVisionCompletion,
  summaryModel,
  functionModel,
} from "../config/ollama";
import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";

const COOKIE_PATH = path.resolve(__dirname, "../linkedin-cookies.json");
const LOGIN_TIMEOUT = 120000;
const NAVIGATION_TIMEOUT = 60000;

let page: Page;

// Agent State Interface
interface AgentState {
  messages: BaseMessage[];
  page?: Page;
  isLoggedIn: boolean;
  lastAction: string;
  error?: string;
}

// Tool Schemas
const InitializePageSchema = z.object({
  viewport: z
    .object({
      width: z.number().default(1366),
      height: z.number().default(768),
    })
    .optional(),
});

const LoginSchema = z.object({
  forceLogin: z
    .boolean()
    .default(false)
    .describe("Force fresh login even if cookies exist"),
});

const SearchProfileSchema = z.object({
  name: z.string().describe("Name of the person to search for on LinkedIn"),
});

const NavigateSchema = z.object({
  url: z.string().describe("LinkedIn URL to navigate to"),
});

const CheckLoginStatusSchema = z.object({});

const SaveSessionSchema = z.object({});

// Utility Functions
const getPage = async (): Promise<Page> => {
  if (page) return page;
  const browser = await getBrowser();
  page = await browser.newPage();
  return page;
};

async function loadCookies(page: Page): Promise<void> {
  try {
    const json = await fs.readFile(COOKIE_PATH, "utf-8").catch(() => null);
    if (!json) return console.log("→ No saved cookies found");

    const cookies = JSON.parse(json) as Cookie[];
    if (!cookies?.length) return console.log("→ Empty cookie file");

    console.log(`→ Loading ${cookies.length} cookies`);
    await page.setCookie(...cookies);
  } catch (error) {
    console.error("Error loading cookies:", error);
  }
}

async function saveCookies(page: Page): Promise<void> {
  try {
    const cookies = await page.cookies();
    if (!cookies?.length) return console.log("→ No cookies to save");

    await fs.writeFile(COOKIE_PATH, JSON.stringify(cookies, null, 2));
    console.log("→ Saved cookies");
  } catch (error) {
    console.error("Error saving cookies:", error);
  }
}

async function isLoggedIn(page: Page): Promise<boolean> {
  try {
    const base64Image = await page.screenshot({
      encoding: "base64",
    });
    const visionCompletion = await getVisionCompletion([
      {
        role: "system",
        content:
          'Am I logged in to LinkedIn? Answer in JSON like {"answer": "Yes"} or {"answer": "No"}',
      },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:image/png;base64,${base64Image}`,
            },
          },
        ],
      },
    ]);

    const result = JSON.parse(
      visionCompletion.choices[0].message.content || "{}"
    );
    return result.answer?.toLowerCase() === "yes";
  } catch (error) {
    console.error("Login status check failed:", error);
    return false;
  }
}

// LangGraph Tools
export const initializePageTool = tool(
  async ({ viewport = { width: 1366, height: 768 } }) => {
    try {
      const currentPage = await getPage();
      await currentPage.setViewport(viewport);
      await currentPage.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      );
      currentPage.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT);

      return {
        success: true,
        message: `Page initialized with viewport ${viewport.width}x${viewport.height}`,
        page: currentPage,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to initialize page: ${error}`,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
  {
    name: "initialize_page",
    description:
      "Initialize a new browser page with LinkedIn-optimized settings",
    schema: InitializePageSchema,
  }
);

export const checkLoginStatusTool = tool(
  async ({}) => {
    try {
      const currentPage = await getPage();
      const loggedIn = await isLoggedIn(currentPage);

      return {
        success: true,
        isLoggedIn: loggedIn,
        message: loggedIn ? "User is logged in" : "User is not logged in",
      };
    } catch (error) {
      return {
        success: false,
        isLoggedIn: false,
        message: `Failed to check login status: ${error}`,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
  {
    name: "check_login_status",
    description:
      "Check if user is currently logged in to LinkedIn using vision AI",
    schema: CheckLoginStatusSchema,
  }
);

export const loginTool = tool(
  async () => {
    try {
      const currentPage = await getPage();

      await loadCookies(currentPage);
      console.log("→ Navigating to LinkedIn feed...");
      await currentPage.goto("https://www.linkedin.com/feed/", {
        waitUntil: "domcontentloaded",
      });

      if (await isLoggedIn(currentPage)) {
        console.log("→ Session restored from cookies");
        return {
          success: true,
          message: "Successfully logged in using saved cookies",
          method: "cookies",
        };
      }

      console.log("→ Proceeding with fresh login...");
      await currentPage.goto("https://www.linkedin.com/login", {
        waitUntil: "domcontentloaded",
      });

      const email = process.env.LINKEDIN_EMAIL;
      const password = process.env.LINKEDIN_PASSWORD;

      if (!email || !password) {
        throw new Error(
          "Missing LinkedIn credentials in environment variables"
        );
      }

      await currentPage.waitForSelector("#username", {
        visible: true,
        timeout: 10000,
      });
      await currentPage.type("#username", email, { delay: 50 });
      await currentPage.type("#password", password, { delay: 50 });

      await Promise.all([
        currentPage.click('button[type="submit"]'),
        currentPage.waitForNavigation({
          waitUntil: "domcontentloaded",
          timeout: LOGIN_TIMEOUT,
        }),
      ]);

      // Handle verification if needed
      if (await currentPage.$("#input__email_verification_pin")) {
        console.warn(
          "→ Verification required, waiting for manual completion..."
        );
        await currentPage.waitForNavigation({
          waitUntil: "networkidle0",
          timeout: 300000,
        });
      }

      if (!(await isLoggedIn(currentPage))) {
        await currentPage.screenshot({ path: "linkedin-login-failed.png" });
        throw new Error("Login failed. Check credentials and try again.");
      }

      console.log("→ Login successful");
      await saveCookies(currentPage);

      return {
        success: true,
        message: "Successfully logged in with credentials",
        method: "credentials",
      };
    } catch (error) {
      const currentPage = await getPage();
      await Promise.all([
        currentPage.screenshot({ path: "linkedin-error.png" }),
        currentPage
          .content()
          .then((html) => fs.writeFile("linkedin-page.html", html)),
      ]);

      return {
        success: false,
        message: `Login failed: ${error}`,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
  {
    name: "login_to_linkedin",
    description: "Login to LinkedIn using saved cookies or fresh credentials",
    schema: LoginSchema,
  }
);

export const searchProfileTool = tool(
  async ({ name }) => {
    try {
      const currentPage = await getPage();
      //if user is not logged in
      if (!(await isLoggedIn(currentPage))) {
        return {
          success: false,
          message: "User is not logged in",
        };
      }

      const searchUrl = `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(
        name
      )}`;

      await currentPage.goto(searchUrl);

      await currentPage.waitForSelector(".search-results__list", {
        visible: true,
        timeout: 10000,
      });

      // Extract search results
      const results = await currentPage.evaluate(() => {
        const resultElements = document.querySelectorAll(
          ".search-results__list .reusable-search__result-container"
        );
        return Array.from(resultElements)
          .slice(0, 5)
          .map((element) => {
            const titleElement = element.querySelector(
              ".entity-result__title-text a"
            );
            const subtitleElement = element.querySelector(
              ".entity-result__primary-subtitle"
            );
            const snippetElement = element.querySelector(
              ".entity-result__summary"
            );

            return {
              title: titleElement?.textContent?.trim() || "",
              subtitle: subtitleElement?.textContent?.trim() || "",
              snippet: snippetElement?.textContent?.trim() || "",
              url: titleElement?.getAttribute("href") || "",
            };
          });
      });

      return {
        success: true,
        message: `Found ${results.length} search results for "${name}"`,
        results: results,
        searchUrl: searchUrl,
      };
    } catch (error) {
      return {
        success: false,
        message: `Search failed for "${name}": ${error}`,
        error: error instanceof Error ? error.message : String(error),
        results: [],
      };
    }
  },
  {
    name: "search_linkedin_profile",
    description: "Search for LinkedIn profiles by name and return results",
    schema: SearchProfileSchema,
  }
);

export const navigateToUrlTool = tool(
  async ({ url }) => {
    try {
      const currentPage = await getPage();

      if (!url.includes("linkedin.com")) {
        throw new Error("Only LinkedIn URLs are allowed");
      }

      await currentPage.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: NAVIGATION_TIMEOUT,
      });

      const pageTitle = await currentPage.title();
      const currentUrl = currentPage.url();

      return {
        success: true,
        message: `Successfully navigated to ${url}`,
        pageTitle: pageTitle,
        currentUrl: currentUrl,
      };
    } catch (error) {
      return {
        success: false,
        message: `Navigation failed to ${url}: ${error}`,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
  {
    name: "navigate_to_url",
    description: "Navigate to a specific LinkedIn URL",
    schema: NavigateSchema,
  }
);

export const saveSessionTool = tool(
  async ({}) => {
    try {
      const currentPage = await getPage();
      await saveCookies(currentPage);

      return {
        success: true,
        message: "Session cookies saved successfully",
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to save session: ${error}`,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
  {
    name: "save_session",
    description: "Save current LinkedIn session cookies",
    schema: SaveSessionSchema,
  }
);

//--- AGENT SETUP ---

const agent = createReactAgent({
  llm: functionModel,
  tools: [
    initializePageTool,
    loginTool,
    searchProfileTool,
    navigateToUrlTool,
    saveSessionTool,
  ],
  checkpointer: new MemorySaver(),
});

export const linkedin = async (messages: string) => {
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
