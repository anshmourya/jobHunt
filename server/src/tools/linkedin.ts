import fs from "fs/promises";
import path from "path";
import { getBrowser } from "./index";
import type { Page, Cookie, Locator, ElementHandle } from "puppeteer";
import {
  getVisionCompletion,
  summaryModel,
  functionModel,
  semanticSearch,
} from "../config/ollama";
import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import axios from "axios";

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

interface ElementMeta {
  tag: string;
  placeholder: string;
  id: string;
  class: string;
  type: string;
  text: string;
  purpose: string;
  reasoning: string;
  position: string;
  visible: boolean;
  confidence: number;
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

async function identifyElement(pageInfo: any, query: any, multiple = false) {
  const prompt = `
You are an expert web agent for UI automation. Based on the following web page structure, return the best matching element(s) for the user's goal.

PAGE TITLE: ${pageInfo.title}
URL: ${pageInfo.url}
USER QUERY: "${query}"

AVAILABLE ELEMENTS:
Each element is indexed and includes its tag, ID, classes, role, aria-label, visible state, text/alt/placeholder, and position.

${pageInfo.elements
  .map((el, i) => {
    const className = el.className
      ? typeof el.className === "string"
        ? el.className
        : String(el.className)
      : "";
    const classAttr = className
      ? `.${className.split(/\s+/).filter(Boolean).join(".")}`
      : "";

    return `${i}. <${el.tagName}>${el.id ? `#${el.id}` : ""}${classAttr} [${
      el.visible ? "visible" : "hidden"
    }] - "${el.textContent || el.placeholder || el.alt || "no text"}"`;
  }) // avoid overload
  .join("")}

Instructions:
- Match based on semantic meaning and purpose of the query.
- Prefer visible elements.
- Do NOT guess if no clear match is found.
- If multiple elements refer to the same concept (e.g., a label <div> and an <input> inside it), prefer the input or clickable one
- Return a JSON in this exact format:

{
  "elementIndices": [0],
  "confidence": 0.92,
  "elementType": "button | input | link | image | text | checkbox | other",
  "reasoning": "Why this/these element(s) best match the query"
}
`;

  const response = await summaryModel.invoke(
    [
      {
        role: "system",
        content: prompt,
      },
      {
        role: "user",
        content: pageInfo.context,
      },
    ],
    {
      response_format: {
        type: "json_object",
      },
    }
  );

  try {
    const result =
      typeof response.content === "string"
        ? JSON.parse(response.content)
        : response.content;

    // Validate and enhance the result
    return {
      ...result,
      elements: result.elementIndices
        .map((index) => pageInfo.elements[index])
        .filter(Boolean),
      query: query,
    };
  } catch (error: any) {
    throw new Error(`Failed to parse AI response: ${error.message}`);
  }
}

export async function generateElementEmbeddings(page: Page) {
  const pageInfo = await extractPageInformation(page);
  const BATCH_SIZE = 100;
  const BASE_URL = "https://api.jina.ai/v1/embeddings";
  const API_KEY =
    "jina_1a71f3d9e22f4929914af2b127c8fd3eX9w0iEhb3nz5dBz1FZWEZ7_FiZl2";

  if (!API_KEY) {
    throw new Error("JINA_API_KEY not set in environment variables.");
  }

  // Step 1: Build descriptions
  const elementDescriptions = pageInfo.elements.map(
    (el: any, index: number) => ({
      index,
      description: [
        el.tagName,
        el.id || "",
        el.className || "",
        el.textContent || el.placeholder || el.ariaLabel || el.alt || "",
      ]
        .join(" ")
        .replace(/\s+/g, " ")
        .trim(),
    })
  );

  // Step 2: Batch descriptions
  const batches: (typeof elementDescriptions)[] = [];
  for (let i = 0; i < elementDescriptions.length; i += BATCH_SIZE) {
    batches.push(elementDescriptions.slice(i, i + BATCH_SIZE));
  }

  // Step 3: Send batches to Jina and collect embeddings
  const allEmbeddings: { index: number; embedding: number[] }[] = [];

  for (const batch of batches) {
    const response = await axios.post(
      BASE_URL,
      {
        model: "jina-embeddings-v4",
        task: "text-matching",
        input: batch.map((b) => ({ text: b.description })),
      },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const embeddings = response.data.data;

    embeddings.forEach((item: any, i: number) => {
      allEmbeddings.push({
        index: batch[i].index,
        embedding: item.embedding,
      });
    });
  }

  // Step 4: Attach embeddings to elements
  for (const { index, embedding } of allEmbeddings) {
    pageInfo.elements[index].embedding = embedding;
  }

  console.log(`✅ Embedded ${allEmbeddings.length} elements`);
  return pageInfo; // in case you want the enriched object back
}

async function extractPageInformation(page: Page, maxResults = 1, query = "") {
  const title = await page.title();
  const url = page.url();
  const minimalHTML = await page.evaluate(() => {
    return Array.from(
      document.querySelectorAll("input, button, a, label, textarea, select")
    )
      .map((el) => el.outerHTML)
      .join("\n");
  });
  const screenshot = await page.screenshot({
    fullPage: true,
    encoding: "base64",
    type: "jpeg",
  });

  //AI approach
  const visionResponse = await getVisionCompletion([
    {
      role: "system",
      content: `
You are an intelligent web automation assistant.

Your goal is to **identify exactly ONE most relevant** UI element based on the user’s query, screenshot, and HTML. Only return that one element that best satisfies the user's intent.

Follow these rules strictly:
1. Return only ONE element in the JSON array.
2. The element must be visible, interactive (input, button, link, etc.), and relevant to the query.
3. If multiple elements seem equally relevant, choose the most semantically specific one (e.g., an input field over a label).
4. Rank and return only the **highest confidence match**.
5. Ignore elements unrelated to the user's query (even if prominent).

Output Format (only ${String(maxResults)} item in array):

[
  {
    "tag": "input | button | a | textarea | checkbox | select | image | div | other",
    "placeholder": "placeholder text if present",
    "alt": "alt text if present",
    "text": "visible text or label",
    "id": "element id if present",
    "class": "class string if present",
    "type": "type attribute (e.g., 'text', 'submit') if applicable",
    "purpose": "semantic role like 'search_bar', 'email_input', 'submit_button'",
    "reasoning": "why you selected this as the best match for the user’s goal",
    "position": "top-left, top-right, center, etc.",
    "visible": true | false,
    "confidence": 0.0 to 1.0
  }
]

DO NOT include any other elements. DO NOT return explanation outside the JSON.
`,
    },
    {
      role: "user",
      content: [
        {
          type: "image_url",
          image_url: { url: `data:image/jpeg;base64,${screenshot}` },
        },
        {
          type: "text",
          text: minimalHTML,
        },
        {
          type: "text",
          text: query,
        },
      ],
    },
  ]);

  const result = JSON.parse(visionResponse.choices[0].message.content || "{}");

  return {
    title,
    url,
    html: minimalHTML,
    screenshot,
    elements: result,
  };
}

export async function resolvePuppeteerElement(
  page: Page,
  element: ElementMeta
) {
  if (element.id) {
    console.log("Element id:", element.id);
    return page.locator(`#${element.id}`);
  }

  if (element.class) {
    const classSelector =
      "." + element.class.split(/\s+/).filter(Boolean).join(".");
    return page.locator(classSelector);
  }

  if (element.text) {
    console.log("Element text:", element.text);
    return page.locator(element.text);
  }

  throw new Error("No valid selector found for element.");
}

export async function performAction(
  page: Page,
  query: string,
  elementMeta: ElementMeta
) {
  console.log("Element metadata:", elementMeta);
  // Resolve the Puppeteer element using your resolver
  const locator = await resolvePuppeteerElement(page, elementMeta);
  if (!locator) throw new Error("Could not resolve element on the page.");

  const systemMessage = `
You are a Puppeteer expert. You will receive a user query and one HTML element's metadata. 

Your task is to return a **single JSON object** describing what action (if any) should be taken on **this element only**, based on the user's query.

If this element is not mentioned in the query or no relevant action applies to it, return:
  { "actionType": "", "value": "" }

Valid action types:
- "click"
- "type"

Examples:

Query: "click on the login button"
Element: <button id="login">Login</button>
→ Response: { "actionType": "click", "value": "" }

Query: "type ansh@ansh.com in the email field"
Element: <input id="email">
→ Response: { "actionType": "type", "value": "ansh@ansh.com" }

Query: "type ansh in username field and ansh123@ in password field then click login"
Element: <input id="username">
→ Response: { "actionType": "type", "value": "ansh" }

Query: "type ansh in username field and ansh123@ in password field then click login"
Element: <button id="login">Login</button>
→ Response: { "actionType": "click", "value": "" }

Only return a **single JSON object** relevant to the element metadata.
`;

  const aiResponse = await summaryModel.invoke(
    [
      { role: "system", content: systemMessage },
      {
        role: "user",
        content: `user query: ${query}\n\nElement metadata: ${JSON.stringify(
          elementMeta
        )}`,
      },
    ],
    {
      response_format: { type: "json_object" },
    }
  );

  // Parse response
  let result =
    typeof aiResponse.content === "string"
      ? JSON.parse(aiResponse.content)
      : aiResponse;

  const actionType = result.actionType?.toLowerCase();
  const value = result.value;

  console.log("AI Result:", result);

  if (!actionType) throw new Error("No action type found from AI response.");

  console.log(locator);

  if (actionType === "click") {
    await locator.click();
    console.log("→ Clicked element");
  } else if (actionType === "type") {
    if (!value) throw new Error("No value provided for typing.");
    await locator.fill(value);
    console.log(`→ Typed '${value}' into element`);
  } else {
    throw new Error(`Unsupported action type: ${actionType}`);
  }
}

export async function loadCookies(page: Page): Promise<void> {
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

export async function saveCookies(page: Page): Promise<void> {
  try {
    const cookies = await page.cookies();
    if (!cookies?.length) return console.log("→ No cookies to save");

    await fs.writeFile(COOKIE_PATH, JSON.stringify(cookies, null, 2));
    console.log("→ Saved cookies");
  } catch (error) {
    console.error("Error saving cookies:", error);
  }
}

export async function isLoggedIn(page: Page): Promise<boolean> {
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
    name: "initializePageTool",
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
    name: "checkLoginStatusTool",
    description:
      "Check if user is currently logged in to LinkedIn using vision AI",
    schema: CheckLoginStatusSchema,
  }
);

export const loginToLinkedInTool = tool(
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
    name: "loginToLinkedInTool",
    description: "Login to LinkedIn using saved cookies or fresh credentials",
  }
);

export const searchTool = tool(
  async ({ url }) => {
    try {
      const currentPage = await getPage();
      //if user is not logged in
      if (!(await isLoggedIn(currentPage))) {
        return {
          success: false,
          message: "User is not logged in",
        };
      }

      await currentPage.goto(url);

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
        message: `Found ${results.length} search results for "${url}"`,
        results: results,
      };
    } catch (error) {
      return {
        success: false,
        message: `Search failed for "${url}": ${error}`,
        error: error instanceof Error ? error.message : String(error),
        results: [],
      };
    }
  },
  {
    name: "searchTool",
    description: "Search on LinkedIn by url and return results",
    schema: z.object({ url: z.string() }),
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
    name: "navigateToUrlTool",
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
    name: "saveSessionTool",
    description: "Save current LinkedIn session cookies",
    schema: SaveSessionSchema,
  }
);

