import puppeteer from "puppeteer";
import { resumeBuilderWorkflow } from "../tools";
import express from "express";
import path from "path";
import multer from "multer";
import fs from "fs";
import { getVisionCompletion } from "../config/ollama";
import { extractResumeDataFromPdfPrompt } from "../helper/prompt";
import { Poppler } from "node-poppler";
import User from "../models/user";

const poppler = new Poppler();
const app = express();
// Configure view engine and views directory
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../views"));
export const generateResume = async (clerkId: string, keywords: string[]) => {
  try {
    if (!keywords) {
      throw new Error("Invalid data");
    }
    const resumeData = await getResumeData(clerkId);
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

    return pdfBuffer;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export const getJsonResume = async (file: Express.Multer.File) => {
  try {
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

    const resumeData =
      typeof groqResponse.choices[0].message.content === "string"
        ? JSON.parse(groqResponse.choices[0].message.content)
        : groqResponse.choices[0].message.content;
    console.log(resumeData);
    return resumeData;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export const upload = multer({ storage: multer.memoryStorage() });

//get resume data from the user profile
export const getResumeData = async (clerkId: string) => {
  try {
    const user = await User.findOne({ clerkId });

    if (!user) {
      throw new Error(`User with clerkId ${clerkId} not found`);
    }

    const {
      _id,
      profileCompletedPercentage,
      createdAt,
      updatedAt,
      __v,
      ...resumeData
    } = user.toObject();

    let result = {
      name: resumeData.personalInfo?.name,
      email: resumeData.personalInfo?.email,
      phone: resumeData.personalInfo?.phone,
      location: resumeData.personalInfo?.location,
      title: resumeData.personalInfo?.title,
      summary: resumeData.summary,
      experience: resumeData.experience,
      education: resumeData.education,
      skills: resumeData.skills,
      projects: resumeData.projects,
    };

    return result;
  } catch (error) {
    console.error("Error in getResumeData:", error);
    throw error;
  }
};

//set profile percentage
//set profile percentage
export const setProfilePercentage = (profile: any): number => {
  try {
    const weights = {
      personalInfo: {
        name: 8,
        email: 8,
        phone: 4,
        location: 4,
        title: 4,
      },
      summary: 10,
      experience: {
        hasEntries: 10,
        perEntry: 5, // Max 2 entries (10 points)
        hasAchievements: 5, // Per experience entry
      },
      education: {
        hasEntries: 10,
        perEntry: 5, // Max 2 entries (10 points)
        hasAchievements: 3, // Per education entry
      },
      skills: {
        hasSkills: 10,
        perCategory: 3, // Max 3 categories (9 points)
        perSkill: 0.5, // Max 5 skills per category (7.5 points)
      },
      projects: {
        hasProjects: 10,
        perProject: 5, // Max 2 projects (10 points)
      },
    };

    let percentage = 0;

    // Personal Info (Max 28%)
    if (profile.personalInfo) {
      const { name, email, phone, location, title } = weights.personalInfo;
      if (profile.personalInfo.name) percentage += name;
      if (profile.personalInfo.email) percentage += email;
      if (profile.personalInfo.phone) percentage += phone;
      if (profile.personalInfo.location) percentage += location;
      if (profile.personalInfo.title) percentage += title;
    }

    // Summary (Max 10%)
    if (profile.summary?.trim() !== "") percentage += weights.summary;

    // Experience (Max 25%)
    if (profile.experience?.length > 0) {
      percentage += weights.experience.hasEntries;
      // Add points for up to 2 experience entries
      const expEntries = profile.experience.slice(0, 2);
      percentage += expEntries.length * weights.experience.perEntry;

      // Add points for achievements in each entry
      expEntries.forEach((exp: any) => {
        if (exp.achievements?.length > 0) {
          percentage += weights.experience.hasAchievements;
        }
      });
    }

    // Education (Max 21%)
    if (profile.education?.length > 0) {
      percentage += weights.education.hasEntries;
      // Add points for up to 2 education entries
      const eduEntries = profile.education.slice(0, 2);
      percentage += eduEntries.length * weights.education.perEntry;

      // Add points for achievements in each entry
      eduEntries.forEach((edu: any) => {
        if (edu.achievements) {
          percentage += weights.education.hasAchievements;
        }
      });
    }

    // Skills (Max 26.5%)
    if (profile.skills) {
      percentage += weights.skills.hasSkills;
      const skillCategories = Object.keys(profile.skills);

      // Add points for skill categories (up to 3)
      const categoriesToCount = Math.min(skillCategories.length, 3);
      percentage += categoriesToCount * weights.skills.perCategory;

      // Add points for skills within each category (up to 5 per category)
      skillCategories.slice(0, 3).forEach((category) => {
        const skills = profile.skills[category] || [];
        const skillsToCount = Math.min(skills.length, 5);
        percentage += skillsToCount * weights.skills.perSkill;
      });
    }

    // Projects (Max 20%)
    if (profile.projects?.length > 0) {
      percentage += weights.projects.hasProjects;
      // Add points for up to 2 projects
      const projectsToCount = Math.min(profile.projects.length, 2);
      percentage += projectsToCount * weights.projects.perProject;
    }

    // Cap at 100%
    return Math.min(Math.round(percentage), 100);
  } catch (error) {
    console.error("Error in setProfilePercentage:", error);
    throw error;
  }
};
