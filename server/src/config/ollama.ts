import { ChatGroq } from "@langchain/groq";
import { Groq } from "groq-sdk";
import type {
  ChatCompletionSystemMessageParam,
  ChatCompletionUserMessageParam,
  ChatCompletionAssistantMessageParam,
} from "groq-sdk/resources/chat/completions";
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
export { summaryModel, functionModel, getVisionCompletion };
