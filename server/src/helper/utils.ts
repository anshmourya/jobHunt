import puppeteer from "puppeteer";
import { resumeBuilderWorkflow } from "../tools";
import { resumeData } from "./constant";
import express from "express";
import path from "path";
import multer from "multer";
import fs from "fs";
import { getVisionCompletion } from "../config/ollama";
import { extractResumeDataFromPdfPrompt } from "../helper/prompt";
import { Poppler } from "node-poppler";

const poppler = new Poppler();
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
    return resumeData;
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

// =const extract = tool(
//   async ({ selector }: { selector: string }): Promise<string> => {
//     const page = await getSharedPage();
//     if (!page) throw new Error("No page found");

//     try {
//       // Wait for the page to be ready
//       await page.waitForSelector("body", { timeout: 10000 }).catch(() => {});
//       await delay(2000); // Give time for dynamic content to load

//       // Get page readiness info
//       const pageInfo = await page.evaluate(() => ({
//         readyState: document.readyState,
//         bodyExists: !!document.body,
//         hasContent: document.body ? document.body.children.length > 0 : false,
//       }));

//       console.log("Page info:", pageInfo);

//       let content = "";

//       if (selector === "body" || selector === "html") {
//         // For body/html, get all text content
//         content = await page.evaluate(() => {
//           // Remove script, style, and other non-content elements
//           const elementsToRemove = [
//             "script",
//             "style",
//             "noscript",
//             "meta",
//             "link",
//           ];
//           elementsToRemove.forEach((tag) => {
//             const elements = document.querySelectorAll(tag);
//             elements.forEach((el) => el.remove());
//           });

//           // Get text content from body
//           const body = document.body;
//           if (body) {
//             // Try multiple methods to get text content
//             return body.innerText || body.textContent || "";
//           }

//           // Fallback to document
//           return (
//             document.documentElement.innerText ||
//             document.documentElement.textContent ||
//             ""
//           );
//         });
//       } else {
//         // For specific selectors
//         try {
//           await page.waitForSelector(selector, { timeout: 10000 });
//           const element = await page.$(selector);

//           if (element) {
//             content = await page.evaluate((el) => {
//               return el.textContent || el.innerHTML || "";
//             }, element);
//           } else {
//             throw new Error(`Element with selector "${selector}" not found`);
//           }
//         } catch (selectorError) {
//           throw new Error(
//             `Failed to find element with selector "${selector}": ${selectorError}`
//           );
//         }
//       }

//       // Clean up the content
//       content = content.trim();

//       if (!content) {
//         // Try one more fallback method
//         content = await page.evaluate(() => {
//           const walker = document.createTreeWalker(
//             document.body,
//             NodeFilter.SHOW_TEXT,
//             { acceptNode: () => NodeFilter.FILTER_ACCEPT }
//           );

//           let textContent = "";
//           let node;

//           while ((node = walker.nextNode())) {
//             if (node.textContent && node.textContent.trim()) {
//               textContent += node.textContent.trim() + " ";
//             }
//           }

//           return textContent.trim();
//         });
//       }

//       if (!content) {
//         throw new Error(`No content found for selector "${selector}"`);
//       }

//       console.log(
//         `Successfully extracted ${content.length} characters of content`
//       );
//       return content;
//     } catch (error) {
//       console.error(`Extract error for selector "${selector}":`, error);
//       throw new Error(`Failed to extract content from ${selector}: ${error}`);
//     }
//   },
//   {
//     name: "extract",
//     description:
//       "Extract text content from a selector (use 'body' for full page content)",
//     schema: z.object({ selector: z.string() }),
//   }
// );
