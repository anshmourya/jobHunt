import puppeteer from "puppeteer";
import { resumeBuilderWorkflow } from "../tools";
import { resumeData } from "./constant";
import express from "express";
import path from "path";
import multer from "multer";

const app = express();
// Configure view engine and views directory
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../views"));
export const generateResume = async (keywords: string[]) => {
  try {
    if (!keywords) {
      throw new Error("Invalid data");
    }
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

//multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

export const upload = multer({ storage: multer.memoryStorage() });
