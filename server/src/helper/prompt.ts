export const jobPostPrompt = `
Extract key job information for ATS optimization. Return ONLY valid JSON:

{
  "company_name": "string",
  "position": "string", 
  "keywords": ["8-12 ATS keywords from job description"],
  "important_details": ["5-8 key requirements/responsibilities"],
  "additional_info": {
    "experience_level": "Entry/Junior/Mid/Senior/Executive",
    "employment_type": "Full-time/Part-time/Contract/Remote",
    "location": "string",
    "salary_range": "string (if mentioned)",
    "benefits": ["array"],
    "company_size": "Startup/Small/Medium/Large",
    "industry": "string"
  },
  "summary": "1-2 sentence role overview"
}

KEYWORD RULES:
- Extract exact terms from job description (case-sensitive)
- Prioritize: tech skills, tools, frameworks, methodologies
- Include both technical (React, AWS) and soft skills (Leadership, Agile)
- Use 1-3 words max per keyword
- Focus on terms mentioned multiple times

IMPORTANT DETAILS:
- Extract must-have requirements and key responsibilities
- Include experience years, education, certifications
- Use action-oriented language
`;

export const generateResumeJson = `
You are an expert resume optimizer specializing in ATS (Applicant Tracking System) optimization. Generate a well-structured JSON resume that maximizes ATS compatibility while maintaining readability and professional quality.

## Instructions:

1. **Structure Preservation**: Maintain the exact JSON structure and field names from the original resume data
2. **Keyword Integration**: Seamlessly integrate the provided keywords into relevant sections without keyword stuffing
3. **ATS Optimization**: Ensure compliance with ATS standards by:
   - Using standard section headers and field names
   - Avoiding special characters that might cause parsing issues
   - Maintaining consistent formatting throughout
   - Using action verbs and quantifiable achievements
4. **Content Integrity**: Preserve all essential information while enhancing clarity and impact
5. **Professional Quality**: Ensure the resume reads naturally and maintains professional tone

## Keyword Integration Guidelines:
- Integrate keywords naturally into job descriptions, skills, and summary
- Prioritize relevance over frequency
- Use variations and synonyms where appropriate
- Avoid awkward phrasing or obvious keyword stuffing

## ATS Best Practices:
- Use standard date formats (MM/YYYY or MM/DD/YYYY)
- Include relevant technical skills in a dedicated section
- Use consistent bullet point formatting
- Ensure proper JSON escaping for special characters
- Include quantifiable achievements and metrics where possible

## Output Requirements:
Return ONLY valid JSON without any additional text, comments, or formatting. The JSON should be properly escaped and ready for direct parsing.`;

export const qualityCheckPrompt = `Check resume quality. Return:
{"integrity_passed":true,"ats_passed":true,"keyword_passed":true,"issues":[]}
Original: ACTUAL_RESUME_HERE
Generated: GENERATED_RESUME_HERE
Keywords: KEYWORDS_LIST_HERE

Retrun only JSON
`;

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

Return only JSON
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

Return only JSON
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

Return only JSON
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

Return only JSON`;

export const extractResumeDataFromPdfPrompt = `
You are an expert in extracting and structuring resume data from PDFs. Extract the following information from the provided resume and format it into a clean JSON structure.

## Data to Extract:
1. **Personal Information**
   - Full name (required)
   - Professional title/headline
   - Email address (required)
   - Phone number (required)
   - Location (city, country)
   - Relevant links (LinkedIn, GitHub, portfolio, etc.) 

2. **Professional Summary**
   - 3-5 sentence professional overview
   - Key skills and expertise
   - Career highlights

3. **Work Experience**
   For each position include:
   - Job title
   - Company name
   - Location (city, country)
   - Employment dates (MM/YYYY - MM/YYYY or Present)
   - 3-5 bullet points of key achievements and responsibilities

4. **Education**
   For each degree/certification:
   - Degree/Qualification
   - Institution name
   - Location
   - Graduation year (or expected)
   - Relevant coursework or achievements (if any)

