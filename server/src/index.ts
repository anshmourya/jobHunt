import "dotenv/config";
import express from "express";
import cors from "cors";
import axios from "axios";
import connectDB from "./config/db";
import Job from "./models/job";
import path from "path";
import puppeteer from "puppeteer";
import fs from "fs";
import { resumeBuilder, resumeBuilderWorkflow } from "./tools";
import { getUnreadMessages } from "./telegram";
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

const resumeData = {
  textSize: "11px",
  name: "Ansh Mourya",
  title: "Full Stack Developer",
  email: "anshmourya657@gmail.com",
  phone: "9167220139",
  location: "Mumbai, Maharashtra",
  links: {
    github: "https://github.com/anshmourya",
    linkedin: "https://www.linkedin.com/in/ansh-mourya-8504b122a/",
    twitter: "https://twitter.com/Ansh__Mourya",
    portfolio: "https://bento.me/anshmourya",
  },
  summary:
    "Two years plus of Full Stack Engineer Experience in MERN stack. Demonstrated ability to develop efficient, secure, and user-friendly front-end applications. I am looking to expand my skillset in the full-stack development role.",
  experience: [
    {
      role: "Full Stack Developer",
      company: "Levitation Infotech",
      location: "Noida, UP",
      duration: "02/2024 - Present",
      points: [
        "Led the entire project from scratch, managing client interactions and requirements effectively.",
        "Designed and developed a scalable website ecosystem for artworks and artists.",
        "Successfully migrated data worth ₹1 crore from SQL to NoSQL databases, ensuring data integrity and performance.",
      ],
    },
    {
      role: "Software Developer Intern",
      company: "Javeo-Traveller",
      location: "Mumbai, Maharashtra",
      duration: "09/2023 - 02/2024",
      points: [
        "Architected and executed the development of a dynamic tourism website, leveraging React, Node.js, and MongoDB, resulting in a 40% increase in user engagement and a 25% boost in conversion rate.",
        "Conducted bug fixing and code refactoring.",
        "Optimized webpage rendering speed by 70% and implemented automated builds, leading to a 25% improvement in development velocity.",
      ],
    },
    {
      role: "Full Stack Developer (Freelance)",
      company: "SpineHealth",
      location: "Mumbai, Maharashtra",
      duration: "08/2023 - 09/2023",
      points: [
        "Developed dynamic websites using HTML, CSS, JavaScript, and React, resulting in a 25% increase in customer engagement.",
        "Developed RESTful API services using ASP.NET Core and Node.js.",
        "Created a patient-centered web app for tracking and feedback, reducing response time by 39%.",
      ],
    },
    {
      role: "Frontend Developer (Freelance)",
      company: "4thwallstudios",
      location: "Mumbai, Maharashtra",
      duration: "08/2023 - 08/2023",
      points: [
        "Developed a highly optimized website with interactive components, leading to a 40% increase in customer retention and a 15% revenue boost.",
      ],
    },
  ],
  projects: [
    {
      title: "AI-Powered TODO Assistant CLI",
      link: "https://github.com/anshmourya/ollama",
      duration: "May 2025 – Present",
      points: [
        "Built a TypeScript/Node.js CLI TODO assistant with Express and Ollama's gemma:2b, using a START→PLAN→ACTION→OBSERVATION→OUTPUT workflow.",
        "Implemented modular CRUD tools with refined prompts and error handling, cutting user retries by 30%.",
      ],
    },
    {
      title: "Swing - A Food Website",
      link: "https://swinggg.netlify.app/",
      duration: "June 2023 - July 2023",
      points: [
        "Skills: ReactJS, Stripe Integration, Google Auth, Passport JS.",
        "Created a food website (Swing) with an advanced filter and secure Stripe payment.",
        "Implemented Google Auth and Passport JS for user safety.",
        "Simplified food discovery and ordering process.",
        "Achieved a delightful dining experience for users.",
      ],
    },
    {
      title: "Attendance Tracking Website",
      duration: "February 2023 - March 2023",
      points: [
        "Built attendance-taking web platform using React, Express, and MySQL.",
        "Teachers can take attendance and view students.",
        "Students can track attendance and progress.",
        "Automated attendance reduced teachers' time by 30%.",
      ],
    },
  ],
  education: [
    {
      degree: "BSc in Information Technology",
      institution: "Prahladrai Dalmia Lions College",
      location: "Mumbai, Maharashtra",
      year: "03/2024",
    },
  ],
  technical: {
    frontend: [
      "HTML",
      "CSS",
      "Tailwind",
      "JavaScript",
      "React",
      "Next.js",
      "shadCN",
    ],
    backend: ["NodeJs", "ExpressJs"],
    database: ["MongoDB", "Chromadb", "PostgreSQL"],
    tools: [
      "Git",
      "GitHub",
      "Langchain",
      "Langraph",
      "Ollama",
      "AWS",
      "Digital Ocean",
      "Dockploy",
    ],
  },
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

// keepServerAlive();

// getUnreadMessages(["TechUprise_Updates", "jobs_and_internships_updates"]).then(
//   (res) => console.log(res)
// );

// workflow
//   .invoke(
//     "https://gxs.wd3.myworkdayjobs.com/GRXST/job/Bangalore-India/Software-Engineering-Internship_R-2025-05-101458"
//   )
//   .then((res) => console.log(res));
