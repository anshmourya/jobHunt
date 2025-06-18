import { summaryModel } from "../config/ollama";
import { task, entrypoint } from "@langchain/langgraph";
import Job from "../models/job";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import {executablePath} from "puppeteer";
import pino from "pino";
import {
  aggregatePrompt,
  atsFriendlyResolverPrompt,
  generateResumeJson,
  integrityCheckPrompt,
  jobPostPrompt,
  keywordPlacementPrompt,
  qualityCheckPrompt,
} from "../helper/prompt";
import { z } from "zod";

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });

// Initialize a shared browser instance
let sharedBrowser;
export async function getBrowser() {
  if (!sharedBrowser) {
    puppeteer.use(StealthPlugin());
    sharedBrowser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      executablePath: executablePath()
    });
  }
  return sharedBrowser;
}

let requestCount = 0; // Global counter for requests made in this run
const MAX_REQUESTS_BEFORE_PAUSE = 29;
const WAIT_DURATION_MS = 60000; // 1 minute wait (60s)

// Utility: retry with backoff
export async function retry(
  fn: () => Promise<any>,
  attempts = 3,
  delay = 500,
  isRequestFromLLM = false
) {
  let lastError;

  for (let i = 1; i <= attempts; i++) {
    try {
      if (requestCount >= MAX_REQUESTS_BEFORE_PAUSE) {
        console.warn(
          `⚠️ Request limit approaching (${requestCount}/${MAX_REQUESTS_BEFORE_PAUSE}). Waiting 60s...`
        );
        await new Promise((res) => setTimeout(res, WAIT_DURATION_MS));
        requestCount = 0; // reset after wait
      }

      const response = await fn();
      if (isRequestFromLLM) {
        requestCount++;
      }
      return response;
    } catch (err: unknown) {
      lastError = err;
      console.error(
        `Retry ${i}/${attempts} failed:`,
        (err as Error).message ?? err
      );
      // /{"error":{"message":"Rate limit reached for model `llama-3.1-8b-instant` in organization `org_01jw6ynmvhfk2ry7n3bbrpkpbr` service tier `on_demand` on tokens per minute (TPM): Limit 6000, Used 6030, Requested 2320. Please try again in 23.509s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
      if (err instanceof Error && err.message.includes("rate_limit_exceeded")) {
        console.log(`Waiting ${WAIT_DURATION_MS}ms before retrying...`);
        await new Promise((res) => setTimeout(res, WAIT_DURATION_MS));
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}

// job post extractor with timeout and retry
const jobPostExtractor = task("jobPostExtractor", async (link: string) => {
  return retry(async () => {
    const browser = await getBrowser();
    const page = await browser.newPage();

    try {
      // Set a realistic user agent
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      );

      // Configure page settings
      await page.setDefaultNavigationTimeout(60000); // 60 seconds
      await page.setDefaultTimeout(60000);

      // Disable images and styles for faster loading
      await page.setRequestInterception(true);
      page.on("request", (req) => {
        if (["image", "stylesheet", "font"].includes(req.resourceType())) {
          req.abort();
        } else {
          req.continue();
        }
      });

      // Try to navigate with networkidle0, fallback to domcontentloaded if it fails
      try {
        await page.goto(link, {
          waitUntil: "networkidle0",
          timeout: 60000,
        });
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        logger.warn(
          `Navigation with networkidle0 failed, trying domcontentloaded: ${error.message}`
        );
        await page.goto(link, {
          waitUntil: "domcontentloaded",
          timeout: 60000,
        });
      }

      // Wait for body to be present
      await page.waitForSelector("body", { timeout: 10000 });

      // Get the page content
      const content = await page.evaluate(() => document.body.innerText);

      if (!content || content.length < 100) {
        throw new Error("Page content is too short or empty");
      }

      return content;
    } catch (error: any) {
      logger.error(`Error extracting job post from ${link}: ${error.message}`);
      throw error; // Re-throw to trigger retry
    } finally {
      try {
        await page.close();
      } catch (e: any) {
        logger.warn(`Error closing page: ${e.message}`);
      }
    }
  });
});

export const getSummary = async (input: string) => {
  try {
    const result = await retry(
      () =>
        summaryModel.invoke(
          [
            {
              role: "system",
              content: jobPostPrompt,
            },
            {
              role: "user",
              content: input,
            },
          ],
          {
            response_format: {
              type: "json_object",
            },
          }
        ),
      2,
      1000,
      true
    );
    const content =
      typeof result.content === "string"
        ? result.content
        : JSON.stringify(result.content);
    return JSON.parse(content);
  } catch (err) {
    logger.error({ err }, "Summary model invocation failed");
    // Fallback: return minimal structure
    return {
      company_name: null,
      position: null,
      keywords: [],
      important_details: [],
      additional_info: {},
      summary: "Unable to generate summary at this time.",
    };
  }
};

// summary tool
export const summary = task("summary", async (input: string) => {
  return getSummary(input);
});

// push to database with error handling
const pushToDatabase = task("pushToDatabase", async (data: any) => {
  try {
    const validationSchema = z.object({
      company_name: z.string(),
      position: z.string(),
      keywords: z.array(z.string()).min(1),
      important_details: z.array(z.string()),
      additional_info: z.object({}),
      summary: z.string(),
      apply_link: z.string(),
    });
    const validation = validationSchema.safeParse(data);
    if (!validation.success) {
      logger.warn("Invalid data");
      return false;
    }
    const job = new Job(data);
    await job.save();
    return true;
  } catch (error) {
    logger.error("Database save failed");
    console.log(error);
    return false;
  }
});

// entrypoint
const workflow = entrypoint("jobPostExtractor", async (link: string) => {
  const start = Date.now();
  const output = { isSaved: false, result: null, errors: [], timeTaken: "" };

  try {
    const jobPost = await jobPostExtractor(link);
    logger.info({ duration: Date.now() - start }, "Fetched job post");

    const result = await summary(jobPost);
    output.result = result;
    logger.info({ duration: Date.now() - start }, "Generated summary");

    const saved = await pushToDatabase({ ...result, apply_link: link });
    output.isSaved = saved;
    logger.info(
      { duration: Date.now() - start, saved },
      "Database push status"
    );
  } catch (err: any) {
    logger.error({ err }, "Workflow encountered an unrecoverable error");
    output.errors.push(err?.message as never);
  } finally {
    output.timeTaken = `${Date.now() - start}ms`;
    return output;
  }
});

//quality check tool
const qualityCheck = task(
  "qualityCheck",
  async (actualResume, generatedResume, keywords) => {
    const message = qualityCheckPrompt
      .replace("ACTUAL_RESUME_HERE", JSON.stringify(actualResume))
      .replace("GENERATED_RESUME_HERE", JSON.stringify(generatedResume))
      .replace("KEYWORDS_LIST_HERE", JSON.stringify(keywords));
    try {
      const result = await retry(
        () =>
          summaryModel.invoke(
            [
              {
                role: "system",
                content: qualityCheckPrompt,
              },
              {
                role: "user",
                content: message,
              },
            ],
            {
              response_format: {
                type: "json_object",
              },
            }
          ),
        2,
        1000,
        true
      );
      const content =
        typeof result.content === "string"
          ? result.content
          : JSON.stringify(result.content);
      return JSON.parse(content);
    } catch (err) {
      logger.error({ err }, "Quality check model invocation failed");
      return null;
    }
  }
);

// resume builder
export const resumeBuilder = task(
  "resumeBuilder",
  async (resumeData, keywords) => {
    const systemPrompt = {
      role: "system",
      content: generateResumeJson,
    };
    const userPrompt = {
      role: "user",
      content: `resumeData: ${JSON.stringify(
        resumeData
      )} keywords: ${JSON.stringify(keywords)}`,
    };
    try {
      const result = await retry(
        () =>
          summaryModel.invoke([systemPrompt, userPrompt], {
            response_format: {
              type: "json_object",
            },
          }),
        2,
        1000,
        true
      );
      const content =
        typeof result.content === "string"
          ? result.content
          : JSON.stringify(result.content);
      logger.info(
        "----------- Ended Resume builder model invocation-----------"
      );
      return JSON.parse(content);
    } catch (err) {
      logger.error({ err }, "Resume builder model invocation failed");
      return null;
    }
  }
);

// ats friendly resolver
const atsFriendlyResolver = task(
  "atsFriendlyResolver",
  async (resumeData, issuesList) => {
    const message = atsFriendlyResolverPrompt
      .replace("RESUME_JSON_HERE", JSON.stringify(resumeData))
      .replace("ISSUES_LIST_HERE", JSON.stringify(issuesList));
    try {
      const result = await retry(
        () =>
          summaryModel.invoke(message, {
            response_format: {
              type: "json_object",
            },
          }),
        2,
        1000,
        true
      );
      const content =
        typeof result.content === "string"
          ? result.content
          : JSON.stringify(result.content);
      logger.info(
        "----------- Ended ATS friendly resolver model invocation-----------"
      );
      return JSON.parse(content);
    } catch (err) {
      logger.error({ err }, "ATS friendly resolver model invocation failed");
      return null;
    }
  }
);

// keyword placement
const keywordPlacement = task(
  "keywordPlacement",
  async (resumeData, missingKeywords, incorrectPlacement) => {
    const message = keywordPlacementPrompt
      .replace("RESUME_JSON_HERE", JSON.stringify(resumeData))
      .replace("MISSING_KEYWORDS_HERE", JSON.stringify(missingKeywords))
      .replace("INCORRECT_PLACEMENT_HERE", JSON.stringify(incorrectPlacement));
    try {
      const result = await retry(
        () =>
          summaryModel.invoke(message, {
            response_format: {
              type: "json_object",
            },
          }),
        2,
        1000,
        true
      );
      const content =
        typeof result.content === "string"
          ? result.content
          : JSON.stringify(result.content);
      logger.info(
        "----------- Ended Keyword placement model invocation-----------"
      );
      return JSON.parse(content);
    } catch (err) {
      logger.error({ err }, "Keyword placement model invocation failed");
      return null;
    }
  }
);

// integrity check
const integrityCheck = task(
  "integrityCheck",
  async (resumeData, issuesList) => {
    const message = integrityCheckPrompt
      .replace("RESUME_JSON_HERE", JSON.stringify(resumeData))
      .replace("ISSUES_LIST_HERE", JSON.stringify(issuesList));
    try {
      const result = await retry(
        () =>
          summaryModel.invoke(message, {
            response_format: {
              type: "json_object",
            },
          }),
        2,
        1000,
        true
      );
      const content =
        typeof result.content === "string"
          ? result.content
          : JSON.stringify(result.content);
      logger.info(
        "----------- Ended Integrity check model invocation-----------"
      );
      return JSON.parse(content);
    } catch (err) {
      logger.error({ err }, "Integrity check model invocation failed");
      return null;
    }
  }
);

// aggregate
const aggregate = task(
  "aggregate",
  async (integrityCheckResult, atsCheckResult, keywordCheckResult) => {
    const message = aggregatePrompt
      .replace(
        "INTEGRITY_UPDATED_RESUME_HERE",
        JSON.stringify(integrityCheckResult)
      )
      .replace("ATS_UPDATED_RESUME_HERE", JSON.stringify(atsCheckResult))
      .replace(
        "KEYWORD_UPDATED_RESUME_HERE",
        JSON.stringify(keywordCheckResult, null, 2)
      );
    try {
      const result = await retry(
        () =>
          summaryModel.invoke(message, {
            response_format: {
              type: "json_object",
            },
          }),
        2,
        1000,
        true
      );
      const content =
        typeof result.content === "string"
          ? result.content
          : JSON.stringify(result.content);
      logger.info("----------- Ended Aggregate model invocation-----------");
      return JSON.parse(content);
    } catch (err) {
      logger.error({ err }, "Aggregate model invocation failed");
      return null;
    }
  }
);

export const resumeBuilderWorkflow = entrypoint(
  "resumeBuilder",
  async (input: { resumeData: any; keywords: string[] }) => {
    const start = Date.now();
    const output = { result: null as any, errors: [], timeTaken: "" };
    const { resumeData, keywords } = input;

    try {
      const generatedResume = await resumeBuilder(resumeData, keywords);
      // const qualityCheckResult = await qualityCheck(
      //   resumeData,
      //   generatedResume,
      //   keywords
      // );

      // if (
      //   qualityCheckResult.integrity_passed &&
      //   qualityCheckResult.ats_passed &&
      //   qualityCheckResult.keyword_passed &&
      //   true //TODO: remove this
      // ) {
      // }
      output.result = generatedResume;
      output.timeTaken = `${Date.now() - start}ms`;
      return output;
    } catch (err: any) {
      logger.error({ err }, "Workflow encountered an unrecoverable error");
      output.errors.push(err?.message as never);
    } finally {
      output.timeTaken = `${Date.now() - start}ms`;
      return output;
    }
  }
);

export default workflow;
