import "dotenv/config";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

// Create a JWT client using the service account credentials
const serviceAccountAuth = new JWT({
  email: process.env.GOOGLE_SERVICE_EMAIL,
  // The API key is not the right credential for JWT authentication
  // We need a private key, which should be in your .env file
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"), // Replace escaped newlines
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

// Initialize the Google Spreadsheet
const doc = new GoogleSpreadsheet(
  process.env.GOOGLE_SHEET_ID as string,
  serviceAccountAuth
);

// Initialize the document and create sheet if needed
const initializeSheet = async () => {
  try {
    // Load the document properties and sheets
    await doc.loadInfo();

    // Check if our sheet exists, create it if not
    let sheet = doc.sheetsByTitle["jobAnsh"];
    if (!sheet) {
      console.log("Creating new sheet 'jobAnsh'");
      sheet = await doc.addSheet({
        title: "jobAnsh",
        headerValues: [
          "companyName",
          "position",
          "experience",
          "package",
          "location",
          "qualifications",
          "applyLink",
          "email",
          "batchYear",
          "deadline",
          "source",
          "messageDate",
        ],
      });
    }

    return sheet;
  } catch (error) {
    console.error("Error initializing Google Sheet:", error);
    throw error;
  }
};

// Add a job posting to the sheet
const addJobToSheet = async (jobData: any[]) => {
  try {
    const sheet = await initializeSheet();

    // Handle both single job object and array of jobs
    const jobsArray = Array.isArray(jobData) ? jobData : [jobData];

    if (jobsArray.length === 0) {
      console.log("No job data to add to sheet");
      return true;
    }

    // Get all existing rows to check for duplicates
    const existingRows = await sheet.getRows();
    const existingLinks = existingRows.map((row) => row.get("applyLink"));

    // Filter out jobs that already exist in the sheet based on applyLink
    const newJobs = jobsArray.filter((job) => {
      const applyLink = job.applyLink || "";
      if (!applyLink) return true; // Keep jobs without links

      const isDuplicate = existingLinks.includes(applyLink);
      if (isDuplicate) {
        console.log(`Skipping duplicate job with link: ${applyLink}`);
      }
      return !isDuplicate;
    });

    if (newJobs.length === 0) {
      console.log("All jobs already exist in the sheet");
      return true;
    }

    //sanitize array
    const rows = newJobs.map((data) => ({
      companyName: data.companyName || "",
      position: data.position || "",
      experience: data.experience || "",
      package: data.package || "",
      location: data.location || "",
      qualifications: data.qualifications || "",
      applyLink: data.applyLink || "",
      email: data.email || "",
      batchYear: data.batchYear || "",
      deadline: data.deadline || "",
      source: data.source || "",
      messageDate: data.messageDate || new Date().toISOString(),
    }));

    // Add the job data as rows
    await sheet.addRows(rows);
    console.log(`Added ${rows.length} new job(s) to the sheet`);
    return true;
  } catch (error) {
    console.error("Error adding job to sheet:", error);
    return false;
  }
};

export { doc, initializeSheet, addJobToSheet };
