import "dotenv/config";
import express from "express";
import cors from "cors";
import axios from "axios";
import connectDB from "./config/db";
import Job from "./models/job";
import path from "path";
import { getSummary } from "./tools";
import { resumeData } from "./helper/constant";
import {
  generateResume,
  getJsonResume,
  setProfilePercentage,
  upload,
} from "./helper/utils";
import { uploadResumeToSupabase } from "./config/supabase";
import { clerkMiddleware, getAuth, requireAuth } from "@clerk/express";
import "./corn/index";
import { getUnreadMessages } from "./telegram";
import { Poppler } from "node-poppler";
import User from "./models/user";
import console from "console";

const poppler = new Poppler();
const app = express();
app.use(cors());
app.use(express.json());
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(clerkMiddleware());

import userRoutes from "./routes/user";
import { scrapper } from "./tools/scrapper";
import { emailBuilder } from "./tools/email";
import { getStealthPage, navigateWithStealth } from "./browser";
import { linkedin } from "./tools/linkedin";

app.use("/v1/users", userRoutes);

const PORT = process.env.PORT ?? 5001;

const keepServerAlive = () => {
  console.log("Initializing keep-alive mechanism...");
  // Array of endpoints to ping
  const endpoints = ["/health", "/keep-alive"];

  // Random interval between 4-5 minutes (avoiding exact 5-minute intervals)
  const getRandomInterval = () => 4 * 60 * 1000 + Math.random() * (60 * 1000);

  // Ping random endpoint
  const pingServer = () => {
    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    const serverUrl = process.env.SERVER_URL ?? `http://localhost:${PORT}`;

    console.log(
      `Pinging ${serverUrl}${endpoint} at ${new Date().toISOString()}`
    );

    axios
      .get(`${serverUrl}${endpoint}`)
      .then(() => {
        console.log(`Successfully pinged ${endpoint}`);
      })
      .catch((error) => {
        console.error(
          `Keep-alive request to ${endpoint} failed:`,
          error.message
        );
      });

    // Schedule next ping with random interval
    setTimeout(pingServer, getRandomInterval());
  };

  // Start the first ping
  pingServer(); //
};

app.get("/keep-alive", (req, res) => {
  res.send("OK");
});

app.get("/health", (req, res) => {
  res.send("OK");
});

app.get("/resume-view", (req, res) => {
  res.render("resume", { resume: resumeData });
});

