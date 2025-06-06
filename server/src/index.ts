import "dotenv/config";
import express from "express";
import cors from "cors";
import axios from "axios";
import connectDB from "./config/db";
import Job from "./models/job";
import path from "path";
import { getSummary } from "./tools";
import { resumeData } from "./helper/constant";
import { generateResume, upload } from "./helper/utils";
import { uploadResumeToSupabase } from "./config/supabase";
// import "./corn/index";
import { getUnreadMessages } from "./telegram";
import {
  functionModel,
  getVisionCompletion,
  summaryModel,
} from "./config/ollama";
import { extractResumeDataFromPdfPrompt } from "./helper/prompt";
import fs from "fs";
import { Poppler } from "node-poppler";
const poppler = new Poppler();
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

app.post("/jd-resume", async (req, res) => {
  try {
    const { jobDescription } = req.body;

    if (!jobDescription || jobDescription.trim() === "") {
      return res.status(400).json({ message: "Job description is required" });
    }

    //make job description lowercase
    const jobDescriptionLower = jobDescription.toLowerCase();

    const extractedData = await getSummary(jobDescriptionLower);

    if (!extractedData?.keywords || extractedData?.keywords.length === 0) {
      return res.status(500).json({ message: "Failed to generate resume" });
    }

    const pdfBuffer = await generateResume(extractedData.keywords);

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
app.get("/jobs", async (req, res) => {
  try {
    const jobs = await Job.find().sort({ createdAt: -1 });
    console.log("Jobs found:", jobs.length);
    res.json(jobs);
  } catch (error) {
    res.status(500).json(error);
  }
});

//return resume
app.get("/resume-builder", async (req, res) => {
  try {
    const keywords = (req.query.keywords as string).split(",");
    console.log("Keywords:", keywords);

    const pdfBuffer = await generateResume(keywords);

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
app.post("/extract-resume-image", upload.single("resume"), async (req, res) => {
  try {
    const { file } = req;

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const pdfPath = path.join(__dirname, "temp.pdf");
    fs.writeFileSync(pdfPath, file.buffer);

    const outputDir = path.join(__dirname, "output");
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

    const outputFile = path.join(outputDir, "page");

    const options = {
      firstPageToConvert: 1,
      lastPageToConvert: 1,
      jpegFile: true,
    };

    // Use pdfToCairo with jpegFile: true to get JPEG output
    await poppler.pdfToCairo(pdfPath, outputFile, options);

    const imagePath = `${outputFile}-1.jpg`; // Poppler appends page number
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString("base64");

    // Clean up
    fs.unlinkSync(pdfPath);
    fs.unlinkSync(imagePath);

    const result = {
      image_base64: base64Image,
      data_url: `data:image/jpeg;base64,${base64Image}`,
    };

    //send to groq
    const groqResponse = await getVisionCompletion([
      {
        role: "system",
        content: extractResumeDataFromPdfPrompt,
      },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: result.data_url,
            },
          },
        ],
      },
    ]);

    return res.json({
      message: "Send this to Groq's multimodal model in image_url input.",
      data:
        typeof groqResponse.choices[0].message.content === "string"
          ? JSON.parse(groqResponse.choices[0].message.content)
          : groqResponse.choices[0].message.content,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to convert PDF to image" });
  }
});

keepServerAlive();

// getUnreadMessages(["TechUprise_Updates", "jobs_and_internships_updates"]).then(
//   (res) => console.log(res)
// );

// scrapper(
//   "Find a Node.js job posted today on Indeed and extract title + apply link"
// ).then((res) => console.log(res));

app.listen(PORT, () => {
  connectDB().then(() => {
    console.log("MongoDB connected");
  });
  console.log(`Server is running on port ${PORT}`);
});
