export const jobPostPrompt = `As an expert data extractor, your task is to analyze a given job description and output a JSON object with four keys: "keywords", "important_details", "additional_info", and "summary".

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
""" JOB_DESCRIPTION_HERE """`;
