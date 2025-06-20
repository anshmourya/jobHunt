import * as cheerio from "cheerio";
import axios, { AxiosResponse } from "axios";

// Type definitions for better type safety
interface LinkExtraction {
  internalLinks: string[];
  externalLinks: string[];
}

interface ScrapedData {
  body: string;
  head: string;
  title: string;
  meta: Record<string, string>;
  links: LinkExtraction;
}

interface ScrapingResult extends ScrapedData {
  url: string;
  internalPagesData: ScrapedData[];
  errors: Array<{ url: string; error: string }>;
}

// Utility functions using functional composition
const pipe =
  <T>(...fns: Array<(arg: T) => T>) =>
  (value: T): T =>
    fns.reduce((acc, fn) => fn(acc), value);

const safeGet = async (url: string): Promise<AxiosResponse | null> => {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; WebScraper/1.0)",
      },
    });
    return response;
  } catch (error) {
    console.warn(
      `Failed to fetch ${url}:`,
      error instanceof Error ? error.message : "Unknown error"
    );
    return null;
  }
};

// Enhanced link extraction with URL normalization
const extractLinks = (html: string, baseUrl: string): LinkExtraction => {
  const $ = cheerio.load(html);
  const internalLinks = new Set<string>();
  const externalLinks = new Set<string>();

  const normalizeUrl = (href: string): string | null => {
    if (!href?.trim() || href.startsWith("#") || href === "/") return null;

    try {
      // Handle absolute URLs
      if (href.startsWith("http://") || href.startsWith("https://")) {
        return href;
      }

      // Handle protocol-relative URLs
      if (href.startsWith("//")) {
        const baseProtocol = new URL(baseUrl).protocol;
        return `${baseProtocol}${href}`;
      }

      // Handle relative URLs
      const base = new URL(baseUrl);
      const fullUrl = new URL(href, base.origin);
      return fullUrl.href;
    } catch {
      return null;
    }
  };

  const categorizeLink = (normalizedUrl: string, baseUrl: string): void => {
    try {
      const linkDomain = new URL(normalizedUrl).hostname;
      const baseDomain = new URL(baseUrl).hostname;

      if (linkDomain === baseDomain) {
        internalLinks.add(normalizedUrl);
      } else {
        externalLinks.add(normalizedUrl);
      }
    } catch {
      // Invalid URL, skip
    }
  };

  $("a[href]").each((_, element) => {
    const href = $(element).attr("href");
    if (href) {
      const normalizedUrl = normalizeUrl(href);
      if (normalizedUrl) {
        categorizeLink(normalizedUrl, baseUrl);
      }
    }
  });

  return {
    internalLinks: Array.from(internalLinks),
    externalLinks: Array.from(externalLinks),
  };
};

// Enhanced data extraction with metadata
const extractPageData = (html: string, url: string): ScrapedData => {
  const $ = cheerio.load(html);

  // Extract meta information
  const extractMeta = (): Record<string, string> => {
    const meta: Record<string, string> = {};

    $("meta").each((_, element) => {
      const name = $(element).attr("name") || $(element).attr("property");
      const content = $(element).attr("content");

      if (name && content) {
        meta[name] = content;
      }
    });

    return meta;
  };

  // Clean text extraction
  const cleanText = (selector: string): string =>
    $(selector).text().replace(/\s+/g, " ").trim();

  const links = extractLinks(html, url);

  return {
    body: cleanText("body"),
    head: cleanText("head"),
    title: $("title").text().trim() || "",
    meta: extractMeta(),
    links,
  };
};

// Concurrent processing with error handling and rate limiting
const processConcurrently = async <T, R>(
  items: T[],
  processor: (item: T) => Promise<R | null>,
  concurrency = 5
): Promise<
  Array<
    | { success: R; error: null }
    | { success: null; error: { item: T; message: string } }
  >
> => {
  const results: Array<
    | { success: R; error: null }
    | { success: null; error: { item: T; message: string } }
  > = [];

  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);

    const batchPromises = batch.map(async (item) => {
      try {
        const result = await processor(item);
        return result
          ? { success: result, error: null }
          : {
              success: null,
              error: { item, message: "Processing returned null" },
            };
      } catch (error) {
        return {
          success: null,
          error: {
            item,
            message: error instanceof Error ? error.message : "Unknown error",
          },
        };
      }
    });

    const batchResults = await Promise.allSettled(batchPromises);

    batchResults.forEach((result) => {
      if (result.status === "fulfilled") {
        results.push(result.value);
      } else {
        results.push({
          success: null,
          error: { item: batch[0], message: result.reason },
        });
      }
    });
  }

  return results;
};

// Main scraping function with comprehensive error handling
export const getInternalLinksAndScrap = async (
  url: string,
  options: {
    maxInternalPages?: number;
    concurrency?: number;
    includeExternalLinks?: boolean;
  } = {}
): Promise<ScrapingResult> => {
  const {
    maxInternalPages = 10,
    concurrency = 3,
    includeExternalLinks = true,
  } = options;

  // Validate URL
  try {
    new URL(url);
  } catch {
    throw new Error(`Invalid URL provided: ${url}`);
  }

  // Fetch main page
  const mainPageResponse = await safeGet(url);
  if (!mainPageResponse) {
    throw new Error(`Failed to fetch main page: ${url}`);
  }

  const mainPageData = extractPageData(mainPageResponse.data, url);

  // Limit internal pages to process
  const internalLinksToProcess = mainPageData.links.internalLinks
    .slice(0, maxInternalPages)
    .filter((link) => link !== url); // Avoid self-reference

  // Process internal pages concurrently
  const internalPageProcessor = async (
    link: string
  ): Promise<ScrapedData | null> => {
    const response = await safeGet(link);
    return response ? extractPageData(response.data, link) : null;
  };

  const internalResults = await processConcurrently(
    internalLinksToProcess,
    internalPageProcessor,
    concurrency
  );

  // Separate successful results from errors
  const internalPagesData: ScrapedData[] = [];
  const errors: Array<{ url: string; error: string }> = [];

  internalResults.forEach((result) => {
    if (result.success) {
      internalPagesData.push(result.success);
    } else if (result.error) {
      errors.push({
        url:
          typeof result.error.item === "string" ? result.error.item : "unknown",
        error: result.error.message,
      });
    }
  });

  return {
    url,
    body: mainPageData.body,
    head: mainPageData.head,
    title: mainPageData.title,
    meta: mainPageData.meta,
    links: includeExternalLinks
      ? mainPageData.links
      : { internalLinks: mainPageData.links.internalLinks, externalLinks: [] },
    internalPagesData,
    errors,
  };
};

// Utility function for filtering and processing results
export const processScrapingResults = (
  results: ScrapingResult,
  filters: {
    minBodyLength?: number;
    excludeEmptyPages?: boolean;
    keywordFilter?: string[];
  } = {}
): ScrapingResult => {
  const {
    minBodyLength = 0,
    excludeEmptyPages = true,
    keywordFilter = [],
  } = filters;

  const filterPage = (page: ScrapedData): boolean => {
    if (
      excludeEmptyPages &&
      (!page.body.trim() || page.body.length < minBodyLength)
    ) {
      return false;
    }

    if (keywordFilter.length > 0) {
      const content = `${page.body} ${page.title}`.toLowerCase();
      return keywordFilter.some((keyword) =>
        content.includes(keyword.toLowerCase())
      );
    }

    return true;
  };

  return {
    ...results,
    internalPagesData: results.internalPagesData.filter(filterPage),
  };
};
