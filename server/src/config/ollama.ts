import { ChatGroq } from "@langchain/groq";
import { Groq } from "groq-sdk";
import type {
  ChatCompletionSystemMessageParam,
  ChatCompletionUserMessageParam,
  ChatCompletionAssistantMessageParam,
} from "groq-sdk/resources/chat/completions";
import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/huggingface_transformers";
import fs from "fs/promises";

const summaryModel = new ChatGroq({
  model: "llama-3.1-8b-instant",
  temperature: 0,
  maxRetries: 2,
  apiKey: process.env.GROQ_API_KEY,
});

const functionModel = new ChatGroq({
  model: "meta-llama/llama-4-scout-17b-16e-instruct",
  temperature: 0,
  maxRetries: 2,
  apiKey: process.env.GROQ_API_KEY,
});

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

type Message =
  | ChatCompletionSystemMessageParam
  | ChatCompletionUserMessageParam
  | ChatCompletionAssistantMessageParam;

const getVisionCompletion = async (messages: Message[]) => {
  return groq.chat.completions.create({
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    messages,
    temperature: 1,
    top_p: 1,
    stream: false,
    stop: null,
    response_format: {
      type: "json_object",
    },
  });
};

type Document = string | { text: string };

const model = new HuggingFaceTransformersEmbeddings({
  model: "Xenova/all-MiniLM-L6-v2",
});

function normalizeDocuments(docs: Document[]): string[] {
  return docs.map((doc) =>
    typeof doc === "string" ? doc : JSON.stringify(doc)
  );
}

function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dot / (magA * magB);
}

async function embedInBatches(texts: string[], batchSize = 32) {
  const allEmbeddings: number[][] = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const chunk = texts.slice(i, i + batchSize);
    const embeddings = await model.embedDocuments(chunk);
    allEmbeddings.push(...embeddings);
  }
  return allEmbeddings;
}

async function semanticSearch(query: string, documents: Document[], topK = 5) {
  const texts = normalizeDocuments(documents);

  //save doc texts to json file for debugging
  await fs.writeFile("docs.json", JSON.stringify(texts, null, 2));

  const [docEmbeddings, queryEmbedding] = await Promise.all([
    embedInBatches(texts),
    model.embedQuery(query),
  ]);

  console.log(docEmbeddings, queryEmbedding);

  const scoredResults = texts.map((text, i) => ({
    text,
    similarity: cosineSimilarity(docEmbeddings[i], queryEmbedding),
  }));

  return scoredResults
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}
export { summaryModel, functionModel, getVisionCompletion, semanticSearch };
