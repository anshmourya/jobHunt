import puppeteer, { Browser, Page, executablePath } from "puppeteer";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { setTimeout as delay } from "timers/promises";
import puppeteerExtra from "puppeteer-extra";

// Set up stealth
const stealthPlugin = StealthPlugin();
stealthPlugin.enabledEvasions.delete("chrome.runtime"); // Optional evasion cleanup
puppeteerExtra.use(stealthPlugin);

// Fingerprint state
const state = {
  currentFingerprint: null as BrowserFingerprint | null,
  currentPage: null as Page | null,
  currentBrowser: null as Browser | null,
  lastRotation: Date.now(),
  sessionCounter: 0,
};

// --- TYPES ---
interface BrowserFingerprint {
  userAgent: string;
  viewport: { width: number; height: number };
  language: string;
  timezone: string;
  platform: string;
  hardwareConcurrency: number;
  deviceMemory: number;
  colorDepth: number;
  pixelRatio: number;
}

// --- STATIC DATA ---
const userAgents = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
];
const viewports = [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  { width: 1280, height: 800 },
  { width: 1600, height: 900 },
  { width: 1440, height: 900 },
];
const timezones = [
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
  "America/Chicago",
];
const languages = ["en-US", "en-GB", "en-CA", "en-AU"];

// --- UTILS ---
function generateFingerprint(): BrowserFingerprint {
  const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
  const viewport = viewports[Math.floor(Math.random() * viewports.length)];

  return {
    userAgent,
    viewport,
    language: languages[Math.floor(Math.random() * languages.length)],
    timezone: timezones[Math.floor(Math.random() * timezones.length)],
    platform: userAgent.includes("Windows")
      ? "Win32"
      : userAgent.includes("Mac")
      ? "MacIntel"
      : "Linux x86_64",
    hardwareConcurrency: Math.floor(Math.random() * 8) + 4,
    deviceMemory: [4, 8, 16, 32][Math.floor(Math.random() * 4)],
    colorDepth: 24,
    pixelRatio: Math.random() > 0.5 ? 1 : 2,
  };
}

function generateRandomIP(): string {
  return Array(4)
    .fill(0)
    .map(() => Math.floor(Math.random() * 255))
    .join(".");
}

async function humanDelay() {
  const delays = [100, 200, 300, 500, 800, 1000, 1500];
  await delay(delays[Math.floor(Math.random() * delays.length)]);
}

async function simulateHumanScrolling(page: Page) {
  const steps = Math.floor(Math.random() * 3) + 1;
  for (let i = 0; i < steps; i++) {
    await page.evaluate(
      (amount) => window.scrollBy(0, amount),
      Math.floor(Math.random() * 300) + 100
    );
    await delay(Math.random() * 1000 + 500);
  }
}

// --- CORE FUNCTIONS ---

export async function launchStealthBrowser(
  fingerprint: BrowserFingerprint
): Promise<Browser> {
  return await puppeteerExtra.launch({
    headless: false,
    ignoreDefaultArgs: [
      "--enable-blink-features=IdleDetection",
      "--enable-automation",
    ],
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--disable-features=AutomationControlled",
      `--window-size=${fingerprint.viewport.width},${fingerprint.viewport.height}`,
      `--user-agent=${fingerprint.userAgent}`,
      "--disable-background-networking",
      "--disable-permissions-api",
      "--lang=en-US,en",
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-breakpad",
      "--disable-client-side-phishing-detection",
      "--disable-component-update",
      "--disable-default-apps",
      "--disable-domain-reliability",
      "--disable-features=AudioServiceOutOfProcess,IsolateOrigins,site-per-process",
      "--disable-hang-monitor",
      "--disable-ipc-flooding-protection",
      "--disable-popup-blocking",
      "--disable-prompt-on-repost",
      "--disable-renderer-backgrounding",
      "--disable-sync",
      "--force-color-profile=srgb",
      "--metrics-recording-only",
      "--mute-audio",
      "--no-default-browser-check",
      "--no-first-run",
      "--no-pings",
      "--no-zygote",
      "--single-process",
      "--unhandled-rejections=strict",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--window-size=1280,800",
      "--start-maximized",
      "--disable-infobars",
      "--disable-blink-features=AutomationControlled",
      "--disable-extensions",
    ],
    executablePath: executablePath(),
    defaultViewport: null,
  });
}

