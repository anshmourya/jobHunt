import { Page } from "puppeteer";

import { getVisionCompletion, summaryModel } from "../config/ollama";
import { retry } from "../tools";
import { botDetectionPrompt } from "../helper/prompt";

// Enhanced bot detection prompt with better structure

const botDetectionResolver = async (page: Page) => {
  try {
    // Initial screenshot for debugging
    await page.screenshot({
      path: `debug_${Date.now()}.png`,
      fullPage: true,
    });

    // Get page content more efficiently
    const content = await page.evaluate(() => {
      const clone = document.cloneNode(true) as Document;
      const scripts = clone.querySelectorAll("script, style, noscript");
      scripts.forEach((el) => el.remove());
      return clone.documentElement.outerHTML;
    });

    // More specific bot detection patterns
    const botDetectionIndicators = [
      /cloudflare/i,
      /checking your browser/i,
      /bot.*detect/i,
      /captcha/i,
      /verify.*human/i,
      /security check/i,
      /ddos.*protection/i,
      /recaptcha/i,
      /i'm not a robot/i,
    ];

    const hasBotDetection = botDetectionIndicators.some((pattern) =>
      pattern.test(content)
    );

    if (!hasBotDetection) {
      console.log("No bot detection found");
      return { success: true, bypassed: false };
    }

    console.log("Bot detection detected, attempting bypass...");

    const result = await retry(
      () =>
        summaryModel.invoke(
          [
            {
              role: "system",
              content:
                "You are a web automation expert specializing in bot detection bypass. Focus on identifying the correct interactive elements, especially reCAPTCHA checkboxes.",
            },
            {
              role: "user",
              content: botDetectionPrompt.replace("PROMT_CONTENT", content),
            },
          ],
          {
            response_format: { type: "json_object" },
            temperature: 0.1,
          }
        ),
      3,
      2000,
      true
    );

    let botDetectionData;
    try {
      botDetectionData = JSON.parse(result.content);
    } catch (parseError) {
      console.error("Failed to parse bot detection response:", parseError);
      throw new Error("Invalid response from bot detection model");
    }

    if (!botDetectionData.isBotDetection) {
      return { success: true, bypassed: false };
    }

    const { clickableElement } = botDetectionData;

    // If no specific selector found, try common reCAPTCHA selectors
    const fallbackSelectors = [
      ".recaptcha-checkbox-border",
      ".recaptcha-checkbox",
      "#recaptcha-anchor",
      ".g-recaptcha",
      'iframe[src*="recaptcha"]',
      '[role="checkbox"]',
      'div[class*="recaptcha"] div[role="checkbox"]',
    ];

    let targetSelector = clickableElement?.selector;

    if (!targetSelector) {
      console.log("No selector from AI, trying fallback selectors...");

      for (const selector of fallbackSelectors) {
        try {
          const elementExists = await page.$(selector);
          if (elementExists) {
            targetSelector = selector;
            console.log(`Found fallback selector: ${selector}`);
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }
    }

    if (!targetSelector) {
      throw new Error(
        `Bot detection found but no clickable element identified. Type: ${botDetectionData.detectionType}`
      );
    }

    console.log(
      `Attempting to click: ${targetSelector} (${
        clickableElement?.type || "fallback"
      })`
    );

    // More robust clicking with multiple strategies
    try {
      // First, check if we need to handle iframe for reCAPTCHA
      const isRecaptchaIframe = targetSelector.includes("iframe");

      if (isRecaptchaIframe) {
        console.log("Handling reCAPTCHA iframe...");

        // Wait for iframe to load
        await page.waitForSelector(targetSelector, {
          timeout: 15000,
          visible: true,
        });

        // Get the iframe and its content
        const iframe = await page.$(targetSelector);
        const frame = await iframe?.contentFrame();

        if (frame) {
          // Wait for checkbox in iframe
          await frame.waitForSelector(
            ".recaptcha-checkbox-border, #recaptcha-anchor",
            {
              timeout: 10000,
              visible: true,
            }
          );

          // Click the checkbox inside iframe
          await frame.click(".recaptcha-checkbox-border, #recaptcha-anchor");
          console.log("Clicked reCAPTCHA checkbox in iframe");
        } else {
          throw new Error("Could not access reCAPTCHA iframe content");
        }
      } else {
        // Regular element clicking
        // Wait for element to be available
        await page.waitForSelector(targetSelector, {
          timeout: 15000,
          visible: true,
        });

        // Scroll element into view
        await page.evaluate((selector) => {
          const element = document.querySelector(selector);
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, targetSelector);

        // Wait a bit for any animations - use page.waitForTimeout alternative
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Try multiple click strategies
        const clickStrategies = [
          () => page.click(targetSelector),
          () =>
            page.evaluate((sel) => {
              const element = document.querySelector(sel);
              if (element) {
                element.click();
                return true;
              }
              return false;
            }, targetSelector),
          () => page.tap(targetSelector),
          () =>
            page.focus(targetSelector).then(() => page.keyboard.press("Space")),
        ];

        let clickSuccessful = false;
        for (const strategy of clickStrategies) {
          try {
            await strategy();
            clickSuccessful = true;
            console.log("Click strategy succeeded");
            break;
          } catch (clickError: unknown) {
            console.warn(
              "Click strategy failed:",
              (clickError as Error).message
            );
          }
        }

        if (!clickSuccessful) {
          throw new Error("All click strategies failed");
        }
      }

      // Post-click check for image challenge
      try {
        // Check if an image challenge appeared after clicking the checkbox
        const challengeElement = await page.$(
          ".rc-imageselect, .rc-imageselect-payload"
        );
        if (challengeElement) {
          console.log("Image challenge detected, attempting to solve...");

          // Extract challenge text
          const challengeText = await page.evaluate(() => {
            const descElement = document.querySelector(
              ".rc-imageselect-desc-no-canonical strong"
            );
            return descElement
              ? descElement.textContent
              : "Select the specified objects";
          });

          const challengeInfo = { challengeText };

          // Attempt to solve the image challenge
          const challengeSolved = await solveImageChallenge(
            page,
            challengeInfo
          );

          if (!challengeSolved) {
            throw new Error("Failed to solve image challenge");
          }

          console.log("Image challenge solved successfully");

          // Wait for navigation or content change after solving challenge
          try {
            await Promise.race([
              page.waitForNavigation({
                waitUntil: "networkidle2",
                timeout: 20000,
              }),
              page.waitForFunction(
                () => {
                  const bodyText = document.body.innerHTML.toLowerCase();
                  return (
                    !bodyText.includes("checking") &&
                    !bodyText.includes("verify you are human") &&
                    !bodyText.includes("unusual traffic")
                  );
                },
                { timeout: 20000 }
              ),
              new Promise((resolve) => setTimeout(resolve, 5000)),
            ]);
          } catch (waitError: unknown) {
            console.warn(
              "Navigation wait timeout after image challenge, continuing...",
              (waitError as Error).message
            );
          }
        }
      } catch (imageChallengeError: unknown) {
        console.error("Image challenge handling failed:", imageChallengeError);
        throw new Error(
          `Failed to handle image challenge: ${
            (imageChallengeError as Error).message
          }`
        );
      }

      // Wait for navigation or content change with timeout
      try {
        await Promise.race([
          page.waitForNavigation({
            waitUntil: "networkidle2",
            timeout: 20000,
          }),
          page.waitForFunction(
            () => {
              const bodyText = document.body.innerHTML.toLowerCase();
              return (
                !bodyText.includes("checking") &&
                !bodyText.includes("verify you are human") &&
                !bodyText.includes("unusual traffic")
              );
            },
            { timeout: 20000 }
          ),
          // Sometimes reCAPTCHA just needs time to process
          new Promise((resolve) => setTimeout(resolve, 5000)),
        ]);
      } catch (waitError: unknown) {
        console.warn(
          "Navigation wait timeout, continuing...",
          (waitError as Error).message
        );
      }
    } catch (clickError: unknown) {
      console.error("Click operation failed:", clickError);
      throw new Error(
        `Failed to interact with bot detection element: ${
          (clickError as Error).message
        }`
      );
    }

    // Post-bypass screenshot
    await page.screenshot({
      path: `checkpoint_${Date.now()}.png`,
      fullPage: true,
    });

    // Verify bypass success with multiple checks
    const finalContent = await page.content();
    const stillDetecting = botDetectionIndicators.some((pattern) =>
      pattern.test(finalContent)
    );

    // Additional checks for successful bypass
    const bypassSuccess =
      !stillDetecting &&
      !finalContent.toLowerCase().includes("checking your browser") &&
      !finalContent.toLowerCase().includes("verify you are human") &&
      !finalContent.toLowerCase().includes("unusual traffic");

    if (!bypassSuccess) {
      // Try one more time with a different approach
      console.log("First bypass attempt failed, trying alternative method...");

      // Wait longer for reCAPTCHA processing
      await new Promise((resolve) => setTimeout(resolve, 8000));

      const retryContent = await page.content();
      const retrySuccess = !botDetectionIndicators.some((pattern) =>
        pattern.test(retryContent)
      );

      if (!retrySuccess) {
        // One final attempt - sometimes we need to submit a form or click continue
        try {
          const continueSelectors = [
            'button[type="submit"]',
            'input[type="submit"]',
            'button:contains("Continue")',
            'button:contains("Submit")',
            'button:contains("Proceed")',
          ];

          for (const selector of continueSelectors) {
            try {
              const element = await page.$(selector);
              if (element) {
                await element.click();
                console.log(`Clicked continue button: ${selector}`);
                await new Promise((resolve) => setTimeout(resolve, 3000));
                break;
              }
            } catch (e) {
              // Continue to next selector
            }
          }

          // Final check
          const finalRetryContent = await page.content();
          const finalSuccess = !botDetectionIndicators.some((pattern) =>
            pattern.test(finalRetryContent)
          );

          if (!finalSuccess) {
            throw new Error("Bot detection bypass failed after all attempts");
          }
        } catch (e) {
          throw new Error(
            "Bot detection bypass failed after multiple attempts"
          );
        }
      }
    }

    console.log("Bot detection successfully bypassed");
    return {
      success: true,
      bypassed: true,
      detectionType: botDetectionData.detectionType,
      method: clickableElement?.type ?? "fallback",
    };
  } catch (error) {
    console.error("Bot handler error:", error);

    // Take error screenshot for debugging
    if (page) {
      try {
        await page.screenshot({
          path: `error_${Date.now()}.png`,
          fullPage: true,
        });
      } catch (screenshotError: unknown) {
        console.error("Failed to take error screenshot:", screenshotError);
      }
    }

    throw new Error(
      `Bot detection handling failed: ${(error as Error).message}`
    );
  }
};

async function solveImageChallenge(page: any, challengeInfo: any) {
  console.log("Attempting AI-powered solving...");

  // Take screenshot of the challenge
  const challengeScreenshot = await page.screenshot({
    encoding: "base64",
    clip: await getRecaptchaClipArea(page),
    path: `challenge_${Date.now()}.png`, // save the screenshot for debugging
  });

  // Use vision model to analyze the challenge
  const visionPrompt = `
  Analyze this reCAPTCHA image challenge. The instruction is: "${challengeInfo.challengeText}"
  
  Return a JSON response with:
  {
    "targetObject": "what to look for (bus, traffic light, etc.)",
    "gridPositions": [array of 0-based indices of images that contain the target],
    "confidence": number between 0-1
  }
  
  The grid is typically 3x3 (9 images) or 4x4 (16 images), numbered left to right, top to bottom starting from 0.
  `;

  try {
    // This would require a vision-capable model
    const visionResult = await getVisionCompletion([
      {
        role: "user",
        content: [
          { type: "text", text: visionPrompt },
          {
            type: "image_url",
            image_url: { url: `data:image/png;base64,${challengeScreenshot}` },
          },
        ],
      },
    ]);

    const solution =
      typeof visionResult.choices[0].message.content === "string"
        ? JSON.parse(visionResult.choices[0].message.content)
        : null;

    if (solution?.confidence > 0.6 && solution?.gridPositions.length > 0) {
      await clickGridPositions(page, solution.gridPositions);
      await clickVerifyButton(page);
      return true;
    }
  } catch (visionError) {
    console.error("Vision model failed:", visionError);
    throw visionError;
  }
}

async function clickGridPositions(page: Page, positions: number[]) {
  const tiles = await page.$$(".rc-imageselect-tile");

  for (const position of positions) {
    if (position < tiles.length) {
      try {
        await tiles[position].click();
        await new Promise((resolve) => setTimeout(resolve, 300)); // Small delay between clicks
        console.log(`Clicked tile at position ${position}`);
      } catch (clickError) {
        console.warn(`Failed to click tile ${position}:`, clickError);
      }
    }
  }
}

async function clickVerifyButton(page: Page) {
  const verifySelectors = [
    '.rc-button-default[tabindex="0"]',
    "#recaptcha-verify-button",
    'button:contains("VERIFY")',
    ".rc-imageselect-verify-button",
  ];

  for (const selector of verifySelectors) {
    try {
      const button = await page.$(selector);
      if (button) {
        await button.click();
        console.log(`Clicked verify button: ${selector}`);
        return;
      }
    } catch (e) {
      continue;
    }
  }

  throw new Error("Could not find verify button");
}

async function getRecaptchaClipArea(page: any) {
  return await page.evaluate(() => {
    const recaptchaFrame = document.querySelector(".rc-imageselect-payload");
    if (recaptchaFrame) {
      const rect = recaptchaFrame.getBoundingClientRect();
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      };
    }
    return { x: 0, y: 0, width: 400, height: 400 };
  });
}

export default botDetectionResolver;
