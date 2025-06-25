import { task } from "@langchain/langgraph";
import { Page } from "puppeteer";
import { getBrowser } from "../tools";
import { loadCookies, isLoggedIn, saveCookies } from "../tools/linkedin";

let LOGIN_TIMEOUT = 120000;
let page: Page;
const getPage = async (): Promise<Page> => {
  if (page) return page;
  const browser = await getBrowser();
  page = await browser.newPage();
  return page;
};
//login to linkedin
const loginToLinkedIn = task("loginToLinkedIn", async () => {
  const page = await getPage();
  await loadCookies(page);
  const isUserLoggedIn = await isLoggedIn(page);
  if (!isUserLoggedIn) {
    const email = process.env.LINKEDIN_EMAIL;
    const password = process.env.LINKEDIN_PASSWORD;
    if (!email || !password) {
      throw new Error("Missing LinkedIn credentials in environment variables");
    }
    await page.goto("https://www.linkedin.com/login", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForSelector("#username", {
      visible: true,
      timeout: 10000,
    });
    await page.type("#username", email, { delay: 50 });
    await page.type("#password", password, { delay: 50 });

    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({
        waitUntil: "domcontentloaded",
        timeout: LOGIN_TIMEOUT,
      }),
    ]);

    // Handle verification if needed
    if (await page.$("#input__email_verification_pin")) {
      console.warn("→ Verification required, waiting for manual completion...");
      await page.waitForNavigation({
        waitUntil: "networkidle0",
        timeout: 300000,
      });
    }

    if (!(await isLoggedIn(page))) {
      await page.screenshot({ path: "linkedin-login-failed.png" });
      throw new Error("Login failed. Check credentials and try again.");
    }

    console.log("→ Login successful");
    await saveCookies(page);

    return {
      success: true,
      message: "Successfully logged in with credentials",
      method: "credentials",
    };
  }

  return {
    success: true,
    message: "Successfully logged in with cookies",
    method: "cookies",
  };
});
