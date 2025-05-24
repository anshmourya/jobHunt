import { ChatOllama } from "@langchain/ollama";

const summaryModel = new ChatOllama({
  model: "granite3.2:8b",
  temperature: 0,
  maxRetries: 3,
  format: "json",
});

const functionModel = new ChatOllama({
  model: "nemotron-mini:latest",
  temperature: 0,
  maxRetries: 3,
  format: "json",
});

export { summaryModel, functionModel };
