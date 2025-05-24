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



export const generateResumeJson = `
You are an expert resume generator. You will receive:

1. **MY RESUME JSON** (in the exact structure shown below)
2. **KEYWORDS** (a list of skills or terms to weave into the resume)

Your task is to output a new JSON object that:

- Uses exactly the same fields and structure as the provided MY RESUME JSON.
- Remains ATS-friendly (e.g. clear headings, standard field names).
- Inserts only the provided keywords, placing each in the most relevant existing field.
- Prioritizes the most critical keywords if there are many.
- Does **not** add, remove, or rename any fields.
- Does **not** alter any existing content meanings beyond integrating the keywords.

here is the resume json:
"""
RESUME_DATA_HERE
"""

here is the keywords:
"""
KEYWORDS_HERE
`

export const qualityCheckPrompt = `
You are an expert resume quality checker. You will receive three inputs in JSON format:

1. **ACTUAL_RESUME_JSON** — the original resume with the exact structure below.
2. **GENERATED_RESUME_JSON** — the AI-generated resume with the exact same structure.
3. **KEYWORDS_LIST** — an array of skill keywords to validate.

Your instruction is to produce a structured report that addresses the following checks:

1. **Content Integrity**: Verify that all fields and values in GENERATED_RESUME_JSON exactly match ACTUAL_RESUME_JSON, except for the insertion of keywords. No original details should be altered, added, or removed.
2. **ATS Compliance**: Confirm that the generated resume structure and field names remain ATS-friendly (e.g., clear headings, simple field names, no nested or extraneous properties).
3. **Keyword Usage**: Ensure each keyword in KEYWORDS_LIST appears in the most relevant section(s) of the generated resume (e.g., "skills", or contextually under "experience"). Prioritize essential keywords if there are too many.

Output must be a JSON object with the following shape:

{
  "integrityCheck": {
    "passed": boolean,
    "issues": [ /* list of mismatches or empty in case of no issues  */ ]
  },
  "atsCheck": {
    "passed": boolean,
    "issues": [ /* list of compliance issues in string format or empty in case of no issues */ ]
  },
  "keywordCheck": {
    "missingKeywords": [ /* keywords not found in the generated resume in string format or empty in case of no missing keywords */ ],
    "incorrectPlacement": [ /* keywords placed in wrong fields in string format or empty in case of no incorrect placement */ ]
    "passed": boolean,
  }
}


Here is the actual resume:
"""
ACTUAL_RESUME_HERE
"""

Here is the generated resume:
"""
GENERATED_RESUME_HERE
"""

Here is the keywords:
"""
KEYWORDS_LIST_HERE
"""

Do not include any additional fields or narrative text outside this JSON report.
`

export const atsFriendlyResolverPrompt = `
You are an expert ATS-friendly resume transformer. You will receive two inputs in JSON format:

1. **RESUME_JSON** — the resume to optimize in its exact structure.
2. **ISSUES_LIST** — an array of strings describing ATS compliance problems identified in the resume.

Your task is to return an updated JSON resume that:

1. Resolves all listed issues without changing any existing field names or data values.
2. Maintains the exact original structure (no added or removed properties).
3. Improves ATS compatibility by fixing formatting issues (e.g., flattening nested lists, standardizing headings, and ensuring keyword inclusion).
4. Ensures all ISSUE items are addressed directly in the updated JSON.

Output must be the corrected RESUME_JSON object only, with no extra commentary or fields.

Here is the resume json:
"""
RESUME_JSON_HERE
"""

Here is the issues list:
"""
ISSUES_LIST_HERE
"""
`;

export const keywordPlacementPrompt = `
You are an expert resume keyword placement resolver. You will receive three inputs in JSON format:

1. **RESUME JSON** — the AI-generated resume with the exact structure to verify.
2. **MISSING KEYWORDS** — an array of the keywords that were expected but not found in RESUME_JSON.
3. **INCORRECT PLACEMENT** — an array of the keywords found in the wrong section.

Rules:
1. Do not change any existing field names or data values in RESUME_JSON.
2. Do not add or remove any fields.
3. Do not alter any original content beyond repositioning misplaced keywords.
4. Only correct the placement of keywords and fill missing keywords in the most appropriate fields.

Your task is to output an updated resume JSON (the corrected RESUME_JSON) that:
- Includes all missingKeywords in the most relevant existing sections.
- Moves any incorrectly placed keywords to the correct sections.
- Preserves the exact original JSON structure and values otherwise.

Output the corrected JSON object only, with no additional commentary or fields.

Here is the resume json:
"""
RESUME_JSON_HERE
"""

Here is the missing keywords:
"""
MISSING_KEYWORDS_HERE
"""

Here is the incorrect placement:
"""
INCORRECT_PLACEMENT_HERE
"""
`;

export const integrityCheckPrompt = `
You are an expert resume integrity checker. You will receive two inputs in JSON format:

1. **RESUME_JSON** — the AI-generated resume in the exact structure to verify.
2. **ISSUES_LIST** — an array of strings describing integrity issues detected (e.g., missing keywords, incorrect placements).

Rules:
1. Do not change any existing field names or values.
2. Do not add or remove any fields.
3. Do not alter any original content meaning beyond resolving the listed issues.

Task:
Return a corrected JSON object (the updated RESUME_JSON) that:
- Inserts any missing fields or keywords indicated by ISSUES_LIST into the most relevant existing sections.
- Moves misplaced entries to their correct locations.
- Preserves the exact original JSON structure and all other values.

Output only the corrected RESUME_JSON object, with no additional commentary or fields.

Here is the resume json:
"""
RESUME_JSON_HERE
"""

Here is the issues list:
"""
ISSUES_LIST_HERE
"""
`;

export const aggregatePrompt = `
You are an expert resume aggregator. You will receive three complete resume JSON objects from prior checks:

1. **INTEGRITY_UPDATED_JSON** — the resume after integrity corrections.
2. **ATS_UPDATED_JSON** — the resume after ATS compliance adjustments.
3. **KEYWORD_UPDATED_JSON** — the resume after keyword placement fixes.

Each JSON has the exact same structure. Your task is to merge these three into one final, error-free resume JSON:

- Validate that all fields across the three inputs are identical in structure and values.
- For any discrepancies, prefer values from the most recent check in this order: integrity, ATS, keyword.
- Ensure the final resume JSON includes all corrections from each step without duplicates.
- Do not change field names, add or remove fields, or alter meanings.

Output only the single aggregated resume JSON object, with no additional commentary or fields.

Here is the integrity updated resume:
"""
INTEGRITY_UPDATED_RESUME_HERE
"""

Here is the ATS updated resume:
"""
ATS_UPDATED_RESUME_HERE
"""

Here is the keyword updated resume:
"""
KEYWORD_UPDATED_RESUME_HERE
"""
`;
