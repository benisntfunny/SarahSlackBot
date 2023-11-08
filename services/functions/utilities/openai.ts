/** @format */

import axios from "axios";
import { imageUrlToS3, readItemFromDynamoDB, writeToDynamoDB } from "./aws";
import { ENV, LLM_MODELS, OPENAPI_URLS, SLACK_ACTION_TYPES } from "./static";

async function getKey() {
  let index: any = (
    await readItemFromDynamoDB(ENV.SETTINGS, {
      clientId: "slackbot",
      type: "index",
    })
  )?.index;
  index = index ?? 0;

  await writeToDynamoDB(ENV.SETTINGS, {
    clientId: "slackbot",
    type: "index",
    index: index === 0 ? 1 : 0,
  });
  return ENV.OPENAI_API_KEY.split(",")[index];
}

export async function genericAPIRequest(url: string, body: any = {}) {
  return await axios.post(url, body, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ENV.OPENAI_API_KEY}`,
    },
  });
}

// Function to process chat messages
export async function chatGPT(
  messages: any,
  model: string = LLM_MODELS.GPT4.model,
  functions: any = []
): Promise<any> {
  // Send a POST request to the chat completion API
  try {
    let body: any = {
      model,
      messages,
    };
    if (functions.length > 0) {
      body.functions = functions;
      body.function_call = "auto";
    }
    const response = await axios.post(OPENAPI_URLS.COMPLETITION, body, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await getKey()}`,
      },
    });
    return response.data?.choices[0]?.message?.content;
  } catch (err: any) {
    console.error("[openai.ts chatGPT]", JSON.stringify(err.config.data));
  }
  // Return the content of the first message in the response
}
// Function to process chat messages
export async function visionGPT(
  messages: any,
  model: string = LLM_MODELS.GPT4.model,
  functions: any = []
): Promise<any> {
  // Send a POST request to the chat completion API
  try {
    let body: any = {
      model,
      messages,
      max_tokens: 1000,
    };
    if (functions.length > 0) {
      body.functions = functions;
      body.function_call = "auto";
    }
    const response = await axios.post(OPENAPI_URLS.COMPLETITION, body, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await getKey()}`,
      },
    });
    return response.data?.choices[0]?.message?.content;
  } catch (err: any) {
    console.error("[openai.ts chatGPT]", JSON.stringify(err.config.data));
  }
  // Return the content of the first message in the response
}
// Function to process chat messages
export async function chatGPTWithFunctions(
  messages: any,
  model: string = LLM_MODELS.GPT4.model,
  functions: any = []
): Promise<any> {
  // Send a POST request to the chat completion API
  try {
    let body: any = {
      model,
      messages,
    };
    if (functions.length > 0) {
      body.functions = functions;
      body.function_call = "auto";
    }
    const response = await axios.post(OPENAPI_URLS.COMPLETITION, body, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await getKey()}`,
      },
    });
    if (response.data?.choices[0]?.finish_reason === "function_call") {
      return JSON.parse(
        response.data.choices[0].message.function_call.arguments
      ).prompt;
    } else {
      return undefined;
    }
  } catch (err: any) {
    console.error("error", err);
  }
  // Return the content of the first message in the response
}

// Function to process chat settings and generate text
export function buildSettingsText(settings: any) {
  // Check if there are any settings
  if (settings) {
    // If there is a chat style override setting, generate text according to it
    if (settings[SLACK_ACTION_TYPES.CHAT_STYLE_OVERRIDE]) {
      return `${settings[SLACK_ACTION_TYPES.CHAT_STYLE_OVERRIDE]}`;
    } else if (
      // If there is a preset chat style setting, generate text according to the preset
      settings[SLACK_ACTION_TYPES.CHAT_STYLE_PRESET] &&
      settings[SLACK_ACTION_TYPES.CHAT_STYLE_PRESET] !== "default"
    ) {
      switch (settings[SLACK_ACTION_TYPES.CHAT_STYLE_PRESET]) {
        case "sarcasm":
          return "Be extremely sarcastic and snarky in all responses but still answer any request";
        case "rhymes":
          return "Rhyme all responses as much as possible";
        case "overly_excited":
          return "All responses should be hyper excited";
        case "liar":
          return "Attempt to obviously lie in all responses";
        case "happy":
          return "All responses should be extremely optmistic and happy";
        default:
          // This isn't ideal, it means the preset in the menu hasn't been handled here yet.
          return `When you are talking be very ${settings[
            SLACK_ACTION_TYPES.CHAT_STYLE_PRESET
          ].replace(/_/g, " ")}.`;
      }
    }
  }

  return "";
}

// Function for uploading images to S3
export async function dalleS3(
  prompt: string,
  model: string = "dall-e-3",
  appId: string,
  size: string = "1024x1024"
): Promise<any> {
  // Create a JSON object with the required properties
  const data = JSON.stringify({
    model,
    prompt,
    n: 1,
    size,
  });

  // Set the configuration for the axios request
  var config = {
    method: "post",
    url: OPENAPI_URLS.IMAGE_GENERATION,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${await getKey()}`,
    },
    data: data,
  };

  // Make the axios request to generate image
  const response = await axios(config);

  // Extract the image URL from the response
  const url = response?.data?.data[0]?.url;
  const revisedPrompt = response?.data?.data[0]?.revised_prompt;
  // Upload the image to an S3 bucket

  const uploadDetails = await imageUrlToS3(url, appId, prompt);
  return { ...uploadDetails, revised_prompt: revisedPrompt };
}
