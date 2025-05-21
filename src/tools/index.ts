import { summaryModel } from "../config/ollama";
import { task, entrypoint } from "@langchain/langgraph";
import Job from "../models/job";
import puppeteer from "puppeteer";

//job post extractor
const jobPostExtractor = task("jobPostExtractor", async (link: string) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(link, { waitUntil: "networkidle0" });
  const jobPost = await page.evaluate(() => document.body.innerText);
  await browser.close();
  return jobPost;
});

//summary tool
const summary = task("summary", async (input: string) => {
  const message = `As an expert data extractor, your task is to analyze a given job description and output a JSON object with four keys: "keywords", "important_details", "additional_info", and "summary".

Guidelines:
1. company name: Extract the company name from the job description.
2. position: Extract the job title or role being offered.
3. Keywords: Extract the top 5–10 skills or terms mentioned in the job description make sure to extract the skills and terms that are relevant to the job description which can be used for the resume matching.
4. Important Details: Identify critical requirements such as years of experience, certifications, or degrees mentioned in the job description.
5. Additional Info: Include any other relevant metadata such as job location, salary hints, company values, etc.
6. Summary: Provide a concise (2–3 sentence) plain-language summary of the overall role and its purpose.

Ensure the response is formatted as valid JSON and includes no extra text or markdown.

Example input job description: 

"We are looking for a skilled Frontend Developer with expertise in JavaScript, React, and HTML5. Candidates should have at least 3 years of experience in a similar role, a Bachelor's degree in Computer Science or related field, and familiarity with Agile methodologies. Our company values innovation and remote work options are available."

Expected output:
{ "company_name": "TechUprise", "position": "Frontend Developer", "keywords":["Frontend Developer","JavaScript","React","HTML5","Agile methodologies"],"important_details":["3 years of experience","Bachelor's degree in Computer Science"],"additional_info":{"location":"Remote","company values":"innovation"},"summary":"This role is for a Frontend Developer with at least 3 years of experience in JavaScript, React, and HTML5, focused on building interactive user interfaces."}

Please submit the job description surrounded by triple quotes below for analysis.
""" ${input} """`;
  const result = await summaryModel.invoke(message);
  const content =
    typeof result.content === "string"
      ? result.content
      : JSON.stringify(result.content);
  return JSON.parse(content);
});

//push to the database
const pushToDatabase = task("pushToDatabase", async (data: any) => {
  try {
    const job = new Job(data);
    await job.save();
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
});

//entrypoint
const workflow = entrypoint("jobPostExtractor", async (link: string) => {
  //time taken for each step in ms
  const startTime = Date.now();
  const jobPost = await jobPostExtractor(link);
  console.log(
    "----- jobPostExtractor ----",
    Date.now() - startTime + "ms",
    jobPost
  );
  const result = await summary(jobPost);
  console.log("----- summary ----", Date.now() - startTime + "ms", result);
  const isSaved = await pushToDatabase(result);
  console.log(
    "----- pushToDatabase ----",
    Date.now() - startTime + "ms",
    isSaved
  );
  return {
    isSaved,
    result,
    timeTaken: Date.now() - startTime + "ms",
  };
});

export default workflow;
