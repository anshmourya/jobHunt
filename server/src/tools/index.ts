import { summaryModel } from "../config/ollama";
import { task, entrypoint } from "@langchain/langgraph";
import Job from "../models/job";
import puppeteer from "puppeteer";
import pino from "pino";
import { aggregatePrompt, atsFriendlyResolverPrompt, generateResumeJson, integrityCheckPrompt, jobPostPrompt, keywordPlacementPrompt, qualityCheckPrompt } from "../helper/prompt";

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

//quality check tool
const qualityCheck = task("qualityCheck", async (actualResume , generatedResume , keywords) => {
  const message = qualityCheckPrompt.replace("ACTUAL_RESUME_HERE", JSON.stringify(actualResume , null , 2)).replace("GENERATED_RESUME_HERE", JSON.stringify(generatedResume , null , 2)).replace("KEYWORDS_LIST_HERE", JSON.stringify(keywords));
  try {
    const result = await retry(() => summaryModel.invoke(message), 2, 1000);
    const content =
      typeof result.content === "string"
        ? result.content
        : JSON.stringify(result.content);
    return JSON.parse(content);
  } catch (err) {
    logger.error({ err }, "Quality check model invocation failed");
    return null;
  }
});

// resume builder
export const resumeBuilder = task("resumeBuilder", async (resumeData , keywords) => {
  const message = generateResumeJson.replace("RESUME_DATA_HERE", JSON.stringify(resumeData , null , 2)).replace("KEYWORDS_HERE", JSON.stringify(keywords));
  try {
    const result = await retry(() => summaryModel.invoke(message),   2, 1000);
    const content =
      typeof result.content === "string"
        ? result.content
        : JSON.stringify(result.content);
    logger.info({ content }, "Resume builder model invocation");
    return JSON.parse(content);
  } catch (err) {
    logger.error({ err }, "Resume builder model invocation failed");
    return null;
  }
});

// ats friendly resolver
const atsFriendlyResolver = task("atsFriendlyResolver", async (resumeData , issuesList) => {
  const message = atsFriendlyResolverPrompt.replace("RESUME_JSON_HERE", JSON.stringify(resumeData , null , 2)).replace("ISSUES_LIST_HERE", JSON.stringify(issuesList));
  try {
    const result = await retry(() => summaryModel.invoke(message), 2, 1000);
    const content =
      typeof result.content === "string"
        ? result.content
        : JSON.stringify(result.content);
    logger.info({ content }, "ATS friendly resolver model invocation");
    return JSON.parse(content);
  } catch (err) {
    logger.error({ err }, "ATS friendly resolver model invocation failed");
    return null;
  }
});

// keyword placement
const keywordPlacement = task("keywordPlacement", async (resumeData , missingKeywords , incorrectPlacement) => {
  const message = keywordPlacementPrompt.replace("RESUME_JSON_HERE", JSON.stringify(resumeData , null , 2)).replace("MISSING_KEYWORDS_HERE", JSON.stringify(missingKeywords)).replace("INCORRECT_PLACEMENT_HERE", JSON.stringify(incorrectPlacement));
  try {
    const result = await retry(() => summaryModel.invoke(message), 2, 1000);
    const content =
      typeof result.content === "string"
        ? result.content
        : JSON.stringify(result.content);
    logger.info({ content }, "Keyword placement model invocation");
    return JSON.parse(content);
  } catch (err) {
    logger.error({ err }, "Keyword placement model invocation failed");
    return null;
  }
});

// integrity check
const integrityCheck = task("integrityCheck", async (resumeData, issuesList) => {
  const message = integrityCheckPrompt.replace("RESUME_JSON_HERE", JSON.stringify(resumeData , null , 2)).replace("ISSUES_LIST_HERE", JSON.stringify(issuesList));
  try {
    const result = await retry(() => summaryModel.invoke(message), 2, 1000);
    const content =
      typeof result.content === "string"
        ? result.content
        : JSON.stringify(result.content);
    logger.info({ content }, "Integrity check model invocation");
    return JSON.parse(content);
  } catch (err) {
    logger.error({ err }, "Integrity check model invocation failed");
    return null;
  }
});

// aggregate
const aggregate = task("aggregate", async (integrityCheckResult, atsCheckResult, keywordCheckResult) => {
  const message = aggregatePrompt.replace("INTEGRITY_UPDATED_RESUME_HERE", JSON.stringify(integrityCheckResult , null , 2)).replace("ATS_UPDATED_RESUME_HERE", JSON.stringify(atsCheckResult , null , 2)).replace("KEYWORD_UPDATED_RESUME_HERE", JSON.stringify(keywordCheckResult , null , 2 ));
  try {
    const result = await retry(() => summaryModel.invoke(message), 2, 1000);
    const content =
      typeof result.content === "string"
        ? result.content
        : JSON.stringify(result.content);
    logger.info({ content }, "Aggregate model invocation");
    return JSON.parse(content);
  } catch (err) {
    logger.error({ err }, "Aggregate model invocation failed");
    return null;
  }
});


export const resumeBuilderWorkflow = entrypoint("resumeBuilder", async (input: { resumeData: any, keywords: string[] }) => {
  const start = Date.now();
  const output = { result: null, errors: [], timeTaken: "" };
  const { resumeData, keywords } = input;
  console.log(JSON.stringify(resumeData).slice(0, 100), keywords);

  try {
    const generatedResume = await resumeBuilder(resumeData, keywords);
    const qualityCheckResult = await qualityCheck(resumeData, generatedResume, keywords);
    
    if (qualityCheckResult.integrityCheck.passed && qualityCheckResult.atsCheck.passed && qualityCheckResult.keywordCheck.passed) {
      return {
        result: generatedResume,
        errors: [],
        timeTaken: `${Date.now() - start}ms`
      }
    }
    
    let functionCalls: Promise<any>[] = [];
    if (!qualityCheckResult.integrityCheck.passed) {
      functionCalls.push(integrityCheck(resumeData , qualityCheckResult.integrityCheck.issues));
    }
    if (!qualityCheckResult.atsCheck.passed) {
      functionCalls.push(atsFriendlyResolver(resumeData, qualityCheckResult.atsCheck.issues));
    }
    if (!qualityCheckResult.keywordCheck.passed) {
      functionCalls.push(keywordPlacement(resumeData, qualityCheckResult.keywordCheck.missingKeywords, qualityCheckResult.keywordCheck.incorrectPlacement));
    }


    const [integrityCheckResult, atsCheckResult, keywordCheckResult] = await Promise.all(functionCalls);

    const aggregateResult = await aggregate(integrityCheckResult, atsCheckResult, keywordCheckResult);
    logger.info({ aggregateResult }, "Aggregate result");
    return{
      result: aggregateResult,
      errors: [],
      timeTaken: `${Date.now() - start}ms`
    }
  }
  catch (err: any) {
    logger.error({ err }, "Workflow encountered an unrecoverable error");
    output.errors.push(err?.message as never);
  } finally {
    output.timeTaken = `${Date.now() - start}ms`;
    return output;
  }
});

export default workflow;