const searchQueryPreprationTool = tool(
  async ({ query }) => {
    try {
      //check if logged in
      const currentPage = await getPage();
      if (!(await isLoggedIn(currentPage))) {
        return {
          success: false,
          message: "User is not logged in",
        };
      }

      const SYSTEM_MESSAGE = `
You are a LinkedIn URL generator. Your job is to analyze a user's natural language query and return the most appropriate LinkedIn search URL.

🎯 INTENT DETECTION RULES:
- If the query involves job search (e.g. includes 'job', 'apply', 'hiring', 'position'), use:
  🔗 https://www.linkedin.com/jobs/search/?keywords={keywords}&origin=SWITCH_SEARCH_VERTICAL
- If the query is to find people (e.g. includes names, titles, companies), use:
  🔗 https://www.linkedin.com/search/results/people/?keywords={keywords}&origin=SWITCH_SEARCH_VERTICAL
- If the query involves company discovery, use:
  🔗 https://www.linkedin.com/search/results/companies/?keywords={keywords}&origin=SWITCH_SEARCH_VERTICAL
- If the query is about content (posts/articles), use:
  🔗 https://www.linkedin.com/search/results/content/?keywords={keywords}&origin=SWITCH_SEARCH_VERTICAL

📌 URL FORMATTING:
- Replace {keywords} with a properly URL-encoded version of the input query
- Your output must be the full LinkedIn URL
- Do NOT include "currentJobId", "sid", or other tracking params

EXAMPLES:
- "software engineer job" → https://www.linkedin.com/jobs/search/?keywords=software%20engineer%20job&origin=SWITCH_SEARCH_VERTICAL
- "people named Ansh Mourya" → https://www.linkedin.com/search/results/people/?keywords=ansh%20mourya&origin=SWITCH_SEARCH_VERTICAL
- "fintech startups in India" → https://www.linkedin.com/search/results/companies/?keywords=fintech%20startups%20in%20India&origin=SWITCH_SEARCH_VERTICAL
- "posts about artificial intelligence" → https://www.linkedin.com/search/results/content/?keywords=artificial%20intelligence&origin=SWITCH_SEARCH_VERTICAL

💬 Input: a natural language query  
✅ Output: one and only one full LinkedIn search URL.
`;

      const response = await summaryModel.invoke([
        {
          role: "system",
          content: SYSTEM_MESSAGE,
        },
        {
          role: "user",
          content: query,
        },
      ]);
      return response.content;
    } catch (error) {
      return {
        success: false,
        message: `Failed to prepare search query: ${error}`,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
  {
    name: "searchQueryPreprationTool",
    description:
      "Prepare a search query(url) for LinkedIn based on the given query",
    schema: z.object({ query: z.string() }),
  }
);

const cosineSimilarity = (
  embeddings: number[][],
  queryEmbeddings: number[]
) => {
  const dotProduct = embeddings.reduce(
    (sum, embedding, index) =>
      sum +
      embedding.reduce((dot, value, i) => dot + value * queryEmbeddings[i], 0),
    0
  );

  const queryMagnitude = Math.sqrt(
    queryEmbeddings.reduce((sum, value) => sum + value * value, 0)
  );

  const embeddingsMagnitude = Math.sqrt(
    embeddings.reduce(
      (sum, embedding) =>
        sum + embedding.reduce((dot, value) => dot + value * value, 0),
      0
    )
  );

  return dotProduct / (queryMagnitude * embeddingsMagnitude);
};

export async function agentQL(query: string, options: any = {}) {
  try {
    const page = await getPage();
    //goto linkden login page
    // await page.goto("https://www.linkedin.com/login", {
    //   waitUntil: "domcontentloaded",
    //   timeout: NAVIGATION_TIMEOUT,
    // });

    if (!(await isLoggedIn(page))) {
      await loginToLinkedInTool.invoke({});
    }

    const {
      timeout = 30000,
      waitForVisible = true,
      multiple = true,
      context = null,
    } = options;

    // Step 1: Get page structure and content
    const pageInfo = await extractPageInformation(page, 1, query);
    // const pageInfoWithEmbeddings = await generateElementEmbeddings(page);

    // const semanticSearchResults = await semanticSearch(
    //   query,
    //   pageInfo.elements,
    //   1
    // );

    // console.log(JSON.stringify(semanticSearchResults, null, 2));

    // Step 2: Use AI to identify the target element

    // const elementInfo = await identifyElement(pageInfo, query, multiple);

    // console.log("AI matched element:", elementInfo);
    if (Array.isArray(pageInfo.elements)) {
      for (const element of pageInfo.elements) {
        await performAction(page, query, element);
      }
    } else {
      await performAction(page, query, pageInfo.elements);
    }

    return { success: true, message: "Action performed successfully" };
  } catch (error: any) {
    //page screenshot
    await page.screenshot({ path: "error.png" });
    throw new Error(`AgentQL failed: ${error.message}`);
  }
}

//--- AGENT SETUP ---

const agent = createReactAgent({
  llm: functionModel,
  tools: [
    initializePageTool,
    loginToLinkedInTool,
    searchTool,
    navigateToUrlTool,
    searchQueryPreprationTool,
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
