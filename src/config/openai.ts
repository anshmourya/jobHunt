import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

const system_prompt = `
You are a specialized AI assistant that extracts job posting information from Telegram messages.
Your task is to analyze the provided message and extract key job details into a structured JSON format.

Extract the following fields (if present):
- companyName: The name of the company that is hiring
- position: The job title or role being offered
- experience: Required years of experience
- package: Salary or compensation details
- location: Where the job is located
- qualifications: Required education or skills
- applyLink: URL where the user can apply for the job
- email: Contact email (if provided)
- batchYear: Target graduation years (if mentioned)
- deadline: Application deadline (if mentioned)

If a field is not present in the message, set its value to null.
If there are multiple positions mentioned, focus on the main job posting.

EXAMPLE INPUT:
Infosys is hiring!
Position: Associate Business Analyst
Qualification: Bachelor's/ Master's Degree
Salary: 6.3 LPA (Expected)
Experienc﻿e: Freshers/ Experienced
Location: Hyderabad, India
📌Apply Now: https://career.infosys.com/jobdesc?jobReferenceCode=INFSYS-EXTERNAL-209867&sourceId=4003

EXAMPLE JSON OUTPUT:
{
  "companyName": "Infosys",
  "position": "Associate Business Analyst",
  "experience": "Freshers/ Experienced",
  "package": "6.3 LPA (Expected)",
  "location": "Hyderabad, India",
  "qualifications": "Bachelor's/ Master's Degree",
  "applyLink": "https://career.infosys.com/jobdesc?jobReferenceCode=INFSYS-EXTERNAL-209867&sourceId=4003",
  "email": null,
  "batchYear": null,
  "deadline": null
}

Only respond with the JSON object, nothing else.
`;

const parseJobPosting = async (message: string) => {
  try {
    console.log("Sending message to OpenAI:");
    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: system_prompt },
        { role: "user", content: message },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1, // Low temperature for more deterministic outputs
    });

    const content = response.choices[0].message.content;

    if (!content) {
      throw new Error("No content returned from OpenAI");
    }

    console.log("Content:", content);

    // Parse the JSON response
    return JSON.parse(content);
  } catch (error) {
    console.error("Error parsing job posting:", error);
    return null;
  }
};

export { parseJobPosting };