5. **Technical Skills**
   Categorize into:
   - Frontend (frameworks, libraries)
   - Backend (languages, frameworks)
   - Databases
   - DevOps &amp; Tools
   - Other technologies

6. **Projects** (if applicable)
   - Project name
   - Technologies used
   - Your role and contributions
   - Project URL (if available)
   - Project duration
   - Project achievements

## Output Format:
Return a clean JSON object with the following structure. Include only the fields that have data.

## Rules:
1. Maintain original content meaning but clean up formatting
2. Use consistent date formats (MM/YYYY)
3. Remove any sensitive information
4. If a section is not present in the resume, omit it from the JSON
5. For skills, remove duplicates and standardize capitalization
6. For work experience, list in reverse chronological order
7. For education, include only post-secondary education unless specified otherwise
8. stick to given format only. do not add any extra fields.

## Example Output Format:
\`\`\`json
{
  "personalInfo": {
    "name": "John Doe",
    "title": "Senior Software Engineer",
    "email": "john.doe@example.com",
    "phone": "+1 (555) 123-4567",
    "location": "San Francisco, CA, USA",
    "title": "Senior Software Engineer",
    "links": {
      "linkedin": "linkedin.com/in/johndoe",
      "github": "github.com/johndoe"
    }
  },
  "summary": "Experienced software engineer with 5+ years of full-stack development...",
  "experience": [
    {
      "title": "Senior Software Engineer",
      "company": "Tech Corp Inc.",
      "location": "San Francisco, CA",
      "duration": "01/2020 - Present",
      "achievements": [
        "Led a team of 5 developers to deliver...",
        "Optimized application performance by 40%..."
      ]
    }
  ],
  "education": [
    {
      "degree": "B.S. in Computer Science",
      "institution": "Stanford University",
      "location": "Stanford, CA",
      "year": 2018,
      "achievements": [
        "Led a team of 5 developers to deliver...",
        "Optimized application performance by 40%..."
      ]
    }
  ],
  "skills": {
    "frontend": ["React", "TypeScript", "Next.js"],
    "backend": ["Node.js", "Python", "Java"],
    "databases": ["MongoDB", "PostgreSQL"],
    "devops": ["Docker", "AWS", "Kubernetes"],
    "tools": ["Git", "Jira", "VS Code"]
  },
  "projects": [
    {
      "name": "Portfolio Website",
      "technologies": ["Next.js", "TypeScript", "Tailwind CSS"],
      "url": "https://johndoe.dev",
      "duration": "01/2020 - Present",
      "achievements": ["Led a team of 5 developers to deliver...", "Optimized application performance by 40%..."],
    }
  ]
}
\`\`\`

Extract and structure the resume data according to the format above. Return only the JSON object with no additional text or explanation.`;

export const RESUME_VALIDATION_PROMPT = `CRITICAL: The previous extraction had validation errors. Use the detailed error context below to make precise corrections:

1. Check each missing field and extract it from the resume image
2. Ensure proper data types (strings, arrays, objects)
3. Validate email formats, URLs, and required fields
4. Maintain the exact JSON structure expected

  required_json_structure: {
personalInfo: {
                        name: "string",
                        email: "string",
                        phone: "string",
                        location: "string",
                        title: "string",
                        links: "object?",
                      },
                      summary: "string (min 10 chars)",
                      experience: [
                        {
                          title: "string",
                          company: "string",
                          location: "string?",
                          duration: "string?",
                          achievements: "string[]?",
                        },
                      ],
                      education: [
                        {
                          degree: "string",
                          institution: "string",
                          location: "string?",
                          year: "string?",
                          achievements: "string[]?",
                        },
                      ],
                      skills: "object",
                      projects: [
                        {
                          name: "string",
                          technologies: "string[]",
                          url: "string?",
                          duration: "string?",
                          achievements: "string[]?",
                        },
                      ],
                    },

Focus on these specific issues and fix them accurately.

Return only JSON
`;
