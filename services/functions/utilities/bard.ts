import { DiscussServiceClient } from "@google-ai/generativelanguage";
import { GoogleAuth } from "google-auth-library";
import { ENV, LLM_MODELS } from "./static";

export function convertBardChat(history: any = []) {
  let payload: any = { context: history[0].content, messages: [] };
  for (let i = 0; i < history.length; i++) {
    if (i > 0) {
      const h = history[i];
      if (h.role !== history[i - 1].role || i === 1) {
        payload.messages.push({ author: h.role, content: h.content });
      } else {
        payload.messages[payload.messages.length - 1].content +=
          "\n" + h.content;
      }
    }
  }
  return payload;
}

export async function bard(
  messages: any[],
  model: string = LLM_MODELS.BISON.model,
  context: string = ""
) {
  const client = new DiscussServiceClient({
    authClient: new GoogleAuth().fromAPIKey(ENV.BARD_API_KEY),
  });

  let prompt: {
    context?: string;
    messages: { author: string; content: string }[];
  } = {
    messages,
  };
  if (context) {
    prompt.context = context;
  }
  const result = await client.generateMessage({
    model, // Required. The model to use to generate the result.
    temperature: 0.5, // Optional. Value `0.0` always uses the highest-probability result.
    candidateCount: 1, // Optional. The number of candidate results to generate.
    prompt,
  });

  return result[0]?.candidates[0]?.content.trim();
}