async function setupStealthPage(page: Page, fingerprint: BrowserFingerprint) {
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    Object.defineProperty(navigator, "languages", {
      get: () => ["en-US", "en"],
    });
    Object.defineProperty(navigator, "platform", { get: () => "Win32" });
    Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 8 });
    delete (window as any).chrome?.runtime;
  });

  await page.setViewport({
    width: fingerprint.viewport.width,
    height: fingerprint.viewport.height,
    deviceScaleFactor: fingerprint.pixelRatio,
  });

  await page.setUserAgent(fingerprint.userAgent);

  await page.setExtraHTTPHeaders({
    "Accept-Language": `${fingerprint.language},en;q=0.9`,
    "sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": `"${fingerprint.platform}"`,
  });

  await page.emulateTimezone(fingerprint.timezone);

  await page.setRequestInterception(true);
  page.on("request", (request) => {
    const headers = request.headers();
    if (Math.random() > 0.95) {
      headers["X-Forwarded-For"] = generateRandomIP();
    }
    request.continue({ headers });
  });
}

function shouldRotate(): boolean {
  return (
    state.sessionCounter % 5 === 0 || Date.now() - state.lastRotation > 300000
  );
}

export async function getStealthPage(forceNew = false): Promise<Page> {
  state.sessionCounter++;

  if (
    forceNew ||
    shouldRotate() ||
    !state.currentPage ||
    state.currentPage.isClosed()
  ) {
    if (state.currentPage && !state.currentPage.isClosed())
      await state.currentPage.close();
    if (state.currentBrowser) await state.currentBrowser.close();

    state.currentFingerprint = generateFingerprint();
    state.currentBrowser = await launchStealthBrowser(state.currentFingerprint);
    state.currentPage = await state.currentBrowser.newPage();
    await setupStealthPage(state.currentPage, state.currentFingerprint);
    state.lastRotation = Date.now();
  }

  return state.currentPage!;
}

export async function navigateWithStealth(page: Page, url: string) {
  try {
    if (page.isClosed()) throw new Error("Page was closed before navigation");

    // Enhanced stealth headers
    await page.setExtraHTTPHeaders({
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      "Accept-Encoding": "gzip, deflate",
      DNT: "1",
      Connection: "keep-alive",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Cache-Control": "max-age=0",
    });

    // Skip referrer - direct navigation is less suspicious
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    if (!response || !response.ok()) {
      throw new Error(`Navigation failed: ${response?.status()}`);
    }

    // Wait and check if page is still valid
    await delay(2000);

    if (page.isClosed() || page.mainFrame().isDetached()) {
      throw new Error("Page was blocked after navigation");
    }

    // Only scroll if page is still valid
    if (Math.random() > 0.5) {
      await simulateHumanScrolling(page);
    }

    return response;
  } catch (error) {
    console.error("Error in navigateWithStealth:", error);
    throw error;
  }
}

export async function stealthScrape(url: string): Promise<string> {
  const page = await getStealthPage();
  try {
    await navigateWithStealth(page, url);
    return await page.content();
  } catch (err) {
    console.warn("Blocked. Retrying with new session...");
    const newPage = await getStealthPage(true);
    await navigateWithStealth(newPage, url);
    return await newPage.content();
  }
}

export async function cleanupStealthSessions() {
  if (state.currentPage && !state.currentPage.isClosed())
    await state.currentPage.close();
  if (state.currentBrowser) await state.currentBrowser.close();
  state.currentPage = null;
  state.currentBrowser = null;
  state.currentFingerprint = null;
}
