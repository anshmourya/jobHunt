import { ChatGroq } from "@langchain/groq";
import { ChatOllama } from "@langchain/ollama";
const summaryModel = new ChatGroq({
  model: "llama-3.3-70b-versatile",
  temperature: 0,
  maxRetries: 2,
  apiKey: process.env.GROQ_API_KEY, 
});

const functionModel = new ChatOllama({
  model: "nemotron-mini:latest",
  temperature: 0, // Reduced for consistency
  maxRetries: 2, // Reduced retries
  format: "json",
  // Performance optimizations
  numCtx: 4096, // Reduce context window if not needed
  numPredict: 1024, // Limit response length
  topK: 10, // Reduce sampling space
  topP: 0.9,
  repeatPenalty: 1.1,
  // Faster inference settings
  numThread: -1, // Use all available threads
  numGpu: -1, // Use all available GPU layers
});

export { summaryModel, functionModel };
