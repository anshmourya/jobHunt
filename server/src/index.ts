import "dotenv/config";
import express from "express";
import cors from "cors";
import axios from "axios";
import connectDB from "./config/db";
import Job from "./models/job";
import path from "path";
import puppeteer from "puppeteer";
import { resumeBuilderWorkflow } from "./tools";
import { getUnreadMessages } from "./telegram";
import { resumeData } from "./helper/constant";
import { scrapper } from "./tools/scrapper";
const app = express();
app.use(cors());
app.use(express.json());
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Health check
app.get("/health", (req, res) => {
  res.send("OK");
});

// Ping endpoint
app.get("/ping", (req, res) => {
  res.send("OK");
});

const PORT = process.env.PORT ?? 5001;

const keepServerAlive = () => {
  // Array of endpoints to ping
  const endpoints = ["/health", "/ping"];

  // Random interval between 4-5 minutes (avoiding exact 5-minute intervals)
  const getRandomInterval = () => 4 * 60 * 1000 + Math.random() * (60 * 1000);

  // Ping random endpoint
  const pingServer = () => {
    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    const serverUrl = process.env.SERVER_URL ?? "http://localhost:5001";

    axios.get(`${serverUrl}${endpoint}`).catch((error) => {
      console.log(`Keep-alive request to ${endpoint} failed:`, error.message);
    });

    // Schedule next ping with random interval
    setTimeout(pingServer, getRandomInterval());
  };

  // Start the first ping
  pingServer();
};

app.get("/resume-view", (req, res) => {
  res.render("resume", { resume: resumeData });
});

//return all job
app.get("/jobs", async (req, res) => {
  try {
    const jobs = await Job.find().sort({ createdAt: -1 });
    res.json(jobs);
  } catch (error) {
    console.log(error);
    res.status(500).json(error);
  }
});

//return resume
app.get("/resume-builder", async (req, res) => {
  try {
    const keywords = (req.query.keywords as string).split(",");

    const resume = await resumeBuilderWorkflow.invoke({
      resumeData,
      keywords: keywords,
    });

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    // Render the EJS template to HTML string
    const html = await new Promise<string>((resolve, reject) => {
      app.render("resume", { resume: resume.result }, (err, html) => {
        if (err) reject(err);
        else resolve(html);
      });
    });

    await page.setContent(html);

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "0.5in",
        bottom: "0.5in",
        left: "0.5in",
        right: "0.5in",
      },
      scale: 1.0, // use 1.0 for full size — scale < 1 may create extra blank space
    });

    await browser.close();

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

const server = app.listen(PORT, () => {
  connectDB().then(() => {
    console.log("MongoDB connected");
  });
  console.log(`Server is running on port ${PORT}`);
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

// keepServerAlive();

// getUnreadMessages(["TechUprise_Updates", "jobs_and_internships_updates"]).then(
//   (res) => console.log(res)
// );

// scrapper(
//   "Find a Node.js job posted today on Indeed and extract title + apply link"
// ).then((res) => console.log(res));
