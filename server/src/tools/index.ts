import { summaryModel } from "../config/ollama";
import { task, entrypoint } from "@langchain/langgraph";
import Job from "../models/job";
import puppeteer from "puppeteer";
import pino from "pino";
import { jobPostPrompt } from "../helper/prompt";

const logger = pino({ level: process.env.LOG_LEVEL || "info" });

// Initialize a shared browser instance
let sharedBrowser;
async function getBrowser() {
  if (!sharedBrowser) {
    sharedBrowser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }
  return sharedBrowser;
}

// Utility: retry with backoff
async function retry(fn: () => Promise<any>, attempts = 3, delay = 500) {
  let lastError;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      logger.warn({ attempt: i, err }, "Retry attempt failed");
      await new Promise((res) => setTimeout(res, delay * i));
    }
  }
  throw lastError;
}

// job post extractor with timeout and retry
const jobPostExtractor = task("jobPostExtractor", async (link) => {
  return retry(async () => {
    const browser = await getBrowser();
    const page = await browser.newPage();
    try {
      await page.goto(link, { waitUntil: "networkidle0", timeout: 30000 });
      const content = await page.evaluate(() => document.body.innerText);
      return content;
    } finally {
      await page.close();
    }
  });
});

// summary tool
const summary = task("summary", async (input) => {
  const message = jobPostPrompt.replace("JOB_DESCRIPTION_HERE", String(input));
  try {
    const result = await retry(() => summaryModel.invoke(message), 2, 1000);
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
});

// push to database with error handling
const pushToDatabase = task("pushToDatabase", async (data) => {
  try {
    const job = new Job(data);
    await job.save();
    return true;
  } catch (error) {
    logger.error({ error, data }, "Database save failed");
    return false;
  }
});

// entrypoint
const workflow = entrypoint("jobPostExtractor", async (link) => {
  const start = Date.now();
  const output = { isSaved: false, result: null, errors: [], timeTaken: "" };

  try {
    const jobPost = await jobPostExtractor(link);
    logger.info({ duration: Date.now() - start }, "Fetched job post");

    const result = await summary(jobPost);
    output.result = result;
    logger.info({ duration: Date.now() - start }, "Generated summary");

    const saved = await pushToDatabase(result);
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

export default workflow;
