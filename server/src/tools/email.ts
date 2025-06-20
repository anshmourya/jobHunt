import { tool } from "@langchain/core/tools";
import { MemorySaver } from "@langchain/langgraph";
import { HumanMessage } from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { z } from "zod";
import { summaryModel, functionModel } from "../config/ollama";
import { TavilySearchAPIRetriever } from "@langchain/community/retrievers/tavily_search_api";

const search = tool(
  async ({ query }: { query: string }): Promise<string> => {
    const retriever = new TavilySearchAPIRetriever({
      apiKey: process.env.TAVILY_API_KEY,
    });
    const result = await retriever.invoke(query);
    return result.map((doc) => doc.pageContent).join("\n");
  },
  {
    name: "search",
    description: "Search for information on the web",
    schema: z.object({ query: z.string() }),
  }
);

const structureOutput = tool(
  async ({
    text,
    requiredSchema,
  }: {
    text: string;
    requiredSchema?: any;
  }): Promise<any> => {
    const system = `You are a helpful assistant that converts text to structured JSON format.
    ${
      requiredSchema
        ? `The output must match this schema: ${JSON.stringify(requiredSchema)}`
        : ""
    }`;

    const result = await summaryModel.invoke(
      [
        {
          role: "system",
          content: system,
        },
        {
          role: "user",
          content: text,
        },
      ],
      {
        response_format: {
          type: "json_object",
        },
      }
    );

    try {
      const content =
        typeof result.content === "string"
          ? result.content
          : JSON.stringify(result.content);
      return JSON.parse(content);
    } catch (e) {
      console.error("Failed to parse JSON:", e);
      throw new Error("Failed to parse the model output as JSON");
    }
  },
  {
    name: "structureOutput",
    description: "Convert text to structured JSON format",
    schema: z.object({
      text: z.string().describe("Text to convert to JSON"),
      requiredSchema: z
        .any()
        .optional()
        .describe("Optional schema for the desired JSON structure"),
    }),
  }
);

// --- AGENT SETUP ---

const agent = createReactAgent({
  llm: functionModel,
  tools: [structureOutput, search],
  checkpointer: new MemorySaver(),
});

export const emailBuilder = async (messages: string) => {
  try {
    const result = await agent.invoke(
      {
        messages: [new HumanMessage(messages)],
      },
      {
        configurable: { thread_id: "42" },
      }
    );
    return result.messages;
  } catch (error) {
    console.error("Scraper error:", error);
    throw error;
  }
};
