import { Ollama } from "ollama";
import { summaryModel } from "./ollama";
import { retry } from "../tools";
const client = new Ollama({
  host: "localhost",
});

const system_prompt = `
Extract job details from Telegram messages to JSON:

{
 isValidJob: true or false,
 jobs:[{  "companyName": "company name or null",
  "position": "job title or null", 
  "experience": "years/level or null",
  "package": "salary/compensation or null",
  "location": "job location or null",
  "qualifications": "education/skills or null",
  "applyLink": "application URL or null",
  "email": "contact email or null",
  "batchYear": "graduation years or null",
  "deadline": "application deadline or null"}]
}

Rules:
1. if the job description is look like it's not the job description then return {isValidJob: false}

Message:
""" MESSAGE_HERE """

Return JSON only.
`;

const parseJobPosting = async (message: string) => {
  return retry(
    async () => {
      try {
        const prompt = system_prompt.replace("MESSAGE_HERE", message);
        const response = await summaryModel.invoke(prompt, {
          response_format: {
            type: "json_object",
          },
        });

        if (!response) {
          throw new Error("No content returned from Ollama");
        }

        // Parse the JSON response
        return typeof response.content === "string"
          ? JSON.parse(response.content)
          : response.content;
      } catch (error) {
        console.error("Error parsing job posting:", error);
        return null;
      }
    },
    2,
    1000,
    true
  );
};

export { parseJobPosting };
