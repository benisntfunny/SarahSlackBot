/** @format */

// Import required modules
import { Configuration, OpenAIApi } from "openai";
import axios from "axios";
import { dallUrlToS3, readItemFromDynamoDB, writeToDynamoDB } from "./aws";
import { dalleToMC } from "./sfmc";
import { ENV, OPENAI_MODELS, OPENAPI_URLS, SLACK_ACTION_TYPES } from "./static";

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

// GPT3 function to create text completion
export async function GPT3(text: string, model: string): Promise<any> {
  // Initialize the configuration with the API key
  const apiKey = await getKey();
  const configuration = new Configuration({
    apiKey,
  });
  // Create an instance of the OpenAIApi
  const openai = new OpenAIApi(configuration);

  // Send a request to createCompletion with appropriate parameters
  const response: any = await openai.createCompletion({
    model,
    prompt: text,
    temperature: 0.7,
    max_tokens: 400,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  });
  // Return the generated text from the response
  return response.data.choices[0].text.replace("\n\n", "\n");
}

export async function genericAPIRequest(url: string, body: any = {}) {
  console.log(url, body, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ENV.OPENAI_API_KEY}`,
    },
  });

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
  model: string = OPENAI_MODELS.GPT4.model
): Promise<any> {
  // Send a POST request to the chat completion API
  const response = await axios.post(
    OPENAPI_URLS.COMPLETITION,
    {
      model,
      messages,
    },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await getKey()}`,
      },
    }
  );
  // Return the content of the first message in the response
  return response.data.choices[0].message.content;
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

// Dalle function for image generation
export async function dalle(
  text: string,
  appId: string,
  size: string = ENV.DEFAULT_IMAGE_SIZE
): Promise<any> {
  // Create a JSON object with the required properties
  const data = JSON.stringify({
    prompt: text,
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
  const url = response?.data?.data[0]?.url;

  // Upload the generated image to Salesforce Marketing Cloud
  const uploadDetails = await dalleToMC(url, text);
  return uploadDetails;
}

// Function for uploading images to S3
export async function dalleS3(
  prompt: string,
  appId: string,
  size: string = "1024x1024"
): Promise<any> {
  // Create a JSON object with the required properties
  const data = JSON.stringify({
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

  // Upload the image to an S3 bucket
  const uploadDetails = await dallUrlToS3(url, appId, prompt);
  return uploadDetails;
}