app.post("/jd-resume", requireAuth(), async (req, res) => {
  try {
    const { jobDescription } = req.body;
    const userId = getAuth(req).userId;
    if (!jobDescription || jobDescription.trim() === "") {
      return res.status(400).json({ message: "Job description is required" });
    }

    //make job description lowercase
    const jobDescriptionLower = jobDescription.toLowerCase();

    const extractedData = await getSummary(jobDescriptionLower);

    if (!extractedData?.keywords || extractedData?.keywords.length === 0) {
      return res.status(500).json({ message: "Failed to generate resume" });
    }

    const pdfBuffer = await generateResume(userId!, extractedData.keywords);

    if (!pdfBuffer) {
      return res.status(500).json({ message: "Failed to generate resume" });
    }

    // Create a Blob from the Buffer
    const blob = new Blob([pdfBuffer.buffer], { type: "application/pdf" });
    const file = new File([blob], "resume.pdf", { type: "application/pdf" });

    // Upload PDF to Supabase
    const data = await uploadResumeToSupabase(file);

    const url = `${process.env.SUPABASE_URL}/storage/v1/object/public/${process.env.SUPABASE_BUCKET}/${data?.path}`;

    return res.json({
      message: "Resume generated successfully",
      data: {
        url,
        path: data?.path,
        downloadUrl: `${url}?download`,
        company: extractedData.company_name ?? "Unknown",
        position: extractedData.position ?? "Unknown",
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json(error);
  }
});

//return all job
app.get("/jobs", requireAuth(), async (req, res) => {
  try {
    const jobs = await Job.find().sort({ createdAt: -1 });
    console.log("Jobs found:", jobs.length);
    res.json(jobs);
  } catch (error) {
    res.status(500).json(error);
  }
});

//return resume
app.get("/resume-builder", requireAuth(), async (req, res) => {
  try {
    const keywords = (req.query.keywords as string).split(",");
    const userId = getAuth(req).userId;
    const pdfBuffer = await generateResume(userId!, keywords);

    if (!pdfBuffer) {
      return res.status(500).json({ message: "Failed to generate resume" });
    }

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline; filename=resume.pdf",
    });

    res.end(pdfBuffer);
  } catch (error) {
    console.log(error);
    res.status(500).json(error);
  }
});

//update job status
app.put("/update-job-status", async (req, res) => {
  try {
    const { status, job_id } = req.query;
    const updatedJob = await Job.findByIdAndUpdate(job_id, { status });
    if (!updatedJob) {
      return res.status(404).json({ message: "Job not found" });
    }
    return res.json(updatedJob);
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
});

//extract data from resume pdf
app.post(
  "/extract-resume-image",
  requireAuth(),
  upload.single("resume"),
  async (req, res) => {
    try {
      const { file } = req;

      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const resumeData = await getJsonResume(file);

      if (!resumeData) {
        return res.status(400).json({ error: "Failed to extract resume data" });
      }

      return res.json({
        message: "Success.",
        data: resumeData,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to convert PDF to image" });
    }
  }
);

// Make profile from resume
app.post(
  "/make-profile",
  requireAuth(),
  upload.single("resume"),
  async (req, res) => {
    try {
      const { file } = req;
      const userId = getAuth(req).userId;

      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Extract resume data
      const resumeData = await getJsonResume(file);
      if (!resumeData) {
        return res.status(400).json({ error: "Failed to extract resume data" });
      }

      // Find or create user
      let user = await User.findOne({ clerkId: userId });
      let percentage = setProfilePercentage(resumeData);

      if (!user) {
        // Create new user if doesn't exist
        user = new User({
          clerkId: userId,
          ...resumeData,
          profileCompletedPercentage: percentage,
        });
      } else {
        // Update existing user
        user.set({
          ...resumeData,
          profileCompletedPercentage: percentage,
        });
      }

      await user.save();

      return res.json({
        message: "Profile updated successfully",
        data: user,
      });
    } catch (err) {
      console.error("Error in make-profile:", err);
      return res.status(500).json({
        error: "Failed to process profile",
        details: (err as Error).message,
      });
    }
  }
);

// app.listen(PORT, () => {
//   connectDB().then(() => {
//     console.log("MongoDB connected");
//     console.log("Keep-alive mechanism started");
//   });
//   console.log(`Server is running on port ${PORT}`);
// });

// agentQL(
//   "click on the first person name ansh mourya and send the connection request"
// ).then((res) => {
//   console.log("linkedin ops completed", res);
// });

linkedin(
  "search for ansh mourya and open the profile page of first person"
).then((res) => {
  console.log("linkedin ops completed", res);
});

//--- AGENT SETUP ---

// const tools = [
//   initializePageTool,
//   loginToLinkedInTool,
//   searchTool,
//   navigateToUrlTool,
//   searchQueryPreprationTool,
//   saveSessionTool,
//   // agentQL,
//   retrunPageDataInMarkdownTool,
// ];

// export const linkedin = async (query: string) => {
//   try {
//     const SYSTEM_MESSAGE = `
//     You are a LinkedIn automation agent. Your job is to perform actions on LinkedIn based on the given query.

// Available tools:
// - initializePageTool: Initialize a new browser page for LinkedIn automation
// - loginToLinkedInTool: Login to LinkedIn with credentials
// - searchTool: Search for people, companies, or content
// - navigateToUrlTool: Navigate to a specific LinkedIn URL
// - searchQueryPreparationTool: Prepare and optimize search queries
// - saveSessionTool: Save current session state and data
// - agentQL: Perform actions on LinkedIn based on the given query
// - retrunPageDataInMarkdownTool: Return page data in markdown format

//     Guidelines:
// 1. Always initialize the page before performing any LinkedIn actions
// 2. Use searchQueryPreparationTool to optimize queries before searching
// 3. Handle errors gracefully and provide clear feedback
// 4. Be respectful of LinkedIn's terms of service and rate limits

// examples:
// query: "search for people named Ansh Mourya and return results of first person"
// output: initializePageTool() -> loginToLinkedInTool() -> searchQueryPreparationTool() -> searchTool() -> agentQL("click on first person name ansh mourya") -> retrunPageDataInMarkdownTool()
//     `;

//     const prompt = ChatPromptTemplate.fromMessages([
//       ["system", SYSTEM_MESSAGE],
//       ["human", "{query}"],
//     ]);

//     const agent = createReactAgent({
//       llm: functionModel,
//       tools,
//       prompt,
//     });

//     const result = await agent.invoke({
//       messages: [new HumanMessage(query)],
//     });
//     return result.messages;
//   } catch (error: unknown) {
//     console.error("Scraper error:", error);
//     throw error;
//   }
// };
