export const jobPostPrompt = `
Parse job to JSON:
{"company_name":"","position":"","keywords":["keyword should be skills, tools, technologies, and frameworks"],"important_details":[],"additional_info":{},"summary":""}


JOB_DESCRIPTION_HERE`;

export const generateResumeJson = `
You are an expert resume optimizer. Generate an ATS-friendly resume JSON that:
1. Maintains original structure and field names
2. Integrates keywords: """KEYWORDS_HERE"""
3. Ensures ATS compliance
4. Preserves content integrity

Original Resume:
"""RESUME_DATA_HERE"""

Return optimized JSON only.`;

export const qualityCheckPrompt = `Check resume quality. Return:
{"integrity_passed":true,"ats_passed":true,"keyword_passed":true,"issues":[]}
Original: ACTUAL_RESUME_HERE
Generated: GENERATED_RESUME_HERE
Keywords: KEYWORDS_LIST_HERE`;

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
